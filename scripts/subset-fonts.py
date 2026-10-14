"""Web fonts, subset to the characters the French copy needs (Latin-1 plus
typographic punctuation and œ/Œ) and written as WOFF2 to public/fonts/.

Picked against the approved board (02-direcao/modelo-final.png), all SIL OFL,
from @fontsource (npm):
- Anton: "On se retrouve"
- Kaushan Script: "à la Cabane."
- Roboto Serif, variable, pinned to one instance (wght 900, wdth 72, opsz 40):
  the condensed slab-like section titles
- Montserrat 500/600: body lines and small print
- Oswald 500/600: navigation, labels, buttons, tagline

Run: npm run fonts
"""
import os
import shutil

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)
OUT = P('public', 'fonts')
FS = 'node_modules/@fontsource'

TEXT_RANGES = [(0x20, 0x7E), (0xA0, 0xFF)]
EXTRA = '’‘“”«»–—…·•€œŒ→↗↓←'

FONTS = {
    'anton-400': (f'{FS}/anton/files/anton-latin-400-normal.woff2', None),
    'kaushan-400': (f'{FS}/kaushan-script/files/kaushan-script-latin-400-normal.woff2', None),
    'serif-900': (f'{FS}-variable/roboto-serif/files/roboto-serif-latin-full-normal.woff2',
                  {'wght': 900, 'wdth': 72, 'opsz': 40, 'GRAD': 0}),
    'montserrat-500': (f'{FS}/montserrat/files/montserrat-latin-500-normal.woff2', None),
    'montserrat-600': (f'{FS}/montserrat/files/montserrat-latin-600-normal.woff2', None),
    'oswald-500': (f'{FS}/oswald/files/oswald-latin-500-normal.woff2', None),
    'oswald-600': (f'{FS}/oswald/files/oswald-latin-600-normal.woff2', None),
}
LICENCES = {
    'anton': f'{FS}/anton/LICENSE',
    'kaushan-script': f'{FS}/kaushan-script/LICENSE',
    'roboto-serif': f'{FS}-variable/roboto-serif/LICENSE',
    'montserrat': f'{FS}/montserrat/LICENSE',
    'oswald': f'{FS}/oswald/LICENSE',
}


def unicodes():
    cps = set()
    for a, b in TEXT_RANGES:
        cps.update(range(a, b + 1))
    cps.update(ord(c) for c in EXTRA)
    return sorted(cps)


def main():
    if os.path.isdir(OUT):
        for f in os.listdir(OUT):
            os.remove(os.path.join(OUT, f))
    os.makedirs(OUT, exist_ok=True)
    cps = unicodes()
    for name, (src, axes) in FONTS.items():
        font = TTFont(P(src))
        if axes:
            font = instantiateVariableFont(font, axes)
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
    for name, src in LICENCES.items():
        shutil.copy(P(src), os.path.join(OUT, f'LICENCE-{name.upper()}-OFL.txt'))


if __name__ == '__main__':
    main()
