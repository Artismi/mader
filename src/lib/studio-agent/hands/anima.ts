/**
 * Il reel: la sequenza che si costruisce davanti a chi guarda, a tempo con il brano.
 *
 * Principi (da motion design e lavori audio-reattivi):
 *  - sincronia "a griglia": gli ingressi atterrano sui battiti; un piccolo movimento d'anticipo li precede,
 *    l'impatto cade esattamente sul colpo; i cambi di tavola cadono sul primo tempo della battuta;
 *  - ogni strumento muove una cosa diversa: la cassa pulsa le figure e la camera, il rullante dà
 *    i colpi secchi (e i glitch), gli accordi fanno respirare i fondi;
 *  - le trame generative si animano nel loro parametro di tempo: scorrono, ruotano, sfasano (alla Reich);
 *  - il testo deve restare leggibile: entra a pezzi sul battere e poi sta fermo;
 *  - lo stile del movimento viene dal linguaggio della sequenza (il glitch scatta, l'organico cresce).
 * Formato: 1080×1920 (9:16), 30 fotogrammi al secondo, H.264. L'audio lo aggiunge chi monta (ffmpeg).
 */
import { Muxer, ArrayBufferTarget } from 'mp4-muxer'
import type { Layer, Sheet } from './sheet'
import type { Eventi } from '../suono/musica'

const W = 1080, H = 1920, FPS = 30

type Stile = 'scatto' | 'glitch' | 'organico' | 'preciso' | 'acido' | 'carta' | 'conta' | 'ornato'
const STILE: Record<string, Stile> = {
  costruttivista: 'scatto', brutalista: 'scatto', glitch: 'glitch', organico: 'organico', svizzero: 'preciso', minimo: 'preciso',
  acido: 'acido', riso: 'carta', collage: 'carta', datapoesia: 'conta', concettuale: 'conta', ornamento: 'ornato',
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

// ── curve ──
const clamp = (x: number) => Math.max(0, Math.min(1, x))
const ease = {
  outBack: (t: number) => { const c = 1.70158; t = clamp(t) - 1; return 1 + (c + 1) * t * t * t + c * t * t },
  outExpo: (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(t))),
  inOutSine: (t: number) => -(Math.cos(Math.PI * clamp(t)) - 1) / 2,
  outCubic: (t: number) => 1 - Math.pow(1 - clamp(t), 3),
  inOutCubic: (t: number) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 },
}
/** quanto "colpisce" un evento: 1 sul colpo, poi decade */
const colpo = (t: number, ts: number[], dec: number) => { let v = 0; for (const x of ts) { const d = t - x; if (d >= 0 && d < dec * 4) v = Math.max(v, Math.exp(-d / dec)) } return v }
const rng = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }

export interface Reel {
  tavola(s: Sheet, ev: Eventi, info?: { titolo?: string }): Promise<void>
  fine(): Promise<Blob | null>
}

export async function puoReel(): Promise<boolean> {
  if (typeof VideoEncoder === 'undefined') return false
  const v = await VideoEncoder.isConfigSupported({ codec: 'avc1.640028', width: W, height: H, bitrate: 4_000_000, framerate: FPS }).catch(() => ({ supported: false }))
  return !!v.supported
}

export async function nuovoReel(o: { linguaggio: string; nome: string; N: number; seme: number }): Promise<Reel | null> {
  if (!(await puoReel())) return null
  const stili = o.linguaggio.split('×').map(x => STILE[x]).filter(Boolean) as Stile[]
  const stile: Stile = stili[0] ?? 'preciso'
  const secondo: Stile | undefined = stili[1]
  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: 'avc', width: W, height: H, frameRate: FPS }, fastStart: 'in-memory' })
  let errore: unknown = null
  const ve = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: e => { errore = e } })
  ve.configure({ codec: 'avc1.640028', width: W, height: H, bitrate: 4_000_000, framerate: FPS })
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H
  const g = cv.getContext('2d')!
  let nFrame = 0
  let prima: HTMLCanvasElement | null = null // l'ultimo fotogramma della tavola precedente (per il passaggio)
  let ultima: { s: Sheet; ev: Eventi; k: number } | null = null
  let k = 0

  const emetti = async () => {
    const fr = new VideoFrame(cv, { timestamp: Math.round((nFrame * 1e6) / FPS), duration: Math.round(1e6 / FPS) })
    ve.encode(fr, { keyFrame: nFrame % (FPS * 2) === 0 }); fr.close(); nFrame++
    if (ve.encodeQueueSize > 8) await new Promise(r => setTimeout(r, 5))
    if (nFrame % 30 === 0) await new Promise(r => setTimeout(r, 0))
  }

  /** disegna la tavola al tempo t (secondi dall'inizio della tavola) */
  const disegna = (s: Sheet, ev: Eventi, t: number, n: number, piano: Piano) => {
    const { beat } = ev
    const box = { x: 0, y: (H - W * (s.H / s.W)) / 2, w: W, h: W * (s.H / s.W) }
    const kick = colpo(t, ev.cassa, beat * 0.18), snare = colpo(t, ev.rullante, beat * 0.12)
    const bar = Math.floor(t / (beat * 4))
    // stop-motion per la "carta": il tempo avanza a scatti (12 al secondo)
    const tt = stile === 'carta' ? Math.floor(t * 12) / 12 : t
    g.save()
    g.fillStyle = s.bg; g.fillRect(0, 0, W, H)
    // la camera: una lenta spinta in avanti, e il colpo di cassa
    const forza = (stile === 'scatto' || stile === 'glitch' || stile === 'acido' ? 0.025 : stile === 'organico' || stile === 'ornato' ? 0.006 : 0.012) * (0.5 + ev.energia)
    // il montaggio: inquadrature che cambiano con un taglio netto sul battito (campo largo, dettaglio, mezzo campo)
    const q = piano.inquadrature.filter(x => x.da <= t).pop() ?? { da: 0, zoom: 1, cx: W / 2, cy: H / 2 }
    const dentro = (t - q.da) / Math.max(0.001, (piano.inquadrature.find(x => x.da > t)?.da ?? ev.durata) - q.da)
    let cam = q.zoom * (1 + 0.03 * dentro) + forza * kick // dentro l'inquadratura: una lenta spinta, e la cassa
    if (piano.uscita > 0 && stile !== 'preciso') cam *= 1 - 0.015 * piano.uscita
    g.translate(W / 2, H / 2); g.scale(cam, cam)
    if (stile === 'scatto' && kick > 0.7) g.translate((piano.r() - 0.5) * 6, (piano.r() - 0.5) * 6)
    g.translate(-q.cx, -q.cy)
    if (stile === 'acido' || secondo === 'acido') g.filter = `hue-rotate(${Math.round(tt * 25 + bar * 30) % 360}deg)`
    for (const [j, l] of s.layers.entries()) {
      const R = piano.ruoli[j], ing = piano.ingresso[j]
      const p = (tt - ing) / piano.durIngresso[j] // avanzamento dell'ingresso
      if (p < 0) continue
      let alpha = l.alpha, sc = 1, rot = 0, dx = 0, dy = 0, svela = 1
      const fase = piano.fase[j]
      if (R === 'atmosfera') {
        alpha *= stile === 'scatto' || stile === 'glitch' ? (p >= 0 ? 1 : 0) : ease.inOutSine(p)
        alpha *= 0.9 + 0.1 * Math.sin((tt / (beat * 8)) * Math.PI * 2 + fase) // respira con le battute
      } else if (R === 'trama') {
        // le trame vivono nel loro tempo: scorrono, ruotano, si sfasano
        const vel = stile === 'organico' || stile === 'ornato' ? 0.25 : stile === 'scatto' ? 0.6 : 0.4
        if (l.kind === 'caleido' || l.kind === 'ornato' || stile === 'ornato') rot = tt * 0.05 * vel * (fase > Math.PI ? -1 : 1)
        else { dx = Math.sin(tt * 0.35 * vel + fase) * W * 0.04; dy = -tt * H * 0.006 * vel }
        sc = 1.12 + 0.03 * kick * (stile === 'organico' ? 0.3 : 1)
        const e = stile === 'scatto' || stile === 'glitch' ? ease.outExpo(p) : ease.inOutCubic(p)
        alpha *= e
        if (stile === 'preciso') svela = e // si apre come una tendina
      } else if (R === 'figura') {
        // entra secca sul battito: 2–3 fotogrammi, un minimo assestamento, poi sta
        const e = stile === 'organico' ? ease.outCubic(p) : ease.outExpo(p)
        if (stile === 'scatto') { dx = Math.cos(fase) * (1 - e) * W * 0.5; dy = Math.sin(fase) * (1 - e) * H * 0.3 }
        else if (stile === 'conta') svela = Math.floor(clamp(p) * 6) / 6
        else sc *= 1.06 - 0.06 * e
        alpha *= stile === 'scatto' ? 1 : clamp(p * 3)
        sc *= 1 + 0.03 * kick * (stile === 'preciso' ? 0.3 : 1)
        if (stile === 'organico') { sc *= 1 + 0.012 * Math.sin(tt * 1.1 + fase); rot += Math.sin(tt * 0.5 + fase) * 0.01 }
      } else {
        // testo: entra a pezzi sul battere (come parole) e poi sta fermo, perché deve leggersi
        svela = piano.pezzi[j] > 1 ? Math.min(1, Math.floor(clamp(p) * piano.pezzi[j] + 0.0001) / piano.pezzi[j] + (p >= 1 ? 1 : 0)) : ease.outCubic(p)
        alpha *= l.kind === 'piastra' ? ease.outCubic(p) : 1
      }
      if (alpha <= 0.003) continue
      // dove sta: le trame e i fondi coprono tutto il fotogramma verticale, il resto sta nel riquadro della tavola
      g.save()
      g.globalAlpha = Math.min(1, alpha); g.globalCompositeOperation = l.blend
      const piena = R === 'atmosfera' || R === 'trama'
      let cx: number, cy: number, kk: number
      if (piena && l.scale >= 1.15) { cx = W / 2; cy = H / 2; kk = Math.max(W / l.canvas.width, H / l.canvas.height) }
      else { cx = box.x + l.x * box.w; cy = box.y + l.y * box.h; kk = (Math.min(box.w, box.h) * l.scale) / Math.max(l.canvas.width, l.canvas.height) }
      g.translate(cx + dx, cy + dy); g.rotate(l.rot + rot); if (l.flipX) g.scale(-1, 1); g.scale(kk * sc, kk * sc)
      const cw = l.canvas.width, ch = l.canvas.height
      if (svela < 1) { g.beginPath(); g.rect(-cw / 2, -ch / 2, cw * clamp(svela), ch); g.clip() }
      g.drawImage(l.canvas, -cw / 2, -ch / 2)
      g.restore()
    }
    g.filter = 'none'
    g.restore()
    // il glitch: sul rullante il fotogramma si spacca in fasce che slittano
    if ((stile === 'glitch' || secondo === 'glitch') && snare > 0.5) {
      const copia = document.createElement('canvas'); copia.width = W; copia.height = H; copia.getContext('2d')!.drawImage(cv, 0, 0)
      for (let f = 0; f < 7; f++) { const y = piano.r() * H, h = 20 + piano.r() * 120, sx = (piano.r() - 0.5) * 120 * snare; g.drawImage(copia, 0, y, W, h, sx, y, W, h) }
      g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.35 * snare; g.drawImage(copia, 8, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'
    }
    // il piatto: un lampo breve
    const cr = colpo(t, ev.crash, 0.06)
    if (cr > 0.2) { g.fillStyle = '#ffffff'; g.globalAlpha = 0.18 * cr; g.fillRect(0, 0, W, H); g.globalAlpha = 1 }
    // in basso, piccolo: chi è e dove siamo
    g.fillStyle = s.bg; g.globalAlpha = 0.85; g.fillRect(0, H - 96, W, 96); g.globalAlpha = 1
    g.font = '28px ui-monospace, Menlo, monospace'; g.textBaseline = 'middle'
    g.fillStyle = piano.inchiostro
    g.fillText(`${o.nome} · ${n}/${o.N}`, 40, H - 48)
  }

  interface Piano { inquadrature: { da: number; zoom: number; cx: number; cy: number }[]; ruoli: Ruolo[]; ingresso: number[]; durIngresso: number[]; fase: number[]; pezzi: number[]; r: () => number; uscita: number; inchiostro: string }
  /** quando entra ogni strato: i fondi subito, le trame sul primo colpo, le figure una per battito, il testo dalla seconda battuta */
  const pianifica = (s: Sheet, ev: Eventi, seme: number): Piano => {
    const r = rng(seme)
    const { beat } = ev
    const nb = Math.max(4, Math.round(ev.durata / beat))
    const ruoli = s.layers.map(ruoloDi)
    const ingresso: number[] = [], durIngresso: number[] = [], fase: number[] = [], pezzi: number[] = []
    let fig = 0
    const passo = stile === 'organico' || stile === 'ornato' ? 1 : 0.5 // figure: ogni battito o ogni mezzo
    const anticipo = stile === 'preciso' ? 0 : beat * 0.25
    const nFig = ruoli.filter(x => x === 'figura').length
    const finoA = Math.floor(nb * 0.45) // tutto dentro entro poco meno di metà tavola
    const passoFig = Math.max(0.25, Math.min(passo, finoA / Math.max(1, nFig)))
    for (const [j, R] of ruoli.entries()) {
      fase.push(r() * Math.PI * 2); pezzi.push(1)
      if (R === 'atmosfera') { ingresso.push(0); durIngresso.push(stile === 'organico' ? beat * 2 : beat) }
      else if (R === 'trama') { ingresso.push(ev.cassa[0] ?? 0); durIngresso.push(stile === 'scatto' || stile === 'glitch' ? beat * 0.5 : beat * 2) }
      else if (R === 'figura') { const b = 1 + fig * passoFig; fig++; ingresso.push(Math.max(0, b * beat - anticipo)); durIngresso.push(stile === 'scatto' ? beat * 0.5 : beat * (stile === 'organico' ? 2 : 1)) }
      else {
        const testi = s.layers.slice(0, j).filter((_, q) => ruoli[q] === 'testo').length
        const inizio = Math.round(nb * 0.5) + testi * 2 // il testo a metà tavola (prima il montaggio), poi resta fermo
        ingresso.push(inizio * beat)
        const parole = Math.max(1, Math.min(6, (s.layers[j].meta?.text ?? '').split(/\s+/).filter(Boolean).length || (testi === 0 ? 4 : 1)))
        pezzi[j] = testi === 0 ? parole : 1
        durIngresso.push(testi === 0 ? beat * parole : beat * 1.5)
      }
    }
    // la lista delle inquadrature: si costruisce in campo largo; poi dettagli a tempo; quando arriva il testo, campo largo fermo
    const box = { y: (H - W * (s.H / s.W)) / 2, h: W * (s.H / s.W) }
    const centri = s.layers.map((l, j) => ({ l, R: ruoli[j] })).filter(x => x.R === 'figura' || (x.R === 'trama' && x.l.scale < 1.15)).map(x => ({ cx: x.l.x * W, cy: box.y + x.l.y * box.h, z: Math.min(2.4, Math.max(1.35, 0.55 / Math.max(0.15, x.l.scale))) }))
    const inizioTesto = Math.min(...ingresso.filter((_, j) => ruoli[j] === 'testo'), ev.durata)
    const inq: Piano['inquadrature'] = [{ da: 0, zoom: 1, cx: W / 2, cy: H / 2 }]
    // l'energia della sezione (la stessa che decide quanti strumenti suonano) decide quanto è serrato il montaggio
    const ogni = (ev.energia > 0.75 ? 1 : ev.energia > 0.45 ? 2 : 4) * (ev.beat < 0.4 ? 2 : 1) * beat
    let t0 = Math.max(beat * 4, (ingresso.filter((_, j) => ruoli[j] === 'figura').pop() ?? 0) + beat)
    let c = 0
    while (centri.length && t0 + ogni <= inizioTesto - beat * 0.5) {
      const x = centri[Math.floor(r() * centri.length)]
      inq.push(c % 3 === 2 ? { da: t0, zoom: 1.2, cx: W / 2, cy: H / 2 } : { da: t0, zoom: x.z, cx: x.cx, cy: x.cy })
      t0 += ogni; c++
    }
    if (inizioTesto < ev.durata) inq.push({ da: inizioTesto, zoom: 1, cx: W / 2, cy: H / 2 })
    const ink = ['#111111', '#f4f2ec'].sort((a, b) => lum(b, s.bg) - lum(a, s.bg))[0]
    return { inquadrature: inq, ruoli, ingresso, durIngresso, fase, pezzi, r, uscita: 0, inchiostro: ink }
  }

  const tavola = async (s: Sheet, ev: Eventi) => {
    k++
    const piano = pianifica(s, ev, o.seme + k * 7919)
    const n = Math.round(ev.durata * FPS)
    const pass = Math.round((stile === 'organico' || stile === 'ornato' ? ev.beat : stile === 'preciso' || stile === 'acido' ? ev.beat * 0.5 : 0) * FPS)
    const vecchio = prima
    for (let f = 0; f < n; f++) {
      const t = f / FPS
      piano.uscita = clamp((t - (ev.durata - ev.beat * 0.5)) / (ev.beat * 0.5))
      disegna(s, ev, t, k, piano)
      // il passaggio dalla tavola prima, sul primo tempo
      if (vecchio && f < pass) {
        const a = 1 - ease.inOutSine(f / pass)
        if (stile === 'preciso') { const x = W * (1 - a); g.drawImage(vecchio, x, 0, W - x, H, x, 0, W - x, H) }
        else if (stile === 'acido') { g.save(); g.globalAlpha = a; const z = 1 + (1 - a) * 0.4; g.translate(W / 2, H / 2); g.scale(z, z); g.drawImage(vecchio, -W / 2, -H / 2); g.restore() }
        else { g.globalAlpha = a; g.drawImage(vecchio, 0, 0); g.globalAlpha = 1 }
      } else if (vecchio && f < 2 && (stile === 'scatto' || stile === 'glitch')) {
        // taglio netto con un lampo
        g.fillStyle = f === 0 ? '#ffffff' : s.bg; g.globalAlpha = f === 0 ? 0.5 : 0.2; g.fillRect(0, 0, W, H); g.globalAlpha = 1
      }
      await emetti()
      if (errore) throw errore
    }
    const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d')!.drawImage(cv, 0, 0)
    prima = c
    ultima = { s, ev, k }
  }

  return {
    async tavola(s, ev) { await tavola(s, ev) },
    async fine() {
      void ultima
      await ve.flush()
      if (errore || !nFrame) return null
      muxer.finalize()
      return new Blob([muxer.target.buffer], { type: 'video/mp4' })
    },
  }
}

function lum(a: string, b: string) {
  const L = (h: string) => { const m = h.replace('#', ''); const v = [0, 2, 4].map(i => parseInt(m.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2] }
  try { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05) } catch { return 1 }
}
