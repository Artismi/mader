/**
 * Tattoo flash tradizionale: contorno nero pieno e uguale, campiture piatte
 * (rosso, giallo, verde, acciaio), ombra a puntini sul lato in basso a destra e
 * lucidi bianchi. Ogni soggetto è una lista di pezzi disegnati in ordine: chi viene
 * dopo copre chi viene prima, contorno compreso, come si inchiostra davvero.
 */
import { makeCanvas, rng, type Ctx, type Rnd } from './raster'

export const INK = { black: '#141212', red: '#c3172b', yellow: '#f0b323', green: '#2f7a3b', steel: '#b8c0c9', gold: '#d9a531', white: '#fbf6ea', skin: '#efe2c8', blue: '#2b5ea8' }

type Item =
  | { kind: 'fill'; path: (c: Ctx) => void; color: string; shade?: boolean; line?: number }
  | { kind: 'stroke'; path: (c: Ctx) => void; color: string; width: number; line?: number; cap?: CanvasLineCap }
  | { kind: 'ink'; path: (c: Ctx) => void; width: number; color?: string }          // solo linea (dettagli interni)
  | { kind: 'dot'; x: number; y: number; r: number; color: string }

export interface TattooOpts { lw: number; shade: number; seed: number; palette: Partial<typeof INK> }

/** puntinato d'ombra: la mezzaluna tra la forma e la stessa forma spostata in alto a sinistra */
function shadeDots(ctx: Ctx, W: number, H: number, path: (c: Ctx) => void, d: number, dot: number, amount: number) {
  const t = makeCanvas(W, H), c = t.ctx
  c.fillStyle = '#000'; c.beginPath(); path(c); c.fill()
  c.globalCompositeOperation = 'destination-out'
  c.save(); c.translate(-d, -d); c.beginPath(); path(c); c.fill(); c.restore()
  // banda piena sottile sul bordo, poi puntini sempre più radi verso l'interno
  const b = makeCanvas(W, H), bc = b.ctx
  bc.fillStyle = '#000'; bc.beginPath(); path(bc); bc.fill()
  bc.globalCompositeOperation = 'destination-out'; bc.save(); bc.translate(-d * 0.3, -d * 0.3); bc.beginPath(); path(bc); bc.fill(); bc.restore()
  c.globalCompositeOperation = 'destination-in'
  const p = makeCanvas(W, H), pc = p.ctx
  pc.fillStyle = '#000'
  const step = dot * 2.6
  for (let y = 0; y < H; y += step) for (let x = ((y / step) & 1) * step / 2; x < W; x += step) { pc.beginPath(); pc.arc(x, y, dot * amount, 0, Math.PI * 2); pc.fill() }
  c.drawImage(p.c, 0, 0)
  c.globalCompositeOperation = 'source-over'
  c.drawImage(b.c, 0, 0)
  ctx.drawImage(t.c, 0, 0)
}

export function inkFlash(ctx: Ctx, W: number, H: number, items: Item[], o: TattooOpts) {
  const black = o.palette.black ?? INK.black
  for (const it of items) {
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'
    if (it.kind === 'fill') {
      ctx.fillStyle = it.color; ctx.beginPath(); it.path(ctx); ctx.fill()
      if (it.shade !== false && o.shade > 0) shadeDots(ctx, W, H, it.path, o.lw * 4.5, o.lw * 0.42, o.shade)
      ctx.strokeStyle = black; ctx.lineWidth = o.lw * (it.line ?? 1); ctx.beginPath(); it.path(ctx); ctx.stroke()
    } else if (it.kind === 'stroke') {
      ctx.lineCap = it.cap ?? 'round'
      ctx.strokeStyle = black; ctx.lineWidth = it.width + o.lw * (it.line ?? 1) * 2; ctx.beginPath(); it.path(ctx); ctx.stroke()
      ctx.strokeStyle = it.color; ctx.lineWidth = it.width; ctx.beginPath(); it.path(ctx); ctx.stroke()
    } else if (it.kind === 'ink') {
      ctx.strokeStyle = it.color ?? black; ctx.lineWidth = it.width; ctx.beginPath(); it.path(ctx); ctx.stroke()
    } else {
      ctx.fillStyle = it.color; ctx.beginPath(); ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2); ctx.fill()
    }
  }
}

/** stellina tradizionale a quattro punte (scintilla) */
const sparkle = (x: number, y: number, r: number): Item => ({ kind: 'fill', shade: false, color: INK.white, line: 0.7, path: c => { c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r); c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r); c.closePath() } })

// ─── soggetti ────────────────────────────────────────────────────────────────

/** cuore tradizionale: lobi pieni, punta affilata, lucido a virgola */
export function heart(cx: number, cy: number, s: number, P: typeof INK): Item[] {
  const path = (c: Ctx) => {
    c.moveTo(cx, cy + s * 0.55)
    c.bezierCurveTo(cx - s * 0.18, cy + s * 0.32, cx - s * 0.62, cy + s * 0.08, cx - s * 0.6, cy - s * 0.2)
    c.bezierCurveTo(cx - s * 0.58, cy - s * 0.48, cx - s * 0.16, cy - s * 0.56, cx, cy - s * 0.3)
    c.bezierCurveTo(cx + s * 0.16, cy - s * 0.56, cx + s * 0.58, cy - s * 0.48, cx + s * 0.6, cy - s * 0.2)
    c.bezierCurveTo(cx + s * 0.62, cy + s * 0.08, cx + s * 0.18, cy + s * 0.32, cx, cy + s * 0.55)
    c.closePath()
  }
  return [
    { kind: 'fill', path, color: P.red },
    { kind: 'fill', shade: false, color: P.white, line: 0, path: c => { c.moveTo(cx - s * 0.46, cy - s * 0.2); c.bezierCurveTo(cx - s * 0.46, cy - s * 0.38, cx - s * 0.3, cy - s * 0.43, cx - s * 0.2, cy - s * 0.38); c.bezierCurveTo(cx - s * 0.32, cy - s * 0.34, cx - s * 0.4, cy - s * 0.28, cx - s * 0.46, cy - s * 0.2); c.closePath() } },
    { kind: 'dot', x: cx - s * 0.47, y: cy - s * 0.1, r: s * 0.025, color: P.white },
    sparkle(cx + s * 0.62, cy - s * 0.52, s * 0.08), sparkle(cx - s * 0.7, cy + s * 0.25, s * 0.05),
  ]
}

/**
 * Coltello a lama ondulata (kris): la lama serpeggia con onde che si stringono
 * verso la punta, filo centrale, guardia a mezzaluna dorata, impugnatura fasciata
 * e pomolo a sfera.
 */
export function kris(cx: number, cy: number, s: number, ang: number, P: typeof INK): Item[] {
  const ca = Math.cos(ang), sa = Math.sin(ang)
  const T = (u: number, v: number): [number, number] => [cx + u * ca - v * sa, cy + u * sa + v * ca]   // u lungo il coltello, v di traverso
  const L = s * 0.62, base = -s * 0.05, waves = 7
  const blade = (c: Ctx) => {
    const n = 120
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = base + L * t
      const half = s * 0.085 * Math.pow(1 - t, 0.85) + s * 0.004
      const w = s * 0.022 * Math.sin(t * Math.PI * waves) * (1 - t * 0.5)
      const p = T(u, w + half); if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1])
    }
    for (let i = 120; i >= 0; i--) {
      const t = i / 120, u = base + L * t
      const half = s * 0.085 * Math.pow(1 - t, 0.85) + s * 0.004
      const w = s * 0.022 * Math.sin(t * Math.PI * waves) * (1 - t * 0.5)
      const p = T(u, w - half); c.lineTo(p[0], p[1])
    }
    c.closePath()
  }
  const ridge = (c: Ctx) => {
    for (let i = 0; i <= 100; i++) {
      const t = i / 100 * 0.9, u = base + L * t, w = s * 0.022 * Math.sin(t * Math.PI * waves) * (1 - t * 0.5)
      const p = T(u, w); if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1])
    }
  }
  const guard = (c: Ctx) => {
    const a = T(base, -s * 0.16), b = T(base - s * 0.04, -s * 0.11), m = T(base - s * 0.05, 0), d = T(base - s * 0.04, s * 0.11), e = T(base, s * 0.16), f = T(base + s * 0.015, 0)
    c.moveTo(a[0], a[1]); c.quadraticCurveTo(b[0], b[1], m[0], m[1]); c.quadraticCurveTo(d[0], d[1], e[0], e[1]); c.quadraticCurveTo(f[0], f[1], a[0], a[1]); c.closePath()
  }
  const g0 = base - s * 0.05, g1 = g0 - s * 0.22
  const grip = (c: Ctx) => {
    const p = [T(g0, -s * 0.045), T(g1, -s * 0.04), T(g1, s * 0.04), T(g0, s * 0.045)]
    c.moveTo(p[0][0], p[0][1]); for (const q of p.slice(1)) c.lineTo(q[0], q[1]); c.closePath()
  }
  const wraps: Item[] = []
  for (let k = 1; k < 7; k++) {
    const u = g0 - (g0 - g1) * k / 7
    wraps.push({ kind: 'ink', width: s * 0.006, path: c => { const a = T(u + s * 0.012, -s * 0.044), b = T(u - s * 0.012, s * 0.044); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]) } })
  }
  const pom = T(g1 - s * 0.045, 0)
  return [
    { kind: 'fill', path: blade, color: P.steel },
    { kind: 'ink', width: s * 0.006, path: ridge },
    { kind: 'fill', shade: false, color: P.white, line: 0, path: c => { const n = 50; for (let i = 0; i <= n; i++) { const t = 0.05 + i / n * 0.6, u = base + L * t, w = s * 0.022 * Math.sin(t * Math.PI * waves) * (1 - t * 0.5), hh = s * 0.085 * Math.pow(1 - t, 0.85); const p = T(u, w - hh * 0.55); if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]) } for (let i = n; i >= 0; i--) { const t = 0.05 + i / n * 0.6, u = base + L * t, w = s * 0.022 * Math.sin(t * Math.PI * waves) * (1 - t * 0.5), hh = s * 0.085 * Math.pow(1 - t, 0.85); const p = T(u, w - hh * 0.25); c.lineTo(p[0], p[1]) } c.closePath() } },
    { kind: 'fill', path: grip, color: P.red },
    ...wraps,
    { kind: 'fill', path: guard, color: P.gold },
    { kind: 'fill', path: c => c.arc(pom[0], pom[1], s * 0.055, 0, Math.PI * 2), color: P.gold },
    { kind: 'dot', x: pom[0] - s * 0.018, y: pom[1] - s * 0.018, r: s * 0.013, color: P.white },
    sparkle(T(base + L * 0.95, s * 0.12)[0], T(base + L * 0.95, s * 0.12)[1], s * 0.06),
  ]
}

/** filo spinato: due fili che si attorcigliano, nodi a quattro punte a intervalli */
export function barbedWire(cx: number, cy: number, s: number, r: Rnd, P: typeof INK): Item[] {
  const len = s * 1.5, amp = s * 0.03, turns = 8
  const sag = (u: number) => s * 0.08 * Math.sin(u * Math.PI)
  const pt = (t: number, ph: number): [number, number] => [cx - len / 2 + len * t, cy + sag(t) + amp * Math.sin(t * Math.PI * 2 * turns + ph)]
  // ogni filo diviso in tratti: sopra/sotto si alternano dove i fili si incrociano
  const items: Item[] = []
  const seg = (ph: number, a: number, b: number) => (c: Ctx) => { for (let i = 0; i <= 30; i++) { const p = pt(a + (b - a) * i / 30, ph); if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]) } }
  const half = 1 / (turns * 2)
  for (let k = 0; k < turns * 2; k++) {
    const a = k * half, b = (k + 1) * half
    const first = k % 2 ? Math.PI : 0, second = k % 2 ? 0 : Math.PI
    items.push({ kind: 'stroke', path: seg(first, a, b), color: P.steel, width: s * 0.02, cap: 'butt' })
    items.push({ kind: 'stroke', path: seg(second, a, b), color: P.steel, width: s * 0.02, cap: 'butt' })
  }
  // nodi: quattro punte storte che escono dal punto
  const knots = 4
  for (let k = 0; k < knots; k++) {
    const t = (k + 0.5) / knots, p = pt(t, Math.PI / 2)
    for (let j = 0; j < 4; j++) {
      const a = j * Math.PI / 2 + Math.PI / 4 + (r() - 0.5) * 0.35, l = s * (0.11 + r() * 0.03)
      const q: [number, number] = [p[0] + Math.cos(a) * l, p[1] + Math.sin(a) * l]
      items.push({ kind: 'stroke', color: P.steel, width: s * 0.014, cap: 'butt', path: c => { c.moveTo(p[0], p[1]); c.lineTo(q[0], q[1]) } })
      items.push({ kind: 'fill', shade: false, color: P.steel, line: 0.6, path: c => { const bx = q[0] - Math.cos(a) * s * 0.012, by = q[1] - Math.sin(a) * s * 0.012; c.moveTo(q[0] + Math.cos(a) * s * 0.012, q[1] + Math.sin(a) * s * 0.012); c.lineTo(bx - Math.sin(a) * s * 0.006, by + Math.cos(a) * s * 0.006); c.lineTo(bx + Math.sin(a) * s * 0.006, by - Math.cos(a) * s * 0.006); c.closePath() } })
    }
    items.push({ kind: 'fill', shade: false, color: P.steel, line: 0.8, path: c => c.ellipse(p[0], p[1], s * 0.036, s * 0.026, 0.4, 0, Math.PI * 2) })
  }
  return items
}

/** catena che si spezza: maglie alternate di fronte e di taglio, quella centrale aperta */
export function brokenChain(cx: number, cy: number, s: number, P: typeof INK): Item[] {
  const items: Item[] = []
  const n = 7, pitch = s * 0.19, lw = s * 0.03
  const x0 = cx - pitch * (n - 1) / 2
  const mid = Math.floor(n / 2)
  for (let i = 0; i < n; i++) {
    const x = x0 + i * pitch + (i > mid ? s * 0.06 : i < mid ? -s * 0.06 : 0), y = cy + Math.sin(i * 0.9) * s * 0.02
    const tilt = (i - mid) * 0.05
    if (i === mid) {
      // maglia spezzata: due mezze maglie che si allontanano
      for (const sgn of [-1, 1]) items.push({ kind: 'stroke', color: P.steel, width: lw, path: c => c.ellipse(x + sgn * s * 0.035, y, s * 0.12, s * 0.065, tilt + sgn * 0.15, sgn < 0 ? Math.PI * 0.62 : -Math.PI * 0.38, sgn < 0 ? Math.PI * 1.38 : Math.PI * 0.38) })
      // schegge
      for (const [dx, dy, a] of [[0, -0.12, -1.57], [0.02, 0.12, 1.5], [-0.05, -0.1, -2.2], [0.06, -0.1, -0.9]] as const) {
        const px = x + dx * s, py = y + dy * s
        items.push({ kind: 'ink', width: s * 0.008, path: c => { c.moveTo(px, py); c.lineTo(px + Math.cos(a) * s * 0.06, py + Math.sin(a) * s * 0.06) } })
      }
      continue
    }
    if (i % 2 === (mid % 2)) items.push({ kind: 'stroke', color: P.steel, width: lw, path: c => c.ellipse(x, y, s * 0.12, s * 0.065, tilt, 0, Math.PI * 2) })
    else items.push({ kind: 'stroke', color: P.steel, width: lw * 1.15, path: c => { c.moveTo(x - s * 0.11, y); c.lineTo(x + s * 0.11, y) } })
  }
  // lucidi sulle maglie di fronte
  for (let i = 0; i < n; i++) if (i !== mid && i % 2 === (mid % 2)) {
    const x = x0 + i * pitch + (i > mid ? s * 0.06 : -s * 0.06), y = cy + Math.sin(i * 0.9) * s * 0.02
    items.push({ kind: 'ink', color: P.white, width: s * 0.007, path: c => c.ellipse(x, y, s * 0.12, s * 0.065, 0, Math.PI * 1.1, Math.PI * 1.45) })
  }
  items.push(sparkle(cx, cy - s * 0.22, s * 0.07))
  return items
}

/**
 * Rosa tradizionale: testa a coppa con il bordo superiore a tre lobi, spirale al
 * centro, pieghe dei petali come archi, gambo corto e due foglie attaccate.
 */
export function rose(cx: number, cy: number, s: number, P: typeof INK): Item[] {
  const R = s * 0.32
  const items: Item[] = []
  // gambo e foglie (sotto la testa)
  items.push({ kind: 'stroke', color: P.green, width: s * 0.03, path: c => { c.moveTo(cx, cy + R * 0.6); c.quadraticCurveTo(cx + R * 0.15, cy + R * 1.3, cx - R * 0.1, cy + R * 1.9) } })
  const leaf = (bx: number, by: number, a: number, l: number): Item[] => {
    const tx = bx + Math.cos(a) * l, ty = by + Math.sin(a) * l, nx = -Math.sin(a) * l * 0.34, ny = Math.cos(a) * l * 0.34, mx = (bx + tx) / 2, my = (by + ty) / 2
    return [
      { kind: 'fill', color: P.green, path: c => { c.moveTo(bx, by); c.quadraticCurveTo(mx + nx, my + ny, tx, ty); c.quadraticCurveTo(mx - nx, my - ny, bx, by); c.closePath() } },
      { kind: 'ink', width: s * 0.007, path: c => { c.moveTo(bx, by); c.quadraticCurveTo(mx + nx * 0.2, my + ny * 0.2, tx - (tx - bx) * 0.15, ty - (ty - by) * 0.15) } },
    ]
  }
  items.push(...leaf(cx + R * 0.05, cy + R * 1.15, Math.PI * 0.95, s * 0.36), ...leaf(cx + R * 0.1, cy + R * 1.45, 0.15, s * 0.32))
  // testa: coppa
  const head = (c: Ctx) => {
    c.moveTo(cx - R, cy - R * 0.15)
    c.bezierCurveTo(cx - R * 1.05, cy + R * 0.6, cx - R * 0.45, cy + R * 0.95, cx, cy + R * 0.95)
    c.bezierCurveTo(cx + R * 0.45, cy + R * 0.95, cx + R * 1.05, cy + R * 0.6, cx + R, cy - R * 0.15)
    // bordo superiore a tre lobi
    c.bezierCurveTo(cx + R * 1.0, cy - R * 0.75, cx + R * 0.5, cy - R * 0.95, cx + R * 0.32, cy - R * 0.62)
    c.bezierCurveTo(cx + R * 0.2, cy - R * 1.05, cx - R * 0.2, cy - R * 1.05, cx - R * 0.32, cy - R * 0.62)
    c.bezierCurveTo(cx - R * 0.5, cy - R * 0.95, cx - R * 1.0, cy - R * 0.75, cx - R, cy - R * 0.15)
    c.closePath()
  }
  items.push({ kind: 'fill', color: P.red, path: head })
  // bocciolo interno: ovale e spirale
  items.push({ kind: 'fill', color: P.red, shade: false, path: c => c.ellipse(cx, cy - R * 0.32, R * 0.48, R * 0.3, 0, 0, Math.PI * 2) })
  items.push({ kind: 'ink', width: s * 0.009, path: c => { for (let i = 0; i <= 90; i++) { const t = i / 90, a = -Math.PI / 2 + t * Math.PI * 3, rr = R * 0.32 * (1 - t * 0.85); const x = cx + Math.cos(a) * rr, y = cy - R * 0.32 + Math.sin(a) * rr * 0.62; if (i) c.lineTo(x, y); else c.moveTo(x, y) } } })
  // pieghe dei petali: archi a coppa che scendono dai lati
  for (const sgn of [-1, 1]) {
    items.push({ kind: 'ink', width: s * 0.009, path: c => { c.moveTo(cx + sgn * R * 0.48, cy - R * 0.3); c.bezierCurveTo(cx + sgn * R * 0.55, cy + R * 0.2, cx + sgn * R * 0.2, cy + R * 0.45, cx - sgn * R * 0.1, cy + R * 0.5) } })
    items.push({ kind: 'ink', width: s * 0.009, path: c => { c.moveTo(cx + sgn * R * 0.95, cy - R * 0.1); c.bezierCurveTo(cx + sgn * R * 0.8, cy + R * 0.45, cx + sgn * R * 0.45, cy + R * 0.7, cx + sgn * R * 0.05, cy + R * 0.78) } })
  }
  items.push({ kind: 'ink', color: P.white, width: s * 0.012, path: c => { c.moveTo(cx - R * 0.78, cy - R * 0.35); c.quadraticCurveTo(cx - R * 0.8, cy - R * 0.7, cx - R * 0.55, cy - R * 0.78) } })
  items.push(sparkle(cx + R * 1.3, cy - R * 1.0, s * 0.06))
  return items
}

/** cartiglio tradizionale: nastro leggermente arcuato con le code ripiegate */
export function banner(cx: number, cy: number, w: number, h: number, P: typeof INK): Item[] {
  const bend = h * 0.35
  const y = (x: number) => cy + bend * Math.pow((x - cx) / (w / 2), 2) - bend
  const body = (c: Ctx) => {
    const n = 40
    for (let i = 0; i <= n; i++) { const x = cx - w / 2 + w * i / n; if (i) c.lineTo(x, y(x) - h / 2); else c.moveTo(x, y(x) - h / 2) }
    for (let i = n; i >= 0; i--) { const x = cx - w / 2 + w * i / n; c.lineTo(x, y(x) + h / 2) }
    c.closePath()
  }
  const tail = (sgn: number): Item => ({ kind: 'fill', color: P.red, path: c => {
    const ex = cx + sgn * w / 2, ey = y(ex)
    c.moveTo(ex - sgn * h * 0.2, ey - h * 0.15); c.lineTo(ex + sgn * h * 0.9, ey - h * 0.15); c.lineTo(ex + sgn * h * 0.55, ey + h * 0.38); c.lineTo(ex + sgn * h * 0.9, ey + h * 0.9); c.lineTo(ex - sgn * h * 0.2, ey + h * 0.9); c.closePath()
  } })
  const fold = (sgn: number): Item => ({ kind: 'fill', shade: false, color: '#7e0f1c', path: c => { const ex = cx + sgn * w / 2, ey = y(ex); c.moveTo(ex, ey + h / 2); c.lineTo(ex - sgn * h * 0.2, ey + h * 0.9); c.lineTo(ex - sgn * h * 0.2, ey + h * 0.5); c.closePath() } })
  return [tail(-1), tail(1), fold(-1), fold(1), { kind: 'fill', color: P.white, path: body, shade: false }]
}
export const bannerCurve = (cx: number, w: number, h: number, cy: number) => (x: number) => cy + h * 0.35 * Math.pow((x - cx) / (w / 2), 2) - h * 0.35

export const SUBJECTS = ['Cuore', 'Coltello ondulato', 'Filo spinato', 'Catena spezzata', 'Rosa', 'Cuore trafitto', 'Cuore e filo spinato', 'Rosa e coltello'] as const

export function tattooItems(k: number, cx: number, cy: number, s: number, seed: number, P: typeof INK) {
  const r = rng(seed)
  if (k === 0) return heart(cx, cy, s * 0.72, P)
  if (k === 1) return kris(cx + s * 0.06, cy + s * 0.05, s * 1.25, -Math.PI / 4 - 0.1, P)
  if (k === 2) return barbedWire(cx, cy, s * 0.64, r, P)
  if (k === 3) return brokenChain(cx, cy, s * 1.1, P)
  if (k === 4) return rose(cx, cy - s * 0.1, s * 1.05, P)
  // composizioni classiche: il coltello passa dietro, il resto sopra
  if (k === 5) return [...kris(cx - s * 0.12, cy - s * 0.12, s * 1.45, Math.PI / 4 + 0.15, P), ...heart(cx, cy + s * 0.02, s * 0.66, P)]
  if (k === 6) return [...heart(cx, cy, s * 0.72, P), ...barbedWire(cx, cy + s * 0.02, s * 0.56, r, P)]
  return [...kris(cx - s * 0.05, cy + s * 0.05, s * 1.35, -Math.PI / 4 - 0.25, P), ...rose(cx + s * 0.02, cy - s * 0.02, s * 0.78, P)]
}
