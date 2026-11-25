/**
 * La tavola animata: la tavola resta com'è stata composta (impaginazione, gerarchie, vuoti), e prende vita al suo posto.
 *  - costruzione: gli strati arrivano in ordine (o insieme, o dal centro), i generatori crescono nel loro tempo
 *    (la muffa si estende, l'universo allunga le tracce, il retino si stampa…);
 *  - le parole entrano dopo, per gerarchia, con una salita minima;
 *  - vita: una luce morbida che attraversa la tavola, una camera quasi ferma (respiro, deriva);
 *  - passaggi tra tavole: taglio, dissolvenza, o la figura protagonista che si fa nuvola e si ricompone nell'altra.
 * Le scelte (quanto costruire, quanta luce, quale passaggio) sono regolazioni: le decide lui, e le impara.
 * Da qui: il reel di tavole animate (intere, a tempo di musica) e la tavola animata da sola (post).
 */
import { Muxer, ArrayBufferTarget } from 'mp4-muxer'
import { drawLayer, type Layer, type Sheet } from './sheet'
import { toolById, ANIMABILI, type ToolCtx } from './tools'
import type { Brano } from '../suono/beat'
import { nuvolaDi, disegnaNuvola, type Nuvola, type OpzioniRaccolta } from './raccolta'

export interface Animazione { vita?: number; costruzione: number; ordine: 'strati' | 'insieme' | 'centro'; luce: number; camera: number; parole: 'dopo' | 'insieme' | 'scrive'; passaggio: 'taglio' | 'dissolvenza' | 'nuvola'; nuvola?: OpzioniRaccolta }
export function animazioneACaso(r: () => number, nuvola?: OpzioniRaccolta): Animazione {
  return { vita: r() < 0.2 ? 0 : 0.3 + r() * 0.7, costruzione: r() < 0.15 ? 0 : 0.3 + r() * 0.7, ordine: (['strati', 'strati', 'insieme', 'centro'] as const)[Math.floor(r() * 4)], luce: r() < 0.3 ? 0 : r() * 0.8, camera: r() * 0.7, parole: (['dopo', 'dopo', 'insieme', 'scrive'] as const)[Math.floor(r() * 4)], passaggio: nuvola && r() < 0.4 ? 'nuvola' : r() < 0.5 ? 'taglio' : 'dissolvenza', nuvola }
}

const TXT = (l: Layer) => !!l.meta?.text || /testo|tipografia|etichette|firma|piastra/.test(l.kind)
const ease = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t) }

/** il ridisegno di un livello generato al suo momento di crescita (con memoria dei momenti già fatti) */
export function rigeneratore() {
  const cache = new Map<string, HTMLCanvasElement>(), muffe = new Map<string, (f: number) => HTMLCanvasElement>()
  let rr = 7
  const ctx = (): ToolCtx => ({ r: () => ((rr = (rr * 1664525 + 1013904223) >>> 0) / 4294967296), tone: { id: 'x', label: '', bg: '#ffffff', ink: '#111111', acc: '#e3361b', dark: false }, intention: {}, mood: 'calmo', say: () => '', shaders: [], quality: 1 } as unknown as ToolCtx)
  return async (s: Sheet, l: Layer, cr: number): Promise<HTMLCanvasElement | null> => {
    const ge = l.genera; if (!ge) return null
    if (cr >= 0.999) return l.canvas
    const q = Math.round(cr * 20), k = `${l.id}|${q}`
    if (cache.has(k)) return cache.get(k)!
    let out: HTMLCanvasElement | null = null
    try {
      if (ge.tool === 'muffa') {
        const seme = Number(ge.p.seme), colore = String(ge.p.colore ?? '#111'), S = Number(ge.p.S) || 900
        let f = muffe.get(l.id); if (!f) { const M = await import('./muffa'); f = M.crescitaMuffa(seme, colore, S); muffe.set(l.id, f) }
        const c = f(q / 20), d = document.createElement('canvas'); d.width = c.width; d.height = c.height; d.getContext('2d')!.drawImage(c, 0, 0); out = d
      } else if (ANIMABILI.has(ge.tool)) {
        const tool = toolById(ge.tool); if (!tool) return null
        const s0: Sheet = { W: s.W, H: s.H, bg: '#ffffff', layers: [] }
        const res = await tool.apply(s0, { ...ge.p, sostituisci: false }, { ...ctx(), tempo: { crescita: q / 20, fase: 0 } } as ToolCtx)
        out = res.layers[res.layers.length - 1]?.canvas ?? null
        // se la forma ricostruita non ha le misure del livello vero, meglio non rischiare un salto
        if (out && (Math.abs(out.width / out.height - l.canvas.width / l.canvas.height) > 0.02)) out = null
      }
    } catch { out = null }
    if (out) { cache.set(k, out); if (cache.size > 400) cache.delete(cache.keys().next().value as string) }
    return out
  }
}

/** il piano di una tavola: quando arriva ogni strato e come (in secondi dall'inizio della tavola) */
export function pianoTavola(s: Sheet, a: Animazione, durata: number) {
  const corpo = s.layers.map((l, i) => ({ l, i })).filter(x => !TXT(x.l)), parole = s.layers.map((l, i) => ({ l, i })).filter(x => TXT(x.l))
  const tCostr = durata * 0.45 * a.costruzione
  const arrivi = new Map<number, { t0: number; d: number }>()
  corpo.forEach((x, k) => {
    let ordine = k / Math.max(1, corpo.length)
    if (a.ordine === 'insieme') ordine = 0
    if (a.ordine === 'centro') ordine = Math.hypot(x.l.x - 0.5, x.l.y - 0.5) / 0.7
    // il fondo c'è già: costruire parte da lui
    const fondo = k === 0 && x.l.scale >= 0.99
    arrivi.set(x.i, { t0: fondo ? 0 : ordine * tCostr, d: x.l.genera ? Math.max(0.6, tCostr * 0.6) : 0.35 })
  })
  // le parole: per gerarchia (le più grandi prima), dopo la costruzione o insieme
  const pr = parole.sort((p, q) => (q.l.meta?.size ?? 0) - (p.l.meta?.size ?? 0))
  pr.forEach((x, k) => arrivi.set(x.i, { t0: (a.parole === 'insieme' ? 0.2 : tCostr + 0.2) + k * 0.35, d: a.parole === 'scrive' ? 0.9 : 0.45 }))
  return arrivi
}

/** disegna la tavola al tempo t (dall'inizio della sua ripresa) dentro un fotogramma W×H */
export async function disegnaTavola(g: CanvasRenderingContext2D, W: number, H: number, s: Sheet, a: Animazione, piano: Map<number, { t0: number; d: number }>, t: number, durata: number, rig: ReturnType<typeof rigeneratore>, extra?: (i: number, l: Layer) => boolean) {
  g.save()
  g.fillStyle = s.bg; g.fillRect(0, 0, W, H)
  // la tavola a tutta larghezza, centrata; la camera quasi ferma: un respiro e una deriva lenta
  const k = W / s.W, z = 1 + a.camera * 0.05 * (t / Math.max(1, durata)), dy = (H - s.H * k) / 2
  g.translate(W / 2, H / 2); g.scale(z, z); g.translate(-W / 2, -H / 2)
  g.translate(0, dy - a.camera * 6 * (t / Math.max(1, durata))); g.scale(k, k)
  for (const [i, l] of s.layers.entries()) {
    if (extra && extra(i, l)) continue
    const p = piano.get(i) ?? { t0: 0, d: 0.01 }, u = (t - p.t0) / p.d
    if (u <= 0) continue
    let lay = l
    const v = ease(u)
    if (l.genera && u < 1) { const c = await rig(s, l, v); lay = c ? { ...l, canvas: c } : { ...l, alpha: l.alpha * v } }
    else if (TXT(l)) lay = { ...l, alpha: l.alpha * v, y: l.y + (1 - v) * 0.012 }
    else if (u < 1) lay = { ...l, alpha: l.alpha * v }
    // la vita: gli strati non di testo respirano a profondità diverse (parallasse 2.5D), il fondo resta fermo
    if (!TXT(l) && l.scale < 0.99 && a.vita) { const d = (i + 1) / s.layers.length; lay = { ...lay, x: lay.x + a.vita * 0.006 * d * Math.sin(t * 0.55 + i * 1.7), y: lay.y + a.vita * 0.004 * d * Math.cos(t * 0.45 + i * 2.3), rot: lay.rot + a.vita * 0.006 * d * Math.sin(t * 0.3 + i) } }
    if (TXT(l) && a.parole === 'scrive' && u < 1) {
      // scritta che si svela da sinistra
      g.save(); const side = Math.min(s.W, s.H) * l.scale, x0 = l.x * s.W - side / 2; g.beginPath(); g.rect(x0, 0, side * v, s.H); g.clip(); drawLayer(g, s, { ...l }); g.restore(); continue
    }
    drawLayer(g, s, lay)
  }
  g.restore()
  // la luce: una macchia morbida che attraversa il fotogramma (in schermo sui fondi scuri, in moltiplica sui chiari… no: sempre morbida)
  if (a.luce > 0) {
    const u = t / Math.max(1, durata), cx = W * (-0.2 + 1.4 * u), cy = H * (0.25 + 0.3 * Math.sin(u * 3)), R = Math.max(W, H) * 0.55
    const gr = g.createRadialGradient(cx, cy, 0, cx, cy, R); gr.addColorStop(0, `rgba(255,248,235,${0.38 * a.luce})`); gr.addColorStop(1, 'rgba(255,248,235,0)')
    g.save(); g.globalCompositeOperation = 'soft-light'; g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore()
  }
}

/** la figura che conta in una tavola: il livello non di testo, non a tutta pagina, più grande */
function protagonista(s: Sheet): number {
  let best = -1, ba = 0
  s.layers.forEach((l, i) => { if (TXT(l) || l.scale >= 0.99) return; const a = l.scale * l.scale * (l.canvas.width * l.canvas.height) / Math.max(l.canvas.width, l.canvas.height) ** 2; if (a > ba) { ba = a; best = i } })
  return ba > 0.04 ? best : -1
}

/** il reel di tavole animate: ognuna intera, a tempo di musica; i tagli sulle battute */
export async function giraTavole(o: { fogli: Sheet[]; anim: Animazione[]; brano: Brano; W?: number; H?: number; FPS?: number; provini?: number[] }): Promise<Blob | HTMLCanvasElement[] | null> {
  const W = o.W ?? 720, H = o.H ?? 1280, FPS = o.FPS ?? 30, br = o.brano
  const n = o.fogli.length, bar = br.beat * 4
  // le durate: in battute, quanto serve per costruirsi e leggersi; il resto del brano si divide in proporzione
  const pesi = o.fogli.map((s, i) => 1 + o.anim[i].costruzione + s.layers.filter(l => l.meta?.text).reduce((a, l) => a + (l.meta!.text.split(/\s+/).length), 0) * 0.12)
  const tot = pesi.reduce((a, b) => a + b, 0)
  let acc = 0
  const tagli = pesi.map(p => { acc += p; return Math.max(bar, Math.round((acc / tot) * br.durata / bar) * bar) })
  tagli[n - 1] = br.durata
  const inizi = [0, ...tagli.slice(0, -1)]
  const piani = o.fogli.map((s, i) => pianoTavola(s, o.anim[i], tagli[i] - inizi[i]))
  const prot = o.fogli.map(protagonista)
  const rig = rigeneratore(), nuvole = new Map<number, Nuvola | null>()
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H
  const g = cv.getContext('2d', { willReadFrequently: true })!
  const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H
  const provini = o.provini ? new Set(o.provini.map(t => Math.round(t * FPS))) : null, raccolti: HTMLCanvasElement[] = []
  const muxer = provini ? null : new Muxer({ target: new ArrayBufferTarget(), video: { codec: 'avc', width: W, height: H, frameRate: FPS }, fastStart: 'in-memory' })
  let errore: unknown = null
  const ve = provini ? null : new VideoEncoder({ output: (ch, m) => muxer!.addVideoChunk(ch, m), error: e => { errore = e } })
  ve?.configure({ codec: 'avc1.640028', width: W, height: H, bitrate: 6_000_000, framerate: FPS })
  const dNv = br.beat * 2
  for (let f = 0; f < Math.round(br.durata * FPS); f++) {
    if (provini && !provini.has(f)) continue
    const t = f / FPS
    let i = 0; while (i < n - 1 && t >= tagli[i]) i++
    const s = o.fogli[i], a = o.anim[i], tl = t - inizi[i], dur = tagli[i] - inizi[i]
    // la nuvola: la protagonista esce in punti alla fine (se il passaggio è a nuvola) ed entra in punti all'inizio (se il precedente lo era)
    const esce = a.passaggio === 'nuvola' && i < n - 1 && tagli[i] - t < dNv ? 1 - (tagli[i] - t) / dNv : 0
    const entra = i > 0 && o.anim[i - 1].passaggio === 'nuvola' && tl < dNv ? 1 - tl / dNv : 0
    const pi = prot[i], nv = (esce || entra) && pi >= 0 && a.nuvola ? (nuvole.has(i) ? nuvole.get(i)! : (nuvole.set(i, nuvolaDi(s.layers[pi].canvas, i * 977 + 3)), nuvole.get(i)!)) : null
    // all'entrata, la tavola è già costruita (la nuvola porta la figura): la costruzione parte dopo la raccolta
    await disegnaTavola(g, W, H, s, a, piani[i], tl, dur, rig, nv ? (k => k === pi) : undefined)
    if (nv) {
      const l = s.layers[pi], k = W / s.W, side = Math.min(s.W, s.H) * l.scale * k, sc = side / Math.max(nv.w, nv.h)
      g.save(); g.translate(l.x * s.W * k, (H - s.H * k) / 2 + l.y * s.H * k); g.rotate(l.rot); g.scale(sc, sc)
      disegnaNuvola(g, nv, sc, ease(Math.max(esce, entra)), esce ? -1 : 1, t, a.nuvola!, (i * 2.399) % 6.283)
      g.restore()
    }
    // la dissolvenza: l'ultima mezza battuta si mescola con la prima della tavola dopo
    if (a.passaggio === 'dissolvenza' && i < n - 1 && tagli[i] - t < br.beat) {
      const tg = tmp.getContext('2d')!
      await disegnaTavola(tg, W, H, o.fogli[i + 1], o.anim[i + 1], piani[i + 1], 0, tagli[i + 1] - inizi[i + 1], rig)
      g.save(); g.globalAlpha = ease(1 - (tagli[i] - t) / br.beat); g.drawImage(tmp, 0, 0); g.restore()
    }
    if (provini) { const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d')!.drawImage(cv, 0, 0); raccolti.push(c); continue }
    const fr = new VideoFrame(cv, { timestamp: Math.round((f * 1e6) / FPS), duration: Math.round(1e6 / FPS) })
    ve!.encode(fr, { keyFrame: f % (FPS * 2) === 0 }); fr.close()
    if (ve!.encodeQueueSize > 6) await new Promise(res => setTimeout(res, 3))
    if (errore) throw errore
  }
  if (provini) return raccolti
  await ve!.flush(); muxer!.finalize()
  return new Blob([muxer!.target.buffer], { type: 'video/mp4' })
}
