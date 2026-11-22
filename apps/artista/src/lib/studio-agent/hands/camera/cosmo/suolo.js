// suolo.js — IL SUOLO E LA CROSTA A OGNI DISTANZA (PROGETTO.md, lavoro 9, il suolo; INTRECCIO.md, regole 4, 8, 9 e 14).
//
// La stessa struttura della finestra del mare (finestra.js): a ogni distanza si calcola, con la legge di quella grana, SOLO
// la finestra inquadrata, come campione condizionato della grana sopra; riassunta, la finestra ridà il padre (M∘μ = I).
//
// IL PADRE è la cella della mappa (la tessera di LIVELLO_PADRE di geologia.js: la stessa che lo zoom mostra quando si entra
// nella roccia) e chi la calcola: la quota, la pendenza, la roccia (litologia, continente) e la portata di geologia.js
// (erosione), la pioggia e il deflusso del secchio del suolo di meteo.js, la temperatura del clima, il flusso di calore di
// oggi della storia termica (geologia.js interno), la conducibilità della roccia di storia.js, i minerali della crosta di
// quel pianeta (chimica.js minerali, dalla catena degli elementi), la CO₂ della sua aria. Niente è copiato: chi cambia
// quelle leggi cambia da sé ciò che si vede qui.
//
// LE GRANE (non sono soglie: ogni cosa si mostra dove la sua taglia sta tra un punto dell'immagine e il lato della finestra)
//   A METRI      IL RILIEVO FINE sotto la cella: uno spettro di potenza AUTO-AFFINE della quota, P(k) = C·k^(−2−2H) per
//                k sopra il numero d'onda della cella, con la ruga lisciata dai pendii sotto la lunghezza dei versanti ℓ_c:
//                P → P/(1 + (k·ℓ_c)²)² (il trasporto lungo il pendio, K_d·∇²z, contro l'incisione dei fiumi, K·A^m·S: ℓ_c =
//                (K_d/(K·p^m))^(1/(2m+1)), il numero di Péclet uguale a uno: Perron, Kirchner e Dietrich 2008 [R]).
//                L'ESPONENTE H dalle pendenze della cella e della mappa intera (S ∝ r^(H−1): H = 1 + ln(S_radice/S_cella) /
//                ln(Δ_radice/Δ_cella)), L'AMPIEZZA C dalla pendenza della cella: la funzione di struttura del rilievo alla
//                lag della cella, V(Δ) = 4π∫P·k·(1 − J₀(kΔ))dk, vale S²·Δ²/2. La quota della cella è la media: il rilievo
//                fine sta solo nelle lunghezze d'onda più corte della cella.
//                IL SUOLO: lo spessore h dal bilancio tra la produzione dalla roccia, P₀·e^(−h/h₀) (Heimsath, Dietrich,
//                Nishiizumi e Finkel 1997 [R]: P₀ = EROSIONE.suolo di geologia.js, h₀ = 0,5 m), e l'abbassamento del
//                punto, E = E_cella − K_d·κ (la cella si abbassa quanto il fiume la incide, K·A^m·S; dove il rilievo fine è
//                convesso il pendio porta via di più, dove è concavo posa): h = h₀·ln(P₀·ρ_roccia/(ρ_suolo·E)). La curvatura
//                κ è quella del rilievo fine lisciato sullo spessore del suolo (e^(−(k·h₀)²/2): le gobbe più piccole del
//                suolo il suolo le rimescola).
//                LE FRATTURE: le crepe che il raffreddamento ha aperto (vedi sotto), tracce di lunghezza a legge di potenza
//                n(l) ∝ l^−3 (autosimile in due dimensioni: Bonnet e altri 2001 [R]) dal grano della roccia al lato della
//                cella, due famiglie verticali ad angolo retto; l'apertura della meccanica della frattura lineare.
//   A MILLIMETRI I GRANELLI: la distribuzione granulometrica del suolo dalla roccia e dall'alterazione — i cristalli della
//                roccia (la loro taglia è quella dei grani di rocce.js) che resistono nel tempo che passano nel suolo (h/E),
//                consumati con le velocità di chimica.js (sciolto), e l'argilla (caolinite) che i feldspati lasciano; i PORI:
//                l'impacchettamento casuale di quella miscela (Desmond e Weeks 2014 [R] per la polidispersità; due taglie
//                ideali alla Westman [R]); la porosità della roccia sotto è quella di ATHY, φ = φ₀·e^(−z/L), con φ₀ e L DALLA
//                ROCCIA DI QUEL PIANETA (rocciaDelPianeta, sotto); la PERMEABILITÀ di Kozeny–Carman per i pori,
//                k = d₃₂²·φ³/(180·(1 − φ)²), e la legge cubica per le fratture, k = Σ b³/12 per lunghezza di traccia; l'ACQUA
//                che si muove con Darcy, q = −(k·ρ·g/μ)·∇h, con la ricarica del clima (il deflusso del secchio di meteo.js) e
//                la partizione di Dupuit tra gli strati (la frazione della ricarica che scende sotto z è la frazione della
//                trasmissività che sta sotto z: il modello di Vogel 1967 [R] generalizzato); da lì il TEMPO DI RESIDENZA
//                dell'acqua alla profondità z, τ(z) = ∫φ/q dz (sopra la falda la caduta verticale, ∫θ/R dz). Sopra la falda
//                i pori restano pieni fin dove la capillarità li tiene (2σ/(ρ·g·r)). La TEMPERATURA il gradiente del pianeta.
//   A MICRON E   LA SUPERFICIE DEL MINERALE con l'acqua dei pori sopra; LA COMPOSIZIONE di quell'acqua: la pioggia in
//   NANOMETRI    equilibrio con la CO₂ dell'aria (sistema aperto sopra la falda, chiuso sotto), che scioglie i minerali di
//                quella roccia con le velocità di laboratorio di chimica.js (MINERALI_ROCCIA) e l'affinità (1 − Ω) fino al
//                loro equilibrio, nel tempo di residenza di quella profondità; la caolinite, la calcite e la silice amorfa
//                che precipitano; le costanti tutte da UNA tabella (mare.js gibbsSpecie, chimica.js MOLECOLE: G = H − T·S),
//                più la caolinite (Robie e Hemingway 1995 [R]). Gli atomi entrano ed escono a libro (prova). A nanometri la
//                scena: il reticolo del minerale (materia.js) e sopra l'acqua liquida fitta (finestra.js scenaNano, mW) con
//                ogni ione nel suo numero. Il luogo chimico di reazioni.js a quella profondità lo apre mappa.js.
//
// LA ROCCIA DI QUEL PIANETA (rocciaDelPianeta): non una tabella per tipo. I suoi minerali (chimica.js), i loro moduli
// elastici, la dilatazione termica e la tenacità (dati misurati per minerale [R]), le densità di materia.js; la temperatura
// a cui il fuso è diventato roccia (il basalto: il solidus della storia termica di storia.js; il granito: il solidus del
// granito bagnato, 650 °C [R, Tuttle e Bowen 1958]). Da lì:
//   φ₀ = α_V·(T_fuso − T_superficie): la contrazione termica che le crepe accolgono (la parte elastica, T₀/E ≈ 10⁻⁴, è
//        trascurata);
//   le crepe hanno l'apertura della frattura lineare elastica alla tenacità K_IC (Olson 2003 [R]: b ∝ √l):
//        b(l) = π(1 − ν²)·K_IC·√(l/2π)/E, e si chiudono quando lo sforzo efficace della colonna, (ρ − ρ_acqua)·g·z, supera
//        quello che le ha aperte, K_IC/√(π·l/2); così si chiudono prima le lunghe e poi le corte;
//   L = ∫φ(z)dz/φ₀: la profondità di Athy che tiene lo stesso volume di pori di quella chiusura (con la gravità del
//        pianeta e la densità della sua roccia).
//   La permeabilità delle crepe in superficie (legge cubica sulle tracce di n(l)) e, sotto, k(z) = k₀·(φ/φ₀)³ (le
//   aperture si stringono come la porosità).
//
// INDIRIZZI: il tratto è la cella della mappa («…/suolo/cella I,J»); le tessere del rilievo («banda b/tessera i,j») e le celle
// dei granelli e delle fratture hanno il loro evento nel tratto: due finestre sovrapposte vedono lo stesso suolo.
// DISCRETIZZAZIONI (dichiarate): le ottave e le tessere come finestra.js (quattro lunghezze d'onda per tessera, otto
// campioni per lunghezza d'onda nell'immagine); la colonna in 400 strati in progressione geometrica da 1 cm a 10 km.
// PARAMETRI LIBERI: E_min = 1% dell'abbassamento della cella (nelle conche il suolo non cresce per sempre: le frane lo
// svuotano, e qui non ci sono); h oltre 20·h₀ non cresce; il raggio dei pori 0,2 volte il grano [R]; la luce sul rilievo
// da nord-ovest a 45° (una scelta di resa).
// NON TORNA (dichiarati, le prove li stampano): la compattazione dei sedimenti non ha una legge sua (la copertura usa la
// chiusura delle crepe della roccia d'origine); le argille impaccano come sfere (le lamelle impaccano più larghe); manca la
// vita (sulla Terra radici, lombrichi e respirazione aprono il suolo e alzano la CO₂ dei pori di cento volte); le attività
// sono le concentrazioni (niente coefficienti di Debye–Hückel); i minerali si sciolgono con le velocità di laboratorio (in
// natura 10–1000 volte più lente: cambia il tempo per arrivare all'equilibrio, non l'equilibrio); il ferro ossidato
// (ematite, magnetite) e il ferro metallico non entrano nell'acqua; il pirosseno e l'olivina si sciolgono senza lasciare
// argille di magnesio; le vescicole e le brecce delle lave (il basalto della Terra ha φ₀ ≈ 0,1 per questo) non ci sono; la
// colonna usa la partizione di Dupuit (il sistema di flusso regionale): il versante da solo (sezioneVersante) manda in profondità
// molta meno acqua, e quanto sono lunghi i sistemi regionali la mappa non lo dice; quando il padre è la mappa intera (nessuna
// tessera calcolata in quel punto: né dalla mappa né dal 3D, che manda qui le sue con ricordaTessera) H e l'ampiezza si allungano su
// quattro decadi da celle di ~100 km.

import { EROSIONE, tessera } from './geologia.js';
import { STORIA } from './storia.js';
import { minerali as mineraliDi, MINERALI_ROCCIA, MOLECOLE, coloreRoccia, sciolto as scioltoIn, acidoDelSuolo } from './chimica.js';
import { MATERIALI, atomi as atomiDelReticolo, RETICOLI } from './materia.js';
import { sorgente, reticolo } from './eventi.js';
import { pesoDiscreto } from './eredita.js';
import { generatore, gaussiane, poisson, pesoTessera, scenaNano, tensioneSuperficiale, soleDiMezzogiorno, normaleCumulata } from './finestra.js';
import { viscosita, gibbsSpecie, IONI } from './mare.js';
import { NUVOLE, COSTANTI, MOLARE_ACQUA, RTERRA, ZERO_CELSIUS, R_GAS, ANNO, GRADO } from './leggi.js';
import { cristallizza } from './rocce.js';

const RAD = GRADO, DUE_PI = 2 * Math.PI, NA = COSTANTI.NA, RHO_W = 1000;
const limita = (x, a, b) => (x < a ? a : x > b ? b : x);
export const LIVELLO_PADRE = 6; // la tessera da cui si legge la cella (quella che lo zoom mostra quando si entra nella roccia)

// ======================================================================================================================
// 1. LA ROCCIA DI QUEL PIANETA: dai suoi minerali, φ₀ e L di Athy, le crepe, la permeabilità
// ======================================================================================================================
// per minerale [R, ricordati, da rileggere]: K e G (GPa, Bass 1995 «Elasticity of minerals, glasses and melts»), α_V
// (1/K, dilatazione di volume vicino a 300 K, Fei 1995), K_IC (MPa·√m, tenacità di un cristallo, Atkinson 1984). La densità
// è quella di materia.js (MATERIALI). I minerali che non hanno una voce non entrano nelle medie (dichiarato).
export const MINERALI_SUOLO = Object.freeze({
  quarzo: { K: 37.8, G: 44.3, aV: 3.5e-5, KIC: 0.85 }, plagioclasio: { K: 68, G: 32, aV: 1.4e-5, KIC: 0.9 }, 'feldspato potassico': { K: 55.4, G: 28.1, aV: 1.5e-5, KIC: 0.9 },
  pirosseno: { K: 113, G: 67, aV: 2.4e-5, KIC: 1.2 }, olivina: { K: 129, G: 78, aV: 2.7e-5, KIC: 0.8 }, biotite: { K: 50, G: 30, aV: 3e-5, KIC: 0.4 },
  calcite: { K: 70.2, G: 32, aV: 1.3e-5, KIC: 0.2 }, ematite: { K: 206, G: 91, aV: 2.5e-5, KIC: 1.4 }, magnetite: { K: 161, G: 91, aV: 3.5e-5, KIC: 1.4 },
  'ferro metallico': { K: 170, G: 82, aV: 3.5e-5, KIC: null }, periclasio: { K: 160, G: 130, aV: 3.1e-5, KIC: 1.0 }, salgemma: { K: 24.9, G: 14.7, aV: 1.2e-4, KIC: 0.3 },
  gesso: { K: 42, G: 15, aV: 6e-5, KIC: 0.3 }, "ghiaccio d'acqua": { K: 8.7, G: 3.5, aV: 1.5e-4, KIC: 0.1 },
});
export const SOLIDUS_GRANITO = 923; // K: il solidus del granito bagnato [R, Tuttle e Bowen 1958]
export const SUOLO = Object.freeze({ h0: 0.5, eMin: 0.01, hMax: 20, poroGrano: 0.2, argilla: 1e-6, sigmaArgilla: 1.0, sigmaGrani: 0.7, rugositaLuce: [-1, 1, 1.414] });

// la roccia: { tipo, minerali [{ nome, frazione (massa), v (volume) }], rho (kg/m³), E, nu (dalle medie di Hill), aV, KIC, Tfuso,
// phi0, L, grano (m), c (apertura: b = c·√l), lMin, lMax, k0 (m²) }. «Tsup» la temperatura della superficie, «g», «lMax» la
// lunghezza della traccia più lunga (il lato della cella del padre), «grano» la taglia dei cristalli
const ROCCE_FATTE = new Map();
export function rocciaDelPianeta(P, { tipo = 'granito', minerali = null, Tsup = null, g = null, lMax = null, grano = null } = {}) {
  const gg = g ?? P?.clima?.g ?? 9.81, Ts = Tsup ?? P?.clima?.T ?? 288, Lm = lMax ?? latoCella(P?.raggioM ?? RTERRA), chiave = `${P?.id ?? '?'}|${P?.raggioM}|${tipo}|${Ts.toFixed(3)}|${gg}|${Lm}|${grano}|${minerali ? minerali.map((m) => m.nome + m.frazione.toFixed(6)).join(',') : ''}`;
  let R = ROCCE_FATTE.get(chiave); if (R) return R;
  const base = tipo === 'sedimento' ? 'granito' : tipo, lista = minerali || mineraliDi({ composizione: P?.composizione || {}, T: Ts, ossidato: true, acqua: true, continente: base === 'granito' });
  // le frazioni in volume (massa/densità), le medie di Hill dei moduli, α_V e K_IC (sui silicati) in volume
  let vTot = 0; const mm = lista.map((m) => { const rho = (MATERIALI[m.nome]?.densita ?? 2.7) * 1000, v = m.frazione / rho; vTot += v; return { ...m, rho, vv: v }; });
  let Kv = 0, Gv = 0, Kr = 0, Gr = 0, w = 0, aV = 0, wa = 0, KIC = 0, wk = 0, rho = 0;
  for (const m of mm) { m.v = m.vv / vTot; rho += m.v * m.rho; const d = MINERALI_SUOLO[m.nome]; if (!d) continue; w += m.v; Kv += m.v * d.K; Gv += m.v * d.G; Kr += m.v / d.K; Gr += m.v / d.G; aV += m.v * d.aV; wa += m.v; if (d.KIC) { KIC += m.v * d.KIC; wk += m.v; } }
  const K = 0.5 * (Kv / w + w / Kr) * 1e9, G = 0.5 * (Gv / w + w / Gr) * 1e9, E = (9 * K * G) / (3 * K + G), nu = (3 * K - 2 * G) / (2 * (3 * K + G)); aV /= wa; KIC = (KIC / wk) * 1e6;
  const Tfuso = base === 'basalto' ? STORIA.solidus[0] : SOLIDUS_GRANITO, d = grano ?? granoDellaRoccia(lista, base);
  const phi0 = Math.max(0, aV * (Tfuso - Ts)), c = (Math.PI * (1 - nu * nu) * KIC) / (E * Math.sqrt(DUE_PI)), lMin = d, lM = Math.max(Lm, 10 * d);
  // la chiusura delle crepe con la profondità (lo sforzo efficace) e la profondità di Athy che tiene lo stesso volume di pori
  const dRho = rho - RHO_W, aperte = (z) => { const s = dRho * gg * z; if (!(s > 0)) return 1; const lStar = (2 * KIC * KIC) / (Math.PI * s * s), lu = limita(lStar, lMin, lM); return (lMin ** -0.5 - lu ** -0.5) / (lMin ** -0.5 - lM ** -0.5); };
  const zMax = ((KIC / Math.sqrt((Math.PI * lMin) / 2)) / (dRho * gg)) * 1.0001; let integ = 0; const n = 4000; for (let i = 0; i < n; i++) integ += aperte(((i + 0.5) * zMax) / n); integ *= zMax / n;
  const L = integ;
  // le tracce: n(l) = A₂·l^−3 per m² di superficie, A₂ dalla porosità (φ₀ = ∫n·l·b dl), la permeabilità k₀ = ∫n·l·b³/12 dl
  const A2 = phi0 / (2 * c * (lMin ** -0.5 - lM ** -0.5)), k0 = (2 * A2 * c ** 3 * (Math.sqrt(lM) - Math.sqrt(lMin))) / 12;
  R = { tipo, base, minerali: mm.map(({ nome, frazione, v, rho: r, colore }) => ({ nome, frazione, v, rho: r, colore })), rho, E, nu, K, G, aV, KIC, Tfuso, Tsup: Ts, g: gg, phi0, L, grano: d, c, lMin, lMax: lM, A2, k0, aperte,
    athy: (z) => phi0 * Math.exp(-Math.max(0, z) / L), permeabilita: (z) => k0 * Math.exp((-3 * Math.max(0, z)) / L), apertura: (l, z = 0) => c * Math.sqrt(l) * Math.exp(-Math.max(0, z) / L),
    confronto: base === 'basalto' ? { phi0: 0.1, L: 1000, fonte: 'Carlson e Herrick 1990, crosta oceanica 2A–2B [R]' } : { phi0: 0.02, L: 2000, fonte: 'Stober e Bucher 2007, granito fratturato [R]' } };
  ROCCE_FATTE.set(chiave, R); if (ROCCE_FATTE.size > 32) ROCCE_FATTE.delete(ROCCE_FATTE.keys().next().value);
  return R;
}
// il lato della cella della tessera del padre (m), all'equatore
export const latoCella = (raggioM, livello = LIVELLO_PADRE, W = 256) => (DUE_PI * raggioM) / (W * 4 ** livello);
// la taglia dei cristalli: la stessa simulazione di rocce.js che mappa.js mostra (cristallizza col raffreddamento e il lato
// che mappa.js usa per il granito e il basalto: a mano là, dichiarati là), il grano medio in metri
const GRANI_FATTI = new Map();
export function granoDellaRoccia(lista, base = 'granito') {
  const k = `${base}|${lista.map((m) => m.nome + m.frazione.toFixed(4)).join(',')}`; let d = GRANI_FATTI.get(k); if (d) return d;
  const [raff, lato] = base === 'basalto' ? [0.15, 0.004] : [0.003, 0.04], r = cristallizza({ raffreddamento: raff, minerali: lista.map((m) => ({ nome: m.nome, frazione: m.frazione, colore: m.colore || [128, 128, 128], anisotropia: 1.2 })), seme: 1 });
  d = r.nGrani > 0 ? (r.granoMedio * lato) / (r.N || 192) : lato / 20; GRANI_FATTI.set(k, d); return d;
}

// ======================================================================================================================
// 2. LA COLONNA: porosità, permeabilità, temperatura, Darcy e il tempo di residenza, dalla superficie a 10 km
// ======================================================================================================================
// roccia: rocciaDelPianeta; suolo: { h (m), phi, k (m²), theta (parte dei pori piena sopra la falda) } o null;
// { ricarica (m/anno), Tsup, q (W/m²), kRoccia (W/m/K), falda (m: la profondità della falda), eta (anni: l'età della crosta) }
export function colonna(roccia, suolo = null, { ricarica = 0, Tsup = roccia.Tsup, q = 0.06, kRoccia = STORIA.kSu, falda = 0, eta = 4.5e9, Zmax = 1e4, strati = 400, g = roccia.g } = {}) {
  const n = strati, z = new Float64Array(n + 1); z[0] = 0; const r0 = 0.01, f = Math.pow(Zmax / r0, 1 / (n - 1)); for (let i = 1; i <= n; i++) z[i] = r0 * Math.pow(f, i - 1);
  const h = suolo?.h || 0, phi = new Float64Array(n), k = new Float64Array(n), K = new Float64Array(n), T = new Float64Array(n), theta = new Float64Array(n), zm = new Float64Array(n);
  for (let i = 0; i < n; i++) { const a = z[i], b = z[i + 1], m = 0.5 * (a + b); zm[i] = m; T[i] = Tsup + (q / kRoccia) * m;
    // (uno strato che sta a cavallo della base del suolo prende le due parti in proporzione)
    const fs = h > a ? Math.min(1, (h - a) / (b - a)) : 0, pr = roccia.athy(m - h), kr = roccia.permeabilita(m - h);
    phi[i] = fs * (suolo?.phi ?? 0) + (1 - fs) * pr; k[i] = fs > 0 ? 1 / (fs / (suolo.k || 1e-30) + (1 - fs) / kr) : kr;
    K[i] = (k[i] * RHO_W * g) / viscosita(Math.min(T[i], 420), 0);
    theta[i] = m < falda ? (suolo?.theta ?? 1) * phi[i] : phi[i]; }
  // Dupuit: la trasmissività sotto z (dalla falda in giù); la frazione della ricarica che scende sotto z
  const Tsotto = new Float64Array(n + 1); for (let i = n - 1; i >= 0; i--) { const dz = z[i + 1] - z[i], sat = z[i + 1] <= falda ? 0 : z[i] >= falda ? 1 : (z[i + 1] - falda) / dz; Tsotto[i] = Tsotto[i + 1] + K[i] * dz * sat; }
  const T0 = Tsotto[0], R = ricarica / ANNO, qz = new Float64Array(n + 1), tau = new Float64Array(n + 1), uscita = new Float64Array(n);
  for (let i = 0; i <= n; i++) qz[i] = z[i] <= falda ? R : T0 > 0 ? (R * Tsotto[i]) / T0 : 0;
  for (let i = 0; i < n; i++) uscita[i] = qz[i] - qz[i + 1]; // (ciò che lo strato manda di lato, ai fiumi)
  // l'età dell'acqua scendendo: ∫θ/q dz (il punto medio di ogni strato), al più l'età della crosta
  const tetto = eta * ANNO; for (let i = 0; i < n; i++) { const dz = z[i + 1] - z[i], qm = Math.sqrt(Math.max(qz[i], 0) * Math.max(qz[i + 1], 0)) || 0.5 * (qz[i] + qz[i + 1]); tau[i + 1] = Math.min(tetto, tau[i] + (qm > 0 ? (theta[i] * dz) / qm : Infinity)); }
  const at = (arr, zz) => { if (zz <= 0) return arr[0]; let i = 0; while (i < n - 1 && z[i + 1] < zz) i++; return arr[i]; };
  const atI = (arr, zz) => { if (zz <= 0) return arr[0]; let i = 0; while (i < n && z[i + 1] < zz) i++; if (i >= n) return arr[n]; const u = (zz - z[i]) / (z[i + 1] - z[i]); return arr[i] * (1 - u) + arr[i + 1] * u; };
  return { z, zm, phi, k, K, T, theta, qz, uscita, tau, T0, ricarica, falda, h, n, roccia, suolo, eta,
    porosita: (zz) => (zz < h ? suolo.phi : roccia.athy(zz - h)), permeabilita: (zz) => at(k, zz), temperatura: (zz) => Tsup + (q / kRoccia) * zz,
    residenza: (zz) => atI(tau, zz) / ANNO, flusso: (zz) => atI(qz, zz) * ANNO, gradiente: (q / kRoccia) * 1000 };
}
// LA COLONNA DEL PIANETA, senza una superficie calcolata (per reazioni.js: i pori della crosta): la roccia della crosta di quel
// tipo, senza suolo, la ricarica della pioggia ATTESA di leggi.js (l'evaporazione di massa alla soglia della pioggia, col vento
// della legge del trasporto, non più di quanto la luce assorbita fa evaporare), tutta nel suolo: un tetto (dichiarato)
export function colonnaDelPianeta(P, { tipo = 'basalto', ricarica = null, kRoccia = STORIA.kSu, eta = null } = {}) {
  const T = P?.clima?.T ?? 288, roccia = rocciaDelPianeta(P, { tipo }), V = P?.clima?.vento ?? NUVOLE.ventoAtteso, luce = P?.clima?.bilancio?.assorbita ?? 240;
  const e = 610.94 * Math.exp((17.625 * (T - ZERO_CELSIUS)) / (T - ZERO_CELSIUS + 243.04)), piove = Math.min((NUVOLE.ce * V * e * (1 - NUVOLE.sogliaPioggia)) / ((R_GAS / MOLARE_ACQUA) * T), luce / 2.5e6); // kg/m²/s (Magnus per e_s: una riserva qui)
  const R = ricarica ?? (P?.clima?.acqua === 'liquida' ? (piove / RHO_W) * ANNO : 0);
  const c = colonna(roccia, null, { ricarica: R, Tsup: T, q: P?.interno?.q ?? 0.06, kRoccia, eta: eta ?? P?.interno?.eta ?? 4.5e9, g: P?.clima?.g ?? roccia.g });
  c.ricaricaDa = ricarica != null ? 'chi chiama' : 'la pioggia attesa di leggi.js, tutta nel suolo (un tetto: senza la superficie non si sa quanta evapora)'; return c;
}

// LA SEZIONE DEL VERSANTE (per le prove, e per chi vuole vedere sotto): Darcy in due dimensioni, dal crinale (x = ℓ) al fiume
// (x = 0), dalla falda in giù fino a «profondo», con la K della colonna; la ricarica entra da sopra, esce tutta nel fiume
// (la cella in alto a x = 0, a carico fisso). Volumi finiti a cinque punti (conducibilità armoniche tra le celle), gradienti
// coniugati col precondizionatore di Jacobi. Poi l'ETÀ DELL'ACQUA: ∇·(q·a) = φ (Goode 1996 [R]: l'età come un soluto che
// nasce in ogni poro), sopravvento, risolta in un passo solo seguendo il carico dall'alto in basso (l'acqua va sempre dal
// carico più alto al più basso: l'ordine è un grafo senza cicli). → { uscita (m²/s per metro di versante), ricarica (R·ℓ),
// residuo, etaUscita (s: l'età media pesata sul flusso di ciò che esce), volumePori, qz (per riga: il flusso verticale medio), z }
export function sezioneVersante(col, { ell, nx = 40, nz = 60, profondo = null, tol = 1e-13 } = {}) {
  const Z0 = col.falda, Zd = profondo ?? Math.min(col.z[col.n], Z0 + 4 * ell), R = col.ricarica / ANNO, dx = ell / nx, zf = new Float64Array(nz + 1);
  const r0 = Math.min(0.05, (Zd - Z0) / 1e4), f = Math.pow((Zd - Z0) / r0, 1 / (nz - 1)); zf[0] = Z0; for (let k = 1; k <= nz; k++) zf[k] = Z0 + r0 * Math.pow(f, k - 1);
  const Kz = new Float64Array(nz), phiz = new Float64Array(nz), dz = new Float64Array(nz); for (let k = 0; k < nz; k++) { const m = 0.5 * (zf[k] + zf[k + 1]); dz[k] = zf[k + 1] - zf[k]; let i = 0; while (i < col.n - 1 && col.z[i + 1] < m) i++; Kz[k] = col.K[i]; phiz[k] = col.phi[i]; }
  const N = nx * nz, id = (i, k) => k * nx + i, Tx = new Float64Array(nz), Tz = new Float64Array(nz + 1); // (le trasmissività delle facce, per metro di versante)
  for (let k = 0; k < nz; k++) Tx[k] = (Kz[k] * dz[k]) / dx; for (let k = 1; k < nz; k++) Tz[k] = dx / (0.5 * dz[k - 1] / Kz[k - 1] + 0.5 * dz[k] / Kz[k]);
  const fisso = id(0, 0), b = new Float64Array(N); for (let i = 0; i < nx; i++) b[id(i, 0)] = R * dx; b[fisso] = 0;
  const A = (x, y) => { for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) { const c = id(i, k); if (c === fisso) { y[c] = x[c]; continue; } let s = 0, d = 0;
    if (i > 0) { const t = Tx[k]; d += t; s += t * (id(i - 1, k) === fisso ? 0 : x[id(i - 1, k)]); } if (i < nx - 1) { const t = Tx[k]; d += t; s += t * x[id(i + 1, k)]; }
    if (k > 0) { const t = Tz[k]; d += t; s += t * (id(i, k - 1) === fisso ? 0 : x[id(i, k - 1)]); } if (k < nz - 1) { const t = Tz[k + 1]; d += t; s += t * x[id(i, k + 1)]; } y[c] = d * x[c] - s; } };
  const diag = new Float64Array(N); for (let k = 0; k < nz; k++) for (let i = 0; i < nx; i++) diag[id(i, k)] = id(i, k) === fisso ? 1 : (i > 0 ? Tx[k] : 0) + (i < nx - 1 ? Tx[k] : 0) + (k > 0 ? Tz[k] : 0) + (k < nz - 1 ? Tz[k + 1] : 0);
  // (gradienti coniugati: il carico h, con h = 0 nel fiume)
  const h = new Float64Array(N), r = Float64Array.from(b), zv = new Float64Array(N), p = new Float64Array(N), Ap = new Float64Array(N); for (let c = 0; c < N; c++) zv[c] = r[c] / diag[c]; p.set(zv);
  let rz = 0; for (let c = 0; c < N; c++) rz += r[c] * zv[c]; const bn = Math.sqrt(b.reduce((a, x) => a + x * x, 0)); let it = 0;
  for (; it < 20 * N; it++) { A(p, Ap); let pAp = 0; for (let c = 0; c < N; c++) pAp += p[c] * Ap[c]; const al = rz / pAp; let rn = 0; for (let c = 0; c < N; c++) { h[c] += al * p[c]; r[c] -= al * Ap[c]; rn += r[c] * r[c]; } if (Math.sqrt(rn) <= tol * bn) break;
    let rz2 = 0; for (let c = 0; c < N; c++) { zv[c] = r[c] / diag[c]; rz2 += r[c] * zv[c]; } const be = rz2 / rz; rz = rz2; for (let c = 0; c < N; c++) p[c] = zv[c] + be * p[c]; }
  // i flussi delle facce (positivi verso +x e verso il basso), l'uscita nel fiume, il residuo vero di ogni cella
  const fx = (i, k) => Tx[k] * (h[id(i, k)] - h[id(i + 1, k)]), fz = (i, k) => Tz[k + 1] * (h[id(i, k)] - h[id(i, k + 1)]);
  const uscita = (nx > 1 ? -fx(0, 0) : 0) + (nz > 1 ? -fz(0, 0) : 0) + R * dx; let residuo = 0; const Ah = new Float64Array(N); A(h, Ah); for (let c = 0; c < N; c++) if (c !== fisso) residuo += Math.abs(Ah[c] - b[c]);
  // (quanta acqua scende sotto ogni riga: la parte verso il basso — la stessa risale vicino al fiume —, da confrontare con la colonna)
  const qz = new Float64Array(nz + 1); qz[0] = R; for (let k = 0; k < nz - 1; k++) { let s = 0; for (let i = 0; i < nx; i++) s += Math.max(0, fz(i, k)); qz[k + 1] = (s * dx) / (dx * ell); }
  // l'età: le celle in ordine di carico decrescente; ognuna riceve dalle vicine più alte (sopravvento) e dalla ricarica (età 0)
  const ordine = Array.from({ length: N }, (_, c) => c).sort((x, y) => h[y] - h[x]), eta = new Float64Array(N), V = (c) => phiz[Math.floor(c / nx)] * dx * dz[Math.floor(c / nx)];
  let volume = 0; for (let c = 0; c < N; c++) volume += V(c);
  for (const c of ordine) { const i = c % nx, k = (c - i) / nx; let qin = c === fisso ? 0 : 0, ain = 0, qout = 0; const entra = (q, a) => { qin += q; ain += q * a; };
    if (k === 0) entra(R * dx, 0);
    for (const [ii, kk, q] of [[i - 1, k, i > 0 ? fx(i - 1, k) : 0], [i + 1, k, i < nx - 1 ? -fx(i, k) : 0], [i, k - 1, k > 0 ? fz(i, k - 1) : 0], [i, k + 1, k < nz - 1 ? -fz(i, k) : 0]]) { if (q > 0) entra(q, eta[id(ii, kk)]); else qout -= q; }
    if (c === fisso) qout = qin; eta[c] = qout > 0 ? (ain + V(c)) / Math.max(qout, qin) : Infinity; }
  // (l'età media di ciò che esce: la cella del fiume manda fuori tutto ciò che riceve, con la sua età)
  let etaMax = 0; for (let c = 0; c < N; c++) if (Number.isFinite(eta[c])) etaMax = Math.max(etaMax, eta[c]);
  return { uscita, ricarica: R * dx * nx, residuo, iterazioni: it, etaUscita: eta[fisso], etaMassima: etaMax, volumePori: volume, tempoDiRicambio: volume / (R * ell), qz, z: zf, nx, nz, h, eta, dx, dz, ell };
}

// ======================================================================================================================
// 3. IL PADRE: la cella della mappa e chi la calcola
// ======================================================================================================================
// S = { k (la radice: l'indirizzo del pianeta), P, se (la superficie erosa), cl (il clima), seme } — quello di mappa.js superficieDi.
// → null sull'acqua; altrimenti il padre: la cella, le pendenze, la roccia, il clima, l'erosione, lo spettro, il suolo, la colonna
// (uv: il punto nelle coordinate della mappa, [u, v], quando chi chiede lo ha già così — mappa.js —: da lì a lon, lat e di nuovo a
// u, v l'arrotondamento sposta l'ultima cifra, e un punto sul confine di due celle — il centro di una cella del padre è il confine
// di quattro di quelle della tessera sotto — cadeva nell'altra: il livello 5 e il 3D avevano padri diversi nello stesso punto)
export function padreSuolo(S, lon, lat, { livello = LIVELLO_PADRE, tessera: tt = null, uv = null } = {}) {
  const { P, se, cl } = S, u = uv ? ((uv[0] % 1) + 1) % 1 : (((lon + 180) / 360) % 1 + 1) % 1, v = limita(uv ? uv[1] : (90 - lat) / 180, 0, 0.999999), n = 4 ** livello;
  const tx = Math.floor(u * n), ty = Math.floor(v * n), t = tt || (livello > 0 ? tessera(S.k, se, cl, livello, tx, ty, S.seme ?? P.origine) : se);
  const [u0, v0, u1, v1] = t.rett || [0, 0, 1, 1], W = t.W, H = t.H, i = Math.min(W - 1, Math.floor(((u - u0) / (u1 - u0)) * W)), j = Math.min(H - 1, Math.floor(((v - v0) / (v1 - v0)) * H)), c = j * W + i;
  if (t.alt[c] < t.mare || (t.lago && t.lago[c] > 0)) return null;
  const Rp = P.raggioM, I = tx * W + i, J = ty * H + j, lonC = ((I + 0.5) / (W * n)) * 360 - 180, latC = 90 - ((J + 0.5) / (H * n)) * 180, cosl = Math.max(0.05, Math.cos(latC * RAD));
  const dx = (DUE_PI * Rp * cosl) / (W * n), dy = (Math.PI * Rp) / (H * n), D = Math.sqrt(dx * dy);
  const pend = (A, Wa, Ha, ii, jj, ddx, ddy, giro) => { let s2 = 0, m = 0; for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) { const x = ii + a, y = jj + b; if (y < 1 || y > Ha - 2) continue; const xx = giro ? ((x % Wa) + Wa) % Wa : x; if (!giro && (xx < 1 || xx > Wa - 2)) continue;
    const xm = giro ? (xx - 1 + Wa) % Wa : xx - 1, xp = giro ? (xx + 1) % Wa : xx + 1, gx = (A[y * Wa + xp] - A[y * Wa + xm]) / (2 * ddx), gy = (A[(y - 1) * Wa + xx] - A[(y + 1) * Wa + xx]) / (2 * ddy); s2 += gx * gx + gy * gy; m++; } return m ? Math.sqrt(s2 / m) : 0; };
  // (la pendenza a una scala più grossa: la mappa intera; se il padre è la mappa intera, la stessa a passi di quattro celle)
  const pendA = (A, Wa, Ha, ii, jj, ddx, ddy, giro, passo) => { if (passo === 1) return pend(A, Wa, Ha, ii, jj, ddx, ddy, giro); return pendPasso(A, Wa, Ha, ii, jj, ddx, ddy, giro, passo); };
  const pendPasso = (A, Wa, Ha, ii, jj, ddx, ddy, giro, p) => { let s2 = 0, m = 0; for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) { const y = jj + b * p; if (y < p || y > Ha - 1 - p) continue; const x = ((ii + a * p) % Wa + Wa) % Wa;
    const gx = (A[y * Wa + ((x + p) % Wa)] - A[y * Wa + ((x - p + Wa) % Wa)]) / (2 * p * ddx), gy = (A[(y - p) * Wa + x] - A[(y + p) * Wa + x]) / (2 * p * ddy); s2 += gx * gx + gy * gy; m++; } return m ? Math.sqrt(s2 / m) : 0; };
  const Sc = pend(t.alt, W, H, i, j, dx, dy, livello === 0), ir = Math.min(se.W - 1, Math.floor(u * se.W)), jr = Math.min(se.H - 1, Math.floor(v * se.H)), passoR = livello === 0 ? 4 : 1, dxr = (DUE_PI * Rp * cosl) / se.W, dyr = (Math.PI * Rp) / se.H, Sr = pendA(se.alt, se.W, se.H, ir, jr, dxr, dyr, true, passoR), Dr = Math.sqrt(dxr * dyr) * passoR;
  const Hh = Sc > 0 && Sr > 0 && Dr > 1.01 * D ? limita(1 + Math.log(Sr / Sc) / Math.log(Dr / D), 0.05, 0.95) : 0.5;
  // la roccia della cella: 0 basamento (granito sotto i continenti, basalto dei fondali), 1 vulcanica, 2 la copertura sedimentaria
  const lito = t.litologia ? t.litologia[c] : 0, cont = t.cont ? !!t.cont[c] : true, tipo = lito === 2 ? 'sedimento' : lito === 1 || !cont ? 'basalto' : 'granito';
  const classe = lito === 2 ? 'sedimento' : lito === 1 || !cont ? 'vulcanica' : 'granito', Kf = EROSIONE.K[classe], m = EROSIONE.m;
  // il clima del punto: temperatura (cl.media), pioggia e deflusso del secchio (meteo.js, mm per anno), la CO₂ dell'aria
  const ci = Math.min(cl.W - 1, Math.floor(u * cl.W)), cj = Math.min(cl.H - 1, Math.floor(v * cl.H)), Ts = cl.media[cj * cl.W + ci], me = cl.meteo, mi = me ? Math.min(me.W - 1, Math.floor(u * me.W)) : 0, mj = me ? Math.min(me.H - 1, Math.floor(v * me.H)) : 0;
  const pioggia = me?.pioggia ? me.pioggia[mj * me.W + mi] / 1000 : 0, deflusso = me?.deflusso ? Math.max(0, me.deflusso[mj * me.W + mi]) / 1000 : 0, gelo = cl.freddo ? cl.freddo[cj * cl.W + ci] : 0;
  const ricarica = deflusso * (1 - gelo), p = Math.max(pioggia * (1 - gelo), 1e-6) / EROSIONE.pioggiaRif, g = P.clima?.g ?? 9.81, aria = P.atmosfera?.gas || {}, pCO2 = (aria.CO2 || 0) * ((P.clima?.pressione ?? 1e5) / 1e5);
  // l'erosione: la cella si abbassa quanto il fiume la incide (K·A^m·S, A la portata di geologia.js in celle × m/anno), i pendii
  const A = Math.max(1, t.flusso ? t.flusso[c] : 1) * dx * dy, Ecella = Kf * Math.pow(A, m) * Sc, Kd = EROSIONE.pendii * ((cl.sgretola ?? 0.05) / 0.05), lc = Math.pow(Kd / (Kf * Math.pow(p, m)), 1 / (2 * m + 1));
  const roccia = rocciaDelPianeta(P, { tipo, minerali: (cont || tipo === 'sedimento' ? se.materiali?.continente : se.materiali?.basalto) || null, Tsup: Ts, g, lMax: D });
  const eta = (cont ? P.interno?.eta : null) ?? (t.etaCrosta ? Math.max(1e4, 1e6 * t.etaCrosta[c]) : P.interno?.eta) ?? 4.5e9;
  const padre = { sup: S, lon, lat, livello, tessera: t, i, j, c, I, J, lonC, latC, dx, dy, D, Dradice: Dr, quota: t.alt[c] - t.mare, S: Sc, Sradice: Sr, H: Hh, lito, continente: cont, tipo, classe, Kf, m, Kd, lc, Ecella, A,
    Ts, pioggia, deflusso, ricarica, gelo, g, pCO2, roccia, eta, q: P.interno?.q ?? 0.06, sciolto: t.sciolto ? t.sciolto[c] : 0, radice: `${S.k}/suolo`, raggio: Rp };
  padre.spettro = spettroRilievo(padre);
  suoloDelPadre(padre);
  return padre;
}

// ---------- LO SPETTRO DEL RILIEVO FINE (m⁴: varianza = ∫P d²k)
// J₀ (Abramowitz e Stegun 9.4.1 e 9.4.3: errore sotto 5·10⁻⁸)
export function J0(x) { x = Math.abs(x); if (x <= 3) { const y = (x / 3) ** 2; return 1 + y * (-2.2499997 + y * (1.2656208 + y * (-0.3163866 + y * (0.0444479 + y * (-0.0039444 + y * 0.00021))))); }
  const y = 3 / x, f = 0.79788456 + y * (-0.00000077 + y * (-0.0055274 + y * (-0.00009512 + y * (0.00137237 + y * (-0.00072805 + y * 0.00014476))))), th = x - 0.78539816 + y * (-0.04166397 + y * (-0.00003954 + y * (0.00262573 + y * (-0.00054125 + y * (-0.00029333 + y * 0.00013558)))));
  return (f * Math.cos(th)) / Math.sqrt(x); }
// ∫ f(k) dk su [a, b] in log k (punto medio su n punti per decade)
function integraLog(f, a, b, perDecade = 400) { const L = Math.log(b / a), n = Math.max(16, Math.ceil((L / Math.LN10) * perDecade)); let s = 0; for (let i = 0; i < n; i++) { const k = a * Math.exp(((i + 0.5) * L) / n); s += f(k) * k; } return (s * L) / n; }
export function spettroRilievo(padre) {
  const H = padre.H, lc = padre.lc, D = padre.D, kc = DUE_PI / D, forma = (k) => Math.pow(k, -2 - 2 * H) / (1 + (k * lc) ** 2) ** 2;
  // l'ampiezza: V(Δ) = 4π∫P·k·(1 − J₀(kΔ)) dk = S²Δ²/2 (la legge estesa a tutte le scale: la pendenza della cella ne è un campione)
  const V1 = 4 * Math.PI * integraLog((k) => forma(k) * k * (1 - J0(k * D)), 1e-7 / D, 1e5 / D), C = V1 > 0 ? (padre.S * padre.S * D * D) / 2 / V1 : 0;
  const kGrano = DUE_PI / Math.max(padre.roccia.grano, 1e-5), h0 = SUOLO.h0;
  const F = (k) => (k >= kc && k <= kGrano ? C * forma(k) : 0), filtro = (k) => Math.exp(-((k * h0) ** 2)); // (la curvatura che il suolo sente)
  const varianza = (a = kc, b = kGrano) => DUE_PI * integraLog((k) => F(k) * k, Math.max(a, kc), Math.min(b, kGrano)), curvatura = (a = kc, b = kGrano) => DUE_PI * integraLog((k) => F(k) * k ** 5 * filtro(k), Math.max(a, kc), Math.min(b, kGrano));
  return { C, H, lc, kc, kGrano, F, filtro, varianza, curvatura, V1, sigma2: varianza(), sigma2k: curvatura() };
}

// ---------- IL SUOLO DEL PADRE: lo spessore medio (sull'insieme delle curvature della cella), la granulometria, i pori, l'acqua
// h(E): il bilancio di Heimsath. E ≥ P₀·ρr/ρs → roccia nuda; E ≤ E_min → h al tetto
export function spessoreSuolo(padre, kappa) {
  const P0 = EROSIONE.suolo, r = padre.rapportoDensita ?? 1, E = padre.Ecella - padre.Kd * kappa, Emin = Math.max(SUOLO.eMin * padre.Ecella, P0 * r * Math.exp(-SUOLO.hMax));
  if (E >= P0 * r) return 0; return SUOLO.h0 * Math.log((P0 * r) / Math.max(E, Emin));
}
// la media su κ ~ N(0, σ²) di una funzione dello spessore (trapezi su ±8σ, n punti)
export function mediaSuCurvatura(padre, f, n = 1601, sigma2k = padre.spettro.sigma2k) { const s = Math.sqrt(sigma2k); if (!(s > 0)) return f(spessoreSuolo(padre, 0)); let a = 0, w = 0; for (let i = 0; i < n; i++) { const x = -8 + (16 * i) / (n - 1), p = Math.exp(-0.5 * x * x) * (i === 0 || i === n - 1 ? 0.5 : 1); a += p * f(spessoreSuolo(padre, x * s)); w += p; } return a / w; }
// la porosità media di una colonna di Z metri sopra uno spessore h di suolo
export function porositaColonna(padre, h, Z = 10) { const R = padre.roccia, s = padre.suolo.phi, hs = Math.min(h, Z), zr = Math.max(0, Z - h); return (s * hs + R.phi0 * R.L * (1 - Math.exp(-zr / R.L))) / Z; }
function suoloDelPadre(padre) {
  const R = padre.roccia, T = padre.Ts; padre.rapportoDensita = 1;
  for (let giro = 0; giro < 3; giro++) {
    const h = mediaSuCurvatura(padre, (x) => x), tSuolo = Math.min(padre.Ecella > 0 ? h / padre.Ecella : Infinity, Math.max(1e3, padre.sup.se?.durataErosione ?? 1e8));
    const gsd = granulometria(R, { T, anni: Math.max(1, tSuolo), pCO2: padre.pCO2 }), phi = porositaImpacchettata(gsd), rhoS = gsd.rhoSolido;
    padre.suolo = { h, tSuolo, gsd, phi, rhoSolido: rhoS, d32: gsd.d32, k: (gsd.d32 ** 2 * phi ** 3) / (180 * (1 - phi) ** 2) };
    padre.rapportoDensita = (R.rho * (1 - R.phi0)) / (rhoS * (1 - phi));
  }
  const su = padre.suolo; su.hMedio = su.h; su.porositaColonna10 = mediaSuCurvatura(padre, (h) => porositaColonna(padre, h, 10));
  // la falda: Dupuit sul versante (dal crinale al fiume, ℓ_c): l'acqua sale sopra il fiume di R·ℓ²/(2T); il versante è alto S·ℓ
  const sigma = tensioneSuperficiale(Math.max(T, 273.2), 0), visc = viscosita(Math.max(T, 250), 0), ell = padre.lc, rilievo = padre.S * ell;
  const prova = (d) => colonna(R, { h: su.h, phi: su.phi, k: su.k, theta: 1 }, { ricarica: padre.ricarica, Tsup: T, q: padre.q, falda: d, eta: padre.eta, g: padre.g });
  let d = 0, col = prova(0); for (let it = 0; it < 6; it++) { const sale = (padre.ricarica / ANNO) * ell * ell / (2 * Math.max(col.T0, 1e-30)); const dn = Math.max(0, 0.5 * (rilievo - sale)); if (Math.abs(dn - d) < 1e-3 * (1 + d)) { d = dn; break; } d = dn; col = prova(d); }
  // sopra la falda: i pori che la capillarità tiene pieni a metà strada tra il suolo e la falda (r < 2σ/(ρ·g·ψ))
  // (e almeno quanto serve a far passare la ricarica: la conducibilità dei pori non pieni K_s·S^3,5, Averjanov 1950 [R])
  const psi = Math.max(1e-3, d / 2), rc = (2 * sigma) / (RHO_W * padre.g * psi), Ks = (su.k * RHO_W * padre.g) / visc, Sq = Math.min(1, Math.pow(Math.max(padre.ricarica / ANNO, 0) / Ks, 1 / 3.5)), theta = d > 0 ? Math.max(saturazione(su.gsd, rc), Sq) : 1;
  su.theta = theta; su.falda = d; su.salitaCapillare = (2 * sigma) / (RHO_W * padre.g * SUOLO.poroGrano * su.d32);
  padre.colonna = colonna(R, { h: su.h, phi: su.phi, k: su.k, theta }, { ricarica: padre.ricarica, Tsup: T, q: padre.q, falda: d, eta: padre.eta, g: padre.g });
  padre.viscosita = visc; padre.sigma = sigma;
}

// ---------- LA GRANULOMETRIA: i cristalli della roccia che resistono e l'argilla che i feldspati lasciano. Ogni classe una
// log-normale in φ = −log₂(d) (mediana in volume d50, scarto sigma), con la sua massa, il suo minerale e la sua densità
const ALTERA = { quarzo: [['quarzo', 1]], plagioclasio: [['albite', 0.6], ['anortite', 0.4]], 'feldspato potassico': [['ortoclasio', 1]], pirosseno: [['pirosseno', 1]], olivina: [['olivina', 1]] };
const CAOLINITE_DA = { albite: [0.5, 0.2622], anortite: [1, 0.2782], ortoclasio: [0.5, 0.2783] }; // mol di caolinite per mol, kg/mol del minerale
export function granulometria(R, { T = 288, anni = 1e4, pCO2 = 2.8e-4 } = {}) {
  const aH = acidoDelSuolo(pCO2, T), classi = []; let argilla = 0;
  for (const m of R.minerali) {
    const vie = ALTERA[m.nome]; let fs = 0, kao = 0;
    if (vie && T > 271) for (const [nome, x] of vie) { const f = scioltoIn(nome, T, anni, aH); fs += x * f; if (CAOLINITE_DA[nome]) kao += x * f * ((CAOLINITE_DA[nome][0] * 0.25816) / CAOLINITE_DA[nome][1]); }
    const resta = m.frazione * (1 - fs); argilla += m.frazione * kao;
    if (resta > 1e-6) classi.push({ nome: m.nome, minerale: m.nome, d50: R.grano * Math.cbrt(Math.max(1e-6, 1 - fs)), sigma: SUOLO.sigmaGrani, massa: resta, rho: m.rho, colore: m.colore || [180, 170, 150], sciolto: fs });
  }
  if (argilla > 1e-6) classi.push({ nome: 'caolinite', minerale: 'caolinite', d50: SUOLO.argilla, sigma: SUOLO.sigmaArgilla, massa: argilla, rho: 2650, colore: [232, 224, 206], argilla: true });
  const tot = classi.reduce((a, c) => a + c.massa, 0); for (const c of classi) c.massa /= tot;
  let vol = 0, inv = 0; for (const c of classi) { const v = c.massa / c.rho, sl = c.sigma * Math.LN2; vol += v; inv += (v / c.d50) * Math.exp(0.5 * sl * sl); }
  const rhoSolido = 1 / classi.reduce((a, c) => a + c.massa / c.rho, 0);
  return { classi, d32: vol / inv, rhoSolido, argilla: classi.find((c) => c.argilla)?.massa ?? 0, aH, anni };
}
// la frazione in volume dei pori (di una miscela) con raggio sotto rc: i pori stanno tra i grani, r ≈ 0,2·d [R]
export function saturazione(gsd, rc) { let v = 0, s = 0; for (const c of gsd.classi) { const vv = c.massa / c.rho, dc = rc / SUOLO.poroGrano, sl = c.sigma * Math.LN2; v += vv; s += vv * normale(Math.log(dc / c.d50) / sl); } return v > 0 ? s / v : 0; }
const normale = (x) => { const z = Math.abs(x) / Math.SQRT2, t = 1 / (1 + 0.3275911 * z), y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z); return x >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y); };
// la porosità dell'impacchettamento casuale: la parte grossa (i cristalli) con la sua polidispersità δ (scarto/media del
// diametro: φ_rcp = 0,634 + 0,0658·δ + 0,0857·δ², Desmond e Weeks 2014 [R]); la fine (l'argilla) nei pori della grossa o la
// grossa annegata nella fine, come vuole il volume (Westman 1936 [R], due taglie ideali)
export function porositaImpacchettata(gsd) {
  const pack = (cl) => { if (!cl.length) return { phi: 0.366, v: 0 }; let v = 0, m1 = 0, m2 = 0; for (const c of cl) { const vv = c.massa / c.rho, sl = c.sigma * Math.LN2; v += vv; m1 += vv * c.d50 * Math.exp(0.5 * sl * sl); m2 += vv * c.d50 ** 2 * Math.exp(2 * sl * sl); }
    m1 /= v; m2 /= v; const dl = Math.sqrt(Math.max(0, m2 - m1 * m1)) / m1; return { phi: 1 - Math.min(0.74, 0.634 + 0.0658 * dl + 0.0857 * dl * dl), v }; };
  const g = pack(gsd.classi.filter((c) => !c.argilla)), f = pack(gsd.classi.filter((c) => c.argilla)), y = f.v / (g.v + f.v || 1);
  if (!(y > 0)) return g.phi; if (!(g.v > 0)) return f.phi;
  return Math.max(1 - (1 - g.phi) / (1 - y), 1 - 1 / (1 - y + y / (1 - f.phi)));
}

// ======================================================================================================================
// 4. IL TRATTO E LE TESSERE DEL RILIEVO (come finestra.js: ottave, tessere periodiche sovrapposte a metà, un evento per tessera)
// ======================================================================================================================
const TRATTI = new Map();
export function trattoSuolo(S, lon, lat, opz = {}) {
  const padre = padreSuolo(S, lon, lat, opz); if (!padre) return null;
  const chiave = `${S.k}|${padre.livello}|${padre.I},${padre.J}`; let t = TRATTI.get(chiave); if (t && t.S === S) return t;
  t = { S, chiave, padre, I: padre.I, J: padre.J, lon: padre.lonC, lat: padre.latC, R: padre.raggio, coslat: Math.max(0.05, Math.cos(padre.latC * RAD)), caso: sorgente(`${padre.radice}/cella ${padre.I},${padre.J}`), bande: new Map(), tessere: new Map() };
  TRATTI.set(chiave, t); if (TRATTI.size > 16) TRATTI.delete(TRATTI.keys().next().value); return t;
}
export const nelTrattoSuolo = (t, lon, lat) => { let dl = lon - t.lon; dl -= 360 * Math.round(dl / 360); return [t.R * t.coslat * dl * RAD, t.R * (lat - t.lat) * RAD]; };
export const dalTrattoSuolo = (t, x, y) => [t.lon + x / (t.R * t.coslat * RAD), t.lat + y / (t.R * RAD)];
// LE TESSERE GIÀ CALCOLATE DA ALTRI (la vista 3D: pianeta.js le fa nel suo filo e ne manda qui i campi): chi apre una finestra
// in quel punto (mappa.js, il livello 5) prende la più fine che c'è, così la finestra del 3D e quella del livello 5 hanno lo
// stesso padre, la stessa cella, lo stesso indirizzo. Si tengono le ultime otto.
const TESSERE_NOTE = new Map();
export function ricordaTessera(k, t) { if (!t?.livello || !t.rett) return; TESSERE_NOTE.set(`${k}|${t.livello}|${t.rett.join(',')}`, { k, t }); if (TESSERE_NOTE.size > 8) TESSERE_NOTE.delete(TESSERE_NOTE.keys().next().value); }
export function tesseraNota(k, u, v) { let best = null; for (const { k: kk, t } of TESSERE_NOTE.values()) { if (kk !== k) continue; const [u0, v0, u1, v1] = t.rett; if (u >= u0 && u < u1 && v >= v0 && v < v1 && (!best || t.livello > best.livello)) best = t; } return best; }
// il granello che sta sopra in un punto (x, y del tratto) della finestra: l'ultimo del modello booleano che lo copre → minerale o null (un poro)
export function granoNelPunto(fin, x, y) {
  const gr = fin._granelli || (fin._granelli = granelli(fin)); let chi = null;
  for (const g of gr.lista) { const r = g.d / 2, dx = x - g.x, dy = y - g.y; if (Math.abs(dx) > r || Math.abs(dy) > r) continue; const ca = Math.cos(g.angolo), sa = Math.sin(g.angolo), u = (dx * ca + dy * sa) / r, w = (-dx * sa + dy * ca) / (r * g.schiaccia); if (u * u + w * w <= 1) chi = g; }
  return chi ? chi.minerale : null;
}
export const RILIEVO = { M: 4, campioniPerOnda: 8, quadratura: 4 };
const nodiGL = (n) => { const x = [], w = []; for (let i = 1; i <= n; i++) { let z = Math.cos((Math.PI * (i - 0.25)) / (n + 0.5)), dp = 0; for (let it = 0; it < 100; it++) { let p0 = 1, p1 = z; for (let k = 2; k <= n; k++) { const p2 = ((2 * k - 1) * z * p1 - (k - 1) * p0) / k; p0 = p1; p1 = p2; } dp = (n * (z * p1 - p0)) / (z * z - 1); const dz = p1 / dp; z -= dz; if (Math.abs(dz) < 1e-15) break; } x.push(z); w.push(2 / ((1 - z * z) * dp * dp)); } return { x, w }; };
const GLQ = new Map(), gl = (n) => { let g = GLQ.get(n); if (!g) GLQ.set(n, (g = nodiGL(n))); return g; };
// l'ottava b: λ in (2^(b−1), 2^b]; tessera di lato 4·2^b, i modi k = 2π(i,j)/lato con 4 ≤ |(i,j)| < 8, la varianza di ogni modo
// l'integrale di P sulla sua cella (Gauss-Legendre, solo la parte nella corona e sotto la cella del padre)
function bandaSuolo(t, b) {
  const q = RILIEVO.quadratura, chiave = `${b}|${q}`; let B = t.bande.get(chiave); if (B) return B;
  const sp = t.padre.spettro, M = RILIEVO.M, T = M * 2 ** b, dk = DUE_PI / T, g = gl(q), r1 = M * M, r2 = 4 * M * M, kx = [], ky = [], s = [], jj = [];
  let varianza = 0, curv = 0;
  for (let j = -2 * M; j <= 2 * M; j++) for (let i = -2 * M; i <= 2 * M; i++) {
    const r = Math.hypot(i, j); if (r < M - 0.71 || r >= 2 * M + 0.71) continue; let v = 0, vk = 0;
    for (let a = 0; a < q; a++) for (let c = 0; c < q; c++) { const uu = i + 0.5 * g.x[a], ww = j + 0.5 * g.x[c], rr = uu * uu + ww * ww; if (rr < r1 || rr >= r2) continue; const k = Math.sqrt(rr) * dk, p = 0.25 * g.w[a] * g.w[c] * dk * dk * sp.F(k); v += p; vk += p * k ** 4 * sp.filtro(k); }
    if (!(v > 0)) continue; kx.push(i * dk); ky.push(j * dk); s.push(v); jj.push(j); varianza += v; curv += vk;
  }
  const k2 = kx.map((x, m) => (x * x + ky[m] * ky[m]) * Math.sqrt(sp.filtro(Math.hypot(x, ky[m]))));
  B = { b, T, dk, n: s.length, kx: Float64Array.from(kx), ky: Float64Array.from(ky), amp: Float64Array.from(s, Math.sqrt), k2: Float64Array.from(k2), jj: Int32Array.from(jj), varianza, curvatura: curv };
  t.bande.set(chiave, B); return B;
}
// le ottave della cella: dalla cella (2^b ≥ Δ) giù finché varianza e curvatura contano (o fino al grano)
export function bandeSuolo(t) {
  const q = RILIEVO.quadratura; if (t._bande && t._bq === q) return t._bande; t._bq = q; t.tessere.clear();
  const sp = t.padre.spettro, out = []; if (!(sp.C > 0)) return (t._bande = out);
  const bTop = Math.ceil(Math.log2(t.padre.D)), bMin = Math.floor(Math.log2(t.padre.roccia.grano)); let v = 0, c = 0;
  for (let b = bTop; b >= bMin; b--) { const B = bandaSuolo(t, b); if (B.n) out.push(B); v += B.varianza; c += B.curvatura; if (b < bTop - 3 && B.varianza < 1e-9 * v && B.curvatura < 1e-9 * c) break; }
  out.sort((a, d) => a.b - d.b); return (t._bande = out);
}
function tesseraSuolo(t, B, ti, tj) {
  const k = `${B.b}|${ti}|${tj}`; let a = t.tessere.get(k); if (a) return a;
  const r = generatore(t.caso.seme(`banda ${B.b}/tessera ${ti},${tj}`)); a = new Float64Array(2 * B.n);
  for (let m = 0; m < B.n; m++) { const [g1, g2] = gaussiane(r); a[2 * m] = g1 * B.amp[m]; a[2 * m + 1] = g2 * B.amp[m]; }
  t.tessere.set(k, a); if (t.tessere.size > 8000) { let i = 0; for (const q of t.tessere.keys()) { t.tessere.delete(q); if (++i > 2000) break; } } return a;
}
// IL RILIEVO ESATTO in un punto del tratto: quota fine e curvatura lisciata (la legge, senza la griglia: per le prove)
export function rilievoEsatto(t, x, y, bande = bandeSuolo(t)) {
  let z = 0, kap = 0;
  for (const B of bande) { const T = B.T, mezzo = T / 2, ti0 = Math.floor(x / mezzo) - 1, tj0 = Math.floor(y / mezzo) - 1;
    for (let tj = tj0; tj <= tj0 + 1; tj++) for (let ti = ti0; ti <= ti0 + 1; ti++) { const u = x - ti * mezzo, v = y - tj * mezzo; if (u < 0 || u >= T || v < 0 || v >= T) continue; const w = pesoTessera(u / T) * pesoTessera(v / T), a = tesseraSuolo(t, B, ti, tj);
      for (let m = 0; m < B.n; m++) { const th = B.kx[m] * u + B.ky[m] * v, re = a[2 * m] * Math.cos(th) - a[2 * m + 1] * Math.sin(th); z += w * re; kap -= w * re * B.k2[m]; } } }
  return { z, kappa: kap };
}
// lo stesso su una griglia nx×ny (i punti ((gx0 + i + ½)·h, (gy0 + j + ½)·h) del tratto: la stessa aritmetica in ogni finestra
// che li contiene), per ogni tessera i modi raggruppati per riga j (separabile)
function rilievoGriglia(t, gx0, gy0, h, nx, ny, bande) {
  const x0 = gx0 * h, y0 = gy0 * h, X = (i) => (gx0 + i + 0.5) * h, Y = (j) => (gy0 + j + 0.5) * h;
  const Z = new Float64Array(nx * ny), Kp = new Float64Array(nx * ny), M = RILIEVO.M, nj = 4 * M + 1;
  const Gr = new Float64Array(nj * nx), Gi = new Float64Array(nj * nx), Hr = new Float64Array(nj * nx), Hi = new Float64Array(nj * nx), wx = new Float64Array(nx), wy = new Float64Array(ny);
  for (const B of bande) { const T = B.T, mezzo = T / 2, ti0 = Math.floor(x0 / mezzo) - 1, ti1 = Math.floor((x0 + nx * h) / mezzo), tj0 = Math.floor(y0 / mezzo) - 1, tj1 = Math.floor((y0 + ny * h) / mezzo);
    for (let tj = tj0; tj <= tj1; tj++) for (let ti = ti0; ti <= ti1; ti++) {
      let ia = nx, ib = -1, ja = ny, jb = -1; for (let i = 0; i < nx; i++) { const u = X(i) - ti * mezzo; wx[i] = u >= 0 && u < T ? pesoTessera(u / T) : 0; if (wx[i] > 0) { ia = Math.min(ia, i); ib = i; } }
      for (let j = 0; j < ny; j++) { const v = Y(j) - tj * mezzo; wy[j] = v >= 0 && v < T ? pesoTessera(v / T) : 0; if (wy[j] > 0) { ja = Math.min(ja, j); jb = j; } } if (ib < 0 || jb < 0) continue;
      const a = tesseraSuolo(t, B, ti, tj); Gr.fill(0); Gi.fill(0); Hr.fill(0); Hi.fill(0);
      for (let m = 0; m < B.n; m++) { const row = (B.jj[m] + 2 * M) * nx, ar = a[2 * m], ai = a[2 * m + 1], k2 = B.k2[m];
        for (let i = ia; i <= ib; i++) { const th = B.kx[m] * (X(i) - ti * mezzo), c = Math.cos(th), s = Math.sin(th), re = ar * c - ai * s, im = ar * s + ai * c; Gr[row + i] += re; Gi[row + i] += im; Hr[row + i] += re * k2; Hi[row + i] += im * k2; } }
      for (let jr = 0; jr < nj; jr++) { const kyj = (jr - 2 * M) * B.dk, row = jr * nx; let vuota = true; for (let i = ia; i <= ib; i++) if (Gr[row + i] || Gi[row + i]) { vuota = false; break; } if (vuota) continue;
        for (let j = ja; j <= jb; j++) { const th = kyj * (Y(j) - tj * mezzo), c = Math.cos(th), s = Math.sin(th), o = j * nx, wj = wy[j];
          for (let i = ia; i <= ib; i++) { const w = wx[i] * wj; Z[o + i] += w * (Gr[row + i] * c - Gi[row + i] * s); Kp[o + i] -= w * (Hr[row + i] * c - Hi[row + i] * s); } } } } }
  return { Z, Kp };
}

// ======================================================================================================================
// 5. LA FINESTRA: un quadrato di lato L attorno a (lon, lat), alla profondità «profonditaM» per ciò che sta sotto la superficie
// ======================================================================================================================
export const FINESTRA = { massimo: 40000 };
// («tratto» e «centro»: una finestra di quel tratto col centro in quel punto delle sue coordinate, anche fuori dalla cella: la
// stessa legge, per le prove che vogliono finestre indipendenti dello stesso padre)
export function finestraSuolo(S, { lon = 0, lat = 0, latoM = 1, N = 128, profonditaM = null, livello = LIVELLO_PADRE, tessera: tt = null, tratto = null, centro = null, uv = null } = {}) {
  const t = tratto || trattoSuolo(S, lon, lat, { livello, tessera: tt, uv }); if (!t) return { acqua: true, descrizione: 'Qui c\'è acqua: la finestra è quella del mare (finestra.js).' };
  const P = t.padre, h = latoM / N, [xc, yc] = centro || nelTrattoSuolo(t, lon, lat), gx0 = Math.floor((xc - latoM / 2) / h), gy0 = Math.floor((yc - latoM / 2) / h), x0 = gx0 * h, y0 = gy0 * h;
  const tutte = bandeSuolo(t), bf = Math.floor(Math.log2(RILIEVO.campioniPerOnda * h)), bande = tutte.filter((B) => B.b >= bf);
  const fin = { S, tratto: t, padre: P, lon, lat, L: N * h, N, h, x0, y0, gx0, gy0, bf, bande, profonditaM: profonditaM ?? Math.max(0.01, P.suolo.h / 2) };
  fin.varianza = bande.reduce((a, B) => a + B.varianza, 0); fin.sottoIlPunto = tutte.filter((B) => B.b < bf).reduce((a, B) => a + B.varianza, 0);
  fin.curvaturaVista = bande.reduce((a, B) => a + B.curvatura, 0); fin.curvaturaSotto = tutte.filter((B) => B.b < bf).reduce((a, B) => a + B.curvatura, 0);
  Object.defineProperty(fin, 'campo', { get() { return this._campo || (this._campo = campoFinestra(this)); }, enumerable: false });
  fin.acquaPori = acquaDelPunto(P, fin.profonditaM);
  fin.descrizione = descriviSuolo(fin);
  return fin;
}
// il campo della finestra: quota fine, curvatura, spessore del suolo e porosità della colonna (10 m) per ogni punto
function campoFinestra(fin) {
  const N = fin.N, { Z, Kp } = rilievoGriglia(fin.tratto, fin.gx0, fin.gy0, fin.h, N, N, fin.bande), hs = new Float64Array(N * N), pc = new Float64Array(N * N), P = fin.padre;
  for (let q = 0; q < N * N; q++) { hs[q] = spessoreSuolo(P, Kp[q]); pc[q] = porositaColonna(P, hs[q], 10); }
  return { Z, Kp, h: hs, porosita: pc };
}
// ---------- le popolazioni della finestra: le crepe (tracce) e i granelli, cella per cella con indirizzo nel tratto
// le tracce visibili (lunghe almeno un punto): n(l) = A₂·l^−3 tra l_vis e l_max, due famiglie a 90°, la direzione di
// ciascuna un evento della cella del padre; i punti medi Poisson su celle di lato 1/√n
export function fratture(fin, { lVis = null } = {}) {
  const P = fin.padre, R = P.roccia, t = fin.tratto, L = fin.L, lv = Math.max(lVis ?? 2 * fin.h, R.lMin), lM = R.lMax, out = []; if (!(lv < lM) || !(R.A2 > 0)) return out;
  const nA = (R.A2 / 2) * (lv ** -2 - lM ** -2), dir0 = t.caso('fratture/direzione') * Math.PI; // (per m²: tutte e due le famiglie)
  let lato = 1 / Math.sqrt(nA); const marg = Math.min(lM, 4 * L); if (((L + 2 * marg) / lato) ** 2 > FINESTRA.massimo) lato = (L + 2 * marg) / Math.sqrt(FINESTRA.massimo);
  const media = nA * lato * lato, i0 = Math.floor((fin.x0 - marg) / lato), i1 = Math.floor((fin.x0 + L + marg) / lato), j0 = Math.floor((fin.y0 - marg) / lato), j1 = Math.floor((fin.y0 + L + marg) / lato);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const r = generatore(t.caso.seme(`fratture ${lv.toExponential(2)}/cella ${lato.toExponential(3)}/${i},${j}`)), quante = poisson(r, media);
    for (let q = 0; q < quante; q++) { const x = (i + r()) * lato, y = (j + r()) * lato, u = r(), fam = r() < 0.5 ? 0 : 1, l = lv / Math.sqrt(1 - u * (1 - (lv / lM) ** 2)), a = dir0 + fam * (Math.PI / 2) + 0.1 * gaussiane(r)[0];
      const dx = 0.5 * l * Math.cos(a), dy = 0.5 * l * Math.sin(a); if (Math.max(x + dx, x - dx) < fin.x0 || Math.min(x + dx, x - dx) > fin.x0 + L || Math.max(y + dy, y - dy) < fin.y0 || Math.min(y + dy, y - dy) > fin.y0 + L) continue;
      out.push({ x0: x - dx, y0: y - dy, x1: x + dx, y1: y + dy, l, b: R.apertura(l, 0), famiglia: fam }); } }
  return out;
}
// i granelli: il modello booleano dei dischi (la copertura 1 − e^(−n·π⟨r²⟩) = 1 − φ: i vuoti hanno la porosità del suolo), per
// ogni classe le taglie della sua log-normale (per numero: d50·e^(−3σ²)). Le taglie sono divise in OTTAVE (d tra 2^n e 2^(n+1)
// metri), ognuna con le sue celle (lato 1/√n dell'ottava) e i suoi eventi: un granello è lo stesso in ogni finestra che lo
// contiene, a qualunque distanza; una finestra genera solo le ottave che distingue (d ≥ mezzo punto)
export function granelli(fin, { dVis = null } = {}) {
  const P = fin.padre, su = P.suolo, t = fin.tratto, L = fin.L, dv = dVis ?? 0.5 * fin.h, out = [], conta = [];
  const vol = su.gsd.classi.reduce((a, c) => a + c.massa / c.rho, 0), lam = -Math.log(Math.max(1e-6, su.phi));
  for (const c of su.gsd.classi) {
    const sl = c.sigma * Math.LN2, dN = c.d50 * Math.exp(-3 * sl * sl), r2 = 0.25 * dN * dN * Math.exp(2 * sl * sl), nA = ((lam * (c.massa / c.rho)) / vol) / (Math.PI * r2), Fd = (d) => normale(Math.log(d / dN) / sl), sopra = 1 - Fd(dv);
    conta.push({ nome: c.nome, perM2: nA, visibili: nA * sopra * L * L, sottoIlPunto: 1 - sopra }); if (!(sopra > 0)) continue;
    const n0 = Math.floor(Math.log2(dv)), n1 = Math.ceil(Math.log2(dN * Math.exp(6 * sl)));
    for (let n = n0; n <= n1; n++) { const a = 2 ** n, b = 2 ** (n + 1), Fa = Fd(a), Fb = Fd(b), nO = nA * (Fb - Fa); if (!(nO > 0) || nO * (L + 2 * b) ** 2 < 1e-3) continue;
      let lato = 1 / Math.sqrt(nO); const mar = b; if (((L + 2 * mar) / lato + 2) ** 2 > FINESTRA.massimo) lato = (L + 2 * mar) / (Math.sqrt(FINESTRA.massimo) - 2);
      const media = nO * lato * lato, i0 = Math.floor((fin.x0 - mar) / lato), i1 = Math.floor((fin.x0 + L + mar) / lato), j0 = Math.floor((fin.y0 - mar) / lato), j1 = Math.floor((fin.y0 + L + mar) / lato);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const r = generatore(t.caso.seme(`granelli ${c.nome}/ottava ${n}/cella ${lato.toExponential(3)}/${i},${j}`)), quante = poisson(r, media);
        for (let q = 0; q < quante; q++) { const x = (i + r()) * lato, y = (j + r()) * lato, pu = Fa + r() * (Fb - Fa), d = dN * Math.exp(sl * normaleInv(Math.min(1 - 1e-12, Math.max(1e-12, pu)))), ang = r() * Math.PI, schiaccia = c.argilla ? 0.25 : 0.75 + 0.25 * r();
          if (d < dv || x + d < fin.x0 || x - d > fin.x0 + L || y + d < fin.y0 || y - d > fin.y0 + L) continue; out.push({ x, y, d, minerale: c.minerale, colore: c.colore, angolo: ang, schiaccia, argilla: !!c.argilla }); } } }
  }
  // (il modello booleano: chi arriva dopo sta sopra; l'ordine è quello delle taglie, i piccoli sopra i grandi, poi per posizione)
  out.sort((p, q) => q.d - p.d || p.x - q.x || p.y - q.y);
  return { lista: out, classi: conta };
}
const normaleInv = (p) => { const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239], b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1], c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783], d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  if (p < 0.02425) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); } if (p > 1 - 0.02425) return -normaleInv(1 - p);
  const q = p - 0.5, r = q * q; return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); };

// ======================================================================================================================
// 6. L'ACQUA DEI PORI: la pioggia con la CO₂ dell'aria che scioglie quella roccia, nel tempo che resta lì
// ======================================================================================================================
// le specie e le costanti: G = H − T·S da UNA tabella (mare.js gibbsSpecie: ioni, CO₂(aq), H₄SiO₄, SiO₂ amorfa; chimica.js
// MOLECOLE: minerali, acqua, CO₂ gassosa), più la caolinite [R, Robie e Hemingway 1995: ΔH_f −4119,6 kJ/mol, S 200,9 J/mol/K]
const G_EXTRA = { caolinite: [-4119.6, 200.9] };
const gibbs = (f, T) => { if (G_EXTRA[f]) return 1000 * G_EXTRA[f][0] - T * G_EXTRA[f][1]; const m = MOLECOLE[f]; if (m) return 1000 * m.dH - T * m.S; return gibbsSpecie(f, T); };
const logK = (reag, prod, T) => { let g = 0; for (const f in prod) g += prod[f] * gibbs(f, T); for (const f in reag) g -= reag[f] * gibbs(f, T); return -g / (R_GAS * T * Math.LN10); };
// le reazioni di dissoluzione per unità di formula (i membri finali; i minerali misti sono miscele meccaniche di quelli)
const REAZ = {
  quarzo: { reag: { SiO2: 1, 'H2O(l)': 2 }, prod: { H4SiO4: 1 } }, albite: { reag: { NaAlSi3O8: 1, 'H+': 1, 'H2O(l)': 4.5 }, prod: { 'Na+': 1, H4SiO4: 2, caolinite: 0.5 } },
  anortite: { reag: { CaAl2Si2O8: 1, 'H+': 2, 'H2O(l)': 1 }, prod: { 'Ca2+': 1, caolinite: 1 } }, ortoclasio: { reag: { KAlSi3O8: 1, 'H+': 1, 'H2O(l)': 4.5 }, prod: { 'K+': 1, H4SiO4: 2, caolinite: 0.5 } },
  enstatite: { reag: { MgSiO3: 1, 'H+': 2, 'H2O(l)': 1 }, prod: { 'Mg2+': 1, H4SiO4: 1 } }, wollastonite: { reag: { CaSiO3: 1, 'H+': 2, 'H2O(l)': 1 }, prod: { 'Ca2+': 1, H4SiO4: 1 } },
  forsterite: { reag: { Mg2SiO4: 1, 'H+': 4 }, prod: { 'Mg2+': 2, H4SiO4: 1 } }, fayalite: { reag: { Fe2SiO4: 1, 'H+': 4 }, prod: { 'Fe2+': 2, H4SiO4: 1 } },
};
// i minerali del pianeta come miscele (per unità di formula di materia.js), e la velocità di chimica.js (MINERALI_ROCCIA)
export const MISCELE = {
  quarzo: { parti: { quarzo: 1 }, cinetica: [['quarzo', 1]] }, plagioclasio: { parti: { albite: 0.6, anortite: 0.4 }, cinetica: [['albite', 0.6], ['anortite', 0.4]] },
  'feldspato potassico': { parti: { ortoclasio: 1 }, cinetica: [['ortoclasio', 1]] }, pirosseno: { parti: { wollastonite: 0.5, enstatite: 1.2, fayalite: 0.15, quarzo: 0.15 }, cinetica: [['pirosseno', 1]] },
  olivina: { parti: { forsterite: 0.9, fayalite: 0.1 }, cinetica: [['olivina', 1]] },
};
const ATOMI = { SiO2: { Si: 1, O: 2 }, 'H2O(l)': { H: 2, O: 1 }, H4SiO4: { H: 4, Si: 1, O: 4 }, NaAlSi3O8: { Na: 1, Al: 1, Si: 3, O: 8 }, 'H+': { H: 1, q: 1 }, 'Na+': { Na: 1, q: 1 }, caolinite: { Al: 2, Si: 2, O: 9, H: 4 },
  CaAl2Si2O8: { Ca: 1, Al: 2, Si: 2, O: 8 }, 'Ca2+': { Ca: 1, q: 2 }, KAlSi3O8: { K: 1, Al: 1, Si: 3, O: 8 }, 'K+': { K: 1, q: 1 }, MgSiO3: { Mg: 1, Si: 1, O: 3 }, 'Mg2+': { Mg: 1, q: 2 }, CaSiO3: { Ca: 1, Si: 1, O: 3 },
  Mg2SiO4: { Mg: 2, Si: 1, O: 4 }, Fe2SiO4: { Fe: 2, Si: 1, O: 4 }, 'Fe2+': { Fe: 1, q: 2 }, CO2: { C: 1, O: 2 }, 'CO2(aq)': { C: 1, O: 2 }, 'HCO3-': { H: 1, C: 1, O: 3, q: -1 }, 'CO3(2-)': { C: 1, O: 3, q: -2 },
  'OH-': { O: 1, H: 1, q: -1 }, CaCO3: { Ca: 1, C: 1, O: 3 }, 'SiO2(am)': { Si: 1, O: 2 } };
const somma = (dst, f, n) => { const a = ATOMI[f]; for (const e in a) dst[e] = (dst[e] || 0) + n * a[e]; };
const costanti = new Map();
function costantiDi(T) { const k = T.toFixed(3); let c = costanti.get(k); if (c) return c; const L = (r, p) => Math.pow(10, logK(r, p, T));
  c = { K1: L({ 'CO2(aq)': 1, 'H2O(l)': 1 }, { 'H+': 1, 'HCO3-': 1 }), K2: L({ 'HCO3-': 1 }, { 'H+': 1, 'CO3(2-)': 1 }), Kw: L({ 'H2O(l)': 1 }, { 'H+': 1, 'OH-': 1 }), KH: L({ CO2: 1 }, { 'CO2(aq)': 1 }),
    Kcc: L({ CaCO3: 1 }, { 'Ca2+': 1, 'CO3(2-)': 1 }), Kam: L({ 'SiO2(am)': 1, 'H2O(l)': 2 }, { H4SiO4: 1 }), r: {} };
  for (const n in REAZ) c.r[n] = logK(REAZ[n].reag, REAZ[n].prod, T); costanti.set(k, c); return c; }
// la speciazione: dati i totali (mol/kg), [H⁺] dal bilancio delle cariche; C aperto (CO₂(aq) = K_H·pCO₂) o chiuso (C totale)
function specia(tot, c, { aperto, pCO2, CT }) {
  const cat = (tot.Na || 0) + (tot.K || 0) + 2 * ((tot.Ca || 0) + (tot.Mg || 0) + (tot.Fe || 0)), co2a = aperto ? c.KH * pCO2 : 0;
  const f = (H) => { let hc, co; if (aperto) { hc = (c.K1 * co2a) / H; co = (c.K2 * hc) / H; } else { const d = 1 + c.K1 / H + (c.K1 * c.K2) / (H * H); hc = ((CT || 0) * (c.K1 / H)) / d; co = (hc * c.K2) / H; } return H + cat - hc - 2 * co - c.Kw / H; };
  let a = -16, b = 1; for (let it = 0; it < 300; it++) { const m = 0.5 * (a + b); if (m === a || m === b) break; if (f(10 ** m) > 0) b = m; else a = m; } // (fino all'ultimo bit)
  const H = 10 ** (0.5 * (a + b)); let CO2, HCO3, CO3; if (aperto) { CO2 = co2a; HCO3 = (c.K1 * CO2) / H; CO3 = (c.K2 * HCO3) / H; } else { const d = 1 + c.K1 / H + (c.K1 * c.K2) / (H * H); CO2 = (CT || 0) / d; HCO3 = (CO2 * c.K1) / H; CO3 = (HCO3 * c.K2) / H; }
  return { H, OH: c.Kw / H, CO2, HCO3, CO3, pH: -Math.log10(H), carica: H + cat - HCO3 - 2 * CO3 - c.Kw / H };
}
// il logaritmo del rapporto di saturazione Ω di una miscela (Σ x·(log IAP − log K) dei membri)
function logOmega(nome, tot, sp, c) { const M = MISCELE[nome]; let s = 0; const att = { 'H+': sp.H, 'Na+': tot.Na, 'K+': tot.K, 'Ca2+': tot.Ca, 'Mg2+': tot.Mg, 'Fe2+': tot.Fe, H4SiO4: tot.Si };
  for (const p in M.parti) { const R = REAZ[p]; let l = 0; for (const f in R.prod) if (att[f] !== undefined) l += R.prod[f] * Math.log10(Math.max(att[f], 1e-300)); for (const f in R.reag) if (att[f] !== undefined) l -= R.reag[f] * Math.log10(Math.max(att[f], 1e-300)); s += M.parti[p] * (l - c.r[p]); } return s; }
// la velocità di laboratorio (mol/m²/s) a T e [H⁺]: i termini neutro e acido di chimica.js MINERALI_ROCCIA
const velocita = (nome, T, H) => { let v = 0; for (const [n, x] of MISCELE[nome].cinetica) { const M = MINERALI_ROCCIA[n], ar = (Ea) => Math.exp(((-1000 * Ea) / R_GAS) * (1 / T - 1 / 298.15)); v += x * (10 ** M[0] * ar(M[1]) + (M[3] > -90 ? 10 ** M[3] * ar(M[5]) * H ** M[4] : 0)); } return v; };
// roccia: rocciaDelPianeta (i suoi minerali); { T, pCO2 (bar), anni (il tempo di residenza), aperto (sopra la falda), superficie
// (m² di minerale per kg d'acqua) } → la composizione (mol/kg), il pH, i solidi nati, il libro degli atomi
// («aree»: m² per kg d'acqua minerale per minerale, se chi chiama le sa; se no «superficie» divisa per la parte in volume)
export function acquaDeiPori(roccia, { T = 288, pCO2 = 2.8e-4, anni = 1, aperto = true, superficie = 100, aree: areeDate = null, passi = 160 } = {}) {
  const c = costantiDi(Math.min(Math.max(T, ZERO_CELSIUS), 373)), mins = roccia.minerali.filter((m) => MISCELE[m.nome] && m.v > 0), xi = {}, tot = { Na: 0, K: 0, Ca: 0, Mg: 0, Fe: 0, Si: 0 };
  for (const m of mins) xi[m.nome] = 0; let kao = 0, cc = 0, si = 0, acquaUsata = 0;
  const sp0 = specia(tot, c, { aperto: true, pCO2 }), CT0 = sp0.CO2 + sp0.HCO3 + sp0.CO3; let CT = CT0; // (la pioggia arriva in equilibrio con l'aria)
  const stato = () => specia(tot, c, { aperto, pCO2, CT }), aree = Object.fromEntries(mins.map((m) => [m.nome, areeDate ? areeDate[m.nome] || 0 : superficie * m.v]));
  const sciogli = (m, dx) => { const M = MISCELE[m.nome]; xi[m.nome] += dx; for (const p in M.parti) { const R = REAZ[p], n = M.parti[p] * dx; for (const f in R.prod) { if (f === 'Na+') tot.Na += R.prod[f] * n; else if (f === 'K+') tot.K += R.prod[f] * n; else if (f === 'Ca2+') tot.Ca += R.prod[f] * n; else if (f === 'Mg2+') tot.Mg += R.prod[f] * n; else if (f === 'Fe2+') tot.Fe += R.prod[f] * n; else if (f === 'H4SiO4') tot.Si += R.prod[f] * n; else if (f === 'caolinite') kao += R.prod[f] * n; }
    acquaUsata += (R.reag['H2O(l)'] || 0) * n; } };
  let sp = stato(); const t1 = Math.max(anni, 1e-9) * ANNO, t0 = Math.min(1, t1 / 10); let tPrima = 0;
  for (let s = 0; s <= passi; s++) { const tt = s === 0 ? t0 : t0 * Math.pow(t1 / t0, s / passi), dt = tt - tPrima; tPrima = tt;
    for (const m of mins) { const lo = logOmega(m.nome, tot, sp, c); if (lo >= 0) continue; let dx = velocita(m.nome, T, sp.H) * aree[m.nome] * (1 - 10 ** lo) * dt;
      // (non oltre l'equilibrio: se il passo lo supera, la bisezione trova l'estensione che lo raggiunge)
      const prova = (d) => { const salva = { ...tot }, sx = xi[m.nome], sk = kao, sa = acquaUsata; sciogli(m, d); const sp2 = stato(), l = logOmega(m.nome, tot, sp2, c); Object.assign(tot, salva); xi[m.nome] = sx; kao = sk; acquaUsata = sa; return l; };
      if (dx > 0 && prova(dx) > 0) { let a = 0, b = dx; for (let it = 0; it < 60; it++) { const mm = 0.5 * (a + b); if (prova(mm) > 0) b = mm; else a = mm; } dx = a; }
      if (dx > 0) { sciogli(m, dx); sp = stato(); } }
    // la calcite e la silice amorfa precipitano quando l'acqua le supera (la calcite libera un H⁺: Ca²⁺ + HCO₃⁻ → CaCO₃ + H⁺)
    if (tot.Ca > 0 && tot.Ca * sp.CO3 > c.Kcc) { const prova = (x) => { const t2 = { ...tot, Ca: tot.Ca - x }, s2 = specia(t2, c, { aperto, pCO2, CT: CT - x }); return t2.Ca * s2.CO3 - c.Kcc; }; let a = 0, b = tot.Ca; for (let it = 0; it < 80; it++) { const mm = 0.5 * (a + b); if (prova(mm) > 0) a = mm; else b = mm; } tot.Ca -= a; cc += a; if (!aperto) CT -= a; sp = stato(); }
    if (tot.Si > c.Kam) { const x = tot.Si - c.Kam; tot.Si -= x; si += x; acquaUsata -= 2 * x; }
  }
  sp = stato(); const CTfin = sp.CO2 + sp.HCO3 + sp.CO3;
  // IL LIBRO DEGLI ATOMI: entra (1 kg d'acqua, la CO₂ presa dall'aria, i minerali sciolti) contro esce (l'acqua che resta, le
  // specie sciolte, i solidi nati). L'acqua consumata: le reazioni, l'idratazione della CO₂ (una per HCO₃⁻ e CO₃²⁻, e una per
  // ogni carbonio finito nella calcite: CO₂ + H₂O + Ca²⁺ → CaCO₃ + 2H⁺), un OH⁻ per ogni molecola che si divide; la silice che
  // precipita la restituisce. (La prova di test_suolo ha trovato la calcite: prima mancava)
  const H2O0 = 1 / MOLARE_ACQUA, co2Presa = aperto ? CTfin + cc : CT0, acquaFin = H2O0 - acquaUsata - (sp.HCO3 + sp.CO3) - sp.OH - cc;
  const entra = {}, esce = {}; somma(entra, 'H2O(l)', H2O0); somma(entra, 'CO2', co2Presa);
  for (const m of mins) { const M = MISCELE[m.nome]; for (const p in M.parti) somma(entra, Object.keys(REAZ[p].reag)[0], M.parti[p] * xi[m.nome]); }
  somma(esce, 'H2O(l)', acquaFin); somma(esce, 'H+', sp.H); somma(esce, 'OH-', sp.OH); somma(esce, 'CO2(aq)', sp.CO2); somma(esce, 'HCO3-', sp.HCO3); somma(esce, 'CO3(2-)', sp.CO3);
  somma(esce, 'Na+', tot.Na); somma(esce, 'K+', tot.K); somma(esce, 'Ca2+', tot.Ca); somma(esce, 'Mg2+', tot.Mg); somma(esce, 'Fe2+', tot.Fe); somma(esce, 'H4SiO4', tot.Si); somma(esce, 'caolinite', kao); somma(esce, 'CaCO3', cc); somma(esce, 'SiO2(am)', si);
  const ioni = { 'Na+': tot.Na, 'K+': tot.K, 'Ca2+': tot.Ca, 'Mg2+': tot.Mg, 'Fe2+': tot.Fe, 'HCO3-': sp.HCO3, 'CO3(2-)': sp.CO3, 'H+': sp.H, 'OH-': sp.OH };
  const sat = Object.fromEntries(mins.map((m) => [m.nome, logOmega(m.nome, tot, sp, c)]));
  return { T, pCO2, anni, aperto, pH: sp.pH, ioni, neutri: { 'CO2(aq)': sp.CO2, H4SiO4: tot.Si }, solidi: { caolinite: kao, calcite: cc, 'silice amorfa': si }, sciolti: { ...xi }, saturazione: sat, libro: { entra, esce }, carica: sp.carica,
    forza: 0.5 * (tot.Na + tot.K + 4 * (tot.Ca + tot.Mg + tot.Fe) + sp.HCO3 + 4 * sp.CO3 + sp.H + sp.OH), costanti: c };
}
// l'acqua dei pori di un punto del padre alla profondità z: il tempo di residenza della colonna, aperta sopra la falda, la
// superficie dei granelli (6/(ρ·d)) nel suolo, le pareti delle crepe (2/b per volume d'acqua) nella roccia
export function acquaDelPunto(padre, z) {
  const col = padre.colonna, su = padre.suolo, R = padre.roccia, nelSuolo = z < su.h, T = col.temperatura(z), anni = Math.max(1e-6, col.residenza(z));
  // nel suolo la superficie di ogni minerale è quella dei suoi granelli che restano (6/(ρ·d₃₂) per la sua classe, l'argilla non
  // conta: è un prodotto), per kg d'acqua dei pori; nella roccia le pareti delle crepe, divise per la parte in volume
  const kgRoccia = nelSuolo ? ((1 - su.phi) * su.rhoSolido) / (su.phi * RHO_W) : 0, aree = nelSuolo ? {} : null;
  if (nelSuolo) for (const c of su.gsd.classi) if (!c.argilla) { const sl = c.sigma * Math.LN2; aree[c.minerale] = (aree[c.minerale] || 0) + (kgRoccia * c.massa * 6) / (c.rho * c.d50 * Math.exp(-0.5 * sl * sl)); }
  const sup = nelSuolo ? Object.values(aree).reduce((x, y) => x + y, 0) : (2 / Math.max(1e-9, R.apertura(Math.sqrt(R.lMin * R.lMax), z - su.h))) / RHO_W;
  const a = acquaDeiPori(R, { T, pCO2: padre.pCO2, anni, aperto: z < col.falda, superficie: sup, aree });
  return { ...a, z, nelSuolo, superficie: sup };
}

// ======================================================================================================================
// 7. L'IMMAGINE DELLA FINESTRA (RGBA N×N, il nord in alto): a metri il rilievo ombreggiato col suolo e le crepe, a millimetri
// i granelli e i pori pieni d'acqua o d'aria, sotto il millimetro la superficie del grano con l'argilla e il velo d'acqua
// ======================================================================================================================
const GAMMA = (x) => Math.round(255 * Math.pow(limita(x, 0, 1), 1 / 2.2)), LIN = (c) => Math.pow(c / 255, 2.2);
// LA LUCE: quella della stella del luogo, [est, nord, su] (chi chiama la dà: la mappa col suo istante); se non la dà, la stella
// a mezzogiorno dell'equinozio a quella latitudine (finestra.js soleDiMezzogiorno). Prima: sempre da nord-ovest a 45°, ovunque.
// («luce: false»: la sola riflettanza — per la vista 3D, che mette sul rilievo la luce vera)
// BAGNATO, il suolo è più scuro (Lekner e Dorf 1988, Appl. Opt. 27, 1278): la luce rimandata dai grani torna indietro dal velo
// d'acqua per riflessione interna con probabilità x = 1 − (1 − ρ̄)/n² (ρ̄ = 0,066, n = 1,333): A_bagnato = (1 − ρ̄)·A·(1 − x)/(1 − x·A).
// Quanta parte della superficie è bagnata: i pori che la capillarità tiene pieni alla quota della falda (saturazione: i pori
// più stretti di 2σ/(ρ·g·z)), la stessa legge dei pori a millimetri; tutta, se la falda è in superficie. Prima: ×0,72 a mano.
// I GRANELLI SOPRA O SOTTO IL PUNTO (eredita.js pesoDiscreto): ogni classe di grani ha il peso del discreto, una rampa di
// un'ottava attorno a due punti dell'immagine; l'immagine dei grani uno per uno e quella del suolo ombreggiato si sommano con
// la parte in massa dei grani che si vedono uno per uno. Prima: una soglia secca, la prima classe oltre due punti cambiava tutto.
const RHO_E = 0.066, XI = 1 - (1 - RHO_E) / 1.333 ** 2, bagnata = (A) => ((1 - RHO_E) * A * (1 - XI)) / (1 - XI * A);
export function immagineSuolo(fin, { luce = true } = {}) {
  const N = fin.N, px = new Uint8ClampedArray(N * N * 4), P = fin.padre, su = P.suolo, R = P.roccia;
  const cR = coloreRoccia(R.minerali.map((m) => ({ frazione: m.frazione, colore: m.colore || [150, 150, 150] }))).map(LIN), cS = coloreRoccia(su.gsd.classi.map((c) => ({ frazione: c.massa, colore: c.colore }))).map(LIN);
  const scrivi = (q, c, ombra = 1) => { px[4 * q] = GAMMA(c[0] * ombra); px[4 * q + 1] = GAMMA(c[1] * ombra); px[4 * q + 2] = GAMMA(c[2] * ombra); px[4 * q + 3] = 255; };
  // la luce sul rilievo (Lambert), con la pendenza del padre e quella fine
  const F = fin.campo, Z = F.Z, l = Array.isArray(luce) ? luce : soleDiMezzogiorno(P.lat ?? fin.tratto.lat).dir, ln = Math.hypot(...l), sx = P.S / Math.SQRT2, lume = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const a = j * N + Math.max(0, i - 1), b = j * N + Math.min(N - 1, i + 1), c = Math.max(0, j - 1) * N + i, d = Math.min(N - 1, j + 1) * N + i;
    const gx = sx + (Z[b] - Z[a]) / ((Math.min(N - 1, i + 1) - Math.max(0, i - 1)) * fin.h), gy = sx + (Z[d] - Z[c]) / ((Math.min(N - 1, j + 1) - Math.max(0, j - 1)) * fin.h), nn = Math.hypot(gx, gy, 1);
    lume[j * N + i] = luce ? 0.25 + 0.95 * Math.max(0.08, (-gx * l[0] - gy * l[1] + l[2]) / (nn * ln)) : 1; }
  const umido = fin.profonditaM >= su.falda || su.falda <= 0, rcS = (2 * P.sigma) / (RHO_W * P.g * Math.max(1e-3, su.falda)), satS = su.falda <= 0 ? 1 : saturazione(su.gsd, rcS);
  const vede = su.gsd.classi.reduce((a, c) => a + c.massa * pesoDiscreto(c.d50 / (2 * fin.h)), 0), suolo1 = vede < 1 ? new Uint8ClampedArray(N * N * 4) : null;
  const fluido = (dentro) => (dentro ? [LIN(38), LIN(66), LIN(92)] : [LIN(16), LIN(14), LIN(12)]);
  if (vede < 1) { // ---- a metri: il suolo (o la roccia nuda dove il suolo è più sottile di qualche grano), ombreggiato; le crepe dove affiora
    // (LA NEBBIA DEI GRANELLI: in ogni punto cadono N granelli, Poisson classe per classe con la densità del modello booleano;
    // il colore del punto è quello dei suoi granelli e dei pori, e ogni granello ha la sua faccia alla luce: lo scarto 0,3 di
    // Lambert su facce a caso, diviso √N. Un evento per punto, col suo indirizzo nel tratto: «grana h/gx,gy»)
    const vol = su.gsd.classi.reduce((a, c) => a + c.massa / c.rho, 0), lam = -Math.log(Math.max(1e-6, su.phi)), grana = reticolo(`${fin.tratto.chiave}/grana ${fin.h.toExponential(3)}`);
    const cl = su.gsd.classi.map((c) => { const sl = c.sigma * Math.LN2, dN = c.d50 * Math.exp(-3 * sl * sl), r2 = 0.25 * dN * dN * Math.exp(2 * sl * sl), nA = ((lam * (c.massa / c.rho)) / vol) / (Math.PI * r2); return { mu: nA * fin.h * fin.h, area: r2, colore: c.colore }; });
    const muTot = cl.reduce((a, c) => a + c.mu, 0), nebbia = new Float32Array(3 * N * N), mF = [0, 0, 0];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const q = (N - 1 - j) * N + i, fs = limita(F.h[j * N + i] / Math.max(4 * R.grano, 0.02), 0, 1);
      let nT = 1; const gx = fin.gx0 + i, gy = fin.gy0 + j, r = () => normaleCumulata(grana(gx, gy, nT++)), g = grana(gx, gy, 0), lista = []; // (i numeri del punto: il nodo (gx, gy) della griglia della finestra, in coordinate del tratto)
      for (const c of cl) { const k = poisson(r, c.mu); if (k) lista.push({ frazione: k * c.area, colore: c.colore }); } // (i colori si mescolano come in una polvere: Kubelka-Munk, chimica.js)
      const suolo = lista.length ? coloreRoccia(lista).map(LIN) : cS, ombra = 1 + (0.3 * g) / Math.sqrt(Math.max(1, muTot));
      for (let k = 0; k < 3; k++) { const A = cR[k] * (1 - fs) + suolo[k] * fs, B = cR[k] * (1 - fs) + cS[k] * fs; nebbia[3 * q + k] = (A * (1 - satS) + bagnata(A) * satS) * lume[j * N + i] * ombra; mF[k] += (B * (1 - satS) + bagnata(B) * satS) * lume[j * N + i]; } }
    // (la media, come per i grani qui sotto: quella del suolo visto da lontano, la polvere di tutti i grani. Con pochi grani
    // per punto la polvere di ogni punto è quasi quella del suo grano, e la media dei punti scivolava verso la mescolanza lineare)
    { const mN = [0, 0, 0]; for (let q = 0; q < N * N; q++) for (let k = 0; k < 3; k++) mN[k] += nebbia[3 * q + k]; const g = mN.map((x, k) => (x > 0 ? mF[k] / x : 1));
      for (let q = 0; q < N * N; q++) { px[4 * q] = GAMMA(nebbia[3 * q] * g[0]); px[4 * q + 1] = GAMMA(nebbia[3 * q + 1] * g[1]); px[4 * q + 2] = GAMMA(nebbia[3 * q + 2] * g[2]); px[4 * q + 3] = 255; } }
    // (si disegnano le crepe larghe almeno un centesimo di punto: le altre sono il colore della roccia, la nebbia)
    for (const f of fratture(fin, { lVis: (fin.h / (100 * R.c)) ** 2 })) { const n = Math.ceil(Math.hypot(f.x1 - f.x0, f.y1 - f.y0) / (0.5 * fin.h)); for (let s = 0; s <= n; s++) { const x = f.x0 + ((f.x1 - f.x0) * s) / n, y = f.y0 + ((f.y1 - f.y0) * s) / n, i = Math.floor((x - fin.x0) / fin.h), j = Math.floor((y - fin.y0) / fin.h); if (i < 0 || j < 0 || i >= N || j >= N) continue;
      if (F.h[j * N + i] > Math.max(f.b, 2 * R.grano)) continue; const q = (N - 1 - j) * N + i, w = limita(f.b / fin.h, 0, 1); for (let k = 0; k < 3; k++) px[4 * q + k] = Math.round(px[4 * q + k] * (1 - 0.75 * w)); } }
    if (vede <= 0) return px; suolo1.set(px);
  }
  // ---- a millimetri e sotto: i granelli (modello booleano: chi arriva dopo sta sopra) e tra loro i pori; i grani più piccoli
  // di un punto colorano il poro in proporzione a quanto ne coprono; sotto la falda il poro è pieno d'acqua, sopra solo dove è
  // più stretto del raggio che la capillarità tiene pieno (il velo che bagna i grani)
  const gr = granelli(fin), vuoto = new Float32Array(N * N).fill(1e9), pieno = new Uint8Array(N * N), solido = new Float32Array(3 * N * N), liquido = new Float32Array(3 * N * N), rc = (2 * P.sigma) / (RHO_W * P.g * Math.max(1e-3, su.falda / 2));
  let fFini = 0; const cF = [0, 0, 0]; { let w = 0; for (const c of su.gsd.classi) { const v = c.massa / c.rho, s = gr.classi.find((x) => x.nome === c.nome)?.sottoIlPunto ?? 1; w += v; fFini += v * s; for (let k = 0; k < 3; k++) cF[k] += v * s * LIN(c.colore[k]); } for (let k = 0; k < 3; k++) cF[k] /= Math.max(fFini, 1e-30); fFini = Math.min(1, ((fFini / w) * (1 - su.phi)) / Math.max(1e-6, su.phi + (fFini / w) * (1 - su.phi))); }
  const orlo = Math.min(64, rc / fin.h) + 2; // (fin dove il velo d'acqua può arrivare attorno a un granello)
  for (const g of gr.lista) { const r = g.d / 2, cx = (g.x - fin.x0) / fin.h, cy = (g.y - fin.y0) / fin.h, rp = r / fin.h, ca = Math.cos(g.angolo), sa = Math.sin(g.angolo), col = g.colore.map(LIN);
    for (let j = Math.max(0, Math.floor(cy - rp - orlo)); j <= Math.min(N - 1, Math.ceil(cy + rp + orlo)); j++) for (let i = Math.max(0, Math.floor(cx - rp - orlo)); i <= Math.min(N - 1, Math.ceil(cx + rp + orlo)); i++) {
      const dx = i + 0.5 - cx, dy = j + 0.5 - cy, u = (dx * ca + dy * sa) / rp, v = (-dx * sa + dy * ca) / (rp * g.schiaccia), dd = Math.hypot(u, v), q = (N - 1 - j) * N + i;
      if (dd <= 1) { const o = (0.62 + 0.38 * Math.sqrt(Math.max(0, 1 - dd * dd)) - 0.08 * (u + v)) * lume[j * N + i]; for (let k = 0; k < 3; k++) { solido[3 * q + k] = col[k] * o; liquido[3 * q + k] = 0; } pieno[q] = 1; vuoto[q] = 0; } else if (!pieno[q]) vuoto[q] = Math.min(vuoto[q], (dd - 1) * r * Math.min(1, g.schiaccia)); } }
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const q = (N - 1 - j) * N + i; if (pieno[q]) continue; const fl = fluido(umido || vuoto[q] < rc), o = lume[j * N + i]; for (let k = 0; k < 3; k++) { solido[3 * q + k] = cF[k] * fFini * o; liquido[3 * q + k] = fl[k] * (1 - fFini) * o; } }
  // IL COLORE MEDIO SI CONSERVA (eredita.js, separa: il totale è lo stesso sopra e sotto il punto). Da lontano il suolo ha il
  // colore della polvere dei suoi grani (Kubelka-Munk, chimica.js: la luce che rimbalza da un grano all'altro), qui sopra;
  // i grani uno per uno, ciascuno col colore del suo minerale, darebbero in media la mescolanza lineare, più chiara: dalla
  // finestra di un centimetro a quella di un millimetro il suolo passava dall'arancio al beige. Come le molecole dell'acqua
  // (mappa.js, tesseraNano), i grani (e i fini nei pori) prendono per canale il fattore che rende la media dell'immagine
  // uguale a quella del suolo visto da lontano, con la stessa luce; l'acqua e l'aria dei pori restano del loro colore.
  { const mS = [0, 0, 0], mL = [0, 0, 0], mF = [0, 0, 0];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const q = (N - 1 - j) * N + i, fs = limita(F.h[j * N + i] / Math.max(4 * R.grano, 0.02), 0, 1), o = lume[j * N + i];
      for (let k = 0; k < 3; k++) { const A = cR[k] * (1 - fs) + cS[k] * fs; mF[k] += (A * (1 - satS) + bagnata(A) * satS) * o; mS[k] += solido[3 * q + k]; mL[k] += liquido[3 * q + k]; } }
    const g = [0, 1, 2].map((k) => (mS[k] > 0 ? Math.max(0, (mF[k] - mL[k]) / mS[k]) : 1));
    for (let q = 0; q < N * N; q++) { px[4 * q] = GAMMA(solido[3 * q] * g[0] + liquido[3 * q]); px[4 * q + 1] = GAMMA(solido[3 * q + 1] * g[1] + liquido[3 * q + 1]); px[4 * q + 2] = GAMMA(solido[3 * q + 2] * g[2] + liquido[3 * q + 2]); px[4 * q + 3] = 255; } }
  // (la somma delle due immagini, in luce lineare, pesate con la parte dei grani che si vede uno per uno)
  if (suolo1) for (let q = 0; q < N * N; q++) for (let k = 0; k < 3; k++) px[4 * q + k] = GAMMA(LIN(suolo1[4 * q + k]) * (1 - vede) + LIN(px[4 * q + k]) * vede);
  return px;
}
// ======================================================================================================================
// 8. CHE COSA C'È: la descrizione, coi numeri veri e la grana da cui vengono
// ======================================================================================================================
const fmt = (x) => (!Number.isFinite(x) ? String(x) : x === 0 ? '0' : Math.abs(x) >= 1e4 || Math.abs(x) < 1e-2 ? x.toExponential(1).replace('.', ',').replace('e+', '·10^').replace('e-', '·10^−') : (+x.toPrecision(3)).toString().replace('.', ','));
const lung = (m) => (m >= 1000 ? `${fmt(m / 1000)} km` : m >= 1 ? `${fmt(m)} m` : m >= 1e-2 ? `${fmt(m * 100)} cm` : m >= 1e-3 ? `${fmt(m * 1000)} mm` : m >= 1e-6 ? `${fmt(m * 1e6)} µm` : `${fmt(m * 1e9)} nm`);
const tempo = (a) => (a >= 1e6 ? `${fmt(a / 1e6)} milioni di anni` : a >= 1 ? `${fmt(a)} anni` : a * 365.25 >= 1 ? `${fmt(a * 365.25)} giorni` : `${fmt(a * 8766)} ore`);
const NOMI_ROCCIA = { granito: 'granito', basalto: 'basalto', sedimento: 'roccia sedimentaria' };
export function descriviSuolo(fin) {
  const P = fin.padre, su = P.suolo, R = P.roccia, col = P.colonna, A = fin.acquaPori, parti = [];
  parti.push(`Una finestra di ${lung(fin.L)} sul suolo (${fin.N}×${fin.N} punti, un punto ${lung(fin.h)}), nella cella di ${lung(P.D)} della mappa`);
  parti.push(`la pendenza della cella ${fmt(100 * P.S)}%; il rilievo sotto la cella è autoaffine con H = ${fmt(P.H)} (dalle pendenze della cella e della mappa) e liscio sotto ${lung(P.lc)} (i pendii contro i fiumi): scarto ${lung(Math.sqrt(P.spettro.sigma2))} sotto la cella, ${lung(Math.sqrt(fin.bande.filter((B) => 2 ** B.b <= fin.L).reduce((a, B) => a + B.varianza, 0)))} nelle onde più corte della finestra (le più lunghe la inclinano)`);
  parti.push(`${NOMI_ROCCIA[P.tipo]} di questo pianeta (cristalli di ${lung(R.grano)}): φ₀ = ${fmt(R.phi0)} dalla contrazione col raffreddamento da ${fmt(R.Tfuso - ZERO_CELSIUS)} °C, Athy L = ${lung(R.L)} dalla chiusura delle crepe (g = ${fmt(R.g)} m/s²); crepe a ogni scala, dal grano alla cella (${fmt(R.A2)} tracce per m² più lunghe di un metro, aperte ${lung(R.apertura(1))}: più sottili di un punto, si vedono solo dove sono larghe almeno un centesimo di punto)`);
  parti.push(`il suolo è spesso ${lung(su.h)} in media (Heimsath: la roccia si fa suolo al più ${fmt(EROSIONE.suolo * 1000)} mm/anno, la cella si abbassa di ${fmt(P.Ecella * 1e6)} m per milione di anni); granelli: ${su.gsd.classi.filter((c) => c.massa > 0.02).map((c) => `${c.nome} ${fmt(100 * c.massa)}% (${lung(c.d50)})`).join(', ')}; pori ${fmt(100 * su.phi)}%, permeabilità ${fmt(su.k)} m²`);
  parti.push(`la pioggia ${fmt(P.pioggia * 1000)} mm/anno, ne scende ${fmt(P.ricarica * 1000)}: la falda è a ${lung(col.falda)}${col.falda > 0 ? `, sopra i pori sono pieni al ${fmt(100 * su.theta)}%` : ''}; l'acqua resta ${tempo(col.residenza(fin.profonditaM))} a ${lung(fin.profonditaM)}, ${tempo(col.residenza(100))} a 100 m, ${tempo(col.residenza(1000))} a 1 km; ${fmt(col.temperatura(1000) - ZERO_CELSIUS)} °C a 1 km (${fmt(col.gradiente)} K/km)`);
  const io = Object.entries(A.ioni).filter(([f, x]) => x > 1e-9 && f !== 'H+' && f !== 'OH-').sort((a, b) => b[1] - a[1]).slice(0, 4).map(([f, x]) => `${f} ${fmt(x * 1000)} mmol/L`);
  parti.push(`l'acqua dei pori a ${lung(fin.profonditaM)}: pH ${fmt(A.pH)}, ${io.join(', ') || 'quasi pura'}, silice ${fmt(A.neutri.H4SiO4 * 1000)} mmol/L (CO₂ dell'aria ${fmt(P.pCO2 * 1e5)} Pa${A.aperto ? '' : ', chiusa sotto la falda'}); ${A.solidi.caolinite > 1e-9 ? `nasce caolinite` : 'nessuna argilla nata'}${A.solidi.calcite > 1e-9 ? ', calcite' : ''}`);
  parti.push('vita: nessuna — il modello non ha ancora la vita (i microbi dei pori, la respirazione che alza la CO₂)');
  return `${parti.join('; ')}.`;
}

// ======================================================================================================================
// 9. A NANOMETRI: la superficie del minerale e sopra l'acqua dei pori, con ogni ione nel suo numero
// ======================================================================================================================
// una «campione» nella forma di mare.js campioneAcqua per scenaNano (gli ioni liberi, l'acqua alla sua densità, la CO₂ sciolta)
export function campioneDeiPori(A) {
  const perM3 = (c) => c * RHO_W * NA, classi = [], ioni = {};
  for (const [f, c] of Object.entries(A.ioni)) { if (!(c > 0) || f === 'H+' || f === 'OH-' || !IONI[f]) continue; classi.push({ tipo: 'ione', materiale: f, perM3: perM3(c) }); ioni[f] = { perM3: perM3(c) }; }
  return { classi, ioni, gas: A.neutri['CO2(aq)'] > 0 ? { CO2: { perM3: perM3(A.neutri['CO2(aq)']) } } : {}, acquaPerM3: (RHO_W / MOLARE_ACQUA) * NA, T: A.T, viscosita: viscosita(Math.max(A.T, 250), 0) };
}
export function scenaSuolo(padre, { z = null, latoM = 6e-9, minerale = null } = {}, caso = null) {
  const zz = z ?? padre.suolo.h / 2, A = acquaDelPunto(padre, zz), camp = campioneDeiPori(A), c = caso || sorgente(`${padre.radice}/nano/${padre.I},${padre.J}/${zz.toPrecision(3)}`);
  const acqua = scenaNano(null, { latoM, campione: camp }, c), Lb = acqua.scatola[0];
  const nome = minerale && RETICOLI[minerale] ? minerale : (padre.roccia.minerali.find((m) => RETICOLI[m.nome]) || { nome: 'quarzo' }).nome;
  const ret = atomiDelReticolo(nome, { latoM: Lb * 1e-9, spessoreM: 1.2e-9, T: A.T, massimo: 30000, fermi: true }, c.sotto('reticolo')), dz = ret.spessoreM * 1e9 + 0.15;
  const nA = acqua.atomi.pos.length / 3, nR = ret.atomi.length, pos = new Float32Array(3 * (nA + nR)), raggio = new Float32Array(nA + nR), elemento = new Uint8Array(nA + nR);
  const Z = { O: 8, Si: 14, Al: 13, Na: 11, K: 19, Ca: 20, Mg: 12, Fe: 26, H: 1, C: 6, Cl: 17 };
  // (la verticale è la seconda coordinata, come nella vista di atomi3d.js: il minerale sotto, l'acqua sopra; chi la ripete lo fa
  // lungo la prima e la terza: periodica(scena, [3, 1, 3]))
  for (let i = 0; i < nR; i++) { const a = ret.atomi[i]; pos[3 * i] = a.x * 1e9; pos[3 * i + 2] = a.y * 1e9; pos[3 * i + 1] = dz - a.z * 1e9 - 0.15; raggio[i] = a.raggio * 1e9; elemento[i] = Z[a.el] || 14; }
  for (let i = 0; i < nA; i++) { pos[3 * (nR + i)] = acqua.atomi.pos[3 * i]; pos[3 * (nR + i) + 2] = acqua.atomi.pos[3 * i + 1]; pos[3 * (nR + i) + 1] = acqua.atomi.pos[3 * i + 2] + dz; raggio[nR + i] = acqua.atomi.raggio[i]; elemento[nR + i] = acqua.atomi.elemento[i]; }
  // (i colori: l'acqua quelli della sua scena, il colore del mare come in finestra.js; il minerale quello della sua polvere, chimica.js.
  // Prima la scena perdeva i colori dell'acqua e la vista dava agli idrogeni il bianco pieno: sfere sature a 0,9 nm)
  const colore = new Uint8Array(3 * (nA + nR)), cMin = (padre.roccia.minerali.find((m) => m.nome === nome) || {}).colore || [190, 186, 176];
  for (let i = 0; i < nR; i++) colore.set(cMin, 3 * i); if (acqua.atomi.colore) colore.set(acqua.atomi.colore.subarray ? acqua.atomi.colore.subarray(0, 3 * nA) : acqua.atomi.colore.slice(0, 3 * nA), 3 * nR); else for (let i = 0; i < nA; i++) colore.set(acqua.coloreAcqua || [40, 70, 100], 3 * (nR + i));
  const sposta = (arr) => Uint32Array.from(arr, (x) => x + nR);
  return { ...acqua, atomi: { pos, raggio, elemento, colore }, legami: sposta(acqua.legami), legamiH: sposta(acqua.legamiH), scatola: [Lb, Lb + dz, Lb], ripeti: [3, 1, 3], parti: [{ nome: nome, da: 0, a: nR }, ...acqua.parti.map((p) => ({ ...p, da: p.da + nR, a: p.a + nR }))],
    acquaPori: A, minerale: nome, reticolo: ret.descrizione, descrizione: `la superficie ${/^[aeiou]/.test(nome) ? "dell'" : 'del '}${nome} con sopra l'acqua dei pori a ${lung(zz)} di profondità (pH ${fmt(A.pH)}, ${tempo(A.anni)} nei pori): ${acqua.descrizione.replace(/^l'acqua di questo mare in /, '')}` };
}
