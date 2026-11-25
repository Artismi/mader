/**
 * Raccolta (dall'analisi di Gather, be-of-dao): il passaggio tra due tavole di un reel attraverso una nuvola di punti.
 *  - ogni fotogramma diventa una nuvola (un punto ogni pochi pixel), con una profondità presa dalla luce
 *    (il chiaro viene avanti), vista in prospettiva mentre la nuvola ruota appena;
 *  - prima del taglio la tavola si scioglie: i punti si alzano in profondità, derivano e si spargono (deriva, schizzo);
 *  - dopo il taglio la tavola nuova si raccoglie dalla stessa nuvola: gli stessi punti, gli stessi spostamenti
 *    a ritroso, così il passaggio è un'unica materia che cambia forma;
 *  - viaggio: sciame (ogni punto per conto suo) o colata (i punti scendono e si fondono, come cera);
 *  - segni: alcuni punti seguiti da mirini con le coordinate, legati da linee sottili;
 *  - resa: punti chiari sul nero, punti scuri sul bianco, o con i colori veri.
 * Tutto deterministico dal seme.
 */
import type { Brano } from '../suono/beat'

export interface OpzioniRaccolta { orbita: number; scia: number; spessore: number; passo: number; deriva: number; schizzo: number; profondita: number; viaggio: 'sciame' | 'colata'; resa: 'nero' | 'bianco' | 'vero'; segni: number; quota: number; seme: number; curva?: number; luce?: string }

const sm = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) }

export function raccoltaACaso(r: () => number): OpzioniRaccolta {
  return { orbita: 0.3 + r() * 0.9, scia: r() < 0.6 ? 0.4 + r() * 0.6 : 0, spessore: 0.04 + r() * 0.12, passo: 3, deriva: 0.2 + r() * 0.8, schizzo: 0.2 + r() * 0.8, profondita: 0.2 + r() * 0.6, viaggio: r() < 0.65 ? 'sciame' : 'colata',
    resa: r() < 0.55 ? 'nero' : r() < 0.6 ? 'vero' : 'bianco', segni: r() < 0.6 ? 4 + Math.floor(r() * 6) : 0, quota: 0.35 + r() * 0.4, seme: Math.floor(r() * 1e9), curva: 0.5 + r() * 1.5, luce: ['#ffffff', '#ffffff', '#fbe7c6', '#dbe8ff', '#ffa94d', '#ff5a4a', '#4fe0c0', '#9b8cff'][Math.floor(r() * 8)] }
}

/** restituisce la finitura per gira(): agisce solo attorno ai tagli scelti, altrove lascia il fotogramma com'è */
export function raccolta(riprese: { tav: number; t0: number; t1: number }[], br: Brano, o: OpzioniRaccolta) {
  let a = o.seme >>> 0
  const r = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296)
  // i tagli: dove cambia la tavola; se ne sceglie una parte (almeno uno), ognuno con la sua durata in battiti
  const tagli: { t: number; d: number; dir: number }[] = []
  for (let i = 1; i < riprese.length; i++) if (riprese[i].tav !== riprese[i - 1].tav && r() < o.quota) tagli.push({ t: riprese[i].t0, d: br.beat * (r() < 0.5 ? 1.5 : 2.5), dir: r() * 6.283 })
  if (!tagli.length && riprese.length > 1) { const i = 1 + Math.floor(r() * (riprese.length - 1)); tagli.push({ t: riprese[i].t0, d: br.beat * 2, dir: r() * 6.283 }) }
  let cache: { W: number; H: number; dx: Float32Array; dy: Float32Array; dz: Float32Array; sp: Float32Array; ve: Float32Array; out: HTMLCanvasElement; tmp: HTMLCanvasElement } | null = null
  const prepara = (W: number, H: number) => {
    const n = Math.ceil(W / o.passo) * Math.ceil(H / o.passo), dx = new Float32Array(n), dy = new Float32Array(n), dz = new Float32Array(n), sp = new Float32Array(n), ve = new Float32Array(n)
    // le direzioni di viaggio di ogni punto: un campo morbido (vortici larghi) più una parte a caso
    for (let i = 0; i < n; i++) {
      const gx = (i % Math.ceil(W / o.passo)) * o.passo, gy = Math.floor(i / Math.ceil(W / o.passo)) * o.passo
      const ang = Math.sin(gx * 0.004 + o.seme) * 2 + Math.cos(gy * 0.003) * 2 + (r() - 0.5) * o.schizzo * 4
      const m = (0.3 + r() * 0.7) * W * 0.12 * (r() < 0.1 ? 4 : 1)
      dx[i] = Math.cos(ang) * m * o.deriva + (r() - 0.5) * W * o.schizzo * 0.06
      dy[i] = Math.sin(ang) * m * o.deriva + (r() - 0.5) * H * o.schizzo * 0.03
      dz[i] = (r() - 0.3) * W * 0.3
      sp[i] = r() - 0.5; ve[i] = Math.pow(r(), 2)
    }
    const out = document.createElement('canvas'); out.width = W; out.height = H
    const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H
    cache = { W, H, dx, dy, dz, sp, ve, out, tmp }
    return cache
  }
  return (cv: HTMLCanvasElement, t: number): HTMLCanvasElement | null => {
    const k = tagli.find(x => t >= x.t - x.d && t < x.t + x.d)
    if (!k) return null
    const W = cv.width, H = cv.height, C = cache && cache.W === W && cache.H === H ? cache : prepara(W, H)
    // u: 0 lontano dal taglio, 1 sul taglio (la nuvola più sparsa); il lato dice quale tavola si vede
    const u = 1 - Math.abs(t - k.t) / k.d, e = u * u * (3 - 2 * u), lato = t < k.t ? -1 : 1
    const src = cv.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, W, H).data
    const g = C.out.getContext('2d')!, I = g.createImageData(W, H), B = I.data
    const fondo = o.resa === 'bianco' ? 244 : 6
    // salienza: quanto un punto si stacca dalla luce media del suo intorno (a scala grossa): restano le figure, le parole, i bordi;
    // le campiture uniformi si svuotano, così la nuvola ha la forma delle cose, non del rettangolo
    const sw = Math.max(8, Math.round(W / 24)), sh = Math.max(8, Math.round(H / 24))
    const pic = document.createElement('canvas'); pic.width = sw; pic.height = sh; const pg = pic.getContext('2d', { willReadFrequently: true })!
    pg.filter = 'blur(1px)'; pg.drawImage(cv, 0, 0, sw, sh); const M = pg.getImageData(0, 0, sw, sh).data
    for (let i = 0; i < B.length; i += 4) { B[i] = B[i + 1] = B[i + 2] = fondo; B[i + 3] = 255 }
    const cols = Math.ceil(W / o.passo), ang = lato * e * o.orbita + (t - k.t) * 0.1, ca = Math.cos(ang), sa = Math.sin(ang), F = W * 1.4
    const z0 = o.profondita * W * 0.25 * (0.3 + e)
    const segni: [number, number, number, number, number][] = []
    for (let i = 0, n = C.dx.length; i < n; i++) {
      const gx = (i % cols) * o.passo, gy = Math.floor(i / cols) * o.passo, s4 = ((gy | 0) * W + (gx | 0)) * 4
      const R = src[s4], G = src[s4 + 1], Bl = src[s4 + 2], l = (R * 0.3 + G * 0.59 + Bl * 0.11) / 255
      // sul nero si vedono i punti chiari, sul bianco quelli scuri: i punti "vuoti" non si disegnano (la nuvola ha la forma della tavola)
      const m4 = ((Math.min(sh - 1, (gy * sh / H) | 0)) * sw + Math.min(sw - 1, (gx * sw / W) | 0)) * 4
      const stacco = Math.min(1, (Math.abs(R - M[m4]) + Math.abs(G - M[m4 + 1]) + Math.abs(Bl - M[m4 + 2])) / 90)
      const peso = stacco * (o.resa === 'bianco' ? 0.4 + (1 - l) * 0.6 : o.resa === 'nero' ? 0.4 + l * 0.6 : 1)
      if (peso < 0.15) continue
      // posizione 3D: profondità dalla luce, poi il viaggio (sciame: lungo la sua direzione; colata: verso il basso, rallentando)
      let x = gx - W / 2, y = gy - H / 2, z = Math.pow(o.resa === 'bianco' ? 1 - l : l, o.curva ?? 1) * z0 + C.sp[i] * W * o.spessore
      // scia: la nuvola si allunga in una direzione sola, come una cometa (i punti più leggeri vanno più lontano)
      if (o.scia) { const m = W * 1.2 * o.scia * e * e * C.ve[i]; x += Math.cos(k.dir) * m; y += Math.sin(k.dir) * m * 0.4 }
      if (o.viaggio === 'sciame') { const e3 = e * e * e; x += C.dx[i] * e3; y += C.dy[i] * e3; z += C.dz[i] * e3 }
      else { const v = Math.pow(e, 2.5) * (0.3 + l) * C.ve[i]; y += H * 0.6 * v * (0.5 + (i % 7) / 7); x += C.dx[i] * 0.15 * e; z += C.dz[i] * 0.2 * e }
      const xr = x * ca - z * sa, zr = x * sa + z * ca, p = F / (F + zr)
      const px = (xr * p + W / 2) | 0, py = (y * p + H / 2) | 0
      if (px < 0 || py < 0 || px >= W - 1 || py >= H - 1) continue
      const d4 = (py * W + px) * 4, al = Math.min(1, peso * (1.3 - e * 0.5))
      let cr: number, cg: number, cb: number
      if (o.resa === 'vero') { cr = R; cg = G; cb = Bl } else if (o.resa === 'nero') { const h = o.luce ?? '#ffffff'; cr = parseInt(h.slice(1, 3), 16); cg = parseInt(h.slice(3, 5), 16); cb = parseInt(h.slice(5, 7), 16) } else { cr = cg = cb = 10 }
      // due pixel per punto (in diagonale) danno la grana fine della nuvola
      for (const q of [d4, d4 + W * 4 + 4]) { B[q] = B[q] * (1 - al) + cr * al; B[q + 1] = B[q + 1] * (1 - al) + cg * al; B[q + 2] = B[q + 2] * (1 - al) + cb * al }
      if (o.segni && i % 9973 === 0 && segni.length < 40) segni.push([px, py, x / W, y / H, zr / W])
    }
    g.putImageData(I, 0, 0)
    // il piano della pagina: un telaio sottile che ruota con la nuvola, con le tacche ai lati
    {
      const pr = (x: number, y: number, z: number) => { const xr = x * ca - z * sa, zr = x * sa + z * ca, p = F / (F + zr); return [xr * p + W / 2, y * p + H / 2] }
      const ink = o.resa === 'bianco' ? 'rgba(10,10,10,' : 'rgba(235,235,235,'
      g.globalAlpha = sm(0.05, 0.5, e) * 0.5; g.strokeStyle = ink + '0.6)'; g.lineWidth = 1
      const hw = W * 0.46, hh = H * 0.42
      for (const zz of [0, z0 * 1.2]) { g.beginPath(); [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh], [-hw, -hh]].forEach(([x, y], i) => { const [a2, b2] = pr(x, y, zz); i ? g.lineTo(a2, b2) : g.moveTo(a2, b2) }); g.stroke() }
      for (let j = -10; j <= 10; j++) { const [a1, b1] = pr(-hw, (j / 10) * hh, 0), [a2, b2] = pr(-hw - W * 0.012, (j / 10) * hh, 0); g.beginPath(); g.moveTo(a1, b1); g.lineTo(a2, b2); g.stroke() }
      g.globalAlpha = 1
    }
    // mirini: pochi punti seguiti, con le coordinate, legati da una linea
    if (o.segni && segni.length) {
      const passo = Math.max(1, Math.floor(segni.length / o.segni)), scelti = segni.filter((_, i) => i % passo === 0).slice(0, o.segni)
      const ink = o.resa === 'bianco' ? 'rgba(10,10,10,0.85)' : 'rgba(240,240,240,0.85)'
      g.strokeStyle = ink; g.fillStyle = ink; g.lineWidth = 1.5; g.font = `${Math.round(W * 0.016)}px ui-monospace, Menlo, monospace`
      g.globalAlpha = sm(0.05, 0.4, e)
      g.beginPath(); scelti.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.stroke()
      scelti.forEach(([px, py, X, Y, Z], i) => {
        const h = W * 0.012
        for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.beginPath(); g.moveTo(px + sx * h, py + sy * h * 0.4); g.lineTo(px + sx * h, py + sy * h); g.lineTo(px + sx * h * 0.4, py + sy * h); g.stroke() }
        const f = (v: number) => (v >= 0 ? '+' : '') + v.toFixed(2)
        g.fillText(e > 0.7 ? `${String(i + 1).padStart(2, '0')} SEEK` : `${String(i + 1).padStart(2, '0')} ${f(X)} ${f(Y)} ${f(Z)}`, px + h * 1.6, py + h * 0.4)
      })
      g.globalAlpha = 1
    }
    // lontano dal taglio la tavola vera torna a coprire la nuvola
    const tg = C.tmp.getContext('2d')!
    tg.globalAlpha = 1; tg.drawImage(C.out, 0, 0); tg.globalAlpha = 1 - sm(0.0, 0.35, e); tg.drawImage(cv, 0, 0); tg.globalAlpha = 1
    return C.tmp
  }
}

/**
 * Il volume di un asset 2D (lo stesso principio del modello 3D del software di grafica: la sagoma gonfiata):
 * la distanza dal bordo dell'alfa diventa altezza con un profilo a cuscino, più un rilievo leggero dalla luce.
 * Ne esce una nuvola di punti col colore dell'asset, centrata (coordinate in pixel dello sprite).
 */
export interface Nuvola { n: number; x: Float32Array; y: Float32Array; z: Float32Array; c: Uint8Array; dx: Float32Array; dy: Float32Array; dz: Float32Array; ve: Float32Array; w: number; h: number }
export function nuvolaDi(sprite: HTMLCanvasElement, seme: number, max = 16000): Nuvola | null {
  const k = Math.min(1, 360 / Math.max(sprite.width, sprite.height)), w = Math.max(4, Math.round(sprite.width * k)), h = Math.max(4, Math.round(sprite.height * k))
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d', { willReadFrequently: true })!; g.drawImage(sprite, 0, 0, w, h)
  const D = g.getImageData(0, 0, w, h).data, N = w * h, dist = new Float32Array(N)
  // distanza dal bordo (chamfer a due passate)
  const BIG = 1e6
  for (let i = 0; i < N; i++) dist[i] = D[i * 4 + 3] > 20 ? BIG : 0
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!dist[i]) continue; let v = dist[i]; if (x > 0) v = Math.min(v, dist[i - 1] + 1); if (y > 0) v = Math.min(v, dist[i - w] + 1); if (x > 0 && y > 0) v = Math.min(v, dist[i - w - 1] + 1.414); if (x < w - 1 && y > 0) v = Math.min(v, dist[i - w + 1] + 1.414); if (x === 0 || y === 0) v = Math.min(v, 1); dist[i] = v }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) { const i = y * w + x; if (!dist[i]) continue; let v = dist[i]; if (x < w - 1) v = Math.min(v, dist[i + 1] + 1); if (y < h - 1) v = Math.min(v, dist[i + w] + 1); if (x < w - 1 && y < h - 1) v = Math.min(v, dist[i + w + 1] + 1.414); if (x > 0 && y < h - 1) v = Math.min(v, dist[i + w - 1] + 1.414); if (x === w - 1 || y === h - 1) v = Math.min(v, 1); dist[i] = v }
  let dmax = 1, piene = 0; for (let i = 0; i < N; i++) { if (dist[i] > dmax) dmax = dist[i]; if (dist[i]) piene++ }
  if (piene < 30) return null
  const passo = Math.max(1, Math.sqrt(piene / max))
  let a = seme >>> 0; const r = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296)
  const xs: number[] = [], ys: number[] = [], zs: number[] = [], cs: number[] = []
  for (let yy = 0; yy < h; yy += passo) for (let xx = 0; xx < w; xx += passo) {
    const x = Math.min(w - 1, Math.round(xx + (r() - 0.5) * passo)), y = Math.min(h - 1, Math.round(yy + (r() - 0.5) * passo)), i = y * w + x
    if (!dist[i]) continue
    const t = dist[i] / dmax, l = (D[i * 4] * 0.3 + D[i * 4 + 1] * 0.59 + D[i * 4 + 2] * 0.11) / 255
    // cuscino (gonfiato) + rilievo dalla luce; i punti stanno sulla superficie davanti e dietro (il volume ha due facce)
    const hz = Math.sqrt(t * (2 - t)) * dmax * 0.9 + l * dmax * 0.15, lato = r() < 0.7 ? 1 : -1
    xs.push((x - w / 2) / k); ys.push((y - h / 2) / k); zs.push((hz * lato) / k); cs.push(D[i * 4], D[i * 4 + 1], D[i * 4 + 2], D[i * 4 + 3])
  }
  const n = xs.length, dx = new Float32Array(n), dy = new Float32Array(n), dz = new Float32Array(n), ve = new Float32Array(n)
  const S = Math.max(sprite.width, sprite.height)
  for (let i = 0; i < n; i++) { const an = Math.sin(xs[i] * 0.01 + seme) * 2 + Math.cos(ys[i] * 0.008) * 2 + (r() - 0.5) * 2; const m = S * (0.15 + r() * 0.5); dx[i] = Math.cos(an) * m; dy[i] = Math.sin(an) * m; dz[i] = (r() - 0.4) * S * 0.6; ve[i] = Math.pow(r(), 2) }
  return { n, x: Float32Array.from(xs), y: Float32Array.from(ys), z: Float32Array.from(zs), c: Uint8Array.from(cs), dx, dy, dz, ve, w: sprite.width, h: sprite.height }
}

/** disegna la nuvola nel sistema dello sprite (il contesto è già centrato sul nodo). e: 0 forma intera → 1 sciolta; lato: -1 esce, +1 entra */
export function disegnaNuvola(g: CanvasRenderingContext2D, nv: Nuvola, scala: number, e: number, lato: number, t: number, o: OpzioniRaccolta, dir: number) {
  const ang = lato * e * o.orbita * 1.4 + t * 0.25, ca = Math.cos(ang), sa = Math.sin(ang), F = Math.max(nv.w, nv.h) * 2.2
  const e3 = e * e * e, dot = Math.max(1.8, 2.4 / Math.max(0.3, scala))
  const luce = o.luce ?? '#ffffff'
  g.globalCompositeOperation = o.resa === 'nero' ? 'lighter' : 'source-over'
  const pts: [number, number, number, number][] = []
  for (let i = 0; i < nv.n; i++) {
    let x = nv.x[i], y = nv.y[i], z = nv.z[i] * (0.35 + o.profondita)
    if (o.viaggio === 'sciame') { x += nv.dx[i] * e3 * o.deriva; y += nv.dy[i] * e3 * o.deriva; z += nv.dz[i] * e3 * o.schizzo }
    else { y += nv.h * 0.9 * Math.pow(e, 2.5) * nv.ve[i]; x += nv.dx[i] * 0.1 * e }
    if (o.scia) { const m = Math.max(nv.w, nv.h) * 1.5 * o.scia * e * e * nv.ve[i]; x += Math.cos(dir) * m; y += Math.sin(dir) * m * 0.5 }
    const xr = x * ca - z * sa, zr = x * sa + z * ca, p = F / (F + zr)
    const al = Math.min(1, (nv.c[i * 4 + 3] / 255) * (1.2 - e * 0.3) * (zr > 0 ? 0.7 : 1))
    g.globalAlpha = al
    g.fillStyle = o.resa === 'vero' ? `rgb(${nv.c[i * 4]},${nv.c[i * 4 + 1]},${nv.c[i * 4 + 2]})` : o.resa === 'nero' ? luce : '#141414'
    const px = xr * p, py = y * p
    g.fillRect(px, py, dot * p, dot * p)
    if (o.segni && i % Math.max(1, Math.floor(nv.n / o.segni)) === 7) pts.push([px, py, x / nv.w, z / nv.w])
  }
  g.globalCompositeOperation = 'source-over'
  if (pts.length) {
    const ink = o.resa === 'nero' ? '#eee' : '#111', hh = 10 / scala
    g.globalAlpha = Math.min(1, e * 2) * 0.85; g.strokeStyle = g.fillStyle = ink; g.lineWidth = 1.2 / scala; g.font = `${Math.round(15 / scala)}px ui-monospace, Menlo, monospace`
    g.beginPath(); pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.stroke()
    pts.forEach(([px, py, X, Z], i) => { g.strokeRect(px - hh, py - hh, hh * 2, hh * 2); const f = (v: number) => (v >= 0 ? '+' : '') + v.toFixed(2); g.fillText(e > 0.75 ? `${String(i + 1).padStart(2, '0')} SEEK` : `${String(i + 1).padStart(2, '0')} ${f(X)} ${f(Z)}`, px + hh * 1.5, py + hh * 0.4) })
  }
  g.globalAlpha = 1
}
