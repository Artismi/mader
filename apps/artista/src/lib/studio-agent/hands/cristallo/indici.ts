// @ts-nocheck
// portato da Cristallo (stateyour, ramo claude/pattern-cristallo): codice originale, import senza estensione
// indici.js — gli indici (hkl) della direzione n, il reticolo del piano e la frase della ripetizione.
//
// Il piano (hkl) ha per normale G = h·a* + k·b* + l·c* (a*, b*, c* i reciproci della cella convenzionale). Data n, gli
// indici sono proporzionali a (n·a, n·b, n·c).
// IL RETICOLO DEL PIANO: i vettori t del reticolo con t·G = 0. In coordinate della base primitiva t = Σ mᵢ·qᵢ, la
// condizione è c·m = 0 con cᵢ = 2·(qᵢ·(h, k, l)) intero (le coordinate frazionarie dei qᵢ sono mezzi): un nucleo
// intero di rango 2, trovato con operazioni unimodulari sulle colonne (aritmetica intera esatta), poi ridotto con
// Lagrange-Gauss. Il PERIODO è il lato più lungo della base ridotta: sulla finestra in proiezione parallela il pattern
// si ripete con quei due vettori.
// LA FRASE:
//   · n lungo (hkl), angolo sotto 10⁻¹² rad: «finestra lungo (hkl): si ripete ogni N celle», N = il periodo arrotondato
//     in su (in lati di cella a);
//   · altrimenti, per ogni piano semplice (indici fino a 9) con angolo ε da n, la finestra quasi si ripete finché il
//     piano non si è spostato di d (lo spessore della linea): per una lunghezza d/sin ε. Si sceglie il piano che ci sta
//     più volte (zona/periodo massimo, almeno 2): «finestra vicina a (hkl): si ripete quasi per N celle»;
//   · se nessuno ci sta almeno due volte: «finestra di sbieco: non si ripete».

import { punto, vettore, norma } from './reticolo';

const mcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };

export function normaleDi(hkl, cristallo) {
  const [a, b, c] = cristallo.Ar, G = [0, 1, 2].map((i) => hkl[0] * a[i] + hkl[1] * b[i] + hkl[2] * c[i]);
  const l = norma(G); return G.map((x) => x / l);
}

// tutti gli (hkl) con indici fino a M, primi tra loro, a meno del segno
export function piani(M) {
  const lista = [];
  for (let h = -M; h <= M; h++) for (let k = -M; k <= M; k++) for (let l = -M; l <= M; l++) {
    if (!h && !k && !l) continue;
    if (mcd(mcd(h, k), l) !== 1) continue;
    const primo = h !== 0 ? h : k !== 0 ? k : l; if (primo < 0) continue;
    lista.push([h, k, l]);
  }
  return lista;
}

// il nucleo intero di (c0, c1, c2): due vettori interi che lo generano
function nucleo(c) {
  const U = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], r = [...c]; // colonne di U; r = c·U
  const scambia = (i, j) => { [r[i], r[j]] = [r[j], r[i]]; [U[i], U[j]] = [U[j], U[i]]; };
  for (;;) {
    let p = -1; for (let i = 0; i < 3; i++) if (r[i] !== 0 && (p < 0 || Math.abs(r[i]) < Math.abs(r[p]))) p = i;
    if (p < 0) throw new Error('indici nulli');
    if (p !== 0) scambia(0, p);
    let finito = true;
    for (let i = 1; i < 3; i++) if (r[i] !== 0) {
      const q = Math.trunc(r[i] / r[0]); r[i] -= q * r[0]; U[i] = U[i].map((x, k) => x - q * U[0][k]);
      if (r[i] !== 0) finito = false;
    }
    if (finito) return [U[1], U[2]];
  }
}

// il reticolo del piano (hkl): base ridotta t1, t2 (nel mondo), periodo, area della tessera, distanza tra i piani
export function reticoloDelPiano(hkl, cristallo) {
  const Pf = cristallo.primitiva.map((p) => cristallo.frazionarie(p));
  const c = Pf.map((f) => Math.round(2 * (f[0] * hkl[0] + f[1] * hkl[1] + f[2] * hkl[2])));
  const [m1, m2] = nucleo(c);
  const P = cristallo.primitiva, aMondo = (m) => [0, 1, 2].map((i) => m[0] * P[0][i] + m[1] * P[1][i] + m[2] * P[2][i]);
  let t1 = aMondo(m1), t2 = aMondo(m2);
  // Lagrange-Gauss
  for (let giri = 0; giri < 100; giri++) {
    if (punto(t1, t1) > punto(t2, t2)) [t1, t2] = [t2, t1];
    const mu = Math.round(punto(t1, t2) / punto(t1, t1));
    if (mu === 0) break;
    t2 = t2.map((x, i) => x - mu * t1[i]);
  }
  if (punto(t1, t1) > punto(t2, t2)) [t1, t2] = [t2, t1];
  const area = norma(vettore(t1, t2)), Vp = Math.abs(punto(P[0], vettore(P[1], P[2])));
  return { t1, t2, periodo: norma(t2), area, distanza: Vp / area };
}

export const scriviIndici = (hkl) => `(${hkl.map((x) => (x < 0 ? `${-x}̄` : `${x}`)).join('')})`;

// la direzione n: il piano semplice, il periodo, la frase. d = lo spessore della linea (in celle)
export function descriviDirezione(n, cristallo, d = 0.01, M = 9) {
  const l = norma(n), nn = n.map((x) => x / l);
  let esatto = null;
  const candidati = [];
  for (const hkl of piani(M)) {
    const G = normaleDi(hkl, cristallo), eps = norma(vettore(G, nn)); // sin ε, senza cancellazioni
    if (eps < 1e-12 && !esatto) esatto = hkl; // (eps è sin ε)
    candidati.push({ hkl, eps });
  }
  if (esatto) {
    const r = reticoloDelPiano(esatto, cristallo), N = Math.max(1, Math.ceil(r.periodo / cristallo.parametri.a - 1e-9));
    return { esatta: true, hkl: esatto, ...r, N, frase: `finestra lungo ${scriviIndici(esatto)}: si ripete ${N === 1 ? 'a ogni cella' : `ogni ${N} celle`}` };
  }
  let migliore = null;
  for (const c of candidati) {
    if (c.eps > 0.2) continue;
    const r = reticoloDelPiano(c.hkl, cristallo), zona = d / c.eps, volte = zona / r.periodo;
    if (volte >= 2 && (!migliore || volte > migliore.volte)) migliore = { ...c, ...r, zona, volte };
  }
  if (!migliore) return { esatta: false, hkl: null, frase: 'finestra di sbieco: non si ripete' };
  const N = Math.max(1, Math.round(migliore.zona / cristallo.parametri.a));
  return { esatta: false, ...migliore, N, frase: `finestra vicina a ${scriviIndici(migliore.hkl)}: si ripete quasi per ${N} celle` };
}

// le direzioni dei piani semplici (indici fino a 2), dove il globo scatta
export function direzioniSemplici(cristallo, M = 2) {
  const lista = [];
  for (const hkl of piani(M)) {
    const G = normaleDi(hkl, cristallo);
    lista.push({ hkl, n: G }, { hkl: hkl.map((x) => -x), n: G.map((x) => -x) });
  }
  return lista;
}

