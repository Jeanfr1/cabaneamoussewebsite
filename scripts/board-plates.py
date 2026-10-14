"""Desktop = the approved board (02-direcao/modelo-final.png), rebuilt.

The board is 1024 px wide; every desktop position on the page is in board px
(1 board px = --uh / --u css px). This script makes the image plates and the
numbers the page needs.

Sections (board strips s1 625-948, s2 948-1195, s3 1195-1477, strip 1477-1536):
the board's own pixels with the live text (labels, titles, body lines, buttons)
removed, so the same words sit on top as real HTML. Decorations stay (hops,
notes, scraps, sketches, torn edges). Real-ESRGAN x4, then down to x2.

Hero (board y 0-625): the board's own hero pixels. Its baked text (title,
tagline, button, logo, nav) is replaced by 03-hero/brinde.png, the same toast
photographed for the kit, registered glass by glass (the board is a separate
render, so the left and right glasses each get their own similarity transform)
and colour-matched around each box; the live text covers those boxes again.
Real-ESRGAN x2. The 120 board px margins on each side (wide windows) are
brinde.png registered on the background.

Toast layers (05-camadas): each hand/glass layer is registered to its own
glass in the board hero (the search is restricted to that half, so the two
identical logos cannot swap). The "blur" plate is the hero with glasses, hands
and splash filled by a wide normalized blur and defocused: the layers travel
over it and hand over to the photo at the clink.

Outputs: assets-src/board/*.png, src/styles/scene.generated.css,
src/data/board.json, qa/board-*.jpg (masks and composites to check).

Run: npm run board   (KEEP_STRIPS=1 skips re-upscaling the section strips)
"""
import json
import math
import os

import cv2
import numpy as np

from esrgan import load_model, x2

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
OUT = P('assets-src', 'board')
BOARD = '02-direcao/modelo-final.png'
HERO = '03-hero/brinde.png'
LAYERS = {'left': '05-camadas/copo-esquerdo.png', 'right': '05-camadas/copo-direito.png'}

MARGIN = 120     # board px added each side of the hero plates
HERO_H = 625
STRIPS = {'s1': (625, 948), 's2': (948, 1195), 's3': (1195, 1477), 'strip': (1477, 1536)}

# text to remove from the section strips, in board px:
#   'tag'    an orange label or button: its orange shape (holes filled) is
#            inpainted; the live element with the same outline covers it
#   'glyphs' light or orange letters on dark paper, one rect per line: found by
#            a white top-hat (k ≈ twice the stroke width), filled with dark paper
CLEAN = {
    's1': [('tag', (48, 676, 208, 720)),
           ('glyphs', (56, 714, 266, 766), 15), ('glyphs', (56, 758, 224, 804), 15), ('glyphs', (56, 796, 370, 856), 15),
           ('glyphs', (64, 862, 284, 914), 7)],
    's2': [('tag', (50, 971, 266, 1021)),
           ('glyphs', (56, 1004, 254, 1068), 15), ('glyphs', (56, 1048, 342, 1114), 15),
           ('glyphs', (64, 1123, 278, 1179), 7)],
    's3': [('tag', (50, 1212, 216, 1280)),
           ('glyphs', (56, 1276, 230, 1338), 15), ('glyphs', (56, 1294, 418, 1374), 15),
           ('glyphs', (64, 1383, 322, 1441), 7),
           ('tag', (714, 1401, 996, 1460))],
    'strip': [],
}

# baked text in the board hero (board px) and which brinde transform fills it
HERO_TEXT = [
    ((228, 346, 812, 466), 'glasses'),   # On se retrouve
    ((282, 430, 782, 524), 'glasses'),   # à la Cabane.
    ((294, 502, 728, 540), 'glasses'),   # swoosh
    ((322, 536, 708, 564), 'glasses'),   # tagline
    ((366, 562, 660, 619), 'glasses'),   # button
    ((76, 6, 236, 170), 'background'),   # logo
    ((312, 14, 660, 44), 'background'),  # nav
    ((760, 8, 986, 50), 'background'),   # header button
]
# glass regions: (brinde x0, y0, x1, y1), (board x0, y0, x1, y1)
GLASS_ZONES = {'left': ((380, 90, 760, 520), (268, 80, 540, 352)),
               'right': ((720, 120, 1090, 570), (520, 90, 805, 352))}
# hands and forearms in board px (they leave the blur plate with the glasses)
ARMS = {'left': [(-130, 250), (200, 205), (340, 230), (350, 420), (200, 470), (-130, 520)],
        'right': [(690, 270), (830, 300), (1154, 390), (1154, 640), (900, 560), (690, 460)]}
CONTACT = (533, 160)   # where the rims meet, board px (start of the splash)


def sift_similarity(src_img, src_mask, dst_img, dst_mask, ratio=0.72, thresh=4.0):
    sift = cv2.SIFT_create(15000)
    g = lambda im: cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    k1, d1 = sift.detectAndCompute(g(src_img), src_mask)
    k2, d2 = sift.detectAndCompute(g(dst_img), dst_mask)
    ms = cv2.BFMatcher().knnMatch(d1, d2, k=2)
    good = [a for a, b in ms if a.distance < ratio * b.distance]
    src = np.float32([k1[m.queryIdx].pt for m in good])
    dst = np.float32([k2[m.trainIdx].pt for m in good])
    M, inl = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=thresh, maxIters=30000, confidence=0.999)
    return M, int(inl.sum()), len(good)


def decompose(M):
    return math.hypot(M[0, 0], M[1, 0]), math.degrees(math.atan2(M[1, 0], M[0, 0]))


def box_mask(shape, box, pad=0):
    m = np.zeros(shape[:2], np.uint8)
    x0, y0, x1, y1 = box
    m[max(y0 - pad, 0):y1 + pad, max(x0 - pad, 0):x1 + pad] = 255
    return m


def clean_strip(board, name, debug):
    y0, y1 = STRIPS[name]
    crop = board[y0:y1].copy()
    out = crop.copy()
    shown = np.zeros(crop.shape[:2], np.uint8)
    for item in CLEAN[name]:
        kind, (x0, ya, x1, yb) = item[0], item[1]
        ya, yb = max(ya, y0) - y0, min(yb, y1) - y0
        roi = out[ya:yb, x0:x1]
        c = roi.astype(np.int32)
        b, g, r = c[..., 0], c[..., 1], c[..., 2]
        orange = (r > 170) & (r - b > 90) & (g < 190)
        if kind == 'tag':
            m = orange.astype(np.uint8) * 255
            m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
            cnts, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            m = np.zeros_like(m)
            cv2.drawContours(m, [c_ for c_ in cnts if cv2.contourArea(c_) > 300], -1, 255, -1)
            m = cv2.dilate(m, np.ones((3, 3), np.uint8), iterations=2)
            full = np.zeros(crop.shape[:2], np.uint8)
            full[ya:yb, x0:x1] = m
            out = cv2.inpaint(out, full, 5, cv2.INPAINT_TELEA)
            shown |= full
        else:
            # letters = thin bright strokes on dark paper: white top-hat on
            # luminance (a large cream scrap is wider than the kernel, so it stays)
            k = item[2]
            lum = cv2.cvtColor(out, cv2.COLOR_BGR2GRAY)
            th = cv2.morphologyEx(lum, cv2.MORPH_TOPHAT, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k * 2 + 1, k * 2 + 1)))
            m = np.zeros(crop.shape[:2], np.uint8)
            m[ya:yb, x0:x1] = (th[ya:yb, x0:x1] > 34).astype(np.uint8) * 255
            m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
            m = cv2.dilate(m, np.ones((3, 3), np.uint8), iterations=2)
            # fill = dark paper only: normalized blur that ignores the letters and
            # anything bright (cream scraps, lamps), so no colour bleeds in
            valid = ((m == 0) & (lum < 90)).astype(np.float32)
            f = out.astype(np.float32)
            num = cv2.GaussianBlur(f * valid[..., None], (0, 0), 7)
            den = cv2.GaussianBlur(valid, (0, 0), 7)[..., None]
            bg = num / np.maximum(den, 1e-3)
            rng = np.random.default_rng(x0 * 7 + ya)
            noise = cv2.GaussianBlur(rng.normal(0, 7, crop.shape[:2]).astype(np.float32), (0, 0), 0.7)[..., None]
            soft = cv2.GaussianBlur(m, (0, 0), 1.2).astype(np.float32)[..., None] / 255
            f = f * (1 - soft) + (bg + noise) * soft
            out = np.clip(f, 0, 255).astype(np.uint8)
            shown |= m
    over = crop.copy()
    over[shown > 0] = (0.4 * over[shown > 0] + 0.6 * np.array([255, 0, 255])).astype(np.uint8)
    debug.append(np.vstack([over, out]))
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(P('qa'), exist_ok=True)
    board = cv2.imread(P(BOARD), cv2.IMREAD_COLOR)
    hero = cv2.imread(P(HERO), cv2.IMREAD_COLOR)
    bh = board[:HERO_H].copy()
    H, W = hero.shape[:2]

    # ---- brinde -> board: background (margins, header area) and per glass ----
    bmask = np.full(bh.shape[:2], 255, np.uint8)
    for box, _ in HERO_TEXT:
        bmask[box_mask(bh.shape, box, 6) > 0] = 0
    bmask[560:] = 0
    M_bg, inl, good = sift_similarity(hero, None, bh, bmask, ratio=0.7, thresh=3.0)
    print('brinde->board background: scale %.4f rot %.2f' % decompose(M_bg), f'inliers {inl}/{good}')
    M_glass = {}
    for name, (hz, bz) in GLASS_ZONES.items():
        hm = box_mask(hero.shape, hz)
        bm = box_mask(bh.shape, bz)
        bm[bmask == 0] = 0
        M_glass[name], inl, good = sift_similarity(hero, hm, bh, bm, ratio=0.78, thresh=3.0)
        print(f'brinde->board {name} glass: scale %.4f rot %.2f' % decompose(M_glass[name]), f'inliers {inl}/{good}')

    # ---- hero: board pixels, baked text replaced by colour-matched brinde ----
    warp = lambda M: cv2.warpAffine(hero, M, (1024, HERO_H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT).astype(np.float32)
    wl, wr, wb = warp(M_glass['left']), warp(M_glass['right']), warp(M_bg)
    xs = np.arange(1024, dtype=np.float32)
    t = np.clip((xs - 500) / 70, 0, 1)[None, :, None]   # left glass transform → right glass transform
    fill_glass = wl * (1 - t) + wr * t
    out = bh.astype(np.float32)
    dbg = bh.copy()
    for box, kind in HERO_TEXT:
        src = fill_glass if kind == 'glasses' else wb
        inner = box_mask(bh.shape, box)
        ring = (box_mask(bh.shape, box, 14) > 0) & (inner == 0)
        fixed = src.copy()
        for c in range(3):
            ms, ss = src[..., c][ring].mean(), src[..., c][ring].std() + 1e-3
            mb, sb = out[..., c][ring].mean(), out[..., c][ring].std() + 1e-3
            fixed[..., c] = (src[..., c] - ms) * (sb / ss) * 0.85 + mb + (src[..., c] - ms) * 0.15
        soft = cv2.GaussianBlur(inner, (0, 0), 4).astype(np.float32)[..., None] / 255
        out = out * (1 - soft) + fixed * soft
        cv2.rectangle(dbg, box[:2], box[2:], (255, 0, 255), 1)
    hero_clean = np.clip(out, 0, 255).astype(np.uint8)
    cv2.imwrite(P('qa', 'board-hero-clean.jpg'), np.hstack([dbg, hero_clean]), [cv2.IMWRITE_JPEG_QUALITY, 88])

    # ---- layers -> board ----
    layers = {}
    gl_union = np.zeros(bh.shape[:2], np.uint8)
    for name, src in LAYERS.items():
        rgba = cv2.imread(P(src), cv2.IMREAD_UNCHANGED)
        a = rgba[:, :, 3]
        ys, xs_ = np.where(a > 8)
        box = (int(xs_.min()), int(ys.min()), int(xs_.max()) + 1, int(ys.max()) + 1)
        lmask = cv2.erode((a > 200).astype(np.uint8) * 255, np.ones((9, 9), np.uint8))
        bm = box_mask(bh.shape, GLASS_ZONES[name][1])
        bm[bmask == 0] = 0
        # the board is ~2.5x smaller than the layer: match on a downscaled layer
        k = 0.45
        small = cv2.resize(rgba[:, :, :3], None, fx=k, fy=k, interpolation=cv2.INTER_AREA)
        smask = cv2.resize(lmask, None, fx=k, fy=k, interpolation=cv2.INTER_NEAREST)
        M, inl, good = sift_similarity(small, smask, bh, bm, ratio=0.8, thresh=3.0)
        M = M.astype(np.float64)
        M[:, :2] *= k                      # back to full-resolution layer px
        s, r = decompose(M)
        ox, oy = M @ np.array([box[0], box[1], 1.0])
        layers[name] = {'x': float(ox), 'y': float(oy), 'w': (box[2] - box[0]) * s, 'rot': r}
        print(f'{name} layer -> board: scale {s:.4f} rot {r:.2f} origin ({ox:.1f}, {oy:.1f}) inliers {inl}/{good}')
        gl_union = np.maximum(gl_union, cv2.warpAffine(a, M, (1024, HERO_H)))
        cv2.imwrite(os.path.join(OUT, f'{name}.png'), rgba[box[1]:box[3], box[0]:box[2]])

    # check: layers over the cleaned hero, next to the board
    chk = hero_clean.astype(np.float32)
    for name in LAYERS:
        rgba = cv2.imread(os.path.join(OUT, f'{name}.png'), cv2.IMREAD_UNCHANGED)
        l = layers[name]
        sc, a = l['w'] / rgba.shape[1], math.radians(l['rot'])
        Mx = np.float32([[sc * math.cos(a), -sc * math.sin(a), l['x']], [sc * math.sin(a), sc * math.cos(a), l['y']]])
        wl_ = cv2.warpAffine(rgba, Mx, (1024, HERO_H))
        al = wl_[:, :, 3:4] / 255.0 * 0.6
        chk = chk * (1 - al) + wl_[:, :, :3] * al
    cv2.circle(chk, CONTACT, 5, (60, 220, 255), -1)
    cv2.imwrite(P('qa', 'board-hero.jpg'), np.hstack([chk.astype(np.uint8), bh]), [cv2.IMWRITE_JPEG_QUALITY, 85])

    # ---- section strips, cleaned ----
    debug = []
    cleaned = {name: clean_strip(board, name, debug) for name in STRIPS}
    cv2.imwrite(P('qa', 'board-clean.jpg'), np.vstack(debug), [cv2.IMWRITE_JPEG_QUALITY, 85])
    if os.environ.get('CLEAN_ONLY'):
        return

    # ---- Real-ESRGAN x2 ----
    net = load_model()
    cache = os.path.join(OUT, 'brinde-x2.png')
    hero2 = cv2.imread(cache) if os.path.exists(cache) else None
    if hero2 is None:
        hero2 = x2(net, hero)
        cv2.imwrite(cache, hero2)
    board_hero2 = x2(net, hero_clean)
    for name, img in cleaned.items():
        dst = os.path.join(OUT, f'{name}.png')
        if os.environ.get('KEEP_STRIPS') and os.path.exists(dst):
            continue
        cv2.imwrite(dst, x2(net, img))
        print(name, img.shape[1] * 2, 'x', img.shape[0] * 2)

    # ---- still plate, 2x, with margins: brinde on the background transform,
    # the board hero in the middle (feathered over 24 board px at its edges) ----
    k = 2
    A = M_bg.astype(np.float64).copy()
    A[:, 2] = (A[:, 2] + [MARGIN, 0]) * k
    plate = cv2.warpAffine(hero2, A, ((1024 + 2 * MARGIN) * k, HERO_H * k), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT).astype(np.float32)
    ramp = np.clip(np.minimum(np.arange(1024 * k), np.arange(1024 * k)[::-1]) / (24 * k), 0, 1)[None, :, None]
    mid = plate[:, MARGIN * k:(MARGIN + 1024) * k]
    plate[:, MARGIN * k:(MARGIN + 1024) * k] = mid * (1 - ramp) + board_hero2.astype(np.float32) * ramp
    still = np.clip(plate, 0, 255).astype(np.uint8)
    cv2.imwrite(os.path.join(OUT, 'hero-still.png'), still)

    # ---- blur plate: glasses, hands and splash filled, then defocused ----
    pw, ph = 1024 + 2 * MARGIN, HERO_H
    small = cv2.resize(still, (pw, ph), interpolation=cv2.INTER_AREA).astype(np.float32)
    mask = np.zeros((ph, pw), np.uint8)
    mask[:, MARGIN:MARGIN + 1024] = gl_union > 20
    mask *= 255
    for poly in ARMS.values():
        cv2.fillPoly(mask, [np.array([(x + MARGIN, y) for x, y in poly], np.int32)], 255)
    cv2.rectangle(mask, (MARGIN + 300, 40), (MARGIN + 760, 200), 255, -1)   # splash and drops
    mask = cv2.dilate(mask, np.ones((15, 15), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats((mask == 0).astype(np.uint8), 8)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] < 15000:
            mask[lab == i] = 255
    valid = (mask == 0).astype(np.float32)
    num = cv2.GaussianBlur(small * valid[..., None], (0, 0), 55)
    den = cv2.GaussianBlur(valid, (0, 0), 55)[..., None]
    far = num / np.maximum(den, 1e-4)
    soft = cv2.GaussianBlur(mask, (0, 0), 20).astype(np.float32)[..., None] / 255
    blur = cv2.GaussianBlur(small, (0, 0), 6) * (1 - soft) + far * soft
    blur = np.clip(cv2.GaussianBlur(blur, (0, 0), 3) * 0.92, 0, 255).astype(np.uint8)
    cv2.imwrite(os.path.join(OUT, 'hero-blur.png'), blur)
    dm = small.astype(np.uint8).copy()
    dm[mask > 0] = (0.5 * dm[mask > 0] + 0.5 * np.array([255, 0, 255])).astype(np.uint8)
    cv2.imwrite(P('qa', 'board-blurmask.jpg'), np.vstack([dm, blur]), [cv2.IMWRITE_JPEG_QUALITY, 85])

    # ---- numbers for the page ----
    data = {'board': {'w': 1024, 'h': 1536, 'heroH': HERO_H, 'margin': MARGIN, 'strips': STRIPS},
            'contact': CONTACT, 'layers': layers}
    with open(P('src', 'data', 'board.json'), 'w') as f:
        json.dump(data, f, indent=2)
    css = ['/* generated by scripts/board-plates.py: do not edit by hand (board px) */', ':root {',
           f'  --contact-x: {CONTACT[0]}; --contact-y: {CONTACT[1]};']
    for name, l in layers.items():
        css.append(f'  --{name}-x: {l["x"]:.2f}; --{name}-y: {l["y"]:.2f}; --{name}-w: {l["w"]:.2f}; --{name}-r: {l["rot"]:.3f}deg;')
    css.append('}')
    with open(P('src', 'styles', 'scene.generated.css'), 'w') as f:
        f.write('\n'.join(css) + '\n')
    print('wrote assets-src/board, src/data/board.json, src/styles/scene.generated.css, qa/board-*.jpg')


if __name__ == '__main__':
    main()
