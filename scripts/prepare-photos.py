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
import numpy as np
import torch
from torch import nn
from torch.nn import functional as F

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
OUT = P('assets-src', 'photos')
WEIGHTS = os.path.expanduser('~/.cache/realesrgan/RealESRGAN_x4plus.pth')
DEVICE = 'mps' if torch.backends.mps.is_available() else 'cpu'

JOBS = {
    'salle': '04-photos-originales/salle-originale.png',
    'cave': '04-photos-originales/cave-originale.png',
    'comptoir': '04-photos-originales/comptoir-original.png',
    'facade': '04-photos-originales/facade-terrasse-originale.png',
}


class RDB(nn.Module):
    def __init__(self, nf=64, gc=32):
        super().__init__()
        self.conv1 = nn.Conv2d(nf, gc, 3, 1, 1)
        self.conv2 = nn.Conv2d(nf + gc, gc, 3, 1, 1)
        self.conv3 = nn.Conv2d(nf + 2 * gc, gc, 3, 1, 1)
        self.conv4 = nn.Conv2d(nf + 3 * gc, gc, 3, 1, 1)
        self.conv5 = nn.Conv2d(nf + 4 * gc, nf, 3, 1, 1)
        self.lrelu = nn.LeakyReLU(0.2, True)

    def forward(self, x):
        x1 = self.lrelu(self.conv1(x))
        x2 = self.lrelu(self.conv2(torch.cat((x, x1), 1)))
        x3 = self.lrelu(self.conv3(torch.cat((x, x1, x2), 1)))
        x4 = self.lrelu(self.conv4(torch.cat((x, x1, x2, x3), 1)))
        x5 = self.conv5(torch.cat((x, x1, x2, x3, x4), 1))
        return x5 * 0.2 + x


class RRDB(nn.Module):
    def __init__(self, nf=64, gc=32):
        super().__init__()
        self.rdb1, self.rdb2, self.rdb3 = RDB(nf, gc), RDB(nf, gc), RDB(nf, gc)

    def forward(self, x):
        return self.rdb3(self.rdb2(self.rdb1(x))) * 0.2 + x


class RRDBNet(nn.Module):
    def __init__(self, nf=64, nb=23, gc=32):
        super().__init__()
        self.conv_first = nn.Conv2d(3, nf, 3, 1, 1)
        self.body = nn.Sequential(*[RRDB(nf, gc) for _ in range(nb)])
        self.conv_body = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_up1 = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_up2 = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_hr = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_last = nn.Conv2d(nf, 3, 3, 1, 1)
        self.lrelu = nn.LeakyReLU(0.2, True)

    def forward(self, x):
        feat = self.conv_first(x)
        feat = feat + self.conv_body(self.body(feat))
        feat = self.lrelu(self.conv_up1(F.interpolate(feat, scale_factor=2, mode='nearest')))
        feat = self.lrelu(self.conv_up2(F.interpolate(feat, scale_factor=2, mode='nearest')))
        return self.conv_last(self.lrelu(self.conv_hr(feat)))


def load_model():
    net = RRDBNet()
    state = torch.load(WEIGHTS, map_location='cpu', weights_only=True)
    net.load_state_dict(state.get('params_ema', state.get('params', state)), strict=True)
    return net.eval().to(DEVICE)


@torch.no_grad()
def sr4(net, bgr, tile=192, pad=12):
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB).astype(np.float32) / 255
    h, w = rgb.shape[:2]
    out = np.zeros((h * 4, w * 4, 3), np.float32)
    t = torch.from_numpy(rgb).permute(2, 0, 1)[None].to(DEVICE)
    for y in range(0, h, tile):
        for x in range(0, w, tile):
            y0, x0 = max(y - pad, 0), max(x - pad, 0)
            y1, x1 = min(y + tile + pad, h), min(x + tile + pad, w)
            res = net(t[:, :, y0:y1, x0:x1]).clamp(0, 1)[0].permute(1, 2, 0).cpu().numpy()
            ty, tx = (y - y0) * 4, (x - x0) * 4
            th, tw = min(tile, h - y) * 4, min(tile, w - x) * 4
            out[y * 4:y * 4 + th, x * 4:x * 4 + tw] = res[ty:ty + th, tx:tx + tw]
    return cv2.cvtColor((out * 255).round().astype(np.uint8), cv2.COLOR_RGB2BGR)


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
