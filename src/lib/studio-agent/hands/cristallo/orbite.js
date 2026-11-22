// orbite.js — le orbite periodiche sul toro: le linee chiuse di Lewis F. Day, trovate dalla fisica.
//
// Nel piano, a energia E fissata, un'orbita è periodica sul toro se dopo un tempo T la pallina torna allo stesso
// punto con la stessa velocità, a meno di un vettore del reticolo: r(T) = r(0) + Σ mᵢ·aᵢ, v(T) = v(0).
// IL TIRO DI NEWTON. La mappa di Verlet con passo dt = T/n non ha la simmetria per traslazione nel tempo del flusso
// vero, quindi il punto di partenza non si fissa su una sezione: le incognite sono tutto lo stato e il periodo,
// (x, y, θ, |v|, T), e le equazioni sono cinque, r(T) − r(0) − M = 0, v(T) − v(0) = 0 e l'energia di partenza
// ½|v|² + V(x) = E. Lo jacobiano è per differenze centrali; il passo è di Levenberg-Marquardt con μ piccolo (lungo
// l'orbita la mappa è quasi simmetrica e lo jacobiano quasi singolare: μ tiene il passo corto in quella direzione).
// Ci si ferma quando lo scarto è sotto 10⁻¹¹.
// Il passo è dt = T/n con n fisso: l'orbita è esattamente periodica per la mappa di Verlet (o di Boris) con quel
// passo, che per costruzione è sotto il passo scelto per convergenza.
// LA STABILITÀ: la matrice di monodromia (4 × 4, per differenze centrali sullo stato x, y, vx, vy dopo un periodo) ha
// due autovalori 1 e la coppia λ, 1/λ; la traccia meno 2 è λ + 1/λ: sotto 2 in modulo l'orbita è stabile (ellittica),
// sopra è instabile.
// IL CATALOGO (senza le librazioni, i tratti avanti e indietro: velocità minima sotto un decimo della media): dai semi della fonte del caso (punto e direzione a caso nella cella, dove V < E), si segue la
// traiettoria per al più «celle» celle; dove torna vicino a sé stessa a meno di un vettore del reticolo (entro 0,1 in
// posizione e 0,2 rad in direzione) si tenta il tiro. Si tengono le orbite distinte (periodo diverso oltre 10⁻⁶),
// ordinate dal periodo più corto, con il loro (m₁, m₂) e la loro stabilità.

import { creaPallina, passiVerlet, passiBoris, haMagnete } from './moto.js';
import { sorgente } from './caso.js';

// la mappa di un periodo: n passi con dt = T/n da (x0, v0). Col magnete v0 è la velocità di metà passo.
export function mappa(cr, x0, v0, T, n, B, traccia = null) {
  const s = creaPallina(cr, [x0[0], x0[1], 0], [v0[0], v0[1], 0]), dt = T / n;
  if (haMagnete(B)) passiBoris(cr, s, dt, n, B, traccia); else passiVerlet(cr, s, dt, n, traccia);
  return s;
}
const giro = (a) => a - 2 * Math.PI * Math.round(a / (2 * Math.PI));
const energiaDi = (cr, x, v) => 0.5 * (v[0] * v[0] + v[1] * v[1]) + cr.campo(x[0], x[1], 0, null);

// il tiro: da (x0, θ0, T0) verso un'orbita con spostamento M (cartesiano); n passi
export function tiro(cr, E, B, x0, th0, T0, M, n, iter = 60) {
  const V0 = cr.campo(x0[0], x0[1], 0, null); if (!(E - V0 > 1e-9)) return null;
  const stato = (u) => ({ x: [u[0], u[1]], v: [u[3] * Math.cos(u[2]), u[3] * Math.sin(u[2])] });
  const residuo = (u) => {
    if (!(u[4] > 0)) return null;
    const st = stato(u), s = mappa(cr, st.x, st.v, u[4], n, B);
    return [s.x[0] - st.x[0] - M[0], s.x[1] - st.x[1] - M[1], s.v[0] - st.v[0], s.v[1] - st.v[1], 0.5 * u[3] * u[3] + cr.campo(u[0], u[1], 0, null) - E];
  };
  let u = [x0[0], x0[1], th0, Math.sqrt(2 * (E - V0)), T0], r = residuo(u);
  for (let k = 0; k < iter && r; k++) {
    const e = Math.hypot(...r); if (e < 1e-11) { const st = stato(u); return { x0: st.x, v0: st.v, T: u[4], n, M, scarto: e }; }
    const J = r.map(() => []);
    for (let j = 0; j < 5; j++) {
      const h = 1e-7 * (j === 4 ? Math.max(1, u[4]) : 1), a = [...u], b = [...u]; a[j] += h; b[j] -= h;
      const ra = residuo(a), rb = residuo(b); if (!ra || !rb) return null;
      for (let i = 0; i < 5; i++) J[i][j] = (ra[i] - rb[i]) / (2 * h);
    }
    const JtJ = [0, 1, 2, 3, 4].map((i) => [0, 1, 2, 3, 4].map((j) => J.reduce((a, row) => a + row[i] * row[j], 0)));
    const top = Math.max(...JtJ.map((row, i) => row[i])); for (let i = 0; i < 5; i++) JtJ[i][i] += 1e-12 * top;
    const dx = risolvi(JtJ, [0, 1, 2, 3, 4].map((i) => -J.reduce((a, row, q) => a + row[i] * r[q], 0))); if (!dx) return null;
    let t = 1, nuovo = null;
    for (let q = 0; q < 10; q++) { const v = u.map((x, i) => x + t * dx[i]), rv = residuo(v); if (rv && Math.hypot(...rv) < e) { u = v; nuovo = rv; break; } t /= 2; }
    if (!nuovo) return null; r = nuovo;
  }
  return null;
}
// eliminazione di Gauss con pivot
function risolvi(A, b) {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (!(Math.abs(M[p][c]) > 1e-300)) return null; [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let s = M[r][n]; for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k]; x[r] = s / M[r][r]; }
  return x.every(Number.isFinite) ? x : null;
}

// la traccia della monodromia meno 2 (λ + 1/λ)
export function stabilita(cr, o, B) {
  const st = [o.x0[0], o.x0[1], o.v0[0], o.v0[1]], J = [];
  for (let j = 0; j < 4; j++) {
    const h = 1e-6, a = [...st], b = [...st]; a[j] += h; b[j] -= h;
    const sa = mappa(cr, a, [a[2], a[3]], o.T, o.n, B), sb = mappa(cr, b, [b[2], b[3]], o.T, o.n, B);
    J.push([(sa.x[0] - sb.x[0]) / (2 * h), (sa.x[1] - sb.x[1]) / (2 * h), (sa.v[0] - sb.v[0]) / (2 * h), (sa.v[1] - sb.v[1]) / (2 * h)]);
  }
  return J[0][0] + J[1][1] + J[2][2] + J[3][3] - 2;
}

// i punti di un periodo (per disegnarla e per le prove)
export function punti(cr, o, B) {
  const P = [[o.x0[0], o.x0[1]]], E = [];
  const E0 = energiaDi(cr, o.x0, o.v0);
  mappa(cr, o.x0, o.v0, o.T, o.n, B, (x, v) => { P.push([x[0], x[1]]); E.push(energiaDi(cr, x, v) - E0); });
  return { P, E };
}

// il catalogo delle orbite periodiche di un cristallo piano all'energia E
export function catalogo(cr, E, B = [0, 0, 0], { semi = 40, celle = 6, radice = 'orbite', max = 24, tempoMax = Infinity } = {}) {
  const c = sorgente(radice), A = cr.A, Ar = cr.Ar, trovate = [], t0 = Date.now();
  const vmax = Math.sqrt(2 * Math.max(0.05, E + cr.U0 * 2)), dt0 = (0.1 * cr.w) / vmax;
  for (let k = 0; k < semi && trovate.length < max && Date.now() - t0 < tempoMax; k++) {
    const f = [c(`${k} x`), c(`${k} y`)], x0 = [f[0] * A[0][0] + f[1] * A[1][0], f[0] * A[0][1] + f[1] * A[1][1]];
    const V0 = cr.campo(x0[0], x0[1], 0, null); if (!(E - V0 > 0.02)) continue;
    const th0 = 2 * Math.PI * c(`${k} th`), v = Math.sqrt(2 * (E - V0)), v0 = [v * Math.cos(th0), v * Math.sin(th0)];
    const Tmax = celle / v, nmax = Math.ceil(Tmax / dt0), s = creaPallina(cr, [x0[0], x0[1], 0], [v0[0], v0[1], 0]);
    // i ritorni: per ogni passaggio vicino (entro 0,15 in posizione e 0,3 rad in direzione) il punto più vicino
    const ritorni = []; let corrente = null;
    for (let i = 1; i <= nmax; i++) {
      if (haMagnete(B)) passiBoris(cr, s, dt0, 1, B); else passiVerlet(cr, s, dt0, 1);
      if (i * dt0 < 0.25 / v) continue;
      const D = [s.x[0] - x0[0], s.x[1] - x0[1]], m = [Math.round(D[0] * Ar[0][0] + D[1] * Ar[0][1]), Math.round(D[0] * Ar[1][0] + D[1] * Ar[1][1])];
      const M = [m[0] * A[0][0] + m[1] * A[1][0], m[0] * A[0][1] + m[1] * A[1][1]], dist = Math.hypot(D[0] - M[0], D[1] - M[1]);
      const da = Math.abs(giro(Math.atan2(s.v[1], s.v[0]) - th0));
      if (dist < 0.15 && da < 0.3) { const q = dist + 0.3 * da; if (!corrente || q < corrente.q) corrente = { q, T: i * dt0, M, m, n: i }; }
      else if (corrente) { ritorni.push(corrente); corrente = null; if (ritorni.length >= 3) break; }
    }
    let o = null, migliore = null;
    for (const r of ritorni) { o = tiro(cr, E, B, x0, th0, r.T, r.M, r.n); if (o && o.T <= 1.2 * Tmax && !trovate.some((t) => Math.abs(t.T - o.T) < 1e-6)) { migliore = r; break; } o = null; }
    if (!o) continue;
    // via le librazioni: i tratti avanti e indietro tra due punti d'arresto (la velocità vi scende quasi a zero)
    { let vmin = Infinity, vsum = 0, nv = 0; mappa(cr, o.x0, o.v0, o.T, o.n, B, (x, v) => { const q = Math.hypot(v[0], v[1]); vmin = Math.min(vmin, q); vsum += q; nv++; }); if (vmin < 0.1 * (vsum / nv)) continue; }
    o.m = migliore.m; o.E = E; o.traccia = stabilita(cr, o, B); o.stabile = Math.abs(o.traccia) < 2;
    trovate.push(o);
  }
  return trovate.sort((a, b) => a.T - b.T);
}

// le orbite sorelle: le immagini di un'orbita sotto le operazioni del gruppo di un sito (solo quelle che tengono il
// piano), senza doppioni
export function sorelle(o, gruppo, sito) {
  const out = [];
  for (const g of gruppo) {
    if (Math.abs(Math.abs(g[2][2]) - 1) > 1e-9) continue;
    const d = [o.x0[0] - sito[0], o.x0[1] - sito[1]];
    const x = [sito[0] + g[0][0] * d[0] + g[0][1] * d[1], sito[1] + g[1][0] * d[0] + g[1][1] * d[1]];
    const v = [g[0][0] * o.v0[0] + g[0][1] * o.v0[1], g[1][0] * o.v0[0] + g[1][1] * o.v0[1]];
    if (out.some((q) => Math.hypot(q.x0[0] - x[0], q.x0[1] - x[1]) < 1e-9 && Math.hypot(q.v0[0] - v[0], q.v0[1] - v[1]) < 1e-9)) continue;
    out.push({ ...o, x0: x, v0: v });
  }
  return out;
}

// l'orbita nell'indirizzo: x,y,vx,vy,T,n (i numeri come String: ridanno gli stessi bit)
export const scriviOrbita = (o) => [o.x0[0], o.x0[1], o.v0[0], o.v0[1], o.T, o.n].map(String).join(',');
export const leggiOrbita = (s) => { const q = s.split(',').map(Number); return { x0: [q[0], q[1]], v0: [q[2], q[3]], T: q[4], n: q[5] }; };
