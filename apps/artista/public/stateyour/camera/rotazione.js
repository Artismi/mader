// rotazione.js — il giorno e l'inclinazione dell'asse di un pianeta come CONSEGUENZA: di come è nato e di ciò
// che da allora lo frena. Nessun giorno è sorteggiato.
//
// 1. COME NASCE IL GIRO (tre storie, secondo la formazione che disco.js racconta):
//    · GLI URTI GIGANTI (un mondo di roccia o di ghiaccio fatto di embrioni fusi): il momento angolare lo portano gli
//      urti (impatti.js: quello che resta al pianeta tolti il disco, la luna e i detriti che sfuggono; i corpi che si
//      mordono e fuggono; il limite dei fluidi che ruotano). L'asse viene da lì: gli urti arrivano da ogni parte;
//    · IL GAS (un gigante, o un mondo con un involucro di gas): il gas cade attraverso un disco attorno al pianeta e
//      porta molto più momento angolare di quanto il pianeta possa tenere; il campo magnetico del pianeta giovane,
//      agganciato al disco, lo frena: il pianeta gira insieme al bordo interno del disco, dove il campo lo tronca
//      (come le stelle giovani). Con un campo alimentato dal calore del gas che cade, la frazione della velocità di
//      rottura a cui si ferma dipende pochissimo dalla massa: ∝ (parte di gas)^(1/7) · densità^(−1/14) (vedi giroDaGas).
//      L'asse resta dritto: il gas arriva nel piano dell'orbita;
//    · UN EMBRIONE RIMASTO SOLO (niente gas, nessun urto gigante): gira come l'ha lasciato la crescita nel disco, nel
//      verso dell'orbita, a un decimo della rottura (legge dichiarata in impatti.js: giroEmbrione).
//    In tutti e tre i casi i sassi mangiati crescendo arrivano a caso: il loro momento angolare non si cancella del
//    tutto (cresce come la radice del loro numero) e inclina un poco l'asse: è l'unica inclinazione di chi non ha urti.
// 2. CHE COSA LO CAMBIA DOPO:
//    · gli urti minori della sua storia (se la si passa: storiaImpatti), ognuno col suo momento angolare, a caso;
//    · la LUNA nata dall'urto, che allontanandosi frena il pianeta (lune.js: giornoPianeta);
//    · le MAREE DELLA STELLA, per tutto il tempo dalla nascita a oggi: la stessa legge di lune.js (tempoBlocco: un
//      freno costante, perché l'attrito non dipende dalla frequenza), integrata: il giorno di oggi è ciò che resta.
//      Se il freno arriva in fondo il pianeta si ferma sull'equilibrio della marea: su un'orbita tonda mostra sempre
//      la stessa faccia (bloccato); su un'orbita allungata l'equilibrio è più veloce del giro dell'orbita (Hut 1981),
//      e un corpo solido resta agganciato alla risonanza più vicina (Mercurio: tre giri ogni due anni).
//      Le maree raddrizzano anche l'asse, con lo stesso passo.
//
// CIÒ CHE EMERGE: il giorno (da 2–3 ore a mesi), chi è bloccato e chi è in risonanza, chi gira al contrario, le
// inclinazioni (grandi dopo gli urti giganti, piccole per i giganti di gas e per gli embrioni soli, nulle vicino
// alla stella), il giorno della Terra dopo che la Luna l'ha frenata, quello di Mercurio.
// LEGGI EMPIRICHE (dichiarate; i numeri sono in ROTAZIONE e in IMPATTI):
//   · un gigante di gas esce dalla formazione al 30% della velocità di rottura: TARATA su Giove (9,93 ore). La
//     dipendenza da gas e densità è ricavata (l'aggancio magnetico al disco, Batygin 2018; il campo dalla legge
//     delle dinamo di Christensen, come in geologia.js), la costante no: dipende dal campo del pianeta giovane;
//   · il giro di un embrione cresciuto nel gas, il limite dei fluidi che ruotano, il «mordi e fuggi»: in impatti.js;
//   · l'attrito di marea di roccia e ghiaccio: quello di lune.js (k₂ elastico / Q); per un corpo di gas k₂/Q = 10⁻⁵
//     (Giove, dal moto di Io: lo stesso numero di lune.js);
//   · la rotazione di equilibrio su un'orbita allungata (Hut 1981: esatta per un attrito a ritardo costante).
// PARAMETRI LIBERI: sotto l'1% di gas il giro è quello del corpo solido (gasMinimo).
// SEMPLIFICAZIONI E MANCANZE: · la luna e la stella frenano una dopo l'altra, non insieme; · la frenata della stella
//   non tiene conto dell'eccentricità (solo il punto d'arrivo), né di come cambiano orbita e raggio nel tempo;
//   · MANCA la marea termica dell'atmosfera (su Venere è lei, con l'attrito tra nucleo e mantello, a fare il giorno
//     di 243 giorni al contrario: qui Venere è solo frenata a metà); · MANCANO le risonanze tra l'asse e le orbite
//     (l'inclinazione di Saturno, 27°, e le oscillazioni di quella di Marte) e gli urti giganti sui mondi con
//     involucro (Urano coricato): disco.js non ne dà dopo che il gas è arrivato; · il corpo oltre il limite perde
//     il momento angolare in più, ma la massa che si stacca non è seguita.

import { COSTANTI, MSOLE, ANNO } from './leggi.js';
import { DISCO, MGIOVE, RGIOVE } from './disco.js';
import { IMPATTI, giganteDi } from './impatti.js';
import { densitaCorpo, tempoBlocco } from './lune.js';

const G = COSTANTI.G, PI = Math.PI, ANNO_S = ANNO, sfera = (R) => (4 / 3) * PI * R ** 3;
const limita = (x, a, b) => Math.max(a, Math.min(b, x));

export const ROTAZIONE = Object.freeze({
  giroGiove: 0.2986, // la frazione della rottura a cui gira Giove oggi (2,96 ore / 9,93 ore): la taratura
  gasGiove: 0.96, // la parte di idrogeno ed elio di Giove
  gasMinimo: 0.01, // sotto questa parte di gas il giro è quello del corpo solido
  k2QGas: 1e-5, // k₂/Q di un corpo di gas (Giove, misurato dal moto di Io: come in lune.js)
  giornoDiProva: 36000, // (s) il giorno con cui si chiede a lune.js il tempo di blocco: la frenata non ne dipende
});

// il periodo di rottura: più in fretta di così la gravità all'equatore non trattiene più
export const giornoDiRottura = (P) => 2 * PI * Math.sqrt(P.raggioM ** 3 / (G * P.massaKg));
// la parte di gas (idrogeno ed elio) di un pianeta: quella dei giganti, o l'involucro dei mondi rimasti a metà
export const gasDi = (P) => (P.tipo === 'gassoso' ? limita((P.composizione?.idrogeno ?? 0.71) + (P.composizione?.elio ?? 0.25), 0.5, 1) : P.involucro || 0);

// ---------- IL GIRO DATO DAL GAS: a quale frazione della velocità di rottura esce un pianeta che ha preso il suo gas
// attraverso un disco. Il pianeta giovane gira insieme al bordo interno del disco, a R_t = (μ⁴/(G·M·Ṁ²))^(1/7) (μ = B·R³
// il suo magnete, Ṁ il gas che cade): ω/ω_rottura = (R/R_t)^(3/2) ∝ [M·Ṁ²/(B⁴·R⁵)]^(3/14). Il campo viene dal calore
// (Christensen: B² ∝ ρ^⅓·q^⅔) e il calore dal gas che cade (q ∝ G·M·Ṁ/R³): sostituendo, tutto si semplifica in
// (Ṁ^⅔·R/M)^(3/14); con Ṁ = (parte di gas)·M / (vita del disco): ∝ gas^(1/7)·ρ^(−1/14). La costante è Giove.
export function giroDaGas(P) {
  const rho = P.massaKg / sfera(P.raggioM), rhoGiove = MGIOVE / sfera(RGIOVE);
  return ROTAZIONE.giroGiove * Math.pow(gasDi(P) / ROTAZIONE.gasGiove, 1 / 7) * Math.pow(rho / rhoGiove, -1 / 14);
}

// ---------- LA FRENATA DELLA STELLA (rad/s²): la marea che la stella alza sul pianeta lo frena con una coppia costante,
// dω/dt = (3/2)·(k₂/Q)·G·M*²·R³/(0,4·M·a⁶): per roccia e ghiaccio è esattamente tempoBlocco di lune.js; un corpo di
// gas non è rigido, ma dissipa lo stesso, mille volte meno (k₂/Q di Giove)
export function frenataMareale(P, gas = gasDi(P)) {
  if (gas >= ROTAZIONE.gasMinimo) return (1.5 * ROTAZIONE.k2QGas * G * P.Mstella ** 2 * P.raggioM ** 3) / (0.4 * P.massaKg * P.aM ** 6);
  return ((2 * PI) / ROTAZIONE.giornoDiProva) / tempoBlocco({ massaKg: P.Mstella }, { massaKg: P.massaKg, raggioM: P.raggioM, aM: P.aM, composizione: P.composizione }, ROTAZIONE.giornoDiProva);
}
// la rotazione a cui la marea non spinge più, in giri per ogni giro dell'orbita (Hut 1981): 1 su un'orbita tonda, di
// più su una allungata (al passaggio vicino la stella tira di più, e lì il pianeta le corre dietro)
export function equilibrioMareale(e = 0) {
  const e2 = e * e;
  return (1 + 7.5 * e2 + 5.625 * e2 * e2 + 0.3125 * e2 ** 3) / ((1 + 3 * e2 + 0.375 * e2 * e2) * Math.pow(1 - e2, 1.5));
}

// ---------- LA ROTAZIONE DI UN PIANETA, dalla nascita a oggi.
// P: un pianeta di sistema() (tipo, massaKg, raggioM, aM, Mstella, composizione; se ci sono: involucro, eccentricita,
//    formazione). sistema: { stella: { eta, Z… }, … }. caso: la sorgente degli eventi del pianeta (la stessa di impatti.js).
// opzioni: urto — l'urto gigante del pianeta (giganteDi; se manca lo si calcola qui);
//          luna — la luna nata dall'urto, com'è uscita da lune.js (serve il suo giornoPianeta);
//          storia — la storia degli impatti (storiaImpatti): allora contano anche i suoi urti minori.
// RESTITUISCE { origine: 'gas' | 'urti' | 'embrione', nascita (anni), giornoNascita (s), obliquitaNascita (gradi, 0…180),
//   suRottura (la velocità alla nascita, in unità di quella di rottura), giornoRottura (s), frenata (rad/s²),
//   tempoFreno (anni che servono alla stella per fermarlo), equilibrio (giri per orbita a cui la marea lo porta),
//   giorno (s, oggi), obliquita (gradi, 0…90), retrogrado, bloccato (stessa faccia alla stella), risonanza (null | '3:2'…) }
export function rotazione(P, sistema, caso, { urto, luna = null, storia = null } = {}) {
  const st = sistema?.stella || {}, eta = st.eta ?? 4.5e9, gas = gasDi(P), Tr = giornoDiRottura(P), wr = (2 * PI) / Tr;
  if (urto === undefined) urto = P.tipo === 'gassoso' ? null : giganteDi(P, sistema, caso);
  // 1. LA NASCITA
  const origine = gas >= ROTAZIONE.gasMinimo ? 'gas' : urto ? 'urti' : 'embrione';
  const nascita = origine === 'urti' ? urto.t : Math.min(0.999 * eta, P.formazione?.tGas ?? sistema?.disco?.vita ?? DISCO.vitaMedia / Math.sqrt((P.Mstella ?? MSOLE) / MSOLE));
  const I = IMPATTI.inerzia * P.massaKg * P.raggioM ** 2;
  // il momento angolare, come vettore (z: la normale all'orbita)
  let L;
  if (origine === 'urti') { const eps = (urto.obliquita * PI) / 180, m = (I * 2 * PI) / urto.giornoDopo; L = [m * Math.sin(eps), 0, m * Math.cos(eps)]; }
  else {
    L = [0, 0, I * wr * (origine === 'gas' ? giroDaGas(P) : IMPATTI.giroEmbrione)];
    // i sassi mangiati crescendo: N corpi di massa m arrivati a caso lasciano un momento angolare ~ √N·m·v·R (la
    // somma di N passi a caso), cioè √(M_solidi·m)·v·R; m è il planetesimo di 100 km (impatti.js), v la fuga per √2
    const solidi = P.massaKg * (1 - gas), gh = P.tipo === 'roccioso' ? P.composizione?.acqua ?? 0 : P.composizione?.ghiaccio ?? 0.5, sasso = (densitaCorpo(1, gh) * PI * IMPATTI.planetesimo ** 3) / 6;
    const passo = (Math.sqrt(solidi * sasso) * Math.sqrt((4 * G * P.massaKg) / P.raggioM) * P.raggioM) / Math.sqrt(6); // (per ogni asse: ⟨b²⟩ = ½, tre assi)
    for (let d = 0; d < 3; d++) L[d] += passo * caso.normale(`giro/sassi ${'xyz'[d]}`);
  }
  // 2. GLI URTI MINORI della sua storia: ognuno porta m·v·R·cos(angolo), in una direzione qualunque
  if (storia) for (const g of storia.grandi) { if (!(g.vSuolo > 0)) continue;
    const u = caso(`impatto ${g.id}/giro`), x = Math.round(u * 4294967296), z = ((x % 65536) + 0.5) / 32768 - 1, fi = (2 * PI * (Math.floor(x / 65536) % 65536)) / 65536, r = Math.sqrt(1 - z * z);
    const m = g.massaKg * g.vSuolo * P.raggioM * Math.cos((g.angolo * PI) / 180); L[0] += m * r * Math.cos(fi); L[1] += m * r * Math.sin(fi); L[2] += m * z; }
  // nessun corpo gira oltre il limite dei fluidi
  let Ln = Math.hypot(...L); const Lmax = IMPATTI.giroLimite * I * wr; if (Ln > Lmax) { L = L.map((v) => (v * Lmax) / Ln); Ln = Lmax; }
  const w0 = Ln / I, eps0 = Ln > 0 ? (Math.acos(limita(L[2] / Ln, -1, 1)) * 180) / PI : 0;
  // 3. LA LUNA nata dall'urto ha già frenato il pianeta (lune.js)
  const wLuna = luna?.giornoPianeta ? Math.min(w0, (2 * PI) / luna.giornoPianeta) : w0;
  // 4. LA STELLA. La rotazione lungo la normale all'orbita (negativa: al contrario) va verso l'equilibrio della marea,
  // con la frenata costante, per tutto il tempo dalla nascita a oggi
  const anno = P.anno ?? 2 * PI * Math.sqrt(P.aM ** 3 / (G * P.Mstella)), n = (2 * PI) / anno, equilibrio = equilibrioMareale(P.eccentricita ?? 0);
  // un corpo solido ha una forma sua e resta agganciato alla risonanza più vicina (1:1, 3:2, 2:1…); uno di gas no
  const giri = origine === 'gas' ? equilibrio : Math.max(1, Math.round(2 * equilibrio) / 2), meta = giri * n;
  const frenata = P.aM > 0 && P.Mstella > 0 ? frenataMareale(P, gas) : 0, s0 = eps0 > 90 ? -wLuna : wLuna, cammino = Math.abs(s0 - meta), fatto = frenata * Math.max(0, eta - nascita) * ANNO_S;
  const fermo = fatto >= cammino, s = fermo ? meta : s0 + Math.sign(meta - s0) * fatto, quanto = cammino > 0 ? Math.min(1, fatto / cammino) : 1;
  // l'asse: le maree lo raddrizzano con lo stesso passo (verso 0°; se gira al contrario, da 180°: e se la marea lo ha
  // fatto ripartire nel verso giusto, verso 0°)
  const retrogrado = s < 0, storto = eps0 > 90 ? 180 - eps0 : eps0;
  return {
    origine, nascita, giornoNascita: (2 * PI) / w0, obliquitaNascita: eps0, suRottura: w0 / wr, giornoRottura: Tr, frenata, tempoFreno: frenata > 0 ? cammino / frenata / ANNO_S : Infinity, equilibrio,
    giorno: fermo ? anno / giri : (2 * PI) / Math.abs(s), obliquita: fermo ? 0 : storto * (1 - quanto), retrogrado, bloccato: fermo && Math.abs(giri - 1) < 0.02,
    risonanza: fermo && giri > 1.02 ? (origine === 'gas' ? 'equilibrio' : `${Math.round(2 * giri)}:2`.replace('4:2', '2:1').replace('6:2', '3:1')) : null,
  };
}
