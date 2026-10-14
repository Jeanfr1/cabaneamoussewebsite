import { defineConfig } from 'vite'
import { site } from './src/data/site.js'

// Fill {{key}} placeholders in index.html from src/data/site.js and drop HTML
// comments (they hold notes for the team, not for visitors).
function siteData() {
  return {
    name: 'site-data',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html
          .replace(/<!--(?!\s*\[if)[\s\S]*?-->/g, '')
          .replace(/\{\{(\w+)\}\}/g, (m, key) => {
            if (!(key in site)) throw new Error(`index.html: unknown placeholder ${m}`)
            return String(site[key])
          })
      },
    },
  }
}

export default defineConfig({
  plugins: [siteData()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
  },
  server: { port: 5196 },
  preview: { port: 4196 },
})
