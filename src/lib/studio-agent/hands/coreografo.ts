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
import { toolById, type ToolCtx } from './tools'
import { fontCss } from '@/components/studio/genera/raster'
import { perCarattere } from '@/components/studio/genera/fonts'

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
  /** una lettera usata come forma (non come testo da leggere) */
  lettera?: boolean
  particelle?: { x: number; y: number; c: string }[]
  /** un livello vivo: il suo generatore lo ridisegna a ogni momento (crescita, fase) */
  vivo?: { tool: string; p: Record<string, unknown>; fonte?: HTMLCanvasElement; W: number; H: number; layer: Layer }
  /** lo strato della tavola (l'ordine in cui è stata fatta) e il modo in cui si rivela */
  strato?: number; rivela?: Rivela
}
export type Rivela = 'retino' | 'tendina' | 'strappo' | 'alba' | 'posa' | 'crescita' | 'righe'
const MATERIA = new Set(['retino', 'punti', 'grana', 'duotono', 'sfasa', 'materia', 'caleido', 'pattern', 'onde', 'ornato'])
/** come si rivela uno strato: dalla sua natura (il retino a punti che crescono, il campo a tendina, la carta a strappo) */
function rivelaDi(l: Layer, n: Nodo, P: Partitura): Rivela {
  if (n.vivo) return 'crescita'
  if (n.ruolo === 'testo') return 'righe'
  if (n.ruolo === 'linea') return 'tendina'
  if (/retino|punti|grana|pattern|ornato|caleido/.test(l.kind)) return 'retino'
  if (/luce|ombra|shader/.test(l.kind)) return 'alba'
  if (n.ruolo === 'fondo') return n.w >= W * 0.98 && n.h >= H * 0.98 && n.indice === 0 ? 'alba' : 'tendina'
  if (n.ruolo === 'trama') return l.blend !== 'source-over' ? 'retino' : 'tendina'
  return P.figure ?? 'strappo'
}
interface Scena { nodi: Nodo[]; bg: string[]; tavole: number; parole: number[]; lettere?: Partitura['lettere']; tratto?: Partitura['tratto']; strati?: Partitura; rango?: Map<number, { k: number; n: number }> }

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

/** le righe di un testo: bande orizzontali di pixel pieni */
function righeDi(src: HTMLCanvasElement): [number, number][] {
  const d = src.getContext('2d')!.getImageData(0, 0, src.width, src.height).data, out: [number, number][] = []
  let a = -1, vuote = 0; const gap = Math.max(3, Math.round(src.height / 60))
  for (let y = 0; y < src.height; y++) { let pieno = false; for (let x = 0; x < src.width; x += 2) if (d[(y * src.width + x) * 4 + 3] > 30) { pieno = true; break } if (pieno) { if (a < 0) a = y; vuote = 0 } else if (a >= 0 && ++vuote > gap) { out.push([Math.max(0, a - 2), Math.min(src.height, y - vuote + 3)]); a = -1 } }
  if (a >= 0) out.push([Math.max(0, a - 2), src.height])
  return out.filter(([x, y]) => y - x > 4)
}

/** smonta le tavole in una scena di oggetti */
let PARTITURA_CORRENTE: Partitura | undefined
export function smonta(fogli: Sheet[], r: () => number, part?: Partitura): Scena {
  // dall'ultima partitura riuscita, con una variazione (le vecchie, senza costruzione, prendono quella nuova a caso)
  const base = partituraACaso(r)
  PARTITURA_CORRENTE = partitura(part ? { ...base, ...part, ...(!part.costruzione ? { lettere: base.lettere } : {}), ...(r() < 0.5 ? { lettere: base.lettere, costruzione: base.costruzione } : { figure: base.figure, dir: base.dir, passo: base.passo }) } : base)
  const P0 = PARTITURA_CORRENTE
  const nodi: Nodo[] = []
  let id = 0
  // la griglia delle parole, una per tutto il reel: nella fascia libera sopra o sotto la tavola, stessi margini, allineate a sinistra
  const fascia: 'alto' | 'basso' = r() < 0.5 ? 'alto' : 'basso'
  const bordo = (s: Sheet) => {
    const c = document.createElement('canvas'); c.width = 24; c.height = Math.max(2, Math.round(24 * s.H / s.W)); const g = c.getContext('2d')!
    g.fillStyle = s.bg; g.fillRect(0, 0, c.width, c.height)
    const M = Math.min(s.W, s.H)
    for (const l of s.layers) { const k = (M * l.scale) / Math.max(l.canvas.width, l.canvas.height) * (c.width / s.W); g.save(); g.globalAlpha = l.alpha; g.globalCompositeOperation = l.blend; g.translate(l.x * c.width, l.y * c.height); g.rotate(l.rot); g.scale(k, k); g.drawImage(l.canvas, -l.canvas.width / 2, -l.canvas.height / 2); g.restore() }
    const d = g.getImageData(0, 0, c.width, c.height).data; let R = 0, G = 0, B = 0, n = 0
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (x === 0 || y === 0 || x === c.width - 1 || y === c.height - 1) { const i = (y * c.width + x) * 4; R += d[i]; G += d[i + 1]; B += d[i + 2]; n++ }
    return '#' + [R / n, G / n, B / n].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')
  }
  const parole: number[] = []
  for (const [ti, s] of fogli.entries()) {
    const k = W / s.W // la tavola occupa la larghezza del video, centrata in altezza
    const oy = (H - s.H * k) / 2
    const radice: Nodo = { id: id++, ruolo: 'fondo', tav: ti, gruppo: 0, x: W / 2, y: H / 2, w: W, h: H, rot: 0, alpha: 1, blend: 'source-over', padre: null, indice: 0, area: 0 }
    nodi.push(radice)
    const M = Math.min(s.W, s.H)
    // le parole nuove (con il loro ruolo): titolo e sottotitolo sempre, ogni tanto il paragrafo intero; nel carattere e nel colore della tavola
    const tit = s.layers.find(l => l.meta?.ruolo === 'titolo'), corpo = s.layers.find(l => l.meta?.ruolo === 'corpo')
    parole[ti] = 0
    const dopo: Nodo[] = [] // le parole della griglia: si disegnano sopra a tutto quello della tavola
    if (tit) {
      const sotto = corpo?.meta?.text.replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim() ?? '' // le parentesi (fonti, rimandi) nel reel non servono
      const nParole = sotto.split(' ').filter(Boolean).length
      const paragrafo = false && nParole > 0 // nel reel niente paragrafi: il testo da leggere è poco, il resto è forma
      const frase = (sotto.match(/^[^.;:!?…]+[.;:!?…]?/)?.[0] ?? '').split(' ').slice(0, 12).join(' ').replace(/[,;:]$/, '')
      // nel reel il titolo è breve: se è una frase lunga, ne resta la prima parte (fino alla prima pausa, al massimo 8 parole)
      const titoloCorto = (t1: string) => { const t0 = t1.replace(/\s*\([^)]*$/, '').replace(/\s*\([^)]*\)/g, '').trim() || t1; const w = t0.split(/\s+/); if (w.length <= 8) return t0; const pz = t0.split(/[:;(—–]|,\s/)[0].trim(); return pz.split(/\s+/).length <= 8 && pz.length > 3 ? pz : w.slice(0, 7).join(' ') + '…' }
      const blocchi: { testo: string; font: NonNullable<NonNullable<Layer['meta']>['font']>; px: number; colore: string }[] = [{ testo: perCarattere(titoloCorto(tit.meta!.text), tit.meta!.font?.family ?? ''), font: tit.meta!.font ?? { family: 'serif', weight: 400 }, px: 0, colore: tit.meta!.color }]
      const fCorpo = corpo?.meta?.font ?? blocchi[0].font
      if (sotto && r() < 0.5) blocchi.push({ testo: paragrafo ? sotto : frase, font: fCorpo, px: paragrafo ? 26 : 30, colore: corpo!.meta!.color })
      // il colore della tavola, se si stacca dal fondo; se no il chiaro o lo scuro
      const lb = lum(bordo(s))
      for (const b of blocchi) if (Math.abs(lum(b.colore) - lb) < 0.5) b.colore = lb > 0.5 ? '#111111' : '#f4f2ec'
      const mis = document.createElement('canvas').getContext('2d')!
      const a_capo = (testo: string, f: typeof blocchi[0]['font'], px: number, larg: number) => { mis.font = fontCss(f as never, px); const out: string[] = []; let riga = ''; for (const w of testo.split(' ')) { const prova = riga ? riga + ' ' + w : w; if (mis.measureText(prova).width > larg && riga) { out.push(riga); riga = w } else riga = prova } if (riga) out.push(riga); return out }
      // le zone di Instagram: in alto nome e audio, in basso didascalia e mi piace, a destra i pulsanti. Il testo da leggere sta fuori
      const m = 48, larg = W - m - 150
      // il titolo: il più grande che sta in tre righe
      let px = 84, righeT = a_capo(blocchi[0].font.upper ? blocchi[0].testo.toUpperCase() : blocchi[0].testo, blocchi[0].font, px, larg)
      while (righeT.length > 3 && px > 34) { px -= 4; righeT = a_capo(blocchi[0].font.upper ? blocchi[0].testo.toUpperCase() : blocchi[0].testo, blocchi[0].font, px, larg) }
      blocchi[0].px = px
      const tutte: { t: string; f: typeof blocchi[0]['font']; px: number; col: string; dopo: number }[] = righeT.map((t, i) => ({ t, f: blocchi[0].font, px, col: blocchi[0].colore, dopo: i === righeT.length - 1 ? px * 0.45 : px * 0.08 }))
      if (blocchi[1]) for (const t of a_capo(blocchi[1].testo, blocchi[1].font, blocchi[1].px, larg * 0.92)) tutte.push({ t, f: blocchi[1].font, px: blocchi[1].px, col: blocchi[1].colore, dopo: blocchi[1].px * 0.28 })
      const alto = tutte.reduce((a, x) => a + x.px * 1.1 + x.dopo, 0)
      let y = fascia === 'alto' ? 200 : H - 330 - alto
      tutte.forEach((x, i) => {
        const c = document.createElement('canvas'), q0 = c.getContext('2d')!; q0.font = fontCss(x.f as never, x.px)
        c.width = Math.ceil(q0.measureText(x.t).width + 8); c.height = Math.ceil(x.px * 1.3)
        const q = c.getContext('2d')!; q.font = fontCss(x.f as never, x.px); q.fillStyle = x.col; q.textBaseline = 'top'; q.fillText(x.t, 4, x.px * 0.1)
        dopo.push({ id: id++, strato: 1000 + i, rivela: 'righe', ruolo: 'testo', tav: ti, gruppo: 0, sprite: c, x: m + c.width / 2, y: y + c.height / 2, w: c.width, h: c.height, rot: 0, alpha: 1, blend: 'source-over', padre: radice.id, indice: 1000 + i, area: c.width * c.height })
        y += x.px * 1.1 + x.dopo
      })
      parole[ti] = tit.meta!.text.split(/\s+/).length + (blocchi[1]?.testo.split(/\s+/).length ?? 0)
    }
    const metti = (l: Layer, li: number) => {
      if (tit && TESTO.has(l.kind)) return // le parole di questa tavola le ha già messe la griglia
      const side = M * l.scale * k, kk = side / Math.max(l.canvas.width, l.canvas.height)
      const cx = l.x * s.W * k, cy = oy + l.y * s.H * k
      const ruolo: Ruolo = TESTO.has(l.kind) ? 'testo' : ATMO.has(l.kind) ? 'fondo' : TRAMA.has(l.kind) || (l.scale >= 1.15 && l.blend !== 'source-over') ? 'trama' : 'figura'
      const pieno = ruolo === 'fondo' && l.scale >= 0.99
      const kc = pieno ? Math.max(W / l.canvas.width, H / l.canvas.height) : kk
      const intero = (): Nodo => ({ id: id++, ruolo, tav: ti, gruppo: (li % 2) as 0 | 1, sprite: l.canvas, x: pieno ? W / 2 : cx, y: pieno ? H / 2 : cy, w: l.canvas.width * kc, h: l.canvas.height * kc, rot: l.rot, alpha: l.alpha, blend: l.blend, padre: radice.id, indice: li, area: l.canvas.width * kk * l.canvas.height * kk })
      // le parole: solo le lettere (il colore del testo), senza aloni né piastre che la tavola aveva messo per leggerle
      if (ruolo === 'testo' && (/^\s*fonte\s*:|wikipedia|campione/i.test(l.meta?.text ?? '') || (l.meta?.size ?? 99) * kk < 24)) return // illeggibile su un telefono: nel reel non entra
      if (ruolo === 'testo' && l.meta?.color) {
        const c = document.createElement('canvas'); c.width = l.canvas.width; c.height = l.canvas.height; const q = c.getContext('2d')!; q.drawImage(l.canvas, 0, 0)
        const d = q.getImageData(0, 0, c.width, c.height), m = l.meta.color.replace('#', ''), R = parseInt(m.slice(0, 2), 16), G = parseInt(m.slice(2, 4), 16), B = parseInt(m.slice(4, 6), 16)
        for (let i = 0; i < d.data.length; i += 4) { const dd = Math.abs(d.data[i] - R) + Math.abs(d.data[i + 1] - G) + Math.abs(d.data[i + 2] - B); if (dd > 90) d.data[i + 3] = 0 }
        q.putImageData(d, 0, 0)
        // ogni riga è un oggetto a sé (entra, si ferma, esce col suo tempo); la frase resta nel suo posto e nel suo carattere
        const bande = righeDi(c)
        if (bande.length <= 1) { nodi.push({ ...intero(), sprite: c }); return }
        const base = intero()
        for (const [a, b] of bande) {
          const rc = document.createElement('canvas'); rc.width = c.width; rc.height = b - a; rc.getContext('2d')!.drawImage(c, 0, a, c.width, b - a, 0, 0, c.width, b - a)
          const oy0 = ((a + b) / 2 - c.height / 2) * kk
          nodi.push({ ...base, id: id++, sprite: rc, h: (b - a) * kk, x: cx - Math.sin(l.rot) * oy0, y: cy + Math.cos(l.rot) * oy0, area: c.width * kk * (b - a) * kk })
        }
        return
      }
      // i fondi e le trame che non coprono tutto: bordi sfumati, così non si vede il rettangolo
      // (quelli che coprono la tavola restano netti, com'erano)
      const copre = side >= Math.max(s.W, s.H) * k * 0.98
      if ((ruolo === 'fondo' || ruolo === 'trama') && !pieno && !copre) {
        const c = document.createElement('canvas'); c.width = l.canvas.width; c.height = l.canvas.height; const q = c.getContext('2d')!; q.drawImage(l.canvas, 0, 0)
        q.globalCompositeOperation = 'destination-in'
        const gx = q.createLinearGradient(0, 0, c.width, 0); gx.addColorStop(0, 'rgba(0,0,0,0)'); gx.addColorStop(0.12, '#000'); gx.addColorStop(0.88, '#000'); gx.addColorStop(1, 'rgba(0,0,0,0)'); q.fillStyle = gx; q.fillRect(0, 0, c.width, c.height)
        const gy = q.createLinearGradient(0, 0, 0, c.height); gy.addColorStop(0, 'rgba(0,0,0,0)'); gy.addColorStop(0.12, '#000'); gy.addColorStop(0.88, '#000'); gy.addColorStop(1, 'rgba(0,0,0,0)'); q.fillStyle = gy; q.fillRect(0, 0, c.width, c.height)
        nodi.push({ ...intero(), sprite: c }); return
      }
      // i livelli nati da un generatore animabile restano interi: cresceranno e vivranno col loro generatore
      // i livelli nati da un generatore restano quelli veri (rigenerarli cambia colori e grana): si rivelano, non si rifanno
      if (copre) { nodi.push(intero()); return }
      // i livelli di figura grandi si dividono negli oggetti che contengono
      if (P0.scomponi && (ruolo === 'figura' || ruolo === 'trama') && !l.flipX && l.canvas.width * l.canvas.height > 160 * 160) {
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
    }
    // ogni livello è uno strato: entra nel suo ordine e nel suo modo (il retino a punti, il campo a tendina, la figura a strappo)
    s.layers.forEach((l: Layer, li) => { const k0 = nodi.length; metti(l, li); for (let q = k0; q < nodi.length; q++) { nodi[q].strato = li; nodi[q].rivela ??= rivelaDi(l, nodi[q], P0) } })
    // ── il generatore vivo e le lettere-forma: il movimento nasce da qui, non da filtri sull'immagine ──
    {
      const inizio = nodi.indexOf(radice)
      let dove = nodi.findIndex((n, k) => k > inizio && n.ruolo !== 'fondo'); if (dove < 0) dove = nodi.length
      const dietro: Nodo[] = [], davanti: Nodo[] = []
      // la tavolozza della tavola: il bordo, il colore più acceso, il più lontano dal bordo
      const camp = document.createElement('canvas'); camp.width = 8; camp.height = 8; const cq = camp.getContext('2d', { willReadFrequently: true })!
      const pix: number[][] = []
      for (const l of s.layers) { try { cq.clearRect(0, 0, 8, 8); cq.drawImage(l.canvas, 0, 0, 8, 8); const d = cq.getImageData(0, 0, 8, 8).data; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) pix.push([d[i], d[i + 1], d[i + 2]]) } catch { /* niente */ } }
      const hex = (c: number[]) => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('')
      const bg0 = bordo(s), lb = lum(bg0)
      const acc = pix.length ? hex(pix.reduce((m, c) => { const sat = Math.max(...c) - Math.min(...c), sm = Math.max(...m) - Math.min(...m); return sat > sm ? c : m }, pix[0])) : '#e3361b'
      const ink = pix.length ? hex(pix.reduce((m, c) => (Math.abs((0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255 - lb) > Math.abs((0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255 - lb) ? c : m), pix[0])) : (lb > 0.5 ? '#111111' : '#f4f2ec')
      const kT = W / s.W
      // il generatore: se la tavola non ne ha uno vivo, gliene dà uno, con i suoi colori, che cresce e vive col beat
      const materia = s.layers.filter(l => MATERIA.has(l.kind) || (l.blend !== 'source-over' && !TESTO.has(l.kind))).length
      if (!nodi.some(n => n.tav === ti && n.vivo) && materia < 2) {
        const scelto = uno(r, ['flusso', 'traccia', 'pattern', 'geometria', 'flusso'])
        const tool = toolById(scelto)
        if (tool) {
          const ctx = { r, tone: { id: 'tavola', label: '', bg: bg0, ink, acc, dark: lb < 0.5 }, intention: { word: '', register: 'poetico', targets: {}, tools: [], why: '' }, mood: 'calmo', say: () => '', shaders: [], quality: 1 } as unknown as ToolCtx
          try {
            const p0 = tool.propose(s, ctx)
            const segnaposto = document.createElement('canvas'); segnaposto.width = 4; segnaposto.height = 4
            dietro.push({ id: id++, strato: 0.5, rivela: 'crescita', ruolo: 'trama', tav: ti, gruppo: 0, vivo: { tool: scelto, p: p0, W: s.W, H: s.H, layer: { id: 'vivo', kind: 'trama', canvas: segnaposto, x: 0.5, y: 0.5, scale: 1, rot: 0, alpha: 1, blend: 'source-over' } }, x: W / 2, y: H / 2, w: s.W * kT, h: s.H * kT, rot: 0, alpha: 0.85, blend: lb > 0.5 ? 'multiply' : 'screen', padre: radice.id, indice: 0.5, area: W * H * 0.5 })
          } catch { /* il generatore non si è proposto: pazienza */ }
        }
      }
      // le lettere-forma: la parola chiave della tavola, nel suo carattere, usata come materia (enorme, tagliata dal bordo, sparsa…)
      const parolaChiave = (tit?.meta?.text ?? '').split(/[^\p{L}]+/u).filter(w => w.length >= 4 && !/^(della|delle|dello|nella|sulla|come|sono|essere|anche|quando|perché|questo|questa|quello|quella|tutto|ogni)$/i.test(w)).sort((a2, b2) => b2.length - a2.length)[0]
      if (parolaChiave && tit?.meta && P0.lettere !== 'niente') {
        const font = tit.meta.font ?? { family: 'serif', weight: 700 }
        const lettere = [...(font.upper ? parolaChiave.toUpperCase() : parolaChiave)]
        const n = lettere.length, mis = document.createElement('canvas').getContext('2d')!
        const colore = Math.abs(lum(acc) - lb) > 0.25 ? acc : ink
        const disegna = (ch: string, px: number) => {
          mis.font = fontCss(font as never, px); const w0 = Math.max(px * 0.3, mis.measureText(ch).width)
          const c = document.createElement('canvas'); c.width = Math.ceil(w0 + px * 0.2); c.height = Math.ceil(px * 1.25)
          const q = c.getContext('2d')!; q.font = fontCss(font as never, px); q.textBaseline = 'alphabetic'
          const bx = px * 0.1, by = px * 0.95
          if (P0.tratto !== 'contorno') { q.fillStyle = colore; q.fillText(ch, bx, by) }
          if (P0.tratto !== 'pieno') { q.lineWidth = Math.max(2, px / 70); q.strokeStyle = P0.tratto === 'doppio' ? ink : colore; q.strokeText(ch, bx + (P0.tratto === 'doppio' ? px * 0.04 : 0), by + (P0.tratto === 'doppio' ? px * 0.04 : 0)) }
          return { c, w0 }
        }
        const pos: { x: number; y: number; px: number; rot: number }[] = []
        if (P0.lettere === 'gigante') {
          let px = 300; mis.font = fontCss(font as never, px); const tot = mis.measureText(lettere.join('')).width || px * n * 0.6
          px = px * (W * 1.5) / tot
          let x = -W * 0.25 + r() * W * 0.1; const y = H * (0.3 + r() * 0.4)
          for (const ch of lettere) { mis.font = fontCss(font as never, px); const w0 = mis.measureText(ch).width; pos.push({ x: x + w0 / 2, y, px, rot: 0 }); x += w0 }
        } else if (P0.lettere === 'colonna') {
          const px = Math.min(320, (H * 0.85) / n), x = r() < 0.5 ? 40 + px * 0.4 : W - 40 - px * 0.4
          lettere.forEach((_, k) => pos.push({ x, y: H * 0.08 + (k + 0.5) * (H * 0.84) / n, px, rot: 0 }))
        } else if (P0.lettere === 'diagonale') {
          const px = Math.min(300, Math.hypot(W, H) * 0.9 / n * 1.1)
          lettere.forEach((_, k) => { const u = (k + 0.5) / n; pos.push({ x: W * (0.12 + 0.76 * u), y: H * (0.12 + 0.76 * u), px, rot: -0.12 }) })
        } else lettere.forEach(() => pos.push({ x: W * (0.1 + r() * 0.8), y: H * (0.1 + r() * 0.8), px: 140 + r() * 260, rot: (r() - 0.5) * 0.6 }))
        lettere.forEach((ch, k) => {
          if (!ch.trim()) return
          const { c } = disegna(ch, pos[k].px)
          const nodo: Nodo = { id: id++, ruolo: 'figura', tav: ti, gruppo: (k % 2) as 0 | 1, sprite: c, x: pos[k].x, y: pos[k].y - pos[k].px * 0.35, w: c.width, h: c.height, rot: pos[k].rot, alpha: P0.tratto === 'contorno' ? 1 : 0.92, blend: 'source-over', padre: radice.id, indice: 0.6 + k * 0.01, area: c.width * c.height, lettera: true }
          // la parola è uno strato tra gli altri: quasi sempre sotto la materia (il retino, la grana le passano sopra)
          const sotto = r() < 0.85; nodo.strato = sotto ? 0.7 : 900; nodo.rivela = 'tendina'
          // sotto la materia la parola è uno strato tra gli altri, non la protagonista
          if (sotto) { nodo.alpha = 0.55; nodo.blend = lb > 0.5 ? 'multiply' : 'screen' }
          ;(sotto ? dietro : davanti).push(nodo)
        })
      }
      nodi.splice(dove, 0, ...dietro)
      nodi.push(...davanti)
    }
    nodi.push(...dopo)
    // i due gruppi: le figure si dividono per vicinanza di posizione e di colore (k-medie, k = 2)
    {
      const fs = nodi.filter(n => n.tav === ti && (n.ruolo === 'figura' || n.ruolo === 'trama') && (n.sprite || n.vivo))
      const col = (n: Nodo) => { const c = document.createElement('canvas'); c.width = 4; c.height = 4; const q = c.getContext('2d')!; try { q.drawImage((n.sprite ?? n.vivo!.layer.canvas), 0, 0, 4, 4) } catch { return [0, 0, 0] } const d = q.getImageData(0, 0, 4, 4).data; let R = 0, G = 0, B = 0, a = 0; for (let i = 0; i < d.length; i += 4) { const w = d[i + 3] / 255; R += d[i] * w; G += d[i + 1] * w; B += d[i + 2] * w; a += w } return a ? [R / a, G / a, B / a] : [0, 0, 0] }
      const v = fs.map(n => { const c = col(n); return [n.x / W, n.y / H, c[0] / 255 * 0.7, c[1] / 255 * 0.7, c[2] / 255 * 0.7] })
      if (fs.length >= 2) {
        let c0 = v[0], c1 = v.reduce((m, x) => (dist2(x, v[0]) > dist2(m, v[0]) ? x : m), v[0])
        let lab: number[] = []
        for (let it = 0; it < 8; it++) {
          lab = v.map(x => (dist2(x, c0) <= dist2(x, c1) ? 0 : 1))
          const media = (k: number) => { const xs = v.filter((_, i) => lab[i] === k); return xs.length ? xs[0].map((_, j) => xs.reduce((a, x) => a + x[j], 0) / xs.length) : (k ? c1 : c0) }
          c0 = media(0); c1 = media(1)
        }
        fs.forEach((n, i) => { n.gruppo = lab[i] as 0 | 1 })
      }
    }
    // i legami: linee tra i centri dei tre oggetti di figura più grandi della tavola
    const fig = P0.scomponi ? nodi.filter(n => n.tav === ti && n.ruolo === 'figura' && n.sprite && !n.lettera).sort((a, b) => b.area - a.area).slice(0, 3) : []
    const ink = lum(s.bg) > 0.5 ? '#111111' : '#f4f2ec'
    for (let i = 0; i + 1 < fig.length; i++) {
      const a = fig[i], b = fig[i + 1], mx = (a.x + b.x) / 2 + (r() - 0.5) * 120, my = (a.y + b.y) / 2 + (r() - 0.5) * 120
      const punti: [number, number][] = []; for (let q = 0; q <= 24; q++) { const t = q / 24; punti.push([(1 - t) ** 2 * a.x + 2 * (1 - t) * t * mx + t * t * b.x, (1 - t) ** 2 * a.y + 2 * (1 - t) * t * my + t * t * b.y]) }
      nodi.push({ id: id++, ruolo: 'linea', tav: ti, gruppo: (i % 2) as 0 | 1, x: 0, y: 0, w: 0, h: 0, rot: 0, alpha: 0.9, blend: 'source-over', padre: radice.id, strato: 950, rivela: 'tendina', indice: i, area: 0, linea: { punti, spess: 2 + r() * 3, colore: ink } })
    }
    // le linee di costruzione: allineamenti sui bordi dei due oggetti più grandi
    for (const [i, f] of fig.slice(0, 2).entries()) {
      const vert = r() < 0.5, p = vert ? f.x - f.w / 2 : f.y - f.h / 2
      nodi.push({ id: id++, ruolo: 'linea', tav: ti, gruppo: (i % 2) as 0 | 1, x: 0, y: 0, w: 0, h: 0, rot: 0, alpha: 0.5, blend: 'source-over', padre: radice.id, strato: 950, rivela: 'tendina', indice: 10 + i, area: 0, linea: { punti: vert ? [[p, 0], [p, H]] : [[0, p], [W, p]], spess: 1.2, colore: ink } })
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

  // le tavole vecchie (senza ruoli nelle parole): si contano le parole leggibili
  fogli.forEach((s, ti) => { if (!parole[ti]) parole[ti] = s.layers.filter(l => l.meta?.text && l.meta.size * (W / s.W) >= 24).reduce((a, l) => a + l.meta!.text.split(/\s+/).length, 0) })
  // il rango di ogni strato nella sua tavola: è l'ordine in cui entra
  const rango = new Map<number, { k: number; n: number }>()
  for (let ti = 0; ti < fogli.length; ti++) {
    const xs = nodi.filter(n => n.tav === ti && n.strato !== undefined)
    const valori = [...new Set(xs.map(n => n.strato!))].sort((a, b) => a - b)
    const testo = valori.filter(v => v >= 1000), resto = valori.filter(v => v < 1000)
    // al contrario: il primo strato (il fondo) resta il primo, poi dalla materia in cima giù fino alle figure
    const ord = P0.costruzione === 'inverso' && resto.length > 2 ? [resto[0], ...resto.slice(1).reverse()] : resto
    const tutti = [...ord, ...testo]
    for (const n of xs) rango.set(n.id, { k: tutti.indexOf(n.strato!), n: tutti.length })
  }
  return { nodi, bg: fogli.map(bordo), tavole: fogli.length, parole, lettere: P0.lettere, tratto: P0.tratto, strati: P0, rango }
}
const dist2 = (a: number[], b: number[]) => a.reduce((s, x, i) => s + (x - b[i]) ** 2, 0)
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
  /** la regia: ogni quanti battiti stacca (base), quanta voglia di dettagli, quanta spinta sui colpi */
  regia?: Regia
  /** la partitura: cosa succede sui colpi del rullante, alla fine di ogni frase, sul cambio */
  partitura?: Partitura
}
export interface Partitura { rullante: 'impulso' | 'ricresci' | 'pop' | 'niente'; fineFrase: 'respiro' | 'vuoto' | 'niente'; cambio: 'ricresce' | 'sboccia' | 'muta'; forza: number; lettere?: 'gigante' | 'colonna' | 'sparse' | 'diagonale' | 'niente'; tratto?: 'pieno' | 'contorno' | 'doppio'
  /** la costruzione: gli strati entrano nell'ordine in cui la tavola è stata fatta, o al contrario (prima la materia, poi quello che c'è sotto) */
  costruzione?: 'processo' | 'inverso'; passo?: 'mezzo' | 'battito'; figure?: 'strappo' | 'posa' | 'tendina'; dir?: 'alto' | 'basso' | 'sinistra' | 'destra'
  /** quanto gli strati si separano in profondità (parallasse), se le figure si scompongono nei loro pezzi */
  profondita?: number; scomponi?: boolean }
// la partitura: sui colpi e sul cambio reagiscono i generatori (ricrescono, mutano, danno un impulso) e le lettere; nessun filtro sull'immagine
const partituraACaso = (r: () => number): Partitura => ({ rullante: uno(r, ['impulso', 'impulso', 'ricresci', 'pop'] as Partitura['rullante'][]), fineFrase: uno(r, ['respiro', 'vuoto', 'niente'] as Partitura['fineFrase'][]), cambio: uno(r, ['ricresce', 'sboccia', 'muta'] as Partitura['cambio'][]), forza: 0.4 + r() * 0.6, lettere: uno(r, ['gigante', 'colonna', 'niente', 'niente', 'niente', 'niente'] as NonNullable<Partitura['lettere']>[]), tratto: uno(r, ['pieno', 'contorno', 'doppio'] as NonNullable<Partitura['tratto']>[]), costruzione: uno(r, ['processo', 'processo', 'inverso'] as NonNullable<Partitura['costruzione']>[]), passo: uno(r, ['mezzo', 'battito'] as NonNullable<Partitura['passo']>[]), figure: uno(r, ['strappo', 'posa', 'tendina'] as NonNullable<Partitura['figure']>[]), dir: uno(r, ['alto', 'basso', 'sinistra', 'destra'] as NonNullable<Partitura['dir']>[]), profondita: 0.3 + r() * 0.7, scomponi: r() < 0.25 })
const PART0: Partitura = { rullante: 'impulso', fineFrase: 'niente', cambio: 'ricresce', forza: 0.6, lettere: 'gigante', tratto: 'pieno' }
/** le partiture vecchie (con gli effetti-filtro) diventano nuove: quello che non esiste più torna al valore di base */
export const partitura = (P?: Partitura): Partitura => { const x = { ...PART0, ...(P ?? {}) }; if (!['impulso', 'ricresci', 'pop', 'niente'].includes(x.rullante)) x.rullante = 'impulso'; if (!['respiro', 'vuoto', 'niente'].includes(x.fineFrase)) x.fineFrase = 'niente'; if (!['ricresce', 'sboccia', 'muta'].includes(x.cambio)) x.cambio = 'sboccia'; x.lettere ??= 'niente'; if (x.lettere === 'sparse' || x.lettere === 'diagonale') x.lettere = 'niente'; x.tratto ??= 'pieno'; x.costruzione ??= 'processo'; x.passo ??= 'mezzo'; x.figure ??= 'strappo'; x.dir ??= 'basso'; x.profondita ??= 0.5; x.scomponi ??= false; return x }
export interface Regia { taglio: 1 | 2 | 4; dettaglio: number; impulso: number }
const regiaACaso = (r: () => number): Regia => ({ taglio: uno(r, [1, 2, 2, 4] as (1 | 2 | 4)[]), dettaglio: 0.3 + r() * 0.6, impulso: 0.3 + r() * 0.7 })
const REGIA0: Regia = { taglio: 2, dettaglio: 0.55, impulso: 0.6 }
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
  return { gesti: Object.fromEntries(RUOLI.map(ru => [ru, gestoACaso(r, ru)])) as Record<Ruolo, Gesto>, accoppia, camera: uno(r, ['ferma', 'deriva', 'avvicina', 'segue']), battutePerTavola: uno(r, [1, 2, 2, 3]), quante: 3 + Math.floor(r() * 4), regia: regiaACaso(r), partitura: partituraACaso(r) }
}
function mutaC(c: Coreografia, r: () => number): Coreografia {
  const x: Coreografia = { ...c, gesti: { ...c.gesti }, accoppia: { ...c.accoppia } }
  const ru = uno(r, RUOLI), g = { ...x.gesti[ru] }
  const k = Math.floor(r() * 9)
  if (k === 0) g.ingresso = gestoACaso(r, ru).ingresso; else if (k === 1) g.vita = gestoACaso(r, ru).vita; else if (k === 2) g.uscita = uno(r, USC); else if (k === 3) g.segnale = uno(r, SEGN)
  else if (k === 4) { g.ampiezza = clamp(g.ampiezza + (r() - 0.5) * 0.4); g.sfalsa = clamp(g.sfalsa + (r() - 0.5) * 0.4) } else if (k === 5) { g.ordine = uno(r, ORD); g.direzione = uno(r, ['lati', 'alto', 'basso', 'asse', 'centro'] as Direzione[]) }
  else if (k === 6) x.camera = uno(r, ['ferma', 'deriva', 'avvicina', 'segue']); else if (k === 7) { x.battutePerTavola = uno(r, [1, 2, 3]); x.quante = Math.max(2, Math.min(7, x.quante + (r() < 0.5 ? -1 : 1))) }
  else { const rel = uno(r, Object.keys(x.accoppia)); x.accoppia[rel] = uno(r, ACCOPPIAMENTI) }
  if (r() < 0.35) { const q = { ...(x.regia ?? REGIA0) }; const j = Math.floor(r() * 3); if (j === 0) q.taglio = uno(r, [1, 2, 4] as (1 | 2 | 4)[]); else if (j === 1) q.dettaglio = clamp(q.dettaglio + (r() - 0.5) * 0.4); else q.impulso = clamp(q.impulso + (r() - 0.5) * 0.4); x.regia = q }
  if (r() < 0.3) { const q = partitura(x.partitura), a = partituraACaso(r), j = Math.floor(r() * 6); if (j === 0) q.rullante = a.rullante; else if (j === 1) q.fineFrase = a.fineFrase; else if (j === 2) q.cambio = a.cambio; else if (j === 3) q.lettere = a.lettere; else if (j === 4) { q.tratto = a.tratto; if (r() < 0.5) q.costruzione = a.costruzione; else q.figure = a.figure } else if (r() < 0.5) { q.passo = a.passo; q.dir = a.dir; q.profondita = clamp((q.profondita ?? 0.5) + (r() - 0.5) * 0.3) } else q.forza = clamp(q.forza + (r() - 0.5) * 0.4, 0.2, 1); x.partitura = q }
  x.gesti[ru] = g
  return x
}

// ── il tempo: molle, segnali, trasduttori ──
/** risposta di una molla (oscillatore smorzato) a un gradino: 0 → 1 */
const molla = (t: number, w = 14, z = 0.45) => { if (t <= 0) return 0; const wd = w * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z / Math.sqrt(1 - z * z)) * Math.sin(wd * t)) }
const inv = (ts: number[], t: number, dec: number) => { let v = 0; for (const x of ts) { const d = t - x; if (d >= 0 && d < dec * 5) v = Math.max(v, Math.exp(-d / dec)) } return v }
interface Stato { dx: number; dy: number; rot: number; sc: number; alpha: number; traccia: number; sfalda: number; scrivi: number; crescita?: number; fase?: number; rivela?: number }

// ── la regia: dentro ogni ripresa, inquadrature che staccano sul colpo ──
export interface Inquadratura { t0: number; t1: number; tav: number; tipo: 'tutto' | 'dettaglio' | 'carrello'; z: number; cx: number; cy: number; vx: number }
/** Le inquadrature nascono dalla musica (dove cade il colpo, quanta energia c'è, dove sta il cambio) e dalla tavola (le figure vere su cui stringere).
 *  Ogni ripresa apre larga; poi stringe sui dettagli o scivola; mai due uguali di fila. */
export function inquadrature(c: Coreografia, br: Brano, rp: Ripresa[], scena: Scena): Inquadratura[] {
  const R = c.regia ?? REGIA0, beat = br.beat, bar = beat * 4, out: Inquadratura[] = []
  let h = 7
  const r = () => ((h = (h * 1103515245 + 12345) >>> 0) / 4294967296)
  for (const p of rp) {
    const figure = scena.nodi.filter(n => n.tav === p.tav && (n.ruolo === 'figura' || n.ruolo === 'trama') && (n.sprite || n.vivo) && n.area > 3000 && n.area < W * H * 0.5).sort((a, b) => b.area - a.area).slice(0, 6)
    let t = p.t0, prima = true, ultimo = '', iFig = 0
    while (t < p.t1 - 1e-6) {
      // lunghezza: la base del genoma, dimezzata con l'energia e nella prima battuta (l'aggancio), raddoppiata nella battuta che prepara il cambio
      let n: number = R.taglio
      if (br.energia(t) > 0.8) n = Math.max(1, n / 2)
      if (t < bar) n = 1
      if (t >= br.cambio - bar && t < br.cambio) n = 4
      if (prima) n = Math.max(n, 2)
      const t1 = Math.min(p.t1, t + n * beat)
      let tipo: Inquadratura['tipo'] = 'tutto'
      if (!prima && figure.length) { const x = r(); tipo = x < R.dettaglio ? 'dettaglio' : x < R.dettaglio + (1 - R.dettaglio) * 0.5 ? 'carrello' : 'tutto'; if (tipo === ultimo) tipo = tipo === 'tutto' ? 'dettaglio' : 'tutto' }
      if (t >= br.cambio - bar && t < br.cambio) tipo = 'tutto' // prima del cambio si respira
      let z = 1, cx = W / 2, cy = H / 2, vx = 0
      if (tipo === 'dettaglio') { const f = figure[iFig++ % figure.length]; z = Math.max(1.7, Math.min(3, Math.min(W / (f.w * 1.2), H / (f.h * 1.2)))); cx = f.x; cy = f.y }
      if (tipo === 'carrello') { const f = figure[Math.floor(r() * figure.length)]; z = 1.4 + r() * 0.35; cx = f.x; cy = f.y; vx = (r() < 0.5 ? -1 : 1) * W * 0.12 }
      out.push({ t0: t, t1, tav: p.tav, tipo, z, cx, cy, vx })
      ultimo = tipo; prima = false; t = t1
    }
  }
  return out
}
/** la trasformazione della camera in un istante: niente bordi vuoti, spinta sul taglio e sulla cassa */
function camera(q: Inquadratura, t: number, br: Brano, R: Regia) {
  const u = (t - q.t0) / Math.max(1e-3, q.t1 - q.t0)
  let z = q.z * (1 + 0.035 * u) // dentro l'inquadratura si stringe appena: è viva
  z *= 1 + 0.06 * R.impulso * Math.exp(-(t - q.t0) / 0.09) + 0.014 * R.impulso * inv(br.cassa, t, 0.1)
  let cx = q.cx + q.vx * (u - 0.5), cy = q.cy
  const mx = W / (2 * z), my = H / (2 * z)
  cx = Math.max(mx, Math.min(W - mx, cx)); cy = Math.max(my, Math.min(H - my, cy))
  return { z, cx, cy }
}

/** la sceneggiatura: quali tavole, in che ordine, quando entrano ed escono */
interface Ripresa { tav: number; t0: number; t1: number; rel?: string; anello?: boolean }
function riprese(c: Coreografia, br: Brano, n: number, forte: number, rels: (string | undefined)[], lettura: number[] = []): Ripresa[] {
  const bar = br.beat * 4, out: Ripresa[] = []
  // quante tavole entrano: nell'ordine del racconto (premesse → conclusione), senza ripetizioni; la più forte c'è sempre
  const bp = Math.max(1, Math.min(c.battutePerTavola, Math.floor(5.2 / bar))) // una tavola senza niente da leggere non tiene più di 5 secondi
  const durata = (tv: number) => Math.max(bp, Math.ceil((lettura[tv] ?? 0) / bar)) * bar
  const tutte = Array.from({ length: n }, (_, i) => i)
  let scelte = tutte.slice(0, Math.max(2, c.quante))
  if (!scelte.includes(forte)) scelte = [...scelte.slice(0, -1), forte].sort((a, b) => a - b)
  // se non ci stanno nel brano, si tolgono quelle in mezzo (mai la prima, l'ultima, la più forte)
  while (scelte.length > 2 && scelte.reduce((a, tv) => a + durata(tv), 0) > br.durata - bar) { const via = scelte.slice(1, -1).filter(x => x !== forte)[0]; if (via === undefined) break; scelte = scelte.filter(x => x !== via) }
  let t = 0
  for (const tv of scelte) { if (t >= br.durata - 1e-6) break; const len = durata(tv); out.push({ tav: tv, t0: t, t1: Math.min(br.durata, t + len), rel: rels[tv] }); t += len }
  // il tempo che avanza: allunga l'ultima, oppure (se basta una battuta) riprende la prima per chiudere ad anello
  if (t < br.durata - 1e-6) { if (br.durata - t >= bar - 1e-6) out.push({ tav: scelte[0], t0: t, t1: br.durata, rel: rels[scelte[0]], anello: true }); else out[out.length - 1].t1 = br.durata }
  return out
}

/** lo stato di un nodo al tempo t (dentro la sua ripresa) */
function stato(n: Nodo, c: Coreografia, rp: Ripresa, t: number, br: Brano, rango: number, quanti: number, scena: Scena, accoppia: Accoppiamento): Stato {
  const g = c.gesti[n.ruolo], beat = br.beat, bar = beat * 4
  const avanti = rp.t0 === 0 ? beat * 1.5 : rp.anello ? beat * 6 : 0 // il primo fotogramma e il ritorno ad anello partono già costruiti
  const tl = t - rp.t0 + avanti, dur = rp.t1 - rp.t0 + avanti
  if (scena.strati && scena.rango?.has(n.id)) return statoStrato(n, c, rp, t, br, scena, accoppia)
  // sfalsamento: il rango nell'ordine scelto, distribuito nel primo battito o due
  const principale = rango < 8 || n.ruolo === 'testo' || n.ruolo === 'linea'
  if (n.ruolo === 'testo') { const sT = { dx: 0, dy: 0, rot: 0, sc: 1, alpha: n.alpha, traccia: 1, sfalda: 0, scrivi: 1 }; const pT = tl; if (g.ingresso === 'scrivi') sT.scrivi = clamp(pT / (beat * 1)); else if (g.ingresso === 'cresci') sT.sc = Math.max(0.001, molla(pT, 12, 0.6)); else sT.alpha *= clamp(pT / (beat * 0.25)); if (g.vita === 'respira') sT.sc *= 1 + 0.015 * inv(br.cassa, t, 0.1); return sT }
  let ritardo = principale ? (Math.min(rango, 7) / Math.max(1, Math.min(quanti, 8) - 1)) * g.sfalsa * beat * 2 : beat * 2 * g.sfalsa
  // l'accoppiamento tra i due gruppi della tavola
  if (accoppia === 'causa' && n.gruppo === 1) ritardo += beat * 1.5
  if (accoppia === 'canone') ritardo += n.gruppo * beat
  // ingresso agganciato al battito più vicino dopo il ritardo
  const tIn = Math.ceil((ritardo - 1e-4) / (beat / 2)) * (beat / 2) - (g.ingresso === 'appari' || g.ingresso === 'traccia' ? 0 : 0.2)
  const s: Stato = { dx: 0, dy: 0, rot: 0, sc: 1, alpha: n.alpha, traccia: 1, sfalda: 0, scrivi: 1 }
  const pi = tl - tIn
  if (pi < 0) { s.alpha = 0; s.traccia = 0; s.scrivi = 0; return s }
  const e = molla(pi, 12, 0.42), lin = clamp(pi / (beat * 1.5))
  const amp = g.ampiezza
  if (n.vivo) {
    // il generatore cresce a scatti sui sedicesimi (2–6 battiti), poi vive: la fase avanza col tempo e salta sui colpi
    const durC = (2 + 4 * amp) * beat, passi = Math.floor(pi / (beat / 4)), fr = (pi - passi * beat / 4) / (beat / 4)
    s.crescita = clamp(((passi + Math.min(1, fr / 0.4)) * beat / 4) / durC)
    const tt0 = t - g.lag * beat * 0.5
    const sig0 = g.segnale === 'k' ? inv(br.cassa, tt0, 0.1) : g.segnale === 's' ? inv(br.rullante, tt0, 0.12) : g.segnale === 'h' ? inv(br.hat, tt0, 0.05) : 0
    s.fase = tt0 / (bar * 2) * (0.5 + amp) + sig0 * 0.08 * amp
    const fine0 = dur - tl
    if (fine0 < beat && rp.t1 < br.durata - 1e-6 && g.uscita !== 'resta') s.crescita = Math.min(s.crescita, clamp(fine0 / beat))
    return s
  }
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

/** La tavola si costruisce come è stata fatta: uno strato alla volta, sul battito, ognuno nel suo modo; poi gli strati vivono
 *  in profondità (i più alti si spostano di più: la tavola ha uno spessore); alla fine si smontano dall'alto. */
function statoStrato(n: Nodo, c: Coreografia, rp: Ripresa, t: number, br: Brano, scena: Scena, accoppia: Accoppiamento): Stato {
  const S = scena.strati!, R0 = scena.rango!.get(n.id)!, beat = br.beat, bar = beat * 4
  const s: Stato = { dx: 0, dy: 0, rot: 0, sc: 1, alpha: n.alpha, traccia: 1, sfalda: 0, scrivi: 1, rivela: 1 }
  const dur0 = rp.t1 - rp.t0
  // il passo: mezzo battito o un battito, ma la costruzione non prende più di metà della ripresa
  let passo = S.passo === 'battito' ? beat : beat / 2
  passo = Math.max(beat / 4, Math.min(passo, Math.floor((dur0 * 0.5) / Math.max(1, R0.n) / (beat / 4)) * (beat / 4)))
  const testo = (n.strato ?? 0) >= 1000
  // il primo fotogramma del reel parte con i primi strati già posati (l'aggancio); il ritorno ad anello parte costruito
  const avanti = rp.t0 === 0 ? passo * 2 : rp.anello ? passo * R0.n + beat : 0
  const tl = t - rp.t0 + avanti
  const tIn = R0.k * passo + (testo ? beat : 0)
  const pi = tl - tIn
  if (pi < 0) { s.alpha = 0; s.rivela = 0; s.traccia = 0; s.scrivi = 0; return s }
  const tipo = n.rivela ?? 'alba'
  const durR = tipo === 'retino' ? beat * 1.5 : tipo === 'alba' ? beat * 2 : tipo === 'strappo' ? beat * 0.75 : beat
  const u = clamp(pi / durR)
  if (tipo === 'retino' || tipo === 'tendina' || tipo === 'strappo') { s.rivela = u * u * (3 - 2 * u); s.traccia = s.rivela }
  else if (tipo === 'alba') s.alpha *= u
  else if (tipo === 'posa') { const m = molla(pi, 11, 0.5); s.dy -= (1 - m) * 46; s.sc *= 0.94 + 0.06 * m; s.alpha *= clamp(pi / (beat * 0.2)) }
  else if (tipo === 'righe') { const e = clamp(pi / 0.14); s.alpha *= e; s.dy += (1 - e) * (1 - e) * 16 }
  // la vita dopo la costruzione, nella natura di ogni strato: il retino respira con la cassa (i punti si stringono e si riaprono);
  // ogni due battute una figura si strappa di nuovo e si rimette (a turno), come un collage che si rifà
  const fineCostr = R0.n * passo + beat * 2
  if (tl > fineCostr && !testo) {
    if (tipo === 'retino') s.rivela = Math.min(s.rivela ?? 1, 1 - 0.25 * (0.4 + (S.profondita ?? 0.5)) * inv(br.cassa, t, 0.2))
    if (tipo === 'strappo' || tipo === 'posa' || tipo === 'tendina') {
      const per = bar * 2, k = Math.floor((tl - fineCostr) / per), dentro = (tl - fineCostr) - k * per
      const figure = R0.n - 1, chi = figure > 0 ? 1 + ((k * 3 + rp.tav) % figure) : -1
      if (R0.k === chi && dentro < beat) { const v = clamp(dentro / (beat * 0.8)); s.rivela = Math.min(s.rivela ?? 1, v * v * (3 - 2 * v)) }
    }
  }
  // i generatori crescono a scatti sui sedicesimi, poi vivono: la fase avanza e salta sui colpi
  if (n.vivo) {
    const g = c.gesti.trama, amp = g.ampiezza, durC = (2 + 3 * amp) * beat, passi = Math.floor(pi / (beat / 4)), fr = (pi - passi * beat / 4) / (beat / 4)
    s.crescita = clamp(((passi + Math.min(1, fr / 0.4)) * beat / 4) / durC)
    const tt0 = t - g.lag * beat * 0.5
    const sig0 = g.segnale === 'k' ? inv(br.cassa, tt0, 0.1) : g.segnale === 's' ? inv(br.rullante, tt0, 0.12) : g.segnale === 'h' ? inv(br.hat, tt0, 0.05) : 0
    s.fase = tt0 / (bar * 2) * (0.5 + amp) + sig0 * 0.08 * amp + (accoppia === 'controfase' && n.gruppo ? 0.5 : 0)
  }
  // lo spessore: gli strati più alti scivolano di più, lentamente, come se la camera girasse attorno alla tavola
  if (!testo) {
    const prof = R0.n > 1 ? R0.k / (R0.n - 1) : 0, pieno = n.w >= W * 0.98 && n.h >= H * 0.98
    if (!pieno) {
      const ph = 2 * Math.PI * (t - rp.t0) / (bar * 4) + rp.tav * 1.3
      const A = (S.profondita ?? 0.5) * 30 * prof
      s.dx += A * Math.sin(ph); s.dy += A * 0.45 * Math.cos(ph * 0.7)
      // la cassa spinge appena gli strati in cima (la tavola respira, non trema)
      s.sc *= 1 + 0.012 * prof * inv(br.cassa, t, 0.12)
    }
  }
  // la fine: si smonta dall'alto, nell'ultimo battito (il fondo resta: sopra si costruisce la tavola dopo)
  const fine = (rp.t1 - t)
  if (fine < beat && rp.t1 < br.durata - 1e-6 && !(R0.k === 0)) {
    const da = ((R0.n - 1 - R0.k) / Math.max(1, R0.n - 1)) * beat * 0.6, v = clamp(((beat - fine) - da) / (beat * 0.3))
    if (tipo === 'retino' || tipo === 'tendina' || tipo === 'strappo') s.rivela = Math.min(s.rivela ?? 1, 1 - v)
    else s.alpha *= 1 - v
    if (n.vivo) s.crescita = Math.min(s.crescita ?? 1, 1 - v)
  }
  return s
}

// ── la misura (senza disegnare) ──
function misura(c: Coreografia, scena: Scena, br: Brano, rp: Ripresa[], memoria: Coreografia[]): number {
  const campioni: number[] = [], attivi: number[] = [], coperture: number[] = [], equilibri: number[] = [], pieni: number[] = []
  const arrivi: { t: number; v: number; peso: number }[] = [], vel = new Map<number, number>()
  const prec = new Map<number, Stato>()
  const dt = 1 / 15
  for (let t = 0; t < br.durata; t += dt) {
    const p = rp.find(x => t >= x.t0 && t < x.t1)!; if (!p) continue
    const nodi = scena.nodi.filter(n => n.tav === p.tav && n.ruolo !== 'fondo')
    const acc = c.accoppia[p.rel ?? 'sequenza'] ?? 'libero'
    let mov = 0, att = 0
    const scatole: { x0: number; y0: number; x1: number; y1: number; testo: boolean; a: number }[] = []
    nodi.forEach((n, i) => {
      const s = stato(n, c, p, t, br, i, nodi.length, scena, acc), q = prec.get(n.id)
      if (q) { const v = Math.hypot(s.dx - q.dx, s.dy - q.dy) + Math.abs(s.rot - q.rot) * 200 + Math.abs(s.sc - q.sc) * 300; const peso = Math.sqrt(n.area + 1) / 100; mov += v * peso; if (v > 2 && n.area > 4000) att++; arrivi.push({ t, v: (vel.get(n.id) ?? 0) - v, peso }); vel.set(n.id, v) }
      prec.set(n.id, s)
      if (s.alpha > 0.1 && (n.sprite || n.vivo) && n.area > 2000) { const w = n.w * s.sc / 2, h = n.h * s.sc / 2, x = n.x + s.dx, y = n.y + s.dy; scatole.push({ x0: x - w, y0: y - h, x1: x + w, y1: y + h, testo: n.ruolo === 'testo', a: n.area }) }
    })
    campioni.push(mov); attivi.push(att)
    // gli occhi (geometrici): quanto i testi sono coperti da figure, quanto il quadro è pieno ed equilibrato
    let cop = 0, aT = 0
    for (const tx of scatole.filter(b => b.testo)) { aT += (tx.x1 - tx.x0) * (tx.y1 - tx.y0); for (const f of scatole.filter(b => !b.testo)) cop += Math.max(0, Math.min(tx.x1, f.x1) - Math.max(tx.x0, f.x0)) * Math.max(0, Math.min(tx.y1, f.y1) - Math.max(tx.y0, f.y0)) }
    if (aT) coperture.push(Math.min(1, cop / aT))
    let cx = 0, cy = 0, aa = 0; for (const b of scatole) { const a = (b.x1 - b.x0) * (b.y1 - b.y0); cx += (b.x0 + b.x1) / 2 * a; cy += (b.y0 + b.y1) / 2 * a; aa += a }
    if (aa) { equilibri.push(Math.hypot(cx / aa / W - 0.5, cy / aa / H - 0.5)); pieni.push(Math.min(1, aa / (W * H))) }
  }
  const onset = campioni.map((_, i) => Math.max(inv(br.cassa, i * dt, 0.08), inv(br.rullante, i * dt, 0.1)))
  const ma = campioni.reduce((a, b) => a + b, 0) / campioni.length, mb = onset.reduce((a, b) => a + b, 0) / onset.length
  let nn = 0, da = 0, db = 0; for (let i = 0; i < campioni.length; i++) { nn += (campioni[i] - ma) * (onset[i] - mb); da += (campioni[i] - ma) ** 2; db += (onset[i] - mb) ** 2 }
  const sync = da && db ? nn / Math.sqrt(da * db) : 0
  const attMedia = attivi.reduce((a, b) => a + b, 0) / attivi.length
  const quiete = campioni.filter(x => x < ma * 0.3).length / campioni.length
  const gesti = new Set(RUOLI.flatMap(ru => [c.gesti[ru].ingresso, c.gesti[ru].vita, c.gesti[ru].uscita]))
  const coerenza = (c.gesti.figura.direzione === c.gesti.trama.direzione ? 0.5 : 0) + (c.gesti.figura.ingresso === 'componi' || c.gesti.figura.ingresso === 'cresci' ? 0.3 : 0)
  // gli arrivi (le frenate) cadono sui colpi? distanza media della frenata pesata dal colpo più vicino
  const colpi = [...br.cassa, ...br.rullante]
  const fren = arrivi.filter(x => x.v > 3).sort((a, b) => b.v * b.peso - a.v * a.peso).slice(0, 40)
  const sulColpo = fren.length ? fren.reduce((a, x) => a + Math.exp(-Math.min(...colpi.map(cc => Math.abs(cc - x.t))) / 0.06), 0) / fren.length : 0
  const media = (xs: number[], d = 0) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : d)
  // economia: pochi gesti con variazioni (non un campionario)
  const economia = -Math.max(0, gesti.size - 6) * 0.25
  // il ritmo degli stacchi: una media tra 0.7 e 1.8 secondi tiene l'occhio senza stancarlo
  let v = coerenza + economia + sync * 1.5 + sulColpo * 3 - Math.abs(attMedia - 2) * 0.6 - Math.abs(quiete - 0.3) * 3
    - media(coperture) * 4 - media(equilibri) * 3 - Math.abs(media(pieni, 0.4) - 0.45) * 2
  // una ripresa deve durare abbastanza per costruirsi e farsi vedere
  if (c.battutePerTavola * br.beat * 4 < 1.6) v -= 2
  if (memoria.length) { const dist = (a: Coreografia, b: Coreografia) => RUOLI.reduce((d, ru) => d + (['ingresso', 'vita', 'uscita', 'segnale'] as const).filter(k => a.gesti[ru][k] !== b.gesti[ru][k]).length, 0) / (RUOLI.length * 4); const d = Math.min(...memoria.slice(-10).map(m => dist(c, m))); v -= Math.abs(d - 0.45) * 2 } // novità in una fascia: né copia né estraneo
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
  const P = partitura(c.partitura)
  const extra = `; sul rullante ${({ impulso: 'i generatori danno un impulso', ricresci: 'un generatore ricresce', pop: 'una lettera si gonfia', niente: 'niente' })[P.rullante]}, a fine frase ${({ respiro: 'i generatori trattengono il respiro', vuoto: 'si svuota', niente: 'tira dritto' })[P.fineFrase]}, sul cambio ${({ ricresce: 'tutto ricresce dal niente', sboccia: 'le forme si ricompongono', muta: 'i generatori mutano' })[P.cambio]}; lettere ${P.lettere} (${P.tratto})`
  const R: Record<Ruolo, string> = { fondo: 'i fondi', trama: 'le trame', figura: 'le figure', testo: 'le parole', linea: 'le linee' }
  return extra.slice(2) + '; ' + RUOLI.map(ru => `${R[ru]}: ${c.gesti[ru].ingresso}, poi ${c.gesti[ru].vita} ${({ k: 'con la cassa', s: 'con il rullante', h: 'con il charleston', bar: 'con la battuta', energia: "con l'energia", padre: 'dietro al padre' } as Record<Segnale, string>)[c.gesti[ru].segnale]}, ${c.gesti[ru].uscita}`).join('; ')
}

// ── il disegno ──
export async function gira(o: { scena: Scena; brano: Brano; coreografia: Coreografia; riprese: Ripresa[]; testi?: { t0: number; t1: number; cv: HTMLCanvasElement }[]; finitura?: (cv: HTMLCanvasElement, t: number) => HTMLCanvasElement | null; copertina?: (ms: number) => void }): Promise<Blob | null> {
  if (typeof VideoEncoder === 'undefined') return null
  const { scena, brano: br, coreografia: c } = o
  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: 'avc', width: W, height: H, frameRate: FPS }, fastStart: 'in-memory' })
  let errore: unknown = null
  const ve = new VideoEncoder({ output: (ch, m) => muxer.addVideoChunk(ch, m), error: e => { errore = e } })
  ve.configure({ codec: 'avc1.640028', width: W, height: H, bitrate: 6_000_000, framerate: FPS })
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H
  const g = cv.getContext('2d', { willReadFrequently: true })!
  let copertina = { v: -1, ms: 0 }
  // il ridisegno dei livelli vivi: lo strumento rifà il livello al suo momento (con una piccola memoria dei momenti già fatti)
  const cache = new Map<number, Map<string, HTMLCanvasElement>>()
  let rr = 1
  const ctxStub = (): ToolCtx => ({ r: () => ((rr = (rr * 1664525 + 1013904223) >>> 0) / 4294967296), tone: { id: 'x', label: '', bg: '#ffffff', ink: '#111111', acc: '#e3361b', dark: false } as unknown as ToolCtx['tone'], intention: {} as ToolCtx['intention'], mood: 'calmo', say: () => '', shaders: [], quality: 1 })
  const vivo = async (n: Nodo, cr: number, fa: number): Promise<HTMLCanvasElement | null> => {
    const v = n.vivo!; const tool = toolById(v.tool); if (!tool) return null
    const k = `${Math.round(cr * 32)}|${Math.round(((fa % 1) + 1) % 1 * 24)}`
    const m = cache.get(n.id) ?? new Map<string, HTMLCanvasElement>(); cache.set(n.id, m)
    if (m.has(k)) return m.get(k)!
    const base: Layer[] = []
    if (v.tool === 'ornato' && v.fonte) base.push({ id: String(v.p.layer), kind: 'figura', canvas: v.fonte, x: 0.5, y: 0.5, scale: 0.3, rot: 0, alpha: 1, blend: 'source-over' })
    if ((v.tool === 'retino' || v.tool === 'caleido') && v.fonte) base.push({ id: 'fonte', kind: 'fondo', canvas: v.fonte, x: 0.5, y: 0.5, scale: Math.max(v.W, v.H) / Math.min(v.W, v.H), rot: 0, alpha: 1, blend: 'source-over' })
    const s0: Sheet = { W: v.W, H: v.H, bg: '#ffffff', layers: base }
    const c = { ...ctxStub(), tempo: { crescita: cr, fase: fa } }
    const out = await tool.apply(s0, { ...v.p, sostituisci: false }, c).catch(() => null)
    const nuovo = out?.layers.find(l => !base.some(b => b.id === l.id))
    if (!nuovo) return null
    if (m.size > 48) m.delete(m.keys().next().value as string)
    m.set(k, nuovo.canvas)
    return nuovo.canvas
  }
  // le parole in contrappunto: scure dove sotto è chiaro, chiare dove sotto è scuro, pixel per pixel (niente aloni)
  const tT = document.createElement('canvas'); tT.width = W; tT.height = H; const gT = tT.getContext('2d')!
  const tL = document.createElement('canvas'); tL.width = W; tL.height = H; const gL = tL.getContext('2d')!
  const tD = document.createElement('canvas'); tD.width = W; tD.height = H; const gD = tD.getContext('2d')!
  const contrappunto = (disegna: (q: CanvasRenderingContext2D) => void) => {
    gT.setTransform(1, 0, 0, 1, 0, 0); gT.clearRect(0, 0, W, H); disegna(gT)
    gL.setTransform(1, 0, 0, 1, 0, 0); gL.filter = 'grayscale(1) contrast(1000%)'; gL.drawImage(cv, 0, 0); gL.filter = 'none'
    const Lm = luce()
    // scuro sul chiaro
    gD.setTransform(1, 0, 0, 1, 0, 0); gD.clearRect(0, 0, W, H); gD.globalCompositeOperation = 'source-over'; gD.drawImage(tT, 0, 0)
    gD.globalCompositeOperation = 'source-in'; gD.fillStyle = '#111111'; gD.fillRect(0, 0, W, H)
    gD.globalCompositeOperation = 'destination-in'; gD.drawImage(Lm, 0, 0)
    // chiaro sullo scuro
    gT.globalCompositeOperation = 'source-in'; gT.fillStyle = '#f4f2ec'; gT.fillRect(0, 0, W, H)
    gT.globalCompositeOperation = 'destination-out'; gT.drawImage(Lm, 0, 0); gT.globalCompositeOperation = 'source-over'
    gD.globalCompositeOperation = 'source-over'
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(tD, 0, 0); g.drawImage(tT, 0, 0); g.restore()
  }
  // la maschera della luce: bianco opaco dove sotto è chiaro, trasparente dove è scuro
  const tM = document.createElement('canvas'); tM.width = W; tM.height = H; const gM = tM.getContext('2d')!
  const luce = () => {
    const d = gL.getImageData(0, 0, W, H); const o = gM.createImageData(W, H)
    for (let i = 0; i < d.data.length; i += 4) { o.data[i] = o.data[i + 1] = o.data[i + 2] = 255; o.data[i + 3] = d.data[i] > 127 ? 255 : 0 }
    gM.putImageData(o, 0, 0); return tM
  }
  // il colore di un testo: scuro se sotto è chiaro, chiaro se sotto è scuro (media della sua scatola, una volta sola)
  const inchiostri = new Map<string, string>()
  const inchiostro = (b: { x0: number; y0: number; x1: number; y1: number }) => {
    const x0 = Math.max(0, Math.floor(b.x0)), y0 = Math.max(0, Math.floor(b.y0)), w = Math.max(1, Math.min(W - x0, Math.ceil(b.x1 - b.x0))), h = Math.max(1, Math.min(H - y0, Math.ceil(b.y1 - b.y0)))
    const d = g.getImageData(x0, y0, w, h).data; let l = 0, c = 0; for (let i = 0; i < d.length; i += 4 * 9) { l += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255; c++ }
    return l / Math.max(1, c) > 0.5 ? '#111111' : '#f4f2ec'
  }
  const tinte = new Map<HTMLCanvasElement, Map<string, HTMLCanvasElement>>()
  const tinta = (src: HTMLCanvasElement, col: string) => { const m = tinte.get(src) ?? new Map(); tinte.set(src, m); if (m.has(col)) return m.get(col)!; const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const q = c.getContext('2d')!; q.drawImage(src, 0, 0); q.globalCompositeOperation = 'source-in'; q.fillStyle = col; q.fillRect(0, 0, c.width, c.height); m.set(col, c); return c }
  const scatole = new Map<HTMLCanvasElement, { x0: number; y0: number; x1: number; y1: number }>()
  const scatola = (cvT: HTMLCanvasElement) => { if (scatole.has(cvT)) return scatole.get(cvT)!; const q = cvT.getContext('2d')!; const d = q.getImageData(0, 0, cvT.width, cvT.height).data; let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; for (let y = 0; y < cvT.height; y += 4) for (let x = 0; x < cvT.width; x += 4) if (d[(y * cvT.width + x) * 4 + 3] > 40) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y) } const k = W / cvT.width; const b = x1 < 0 ? { x0: 0, y0: 0, x1: 0, y1: 0 } : { x0: x0 * k, y0: y0 * k, x1: x1 * k, y1: y1 * k }; scatole.set(cvT, b); return b }
  const ordine = (nodi: Nodo[], o: Ordine) => nodi.slice().sort((a, b) => o === 'grandezza' ? b.area - a.area : o === 'sinistra' ? a.x - b.x : o === 'alto' ? a.y - b.y : o === 'centro' ? Math.hypot(a.x - W / 2, a.y - H / 2) - Math.hypot(b.x - W / 2, b.y - H / 2) : ((a.id * 7919) % 97) - ((b.id * 7919) % 97))
  // le righe di un testo (bande di pixel pieni), per farle entrare una alla volta a tempo
  const bande = new Map<HTMLCanvasElement, [number, number][]>()
  const righe = (src: HTMLCanvasElement) => {
    if (bande.has(src)) return bande.get(src)!
    const d = src.getContext('2d')!.getImageData(0, 0, src.width, src.height).data, out: [number, number][] = []
    let a = -1, vuote = 0; const gap = Math.max(3, Math.round(src.height / 120))
    for (let y = 0; y < src.height; y++) { let pieno = false; for (let x = 0; x < src.width; x += 3) if (d[(y * src.width + x) * 4 + 3] > 30) { pieno = true; break } if (pieno) { if (a < 0) a = y; vuote = 0 } else if (a >= 0 && ++vuote > gap) { out.push([a, y - vuote + 1]); a = -1 } }
    if (a >= 0) out.push([a, src.height])
    bande.set(src, out); return out
  }
  const entrate = new Map<string, number>()
  /** disegna un testo riga per riga: ogni riga entra su un mezzo battito, sale di poco e resta */
  const aRighe = (src: HTMLCanvasElement, chiave: string, t: number, dur: number, x0: number, y0: number, w: number, h: number) => {
    if (!entrate.has(chiave)) entrate.set(chiave, t)
    const tA = entrate.get(chiave)!, rr = righe(src), mezzo = br.beat / 2
    const passo = Math.max(mezzo, Math.min(br.beat, Math.floor((dur * 0.4) / Math.max(1, rr.length) / mezzo) * mezzo))
    const ky = h / src.height
    rr.forEach(([a, b], i) => {
      const ta = Math.ceil((tA + i * passo) / mezzo - 1e-6) * mezzo, e = clamp((t - ta) / 0.12)
      if (e <= 0) return
      const sale = (1 - e) * (1 - e) * 16
      g.save(); g.globalAlpha *= e; g.drawImage(src, 0, a, src.width, b - a, x0, y0 + a * ky + sale, w, (b - a) * ky); g.restore()
    })
  }
  const P = partitura(c.partitura), beat = br.beat, frase = beat * 16
  // l'ultimo battito di ogni frase (non dell'ultima): lì succede la cosa di fine frase
  const fineFrase = (t: number) => { const k = Math.floor(t / frase), tb = (k + 1) * frase - beat; return t >= tb && (k + 1) * frase < br.durata - 1e-3 ? tb : -1 }
  // il colpo di rullante più recente (e quale è, per scegliere a turno la figura colpita)
  const colpo = (t: number) => { let i = -1; for (let j = 0; j < br.rullante.length; j++) if (br.rullante[j] <= t) i = j; return i >= 0 && t - br.rullante[i] < 0.5 ? { i, e: Math.exp(-(t - br.rullante[i]) / 0.09) } : null }
  const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H; const gtmp = tmp.getContext('2d')!
  let tintaCambio = ''
  // le maschere con cui uno strato si rivela: punti che crescono (il retino), una tendina, uno strappo di carta
  const mTmp = new Map<number, HTMLCanvasElement>()
  const dirDi = (n: Nodo) => { const d = ['alto', 'sinistra', 'basso', 'destra'], k = (d.indexOf(scena.strati?.dir ?? 'basso') + (scena.rango?.get(n.id)?.k ?? 0)) % 4; return d[k] }
  const mascherato = (n: Nodo, u: number) => {
    const src = n.sprite!, sw = Math.max(1, Math.min(src.width, 720)), sh = Math.max(1, Math.round(src.height * sw / src.width))
    let c = mTmp.get(n.id); if (!c) { c = document.createElement('canvas'); c.width = sw; c.height = sh; mTmp.set(n.id, c) }
    const q = c.getContext('2d')!; q.globalCompositeOperation = 'source-over'; q.clearRect(0, 0, sw, sh); q.drawImage(src, 0, 0, sw, sh)
    q.globalCompositeOperation = 'destination-in'; q.fillStyle = '#000'
    const d = dirDi(n), lungo = d === 'alto' || d === 'basso' ? sh : sw
    const pos = (x: number, y: number) => (d === 'alto' ? y / sh : d === 'basso' ? 1 - y / sh : d === 'sinistra' ? x / sw : 1 - x / sw)
    if (n.rivela === 'retino') {
      const sp = Math.max(6, Math.max(sw, sh) / 36); q.beginPath()
      for (let y = 0, row = 0; y < sh + sp; y += sp * 0.866, row++) for (let x = (row % 2) * sp / 2; x < sw + sp; x += sp) { const r0 = clamp(u * 1.6 - pos(x, y) * 0.6) * sp * 0.78; if (r0 > 0.3) { q.moveTo(x + r0, y); q.arc(x, y, r0, 0, 6.2832) } }
      q.fill()
    } else if (n.rivela === 'strappo') {
      let h0 = n.id * 9301 + 49297; const rr = () => ((h0 = (h0 * 1103515245 + 12345) >>> 0) / 4294967296)
      const passi = 26, bordo = u * (lungo * 1.18) - lungo * 0.09, punti: [number, number][] = []
      for (let i = 0; i <= passi; i++) { const a = i / passi, j = (rr() - 0.5) * lungo * 0.09; punti.push([a, bordo + j]) }
      q.beginPath()
      const P = (a: number, b: number): [number, number] => (d === 'alto' ? [a * sw, b] : d === 'basso' ? [a * sw, sh - b] : d === 'sinistra' ? [b, a * sh] : [sw - b, a * sh])
      const o = d === 'alto' ? [[sw, 0], [0, 0]] : d === 'basso' ? [[sw, sh], [0, sh]] : d === 'sinistra' ? [[0, sh], [0, 0]] : [[sw, sh], [sw, 0]]
      q.moveTo(...P(punti[0][0], punti[0][1])); for (const [a, b] of punti) q.lineTo(...P(a, b)); q.lineTo(o[0][0], o[0][1]); q.lineTo(o[1][0], o[1][1]); q.closePath(); q.fill()
    } else {
      const gx = d === 'alto' ? q.createLinearGradient(0, 0, 0, sh) : d === 'basso' ? q.createLinearGradient(0, sh, 0, 0) : d === 'sinistra' ? q.createLinearGradient(0, 0, sw, 0) : q.createLinearGradient(sw, 0, 0, 0)
      const e = u * 1.12 - 0.06; gx.addColorStop(0, '#000'); gx.addColorStop(clamp(e - 0.06), '#000'); gx.addColorStop(clamp(e + 0.001), 'rgba(0,0,0,0)'); gx.addColorStop(1, 'rgba(0,0,0,0)')
      q.fillStyle = gx; q.fillRect(0, 0, sw, sh)
    }
    q.globalCompositeOperation = 'source-over'
    return c
  }
  for (let f = 0; f < Math.round(br.durata * FPS); f++) {
    const tReale = f / FPS
    // balbetta: l'ultimo battito della frase ripete il suo primo sedicesimo (come un giradischi che salta)
    const tb = fineFrase(tReale)
    const t = tReale
    const vuoto = P.fineFrase === 'vuoto' && tb >= 0
    const rp = o.riprese.find(x => t >= x.t0 - 1e-6 && t < x.t1) ?? o.riprese[o.riprese.length - 1]
    const acc = c.accoppia[rp.rel ?? 'sequenza'] ?? 'libero'
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'
    g.fillStyle = scena.bg[rp.tav]; g.fillRect(0, 0, W, H)
    // la camera
    const nodi = scena.nodi.filter(n => n.tav === rp.tav && n.ruolo !== 'fondo' || (n.tav === rp.tav && n.sprite && n.ruolo === 'fondo'))
    // i ranghi per ruolo, secondo l'ordine scelto
    const rango = new Map<number, number>(), quanti = new Map<Ruolo, number>()
    for (const ru of RUOLI) { const xs = ordine(nodi.filter(n => n.ruolo === ru), c.gesti[ru].ordine); xs.forEach((n, i) => rango.set(n.id, i)); quanti.set(ru, xs.length) }
    // se sopra c'è un testo del reel (domanda, conclusione), i testi della tavola tacciono: uno alla volta si legge
    const testoReel = (o.testi ?? []).find(x => t >= x.t0 && t < x.t1)
    // le scatole dei testi di questo istante: le figure che ci passano sotto si fanno indietro (come il sidechain nel suono)
    const sotto: { x0: number; y0: number; x1: number; y1: number }[] = []
    if (testoReel) sotto.push(scatola(testoReel.cv))
    else for (const n of nodi.filter(x => x.ruolo === 'testo' && x.sprite)) { const s0 = stato(n, c, rp, t, br, rango.get(n.id) ?? 0, quanti.get(n.ruolo) ?? 1, scena, acc); if (s0.alpha > 0.05) sotto.push({ x0: n.x + s0.dx - n.w / 2, y0: n.y + s0.dy - n.h / 2, x1: n.x + s0.dx + n.w / 2, y1: n.y + s0.dy + n.h / 2 }) }
    const testi: { n: Nodo; s: Stato }[] = []
    // chi viene colpito dal rullante: le figure principali di questa tavola, a turno
    // chi reagisce ai colpi: i generatori vivi e le lettere (le immagini ferme restano ferme)
    const bersagli = nodi.filter(n => n.vivo || n.lettera).sort((a, b) => b.area - a.area).slice(0, 5)
    const cp = P.rullante !== 'niente' ? colpo(t) : null
    const colpito = cp && bersagli.length ? bersagli[cp.i % bersagli.length].id : -1
    for (const n of nodi) {
      if (n.ruolo === 'testo' && testoReel) continue
      const s = stato(n, c, rp, t, br, rango.get(n.id) ?? 0, quanti.get(n.ruolo) ?? 1, scena, acc)
      // la partitura sulle figure
      if (vuoto && (n.ruolo === 'figura' || n.ruolo === 'linea') && bersagli[0]?.id !== n.id) continue
      // il rullante: un impulso nei generatori (la forma si sposta di fase), una ricrescita, o una lettera che si gonfia
      if (cp && (n.vivo || n.lettera)) {
        const e = cp.e * P.forza
        if (n.vivo && P.rullante === 'impulso') s.fase = (s.fase ?? 0) + 0.14 * e
        if (n.vivo && P.rullante === 'ricresci' && n.id === colpito) s.crescita = (s.crescita ?? 1) * (1 - 0.6 * e)
        if (n.lettera && (P.rullante === 'pop' || n.id === colpito)) s.sc *= 1 + 0.18 * e
      }
      // le lettere vivono per conto loro: ondeggiano col respiro della frase (sfasate una dall'altra) e saltano appena sulla cassa
      if (n.lettera && !scena.strati) { const fz = n.id * 1.7, k0 = inv(br.cassa, t, 0.12), en = br.energia(t); s.rot += 0.06 * Math.sin((t / (beat * 8)) * 6.283 + fz) * (0.5 + en); s.dy += 10 * Math.sin((t / (beat * 4)) * 6.283 + fz) * (0.4 + en) - 14 * k0 * (n.gruppo ? 1 : 0.4); s.sc *= 1 + 0.03 * Math.sin((t / (beat * 2)) * 6.283 + fz) * en }
      // a fine frase i generatori trattengono il respiro (la fase si ferma per un battito)
      if (n.vivo && P.fineFrase === 'respiro' && tb >= 0) s.fase = (s.fase ?? 0) - (t - tb) / (beat * 8)
      // il cambio: tutto ricresce dal niente, le forme si ricompongono, o i generatori mutano; a turno, sui sedicesimi
      if (n.ruolo !== 'fondo' && n.ruolo !== 'testo' && t >= br.cambio && t < br.cambio + beat * 4) {
        const ts = br.cambio + ((rango.get(n.id) ?? 0) % 8) * beat / 4, u = t - ts
        // a strati: sul cambio la tavola si rifà, strato per strato, sui sedicesimi
        if (scena.strati && !n.vivo && s.rivela !== undefined && n.rivela && ['retino', 'tendina', 'strappo'].includes(n.rivela)) s.rivela = Math.min(s.rivela, u < 0 ? 0 : clamp(u / beat))
        else if (P.cambio === 'sboccia' && !n.vivo) { const m = u < 0 ? 0 : molla(u, 16, 0.32); s.sc *= m; s.rot += (1 - m) * 0.4 }
        if (P.cambio === 'ricresce' && n.vivo) s.crescita = Math.min(s.crescita ?? 1, clamp(u / (beat * 2)))
        if (P.cambio === 'muta' && n.vivo) s.fase = (s.fase ?? 0) + 0.5 * clamp(u / beat)
        if (P.cambio !== 'sboccia' && n.lettera) { const m = u < 0 ? 0 : molla(u, 14, 0.35); s.sc *= m }
      }
      if (s.alpha <= 0.002 || s.sc <= 0.002) continue
      // indietro se passa sotto un testo
      if (n.ruolo !== 'fondo' && n.ruolo !== 'testo' && sotto.length) { const x0 = n.x + s.dx - n.w * s.sc / 2, y0 = n.y + s.dy - n.h * s.sc / 2, x1 = x0 + n.w * s.sc, y1 = y0 + n.h * s.sc; const ov = sotto.reduce((a, b) => a + Math.max(0, Math.min(x1, b.x1) - Math.max(x0, b.x0)) * Math.max(0, Math.min(y1, b.y1) - Math.max(y0, b.y0)), 0) / Math.max(1, (x1 - x0) * (y1 - y0)); if (ov > 0.05) s.alpha *= 1 - 0.65 * Math.min(1, ov * 2) }
      g.save()
      g.globalAlpha = clamp(s.alpha); g.globalCompositeOperation = n.blend
      if (n.linea) {
        const P = n.linea.punti, m = Math.max(1, Math.floor((P.length - 1) * s.traccia))
        g.strokeStyle = n.linea.colore; g.lineWidth = n.linea.spess; g.lineCap = 'round'
        g.translate(s.dx, s.dy); g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (let i = 1; i <= m; i++) g.lineTo(P[i][0], P[i][1]); g.stroke()
      } else if (n.vivo) {
        const vc = await vivo(n, s.crescita ?? 1, s.fase ?? 0)
        if (vc) { g.translate(n.x + s.dx, n.y + s.dy); g.rotate(n.rot + s.rot); g.scale(s.sc, s.sc); g.drawImage(vc, -n.w / 2, -n.h / 2, n.w, n.h) }
      } else if (n.sprite) {
        g.translate(n.x + s.dx, n.y + s.dy); g.rotate(n.rot + s.rot); g.scale(s.sc, s.sc)
        if (s.sfalda > 0 && n.particelle?.length) {
          // si scioglie nelle sue particelle, che cadono e si spargono
          g.globalAlpha = clamp(s.alpha * (1 - s.sfalda * 0.2))
          const passo = Math.max(1, Math.floor(n.particelle.length / 400))
          for (let i = 0; i < n.particelle.length; i += passo) { const p = n.particelle[i]; const a = (i * 2.399) % 6.283; g.fillStyle = p.c; g.fillRect(p.x + Math.cos(a) * s.sfalda * 160, p.y + Math.sin(a) * s.sfalda * 160 + s.sfalda * s.sfalda * 300, 4, 4) }
        } else {
          if (s.scrivi < 1) { g.beginPath(); g.rect(-n.w / 2, -n.h / 2, n.w * s.scrivi, n.h); g.clip() }
          const rv = s.rivela ?? 1
          if (rv <= 0.001 && n.rivela && n.rivela !== 'alba' && n.rivela !== 'posa' && n.rivela !== 'righe') { g.restore(); continue }
          g.drawImage(rv < 0.999 && n.rivela ? mascherato(n, rv) : n.sprite, -n.w / 2, -n.h / 2, n.w, n.h)
        }
      }
      g.restore()
    }
    g.setTransform(1, 0, 0, 1, 0, 0)
    // la copertina: il fotogramma più pieno e più vario (si controlla ogni mezzo secondo)
    if (f % 15 === 7) { const q = document.createElement('canvas'); q.width = 36; q.height = 64; const qg = q.getContext('2d')!; qg.drawImage(cv, 0, 0, 36, 64); const d = qg.getImageData(0, 0, 36, 64).data; let m = 0, m2 = 0; for (let i = 0; i < d.length; i += 4) { const l = (d[i] + d[i + 1] + d[i + 2]) / 765; m += l; m2 += l * l } const n0 = d.length / 4, v = Math.sqrt(Math.max(0, m2 / n0 - (m / n0) ** 2)); if (v > copertina.v) copertina = { v, ms: Math.round(t * 1000) } }
    const out = o.finitura ? o.finitura(cv, t) ?? cv : cv
    const fr = new VideoFrame(out, { timestamp: Math.round((f * 1e6) / FPS), duration: Math.round(1e6 / FPS) })
    ve.encode(fr, { keyFrame: f % (FPS * 2) === 0 }); fr.close()
    if (ve.encodeQueueSize > 6) await new Promise(res => setTimeout(res, 3))
    if (errore) throw errore
  }
  await ve.flush()
  if (errore) return null
  muxer.finalize()
  o.copertina?.(copertina.ms)
  return new Blob([muxer.target.buffer], { type: 'video/mp4' })
}
