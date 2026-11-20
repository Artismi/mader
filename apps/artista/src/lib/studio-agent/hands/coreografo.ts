/**
 * Il coreografo: il reel come scena di oggetti che si muovono, non come immagine filtrata.
 *
 * 1. SCENA. Ogni tavola resta smontata: i suoi livelli; quelli a tutta pagina si dividono in oggetti (le componenti
 *    connesse della loro trasparenza). La gerarchia è tavola → livello → oggetto: i padri si muovono, i figli seguono
 *    con ritardo e inerzia (il "follow-through" dell'animazione classica). Dai concetti nascono elementi nuovi:
 *    i legami (linee tra gli oggetti principali) e le linee di costruzione (allineamenti sui bordi degli oggetti).
 * 2. VERBI. Ogni oggetto ha un ingresso (componi, traccia, cresci, cadi, scrivi, appari), una vita (vibra, ondeggia,
 *    respira, orbita, scivola, fermo) e un'uscita (sfalda, via, ritrai, resta). Le molle sono molle vere (oscillatore
 *    smorzato in forma chiusa), non sinusoidi.
 * 3. SEGNALI. Ogni vita è guidata da un segnale (cassa, rullante, charleston, battuta, energia, o il padre) attraverso
 *    un trasduttore: guadagno, ritardo, smussatura, aggancio al battito. Gli ingressi sono sfalsati per ordine
 *    (per grandezza, da sinistra, dall'alto, a caso): lo spazio e il tempo si dividono insieme.
 * 4. SIGNIFICATO. La relazione che la tavola argomenta diventa una relazione tra i due gruppi principali:
 *    contrasto → controfase; causa → il secondo parte quando il primo arriva; somiglianza → all'unisono;
 *    sequenza → canone; dubbio → esitazione. Sono ipotesi di partenza: i pesi si spostano con l'esperienza.
 * 5. EVOLUZIONE. Molte coreografie si simulano senza disegnarle e si misurano: quanti oggetti importanti si muovono
 *    insieme (attenzione), quanto i movimenti cadono sui colpi (sincronia), quanta quiete c'è (respiro), varietà
 *    dei gesti, novità rispetto a quelle già fatte. Vince la migliore; i suoi gesti si rafforzano nella memoria.
 */
import { Muxer, ArrayBufferTarget } from 'mp4-muxer'
import type { Layer, Sheet } from './sheet'
import type { Brano } from '../suono/beat'

const W = 720, H = 1280, FPS = 30

export type Ingresso = 'componi' | 'traccia' | 'cresci' | 'cadi' | 'scrivi' | 'appari'
export type Vita = 'vibra' | 'ondeggia' | 'respira' | 'orbita' | 'scivola' | 'fermo'
export type Uscita = 'sfalda' | 'via' | 'ritrai' | 'resta'
export type Segnale = 'k' | 's' | 'h' | 'bar' | 'energia' | 'padre'
export type Ordine = 'grandezza' | 'sinistra' | 'alto' | 'caso' | 'centro'
export type Ruolo = 'fondo' | 'trama' | 'figura' | 'testo' | 'linea'
export type Accoppiamento = 'controfase' | 'causa' | 'unisono' | 'canone' | 'esitazione' | 'libero'
const INGR: Ingresso[] = ['componi', 'traccia', 'cresci', 'cadi', 'scrivi', 'appari']
const VITE: Vita[] = ['vibra', 'ondeggia', 'respira', 'orbita', 'scivola', 'fermo']
const USC: Uscita[] = ['sfalda', 'via', 'ritrai', 'resta']
const SEGN: Segnale[] = ['k', 's', 'h', 'bar', 'energia', 'padre']
const ORD: Ordine[] = ['grandezza', 'sinistra', 'alto', 'caso', 'centro']
const RUOLI: Ruolo[] = ['fondo', 'trama', 'figura', 'testo', 'linea']
export const ACCOPPIAMENTI: Accoppiamento[] = ['controfase', 'causa', 'unisono', 'canone', 'esitazione', 'libero']
/** le ipotesi di partenza: relazione → accoppiamento */
export const PRIOR: Record<string, Partial<Record<Accoppiamento, number>>> = {
  contrasto: { controfase: 2 }, causa: { causa: 2 }, somiglianza: { unisono: 2 }, sequenza: { canone: 2 }, dubbio: { esitazione: 2 }, esempio: { causa: 1, canone: 1 },
}

// ── geometria della scena ──
interface Nodo {
  id: number; ruolo: Ruolo; tav: number; gruppo: 0 | 1 // gruppo: i due gruppi principali della tavola
  sprite?: HTMLCanvasElement; x: number; y: number; w: number; h: number; rot: number; alpha: number; blend: GlobalCompositeOperation
  linea?: { punti: [number, number][]; spess: number; colore: string }
  padre: number | null; indice: number; area: number
  particelle?: { x: number; y: number; c: string }[]
}
interface Scena { nodi: Nodo[]; bg: string[]; tavole: number }

function rng(seed: number) { let a = seed >>> 0 || 1; return () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296) }
const uno = <T,>(r: () => number, a: T[]) => a[Math.floor(r() * a.length)]
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x))

const TESTO = new Set(['testo', 'tipografia', 'etichette', 'firma', 'piastra'])
const ATMO = new Set(['campo', 'colore', 'color', 'grana', 'duotono', 'shader', 'luce', 'materia', 'ombra'])
const TRAMA = new Set(['pattern', 'retino', 'ornato', 'caleido', 'flusso', 'sfasa', 'onde', 'punti', 'pannelli', 'orizzonte', 'mappa'])

/** le componenti connesse della trasparenza di un livello: ognuna diventa un oggetto */
function componenti(cv: HTMLCanvasElement, cella: number, max: number) {
  const gw = Math.ceil(cv.width / cella), gh = Math.ceil(cv.height / cella)
  const t = document.createElement('canvas'); t.width = gw; t.height = gh
  const g = t.getContext('2d')!; g.drawImage(cv, 0, 0, gw, gh)
  const d = g.getImageData(0, 0, gw, gh).data
  const pieno = new Uint8Array(gw * gh); for (let i = 0; i < gw * gh; i++) pieno[i] = d[i * 4 + 3] > 24 ? 1 : 0
  // un livello pieno (quasi tutto opaco) non ha forme nella trasparenza: le cerca nel colore.
  // Il colore più presente sui bordi è il suo fondo; il resto, per vicinanza di colore, sono le forme.
  let fondo: number[] | null = null
  const copertura = pieno.reduce((a, b) => a + b, 0) / (gw * gh)
  if (copertura > 0.85) {
    const conta = new Map<string, { n: number; c: number[] }>()
    for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) if (x === 0 || y === 0 || x === gw - 1 || y === gh - 1) { const i = (y * gw + x) * 4; const k = [d[i] >> 5, d[i + 1] >> 5, d[i + 2] >> 5].join(); const e = conta.get(k) ?? { n: 0, c: [d[i], d[i + 1], d[i + 2]] }; e.n++; conta.set(k, e) }
    fondo = [...conta.values()].sort((a, b) => b.n - a.n)[0]?.c ?? null
    if (fondo) for (let i = 0; i < gw * gh; i++) { const dd = Math.abs(d[i * 4] - fondo[0]) + Math.abs(d[i * 4 + 1] - fondo[1]) + Math.abs(d[i * 4 + 2] - fondo[2]); pieno[i] = pieno[i] && dd > 60 ? 1 : 0 }
  }
  const lab = new Int32Array(gw * gh).fill(-1), out: { x0: number; y0: number; x1: number; y1: number; n: number; celle: number[] }[] = []
  for (let i = 0; i < gw * gh; i++) {
    if (!pieno[i] || lab[i] >= 0) continue
    const c = { x0: 1e9, y0: 1e9, x1: -1, y1: -1, n: 0, celle: [] as number[] }, st = [i]; lab[i] = out.length
    while (st.length) {
      const k = st.pop()!, x = k % gw, y = (k / gw) | 0
      c.n++; c.celle.push(k); c.x0 = Math.min(c.x0, x); c.y0 = Math.min(c.y0, y); c.x1 = Math.max(c.x1, x); c.y1 = Math.max(c.y1, y)
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= gw || yy >= gh) continue; const j = yy * gw + xx; if (pieno[j] && lab[j] < 0) { lab[j] = out.length; st.push(j) } }
    }
    out.push(c)
  }
  out.sort((a, b) => b.n - a.n)
  return { comp: out.slice(0, max), resto: out.length > max, gw, gh, cella, fondo }
}

/** smonta le tavole in una scena di oggetti */
export function smonta(fogli: Sheet[], r: () => number): Scena {
  const nodi: Nodo[] = []
  let id = 0
  for (const [ti, s] of fogli.entries()) {
    const k = W / s.W // la tavola occupa la larghezza del video, centrata in altezza
    const oy = (H - s.H * k) / 2
    const radice: Nodo = { id: id++, ruolo: 'fondo', tav: ti, gruppo: 0, x: W / 2, y: H / 2, w: W, h: H, rot: 0, alpha: 1, blend: 'source-over', padre: null, indice: 0, area: 0 }
    nodi.push(radice)
    const M = Math.min(s.W, s.H)
    s.layers.forEach((l: Layer, li) => {
      const side = M * l.scale * k, kk = side / Math.max(l.canvas.width, l.canvas.height)
      const cx = l.x * s.W * k, cy = oy + l.y * s.H * k
      const ruolo: Ruolo = TESTO.has(l.kind) ? 'testo' : ATMO.has(l.kind) ? 'fondo' : TRAMA.has(l.kind) || (l.scale >= 1.15 && l.blend !== 'source-over') ? 'trama' : 'figura'
      const pieno = ruolo === 'fondo' && l.scale >= 0.99
      const kc = pieno ? Math.max(W / l.canvas.width, H / l.canvas.height) : kk
      const intero = (): Nodo => ({ id: id++, ruolo, tav: ti, gruppo: (li % 2) as 0 | 1, sprite: l.canvas, x: pieno ? W / 2 : cx, y: pieno ? H / 2 : cy, w: l.canvas.width * kc, h: l.canvas.height * kc, rot: l.rot, alpha: l.alpha, blend: l.blend, padre: radice.id, indice: li, area: l.canvas.width * kk * l.canvas.height * kk })
      // i livelli di figura grandi si dividono negli oggetti che contengono
      if ((ruolo === 'figura' || ruolo === 'trama') && !l.flipX && l.canvas.width * l.canvas.height > 160 * 160) {
        const C = componenti(l.canvas, Math.max(3, Math.round(Math.max(l.canvas.width, l.canvas.height) / 220)), 40)
        if (C.comp.length >= 1 && (C.fondo || C.comp.length >= 2) && !C.resto) {
          const gruppo: Nodo = { ...intero(), sprite: undefined }
          nodi.push(gruppo)
          // il fondo del livello pieno: un piano di colore, sotto i suoi pezzi
          if (C.fondo) { const pf = document.createElement('canvas'); pf.width = 4; pf.height = 4; const pg = pf.getContext('2d')!; pg.fillStyle = `rgb(${C.fondo.join(',')})`; pg.fillRect(0, 0, 4, 4); nodi.push({ ...intero(), ruolo: 'fondo', sprite: pf, padre: gruppo.id }) }
          C.comp.forEach((c, ci) => {
            const x0 = c.x0 * C.cella, y0 = c.y0 * C.cella, w = (c.x1 - c.x0 + 1) * C.cella, h = (c.y1 - c.y0 + 1) * C.cella
            if (w * h * kk * kk < 30) return
            const sp = document.createElement('canvas'); sp.width = Math.max(1, Math.round(w)); sp.height = Math.max(1, Math.round(h))
            const g = sp.getContext('2d')!
            g.drawImage(l.canvas, x0, y0, w, h, 0, 0, w, h)
            // solo la sua componente: maschera dalle celle
            const m = document.createElement('canvas'); m.width = sp.width; m.height = sp.height; const mg = m.getContext('2d')!; mg.fillStyle = '#000'
            for (const q of c.celle) { const qx = (q % C.gw) * C.cella - x0, qy = Math.floor(q / C.gw) * C.cella - y0; mg.fillRect(qx - 1, qy - 1, C.cella + 2, C.cella + 2) }
            g.globalCompositeOperation = 'destination-in'; g.filter = `blur(${Math.max(1, C.cella * 0.35)}px)`; g.drawImage(m, 0, 0); g.filter = 'none'
            const lx = (x0 + w / 2 - l.canvas.width / 2) * kk, ly = (y0 + h / 2 - l.canvas.height / 2) * kk
            nodi.push({ id: id++, ruolo: 'figura', tav: ti, gruppo: (ci % 2) as 0 | 1, sprite: sp, x: cx + lx, y: cy + ly, w: w * kk, h: h * kk, rot: 0, alpha: l.alpha, blend: l.blend, padre: gruppo.id, indice: ci, area: w * h * kk * kk })
          })
          return
        }
      }
      nodi.push(intero())
    })
    // i legami: linee tra i centri dei tre oggetti di figura più grandi della tavola
    const fig = nodi.filter(n => n.tav === ti && n.ruolo === 'figura' && n.sprite).sort((a, b) => b.area - a.area).slice(0, 3)
    const ink = lum(s.bg) > 0.5 ? '#111111' : '#f4f2ec'
    for (let i = 0; i + 1 < fig.length; i++) {
      const a = fig[i], b = fig[i + 1], mx = (a.x + b.x) / 2 + (r() - 0.5) * 120, my = (a.y + b.y) / 2 + (r() - 0.5) * 120
      const punti: [number, number][] = []; for (let q = 0; q <= 24; q++) { const t = q / 24; punti.push([(1 - t) ** 2 * a.x + 2 * (1 - t) * t * mx + t * t * b.x, (1 - t) ** 2 * a.y + 2 * (1 - t) * t * my + t * t * b.y]) }
      nodi.push({ id: id++, ruolo: 'linea', tav: ti, gruppo: (i % 2) as 0 | 1, x: 0, y: 0, w: 0, h: 0, rot: 0, alpha: 0.9, blend: 'source-over', padre: radice.id, indice: i, area: 0, linea: { punti, spess: 2 + r() * 3, colore: ink } })
    }
    // le linee di costruzione: allineamenti sui bordi dei due oggetti più grandi
    for (const [i, f] of fig.slice(0, 2).entries()) {
      const vert = r() < 0.5, p = vert ? f.x - f.w / 2 : f.y - f.h / 2
      nodi.push({ id: id++, ruolo: 'linea', tav: ti, gruppo: (i % 2) as 0 | 1, x: 0, y: 0, w: 0, h: 0, rot: 0, alpha: 0.5, blend: 'source-over', padre: radice.id, indice: 10 + i, area: 0, linea: { punti: vert ? [[p, 0], [p, H]] : [[0, p], [W, p]], spess: 1.2, colore: ink } })
    }
    // le particelle delle figure (per sfaldarsi): punti presi dai loro pixel
    for (const f of fig) {
      if (!f.sprite) continue
      const t = document.createElement('canvas'), gw = 28, gh = Math.max(1, Math.round(28 * f.sprite.height / f.sprite.width)); t.width = gw; t.height = gh
      const g = t.getContext('2d')!; g.drawImage(f.sprite, 0, 0, gw, gh); const d = g.getImageData(0, 0, gw, gh).data
      f.particelle = []
      for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) { const i = (y * gw + x) * 4; if (d[i + 3] > 80) f.particelle.push({ x: (x / gw - 0.5) * f.w, y: (y / gh - 0.5) * f.h, c: `rgb(${d[i]},${d[i + 1]},${d[i + 2]})` }) }
    }
  }
  // il fondo del video: il colore dei bordi della tavola (così la tavola non sembra una finestra appoggiata)
  const bordo = (s: Sheet) => {
    const c = document.createElement('canvas'); c.width = 24; c.height = Math.max(2, Math.round(24 * s.H / s.W)); const g = c.getContext('2d')!
    g.fillStyle = s.bg; g.fillRect(0, 0, c.width, c.height)
    const M = Math.min(s.W, s.H)
    for (const l of s.layers) { const k = (M * l.scale) / Math.max(l.canvas.width, l.canvas.height) * (c.width / s.W); g.save(); g.globalAlpha = l.alpha; g.globalCompositeOperation = l.blend; g.translate(l.x * c.width, l.y * c.height); g.rotate(l.rot); g.scale(k, k); g.drawImage(l.canvas, -l.canvas.width / 2, -l.canvas.height / 2); g.restore() }
    const d = g.getImageData(0, 0, c.width, c.height).data; let R = 0, G = 0, B = 0, n = 0
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (x === 0 || y === 0 || x === c.width - 1 || y === c.height - 1) { const i = (y * c.width + x) * 4; R += d[i]; G += d[i + 1]; B += d[i + 2]; n++ }
    return '#' + [R / n, G / n, B / n].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')
  }
  return { nodi, bg: fogli.map(bordo), tavole: fogli.length }
}
function lum(h: string) { const m = h.replace('#', ''); if (m.length < 6) return 0.5; const v = [0, 2, 4].map(i => parseInt(m.slice(i, i + 2), 16) / 255); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2] }

// ── il genoma della coreografia ──
export type Direzione = 'lati' | 'alto' | 'basso' | 'asse' | 'centro'
export interface Gesto { ingresso: Ingresso; vita: Vita; uscita: Uscita; segnale: Segnale; ampiezza: number; sfalsa: number; ordine: Ordine; lag: number; direzione: Direzione }
export interface Coreografia {
  gesti: Record<Ruolo, Gesto>
  accoppia: Record<string, Accoppiamento> // per relazione
  camera: 'ferma' | 'deriva' | 'avvicina' | 'segue'
  battutePerTavola: number
  quante: number // quante tavole nel reel
}
function gestoACaso(r: () => number, ruolo: Ruolo): Gesto {
  const ingresso: Ingresso = ruolo === 'linea' ? 'traccia' : ruolo === 'testo' ? uno(r, ['scrivi', 'appari', 'cresci']) : ruolo === 'fondo' ? uno(r, ['appari', 'cresci']) : uno(r, INGR.filter(x => x !== 'traccia' && x !== 'scrivi'))
  const vita: Vita = ruolo === 'testo' ? uno(r, ['fermo', 'respira']) : uno(r, VITE)
  return { ingresso, vita, uscita: uno(r, USC), segnale: uno(r, SEGN), ampiezza: 0.2 + r() * 0.8, sfalsa: r(), ordine: uno(r, ORD), lag: r(), direzione: uno(r, ['lati', 'alto', 'basso', 'asse', 'centro'] as Direzione[]) }
}
export function coreografiaACaso(r: () => number, pesiRel?: Record<string, Partial<Record<Accoppiamento, number>>>): Coreografia {
  const accoppia: Record<string, Accoppiamento> = {}
  for (const rel of Object.keys(PRIOR)) {
    const p = { ...Object.fromEntries(ACCOPPIAMENTI.map(a => [a, 0.3])), ...(PRIOR[rel] ?? {}), ...(pesiRel?.[rel] ?? {}) } as Record<Accoppiamento, number>
    let x = r() * Object.values(p).reduce((a, b) => a + b, 0); accoppia[rel] = 'libero'
    for (const [k, w] of Object.entries(p) as [Accoppiamento, number][]) if ((x -= w) <= 0) { accoppia[rel] = k; break }
  }
  return { gesti: Object.fromEntries(RUOLI.map(ru => [ru, gestoACaso(r, ru)])) as Record<Ruolo, Gesto>, accoppia, camera: uno(r, ['ferma', 'deriva', 'avvicina', 'segue']), battutePerTavola: uno(r, [1, 2, 2, 3]), quante: 3 + Math.floor(r() * 4) }
}
function mutaC(c: Coreografia, r: () => number): Coreografia {
  const x: Coreografia = { ...c, gesti: { ...c.gesti }, accoppia: { ...c.accoppia } }
  const ru = uno(r, RUOLI), g = { ...x.gesti[ru] }
  const k = Math.floor(r() * 9)
  if (k === 0) g.ingresso = gestoACaso(r, ru).ingresso; else if (k === 1) g.vita = gestoACaso(r, ru).vita; else if (k === 2) g.uscita = uno(r, USC); else if (k === 3) g.segnale = uno(r, SEGN)
  else if (k === 4) { g.ampiezza = clamp(g.ampiezza + (r() - 0.5) * 0.4); g.sfalsa = clamp(g.sfalsa + (r() - 0.5) * 0.4) } else if (k === 5) { g.ordine = uno(r, ORD); g.direzione = uno(r, ['lati', 'alto', 'basso', 'asse', 'centro'] as Direzione[]) }
  else if (k === 6) x.camera = uno(r, ['ferma', 'deriva', 'avvicina', 'segue']); else if (k === 7) { x.battutePerTavola = uno(r, [1, 2, 3]); x.quante = Math.max(2, Math.min(7, x.quante + (r() < 0.5 ? -1 : 1))) }
  else { const rel = uno(r, Object.keys(x.accoppia)); x.accoppia[rel] = uno(r, ACCOPPIAMENTI) }
  x.gesti[ru] = g
  return x
}

// ── il tempo: molle, segnali, trasduttori ──
/** risposta di una molla (oscillatore smorzato) a un gradino: 0 → 1 */
const molla = (t: number, w = 14, z = 0.45) => { if (t <= 0) return 0; const wd = w * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z / Math.sqrt(1 - z * z)) * Math.sin(wd * t)) }
const inv = (ts: number[], t: number, dec: number) => { let v = 0; for (const x of ts) { const d = t - x; if (d >= 0 && d < dec * 5) v = Math.max(v, Math.exp(-d / dec)) } return v }
interface Stato { dx: number; dy: number; rot: number; sc: number; alpha: number; traccia: number; sfalda: number; scrivi: number }

/** la sceneggiatura: quali tavole, in che ordine, quando entrano ed escono */
interface Ripresa { tav: number; t0: number; t1: number; rel?: string }
function riprese(c: Coreografia, br: Brano, n: number, forte: number, rels: (string | undefined)[], lettura: number[] = []): Ripresa[] {
  const bar = br.beat * 4, out: Ripresa[] = []
  const scelte = [forte, ...Array.from({ length: n }, (_, i) => i).filter(i => i !== forte)].slice(0, Math.min(n, c.quante))
  let t = 0, k = 0
  while (t < br.durata - 1e-6) {
    const tv = scelte[k % scelte.length]
    // ogni tavola resta almeno quanto serve a leggerla (in battute intere)
    const len = Math.max(c.battutePerTavola, Math.ceil((lettura[tv] ?? 0) / bar)) * bar
    out.push({ tav: tv, t0: t, t1: Math.min(br.durata, t + len), rel: rels[tv] }); t += len; k++
  }
  if (out.length > 1) {
    // l'ultima ripresa torna sulla prima tavola (il video si richiude), e se è troppo corta per leggerla si unisce alla precedente
    const u = out[out.length - 1]
    if (u.t1 - u.t0 < Math.min(lettura[scelte[0]] ?? 0, 2 * bar)) { out.pop(); out[out.length - 1].t1 = br.durata }
    else u.tav = scelte[0]
  }
  return out
}

/** lo stato di un nodo al tempo t (dentro la sua ripresa) */
function stato(n: Nodo, c: Coreografia, rp: Ripresa, t: number, br: Brano, rango: number, quanti: number, scena: Scena, accoppia: Accoppiamento): Stato {
  const g = c.gesti[n.ruolo], beat = br.beat, bar = beat * 4
  const tl = t - rp.t0, dur = rp.t1 - rp.t0
  // sfalsamento: il rango nell'ordine scelto, distribuito nel primo battito o due
  const principale = rango < 8 || n.ruolo === 'testo' || n.ruolo === 'linea'
  if (n.ruolo === 'testo') { const sT = { dx: 0, dy: 0, rot: 0, sc: 1, alpha: n.alpha, traccia: 1, sfalda: 0, scrivi: 1 }; const pT = tl; if (g.ingresso === 'scrivi') sT.scrivi = clamp(pT / (beat * 1)); else if (g.ingresso === 'cresci') sT.sc = Math.max(0.001, molla(pT, 12, 0.6)); else sT.alpha *= clamp(pT / (beat * 0.25)); if (g.vita === 'respira') sT.sc *= 1 + 0.015 * inv(br.cassa, t, 0.1); return sT }
  let ritardo = principale ? (Math.min(rango, 7) / Math.max(1, Math.min(quanti, 8) - 1)) * g.sfalsa * beat * 2 : beat * 2 * g.sfalsa
  // l'accoppiamento tra i due gruppi della tavola
  if (accoppia === 'causa' && n.gruppo === 1) ritardo += beat * 1.5
  if (accoppia === 'canone') ritardo += n.gruppo * beat
  // ingresso agganciato al battito più vicino dopo il ritardo
  const tIn = Math.ceil((ritardo - 1e-4) / (beat / 2)) * (beat / 2)
  const s: Stato = { dx: 0, dy: 0, rot: 0, sc: 1, alpha: n.alpha, traccia: 1, sfalda: 0, scrivi: 1 }
  const pi = tl - tIn
  if (pi < 0) { s.alpha = 0; s.traccia = 0; s.scrivi = 0; return s }
  const e = molla(pi, 12, 0.42), lin = clamp(pi / (beat * 1.5))
  const amp = g.ampiezza
  switch (g.ingresso) {
    case 'componi': {
      // arrivano tutti da una direzione sola per gruppo: i lati (il gruppo 0 da sinistra, l'1 da destra), l'alto, il basso,
      // l'asse (ognuno lungo il suo asse più vicino al bordo), il centro (si aprono dal centro della tavola)
      const d = (260 + 380 * amp) * (1 - e), sx = n.gruppo ? 1 : -1
      if (g.direzione === 'lati') s.dx += sx * d
      else if (g.direzione === 'alto') s.dy -= d
      else if (g.direzione === 'basso') s.dy += d
      else if (g.direzione === 'asse') { if (Math.abs(n.x - W / 2) / W > Math.abs(n.y - H / 2) / H) s.dx += Math.sign(n.x - W / 2 || 1) * d; else s.dy += Math.sign(n.y - H / 2 || 1) * d }
      else { s.dx += (W / 2 - n.x) * (1 - e); s.dy += (H / 2 - n.y) * (1 - e) }
      s.alpha *= clamp(pi / (beat * 0.25)); break
    }
    case 'cresci': s.sc *= Math.max(0.001, e); break
    case 'cadi': s.dy -= (1 - e) * (H * 0.6); break
    case 'traccia': s.traccia = clamp(lin * 1.4); break
    case 'scrivi': s.scrivi = clamp(Math.floor(pi / (beat / 4)) / 12); break
    case 'appari': break
  }
  // la vita: guidata dal segnale, attraverso il trasduttore (guadagno = ampiezza; ritardo = lag)
  const tt = t - g.lag * beat * 0.5
  const sig = g.segnale === 'k' ? inv(br.cassa, tt, 0.1) : g.segnale === 's' ? inv(br.rullante, tt, 0.12) : g.segnale === 'h' ? inv(br.hat, tt, 0.05) : g.segnale === 'bar' ? 0.5 - 0.5 * Math.cos(2 * Math.PI * (tt % bar) / bar) : g.segnale === 'energia' ? br.energia(tt) : 0
  const fase = (accoppia === 'controfase' && n.gruppo === 1 ? Math.PI : 0) + (accoppia === 'unisono' ? 0 : n.id * 0.7)
  const esita = accoppia === 'esitazione' ? (Math.sin(tt * 3.1 + n.id) > 0.6 ? 0.2 : 1) : 1
  switch (g.vita) {
    case 'vibra': s.dx += Math.sin(tt * 61 + fase) * 6 * amp * (0.2 + sig) * esita; s.dy += Math.cos(tt * 53 + fase) * 6 * amp * (0.2 + sig) * esita; break
    case 'ondeggia': s.rot += Math.sin(2 * Math.PI * tt / (beat * 2) + fase) * 0.12 * amp * (0.4 + sig) * esita; s.dy += Math.sin(2 * Math.PI * tt / (beat * 4) + fase) * 14 * amp; break
    case 'respira': s.sc *= 1 + 0.06 * amp * sig * esita; break
    case 'orbita': { const R = 20 + 40 * amp; s.dx += Math.cos(2 * Math.PI * tt / (bar * 2) + fase) * R; s.dy += Math.sin(2 * Math.PI * tt / (bar * 2) + fase) * R * 0.6; break }
    case 'scivola': { const passi = br.battere.filter(b => b <= t && b >= rp.t0).length; s.dx += (passi + molla(tt % bar, 10, 0.6) - 1) * 24 * amp * (n.gruppo ? 1 : -1); break }
    case 'fermo': break
  }
  // il padre: i figli lo seguono con ritardo (follow-through)
  if (g.segnale === 'padre' && n.padre !== null) { const p = scena.nodi[n.padre]; const pp = stato(p, c, rp, t - 0.08 - g.lag * 0.15, br, 0, 1, scena, accoppia); s.dx += pp.dx * 0.8; s.dy += pp.dy * 0.8; s.rot += pp.rot * 0.6 }
  // l'uscita: nell'ultimo battito della ripresa
  const fine = dur - tl
  if (fine < beat && rp.t1 < br.durata - 1e-6) {
    const u = 1 - fine / beat
    switch (g.uscita) {
      case 'sfalda': s.sfalda = u; break
      case 'via': s.dx += u * u * W * (n.gruppo ? 1.2 : -1.2); break
      case 'ritrai': s.sc *= Math.max(0.001, 1 - u * u); break
      case 'resta': break
    }
  }
  return s
}

// ── la misura (senza disegnare) ──
function misura(c: Coreografia, scena: Scena, br: Brano, rp: Ripresa[], memoria: Coreografia[]): number {
  const campioni: number[] = [], attivi: number[] = []
  const prec = new Map<number, Stato>()
  const dt = 1 / 15
  for (let t = 0; t < br.durata; t += dt) {
    const p = rp.find(x => t >= x.t0 && t < x.t1)!; if (!p) continue
    const nodi = scena.nodi.filter(n => n.tav === p.tav && n.ruolo !== 'fondo')
    const acc = c.accoppia[p.rel ?? 'sequenza'] ?? 'libero'
    let mov = 0, att = 0
    nodi.forEach((n, i) => {
      const s = stato(n, c, p, t, br, i, nodi.length, scena, acc), q = prec.get(n.id)
      if (q) { const v = Math.hypot(s.dx - q.dx, s.dy - q.dy) + Math.abs(s.rot - q.rot) * 200 + Math.abs(s.sc - q.sc) * 300; const peso = Math.sqrt(n.area + 1) / 100; mov += v * peso; if (v > 2 && n.area > 4000) att++ }
      prec.set(n.id, s)
    })
    campioni.push(mov); attivi.push(att)
  }
  const onset = campioni.map((_, i) => Math.max(inv(br.cassa, i * dt, 0.08), inv(br.rullante, i * dt, 0.1)))
  const ma = campioni.reduce((a, b) => a + b, 0) / campioni.length, mb = onset.reduce((a, b) => a + b, 0) / onset.length
  let nn = 0, da = 0, db = 0; for (let i = 0; i < campioni.length; i++) { nn += (campioni[i] - ma) * (onset[i] - mb); da += (campioni[i] - ma) ** 2; db += (onset[i] - mb) ** 2 }
  const sync = da && db ? nn / Math.sqrt(da * db) : 0
  const attMedia = attivi.reduce((a, b) => a + b, 0) / attivi.length
  const quiete = campioni.filter(x => x < ma * 0.3).length / campioni.length
  const gesti = new Set(RUOLI.flatMap(ru => [c.gesti[ru].ingresso, c.gesti[ru].vita, c.gesti[ru].uscita]))
  const coerenza = (c.gesti.figura.direzione === c.gesti.trama.direzione ? 0.5 : 0) + (c.gesti.figura.ingresso === 'componi' || c.gesti.figura.ingresso === 'cresci' ? 0.3 : 0)
  let v = coerenza + sync * 3 - Math.abs(attMedia - 3) * 0.6 - Math.abs(quiete - 0.3) * 3 + Math.min(10, gesti.size) * 0.15
  // una ripresa deve durare abbastanza per costruirsi e farsi vedere
  if (c.battutePerTavola * br.beat * 4 < 1.6) v -= 2
  if (memoria.length) { const dist = (a: Coreografia, b: Coreografia) => RUOLI.reduce((d, ru) => d + (['ingresso', 'vita', 'uscita', 'segnale'] as const).filter(k => a.gesti[ru][k] !== b.gesti[ru][k]).length, 0) / (RUOLI.length * 4); v += Math.min(...memoria.slice(-10).map(m => dist(c, m))) * 2 }
  return v
}

export function evolviCoreografia(scena: Scena, br: Brano, forte: number, rels: (string | undefined)[], seme: number, memoria: Coreografia[] = [], pesiRel?: Record<string, Partial<Record<Accoppiamento, number>>>, lettura: number[] = []) {
  const r = rng(seme)
  let pop = Array.from({ length: 24 }, () => (memoria.length && r() < 0.3 ? mutaC(uno(r, memoria), r) : coreografiaACaso(r, pesiRel)))
  const valuta = (c: Coreografia) => ({ c, f: misura(c, scena, br, riprese(c, br, scena.tavole, forte, rels, lettura), memoria) })
  let es = pop.map(valuta)
  for (let g = 0; g < 12; g++) {
    es.sort((a, b) => b.f - a.f)
    const elite = es.slice(0, 6).map(x => x.c)
    pop = [...elite]; while (pop.length < 24) pop.push(mutaC(uno(r, elite), r))
    es = [...es.slice(0, 6), ...pop.slice(6).map(valuta)]
  }
  es.sort((a, b) => b.f - a.f)
  return { coreografia: es[0].c, voto: es[0].f, riprese: riprese(es[0].c, br, scena.tavole, forte, rels, lettura) }
}

export function descriviCoreografia(c: Coreografia): string {
  const R: Record<Ruolo, string> = { fondo: 'i fondi', trama: 'le trame', figura: 'le figure', testo: 'le parole', linea: 'le linee' }
  return RUOLI.map(ru => `${R[ru]}: ${c.gesti[ru].ingresso}, poi ${c.gesti[ru].vita} ${({ k: 'con la cassa', s: 'con il rullante', h: 'con il charleston', bar: 'con la battuta', energia: "con l'energia", padre: 'dietro al padre' } as Record<Segnale, string>)[c.gesti[ru].segnale]}, ${c.gesti[ru].uscita}`).join('; ')
}

// ── il disegno ──
export async function gira(o: { scena: Scena; brano: Brano; coreografia: Coreografia; riprese: Ripresa[]; testi?: { t0: number; t1: number; cv: HTMLCanvasElement }[]; finitura?: (cv: HTMLCanvasElement, t: number) => HTMLCanvasElement | null }): Promise<Blob | null> {
  if (typeof VideoEncoder === 'undefined') return null
  const { scena, brano: br, coreografia: c } = o
  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: 'avc', width: W, height: H, frameRate: FPS }, fastStart: 'in-memory' })
  let errore: unknown = null
  const ve = new VideoEncoder({ output: (ch, m) => muxer.addVideoChunk(ch, m), error: e => { errore = e } })
  ve.configure({ codec: 'avc1.640028', width: W, height: H, bitrate: 6_000_000, framerate: FPS })
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H
  const g = cv.getContext('2d')!
  const ordine = (nodi: Nodo[], o: Ordine) => nodi.slice().sort((a, b) => o === 'grandezza' ? b.area - a.area : o === 'sinistra' ? a.x - b.x : o === 'alto' ? a.y - b.y : o === 'centro' ? Math.hypot(a.x - W / 2, a.y - H / 2) - Math.hypot(b.x - W / 2, b.y - H / 2) : ((a.id * 7919) % 97) - ((b.id * 7919) % 97))
  for (let f = 0; f < Math.round(br.durata * FPS); f++) {
    const t = f / FPS
    const rp = o.riprese.find(x => t >= x.t0 - 1e-6 && t < x.t1) ?? o.riprese[o.riprese.length - 1]
    const acc = c.accoppia[rp.rel ?? 'sequenza'] ?? 'libero'
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'
    g.fillStyle = scena.bg[rp.tav]; g.fillRect(0, 0, W, H)
    // la camera
    const tl = t - rp.t0, dur = rp.t1 - rp.t0
    const zc = c.camera === 'avvicina' ? 1 + 0.08 * (tl / dur) : 1, dc = c.camera === 'deriva' ? (tl / dur - 0.5) * 40 : 0
    g.translate(W / 2 + dc, H / 2); g.scale(zc, zc); g.translate(-W / 2, -H / 2)
    const nodi = scena.nodi.filter(n => n.tav === rp.tav && n.ruolo !== 'fondo' || (n.tav === rp.tav && n.sprite && n.ruolo === 'fondo'))
    // i ranghi per ruolo, secondo l'ordine scelto
    const rango = new Map<number, number>(), quanti = new Map<Ruolo, number>()
    for (const ru of RUOLI) { const xs = ordine(nodi.filter(n => n.ruolo === ru), c.gesti[ru].ordine); xs.forEach((n, i) => rango.set(n.id, i)); quanti.set(ru, xs.length) }
    // se sopra c'è un testo del reel (domanda, conclusione), i testi della tavola tacciono: uno alla volta si legge
    const testoReel = (o.testi ?? []).some(x => t >= x.t0 && t < x.t1)
    for (const n of nodi) {
      if (testoReel && n.ruolo === 'testo') continue
      const s = stato(n, c, rp, t, br, rango.get(n.id) ?? 0, quanti.get(n.ruolo) ?? 1, scena, acc)
      if (s.alpha <= 0.002 || s.sc <= 0.002) continue
      g.save()
      g.globalAlpha = clamp(s.alpha); g.globalCompositeOperation = n.blend
      if (n.linea) {
        const P = n.linea.punti, m = Math.max(1, Math.floor((P.length - 1) * s.traccia))
        g.strokeStyle = n.linea.colore; g.lineWidth = n.linea.spess; g.lineCap = 'round'
        g.translate(s.dx, s.dy); g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (let i = 1; i <= m; i++) g.lineTo(P[i][0], P[i][1]); g.stroke()
      } else if (n.sprite) {
        g.translate(n.x + s.dx, n.y + s.dy); g.rotate(n.rot + s.rot); g.scale(s.sc, s.sc)
        if (s.sfalda > 0 && n.particelle?.length) {
          // si scioglie nelle sue particelle, che cadono e si spargono
          g.globalAlpha = clamp(s.alpha * (1 - s.sfalda * 0.2))
          const passo = Math.max(1, Math.floor(n.particelle.length / 400))
          for (let i = 0; i < n.particelle.length; i += passo) { const p = n.particelle[i]; const a = (i * 2.399) % 6.283; g.fillStyle = p.c; g.fillRect(p.x + Math.cos(a) * s.sfalda * 160, p.y + Math.sin(a) * s.sfalda * 160 + s.sfalda * s.sfalda * 300, 4, 4) }
        } else {
          if (s.scrivi < 1) { g.beginPath(); g.rect(-n.w / 2, -n.h / 2, n.w * s.scrivi, n.h); g.clip() }
          g.drawImage(n.sprite, -n.w / 2, -n.h / 2, n.w, n.h)
        }
      }
      g.restore()
    }
    // i testi del reel (domanda, conclusione), impaginati dai suoi generatori
    g.setTransform(1, 0, 0, 1, 0, 0)
    for (const x of o.testi ?? []) if (t >= x.t0 && t < x.t1) g.drawImage(x.cv, 0, 0, W, H)
    const out = o.finitura ? o.finitura(cv, t) ?? cv : cv
    const fr = new VideoFrame(out, { timestamp: Math.round((f * 1e6) / FPS), duration: Math.round(1e6 / FPS) })
    ve.encode(fr, { keyFrame: f % (FPS * 2) === 0 }); fr.close()
    if (ve.encodeQueueSize > 6) await new Promise(res => setTimeout(res, 3))
    if (errore) throw errore
  }
  await ve.flush()
  if (errore) return null
  muxer.finalize()
  return new Blob([muxer.target.buffer], { type: 'video/mp4' })
}
