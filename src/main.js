import './styles/torn.generated.css'
import './styles/toast.generated.css'
import './styles/main.css'
import { initToast } from './js/toast.js'

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
const hero = document.querySelector('[data-hero]')

// test hook: window.__cabane.toast.anims() lists the running Web Animations
window.__cabane = { toast: initToast(hero) }

// ---------- header: compact once the page moves ----------
const header = document.querySelector('[data-header]')
const onScrollHeader = () => header.classList.toggle('is-compact', window.scrollY > 24)
onScrollHeader()

// ---------- mobile menu ----------
const toggle = document.querySelector('[data-menu-toggle]')
const menu = document.querySelector('[data-menu]')
const setMenu = (open) => {
  menu.hidden = !open
  toggle.setAttribute('aria-expanded', String(open))
  toggle.querySelector('.menu-toggle__label').textContent = open ? 'Fermer' : 'Menu'
  document.documentElement.classList.toggle('menu-open', open)
  if (open) menu.querySelector('a')?.focus()
}
toggle.addEventListener('click', () => setMenu(menu.hidden))
menu.addEventListener('click', (e) => {
  if (e.target.closest('a')) setMenu(false)
})
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !menu.hidden) {
    setMenu(false)
    toggle.focus()
  }
})
window.matchMedia('(min-width: 761px)').addEventListener?.('change', (m) => m.matches && setMenu(false))

// ---------- reveal: papers come in 18 px with a fade (MOTION.md) ----------
// The hidden state is keyed on .reveal-on, which is added here, right before
// observing; without this script (or IntersectionObserver) everything shows.
if ('IntersectionObserver' in window && !reduced.matches) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in')
          io.unobserve(e.target)
        }
      }
    },
    { threshold: 0.18, rootMargin: '0px 0px -6% 0px' },
  )
  document.documentElement.classList.add('reveal-on')
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el))
}

// ---------- current section in the nav ----------
const links = [...document.querySelectorAll('.nav a')]
if ('IntersectionObserver' in window) {
  const byId = new Map(links.map((a) => [a.hash.slice(1), a]))
  const spy = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) links.forEach((a) => a.classList.toggle('is-current', a === byId.get(e.target.id)))
      }
    },
    { rootMargin: '-45% 0px -50% 0px' },
  )
  ;['accueil', 'bar', 'cave', 'location', 'visite'].forEach((id) => {
    const el = document.getElementById(id)
    if (el) spy.observe(el)
  })
}

// ---------- parallax: hero layers and chapter photos (never locks the scroll) ----------
const room = hero?.querySelector('[data-room]')
const stage = hero?.querySelector('[data-stage]')
// the title and the motion controls drift together, so they never cross
const drifting = hero ? [hero.querySelector('.hero-copy'), hero.querySelector('[data-controls]')] : []
const photos = [...document.querySelectorAll('[data-parallax]')]
let ticking = false

const frame = () => {
  ticking = false
  onScrollHeader()
  if (reduced.matches) return
  const vh = window.innerHeight
  const y = window.scrollY
  if (hero && y < hero.offsetHeight * 1.2) {
    room.style.translate = `0 ${(y * 0.28).toFixed(1)}px`
    stage.style.translate = `0 ${(y * -0.1).toFixed(1)}px`
    for (const el of drifting) el.style.translate = `0 ${(y * 0.16).toFixed(1)}px`
  }
  for (const fig of photos) {
    const r = fig.getBoundingClientRect()
    if (r.bottom < -100 || r.top > vh + 100) continue
    const p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2) // -1 … 1
    fig.style.setProperty('--py', `${(p * -0.05 * r.height).toFixed(1)}px`)
  }
}
const requestFrame = () => {
  if (!ticking) {
    ticking = true
    requestAnimationFrame(frame)
  }
}
window.addEventListener('scroll', requestFrame, { passive: true })
window.addEventListener('resize', requestFrame)
frame()
