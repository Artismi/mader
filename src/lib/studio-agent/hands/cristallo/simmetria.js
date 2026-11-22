// simmetria.js — il gruppo puntuale di un sito del cristallo e la sorgente simmetrica.
//
// Ispirata a Lewis F. Day («Pattern Design», 1903): il ribaltamento (turnover, lo specchio) e la rotazione
// (turn-round). Qui non si scrivono: si TROVANO. Il gruppo del sito x₀ sono le operazioni ortogonali g (rotazioni e
// rotazioni seguite da inversione: specchi, inversione, rotoinversioni) per cui x₀ + g·(x − x₀) manda il cristallo in sé:
//   · g manda il reticolo in sé (i vettori primitivi in combinazioni intere, entro 10⁻⁶);
//   · ogni atomo va su un atomo dello stesso segno, a meno di un vettore del reticolo (entro 10⁻⁶).
// I candidati: ogni operazione puntuale di un cristallo è ±una rotazione di 2πk/n attorno a una direzione del reticolo,
// con n in {2, 3, 4, 6} (la restrizione cristallografica); si provano le direzioni con indici fino a 2 nella base
// primitiva, e anche gli ordini 5, 7, 8 per controllo (non passano mai).
// LA SORGENTE: dal sito partono N palline, con le velocità g·v₀ per tutte le g del gruppo (l'orbita di v₀, senza
// doppioni). L'insieme delle traiettorie eredita da solo gli specchi e le rotazioni del sito.

import { punto, norma, reciproci, combina } from './reticolo.js';

const ID = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const applica = (M, v) => [punto(M[0], v), punto(M[1], v), punto(M[2], v)];
function rotazione(u, th) {
  const [x, y, z] = u, c = Math.cos(th), s = Math.sin(th), C = 1 - c;
  return [[c + x * x * C, x * y * C - z * s, x * z * C + y * s], [y * x * C + z * s, c + y * y * C, y * z * C - x * s], [z * x * C - y * s, z * y * C + x * s, c + z * z * C]];
}
const uguali = (A, B, e = 1e-6) => A.every((r, i) => r.every((x, j) => Math.abs(x - B[i][j]) < e));
const intero = (x) => Math.abs(x - Math.round(x)) < 1e-6;

// le operazioni candidate (le stesse per tutti i siti di un reticolo: si tengono quelle che mandano il reticolo in sé)
const memoOps = new WeakMap();
export function operazioniDelReticolo(cr) {
  if (memoOps.has(cr)) return memoOps.get(cr);
  const P = cr.primitiva, Pr = reciproci(P), ops = [ID, ID.map((r) => r.map((x) => -x))];
  const assi = [];
  for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) for (let k = -2; k <= 2; k++) {
    if (!i && !j && !k) continue;
    const u = combina([i, j, k], P), l = norma(u), v = u.map((x) => x / l);
    if (!assi.some((a) => Math.abs(Math.abs(punto(a, v)) - 1) < 1e-9)) assi.push(v);
  }
  for (const u of assi) for (const n of [2, 3, 4, 5, 6, 7, 8]) for (let k = 1; k < n; k++) {
    const R = rotazione(u, (2 * Math.PI * k) / n);
    for (const g of [R, R.map((r) => r.map((x) => -x))]) {
      if (ops.some((o) => uguali(o, g))) continue;
      if (P.every((p) => { const q = applica(g, p); return Pr.every((r) => intero(punto(q, r))); })) ops.push(g);
    }
  }
  memoOps.set(cr, ops); return ops;
}

// il gruppo del sito x₀ (cartesiano): le operazioni che mandano anche gli atomi in sé
export function gruppoDelSito(cr, x0) {
  const ops = operazioniDelReticolo(cr), Ar = cr.Ar;
  const atomi = cr.atomi.map((a) => ({ r: a.r, s: a.s }));
  const equivalente = (x, s) => atomi.some((a) => {
    if (a.s !== s) return false;
    const d = [x[0] - a.r[0], x[1] - a.r[1], x[2] - a.r[2]];
    return Ar.every((r) => intero(punto(d, r))) || cr.centri.slice(1).some((c) => { const dc = d.map((y, i) => y - combina(c, cr.A)[i]); return Ar.every((r) => intero(punto(dc, r))); });
  });
  return ops.filter((g) => atomi.every((a) => {
    const y = applica(g, [a.r[0] - x0[0], a.r[1] - x0[1], a.r[2] - x0[2]]);
    return equivalente([x0[0] + y[0], x0[1] + y[1], x0[2] + y[2]], a.s);
  }));
}

// l'ordine di rotazione più alto del gruppo (solo le rotazioni proprie, determinante +1), e se ci sono specchi
export function descriviGruppo(gruppo) {
  let ordine = 1, specchi = 0;
  for (const g of gruppo) {
    const det = punto(g[0], [g[1][1] * g[2][2] - g[1][2] * g[2][1], g[1][2] * g[2][0] - g[1][0] * g[2][2], g[1][0] * g[2][1] - g[1][1] * g[2][0]]);
    const tr = g[0][0] + g[1][1] + g[2][2];
    if (det > 0) { const c = Math.max(-1, Math.min(1, (tr - 1) / 2)), th = Math.acos(c); if (th > 1e-6) ordine = Math.max(ordine, Math.round((2 * Math.PI) / th)); }
    else if (Math.abs(tr - 1) < 1e-6) specchi++; // uno specchio: −(rotazione di π), traccia 1
  }
  return { ordine, specchi, elementi: gruppo.length };
}

// l'orbita della direzione di lancio: le velocità g·v₀ senza doppioni (nel piano, solo quelle nel piano)
export function orbita(gruppo, v0, piano = false) {
  const out = [];
  for (const g of gruppo) {
    const v = applica(g, v0);
    if (piano && Math.abs(v[2]) > 1e-12) continue;
    if (!out.some((w) => Math.hypot(w[0] - v[0], w[1] - v[1], w[2] - v[2]) < 1e-9 * (1 + norma(v0)))) out.push(v);
  }
  return out;
}

// i siti speciali della cella: le coordinate frazionarie tra 0, 1/4, 1/3, 1/2, 2/3, 3/4 con gruppo non banale
const FRAZ = [0, 0.25, 1 / 3, 0.5, 2 / 3, 0.75];
const memoSiti = new WeakMap();
export function sitiSpeciali(cr) {
  if (memoSiti.has(cr)) return memoSiti.get(cr);
  const out = [];
  for (const a of FRAZ) for (const b of FRAZ) for (const c of (cr.piano ? [0] : FRAZ)) {
    const x = combina([a, b, c], cr.A), g = gruppoDelSito(cr, x);
    if (g.length > 1) out.push({ f: [a, b, c], x, gruppo: g, ...descriviGruppo(g) });
  }
  memoSiti.set(cr, out); return out;
}
// il sito speciale più vicino a x (anche nelle celle vicine), con la sua posizione vera
export function sitoVicino(cr, x) {
  const f = cr.frazionarie(x), base = f.map(Math.floor);
  let best = null;
  for (const s of sitiSpeciali(cr)) for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = (cr.piano ? 0 : -1); k <= (cr.piano ? 0 : 1); k++) {
    const y = combina([s.f[0] + base[0] + i, s.f[1] + base[1] + j, s.f[2] + base[2] + k], cr.A), d = Math.hypot(y[0] - x[0], y[1] - x[1], y[2] - x[2]);
    if (!best || d < best.d - 1e-12 || (Math.abs(d - best.d) < 1e-12 && s.elementi > best.sito.elementi)) best = { d, x: y, sito: s };
  }
  return best;
}
