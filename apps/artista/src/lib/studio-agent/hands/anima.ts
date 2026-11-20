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

  /**
   * Una tavola, sobria: un'inquadratura sola che avanza piano; i fondi e le trame ci sono da subito
   * (le trame si muovono lente nel loro tempo); le figure entrano morbide, una per battito, nella prima battuta;
   * il testo entra al secondo/terzo battito e resta fermo fino al taglio. Il taglio cade sul battere della tavola dopo.
   */
  const disegna = (s: Sheet, ev: Eventi, t: number, n: number, pi: Piano) => {
    const box = { x: 0, y: (H - W * (s.H / s.W)) / 2, w: W, h: W * (s.H / s.W) }
    g.save()
    g.fillStyle = s.bg; g.fillRect(0, 0, W, H)
    const cam = 1 + 0.035 * ease.inOutSine(t / ev.durata)
    g.translate(W / 2, H / 2); g.scale(cam, cam); g.translate(-W / 2, -H / 2)
    for (const [j, l] of s.layers.entries()) {
      const R = pi.ruoli[j]
      const p = (t - pi.ingresso[j]) / pi.durIngresso[j]
      if (p < 0) continue
      const e = ease.outCubic(p)
      let alpha = l.alpha * (R === 'atmosfera' || R === 'trama' ? 1 : e), dx = 0, dy = 0, rot = 0, sc = 1
      if (R === 'trama') {
        // le trame vivono lente: scorrono o ruotano di pochissimo
        if (l.kind === 'caleido' || l.kind === 'ornato') rot = t * 0.012
        else { dx = Math.sin(t * 0.15 + pi.fase[j]) * W * 0.015; dy = -t * H * 0.0015 }
        sc = 1.06
      } else if (R === 'figura') dy = (1 - e) * 24
      else if (R === 'testo') dy = (1 - e) * 10
      if (alpha <= 0.003) continue
      g.save()
      g.globalAlpha = Math.min(1, alpha); g.globalCompositeOperation = l.blend
      const piena = (R === 'atmosfera' || R === 'trama') && l.scale >= 1.15
      let cx: number, cy: number, kk: number
      if (piena) { cx = W / 2; cy = H / 2; kk = Math.max(W / l.canvas.width, H / l.canvas.height) }
      else { cx = box.x + l.x * box.w; cy = box.y + l.y * box.h; kk = (Math.min(box.w, box.h) * l.scale) / Math.max(l.canvas.width, l.canvas.height) }
      g.translate(cx + dx, cy + dy); g.rotate(l.rot + rot); if (l.flipX) g.scale(-1, 1); g.scale(kk * sc, kk * sc)
      g.drawImage(l.canvas, -l.canvas.width / 2, -l.canvas.height / 2)
      g.restore()
    }
    g.restore()
    g.fillStyle = s.bg; g.globalAlpha = 0.85; g.fillRect(0, H - 96, W, 96); g.globalAlpha = 1
    g.font = '28px ui-monospace, Menlo, monospace'; g.textBaseline = 'middle'
    g.fillStyle = pi.inchiostro
    g.fillText(`${o.nome} · ${n}/${o.N}`, 40, H - 48)
  }

  interface Piano { ruoli: Ruolo[]; ingresso: number[]; durIngresso: number[]; fase: number[]; inchiostro: string }
  const pianifica = (s: Sheet, ev: Eventi, seme: number): Piano => {
    const r = rng(seme)
    const { beat } = ev
    const ruoli = s.layers.map(ruoloDi)
    const ingresso: number[] = [], durIngresso: number[] = [], fase: number[] = []
    let fig = 0, testi = 0
    const nFig = ruoli.filter(x => x === 'figura').length
    const passo = nFig > 4 ? beat / 2 : beat
    for (const R of ruoli) {
      fase.push(r() * Math.PI * 2)
      if (R === 'atmosfera' || R === 'trama') { ingresso.push(0); durIngresso.push(0.001) }
      else if (R === 'figura') { ingresso.push(Math.min(beat * 4, fig * passo)); durIngresso.push(0.45); fig++ }
      else { ingresso.push(beat * (2 + testi)); durIngresso.push(0.35); testi++ }
    }
    void stile; void secondo
    const ink = ['#111111', '#f4f2ec'].sort((a, b) => lum(b, s.bg) - lum(a, s.bg))[0]
    return { ruoli, ingresso, durIngresso, fase, inchiostro: ink }
  }

  const tavola = async (s: Sheet, ev: Eventi) => {
    k++
    const pi = pianifica(s, ev, o.seme + k * 7919)
    const n = Math.round(ev.durata * FPS)
    const vecchio = prima
    const pass = stile === 'organico' || stile === 'ornato' ? Math.round(0.3 * FPS) : 0 // altrimenti taglio netto sul battere
    for (let f = 0; f < n; f++) {
      disegna(s, ev, f / FPS, k, pi)
      if (vecchio && f < pass) { g.globalAlpha = 1 - f / pass; g.drawImage(vecchio, 0, 0); g.globalAlpha = 1 }
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
