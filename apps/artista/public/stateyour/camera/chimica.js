// chimica.js — di che cosa sono fatte l'aria e la roccia: elementi, legami, molecole, minerali.
//
// È lo strato tra la fisica (leggi.js) e ciò che si vede: i gas di un'atmosfera, il colore di una
// superficie, e più avanti la chimica che prepara la vita. La regola della casa: ogni cosa discende da
// poche leggi e da tabelle di numeri MISURATI, dichiarate una per una.
//   CALCOLATO  · l'energia di un legame (formula di Pauling) e il suo tipo (dalla differenza di
//                elettronegatività);
//              · quali gas convivono a una temperatura e a una pressione: il minimo dell'energia di Gibbs,
//                cioè tutte le costanti di equilibrio K = exp(−ΔG/RT), con ΔG = ΔH − TΔS, insieme, e
//                gli atomi conservati;
//              · la pressione del vapore sull'acqua e sul ghiaccio, l'anidride carbonica che il mare lascia
//                nell'aria (equilibrio di Urey), quale ossido di ferro è stabile: tutte dalla stessa tabella;
//              · l'atmosfera di un pianeta: ciò che c'era, meno ciò che fugge, lasciato reagire e condensare;
//              · la roccia: il mantello è quello del pianeta (la catena degli elementi, elementi.js: la roccia del suo
//                disco separata dal suo nucleo; per i pianeti fatti a mano le proporzioni del Sole), la crosta è ciò che
//                ne fonde per primo (legge della fusione parziale; quella del pianeta, se cosmo.js gliel'ha data), i
//                minerali sono quelli che gli atomi permettono (norma);
//              · il colore di una miscela di polveri (legge di Kubelka-Munk).
//   MISURATO   · la tavola degli elementi (masse, elettronegatività, abbondanze nel Sole, legami semplici);
//              · entalpie ed entropie di formazione; calori di evaporazione e punti di ebollizione;
//              · quanto carbonio, azoto e zolfo stanno nei ghiacci (comete); i coefficienti di ripartizione
//                tra roccia e fuso; i colori dei minerali;
//              · le rese degli esperimenti di Miller-Urey (legge empirica).
// Unità: kJ/mol per le energie, J/(mol·K) per le entropie, K, Pa. Le frazioni dei gas sono in moli,
// quelle dei minerali in massa. Le specie si chiamano con la formula ('H2O', 'CO2'): il nome italiano
// è in MOLECOLE[formula].nome. (leggi.js ha una sua piccola MOLECOLE, con le masse dei gas del clima:
// qui la si legge per sapere quali molecole la gravità trattiene.)

import { COSTANTI, R_GAS, MOLECOLE as GAS_DEL_CLIMA, statoAcqua, clima, PARTE_FUORI, ACQUA, vaporeSaturo, gravitaDiSuperficie, LIVELLO_GIGANTI } from './leggi.js';

// ---------- 1. GLI ELEMENTI (dati misurati)
// massa atomica (u) · valenza più comune · elettronegatività di Pauling · abbondanza nel Sole, come
// logaritmo con l'idrogeno a 12 (fotosfera: Asplund e altri 2009) · energia del legame SEMPLICE tra due
// atomi uguali, kJ/mol (H–H, C–C nell'etano, N–N nell'idrazina, O–O nell'acqua ossigenata, S–S nello
// zolfo; per i metalli la molecola biatomica nel vapore: magnesio e calcio quasi non si legano tra loro)
const TAVOLA = {
  H: ['idrogeno', 1.008, 1, 2.20, 12.00, 436], He: ['elio', 4.003, 0, null, 10.93, 0],
  C: ['carbonio', 12.011, 4, 2.55, 8.43, 346], N: ['azoto', 14.007, 3, 3.04, 7.83, 163],
  O: ['ossigeno', 15.999, 2, 3.44, 8.69, 146], Na: ['sodio', 22.990, 1, 0.93, 6.24, 75],
  Mg: ['magnesio', 24.305, 2, 1.31, 7.60, 11], Al: ['alluminio', 26.982, 3, 1.61, 6.45, 133],
  Si: ['silicio', 28.086, 4, 1.90, 7.51, 222], P: ['fosforo', 30.974, 3, 2.19, 5.41, 201],
  S: ['zolfo', 32.06, 2, 2.58, 7.12, 266], Cl: ['cloro', 35.45, 1, 3.16, 5.50, 243],
  K: ['potassio', 39.098, 1, 0.82, 5.03, 57], Ca: ['calcio', 40.078, 2, 1.00, 6.34, 17],
  Fe: ['ferro', 55.845, 3, 1.83, 7.50, 118],
};
// I METALLI DELLA TECNICA (e l'arsenico): gli stessi sei numeri, dalle stesse fonti (abbondanze nel Sole: Asplund e altri
// 2009; per As e Hg, che nella fotosfera non si misurano, il valore delle meteoriti CI della stessa tabella [ricordati]).
// Stanno in una tavola a parte perché NON entrano nella miscela del Sole di qui sotto (SOLE): il nichel aggiungerebbe lo
// 0,5% alla massa dei metalli e sposterebbe di un soffio ogni pianeta già calcolato; gli altri nove pesano meno di 10⁻⁴.
const TAVOLA_METALLI = {
  Ti: ['titanio', 47.867, 4, 1.54, 4.95, 118], Ni: ['nichel', 58.693, 2, 1.91, 6.22, 204], Cu: ['rame', 63.546, 2, 1.90, 4.19, 201],
  Zn: ['zinco', 65.38, 2, 1.65, 4.56, 22], As: ['arsenico', 74.922, 3, 2.18, 2.30, 146], Ag: ['argento', 107.868, 1, 1.93, 0.94, 163],
  Sn: ['stagno', 118.71, 4, 1.96, 2.04, 187], Au: ['oro', 196.967, 1, 2.54, 0.92, 226], Hg: ['mercurio', 200.59, 2, 2.00, 1.17, 8], Pb: ['piombo', 207.2, 2, 2.33, 1.75, 87],
};
// quanto ce n'è nella crosta continentale superiore (parti per milione in massa: Rudnick e Gao 2003, Treatise on Geochemistry 3 [ricordati])
export const CROSTA_PPM = { Si: 311000, Al: 81500, Fe: 39200, Ca: 25700, Na: 24300, K: 23200, Mg: 15000, Ti: 3840, C: 2000, S: 621, Cl: 370, Zn: 67, Ni: 47, Cu: 28, Pb: 17, As: 4.8, Sn: 2.1, Ag: 0.053, Hg: 0.05, Au: 0.0015 };
// abbondanza: atomi per ogni atomo di idrogeno
export const ELEMENTI = Object.fromEntries(Object.entries({ ...TAVOLA, ...TAVOLA_METALLI }).map(([simbolo, [nome, massa, valenza, chi, logA, legame]]) =>
  [simbolo, { simbolo, nome, massa, valenza, chi, abbondanza: 10 ** (logA - 12), legame }]));
// la materia di una stella con metallicità Z (1 = il Sole): idrogeno ed elio sono quelli del Big Bang,
// tutto il resto l'hanno fabbricato le stelle di prima e cresce con Z
// (i quindici della miscela dei pianeti; con tracce: true anche i dieci metalli della tecnica, che sono tracce: tutti
// insieme lo 0,5% della massa dei pesanti, quasi tutto nichel)
export const abbondanze = (Z = 1, { tracce = false } = {}) => Object.fromEntries(Object.entries(ELEMENTI).filter(([s]) => tracce || s in TAVOLA).map(([s, e]) => [s, e.abbondanza * (s === 'H' || s === 'He' ? 1 : Math.max(0, Z))]));
// (PRESTAZIONI: per chi dentro questo modulo le LEGGE soltanto — l'aria di ogni pianeta le chiede a ogni giro —: la stessa
// tabella, calcolata una volta per ogni Z (chiave esatta) e congelata. Chi le vuole per scriverci chiama abbondanze())
const ABBONDANZE_FISSE = new Map();
const abbondanzeFisse = (Z = 1) => { let a = ABBONDANZE_FISSE.get(Z); if (!a) { a = Object.freeze(abbondanze(Z)); if (ABBONDANZE_FISSE.size > 256) ABBONDANZE_FISSE.clear(); ABBONDANZE_FISSE.set(Z, a); } return a; };
// LA CATENA DEGLI ELEMENTI (elementi.js): un pianeta di sistema() porta nella composizione (non enumerabili) i suoi elementi —
// la miscela della stella da cui è nato, la roccia, il nucleo e il silicato dopo la separazione, i ghiacci —. Dove ci sono,
// questo modulo legge quelli invece della tavola del Sole: la miscela della stella (atomi per idrogeno, sui quindici elementi
// della tavola), il mantello (atomi per atomo di silicio dei sette che fanno i minerali; il ferro è quello rimasto nel silicato
// come FeO), il cloro e lo zolfo del mantello (mol per kg di silicato) e il carbonio che l'acqua gli ha portato e che non è
// uscito né è finito nel nucleo (disco.js: la parte dentro dei ghiacci, divisa col metallo). Un pianeta fatto a mano (le prove) resta con la tavola del Sole.
const DEL_PIANETA = new WeakMap();
export function delPianeta(comp) {
  const el = comp?.elementi; if (!el || !el.simboli) return null; let d = DEL_PIANETA.get(el); if (d) return d;
  const S = el.simboli, kg = (v, e) => { const i = S.indexOf(e); return i >= 0 ? v[i] || 0 : 0; }, X = el.stella, nH = X.H / ELEMENTI.H.massa, stella = {};
  for (const e in TAVOLA) stella[e] = (X[e] || 0) / ELEMENTI[e].massa / nH;
  let Msil = 0; for (const v of el.silicato) Msil += v;
  const mol = (e) => kg(el.silicato, e) / ELEMENTI[e].massa, si = mol('Si');
  const mantello = si > 0 ? { Si: 1, Mg: mol('Mg') / si, Fe: mol('Fe') / si, Al: mol('Al') / si, Ca: mol('Ca') / si, Na: mol('Na') / si, K: mol('K') / si } : null;
  const rimasto = Msil > 0 ? { Cl: (1000 * mol('Cl')) / Msil, S: (1000 * mol('S')) / Msil, C: (1000 * kg(el.acquaDentro, 'C')) / ELEMENTI.C.massa / Msil } : null;
  d = Object.freeze({ stella: Object.freeze(stella), mantello: mantello && Object.freeze(mantello), rimasto: rimasto && Object.freeze(rimasto), zolfoMoli: mol('S'), silicatoKg: Msil }); DEL_PIANETA.set(el, d); return d;
}
// la crosta di QUEL pianeta (elementi.js crostaDelPianeta, che cosmo.js mette accanto alla composizione): basalto e granito in
// atomi per atomo di silicio, come il mantello; null dove non c'è (e allora le rocce si fanno dal mantello, come prima)
const CROSTA_DEL_PIANETA = new WeakMap();
export function crostaDiPianeta(comp) {
  const c = comp?.crosta, el = comp?.elementi; if (!c || !el?.simboli) return null; let d = CROSTA_DEL_PIANETA.get(c); if (d) return d;
  const S = el.simboli, perSi = (v, M) => { if (!(M > 0)) return null; const mol = (e) => (v[S.indexOf(e)] || 0) / ELEMENTI[e].massa, si = mol('Si'); return si > 0 ? { Si: 1, Mg: mol('Mg') / si, Fe: mol('Fe') / si, Al: mol('Al') / si, Ca: mol('Ca') / si, Na: mol('Na') / si, K: mol('K') / si } : null; };
  d = Object.freeze({ basalto: perSi(c.basalto, c.Mbasalto), granito: perSi(c.granito, c.Mgranito) }); CROSTA_DEL_PIANETA.set(c, d); return d;
}

// ---------- 2. I LEGAMI (calcolati)
// Pauling: un legame tra atomi diversi è più forte della media (geometrica) dei due legami tra atomi
// uguali, e il di più cresce con il quadrato della differenza di elettronegatività: l'atomo più «avido»
// tira a sé gli elettroni e la carica che si separa tiene insieme i due. 96,5 kJ/mol è un elettronvolt.
// Vale per i legami semplici: entro il 5% per H–Cl e C–H, entro il 15% per O–H e N–H; per i sali,
// che sono cristalli e non molecole, sbaglia (per NaCl dà la metà in più).
const dChi = (a, b) => (ELEMENTI[a].chi == null || ELEMENTI[b].chi == null ? 0 : Math.abs(ELEMENTI[a].chi - ELEMENTI[b].chi));
export const energiaLegame = (a, b) => (ELEMENTI[a].valenza && ELEMENTI[b].valenza ? Math.sqrt(ELEMENTI[a].legame * ELEMENTI[b].legame) + 96.5 * dChi(a, b) ** 2 : 0);
// quanta parte del legame è «ionica» (Pauling): 1 − exp(−Δχ²/4); a Δχ = 1,7 è metà
export const carattereIonico = (a, b) => 1 - Math.exp(-(dChi(a, b) ** 2) / 4);
// covalente (gli elettroni sono in comune, alla pari), polare (in comune, ma spostati), ionico (uno li
// ha ceduti all'altro). Le soglie 0,4 e 1,7 sono quelle convenzionali dei chimici.
export const tipoLegame = (a, b) => (dChi(a, b) < 0.4 ? 'covalente' : dChi(a, b) < 1.7 ? 'polare' : 'ionico');

// ---------- 3. LE MOLECOLE E I MINERALI (dati misurati)
// entalpia di formazione ΔH (kJ/mol) ed entropia S (J/mol·K) a 298 K e 1 bar, dalle tabelle
// termochimiche (CODATA 1989 e Robie e Hemingway 1995: vedi «STATO DELLE FONTI» più sotto), arrotondate: tra una
// tabella e l'altra cambiano di qualche kJ. ΔH dice quanto calore si libera a formare la specie dagli
// elementi; S quanto «disordine» porta con sé: un gas ne ha molto, un cristallo poco.
// Il ghiaccio è il liquido meno il calore di fusione (6,01 kJ/mol a 273 K).
const SPECIE = [
  ['H2', 'idrogeno', 'gas', 0, 130.68], ['He', 'elio', 'gas', 0, 126.15], ['N2', 'azoto', 'gas', 0, 191.61],
  ['O2', 'ossigeno', 'gas', 0, 205.15], ['Cl2', 'cloro', 'gas', 0, 223.08], ['S2', 'vapore di zolfo', 'gas', 128.6, 228.17],
  ['H2O', 'acqua', 'gas', ...ACQUA.stati.vapore], ['CO', 'monossido di carbonio', 'gas', -110.53, 197.66], // (l'acqua nei suoi tre stati: la tabella è in leggi.js, ACQUA.stati — una fonte sola)
  ['CO2', 'anidride carbonica', 'gas', -393.51, 213.79], ['CH4', 'metano', 'gas', -74.6, 186.25],
  ['NH3', 'ammoniaca', 'gas', -45.94, 192.77], ['HCN', 'acido cianidrico', 'gas', 129.3, 201.82],
  ['H2CO', 'formaldeide', 'gas', -108.6, 218.76], ['CH3OH', 'metanolo', 'gas', -201.0, 239.9],
  ['H2S', 'idrogeno solforato', 'gas', -20.6, 205.81], ['SO2', 'anidride solforosa', 'gas', -296.81, 248.22],
  ['NO', 'ossido di azoto', 'gas', 91.3, 210.76], ['C2H2', 'acetilene', 'gas', 227.4, 200.9],
  ['C2H6', 'etano', 'gas', -84.0, 229.2], ['HCl', 'acido cloridrico', 'gas', -92.31, 186.90],
  ['H2O(l)', 'acqua liquida', 'liquido', ...ACQUA.stati.liquida], ['H2O(s)', 'ghiaccio d\'acqua', 'solido', ...ACQUA.stati.ghiaccio],
  ['C', 'grafite', 'solido', 0, 5.74], ['Fe', 'ferro metallico', 'solido', 0, 27.32],
  ['FeO', 'wüstite', 'solido', -272.0, 60.75], ['Fe3O4', 'magnetite', 'solido', -1115.7, 146.1],
  ['Fe2O3', 'ematite', 'solido', -826.2, 87.4], ['FeS', 'troilite', 'solido', -100.0, 60.3],
  ['SiO2', 'quarzo', 'solido', -910.7, 41.46], ['MgO', 'periclasio', 'solido', -601.6, 26.95],
  ['Al2O3', 'corindone', 'solido', -1675.7, 50.92], ['MgSiO3', 'enstatite (pirosseno)', 'solido', -1545.6, 66.3],
  ['Mg2SiO4', 'forsterite (olivina)', 'solido', -2173.0, 94.1], ['Fe2SiO4', 'fayalite (olivina)', 'solido', -1479.9, 145.2],
  ['CaSiO3', 'wollastonite', 'solido', -1634.9, 81.9], ['CaCO3', 'calcite', 'solido', -1207.6, 91.7],
  ['CaSO4', 'anidrite', 'solido', -1434.5, 107.4], ['NaCl', 'salgemma', 'solido', -411.2, 72.1],
  ['NaAlSi3O8', 'albite (feldspato)', 'solido', -3935.1, 207.4], ['KAlSi3O8', 'ortoclasio (feldspato)', 'solido', -3974.6, 214.2],
  ['CaAl2Si2O8', 'anortite (feldspato)', 'solido', -4234.0, 199.3],
];
// Riletti su Robie e Hemingway 1995 (2026-11): magnetite, ematite, enstatite, forsterite, anidrite portati ai valori di
// quella fonte (erano di poco diversi, da un'altra tabella). La wüstite resta FeO stechiometrico (−272,0; 60,75): in
// Robie e Hemingway c'è solo quella reale, Fe0,947O (−266,3; 56,6). Non riletti lì: ferro, troilite, fayalite, wollastonite.
// I MINERALI DEI METALLI: ossidi, solfuri, carbonati principali. ΔH di formazione e S a 298 K da Robie e Hemingway 1995
// (U.S. Geological Survey Bulletin 2131: opera del governo degli Stati Uniti, di dominio pubblico, letta dal PDF
// l'11-2026; per bunsenite, covellite e smithsonite il ΔH è ricavato dal loro ΔG e dalle entropie della stessa fonte).
// STATO DELLE FONTI della tabella SPECIE qui sopra (2026-11): le tabelle NIST-JANAF e il NIST WebBook sono «dati standard
// di riferimento» protetti (Standard Reference Data Act): i numeri restano quelli, ma la fonte da citare è la primaria.
// Per H2O, CO, CO2, CH4, NH3, H2S, SO2, HCl, O2, H2, N2, S2 e per tutti i minerali: Robie e Hemingway 1995 (che riporta i
// valori CODATA di Cox, Wagman e Medvedev 1989), coincidenti con quelli di qui entro l'arrotondamento; per HCN, H2CO,
// CH3OH, NO, C2H2, C2H6 il confronto è con le Active Thermochemical Tables (ATcT 1.202, Argonne, lette l'11-2026): tornano
// entro 1 kJ/mol; l'HCN, che qui aveva 135,1, ha ora il valore di ATcT, 129,3 kJ/mol, lo stesso di molecole_energia.js
// (una grandezza, una fonte): le tracce di HCN nelle arie crescono di circa 1,7 volte.
const SPECIE_METALLI = [
  ['Cu2O', 'cuprite', -170.6, 92.4], ['CuO', 'tenorite', -156.1, 42.6], ['SnO2', 'cassiterite', -577.6, 49.0], ['PbO', 'litargirio', -219.0, 66.5],
  ['ZnO', 'zincite', -350.5, 43.2], ['As2O3', 'arsenolite', -657.0, 107.4], ['TiO2', 'rutilo', -944.0, 50.6], ['NiO', 'bunsenite', -239.3, 38.0], ['HgO', 'montroydite', -90.8, 70.3],
  ['Cu2S', 'calcocite', -83.9, 116.2], ['CuS', 'covellite', -54.6, 67.4], ['PbS', 'galena', -98.3, 91.7], ['ZnS', 'sfalerite', -204.1, 58.7], ['As2S3', 'orpimento', -91.6, 163.6],
  ['Ag2S', 'acantite', -32.0, 142.9], ['HgS', 'cinabro', -54.3, 82.5], ['NiS', 'millerite', -91.0, 53.0], ['SnS', 'herzenbergite', -106.5, 77.0], ['FeS2', 'pirite', -171.5, 52.9],
  ['Cu2CO5H2', 'malachite', -1054.0, 166.3], ['PbCO3', 'cerussite', -699.2, 131.0], ['ZnCO3', 'smithsonite', -817.0, 81.2], ['FeCO3', 'siderite', -755.9, 95.5],
  ['Cu', 'rame nativo', 0, 33.14], ['Ag', 'argento nativo', 0, 42.55], ['Au', 'oro nativo', 0, 47.49], ['Pb', 'piombo', 0, 64.8], ['Sn', 'stagno', 0, 51.18], ['Zn', 'zinco', 0, 41.63], ['Ni', 'nichel', 0, 29.87], ['Ti', 'titanio', 0, 30.76], ['Hg', 'mercurio', 0, 75.90], ['As', 'arsenico', 0, 35.69],
].map(([f, nome, dH, S]) => [f, nome, 'solido', dH, S]);
for (const r of SPECIE_METALLI) if (!SPECIE.some((x) => x[0] === r[0])) SPECIE.push(r);
// gli atomi di una formula ('Mg2SiO4' → Mg 2, Si 1, O 4) e la sua massa, dalla tavola
const atomiDi = (f) => { const a = {}; for (const [, s, n] of f.replace(/\(.*\)/, '').matchAll(/([A-Z][a-z]?)(\d*)/g)) a[s] = (a[s] || 0) + (+n || 1); return a; };
const massaDi = (f) => Object.entries(atomiDi(f)).reduce((m, [s, n]) => m + n * ELEMENTI[s].massa, 0);
export const MOLECOLE = Object.fromEntries(SPECIE.map(([formula, nome, fase, dH, S]) => [formula, { formula, nome, fase, dH, S, atomi: atomiDi(formula), massa: massaDi(formula) }]));
const GAS = Object.values(MOLECOLE).filter((m) => m.fase === 'gas'), NEI_GAS = new Set(GAS.flatMap((m) => Object.keys(m.atomi)));
// L'ARGON non entra negli equilibri (non reagisce con niente: per questo sta fuori da GAS e dalla tavola degli elementi):
// serve a pesare e a nominare quello radiogenico che sale dall'interno («inerti» di atmosfera(); massa atomica misurata)
MOLECOLE.Ar = { formula: 'Ar', nome: 'argon', fase: 'gas', dH: 0, S: 154.85, atomi: { Ar: 1 }, massa: 39.948 };

// l'energia di Gibbs di una specie a T (J/mol): g = ΔH − T·S. Il calore tira verso le specie più
// legate, il disordine verso quelle più libere: a T bassa vince il primo, a T alta il secondo.
// (ΔH e S presi costanti con la temperatura: è l'approssimazione dichiarata; regge bene fino a ~2500 K)
const gibbs = (f, T) => 1000 * MOLECOLE[f].dH - T * MOLECOLE[f].S;
const dG = ([reagenti, prodotti], T) => { let g = 0; for (const f in prodotti) g += prodotti[f] * gibbs(f, T); for (const f in reagenti) g -= reagenti[f] * gibbs(f, T); return g; };
// le reazioni chiave: [reagenti, prodotti]
export const REAZIONI = {
  metano: [{ CO: 1, H2: 3 }, { CH4: 1, H2O: 1 }],        // CO + 3H2 ⇌ CH4 + H2O
  ammoniaca: [{ N2: 1, H2: 3 }, { NH3: 2 }],              // N2 + 3H2 ⇌ 2NH3
  gasDAcqua: [{ CO: 1, H2O: 1 }, { CO2: 1, H2: 1 }],      // CO + H2O ⇌ CO2 + H2
  acqua: [{ H2O: 2 }, { H2: 2, O2: 1 }],                  // 2H2O ⇌ 2H2 + O2
  urey: [{ CaSiO3: 1, CO2: 1 }, { CaCO3: 1, SiO2: 1 }],   // la roccia che si mangia l'anidride carbonica
};
// la costante di equilibrio di una reazione (nome in REAZIONI, o [reagenti, prodotti]): pressioni in bar
export const costanteEquilibrio = (reazione, T) => Math.exp(-dG(typeof reazione === 'string' ? REAZIONI[reazione] : reazione, T) / (R_GAS * T));
// la pressione del vapore sopra il liquido o il ghiaccio di una specie (Pa): oltre, il gas condensa in
// gocce, neve o brina. Per l'acqua è la K di H2O(l) ⇌ H2O(gas) dalla tabella; tra liquido e ghiaccio
// comanda quello che ne lascia in aria di meno (è lui il più stabile): a 288 K dà 1,7 kPa. La formula sta in
// leggi.js (vaporeSaturo: la usa anche il clima a fasce), con la tabella dell'acqua da cui vengono le righe qui sopra. Per gli altri
// gas la legge di Clausius-Clapeyron con due dati misurati: il calore di evaporazione (kJ/mol; per la
// CO2, che a 1 bar non ha liquido, di sublimazione) e la temperatura a cui bolle a 1 bar (K).
// Idrogeno ed elio non condensano mai. (Lo zolfo: dalla sua pressione di vapore a 393 K e a 718 K.)
const EVAPORAZIONE = { Ar: [6.43, 87.3], CO2: [26.1, 194.7], NH3: [23.35, 239.8], CH4: [8.19, 111.7], N2: [5.57, 77.4], SO2: [24.9, 263.1], H2S: [18.7, 212.8], CO: [6.04, 81.6], O2: [6.82, 90.2], HCN: [25.2, 298.8], CH3OH: [35.2, 337.8], S2: [73, 717.8],
  C2H6: [14.7, 184.6], C2H2: [21.3, 189.3], HCl: [16.2, 188.1], H2CO: [23.3, 254.0], NO: [13.8, 121.4], Cl2: [20.4, 239.1] };
export const pressioneVapore = (T, f = 'H2O') => (f === 'H2O' ? vaporeSaturo(T) // (la formula sola dell'acqua: leggi.js, dalla stessa tabella)
  : EVAPORAZIONE[f] ? 1e5 * Math.exp(((-1000 * EVAPORAZIONE[f][0]) / R_GAS) * (1 / T - 1 / EVAPORAZIONE[f][1])) : Infinity);
// equilibrio di Urey: dove c'è acqua liquida la pioggia scioglie i silicati e l'anidride carbonica finisce
// nel calcare (CaSiO3 + CO2 ⇌ CaCO3 + SiO2). Questa è la pressione di CO2 che resta nell'aria (Pa):
// un nulla a 288 K, un centinaio di bar a 735 K (è, quasi, la pressione di Venere).
export const pressioneCO2Urey = (T) => 1e5 / costanteEquilibrio('urey', T);
// quale forma del ferro è stabile a una temperatura e a una pressione di ossigeno (bar): quella che
// costa meno energia per atomo di ferro, contando l'ossigeno che prende dall'aria. grado: 0 = metallo,
// ½ = ferro ferroso (FeO), ⅚ = magnetite, 1 = ferro ferrico (ematite, la ruggine rossa).
export function ferroStabile(T, pO2) {
  const muO = 0.5 * (gibbs('O2', T) + R_GAS * T * Math.log(Math.max(pO2, 1e-300)));
  return [['Fe', 1, 0, 0], ['FeO', 1, 1, 0.5], ['Fe3O4', 3, 4, 5 / 6], ['Fe2O3', 2, 3, 1]]
    .map(([f, nFe, nO, grado]) => ({ fase: MOLECOLE[f].nome, formula: f, grado, g: (gibbs(f, T) - nO * muO) / nFe }))
    .reduce((a, b) => (b.g < a.g ? b : a));
}

// ---------- 4. L'EQUILIBRIO DEI GAS (calcolato)
// Dati gli atomi (H, C, N, O, S; anche He e Cl), la temperatura e la pressione, quali molecole si
// formano? Quelle che rendono minima l'energia di Gibbs dell'insieme. Al minimo ogni molecola ha
// un «prezzo» che è la somma dei prezzi λ dei suoi atomi:
//     frazione_i = exp( Σ atomi_i·λ − g_i/RT − ln P )
// e questo equivale a soddisfare INSIEME tutte le costanti di equilibrio (CO + 3H2 ⇌ CH4 + H2O,
// N2 + 3H2 ⇌ 2NH3, CO + H2O ⇌ CO2 + H2, 2H2O ⇌ 2H2 + O2 e ogni altra tra le specie della tabella).
// Restano da trovare i prezzi λ che conservano gli atomi: è il minimo di una funzione convessa,
// Ψ(λ) = Σ moli_i(λ) − Σ atomi·λ, che il metodo di Newton trova sempre. Il carbonio che il gas non
// riesce a tenere si deposita come grafite (fuliggine): è un tetto al prezzo del carbonio.
// Solo gas (più la fuliggine): niente gocce né nubi, niente velocità di reazione.
// → { formula: frazione molare } (somma 1); con dettagli: { gas, grafite (la parte del carbonio che
//   si deposita, 0…1), moli (di gas, per le quantità di atomi date) }
export function equilibrio({ T, P = 1e5, elementi = {}, dettagli = false } = {}) {
  const el = Object.keys(elementi).filter((e) => elementi[e] > 0 && NEI_GAS.has(e)), tot = el.reduce((s, e) => s + elementi[e], 0);
  const esci = (gas, grafite = 0, moli = 0) => (dettagli ? { gas, grafite, moli } : gas);
  if (!el.length || !(T > 0) || !(P > 0)) return esci({});
  const m = el.length, RT = R_GAS * T, b = el.map((e) => elementi[e] / tot);
  const sp = GAS.filter((s) => Object.keys(s.atomi).every((e) => el.includes(e))), q = sp.length;
  const A = sp.map((s) => el.map((e) => s.atomi[e] || 0)), c = sp.map((s) => gibbs(s.formula, T) / RT + Math.log(P / 1e5));
  const iC = el.indexOf('C'), tetto = gibbs('C', T) / RT;
  // si parte con tutti i prezzi così bassi che non c'è quasi nessuna molecola, e si sale
  const lam = new Array(m).fill(Math.min(0, ...c.map((ci, i) => ci / A[i].reduce((x, y) => x + y, 0))));
  if (iC >= 0) lam[iC] = Math.min(lam[iC], tetto);
  const e = new Float64Array(q), n = new Float64Array(q), r = new Array(m), d = new Array(m), prova = new Array(m);
  const H = el.map(() => new Array(m).fill(0)), G = el.map(() => new Array(m + 1).fill(0)), alTetto = () => iC >= 0 && lam[iC] >= tetto - 1e-12;
  // (PRESTAZIONI, senza cambiare un bit: nei cicli qui sotto le righe delle matrici si prendono una volta e lo scambio delle
  // righe non crea vettori. Una molecola ha due o tre elementi dei cinque–sette in gioco: gli altri coefficienti della sua riga
  // sono zero, e uno zero per un numero FINITO è zero, che sommato non cambia niente. Dove i numeri sono finiti (lo si
  // controlla: se no si fa il giro intero di prima) si scorrono solo i coefficienti che ci sono, «NZ», nello stesso ordine.)
  const NZ = A.map((riga) => { const z = []; for (let j = 0; j < m; j++) if (riga[j]) z.push(j); return z; });
  const finiti = (v) => { for (let j = 0; j < m; j++) if (v[j] - v[j] !== 0) return false; return true; };
  const psi = (l, s) => { let v = 0;
    if (finiti(l)) for (let i = 0; i < q; i++) { const Ai = A[i], z = NZ[i], nz = z.length; let x = s - c[i]; for (let a = 0; a < nz; a++) { const j = z[a]; x += Ai[j] * l[j]; } e[i] = x; v += n[i] = Math.exp(x); }
    else for (let i = 0; i < q; i++) { const Ai = A[i]; let x = s - c[i]; for (let j = 0; j < m; j++) x += Ai[j] * l[j]; e[i] = x; v += n[i] = Math.exp(x); }
    for (let j = 0; j < m; j++) v -= b[j] * l[j]; return v; };
  // a volume fissato (s = logaritmo delle moli totali, che fissa il volume a quella pressione): Newton
  const minimizza = (s) => {
    for (let it = 0; it < 400; it++) {
      const v0 = psi(lam, s);
      for (let j = 0; j < m; j++) { r[j] = -b[j]; H[j].fill(0); }
      for (let i = 0; i < q; i++) { const Ai = A[i], ni = n[i], z = NZ[i], nz = z.length; for (let a = 0; a < nz; a++) { const j = z[a], w = Ai[j] * ni, Hj = H[j]; r[j] += w;
        if (w - w === 0) for (let a2 = 0; a2 < nz; a2++) { const k = z[a2]; Hj[k] += w * Ai[k]; } else for (let k = 0; k < m; k++) Hj[k] += w * Ai[k]; } }
      let scarto = 0, diag = 0; for (let j = 0; j < m; j++) { scarto = Math.max(scarto, (j === iC && alTetto() ? Math.max(0, r[j]) : Math.abs(r[j])) / b[j]); diag = Math.max(diag, H[j][j]); }
      if (scarto < 1e-11) break;
      // il passo di Newton: H·d = −r (eliminazione di Gauss; un velo sulla diagonale se due atomi vanno
      // sempre insieme, come C e O quando c'è solo CO2). Se il carbonio è al tetto e vorrebbe salire
      // ancora, c'è grafite: il suo prezzo resta fermo e si risolve per gli altri.
      let fermo = alTetto() && r[iC] < 0;
      for (let giro = 0; giro < 2; giro++) {
        for (let j = 0; j < m; j++) { for (let k = 0; k < m; k++) G[j][k] = fermo && (j === iC || k === iC) ? +(j === k) : H[j][k] + (j === k ? 1e-13 * diag + 1e-300 : 0); G[j][m] = fermo && j === iC ? 0 : -r[j]; }
        for (let j = 0; j < m; j++) {
          let p = j; for (let k = j + 1; k < m; k++) if (Math.abs(G[k][j]) > Math.abs(G[p][j])) p = k;
          { const riga = G[j]; G[j] = G[p]; G[p] = riga; } const Gj = G[j], piv = Gj[j] || 1e-300;
          for (let k = j + 1; k < m; k++) { const Gk = G[k], f = Gk[j] / piv; if (f) for (let l = j; l <= m; l++) Gk[l] -= f * Gj[l]; }
        }
        for (let j = m - 1; j >= 0; j--) { const Gj = G[j]; let x = Gj[m]; for (let k = j + 1; k < m; k++) x -= Gj[k] * d[k]; d[j] = x / (Gj[j] || 1e-300); }
        if (fermo || !alTetto() || d[iC] <= 0) break; fermo = true;
      }
      // quanto lungo: nessuna molecola può superare di colpo gli atomi che ci sono, e il carbonio il tetto
      let t = 1, pend = 0; for (let j = 0; j < m; j++) pend += r[j] * d[j];
      if (finiti(d)) for (let i = 0; i < q; i++) { const Ai = A[i], z = NZ[i], nz = z.length; let de = 0; for (let a = 0; a < nz; a++) { const j = z[a]; de += Ai[j] * d[j]; } if (de > 0) t = Math.min(t, (Math.max(e[i], 0) + 1.5 - e[i]) / de); }
      else for (let i = 0; i < q; i++) { const Ai = A[i]; let de = 0; for (let j = 0; j < m; j++) de += Ai[j] * d[j]; if (de > 0) t = Math.min(t, (Math.max(e[i], 0) + 1.5 - e[i]) / de); }
      if (iC >= 0 && !fermo && d[iC] > 0) t = Math.min(t, (tetto - lam[iC]) / d[iC]);
      // e si accorcia finché Ψ scende davvero (la funzione è convessa: prima o poi scende)
      for (let giri = 0; giri < 40; giri++, t /= 2) { for (let j = 0; j < m; j++) prova[j] = lam[j] + t * d[j]; if (psi(prova, s) <= v0 + 1e-4 * t * pend || Math.abs(pend) < 1e-15 * (1 + Math.abs(v0))) break; }
      for (let j = 0; j < m; j++) lam[j] = prova[j];
    }
    psi(lam, s); let N = 0; for (let i = 0; i < q; i++) N += n[i]; return N;
  };
  // la pressione è fissata, il volume no: si cerca s tale che le moli trovate siano proprio exp(s) (secante)
  let s = Math.log(0.5), s0 = 0, F0 = 0, N = 0;
  for (let k = 0; k < 60; k++) {
    N = minimizza(s); if (!(N > 0)) break;
    const F = Math.log(N) - s; if (Math.abs(F) < 1e-12) break;
    const passo = k === 0 || F === F0 ? F : Math.max(-8, Math.min(8, (-F * (s - s0)) / (F - F0)));
    s0 = s; F0 = F; s += passo;
  }
  if (!(N > 0)) return esci({}, +(iC >= 0), 0);
  const gas = {}; let Cgas = 0;
  for (let i = 0; i < q; i++) { gas[sp[i].formula] = n[i] / N; if (iC >= 0) Cgas += A[i][iC] * n[i]; }
  const fuliggine = alTetto() ? 1 - Cgas / b[iC] : 0; // c'è grafite solo se il carbonio è al tetto
  return esci(gas, fuliggine > 1e-9 ? fuliggine : 0, N * tot);
}

// quanto un'aria è «riducente», da 0 a 1. Si conta l'idrogeno che ogni gas può cedere (in molecole di
// H2: un H2 vale 1, un metano 4, un'ammoniaca 1,5, un CO 1: è ciò che manca alla molecola per essere
// CO2, H2O, N2, SO2) contro quello che servirebbe per ridurre a metano il carbonio ossidato (4 per CO2)
// e per consumare l'ossigeno libero (2 per O2). Azoto e acqua sono neutri.
const redox = (gas) => {
  let rid = 0, oss = 4 * (gas.CO2 || 0);
  for (const f in gas) { const a = MOLECOLE[f]?.atomi; if (!a) continue; const h = 2 * (a.C || 0) + 0.5 * (a.H || 0) - (a.O || 0) + 2 * (a.S || 0); if (h > 0) rid += h * gas[f]; else oss -= h * gas[f]; }
  return { rid, oss };
};
export function potereRiducente(gas = {}) { const { rid, oss } = redox(gas); return rid > 1e-6 ? rid / (rid + oss) : 0; }

// ---------- 5. L'ATMOSFERA DI UN PIANETA
// Si parte da ciò che c'era, si toglie ciò che fugge, si lascia reagire.
//  · Un pianeta che trattiene l'idrogeno (un gigante, o un mondo massiccio e freddo) conserva il gas
//    della nebulosa: le abbondanze della sua stella, meno l'ossigeno chiuso nella roccia (MgO, SiO2…).
//    Con tanto idrogeno il carbonio diventa metano e l'azoto ammoniaca: aria riducente.
//  · Un pianeta che NON lo trattiene ha solo i gas usciti dall'interno: l'acqua e ciò che era
//    congelato con lei (carbonio, azoto, zolfo). Qui l'idrogeno libero fugge; e ogni volta che fugge
//    l'equilibrio ne libera altro dal metano, dall'ammoniaca e dall'acqua (CH4 + 2H2O → CO2 + 4H2):
//    si va avanti finché tutto l'idrogeno rimasto è legato nell'acqua e il carbonio è CO2. È una
//    titolazione: se ne calcola direttamente il punto d'arrivo. Così la fuga dell'idrogeno OSSIDA l'aria.
//    Se poi l'acqua è tutta vapore (niente mare né ghiaccio che la trattenga in basso) sale in alto, la
//    luce la spezza e l'idrogeno se ne va: il pianeta perde anche l'acqua, come Venere; l'ossigeno che
//    avanza lo prende il ferro della crosta, che arrugginisce.
//  · Poi si tolgono le molecole più leggere di quelle che la gravità tiene (clima.tenuti), ogni gas
//    oltre la sua pressione di vapore (l'acqua piove o nevica; al freddo gelano l'ammoniaca, la CO2,
//    il metano, perfino l'azoto), e dove c'è un mare l'anidride carbonica oltre l'equilibrio di Urey
//    (diventa calcare) e l'anidride solforosa (si scioglie, diventa solfato).
// Dati misurati: quanta parte di C, N, S sta nei ghiacci insieme all'acqua (nelle comete: circa 0,3,
// 0,1 e 0,3 di quella del Sole; l'azoto è quasi tutto N2, che non congela) e il ferro che resta ossidato
// nei silicati (15%, sulla Terra); lo zolfo eruttato che torna quasi tutto nella crosta, come solfuri e
// solfati (in aria ne resta un millesimo: su Venere 150 parti per milione).
// Sotto 300 K le reazioni tra gas sono ferme: la miscela resta quella dell'ultima volta che ha reagito,
// e si prende 300 K (semplificazione dichiarata). La pressione totale è quella di clima(), non ricalcolata.
// → { gas: { formula: frazione }, riducente, potere (0…1), pressione (Pa: quella del clima, o meno se quasi
//     tutto è gelato), pO2 (bar), ferro (la forma stabile, da ferroStabile), fuliggine (parte del carbonio) }
export const NEI_GHIACCI = Object.freeze({ C: 0.3, N: 0.1, S: 0.3 }); const ZOLFO_IN_ARIA = 1e-3, FE_NEI_SILICATI = 0.15;
const ossigenoNellaRoccia = (ab) => ab.Mg + 2 * ab.Si + 1.5 * ab.Al + ab.Ca + (ab.Na + ab.K) / 2 + FE_NEI_SILICATI * ab.Fe;
// LA MISCELA DEL SOLE, in massa, dalla tavola degli elementi: è la fonte unica per chi fa i conti con la materia di una
// stella (il disco da cui nascono i pianeti, disco.js; i giganti di gas). X idrogeno, Y elio, Z tutto il resto (dei
// quindici elementi della tavola: con neon, argo e nichel, che qui non ci sono, il Sole arriva a 0,0134). Dei metalli:
//   roccia   la parte solida anche al caldo (magnesio, silicio, alluminio, calcio, sodio, potassio e ferro, con l'ossigeno che prendono);
//   ghiacci  ciò che è solido solo oltre la linea della neve: l'acqua che fa l'ossigeno rimasto, e il carbonio e l'azoto che
//            gelano insieme a lei (NEI_GHIACCI: gli stessi che poi fanno l'aria dei pianeti), contati come CO e NH3;
//   ferro    il ferro sulla somma di ferro e roccia; ghiaccio: la parte di ghiacci nei solidi oltre la neve.
export const SOLE = (() => {
  const ab = abbondanze(1), m = (el) => ab[el] * ELEMENTI[el].massa; let tutto = 0, metalli = 0;
  for (const el in ab) { tutto += m(el); if (el !== 'H' && el !== 'He') metalli += m(el); }
  const Oroccia = ossigenoNellaRoccia(ab), sassi = m('Mg') + m('Si') + m('Al') + m('Ca') + m('Na') + m('K') + Oroccia * ELEMENTI.O.massa, ferro = m('Fe');
  const acqua = (ab.O - Oroccia) * (ELEMENTI.O.massa + 2 * ELEMENTI.H.massa), altri = NEI_GHIACCI.C * ab.C * (ELEMENTI.C.massa + ELEMENTI.O.massa) + NEI_GHIACCI.N * ab.N * (ELEMENTI.N.massa + 3 * ELEMENTI.H.massa);
  return Object.freeze({ X: m('H') / tutto, Y: m('He') / tutto, Z: metalli / tutto, roccia: (sassi + ferro) / metalli, acqua: acqua / metalli, ghiacci: (acqua + altri) / metalli, ferro: ferro / (ferro + sassi), ghiaccio: (acqua + altri) / (acqua + altri + sassi + ferro) });
})();
export function atmosfera(P, { Z, inventario = false, co2 = 0, memoria = null, inerti = null, processato = 0 } = {}) {
  const cl = P.clima || {}, tenuti = cl.tenuti || [], gigante = P.tipo === 'gassoso', comp = P.composizione || {};
  const niente = { gas: {}, riducente: false, potere: 0, pressione: 0, pO2: 0, ferro: null, fuliggine: 0 };
  // CON L'INVENTARIO (è così che la chiama climaEAria, cioè ogni pianeta del cosmo) la pressione non è data: discende
  // da quanti gas il pianeta ha in superficie, meno ciò che fugge, gela, piove o finisce nel calcare (vedi più sotto)
  const conInventario = inventario && !gigante && P.massaKg > 0 && P.raggioM > 0;
  if (!gigante && (!tenuti.length || !(conInventario || cl.pressione > 0))) return niente; // un sasso nudo, come la Luna
  // un gigante È il suo idrogeno; per gli altri decide la gravità
  const tieneH = gigante || tenuti.includes('idrogeno'), massaMinima = gigante ? 0 : Math.min(...tenuti.map((g) => GAS_DEL_CLIMA[g] ?? Infinity));
  const dp = delPianeta(comp), z = Z ?? P.Z ?? P.metallicita ?? (comp.pesanti ? comp.pesanti / 0.02 : 1), sole = dp ? dp.stella : abbondanzeFisse(z), Oacqua = Math.max(0, sole.O - ossigenoNellaRoccia(sole)); // (la miscela della stella di QUESTO pianeta, se la si sa)
  // L'INVENTARIO di un pianeta solido. I gas arrivano con il ghiaccio (C, N, S in proporzione all'acqua, come nelle
  // comete) e ne esce in superficie la stessa parte che esce dell'acqua (PARTE_FUORI di leggi.js: il resto è nel
  // mantello). In più, se il disco gli ha lasciato un velo di idrogeno ed elio («involucro») e la gravità trattiene
  // l'idrogeno, quel velo è ancora lì: è l'aria primordiale, con la miscela della stella. Se non lo trattiene, è fuggito.
  const velo = conInventario && tenuti.includes('idrogeno') ? (P.involucro || 0) * P.massaKg : 0, primordiale = gigante || (conInventario ? velo > 0 : tieneH);
  let el, colonna = 0; // (kg/m²) quanta materia volatile c'è sopra ogni metro quadrato, se fosse tutta gas
  if (primordiale) { el = { H: sole.H, He: gigante || tenuti.includes('elio') ? sole.He : 0, C: sole.C, N: sole.N, O: Oacqua, S: sole.S }; colonna = velo / (4 * Math.PI * P.raggioM ** 2); }
  else {
    // acqua W, e i volatili in proporzione, la stessa per ogni metallicità: il ghiaccio è fatto degli
    // stessi atomi pesanti (anche una roccia asciutta ne porta un poco); il carbonio
    // arriva in media come CO (nei ghiacci: CO, CO2, metanolo, composti organici)
    // (con la catena degli elementi: W è la parte d'acqua dei ghiacci, e il carbonio e l'azoto per molecola d'acqua sono quelli dei
    // ghiacci di QUESTO pianeta, elementi.js: la stessa ricetta, la miscela della sua stella)
    // (con la catena degli elementi non c'è il pavimento di 0,001 — «anche una roccia asciutta ne porta un poco» —: quanto ne porta
    // lo dice il pianeta; e lo zolfo che esce non supera quello del suo mantello)
    const W = (comp.acqua ?? comp.ghiaccio ?? 0) * (comp.elementi?.quotaAcqua ?? 1), Wm = dp ? Math.max(W, 1e-15) : Math.max(W, 0.001), sol = dp ? dp.stella : abbondanzeFisse(1), V = Wm / (sol.O - ossigenoNellaRoccia(sol)), pa = comp.elementi?.ghiaccioPerAcqua;
    const C = pa ? pa.C * Wm : NEI_GHIACCI.C * sol.C * V, N = pa ? pa.N * Wm : NEI_GHIACCI.N * sol.N * V, S = Math.min(ZOLFO_IN_ARIA * NEI_GHIACCI.S * sol.S * V, dp && P.massaKg > 0 ? (dp.zolfoMoli * 0.018015) / P.massaKg : Infinity), secco = String(cl.acqua || '').startsWith('vapore');
    // IL CARBONIO DEL MANTELLO CHE I VULCANI HANNO PORTATO FUORI NELL'ETÀ DEL PIANETA («processato», kg: il mantello passato per la
    // zona di fusione dalla nascita a oggi, ∫ Ṁ_fuso/φ dt della storia termica, storia.js; il carbonio, incompatibile, esce tutto con
    // il fuso — la stessa legge del degassamento di storia.js e dei vulcani del ciclo —). Il mantello è un serbatoio ben mescolato:
    // ciò che fonde se ne va, e quello che resta si impoverisce, dC/dt = −C·(Ṁ_fuso/φ)/M_mantello: ne esce C₀·(1 − e^(−processato/M)),
    // mai più di quanto ne ha (Tajika e Matsui 1992; Sleep e Zahnle 2001). Esce come CO2, con il suo ossigeno. Dove c'è un mare la
    // pioggia lo rimette nel calcare (il tetto di Urey e del ciclo, più sotto); dove l'acqua non c'è più niente lo toglie: è l'aria di
    // Venere. Prima c'era solo il carbonio liberato con l'acqua alla nascita (PARTE_FUORI dei ghiacci)
    let Cvulcani = 0; if (conInventario && processato > 0 && dp?.rimasto?.C > 0 && dp.silicatoKg > 0) Cvulcani = (dp.rimasto.C * dp.silicatoKg * -Math.expm1(-processato / dp.silicatoKg) * 18.015e-3) / (PARTE_FUORI * P.massaKg); // (in unità di W: moli·18 g / la massa d'acqua fuori)
    const O = (secco ? Math.min(W + C, 2 * C + 2 * S) : W + C) + 2 * Cvulcani;
    // (chi trattiene l'idrogeno ma non ha un velo primordiale non perde l'idrogeno dei suoi ghiacci: l'aria resta riducente. Il
    // metano e l'ammoniaca che ne escono prendono idrogeno oltre a quello dell'acqua del mare: viene dall'acqua del mantello, che
    // il ferro dei magmi riduce a H2 — il libro dei conti di elementi.js lo prende da lì —)
    el = conInventario && tieneH ? { H: 2 * W, C: C + Cvulcani, N, O, S } : { H: secco ? 0 : Math.min(2 * W, 2 * Math.max(0, O - 2 * Cvulcani - 2 * C - 2 * S)), C: C + Cvulcani, N, O, S }; // il punto d'arrivo della fuga dell'idrogeno
    // la massa di quei volatili per ogni chilo d'acqua (acqua 18, e il resto contato come CO2, N2, SO2), e quanta ne sta fuori
    // (la massa è quella degli ATOMI che restano, elemento per elemento — el, nelle unità di W, cioè moli d'acqua per 18 g —: prima
    // si contavano il carbonio come CO2 e lo zolfo come SO2, con un ossigeno che l'inventario non ha, e la massa dell'idrogeno
    // fuggito restava agli altri gas; il libro dei conti di elementi.js lo ha visto: l'azoto dell'aria superava quello portato)
    if (conInventario) { let m = 0; for (const e in el) m += el[e] * ELEMENTI[e].massa; colonna = (PARTE_FUORI * P.massaKg * m) / 18.015 / (4 * Math.PI * P.raggioM ** 2); }
  }
  const gSup = conInventario ? gravitaDiSuperficie(P.massaKg, P.raggioM) : 0;
  const T = cl.T ?? 288, Tr = Math.min(3000, Math.max(300, T)), Pr = conInventario ? Math.max(colonna * gSup, 1) : isFinite(cl.pressione) ? Math.max(cl.pressione, 1) : cl.livello ?? LIVELLO_GIGANTI; // nei giganti: il livello di riferimento (leggi.js)
  // («memoria»: chi chiede molte arie dello stesso pianeta a temperature vicine non rifà ogni volta l'equilibrio)
  // (la chiave è ESATTA — temperatura, pressione ed elementi così come sono —: la memoria risparmia solo i conti identici
  // (lo stesso equilibrio chiesto con un'altra CO2 del ciclo, o due volte alla stessa temperatura) e non cambia mai il
  // risultato. Prima arrotondava la temperatura a 5 K: l'aria che restava era quella di una temperatura vicina)
  const chiaveEq = memoria ? `${Tr}|${Pr}|${Object.values(el).join(',')}` : null;
  const eq = (memoria && memoria.get(chiaveEq)) || equilibrio({ T: Tr, P: Pr, elementi: el, dettagli: true }), x = { ...eq.gas }; if (memoria) memoria.set(chiaveEq, eq);
  // (i gas troppo leggeri per restare se ne vanno, e con l'inventario si portano via la LORO massa: la colonna cala della loro
  // parte. Prima la colonna restava intera e si spartiva tra i gas rimasti: su un pianeta piccolo, che tiene solo azoto e CO2,
  // l'acqua fuggita diventava azoto, e il libro dei conti di elementi.js trovava nell'aria sette volte l'azoto portato fuori)
  { let tutta = 0, resta = 0; for (const f in x) { const m = x[f] * MOLECOLE[f].massa; tutta += m; if (MOLECOLE[f].massa < massaMinima * 0.99) delete x[f]; else resta += m; } if (conInventario && tutta > 0) colonna *= resta / tutta; }
  // i tetti (Pa): ogni gas fino alla sua pressione di vapore (il resto piove, nevica o brina); con un
  // mare, la CO2 fino all'equilibrio di Urey e niente SO2
  // («co2»: la pressione di CO2 che il termostato del carbonio lascia nell'aria, se supera quella dell'equilibrio: vedi climaEAria)
  // (PRESTAZIONI: dentro una stessa aria il tetto di un gas è sempre lo stesso numero — temperatura, mare e CO2 non cambiano —:
  // si calcola la prima volta che serve)
  const tettoDi = (f) => (cl.acqua === 'liquida' && f === 'SO2' ? 0 : Math.min(pressioneVapore(T, f), cl.acqua === 'liquida' && f === 'CO2' ? Math.max(pressioneCO2Urey(T), co2) : Infinity));
  const tetti = {}, tetto = (f) => { let t = tetti[f]; if (t === undefined) t = tetti[f] = tettoDi(f); return t; };
  // chi supererebbe il suo tetto si ferma lì; gli altri si dividono la pressione che resta. Se di altri
  // non ce n'è (tutto è gelato) resta solo un velo di vapori, ciascuno alla sua pressione
  const fermi = new Set(), p = {};
  if (conInventario) {
    // con l'inventario ciò che gela, piove o diventa calcare ESCE dall'aria, e la pressione cala: si tolgono moli al gas
    // che supera il suo tetto finché la sua pressione parziale (la sua parte di moli × il peso di tutta la colonna) ci sta
    const n = {}; let massa = 0; for (const f in x) massa += x[f] * MOLECOLE[f].massa;
    for (const f in x) n[f] = massa > 0 ? (x[f] * colonna) / massa : 0; // («moli» per m², a meno di un fattore: massa = Σ n·M)
    // I GAS SALITI DALL'INTERNO («inerti», in Pa: l'argon-40 del potassio decaduto e l'elio-4 delle α, da risalita.js
    // gasRadiogenici, già passati dal vaglio della gravità): si aggiungono a ciò che c'è. Sono gas nobili: non entrano
    // negli equilibri; pesano, allargano le righe degli altri, e al freddo l'argon gela come ogni altro gas (il suo tetto)
    if (inerti && gSup > 0) for (const f in inerti) if (inerti[f] > 0 && MOLECOLE[f]) n[f] = (n[f] || 0) + inerti[f] / gSup / MOLECOLE[f].massa;
    for (let giro = 0; giro < 60; giro++) {
      let N = 0, peso = 0, sopra = 0; for (const f in n) { N += n[f]; peso += n[f] * MOLECOLE[f].massa * gSup; }
      if (!(N > 0)) break;
      for (const f in n) { const pf = (n[f] / N) * peso, tt = tetto(f); if (pf > tt * 1.0001) { n[f] *= Math.max(1e-12, tt / pf); sopra++; } }
      if (!sopra) break;
    }
    let N = 0, peso = 0; for (const f in n) { N += n[f]; peso += n[f] * MOLECOLE[f].massa * gSup; }
    for (const f in n) p[f] = N > 0 ? (n[f] / N) * peso : 0;
  } else for (let giro = 0; giro < 12; giro++) {
    let liberi = 0, resto = Pr; for (const f in x) { if (fermi.has(f)) resto -= tetto(f); else liberi += x[f]; }
    const veri = liberi > 1e-6 && resto > 0; let nuovi = 0;
    for (const f in x) { p[f] = fermi.has(f) ? tetto(f) : veri ? (x[f] / liberi) * resto : 0; if (p[f] > tetto(f)) { fermi.add(f); nuovi++; } }
    if (!nuovi) break;
  }
  const pressione = Object.values(p).reduce((a, v) => a + v, 0);
  if (!(pressione > 0)) return niente;
  const gas = Object.fromEntries(Object.entries(p).map(([f, v]) => [f, v / pressione]).filter(([, v]) => v > 1e-12).sort((a, b) => b[1] - a[1]));
  const { rid, oss } = redox(gas), potere = potereRiducente(gas), pO2 = ((eq.gas.O2 || 0) * Pr) / 1e5;
  // riducente: l'idrogeno che l'aria può cedere supera quello che servirebbe a ridurla, e non è una traccia (almeno l'1%)
  return { gas, riducente: rid > oss && rid > 0.01, potere, pressione, pO2, ferro: ferroStabile(Tr, pO2), fuliggine: eq.grafite };
}

// ---------- 5 bis. L'EFFETTO SERRA DAI GAS VERI, E IL CLIMA CHE NE DISCENDE
// Lo spessore ottico dell'aria per l'infrarosso (la superficie irradia σT⁴/(1 + ¾τ): leggi.js). LEGGE EMPIRICA:
//   · i gas che assorbono l'infrarosso (tre o più atomi: acqua, anidride carbonica, metano, ammoniaca…): le loro righe
//     sono larghe quanto la pressione le allarga e presto si saturano: τ = k·(colonna × pressione)^0,39, con la
//     colonna del gas in kg/m² e la pressione in bar. L'esponente (un po' meno della radice, che è la legge delle
//     righe forti) e k della CO2 sono TARATI su Terra (τ = 0,2 con 6 kg/m²) e Venere (τ = 140 in tutto, 735 K);
//     k dell'acqua sulla Terra (in tutto τ = 0,83, 288 K), k del metano su Titano (94 K). Marte (un'aria di CO2
//     di 6 millibar) è il riscontro non usato per tarare: 214 K;
//   · i gas che non assorbono (N2, O2, H2, elio): solo durante gli urti tra molecole, quindi in proporzione a
//     colonna × pressione / temperatura, cioè a quanto l'aria è fitta (sulla Terra quasi niente; su Titano, fredda e
//     densa, metà della serra: il coefficiente è TARATO lì, a 94 K);
//   · il vapore d'acqua sta nei primi chilometri (più su fa freddo e condensa): la sua colonna è un quarto di quella
//     di un'aria satura fino in cima (sulla Terra: 25 kg/m²).
// Che cosa manca: le nuvole e le foschie che assorbono o riflettono (su Titano raffreddano), le finestre tra le righe.
export const SERRA = Object.freeze({ esponente: 0.39, H2O: 0.174, CO2: 0.103, CH4: 0.018, altri: 0.1, urti: 3.1e-6, Turti: 94, vaporeInBasso: 0.25 });
const TRASPARENTI = new Set(['H2', 'He', 'N2', 'O2', 'Cl2', 'S2', 'Ar']);
export function serra(gas = {}, pressione, g, T = SERRA.Turti) {
  if (!isFinite(pressione)) return 2;
  if (!(pressione > 0) || !(g > 0)) return 0;
  let media = 0; for (const f in gas) media += gas[f] * (MOLECOLE[f]?.massa ?? 0);
  if (!(media > 0)) return 0;
  let tau = 0;
  for (const f in gas) {
    if (!MOLECOLE[f]) continue;
    const colonna = ((gas[f] * MOLECOLE[f].massa) / media) * (pressione / g) * (f === 'H2O' ? SERRA.vaporeInBasso : 1), x = (colonna * pressione) / 1e5;
    tau += TRASPARENTI.has(f) ? (SERRA.urti * x * SERRA.Turti) / Math.max(T, 10) : (SERRA[f] ?? (Object.values(MOLECOLE[f].atomi).reduce((a, b) => a + b, 0) >= 3 ? SERRA.altri : SERRA.altri / 5)) * Math.pow(x, SERRA.esponente);
  }
  return tau;
}

// i gas dell'aria: la massa molare media (kg/mol) e il calore specifico (J/kg/K; per mole: 5/2 R un atomo solo, 7/2 R due
// atomi, 4 R tre o più: le rotazioni, senza le vibrazioni). Li usano i venti di meteo.js e il clima a fasce di leggi.js
// (se i gas non sono noti: l'aria di riserva, 0,029 kg/mol, e il calore specifico lasciato a chi chiama)
export function gasDellAria(gas = {}) {
  let n = 0, massa = 0, cpMol = 0; for (const f in gas) { const m = MOLECOLE[f]; if (!m || !(gas[f] > 0)) continue; const atomi = Object.values(m.atomi).reduce((x, y) => x + y, 0); n += gas[f]; massa += gas[f] * m.massa * 1e-3; cpMol += gas[f] * (atomi === 1 ? 2.5 : atomi === 2 ? 3.5 : 4) * R_GAS; }
  return n > 0 ? { massaMolare: massa / n, cp: cpMol / massa } : { massaMolare: 0.029, cp: null };
}
// IL CLIMA E L'ARIA INSIEME. La temperatura dipende dall'aria (quanta ce n'è, quanto trattiene il calore) e l'aria
// dalla temperatura (che cosa gela, che cosa piove, se c'è un mare che si mangia l'anidride carbonica): si cercano
// insieme, a giri alterni, finché non cambiano più. «dati» è ciò che serve a clima() di leggi.js (luce, distanza,
// massa, raggio, tipo, acqua, anno, asse, placche…) più composizione e involucro del pianeta; e, se ci sono: «calore»
// (W/m²: il calore dell'interno che alimenta i vulcani; accende il ciclo del carbonio), «magma» e «fusoMantello» (kg/anno:
// il magma e il mantello che fonde, dalla storia termica: se ci sono, i vulcani sono quelli), «inerti» (Pa: argon ed elio
// radiogenici saliti dall'interno, da risalita.js), «processato» (kg: il mantello passato per la zona di fusione nell'età del
// pianeta, dalla storia termica: il carbonio che i vulcani ne hanno portato fuori entra nell'inventario), «gas» (Pa: l'aria vera di un mondo vero, al posto dell'inventario).
// IL TERMOSTATO DEL CARBONIO. Dove c'è un mare la pioggia porta l'anidride carbonica nel calcare (Urey) e l'aria ne
// resta senza; ma se così il mare gela, la pioggia smette, i vulcani continuano, e la CO2 torna ad accumularsi
// finché il ghiaccio non si scioglie (Walker, Hays e Kasting 1981). Nessuno dei due stati sta fermo: il pianeta si
// assesta sulla MINIMA anidride carbonica che tiene il mare aperto. È quella che si cerca qui (clima.termostato).
// Se nemmeno tutta la CO2 che ha basta, il pianeta è gelato; se è troppo caldo anche senza, il mare bolle e l'acqua
// se ne va (Venere): tutta la CO2 resta nell'aria.
// → { clima, atmosfera }: clima.pressione è quella dell'aria vera e clima.tau la serra dei suoi gas.
// (entro quanto il ghiaccio messo nel ciclo del carbonio deve coincidere con quello che il clima ne dà: è la tolleranza
// dichiarata del punto fisso, in frazione della superficie)
export const CICLO = Object.freeze({ ghiaccio: 1e-3 });
// (il passo sopra la soglia del termostato: un terzo di CO2 in più, punto 3 di climaEAria)
export const TERMOSTATO = Object.freeze({ passo: 1.33 });
export function climaEAria(dati, { Z } = {}) {
  const P = { tipo: dati.tipo, massaKg: dati.massaKg, raggioM: dati.raggioM, composizione: dati.composizione || {}, involucro: dati.involucro || 0 };
  const primo = clima(dati); // (con le leggi di riserva: dice che cosa la gravità trattiene, e da che temperatura cominciare)
  if (dati.tipo === 'gassoso') return { clima: primo, atmosfera: atmosfera({ ...P, clima: primo }, { Z }) };
  // («dati.gas»: i gas che non condensano e non reagiscono, dati da chi chiama come pressioni in Pa ({ N2: 7.8e4, O2: 2.1e4 })
  // al posto dell'inventario del pianeta: serve a provare le leggi su un mondo vero con la sua aria vera. L'acqua (satura
  // sopra un mare, o al più quella data) e la CO2 sopra un mare (Urey, ciclo, termostato) restano calcolate qui)
  const ariaData = (T, stato, co2 = 0) => { let p = { ...dati.gas };
    // (gli inerti arrivano come peso della loro colonna, in Pa; la pressione parziale va con le moli: un gas più pesante
    // della media preme, a pari peso, di meno)
    if (dati.inerti) { let P0 = 0, m = 0; for (const f in p) { P0 += p[f]; m += p[f] * (MOLECOLE[f]?.massa ?? 29); } m = P0 > 0 ? m / P0 : 29; const n = {}; let N = 0, P1 = P0;
      for (const f in p) { n[f] = p[f] / m; N += n[f]; } for (const f in dati.inerti) if (dati.inerti[f] > 0 && MOLECOLE[f]) { const x = dati.inerti[f] / MOLECOLE[f].massa; n[f] = (n[f] || 0) + x; N += x; P1 += dati.inerti[f]; }
      p = {}; for (const f in n) p[f] = (n[f] / N) * P1; }
    if (stato === 'liquida') { p.H2O = pressioneVapore(T); p.CO2 = Math.min(p.CO2 ?? Infinity, Math.max(pressioneCO2Urey(T), co2)); } else for (const f in p) p[f] = Math.min(p[f], pressioneVapore(T, f));
    let pressione = 0; for (const f in p) pressione += p[f];
    return { gas: Object.fromEntries(Object.entries(p).filter(([, v]) => v > 0).map(([f, v]) => [f, v / pressione]).sort((a, b) => b[1] - a[1])), riducente: false, potere: 0, pressione, pO2: (p.O2 || 0) / 1e5, ferro: null, fuliggine: 0 }; };
  const memoria = new Map(), ariaDi = dati.gas ? ariaData : (T, stato, co2 = 0) => atmosfera({ ...P, clima: { ...primo, T, acqua: stato } }, { Z, inventario: true, co2, memoria, inerti: dati.inerti || null, processato: dati.processato || 0 });
  // (Taria: la temperatura a cui quell'aria è stata calcolata; a giri fermi è quella del clima)
  // (all'aria vera si accompagnano la sua massa molare e il suo calore specifico: entrano nel calore che l'aria porta, leggi.js)
  const climaDi = (atm, T) => Object.assign(clima({ ...dati, aria: { pressione: atm.pressione, tau: serra(atm.gas, atm.pressione, primo.g, T), ...gasDellAria(atm.gas) } }), { Taria: T });
  // con l'acqua in uno stato dato: l'aria a una temperatura, il clima che ne viene, l'aria a quella temperatura… finché si fermano
  // IL CICLO DEL CARBONIO (se chi chiama dà il calore dell'interno, «calore» in W/m²): sopra un mare l'anidride carbonica
  // non scende fino all'equilibrio di Urey (ci arriverebbe in un tempo infinito): si ferma dove le rocce consumate dalla
  // pioggia ne prendono quanta i vulcani ne emettono (co2DelCiclo, più sotto). È la stessa CO2 che sta sciolta nel mare:
  // aria e mare sono un serbatoio solo (mare.js legge questa pressione, e la ricalcola con le terre e le piogge vere).
  const ciclo = (T, c0) => (dati.calore > 0 && T > 273 ? 1e5 * co2DelCiclo({ T, calore: dati.calore, raggioM: dati.raggioM, massaKg: dati.massaKg, composizione: dati.composizione, terre: (1 - (c0?.mare ?? primo.mare ?? 0.7)) * (1 - (c0?.ghiaccio ?? 0)), mare: c0?.mare ?? primo.mare ?? 0.7, continenti: dati.placche ? 1 : 0, magma: dati.magma ?? null, fuso: dati.fusoMantello ?? null }) : 0);
  const cerca = (stato, T0, co2 = 0, giri = 5) => { let T = T0, r = null, cc = co2; for (let k = 0; k < (stato === 'liquida' && dati.calore > 0 ? giri + 3 : giri); k++) { if (stato === 'liquida') cc = Math.max(co2, ciclo(T, r?.c)); const a = ariaDi(T, stato, cc), c = climaDi(a, T); r = { a, c, co2: cc }; if (Math.abs(c.T - T) < 1) break; T = k < 2 ? c.T : (T + c.T) / 2; } if (r && stato === 'liquida' && cc > 0) r.c.co2Ciclo = cc; return r; };
  // SOPRA UN MARE temperatura, vapore e CO2 non si trovano a giri alterni: la CO2 che pareggia i vulcani cala di ordini di
  // grandezza in pochi gradi (e il vapore cresce col caldo), e i giri rimbalzano tra un'aria e un clima che non si corrispondono (un'aria calcolata a
  // 520 K accanto a un clima a 285 K; e quanti giri si fanno decide se il mare bolle). Si cerca invece la radice di una
  // funzione sola, g(T) = (temperatura del clima sotto l'aria che c'è a T, con la CO2 che il mare lascia a T: quella
  // del ciclo se ci sono vulcani, l'equilibrio di Urey se no) − T, salendo dal
  // gelo: il primo punto dove g passa da positiva a negativa è lo stato stabile (Walker, Hays e Kasting 1981: se fa più
  // caldo le rocce si consumano più in fretta, la CO2 cala, e torna il freddo). Se g è positiva fino in cima, il mare
  // bolle; se è negativa già al gelo, il mare gela (e decide il punto 3).
  const conIlMare = (co2 = 0) => {
    // (g dipende solo da T. Le terre che la pioggia consuma sono quelle fuori dal mare e dal ghiaccio; ma il ghiaccio
    // dipende dal clima, che dipende dalla CO2, che dipende dalle terre scoperte: più ghiaccio, meno rocce consumate, più
    // CO2, più caldo, meno ghiaccio. Dove conta si cerca, dimezzando, il ghiaccio che torna uguale a sé stesso)
    const terre0 = 1 - (primo.mare ?? 0.7), con = (T, ghiaccio) => { const cc = Math.max(co2, ciclo(T, { mare: primo.mare, ghiaccio })), a = ariaDi(T, 'liquida', cc), c = climaDi(a, T); return { a, c, co2: cc, T, d: c.T - T, m: ghiaccio }; };
    // IL GHIACCIO CHE TORNA UGUALE A SÉ STESSO. Con più ghiaccio le rocce coperte consumano meno CO2, che sale e lo scioglie:
    // il ghiaccio che il clima dà cala al crescere di quello messo nel ciclo, e il punto fisso è dove i due coincidono.
    // Si cerca dimezzando, finché coincidono entro CICLO.ghiaccio (un millesimo della superficie). Il ghiaccio del clima è
    // continuo (leggi.js lo conta con la stessa curva dell'albedo); se però salta proprio lì — l'instabilità del ghiaccio
    // e dell'albedo: tra un po' di ghiaccio e molto non c'è uno stato fermo, il pianeta oscilla (Menou 2015) — si resta a
    // cavallo del salto e lo si DICE: r.bilico (clima.cicloInBilico).
    // (Poiché il ghiaccio del clima cala al crescere di quello messo nel ciclo, il punto fisso sta sempre TRA i due: ogni
    // prova stringe l'intervallo da tutte e due le parti, e la temperatura dopo parte dal ghiaccio trovato a quella prima:
    // bastano una o due prove per temperatura invece di dieci.)
    let mPrima = 0;
    const g = (T) => { if (!(dati.calore > 0) || !(terre0 > 0.005)) return con(T, 0);
      let r = con(T, mPrima), lo = 0, hi = 1;
      for (let k = 0; k < 14 && Math.abs(r.c.ghiaccio - r.m) > CICLO.ghiaccio; k++) { const su = r.c.ghiaccio > r.m, altro = Math.min(1, Math.max(0, r.c.ghiaccio));
        if (su) { lo = Math.max(lo, r.m); hi = Math.min(hi, altro); } else { hi = Math.min(hi, r.m); lo = Math.max(lo, altro); }
        if (!(hi > lo)) { const m = Math.max(lo, hi); lo = Math.min(lo, hi); hi = m; } // (i due capi si sono scavalcati: il ghiaccio salta lì)
        r = con(T, 0.5 * (lo + hi)); }
      if (Math.abs(r.c.ghiaccio - r.m) > 10 * CICLO.ghiaccio) r.bilico = true; mPrima = r.m; return r; };
    // ciò che resta scritto nel clima quando c'è il ciclo: la sua CO2, il ghiaccio con cui è stata calcolata (uguale a
    // clima.ghiaccio entro CICLO.ghiaccio se il punto fisso c'è) e se il ciclo è in bilico
    const segna = (r) => { if (dati.calore > 0) { r.c.co2Ciclo = r.co2; r.c.ghiaccioDelCiclo = r.m; if (r.bilico) r.c.cicloInBilico = true; } return r; };
    let sotto = g(273.5), sopra = null;
    if (!(sotto.d > 0)) { // più freddo di 273,5 K con l'aria di 273,5 K: gelato… a meno che lo stato fermo stia tra il gelo e 273,5 K
      const alGelo = dati.calore > 0 && sotto.c.T >= 273.15 ? g(273.16) : null; if (!alGelo || !(alGelo.d > 0)) return segna(sotto); // (gelato anche con la CO2 che il ciclo lascia al gelo)
      sopra = sotto; sotto = alGelo; }
    // (si sale fino al punto critico dell'acqua, 647 K: fin lì sotto abbastanza pressione un mare può esserci. Fermandosi a
    // 640 K i mari più caldi uscivano con l'aria fatta a 640 K e il clima qualche grado sopra: una coppia non cercata)
    if (!sopra) for (const T of [280, 290, 300, 315, 335, 360, 390, 430, 480, 540, 600, 640, ACQUA.critica - 0.5]) { const r = g(T); if (r.d <= 0) { sopra = r; break; } sotto = r; if (r.c.acqua.startsWith('vapore')) break; }
    if (!sopra) return segna(sotto); // (più caldo a ogni temperatura: il mare bolle)
    // (con il ciclo del carbonio la CO2 cambia del 10% in pochi decimi di grado: lì la temperatura si stringe dieci volte di più)
    const fino = dati.calore > 0 ? 0.03 : 0.3;
    for (let k = 0; k < 16 && sopra.T - sotto.T > fino; k++) { const r = g(0.5 * (sotto.T + sopra.T)); if (r.d > 0) sotto = r; else sopra = r; }
    // (se i due capi non si incontrano — sotto, il clima è ancora più caldo dell'aria di oltre un grado; un filo sopra, il
    // mare non c'è più — lì non c'è una coppia ferma: il mare si scalda finché bolle, o passa il punto critico. Si dà il
    // capo senza mare, e chi chiama prosegue da «troppo caldo». Prima restava un mare con l'aria fatta sei gradi sotto il suo clima)
    if (sotto.d > 1 && sopra.c.acqua.startsWith('vapore')) return segna(sopra);
    const r = Math.abs(sotto.d) < Math.abs(sopra.d) ? sotto : sopra;
    // (IN BILICO SENZA UNA COPPIA: il ciclo non ha un ghiaccio che torni uguale a sé stesso — più ghiaccio, meno rocce consumate,
    // più CO2, niente ghiaccio — e i due capi della ricerca, a pochi centesimi di grado, restano uno più caldo e uno più freddo
    // dell'aria di oltre un grado (la stessa misura di «cerca»: |T del clima − T dell'aria| < 1). Un mare fermo lì non c'è: è
    // l'oscillazione tra il gelo e il disgelo del termostato (Walker, Hays e Kasting 1981; Menou 2015), e la CO2 che il pianeta
    // tiene è la minima che riapre il mare: decide il punto 3. Prima restava il capo più vicino, un mare con l'aria fatta a 275 K
    // e il clima a 282–286 K, che non era né l'uno né l'altro)
    if ((sotto.bilico || sopra.bilico) && !(Math.abs(r.d) < 1)) { const s = segna(r); s.senzaCoppia = true; return s; }
    return segna(r);
  };
  const esce = (r, altro = {}) => ({ clima: Object.assign(r.c, altro), atmosfera: r.a });
  if (!(dati.acqua > 0)) return esce(cerca('assente', primo.T));
  // 0. un mondo di ghiaccio è nato al freddo, oltre la linea della neve, e non è mai stato caldo abbastanza a lungo da
  // tenere nell'aria i suoi ghiacci (acqua, anidride carbonica, ammoniaca, metano): se da gelato sta in equilibrio,
  // gelato è. (Un pianeta di roccia nasce caldo: per lui si parte dal mare, e gelato è solo se non può fare altro.)
  if (dati.tipo === 'ghiacciato') { const gelo = cerca('ghiaccio', Math.min(primo.T, 150)); if (gelo.c.acqua === 'ghiaccio') return esce(gelo); }
  // 1. con il mare liquido (e quindi senza anidride carbonica nell'aria)
  const mare = conIlMare();
  if (mare.c.acqua === 'liquida' && !mare.senzaCoppia) return esce(mare);
  // 2. troppo caldo: il mare non c'è, l'acqua è persa, tutta la CO2 è nell'aria
  // (l'aria è quella di un mondo che l'acqua l'ha persa: lo stato resta «vapore» anche se poi, asciutto, si assesta a una
  // temperatura e a una pressione a cui l'acqua, se ci fosse ancora, sarebbe liquida)
  if (mare.c.acqua.startsWith('vapore')) { const secco = cerca('vapore', mare.c.T); return esce(secco, secco.c.acqua.startsWith('vapore') ? {} : { acqua: 'vapore' }); }
  // 3. il mare gela: il termostato. Con tutta la CO2 che ha, si scioglie? Se sì, si cerca la minima che basta
  const prova = (co2) => { const a = ariaDi(275, 'liquida', co2), c = climaDi(a, 275); return { a, c, co2 }; };
  const tutta = prova(1e12);
  if (tutta.c.acqua !== 'ghiaccio') {
    let lo = Math.log(pressioneCO2Urey(275)), hi = Math.log(Math.max(1, (tutta.a.gas.CO2 || 0) * tutta.a.pressione)), scelto = tutta.c.acqua === 'liquida' ? tutta : null, gelo = null;
    // (con «tutta» la CO2 nell'aria è tutta quella che il pianeta ha, exp(hi), non i 10¹² Pa chiesti: è quella che si scrive. Prima,
    // se ogni prova a metà gelava, restava scritto 10¹²·1,33 Pa come CO2 del termostato, sopra un gelo a ~10⁶ Pa)
    if (tutta.co2 > Math.exp(hi)) tutta.co2 = Math.exp(hi);
    let disgelo = tutta; // (il capo di sopra della ricerca: la CO2 più bassa provata a cui il mare non è gelato, e com'è lì)
    // (il ghiaccio che sublima sotto un'aria troppo sottile per il liquido — «vapore (il ghiaccio sublima…)», sotto il punto
    // triplo — non è un disgelo: sta dalla parte del gelo, e la ricerca cerca la CO2 a cui l'acqua diventa davvero liquida, o bolle)
    const gelato = (c) => c.acqua === 'ghiaccio' || c.acqua.startsWith('vapore (');
    for (let k = 0; k < 7; k++) { const m = (lo + hi) / 2, r = prova(Math.exp(m)); if (gelato(r.c)) { lo = m; gelo = r; } else { hi = m; disgelo = r; if (r.c.acqua === 'liquida') scelto = r; } }
    // (la CO2 sale piano dai vulcani finché il ghiaccio cede: ciò che accade è quello del PRIMO disgelo, il capo di sopra. Se lì,
    // senza il ghiaccio, il pianeta assorbe più luce di quanta un'aria satura di vapore possa irradiare (LIMITE_VAPORE, 282 W/m²:
    // il limite di Simpson e Nakajima, il bordo interno di Kasting 1993 e Kopparapu e altri 2013), o il mare evapora tutto, la serra
    // del vapore non torna indietro: senza mare la pioggia non consuma più rocce, la CO2 resta, e l'idrogeno del vapore fugge.
    // Fuga limitata dall'energia (Watson, Donahue e Walker 1981), ε = 0,15, con la luce ultravioletta di una stella come il Sole
    // integrata sull'età (Ribas e altri 2005: ~6·10¹⁵ J/m² a 1 UA in 4,5 miliardi di anni): un pianeta come la Terra perde così
    // ~2·10²¹ kg d'idrogeno, l'idrogeno di dieci oceani. Il pianeta perde l'acqua come al punto 2 — non resta con il mare che gli
    // darebbe una CO2 enorme, più su. (Prima valeva per ogni «vapore», anche per quello di un'aria troppo sottile per l'acqua
    // liquida, sotto il punto triplo, a 200 K: lì il ghiaccio non si scioglie affatto, non perde l'acqua; la CO2 continua a salire
    // finché il mare si apre davvero. Su 1495 pianeti di roccia delle prime 400 stelle della galassia 0 del cosmo 1 la regola
    // scattava su tre: uno oltre il limite del vapore, che resta senz'acqua, e due di 0,02 masse terrestri a 205 K e 4–8 Pa.)
    if (disgelo.c.acqua === 'vapore') { const secco = cerca('vapore', disgelo.c.T); return esce(secco, secco.c.acqua.startsWith('vapore') ? {} : { acqua: 'vapore' }); }
    if (disgelo.c.acqua === 'liquida') scelto = disgelo;
    // (proprio sulla soglia il mare è in bilico e ci mette un'eternità ad assestarsi: il pianeta sta un passo sopra, un terzo di CO2 in più)
    // (resta scritto anche il capo gelato della ricerca: la CO2 più alta provata a cui il mare gela, con la sua temperatura, e
    // la larghezza della forchetta: la legge del termostato dice che la CO2 lasciata sta tra il gelo e gelo·forchetta·1,33, e
    // il salto di temperatura tra i due capi è quello del ghiaccio che sparisce, che scalda da sé)
    if (scelto) { const sopra = prova(scelto.co2 * TERMOSTATO.passo); if (sopra.c.acqua === 'liquida') scelto = sopra; gelo ||= prova(Math.exp(lo)); // (il capo di sotto, se la ricerca non l'ha provato: la CO2 dell'equilibrio di Urey)
      return esce(scelto, { termostato: scelto.co2, termostatoGelo: Math.exp(lo), termostatoForchetta: Math.exp(hi - lo), termostatoPasso: TERMOSTATO.passo, termostatoGeloT: gelo.c.T, termostatoGeloAcqua: gelo.c.acqua }); }
  }
  // 4. gelato: nemmeno tutta la sua anidride carbonica (che al freddo gela anche lei) lo scioglie
  return esce(cerca('ghiaccio', Math.min(mare.c.T, 270)));
}

// ---------- 6. I MINERALI DELLA SUPERFICIE E IL LORO COLORE
// LA ROCCIA. (Un pianeta di sistema() ha il SUO mantello e la SUA crosta, dalla catena degli elementi: delPianeta e
// crostaDiPianeta qui sopra. Ciò che segue vale per i pianeti fatti a mano.) Il mantello ha gli atomi nelle proporzioni del Sole (magnesio, silicio, alluminio, calcio;
// sodio e potassio, volatili, in parte persi; il ferro quasi tutto sceso nel nucleo). La crosta è ciò che
// fonde per primo: nel fuso ogni elemento si concentra secondo la legge della fusione parziale,
//     nel fuso / nella roccia = 1 / (D + F·(1 − D)),
// F la parte che fonde, D quanto l'elemento preferisce restare nel solido (il magnesio resta, il
// potassio scappa). Una fusione del mantello dà il basalto, scuro, dei fondali e dei mondi senz'acqua;
// una seconda fusione del basalto, che avviene solo con l'acqua, dà il granito chiaro dei continenti.
// I MINERALI sono quelli che gli atomi permettono (la «norma» dei petrologi): potassio e sodio fanno i
// feldspati con l'alluminio, il calcio il plagioclasio; magnesio e ferro prendono la silice che resta:
// se basta fanno pirosseno (un silicio per atomo), se avanza c'è quarzo, se manca olivina (mezzo
// silicio per atomo). Più magnesio rispetto al silicio, più olivina.
// IL FERRO segue l'ossigeno: senza, resta metallo; con poco è ferroso, dentro i silicati (che scurisce);
// con molto è ferrico: magnetite nera (FeO·Fe2O3) finché c'è ferro ferroso, poi ematite rossa.
// Sotto 170 K il ghiaccio non sublima nemmeno nel vuoto: copre la superficie. Dove l'acqua c'era ed è
// evaporata restano i suoi sali.
// Dati misurati: i coefficienti D (valori d'insieme, tarati perché il mantello della Terra dia il
// basalto dei fondali e questo il granito), F = 10% e 20%, sodio e potassio rimasti
// (un quarto), la copertura di mari, ghiacci e sali (stima semplice, tarata sui mari della Terra),
// i sali dei mari terrestri (85% salgemma, 15% gesso), i colori dei minerali in polvere (sRGB).
export const D_MANTELLO = Object.freeze({ Si: 0.88, Mg: 5.4, Fe: 0.75, Al: 0.21, Ca: 0.24, Na: 0.05, K: 0.002 }), F_BASALTO = 0.1;
export const D_BASALTO = Object.freeze({ Si: 0.63, Mg: 13, Fe: 4.6, Al: 1.08, Ca: 7.6, Na: 0.70, K: 0.01 }), F_GRANITO = 0.2;
const VOLATILI_RIMASTI = 0.25, FERRO_TERRA = 0.33, CONTINENTI = 0.3;
const fondi = (roccia, D, F) => Object.fromEntries(Object.entries(roccia).map(([e, v]) => [e, v / (D[e] + F * (1 - D[e]))]));
// i colori: per olivina e pirosseno dal termine di magnesio (chiaro) a quello di ferro (scuro)
const COLORI = {
  olivina: [[140, 152, 86], [74, 66, 44]], pirosseno: [[146, 142, 124], [46, 48, 42]], plagioclasio: [206, 204, 197],
  'feldspato potassico': [218, 186, 168], quarzo: [226, 222, 214], periclasio: [228, 226, 218], 'ferro metallico': [118, 118, 122],
  magnetite: [38, 38, 42], ematite: [152, 62, 42], 'ghiaccio d\'acqua': [232, 238, 244], salgemma: [240, 236, 228], gesso: [236, 230, 218],
};
const FORMULE = { olivina: '(Mg,Fe)2SiO4', pirosseno: '(Mg,Fe,Ca)SiO3', plagioclasio: 'NaAlSi3O8–CaAl2Si2O8', 'feldspato potassico': 'KAlSi3O8', quarzo: 'SiO2', periclasio: '(Mg,Fe)O', 'ferro metallico': 'Fe', magnetite: 'Fe3O4', ematite: 'Fe2O3', 'ghiaccio d\'acqua': 'H2O', salgemma: 'NaCl', gesso: 'CaSO4·2H2O' };
// la norma di una roccia (atomi) con il suo ferro al grado di ossidazione o → masse dei minerali
function norma(r, o) {
  const metallo = r.Fe * Math.max(0, 1 - 2 * o), ferrico = r.Fe * Math.max(0, 2 * o - 1); let ferroso = r.Fe - metallo - ferrico;
  const mt = Math.min(ferrico / 2, ferroso), em = (ferrico - 2 * mt) / 2; ferroso -= mt;
  let { Si, Al, Ca } = r; const Mg = r.Mg;
  const or = Math.min(r.K, Al, Si / 3); Al -= or; Si -= 3 * or;
  const ab = Math.min(r.Na, Al, Si / 3); Al -= ab; Si -= 3 * ab;
  const an = Math.min(Ca, Al / 2, Si / 2); Ca -= an; Si -= 2 * an;
  let M = Mg + ferroso; const xFe = M > 0 ? ferroso / M : 0, di = Math.min(Ca, M, Si / 2); M -= di; Si -= 2 * di; // il calcio che avanza entra nel pirosseno
  const px = Si >= M ? M : Math.max(0, 2 * Si - M), ol = Si >= M ? 0 : Math.min(M - Si, Si), qz = Math.max(0, Si - M), ossido = Math.max(0, M - px - 2 * ol);
  const mFe = ELEMENTI.Fe.massa - ELEMENTI.Mg.massa, m = (f) => massaDi(f);
  return { xFe, masse: {
    'feldspato potassico': or * m('KAlSi3O8'), plagioclasio: ab * m('NaAlSi3O8') + an * m('CaAl2Si2O8'),
    pirosseno: di * (m('CaMgSi2O6') + xFe * mFe) + px * (m('MgSiO3') + xFe * mFe), olivina: ol * (m('Mg2SiO4') + 2 * xFe * mFe),
    quarzo: qz * m('SiO2'), periclasio: ossido * (m('MgO') + xFe * mFe), 'ferro metallico': metallo * m('Fe'), magnetite: mt * m('Fe3O4'), ematite: em * m('Fe2O3'),
  } };
}
// composizione: quella del pianeta ({ ferro, roccia, acqua } o { ghiaccio, roccia, ferro }; in più, se
//   si vuole, MgSi = atomi di magnesio per atomo di silicio: nel Sole 1,23);
// ossidato: vero/falso, o un grado tra 0 (ferro metallico) e 1 (tutto ferrico): falso vale 0,4 (ferro
//   ferroso nei silicati e un po' di metallo, come nel suolo della Luna e nelle meteoriti), vero vale 1;
//   si può passare ferroStabile(T, pO2).grado;
// acqua: lo stato dell'acqua come lo dà clima() ('liquida', 'ghiaccio', 'vapore…', 'assente'), oppure
//   vero (c'è) / falso (non c'è più: se la composizione ne aveva, è evaporata);
// continente: quanta parte della crosta è granito (0…1); se manca, 0,3 dove c'è acqua, 0 altrimenti;
// fusione: quanta parte del mantello fonde per fare la crosta (0,1 se manca; un interno più caldo fonde
//   di più e dà lave più ricche di magnesio e di olivina; 1 = la roccia del mantello così com'è).
// → [{ nome, formula, frazione (in massa, somma 1), colore: [r, g, b] }], dal più abbondante
export function minerali({ composizione = {}, T = 288, ossidato = false, acqua, continente, fusione = F_BASALTO } = {}) {
  const w = composizione.acqua ?? composizione.ghiaccio ?? (acqua === true ? 0.02 : 0), stato = typeof acqua === 'string' ? acqua : '';
  const ce = w > 0 && acqua !== false && stato !== 'assente', evaporata = w > 0 && T >= 170 && (acqua === false || stato === 'evaporata' || stato.startsWith('vapore'));
  const o = ossidato === true ? 1 : !ossidato ? 0.4 : Math.min(1, Math.max(0, +ossidato));
  const fe = composizione.ferro ?? 0.32, sassi = composizione.roccia ?? 1 - fe, sole = abbondanzeFisse(1), su = (e) => sole[e] / sole.Si;
  const mantello = delPianeta(composizione)?.mantello ?? { Si: 1, Mg: composizione.MgSi ?? su('Mg'), Fe: (FE_NEI_SILICATI * su('Fe') * (fe / (fe + sassi))) / FERRO_TERRA, Al: su('Al'), Ca: su('Ca'), Na: VOLATILI_RIMASTI * su('Na'), K: VOLATILI_RIMASTI * su('K') }; // (quello di QUESTO pianeta, se lo si sa)
  const basalto = fondi(mantello, D_MANTELLO, Math.min(1, Math.max(0.01, fusione))), cont = Math.min(1, Math.max(0, continente ?? (w > 0.005 ? CONTINENTI : 0)));
  const copre = Math.min(0.95, w / (w + 0.01)), ghiaccio = ce && (T < 170 || stato === 'ghiaccio') ? copre : 0, sali = evaporata ? 0.25 * copre : 0;
  const parti = {}, metti = (nome, f, colore) => { if (f > 1e-9) { parti[nome] ??= { f: 0, c: [0, 0, 0] }; const p = parti[nome]; p.c = p.c.map((v, i) => (v * p.f + colore[i] * f) / (p.f + f)); p.f += f; } };
  for (const [roccia, quota] of [[basalto, 1 - cont], [cont > 0 ? fondi(basalto, D_BASALTO, F_GRANITO) : basalto, cont]]) {
    if (!(quota > 0)) continue;
    const { masse, xFe } = norma(roccia, o), tot = Object.values(masse).reduce((a, v) => a + v, 0), scuro = Math.min(1, 2 * xFe); // mezzo ferro basta a farli quasi neri
    for (const nome in masse) { const c = COLORI[nome]; metti(nome, (masse[nome] / tot) * quota * (1 - ghiaccio - sali), Array.isArray(c[0]) ? c[0].map((v, i) => v + (c[1][i] - v) * scuro) : c); }
  }
  metti('ghiaccio d\'acqua', ghiaccio, COLORI['ghiaccio d\'acqua']); metti('salgemma', 0.85 * sali, COLORI.salgemma); metti('gesso', 0.15 * sali, COLORI.gesso);
  const somma = Object.values(parti).reduce((a, p) => a + p.f, 0);
  return Object.entries(parti).map(([nome, p]) => ({ nome, formula: FORMULE[nome], frazione: p.f / somma, colore: p.c.map(Math.round) })).sort((a, b) => b.frazione - a.frazione);
}
// il colore di una roccia fatta di più minerali. Non è la media dei colori: in una polvere la luce
// rimbalza tra i grani e basta poco di un minerale scuro per assorbirla (poca ematite arrossa tutto
// Marte). Legge di Kubelka-Munk: ciò che si somma è il rapporto tra assorbimento e diffusione,
// K/S = (1 − R)² / 2R, con R la luce riflessa in ciascun colore. → [r, g, b]
export function coloreRoccia(lista = []) {
  const tot = lista.reduce((a, m) => a + m.frazione, 0); if (!(tot > 0)) return [0, 0, 0];
  return [0, 1, 2].map((i) => {
    let ks = 0; for (const m of lista) { const R = Math.max(1e-4, Math.pow(m.colore[i] / 255, 2.2)); ks += (m.frazione / tot) * ((1 - R) ** 2) / (2 * R); }
    return Math.round(255 * Math.pow(1 + ks - Math.sqrt(ks * ks + 2 * ks), 1 / 2.2));
  });
}

// ---------- 7. LA CHIMICA CHE PREPARA LA VITA
// LEGGE EMPIRICA (non calcolata). Fulmini e luce ultravioletta spezzano le molecole dell'aria; i pezzi
// si ricombinano in acido cianidrico (HCN, da cui amminoacidi e basi) e formaldeide (H2CO, da cui gli
// zuccheri). Gli esperimenti dicono che la resa dipende da quanto l'aria è riducente: con metano,
// ammoniaca e idrogeno (Miller e Urey 1953) è alta; con anidride carbonica e azoto senza idrogeno è
// centinaia o migliaia di volte più bassa, e risale quando H2 supera CO2 (Schlesinger e Miller 1983;
// Stribling e Miller 1987). Qui: una curva a saturazione nel potere riducente, con gli ordini di
// grandezza di quegli esperimenti (pavimento 1/1000 per HCN, 3/1000 per la formaldeide, che un poco si
// forma anche da CO2 e acqua alla luce: Pinto e altri 1980), per gli ingredienti che ci sono: carbonio
// e azoto per HCN; carbonio, ossigeno e idrogeno per H2CO. Idrogeno ed elio non assorbono l'ultravioletto:
// l'energia la prendono gli altri gas, e contano le proporzioni tra quelli.
// AUTOCATALISI: la reazione del formosio (Butlerov 1861; il ciclo di Breslow 1959), in cui la
// formaldeide diventa zuccheri che aiutano altra formaldeide a diventarlo, chiede tre cose: formaldeide,
// acqua liquida, e un minerale basico che la avvii (calcio o magnesio: olivina, pirosseno, plagioclasio).
// atmosfera: il risultato di atmosfera(), o solo { formula: frazione }; energia: 1 = quella di riferimento;
// in più, se si vuole: pressione (Pa), acqua (lo stato, come da clima), minerali (la lista di minerali();
// se manca si suppone una crosta di basalto, che i minerali basici li ha sempre).
// → { HCN, formaldeide (tassi relativi: 1 = il massimo a energia 1), potere, acquaLiquida, basico, autocatalisi }
const RESA_OSSIDATA = { HCN: 1e-3, formaldeide: 3e-3 }, MEZZA_RESA = 0.3, SOGLIA_FORMOSIO = 0.01, BASICI = ['olivina', 'pirosseno', 'plagioclasio', 'periclasio'];
export function prebiotica({ atmosfera: atm = {}, T = 288, energia = 1, pressione, acqua, minerali: lista = null } = {}) {
  const gas = atm.gas || atm, potere = potereRiducente(gas), curva = ((potere * potere) / (potere * potere + MEZZA_RESA ** 2)) * (1 + MEZZA_RESA ** 2);
  let attivi = 0, c = 0, n = 0, ox = 0, h = (gas.H2 || 0) > 0.01 ? Infinity : 0;
  for (const f in gas) { const a = MOLECOLE[f]?.atomi; if (!a || f === 'H2' || f === 'He') continue; attivi += gas[f]; c += (a.C || 0) * gas[f]; n += (a.N || 0) * gas[f]; ox += (a.O || 0) * gas[f]; h += (a.H || 0) * gas[f]; }
  const ingredienti = (...q) => (attivi > 0 ? Math.min(1, (2 * Math.min(...q)) / attivi) : 0), resa = (k) => RESA_OSSIDATA[k] + (1 - RESA_OSSIDATA[k]) * curva;
  const HCN = energia * resa('HCN') * ingredienti(c, n), formaldeide = energia * resa('formaldeide') * ingredienti(c, ox, h);
  const acquaLiquida = (acqua ?? statoAcqua(T, pressione ?? atm.pressione ?? 1e5)) === 'liquida' && (acqua === 'liquida' || (gas.H2O || 0) > 0);
  const basico = lista ? lista.some((m) => BASICI.includes(m.nome) && m.frazione > 0.01) : true;
  return { HCN, formaldeide, potere, acquaLiquida, basico, autocatalisi: formaldeide >= SOGLIA_FORMOSIO && acquaLiquida && basico };
}

// ---------- 8. LE ROCCE CHE LA PIOGGIA CONSUMA, E IL CICLO DEL CARBONIO
// (È la fonte unica per l'aria e per il mare: climaEAria qui sopra e mare.js usano queste stesse funzioni.)
// LA ROCCIA. Mantello, basalto e granito sono quelli del §6 (stessi coefficienti), in moli per chilo; ogni elemento sta
// nel minerale che la norma gli assegna. In più ciò che il mantello ha tenuto di cloro, zolfo e carbonio rispetto alle
// proporzioni del Sole: DATI MISURATI sul mantello primitivo della Terra (McDonough e Sun 1995: Cl 17 ppm, S 250 ppm,
// C 120 ppm). (Per un pianeta di sistema() quelli del SUO silicato: delPianeta.)
// QUANTO SE NE SCIOGLIE. LEGGE EMPIRICA: nei suoli veri i silicati (plagioclasio, feldspato potassico, anfibolo, mica),
// invecchiando, si sciolgono tutti alla stessa velocità entro un fattore tre, e sempre più piano:
// v = 3,1·10⁻¹³·t^−0,61 mol/m²/s, con t l'età del suolo in anni (White e Brantley 2003, da suoli tra dieci e tre milioni
// di anni), per unità di superficie misurata col gas (1 m²/g nei suoli: White e altri 1996). Il laboratorio dice come
// quella velocità cambia con la temperatura e con l'acidità (Palandri e Kharaka 2004, USGS OFR 2004-1068): un termine
// «neutro» e uno «acido», v ∝ k_n + k_a·[H⁺]^n, ciascuno con la sua energia di attivazione (Arrhenius), minerale per
// minerale; il riferimento sono le condizioni in cui i suoli sono stati misurati (15 °C, pioggia in equilibrio con
// l'aria di allora). L'acqua del suolo è pioggia in equilibrio con l'anidride carbonica: [H⁺] = √(K·pCO2), con
// CO2 + H2O ⇌ H⁺ + HCO3⁻ (log K = −7,82 a 25 °C, ΔH = −10,6 kJ/mol): più CO2, più acido, rocce consumate più in
// fretta. Il granello resta nel suolo finché l'erosione non lo porta via: spessore del suolo / denudazione (1 m; 30 m
// per milione di anni dove piove: la stessa legge empirica di geologia.js).
// IL CICLO. I vulcani emettono l'anidride carbonica del mantello che fonde (il magma porta un decimo del calore
// dell'interno; il carbonio sta tutto nel fuso: sulla Terra ne escono così 8·10¹² mol l'anno, misurate 6-10). Ogni
// carica di catione che la pioggia scioglie dai silicati ne porta via una molecola, che finisce nel calcare. A regime
// le due cose si pareggiano (Walker, Hays e Kasting 1981): co2DelCiclo cerca la pressione di CO2 a cui succede.
// IL FONDO DEL MARE CONSUMA ANCHE LUI (Brady e Gíslason 1997; Coogan e Gillis 2013; Krissansen-Totton e Catling 2017 [KC],
// Nat. Commun. 8, 15423, eq. 11-13; Krissansen-Totton, Arney e Catling 2018 [KAC], PNAS 115, 4105, SI eq. S3-S4, S22-S23 — rilette
// sui PDF l'11-2026). L'acqua che circola nella crosta giovane scioglie il basalto, e i cationi che ne escono fanno carbonato
// nei pori: F = k·(crosta nuova)·exp(−E/R·(1/T_pori − 1/T_pori,oggi))·([H⁺]_pori/[H⁺]_pori,oggi)^γ. Il pozzo non vede le terre:
// c'è anche su un mondo d'acqua senza un'isola. Numeri (scelti prima di provare, dalle fonti):
//  · oggi 0,45·10¹² mol C/anno (KAC 2018 tab. S2: precipitazione nei pori 0,45 Tmol C/anno; dissoluzione = x·quella, x 0,5-1,5:
//    qui 1), per la crosta che le dorsali fanno oggi, 21 km³/anno di 2900 kg/m³ (Crisp 1984): 7,4·10⁻³ mol C per kg di crosta;
//    la crosta nuova di un pianeta è il suo magma (vulcani(), più sotto);
//  · E = 92 ± 7 kJ/mol, misurata sulla crosta alterata (Coogan e Dosso 2015; KC 2017 la trovano tra 53 e 97);
//  · γ = 0,27 (KC 2017, mediana a posteriori; a priori 0-0,5); [H⁺] dei pori ∝ pCO2^(1/1,34) (KAC 2018 eq. S22-S23): il pozzo
//    va come pCO2^0,20 — debole, come Brady e Gíslason;
//  · T del fondo = 1,02·T + 274,037 − 1,02·285 (KC 2017 eq. 12, dai modelli accoppiati e dai fossili), mai sotto il gelo
//    dell'acqua di mare; i pori 9 K più caldi oggi, in proporzione al calore che sale (KAC 2018 eq. S4, legge di Fourier con lo
//    spessore dei sedimenti di oggi; 0,087 W/m² il calore della Terra: Pollack e altri 1993);
//  · il TETTO DELLA ROCCIA (supply limit): il carbonato non può prendere più calcio, magnesio e ferro di quanti ne ha la parte
//    della crosta che l'acqua raggiunge, le lave di sopra: un sesto del magma (Crisp 1984). Il pozzo va verso quel tetto come
//    la roccia che si scioglie nel suolo, 1 − exp(−cinetica/tetto).
//  · Il fondo è sotto il mare: conta la parte del pianeta coperta d'acqua.
// Che cosa manca: l'effetto della pioggia (qui le terre bagnate sono date), il carbonio dei sedimenti che torna con i
// vulcani delle fosse (qui il carbonio del mantello non si consuma), la vita (che sulla Terra accelera il suolo), lo spessore
// dei sedimenti di ciascun pianeta (che scalda i pori: qui quello della Terra).
export const ROCCE = Object.freeze({ denudazione: 3e-5, densita: 2700, suolo: 1, superficieGrani: 1000, velocita: 3.1e-13, invecchia: 0.61, Tsuoli: 288, pCO2suoli: 2.8e-4,
  magma: 0.1, caloreMagma: 1.7e6, // il magma porta un decimo del calore; J per kg di magma (1300 K di salto + calore di fusione)
  rimasto: { Cl: 17e-6 / 35.45e-3, S: 250e-6 / 32.06e-3, C: 120e-6 / 12.011e-3 }, // mol per kg di mantello
  acidoCarbonico: [-7.82, -10.6], // log K a 25 °C e ΔH (kJ/mol) di CO2(gas) + H2O ⇌ H⁺ + HCO3⁻
  fondale: Object.freeze({ oggi: 0.45e12 / (21e9 * 2900), E: 92, gamma: 0.27, pH: 1 / 1.34, pendenza: 1.02, fondoOggi: 274.037, Toggi: 285, pori: 9, caloreTerra: 0.087, lave: 1 / 6 }) });
// IL POZZO DEL FONDO (mol di CO2 l'anno) a una pCO2 (bar), con la temperatura dell'aria T, il calore che sale (W/m²), il
// magma (kg/anno), la parte coperta dal mare e la roccia del fondo (rocceDelPianeta().basalto, mol/kg)
export function fondoConsuma(pCO2, { T = 288, calore = 0, magma = 0, mare = 0.7, basalto } = {}) {
  const f = ROCCE.fondale; if (!(magma > 0) || !(mare > 0) || !(pCO2 > 0)) return 0;
  const fondo = (t) => Math.max(271.15, f.pendenza * t + f.fondoOggi - f.pendenza * f.Toggi), Tp = fondo(T) + f.pori * Math.max(0, calore) / f.caloreTerra, Tp0 = f.fondoOggi + f.pori;
  const cinetica = f.oggi * Math.exp(((-1000 * f.E) / R_GAS) * (1 / Tp - 1 / Tp0)) * Math.pow(pCO2 / ROCCE.pCO2suoli, f.gamma * f.pH), tetto = f.lave * ((basalto?.Ca ?? 0) + (basalto?.Mg ?? 0) + (basalto?.Fe ?? 0));
  return magma * Math.min(1, mare) * (tetto > 0 ? tetto * -Math.expm1(-cinetica / tetto) : 0);
}
// velocità a 25 °C (log₁₀ mol/m²/s) ed energia di attivazione (kJ/mol) del termine neutro; massa molare (kg/mol); poi
// il termine acido: velocità, esponente di [H⁺], energia di attivazione
export const MINERALI_ROCCIA = Object.freeze({ albite: [-12.56, 69.8, 0.262, -10.16, 0.457, 65.0], ortoclasio: [-12.41, 38.0, 0.278, -10.06, 0.5, 51.7], anortite: [-9.12, 17.8, 0.278, -3.5, 1.411, 16.6],
  pirosseno: [-11.11, 40.6, 0.217, -6.36, 0.71, 96.1], olivina: [-10.64, 79.0, 0.141, -6.85, 0.47, 67.2], quarzo: [-13.99, 87.7, 0.06, -99, 0, 0] });
const OSSIDI = { Si: 60.08, Mg: 40.30, Fe: 71.84, Al: 50.98, Ca: 56.08, Na: 30.99, K: 47.10 };
export function rocceDelPianeta(P = {}) {
  const comp = P.composizione || {}, fe = comp.ferro ?? 0.32, sassi = comp.roccia ?? 1 - fe, sole = abbondanzeFisse(1), su = (e) => sole[e] / sole.Si;
  const dp = delPianeta(comp), mantello = dp?.mantello ?? { Si: 1, Mg: comp.MgSi ?? su('Mg'), Fe: (FE_NEI_SILICATI * su('Fe') * (fe / (fe + sassi))) / FERRO_TERRA, Al: su('Al'), Ca: su('Ca'), Na: VOLATILI_RIMASTI * su('Na'), K: VOLATILI_RIMASTI * su('K') };
  const cr = crostaDiPianeta(comp), basalto = cr?.basalto ?? fondi(mantello, D_MANTELLO, F_BASALTO), granito = cr?.granito ?? fondi(basalto, D_BASALTO, F_GRANITO); // (la crosta di QUESTO pianeta, se la si sa)
  const perKg = (r) => { let m = 0; for (const e in r) m += r[e] * OSSIDI[e]; const o = {}; for (const e in r) o[e] = (1000 * r[e]) / m; return o; };
  // chi ospita che cosa (la norma): potassio e sodio nei feldspati con l'alluminio, il calcio nell'anortite finché c'è
  // alluminio e poi nel pirosseno, il magnesio nel pirosseno o, se la silice non basta, nell'olivina
  const ospiti = (r) => { const or = Math.min(r.K, r.Al), ab = Math.min(r.Na, r.Al - or), an = Math.min(r.Ca, (r.Al - or - ab) / 2), M = r.Mg + r.Fe, Si = r.Si - 3 * or - 3 * ab - 2 * an - (r.Ca - an);
    return { anortite: r.Ca > 0 ? an / r.Ca : 0, olivina: Si >= M ? 0 : Math.min(1, (2 * Math.min(M - Si, Math.max(Si, 0))) / M) }; };
  return { mantello: { ...perKg(mantello), ...(dp?.rimasto ?? ROCCE.rimasto) }, basalto: { ...perKg(basalto), ospiti: ospiti(basalto) }, granito: { ...perKg(granito), ospiti: ospiti(granito) }, fusione: F_BASALTO };
}
// l'acidità dell'acqua del suolo sotto una pressione di CO2 (bar): [H⁺] (mol/kg). È il bilancio delle cariche dell'acqua
// in equilibrio con la CO2, [H⁺] = [HCO3⁻] + [OH⁻]: [H⁺]² = K·pCO2 + Kw, con Kw = 10⁻¹⁴ (l'acqua pura: [H⁺] = 10⁻⁷, a 25 °C;
// la sua dipendenza dalla temperatura qui non c'è). Senza CO2 è l'acqua pura; con molta, √(K·pCO2).
// (Prima era max(10⁻⁷, √(K·pCO2)): sotto 0,07 Pa di CO2 l'acidità restava ferma di colpo, le rocce consumate non
// dipendevano più dalla CO2, e la CO2 del ciclo saltava di cento volte, fino al pavimento di Urey, appena i vulcani
// ne davano un filo meno di quanto la sola acqua pura consuma. Era un taglio di comodo, non una soglia della natura.)
const KW_ACQUA = 1e-14;
export const acidoDelSuolo = (pCO2, T = 288) => Math.sqrt(Math.pow(10, ROCCE.acidoCarbonico[0]) * Math.exp(((-1000 * ROCCE.acidoCarbonico[1]) / R_GAS) * (1 / T - 1 / 298.15)) * Math.max(0, pCO2) + KW_ACQUA);
// quanta parte di un minerale si scioglie nel tempo che il granello resta nel suolo (anni), a T, con l'acqua acida aH
// (PRESTAZIONI, senza cambiare un bit: il ciclo del carbonio chiede la stessa roccia migliaia di volte cambiando solo la CO2.
// Di ogni minerale si tengono le potenze di dieci delle sue costanti e i due fattori di Arrhenius dell'ultima temperatura
// chiesta (chiave esatta); il valore di riferimento del laboratorio, che non dipende da chi chiama, si calcola una volta;
// l'integrale sull'età del suolo resta in memoria per l'ultima età chiesta. Stesse formule, stessi argomenti.)
const LAB = {};
const lab = (minerale, T, aH) => {
  const M = MINERALI_ROCCIA[minerale]; let q = LAB[minerale];
  if (!q) q = LAB[minerale] = { dieciN: Math.pow(10, M[0]), dieciA: M[3] > -90 ? Math.pow(10, M[3]) : 0, T: NaN, arN: 0, arA: 0, riferimento: NaN };
  if (q.T !== T) { q.arN = Math.exp(((-1000 * M[1]) / R_GAS) * (1 / T - 1 / 298.15)); q.arA = M[3] > -90 ? Math.exp(((-1000 * M[5]) / R_GAS) * (1 / T - 1 / 298.15)) : 0; q.T = T; }
  return q.dieciN * q.arN + (M[3] > -90 ? q.dieciA * q.arA * Math.pow(aH, M[4]) : 0); };
const labDiRiferimento = (minerale) => { let q = LAB[minerale]; if (!q || q.riferimento !== q.riferimento) { const v = lab(minerale, ROCCE.Tsuoli, acidoDelSuolo(ROCCE.pCO2suoli, ROCCE.Tsuoli)); q = LAB[minerale]; q.riferimento = v; } return q.riferimento; };
let etaSuolo = NaN, integraleSuolo = NaN;
export function sciolto(minerale, T, anni, aH = acidoDelSuolo(ROCCE.pCO2suoli, ROCCE.Tsuoli)) {
  const cambia = lab(minerale, T, aH) / labDiRiferimento(minerale); // (dal laboratorio: solo il rapporto)
  // l'integrale di 3,1·10⁻¹³·t^−0,61 sull'età del suolo (mol/m²)
  if (anni !== etaSuolo) { integraleSuolo = (ROCCE.velocita * 3.156e7 * Math.pow(Math.max(anni, 1), 1 - ROCCE.invecchia)) / (1 - ROCCE.invecchia); etaSuolo = anni; }
  const perMetroQuadro = integraleSuolo;
  return 1 - Math.exp(-perMetroQuadro * cambia * ROCCE.superficieGrani * MINERALI_ROCCIA[minerale][2]);
}
// ciò che un kg di roccia consumata cede all'acqua (mol), a T e sotto pCO2 (bar); quanta della sua massa diventa argilla
// («denudazione» (m/anno): quanto in fretta l'erosione porta via il suolo, se chi chiama lo sa — mare.js, dalla carta vera —;
// se manca, quella di riferimento. Prima il quarto argomento era ignorato)
export function rilascio(roccia, T, pCO2 = 2.8e-4, denudazione = ROCCE.denudazione) {
  const t = ROCCE.suolo / (denudazione > 0 ? denudazione : ROCCE.denudazione), o = roccia.ospiti, aH = acidoDelSuolo(pCO2, T), f = (m) => (T > 271 ? sciolto(m, T, t, aH) : 0);
  const fAb = f('albite'), fOr = f('ortoclasio'), fAn = f('anortite'), fPx = f('pirosseno'), fOl = f('olivina');
  const Na = roccia.Na * fAb, K = roccia.K * fOr, Ca = roccia.Ca * (o.anortite * fAn + (1 - o.anortite) * fPx), Mg = roccia.Mg * (o.olivina * fOl + (1 - o.olivina) * fPx);
  return { Na, K, Ca, Mg, Si: 2 * Na + 2 * K + 0.5 * Mg, // la silice che i feldspati cedono diventando argilla (2 su 3), e metà di quella dei pirosseni
    cariche: Na + K + 2 * Ca + 2 * Mg, argilla: Math.min(1, roccia.Na * fAb * 0.262 + roccia.K * fOr * 0.278 + roccia.Ca * o.anortite * fAn * 0.278 + (roccia.Mg + roccia.Fe) * fPx * 0.1) };
}
// i vulcani: il magma (kg/anno), il mantello che fonde per farlo, e l'anidride carbonica che ne esce (mol/anno)
// («magma» e «fuso» (kg/anno): se chi chiama li sa dalla storia termica del pianeta (storia.js: fuso.kgAnno, e il mantello
// che fonde per farlo, fuso.kgAnno / fuso.frazione) valgono quelli: UNA stima sola del magma. Se mancano — un pianeta
// fatto a mano in una prova — resta la legge di riserva: il magma porta un decimo del calore dell'interno)
export function vulcani({ calore, raggioM, composizione, magma: dato = null, fuso: fusoDato = null }) {
  const magma = dato ?? (ROCCE.magma * Math.max(0, calore) * 4 * Math.PI * raggioM * raggioM * 3.156e7) / ROCCE.caloreMagma, fuso = fusoDato ?? magma / F_BASALTO;
  const rocce = rocceDelPianeta({ composizione }); return { magma, fuso, CO2: fuso * rocce.mantello.C, rocce }; // (il carbonio del mantello di QUESTO pianeta, se lo si sa)
}
// la pressione di CO2 (bar) a cui le rocce consumate ne prendono quanta i vulcani ne emettono. «terre»: la parte della
// superficie emersa e bagnata dalla pioggia; «continenti»: quanta di quella è granito (il resto basalto). Si può dare
// «consumo(pCO2)» (mol/anno) per fare il conto con una carta vera delle terre e delle temperature (lo fa mare.js).
// «mare»: la parte della superficie coperta dal mare (se manca, quella che non è terra), su cui il fondo consuma (fondoConsuma).
// (Prima, se le terre non tenevano il passo sotto 100 bar, si tornava 100: un tetto messo a mano, a cui si fermavano i mondi
// d'acqua senza terre. Ora il fondo consuma anche lì; la ricerca sale fino a CICLO_FINO bar, un capo numerico sopra ogni
// inventario di carbonio dei pianeti del modello: quanta CO2 c'è davvero nell'aria la decide poi atmosfera(), con l'inventario.)
export const CICLO_FINO = 1e4;
export function co2DelCiclo({ T = 288, calore, raggioM, massaKg, composizione, terre = 0.3, continenti = 1, consumo = null, emissione = null, magma = null, fuso = null, mare = null } = {}) {
  const v = vulcani({ calore, raggioM, composizione, magma, fuso }), fonte = emissione ?? v.CO2; if (!(fonte > 0)) return 0;
  const massa = ROCCE.denudazione * ROCCE.densita * 4 * Math.PI * raggioM * raggioM * Math.max(0, terre), sotto = mare ?? 1 - Math.max(0, terre);
  // (la roccia che pesa zero non si consuma nemmeno nel conto: con le placche è tutto granito, senza è tutto basalto)
  const terra = consumo || ((p) => massa * ((continenti > 0 ? continenti * rilascio(v.rocce.granito, T, p).cariche : 0) + (continenti < 1 ? (1 - continenti) * rilascio(v.rocce.basalto, T, p).cariche : 0)));
  const prende = (p) => terra(p) + fondoConsuma(p, { T, calore, magma: v.magma, mare: sotto, basalto: v.rocce.basalto });
  if (prende(CICLO_FINO) < fonte) return CICLO_FINO; // nemmeno lì rocce e fondo tengono il passo: tutta la CO2 che c'è resta nell'aria
  // il pavimento è l'equilibrio di Urey a quella temperatura: lì la reazione è ferma, la roccia non può prenderne altra
  // (è lo stesso tetto che atmosfera() mette alla CO2 sopra un mare: una grandezza, una legge)
  const pavimento = Math.max(1e-9, pressioneCO2Urey(T) / 1e5); if (prende(pavimento) >= fonte) return pavimento;
  let lo = Math.log(pavimento), hi = Math.log(CICLO_FINO); for (let k = 0; k < 44; k++) { const m = 0.5 * (lo + hi); if (prende(Math.exp(m)) > fonte) hi = m; else lo = m; }
  return Math.exp(0.5 * (lo + hi));
}

// ---------- 9. IL FUOCO E I METALLI (Ellingham)
// ΔG° di formazione dagli elementi (kJ per mole di formula) ogni 100 K, da 300 K: Robie e Hemingway 1995, USGS Bull. 2131
// (dominio pubblico), tabelle «Formation from the elements», lette dal PDF l'11-2026 (ogni riga controllata con il suo
// log Kf; tre buchi della lettura — NiO a 400 K, CO a 600 K, CO2 a 800 K — riempiti per interpolazione tra le righe vicine).
// Dentro ci sono già le fusioni e le ebollizioni dei metalli (il ginocchio dello zinco a 1180 K). Oltre l'ultima riga si
// prosegue in linea retta con la pendenza delle ultime tre (ESTRAPOLATO: lo dice il risultato).
export const ELLINGHAM = {
  CO: [-137.1, -146.2, -155.2, -164.2, -173.2, -182.2, -191.0, -199.9, -208.6, -217.3, -226.0, -234.6, -243.1, -251.6, -260.1, -268.5],
  CO2: [-394.4, -394.7, -394.9, -395.2, -395.4, -395.6, -395.7, -395.9, -396.0, -396.1, -396.1, -396.2, -396.3, -396.3, -396.3, -396.3],
  Cu2O: [-147.8, -140.0, -132.4, -124.9, -117.4, -110.0, -102.7, -95.5, -88.3, -81.2, -74.1, -66.2, -57.4],
  CuO: [-128.3, -118.9, -109.9, -100.9, -92.2, -83.5, -74.9, -66.5, -58.1, -49.9, -41.7, -33.1],
  SnO2: [-515.8, -494.7, -474.1, -452.3, -430.8, -409.4, -388.2, -367.3, -346.5, -325.9, -305.4, -285.1, -265.0],
  PbO: [-188.9, -178.7, -168.9, -159.3, -149.0, -138.9, -128.9, -119.0],
  ZnO: [-320.4, -310.1, -300.1, -290.2, -280.2, -269.4, -258.5, -247.7, -236.9, -224.2, -203.7, -183.4, -163.1, -143.0, -123.0, -103.3],
  TiO2: [-888.8, -869.9, -851.6, -833.4, -815.4, -797.5, -779.8, -762.1, -744.5, -726.9, -709.1, -691.4, -673.7, -656.1, -638.5, -621.0],
  NiO: [-211.1, -201.8, -192.5, -183.6, -175.0, -166.8, -157.8, -149.3, -140.8, -132.4, -124.0, -115.7, -107.4, -99.1, -90.9, -82.0],
  FeO: [-244.9, -237.8, -231.1, -224.6, -218.1, -211.8, -205.4, -199.0, -192.5, -185.9, -179.3, -172.8, -166.3, -159.9], // wüstite, Fe0,947O
  Fe2O3: [-744.4, -716.6, -689.9, -663.6, -637.8, -612.4, -587.4, -562.8, -538.0, -513.2, -488.4, -463.8, -439.2, -414.7, -390.3, -366.0],
  Fe3O4: [-1012.7, -977.9, -944.5, -912.0, -880.3, -849.4, -819.5, -790.0, -760.3, -730.4, -700.4, -670.6, -641.0, -611.5, -582.0, -552.4],
  SiO2: [-856.3, -837.7, -819.4, -801.2, -783.2, -765.3, -747.7, -730.2, -712.8, -695.4, -678.1, -660.9, -643.7, -626.6, -609.0, -589.6],
  Al2O3: [-1582.3, -1550.2, -1518.7, -1487.3, -1456.1, -1424.9, -1393.9, -1361.5, -1328.3, -1295.3, -1262.3, -1229.5, -1196.8, -1164.1, -1131.5, -1099.0],
  MgO: [-569.3, -558.3, -547.4, -536.7, -526.0, -515.3, -504.7, -493.3, -481.8, -470.2, -458.6, -443.9, -423.1, -402.3, -381.7, -361.1],
  CaO: [-603.1, -592.2, -581.6, -571.2, -560.8, -550.3, -539.9, -529.4, -518.9, -507.7, -496.4, -485.1, -473.8, -462.6, -451.3, -437.9],
};
// ΔG° di formazione a T (kJ/mol), per interpolazione → [valore, estrapolato?]
export function formazione(f, T) { const g = ELLINGHAM[f]; if (!g) throw new Error(`chimica: per «${f}» non c'è la tabella di formazione (ci sono: ${Object.keys(ELLINGHAM).join(', ')})`);
  const x = (T - 300) / 100, n = g.length - 1; if (x <= 0) return [g[0] + x * (g[1] - g[0]), T < 250]; if (x >= n) { const p = (g[n] - g[n - 3]) / 3; return [g[n] + (x - n) * p, x > n + 0.01]; } const i = Math.floor(x); return [g[i] + (x - i) * (g[i + 1] - g[i]), false]; }
// riduzione(ossido, T, gas): il carbone toglie l'ossigeno a quell'ossido a quella temperatura? (diagramma di Ellingham)
//   ossido: 'Cu2O', 'CuO', 'PbO', 'SnO2', 'FeO', 'Fe3O4', 'Fe2O3', 'ZnO', 'NiO', 'TiO2', 'SiO2', 'Al2O3', 'MgO', 'CaO';
//   gas (se si vuole): { CO, CO2 } frazioni o pressioni del gas del forno.
// LEGGI: MxOy + y C → x M + y CO va da sé dove ΔG = y·ΔG°(CO) − ΔG°(ossido) < 0, cioè sopra la temperatura in cui la retta
// dell'ossido incrocia quella di 2C + O2 → 2CO (che scende, perché fa gas: è l'unica); con il gas, MxOy + y CO → x M +
// y CO2 chiede pCO/pCO2 ≥ exp(ΔG/(y·R·T)). Solo termodinamica: non dice in quanto tempo, né se il metallo esce liquido
// o in vapore (lo zinco bolle a 1180 K e si riossida salendo). → { metallo, conCarbonio (vero/falso a quella T),
//   temperaturaMinima (K: l'incrocio con C → CO a 1 bar), rapportoCOCO2 (il minimo a quella T), riduce (con il gas dato,
//   o null), pO2 (bar: sotto questa pressione d'ossigeno l'ossido si disfa da solo), dG (kJ per mole di O2, con il carbonio), estrapolato }
export function riduzione(ossido, T = 1200, gas = null) {
  const at = atomiDi(ossido), y = at.O, metallo = Object.keys(at).find((e) => e !== 'O'), RT = (R_GAS * T) / 1000;
  const conC = (t) => y * formazione('CO', t)[0] - formazione(ossido, t)[0], [gO, fuori] = formazione(ossido, T), [gCO, f1] = formazione('CO', T), [gCO2, f2] = formazione('CO2', T);
  let lo = 250, hi = 3200, Tmin = conC(lo) < 0 ? lo : conC(hi) > 0 ? Infinity : null; if (Tmin == null) { for (let k = 0; k < 50; k++) { const m = 0.5 * (lo + hi); if (conC(m) > 0) lo = m; else hi = m; } Tmin = 0.5 * (lo + hi); }
  const rapporto = Math.exp((y * (gCO2 - gCO) - gO) / (y * RT)), r = gas && gas.CO != null ? (gas.CO2 > 0 ? gas.CO / gas.CO2 : Infinity) : null;
  return { ossido, metallo, T, conCarbonio: conC(T) < 0, temperaturaMinima: Tmin, rapportoCOCO2: rapporto, riduce: r == null ? null : r >= rapporto, pO2: Math.exp((2 * gO) / (y * RT)), dG: (2 * conC(T)) / y, estrapolato: fuori || f1 || f2 || Tmin > 300 + 100 * (ELLINGHAM[ossido].length - 1) };
}
// combustione(aria): una fiamma di materia vegetale secca regge in quell'aria?  aria = { gas: { O2: frazione, N2, CO2, … }, pressione (Pa) }
// SOGLIA MISURATA, NON DERIVATA: sotto il 16% di O2 (frazione molare, a 1 bar, in azoto) la combustione non si sostiene,
// sotto il 18,5% gli incendi sono quasi spenti (Belcher e altri 2010, PNAS 107, 22448: torba di sfagno secca). Due
// correzioni, misurate anche loro: (1) la pressione totale conta poco: x_min ∝ P^−0,1 (prove NASA di propagazione su
// polimeri tra 48 e 101 kPa: esponenti 0,08-0,4; vale sopra ~0,4 bar: Hirsch, Williams e Beeson 2007); (2) il gas inerte
// è zavorra termica: con CO2 al posto di N2 la soglia sale di 14,5/12 (Zabetakis 1965, Bureau of Mines Bull. 627), cioè
// come il calore specifico molare dell'inerte alla temperatura di fiamma elevato a 0,385 (N2 33, CO2 54, H2O 41, gas nobili 21 J/mol/K).
// La temperatura di fiamma è la stima adiabatica del carbonio che brucia a CO2 (senza dissociazione: troppo alta sopra 2300 K).
// → { regge, piena (attività piena degli incendi), O2, soglia, sogliaPiena, temperaturaFiamma (K), fuoriIntervallo, nota }
export function combustione(aria = {}) {
  const gas = aria.gas || aria, P = aria.pressione ?? 101325, x = gas.O2 || 0, CP = { N2: 33, CO2: 54, H2O: 41, He: 21, Ar: 21, SO2: 55, CH4: 60, NH3: 50, H2: 31, CO: 33 }; let n = 0, cp = 0;
  for (const f in gas) { if (f === 'O2' || !(gas[f] > 0)) continue; n += gas[f]; cp += gas[f] * (CP[f] ?? 33); } const cpInerte = n > 0 ? cp / n : 33;
  const fattore = Math.pow(P / 101325, -0.1) * Math.pow(cpInerte / 33, 0.385), soglia = 0.16 * fattore, sogliaPiena = 0.185 * fattore;
  return { regge: x >= soglia, piena: x >= sogliaPiena, O2: x, soglia, sogliaPiena, temperaturaFiamma: x > 0 ? 298 + 393510 / (54 + (cpInerte * (1 - x)) / x) : 0, fuoriIntervallo: P < 4e4 || P > 2e5,
    nota: 'soglia misurata sulla Terra (torba secca; polimeri per la pressione), non derivata: un combustibile diverso o bagnato ha la sua' };
}
