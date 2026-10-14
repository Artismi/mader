#!/usr/bin/env node
/**
 * Tavole di Creative OS per il banco di confronto: per ogni brief la migliore
 * tavola del motore designer, in PNG, in out/creative-os/<id>.png, con i
 * metadati in out/creative-os/tavole.json.
 *
 *   npm run confronto:genera                       i 20 brief con i contenuti già compilati
 *   npm run confronto:genera -- --regia            testi e direzioni dalla regia dell'IA (serve l'app avviata: npm run dev)
 *   npm run confronto:genera -- --solo 01-caffe,03-techno
 *   npm run confronto:genera -- --finto            anche il concorrente finto di prova (out/prova-finta/)
 *
 * Prima volta: cd scripts/designer && npm install (esbuild, fabric, playwright-core).
 * Browser: DESIGNER_CHROME=/percorso/chrome, altrimenti Chrome installato.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { QUI, REPO, OUT, NOSTRO, FORMATI, caricaBrief } from './lib.mjs'

const DESIGNER = path.join(REPO, 'scripts/designer')
const require = createRequire(path.join(DESIGNER, 'package.json'))
let esbuild, chromium
try {
  esbuild = require('esbuild')
  ;({ chromium } = require('playwright-core'))
} catch {
  console.error('Mancano le dipendenze del banco di prova: cd scripts/designer && npm install')
  process.exit(1)
}

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : 'true'])
  return acc
}, []))
const CONTENUTI = JSON.parse(fs.readFileSync(path.join(DESIGNER, 'fixtures/contenuti.json'), 'utf8'))
const solo = args.solo ? new Set(args.solo.split(',')) : null
const brief = caricaBrief().filter(b => !solo || solo.has(b.id))
const APP = args.app ?? process.env.CONFRONTO_APP ?? 'http://127.0.0.1:3000'
const dir = path.join(OUT, NOSTRO), cache = path.join(dir, 'regia'), lavoro = path.join(OUT, '_pagina')
fs.mkdirSync(dir, { recursive: true }); fs.mkdirSync(lavoro, { recursive: true })

/* ── pagina ────────────────────────────────────────────────────────────── */
await esbuild.build({
  entryPoints: [path.join(QUI, 'entry.ts')], bundle: true, outfile: path.join(lavoro, 'bundle.js'), format: 'iife', platform: 'browser',
  logLevel: 'error', define: { 'process.env.NODE_ENV': '"production"' },
  alias: { '@': path.join(REPO, 'src'), fabric: path.join(DESIGNER, 'node_modules/fabric') },
  nodePaths: [path.join(DESIGNER, 'node_modules'), path.join(REPO, 'node_modules')],
})
fs.writeFileSync(path.join(lavoro, 'index.html'), '<!doctype html><html><head><meta charset="utf-8"></head><body><script src="bundle.js"></script></body></html>')

const exe = process.env.DESIGNER_CHROME
const browser = await chromium.launch({
  ...(exe ? { executablePath: exe } : { channel: 'chrome' }),
  args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
  ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'designer.local' } } : {}),
})
const page = await browser.newPage({ ignoreHTTPSErrors: true })
page.on('pageerror', e => console.log('[errore pagina]', e.message))
const TYPES = { '.js': 'application/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.html': 'text/html' }
const serve = (route, file) => fs.existsSync(file)
  ? route.fulfill({ body: fs.readFileSync(file), contentType: TYPES[path.extname(file)] ?? 'application/octet-stream', headers: { 'Access-Control-Allow-Origin': '*' } })
  : route.fulfill({ status: 404, body: '' })
await page.route('http://designer.local/**', async route => {
  const u = new URL(route.request().url())
  if (u.pathname === '/api/proxy-image') {
    const target = new URL(u.searchParams.get('url'))
    if (target.host === 'designer.local') return serve(route, path.join(DESIGNER, target.pathname))
    const r = await route.fetch({ url: target.href })
    return route.fulfill({ response: r, headers: { 'Access-Control-Allow-Origin': '*' } })
  }
  if (u.pathname.startsWith('/fixtures/')) return serve(route, path.join(DESIGNER, u.pathname))
  return serve(route, path.join(lavoro, u.pathname === '/' ? 'index.html' : u.pathname))
})
await page.goto('http://designer.local/')

/* ── regia (facoltativa) ───────────────────────────────────────────────── */
/** Testi e direzioni dalla regia dell'app; in cache per non rifare le chiamate. Null se l'app non risponde. */
async function regia(b) {
  const f = path.join(cache, `${b.id}.json`)
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'))
  try {
    const r = await fetch(`${APP}/api/ai/design-direct`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief: `${b.brief}\n\n${b.fatti.join('\n')}`, slides: 1, haFoto: !!b.foto }),
      signal: AbortSignal.timeout(180_000),
    })
    const j = await r.json()
    if (!r.ok || j.error) throw new Error(j.error ?? `errore ${r.status}`)
    fs.mkdirSync(cache, { recursive: true })
    fs.writeFileSync(f, JSON.stringify(j, null, 2))
    return j
  } catch (e) {
    console.warn(`  regia non disponibile per ${b.id} (${e.message}): uso i contenuti compilati`)
    return null
  }
}

/* ── giro ──────────────────────────────────────────────────────────────── */
const metaFile = path.join(dir, 'tavole.json')
const meta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, 'utf8')) : {}
const finti = path.join(OUT, 'prova-finta')
const COLORI = ['#2f4f6f', '#6b2f2f', '#2f5f3f', '#4f3f6f', '#1f1f1f']
for (const [i, b] of brief.entries()) {
  const t0 = Date.now()
  const fx = b.c ? { c: b.c } : CONTENUTI[b.contenuto]
  if (!fx) { console.warn('contenuto sconosciuto:', b.contenuto); continue }
  const format = FORMATI[b.formato]
  const photo = b.foto ? `http://designer.local/fixtures/${b.foto}` : undefined
  let content = fx.c, direzioni, enfasi, fonte = 'contenuti compilati'
  // la regia scrive testi per una copertina: i tipi con voci (consigli, menu, dati) restano compilati
  const r = args.regia && !content.tipo ? await regia(b) : null
  if (r?.testi) {
    const t = r.testi
    content = { brand: r.analisi.brand || content.brand, kicker: t.occhiello || undefined, title: t.titoli[0]?.testo ?? content.title, body: t.testo || undefined, details: t.dettagli, cta: t.invito || undefined, numero: t.numero || undefined }
    direzioni = r.direzioni; enfasi = t.titoli[0]?.enfasi; fonte = `regia (${Object.values(r.modelli ?? {}).join(', ')})`
  }
  const res = await page.evaluate(job => window.confronto.migliore(job), { content, format, photo, direzioni, enfasi, n: Number(args.n ?? 12) })
  if (!res) { console.warn(`${b.id.padEnd(20)} nessuna tavola riuscita`); continue }
  fs.writeFileSync(path.join(dir, `${b.id}.png`), Buffer.from(res.url.split(',')[1], 'base64'))
  meta[b.id] = { sistema: res.sistema, stile: res.stile, voto: res.voto, promossa: res.promossa, candidate: res.candidate, promosse: res.promosse, fonte, formato: b.formato, data: new Date().toISOString() }
  console.log(`${b.id.padEnd(20)} ${format.padEnd(10)} ${res.sistema} · ${res.stile} · voto ${res.voto} · ${res.promosse}/${res.candidate} promosse · ${fonte} · ${((Date.now() - t0) / 1000).toFixed(1)} s`)
  if (args.finto) {
    fs.mkdirSync(finti, { recursive: true })
    const url = await page.evaluate(job => window.confronto.finta(job), { content: fx.c, format, colore: COLORI[i % COLORI.length] })
    fs.writeFileSync(path.join(finti, `${b.id}.png`), Buffer.from(url.split(',')[1], 'base64'))
  }
}
fs.writeFileSync(metaFile, JSON.stringify(meta, null, 2))
if (args.finto) fs.writeFileSync(path.join(finti, 'concorrente.json'), JSON.stringify({ nome: 'Prova finta', disponibile: true, nota: 'Concorrente finto per provare il banco: titolo centrato su fondo pieno. Cancellare prima di una misura vera.' }, null, 2))
await browser.close()
console.log(`\nTavole in ${path.relative(process.cwd(), dir)}`)
