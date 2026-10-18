// Controlla il pacchetto in dist/: nell'app.asar e nel server (resources/server)
// non devono esserci chiavi, dati dei clienti o cartelle di lavoro.
// Uso: node scripts/verifica-pacchetto.mjs [cartella resources]
import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const asar = require('@electron/asar')

const resources = process.argv[2]
  || ['win-unpacked', 'linux-unpacked', 'mac/Creative OS.app/Contents', 'mac-arm64/Creative OS.app/Contents']
    .map((d) => path.join(root, 'dist', d, 'resources'))
    .find((d) => fs.existsSync(d))
if (!resources || !fs.existsSync(resources)) {
  console.error('[verifica] nessuna cartella resources in dist/: esegui prima `npm run build:electron`')
  process.exit(1)
}

const CARTELLE = ['data', 'data-prova', '.claude', 'scratch', 'vault', 'graphify-out', 'crew', 'asset-cache']
const vietato = (rel) => {
  const parts = rel.split('/').filter(Boolean)
  const name = parts[parts.length - 1] ?? ''
  const fuoriDaNodeModules = !parts.includes('node_modules')
  if (name.startsWith('.env') || name.endsWith('.zip') || /\.db(-wal|-shm)?$/.test(name)) return true
  // cartelle del progetto in radice (o in public/): .next/server/app/api/crew è una route
  if (fuoriDaNodeModules && (CARTELLE.includes(parts[0]) || (parts[0] === 'public' && CARTELLE.includes(parts[1])))) return true
  if (/(^|\/)public\/(fonts\/pack|.*\/ds-[^/]*)(\/|$)/.test(rel)) return true
  return false
}

const trovati = []
const asarFile = path.join(resources, 'app.asar')
const voci = asar.listPackage(asarFile).map((f) => f.split(path.sep).join('/'))
for (const f of voci) if (vietato(f)) trovati.push(`app.asar${f}`)

let nServer = 0
function scan(dir, rel) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const r = `${rel}/${e.name}`
    nServer++
    if (vietato(r)) trovati.push(`server${r}`)
    if (e.isDirectory()) scan(path.join(dir, e.name), r)
  }
}
const serverDir = path.join(resources, 'server')
if (!fs.existsSync(path.join(serverDir, 'server.js'))) trovati.push('server/server.js MANCANTE')
if (!fs.existsSync(path.join(serverDir, 'node_modules', 'next', 'package.json'))) trovati.push('server/node_modules/next MANCANTE')
else scan(serverDir, '')

console.log(`[verifica] app.asar: ${voci.length} voci; server: ${nServer} voci`)
if (trovati.length) {
  console.error('[verifica] PROBLEMI NEL PACCHETTO:\n  ' + trovati.slice(0, 50).join('\n  '))
  process.exit(1)
}
console.log('[verifica] ok: niente .env, data/, data-prova/, .claude/, scratch/, vault/, graphify-out/, zip né asset non verificati')
