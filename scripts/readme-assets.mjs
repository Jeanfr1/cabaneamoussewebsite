// Raw captures for the README, from the production build:
//   npm run build && npm run preview, then node scripts/readme-assets.mjs
// Writes qa/readme/ (gitignored); scripts/readme-composite.py turns them into
// .github/assets/ (banner, toast GIF, framed desktop and phone screenshots).
import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright-core'

const base = process.argv[2] || 'http://localhost:4196/'
const out = 'qa/readme'
await rm(out, { recursive: true, force: true })
await mkdir(path.join(out, 'toast'), { recursive: true })

const browser = await chromium.launch({ channel: 'chrome' })
const twoFrames = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
const ready = (page) => page.waitForFunction(() => document.querySelector('[data-hero]').classList.contains('is-ready'))

// ---------- banner, rendered with the site's own fonts and images ----------
{
  const page = await browser.newPage({ viewport: { width: 1600, height: 520 } })
  await page.goto(base + 'robots.txt') // same origin, so the font files load without CORS
  await page.setContent(`<!doctype html><html><head><style>
    @font-face { font-family: Anton; src: url(${base}fonts/anton-400.woff2) }
    @font-face { font-family: Kaushan; src: url(${base}fonts/kaushan-400.woff2) }
    @font-face { font-family: Oswald; src: url(${base}fonts/oswald-500.woff2); font-weight: 500 }
    html, body { margin: 0; width: 1600px; height: 520px; background: #191918; overflow: hidden }
    .toast { position: absolute; right: 0; top: 0; width: 1000px; height: 520px; object-fit: cover; object-position: 50% 30%;
      -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 34%); mask-image: linear-gradient(90deg, transparent 0%, #000 34%) }
    .copy { position: absolute; left: 90px; top: 0; bottom: 0; display: flex; flex-direction: column; justify-content: center; color: #f5ebdd }
    .logo { width: 150px; margin-bottom: 18px; filter: drop-shadow(0 6px 18px rgba(0,0,0,.5)) }
    h1 { margin: 0; font: 400 96px/0.95 Anton; letter-spacing: -0.015em; color: #fbecd8 }
    h2 { margin: 2px 0 0 110px; font: 400 64px/1.15 Kaushan; color: #f6993a; transform: rotate(-4deg) }
    p { margin: 22px 0 0; font: 500 18px/1 Oswald; letter-spacing: .34em; text-transform: uppercase; color: rgba(245,235,221,.85) }
    .rim { position: absolute; left: 0; right: 0; bottom: 0; height: 6px; background: linear-gradient(90deg, #e67f22, #f3b43f) }
  </style></head><body>
    <img class="toast" src="${base}img/hero-still-v3-2528.webp">
    <div class="copy"><img class="logo" src="${base}img/logo-v3-400.webp"><h1>On se retrouve</h1><h2>à la Cabane.</h2><p>Cave · Bar · Location de tireuses · Herbignac</p></div>
    <div class="rim"></div>
  </body></html>`)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(out, 'banner.png') })
  await page.close()
}

// ---------- the toast, frame by frame (seeking the Web Animations clock) ----------
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(base, { waitUntil: 'networkidle' })
  await ready(page)
  await page.evaluate(() => document.fonts.ready)
  const step = 1000 / 15
  let i = 0
  for (let t = 0; t <= 2800 + 1; t += step) {
    await page.evaluate((ms) => {
      for (const a of window.__cabane.toast.anims()) {
        a.pause()
        a.currentTime = Math.min(ms, 2800)
      }
    }, t)
    await twoFrames(page)
    await page.screenshot({ path: path.join(out, 'toast', `f_${String(i++).padStart(4, '0')}.png`) })
  }
  console.log('toast frames', i)
  await page.close()
}

// ---------- desktop sections ----------
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(base, { waitUntil: 'networkidle' })
  await ready(page)
  await page.evaluate(() => window.__cabane.toast.anims().forEach((a) => a.finish()))
  for (const id of ['accueil', 'bar', 'location', 'visite']) {
    await page.evaluate((id) => {
      const el = document.getElementById(id)
      const off = { accueil: 0, bar: 0, location: -180, visite: -60 }[id]
      window.scrollTo({ top: el.getBoundingClientRect().top + scrollY + off, behavior: 'instant' })
    }, id)
    await page.waitForTimeout(1600)
    await page.screenshot({ path: path.join(out, `desktop-${id}.png`) })
  }
  await page.close()
}

// ---------- phone ----------
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const page = await ctx.newPage()
  await page.goto(base, { waitUntil: 'networkidle' })
  await ready(page)
  await page.evaluate(() => window.__cabane.toast.anims().forEach((a) => a.finish()))
  await twoFrames(page)
  await page.screenshot({ path: path.join(out, 'phone-hero.png') })
  for (const [id, off] of [['bar', 0], ['location', 0], ['visite', 0]]) {
    await page.evaluate(([id, off]) => window.scrollTo({ top: document.getElementById(id).getBoundingClientRect().top + scrollY + off, behavior: 'instant' }), [id, off])
    await page.waitForTimeout(1600)
    await page.screenshot({ path: path.join(out, `phone-${id}.png`) })
  }
  await ctx.close()
}

await browser.close()
console.log('wrote', out)
