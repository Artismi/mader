/**
 * La forma delle cose: com'è fatta una cosa concreta, imparato da come la disegnano le persone
 * (Quick, Draw! Dataset, Google, CC BY 4.0: migliaia di schizzi per cosa; ne tiene i più tipici, cioè i medoidi).
 * Dalla forma ricava uno STAMPO (la sagoma piena, dove la cosa c'è e dove no, da dove si comincia a disegnarla),
 * e lo stampo non lo ricalca: ci fa crescere dentro i suoi generatori migliori.
 *  - crescita: la colonizzazione dello spazio (il simulatore dell'albero) con il nutrimento sparso nella sagoma:
 *    la mano, il pesce, la casa crescono come piante;
 *  - universo: cerca nella biblioteca degli universi l'indirizzo che più somiglia alla sagoma (prima un filtro
 *    veloce su tanti indirizzi, poi il confronto sui migliori) e lo stende dentro la forma: la forma la trova, non la disegna;
 *  - a memoria: ridisegna la forma con la sua mano (il tratto trema, si ingrossa, si interrompe), mai uguale due volte.
 */
import { newCanvas } from './sheet'
import { disegnaAlbero } from './albero'
import { crescitaCamera, cercaCamere } from './camera'

export interface Forma { en: string; n: number; mappa: string; pieno: string; tipici: number[][][][]; inizio: [number, number]; proporzione: number }
let FORME: Record<string, Forma> | null = null
export async function caricaForme(): Promise<Record<string, Forma>> {
  if (FORME) return FORME
  try { FORME = (await (await fetch('/forme/forme.json')).json()).forme as Record<string, Forma> } catch { FORME = {} }
  return FORME!
}
/** la forma per una parola (anche al plurale o con l'iniziale maiuscola) */
export function formaDi(forme: Record<string, Forma>, parola: string): Forma | null {
  const p = parola.toLowerCase().trim()
  if (forme[p]) return forme[p]
  for (const k of Object.keys(forme)) if (k.length > 3 && (p.startsWith(k.slice(0, -1)) && Math.abs(p.length - k.length) <= 2)) return forme[k]
  return null
}

export interface Stampo { W: number; H: number; dentro: Uint8Array; tratto: HTMLCanvasElement; inizio: [number, number] }
/** la sagoma piena di uno schizzo tipico, a misura S (griglia G per la maschera) */
export function stampoDi(f: Forma, k: number, S: number, G = 160): Stampo {
  const dr = f.tipici[k % f.tipici.length]
  const tr = newCanvas(S, S), g = tr.getContext('2d')!
  g.strokeStyle = '#000'; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = S * 0.012
  for (const s of dr) { g.beginPath(); s[0].forEach((x, i) => { const X = (x / 255) * S, Y = (s[1][i] / 255) * S; i ? g.lineTo(X, Y) : g.moveTo(X, Y) }); g.stroke() }
  // maschera: il tratto ingrossato a griglia, poi riempio tutto ciò che non si raggiunge dal bordo
  const m = newCanvas(G, G), mg = m.getContext('2d', { willReadFrequently: true })!
  mg.lineCap = 'round'; mg.lineJoin = 'round'; mg.lineWidth = G * 0.035; mg.strokeStyle = '#000'
  for (const s of dr) { mg.beginPath(); s[0].forEach((x, i) => { const X = (x / 255) * G, Y = (s[1][i] / 255) * G; i ? mg.lineTo(X, Y) : mg.moveTo(X, Y) }); if (s[0].length === 1) mg.lineTo((s[0][0] / 255) * G + 0.5, (s[1][0] / 255) * G); mg.stroke() }
  const d = mg.getImageData(0, 0, G, G).data, muro = new Uint8Array(G * G), fuori = new Uint8Array(G * G)
  for (let i = 0; i < G * G; i++) muro[i] = d[i * 4 + 3] > 40 ? 1 : 0
  const q: number[] = []
  for (let i = 0; i < G; i++) for (const j of [i, (G - 1) * G + i, i * G, i * G + G - 1]) if (!muro[j] && !fuori[j]) { fuori[j] = 1; q.push(j) }
  while (q.length) { const j = q.pop()!, x = j % G, y = (j / G) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= G || yy >= G) continue; const n = yy * G + xx; if (!muro[n] && !fuori[n]) { fuori[n] = 1; q.push(n) } } }
  const dentro = new Uint8Array(G * G); for (let i = 0; i < G * G; i++) dentro[i] = fuori[i] ? 0 : 1
  return { W: G, H: G, dentro, tratto: tr, inizio: [dr[0][0][0] / 255, dr[0][1][0] / 255] }
}

/** la crescita nello stampo: il nutrimento sta dentro la sagoma (più fitto lungo il contorno, che dà la forma) */
export function crescitaNelloStampo(st: Stampo, seme: number, colore: string, S: number, fino = 1): HTMLCanvasElement {
  let a = seme >>> 0; const r = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296)
  const G = st.W, punti: [number, number][] = []
  const bordo = (i: number) => { const x = i % G, y = (i / G) | 0; return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !st.dentro[(y + dy) * G + x + dx]) }
  const celle: number[] = [], contorno: number[] = []
  for (let i = 0; i < G * G; i++) if (st.dentro[i]) { celle.push(i); if (bordo(i)) contorno.push(i) }
  if (celle.length < 20) return newCanvas(S, S)
  const nP = 900
  for (let k = 0; k < nP; k++) { const src = r() < 0.45 && contorno.length ? contorno : celle, i = src[Math.floor(r() * src.length)]; punti.push([((i % G) + r()) / G, (((i / G) | 0) + r()) / G]) }
  // la radice: il punto più basso della sagoma (le cose poggiano), o dove la gente comincia a disegnarla
  let bassa = celle[0]; for (const i of celle) if (((i / G) | 0) > ((bassa / G) | 0)) bassa = i
  const radice: [number, number] = r() < 0.7 ? [((bassa % G) + 0.5) / G, (((bassa / G) | 0) + 0.5) / G] : st.inizio
  return disegnaAlbero(seme, colore, S, 'albero', fino, 0, { punti, radici: [radice] })
}

/** cerca nella biblioteca degli universi l'indirizzo più somigliante alla sagoma; lo restituisce già ritagliato nella forma */
export function universoSimile(st: Stampo, seme: number, colore: string, S: number, candidati = 48): { tela: HTMLCanvasElement; indirizzo: string; somiglianza: number } {
  const G = st.W, cand = cercaCamere(String(seme), candidati, 1500)
  const piccola = 48
  let best = { ind: cand[0]?.indirizzo ?? String(seme), v: -1 }
  for (const c of cand) {
    // l'universo a misura piccola: dove ha inchiostro, confrontato con la sagoma (somiglianza di Jaccard)
    let cv: HTMLCanvasElement
    try { cv = crescitaCamera(c.indirizzo, { S: piccola, colore: '#000', fondo: null })(1) } catch { continue }
    const d = cv.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, piccola, piccola).data
    let inter = 0, uni = 0
    for (let y = 0; y < piccola; y++) for (let x = 0; x < piccola; x++) {
      const a = d[(y * piccola + x) * 4 + 3] > 60, b = st.dentro[Math.floor((y / piccola) * G) * G + Math.floor((x / piccola) * G)] === 1
      if (a && b) inter++; if (a || b) uni++
    }
    const v = inter / Math.max(1, uni)
    if (v > best.v) best = { ind: c.indirizzo, v }
  }
  const tela = crescitaCamera(best.ind, { S, colore, fondo: null })(1)
  // ritaglio morbido nella forma: l'universo resta solo dentro la sagoma
  const m = newCanvas(S, S), mg = m.getContext('2d')!, mm = newCanvas(G, G), mmg = mm.getContext('2d')!, id = mmg.createImageData(G, G)
  for (let i = 0; i < G * G; i++) id.data[i * 4 + 3] = st.dentro[i] ? 255 : 0
  mmg.putImageData(id, 0, 0); mg.filter = `blur(${S * 0.006}px)`; mg.drawImage(mm, 0, 0, S, S)
  const out = newCanvas(S, S), og = out.getContext('2d')!; og.drawImage(tela, 0, 0); og.globalCompositeOperation = 'destination-in'; og.drawImage(m, 0, 0)
  return { tela: out, indirizzo: best.ind, somiglianza: best.v }
}

/** a memoria: la forma ridisegnata con la sua mano (tremolio, spessore che respira, qualche interruzione) */
export function aMemoria(f: Forma, k: number, seme: number, colore: string, S: number, spessore = 0.008): HTMLCanvasElement {
  let a = seme >>> 0; const r = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296)
  const dr = f.tipici[k % f.tipici.length], out = newCanvas(S, S), g = out.getContext('2d')!
  g.strokeStyle = colore; g.lineCap = 'round'; g.lineJoin = 'round'
  const dev = S * 0.006
  for (const s of dr) {
    const pts = s[0].map((x, i) => [(x / 255) * S * 0.9 + S * 0.05 + (r() - 0.5) * dev, (s[1][i] / 255) * S * 0.9 + S * 0.05 + (r() - 0.5) * dev])
    for (let i = 1; i < pts.length; i++) {
      if (r() < 0.03) continue
      g.lineWidth = S * spessore * (0.6 + r() * 0.8)
      g.beginPath(); g.moveTo(pts[i - 1][0], pts[i - 1][1]); g.lineTo(pts[i][0], pts[i][1]); g.stroke()
    }
  }
  return out
}
