#!/usr/bin/env node
/**
 * Vetrina del motore designer: genera le tavole per i contenuti di prova in
 * ogni formato, con il motore e il render veri (Fabric + motore effetti in
 * Chromium), e scrive fogli contatti e un rapporto in scripts/designer/out/.
 *
 *   npm run designer:vetrina                         tutto
 *   npm run designer:vetrina -- --contenuti caffe,mostra --formati storia
 *   npm run designer:vetrina -- --sistemi eco,orbita --knobs '{"energia":0.9}'
 *
 * Prima volta: cd scripts/designer && npm install
 * Browser: DESIGNER_CHROME=/percorso/chrome, altrimenti Chrome installato.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(here, '../..')
const require = createRequire(import.meta.url)

let esbuild, chromium
try {
  esbuild = require('esbuild')
  ;({ chromium } = require('playwright-core'))
} catch {
  console.error('Mancano le dipendenze del banco di prova: cd scripts/designer && npm install')
  process.exit(1)
}

/* ── argomenti ─────────────────────────────────────────────────────────── */
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : 'true'])
  return acc
}, []))
const CONTENUTI = JSON.parse(fs.readFileSync(path.join(here, 'fixtures/contenuti.json'), 'utf8'))
const contenuti = args.contenuti ? args.contenuti.split(',') : Object.keys(CONTENUTI)
const formati = (args.formati ?? 'quadrato,verticale,storia,orizzontale').split(',')
const sistemi = args.sistemi ? args.sistemi.split(',') : undefined
const over = args.knobs ? JSON.parse(args.knobs) : {}
if (args.stile) over.stile = args.stile
const out = path.resolve(args.out ?? path.join(here, 'out'))
const thumb = Number(args.thumb ?? 0.36)
fs.mkdirSync(out, { recursive: true })

/* ── pagina ────────────────────────────────────────────────────────────── */
const bundle = path.join(out, 'bundle.js')
await esbuild.build({
  entryPoints: [path.join(here, 'entry.ts')], bundle: true, outfile: bundle, format: 'iife', platform: 'browser',
  logLevel: 'error', define: { 'process.env.NODE_ENV': '"production"' },
  alias: { '@': path.join(repo, 'src'), fabric: path.join(here, 'node_modules/fabric') },
  nodePaths: [path.join(here, 'node_modules'), path.join(repo, 'node_modules')],
})
fs.writeFileSync(path.join(out, 'index.html'), '<!doctype html><html><head><meta charset="utf-8"></head><body><script src="bundle.js"></script></body></html>')

const exe = process.env.DESIGNER_CHROME ?? ['/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell'].find(p => fs.existsSync(p))
const browser = await chromium.launch({
  ...(exe ? { executablePath: exe } : { channel: 'chrome' }),
  args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
  ...(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'designer.local' } } : {}),
})
const page = await browser.newPage({ ignoreHTTPSErrors: true })
page.on('pageerror', e => console.log('[errore pagina]', e.message))
const TYPES = { '.js': 'application/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.html': 'text/html', '.json': 'application/json' }
const serve = (route, file) => fs.existsSync(file)
  ? route.fulfill({ body: fs.readFileSync(file), contentType: TYPES[path.extname(file)] ?? 'application/octet-stream', headers: { 'Access-Control-Allow-Origin': '*' } })
  : route.fulfill({ status: 404, body: '' })
await page.route('http://designer.local/**', async route => {
  const u = new URL(route.request().url())
  if (u.pathname === '/api/proxy-image') {
    const target = new URL(u.searchParams.get('url'))
    if (target.host === 'designer.local') return serve(route, path.join(here, target.pathname))
    const r = await route.fetch({ url: target.href })
    return route.fulfill({ response: r, headers: { 'Access-Control-Allow-Origin': '*' } })
  }
  if (u.pathname.startsWith('/fixtures/')) return serve(route, path.join(here, u.pathname))
  return serve(route, path.join(out, u.pathname === '/' ? 'index.html' : u.pathname))
})
await page.goto('http://designer.local/')

/* ── giro ──────────────────────────────────────────────────────────────── */
const RATIO = { quadrato: 1, verticale: 1.25, storia: 16 / 9, orizzontale: 9 / 16 }
const report = []
for (const nome of contenuti) {
  const fx = CONTENUTI[nome]
  if (!fx) { console.warn('contenuto sconosciuto:', nome); continue }
  for (const format of formati) {
    const t0 = Date.now()
    const photo = fx.foto ? `http://designer.local/fixtures/${fx.foto}` : undefined
    const res = await page.evaluate(job => window.designer.run(job), { content: fx.c, format, photo, over, sistemi, thumb })
    const items = res.map(r => ({
      url: r.url, label: `${r.sistema}${r.ok ? '' : '  — scartata'}`,
      sub: r.ok ? `${r.knobs.stile} · ${r.knobs.trattamento} · sc ${r.knobs.scala.toFixed(2)} en ${r.knobs.energia.toFixed(2)} de ${r.knobs.densita.toFixed(2)} so ${r.knobs.sovrastampa.toFixed(2)}${r.knobs.inverti ? ' · inverso' : ''}` : (r.reasons[0] ?? ''),
    }))
    const cols = format === 'orizzontale' ? 3 : 4
    const sheet = await page.evaluate(o => window.designer.sheet(o), { title: `${nome} · ${format}`, items, cols, cellW: format === 'orizzontale' ? 420 : 300, ratio: RATIO[format] })
    fs.writeFileSync(path.join(out, `${nome}-${format}.jpg`), Buffer.from(sheet.split(',')[1], 'base64'))
    const ok = res.filter(r => r.ok).length
    report.push({ contenuto: nome, formato: format, ok, totale: res.length, secondi: (Date.now() - t0) / 1000,
      scarti: res.filter(r => !r.ok).map(r => ({ sistema: r.sistema, motivi: r.reasons.slice(0, 4) })),
      tempi: Object.fromEntries(res.map(r => [r.sistema, r.ms])) })
    console.log(`${nome.padEnd(12)} ${format.padEnd(12)} ${ok}/${res.length}  ${((Date.now() - t0) / 1000).toFixed(1)} s${ok < res.length ? '  scartate: ' + res.filter(r => !r.ok).map(r => r.sistema).join(', ') : ''}`)
  }
}
await browser.close()

/* ── rapporto ──────────────────────────────────────────────────────────── */
fs.writeFileSync(path.join(out, 'rapporto.json'), JSON.stringify(report, null, 2))
const tot = report.reduce((a, r) => [a[0] + r.ok, a[1] + r.totale], [0, 0])
const perSistema = {}
for (const r of report) for (const s of r.scarti) (perSistema[s.sistema] ??= []).push(`${r.contenuto}/${r.formato}: ${s.motivi[0] ?? '?'}`)
const md = [
  `# Vetrina del motore designer`, '',
  `Tavole riuscite: **${tot[0]} su ${tot[1]}** (${Math.round((tot[0] / Math.max(1, tot[1])) * 100)}%).`, '',
  '| contenuto | formato | riuscite | secondi |', '|---|---|---|---|',
  ...report.map(r => `| ${r.contenuto} | ${r.formato} | ${r.ok}/${r.totale} | ${r.secondi.toFixed(1)} |`), '',
  '## Scarti per sistema', '',
  ...Object.entries(perSistema).flatMap(([s, l]) => [`### ${s} (${l.length})`, ...l.map(x => `- ${x}`), '']),
].join('\n')
fs.writeFileSync(path.join(out, 'rapporto.md'), md)
console.log(`\n${tot[0]}/${tot[1]} riuscite · fogli e rapporto in ${path.relative(process.cwd(), out)}`)
