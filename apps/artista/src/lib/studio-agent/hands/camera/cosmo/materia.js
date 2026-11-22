// materia.js — LE PARTICELLE DENTRO LA MATERIA: il raccordo tra il cristallo (o la molecola) e la particella.
//
// La finestra non è una cosa a parte dal mondo: è un punto di osservazione qualsiasi, a qualsiasi scala. Qui la si
// mette DENTRO la materia di un luogo vero (un punto di roccia, di mare, di ghiaccio, d'aria di un pianeta) e si chiede
// che cosa vi disegnano le particelle. Niente è messo lì: ogni traccia ha una causa che sta in quel luogo.
//   1. IL MEZZO. Dalla composizione vera (i minerali di quel punto con le loro formule, o l'acqua, o i gas di quell'aria)
//      escono Z/A, il potenziale medio di ionizzazione (regola di Bragg), la lunghezza di radiazione, l'indice di
//      rifrazione; e da questi la frenata di ogni particella carica (Bethe-Bloch con l'effetto densità; in basso la
//      frenata proporzionale alla velocità di Lindhard-Scharff e quella nucleare; per gli elettroni la formula di
//      Rohrlich-Carlson e l'irraggiamento), il percorso (l'integrale di 1/frenata), le deviazioni multiple (Highland), i
//      raggi delta, la luce Cherenkov (soglia β = 1/n, angolo cos θ = 1/(nβ), fotoni: Frank-Tamm).
//   2. LE SORGENTI DI QUEL PUNTO. La radioattività dei nuclei che ci sono davvero (K-40, le catene di U-238, U-235 e
//      Th-232, Rb-87, C-14, la fissione spontanea dell'U-238): quanti ce ne sono lo dicono la composizione di quel
//      pianeta e di quel minerale e l'età (legge del decadimento: la stessa che in leggi.js scalda l'interno). E i raggi
//      cosmici arrivati fin lì: dallo spettro sopra il pianeta, tagliato dal suo campo (Størmer), attraverso la colonna
//      d'aria (i nucleoni si attenuano; i pioni decadono in muoni che perdono energia e decadono in volo: Gaisser) e poi
//      attraverso l'acqua o la roccia che sta sopra (solo i muoni scendono). I neutrini passano e basta.
//   3. IL TEMPO. In un cubetto di materia gli eventi sono rari e brevissimi. Due modi veri di guardare:
//      «memoria»: certi minerali registrano le tracce per milioni di anni (tracce di fissione, di rinculo α, ALONI
//      PLEOCROICI: un anello dove si fermano le α di ogni passo della catena); si accumula per l'età vera della roccia,
//      e ciò che la roccia ha subìto sopra la temperatura di ricottura è cancellato. «istante»: un evento vero mentre
//      accade, alla sua data (quanto si aspetta in quel volume lo dice il ritmo vero).
//   4. IL CRISTALLO VISTO DALLE PARTICELLE. La cella elementare vera dei minerali principali, gli atomi con la loro
//      agitazione termica (Debye-Waller), e l'INCANALAMENTO: una carica che entra quasi parallela a un asse è guidata
//      tra le file di atomi (potenziale continuo di Lindhard): dietro un cristallo sottile esce una stella con la
//      simmetria del reticolo. La simmetria la decide il minerale, non chi guarda.
// La `cella` che ne esce è una regione qualsiasi per mondo.js (stessi campi di cosmo.js `regione`).
//
// DATI / LEGGI MISURATE (usati così, dichiarati; i numeri sono nelle tabelle qui sotto):
//   · numeri atomici, masse, potenziali medi di ionizzazione degli elementi e la regola per i composti (ICRU 37, 1984;
//     ICRU 49, 1993): nei composti condensati H 19,2 · C 81 · N 82 · O 106 · F 112 · Cl 180 eV, gli altri 1,13 volte il
//     valore dell'elemento. Così l'acqua dà 75,3 eV (misurato: 75,0) e il quarzo 141 (139); l'aria 86,1 (85,7);
//   · K = 4π·N_A·r_e²·m_e·c² = 0,307075 MeV·cm²/mol; l'effetto densità con la parametrizzazione generale di Sternheimer e
//     Peierls (1971), che chiede solo I e la frequenza di plasma; la carica efficace degli ioni lenti (Barkas 1963:
//     z·[1 − exp(−125·β·z^(−2/3))]; per l'elio il rapporto misurato tra le frenate di α e protoni, NIST/ICRU 49); la
//     frenata nucleare universale di Ziegler, Biersack e Littmark (1985). Controllo: frenate e percorsi di protoni e α
//     in acqua, aria e quarzo entro il 2–3% dalle tabelle NIST PSTAR/ASTAR sopra 1 MeV per nucleone;
//   · la lunghezza di radiazione degli elementi: X0 = 716,4·A / [Z(Z+1)·ln(287/√Z)] g/cm² (Tsai 1974; PDG);
//   · la deviazione multipla: θ0 = (13,6 MeV / βcp)·z·√(x/X0)·[1 + 0,038·ln(x·z²/(X0·β²))] (Highland 1975; Lynch e Dahl 1991);
//   · l'irraggiamento dei muoni: b = 4,0·10⁻⁶ cm²/g nella «roccia standard» (Z = 11, A = 22; Groom, Mokhov e Striganov
//     2001), scalato con Z²/A; la lunghezza d'urto nucleare: 35·A^(1/3) g/cm² (aria: 90);
//   · densità, indice di rifrazione, temperatura di Debye, formule dei minerali (Deer, Howie e Zussman 2013; CRC Handbook);
//   · i nuclidi: tempi di dimezzamento, energie Q, energie medie di β e γ (ENSDF via IAEA LiveChart, ICRP 107),
//     abbondanze isotopiche (IUPAC 2016). Controlli: le α che ne escono (Q·(A − 4)/A) coincidono con le righe principali
//     misurate (U-238 4198 keV … Po-218 6002,6 … Po-214 7686,8; attenzione: la tabella degli aloni di Wikipedia dà 5,18
//     MeV per il Po-218, che è una riga dello 0,001%); il calore per chilo di nuclide torna con Dye (2012) entro lo
//     0,1% (U-238 95,2 µW/kg contro 95,13; Th-232 26,29 contro 26,28; K-40 28,4 contro 28,47; U-235 −1,2%).
//     La fissione spontanea dell'U-238: 8,45·10⁻¹⁷ all'anno (Holden e Hoffman 2000); l'energia
//     dei frammenti: 0,1189·Z²/A^(1/3) + 7,3 MeV (Viola, Kwiatkowski e Walker 1985); frammento leggero A = 96 ± 6;
//   · uranio, torio, potassio, rubidio nelle condriti CI: 8,0 ppb · 29 ppb · 550 ppm · 2,3 ppm (Lodders 2003; Palme e
//     O'Neill 2014): gli stessi di leggi.js (ISOTOPI, ora sui valori di Dye 2012: i due conti del calore coincidono
//     entro lo 0,1%; resta l'1,3% sull'U-235, che pesa l'1% del totale); il potassio è volatile e ne resta un
//     quarto (come in chimica.js), uranio e torio no: perciò nella roccia di un pianeta seguono il potassio con il
//     rapporto K/U ≈ 17 000 (Terra: 12–14 000). Quanto li concentrano i minerali rispetto al fuso (Bea 1996; Mahood e
//     Hildreth 1983): zircone U ×100, Th ×25 · apatite ×6, ×4 · monazite ×1000, ×5000 · i minerali comuni 0,001–0,02
//     (non li vogliono: sono ioni grandi e molto carichi); quanti accessori ha un granito (zircone 0,03%, apatite 0,3%,
//     monazite 0,01% in massa) e un basalto (apatite 0,2%); e la parte che resta ai bordi dei grani (U 30%, Th 10%:
//     Tieh e Ledger 1981);
//   · le temperature di ricottura (sopra, in tempi geologici, il cristallo si ripara e la traccia sparisce): tracce di
//     fissione nell'apatite 110 °C, nello zircone 240 °C (Gleadow e Duddy 1981; Hurford 1986; Bernet 2009), nella
//     biotite ~150 °C (incerta: 100–200); tracce di rinculo α nella mica 50 °C (Gögen e Wagner 2000); aloni nella
//     biotite ~300 °C (incerta: gli aloni spariscono nelle rocce che hanno subìto un metamorfismo);
//   · la dose che colora la biotite: ~3·10¹³ α/cm² (irraggiamenti con ioni elio: Gentry 1974);
//   · i raggi cosmici primari presso il Sole: lo spettro interstellare di Burger e Usoskin (in alto 1,8·10⁴·E^(−2,7)
//     nucleoni/(m²·s·sr·GeV): PDG), con la modulazione del vento solare (campo di forza, 0,55 GV: per un'altra stella
//     non la sappiamo calcolare, resta questa); i muoni: per ogni nucleone primario, 0,14/1,8 muoni a un decimo
//     dell'energia (dalla formula di Gaisser 1990, che al livello del mare è
//     0,14·E^(−2,7)·[1/(1 + 1,1·E·cosθ/115 GeV) + 0,054/(1 + 1,1·E·cosθ/850 GeV)] per cm²·s·sr·GeV); lunghezza di
//     attenuazione dei nucleoni 120 g/cm²; neutroni al suolo sulla Terra 0,013 per cm²·s (Gordon e altri 2004);
//     controllo in profondità: il flusso misurato sotto h km d'acqua equivalente, 67,97·10⁻⁶·e^(−h/0,285) +
//     2,071·10⁻⁶·e^(−h/0,698) per cm²·s (Mei e Hime 2006, da 1 a 10 km): qui viene 2,3 volte meno a 1 km, uguale a 2,5;
//     elettroni: 0,3 dei muoni al livello del mare (PDG); produzione di C-14 sulla Terra: 2 atomi per cm²·s;
//   · il radon dal suolo: frazione che esce dai grani 0,2, diffusione nel suolo 2·10⁻⁶ m²/s, rimescolamento verticale
//     dell'aria 5 m²/s (UNSCEAR 2000): ne esce il flusso (Terra: 0,02 Bq/m²/s) e la concentrazione (~10 Bq/m³);
//   · le celle elementari e le posizioni degli atomi (vedi RETICOLI: quarzo Levien 1980; salgemma; ghiaccio Ih Röttger
//     1994; calcite Markgraf e Reeder 1985; forsterite Smyth e Hazen 1973; diopside Cameron 1973; sanidino Phillips e
//     Ribbe 1973; flogopite Hazen e Burnham 1973): controllate qui con le distanze di legame;
//   · il potenziale continuo di una fila di atomi: U(r) = (Z1·Z2·e²/d)·ln(1 + 3a²/r²), a il raggio di schermo di
//     Thomas-Fermi (Lindhard 1965); l'angolo critico ψ1 = √(2·Z1·Z2·e²/(E·d)).
// PARAMETRI LIBERI (non misurati; scelti perché il disegno si legga):
//   · quante tracce al massimo si disegnano (se quelle vere sono di più se ne dà un campione, e accanto il numero vero);
//   · la taglia del granello che fa da nucleo a un alone: un evento di quel punto, tra 1 e 6 µm (osservati: 1–10);
//   · di quanto si comprime il tempo di un'esposizione lunga milioni di anni (ogni evento conserva la sua data vera).
// SEMPLIFICAZIONI:
//   · il motore è un piano: si seguono gli eventi le cui tracce stanno nel piano della finestra (una sezione sottile,
//     verticale: il basso è il basso); percorsi ed energie sono quelli veri;
//   · catene in equilibrio secolare nella roccia chiusa (ogni passo ha l'attività del capostipite); nell'acqua restano
//     solo i nuclidi solubili (uranio, potassio, rubidio, carbonio), nell'aria il radon e i suoi figli;
//   · di ogni decadimento α si segue la riga principale; lo spettro β è quello di Fermi (forma permessa, e la forma
//     «unica» per il K-40); i γ si seguono solo se la finestra è larga abbastanza perché urtino;
//   · sotto ~100 keV per nucleone la frenata elettronica è il raccordo tra Bethe e Lindhard-Scharff (±20%, e conta poco
//     sui percorsi); la correzione di guscio è una forma empirica tarata sui protoni; l'irraggiamento degli elettroni è
//     la formula di Heitler senza schermo fino a saturazione (±20%);
//   · lo sciame nell'aria è il suo scheletro: l'urto del primario, i pioni, i muoni, le coppie e i fotoni di frenamento
//     (modello di Heitler), in un'aria a strati; il campo del pianeta è perpendicolare alla finestra;
//   · per il plagioclasio la cella dell'albite con le coordinate del sanidino (stessa impalcatura); per la biotite quelle
//     della flogopite; l'idrogeno del ghiaccio è disordinato (mezzo atomo per posto);
//   · la ricottura è una soglia netta (il modello a ventaglio di Ketcham darebbe tracce accorciate a poco a poco); la
//     roccia dei continenti risale per erosione solo dove ci sono placche che la sollevano; il radon nell'aria non
//     guarda quanto è densa l'aria;
//   · l'incanalamento è il modello continuo (le file come corde cariche), lungo gli assi a, b, c o c*, senza la perdita di
//     energia lungo il canale; l'agitazione degli atomi è quella di Debye con la massa di ciascuno.

import { ANNO, ISOTOPI, ATMOSFERA, COSTANTI, GIORNO, KPC, ORA, PESI_ATOMICI, RTERRA, R_GAS, ZERO_CELSIUS } from './leggi.js';
import { sorgente } from './eventi.js';
import { casoEvento } from './mondo.js';
import { unita, catalogoVero, fmtLunghezza, ME_MEV, C_LUCE, C_MOTORE } from './unita.js';
import { ROCCE } from './chimica.js'; // la denudazione attesa (dove l'erosione vera non c'è): una fonte sola
import { COSTANTI as TETTONICA } from './tettonica.js'; // la conducibilità della crosta: una fonte sola

const K_BETHE = 0.307075, N_A = COSTANTI.NA, ALFA_FINE = 1 / 137.036, U_MEV = 931.494, MEV_J = 1.602177e-13;
const limita = (x, a, b) => Math.max(a, Math.min(b, x));

// =====================================================================================
// 1. GLI ELEMENTI E I MATERIALI
// =====================================================================================
// simbolo: [Z, massa atomica (u), I dell'elemento (eV), I nei composti condensati se diverso dalla regola 1,13·I, nome]
const TAVOLA = {
  H: [1, PESI_ATOMICI.H, 19.2, 19.2, 'idrogeno'], He: [2, PESI_ATOMICI.He, 41.8, 41.8, 'elio'], C: [6, PESI_ATOMICI.C, 78, 81, 'carbonio'], N: [7, PESI_ATOMICI.N, 82, 82, 'azoto'], O: [8, PESI_ATOMICI.O, 95, 106, 'ossigeno'],
  F: [9, 18.998, 115, 112, 'fluoro'], Na: [11, PESI_ATOMICI.Na, 149, 0, 'sodio'], Mg: [12, PESI_ATOMICI.Mg, 156, 0, 'magnesio'], Al: [13, 26.982, 166, 0, 'alluminio'], Si: [14, 28.086, 173, 0, 'silicio'],
  P: [15, 30.974, 173, 0, 'fosforo'], S: [16, PESI_ATOMICI.S, 180, 0, 'zolfo'], Cl: [17, PESI_ATOMICI.Cl, 174, 180, 'cloro'], Ar: [18, 39.948, 188, 188, 'argo'], K: [19, PESI_ATOMICI.K, 190, 0, 'potassio'],
  Ca: [20, PESI_ATOMICI.Ca, 191, 0, 'calcio'], Ti: [22, 47.867, 233, 0, 'titanio'], Fe: [26, PESI_ATOMICI.Fe, 286, 0, 'ferro'], Rb: [37, 85.468, 363, 0, 'rubidio'], Zr: [40, 91.224, 393, 0, 'zirconio'],
  Ce: [58, 140.12, 523, 0, 'cerio'], Pb: [82, 207.2, 823, 0, 'piombo'], Th: [90, 232.04, 847, 0, 'torio'], U: [92, 238.03, 890, 0, 'uranio'],
};
export const ELEMENTI = Object.fromEntries(Object.entries(TAVOLA).map(([s, [Z, A, I, Ic, nome]]) => [s, { simbolo: s, nome, Z, A, I, Icomposto: Ic || 1.13 * I }]));
// una formula («K(Mg1.5Fe1.5)AlSi3O10(OH)2») → atomi per unità di formula
export function atomiDi(formula) {
  const leggi = (s, i) => {
    const out = {}; const metti = (o, k = 1) => { for (const e in o) out[e] = (out[e] || 0) + o[e] * k; };
    while (i < s.length && s[i] !== ')') {
      let parte;
      if (s[i] === '(') { const r = leggi(s, i + 1); parte = r.out; i = r.i + 1; }
      else { const m = /^[A-Z][a-z]?/.exec(s.slice(i)); if (!m || !ELEMENTI[m[0]]) throw new Error(`formula non letta: ${s}`); parte = { [m[0]]: 1 }; i += m[0].length; }
      const n = /^[0-9.]+/.exec(s.slice(i)); if (n) i += n[0].length;
      metti(parte, n ? +n[0] : 1);
    }
    return { out, i };
  };
  return leggi(formula.replace(/[·\s]/g, ''), 0).out;
}
const inMassa = (atomi) => { let m = 0; for (const e in atomi) m += atomi[e] * ELEMENTI[e].A; const o = {}; for (const e in atomi) o[e] = (atomi[e] * ELEMENTI[e].A) / m; return o; };

// I MATERIALI: formula (per la composizione), densità (g/cm³), indice di rifrazione (0: opaco), temperatura di Debye (K),
// per chi tiene memoria la temperatura di ricottura delle tracce (K), e «concentra»: quanto uranio e torio prende quel
// minerale rispetto al fuso da cui cresce (i minerali comuni quasi niente: 0,001–0,02; gli accessori centinaia o migliaia
// di volte). Dati misurati.
export const MATERIALI = {
  quarzo: { formula: 'SiO2', densita: 2.65, n: 1.544, debye: 470, concentra: { U: 0.005, Th: 0.005 } },
  'feldspato potassico': { formula: 'KAlSi3O8', densita: 2.56, n: 1.523, debye: 420, concentra: { U: 0.02, Th: 0.02 } },
  plagioclasio: { formula: 'Na0.6Ca0.4Al1.4Si2.6O8', densita: 2.67, n: 1.545, debye: 450, concentra: { U: 0.02, Th: 0.02 } },
  olivina: { formula: 'Mg1.8Fe0.2SiO4', densita: 3.32, n: 1.67, debye: 760, concentra: { U: 0.001, Th: 0.001 } },
  pirosseno: { formula: 'Ca0.5Mg1.2Fe0.3Si2O6', densita: 3.3, n: 1.68, debye: 660, concentra: { U: 0.01, Th: 0.01 } },
  biotite: { formula: 'K(Mg1.5Fe1.5)AlSi3O10(OH)2', densita: 3.05, n: 1.62, debye: 400, ricottura: { fissione: 423, rinculo: 323, alone: 573 }, concentra: { U: 0.02, Th: 0.02 } },
  calcite: { formula: 'CaCO3', densita: 2.71, n: 1.658, debye: 470 },
  salgemma: { formula: 'NaCl', densita: 2.165, n: 1.544, debye: 321 },
  gesso: { formula: 'CaSO4(H2O)2', densita: 2.31, n: 1.52, debye: 300 },
  'ghiaccio d\'acqua': { formula: 'H2O', densita: 0.917, n: 1.309, debye: 222 },
  magnetite: { formula: 'Fe3O4', densita: 5.17, n: 0, debye: 500 }, ematite: { formula: 'Fe2O3', densita: 5.26, n: 0, debye: 500 },
  'ferro metallico': { formula: 'Fe', densita: 7.87, n: 0, debye: 470 }, periclasio: { formula: 'MgO', densita: 3.58, n: 1.736, debye: 940 },
  zircone: { formula: 'ZrSiO4', densita: 4.65, n: 1.94, debye: 600, ricottura: { fissione: 513 }, concentra: { U: 100, Th: 25 } },
  apatite: { formula: 'Ca5(PO4)3F', densita: 3.19, n: 1.634, debye: 390, ricottura: { fissione: 383 }, concentra: { U: 6, Th: 4 } },
  monazite: { formula: 'CePO4', densita: 5.15, n: 1.79, debye: 450, concentra: { U: 1000, Th: 5000 } },
  acqua: { formula: 'H2O', densita: 1.0, n: 1.333, debye: 0 },
};
MATERIALI.ghiaccio = MATERIALI['ghiaccio d\'acqua'];
// i minerali accessori (dati): quanta parte in massa di una roccia dei continenti e di un basalto
export const ACCESSORI = { continente: { zircone: 3e-4, apatite: 3e-3, monazite: 1e-4 }, basalto: { apatite: 2e-3 } };
// la parte di uranio e torio che non sta dentro nessun cristallo ma ai bordi dei grani (pellicole, prodotti di alterazione)
export const AI_BORDI = { U: 0.3, Th: 0.1 };
const SIGMA_CATTURA = { H: 0.332, C: 0.0035, N: 1.91, O: 0.00019, Ar: 0.675, He: 0, S: 0.53, Cl: 33.5 }; // (barn) cattura dei neutroni lenti; per l'azoto è la reazione che fa il carbonio-14
const MASSA_GAS = (f) => { const a = atomiDi(f); let m = 0; for (const e in a) m += a[e] * ELEMENTI[e].A; return m; };

// ---------- il mezzo di un luogo, per le particelle
// luogo = { tipo: 'roccia' | 'acqua' | 'ghiaccio' | 'aria', minerali: [{ nome, frazione (in massa) }] (roccia), densita (kg/m³),
//           T (K), aria: { gas: { N2: 0.78, … } (in moli), pressione (Pa), T }, … } — vedi luogoDaRoccia e luogoDaAcqua.
// → { nome, tipo, densita (g/cm³), composizione { elemento: frazione in massa }, ZsuA, I (eV), plasma (eV), X0 (g/cm²), X0m (m),
//     n (indice di rifrazione, 0 se opaco), lambdaNucleare (g/cm²), z2suA (per l'irraggiamento dei muoni), cherenkov(particella) }
const mezziFatti = new Map();
export function mezzo(luogo) {
  if (luogo && luogo.ZsuA && luogo.composizione && luogo.cherenkov) return luogo; // è già un mezzo
  if (typeof luogo === 'string') luogo = MATERIALI[luogo] ? (luogo === 'acqua' ? { tipo: 'acqua' } : { tipo: 'roccia', minerali: [{ nome: luogo, frazione: 1 }] }) : { tipo: luogo };
  const tipo = luogo.tipo || (luogo.minerali ? 'roccia' : 'acqua'), gas = tipo === 'aria';
  const chiave = JSON.stringify([tipo, luogo.minerali?.map((m) => [m.nome, +(+m.frazione).toPrecision(4)]), luogo.densita, gas ? luogo.aria : null, luogo.composizione, luogo.n]);
  if (mezziFatti.has(chiave)) return mezziFatti.get(chiave);
  let comp = {}, rho, n = 0, nome = tipo, debye = 0;
  const somma = (o, k) => { for (const e in o) comp[e] = (comp[e] || 0) + o[e] * k; };
  if (luogo.composizione) { comp = { ...luogo.composizione }; rho = (luogo.densita ?? 1000) / 1000; n = luogo.n ?? 0; }
  else if (gas) {
    const a = luogo.aria || {}, g = a.gas && Object.keys(a.gas).length ? a.gas : { N2: 0.781, O2: 0.209, Ar: 0.0093 }; let mu = 0, tot = 0;
    for (const f in g) { let m; try { m = MASSA_GAS(f); } catch { continue; } mu += g[f] * m; tot += g[f]; }
    for (const f in g) { let at; try { at = inMassa(atomiDi(f)); } catch { continue; } somma(at, (g[f] * MASSA_GAS(f)) / mu); }
    mu /= tot || 1;
    // la densità: dalla legge dei gas perfetti, alla pressione e alla temperatura del punto; l'indice di rifrazione
    // cresce con la densità (Gladstone e Dale: n − 1 = 2,93·10⁻⁴ per l'aria a 1,293 kg/m³)
    rho = luogo.densita != null ? luogo.densita / 1000 : ((a.pressione ?? ATMOSFERA) * mu * 1e-3) / (R_GAS * (a.T ?? luogo.T ?? 288)) / 1000;
    n = 1 + 2.93e-4 * (rho / 1.293e-3); nome = 'aria';
  } else if (tipo === 'acqua' || tipo === 'ghiaccio') {
    const M = tipo === 'acqua' ? MATERIALI.acqua : MATERIALI.ghiaccio; comp = inMassa(atomiDi(M.formula)); rho = luogo.densita != null ? luogo.densita / 1000 : M.densita; n = M.n; nome = tipo; debye = M.debye;
    // i sali sciolti (se chi chiama li dà: mol/kg come stato.totali di mare.js) spostano appena la composizione
    if (luogo.totali) { let sale = 0; const s = {}; for (const e in luogo.totali) if (ELEMENTI[e] && luogo.totali[e] > 0) { s[e] = luogo.totali[e] * ELEMENTI[e].A * 1e-3; sale += s[e]; } if (sale < 0.5) { for (const e in comp) comp[e] *= 1 - sale; for (const e in s) comp[e] = (comp[e] || 0) + s[e]; } }
  } else {
    const lista = (luogo.minerali || []).filter((m) => MATERIALI[m.nome] && m.frazione > 0), tot = lista.reduce((a, m) => a + m.frazione, 0) || 1; let vol = 0, nn = 0, opaco = 0;
    if (!lista.length) throw new Error('mezzo: una roccia chiede i suoi minerali (nome e frazione in massa)');
    for (const m of lista) { const M = MATERIALI[m.nome], f = m.frazione / tot; somma(inMassa(atomiDi(M.formula)), f); vol += f / M.densita; nn += (f / M.densita) * M.n; if (!M.n) opaco += f / M.densita; debye += f * M.debye; }
    rho = luogo.densita != null ? luogo.densita / 1000 : 1 / vol; n = opaco / vol > 0.5 ? 0 : nn / (vol - opaco); nome = lista.length === 1 ? lista[0].nome : 'roccia';
  }
  // Z/A, il potenziale medio di ionizzazione (regola di Bragg: la media dei logaritmi pesata con gli elettroni), la
  // lunghezza di radiazione (gli inversi si sommano in massa), la lunghezza d'urto nucleare
  let ZsuA = 0, lnI = 0, invX0 = 0, z2 = 0, invL = 0, atomi = 0;
  for (const e in comp) { const el = ELEMENTI[e], w = comp[e]; ZsuA += (w * el.Z) / el.A; lnI += ((w * el.Z) / el.A) * Math.log(gas ? (e === 'O' ? 97 : e === 'C' ? 70 : el.I) : el.Icomposto);
    invX0 += w / ((716.4 * el.A) / (el.Z * (el.Z + 1) * Math.log(287 / Math.sqrt(el.Z)))); z2 += (w * el.Z * el.Z) / el.A; invL += w / (35 * Math.cbrt(el.A)); atomi += w / el.A; }
  const I = Math.exp(lnI / ZsuA), X0 = 1 / invX0, plasma = 28.816 * Math.sqrt(rho * ZsuA);
  // l'effetto densità (Sternheimer e Peierls 1971): δ(βγ) da I e dalla frequenza di plasma soltanto
  const Cs = 2 * Math.log(I / plasma) + 1; let x0, x1;
  if (gas) { x1 = Cs < 12.25 ? 4 : 5; x0 = Cs < 10 ? 1.6 : Cs < 10.5 ? 1.7 : Cs < 11 ? 1.8 : Cs < 11.5 ? 1.9 : Cs < 13.804 ? 2 : 0.326 * Cs - 2.5; }
  else if (I < 100) { x1 = 2; x0 = Cs < 3.681 ? 0.2 : 0.326 * Cs - 1; } else { x1 = 3; x0 = Cs < 5.215 ? 0.2 : 0.326 * Cs - 1.5; }
  const aS = (Cs - 4.606 * x0) / (x1 - x0) ** 3;
  const delta = (bg) => { const x = Math.log10(bg); return x < x0 ? 0 : x < x1 ? 4.606 * x - Cs + aS * (x1 - x) ** 3 : 4.606 * x - Cs; };
  const out = { nome, tipo, densita: rho, composizione: comp, ZsuA, I, plasma, X0, X0m: X0 / rho / 100, n, lambdaNucleare: 1 / invL, z2suA: z2, atomiPerGrammo: atomi * N_A, debye, delta, T: luogo.T ?? 288,
    // la luce Cherenkov di una particella: soglia (energia cinetica, MeV), e a un'energia data angolo (gradi) e fotoni visibili al metro
    cherenkov(part, E = null) {
      const p = particella(part); if (!(out.n > 1) || !p.q) return null;
      const bs = 1 / out.n, soglia = p.mMeV * (1 / Math.sqrt(1 - bs * bs) - 1); if (E == null) return { soglia, angoloMassimo: (Math.acos(bs) * 180) / Math.PI };
      const g = 1 + E / p.mMeV, b = Math.sqrt(1 - 1 / (g * g)); if (b <= bs) return { soglia, angolo: 0, fotoniAlMetro: 0 };
      const cos = 1 / (out.n * b), sin2 = 1 - cos * cos; // Frank e Tamm, tra 400 e 700 nm: 2π·α·z²·sin²θ·(1/λ1 − 1/λ2)
      return { soglia, angolo: (Math.acos(cos) * 180) / Math.PI, fotoniAlMetro: 2 * Math.PI * ALFA_FINE * p.q * p.q * sin2 * (1 / 400e-9 - 1 / 700e-9) };
    } };
  mezziFatti.set(chiave, out); if (mezziFatti.size > 40) mezziFatti.delete(mezziFatti.keys().next().value);
  return out;
}

// =====================================================================================
// 2. LA FRENATA E IL PERCORSO
// =====================================================================================
// le particelle: carica (in e), massa (MeV), e per gli ioni il numero atomico e di massa (per la carica efficace e la frenata nucleare)
export const PARTICELLE = {
  elettrone: { q: -1, mMeV: ME_MEV }, positrone: { q: 1, mMeV: ME_MEV }, 'muone-': { q: -1, mMeV: 105.658 }, 'muone+': { q: 1, mMeV: 105.658 },
  'pione+': { q: 1, mMeV: 139.570 }, 'pione-': { q: -1, mMeV: 139.570 }, protone: { q: 1, mMeV: 938.272, Z: 1, A: 1 }, alfa: { q: 2, mMeV: 3727.379, Z: 2, A: 4 },
};
PARTICELLE.muone = PARTICELLE['muone-']; PARTICELLE['α'] = PARTICELLE.alfa; PARTICELLE['β'] = PARTICELLE.elettrone;
// uno ione qualsiasi: { Z, A } (un nucleo di rinculo, un frammento di fissione); nudo, la carica è Z
export function particella(p) {
  if (typeof p === 'string') { const q = PARTICELLE[p]; if (!q) throw new Error(`particella sconosciuta: ${p}`); return { nome: p, ...q }; }
  if (p.mMeV && p.q != null) return p;
  if (p.Z && p.A) return { nome: p.nome || `ione ${p.Z}/${p.A}`, q: p.Z, Z: p.Z, A: p.A, mMeV: p.A * U_MEV };
  throw new Error('particella: serve un nome, o { q, mMeV }, o { Z, A }');
}
// la carica efficace dell'elio, misurata: (frenata di una α) / (4 × frenata di un protone alla stessa velocità), in funzione
// dei keV per nucleone (qui il logaritmo): NIST ASTAR e PSTAR (ICRU 49), acqua e aria, che coincidono entro l'1%
const ELIO = [[2.5, 0.4], [10, 0.416], [25, 0.458], [50, 0.515], [80, 0.585], [125, 0.697], [175, 0.807], [250, 0.911], [350, 0.964], [500, 0.986], [1000, 0.993], [2000, 0.995]].map(([e, g]) => [Math.log(e), g]);
// la frenata (MeV·cm²/g) di una particella di energia cinetica E (MeV) in un mezzo: { elettronica, nucleare, radiativa, totale }
// «taglio» (MeV): solo le perdite in urti che cedono meno di così a un elettrone (la frenata ristretta: il resto sono raggi delta)
function frenata(p, E, m, taglio = Infinity) {
  const g = 1 + E / p.mMeV, b2 = 1 - 1 / (g * g), bg2 = g * g - 1, me = ME_MEV, IMeV = m.I * 1e-6, d = m.delta(Math.sqrt(bg2));
  let el, nuc = 0, rad = 0;
  if (p.mMeV < 1) { // elettroni e positroni (Rohrlich e Carlson 1954; ICRU 37)
    const t = E / me, F = p.q < 0 ? 1 - b2 + (t * t / 8 - (2 * t + 1) * Math.LN2) / ((t + 1) * (t + 1)) : 2 * Math.LN2 - (b2 / 12) * (23 + 14 / (t + 2) + 10 / (t + 2) ** 2 + 4 / (t + 2) ** 3);
    el = ((K_BETHE / 2) * m.ZsuA / b2) * Math.max(0.3, Math.log(1 + (t * t * (t + 2)) / (2 * (IMeV / me) ** 2)) + F - d);
    // l'irraggiamento (Heitler): cresce come ln(2E/mc²) − 1/3 finché lo schermo degli elettroni atomici lo satura
    const Zm = m.z2suA / m.ZsuA; rad = ((E + me) / m.X0) * limita((Math.log(2 * (t + 1)) - 1 / 3) / Math.log(183 / Math.cbrt(Zm)), 0, 1);
  } else {
    const r = me / p.mMeV, Wmax = (2 * me * bg2) / (1 + 2 * g * r + r * r), W = Math.min(Wmax, taglio), b = Math.sqrt(b2);
    // la carica efficace: uno ione lento si riveste di elettroni. Il protone conta per uno (la sua parte bassa è Lindhard-Scharff);
    // l'elio segue la curva misurata (ELIO); i più pesanti la legge di Barkas
    let zeff = Math.abs(p.q);
    if (p.Z === 2) { const x = Math.log(Math.max(2.5, Math.min(2000, (E * 1000) / p.A))); let i = 0; while (i < ELIO.length - 2 && ELIO[i + 1][0] < x) i++; zeff = 2 * Math.sqrt(ELIO[i][1] + ((ELIO[i + 1][1] - ELIO[i][1]) * (x - ELIO[i][0])) / (ELIO[i + 1][0] - ELIO[i][0])); }
    else if (p.Z > 2) zeff = p.Z * (1 - Math.exp(-125 * b * Math.pow(p.Z, -2 / 3)));
    // Bethe: ½·ln(2mc²β²γ²·W/I²) − β² − δ/2 (nel logaritmo «1 + x + x²» al posto di x², perché resti positiva in basso, dove comanda Lindhard-Scharff)
    // La CORREZIONE DI GUSCIO (gli elettroni interni, più veloci della particella, frenano meno): forma empirica
    // 19·x/(x + 40)², x = 2mc²β²γ²/I, tarata sui protoni in acqua e in quarzo (NIST PSTAR, ICRU 49): toglie il 3% tra 0,5 e 3 MeV
    const xx = (2 * me * bg2 * W) / (IMeV * IMeV), xg = (2 * me * bg2) / IMeV;
    const alta = ((K_BETHE * m.ZsuA) / b2) * Math.max(0, 0.5 * Math.log(1 + Math.sqrt(xx) + xx) - (b2 / 2) * (1 + W / Wmax) - d / 2 - (19 * xg) / ((xg + 40) * (xg + 40)));
    if (p.Z) {
      // in basso: la frenata proporzionale alla velocità (Lindhard e Scharff 1961, per un protone), elemento per elemento; le
      // due si raccordano come inversi dei quadrati. Uno ione va come un protone alla stessa velocità, per il quadrato
      // della sua carica efficace. E la frenata dei nuclei (Ziegler, Biersack e Littmark): conta quando lo ione è lento
      let bassa = 0; const EkeV = E * 1000, M1 = p.A;
      for (const e in m.composizione) { const t = ELEMENTI[e], perGrammo = (m.composizione[e] / t.A) * N_A;
        bassa += perGrammo * 1.915e-14 * (t.Z / Math.pow(1 + Math.pow(t.Z, 2 / 3), 1.5)) * (b / ALFA_FINE) * 1e-6;
        const zz = Math.pow(p.Z, 0.23) + Math.pow(t.Z, 0.23), eps = (32.53 * t.A * EkeV) / (p.Z * t.Z * (M1 + t.A) * zz), sn = eps > 30 ? Math.log(eps) / (2 * eps) : Math.log(1 + 1.1383 * eps) / (2 * (eps + 0.01321 * Math.pow(eps, 0.21226) + 0.19593 * Math.sqrt(eps)));
        nuc += perGrammo * ((8.462e-15 * p.Z * t.Z * M1 * sn) / ((M1 + t.A) * zz)) * 1e-6; }
      el = (zeff * zeff) / Math.sqrt(1 / (alta * alta + 1e-300) + 1 / (bassa * bassa));
    } else el = zeff * zeff * alta;
    // i muoni (e i pioni) veloci irraggiano: b·E, con b ∝ Z²/A (conta sopra le centinaia di GeV)
    if (p.mMeV < 200) rad = 4.0e-6 * (m.z2suA / 5.5) * (E + p.mMeV) * limita(0.25 + 0.25 * Math.log10(Math.max(E, 1e-9) / 1000), 0, 1); // (b cresce piano con l'energia: 3·10⁻⁶ a 100 GeV, 4·10⁻⁶ oltre 1 TeV)
  }
  return { elettronica: el, nucleare: nuc, radiativa: rad, totale: el + nuc + rad };
}
// → la frenata in MeV·cm²/g e in MeV al metro, e ciò che la accompagna a quell'energia
export function perdita(part, E, luogo, { taglio = Infinity } = {}) {
  const p = particella(part), m = mezzo(luogo), f = frenata(p, E, m, taglio), k = m.densita * 100, g = 1 + E / p.mMeV, b = Math.sqrt(1 - 1 / (g * g));
  return { ...f, alMetro: f.totale * k, elettronicaAlMetro: f.elettronica * k, beta: b, gamma: g, cherenkov: m.cherenkov(p, E), deviazione: (x) => deviazione(p, E, m, x) };
}
// la deviazione multipla (Highland): l'angolo tipico (radianti, in un piano) dopo x metri
export function deviazione(part, E, luogo, xM) {
  const p = particella(part), m = mezzo(luogo), g = 1 + E / p.mMeV, b2 = 1 - 1 / (g * g), bcp = p.mMeV * g * b2, t = xM / m.X0m; if (!(t > 0)) return 0;
  return (13.6 / bcp) * Math.abs(p.q) * Math.sqrt(t) * Math.max(0.2, 1 + 0.038 * Math.log((t * p.q * p.q) / b2));
}
// i raggi delta: quanti elettroni con più di «sopra» MeV una particella strappa al metro (Rutherford: dN/dT ∝ 1/T²), e l'energia massima
export function raggiDelta(part, E, luogo, sopra = 0.01) {
  const p = particella(part), m = mezzo(luogo), g = 1 + E / p.mMeV, b2 = 1 - 1 / (g * g), r = ME_MEV / p.mMeV, Wmax = p.mMeV < 1 ? E / 2 : (2 * ME_MEV * (g * g - 1)) / (1 + 2 * g * r + r * r);
  return { massima: Wmax, alMetro: Wmax > sopra ? (K_BETHE / 2) * p.q * p.q * (m.ZsuA / b2) * (1 / sopra - 1 / Wmax) * m.densita * 100 : 0 };
}
// LA TABELLA di una particella in un mezzo: su una griglia di energie (logaritmica) la frenata e il percorso (CSDA:
// l'integrale di dE/frenata dal basso) e il tempo per fermarsi. Si calcola una volta sola.
const tabelle = new WeakMap(), PASSO_LN = 0.05;
function tabella(p, m, taglio = Infinity) {
  let per = tabelle.get(m); if (!per) { per = new Map(); tabelle.set(m, per); }
  const k = `${p.nome || ''}|${p.q}|${p.mMeV}|${p.Z || 0}|${taglio}`; if (per.has(k)) return per.get(k);
  // dal basso (1 keV per gli elettroni, 10 eV per nucleone per gli ioni: sotto, la particella è ferma) a 10⁷ volte la massa
  const E0 = p.mMeV < 1 ? 1e-3 : 1e-8 * p.mMeV, n = Math.ceil(Math.log((1e7 * Math.max(1, p.mMeV)) / E0) / PASSO_LN) + 1, lnE0 = Math.log(E0);
  const S = new Float64Array(n), R = new Float64Array(n), T = new Float64Array(n);
  const v = (E) => { const g = 1 + E / p.mMeV; return C_LUCE * Math.sqrt(1 - 1 / (g * g)); };
  for (let i = 0; i < n; i++) S[i] = frenata(p, Math.exp(lnE0 + i * PASSO_LN), m, taglio).totale;
  // sotto E0 la frenata va come la velocità: il resto del percorso è 2·E0/S(E0) (in g/cm²)
  R[0] = (2 * E0) / S[0]; T[0] = (2 * R[0]) / (m.densita * 100) / v(E0);
  for (let i = 1; i < n; i++) { const a = Math.exp(lnE0 + (i - 1) * PASSO_LN), b = Math.exp(lnE0 + i * PASSO_LN), dR = 0.5 * PASSO_LN * (a / S[i - 1] + b / S[i]); R[i] = R[i - 1] + dR; T[i] = T[i - 1] + dR / (m.densita * 100) / (0.5 * (v(a) + v(b))); }
  const t = { p, m, E0, lnE0, n, S, R, T }; per.set(k, t); return t;
}
const interpola = (t, A, E) => { const x = (Math.log(Math.max(E, t.E0)) - t.lnE0) / PASSO_LN, i = Math.min(t.n - 2, Math.floor(x)), f = x - i; return A[i] + (A[i + 1] - A[i]) * f; };
// il percorso di una particella di energia E (MeV) in un mezzo → { m (metri, lungo la traccia), gcm2, secondi (per fermarsi),
//   dritto (metri in linea d'aria: per gli elettroni la traccia è tortuosa), deviazione (rad, sull'intero percorso) }
export function percorso(part, E, luogo) {
  const p = particella(part), m = mezzo(luogo), t = tabella(p, m), g = interpola(t, t.R, E), metri = g / m.densita / 100;
  // quanto è storta: l'angolo accumulato (Highland) lungo il percorso; oltre un radiante la traccia è un gomitolo, e in
  // linea d'aria fa strada come un cammino a caso (dato: per gli elettroni in acqua circa la metà del percorso)
  const th = deviazione(p, E / 2, m, metri);
  return { m: metri, gcm2: g, secondi: interpola(t, t.T, E), deviazione: th, dritto: metri / Math.sqrt(1 + th * th) };
}
// l'energia (MeV) che resta a una particella dopo x metri di mezzo (0 se si è fermata prima)
export function energiaDopo(part, E, luogo, xM) {
  const p = particella(part), m = mezzo(luogo), t = tabella(p, m), resta = interpola(t, t.R, E) - xM * m.densita * 100; if (resta <= t.R[0]) return 0;
  let lo = 0, hi = t.n - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (t.R[mid] < resta) lo = mid; else hi = mid; }
  return Math.exp(t.lnE0 + (lo + (resta - t.R[lo]) / (t.R[hi] - t.R[lo])) * PASSO_LN);
}

// =====================================================================================
// 3. LE SORGENTI VERE DI UN LUOGO: la radioattività naturale
// =====================================================================================
// I NUCLIDI (dati: ENSDF/NuDat 3; energie in MeV, tempi di dimezzamento in anni). Un passo α: [nome, Z, A, 'α', Q, mezza
// vita, ramo, Eα della riga principale se non va al livello fondamentale]; l'energia della α è Q·(A − 4)/A: il resto lo
// prende il nucleo che rincula. Un passo β: [nome, Z, A, 'β', Q, mezza vita, ramo, energia media degli elettroni, dei γ]:
// il resto di Q lo porta via il neutrino.
const G = 1 / 365.25, MIN = G / 1440, S_ = MIN / 60;
export const CATENE = {
  'uranio-238': { elemento: 'U', abbondanza: 0.992742, mezza: 4.468e9, fissione: 8.45e-17, passi: [
    ['uranio-238', 92, 238, 'α', 4.270, 4.468e9], ['torio-234', 90, 234, 'β', 0.273, 24.1 * G, 1, 0.06, 0.009], ['protoattinio-234', 91, 234, 'β', 2.269, 1.159 * MIN, 1, 0.822, 0.012],
    ['uranio-234', 92, 234, 'α', 4.858, 2.455e5], ['torio-230', 90, 230, 'α', 4.770, 7.5584e4], ['radio-226', 88, 226, 'α', 4.871, 1600], ['radon-222', 86, 222, 'α', 5.590, 3.8222 * G],
    ['polonio-218', 84, 218, 'α', 6.115, 3.097 * MIN], ['piombo-214', 82, 214, 'β', 1.019, 27.06 * MIN, 1, 0.293, 0.25], ['bismuto-214', 83, 214, 'β', 3.270, 19.9 * MIN, 1, 0.659, 1.508],
    ['polonio-214', 84, 214, 'α', 7.833, 163.46e-6 * S_], ['piombo-210', 82, 210, 'β', 0.0635, 22.2, 1, 0.038, 0.005], ['bismuto-210', 83, 210, 'β', 1.162, 5.012 * G, 1, 0.389, 0], ['polonio-210', 84, 210, 'α', 5.407, 138.376 * G]] },
  'uranio-235': { elemento: 'U', abbondanza: 0.007204, mezza: 7.04e8, passi: [
    ['uranio-235', 92, 235, 'α', 4.678, 7.04e8, 1, 4.396], ['torio-231', 90, 231, 'β', 0.391, 25.52 / 24 * G, 1, 0.165, 0.026], ['protoattinio-231', 91, 231, 'α', 5.150, 3.276e4, 1, 5.01],
    ['attinio-227', 89, 227, 'β', 0.0448, 21.772, 1, 0.016, 0], ['torio-227', 90, 227, 'α', 6.146, 18.68 * G, 1, 5.9], ['radio-223', 88, 223, 'α', 5.979, 11.43 * G, 1, 5.716],
    ['radon-219', 86, 219, 'α', 6.946, 3.96 * S_], ['polonio-215', 84, 215, 'α', 7.526, 1.781e-3 * S_], ['piombo-211', 82, 211, 'β', 1.367, 36.1 * MIN, 1, 0.456, 0.064],
    ['bismuto-211', 83, 211, 'α', 6.751, 2.14 * MIN], ['tallio-207', 81, 207, 'β', 1.418, 4.77 * MIN, 1, 0.495, 0.002]] },
  'torio-232': { elemento: 'Th', abbondanza: 1, mezza: 1.405e10, passi: [
    ['torio-232', 90, 232, 'α', 4.082, 1.405e10], ['radio-228', 88, 228, 'β', 0.0459, 5.75, 1, 0.017, 0], ['attinio-228', 89, 228, 'β', 2.124, 6.15 / 24 * G, 1, 0.475, 0.971],
    ['torio-228', 90, 228, 'α', 5.520, 1.9116], ['radio-224', 88, 224, 'α', 5.789, 3.6319 * G], ['radon-220', 86, 220, 'α', 6.405, 55.6 * S_], ['polonio-216', 84, 216, 'α', 6.906, 0.144 * S_],
    ['piombo-212', 82, 212, 'β', 0.570, 10.64 / 24 * G, 1, 0.176, 0.148], ['bismuto-212', 83, 212, 'β', 2.252, 60.55 * MIN, 0.6406, 0.72, 0.16], ['polonio-212', 84, 212, 'α', 8.954, 0.2943e-6 * S_, 0.6406],
    ['bismuto-212', 83, 212, 'α', 6.207, 60.55 * MIN, 0.3594], ['tallio-208', 81, 208, 'β', 4.999, 3.053 * MIN, 0.3594, 0.598, 3.375]] },
};
// i nuclidi soli. K-40: 89,28% β⁻ verso il calcio-40 (spettro di forma «unica», terza proibita), 10,72% cattura di un
// elettrone verso l'argo-40, che emette un γ da 1,4608 MeV. Il C-14 c'è solo nel carbonio che scambia con l'aria.
export const SOLI = {
  'potassio-40': { elemento: 'K', Z: 19, A: 40, abbondanza: 1.17e-4, mezza: 1.248e9, rami: [{ tipo: 'β', ramo: 0.8928, Q: 1.3111, media: 0.5606, proibita: 3, figlia: 'calcio-40' }, { tipo: 'cattura', ramo: 0.1072, Q: 1.5044, gamma: 1.4608, figlia: 'argo-40' }] },
  'rubidio-87': { elemento: 'Rb', Z: 37, A: 87, abbondanza: 0.2783, mezza: 4.97e10, rami: [{ tipo: 'β', ramo: 1, Q: 0.2823, media: 0.082, figlia: 'stronzio-87' }] },
  'carbonio-14': { elemento: 'C', Z: 6, A: 14, abbondanza: 0, mezza: 5730, rami: [{ tipo: 'β', ramo: 1, Q: 0.15648, media: 0.0495, figlia: 'azoto-14' }] },
};
// le condriti (frazioni in massa, oggi: 4,5 miliardi di anni dopo la nascita del Sole) e quanto dei volatili è rimasto (chimica.js)
export const CONDRITI = { U: 8.0e-9, Th: 29e-9, K: 550e-6, Rb: 2.3e-6 }, VOLATILI_RIMASTI = 0.25, ETA_RIFERIMENTO = 4.5e9;
const NOMI_EL = { 81: 'tallio', 82: 'piombo', 83: 'bismuto', 84: 'polonio', 86: 'radon', 88: 'radio', 89: 'attinio', 90: 'torio', 91: 'protoattinio', 92: 'uranio' };
const lambdaDi = (mezzaAnni) => Math.LN2 / (mezzaAnni * ANNO); // (1/s)

// LO SPETTRO β (teoria di Fermi): N(p) ∝ F(Z, E)·p²·(Q − T)²·forma, con F la funzione di Fermi (qui nella forma non
// relativistica 2πη/(1 − e^(−2πη)), η = ±Z·α·E/p) e, per le transizioni «uniche», il fattore di forma (terza proibita:
// p⁶ + 7p⁴q² + 7p²q⁴ + q⁶). → { media (MeV), campiona(u): l'energia cinetica al quantile u }
const spettri = new Map();
export function spettroBeta(Q, Zfiglia, proibita = 0, segno = 1) {
  const k = `${Q}|${Zfiglia}|${proibita}|${segno}`; if (spettri.has(k)) return spettri.get(k);
  const n = 400, me = ME_MEV, w = new Float64Array(n + 1), cum = new Float64Array(n + 1); let tot = 0, media = 0;
  for (let i = 1; i < n; i++) { const T = (Q * i) / n, E = T + me, p = Math.sqrt(T * (T + 2 * me)), q = Q - T, eta = (segno * Zfiglia * ALFA_FINE * E) / p, F = (2 * Math.PI * eta) / (1 - Math.exp(-2 * Math.PI * eta));
    const p2 = p * p, q2 = q * q, forma = proibita === 3 ? p2 ** 3 + 7 * p2 * p2 * q2 + 7 * p2 * q2 * q2 + q2 ** 3 : proibita === 1 ? p2 + q2 : 1; w[i] = F * p * E * q2 * forma; }
  for (let i = 1; i <= n; i++) { const a = 0.5 * (w[i - 1] + w[i]); tot += a; media += a * (Q * (i - 0.5)) / n; cum[i] = tot; }
  const out = { media: media / tot, massima: Q, campiona: (u) => { const x = u * tot; let lo = 0, hi = n; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] < x) lo = m; else hi = m; } return (Q * (lo + (x - cum[lo]) / Math.max(1e-300, cum[hi] - cum[lo]))) / n; } };
  spettri.set(k, out); return out;
}

// I RADIOELEMENTI DELLA ROCCIA DI UN PIANETA. Il potassio è quello dei suoi minerali (feldspato potassico, biotite);
// uranio, torio e rubidio lo seguono: tutti e quattro restano nel fuso finché possono (per questo la crosta ne è ricca
// e il mantello povero), con i rapporti delle condrite — salvo che del potassio, volatile, è rimasto un quarto.
// → frazioni in massa «di riferimento» (come sarebbero in una roccia di un mondo vecchio 4,5 miliardi di anni: l'età
//   vera del pianeta entra dopo, nuclide per nuclide, con la legge del decadimento)
export function radioelementi(minerali = [], { K = null } = {}) {
  let k = K;
  if (k == null) { k = 0; const tot = minerali.reduce((a, m) => a + (m.frazione || 0), 0) || 1; for (const m of minerali) { const M = MATERIALI[m.nome]; if (M) k += ((m.frazione / tot) * (inMassa(atomiDi(M.formula)).K || 0)); } }
  return { K: k, U: (k * CONDRITI.U) / (CONDRITI.K * VOLATILI_RIMASTI), Th: (k * CONDRITI.Th) / (CONDRITI.K * VOLATILI_RIMASTI), Rb: (k * CONDRITI.Rb) / CONDRITI.K };
}
// quanto U, Th e K ha un minerale di quella roccia: gli accessori concentrano uranio e torio (MATERIALI[…].concentra, rispetto
// ai minerali comuni); il potassio sta dove la formula lo vuole. Il conto torna: la somma sui minerali è la roccia.
export function concentrazioni(luogo, minerale) {
  const el = elementiDi(luogo), lista = [...(luogo.minerali || []), ...(luogo.accessori || [])], tot = lista.reduce((a, m) => a + m.frazione, 0) || 1; let peso = 0, kRoccia = 0;
  for (const m of lista) { const M = MATERIALI[m.nome] || {}; peso += (m.frazione / tot); kRoccia += (m.frazione / tot) * (M.formula ? inMassa(atomiDi(M.formula)).K || 0 : 0); }
  const base = (e) => { let s = 0; for (const m of lista) s += (m.frazione / tot) * (MATERIALI[m.nome]?.concentra?.[e] ?? 0.02); return ((1 - AI_BORDI[e]) * el[e]) / (s || 1); };
  const M = MATERIALI[minerale] || {}, kQui = M.formula ? inMassa(atomiDi(M.formula)).K || 0 : 0;
  return { U: base('U') * (M.concentra?.U ?? 0.02), Th: base('Th') * (M.concentra?.Th ?? 0.02), K: kRoccia > 0 ? (el.K * kQui) / kRoccia : 0, Rb: kRoccia > 0 ? (el.Rb * kQui) / kRoccia : 0 };
}
// gli elementi radioattivi del mezzo (frazioni in massa di riferimento): quelli dati da chi chiama, o quelli che seguono dai minerali
function elementiDi(luogo) {
  if (luogo.elementi) return { K: 0, U: 0, Th: 0, Rb: 0, ...luogo.elementi };
  if (luogo.tipo === 'acqua' || luogo.tipo === 'ghiaccio') {
    // nell'acqua: il potassio sciolto (mol/kg, come stato.totali di mare.js); il rubidio viene dalle stesse rocce ma le
    // argille lo trattengono di più (nel mare terrestre Rb/K è 1/14 di quello delle rocce: misurato); l'uranio è solubile solo se l'acqua è ossidata e ha carbonati (mare terrestre: 3,3 µg/kg, cioè 1,2·10⁻³
    // di quello della crosta dei continenti): senza ossigeno resta nella roccia (un centesimo); il torio non si scioglie
    const t = luogo.totali || {}, K = (t.K ?? 0) * 39.098e-3, crosta = luogo.crosta || { U: 2.7e-6 };
    return { K, Rb: (K * CONDRITI.Rb) / CONDRITI.K / 14, U: 1.2e-3 * crosta.U * (luogo.ossidata === false ? 0.01 : 1) * (K > 0 ? 1 : 0), Th: 0 };
  }
  if (luogo.tipo === 'aria') return { K: 0, U: 0, Th: 0, Rb: 0 };
  return radioelementi([...(luogo.minerali || []), ...(luogo.accessori || [])]);
}
// quanto resta (o quanto c'era) di un nuclide in un pianeta di una certa età, rispetto al riferimento (4,5 miliardi di anni)
const quantoResta = (mezza, etaPianeta) => Math.pow(2, (ETA_RIFERIMENTO - (etaPianeta ?? ETA_RIFERIMENTO)) / mezza);

// L'ATTIVITÀ di ogni nuclide in un chilo di mezzo → [{ nuclide, catena, tipo, perKg (Bq/kg), Q, energia (della particella,
// MeV), depositata (MeV che restano nella materia), neutrino (MeV portati via), Z, A, … }]
export function attivita(luogo) {
  const el = elementiDi(luogo), eta = luogo.etaPianeta ?? luogo.pianeta?.eta ?? ETA_RIFERIMENTO, out = [], solido = luogo.tipo !== 'acqua' && luogo.tipo !== 'aria' && luogo.tipo !== 'ghiaccio';
  for (const [capo, c] of Object.entries(CATENE)) {
    const w = el[c.elemento] || 0; if (!(w > 0)) continue;
    const A0 = (w / (ELEMENTI[c.elemento].A * 1e-3)) * N_A * c.abbondanza * quantoResta(c.mezza, eta) * lambdaDi(c.mezza);
    for (const [nome, Z, A, tipo, Q, mezza, ramo = 1, x, y] of c.passi) {
      // nell'acqua la catena è rotta: restano i nuclidi dell'uranio (solubile); i figli (torio, radio…) vanno nei sedimenti
      if (!solido && NOMI_EL[Z] !== 'uranio') continue;
      const base = { nuclide: nome, catena: capo, Z, A, tipo, mezza, perKg: A0 * ramo, Q };
      if (tipo === 'α') { const E = x ?? (Q * (A - 4)) / A; out.push({ ...base, energia: E, rinculo: (E * 4) / (A - 4), depositata: Q, neutrino: 0, figlia: `${NOMI_EL[Z - 2]}-${A - 4}`, Zf: Z - 2 }); }
      else out.push({ ...base, energia: x, gamma: y, depositata: x + y, neutrino: Math.max(0, Q - x - y), figlia: `${NOMI_EL[Z + 1]}-${A}`, Zf: Z + 1 });
    }
    if (c.fissione && solido) { // la fissione spontanea: due frammenti schiena contro schiena, con l'energia della loro repulsione (Viola)
      const tke = (0.1189 * 92 * 92) / Math.cbrt(238) + 7.3;
      out.push({ nuclide: capo, catena: capo, Z: 92, A: 238, tipo: 'fissione', mezza: Math.LN2 / c.fissione, perKg: (A0 / lambdaDi(c.mezza)) * (c.fissione / ANNO), Q: tke + 30, energia: tke, depositata: tke + 10, neutrino: 12 });
    }
  }
  for (const [nome, s] of Object.entries(SOLI)) {
    let perKg;
    if (nome === 'carbonio-14') { const c = luogo.carbonio ?? 0, r = luogo.carbonio14 ?? 0; perKg = (c / 14.0e-3) * N_A * r * lambdaDi(s.mezza); } // carbonio (kg/kg) × C-14/C
    else perKg = ((el[s.elemento] || 0) / (ELEMENTI[s.elemento].A * 1e-3)) * N_A * s.abbondanza * quantoResta(s.mezza, eta) * lambdaDi(s.mezza);
    if (!(perKg > 0)) continue;
    for (const r of s.rami) {
      const base = { nuclide: nome, catena: null, Z: s.Z, A: s.A, mezza: s.mezza, perKg: perKg * r.ramo, Q: r.Q, figlia: r.figlia };
      if (r.tipo === 'β') out.push({ ...base, tipo: 'β', energia: r.media, gamma: 0, depositata: r.media, neutrino: r.Q - r.media, Zf: s.Z + 1, proibita: r.proibita || 0 });
      else out.push({ ...base, tipo: 'cattura', energia: 0, gamma: r.gamma, depositata: r.gamma * 0.984 + 0.003, neutrino: r.Q - r.gamma * 0.984, Zf: s.Z - 1 });
    }
  }
  return out;
}
// il calore della radioattività (W/kg): la somma di ciò che resta nella materia. È la stessa legge di leggi.js
// (caloreDellaRoccia): coerenza(eta) confronta i due conti per una roccia con la composizione delle condriti.
export const calore = (luogo) => attivita(luogo).reduce((s, a) => s + a.perKg * a.depositata * MEV_J, 0);
export function coerenza(etaAnni = ETA_RIFERIMENTO) {
  const qui = { tipo: 'roccia', elementi: { ...CONDRITI }, etaPianeta: etaAnni }, att = attivita(qui), di = (f) => att.filter(f).reduce((s, a) => s + a.perKg * a.depositata * MEV_J, 0);
  const mio = [di((a) => a.catena === 'uranio-238'), di((a) => a.catena === 'uranio-235'), di((a) => a.catena === 'torio-232'), di((a) => a.nuclide === 'potassio-40')];
  const suo = ISOTOPI.map(([h, mezza]) => h * Math.pow(2, (4.5 - etaAnni / 1e9) / mezza));
  const tot = (v) => v.reduce((a, b) => a + b, 0);
  return { nuclidi: ['uranio-238', 'uranio-235', 'torio-232', 'potassio-40'], materia: mio, leggi: suo, scarti: mio.map((x, i) => x / suo[i] - 1), totale: tot(mio), totaleLeggi: tot(suo), scarto: tot(mio) / tot(suo) - 1 };
}

// =====================================================================================
// 4. I RAGGI COSMICI ARRIVATI FIN LÌ
// =====================================================================================
// Sopra il pianeta: i nucleoni primari, per (m²·s·sr·GeV), E l'energia cinetica per nucleone in GeV. Lo spettro fuori dal
// vento della stella è quello misurato presso il Sole (Burger e altri 2000; Usoskin e altri 2005: 1,9·10⁴·P^(−2,78) /
// (1 + 0,4866·P^(−2,51)) protoni, P la rigidità in GV; più il 30% di nucleoni legati nell'elio e nei nuclei: in alto
// torna a 1,8·10⁴·E^(−2,7)), moltiplicato per quanto quel punto della galassia ne ha rispetto al Sole
// (luogo.raggi.relativo: lo dà chi conosce il cielo dei raggi di quella stella, cosmo.js; se manca vale 1), e frenato
// dal vento della stella (campo di forza, Gleeson e Axford 1968: ogni particella perde Φ = 0,55 GeV entrando).
const M_P = 0.93827, PHI = 0.55, LAMBDA_ATT = 1.4; // (GeV, GV) · la lunghezza di attenuazione dei nucleoni è 1,4 volte quella d'urto (aria: 120 g/cm²)
const fuori = (E) => { const P = Math.sqrt(E * (E + 2 * M_P)); return (1.3 * 1.9e4 * Math.pow(P, -2.78)) / (1 + 0.4866 * Math.pow(P, -2.51)); };
export const spettroInterstellare = fuori; // (lo spettro dei raggi cosmici fuori dal vento della stella: una fonte sola, lo legge vuoto_mezzo.js)
const primari = (E) => (fuori(E + PHI) * (E * (E + 2 * M_P))) / ((E + PHI) * (E + PHI + 2 * M_P));
const RESA_MUONI = (0.14 / 1.8) * Math.pow(10, 2.7);
// la soglia di Størmer (GV) in un punto della superficie: sotto questa rigidità un raggio che arriva dall'alto non passa.
// La stessa legge di cosmo.js (Terra all'equatore: 14,9 GV), con la latitudine: cala come cos⁴ verso i poli del campo
export const sogliaStormer = (pianeta = {}, latitudine = 0) => 14.9 * ((pianeta.B0 ?? 3.1e-5) / 3.1e-5) * ((pianeta.raggioM ?? RTERRA) / RTERRA) * Math.cos((latitudine * Math.PI) / 180) ** 4;
const energiaDaRigidita = (GV) => Math.sqrt(GV * GV + M_P * M_P) - M_P;
// l'integrale di una funzione su una griglia logaritmica
const integraLog = (f, a, b, n = 60) => { if (!(b > a)) return 0; const h = Math.log(b / a) / n; let s = 0; for (let i = 0; i <= n; i++) { const x = a * Math.exp(i * h); s += (i === 0 || i === n ? 0.5 : 1) * f(x) * x; } return s * h; };

// L'ENERGIA CHE I PRIMARI PORTANO in cima all'aria, sopra una soglia di rigidità (GV): il flusso attraverso una superficie
// orizzontale (GeV per m² e per secondo), quanti sono (per m² e per secondo) e l'energia media per nucleone (GeV). È lo
// stesso spettro di raggiCosmici, integrato: serve a chi vuole solo il bilancio (risalita.js) senza muoni né sciami
export function energiaDeiPrimari(sogliaGV = 0, relativo = 1) {
  const a = Math.max(energiaDaRigidita(sogliaGV), 0.02), n = integraLog(primari, a, 1e6, 80), e = integraLog((E) => E * primari(E), a, 1e6, 80);
  return { flusso: Math.PI * relativo * e, numero: Math.PI * relativo * n, media: n > 0 ? e / n : 0 };
}
// → { soglia (GV), colonnaAria, colonnaSopra (g/cm²), quotaNascita (m), primari, nucleoni, muoni, elettroni, neutroni: flussi
//     attraverso una superficie orizzontale in quel punto (per m² e per secondo); muoniVerticali (per m²·s·sr),
//     energiaMuoni (GeV, la mediana), spettroMuoni(u) (GeV al quantile u), produzioneC14 (atomi per m² e per secondo) }
const cosmiciFatti = new Map();
export function raggiCosmici(luogo = {}) {
  const pn = luogo.pianeta || {}, aria = luogo.aria || {}, sopra = luogo.sopra || {}, g = pn.g ?? 9.81, rel = luogo.raggi?.relativo ?? 1, lat = luogo.latitudine ?? pn.latitudine ?? 45;
  const chiave = JSON.stringify([pn.B0, pn.raggioM, g, aria, sopra, rel, lat, luogo.tipo === 'aria' ? luogo.quotaM : 0]);
  if (cosmiciFatti.has(chiave)) return cosmiciFatti.get(chiave);
  const mAria = mezzo({ tipo: 'aria', aria }), X0 = Math.max(0, (aria.pressione ?? 0) / g / 10); // la colonna d'aria sopra il punto (g/cm²)
  const Rc = sogliaStormer(pn, lat), Ec = energiaDaRigidita(Rc), LamN = LAMBDA_ATT * mAria.lambdaNucleare;
  // la scala d'altezza dell'aria alta, dove nascono gli sciami: più fredda di quella al suolo (aria.Talta: la temperatura
  // «di pelle» del pianeta, Teq/2^¼; se manca, 0,76 volte quella al suolo: sulla Terra 220 K contro 288)
  let mu = 0, tot = 0; const gas = aria.gas && Object.keys(aria.gas).length ? aria.gas : { N2: 0.781, O2: 0.209, Ar: 0.0093 }; for (const f in gas) { try { mu += gas[f] * MASSA_GAS(f); tot += gas[f]; } catch { /* un gas che la tavola non conosce */ } } mu /= tot || 1;
  const H = (R_GAS * (aria.Talta ?? 0.76 * (aria.T ?? luogo.T ?? 288))) / (mu * 1e-3 * g), epsPi = 115 * (H / 6400), epsK = 850 * (H / 6400), epsMu = (0.10566 * H) / 658.6;
  const aAria = frenata(particella('muone-'), 3000, mAria).elettronica * 1e-3; // GeV per g/cm²
  // i primari sopra la soglia, da tutto il cielo sopra l'orizzonte (π·I per una superficie orizzontale)
  const Ip = rel * integraLog(primari, Math.max(Ec, 0.02), 1e6, 80), attAria = Math.exp(-X0 / LamN);
  // I MUONI (Gaisser 1990, cap. 6). I pioni nascono dove i nucleoni urtano (∝ e^(−X/Λ)/Λ), con lo spettro dei primari; se
  // decadono prima di urtare ancora danno un muone (1/(1 + 1,1·E·cosθ/ε_π): ε_π cresce con la scala d'altezza). Il muone
  // scende perdendo energia (la frenata di quell'aria) e può decadere in volo: sopravvive con probabilità
  // [(X/X0)·(E/E′)]^(ε_μ/(E·cosθ + a·X0)). Quanti: un muone di energia E′ viene in media da un primario dieci volte più
  // energico (più 1 GeV: sotto, i pioni non nascono); la resa è quella che in alto dà 0,14·E^(−2,7) muoni per (cm²·s·sr·GeV)
  // da 1,8·E^(−2,7) primari. Chi viene da un primario sotto la soglia del campo non c'è.
  const muoniA = (Eg, cos) => { // intensità al suolo, per (m²·s·sr·GeV)
    if (!(X0 > 1e-3)) return 0; const n = 24, Xa = Math.min(0.5, X0 / 50), hx = Math.log(X0 / Xa) / n; let somma = 0; // (sotto un milligrammo d'aria per cm² non nasce niente)
    for (let i = 0; i <= n; i++) { const X = Xa * Math.exp(i * hx), E1 = Eg + (aAria * (X0 - X)) / cos; if (E1 * 10 + 1 < Ec) continue;
      const nasce = RESA_MUONI * rel * primari(10 * E1 + 1) * (1 / (1 + (1.1 * E1 * cos) / epsPi) + 0.054 / (1 + (1.1 * E1 * cos) / epsK)) * (Math.exp(-X / (LamN * cos)) / (LamN * cos));
      const vive = Math.pow((X / X0) * (Eg / E1), epsMu / (Eg * cos + aAria * X0));
      somma += (i === 0 || i === n ? 0.5 : 1) * nasce * vive * X; }
    return somma * hx;
  };
  // sotto il suolo (o sotto l'acqua, o il ghiaccio): un muone arriva alla profondità D se ha almeno (a/b)(e^(bD) − 1)
  const strati = [['acqua', sopra.acquaM], ['ghiaccio', sopra.ghiaccioM], ['roccia', sopra.rocciaM]].filter(([, m]) => m > 0); let D = 0, aS = 0, bS = 0, attSotto = 1;
  for (const [tipo, metri] of strati) { const mz = tipo === 'roccia' ? mezzo(sopra.roccia || { tipo: 'roccia', minerali: [{ nome: 'quarzo', frazione: 0.5 }, { nome: 'plagioclasio', frazione: 0.5 }] }) : mezzo({ tipo }), col = metri * mz.densita * 100;
    const f = frenata(particella('muone-'), 1e5, mz); D += col; aS += col * f.elettronica * 1e-3; bS += (col * f.radiativa) / (1e5 + 105.658); attSotto *= Math.exp(-col / (LAMBDA_ATT * mz.lambdaNucleare)); }
  if (D > 0) { aS /= D; bS /= D; }
  const Emin = (cos) => (D > 0 ? (aS / bS) * Math.expm1((bS * D) / cos) : 0);
  const coseni = [0.97, 0.87, 0.72, 0.55, 0.38, 0.2], dc = [0.07, 0.13, 0.17, 0.17, 0.17, 0.19 + 0.1]; // (da 1 a 0; l'ultimo tratto copre fino all'orizzonte, dove non arriva quasi niente)
  const sopraSoglia = (cos) => integraLog((E) => muoniA(E, cos), Math.max(0.01, Emin(cos)), 1e6, 48);
  const muV = sopraSoglia(1); let muoni = 0; for (let i = 0; i < coseni.length; i++) muoni += 2 * Math.PI * sopraSoglia(coseni[i]) * coseni[i] * dc[i];
  // lo spettro dei muoni in quel punto (verticali): l'energia con cui ARRIVANO lì (sotto terra ne hanno già persa)
  const perSpettro = []; { const a = Math.max(0.01, Emin(1)), n = 48, h = Math.log(1e6 / a) / n; let c = 0; for (let i = 0; i <= n; i++) { const E = a * Math.exp(i * h); c += muoniA(E, 1) * E * h; perSpettro.push([E, c]); } }
  const arriva = (E) => (D > 0 ? Math.max(0.001, (E + aS / bS) * Math.exp(-bS * D) - aS / bS) : E);
  const spettroMuoni = (u) => { const T = perSpettro[perSpettro.length - 1][1] * limita(u, 0, 0.9999); let i = 1; while (i < perSpettro.length - 1 && perSpettro[i][1] < T) i++; const [e0, c0] = perSpettro[i - 1], [e1, c1] = perSpettro[i]; return arriva(e0 * Math.pow(e1 / e0, (T - c0) / Math.max(1e-300, c1 - c0))); };
  // i nucleoni (protoni e neutroni veloci) si attenuano; gli elettroni: quelli della cascata (massimo di Pfotzer a ~100 g/cm²,
  // 2 secondari per primario: misure con palloni) più quelli che accompagnano i muoni (0,3: decadimenti in volo ed elettroni strappati)
  const nucleoni = Math.PI * Ip * attAria * attSotto, cascata = X0 > 0 ? Math.PI * Ip * 2 * (X0 / 100) * Math.exp(1 - X0 / 100) : 0;
  const out = { soglia: Rc, energiaSoglia: Ec, relativo: rel, colonnaAria: X0, colonnaSopra: D, scalaAltezza: H, quotaNascita: X0 > mAria.lambdaNucleare ? H * Math.log(X0 / mAria.lambdaNucleare) : 0,
    primari: Math.PI * Ip, primariVerticali: Ip, nucleoni, muoni, muoniVerticali: muV, elettroni: (D > 0 ? 0 : cascata) + 0.3 * muoni, energiaMuoni: muV > 0 ? spettroMuoni(0.5) : 0, spettroMuoni, energiaMinima: Emin(1),
    primarioTipico: (u) => { const a = Math.max(Ec, 0.02), n = 60, h = Math.log(1e6 / a) / n; let c = 0; const cum = []; for (let i = 0; i <= n; i++) { const E = a * Math.exp(i * h); c += primari(E) * E * h; cum.push([E, c]); } const T = c * limita(u, 0, 0.9999); let i = 1; while (i < n && cum[i][1] < T) i++; return cum[i][0]; } };
  cosmiciFatti.set(chiave, out); if (cosmiciFatti.size > 30) cosmiciFatti.delete(cosmiciFatti.keys().next().value);
  // i neutroni lenti (evaporati dai nuclei colpiti): 0,013 per cm²·s al suolo a New York (soglia 2 GV), in proporzione ai
  // nucleoni; dove l'aria non basta nascono nel suolo, e ne escono circa 3 per primario (misure in orbita attorno alla Luna).
  // E il carbonio-14 che fanno con l'azoto dell'aria: 2 atomi per cm²·s in media sulla Terra, per la parte di neutroni che
  // l'azoto cattura; l'aria lo rimescola: conta la media dei primari su tutte le latitudini
  if (!luogo.__riferimento) {
    const terra = { g: 9.81, B0: 3.1e-5, raggioM: RTERRA }, rif = raggiCosmici({ __riferimento: true, pianeta: terra, latitudine: 51, aria: { pressione: ATMOSFERA, T: 288 } });
    out.neutroni = Math.min(130 * (nucleoni / rif.nucleoni), 3 * out.primari * attSotto);
    const at = {}; for (const f in gas) { try { const a = atomiDi(f); for (const e in a) at[e] = (at[e] || 0) + a[e] * gas[f]; } catch { /* un gas che la tavola non conosce */ } }
    let cat = 0; for (const e in at) cat += at[e] * (SIGMA_CATTURA[e] ?? 0.1); const suAzoto = cat > 0 ? ((at.N || 0) * SIGMA_CATTURA.N) / cat : 0;
    const medio = (pianeta, r) => { let s = 0, w = 0; for (const l of [5, 15, 25, 35, 45, 55, 65, 75, 85]) { const c = Math.cos((l * Math.PI) / 180); s += c * r * integraLog(primari, Math.max(energiaDaRigidita(sogliaStormer(pianeta, l)), 0.02), 1e6, 40); w += c; } return s / w; };
    out.produzioneC14 = 2e4 * (medio(pn, rel) / medio(terra, 1)) * (suAzoto / 0.995) * (X0 > 0 ? -Math.expm1(-X0 / LamN) : 0);
  }
  return out;
}

// =====================================================================================
// 5. CHE COSA ACCADE IN QUEL PUNTO, E OGNI QUANTO
// =====================================================================================
const fmt = (x, d = 2) => (x === 0 ? '0' : Math.abs(x) >= 1e5 || Math.abs(x) < 1e-2 ? x.toExponential(1).replace('.', ',').replace(/e\+?(-?)(\d+)/, (_, s, e) => `·10${[...(s + e)].map((c) => '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(c)]).join('')}`) : x.toLocaleString('it-IT', { maximumSignificantDigits: d + 1 }));
// un tempo detto a parole (secondi)
export function fmtTempo(s) {
  if (!isFinite(s)) return 'mai';
  const passi = [[1e-15, 1e-18, 'attosecondi'], [1e-12, 1e-15, 'femtosecondi'], [1e-9, 1e-12, 'picosecondi'], [1e-6, 1e-9, 'nanosecondi'], [1e-3, 1e-6, 'microsecondi'], [1, 1e-3, 'millisecondi'], [120, 1, 'secondi'], [7200, 60, 'minuti'], [172800, ORA, 'ore'], [2 * ANNO, GIORNO, 'giorni'], [2e3 * ANNO, ANNO, 'anni'], [2e6 * ANNO, 1e3 * ANNO, 'mila anni'], [2e9 * ANNO, 1e6 * ANNO, 'milioni di anni'], [Infinity, 1e9 * ANNO, 'miliardi di anni']];
  for (const [fino, unitaS, nome] of passi) if (s < fino) return `${fmt(s / unitaS, 1)} ${nome}`;
  return '';
}
const vocale = (n) => /^[aeiou]/i.test(n), del = (n) => (vocale(n) ? `dell'${n}` : `del ${n}`), nel = (n) => (vocale(n) ? `nell'${n}` : `nel ${n}`);
// il carbonio-14 del carbonio che scambia con l'aria: a regime, ciò che i raggi cosmici producono in una vita media
// (8267 anni) diviso per il carbonio che se lo spartisce (kg per m²: quello dell'aria e quello sciolto nel mare)
export function rapportoC14(luogo) {
  if (luogo.carbonio14 != null) return luogo.carbonio14;
  const serbatoio = luogo.carbonioKgM2 ?? 0; if (!(serbatoio > 0)) return 0;
  return (raggiCosmici(luogo).produzioneC14 * (5730 / Math.LN2) * ANNO) / ((serbatoio / 12.011e-3) * N_A);
}
// IL RADON NELL'ARIA sopra la terraferma (Bq/m³): il radio della roccia (in equilibrio con il suo uranio) lo produce; ne
// esce dai grani una parte, diffonde nel suolo (cammino √(D/λ) ≈ 1 m) ed esce; l'aria lo rimescola in alto per √(K/λ)
export function radonNellAria(luogo) {
  const suolo = luogo.suolo; if (!suolo || luogo.sopra?.acquaM > 0) return 0;
  const U = suolo.U ?? 2.7e-6, eta = luogo.etaPianeta ?? luogo.pianeta?.eta ?? ETA_RIFERIMENTO, c = CATENE['uranio-238'], lam = lambdaDi(3.8222 * G);
  const radio = (U / 238.03e-3) * N_A * c.abbondanza * quantoResta(c.mezza, eta) * lambdaDi(c.mezza), flusso = 0.2 * radio * (suolo.densita ?? 1600) * Math.sqrt(lam * 2e-6);
  return flusso / (lam * Math.sqrt(5 / lam));
}
// → { mezzo, processi: [{ id, nuclide, tipo, catena, perKg, perM3 (decadimenti al secondo), oppure flusso (per m² e per secondo,
//     per i raggi cosmici), emette: [{ particella, energia (MeV), percorso (m) }], origine (a parole), visibile }], cosmici,
//     totale: { perKg, perM3 }, calore (W/kg), neutrini: { perM2 (al secondo), frase },
//     attesa(latoM): ogni quanto accade ciascun processo in un cubo di quel lato → [{ id, origine, secondi, frase }] }
export function sorgentiNaturali(luogo) {
  const m = mezzo(luogo), rho = m.densita * 1000, processi = [];
  const qui = { ...luogo }; if (qui.tipo !== 'roccia' && qui.carbonio14 == null) qui.carbonio14 = rapportoC14(luogo);
  const att = attivita(qui);
  for (const a of att) {
    const emette = [];
    if (a.tipo === 'α') { emette.push({ particella: 'alfa', energia: a.energia, percorso: percorso('alfa', a.energia, m).m }); emette.push({ particella: a.figlia, energia: a.rinculo, percorso: percorso({ Z: a.Zf, A: a.A - 4 }, a.rinculo, m).m, rinculo: true }); }
    else if (a.tipo === 'β') { emette.push({ particella: 'elettrone', energia: a.energia, massima: a.Q, percorso: percorso('elettrone', a.energia, m).m }); emette.push({ particella: 'antineutrino', energia: a.neutrino, percorso: Infinity }); if (a.gamma > 0.01) emette.push({ particella: 'fotone γ', energia: a.gamma, percorso: 1 / (0.0637 * Math.pow(Math.max(a.gamma, 0.1), -0.45) * m.ZsuA * 2 * rho / 10) }); }
    else if (a.tipo === 'cattura') { emette.push({ particella: 'fotone γ', energia: a.gamma, percorso: 1 / (0.0637 * Math.pow(a.gamma, -0.45) * m.ZsuA * 2 * rho / 10) }); emette.push({ particella: 'neutrino', energia: a.neutrino, percorso: Infinity }); }
    else { const AL = 96, AH = 238 - AL - 2, EL = (a.energia * AH) / (AL + AH), EH = a.energia - EL; emette.push({ particella: 'frammento leggero', energia: EL, percorso: percorso({ Z: 38, A: AL }, EL, m).m }); emette.push({ particella: 'frammento pesante', energia: EH, percorso: percorso({ Z: 54, A: AH }, EH, m).m }); emette.push({ particella: 'neutroni', energia: 4, percorso: Infinity }); }
    processi.push({ id: `${a.nuclide} ${a.tipo}`, ...a, perM3: a.perKg * rho, emette, visibile: a.tipo !== 'cattura',
      origine: a.tipo === 'fissione' ? "fissione spontanea dell'uranio-238" : a.tipo === 'cattura' ? `cattura di un elettrone ${nel(a.nuclide)} (un fotone γ da ${fmt(a.gamma)} MeV)` : `decadimento ${a.tipo} ${del(a.nuclide)}${a.catena && a.catena !== a.nuclide ? ` (catena ${del(a.catena)})` : ''}` });
  }
  // nell'aria sopra la terraferma: il radon e i suoi figli a vita breve (in equilibrio con lui)
  if (m.tipo === 'aria') { const rn = radonNellAria(luogo); if (rn > 0) for (const [nome, Z, A, tipo, Q, mezza, , x, y] of CATENE['uranio-238'].passi.slice(6, 11)) {
    const E = tipo === 'α' ? (Q * (A - 4)) / A : x, a = { nuclide: nome, catena: 'uranio-238', Z, A, tipo, mezza, Q, energia: E, gamma: y || 0, depositata: tipo === 'α' ? Q : x + y, neutrino: tipo === 'α' ? 0 : Q - x - y, figlia: `${NOMI_EL[tipo === 'α' ? Z - 2 : Z + 1]}-${tipo === 'α' ? A - 4 : A}`, Zf: tipo === 'α' ? Z - 2 : Z + 1, rinculo: tipo === 'α' ? (E * 4) / (A - 4) : 0 };
    processi.push({ id: `${nome} ${tipo}`, ...a, perKg: rn / rho, perM3: rn, visibile: true, emette: [{ particella: tipo === 'α' ? 'alfa' : 'elettrone', energia: E, percorso: percorso(tipo === 'α' ? 'alfa' : 'elettrone', E, m).m }],
      origine: `decadimento ${tipo} ${del(nome)}${nome === 'radon-222' ? ', un gas uscito dal suolo (lo fa il radio della roccia)' : ', figlio del radon uscito dal suolo'}` }); } }
  // i raggi cosmici arrivati fin qui
  const rc = raggiCosmici(luogo), km = (rc.quotaNascita / 1000).toLocaleString('it-IT', { maximumFractionDigits: 0 });
  const sotto = rc.colonnaSopra > 0 ? `, sopravvissuto a ${fmtLunghezza((luogo.sopra.acquaM || 0) + (luogo.sopra.ghiaccioM || 0) + (luogo.sopra.rocciaM || 0))} di ${luogo.sopra.rocciaM > 0 ? 'roccia' : luogo.sopra.ghiaccioM > 0 ? 'ghiaccio' : 'acqua'}` : '';
  const cosmico = (id, part, flusso, energia, origine) => { if (flusso > 0) processi.push({ id, tipo: 'cosmico', particella: part, flusso, energia, emette: [{ particella: part, energia, percorso: PARTICELLE[part] ? percorso(part, energia, m).m : Infinity }], origine, visibile: !!PARTICELLE[part] }); };
  cosmico('muone cosmico', 'muone-', rc.muoni, rc.energiaMuoni * 1000, `muone di uno sciame nato a ${km} km di quota${sotto}`);
  cosmico('elettrone cosmico', 'elettrone', rc.elettroni, 30, rc.colonnaSopra > 0 ? 'elettrone strappato da un muone cosmico' : `elettrone di uno sciame nato a ${km} km di quota`);
  if (rc.colonnaAria < 300) cosmico('raggio cosmico primario', 'protone', rc.nucleoni, rc.primarioTipico(0.5) * 1000, rc.colonnaAria > 1 ? `raggio cosmico primario: l'aria è troppo poca per fermarlo (${fmt(rc.colonnaAria)} g/cm²)` : "raggio cosmico primario: qui non c'è aria che lo fermi");
  else cosmico('protone cosmico', 'protone', rc.nucleoni / 2, 1000, `protone di uno sciame nato a ${km} km di quota`);
  cosmico('neutrone cosmico', 'neutrone', rc.neutroni, 1, 'neutrone evaporato da un nucleo colpito da un raggio cosmico');
  const perKg = processi.reduce((s, a) => s + (a.perKg || 0), 0);
  // I NEUTRINI PASSANO E BASTA. Quelli della stella (2 per ogni 26,73 MeV di fusione) e quelli dei decadimenti β di qui
  // attraversano la finestra senza lasciare niente: un neutrino da 1 MeV urta un elettrone con una sezione di ~10⁻⁴⁸ m²
  const st = luogo.stella, daStella = st?.Lw > 0 && st?.aM > 0 ? (2 * st.Lw) / (26.73 * MEV_J * 4 * Math.PI * st.aM * st.aM) : 0, elettroniKg = m.ZsuA * N_A * 1000, urtiKg = daStella * 1e-49 * elettroniKg;
  return { mezzo: m, processi, cosmici: rc, totale: { perKg, perM3: perKg * rho }, calore: att.reduce((s, a) => s + a.perKg * a.depositata * MEV_J, 0), carbonio14: qui.carbonio14 ?? 0,
    neutrini: { perM2: daStella, urtiPerKg: urtiKg, frase: `I neutrini passano e basta${daStella > 0 ? `: dalla stella ne arrivano ${fmt(daStella)} per metro quadro al secondo, e in un chilo di questa materia ne urta un elettrone uno ogni ${fmtTempo(1 / urtiKg)}` : ''}; ogni decadimento β di qui ne aggiunge uno, che esce dal pianeta senza toccare niente.` },
    attesa(latoM) { const V = latoM ** 3, A2 = latoM * latoM; return processi.map((p) => { const ritmo = p.tipo === 'cosmico' ? p.flusso * A2 : p.perM3 * V; return { id: p.id, origine: p.origine, ritmo, secondi: 1 / ritmo, frase: `${p.tipo === 'cosmico' ? `un ${p.id}` : p.origine} ogni ${fmtTempo(1 / ritmo)}` }; }).filter((x) => x.ritmo > 0).sort((a, b) => a.secondi - b.secondi); } };
}

// =====================================================================================
// 6. I LUOGHI: dal punto della mappa (o dal campione d'acqua) al `luogo`
// =====================================================================================
const CONDUCIBILITA = TETTONICA.conducibilita, G_NEWTON = COSTANTI.G; // (W/m/K, 3: sta in tettonica.js) della roccia della crosta: con il calore che esce dal pianeta dà di quanto la temperatura cresce scendendo
// ciò che del pianeta serve qui: gravità, campo, aria, stella, età. P è il pianeta di cosmo.js (sistema(…).pianeti[k])
function delPianeta(P = {}, { lat = 45, quotaM = 0 } = {}) {
  const g = P.clima?.g ?? (P.massaKg && P.raggioM ? (G_NEWTON * P.massaKg) / P.raggioM ** 2 : 9.81), p0 = isFinite(P.clima?.pressione) ? P.clima.pressione : 0, T = P.clima?.T ?? 288;
  const gas = P.atmosfera?.gas && Object.keys(P.atmosfera.gas).length ? Object.fromEntries(Object.entries(P.atmosfera.gas).filter(([f, x]) => x > 1e-6 && (() => { try { MASSA_GAS(f); return true; } catch { return false; } })())) : null;
  let mu = 28.96; if (gas) { let s = 0, t = 0; for (const f in gas) { s += gas[f] * MASSA_GAS(f); t += gas[f]; } if (t > 0) mu = s / t; }
  const H = (R_GAS * T) / (mu * 1e-3 * g), B0 = P.B0 ?? P.interno?.B0 ?? 0, sl = Math.sin((lat * Math.PI) / 180);
  return { pianeta: { g, raggioM: P.raggioM ?? RTERRA, B0, eta: P.interno?.eta ?? ETA_RIFERIMENTO, q: P.interno?.q ?? 0.087 }, latitudine: lat,
    aria: { pressione: p0 * Math.exp(-Math.max(0, quotaM) / H), T, Talta: P.clima?.Teq ? P.clima.Teq / Math.pow(2, 0.25) : undefined, ...(gas ? { gas } : {}) },
    B: B0 * Math.sqrt(1 + 3 * sl * sl), etaPianeta: P.interno?.eta ?? ETA_RIFERIMENTO, stella: P.Lw > 0 ? { Lw: P.Lw, aM: P.aM } : undefined, scalaAltezza: H };
}
// quanto carbonio scambia con l'aria (kg per m²): quello dei gas dell'aria e quello sciolto nel mare (stato.carbonio, mol/kg, se c'è)
function carbonioScambiato(P, mare) {
  const g = P.clima?.g ?? 9.81, p = isFinite(P.clima?.pressione) ? P.clima.pressione : 0, gas = P.atmosfera?.gas || {}; let mu = 0, c = 0, tot = 0;
  for (const f in gas) { let a; try { a = atomiDi(f); } catch { continue; } mu += gas[f] * MASSA_GAS(f); c += gas[f] * (a.C || 0); tot += gas[f]; }
  let kg = mu > 0 ? (p / g) * ((c * PESI_ATOMICI.C) / mu) : 0;
  if (mare && P.interno?.acquaKg > 0 && P.raggioM) { const dic = typeof mare.carbonio === 'number' ? mare.carbonio : mare.carbonio?.totale ?? mare.carbonio?.DIC ?? 0; kg += (dic * 12.011e-3 * P.interno.acquaKg) / (4 * Math.PI * P.raggioM ** 2); }
  return kg;
}
// UN PUNTO DI ROCCIA (o di ghiaccio, o di neve). Tutto è facoltativo tranne i minerali (o S, da cui si leggono):
//   S          la superficie di mappa.js (superficieDi): { P, se, cl, mare, k }; oppure P da solo
//   minerali   [{ nome, frazione }] di quel punto (se mancano: S.se.materiali.continente o .basalto)
//   continente vero/falso (crosta dei continenti o basalto); ghiaccio: vero se il punto è ghiaccio o neve
//   T, lat, lon, quotaM, profonditaM (sotto la superficie), acquaSopraM, etaRoccia (anni), bagnato (piove: c'è erosione)
//   raggi      { relativo }: il cielo dei raggi cosmici di quella stella rispetto al Sole (cosmo.js); indirizzo: a parole
// Le regole: nei continenti, se c'è acqua, il pirosseno della norma (chimica.js lavora senz'acqua) è biotite, con il
// potassio che le serve preso al feldspato; i minerali accessori sono quelli del tipo di roccia (ACCESSORI); la
// temperatura cresce scendendo di q/k (il calore che esce da quel pianeta diviso la conducibilità della roccia).
export function luogoDaRoccia({ S = null, P = S?.P || {}, minerali = null, continente = true, ghiaccio = false, T = null, lat = 45, lon = 0, quotaM = 0, profonditaM = 0, acquaSopraM = 0, etaRoccia = null, bagnato = null, raggi = null, indirizzo = null, elementi = null } = {}) {
  const dp = delPianeta(P, { lat, quotaM }), Ts = T ?? P.clima?.T ?? 288, gradiente = dp.pianeta.q / CONDUCIBILITA, qui = Ts + gradiente * profonditaM;
  const acqua = bagnato ?? (P.clima?.acqua === 'liquida' || !!S?.mare?.esiste), mat = S?.se?.materiali || {};
  const base = { ...dp, T: qui, Tsuperficie: Ts, gradiente, profonditaM, lon, raggi: raggi || undefined, indirizzo: indirizzo || (S?.k ? `${S.k}/roccia/${lon.toFixed(4)}/${lat.toFixed(4)}/${profonditaM}` : `roccia/${lon.toFixed(4)}/${lat.toFixed(4)}/${profonditaM}`),
    sopra: { acquaM: acquaSopraM, rocciaM: profonditaM }, carbonioKgM2: carbonioScambiato(P, S?.mare),
    // l'erosione dove piove: quella che geologia.js ha calcolato per questo pianeta (S.se.denudazione, m/anno in media sulle
    // terre), se la superficie c'è; se no la stima attesa di chimica.js (ROCCE.denudazione, 30 m per milione di anni), che
    // dura solo dove le placche continuano a sollevare la crosta: su un mondo fermo il rilievo si spiana e non c'è più niente da togliere
    denudazione: !acqua ? 0 : S?.se?.denudazione > 0 ? S.se.denudazione : (P.interno?.tettonica ?? 'a placche') === 'a placche' && !(S?.se?.denudazione === 0) ? ROCCE.denudazione : 0 };
  if (ghiaccio) return { ...base, tipo: 'ghiaccio', nome: 'ghiaccio', minerali: [{ nome: 'ghiaccio d\'acqua', frazione: 1 }], sopra: { acquaM: acquaSopraM, ghiaccioM: profonditaM }, etaRoccia: etaRoccia ?? 1e4, elementi: elementi || { K: 0, U: 0, Th: 0, Rb: 0 } };
  let lista = (minerali || (continente ? mat.continente : mat.basalto) || (continente ? [{ nome: 'quarzo', frazione: 0.3 }, { nome: 'feldspato potassico', frazione: 0.35 }, { nome: 'plagioclasio', frazione: 0.25 }, { nome: 'pirosseno', frazione: 0.1 }] : [{ nome: 'plagioclasio', frazione: 0.5 }, { nome: 'pirosseno', frazione: 0.4 }, { nome: 'olivina', frazione: 0.1 }])).filter((m) => MATERIALI[m.nome]).map((m) => ({ nome: m.nome, frazione: m.frazione }));
  if (continente && acqua && !lista.some((m) => m.nome === 'biotite')) { // KAlSi3O8 + 3 (Mg,Fe)SiO3 + H2O → biotite + 3 SiO2
    const px = lista.find((m) => m.nome === 'pirosseno'), kf = lista.find((m) => m.nome === 'feldspato potassico');
    if (px && kf) { const k = Math.min(px.frazione / (3 * 108), kf.frazione / 278.3), bio = k * 433.5; px.frazione -= k * 3 * 108; kf.frazione -= k * 278.3; const qz = lista.find((m) => m.nome === 'quarzo'); if (qz) qz.frazione += k * 3 * 60.08; lista.push({ nome: 'biotite', frazione: bio }); lista = lista.filter((m) => m.frazione > 1e-6); }
  }
  const tot = lista.reduce((a, m) => a + m.frazione, 0) || 1; lista.forEach((m) => { m.frazione /= tot; }); lista.sort((a, b) => b.frazione - a.frazione);
  const accessori = Object.entries(continente ? ACCESSORI.continente : ACCESSORI.basalto).map(([nome, frazione]) => ({ nome, frazione }));
  // l'età della roccia: quella data; se no, quella del pianeta (i continenti non affondano)
  return { ...base, tipo: 'roccia', nome: continente ? 'roccia dei continenti' : 'basalto', continente, minerali: lista, accessori, etaRoccia: Math.min(etaRoccia ?? dp.etaPianeta, dp.etaPianeta), ...(elementi ? { elementi } : {}) };
}
// UN CAMPIONE D'ACQUA di mare.js (campioneAcqua) o lo stato del mare: da qui il potassio sciolto (totali, mol/kg), la
// temperatura, la profondità (l'acqua che sta sopra), e se l'acqua è ossidata (l'uranio vi si scioglie)
export function luogoDaAcqua({ S = null, P = S?.P || {}, stato = S?.mare || null, campione = null, lat = 45, lon = 0, profonditaM = campione?.profondita ?? 0, T = null, totali = null, raggi = null, indirizzo = null, crosta = null } = {}) {
  const dp = delPianeta(P, { lat }), tot = totali || campione?.totali || stato?.totali || {}, cont = S?.se?.materiali?.continente;
  return { ...dp, tipo: 'acqua', nome: 'acqua', T: T ?? campione?.T ?? P.clima?.T ?? 288, totali: tot, profonditaM, lon, sopra: { acquaM: profonditaM }, raggi: raggi || undefined,
    ossidata: stato?.pO2 != null ? stato.pO2 > 1e-6 : undefined, crosta: crosta || (cont ? { U: radioelementi(cont).U } : undefined),
    carbonio: (typeof stato?.carbonio === 'number' ? stato.carbonio : stato?.carbonio?.totale ?? stato?.carbonio?.DIC ?? 0) * 12.011e-3, carbonioKgM2: carbonioScambiato(P, stato),
    indirizzo: indirizzo || (S?.k ? `${S.k}/acqua/${lon.toFixed(4)}/${lat.toFixed(4)}/${profonditaM}` : `acqua/${lon.toFixed(4)}/${lat.toFixed(4)}/${profonditaM}`) };
}
// L'ARIA sopra un punto (a una quota): per guardare uno sciame, o il radon uscito dal suolo
export function luogoDaAria({ S = null, P = S?.P || {}, lat = 45, lon = 0, quotaM = 0, suMare = false, raggi = null, indirizzo = null, suolo = null } = {}) {
  const dp = delPianeta(P, { lat, quotaM }), cont = S?.se?.materiali?.continente, gas = dp.aria.gas || { N2: 0.781, O2: 0.209, Ar: 0.0093, CO2: 0.0004 }; let mu = 0, c = 0, t = 0;
  for (const f in gas) { mu += gas[f] * MASSA_GAS(f); c += gas[f] * (atomiDi(f).C || 0); t += gas[f]; }
  return { ...dp, tipo: 'aria', nome: 'aria', T: dp.aria.T, quotaM, lon, sopra: {}, raggi: raggi || undefined, carbonio: mu > 0 ? (c * PESI_ATOMICI.C) / mu : 0, carbonioKgM2: carbonioScambiato(P, S?.mare) || undefined,
    suolo: suMare ? null : suolo || { U: cont ? radioelementi(cont).U : 2.7e-6, densita: 1600 },
    indirizzo: indirizzo || (S?.k ? `${S.k}/aria/${lon.toFixed(4)}/${lat.toFixed(4)}/${quotaM}` : `aria/${lon.toFixed(4)}/${lat.toFixed(4)}/${quotaM}`) };
}
// IL CIELO DEI RAGGI di una stella rispetto a quello del Sole. I raggi cosmici li fanno le supernove (un decimo della
// loro energia) e il campo della galassia li trattiene: la loro densità va come il ritmo delle supernove diviso la
// superficie del disco. Via Lattea: 2 supernove al secolo in un disco di 15 kpc di raggio (dati). «galassia» è ciò che
// dà cosmo.js (galassia(n, id): ritmoSN all'anno, forma.unitaM il raggio che tiene quasi tutte le stelle).
export function cieloRelativo(galassia) {
  const ritmo = galassia?.ritmoSN, R = galassia?.forma?.unitaM; if (!(ritmo > 0) || !(R > 0)) return { relativo: 1 };
  return { relativo: limita((ritmo / 0.02) / (R / (15 * KPC)) ** 2, 1e-3, 1e3) };
}

// =====================================================================================
// 7. LA CELLA PER IL MOTORE
// =====================================================================================
const UMA_ME = U_MEV / ME_MEV, M_ALFA = 3727.379 / ME_MEV, LATO = 1000, DUE_PI = 2 * Math.PI;
// la tabella della frenata di una particella nelle unità del motore: G[i] = −dγ/ds a ln(γ − 1) = x0 + i·dx
function tabellaMotore(part, m, u, { taglio = Infinity, soloUrti = false } = {}) {
  const p = particella(part), E0 = p.mMeV < 1 ? 1e-3 : 1e-8 * p.mMeV, dx = 0.2, x0 = Math.log(E0 / p.mMeV), n = Math.ceil((Math.log(1e7 / p.mMeV) - x0) / dx) + 1, G = new Array(n), k = (m.densita * 100 * u.l) / p.mMeV;
  for (let i = 0; i < n; i++) { const f = frenata(p, p.mMeV * Math.exp(x0 + i * dx), m, taglio); G[i] = +((soloUrti ? f.elettronica + f.nucleare : f.totale) * k).toPrecision(5); }
  return { x0: +x0.toFixed(6), dx, G };
}
// l'urto di un fotone con un elettrone (Compton): la sezione d'urto di Klein e Nishina → il cammino libero medio (m)
export function camminoCompton(E, luogo) {
  const m = mezzo(luogo), k = E / ME_MEV, l = Math.log(1 + 2 * k), s = 2 * Math.PI * 7.9408e-26 * (((1 + k) / (k * k)) * ((2 * (1 + k)) / (1 + 2 * k) - l / k) + l / (2 * k) - (1 + 3 * k) / (1 + 2 * k) ** 2);
  return 1 / (s * m.ZsuA * N_A * m.densita) / 100;
}
// IL CATALOGO: le specie vere di unita.js, ognuna con la sua frenata in quel mezzo, più le α, i fotoni e la luce Cherenkov.
// «carica» è la carica vera (per i conti di conservazione: quella del nucleo, per i nuclei); q quella che il motore usa.
function catalogoMateria(m, u, { taglio = Infinity, sciame = false, gamma = 1.46 } = {}) {
  const X0u = m.X0m / u.l, cat = catalogoVero(u, { urtoProtone: sciame ? m.lambdaNucleare / m.densita / 100 / u.l : Infinity, urtoFotone: sciame ? (9 / 7) * X0u : Infinity });
  const tab = (nome, part, opz) => { cat[nome].perdita = tabellaMotore(part, m, u, opz); };
  tab('protone', 'protone', { taglio }); tab('protone lento', 'protone', { taglio }); tab('pione+', 'pione+', { taglio }); tab('pione-', 'pione-', { taglio }); tab('muone+', 'muone+', { taglio }); tab('muone-', 'muone-', { taglio });
  tab('elettrone', 'elettrone', { soloUrti: sciame }); tab('positrone', 'positrone', { soloUrti: sciame });
  for (const [nome, c] of Object.entries({ protone: 1, 'protone lento': 1, 'pione+': 1, 'pione-': -1, pione0: 0, 'muone+': 1, 'muone-': -1, fotone: 0, elettrone: -1, positrone: 1, neutrino: 0, neutrone: 0, nucleo: 8 })) cat[nome].carica = c;
  if (sciame) {
    // lo scheletro di uno sciame: il protone che ha urtato prosegue e urta ancora; un elettrone veloce, passando accanto
    // a un nucleo, irraggia un fotone (in media ogni lunghezza di radiazione: modello di Heitler), che poi fa una coppia
    cat.protone.canali = cat.protone.canali.map((c) => c.map((n) => (n === 'protone lento' ? 'protone' : n)));
    for (const e of ['elettrone', 'positrone']) Object.assign(cat[e], { camminoLibero: X0u, bersaglio: 'nucleo', spettatore: true, canali: [[e, 'fotone']], figli: [] });
  }
  cat.alfa = { q: 2, m: M_ALFA, carica: 2, perdita: tabellaMotore('alfa', m, u, { taglio }) };
  cat.antineutrino = { luce: true, m: 1, visibile: false, persa: true, carica: 0 };
  // il fotone γ di un nucleo: sotto la soglia delle coppie può solo urtare un elettrone (Compton), che parte e si vede
  cat['fotone γ'] = { luce: true, m: 1, visibile: false, carica: 0, camminoLibero: camminoCompton(gamma, m) / u.l, bersaglio: 'elettrone', canali: [['fotone γ', 'elettrone']], figli: [], margine: 1 + 1e-12 };
  // la luce Cherenkov: nel mezzo va a c/n; l'acqua limpida la assorbe in decine di metri
  if (m.n > 1) cat['fotone Cherenkov'] = { q: 0, m: 1e-6, visibile: true, carica: 0, vita: u.tempo((30 * m.n) / C_LUCE) };
  return cat;
}
// la velocità di agitazione termica di un nucleo di massa A alla temperatura T, nelle unità del motore
const termica = (A, T) => C_MOTORE * Math.sqrt((8.617e-11 * Math.max(T, 1)) / (A * U_MEV));
// UN NUCLEO CHE DECADE, come specie del motore: sta (quasi) fermo, e nell'istante in cui compare decade secondo la
// cinematica vera (mondo.js): le masse sono tali che l'energia liberata è quella vera, e l'energia di ogni figlia ne segue.
// → il nome della specie madre (aggiunta al catalogo con le sue figlie)
function nucleoChe(a, cat, m, u, c) {
  const nome = `${a.nuclide} ${a.tipo}`, vuoto = { q: 0, vita: 0, visibile: false, figli: [], margine: 1 + 1e-12 };
  if (a.tipo === 'α') {
    const Af = a.A - 4, mf = Af * UMA_ME;
    // il nucleo che rincula fa poche decine di nanometri: lo si segue solo se a questa scala si vede
    cat[a.figlia] ??= (m.rinculoM ??= percorso({ Z: 90, A: 234 }, 0.072, m).m) > 0.5 * u.l ? { q: 1, m: mf, carica: a.Zf, rinculo: true, perdita: tabellaMotore({ Z: a.Zf, A: Af }, m, u) } : { q: 1, m: mf, carica: a.Zf, rinculo: true, visibile: false, persa: true };
    cat[nome] ??= { ...vuoto, m: mf + M_ALFA + (a.energia * a.A) / Af / ME_MEV, carica: a.Z, canali: [['alfa', a.figlia]] };
  } else if (a.tipo === 'β') {
    // (se il nucleo figlio nasce eccitato, l'elettrone ha meno di Q: qui la sua energia massima è quella che dà l'energia media vera; il γ non è seguito)
    const mf = a.A * UMA_ME, Q = a.gamma > 0.02 ? Math.min(a.Q, a.energia / 0.38) : a.Q, figlia = `${a.figlia} (rinculo)`;
    cat[figlia] ??= { q: 1, m: mf, carica: a.Zf, visibile: false, persa: true };
    cat[nome] ??= { ...vuoto, m: mf + 1 + Q / ME_MEV, carica: a.Z, canali: [[figlia, 'elettrone', 'antineutrino']], beta: { Z: a.Zf, proibita: a.proibita || 0 } };
  } else if (a.tipo === 'cattura') {
    // il nucleo cattura un suo elettrone: esce un neutrino (tutti con la stessa energia), poi il nucleo figlio, eccitato, emette il suo γ
    const mf = a.A * UMA_ME, figlia = `${a.figlia} (rinculo)`, eccitato = `${a.figlia} eccitato`;
    cat[figlia] ??= { q: 1, m: mf, carica: a.Zf, visibile: false, persa: true };
    cat[eccitato] ??= { ...vuoto, m: mf + a.gamma / ME_MEV, carica: a.Zf, canali: [[figlia, 'fotone γ']] };
    cat[nome] ??= { ...vuoto, m: mf + (a.Q) / ME_MEV, carica: a.Zf, canali: [[eccitato, 'neutrino']] };
  } else {
    // la fissione: il frammento leggero ha in media 96 nucleoni (± 6: la gobba misurata), e i protoni in proporzione
    const AL = 4 * Math.round(limita(96 + 6 * c.normale('massa del frammento'), 80, 112) / 4), // (di quattro in quattro nucleoni: poche specie)
       AH = 238 - AL - 2, ZL = Math.round((AL * 92) / 238), ZH = 92 - ZL, tke = (0.1189 * 92 * 92) / Math.cbrt(238) + 7.3;
    const fr = (Z, A, E) => { const k = `frammento ${NOMI_FR(Z)}-${A}`, b = Math.sqrt((2 * E) / (A * U_MEV)); cat[k] ??= { q: Math.round(Z * (1 - Math.exp(-125 * b * Math.pow(Z, -2 / 3)))), m: A * UMA_ME, carica: Z, perdita: tabellaMotore({ Z, A }, m, u) }; return k; };
    const kL = fr(ZL, AL, (tke * AH) / (AL + AH)), kH = fr(ZH, AH, (tke * AL) / (AL + AH)), k = `${nome} (${AL}+${AH})`;
    cat[k] ??= { ...vuoto, m: (AL + AH) * UMA_ME + tke / ME_MEV, carica: 92, canali: [[kL, kH]] };
    return k;
  }
  return nome;
}
const NOMI_Z = { 31: 'gallio', 45: 'rodio', 46: 'palladio', 47: 'argento', 48: 'cadmio', 61: 'promezio', 62: 'samario', 32: 'germanio', 33: 'arsenico', 34: 'selenio', 35: 'bromo', 36: 'cripton', 37: 'rubidio', 38: 'stronzio', 39: 'ittrio', 40: 'zirconio', 41: 'niobio', 42: 'molibdeno', 43: 'tecnezio', 44: 'rutenio', 49: 'indio', 50: 'stagno', 51: 'antimonio', 52: 'tellurio', 53: 'iodio', 54: 'xeno', 55: 'cesio', 56: 'bario', 57: 'lantanio', 58: 'cerio', 59: 'praseodimio', 60: 'neodimio' };
const NOMI_FR = (Z) => NOMI_Z[Z] || `Z${Z}`;
// l'energia dell'elettrone il cui percorso è una data lunghezza (per decidere quali raggi delta si vedono a una scala)
function energiaPerPercorso(part, metri, m) { let lo = 1e-3, hi = 1e4; for (let k = 0; k < 50; k++) { const mid = Math.sqrt(lo * hi); if (percorso(part, mid, m).m < metri) lo = mid; else hi = mid; } return lo; }
// un conteggio a caso (Poisson) dalla sorgente degli eventi
function conta(c, nome, media) {
  if (!(media > 0)) return 0; if (media > 30) return Math.max(0, Math.round(media + Math.sqrt(media) * c.normale(nome)));
  const L = Math.exp(-media); let k = 0, p = c(`${nome}#0`); while (p > L && k < 400) { k++; p *= c(`${nome}#${k}`); } return k;
}
// per quanto tempo un minerale ha tenuto memoria (anni): l'età della roccia, a meno che non sia stata più calda della sua
// temperatura di ricottura. Una roccia nata in profondità (i continenti) sale perché l'erosione consuma ciò che ha sopra:
// ha passato l'isoterma di ricottura quando stava a (Tc − Ts)/gradiente di profondità, cioè quella profondità diviso la
// velocità di erosione anni fa. Una lava è nata fredda: conta la sua età. tipo: 'fissione' | 'rinculo' | 'alone'
export function ritenzione(luogo, minerale, tipo = 'fissione') {
  const Tc = MATERIALI[minerale]?.ricottura?.[tipo], eta = luogo.etaRoccia ?? luogo.etaPianeta ?? ETA_RIFERIMENTO;
  if (!Tc) return { anni: 0, registra: false, perche: `${minerale}: non tiene questo tipo di memoria` };
  if ((luogo.T ?? 288) >= Tc) return { anni: 0, registra: true, Tc, perche: `qui la roccia è a ${Math.round(luogo.T - ZERO_CELSIUS)} °C, più calda della ricottura (${Math.round(Tc - ZERO_CELSIUS)} °C): ogni traccia si ripara` };
  let anni = eta, perche = `la roccia ha ${fmtTempo(eta * ANNO)} e non è mai stata più calda di ${Math.round(Tc - ZERO_CELSIUS)} °C`;
  if (luogo.riscaldata && luogo.riscaldata.T >= Tc && luogo.riscaldata.anniFa < anni) { anni = luogo.riscaldata.anniFa; perche = `scaldata a ${Math.round(luogo.riscaldata.T - ZERO_CELSIUS)} °C ${fmtTempo(anni * ANNO)} fa: le tracce di prima sono cancellate`; }
  if (luogo.continente !== false && luogo.denudazione > 0 && luogo.gradiente > 0) {
    const z = (Tc - (luogo.Tsuperficie ?? luogo.T ?? 288)) / luogo.gradiente - (luogo.profonditaM || 0), t = z / luogo.denudazione;
    if (t < anni && z < 4e4) { /* (più giù di una crosta, 40 km, non è roccia che possa risalire per erosione) */ anni = Math.max(0, t); perche = `la roccia è salita: stava a ${fmtLunghezza(z + (luogo.profonditaM || 0))} di profondità, a ${Math.round(Tc - ZERO_CELSIUS)} °C, ${fmtTempo(anni * ANNO)} fa (l'erosione toglie ${fmt(luogo.denudazione * 1e6)} m per milione di anni); prima era troppo calda per ricordare`; }
  }
  return { anni, registra: true, Tc, perche };
}

// CHE COSA RICORDA UN PUNTO DI ROCCIA, e in quale suo cristallo guardarlo (lo decide il luogo, non un elenco): se c'è la
// biotite e ci sono granelli che concentrano l'uranio (zircone, monazite), gli ALONI attorno a uno di quei granelli;
// altrimenti le TRACCE DI FISSIONE nel minerale che ne tiene di più (uranio × anni di memoria); se nessun minerale di lì
// tiene memoria (ghiaccio, sale, una roccia più calda della ricottura), niente. Il granello ha la sua taglia: un evento
// di quel punto, lo stesso che usa cellaMateria nel modo memoria.
// → { tipo: 'alone' | 'tracce' | null, ospite, granello, minerale, raggioM, anni, perche }
export function memoriaDelLuogo(luogo, caso = null) {
  if (luogo.tipo !== 'roccia') return { tipo: null, ospite: null, granello: null, perche: `${luogo.tipo === 'ghiaccio' ? 'il ghiaccio' : luogo.tipo === 'acqua' ? "l'acqua" : "l'aria"} non tiene memoria delle particelle: si guarda un evento mentre accade` };
  const c = (caso || sorgente(luogo.indirizzo || 'materia')).sotto('materia/memoria'), raggioM = 1e-6 * Math.pow(6, c('granello/raggio')), tutti = [...(luogo.minerali || []), ...(luogo.accessori || [])].map((m) => m.nome), ha = (n) => tutti.includes(n);
  const ricco = tutti.filter((n) => (MATERIALI[n]?.concentra?.U ?? 0) >= 100).sort((a, b) => concentrazioni(luogo, b).U - concentrazioni(luogo, a).U)[0];
  if (ha('biotite') && ricco) { const r = ritenzione(luogo, 'biotite', 'alone'); if (r.anni > 0 && concentrazioni(luogo, ricco).U > 0) return { tipo: 'alone', ospite: 'biotite', granello: ricco, minerale: 'biotite', raggioM, anni: r.anni, perche: r.perche }; }
  let meglio = null, perche = 'nessun minerale di questo punto tiene memoria delle particelle';
  for (const n of tutti) { if (!MATERIALI[n]?.ricottura?.fissione) continue; const r = ritenzione(luogo, n, 'fissione'), voto = concentrazioni(luogo, n).U * r.anni; if (!(voto > 0)) { perche = r.perche; continue; } if (!meglio || voto > meglio.voto) meglio = { voto, n, r }; }
  return meglio ? { tipo: 'tracce', ospite: meglio.n, granello: null, minerale: meglio.n, raggioM, anni: meglio.r.anni, perche: meglio.r.perche } : { tipo: null, ospite: null, granello: null, perche };
}

// → { cella, racconto: { titolo, frasi, attese, veri }, nome, nota }
//   latoM       il lato della finestra (m); se manca lo decide ciò che si guarda
//   modo        'istante': un evento vero mentre accade · 'memoria': ciò che un minerale ha registrato nella sua età
//   processo    quale processo guardare ('potassio-40', 'muone cosmico', 'sciame', …); se manca: il prossimo che accade lì
//   evento      nel modo istante: il k-esimo evento da quando si comincia a guardare (0: il primo)
//   esposizione nel modo memoria: quanti anni guardare (se manca: tutta la memoria del minerale)
//   ospite, granello  nel modo memoria: il minerale in cui si guarda e quello che fa da nucleo (se mancano li sceglie il luogo)
//   massimo     quante tracce al massimo si disegnano; sopra, fino (GeV): per lo sciame, tra quali energie del primario (20–300)
//   via         l'indirizzo del pianeta ({ cosmo, galassia, stella, pianeta }): finisce in cella.indirizzo, per tornare alla mappa
// caso: la sorgente degli eventi (eventi.js) di quel luogo; i suoi rami sono universi paralleli.
export function cellaMateria(luogo, opzioni = {}, caso = null) {
  const c = (caso || sorgente(luogo.indirizzo || 'materia')).sotto(`materia/${opzioni.modo || 'istante'}`);
  if (opzioni.modo === 'memoria') return cellaMemoria(luogo, opzioni, c);
  if (opzioni.processo === 'sciame') return cellaSciame(luogo, opzioni, c);
  return cellaIstante(luogo, opzioni, c);
}
const PELLICOLA = { w0: 0.8, saturazione: 4, vRif: 5 };
function scheletro(luogo, m, u, latoM, tempo, c, extra) {
  return { larghezza: LATO, altezza: LATO, c: C_MOTORE, G: 1, bordo: 'aperto', tempo, relativita: true, seme: c.seme('motore'), fondo: { B: u.B(luogo.B || 0), K: 1 }, domini: [], masse: [], dipoli: [], pellicola: { ...PELLICOLA },
    finestra: { centro: [LATO / 2, LATO / 2], lato: 400 }, sezione: { fine: tempo, durata: tempo }, scala: { latoM, secondi: tempo * u.tu }, ...extra };
}
// (la luce Cherenkov: si disegna un fotone ogni cinquantesimo di finestra, ma mai più di quelli veri: Frank e Tamm)
const fotoniVeri = (m) => 2 * Math.PI * ALFA_FINE * (1 - 1 / (m.n * m.n)) * (1 / 400e-9 - 1 / 700e-9);
const mezzoMotore = (m, u, latoM, { cherenkov = true, taglio = null } = {}) => ({ X0: +(m.X0m / u.l).toPrecision(6), ...(cherenkov && m.n > 1 ? { n: +m.n.toFixed(6), fotone: 'fotone Cherenkov', ogniFotone: +Math.max(LATO / 50, 1 / (fotoniVeri(m) * u.l)).toPrecision(5) } : {}),
  ...(taglio ? { delta: { A: +(((K_BETHE / 2) * m.ZsuA * m.densita * 100 * u.l) / ME_MEV).toPrecision(6), taglio: +(taglio / ME_MEV).toPrecision(6), specie: 'elettrone' } } : {}) });

// ---------- L'ISTANTE: un evento vero, al suo momento
function cellaIstante(luogo, { latoM = null, processo = null, evento = 0, via = null } = {}, c) {
  const src = sorgentiNaturali(luogo), m = src.mezzo, visibili = src.processi.filter((p) => p.visibile && (p.perM3 > 0 || p.flusso > 0));
  if (!visibili.length) throw new Error('cellaMateria: in questo luogo non accade niente che lasci traccia');
  const tutti = src.processi.filter((p) => p.perM3 > 0 || p.flusso > 0), trova = (id) => tutti.find((p) => p.id === id) || visibili.find((p) => p.id.startsWith(id) || p.nuclide === id || p.id.includes(id)) || tutti.find((p) => p.id.includes(id));
  let chi = processo ? trova(processo) : null; if (processo && !chi) throw new Error(`cellaMateria: qui non c'è «${processo}» (ci sono: ${visibili.map((p) => p.id).join(', ')})`);
  // senza un lato: si guarda il decadimento più frequente di quel luogo (se non ce ne sono, il muone), alla scala del suo percorso
  if (!chi && latoM == null) chi = visibili.filter((p) => p.tipo !== 'cosmico').sort((a, b) => b.perM3 - a.perM3)[0] || trova('muone cosmico') || visibili[0];
  const ritmoDi = (p, L) => (p.tipo === 'cosmico' ? p.flusso * L * L : p.perM3 * L ** 3);
  if (!chi) { // il prossimo evento che accade in quel cubo, qualunque sia: ognuno in proporzione al suo ritmo
    const tot = visibili.reduce((s, p) => s + ritmoDi(p, latoM), 0); let r = c(`evento ${evento}/quale`) * tot; chi = visibili[visibili.length - 1];
    for (const p of visibili) { r -= ritmoDi(p, latoM); if (r < 0) { chi = p; break; } }
  }
  const scelto = !!processo || latoM == null;
  if (latoM == null) {
    const carica = chi.emette.find((e) => PARTICELLE[e.particella] || e.particella === 'frammento leggero');
    latoM = chi.tipo === 'α' || chi.tipo === 'fissione' ? 3 * carica.percorso : chi.tipo === 'β' ? 1.6 * percorso('elettrone', chi.Q, m).dritto : m.tipo === 'aria' ? 200 : m.tipo === 'roccia' ? 0.05 : 0.3;
  }
  const u = unita(latoM), ritmo = scelto ? ritmoDi(chi, latoM) : visibili.reduce((s, p) => s + ritmoDi(p, latoM), 0);
  // quando: gli eventi arrivano a caso nel tempo (Poisson); il k-esimo dopo k + 1 attese, ognuna con la sua durata
  let data = 0; for (let k = 0; k <= evento; k++) data += -Math.log(1 - c(`evento ${k}/attesa`)) / ritmo;
  const ce = c.sotto(`evento ${evento}`), taglio = energiaPerPercorso('elettrone', 0.012 * latoM, m), cat = catalogoMateria(m, u, { taglio, gamma: chi.gamma > 0.1 ? chi.gamma : 1.46 }), sorgenti = [];
  let tStop = 0, frase;
  if (chi.tipo === 'cosmico') {
    // entra dall'alto, con l'angolo dallo zenit dei raggi al suolo (∝ cos²θ) e l'energia dello spettro arrivato fin lì
    let th = 0; for (let k = 0; k < 40; k++) { th = ce.tra(`angolo ${k}`, -1.4, 1.4); if (ce(`angolo ${k}/tiene`) < Math.cos(th) ** 2) break; }
    const mu = chi.particella.startsWith('muone'), E = mu ? src.cosmici.spettroMuoni(ce('energia')) * 1000 : chi.particella === 'protone' ? (src.cosmici.colonnaAria < 300 ? src.cosmici.primarioTipico(ce('energia')) * 1000 : 300 * Math.pow(30, ce('energia'))) : 10 * Math.pow(100, ce('energia'));
    // i muoni positivi sono un po' di più dei negativi (1,27: i primari sono protoni); gli elettroni di uno sciame sono metà positroni
    const specie = mu ? (ce('segno') < 0.56 ? 'muone+' : 'muone-') : chi.particella === 'elettrone' ? (ce('segno') < 0.5 ? 'positrone' : 'elettrone') : chi.particella, p = particella(specie === 'neutrone' ? 'protone' : specie);
    sorgenti.push({ pos: [LATO / 2, 1], dir: Math.PI / 2 + th, v: C_MOTORE * Math.sqrt(1 - 1 / (1 + E / p.mMeV) ** 2), gamma: 1 + E / p.mMeV, t0: 0, specie, emissione: { dal: 'bordo', u: [0.4, 0.6], t0: [0, 3] }, origine: chi.origine, energia: E, processo: chi.id });
    tStop = (1.6 * latoM) / C_LUCE; const ch = m.cherenkov(p, E);
    frase = `${chi.origine}: ${specie === 'muone+' ? 'un muone positivo' : specie === 'muone-' ? 'un muone negativo' : `un ${specie}`} da ${fmt(E >= 1000 ? E / 1000 : E)} ${E >= 1000 ? 'GeV' : 'MeV'} attraversa la finestra${ch?.fotoniAlMetro > 0 ? `; va più veloce della luce in questo mezzo (c/${m.n < 1.01 ? m.n.toFixed(5).replace('.', ',') : fmt(m.n, 3)}) e lascia un cono di luce Cherenkov a ${fmt(ch.angolo)}° dalla traccia: ${fmt(ch.fotoniAlMetro / 100)} fotoni visibili per centimetro` : ''}`;
  } else {
    const specie = nucleoChe(chi, cat, m, u, ce), pos = [LATO * ce.tra('dove/x', 0.2, 0.8), LATO * ce.tra('dove/y', 0.2, 0.8)];
    sorgenti.push({ pos, dir: 0, v: termica(chi.A, luogo.T ?? 288), t0: 0, specie, emissione: { dir: [0, DUE_PI], t0: [0, 3] }, origine: chi.origine, processo: chi.id, nuclide: chi.nuclide });
    for (const e of chi.emette) if (isFinite(e.percorso) && (PARTICELLE[e.particella] || e.rinculo || e.particella.startsWith('frammento'))) tStop = Math.max(tStop, e.particella === 'elettrone' ? percorso('elettrone', chi.Q, m).secondi : e.rinculo ? 0 : percorso(e.particella.startsWith('frammento') ? { Z: 38, A: 96 } : e.particella, e.energia, m).secondi);
    const el = chi.tipo === 'β' ? m.cherenkov('elettrone', chi.Q) : null;
    frase = `${chi.origine}: ${chi.emette.filter((e) => isFinite(e.percorso)).map((e) => `${e.rinculo ? `il nucleo di ${e.particella} che rincula` : e.particella === 'alfa' ? 'una particella α' : e.particella === 'elettrone' ? 'un elettrone' : e.particella === 'fotone γ' ? 'un fotone γ' : `un ${e.particella}`} (${fmt(e.energia >= 0.1 ? e.energia : e.energia * 1000)} ${e.energia >= 0.1 ? 'MeV' : 'keV'}${e.massima ? ` in media, al più ${fmt(e.massima)}` : ''}, percorso ${fmtLunghezza(e.percorso)})`).join(', ')}${chi.tipo === 'β' || chi.tipo === 'cattura' ? ', e un neutrino che esce senza toccare niente' : ''}${el?.fotoniAlMetro > 0 ? `. Finché ha più di ${fmt(el.soglia)} MeV l'elettrone supera la luce in questo mezzo e accende una scia di luce Cherenkov` : ''}`;
  }
  const tempo = Math.round(4 + limita((1.4 * tStop) / u.tu, 40, 6000));
  const cella = scheletro(luogo, m, u, latoM, tempo, ce, { specie: cat, sorgenti, mezzo: mezzoMotore(m, u, latoM, { taglio }) });
  cella.scala.attesa = data; cella.scala.ritmo = ritmo;
  if (sorgenti[0].emissione.dal !== 'bordo') cella.finestra.centro = sorgenti[0].pos.map((x) => Math.round(limita(x, 200, 800))); // la finestra guarda dove accade
  if (cella.mezzo.n) cella.scala.fotoniPerLinea = fotoniVeri(m) * cella.mezzo.ogniFotone * u.l; // quanti fotoni veri sta per ogni linea di luce disegnata (a β = 1)
  cella.indirizzo = { ...(via || {}), luogo: luogo.indirizzo || null, materia: m.nome, modo: 'istante', latoM, processo: chi.id, evento, data };
  const attese = src.attesa(latoM), nome = `${luogo.nome || m.nome}, ${fmtLunghezza(latoM)}: ${chi.tipo === 'cosmico' ? chi.id : chi.origine}`;
  const frasi = [`Un cubo di ${luogo.nome || m.nome} largo ${fmtLunghezza(latoM)}${luogo.profonditaM > 0 ? `, ${fmtLunghezza(luogo.profonditaM)} sotto la superficie` : ''}.`, `${frase}.`,
    `Quanto è raro: in questo volume ${scelto ? 'un evento così' : 'un evento qualsiasi'} accade ogni ${fmtTempo(1 / ritmo)}; questo è il ${evento + 1}° da quando si comincia a guardare, dopo ${fmtTempo(data)}. Dura ${fmtTempo(tempo * u.tu)}: è tutta l'esposizione.`,
    `Che cos'altro accade qui: ${attese.slice(0, 5).map((a) => a.frase).join('; ')}.`, src.neutrini.frase];
  return { cella, nome, nota: frasi.join(' '), racconto: { titolo: nome, frasi, attese, veri: { ritmo, data, processo: chi.id } } };
}

// ---------- LA MEMORIA: ciò che un minerale ha registrato in milioni di anni
function cellaMemoria(luogo, { latoM = null, esposizione = null, ospite = null, granello, massimo = 160, via = null } = {}, c) {
  if (luogo.tipo === 'acqua' || luogo.tipo === 'aria') throw new Error(`cellaMateria: ${luogo.tipo === 'acqua' ? "nell'acqua" : "nell'aria"} non resta memoria: si guarda un evento (modo: 'istante')`);
  const minerali = luogo.minerali || [], acc = luogo.accessori || [], ha = (n) => minerali.some((x) => x.nome === n) || acc.some((x) => x.nome === n);
  ospite ??= ha('biotite') ? 'biotite' : acc.find((x) => MATERIALI[x.nome]?.ricottura)?.nome || minerali[0]?.nome;
  if (granello === undefined) granello = ['zircone', 'monazite', 'apatite'].find((n) => n !== ospite && ha(n)) || null;
  const mO = mezzo(ospite), mG = granello ? mezzo(granello) : null, eta = luogo.etaPianeta ?? ETA_RIFERIMENTO;
  latoM ??= granello ? 120e-6 : 60e-6; const u = unita(latoM), rG = granello ? 1e-6 * Math.pow(6, c('granello/raggio')) : 0, rGu = rG / u.l;
  const alone = ritenzione(luogo, ospite, 'alone'), fiss = ritenzione(luogo, ospite, 'fissione'), tA = Math.min(alone.anni, esposizione ?? Infinity), tF = Math.min(fiss.anni, esposizione ?? Infinity);
  // quanti decadimenti: nel granello (tutta la sua massa) e nell'ospite (una fetta spessa quanto il granello)
  const attG = granello ? attivita({ tipo: 'roccia', elementi: { ...concentrazioni(luogo, granello), K: 0, Rb: 0 }, etaPianeta: eta }) : [], attO = attivita({ tipo: 'roccia', elementi: concentrazioni(luogo, ospite), etaPianeta: eta });
  const massaG = granello ? mG.densita * 1000 * (4 / 3) * Math.PI * rG ** 3 : 0, spessore = granello ? 2 * rG : latoM / 20, massaO = mO.densita * 1000 * latoM * latoM * spessore;
  // (nel passato ce n'era di più: il numero di decadimenti in t anni è quello di oggi per (e^(λt) − 1)/(λt))
  const cresce = (a, t) => { const capo = a.catena ? CATENE[a.catena].mezza : a.mezza, x = (Math.LN2 * t) / capo; return x > 1e-6 ? Math.expm1(x) / x : 1; };
  const conta2 = (att, massa, tipo, t) => att.filter((a) => a.tipo === tipo).map((a) => ({ a, n: a.perKg * massa * t * ANNO * cresce(a, t) }));
  const alfaG = conta2(attG, massaG, 'α', tA), alfaO = conta2(attO, massaO, 'α', tA), fisG = conta2(attG, massaG, 'fissione', tF), fisO = conta2(attO, massaO, 'fissione', tF), som = (l) => l.reduce((s, x) => s + x.n, 0);
  const vereA = som(alfaG) + som(alfaO), vereF = som(fisG) + som(fisO), maxA = Math.round(0.8 * massimo), maxF = massimo - maxA;
  const nA = vereA <= maxA ? conta(c, 'quante α', vereA) : maxA, nF = Math.min(maxF, conta(c, 'quante fissioni', vereF));
  const cat = catalogoMateria(mO, u), sorgenti = [], Tsparso = 120;
  const pesca = (liste, k, nome) => { const tot = liste.reduce((s, l) => s + som(l), 0); let r = c(`${nome} ${k}/quale`) * tot; for (let j = 0; j < liste.length; j++) for (const x of liste[j]) { r -= x.n; if (r < 0) return { a: x.a, nelGranello: j === 0 }; } const l = liste.find((q) => q.length); return { a: l[l.length - 1].a, nelGranello: l === liste[0] }; };
  const dove = (k, nome, nelGranello) => { if (nelGranello) { const r = rGu * Math.sqrt(c(`${nome} ${k}/dove/r`)), f = DUE_PI * c(`${nome} ${k}/dove/fi`); return [LATO / 2 + r * Math.cos(f), LATO / 2 + r * Math.sin(f)]; } for (let j = 0; ; j++) { const p = [LATO * c(`${nome} ${k}/dove/x${j}`), LATO * c(`${nome} ${k}/dove/y${j}`)]; if (j > 8 || Math.hypot(p[0] - LATO / 2, p[1] - LATO / 2) > rGu) return p; } };
  const metti = (k, nome, liste, t) => { const { a, nelGranello } = pesca(liste, k, nome), specie = nucleoChe(a, cat, mO, u, c.sotto(`${nome} ${k}`));
    sorgenti.push({ pos: dove(k, nome, nelGranello), dir: 0, v: termica(a.A, luogo.T ?? 288), t0: 0, specie, emissione: { dir: [0, DUE_PI], t0: [0, Tsparso] }, origine: `${sorgenteDi(a)}, ${nelGranello ? `nel granello di ${granello}` : `nella ${ospite}`}`, processo: `${a.nuclide} ${a.tipo}`, nuclide: a.nuclide, memoria: t }); };
  const sorgenteDi = (a) => (a.tipo === 'fissione' ? "fissione spontanea dell'uranio-238" : `decadimento α ${del(a.nuclide)}${a.catena && a.catena !== a.nuclide ? ` (catena ${del(a.catena)})` : ''}`);
  if (vereA > 0) for (let k = 0; k < nA; k++) metti(k, 'α', [alfaG, alfaO], tA);
  if (vereF > 0) for (let k = 0; k < nF; k++) metti(k, 'fissione', [fisG, fisO], tF);
  const tStop = Math.max(percorso('alfa', 8.8, mO).secondi, percorso({ Z: 54, A: 140 }, 70, mO).secondi), tempo = Math.round(Tsparso + limita((1.4 * tStop) / u.tu, 40, 6000));
  const cella = scheletro(luogo, mO, u, latoM, tempo, c, { specie: cat, sorgenti, mezzo: mezzoMotore(mO, u, latoM, { cherenkov: false }), pellicola: { ...PELLICOLA, w0: 0.07 } }); // (pellicola fine: i frammenti di fissione, venti volte più carichi di una α, lasciano una traccia venti volte più larga)
  // il granello: un altro mezzo (più denso: frena di più), nello stesso posto per tutte le tracce
  if (granello && rGu > 0.5) cella.domini.push({ forma: { tipo: 'cerchio', centro: [LATO / 2, LATO / 2], r: +rGu.toFixed(3) }, K: +(perdita('alfa', 5, mG).alMetro / perdita('alfa', 5, mO).alMetro).toFixed(4) });
  cella.scala.esposizioneAnni = Math.max(tA, tF); cella.scala.sparso = Tsparso; cella.scala.compressione = (Math.max(tA, tF) * ANNO) / (Tsparso * u.tu);
  cella.indirizzo = { ...(via || {}), luogo: luogo.indirizzo || null, materia: ospite, modo: 'memoria', latoM, granello, raggioGranelloM: rG };
  const anelli = granello && tA > 0 ? aloni(luogo, { ospite, granello, raggioM: rG, N: 0 }).anelli : [];
  const nome = `${ospite}${granello ? ` attorno a un granello di ${granello}` : ''}, ${fmtLunghezza(latoM)}: la memoria di ${fmtTempo(Math.max(tA, tF) * ANNO)}`;
  const cg = granello ? concentrazioni(luogo, granello) : null;
  const frasi = [`Una sezione sottile di ${ospite} larga ${fmtLunghezza(latoM)}${granello ? `, con al centro un granello di ${granello} di ${fmtLunghezza(2 * rG)} (uranio ${fmt(cg.U * 1e6)} ppm, torio ${fmt(cg.Th * 1e6)} ppm: li concentra ${fmt(MATERIALI[granello].concentra.U)} e ${fmt(MATERIALI[granello].concentra.Th)} volte)` : ''}.`,
    alone.registra ? (tA > 0 ? `Gli aloni: ${alone.perche}. In quel tempo il granello ha emesso ${fmt(som(alfaG))} particelle α${vereA > maxA ? ` (se ne disegnano ${nA}: una ogni ${fmt(vereA / nA)})` : ''}; ognuna si ferma dove finisce la sua energia, e lì annerisce la mica: ${anelli.length ? `anelli a ${anelli.filter((a) => !a.debole).map((a) => fmt(a.raggioM * 1e6, 2)).join(', ')} µm dal centro (${anelli.filter((a) => !a.debole).map((a) => a.nuclidi.join('+')).join('; ')})` : 'nessun anello'}.` : `Niente aloni: ${alone.perche}.`) : `Le α qui non lasciano un segno che duri (${alone.perche}).`,
    fiss.registra ? (tF > 0 ? `Le tracce di fissione: ${fiss.perche}; in questa fetta ${fmt(vereF)} fissioni spontanee dell'uranio-238 (${nF} disegnate): due frammenti schiena contro schiena, ${fmtLunghezza(percorso({ Z: 38, A: 96 }, 100, mO).m + percorso({ Z: 54, A: 140 }, 70, mO).m)} in tutto.` : `Niente tracce di fissione: ${fiss.perche}.`) : `Le tracce di fissione qui non si conservano (${fiss.perche}).`,
    ...(sorgenti.length ? [`Il tempo è compresso ${fmt(cella.scala.compressione)} volte: ogni evento dura picosecondi e ha la sua data vera, sparsa nella memoria del minerale (eventiDi).`] : ['Non c\'è niente da vedere: questa roccia non ricorda.'])];
  return { cella, nome, nota: frasi.join(' '), racconto: { titolo: nome, frasi, attese: [], veri: { alfa: vereA, alfaDisegnate: nA, fissioni: vereF, fissioniDisegnate: nF, anniAlone: tA, anniFissione: tF, anelli } } };
}
// le date vere degli eventi di una cella (e dei suoi rami): per ogni sorgente quando è partita nel motore e, nel modo
// memoria, quanti anni fa è accaduta davvero (il tempo dell'esposizione è sparso in modo uniforme sulla memoria)
export function eventiDi(cella) {
  return (cella.sorgenti || []).map((s, i) => {
    let t0 = s.t0 ?? 0, dir = s.dir ?? 0;
    if (s.emissione) { const ce = casoEvento(cella.seme ?? 1, `${i}|emissione`, (cella.rami || {})[`${i}`] ?? 0), est = (x, d) => (Array.isArray(x) ? x[0] + ce() * (x[1] - x[0]) : x ?? d); dir = est(s.emissione.dir, dir); t0 = est(s.emissione.t0, t0); }
    return { indice: i, evento: `${i}`, processo: s.processo, origine: s.origine, t0, direzione: dir, ...(s.memoria != null ? { anniFa: s.memoria * (1 - t0 / (cella.scala?.sparso || 1)) } : { secondi: (cella.scala?.attesa ?? 0) + t0 * (cella.scala.secondi / cella.tempo) }) };
  });
}

// ---------- LO SCIAME di un raggio cosmico nell'aria, su chilometri: la sua impronta al suolo è un disegno alla scala del paesaggio
function cellaSciame(luogo, { latoM = null, evento = 0, sopra = 20, fino = 300, via = null } = {}, c) {
  const ariaQui = luogo.tipo === 'aria' ? luogo : { ...luogo, tipo: 'aria', nome: 'aria', sopra: {}, minerali: undefined }, rc = raggiCosmici(ariaQui), m = mezzo({ tipo: 'aria', aria: ariaQui.aria });
  if (!(rc.colonnaAria > 30)) throw new Error("cellaMateria: qui non c'è abbastanza aria per uno sciame: i primari arrivano al suolo (processo: 'raggio cosmico primario')");
  const H = rc.scalaAltezza; latoM ??= Math.round((H * Math.log(rc.colonnaAria / 5)) / 0.92 / 1000) * 1000; const u = unita(latoM), ce = c.sotto(`sciame ${evento}`);
  // l'energia del primario: dallo spettro sopra il pianeta, tra quelli con più di «sopra» GeV (sotto, lo sciame si spegne in alto)
  // e meno di «fino» (i più energici sono rarissimi, e il loro sciame ha decine di migliaia di particelle: chi li vuole alzi «fino»)
  const quantile = (GeV) => { let lo = 0, hi = 1; for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if (rc.primarioTipico(mid) < GeV) lo = mid; else hi = mid; } return hi; };
  const qa = quantile(sopra), qb = Math.max(qa, quantile(Math.max(fino, sopra * 1.01))), E = rc.primarioTipico(qa + (qb - qa) * ce('energia')) * 1000, ritmo = rc.primari * (qb - qa) * latoM * latoM;
  let data = 0; for (let k = 0; k <= evento; k++) data += -Math.log(1 - c(`sciame ${k}/attesa`)) / ritmo;
  const cat = catalogoMateria(m, u, { sciame: true }), suolo = 0.94 * LATO, strati = 16, domini = [];
  // l'aria a strati: la densità cala con la quota come e^(−h/H); sotto, il suolo
  for (let j = 0; j < strati; j++) { const y0 = (suolo * j) / strati, y1 = (suolo * (j + 1)) / strati, h = (suolo - (y0 + y1) / 2) * u.l; domini.push({ forma: { tipo: 'poligono', punti: [[-1, y0], [LATO + 1, y0], [LATO + 1, y1], [-1, y1]] }, K: +Math.exp(-h / H).toPrecision(5) }); }
  domini.push({ forma: { tipo: 'poligono', punti: [[-1, suolo], [LATO + 1, suolo], [LATO + 1, LATO + 1], [-1, LATO + 1]] }, K: Math.round(2700 / (m.densita * 1000)), suolo: true });
  const th = ce.tra('angolo', -0.5, 0.5), tempo = Math.round(4 + (1.5 * LATO) / C_MOTORE + 20);
  const sorgenti = [{ pos: [LATO / 2, 1], dir: Math.PI / 2 + th, v: C_MOTORE * Math.sqrt(1 - 1 / (1 + E / 938.272) ** 2), gamma: 1 + E / 938.272, t0: 0, specie: 'protone', emissione: { dal: 'bordo', u: [0.3, 0.7], t0: [0, 3] }, energia: E, processo: 'sciame',
    origine: `raggio cosmico primario da ${fmt(E / 1000)} GeV${luogo.raggi?.origine ? `, ${luogo.raggi.origine}` : ''}` }];
  const cella = scheletro(ariaQui, m, u, latoM, tempo, ce, { specie: cat, sorgenti, domini, mezzo: mezzoMotore(m, u, latoM, { cherenkov: false }) });
  cella.scala.attesa = data; cella.scala.ritmo = ritmo; cella.scala.suolo = suolo; cella.scala.scalaAltezza = H;
  cella.indirizzo = { ...(via || {}), luogo: luogo.indirizzo || null, materia: 'aria', modo: 'istante', latoM, processo: 'sciame', evento, data };
  const nome = `aria, ${fmtLunghezza(latoM)}: lo sciame di un raggio cosmico da ${fmt(E / 1000)} GeV`;
  const frasi = [`Una fetta d'aria alta e larga ${fmtLunghezza(latoM)}, dal suolo (la fascia in basso) fin dove resta ${fmt((rc.colonnaAria * Math.exp(-(suolo * u.l) / H)))} g/cm² d'aria sopra; la densità cala con la quota (scala ${fmtLunghezza(H)}).`,
    `Un protone da ${fmt(E / 1000)} GeV entra dall'alto. In media urta un nucleo dell'aria dopo ${fmt(m.lambdaNucleare)} g/cm² (a ${fmt(rc.quotaNascita / 1000)} km di quota): ne escono pioni. Quelli neutri diventano subito due fotoni, che fanno coppie di elettroni e positroni, che irraggiano altri fotoni: la cascata cresce finché l'energia di ognuno scende sotto ${fmt(710 / (m.z2suA / m.ZsuA + 0.92))} MeV, poi si spegne. Quelli carichi decadono in muoni, che arrivano al suolo e lo attraversano.`,
    `Quanto è raro: sopra questo quadrato di ${fmtLunghezza(latoM)} di lato un primario tra ${fmt(sopra)} e ${fmt(fino)} GeV arriva ogni ${fmtTempo(1 / ritmo)}; lo sciame dura ${fmtTempo(tempo * u.tu)}.`,
    `Al suolo, su tutto il pianeta lì: ${fmt(rc.muoni / 1e4 * 60)} muoni per cm² al minuto (soglia del campo: ${fmt(rc.soglia)} GV).`];
  return { cella, nome, nota: frasi.join(' '), racconto: { titolo: nome, frasi, attese: [], veri: { ritmo, data, energiaGeV: E / 1000 } } };
}
// l'impronta al suolo di uno sciame simulato: dove e quando ogni particella carica tocca terra → [{ x (m dal centro), t (s), specie }]
export function improntaAlSuolo(tracce, cella) {
  const ys = cella.scala?.suolo; if (!ys) return []; const l = cella.scala.latoM / cella.larghezza, tu = cella.scala.secondi / cella.tempo, out = [];
  for (const tr of tracce) { if (tr.sagoma) continue; const P = tr.punti; for (let i = 1; i < P.length; i++) if (P[i - 1][1] < ys && P[i][1] >= ys) { const f = (ys - P[i - 1][1]) / (P[i][1] - P[i - 1][1]); out.push({ x: (P[i - 1][0] + f * (P[i][0] - P[i - 1][0]) - cella.larghezza / 2) * l, t: (P[i - 1][3] + f * (P[i][3] - P[i - 1][3])) * tu, specie: tr.specie.nome }); break; } }
  return out.sort((a, b) => a.x - b.x);
}
// (gli aloni, qui sotto, servono anche al racconto della memoria)

// =====================================================================================
// 8. LA MEMORIA DEI MINERALI: aloni pleocroici e tracce fossili (il disegno accumulato)
// =====================================================================================
const COLORI_MINERALI = { biotite: [150, 108, 62], apatite: [214, 222, 202], zircone: [206, 192, 168], monazite: [196, 150, 84], quarzo: [226, 222, 214], 'feldspato potassico': [218, 186, 168], plagioclasio: [206, 204, 197] };
// (α per cm²) la fluenza a cui la biotite comincia a colorarsi. Poi il buio cresce come il logaritmo della dose (come una
// lastra fotografica) fino a saturare mille volte più su: PARAMETRO della resa, scelto perché i gradini degli anelli si
// leggano anche negli aloni vecchi (dove un annerimento proporzionale alla dose sarebbe tutto nero)
const DOSE_COLORE = 3e13;
// l'energia a cui una α frena di più in un mezzo (il picco di Bragg): lì, poco prima di fermarsi, lascia più energia
function picco(m) { let best = 0.5, s = 0; for (let E = 0.2; E < 3; E *= 1.06) { const f = frenata(particella('alfa'), E, m).elettronica; if (f > s) { s = f; best = E; } } return best; }
// GLI ALONI attorno a un granello ricco di uranio e torio dentro un minerale che si colora (la biotite). Ogni passo α della
// catena ha la sua energia, quindi il suo percorso: la α lascia il massimo di energia poco prima di fermarsi (picco di
// Bragg), e lì, a forza di α, il minerale annerisce: un anello per ogni energia. Quanto è scuro: quante α per cm² sono
// passate (rispetto alla dose che colora), nel tempo in cui il minerale ha tenuto memoria.
//   ospite, granello, raggioM (del granello; se manca: 1 µm), N (lato dell'immagine; 0: niente immagine), latoM
// → { anelli: [{ raggioM, fineM (dove finisce il percorso), nuclidi, energia (MeV), quante }], profilo: { r, oscuramento }, immagine (RGBA N×N), N, latoM, alfa, anni, perche, descrizione }
export function aloni(luogo, { ospite = 'biotite', granello = 'zircone', raggioM = 1e-6, N = 192, latoM = null, esposizione = null } = {}) {
  const mO = mezzo(ospite), mG = mezzo(granello), rit = ritenzione(luogo, ospite, 'alone'), t = Math.min(rit.anni, esposizione ?? Infinity), eta = luogo.etaPianeta ?? ETA_RIFERIMENTO, pa = particella('alfa');
  const att = attivita({ tipo: 'roccia', elementi: { ...concentrazioni(luogo, granello), K: 0, Rb: 0 }, etaPianeta: eta }).filter((a) => a.tipo === 'α'), massa = mG.densita * 1000 * (4 / 3) * Math.PI * raggioM ** 3;
  const EB = picco(mO), RB = percorso(pa, EB, mO).m, kG = perdita(pa, 5, mG).alMetro / perdita(pa, 5, mO).alMetro, dentro = 0.75 * raggioM; // (la strada media dentro il granello, che frena kG volte di più)
  const sorg = att.map((a) => { const cap = CATENE[a.catena].mezza, x = (Math.LN2 * t) / cap; return { a, quante: a.perKg * massa * t * ANNO * (x > 1e-6 ? Math.expm1(x) / x : 1), R: percorso(pa, a.energia, mO).m }; }).filter((s) => s.quante > 0);
  // gli anelli: la fascia scura di ogni energia sta tra il massimo della ionizzazione (il picco di Bragg) e la fine del
  // percorso; il raggio che si misura al microscopio è il suo mezzo. Quelli più vicini di quanto il granello li sfumi si fondono
  const grezzi = sorg.map((s) => ({ raggioM: s.R - RB / 2 - (kG - 1) * dentro, fineM: s.R - (kG - 1) * dentro, nuclidi: [s.a.nuclide], energia: s.a.energia, quante: s.quante })).filter((x) => x.raggioM > 0).sort((p, q) => p.raggioM - q.raggioM), anelli = [], fonde = Math.max(0.5e-6, 0.6 * raggioM);
  for (const g of grezzi) { const u = anelli[anelli.length - 1]; if (u && g.raggioM - u.raggioM < fonde) { u.raggioM = (u.raggioM * u.quante + g.raggioM * g.quante) / (u.quante + g.quante); u.fineM = Math.max(u.fineM, g.fineM); u.quante += g.quante; u.nuclidi.push(...g.nuclidi); } else anelli.push({ ...g, nuclidi: [...g.nuclidi] }); }
  // (gli anelli dell'uranio-235, che è lo 0,7% dell'uranio, ci sono ma non si vedono: «debole»)
  { const forte = anelli.reduce((x, a) => Math.max(x, a.quante), 0); for (const a of anelli) a.debole = a.quante < 0.2 * forte; }
  // il profilo: la fluenza equivalente (α per cm², pesate con l'energia che lasciano lì) a ogni distanza dal centro
  const Rmax = sorg.reduce((x, s) => Math.max(x, s.R), 0), nr = 400, dr = (Rmax * 1.15 || 1e-6) / nr, r = new Float64Array(nr), F = new Float64Array(nr), osc = new Float64Array(nr), Sref = frenata(pa, 5, mO).elettronica, sfuma = [-0.8, -0.4, 0, 0.4, 0.8];
  for (let i = 0; i < nr; i++) { r[i] = (i + 0.5) * dr; for (const s of sorg) for (const d of sfuma) { const x = r[i] + (kG - 1) * dentro + d * raggioM; if (x <= 0 || x >= s.R) continue; const E = energiaDopo(pa, s.a.energia, mO, x); if (E > 0) F[i] += ((s.quante / sfuma.length) / (4 * Math.PI * (r[i] * 100) ** 2)) * (frenata(pa, E, mO).elettronica / Sref); } osc[i] = Math.min(1, Math.log10(1 + F[i] / DOSE_COLORE) / 3); }
  const alfa = sorg.reduce((x, s) => x + s.quante, 0); latoM ??= Math.max(2.5 * Rmax, 20e-6);
  let immagine = null;
  if (N > 0) { immagine = new Uint8ClampedArray(N * N * 4); const base = COLORI_MINERALI[ospite] || [200, 190, 170], cg = COLORI_MINERALI[granello] || [200, 200, 200];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const d = Math.hypot(x + 0.5 - N / 2, y + 0.5 - N / 2) * (latoM / N), k = (y * N + x) * 4, i = Math.min(nr - 1, Math.floor(d / dr)), o = d < Rmax * 1.15 ? osc[i] : 0, col = d < raggioM ? cg : base;
      for (let j = 0; j < 3; j++) immagine[k + j] = col[j] * (1 - 0.88 * (d < raggioM ? 0 : o)); immagine[k + 3] = 255; } }
  const descrizione = t > 0 && alfa > 0 ? `un granello di ${granello} di ${fmtLunghezza(2 * raggioM)} dentro la ${ospite}: in ${fmtTempo(t * ANNO)} ha emesso ${fmt(alfa)} particelle α; ${anelli.filter((a) => !a.debole).length} anelli, da ${fmt(anelli[0].raggioM * 1e6)} a ${fmt(anelli[anelli.length - 1].raggioM * 1e6)} µm` : `nessun alone: ${rit.perche}`;
  return { anelli: t > 0 ? anelli : [], profilo: { r, fluenza: F, oscuramento: osc }, immagine, N, latoM, alfa: t > 0 ? alfa : 0, anni: t, perche: rit.perche, piccoBragg: EB, descrizione };
}
// LE TRACCE FOSSILI su una superficie interna (lucidata) di un minerale: quelle di fissione (ogni fissione spontanea
// dell'uranio-238 lascia una scia di cristallo distrutto lunga quanto i percorsi dei due frammenti) o quelle di rinculo α.
// Quante attraversano un cm² di superficie: (fissioni per cm³) × (metà della lunghezza della traccia): è la relazione
// della datazione, densità = età × uranio × costante di fissione × percorso. Ognuna ha la sua data vera.
//   minerale ('apatite', 'zircone', 'biotite'), latoM, N (0: niente immagine), tipo: 'fissione' | 'rinculo', massimo (tracce elencate)
// → { densita (per cm²), attese, quante, tracce: [{ x, y, dx, dy (m), lunghezza, anniFa }], immagine, N, latoM, anni, uranioPpm, percorsoM, perche, descrizione }
export function tracceFossili(luogo, { minerale = 'apatite', latoM = 200e-6, N = 192, tipo = 'fissione', massimo = 5000, esposizione = null, uranio = null } = {}, caso = null) {
  const c = (caso || sorgente(luogo.indirizzo || 'materia')).sotto(`tracce/${minerale}/${tipo}/${latoM.toExponential(2)}`), m = mezzo(minerale), rit = ritenzione(luogo, minerale, tipo), t = Math.min(rit.anni, esposizione ?? Infinity), eta = luogo.etaPianeta ?? ETA_RIFERIMENTO;
  const conc = uranio != null ? { U: uranio, Th: 0, K: 0, Rb: 0 } : { ...concentrazioni(luogo, minerale), K: 0, Rb: 0 }, att = attivita({ tipo: 'roccia', elementi: conc, etaPianeta: eta });
  const cap = (a) => { const x = (Math.LN2 * t) / CATENE[a.catena].mezza; return x > 1e-6 ? Math.expm1(x) / x : 1; };
  let perCm3, lunga;
  if (tipo === 'fissione') { const a = att.find((x) => x.tipo === 'fissione'); perCm3 = a ? a.perKg * m.densita * 1e-3 * t * ANNO * cap(a) : 0; lunga = percorso({ Z: 38, A: 96 }, 99, m).m + percorso({ Z: 54, A: 140 }, 68, m).m; }
  else { const capi = att.filter((x) => x.tipo === 'α' && x.nuclide === x.catena); perCm3 = capi.reduce((s, a) => s + a.perKg * m.densita * 1e-3 * t * ANNO * cap(a), 0); lunga = 2 * percorso({ Z: 90, A: 234 }, 0.072, m).m; }
  const densita = perCm3 * (lunga * 100) / 2, attese = densita * (latoM * 100) ** 2, quante = conta(c, 'quante', attese), n = Math.min(quante, massimo), tracce = [];
  for (let k = 0; k < n; k++) {
    // l'inclinazione: le tracce che tagliano un piano sono più spesso quelle ripide (∝ cos θ); la parte che sta sotto il piano è a caso
    const cos = Math.sqrt(c(`t${k}/inclinazione`)), sin = Math.sqrt(1 - cos * cos), fi = DUE_PI * c(`t${k}/giro`), vista = lunga * c(`t${k}/sotto`) * sin;
    tracce.push({ x: latoM * c(`t${k}/x`), y: latoM * c(`t${k}/y`), dx: vista * Math.cos(fi), dy: vista * Math.sin(fi), lunghezza: lunga, anniFa: t * c(`t${k}/quando`) });
  }
  let immagine = null;
  if (N > 0) { immagine = new Uint8ClampedArray(N * N * 4); const base = COLORI_MINERALI[minerale] || [210, 205, 195], scuro = new Float32Array(N * N), px = N / latoM;
    for (const tr of tracce) { const passi = Math.max(1, Math.ceil(Math.hypot(tr.dx, tr.dy) * px * 2)); for (let i = 0; i <= passi; i++) { const X = Math.floor((tr.x + (tr.dx * i) / passi) * px), Y = Math.floor((tr.y + (tr.dy * i) / passi) * px); if (X >= 0 && Y >= 0 && X < N && Y < N) scuro[Y * N + X] = Math.min(1, scuro[Y * N + X] + 0.7 * (1 - (0.6 * i) / passi)); } }
    for (let k = 0; k < N * N; k++) { for (let j = 0; j < 3; j++) immagine[k * 4 + j] = base[j] * (1 - 0.85 * scuro[k]); immagine[k * 4 + 3] = 255; } }
  const descrizione = t > 0 ? `${minerale} con ${fmt(conc.U * 1e6)} ppm di uranio: ${fmt(densita)} tracce di ${tipo === 'fissione' ? 'fissione' : 'rinculo α'} per cm² in ${fmtTempo(t * ANNO)} (${rit.perche}); in questo quadrato di ${fmtLunghezza(latoM)} ce ne sono ${quante}` : `nessuna traccia: ${rit.perche}`;
  return { densita, attese, quante, tracce, immagine, N, latoM, anni: t, uranioPpm: conc.U * 1e6, percorsoM: lunga, perche: rit.perche, descrizione };
}
// la datazione: dall'uranio (ppm) e dalla densità di tracce di fissione (per cm²) all'età (anni). È la stessa relazione, letta al contrario.
export function etaDaTracce(densita, uranioPpm, minerale = 'apatite', etaPianeta = ETA_RIFERIMENTO) {
  const m = mezzo(minerale), c = CATENE['uranio-238'], atomi = ((uranioPpm * 1e-6 * m.densita) / 238.03) * N_A * c.abbondanza * quantoResta(c.mezza, etaPianeta), lunga = (percorso({ Z: 38, A: 96 }, 99, m).m + percorso({ Z: 54, A: 140 }, 68, m).m) * 100, lam = Math.LN2 / c.mezza;
  return Math.log(1 + (densita * lam) / (atomi * c.fissione * (lunga / 2))) / lam;
}

// =====================================================================================
// 9. IL CRISTALLO VISTO DALLE PARTICELLE: reticoli, atomi, incanalamento
// =====================================================================================
// LE CELLE ELEMENTARI (dati misurati). cella: [a, b, c (Å), α, β, γ (gradi)]; ops: le operazioni del gruppo spaziale; centri:
// le traslazioni del reticolo centrato; atomi: [elemento, x, y, z (frazioni della cella), occupazione] per ogni posto
// indipendente. Controllo fatto su ognuna: le distanze di legame che ne escono (Si–O 1,60–1,65 Å; C–O 1,281; Na–Cl 2,820;
// O–O del ghiaccio 2,76; K–O 2,96 e 3,30 nella mica…) e la densità della cella (entro l'1–2% da quella misurata).
const CENTRO_C = [[0, 0, 0], [0.5, 0.5, 0]], CENTRO_F = [[0, 0, 0], [0, 0.5, 0.5], [0.5, 0, 0.5], [0.5, 0.5, 0]], CENTRO_R = [[0, 0, 0], [2 / 3, 1 / 3, 1 / 3], [1 / 3, 2 / 3, 2 / 3]];
const OPS_C2M = ['x,y,z', '-x,y,-z', '-x,-y,-z', 'x,-y,z'], T_FELDSPATO = [['Si', 0.0097, 0.185, 0.2233], ['Si', 0.7089, 0.1178, 0.3444], ['O', 0, 0.1472, 0], ['O', 0.6343, 0, 0.2858], ['O', 0.8273, 0.1469, 0.2253], ['O', 0.0347, 0.31, 0.2579], ['O', 0.1793, 0.1269, 0.4024]];
export const RETICOLI = {
  quarzo: { sistema: 'trigonale', gruppo: 'P3₁21', cella: [4.9134, 4.9134, 5.4052, 90, 90, 120], fonte: 'Levien, Prewitt e Weidner 1980', asse: 'c', formula: 3,
    ops: ['x,y,z', '-y,x-y,z+1/3', '-x+y,-x,z+2/3', 'y,x,-z', 'x-y,-y,-z+2/3', '-x,-x+y,-z+1/3'], atomi: [['Si', 0.4697, 0, 1 / 3], ['O', 0.4135, 0.2669, 0.2142]] },
  salgemma: { sistema: 'cubico', gruppo: 'Fm3̄m', cella: [5.6402, 5.6402, 5.6402, 90, 90, 90], fonte: 'CRC Handbook; Wyckoff 1963', asse: 'a', formula: 4, ops: ['x,y,z'], centri: CENTRO_F, atomi: [['Na', 0, 0, 0], ['Cl', 0.5, 0.5, 0.5]] },
  'ghiaccio d\'acqua': { sistema: 'esagonale', gruppo: 'P6₃/mmc', cella: [4.5181, 4.5181, 7.356, 90, 90, 120], fonte: 'Röttger e altri 1994 (ghiaccio Ih a 250 K)', asse: 'c', formula: 4,
    ops: ['x,y,z', '-x,-y,z+1/2', '-x,-y,-z', 'x,y,-z+1/2'], atomi: [['O', 1 / 3, 2 / 3, 0.0623]], idrogeno: true },
  calcite: { sistema: 'trigonale', gruppo: 'R3̄c', cella: [4.9896, 4.9896, 17.061, 90, 90, 120], fonte: 'Markgraf e Reeder 1985', asse: 'c', formula: 6, centri: CENTRO_R,
    ops: ['x,y,z', '-y,x-y,z', '-x+y,-x,z', '-x,-y,-z', 'y,-x+y,-z', 'x-y,x,-z', '-y,-x,z+1/2', '-x+y,y,z+1/2', 'x,x-y,z+1/2', 'y,x,-z+1/2', 'x-y,-y,-z+1/2', '-x,-x+y,-z+1/2'], atomi: [['Ca', 0, 0, 0], ['C', 0, 0, 0.25], ['O', 0.2568, 0, 0.25]] },
  olivina: { sistema: 'ortorombico', gruppo: 'Pbnm', cella: [4.7535, 10.1943, 5.9807, 90, 90, 90], fonte: 'Smyth e Hazen 1973 (forsterite)', asse: 'a', formula: 4,
    ops: ['x,y,z', '-x,-y,z+1/2', 'x+1/2,-y+1/2,-z', '-x+1/2,y+1/2,-z+1/2', '-x,-y,-z', 'x,y,-z+1/2', '-x+1/2,y+1/2,z', 'x+1/2,-y+1/2,z+1/2'],
    atomi: [['Mg', 0, 0, 0], ['Mg', 0.9915, 0.2774, 0.25], ['Si', 0.4262, 0.094, 0.25], ['O', 0.7657, 0.0913, 0.25], ['O', 0.2215, 0.4474, 0.25], ['O', 0.2777, 0.1628, 0.0331]] },
  pirosseno: { sistema: 'monoclino', gruppo: 'C2/c', cella: [9.746, 8.899, 5.251, 90, 105.63, 90], fonte: 'Cameron e altri 1973 (diopside)', asse: 'c', formula: 4, centri: CENTRO_C, ops: ['x,y,z', '-x,y,-z+1/2', '-x,-y,-z', 'x,-y,z+1/2'],
    atomi: [['Ca', 0, 0.3015, 0.25], ['Mg', 0, 0.9082, 0.25], ['Si', 0.2862, 0.0933, 0.2293], ['O', 0.1156, 0.0873, 0.1422], ['O', 0.3611, 0.25, 0.318], ['O', 0.3505, 0.0176, 0.9953]] },
  'feldspato potassico': { sistema: 'monoclino', gruppo: 'C2/m', cella: [8.539, 13.015, 7.179, 90, 115.99, 90], fonte: 'Phillips e Ribbe 1973 (sanidino; un quarto dei posti del silicio è alluminio)', asse: 'a', formula: 4, centri: CENTRO_C, ops: OPS_C2M, atomi: [['K', 0.284, 0, 0.1352], ...T_FELDSPATO] },
  plagioclasio: { sistema: 'triclino', gruppo: 'C1̄', cella: [8.142, 12.785, 7.159, 94.19, 116.61, 87.68], fonte: "cella dell'albite (Harlow e Brown 1980) con le coordinate del sanidino: stessa impalcatura, distorsioni di pochi centesimi di Å trascurate", asse: 'a', formula: 4, centri: CENTRO_C, ops: OPS_C2M, atomi: [['Na', 0.284, 0, 0.1352], ...T_FELDSPATO] },
  biotite: { sistema: 'monoclino', gruppo: 'C2/m', cella: [5.3078, 9.1901, 10.1547, 90, 100.08, 90], fonte: 'Hazen e Burnham 1973 (flogopite 1M; nella biotite metà del magnesio è ferro)', asse: 'c*', formula: 2, centri: CENTRO_C, ops: OPS_C2M,
    atomi: [['K', 0, 0.5, 0], ['Mg', 0, 0, 0.5], ['Mg', 0, 0.3333, 0.5], ['Si', 0.0757, 0.1669, 0.2254], ['O', 0.0185, 0, 0.1667], ['O', 0.3251, 0.231, 0.1654], ['O', 0.1304, 0.1672, 0.3907], ['O', 0.1329, 0.5, 0.399]] },
};
RETICOLI.ghiaccio = RETICOLI['ghiaccio d\'acqua'];
// raggi ionici (Å; Shannon 1976) e colori convenzionali dei modelli, per disegnare gli atomi
export const ATOMI_DISEGNO = { H: [0.3, [255, 255, 255]], C: [0.3, [144, 144, 144]], O: [1.4, [226, 64, 56]], Na: [1.02, [171, 92, 242]], Mg: [0.72, [138, 255, 0]], Al: [0.39, [191, 166, 166]], Si: [0.26, [240, 200, 160]], K: [1.38, [143, 64, 212]], Ca: [1.0, [61, 255, 0]], Fe: [0.78, [224, 102, 51]], Cl: [1.81, [31, 240, 31]] };
const GRADI = Math.PI / 180;
const leggiOp = (s) => { const f = s.split(',').map((t) => { const m = [0, 0, 0, 0]; t.replace(/([+-]?)(\d+\/\d+|\d*\.?\d+)?([xyz])?/g, (tutto, sg, num, v) => { if (!tutto) return ''; const k = (sg === '-' ? -1 : 1) * (num ? (num.includes('/') ? num.split('/')[0] / num.split('/')[1] : +num) : 1); if (v) m['xyz'.indexOf(v)] += k; else if (num) m[3] += k; return ''; }); return m; }); return (p) => f.map((m) => m[0] * p[0] + m[1] * p[1] + m[2] * p[2] + m[3]); };
const reticoliFatti = new Map();
// → { nome, sistema, gruppo, cella: { a, b, c, alfa, beta, gamma }, base: { A, B, C } (i tre spigoli, in Å), volume (Å³), atomi:
//     [{ el, f: [x, y, z] (frazioni), pos: [Å], occ }], formulePerCella, densita (g/cm³, dalla cella), asse (quello lungo cui la
//     figura d'incanalamento è più ricca), fonte }
export function reticolo(minerale) {
  if (reticoliFatti.has(minerale)) return reticoliFatti.get(minerale);
  const R = RETICOLI[minerale]; if (!R) throw new Error(`reticolo: non conosco la cella di «${minerale}» (ci sono: ${Object.keys(RETICOLI).join(', ')})`);
  const [a, b, c, al, be, ga] = R.cella, ca = Math.cos(al * GRADI), cb = Math.cos(be * GRADI), cg = Math.cos(ga * GRADI), sg = Math.sin(ga * GRADI), V = a * b * c * Math.sqrt(1 - ca * ca - cb * cb - cg * cg + 2 * ca * cb * cg);
  const base = { A: [a, 0, 0], B: [b * cg, b * sg, 0], C: [c * cb, (c * (ca - cb * cg)) / sg, V / (a * b * sg)] }, cart = (f) => [f[0] * base.A[0] + f[1] * base.B[0] + f[2] * base.C[0], f[1] * base.B[1] + f[2] * base.C[1], f[2] * base.C[2]];
  const ops = R.ops.map(leggiOp), atomi = [], uguali = (p, q) => [0, 1, 2].every((i) => { const d = Math.abs(p[i] - q[i]); return Math.min(d, 1 - d) < 1e-3; });
  for (const [el, x, y, z, occ = 1] of R.atomi) for (const o of ops) for (const t of R.centri || [[0, 0, 0]]) { const f = o([x, y, z]).map((v, i) => { let w = (v + t[i]) % 1; if (w < 0) w += 1; return w > 1 - 1e-6 ? 0 : w; }); if (!atomi.some((q) => q.el === el && uguali(q.f, f))) atomi.push({ el, f, pos: cart(f), occ }); }
  if (R.idrogeno) { // il ghiaccio: tra due ossigeni vicini c'è un idrogeno, vicino all'uno o all'altro (regole di Bernal e Fowler): mezzo atomo per posto, a 0,98 Å
    const O = atomi.filter((q) => q.el === 'O'); for (const p of O) for (const q of O) for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) { const g = cart([q.f[0] + i, q.f[1] + j, q.f[2] + k]), d = Math.hypot(g[0] - p.pos[0], g[1] - p.pos[1], g[2] - p.pos[2]); if (d > 0.1 && d < 3) { const pos = p.pos.map((v, n) => v + ((g[n] - v) * 0.98) / d); atomi.push({ el: 'H', f: null, pos, occ: 0.5 }); } } }
  let massa = 0; for (const q of atomi) massa += ELEMENTI[q.el].A * q.occ;
  const out = { nome: minerale, sistema: R.sistema, gruppo: R.gruppo, cella: { a, b, c, alfa: al, beta: be, gamma: ga }, base, volume: V, atomi, formulePerCella: R.formula, densita: massa / (0.602214 * V), asse: R.asse, fonte: R.fonte };
  reticoliFatti.set(minerale, out); return out;
}
// L'AGITAZIONE TERMICA (Debye-Waller): lo scarto quadratico medio di un atomo di massa M (u) lungo una direzione, in Å, a
// temperatura T, in un cristallo di temperatura di Debye Θ: ⟨u²⟩ = (3ħ²/(M·k·Θ))·[Φ(Θ/T)/(Θ/T) + ¼], Φ(x) = (1/x)·∫₀ˣ t/(eᵗ − 1) dt.
// A zero assoluto non è zero (moto di punto zero); cresce con la temperatura; gli atomi leggeri si agitano di più.
export function agitazione(massaU, debye, T) {
  const x = debye / Math.max(T, 1e-3); let fi = 0; const n = 60; for (let i = 0; i < n; i++) { const t = ((i + 0.5) * x) / n; fi += t / Math.expm1(t); } fi /= n; // (1/x)·∫ = media sull'intervallo
  return Math.sqrt(((3 * COSTANTI.hbar ** 2) / (massaU * COSTANTI.u * COSTANTI.kB * debye)) * (fi / x + 0.25)) * 1e10;
}
// l'asse lungo cui si guarda: i due spigoli che gli stanno di traverso (proiettati) e il periodo lungo di lui
function vistaLungo(R, asse = R.asse) {
  const { A, B, C } = R.base, chi = { a: [A, B, C], b: [B, C, A], c: [C, A, B], 'c*': [null, A, B] }[String(asse).replace(/[[\]]/g, '').replace('100', 'a').replace('010', 'b').replace('001', 'c')];
  if (!chi) throw new Error(`asse «${asse}»: si può guardare lungo a, b, c (o c*, la normale ai piani a-b)`);
  const croce = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2], norma = (u) => { const n = Math.hypot(...u); return u.map((x) => x / n); };
  // (c*: la normale al piano a-b; le file lungo di lei hanno il periodo dello spessore di uno strato)
  const D = chi[0] || croce(A, B).map((x) => (x * R.volume) / dot(croce(A, B), croce(A, B))), ez = norma(D), ex = norma(chi[1].map((x, i) => x - dot(chi[1], ez) * ez[i])), ey = croce(ez, ex);
  const pr = (u) => [dot(u, ex), dot(u, ey)];
  return { ez, ex, ey, periodo: Math.hypot(...D), p1: pr(chi[1]), p2: pr(chi[2]), chi, proietta: (u) => [dot(u, ex), dot(u, ey), dot(u, ez)] };
}
// GLI ATOMI di un campione di cristallo largo latoM (pochi nanometri), visti lungo un asse: le posizioni vere della cella
// ripetuta, ognuna spostata dalla sua agitazione termica (un esito per atomo, dal suo indirizzo: è un'istantanea).
//   latoM, T (K), asse ('a', 'b', 'c', 'c*'), spessoreM (quanto cristallo in profondità; se manca: un periodo), massimo (atomi),
//   fermi (vero: ognuno al suo posto esatto; l'agitazione la mette chi li muove, con le ampiezze di «agitazione»)
//   centroM: [x, y] (m) dove sta il centro del campione nel piano che si guarda, rispetto all'origine del reticolo (di norma 0)
//   tessera (vero: il campione è una TESSERA del reticolo, che ripetuta copre il piano senza cuciture — vedi sotto)
// L'ISTANTANEA è una sola per il cristallo: l'esito di ogni atomo dipende dal suo indirizzo (la cella i, j, k e il posto q) e
// dalla temperatura, non da quanto è largo il campione: il campione di 30 nm e quello di 3 nm mostrano gli stessi atomi negli
// stessi posti, e così uno spostato di centroM.
// LA TESSERA. Un quadrato non contiene un numero intero di celle (3 nm di quarzo sono 6,1 celle): ripetuto, lungo i lati si
// vede la cucitura. Il reticolo proiettato lungo l'asse ha due spigoli p1 (lungo x) e p2; la tessera è il rettangolo largo
// m·|p1| e alto n·|p2,y| (m, n gli interi più vicini a latoM), che è un dominio fondamentale del reticolo generato da
// u = (m·|p1|, 0) e v = n·p2: le file di tessere si ripetono spostate di v_x l'una sull'altra («scarto»), e la ripetizione
// è esatta (per gli assi perpendicolari agli altri due spigoli; per quelli obliqui di un monoclino resta l'inclinazione
// della fetta, una frazione d'ångström nella profondità).
// → { atomi: [{ x, y, z (m; z la profondità), el, raggio (m), colore, occ }], quantiDavvero (nel cubo di lato latoM), agitazione:
//     { elemento: Å }, periodoM (lungo l'asse), cella, descrizione, latoM (con la tessera: la sua larghezza), altezzaM, scartoM }
// la sola tessera (le misure, senza gli atomi): per sapere quanto è grande un campione senza costruirlo
export function tesseraReticolo(minerale, latoM, asse = null) {
  const R = reticolo(minerale), V = vistaLungo(R, asse || R.asse), a1 = Math.hypot(...V.p1), p2 = V.p2[1] < 0 ? V.p2.map((x) => -x) : V.p2, m = Math.max(1, Math.round((latoM * 1e10) / a1)), n = Math.max(1, Math.round((m * a1) / p2[1])), Lx = m * a1;
  return { latoM: Lx * 1e-10, altezzaM: n * p2[1] * 1e-10, scartoM: ((((n * p2[0]) % Lx) + Lx) % Lx) * 1e-10 };
}
export function atomi(minerale, { latoM = 3e-9, T = 288, asse = null, spessoreM = null, massimo = 6000, fermi = false, centroM = null, tessera = false } = {}, caso = null) {
  const R = reticolo(minerale), V = vistaLungo(R, asse || R.asse), c = (caso || sorgente(`reticolo/${minerale}`)).sotto(`atomi/${minerale}/${Math.round(T)}`), debye = (MATERIALI[minerale] || {}).debye || 400;
  const { A, B, C } = R.base, ag = {}; for (const q of R.atomi) ag[q.el] ??= agitazione(q.el === 'H' ? 18.015 : ELEMENTI[q.el].A, debye, T); // (l'idrogeno si muove con la sua molecola)
  // la tessera: larga m·|p1|, alta n·|p2,y|, con le file spostate di scarto
  let Lx = latoM * 1e10, Ly = Lx, scarto = 0;
  if (tessera) { const a1 = Math.hypot(...V.p1), p2 = V.p2[1] < 0 ? V.p2.map((x) => -x) : V.p2, m = Math.max(1, Math.round(Lx / a1)), n = Math.max(1, Math.round((m * a1) / p2[1]));
    Lx = m * a1; Ly = n * p2[1]; scarto = (((n * p2[0]) % Lx) + Lx) % Lx; }
  const L = Lx;
  let spess = (spessoreM ?? V.periodo * 1e-10) * 1e10; const perA3 = R.atomi.reduce((s, q) => s + q.occ, 0) / R.volume; if (perA3 * Lx * Ly * spess > massimo) spess = massimo / (perA3 * Lx * Ly);
  // il centro: la traslazione del reticolo più vicina (s·p1 + t·p2, interi) e ciò che avanza (dentro una cella)
  const cx = (centroM?.[0] || 0) * 1e10, cy = (centroM?.[1] || 0) * 1e10, [p1, p2] = [V.p1, V.p2], det = p1[0] * p2[1] - p1[1] * p2[0];
  const s0 = Math.round((cx * p2[1] - cy * p2[0]) / det), t0 = Math.round((p1[0] * cy - p1[1] * cx) / det), idx = [0, 0, 0], base = [A, B, C];
  for (let k = 0; k < 3; k++) { if (base[k] === V.chi[1]) idx[k] += s0; if (base[k] === V.chi[2]) idx[k] += t0; }
  const T3 = V.proietta([0, 1, 2].map((d) => idx[0] * A[d] + idx[1] * B[d] + idx[2] * C[d]));
  // quante celle servono per coprire il campione: il raggio della sfera che lo contiene (più lo scarto del centro), diviso la distanza tra i piani della cella
  const croce = (u, v) => Math.hypot(u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]), raggio = Math.hypot(Lx, Ly, 2 * spess) / 2 + 2 + Math.hypot(cx - T3[0], cy - T3[1]) + Math.abs(T3[2]), out = [];
  const nA = Math.ceil(raggio / (R.volume / croce(B, C))) + 1, nB = Math.ceil(raggio / (R.volume / croce(C, A))) + 1, nC = Math.ceil(raggio / (R.volume / croce(A, B))) + 1;
  // (la tessera è il rettangolo [−Lx/2, Lx/2) × [−Ly/2, Ly/2) attorno al centro: ogni posto ci cade una volta sola)
  const dentro = tessera ? (x, y) => x >= -Lx / 2 && x < Lx / 2 && y >= -Ly / 2 && y < Ly / 2 : (x, y) => Math.abs(x) <= L / 2 + 1 && Math.abs(y) <= L / 2 + 1;
  for (let i = idx[0] - nA; i <= idx[0] + nA; i++) for (let j = idx[1] - nB; j <= idx[1] + nB; j++) for (let k = idx[2] - nC; k <= idx[2] + nC; k++) for (let q = 0; q < R.atomi.length; q++) {
    const at = R.atomi[q], p = V.proietta([at.pos[0] + i * A[0] + j * B[0] + k * C[0], at.pos[1] + i * A[1] + j * B[1] + k * C[1], at.pos[2] + i * A[2] + j * B[2] + k * C[2]]);
    p[0] -= cx; p[1] -= cy; if (!dentro(p[0], p[1]) || p[2] < -0.01 || p[2] >= spess - 0.01) continue;
    const id = `${i},${j},${k},${q}`, s = fermi ? 0 : ag[at.el]; if (at.occ < 1 && c(`${id}/c'è`) >= at.occ) continue; // (un posto occupato a metà: c'è o non c'è)
    const x = p[0] + s * c.normale(`${id}/x`), y = p[1] + s * c.normale(`${id}/y`), z = p[2] + s * c.normale(`${id}/z`);
    if (!tessera && (Math.abs(x) > L / 2 || Math.abs(y) > L / 2)) continue;
    out.push({ x: (x + Lx / 2) * 1e-10, y: (y + Ly / 2) * 1e-10, z: z * 1e-10, el: at.el, raggio: ATOMI_DISEGNO[at.el][0] * 1e-10, colore: ATOMI_DISEGNO[at.el][1], occ: at.occ });
  }
  out.sort((p, q) => q.z - p.z); // dal più profondo al più vicino: così chi disegna copre nel verso giusto
  return { atomi: out, quantiDavvero: perA3 * L ** 3, agitazione: ag, periodoM: V.periodo * 1e-10, spessoreM: spess * 1e-10, cella: R.cella, asse: asse || R.asse, latoM: Lx * 1e-10, ...(tessera ? { altezzaM: Ly * 1e-10, scartoM: scarto * 1e-10 } : {}),
    descrizione: `${minerale} (${R.sistema}, ${R.gruppo}; a = ${fmt(R.cella.a, 3)}, b = ${fmt(R.cella.b, 3)}, c = ${fmt(R.cella.c, 3)} Å), visto lungo ${asse || R.asse}: ${out.length} atomi in uno strato di ${fmtLunghezza(spess * 1e-10)} (in un cubo di ${fmtLunghezza(latoM)} sarebbero ${fmt(perA3 * (latoM * 1e10) ** 3)}); a ${Math.round(T)} K ognuno è spostato dal suo posto di ${Object.entries(ag).map(([e, v]) => `${ELEMENTI[e].nome} ${fmt(v, 1)} Å`).join(', ')}` };
}
// l'immagine degli atomi (RGBA N×N; con la tessera N × N·altezza/larghezza): dischi con il raggio ionico vero, i più profondi più scuri
export function immagineAtomi(campione, N = 192) {
  const k = N / campione.latoM, Ny = campione.altezzaM ? Math.max(1, Math.round(campione.altezzaM * k)) : N, ky = Ny / (campione.altezzaM || campione.latoM), sx = (campione.scartoM || 0) * k;
  const px = new Uint8ClampedArray(N * Ny * 4), zmax = Math.max(1e-12, campione.spessoreM);
  for (let i = 0; i < N * Ny; i++) { px[i * 4] = 10; px[i * 4 + 1] = 12; px[i * 4 + 2] = 18; px[i * 4 + 3] = 255; }
  // (il campione si ripete oltre i lati — mappa.js lo posa con le condizioni periodiche —: un atomo a cavallo di un lato si
  // disegna anche dall'altra parte, se no lungo le cuciture resta una riga scura dove manca la sua metà; con la tessera la
  // fila sopra e quella sotto sono spostate dello scarto)
  const copie = []; for (const a of campione.atomi) { const r = Math.max(1, a.raggio * k), x = a.x * k, y = a.y * ky;
    for (const fy of [-1, 0, 1]) for (const fx of [-2, -1, 0, 1, 2]) { const X = x + fx * N + fy * sx, Y = y + fy * Ny; if (X + r >= 0 && X - r <= N && Y + r >= 0 && Y - r <= Ny) copie.push([a, X, Y, r]); } }
  for (const [a, cx, cy, r] of copie) { const lume = 0.45 + 0.55 * (1 - a.z / zmax);
    for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(Ny - 1, Math.ceil(cy + r)); y++) for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(N - 1, Math.ceil(cx + r)); x++) { const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r; if (d > 1) continue; const o = (y * N + x) * 4, s = lume * (1 - 0.45 * d * d); px[o] = a.colore[0] * s; px[o + 1] = a.colore[1] * s; px[o + 2] = a.colore[2] * s; } }
  return px;
}

// L'INCANALAMENTO. Una carica che entra in un cristallo quasi parallela a un asse non vede atomi uno per uno ma FILE di atomi:
// ogni fila è una corda carica che la respinge con il potenziale continuo di Lindhard, U(r) = (Z1·Z2·e²/d)·ln(1 + 3a²/r²) (d la
// distanza tra gli atomi lungo la fila, a il raggio di schermo di Thomas-Fermi). Se l'angolo con l'asse è sotto quello critico,
// ψ1 = √(2·Z1·Z2·e²/(E·d)), la particella rimbalza dolcemente tra le file senza mai avvicinarsi ai nuclei: perde poca energia
// e va molto più lontano. Lo stesso accade tra i PIANI di atomi che contengono l'asse. Qui si segue davvero il moto
// trasverso (d²r/dz² = −∇U/(p·v)) nel potenziale delle file vere di quel minerale, sfumato dall'agitazione termica, per
// ogni direzione d'ingresso attorno all'asse: la mappa dice quanta parte delle particelle passa lontano dai nuclei.
// Vista da dietro un cristallo sottile è una stella: una macchia al centro (l'asse) e una riga per ogni piano. La sua
// simmetria è quella del reticolo lungo quell'asse (più l'inversione: una riga è una riga nei due versi).
//   particella ('protone', 'alfa', …), energiaMeV, asse ('a', 'b', 'c', 'c*'; se manca: quello del minerale)
//   T (K), N (lato della mappa), campo (semiapertura in angoli critici), spessoreM (del cristallo; se manca: qualche oscillazione)
// → { asse, periodo (Å, tra gli atomi di una fila), psi1 (rad), psi1Gradi, psiTermico (rad: con l'agitazione), file: [{ el, Z, x, y }],
//     piani: [{ angolo (gradi nel disegno), spaziatura (Å), psi (rad) }], mappa (Float32Array N×N, 0…1), immagine (RGBA), N,
//     campoRad, simmetria (ordine di rotazione della figura), punte (gli angoli dei raggi della stella, gradi), profilo (quanto è
//     chiara in ogni direzione), incanalate (frazione entro ψ1/2), spessoreM, descrizione }
export function incanalamento(minerale, part = 'protone', energiaMeV = 1, asse = null, { T = 288, N = 36, campo = 3.5, spessoreM = null, punti = 16 } = {}) {
  const R = reticolo(minerale), V = vistaLungo(R, asse || R.asse), p = particella(part), Z1 = Math.abs(p.Z ?? p.q), E = energiaMeV * 1e6, debye = (MATERIALI[minerale] || {}).debye || 400, e2 = 14.39964; // eV·Å
  const g = 1 + energiaMeV / p.mMeV, pv = E * ((g + 1) / g), d = V.periodo; // p·v = E·(γ + 1)/γ (2E quando è lenta)
  // le file: gli atomi della cella proiettati lungo l'asse (chi cade nello stesso punto sta sulla stessa fila)
  const [p1, p2] = [V.p1, V.p2], det = p1[0] * p2[1] - p1[1] * p2[0], file = [];
  for (const a of R.atomi) { const q = V.proietta(a.pos); let s = (q[0] * p2[1] - q[1] * p2[0]) / det, t = (p1[0] * q[1] - p1[1] * q[0]) / det; s -= Math.floor(s + 1e-9); t -= Math.floor(t + 1e-9);
    const Z = ELEMENTI[a.el].Z * a.occ, v = file.find((f) => f.el === a.el && Math.min(Math.abs(f.s - s), 1 - Math.abs(f.s - s)) < 1e-3 && Math.min(Math.abs(f.t - t), 1 - Math.abs(f.t - t)) < 1e-3);
    if (v) v.Z += Z; else file.push({ el: a.el, Z, s, t, a: (0.8853 * 0.529177) / Math.pow(Math.sqrt(Z1) + Math.sqrt(ELEMENTI[a.el].Z), 2 / 3), u: agitazione(ELEMENTI[a.el].A, debye, T) }); }
  for (const f of file) { f.x = f.s * p1[0] + f.t * p2[0]; f.y = f.s * p1[1] + f.t * p2[1]; }
  const Zmedia = file.reduce((s, f) => s + f.Z, 0) / file.length, Zmax = file.reduce((s, f) => Math.max(s, f.Z), 0), psi1 = Math.sqrt((2 * Z1 * Zmax * e2) / (pv / 2 * d)), forte = file.reduce((b, f) => (f.Z > b.Z ? f : b), file[0]);
  const psiT = psi1 * Math.sqrt(0.5 * Math.log(1 + (3 * forte.a * forte.a) / (2 * forte.u * forte.u)));
  // il potenziale e la vicinanza ai nuclei su una griglia della cella proiettata (si ripete: basta una cella)
  const Gn = 72, U = new Float32Array(Gn * Gn), Vn = new Float32Array(Gn * Gn), passoG = Math.sqrt(Math.abs(det)) / Gn; let mediaV = 0;
  for (let j = 0; j < Gn; j++) for (let i = 0; i < Gn; i++) { const x = ((i + 0.5) / Gn) * p1[0] + ((j + 0.5) / Gn) * p2[0], y = ((i + 0.5) / Gn) * p1[1] + ((j + 0.5) / Gn) * p2[1]; let u = 0, v = 0;
    for (const f of file) for (let m = -2; m <= 2; m++) for (let n = -2; n <= 2; n++) { const dx = x - f.x - m * p1[0] - n * p2[0], dy = y - f.y - m * p1[1] - n * p2[1], r2 = dx * dx + dy * dy, s2 = Math.max(f.u * f.u, passoG * passoG);
      u += ((Z1 * f.Z * e2) / d) * Math.log(1 + (3 * f.a * f.a) / (r2 + 2 * f.u * f.u)); v += (f.Z * f.Z * Math.exp(-r2 / (2 * s2))) / s2; }
    U[j * Gn + i] = u; Vn[j * Gn + i] = v; mediaV += v / (Gn * Gn); }
  for (let i = 0; i < Gn * Gn; i++) Vn[i] /= mediaV;
  // l'accelerazione trasversa nelle coordinate (s, t) della cella: −G⁻¹·∇U/(p·v), G la metrica della cella proiettata (così il
  // moto si segue tutto in frazioni di cella, e la griglia si ripete da sé)
  const As = new Float32Array(Gn * Gn), At = new Float32Array(Gn * Gn), mod = (i) => ((i % Gn) + Gn) % Gn, g11 = p1[0] * p1[0] + p1[1] * p1[1], g12 = p1[0] * p2[0] + p1[1] * p2[1], g22 = p2[0] * p2[0] + p2[1] * p2[1], dG = g11 * g22 - g12 * g12;
  for (let j = 0; j < Gn; j++) for (let i = 0; i < Gn; i++) { const us = ((U[j * Gn + mod(i + 1)] - U[j * Gn + mod(i - 1)]) * Gn) / 2, ut = ((U[mod(j + 1) * Gn + i] - U[mod(j - 1) * Gn + i]) * Gn) / 2; As[j * Gn + i] = -(g22 * us - g12 * ut) / dG / pv; At[j * Gn + i] = -(-g12 * us + g11 * ut) / dG / pv; }
  const lato = Math.sqrt(Math.abs(det)), W = campo * psi1, lambda = (Math.PI * lato) / (2 * psi1), spess = spessoreM != null ? spessoreM * 1e10 : 3 * lambda, mappa = new Float32Array(N * N);
  // i punti d'ingresso: sparsi in modo uniforme nella cella (una successione a bassa discrepanza: il fascio è uniforme, non c'è caso)
  const ingressi = []; for (let k = 0; k < punti; k++) { let a = 0, f = 0.5, n = k + 1; while (n) { a += f * (n & 1); n >>= 1; f /= 2; } let b = 0; f = 1 / 3; n = k + 1; while (n) { b += f * (n % 3); n = Math.floor(n / 3); f /= 3; } ingressi.push([a, b]); }
  for (let jy = 0; jy < N; jy++) for (let ix = 0; ix < N; ix++) {
    const tx0 = ((ix + 0.5) / N * 2 - 1) * W, ty0 = ((jy + 0.5) / N * 2 - 1) * W, vs0 = (tx0 * p2[1] - ty0 * p2[0]) / det, vt0 = (p1[0] * ty0 - p1[1] * tx0) / det; let lontane = 0;
    for (let k = 0; k < punti; k++) {
      let ss = ingressi[k][0], tt = ingressi[k][1], vs = vs0, vt = vt0, z = 0, vicino = 0;
      while (z < spess) {
        const ang = Math.sqrt(g11 * vs * vs + 2 * g12 * vs * vt + g22 * vt * vt), dz = Math.min(spess - z, lambda / 16, (0.12 * lato) / Math.max(ang, 0.3 * psi1));
        // (interpolazione bilineare sulla griglia, che si ripete)
        let fs = (ss - Math.floor(ss)) * Gn - 0.5, ft = (tt - Math.floor(tt)) * Gn - 0.5; if (fs < 0) fs += Gn; if (ft < 0) ft += Gn;
        const i0 = fs | 0, j0 = ft | 0, a = fs - i0, b = ft - j0, i1 = i0 + 1 === Gn ? 0 : i0 + 1, j1 = j0 + 1 === Gn ? 0 : j0 + 1, k00 = j0 * Gn + i0, k10 = j0 * Gn + i1, k01 = j1 * Gn + i0, k11 = j1 * Gn + i1, w00 = (1 - a) * (1 - b), w10 = a * (1 - b), w01 = (1 - a) * b, w11 = a * b;
        vs += (As[k00] * w00 + As[k10] * w10 + As[k01] * w01 + As[k11] * w11) * dz; vt += (At[k00] * w00 + At[k10] * w10 + At[k01] * w01 + At[k11] * w11) * dz; ss += vs * dz; tt += vt * dz; z += dz;
        vicino += (Vn[k00] * w00 + Vn[k10] * w10 + Vn[k01] * w01 + Vn[k11] * w11) * dz;
      }
      lontane += Math.max(0, 1 - vicino / spess);
    }
    mappa[jy * N + ix] = lontane / punti;
  }
  // la simmetria della figura: è una stella, cioè raggi a certi angoli attorno all'asse. Si misura quanto è chiara in ogni
  // direzione (la media lungo il raggio, fuori dalla macchia centrale), e si cerca il più alto ordine di rotazione che
  // lascia uguale quel profilo (la correlazione con la sua copia girata di 360°/n)
  const settori = 72, raggi = new Float64Array(settori), vedi = (x, y) => { const fx = (x / W + 1) * N / 2 - 0.5, fy = (y / W + 1) * N / 2 - 0.5, i = Math.max(0, Math.min(N - 2, Math.floor(fx))), j = Math.max(0, Math.min(N - 2, Math.floor(fy))), a = fx - i, b = fy - j; return mappa[j * N + i] * (1 - a) * (1 - b) + mappa[j * N + i + 1] * a * (1 - b) + mappa[(j + 1) * N + i] * (1 - a) * b + mappa[(j + 1) * N + i + 1] * a * b; };
  for (let k = 0; k < settori; k++) { const f = (DUE_PI * k) / settori; let v = 0, n = 0; for (let r = 1.6 * psi1; r < 0.94 * W; r += W / N) { v += vedi(r * Math.cos(f), r * Math.sin(f)); n++; } raggi[k] = v / n; }
  const mediaRaggi = raggi.reduce((x, y) => x + y, 0) / settori, correla = (n) => { const salto = settori / n; let sab = 0, saa = 0; for (let k = 0; k < settori; k++) { const x = raggi[k] - mediaRaggi, y = raggi[(k + salto) % settori] - mediaRaggi; sab += x * y; saa += x * x; } return saa > 0 ? sab / saa : 0; };
  const rotazioni = { 2: correla(2), 3: correla(3), 4: correla(4), 6: correla(6) }, simmetria = [6, 4, 3, 2].find((n) => rotazioni[n] > 0.5 && (n !== 6 || rotazioni[3] > 0.5) && (n !== 4 || rotazioni[2] > 0.5)) || 1;
  // le punte della stella: le direzioni in cui il profilo ha un massimo che sporge dalla media
  const punte = []; { let sc = 0; for (const v of raggi) sc += (v - mediaRaggi) ** 2; sc = Math.sqrt(sc / settori); for (let k = 0; k < settori; k++) { const v = raggi[k], prima = raggi[(k + settori - 1) % settori], dopo = raggi[(k + 1) % settori]; if (v > prima && v >= dopo && v > mediaRaggi + sc) punte.push((360 * k) / settori); } }
  // i piani che contengono l'asse: le righe più fitte del reticolo proiettato (spaziatura = area della cella / lunghezza del passo)
  const piani = [], Natomi = R.atomi.reduce((s, a) => s + a.occ, 0) / R.volume, aTF = (0.8853 * 0.529177) / Math.pow(Math.sqrt(Z1) + Math.sqrt(Zmedia), 2 / 3);
  for (let m = -3; m <= 3; m++) for (let n = 0; n <= 3; n++) { if ((n === 0 && m <= 0) || mcd(Math.abs(m), n) !== 1) continue; const vx = m * p1[0] + n * p2[0], vy = m * p1[1] + n * p2[1], sp = Math.abs(det) / Math.hypot(vx, vy); piani.push({ indici: [m, n], angolo: ((Math.atan2(vy, vx) / GRADI) % 180 + 180) % 180, spaziatura: sp, psi: Math.sqrt((2 * Math.PI * Natomi * sp * Z1 * Zmedia * e2 * aTF) / (pv / 2)) }); }
  piani.sort((a, b) => b.spaziatura - a.spaziatura); piani.length = Math.min(piani.length, 8);
  let dentro = 0, quanti = 0; for (let jy = 0; jy < N; jy++) for (let ix = 0; ix < N; ix++) { const x = ((ix + 0.5) / N * 2 - 1) * W, y = ((jy + 0.5) / N * 2 - 1) * W; if (Math.hypot(x, y) < 0.5 * psi1) { dentro += mappa[jy * N + ix]; quanti++; } }
  let lo = Infinity, hi = -Infinity; for (const v of mappa) { if (v < lo) lo = v; if (v > hi) hi = v; }
  const immagine = new Uint8ClampedArray(N * N * 4); for (let i = 0; i < N * N; i++) { const v = hi > lo ? (mappa[i] - lo) / (hi - lo) : 0; immagine[i * 4] = 20 + 235 * v; immagine[i * 4 + 1] = 16 + 220 * v * v; immagine[i * 4 + 2] = 30 + 150 * v * v * v; immagine[i * 4 + 3] = 255; }
  const nomeP = p.nome === 'alfa' ? 'una particella α' : p.nome === 'muone+' ? 'un muone positivo' : p.nome === 'muone-' || p.nome === 'muone' ? 'un muone' : `un ${p.nome}`;
  return { minerale, asse: asse || R.asse, periodo: d, psi1, psi1Gradi: psi1 / GRADI, psiTermico: psiT, file: file.map((f) => ({ el: f.el, Z: f.Z, x: f.x, y: f.y, agitazione: f.u })), piani, mappa, immagine, N, campoRad: W, rotazioni, simmetria, punte, profilo: raggi, incanalate: quanti ? dentro / quanti : 0, spessoreM: spess * 1e-10,
    descrizione: `${nomeP} da ${energiaMeV >= 1000 ? `${fmt(energiaMeV / 1000)} GeV` : `${fmt(energiaMeV)} MeV`} che entra in un cristallo di ${minerale} (${R.sistema}) lungo ${asse || R.asse}: le file di atomi (uno ogni ${fmt(d, 3)} Å) la guidano se l'angolo è sotto ${fmt(psi1 / GRADI)}° (a ${Math.round(T)} K, con gli atomi che vibrano: ${fmt(psiT / GRADI)}°). Dietro un cristallo di ${fmtLunghezza(spess * 1e-10)} esce una stella a ${punte.length} punte, con simmetria di ordine ${simmetria}: una riga per ogni piano di atomi che contiene l'asse (i più larghi a ${piani.slice(0, 3).map((q) => `${fmt(q.angolo, 2)}°`).join(', ')}).` };
}
const mcd = (a, b) => (b ? mcd(b, a % b) : a);
