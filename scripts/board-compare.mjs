// Page vs approved board, at 1 css px = 1 board px (1024 × 625 window).
//   node scripts/board-compare.mjs [base]  → qa/compare-*.png, qa/ink.json
// ink.json: the ink box of every positioned text element, measured by
// screenshotting the page with and without that element (diff of pixels).
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const base = process.argv[2] || 'http://localhost:4196/'
await mkdir('qa', { recursive: true })
const b = await chromium.launch({ channel: 'chrome' })
const ctx = await b.newContext({ viewport: { width: 1024, height: 625 }, reducedMotion: 'reduce' })
const p = await ctx.newPage()
await p.goto(base, { waitUntil: 'networkidle' })
await p.waitForFunction(() => document.querySelector('[data-hero]').classList.contains('is-ready'))
await p.evaluate(() => document.fonts.ready)
await p.evaluate(async () => {
  for (const img of document.images) img.loading = 'eager'
  await Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => i.addEventListener('load', r, { once: true })))))
})
await p.addStyleTag({ content: '.topbar{display:none!important}' })
await p.waitForTimeout(300)
await p.screenshot({ path: 'qa/compare-page.png', fullPage: true })

const sels = ['.hero-title__a', '.hero-title__b', '.hero-swoosh', '.hero-sub', '.btn--hero', '.hero-head__logo', '.hero-head__nav .n1', '.hero-head__nav .n2', '.hero-head__nav .n3', '.btn--head',
  '.tag--s1', '.title--s1 .l1', '.title--s1 .l2', '.title--s1 .l3', '.body--s1',
  '.tag--s2', '.title--s2 .l1', '.title--s2 .l2', '.body--s2',
  '.tag--s3', '.title--s3 .l1', '.title--s3 .l2', '.body--s3', '.btn--s3']
const shot = async () => p.screenshot({ fullPage: true, clip: { x: 0, y: 0, width: 1024, height: 1536 } })
const full = await shot()
const out = {}
for (const s of sels) {
  await p.evaluate((s) => (document.querySelector(s).style.visibility = 'hidden'), s)
  const without = await shot()
  await p.evaluate((s) => (document.querySelector(s).style.visibility = ''), s)
  out[s] = { with: full.toString('base64').length, png: without }
  const fs = await import('node:fs')
  fs.writeFileSync(`qa/ink-${sels.indexOf(s)}.png`, without)
}
const fs = await import('node:fs')
fs.writeFileSync('qa/ink-full.png', full)
fs.writeFileSync('qa/ink-sels.json', JSON.stringify(sels))
await b.close()
