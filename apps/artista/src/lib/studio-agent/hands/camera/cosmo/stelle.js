// stelle.js — le stelle calcolate dalla loro struttura: nessuna formula L(M), nessun numero regolato sul Sole.
//
// Una stella è una palla di gas che sta ferma perché quattro equazioni tornano insieme, in ogni guscio di massa m:
//   dr/dm = 1/(4πr²ρ)            la massa riempie lo spazio;
//   dP/dm = −G·m/(4πr⁴)          la pressione regge il peso degli strati di sopra;
//   dl/dm = ε                    la luce che attraversa il guscio cresce dell'energia nucleare prodotta lì;
//   dT/dm = ∇·(T/P)·dP/dm        la temperatura cala verso l'esterno quanto serve a portare fuori quella luce:
//                                ∇ = 3κlP/(16πacGmT⁴) dove bastano i fotoni; dove non bastano (criterio di
//                                Schwarzschild: ∇rad > ∇ad) il gas ribolle, e ∇ è quello adiabatico (o, vicino alla
//                                superficie dove la convezione è inefficiente, quello della lunghezza di mescolamento).
// Qui si INTEGRANO (Runge-Kutta 4): dal centro in fuori (in x = m^(2/3): lì niente diverge) e dalla fotosfera in
// dentro (in ln P), fino a metà della massa; le quattro incognite (pressione e temperatura al centro, raggio,
// luminosità) si trovano chiedendo che le due integrazioni si incontrino (tiro, con Newton-Broyden). Al bordo:
// atmosfera grigia di Eddington (T = T_eff dove la profondità ottica è 2/3; lì P_gas = (2/3)(g/κ)(1 − κL/4πcGM)).
//
// CHE COSA C'È DENTRO, e da dove viene:
//   · LO STATO DELLA MATERIA: molecole H₂, atomi, ioni ed elettroni in equilibrio (Saha), con gli elettroni di Fermi
//     a qualunque degenerazione (integrali di Fermi-Dirac calcolati), la luce (aT⁴/3), la ionizzazione per pressione
//     (il potenziale di ionizzazione calato dagli ioni vicini, modello della sfera ionica; il peso degli stati legati
//     alla Planck-Larkin, che si spegne con continuità). Entropia alla Sackur-Tetrode; gradiente adiabatico, calore
//     specifico e dilatazione dalle sue derivate (così le zone di ionizzazione e di dissociazione vengono da sole).
//   · L'OPACITÀ, calcolata dai processi a ogni frequenza e poi mediata alla Rosseland: diffusione sugli elettroni
//     liberi (Thomson), frenamento (libero-libero, Kramers), fotoionizzazione (legato-libero, Kramers idrogenoide) di
//     H, He e degli otto metalli più abbondanti. Quanti elettroni legati ha ogni guscio di ogni metallo lo dice
//     l'«atomo medio»: gusci idrogenoidi con lo schermo di Slater, occupati alla Fermi-Dirac con il potenziale
//     chimico degli elettroni liberi, in modo coerente. È così che il «fattore di ghigliottina» dei libri emerge
//     (gli atomi spogliati dal calore non assorbono più), invece di essere un coefficiente.
//   · L'ENERGIA NUCLEARE: catena protone-protone e ciclo CN, con il picco di Gamow integrato numericamente (la
//     barriera di Coulomb attraversata per effetto tunnel) e lo schermo degli elettroni (Debye o sfera ionica).
//   · LA VITA: l'idrogeno cala guscio per guscio (48 gusci) al ritmo delle reazioni; le zone convettive si mescolano;
//     la struttura si ricalcola a ogni passo, fino all'1% dell'idrogeno al centro (fine della sequenza principale).
//   · LE NANE BRUNE (sotto la massa minima): sfere tutte convettive che si stringono irradiando l'energia di gravità.
//   · LA STELLA GIOVANE (luceGiovane): prima della sequenza principale ogni stella si stringe allo stesso modo, più grande e
//     più luminosa (a un milione di anni il Sole ~2 volte la luce di età zero, una nana rossa di 0,3 M☉ ~25 volte).
// Il calcolo costa minuti: lo fa una volta `node strumenti/tabella_stelle.mjs`, che scrive stelle_tabella.js
// (7 metallicità × 36 masse × ~10 età). stella() interpola quella tabella in un microsecondo. La tabella è un
// RISULTATO di questo file, rigenerabile: se si cambia una costante o una legge va rifatta.
//
// CHE COSA EMERGE (non è scritto da nessuna parte): L, R, T, T_centro e la vita in funzione di massa, metalli ed età;
// il Sole (a 4,57 miliardi di anni: L = 0,92 L☉, R = 1,01 R☉, T = 5630 K, centro a 15,2 milioni di K, vita 10,1 miliardi di anni); la pendenza massa–luminosità; chi è tutta convettiva (sotto 0,38 M☉) e dove comincia la
// zona convettiva delle altre; il nucleo convettivo delle stelle del CNO; la MASSA MINIMA (0,079 M☉ con i metalli del Sole, 0,089 con cento volte meno M☉: sotto, gli
// elettroni degeneri fermano la contrazione prima che l'idrogeno pareggi le perdite); il Sole giovane più debole
// (del 27%); le stelle povere di metalli più calde e luminose; il nucleo di elio che resta, e con lui il confine
// nana bianca / supernova (dove supera la massa di Chandrasekhar) e la massa dei buchi neri.
//
// DATI DI LABORATORIO E LEGGI MISURATE (usati così, non derivati; i numeri sono in DATI):
//   · le reazioni lente: p+p→d, S(0) = 4,01·10⁻²² keV·b (calcolato dalla teoria debole: è troppo lenta per misurarla),
//     e ¹⁴N(p,γ)¹⁵O, S(0) = 1,66 keV·b (misurato, LUNA), con le derivate (Adelberger et al. 2011, Rev. Mod. Phys. 83,
//     195, tabella I: verificato sull'articolo); l'energia di 4 ¹H → ⁴He (26,731 MeV) e quella dei neutrini;
//   · la prima ionizzazione dell'elio (24,587 eV; le altre energie atomiche vengono dalle costanti), la molecola H₂
//     (legame 4,478 eV, rotazione 85,4 K, vibrazione 6332 K), lo ione H⁻ (0,754 eV);
//   · le regole di Slater per lo schermo tra elettroni (0,30/0,35 nello stesso guscio, 0,85 dal guscio sotto, 1 dai più
//     interni): empiriche, ma sono fisica atomica, non stelle (danno le energie di ionizzazione entro il 10–20%);
//   · la composizione: il Sole alla nascita (X = 0,7155, Y = 0,2703, Z = 0,0142) e le abbondanze dei metalli (Asplund
//     et al. 2009); l'elio del Big Bang (0,247); α = 1/137,036;
//   · sotto i 10⁴ K, dove l'opacità è fatta da ioni negativi e molecole che l'atomo medio non descrive: H⁻,
//     2,5·10⁻³¹·(Z/0,02)·ρ^½·T⁹ cm²/g (Hansen, Kawaler & Trimble 2004: vale tra 3000 e 6000 K; sopra è prolungata con
//     l'equilibrio di Saha dello ione), e molecole, 10⁻⁸·ρ^⅔·T³ cm²/g (Bell & Lin 1994). Sono le due sole leggi di
//     opacità prese già fatte; alla fotosfera del Sole danno circa il triplo del valore vero;
//   · la massa delle nane bianche in funzione della massa iniziale (Cummings et al. 2018, relazione MIST: verificata
//     sull'articolo): dipende dalla massa persa da gigante, che qui non si calcola;
//   · il confine stella di neutroni / buco nero: nucleo di elio sopra 7 M☉ (dalle simulazioni di collasso e dal fatto
//     che non si vedono supernove da stelle sopra ~20 M☉; valore indicativo, citato a memoria).
// PARAMETRO LIBERO (uno): la lunghezza di mescolamento, 1,8 altezze di scala di pressione. È un valore dei libri
// (i modelli solari veri trovano 1,6–2,0 tarandosi sul raggio del Sole); qui NON è stato regolato.
// Nessun altro numero è stato scelto guardando L, R o T del Sole o di altre stelle.
// SEMPLIFICAZIONI:
//   · l'opacità non ha le righe (legato-legato) e usa fattori di Gaunt uguali a 1: viene giusta entro ±40% nel Sole
//     (troppo alta al centro, troppo bassa a 1–2 milioni di K), e manca parte del «picco del ferro» a 2·10⁵ K;
//   · niente conduzione degli elettroni, niente correzioni di Coulomb alla pressione, elettroni mai relativistici;
//     la massa di un barione è m_p; i metalli contano nella pressione come completamente ionizzati;
//   · della catena pp l'energia e i neutrini del ramo I, a regime; del ciclo solo CN (l'ossigeno non entra);
//   · il nucleo convettivo, dopo che ha cominciato a bruciare, non si allarga più (criterio di Ledoux, a gradino);
//     niente sovrasconfinamento, rotazione, campi, perdita di massa, diffusione degli elementi;
//   · la contrazione prima della sequenza principale (luceGiovane) è quella di una sfera tutta convettiva (la traccia di
//     Hayashi, la stessa delle nane brune): senza il deuterio e senza la fase radiativa di Henyey delle stelle sopra ~0,5 M☉;
//   · la MASSA MASSIMA è un criterio, non un muro: la massa a cui al centro la pressione della luce uguaglia quella
//     del gas (≈ 137 M☉). L'integrazione arriva fino a 130 M☉; oltre, stella() estrapola;
//   · la fine: nana bianca se il nucleo di elio rimasto è sotto la massa di Chandrasekhar; la stella di neutroni ha la
//     massa di Chandrasekhar meno l'energia di legame (3/5·GM²/R); il buco nero ha la massa del nucleo di elio;
//   · le nane brune: struttura di polìtropo n = 3/2 (esatta per una sfera adiabatica con P ∝ ρ^5/3), energia dal
//     viriale, niente deuterio; sotto ~1500 K la fotosfera qui descritta non vale più (polveri);
//   · dopo la sequenza principale (giganti) qui non c'è niente: stella() resta ferma all'ultimo stato.
// CHE COSA NON TORNA (misurato da test/test_stelle.mjs, che lo stampa senza allargare le soglie):
//   · il Sole: L −8%, centro a 15,2 (non 15,7) milioni di K; la zona convettiva comincia a 0,84 R invece che a 0,71
//     (0,3% della massa invece del 2,4%): a 1–2 milioni di K manca opacità (le righe);
//   · tra 1,5 e 3 M☉ i raggi vengono più piccoli del 15–25% e le temperature più alte del 4–16% (Sirio: R −17%;
//     Procione: R −22%; Vega): nell'involucro manca l'opacità delle righe; L torna entro il 20%;
//   · metà della luce viene dal CNO da 1,7 M☉ in su (a metà vita; 2,15 alla nascita), non da 1,3 come nei libri: con il
//     tasso misurato oggi (LUNA, metà di quello vecchio) e il solo C+N. Il nucleo convettivo compare a 1,35 M☉;
//   · le nane rosse vengono un po' deboli e fredde (0,2 M☉: 0,0047 L☉ invece di ~0,0055; Proxima −9% in L, −8% in T);
//   · le stelle più massicce a fine sequenza si gonfiano troppo (130 M☉ arriva a 170 R☉);
//   · le nane brune povere di metalli (Z < 0,3) non riescono: l'atmosfera fredda e densa che ne esce chiederebbe
//     l'assorbimento per urti dell'H₂, che manca; si usa la curva di raffreddamento di Z = 0,3.
//
// La forma dei dati è quella di leggi.js: stella() → { L, R, T, vita, … }, fine() → { tipo, massa, raggio, B, supernova }.
import { COSTANTI, MSOLE, RSOLE, LSOLE, ANNO, etaUniverso, massaChandrasekhar, massaMassimaNeutroni, raggioNanaBianca, raggioNeutroni } from './leggi.js';
import { TABELLA } from './stelle_tabella.js';

const K = COSTANTI;
export const ALFA = 1 / 137.036; // la costante di struttura fine (misurata): e²/(4πε₀) = α·ħ·c
const A_RAD = (4 * K.sigma) / K.c, MB = K.mp, EV = K.e, MEV = 1e6 * K.e, KEVB = 1e3 * K.e * 1e-28, PI4 = 4 * Math.PI;
const E2 = ALFA * K.hbar * K.c; // e²/(4πε₀)
const A0 = K.hbar / (K.me * K.c * ALFA), RY = 0.5 * ALFA * ALFA * K.me * K.c * K.c; // raggio di Bohr ed energia di Rydberg
const SIGMA_T = ((8 * Math.PI) / 3) * (E2 / (K.me * K.c * K.c)) ** 2; // la sezione d'urto di Thomson
const SIGMA_K = ((64 * Math.PI * ALFA) / (3 * Math.sqrt(3))) * A0 * A0; // fotoionizzazione di Kramers alla soglia dell'idrogeno (7,9·10⁻²² m²)

export const DATI = {
  S11: [4.01e-22 * KEVB, 4.49e-24 * 1e-28, 0], // p+p → d: S(0), S'(0), S''(0) in J·m², m², m²/J (Adelberger et al. 2011)
  S114: [1.66 * KEVB, -3.3e-3 * 1e-28, (4.4e-5 * 1e-28) / (1e3 * K.e)], // ¹⁴N(p,γ)¹⁵O
  Q4: 26.731 * MEV, nuPP: 2 * 0.265 * MEV, nuCNO: 1.71 * MEV, // 4 ¹H → ⁴He, e ciò che si portano via i neutrini
  elio1: 24.587 * EV, // la prima ionizzazione dell'elio (la seconda è 4 Rydberg, quella dell'idrogeno 1: dalle costanti)
  H2: { D0: 4.478 * EV, rot: 85.4, vib: 6332 }, // la molecola H₂: energia di legame, temperature di rotazione e vibrazione (K)
  Hmeno: 7.9e-34, molecole: 1e-11, HmenoLega: 0.754 * EV, // (e l'energia di legame dello ione H⁻) // opacità dello ione H⁻ (Hansen, Kawaler & Trimble 2004) e delle molecole (Bell & Lin 1994), in m²/kg
  ZSOLE: 0.0142, YSOLE: 0.2703, YPRIMO: 0.247, // la composizione del Sole alla nascita (Asplund et al. 2009) e l'elio del Big Bang
  // i metalli del Sole: [carica del nucleo, numero di massa, log₁₀ dell'abbondanza in numero con H = 12] (Asplund et al. 2009)
  metalli: [[6, 12, 8.43], [7, 14, 7.83], [8, 16, 8.69], [10, 20, 7.93], [12, 24, 7.60], [14, 28, 7.51], [16, 32, 7.12], [26, 56, 7.50]],
  slater: [0.30, 0.35, 0.85, 1], // le regole di Slater per lo schermo tra elettroni: stesso guscio (1s; gli altri), guscio sotto, più interni
  alfaConv: 1.8, // la lunghezza di mescolamento in altezze di scala di pressione: PARAMETRO LIBERO, valore dei libri, non regolato
  elioBucoNero: 7,
  massaFinale: [[2.85, 0.08, 0.489], [3.6, 0.187, 0.184], [Infinity, 0.107, 0.471]],
};
// la frazione in massa di ogni metallo dentro Z, e quanto ¹⁴N c'è quando il ciclo CN è a regime (tutto il C e l'N)
const METALLI = (() => { const w = DATI.metalli.map(([z, a, e]) => a * 10 ** (e - 12)), s = w.reduce((x, y) => x + y, 0); return DATI.metalli.map(([z, a], i) => ({ z, a, w: w[i] / s })); })();
const CN = 14 * (METALLI[0].w / 12 + METALLI[1].w / 14);
export function composizione(Z = 1) { const Zm = Z * DATI.ZSOLE, Y = DATI.YPRIMO + ((DATI.YSOLE - DATI.YPRIMO) / DATI.ZSOLE) * Zm; return { X: 1 - Y - Zm, Y, Zm }; }

// ---------- GLI ELETTRONI: gas di Fermi non relativistico, a qualunque degenerazione (integrali di Fermi-Dirac calcolati)
// D = nₑλ³/2; G = Pₑ/(nₑkT); η = potenziale chimico / kT. Si calcolano al primo uso.
let FD = null;
function fermi() {
  const fd = (eta) => {
    if (eta > 40) { const e2 = (Math.PI / eta) ** 2; return [(4 / (3 * Math.sqrt(Math.PI))) * eta ** 1.5 * (1 + e2 / 8 + (7 / 640) * e2 * e2), (8 / (15 * Math.sqrt(Math.PI))) * eta ** 2.5 * (1 + (5 / 8) * e2 - (7 / 384) * e2 * e2)]; }
    const tmax = Math.sqrt(Math.max(eta, 0) + 45), n = 1200, h = tmax / n; let a = 0, b = 0;
    for (let i = 1; i <= n; i++) { const t = i * h, t2 = t * t, w = (i === n ? 1 : i % 2 ? 4 : 2) / (Math.exp(t2 - eta) + 1); a += w * t2; b += w * t2 * t2; }
    return [((2 / Math.sqrt(Math.PI)) * 2 * a * h) / 3, ((4 / (3 * Math.sqrt(Math.PI))) * 2 * b * h) / 3];
  };
  const es = [], lD = [], Gs = [];
  for (let eta = -8; eta <= 160; eta += eta < 12 ? 0.1 : eta < 40 ? 0.5 : 4) { const [f1, f3] = fd(eta); es.push(eta); lD.push(Math.log(f1)); Gs.push(f3 / f1); }
  const L0 = -7, L1 = 7.1, dL = 0.05, n = Math.round((L1 - L0) / dL) + 1, G = new Float64Array(n), E = new Float64Array(n);
  for (let i = 0, j = 0; i < n; i++) { const l = L0 + i * dL; while (j < lD.length - 2 && lD[j + 1] < l) j++; const u = (l - lD[j]) / (lD[j + 1] - lD[j]); G[i] = Gs[j] + u * (Gs[j + 1] - Gs[j]); E[i] = es[j] + u * (es[j + 1] - es[j]); }
  return (FD = { L0, L1, dL, n, G, E });
}
const elG = [0, 0]; // G, η
function elettroni(lnD) {
  if (lnD <= -7) { const D = Math.exp(lnD); elG[0] = 1 + D / 5.656854; elG[1] = lnD + D / 2.828427; return elG; }
  if (lnD >= 7) { const eta = Math.pow(0.75 * Math.sqrt(Math.PI) * Math.exp(lnD), 2 / 3); elG[0] = 0.4 * eta; elG[1] = eta; return elG; }
  // (interpolazione cubica: pressione ed entropia devono avere derivate continue)
  const F = FD || fermi(), t = (lnD + 7) / F.dL, i = Math.min(F.n - 3, Math.max(1, t | 0)), u = t - i, u2 = u * u, u3 = u2 * u;
  const w0 = 0.5 * (-u3 + 2 * u2 - u), w1 = 0.5 * (3 * u3 - 5 * u2 + 2), w2 = 0.5 * (-3 * u3 + 4 * u2 + u), w3 = 0.5 * (u3 - u2);
  elG[0] = w0 * F.G[i - 1] + w1 * F.G[i] + w2 * F.G[i + 1] + w3 * F.G[i + 2]; elG[1] = w0 * F.E[i - 1] + w1 * F.E[i] + w2 * F.E[i + 1] + w3 * F.E[i + 2]; return elG;
}
const LQE = 1.5 * Math.log((2 * Math.PI * K.hbar * K.hbar) / (K.me * K.kB)); // ln λₑ³ = LQE − 1,5 ln T
const lnQ = (m, T) => 1.5 * Math.log((m * K.kB * T) / (2 * Math.PI * K.hbar * K.hbar)); // ln della concentrazione quantica

// ---------- LO STATO DELLA MATERIA a densità e temperatura date: molecole H₂, atomi, ioni ed elettroni in equilibrio
// (Saha, con gli elettroni di Fermi; il potenziale di ionizzazione calato dalla vicinanza degli altri ioni: è la
// ionizzazione per pressione), più la luce. Dà pressione, entropia, e chi c'è.
// il peso statistico di uno stato legato di energia χ (in unità di kT): e^χ − 1 − χ (Planck-Larkin), che si spegne
// con continuità quando la ionizzazione per pressione porta χ a zero
const peso = (c) => (c > 0 ? (c < 1e-3 ? 0.5 * c * c : Math.exp(Math.min(c, 600)) - 1 - c) : 0);
const S = { P: 0, s: 0, ne: 0, eta: 0, lnD: 0, nH0: 0, np: 0, nH2: 0, nHe0: 0, nHe1: 0, nHe2: 0, d1: 0, mu: 0, xH: 0 };
function stato(rho, T, X, Zm) {
  const Y = Math.max(0, 1 - X - Zm), n = rho / MB, nH = X * n, nHe = (Y * n) / 4, nZ = (Zm * n) / 17, kT = K.kB * T, lam = LQE - 1.5 * Math.log(T) - Math.LN2;
  const R0 = Math.cbrt(3 / (PI4 * (nH + nHe + nZ))), d1 = (1.5 * E2) / R0; // il calo del potenziale di ionizzazione (sfera ionica), per carica finale 1
  const umax = Math.log(nH + 2 * nHe + 8.5 * nZ);
  let u = umax, np = nH, nH0 = 0, nH2 = 0, he0 = 0, he1 = 0, he2 = nHe, eta = 0;
  const cH = (RY - d1) / kT, c1 = (DATI.elio1 - d1) / kT, c2 = (4 * RY - 2 * d1) / kT;
  if (cH > 0 || c1 > 0 || c2 > 0) { // c'è ancora qualche stato legato: si cerca la densità di elettroni che pareggia le cariche
    const th = DATI.H2.vib / T, zi = ((T / DATI.H2.rot) * 2) / (1 - Math.exp(-th)), wD = peso((DATI.H2.D0 - d1) / kT), wH = peso(cH), w1 = peso(c1), w2 = peso(c2);
    const lK = wD > 0 ? 2 * lnQ(MB, T) - lnQ(2 * MB, T) + Math.log(16 / zi) - Math.log(wD) : Infinity; // ln di n(H)²/n(H₂)
    const f = (u) => {
      const ee = Math.exp(Math.min(300, (eta = elettroni(u + lam)[1]))), aH = 2 * ee * wH;
      if (aH > 0) { const b = 1 + 1 / aH, q = Math.exp(Math.min(600, Math.log(8 * Math.max(nH, 1e-300)) - lK)); nH0 = (2 * nH) / (b + Math.sqrt(b * b + q)); np = nH0 / aH; nH2 = 0.5 * (nH - nH0 - np); } else { nH0 = 0; np = nH; nH2 = 0; }
      const r1 = 0.5 * ee * w1, r2 = 2 * ee * w2;
      he2 = nHe / (1 + r2 + r2 * r1); he1 = r2 * he2; he0 = r1 * he1;
      return u - Math.log(Math.max(np + he1 + 2 * he2 + (8.5 * nZ * np) / Math.max(nH, 1e-300), 1e-200));
    };
    let b = umax, fb = f(b);
    if (fb > 1e-10) { // la radice sta tra ln nₑ(u massimo) e u massimo: regula falsi (Illinois)
      let a = b - fb, fa = f(a), lato = 0;
      for (let it = 0; it < 100 && b - a > 1e-13 && fa < 0; it++) {
        const c = Math.min(b, Math.max(a, (a * fb - b * fa) / (fb - fa))), fc = f(c);
        if (fc > 0) { b = c; fb = fc; if (lato === 1) fa *= 0.5; lato = 1; } else { a = c; fa = fc; if (lato === -1) fb *= 0.5; lato = -1; }
      }
      u = fa >= 0 ? a : 0.5 * (a + b); f(u);
    } else u = b;
  } else eta = elettroni(u + lam)[1];
  const ne = Math.exp(u), g = elettroni(u + lam);
  S.P = (nH0 + np + Math.max(nH2, 0) + nHe + nZ + ne * g[0]) * kT + (A_RAD * T ** 4) / 3;
  let s = (ne / n) * (2.5 * g[0] - g[1]) + (4 * A_RAD * T ** 3) / (3 * n * K.kB);
  if (np > 0) s += (np / n) * (2.5 + lnQ(MB, T) + Math.log(2 / np));
  if (nH0 > 1e-250) s += (nH0 / n) * (2.5 + lnQ(MB, T) + Math.log(4 / nH0));
  if (nH2 > 1e-250) { const th = DATI.H2.vib / T, ex = Math.exp(-th), zi = ((T / DATI.H2.rot) * 2) / (1 - ex); s += (nH2 / n) * (2.5 + lnQ(2 * MB, T) + Math.log(zi / nH2) + 1 + (th * ex) / (1 - ex)); }
  const lq4 = lnQ(4 * MB, T);
  if (he0 > 1e-250) s += (he0 / n) * (2.5 + lq4 - Math.log(he0));
  if (he1 > 1e-250) s += (he1 / n) * (2.5 + lq4 + Math.log(2 / he1));
  if (he2 > 1e-250) s += (he2 / n) * (2.5 + lq4 - Math.log(he2));
  S.s = s; S.ne = ne; S.eta = g[1]; S.lnD = u + lam; S.nH0 = nH0; S.np = np; S.nH2 = Math.max(nH2, 0); S.nHe0 = he0; S.nHe1 = he1; S.nHe2 = he2; S.d1 = d1; S.xH = nH > 0 ? np / nH : 1;
  return S;
}
// la densità a pressione e temperatura date (secante in ln ρ)
function densita(P, T, X, Zm, rho0 = 0) {
  const Pg = P - (A_RAD * T ** 4) / 3; if (!(Pg > 0)) return NaN;
  let a = Math.log(rho0 > 0 ? rho0 : (Pg * 0.6 * MB) / (K.kB * T)), fa = Math.log(stato(Math.exp(a), T, X, Zm).P - (A_RAD * T ** 4) / 3) - Math.log(Pg), b = a - fa, fb;
  for (let it = 0; it < 40; it++) {
    fb = Math.log(stato(Math.exp(b), T, X, Zm).P - (A_RAD * T ** 4) / 3) - Math.log(Pg);
    if (Math.abs(fb) < 1e-12) break;
    const pend = (fb - fa) / (b - a), c = b - fb / (pend > 0.2 ? pend : 1); a = b; fa = fb; b = c;
  }
  return Math.exp(b);
}
// le derivate che servono alla convezione, a P e T dati: ρ, gradiente adiabatico, calore specifico, δ = −(∂lnρ/∂lnT)_P
const TD = { rho: 0, nad: 0, cp: 0, delta: 0, s: 0 };
function termo(P, T, X, Zm, rho0 = 0, nota = false) {
  const rho = nota ? rho0 : densita(P, T, X, Zm, rho0), h = 2e-3, s0 = stato(rho, T, X, Zm).s, p0 = S.P;
  const st = stato(rho, T * (1 + h), X, Zm), sT = (st.s - s0) / h, pT = (Math.log(st.P) - Math.log(p0)) / h;
  const sr = stato(rho * (1 + h), T, X, Zm), sR = (sr.s - s0) / h, pR = (Math.log(sr.P) - Math.log(p0)) / h;
  TD.rho = rho; TD.s = s0; TD.delta = pT / pR; TD.nad = 1 / (pT - (pR * sT) / sR); TD.cp = (K.kB / MB) * (sT - (sR * pT) / pR);
  return TD;
}

// ---------- L'OPACITÀ, DAI PROCESSI. A ogni frequenza la materia assorbe per: diffusione sugli elettroni liberi
// (Thomson), frenamento (libero-libero, formula di Kramers), fotoionizzazione (legato-libero, formula di Kramers
// per livelli idrogenoidi) di H, He e dei metalli. Quanti elettroni legati ci sono in ogni guscio lo dice la
// statistica (Saha per H e He; per i metalli l'«atomo medio»: gusci idrogenoidi schermati alla Slater, occupati
// alla Fermi-Dirac con il potenziale chimico degli elettroni liberi). Così il «fattore di ghigliottina» dei libri
// emerge: gli atomi spogliati non assorbono più. La media di Rosseland si fa numericamente sulle frequenze.
// Mancano le righe (legato-legato). Sotto i 10⁴ K si aggiungono lo ione H⁻ e le molecole (leggi misurate).
const NX = 140, XR = Float64Array.from({ length: NX }, (_, i) => 0.03 * Math.pow(1000, i / (NX - 1))); // hν/kT da 0,03 a 30
const WR = XR.map((x, i) => { const e = Math.exp(-x), dx = i === 0 ? XR[1] - XR[0] : i === NX - 1 ? XR[i] - XR[i - 1] : 0.5 * (XR[i + 1] - XR[i - 1]); return (x ** 4 * e) / (1 - e) ** 2 * dx; });
const WR0 = WR.reduce((a, b) => a + b, 0), AK = new Float64Array(NX);
const C_FF = ((4 * E2 ** 3) / (3 * K.me * 2 * Math.PI * K.hbar * K.c)) * Math.sqrt((2 * Math.PI) / (3 * K.kB * K.me)); // Kramers, libero-libero
// l'energia totale di un atomo con gli elettroni N[n] nei gusci (Slater): −Ry·Σ N·(Q/n)²
function energiaAtomo(z, N) {
  let E = 0, dentroTot = 0;
  for (let n = 1; n <= 4; n++) {
    const Nn = N[n]; if (Nn > 0) { const Q = z - (dentroTot - (n > 1 ? N[n - 1] : 0)) * DATI.slater[3] - (n > 1 ? N[n - 1] * DATI.slater[2] : 0) - Math.max(0, Nn - 1) * DATI.slater[n === 1 ? 0 : 1]; if (Q > 0) E -= (Nn * Q * Q) / (n * n); }
    dentroTot += Nn;
  }
  return E * RY;
}
const NA = new Float64Array(5), NB = new Float64Array(5), BN = new Float64Array(5);
function opacitaAtomica(rho, T, X, Zm) {
  const st = stato(rho, T, X, Zm), kT = K.kB * T, n = rho / MB, eta = st.eta, d1 = st.d1, ne = st.ne, nu0 = kT / (2 * Math.PI * K.hbar);
  AK.fill(0);
  // un guscio con nel elettroni legati per m³, soglia Eth e carica efficace Q, numero quantico nq
  const soglia = (nel, Eth, Q, nq) => { if (!(nel > 0) || !(Eth > 0)) return; const c = (nel * SIGMA_K * Q ** 4 * (RY / kT) ** 3) / nq ** 5, x0 = Eth / kT; for (let i = NX - 1; i >= 0 && XR[i] >= x0; i--) AK[i] += c / XR[i] ** 3; };
  let ff = st.np + st.nHe1 + 4 * st.nHe2; // Σ nᵢ·zᵢ² per il frenamento
  for (let q = 1; q <= 4; q++) { // idrogeno neutro (livelli popolati alla Boltzmann) ed elio ionizzato una volta
    soglia(st.nH0 * q * q * Math.exp(-(RY * (1 - 1 / (q * q))) / kT), RY / (q * q) - d1, 1, q);
    soglia(st.nHe1 * q * q * Math.exp(-(4 * RY * (1 - 1 / (q * q))) / kT), (4 * RY) / (q * q) - 2 * d1, 2, q);
  }
  soglia(2 * st.nHe0, DATI.elio1 - d1, Math.sqrt(DATI.elio1 / RY), 1);
  for (const el of METALLI) { // i metalli: l'atomo medio
    const nel = (n * Zm * el.w) / el.a, z = el.z; NA.fill(0);
    // le occupazioni dei gusci, coerenti con le energie che esse stesse determinano: guscio per guscio (bisezione:
    // più elettroni nel guscio → si schermano → legame più debole → meno elettroni), due passate dall'interno
    const lega = (q, N) => { NB.set(NA); const N1 = Math.max(N, 1); NB[q] = N1; const E1 = energiaAtomo(z, NB); NB[q] = N1 - 1; return energiaAtomo(z, NB) - E1; }; // quanto costa togliere un elettrone
    const cala = (q, N) => { let leg = N; for (let k = 1; k <= 4; k++) if (k !== q) leg += NA[k]; return d1 * Math.max(1, z - leg + 1); };
    for (let giro = 0; giro < 2; giro++) for (let q = 1; q <= 4; q++) {
      const cap = 2 * q * q, occ = (N) => { const B = lega(q, N) - cala(q, N); return B > 0 ? cap / (Math.exp(Math.min(600, -B / kT - eta)) + 1) : 0; };
      let a = 0, b = cap; if (occ(cap) >= cap * (1 - 1e-9)) a = cap; else if (occ(0) <= 1e-12) b = 0;
      for (let it = 0; it < 26 && b - a > 1e-7; it++) { const m = 0.5 * (a + b); if (occ(m) > m) a = m; else b = m; }
      NA[q] = 0.5 * (a + b);
    }
    let legati = 0; for (let q = 1; q <= 4; q++) legati += NA[q];
    const dz = d1 * Math.max(1, z - legati + 1);
    for (let q = 1; q <= 4; q++) { BN[q] = lega(q, NA[q]); soglia(nel * NA[q], BN[q] - dz, Math.sqrt((Math.max(BN[q], 0) * q * q) / RY), q); }
    ff += nel * (z - legati) ** 2;
  }
  // la media di Rosseland (armonica, pesata con la derivata della curva di Planck)
  const cff = (C_FF * ne * ff) / (Math.sqrt(T) * nu0 ** 3), es = ne * SIGMA_T; let somma = 0;
  for (let i = 0; i < NX; i++) { const x = XR[i]; somma += WR[i] / (es + (1 - Math.exp(-x)) * (cff / x ** 3 + AK[i])); }
  let k = WR0 / somma / rho;
  // a bassa temperatura: lo ione H⁻ (finché l'idrogeno è neutro) e le molecole
  if (T < 3e4) {
    // lo ione H⁻: la legge misurata vale fino a 6000 K; oltre la si prolunga con la fisica (gli ioni H⁻ sono in equilibrio
    // di Saha con atomi neutri ed elettroni: n(H⁻) ∝ n(H)·nₑ·T^-3/2·e^(0,754 eV/kT)), agganciata al valore a 6000 K
    const tH = DATI.HmenoLega / K.kB, nH0 = st.nH0, neq = st.ne, xH = st.xH; let hm = DATI.Hmeno * (Zm / 0.02) * Math.sqrt(rho) * Math.min(T, 6000) ** 9;
    if (T > 6000) { const s6 = stato(rho, 6000, X, Zm), f6 = s6.nH0 * s6.ne * Math.exp(tH / 6000) * 6000 ** -1.5; hm *= f6 > 0 ? (nH0 * neq * Math.exp(tH / T) * T ** -1.5) / f6 : 0; }
    k += hm * (T > 6000 ? 1 : 1 - xH) + DATI.molecole * (Zm / DATI.ZSOLE) * Math.cbrt(rho * rho) * T ** 3 * (1 - xH);
  }
  return k;
}
// la tavola dell'opacità per una metallicità: ln κ su una griglia in log T, log R (R = ρ/T₆³ in g/cm³) e X; poi si interpola
const OT = { t0: 3.2, dt: 0.05, nt: 103, r0: -8, dr: 0.5, nr: 29, xs: [0, 0.25, 0.5, 0.78] };
const TAVOLE = new Map();
function tavolaOpacita(Zm) {
  const chiave = Zm.toPrecision(6); if (TAVOLE.has(chiave)) return TAVOLE.get(chiave);
  const t = new Float64Array(OT.nt * OT.nr * OT.xs.length);
  for (let ix = 0; ix < OT.xs.length; ix++) for (let it = 0; it < OT.nt; it++) for (let ir = 0; ir < OT.nr; ir++) {
    const lt = OT.t0 + it * OT.dt, T = 10 ** lt, rho = 10 ** (OT.r0 + ir * OT.dr + 3 * (lt - 6) + 3);
    t[(ix * OT.nt + it) * OT.nr + ir] = Math.log(opacitaAtomica(rho, T, Math.min(OT.xs[ix], 1 - Zm), Zm));
  }
  TAVOLE.set(chiave, t); return t;
}
// (interpolazione cubica in log T e log R, senza spigoli: al tiro servono derivate continue; lineare in X)
const CW = new Float64Array(8);
const cubica = (u, o) => { const u2 = u * u, u3 = u2 * u; CW[o] = 0.5 * (-u3 + 2 * u2 - u); CW[o + 1] = 0.5 * (3 * u3 - 5 * u2 + 2); CW[o + 2] = 0.5 * (-3 * u3 + 4 * u2 + u); CW[o + 3] = 0.5 * (u3 - u2); };
function kappa(rho, T, X, tav) {
  const lt = Math.log10(T), a = Math.min(OT.nt - 1.001, Math.max(0, (lt - OT.t0) / OT.dt)), b = Math.min(OT.nr - 1.001, Math.max(0, (Math.log10(rho) - 3 - 3 * (lt - 6) - OT.r0) / OT.dr));
  const it = a | 0, ir = b | 0; let ix = 0; while (ix < OT.xs.length - 2 && OT.xs[ix + 1] < X) ix++;
  const w = Math.min(1, Math.max(0, (X - OT.xs[ix]) / (OT.xs[ix + 1] - OT.xs[ix])));
  cubica(a - it, 0); cubica(b - ir, 4);
  let f0 = 0, f1 = 0;
  for (let i = 0; i < 4; i++) {
    const jt = Math.min(OT.nt - 1, Math.max(0, it - 1 + i)), o0 = (ix * OT.nt + jt) * OT.nr, o1 = o0 + OT.nt * OT.nr; let g0 = 0, g1 = 0;
    for (let j = 0; j < 4; j++) { const jr = Math.min(OT.nr - 1, Math.max(0, ir - 1 + j)); g0 += CW[4 + j] * tav[o0 + jr]; g1 += CW[4 + j] * tav[o1 + jr]; }
    f0 += CW[i] * g0; f1 += CW[i] * g1;
  }
  return Math.exp((1 - w) * f0 + w * f1);
}

// ---------- LE REAZIONI: il picco di Gamow integrato numericamente (la barriera di Coulomb attraversata per effetto tunnel)
function sigmaV(T, Z1, Z2, A1, A2, Sf) {
  const mr = ((A1 * A2) / (A1 + A2)) * MB, kT = K.kB * T, EG = 2 * mr * K.c ** 2 * (Math.PI * ALFA * Z1 * Z2) ** 2;
  const E0 = Math.pow((Math.sqrt(EG) * kT) / 2, 2 / 3), D = 4 * Math.sqrt((E0 * kT) / 3), a = Math.max(E0 * 1e-3, E0 - 3 * D), b = E0 + 5 * D, n = 128, h = (b - a) / n;
  const tau = (3 * E0) / kT; let s = 0;
  for (let i = 0; i <= n; i++) { const E = a + i * h, w = i === 0 || i === n ? 1 : i % 2 ? 4 : 2; s += w * (Sf[0] + Sf[1] * E + 0.5 * Sf[2] * E * E) * Math.exp(tau - E / kT - Math.sqrt(EG / E)); }
  return [Math.sqrt(8 / (Math.PI * mr)) * kT ** -1.5 * ((s * h) / 3), tau]; // ⟨σv⟩·e^τ, τ
}
const LT0 = Math.log(3e5), LT1 = Math.log(5e9), NT = 400, DLT = (LT1 - LT0) / (NT - 1);
let TAB = null;
function tassi() { TAB = { pp: new Float64Array(NT), cno: new Float64Array(NT) }; for (let i = 0; i < NT; i++) { const T = Math.exp(LT0 + i * DLT); let r = sigmaV(T, 1, 1, 1, 1, DATI.S11); TAB.pp[i] = Math.log(r[0]) - r[1]; r = sigmaV(T, 1, 7, 1, 14, DATI.S114); TAB.cno[i] = Math.log(r[0]) - r[1]; } return TAB; }
const QPP = (DATI.Q4 - DATI.nuPP) / 2, QCNO = DATI.Q4 - DATI.nuCNO, eps = [0, 0];
function energia(rho, T, X, Zm) { // W/kg dalla catena pp e dal ciclo CN
  const lt = (Math.log(T) - LT0) / DLT;
  if (lt < 0 || X <= 0) { eps[0] = eps[1] = 0; return eps; }
  const tb = TAB || tassi(), i = Math.min(NT - 2, lt | 0), u = lt - i, Y = 1 - X - Zm, n = rho / MB, np = n * X, kT = K.kB * T;
  // lo schermo degli elettroni attorno ai nuclei: Debye (debole) o sfera ionica (forte), il minore dei due
  const ne = n * (X + Y / 2 + Zm / 2), z2 = n * (X + Y + 4 * Zm) + ne, hw = (E2 / kT) * Math.sqrt((PI4 * E2 * z2) / kT), hs = ((0.9 * E2) / kT) * Math.cbrt((PI4 * ne) / 3);
  eps[0] = (0.5 * np * np * Math.exp(tb.pp[i] + u * (tb.pp[i + 1] - tb.pp[i]) + Math.min(hw, 1.1748 * hs)) * QPP) / rho;
  eps[1] = (np * ((n * CN * Zm) / 14) * Math.exp(tb.cno[i] + u * (tb.cno[i + 1] - tb.cno[i]) + Math.min(7 * hw, 5.385 * hs)) * QCNO) / rho;
  return eps;
}

// ---------- LA CONVEZIONE dove non è adiabatica: la lunghezza di mescolamento (Böhm-Vitense; Kippenhahn & Weigert cap. 7).
// ∇rad, ∇ad → il gradiente vero: soluzione della cubica (ξ−U)³ + (8U/9)(ξ²−U²−W) = 0, ∇ = ξ² − U² + ∇ad
function mescolamento(P, T, rho, kap, g, nrad, nad, cp, delta) {
  const Hp = P / (rho * g), lm = DATI.alfaConv * Hp, U = ((3 * A_RAD * K.c * T ** 3) / (cp * rho * rho * kap * lm * lm)) * Math.sqrt((8 * Hp) / (g * delta)), W = nrad - nad;
  let x = Math.sqrt(U * U + W); // da qui il metodo di Newton scende senza oscillare (la funzione è crescente e convessa)
  for (let it = 0; it < 40; it++) { const d = x - U, f = d * d * d + ((8 * U) / 9) * (x * x - U * U - W), dx = f / (3 * d * d + ((16 * U) / 9) * x); x -= dx; if (dx < 1e-12 * x) break; }
  return x * x - U * U + nad;
}

// ---------- LA STRUTTURA: le quattro equazioni, integrate (Runge-Kutta 4) dal centro in fuori e dalla fotosfera in dentro
//   dr/dm = 1/(4πr²ρ)   dP/dm = −Gm/(4πr⁴)   dl/dm = ε   dT/dm = ∇·(T/P)·dP/dm
// con ∇ = ∇rad = 3κlP/(16πacGmT⁴) dove basta la luce, ∇ad (o quello della lunghezza di mescolamento, fuori) dove ribolle.
const CR = 16 * Math.PI * A_RAD * K.c * K.G, NGU = 48; // gusci di massa della composizione
const QB = Float64Array.from({ length: NGU + 1 }, (_, k) => (k / NGU) ** 2), QC = Float64Array.from({ length: NGU }, (_, k) => ((k + 0.5) / NGU) ** 2);
function idrogeno(Xp, q) { if (q <= QC[0]) return Xp[0]; if (q >= QC[NGU - 1]) return Xp[NGU - 1]; const i = Math.min(NGU - 2, Math.floor(Math.sqrt(q) * NGU - 0.5)); return Xp[i] + ((q - QC[i]) / (QC[i + 1] - QC[i])) * (Xp[i + 1] - Xp[i]); }
const QFIT = 0.5, NFUORI = 160, D = new Float64Array(4), F = { rho: 0, conv: false, nrad: 0, nad: 0.4, epp: 0, ecno: 0 };
let registro = null; // se c'è, ogni passo lascia qui [q, r, P, T, ρ, l, convettivo, ε_pp, ε_cno]
// dal centro: variabili P, T, r², l in funzione di x = (m/M)^(2/3) (così vicino al centro niente diverge)
function fuori(M, Xp, Zm, tav, Pc, Tc) {
  const xf = Math.pow(QFIT, 2 / 3), x0 = 1e-4, h = (xf - x0) / NFUORI;
  let rhoG = densita(Pc, Tc, Xp[0], Zm);
  const der = (x, P, T, w, l) => {
    const q = x * Math.sqrt(x), m = M * q, X = idrogeno(Xp, q), rho = densita(P, T, X, Zm, rhoG), e = energia(rho, T, X, Zm), kap = kappa(rho, T, X, tav), dm = 1.5 * M * Math.sqrt(x), r = Math.sqrt(w);
    const nrad = (3 * kap * l * P) / (CR * m * T ** 4); let nab = nrad, conv = false;
    if (nrad > 0.2) { const t = termo(P, T, X, Zm, rho, true); if (nrad > t.nad) { nab = t.nad; conv = true; } F.nad = t.nad; }
    D[0] = (-K.G * m * dm) / (PI4 * w * w); D[1] = (nab * T * D[0]) / P; D[2] = dm / (2 * Math.PI * r * rho); D[3] = (e[0] + e[1]) * dm;
    F.rho = rho; F.conv = conv; F.nrad = nrad; F.epp = e[0]; F.ecno = e[1];
  };
  // il primo tratto, in serie: sfera di densità uniforme
  const e0 = energia(rhoG, Tc, Xp[0], Zm), ec = e0[0] + e0[1], k0 = kappa(rhoG, Tc, Xp[0], tav), m0 = M * x0 ** 1.5, r0 = Math.cbrt((3 * m0) / (PI4 * rhoG));
  let P = Pc - ((2 * Math.PI) / 3) * K.G * rhoG * rhoG * r0 * r0, nc = (3 * k0 * ec * Pc) / (CR * Tc ** 4); { const t = termo(Pc, Tc, Xp[0], Zm, rhoG); if (nc > t.nad) nc = t.nad; }
  let T = Tc * Math.pow(P / Pc, nc), w = r0 * r0, l = ec * m0, x = x0;
  for (let i = 0; i < NFUORI; i++) {
    der(x, P, T, w, l); rhoG = F.rho;
    if (registro) registro.push([x ** 1.5, Math.sqrt(w), P, T, F.rho, l, F.conv ? 1 : 0, F.epp, F.ecno]);
    const a0 = D[0], a1 = D[1], a2 = D[2], a3 = D[3];
    der(x + h / 2, P + (h / 2) * a0, T + (h / 2) * a1, w + (h / 2) * a2, l + (h / 2) * a3); const b0 = D[0], b1 = D[1], b2 = D[2], b3 = D[3];
    der(x + h / 2, P + (h / 2) * b0, T + (h / 2) * b1, w + (h / 2) * b2, l + (h / 2) * b3); const c0 = D[0], c1 = D[1], c2 = D[2], c3 = D[3];
    der(x + h, P + h * c0, T + h * c1, w + h * c2, l + h * c3);
    P += (h / 6) * (a0 + 2 * b0 + 2 * c0 + D[0]); T += (h / 6) * (a1 + 2 * b1 + 2 * c1 + D[1]); w += (h / 6) * (a2 + 2 * b2 + 2 * c2 + D[2]); l += (h / 6) * (a3 + 2 * b3 + 2 * c3 + D[3]); x += h;
    if (!(P > 0) || !(T > 0) || !(w > 0)) return null;
  }
  return [P, T, Math.sqrt(w), l];
}
// la fotosfera (atmosfera grigia di Eddington, profondità ottica 2/3): T = T_eff, P_gas = (2/3)·(g/κ)·(1 − κL/4πcGM)
function fotosfera(M, R, L, X, Zm, tav) {
  const Te = Math.pow(L / (PI4 * R * R * K.sigma), 0.25), g = (K.G * M) / (R * R), Pr = (A_RAD * Te ** 4) / 3, fr = (K.sigma * Te ** 4) / K.c;
  let a = -30, b = 60, rho = 0; // ln ρ: la pressione del gas che pareggia il peso della colonna sopra
  const f = (lr) => { rho = Math.exp(lr); const k = kappa(rho, Te, X, tav); return (stato(rho, Te, X, Zm).P - Pr) * k - (2 / 3) * (g - k * fr); };
  for (let it = 0; it < 70; it++) { const m = 0.5 * (a + b); if (f(m) > 0) b = m; else a = m; if (b - a < 1e-9) break; }
  rho = Math.exp(0.5 * (a + b)); return { Te, P: stato(rho, Te, X, Zm).P, rho, g };
}
// dalla fotosfera in dentro: variabili r, m, T, l in funzione di ln P, fino alla massa del raccordo
function dentroDa(M, Xp, Zm, tav, R, L, zFerma = Infinity) {
  const Xe = Xp[NGU - 1], ph = fotosfera(M, R, L, Xe, Zm, tav), mf = QFIT * M; let rhoG = ph.rho;
  if (!(ph.P > 0)) return null;
  const der = (z, r, m, T, l) => {
    const P = Math.exp(z), q = m / M, X = idrogeno(Xp, q), rho = densita(P, T, X, Zm, rhoG), kap = kappa(rho, T, X, tav), e = energia(rho, T, X, Zm);
    const nrad = (3 * kap * l * P) / (CR * m * T ** 4); let nab = nrad, conv = false;
    if (nrad > 0.05) { const t = termo(P, T, X, Zm, rho, true); if (nrad > t.nad) { conv = true; nab = T > 2e6 ? t.nad : mescolamento(P, T, rho, kap, (K.G * m) / (r * r), nrad, t.nad, t.cp, t.delta); } F.nad = t.nad; }
    D[1] = (-PI4 * r ** 4 * P) / (K.G * m); D[0] = D[1] / (PI4 * r * r * rho); D[2] = nab * T; D[3] = (e[0] + e[1]) * D[1];
    F.rho = rho; F.conv = conv; F.nrad = nrad; F.epp = e[0]; F.ecno = e[1];
  };
  let z = Math.log(ph.P), r = R, m = M, T = ph.Te, l = L, r1 = 0, m1 = 0, T1 = 0, l1 = 0;
  const passo = (h, primo) => { // un passo di Runge-Kutta 4 da (z, r, m, T, l); il risultato in r1, m1, T1, l1
    if (primo) { der(z, r, m, T, l); rhoG = F.rho; if (registro) registro.push([m / M, r, Math.exp(z), T, F.rho, l, F.conv ? 1 : 0, F.epp, F.ecno]); K1[0] = D[0]; K1[1] = D[1]; K1[2] = D[2]; K1[3] = D[3]; }
    const a0 = K1[0], a1 = K1[1], a2 = K1[2], a3 = K1[3];
    der(z + h / 2, r + (h / 2) * a0, m + (h / 2) * a1, T + (h / 2) * a2, l + (h / 2) * a3); const b0 = D[0], b1 = D[1], b2 = D[2], b3 = D[3];
    der(z + h / 2, r + (h / 2) * b0, m + (h / 2) * b1, T + (h / 2) * b2, l + (h / 2) * b3); const c0 = D[0], c1 = D[1], c2 = D[2], c3 = D[3];
    der(z + h, r + h * c0, m + h * c1, T + h * c2, l + h * c3);
    r1 = r + (h / 6) * (a0 + 2 * b0 + 2 * c0 + D[0]); m1 = m + (h / 6) * (a1 + 2 * b1 + 2 * c1 + D[1]); T1 = T + (h / 6) * (a2 + 2 * b2 + 2 * c2 + D[2]); l1 = l + (h / 6) * (a3 + 2 * b3 + 2 * c3 + D[3]);
    return r1 > 0 && m1 === m1 && T1 > 0;
  };
  for (let i = 0; i < 4000; i++) {
    let h = i < 60 ? 0.05 : T < 4e5 ? 0.15 : 0.2;
    if (z >= zFerma) return [Math.exp(z), T, r, l, ph, rhoG];
    if (!passo(h, true)) return null;
    if (m1 <= mf) { // l'ultimo passo si accorcia finché arriva giusto alla massa del raccordo
      let ha = 0, ma = m, hb = h, mb = m1;
      for (let k = 0; k < 12 && Math.abs(m1 - mf) > 1e-10 * M; k++) { h = Math.min(hb, Math.max(ha, ha + ((ma - mf) * (hb - ha)) / (ma - mb))); if (!passo(h, false)) return null; if (m1 > mf) { ha = h; ma = m1; } else { hb = h; mb = m1; } }
      return [Math.exp(z + h), T1, r1, l1, ph];
    }
    r = r1; m = m1; T = T1; l = l1; z += h;
  }
  return null;
}
const K1 = new Float64Array(4);
// IL TIRO: quattro incognite (pressione e temperatura al centro, raggio, luminosità: in logaritmo) e quattro
// condizioni (al raccordo, a metà della massa, le due integrazioni devono dare lo stesso P, T, r, l). Newton, con le
// derivate calcolate ripetendo le integrazioni.
function scarti(M, Xp, Zm, tav, y, quale = 3) { // quale: 1 solo dal centro, 2 solo dalla superficie, 3 tutti e due
  const o = quale & 1 ? fuori(M, Xp, Zm, tav, Math.exp(y[0]), Math.exp(y[1])) : null, i = quale & 2 ? dentroDa(M, Xp, Zm, tav, Math.exp(y[2]), Math.exp(y[3])) : null;
  return [o, i];
}
function risolvi(M, Xp, Zm, tav, y0, { giri = 60, tol = 1e-5, parla = false, J0 = null } = {}) {
  let y = y0.slice(), [o, i] = scarti(M, Xp, Zm, tav, y), J = J0 ? J0.map((r) => r.slice()) : null, fresca = false;
  const res = (o, i, y) => (o && i ? [Math.log(o[0] / i[0]), Math.log(o[1] / i[1]), Math.log(o[2] / i[2]), (o[3] - i[3]) / Math.exp(y[3])] : null);
  const norma = (r) => (r ? Math.hypot(r[0], r[1], r[2], r[3]) : Infinity);
  const derivate = () => { // la matrice delle derivate, ripetendo le integrazioni (due dal centro, due dalla superficie)
    J = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]; const d = 1e-4;
    for (let k = 0; k < 4; k++) { const y1 = y.slice(); y1[k] += d; const [o1, i1] = scarti(M, Xp, Zm, tav, y1, k < 2 ? 1 : 2), r1 = res(k < 2 ? o1 : o, k < 2 ? i : i1, y1); if (!r1) return false; for (let a = 0; a < 4; a++) J[a][k] = (r1[a] - r[a]) / d; }
    fresca = true; return true;
  };
  let r = res(o, i, y); if (!r) return null;
  for (let g = 0; g < giri; g++) {
    const n0 = norma(r); if (parla) console.log('   giro', g, 'scarto', n0.toExponential(2), y.map((v) => v.toFixed(4)).join(' '), fresca ? '(J)' : '');
    if (n0 < tol) return { y, J, Pc: Math.exp(y[0]), Tc: Math.exp(y[1]), R: Math.exp(y[2]), L: Math.exp(y[3]), Teff: i[4].Te, giri: g };
    if (!J && !derivate()) return null;
    let dy = gauss(J, r.map((v) => -v)); if (!dy) { if (fresca || !derivate()) return null; dy = gauss(J, r.map((v) => -v)); if (!dy) return null; }
    let passo = Math.min(1, 0.3 / Math.max(...dy.map(Math.abs))), fatto = false;
    for (let prova = 0; prova < 6; prova++) { // se lo scarto non cala, si accorcia il passo
      const y1 = y.map((v, k) => v + passo * dy[k]), [o1, i1] = scarti(M, Xp, Zm, tav, y1), r1 = res(o1, i1, y1), n1 = norma(r1);
      if (n1 < n0 * (1 - 0.1 * passo)) {
        // aggiorna la matrice senza ricalcolarla (Broyden): J += (Δr − J·Δy)·Δyᵀ/|Δy|²
        const sy = y1.map((v, k) => v - y[k]), n2 = sy.reduce((a, v) => a + v * v, 0);
        for (let a = 0; a < 4; a++) { let c = r1[a] - r[a]; for (let k = 0; k < 4; k++) c -= J[a][k] * sy[k]; for (let k = 0; k < 4; k++) J[a][k] += (c * sy[k]) / n2; }
        const lento = n1 > 0.5 * n0; y = y1; o = o1; i = i1; r = r1; fatto = true; fresca = false;
        if (lento && !derivate()) return null; // cala troppo piano: derivate nuove
        break;
      }
      if (!fresca) { if (!derivate()) return null; dy = gauss(J, r.map((v) => -v)); if (!dy) return null; passo = Math.min(1, 0.3 / Math.max(...dy.map(Math.abs))); continue; }
      passo *= 0.4;
    }
    if (!fatto) return null;
  }
  return null;
}
function gauss(A, b) { // sistema lineare 4×4 (eliminazione con scambio di righe)
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (!(Math.abs(M[p][c]) > 1e-300)) return null; [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) { const f = M[r][c] / M[c][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) { let v = M[r][n]; for (let k = r + 1; k < n; k++) v -= M[r][k] * x[k]; x[r] = v / M[r][r]; }
  return x.every(Number.isFinite) ? x : null;
}
// il profilo della soluzione, dal centro alla superficie: righe [q, r, P, T, ρ, l, convettivo, ε_pp, ε_cno]
function profilo(M, Xp, Zm, tav, y) {
  const a = []; registro = a; fuori(M, Xp, Zm, tav, Math.exp(y[0]), Math.exp(y[1])); const b = []; registro = b; dentroDa(M, Xp, Zm, tav, Math.exp(y[2]), Math.exp(y[3])); registro = null;
  return a.concat(b.reverse());
}

// ---------- LA VITA IN SEQUENZA PRINCIPALE: l'idrogeno diventa elio guscio per guscio, al ritmo delle reazioni della
// struttura appena trovata; le zone convettive si mescolano; poi la struttura si ricalcola con la nuova composizione.
const PASSI = [1, 0.85, 0.7, 0.55, 0.4, 0.26, 0.14, 0.05, 0.01];
const KPP = (4 * MB) / (DATI.Q4 - DATI.nuPP), KCNO = (4 * MB) / (DATI.Q4 - DATI.nuCNO); // kg di idrogeno per joule
function traccia(Msol, Z, y0, { parla = false, passi = PASSI } = {}) {
  const { X: X0, Zm } = composizione(Z), M = Msol * MSOLE, tav = tavolaOpacita(Zm), Xp = new Float64Array(NGU).fill(X0), rr = new Float64Array(NGU), stati = [];
  let tuttaFine = false, y = y0.slice(), yPrima = null, Jp = null, t = 0, rc0 = 0, xc0 = X0, s = 0, qmax = 2, k = 0, bersaglio = passi[0] * X0, tagli = 0;
  const Xs = new Float64Array(NGU); // la composizione all'inizio del passo (per riprovare con un passo più corto)
  for (;;) {
    let sol = risolvi(M, Xp, Zm, tav, yPrima && stati.length > 1 ? y.map((v, i) => v + 0.7 * (v - yPrima[i])) : y, { J0: Jp }) || (yPrima ? risolvi(M, Xp, Zm, tav, y) : null);
    if (sol && stati.length) { const u = stati[stati.length - 1]; if (Math.abs(Math.log(sol.L / LSOLE / u.L)) > 1.2 || Math.abs(Math.log(sol.R / RSOLE / u.R)) > 0.6) sol = null; } // un salto assurdo: non è la stessa stella
    if (!sol) {
      if (!stati.length || tagli > 3) break;
      // il passo era troppo lungo: metà strada
      tagli++; const prec = stati[stati.length - 1].Xc; bersaglio = 0.5 * (bersaglio + prec); const s2 = (prec - bersaglio) / rc0; for (let i = 0; i < NGU; i++) Xp[i] = Math.max(0, Xs[i] - rr[i] * s2); s = s2; continue;
    }
    yPrima = stati.length ? y : null; y = sol.y; Jp = sol.J;
    const pr = profilo(M, Xp, Zm, tav, y), np = pr.length;
    // il nucleo convettivo (dal centro) e l'involucro convettivo (dalla superficie)
    let ic = 0; while (ic < np && pr[ic][6]) ic++; let qcc = ic === 0 ? 0 : ic >= np ? 1 : pr[ic][0];
    let ie = np - 1; while (ie > 0 && !pr[ie][6] && pr[ie][3] < 3e4) ie--; let ib = ie; while (ib > 0 && pr[ib][6]) ib--;
    const qenv = pr[ie][6] ? pr[ib + 1][0] : 1, renv = pr[ie][6] ? pr[ib + 1][1] / sol.R : 1, tutta = ic >= np || qcc >= qenv;
    qcc = Math.min(qcc, qmax); // dopo che il centro ha cominciato a bruciare il nucleo convettivo non si allarga più (Ledoux)
    // il ritmo a cui cala l'idrogeno in ogni guscio
    let j = 0, Lpp = 0, Ltot = 0;
    for (let i = 0; i < NGU; i++) { while (j < np - 2 && pr[j + 1][0] < QC[i]) j++; const u = Math.min(1, Math.max(0, (QC[i] - pr[j][0]) / (pr[j + 1][0] - pr[j][0]))), T = pr[j][3] + u * (pr[j + 1][3] - pr[j][3]), rho = Math.exp(Math.log(pr[j][4]) + u * Math.log(pr[j + 1][4] / pr[j][4])), e = energia(rho, T, Xp[i], Zm); rr[i] = e[0] * KPP + e[1] * KCNO; Lpp += e[0] * (QB[i + 1] - QB[i]); Ltot += (e[0] + e[1]) * (QB[i + 1] - QB[i]); }
    const xarr = Xp[0];
    const mescola = (i0, i1) => { let sr = 0, sx = 0, sm = 0; for (let i = i0; i < i1; i++) { const dm = QB[i + 1] - QB[i]; sr += rr[i] * dm; sx += Xp[i] * dm; sm += dm; } if (sm > 0) for (let i = i0; i < i1; i++) { rr[i] = sr / sm; Xp[i] = sx / sm; } };
    if (tutta) mescola(0, NGU); else { let i1 = 0; while (i1 < NGU && QC[i1] < qcc) i1++; if (i1 > 1) mescola(0, i1); let i0 = 0; while (i0 < NGU && QC[i0] < qenv) i0++; if (i0 < NGU - 1) mescola(i0, NGU); }
    const rc = rr[0], xc = Xp[0];
    if (stati.length && s > 0) { const f = xarr / xc0, p = Math.log(rc / rc0) / Math.log(f); t += (s * (Math.abs(p - 1) < 1e-3 ? Math.log(1 / f) : (Math.pow(f, 1 - p) - 1) / (p - 1))) / (1 - f); }
    stati.push({ t: t / ANNO, L: sol.L / LSOLE, R: sol.R / RSOLE, T: sol.Teff, Tc: sol.Tc, rhoc: pr[0][4], Xc: xc, qcc: tutta ? 1 : qcc, qenv: tutta ? 1 : 1 - qenv, renv: tutta ? 0 : renv, cno: Ltot > 0 ? 1 - Lpp / Ltot : 0, y: y.slice() });
    if (parla) { const x = stati[stati.length - 1]; console.log(`  t ${x.t.toExponential(3)} Xc ${xc.toFixed(3)} L ${x.L.toPrecision(4)} R ${x.R.toFixed(4)} Teff ${x.T.toFixed(0)} Tc ${(x.Tc / 1e6).toFixed(2)} ρc ${(x.rhoc / 1e3).toFixed(1)} qcc ${x.qcc.toFixed(3)} qenv ${x.qenv.toExponential(2)} r_base ${x.renv.toFixed(3)} cno ${x.cno.toFixed(3)} (${sol.giri} giri)`); }
    rc0 = rc; xc0 = xc; tuttaFine = tutta; if (!tutta) qmax = qcc;
    k++; if (xc <= passi[passi.length - 1] * X0 * 1.0001) break;
    // il prossimo bersaglio per l'idrogeno al centro
    let prossimo = passi.find((v) => v * X0 < xc * 0.999) * X0; bersaglio = prossimo; tagli = 0; Xs.set(Xp);
    s = (xc - bersaglio) / rc; for (let i = 0; i < NGU; i++) Xp[i] = Math.max(0, Xp[i] - rr[i] * s);
  }
  if (!stati.length) return null;
  const ultimo = stati[stati.length - 1], finita = ultimo.Xc <= passi[passi.length - 1] * X0 * 1.01;
  // se il calcolo si è fermato prima (le stelle più piccole, che alla fine diventano degeneri): il resto dell'idrogeno al ritmo raggiunto
  const vita = finita ? ultimo.t : ultimo.t + xc0 / rc0 / ANNO;
  // il nucleo di elio che resta: fin dove l'idrogeno è finito (sotto un decimo di quello iniziale)
  let i = 0; while (i < NGU && Xp[i] < 0.1 * X0) i++;
  const mHe = i === 0 ? 0 : i >= NGU ? 1 : QC[i - 1] + ((0.1 * X0 - Xp[i - 1]) / (Xp[i] - Xp[i - 1])) * (QC[i] - QC[i - 1]);
  return { M: Msol, Z, stati, vita, mHe: finita ? mHe : Math.max(mHe, tuttaFine ? 1 : 0), finita };
}
// ---------- LA SEQUENZA DI ETÀ ZERO: da una massa alla vicina, a piccoli passi (ogni soluzione è il punto di
// partenza della successiva; se il passo è troppo lungo lo si dimezza). Restituisce le soluzioni alle masse chieste
// e la MASSA MINIMA: sotto, scendendo, l'equilibrio non c'è più (la degenerazione ferma la contrazione).
const SOLE0 = [37.18, 16.41, 20.30, 60.80]; // da dove parte il tiro per 1 M☉ (ln di Pc, Tc, R, L in SI): solo un punto di partenza
function sequenza(Z, masse, { parla = false } = {}) {
  const tav = (z) => tavolaOpacita(composizione(z).Zm), unif = (z) => new Float64Array(NGU).fill(composizione(z).X);
  // 1 M☉ a questa metallicità: dal Sole, cambiando i metalli un po' alla volta
  let y = SOLE0.slice(), zz = 1, sol = risolvi(MSOLE, unif(1), composizione(1).Zm, tav(1), y); if (!sol) return null; y = sol.y;
  for (let passo = Math.log(Z) / Math.max(1, Math.ceil(Math.abs(Math.log(Z)) / 0.7)), k = 0; Math.abs(Math.log(zz / Z)) > 1e-9 && k < 200; k++) {
    const z1 = Math.abs(Math.log(Z / zz)) <= Math.abs(passo) * 1.0001 ? Z : zz * Math.exp(passo), s1 = risolvi(MSOLE, unif(z1), composizione(z1).Zm, tav(z1), y);
    if (s1) { y = s1.y; zz = z1; TAVOLE.size > 3 && z1 !== Z && TAVOLE.delete(composizione(z1).Zm.toPrecision(6)); } else { passo /= 2; if (Math.abs(passo) < 0.01) return null; }
  }
  const { X, Zm } = composizione(Z), Xp = new Float64Array(NGU).fill(X), T = tavolaOpacita(Zm), y1 = y.slice(), trovate = new Map();
  let minima = NaN, massima = 1;
  for (const verso of [1, -1]) {
    const bersagli = masse.filter((m) => (verso > 0 ? m >= 1 : m < 1)).sort((a, b) => verso * (a - b));
    let M = 1, yy = y1.slice(), yp = null, Mp = null, J = null, dl = 0.1, ib = 0;
    if (verso > 0 && bersagli[0] === 1) { trovate.set(1, yy.slice()); ib = 1; }
    for (let k = 0; k < 600; k++) {
      const lim = ib < bersagli.length ? Math.abs(Math.log(bersagli[ib] / M)) : Infinity; if (verso > 0 && ib >= bersagli.length) break;
      const esatto = lim <= dl * 1.0001, Mn = esatto ? bersagli[ib] : M * Math.exp(verso * dl);
      const g = yp ? yy.map((v, i) => v + ((v - yp[i]) * Math.log(Mn / M)) / Math.log(M / Mp)) : yy;
      const s1 = risolvi(Mn * MSOLE, Xp, Zm, T, g, { J0: J }) || risolvi(Mn * MSOLE, Xp, Zm, T, yy);
      if (s1 && (verso > 0 || s1.L < Math.exp(yy[3]))) {
        yp = yy; Mp = M; yy = s1.y; M = Mn; J = s1.J; if (esatto) { trovate.set(Mn, yy.slice()); ib++; } dl = Math.min(0.12, dl * 1.4);
        if (parla) console.log(`   ${Mn.toFixed(4)} M☉: L ${(s1.L / LSOLE).toPrecision(4)} R ${(s1.R / RSOLE).toFixed(3)} T ${s1.Teff.toFixed(0)} Tc ${(s1.Tc / 1e6).toFixed(2)}`);
      } else { dl /= 2; if (dl < 0.004) break; }
    }
    if (verso > 0) massima = M; else { minima = M; trovate.set(M, yy.slice()); }
  }
  return { Z, minima, massima, y: trovate };
}

// ---------- LE NANE BRUNE: sotto la massa minima non c'è equilibrio; la stella si stringe irradiando l'energia di
// gravità (viriale: E = −(3/7)·G·M²/R per un polìtropo n = 3/2, che è la struttura esatta di una sfera tutta convettiva
// di gas con P ∝ ρ^5/3 a entropia fissa), finché gli elettroni degeneri la reggono. La luce che esce è quella della
// fotosfera il cui involucro, integrato in dentro, raggiunge l'entropia dell'interno.
const LE15 = (() => { const l = laneEmden(1.5); return { xi: l.xi, rc: l.xi / (-3 * l.d), pc: 1 / (PI4 * 2.5 * l.d * l.d) }; })(); // ρc/ρ̄ e Pc/(GM²/R⁴) del polìtropo n = 3/2
const T_BRUNA = 1600; // (K) sotto, l'opacità delle polveri che qui manca decide tutto: lì ci si ferma
// la luce che esce da una sfera TUTTA CONVETTIVA di massa Msol e raggio R: [L, T_eff] (la stessa per le nane brune e per
// le stelle giovani che si stringono prima della sequenza principale)
function luceConvettiva(Msol, Z) {
  const { X, Zm } = composizione(Z), M = Msol * MSOLE, tav = tavolaOpacita(Zm), Xp = new Float64Array(NGU).fill(X);
  return (R) => {
    const rhoc = (LE15.rc * 3 * M) / (PI4 * R ** 3), Pc = (LE15.pc * K.G * M * M) / R ** 4;
    // la temperatura al centro (da P e ρ) e l'entropia dell'interno
    let a = Math.log(1e3), b = Math.log(1e9); for (let it = 0; it < 50; it++) { const m = 0.5 * (a + b); if (stato(rhoc, Math.exp(m), X, Zm).P < Pc) a = m; else b = m; }
    const sc = stato(rhoc, Math.exp(0.5 * (a + b)), X, Zm).s, zf = Math.log(1e-3 * Pc);
    // la temperatura della fotosfera il cui involucro, integrato in dentro, arriva a quell'entropia
    const sInv = (lt) => { const Te = Math.exp(lt), r = dentroDa(M, Xp, Zm, tav, R, PI4 * R * R * K.sigma * Te ** 4, zf); return r ? stato(r[5], r[1], X, Zm).s : NaN; };
    let ta = Math.log(T_BRUNA), tb = Math.log(7000); if (!(sInv(ta) < sc)) return [0, 0]; // più fredda di quanto l'atmosfera qui descritta sappia dire
    for (let it = 0; it < 18; it++) { const m = 0.5 * (ta + tb), sv = sInv(m); if (!(sv < sc)) tb = m; else ta = m; }
    const Te = Math.exp(0.5 * (ta + tb)); return [PI4 * R * R * K.sigma * Te ** 4, Te];
  };
}
function raffreddamento(Msol, Z) {
  const M = Msol * MSOLE, luce = luceConvettiva(Msol, Z), t = [], lL = [], lR = [];
  let R = RSOLE * Math.cbrt(Msol / 0.05), tt = 0, [L0] = luce(R);
  t.push(0); lL.push(Math.log(L0 / LSOLE)); lR.push(Math.log(R / RSOLE));
  for (let k = 0; k < 60 && tt < 3e10 * ANNO; k++) {
    const R1 = R * 0.92, [L1] = luce(R1); if (!(L1 > 0) || L1 >= L0) break;
    tt += (3 / 7) * K.G * M * M * (1 / R1 - 1 / R) * 0.5 * (1 / L0 + 1 / L1);
    R = R1; L0 = L1; t.push(tt / ANNO); lL.push(Math.log(L1 / LSOLE)); lR.push(Math.log(R / RSOLE));
  }
  return { M: Msol, t, lL, lR };
}
// ---------- LA CONTRAZIONE PRIMA DELLA SEQUENZA PRINCIPALE (la traccia di Hayashi). Una stella appena nata è una sfera tutta
// convettiva più grande di quella che sarà: si stringe irradiando l'energia di gravità esattamente come una nana bruna (la
// stessa luce, luceConvettiva, e la stessa energia del viriale), finché arriva al raggio della sua sequenza di età zero, dove
// l'idrogeno pareggia le perdite. Si parte da 20 R☉ (il tempo per arrivarci da un raggio infinito a T_eff ferma, R ∝ t^−⅓, è
// (1/7)·GM²/(R·L): qualche secolo, contato); la T_eff della traccia viene dall'involucro integrato, non è data.
// CHE COSA MANCA (dichiarato): il deuterio, che nel primo milione di anni ferma per un po' la contrazione (le stelle giovani
// qui sono un poco meno luminose del vero a parità d'età); la fase radiativa di Henyey sopra ~0,5 M☉ (vicino alla sequenza la
// luce della traccia convettiva scende sotto quella vera: si prende la più alta tra le due, vedi luceGiovane). Confronto:
// Baraffe et al. 2015 (A&A 577, A42) [R]: 1 M☉ a 1 milione di anni ~2 L☉, 0,3 M☉ ~0,2 L☉.
const R_NASCITA = 20; // (R☉) da dove si comincia a contare
function contrazione(Msol, Z, Rzams) {
  const M = Msol * MSOLE, luce = luceConvettiva(Msol, Z), t = [], lL = [], lR = [];
  let R = R_NASCITA * RSOLE, [L0] = luce(R); if (!(L0 > 0)) return null;
  let tt = (K.G * M * M) / (7 * R * L0);
  t.push(tt / ANNO); lL.push(Math.log(L0 / LSOLE)); lR.push(Math.log(R / RSOLE));
  for (let k = 0; k < 200 && R > Rzams * 1.0001; k++) {
    const R1 = Math.max(Rzams, R * 0.92), [L1] = luce(R1); if (!(L1 > 0)) break;
    tt += (3 / 7) * K.G * M * M * (1 / R1 - 1 / R) * 0.5 * (1 / L0 + 1 / L1);
    R = R1; L0 = L1; t.push(tt / ANNO); lL.push(Math.log(L1 / LSOLE)); lR.push(Math.log(R / RSOLE));
  }
  return { t, lL, lR };
}
// ---------- LA TABELLA: per una metallicità, le tracce di un po' di masse dalla minima in su, e le nane brune.
// È questo che `node strumenti/tabella_stelle.mjs` scrive in stelle_tabella.js (minuti di calcolo, una volta).
export const Z_NODI = [0.01, 0.03, 0.1, 0.3, 1, 2, 3.5];
export const M_NODI = [0.1, 0.13, 0.17, 0.22, 0.28, 0.35, 0.42, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.25, 1.4, 1.6, 1.8, 2.1, 2.5, 3.2, 4, 5, 6.5, 8, 10, 13, 17, 22, 30, 40, 55, 75, 100, 130];
const cifre = (v) => +Number(v).toPrecision(5);
// la contrazione di una traccia in forma di tabella (t in anni, ln L e ln R in unità solari), dal raggio di nascita a Rzams (R☉)
export function preDellaTraccia(M, Z, Rzams) { const c = contrazione(M, Z, Rzams * RSOLE); return c && c.t.length > 1 ? { t: c.t.map(cifre), lL: c.lL.map(cifre), lR: c.lR.map(cifre) } : null; }
export function calcolaRiga(Z, masse = M_NODI, parla = () => {}) {
  const t0 = Date.now(), sq = sequenza(Z, masse); if (!sq) return null;
  parla(`Z = ${Z}: massa minima ${sq.minima.toFixed(4)}, massima raggiunta ${sq.massima} (${((Date.now() - t0) / 1e3).toFixed(0)} s)`);
  const tracce = [];
  for (const M of [sq.minima, ...masse.filter((m) => m > 1.03 * sq.minima && sq.y.has(m))]) {
    const tr = traccia(M, Z, sq.y.get(M)); if (!tr) { parla(`  ${M}: traccia mancata`); continue; }
    if (tr.stati.length < 2) tr.stati.push({ ...tr.stati[0], t: tr.vita });
    const col = (k, f = (v) => v) => tr.stati.map((x) => cifre(f(x[k])));
    const pre = preDellaTraccia(M, Z, tr.stati[0].R); // (la contrazione prima: fino al raggio di età zero di questa traccia)
    tracce.push({ M: cifre(M), vita: cifre(tr.vita), mHe: cifre(tr.mHe), finita: tr.finita, t: col('t'), lL: col('L', Math.log), lR: col('R', Math.log), lTc: col('Tc', Math.log), lrho: col('rhoc', Math.log), cno: col('cno'), qcc: col('qcc'), qenv: col('qenv'), renv: col('renv'), Xc: col('Xc'), ...(pre ? { pre } : {}) });
    const a = tr.stati[0], b = tr.stati[tr.stati.length - 1];
    parla(`  ${String(cifre(M)).padEnd(8)} L ${a.L.toPrecision(4)} → ${b.L.toPrecision(4)}  R ${a.R.toFixed(3)} → ${b.R.toFixed(3)}  T ${a.T.toFixed(0)}  vita ${tr.vita.toExponential(3)}  nucleo He ${tr.mHe.toFixed(3)}${tr.finita ? '' : '  (INTERROTTA)'}  (${((Date.now() - t0) / 1e3).toFixed(0)} s)`);
  }
  const brune = [0.3, 0.6, 0.97].map((f) => { const b = raffreddamento(f * sq.minima, Z); return { M: cifre(b.M), t: b.t.map(cifre), lL: b.lL.map(cifre), lR: b.lR.map(cifre) }; });
  parla(`  nane brune fatte (${((Date.now() - t0) / 1e3).toFixed(0)} s)`);
  return { Z, Mmin: cifre(sq.minima), tracce, brune };
}

// ---------- LA TABELLA GIÀ CALCOLATA (stelle_tabella.js, scritta da `node strumenti/tabella_stelle.mjs`): stella()
// interpola tra le tracce, in logaritmo, su massa e metalli, alla stessa frazione della vita.
const RIGHE = TABELLA.righe.map((r) => ({ Z: r.Z, Mmin: r.Mmin, lnM: Float64Array.from(r.tracce, (x) => Math.log(x.M)), tr: r.tracce.map((x) => ({ ...x, n: x.t.length })), brune: r.brune })).sort((a, b) => a.Z - b.Z);
// dove la curva di raffreddamento delle nane brune non è riuscita (a metalli molto bassi l'atmosfera fredda e densa
// che ne esce non sappiamo descriverla: manca l'assorbimento per urti dell'H₂) si prende quella della metallicità più
// vicina che è riuscita, riportata alla massa minima della riga
{ const buona = (r) => r.brune.every((b) => b.t.length >= 12 && b.t[b.t.length - 1] >= 1e7);
  RIGHE.forEach((r, i) => { if (buona(r)) return; let j = -1; for (let d = 1; d < RIGHE.length && j < 0; d++) for (const k of [i + d, i - d]) if (j < 0 && RIGHE[k] && buona(RIGHE[k])) j = k; if (j >= 0) { r.brune = RIGHE[j].brune.map((b) => ({ ...b, M: (b.M * r.Mmin) / RIGHE[j].Mmin })); r.bruneDa = RIGHE[j].Z; } }); }
const LZ = RIGHE.map((r) => Math.log(r.Z)), C_ES = SIGMA_T / (2 * MB);
function laneEmden(n, h = 0.005) { // il polìtropo di indice n: primo zero ξ₁ e massa −ξ₁²θ'(ξ₁) (Runge-Kutta 4)
  let x = h, y = 1 - (x * x) / 6 + (n * x ** 4) / 120, z = -x / 3 + (n * x ** 3) / 30; const f = (x, y, z) => -Math.pow(Math.max(y, 0), n) - (2 * z) / x;
  for (;;) { const k1y = z, k1z = f(x, y, z), k2y = z + 0.5 * h * k1z, k2z = f(x + 0.5 * h, y + 0.5 * h * k1y, k2y), k3y = z + 0.5 * h * k2z, k3z = f(x + 0.5 * h, y + 0.5 * h * k2y, k3y), k4y = z + h * k3z, k4z = f(x + h, y + h * k3y, k4y), y1 = y + (h / 6) * (k1y + 2 * k2y + 2 * k3y + k4y), z1 = z + (h / 6) * (k1z + 2 * k2z + 2 * k3z + k4z); if (y1 <= 0) { const t = y / (y - y1), xi = x + t * h, d = z + t * (z1 - z); return { xi, m: -xi * xi * d, d }; } x += h; y = y1; z = z1; }
}
const LE3 = laneEmden(3);
// una traccia a una frazione τ della sua vita: [ln L, ln R, ln Tc, ln ρc, CNO, nucleo conv., involucro conv., X centro, fondo dell'involucro]
const NQ = 9;
function aTau(tr, tau, peso, out) {
  const t = tau * tr.vita, n = tr.n; let k = 0; while (k < n - 2 && tr.t[k + 1] < t) k++;
  const u = n > 1 ? Math.min(1, Math.max(0, (t - tr.t[k]) / (tr.t[k + 1] - tr.t[k]))) : 0, k1 = Math.min(n - 1, k + 1), a = (A) => A[k] + u * (A[k1] - A[k]);
  out[0] += peso * a(tr.lL); out[1] += peso * a(tr.lR); out[2] += peso * a(tr.lTc); out[3] += peso * a(tr.lrho); out[4] += peso * a(tr.cno); out[5] += peso * a(tr.qcc); out[6] += peso * a(tr.qenv); out[7] += peso * a(tr.Xc); out[8] += peso * a(tr.renv);
}
const posto = (A, x) => { let i = 0; const n = A.length; while (i < n - 2 && A[i + 1] < x) i++; return i; };
function pesiZ(Z) {
  if (!RIGHE.length) throw new Error('stelle: la tabella è vuota; generarla con `node strumenti/tabella_stelle.mjs`');
  if (RIGHE.length === 1) return [[RIGHE[0], 1]];
  const lz = Math.log(Math.min(RIGHE[RIGHE.length - 1].Z, Math.max(RIGHE[0].Z, Z))), iz = posto(LZ, lz), uz = (lz - LZ[iz]) / (LZ[iz + 1] - LZ[iz]);
  return uz <= 0 ? [[RIGHE[iz], 1]] : uz >= 1 ? [[RIGHE[iz + 1], 1]] : [[RIGHE[iz], 1 - uz], [RIGHE[iz + 1], uz]];
}
const MEZZA_ETA = 0.5 * etaUniverso() / ANNO;

// ---------- CIÒ CHE SI USA DA FUORI

// la massa più piccola che accende l'idrogeno (in masse solari), a una metallicità (in unità solari)
export function massaMinima({ Z = 1 } = {}) { let s = 0; for (const [r, w] of pesiZ(Z)) s += w * Math.log(r.Mmin); return Math.exp(s); }

// la massa più grande: dove al centro la pressione della luce uguaglia quella del gas (nel modello di Eddington la
// massa fissa da sola questo rapporto: M ∝ √(1−β)/(μ²β²)·(ħc/G)^3/2/m_p²). Oltre, la stella è tenuta insieme a stento.
export function massaMassima({ Z = 1 } = {}) {
  const { X, Zm } = composizione(Z), mu = 1 / (2 * X + 0.75 * (1 - X - Zm) + 0.5 * Zm), beta = 0.5;
  const Kp = Math.cbrt((3 * (1 - beta)) / A_RAD) * Math.pow(K.kB / (beta * mu * MB), 4 / 3);
  return (PI4 * LE3.m * Math.pow(Kp / (Math.PI * K.G), 1.5)) / MSOLE;
}

// UNA STELLA in sequenza principale. Msol: massa in masse solari; Z: metalli in unità solari; eta: anni dalla nascita
// (se manca: a metà della vita, o a metà dell'età dell'universo se vive di più).
// → L, R in unità solari, T in K, vita in anni (come la vecchia stella() di leggi.js), e in più: Tc (K), densitaCentro
// (kg/m³), cno (frazione di L dal ciclo CNO), nucleoConvettivo e involucroConvettivo (frazioni di massa), fondoInvolucro
// (a che frazione del raggio comincia la zona convettiva esterna), struttura,
// idrogenoCentro, eddington (L/L_Eddington), eta (quella usata), finita (ha esaurito l'idrogeno al centro), nanaBruna.
export function stella(Msol, { Z = 1, eta = null } = {}) {
  const righe = pesiZ(Z), lm = Math.log(Math.min(Msol, 300));
  let lmin = 0; for (const [r, w] of righe) lmin += w * Math.log(r.Mmin);
  if (lm < lmin - 1e-9) return nanaBruna(Msol, righe, eta);
  // la vita, interpolata tra le tracce vicine (in logaritmo, su massa e metalli)
  let lv = 0; const vicini = [];
  for (const [r, w] of righe) {
    const x = Math.max(lm, r.lnM[0]), i = posto(r.lnM, x), u = (x - r.lnM[i]) / (r.lnM[i + 1] - r.lnM[i]);
    lv += w * ((1 - u) * Math.log(r.tr[i].vita) + u * Math.log(r.tr[i + 1].vita)); vicini.push(r.tr[i], w * (1 - u), r.tr[i + 1], w * u);
  }
  const vita = Math.exp(lv), anni = eta ?? Math.min(0.5 * vita, MEZZA_ETA), tau = Math.min(1, Math.max(0, anni / vita)), o = new Float64Array(NQ);
  let vic = vicini[0], pmax = -1;
  for (let i = 0; i < vicini.length; i += 2) { if (vicini[i + 1] !== 0) aTau(vicini[i], tau, vicini[i + 1], o); if (vicini[i + 1] > pmax) { pmax = vicini[i + 1]; vic = vicini[i]; } }
  const L = Math.exp(o[0]), R = Math.exp(o[1]), T = Math.pow((L * LSOLE) / (PI4 * (R * RSOLE) ** 2 * K.sigma), 0.25), qe = aUno(vic, tau, 'qenv'), re = aUno(vic, tau, 'renv');
  return {
    L, R, T, vita, Tc: Math.exp(o[2]), densitaCentro: Math.exp(o[3]), cno: o[4], nucleoConvettivo: o[5], involucroConvettivo: o[6], fondoInvolucro: o[8], idrogenoCentro: o[7],
    struttura: qe >= 1 ? 'tutta convettiva' : re < 0.97 ? 'nucleo radiativo, involucro convettivo' : aUno(vic, tau, 'qcc') > 0 ? 'nucleo convettivo, involucro radiativo' : 'radiativa',
    eddington: (L * LSOLE * C_ES * (1 + composizione(Z).X)) / (PI4 * K.c * K.G * Msol * MSOLE), eta: anni, finita: anni >= vita, nanaBruna: false,
  };
}
const aUno = (tr, tau, chiave) => { const t = tau * tr.vita; let k = 0; while (k < tr.n - 2 && tr.t[k + 1] < t) k++; return t - tr.t[k] < tr.t[Math.min(tr.n - 1, k + 1)] - t ? tr[chiave][k] : tr[chiave][Math.min(tr.n - 1, k + 1)]; };
function nanaBruna(Msol, righe, eta) {
  const anni = eta ?? MEZZA_ETA; let lL = 0, lR = 0;
  for (const [r, w] of righe) {
    const lm = Math.log(Msol), ms = r.brune.map((b) => Math.log(b.M)), i = posto(ms, lm), u = Math.min(1, Math.max(0, (lm - ms[i]) / (ms[i + 1] - ms[i])));
    for (const [b, p] of [[r.brune[i], w * (1 - u)], [r.brune[i + 1], w * u]]) {
      // (il primo punto è a t = 0: si interpola in ln t dal secondo; oltre l'ultimo — sotto i 1600 K, dove il calcolo si
      // ferma — la luce continua a calare come legge di potenza con la pendenza dell'ultimo tratto, a raggio fermo)
      const n = b.t.length, lt = Math.log(Math.max(anni, 1)); let k = Math.min(1, n - 1); while (k < n - 2 && Math.log(b.t[k + 1]) < lt) k++;
      const q = n > 2 ? Math.max(0, (lt - Math.log(b.t[k])) / (Math.log(b.t[k + 1]) - Math.log(b.t[k]))) : 0, k1 = Math.min(n - 1, k + 1);
      lL += p * (b.lL[k] + q * (b.lL[k1] - b.lL[k])); lR += p * (b.lR[k] + Math.min(1, q) * (b.lR[k1] - b.lR[k]));
    }
  }
  const L = Math.exp(lL), R = Math.exp(lR);
  return { L, R, T: Math.pow((L * LSOLE) / (PI4 * (R * RSOLE) ** 2 * K.sigma), 0.25), vita: Infinity, Tc: NaN, densitaCentro: NaN, cno: 0, nucleoConvettivo: 1, involucroConvettivo: 1, fondoInvolucro: 0, idrogenoCentro: NaN, struttura: 'tutta convettiva', eddington: 0, eta: anni, finita: false, nanaBruna: true };
}

// LA STELLA GIOVANE: la luce (L☉) e il raggio (R☉) di una stella a «eta» anni contando la contrazione prima della sequenza
// principale (contrazione, qui sopra: la tabella ne tiene la traccia «pre» per ogni massa). Si interpola come stella(): in
// logaritmo, su massa e metalli; per ogni traccia vicina vale la più luminosa tra la contrazione (finché dura) e la sequenza
// principale a quell'età (manca la fase radiativa di Henyey: dichiarato). Sotto la massa minima è la nana bruna di stella().
// La usa disco.js: la luce che scalda il disco e fissa la linea della neve è quella della stella di allora. stella() resta
// la sequenza principale (chi la chiede a età zero ha la stella di età zero, come prima).
const lnInterp = (T, V, lt) => { const n = T.length; let k = 0; while (k < n - 2 && T[k + 1] < lt) k++; const u = (lt - T[k]) / (T[k + 1] - T[k] || 1); return V[k] + Math.min(1, Math.max(0, u)) * (V[k + 1] - V[k]); };
const LN_PRE = new WeakMap(), lnTpre = (tr) => { let v = LN_PRE.get(tr); if (!v) LN_PRE.set(tr, (v = tr.pre.t.map(Math.log))); return v; };
export function luceGiovane(Msol, { Z = 1, eta = 1e6 } = {}) {
  const righe = pesiZ(Z), lm = Math.log(Math.min(Msol, 300)), lt = Math.log(Math.max(eta, 1));
  let lmin = 0; for (const [r, w] of righe) lmin += w * Math.log(r.Mmin);
  if (lm < lmin - 1e-9) { const b = nanaBruna(Msol, righe, eta); return { L: b.L, R: b.R, preSequenza: true }; }
  let lL = 0, lR = 0, pre = false;
  for (const [r, w] of righe) {
    const x = Math.max(lm, r.lnM[0]), i = posto(r.lnM, x), u = Math.min(1, (x - r.lnM[i]) / (r.lnM[i + 1] - r.lnM[i]));
    for (const [tr, p] of [[r.tr[i], w * (1 - u)], [r.tr[i + 1], w * u]]) {
      if (!(p > 0)) continue;
      const rms = lnInterp(tr.t, tr.lR, eta); let a = lnInterp(tr.t, tr.lL, eta), b = rms; // (la sequenza principale a quell'età)
      if (tr.pre) { const tp = lnTpre(tr); if (lt < tp[tp.length - 1]) { const lp = lnInterp(tp, tr.pre.lL, lt); if (lp > a) { a = lp; b = Math.max(rms, lnInterp(tp, tr.pre.lR, lt)); pre = true; } } }
      lL += p * a; lR += p * b;
    }
  }
  return { L: Math.exp(lL), R: Math.exp(lR), preSequenza: pre };
}

// il nucleo di elio che la stella si ritrova quando al centro l'idrogeno finisce (in masse solari)
export function nucleoElio(Msol, { Z = 1 } = {}) {
  let s = 0; const lm = Math.log(Msol);
  for (const [r, w] of pesiZ(Z)) { const x = Math.max(lm, r.lnM[0]), i = posto(r.lnM, x), u = (x - r.lnM[i]) / (r.lnM[i + 1] - r.lnM[i]); s += w * ((1 - u) * r.tr[i].mHe + u * r.tr[i + 1].mHe); }
  return Math.min(1, Math.max(0, s)) * Msol;
}

// CHE COSA DIVENTA quando muore, e quanto è forte il suo campo (il flusso magnetico si conserva mentre si contrae:
// B·R² costante). Stessa forma della vecchia fine() di leggi.js, più nucleoElio.
export function fine(Msol, B0 = 1e-4, { Z = 1 } = {}) {
  const Rs = stella(Msol, { Z }).R * RSOLE, Mc = massaChandrasekhar() / MSOLE, He = nucleoElio(Msol, { Z });
  if (He < Mc) { // il nucleo può farsi reggere dagli elettroni degeneri: perde gli strati esterni e resta una nana bianca
    const seg = DATI.massaFinale.find((s) => Msol < s[0]), Mr = Math.min(Msol, 0.98 * Mc, seg[1] * Msol + seg[2]), R = raggioNanaBianca(Mr * MSOLE);
    return { tipo: 'nana bianca', massa: Mr, raggio: R, B: B0 * (Rs / R) ** 2, supernova: false, nucleoElio: He };
  }
  if (He < DATI.elioBucoNero) { // il nucleo brucia fino al ferro e collassa: una supernova, e resta una stella di neutroni
    // la massa: quella di Chandrasekhar (il nucleo di ferro cede quando la supera), meno l'energia di legame
    // gravitazionale che se ne va in neutrini (3/5·G·M²/R, sfera omogenea)
    const Mb = Mc * MSOLE, R = raggioNeutroni(Mb), Mg = Mb * (1 - (0.6 * K.G * Mb) / (R * K.c ** 2));
    return { tipo: Mg < massaMassimaNeutroni() ? 'stella di neutroni' : 'buco nero', massa: Mg / MSOLE, raggio: raggioNeutroni(Mg), B: B0 * (Rs / raggioNeutroni(Mg)) ** 2, supernova: true, nucleoElio: He };
  }
  // l'esplosione non riesce a liberarsi del nucleo: ricade tutto, e resta un buco nero con la massa del nucleo di elio
  return { tipo: 'buco nero', massa: He, raggio: (2 * K.G * He * MSOLE) / K.c ** 2, B: 0, supernova: true, nucleoElio: He };
}

// LA STELLA OGGI, VIVA O MORTA: UNA VIA SOLA per luce, raggio e temperatura (regola 7: una grandezza, una fonte).
// «S» è una stella come la dà galassie.js: { massa (oggi), Z, eta, stato, e per i resti: raggioM, morta (anni dalla
// morte) }. Viva (anche gigante): la sua struttura a quell'età, stella(massa, { Z, eta }). Nana bianca: ha il raggio
// degli elettroni degeneri (fine()) e si raffredda irradiando il calore dei suoi ioni (Mestel 1952: L ∝ M·t^−7/5, con
// la costante 8,8·10⁶ anni per una massa solare a una luce solare; non più calda di 150 000 K appena nata); la luce è
// quella di una sfera con quel raggio e quella temperatura. Stella di neutroni, buco nero: non danno luce a un clima.
// → { viva, L (W), R (m), T (K) }. La usano cosmo.js (la luce che arriva ai pianeti, il raggio della stella) e
// grandezze.js (la fonte di stella.luminosita, stella.raggio, stella.temperatura per ogni stato).
// (galassie.js scrive ancora la temperatura della nana bianca con la stessa formula in linea: deve chiamare questa.)
export function nanaBiancaOggi(massa, raggioM, anniDallaMorte) {
  const Lm = LSOLE * Math.pow((8.8e6 * Math.pow(massa, 5 / 7)) / Math.max(anniDallaMorte, 1e4), 7 / 5), T = Math.min(1.5e5, Math.pow(Lm / (PI4 * raggioM ** 2 * K.sigma), 0.25));
  return { T, L: 4 * Math.PI * raggioM ** 2 * K.sigma * T ** 4 };
}
export function stellaOggi(S) {
  if (S.stato === 'in vita' || S.stato === 'gigante rossa') { const s = stella(S.massa, { Z: S.Z ?? 1, eta: S.eta }); return { viva: true, L: s.L * LSOLE, R: s.R * RSOLE, T: s.T }; }
  if (S.stato === 'nana bianca') { const n = nanaBiancaOggi(S.massa, S.raggioM, S.morta); return { viva: false, L: n.L, R: S.raggioM, T: n.T }; }
  return { viva: false, L: 0, R: S.raggioM || 1e4, T: 0 };
}

// la composizione di una stella che nasce con Z metalli (in unità solari): l'elio cresce con i metalli, dal valore del
// Big Bang a quello del Sole (le stelle che fanno i metalli fanno anche elio)

// i pezzi, per i test e per chi vuole guardare dentro
export const dentro = { calcolaRiga, sequenza, raffreddamento, contrazione, luceConvettiva, traccia, profilo, risolvi, scarti, opacitaAtomica, energiaAtomo, tavolaOpacita, kappa, energia, sigmaV, mescolamento, fuori, dentroDa, fotosfera, stato, densita, termo, elettroni, laneEmden, registra: (r) => { registro = r; }, METALLI, CN, RY, A0, SIGMA_K, SIGMA_T, C_ES, C_FF, A_RAD, MB, NGU, QC, QB, RIGHE };
