// The toast (06-roteiros/MOTION.md, 07-integracao/timeline.json), 2.8 s, finite.
// It ends on the approved board's hero photo, so the last frame IS the board:
// 0–1.25 s   over the defocused bar, the two hand/glass layers come in from the
//            sides to the exact place their glass has in the photo (registered
//            by scripts/board-plates.py);
// 1.25–1.65  the rims meet: a warm flash, rings and bubbles, and the photo comes
//            into focus under them (layers hand over to the still);
// 1.65–2.8   the title appears.
// Every piece is one Web Animation of the same length, so pause, resume and
// replay act on the whole scene. Reduced motion: the final frame only.

const D = 2800
const OUT = 'cubic-bezier(.16,1,.3,1)'
const SOFT = 'cubic-bezier(.33,0,.2,1)'
const IN_OUT = 'cubic-bezier(.65,0,.35,1)'
const at = (s) => s / (D / 1000) // seconds → keyframe offset

function glassFrames(side) {
  const k = side === 'left' ? 1 : -1
  return [
    { offset: 0, opacity: 0, transform: `translate(${-62 * k}%, 14%) rotate(${-12 * k}deg)`, easing: SOFT },
    { offset: at(0.32), opacity: 1 },
    { offset: at(1.12), transform: `translate(${1.2 * k}%, -0.6%) rotate(${1.6 * k}deg)`, easing: 'ease-out' },
    { offset: at(1.25), transform: 'translate(0%, 0%) rotate(0deg)', opacity: 1 },
    { offset: at(1.42), transform: `translate(${-0.6 * k}%, 0.3%) rotate(${-0.4 * k}deg)`, opacity: 1, easing: IN_OUT },
    { offset: at(1.6), transform: 'translate(0%, 0%) rotate(0deg)', opacity: 0 },
    { offset: 1, transform: 'translate(0%, 0%) rotate(0deg)', opacity: 0 },
  ]
}

function bubbles(clink, unit) {
  clink.querySelectorAll('.bubble').forEach((b) => b.remove())
  const list = []
  const n = 18
  for (let i = 0; i < n; i++) {
    const b = document.createElement('span')
    b.className = 'bubble'
    b.style.setProperty('--s', `${(6 + Math.random() * 11) * Math.max(0.6, unit)}px`)
    clink.append(b)
    const ang = (-170 + (i / (n - 1)) * 160 + (Math.random() - 0.5) * 18) * (Math.PI / 180)
    const r = unit * (40 + Math.random() * 90)
    const dx = Math.cos(ang) * r
    const dy = Math.sin(ang) * r - unit * 18 * Math.random()
    const end = 1.95 + Math.random() * 0.6
    list.push([
      b,
      [
        { offset: 0, opacity: 0, transform: 'translate(0,0) scale(.3)' },
        { offset: at(1.24), opacity: 0, transform: 'translate(0,0) scale(.3)', easing: OUT },
        { offset: at(1.32), opacity: 1 },
        { offset: at(end) - 0.04, opacity: 0.85 },
        { offset: at(end), opacity: 0, transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(1)` },
        { offset: 1, opacity: 0, transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(1)` },
      ],
    ])
  }
  return list
}

export function initToast(hero) {
  if (!hero) return
  const q = (s) => hero.querySelector(s)
  const glasses = [...hero.querySelectorAll('[data-glass]')]
  const still = q('[data-still]')
  const blur = q('[data-blur]')
  const clink = q('[data-clink]')
  const controls = q('[data-controls]')
  const replayBtn = q('[data-replay]')
  const pauseBtn = q('[data-pause]')
  const copy = (k) => q(`[data-copy="${k}"]`)
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

  let anims = []
  let paused = false

  const setPaused = (value) => {
    paused = value
    pauseBtn.textContent = value ? 'Reprendre' : 'Mettre en pause'
    pauseBtn.setAttribute('aria-pressed', String(value))
  }

  // composes with each element's own CSS transform (title rotations, centring)
  const base = (el) => {
    const t = getComputedStyle(el).transform
    return t === 'none' ? '' : t
  }

  const build = () => {
    anims.forEach((a) => a.cancel())
    anims = []
    hero.classList.remove('is-done')
    const add = (el, frames, opts = {}) => {
      if (!el) return
      anims.push(el.animate(frames, { duration: D, fill: 'both', ...opts }))
    }
    const [left, right] = glasses
    add(left, glassFrames('left'))
    add(right, glassFrames('right'))
    // the defocused bar lies above the photo: it melts away as the rims meet
    add(blur, [
      { offset: 0, opacity: 1, transform: 'scale(1.06)', easing: OUT },
      { offset: at(1.24), opacity: 1, transform: 'scale(1)', easing: 'ease-in-out' },
      { offset: at(1.55), opacity: 0, transform: 'scale(1)' },
      { offset: 1, opacity: 0, transform: 'scale(1)' },
    ])
    // the photo comes into focus as the rims meet
    add(still, [
      { offset: 0, opacity: 0, filter: 'blur(10px)' },
      { offset: at(1.22), opacity: 0, filter: 'blur(10px)', easing: 'ease-out' },
      { offset: at(1.5), opacity: 1, filter: 'blur(1.5px)', easing: SOFT },
      { offset: at(1.9), opacity: 1, filter: 'blur(0px)' },
      { offset: 1, opacity: 1, filter: 'blur(0px)' },
    ])
    add(clink.querySelector('.clink__glow'), [
      { offset: 0, opacity: 0, transform: 'scale(.4)' },
      { offset: at(1.18), opacity: 0, transform: 'scale(.4)', easing: OUT },
      { offset: at(1.32), opacity: 1, transform: 'scale(1)', easing: SOFT },
      { offset: at(2.0), opacity: 0, transform: 'scale(1.3)' },
      { offset: 1, opacity: 0, transform: 'scale(1.3)' },
    ])
    clink.querySelectorAll('.clink__ring').forEach((ring, i) => {
      const t = 1.24 + i * 0.12
      add(ring, [
        { offset: 0, opacity: 0, transform: 'scale(.2)' },
        { offset: at(t), opacity: 0, transform: 'scale(.2)', easing: OUT },
        { offset: at(t + 0.06), opacity: 0.55 },
        { offset: at(t + 0.7), opacity: 0, transform: `scale(${2.2 - i * 0.5})` },
        { offset: 1, opacity: 0, transform: `scale(${2.2 - i * 0.5})` },
      ])
    })
    const unit = clink.parentElement.getBoundingClientRect().width / 1024
    bubbles(clink, unit).forEach(([b, frames]) => add(b, frames))

    const a = copy('a')
    const ta = base(a)
    add(a, [
      { offset: 0, opacity: 0, transform: `${ta} translateY(30px)`, filter: 'blur(8px)' },
      { offset: at(1.6), opacity: 0, transform: `${ta} translateY(30px)`, filter: 'blur(8px)', easing: OUT },
      { offset: at(2.2), opacity: 1, transform: `${ta} translateY(0)`, filter: 'blur(0px)' },
      { offset: 1, opacity: 1, transform: `${ta} translateY(0)`, filter: 'blur(0px)' },
    ])
    add(copy('b'), [
      { offset: 0, opacity: 0, clipPath: 'inset(-40% 104% -40% -6%)' },
      { offset: at(1.85), opacity: 0, clipPath: 'inset(-40% 104% -40% -6%)', easing: 'ease-out' },
      { offset: at(1.9), opacity: 1 },
      { offset: at(2.5), opacity: 1, clipPath: 'inset(-40% -6% -40% -6%)' },
      { offset: 1, opacity: 1, clipPath: 'inset(-40% -6% -40% -6%)' },
    ])
    add(copy('swoosh'), [
      { offset: 0, clipPath: 'inset(0 100% 0 0)' },
      { offset: at(2.25), clipPath: 'inset(0 100% 0 0)', easing: IN_OUT },
      { offset: at(2.7), clipPath: 'inset(0 0% 0 0)' },
      { offset: 1, clipPath: 'inset(0 0% 0 0)' },
    ])
    for (const [k, from, to] of [['sub', 2.05, 2.6], ['cta', 2.2, 2.8]]) {
      const el = copy(k)
      const t = base(el)
      add(el, [
        { offset: 0, opacity: 0, transform: `${t} translateY(14px)` },
        { offset: at(from), opacity: 0, transform: `${t} translateY(14px)`, easing: OUT },
        { offset: at(to), opacity: 1, transform: `${t} translateY(0)` },
        { offset: 1, opacity: 1, transform: `${t} translateY(0)` },
      ])
    }

    Promise.all(anims.map((x) => x.finished))
      .then(() => {
        hero.classList.add('is-done')
        pauseBtn.hidden = true
        // drop the fills so the page returns to its static, resizable CSS
        anims.forEach((x) => x.cancel())
      })
      .catch(() => {})
  }

  const play = () => {
    setPaused(false)
    pauseBtn.hidden = false
    build()
  }

  const showFinal = () => {
    anims.forEach((a) => a.cancel())
    anims = []
    controls.hidden = true
    hero.classList.add('is-done')
  }

  replayBtn.addEventListener('click', () => {
    if (reduced.matches) return
    play()
  })
  pauseBtn.addEventListener('click', () => {
    if (reduced.matches || hero.classList.contains('is-done')) return
    setPaused(!paused)
    anims.forEach((a) => (paused ? a.pause() : a.play()))
  })
  reduced.addEventListener?.('change', () => {
    if (reduced.matches) showFinal()
    else controls.hidden = !hero.classList.contains('is-ready')
  })

  // Only switch to the animated scene once the layers and the photo can paint;
  // on error the still stays (is-static). The head script has the same
  // fallback on a timer.
  const imgs = [...glasses, still.querySelector('img'), blur.querySelector('img')]
  Promise.all(imgs.map((img) => (img.decode ? img.decode() : Promise.resolve())))
    .then(() => {
      if (hero.classList.contains('is-static')) return
      // arriving on another section (#cave) or already scrolled: no toast behind the visitor's back
      const target = location.hash.length > 1 && document.getElementById(decodeURIComponent(location.hash.slice(1)))
      const skip = reduced.matches || window.scrollY > hero.offsetHeight * 0.5 || (target && target !== hero && !hero.contains(target))
      if (skip) {
        hero.classList.add('is-ready', 'is-done')
        controls.hidden = reduced.matches
        pauseBtn.hidden = true
        return
      }
      play() // animations exist before is-ready shows the scene: no flash
      hero.classList.add('is-ready')
      controls.hidden = false
    })
    .catch(() => {
      hero.classList.add('is-static')
      controls.hidden = true
    })

  return { play, pause: () => pauseBtn.click(), anims: () => anims }
}
