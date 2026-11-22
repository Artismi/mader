/**
 * Il mondo della camera (nucleo leggero, dalla camera dei pattern di Andrea: stateyour/src/camera/mondo.js).
 * Un pattern è la fotografia di un evento fisico in un universo possibile. Quattro leggi:
 *   GRAVITÀ     masse ferme che curvano lo spazio: chi passa cade con a = G·M/r² (mezzi calci, Verlet)
 *   MAGNETISMO  campo B perpendicolare al piano: una carica gira con ω = q·B/m (rotazione esatta, corda dell'arco)
 *   MATERIA     dove c'è materia una carica frena (Bethe): dv/dt = −K·q²/(m·v²), in forma chiusa: v³ cala di 3Kq²/m·dt
 *   DECADIMENTO una particella instabile si divide nelle figlie della sua specie, quando capita (vita esponenziale)
 * La LASTRA registra le cariche come bolle: spessore w = w0·|q|·min(saturazione, vRif/v); dove si ferma resta una macchia.
 * Niente relatività, niente cosmo: solo la cella. Il caso è ripetibile: stesso seme, stesso universo.
 */

export type Rnd = () => number
export function generatore(seme: number): Rnd {
  let a = seme >>> 0 || 1
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
/** un intero da una stringa (per gli eventi: ogni particella ha il suo caso, dal seme e dal suo indirizzo nella genealogia) */
export function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }

export interface Figlia { specie: string; angolo: number | [number, number]; quota: number | [number, number] }
export interface Specie { q: number; m: number; vitaMedia?: number; luce?: boolean; visibile?: boolean; figli?: Figlia[] }
export interface Onda { k: [number, number]; a: number; fi: number }
export interface Cristallo { centro: [number, number]; r: number; passo: number; angolo: number; a: number }
export interface Massa { pos: [number, number]; M: number; R: number }
export interface Sorgente { pos: [number, number]; dir: number; v: number; t0: number; specie: string }
export interface Mondo {
  larghezza: number; altezza: number; tempo: number; seme: number; G: number
  fondo: { B: number; K: number }
  onde: Onda[]; nubi: { K: number; modi: Onda[] } | null; cristalli: Cristallo[]; masse: Massa[]
  pellicola: { w0: number; saturazione: number; vRif: number }
  specie: Record<string, Specie>; sorgenti: Sorgente[]
}
/** un punto di traccia: x, y, visibile, tempo, spessore */
export type Punto = [number, number, boolean, number, number]
export interface Traccia { id: number; punti: Punto[]; fine: 'tempo' | 'fermo' | 'fuori' | 'decade' | 'caduta'; specie: string; q: number; generazione: number }

const tra = (r: Rnd, x: number | [number, number]) => (Array.isArray(x) ? x[0] + r() * (x[1] - x[0]) : x)

export function simulaMondo(m: Mondo, o: { maxParticelle?: number; maxPassi?: number } = {}): Traccia[] {
  const W = m.larghezza, H = m.altezza, T = m.tempo, G = m.G
  const maxP = o.maxParticelle ?? 900, maxPassi = o.maxPassi ?? 2500
  // il campo e la materia in un punto, e la lunghezza su cui cambiano (per tenere il passo piccolo)
  let lambdaOnde = Infinity
  for (const w of [...m.onde, ...(m.nubi?.modi ?? [])]) lambdaOnde = Math.min(lambdaOnde, (2 * Math.PI) / Math.hypot(...w.k))
  const B = (x: number, y: number) => {
    let b = m.fondo.B
    for (const w of m.onde) b += w.a * Math.cos(w.k[0] * x + w.k[1] * y + w.fi)
    for (const c of m.cristalli) {
      const dx = x - c.centro[0], dy = y - c.centro[1], r = Math.hypot(dx, dy)
      if (r >= c.r) continue
      // il reticolo: tre onde a 60°, come in un cristallo esagonale; ai bordi sfuma
      const sf = Math.min(1, (c.r - r) / (0.15 * c.r)), g = (4 * Math.PI) / (Math.sqrt(3) * c.passo)
      let s = 0; for (let j = 0; j < 3; j++) { const an = c.angolo + (j * Math.PI) / 3; s += Math.cos(g * (dx * Math.cos(an) + dy * Math.sin(an))) }
      b += (c.a * sf * s) / 3
    }
    return b
  }
  const K = (x: number, y: number) => {
    let k = m.fondo.K
    if (m.nubi) { let s = 0; for (const w of m.nubi.modi) s += w.a * Math.cos(w.k[0] * x + w.k[1] * y + w.fi); k += m.nubi.K * Math.max(0, s) }
    return k
  }
  const lambda = (x: number, y: number) => { let l = lambdaOnde; for (const c of m.cristalli) if (Math.hypot(x - c.centro[0], y - c.centro[1]) < c.r + c.passo) l = Math.min(l, c.passo); return l }
  const grav = (x: number, y: number): [number, number] => {
    let gx = 0, gy = 0
    for (const s of m.masse) { const dx = s.pos[0] - x, dy = s.pos[1] - y, r2 = dx * dx + dy * dy + 1e-9, k = (G * s.M) / (r2 * Math.sqrt(r2)); gx += k * dx; gy += k * dy }
    return [gx, gy]
  }
  const pel = m.pellicola, passoMax = Math.max(W, H) / 500
  interface P { pos: [number, number]; vel: [number, number]; t: number; specie: string; ev: string; gen: number }
  const coda: P[] = m.sorgenti.map((s, i) => { const sp = m.specie[s.specie], v = sp.luce ? 30 : s.v; return { pos: [s.pos[0], s.pos[1]] as [number, number], vel: [Math.cos(s.dir) * v, Math.sin(s.dir) * v] as [number, number], t: s.t0, specie: s.specie, ev: `${i}`, gen: 0 } })
  const tracce: Traccia[] = []
  let nate = 0
  while (coda.length && nate < maxP) {
    const p = coda.shift()!; nate++
    const sp = m.specie[p.specie], luce = !!sp.luce, q = luce ? 0 : sp.q, ms = sp.m
    const caso = generatore(hash(`${m.seme}/${p.ev}`))
    const vita = sp.vitaMedia != null ? -sp.vitaMedia * Math.log(1 - caso()) : Infinity
    const visibile = sp.visibile ?? q !== 0
    const larghezza = (v: number) => (!visibile ? 0 : q ? pel.w0 * Math.abs(q) * Math.min(pel.saturazione, pel.vRif / Math.max(v, 1e-9)) : pel.w0 * 0.35)
    let [x, y] = p.pos, [vx, vy] = p.vel, t = p.t
    const nascita = t
    const punti: Punto[] = [[x, y, visibile, t, larghezza(Math.hypot(vx, vy))]]
    let fine: Traccia['fine'] = 'tempo'
    for (let k = 0; k < maxPassi; k++) {
      const v = Math.hypot(vx, vy) || 1e-12, b = luce ? 0 : B(x, y), kk = luce ? 0 : K(x, y)
      const w = q && ms ? (q * b) / ms : 0
      // il passo: corto dove il campo gira forte, dove cambia in fretta, vicino alle masse
      let dt = passoMax / v
      if (w) dt = Math.min(dt, 0.15 / Math.abs(w))
      dt = Math.min(dt, lambda(x, y) / (6 * v))
      for (const s of m.masse) { const d = Math.hypot(x - s.pos[0], y - s.pos[1]) - s.R; dt = Math.min(dt, Math.max(0.02, d / (4 * v))) }
      const fineVita = nascita + vita
      let decade = false
      if (t + dt >= fineVita) { dt = Math.max(1e-6, fineVita - t); decade = true }
      if (t + dt >= T) { dt = Math.max(1e-6, T - t) }
      // mezzo calcio di gravità
      const [ax, ay] = luce ? [0, 0] : grav(x, y)
      vx += (ax * dt) / 2; vy += (ay * dt) / 2
      // la rotazione esatta nel campo e la corda dell'arco
      const th = w * dt, c = Math.cos(th), s = Math.sin(th)
      const chord = Math.abs(th) > 1e-9 ? Math.sin(th / 2) / (th / 2) : 1, ch = Math.cos(th / 2), sh = Math.sin(th / 2)
      const mx = vx * ch - vy * sh, my = vx * sh + vy * ch
      x += mx * chord * dt; y += my * chord * dt
      let nvx = vx * c - vy * s, nvy = vx * s + vy * c
      // Bethe in forma chiusa: v³ cala di 3·K·q²/m·dt; sotto la soglia la particella si ferma (l'occhio)
      let fermo = false
      if (kk > 0 && q) {
        const v3 = Math.hypot(nvx, nvy) ** 3 - (3 * kk * q * q * dt) / ms
        if (v3 <= 0.5) fermo = true
        else { const nv = Math.cbrt(v3), f = nv / (Math.hypot(nvx, nvy) || 1e-12); nvx *= f; nvy *= f }
      }
      const [bx, by] = luce ? [0, 0] : grav(x, y)
      vx = nvx + (bx * dt) / 2; vy = nvy + (by * dt) / 2
      t += dt
      punti.push([x, y, visibile, t, larghezza(Math.hypot(vx, vy))])
      if (fermo) { fine = 'fermo'; break }
      if (m.masse.some(sm => Math.hypot(x - sm.pos[0], y - sm.pos[1]) < sm.R)) { fine = 'caduta'; break }
      if (x < -50 || y < -50 || x > W + 50 || y > H + 50) { fine = 'fuori'; break }
      if (decade) {
        fine = 'decade'
        const dir = Math.atan2(vy, vx), vel = Math.hypot(vx, vy)
        ;(sp.figli ?? []).forEach((f, j) => {
          const a = dir + (tra(caso, f.angolo) * Math.PI) / 180, vv = Math.max(0.5, vel * tra(caso, f.quota))
          coda.push({ pos: [x, y], vel: [Math.cos(a) * vv, Math.sin(a) * vv], t, specie: f.specie, ev: `${p.ev}.${j}`, gen: p.gen + 1 })
        })
        break
      }
      if (t >= T) break
    }
    if (visibile && punti.length > 1) tracce.push({ id: tracce.length, punti, fine, specie: p.specie, q, generazione: p.gen })
  }
  return tracce
}
