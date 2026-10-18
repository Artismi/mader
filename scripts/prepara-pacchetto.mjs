// Prepara .next/standalone per electron-builder (dopo `next build`).
// Il server autonomo di Next non contiene .next/static né public: li copiamo
// dentro, lasciando fuori la cache degli asset e le cartelle con licenza non
// verificata. Poi togliamo tutto ciò che non deve mai finire nell'installer
// (chiavi, dati dei clienti, cartelle di lavoro) se il tracciamento lo ha incluso.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const standalone = path.join(root, '.next', 'standalone')

if (!fs.existsSync(path.join(standalone, 'server.js'))) {
  console.error('[pacchetto] manca .next/standalone/server.js: esegui prima `next build` con output standalone')
  process.exit(1)
}

// Percorsi di public/ (relativi, con "/") da non ridistribuire
const PUBLIC_ESCLUSI = [
  /^asset-cache(\/|$)/, // cache locale scaricata dagli script (fuori da git)
  /^library(\/|$)/, // libreria locale dell'utente
  /^fonts\/pack(\/|$)/, // caratteri con licenza non verificata
  /(^|\/)ds-[^/]*(\/|$)/, // pack "design syndrome": licenza non verificata
]

// Nomi che non devono mai stare nel pacchetto (fuori da node_modules)
const VIETATI = new Set(['data', 'data-prova', '.claude', 'scratch', 'vault', 'graphify-out', 'crew', 'supabase'])
const vietato = (name) => name.startsWith('.env') || name.endsWith('.zip') || name.endsWith('.db')
  || name.endsWith('.db-wal') || name.endsWith('.db-shm')

function copyDir(src, dst, filter = () => true, rel = '') {
  fs.mkdirSync(dst, { recursive: true })
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name
    if (!filter(r)) continue
    const s = path.join(src, e.name), d = path.join(dst, e.name)
    if (e.isDirectory()) copyDir(s, d, filter, r)
    else fs.copyFileSync(s, d)
  }
}

// 1. static e public dentro lo standalone
fs.rmSync(path.join(standalone, '.next', 'static'), { recursive: true, force: true })
copyDir(path.join(root, '.next', 'static'), path.join(standalone, '.next', 'static'))
fs.rmSync(path.join(standalone, 'public'), { recursive: true, force: true })
copyDir(path.join(root, 'public'), path.join(standalone, 'public'),
  (r) => !PUBLIC_ESCLUSI.some((re) => re.test(r)) && !vietato(path.basename(r)))

// 2. pulizia fuori da node_modules (lì "data" è spesso una cartella legittima)
const tolti = []
function pulisci(dir, rel = '') {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name
    const p = path.join(dir, e.name)
    if ((e.isDirectory() && VIETATI.has(e.name)) || vietato(e.name)) {
      fs.rmSync(p, { recursive: true, force: true })
      tolti.push(r)
    } else if (e.isDirectory() && e.name !== 'node_modules' && r !== '.next/static' && r !== 'public') {
      pulisci(p, r)
    }
  }
}
pulisci(standalone)
if (tolti.length) console.log('[pacchetto] tolti dallo standalone:', tolti.join(', '))
console.log('[pacchetto] standalone pronto')

// 3. cartella dell'app per electron-builder: solo electron/ e un package.json
//    senza dipendenze (il server ha già le sue in resources/server/node_modules)
const appDir = path.join(root, '.pacchetto', 'app')
fs.rmSync(appDir, { recursive: true, force: true })
copyDir(path.join(root, 'electron'), path.join(appDir, 'electron'))
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify({
  name: pkg.name,
  productName: pkg.build?.productName,
  version: pkg.version,
  description: 'Creative OS',
  author: 'Artismi',
  main: 'electron/main.js',
}, null, 2))
console.log('[pacchetto] app pronta in .pacchetto/app')
