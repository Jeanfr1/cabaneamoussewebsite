"""Hero toast: measure the two hand/glass layers, pose them, grade the room.

The kit's two layers (05-camadas) are independent renders, not cut-outs
registered to 03-hero/brinde.png (SIFT matches one glass's logo onto the
other), so the final pose is composed here from measurements:

- each layer is trimmed to its alpha box;
- the contact point is the outer rim corner of each glass, found by an alpha
  scan (rightmost rim pixel of the left glass, leftmost rim pixel of the right
  glass, above the fingers);
- both glasses are scaled to the same height and their contact points are
  placed on one stage point, with a small rotation so the glasses lean into
  each other.

Two stages: "wide" (desktop, 1600x1000 units, covers the hero) and "tall"
(phones, 1000x1150 units, a band at the top of the hero).

Outputs
- assets-src/hero/left.png, right.png      trimmed layers (encoded by build-images)
- assets-src/hero/room-soft.png, room-deep.png   graded room, light and deep blur
- src/styles/toast.generated.css           pose of each layer per stage
- src/data/toast.json                      the same numbers, for the QA script
- qa/toast-wide.jpg, qa/toast-tall.jpg     composites to check the pose

Run: npm run hero   (after npm run photos, which makes assets-src/photos/salle.png)
"""
import json
import math
import os

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
OUT = P('assets-src', 'hero')

LAYERS = {
    'left': '05-camadas/copo-esquerdo.png',
    'right': '05-camadas/copo-direito.png',
}

RIM_DEPTH = 150

# Column band (layer px) under each glass foot, from an alpha row scan.
GLASS_FOOT = {'left': slice(720, 880), 'right': slice(300, 460)}

# Final pose per stage: glass height as a fraction of the stage height, the
# contact point in stage units, a rotation per layer (degrees, CSS sign) and
# how far the left rim tucks behind the right glass (stage units).
STAGES = {
    'wide': {'w': 1600, 'h': 1000, 'glass': 0.56, 'contact': (800, 282), 'rot': {'left': 8.0, 'right': -21.0}, 'tuck': 8},
    'tall': {'w': 1000, 'h': 1150, 'glass': 0.64, 'contact': (500, 300), 'rot': {'left': 7.0, 'right': -19.0}, 'tuck': 6},
}

# The forearms end in a straight cut at the layer box. A mask fades that end
# (CSS linear-gradient on the img, in layer space; emulated in composite()).
MASK = {'left': (52, 0.05, 0.24), 'right': (-52, 0.05, 0.24)}  # angle deg, transparent until, opaque from


def measure(name, rgba):
    a = rgba[:, :, 3]
    ys, xs = np.where(a > 8)
    box = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
    solid = a > 128
    rows = np.where(solid.any(axis=1))[0]
    top = int(rows.min())
    # Contact = the glass edge facing the other glass, at rim level (the foam
    # head is ~150 px deep in both layers). The fingers start lower down.
    y = top + RIM_DEPTH
    cols = np.where(solid[y])[0]
    x = int(cols.max()) if name == 'left' else int(cols.min())
    # Glass base: lowest opaque row in a column band under the glass foot
    # (the glasses lean, so the band is read off the alpha scan, not the rim).
    band = GLASS_FOOT[name]
    base_rows = np.where(solid[:, band].mean(axis=1) > 0.6)[0]
    base = int(base_rows.max())
    return {'box': box, 'contact': (x, y), 'top': top, 'base': base, 'height': base - top}


def pose(stage, name, m):
    s = stage['glass'] * stage['h'] / m['height']
    bx0, by0, bx1, by1 = m['box']
    w, h = (bx1 - bx0) * s, (by1 - by0) * s
    px, py = m['contact'][0] - bx0, m['contact'][1] - by0
    cx, cy = stage['contact']
    if name == 'left':
        cx -= stage['tuck'] / 2
    else:
        cx += stage['tuck'] / 2
    left, top = cx - px * s, cy - py * s
    return {
        'scale': s,
        'left': left, 'top': top, 'width': w, 'height': h,
        'origin': (px / (bx1 - bx0), py / (by1 - by0)),
        'rot': stage['rot'][name],
    }


def apply_mask(img, angle, t0, t1):
    h, w = img.shape[:2]
    a = math.radians(angle)
    dx, dy = math.sin(a), -math.cos(a)
    L = abs(w * math.sin(a)) + abs(h * math.cos(a))
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    t = ((xx - w / 2) * dx + (yy - h / 2) * dy) / L + 0.5
    m = np.clip((t - t0) / (t1 - t0), 0, 1)
    out = img.copy()
    out[:, :, 3] = (out[:, :, 3].astype(np.float32) * m).astype(np.uint8)
    return out


def composite(stage, poses, trimmed, room, out_w):
    W, H = stage['w'], stage['h']
    k = out_w / W
    out_h = round(H * k)
    # room as object-fit: cover
    rh, rw = room.shape[:2]
    sc = max(out_w / rw, out_h / rh)
    rr = cv2.resize(room, (round(rw * sc), round(rh * sc)), interpolation=cv2.INTER_AREA)
    y0, x0 = (rr.shape[0] - out_h) // 2, (rr.shape[1] - out_w) // 2
    canvas = rr[y0:y0 + out_h, x0:x0 + out_w].astype(np.float32)
    for name in ('left', 'right'):
        p = poses[name]
        img = trimmed[name]
        ih, iw = img.shape[:2]
        s = p['scale'] * k
        ox, oy = p['origin'][0] * iw, p['origin'][1] * ih
        th = math.radians(p['rot'])
        c, si = math.cos(th), math.sin(th)
        # point -> (pivot in page) + R * s * (point - origin)
        piv = np.array([p['left'] * k + ox * s, p['top'] * k + oy * s])
        M = np.array([[c * s, -si * s, 0], [si * s, c * s, 0]], np.float32)
        M[:, 2] = piv - M[:, :2] @ np.array([ox, oy])
        img = apply_mask(img, *MASK[name])
        warped = cv2.warpAffine(img, M, (out_w, out_h), flags=cv2.INTER_AREA, borderValue=(0, 0, 0, 0))
        al = warped[:, :, 3:4].astype(np.float32) / 255
        canvas = canvas * (1 - al) + warped[:, :, :3].astype(np.float32) * al
    cx, cy = stage['contact']
    cv2.circle(canvas, (round(cx * k), round(cy * k)), 4, (60, 220, 255), -1)
    return canvas.clip(0, 255).astype(np.uint8)


def grade_room(src):
    """Warm, dark, defocused version of the real room (two blur depths)."""
    bgr = cv2.imread(src, cv2.IMREAD_COLOR).astype(np.float32) / 255
    h, w = bgr.shape[:2]
    out = {}
    for key, sigma in (('soft', 3.0), ('deep', 11.0)):
        b = cv2.GaussianBlur(bgr, (0, 0), sigma * w / 1040)
        # tone: darken, crush the bright concrete floor, warm the whites
        lum = cv2.cvtColor(b, cv2.COLOR_BGR2GRAY)[..., None]
        b = b * 0.74
        b = np.power(b, 1.35)
        warm = np.array([0.62, 0.86, 1.10], np.float32)  # B, G, R
        b = b * warm
        # lift the lamps: bright warm pixels get a glow
        glow = cv2.GaussianBlur(np.clip(lum - 0.62, 0, 1), (0, 0), 18 * w / 1040)[..., None]
        b = b + glow * np.array([0.25, 0.55, 1.0], np.float32) * 1.4
        # vignette, heavier at the bottom where the title sits
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        nx, ny = (xx / w - 0.5) * 2, (yy / h - 0.42) * 2
        vig = np.clip(1 - 0.32 * nx ** 2 - 0.38 * np.clip(ny, 0, None) ** 2 - 0.12 * np.clip(-ny, 0, None) ** 2, 0, 1)
        b = b * vig[..., None]
        out[key] = (b.clip(0, 1) * 255).round().astype(np.uint8)
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(P('qa'), exist_ok=True)
    measures, trimmed = {}, {}
    for name, src in LAYERS.items():
        rgba = cv2.imread(P(src), cv2.IMREAD_UNCHANGED)
        m = measure(name, rgba)
        measures[name] = m
        x0, y0, x1, y1 = m['box']
        trimmed[name] = rgba[y0:y1, x0:x1]
        cv2.imwrite(os.path.join(OUT, f'{name}.png'), trimmed[name])
        print(name, m)

    room = grade_room(P('assets-src', 'photos', 'salle.png'))
    for key, img in room.items():
        cv2.imwrite(os.path.join(OUT, f'room-{key}.png'), img)

    data = {'layers': {}, 'stages': {}}
    css = ['/* generated by scripts/compose-hero.py: do not edit by hand */']
    for sname, stage in STAGES.items():
        poses = {n: pose(stage, n, measures[n]) for n in LAYERS}
        data['stages'][sname] = {'w': stage['w'], 'h': stage['h'], 'contact': stage['contact'], 'poses': poses}
        W, H = stage['w'], stage['h']
        sel = '.stage' if sname == 'wide' else '.stage'
        rules = []
        for n, p in poses.items():
            rules.append(
                f'  --{n}-x: {p["left"] / W * 100:.3f}%; --{n}-y: {p["top"] / H * 100:.3f}%; '
                f'--{n}-w: {p["width"] / W * 100:.3f}%; --{n}-ox: {p["origin"][0] * 100:.2f}%; '
                f'--{n}-oy: {p["origin"][1] * 100:.2f}%; --{n}-r: {p["rot"]}deg;'
            )
        rules.append(f'  --contact-x: {stage["contact"][0] / W * 100:.3f}%; --contact-y: {stage["contact"][1] / H * 100:.3f}%;')
        rules.append(f'  --stage-ratio: {W} / {H};')
        for n, (ang, t0, t1) in MASK.items():
            rules.append(f'  --{n}-mask: linear-gradient({ang}deg, transparent {t0 * 100:.0f}%, #000 {t1 * 100:.0f}%);')
        body = '\n'.join(rules)
        if sname == 'wide':
            css.append(f'{sel} {{\n{body}\n}}')
        else:
            css.append(f'@media (max-width: 760px) {{\n  {sel} {{\n{body}\n  }}\n}}')
        for out_w in ((1440,) if sname == 'wide' else (780,)):
            cv2.imwrite(P('qa', f'toast-{sname}.jpg'), composite(stage, poses, trimmed, room['deep'], out_w),
                        [cv2.IMWRITE_JPEG_QUALITY, 88])
    for n, m in measures.items():
        data['layers'][n] = {k: v for k, v in m.items()}
    with open(P('src', 'data', 'toast.json'), 'w') as f:
        json.dump(data, f, indent=2)
    with open(P('src', 'styles', 'toast.generated.css'), 'w') as f:
        f.write('\n'.join(css) + '\n')
    print('wrote src/styles/toast.generated.css, src/data/toast.json, qa/toast-*.jpg')


if __name__ == '__main__':
    main()
