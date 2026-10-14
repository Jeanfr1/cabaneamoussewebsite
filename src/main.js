import './styles/scene.generated.css'
import './styles/main.css'
import { initToast } from './js/toast.js'

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
const hero = document.querySelector('[data-hero]')

// test hook: window.__cabane.toast.anims() lists the running Web Animations
window.__cabane = { toast: initToast(hero) }

// ---------- compact bar: on desktop it appears once the board's hero header has scrolled away ----------
const topbar = document.querySelector('[data-topbar]')
const onScroll = () => topbar.classList.toggle('is-shown', window.scrollY > hero.offsetHeight * 0.55)
window.addEventListener('scroll', onScroll, { passive: true })
window.addEventListener('resize', onScroll)
onScroll()

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
window.matchMedia('(min-width: 900px)').addEventListener?.('change', (m) => m.matches && setMenu(false))

// ---------- reveal (visit section) ----------
// The hidden state is keyed on .reveal-on, added here right before observing;
// without this script (or IntersectionObserver) everything shows.
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

// ---------- current section in the compact bar ----------
const links = [...document.querySelectorAll('.topbar__nav a')]
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
