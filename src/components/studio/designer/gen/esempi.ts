/**
 * G2, generatore guidato da esempi (alla PosterO / CreatiPoster; docs/competitor-e-gradini.md).
 *
 * Dato il brief, i design più vicini dell'archivio G1 (archivio/cerca.ts)
 * entrano nel prompt di un modello che scrive un **programma** nuovo (strati
 * in frazioni e ruoli, archivio/tipi.ts) imitandone i principi senza copiarli.
 * Il sistema `esempi` lo traduce in una scena con i testi misurati e le voci
 * dell'identità, poi `finish` fa i controlli di sempre (spazi, leggibilità,
 * corpo minimo) e il critico lo giudica: entra nel vivaio accanto agli archetipi.
 *
 * Tre strade, come per il concetto:
 * - `chiediProgrammi(c, f, esempi, chiedi)`: una chiamata testuale (prompt ~2k token, 3 programmi in JSON);
 * - `simulatoEsempi(...)`: la stessa chiamata a secco per la vetrina: i programmi
 *   si costruiscono dagli esempi (ossatura di uno, tipografia di un altro, colore
 *   di un terzo, poi mutazioni) e passano dallo stesso lettore;
 * - nessun archivio: il sistema non entra.
 */
import type { DesignContent, Format, Scene, SceneEl } from '../types'
import { FORMAT_SIZE } from '../types'
import { fit, type Fit } from '../text'
import type { Esempio, Programma, Strato } from '../archivio/tipi'
import { programmaSchema, RUOLI_TESTO } from '../archivio/tipi'
import { distanza, impronta, testiDi } from '../archivio/scheda'
import { type G, put, txt, photo, finish, lab, para, ctaText, contrast, readable, textBox, accentChars } from './tools'
import { hashText, rng, type Rng } from './knobs'

type Testo = Extract<SceneEl, { kind: 'text' }>
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
const r3 = (v: number) => Math.round(v * 1000) / 1000

/* ── dal programma alla scena ───────────────────────────────────────────── */

/** Il testo del brief che va in ogni ruolo. */
function contenuto(c: DesignContent, ruolo: Strato['ruolo']): string | undefined {
  switch (ruolo) {
    case 'titolo': return c.title
    case 'occhiello': return c.kicker
    case 'testo': return c.body
    case 'dettagli': return (c.details ?? []).map(d => d.trim()).filter(Boolean).join('\n') || undefined
    case 'invito': return ctaText(c) || undefined
    case 'marchio': return c.brand
    case 'numero': return c.numero
    default: return undefined
  }
}
const NOME: Record<string, string> = { titolo: 'titolo', occhiello: 'occhiello', testo: 'testo', dettagli: 'dettaglio_0', invito: 'invito', marchio: 'brand', numero: 'numero' }

/** Il colore sotto un punto: l'ultimo strato pieno che lo copre, altrimenti il fondo. */
function sotto(g: G, x: number, y: number, prima?: SceneEl): string {
  const da = prima ? g.els.indexOf(prima) : -1
  for (let i = (da >= 0 ? da : g.els.length) - 1; i >= 0; i--) {
    const e = g.els[i]
    if (e.kind === 'rect' && typeof e.fill === 'string' && (e.opacity ?? 1) > 0.6 && x >= e.x && x <= e.x + e.w && y >= e.y && y <= e.y + e.h) return e.fill
    if (e.kind === 'circle' && (e.opacity ?? 1) > 0.6 && Math.hypot(x - e.cx, y - e.cy) <= e.r) return e.fill
    if (e.kind === 'image' && x >= e.x && x <= e.x + e.w && y >= e.y && y <= e.y + e.h) return g.P.srf
  }
  return g.P.bg
}

/** Applica un programma: fondo e forme in ordine, poi la foto, poi i testi misurati nei loro riquadri. */
export function applicaProgramma(g: G, p: Programma): boolean {
  const { W, H, P, c } = g
  const col = (r: Strato['colore'] | undefined, def: NonNullable<Strato['colore']>) => ({ fondo: P.bg, inchiostro: P.fg, accento: P.acc, accento2: P.acc2, tenue: P.sec, superficie: P.srf })[r ?? def]
  const px = (s: Strato) => {
    const [x, y, w, h] = s.box
    return { x: x * W, y: y * H, w: Math.max(2, w * W), h: Math.max(2, h * H) }
  }
  // fondo
  const fondo = p.strati.find(s => s.ruolo === 'fondo')
  if (fondo && (fondo.colore ?? 'fondo') !== 'fondo') put(g, { kind: 'rect', name: 'tinta', x: 0, y: 0, w: W, h: H, fill: col(fondo.colore, 'fondo') }) // non 'fondo': il controllo di lettura lo prenderebbe per il colore della palette
  // forme: le più grandi (al più 7), nell'ordine del programma
  const forme = p.strati.filter(s => s.ruolo === 'campo' || s.ruolo === 'disco' || s.ruolo === 'filetto')
  const tenute = new Set([...forme].sort((a, b) => b.box[2] * b.box[3] - a.box[2] * a.box[3]).slice(0, 7))
  for (const s of p.strati) {
    if (s.ruolo === 'foto') {
      const b = px(s)
      if (b.w * b.h < W * H * 0.04) continue
      photo(g, 'foto', b, s.forma && s.forma !== 'rect' ? { shape: s.forma } : {})
      continue
    }
    if (!tenute.has(s)) continue
    const b = px(s), fill = col(s.colore, 'accento')
    if (s.ruolo === 'disco') put(g, { kind: 'circle', name: 'disco', cx: b.x + b.w / 2, cy: b.y + b.h / 2, r: Math.min(b.w, b.h) / 2, fill, ...(s.opacita !== undefined ? { opacity: s.opacita } : {}) })
    else if (s.ruolo === 'filetto' || Math.min(b.w, b.h) < Math.min(W, H) * 0.012) {
      const oriz = b.w >= b.h
      put(g, { kind: 'line', name: 'filetto', x1: b.x, y1: oriz ? b.y + b.h / 2 : b.y, x2: oriz ? b.x + b.w : b.x, y2: oriz ? b.y + b.h / 2 : b.y + b.h, color: fill, width: Math.max(2, Math.min(b.w, b.h, 0.008 * W)) })
    } else put(g, { kind: 'rect', name: 'campo', ...b, fill, ...(s.angolo ? { angle: s.angolo } : {}), ...(s.opacita !== undefined ? { opacity: s.opacita } : {}) })
  }
  // testi: uno strato per ruolo (il più importante), poi i ruoli del brief rimasti senza posto
  const perRuolo = new Map<string, Strato>()
  for (const s of testiDi(p)) {
    const prima = perRuolo.get(s.ruolo)
    if (!prima || (s.corpo ?? 0) * s.box[2] > (prima.corpo ?? 0) * prima.box[2]) perRuolo.set(s.ruolo, s)
  }
  const posati: Testo[] = []
  const ordine = ['titolo', 'numero', 'occhiello', 'testo', 'dettagli', 'invito', 'marchio'] as const
  for (const ruolo of ordine) {
    const testo = contenuto(c, ruolo)
    if (!testo?.trim()) continue
    const s = perRuolo.get(ruolo) ?? postoLibero(g, ruolo, posati)
    // se nel suo riquadro non entra, il testo cerca un posto libero (mai il titolo: è l'ossatura)
    let el = s ? posaTesto(g, s, ruolo, testo, col) : null
    // un titolo lungo che non sta nel riquadro dell'esempio prende una fascia piena tra i margini, alla stessa altezza
    if (!el && ruolo === 'titolo' && s) {
      const m = g.m / W, y = clamp(s.box[1], g.T / H, 0.68)
      el = posaTesto(g, { ...s, box: [m, y, 1 - 2 * m, Math.min(0.32, g.B / H - y)], corpo: undefined }, ruolo, testo, col)
    }
    if (!el && ruolo !== 'titolo' && perRuolo.has(ruolo)) { const altro = postoLibero(g, ruolo, posati); if (altro) el = posaTesto(g, altro, ruolo, testo, col) }
    if (!el) { if (ruolo === 'titolo') return false; continue }
    posati.push(el)
  }
  allineaAssi(g, posati)
  ariaNeiCampi(g, posati)
  liberaTesti(g, posati)
  // le forme sono cambiate (tolte, allargate, foto ritirata): ogni testo si rilegge sul colore che ha davvero sotto
  for (const t of posati) {
    const b = textBox(t), grande = /^(titolo|numero)/.test(t.name), min = grande ? 3 : 4.5
    const sotti = [0.1, 0.3, 0.5, 0.7, 0.9].flatMap(fx => [0.25, 0.5, 0.75].map(fy => sotto(g, b.x + b.w * fx, b.y + b.h * fy, t)))
    if (sotti.some(f => contrast(t.color, f) < min)) {
      const cand = [g.P.fg, g.P.bg, g.P.acc, '#111111', '#ffffff']
      t.color = [...cand].sort((p, q) => Math.min(...sotti.map(f => contrast(q, f))) - Math.min(...sotti.map(f => contrast(p, f))))[0]
      if (t.chars) t.chars = undefined
    }
  }
  return posati.some(t => t.name === 'titolo')
}

/** Pochi assi: i bordi dei testi allineati a sinistra (o a destra) entro il 5% della tavola vanno sullo stesso bordo. */
function allineaAssi(g: G, testi: Testo[]) {
  const tol = 0.05 * g.W
  for (const lato of ['left', 'right'] as const) {
    const l = testi.filter(t => t.align === lato && !t.angle)
    const bordo = (t: Testo) => (lato === 'left' ? t.x : t.x + t.w)
    for (const t of [...l].sort((a, b) => b.size - a.size)) {
      const v = bordo(t)
      for (const u of l) if (u !== t && Math.abs(bordo(u) - v) < tol && Math.abs(bordo(u) - v) > 0.5) u.x += v - bordo(u)
    }
  }
  // poi gli assi della tavola: margini, centro, bordi del titolo; ogni testo va sul più vicino se è entro il 12%
  const tit = testi.find(t => t.name === 'titolo')
  const assi = { left: [g.m, ...(tit ? [tit.x] : [])], right: [g.W - g.m, ...(tit ? [tit.x + tit.w] : [])], center: [g.W / 2, ...(tit ? [tit.x + tit.w / 2] : [])] }
  for (const t of testi) {
    if (t.angle || t === tit) continue
    const v = t.align === 'left' ? t.x : t.align === 'right' ? t.x + t.w : t.x + t.w / 2
    const a = assi[t.align].sort((p, q) => Math.abs(p - v) - Math.abs(q - v))[0]
    if (Math.abs(a - v) < 0.12 * g.W && Math.abs(a - v) > 0.5) t.x = clamp(t.x + a - v, 0, g.W - t.w)
  }
}

/** Un testo dentro un campo ha bisogno d'aria: il campo si allarga fino a 16u attorno all'inchiostro. */
function ariaNeiCampi(g: G, testi: Testo[]) {
  const pad = 16 * g.u
  // una forma che taglia a metà un testo grande (né lo contiene né sta fuori) si toglie: il bordo spezzerebbe la lettura
  for (const t of testi.filter(x => /^(titolo|numero|testo)/.test(x.name))) {
    const b = textBox(t)
    g.els = g.els.filter(e => {
      if (!((e.kind === 'rect' && e.name === 'campo') || (e.kind === 'circle' && e.name === 'disco'))) return true
      const [ex, ey, ew, eh] = e.kind === 'rect' ? [e.x, e.y, e.w, e.h] : [e.cx - e.r, e.cy - e.r, 2 * e.r, 2 * e.r]
      const ox = Math.max(0, Math.min(b.x + b.w, ex + ew) - Math.max(b.x, ex)), oy = Math.max(0, Math.min(b.y + b.h, ey + eh) - Math.max(b.y, ey))
      const quota = (ox * oy) / Math.max(1, b.w * b.h)
      return quota < 0.05 || quota > 0.97
    })
  }
  for (const t of testi) {
    const b = textBox(t)
    for (const e of g.els) {
      if (e.kind !== 'rect' || e.name !== 'campo' || e.angle) continue
      if (!(b.x >= e.x - 1 && b.y >= e.y - 1 && b.x + b.w <= e.x + e.w + 1 && b.y + b.h <= e.y + e.h + 1)) continue
      const x0 = Math.max(0, Math.min(e.x, b.x - pad)), y0 = Math.max(0, Math.min(e.y, b.y - pad))
      const x1 = Math.min(g.W, Math.max(e.x + e.w, b.x + b.w + pad)), y1 = Math.min(g.H, Math.max(e.y + e.h, b.y + b.h + pad))
      Object.assign(e, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 })
    }
  }
}

/**
 * La foto cede lo spazio ai testi: negli esempi l'illustrazione occupa spesso
 * quasi tutto il manifesto (con le lettere disegnate dentro), qui la foto del
 * brief si ritira nel rettangolo libero più grande accanto ai testi. Se non
 * resta abbastanza, il testo prende una fascia del colore del fondo.
 */
function liberaTesti(g: G, testi: Testo[]) {
  const gap = 0.02 * Math.min(g.W, g.H)
  for (const f of g.els) {
    if (f.kind !== 'image') continue
    const grandi = testi.filter(t => /^(titolo|numero|testo)/.test(t.name))
    const urta = grandi.map(t => textBox(t)).filter(b => b.x < f.x + f.w && b.x + b.w > f.x && b.y < f.y + f.h && b.y + b.h > f.y)
    if (!urta.length) continue
    const top = Math.max(...urta.map(b => b.y + b.h)) + gap, bot = Math.min(...urta.map(b => b.y)) - gap
    const sx = Math.min(...urta.map(b => b.x)) - gap, dx = Math.max(...urta.map(b => b.x + b.w)) + gap
    const cand = [
      { x: f.x, y: top, w: f.w, h: f.y + f.h - top }, { x: f.x, y: f.y, w: f.w, h: bot - f.y },
      { x: f.x, y: f.y, w: sx - f.x, h: f.h }, { x: dx, y: f.y, w: f.x + f.w - dx, h: f.h },
    ].filter(b => b.w > 0 && b.h > 0 && !grandi.some(t => { const q = textBox(t); return q.x < b.x + b.w && q.x + q.w > b.x && q.y < b.y + b.h && q.y + q.h > b.y }))
    const best = cand.sort((a, b) => b.w * b.h - a.w * a.h)[0]
    if (best && best.w * best.h >= g.W * g.H * 0.1 && Math.min(best.w, best.h) > 0.14 * Math.min(g.W, g.H)) {
      Object.assign(f, best)
    }
    // nessun posto: una fascia sotto ogni testo che tocca la foto
    for (const t of testi) {
      const b = textBox(t)
      if (!(b.x < f.x + f.w && b.x + b.w > f.x && b.y < f.y + f.h && b.y + b.h > f.y)) continue
      const p = 0.03 * Math.min(g.W, g.H)
      g.els.splice(g.els.indexOf(t), 0, { kind: 'rect', name: 'fascia', x: b.x - p, y: b.y - p, w: b.w + 2 * p, h: b.h + 2 * p, fill: g.P.bg })
      t.color = readable(g.P.bg, [t.color, g.P.fg, '#111111', '#ffffff'])
    }
  }
}

/** Un posto per un testo del brief che il programma non prevede: il primo angolo o la prima fascia libera, dai bordi verso il centro. */
function postoLibero(g: G, ruolo: string, posati: Testo[]): Strato | null {
  const m = g.m / g.W
  for (const [w, h] of ruolo === 'testo' ? [[0.6, 0.16], [0.42, 0.2], [0.34, 0.26]] : [[0.42, 0.06], [0.3, 0.08]]) {
    const s = postoDi(g, ruolo, posati, m, w, h)
    if (s) return s
  }
  return null
}

function postoDi(g: G, ruolo: string, posati: Testo[], m: number, w: number, h: number): Strato | null {
  const libero = (x: number, y: number) => !posati.some(t => { const b = textBox(t); return b.x / g.W < x + w && (b.x + b.w) / g.W > x && b.y / g.H < y + h && (b.y + b.h) / g.H > y })
  const ys = [g.T / g.H, g.B / g.H - h, 0.5 - h / 2, g.T / g.H + 0.12, g.B / g.H - h - 0.12, 0.3, 0.7]
  for (const y of ys) for (const [x, allinea] of [[m, 'left'], [1 - m - w, 'right']] as const) {
    if (libero(x, y)) return { ruolo: ruolo as Strato['ruolo'], box: [x, y, w, h], famiglia: ruolo === 'testo' ? 'testo' : 'etichetta', maiuscolo: ruolo !== 'testo', allinea }
  }
  return null
}

/** Misura e posa un testo nel suo riquadro, con la voce dell'identità; se non entra, il riquadro cresce un poco. */
function posaTesto(g: G, s: Strato, ruolo: string, testo: string, col: (r: Strato['colore'] | undefined, def: NonNullable<Strato['colore']>) => string): Testo | null {
  const { W, H } = g
  const [fx, fy, fw, fh] = s.box
  let bx = clamp(fx, 0, 0.95) * W, by = clamp(fy, 0, 0.97) * H
  let bw = clamp(fw, 0.08, 1) * W, bh = clamp(fh, 0.02, 1) * H
  // il riquadro sta dentro i margini della tavola (le misure degli esempi arrivano fino al bordo)
  bw = Math.min(bw, W - 2 * g.m); bx = clamp(bx, g.m, W - g.m - bw); bh = Math.min(bh, H - by)
  const grande = ruolo === 'titolo' || ruolo === 'numero'
  const famiglia = s.famiglia ?? (grande ? 'display' : ruolo === 'testo' ? 'testo' : 'etichetta')
  const align = s.allinea ?? 'left'
  let f: Fit | null = null
  let font = g.s.text
  for (const k of [1, 1.5, 2.2]) {
    // il titolo può allargarsi fino ai margini (un manifesto stretto non regge un titolo lungo)
    if (grande && k > 1) { const wMax = W - 2 * g.m; bw = Math.min(wMax, Math.max(bw, wMax * (k > 1.6 ? 1 : 0.8))); bx = Math.min(Math.max(bx, g.m), W - g.m - bw) }
    const w = Math.min(W - bx, bw * (k > 1 && !grande ? 1.15 : 1)), h = Math.min(H - by, bh * k)
    if (grande) {
      font = famiglia === 'impatto' ? g.s.impact : g.s.display
      const upper = s.maiuscolo ?? (famiglia === 'impatto' || g.s.displayUpper)
      const max = Math.max(g.sc.attacco, Math.min((s.corpo ?? fh) * H * 1.1, h))
      f = fit({ text: testo, font, maxW: w, maxH: h * 1.1, maxSize: max, minSize: Math.max(ruolo === 'titolo' ? g.sc.titolo(3) : g.sc.attacco * 0.8, g.sc.minLettura * 1.4), maxLines: ruolo === 'numero' ? 1 : 4, leading: g.s.displayLeading ?? 1, tracking: g.s.displayTracking ?? 0, upper, balance: true })
    } else if (ruolo === 'dettagli') {
      // una voce per riga, nel carattere delle etichette
      font = g.s.label
      const n = testo.split('\n').length
      f = fit({ text: testo, font, maxW: w, maxH: h * 1.2, maxSize: Math.max(g.sc.note, (s.corpo ?? 0) * H), minSize: g.sc.minNota, maxLines: n * 2, leading: 1.3, tracking: 0.12, upper: true })
    } else if (famiglia === 'etichetta' || ruolo === 'marchio' || ruolo === 'invito' || ruolo === 'dettagli' || ruolo === 'occhiello') {
      font = g.s.label
      f = lab(g, testo, w, (s.corpo ?? 0) * H / g.u, ruolo === 'dettagli')
      // un'etichetta che non sta su una riga (dettagli lunghi) va a capo nel testo corrente
      if (!f && ruolo === 'occhiello') { font = g.s.text; f = para(g, testo, w, 3) }
    } else {
      font = g.s.text
      const righe = clamp(Math.floor(h / (g.sc.testo * 1.45)), 2, 9)
      f = para(g, testo, w, righe, (s.corpo ?? 0) * H / g.u)
    }
    if (f && f.h <= h * 1.15) break
    f = null
  }
  if (!f) return null
  const x0 = align === 'left' ? bx : align === 'center' ? bx + (bw - f.w) / 2 : bx + bw - f.w
  // dentro i margini, se la riga ci sta (il controllo dei bordi scarterebbe la tavola)
  const x = f.w <= W - 2 * g.m ? clamp(x0, g.m, W - g.m - f.w) : x0
  // dentro i margini in alto e in basso (nella storia anche fuori dalle zone dell'interfaccia)
  const y = f.h <= g.B - g.T ? clamp(by, g.T, g.B - f.h) : by
  const fondo = sotto(g, x + f.w / 2, y + f.h / 2)
  let color = col(s.colore, 'inchiostro')
  if (contrast(color, fondo) < (grande ? 3 : 4.5)) color = readable(fondo, [g.P.fg, g.P.bg, g.P.acc, '#111111', '#ffffff'], grande ? 3 : 4.5)
  const angle = s.angolo && Math.abs(s.angolo) <= 15 || Math.abs(s.angolo ?? 0) === 90 ? s.angolo : undefined
  const leading = f.leading ?? (grande ? g.s.displayLeading : font === g.s.label ? 1.25 : 1.43)
  const tracking = f.tracking ?? (font === g.s.label ? 0.14 : grande ? g.s.displayTracking ?? 0 : 0)
  const chars = ruolo === 'titolo' && font === g.s.display ? accentChars(g, f.lines, color, fondo) : undefined
  return txt(g, { name: NOME[ruolo], lines: f.lines, font, size: f.size, x, y, color, align, w: f.w, leading, tracking, ...(angle ? { angle } : {}), ...(chars ? { chars } : {}) })
}

/** Il sistema `esempi`: il programma nei regolatori (k.programma), poi i controlli di sempre. */
export function sistemaEsempi(g: G): Scene | null {
  const p = g.k.programma
  if (!p) return null
  if (!applicaProgramma(g, p)) return null
  return finish(g, 'esempi', `Da esempi ${g.k.esempi?.slice(0, 2).join(' + ') ?? ''}`.trim())
}

/* ── programmi simulati: imitare i principi, non la tavola ──────────────── */

const ruoliTesto = new Set<string>(RUOLI_TESTO)
const copia = <T,>(x: T): T => JSON.parse(JSON.stringify(x))

/** Quanto un programma somiglia all'esempio più vicino (1 = identico). */
export function somiglianza(p: Programma, esempi: Esempio[]): number {
  const im = impronta(p)
  return esempi.length ? Math.max(...esempi.map(e => 1 - Math.min(1, distanza(im, e.impronta) * 3))) : 0
}

/**
 * Un programma nuovo da 2–3 esempi: l'ossatura (posizioni di testi, foto e
 * campi) di uno, la tipografia (voci, maiuscolo, rapporti di corpo,
 * allineamento) di un altro, i ruoli di colore di un terzo; poi specchio,
 * spostamenti e poli di scala. Se somiglia troppo a un esempio, si muta ancora.
 */
export function programmaSimulato(c: DesignContent, format: Format, esempi: Esempio[], seme: number, hasPhoto = false): Programma {
  const r = rng(seme ^ hashText(c.title))
  const [base, tipo, colore] = scegliTre(esempi, r)
  const [W, H] = FORMAT_SIZE[format]
  let strati: Strato[] = copia(base.programma.strati)
  // tipografia: le scelte dell'esempio "tipo" per ruolo, e il suo rapporto tra titolo e testi
  const tt = new Map(testiDi(tipo.programma).map(s => [s.ruolo, s]))
  const titB = testiDi(base.programma).find(s => s.ruolo === 'titolo')?.corpo ?? 0.08
  const titT = tt.get('titolo')?.corpo ?? titB
  for (const s of strati) {
    if (!ruoliTesto.has(s.ruolo)) continue
    const t = tt.get(s.ruolo)
    if (t) { s.famiglia = t.famiglia; s.maiuscolo = t.maiuscolo; s.allinea = t.allinea ?? s.allinea; s.corsivo = t.corsivo }
    if (s.ruolo === 'titolo') s.corpo = r3(clamp((s.corpo ?? titB) * (0.75 + (titT / Math.max(0.01, titB)) * 0.25) * r.range(0.85, 1.3), 0.03, 0.4))
  }
  // colore: i ruoli dell'esempio "colore" sul fondo e sulle forme, nell'ordine
  const fondoC = colore.programma.strati.find(s => s.ruolo === 'fondo')?.colore ?? 'fondo'
  const tinte = colore.programma.strati.filter(s => s.ruolo === 'campo' || s.ruolo === 'disco').map(s => s.colore ?? 'accento')
  let k = 0
  for (const s of strati) {
    if (s.ruolo === 'fondo') s.colore = fondoC
    else if ((s.ruolo === 'campo' || s.ruolo === 'disco') && tinte.length) s.colore = tinte[k++ % tinte.length]
  }
  // foto: con la foto del brief serve un posto (preso in prestito da un altro esempio); senza, il posto diventa un campo
  const foto = strati.find(s => s.ruolo === 'foto')
  if (hasPhoto && !foto) {
    const altro = esempi.find(e => e.programma.strati.some(s => s.ruolo === 'foto' && s.box[2] * s.box[3] > 0.1))
    const f = altro?.programma.strati.find(s => s.ruolo === 'foto' && s.box[2] * s.box[3] > 0.1)
    if (f) strati.splice(1, 0, copia(f))
  } else if (!hasPhoto && foto) { foto.ruolo = 'campo'; foto.colore = foto.colore ?? 'superficie' }
  // mutazioni: specchio, spostamenti, adattamento al formato (le frazioni restano, i corpi seguono l'altezza)
  const specchio = r.chance(0.5), capovolgi = r.chance(0.2)
  const dx = r.range(-0.03, 0.03), dy = r.range(-0.03, 0.03)
  const muta = (s: Strato, forte: number) => {
    let [x, y, w, h] = s.box
    if (s.ruolo === 'fondo') return
    if (specchio) { x = 1 - x - w; if (s.allinea === 'left') s.allinea = 'right'; else if (s.allinea === 'right') s.allinea = 'left' }
    if (capovolgi && !ruoliTesto.has(s.ruolo)) y = 1 - y - h
    x += dx * forte + r.range(-0.015, 0.015) * forte; y += dy * forte + r.range(-0.015, 0.015) * forte
    if (ruoliTesto.has(s.ruolo)) { w = clamp(w * r.range(0.95, 1.15), 0.12, 0.96); x = clamp(x, 0.03, 0.97 - w) }
    s.box = [r3(x), r3(y), r3(w), r3(h)]
    if (s.corpo && format !== 'quadrato') s.corpo = r3(clamp(s.corpo * (W / H > 1 ? 0.9 : 1), 0.006, 0.45))
  }
  for (const s of strati) muta(s, 1)
  // le forme più piccole si tolgono (rumore della decompilazione): restano le 7 maggiori
  const forme = strati.filter(s => s.ruolo === 'campo' || s.ruolo === 'disco' || s.ruolo === 'filetto').sort((a, b) => b.box[2] * b.box[3] - a.box[2] * a.box[3])
  const via = new Set(forme.slice(7))
  strati = strati.filter(s => !via.has(s))
  let p: Programma = { rapporto: r3(W / H), strati }
  // non copiare: se somiglia troppo a un esempio, si sposta il blocco dei testi
  for (let i = 0; i < 3 && somiglianza(p, esempi) > 0.9; i++) for (const s of p.strati) if (ruoliTesto.has(s.ruolo)) { s.box = [s.box[0], r3(clamp(1 - s.box[1] - s.box[3], 0.03, 0.9)), s.box[2], s.box[3]] }
  // valori dentro lo schema: i testi minuscoli degli esempi e i riquadri oltre il bordo si riportano nei limiti
  for (const s of p.strati) {
    if (s.corpo !== undefined) s.corpo = r3(clamp(s.corpo, 0.006, 0.45))
    s.box = s.box.map(v => r3(clamp(v, -0.15, 1.15))) as Strato['box']
    if (s.angolo !== undefined) s.angolo = clamp(s.angolo, -90, 90)
  }
  p.strati = p.strati.slice(0, 40)
  return programmaSchema.parse(p)
}

function scegliTre(esempi: Esempio[], r: Rng): [Esempio, Esempio, Esempio] {
  const l = [...esempi].sort(() => r.next() - 0.5)
  const base = l[0], tipo = l.find(e => e !== base) ?? base, colore = l.find(e => e !== base && e !== tipo) ?? tipo
  return [base, tipo, colore]
}

/* ── la chiamata al modello ─────────────────────────────────────────────── */

/** Un esempio compatto per il prompt: principi in una riga e al più 12 strati arrotondati. */
function esempioPerPrompt(e: Esempio, i: number) {
  const strati = [...e.programma.strati].filter(s => s.ruolo !== 'campo' || s.box[2] * s.box[3] > 0.01).slice(0, 12)
    .map(s => ({ ...s, box: s.box.map(v => Math.round(v * 100) / 100) }))
  const pr = `griglia ${e.griglia.asse}, ${e.griglia.colonne} colonne, margini ${e.griglia.margini.map(v => v.toFixed(2)).join('/')}; titolo ${(e.tipografia.titolo * 100).toFixed(0)}% dell'altezza, contrasto di corpi ${e.tipografia.contrasto.toFixed(1)}, maiuscolo ${(e.tipografia.maiuscolo * 100).toFixed(0)}%; tono ${e.tono.join(', ')}${e.epoca ? `; ${e.epoca}` : ''}`
  return `Esempio ${i + 1} (${e.settore.join(', ') || 'generico'}): ${pr}\n${JSON.stringify({ rapporto: e.programma.rapporto, strati })}`
}

/** Il prompt: brief, formato, campi presenti, 5–10 esempi, regole e schema. */
export function promptEsempi(c: DesignContent, format: Format, esempi: Esempio[], quanti = 3) {
  const [W, H] = FORMAT_SIZE[format]
  const campi = RUOLI_TESTO.filter(r => contenuto(c, r)?.trim())
  return [
    'Sei un art director. Impagini un post scrivendo un programma di strati in JSON, come quelli degli esempi (manifesti e grafiche vere, decompilati).',
    'Impara dagli esempi i PRINCIPI: griglia, gerarchia, rapporti di scala, ritmo, uso del vuoto, dove sta la foto, come il colore separa le zone. Non copiare nessun esempio: nessuno strato con la stessa geometria (scarto minimo 0,05), nessuna sequenza di strati identica.',
    `Tavola: ${format}, ${W}×${H} (rapporto ${(W / H).toFixed(2)}). Geometria in frazioni [x, y, larghezza, altezza]. Colori solo per ruolo: fondo, inchiostro, accento, accento2, tenue, superficie (la palette la sceglie il motore). Voci: display, impatto, testo, etichetta.`,
    `Campi del brief da impaginare tutti, ognuno in un solo strato: ${campi.join(', ')}.${c.imageUrl || c.immagini?.length ? ' C\'è una foto: uno strato "foto".' : ' Nessuna foto: niente strato "foto".'}`,
    `Brief: ${[c.brand, c.kicker, c.title, c.body, ...(c.details ?? []), c.cta, c.numero].filter(Boolean).join(' · ')}`,
    'Esempi:', ...esempi.map(esempioPerPrompt),
    `Scrivi ${quanti} programmi diversi tra loro. Rispondi solo con un array JSON: [{"strati":[{"ruolo":"fondo|campo|disco|filetto|foto|titolo|occhiello|testo|dettagli|invito|marchio|numero","box":[x,y,w,h],"colore":"…","famiglia":"…","maiuscolo":true|false,"allinea":"left|center|right","corpo":0.0-0.4,"angolo":gradi}]}]`,
  ].join('\n')
}

/** Legge la risposta: i programmi validi, con il titolo, non copie degli esempi. */
export function leggiProgrammi(testo: string, esempi: Esempio[] = []): Programma[] {
  let grezzi: unknown
  try {
    const a = testo.indexOf('['), o = testo.indexOf('{')
    grezzi = JSON.parse(a >= 0 && (o < 0 || a < o) ? testo.slice(a, testo.lastIndexOf(']') + 1) : testo.slice(o, testo.lastIndexOf('}') + 1))
  } catch { return [] }
  const lista = Array.isArray(grezzi) ? grezzi : [grezzi]
  return lista.flatMap(x => {
    const p = programmaSchema.safeParse(x)
    if (!p.success || !p.data.strati.some(s => s.ruolo === 'titolo')) return []
    if (esempi.length && somiglianza(p.data, esempi) > 0.95) return []
    return [p.data]
  })
}

export type Chiedi = (prompt: string) => Promise<string>

/** I programmi del brief: con il modello (una chiamata), i simulati se la risposta non regge. */
export async function chiediProgrammi(c: DesignContent, format: Format, esempi: Esempio[], o: { chiedi: Chiedi; quanti?: number; seme?: number; hasPhoto?: boolean }): Promise<{ programmi: Programma[]; fonte: 'modello' | 'simulato' }> {
  const quanti = o.quanti ?? 3
  try {
    const p = leggiProgrammi(await o.chiedi(promptEsempi(c, format, esempi, quanti)), esempi)
    if (p.length) return { programmi: p.slice(0, quanti), fonte: 'modello' }
  } catch { /* la risposta non regge: i simulati */ }
  return { programmi: Array.from({ length: quanti }, (_, i) => programmaSimulato(c, format, esempi, (o.seme ?? 0) + i * 7919, o.hasPhoto)), fonte: 'simulato' }
}

/** La chiamata a secco per la vetrina: risponde con programmi costruiti dagli esempi, passa dal lettore e conta i token che costerebbe. */
export function simulatoEsempi(c: DesignContent, format: Format, esempi: Esempio[], o: { seme?: number; hasPhoto?: boolean; conta?: { chiamate: number; token: number } } = {}): Chiedi {
  return async prompt => {
    const n = Number(prompt.match(/Scrivi (\d+) programmi/)?.[1] ?? 3)
    const risposta = JSON.stringify(Array.from({ length: n }, (_, i) => programmaSimulato(c, format, esempi, (o.seme ?? 0) + i * 7919, o.hasPhoto)))
    if (o.conta) { o.conta.chiamate++; o.conta.token += Math.ceil((prompt.length + Math.min(risposta.length, 6000)) / 4) }
    return risposta
  }
}
