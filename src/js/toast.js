// The toast (06-roteiros/MOTION.md, 07-integracao/timeline.json), 2.8 s, finite:
// 0–1.25 s   the two hands come in from the sides over the real room, which
//            racks from soft to deep focus;
// 1.25–1.65  the rims meet: a short rebound, a warm flash, rings and bubbles;
// 1.65–2.8   the pose settles and the title appears.
// Every piece is one Web Animation of the same 2.8 s length, so pause, resume
// and replay act on the whole scene at once. Reduced motion: final pose only.

const D = 2800
const OUT = 'cubic-bezier(.16,1,.3,1)'
const SOFT = 'cubic-bezier(.33,0,.2,1)'
const IN_OUT = 'cubic-bezier(.65,0,.35,1)'
const at = (s) => s / (D / 1000) // seconds → keyframe offset

function glassFrames(side) {
  const k = side === 'left' ? 1 : -1
  return [
    { offset: 0, opacity: 0, transform: `translate(${-34 * k}%, 16%) rotate(${-12 * k}deg)`, easing: SOFT },
    { offset: at(0.3), opacity: 1 },
    { offset: at(1.12), transform: `translate(${1.4 * k}%, -0.8%) rotate(${1.8 * k}deg)`, easing: 'ease-out' },
    { offset: at(1.25), transform: `translate(${0.5 * k}%, -0.2%) rotate(${0.6 * k}deg)`, easing: IN_OUT },
    { offset: at(1.43), transform: `translate(${-0.7 * k}%, 0.3%) rotate(${-0.5 * k}deg)`, easing: IN_OUT },
    { offset: at(1.65), transform: 'translate(0%, 0%) rotate(0deg)' },
    { offset: 1, opacity: 1, transform: 'translate(0%, 0%) rotate(0deg)' },
  ]
}

const rise = (from, to, dy = 22) => [
  { offset: 0, opacity: 0, transform: `translateY(${dy}px)` },
  { offset: at(from), opacity: 0, transform: `translateY(${dy}px)`, easing: OUT },
  { offset: at(to), opacity: 1, transform: 'translateY(0)' },
  { offset: 1, opacity: 1, transform: 'translateY(0)' },
]

function bubbles(clink, stageWidth) {
  clink.querySelectorAll('.bubble').forEach((b) => b.remove())
  const list = []
  const n = 18
  for (let i = 0; i < n; i++) {
    const b = document.createElement('span')
    b.className = 'bubble'
    const size = 6 + Math.random() * 11
    b.style.setProperty('--s', `${size.toFixed(1)}px`)
    clink.append(b)
    // fan out upwards and to the sides, a few drift down
    const ang = (-170 + (i / (n - 1)) * 160 + (Math.random() - 0.5) * 18) * (Math.PI / 180)
    const r = stageWidth * (0.035 + Math.random() * 0.075)
    const dx = Math.cos(ang) * r
    const dy = Math.sin(ang) * r - stageWidth * 0.015 * Math.random()
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
  const soft = q('[data-room-soft]')
  const room = q('[data-room]')
  const stage = q('[data-stage]')
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

  const build = () => {
    anims.forEach((a) => a.cancel())
    anims = []
    const add = (el, frames, opts = {}) => {
      if (!el) return
      anims.push(el.animate(frames, { duration: D, fill: 'both', ...opts }))
    }
    const [left, right] = glasses
    add(left, glassFrames('left'))
    add(right, glassFrames('right'))
    // rack focus: the sharp room fades out as the glasses arrive
    add(soft, [
      { offset: 0, opacity: 1 },
      { offset: at(0.25), opacity: 1, easing: IN_OUT },
      { offset: at(1.3), opacity: 0 },
      { offset: 1, opacity: 0 },
    ])
    add(room, [
      { offset: 0, transform: 'scale(1.07)', easing: OUT },
      { offset: 1, transform: 'scale(1)' },
    ])
    // the clink
    add(clink.querySelector('.clink__glow'), [
      { offset: 0, opacity: 0, transform: 'scale(.4)' },
      { offset: at(1.2), opacity: 0, transform: 'scale(.4)', easing: OUT },
      { offset: at(1.32), opacity: 0.9, transform: 'scale(1)', easing: SOFT },
      { offset: at(2.1), opacity: 0, transform: 'scale(1.25)' },
      { offset: 1, opacity: 0, transform: 'scale(1.25)' },
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
    bubbles(clink, stage.getBoundingClientRect().width).forEach(([b, frames]) => add(b, frames))
    // the title
    add(copy('a'), [
      { offset: 0, opacity: 0, transform: 'translateY(30px)', filter: 'blur(8px)' },
      { offset: at(1.6), opacity: 0, transform: 'translateY(30px)', filter: 'blur(8px)', easing: OUT },
      { offset: at(2.2), opacity: 1, transform: 'translateY(0)', filter: 'blur(0px)' },
      { offset: 1, opacity: 1, transform: 'translateY(0)', filter: 'blur(0px)' },
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
    add(copy('sub'), rise(2.05, 2.6, 14))
    add(copy('cta'), rise(2.2, 2.8, 14))

    Promise.all(anims.map((a) => a.finished))
      .then(() => {
        hero.classList.add('is-done')
        pauseBtn.hidden = true
      })
      .catch(() => {})
  }

  const play = () => {
    setPaused(false)
    hero.classList.remove('is-done')
    pauseBtn.hidden = false
    build()
  }

  const showFinal = () => {
    anims.forEach((a) => a.finish())
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

  // Only switch to the animated scene once both layers can paint; on error the
  // still stays (is-static). The inline head script has the same fallback on a timer.
  Promise.all(glasses.map((img) => (img.decode ? img.decode() : Promise.resolve())))
    .then(() => {
      if (hero.classList.contains('is-static')) return
      // arriving on another section (#cave) or already scrolled: no toast behind the visitor's back
      const target = location.hash.length > 1 && document.getElementById(decodeURIComponent(location.hash.slice(1)))
      const scrolledPast = window.scrollY > hero.offsetHeight * 0.5 || (target && !hero.contains(target) && target !== hero)
      if (reduced.matches || scrolledPast) {
        hero.classList.add('is-ready', 'is-done')
        controls.hidden = reduced.matches
        pauseBtn.hidden = true
        return
      }
      play() // animations exist before is-ready shows the copy: no flash
      hero.classList.add('is-ready')
      controls.hidden = false
    })
    .catch(() => {
      hero.classList.add('is-static')
      controls.hidden = true
    })

  return { play, pause: () => pauseBtn.click(), anims: () => anims }
}
