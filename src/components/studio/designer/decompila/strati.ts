/**
 * Strati: dall'immagine (senza il testo, già letto) a fondo, forme e foto.
 * - Fondo: colore del bordo, oppure sfumatura se i bordi cambiano con
 *   regolarità.
 * - Regioni di colore uniforme (l'idea di LayerD: nella grafica i livelli
 *   hanno spesso colore pieno) → rettangoli, cerchi o tracciati semplificati.
 * - Zone mosse (foto, illustrazioni, trame) → immagini ritagliate, con il
 *   testo tolto; sulla foto più grande lo scontorno U²-Net dà il soggetto.
 * Si lavora su una versione ridotta (la grana si spiana) e si rifiniscono i
 * bordi dei rettangoli sui pixel veri.
 */
import type { Gradient, SceneEl } from '../types'
import { aPng, dist, hex, moda, px, riduci, ritaglia, tela } from './pixel'
import type { Box, Raster, RGB } from './tipi'

/** Lato lungo della versione ridotta. */
const LATO = 216

export interface Strati { fondo: string | Gradient; els: SceneEl[]; avvisi: string[]; /** finestre di colore pieno (per misurare la grana) */ finestre: Box[] }

interface Regione { celle: number[]; colore: RGB; x0: number; y0: number; x1: number; y1: number; tipo: 'forma' | 'foto' }

/* ── fondo ─────────────────────────────────────────────────────────────── */

/** Fondo pieno o sfumatura verticale/orizzontale, letto sui bordi della versione ridotta. */
function fondo(L: Raster, ignora: Uint8Array): { modello: (x: number, y: number) => RGB; fill: string | Gradient } {
  const ok = (x: number, y: number) => !ignora[y * L.w + x]
  const colonna = (x: number) => Array.from({ length: L.h }, (_, y) => y).filter(y => ok(x, y)).map(y => px(L, x, y))
  const riga = (y: number) => Array.from({ length: L.w }, (_, x) => x).filter(x => ok(x, y)).map(x => px(L, x, y))
  const media = (v: RGB[]): RGB => v.length ? [0, 1, 2].map(k => v.reduce((a, p) => a + p[k], 0) / v.length) as RGB : [255, 255, 255]
  const bordo = [...riga(0), ...riga(L.h - 1), ...colonna(0), ...colonna(L.w - 1)]
  const pieno = moda(bordo)
  // sfumatura: i due lati opposti cambiano allo stesso modo e i lati ortogonali sono uniformi
  const prova = (verticale: boolean) => {
    const n = verticale ? L.h : L.w
    const lato = (i: number) => media([...(verticale ? riga(i) : colonna(i))].filter(p => dist(p, px(L, verticale ? 0 : i, verticale ? i : 0)) < 40))
    const a = media([0, 1, 2].map(lato)), b = media([n - 1, n - 2, n - 3].map(lato))
    if (dist(a, b) < 22) return null
    // i lati laterali seguono la retta da a a b
    let err = 0, m = 0
    for (let i = 0; i < n; i += 2) {
      const t = i / (n - 1), atteso: RGB = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
      for (const p of verticale ? [px(L, 0, i), px(L, L.w - 1, i)] : [px(L, i, 0), px(L, i, L.h - 1)]) { err += Math.min(60, dist(p, atteso)); m++ }
    }
    return err / m < 9 ? { a, b } : null
  }
  for (const verticale of [true, false]) {
    const g = prova(verticale)
    if (!g) continue
    const n = verticale ? L.h : L.w
    return {
      modello: (x, y) => { const t = (verticale ? y : x) / (n - 1); return [g.a[0] + (g.b[0] - g.a[0]) * t, g.a[1] + (g.b[1] - g.a[1]) * t, g.a[2] + (g.b[2] - g.a[2]) * t] },
      fill: { from: hex(g.a), to: hex(g.b), fromAt: 0, toAt: 1, vertical: verticale },
    }
  }
  return { modello: () => pieno, fill: hex(pieno) }
}

/* ── contorni ──────────────────────────────────────────────────────────── */

/** Contorno esterno di una regione di celle, come poligono sui bordi delle celle. */
function contorno(celle: number[], dentro: (x: number, y: number) => boolean, W: number): [number, number][] {
  // lati tra cella dentro e cella fuori, orientati in senso orario; poi si concatenano
  const uscite = new Map<number, number[]>()
  const K = (x: number, y: number) => y * (W + 2) + x
  const lato = (ax: number, ay: number, bx: number, by: number) => { const k = K(ax, ay); (uscite.get(k) ?? uscite.set(k, []).get(k)!).push(K(bx, by)) }
  for (const j of celle) {
    const x = j % W, y = (j / W) | 0
    if (!dentro(x, y - 1)) lato(x, y, x + 1, y)
    if (!dentro(x + 1, y)) lato(x + 1, y, x + 1, y + 1)
    if (!dentro(x, y + 1)) lato(x + 1, y + 1, x, y + 1)
    if (!dentro(x - 1, y)) lato(x, y + 1, x, y)
  }
  // si parte dalla cella più in alto a sinistra: il suo lato superiore è sul contorno esterno
  const s = celle.reduce((m, j) => (j < m ? j : m), Infinity)
  const start = K(s % W, (s / W) | 0)
  const pts: [number, number][] = []
  let v = start
  for (let passi = 0; passi < 400000; passi++) {
    pts.push([v % (W + 2), Math.floor(v / (W + 2))])
    const u = uscite.get(v)
    if (!u?.length) break
    v = u.shift()!
    if (v === start) break
  }
  return pts
}

/** Semplificazione di Douglas-Peucker. */
function semplifica(p: [number, number][], eps: number): [number, number][] {
  if (p.length < 4) return p
  const dmax = (a: [number, number], b: [number, number], c: [number, number]) => {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    return Math.abs((b[0] - a[0]) * (a[1] - c[1]) - (a[0] - c[0]) * (b[1] - a[1])) / l
  }
  const rec = (s: number, e: number, out: [number, number][]) => {
    let m = -1, d = eps
    for (let i = s + 1; i < e; i++) { const v = dmax(p[s], p[e], p[i]); if (v > d) { d = v; m = i } }
    if (m < 0) { out.push(p[s]); return }
    rec(s, m, out); rec(m, e, out)
  }
  // poligono chiuso: si divide al punto più lontano dal primo
  let far = 0, fd = -1
  p.forEach((q, i) => { const d = Math.hypot(q[0] - p[0][0], q[1] - p[0][1]); if (d > fd) { fd = d; far = i } })
  const out: [number, number][] = []
  rec(0, far, out); rec(far, p.length - 1, out)
  return out
}

/* ── rifinitura dei bordi sui pixel veri ───────────────────────────────── */

/** Sposta i lati di un rettangolo sulla transizione vera di colore (la versione ridotta sbaglia di qualche pixel). */
function rifinisci(r: Raster, b: Box, c: RGB, f: number): Box {
  const vicino = (p: RGB) => dist(p, c) < 45
  const quota = (orizz: boolean, pos: number, da: number, a: number) => {
    let n = 0, k = 0
    for (let t = Math.floor(da); t < a; t += 2) { const p = orizz ? px(r, Math.max(0, Math.min(r.w - 1, t)), pos) : px(r, pos, Math.max(0, Math.min(r.h - 1, t))); if (vicino(p)) k++; n++ }
    return n ? k / n : 0
  }
  const cerca = (orizz: boolean, da: number, verso: 1 | -1, lo: number, hi: number, lim: number) => {
    // dal fuori verso il dentro: primo pixel dove la riga/colonna è del colore della forma
    for (let i = 0; i <= 2 * f + 2; i++) {
      const pos = Math.round(da - verso * (f + 1) + verso * i)
      if (pos < 0 || pos >= lim) continue
      if (quota(orizz, pos, lo, hi) > 0.6) return pos
    }
    return Math.round(da)
  }
  const mx0 = b.x + b.w * 0.2, mx1 = b.x + b.w * 0.8, my0 = b.y + b.h * 0.2, my1 = b.y + b.h * 0.8
  const x0 = cerca(false, b.x, 1, my0, my1, r.w), x1 = cerca(false, b.x + b.w - 1, -1, my0, my1, r.w)
  const y0 = cerca(true, b.y, 1, mx0, mx1, r.h), y1 = cerca(true, b.y + b.h - 1, -1, mx0, mx1, r.h)
  return x1 > x0 && y1 > y0 ? { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 } : b
}

/* ── foto: testo tolto e scontorno ─────────────────────────────────────── */

/** Toglie il testo da un ritaglio: i pixel dei riquadri si riempiono dai vicini, dal bordo verso il centro. */
function senzaTesto(r: Raster, buchi: Box[]): Raster {
  const d = new Uint8ClampedArray(r.data)
  const vuoto = new Uint8Array(r.w * r.h)
  for (const b of buchi) for (let y = Math.max(0, Math.floor(b.y)); y < Math.min(r.h, Math.ceil(b.y + b.h)); y++) for (let x = Math.max(0, Math.floor(b.x)); x < Math.min(r.w, Math.ceil(b.x + b.w)); x++) vuoto[y * r.w + x] = 1
  let resto = vuoto.reduce((a, v) => a + v, 0)
  for (let giro = 0; resto > 0 && giro < 400; giro++) {
    const fatti: number[] = []
    for (let i = 0; i < vuoto.length; i++) {
      if (!vuoto[i]) continue
      const x = i % r.w, y = (i / r.w) | 0
      let s0 = 0, s1 = 0, s2 = 0, n = 0
      for (const [ax, ay] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (ax < 0 || ay < 0 || ax >= r.w || ay >= r.h) continue
        const j = ay * r.w + ax
        if (vuoto[j]) continue
        s0 += d[j * 4]; s1 += d[j * 4 + 1]; s2 += d[j * 4 + 2]; n++
      }
      if (n) { d[i * 4] = s0 / n; d[i * 4 + 1] = s1 / n; d[i * 4 + 2] = s2 / n; d[i * 4 + 3] = 255; fatti.push(i) }
    }
    for (const i of fatti) vuoto[i] = 0
    resto -= fatti.length
    if (!fatti.length) break
  }
  return { w: r.w, h: r.h, data: d }
}

/** Soggetto della foto con lo scontorno locale; null se la maschera non ha un soggetto netto. */
async function soggetto(foto: Raster): Promise<string | null> {
  try {
    const { subjectMask } = await import('../../compose/cutout')
    const sorgente = tela(foto.w, foto.h)
    sorgente.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(foto.data), foto.w, foto.h), 0, 0)
    const m = await subjectMask(sorgente)
    const md = m.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, m.width, m.height).data
    let somma = 0, incerti = 0
    for (let i = 3; i < md.length; i += 4) { const a = md[i] / 255; somma += a; if (a > 0.2 && a < 0.8) incerti++ }
    const n = md.length / 4, copre = somma / n
    // un soggetto vero copre una parte della foto e ha un bordo netto
    if (copre < 0.04 || copre > 0.65 || incerti / n > 0.12) return null
    const out = tela(foto.w, foto.h), ox = out.getContext('2d')!
    ox.drawImage(sorgente, 0, 0)
    ox.globalCompositeOperation = 'destination-in'
    ox.drawImage(m, 0, 0)
    return out.toDataURL('image/png')
  } catch (e) {
    console.warn('[decompila] scontorno non disponibile', e)
    return null
  }
}

/* ── strati ────────────────────────────────────────────────────────────── */

export async function strati(r: Raster, testi: Box[], o: { scontorno?: boolean } = {}): Promise<Strati> {
  const avvisi: string[] = []
  const k = LATO / Math.max(r.w, r.h)
  const L = riduci(r, Math.max(1, Math.round(r.w * k)), Math.max(1, Math.round(r.h * k)))
  const f = r.w / L.w
  const N = L.w * L.h
  // celle coperte dal testo: non contano per forme e colori
  const ignora = new Uint8Array(N)
  for (const b of testi) {
    for (let y = Math.max(0, Math.floor((b.y - 2) / f)); y < Math.min(L.h, Math.ceil((b.y + b.h + 2) / f)); y++)
      for (let x = Math.max(0, Math.floor((b.x - 2) / f)); x < Math.min(L.w, Math.ceil((b.x + b.w + 2) / f)); x++) ignora[y * L.w + x] = 1
  }
  const F = fondo(L, ignora)

  // uniformità locale: scarto dei vicini 3×3 dal centro
  const mosso = new Uint8Array(N)
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
    const c = px(L, x, y)
    let s = 0, n = 0
    for (let yy = Math.max(0, y - 1); yy <= Math.min(L.h - 1, y + 1); yy++) for (let xx = Math.max(0, x - 1); xx <= Math.min(L.w - 1, x + 1); xx++) { s += dist(px(L, xx, yy), c); n++ }
    if (s / n > 11) mosso[y * L.w + x] = 1
  }
  // tavolozza delle celle uniformi: colori per frequenza, uniti se vicini
  const tav: { c: RGB; n: number }[] = []
  const freq = new Map<number, { s: [number, number, number]; n: number }>()
  for (let i = 0; i < N; i++) {
    if (ignora[i] || mosso[i]) continue
    const p = px(L, i % L.w, (i / L.w) | 0), key = ((p[0] >> 3) << 10) | ((p[1] >> 3) << 5) | (p[2] >> 3)
    const e = freq.get(key) ?? { s: [0, 0, 0], n: 0 }
    e.s[0] += p[0]; e.s[1] += p[1]; e.s[2] += p[2]; e.n++
    freq.set(key, e)
  }
  for (const e of [...freq.values()].sort((a, b) => b.n - a.n)) {
    const c: RGB = [e.s[0] / e.n, e.s[1] / e.n, e.s[2] / e.n]
    const t = tav.find(t => dist(t.c, c) < 24)
    if (t) { t.c = [0, 1, 2].map(q => (t.c[q] * t.n + c[q] * e.n) / (t.n + e.n)) as RGB; t.n += e.n } else if (tav.length < 24) tav.push({ c, n: e.n })
  }
  // etichette: -1 fondo, -2 foto, ≥0 colore della tavolozza
  const lab = new Int32Array(N).fill(-3)
  for (let i = 0; i < N; i++) {
    if (ignora[i]) continue
    const x = i % L.w, y = (i / L.w) | 0, p = px(L, x, y)
    if (dist(p, F.modello(x, y)) < 20) { lab[i] = -1; continue }
    if (mosso[i]) { lab[i] = -2; continue }
    let best = -2, bd = 30
    tav.forEach((t, j) => { const d = dist(t.c, p); if (d < bd) { bd = d; best = j } })
    lab[i] = best
  }
  // le celle sotto il testo prendono l'etichetta dei vicini
  for (let giro = 0; giro < 200; giro++) {
    const fatti: [number, number][] = []
    for (let i = 0; i < N; i++) {
      if (lab[i] !== -3) continue
      const x = i % L.w, y = (i / L.w) | 0
      const vic = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < L.w && b < L.h).map(([a, b]) => lab[b * L.w + a]).filter(v => v !== -3)
      if (vic.length) fatti.push([i, vic.sort((a, b) => vic.filter(v => v === b).length - vic.filter(v => v === a).length)[0]])
    }
    if (!fatti.length) break
    for (const [i, v] of fatti) lab[i] = v
  }
  // le celle mosse isolate (bordi antialias tra due forme) non sono foto: prendono il colore più vicino
  const fotoChiusa = new Uint8Array(N)
  for (let i = 0; i < N; i++) {
    if (lab[i] !== -2) continue
    const x = i % L.w, y = (i / L.w) | 0
    let n = 0
    for (let yy = y - 2; yy <= y + 2; yy++) for (let xx = x - 2; xx <= x + 2; xx++) if (xx >= 0 && yy >= 0 && xx < L.w && yy < L.h && lab[yy * L.w + xx] === -2) n++
    fotoChiusa[i] = n >= 9 ? 1 : 0
  }
  for (let i = 0; i < N; i++) {
    if (lab[i] !== -2 || fotoChiusa[i]) continue
    const p = px(L, i % L.w, (i / L.w) | 0)
    let best = -1, bd = dist(p, F.modello(i % L.w, (i / L.w) | 0))
    tav.forEach((t, j) => { const d = dist(t.c, p); if (d < bd) { bd = d; best = j } })
    lab[i] = best
  }

  // sfumature dentro una foto: celle lisce una per una, ma la regione va da un colore all'altro.
  // Sul colore spianato 3×3 (la grana sparisce) uno scarto medio alto dalla media vuol dire foto
  const liscio = (x: number, y: number): RGB => {
    const s = [0, 0, 0]; let n = 0
    for (let yy = Math.max(0, y - 1); yy <= Math.min(L.h - 1, y + 1); yy++) for (let xx = Math.max(0, x - 1); xx <= Math.min(L.w - 1, x + 1); xx++) { const p = px(L, xx, yy); s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; n++ }
    return [s[0] / n, s[1] / n, s[2] / n]
  }
  const sfumato = new Uint8Array(N)
  for (let i = 0; i < N; i++) {
    if (sfumato[i] || lab[i] < 0) continue
    const l = lab[i], celle: number[] = [], coda = [i]
    sfumato[i] = 1
    while (coda.length) {
      const j = coda.pop()!
      celle.push(j)
      const x = j % L.w, y = (j / L.w) | 0
      for (const [a, b] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (a < 0 || b < 0 || a >= L.w || b >= L.h) continue
        const q = b * L.w + a
        if (!sfumato[q] && lab[q] === l) { sfumato[q] = 1; coda.push(q) }
      }
    }
    if (celle.length < N * 0.005) continue
    // solo le celle interne: sul bordo lo spianato mescola i colori vicini
    const interna = (j: number) => { const x = j % L.w, y = (j / L.w) | 0; for (let yy = y - 1; yy <= y + 1; yy++) for (let xx = x - 1; xx <= x + 1; xx++) if (xx < 0 || yy < 0 || xx >= L.w || yy >= L.h || lab[yy * L.w + xx] !== l) return false; return true }
    const dentro = celle.filter(interna)
    if (dentro.length < N * 0.003) continue
    const col = dentro.map(j => liscio(j % L.w, (j / L.w) | 0))
    const m: RGB = [0, 1, 2].map(k => col.reduce((a, p) => a + p[k], 0) / col.length) as RGB
    const scarto = col.reduce((a, p) => a + dist(p, m), 0) / col.length
    if (scarto > 7) for (const j of celle) lab[j] = -2
  }

  // finestre piene: 6×6 celle della stessa etichetta, lontane da testo e foto
  const finestre: Box[] = []
  for (let y = 0; y + 6 <= L.h && finestre.length < 16; y += 6) for (let x = 0; x + 6 <= L.w && finestre.length < 16; x += 6) {
    const l = lab[y * L.w + x]
    let ok = l !== -2
    for (let yy = y; ok && yy < y + 6; yy++) for (let xx = x; ok && xx < x + 6; xx++) ok = !ignora[yy * L.w + xx] && !mosso[yy * L.w + xx] && lab[yy * L.w + xx] === l
    if (ok) finestre.push({ x: Math.round(x * f + 2), y: Math.round(y * f + 2), w: Math.round(6 * f - 4), h: Math.round(6 * f - 4) })
  }

  // regioni connesse per etichetta
  const visto = new Uint8Array(N)
  const regioni: Regione[] = []
  const minimo = N * 0.0015
  for (let i = 0; i < N; i++) {
    if (visto[i] || lab[i] === -1) continue
    const l = lab[i], celle: number[] = [], coda = [i]
    visto[i] = 1
    while (coda.length) {
      const j = coda.pop()!
      celle.push(j)
      const x = j % L.w, y = (j / L.w) | 0
      for (const [a, b] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (a < 0 || b < 0 || a >= L.w || b >= L.h) continue
        const q = b * L.w + a
        if (!visto[q] && lab[q] === l) { visto[q] = 1; coda.push(q) }
      }
    }
    if (celle.length < (l === -2 ? N * 0.01 : minimo)) continue
    let x0 = L.w, y0 = L.h, x1 = 0, y1 = 0, s: [number, number, number] = [0, 0, 0]
    for (const j of celle) {
      const x = j % L.w, y = (j / L.w) | 0
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y
      const p = px(L, x, y); s[0] += p[0]; s[1] += p[1]; s[2] += p[2]
    }
    regioni.push({ celle, colore: [s[0] / celle.length, s[1] / celle.length, s[2] / celle.length], x0, y0, x1, y1, tipo: l === -2 ? 'foto' : 'forma' })
  }

  // dalla regione all'elemento: prima le più grandi (stanno sotto)
  regioni.sort((a, b) => b.celle.length - a.celle.length)
  const els: SceneEl[] = []
  let nForme = 0, nFoto = 0
  const fill = (rg: Regione) => hex(rg.colore)
  for (const rg of regioni) {
    const set = new Set(rg.celle)
    const dentro = (x: number, y: number) => x >= 0 && y >= 0 && x < L.w && y < L.h && set.has(y * L.w + x)
    const bw = rg.x1 - rg.x0 + 1, bh = rg.y1 - rg.y0 + 1
    const pieno = rg.celle.length / (bw * bh)
    const box: Box = { x: rg.x0 * f, y: rg.y0 * f, w: bw * f, h: bh * f }
    const tracciato = () => {
      const poli = semplifica(contorno(rg.celle, dentro, L.w), 0.9)
      return poli.map(([x, y], i) => `${i ? 'L' : 'M'} ${Math.round(Math.min(r.w, x * f))} ${Math.round(Math.min(r.h, y * f))}`).join(' ') + ' Z'
    }
    if (rg.tipo === 'foto') {
      const b = { x: Math.round(box.x), y: Math.round(box.y), w: Math.round(Math.min(r.w - box.x, box.w)), h: Math.round(Math.min(r.h - box.y, box.h)) }
      const buchi = testi.map(t => ({ x: t.x - b.x - 2, y: t.y - b.y - 2, w: t.w + 4, h: t.h + 4 }))
      const crop = senzaTesto(ritaglia(r, b), buchi)
      const nome = nFoto++ ? `Immagine ${nFoto}` : 'Immagine'
      els.push({ kind: 'image', name: nome, x: b.x, y: b.y, w: b.w, h: b.h, url: aPng(crop), fallback: fill(rg), ...(pieno < 0.85 ? { mask: tracciato() } : {}) })
      // soggetto: solo sulla prima foto, se è abbastanza grande
      if (o.scontorno !== false && nFoto === 1 && rg.celle.length > N * 0.06) {
        const s = await soggetto(crop)
        if (s) els.push({ kind: 'image', name: 'Soggetto', x: b.x, y: b.y, w: b.w, h: b.h, url: s, fallback: 'transparent' })
        else avvisi.push('nessun soggetto netto nella foto')
      }
      continue
    }
    nForme++
    if (pieno >= 0.93) {
      const b = rifinisci(r, box, rg.colore, f)
      els.push({ kind: 'rect', name: `Rettangolo ${nForme}`, x: b.x, y: b.y, w: b.w, h: b.h, fill: fill(rg) })
    } else if (Math.abs(bw / bh - 1) < 0.12 && pieno > 0.72 && pieno < 0.84) {
      els.push({ kind: 'circle', name: `Cerchio ${nForme}`, cx: box.x + box.w / 2, cy: box.y + box.h / 2, r: (box.w + box.h) / 4, fill: fill(rg) })
    } else {
      els.push({ kind: 'path', name: `Forma ${nForme}`, d: tracciato(), fill: fill(rg) })
    }
  }
  return { fondo: F.fill, els, avvisi, finestre }
}
