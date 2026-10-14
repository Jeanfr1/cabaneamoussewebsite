// End-to-end checks on the production build (npm run build && npm run preview),
// or on the live site: QA_BASE=https://… npm run qa
import { chromium } from 'playwright-core'

const base = process.env.QA_BASE || 'http://localhost:4196/'
const results = []
const check = (name, ok, info = '') => {
  results.push({ name, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? `  (${info})` : ''}`)
}

const browser = await chromium.launch({ channel: 'chrome' })
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
const small = { viewport: { width: 375, height: 667 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
const desktop = { viewport: { width: 1440, height: 900 } }
const laptop = { viewport: { width: 1280, height: 720 } }

async function open(ctxOpts, url = base, setup) {
  const ctx = await browser.newContext(ctxOpts)
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  if (setup) await setup(page)
  await page.goto(url, { waitUntil: 'load' })
  return { ctx, page, errors }
}
const ready = (page) => page.waitForFunction(() => document.querySelector('[data-hero]').classList.contains('is-ready'), null, { timeout: 8000 })
const done = (page) => page.waitForFunction(() => document.querySelector('[data-hero]').classList.contains('is-done'), null, { timeout: 8000 })
const topOf = (page, sel) => page.evaluate((s) => Math.round(document.querySelector(s).getBoundingClientRect().top), sel)
const settle = (page, ms = 1200) => page.waitForTimeout(ms)

// ---------- 1. toast: plays once, controls ----------
{
  const { ctx, page, errors } = await open(desktop)
  await ready(page)
  const t0 = Date.now()
  const n = await page.evaluate(() => window.__cabane.toast.anims().length)
  check('toast: animations created', n > 20, `${n}`)
  check('toast: controls visible', await page.isVisible('[data-controls]'))
  await page.waitForTimeout(500)
  await page.click('[data-pause]')
  const paused = await page.evaluate(() => window.__cabane.toast.anims().every((a) => a.playState === 'paused'))
  check('toast: pause pauses every animation', paused)
  check('toast: pause button says Reprendre', (await page.textContent('[data-pause]')) === 'Reprendre')
  check('toast: aria-pressed true', (await page.getAttribute('[data-pause]', 'aria-pressed')) === 'true')
  const tPaused = await page.evaluate(() => window.__cabane.toast.anims()[0].currentTime)
  await page.waitForTimeout(400)
  const tStill = await page.evaluate(() => window.__cabane.toast.anims()[0].currentTime)
  check('toast: time frozen while paused', tPaused === tStill)
  await page.click('[data-pause]')
  check('toast: resume', await page.evaluate(() => window.__cabane.toast.anims().every((a) => a.playState === 'running')))
  await done(page)
  check('toast: finishes (finite)', true, `${Date.now() - t0} ms incl. pause`)
  check('toast: pause hidden after the end', await page.isHidden('[data-pause]'))
  const op = await page.evaluate(() => getComputedStyle(document.querySelector('.hero-title__a')).opacity)
  check('toast: title visible at the end', op === '1')
  await page.click('[data-replay]')
  const ct = await page.evaluate(() => window.__cabane.toast.anims()[0].currentTime)
  check('toast: replay restarts from 0', ct < 400, `${Math.round(ct)} ms`)
  check('toast: replay shows pause again', await page.isVisible('[data-pause]'))
  await done(page)
  // at the clink (1.25 s) the two rims meet at the board's contact point
  await page.click('[data-replay]')
  const gap = await page.evaluate(() => {
    for (const a of window.__cabane.toast.anims()) {
      a.pause()
      a.currentTime = 1250
    }
    const fr = document.querySelector('.frame__photo').getBoundingClientRect()
    const u = fr.width / 1024
    const cs = getComputedStyle(document.documentElement)
    const cx = fr.left + parseFloat(cs.getPropertyValue('--contact-x')) * u
    const [l, r] = [...document.querySelectorAll('.glass img')].map((g) => g.getBoundingClientRect())
    return { cx: Math.round(cx), l: Math.round(l.right), r: Math.round(r.left) }
  })
  check('toast: rims meet at the contact point', gap.r < gap.cx && gap.l > gap.cx, JSON.stringify(gap))
  await page.evaluate(() => window.__cabane.toast.anims().forEach((a) => a.finish()))
  check('desktop: no console errors', errors.length === 0, errors.join(' | '))
  await ctx.close()
}

// ---------- 2. reduced motion: final pose, no controls ----------
{
  const { ctx, page } = await open({ ...desktop, reducedMotion: 'reduce' })
  await ready(page)
  const n = await page.evaluate(() => window.__cabane.toast.anims().length)
  check('reduced: no animations', n === 0)
  check('reduced: controls hidden', await page.isHidden('[data-controls]'))
  check('reduced: title visible', (await page.evaluate(() => getComputedStyle(document.querySelector('.hero-copy')).opacity)) === '1')
  check('reduced: board photo visible', (await page.evaluate(() => getComputedStyle(document.querySelector('.plate--still')).opacity)) === '1')
  await page.evaluate(() => window.scrollTo(0, document.getElementById('cave').offsetTop))
  await settle(page, 300)
  check('reduced: section text not hidden', (await page.evaluate(() => getComputedStyle(document.querySelector('#cave .title')).opacity)) === '1')
  await ctx.close()
}

// ---------- 3. no JS: still, copy, every section readable ----------
{
  const { ctx, page } = await open({ ...desktop, javaScriptEnabled: false })
  await page.waitForTimeout(800)
  check('no-JS: board photo shown', await page.evaluate(() => getComputedStyle(document.querySelector('.plate--still')).opacity === '1'))
  check('no-JS: scene hidden', await page.evaluate(() => getComputedStyle(document.querySelector('.scene')).display === 'none'))
  check('no-JS: still loaded', await page.evaluate(async () => {
    const img = document.querySelector('.plate--still img')
    if (!img.complete) await new Promise((r) => img.addEventListener('load', r, { once: true }))
    return img.naturalWidth > 0
  }))
  check('no-JS: hero title visible', (await page.evaluate(() => getComputedStyle(document.querySelector('.hero-copy')).opacity)) === '1')
  const text = await page.evaluate(() => document.body.textContent.replace(/\s+/g, ' '))
  for (const s of ['On se retrouve', 'à la Cabane.', 'Une cave.', 'Votre Cabane.', 'Le plaisir', 'découvrir.', 'La fête', 'vient chez vous.', '21 avenue de la Monneraye', '44410 Herbignac', 'Préparer votre événement']) {
    check(`no-JS: "${s}" in page`, text.includes(s))
  }
  check('no-JS: reveals visible', await page.evaluate(() => [...document.querySelectorAll('.reveal')].every((e) => getComputedStyle(e).opacity === '1')))
  await ctx.close()
}

// ---------- 4. a glass layer fails: the still comes back ----------
{
  const { ctx, page } = await open(desktop, base, (p) => p.route(/glass-left/, (r) => r.abort()))
  await page.waitForFunction(() => document.querySelector('[data-hero]').classList.contains('is-static'), null, { timeout: 9000 })
  check('layer error: hero falls back to the photo', await page.evaluate(() => getComputedStyle(document.querySelector('.plate--still')).opacity === '1' && getComputedStyle(document.querySelector('.scene')).display === 'none'))
  check('layer error: controls hidden', await page.isHidden('[data-controls]'))
  check('layer error: title visible', (await page.evaluate(() => getComputedStyle(document.querySelector('.hero-copy')).opacity)) === '1')
  await ctx.close()
}

// ---------- 5. CTAs, nav, hash, map link (desktop) ----------
{
  const { ctx, page } = await open(desktop)
  await ready(page)
  await done(page)
  await page.click('.btn--hero')
  await settle(page)
  check('CTA "Découvrir la Cabane" → #bar', Math.abs(await topOf(page, '#bar')) < 90, `${await topOf(page, '#bar')}px`)
  for (const [label, id] of [['La cave', '#cave'], ['Location de tireuses', '#location'], ['Le bar', '#bar']]) {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
    await page.waitForTimeout(300)
    await page.click(`.hero-head__nav a[href="${id}"]`)
    await settle(page)
    check(`hero nav "${label}" → ${id}`, Math.abs(await topOf(page, id)) < 90, `${await topOf(page, id)}px`)
  }
  check('compact bar shown after the hero', await page.evaluate(() => document.querySelector('[data-topbar]').classList.contains('is-shown')))
  await page.click('.topbar__nav a[href="#cave"]')
  await settle(page)
  check('compact bar "La cave" → #cave', Math.abs(await topOf(page, '#cave')) < 90)
  await page.click('.btn--s3')
  await settle(page)
  check('"Préparer votre événement" → #visite', Math.abs(await topOf(page, '#visite')) < 90)
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await page.waitForTimeout(400)
  check('compact bar hidden over the hero', await page.evaluate(() => !document.querySelector('[data-topbar]').classList.contains('is-shown')))
  await page.click('.btn--head')
  await settle(page)
  check('header button "Découvrir la Cabane" → #bar', Math.abs(await topOf(page, '#bar')) < 90)
  const map = await page.$('#visite a.btn')
  check('map link opens a new tab safely', (await map.getAttribute('target')) === '_blank' && (await map.getAttribute('rel')).includes('noopener'))
  check('map link names the Cabane', (await map.getAttribute('href')).includes('La+Cabane+a+Mousse'))
  await ctx.close()

  const h = await open(desktop, base + '#cave')
  await h.page.waitForTimeout(1500)
  check('hash #cave lands on the cave', Math.abs(await topOf(h.page, '#cave')) < 90, `${await topOf(h.page, '#cave')}px`)
  check('hash load skips the toast (final pose)', await h.page.evaluate(() => document.querySelector('[data-hero]').classList.contains('is-done')))
  await h.ctx.close()
}

// ---------- 6. phone: menu, CTA, layout ----------
{
  const { ctx, page, errors } = await open(phone)
  await ready(page)
  check('phone: nav hidden, menu button shown', (await page.isHidden('.topbar__nav')) && (await page.isHidden('.hero-head__nav')) && (await page.isVisible('[data-menu-toggle]')))
  await page.tap('[data-menu-toggle]')
  check('phone: menu opens', await page.isVisible('[data-menu]'))
  check('phone: aria-expanded', (await page.getAttribute('[data-menu-toggle]', 'aria-expanded')) === 'true')
  await page.keyboard.press('Escape')
  check('phone: Escape closes the menu', await page.isHidden('[data-menu]'))
  await page.tap('[data-menu-toggle]')
  await page.tap('[data-menu] a[href="#location"]')
  await settle(page)
  check('phone: menu link → #location and closes', (await page.isHidden('[data-menu]')) && Math.abs(await topOf(page, '#location')) < 80)
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await done(page)
  await page.tap('.btn--hero')
  await settle(page)
  check('phone: hero CTA → #bar', Math.abs(await topOf(page, '#bar')) < 80)
  // the title block clears the glasses band and the controls
  const lay = await page.evaluate(() => {
    const r = (s) => document.querySelector(s).getBoundingClientRect()
    return { cta: r('.btn--hero').bottom, controls: r('[data-controls]').top }
  })
  check('phone: CTA above the controls', lay.cta <= lay.controls, JSON.stringify(lay))
  check('phone: no console errors', errors.length === 0, errors.join(' | '))
  await ctx.close()
}

// ---------- 7. overflow and images at every width ----------
for (const [name, opts] of [['desktop', desktop], ['laptop', laptop], ['phone', phone], ['small', small]]) {
  const { ctx, page } = await open(opts)
  await ready(page)
  const H = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y < H; y += 500) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), y)
    await page.waitForTimeout(60)
  }
  await page.waitForTimeout(800)
  const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth])
  check(`${name}: scrollWidth === innerWidth`, sw === iw, `${sw}/${iw}`)
  const broken = await page.evaluate(() => [...document.images].filter((i) => getComputedStyle(i).display !== 'none' && !(i.complete && i.naturalWidth > 0)).map((i) => i.currentSrc || i.src))
  check(`${name}: every image loaded`, broken.length === 0, broken.join(', '))
  const fonts = await page.evaluate(() => ['20px Anton', '20px "Kaushan Script"', '900 20px "Cabane Serif"', '600 20px Montserrat', '500 20px Oswald'].map((f) => document.fonts.check(f)))
  check(`${name}: fonts loaded`, fonts.every(Boolean), fonts.join(','))
  await ctx.close()
}

// ---------- 8. visitor-facing text holds no production notes ----------
{
  const { ctx, page } = await open(desktop)
  const words = /\b(conceptu|illustrati|originale?s?\b|g[ée]n[ée]r[ée]|campa(gne|ign)|mockup|maquette|retouch|[ée]dit[ée]|kit\b|\bIA\b|AI\b|placeholder|lorem|TODO)/i
  const texts = await page.evaluate(() => [document.body.innerText, ...[...document.querySelectorAll('[alt]')].map((e) => e.getAttribute('alt')), ...[...document.querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label')), document.title, document.querySelector('meta[name=description]').content])
  const hits = texts.filter((t) => words.test(t)).map((t) => t.match(words)[0])
  check('copy: no production notes in text/alt/meta', hits.length === 0, hits.join(', '))
  const html = await page.content()
  check('copy: no prices, hours or phone numbers', !/\d+\s?€|\b\d{1,2}h\d{0,2}\b|0\d(\s?\d{2}){4}/.test(await page.evaluate(() => document.body.innerText)))
  check('noindex meta present', html.includes('noindex'))
  check('health warning present', (await page.evaluate(() => document.body.innerText)).includes('L’abus d’alcool est dangereux pour la santé'))
  await ctx.close()
}

// ---------- 9. transferred bytes, first load ----------
for (const [name, opts] of [['desktop', desktop], ['phone', phone]]) {
  const ctx = await browser.newContext(opts)
  const page = await ctx.newPage()
  let bytes = 0
  page.on('response', async (r) => {
    try {
      const b = await r.body()
      bytes += b.length
    } catch {}
  })
  await page.goto(base, { waitUntil: 'networkidle' })
  console.log(`INFO  ${name}: first load ${(bytes / 1024).toFixed(0)} KB`)
  await ctx.close()
}

await browser.close()
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
process.exit(failed.length ? 1 : 0)
