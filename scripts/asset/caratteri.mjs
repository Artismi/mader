#!/usr/bin/env node
/**
 * AS2: caratteri nel catalogo. Scarica in cache (public/asset-cache/caratteri)
 * una selezione curata, misura ogni file con opentype.js e scrive le voci in
 * designer/asset/caratteri.json (genere, epoca, personalità, ruoli, misure).
 *
 * Fonti, solo OFL: Google Fonts (licenza dal repo google/fonts), Velvetyne
 * (gitlab.com/velvetyne), Collletttivo (github.com/collletttivo), The League
 * of Moveable Type (github.com/theleagueof), Badass Libre Fonts by Womxn (i
 * repo GitHub/GitLab elencati su design-research.be/by-womxn). Fontshare è
 * escluso finché la licenza di ridistribuzione non è verificata.
 *
 *   npm run asset:caratteri                      selezione curata (~300 famiglie)
 *   npm run asset:caratteri -- --famiglia "Rubik Mono One,Gloock"   altre famiglie Google, su richiesta
 *   npm run asset:caratteri -- --solo google|fonderie
 *
 * Senza la cache il motore usa comunque i Google Fonts dalla rete; i caratteri
 * delle fonderie restano fuori finché non sono scaricati.
 */
import fs from 'node:fs'
import path from 'node:path'
import { repo, CATALOGO, CACHE, GREZZI, require, slug, chiave, leggiJson, scarica, googleFonts } from './comune.mjs'
import { misura, classifica } from './misure.mjs'

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : 'true']] : acc), []))
const fileCar = path.join(CATALOGO, 'caratteri.json')
const catalogo = new Map(leggiJson(fileCar, []).map(a => [a.id, a]))
const perNome = () => new Map([...catalogo.values()].map(a => [chiave(a.nome), a]))
const log = fs.createWriteStream(path.join(GREZZI, 'caratteri.log'), { flags: 'a' })
const conta = { google: 0, fonderie: 0, senzaAccenti: 0, errori: 0 }

/** Esegue i compiti con al massimo n alla volta. */
async function aGruppi(l, n, fn) { const q = [...l]; await Promise.all(Array.from({ length: n }, async () => { while (q.length) { const x = q.shift(); try { await fn(x) } catch (e) { conta.errori++; log.write(`${x?.family ?? x?.nome ?? x}: ${e.message}\n`) } } })) }

/** Scrive la voce del catalogo (le personalità curate a mano restano). */
function registra({ nome, fonte, url, autore, file, misure, cat, slab, google, suRichiesta }) {
  const pesi = [...new Set(file.filter(f => f.stile !== 'italic').map(f => f.peso))].sort((a, b) => a - b)
  if (!pesi.length) return
  const c = classifica(misure, { nome, fonte, cat, pesi, slab })
  const id = `carattere:${slug(nome)}`, prima = catalogo.get(id) ?? perNome().get(chiave(nome))
  const curato = prima?.carattere?.curato
  // i file di public/ (in git) valgono più di quelli della cache
  const filePubblici = prima?.file?.some(f => !f.url.startsWith('/asset-cache/')) ? prima.file : null
  const { famiglia, sottofamiglia, peso, ...m } = misure
  catalogo.set(prima?.id ?? id, {
    ...prima, id: prima?.id ?? id, tipo: 'carattere', nome: prima?.nome ?? nome, fonte: prima?.fonte ?? fonte, url: prima?.url ?? url, autore: prima?.autore ?? autore, licenza: 'OFL-1.1',
    tag: { genere: [c.genere, c.struttura], epoca: [c.epoca], umore: curato ? prima.tag.umore : c.umore },
    file: filePubblici ?? file, inCache: !filePubblici,
    carattere: {
      ...(curato ? prima.carattere : { ruoli: c.ruoli, p: c.p, osa: c.osa, maiuscolo: c.maiuscolo, sans: c.sans, mono: c.mono }),
      misure: { ...m, pesi, corsivo: file.some(f => f.stile === 'italic') }, google: !!google, ...(suRichiesta ? { suRichiesta } : {}), pesi: curato ? prima.carattere.pesi : pesi, corsivo: file.some(f => f.stile === 'italic'),
    },
  })
}

/* ── Google Fonts ─────────────────────────────────────────────────────── */
const QUOTE = { 'Sans Serif': 70, Serif: 50, Display: 65, Handwriting: 18, Monospace: 10 }
async function google() {
  const gf = await googleFonts()
  const ok = f => f.licenza === 'OFL-1.1' && f.subsets.includes('latin') && !f.isNoto && !f.isBrandFont && !f.primaryScript && !(f.classifications ?? []).includes('Symbols')
  const adatte = gf.filter(ok).sort((a, b) => a.popularity - b.popularity)
  let scelte
  if (args.famiglia) scelte = args.famiglia.split(',').map(n => gf.find(f => chiave(f.family) === chiave(n.trim()))).filter(Boolean)
  else {
    // la selezione si rifà da capo: restano i caratteri storici del motore e quelli chiesti a parte
    for (const [id, a] of catalogo) if (a.fonte === 'google' && !a.carattere?.curato && !a.carattere?.suRichiesta) catalogo.delete(id)
    const storici = new Set([...catalogo.values()].filter(a => a.fonte === 'google').map(a => a.nome))
    scelte = adatte.filter(f => storici.has(f.family))
    for (const [cat, n] of Object.entries(QUOTE)) scelte.push(...adatte.filter(f => f.category === cat && !storici.has(f.family)).slice(0, n))
    scelte.push(...adatte.filter(f => /stencil/i.test(f.family) && !scelte.includes(f)).slice(0, 8))
  }
  scelte = [...new Set(scelte)]
  await aGruppi(scelte, 6, async f => {
    const pesi = Object.keys(f.fonts).filter(k => /^\d+$/.test(k)).map(Number)
    const corsivo = '400i' in f.fonts
    const axis = corsivo ? `ital,wght@${[...pesi.map(p => `0,${p}`), '1,400'].join(';')}` : `wght@${pesi.join(';')}`
    const css = await scarica(`https://fonts.googleapis.com/css2?family=${f.family.replace(/ /g, '+')}:${axis}`, null, { testo: true })
    const dir = path.join(CACHE, 'caratteri', slug(f.family)), file = []
    // con un agente generico Google risponde con un TTF intero per variante
    for (const b of css.split('@font-face').slice(1)) {
      const u = b.match(/url\((https:[^)]+\.ttf)\)/)?.[1], peso = Number(b.match(/font-weight:\s*(\d+)/)?.[1]), stile = /font-style:\s*italic/.test(b) ? 'italic' : 'normal'
      if (!u || !peso) continue
      const nome = `${peso}${stile === 'italic' ? 'i' : ''}.ttf`
      await scarica(u, path.join(dir, nome))
      file.push({ url: `/asset-cache/caratteri/${slug(f.family)}/${nome}`, peso, stile })
    }
    const reg = file.filter(x => x.stile === 'normal').sort((a, b) => Math.abs(a.peso - 400) - Math.abs(b.peso - 400))[0]
    if (!reg) throw new Error('nessun file')
    const misure = misura(fs.readFileSync(path.join(repo, 'public', reg.url)))
    if (!misure.italiano) { conta.senzaAccenti++; log.write(`${f.family}: mancano accenti italiani\n`); return }
    if (args.famiglia) f.suRichiesta = true
    registra({ nome: f.family, suRichiesta: f.suRichiesta, fonte: 'google', url: `https://fonts.google.com/specimen/${f.family.replace(/ /g, '+')}`, autore: f.designers?.join(', '), file, misure, cat: f.category, slab: f.stroke === 'Slab Serif', google: true })
    conta.google++
  })
}

/* ── fonderie (archivi dei repo) ──────────────────────────────────────── */
async function repoFonderie() {
  const gh = async (u, f) => JSON.parse(await scarica(u, path.join(GREZZI, 'fonderie', f), { testo: true, headers: { 'User-Agent': 'creative-os' } }))
  const l = []
  for (const p of await gh('https://gitlab.com/api/v4/groups/velvetyne/projects?per_page=100&include_subgroups=true', 'velvetyne.json'))
    // quelli già in public/fonts/libere (in git) non si riscaricano: GitLab concede pochi archivi all'ora
    if (!fs.existsSync(path.join(repo, 'public/fonts/libere', p.path)) || args.tutte) l.push({ fonte: 'velvetyne', nome: p.path, url: p.web_url, zip: `${p.web_url}/-/archive/HEAD/${p.path}-HEAD.zip` })
  for (const [fonte, u] of [['collletttivo', 'https://api.github.com/users/collletttivo/repos?per_page=100'], ['league', 'https://api.github.com/orgs/theleagueof/repos?per_page=100']])
    for (const r of await gh(u, `${fonte}.json`)) l.push({ fonte, nome: r.name, url: r.html_url, zip: `https://codeload.github.com/${r.full_name}/zip/HEAD` })
  // Womxn: solo i repo pubblici elencati nella pagina (gli altri caratteri stanno su siti personali)
  const pagina = await scarica('https://www.design-research.be/by-womxn/', path.join(GREZZI, 'fonderie', 'womxn.html'), { testo: true })
  for (const m of new Set(pagina.match(/https:\/\/github\.com\/[^"/#?]+\/[^"/#?]+/g) ?? [])) {
    const [, , , o, r] = m.split('/')
    l.push({ fonte: 'womxn', nome: r, url: m, zip: `https://codeload.github.com/${o}/${r}/zip/HEAD` })
  }
  return l.filter(x => !/^(licenses|fontship|cltoools|word-o-mat|velvetyne-notdef|velvetyne-standard-character-set|velvetyne-libre-friends)$/i.test(x.nome))
}

async function fonderie() {
  const JSZip = require('jszip')
  const google = perNome()
  await aGruppi(await repoFonderie(), 2, async r => {
    const zip = await JSZip.loadAsync(await scarica(r.zip, path.join(GREZZI, 'zip', `${r.fonte}-${slug(r.nome)}.zip`), { headers: { 'User-Agent': 'creative-os' }, curl: r.fonte === 'velvetyne' }))
    const nomi = Object.keys(zip.files).filter(n => !zip.files[n].dir)
    // la licenza deve essere OFL: si legge il file nel repo
    let ofl = false
    for (const n of nomi.filter(n => /(licen[sc]e|ofl|fontlog|readme)[^/]*$/i.test(n.split('/').pop()) && n.split('/').length <= 3).slice(0, 8))
      if (/Open Font License/i.test(await zip.files[n].async('string'))) { ofl = true; break }
    if (!ofl) { log.write(`${r.fonte}/${r.nome}: licenza non OFL o assente\n`); return }
    // i file: statici prima dei variabili, otf/ttf, niente sorgenti o prove
    const font = nomi.filter(n => /\.(otf|ttf)$/i.test(n) && !/(^|\/)(sources?|test|tests|old|archive|proof)s?\//i.test(n))
      .sort((a, b) => Number(/variable|\[/i.test(a)) - Number(/variable|\[/i.test(b)) || a.length - b.length)
    const famiglie = new Map()
    for (const n of font) {
      let m
      try { m = misura(await zip.files[n].async('nodebuffer')) } catch { continue }
      const fam = (m.famiglia || r.nome).trim(), stile = m.corsivo ? 'italic' : 'normal'
      const e = famiglie.get(fam) ?? { file: new Map(), misure: null }
      const k = `${m.peso}${stile}`
      if (e.file.has(k)) continue
      e.file.set(k, { n, peso: m.peso, stile })
      if (!e.misure || (stile === 'normal' && Math.abs(m.peso - 400) < Math.abs(e.misure.peso - 400))) e.misure = m
      famiglie.set(fam, e)
    }
    for (const [fam, e] of famiglie) {
      const g = google.get(chiave(fam))
      if (g?.fonte === 'google' || !e.misure) continue // la versione di Google basta
      if (!e.misure.italiano) { conta.senzaAccenti++; log.write(`${fam}: mancano accenti italiani\n`); continue }
      const dir = path.join(CACHE, 'caratteri', slug(fam)), file = []
      fs.mkdirSync(dir, { recursive: true })
      for (const x of e.file.values()) {
        const nome = path.basename(x.n).replace(/[^\w.-]+/g, '-')
        fs.writeFileSync(path.join(dir, nome), await zip.files[x.n].async('nodebuffer'))
        file.push({ url: `/asset-cache/caratteri/${slug(fam)}/${nome}`, peso: x.peso, stile: x.stile })
      }
      registra({ nome: fam, fonte: r.fonte, url: r.url, file, misure: e.misure })
      conta.fonderie++
    }
  })
}

if (args.solo !== 'fonderie') await google()
if (args.solo !== 'google' && !args.famiglia) await fonderie()
const voci = [...catalogo.values()].sort((a, b) => a.id.localeCompare(b.id))
fs.writeFileSync(fileCar, '[\n' + voci.map(v => JSON.stringify(v)).join(',\n') + '\n]\n')
const misurati = voci.filter(v => v.carattere?.misure).length
console.log(`google ${conta.google} · fonderie ${conta.fonderie} · senza accenti ${conta.senzaAccenti} · errori ${conta.errori} · catalogo ${voci.length} caratteri (${misurati} misurati) · dettagli in .asset-cache/caratteri.log`)
