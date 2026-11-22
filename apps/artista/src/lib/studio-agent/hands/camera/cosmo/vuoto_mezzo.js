// vuoto_mezzo.js — IL MEZZO TRA LE STELLE in un punto di una galassia (parte «a» di vuoto.js: leggi lì l'intestazione
// generale, le fonti, i parametri liberi e che cosa non torna).
//
// Ciò che entra viene tutto da galassie.js (regola 7): la densità del gas e della polvere nel punto (densitaGalassia),
// i metalli dell'anello, le stelle nate nell'ultimo passo anello per anello, il ritmo delle supernove, la dispersione
// del gas, lo spessore dello strato; da stelle.js la luce e la temperatura di ogni stella; da materia.js i raggi
// cosmici. Qui si aggiunge solo ciò che da lontano non si vedeva: IN CHE STATO è quel gas (regola 4), e la somma delle
// fasi ridà, punto per punto, la densità di galassie.js.
//
// Marche delle fonti: [V] letta sulla fonte ora · [R] ricordata (non riletta: da verificare) · [D] derivata qui.
import { COSTANTI, MSOLE, LSOLE, ANNO, COSMO } from './leggi.js';
import * as ST from './stelle.js';
import { LEGGI, ANELLI, PASSI, popolazione, cinematica, densitaGalassia, faseBraccioAlTempo, COSMOLOGIA, polvereDelGas, dentro as GAL } from './galassie.js';
import * as MAT from './materia.js';

const K = COSTANTI, PI = Math.PI, PI4 = 4 * PI;
export const KPC = GAL.KPC, PC = KPC / 1e3, GA_S = GAL.GA, EV = K.e, H_PLANCK = 2 * PI * K.hbar, MU0 = 4e-7 * PI;
const stringi = (x, a, b) => Math.max(a, Math.min(b, x));

// ---------- I DATI E LE LEGGI PRESE (non derivate): tutti qui, ognuno con la fonte
export const MEZZO = Object.freeze({
  // --- polvere
  mrn: { esponente: 3.5, aMin: 5e-9, aMax: 2.5e-7 }, // [R] Mathis, Rumpl & Nordsieck 1977 (ApJ 217, 425): dn/da ∝ a^−3,5 tra 0,005 e 0,25 µm
  grano: { densita: 3000, n: 1.7, k: 0.1 }, // [R] un materiale «medio» tra silicato (3300 kg/m³, n ≈ 1,7) e grafite (2240, molto assorbente): Draine & Lee 1984. L'indice è una SEMPLIFICAZIONE dichiarata (un solo materiale, non due)
  albedo: { fuv: 0.4, visibile: 0.6 }, // [R] Draine 2003 (ARA&A 41, 241, fig. 11): albedo dei grani a 150 nm e a 550 nm
  AVmisurata: 5.3e-26, // [R] (mag·m² per atomo di H) Bohlin, Savage & Drake 1978: N_H/E(B−V) = 5,8·10²¹ cm⁻², R_V = 3,1. Serve solo da RISCONTRO: l'estinzione usata è quella calcolata dalle taglie
  // --- riscaldamento e raffreddamento del gas atomico (Field, Goldsmith & Habing 1969; Wolfire et al. 1995, 2003)
  habing: 5.29e-15, // [R] (J/m³) la densità di energia tra 6 e 13,6 eV vicino al Sole, Habing 1968 (5,29·10⁻¹⁴ erg/cm³): l'unità G₀
  fotoelettrico: { resa: 1.3e-24, e1: 0.049, psi1: 1925, p1: 0.73, e2: 0.037, psi2: 5000, pT: 0.7 }, // [R] Bakes & Tielens 1994 (ApJ 427, 822, eq. 42–43): Γ = 1,3·10⁻²⁴·ε·G₀ erg/s per H; ε(G₀√T/n_e)
  ricombinazioneGrani: { c: 4.65e-30, pT: 0.94, b0: 0.74, bT: 0.068 }, // [R] Bakes & Tielens 1994 (eq. 44): Λ = 4,65·10⁻³⁰·T^0,94·ψ^β·n_e·n, β = 0,74/T^0,068
  graniRicombinano: [12.25, 8.074e-6, 1.378, 508.7, 0.01586, 0.4723, 1.102e-5], // [R] Weingartner & Draine 2001 (ApJ 563, 842, tab. 2, H⁺): α_g = 10⁻¹⁴·C₀/(1 + C₁ψ^C₂·(1 + C₃T^C₄ψ^(−C₅−C₆ lnT))) cm³/s per H
  alfaB: [2.59e-13, -0.7], // [R] (cm³/s a 10⁴ K, esponente) ricombinazione dell'idrogeno, caso B: Osterbrock & Ferland 2006, tab. 2.1
  CII: { E: 91.21, kH: [7.58e-10, 0.128, 0.009], omega: 2.1 }, // [R] [C II] 158 µm: E/k (K); diseccitazione con H k₁₀ = 7,58·10⁻¹⁰·T₂^(0,128+0,009 lnT₂) cm³/s (Barinovs et al. 2005; Draine 2011, tab. F.6); con elettroni forza d'urto Ω ≈ 2,1 (Blum & Pradhan 1992)
  OI: { E: 227.7, kH: [3.57e-10, 0.419, -0.003] }, // [R] [O I] 63 µm: E/k (K); k₁₀ con H (Draine 2011, tab. F.6; Abrahamsson et al. 2007)
  lyAlfa: [7.5e-19, 118348], // [R] eccitazione di Lyα dagli elettroni: 7,5·10⁻¹⁹·e^(−118348/T)/(1+√(T/10⁵)) erg·cm³/s (Black 1981; Cen 1992)
  bethe: { M2: 0.2834, C: 4.0513 }, // [R] ionizzazione dell'idrogeno atomico da una particella veloce (Bethe 1933; i due numeri: Inokuti 1971, Rev. Mod. Phys. 43, 297)
  secondari: [0.67, 1.2, 0.05], // [R] le ionizzazioni fatte dagli elettroni strappati: φ = (1 − x/1,2)·0,67/(1 + x/0,05) (Draine 2011, eq. 13.12, da Dalgarno & McCray 1972)
  caloreCosmici: [6.5, 26.4, 0.07], // [R] (eV) il calore lasciato per ionizzazione: 6,5 + 26,4·√(x/(x+0,07)) (Draine 2011, eq. 30.2)
  taglioCosmici: 1e-3, // (GeV) sotto 1 MeV un protone si ferma in ~10²⁰ atomi/cm² (una nubecola): non arriva. SCELTA dichiarata; ζ cambia del 25% tra 1 e 10 MeV
  // --- le fasi che non si derivano qui
  molecolare: { P0: 4.3e4, esponente: 0.92, T: 15 }, // [R] Blitz & Rosolowsky 2006 (ApJ 650, 933): Σ_H₂/Σ_HI = (P/P₀)^0,92, P₀/k = 4,3·10⁴ K/cm³ (LEGGE MISURATA su 14 galassie); T delle nubi 10–20 K (misurata nel CO)
  ionizzato: { T: 8000, sfugge: 0.15, altezza: 1.0 }, // [R] il gas ionizzato diffuso (Reynolds 1984, 1989): 6000–10000 K; ne servono il 10–15% dei fotoni ionizzanti delle stelle O; scala d'altezza ~1 kpc (Gaensler et al. 2008: 1,8). Tre DATI MISURATI, non derivati
  // --- il fondo
  Tfondo: COSMO.Tcmb, // [R] (K) Fixsen 2009 (ApJ 707, 916)
  // --- le righe (lunghezze d'onda in aria, nm) e i numeri dell'emissione
  righe: { Halfa: 656.28, Hbeta: 486.13, OIII: 500.68 },
  HalfaPerFotone: 0.45, balmer: 2.86, // [R] caso B a 10⁴ K: il 45% delle ricombinazioni dà un fotone Hα; Hα/Hβ = 2,86 (Osterbrock & Ferland 2006, tab. 4.2 e 4.4)
  OIII5007: { E: 29169, omega: 2.29, ramo: 0.745, g: 9 }, // [R] ¹D₂ dell'O⁺⁺: E/k (K), forza d'urto dal ³P, parte dei decadimenti che dà 500,7 nm (Osterbrock & Ferland 2006, tab. 3.6 e 3.12)
  ionizzazioni: { H: 13.598, He: 24.587, Opiu: 35.12 }, // (eV) [R] NIST
});
const Z = MEZZO;

// =====================================================================================================
// 1. IL CORPO NERO: quanta luce e quanti fotoni sopra una soglia [D: integrali di Planck in serie]
// =====================================================================================================
// ∫_x^∞ t³/(e^t−1) dt e ∫_x^∞ t²/(e^t−1) dt (serie di e^(−nx); x = hν/kT)
const planck3 = (x) => { let s = 0; for (let n = 1; n < 60; n++) { const e = Math.exp(-n * x); if (e < 1e-17) break; s += e * (x ** 3 / n + (3 * x * x) / n ** 2 + (6 * x) / n ** 3 + 6 / n ** 4); } return s; };
const planck2 = (x) => { let s = 0; for (let n = 1; n < 60; n++) { const e = Math.exp(-n * x); if (e < 1e-17) break; s += e * ((x * x) / n + (2 * x) / n ** 2 + 2 / n ** 3); } return s; };
const P15 = 15 / PI ** 4;
// la parte della luce di un corpo nero a T tra due energie di fotone (eV)
export const parteDiLuce = (T, eV1, eV2 = Infinity) => P15 * (planck3((eV1 * EV) / (K.kB * T)) - (isFinite(eV2) ? planck3((eV2 * EV) / (K.kB * T)) : 0));
// i fotoni al secondo sopra eV1 emessi da un corpo nero di luminosità Lw (watt) a temperatura T
export const fotoniSopra = (Lw, T, eV1) => (Lw / (K.kB * T)) * P15 * planck2((eV1 * EV) / (K.kB * T));
const E_MEDIA_NERO = (PI ** 4 / 15 / 2.4041138) * K.kB; // l'energia media di un fotone di corpo nero: 2,701·kT [D]

// =====================================================================================================
// 2. LA POLVERE: dalle taglie (MRN) all'estinzione [D], con un'ottica dichiarata
// =====================================================================================================
// La sezione d'urto di un grano di raggio a alla lunghezza d'onda λ: «diffrazione anomala» di van de Hulst (1957, cap. 11)
// per una sfera di indice n + ik: Q = 2 − 4e^(−ρ tanβ)(cosβ/ρ)sin(ρ−β) − 4e^(−ρ tanβ)(cosβ/ρ)²cos(ρ−2β) + 4(cosβ/ρ)²cos2β,
// ρ = 4πa(n−1)/λ, tanβ = k/(n−1). Vale per n−1 piccolo: qui (0,7) è usata oltre il suo campo (errore dichiarato ~30%).
function qEstinzione(a, lambda) {
  const g = Z.grano, rho = (4 * PI * a * (g.n - 1)) / lambda, beta = Math.atan(g.k / (g.n - 1)), cb = Math.cos(beta), e = Math.exp(-rho * Math.tan(beta));
  if (rho < 1e-3) return (4 * rho * Math.tan(beta)) / 3 + rho * rho / 2; // (il limite per grani piccoli della stessa formula)
  return 2 - 4 * e * (cb / rho) * Math.sin(rho - beta) - 4 * e * (cb / rho) ** 2 * Math.cos(rho - 2 * beta) + 4 * (cb / rho) ** 2 * Math.cos(2 * beta);
}
// quanti grani e quanta sezione d'urto PER ATOMO DI IDROGENO (la polvere sul gas è quella di galassie.js, polvereDelGas: la
// spezzata in Z di Rémy-Ruyer et al. 2014, tabella 1 [V]; al Sole 1/162, il 43% dei metalli, sotto 1/4 Z☉ cala come Z³).
// La costante A di dn/da = A·a^−3,5 è fissata dalla massa: [D]
const POLVERE_SU_GAS = (Zr) => polvereDelGas(Zr); // in massa, sul gas tutto (idrogeno, elio e metalli)
// la parte dei metalli chiusa nei grani, con la stessa legge (per le abbondanze nel gas di C e O, qui e in vuoto_oggetti.js)
export const neiGrani = (Zr) => (Zr > 0 ? Math.min(1, polvereDelGas(Zr) / (Zr * GAL.ZSOLE)) : 0);
const MASSA_PER_H = (1 / ST.composizione(1).X) * K.mp; // la massa di gas per ogni atomo di idrogeno: 1,40 m_p (dalla composizione di stelle.js)
const A_MRN = (() => { const m = Z.mrn, per = ((PI4 / 3) * Z.grano.densita * (Math.sqrt(m.aMax) - Math.sqrt(m.aMin))) / 0.5; return MASSA_PER_H / per; })(); // per unità di (polvere/gas): m^2,5 per H
const estinzioni = new Map();
// la sezione d'urto di estinzione per atomo di H (m²) a λ (m), per polvere/gas = 1 (va moltiplicata per POLVERE_SU_GAS)
function sezionePerH(lambda) {
  const kk = Math.round(lambda * 1e10); if (estinzioni.has(kk)) return estinzioni.get(kk);
  const m = Z.mrn, N = 48, h = Math.log(m.aMax / m.aMin) / N; let s = 0;
  for (let i = 0; i < N; i++) { const a = m.aMin * Math.exp((i + 0.5) * h); s += PI * a * a * qEstinzione(a, lambda) * A_MRN * Math.pow(a, -m.esponente) * a * h; }
  estinzioni.set(kk, s); return s;
}
// → { suGas (massa), graniPerH, raggioMedio, estinzione(λ in m): magnitudini·m² per atomo di H, AV, RV, costante A }
export function polvere(Zr = 1) {
  const m = Z.mrn, dg = POLVERE_SU_GAS(Zr), A = A_MRN * dg, mag = 2.5 / Math.LN10;
  const est = (lambda) => mag * sezionePerH(lambda) * dg, AV = est(550e-9), AB = est(440e-9);
  return { suGas: dg, costante: A, graniPerH: (A * (Math.pow(m.aMin, -2.5) - Math.pow(m.aMax, -2.5))) / 2.5, taglie: { ...m, legge: 'dn/da ∝ a^−3,5' }, densitaGrano: Z.grano.densita,
    estinzione: est, AV, RV: AV / (AB - AV), AVmisurata: Z.AVmisurata * (dg / POLVERE_SU_GAS(1)), sezioneGeometrica: PI * A * 2 * (1 / Math.sqrt(m.aMin) - 1 / Math.sqrt(m.aMax)) };
}

// =====================================================================================================
// 3. I RAGGI COSMICI: lo spettro fuori dal vento di una stella. UNA FONTE: materia.js
// =====================================================================================================
// Lo spettro interstellare (Burger et al. 2000, Usoskin et al. 2005) è quello di materia.js (`spettroInterstellare`: lo
// stesso che, frenato dal vento del Sole, dà energiaDeiPrimari e i muoni al suolo). Qui non c'è nessuna copia.
// nucleoni per (m²·s·sr·GeV) all'energia cinetica E (GeV per nucleone), vicino al Sole fuori dall'eliosfera
export const spettroCosmici = MAT.spettroInterstellare;
const MP_GEV = (K.mp * K.c ** 2) / EV / 1e9; // la massa del protone in GeV, dalle costanti di leggi.js (0,938) [D]
const A0_BOHR = K.hbar / (K.me * K.c * ST.ALFA), BETHE0 = PI4 * A0_BOHR ** 2 * ST.ALFA ** 2; // 4π·a₀²·α² (m²) [D dalle costanti]
// la sezione d'urto di ionizzazione dell'idrogeno per un nucleone di energia cinetica E (GeV): Bethe
const sezioneIonizzazione = (E) => { const g = 1 + E / MP_GEV, b2 = 1 - 1 / (g * g); return (BETHE0 / b2) * (Z.bethe.M2 * (Math.log(b2 * g * g) - b2) + Z.bethe.C); };
let COSMICI0 = null;
// → per il cielo del Sole (relativo = 1): densità (per m³), energia (J/m³), ionizzazione primaria ζ (per atomo di H e per
//   secondo), flusso (per m²·s da tutte le direzioni); i conti sono integrali dello spettro [D]
function cosmiciBase() {
  if (COSMICI0) return COSMICI0;
  const a = Z.taglioCosmici, b = 1e6, n = 400, h = Math.log(b / a) / n; let num = 0, ene = 0, zeta = 0, flusso = 0;
  for (let i = 0; i <= n; i++) {
    const E = a * Math.exp(i * h), w = (i === 0 || i === n ? 0.5 : 1) * E * h, J = spettroCosmici(E), g = 1 + E / MP_GEV, v = K.c * Math.sqrt(1 - 1 / (g * g));
    num += (w * PI4 * J) / v; ene += (w * PI4 * J * E) / v; zeta += w * PI4 * J * sezioneIonizzazione(E); flusso += w * PI4 * J;
  }
  return (COSMICI0 = { numero: num, energia: ene * 1e9 * EV, ionizzazione: zeta, flusso });
}
// i raggi cosmici in una galassia: quelli del Sole per `relativo` (materia.js cieloRelativo: ritmo delle supernove su
// superficie del disco, rispetto alla Via Lattea). Uniformi nella galassia (SEMPLIFICAZIONE di materia.js, ereditata)
export function raggiCosmiciIn(forma) {
  const rel = forma ? MAT.cieloRelativo({ ritmoSN: forma.ritmoSN.totale, forma }).relativo : 1, b = cosmiciBase();
  return { relativo: rel, numero: b.numero * rel, energia: b.energia * rel, ionizzazione: b.ionizzazione * rel, flusso: b.flusso * rel, spettro: (E) => rel * spettroCosmici(E) };
}

// =====================================================================================================
// 4. L'EQUILIBRIO TERMICO DEL GAS ATOMICO: la curva P(n) a due fasi [D, con i tassi di MEZZO]
// =====================================================================================================
// Field, Goldsmith & Habing (1969): un gas scaldato da una sorgente che non dipende dalla densità e raffreddato da urti
// (∝ n²) ha, a pressione data, due stati stabili: uno tiepido e rado (~8000 K, lo raffredda Lyα e l'ossigeno) e uno
// freddo e denso (~80 K, lo raffredda il carbonio a 158 µm), con in mezzo uno instabile. Qui il riscaldamento è quello di
// Wolfire et al. (1995, 2003): elettroni strappati ai grani dalla luce ultravioletta (G₀) più i raggi cosmici (ζ);
// l'elettrone libero viene dall'equilibrio tra ionizzazione (raggi cosmici, carbonio) e ricombinazione (nel gas e sui grani).
// Le abbondanze: C e O di stelle.js (DATI.metalli) per i metalli dell'anello, meno la parte chiusa nei grani
// (neiGrani(Z): la stessa legge di Rémy-Ruyer di galassie.js, al Sole il 43%; il carbonio vero nel gas è 1,4·10⁻⁴ per H, qui
// 1,5·10⁻⁴; l'ossigeno vero è meno impoverito: 3,2·10⁻⁴ contro 2,8·10⁻⁴ di qui).
const ABB = (i) => 10 ** (ST.DATI.metalli[i][2] - 12); // C: indice 0, O: indice 2 (per atomo di H, Sole)
function curvaTermica({ G0, zeta, Zr }) {
  const f = Z.fotoelettrico, gas = 1 - neiGrani(Zr), xC = ABB(0) * Zr * gas, xO = ABB(2) * Zr * gas, kErg = K.kB * 1e7, EVerg = EV * 1e7;
  const perT = (T) => { // ciò che dipende solo dalla temperatura, una volta
    const T2 = T / 100, lT2 = Math.log(T2), aR = Z.alfaB[0] * Math.pow(T / 1e4, Z.alfaB[1]), W = Z.graniRicombinano, lT = Math.log(T), sT = Math.sqrt(T), w3 = W[3] * Math.pow(T, W[4]), w5 = -W[5] - W[6] * lT;
    const kC = Z.CII.kH[0] * Math.pow(T2, Z.CII.kH[1] + Z.CII.kH[2] * lT2), kCe = (8.629e-6 * Z.CII.omega) / (4 * sT), kO = Z.OI.kH[0] * Math.pow(T2, Z.OI.kH[1] + Z.OI.kH[2] * lT2);
    const cC = xC * kErg * Z.CII.E * 2 * Math.exp(-Z.CII.E / T), cO = xO * kErg * Z.OI.E * 0.6 * Math.exp(-Z.OI.E / T) * kO, cL = (Z.lyAlfa[0] * Math.exp(-Z.lyAlfa[1] / T)) / (1 + Math.sqrt(T / 1e5));
    const cR = Z.ricombinazioneGrani.c * Math.pow(T, Z.ricombinazioneGrani.pT) * Zr, bR = Z.ricombinazioneGrani.b0 / Math.pow(T, Z.ricombinazioneGrani.bT), e2 = f.e2 * Math.pow(T / 1e4, f.pT);
    const aG = (n, xe) => { const psi = Math.max(1e-3, (G0 * sT) / (n * xe)); return (1e-14 * W[0] * Zr) / (1 + W[1] * Math.pow(psi, W[2]) * (1 + w3 * Math.pow(psi, w5))); };
    const sec = (xe) => Math.max(0, (1 - xe / Z.secondari[1]) * Z.secondari[0]) / (1 + xe / Z.secondari[2]);
    return (n) => { // n: atomi di H per cm³ → { x (H⁺/H), xe, scalda, raffredda (erg/s per H) }
      let lo = -18.4, hi = 0; // (da 10⁻⁸ a 1)
      for (let k = 0; k < 30; k++) { const m = 0.5 * (lo + hi), x = Math.exp(m), xe = x + xC; if (zeta * (1 + sec(xe)) * (1 - x) - x * n * (xe * aR + aG(n, xe)) > 0) lo = m; else hi = m; }
      const x = Math.exp(0.5 * (lo + hi)), xe = x + xC, psi = (G0 * sT) / (n * xe);
      const eps = f.e1 / (1 + Math.pow(psi / f.psi1, f.p1)) + e2 / (1 + psi / f.psi2);
      const scalda = f.resa * eps * G0 * Zr + zeta * EVerg * (Z.caloreCosmici[0] + Z.caloreCosmici[1] * Math.sqrt(xe / (xe + Z.caloreCosmici[2])));
      const raffredda = n * (cC * (kC * (1 - x) + kCe * xe) + cO * (1 - x) + xe * (1 - x) * cL + cR * Math.pow(psi, bR) * xe);
      return { x, xe, scalda, raffredda };
    };
  };
  const stato = (n, T) => perT(T)(n);
  // per ogni temperatura la densità a cui scaldare e raffreddare si pareggiano (bisezione in ln n)
  const NT = 80, T0 = 12, T1 = 2.2e4, pts = [];
  for (let j = 0; j < NT; j++) {
    const T = T1 * Math.pow(T0 / T1, j / (NT - 1)); let lo = Math.log(1e-4), hi = Math.log(1e6);
    const st = perT(T), s0 = st(Math.exp(lo)), s1 = st(Math.exp(hi)); if (!(s0.scalda > s0.raffredda) || !(s1.scalda < s1.raffredda)) continue;
    for (let k = 0; k < 32; k++) { const m = 0.5 * (lo + hi), s = st(Math.exp(m)); if (s.scalda > s.raffredda) lo = m; else hi = m; }
    const n = Math.exp(0.5 * (lo + hi)), s = st(n); pts.push({ T, n, xe: s.xe, P: n * T * (1.1 + s.xe) /* K/cm³: H, He (un decimo) ed elettroni */, perdita: s.raffredda });
  }
  // dal caldo al freddo la pressione sale (ramo tiepido), tocca un massimo, scende (instabile), tocca un minimo, risale (ramo freddo)
  let iMax = -1, iMin = -1;
  for (let j = 1; j < pts.length - 1; j++) { if (iMax < 0 && pts[j].P > pts[j - 1].P && pts[j].P >= pts[j + 1].P) iMax = j; else if (iMax >= 0 && iMin < 0 && pts[j].P < pts[j - 1].P && pts[j].P <= pts[j + 1].P) iMin = j; }
  const dueFasi = iMax >= 0 && iMin > iMax, tra = (a, b, P) => { // il punto di un ramo (indici a…b, P monotona) alla pressione P
    const cresce = pts[b].P > pts[a].P; let j = a; while (j < b - 1 && (cresce ? pts[j + 1].P < P : pts[j + 1].P > P)) j++;
    const p = pts[j], q = pts[j + 1], u = stringi(Math.log(P / p.P) / Math.log(q.P / p.P), -0.5, 1.5), mix = (c) => p[c] * Math.pow(q[c] / p[c], u);
    return { n: mix('n'), T: mix('T'), xe: mix('xe') }; };
  // lo stato tiepido a una densità data (quando il gas è troppo rado per stare alla pressione delle due fasi)
  const tiepidoA = (n) => { const b = dueFasi ? iMax : pts.length - 1; let j = 0; while (j < b - 1 && pts[j + 1].n < n) j++; const p = pts[j], q = pts[j + 1], u = stringi(Math.log(n / p.n) / Math.log(q.n / p.n), -2, 1), mix = (c) => p[c] * Math.pow(q[c] / p[c], u); return { n, T: Math.min(T1, mix('T')), xe: mix('xe') }; };
  return { G0, zeta, Zr, punti: pts, dueFasi, Pmax: dueFasi ? pts[iMax].P : null, Pmin: dueFasi ? pts[iMin].P : null, P2: dueFasi ? Math.sqrt(pts[iMax].P * pts[iMin].P) : null,
    tiepido: (P) => (dueFasi ? tra(0, iMax, P) : tiepidoA(P / (1.1 * 8000))), freddo: (P) => (dueFasi ? tra(iMin, pts.length - 1, P) : null), tiepidoA, stato };
}
export const equilibrioTermico = curvaTermica;

// =====================================================================================================
// 5. UN RESTO DI SUPERNOVA nel tempo (serve qui per il gas caldo, e a vuoto_oggetti.js per i resti uno per uno)
// =====================================================================================================
// Le prime due fasi sono LE STESSE FORMULE di galassie.js (stelleGalassia: raggio = min(libera, Sedov)), così il resto di
// una delle ultime supernove del catalogo ha qui lo stesso raggio che ha là (provato). La terza è aggiunta qui.
//   · LIBERA: R = √(2E/M)·t, finché il gas spazzato pesa poco rispetto a ciò che è stato espulso;
//   · SEDOV–TAYLOR (1946, 1950): l'energia si conserva, R = 1,15·(E·t²/ρ)^(1/5), v = (2/5)·R/t, e dietro l'urto
//     T = (3/16)·μ·m_p·v²/k (urto forte, γ = 5/3) [D];
//   · RADIATIVA: dopo LEGGI.sedov (2,9·10⁴·n^(−9/17) anni: Blondin et al. 1998, lo stesso numero di galassie.js) il guscio
//     ha irradiato il suo calore e l'interno caldo lo spinge: R ∝ t^(2/7) (McKee & Ostriker 1977; Cioffi et al. 1988) [R];
//   · SI DISSOLVE quando la sua velocità scende a quella del gas attorno (LEGGI.sigmaGas, 10 km/s): da lì è mezzo interstellare.
// n: atomi di H per m³ attorno; E in joule; espulsaKg; t in anni. → { raggio (m), v (m/s), fase, T (K dietro l'urto),
//   tRadiativa, tFine (anni), spazzataKg, momento (kg·m/s) }
const MU_IONIZZATO = (() => { const c = ST.composizione(1); return 1 / (2 * c.X + 0.75 * c.Y + 0.5 * c.Zm); })(); // 0,61
export function restoSupernova({ n, t, E = LEGGI.energiaSN, espulsaKg = 10 * MSOLE }) {
  const rho = MASSA_PER_H * n, ts = Math.max(t, 0) * ANNO, sig = LEGGI.sigmaGas * 1e3, tR = LEGGI.sedov[0] * Math.pow(n / 1e6, LEGGI.sedov[1]), sR = tR * ANNO;
  const vL = Math.sqrt((2 * E) / espulsaKg), sedov = (s) => 1.15 * Math.pow((E * s * s) / rho, 0.2), prima = (s) => Math.min(vL * s, sedov(s));
  const rR = prima(sR), tFine = tR * Math.pow(Math.max(1, ((2 / 7) * rR) / (sR * sig)), 1.4);
  let raggio, v, fase;
  if (t <= tR) { const libera = vL * ts < sedov(ts); raggio = prima(ts); v = libera ? vL : (0.4 * raggio) / Math.max(ts, 1); fase = libera ? 'libera' : 'Sedov–Taylor'; }
  else { const tt = Math.min(t, tFine); raggio = rR * Math.pow(tt / tR, 2 / 7); v = ((2 / 7) * raggio) / (tt * ANNO); fase = t > tFine ? 'dissolto' : 'radiativa'; }
  const spazzata = (PI4 / 3) * raggio ** 3 * rho;
  return { raggio, v, fase, T: (3 / 16) * MU_IONIZZATO * K.mp * v * v / K.kB, tRadiativa: tR, tFine, spazzataKg: spazzata, momento: spazzata * v, densita: n };
}
// il volume per il tempo che un resto occupa nella sua vita (m³·anni): ∫(4π/3)R³dt fino a che si dissolve [D]
function quadriVolume(n, espulsaKg) {
  const f = restoSupernova({ n, t: 0, espulsaKg }).tFine, N = 160, h = Math.log(f / 1) / N; let s = 0;
  for (let i = 0; i < N; i++) { const t = Math.exp((i + 0.5) * h); s += (PI4 / 3) * restoSupernova({ n, t, espulsaKg }).raggio ** 3 * t * h; }
  return s;
}

// =====================================================================================================
// 6. IL QUADRO DI UNA GALASSIA: anello per anello, ciò che serve a dire le fasi in ogni punto (una volta per galassia)
// =====================================================================================================
// e₁(x) = ∫_x^∞ e^−t/t dt (serie per x < 1, frazione continua oltre) ed E₂(x) = e^−x − x·E₁(x) [D]
const expint1 = (x) => { if (x < 1) { let s = -0.5772156649 - Math.log(x), t = 1; for (let k = 1; k < 40; k++) { t *= -x / k; s -= t / k; } return s; } let f = 0; for (let k = 40; k >= 1; k--) f = k / (1 + k / (x + f)); return Math.exp(-x) / (x + f); };
const E2 = (x) => Math.exp(-x) - x * expint1(x);
// la densità di energia a metà di uno strato che emette ε (W/m²) e assorbe con mezzo spessore ottico τ, sorgenti e polvere
// mescolate: u = ε·(1 − E₂(τ))/(2τc) [D: funzione sorgente uniforme in uno strato piano]
const luceNelloStrato = (eps, tau) => (eps * (1 - E2(tau))) / (2 * tau * K.c);
// ciò che una popolazione di stelle emette per ogni M☉/anno che nasce, a regime: luce tra 6 e 13,6 eV (W) e fotoni
// ionizzanti al secondo (sopra 13,6 eV; sopra 24,6: elio; sopra 35,1: O⁺). Le stelle sono quelle di stelle.js, a metà vita,
// come corpi neri (SEMPLIFICAZIONE: le atmosfere vere delle stelle calde danno meno fotoni duri)
const rese = new Map();
function resaDellePopolazioni(Zr) {
  const kk = Math.round(Math.log10(Math.max(Zr, 1e-4)) * 20); if (rese.has(kk)) return rese.get(kk);
  const P = popolazione(), o = { fuv: 0, Q0: 0, Q1: 0, Q2: 0, bol: 0 }, I = Z.ionizzazioni;
  for (let i = 0; i < P.N; i++) {
    const s = ST.stella(P.m[i], { Z: Zr }); if (!isFinite(s.vita) || s.T < 6000) continue;
    const vive = (P.w[i] / P.massaMedia) * Math.min(s.vita, GAL.T0 * 1e9), Lw = s.L * LSOLE; // stelle vive di quella massa per ogni M☉/anno
    o.fuv += vive * Lw * parteDiLuce(s.T, 6, I.H); o.Q0 += vive * fotoniSopra(Lw, s.T, I.H); o.Q1 += vive * fotoniSopra(Lw, s.T, I.He); o.Q2 += vive * fotoniSopra(Lw, s.T, I.Opiu); o.bol += vive * Lw;
  }
  rese.set(kk, o); return o;
}
// i fotoni per watt di una generazione di stelle di una certa età (in passi di galassie.js): come popolazione().luce, in fotoni
let FOTONI_GEN = null;
function fotoniPerGenerazione() {
  if (FOTONI_GEN) return FOTONI_GEN; const P = popolazione(), f = new Float64Array(PASSI + 1), L1 = new Float64Array(P.N), T1 = new Float64Array(P.N);
  for (let i = 0; i < P.N; i++) { const s = ST.stella(P.m[i], { Z: 1 }); L1[i] = s.L; T1[i] = s.T; }
  for (let L = 0; L <= PASSI; L++) for (let i = 0; i < P.N; i++) { const viva = 1 - stringi(L + 1 - P.tab[2].vita[i] / GAL.DT, 0, 1); f[L] += (P.w[i] * L1[i] * LSOLE * viva) / P.massaMedia / (E_MEDIA_NERO * T1[i]); }
  return (FOTONI_GEN = f);
}
const quadri = new WeakMap();
// → { anelli: [per ogni anello: r, sigmaGas, sigmaStelle (kg/m²), Z, sfr (M☉/anno/kpc²), G0, uStelle, fotoniStelle, peso W (Pa),
//      curva (equilibrio termico), P2 (Pa), nMedio, caldo: { Q, volume, T }, snPerVolume, nube: {...}, ionizzanti (fotoni/m²/s) }],
//      cosmici, campo, hGas (m) }
export function quadro(forma) {
  let Q = quadri.get(forma); if (Q) return Q;
  const A = forma.anelli, e = forma.interno, NR = ANELLI, nt = e.nt, C = cinematica(forma), P = popolazione(), cosmici = raggiCosmiciIn(forma), hGas = LEGGI.spessoreGas * KPC, fot = fotoniPerGenerazione();
  const stelleTot = Array.from(A.sigmaStelle).reduce((s, v, k) => s + v * A.area[k], 0), natiOra = Array.from({ length: NR }, (_, k) => e.nati[nt * NR + k]), natiTot = natiOra.reduce((s, v) => s + v, 0);
  const fatti = new Array(NR).fill(null);
  const anello = (k) => {
    if (fatti[k]) return fatti[k];
    const Zr = Math.max(1e-3, A.Z[k]), sg = (A.sigmaGas[k] * MSOLE) / KPC ** 2, ss = (A.sigmaStelle[k] * MSOLE) / KPC ** 2, area = A.area[k] * KPC ** 2, pol = polvere(Zr);
    const sfr = natiOra[k] / (GAL.DT * 1e9) / A.area[k], resa = resaDellePopolazioni(Zr), NH = sg / MASSA_PER_H; // colonna di H attraverso tutto lo strato (per m²)
    // la luce: ultravioletta dalle stelle nate nell'ultimo passo; tutta, dalle generazioni ancora vive (popolazione().luce)
    let lum = 0, nfot = 0; for (let i = 1; i <= nt; i++) { const m = e.nati[i * NR + k]; lum += m * P.luce[nt - i] * LSOLE; nfot += m * fot[nt - i]; }
    const sottile = Math.min(1, (C.z0[k] * KPC) / (Math.max(forma.raggioDisco, 0.1) * KPC)); // il disco finisce: i raggi radenti non vengono dall'infinito
    const tauF = Math.max(sottile, 0.5 * NH * (pol.estinzione(150e-9) / (2.5 / Math.LN10)) * (1 - Z.albedo.fuv)), tauV = Math.max(sottile, 0.5 * NH * (pol.AV / (2.5 / Math.LN10)) * (1 - Z.albedo.visibile));
    const uFuv = luceNelloStrato((sfr * resa.fuv) / KPC ** 2, tauF), G0 = uFuv / Z.habing, uStelle = luceNelloStrato(lum / area, tauV), fotoniStelle = luceNelloStrato(nfot / area, tauV);
    const curva = curvaTermica({ G0: Math.max(G0, 1e-4), zeta: cosmici.ionizzazione, Zr });
    // il peso dello strato di gas nel campo suo e delle stelle: P = (π/2)·G·Σg·(Σg + Σ★·σg/σ★) (equilibrio idrostatico: Elmegreen 1989) [R]
    const peso = (onda = 1) => 0.5 * PI * K.G * sg * onda * (sg * onda + (ss * LEGGI.sigmaGas) / Math.max(C.sigZ[k], 1e-3));
    const nMedio = sg / (2 * hGas) / MASSA_PER_H; // atomi di H per m³ a metà dello strato (come galassie.js per i resti)
    // IL GAS CALDO (McKee & Ostriker 1977): quanta parte del volume sta dentro un resto non ancora dissolto. Q = ritmo
    // per volume × volume·tempo di un resto; i resti si sovrappongono a caso: volume = 1 − e^−Q [D, con i resti di qui]
    const sn = (forma.ritmoSN.collasso * (natiTot > 0 ? natiOra[k] / natiTot : 0) + forma.ritmoSN.Ia * (stelleTot > 0 ? (A.sigmaStelle[k] * A.area[k]) / stelleTot : 0)) / (area * 2 * hGas); // per m³ e per anno
    const nRes = Math.max(1e3, nMedio), q4 = sn > 0 ? sn * quadriVolume(nRes, 10 * MSOLE) : 0, rad = restoSupernova({ n: nRes, t: LEGGI.sedov[0] * Math.pow(nRes / 1e6, LEGGI.sedov[1]) });
    // LE NUBI: la massa più grande che il disco di gas può tenere insieme è quella di Jeans in due dimensioni,
    // π·σ⁴/(4·G²·Σ) (σ: la dispersione del gas freddo, LEGGI.soglia: 6 km/s) [D]
    const sF = LEGGI.soglia[1] * 1e3, jeans = sg > 0 ? (PI * sF ** 4) / (4 * K.G ** 2 * sg) : 0;
    return (fatti[k] = { k, r: A.r[k], bordo: [A.bordo[k], A.bordo[k + 1]], area, Z: Zr, sigmaGas: sg, sigmaStelle: ss, sfr, G0, uFuv, uStelle, fotoniStelle, tauV, curva, peso, P2: curva.dueFasi ? curva.P2 * 1e6 * K.kB : null,
      nMedio, snPerVolume: sn, caldo: { Q: q4, volume: 1 - Math.exp(-q4), T: rad.T }, jeansKg: jeans, ionizzanti: (sfr * resa.Q0) / KPC ** 2, resa, nube: nubeDi(Math.max(nubeMinima(Zr), NUBE_EFFICACE * jeans), Zr), nubeMin: nubeMinima(Zr), polvere: pol, z0: C.z0[k] * KPC, sigZ: C.sigZ[k] * 1e3 });
  };
  // IL CAMPO MAGNETICO: equipartizione con i raggi cosmici, B²/2μ₀ = u (INCERTO: l'equipartizione è un'ipotesi; il campo
  // vero vicino al Sole è ~0,5 nT, e cresce nelle nubi dense come √n: qui non c'è)
  const B = Math.sqrt(2 * MU0 * cosmici.energia);
  Q = { anello, get anelli() { return Array.from({ length: NR }, (_, k) => anello(k)); }, cosmici, campo: { B, incerto: [B / 2, 2 * B], da: 'equipartizione con i raggi cosmici' }, hGas, D: densitaGalassia(forma), raggio: A.bordo[NR] };
  quadri.set(forma, Q); return Q;
}

// LA NUBE MOLECOLARE TIPICA di un anello (la densità con cui il gas molecolare riempie lo spazio). Le relazioni di Larson
// (1981), nella forma di Solomon et al. 1987 (ApJ 319, 730) [R]: σ_v = 0,72·(R/pc)^½ km/s e una densità di superficie
// uguale per tutte, 170 M☉/pc². Quest'ultima qui è scritta come ESTINZIONE: 170 M☉/pc² sono A_V ≈ 8 magnitudini con la
// polvere del Sole (N_H = Σ/1,4m_p; A_V = N_H × estinzione per atomo): è lo schermo che serve al CO per non essere
// distrutto dalla luce. Con meno polvere serve più colonna: Σ_nube = Σ☉·(polvere☉/polvere) [D dall'ipotesi «A_V fissa»].
export const LARSON = Object.freeze({ sigma1pc: 720, sigmaSole: (170 * MSOLE) / PC ** 2, vita: 2.5e7, resaPerCaduta: 0.01, pendenza: 1.6 });
//   vita: [R] 20–30 milioni di anni (Kawamura et al. 2009, ApJS 184, 1, nella Grande Nube di Magellano; Blitz & Shu 1980)
//   resaPerCaduta: [R] l'1% del gas di una nube diventa stelle per ogni tempo di caduta libera (Krumholz & Tan 2007, ApJ 654, 304)
//   pendenza: [R] dN/dM ∝ M^−1,6 (Williams & McKee 1997, ApJ 476, 166; Rosolowsky 2005: 1,5 dentro il cerchio solare)
// Il volume che le nubi occupano è Σ M/ρ(M), con ρ ∝ M^−½ (Σ fissa) e dN ∝ M^−γ: lo domina la più grande, e vale quello di
// nubi tutte uguali di massa [(2−γ)/(2,5−γ)]²·M_max (0,2·M_max con γ = 1,6) [D]
export const NUBE_EFFICACE = ((2 - LARSON.pendenza) / (2.5 - LARSON.pendenza)) ** 2;
// una nube di massa M (kg) in un gas con metalli Zr → raggio, densità, velocità interna, caduta libera, Jeans, estinzione
export function nubeDi(massaKg, Zr = 1, T = Z.molecolare.T) {
  const Sigma = LARSON.sigmaSole / Math.max(Zr, 0.05), R = Math.sqrt(massaKg / (PI * Sigma)), rho = massaKg / ((PI4 / 3) * R ** 3), n = rho / MASSA_PER_H, sv = LARSON.sigma1pc * Math.sqrt(R / PC);
  const cs = Math.sqrt((K.kB * T) / (2.33 * K.mp)), tff = Math.sqrt((3 * PI) / (32 * K.G * rho)), jeans = Math.pow((5 * K.kB * T) / (K.G * 2.33 * K.mp), 1.5) * Math.sqrt(3 / (PI4 * rho));
  const pol = polvere(Zr), AV = (Sigma / MASSA_PER_H) * pol.AV;
  return { massaKg, raggio: R, densita: rho, nH: n, T, sigmaV: sv, suono: cs, viriale: (5 * sv * sv * R) / (K.G * massaKg), cadutaLibera: tff / ANNO, jeansKg: jeans, massaDiJeans: massaKg / jeans, AV, superficie: Sigma,
    stelleAllAnno: (LARSON.resaPerCaduta * massaKg) / MSOLE / (tff / ANNO) };
}
// la nube più piccola: dove la velocità interna di Larson scende a quella del suono (sotto, la turbolenza non regge più:
// sono i nuclei densi da cui nasce una stella alla volta: Goodman et al. 1998) [D]
export const nubeMinima = (Zr = 1, T = Z.molecolare.T) => { const cs = Math.sqrt((K.kB * T) / (2.33 * K.mp)), R = PC * (cs / LARSON.sigma1pc) ** 2; return PI * R * R * (LARSON.sigmaSole / Math.max(Zr, 0.05)); };

// =====================================================================================================
// 7. LE FASI IN UN PUNTO
// =====================================================================================================
// `a`: l'anello del quadro; onda: densità del gas lì rispetto alla media dell'anello nel piano (i bracci); zf: quanto è
// calata con l'altezza (sech²); n: atomi di H per m³ in quel punto (da galassie.js). Unità interne: cm⁻³ e K/cm³.
function fasiIn(a, onda, zf, nM3) {
  const n = nM3 / 1e6, kcm = K.kB * 1e6, c = a.curva, W = a.peso(onda) * zf, M = Z.molecolare, I = Z.ionizzato;
  // la pressione termica: dove due fasi possono coesistere il gas si regola da sé attorno alla media geometrica dei due
  // estremi (Wolfire et al. 2003; Ostriker, McKee & Leroy 2010) [R: è il loro risultato, qui preso come chiusura];
  // nei bracci e in altezza segue la densità. Dove il gas è troppo rado per stare a quella pressione resta solo tiepido, e
  // la pressione è quella che la sua densità gli dà (cercata qui sotto)
  const P0 = c.dueFasi ? c.P2 * onda * zf : 0;
  // molecolare: quanta parte in massa (Blitz & Rosolowsky), e che volume occupa alla densità della nube tipica dell'anello
  const Rm = Math.pow(W / (M.P0 * kcm), M.esponente), fMol = Rm / (1 + Rm), nube = a.nube, nMol = fMol * n, vMol = Math.min(0.5, nMol / (nube.nH / 1e6));
  // caldo: i resti di supernova non ancora dissolti, alla pressione del resto (H, He ed elettroni: 2,3 particelle per H).
  // ionizzato tiepido: i fotoni ionizzanti che sfuggono alle nubi di nascita, spesi in ricombinazioni su una colonna alta
  // `altezza` (misurata): volume = fotoni / (2·α_B·n_e·n_p·H) [D dal bilancio]; le regioni si sovrappongono a caso, e
  // dove i fotoni basterebbero per più del volume che c'è il resto esce dalla galassia
  const Tc = Math.max(a.caldo.T, 1e5), aB = Z.alfaB[0] * Math.pow(I.T / 1e4, Z.alfaB[1]), spazio0 = 1 - vMol - a.caldo.volume, fot = (I.sfugge * a.ionizzanti * 1e-4) / (2 * aB * 1.1 * I.altezza * KPC * 100);
  const alla = (P) => { const nCaldo = P / (2.3 * Tc), nIon = P / (2.2 * I.T), vIon = spazio0 * -Math.expm1(-fot / (nIon * nIon)); return { P, nCaldo, nIon, vIon, nAt: n - nMol - a.caldo.volume * nCaldo - vIon * nIon, spazio: spazio0 - vIon }; };
  let s = null, fr = null, ti = null, vF = 0, vT = 0, vCaldo = a.caldo.volume;
  if (c.dueFasi && P0 > c.Pmax) { // sopra il massimo il tiepido non esiste: tutto l'atomico è freddo, e il vuoto che lascia lo riempie il gas caldo
    s = alla(P0); if (s.nAt > 0) { fr = c.freddo(P0); vF = Math.min(s.spazio, s.nAt / fr.n); fr = { ...fr, n: s.nAt / vF }; const resto = s.spazio - vF; s.nCaldo = (s.nCaldo * vCaldo) / (vCaldo + resto); vCaldo += resto; } else s = null;
  } else if (c.dueFasi && P0 >= c.Pmin) {
    s = alla(P0); const t = c.tiepido(P0), f = c.freddo(P0), v = (s.nAt - s.spazio * t.n) / (f.n - t.n);
    if (v > 0 && v < s.spazio) { fr = f; ti = t; vF = v; vT = s.spazio - v; } else if (v >= s.spazio && s.spazio > 0) { fr = { ...f, n: s.nAt / s.spazio }; vF = s.spazio; } else s = null;
  }
  if (!s) { // solo tiepido (neutro e ionizzato alla stessa pressione): la pressione a cui la massa torna [bisezione]
    const tiep = (P) => (c.dueFasi ? c.tiepido(Math.min(P, c.Pmax)) : c.tiepidoA(P / (1.1 * 8000))), g = (P) => { const q = alla(P); return q.nAt - q.spazio * tiep(P).n; };
    let lo = Math.log(1e-9), hi = Math.log(c.dueFasi ? c.Pmax : 1e7);
    if (g(Math.exp(hi)) > 0) { s = alla(Math.exp(hi)); ti = c.tiepidoA(Math.max(1e-12, s.nAt) / Math.max(1e-9, s.spazio)); vT = s.spazio; } // (più denso di quanto il tiepido regga: resta tiepido alla sua densità)
    else { for (let k = 0; k < 40; k++) { const m = 0.5 * (lo + hi); if (g(Math.exp(m)) > 0) lo = m; else hi = m; } s = alla(Math.exp(0.5 * (lo + hi))); ti = tiep(s.P); vT = s.spazio; ti = { ...ti, n: vT > 0 ? Math.max(0, s.nAt) / vT : 0 }; }
  }
  const f = (nome, stato, nn, T, vol, xe) => ({ nome, stato, n: nn * 1e6, T, volume: vol, massa: n > 0 ? (vol * nn) / n : 0, ionizzato: xe });
  const fasi = [
    f('molecolare freddo', 'H₂', vMol > 0 ? nMol / vMol : 0, M.T, vMol, 1e-7),
    f('atomico freddo', 'H I', fr ? fr.n : 0, fr ? fr.T : 0, vF, fr ? fr.xe : 0),
    f('atomico tiepido', 'H I', ti ? ti.n : 0, ti ? ti.T : 0, vT, ti ? ti.xe : 0),
    f('ionizzato tiepido', 'H II', s.nIon, I.T, s.vIon, 1.1),
    f('caldo', 'H II', s.nCaldo, Tc, vCaldo, 1.2),
  ];
  return { fasi, Pth: s.P * kcm, PsuK: s.P, peso: W, fMol, nube };
}

// IL CONTENUTO DEL MEZZO in un punto di una galassia.
//   forma: quella di galassie.js (formaGalassia / formaDaAlone);
//   punto: { r (kpc dal centro, nel piano), z (kpc sopra il piano, default 0), fi (radianti) } oppure, al posto di fi,
//          { fase }: la posizione rispetto ai bracci, da −½ a ½ (0 = sulla cresta);
//   t: secondi da oggi (come le scene di spazio3d.js): i bracci girano, il fondo si raffredda.
// → vedi vuoto.js (intestazione) per la forma del risultato. Densità in m⁻³, temperature in K, pressioni in Pa.
export function contenuto(forma, punto = {}, t = 0) {
  const Q = quadro(forma), tG = t / GA_S, r = Math.max(1e-3, punto.r ?? 8), z = punto.z ?? 0, B = forma.bracci;
  const cresta = faseBraccioAlTempo(forma, r, tG), fi = punto.fase != null ? cresta + (2 * PI * punto.fase) / Math.max(1, B.numero) : punto.fi ?? 0;
  const d = Q.D.in3d(r, z, fi, tG), u = MSOLE / KPC ** 3; let k = 0; while (k < ANELLI - 1 && forma.anelli.bordo[k + 1] < r) k++;
  const a = Q.anello(k), rho = d.gas * u, n = rho / MASSA_PER_H, rif = a.sigmaGas / (2 * Q.hGas), ch = Math.cosh(Math.min(Math.abs(z) / LEGGI.spessoreGas, 30)), zf = 1 / (ch * ch), onda = rif > 0 && zf > 0 ? rho / (rif * zf) : 1;
  const F = n > 0 ? fasiIn(a, onda, zf, n) : { fasi: [], Pth: 0, PsuK: 0, peso: 0, fMol: 0, nube: null };
  let fb = ((fi - cresta) * Math.max(1, B.numero)) / (2 * PI); fb -= Math.round(fb);
  // l'alone caldo di galassie.js (forma.massaCalda, isotermo, ρ ∝ r⁻², alla temperatura viriale): c'è anche fuori dal disco
  const r3 = Math.hypot(r, z), Rv = forma.alone.raggioViriale, Vv = forma.alone.velocitaViriale, muC = 1 / (2 * (1 - ST.DATI.YPRIMO) + 0.75 * ST.DATI.YPRIMO);
  const alone = { nH: r3 < Rv ? (((forma.massaCalda * MSOLE) / (PI4 * Rv * r3 * r3 * KPC ** 3)) * (1 - ST.DATI.YPRIMO)) / K.mp : 0, T: (muC * K.mp * (Vv * 1e3) ** 2) / (2 * K.kB) };
  // la polvere: la stessa di galassie.js (d.polvere), con le taglie e l'estinzione di qui
  const pol = a.polvere, nGrani = n * pol.graniPerH, rhoPol = d.polvere * u;
  // il fondo cosmico a quel tempo: T ∝ 1/a(t) (galassie.js COSMOLOGIA) [D: corpo nero]
  const Tf = Z.Tfondo / COSMOLOGIA.scala(GAL.T0 + tG), aRad = (4 * K.sigma) / K.c, nFondo = 16 * PI * 1.2020569 * Math.pow((K.kB * Tf) / (H_PLANCK * K.c), 3);
  const elettroni = F.fasi.reduce((s, f) => s + f.volume * f.n * f.ionizzato, 0);
  return {
    dove: { r, z, fi, anello: k, faseBraccio: fb, sulBraccio: Math.abs(fb) < 0.15 && B.contrastoGas > 0, tGa: tG },
    gas: { densita: rho, nH: n, pressione: { termica: F.Pth, suK: F.PsuK, peso: F.peso, pesoSuK: F.peso / (K.kB * 1e6), min: a.curva.Pmin, max: a.curva.Pmax }, fasi: F.fasi, molecolare: F.fMol,
      chiusura: n > 0 ? F.fasi.reduce((s, f) => s + f.volume * f.n, 0) / n : 1 },
    alone,
    polvere: { densita: rhoPol, suGas: pol.suGas, grani: nGrani, taglie: pol.taglie, AVperAtomo: pol.AV, AVperMetro: n * pol.AV, RV: pol.RV, AVmisurata: pol.AVmisurata,
      T: 16.4 * Math.pow(Math.max(a.uStelle / 8.6e-14, 1e-6), 1 / 6) /* [R] un grano di silicato di 0,1 µm nella luce delle stelle: 16,4·U^(1/6) K, U = 1 a 8,6·10⁻¹⁴ J/m³ (Draine 2011, eq. 24.19) */ },
    radiazione: { G0: a.G0, ultravioletta: a.uFuv, stelle: a.uStelle, fotoniStelle: a.fotoniStelle, ionizzanti: a.ionizzanti, sfr: a.sfr },
    campo: Q.campo, cosmici: Q.cosmici,
    fondo: { T: Tf, fotoni: nFondo, energia: aRad * Tf ** 4 },
    // quanti ce ne sono in un metro cubo, in media sulle fasi (per «quanto è vuoto il vuoto»)
    perMetroCubo: { atomi: n * 1.1 /* idrogeno ed elio */, elettroni, fotoniFondo: nFondo, fotoniStelle: a.fotoniStelle, grani: nGrani, cosmici: Q.cosmici.numero },
    nubeTipica: F.nube,
  };
}

// LA MASSA DI GAS DELLA GALASSIA, contata dal basso: l'integrale di contenuto() su tutto il disco, fase per fase (in M☉).
// Deve ridare forma.massaGas (regola 4). nfi punti in angolo (tra due bracci), nz in altezza, per ogni anello (nr raggi).
export function massaDelGas(forma, { nr = 3, nfi = 12, nz = 14 } = {}) {
  const A = forma.anelli, m = { totale: 0, fasi: {} }, B = forma.bracci, h = LEGGI.spessoreGas, zMax = 8 * h;
  for (let k = 0; k < ANELLI; k++) for (let i = 0; i < nr; i++) {
    const r1 = Math.sqrt(A.bordo[k] ** 2 + (i / nr) * (A.bordo[k + 1] ** 2 - A.bordo[k] ** 2)), r2 = Math.sqrt(A.bordo[k] ** 2 + ((i + 1) / nr) * (A.bordo[k + 1] ** 2 - A.bordo[k] ** 2)), r = Math.sqrt(0.5 * (r1 * r1 + r2 * r2)), dA = PI * (r2 * r2 - r1 * r1);
    for (let j = 0; j < nfi; j++) for (let q = 0; q < nz; q++) {
      // in altezza: punti di Gauss nella variabile u = tanh(z/h) (lo strato è sech²: du = sech² dz/h)
      const uu = -1 + (2 * (q + 0.5)) / nz, z = Math.min(zMax, h * Math.atanh(uu)), c = contenuto(forma, { r, z, fase: (j + 0.5) / nfi - 0.5 }), ch = Math.cosh(z / h), dV = (dA / nfi) * ((2 / nz) * h * ch * ch) * KPC ** 3;
      const kg = c.gas.densita * dV; m.totale += kg / MSOLE; for (const f of c.gas.fasi) m.fasi[f.nome] = (m.fasi[f.nome] || 0) + (kg * f.massa) / MSOLE;
    }
  }
  void B; return m;
}

// =====================================================================================================
// 8. IL COLORE VERO: da righe e continui a rosso, verde e blu (nessun falso colore)
// =====================================================================================================
// Le funzioni di sensibilità dell'occhio (CIE 1931) nell'approssimazione a campane di Wyman, Sloan & Shirley 2013
// (J. Comput. Graph. Tech. 2, 1) [R], poi XYZ → sRGB lineare (matrice dello standard IEC 61966-2-1) [R].
const campanaCIE = (l, mu, s1, s2) => Math.exp(-0.5 * ((l - mu) / (l < mu ? s1 : s2)) ** 2);
export const occhio = (nm) => [1.056 * campanaCIE(nm, 599.8, 37.9, 31.0) + 0.362 * campanaCIE(nm, 442.0, 16.0, 26.7) - 0.065 * campanaCIE(nm, 501.1, 20.4, 26.2),
  0.821 * campanaCIE(nm, 568.8, 46.9, 40.5) + 0.286 * campanaCIE(nm, 530.9, 16.3, 31.1), 1.217 * campanaCIE(nm, 437.0, 11.8, 36.0) + 0.681 * campanaCIE(nm, 459.0, 26.0, 13.8)];
const aSRGB = (X, Y, Zc) => [3.2406 * X - 1.5372 * Y - 0.4986 * Zc, -0.9689 * X + 1.8758 * Y + 0.0415 * Zc, 0.0557 * X - 0.204 * Y + 1.057 * Zc];
const gamma = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
// righe: [{ nm, W }]; continuo: { T (corpo nero), W (potenza totale nel visibile, 380–780 nm), peso(nm) facoltativo }.
// → { rgb: [0…255] (normalizzato sul canale più forte; i colori fuori dal triangolo sRGB sono riportati al bordo),
//     luminanza (W pesati con la curva dell'occhio: lumen/683) }
export function coloreVero(righe = [], continuo = null) {
  let X = 0, Y = 0, Zc = 0;
  for (const r of righe) { if (!(r.W > 0)) continue; const o = occhio(r.nm); X += r.W * o[0]; Y += r.W * o[1]; Zc += r.W * o[2]; }
  if (continuo && continuo.W > 0) {
    let sx = 0, sy = 0, sz = 0, s = 0; const x0 = (H_PLANCK * K.c) / (K.kB * continuo.T);
    for (let nm = 385; nm < 780; nm += 10) { const l = nm * 1e-9, b = (continuo.peso ? continuo.peso(nm) : 1) / (l ** 5 * Math.expm1(x0 / l)), o = occhio(nm); s += b; sx += b * o[0]; sy += b * o[1]; sz += b * o[2]; }
    if (s > 0) { X += (continuo.W * sx) / s; Y += (continuo.W * sy) / s; Zc += (continuo.W * sz) / s; }
  }
  let rgb = aSRGB(X, Y, Zc); const m0 = Math.min(...rgb); if (m0 < 0) { rgb = rgb.map((v) => v + (Y - v) * (m0 / (m0 - Y))); } // desatura verso il grigio di pari luminanza finché entra nel triangolo
  const mx = Math.max(...rgb, 1e-300); return { rgb: rgb.map((v) => Math.round(255 * gamma(Math.max(0, v) / mx))), luminanza: Y };
}

export const dentroMezzo = { planck2, planck3, qEstinzione, sezionePerH, cosmiciBase, sezioneIonizzazione, MP_GEV, curvaTermica, quadriVolume, E2, expint1, luceNelloStrato, resaDellePopolazioni, fasiIn, MASSA_PER_H, MU_IONIZZATO, A_MRN, POLVERE_SU_GAS };
