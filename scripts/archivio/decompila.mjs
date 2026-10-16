#!/usr/bin/env node
/**
 * G1: dalle immagini scaricate (scarica.mjs) all'archivio del motore.
 * Ogni pezzo passa da D1 (lettura del testo con Gemini, render-and-compare,
 * strati); entra solo se la verifica di fedeltà regge. Le tavole migliori del
 * motore entrano con --motore. Scrive src/components/studio/designer/archivio/archivio.json
 * e i fogli in scripts/archivio/out/.
 *
 *   node scripts/archivio/decompila.mjs                 tutti i pezzi del registro
 *   node scripts/archivio/decompila.mjs --solo 5        i primi 5 (prova)
 *   node scripts/archivio/decompila.mjs --motore        solo le tavole del motore (campione standard, a secco)
 *   --soglia 0.85    fedeltà minima · --cache    riusa solo le letture salvate (nessuna chiamata)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(here, '../..')
const designer = path.join(repo, 'scripts/designer')
const require = createRequire(path.join(designer, 'package.json'))
const esbuild = require('esbuild'), { chromium } = require('playwright-core')

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : 'true'])
  return acc
}, []))
const env = {}
for (const p of [path.join(repo, '.env.local'), path.resolve(repo, '../../../.env.local')]) {
  if (!fs.existsSync(p)) continue
  for (const l of fs.readFileSync(p, 'utf8').split(/\r?\n/)) { const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '') }
  break
}
const KEY = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || env.GOOGLE_GENERATIVE_AI_API_KEY
if (env.DECOMPILA_MODELLO && !process.env.DECOMPILA_MODELLO) process.env.DECOMPILA_MODELLO = env.DECOMPILA_MODELLO
const SOGLIA = Number(args.soglia ?? 0.85)

const cache = path.join(here, 'cache'), letture = path.join(cache, 'letture')
const out = path.join(here, 'out'), confronti = path.join(out, 'confronti')
fs.mkdirSync(letture, { recursive: true }); fs.mkdirSync(confronti, { recursive: true })
const ARCHIVIO = path.join(repo, 'src/components/studio/designer/archivio/archivio.json')
const archivio = fs.existsSync(ARCHIVIO) ? JSON.parse(fs.readFileSync(ARCHIVIO, 'utf8')) : { versione: 1, esempi: [] }

/* ── pagina ── */
const alias = { '@': path.join(repo, 'src'), fabric: path.join(designer, 'node_modules/fabric') }
const nodePaths = [path.join(designer, 'node_modules'), path.join(repo, 'node_modules')]
await esbuild.build({ entryPoints: [path.join(here, 'entry.ts')], bundle: true, outfile: path.join(out, 'bundle.js'), format: 'iife', platform: 'browser', logLevel: 'error', define: { 'process.env.NODE_ENV': '"production"' }, alias, nodePaths })
await esbuild.build({ entryPoints: [path.join(repo, 'scripts/decompila/lettore.ts')], bundle: true, outfile: path.join(out, 'lettore.mjs'), format: 'esm', platform: 'node', logLevel: 'error', alias, nodePaths, packages: 'external' })
fs.writeFileSync(path.join(out, 'index.html'), '<!doctype html><html><head><meta charset="utf-8"></head><body><script src="bundle.js"></script></body></html>')
const leggi = KEY && !args.cache ? (await import(pathToFileURL(path.join(out, 'lettore.mjs')).href)).lettore(KEY) : null

const exe = process.env.DESIGNER_CHROME
const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : { channel: 'chrome' }), args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ ignoreHTTPSErrors: true })
page.setDefaultTimeout(0)
page.on('pageerror', e => console.log('[errore pagina]', e.message.slice(0, 200)))
let corrente = '', chiamate = 0
await page.exposeFunction('__leggi', async png => {
  const file = path.join(letture, `${corrente}.json`)
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8')
  if (!leggi) throw new Error('nessuna lettura in cache e nessuna chiave')
  chiamate++
  // una lettura non può bloccare il giro: dopo 150 s il pezzo si scarta
  const { lettura, label } = await Promise.race([leggi(png), new Promise((_, no) => setTimeout(() => no(new Error('lettura oltre 150 s')), 150000))])
  fs.writeFileSync(file, JSON.stringify({ ...lettura, _modello: label }))
  return JSON.stringify(lettura)
})
const TYPES = { '.js': 'application/javascript', '.mjs': 'application/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.html': 'text/html', '.json': 'application/json', '.wasm': 'application/wasm', '.onnx': 'application/octet-stream' }
const serve = (route, file) => fs.existsSync(file)
  ? route.fulfill({ body: fs.readFileSync(file), contentType: TYPES[path.extname(file)] ?? 'application/octet-stream', headers: { 'Access-Control-Allow-Origin': '*' } })
  : route.fulfill({ status: 404, body: '' })
await page.route('http://designer.local/**', async route => {
  const u = new URL(route.request().url())
  if (u.pathname.startsWith('/cache/')) return serve(route, path.join(cache, decodeURIComponent(u.pathname.slice(7))))
  if (u.pathname.startsWith('/fixtures/')) return serve(route, path.join(designer, u.pathname))
  if (u.pathname === '/api/proxy-image') { const t = new URL(u.searchParams.get('url')); if (t.host === 'designer.local') return serve(route, path.join(designer, t.pathname)); return route.fulfill({ status: 404, body: '' }) }
  if (u.pathname === '/models/u2netp.onnx') return serve(route, path.join(repo, 'node_modules/@rmbg/model-u2netp/u2netp.onnx'))
  if (u.pathname.startsWith('/vendor/ort/')) return serve(route, path.join(repo, 'node_modules/onnxruntime-web/dist', path.basename(u.pathname)))
  return serve(route, path.join(out, u.pathname === '/' ? 'index.html' : u.pathname))
})
await page.goto('http://designer.local/')
const salva = (file, url) => fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'))

const esempi = new Map(archivio.esempi.map(e => [e.id, e]))
const esito = { entrati: 0, scartati: [], errori: 0 }

if (args.motore) {
  // le tavole migliori del motore sul campione standard (a secco): tre per contenuto
  const CONT = JSON.parse(fs.readFileSync(path.join(designer, 'fixtures/contenuti.json'), 'utf8'))
  const SETT = { caffe: ['cibo'], mostra: ['cultura'], t_menu: ['cibo'], palestra: ['sport'] }
  for (const id of [...esempi.keys()]) if (id.startsWith('motore-')) esempi.delete(id)
  for (const nome of Object.keys(SETT)) {
    const fx = CONT[nome]
    const r = await page.evaluate(o => window.archivio.motore(o), { content: fx.c, format: 'quadrato', photo: fx.foto ? `http://designer.local/fixtures/${fx.foto}` : undefined, nome, settore: SETT[nome], quante: 3 })
    for (const x of r) { esempi.set(x.scheda.id, x.scheda); salva(path.join(confronti, `${x.scheda.id}.jpg`), x.immagine); esito.entrati++ }
    console.log(`motore ${nome}: ${r.length} tavole`)
  }
} else {
  const registro = fs.readFileSync(path.join(cache, 'registro.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l))
  const scelti = registro.slice(0, Number(args.solo ?? registro.length))
  for (const p of scelti) {
    corrente = p.id
    // già passato da D1 in un giro precedente (il confronto c'è): si salta, salvo --rifai
    if (!args.rifai && fs.existsSync(path.join(confronti, `${p.id}.jpg`))) continue
    const anno = Number(String(p.inizio ?? p.data ?? '').match(/1[5-9]\d\d|20[0-2]\d/)?.[0]) || undefined
    const meta = { id: p.id, titolo: p.titolo, autore: p.autore, anno, testo: `${p.tipo ?? ''} ${p.fonte}`, licenza: { fonte: p.fonte, licenza: p.licenza, verifica: p.verifica, immagine: p.immagine, pagina: p.pagina } }
    let r
    try { r = await page.evaluate(o => window.archivio.pezzo(o), { url: `http://designer.local/cache/${p.file}`, meta }) } catch (e) {
      console.log(`${p.id} errore ${String(e.message).slice(0, 100)}`)
      esito.errori++; esito.scartati.push({ id: p.id, motivo: `errore: ${String(e.message).slice(0, 120)}` }); esempi.delete(p.id)
      if (/quota|RESOURCE_EXHAUSTED|429/i.test(e.message)) { console.log('quota del modello finita: mi fermo'); break }
      continue
    }
    // verifica di fedeltà: fedeltà dei pixel, almeno un testo letto, almeno un elemento oltre al fondo
    const motivo = r.fedelta < SOGLIA ? `fedeltà ${(r.fedelta * 100).toFixed(1)}% < ${SOGLIA * 100}%` : !r.testi.length ? 'nessun testo letto' : r.scheda.programma.strati.length < 3 ? 'troppo pochi strati' : ''
    salva(path.join(confronti, `${p.id}.jpg`), await page.evaluate(o => window.archivio.affianca(o), { a: r.originale, b: r.ricostruita, titolo: `${p.id} · ${(r.fedelta * 100).toFixed(1)}% · ${motivo || 'ENTRA'}` }))
    console.log(`${p.id} ${(r.fedelta * 100).toFixed(1)}% ${motivo || 'entra'}`)
    if (motivo) { esito.scartati.push({ id: p.id, motivo }); esempi.delete(p.id) } else { esempi.set(p.id, r.scheda); esito.entrati++ }
  }
}
await browser.close()

const tutti = [...esempi.values()]
fs.writeFileSync(ARCHIVIO, JSON.stringify({ versione: 1, creato: new Date().toISOString().slice(0, 10), note: [
  'G1: design di pubblico dominio o CC0 (Met, Smithsonian/Cooper Hewitt, Rijksmuseum) decompilati con D1, più le tavole migliori del motore.',
  'Ogni esempio è un programma in frazioni e ruoli (archivio/tipi.ts); le immagini non sono nel repository, solo fonte, licenza e URL.',
], esempi: tutti }))
fs.writeFileSync(path.join(out, `esito${args.motore ? '-motore' : ''}.json`), JSON.stringify(esito, null, 1))
console.log(`entrati ${esito.entrati}, scartati ${esito.scartati.length} (errori ${esito.errori}), chiamate al modello ${chiamate} · archivio: ${tutti.filter(e => e.origine === 'museo').length} dal museo, ${tutti.filter(e => e.origine === 'motore').length} dal motore`)
