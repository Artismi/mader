// elementi.js — LA CATENA DEGLI ELEMENTI (lavoro 8 di PROGETTO.md): nessun inventario fissato a priori.
//
// Quanto c'è di ogni elemento in ogni serbatoio (il gas da cui nasce una stella, il disco, il nucleo, il mantello, la
// crosta, il mare, l'aria, i ghiacci di un pianeta) non è una tabella del Sole scalata: viene dalla storia della galassia,
// della stella e del pianeta. Il LIBRO DEI CONTI garantisce soltanto che, elemento per elemento, nulla si crei o sparisca.
// Ogni passo nella forma della regola zero (PROGETTO.md): STATI, CONSERVAZIONI, ENERGIE, FLUSSI.
//
//  1. GALASSIA → STELLA (galassie.js tiene i conti, qui le rese).
//     Stati: il gas di ogni anello della galassia a ogni passo, con i suoi metalli divisi per CANALE (chi li ha fatti):
//       cc0…cc3  le supernove da collasso (con le ipernove) di quattro metallicità (le quattro tabelle di galassie.js);
//       ia       le nane bianche che esplodono (W7);  agbC, agbN  le giganti asintotiche (carbonio, azoto).
//     Conservazioni: la massa dei metalli di ogni canale si muove con il gas (nascite, vento, fontana, raffreddamento,
//       fusioni): ogni passaggio di galassie.js che sposta i metalli sposta i canali nella stessa proporzione; i canali
//       sommati sono i metalli di sempre (galassie.js: forma.interno.ZnC, provato).
//     Energie / tempi: i tempi sono quelli delle vite delle stelle (stelle.js) e dei ritardi delle Ia (Maoz e Graur 2017)
//       che galassie.js usa già: le supernove da collasso escono nel passo stesso, le Ia con t^−1,1, le giganti dopo la
//       vita della loro massa (da 0,1 a qualche Ga).
//     Flussi: la storia delle nascite della galassia (anello per anello) e il gas che entra (povero) o esce (il vento).
//     Ne viene, per ogni stella, la miscela del gas da cui è nata: [α/Fe] alto nelle vecchie (prima delle Ia), C/O e
//     N/O che crescono col tempo (le giganti arrivano dopo), il sodio e l'alluminio che crescono con Z (rese di Kobayashi).
//  2. DISCO → PIANETA (disco.js): ogni elemento condensa alla sua temperatura del 50% (Lodders 2003), con la curva di
//     Clausius–Clapeyron che quella temperatura e l'entropia di Trouton fissano; il ferro si ossida nel gas della
//     nebulosa dove l'equilibrio Fe + H2O ⇌ FeO + H2 lo vuole (freddo: lontano dalla stella). La temperatura è quella che
//     disco.js conosce già: la più alta tra la luce della stella (280 K·L^¼/√r) e il calore del gas che cade (la stessa
//     legge del bordo interno). Il pianeta prende i solidi del luogo di ogni embrione che lo ha fatto (sommati negli urti).
//  2b. LE PERDITE DURANTE L'ACCRESCIMENTO (perditeAccrescimento, sezione 4b): gli embrioni fusi (alluminio 26) e i corpi fusi
//     dagli urti giganti mandano fuori, solidificando, gli alogeni e una parte dell'acqua; gli urti (Schlichting et al. 2015) e
//     la fuga (limitata dall'energia della luce dura della stella giovane) ne portano via una parte, nello SPAZIO. Dipende dalla
//     storia di quel pianeta: la sua massa, quando sono nati i suoi embrioni, chi è caduto su chi e quando.
//  3. IL PIANETA SI SEPARA (differenzia): metallo e silicato fusi all'equilibrio alla base dell'oceano di magma,
//     log K_D = a + b/T + c·P/T con l'ossigeno conservato (il silicio che va nel nucleo dà due FeO al mantello: Javoy 1995,
//     Rubie et al. 2011): fO2 non è dato, esce. P e T: crescita continua, ogni strato si separa sul fondo del pianeta di
//     allora (⟨P_CMB⟩ = 3/5 della finale, per P ∝ M^⅔) al liquidus dei silicati (storia.js, una fonte sola).
//  4. LA CROSTA (crosta): fusione d'equilibrio del mantello con la frazione fusa media della storia di QUEL pianeta
//     (storia.js) e coefficienti minerale/fuso; la crosta dei continenti è una seconda fusione del basalto (chimica.js:
//     gli stessi D dei minerali), con il volume di tettonica.js dove ci sono placche e acqua.
//  5. ARIA E MARE: l'aria è ciò che chimica.js lascia fuori dall'inventario di QUESTO pianeta; il mare prende dalla crosta
//     di questo pianeta le rocce che la pioggia scioglie (chimica.rocceDelPianeta legge composizione.elementi), e le tracce
//     (tracceDelMare: Li, B, F, Br, I, Sr, U, Mo, Fe, Mn, P, Si) con la loro specie semplice.
//  6. IL LIBRO DEI CONTI (libroDeiConti): per ogni elemento la massa in nucleo, mantello, crosta, mare, aria, ghiacci, spazio;
//     ogni serbatoio prende da quello sotto (il mare dalla crosta e dal mantello, l'aria dal mantello), e se qualcuno
//     chiede più di quanto c'è il libro lo dice (scoperto). La somma è quella che il disco ha dato.
//
// FONTI. [V] letto sulla fonte (arXiv), [R] ricordato (da rileggere), [D] derivato qui.
//   · abbondanze protosolari: Wang, Lineweaver e Ireland 2019 (Icarus 328, 287; arXiv:1810.12741), tabella 1, colonna 14 [V];
//     i metalli riportati a Z☉ = 0,0142 di stelle.js (la loro somma è 0,0140: l'1,4% in meno, dichiarato);
//   · rese delle supernove da collasso e delle Ia: Kobayashi, Umeda, Nomoto, Tominaga e Ohkubo 2006 (ApJ 653, 1145;
//     arXiv:astro-ph/0608688), tabella 3: rese pesate con la IMF di Salpeter (0,07–50 M☉), ipernove al 50%, Z = 0, 0,001,
//     0,004, 0,02; ultima colonna la W7 (Nomoto, Thielemann e Yokoi 1984; Iwamoto et al. 1999, ApJS 125, 439) [V].
//     Sono rese TOTALI dell'ejecta: le nuove sono il totale meno l'ejecta per la composizione iniziale (scalata dal Sole) [D];
//   · giganti asintotiche: Karakas 2010 (MNRAS 403, 1413; arXiv:0912.2142): le tabelle sono in linea e qui non lette;
//     i numeri di C e N per massa sono RICORDATI dalle sue figure (Z = 0,02, 0,004, 0,0001) [R];
//   · temperature di condensazione al 50%: Lodders 2003 (ApJ 591, 1220), tabella 8 [R];
//   · la Terra di confronto: Wang et al. 2018 (Icarus 299, 460; arXiv:1708.08718) [V] (mantello primitivo, nucleo, 0,325);
//   · ripartizione metallo/silicato: Fischer et al. 2015 (GCA 167, 177: Ni, Co, V, Cr, Si, O), Wade e Wood 2005 (Mn, W, Mo, P),
//     valori misurati per S, Cu, Zn, Pt, Au [R]: la forma log K_D = a + b/T + c·P/T e il bilancio dell'ossigeno sono quelli
//     di Rubie et al. 2015 (Icarus 248, 89; arXiv:1410.3509) [V]; i loro parametri (tabella S2) non sono nel testo aperto;
//   · coefficienti minerale/fuso di una lherzolite (in blocco) e del basalto che rifonde [R] (Salters e Stracke 2004,
//     Workman e Hart 2005 i valori tipici); per i maggiori quelli di chimica.js (una fonte sola);
//   · il mare: costanti di equilibrio a 25 °C [R] (fluorite, celestina, apatite, rodocrosite, boro, silice, fosfato);
//     ripartizione dello stronzio nella calcite D = 0,1 [R].
//   · perdite durante l'accrescimento [R]: Hevey e Sanders 2006 (l'alluminio 26 fonde i corpi nati presto); Jacobsen et al.
//     2008 (²⁶Al/²⁷Al iniziale); Stewart e Leinhardt 2012 (l'energia specifica dell'urto); Nakajima et al. 1992, Goldblatt et
//     al. 2013 (il limite dell'aria di vapore); Hamano et al. 2013 (i due tipi di oceano di magma); Elkins-Tanton 2008 (il fuso
//     intrappolato; la solubilità dell'acqua; l'opacità del vapore); Schlichting, Sari e Yalinewich 2015 (l'aria tolta dagli urti
//     giganti); Watson et al. 1981 (la fuga limitata dall'energia); Ribas et al. 2005 (la luce dura del Sole giovane); Kuwahara
//     et al. 2017 (gli alogeni tra metallo e silicato). Nessuna di queste è stata riletta qui.
// NON TORNA (stampato da test/test_elementi.mjs): la condensazione nel disco che si raffredda (disco.js: il disco viscoso, e
// i planetesimi che tengono ciò che era condensato quando sono nati, Cassen 1996) toglie al pianeta come la Terra solo il
// 10–15% di Na, K, Cl: quasi tutti i suoi planetesimi nascono tardi, quando il disco viscoso è freddo. Il resto lo toglie
// l'EVAPORAZIONE DAI PLANETESIMI FUSI DALL'²⁶Al (perditeAccrescimento, EVAPORA_PLANETESIMI: Young et al. 2019): ~80% della roccia
// di quel pianeta viene da planetesimi nati dopo l'isolamento del loro embrione e fusi da soli, che perdono nel gas del disco
// tutto il loro Na, K, Cl; il mantello resta con Na 2800 ppm (Terra 2600), Cl 32 ppm (17–30), Na/Mg sulla stella 0,20 (Terra
// ~0,2) e un mare di 44 g/kg (prima 172, quasi tutto NaCl). Il potassio è 20 ppm (Terra 237) perché la stella ne ha dieci
// volte meno del Sole (le rese di Kobayashi). L'equilibrio Fe + H₂O ⇌ FeO + H₂ senza la sua lentezza al freddo ossida il
// ferro dei planetesimi nati tardi (FeO del mantello
// 13%, Terra 8%: dichiarato); il nucleo
// all'equilibrio a quelle temperature prende più silicio del vero; gli elementi più siderofili (Pt, Au) all'equilibrio
// restano nel mantello cento volte meno del vero (manca l'«ultima vernice» di Kimura 1974); le tracce pesanti senza rese
// (oltre lo zinco) seguono l'ossigeno o il carbonio nella proporzione r/s del Sistema Solare [R]: è una taratura sul Sole,
// dichiarata. Il decadimento radioattivo (U, Th, K) non è nel libro: le masse sono quelle della nascita.

import { ACQUA, PARTE_FUORI, R_GAS, COSTANTI, ANNO, LSOLE, PESI_ATOMICI, UA } from './leggi.js';
import { DATI as DATI_STELLE, composizione as composizioneStella } from './stelle.js';
import { MOLECOLE, NEI_GHIACCI, D_MANTELLO, D_BASALTO, F_GRANITO, ROCCE } from './chimica.js';
import { tabellaStoria, STORIA } from './storia.js';
import { crostaAttesa, COSTANTI as TETTONICA } from './tettonica.js';

const ZSOLE = DATI_STELLE.ZSOLE;

// ---------- 1. GLI ELEMENTI
// simbolo: [numero atomico, massa (u, IUPAC [R]), A(X) protosolare (H = 12, Wang et al. 2019 [V]), T50 (K, Lodders 2003 [R]),
//           ossigeni per atomo nel condensato (l'ossido o il metallo che lo porta), sede, parte r (per chi non ha rese)]
// sede: 'lito' (resta nel silicato), 'sidero' (va col ferro), 'calco' (va con lo zolfo), 'atmo' (gas), 'ghiaccio'
const TAVOLA = {
  H: [1, PESI_ATOMICI.H, 12.00, 182, 0, 'ghiaccio'], He: [2, PESI_ATOMICI.He, 10.98, 3, 0, 'atmo'], Li: [3, 6.94, 3.29, 1142, 0.5, 'lito', 'O'],
  B: [5, 10.81, 2.82, 908, 1.5, 'lito', 'O'], C: [6, PESI_ATOMICI.C, 8.47, 40, 0, 'ghiaccio'], N: [7, PESI_ATOMICI.N, 7.87, 123, 0, 'ghiaccio'],
  O: [8, PESI_ATOMICI.O, 8.73, 182, 0, 'ghiaccio'], F: [9, 18.998, 4.45, 734, 0, 'lito'], Ne: [10, 20.180, 7.97, 9, 0, 'atmo'],
  Na: [11, PESI_ATOMICI.Na, 6.28, 958, 0.5, 'lito'], Mg: [12, PESI_ATOMICI.Mg, 7.57, 1336, 1, 'lito'], Al: [13, 26.982, 6.46, 1653, 1.5, 'lito'],
  Si: [14, PESI_ATOMICI.Si, 7.55, 1310, 2, 'lito'], P: [15, 30.974, 5.46, 1229, 0, 'sidero'], S: [16, PESI_ATOMICI.S, 7.18, 664, 0, 'calco'],
  Cl: [17, PESI_ATOMICI.Cl, 5.27, 948, 0, 'lito'], Ar: [18, 39.948, 6.44, 47, 0, 'atmo'], K: [19, PESI_ATOMICI.K, 5.10, 1006, 0.5, 'lito'],
  Ca: [20, PESI_ATOMICI.Ca, 6.34, 1517, 1, 'lito'], Ti: [22, 47.867, 4.95, 1582, 2, 'lito'], V: [23, 50.942, 3.99, 1429, 1.5, 'lito'],
  Cr: [24, 51.996, 5.67, 1296, 1.5, 'lito'], Mn: [25, 54.938, 5.50, 1158, 1, 'lito'], Fe: [26, PESI_ATOMICI.Fe, 7.50, 1334, 0, 'sidero'],
  Co: [27, 58.933, 4.91, 1352, 0, 'sidero'], Ni: [28, 58.693, 6.24, 1353, 0, 'sidero'], Cu: [29, 63.546, 4.25, 1037, 0, 'calco'],
  Zn: [30, 65.38, 4.64, 726, 1, 'calco'], As: [33, 74.922, 2.34, 1065, 0, 'sidero', 0.8], Br: [35, 79.904, 2.58, 546, 0, 'lito', 0.9],
  Rb: [37, 85.468, 2.42, 800, 0.5, 'lito', 0.5], Sr: [38, 87.62, 2.91, 1464, 1, 'lito', 0.15], Mo: [42, 95.95, 1.96, 1590, 0, 'sidero', 0.4],
  Ag: [47, 107.868, 1.19, 996, 0, 'calco', 0.8], Sn: [50, 118.71, 2.09, 704, 0, 'sidero', 0.3], I: [53, 126.904, 1.59, 535, 0, 'lito', 0.95],
  Ba: [56, 137.327, 2.22, 1455, 1, 'lito', 0.15], La: [57, 138.905, 1.20, 1578, 1.5, 'lito', 0.25], Ce: [58, 140.116, 1.62, 1478, 1.5, 'lito', 0.2],
  Nd: [60, 144.242, 1.48, 1602, 1.5, 'lito', 0.43], Sm: [62, 150.36, 0.98, 1590, 1.5, 'lito', 0.69], Eu: [63, 151.964, 0.56, 1356, 1.5, 'lito', 0.94],
  Yb: [70, 173.045, 0.96, 1487, 1.5, 'lito', 0.58], W: [74, 183.84, 0.70, 1789, 0, 'sidero', 0.4], Pt: [78, 195.084, 1.65, 1408, 0, 'sidero', 0.95],
  Au: [79, 196.967, 0.87, 1060, 0, 'sidero', 0.94], Hg: [80, 200.59, 1.21, 252, 0, 'calco', 0.4], Pb: [82, 207.2, 2.05, 727, 0, 'calco', 0.2],
  Th: [90, 232.038, 0.08, 1659, 2, 'lito', 1], U: [92, 238.029, -0.50, 1610, 2, 'lito', 1],
};
// (le tracce senza rese seguono, nella loro proporzione r, l'ossigeno — il processo r, e per Li e B la spallazione dei
// nuclei di C, N, O — e per il resto il carbonio — il processo s delle giganti —: vedi abbondanzeDaCanali)
export const ELEMENTI = Object.freeze(Object.fromEntries(Object.entries(TAVOLA).map(([s, [Z, massa, A0, T50, ossigeno, sede, r]]) => [s, Object.freeze({ simbolo: s, Z, massa, A0, T50, ossigeno, sede, r: r ?? null })])));
export const SIMBOLI = Object.freeze(Object.keys(TAVOLA));
const METALLI = SIMBOLI.filter((s) => s !== 'H' && s !== 'He'), NE = SIMBOLI.length, IDX = Object.fromEntries(SIMBOLI.map((s, i) => [s, i]));
const MASSA = Float64Array.from(SIMBOLI, (s) => ELEMENTI[s].massa);
const CON_PROXY = new Set(SIMBOLI.filter((s) => ELEMENTI[s].r !== null));

// LA MISCELA PROTOSOLARE in massa: H e He da stelle.js (composizione(1): X, Y), i metalli nelle proporzioni di Wang et al.
// riportati a Z☉ di stelle.js (la stella del modello con Z = 1 ha esattamente questi)
export const PROTOSOLARE = (() => {
  const { X, Y, Zm } = composizioneStella(1), m = {}; let met = 0;
  for (const s of METALLI) { m[s] = 10 ** (ELEMENTI[s].A0 - 12) * ELEMENTI[s].massa; met += m[s]; }
  const o = { H: X, He: Y }; for (const s of METALLI) o[s] = (m[s] / met) * Zm; return Object.freeze(o);
})();

// ---------- 2. LE RESE (la nascita degli elementi)
// Kobayashi et al. 2006, tabella 3 [V]: per isotopo, M☉ per M☉ di stelle nate (SNII+HN) a Z = 0, 0,001, 0,004, 0,02, e M☉ per
// esplosione (Ia, W7). (Nella lettura del PDF il ²⁴Mg porta l'etichetta «Na»: è il magnesio, per numero di massa e valore.)
const KOB_Z = [0, 0.001, 0.004, 0.02];
const KOB = [
  ['p', 3.28e-2, 3.14e-2, 2.96e-2, 2.45e-2, 0], ['He', 2.30e-2, 2.26e-2, 2.22e-2, 2.05e-2, 5.66e-3],
  ['C', 7.51e-4, 4.14e-4, 5.17e-4, 6.75e-4, 4.83e-2], ['C', 1.75e-10, 4.33e-7, 2.80e-5, 3.06e-5, 1.40e-6],
  ['N', 3.36e-6, 2.82e-5, 8.77e-5, 2.35e-4, 1.16e-6], ['N', 5.17e-10, 1.35e-8, 2.41e-5, 1.90e-5, 1.32e-9],
  ['O', 8.03e-3, 8.05e-3, 6.58e-3, 6.14e-3, 1.43e-1], ['O', 3.45e-9, 1.42e-7, 8.36e-7, 3.60e-6, 3.54e-8], ['O', 5.69e-9, 2.24e-6, 2.70e-5, 5.29e-5, 8.25e-10],
  ['F', 3.49e-11, 6.76e-9, 4.98e-8, 1.08e-7, 5.67e-10],
  ['Ne', 1.28e-3, 1.38e-3, 1.57e-3, 1.68e-3, 2.02e-3], ['Ne', 1.05e-7, 6.66e-7, 1.62e-6, 4.95e-6, 8.46e-6], ['Ne', 7.53e-8, 3.39e-6, 8.01e-6, 2.79e-5, 2.49e-3],
  ['Na', 4.46e-6, 8.18e-6, 2.03e-5, 5.41e-5, 6.32e-5],
  ['Mg', 5.69e-4, 6.69e-4, 4.88e-4, 4.06e-4, 8.50e-3], ['Mg', 9.62e-7, 5.62e-6, 1.59e-5, 6.08e-5, 4.05e-5], ['Mg', 9.19e-7, 5.04e-6, 1.57e-5, 5.68e-5, 3.18e-5],
  ['Al', 1.27e-5, 2.49e-5, 2.95e-5, 6.53e-5, 9.86e-4],
  ['Si', 8.11e-4, 7.09e-4, 6.17e-4, 4.55e-4, 1.50e-1], ['Si', 3.03e-6, 5.90e-6, 7.62e-6, 1.88e-5, 8.61e-4], ['Si', 3.40e-6, 7.40e-6, 9.24e-6, 2.12e-5, 1.74e-3],
  ['P', 1.28e-6, 2.34e-6, 2.14e-6, 5.54e-6, 4.18e-4],
  ['S', 3.12e-4, 2.86e-4, 2.50e-4, 1.96e-4, 8.41e-2], ['S', 8.06e-7, 1.03e-6, 1.17e-6, 1.62e-6, 4.50e-4], ['S', 1.70e-6, 3.20e-6, 6.09e-6, 1.31e-5, 1.90e-3], ['S', 3.84e-11, 1.98e-9, 1.48e-8, 8.19e-8, 3.15e-7],
  ['Cl', 2.18e-7, 3.34e-7, 3.49e-7, 7.91e-7, 1.34e-4], ['Cl', 8.78e-8, 8.89e-8, 1.50e-7, 4.89e-7, 3.98e-5],
  ['Ar', 4.54e-5, 4.21e-5, 3.80e-5, 3.03e-5, 1.49e-2], ['Ar', 8.47e-7, 1.11e-6, 2.29e-6, 4.51e-6, 1.06e-3], ['Ar', 2.42e-13, 4.64e-10, 3.34e-9, 1.02e-8, 1.26e-8],
  ['K', 1.16e-7, 1.41e-7, 2.08e-7, 3.41e-7, 8.52e-5], ['K', 1.39e-11, 6.81e-11, 1.29e-10, 7.86e-10, 0], ['K', 2.25e-8, 1.92e-8, 2.25e-8, 4.91e-8, 7.44e-6],
  ['Ca', 3.58e-5, 3.34e-5, 3.02e-5, 2.39e-5, 1.23e-2], ['Ca', 1.95e-8, 2.95e-8, 5.48e-8, 1.12e-7, 3.52e-5], ['Ca', 2.58e-10, 1.30e-9, 3.25e-9, 9.89e-9, 1.03e-7],
  ['Ca', 1.50e-7, 1.74e-7, 1.61e-7, 2.65e-7, 8.86e-6], ['Ca', 5.69e-14, 2.06e-10, 8.71e-10, 3.60e-9, 1.99e-9], ['Ca', 8.04e-15, 6.91e-10, 2.93e-9, 1.07e-8, 7.10e-12],
  ['Ti', 2.02e-8, 2.61e-8, 3.03e-8, 5.11e-8, 1.71e-5], ['Ti', 2.71e-8, 2.70e-8, 1.84e-8, 2.80e-8, 6.04e-7], ['Ti', 4.58e-7, 4.98e-7, 4.97e-7, 5.70e-7, 2.03e-4],
  ['Ti', 1.56e-8, 1.77e-8, 2.09e-8, 3.07e-8, 1.69e-5], ['Ti', 1.52e-14, 2.04e-9, 7.64e-9, 3.16e-8, 1.26e-5],
  ['V', 2.88e-13, 5.92e-11, 9.07e-11, 3.42e-10, 8.28e-9], ['V', 6.03e-8, 5.76e-8, 5.09e-8, 6.13e-8, 5.15e-5],
  ['Cr', 1.14e-7, 1.12e-7, 1.33e-7, 1.72e-7, 2.71e-4], ['Cr', 5.45e-6, 5.51e-6, 5.76e-6, 5.06e-6, 5.15e-3], ['Cr', 3.17e-7, 3.30e-7, 3.68e-7, 3.81e-7, 7.85e-4], ['Cr', 2.73e-11, 5.57e-9, 1.84e-8, 7.09e-8, 1.90e-4],
  ['Mn', 8.72e-7, 9.72e-7, 1.16e-6, 1.54e-6, 8.23e-3],
  ['Fe', 7.32e-6, 8.34e-6, 9.03e-6, 1.13e-5, 1.04e-1], ['Fe', 3.17e-4, 3.38e-4, 3.22e-4, 3.48e-4, 6.13e-1], ['Fe', 4.66e-6, 6.03e-6, 6.79e-6, 9.57e-6, 2.55e-2], ['Fe', 6.15e-12, 1.81e-7, 5.26e-7, 2.15e-6, 9.63e-4],
  ['Co', 6.82e-7, 6.72e-7, 7.47e-7, 1.20e-6, 1.02e-3],
  ['Ni', 1.96e-6, 3.12e-6, 1.22e-5, 8.12e-6, 1.28e-1], ['Ni', 8.03e-6, 8.48e-6, 7.61e-6, 9.46e-6, 1.05e-2], ['Ni', 1.26e-7, 2.17e-7, 4.20e-7, 8.15e-7, 2.51e-4],
  ['Ni', 7.54e-8, 4.66e-7, 1.81e-6, 2.12e-6, 2.66e-3], ['Ni', 1.01e-14, 8.66e-8, 2.89e-7, 1.36e-6, 1.31e-6],
  ['Cu', 2.08e-8, 4.44e-8, 1.10e-7, 5.07e-7, 1.79e-6], ['Cu', 1.36e-9, 3.25e-8, 1.05e-7, 3.84e-7, 6.83e-7],
  ['Zn', 6.32e-7, 5.74e-7, 5.07e-7, 4.43e-7, 1.22e-5], ['Zn', 5.80e-9, 6.24e-8, 2.03e-7, 6.65e-7, 2.12e-5], ['Zn', 1.45e-10, 6.43e-9, 2.75e-8, 1.43e-7, 1.34e-8],
  ['Zn', 2.67e-10, 4.31e-8, 1.67e-7, 8.69e-7, 1.02e-8], ['Zn', 5.14e-15, 3.62e-10, 1.85e-9, 2.63e-8, 0],
];
// gli elementi con resa: le colonne sommate isotopo per isotopo
const RESE = (() => { const r = {}; for (const [s, ...v] of KOB) { const k = s === 'p' ? 'H' : s; r[k] ??= [0, 0, 0, 0, 0]; v.forEach((x, i) => { r[k][i] += x; }); } return r; })();
const CON_RESA = new Set(Object.keys(RESE).filter((s) => s !== 'H' && s !== 'He'));
// le rese NUOVE delle supernove da collasso a una metallicità (relativa al Sole): il totale dell'ejecta meno la parte che
// la stella aveva già (l'ejecta intero × la composizione iniziale, quella protosolare scalata a Z) [D]. La Z delle tabelle
// (0,02 il Sole per Kobayashi) si legge in unità del Sole: Z_K = 0,02·Z/Z☉ [D]; oltre 0,02 si resta a 0,02 (dichiarato).
// → { simbolo: frazione dei metalli nuovi } (somma 1, sugli elementi seguiti)
function schemaCollasso(zRel) {
  const zk = Math.min(0.02, Math.max(0, 0.02 * zRel)); let i = 0; while (i < KOB_Z.length - 2 && KOB_Z[i + 1] < zk) i++;
  const u = (zk - KOB_Z[i]) / (KOB_Z[i + 1] - KOB_Z[i]), y = (s) => RESE[s][i] + u * (RESE[s][i + 1] - RESE[s][i]);
  let ejecta = 0; for (const s in RESE) ejecta += y(s); // (le rese sono ejecta totali: idrogeno, elio e metalli)
  const nuovo = {}; let tot = 0;
  for (const s of CON_RESA) { const v = Math.max(0, y(s) - ejecta * (PROTOSOLARE[s] ?? 0) * zRel); nuovo[s] = v; tot += v; }
  for (const s in nuovo) nuovo[s] /= tot; return nuovo;
}
// la W7: metalli per esplosione, nella loro proporzione (somma 1)
const schemaIa = () => { const o = {}; let t = 0; for (const s of CON_RESA) { o[s] = RESE[s][4]; t += o[s]; } for (const s in o) o[s] /= t; return o; };
// LE GIGANTI ASINTOTICHE: rese NETTE di carbonio e azoto (M☉ per stella) per massa iniziale, a tre metallicità.
// RICORDATE dalle figure di Karakas 2010 (le tabelle sono in linea, non lette) [R]: il carbonio delle stelle di 1,5–3,5 M☉
// (il terzo dragaggio), l'azoto di quelle sopra 4 M☉ che bruciano alla base dell'involucro (che consumano anche il
// carbonio: la resa di C diventa negativa, e la somma C + N quasi si conserva). Sotto 1 M☉ e sopra 6 M☉ si prende zero.
const AGB_M = [1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6], AGB_Z = [0.0001, 0.004, 0.02];
const AGB_C = [[1e-3, 4e-3, 7e-3, 6e-3, 5e-3, 3e-3, 1e-3, 0, 0], [1e-4, 2.5e-3, 6e-3, 8e-3, 9e-3, 7e-3, 3e-3, -1e-3, -2e-3], [-1e-4, 5e-4, 3.5e-3, 5.5e-3, 7e-3, 6.5e-3, 4e-3, -1.5e-3, -4e-3]];
const AGB_N = [[1e-5, 1e-4, 5e-4, 2e-3, 6e-3, 1.5e-2, 2e-2, 2.5e-2, 3e-2], [5e-5, 1e-4, 2e-4, 3e-4, 5e-4, 5e-3, 1.5e-2, 2.5e-2, 3e-2], [1.5e-4, 3e-4, 5e-4, 7e-4, 9e-4, 1.2e-3, 3e-3, 1.4e-2, 2.6e-2]];
// le rese di una gigante di massa m (M☉) e metallicità zRel (Sole = 1): { C, N } in M☉, nuove (sopra la composizione con cui
// era nata): (in metallicità si interpola nel logaritmo di Z_K = 0,02·zRel, fermi agli estremi della tabella)
export function reseGigante(m, zRel = 1) {
  if (!(m >= AGB_M[0] && m <= AGB_M[AGB_M.length - 1])) return { C: 0, N: 0 };
  let j = 0; while (j < AGB_M.length - 2 && AGB_M[j + 1] < m) j++; const u = (m - AGB_M[j]) / (AGB_M[j + 1] - AGB_M[j]);
  const lz = Math.log(Math.min(0.02, Math.max(0.0001, 0.02 * zRel))); let i = 0; while (i < AGB_Z.length - 2 && Math.log(AGB_Z[i + 1]) < lz) i++;
  const w = (lz - Math.log(AGB_Z[i])) / (Math.log(AGB_Z[i + 1]) - Math.log(AGB_Z[i])), t = (T) => { const a = T[i][j] + u * (T[i][j + 1] - T[i][j]), b = T[i + 1][j] + u * (T[i + 1][j + 1] - T[i + 1][j]); return a + w * (b - a); };
  return { C: t(AGB_C), N: t(AGB_N) };
}
// I CANALI. galassie.js tiene i metalli di ogni canale (quattro tabelle di metallicità per le supernove da collasso, le Ia,
// il carbonio e l'azoto delle giganti); qui c'è la ricetta di ciascuno. (Il carbonio negativo delle giganti calde è nel conto
// dell'azoto: chi brucia C in N non fa metalli nuovi, li trasforma; qui il canale agbN porta solo l'azoto netto e agbC solo il
// carbonio netto, entrambi ≥ 0 una volta sommati sulla IMF — vedi galassie.js popolazione.)
export const CANALI = Object.freeze(['cc0', 'cc1', 'cc2', 'cc3', 'ia', 'agbC', 'agbN']);
export const Z_TABELLE = Object.freeze([0.02, 0.2, 1, 2.5]); // (le metallicità delle quattro tabelle di galassie.js: Z_TAB)
export const SCHEMI = Object.freeze({ cc0: schemaCollasso(Z_TABELLE[0]), cc1: schemaCollasso(Z_TABELLE[1]), cc2: schemaCollasso(Z_TABELLE[2]), cc3: schemaCollasso(Z_TABELLE[3]), ia: schemaIa(), agbC: { C: 1 }, agbN: { N: 1 } });
// le ricette come matrice canale × elemento (per i conti veloci)
const MATRICE = CANALI.map((c) => Float64Array.from(SIMBOLI, (s) => SCHEMI[c][s] || 0));

// LA MISCELA DI UNA STELLA dai metalli del suo gas divisi per canale.
//   Z (unità del Sole: la frazione in massa dei metalli è Z·Z☉), frazioni: { canale: parte dei metalli } (somma 1) o un
//   vettore nell'ordine di CANALI. Senza frazioni (o tutte nulle): la miscela protosolare scalata a Z.
// LE TRACCE SENZA RESA (Li, B e gli elementi oltre lo zinco): [X/H] = r·[O/H] + (1 − r)·[C/H] in lineare, cioè
// X/X☉ = r·(O/O☉) + (1 − r)·(C/C☉), con r la parte del processo r nel Sistema Solare [R] (Li e B seguono l'ossigeno, la
// spallazione dei suoi nuclei). È UNA TARATURA SUL SOLE (dichiarata): pesano meno di 10⁻⁵ dei metalli.
// Poi tutti i metalli si riportano a Z·Z☉ (il resto della somma — Sc, Ga, Ge, Se e gli altri non seguiti, meno di 10⁻⁴ dei
// metalli — è ripartito in proporzione). H ed He: composizione(Z) di stelle.js.  → { simbolo: frazione in massa } (somma 1)
const CACHE_MISCELE = new Map();
export function abbondanzeDaCanali(Z = 1, frazioni = null) {
  const z = Math.max(0, Z), f = frazioni == null ? null : Array.isArray(frazioni) || ArrayBuffer.isView(frazioni) ? Array.from(frazioni) : CANALI.map((c) => frazioni[c] || 0);
  const sf = f ? f.reduce((a, b) => a + b, 0) : 0, chiave = `${z}|${sf > 0 ? f.map((x) => x / sf).join(',') : '-'}`; let o = CACHE_MISCELE.get(chiave); if (o) return o;
  const { X, Y, Zm } = composizioneStella(z), w = new Float64Array(NE);
  if (sf > 0) { for (let c = 0; c < CANALI.length; c++) { const q = f[c] / sf; if (q > 0) for (let i = 0; i < NE; i++) w[i] += q * MATRICE[c][i]; } }
  else for (let i = 0; i < NE; i++) w[i] = PROTOSOLARE[SIMBOLI[i]] / ZSOLE;
  // le tracce senza resa, sul rapporto del Sole di O e C (nella stessa unità di w: frazione dei metalli)
  if (sf > 0) { const rO = w[IDX.O] / (PROTOSOLARE.O / ZSOLE), rC = w[IDX.C] / (PROTOSOLARE.C / ZSOLE); for (const s of CON_PROXY) { const r = ELEMENTI[s].r === 'O' ? 1 : ELEMENTI[s].r; w[IDX[s]] = (PROTOSOLARE[s] / ZSOLE) * (r * rO + (1 - r) * rC); } }
  let met = 0; for (let i = 0; i < NE; i++) if (SIMBOLI[i] !== 'H' && SIMBOLI[i] !== 'He') met += w[i];
  o = { H: X, He: Y }; for (let i = 0; i < NE; i++) { const s = SIMBOLI[i]; if (s !== 'H' && s !== 'He') o[s] = met > 0 ? (w[i] / met) * Zm : 0; }
  o = Object.freeze(o); if (CACHE_MISCELE.size > 4096) CACHE_MISCELE.clear(); CACHE_MISCELE.set(chiave, o); return o;
}
// la miscela di una stella con il solo Z (chi non ha la storia della sua galassia): il Sole protosolare scalato
export const miscelaSolare = (Z = 1) => abbondanzeDaCanali(Z, null);
// atomi per atomo di idrogeno (la forma di chimica.js abbondanze), da una miscela in massa
export const atomiPerIdrogeno = (X) => { const nH = X.H / ELEMENTI.H.massa, o = {}; for (const s of SIMBOLI) o[s] = X[s] / ELEMENTI[s].massa / nH; return o; };
// [X/Y] = log₁₀((X/Y)/(X/Y)☉), per numero
export const rapportoSolare = (X, a, b) => Math.log10((X[a] / X[b]) / (PROTOSOLARE[a] / PROTOSOLARE[b]));

// ---------- 3. LA CONDENSAZIONE NEL DISCO
// Stati: ogni elemento tra gas e solido. Energie: la pressione di vapore, ln p_sat = −ΔH/RT + ΔS/R; la parte condensata
// è 1 − p_sat/p_i, con p_i la pressione parziale dell'elemento nel gas della nebulosa (alla pressione di Lodders, 10⁻⁴ bar).
// Al 50% (T50 di Lodders) p_sat = p_i/2: con l'entropia di evaporazione di Trouton (88 J/mol/K: la regola misurata dei
// liquidi a 1 bar) [R] questo fissa ΔH = T50·(ΔS − R·ln(p_i/2)) [D], e la curva intera: f(T) = 1 − ½·e^(−(ΔH/R)(1/T − 1/T50)).
// Larga il 4–6% della temperatura. Conservazioni: ciò che condensa esce dal gas, e porta con sé l'ossigeno del suo ossido.
// Il FERRO condensa metallo; nel gas della nebulosa si ossida dove Fe + H2O ⇌ FeO + H2 lo vuole: a_FeO = K(T)·(H2O/H2),
// con K dalla tabella termochimica di chimica.js (FeO, H2O, H2, Fe: una fonte sola) e H2O/H2 l'ossigeno che non è nelle
// rocce né nel CO (tutto il carbonio come CO: semplificazione dichiarata); il FeO entra nei silicati come soluzione ideale.
// Solo equilibrio: la lentezza della reazione al freddo non c'è (dichiarato).
const P_NEBULOSA = 1e-4, TROUTON = 88;
// LA LENTEZZA DEL FERRO CHE SI OSSIDA NEL GAS (disco.js la applica ai planetesimi asciutti, dentro la neve). L'equilibrio vuole il
// ferro ossidato dove il gas è freddo; ma per entrare nei silicati il Fe²⁺ deve diffondere nell'olivina, e al freddo non fa in
// tempo: Grossman, Fedkin e Simon 2012 (Meteorit. Planet. Sci. 47, 2160 [S: dall'estratto]) trovano che in qualche migliaio di
// anni, anche con dieci volte l'acqua del Sole, i grani di olivina di 1 µm arrivano al 2% di fayalite (5% quelli di 0,1 µm):
// il FeO dei silicati non viene dal gas della nebulosa ma dall'acqua dentro i planetesimi (l'alterazione acquosa, che ossida il
// metallo: dove c'è ghiaccio). Qui: nei solidi asciutti il FeO dei silicati non supera FA_NEBULOSA moli per mole di FeO + MgO.
export const FA_NEBULOSA = 0.02;
const pressioneParziale = (X, s) => { const nH2 = X.H / ELEMENTI.H.massa / 2 + X.He / ELEMENTI.He.massa; return P_NEBULOSA * (X[s] / ELEMENTI[s].massa) / nH2; };
export function frazioneCondensata(s, T, X = PROTOSOLARE) {
  const e = ELEMENTI[s]; if (e.sede === 'atmo' || e.sede === 'ghiaccio') return 0; if (!(X[s] > 0)) return 0;
  const k = e.T50 * (TROUTON / R_GAS - Math.log(pressioneParziale(X, s) / 2)), f = 1 - 0.5 * Math.exp(-k * (1 / Math.max(T, 1) - 1 / e.T50));
  return f < 0 ? 0 : f > 1 ? 1 : f;
}
const gibbs = (f, T) => 1000 * MOLECOLE[f].dH - T * MOLECOLE[f].S;
// la parte del ferro condensato che è FeO, a T, nel gas di miscela X (moli per kg di gas: nSil, gli ossidi degli altri)
function ferroOssidato(T, X, nFe, nSil) {
  if (!(nFe > 0)) return 0;
  const lnK = -(gibbs('FeO', T) + gibbs('H2', T) - gibbs('Fe', T) - gibbs('H2O', T)) / (R_GAS * T); // Fe + H2O(gas) ⇌ FeO + H2
  let Orocce = 0; for (const s of METALLI) { const e = ELEMENTI[s]; if (e.ossigeno > 0) Orocce += (X[s] / e.massa) * e.ossigeno; } // (moli di O per kg di gas negli ossidi, tutto condensato)
  const nH2 = X.H / ELEMENTI.H.massa / 2, h2o = X.O / ELEMENTI.O.massa - Orocce - X.C / ELEMENTI.C.massa; if (!(h2o > 0)) return 0;
  const a = Math.exp(lnK) * (h2o / nH2); if (a >= 1) return nFe;
  return Math.min(nFe, (a * nSil) / (1 - a));
}
// I SOLIDI A UNA TEMPERATURA, per kg di gas della miscela X: la massa (kg) di ogni elemento condensato (l'ossigeno è quello
// degli ossidi e del FeO), la loro somma («roccia», kg per kg di gas) e la parte di metallo (ferro, nichel, cobalto, zolfo
// del FeS, fosforo dello schreibersite: ciò che sarà il nucleo se nulla si ossida). Oltre la linea della neve (ghiacci =
// vero) si aggiungono l'acqua (l'ossigeno che resta) e il carbonio e l'azoto che gelano con lei (chimica.js NEI_GHIACCI: le
// comete): la forma di sempre di chimica.js SOLE, con la miscela di QUESTA stella.
export function solidiA(T, X = PROTOSOLARE, { ghiacci = false } = {}) {
  const m = {}; let Ob = 0, nSil = 0, roccia = 0, metallo = 0;
  for (const s of METALLI) { const e = ELEMENTI[s]; if (e.sede === 'atmo' || e.sede === 'ghiaccio') continue; const f = frazioneCondensata(s, T, X); if (!(f > 0)) continue;
    m[s] = X[s] * f; roccia += m[s]; const n = m[s] / e.massa; if (e.ossigeno > 0) { Ob += n * e.ossigeno; nSil += n; } if (s === 'Fe' || s === 'Ni' || s === 'Co' || s === 'P' || s === 'S') metallo += m[s]; }
  const nFe = (m.Fe || 0) / ELEMENTI.Fe.massa, nFeO = ferroOssidato(T, X, nFe, nSil); Ob += nFeO; metallo -= nFeO * ELEMENTI.Fe.massa;
  m.O = Ob * ELEMENTI.O.massa; roccia += m.O;
  const o = { m, roccia, metallo: Math.max(0, metallo), FeO: nFeO * ELEMENTI.Fe.massa, ghiaccio: 0 };
  if (ghiacci) {
    const Olib = X.O / ELEMENTI.O.massa - Ob, C = Math.min(NEI_GHIACCI.C * X.C / ELEMENTI.C.massa, Math.max(0, Olib)), H2O = Math.max(0, Olib - C), N = NEI_GHIACCI.N * X.N / ELEMENTI.N.massa;
    // (la ricetta di chimica.js SOLE, con l'ossigeno conservato: il carbonio dei ghiacci, contato come CO, prende il suo
    // ossigeno, e l'acqua è l'ossigeno che resta; l'azoto come NH3. Prima l'acqua prendeva tutto l'ossigeno rimasto e il CO
    // ne prendeva altro: il libro dei conti lo ha visto, l'ossigeno dei ghiacci superava quello del gas)
    const mH2O = H2O * (ELEMENTI.O.massa + 2 * ELEMENTI.H.massa), mCO = C * (ELEMENTI.C.massa + ELEMENTI.O.massa), mNH3 = N * (ELEMENTI.N.massa + 3 * ELEMENTI.H.massa);
    o.ghiaccio = mH2O + mCO + mNH3; o.ghiacci = { H: (2 * H2O + 3 * N) * ELEMENTI.H.massa, O: (H2O + C) * ELEMENTI.O.massa, C: C * ELEMENTI.C.massa, N: N * ELEMENTI.N.massa };
    o.quotaAcqua = o.ghiaccio > 0 ? mH2O / o.ghiaccio : 1; o.perAcqua = H2O > 0 ? { C: C / H2O, N: N / H2O } : { C: 0, N: 0 }; // (molecole per molecola d'acqua)
  }
  return o;
}
// LA TABELLA DEI SOLIDI di una miscela (per disco.js, che chiede i solidi migliaia di volte): 240 temperature in logaritmo da
// 20 a 2200 K, con la roccia, il metallo e (per i pianeti) la massa di ogni elemento; si interpola in log T.
const T_MIN = 20, T_MAX = 2200, NT = 240, LT0 = Math.log(T_MIN), DLT = (Math.log(T_MAX) - LT0) / (NT - 1);
const TABELLE = new WeakMap();
// (PRESTAZIONI: ogni stella ha la sua tabella. Le stesse formule di frazioneCondensata, solidiA e ferroOssidato, con le
// costanti di ogni elemento calcolate una volta per miscela e i vettori al posto degli oggetti; la prova controlla che i due
// conti coincidano)
const CONDENSA = METALLI.filter((s) => ELEMENTI[s].sede !== 'atmo' && ELEMENTI[s].sede !== 'ghiaccio').map((s) => IDX[s]);
const OSSIGENO = Float64Array.from(SIMBOLI, (s) => ELEMENTI[s].ossigeno), T50 = Float64Array.from(SIMBOLI, (s) => ELEMENTI[s].T50);
const METALLICI = new Set(['Fe', 'Ni', 'Co', 'P', 'S'].map((s) => IDX[s]));
export function tabellaSolidi(X = PROTOSOLARE) {
  let t = TABELLE.get(X); if (t) return t;
  const roccia = new Float64Array(NT), metallo = new Float64Array(NT), el = new Float64Array(NT * NE), feo = new Float64Array(NT);
  const nC = CONDENSA.length, xs = new Float64Array(nC), kf = new Float64Array(nC), ox = new Float64Array(nC), t50 = new Float64Array(nC), ms = new Float64Array(nC), met = new Uint8Array(nC);
  const nH2 = X.H / ELEMENTI.H.massa / 2 + X.He / ELEMENTI.He.massa; let Orocce = 0;
  for (let j = 0; j < nC; j++) { const i = CONDENSA[j], x = X[SIMBOLI[i]] || 0; xs[j] = x; ms[j] = MASSA[i]; ox[j] = OSSIGENO[i]; t50[j] = T50[i]; met[j] = METALLICI.has(i) ? 1 : 0;
    kf[j] = x > 0 ? T50[i] * (TROUTON / R_GAS - Math.log((P_NEBULOSA * (x / MASSA[i])) / nH2 / 2)) : 0; if (ox[j] > 0) Orocce += (x / MASSA[i]) * ox[j]; }
  const jFe = CONDENSA.indexOf(IDX.Fe), h2o = X.O / ELEMENTI.O.massa - Orocce - X.C / ELEMENTI.C.massa, nH2s = X.H / ELEMENTI.H.massa / 2, it50 = t50.map((x) => 1 / x);
  for (let k = 0; k < NT; k++) {
    const T = Math.exp(LT0 + k * DLT), iT = 1 / T, o = k * NE; let Ob = 0, nSil = 0, r = 0, m = 0;
    for (let j = 0; j < nC; j++) { if (!(xs[j] > 0)) continue; const y = kf[j] * (iT - it50[j]); if (y < -0.6931471805599453) continue; const f = y > 40 ? 1 : 1 - 0.5 * Math.exp(-y); // (sotto: niente; oltre e^−40 il resto è sotto ε)
      const kg = xs[j] * f; el[o + CONDENSA[j]] = kg; r += kg; const n = kg / ms[j]; if (ox[j] > 0) { Ob += n * ox[j]; nSil += n; } if (met[j]) m += kg; }
    // il ferro ossidato nel gas (ferroOssidato)
    const nFe = jFe >= 0 ? el[o + IDX.Fe] / ELEMENTI.Fe.massa : 0; let nFeO = 0;
    if (nFe > 0 && h2o > 0) { const lnK = -(gibbs('FeO', T) + gibbs('H2', T) - gibbs('Fe', T) - gibbs('H2O', T)) / (R_GAS * T), a = Math.exp(lnK) * (h2o / nH2s); nFeO = a >= 1 ? nFe : Math.min(nFe, (a * nSil) / (1 - a)); }
    Ob += nFeO; m -= nFeO * ELEMENTI.Fe.massa; el[o + IDX.O] = Ob * ELEMENTI.O.massa; r += el[o + IDX.O]; feo[k] = nFeO * ELEMENTI.Fe.massa;
    roccia[k] = r; metallo[k] = Math.max(0, m);
  }
  const freddi = solidiA(T_MIN, X, { ghiacci: true }), luogo = (T) => { const x = (Math.log(Math.min(T_MAX, Math.max(T_MIN, T))) - LT0) / DLT, k = Math.min(NT - 2, Math.floor(x)); return [k, x - k]; };
  t = {
    X, ghiaccio: freddi.ghiaccio, ghiacci: freddi.ghiacci, rocciaFredda: freddi.roccia, quotaAcqua: freddi.quotaAcqua, perAcqua: freddi.perAcqua,
    roccia: (T) => { const [k, u] = luogo(T); return roccia[k] + u * (roccia[k + 1] - roccia[k]); },
    metallo: (T) => { const [k, u] = luogo(T); return metallo[k] + u * (metallo[k + 1] - metallo[k]); },
    // il ferro (kg per kg di gas) che l'equilibrio col gas mette nei silicati come FeO, a T
    feo: (T) => { const [k, u] = luogo(T); return feo[k] + u * (feo[k + 1] - feo[k]); },
    // aggiunge a «dove» (Float64Array NE, kg) la roccia di massa «kg» condensata a T, nelle proporzioni della tabella
    aggiungi: (dove, kg, T) => { const [k, u] = luogo(T), r = roccia[k] + u * (roccia[k + 1] - roccia[k]); if (!(r > 0) || !(kg > 0)) return; const q = kg / r; for (let i = 0; i < NE; i++) { const a = el[k * NE + i], b = el[(k + 1) * NE + i]; if (a || b) dove[i] += q * (a + u * (b - a)); } },
    // (per le prove: i valori della tabella in un nodo, da confrontare con solidiA)
    nodo: (k) => ({ T: Math.exp(LT0 + k * DLT), roccia: roccia[k], metallo: metallo[k] }),
  };
  TABELLE.set(X, t); return t;
}
export const vettore = () => new Float64Array(NE);
export const comeOggetto = (v) => { const o = {}; for (let i = 0; i < NE; i++) if (v[i]) o[SIMBOLI[i]] = v[i]; return o; };
export const sommaVettore = (v) => { let s = 0; for (let i = 0; i < NE; i++) s += v[i]; return s; };

// ---------- 4. IL PIANETA CHE SI SEPARA: metallo e silicato all'equilibrio
// Stati: le moli di ogni elemento nel metallo e nel silicato fusi. Conservazioni: ogni elemento (lo stesso numero di atomi
// prima e dopo), e l'ossigeno, che è ciò che decide fO2. Energie: le costanti di scambio K_D (misurate in laboratorio),
//   X_i^met / X_iO(n/2)^sil = K_D · (X_Fe^met / X_FeO^sil)^(n/2),     log₁₀ K_D = a + b/T + c·P/T   (P in GPa)
// e per l'ossigeno X_Fe·X_O/X_FeO = K_D^O (Fischer et al. 2015). Si cerca r = X_FeO^sil/X_Fe^met (cioè fO2: ΔIW = 2 log₁₀ r)
// che conserva l'ossigeno: ogni Si che va nel nucleo lascia due O al ferro del mantello (SiO2 + 2Fe → Si + 2FeO).
// [R] i parametri (n, a, b, c), dalla letteratura aperta che ricordo (Fischer et al. 2015; Wade e Wood 2005; Siebert et al.
// 2011); per S, Cu, Zn, Ag, Sn, As, Pt, Au un D in massa misurato ad alta P e T (Pt, Au: 10⁵ e 10³, i valori dei forni
// ad alta temperatura; all'equilibrio lasciano il mantello cento volte più povero del vero: manca l'ultima vernice).
const KD = {
  Ni: [2, 1.06, 1553, -98], Co: [2, 0.13, 2057, -57], V: [3, -0.48, -5063, 0], Cr: [2, -0.3, -2900, 0], Mn: [2, -0.02, -5600, 38],
  Si: [4, 1.3, -13500, 0], W: [4, 1.85, -6400, -30], Mo: [4, 1.06, 2800, -90], P: [5, -1.04, 9000, -220],
};
const KD_O = [0.6, -3800, 22];
// (il carbonio: D ≈ 30 alle condizioni della separazione, Fischer et al. 2020 [R]; non entra nel bilancio dell'ossigeno —
// arriva con i ghiacci: disco.js lo divide dopo, con lo stesso D)
// (gli alogeni: litofili anche ad alta pressione, D metallo/silicato ~10⁻²–10⁻¹, il bromo e lo iodio un poco più del cloro:
// Kuwahara et al. 2017 [R, valori da rileggere]: il nucleo non è dove manca il cloro della Terra)
export const D_MASSA = Object.freeze({ S: 100, Cu: 30, Zn: 0.7, Ag: 100, Sn: 30, As: 100, Pt: 1e5, Au: 1e3, Ga: 2, C: 30, Cl: 0.02, Br: 0.05, I: 0.1 });
// ossigeni per catione nell'ossido del silicato fuso (per chi può passare nel metallo)
const OSSIDO_SIL = { Fe: 1, Ni: 1, Co: 1, Si: 2, V: 1.5, Cr: 1, Mn: 1, W: 3, Mo: 2, P: 2.5 };
// la pressione al confine tra nucleo e mantello di un corpo a due strati di densità uniforme (Pa): il nucleo a 11 000 kg/m³
// (storia.js, la stessa struttura), il mantello con il resto della massa nel resto del volume [D: idrostatica integrata]
export function pressioneNucleo(M, R, Mc, rhoC = 11000) {
  const G = COSTANTI.G, Vc = Mc / rhoC, Rc = Math.cbrt((3 * Vc) / (4 * Math.PI)); if (!(R > Rc)) return 0;
  const rhoM = (M - Mc) / ((4 / 3) * Math.PI * (R ** 3 - Rc ** 3));
  return rhoM * G * (Mc - rhoM * Vc) * (1 / Rc - 1 / R) + rhoM * rhoM * G * ((2 * Math.PI) / 3) * (R * R - Rc * Rc);
}
// LA TEMPERATURA DELL'EQUILIBRIO: a metà tra il solidus e il liquidus della peridotite alla pressione P (Rubie et al. 2015:
// «approximately midway between the solidus and liquidus» [V]: è la base dell'oceano di magma, dove il fuso diventa troppo
// cristallino per scorrere), con le curve misurate fino al confine del nucleo di Andrault et al. 2011 (EPSL 304, 251) [R]:
// T_sol = 2045·(P/92 + 1)^(1/1,3), T_liq = 1940·(P/29 + 1)^(1/1,9) (P in GPa). (storia.js usa per la partenza calda la curva di
// Simon di Zhang e Rogers, che a 90 GPa sta 900 K più su: è un doppione dichiarato, da risolvere in storia.js.)
export const liquidusPeridotite = (Pa) => 1940 * Math.pow(Math.max(0, Pa) / 1e9 / 29 + 1, 1 / 1.9);
export const fondoOceanoMagma = (Pa) => { const P = Math.max(0, Pa) / 1e9; return 0.5 * (2045 * Math.pow(P / 92 + 1, 1 / 1.3) + liquidusPeridotite(Pa)); };
// solidi: kg per elemento (Float64Array NE, la roccia del pianeta con il suo ossigeno); M, R: massa e raggio della parte di
// roccia e ferro; temperatura(P): la temperatura dell'equilibrio alla pressione P (Pa), per difetto fondoOceanoMagma.
// → { nucleo, silicato (kg per elemento), P (Pa), T (K), deltaIW, r }
const MOBILI = [...new Set([...Object.keys(OSSIDO_SIL), ...Object.keys(D_MASSA)])].filter((s) => s in IDX && s !== 'C'), IM = Int32Array.from(MOBILI, (s) => IDX[s]);
const VAL = Float64Array.from(MOBILI, (s) => (KD[s] ? KD[s][0] : 0)), OSS = Float64Array.from(MOBILI, (s) => OSSIDO_SIL[s] || 0), DM = Float64Array.from(MOBILI, (s) => D_MASSA[s] || 0);
const LITOFILI = SIMBOLI.map((s, i) => i).filter((i) => !MOBILI.includes(SIMBOLI[i]) && SIMBOLI[i] !== 'O' && ELEMENTI[SIMBOLI[i]].sede !== 'atmo' && ELEMENTI[SIMBOLI[i]].sede !== 'ghiaccio');
export function differenzia(solidi, { M, R, temperatura = fondoOceanoMagma, rhoNucleo = 11000 }) {
  const NMb = MOBILI.length, n = new Float64Array(NMb); for (let j = 0; j < NMb; j++) n[j] = solidi[IM[j]] / MASSA[IM[j]];
  let Olito = 0, Nlito = 0; for (const i of LITOFILI) { const ni = solidi[i] / MASSA[i]; if (ni > 0) { Olito += ni * ELEMENTI[SIMBOLI[i]].ossigeno; Nlito += ni; } }
  const Otot = solidi[IDX.O] / ELEMENTI.O.massa, jFe = MOBILI.indexOf('Fe'), jSi = MOBILI.indexOf('Si');
  let Mc = 0; for (const s of ['Fe', 'Ni', 'Co', 'S']) Mc += solidi[IDX[s]]; // (il primo nucleo: tutto il metallo)
  const kd = new Float64Array(NMb), met = new Float64Array(NMb); let P = 0, T = 0, sol = null;
  for (let giro = 0; giro < 2; giro++) {
    // la pressione: la media della pressione sul fondo durante la crescita (ogni strato si separa sul fondo del pianeta di
    // allora: P_CMB ∝ M^⅔ a densità date, e la media sulla massa è 3/5 di quella finale [D])
    P = 0.6 * pressioneNucleo(M, R, Math.min(Mc, 0.9 * M), rhoNucleo); T = temperatura(P);
    for (let j = 0; j < NMb; j++) { const k = KD[MOBILI[j]]; kd[j] = k ? 10 ** (k[1] + k[2] / T + (k[3] * P) / 1e9 / T) : 0; }
    const KDO = 10 ** (KD_O[0] + KD_O[1] / T + (KD_O[2] * P) / 1e9 / T);
    // a r = X_FeO/X_Fe dato, le moli nel metallo; le moli totali del metallo (Nm) e del silicato (Ns) a punto fisso
    // (a = N_met/N_sil è il solo legame tra gli elementi: si cerca il punto fisso a = N_met(a)/N_sil(a) con le secanti nel
    // logaritmo, partendo da quello della prova di prima)
    let aPrima = 0;
    const prova = (r) => {
      const rp = [1, 1, 1 / r, Math.pow(r, -1.5), 1 / (r * r), Math.pow(r, -2.5)]; let Om = 0;
      const h = (la) => { const a = Math.exp(la); let Nm = 0, Ns = Nlito;
        for (let j = 0; j < NMb; j++) { if (!(n[j] > 0)) { met[j] = 0; continue; } const q = j === jFe ? a / r : VAL[j] ? kd[j] * rp[VAL[j]] * a : DM[j] * a; met[j] = (n[j] * q) / (1 + q); Nm += met[j]; Ns += n[j] - met[j]; }
        Om = KDO * r * Nm; Nm += Om; return Math.log(Math.max(1e-300, Nm) / Ns) - la; };
      // (Illinois nella forchetta a ∈ [e^−40, e^5]: h cala con a — a grande tutto è metallo —; se nemmeno ad a piccolo h è
      // positivo il metallo non c'è)
      let x0, f0, x1, f1, lato = 0;
      if (aPrima > 0) { const c = Math.log(aPrima); let w = 0.25; x0 = Math.max(-40, c - w); x1 = Math.min(5, c + w); f0 = h(x0); f1 = h(x1);
        while ((f0 <= 0 && x0 > -40) || (f1 >= 0 && x1 < 5)) { w *= 4; if (f0 <= 0 && x0 > -40) { x0 = Math.max(-40, c - w); f0 = h(x0); } if (f1 >= 0 && x1 < 5) { x1 = Math.min(5, c + w); f1 = h(x1); } } }
      else { x0 = -40; f0 = h(x0); x1 = 5; f1 = h(x1); }
      if (!(f0 > 0)) { x1 = -40; f1 = h(x1); }
      else if (f1 < 0) for (let it = 0; it < 80; it++) {
        const x = x1 - (f1 * (x1 - x0)) / (f1 - f0), f = h(x); if (Math.abs(f) < 1e-13 || Math.abs(x1 - x0) < 1e-13) { x1 = x; f1 = f; break; }
        if (f * f1 < 0) { x0 = x1; f0 = f1; lato = 0; } else { f0 = lato === 1 ? f0 / 2 : f0; lato = 1; } x1 = x; f1 = f; }
      else { f1 = h(x1); }
      h(x1);
      aPrima = Math.exp(x1);
      let Osil = Olito; for (let j = 0; j < NMb; j++) Osil += (n[j] - met[j]) * OSS[j];
      return Osil + Om - Otot;
    };
    // l'ossigeno che serve cresce con r (più FeO nel silicato, più O nel metallo): bisezione in log r
    let lo = Math.log(1e-8), hi = Math.log(1e4), r;
    if (prova(Math.exp(lo)) > 0) r = Math.exp(lo); // (nemmeno con il ferro tutto metallo l'ossigeno basta: si resta lì)
    else if (prova(Math.exp(hi)) < 0) r = Math.exp(hi); // (ossigeno in eccesso: tutto ossidato)
    else { // (Illinois: lo con lo scarto negativo, hi positivo)
      let flo = prova(Math.exp(lo)), fhi = prova(Math.exp(hi)), lato = 0, x = lo;
      for (let k = 0; k < 100; k++) { x = hi - (fhi * (hi - lo)) / (fhi - flo); const f = prova(Math.exp(x)); if (Math.abs(f) <= 1e-12 * Otot || hi - lo < 1e-12) break;
        if (f > 0) { hi = x; fhi = f; if (lato === -1) flo /= 2; lato = -1; } else { lo = x; flo = f; if (lato === 1) fhi /= 2; lato = 1; } }
      r = Math.exp(x); }
    prova(r); const Om = 0; sol = { r, met: Float64Array.from(met), Om: 0 };
    // (l'ossigeno nel metallo dell'ultima prova)
    { let Nm = 0; for (let j = 0; j < NMb; j++) Nm += met[j]; sol.Om = KDO * r * Nm; void Om; }
    Mc = 0; for (let j = 0; j < NMb; j++) Mc += sol.met[j] * MASSA[IM[j]]; Mc += sol.Om * ELEMENTI.O.massa;
  }
  const nucleo = new Float64Array(NE), silicato = Float64Array.from(solidi);
  for (let j = 0; j < NMb; j++) { const i = IM[j]; nucleo[i] = Math.min(solidi[i], sol.met[j] * MASSA[i]); silicato[i] = solidi[i] - nucleo[i]; }
  nucleo[IDX.O] = Math.min(solidi[IDX.O], sol.Om * ELEMENTI.O.massa); silicato[IDX.O] = solidi[IDX.O] - nucleo[IDX.O];
  return { nucleo, silicato, P, T, r: sol.r, deltaIW: 2 * Math.log10(sol.r) };
}

// ---------- 5. LA CROSTA: la fusione parziale del mantello
// Stati: mantello, fuso, residuo. Conservazioni: ogni elemento (C_fuso·M_fuso + C_residuo·M_residuo = C₀·M_fuso/F).
// Energie: i coefficienti minerale/fuso D (le energie di un catione nel reticolo rispetto al fuso, misurate): la fusione
// d'equilibrio dà C_fuso = C₀/(D + F·(1 − D)). Flussi: quanto mantello fonde e quanto fuso si separa, dalla storia termica
// del pianeta (storia.js: la frazione fusa φ a ogni tempo, pesata con il fuso prodotto) e dal regime della crosta.
// D in blocco di una lherzolite a spinello (mantello → basalto) e del basalto che rifonde (basalto → crosta dei continenti):
// per Si, Mg, Fe, Al, Ca, Na, K quelli di chimica.js (D_MANTELLO, D_BASALTO: una fonte sola), per le tracce [R].
const D1 = { Rb: 4e-4, U: 1.1e-3, Th: 1e-3, Ba: 2e-4, Sr: 0.025, La: 6e-3, Ce: 0.01, Nd: 0.03, Sm: 0.045, Eu: 0.055, Yb: 0.12, Li: 0.2, B: 0.02, F: 0.03, Cl: 2e-3, Br: 2e-3, I: 2e-3,
  P: 0.05, Ti: 0.06, Mn: 0.9, Cr: 3, Ni: 10, Co: 2.5, V: 0.9, Cu: 0.15, Zn: 1, Pb: 0.014, Mo: 8e-3, W: 1e-3, Ag: 0.03, Sn: 0.05, As: 0.01, Hg: 0.01, Pt: 5, Au: 0.1, S: 0.1, Ne: 0, Ar: 0, He: 0 };
const D2 = { Rb: 0.05, U: 0.05, Th: 0.05, Ba: 0.3, Sr: 2, La: 0.2, Ce: 0.25, Nd: 0.4, Sm: 0.6, Eu: 1.2, Yb: 1, Li: 0.5, B: 0.2, F: 0.5, Cl: 0.05, Br: 0.05, I: 0.05,
  P: 0.5, Ti: 1.5, Mn: 2, Cr: 10, Ni: 10, Co: 5, V: 3, Cu: 1, Zn: 2, Pb: 0.5, Mo: 0.1, W: 0.05, Ag: 0.3, Sn: 0.3, As: 0.1, Hg: 0.1, Pt: 3, Au: 0.5, S: 0.3 };
// (chi non ha un D — l'ossigeno, che segue i suoi cationi, e i volatili — vale 1: resta dov'è in proporzione)
const DD1 = { ...D_MANTELLO, ...D1 }, DD2 = { ...D_BASALTO, ...D2 };
export const coefficiente = (s, stadio = 1) => (stadio === 1 ? DD1 : DD2)[s] ?? 1;
// la fusione d'equilibrio con le masse: mantello (kg per elemento), quanto fuso si separa (kg) e con che frazione fusa F;
// se il mantello da fondere supera tutto il mantello, F diventa la parte che si separa di tutto (F_eff = M_fuso/M) [D]
export function fondi(roccia, massaFuso, F, stadio = 1) {
  let M = 0; for (let i = 0; i < NE; i++) M += roccia[i]; const fuso = new Float64Array(NE), resto = new Float64Array(NE);
  if (!(massaFuso > 0) || !(M > 0)) { resto.set(roccia); return { fuso, resto, F: 0 }; }
  const Fe = Math.min(1, Math.max(F, massaFuso / M)); let mf = 0;
  for (let i = 0; i < NE; i++) { if (!(roccia[i] > 0)) continue; const D = coefficiente(SIMBOLI[i], stadio); fuso[i] = (roccia[i] / M) / (D + Fe * (1 - D)); mf += fuso[i]; }
  // (le concentrazioni del fuso, normalizzate perché sommino 1: l'ossigeno segue i suoi cationi), per la massa del fuso
  for (let i = 0; i < NE; i++) { fuso[i] = Math.min(roccia[i], (fuso[i] / mf) * massaFuso); resto[i] = roccia[i] - fuso[i]; }
  return { fuso, resto, F: Fe };
}

// LA CROSTA DI UN PIANETA di sistema() (dopo interno: serve la sua storia termica). Due serbatoi:
//   basalto  la crosta che il fuso del mantello lascia in superficie: lo spessore che storia.js dà oggi (con le placche quella
//            dei fondali, rinnovata; sotto un coperchio quella accumulata), alla densità del fuso di storia.js;
//   granito  la crosta dei continenti, dove ci sono le placche: il volume di tettonica.js (crostaAttesa, la stessa legge della
//            superficie, tarata sulla Terra e dichiarata là), alla densità della roccia di chimica.js; è una seconda fusione
//            del basalto (chimica.js F_GRANITO), il cui residuo torna nel mantello (si stacca e sprofonda: dichiarato).
// La prima fusione ha la frazione fusa MEDIA della storia di quel pianeta: Σ fuso / Σ (fuso/φ) sulla tabella di storia.js (il
// mantello che è fuso per farlo). → { basalto, granito (kg per elemento), F, Mbasalto, Mgranito } | null (gigante, o niente fuso)
export function crostaDelPianeta(P, { stella } = {}) {
  const el = P.composizione?.elementi; if (!el || P.tipo === 'gassoso' || !(P.raggioM > 0)) return null;
  const int = P.interno || {}, A = 4 * Math.PI * P.raggioM ** 2, Mb = Math.max(0, (int.crosta ?? 0) * P.raggioM) * A * STORIA.rhoFuso;
  const placche = int.tettonica === 'a placche', eta = stella?.eta ?? int.eta ?? 4.5e9, Mg = placche ? crostaAttesa(eta) * TETTONICA.hMisura * A * ROCCE.densita : 0;
  let F = null; try { const t = tabellaStoria(P, { stella }); let a = 0, b = 0; for (let i = 1; i < t.t.length; i++) { const dt = t.t[i] - t.t[i - 1], m = t.Mfuso[i], f = t.fi[i]; if (m > 0 && f > 0) { a += m * dt; b += (m / f) * dt; } } if (b > 0) F = a / b; } catch { F = null; }
  if (!(F > 0) || !(Mb + Mg > 0)) return { basalto: vettore(), granito: vettore(), F: F ?? 0, Mbasalto: 0, Mgranito: 0 };
  const sorgente = Mb + Mg / F_GRANITO, primo = fondi(el.silicato, sorgente, F, 1);
  let basalto = vettore(), granito = vettore();
  if (Mg > 0) { const qg = (Mg / F_GRANITO) / sorgente, perGranito = vettore(); for (let i = 0; i < NE; i++) perGranito[i] = primo.fuso[i] * qg; const sec = fondi(perGranito, Mg, F_GRANITO, 2); granito = sec.fuso; }
  for (let i = 0; i < NE; i++) basalto[i] = primo.fuso[i] * (Mb / sorgente);
  return { basalto, granito, F, Mbasalto: Mb, Mgranito: Mg };
}

// ---------- 4b. LE PERDITE DURANTE L'ACCRESCIMENTO: ciò che un pianeta perde mentre si fa
// La condensazione dà a ogni embrione i volatili del suo luogo; ma un embrione fuso li libera, e ciò che sta fuori (l'aria e
// il mare di allora) può andarsene con gli urti giganti e con la fuga. Il conto si fa sulla STORIA di quel pianeta: quali
// embrioni (quando sono nati, a che temperatura, con quanto alluminio), quali urti (chi su chi, quando, a che velocità).
// Stati: per ogni corpo il suo contenuto (roccia e ghiacci, elemento per elemento), la parte FUSA che si sta raffreddando
//   (la «pozza»: da quando, quanto deve ancora perdere) e la parte FUORI (aria e mare): fuori = u·g(t)·pozza, con u la parte di
//   ogni elemento che la solidificazione manda fuori e g(t) la parte del fuso già solidificata.
// Conservazioni: ogni elemento: ciò che parte va nello SPAZIO, un serbatoio dichiarato nel libro dei conti; il resto resta.
// Energie: (a) il calore dell'alluminio 26 (Al del corpo × (²⁶Al/²⁷Al)₀ e^(−t/τ) × 3,12 MeV) contro quello che fonde la roccia
//   (c_p·(T_liq − T) + L): un embrione nato presto fonde (Hevey e Sanders 2006 [R]: sotto ~1,5 milioni di anni); (b) l'urto
//   gigante: l'energia specifica Q = ½·μ·v²/(M + m) (Stewart e Leinhardt 2012 [R]) fonde la parte Q/E_fus del corpo;
//   (c) il fuso si raffredda attraverso un'aria di vapore che non lascia uscire più di ~282 W/m² (il limite di Simpson e
//   Nakajima: Nakajima et al. 1992, Goldblatt et al. 2013 [R]), più la finestra del fuso a T_liq attenuata dal vapore
//   (e^(−κ·colonna), κ = 0,01 m²/kg, Elkins-Tanton 2008 [R]); scaldato dalla nebulosa (σT⁴ del luogo, finché c'è il gas) o
//   dalla stella (L(1 − A)/16πa², A = 0,3 [R]). Dove ciò che arriva supera ciò che esce il fuso resta fuso (l'effetto serra
//   galoppante: Hamano et al. 2013 [R], il tipo II).
// Flussi: (d) l'urto toglie al bersaglio la parte X(x) dell'aria e del mare, x = v_imp·m/(v_fuga·M), X = 0,4x + 1,4x² − 0,8x³
//   (Schlichting, Sari e Yalinewich 2015, Icarus 247, 81 [R]: l'atmosfera isoterma; per x ≥ 1 tutto), e lo stesso al corpo che
//   cade, con x' = v_imp·M/(v_fuga'·m) (di solito ≥ 1: perde tutto il suo fuori); la velocità dell'urto è quella di fuga dei
//   due insieme (orbite appena incrociate: il minimo, dichiarato); (e) LA FUGA: finché il fuso tiene un'aria di vapore, e solo
//   dopo che il gas del disco è sparito (prima la nebulosa lo ripara), la luce dura della stella giovane (XUV) solleva l'aria
//   al ritmo limitato dall'energia, Ṁ = ε·π·F_XUV·R³/(G·M) (Watson et al. 1981 [R]; ε = 0,15 [R]), con F_XUV = 29,7·t^−1,23
//   erg/s/cm² a 1 UA (t in Ga, fermo prima di 0,1 Ga: Ribas et al. 2005 [R]) scalato con la luce della stella e la distanza; la
//   fuga porta via l'aria tutta insieme (senza separare le masse: semplificazione dichiarata).
// LA PARTE CHE ESCE (u): gli alogeni (Cl, Br, I), incompatibili e solubili nell'acqua, escono tutti tranne il fuso rimasto
//   tra i cristalli (INTRAPPOLATO, Elkins-Tanton 2008 [R]: una fonte sola, anche per mare.js) e la parte che i cristalli
//   prendono (D1 qui sotto); l'acqua e i gas dei ghiacci (H, O, C, N) escono nella parte di leggi.js (PARTE_FUORI: una fonte
//   sola; la solubilità dell'acqua nel fuso, 6,8·10⁻⁸·p^0,7 [R], sotto qualche centinaio di bar ne lascia fuori una parte
//   simile); lo zolfo resta nei solfuri e nel nucleo (dichiarato); Na e K se ne vanno solo come contro-ioni degli alogeni persi
//   dal mare quando il fuso è già solido (il mare è neutro; a fuso aperto l'aria porta HCl). Il resto non si muove.
// (La condensazione incompleta — i solidi che si separano dal gas mentre il disco giovane è più caldo, Cassen 1996 [R] — la fa
// disco.js con il disco viscoso che si raffredda (Ṁ ∝ (1 + t/t_s)^−3/2): a 1 UA il disco del Sole parte da ~1200 K e scende
// sotto i 300 K in un milione di anni; ma i planetesimi nascono in proporzione alla polvere che c'è, e la colonna di un disco
// viscoso a temperatura più bassa è più alta: quasi tutti nascono tardi e al freddo. Toglie a Na, K, Cl il 10–15% dove nasce
// la Terra del modello, non i quattro quinti della Terra vera: il resto lo toglie l'evaporazione dai planetesimi fusi,
// EVAPORA_PLANETESIMI.)
export const INTRAPPOLATO = 0.05; // la parte del fuso che resta tra i cristalli quando un oceano di magma solidifica (Elkins-Tanton 2008: 1–5%) [R]
export const PERDITE = Object.freeze({
  al26: 5.23e-5, tauAl: 1.034e6, energiaAl: 3.12 * 1.602e-13, // ²⁶Al/²⁷Al iniziale (Jacobsen et al. 2008), vita media (anni), J per decadimento [R]
  cp: 1200, latente: 4e5, // calore specifico (J/kg/K) e di fusione (J/kg) dei silicati [R]
  OLR: 282, kappa: 0.01, albedo: 0.3, // il limite dell'aria di vapore (W/m²), l'opacità del vapore (m²/kg), l'albedo dell'aria di vapore [R]
  epsilon: 0.15, XUV1UA: 0.0297, saturaFino: 0.1, // efficienza della fuga; F_XUV a 1 UA e a 1 Ga (W/m²), saturata prima di 0,1 Ga [R]
});
const NA_AVO = COSTANTI.NA, SIGMA = COSTANTI.sigma, ANNO_S = ANNO, LSOLE_W = LSOLE, UA_M = UA;
const ALOGENI = ['Cl', 'Br', 'I'].map((s) => IDX[s]), DEI_GHIACCI = ['H', 'O', 'C', 'N'].map((s) => IDX[s]);
// la parte di ogni elemento della roccia e dei ghiacci che la solidificazione manda fuori
const U_ROCCIA = new Float64Array(NE), U_GHIACCI = new Float64Array(NE);
for (const i of ALOGENI) U_ROCCIA[i] = (1 - INTRAPPOLATO) * (1 - coefficiente(SIMBOLI[i], 1)); // (il fuso rimasto e la parte che i cristalli prendono)
for (const i of DEI_GHIACCI) U_GHIACCI[i] = PARTE_FUORI;
// la parte dell'aria che un urto toglie (Schlichting et al. 2015, atmosfera isoterma)
export const parteTolta = (x) => (x >= 1 ? 1 : x <= 0 ? 0 : Math.min(1, 0.4 * x + 1.4 * x * x - 0.8 * x * x * x));
// l'energia che fonde un kg di roccia partendo da T (fino al liquidus in superficie, Andrault et al. 2011: la stessa curva)
const energiaFusione = (T) => PERDITE.cp * Math.max(0, liquidusPeridotite(0) - T) + PERDITE.latente;
// il calore dell'alluminio 26 ancora da liberare a t (anni) per kg di roccia, con la parte di alluminio della roccia
const caloreAl26 = (xAl, t) => (xAl / (ELEMENTI.Al.massa / 1000)) * NA_AVO * PERDITE.al26 * Math.exp(-t / PERDITE.tauAl) * PERDITE.energiaAl;
// LA PARTE FUSA DALL'ALLUMINIO 26 di un planetesimo nato a t (anni) dove il disco era a T (K), con la parte xAl di alluminio
// nella sua roccia: il calore che l'²⁶Al gli darà da lì in poi diviso per quello che fonde la roccia, al più 1 (Hevey e Sanders
// 2006 [R]: sopra ~20 km di raggio la conduzione non lo raffredda in tempo, e i corpi nati entro ~1,5 Ma fondono; i planetesimi
// del collasso dei ciottoli nascono di ~100 km: Johansen et al. 2007, Simon et al. 2016 [R]). Lo usa disco.js per ogni tempo di
// nascita dei planetesimi di un luogo.
export const fusoDaAlluminio = (xAl, t, T) => { const Ef = energiaFusione(T); return Ef > 0 ? Math.min(1, caloreAl26(xAl, Math.max(0, t)) / Ef) : 0; };
// la luce XUV integrata (J/m² a 1 UA, per L = L☉) tra t1 e t2 anni
function xuvIntegrata(t1, t2) {
  if (!(t2 > t1)) return 0; const s = PERDITE.saturaFino * 1e9, F0 = PERDITE.XUV1UA * Math.pow(PERDITE.saturaFino, -1.23); let E = 0;
  const a = Math.min(t2, s); if (a > t1) E += F0 * (a - t1) * ANNO_S;
  const b = Math.max(t1, s); if (t2 > b) E += (PERDITE.XUV1UA / -0.23) * (Math.pow(t2 / 1e9, -0.23) - Math.pow(b / 1e9, -0.23)) * 1e9 * ANNO_S;
  return E;
}
const massaDi = (v) => { let s = 0; for (let i = 0; i < v.length; i++) s += v[i]; return s; };
// (PRESTAZIONI: si muovono solo gli elementi che possono uscire — gli alogeni, Na e K come contro-ioni, e quelli dei ghiacci —:
// lo stato di ogni corpo tiene solo loro, per la roccia e per i ghiacci; il resto si somma una volta alla fine)
const MOBILI_R = [...ALOGENI, IDX.Na, IDX.K, IDX.Zn, IDX.Mg, IDX.Si], MOBILI_G = DEI_GHIACCI, NR = MOBILI_R.length, NG = MOBILI_G.length, KALO = ALOGENI.map((i) => MOBILI_R.indexOf(i));
// L'EVAPORAZIONE DAL FUSO (Hin et al. 2017 [R]: la perdita di vapore dei corpi fusi durante l'accrescimento). Un corpo fuso senza
// gas attorno (sparito il disco) ha sopra il fuso il vapore di ogni elemento alla sua pressione, quella della stessa legge della
// condensazione (Clausius–Clapeyron con l'entropia di Trouton, fissata dal T50 di Lodders: una fonte sola), proporzionale a quanto
// ne resta nel fuso (Henry, rispetto alla roccia condensata tutta). Il vapore sfugge con il flusso di Jeans dalla superficie,
// p·√(m/2πkT)·(1 + λ)·e^(−λ), λ = GMm/(kTR) (Chamberlain; Hunten 1973 [R]): un corpo piccolo, di poca gravità, lo perde quasi
// tutto, uno grande quasi niente. Dura quanto il fuso resta aperto (la stessa solidificazione di sopra), alla temperatura del
// liquidus in superficie. Per Na, K, Cl, Zn e, molto meno, Mg e Si (le specie del vapore sono contate come atomi: NaCl, SiO, KCl
// non ci sono — dichiarato; il frazionamento degli isotopi di Mg e Si che questa perdita lascia non è modellato).
const EVAPORA = [IDX.Na, IDX.K, IDX.Cl, IDX.Zn, IDX.Mg, IDX.Si].map((i) => MOBILI_R.indexOf(i));
// L'EVAPORAZIONE DAI PLANETESIMI FUSI DALL'ALLUMINIO 26, prima che finiscano in un embrione (Hin et al. 2017, Nature 549, 511
// [R]; Young et al. 2019, Icarus 323, 1 [S: letto il testo da PMC6364317]). Un planetesimo nato dopo che l'embrione del suo luogo
// si è isolato (disco.js: tIso, poche decine di migliaia di anni dentro 1 UA) fonde DA SOLO, se è nato abbastanza presto, e con
// la sua gravità da poco (λ ≪ 1: Young, eq. 15–17, la fuga è idrodinamica) il suo vapore se ne va nel gas del disco. Young et
// al. trovano che l'evaporazione QUASI ALL'EQUILIBRIO nell'idrogeno del disco (saturazione ~0,95–0,99), in 10⁴–10⁵ anni di
// oceano di magma, toglie ~12% del magnesio e ~15% del silicio (il loro miglior accordo con gli isotopi di Mg e Si della Terra) e
// lascia [K]/[K]₀ ≈ 2·10⁻³: il potassio dei corpi evaporati è perso, e quello della Terra viene dalla parte che non è
// evaporata (~¼). Qui: il flusso di ogni elemento è quello di Hertz–Knudsen, p_sat·√(m/2πkT) (la stessa legge di EVAPORA, con
// la stessa pressione di vapore di Clausius–Clapeyron fissata dal T50 di Lodders), e la superficie, il tempo e la parte che
// manca alla saturazione sono gli stessi per tutti gli elementi: il numero di volte e che un elemento cala è quello del
// magnesio (−ln(1 − 0,12), Young et al. 2019) per il rapporto delle due velocità, (√m·p_sat/c₀)_X / (√m·p_sat/c₀)_Mg.
// Na, K, Cl, Br, I, Zn ne escono con e^(−N) di qualche 10⁻¹⁰⁰: tutto ciò che è fuso se ne va. Il magnesio e il silicio NON sono
// tolti qui (le loro specie del vapore, Mg e SiO, e il loro peso sul resto della catena non sono modellati: dichiarato); il
// vapore partito non ricondensa sulla polvere fredda vicina (dichiarato: Young lo tratta allo stesso modo).
const EVAPORA_PLANETESIMI = [IDX.Na, IDX.K, IDX.Cl, IDX.Br, IDX.I, IDX.Zn].map((i) => MOBILI_R.indexOf(i)), MG_YOUNG = -Math.log(1 - 0.12);
const UR = Float64Array.from(MOBILI_R, (i) => U_ROCCIA[i]), UG = Float64Array.from(MOBILI_G, (i) => U_GHIACCI[i]), KH = MOBILI_G.indexOf(IDX.H);
const KNA = MOBILI_R.indexOf(IDX.Na), KK = MOBILI_R.indexOf(IDX.K), MASSA_R = Float64Array.from(MOBILI_R, (i) => MASSA[i]);
// membri: gli embrioni del pianeta [{ id, roccia, ghiacci (Float64Array NE, kg), fusa (facoltativa, Float64Array NE: la parte
//   della roccia dei planetesimi fusi da soli dall'²⁶Al, disco.js rocciaFusa), t (anni: quando è fatto), T (K: il disco lì),
//   R (m), a (UA) }]; fusioni: gli urti in ordine [{ g, p (id del bersaglio e di chi cade), t, Mg, Mp (kg di solidi), Rg, Rp (m),
//   a (UA) }] (anche quelli che non c'entrano: si prendono quelli del pianeta); tGas: quando sparisce il gas (anni); eta: l'età
//   della stella; L: la luce della stella (in L☉: quella di sequenza principale, che scala la luce dura del Sole giovane);
//   Lt (facoltativa): la luce della stella al tempo t (L☉), che scalda il fuso a gas sparito (la stella giovane si sta ancora
//   stringendo ed è più luminosa: stelle.js luceGiovane); radice: l'id del pianeta.
// → { roccia, ghiacci (ciò che resta), spazio (kg per elemento: ciò che è partito), urti: [{ t, x, tolta, tolta2, fusa, fuori }],
//     fuga, negliUrti (kg partiti per le due vie), evaporato (dagli embrioni), planetesimi (kg evaporati dai planetesimi), solidificato (la parte del fuso solida all'età della stella) }
export function perditeAccrescimento({ membri, fusioni, tGas, eta, L, Lt = null, radice, miscela = PROTOSOLARE }) {
  const G = COSTANTI.G, stato = new Map(), spR = new Float64Array(NR), spG = new Float64Array(NG), urti = []; let fuga = 0, negliUrti = 0, evaporato = 0;
  // (per l'evaporazione: la pressione di vapore di ogni elemento al liquidus in superficie, in Pa, per la miscela di questa stella,
  // e la sua parte in massa nella roccia condensata tutta, a cui quella pressione si riferisce)
  const Ts = liquidusPeridotite(0), freddo = tabellaSolidi(miscela).rocciaFredda, PV = new Float64Array(NR), C0 = new Float64Array(NR);
  for (let k = 0; k < NR; k++) { const sm = SIMBOLI[MOBILI_R[k]], e = ELEMENTI[sm], pi = pressioneParziale(miscela, sm); if (!(pi > 0)) continue; const dH = e.T50 * (TROUTON / R_GAS - Math.log(pi / 2));
    PV[k] = 1e5 * (pi / 2) * Math.exp(-dH * (1 / Ts - 1 / e.T50)); C0[k] = miscela[sm] / freddo; }
  // (i planetesimi fusi: quante volte e cala ciascuno, sul magnesio di Young et al. 2019 — vedi EVAPORA_PLANETESIMI —)
  const KMG = MOBILI_R.indexOf(IDX.Mg), vel = (k) => (PV[k] > 0 && C0[k] > 0 ? (Math.sqrt(MASSA_R[k]) * PV[k]) / C0[k] : 0), NPL = new Float64Array(NR);
  for (const k of EVAPORA_PLANETESIMI) NPL[k] = vel(KMG) > 0 ? (MG_YOUNG * vel(k)) / vel(KMG) : 0;
  let planetesimi = 0;
  const nuovo = (t0, T, a, R, M) => ({ R_: new Float64Array(NR), G_: new Float64Array(NG), pR: new Float64Array(NR), pG: new Float64Array(NG), sR: new Float64Array(NR), sG: new Float64Array(NG), tR: new Float64Array(NR), tG: new Float64Array(NG), t0, T, a, R, M, energia: 0, tFine: t0, tFuga: -Infinity, tEvap: -Infinity, psi: 0 });
  // il raffreddamento del fuso: quanta energia esce per m² e secondo, a t (nebulosa o stella), per un corpo a «a» UA in un disco a T
  const flussoNetto = (c, t) => {
    const colonna = (UG[KH] * c.pG[KH] * ((ELEMENTI.O.massa + 2 * ELEMENTI.H.massa) / (2 * ELEMENTI.H.massa))) / (4 * Math.PI * c.R * c.R);
    const esce = PERDITE.OLR + SIGMA * liquidusPeridotite(0) ** 4 * Math.exp(-PERDITE.kappa * colonna);
    const entra = t < tGas ? SIGMA * c.T ** 4 : ((1 - PERDITE.albedo) * (Lt ? Lt(t) : L) * LSOLE_W) / (16 * Math.PI * (c.a * UA_M) ** 2);
    return esce - entra;
  };
  // quando finisce di solidificare il fuso cominciato a c.t0 (anni; Infinity se non finisce mai)
  const fine = (c) => {
    if (!(c.energia > 0)) return c.t0; const A = 4 * Math.PI * c.R * c.R; let resta = c.energia, t = c.t0;
    if (t < tGas) { const F = flussoNetto(c, t); if (F > 0) { const dt = resta / (A * F) / ANNO_S; if (t + dt <= tGas) return t + dt; resta -= A * F * (tGas - t) * ANNO_S; } t = tGas; }
    const F = flussoNetto(c, t); return F > 0 ? t + resta / (A * F) / ANNO_S : Infinity;
  };
  const solidificato = (c, t) => { if (!(c.energia > 0)) return 1; const tf = c.tFine; if (t >= tf) return 1; if (!isFinite(tf)) return 0;
    // (la parte solidificata cresce con l'energia uscita: lineare nel tempo in ciascuno dei due tratti)
    const A = 4 * Math.PI * c.R * c.R; let e = 0; const t1 = Math.min(t, tGas); if (t1 > c.t0) { const F = flussoNetto(c, c.t0); if (F > 0) e += A * F * (t1 - c.t0) * ANNO_S; }
    const t2 = Math.max(c.t0, tGas); if (t > t2) { const F = flussoNetto(c, t2); if (F > 0) e += A * F * (t - t2) * ANNO_S; } return Math.min(1, e / c.energia); };
  // la parte fuori a t: ciò che è rimasto fuori dall'urto di prima, più ciò che la pozza ha mandato fuori fin qui, meno ciò che è
  // già partito
  const fuori = (c, t) => { const g = solidificato(c, t), oR = new Float64Array(NR), oG = new Float64Array(NG);
    for (let k = 0; k < NR; k++) oR[k] = Math.max(0, c.sR[k] + UR[k] * g * c.pR[k] - c.tR[k]); for (let k = 0; k < NG; k++) oG[k] = Math.max(0, c.sG[k] + UG[k] * g * c.pG[k] - c.tG[k]); return { oR, oG, g }; };
  // toglie la parte q del fuori al corpo e la manda nello spazio; con il mare già liquido (il fuso solido) gli alogeni portano via
  // i loro contro-ioni, Na e K nella proporzione del corpo (a fuso aperto l'aria porta HCl). → kg partiti
  const togli = (c, oR, oG, q, mare) => { if (!(q > 0)) return 0; let alo = 0, kg = 0;
    for (let k = 0; k < NR; k++) { const r = Math.min(c.R_[k], q * oR[k]); c.R_[k] -= r; spR[k] += r; c.tR[k] += r; kg += r; if (KALO.includes(k)) alo += r / MASSA_R[k]; }
    for (let k = 0; k < NG; k++) { const g = Math.min(c.G_[k], q * oG[k]); c.G_[k] -= g; spG[k] += g; c.tG[k] += g; kg += g; }
    if (mare && alo > 0) { const n = c.R_[KNA] / MASSA_R[KNA] + c.R_[KK] / MASSA_R[KK]; if (n > 0) { const q2 = Math.min(1, alo / n); for (const k of [KNA, KK]) { const v = c.R_[k] * q2; c.R_[k] -= v; spR[k] += v; kg += v; } } }
    c.M -= kg; return kg; };
  // la fuga: nel tratto senza gas, a fuso aperto, fino a t (la XUV della stella giovane, limitata dall'energia)
  const fuggi = (c, t) => {
    const t1 = Math.max(c.t0, tGas, c.tFuga), t2 = Math.min(t, c.tFine, eta); if (!(t2 > t1)) return; c.tFuga = t2;
    const { oR, oG } = fuori(c, t2), mAria = massaDi(oR) + massaDi(oG); if (!(mAria > 0)) return;
    const E = xuvIntegrata(t1, t2) * (L / (c.a * c.a)), via = Math.min(1, (PERDITE.epsilon * Math.PI * E * c.R ** 3) / (G * c.M) / mAria);
    fuga += togli(c, oR, oG, via, false);
  };
  // l'evaporazione dal fuso aperto senza gas attorno, fino a t (vedi EVAPORA): ogni elemento cala come e^(−βΔt), con
  // β = A·√(m/2πkT)·(1 + λ)e^(−λ)·p₀/(c₀·M_fuso)
  const evapora = (c, t) => {
    const t1 = Math.max(c.t0, tGas, c.tEvap), t2 = Math.min(t, c.tFine, eta); if (!(t2 > t1)) return; c.tEvap = t2; const Mf = c.psi * c.M; if (!(Mf > 0)) return;
    // (sotto un'aria di vapore d'acqua il fuso non vede il vuoto: la superficie da cui il vapore sfugge è coperta come la finestra
    // da cui esce il calore, e^(−κ·colonna) — la stessa colonna d'acqua di flussoNetto —; il vapore che entra in quell'aria se ne va
    // con lei, con la fuga limitata dall'energia: fuggi)
    const colonna = (UG[KH] * c.pG[KH] * ((ELEMENTI.O.massa + 2 * ELEMENTI.H.massa) / (2 * ELEMENTI.H.massa))) / (4 * Math.PI * c.R * c.R), scoperto = Math.exp(-PERDITE.kappa * colonna); if (!(scoperto > 1e-30)) return;
    const A = 4 * Math.PI * c.R * c.R * scoperto, dt = (t2 - t1) * ANNO_S; let kg = 0;
    for (const k of EVAPORA) { if (!(PV[k] > 0) || !(c.pR[k] > 0)) continue; const m = MASSA_R[k] / 1000 / NA_AVO, lam = (G * c.M * m) / (COSTANTI.kB * Ts * c.R);
      const beta = (A * Math.sqrt(m / (2 * Math.PI * COSTANTI.kB * Ts)) * (1 + lam) * Math.exp(-lam) * PV[k]) / (C0[k] * Mf), via = Math.min(c.R_[k], c.pR[k] * -Math.expm1(-beta * dt));
      c.R_[k] -= via; c.pR[k] -= via; spR[k] += via; kg += via; }
    c.M -= kg; evaporato += kg; };
  // la partenza: ogni embrione, fuso o no dall'alluminio
  const ids = new Set(), rocciaTutta = new Float64Array(NE), ghiacciTutti = new Float64Array(NE);
  for (const o of membri) {
    let Mr = 0, Mg = 0; for (let i = 0; i < NE; i++) { Mr += o.roccia[i]; Mg += o.ghiacci[i]; rocciaTutta[i] += o.roccia[i]; ghiacciTutti[i] += o.ghiacci[i]; }
    const xAl = Mr > 0 ? o.roccia[IDX.Al] / Mr : 0, Ef = energiaFusione(o.T), psi = Ef > 0 ? Math.min(1, caloreAl26(xAl, o.t) / Ef) : 0;
    // i suoi planetesimi fusi da soli (o.fusa: gli elementi della loro roccia, già pesati con la parte fusa) hanno perso nel gas
    // del disco i moderatamente volatili, prima di cadere sull'embrione (EVAPORA_PLANETESIMI)
    const R0 = new Float64Array(NR); for (let k = 0; k < NR; k++) R0[k] = o.roccia[MOBILI_R[k]];
    if (o.fusa) for (const k of EVAPORA_PLANETESIMI) { const via = Math.min(R0[k], o.fusa[MOBILI_R[k]] * -Math.expm1(-NPL[k])); if (!(via > 0)) continue; R0[k] -= via; spR[k] += via; Mr -= via; planetesimi += via; }
    const G0 = Float64Array.from(MOBILI_G, (i) => o.ghiacci[i]);
    const c = nuovo(o.t, o.T, o.a, o.R, Mr + Mg);
    for (let k = 0; k < NR; k++) { c.R_[k] = R0[k]; c.pR[k] = psi * c.R_[k]; } for (let k = 0; k < NG; k++) { c.G_[k] = G0[k]; c.pG[k] = psi * c.G_[k]; }
    c.psi = psi; c.energia = psi * Ef * c.M; c.tFine = fine(c); stato.set(o.id, c); ids.add(o.id);
  }
  for (const u of fusioni) {
    if (!ids.has(u.p) || !ids.has(u.g)) continue; const cg = stato.get(u.g), cp = stato.get(u.p);
    evapora(cg, u.t); evapora(cp, u.t); fuggi(cg, u.t); fuggi(cp, u.t);
    const v = Math.sqrt((2 * G * (u.Mg + u.Mp)) / (u.Rg + u.Rp)), vg = Math.sqrt((2 * G * u.Mg) / u.Rg), vp = Math.sqrt((2 * G * u.Mp) / u.Rp);
    const x = (v / vg) * (u.Mp / u.Mg), Xg = parteTolta(x), Xp = parteTolta((v / vp) * (u.Mg / u.Mp));
    const fg = fuori(cg, u.t), fp = fuori(cp, u.t); negliUrti += togli(cg, fg.oR, fg.oG, Xg, fg.g >= 1) + togli(cp, fp.oR, fp.oG, Xp, fp.g >= 1);
    // il corpo nuovo: tutto insieme; l'urto fonde la parte ψ = Q/E_fus, e la pozza è quella parte di tutto (ciò che era fuori
    // si scioglie nel fuso nuovo nella stessa parte: il resto del fuori resta fuori)
    const Mtot = u.Mg + u.Mp, Q = (0.5 * ((u.Mg * u.Mp) / Mtot) * v * v) / Mtot, T = (cg.T * u.Mg + cp.T * u.Mp) / Mtot, Ef = energiaFusione(T), psi = Math.min(1, Q / Ef);
    const c = nuovo(u.t, T, u.a, Math.cbrt(u.Rg ** 3 + u.Rp ** 3), cg.M + cp.M);
    for (let k = 0; k < NR; k++) { c.R_[k] = cg.R_[k] + cp.R_[k]; const s0 = Math.min(c.R_[k], (1 - Xg) * fg.oR[k] + (1 - Xp) * fp.oR[k]); c.pR[k] = psi * c.R_[k]; c.sR[k] = (1 - psi) * s0; }
    for (let k = 0; k < NG; k++) { c.G_[k] = cg.G_[k] + cp.G_[k]; const s0 = Math.min(c.G_[k], (1 - Xg) * fg.oG[k] + (1 - Xp) * fp.oG[k]); c.pG[k] = psi * c.G_[k]; c.sG[k] = (1 - psi) * s0; }
    c.psi = psi; c.energia = psi * Ef * c.M; c.tFine = fine(c);
    urti.push({ t: u.t, x, tolta: Xg, tolta2: Xp, fusa: psi, fuori: fg.g });
    stato.set(u.g, c); stato.delete(u.p); ids.delete(u.p);
  }
  // la fine: il pianeta (l'ultimo corpo rimasto) finisce di solidificare; la fuga fino a lì
  const c = stato.get(radice) ?? [...stato.values()][0];
  evapora(c, eta); fuggi(c, eta);
  // ciò che resta: tutto ciò che gli embrioni hanno portato meno ciò che è partito
  const spazio = new Float64Array(NE);
  for (let k = 0; k < NR; k++) { const i = MOBILI_R[k]; rocciaTutta[i] = Math.max(0, rocciaTutta[i] - spR[k]); spazio[i] += spR[k]; }
  for (let k = 0; k < NG; k++) { const i = MOBILI_G[k]; ghiacciTutti[i] = Math.max(0, ghiacciTutti[i] - spG[k]); spazio[i] += spG[k]; }
  return { roccia: rocciaTutta, ghiacci: ghiacciTutti, spazio, urti, fuga, negliUrti, evaporato, planetesimi, solidificato: solidificato(c, eta) };
}

// ---------- 6. L'ACQUA DEL MARE: le tracce
// Stati: ogni traccia sciolta, nella sua specie. Conservazioni: entra dai fiumi (la roccia di QUESTO pianeta che si scioglie,
// nella parte del suo minerale ospite che rilascio() di chimica.js scioglie davvero) e dai vulcani (gli alogeni insieme al
// cloro, nel rapporto del mantello); esce sepolta con l'acqua dei sedimenti e nelle conche che evaporano (i coefficienti di
// bilancioSali), con il calcare (lo stronzio, D = 0,1 [R]), o quando supera la solubilità del suo minerale. Ciò che è sepolto
// torna quando le placche riciclano i sedimenti: allora si accumula (come il cloro). Energie: le costanti di equilibrio a
// 25 °C [R] (non corrette per la temperatura: dichiarato). La specie: dal pH e dall'ossigeno del mare.
const KSP = { fluorite: -10.5, celestina: -6.63, idrossiapatite: -58.5, rodocrosite: -10.4, uraninite: -9, ossidoFerrico: -9, ossidoManganese: -9 };
const PK = { boro: 9.24, silice: 9.84, fosfato: [2.15, 7.2, 12.35] };
// ospite di ogni traccia nella roccia che si scioglie: la parte che se ne scioglie è quella di quel catione (rilascio)
const OSPITE = { Li: 'Mg', Rb: 'K', Sr: 'Ca', Ba: 'K', B: 'Na', F: 'Ca', U: 'Ca', Mo: 'Ca', P: 'Ca', Fe: 'Mg', Mn: 'Mg' };
const DAI_VULCANI = ['Br', 'I', 'F', 'B']; // (escono col cloro, nel rapporto del mantello)
// stato: lo stato di mare.js; dati: { crosta: { granito, basalto } (kg per elemento per kg di roccia), rilascio: { Na, K, Ca, Mg }
// (le parti sciolte), consumata (kg/anno di roccia), granito (la parte di granito), mantello (kg per kg), eta (anni), Ca (mol/kg),
// solfato, carbonato (mol/kg, liberi), calcareMoliAnno, ossigeno (bar) } → { specie: { elemento: { mol, specie: {...} } }, ... }
export function tracceDelMare(stato, d) {
  const M = stato.massaMare, eta = d.eta, fl = stato.flussi || {}, pH = stato.pH ?? 8, H = 10 ** -pH, ossico = (d.ossigeno || 0) > 1e-6;
  const kSale = (fl.kNeutro ?? 0), torna = isFinite(fl.riciclo) && fl.riciclo > 0, out = {};
  const ClVulcani = stato.bilancio?.entra?.Cl?.vulcani ?? 0, ClMantello = d.mantello.Cl || 0;
  const entraDi = (s) => {
    let fiumi = 0; const h = OSPITE[s];
    if (h) for (const [quale, q] of [['granito', d.granito], ['basalto', 1 - d.granito]]) { const c = d.crosta[quale]?.[s] || 0, ch = d.crosta[quale]?.[h] || 0, sciolto = ch > 0 ? (d.rilascio[quale]?.[h] || 0) * (ELEMENTI[h].massa / 1000) / ch : 0; fiumi += d.consumata * q * c * Math.min(1, sciolto) / (ELEMENTI[s].massa / 1000); }
    const vulcani = DAI_VULCANI.includes(s) && ClMantello > 0 ? (ClVulcani * ((d.mantello[s] || 0) / ELEMENTI[s].massa)) / (ClMantello / ELEMENTI.Cl.massa) : 0;
    return { fiumi, vulcani, tutto: fiumi + vulcani };
  };
  // l'accumulo in un mare che perde la parte kSale all'anno (e la ritrova se i sedimenti tornano): c·M = F·τ, τ = (1 − e^(−k·t))/k
  const tau = torna ? eta : kSale > 0 ? -Math.expm1(-kSale * eta) / kSale : eta;
  const libero = (s, F) => (F * tau) / M;
  const metti = (s, mol, specie, limite = null) => { out[s] = { mol, specie, ...(limite ? { limite } : {}) }; };
  for (const s of ['Li', 'B', 'F', 'Br', 'I', 'Sr', 'U', 'Mo', 'Fe', 'Mn', 'P', 'Rb', 'Ba']) {
    const F = entraDi(s); let c = libero(s, F.tutto), lim = null;
    if (s === 'Sr' && d.calcareMoliAnno > 0 && d.Ca > 0) { const k = (0.1 * d.calcareMoliAnno) / (d.Ca * M); c = Math.min(c, F.tutto / (M * (k + kSale))); lim = 'nel calcare'; }
    if (s === 'Sr' && d.solfato > 0) { const cel = 10 ** KSP.celestina / d.solfato; if (c > cel) { c = cel; lim = 'celestina'; } }
    if (s === 'F' && d.Ca > 0) { const flu = Math.sqrt(10 ** KSP.fluorite / d.Ca); if (c > flu) { c = flu; lim = 'fluorite'; } }
    if (s === 'P' && d.Ca > 0) { const a = PK.fosfato.map((p) => 10 ** -p), den = H ** 3 + a[0] * H * H + a[0] * a[1] * H + a[0] * a[1] * a[2], aPO4 = (a[0] * a[1] * a[2]) / den, OH = 1e-14 / H;
      const ap = Math.pow(10 ** KSP.idrossiapatite / (d.Ca ** 5 * OH), 1 / 3) / aPO4; if (c > ap) { c = ap; lim = 'apatite'; } }
    if (s === 'U' && !ossico) { const u = 10 ** KSP.uraninite; if (c > u) { c = u; lim = 'uraninite (mare senza ossigeno)'; } }
    if (s === 'Fe' && ossico) { const f = 10 ** KSP.ossidoFerrico; if (c > f) { c = f; lim = 'ruggine (Fe(OH)3)'; } }
    if (s === 'Fe' && !ossico && stato.totali?.Fe != null) { c = Math.min(c, stato.totali.Fe); lim = 'siderite (mare.js)'; }
    if (s === 'Mn' && ossico) { const m = 10 ** KSP.ossidoManganese; if (c > m) { c = m; lim = 'MnO2'; } }
    if (s === 'Mn' && !ossico && d.carbonato > 0) { const m = 10 ** KSP.rodocrosite / d.carbonato; if (c > m) { c = m; lim = 'rodocrosite'; } }
    // la specie semplice
    let specie;
    if (s === 'B') { const b = 1 / (1 + 10 ** (PK.boro - pH)); specie = { 'B(OH)3': 1 - b, 'B(OH)4-': b }; }
    else if (s === 'P') { const a = PK.fosfato.map((p) => 10 ** -p), den = H ** 3 + a[0] * H * H + a[0] * a[1] * H + a[0] * a[1] * a[2]; specie = { H3PO4: H ** 3 / den, 'H2PO4-': (a[0] * H * H) / den, 'HPO4(2-)': (a[0] * a[1] * H) / den, 'PO4(3-)': (a[0] * a[1] * a[2]) / den }; }
    else if (s === 'U') specie = ossico ? { 'UO2(CO3)3(4-)': 1 } : { 'U(OH)4': 1 };
    else if (s === 'Mo') specie = { 'MoO4(2-)': 1 };
    else if (s === 'Fe') specie = ossico ? { 'Fe(OH)3': 1 } : { 'Fe2+': 1 };
    else if (s === 'Mn') specie = ossico ? { MnO2: 1 } : { 'Mn2+': 1 };
    else if (s === 'I') specie = ossico ? { 'IO3-': 1 } : { 'I-': 1 };
    else specie = { [{ Li: 'Li+', F: 'F-', Br: 'Br-', Sr: 'Sr2+', Rb: 'Rb+', Ba: 'Ba2+' }[s]]: 1 };
    metti(s, c, specie, lim); out[s].entra = F;
  }
  // la silice: quella di mare.js (bilancioSali la porta già alla silice amorfa), con la sua specie
  { const si = stato.totali?.Si ?? 0, f = 1 / (1 + 10 ** (PK.silice - pH)); metti('Si', si, { H4SiO4: 1 - f, 'H3SiO4-': f }, 'silice amorfa (mare.js)'); }
  return out;
}

// ---------- 7. IL LIBRO DEI CONTI
// Per un pianeta di sistema() (che porta composizione.elementi, fatto da disco.js e cosmo.js): per ogni elemento la massa (kg) in
// nucleo, mantello, crosta, mare, aria, ghiacci (e involucro, per chi ha un velo di gas), e nello SPAZIO (ciò che è partito
// durante l'accrescimento: perditeAccrescimento), e la verifica: la somma è quella che il disco ha dato. Ogni serbatoio prende da quello sotto: la crosta dal mantello (la fusione), il mare dalla crosta
// (ciò che la pioggia scioglie) e dal mantello (i vulcani), l'aria dal mantello (il degassamento); se un serbatoio chiede
// più di quanto il suo fornitore ha, il conto va «scoperto» e lo si dice, elemento per elemento.
// opz: { mare: lo stato di mare.js (se lo si è calcolato), crosta: { basalto, granito, mantello } già fatta }
export function libroDeiConti(P, opz = {}) {
  const el = P.composizione?.elementi; if (!el) return null;
  const R = ['nucleo', 'mantello', 'crosta', 'mare', 'aria', 'ghiacci', 'involucro', 'spazio'], conti = {}, scoperti = [];
  const metti = (serb, s, kg) => { conti[s] ??= Object.fromEntries(R.map((r) => [r, 0])); conti[s][serb] += kg; };
  const disco = {}; const somma = (v) => { for (let i = 0; i < NE; i++) if (v[i]) disco[SIMBOLI[i]] = (disco[SIMBOLI[i]] || 0) + v[i]; };
  somma(el.solidi); somma(el.acqua); if (el.involucro) somma(el.involucro); if (el.spazio) somma(el.spazio); // (lo spazio: ciò che è partito mentre il pianeta si faceva, perditeAccrescimento)
  for (let i = 0; i < NE; i++) { if (el.nucleo[i]) metti('nucleo', SIMBOLI[i], el.nucleo[i]); if (el.involucro?.[i]) metti('involucro', SIMBOLI[i], el.involucro[i]); if (el.spazio?.[i]) metti('spazio', SIMBOLI[i], el.spazio[i]); }
  // il silicato: crosta (se c'è) e mantello
  const cr = opz.crosta ?? P.composizione.crosta ?? null, mantello = Float64Array.from(el.silicato);
  if (cr) for (let i = 0; i < NE; i++) { const c = (cr.basalto?.[i] || 0) + (cr.granito?.[i] || 0); metti('crosta', SIMBOLI[i], c); mantello[i] -= c; }
  // l'acqua e i suoi gas: la parte fuori (leggi.js PARTE_FUORI, o tutta nei mondi di ghiaccio) e quella sciolta nel mantello
  const acquaFuori = Float64Array.from(el.acquaFuori); // (disco.js: la parte fuori; quella dentro, meno il carbonio andato nel nucleo, nel mantello)
  for (let i = 0; i < NE; i++) mantello[i] += el.acquaDentro[i] || 0;
  // l'aria: la colonna dei gas di chimica.js (frazioni molari × pressione / g)
  const aria = new Float64Array(NE), atm = P.atmosfera, pr = P.clima?.pressione;
  if (atm?.gas && pr > 0 && isFinite(pr) && P.tipo !== 'gassoso') { const g = (COSTANTI.G * P.massaKg) / P.raggioM ** 2, colonna = (pr / g) * 4 * Math.PI * P.raggioM ** 2; let Mm = 0; for (const f in atm.gas) Mm += atm.gas[f] * (MOLECOLE[f]?.massa ?? 0);
    for (const f in atm.gas) { const mol = MOLECOLE[f]; if (!mol || !(Mm > 0)) continue; for (const a in mol.atomi) if (a in IDX) aria[IDX[a]] += (colonna * atm.gas[f] * mol.atomi[a] * ELEMENTI[a].massa) / Mm; } }
  // (l'argon e l'elio dell'aria di un pianeta di roccia sono quelli saliti dal decadimento del potassio e dell'uranio —
  // risalita.js —: il libro non conta il decadimento, e li tiene a parte)
  const radiogenici = { Ar: aria[IDX.Ar], He: aria[IDX.He] }; if (P.tipo !== 'gassoso') { aria[IDX.Ar] = 0; aria[IDX.He] = 0; }
  // il mare: le moli sciolte per kg × la massa del mare, più l'acqua stessa; i ghiacci: l'acqua di superficie che non è mare
  const mare = new Float64Array(NE), st = opz.mare;
  const acquaSup = acquaFuori[IDX.H] / (2 * ELEMENTI.H.massa) * (ELEMENTI.O.massa + 2 * ELEMENTI.H.massa); // (kg d'acqua fuori)
  const massaMare = st?.esiste ? st.massaMare : 0;
  if (massaMare > 0) { mare[IDX.H] += (massaMare * 2 * ELEMENTI.H.massa) / (ELEMENTI.O.massa + 2 * ELEMENTI.H.massa); mare[IDX.O] += (massaMare * ELEMENTI.O.massa) / (ELEMENTI.O.massa + 2 * ELEMENTI.H.massa);
    for (const s in st.totali) if (s in IDX && s !== 'Si' && s !== 'Fe') mare[IDX[s]] += massaMare * st.totali[s] * ELEMENTI[s].massa * 1e-3;
    if (st.carbonio > 0) mare[IDX.C] += massaMare * st.carbonio * ELEMENTI.C.massa * 1e-3;
    if (st.tracce) for (const s in st.tracce) if (s in IDX) mare[IDX[s]] += massaMare * st.tracce[s].mol * ELEMENTI[s].massa * 1e-3; }
  // chi prende da chi: aria e mare dall'acqua fuori e dai gas (H, O, C, N); per gli altri elementi dal silicato (crosta per
  // ciò che si scioglie dalle rocce, mantello per i vulcani: qui tutto dal mantello, dopo la crosta)
  for (let i = 0; i < NE; i++) {
    const s = SIMBOLI[i], dalVolatile = s === 'H' || s === 'O' || s === 'C' || s === 'N', chiesto = aria[i] + mare[i];
    if (aria[i]) metti('aria', s, aria[i]); if (mare[i]) metti('mare', s, mare[i]);
    // (l'ossigeno dell'aria che non viene dall'acqua viene dalla roccia: O2, CO2 dalla crosta. L'IDROGENO dei gas ridotti dell'aria
    // — metano, ammoniaca, idrogeno — di un pianeta che lo trattiene: chimica.js atmosfera ne fa l'equilibrio con l'idrogeno
    // dell'acqua fuori, ma il mare si tiene tutta l'acqua fuori; quello in più viene dall'acqua sciolta nel MANTELLO, che esce coi
    // magmi come H2 perché il ferro del fuso la riduce, 3FeO + H2O → Fe3O4 + H2, e ne tiene l'ossigeno (Holland 1984; Kasting et
    // al. 1993; Hirschmann 2012 [R]: i gas dei vulcani di un mantello ridotto sono ricchi di H2). Prima il libro lo cercava
    // nell'acqua fuori e andava scoperto: su un pianeta con l'aria all'80% di metano a 4,6 bar mancavano 2,7·10¹⁸ kg di H)
    // (e il CARBONIO dell'aria oltre quello liberato con l'acqua è quello che i vulcani hanno portato fuori dal mantello nell'età del
    // pianeta: chimica.js atmosfera, «processato»)
    if (dalVolatile) { const resta = acquaFuori[i] - chiesto; if (resta < -1e-9 * Math.max(acquaFuori[i], chiesto)) {
        if (s === 'O' || s === 'H' || s === 'C') { mantello[i] += resta; } else scoperti.push({ elemento: s, serbatoio: 'acqua fuori', manca: -resta }); }
      else metti('ghiacci', s, Math.max(0, resta)); }
    else { mantello[i] -= chiesto;
      // (ciò che l'aria e il mare prendono dalla roccia esce coi magmi, gli stessi che fanno la crosta: se nel mantello non c'è più,
      // perché un elemento incompatibile come lo zolfo è finito tutto nella crosta — su un pianeta piccolo la crosta è una parte
      // grande del silicato —, lo cedono i basalti quando eruttano: Gaillard e Scaillet 2014 [R], lo zolfo dei vulcani è quello che
      // i magmi perdono degassando. Ogni serbatoio dà solo ciò che ha)
      if (mantello[i] < 0 && conti[s]?.crosta > 0) { const da = Math.min(-mantello[i], conti[s].crosta); conti[s].crosta -= da; mantello[i] += da; } }
    if (mantello[i] < -1e-9 * Math.max(1, el.silicato[i])) scoperti.push({ elemento: s, serbatoio: 'mantello', manca: -mantello[i] });
    if (mantello[i]) metti('mantello', s, mantello[i]);
  }
  // la verifica: elemento per elemento la somma dei serbatoi contro ciò che il disco ha dato
  let peggio = 0, chi = null;
  for (const s in disco) { let t = 0; for (const r of R) t += conti[s]?.[r] || 0; const z = Math.abs(t - disco[s]) / disco[s]; if (z > peggio) { peggio = z; chi = s; } }
  return { conti, disco, scoperti, scarto: peggio, peggiore: chi, serbatoi: R, radiogenici };
}
