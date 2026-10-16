#!/usr/bin/env node
/**
 * G1, archivio: scarica manifesti e grafica storica di pubblico dominio (CC0)
 * dalle API Open Access di Metropolitan Museum, Smithsonian (Cooper Hewitt,
 * chiave pubblica DEMO_KEY di api.data.gov) e Rijksmuseum (Linked Art).
 *
 *   node scripts/archivio/scarica.mjs                 fino a 150 pezzi (60 Met, 45 Smithsonian, 45 Rijksmuseum)
 *   node scripts/archivio/scarica.mjs --met 10 --si 0 --rk 0
 *
 * Cache fuori da git: scripts/archivio/cache/ (immagini/ e registro.jsonl, una
 * riga per pezzo con fonte, licenza, campo che la verifica, URL dell'immagine e
 * della pagina). Entra solo ciò che i metadati dell'API dichiarano pubblico
 * dominio o CC0. Le immagini sono dati: si controlla solo che siano JPEG.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => {
  if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : 'true'])
  return acc
}, []))
const cache = path.join(here, 'cache'), imm = path.join(cache, 'immagini')
fs.mkdirSync(imm, { recursive: true })
const registroFile = path.join(cache, 'registro.jsonl')
const registro = fs.existsSync(registroFile) ? fs.readFileSync(registroFile, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : []
const presenti = new Set(registro.map(r => r.id))
const TETTO = 150
const quote = { met: Number(args.met ?? 55), si: Number(args.si ?? 10), rk: Number(args.rk ?? 85) }
const pausa = ms => new Promise(r => setTimeout(r, ms))

async function json(url, accept = 'application/json') {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, { headers: { Accept: accept, 'User-Agent': 'creative-os-archivio/1.0 (ricerca, uso non commerciale del codice)' }, redirect: 'follow', signal: AbortSignal.timeout(30000) })
      if (r.status === 429 || r.status >= 500) { await pausa(2000 * (i + 1)); continue }
      if (!r.ok) return null
      return await r.json()
    } catch { await pausa(1500) }
  }
  return null
}

/** Scarica l'immagine e la tiene solo se è davvero un JPEG (o PNG) di dimensione sensata. */
async function immagine(url, file) {
  try {
    const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(60000) })
    if (!r.ok) return false
    const b = Buffer.from(await r.arrayBuffer())
    const jpeg = b[0] === 0xff && b[1] === 0xd8, png = b[0] === 0x89 && b[1] === 0x50
    if (!(jpeg || png) || b.length < 20000 || b.length > 6e6) return false
    fs.writeFileSync(file, b)
    return true
  } catch { return false }
}

let totale = registro.length
async function aggiungi(p, urlImg) {
  if (totale >= TETTO || presenti.has(p.id)) return false
  const file = path.join(imm, `${p.id}.jpg`)
  if (!await immagine(urlImg, file)) return false
  const riga = { ...p, immagine: urlImg, file: path.relative(cache, file).replace(/\\/g, '/'), scaricato: new Date().toISOString() }
  fs.appendFileSync(registroFile, JSON.stringify(riga) + '\n')
  presenti.add(p.id); totale++
  return true
}

/* ── Metropolitan Museum: v1.1/search (paginata) + oggetto; isPublicDomain dal record ── */
const MET_TIPO = /poster|advertis|cover|broadside|placard|trade card/i
async function met(n) {
  let fatti = 0
  for (const q of ['trade card', 'advertising trade card', 'advertisement', 'poster', 'broadside', 'book cover']) {
    for (let offset = 0; offset < 600 && fatti < n; offset += 100) {
      const s = await json(`https://collectionapi.metmuseum.org/public/collection/v1.1/search?q=${encodeURIComponent(q)}&hasImages=true&limit=100&offset=${offset}`)
      const ids = s?.objectIDs ?? []
      if (!ids.length) break
      for (const id of ids) {
        if (fatti >= n || totale >= TETTO) return fatti
        if (presenti.has(`met-${id}`)) continue
        const o = await json(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`)
        await pausa(600)
        if (!o?.isPublicDomain || !o.primaryImageSmall) continue
        if (!MET_TIPO.test(`${o.objectName} ${o.classification}`)) continue
        const ok = await aggiungi({
          id: `met-${id}`, fonte: 'Metropolitan Museum of Art', titolo: o.title, autore: o.artistDisplayName || undefined, data: o.objectDate,
          inizio: o.objectBeginDate, tipo: o.objectName, licenza: 'CC0 (Open Access)', verifica: 'isPublicDomain=true', pagina: o.objectURL,
        }, o.primaryImageSmall)
        if (ok) fatti++
      }
    }
  }
  return fatti
}

/* ── Smithsonian (Cooper Hewitt): una ricerca da 100 righe per pagina; CC0 da metadata_usage e dal media ── */
async function smithsonian(n) {
  let fatti = 0
  for (const start of [0, 100, 200]) {
    if (fatti >= n) break
    const grezzo = path.join(cache, 'grezzi', `si-chndm-${start}.json`)
    // DEMO_KEY ha un tetto orario basso: le risposte si tengono in cache
    let j = fs.existsSync(grezzo) ? JSON.parse(fs.readFileSync(grezzo, 'utf8')) : null
    if (!j) {
      j = await json(`https://api.si.edu/openaccess/api/v1.0/category/art_design/search?q=${encodeURIComponent('poster AND unit_code:CHNDM')}&rows=100&start=${start}&api_key=DEMO_KEY`)
      if (!j) break
      fs.mkdirSync(path.dirname(grezzo), { recursive: true }); fs.writeFileSync(grezzo, JSON.stringify(j))
    }
    for (const x of j.response?.rows ?? []) {
      if (fatti >= n || totale >= TETTO) return fatti
      const d = x.content?.descriptiveNonRepeating ?? {}, ft = x.content?.freetext ?? {}
      const m = (d.online_media?.media ?? []).find(mm => mm.type === 'Images')
      if (d.metadata_usage?.access !== 'CC0' || m?.usage?.access !== 'CC0') continue
      const tipo = (ft.objectType ?? []).map(t => t.content).join(', ')
      if (!/poster|advertis|cover/i.test(`${tipo} ${x.title}`)) continue
      const ok = await aggiungi({
        id: `si-${m.idsId ?? x.id}`, fonte: `Smithsonian (${x.unitCode === 'CHNDM' ? 'Cooper Hewitt' : x.unitCode})`, titolo: x.title,
        autore: (ft.name ?? []).map(t => t.content).slice(0, 2).join('; ') || undefined, data: (ft.date ?? [])[0]?.content, tipo,
        licenza: 'CC0', verifica: 'metadata_usage.access=CC0 e media.usage.access=CC0', pagina: d.record_link,
      }, `${m.content}&max=1000`)
      if (ok) fatti++
    }
  }
  return fatti
}

/* ── Rijksmuseum: ricerca Linked Art (type=affiche), oggetto → VisualItem → DigitalObject → IIIF; CC0 da subject_to ── */
const LD = 'application/ld+json'
async function rijks(n) {
  let fatti = 0, url = 'https://data.rijksmuseum.nl/search/collection?type=affiche&imageAvailable=true', pagine = 0
  while (url && fatti < n && pagine++ < 10) {
    const s = await json(url, 'application/json')
    if (!s) break
    // si salta in avanti: le prime pagine sono molto omogenee (una sola serie)
    const items = (s.orderedItems ?? []).filter((_, i) => i % 3 === pagine % 3)
    for (const it of items) {
      if (fatti >= n || totale >= TETTO) return fatti
      const num = it.id.split('/').pop()
      if (presenti.has(`rk-${num}`)) continue
      const o = await json(it.id, LD)
      if (!o) continue
      if (!o.shows?.[0]?.id) continue
      // la licenza dell'immagine sta sul VisualItem (quella dell'oggetto riguarda i metadati)
      const vi = await json(o.shows[0].id, LD)
      const diritti = (vi?.subject_to ?? []).flatMap(s => s.classified_as ?? []).map(c => c.id ?? '')
      const lic = diritti.find(d => /publicdomain\/(zero|mark)\/1\.0/.test(d))
      if (!lic) continue
      const doId = vi?.digitally_shown_by?.[0]?.id
      const dobj = doId ? await json(doId, LD) : null
      const iiif = dobj?.access_point?.[0]?.id
      if (!iiif) continue
      const nome = (o.identified_by ?? []).find(x => x.type === 'Name')?.content
      const data = o.produced_by?.timespan?.identified_by?.find(x => x.type === 'Name')?.content
      const ok = await aggiungi({
        id: `rk-${num}`, fonte: 'Rijksmuseum', titolo: nome, data, tipo: 'affiche',
        licenza: lic.includes('zero') ? 'CC0 1.0' : 'Public Domain Mark 1.0', verifica: `VisualItem.subject_to = ${lic}`, pagina: it.id,
      }, iiif.replace('/full/max/', '/full/1000,/'))
      if (ok) fatti++
      await pausa(150)
    }
    url = s.next?.id
  }
  return fatti
}

const conti = {}
if (quote.si) conti.smithsonian = await smithsonian(quote.si)
if (quote.rk) conti.rijksmuseum = await rijks(quote.rk)
if (quote.met) conti.met = await met(quote.met)
console.log(`archivio: ${Object.entries(conti).map(([k, v]) => `${k} ${v}`).join(', ')} · totale nel registro ${totale}`)
