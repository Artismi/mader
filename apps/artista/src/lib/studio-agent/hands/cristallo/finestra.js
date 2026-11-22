// finestra.js — la finestra tangente alla sfera e ciò che vi si vede (punto 1b).
//
// La finestra si fissa con il centro C, il raggio R, la direzione n (versore), la rotazione ψ attorno all'asse, il
// lato L. Il suo baricentro è P₀ = C + R·n; il suo piano è tangente alla sfera in P₀, quindi l'asse (la perpendicolare
// per P₀) passa per C e la distanza del piano da C è R.
//
// LA VISTA PRINCIPALE È LA PROSPETTIVA. L'occhio sta in P₀ e guarda verso C lungo l'asse; il piano della finestra è
// il piano dell'immagine. Nel riferimento della finestra (e₁, e₂ nel piano, k = −n verso C), un punto con coordinate
// (u, v) nel piano e profondità z dall'occhio va sull'immagine in X = f·u/z, Y = f·v/z, con f = R: un oggetto alla
// distanza di C si vede in grandezza vera. Si vede:
//   · ciò che sta davanti alla finestra tra la profondità z₁ = max(R/4, R − D) e z₂ = min(2R, R + D), con D la
//     profondità dichiarata (3 celle se non detta): da dentro il cristallo si vede fino a 2R, da lontano una lastra
//     spessa 2D attorno a C;
//   · entro il campo visivo |X|, |Y| ≤ L/2 (il mezzo angolo è atan(L/2R));
//   · con la luminosità (R/z)², al più 1: le linee lontane si attenuano come la luce di una lampadina.
// IL LIMITE R → ∞ (R = Infinity) è la proiezione parallela, X = u, Y = v, della lastra |z − R| ≤ D attorno a C: lì la
// ripetizione del reticolo sull'immagine è esatta; in prospettiva le file convergono verso i punti di fuga, che sono
// le immagini f·(t·e₁, t·e₂)/(t·k) delle direzioni t del reticolo.
// LA LASTRA (modalità secondaria, quella della sezione): i tratti con |(x − P₀)·n| ≤ h/2 proiettati in parallelo sul
// piano della finestra (con R = ∞ il piano passa per C). Con h piccolo si vedono punti e trattini.
//
// Ogni tratto si taglia ESATTAMENTE sui bordi del volume visibile (un poliedro convesso: sei semispazi a·p ≤ b), e la
// prospettiva manda rette in rette: l'immagine resta una polilinea vera.

import { punto, vettore, versore, combina } from './reticolo.js';

export const PROFONDITA = 3;      // D, in celle
export const MAX_COPIE = 4000;    // le copie della tessera, al più, ordinate per distanza dall'occhio
export const MAX_TRATTI = 1000000; // i tratti disegnati, al più: oltre, le copie più lontane si lasciano fuori

// i due versori nel piano: e₁ viene dall'asse x (o y, se n gli è quasi parallela), ruotato di ψ attorno all'asse
export function assiFinestra(n, psi) {
  const k = [-n[0], -n[1], -n[2]];
  const rif = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const a = punto(rif, n), b0 = versore([rif[0] - a * n[0], rif[1] - a * n[1], rif[2] - a * n[2]]);
  const b1 = vettore(k, b0); // (b0, b1, k) destrorsa
  const c = Math.cos(psi), s = Math.sin(psi);
  const e1 = [c * b0[0] + s * b1[0], c * b0[1] + s * b1[1], c * b0[2] + s * b1[2]];
  const e2 = [-s * b0[0] + c * b1[0], -s * b0[1] + c * b1[1], -s * b0[2] + c * b1[2]];
  return { e1, e2, k };
}

// la finestra: { C, R, n, psi, L, D, h, modo: 'prospettiva' | 'lastra' }
export function creaFinestra(o) {
  const n = versore(o.n), C = [...o.C], R = o.R, L = o.L ?? 4, D = o.D ?? PROFONDITA, h = o.h ?? 0.3, psi = o.psi ?? 0;
  const modo = o.modo ?? 'prospettiva', parallela = !Number.isFinite(R) || modo === 'lastra';
  // l'aspetto (altezza/larghezza dell'immagine) serve solo allo schermo: L è la larghezza, L·aspetto l'altezza
  const asp = o.aspetto ?? 1;
  const { e1, e2, k } = assiFinestra(n, psi);
  const P0 = Number.isFinite(R) ? [C[0] + R * n[0], C[1] + R * n[1], C[2] + R * n[2]] : null;
  // coordinate della finestra, misurate da C: u = (x − C)·e₁, v = (x − C)·e₂, z = (x − C)·k (z = 0 su C, z = −R sull'occhio)
  const L2 = L / 2, H2 = (L * asp) / 2;
  let piani, z1 = 0, z2 = 0;
  if (modo === 'lastra') {
    const zc = Number.isFinite(R) ? -R : 0; // il piano della finestra
    piani = [[1, 0, 0, L2], [-1, 0, 0, L2], [0, 1, 0, H2], [0, -1, 0, H2], [0, 0, 1, zc + h / 2], [0, 0, -1, -(zc - h / 2)]];
  } else if (parallela) {
    piani = [[1, 0, 0, L2], [-1, 0, 0, L2], [0, 1, 0, H2], [0, -1, 0, H2], [0, 0, 1, D], [0, 0, -1, D]];
  } else {
    // profondità dall'occhio z_occhio = R + z; |u| ≤ (L/2)·z_occhio/R  →  R·u − (L/2)·z ≤ (L/2)·R
    z1 = Math.max(R / 4, R - D); z2 = Math.min(2 * R, R + D);
    piani = [[R, 0, -L2, L2 * R], [-R, 0, -L2, L2 * R], [0, R, -H2, H2 * R], [0, -R, -H2, H2 * R], [0, 0, -1, R - z1], [0, 0, 1, z2 - R]];
  }
  const f = {
    C, R, n, psi, L, D, h, modo, parallela, aspetto: asp, e1, e2, k, P0, piani, z1, z2,
    // dal mondo alle coordinate della finestra
    aFinestra: (x) => { const d = [x[0] - C[0], x[1] - C[1], x[2] - C[2]]; return [punto(d, e1), punto(d, e2), punto(d, k)]; },
    // dalle coordinate della finestra all'immagine [X, Y, luminosità]
    proietta: (u, v, z) => {
      if (parallela) return [u, v, 1];
      const ze = R + z, s = R / ze; return [u * s, v * s, Math.min(1, s * s)];
    },
    // il punto di fuga della direzione t (mondo): dove va l'immagine di x + λt per λ → ∞ (null se t è parallela al piano)
    fuga: (t) => { const tz = punto(t, k); if (parallela || !(tz > 1e-12)) return null; return [(R * punto(t, e1)) / tz, (R * punto(t, e2)) / tz]; },
    // dal punto dell'immagine al punto del mondo sul piano per C (dove nasce il lancio)
    dallImmagine: (X, Y) => [C[0] + X * e1[0] + Y * e2[0], C[1] + X * e1[1] + Y * e2[1], C[2] + X * e1[2] + Y * e2[2]],
  };
  // gli otto vertici del volume visibile, nel mondo
  const vert = [];
  for (const zz of modo === 'lastra' ? [(Number.isFinite(R) ? -R : 0) - h / 2, (Number.isFinite(R) ? -R : 0) + h / 2] : parallela ? [-D, D] : [z1 - R, z2 - R]) {
    const m = parallela ? 1 : (R + zz) / R;
    for (const su of [-1, 1]) for (const sv of [-1, 1]) {
      const u = su * m * L2, v = sv * m * H2;
      vert.push([C[0] + u * e1[0] + v * e2[0] + zz * k[0], C[1] + u * e1[1] + v * e2[1] + zz * k[1], C[2] + u * e1[2] + v * e2[2] + zz * k[2]]);
    }
  }
  f.vertici = vert;
  return f;
}

// taglia il tratto p→q (coordinate della finestra) con i semispazi: restituisce [t0, t1] o null (Liang–Barsky)
export function taglia(piani, px, py, pz, qx, qy, qz) {
  let t0 = 0, t1 = 1;
  const dx = qx - px, dy = qy - py, dz = qz - pz;
  for (let i = 0; i < piani.length; i++) {
    const a = piani[i], den = a[0] * dx + a[1] * dy + a[2] * dz, num = a[3] - (a[0] * px + a[1] * py + a[2] * pz);
    if (den === 0) { if (num < 0) return null; continue; }
    const t = num / den;
    if (den > 0) { if (t < t1) t1 = t; } else if (t > t0) t0 = t;
    if (t0 > t1) return null;
  }
  return [t0, t1];
}

// le copie della cella che toccano il volume visibile: traslazioni intere (i, j, k) della cella convenzionale, ordinate
// per distanza dall'occhio (o da C, in parallelo), al più MAX_COPIE
export function copieVisibili(finestra, cristallo, max = MAX_COPIE) {
  const { A } = cristallo, fr = finestra.vertici.map((x) => cristallo.frazionarie(x));
  const lo = [0, 1, 2].map((k) => Math.floor(Math.min(...fr.map((f) => f[k]))) - 1);
  const hi = [0, 1, 2].map((k) => Math.ceil(Math.max(...fr.map((f) => f[k]))));
  if (cristallo.piano) { lo[2] = 0; hi[2] = 0; }
  const angoli = [];
  for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) for (let c = 0; c < 2; c++) angoli.push(finestra.aFinestra(combina([a, b, c], A)).map((x, i) => x + finestra.aFinestra([0, 0, 0])[i] * -1));
  // (angoli: i vertici della cella come spostamenti nel riferimento della finestra)
  const o0 = finestra.aFinestra([0, 0, 0]), piani = finestra.piani, lista = [];
  const volume = (hi[0] - lo[0] + 1) * (hi[1] - lo[1] + 1) * (hi[2] - lo[2] + 1);
  if (volume > 4e6) return lista; // (una finestra assurda: niente copie)
  // la tessera è ripiegata nella cella convenzionale; le sue copie stanno nei nodi del reticolo vero, cioè nelle celle
  // e, per i reticoli centrati, anche nei punti di centratura di ogni cella
  for (let i = lo[0]; i <= hi[0]; i++) for (let j = lo[1]; j <= hi[1]; j++) for (let kk = lo[2]; kk <= hi[2]; kk++) for (const cc of cristallo.centri) {
    if (cristallo.piano && cc[2] !== 0) continue;
    const fT = [i + cc[0], j + cc[1], kk + cc[2]], T = combina(fT, A), o = finestra.aFinestra(T);
    let fuori = false;
    for (const a of piani) {
      let tutti = true;
      for (const c of angoli) if (a[0] * (o[0] + c[0]) + a[1] * (o[1] + c[1]) + a[2] * (o[2] + c[2]) <= a[3]) { tutti = false; break; }
      if (tutti) { fuori = true; break; }
    }
    if (fuori) continue;
    const centro = finestra.aFinestra(combina([fT[0] + 0.5, fT[1] + 0.5, fT[2] + 0.5], A));
    const dist = finestra.parallela ? Math.abs(centro[2]) : (finestra.R + centro[2]);
    lista.push({ T, cella: fT, o: [o[0] - o0[0], o[1] - o0[1], o[2] - o0[2]], dist });
  }
  lista.sort((p, q) => p.dist - q.dist);
  return lista.slice(0, max);
}

// IL PROIETTORE: tiene la finestra, le copie e i tratti (della tessera o del viaggio) già portati nel riferimento della
// finestra; a ogni chiamata proietta i tratti nuovi su tutte le copie e restituisce i tratti dell'immagine,
// [X1, Y1, X2, Y2, luminosità, velocità] per tratto, in doppia precisione (la polilinea resta esatta). Con «copie: false» c'è una copia sola, quella con T = 0 (il viaggio).
export function creaProiettore(finestra, cristallo, conCopie = true, maxTratti = MAX_TRATTI) {
  const o0 = finestra.aFinestra([0, 0, 0]);
  const copie = conCopie ? copieVisibili(finestra, cristallo) : [{ T: [0, 0, 0], o: [0, 0, 0], dist: 0 }];
  const piani = finestra.piani, { e1, e2, k } = finestra;
  const P = { finestra, copie, fatti: 0, emessi: 0, pieno: false, maxTratti };
  // proietta i tratti [da, a) di s (6 numeri per tratto, nel mondo) con le loro velocità; scrive in un Float32Array
  P.proietta = (s, vel, da, a) => {
    const n = a - da; if (n <= 0 || P.pieno) return new Float64Array(0);
    // nel riferimento della finestra, rispetto all'origine del mondo
    const w = new Float64Array(6 * n);
    for (let i = 0; i < n; i++) {
      const b = 6 * (da + i);
      for (let e = 0; e < 2; e++) {
        const x = s[b + 3 * e], y = s[b + 3 * e + 1], z = s[b + 3 * e + 2];
        w[6 * i + 3 * e] = x * e1[0] + y * e1[1] + z * e1[2] + o0[0];
        w[6 * i + 3 * e + 1] = x * e2[0] + y * e2[1] + z * e2[2] + o0[1];
        w[6 * i + 3 * e + 2] = x * k[0] + y * k[1] + z * k[2] + o0[2];
      }
    }
    // a blocchi di 64 tratti, con la scatola che li contiene: un blocco tutto fuori da un piano si salta
    const B = 64, nb = Math.ceil(n / B), box = new Float64Array(6 * nb);
    for (let b = 0; b < nb; b++) {
      let m0 = Infinity, m1 = Infinity, m2 = Infinity, M0 = -Infinity, M1 = -Infinity, M2 = -Infinity;
      for (let i = b * B; i < Math.min(n, (b + 1) * B); i++) for (let e = 0; e < 2; e++) {
        const x = w[6 * i + 3 * e], y = w[6 * i + 3 * e + 1], z = w[6 * i + 3 * e + 2];
        if (x < m0) m0 = x; if (x > M0) M0 = x; if (y < m1) m1 = y; if (y > M1) M1 = y; if (z < m2) m2 = z; if (z > M2) M2 = z;
      }
      box.set([m0, m1, m2, M0, M1, M2], 6 * b);
    }
    let out = new Float64Array(6 * Math.min(n * 4 + 64, 1 << 20)), m = 0;
    const metti = (X1, Y1, X2, Y2, l, v) => {
      if (m + 6 > out.length) { const q = new Float64Array(out.length * 2); q.set(out); out = q; }
      out[m] = X1; out[m + 1] = Y1; out[m + 2] = X2; out[m + 3] = Y2; out[m + 4] = l; out[m + 5] = v; m += 6;
    };
    const proietta = finestra.proietta;
    for (const c of copie) {
      const ox = c.o[0], oy = c.o[1], oz = c.o[2];
      for (let b = 0; b < nb; b++) {
        let salta = false, dentro = true;
        for (const a of piani) {
          const mn = a[0] * (a[0] > 0 ? box[6 * b] : box[6 * b + 3]) + a[1] * (a[1] > 0 ? box[6 * b + 1] : box[6 * b + 4]) + a[2] * (a[2] > 0 ? box[6 * b + 2] : box[6 * b + 5]) + a[0] * ox + a[1] * oy + a[2] * oz;
          const mx = a[0] * (a[0] > 0 ? box[6 * b + 3] : box[6 * b]) + a[1] * (a[1] > 0 ? box[6 * b + 4] : box[6 * b + 1]) + a[2] * (a[2] > 0 ? box[6 * b + 5] : box[6 * b + 2]) + a[0] * ox + a[1] * oy + a[2] * oz;
          if (mn > a[3]) { salta = true; break; }
          if (mx > a[3]) dentro = false;
        }
        if (salta) continue;
        for (let i = b * B; i < Math.min(n, (b + 1) * B); i++) {
          const j = 6 * i;
          let px = w[j] + ox, py = w[j + 1] + oy, pz = w[j + 2] + oz, qx = w[j + 3] + ox, qy = w[j + 4] + oy, qz = w[j + 5] + oz;
          if (!dentro) {
            const t = taglia(piani, px, py, pz, qx, qy, qz);
            if (!t) continue;
            const dx = qx - px, dy = qy - py, dz = qz - pz;
            if (t[1] < 1) { qx = px + t[1] * dx; qy = py + t[1] * dy; qz = pz + t[1] * dz; }
            if (t[0] > 0) { px += t[0] * dx; py += t[0] * dy; pz += t[0] * dz; }
          }
          const A1 = proietta(px, py, pz), A2 = proietta(qx, qy, qz);
          metti(A1[0], A1[1], A2[0], A2[1], 0.5 * (A1[2] + A2[2]), vel[da + i]);
        }
        if (P.emessi + m / 6 > maxTratti) { P.pieno = true; break; }
      }
      if (P.pieno) break;
    }
    P.emessi += m / 6; P.fatti = a;
    return out.subarray(0, m);
  };
  return P;
}
