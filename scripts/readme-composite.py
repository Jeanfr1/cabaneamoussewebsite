"""README assets from the raw captures of scripts/readme-assets.mjs.

- .github/assets/banner.png            (copied)
- .github/assets/hero-toast.gif        the 2.8 s toast, 15 fps, final pose held
- .github/assets/desktop-sections.jpg  four browser-framed desktop shots
- .github/assets/mobile-screens.jpg    four phone-framed 390 px shots

Run: ~/anaconda3/bin/python3 scripts/readme-composite.py
"""
import glob
import os
import shutil
import subprocess

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
RAW = P('qa', 'readme')
OUT = P('.github', 'assets')
BG = (25, 25, 24)
URL = 'cabane-a-mousse-herbignac.vercel.app'


def font(size):
    for f in ('/System/Library/Fonts/SFNS.ttf', '/System/Library/Fonts/Helvetica.ttc'):
        if os.path.exists(f):
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()


def browser_frame(img, width):
    img = img.convert('RGB')
    img = img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
    bar = 34
    frame = Image.new('RGB', (width, img.height + bar), (44, 43, 40))
    d = ImageDraw.Draw(frame)
    for i, c in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
        d.ellipse((14 + i * 20, 11, 26 + i * 20, 23), fill=c)
    d.rounded_rectangle((width * 0.28, 7, width * 0.72, 27), 10, fill=(30, 29, 27))
    d.text((width / 2, 17), URL, fill=(205, 196, 182), font=font(13), anchor='mm')
    frame.paste(img, (0, bar))
    mask = Image.new('L', frame.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, *frame.size), 12, fill=255)
    out = Image.new('RGB', frame.size, BG)
    out.paste(frame, (0, 0), mask)
    return out


def phone_frame(img, width):
    img = img.convert('RGB')
    img = img.resize((width, round(img.height * width / img.width)), Image.LANCZOS)
    pad = 12
    W, H = width + pad * 2, img.height + pad * 2
    frame = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(frame)
    d.rounded_rectangle((0, 0, W - 1, H - 1), 46, fill=(12, 12, 11), outline=(70, 66, 60), width=2)
    m = Image.new('L', img.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, *img.size), 36, fill=255)
    frame.paste(img, (pad, pad), m)
    return frame


def main():
    os.makedirs(OUT, exist_ok=True)
    shutil.copy(os.path.join(RAW, 'banner.png'), os.path.join(OUT, 'banner.png'))

    # desktop: 2 x 2 browser frames
    shots = [Image.open(os.path.join(RAW, f'desktop-{k}.png')) for k in ('bar', 'cave', 'location', 'visite')]
    framed = [browser_frame(s, 900) for s in shots]
    gap = 28
    W = framed[0].width * 2 + gap * 3
    H = framed[0].height * 2 + gap * 3
    sheet = Image.new('RGB', (W, H), BG)
    for i, f in enumerate(framed):
        sheet.paste(f, (gap + (i % 2) * (f.width + gap), gap + (i // 2) * (f.height + gap)))
    sheet.save(os.path.join(OUT, 'desktop-sections.jpg'), quality=84, optimize=True, progressive=True)

    # phone: four frames in a row
    phones = [phone_frame(Image.open(os.path.join(RAW, f'phone-{k}.png')), 390) for k in ('hero', 'bar', 'location', 'visite')]
    gap = 36
    W = sum(p.width for p in phones) + gap * 5
    H = phones[0].height + gap * 2
    sheet = Image.new('RGB', (W, H), BG)
    x = gap
    for p in phones:
        sheet.paste(p, (x, gap))
        x += p.width + gap
    sheet.save(os.path.join(OUT, 'mobile-screens.jpg'), quality=84, optimize=True, progressive=True)

    # GIF: concat list with explicit durations (first frame short hold, final pose held)
    frames = sorted(glob.glob(os.path.join(RAW, 'toast', 'f_*.png')))
    lst = os.path.join(RAW, 'toast.txt')
    with open(lst, 'w') as f:
        for i, fr in enumerate(frames):
            dur = 0.35 if i == 0 else (2.2 if i == len(frames) - 1 else 1 / 15)
            f.write(f"file '{fr}'\nduration {dur:.4f}\n")
        f.write(f"file '{frames[-1]}'\n")
    gif = os.path.join(OUT, 'hero-toast.gif')
    subprocess.run([
        'ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lst,
        '-vf', 'scale=880:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=160:stats_mode=diff[p];'
               '[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle',
        '-loop', '0', gif,
    ], check=True)
    for name in os.listdir(OUT):
        print(name, os.path.getsize(os.path.join(OUT, name)) // 1024, 'KB')


if __name__ == '__main__':
    main()
