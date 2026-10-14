"""Prepare the four photos of the real venue for the web.

1. Crop each kit PNG to the display rect recorded in
   07-integracao/provenance-originals.json. The originals are screenshots of
   a map viewer, so the rect is what removes the viewer's captions, arrows
   and close button. Kit files stay untouched.
2. Upscale the crop x2 with Real-ESRGAN (x4plus, then downsampled with
   INTER_AREA) so the full-bleed section backgrounds hold up on retina
   screens.

Results land in assets-src/photos/ (gitignored) and feed
scripts/build-images.mjs.

Weights are not in the repo: download RealESRGAN_x4plus.pth from
https://github.com/xinntao/Real-ESRGAN/releases/tag/v0.1.0 to
~/.cache/realesrgan/.

Run: npm run photos   (or ~/anaconda3/bin/python3 scripts/prepare-photos.py salle)
"""
import json
import os
import sys
import time

import cv2
import torch

from esrgan import load_model, sr4

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
OUT = P('assets-src', 'photos')

JOBS = {
    'salle': '04-photos-originales/salle-originale.png',
    'cave': '04-photos-originales/cave-originale.png',
    'comptoir': '04-photos-originales/comptoir-original.png',
    'facade': '04-photos-originales/facade-terrasse-originale.png',
}


def rects():
    with open(P('07-integracao', 'provenance-originals.json')) as f:
        return {item['file']: item['display_rect'] for item in json.load(f)}


def main(keys):
    os.makedirs(OUT, exist_ok=True)
    torch.set_num_threads(os.cpu_count() or 4)
    rect_of = rects()
    net = load_model()
    for key in keys:
        src = JOBS[key]
        r = rect_of[src]
        bgr = cv2.imread(P(src), cv2.IMREAD_COLOR)
        crop = bgr[r['y']:r['y'] + r['height'], r['x']:r['x'] + r['width']]
        cv2.imwrite(os.path.join(OUT, f'{key}-crop.png'), crop)
        t0 = time.time()
        big = sr4(net, crop)
        h, w = crop.shape[:2]
        up = cv2.resize(big, (w * 2, h * 2), interpolation=cv2.INTER_AREA)
        cv2.imwrite(os.path.join(OUT, f'{key}.png'), up)
        print(f'{key}: crop {w}x{h} -> {w * 2}x{h * 2} in {time.time() - t0:.0f}s', flush=True)


if __name__ == '__main__':
    main(sys.argv[1:] or list(JOBS))
