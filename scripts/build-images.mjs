// Encode every web image into public/img/ (AVIF + WebP, a few widths).
// Inputs: assets-src/board (npm run board), assets-src/photos (npm run photos)
// and the kit's logo. File names carry a version because /img is served with
// an immutable cache: bump V when a source changes.
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'public', 'img')
const V = 'v3'

const jobs = [
  // desktop = the approved board, rebuilt (board-plates.py)
  { src: 'assets-src/board/hero-still.png', name: 'hero-still', widths: [2528, 1700, 1100], q: 60 },
  { src: 'assets-src/board/hero-blur.png', name: 'hero-blur', widths: [1264, 640], q: 50 },
  { src: 'assets-src/board/left.png', name: 'glass-left', widths: [1188, 640], q: 70, alpha: true },
  { src: 'assets-src/board/right.png', name: 'glass-right', widths: [1153, 620], q: 70, alpha: true },
  { src: 'assets-src/board/s1.png', name: 'board-s1', widths: [2048, 1400], q: 60 },
  { src: 'assets-src/board/s2.png', name: 'board-s2', widths: [2048, 1400], q: 60 },
  { src: 'assets-src/board/s3.png', name: 'board-s3', widths: [2048, 1400], q: 60 },
  { src: 'assets-src/board/strip.png', name: 'board-strip', widths: [2048, 1200], q: 60 },
  // phones: the venue's own photos (prepare-photos.py)
  { src: 'assets-src/photos/salle.png', name: 'salle', widths: [1200, 760], q: 60 },
  { src: 'assets-src/photos/cave.png', name: 'cave', widths: [1000, 640], q: 60 },
  { src: 'assets-src/photos/comptoir.png', name: 'comptoir', widths: [1000, 640], q: 60 },
  { src: 'assets-src/photos/facade.png', name: 'facade', widths: [1200, 720], q: 62 },
  // brand
  { src: '01-identidade/logo-transparente.png', name: 'logo', widths: [400, 200], q: 80, alpha: true },
]

await rm(OUT, { recursive: true, force: true })
await mkdir(OUT, { recursive: true })
const manifest = {}

for (const job of jobs) {
  const input = path.join(ROOT, job.src)
  const meta = await sharp(input).metadata()
  manifest[job.name] = { width: meta.width, height: meta.height, files: [] }
  for (const w of job.widths) {
    const width = Math.min(w, meta.width)
    const base = sharp(input).resize({ width, withoutEnlargement: true })
    const stem = `${job.name}-${V}-${width}`
    await base.clone().avif({ quality: job.q - 12, effort: 6 }).toFile(path.join(OUT, `${stem}.avif`))
    await base
      .clone()
      .webp({ quality: job.q + 10, alphaQuality: job.alpha ? 90 : 100, effort: 6, smartSubsample: true })
      .toFile(path.join(OUT, `${stem}.webp`))
    manifest[job.name].files.push(width)
  }
  console.log(job.name, `${meta.width}x${meta.height}`, manifest[job.name].files.join(', '))
}

// favicons and touch icon from the logo, on the graphite brand colour
const logo = path.join(ROOT, '01-identidade/logo-transparente.png')
const pub = path.join(ROOT, 'public')
for (const [file, size, pad] of [['favicon-32.png', 32, 1], ['favicon-192.png', 192, 10], ['apple-touch-icon.png', 180, 14]]) {
  const inner = size - pad * 2
  const mark = await sharp(logo).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: file === 'favicon-32.png' ? { r: 0, g: 0, b: 0, alpha: 0 } : '#191918' } })
    .composite([{ input: mark, gravity: 'center' }])
    .png()
    .toFile(path.join(pub, file))
}

await writeFile(path.join(ROOT, 'src', 'data', 'images.json'), JSON.stringify({ version: V, images: manifest }, null, 2) + '\n')
console.log('wrote', (await readdir(OUT)).length, 'files to public/img, favicons and src/data/images.json')
