<div align="center">

<img src=".github/assets/banner.png" alt="La Cabane à Mousse: On se retrouve à la Cabane." width="100%" />

<h3>A one-page website for a beer cellar, bar and tap-hire business in Herbignac, opened by a toast between two glasses.</h3>

<p>
  <a href="https://cabane-a-mousse-herbignac.vercel.app"><strong>🌐 Live site</strong></a>
  &nbsp;·&nbsp;
  <a href="#hero-animation"><strong>🎬 How the hero works</strong></a>
  &nbsp;·&nbsp;
  <a href="#getting-started"><strong>🛠️ Run it locally</strong></a>
</p>

<p>
  <a href="https://cabane-a-mousse-herbignac.vercel.app"><img src="https://img.shields.io/badge/Vercel-Live-191918?style=for-the-badge&logo=vercel&logoColor=white" alt="Live on Vercel" /></a>
  <img src="https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite 6" />
  <img src="https://img.shields.io/badge/Web_Animations-API-E67F22?style=for-the-badge&logo=css&logoColor=white" alt="Web Animations API" />
  <img src="https://img.shields.io/badge/JavaScript-ES2020-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/♿_Accessibility-first-F3B43F?style=for-the-badge" alt="Accessibility first" />
</p>

</div>

<br />

## 🚀 Overview

**La Cabane à Mousse** is a beer cellar, a bar and a tap-hire service at 21 avenue de la Monneraye in Herbignac. On desktop the page **is the approved design board**, rebuilt in HTML: the same toast hero, the same three chapters with torn paper, orange labels and handwritten notes, every title and button at the position it has on the board. The words are real text set on top of the board's own imagery, so they stay sharp, selectable and readable by search engines and screen readers.

The page is in French, like the business. It walks visitors from the toast to the three things the Cabane does (the bar, the cellar, tap hire) and ends with the address and directions.

- **Faithful to the board**: at 1024 px the page differs from `modelo-final.png` by a mean of 16 levels per pixel (out of 255), measured by `scripts/board-compare.mjs`
- **A warm first impression**: a 2.8 s toast built from two transparent layers that land exactly on the board's glasses, with French replay and pause controls
- **The real place on phones**: the mobile layout follows the kit's mobile mock-up, with the venue's own photos above each text panel
- **Honest content**: no invented prices, opening hours, stock or booking forms; tap hire leads to a conversation with the team
- **Built for every visitor**: works without JavaScript, respects reduced motion, full keyboard support, 818 KB first load on desktop and 824 KB on a phone

<br />

<a name="hero-animation"></a>

## 🎬 The hero animation

<div align="center">
  <a href="https://cabane-a-mousse-herbignac.vercel.app"><img src=".github/assets/hero-toast.gif" alt="The toast: the real bar room comes into view, two hands bring their glasses together, the rims meet with a warm flash and bubbles, and the title On se retrouve à la Cabane appears" width="100%" /></a>
  <sub>Plays once on load on the live site · captured at 1440 × 900, 15 fps</sub>
</div>

<br />

The toast follows the kit's motion script and plays once, without locking the scroll:

| Time         | What happens                                                                                                                       |
| :----------- | :--------------------------------------------------------------------------------------------------------------------------------- |
| 0–1.25 s     | Over the bar out of focus, two hands come in from the sides and bring their glasses to the exact spot they hold on the board          |
| 1.25–1.65 s  | The rims meet: a warm flash, two rings and a handful of bubbles; the photo comes into focus under them and takes over from the layers |
| 1.65–2.8 s   | **On se retrouve** rises, **à la Cabane.** writes itself, the underline draws, then the tagline and **Découvrir la Cabane**           |
| End          | The approved board's hero, pixel for pixel, with live text                                                                           |

**Under the hood**

- 🖼️ **The board, cleaned.** `scripts/board-plates.py` takes the board's own hero and section strips, removes the baked-in words (labels and buttons by their orange shape, letters by a white top-hat filter on the dark paper) and upscales the result x2 with Real-ESRGAN. Behind the hero title it fits the kit's toast photo, registered glass by glass with SIFT, so nothing is invented under the words.
- 📐 **Board pixels as the unit.** Every desktop position is written in board px and multiplied by a container-query unit (`--uh` in the hero, `--u` in the sections), so the layout scales with the window and stays registered to the imagery. Wider windows centre the board hero on the bar, extended by 120 board px each side.
- 🍻 **Layers that land on the photo.** Each hand/glass layer is matched to its own glass on the board (the search is limited to that half, so the two identical logos cannot swap); the animation ends exactly there and hands over to the photo at the clink.
- ⏱️ **One clock.** About thirty Web Animations share the same 2.8 s timeline, so **Mettre en pause**, **Reprendre** and **Rejouer le toast** act on the whole scene.
- 🐢 **Graceful by default.** With `prefers-reduced-motion`, through a link such as `#cave`, without JavaScript or if a layer fails to load, the hero shows the final frame directly.

<br />

## 🖥️ Sections

<div align="center">
  <img src=".github/assets/desktop-sections.jpg" alt="Desktop screenshots: the toast hero, the bar and the cellar, tap hire, and the visit section" width="100%" />
</div>

<br />

| #   | Section                              | Anchor      | Role                                                                                                        |
| :-- | :----------------------------------- | :---------- | :---------------------------------------------------------------------------------------------------------- |
| 01  | **On se retrouve à la Cabane.**      | `#accueil`  | The toast and the first call to action                                                                       |
| 02  | **Une cave. Un bar. Votre Cabane.**  | `#bar`      | The board's bar strip: hop sketch, torn dark paper, the room with its tables and fridges                     |
| 03  | **Le plaisir de découvrir.**         | `#cave`     | Bottles and a Cabane glass; note *Goûter, Partager, Découvrir*                                               |
| 04  | **La fête vient chez vous.**         | `#location` | The taps; note *Simplicité, Convivialité, Des moments inoubliables*; **Préparer votre événement** leads to the visit section, no form that pretends to book |
| 05  | **Votre prochain bon moment.**       | `#visite`   | Façade and terrace as a taped polaroid, address and directions in Google Maps                                |
| 06  | Footer                               | n/a         | Links, address and the French health warning                                                                 |

<br />

## 📱 Mobile first, motion optional

<div align="center">
  <img src=".github/assets/mobile-screens.jpg" alt="Mobile screenshots: the toast, the bar, tap hire and the visit section" width="100%" />
</div>

<br />

- The toast plays in a band at the top (the board hero cropped to the glasses), the title below it
- Each section follows the kit's mobile mock-up: a photo of the real venue, then a torn dark panel with the board's words
- A **Menu** button opens a full-screen sheet (Escape closes it); the menu button and every call to action are at least 44 px tall
- No horizontal scroll at 375 and 390 px, nothing depends on hover

<br />

## ✨ Highlights

- **🍻 Toast in Web Animations**: no video and no animation library; every piece of the scene is seekable, which also makes the README GIF frame-exact
- **📸 Real photos on phones**: the four venue photos are cropped to the kit's display rectangles (removing the viewer interface they were captured from) and upscaled x2 with Real-ESRGAN; desktop-only plates sit in media-qualified `<source>` elements, so phones never download them
- **🔤 Type matched to the board**: Anton, Kaushan Script, a condensed instance of Roboto Serif (weight 900, width 72), Montserrat and Oswald, each sized so its ink box matches the board's
- **🧱 Static content first**: address and copy are rendered into the HTML at build time from one data file; JavaScript only adds motion
- **🧪 75 automated checks**: `npm run qa` drives Chrome through the toast controls, reduced motion, no-JS, a failed layer, every link, the phone menu, overflow, fonts, images and a scan for production notes in visitor-facing text
- **🔎 Ready to share**: Open Graph image captured from the hero, `BarOrPub` structured data and favicons; kept out of search engines until the owner approves the site

<br />

## 💻 Tech stack

| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vitejs/vitejs-original.svg" width="40" height="40" /><br />Vite 6 | <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg" width="40" height="40" /><br />JavaScript | <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg" width="40" height="40" /><br />HTML5 | <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg" width="40" height="40" /><br />CSS3 | <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg" width="40" height="40" /><br />Python | <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/opencv/opencv-original.svg" width="40" height="40" /><br />OpenCV | <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/playwright/playwright-original.svg" width="40" height="40" /><br />Playwright | <img src="https://cdn.simpleicons.org/vercel/000000/ffffff" width="40" height="40" /><br />Vercel |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |

### Why this stack?

- **Vite + plain JavaScript**: a one-page site doesn't need a framework runtime; the page is static HTML with two small modules (8 KB of JS)
- **Web Animations API**: a finite, timed scene with pause, resume and replay, built into the browser
- **Python + OpenCV + Real-ESRGAN** for the asset pipeline: cleaning the board, registering the layers, upscaling
- **Self-hosted, subset fonts**: no third-party font requests
- **Vercel**: every push to `main` deploys automatically

<br />

## 🎨 Design system

| Token     | Value                                                                        | Use                                                  |
| :-------- | :--------------------------------------------------------------------------- | :--------------------------------------------------- |
| Graphite  | ![#191918](https://img.shields.io/badge/%23191918-191918?style=flat-square) | Page background, footer, text on cream               |
| Charcoal  | ![#292824](https://img.shields.io/badge/%23292824-292824?style=flat-square) | Paper panels                                         |
| Wood      | ![#8A5F35](https://img.shields.io/badge/%238A5F35-8A5F35?style=flat-square) | Sketches, hops                                       |
| Amber     | ![#F3B43F](https://img.shields.io/badge/%23F3B43F-F3B43F?style=flat-square) | Labels, links, focus ring                            |
| Orange    | ![#E67F22](https://img.shields.io/badge/%23E67F22-E67F22?style=flat-square) | Buttons, accents in titles                           |
| Foam      | ![#F5EBDD](https://img.shields.io/badge/%23F5EBDD-F5EBDD?style=flat-square) | Text on dark, paper notes, visit section             |
| Burnt     | ![#A9520F](https://img.shields.io/badge/%23A9520F-A9520F?style=flat-square) | Orange text on cream (4.6:1)                         |

- **Type**: Anton for *On se retrouve*, Kaushan Script for *à la Cabane.*, a condensed Roboto Serif 900 for section titles, Montserrat 600 for body lines, Oswald for navigation, labels and buttons
- **Sizes**: on desktop every size is in board px (hero title 106, section titles 46–49, body 10.9 at 1024 px wide) and scales with the window; on phones titles are 38–52 px and body 13.5 px
- **Paper**: the board's own torn dark paper, cream notes and scraps; orange labels with torn ends
- **Motion**: the 2.8 s toast; the visit section rises 18 px with a fade

<br />

<a name="getting-started"></a>

## 🛠️ Getting started

```bash
# Clone the repository
git clone https://github.com/Jeanfr1/cabaneamoussewebsite.git
cd cabaneamoussewebsite

# Install dependencies (Node 20.10+)
npm install

# Start the dev server  →  http://localhost:5196
npm run dev

# Production build  →  dist/
npm run build

# Preview the production build  →  http://localhost:4196
npm run preview

# End-to-end checks against the preview (needs Google Chrome)
npm run qa
```

The generated images, fonts and pose are committed. To rebuild them from the kit (Python with OpenCV and PyTorch; Real-ESRGAN weights in `~/.cache/realesrgan/`):

```bash
npm run board    # clean the board, register the layers, Real-ESRGAN x2 → assets-src/board, src/styles/scene.generated.css
npm run photos   # crop the venue photos + Real-ESRGAN x2              → assets-src/photos
npm run fonts    # WOFF2 subsets                                       → public/fonts
npm run images   # AVIF + WebP widths, favicons                        → public/img
node scripts/board-compare.mjs   # page vs board at 1024 px             → qa/compare-page.png
```

<br />

## 📁 Project structure

```
cabaneamoussewebsite/
├── index.html                    # hero → bar → cave → location → visite → footer (desktop text placed in board px)
├── vite.config.js                # fills {{placeholders}} from src/data/site.js, strips HTML comments
├── vercel.json                   # Vite + dist pinned, noindex and cache headers
├── src/
│   ├── main.js                   # compact bar, mobile menu, reveal, active link
│   ├── js/toast.js               # the toast: Web Animations on one clock + controls
│   ├── styles/
│   │   ├── main.css              # tokens, desktop board layout, phone layout, reduced motion
│   │   └── scene.generated.css   # layer poses and contact point in board px (board-plates.py)
│   └── data/                     # site.js (facts), board.json, images.json
├── public/                       # img/ (AVIF + WebP), fonts/ (WOFF2 + licences), OG image, favicons, robots.txt
├── scripts/
│   ├── board-plates.py           # board cleaned, layers registered, hero and blur plates
│   ├── prepare-photos.py         # venue photos cropped to the kit's display rects
│   ├── esrgan.py                 # Real-ESRGAN x4plus on PyTorch (shared)
│   ├── subset-fonts.py           # font subsets and instances
│   ├── build-images.mjs          # image widths and formats (sharp)
│   ├── board-compare.mjs         # page vs board capture
│   ├── qa.mjs                    # 75 end-to-end checks
│   ├── shots.mjs                 # capture passes
│   └── readme-assets.mjs, readme-composite.py
└── 00-referencias … 09-verificacao, LEIA-ME-KIT.md   # the V4 design kit: kept here, never deployed
```

<br />

## 🚀 Deployment

Hosted on **Vercel** and connected to this repository: every push to `main` ships to production.

**Live site:** [cabane-a-mousse-herbignac.vercel.app](https://cabane-a-mousse-herbignac.vercel.app)

| Setting          | Value           |
| :--------------- | :-------------- |
| Framework        | Vite            |
| Build command    | `npm run build` |
| Output directory | `dist`          |

<br />

## 📌 Content checklist

Items waiting on the owner. Each one is marked `TODO(cabane)` in the code.

- [ ] Owner sign-off on the board imagery (generated campaign art; the logo on the glasses does not mean the Cabane brews its own beer) and on the board's wording
- [ ] Original files or written permission for the four venue photos (they come from visitor screenshots)
- [ ] Official logo master (SVG or PDF)
- [ ] Phone, email, opening hours and tap-hire conditions (left out until confirmed)
- [ ] Google Maps place link for the business (directions currently search by name and address)
- [ ] Custom domain (then update `canonical`, `og:url` and drop `noindex` in `index.html`, `vercel.json` and `robots.txt`)

Choices made where the kit's documents disagreed:

- **Desktop**: the approved board (`02-direcao/modelo-final.png`) is the reference, as the owner asked on 2026-10-14; its words are used where they differ from `CONTEUDO-FR.md` (for example *Une sélection soignée de bières artisanales, locales et internationales*) and need the owner's confirmation.
- **Phones**: the board has no phone version, so the phone layout follows the kit's mobile mock-up (photo, then text) with the venue's own photos.
- **Hero animation**: the motion script asks for the real room behind the hands; the animation runs over the bar of the board's photo, out of focus, so that it ends on the board.

<br />

## 🙏 Acknowledgments

- **La Cabane à Mousse** for the brief, the V4 design kit and the photos of the venue
- **[Anton](https://fonts.google.com/specimen/Anton)**, **[Kaushan Script](https://fonts.google.com/specimen/Kaushan+Script)**, **[Roboto Serif](https://fonts.google.com/specimen/Roboto+Serif)**, **[Montserrat](https://fonts.google.com/specimen/Montserrat)** and **[Oswald](https://fonts.google.com/specimen/Oswald)** (SIL Open Font License)
- **[Real-ESRGAN](https://github.com/xinntao/Real-ESRGAN)** by Xintao Wang et al. for the photo upscaling
- **[OpenCV](https://github.com/opencv/opencv)**, **[sharp](https://sharp.pixelplumbing.com)** and **[Playwright](https://playwright.dev)**
- **[Vite](https://vite.dev)** and **[Vercel](https://vercel.com)**

<br />

---

<div align="center">
  <img src="public/favicon-192.png" width="44" height="44" alt="" />
  <p><strong>On se retrouve à la Cabane.</strong></p>
  <p>Built with ❤️ by <a href="https://github.com/Jeanfr1">Jean</a> for La Cabane à Mousse</p>
  <sub>© 2026 La Cabane à Mousse. All rights reserved.</sub>
</div>
