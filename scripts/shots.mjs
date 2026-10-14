// Capture passes against the production build (npm run build && npm run preview).
//   node scripts/shots.mjs [base] [outDir]
// - toast-<vp>-<t>.png: the hero at fixed times of the 2.8 s toast (animations
//   paused and seeked through the page's test hook)
// - page-<vp>-<nn>.png: scroll positions down the page
// - full-<vp>.png: whole page after reveals
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright-core'

const base = process.argv[2] || 'http://localhost:4196/'
const out = process.argv[3] || 'qa/shots'
await mkdir(out, { recursive: true })

const viewports = {
  desktop: { width: 1440, height: 900 },
  laptop: { width: 1280, height: 720 },
  phone: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
}
const only = process.env.VP ? process.env.VP.split(',') : Object.keys(viewports)

const browser = await chromium.launch({ channel: 'chrome' })
for (const name of only) {
  const vp = viewports[name]
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.deviceScaleFactor || 1,
    isMobile: !!vp.isMobile,
    hasTouch: !!vp.hasTouch,
  })
  const page = await ctx.newPage()
  await page.goto(base, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => document.querySelector('[data-hero]').classList.contains('is-ready'))
  await page.evaluate(() => document.fonts.ready)

  for (const t of [0, 0.5, 1.0, 1.25, 1.4, 1.65, 2.0, 2.4, 2.8]) {
    await page.evaluate((ms) => {
      for (const a of window.__cabane.toast.anims()) {
        a.pause()
        a.currentTime = ms
      }
    }, t * 1000)
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))
    await page.screenshot({ path: path.join(out, `toast-${name}-${t.toFixed(2)}.png`) })
  }
  await page.evaluate(() => window.__cabane.toast.anims().forEach((a) => a.finish()))

  const H = await page.evaluate(() => document.documentElement.scrollHeight)
  const ids = ['bar', 'cave', 'location', 'visite']
  let i = 0
  for (const id of ids) {
    const top = await page.evaluate((id) => document.getElementById(id).getBoundingClientRect().top + scrollY, id)
    for (const off of [-0.35, 0]) {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), Math.max(0, top + off * vp.height))
      await page.waitForTimeout(1100)
      await page.screenshot({ path: path.join(out, `page-${name}-${String(++i).padStart(2, '0')}.png`) })
    }
  }
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), H)
  await page.waitForTimeout(900)
  await page.screenshot({ path: path.join(out, `page-${name}-${String(++i).padStart(2, '0')}.png`) })
  const sw = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth])
  console.log(name, 'scrollWidth/innerWidth', sw.join('/'), 'height', H)
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await page.waitForTimeout(400)
  await page.screenshot({ path: path.join(out, `full-${name}.png`), fullPage: true })
  await ctx.close()
}
await browser.close()
