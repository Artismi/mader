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
 *   npm run designer:idee                           le idee del concetto (C1) da un modello vero (OpenRouter, Claude o Gemini), ripiego a regole
 *   npm run designer:vetrina -- --senza-idee          proposte senza le idee del concetto (C1–C2), per il confronto
 *   npm run designer:vetrina -- --ibridi              in più un foglio <contenuto>-<formato>-ibridi.jpg con i soli ibridi dell'incrocio (V1)
 *   npm run designer:vetrina -- --campi               foglio campi.jpg con tutti i generatori procedurali e gli oggetti 3D
 *   npm run designer:vetrina -- --foto-fissa          una sola foto per contenuto (senza: anche quelle di npm run designer:foto, a rotazione)
 *   npm run designer:vetrina -- --occhio --a-secco   imbuto e occhio con il modello simulato: chiamate e token prima e dopo
 *   npm run designer:vetrina -- --schede            difetti per archetipo (P3): out/schede.md e schede.json
 *   OCCHIO_MODELLO=gemini:… npm run designer:vetrina -- --occhio   lo stesso con un modello vero (costa)
 *
 * Prima volta: cd scripts/designer && npm install
 * Browser: DESIGNER_CHROME=/percorso/chrome, altrimenti Chrome installato.
 */
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
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
import { famiglia, distanzaPalette, neutriChiari } from './varieta.mjs'
import { altreFoto } from './foto.mjs'
const CONTENUTI = JSON.parse(fs.readFileSync(path.join(here, 'fixtures/contenuti.json'), 'utf8'))
const contenuti = args.contenuti ? args.contenuti.split(',') : Object.keys(CONTENUTI)
const formati = (args.formati ?? 'quadrato,verticale,storia,orizzontale').split(',')
const sistemi = args.sistemi ? args.sistemi.split(',') : undefined
const over = args.knobs ? JSON.parse(args.knobs) : {}
if (args.stile) over.stile = args.stile
// valori sconosciuti: errore chiaro con l'elenco dei validi, non una vetrina vuota
const FORMATI = ['quadrato', 'verticale', 'storia', 'orizzontale']
const ignoti = (l, validi, cosa) => { const x = l.filter(v => !validi.includes(v)); if (x.length) { console.error(`${cosa} sconosciut${x.length > 1 ? 'i' : 'o'}: ${x.join(', ')}. Validi: ${validi.join(', ')}`); process.exit(1) } }
ignoti(contenuti, Object.keys(CONTENUTI), 'contenuto')
ignoti(formati, FORMATI, 'formato')
const out = path.resolve(args.out ?? path.join(here, 'out'))
const thumb = Number(args.thumb ?? (args.occhio ? 0.5 : 0.36))
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
const TYPES = { '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff2': 'font/woff2', '.js': 'application/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.html': 'text/html', '.json': 'application/json' }
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
  // caratteri del catalogo: cache locale (public/asset-cache) e caratteri liberi di public/fonts
  if (u.pathname.startsWith('/asset-cache/') || u.pathname.startsWith('/fonts/')) return serve(route, path.join(repo, 'public', decodeURIComponent(u.pathname)))
  return serve(route, path.join(out, u.pathname === '/' ? 'index.html' : u.pathname))
})
await page.goto('http://designer.local/')

/* ── occhio: imbuto in codice, una griglia per giro, verdetti in memoria ── */
let occhio = null
if (args.occhio) {
  const b = await esbuild.build({ stdin: { contents: "export * from './imbuto'; export * from './occhio'", resolveDir: path.join(repo, 'src/components/studio/designer/gen'), loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'error' })
  const lib = await import('data:text/javascript;base64,' + Buffer.from(b.outputFiles[0].text).toString('base64'))
  const oc = await import('../occhio/index.mjs')
  occhio = { lib, oc, chiedi: args['a-secco'] ? oc.simulato() : await oc.modello(), memoria: oc.memoriaFile(path.join(out, 'verdetti.jsonl')), prima: oc.contaVuota(), dopo: oc.contaVuota() }
}

/* ── C1 con il modello vero: --idee-modello (registro dei modelli, profilo medio; ripiego a regole) ── */
let ideeModello = null
if (args['idee-modello']) {
  // le chiavi del portale (.env.local) e il database delle impostazioni (OpenRouter collegato, modelli scelti)
  for (const f of ['.env.local', '.env']) if (fs.existsSync(path.join(repo, f))) process.loadEnvFile(path.join(repo, f))
  const file = path.join(here, 'out', 'concetto-modello.mjs')
  await esbuild.build({ entryPoints: [path.join(repo, 'src/lib/ai/concetto-modello.ts')], bundle: true, format: 'esm', platform: 'node', outfile: file, packages: 'external', logLevel: 'error', alias: { '@': path.join(repo, 'src') } })
  const cwd = process.cwd(); process.chdir(repo)
  ideeModello = await import(pathToFileURL(file).href)
  process.chdir(cwd)
}

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

/* ── schede: difetti per archetipo (P3), un esemplare per sistema, niente fogli ── */
// npm run designer:vetrina -- --schede [--contenuti … --formati …]: scrive out/schede.md e out/schede.json
const CLASSI = {
  sovrapposizioni: [/sovrapposti|spazi: .* troppo vicini/, /troppo vicini/],
  'testo piccolo': [null, /troppo piccolo per il telefono/],
  vuoti: [null, /non progettat/],
  tagli: [/fuori|non entr|troppo (lung|pien|alt)|incomplet/, null],
  contrasto: [/contrasto|leggib|si legge/, /si legge a fatica/],
  'fuori tema': [null, /stile (estraneo|lontano)/],
}
if (args.schede) {
  // campione di partenza: contenuti di tipo diverso, tutti i formati (tutto il vivaio è lento)
  const campione = args.contenuti ? contenuti : Object.keys(CONTENUTI).filter((_, i, l) => i % Math.max(1, Math.round(l.length / 8)) === 0).slice(0, 8)
  const S = {}
  const t0 = Date.now()
  for (const nome of campione) for (const format of formati) {
    const fx = CONTENUTI[nome]
    const photo = fx.foto ? `http://designer.local/fixtures/${fx.foto}` : undefined
    // come il vivaio dello Studio: solo i sistemi ammessi per questo contenuto (niente slide, niente esclusi per tema)
    const tutti = await page.evaluate(([c, f]) => window.designer.sistemi(c, f), [fx.c, !!photo])
    const res = await page.evaluate(job => window.designer.run(job), { content: fx.c, format, photo, over, sistemi: sistemi ? sistemi.filter(x => tutti.includes(x)) : tutti, primo: true, thumb: 0.08, seme: Number(args.seme ?? 0) })
    for (const r of res) {
      const s = (S[r.sistema] ??= { prove: 0, scartate: 0, voti: [], classi: Object.fromEntries(Object.keys(CLASSI).map(k => [k, 0])), correzioni: 0, motivi: {} })
      s.prove++
      const corr = r.reasons.filter(m => / spazi (rientrato|spostato|ridotto|accorciato|tolto)/.test(m))
      s.correzioni += corr.length
      const motivi = r.reasons.filter(m => !corr.includes(m)).map(m => m.replace(/^[^:]+: /, ''))
      if (!r.ok) {
        s.scartate++
        const m = motivi[0] ?? 'senza motivo'
        s.motivi[m] = (s.motivi[m] ?? 0) + 1
        for (const [k, [re]] of Object.entries(CLASSI)) if (re && motivi.some(x => re.test(x))) s.classi[k]++
        continue
      }
      if (r.esame) s.voti.push(r.esame.voto)
      for (const [k, [, re]] of Object.entries(CLASSI)) if (re && r.esame?.difetti.some(x => re.test(x))) s.classi[k]++
    }
    console.log(`${nome.padEnd(12)} ${format.padEnd(12)} ${res.filter(r => r.ok).length}/${res.length}  ${((Date.now() - t0) / 1000).toFixed(0)} s`)
  }
  await browser.close()
  // indice: quota di prove con almeno un problema (scarto o difetto di classe), più i difetti in eccesso
  const righe = Object.entries(S).map(([sistema, s]) => {
    const difetti = Object.values(s.classi).reduce((a, b) => a + b, 0)
    const media = s.voti.length ? Math.round(s.voti.reduce((a, b) => a + b, 0) / s.voti.length) : 0
    return { sistema, ...s, voti: undefined, media, indice: +((s.scartate + difetti) / s.prove).toFixed(2) }
  }).sort((a, b) => b.indice - a.indice || a.media - b.media)
  const pct = (n, d) => `${Math.round((100 * n) / Math.max(1, d))}%`
  const md = [
    '# Schede dei difetti per archetipo', '',
    `Campione: ${campione.join(', ')} × ${formati.join(', ')}; un esemplare per sistema (${righe.reduce((a, r) => a + r.prove, 0)} prove, ${((Date.now() - t0) / 1000).toFixed(0)} s). Generato da \`vetrina.mjs --schede\`, in locale.`, '',
    'Indice = (scarti + difetti di classe) / prove: più alto, peggio. Le classi contano sia gli scarti del codice sia le note del critico. Correzioni = interventi del controllo degli spazi (P1).', '',
    `| # | archetipo | indice | prove | scartate | voto medio | ${Object.keys(CLASSI).join(' | ')} | correzioni | motivo di scarto più frequente |`,
    `|---|---|---|---|---|---|${Object.keys(CLASSI).map(() => '---').join('|')}|---|---|`,
    ...righe.map((r, i) => `| ${i + 1} | ${r.sistema} | ${r.indice} | ${r.prove} | ${pct(r.scartate, r.prove)} | ${r.media || '—'} | ${Object.values(r.classi).map(n => (n ? pct(n, r.prove) : '·')).join(' | ')} | ${r.correzioni || '·'} | ${Object.entries(r.motivi).sort((a, b) => b[1] - a[1])[0]?.join(' ×') ?? '·'} |`),
    '',
  ].join('\n')
  fs.writeFileSync(path.join(out, 'schede.md'), md)
  fs.writeFileSync(path.join(out, 'schede.json'), JSON.stringify({ campione, formati, righe }, null, 2))
  console.log(`\nPeggiori: ${righe.slice(0, 5).map(r => `${r.sistema} (${r.indice})`).join(', ')}\nschede in ${path.relative(process.cwd(), out)}`)
  process.exit(0)
}

// --campi: un foglio con tutti i generatori (campi, trame, pattern della libreria) e il backend usato
if (args.campi) {
  const items = await page.evaluate(() => window.designer.campi())
  const sh = await page.evaluate(o => window.designer.sheet(o), { title: 'generatori procedurali · campo e trama', items, cols: 6, cellW: 300, ratio: 1 })
  fs.writeFileSync(path.join(out, 'campi.jpg'), Buffer.from(sh.split(',')[1], 'base64'))
  console.log(items.map(i => `${i.label} (${i.sub})`).join(' · '), `foglio in ${path.relative(process.cwd(), path.join(out, 'campi.jpg'))}`)
  await browser.close()
  process.exit(0)
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
const tutteCoppie = []
const diversita = []
const varieta = []

for (const nome of contenuti) {
  const fx = CONTENUTI[nome]
  if (!fx) { console.warn('contenuto sconosciuto:', nome); continue }
  for (const format of formati) {
    const t0 = Date.now()
    const photo = fx.foto ? `http://designer.local/fixtures/${fx.foto}` : undefined
    // altre foto dello stesso soggetto (npm run designer:foto), a rotazione tra le composizioni
    if (fx.foto && !args['foto-fissa']) fx.c = { ...fx.c, immagini: altreFoto(fx.foto).map(f => `http://designer.local/fixtures/foto/${f}`) }
    if (MOTIVI_APP && !fx.c.progetto) {
      const testo = [fx.c.brand, fx.c.kicker, fx.c.title, fx.c.body, ...(fx.c.details ?? [])].join(' ')
      fx.c = { ...fx.c, progetto: risolvi(await page.evaluate(t => window.designer.ripiego(t), testo), MOTIVI_APP) }
      console.log(`  ${nome}: motivi ${fx.c.progetto.motivi?.join(', ') || '(nessuno)'}`)
    }
    // --vecchio: le proposte di prima (una per sistema); altrimenti come nello Studio: vivaio, critico, le migliori diverse
    let res, info = ''
    if (args.vecchio || sistemi) res = await page.evaluate(job => window.designer.run(job), { content: fx.c, format, photo, over, sistemi, thumb, seme: Number(args.seme ?? 0) })
    else {
      let idee
      if (ideeModello) {
        const r = await ideeModello.chiediIdee(fx.c)
        idee = r.idee
        console.log(`  ${nome}: concetto dal ${r.fonte}${r.modello ? ' ' + r.modello : ''}${r.token ? ` (${r.token} token)` : ''}${r.motivo ? ' — ' + r.motivo : ''}`)
      }
      const p = await page.evaluate(job => window.designer.proposte(job), { content: fx.c, format, photo, over, thumb, n: Number(args.n ?? 12), seme: Number(args.seme ?? 0), senzaIdee: !!args['senza-idee'], idee })
      if (p.idee?.length) console.log(`  ${nome}: idee ${p.idee.join(' | ')} · concetto ${p.concetto.chiamate} chiamata, ~${p.concetto.token} token`)
      if (args.motivi && p.traccia?.length) console.log(p.traccia.map(x => '    ' + x).join('\n'))
      res = p.items
      info = ` · ${p.promosse} promosse su ${p.candidate} candidate in ${p.giri} giri`
      if (occhio) {
        const { lib, oc } = occhio
        // prima: il critico con la vista guardava ogni promossa, una chiamata per tavola, a piena risoluzione
        const w = 1080, h = Math.round(1080 * RATIO[format])
        occhio.prima = oc.somma(occhio.prima, { chiamate: p.promosse, tokenImmagine: p.promosse * oc.tokenImmagine(w, h), tokenTesto: p.promosse * (lib.tokenTesto(lib.CRITERIO) + 20), consegnate: res.length })
        const cand = res.map((r, i) => ({ id: String(i), sistema: r.sistema, esame: r.esame, url: r.url })).filter(x => x.esame && x.url)
        const { finaliste: fin, scartate } = lib.finaliste(cand)
        const conta = lib.contaVuota()
        const g = await lib.giudica(fin, fin.length, { miniatura: id => oc.miniatura(cand.find(x => x.id === id).url), griglia: oc.griglia, chiedi: occhio.chiedi, memoria: occhio.memoria, conta }, { controlla: true })
        conta.consegnate = res.length
        occhio.dopo = oc.somma(occhio.dopo, conta)
        // in testa le finaliste nell'ordine dell'occhio, poi le altre; in coda quelle che il codice scarta
        const testa = g.scelte.map(x => res[Number(x.id)]), via = new Set(scartate.map(y => res[Number(y.x.id)]))
        res = [...testa, ...res.filter(r => !testa.includes(r) && !via.has(r)), ...res.filter(r => via.has(r))]
        info += ` · occhio: ${fin.length} finaliste, ${scartate.length} scartate dal codice, ${g.chiamata ? '1 chiamata' : 'nessuna chiamata'}`
      }
    }
    // indice di diversità tra le prime 12 (V1): impronte visive e combinazioni di mattoni
    if (!sistemi && !args.vecchio) {
      const prime = res.filter(r => r.ok && r.url).slice(0, 12)
      const dv = await page.evaluate(o => window.designer.diversita(o), { urls: prime.map(r => r.url), mattoni: prime.map(r => r.mattoni ?? [r.sistema]) })
      dv.carattere = prime.reduce((a, r) => a + (r.esame?.carattere?.carattere ?? 0), 0) / Math.max(1, prime.length)
      dv.intrecci = prime.filter(r => (r.mattoni ?? []).some(m => m.startsWith('intreccio:'))).length
      dv.idee = prime.filter(r => r.knobs?.idea).length
      diversita.push(dv)
      info += ` · diversità ${dv.visiva.toFixed(3)} (mattoni ${dv.mattoni.toFixed(2)}) · carattere ${dv.carattere.toFixed(1)} · intrecci ${dv.intrecci} · idee ${dv.idee}`
      // varietà delle risorse nelle prime 12: palette, effetti, generatori, foto, trattamenti
      const rs = prime.map(r => r.risorse).filter(Boolean), conta = f => new Set(rs.flatMap(f)).size
      const v = { palette: conta(r => [famiglia(r.palette)]), effetti: conta(r => r.fx), generatori: conta(r => r.gen), foto: conta(r => r.foto), trattamenti: conta(r => r.trattamento ? [r.trattamento] : []), distanza: +distanzaPalette(rs.map(r => r.palette)).toFixed(3), neutri: neutriChiari(rs.map(r => r.palette)), texture: conta(r => r.tex ?? []) }
      varieta.push({ contenuto: nome, formato: format, ...v, dettaglio: rs })
      info += ` · palette ${v.palette} effetti ${v.effetti} generatori ${v.generatori} foto ${v.foto} trattamenti ${v.trattamenti} texture ${v.texture}`
    }
    // --ibridi: un foglio con i soli ibridi dell'incrocio, con i mattoni e gli intrecci sotto
    if (args.ibridi) {
      const ib = await page.evaluate(job => window.designer.ibridi(job), { content: fx.c, format, photo, over, thumb, seme: Number(args.seme ?? 0) })
      const intrecci = ib.filter(r => r.mattoni?.some(m => m.startsWith('intreccio:'))).length
      const its = ib.map(r => ({ url: r.url, label: `${r.sistema}  ${r.esame?.voto ?? ''}`, sub: (r.mattoni ?? []).filter(m => !/^(ossatura|titolo|foto):/.test(m)).map(m => m.split(':')[1]).join(' · ') }))
      if (its.length) {
        const sh = await page.evaluate(o => window.designer.sheet(o), { title: `${nome} · ${format} · ibridi promossi: ${ib.length}, con intreccio: ${intrecci}`, items: its, cols: 4, cellW: format === 'orizzontale' ? 420 : 300, ratio: RATIO[format] })
        fs.writeFileSync(path.join(out, `${nome}-${format}-ibridi.jpg`), Buffer.from(sh.split(',')[1], 'base64'))
      }
      info += ` · ibridi: ${ib.length} (intrecci ${intrecci})`
      if (args.motivi) console.log((await page.evaluate(() => window.ultimiMotivi)).map(m => '    ' + m).join('\n'))
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
      mattoni: res.slice(0, 12).map(r => r.mattoni ?? [r.sistema]),
      esami: res.filter(r => r.ok && r.esame).map(r => ({ sistema: r.sistema, voto: r.esame.voto, promossa: r.esame.promossa, criteri: r.esame.criteri, difetti: r.esame.difetti, gesti: r.esame.gesti, correzioni: r.esame.correzioni, firma: r.esame.firma, carattere: r.esame.carattere, stile: r.stile })),
      tempi: Object.fromEntries(res.map(r => [r.sistema, r.ms])) })
    const voti = res.filter(r => r.esame).map(r => r.esame.voto)
    const coppie = new Set(res.slice(0, 12).filter(r => r.ok && r.coppia).map(r => r.coppia))
    tutteCoppie.push(...coppie)
    if (!sistemi && !args.vecchio) info += ` · coppie di font: ${coppie.size}/${Math.min(12, res.length)}`
    console.log(`${nome.padEnd(12)} ${format.padEnd(12)}${info} ${ok}/${res.length} voti ${voti.join(' ')}  ${((Date.now() - t0) / 1000).toFixed(1)} s${ok < res.length ? '  scartate: ' + res.filter(r => !r.ok).map(r => r.sistema).join(', ') : ''}`)
  }
}
const bc = await page.evaluate(() => window.designer.backendCampi())
if (Object.keys(bc.conta).length) console.log(`Campi generativi: ${Object.entries(bc.conta).map(([b, n]) => `${b} ${n}`).join(', ')} (navigator.gpu ${bc.webgpu ? 'presente' : 'assente: nodi del Lab sul ripiego WebGL2 di three'})`)
if (Object.keys(bc.formeTolte ?? {}).length) console.log(`Forme senza motivo tolte (tutte le prove): ${Object.entries(bc.formeTolte).map(([n, k]) => `${n} ${k}`).join(', ')}`)
await browser.close()
if (occhio) {
  const { prima, dopo } = occhio, x = (prima.tokenImmagine + prima.tokenTesto) / Math.max(1, dopo.tokenImmagine + dopo.tokenTesto)
  console.log(`
Occhio${args['a-secco'] ? ' (a secco, modello simulato)' : ''}:
${occhio.oc.riga('prima', prima)}
${occhio.oc.riga('dopo', dopo)}
  ${dopo.tokenImmagine + dopo.tokenTesto ? `${x.toFixed(0)} volte meno token` : 'nessun token: tutto dalla memoria o dal codice'} · verdetti in memoria: ${occhio.memoria.size}`)
  fs.writeFileSync(path.join(out, 'occhio.json'), JSON.stringify({ prima, dopo }, null, 2))
}

if (diversita.length) {
  const m = k => diversita.reduce((a, d) => a + d[k], 0) / diversita.length
  console.log(`Indice di diversità (prime 12, media): visiva ${m('visiva').toFixed(3)} · mattoni ${m('mattoni').toFixed(2)} · carattere ${m('carattere').toFixed(1)} · intrecci ${m('intrecci').toFixed(1)} · idee ${m('idee').toFixed(1)} (per contenuto)`)
  fs.writeFileSync(path.join(out, 'diversita.json'), JSON.stringify({ visiva: m('visiva'), mattoni: m('mattoni'), carattere: m('carattere'), intrecci: m('intrecci'), idee: m('idee'), tavole: diversita }, null, 2))
}
if (varieta.length) {
  const m = k => (varieta.reduce((a, d) => a + d[k], 0) / varieta.length).toFixed(1)
  console.log(`Varietà (prime 12, media per tavola): palette ${m('palette')} · effetti ${m('effetti')} · generatori ${m('generatori')} · foto ${m('foto')} · trattamenti ${m('trattamenti')} · distanza palette ${(varieta.reduce((a, d) => a + d.distanza, 0) / varieta.length).toFixed(3)} · fondi chiari neutri ${m('neutri')} · texture ${m('texture')}`)
  fs.writeFileSync(path.join(out, 'varieta.json'), JSON.stringify(varieta, null, 2))
}
console.log(`Coppie di font diverse (prime 12 per tavola): ${new Set(tutteCoppie).size} in tutto`)

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
