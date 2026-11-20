/**
 * Il montaggio dei reel: una grammatica di inquadrature e operatori, legati ai colpi del beat.
 *
 * Ispirato alle "timeslice grammars" per la motion graphics (Carra, Santoni, Pellacini): lo spazio si divide
 * (strisce, tasselli, metà, dettaglio) e il tempo pure (battute, battiti, sedicesimi); gli operatori trasformano i pezzi
 * con uno sfasamento tra l'uno e l'altro. Niente è scritto in un ordine fisso: un GENOMA dice quali inquadrature preferisce,
 * quale operatore risponde a quale strumento (cassa, rullante, charleston, battuta), quanto spesso tagliare prima e dopo
 * il cambio, come trattare il testo. Ogni reel nasce da una piccola evoluzione: si generano molti storyboard e si tiene
 * quello che misura meglio — varietà ma non caos, sincronia, struttura che ritorna con variazioni (ABAB'), aggancio nel
 * primo secondo, chiusura ad anello (l'ultima inquadratura è la prima: il video ricomincia senza cucitura), leggibilità
 * del testo, e novità rispetto ai reel che ha già fatto (si annoia dei suoi tic).
 * Regole fisse solo per chi guarda: un taglio non più di uno ogni mezzo battito, testo fermo almeno una battuta e mezza,
 * nessun lampo a tutto schermo.
 */
import { Muxer, ArrayBufferTarget } from 'mp4-muxer'
import type { Brano } from '../suono/beat'

const W = 1080, H = 1920, FPS = 30
export type Inq = 'piena' | 'carta' | 'divisa' | 'mosaico' | 'dettaglio' | 'strisce' | 'parola'
export type Op = 'punch' | 'scivola' | 'ruota' | 'scorri' | 'eco' | 'maschera' | 'tremolo' | 'specchio' | 'nulla'
const INQ: Inq[] = ['piena', 'carta', 'divisa', 'mosaico', 'dettaglio', 'strisce', 'parola']
const OPS: Op[] = ['punch', 'scivola', 'ruota', 'scorri', 'eco', 'maschera', 'tremolo', 'specchio', 'nulla']

export interface Genoma {
  pesi: Record<Inq, number>
  cassa: Op; rullante: Op; hat: Op; battuta: Op
  ritmoA: number; ritmoB: number // battute per inquadratura prima e dopo il cambio
  periodo: number // ogni quante inquadrature torna lo stesso schema
  quanto: number // 0..1 intensità degli operatori
  pezzi: number // 2..6 strisce o tasselli
  verticale: boolean
  sfasa: number // 0..1 sfasamento tra i pezzi
  testo: 'domanda' | 'parola' | 'frase'
}
export interface Tavola { img: CanvasImageSource & { width: number; height: number }; titolo: string; testo: string; parola: string; interesse: number }
export interface Ripresa { t0: number; t1: number; tav: number; inq: Inq; ops: { cassa: Op; rullante: Op; hat: Op; battuta: Op }; testo?: string; grande?: boolean; dopo: boolean }

const clamp = (x: number) => Math.max(0, Math.min(1, x))
const outExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(t)))
const inOut = (t: number) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 }
function rng(seed: number) { let a = seed >>> 0 || 1; return () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296) }
const uno = <T,>(r: () => number, a: T[]) => a[Math.floor(r() * a.length)]
const pesca = <K extends string>(r: () => number, p: Record<K, number>) => { const e = Object.entries(p) as [K, number][]; let x = r() * e.reduce((a, [, w]) => a + Math.max(0, w), 0); for (const [k, w] of e) if ((x -= Math.max(0, w)) <= 0) return k; return e[0][0] }

export function genomaACaso(r: () => number): Genoma {
  return {
    pesi: Object.fromEntries(INQ.map(k => [k, r()])) as Record<Inq, number>,
    cassa: uno(r, ['punch', 'punch', 'maschera', 'tremolo', 'scivola']), rullante: uno(r, ['scivola', 'ruota', 'eco', 'punch', 'specchio']),
    hat: uno(r, ['tremolo', 'nulla', 'nulla', 'scorri']), battuta: uno(r, ['ruota', 'scorri', 'specchio', 'maschera', 'nulla']),
    ritmoA: uno(r, [1, 2, 2]), ritmoB: uno(r, [0.5, 1, 1]), periodo: 2 + Math.floor(r() * 3), quanto: 0.3 + r() * 0.6,
    pezzi: 2 + Math.floor(r() * 5), verticale: r() < 0.5, sfasa: r(), testo: uno(r, ['domanda', 'parola', 'frase']),
  }
}
function muta(g: Genoma, r: () => number): Genoma {
  const c: Genoma = { ...g, pesi: { ...g.pesi } }
  const k = Math.floor(r() * 9)
  if (k === 0) { const i = uno(r, INQ); c.pesi[i] = clamp(c.pesi[i] + (r() - 0.5) * 0.6) }
  else if (k === 1) c.cassa = uno(r, OPS); else if (k === 2) c.rullante = uno(r, OPS); else if (k === 3) c.hat = uno(r, OPS); else if (k === 4) c.battuta = uno(r, OPS)
  else if (k === 5) { c.ritmoA = uno(r, [1, 2]); c.ritmoB = uno(r, [0.5, 1]) }
  else if (k === 6) { c.quanto = clamp(c.quanto + (r() - 0.5) * 0.3); c.sfasa = clamp(c.sfasa + (r() - 0.5) * 0.3) }
  else if (k === 7) { c.pezzi = Math.max(2, Math.min(6, c.pezzi + (r() < 0.5 ? -1 : 1))); c.verticale = r() < 0.2 ? !c.verticale : c.verticale }
  else c.testo = uno(r, ['domanda', 'parola', 'frase'])
  return c
}
function incrocia(a: Genoma, b: Genoma, r: () => number): Genoma {
  const c = { ...a, pesi: { ...a.pesi } } as Genoma
  for (const k of INQ) c.pesi[k] = r() < 0.5 ? a.pesi[k] : b.pesi[k]
  for (const k of ['cassa', 'rullante', 'hat', 'battuta', 'ritmoA', 'ritmoB', 'periodo', 'quanto', 'pezzi', 'verticale', 'sfasa', 'testo'] as const) if (r() < 0.5) (c as unknown as Record<string, unknown>)[k] = b[k]
  return c
}

/** dal genoma, la sceneggiatura: quali inquadrature, quando, su quali tavole, con quale testo */
export function storyboard(g: Genoma, br: Brano, tav: Tavola[], testi: { domanda?: string; conclusione?: string }, r: () => number): Ripresa[] {
  const bar = br.beat * 4, out: Ripresa[] = []
  const ordine = tav.map((_, i) => i)
  const forte = tav.reduce((m, t, i) => (t.interesse > tav[m].interesse ? i : m), 0)
  // lo schema che si ripete: `periodo` inquadrature, poi torna con variazioni
  const schema: Inq[] = Array.from({ length: g.periodo }, () => pesca(r, { ...g.pesi, parola: g.pesi.parola * 0.5 }))
  let t = 0, k = 0, idx = 0
  // l'aggancio: si apre una domanda (se c'è), sulla tavola più forte, con un'inquadratura che si muove da subito;
  // il testo resta due battute per poterlo leggere, ma sotto l'immagine cambia a ogni battuta
  const hook = testi.domanda && (g.testo === 'domanda' || r() < 0.7) ? testi.domanda : g.testo === 'frase' ? tav[forte].titolo : tav[forte].parola
  const vive: Inq[] = ['mosaico', 'strisce', 'dettaglio', 'piena']
  const apri = (vive.includes(schema[0]) ? schema[0] : pesca(r, Object.fromEntries(vive.map(v => [v, g.pesi[v] + 0.1])) as Record<Inq, number>))
  const apri2 = pesca(r, Object.fromEntries(vive.filter(v => v !== apri).map(v => [v, g.pesi[v] + 0.1])) as Record<Inq, number>)
  const b1 = Math.min(bar, br.cambio / 2), b2 = Math.min(2 * bar, br.cambio)
  out.push({ t0: 0, t1: b1, tav: forte, inq: apri, ops: { cassa: g.cassa, rullante: g.rullante, hat: 'nulla', battuta: g.battuta }, testo: hook, grande: true, dopo: false })
  out.push({ t0: b1, t1: b2, tav: forte, inq: apri2, ops: { cassa: g.cassa, rullante: g.rullante, hat: 'nulla', battuta: g.battuta }, testo: hook, grande: true, dopo: false })
  t = b2
  const fine = br.durata - bar // l'ultima battuta è la ripresa dell'aggancio: il video si chiude ad anello
  while (t < fine - 1e-6) {
    const dopo = t >= br.cambio - 1e-6
    let len = (dopo ? g.ritmoB : g.ritmoA) * bar
    if (t + len > fine) len = fine - t
    if (!dopo && t + len > br.cambio) len = br.cambio - t
    let inq = schema[k % schema.length]
    if (r() < 0.25) inq = pesca(r, g.pesi) // variazione dentro lo schema
    const tv = ordine[idx % ordine.length]
    let testo: string | undefined
    // la conclusione, prima della chiusura, se c'è spazio per leggerla
    if (testi.conclusione && t + len >= fine - 2 * bar - 1e-6 && !out.some(x => x.testo === testi.conclusione)) { inq = 'parola'; testo = testi.conclusione; len = Math.max(len, Math.min(2 * bar, fine - t)) }
    else if (inq === 'parola') { testo = tav[tv].parola; len = Math.max(len, bar) }
    out.push({ t0: t, t1: Math.min(fine, t + len), tav: tv, inq, ops: { cassa: g.cassa, rullante: dopo ? g.rullante : (g.rullante === 'specchio' ? 'scivola' : g.rullante), hat: dopo ? g.hat : 'nulla', battuta: g.battuta }, testo, dopo })
    t = Math.min(fine, t + len); k++; if (inq !== 'parola') idx++
  }
  out.push({ ...out[0], t0: fine, t1: br.durata, dopo: true })
  return out
}

/** quanto è buono uno storyboard, senza disegnarlo */
export function misura(s: Ripresa[], g: Genoma, br: Brano, memoria: Genoma[]): number {
  const tipi = s.map(x => x.inq), n = tipi.length
  const cont: Record<string, number> = {}; for (const x of tipi) cont[x] = (cont[x] ?? 0) + 1
  const H_ = -Object.values(cont).reduce((a, c) => a + (c / n) * Math.log(c / n), 0) / Math.log(INQ.length)
  let f = -Math.abs(H_ - 0.7) * 3 // varietà, non caos
  const ops = new Set([g.cassa, g.rullante, g.hat, g.battuta].filter(o => o !== 'nulla')); f += Math.min(3, ops.size) * 0.4 // ogni strumento muove qualcosa di diverso
  if (g.cassa === 'nulla' || g.rullante === 'nulla') f -= 1 // la cassa e il rullante devono vedersi
  // struttura: lo schema torna (autocorrelazione al periodo)
  let ug = 0, tot = 0; for (let i = g.periodo; i < n; i++) { tot++; if (tipi[i] === tipi[i - g.periodo]) ug++ }
  f -= Math.abs((tot ? ug / tot : 0) - 0.6) * 2
  // ritmo del montaggio: tagli medi tra 0.6 e 2.5 secondi; dopo il cambio più fitto
  const durate = s.map(x => x.t1 - x.t0), media = durate.reduce((a, b) => a + b, 0) / n
  f -= Math.max(0, media - 2.5) + Math.max(0, 0.6 - media)
  if (g.ritmoB >= g.ritmoA) f -= 0.5
  // leggibilità
  for (let i = 0; i < s.length; i++) { const x = s[i]; if (!x.testo || (i > 0 && s[i - 1].testo === x.testo)) continue; let d = x.t1 - x.t0; for (let j = i + 1; j < s.length && s[j].testo === x.testo && s[j].t0 === s[j - 1].t1; j++) d += s[j].t1 - s[j].t0; if (d < Math.max(1.6, x.testo.split(/\s+/).length * 0.28)) f -= 1 }
  // la grafica deve muoversi: quota di tempo in inquadrature con movimento interno
  const vive = s.filter(x => x.inq === 'mosaico' || x.inq === 'strisce' || x.inq === 'dettaglio' || x.inq === 'divisa').reduce((a, x) => a + x.t1 - x.t0, 0) / br.durata
  f -= Math.abs(vive - 0.6) * 2
  // movimento: abbastanza ma non troppo
  f -= Math.abs(g.quanto - 0.6)
  // novità: si annoia dei genomi già usati
  const dist = (a: Genoma, b: Genoma) => INQ.reduce((d, k) => d + Math.abs(a.pesi[k] - b.pesi[k]), 0) / INQ.length + (['cassa', 'rullante', 'hat', 'battuta'] as const).filter(k => a[k] !== b[k]).length * 0.25
  if (memoria.length) f += Math.min(...memoria.slice(-10).map(m => dist(g, m))) * 1.2
  void br
  return f
}

/** l'evoluzione: tiene lo storyboard migliore */
export function evolviMontaggio(br: Brano, tav: Tavola[], testi: { domanda?: string; conclusione?: string }, seme: number, memoria: Genoma[] = []) {
  const r = rng(seme)
  let pop = Array.from({ length: 30 }, () => (memoria.length && r() < 0.3 ? muta(uno(r, memoria), r) : genomaACaso(r)))
  const valuta = (g: Genoma) => { const rr = rng(seme ^ 0x9e3779b9); const s = storyboard(g, br, tav, testi, rr); return { g, s, f: misura(s, g, br, memoria) } }
  let migliori = pop.map(valuta)
  for (let gen = 0; gen < 30; gen++) {
    migliori.sort((a, b) => b.f - a.f)
    const elite = migliori.slice(0, 8).map(x => x.g)
    pop = [...elite]
    while (pop.length < 30) pop.push(r() < 0.5 ? muta(uno(r, elite), r) : muta(incrocia(uno(r, elite), uno(r, elite), r), r))
    migliori = pop.map(valuta)
  }
  migliori.sort((a, b) => b.f - a.f)
  return migliori[0]
}

// ── disegno ──
interface Colori { bg: string; ink: string; acc: string }
function coloriDi(img: CanvasImageSource & { width: number; height: number }): Colori {
  const c = document.createElement('canvas'); c.width = 24; c.height = 30
  const g = c.getContext('2d')!; g.drawImage(img, 0, 0, 24, 30)
  const d = g.getImageData(0, 0, 24, 30).data
  let R = 0, G = 0, B = 0, best = [0, 0, 0], bs = -1
  for (let i = 0; i < d.length; i += 4) { R += d[i]; G += d[i + 1]; B += d[i + 2]; const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]); const s = mx ? (mx - mn) / mx * (mx / 255) : 0; if (s > bs) { bs = s; best = [d[i], d[i + 1], d[i + 2]] } }
  const n = d.length / 4; R /= n; G /= n; B /= n
  const hex = (a: number[]) => '#' + a.map(v => Math.round(v).toString(16).padStart(2, '0')).join('')
  const L = (0.2126 * R + 0.7152 * G + 0.0722 * B) / 255
  return { bg: hex([R, G, B]), ink: L > 0.5 ? '#111111' : '#f4f2ec', acc: bs > 0.3 ? hex(best) : (L > 0.5 ? '#e3361b' : '#f2c14e') }
}
/** la zona più ricca di dettaglio: per le inquadrature ravvicinate */
function zonaRicca(img: CanvasImageSource & { width: number; height: number }) {
  const c = document.createElement('canvas'); c.width = 40; c.height = 50
  const g = c.getContext('2d')!; g.drawImage(img, 0, 0, 40, 50)
  const d = g.getImageData(0, 0, 40, 50).data, lum = (x: number, y: number) => { const i = (y * 40 + x) * 4; return d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11 }
  let best = { x: 0.5, y: 0.5 }, bv = -1
  for (let y = 5; y < 45; y += 2) for (let x = 5; x < 35; x += 2) { let v = 0; for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) v += Math.abs(lum(x + i, y + j) - lum(x + i + 1, y + j)) + Math.abs(lum(x + i, y + j) - lum(x + i, y + j + 1)); if (v > bv) { bv = v; best = { x: x / 40, y: y / 50 } } }
  return best
}

export async function rendiReel(o: { brano: Brano; tavole: Tavola[]; riprese: Ripresa[]; genoma: Genoma; nome: string; carattere?: string; seme: number; ascolto?: { bassi: Float32Array; alti: Float32Array } | null }): Promise<Blob | null> {
  if (typeof VideoEncoder === 'undefined') return null
  const { brano: br, tavole: T, riprese: S, genoma: g } = o
  const car = o.carattere ?? 'Georgia'
  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: 'avc', width: W, height: H, frameRate: FPS }, fastStart: 'in-memory' })
  let errore: unknown = null
  const ve = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: e => { errore = e } })
  ve.configure({ codec: 'avc1.640028', width: W, height: H, bitrate: 5_000_000, framerate: FPS })
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H
  const c = cv.getContext('2d')!
  const eco = document.createElement('canvas'); eco.width = W; eco.height = H
  const ec = eco.getContext('2d')!
  const col = T.map(t => coloriDi(t.img)), zone = T.map(t => zonaRicca(t.img))
  const r = rng(o.seme)
  const fasi = Array.from({ length: 64 }, () => r())
  const beat = br.beat, bar = beat * 4, q = g.quanto
  // inviluppi dei colpi (dai tempi veri del brano)
  const inv = (ts: number[], t: number, dec: number) => { let v = 0; for (const x of ts) { const d = t - x; if (d >= 0 && d < dec * 5) v = Math.max(v, Math.exp(-d / dec)) } return v }
  const conta = (ts: number[], t0: number, t: number) => ts.filter(x => x >= t0 - 1e-4 && x <= t).length
  const scatto = (ts: number[], t0: number, t: number) => { // passi fatti + scivolamento morbido dopo l'ultimo colpo
    const n = conta(ts, t0, t); if (!n) return 0
    const last = ts.filter(x => x >= t0 - 1e-4 && x <= t).pop()!
    return n - 1 + outExpo((t - last) / (beat * 0.35))
  }
  // disegna un'immagine "a copertura" in un rettangolo, con centro di ritaglio (cx, cy) e zoom
  const copri = (img: CanvasImageSource & { width: number; height: number }, x: number, y: number, w: number, h: number, cx = 0.5, cy = 0.5, z = 1) => {
    const s = Math.max(w / img.width, h / img.height) * z, sw = w / s, sh = h / s
    const sx = Math.max(0, Math.min(img.width - sw, cx * img.width - sw / 2)), sy = Math.max(0, Math.min(img.height - sh, cy * img.height - sh / 2))
    c.drawImage(img, sx, sy, sw, sh, x, y, w, h)
  }
  const testoGrande = (t: string, cl: Colori, tl: number, durata: number, centro: boolean) => {
    const parole = t.split(/\s+/).filter(Boolean)
    const corpo = t.length > 90 ? 64 : t.length > 50 ? 78 : t.length > 22 ? 96 : t.length > 10 ? 130 : 170
    c.font = `700 ${corpo}px '${car}', Georgia, serif`; c.textBaseline = 'alphabetic'; c.textAlign = 'left'
    const righe: string[][] = [[]]
    for (const p of parole) { const prova = [...righe[righe.length - 1], p].join(' '); if (c.measureText(prova).width > W - 160 && righe[righe.length - 1].length) righe.push([]); righe[righe.length - 1].push(p) }
    const hTot = righe.length * corpo * 1.08, y0 = centro ? (H - hTot) / 2 + corpo : H - 300 - hTot + corpo
    // le parole entrano sui sedicesimi, poi restano
    let k = 0
    righe.forEach((riga, ri) => {
      let x = 80; const y = y0 + ri * corpo * 1.08
      const vis = riga.filter((_, wi) => tl >= (k + wi) * beat / 4)
      if (vis.length) { const w = c.measureText(vis.join(' ')).width; c.fillStyle = cl.bg; c.fillRect(64, y - corpo * 0.92, w + 32, corpo * 1.16) }
      for (const p of riga) {
        const t0 = (k++) * beat / 4; if (tl < t0) break
        const e = outExpo((tl - t0) / (beat * 0.5))
        c.globalAlpha = clamp(e * 1.5); c.fillStyle = cl.ink; c.fillText(p, x, y + (1 - e) * 24); c.globalAlpha = 1
        x += c.measureText(p + ' ').width
      }
    })
    void durata
  }

  for (let f = 0; f < Math.round(br.durata * FPS); f++) {
    const t = f / FPS
    const s = S.find(x => t >= x.t0 - 1e-6 && t < x.t1) ?? S[S.length - 1]
    const tl = t - s.t0, img = T[s.tav].img, cl = col[s.tav], dur = s.t1 - s.t0
    const K = inv(br.cassa, t, 0.09), Rn = inv(br.rullante, t, 0.12), Hh = inv(br.hat, t, 0.04)
    const valore = (op: Op) => (s.ops.cassa === op ? K : 0) + (s.ops.rullante === op ? Rn : 0) + (s.ops.hat === op ? Hh * 0.5 : 0)
    const passi = (op: Op) => (s.ops.cassa === op ? scatto(br.cassa, s.t0, t) : 0) + (s.ops.rullante === op ? scatto(br.rullante, s.t0, t) : 0) + (s.ops.battuta === op ? scatto(br.battere, s.t0, t) : 0)
    const amp = q * (s.dopo ? 1.35 : 1)
    c.save()
    c.fillStyle = cl.bg; c.fillRect(0, 0, W, H)
    // la camera: punch e respiro
    const z = 1 + 0.06 * amp * valore('punch') + 0.03 * inOut(tl / dur)
    c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-W / 2, -H / 2)
    const scorri = (s.ops.battuta === 'scorri' || s.ops.hat === 'scorri') ? (tl / dur - 0.5) * 0.25 * amp : 0
    const N = g.pezzi
    if (s.inq === 'piena') copri(img, 0, 0, W, H, 0.5 + scorri, 0.5)
    else if (s.inq === 'dettaglio') { const zz = zone[s.tav]; copri(img, 0, 0, W, H, zz.x + scorri * 0.5, zz.y, 2.2 + 0.4 * inOut(tl / dur)) }
    else if (s.inq === 'carta') {
      // fondo a righe che scendono a ogni battito, la tavola al centro
      const P = scatto(br.battere.flatMap(b => [0, 1, 2, 3].map(i => b + i * beat)), s.t0, t)
      c.fillStyle = cl.acc; c.globalAlpha = 0.18
      for (let y = ((P * 48) % 96) - 96; y < H; y += 96) c.fillRect(0, y, W, 24)
      c.globalAlpha = 1
      const w = 880, h = w * img.height / img.width, y = (H - h) / 2 - 80
      c.save(); c.shadowColor = 'rgba(0,0,0,.3)'; c.shadowBlur = 50; c.shadowOffsetY = 20; c.drawImage(img, (W - w) / 2 + scorri * 200, y, w, h); c.restore()
    } else if (s.inq === 'divisa') {
      const altra = T[(s.tav + 1) % T.length].img
      const off = passi('scivola') * 40 * amp
      copri(img, -off % W, 0, W, H / 2, 0.5, 0.35); copri(altra, off % W, H / 2, W, H / 2, 0.5, 0.65)
      c.fillStyle = cl.ink; c.fillRect(0, H / 2 - 3, W, 6)
    } else if (s.inq === 'strisce' || s.inq === 'mosaico') {
      // i pezzi: ognuno con il suo sfasamento; gli operatori li spostano, li ruotano, li fanno tremare
      const C = s.inq === 'strisce' ? (g.verticale ? N : 1) : N, R_ = s.inq === 'strisce' ? (g.verticale ? 1 : N * 2) : Math.round(N * 1.6)
      const pw = W / C, ph = H / R_
      const sc = Math.max(W / img.width, H / img.height), ox = (W - img.width * sc) / 2, oy = (H - img.height * sc) / 2
      const pS = passi('scivola'), pR = passi('ruota')
      for (let j = 0; j < R_; j++) for (let i = 0; i < C; i++) {
        const k = j * C + i, fase = fasi[k % 64]
        const ritardo = g.sfasa * k / (C * R_) * beat * 0.5
        void ritardo
        let dx = 0, dy = 0, rot = 0
        const verso = (i + j) % 2 ? 1 : -1
        if (pS) { if (g.verticale || s.inq === 'mosaico') dy = verso * pS * ph * 0.18 * amp; else dx = verso * pS * pw * 0.12 * amp }
        if (pR && s.inq === 'mosaico') rot = pR * Math.PI / 2 * verso
        if (valore('tremolo')) { dx += (fase - 0.5) * 18 * valore('tremolo') * amp; dy += (fasi[(k + 7) % 64] - 0.5) * 18 * valore('tremolo') * amp }
        c.save()
        c.beginPath(); c.rect(i * pw, j * ph, pw, ph); c.clip()
        c.translate(i * pw + pw / 2, j * ph + ph / 2); c.rotate(rot); c.translate(-(i * pw + pw / 2), -(j * ph + ph / 2))
        // ogni pezzo mostra la sua porzione, spostata in modo circolare (avvolge, non lascia vuoti)
        const sx = ((dx % pw) + pw) % pw, sy = ((dy % ph) + ph) % ph
        for (const ax of [-pw, 0]) for (const ay of [-ph, 0]) c.drawImage(img, ox + sx + ax + scorri * 100, oy + sy + ay, img.width * sc, img.height * sc)
        c.restore()
      }
      c.strokeStyle = cl.bg; c.lineWidth = 6
      for (let i = 1; i < C; i++) { c.beginPath(); c.moveTo(i * pw, 0); c.lineTo(i * pw, H); c.stroke() }
      for (let j = 1; j < R_; j++) { c.beginPath(); c.moveTo(0, j * ph); c.lineTo(W, j * ph); c.stroke() }
    } else if (s.inq === 'parola') {
      c.fillStyle = cl.bg; c.fillRect(0, 0, W, H)
      // una striscia della tavola in basso, che scorre a ogni battito
      const P = scatto(br.battere.flatMap(b => [0, 1, 2, 3].map(i => b + i * beat)), s.t0, t)
      c.save(); c.beginPath(); c.rect(0, H - 520, W, 420); c.clip(); copri(img, -((P * 60) % 120), H - 520, W + 120, 420, 0.5, 0.5); c.restore()
    }
    c.restore()
    // specchio: sul cambio, la metà destra rispecchia la sinistra
    if ((s.ops.battuta === 'specchio' || s.ops.rullante === 'specchio') && s.dopo && s.inq !== 'parola') { c.save(); c.translate(W, 0); c.scale(-1, 1); c.drawImage(cv, 0, 0, W / 2, H, 0, 0, W / 2, H); c.restore() }
    // eco: una traccia dei fotogrammi prima, sui colpi
    if (s.ops.rullante === 'eco' || s.ops.cassa === 'eco') { const e = valore('eco'); if (e > 0.05) { c.globalAlpha = 0.35 * e * amp; c.drawImage(eco, (fasi[3] - 0.5) * 30 * e, (fasi[5] - 0.5) * 30 * e); c.globalAlpha = 1 } ; ec.drawImage(cv, 0, 0) }
    // maschera: all'inizio della ripresa, l'immagine si apre da un cerchio
    if ((s.ops.cassa === 'maschera' || s.ops.battuta === 'maschera') && tl < beat && s.inq !== 'parola') {
      const p = outExpo(tl / beat), rr = p * Math.hypot(W, H) / 2
      c.save(); c.globalCompositeOperation = 'destination-in'; c.beginPath(); c.arc(W / 2, H / 2, Math.max(1, rr), 0, Math.PI * 2); c.fill(); c.restore()
      c.save(); c.globalCompositeOperation = 'destination-over'; c.fillStyle = cl.bg; c.fillRect(0, 0, W, H); c.restore()
    }
    // il testo
    if (s.testo) testoGrande(s.testo, cl, tl, dur, s.inq === 'parola')
    // firma e passo del beat, piccoli
    c.font = "24px ui-monospace, Menlo, monospace"; c.textAlign = 'left'; c.textBaseline = 'middle'
    const pl = Math.floor(t / (beat / 4)) % 16
    for (let i = 0; i < 16; i++) { c.fillStyle = i === pl ? cl.acc : cl.ink; c.globalAlpha = i === pl ? 1 : 0.3; c.fillRect(80 + i * 22, 90, 14, i === pl ? 10 : 5) }
    c.globalAlpha = 0.85; c.fillStyle = cl.ink; c.fillText(`${o.nome.toLowerCase()} · ${br.bpm} bpm`, 80, 130); c.globalAlpha = 1
    const fr = new VideoFrame(cv, { timestamp: Math.round((f * 1e6) / FPS), duration: Math.round(1e6 / FPS) })
    ve.encode(fr, { keyFrame: f % (FPS * 2) === 0 }); fr.close()
    if (ve.encodeQueueSize > 8) await new Promise(res => setTimeout(res, 5))
    if (errore) throw errore
  }
  await ve.flush()
  if (errore) return null
  muxer.finalize()
  return new Blob([muxer.target.buffer], { type: 'video/mp4' })
}
