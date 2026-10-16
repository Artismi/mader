/**
 * Superfici CC0 di Poly Haven per le texture del motore (AS4): diffuse 1k in
 * public/asset-cache/texture, fuori da git. Elenco per materia in
 * src/components/studio/designer/asset/texture-cc0.json.
 *   npm run designer:texture
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const elenco = JSON.parse(fs.readFileSync(path.join(repo, 'src/components/studio/designer/asset/texture-cc0.json'), 'utf8'))
const dir = path.join(repo, 'public/asset-cache/texture')
fs.mkdirSync(dir, { recursive: true })
let n = 0
for (const [materia, ids] of Object.entries(elenco)) {
  if (materia.startsWith('_')) continue
  for (const id of ids) {
    const dest = path.join(dir, `${id}.jpg`)
    if (fs.existsSync(dest)) continue
    const r = await fetch(`https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/${id}/${id}_diff_1k.jpg`)
    if (!r.ok) { console.warn(`${id}: ${r.status}`); continue }
    fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()))
    n++
    console.log(`${materia}: ${id} (CC0, https://polyhaven.com/a/${id})`)
  }
}
console.log(`${n} texture scaricate in ${path.relative(process.cwd(), dir)}`)
