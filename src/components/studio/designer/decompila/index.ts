/**
 * Decompilatore, fase D1 (docs/occhio-del-designer.md): da un'immagine di una
 * grafica a una scena del motore designer, modificabile e verificata.
 *
 *   const r = await decompila(dataUrl)          // nello Studio: lettura via /api/design/decompila
 *   r.scena  → renderScene(...)                 // Fondo, forme, Immagine, Soggetto, Titolo…
 *   r.fedelta, r.giri, r.testi                  // quanto è fedele e cosa ha trovato
 *
 * Passi: lettura del testo (modello con visione, domande chiuse) → misura
 * delle righe e render-and-compare dei caratteri → strati senza il testo →
 * scena → posa dei testi → verifica di fedeltà e al massimo 3 giri di
 * correzione dei parametri.
 */
import type { FontSpec, SceneEl, Scene } from '../types'
import { daUrl, differenza } from './pixel'
import { strati } from './strati'
import { erroreCarattere, misuraRiga, misureBlocco, provaFamiglia, scegliCarattere, unisciBlocchi, type RigaMisurata, type Scelta } from './testo'
import type { Blocco, Box, Decompilato, Lettore, Lettura, TestoTrovato } from './tipi'
import { trama } from './trama'
import { misuraTesto, rendi } from './verifica'

export type { Decompilato, Lettura, TestoTrovato } from './tipi'

type Testo = Extract<SceneEl, { kind: 'text' }>

/** Lettura del testo attraverso la route del server (la chiave resta lì). */
export const leggiDallaRoute = (modelId?: string): Lettore => async png => {
  const r = await fetch('/api/design/decompila', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ png, modelId }) })
  const j = await r.json() as { lettura?: Lettura; error?: string }
  if (!r.ok || !j.lettura) throw new Error(j.error ?? `lettura non riuscita (${r.status})`)
  return j.lettura
}

/** Nomi dei livelli leggibili, dal ruolo letto. */
const NOMI: Record<TestoTrovato['ruolo'], string> = { titolo: 'Titolo', occhiello: 'Occhiello', testo: 'Testo', dettaglio: 'Dettagli', invito: 'Invito', marchio: 'Marchio', numero: 'Numero' }

/** Elemento di testo del motore dalle misure trovate. */
function elemento(t: TestoTrovato & { corsive: boolean[]; tinte: (string | null)[][] }): Testo {
  const misto = t.corsive.some(Boolean) && !t.font.italic
  const tinte = t.tinte.some(r => r.some(Boolean))
  const w = Math.ceil(t.box.w + 2)
  const x = t.allineamento === 'left' ? t.box.x : t.allineamento === 'center' ? t.box.x + t.box.w / 2 - w / 2 : t.box.x + t.box.w - w
  return {
    kind: 'text', name: t.nome, x, y: t.box.y - 0.25 * t.size, w, h: t.righe.length * t.size * t.lineHeight, tw: w,
    lines: t.righe, font: t.font, size: +t.size.toFixed(2), color: t.colore, align: t.allineamento,
    lineHeight: +t.lineHeight.toFixed(3), tracking: +t.tracking.toFixed(4),
    // corsivo di una riga sola e parole di un'altra tinta: stile per carattere del motore
    ...(misto || tinte ? { chars: t.righe.map((l, i) => [...l].map((_, j) => { const c = t.tinte[i]?.[j], it = misto && t.corsive[i]; return c || it ? { ...(c ? { c } : {}), ...(it ? { it: true } : {}) } : null })) } : {}),
  }
}

const med = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[s.length >> 1] : 1 }

/** Posa: sposta il testo perché l'inchiostro reso cada sull'inchiostro dell'originale. */
async function posa(el: Testo, orig: Box): Promise<Testo> {
  const m = await misuraTesto(el)
  if (!m) return el
  const dx = el.align === 'left' ? orig.x - m.box.x : el.align === 'right' ? orig.x + orig.w - (m.box.x + m.box.w) : orig.x + orig.w / 2 - (m.box.x + m.box.w / 2)
  return { ...el, x: +(el.x + dx).toFixed(2), y: +(el.y + orig.y - m.box.y).toFixed(2) }
}

/** Un giro di correzione: corpo dall'altezza delle righe, spaziatura dalla larghezza, interlinea dal passo; poi la posa. */
async function correggi(el: Testo, righe: Box[], orig: Box): Promise<Testo> {
  const m = await misuraTesto(el)
  if (!m) return el
  let { size, tracking, lineHeight } = el
  if (m.righe.length === righe.length) {
    const k = med(righe.map((r, i) => r.h / Math.max(1, m.righe[i].h)))
    size = el.size * k
    const n = el.lines.map(l => Math.max(1, [...l].length - 1))
    const dt = med(righe.map((r, i) => (r.w - m.righe[i].w * k) / n[i]).filter((_, i) => n[i] >= 3))
    if (Number.isFinite(dt)) tracking = el.tracking + dt / size
    if (righe.length > 1) {
      const passo = (b: Box[]) => (b[b.length - 1].y + b[b.length - 1].h - (b[0].y + b[0].h)) / (b.length - 1)
      const po = passo(righe), pr = passo(m.righe)
      if (pr > 0) lineHeight = el.lineHeight * (po / pr) / k
    }
  } else {
    // righe non separabili nel render: solo il corpo, dall'altezza del blocco
    size = el.size * (orig.h / Math.max(1, m.box.h))
  }
  return posa({ ...el, size: +size.toFixed(2), tracking: +tracking.toFixed(4), lineHeight: +lineHeight.toFixed(3) }, orig)
}

/**
 * Colonne: i testi con lo stesso allineamento e il bordo quasi uguale tornano
 * sullo stesso bordo, come nell'impaginazione originale (la posa li mette
 * sull'inchiostro, che varia di qualche decimo con la forma delle lettere).
 */
function allinea(tx: Testo[]): Testo[] {
  const bordo = (e: Testo) => (e.align === 'left' ? e.x : e.align === 'right' ? e.x + e.w : e.x + e.w / 2)
  const out = tx.map(e => ({ ...e }))
  const fatti = new Set<number>()
  for (const [i, a] of out.entries()) {
    if (fatti.has(i)) continue
    const gruppo = out.map((e, j) => [e, j] as const).filter(([e, j]) => !fatti.has(j) && e.align === a.align && Math.abs(bordo(e) - bordo(a)) <= Math.max(2, 0.06 * Math.min(e.size, a.size)))
    if (gruppo.length < 2) continue
    // vale il bordo del testo più grande
    const v = bordo(gruppo.reduce((m, g) => (g[0].size > m[0].size ? g : m))[0])
    for (const [e, j] of gruppo) { fatti.add(j); e.x = +(e.x + v - bordo(e)).toFixed(2) }
  }
  return out
}

export interface Opzioni {
  leggi?: Lettore
  /** scontorno del soggetto con U²-Net (predefinito: sì) */
  scontorno?: boolean
  /** giri di correzione al massimo (predefinito 3) */
  giri?: number
}

export async function decompila(src: string, o: Opzioni = {}): Promise<Decompilato> {
  const tempi: Record<string, number> = {}
  const avvisi: string[] = []
  let t0 = performance.now()
  const tappa = (nome: string) => { const t = performance.now(); tempi[nome] = Math.round(t - t0); t0 = t }

  const { raster: R, img } = await daUrl(src)
  const png = src.startsWith('data:image/png') ? src : (() => { const c = document.createElement('canvas'); c.width = R.w; c.height = R.h; c.getContext('2d')!.drawImage(img, 0, 0); return c.toDataURL('image/png') })()
  const lettura = await (o.leggi ?? leggiDallaRoute())(png)
  tappa('lettura')

  // testo: righe misurate sull'inchiostro, poi carattere per blocco
  const misurati: { b: Blocco; righe: RigaMisurata[] }[] = []
  for (const b of lettura.blocchi) {
    const righe = b.righe.map(r => misuraRiga(R, r.testo.trim(), r.box)).filter((r): r is RigaMisurata => !!r && !!r.testo)
    if (righe.length < b.righe.length) avvisi.push(`righe non trovate sui pixel: ${b.righe.filter(r => !righe.some(m => m.testo === r.testo.trim())).map(r => `"${r.testo}"`).join(', ')}`)
    if (righe.length) misurati.push({ b, righe })
  }
  const blocchi = unisciBlocchi(misurati)
  const scelte: Scelta[] = []
  for (const { b, righe } of blocchi) scelte.push(await scegliCarattere(righe, b))
  // parsimonia: un designer usa poche famiglie; se una famiglia già scelta altrove spiega quasi
  // altrettanto bene un blocco (succede sul testo piccolo, dove i pixel dicono poco), si usa quella
  const famiglie = scelte.map(s => s.font.family)
  for (const [i, { righe }] of blocchi.entries()) {
    const s = scelte[i], h = med(righe.map(r => r.box.h))
    const tolleranza = s.errore * (h < 30 ? 0.2 : 0.06) + 0.01
    let meglio: { font: FontSpec; errore: number } | null = null
    for (const f of new Set(famiglie.filter((x, j) => j !== i && x !== s.font.family))) {
      const p = await provaFamiglia(righe, f, s.font.weight)
      if (p && p.errore <= s.errore + tolleranza && (!meglio || p.errore < meglio.errore)) meglio = p
    }
    if (meglio) scelte[i] = { ...s, font: meglio.font, errore: meglio.errore, candidati: [{ family: meglio.font.family, weight: meglio.font.weight, errore: +meglio.errore.toFixed(4) }, ...s.candidati] }
  }
  // le scritte piccole in maiuscolo (occhielli, dettagli, inviti, marchio) in una grafica sono di
  // solito lo stesso carattere: a 13 px d'altezza i pixel distinguono poco, l'insieme di più
  // blocchi sì. Si cerca il carattere che le spiega tutte insieme e lo si usa se costa poco
  const maiuscolo = (t: string) => /\p{L}/u.test(t) && t === t.toUpperCase()
  const piccoli = blocchi.map((b, i) => i).filter(i => blocchi[i].righe.every(r => maiuscolo(r.testo)) && med(blocchi[i].righe.map(r => r.box.h)) < 30)
  if (piccoli.length >= 2) {
    const prove = new Map<string, FontSpec>()
    for (const i of piccoli) for (const c of scelte[i].candidati) prove.set(`${c.family}|${c.weight}`, { family: c.family, weight: c.weight })
    let meglio: { font: FontSpec; errori: number[]; tot: number } | null = null
    for (const f of prove.values()) {
      const errori: number[] = []
      for (const i of piccoli) errori.push(await erroreCarattere(blocchi[i].righe, f))
      const tot = errori.reduce((a, e) => a + e, 0)
      if (!meglio || tot < meglio.tot) meglio = { font: f, errori, tot }
    }
    const singoli = piccoli.reduce((a, i) => a + scelte[i].errore, 0)
    if (meglio && meglio.tot <= singoli * 1.15 + 0.02 * piccoli.length)
      for (const [k, i] of piccoli.entries()) scelte[i] = { ...scelte[i], font: meglio.font, errore: meglio.errori[k], candidati: [{ family: meglio.font.family, weight: meglio.font.weight, errore: +meglio.errori[k].toFixed(4) }, ...scelte[i].candidati] }
  }
  const usati = new Map<string, number>()
  const testi: (TestoTrovato & { corsive: boolean[]; asc: number[]; tinte: (string | null)[][] })[] = blocchi.map(({ b, righe }, i) => {
    const base = NOMI[b.ruolo], n = (usati.get(base) ?? 0) + 1
    usati.set(base, n)
    return misureBlocco(righe, b, scelte[i].font, n > 1 ? `${base} ${n}` : base, scelte[i].errore, scelte[i].candidati)
  })
  tappa('caratteri')

  const S = await strati(R, testi.flatMap(t => t.righeBox), { scontorno: o.scontorno })
  avvisi.push(...S.avvisi)
  // grana e carta: lo stesso livello del motore, con l'intensità misurata
  const grana = await trama(R, S.finestre)
  tappa('strati')

  // scena: fondo, forme e immagini per profondità, testi sopra
  const fondo: SceneEl = { kind: 'rect', name: 'Fondo', x: 0, y: 0, w: R.w, h: R.h, fill: S.fondo }
  const scena = (tx: Testo[]): Scene => ({
    w: R.w, h: R.h, bg: typeof S.fondo === 'string' ? S.fondo : S.fondo.from, els: [fondo, ...S.els, ...(grana ? [grana] : []), ...tx],
    layout: 'decompilata', style: 'decompilata', label: 'Decompilata',
  })
  let tx = allinea(await Promise.all(testi.map(t => posa(elemento(t), t.box))))
  let fedelta = 1 - differenza(R, await rendi(scena(tx)))
  const fedeltaIniziale = fedelta
  tappa('ricostruzione')

  // verifica e correzione: al massimo 3 giri, ci si ferma quando non migliora più
  let giri = 0
  for (; giri < (o.giri ?? 3); giri++) {
    const nuovi: Testo[] = []
    for (const [i, el] of tx.entries()) nuovi.push(await correggi(el, testi[i].righeBox, testi[i].box))
    const allineati = allinea(nuovi)
    const f = 1 - differenza(R, await rendi(scena(allineati)))
    if (f < fedelta) break
    const guadagno = f - fedelta
    tx = allineati; fedelta = f
    if (guadagno < 0.0005) { giri++; break }
  }
  tappa('verifica')

  // le misure finali tornano nel risultato
  const finali = testi.map((t, i) => {
    const el = tx[i]
    const { corsive: _c, asc: _a, tinte: _t, ...resto } = t
    return { ...resto, font: el.font, size: el.size, tracking: el.tracking, lineHeight: el.lineHeight }
  })
  return { scena: scena(tx), fedelta, fedeltaIniziale, giri, testi: finali, tempi, avvisi }
}
