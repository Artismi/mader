// Genera public/biblioteca/index.json dai .md e .txt di una cartella.
// Uso: node scripts/biblioteca.mjs <cartella>   (es. le research_notes di stateyour)
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, relative, basename } from 'node:path'

const src = process.argv[2]
if (!src) { console.error('indica una cartella'); process.exit(1) }
const out = []
const walk = d => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(md|txt)$/i.test(f)) out.push({ name: relative(src, p).replace(/\\/g, '/'), text: readFileSync(p, 'utf8') }) } }
walk(src)
mkdirSync('public/biblioteca', { recursive: true })
writeFileSync('public/biblioteca/index.json', JSON.stringify(out))
console.log(`${out.length} testi in public/biblioteca/index.json (${basename(src)})`)
