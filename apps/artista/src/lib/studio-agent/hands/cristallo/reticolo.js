// reticolo.js — il cristallo: il reticolo di Bravais, la cella, gli atomi, il potenziale e la forza.
//
// UNITÀ: lunghezze in lati di cella (a = 1 di solito), masse in masse della pallina, energie in U₀.
//
// IL RETICOLO. Una cella convenzionale con i lati a, b, c e gli angoli α (tra b e c), β (tra a e c), γ (tra a e b),
// più la centratura: P (nessuna), I (corpo), F (facce), C, A, B (una coppia di facce), R (romboedrico, preso con gli
// assi romboedrici: la cella è già primitiva). I 7 sistemi e le loro centrature danno i 14 reticoli di Bravais:
//   triclino P · monoclino P C · ortorombico P C I F · tetragonale P I · trigonale R · esagonale P · cubico P I F.
// I vincoli di ogni sistema si impongono qui (vincola): chi li dà sbagliati ottiene quelli giusti.
// I PIANI sono cristalli sottili: la cella ha c perpendicolare e lungo (SPESSORE_PIANO), gli atomi stanno a z = 0 e la
// pallina, lanciata nel piano z = 0 con velocità nel piano, ci resta esattamente (le immagini fuori piano sono oltre
// 4w, e per quelle nel piano z − z_atomo = 0: la forza lungo z è zero al bit). I reticoli piani sono 5:
//   obliquo · rettangolare · rettangolare centrato · quadrato · esagonale.
//
// GLI ATOMI. La base: uno o più punti nella cella (coordinate frazionarie), ognuno collina (s = +1, respinge) o conca
// (s = −1, attira). La centratura li ripete: la base sta in ogni punto del reticolo.
//
// IL POTENZIALE (legge L1). V(r) = Σₙ Σᵢ sᵢ·U₀·exp(−|r − Rₙ − pᵢ|²/2w²), sommato sulle immagini entro 4w (oltre, il
// contributo è sotto exp(−8) = 3,4·10⁻⁴ U₀). Perché l'energia si conservi davvero, la gaussiana si spegne con
// dolcezza tra 3w e 4w: per ρ² tra 9w² e 16w² è moltiplicata per S(u) = 1 − 10u³ + 15u⁴ − 6u⁵, u = (ρ² − 9w²)/7w²
// (continua con le sue due derivate). Lo scarto dalla gaussiana pura è al più exp(−4,5) = 0,011 U₀, e solo nella coda.

import { sorgente } from './caso.js';

export const SPESSORE_PIANO = 10;

export const SISTEMI = {
  triclino: { centrature: ['P'], ordine: 1 },
  monoclino: { centrature: ['P', 'C'], ordine: 2 },
  ortorombico: { centrature: ['P', 'C', 'I', 'F'], ordine: 2 },
  tetragonale: { centrature: ['P', 'I'], ordine: 4 },
  trigonale: { centrature: ['R'], ordine: 3 },
  esagonale: { centrature: ['P'], ordine: 6 },
  cubico: { centrature: ['P', 'I', 'F'], ordine: 4 },
};
export const PIANI = {
  obliquo: { centrature: ['P'], ordine: 2 },
  rettangolare: { centrature: ['P', 'C'], ordine: 2 },
  quadrato: { centrature: ['P'], ordine: 4 },
  esagonale: { centrature: ['P'], ordine: 6 },
};
export const NOMI_TECNICI = {
  'triclino P': 'triclino primitivo (aP)', 'monoclino P': 'monoclino primitivo (mP)', 'monoclino C': 'monoclino a base centrata (mC)',
  'ortorombico P': 'ortorombico primitivo (oP)', 'ortorombico C': 'ortorombico a base centrata (oC)', 'ortorombico I': 'ortorombico a corpo centrato (oI)',
  'ortorombico F': 'ortorombico a facce centrate (oF)', 'tetragonale P': 'tetragonale primitivo (tP)', 'tetragonale I': 'tetragonale a corpo centrato (tI)',
  'trigonale R': 'romboedrico (hR)', 'esagonale P': 'esagonale (hP)', 'cubico P': 'cubico semplice (cP)', 'cubico I': 'cubico a corpo centrato (cI)',
  'cubico F': 'cubico a facce centrate (cF)', 'piano obliquo P': 'piano obliquo (mp)', 'piano rettangolare P': 'piano rettangolare (op)',
  'piano rettangolare C': 'piano rettangolare centrato (oc)', 'piano quadrato P': 'piano quadrato (tp)', 'piano esagonale P': 'piano esagonale (hp)',
};

export const CENTRI = {
  P: [], R: [], I: [[0.5, 0.5, 0.5]], F: [[0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0]],
  C: [[0.5, 0.5, 0]], A: [[0, 0.5, 0.5]], B: [[0.5, 0, 0.5]],
};
// una base primitiva del reticolo, in coordinate frazionarie della cella convenzionale
const PRIMITIVA = {
  P: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], R: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
  I: [[-0.5, 0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, -0.5]],
  F: [[0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0]],
  C: [[0.5, 0.5, 0], [-0.5, 0.5, 0], [0, 0, 1]],
  A: [[1, 0, 0], [0, 0.5, 0.5], [0, -0.5, 0.5]],
  B: [[0.5, 0, 0.5], [0, 1, 0], [-0.5, 0, 0.5]],
};

// coseno e seno di un angolo in gradi, esatti per gli angoli dei sistemi (90°, 120°, 60°)
export const cosG = (g) => (g === 90 ? 0 : g === 120 ? -0.5 : g === 60 ? 0.5 : Math.cos((g * Math.PI) / 180));

// impone i vincoli del sistema ai parametri (a, b, c, α, β, γ, centratura); restituisce una copia
export function vincola(p) {
  const q = { ...p }, piano = !!q.piano;
  const tabella = piano ? PIANI : SISTEMI;
  if (!tabella[q.sistema]) throw new Error(`sistema sconosciuto: ${q.sistema}`);
  if (!tabella[q.sistema].centrature.includes(q.centratura)) q.centratura = tabella[q.sistema].centrature[0];
  q.a = q.a ?? 1; q.b = q.b ?? q.a; q.c = q.c ?? q.a; q.alfa = q.alfa ?? 90; q.beta = q.beta ?? 90; q.gamma = q.gamma ?? 90;
  if (piano) {
    q.c = SPESSORE_PIANO; q.alfa = 90; q.beta = 90;
    if (q.sistema === 'rettangolare') q.gamma = 90;
    if (q.sistema === 'quadrato') { q.b = q.a; q.gamma = 90; }
    if (q.sistema === 'esagonale') { q.b = q.a; q.gamma = 120; }
    return q;
  }
  switch (q.sistema) {
    case 'cubico': q.b = q.c = q.a; q.alfa = q.beta = q.gamma = 90; break;
    case 'tetragonale': q.b = q.a; q.alfa = q.beta = q.gamma = 90; break;
    case 'ortorombico': q.alfa = q.beta = q.gamma = 90; break;
    case 'esagonale': q.b = q.a; q.alfa = q.beta = 90; q.gamma = 120; break;
    case 'trigonale': q.b = q.c = q.a; q.beta = q.gamma = q.alfa; break;
    case 'monoclino': q.alfa = q.gamma = 90; break;
    default: break;
  }
  return q;
}

// i tre vettori della cella (righe) dai parametri: a lungo x, b nel piano xy
export function vettoriCella(p) {
  const ca = cosG(p.alfa), cb = cosG(p.beta), cg = cosG(p.gamma), sg = Math.sqrt(1 - cg * cg);
  const cy = (ca - cb * cg) / sg, cz2 = 1 - cb * cb - cy * cy;
  if (!(cz2 > 1e-9)) throw new Error('angoli impossibili: la cella è piatta');
  return [[p.a, 0, 0], [p.b * cg, p.b * sg, 0], [p.c * cb, p.c * cy, p.c * Math.sqrt(cz2)]];
}

// ---------- algebra minima
export const punto = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
export const vettore = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
export const norma = (u) => Math.sqrt(punto(u, u));
export const versore = (u) => { const l = norma(u); return [u[0] / l, u[1] / l, u[2] / l]; };
export const combina = (f, A) => [f[0] * A[0][0] + f[1] * A[1][0] + f[2] * A[2][0], f[0] * A[0][1] + f[1] * A[1][1] + f[2] * A[2][1], f[0] * A[0][2] + f[1] * A[1][2] + f[2] * A[2][2]];
// i vettori reciproci (a*·a = 1, senza 2π): le coordinate frazionarie di r sono r·a*, r·b*, r·c*
export function reciproci(A) {
  const V = punto(A[0], vettore(A[1], A[2]));
  return [vettore(A[1], A[2]).map((x) => x / V), vettore(A[2], A[0]).map((x) => x / V), vettore(A[0], A[1]).map((x) => x / V)];
}

// ---------- il cristallo
// opzioni: { sistema, centratura, a, b, c, alfa, beta, gamma, piano, atomi: [{ p: [u, v, w], s: ±1 }], U0, w,
//            T (temperatura in U₀), difetti (probabilità che un atomo manchi), radice (indirizzo della fonte del caso) }
export function creaCristallo(opzioni) {
  const par = vincola(opzioni);
  const A = vettoriCella(par), Ar = reciproci(A), V = Math.abs(punto(A[0], vettore(A[1], A[2])));
  const U0 = opzioni.U0 ?? 1, w = opzioni.w ?? 0.15, wMax = Math.max(w, ...(opzioni.atomi ?? []).map((x) => x.w ?? 0)), rc = 4 * wMax;
  const centri = [[0, 0, 0], ...CENTRI[par.centratura]];
  const primitiva = PRIMITIVA[par.centratura].map((f) => combina(f, A));
  const piano = !!par.piano;
  // la base ripetuta dalla centratura: gli atomi della cella convenzionale (frazionari in [0, 1))
  // (s è il segno, ±1; un'«ampiezza» facoltativa, reale, ne fa un'altezza qualunque: la usa il passo inverso)
  // (e una larghezza «w» facoltativa per atomo: senza, vale la w del cristallo)
  const base = (opzioni.atomi ?? [{ p: [0, 0, 0], s: 1 }]).map((x) => ({ p: [...x.p], s: x.ampiezza ?? (x.s < 0 ? -1 : 1), w: x.w ?? null }));
  const atomi = [];
  base.forEach((at, i) => centri.forEach((cc, j) => {
    const f = [0, 1, 2].map((k) => { const x = at.p[k] + cc[k]; return x - Math.floor(x); });
    if (piano) f[2] = 0;
    atomi.push({ f, r: combina(f, A), s: at.s, i, j, w: at.w ?? w });
  }));
  // le immagini che possono stare entro 4w da un punto della cella: in coordinate frazionarie, il margine lungo
  // l'asse k è rc·|a*ₖ| (una distanza rc cambia la coordinata k al più di tanto)
  const margine = Ar.map((x) => rc * norma(x));
  const imm = [];
  for (const at of atomi) {
    const lim = [0, 1, 2].map((k) => [Math.floor(-margine[k] - at.f[k]) , Math.ceil(1 + margine[k] - at.f[k])]);
    for (let i = lim[0][0]; i <= lim[0][1]; i++) for (let j = lim[1][0]; j <= lim[1][1]; j++) for (let k = lim[2][0]; k <= lim[2][1]; k++) {
      const f = [at.f[0] + i, at.f[1] + j, at.f[2] + k];
      if (f.some((x, q) => x < -margine[q] || x > 1 + margine[q])) continue;
      const r = combina(f, A);
      imm.push({ r, s: at.s, w: at.w, cella: [i, j, k], atomo: atomi.indexOf(at) });
    }
  }
  const nI = imm.length, Q = new Float64Array(4 * nI);
  imm.forEach((m, q) => { Q[4 * q] = m.r[0]; Q[4 * q + 1] = m.r[1]; Q[4 * q + 2] = m.r[2]; Q[4 * q + 3] = m.s * U0; });
  // le costanti della gaussiana di ogni immagine (la sua w): 9w², 16w², 7w², 1/2w², per indice 4q
  const KW = new Float64Array(4 * nI); imm.forEach((m, q) => { const w2 = m.w * m.w; KW[4 * q] = 9 * w2; KW[4 * q + 1] = 16 * w2; KW[4 * q + 2] = 7 * w2; KW[4 * q + 3] = 1 / (2 * w2); });

  // LE VIBRAZIONI (punto 4). Ogni atomo di ogni cella ha il suo spostamento, una campana per componente con
  // ⟨uₓ²⟩ = (T/U₀)·(0,1 a)²: alla temperatura T = U₀ lo spostamento tipico è un decimo di cella (la regola di
  // Lindemann: il cristallo fonde quando le vibrazioni arrivano a circa un decimo della distanza tra gli atomi).
  // Gli esiti vengono dalla fonte del caso con l'indirizzo «radice/vibra/i,j,k/atomo»: sempre gli stessi.
  // Un atomo manca (difetto) se l'esito «manca» è sotto la probabilità dichiarata.
  const T = opzioni.T ?? 0, difetti = opzioni.difetti ?? 0, sigma = 0.1 * par.a * Math.sqrt(Math.max(T, 0));
  const caldo = T > 0 || difetti > 0;
  const fonte = caldo ? sorgente(`${opzioni.radice ?? 'cristallo'}/vibra`) : null;
  const memo = new Map();
  function spostamento(I, J, K, atomo) {
    const chiave = `${I},${J},${K}/${atomo}`;
    let u = memo.get(chiave);
    if (u) return u;
    const c = fonte.sotto(chiave), uu = [sigma * c.normale('x'), sigma * c.normale('y'), piano ? 0 : sigma * c.normale('z')];
    u = { u: uu, manca: difetti > 0 && c('manca') < difetti };
    if (memo.size > 200000) memo.clear();
    memo.set(chiave, u); return u;
  }
  // le immagini spostate per la cella (I, J, K) in cui si trova il punto: si rifanno solo quando la cella cambia
  let QT = Q, cI = NaN, cJ = NaN, cK = NaN;
  function immaginiPer(I, J, K) {
    if (I === cI && J === cJ && K === cK) return QT;
    cI = I; cJ = J; cK = K;
    QT = new Float64Array(4 * nI);
    for (let q = 0; q < nI; q++) {
      const m = imm[q], sp = spostamento(I + m.cella[0], J + m.cella[1], K + m.cella[2], m.atomo);
      QT[4 * q] = Q[4 * q] + sp.u[0]; QT[4 * q + 1] = Q[4 * q + 1] + sp.u[1]; QT[4 * q + 2] = Q[4 * q + 2] + sp.u[2];
      QT[4 * q + 3] = sp.manca ? 0 : Q[4 * q + 3];
    }
    return QT;
  }

  // LE SCATOLE: la cella si divide in 4 × 4 × 4 scatole (nel piano 4 × 4 × 1); per ognuna si tengono solo le immagini
  // che possono stare entro 4w da un suo punto (più 6σ per le vibrazioni: uno spostamento più grande capita a un
  // atomo su 10⁹). È solo un modo più svelto di fare la stessa somma.
  const SB = 4, SBz = piano ? 1 : 4, extra = 6 * sigma, indici = [], inizio = new Int32Array(SB * SB * SBz + 1);
  for (let a = 0; a < SB; a++) for (let b = 0; b < SB; b++) for (let c = 0; c < SBz; c++) {
    const centro = combina([(a + 0.5) / SB, (b + 0.5) / SB, (c + 0.5) / SBz], A);
    let raggio = 0;
    for (const sa of [0, 1]) for (const sb of [0, 1]) for (const sc of [0, 1]) {
      const v = combina([(a + sa) / SB, (b + sb) / SB, (c + sc) / SBz], A);
      raggio = Math.max(raggio, Math.hypot(v[0] - centro[0], v[1] - centro[1], v[2] - centro[2]));
    }
    const lim = rc + raggio + extra, k = (a * SB + b) * SBz + c;
    inizio[k] = indici.length;
    for (let q = 0; q < nI; q++) if (Math.hypot(Q[4 * q] - centro[0], Q[4 * q + 1] - centro[1], Q[4 * q + 2] - centro[2]) < lim) indici.push(4 * q);
    inizio[k + 1] = indici.length;
  }
  const lista = Int32Array.from(indici);

  const a0 = Ar[0], a1 = Ar[1], a2 = Ar[2], A0 = A[0], A1 = A[1], A2 = A[2];
  // V e −∇V in r; se F è dato vi scrive la forza. Il punto si porta nella cella (r mod reticolo), poi si somma.
  function campo(x, y, z, F) {
    let f0 = x * a0[0] + y * a0[1] + z * a0[2], f1 = x * a1[0] + y * a1[1] + z * a1[2], f2 = x * a2[0] + y * a2[1] + z * a2[2];
    const I = Math.floor(f0), J = Math.floor(f1), K = Math.floor(f2);
    f0 -= I; f1 -= J; f2 -= K;
    const px = f0 * A0[0] + f1 * A1[0] + f2 * A2[0], py = f0 * A0[1] + f1 * A1[1] + f2 * A2[1], pz = f0 * A0[2] + f1 * A1[2] + f2 * A2[2];
    const q = caldo ? immaginiPer(I, J, K) : Q;
    const ka = Math.min(SB - 1, Math.floor(f0 * SB)), kb = Math.min(SB - 1, Math.floor(f1 * SB)), kc = Math.min(SBz - 1, Math.floor(f2 * SBz));
    const kk = (ka * SB + kb) * SBz + kc, fine = inizio[kk + 1];
    let Vt = 0, Fx = 0, Fy = 0, Fz = 0;
    for (let t = inizio[kk]; t < fine; t++) {
      const i = lista[t];
      const dx = px - q[i], dy = py - q[i + 1], dz = pz - q[i + 2], r2 = dx * dx + dy * dy + dz * dz;
      const g9 = KW[i], g16 = KW[i + 1], g7 = KW[i + 2], mezzoW2 = KW[i + 3];
      if (r2 >= g16) continue;
      const g = q[i + 3] * Math.exp(-r2 * mezzoW2);
      let v, dv; // V di questa immagine e dV/dρ²
      if (r2 <= g9) { v = g; dv = -g * mezzoW2; } else {
        const u = (r2 - g9) / g7, u2 = u * u, S = 1 - u * u2 * (10 - 15 * u + 6 * u2), dS = (-30 * u2 * (1 - u) * (1 - u)) / g7;
        v = g * S; dv = -g * mezzoW2 * S + g * dS;
      }
      Vt += v; Fx -= 2 * dx * dv; Fy -= 2 * dy * dv; Fz -= 2 * dz * dv;
    }
    if (F) { F[0] = Fx; F[1] = Fy; F[2] = Fz; }
    return Vt;
  }
  // la cella (indici interi) e le coordinate frazionarie di un punto
  const frazionarie = (r) => [punto(r, a0), punto(r, a1), punto(r, a2)];

  return {
    parametri: par, A, Ar, V, U0, w, T, difetti, piano, base, atomi, centri, primitiva,
    immagini: nI, perScatola: lista.length / (SB * SB * SBz), campo, frazionarie, nome: `${piano ? 'piano ' : ''}${par.sistema} ${par.centratura}`,
  };
}

// ---------- il 🎲 del reticolo: sistema, centratura e parametri dentro i vincoli, dalla fonte del caso
// Lati b/a e c/a tra 0,7 e 1,5; gli angoli liberi tra 60° e 120° (il romboedrico tra 50° e 110°, non 90°), riprovando
// con un nuovo esito («prova k») se la cella esce piatta. Il sistema è uno dei 7 con la stessa probabilità.
export function reticoloACaso(c, piano = false) {
  const tabella = piano ? PIANI : SISTEMI, nomi = Object.keys(tabella);
  const sistema = nomi[c.intero('sistema', nomi.length)], cent = tabella[sistema].centrature;
  const centratura = cent[c.intero('centratura', cent.length)];
  for (let k = 0; ; k++) {
    const d = c.sotto(`prova ${k}`);
    const p = vincola({ sistema, centratura, piano, a: 1, b: d.tra('b', 0.7, 1.5), c: d.tra('c', 0.7, 1.5),
      alfa: sistema === 'trigonale' ? d.tra('alfa', 50, 110) : d.tra('alfa', 60, 120), beta: d.tra('beta', 60, 120), gamma: d.tra('gamma', 60, 120) });
    try { vettoriCella(p); return p; } catch { /* cella piatta: si riprova */ }
  }
}
