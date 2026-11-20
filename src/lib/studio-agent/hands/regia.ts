/**
 * La regia dei reel: la sequenza diventa un film breve, montato sul brano.
 *
 * Tutto si appoggia alla griglia musicale (battute e battiti) e all'audio vero del brano:
 *  - il fondo è un campo generativo che si muove "a passi": a ogni battito fa un passo, con un'accelerazione morbida,
 *    così il ritmo si vede senza lampi;
 *  - la tavola entra sul battere e si costruisce per ruoli: prima i fondi, poi le figure una per battito, poi i testi;
 *    dopo resta, e respira appena con la cassa;
 *  - uno strato elettronico sottile (sequencer a 16 passi, oscilloscopio, contatore) legge i colpi veri del brano;
 *  - il titolo della tavola entra parola per parola sui battiti e poi resta fermo, su un fondo che lo fa leggere;
 *  - i passaggi tra tavole cadono sul battere, e il loro tipo dipende dalla relazione tra le due tavole.
 * Regole: niente cambi di luminosità a tutto schermo fuori dai tagli, il testo dura almeno due battute,
 * gli elementi piccoli non coprono mai quelli grandi.
 */
import { Muxer, ArrayBufferTarget } from 'mp4-muxer'
import type { Layer, Sheet } from './sheet'
import type { Eventi } from '../suono/musica'

const W = 1080, H = 1920, FPS = 30

export type Campo = 'righe' | 'griglia' | 'cerchi' | 'trama' | 'onde'
const CAMPI: Campo[] = ['righe', 'griglia', 'cerchi', 'trama', 'onde']
/** quale campo si addice a quale linguaggio (gli altri restano possibili) */
const PREFERITO: Record<string, Campo[]> = {
  costruttivista: ['righe', 'griglia'], brutalista: ['griglia', 'righe'], glitch: ['griglia', 'onde'], organico: ['cerchi', 'onde'],
  svizzero: ['griglia', 'righe'], minimo: ['righe', 'cerchi'], acido: ['onde', 'cerchi'], riso: ['trama', 'righe'], collage: ['trama', 'griglia'],
  datapoesia: ['onde', 'griglia'], concettuale: ['righe', 'trama'], ornamento: ['trama', 'cerchi'],
}

// ── curve ──
const clamp = (x: number) => Math.max(0, Math.min(1, x))
const outExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(t)))
const outBack = (t: number) => { const c = 1.4; t = clamp(t) - 1; return 1 + (c + 1) * t * t * t + c * t * t }
const inOut = (t: number) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 }
const rng = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
/** un passo per battito: parte intera = passi fatti, il resto scivola con una curva */
const passo = (t: number, beat: number, dur = 0.35) => { const b = t / beat, n = Math.floor(b), f = (b - n) / dur; return n + inOut(f) }

/** l'inviluppo dell'audio vero: bassi (cassa, basso) e alti (rullante, piatti), un valore per fotogramma */
export interface Ascolto { bassi: Float32Array; alti: Float32Array; onda: Float32Array; sr: number }
export function ascolta(buf: AudioBuffer): Ascolto {
  const x = buf.getChannelData(0), sr = buf.sampleRate, n = Math.ceil((buf.length / sr) * FPS)
  const bassi = new Float32Array(n), alti = new Float32Array(n)
  let lp = 0, a = Math.exp(-2 * Math.PI * 150 / sr)
  const hop = sr / FPS
  for (let f = 0; f < n; f++) {
    let sb = 0, sa = 0, k = 0
    for (let i = Math.floor(f * hop); i < Math.min(x.length, Math.floor((f + 1) * hop)); i++) { lp = a * lp + (1 - a) * x[i]; sb += lp * lp; const h = x[i] - lp; sa += h * h; k++ }
    bassi[f] = Math.sqrt(sb / Math.max(1, k)); alti[f] = Math.sqrt(sa / Math.max(1, k))
  }
  const norm = (v: Float32Array) => { const s = [...v].sort((p, q) => p - q), m = s[Math.floor(s.length * 0.95)] || 1; for (let i = 0; i < v.length; i++) v[i] = Math.min(1, v[i] / m) }
  norm(bassi); norm(alti)
  // un attacco rapido e un rilascio lento: si legge il colpo, non lo sfarfallio
  for (const v of [bassi, alti]) { let e = 0; for (let i = 0; i < v.length; i++) { e = v[i] > e ? v[i] : e * 0.8 + v[i] * 0.2; v[i] = e } }
  return { bassi, alti, onda: x, sr }
}

type Ruolo = 'atmosfera' | 'trama' | 'figura' | 'testo'
const TESTO = new Set(['testo', 'tipografia', 'etichette', 'firma', 'piastra'])
const TRAMA = new Set(['pattern', 'retino', 'ornato', 'caleido', 'flusso', 'sfasa', 'onde', 'punti', 'pannelli', 'orizzonte', 'mappa'])
const ATMO = new Set(['campo', 'colore', 'color', 'grana', 'duotono', 'shader', 'luce', 'materia'])
function ruoloDi(l: Layer): Ruolo {
  if (TESTO.has(l.kind)) return 'testo'
  if (TRAMA.has(l.kind)) return 'trama'
  if (ATMO.has(l.kind) || (l.blend !== 'source-over' && l.scale >= 1.15)) return 'atmosfera'
  return l.scale >= 1.15 ? 'trama' : 'figura'
}

function lum(h: string) { const m = h.replace('#', ''); const v = [0, 2, 4].map(i => parseInt(m.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2] }
const contrasto = (a: string, b: string) => { try { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) } catch { return 1 } }
const hex = (r: number, g: number, b: number) => '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')
const alfa = (h: string, a: number) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})` }
/** il colore più vivo della tavola: diventa l'accento del fondo */
function accento(s: Sheet, bg: string): string {
  const c = document.createElement('canvas'); c.width = 48; c.height = Math.round(48 * s.H / s.W)
  const g = c.getContext('2d')!
  g.fillStyle = s.bg; g.fillRect(0, 0, c.width, c.height)
  for (const l of s.layers) { g.globalAlpha = l.alpha; g.drawImage(l.canvas, 0, 0, c.width, c.height) }
  const d = g.getImageData(0, 0, c.width, c.height).data
  let best = '', bs = -1
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], gg = d[i + 1], b = d[i + 2], mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), sat = mx ? (mx - mn) / mx : 0
    const h = hex(r, gg, b), sc = sat * (mx / 255) * Math.min(3, contrasto(h, bg))
    if (sc > bs) { bs = sc; best = h }
  }
  return bs > 0.25 ? best : (lum(bg) > 0.4 ? '#e3361b' : '#f2c14e')
}

export interface Scena { titolo?: string; frase?: string; rel?: string; ascolto?: Ascolto | null; ultima?: boolean }
export interface Regia { tavola(s: Sheet, ev: Eventi, sc?: Scena): Promise<void>; fine(): Promise<Blob | null> }

export async function puoRegia(): Promise<boolean> {
  if (typeof VideoEncoder === 'undefined') return false
  const v = await VideoEncoder.isConfigSupported({ codec: 'avc1.640028', width: W, height: H, bitrate: 6_000_000, framerate: FPS }).catch(() => ({ supported: false }))
  return !!v.supported
}

export async function nuovaRegia(o: { linguaggio: string; nome: string; N: number; seme: number; bpm: number; carattere?: string }): Promise<Regia | null> {
  if (!(await puoRegia())) return null
  const r = rng(o.seme)
  const pref = o.linguaggio.split('×').flatMap(x => PREFERITO[x] ?? [])
  const campo: Campo = pref.length && r() < 0.75 ? pref[Math.floor(r() * pref.length)] : CAMPI[Math.floor(r() * CAMPI.length)]
  const carattere = o.carattere ?? 'Georgia'
  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: 'avc', width: W, height: H, frameRate: FPS }, fastStart: 'in-memory' })
  let errore: unknown = null
  const ve = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: e => { errore = e } })
  ve.configure({ codec: 'avc1.640028', width: W, height: H, bitrate: 3_500_000, framerate: FPS })
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H
  const g = cv.getContext('2d')!
  let nFrame = 0, k = 0
  let primaCarta: HTMLCanvasElement | null = null // la tavola precedente, per il passaggio
  let primaBox: { x: number; y: number; w: number; h: number } | null = null
  const celle = { C: 9, R: 16, v: new Uint8Array(9 * 16), m: new Float32Array(9 * 16), passi: -1 }
  for (let i = 0; i < celle.v.length; i++) celle.v[i] = r() < 0.3 ? 1 : 0

  const emetti = async () => {
    const fr = new VideoFrame(cv, { timestamp: Math.round((nFrame * 1e6) / FPS), duration: Math.round(1e6 / FPS) })
    ve.encode(fr, { keyFrame: nFrame % (FPS * 2) === 0 }); fr.close(); nFrame++
    if (ve.encodeQueueSize > 8) await new Promise(res => setTimeout(res, 5))
    if (nFrame % 30 === 0) await new Promise(res => setTimeout(res, 0))
  }

  // ── il fondo ──
  const fondo = (bg: string, ink: string, acc: string, t: number, tg: number, ev: Eventi, en: number, B: number, A: number, au: Ascolto | null, f: number, segno: string) => {
    g.fillStyle = bg; g.fillRect(0, 0, W, H)
    const beat = ev.beat, P = passo(tg, beat)
    const forza = 0.55 + 0.45 * en
    g.save()
    if (campo === 'righe') {
      // righe orizzontali: a ogni battito scendono di una riga; lo spessore respira con i bassi
      const sp = 64, off = (P % 8) * sp / 8 * 8 % sp
      for (let y = -sp + off, i = 0; y < H + sp; y += sp, i++) {
        const acc_ = (i + Math.floor(P)) % 8 === 0
        g.fillStyle = alfa(acc_ ? acc : ink, (acc_ ? 0.55 : 0.12) * forza)
        g.fillRect(0, y, W, (acc_ ? 10 : 3) + B * 6)
      }
    } else if (campo === 'griglia') {
      // un automa di celle: un passo a ogni battito, le celle si accendono e si spengono in un quarto di battito
      const passi = Math.floor(tg / beat)
      while (celle.passi < passi) {
        celle.passi++
        const n = new Uint8Array(celle.v.length)
        for (let y = 0; y < celle.R; y++) for (let x = 0; x < celle.C; x++) {
          let c = 0
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) c += celle.v[((y + dy + celle.R) % celle.R) * celle.C + (x + dx + celle.C) % celle.C]
          const i = y * celle.C + x
          n[i] = celle.v[i] ? (c === 2 || c === 3 ? 1 : 0) : (c === 3 || c === 6 ? 1 : 0)
        }
        if (n.every(v => !v) || n.join() === celle.v.join()) for (let i = 0; i < n.length; i++) n[i] = r() < 0.28 ? 1 : 0
        celle.v = n
      }
      const cw = W / celle.C, ch = H / celle.R
      for (let i = 0; i < celle.v.length; i++) {
        celle.m[i] += (celle.v[i] - celle.m[i]) * 0.25
        if (celle.m[i] < 0.02) continue
        const x = (i % celle.C) * cw, y = Math.floor(i / celle.C) * ch, z = Math.min(cw, ch) * 0.62 * celle.m[i]
        g.fillStyle = alfa((i * 7) % 11 === 0 ? acc : ink, ((i * 7) % 11 === 0 ? 0.6 : 0.16) * forza)
        g.fillRect(x + (cw - z) / 2, y + (ch - z) / 2, z, z)
      }
    } else if (campo === 'cerchi') {
      // un anello nasce a ogni colpo di cassa e si allarga per due battiti
      g.lineWidth = 3
      for (const c of ev.cassa) {
        const d = t - c; if (d < 0 || d > beat * 2.5) continue
        const p = outExpo(d / (beat * 2.5)), R = 80 + p * H * 0.75
        g.strokeStyle = alfa(ink, (1 - p) * 0.35 * forza)
        g.beginPath(); g.arc(W / 2, H * 0.42, R, 0, Math.PI * 2); g.stroke()
      }
      g.fillStyle = alfa(acc, 0.5 * forza); g.beginPath(); g.arc(W / 2, H * 0.42, 40 + B * 40, 0, Math.PI * 2); g.fill()
    } else if (campo === 'trama') {
      // la lettera del concetto ripetuta a mezzo salto; ogni battuta ruota di un quarto
      const q = passo(tg, beat * 4, 0.25) * Math.PI / 2, s = 150
      g.font = `${s * 0.8}px '${carattere}', serif`; g.textAlign = 'center'; g.textBaseline = 'middle'
      for (let y = 0, i = 0; y < H + s; y += s, i++) for (let x = (i & 1) * s / 2; x < W + s; x += s) {
        g.save(); g.translate(x, y); g.rotate(q * ((i & 1) ? 1 : -1))
        g.fillStyle = alfa((i + Math.round(x / s)) % 5 === 0 ? acc : ink, 0.2 * forza); g.fillText(segno, 0, 0); g.restore()
      }
    } else {
      // l'onda vera del brano, ripetuta in fasce
      if (au) {
        const s0 = Math.floor(f / FPS * au.sr), n = Math.floor(au.sr / FPS * 2)
        for (let fascia = 0; fascia < 7; fascia++) {
          const y0 = H * (fascia + 0.5) / 7
          g.strokeStyle = alfa(fascia === 3 ? acc : ink, (fascia === 3 ? 0.7 : 0.22) * forza); g.lineWidth = fascia === 3 ? 4 : 2
          g.beginPath()
          for (let x = 0; x <= W; x += 6) { const i = s0 + Math.floor(x / W * n) + fascia * 37; const v = au.onda[Math.min(au.onda.length - 1, i)] ?? 0; const y = y0 + v * 180 * (0.6 + B); x ? g.lineTo(x, y) : g.moveTo(x, y) }
          g.stroke()
        }
      }
    }
    void A
    g.restore()
  }

  // ── la tavola, costruita per ruoli dentro la sua cornice ──
  const carta = (s: Sheet, ruoli: Ruolo[], ingressi: number[], t: number, beat: number, B: number, c = document.createElement('canvas')) => {
    if (c.width !== Math.round(s.W) || c.height !== Math.round(s.H)) { c.width = Math.round(s.W); c.height = Math.round(s.H) }
    const q = c.getContext('2d')!
    q.setTransform(1, 0, 0, 1, 0, 0); q.globalAlpha = 1; q.globalCompositeOperation = 'source-over'
    q.fillStyle = s.bg; q.fillRect(0, 0, c.width, c.height)
    for (const [j, l] of s.layers.entries()) {
      const R = ruoli[j], p = (t - ingressi[j]) / (R === 'figura' ? beat * 0.9 : beat * 0.6)
      if (p < 0) continue
      const e = R === 'figura' ? outBack(p) : outExpo(p)
      let a = l.alpha * clamp(p * 1.6), dx = 0, dy = 0, sc = 1, rot = 0
      if (R === 'trama') { const P = passo(t, beat); if (l.kind === 'caleido' || l.kind === 'ornato') rot = P * 0.02; else dy = -P * 6 }
      if (R === 'figura') { sc = 0.92 + 0.08 * e + 0.018 * B; dy = (1 - e) * 30 }
      if (R === 'testo') dy = (1 - outExpo(p)) * 14
      if (a <= 0.003) continue
      q.save(); q.globalAlpha = Math.min(1, a); q.globalCompositeOperation = l.blend
      const kk = (Math.min(s.W, s.H) * l.scale) / Math.max(l.canvas.width, l.canvas.height)
      q.translate(l.x * s.W + dx, l.y * s.H + dy); q.rotate(l.rot + rot); if (l.flipX) q.scale(-1, 1); q.scale(kk * sc, kk * sc)
      q.drawImage(l.canvas, -l.canvas.width / 2, -l.canvas.height / 2); q.restore()
    }
    return c
  }

  const tavola = async (s: Sheet, ev: Eventi, sc: Scena = {}) => {
    k++
    const beat = ev.beat, bar = beat * 4, dur = ev.durata
    const au = sc.ascolto ?? null
    // i colori: il fondo prende la carta della tavola, scurita o schiarita per staccarla; l'inchiostro il suo contrario
    const bg = s.bg, ink = contrasto('#111111', bg) > contrasto('#f4f2ec', bg) ? '#111111' : '#f4f2ec'
    const acc = accento(s, bg)
    const segno = (sc.titolo ?? o.nome).replace(/^[^\p{L}]+/u, '').charAt(0).toUpperCase() || '·'
    // la cornice della tavola: in alto, lascia spazio al titolo sotto
    const cw = 880, ch0 = cw * s.H / s.W, ch = Math.min(ch0, 1100), cwr = ch * s.W / s.H
    const box = { x: (W - cwr) / 2, y: 170 + (1100 - ch) / 2, w: cwr, h: ch }
    // i tempi: figure una per battito nella prima battuta, testi della tavola dalla seconda
    const ruoli = s.layers.map(ruoloDi)
    let fig = 0, tx = 0
    const nFig = ruoli.filter(x => x === 'figura').length
    const ingressi = ruoli.map(R => R === 'atmosfera' || R === 'trama' ? 0 : R === 'figura' ? Math.min(bar - beat / 2, (fig++) * (nFig > 4 ? beat / 2 : beat)) : bar + (tx++) * beat)
    // il titolo: parola per parola sui battiti della seconda battuta, poi fermo
    // sotto la tavola va la sua frase (sul telefono il testo dentro la tavola è troppo piccolo); se non c'è, il titolo
    const frase = String(sc.frase ?? '').replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s/)[0] ?? ''
    const parole = (frase.split(' ').length >= 3 && frase.split(' ').length <= 22 ? frase : (sc.titolo ?? '').replace(/^\d+\/\d+\s*·\s*/, '')).split(/\s+/).filter(Boolean).slice(0, 22)
    const tParola = (i: number) => bar + i * (parole.length > 8 ? beat / 2 : beat)
    const n = Math.round(dur * FPS)
    const tipoPassaggio = !primaCarta ? 'entra' : sc.rel === 'contro' ? 'taglio' : sc.rel === 'identita' || sc.rel === 'dentro' ? 'dissolve' : 'spinta'
    const f0 = nFrame
    const tela = document.createElement('canvas')
    for (let f = 0; f < n; f++) {
      const t = f / FPS, tg = (nFrame) / FPS
      const B = au ? au.bassi[Math.min(au.bassi.length - 1, f)] ?? 0 : Math.max(0, ...ev.cassa.map(c => t >= c ? Math.exp(-(t - c) / 0.12) : 0))
      const A = au ? au.alti[Math.min(au.alti.length - 1, f)] ?? 0 : 0
      fondo(bg, ink, acc, t, tg, ev, ev.energia, B, A, au, f, segno)
      // la tavola: cornice che entra sul battere, poi respira appena con la cassa
      const c = carta(s, ruoli, ingressi, t, beat, B, tela)
      const pIn = clamp(t / beat)
      // la tavola si avvicina piano per tutta la scena e a ogni battuta fa un piccolo passo di lato, a tempo
      const respiro = (1 + 0.035 * inOut(t / dur)) * (1 + 0.01 * B)
      const lato = Math.sin(passo(t, bar, 0.4) * Math.PI) * 14
      g.save()
      g.shadowColor = 'rgba(0,0,0,0.25)'; g.shadowBlur = 40; g.shadowOffsetY = 14
      if (tipoPassaggio === 'spinta' || tipoPassaggio === 'entra') {
        const dx = (1 - outExpo(pIn)) * W * (k % 2 ? 1 : -1)
        if (primaCarta && primaBox && pIn < 1) g.drawImage(primaCarta, primaBox.x + dx - W * (k % 2 ? 1 : -1), primaBox.y, primaBox.w, primaBox.h)
        const cx = box.x + box.w / 2 + dx + lato, cy = box.y + box.h / 2
        g.translate(cx, cy); g.scale(respiro, respiro); g.drawImage(c, -box.w / 2, -box.h / 2, box.w, box.h)
      } else if (tipoPassaggio === 'dissolve') {
        if (primaCarta && primaBox && pIn < 1) { g.globalAlpha = 1 - inOut(pIn); g.drawImage(primaCarta, primaBox.x, primaBox.y, primaBox.w, primaBox.h); g.globalAlpha = inOut(pIn) }
        g.translate(box.x + box.w / 2 + lato, box.y + box.h / 2); g.scale(respiro, respiro); g.drawImage(c, -box.w / 2, -box.h / 2, box.w, box.h)
      } else {
        // taglio netto sul battere, con la tavola nuova che arriva dal lato opposto di pochissimo
        const dy = (1 - outExpo(pIn)) * 40
        g.translate(box.x + box.w / 2, box.y + box.h / 2 + dy); g.scale(respiro, respiro); g.drawImage(c, -box.w / 2, -box.h / 2, box.w, box.h)
      }
      g.restore()
      // lo strato elettronico: 16 passi, l'onda sotto la tavola, il contatore
      const st = Math.floor(t / (beat / 4)) % 16
      const y16 = 70, w16 = (W - 160) / 16
      for (let i = 0; i < 16; i++) {
        const hit = [...ev.cassa, ...ev.rullante].some(x => Math.abs(((x / (beat / 4)) % 16) - i) < 0.01)
        const on = i === st
        g.fillStyle = alfa(on ? acc : ink, on ? 0.95 : hit ? 0.45 : 0.15)
        g.fillRect(80 + i * w16 + 4, y16, w16 - 8, on ? 14 : 8)
      }
      if (au) {
        const s0 = Math.floor(f / FPS * au.sr), m = Math.floor(au.sr / FPS)
        g.strokeStyle = alfa(ink, 0.7); g.lineWidth = 2; g.beginPath()
        for (let x = 0; x <= box.w; x += 4) { const v = au.onda[Math.min(au.onda.length - 1, s0 + Math.floor(x / box.w * m))] ?? 0; const y = box.y + box.h + 34 + v * 60; x ? g.lineTo(box.x + x, y) : g.moveTo(box.x, y) }
        g.stroke()
      }
      g.font = "26px ui-monospace, Menlo, monospace"; g.textBaseline = 'middle'; g.textAlign = 'left'
      g.fillStyle = alfa(ink, 0.85)
      g.fillText(`${o.nome.toLowerCase()} · ${String(k).padStart(2, '0')}/${String(o.N).padStart(2, '0')} · ${o.bpm} bpm`, 80, 120)
      // il titolo: sotto la tavola, grande, su un fondo pieno; ogni parola sul suo battito, poi fermo fino alla fine
      if (parole.length && t >= tParola(0)) {
        const L = parole.join(' ').length, corpo = L > 110 ? 48 : L > 70 ? 54 : L > 35 ? 62 : 80
        g.font = `600 ${corpo}px '${carattere}', Georgia, serif`; g.textAlign = 'left'; g.textBaseline = 'alphabetic'
        const righe: string[][] = [[]]; const maxW = W - 160
        parole.forEach((p, i) => { const prova = [...righe[righe.length - 1], p].join(' '); if (g.measureText(prova).width > maxW && righe[righe.length - 1].length) righe.push([]); righe[righe.length - 1].push(p); void i })
        let idx = 0
        const y0 = box.y + box.h + 110 + corpo * 0.4
        righe.slice(0, 5).forEach((riga, ri) => {
          let x = 80
          const y = y0 + ri * corpo * 1.12
          const visibili = riga.filter((_, wi) => t >= tParola(idx + wi))
          if (visibili.length) { const w = g.measureText(visibili.join(' ')).width; g.fillStyle = bg; g.fillRect(70, y - corpo * 0.9, w + 20, corpo * 1.12) }
          for (const p of riga) {
            const tt = tParola(idx++)
            if (t < tt) break
            const e = outExpo((t - tt) / (beat * 0.5))
            g.save(); g.globalAlpha = clamp(e * 1.4); g.fillStyle = ink; g.fillText(p, x, y + (1 - e) * 18); g.restore()
            x += g.measureText(p + ' ').width
          }
        })
      }
      // l'ultima tavola chiude: dopo il brano resta il nome, su fondo pieno
      if (dur - t < 1.5 && sc.ultima) {
        const p = inOut((1.5 - (dur - t)) / 1.2)
        g.fillStyle = alfa(bg, p); g.fillRect(0, 0, W, H)
        g.globalAlpha = p; g.fillStyle = ink; g.textAlign = 'center'; g.font = `600 110px '${carattere}', Georgia, serif`; g.fillText(o.nome, W / 2, H / 2); g.globalAlpha = 1; g.textAlign = 'left'
      }
      await emetti()
      if (errore) throw errore
    }
    void f0
    primaCarta = carta(s, ruoli, ingressi, dur, beat, 0); primaBox = box
  }

  return {
    async tavola(s, ev, sc) { await tavola(s, ev, sc) },
    async fine() {
      await ve.flush()
      if (errore || !nFrame) return null
      muxer.finalize()
      return new Blob([muxer.target.buffer], { type: 'video/mp4' })
    },
  }
}
