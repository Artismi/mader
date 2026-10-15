#!/usr/bin/env node
/**
 * Vetrina del motore designer: genera le tavole per i contenuti di prova in
 * ogni formato, con il motore e il render veri (Fabric + motore effetti in
 * Chromium), e scrive fogli contatti e un rapporto in scripts/designer/out/.
 *
 *   npm run designer:vetrina                         tutto
 *   npm run designer:vetrina -- --contenuti caffe,mostra --formati storia
 *   npm run designer:vetrina -- --sistemi eco,orbita --knobs '{"energia":0.9}'
 *   npm run designer:vetrina -- --specializza        stesse tavole senza e con la specifica del brief (fixtures/progetti.json)
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
// --progetto auto: ogni contenuto riceve la specifica di ripiego (motivi dalle parole del brief)
const MOTIVI_APP = args.progetto ? await page.evaluate(() => window.designer.motivi()) : null
const RATIO = { quadrato: 1, verticale: 1.25, storia: 16 / 9, orizzontale: 9 / 16 }
/* ── specializzazione: stessa composizione senza e con la specifica del brief ── */
/** Tracciato di un'icona Iconify dai set in locale (game-icons, ph): tutti i `d` uniti. */
function tracciatoIcona(id) {
  const [set, nome] = id.split(':')
  const dirs = [path.join(repo, 'node_modules'), path.resolve(repo, '../../../node_modules')]
  const file = dirs.map(d => path.join(d, '@iconify-json', set, 'icons.json')).find(f => fs.existsSync(f))
  if (!file) return undefined
  const json = (tracciatoIcona.cache ??= {})[set] ??= JSON.parse(fs.readFileSync(file, 'utf8'))
  const body = json.icons[nome]?.body
  return body ? [...body.matchAll(/ d="([^"]+)"/g)].map(m => m[1]).join(' ') : undefined
}
/** Le icone della specifica (anche quelle dei motivi) con il tracciato risolto. */
function risolvi(sp, motivi) {
  const ids = [...(sp.icone ?? []).map(i => i.id), ...(sp.motivi ?? []).flatMap(m => motivi[m]?.icone ?? [])]
  return { ...sp, icone: [...new Set(ids)].map(id => ({ id, d: tracciatoIcona(id) })).filter(i => i.d) }
}

if (args.specializza) {
  const PROGETTI = JSON.parse(fs.readFileSync(path.join(here, 'fixtures/progetti.json'), 'utf8'))
  const motivi = await page.evaluate(() => window.designer.motivi())
  const nomi = args.contenuti ? contenuti : Object.keys(PROGETTI)
  const lista = sistemi ?? ['composto', 'centrato', 'manifesto', 'supertipo', 'colonne', 'iniziale', 'bauhaus', 'memphis']
  for (const format of (args.formati ?? 'quadrato').split(',')) {
    const colonne = []
    for (const nome of nomi) {
      const fx = CONTENUTI[nome], sp = risolvi(PROGETTI[nome], motivi)
      const photo = fx.foto ? `http://designer.local/fixtures/${fx.foto}` : undefined
      const job = { format, photo, over, sistemi: lista, thumb, seme: Number(args.seme ?? 0), primo: true }
      const senza = await page.evaluate(j => window.designer.run(j), { ...job, content: fx.c })
      const con = await page.evaluate(j => window.designer.run(j), { ...job, content: { ...fx.c, progetto: sp } })
      colonne.push({ nome, senza, con })
    }
    const items = []
    for (let i = 0; i < lista.length; i++) for (const col of colonne) for (const [v, r] of [['senza', col.senza[i]], ['con', col.con[i]]]) {
      items.push({ url: r?.url, label: `${col.nome} · ${r?.sistema ?? '?'} · ${v}${r?.esame ? `  ${r.esame.voto}` : ''}`, sub: r?.ok ? (r.esame?.difetti[0] ?? r.stile ?? '') : (r?.reasons[0] ?? 'scartata') })
    }
    const sheet = await page.evaluate(o => window.designer.sheet(o), { title: `Specializzazione · ${nomi.join(' / ')} · ${format}: senza e con la specifica del brief`, items, cols: 2 * colonne.length, cellW: Number(args.cella ?? (format === 'orizzontale' ? 360 : 280)), ratio: RATIO[format] })
    fs.writeFileSync(path.join(out, `specializza-${format}.jpg`), Buffer.from(sheet.split(',')[1], 'base64'))
    const scartate = items.filter(x => !x.url)
    console.log(`specializza ${format}: ${items.length - scartate.length}/${items.length} riuscite${scartate.length ? '  scartate: ' + scartate.map(x => `${x.label} (${x.sub})`).join('; ') : ''}`)
  }
  await browser.close()
  process.exit(0)
}

const report = []
for (const nome of contenuti) {
  const fx = CONTENUTI[nome]
  if (!fx) { console.warn('contenuto sconosciuto:', nome); continue }
  for (const format of formati) {
    const t0 = Date.now()
    const photo = fx.foto ? `http://designer.local/fixtures/${fx.foto}` : undefined
    if (MOTIVI_APP && !fx.c.progetto) {
      const testo = [fx.c.brand, fx.c.kicker, fx.c.title, fx.c.body, ...(fx.c.details ?? [])].join(' ')
      fx.c = { ...fx.c, progetto: risolvi(await page.evaluate(t => window.designer.ripiego(t), testo), MOTIVI_APP) }
      console.log(`  ${nome}: motivi ${fx.c.progetto.motivi?.join(', ') || '(nessuno)'}`)
    }
    // --vecchio: le proposte di prima (una per sistema); altrimenti come nello Studio: vivaio, critico, le migliori diverse
    let res, info = ''
    if (args.vecchio || sistemi) res = await page.evaluate(job => window.designer.run(job), { content: fx.c, format, photo, over, sistemi, thumb, seme: Number(args.seme ?? 0) })
    else {
      const p = await page.evaluate(job => window.designer.proposte(job), { content: fx.c, format, photo, over, thumb, n: Number(args.n ?? 12), seme: Number(args.seme ?? 0) })
      res = p.items
      info = ` · ${p.promosse} promosse su ${p.candidate} candidate in ${p.giri} giri`
    }
    const items = res.map(r => ({
      url: r.url, label: `${r.sistema}${r.ok ? (r.esame ? `  ${r.esame.voto} ${r.esame.promossa ? '✓' : '✗ bocciata'}` : '') : '  — scartata'}`,
      sub: r.ok ? (r.esame ? (r.esame.difetti[0] ?? `${r.registro} · ${r.stile} · gesti: ${r.esame.gesti.join(', ')}`) : `${r.registro} · ${r.stile}`) : (r.reasons[0] ?? ''),
    }))
    const cols = format === 'orizzontale' ? 3 : 4
    const sheet = await page.evaluate(o => window.designer.sheet(o), { title: `${nome} · ${format}${info}`, items, cols: res.length > 8 ? (format === 'orizzontale' ? 4 : 6) : cols, cellW: format === 'orizzontale' ? 420 : 300, ratio: RATIO[format] })
    fs.writeFileSync(path.join(out, `${nome}-${format}.jpg`), Buffer.from(sheet.split(',')[1], 'base64'))
    const ok = res.filter(r => r.ok).length
    report.push({ contenuto: nome, formato: format, ok, totale: res.length, secondi: (Date.now() - t0) / 1000,
      scarti: res.filter(r => !r.ok).map(r => ({ sistema: r.sistema, motivi: r.reasons.slice(0, 4) })),
      esami: res.filter(r => r.ok && r.esame).map(r => ({ sistema: r.sistema, voto: r.esame.voto, promossa: r.esame.promossa, criteri: r.esame.criteri, difetti: r.esame.difetti, gesti: r.esame.gesti, correzioni: r.esame.correzioni, firma: r.esame.firma, stile: r.stile })),
      tempi: Object.fromEntries(res.map(r => [r.sistema, r.ms])) })
    const voti = res.filter(r => r.esame).map(r => r.esame.voto)
    console.log(`${nome.padEnd(12)} ${format.padEnd(12)}${info} ${ok}/${res.length} voti ${voti.join(' ')}  ${((Date.now() - t0) / 1000).toFixed(1)} s${ok < res.length ? '  scartate: ' + res.filter(r => !r.ok).map(r => r.sistema).join(', ') : ''}`)
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
