// maree.js — LA MAREA, UNA FONTE SOLA: quanto un corpo si lascia deformare da un altro che gli gira attorno (o attorno
// a cui gira) e quanta di quella deformazione diventa calore. Vale per pianeti e lune: chi vuole il calore di marea o
// k₂/Q lo legge da qui (storia.js per lo stato interno nel tempo, lune.js per le sue lune).
//
// LA LEGGE. Un corpo omogeneo di densità ρ, gravità g e raggio R risponde alla marea con il numero di Love complesso
//     k₂* = (3/2) / (1 + μ̃·J_U/J*(ω)),      μ̃ = 19·μ/(2·ρ·g·R)   (rigidità efficace),  J_U = 1/μ
// dove J*(ω) è la cedevolezza complessa della sua materia alla frequenza ω della marea (Renaud e Henning 2018,
// arXiv:1707.06701, §III.3 ed eq. 10 [V, letto]; è la formula elastica che lune.js aveva, 3/2/(1 + 19μ/2ρgR), con la
// rigidità resa complessa). Il calore, per un corpo sincrono su un'orbita poco allungata:
//     Ė = −Im(k₂*)·[(21/2)·e² + (3/2)·sin²ε]·G·M²·R⁵·n/a⁶ · (parte del volume che dissipa)
// (il termine in e²: Peale, Cassen e Reynolds 1979; Renaud e Henning eq. 4 [V], con la frazione di volume f_tvf; il
// termine dell'obliquità ε: Wisdom 2008 [R, non riletto]).
// LA REOLOGIA (dichiarata: ANDRADE; Maxwell resta per confronto con { reologia: 'maxwell' }):
//   · Maxwell: J* = J_U − i/(η·ω). Dissipa solo vicino a ω·τ_M = 1 (τ_M = η/μ): lontano dal punto di fusione dà Q di
//     milioni, che le misure smentiscono (la Luna: Q ≈ 38; la Terra solida: ~280);
//   · Andrade: J* = J_U·[1 + (i·ω·τ_A)^(−α)·Γ(1+α)] − i/(η·ω), τ_A = ζ·τ_M. Il termine in più è lo scorrimento
//     transitorio dei bordi di grano, ed è quello che regge le misure a ogni frequenza. α = 1/3 (0,1–0,4 misurato
//     sull'olivina [V, Renaud e Henning]) e ζ = 1 (il valore nominale [V]; in laboratorio 10⁻¹⁰–10⁻⁴: APERTO). La forma
//     di J* di Andrade è [R] (Efroimsky 2012; la tabella 2 di Renaud e Henning non è stata letta), coerente con le
//     definizioni lette (ζ = τ_A/τ_M).
// LA MATERIA. La viscosità è LA STESSA della convezione (storia.js la prende da qui): roccia ν_rif·exp(E_ν/RT)/ε_fuso
// (ThermInt [V]), con ε_fuso la legge di Costa per la roccia in parte fusa; la rigidità cala con lo stesso ε_fuso
// (ThermInt [V]: μ ∝ 1/ε_fuso) a partire da quella misurata della roccia fredda (lune.js MATERIALI: 6,5·10¹⁰ Pa; il
// ghiaccio 4·10⁹: gli stessi di Renaud e Henning [V]). Così la dissipazione SALE quando il corpo si avvicina a fondere
// (la viscosità scende verso ω·τ ≈ 1) e CALA quando fonde troppo (la roccia perde rigidità e viscosità insieme: un
// liquido non fa attrito): il ramo caldo (Io) è il punto dove il calore che esce uguaglia quello di marea, non uno stato scelto.
//   Ghiaccio: η = η₀·exp[A·(T_f/T − 1)], η₀ = 10¹⁴ Pa·s al punto di fusione (10¹³–10¹⁵: APERTO, dipende dalla grana),
//   A = E/(R·T_f) con E = 59,4 kJ/mol (Goldsby e Kohlstedt 2001 [R: le energie di attivazione non sono confermate nelle note]).
// IL GUSCIO SOPRA UN OCEANO (dissipazioneGuscio): la via scelta è la MEMBRANA di Beuthe 2015 («Tidal Love numbers of membrane
// worlds», arXiv:1504.04574 [V, letto: eq. 71, 75, tabella 5, e h₂° = 5/(5 − 3ξ) del mantello rigido]). Un guscio sottile
// che galleggia su un oceano risponde come una molla: Λ = [8(1+ν)/(5+ν)]·(μ̄/(ρ·g·R))·(d/R), con μ̄ la media nello spessore
// della rigidità (complessa) del ghiaccio; all'ordine principale k₂ + 1 = (1 + Λ)·h₂, e con l'interno sotto l'oceano
// rigido la gravità del rigonfiamento dà k₂ = (3ξ/5)·h₂ (ξ = densità dell'oceano / densità media): quindi
// h₂ = 1/(1 + Λ − 3ξ/5) [D da V]. Tutto l'attrito è nel guscio: Ė = −Im(k₂)·forzante. LIMITI (dichiarati): guscio più
// sottile del 5–10% del raggio (entro l'1% sotto il 5% [V]); l'interno sotto l'oceano non si deforma (la roccia di Europa
// va bene; i ghiacci d'alta pressione di Ganimede e Titano e un oceano più denso alzerebbero k₂: Titano misura 0,6);
// si trascurano le correzioni di densità del guscio e la marea dinamica dell'oceano.
// CHE COSA MANCA (dichiarato): le matrici di propagazione per un corpo a molti strati (lo strato molle sotto la crosta
// rigida di Io non viene dalla membrana: lì sotto non c'è un liquido); la marea
// dell'oceano (mare.js la calcola bacino per bacino e non torna qui); i corpi non sincroni (la marea di rotazione: la
// frequenza è 2·(Ω − n), la legge di k₂* è la stessa: si può chiedere con la frequenza giusta, ma la potenza qui sotto
// è quella del corpo sincrono); la dipendenza di ζ dalla frequenza.
// PARAMETRI LIBERI: nessuno tarato; APERTI (con intervallo): α e ζ di Andrade, η₀ del ghiaccio.
// CHE COSA NON TORNA delle lune ghiacciate (lune.js internoGhiacciato + la membrana): Europa torna quasi (guscio 26 km,
// k₂ 0,23, 8·10¹¹ W; l'oceano è 40 km perché lo strato d'acqua di lune.js è 66); Ganimede, Callisto e Titano gelano (il
// ghiaccio che convette, senza ghiacci d'alta pressione, porta via troppo calore); Encelado e Tritone nascono freddi e
// restano sul ramo freddo; k₂ di Titano 0,44 contro 0,6 misurato.
// CHE COSA NON TORNA (test/test_maree.mjs, con i numeri): Io trova da solo il ramo caldo (mantello in parte fuso, il
// calore esce con il magma) ma dissipa 0,34 W/m² dove se ne osservano 2–2,5 (−Im k₂ = 0,002 contro 0,015 misurato): al
// corpo omogeneo manca lo strato molle sotto una crosta rigida; k₂ della Terra 0,54 (vero 0,30: la rigidità qui non cresce
// con la pressione) e di Mercurio 0,16 (vero 0,57: il nucleo liquido non si deforma a parte). Tornano senza taratura: la
// Luna (k₂ 0,024, Q 42 al mese), il Q della Terra solida (430; vero ~280), la marea nella Terra solida (0,16 TW).

import { COSTANTI, R_GAS } from './leggi.js';

const G = COSTANTI.G, PI = Math.PI;

export const MAREE = Object.freeze({
  andrade: Object.freeze({ alfa: 1 / 3, zeta: 1, intervalloAlfa: Object.freeze([0.1, 0.4]), intervalloZeta: Object.freeze([1e-10, 1]) }),
  // la roccia del mantello: viscosità cinematica (m²/s) ed energia di attivazione (J/mol) di ThermInt [V]; rigidità da fredda (Pa)
  roccia: Object.freeze({ nuRif: 6e7, Enu: 3e5, rigidita: 6.5e10, densita: 3300 }),
  costa: Object.freeze({ B: 2.5, fiStar: 0.8, delta: 6, gamma: 6, xi: 5e-4 }), // la viscosità con il fuso (forma di Costa, ThermInt [V])
  ghiaccio: Object.freeze({ eta0: 1e14, intervalloEta0: Object.freeze([1e13, 1e15]), E: 59400, Tfusione: 273, rigidita: 4e9, densita: 930,
    poisson: 0.33, latente: 3.34e5, alfa: 1.6e-4, diffusivita: 1.2e-6, // [R] (valori d'uso dei modelli di Europa: non riletti su una fonte)
    pendenzaFusione: -7.4e-8, pressioneMassima: 2.09e8 }), // (K/Pa; Pa) il ghiaccio I fonde più in basso sotto pressione, fino a 209 MPa (251 K) [R]
});

// ---------- attrezzi
// la funzione degli errori (Abramowitz e Stegun 7.1.26: sbaglia meno di 1,5·10⁻⁷)
export function erf(x) { const s = x < 0 ? -1 : 1, a = Math.abs(x), t = 1 / (1 + 0.3275911 * a); return s * (1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a)); }
// Γ(x) per x tra 1 e 2 (serve Γ(1 + α)): approssimazione di Lanczos a sei termini (errore sotto 10⁻⁹)
// (PRESTAZIONI: Γ è chiesta milioni di volte sempre con lo stesso argomento, 1 + α: l'ultimo valore resta in memoria, con
// la chiave ESATTA — lo stesso x, lo stesso numero, bit per bit)
const LANCZOS = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
let gammaDi = NaN, gammaVale = NaN;
function gamma(x) { if (x === gammaDi) return gammaVale; let y = x, t = x + 5.5, s = 1.000000000190015; t -= (x + 0.5) * Math.log(t); for (let i = 0; i < 6; i++) s += LANCZOS[i] / ++y; gammaDi = x; return (gammaVale = Math.exp(-t + Math.log((2.5066282746310005 * s) / x))); }

// ---------- la materia: una viscosità sola per la convezione e per la marea
// quanto il fuso abbassa viscosità e rigidità (Costa; F = frazione fusa): ε_fuso ≥ 1
export function epsilonFuso(F) {
  if (!(F > 0)) return 1;
  // (PRESTAZIONI: con γ = δ le due potenze di φ sono la stessa chiamata: si fa una volta)
  const { B, fiStar, delta, gamma: gm, xi } = MAREE.costa, fi = Math.min(1, F) / fiStar, pg = Math.pow(fi, gm), Ft = (1 - xi) * erf((Math.sqrt(PI) / (2 * (1 - xi))) * fi * (1 + pg));
  return (1 + (delta === gm ? pg : Math.pow(fi, delta))) / Math.pow(1 - Ft, B * fiStar);
}
// la viscosità cinematica della roccia del mantello (m²/s) a T, con una frazione fusa F
export const viscositaCinematicaRoccia = (T, F = 0) => (MAREE.roccia.nuRif * Math.exp(MAREE.roccia.Enu / (R_GAS * T))) / epsilonFuso(F);
// la viscosità dinamica (Pa·s) e la rigidità (Pa) della roccia a T con frazione fusa F
export const viscositaRoccia = (T, F = 0, densita = MAREE.roccia.densita) => densita * viscositaCinematicaRoccia(T, F);
export const rigiditaRoccia = (F = 0) => MAREE.roccia.rigidita / epsilonFuso(F);
// il ghiaccio: η₀ al punto di fusione, più viscoso al freddo
export const viscositaGhiaccio = (T, { eta0 = MAREE.ghiaccio.eta0, Tfusione = MAREE.ghiaccio.Tfusione } = {}) => eta0 * Math.exp(Math.min(200, (MAREE.ghiaccio.E / (R_GAS * Tfusione)) * (Tfusione / T - 1)));
// (PRESTAZIONI: la stessa formula con gli argomenti in fila, per chi la chiede dentro un ciclo: nessun oggetto da creare)
export const viscositaGhiaccioA = (T, eta0, Tfusione) => eta0 * Math.exp(Math.min(200, (MAREE.ghiaccio.E / (R_GAS * Tfusione)) * (Tfusione / T - 1)));

// ---------- la cedevolezza complessa J*(ω) → [parte reale, parte immaginaria] (1/Pa; l'immaginaria è negativa)
// (PRESTAZIONI: il conto sta in cedevolezzaIn, che lascia le due parti in JR e JI senza creare vettori; coseno e seno di
// α·π/2 restano in memoria per l'ultimo α chiesto (chiave esatta). Le operazioni e il loro ordine sono quelli di sempre)
let JR = 0, JI = 0, alfaDi = NaN, cosAlfa = NaN, sinAlfa = NaN;
function cedevolezzaIn(rigidita, viscosita, omega, reologia, alfa, zeta) {
  const J = 1 / rigidita, viscoso = 1 / (viscosita * omega);
  if (reologia === 'maxwell') { JR = J; JI = -viscoso; return; }
  if (reologia !== 'andrade') throw new Error(`maree: reologia «${reologia}» sconosciuta (ci sono: andrade, maxwell)`);
  const x = Math.pow(omega * zeta * viscosita * J, -alfa) * gamma(1 + alfa);
  if (alfa !== alfaDi) { cosAlfa = Math.cos((alfa * PI) / 2); sinAlfa = Math.sin((alfa * PI) / 2); alfaDi = alfa; }
  JR = J * (1 + x * cosAlfa); JI = -(J * x * sinAlfa + viscoso);
}
export function cedevolezza(rigidita, viscosita, omega, { reologia = 'andrade', alfa = MAREE.andrade.alfa, zeta = MAREE.andrade.zeta } = {}) {
  cedevolezzaIn(rigidita, viscosita, omega, reologia, alfa, zeta); return [JR, JI];
}

// ---------- LA DISSIPAZIONE di un corpo omogeneo alla frequenza ω (rad/s)
// corpo: { massaKg, raggioM, rigidita (Pa), viscosita (Pa·s) }  (la materia allo stato in cui è: chi chiama la prende
// dalla storia del corpo, con viscositaRoccia / rigiditaRoccia / viscositaGhiaccio qui sopra)
// → { k2: [re, im], k2Reale, imK2 (= −Im k₂*, positivo: è il «k₂/Q»), Q (= |k₂*|/imK2), rigiditaEfficace (μ̃), omegaTau (ω·τ_M) }
// (c = 19/(2ρgR): quanto la rigidità pesa contro la gravità del corpo; non cambia finché il corpo è quello, e chi chiede la
// dissipazione dentro un ciclo — dissipazioneIn, più sotto — lo calcola una volta)
export const coefficienteDelCorpo = (M, R) => { const rho = M / ((4 / 3) * PI * R ** 3), g = (G * M) / (R * R); return 19 / (2 * rho * g * R); };
export function dissipazione(corpo, omega, opz = {}) {
  const { massaKg: M, raggioM: R, rigidita, viscosita } = corpo, c = coefficienteDelCorpo(M, R);
  if (!(omega > 0) || !(rigidita > 0) || !(viscosita > 0)) return { k2: [1.5 / (1 + c * (rigidita > 0 ? rigidita : 0)), 0], k2Reale: 1.5 / (1 + c * (rigidita > 0 ? rigidita : 0)), imK2: 0, Q: Infinity, rigiditaEfficace: c * (rigidita || 0), omegaTau: Infinity };
  const [jr, ji] = cedevolezza(rigidita, viscosita, omega, opz), j2 = jr * jr + ji * ji;
  // z = c/J* = c·conj(J*)/|J*|²;  k₂* = 1,5/(1 + z)
  const zr = (c * jr) / j2, zi = (-c * ji) / j2, d = (1 + zr) ** 2 + zi * zi, re = (1.5 * (1 + zr)) / d, im = (-1.5 * zi) / d;
  return { k2: [re, im], k2Reale: re, imK2: -im, Q: Math.hypot(re, im) / -im, rigiditaEfficace: c * rigidita, omegaTau: (omega * viscosita) / rigidita };
}
// (PRESTAZIONI) LA STESSA DISSIPAZIONE PER CHI LA CHIEDE DENTRO UN CICLO (storia.js a ogni passo della storia termica, lune.js):
// «c» è 19/(2ρgR) del corpo, che non cambia finché il corpo è quello: lo dà coefficienteDelCorpo, una volta; qui si
// riempiono solo esce.imK2 e esce.k2Reale (gli stessi numeri di dissipazione(), bit per bit: stesse operazioni nello
// stesso ordine, senza il Q e senza oggetti nuovi)
export function dissipazioneIn(c, rigidita, viscosita, omega, opz, esce) {
  if (!(omega > 0) || !(rigidita > 0) || !(viscosita > 0)) { esce.k2Reale = 1.5 / (1 + c * (rigidita > 0 ? rigidita : 0)); esce.imK2 = 0; return esce; }
  const reologia = opz && opz.reologia !== undefined ? opz.reologia : 'andrade', alfa = opz && opz.alfa !== undefined ? opz.alfa : MAREE.andrade.alfa, zeta = opz && opz.zeta !== undefined ? opz.zeta : MAREE.andrade.zeta;
  cedevolezzaIn(rigidita, viscosita, omega, reologia, alfa, zeta);
  const jr = JR, ji = JI, j2 = jr * jr + ji * ji, zr = (c * jr) / j2, zi = (-c * ji) / j2, d = (1 + zr) ** 2 + zi * zi, re = (1.5 * (1 + zr)) / d, im = (-1.5 * zi) / d;
  esce.k2Reale = re; esce.imK2 = -im; return esce;
}
// la geometria del calore di marea di un corpo sincrono: ciò che moltiplica −Im(k₂*) (W)
//   Mospite: la massa del corpo che alza la marea (kg); raggioM: il raggio di chi è deformato; aM, eccentricita, obliquita (gradi) dell'orbita
export function forzanteMareale({ Mospite, raggioM, aM, eccentricita = 0, obliquita = 0 }) {
  if (!(Mospite > 0) || !(aM > 0)) return 0;
  const n = Math.sqrt((G * Mospite) / aM ** 3), s = Math.sin((obliquita * PI) / 180);
  return ((10.5 * eccentricita * eccentricita + 1.5 * s * s) * G * Mospite * Mospite * raggioM ** 5 * n) / aM ** 6;
}
// LA POTENZA DI MAREA (W) dissipata in un corpo: forzante × −Im(k₂*) × la parte del volume che dissipa
export const potenzaMareale = (orbita, imK2, parteDelVolume = 1) => forzanteMareale(orbita) * imK2 * parteDelVolume;
// il moto medio (rad/s): la frequenza della marea di un corpo sincrono
export const motoMedio = (Mospite, aM) => Math.sqrt((G * Mospite) / aM ** 3);

// ---------- IL GUSCIO DI GHIACCIO SOPRA UN OCEANO: la membrana (Beuthe 2015)
// la rigidità complessa μ* = 1/J* → [reale, immaginaria] (Pa)
export function rigiditaComplessa(rigidita, viscosita, omega, opz = {}) { const [jr, ji] = cedevolezza(rigidita, viscosita, omega, opz), j2 = jr * jr + ji * ji; return [jr / j2, -ji / j2]; }
// (PRESTAZIONI: la stessa, con la reologia di norma (Andrade, α e ζ di MAREE), riempiendo esce[0] e esce[1] senza creare vettori)
export function rigiditaComplessaIn(rigidita, viscosita, omega, esce) { cedevolezzaIn(rigidita, viscosita, omega, 'andrade', MAREE.andrade.alfa, MAREE.andrade.zeta); const jr = JR, ji = JI, j2 = jr * jr + ji * ji; esce[0] = jr / j2; esce[1] = -ji / j2; return esce; }
// corpo: { massaKg, raggioM, spessore (m, del guscio), rigidita: [re, im] (la media nello spessore, Pa), densitaOceano, poisson }
// → { h2: [re, im], k2: [re, im], k2Reale, imK2 (= −Im k₂), Lambda: [re, im], fluido: { h2, k2 } (senza guscio), sottile (d/R) }
export function dissipazioneGuscio({ massaKg: M, raggioM: R, spessore: d, rigidita, densitaOceano = 1000, poisson = MAREE.ghiaccio.poisson }) {
  const rhoB = M / ((4 / 3) * PI * R ** 3), g = (G * M) / (R * R), xi = Math.min(1, densitaOceano / rhoB), c = ((8 * (1 + poisson)) / (5 + poisson) / (densitaOceano * g * R)) * (d / R);
  const lr = c * rigidita[0], li = c * rigidita[1], ar = 1 + lr - 0.6 * xi, den = ar * ar + li * li, hr = ar / den, hi = -li / den;
  return { h2: [hr, hi], k2: [0.6 * xi * hr, 0.6 * xi * hi], k2Reale: 0.6 * xi * hr, imK2: -0.6 * xi * hi, Lambda: [lr, li], fluido: { h2: 1 / (1 - 0.6 * xi), k2: (0.6 * xi) / (1 - 0.6 * xi) }, sottile: d / R };
}
