// molecole_forze.js — LE FORZE TRA MOLECOLE E DENTRO: un campo di forze generale per tutti gli elementi, i polimeri,
// la grana grossa, la scena in tre dimensioni (vedi molecole.js per l'intestazione).
//
// IL CAMPO DI FORZE (forma di UFF: Rappé, Casewit, Colwell, Goddard e Skiff 1992, J. Am. Chem. Soc. 114, 10024):
//   · legami: molle, k = 664,12·Z*a·Z*b / r³ kcal/mol/Å² (Z*: la carica efficace di UFF, dato per elemento);
//   · angoli: molla sul coseno, con la costante di UFF K = 664,12·Z*a·Z*c/r_ac⁵·r_ab·r_bc·[3·r_ab·r_bc·(1 − cos²θ0) − r_ac²·cos θ0];
//   · torsioni: ½V·(1 + cos 3φ) tra due atomi tetraedrici (V = √(Vi·Vj), dato per elemento), ½V·(1 − cos 2φ) tra due
//     atomi piani (V = 5·√(Ui·Uj)·(1 + 4,18·ln ordine), U = 2 kcal/mol nel secondo periodo: il legame peptidico ha ordine 1,41);
//   · dispersione e ingombro (London, Pauli): Lennard-Jones 12-6 con distanza e profondità di UFF, media geometrica;
//   · elettrostatica: cariche parziali da incrementi di legame, δ = κ·(χb − χa)/(Ja + Jb), con χ e J (elettronegatività e
//     durezza) di Rappé e Goddard 1991, divisi per (n_a·n_b)^¼ (n: i legami polari dell'atomo: saturazione) e κ = 3,1 TARATO
//     perché l'acqua abbia le cariche del modello TIP3P (−0,83/+0,42);
//     più le cariche formali. Il LEGAME A IDROGENO non è un termine a parte: è l'attrazione tra un idrogeno su N od O
//     (che non ha quasi nuvola: raggio ridotto) e una coppia solitaria;
//   · IN ACQUA (solvente implicito, dichiarato): la costante dielettrica cresce con la distanza (ε = 8r, fino a 78);
//     EFFETTO IDROFOBICO: due atomi apolari a contatto (meno di 4,5 Å, sfumato fino a 6,5) guadagnano 0,74 kJ/mol: è
//     l'energia di trasferimento di un CH2 dall'acqua all'olio (3,7 kJ/mol: Tanford 1980) divisa per i suoi ~10 vicini
//     contati una volta; un atomo polare coperto da atomi apolari perde invece la sua acqua (+0,5 kJ/mol per contatto
//     [PARAMETRO LIBERO]).
// Dà: energia e forze di una configurazione (forze), un passo di minimizzazione (minimizza) o di dinamica di Langevin
// (passo, con gli urti del solvente presi da una sorgente di eventi). Non è fatto per dinamiche lunghe.
// Unità: Å, kJ/mol, kJ/mol/Å, fs, u.

import { CONDENSAZIONE_MISURATA } from './molecole_pozzi.js';
import { atomo } from './molecole_atomi.js';
import { molecola, grezzo, chiave, anelli, viciniSigma, speculare, stereoisomeri } from './molecole_grafo.js';
import { forma, dominio, lunghezzaLegame } from './molecole_forma.js';
import { energia, sitiAcidoBase, speciazione, alPH, idratazione, inOlio, R } from './molecole_energia.js';
import { numero } from './eventi.js';

const KCAL = 4.184, COULOMB = 1389.35, KAPPA = 3.1;
// mette insieme più forme (ognuna con una rotazione/traslazione, se si vuole) in una configurazione sola
export function insieme(forme, sposta = []) {
  const Z = [], legami = [], pos = [], parti = [], cariche = [];
  forme.forEach((f0, q) => { const f = f0.pos ? f0 : forma(f0), d = Z.length, t = sposta[q] || [0, 0, 0];
    for (let i = 0; i < f.n; i++) { Z.push(f.Z[i]); pos.push(f.pos[3 * i] + t[0], f.pos[3 * i + 1] + t[1], f.pos[3 * i + 2] + t[2]); }
    for (const [a, b, o] of f.legami) legami.push([a + d, b + d, o]);
    const qf = cariche_(f); for (const x of qf) cariche.push(x);
    parti.push({ nome: f.m ? chiave(f.m) : `parte ${q}`, da: d, a: Z.length }); });
  return { n: Z.length, Z, pos: Float64Array.from(pos), legami, parti, cariche: Float64Array.from(cariche), piani: forme.flatMap((f0) => { const f = f0.pos ? f0 : forma(f0); return f.Z.map((_, i) => (i < f.m.atomi.length ? dominio(f.m, i).sn : 1)); }) };
}
// le cariche parziali di una forma: incrementi di legame + cariche formali
function cariche_(f) {
  const q = new Float64Array(f.n); if (f.m) f.m.atomi.forEach((a, k) => { q[k] += a.q; });
  // (saturazione: un atomo che cede elettroni a più vicini insieme ne cede meno a ciascuno — la sua elettronegatività sale mentre si
  // carica —: ogni incremento è diviso per la radice quarta del prodotto dei legami polari dei due atomi)
  const polari = new Uint8Array(f.n); for (const [a, b, o] of f.legami) if (o && f.Z[a] !== f.Z[b]) { polari[a]++; polari[b]++; }
  for (const [a, b, o] of f.legami) { if (!o || f.Z[a] === f.Z[b]) continue; const A = atomo(f.Z[a]).uff, B = atomo(f.Z[b]).uff, d = ((KAPPA * (B.chi - A.chi)) / (2 * A.durezza + 2 * B.durezza)) * (o > 1 ? 1.3 : 1) * Math.pow(polari[a] * polari[b], -0.25); q[a] += d; q[b] -= d; }
  return q;
}
export const cariche = (x) => cariche_(x.pos ? x : forma(x));

// campo(configurazione o forma o molecola, { solvente }) → tutto ciò che serve a calcolare le forze (si prepara una volta)
export function campo(x, { solvente = null } = {}) {
  const c = x.cariche && x.parti ? x : insieme([x.pos ? x : forma(x)]), n = c.n, vic = Array.from({ length: n }, () => []);
  for (const [a, b, o] of c.legami) if (o) { vic[a].push(b); vic[b].push(a); }
  const d0 = (i, j) => Math.hypot(c.pos[3 * i] - c.pos[3 * j], c.pos[3 * i + 1] - c.pos[3 * j + 1], c.pos[3 * i + 2] - c.pos[3 * j + 2]);
  const Zs = (i) => atomo(c.Z[i]).uff.Zstar, sn = (i) => c.piani[i] ?? (vic[i].length >= 4 ? 4 : vic[i].length === 3 ? 3 : 4);
  const legami = c.legami.filter((l) => l[2]).map(([a, b, o]) => { const r0 = d0(a, b); return [a, b, r0, (KCAL * 664.12 * Zs(a) * Zs(b)) / r0 ** 3, o]; });
  const angoli = [], torsioni = [], escl = Array.from({ length: n }, () => new Set()), uno4 = Array.from({ length: n }, () => new Set());
  for (let j = 0; j < n; j++) { for (const i of vic[j]) escl[j].add(i);
    for (let p = 0; p < vic[j].length; p++) for (let q = p + 1; q < vic[j].length; q++) { const i = vic[j][p], k = vic[j][q], rij = d0(i, j), rjk = d0(j, k), rik = d0(i, k), c0 = (rij * rij + rjk * rjk - rik * rik) / (2 * rij * rjk);
      const K = (KCAL * 664.12 * Zs(i) * Zs(k) * rij * rjk * (3 * rij * rjk * (1 - c0 * c0) - rik * rik * c0)) / rik ** 5; escl[i].add(k); escl[k].add(i);
      angoli.push([i, j, k, c0, Math.max(K, 50) / Math.max(1 - c0 * c0, 0.15)]); } }
  for (const [a, b, , , o] of legami) { if (vic[a].length < 2 || vic[b].length < 2) continue; const sa = sn(a), sb = sn(b); if (sa <= 2 || sb <= 2) continue;
    const coppie = []; for (const i of vic[a]) if (i !== b) for (const l of vic[b]) if (l !== a && l !== i) coppie.push([i, l]); if (!coppie.length) continue;
    const Va = atomo(c.Z[a]).uff.V || (c.Z[a] === 8 ? 2 : 0.5), Vb = atomo(c.Z[b]).uff.V || (c.Z[b] === 8 ? 2 : 0.5);
    // (tra due atomi piani legati da un legame semplice: se uno è N od O la sua coppia è coniugata, ordine 1,41 come nell'ammide; tra due carboni metà barriera)
    let V, nn, segno; if (sa === 4 && sb === 4) { V = KCAL * Math.sqrt(Va * Vb); nn = 3; segno = 1; } else if (sa === 3 && sb === 3) { const etero = c.Z[a] === 7 || c.Z[a] === 8 || c.Z[b] === 7 || c.Z[b] === 8; V = KCAL * 10 * (o > 1 ? 1 + 4.18 * Math.log(o) : etero ? 1 + 4.18 * Math.log(1.41) : 0.5); nn = 2; segno = -1; } else { V = KCAL * 1; nn = 6; segno = 1; }
    for (const [i, l] of coppie) { torsioni.push([i, a, b, l, V / coppie.length, nn, segno]); uno4[i].add(l); uno4[l].add(i); } }
  // tipi per le forze tra atomi non legati
  const xv = new Float64Array(n), D = new Float64Array(n), apolare = new Uint8Array(n), polare = new Uint8Array(n);
  for (let i = 0; i < n; i++) { const u = atomo(c.Z[i]).uff; xv[i] = u.x; D[i] = KCAL * u.D; const su = vic[i][0];
    if (c.Z[i] === 1 && su != null && (c.Z[su] === 7 || c.Z[su] === 8)) { xv[i] = 2.0; D[i] = KCAL * 0.05; }
    if (c.Z[i] === 6 || c.Z[i] === 16) apolare[i] = vic[i].some((j) => c.Z[j] === 7 || c.Z[j] === 8) ? 0 : 1; if (c.Z[i] === 7 || c.Z[i] === 8) polare[i] = 1; if (Math.abs(c.cariche[i]) > 0.6) polare[i] = 1; }
  const massa = Float64Array.from(c.Z, (z) => atomo(z).massa);
  return { n, Z: c.Z, pos: Float64Array.from(c.pos), parti: c.parti, legamiLista: c.legami, legami, angoli, torsioni, escl, uno4, x: xv, D, q: c.cariche, apolare, polare, massa, acqua: solvente === 'acqua', taglio: 10 };
}
const S_IDRO = (r) => (r < 4.5 ? [1, 0] : r > 6.5 ? [0, 0] : [0.5 * (1 + Math.cos((Math.PI * (r - 4.5)) / 2)), (-0.5 * Math.PI) / 2 * Math.sin((Math.PI * (r - 4.5)) / 2)]);
// forze(campo, pos?) → { energia (kJ/mol), parti: { legami, angoli, torsioni, vdw, coulomb, idrofobico }, forze: Float64Array (kJ/mol/Å) }
export function forze(c0, pos = null) {
  const c = c0.legami && c0.escl ? c0 : campo(c0), P = pos || c.pos, n = c.n, F = new Float64Array(3 * n), parti = { legami: 0, angoli: 0, torsioni: 0, vdw: 0, coulomb: 0, idrofobico: 0 };
  const dv = (i, j) => [P[3 * i] - P[3 * j], P[3 * i + 1] - P[3 * j + 1], P[3 * i + 2] - P[3 * j + 2]], piu = (i, f, s) => { F[3 * i] += s * f[0]; F[3 * i + 1] += s * f[1]; F[3 * i + 2] += s * f[2]; };
  for (const [a, b, r0, k] of c.legami) { const d = dv(a, b), r = Math.hypot(...d); parti.legami += 0.5 * k * (r - r0) ** 2; const f = (-k * (r - r0)) / r; piu(a, d, f); piu(b, d, -f); }
  for (const [i, j, k, c0_, K] of c.angoli) { const u = dv(i, j), v = dv(k, j), lu = Math.hypot(...u), lv = Math.hypot(...v), cs = (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (lu * lv), dE = K * (cs - c0_); parti.angoli += 0.5 * K * (cs - c0_) ** 2;
    // d cos/d r_i = (v/|v| − cos·u/|u|)/|u|
    const gi = [0, 1, 2].map((q) => (v[q] / lv - (cs * u[q]) / lu) / lu), gk = [0, 1, 2].map((q) => (u[q] / lu - (cs * v[q]) / lv) / lv); piu(i, gi, -dE); piu(k, gk, -dE); piu(j, [gi[0] + gk[0], gi[1] + gk[1], gi[2] + gk[2]], dE); }
  for (const [i, j, k, l, V, nn, sg] of c.torsioni) { const b1 = dv(j, i), b2 = dv(k, j), b3 = dv(l, k), cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dt = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const n1 = cr(b1, b2), n2 = cr(b2, b3), l2 = Math.hypot(...b2), n1q = dt(n1, n1), n2q = dt(n2, n2); if (n1q < 1e-8 || n2q < 1e-8) continue;
    const phi = Math.atan2(l2 * dt(b1, n2), dt(n1, n2)); parti.torsioni += 0.5 * V * (1 + sg * Math.cos(nn * phi)); const dE = -0.5 * V * sg * nn * Math.sin(nn * phi);
    // gradiente dell'angolo diedro (Blondel e Karplus 1996)
    const fi = n1.map((q) => (-l2 / n1q) * q), fl = n2.map((q) => (l2 / n2q) * q), p = dt(b1, b2) / (l2 * l2), s = dt(b3, b2) / (l2 * l2), fj = [0, 1, 2].map((q) => -(1 + p) * fi[q] + s * fl[q]), fk = [0, 1, 2].map((q) => p * fi[q] - (1 + s) * fl[q]);
    piu(i, fi, -dE); piu(j, fj, -dE); piu(k, fk, -dE); piu(l, fl, -dE); }
  // coppie non legate (griglia di celle se gli atomi sono molti)
  const coppia = (i, j) => { if (c.escl[i].has(j)) return; const d = dv(i, j), r2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2]; if (r2 > c.taglio * c.taglio) return; const r = Math.sqrt(r2), sc = c.uno4[i].has(j) ? 0.5 : 1; let f = 0;
    const xs = Math.sqrt(c.x[i] * c.x[j]), Ds = Math.sqrt(c.D[i] * c.D[j]) * sc, s6 = (xs / Math.max(r, 0.5 * xs)) ** 6; parti.vdw += Ds * (s6 * s6 - 2 * s6); f += r > 0.5 * xs ? (12 * Ds * (s6 * s6 - s6)) / r : 0;
    if (c.q[i] && c.q[j] && r > 0.8) { const eps = c.acqua ? Math.min(78, 8 * r) : 1, e = (COULOMB * c.q[i] * c.q[j] * sc) / (eps * r); parti.coulomb += e; f += c.acqua && 8 * r < 78 ? (2 * e) / r : e / r; }
    if (c.acqua && r < 6.5 && !c.uno4[i].has(j)) { const g = c.apolare[i] && c.apolare[j] ? -0.74 : (c.apolare[i] && c.polare[j]) || (c.polare[i] && c.apolare[j]) ? 0.5 : 0; if (g) { const [s, ds] = S_IDRO(r); parti.idrofobico += g * s; f += -g * ds; } }
    piu(i, d, f / r); piu(j, d, -f / r); };
  if (n < 400) { for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) coppia(i, j); }
  else { const L = c.taglio, celle = new Map(), ch = (i) => `${Math.floor(P[3 * i] / L)},${Math.floor(P[3 * i + 1] / L)},${Math.floor(P[3 * i + 2] / L)}`; for (let i = 0; i < n; i++) { const k = ch(i); (celle.get(k) || celle.set(k, []).get(k)).push(i); }
    for (const [k, lista] of celle) { const [cx, cy, cz] = k.split(',').map(Number); for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) { const altra = celle.get(`${cx + dx},${cy + dy},${cz + dz}`); if (!altra) continue; for (const i of lista) for (const j of altra) if (i < j) coppia(i, j); } } }
  return { energia: parti.legami + parti.angoli + parti.torsioni + parti.vdw + parti.coulomb + parti.idrofobico, parti, forze: F };
}
// minimizza(campo, { passi }) → scende lungo le forze (passo che si allunga finché l'energia cala, si dimezza se sale)
export function minimizza(c0, { passi = 200, soglia = 0.5 } = {}) {
  const c = c0.legami && c0.escl ? c0 : campo(c0); let P = Float64Array.from(c.pos), r = forze(c, P), dt = 0.002, fatti = 0;
  for (; fatti < passi; fatti++) { let fm = 0; for (let i = 0; i < r.forze.length; i++) fm = Math.max(fm, Math.abs(r.forze[i])); if (fm < soglia) break;
    const Q = new Float64Array(P.length), s = Math.min(dt, 0.2 / fm); for (let i = 0; i < P.length; i++) Q[i] = P[i] + s * r.forze[i];
    const r2 = forze(c, Q); if (r2.energia < r.energia) { P = Q; r = r2; dt *= 1.3; } else dt *= 0.4; }
  return { ...c, pos: P, energia: r.energia, parti: r.parti, passi: fatti };
}
// un passo di dinamica di Langevin (attrito del solvente e urti: gli urti sono eventi con un indirizzo, caso('…'))
export function passo(c, stato = null, { dt = 1, T = 298.15, attrito = 0.01, caso = null, n = 0 } = {}) {
  const P = stato ? stato.pos : Float64Array.from(c.pos), V = stato ? stato.vel : new Float64Array(3 * c.n), f = stato?.forze || forze(c, P).forze, kT = R * T, acc = 1e-4; // (kJ/mol/Å/u → Å/fs²)
  const g = (i) => { const k = `${caso ? caso.radice : 'molecole'}/urto ${n}/${i}`; const a = numero(k + 'a') / 4294967296, b = numero(k + 'b') / 4294967296; return Math.sqrt(-2 * Math.log(Math.max(a, 1e-12))) * Math.cos(2 * Math.PI * b); };
  const P2 = new Float64Array(P.length), V2 = new Float64Array(P.length), e = Math.exp(-attrito * dt);
  for (let i = 0; i < P.length; i++) { const m = c.massa[(i / 3) | 0]; let v = V[i] + 0.5 * dt * acc * f[i] / m; v = v * e + Math.sqrt((kT * acc * (1 - e * e)) / m) * g(i); V2[i] = v; P2[i] = P[i] + dt * v; }
  const f2 = forze(c, P2); for (let i = 0; i < P.length; i++) V2[i] += (0.5 * dt * acc * f2.forze[i]) / c.massa[(i / 3) | 0];
  return { pos: P2, vel: V2, forze: f2.forze, energia: f2.energia, n: n + 1 };
}

// ---------- la mano: i diastereomeri hanno energie diverse
// la tensione di una molecola: l'energia del campo di forze dopo una breve minimizzazione (la stessa, esattamente, per le
// due immagini allo specchio: si calcola su quella delle due che ha la chiave minore)
const TENSIONI = new Map();
export function tensione(x, { solvente = null, passi = 60 } = {}) { const m = molecola(x), sp = speculare(m), ka = chiave(m), kb = chiave(sp), rap = ka <= kb ? ka : kb, k = `${rap}|${solvente}|${passi}`;
  if (!TENSIONI.has(k)) { if (TENSIONI.size > 5000) TENSIONI.clear(); TENSIONI.set(k, minimizza(campo(forma(molecola(rap)), { solvente }), { passi }).energia); } return TENSIONI.get(k); }
// di quanto una forma stereo sta sopra la più stabile delle sue (0 per gli enantiomeri tra loro e per chi non ha stereo)
export function energiaStereo(x, opz = {}) { const m = molecola(x); if (!m.atomi.some((a) => a.chir) && !m.legami.some((l) => l.ez)) return 0;
  const g = grezzo(m); for (const a of g.atomi) { a.chir = 0; a.ord = null; } for (const l of g.legami) l.ez = null; const tutte = stereoisomeri(molecola(g)); if (tutte.length < 3 && !m.legami.some((l) => l.ez)) return 0;
  return tensione(m, opz) - Math.min(...tutte.map((y) => tensione(y, opz))); }

// ---------- chi si scioglie e chi si aggrega
// → { idratazione, inOlio, trasferimento (acqua → olio, kJ/mol: negativo = preferisce stare tra i suoi simili),
//     coda (atomi di carbonio della catena apolare più lunga), testa, cmc (mol/L, se è un'anfifilica), impacchettamento, forma: 'sciolta' | 'micelle' | 'doppio strato' | 'gocce d'olio' }
// LEGGI: la concentrazione micellare critica dall'energia di trasferimento della coda (Tanford 1980): ln X = ΔG/RT, con
// la repulsione tra le teste cariche che ne mangia una parte (i controioni legati: fattore 1/(1 + β), β = 0,6 misurato
// sui saponi); il parametro di impacchettamento di Israelachvili (1976), p = v/(a0·l), v = 27,4 + 26,9·n Å³, l = 1,5 +
// 1,265·n Å (Tanford), a0 l'area della testa: 60 Å² se carica, 35 se neutra o mezza carica (pH ≈ pKa: è lì che gli
// acidi grassi fanno vescicole), 25 per ogni catena in più. p < ⅓ micelle, ½-1 doppi strati.
export function aggregazione(x, { T = 298.15, pH = 7 } = {}) {
  const m = molecola(x), idr = idratazione(sitiAcidoBase(m).m), olio = inOlio(m), sp = speciazione(m, pH, T);
  // le catene apolari: carboni saturi senza eteroatomi attaccati, in fila
  const apol = m.atomi.map((a, k) => a.Z === 6 && !a.ar && !m.vic[k].some((v) => m.atomi[v.j].Z !== 6)), visto = new Set(), catene = [];
  apol.forEach((si, s) => { if (!si || visto.has(s)) return; let nn = 0; const pila = [s]; visto.add(s); while (pila.length) { const u = pila.pop(); nn++; for (const v of m.vic[u]) if (apol[v.j] && !visto.has(v.j)) { visto.add(v.j); pila.push(v.j); } } catene.push(nn); });
  catene.sort((a, b) => b - a); const coda = catene[0] || 0, lunghe = catene.filter((c) => c >= 6).length, polari = m.atomi.filter((a) => a.Z === 7 || a.Z === 8 || a.Z === 15).length, q = Math.abs(sp.carica);
  const trasferimento = olio - idr, out = { idratazione: idr, inOlio: olio, trasferimento, coda, carica: sp.carica };
  if (coda >= 6 && polari >= 1) { const carica0 = q > 0.5, dGcoda = -3.7 * (coda - 1) - 8.8 + 12 * (carica0 ? 1 : 0.4); // (la testa che resta all'acqua: +12 kJ/mol se carica; dato: CMC del dodecanoato 25 mmol/L)
    // dentro l'aggregato le teste cariche si respingono: quei 12 kJ/mol spostano il pKa apparente di 12/(RT·ln 10) ≈ 2 unità (gli acidi grassi nelle membrane hanno pKa 7-8,5, non 4,8)
    const sposta = 12 / (R * T * Math.LN10), qa = Math.abs(speciazione(m, sp.carica <= 0 ? pH - sposta : pH + sposta, T).carica), beta = qa > 0.5 ? 0.6 : 0;
    const cmc = 55.5 * Math.exp(dGcoda / (R * T * (1 + beta))), a0 = Math.min(70, 20 + 6 * polari) + 28 * Math.min(1, qa) ** 2, v = lunghe * (27.4 + 26.9 * coda), l = 1.5 + 1.265 * coda, p = v / (a0 * l);
    return { ...out, caricaNellAggregato: qa, cmc, areaTesta: a0, impacchettamento: p, forma: p < 0.37 ? 'micelle' : p < 0.5 ? 'micelle allungate' : p <= 1.05 ? 'doppio strato' : 'fase inversa' }; }
  return { ...out, forma: trasferimento < -5 && polari === 0 ? 'gocce d\'olio' : 'sciolta' };
}

// ---------- i polimeri: legare le unità per condensazione (ogni legame nuovo libera una molecola d'acqua)
// I siti: 'peptide' il carbonio di un –COOH legato a un carbonio che porta un azoto, e quell'azoto (N–H) dell'unità dopo;
// 'estere' un –COOH e un –OH; 'glicosidico' il carbonio anomerico (due ossigeni) con il suo –OH, e un –OH dell'unità
// dopo; 'fosfodiestere' un P–OH e un –OH di un carbonio. In generale { da: (m) → [carbonio, ossigeno uscente], a: (m) → nucleofilo }.
const ossoSu = (m, k) => m.vic[k].some((v) => m.legami[v.k].o === 2 && m.atomi[v.j].Z === 8), OHsu = (m, k) => m.vic[k].filter((v) => m.atomi[v.j].Z === 8 && m.atomi[v.j].h === 1 && m.legami[v.k].o === 1).map((v) => v.j);
const SITI = {
  peptide: { da: (m) => { for (let k = 0; k < m.atomi.length; k++) if (m.atomi[k].Z === 6 && ossoSu(m, k) && OHsu(m, k).length && m.vic[k].some((v) => m.atomi[v.j].Z === 6 && m.vic[v.j].some((w) => m.atomi[w.j].Z === 7))) return [k, OHsu(m, k)[0]]; return null; },
    a: (m) => { for (let k = 0; k < m.atomi.length; k++) if (m.atomi[k].Z === 7 && m.atomi[k].h && m.vic[k].some((v) => m.atomi[v.j].Z === 6 && m.vic[v.j].some((w) => m.atomi[w.j].Z === 6 && ossoSu(m, w.j) && OHsu(m, w.j).length))) return k; return null; } },
  estere: { da: (m) => { for (let k = 0; k < m.atomi.length; k++) if (m.atomi[k].Z === 6 && ossoSu(m, k) && OHsu(m, k).length) return [k, OHsu(m, k)[0]]; return null; }, a: (m, gia = new Set()) => { for (let k = 0; k < m.atomi.length; k++) if (m.atomi[k].Z === 8 && m.atomi[k].h === 1 && !gia.has(k) && m.vic[k].length === 1 && m.atomi[m.vic[k][0].j].Z === 6 && !ossoSu(m, m.vic[k][0].j)) return k; return null; } },
  glicosidico: { da: (m) => { for (let k = 0; k < m.atomi.length; k++) if (m.atomi[k].Z === 6 && !ossoSu(m, k) && m.vic[k].filter((v) => m.atomi[v.j].Z === 8).length === 2 && OHsu(m, k).length) return [k, OHsu(m, k)[0]]; return null; },
    a: (m) => { const an = SITI.glicosidico.da(m), dist = new Map([[an ? an[0] : 0, 0]]); let f = [an ? an[0] : 0], scelto = null; for (let d = 1; d < 9 && f.length; d++) { const p = []; for (const u of f) for (const v of m.vic[u]) if (!dist.has(v.j)) { dist.set(v.j, d); p.push(v.j); if (d === 4 && m.atomi[v.j].Z === 8 && m.atomi[v.j].h === 1 && (scelto == null || anelli(m).some((r) => r.includes(u)))) scelto = v.j; } f = p; } return scelto; } },
  fosfodiestere: { da: (m) => { for (let k = 0; k < m.atomi.length; k++) if (m.atomi[k].Z === 15 && OHsu(m, k).length) return [k, OHsu(m, k)[0]]; return null; }, a: (m) => { let ult = null; for (let k = 0; k < m.atomi.length; k++) if (m.atomi[k].Z === 8 && m.atomi[k].h === 1 && m.vic[k].length === 1 && m.atomi[m.vic[k][0].j].Z === 6 && anelli(m).some((r) => r.includes(m.vic[k][0].j))) ult = k; return ult; } },
};
// polimero(unità[], legame, condizioni?) → { m (la molecola), unita: [{ da, a (atomi del grafo), nome }], legami: n − 1, acqua: n − 1, sequenza, dG: [ΔG di ogni passo nelle condizioni, se date], giunti: [[elettrofilo, nucleofilo]] }
export function polimero(unita, legame = 'peptide', condizioni = null) {
  const regola = typeof legame === 'string' ? SITI[legame] : legame; if (!regola) throw new Error(`molecole: legame «${legame}» sconosciuto`);
  const ms = unita.map((u) => molecola(u)), g = { atomi: [], legami: [] }, parti = [], togliere = new Set(), giunti = []; let precedente = null;
  ms.forEach((m, q) => { const d = g.atomi.length, r = grezzo(m); for (const a of r.atomi) { if (a.ord) a.ord = a.ord.map((v) => (v < 0 ? v : v + d)); g.atomi.push(a); } for (const l of r.legami) g.legami.push({ ...l, a: l.a + d, b: l.b + d, ez: l.ez ? { p: l.ez.p + d, q: l.ez.q + d, cis: l.ez.cis } : null });
    if (precedente) { const nu = regola.a(m); if (nu == null) throw new Error(`molecole: l'unità ${q} (${chiave(m)}) non ha il sito per il legame`); const [C, O] = precedente; togliere.add(O); g.legami.push({ a: C, b: nu + d, o: 1, t: 'c' }); g.atomi[nu + d].h--; if (g.atomi[nu + d].ord) { g.atomi[nu + d].chir = 0; g.atomi[nu + d].ord = null; } if (g.atomi[C].ord) g.atomi[C].ord = g.atomi[C].ord.map((v) => (v === O ? nu + d : v)); giunti.push([C, nu + d]); }
    const e = regola.da(m); precedente = e ? [e[0] + d, e[1] + d] : null; if (!e && q < ms.length - 1) throw new Error(`molecole: l'unità ${q} (${chiave(m)}) non ha il gruppo che si lega`);
    parti.push({ nome: typeof unita[q] === 'string' ? unita[q] : chiave(m), da: d, a: g.atomi.length }); });
  // si tolgono gli ossigeni usciti con l'acqua, e si rinumerano gli atomi
  const nuovo = []; let k = 0; g.atomi.forEach((_, i) => { nuovo[i] = togliere.has(i) ? -1 : k++; });
  const G = { atomi: g.atomi.filter((_, i) => !togliere.has(i)).map((a) => ({ ...a, ord: a.ord ? a.ord.map((v) => (v < 0 ? v : nuovo[v])) : null })), legami: g.legami.filter((l) => nuovo[l.a] >= 0 && nuovo[l.b] >= 0).map((l) => ({ ...l, a: nuovo[l.a], b: nuovo[l.b], ez: l.ez && nuovo[l.ez.p] >= 0 && nuovo[l.ez.q] >= 0 ? { p: nuovo[l.ez.p], q: nuovo[l.ez.q], cis: l.ez.cis } : null })) };
  const m = molecola(G), out = { m, unita: parti.map((p) => ({ nome: p.nome, da: nuovo.slice(p.da, p.a).find((v) => v >= 0), a: Math.max(...nuovo.slice(p.da, p.a)) + 1 })), legami: ms.length - 1, acqua: ms.length - 1, giunti: giunti.map(([a, b]) => [nuovo[a], nuovo[b]]), tipo: typeof legame === 'string' ? legame : 'condensazione' };
  if (condizioni && ms.length > 1) out.dG = passoDiCondensazione(ms[0], ms[1], legame, condizioni).dG;
  return out;
}
// l'energia di un passo: unità + unità → dimero + acqua, nelle condizioni date ({ T, solvente, pH, attivitaAcqua };
// «secco»: senza solvente, l'acqua se ne va come vapore alla pressione pAcqua (bar)). Con un attivatore (una molecola
// che prende l'acqua, come la cianammide che diventa urea) si somma l'energia della sua idratazione.
export function passoDiCondensazione(a, b, legame = 'peptide', c = {}) {
  const dim = polimero([a, b], legame).m, T = c.T ?? 298.15, secco = c.solvente !== 'acqua', cond = { T, solvente: secco ? null : 'acqua', pH: c.pH ?? 7, attivitaAcqua: c.attivitaAcqua ?? 1 };
  const E = (x) => energia(x, cond).G; let dG = E(dim) + E('O') - E(a) - E(b), nota = secco ? 'a secco: l\'acqua esce come vapore' : `in acqua a pH ${cond.pH}`;
  // (in acqua il ΔG del glicoside e del fosfodiestere NON esce dalle regole generali — +5 e +26 contro +15,9 e +13,8 kJ/mol
  // misurati —: lì entra il dato misurato, dichiarato, corretto per l'attività dell'acqua; il peptide esce da sé)
  const mis = CONDENSAZIONE_MISURATA[legame]; let misurato = false; if (!secco && mis && !mis.regola && c.misure !== false) { dG = mis.dG + R * T * Math.log(cond.attivitaAcqua); misurato = true; nota += ` (ΔG°′ misurato: ${CONDENSAZIONE_MISURATA.fonte})`; }
  if (secco) dG += R * T * Math.log(c.pAcqua ?? 0.01);
  let attivazione = 0; if (c.attivatore) { const att = molecola(c.attivatore), idr = c.prodottoAttivatore ? molecola(c.prodottoAttivatore) : null; if (idr) { attivazione = E(idr) - E(att) - E('O') - (secco ? R * T * Math.log(c.pAcqua ?? 0.01) : 0); dG += attivazione; nota += `, con ${chiave(att)} che prende l'acqua`; } }
  return { dG, attivazione, dimero: dim, nota, misurato };
}
// i diedri della spina dorsale di un peptide (φ, ψ, ω in gradi) da passare a forma(): eliche (−57, −47), foglietti (−139, 135)
export function diedriPeptide(p, phi = -57, psi = -47, omega = 180) {
  const m = p.m, n = p.unita.length, out = [], N = new Array(n).fill(-1), CA = new Array(n).fill(-1), C = new Array(n).fill(-1);
  p.giunti.forEach(([c, nn], i) => { C[i] = c; N[i + 1] = nn; });
  for (let i = 0; i < n; i++) { const u = p.unita[i], dentro = (k) => k >= u.da && k < u.a;
    if (C[i] >= 0) CA[i] = m.vic[C[i]].map((v) => v.j).find((k) => dentro(k) && m.atomi[k].Z === 6 && (N[i] >= 0 ? m.vic[k].some((w) => w.j === N[i]) : m.vic[k].some((w) => m.atomi[w.j].Z === 7))) ?? -1;
    else if (N[i] >= 0) CA[i] = m.vic[N[i]].map((v) => v.j).find((k) => dentro(k) && m.atomi[k].Z === 6 && m.vic[k].some((w) => m.atomi[w.j].Z === 6 && ossoSu(m, w.j))) ?? -1;
    if (CA[i] >= 0 && N[i] < 0) N[i] = m.vic[CA[i]].map((v) => v.j).find((k) => m.atomi[k].Z === 7) ?? -1;
    if (CA[i] >= 0 && C[i] < 0) C[i] = m.vic[CA[i]].map((v) => v.j).find((k) => m.atomi[k].Z === 6 && ossoSu(m, k)) ?? -1; }
  for (let i = 0; i < n; i++) { if (i > 0) { out.push([CA[i - 1], C[i - 1], N[i], CA[i], omega]); out.push([C[i - 1], N[i], CA[i], C[i], phi]); } if (i < n - 1) out.push([N[i], CA[i], C[i], N[i + 1], psi]); }
  return { diedri: out, N, CA, C };
}

// ---------- la grana grossa: un'unità = un grano, con le proprietà ricavate dai suoi atomi
// → { grani: [{ nome, pos (Å, baricentro), massa, raggio (Å, dal volume di van der Waals), carica (al pH), idrofobicita (kJ/mol: acqua → olio, del residuo), donatori, accettori }], legami: [[i, i+1]] }
export function granaGrossa(p, { pH = 7, f = null, diedri = [] } = {}) {
  const F = f || forma(p.m, { diedri }), m = p.m, memo = new Map(), sp = sitiAcidoBase(m), stato = speciazione(m, pH), caricaAtomo = new Map(); stato.siti.forEach((s, i) => { if (stato.stato[i]) caricaAtomo.set(s.atomo, s.tipo === 'acido' ? -1 : 1); }); void sp;
  const grani = p.unita.map((u) => { let M = 0, vol = 0, q = 0, don = 0, acc = 0; const c = [0, 0, 0];
    for (let i = 0; i < F.n; i++) { const k = F.pesante[i]; if (k < u.da || k >= u.a) continue; const A = atomo(F.Z[i]); M += A.massa; vol += (4 / 3) * Math.PI * A.raggioVdW ** 3 * 0.6; for (let x = 0; x < 3; x++) c[x] += A.massa * F.pos[3 * i + x]; }
    for (let k = u.da; k < u.a; k++) { const a = m.atomi[k]; q += a.q + (caricaAtomo.get(k) || 0); if ((a.Z === 7 || a.Z === 8) && a.h) don += a.h; if (a.Z === 7 || a.Z === 8) acc++; }
    // (l'idrofobicità di un residuo: quanto il suo trasferimento dall'acqua all'olio costa meno di quello della glicina, il residuo senza catena laterale)
    if (!memo.has(u.nome)) { let idro = 0; try { idro = inOlio(u.nome) - idratazione(sitiAcidoBase(u.nome).m) - (p.tipo === 'peptide' ? inOlio('NCC(=O)O') - idratazione('NCC(=O)O') : 0); } catch { idro = 0; } memo.set(u.nome, idro); }
    return { nome: u.nome, pos: c.map((x) => x / M), massa: M, raggio: Math.cbrt((3 * vol) / (4 * Math.PI)), carica: q, idrofobicita: memo.get(u.nome), donatori: don, accettori: acc }; });
  return { grani, legami: grani.slice(1).map((_, i) => [i, i + 1]) };
}
// energia di una catena a grana grossa (kJ/mol): molle tra grani vicini, ingombro, cariche schermate (Debye e Hückel,
// lunghezza di Debye 3,04/√I Å... qui 9,6 Å: forza ionica 0,1), contatto idrofobico in proporzione alle due idrofobicità
export function energiaGrossa(gg, pos = null) { const g = gg.grani, P = pos || g.map((x) => x.pos); let E = 0;
  for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) { const r = Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1], P[i][2] - P[j][2]), s = g[i].raggio + g[j].raggio;
    if (j === i + 1) { E += 0.5 * 40 * (r - 3.8) ** 2; continue; } if (r < s) E += 10 * (s / r - 1) ** 2; E += (COULOMB * g[i].carica * g[j].carica * Math.exp(-r / 9.6)) / (78 * r);
    if (g[i].idrofobicita < 0 && g[j].idrofobicita < 0 && r < s + 3) E -= 0.25 * Math.sqrt(g[i].idrofobicita * g[j].idrofobicita); }
  return E; }

// ---------- la scena per la vista 3D (atomi3d.js)
// scena3D(molecola | forma | configurazione | polimero | lista di questi, { margine (nm), nome }) →
//   { unita: 'nm', atomi: { pos: Float32Array(3N) nm, raggio: Float32Array(N) nm (van der Waals), elemento: Uint8Array(N) },
//     legami: Uint32Array(2M), scatola: [lx, ly, lz] nm, parti: [{ nome, da, a }], nome }
export function scena3D(x, { margine = 0.3, nome = null, diedri = [], parti = null, distanza = 4 } = {}) {
  const lista = Array.isArray(x) ? x : [x], Z = [], P = [], L = [], pp = []; let dx = 0;
  for (const y of lista) { const config = y && y.Z && y.pos, f = config ? y : y && y.m && y.unita ? forma(y.m, { diedri }) : forma(y), d = Z.length, leg = f.legamiLista || f.legami;
    let lo = Infinity, hi = -Infinity; for (let i = 0; i < f.n; i++) { lo = Math.min(lo, f.pos[3 * i]); hi = Math.max(hi, f.pos[3 * i]); } const sp = lista.length > 1 ? dx - lo : 0; dx += hi - lo + distanza;
    for (let i = 0; i < f.n; i++) { Z.push(f.Z[i]); P.push(f.pos[3 * i] + sp, f.pos[3 * i + 1], f.pos[3 * i + 2]); }
    for (const l of leg) if (l[2] !== 0) L.push(l[0] + d, l[1] + d);
    if (config && f.parti) for (const q of f.parti) pp.push({ nome: q.nome, da: q.da + d, a: q.a + d });
    else pp.push({ nome: y && y.unita ? `${y.tipo || 'polimero'} di ${y.unita.length} unità` : chiave(f.m), da: d, a: Z.length }); }
  const n = Z.length, pos = new Float32Array(3 * n), raggio = new Float32Array(n), elemento = new Uint8Array(n), min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < n; i++) for (let q = 0; q < 3; q++) { min[q] = Math.min(min[q], P[3 * i + q]); max[q] = Math.max(max[q], P[3 * i + q]); }
  for (let i = 0; i < n; i++) { for (let q = 0; q < 3; q++) pos[3 * i + q] = (P[3 * i + q] - min[q]) / 10 + margine; raggio[i] = atomo(Z[i]).raggioVdW / 10; elemento[i] = Z[i]; }
  const fine = parti || pp;
  return { unita: 'nm', atomi: { pos, raggio, elemento }, legami: Uint32Array.from(L), scatola: [0, 1, 2].map((q) => (n ? (max[q] - min[q]) / 10 : 0) + 2 * margine), parti: fine.map((q) => ({ nome: q.nome, da: q.da, a: q.a })), nome: nome || fine.map((q) => q.nome).slice(0, 3).join(', ') };
}
export { alPH, lunghezzaLegame, viciniSigma };
