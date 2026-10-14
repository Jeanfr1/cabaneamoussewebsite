// Business facts, in one place. Rendered into index.html at build time by the
// plugin in vite.config.js ({{key}} placeholders), so the page works without JS.
// Source: 07-integracao/conteudo-fr.json of the V4 kit. Hours, prices, phone
// and hire conditions are deliberately absent: the kit marks them unverified.
// TODO(cabane): phone, email, hours, hire conditions, Google place link (cid)
// once the owner confirms them.

export const site = {
  name: 'La Cabane à Mousse',
  tagline: 'Cave · Bar · Location de tireuses',
  street: '21 avenue de la Monneraye',
  postcode: '44410',
  city: 'Herbignac',
  region: 'Loire-Atlantique',
  map: 'https://www.google.com/maps/search/?api=1&query=La+Cabane+a+Mousse+21+avenue+de+la+Monneraye+Herbignac',
  // TODO(cabane): final domain → canonical, og:url, sitemap; then drop noindex
  url: 'https://cabane-a-mousse-herbignac.vercel.app',
  year: new Date().getFullYear(),
}
