/**
 * Foto in più per i contenuti della vetrina (fixtures/foto.json: CC0 da StockSnap via
 * Openverse, con autore e pagina). Si scaricano in fixtures/foto/, fuori da git.
 *   npm run designer:foto
 * La vetrina le usa a rotazione accanto alla foto principale del contenuto.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const dir = path.join(here, 'fixtures/foto')
const elenco = JSON.parse(fs.readFileSync(path.join(here, 'fixtures/foto.json'), 'utf8'))

/** Le foto scaricate per una foto principale (solo i file presenti). */
export function altreFoto(principale) {
  return (elenco[principale] ?? []).map(f => f.file).filter(f => fs.existsSync(path.join(dir, f)))
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fs.mkdirSync(dir, { recursive: true })
  let nuove = 0
  for (const f of Object.values(elenco).flat()) {
    const dest = path.join(dir, f.file)
    if (fs.existsSync(dest)) continue
    const r = await fetch(f.url, { headers: { 'User-Agent': 'creative-os-vetrina/1.0' } })
    if (!r.ok) { console.warn(`${f.file}: ${r.status}`); continue }
    fs.writeFileSync(dest, Buffer.from(await r.arrayBuffer()))
    nuove++
    console.log(`${f.file}  ${f.licenza} · ${f.autore} · ${f.pagina}`)
  }
  console.log(`${nuove} foto scaricate in ${path.relative(process.cwd(), dir)}`)
}
