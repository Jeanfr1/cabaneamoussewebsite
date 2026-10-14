"""Web fonts, subset to the characters the French copy needs (Latin-1 plus
typographic punctuation and œ/Œ) and written as WOFF2 to public/fonts/.

- Bookman (URW Bookman Demi) and Nimbus Sans: the kit's own fonts
  (08-estudo/fonts, AGPL with font exception; licence copied alongside).
- Oswald (bold condensed, hero title, tags, buttons) and Caveat (handwriting,
  notes and "à la Cabane."): SIL OFL, from @fontsource (npm), latin subset.

Run: npm run fonts
"""
import os
import shutil

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
OUT = P('public', 'fonts')

TEXT_RANGES = [(0x20, 0x7E), (0xA0, 0xFF)]
EXTRA = '’‘“”«»–—…·•€œŒ→↗↓←'

KIT = {
    'bookman-demi': '08-estudo/fonts/Display.woff',
    'nimbus-sans': '08-estudo/fonts/Sans.woff',
}
FONTSOURCE = {
    'oswald-500': 'node_modules/@fontsource/oswald/files/oswald-latin-500-normal.woff2',
    'oswald-700': 'node_modules/@fontsource/oswald/files/oswald-latin-700-normal.woff2',
    'caveat-700': 'node_modules/@fontsource/caveat/files/caveat-latin-700-normal.woff2',
}


def unicodes():
    cps = set()
    for a, b in TEXT_RANGES:
        cps.update(range(a, b + 1))
    cps.update(ord(c) for c in EXTRA)
    return sorted(cps)


def main():
    os.makedirs(OUT, exist_ok=True)
    cps = unicodes()
    for name, src in {**KIT, **FONTSOURCE}.items():
        font = TTFont(P(src))
        opts = subset.Options()
        opts.flavor = 'woff2'
        opts.layout_features = ['kern', 'liga', 'calt', 'ccmp', 'locl', 'mark', 'mkmk']
        opts.name_IDs = ['*']
        opts.notdef_outline = True
        sub = subset.Subsetter(opts)
        sub.populate(unicodes=cps)
        sub.subset(font)
        dst = os.path.join(OUT, f'{name}.woff2')
        font.flavor = 'woff2'
        font.save(dst)
        print(f'{name}: {os.path.getsize(P(src)) // 1024} KB -> {os.path.getsize(dst) // 1024} KB')
    shutil.copy(P('08-estudo/fonts/LICENCE.txt'), os.path.join(OUT, 'LICENCE-URW.txt'))
    shutil.copy(P('node_modules/@fontsource/oswald/LICENSE'), os.path.join(OUT, 'LICENCE-OSWALD-OFL.txt'))
    shutil.copy(P('node_modules/@fontsource/caveat/LICENSE'), os.path.join(OUT, 'LICENCE-CAVEAT-OFL.txt'))


if __name__ == '__main__':
    main()
