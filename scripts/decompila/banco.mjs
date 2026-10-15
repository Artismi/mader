#!/usr/bin/env node
/**
 * Banco del decompilatore: 10 grafiche generate dal motore (la verità è nota)
 * → immagine → decompila → scena. Misura testo, carattere, corpo, posizione,
 * fedeltà e tempi; scrive rapporto.md, rapporto.json e i confronti in
 * scripts/decompila/out/.
 *
 *   npm run decompila:banco
 *   npm run decompila:banco -- --casi caffe-q,mostra-o
 *   npm run decompila:banco -- --esplora        solo le grafiche di prova
 *   npm run decompila:banco -- --cache          riusa le letture del modello già salvate
 *
 * Dipendenze: quelle del banco del motore (cd scripts/designer && npm install)
 * e GEMINI_API_KEY in .env.local (o nell'ambiente).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { valuta, rapporto } from './valuta.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(here, '../..')
const designer = path.join(repo, 'scripts/designer')
const require = createRequire(path.join(designer, 'package.json'))

let esbuild, chromium
try {
  esbuild = require('esbuild')
  ;({ chromium } = require('playwright-core'))
} catch {
  console.error('Mancano le dipendenze del banco: cd scripts/designer && npm install')
  process.exit(1)
}

/* ── argomenti e chiave ────────────────────────────────────────────────── */
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : 'true'])
  return acc
}, []))
// nei worktree .env.local sta nella cartella principale del progetto
const env = {}
for (const p of [path.join(repo, '.env.local'), path.resolve(repo, '../../../.env.local')]) {
  if (!fs.existsSync(p)) continue
  for (const l of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^([A-Z_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  break
}
const KEY = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || env.GOOGLE_GENERATIVE_AI_API_KEY
if (!KEY && !args.esplora) { console.error('Serve GEMINI_API_KEY (in .env.local o nell\'ambiente)'); process.exit(1) }
if (env.DECOMPILA_MODELLO && !process.env.DECOMPILA_MODELLO) process.env.DECOMPILA_MODELLO = env.DECOMPILA_MODELLO

const CONTENUTI = JSON.parse(fs.readFileSync(path.join(designer, 'fixtures/contenuti.json'), 'utf8'))
const CASI = JSON.parse(fs.readFileSync(path.join(here, 'casi.json'), 'utf8'))
const scelti = args.casi ? CASI.filter(c => args.casi.split(',').includes(c.nome)) : CASI
const out = path.resolve(args.out ?? path.join(here, 'out'))
fs.mkdirSync(out, { recursive: true })

/* ── pagina e lettore ──────────────────────────────────────────────────── */
const alias = { '@': path.join(repo, 'src'), fabric: path.join(designer, 'node_modules/fabric') }
const nodePaths = [path.join(designer, 'node_modules'), path.join(repo, 'node_modules')]
await esbuild.build({
  entryPoints: [path.join(here, 'entry.ts')], bundle: true, outfile: path.join(out, 'bundle.js'), format: 'iife', platform: 'browser',
  logLevel: 'error', define: { 'process.env.NODE_ENV': '"production"' }, alias, nodePaths,
})
await esbuild.build({
  entryPoints: [path.join(here, 'lettore.ts')], bundle: true, outfile: path.join(out, 'lettore.mjs'), format: 'esm', platform: 'node',
  logLevel: 'error', alias, nodePaths, packages: 'external',
})
fs.writeFileSync(path.join(out, 'index.html'), '<!doctype html><html><head><meta charset="utf-8"></head><body><script src="bundle.js"></script></body></html>')
const leggi = KEY ? (await import(pathToFileURL(path.join(out, 'lettore.mjs')).href)).lettore(KEY) : null

const exe = process.env.DESIGNER_CHROME ?? ['/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell'].find(p => fs.existsSync(p))
const browser = await chromium.launch({
  ...(exe ? { executablePath: exe } : { channel: 'chrome' }),
  args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
  ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'designer.local' } } : {}),
})
const page = await browser.newPage({ ignoreHTTPSErrors: true })
page.setDefaultTimeout(0)
page.on('pageerror', e => console.log('[errore pagina]', e.message))
if (args.log) page.on('console', m => console.log('[pagina]', m.text()))
let letture = [], casoCorrente = ''
// --cache: rilegge le letture già fatte (per affinare senza consumare quota); il banco vero le rifà
await page.exposeFunction('__leggi', async png => {
  const file = path.join(out, `lettura-${casoCorrente}.json`)
  if (args.cache && fs.existsSync(file)) { letture.push({ label: 'cache', ms: 0 }); return fs.readFileSync(file, 'utf8') }
  const t0 = Date.now()
  const { lettura, label } = await leggi(png)
  letture.push({ label, ms: Date.now() - t0 })
  fs.writeFileSync(file, JSON.stringify(lettura))
  return JSON.stringify(lettura)
})
const TYPES = { '.js': 'application/javascript', '.mjs': 'application/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.html': 'text/html', '.json': 'application/json', '.wasm': 'application/wasm', '.onnx': 'application/octet-stream' }
const serve = (route, file) => fs.existsSync(file)
  ? route.fulfill({ body: fs.readFileSync(file), contentType: TYPES[path.extname(file)] ?? 'application/octet-stream', headers: { 'Access-Control-Allow-Origin': '*' } })
  : route.fulfill({ status: 404, body: '' })
await page.route('http://designer.local/**', async route => {
  const u = new URL(route.request().url())
  if (u.pathname === '/api/proxy-image') {
    const target = new URL(u.searchParams.get('url'))
    if (target.host === 'designer.local') return serve(route, path.join(designer, target.pathname))
    const r = await route.fetch({ url: target.href })
    return route.fulfill({ response: r, headers: { 'Access-Control-Allow-Origin': '*' } })
  }
  if (u.pathname.startsWith('/fixtures/')) return serve(route, path.join(designer, u.pathname))
  // scontorno: runtime ONNX e modello U²-Net da node_modules (nello Studio li copia scripts/copy-vendor.mjs)
  if (u.pathname === '/models/u2netp.onnx') return serve(route, path.join(repo, 'node_modules/@rmbg/model-u2netp/u2netp.onnx'))
  if (u.pathname.startsWith('/vendor/ort/')) return serve(route, path.join(repo, 'node_modules/onnxruntime-web/dist', path.basename(u.pathname)))
  return serve(route, path.join(out, u.pathname === '/' ? 'index.html' : u.pathname))
})
await page.goto('http://designer.local/')

const salva = (nome, url) => fs.writeFileSync(path.join(out, nome), Buffer.from(url.split(',')[1], 'base64'))
const corta = (k, v) => (typeof v === 'string' && v.length > 300 ? v.slice(0, 60) + '…' : v)
const job = c => {
  const fx = CONTENUTI[c.contenuto]
  return { nome: c.nome, content: fx.c, format: c.formato, photo: fx.foto ? `http://designer.local/fixtures/${fx.foto}` : undefined, sistema: c.sistema, seme: c.seme }
}

/* ── giro ──────────────────────────────────────────────────────────────── */
const risultati = []
if (args.taratura) { let k = 0; for (const l of await page.evaluate(() => window.banco.taratura())) { if (l.startsWith('IMG ')) fs.writeFileSync(path.join(out, `taratura-${k++}.png`), Buffer.from(l.slice(4).split(',')[1], 'base64')); else console.log(l) }; await browser.close(); process.exit(0) }

for (const c of scelti) {
  const g = await page.evaluate(j => window.banco.genera(j), job(c))
  if (!g) { console.log(c.nome, 'il motore non ha prodotto una scena'); continue }
  salva(`${c.nome}-vero.png`, g.png)
  fs.writeFileSync(path.join(out, `${c.nome}-vero.json`), JSON.stringify(g.scena, corta, 1))
  if (args.esplora) {
    console.log(c.nome.padEnd(14), g.sistema.padEnd(14), g.scena.els.map(e => e.kind + (e.kind === 'text' ? `(${e.font.family} ${e.font.weight}${e.angle ? ' ruotato' : ''}${e.deco ? ' deco' : ''}${e.chars ? ' chars' : ''})` : '')).join(' '))
    continue
  }
  letture = []; casoCorrente = c.nome
  const t0 = Date.now()
  let r
  try { r = await page.evaluate(png => window.banco.prova(png), g.png) } catch (e) { console.log(c.nome, 'errore:', e.message.slice(0, 300)); risultati.push({ caso: c.nome, errore: e.message }); continue }
  const ms = Date.now() - t0
  salva(`${c.nome}-ricostruita.png`, r.png)
  fs.writeFileSync(path.join(out, `${c.nome}-ricostruita.json`), JSON.stringify(r.scena, corta, 1))
  const confronto = await page.evaluate(o => window.banco.affianca(o), { a: g.png, b: r.png, titolo: `${c.nome} · fedeltà ${(r.fedelta * 100).toFixed(1)}%` })
  salva(`${c.nome}-confronto.jpg`, confronto)
  const v = await valuta({ caso: c.nome, sistema: g.sistema, vero: g.scena, r, ms, letture, page })
  risultati.push(v)
  console.log(`${c.nome.padEnd(14)} fedeltà ${(v.fedelta * 100).toFixed(1)}%  testo ${v.testoOk}/${v.testiVeri}  carattere ${v.carattereOk}/${v.abbinati}  corpo ±${v.erroreCorpo.toFixed(1)}%  pos ±${v.errorePos.toFixed(1)} px  ${(ms / 1000).toFixed(1)} s  ${v.riuscito ? 'RIUSCITO' : 'no'}`)
}
await browser.close()
if (!args.esplora) {
  const { md, json } = rapporto(risultati)
  fs.writeFileSync(path.join(out, 'rapporto.json'), JSON.stringify(json, null, 2))
  fs.writeFileSync(path.join(out, 'rapporto.md'), md)
  console.log(`\n${json.riusciti}/${json.casi} casi riusciti · rapporto in ${path.relative(process.cwd(), out)}`)
}
