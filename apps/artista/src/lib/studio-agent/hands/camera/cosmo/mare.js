// mare.js — L'ACQUA DEI MARI E DEI LAGHI di un pianeta, a tutte le scale: che cosa c'è sciolto, che cosa vi è sospeso,
// come si muove; dal pianeta intero fino alle molecole.
//
// Non è una tinta blu: si prende il pianeta com'è (le sue rocce, i suoi vulcani, la sua aria, i suoi fiumi, i suoi
// venti) e si chiede che acqua ne esce.
//   1. I SALI vengono da tre parti: le ROCCE di quel pianeta, consumate dall'acqua (ogni minerale si scioglie con la sua
//      velocità misurata, che cresce con la temperatura: legge di Arrhenius; quanto se ne scioglie dipende da quanto
//      tempo il granello resta nel suolo prima che l'erosione lo porti via); i GAS DEI VULCANI (cloro e zolfo: quelli del
//      mantello, che il magma porta fuori per tutta la vita del pianeta); le SORGENTI CALDE del fondo, dove l'acqua
//      attraversa la roccia calda (le toglie il magnesio, le dà calcio e potassio). I fiumi li portano al mare.
//      ESCONO dall'acqua nella roccia calda del fondo, sulle argille (scambio di ioni), sepolti con l'acqua dei
//      sedimenti, nelle conche che evaporano (da cui tornano, quando i sedimenti sono risollevati e consumati), e come
//      calcare quando il prodotto degli ioni supera la solubilità. La composizione del mare è l'integrale di questo
//      bilancio per l'età del pianeta: ogni ione ha il suo tempo di residenza, e resta nel mare ciò che vi resta a lungo.
//   2. L'EQUILIBRIO IN SOLUZIONE. Tutte le costanti (solubilità dei sali, dei gas: legge di Henry; acido carbonico;
//      acqua) vengono da UNA tabella di entalpie ed entropie, con la stessa regola di chimica.js: K = exp(−ΔG/RT),
//      ΔG = ΔH − TΔS. Così dipendono dalla temperatura da sole: il calcare e il gesso sono meno solubili al caldo, il
//      salgemma poco di più, i gas di meno. Gli ioni in soluzione non sono liberi: si schermano (legge di Debye-Hückel
//      estesa) e si appaiano (equazione di Fuoss: dalla legge di Coulomb, dalla costante dielettrica dell'acqua e dai
//      raggi degli ioni). Il pH esce dal bilancio delle cariche, dall'anidride carbonica dell'aria e dal calcare.
//   3. LE CORRENTI: il vento (meteo.js) trascina la superficie; con la rotazione escono la deriva di Ekman, i grandi
//      giri e la corrente stretta sul bordo ovest (modello di Stommel 1948, risolto sulla forma vera dei bacini), le
//      risalite dove l'acqua di superficie diverge; l'acqua più densa (fredda e salata) affonda e riempie il fondo.
//   4. I CAMPI: temperatura, salinità (evaporazione − pioggia − fiumi, portate dalla corrente), ghiaccio, torbidità (il
//      fango dei fiumi: la sabbia cade subito, l'argilla viaggia: legge di Stokes), saturazione dei sali, laghi.
//   5. IL CAMPIONE: in un punto, a una profondità, per un cubetto d'acqua di lato dato (da metri a nanometri), che cosa
//      c'è dentro davvero e come si muove. Col principio di nebbia.js: se le particelle vere sono troppe se ne dà un
//      campione rappresentativo, e accanto il numero vero.
//
//   6. L'ASPETTO: il mare visto da sopra a ogni scala (colore dall'ottica vera dell'acqua, di ciò che vi è sospeso e
//      sciolto, del fondo e della luce di quella stella; le onde di quel vento, le stesse a ogni scala), visto da dentro
//      (il campione), e atomo per atomo (scenaMolecolare).
//   7. IL RESTO DEL MONDO: le maree dalle lune vere e dalla stella, le stagioni dal clima, il calore che le correnti
//      portano (per il clima), le province del mare trovate nei campi, il mare a un momento dell'anno e della marea.
//
// NIENTE È TARATO SUL MARE DELLA TERRA. Ogni numero è una conseguenza o un dato misurato in laboratorio o in natura,
// citato dove sta (DATI, IONI, TERMO qui; ROCCE e MINERALI_ROCCIA in chimica.js §8). La Terra di prova esce a 32 g/kg, Na/Cl
// 1,0, pH 8,4, magnesio 0,0033 mol/kg, i fiumi a 16 mg/kg (veri ~100). Il calcare della copertura c'è (sciogliCarbonati): torna quello
// posato sulla crosta dei continenti (un terzo), e senza vita nel suolo l'acqua lo scioglie con la CO2 dell'aria, fino a 0,6 mmol/kg di
// calcio: se ne scioglie poco più di un terzo, il resto torna al mare in granelli. Sulla Terra vera la CO2 del suolo è 10–100 volte
// quella dell'aria, e le piattaforme di calcare e la dolomite le fa la vita. I fiumi sono anche diluiti: la portata è il doppio della vera
// (prima 19 mg/kg, con il calcare che tornava tutto sciolto; 7 quando il sedimento ripreso non cedeva niente) (prima 55, Na/Cl 1,8 e pH 8,7: il sodio del solfato di sodio non aveva uscita; ora il fondo caldo lo lascia
// nell'albite, perché il calcio che l'albitizzazione libera cade come anidrite: fluidoCaldo; e prima ancora 71: il sodio delle
// argille nuove tornava come sale, e il cloro non scendeva con le placche): il confronto, voce per voce, lo stampa
// test/test_mare.mjs.
// LEGGI EMPIRICHE / DATI:
//   · entalpie ed entropie degli ioni e delle specie in acqua a 298 K (CODATA 1989; NBS 1982; Fe²⁺: Parker e
//     Khodakovskii 1995; gesso e silice: Robie e Hemingway 1995). Danno a 25 °C: calcite log K = −8,48 (misurato
//     −8,48), gesso −4,56 (−4,58), salgemma K = 38 (37,6), CO2 0,034 mol/kg/bar, pK1 6,35, pK2 10,33;
//   · attività: Debye-Hückel esteso coi parametri di Truesdell e Jones 1974; costante dielettrica (Malmberg e Maryott
//     1956); viscosità (Vogel); raggi degli ioni (Shannon 1976), gusci (Marcus 1988), diffusione (Li e Gregory 1974);
//   · le rocce, i vulcani e il ciclo del carbonio: in chimica.js §8 (velocità di dissoluzione nei suoli: White e
//     Brantley 2003; in laboratorio: Palandri e Kharaka 2004; mantello: McDonough e Sun 1995);
//   · il cloro: alla nascita, dal pianeta fuso, esce tutto tranne il fuso intrappolato (5%: Elkins-Tanton 2008); poi un
//     magma che erutta sotto meno di 100 bar ne perde il 35%, e il 90% dello zolfo (Moore e Fabbi 1971; Unni e Schilling
//     1978); un sesto del magma arriva in superficie (Crisp 1984); un basalto fuso tiene sciolti 1200 ppm di zolfo;
//   · la copertura dei continenti: il calcare posato sulla crosta dei continenti torna con l'erosione e si scioglie fin dove
//     l'acqua arriva all'equilibrio con la calcite (cinetica di Plummer, Wigley e Parkhurst 1978): sciogliCarbonati;
//   · il fondo: 10% del calore interno esce con acqua calda, 20% con acqua tiepida (Elderfield e Schultz 1996; Stein e
//     Stein 1994); l'acqua calda e quella tiepida neutralizzano l'acido forte sciogliendo il basalto (fluidoCaldo, bilancioSali);
//     l'acqua calda lascia tutto il magnesio (Bischoff e Dickson 1975) e riduce a pirite la
//     parte del solfato che ne riduce quella della Terra, 1 mmol/kg su 28 (Shanks e altri 1981; primo ordine: Ohmoto e Lasaga 1982); la tiepida lascia lo 0,3% del magnesio e il 2% del potassio per passaggio (dai flussi
//     misurati: Elderfield e Schultz 1996; Staudigel 2003); un chilo d'acqua per chilo di roccia;
//   · le argille: 0,25 eq/kg e preferenze tra ioni (Sayles e Mangelsdorf 1977); porosità dei sedimenti sepolti 20%;
//   · lo scambio attraverso uno stretto: 0,25·larghezza·profondità·√(g′·profondità) (Armi e Farmer 1986);
//   · la soglia a cui il calcare nasce da solo nell'acqua di mare: Ω = 20 a 25 °C (Morse e He 1993);
//   · le onde: JONSWAP (Hasselmann e altri 1973) e Pierson-Moskowitz 1964; le creste che frangono (Monahan e
//     O'Muircheartaigh 1980); la deriva della superficie al 3% del vento; l'attrito del fondo sulle maree, 0,0025;
//   · l'ottica: acqua pura (Pope e Fry 1997; Morel 1974), fango (Babin e altri 2003), R = 0,33·b/(a + b) (Gordon 1975);
//   · il rimescolamento verticale 10⁻⁴ m²/s (Munk 1966), orizzontale 1000 m²/s; ghiaccio marino: 2,2 W/m/K, l'85% del
//     sale resta nell'acqua, riflette il 60% della luce; coagulazione delle argille (Schulze-Hardy).
// CONSEGUENZE (prima erano parametri): quanto sodio e potassio la roccia calda trattiene (equilibrio col plagioclasio e
// col feldspato, dalle tabelle); quanta parte del pianeta lascia sfiatare il magma (le terre e i mari bassi di quella
// carta, sotto quell'aria); ogni quanto i sedimenti tornano (larghezza dei mari / velocità delle placche di tettonica.js;
// mai, senza placche); quali mari chiusi arrivano al sale (la loro forma, l'evaporazione, lo stretto); quanto calcare
// torna coi fiumi (la parte deposta su fondali bassi); l'attrito della deriva (dal 3% del vento).
// CIÒ CHE RESTA LIBERO O NUMERICO: lo spessore dello strato che il vento rimescola (50 m) e del pennacchio dei fiumi
// (5 m); l'attrito dei grandi giri (la corrente di bordo è larga una cella); la risonanza delle maree fermata a 5; quanto
// è stretto DAVVERO lo stretto di un mare chiuso (sotto la griglia: un evento, tra la cella e un trecentesimo); la
// forma dei vortici che la griglia non risolve (rumore fisso del luogo, taglia dal raggio di Rossby); la parte del
// calcare in eccesso che resta sospesa (un decimo); le fasi delle onde (eventi del pianeta).
// SEMPLIFICAZIONI:
//   · ΔH e S costanti con la temperatura (come chimica.js): bene tra 0 e 100 °C, grossolano a 350 °C;
//   · le attività reggono fino a qualche mole per chilo (il salgemma satura a 6,6 mol/kg invece di 6,15; il gesso a
//     0,026 invece di 0,015, perché la coppia CaSO4 di Fuoss è troppo forte); oltre 8 mol/kg di forza ionica si fermano;
//   · il clima, i continenti e i fiumi di oggi per tutta la storia; la massa del mare costante; il mare ben rimescolato
//     (gli ioni hanno ovunque le stesse proporzioni: cambia la salinità); ciò che la crosta che affonda riporta nel
//     mantello è contato solo per il cloro (DATI.subduzioneCl), con il ritmo di oggi per tutta la storia; il sodio delle
//     argille nuove resta roccia (torna solo la parte che il suolo ne scioglie quando è risollevato);
//   · l'aria è data (P.atmosfera): il mare non la cambia; ma se la sua CO2 è rimasta all'equilibrio di Urey, qui si usa
//     quella del ciclo del carbonio calcolato sulle terre vere (stato.carbonioAria dice quale);
//   · niente vita: nessuno toglie il calcare, la silice, il solfato, l'ossigeno come fanno gli organismi;
//   · le correnti: uno strato solo, ψ = 0 su tutte le terre (niente corrente attorno a un continente polare), niente
//     vortici risolti; le maree: risposta bacino per bacino lungo i paralleli, senza propagazione;
//   · le onde vengono dal vento medio della stagione (niente tempeste): più basse del vero;
//   · il campione viaggia con la corrente: le velocità delle particelle sono quelle rispetto all'acqua.
// UNITÀ: mol per kg d'acqua, g/kg, K, m, m/s, Pa; longitudine e latitudine in GRADI (−180…180, −90…90); le griglie hanno
// le righe da nord a sud come geologia.js. Deterministico: ogni esito incerto viene dalla sorgente degli eventi.
// Lo «stato» che mare() restituisce è fatto solo di dati (numeri, testi, vettori): può passare tra fili.

import { COSTANTI, R_GAS, ANNO, MSOLE, ebollizione, ZERO_CELSIUS, GRADO, MOLARE_ACQUA, PESI_ATOMICI, GIORNO, TSOLE } from './leggi.js';
import { stella as stellaDi } from './stelle.js'; // le stelle dalla loro struttura
import { MOLECOLE, atmosfera, pressioneVapore, pressioneCO2Urey, rocceDelPianeta, rilascio, vulcani, co2DelCiclo, acidoDelSuolo, ROCCE, MINERALI_ROCCIA } from './chimica.js';
import { COSTANTI as TETTONICA } from './tettonica.js';
import { maree as mareaDi } from './lune.js';
export { rocceDelPianeta, rilascio, MINERALI_ROCCIA };
import { sorgente, numero } from './eventi.js';
import { tracceDelMare, INTRAPPOLATO } from './elementi.js'; // la catena degli elementi: le tracce sciolte, dalla crosta di QUESTO pianeta; il fuso intrappolato (una fonte sola con le perdite dell'accrescimento)

const NA = COSTANTI.NA, KB = COSTANTI.kB, E0 = COSTANTI.eps0, QE = COSTANTI.e, RAD = GRADO, R_VAPORE = R_GAS / MOLARE_ACQUA; // (R_VAPORE: 461,5 J/kg/K)
// LE COSTANTI DI DEBYE–HÜCKEL, dalla teoria (Debye e Hückel 1923), per un'acqua di costante dielettrica ε a T, con molalità e la
// densità dell'acqua a 1000 kg/m³: A = (1/ln10)·√(2π·N_A·ρ)·(e²/(4πε₀·ε·k_B·T))^(3/2) (in log10, kg^½/mol^½: 0,509 a 25 °C) e
// B = √(2e²·N_A·ρ/(ε₀·ε·k_B·T)) (in 1/Å: 0,329). Prima erano 1,8246·10⁶ e 50,29, le stesse con le costanti arrotondate
const RHO_DH = 1000, DH_A = (Math.sqrt(2 * Math.PI * NA * RHO_DH) * Math.pow((QE * QE) / (4 * Math.PI * E0 * KB), 1.5)) / Math.LN10, DH_B = 1e-10 * Math.sqrt((2 * QE * QE * NA * RHO_DH) / (E0 * KB));
const limita = (x, a, b) => (x < a ? a : x > b ? b : x);

export const DATI = {
  // --- le rocce, i fiumi, i vulcani: i numeri sono in ROCCE di chimica.js (la fonte unica per l'aria e per il mare)
  densitaRoccia: ROCCE.densita,
  // --- il cloro e lo zolfo
  intrappolato: INTRAPPOLATO, // la parte del cloro rimasta nel mantello quando il pianeta, nato fuso, si è solidificato: il fuso tra i cristalli (Elkins-Tanton 2008: 1-5%; elementi.js, la stessa delle perdite dell'accrescimento)
  perEruzione: { Cl: 0.35, S: 0.9 }, // quanto ne perde un magma che erutta a bassa pressione (inclusioni di fuso contro lava: Moore e Fabbi 1971; Unni e Schilling 1978)
  estrusivo: 1 / 6, pressioneSfiato: 1e7, // la parte del magma che arriva in superficie (Crisp 1984); sotto più di ~100 bar (1000 m d'acqua) il magma non perde zolfo né cloro
  solfuroSaturo: 0.0375, // (mol/kg) lo zolfo che un basalto fuso tiene sciolto prima di separare solfuro (1200 ppm: Mavrogenes e O'Neill 1999)
  // --- il fondo del mare
  caldo: 0.1, tiepido: 0.2, salto: 10, // la parte del calore che esce con acqua calda e tiepida (Elderfield e Schultz 1996; Stein e Stein 1994); quanto si scalda la tiepida (K)
  magnesioTiepido: 0.003, potassioTiepido: 0.02, // ciò che l'acqua tiepida lascia nel basalto a ogni passaggio: dai flussi misurati sui fianchi delle dorsali (Mg ~10¹² mol/anno: Elderfield e Schultz 1996; K ~10¹²: Staudigel 2003)
  // LO ZOLFO CHE SI RIDUCE SENZA VITA. Nell'acqua calda del fondo il ferro ferroso del basalto riduce il solfato a solfuro, che
  // resta nella crosta come pirite e pirrotite (Shanks, Bischoff e Rosenbauer 1981: 1 mmol/kg dei 28 dell'acqua di mare; Alt 1995):
  // la velocità è di primo ordine nel solfato (Ohmoto e Lasaga 1982), quindi qui è una PARTE del solfato che passa, non una quantità
  // fissa. Sotto ~100 °C, senza batteri, il solfato non si riduce in tempi geologici (Ohmoto e Lasaga 1982; Machel 2001: la
  // riduzione termochimica nei sedimenti chiede anche la materia organica, che senza vita non c'è): l'acqua tiepida dei fianchi,
  // i fanghi e i pori non ne riducono. La pirite dei sedimenti della Terra (metà dell'uscita dello zolfo) è dei batteri: qui no.
  solfatoRidotto: 1e-3 / 0.0282, // (la parte del solfato del fluido caldo che finisce in pirite; il resto esce come anidrite e si riscioglie quando la crosta si raffredda)
  conducibilita: 3.3, diffusivita: 1e-6, Tmantello: 1620, critico: 647, // della roccia; il punto critico dell'acqua (K)
  // --- i sedimenti e gli stretti
  cec: 0.25, preferenze: { 'Na+': 1, 'K+': 5, 'Mg2+': 3.4, 'Ca2+': 7.4 }, // argille: eq/kg e selettività (Sayles e Mangelsdorf 1977)
  alluminioArgilla: 2 / 0.25816, // (mol di Al per kg) l'argilla dei fiumi come caolinite, Al2Si2O5(OH)4 [D]: le argille nuove del fondo ne prendono un sodio per alluminio (analcime, albite)
  porosita: 0.2, // l'acqua che resta nei sedimenti sepolti
  // IL CLORO CHE LE PLACCHE RIPORTANO NEL MANTELLO: l'acqua di mare che altera la crosta del fondo lascia cloro negli anfiboli dei
  // gabbri e nel serpentino della peridotite idratata (strutturale e solubile), e la placca lo porta giù. Sulla Terra entrano in
  // subduzione da ~2,5·10¹² g/anno (crosta alterata e sedimenti: Ito, Harris e Anderson 1983; Jarrard 2003) a ~12·10¹² g/anno
  // contando il serpentino (Sharp e Barnes 2004, EPSL 226, 243) [R, da estratti]: qui il conto completo, 12·10¹² (la crosta
  // alterata da sola è tre volte le stime vecchie: Chavrit et al. 2016, GCA [R]). Circa metà esce dalla placca prima dell'arco e
  // torna in superficie (Beaudoin et al. 2022, EPSL 594, 117750 [S]): il resto va nel mantello, da cui i vulcani lo riprendono
  // (sfiato). Il cloro che i minerali prendono è in proporzione al cloro del fluido (un coefficiente di ripartizione): il pozzo
  // è una parte del cloro del mare, per m² di fondo che affonda; il fondo affonda col ritmo del riciclo (√area / v delle placche).
  subduzioneCl: { flussoTerra: 12e12 / 35.453, cloroTerra: 0.546, areaMareTerra: 3.61e14, primaDellArco: 0.5 }, // (mol/anno; mol/kg; m²; la parte che torna su)
  scambioStretto: 0.25, // lo scambio a due strati attraverso uno stretto: portata = 0,25·larghezza·profondità·√(g′·profondità) (controllo idraulico: Armi e Farmer 1986)
  sogliaCalcite: 20, // la sovrasaturazione a cui il calcare nasce da solo nell'acqua di mare, misurata in laboratorio a 25 °C (Morse e He 1993)
  // --- la nascita dei cristalli (energia di superficie J/m², volume molare m³/mol)
  cristalli: { calcite: [0.094, 3.69e-5], gesso: [0.04, 7.47e-5], salgemma: [0.04, 2.70e-5], 'solfuro di ferro': [0.1, 1.82e-5], ghiaccio: [0.03, 1.96e-5] },
  prefattore: 1e30, // tentativi di nascita per m³ al secondo (teoria classica della nucleazione)
  // --- il moto
  mescola: 1e-4, strato: 50, deriva: 0.03, // (m²/s) Munk 1966; (m) lo strato che il vento rimescola; senza rotazione la superficie va al 3% della velocità del vento (regola misurata)
  cd: 1.3e-3, ce: 1.3e-3, // l'attrito del vento sul mare e l'evaporazione (le formule di massa di meteo.js)
  // --- le particelle (m): sabbia, limo, argilla; densità dei granelli e dei fiocchi (kg/m³)
  taglie: { sabbia: 2e-4, limo: 2e-5, argilla: 2e-6 }, densitaGrani: 2650, densitaFiocchi: 1150, fiocco: 6e-5,
  pennacchio: 5, // (m) lo spessore dello strato d'acqua dolce che un fiume stende sul mare
  bolle: 1e9, profonditaBolle: 1, // bolle per m³ sotto una cresta che frange (per unità di copertura; Medwin e Breitz 1989); fin dove scendono (m)
  ventoCheFrange: 3, // (m/s) sotto, le creste non frangono: niente schiuma né bolle (l'inizio delle creste bianche, ~3–4 m/s [R])
  dolomite: { A: 1.05, E: 31.9, n: 2.26 }, // la crescita della dolomite: log₁₀ A (mol/cm²/s), E (kcal/mol), ordine (Arvidson e Mackenzie 1999)
  magnesite: { k100: 6.5e-16, E: 159, n: 2 }, // della magnesite: k a 100 °C (mol/cm²/s), E dell'avanzare dei gradini (kJ/mol), ordine (Saldi e altri 2009)
  coagula: 0.08, // (mol/kg) la concentrazione di ioni a una carica a cui l'argilla coagula (per z cariche: diviso z⁶)
};

// ---------- 1. LA TABELLA TERMOCHIMICA DELL'ACQUA (dati misurati) e le costanti che ne discendono
// ioni: ΔH (kJ/mol), S (J/mol·K), carica, å e b di Truesdell-Jones, diffusione a 25 °C (10⁻⁹ m²/s), raggio (Å),
// molecole d'acqua nel primo guscio, massa (g/mol)
export const IONI = {
  'H+': [0, 0, 1, 9.0, 0, 9.31, 0.3, 3, PESI_ATOMICI.H], 'OH-': [-230.015, -10.9, -1, 3.5, 0, 5.27, 1.33, 4, 17.007],
  'Na+': [-240.34, 58.45, 1, 4.0, 0.075, 1.33, 1.02, 6, PESI_ATOMICI.Na], 'K+': [-252.14, 101.2, 1, 3.5, 0.015, 1.96, 1.38, 7, PESI_ATOMICI.K],
  'Mg2+': [-467.0, -137.0, 2, 5.5, 0.2, 0.71, 0.72, 6, PESI_ATOMICI.Mg], 'Ca2+': [-543.0, -56.2, 2, 5.0, 0.165, 0.79, 1.0, 7, PESI_ATOMICI.Ca],
  'Fe2+': [-90.0, -101.6, 2, 6.0, 0, 0.72, 0.78, 6, PESI_ATOMICI.Fe], 'Cl-': [-167.08, 56.6, -1, 3.5, 0.015, 2.03, 1.81, 6, PESI_ATOMICI.Cl],
  'SO4(2-)': [-909.34, 18.5, -2, 5.0, -0.04, 1.07, 2.3, 10, 96.06], 'HCO3-': [-689.93, 98.4, -1, 5.4, 0, 1.19, 1.56, 6, 61.017],
  'CO3(2-)': [-675.23, -50.0, -2, 5.4, 0, 0.92, 1.78, 9, 60.009], 'HS-': [-17.6, 62.8, -1, 3.5, 0, 1.73, 1.84, 6, 33.07],
};
const TERMO = { // specie neutre in acqua e i solidi che chimica.js non ha: ΔH, S
  'CO2(aq)': [-413.26, 119.36], 'O2(aq)': [-11.7, 110.9], 'N2(aq)': [-10.54, 95.3], 'H2S(aq)': [-39.7, 121], 'H4SiO4': [-1460.0, 180],
  'CaSO4·2H2O': [-2022.6, 194.1], KCl: [-436.5, 82.6], 'SiO2(am)': [-903.5, 46.9],
  Na2SO4: [-1387.82, 149.58], 'Na2SO4·10H2O': [-4327.26, 591.87], // tenardite e mirabilite (Robie e Hemingway 1995 [a memoria]): a 25 °C log K = −0,3 e −1,1 (misurati −0,2 e −1,1)
  MgCO3: [-1113.3, 65.1], 'CaMg(CO3)2': [-2326.3, 155.2], // magnesite e dolomite (Robie e Hemingway 1995): a 25 °C log K = −8,1 e −17,4 (misurati −8,0 e −17,1…−17,4)
};
const gibbs = (f, T) => { const x = IONI[f] || TERMO[f]; if (x) return 1000 * x[0] - T * x[1]; const m = MOLECOLE[f]; if (!m) throw new Error(`mare: specie sconosciuta ${f}`); return 1000 * m.dH - T * m.S; };
// (per suolo.js: la stessa tabella, una fonte sola, per l'acqua dei pori)
export const gibbsSpecie = (f, T) => gibbs(f, T);
const kEq = (reag, prod, T) => { let g = 0; for (const f in prod) g += prod[f] * gibbs(f, T); for (const f in reag) g -= reag[f] * gibbs(f, T); return Math.exp(-g / (R_GAS * T)); };
const memoK = new Map();
// tutte le costanti a una temperatura (mol/kg, bar): si calcolano una volta per decimo di grado
export function costanti(T) {
  const k = Math.round(T * 10); if (memoK.has(k)) return memoK.get(k);
  const eps = 87.74 * Math.exp(-0.0046 * (T - ZERO_CELSIUS)), A = DH_A / Math.pow(eps * T, 1.5), B = DH_B / Math.sqrt(eps * T); // Debye-Hückel
  const bjerrum = (QE * QE) / (4 * Math.PI * E0 * eps * KB * T); // (m) la distanza a cui due cariche si sentono quanto l'agitazione termica
  const out = { T, eps, A, B, bjerrum,
    henry: { CO2: kEq({ CO2: 1 }, { 'CO2(aq)': 1 }, T), O2: kEq({ O2: 1 }, { 'O2(aq)': 1 }, T), N2: kEq({ N2: 1 }, { 'N2(aq)': 1 }, T), H2S: kEq({ H2S: 1 }, { 'H2S(aq)': 1 }, T) },
    K1: kEq({ 'CO2(aq)': 1, 'H2O(l)': 1 }, { 'H+': 1, 'HCO3-': 1 }, T), K2: kEq({ 'HCO3-': 1 }, { 'H+': 1, 'CO3(2-)': 1 }, T), Kw: kEq({ 'H2O(l)': 1 }, { 'H+': 1, 'OH-': 1 }, T),
    KH2S: kEq({ 'H2S(aq)': 1 }, { 'H+': 1, 'HS-': 1 }, T),
    sali: { calcite: kEq({ CaCO3: 1 }, { 'Ca2+': 1, 'CO3(2-)': 1 }, T), gesso: kEq({ 'CaSO4·2H2O': 1 }, { 'Ca2+': 1, 'SO4(2-)': 1, 'H2O(l)': 2 }, T), anidrite: kEq({ CaSO4: 1 }, { 'Ca2+': 1, 'SO4(2-)': 1 }, T),
      salgemma: kEq({ NaCl: 1 }, { 'Na+': 1, 'Cl-': 1 }, T), silvite: kEq({ KCl: 1 }, { 'K+': 1, 'Cl-': 1 }, T), 'silice amorfa': kEq({ 'SiO2(am)': 1, 'H2O(l)': 2 }, { H4SiO4: 1 }, T),
      quarzo: kEq({ SiO2: 1, 'H2O(l)': 2 }, { H4SiO4: 1 }, T), 'solfuro di ferro': kEq({ FeS: 1, 'H+': 1 }, { 'Fe2+': 1, 'HS-': 1 }, T),
      tenardite: kEq({ Na2SO4: 1 }, { 'Na+': 2, 'SO4(2-)': 1 }, T), mirabilite: kEq({ 'Na2SO4·10H2O': 1 }, { 'Na+': 2, 'SO4(2-)': 1, 'H2O(l)': 10 }, T),
      magnesite: kEq({ MgCO3: 1 }, { 'Mg2+': 1, 'CO3(2-)': 1 }, T), dolomite: kEq({ 'CaMg(CO3)2': 1 }, { 'Ca2+': 1, 'Mg2+': 1, 'CO3(2-)': 2 }, T) } };
  memoK.set(k, out); if (memoK.size > 4000) memoK.delete(memoK.keys().next().value);
  return out;
}
// il coefficiente di attività di uno ione alla forza ionica I (Debye-Hückel esteso, Truesdell-Jones)
const gammaIone = (f, I0, K) => { const x = IONI[f], I = Math.min(I0, 8), r = Math.sqrt(I); return Math.pow(10, (-K.A * x[2] * x[2] * r) / (1 + x[3] * K.B * r) + x[4] * I); };
const gammaCarica = (z, I0, K) => { const r = Math.sqrt(Math.min(I0, 8)); return Math.pow(10, (-K.A * z * z * r) / (1 + 4.5 * K.B * r)); };
// LE COPPIE DI IONI (Fuoss 1958): due ioni di segno opposto a contatto sono tenuti insieme dall'attrazione di Coulomb
// attraverso l'acqua; K = (4/3)π·N·a³·exp(|z₁z₂|·ℓ/a), con ℓ la lunghezza di Bjerrum e a la distanza a contatto (i raggi;
// il magnesio tiene così stretto il suo guscio che tra lui e l'altro ione resta una molecola d'acqua: +2,76 Å).
// A 25 °C dà (log K, L/mol): MgSO4 1,9 (misurato 2,3), CaCO3 3,2 (3,2), NaSO4⁻ 0,8 (0,7), NaCl −0,15.
export function coppia(catione, anione, T) {
  const K = costanti(T), c = IONI[catione], a = IONI[anione], d = (c[6] + a[6] + (catione === 'Mg2+' ? 2.76 : 0)) * 1e-10;
  return ((4 / 3) * Math.PI * NA * d ** 3 * 1000) * Math.exp((Math.abs(c[2] * a[2]) * K.bjerrum) / d);
}
const CATIONI = ['Na+', 'K+', 'Mg2+', 'Ca2+'], LEGANTI = ['SO4(2-)', 'CO3(2-)', 'HCO3-'];
const TOT = { 'Na+': 'Na', 'K+': 'K', 'Mg2+': 'Mg', 'Ca2+': 'Ca' };

// L'ACQUA CON I SUOI SALI IN EQUILIBRIO. tot: moli per kg d'acqua di { Na, K, Mg, Ca, Cl, S (solfato), Si, Fe }; T; pCO2 (bar).
// Se omegaCalcite è dato e tot.Ca manca, il calcio è quello che tiene la calcite a quella saturazione (il mare).
// Il pH è quello che chiude il bilancio delle cariche: cationi − cloruro − solfato = alcalinità = HCO3⁻ + 2CO3²⁻ + OH⁻ − H⁺.
// → { pH, I, liberi, gamma, coppie (mol/kg), alcalinita, carbonio, Ca, omega: { calcite, gesso, … }, attivitaAcqua }
export function acqua(tot, T = 288, { pCO2, omegaCalcite = null, carbonio = null } = {}) {
  if (pCO2 === undefined && carbonio === null) throw new Error('mare.acqua: serve la pCO2 dell\'aria o il carbonio sciolto'); // (niente valore di riserva)
  const K = costanti(T), Na = tot.Na || 0, Kk = tot.K || 0, Mg = tot.Mg || 0, Cl = tot.Cl || 0, S = tot.S || 0, cercaCa = omegaCalcite != null && tot.Ca == null;
  let Ca = cercaCa ? 0.01 : tot.Ca || 0;
  const KA = {}; for (const c of CATIONI) { KA[c] = {}; for (const l of LEGANTI) KA[c][l] = coppia(c, l, T); }
  const lib = { 'Na+': Na, 'K+': Kk, 'Mg2+': Mg, 'Ca2+': Ca, 'SO4(2-)': S, 'CO3(2-)': 0, 'HCO3-': 0 }, g = {}, Kc = {};
  let I = 0.5 * (Na + Kk + Cl + 4 * (Mg + Ca + S)) + 1e-7, pH = 7, alk = 0, aw = 1, co2 = 0, H = 1e-7, OH = 1e-7, hco3T = 0, co3T = 0;
  const E = Na + Kk + 2 * Mg - Cl - 2 * S; // l'eccesso di cariche positive dei sali «forti» (senza il calcio)
  for (let giro = 0; giro < 9; giro++) {
    for (const f in IONI) g[f] = gammaIone(f, I, K);
    const g0 = Math.pow(10, 0.1 * Math.min(I, 8)); // le specie neutre (e l'effetto dei sali sui gas: i gas sono meno solubili nell'acqua salata)
    for (const c of CATIONI) { Kc[c] = {}; for (const l of LEGANTI) { const zp = IONI[c][2] + IONI[l][2]; Kc[c][l] = (KA[c][l] * g[c] * g[l]) / (zp === 0 ? g0 : gammaCarica(zp, I, K)); } }
    aw = Math.max(0.5, 1 - 0.018 * (Na + Kk + Mg + Ca + Cl + S)); if (carbonio == null) co2 = (K.henry.CO2 * pCO2) / g0;
    // a un pH dato: il carbonio sciolto (aperto all'aria), l'alcalinità e, se lo si cerca, il calcio
    const prova = (p) => {
      const aH = Math.pow(10, -p), h1 = (K.K1 * g0 * aw) / (aH * g['HCO3-']), c1 = (K.K2 * h1 * g['HCO3-']) / (aH * g['CO3(2-)']);
      // (acqua chiusa, lontana dall'aria: il carbonio sciolto è dato, e si divide tra CO2, bicarbonato e carbonato)
      if (carbonio != null) { let sH = 1, sC = 1; for (const c of CATIONI) { sH += Kc[c]['HCO3-'] * lib[c]; sC += Kc[c]['CO3(2-)'] * lib[c]; } co2 = carbonio / (1 + h1 * sH + c1 * sC); }
      const hco3 = h1 * co2, co3 = c1 * co2;
      let caLib = lib['Ca2+'], caTot = Ca;
      if (cercaCa) { caLib = (omegaCalcite * K.sali.calcite) / (g['Ca2+'] * g['CO3(2-)'] * co3); caTot = caLib * (1 + Kc['Ca2+']['SO4(2-)'] * lib['SO4(2-)'] + Kc['Ca2+']['CO3(2-)'] * co3 + Kc['Ca2+']['HCO3-'] * hco3); }
      let sH = 1, sC = 1; for (const c of CATIONI) { const m = c === 'Ca2+' ? caLib : lib[c]; sH += Kc[c]['HCO3-'] * m; sC += Kc[c]['CO3(2-)'] * m; }
      const h = aH / g['H+'], oh = (K.Kw * aw) / (aH * g['OH-']);
      return { hco3, co3, caLib, caTot, hT: hco3 * sH, cT: co3 * sC, h, oh, alk: hco3 * sH + 2 * co3 * sC + oh - h };
    };
    let lo = -2, hi = 15, r = null;
    for (let it = 0; it < 38; it++) { pH = 0.5 * (lo + hi); r = prova(pH); if (r.alk - E - 2 * r.caTot > 0) hi = pH; else lo = pH; }
    if (cercaCa) { Ca = r.caTot; lib['Ca2+'] = r.caLib; }
    lib['CO3(2-)'] = r.co3; lib['HCO3-'] = r.hco3; alk = r.alk; H = r.h; OH = r.oh; hco3T = r.hT; co3T = r.cT;
    // gli ioni liberi: ciascuno diviso tra sé e le sue coppie
    let sS = 1; for (const c of CATIONI) sS += Kc[c]['SO4(2-)'] * lib[c]; lib['SO4(2-)'] = S / sS;
    for (const c of CATIONI) { let s = 1; for (const l of LEGANTI) s += Kc[c][l] * lib[l]; const t = c === 'Ca2+' ? Ca : tot[TOT[c]] || 0; if (!(cercaCa && c === 'Ca2+')) lib[c] = 0.5 * (lib[c] + t / s); }
    I = 0.5 * (lib['Na+'] + lib['K+'] + Cl + lib['HCO3-'] + H + OH + 4 * (lib['Mg2+'] + lib['Ca2+'] + lib['SO4(2-)'] + lib['CO3(2-)'])) + 1e-9;
    for (const c of CATIONI) for (const l of LEGANTI) { const zp = IONI[c][2] + IONI[l][2]; if (zp) I += 0.5 * zp * zp * Kc[c][l] * lib[c] * lib[l]; }
  }
  const coppie = {}; for (const c of CATIONI) for (const l of LEGANTI) { const x = Kc[c][l] * lib[c] * lib[l]; if (x > 1e-12) coppie[`${c} ${l}`] = x; }
  const a = (f) => g[f] * (f === 'Cl-' ? Cl : lib[f]), Si = tot.Si || 0, sl = K.sali;
  const omega = { calcite: (a('Ca2+') * a('CO3(2-)')) / sl.calcite, gesso: (a('Ca2+') * a('SO4(2-)') * aw * aw) / sl.gesso, anidrite: (a('Ca2+') * a('SO4(2-)')) / sl.anidrite,
    salgemma: (a('Na+') * a('Cl-')) / sl.salgemma, silvite: (a('K+') * a('Cl-')) / sl.silvite, 'silice amorfa': Si / (sl['silice amorfa'] * aw * aw), quarzo: Si / (sl.quarzo * aw * aw),
    magnesite: (a('Mg2+') * a('CO3(2-)')) / sl.magnesite, dolomite: (a('Ca2+') * a('Mg2+') * a('CO3(2-)') ** 2) / sl.dolomite,
    tenardite: (a('Na+') ** 2 * a('SO4(2-)')) / sl.tenardite, mirabilite: (a('Na+') ** 2 * a('SO4(2-)') * aw ** 10) / sl.mirabilite };
  return { T, pH, I, liberi: { ...lib, 'Cl-': Cl, 'H+': H, 'OH-': OH }, gamma: { ...g }, coppie, alcalinita: alk, carbonio: co2 + hco3T + co3T, CO2: co2, bicarbonato: hco3T, carbonato: co3T, Ca, eccesso: E, omega, attivitaAcqua: aw, pCO2: carbonio != null ? (co2 * Math.pow(10, 0.1 * Math.min(I, 8))) / K.henry.CO2 : pCO2 };
}
// i grammi di sale per kg di soluzione, dalle moli per kg d'acqua
const P_A = PESI_ATOMICI, MASSE = { Na: P_A.Na, K: P_A.K, Mg: P_A.Mg, Ca: P_A.Ca, Cl: P_A.Cl, S: P_A.S + 4 * P_A.O, Si: P_A.Si + 4 * P_A.O + 4 * P_A.H, Fe: P_A.Fe }; // (g/mol; lo zolfo come solfato, la silice come acido silicico H4SiO4)
export function grammiPerKg(tot, eq = null) { let x = 0; for (const e in MASSE) x += (tot[e] || 0) * MASSE[e]; if (eq) x += eq.bicarbonato * 61.017 + eq.carbonato * 60.009; return x / (1 + x / 1000); }
// i gas sciolti (mol/kg): legge di Henry alla temperatura dell'acqua, meno solubili nell'acqua salata (Setschenow: ×10^(−0,1·I))
export function gasSciolti(gas = {}, pressionePa, T, I = 0) {
  const K = costanti(T), bar = pressionePa / 1e5, sale = Math.pow(10, -0.1 * Math.min(I, 8)), out = {};
  for (const f of ['CO2', 'O2', 'N2', 'H2S']) if (gas[f] > 0) out[f] = K.henry[f] * gas[f] * bar * sale;
  return out;
}
// le proprietà dell'acqua salata: densità (kg/m³: la parabola dell'acqua dolce attorno al suo massimo a 4 °C, più 0,78
// per g/kg; col sale il massimo scende di 0,215 K per g/kg, e nell'acqua di mare sparisce sotto il punto di gelo), viscosità (Pa·s, formula di Vogel, +0,2% per g/kg), punto di congelamento (la costante
// crioscopica viene dal calore di fusione di chimica.js: R·T²·M/ΔH = 1,86 K·kg/mol)
export const densita = (T, S = 0) => 999.84 + 0.78 * S - 0.0067 * (T - 277.13 + 0.215 * Math.min(S, 40)) ** 2;
export const viscosita = (T, S = 0) => 2.414e-5 * Math.pow(10, 247.8 / (Math.max(T, 250) - 140)) * (1 + 0.002 * S);
const CRIOSCOPICA = (R_GAS * ZERO_CELSIUS ** 2 * MOLARE_ACQUA) / (1000 * (MOLECOLE['H2O(l)'].dH - MOLECOLE['H2O(s)'].dH));
export const congelamento = (moliPerKg) => ZERO_CELSIUS - CRIOSCOPICA * 0.92 * moliPerKg; // (0,92: il coefficiente osmotico dell'acqua di mare)
// LA SOGLIA A CUI UN SALE NASCE DA SOLO (teoria classica della nucleazione): J = A·exp(−B/ln²Ω), B = f·16π·γ³·v²/(3·(kT)³):
// nasce quando J arriva a un germe per m³ al secondo, cioè a ln Ω = √(B/ln A). Per la calcite nell'acqua di mare la soglia
// è MISURATA (Ω = 20 a 25 °C: Morse e He 1993): è lei che fissa quanto le impurità abbassano la barriera (f = 0,82 con
// l'energia di superficie di 0,094 J/m²); con la temperatura scala come dice la teoria, T^−3/2. Gli altri sali: f = 1.
const barriera = (sale, T) => { const [gam, vm] = DATI.cristalli[sale], v = vm / NA, B = (16 * Math.PI * gam ** 3 * v * v) / (3 * (KB * T) ** 3); return sale === 'calcite' ? Math.log(DATI.sogliaCalcite) ** 2 * Math.log(DATI.prefattore) * Math.pow(298.15 / T, 3) : B; };
export const omegaCritica = (sale, T) => Math.exp(Math.sqrt(barriera(sale, T) / Math.log(DATI.prefattore)));
const tassoNascita = (sale, T, omega) => (omega > 1 ? DATI.prefattore * Math.exp(-barriera(sale, T) / Math.log(omega) ** 2) : 0);
// il moto browniano di una sfera (Einstein 1905, Stokes): D = kT/(3π·μ·d); in un secondo si sposta, lungo un asse,
// di √(2D); la velocità istantanea dell'agitazione termica è √(3kT/m)
export function browniano(diametroM, T = 293.15, S = 0, densitaGrano = DATI.densitaGrani) {
  const D = (KB * T) / (3 * Math.PI * viscosita(T, S) * diametroM), m = (densitaGrano * Math.PI * diametroM ** 3) / 6;
  return { D, passo1s: Math.sqrt(2 * D), velocitaTermica: Math.sqrt((3 * KB * T) / m) };
}
// la velocità con cui un granello cade (o una bolla sale) nell'acqua ferma: Stokes, w = Δρ·g·d²/(18μ), finché il
// moto attorno al granello è lento; per i granelli grossi la resistenza cresce (correzione di Schiller-Naumann)
export function stokes(diametroM, densitaGrano, T = 288, S = 35, g = 9.81) {
  const rho = densita(T, S), mu = viscosita(T, S); let w = ((densitaGrano - rho) * g * diametroM ** 2) / (18 * mu);
  for (let i = 0; i < 6; i++) { const Re = (rho * Math.abs(w) * diametroM) / mu; w = ((densitaGrano - rho) * g * diametroM ** 2) / (18 * mu * (1 + 0.15 * Math.pow(Re, 0.687))); }
  return w;
}

// ---------- 2. LE ROCCE DEL PIANETA, ciò che cedono alla pioggia e i vulcani: in chimica.js §8 (rocceDelPianeta, rilascio, vulcani)

// ---------- 3. IL BILANCIO DEI SALI: ciò che entra e ciò che esce, per l'età del pianeta
// IL FLUIDO CHE ESCE DALLA ROCCIA CALDA DEL FONDO. L'acqua di mare che attraversa il basalto a centinaia di gradi:
//  · lascia tutto il magnesio (fatto misurato in ogni fluido e in ogni esperimento: Bischoff e Dickson 1975) e prende calcio;
//  · scambia sodio e calcio col plagioclasio fino all'equilibrio 2Na⁺ + anortite + 4 quarzo ⇌ 2 albite + Ca²⁺, e sodio e
//    potassio coi feldspati, Na⁺ + ortoclasio ⇌ K⁺ + albite: le costanti vengono dalle entalpie e dalle entropie dei
//    minerali di chimica.js e degli ioni di qui, alla temperatura del camino; il plagioclasio è quello del basalto del
//    pianeta (soluzione ideale). Con l'acqua di mare terrestre a 330 °C il fluido perde qualche centesimo del sodio
//    (misurato nei camini: dal 5 all'8%). È un freno: più sodio rispetto al calcio ha il mare, più ne lascia nella roccia;
//  · perde il solfato che il ferro del basalto riesce a ridurre (dato misurato).
// Un chilo d'acqua reagisce con un chilo di roccia (misurato: da 0,5 a 2): non può prendere più di quanto la roccia ha.
export function fluidoCaldo(tot, T, rocce) {
  const K = costanti(T), b = rocce.basalto, Mg = tot.Mg || 0, Ca0 = (tot.Ca || 0) + Mg, Na0 = tot.Na || 0, K0 = tot.K || 0, I = 0.5 * (Na0 + K0 + (tot.Cl || 0) + 4 * (Ca0 + (tot.S || 0))) + 1e-6;
  const g1 = gammaIone('Na+', I, K), g2 = gammaIone('Ca2+', I, K), gK = gammaIone('K+', I, K), an = b.ospiti.anortite * b.Ca, xAb = b.Na / Math.max(1e-9, b.Na + an), xAn = 1 - xAb;
  const Kab = (kEq({ 'Na+': 2, CaAl2Si2O8: 1, SiO2: 4 }, { NaAlSi3O8: 2, 'Ca2+': 1 }, T) * Math.max(xAn, 1e-6)) / Math.max(xAb * xAb, 1e-9), Kor = kEq({ 'Na+': 1, KAlSi3O8: 1 }, { 'K+': 1, NaAlSi3O8: 1 }, T) * (b.K / Math.max(b.Na, 1e-9));
  // L'ANIDRITE: l'acqua che scende e si scalda la lascia cadere (CaSO4 è meno solubile al caldo: Bischoff e Seyfried 1978; Mottl
  // 1983; Alt 1995 [R]): il calcio sciolto nel fluido caldo non supera quello che il solfato rimasto permette,
  // (Ca − y)(SO4 − y)·γCa·γSO4 = K_anidrite(T) (dalla stessa tabella: chimica.js CaSO4). È il calcio LIBERO che conta
  // nell'equilibrio col plagioclasio: dove il solfato supera il calcio e il magnesio dell'acqua, l'albitizzazione non è
  // frenata dal calcio che libera (che cade come anidrite) e il fluido lascia nella roccia il sodio del solfato di sodio. Sulla
  // Terra il calcio supera il solfato (0,063 contro 0,028 mol/kg): l'anidrite prende tutto il solfato, e il freno resta. (Quando
  // la crosta si raffredda l'anidrite si riscioglie quasi tutta — Sleep 1991; Alt 1995 [R] —: il calcio e il solfato tornano al
  // mare, come prima.)
  const gS = gammaIone('SO4(2-)', I, K), S0 = Math.max(0, tot.S || 0), qAn = K.sali.anidrite / (g2 * gS);
  const libero = (Ct) => { if (!(Ct * S0 > qAn)) return Ct; const y = 0.5 * (Ct + S0 - Math.sqrt((Ct - S0) ** 2 + 4 * qAn)); return Math.max(1e-12, Ct - y); };
  let Na = Na0, Ca = Ca0;
  if (Na0 + Ca0 > 1e-9) { let lo = -0.999 * Math.min(b.Na, 2 * Ca0), hi = 0.999 * Math.min(Na0, 2 * an);
    for (let it = 0; it < 44; it++) { const x = 0.5 * (lo + hi); if (Math.log(g2 * libero(Ca0 + x / 2)) - 2 * Math.log(g1 * (Na0 - x)) > Math.log(Kab)) hi = x; else lo = x; }
    const x = 0.5 * (lo + hi); Na = Na0 - x; Ca = Ca0 + x / 2; }
  const dK = limita((Na * Kor * g1) / gK - K0, -K0, b.K); Na = Math.max(0, Na - dK);
  // L'ACIDO CHE LA ROCCIA NEUTRALIZZA: se l'acqua che entra ha più anioni forti (cloruro, solfato) che cationi — un mare d'acido
  // cloridrico, dove nessun fiume porta cationi — il basalto caldo la neutralizza sciogliendosi: i fluidi dei camini escono con le
  // cariche pareggiate, il cloruro accompagnato da sodio, calcio e ferro della roccia (Seyfried 1987; Von Damm 1995 [a memoria]). Qui
  // il calcio del plagioclasio e del pirosseno, al più quello del chilo di roccia che il chilo d'acqua attraversa
  const S = Math.max(0, (tot.S || 0) * (1 - DATI.solfatoRidotto)), acido = (tot.Cl || 0) + 2 * S - (Na + K0 + dK + 2 * Ca);
  if (acido > 0) Ca += Math.min(acido / 2, b.Ca);
  return { Na, K: K0 + dK, Mg: 0, Ca, Cl: tot.Cl || 0, S };
}
// IL BILANCIO, passo dopo passo per l'età del pianeta (320 passi impliciti).
//  · IL CLORO: il pianeta nasce fuso, e ciò che non entra nei cristalli esce con il vapore: alla nascita il cloro è quasi
//    tutto fuori (resta nel mantello il fuso intrappolato). Poi, ogni volta che il mantello fonde, una parte di quello
//    rimasto esce: quella dei magmi che arrivano in superficie dove la pressione è bassa (la parte estrusiva, sulla parte
//    del pianeta che è terra o mare basso: sotto un mare profondo o un'aria densa il magma se lo tiene).
//  · LO ZOLFO alla nascita resta nei solfuri del mantello; esce solo così, dai vulcani, quanto il fuso ne tiene sciolto.
//  · I CATIONI vengono dalle rocce (rilascio() di chimica.js), frenati dall'acido che i vulcani danno (il ciclo dei
//    carbonati e dei silicati: i fiumi non portano più cariche di quante la CO2 dei vulcani ne possa accompagnare).
//  · ESCONO: nella roccia calda (fluidoCaldo) e tiepida del fondo, sulle argille (scambio di ioni), sepolti con l'acqua
//    dei sedimenti e nei mari chiusi che evaporano fino al sale («evaporiti», 1/anno: lo calcola mare() dai bacini veri);
//    il SOLFATO in più come gesso nei bacini che evaporano oltre la saturazione del gesso senza arrivare al salgemma
//    («gesso», 1/anno: la sequenza di Usiglio, dalle solubilità di chimica.js); il SOLFATO che il fondo caldo riduce a pirite
//    (DATI.solfatoRidotto: l'unica riduzione senza vita); il MAGNESIO come dolomite e magnesite, con la loro cinetica lenta.
//    MANCANO, e si vedono: la pirite che i batteri fanno riducendo il solfato nei sedimenti (qui non c'è vita, e senza vita
//    sotto 100 °C il solfato non si riduce: sulla Terra è metà dell'uscita dello zolfo); e
//    servono mari quasi chiusi con uno stretto: su un rilievo a celle di 150 km quasi non ce ne sono, e allora né il sale
//    né il gesso escono. Il solfato sale fino alla solubilità del gesso nel mare aperto, e per ogni solfato in più le
//    cariche chiedono due sodi: è per questo che il sodio supera il cloro.
//    ciò che è sepolto torna quando i sedimenti sono risollevati («riciclo», anni: il tempo in cui le placche chiudono
//    un oceano; senza placche non torna). Il CLORO preso dalla crosta alterata e dal serpentino scende invece con la placca
//    nel mantello (DATI.subduzioneCl), e torna solo dai vulcani. Il calcio è quello che tiene il calcare alla soglia.
// → { ioni (mol/kg), eq, bilancio: { entra, esce, residenza }, fiume, flussi, … }
export function bilancioSali({ P, rocce, massaMare, areaMare, fiumi, apporto, argilla, sedimento, evaporiti = 0, gesso = 0, riciclo = Infinity, parteBassa, suiContinenti = 0.5, coperturaErosa = Infinity, consumata = 0, areaTerra = 0, Tsuoli = 288, pCO2, O2, Tmare, placche = true, sodioCheSiScioglie = 0 }) {
  const int = P.interno || {}, q = int.q ?? 0, eta = int.eta ?? 4.5e9, vu = vulcani({ calore: q, raggioM: P.raggioM, composizione: P.composizione }), magma = vu.magma, fuso = vu.fuso, F = rocce.fusione || 0.1;
  const massaMantello = P.massaKg * (1 - (P.composizione?.ferro ?? 0.32));
  // il fondo: l'acqua che attraversa la roccia calda e quella tiepida (kg/anno), dal calore che esce dal fondo
  const regime = int.tettonica, vivo = placche ? 1 : regime ? (String(regime).startsWith('coperchio') ? 0.2 : 0) : q > 0.02 ? 0.2 : 0, // (il regime della crosta è quello della storia del pianeta; la soglia sul calore solo se manca)
     Pfondo = (P.clima?.pressione || 0) + 1000 * gravita(P) * 2500;
  const Tcamino = Math.min(DATI.critico, ebollizione(Pfondo)), Tfondo = Math.max(271, Math.min(Tmare, 277));
  const caldo = (vivo * DATI.caldo * q * areaMare * ANNO) / (4000 * Math.max(50, Tcamino - Tfondo)), tiepido = (vivo * DATI.tiepido * q * areaMare * ANNO) / (4000 * DATI.salto);
  const M = massaMare, kSepolto = ((sedimento / DATI.densitaRoccia) * (DATI.porosita / (1 - DATI.porosita)) * 1000) / M, kNeutro = kSepolto + evaporiti, kTorna = riciclo > 0 && isFinite(riciclo) ? 1 / riciclo : 0;
  // (la parte del cloro del mare che la placca porta nel mantello in un anno: il ritmo della Terra per m² di fondo e per mol/kg di
  // cloro, per il fondo che affonda qui rispetto alla Terra — lo stesso riciclo, √area/v, fatto per la Terra con vTerra —)
  const sub = DATI.subduzioneCl, ricicloTerra = Math.sqrt(sub.areaMareTerra) / TETTONICA.vTerra, kSubduzione = kTorna > 0 ? ((sub.flussoTerra / (sub.cloroTerra * sub.areaMareTerra)) * (1 - sub.primaDellArco) * (areaMare / M) * ricicloTerra * kTorna) : 0;
  const sfiato = { Cl: DATI.perEruzione.Cl * DATI.estrusivo * parteBassa, S: DATI.perEruzione.S * DATI.estrusivo * parteBassa };
  const cariche = apporto.Na + apporto.K + 2 * apporto.Mg + 2 * apporto.Ca; let freno = 1;
  const entraFisso = { Na: apporto.Na, K: apporto.K, Mg: apporto.Mg, Cl: 0, S: 0 };
  // lo zolfo dei vulcani arriva al mare come solfato: tutto se l'aria ha ossigeno; altrimenti l'anidride solforosa si
  // spezza in acqua (3SO2 + 2H2O → 2H2SO4 + S): due terzi solfato, un terzo zolfo che si deposita
  const solfato = O2 > 1e-6 ? 1 : 2 / 3, ClTutto = rocce.mantello.Cl * massaMantello;
  const mare = { Na: 0, K: 0, Mg: 0, Cl: (1 - DATI.intrappolato) * ClTutto, S: 0 }, sed = { Na: 0, K: 0, Mg: 0, Cl: 0, S: 0 }, silicati = { Na: 0 }, mant = { Cl: DATI.intrappolato * ClTutto, S: rocce.mantello.S * massaMantello };
  const passi = 320, dt = eta / passi, scambio = { 'Na+': 0, 'K+': 0, 'Mg2+': 0, 'Ca2+': 0 }, oggi = { vulcani: { Cl: 0, S: 0 }, torna: {}, scambio };
  let Ca = 0, fluido = null; const dalFondo = { Na: 0, K: 0, Mg: 0, S: 0, Ca: 0 };
  // le argille che arrivano al mare cariche degli ioni del fiume (quasi tutto calcio) li scambiano con quelli del mare
  const sulleArgille = (c) => { let t = 0; const x = {}; for (const f in DATI.preferenze) { x[f] = DATI.preferenze[f] * Math.abs(IONI[f][2]) * (c[TOT[f]] || 0); t += x[f]; } for (const f in x) x[f] = t > 0 ? x[f] / t : 0; return x; };
  const xFiume = sulleArgille(fiumi > 0 ? { Na: apporto.Na / fiumi, K: apporto.K / fiumi, Mg: apporto.Mg / fiumi, Ca: apporto.Ca / fiumi } : {});
  const conc = () => ({ Na: mare.Na / M, K: mare.K / M, Mg: mare.Mg / M, Cl: mare.Cl / M, S: mare.S / M, Ca });
  // LA DOLOMITE (e con lei il magnesio che il carbonato si porta via): l'acqua di mare ne è sovrasatura, ma a freddo non nasce
  // (il «problema della dolomite»: il magnesio tiene stretto il suo guscio d'acqua). La legge misurata tra 100 e 200 °C (Arvidson
  // e Mackenzie 1999, Am. J. Sci. 299, 257): r = A·exp(−E/RT)·(Ω − 1)^n mol/cm²/s, A = 10^1,05, E = 31,9 kcal/mol, n = 2,26 (a
  // 25 °C 10⁻²²·³: niente, in tempi di laboratorio). Qui cresce sul fondo, alla sua temperatura; la superficie su cui cresce è
  // quella del fondo stesso (un m² per m²: il minimo, i granelli dei fanghi ne hanno di più). Ogni magnesio si porta un calcio:
  // non più di quanto ne arriva. Sulla Terra di prova (Ω ≈ 10³, 4 °C) toglie ~10⁶ mol/anno, nulla; dove il mare è pieno di magnesio e di
  // carbonato la crescita sale come Ω^2,26 e ferma la sovrasaturazione. LA MAGNESITE, che non chiede calcio: r = k·(Ω − 1)², con
  // k = 6,5·10⁻¹⁶ mol/cm²/s a 100 °C (Saldi, Jordan, Schott e Oelkers 2009, GCA 73, 5646, al microscopio a forza atomica); a freddo
  // la frena l'avanzare dei gradini, 159 kJ/mol (gli stessi autori: è quello che limita a temperatura ambiente).
  const dolo = DATI.dolomite, mgs = DATI.magnesite, kDolomite = areaMare * 1e4 * Math.pow(10, dolo.A) * Math.exp(-(dolo.E * 4184) / (R_GAS * Tfondo)) * ANNO;
  const kMagnesite = areaMare * 1e4 * mgs.k100 * Math.exp(((-1000 * mgs.E) / R_GAS) * (1 / Tfondo - 1 / 373.15)) * ANNO; let omegaDol = 0, omegaMgs = 0, mgDol = 0;
  // IL CALCIO SI CONTA (prima era quello che tiene il calcare alla soglia, comunque arrivasse: anche dove nessuno lo portava, e il fondo
  // caldo lo scambiava col sodio dell'albite — sui mondi d'acqua senza terre il mare diventava di soda dal nulla). Ora è un serbatoio:
  // entra coi fiumi, dalla copertura, dalle argille e dal fondo; esce come calcare solo quando supera la soglia (caSoglia), e nella
  // roccia calda quando il fluido ne prende
  let caMare = 0, caSoglia = Infinity;
  const calcio = () => { const c = { Na: mare.Na / M, K: mare.K / M, Mg: mare.Mg / M, Cl: mare.Cl / M, S: mare.S / M }; caSoglia = acqua(c, Tmare, { pCO2, omegaCalcite: omegaCritica('calcite', Tmare) }).Ca; Ca = Math.min(caSoglia, caMare / M);
    if (c.Mg > 0) { const o = acqua({ ...c, Ca }, Tfondo, { pCO2 }).omega; omegaDol = o.dolomite; omegaMgs = o.magnesite; mgDol = mare.Mg; } };
  // LA COPERTURA DEI CONTINENTI (sciogliCarbonati, più sotto): il calcare e la dolomite che il mare posa sulla crosta dei continenti
  // (la parte «suiContinenti») vi restano finché l'erosione li riprende; quello posato sulla crosta degli oceani scende con la placca.
  // Ripreso, il carbonato si scioglie fin dove l'acqua che lo bagna arriva all'equilibrio; il resto va al mare in granelli (il mare ne
  // è sovrasaturo: restano sedimento, e si riposano come il calcare nuovo). Il sale e il gesso ripresi (sed, qui sotto) si sciolgono
  // tutti: il mare non ne è saturo, e quel che non si scioglie nel fiume si scioglie in mare.
  const cop = kTorna > 0 ? sciogliCarbonati({ fiumi, consumata, areaTerra, T: Tsuoli, pCO2 }) : { sciolta: 0 }; let Ccop = 0, Dcop = 0; oggi.calcareSciolto = 0; oggi.dolomiteSciolta = 0;
  for (let n = 0; n < passi; n++) {
    const t = (n + 0.5) * dt, piuCaldo = Math.exp((eta - t) / 3e9); // il calore interno calava come in geologia.js: da giovane i vulcani davano di più
    if (n % 4 === 0) calcio();
    const xMare = sulleArgille({ Na: mare.Na / M, K: mare.K / M, Mg: mare.Mg / M, Ca });
    for (const f in scambio) scambio[f] = (argilla * DATI.cec * (xMare[f] - xFiume[f])) / Math.abs(IONI[f][2]); // (mol/anno: positivo = il mare lo perde)
    { const fonde = 1 - Math.exp((-fuso * piuCaldo * dt) / massaMantello), esceCl = sfiato.Cl * mant.Cl * fonde, esceS = Math.min(mant.S, sfiato.S * magma * piuCaldo * dt * Math.min(DATI.solfuroSaturo, mant.S / massaMantello / F));
      mant.Cl -= esceCl; mant.S -= esceS; oggi.vulcani.Cl = esceCl / dt; oggi.vulcani.S = (esceS / dt) * solfato; }
    freno = cariche > 0 ? Math.min(1, (vu.CO2 * piuCaldo + oggi.vulcani.Cl + 2 * oggi.vulcani.S) / cariche) : 1;
    for (const e in mare) {
      const sc = e === 'Na' ? scambio['Na+'] : e === 'K' ? scambio['K+'] : e === 'Mg' ? scambio['Mg2+'] : 0, torna = kTorna * sed[e], tiep = e === 'Mg' ? (tiepido * DATI.magnesioTiepido) / M : e === 'K' ? (tiepido * DATI.potassioTiepido) / M : 0;
      const kSale = e === 'S' ? kNeutro + gesso : kNeutro; // (il solfato esce anche come gesso nei bacini che evaporano senza arrivare al sale)
      const kGiu = e === 'Cl' ? kSubduzione : 0; // (il cloro che la placca porta nel mantello: non torna coi sedimenti, torna dai vulcani)
      const entra = freno * entraFisso[e] + (oggi.vulcani[e] || 0) + torna - Math.min(sc, mare[e] / dt), nuovo = Math.max(0, (mare[e] + dt * entra) / (1 + dt * (tiep * piuCaldo + kSale + kGiu)));
      if (kGiu > 0) mant.Cl += dt * kGiu * nuovo;
      sed[e] = (sed[e] + dt * kSale * nuovo) / (1 + dt * kTorna); mare[e] = nuovo; oggi.torna[e] = torna;
    }
    // (la dolomite in questo passo, implicita: il magnesio a fine passo x è quello per cui x + dt·F(x) = quello di prima; Ω va col magnesio)
    oggi.dolomite = 0; oggi.magnesite = 0; if ((omegaDol > 1 || omegaMgs > 1) && mgDol > 0 && mare.Mg > 0) { const Mg0 = mare.Mg, caIn = caMare / dt + freno * apporto.Ca + oggi.calcareSciolto + oggi.dolomiteSciolta,
      Fd = (x) => Math.min(caIn, kDolomite * Math.max(0, (omegaDol * x) / mgDol - 1) ** dolo.n), Fm = (x) => kMagnesite * Math.max(0, (omegaMgs * x) / mgDol - 1) ** mgs.n;
      if (Fd(Mg0) + Fm(Mg0) > 0) { let lo = 0, hi = Mg0; for (let it = 0; it < 40; it++) { const x = 0.5 * (lo + hi); if (x + dt * (Fd(x) + Fm(x)) > Mg0) hi = x; else lo = x; } mare.Mg = lo; const d = Fd(lo), m_ = Fm(lo), tot = (Mg0 - lo) / dt; oggi.dolomite = d + m_ > 0 ? (tot * d) / (d + m_) : 0; oggi.magnesite = Math.max(0, tot - oggi.dolomite); } }
    // LE ARGILLE NUOVE (reverse weathering: Mackenzie e Garrels 1966 [R]): nei sedimenti del fondo l'argilla dei fiumi, la
    // silice e il sodio che non ha un anione forte (quello che sta col bicarbonato: la soda) fanno silicati di sodio nuovi
    // (Na-smectite, analcime, albite: nei laghi di soda le zeoliti nascono così, Hay 1966, Surdam e Sheppard 1978 [R]), e
    // rendono la CO2: Na⁺ + HCO₃⁻ + argilla + silice → silicato di sodio + CO₂ + H₂O. Si prende al più un sodio per alluminio
    // dell'argilla che arriva (la sua stechiometria: il tetto è l'alluminio, non un tempo scelto), e solo finché c'è soda; il
    // sodio va nei sedimenti. NON torna come sale sciolto: è nella roccia (un silicato), non nell'acqua dei pori. Quando le placche
    // riciclano i sedimenti, il silicato risollevato si consuma come la roccia delle terre, e cede al mare la parte del suo sodio
    // che la stessa legge dei suoli (rilascio di chimica.js, la parte del sodio dell'albite: «sodioCheSiScioglie») scioglie nel
    // tempo del suolo; il resto resta roccia (crosta, o mantello se affonda con la placca). Prima tornava tutto, come l'acqua
    // dei pori: il sodio girava in tondo, mare → argille → mare, e il mare si caricava di soda (Mackenzie e Garrels 1966: le
    // argille nuove sono un'USCITA del sodio, ciò che chiude il suo bilancio; Michalopoulos e Aller 1995, Science 270, 614: si
    // fanno in fretta nei fanghi dei delta, e vi restano)
    if (argilla > 0) { const soda = Math.max(0, mare.Na + mare.K - mare.Cl - 2 * mare.S), x = Math.min(soda, mare.Na, argilla * DATI.alluminioArgilla * dt); mare.Na -= x; silicati.Na += x; oggi.argilleNuove = x / dt; }
    { const via = silicati.Na * -Math.expm1(-kTorna * dt), torna = limita(sodioCheSiScioglie, 0, 1) * via; silicati.Na -= via; mare.Na += torna; oggi.tornaSilicati = torna / dt; }
    // la roccia calda del fondo: in questo passo ci passa una parte del mare, ed esce con la composizione del fluido
    // (a piccoli tratti: il fluido dipende dal mare che entra)
    if (caldo > 0) for (let tratto = 0; tratto < 3; tratto++) { const c = conc(), passa = 1 - Math.exp((-caldo * piuCaldo * dt) / (3 * M)); fluido = fluidoCaldo(c, Tcamino, rocce);
      for (const e of ['Na', 'K', 'Mg', 'S']) { const d = passa * (fluido[e] - c[e]) * M; mare[e] = Math.max(0, mare[e] + d); dalFondo[e] = caldo * (fluido[e] - c[e]); } dalFondo.Ca = caldo * (fluido.Ca - c.Ca); caMare = Math.max(0, caMare + passa * (fluido.Ca - c.Ca) * M); Ca = caMare / M; }
    // L'ACIDO CHE IL FONDO TIEPIDO NEUTRALIZZA: se il mare ha più anioni forti che cationi (l'acido cloridrico uscito alla nascita, dove
    // nessun fiume porta cationi) l'acqua che circola tiepida nella crosta (tiepido, kg/anno) scioglie il basalto finché le cariche sono
    // pari: il vetro basaltico in acqua acida si scioglie congruente, calcio e magnesio nelle proporzioni della roccia (Gislason e
    // Oelkers 2003 [a memoria]; è l'alterazione a bassa temperatura che cede calcio al mare: Coogan e Gillis 2018 [a memoria]). Dove le
    // cariche sono già pari (la Terra: i fiumi portano più cationi che acido) non fa nulla: il resto dell'alterazione tiepida è nel
    // pozzo della CO2 (fondoConsuma di chimica.js), il carbonato che resta nei pori
    // E anche dove l'acqua non circola nella crosta (un interno fermo) il mare acido scioglie il basalto del fondo su cui sta: il pirosseno
    // col suo termine acido (Palandri e Kharaka 2004, la stessa tabella dei suoli: chimica.js MINERALI_ROCCIA), su un m² di roccia per m²
    // di fondo (il minimo, come per la dolomite), con l'acidità dell'acido forte che avanza; due cariche per mole
    { const acido = mare.Cl + 2 * mare.S - mare.Na - mare.K - 2 * mare.Mg - 2 * caMare;
      if (acido > 0) { const b = rocce.basalto, parte = tiepido > 0 ? -Math.expm1((-tiepido * piuCaldo * dt) / M) : 0, px = MINERALI_ROCCIA.pirosseno,
          sulFondo = 2 * areaMare * Math.pow(10, px[3]) * Math.pow(acido / M, px[4]) * Math.exp(((-1000 * px[5]) / R_GAS) * (1 / Tfondo - 1 / 298.15)) * ANNO * dt,
          x = Math.min(acido, parte * acido + sulFondo) / 2, qCa = b.Ca / Math.max(1e-12, b.Ca + b.Mg); caMare += x * qCa; mare.Mg += x * (1 - qCa); oggi.neutralizzato = x / dt; Ca = caMare / M; } else oggi.neutralizzato = 0; }
    // IL CALCIO DEL PASSO: i fiumi, la copertura che si scioglie, le argille (che ne cedono o ne prendono), meno la dolomite; ciò che
    // supera la soglia del calcare cade (oggi.calcare). La copertura: si riprende al ritmo del riciclo, ma non più della copertura che
    // l'erosione toglie davvero (coperturaErosa, kg/anno: il carbonato è una parte del sedimento ripreso); vi si posa la parte
    // suiContinenti del calcare caduto, della dolomite e dei granelli ripresi che non si sono sciolti
    caMare = Math.max(0, caMare + dt * (freno * apporto.Ca + oggi.calcareSciolto + oggi.dolomiteSciolta - scambio['Ca2+'] - (oggi.dolomite || 0)));
    { const cade = Math.max(0, caMare - caSoglia * M); caMare -= cade; oggi.calcare = cade / dt; Ca = caMare / M; }
    if (kTorna > 0) { const mc = Ccop * MASSA_CARBONATO.calcite + Dcop * MASSA_CARBONATO.dolomite, k = mc > 0 ? Math.min(kTorna, coperturaErosa / mc) : kTorna, f = limita(suiContinenti, 0, 1), dol = oggi.dolomite || 0;
      Ccop = (Ccop + dt * f * oggi.calcare) / (1 + dt * k * (1 - f)); Dcop = (Dcop + dt * f * dol) / (1 + dt * k * (1 - f));
      oggi.calcareSciolto = cop.sciolta * k * Ccop; oggi.dolomiteSciolta = cop.sciolta * k * Dcop; oggi.carbonatiInGranelli = (1 - cop.sciolta) * k * (Ccop + Dcop); mare.Mg += dt * oggi.dolomiteSciolta; }
  }
  const ioni = { Na: mare.Na / M, K: mare.K / M, Mg: mare.Mg / M, Cl: mare.Cl / M, S: mare.S / M }, soglia = omegaCritica('calcite', Tmare);
  // se i sali forti superano la solubilità del salgemma o del gesso: il resto sta sul fondo, come sale
  let fondoDiSale = null;
  { const e0 = acqua({ ...ioni, Ca: 0.001 }, Tmare, { pCO2 }); if (e0.omega.salgemma > 1) { const x = toglieSale(ioni.Na, ioni.Cl, costanti(Tmare).sali.salgemma / (e0.gamma['Na+'] * e0.gamma['Cl-'])); ioni.Na -= x; ioni.Cl -= x; fondoDiSale = { salgemma: x * M }; } }
  // (il calcio: quello della soglia, se il mare ne ha abbastanza; altrimenti quello che c'è)
  const caContato = caMare / M, equilibrio = (io) => { const e = acqua(io, Tmare, { pCO2, omegaCalcite: soglia }); return e.Ca > caContato ? acqua({ ...io, Ca: caContato }, Tmare, { pCO2 }) : e; };
  let eq = equilibrio(ioni);
  if (eq.omega.gesso > 1) { // troppo solfato per il calcio che c'è: il di più sta sul fondo come gesso (si cerca quanto ne resta sciolto)
    const S0 = ioni.S; let lo = 0, hi = 1; for (let it = 0; it < 14; it++) { const f = 0.5 * (lo + hi); if (equilibrio({ ...ioni, S: S0 * f }).omega.gesso > 1) hi = f; else lo = f; }
    ioni.S = S0 * lo; fondoDiSale = { ...(fondoDiSale || {}), gesso: (S0 - ioni.S) * M }; eq = equilibrio(ioni); }
  // IL SOLFATO DI SODIO: dove il calcio non basta a portarlo via come gesso (un mare senza fiumi di calcio, con lo zolfo dei vulcani)
  // il solfato sale fino a saturare la tenardite o la mirabilite (la meno solubile alla temperatura del mare), e il resto sta sul fondo
  const sodico = (e) => Math.max(e.omega.tenardite, e.omega.mirabilite);
  if (sodico(eq) > 1) { const S0 = ioni.S, Na0 = ioni.Na; let lo = 0, hi = Math.min(S0, 0.5 * Na0); for (let it = 0; it < 30; it++) { const x = 0.5 * (lo + hi); if (sodico(equilibrio({ ...ioni, S: S0 - x, Na: Na0 - 2 * x })) > 1) lo = x; else hi = x; }
    ioni.S = S0 - hi; ioni.Na = Na0 - 2 * hi; fondoDiSale = { ...(fondoDiSale || {}), 'solfato di sodio': hi * M }; eq = equilibrio(ioni); }
  ioni.Ca = eq.Ca;
  // la silice: nessuno la toglie (niente vita); sale fino alla solubilità della silice amorfa. Il ferro: con
  // l'ossigeno arrugginisce e cade; senza, resta sciolto fin dove la siderite lo permette (Ksp 10⁻¹⁰·⁹, dato misurato)
  ioni.Si = Math.min(costanti(Tmare).sali['silice amorfa'], (freno * apporto.Si * Math.min(eta, 1e7)) / M);
  ioni.Fe = O2 > 1e-6 ? 1e-9 : Math.min(1e-3, Math.pow(10, -10.89) / Math.max(1e-12, eq.gamma['Fe2+'] * eq.gamma['CO3(2-)'] * eq.liberi['CO3(2-)']));
  // il bilancio di oggi (mol/anno) e i tempi di residenza (anni): quanto c'è, diviso quanto entra
  const entra = {}, esce = {}, residenza = {};
  for (const e of ['Na', 'K', 'Mg', 'Cl', 'S']) {
    const sc = e === 'Na' ? scambio['Na+'] : e === 'K' ? scambio['K+'] : e === 'Mg' ? scambio['Mg2+'] : 0, tiep = e === 'Mg' ? tiepido * DATI.magnesioTiepido : e === 'K' ? tiepido * DATI.potassioTiepido : 0;
    entra[e] = { fiumi: freno * (apporto[e] || 0) + (oggi.torna[e] || 0) + (e === 'Na' ? oggi.tornaSilicati || 0 : 0) + (e === 'Mg' ? oggi.dolomiteSciolta : 0), vulcani: oggi.vulcani[e] || 0, fondo: Math.max(0, dalFondo[e] || 0) + (e === 'Mg' ? (oggi.neutralizzato || 0) * (1 - rocce.basalto.Ca / Math.max(1e-12, rocce.basalto.Ca + rocce.basalto.Mg)) : 0) };
    esce[e] = { fondo: Math.max(0, -(dalFondo[e] || 0)) + tiep * ioni[e], argille: Math.max(0, sc), sepolto: kSepolto * mare[e], evaporiti: evaporiti * mare[e], ...(e === 'Cl' ? { subduzione: kSubduzione * mare[e] } : {}), ...(e === 'S' ? { gesso: gesso * mare[e] } : {}), ...(e === 'Na' ? { argilleNuove: oggi.argilleNuove || 0 } : {}), ...(e === 'Mg' ? { dolomite: oggi.dolomite || 0, magnesite: oggi.magnesite || 0 } : {}) };
    const tot = entra[e].fiumi + entra[e].vulcani + entra[e].fondo; residenza[e] = tot > 0 ? mare[e] / tot : Infinity;
  }
  // il calcare deposto sui bassi fondali torna in gioco quando è risollevato: i fiumi lo risciolgono
  const qCaBasalto = rocce.basalto.Ca / Math.max(1e-12, rocce.basalto.Ca + rocce.basalto.Mg), caDalFondo = Math.max(0, dalFondo.Ca), caTorna = oggi.calcareSciolto + oggi.dolomiteSciolta, caEntra = freno * apporto.Ca + caTorna + caDalFondo + Math.max(0, -scambio['Ca2+']);
  entra.Ca = { fiumi: freno * apporto.Ca + caTorna, vulcani: 0, fondo: caDalFondo + Math.max(0, -scambio['Ca2+']) + (oggi.neutralizzato || 0) * qCaBasalto }; esce.Ca = { calcare: oggi.calcare || 0, dolomite: oggi.dolomite || 0, fondo: Math.max(0, -dalFondo.Ca), argille: Math.max(0, scambio['Ca2+']) }; residenza.Ca = caEntra > 0 ? (ioni.Ca * M) / caEntra : Infinity;
  // l'acqua media dei fiumi (mol/kg): ciò che le rocce cedono, più i sali vecchi che tornano; le cariche le chiude il bicarbonato
  const fiume = {}; if (fiumi > 0) { for (const e of ['Na', 'K', 'Mg', 'Ca', 'Si']) fiume[e] = (freno * apporto[e] + (oggi.torna[e] || 0) + (e === 'Ca' ? caTorna : 0) + (e === 'Mg' ? oggi.dolomiteSciolta : 0) + (e === 'Na' ? oggi.tornaSilicati || 0 : 0)) / fiumi; fiume.Cl = (oggi.torna.Cl + oggi.vulcani.Cl) / fiumi; fiume.S = (oggi.torna.S + oggi.vulcani.S) / fiumi; }
  return { ioni, eq, soglia, bilancio: { entra, esce, residenza }, fiume, fondoDiSale, vivo, fluido,
    flussi: { magma, caldo, tiepido, Tcamino, kNeutro, kSepolto, kSubduzione, evaporiti, gesso, riciclo, sfiato, parteBassa, copertura: { suiContinenti, sciolta: cop.sciolta, cinetica: cop.cinetica, calcioInEquilibrio: cop.Ca, calcare: Ccop, dolomite: Dcop, sciolto: caTorna, inGranelli: oggi.carbonatiInGranelli || 0 }, sedimento, CO2vulcani: vu.CO2, freno, sedimenti: sed, silicatiNuovi: silicati, sodioCheSiScioglie, mantello: mant, cloroAllaNascita: (1 - DATI.intrappolato) * ClTutto } };
}
// IL CARBONATO DELLA COPERTURA CHE L'ACQUA SCIOGLIE. Ogni chilo di roccia che l'erosione toglie dalle terre (consumata, kg/anno) è
// bagnato dall'acqua che scorre sulla stessa terra (fiumi, kg/anno): sul carbonato affiorante, che occupa delle terre la parte che ha
// nella roccia erosa, l'acqua prende calcio fino all'equilibrio con la calcite sotto l'anidride carbonica del suolo (qui quella
// dell'aria: senza vita nessuno respira nel suolo). Così di ogni mole di carbonato ripreso se ne scioglie al più
//     sciolta = cinetica · M_CaCO3 · fiumi · Ca_eq / consumata      (≤ 1; il resto va al mare in granelli),
// dove Ca_eq è il calcio dell'acqua in equilibrio con calcite e CO2 (acqua(), con Ω = 1: la stessa tabella del mare) e la cinetica
// è la parte dell'equilibrio che l'acqua raggiunge nel tempo in cui attraversa il suolo, C = Ca_eq·(1 − exp(−r·S·t/Ca_eq)):
//  · r, la velocità lontano dall'equilibrio (Plummer, Wigley e Parkhurst 1978, Am. J. Sci. 278, 179: r = k₁·a(H⁺) + k₂·a(H₂CO₃*) + k₃,
//    log k₁ = 0,198 − 444/T, log k₂ = 2,84 − 2177/T, log k₃ = −5,86 − 317/T, in mmol/cm²/s — a memoria), con l'acqua di pioggia del
//    suolo (acidoDelSuolo di chimica.js); verso l'equilibrio va come (1 − C/Ca_eq), la legge lineare più semplice;
//  · S, la superficie dei granelli per kg d'acqua dei pori: quella dei suoli di chimica.js (ROCCE.superficieGrani) per la roccia
//    che un kg d'acqua bagna con la porosità dei sedimenti (DATI.porosita);
//  · t, il tempo dell'acqua nel suolo: lo spessore del suolo (ROCCE.suolo) per la porosità, diviso il deflusso per m² di terra.
// (Sulla Terra la cinetica è 1: la calcite si scioglie in ore, l'acqua resta nel suolo mesi. È l'equilibrio a fermarla: con la CO2
// dell'aria, 0,28 mbar, l'acqua tiene ~0,5 mmol/kg di calcio, e il calcare eroso si scioglie solo in parte. Sulla Terra vera la CO2 del
// suolo è 10–100 volte quella dell'aria, per le radici e i microbi: lì il calcare si scioglie quasi tutto.)
export const MASSA_CARBONATO = Object.freeze({ calcite: 0.10009, dolomite: 0.18440 }); // kg/mol
export const PWP = Object.freeze({ k1: [0.198, -444], k2: [2.84, -2177], k3: [-5.86, -317] }); // log k = a + b/T (mmol/cm²/s): Plummer, Wigley e Parkhurst 1978 [a memoria]
export function sciogliCarbonati({ fiumi, consumata, areaTerra, T = 288, pCO2 }) {
  if (!(fiumi > 0) || !(consumata > 0) || !(areaTerra > 0) || !(T > 271)) return { sciolta: 0, cinetica: 0, Ca: 0 };
  const Ca = acqua({}, T, { pCO2, omegaCalcite: 1 }).Ca, K = costanti(T), k = (c) => Math.pow(10, c[0] + c[1] / T);
  const r = 10 * (k(PWP.k1) * acidoDelSuolo(pCO2, T) + k(PWP.k2) * K.henry.CO2 * pCO2 + k(PWP.k3)), phi = DATI.porosita; // (mol/m²/s: 1 mmol/cm² = 10 mol/m²)
  const S = (ROCCE.superficieGrani * ROCCE.densita * (1 - phi)) / (phi * 1000), t = (ROCCE.suolo * phi * 1000) / (fiumi / areaTerra) * ANNO; // (m²/kg d'acqua; s)
  const cinetica = Ca > 0 ? -Math.expm1((-r * S * t) / Ca) : 0;
  return { sciolta: Math.min(1, (cinetica * MASSA_CARBONATO.calcite * fiumi * Ca) / consumata), cinetica, Ca, tAcqua: t / ANNO };
}
// quanto sale esce perché il prodotto (a − x)(b − x) torni alla solubilità
const toglieSale = (a, b, Ks) => { const s = a + b, d = s * s - 4 * (a * b - Ks); return d > 0 ? Math.max(0, Math.min(a, b, 0.5 * (s - Math.sqrt(d)))) : 0; };
const gravita = (P) => (COSTANTI.G * P.massaKg) / (P.raggioM * P.raggioM);
// a che temperatura bolle l'acqua a una pressione (K): dalla stessa tabella (H2O liquida ⇌ vapore: K = p)
export { ebollizione }; // (a che temperatura bolle l'acqua a una pressione: la legge sola di leggi.js, dalla stessa tabella dell'acqua; qui c'era una copia, che sotto 1 Pa se ne staccava)

// L'ACQUA CHE EVAPORA IN UNA CONCA CHIUSA: i sali si concentrano e uno dopo l'altro superano la solubilità. Prima il
// calcare, finché finisce il calcio o l'alcalinità (lo «spartiacque chimico» di Hardie ed Eugster 1970: da lì il lago
// prende una strada o l'altra, di soda o di cloruri); poi il gesso; poi il salgemma. → { ioni, eq, precipitati (mol per
// kg d'acqua), salinita }
export function evapora(ioniIniziali, fattore, T, pCO2) {
  const c = {}; for (const e of ['Na', 'K', 'Mg', 'Ca', 'Cl', 'S', 'Si']) c[e] = (ioniIniziali[e] || 0) * fattore;
  const prec = { calcite: 0, magnesite: 0, gesso: 0, salgemma: 0, silice: 0, amari: 0 }, K = costanti(T), soglia = omegaCritica('calcite', T);
  { const x = Math.max(0, c.Si - K.sali['silice amorfa']); c.Si -= x; prec.silice = x; }
  let eq = acqua(c, T, { pCO2 });
  if (eq.omega.calcite > soglia) { // il calcio in più se ne va col carbonato: resta quello che l'equilibrio regge
    const alk = c.Na + c.K + 2 * c.Mg + 2 * c.Ca - c.Cl - 2 * c.S, x = Math.max(0, Math.min(c.Ca, alk / 2)), dopo = acqua({ ...c, Ca: undefined }, T, { pCO2, omegaCalcite: soglia });
    const resta = Math.min(c.Ca, Math.max(dopo.Ca, c.Ca - x)); prec.calcite = c.Ca - resta; c.Ca = resta; eq = acqua(c, T, { pCO2 });
  }
  // se dopo il calcio resta alcalinità, la prende il magnesio (carbonato di magnesio idrato, Ksp 10⁻⁵·² misurato): finito
  // anche lui, il lago è di soda; se invece finisce prima l'alcalinità, resta una salamoia neutra di cloruri e solfati
  if (eq.gamma['Mg2+'] * eq.liberi['Mg2+'] * eq.gamma['CO3(2-)'] * eq.liberi['CO3(2-)'] > 6.3e-6) { const alk = c.Na + c.K + 2 * c.Mg + 2 * c.Ca - c.Cl - 2 * c.S, x = 0.97 * Math.max(0, Math.min(c.Mg, alk / 2)); c.Mg -= x; prec.magnesite = x; eq = acqua(c, T, { pCO2 }); }
  // oltre una quindicina di moli di ioni per kg nemmeno i sali più solubili (di magnesio, di potassio, la soda) restano sciolti: il di più cristallizza
  // (a ogni passata se ne toglie una parte: togliendo sale le attività cambiano, e ciò che è uscito non rientra)
  for (let giro = 0; giro < 7; giro++) {
    { const tot = c.Na + c.K + c.Mg + c.Ca + c.Cl + c.S; if (tot > 16 && eq.omega.salgemma <= 1.02) { const f = 16 / tot; for (const e of ['Na', 'K', 'Mg', 'Ca', 'Cl', 'S']) { prec.amari += c[e] * (1 - f); c[e] *= f; } eq = acqua(c, T, { pCO2 }); } }
    if (eq.omega.gesso > 1) { const fr = (eq.liberi['Ca2+'] / Math.max(c.Ca, 1e-30)) * (eq.liberi['SO4(2-)'] / Math.max(c.S, 1e-30)), x = 0.6 * toglieSale(c.Ca, c.S, K.sali.gesso / (eq.gamma['Ca2+'] * eq.gamma['SO4(2-)'] * eq.attivitaAcqua ** 2 * fr)); c.Ca -= x; c.S -= x; prec.gesso += x; }
    if (eq.omega.salgemma > 1) { const fr = eq.liberi['Na+'] / Math.max(c.Na, 1e-30), x = 0.6 * toglieSale(c.Na, c.Cl, K.sali.salgemma / (eq.gamma['Na+'] * eq.gamma['Cl-'] * fr)); c.Na -= x; c.Cl -= x; prec.salgemma += x; }
    eq = acqua(c, T, { pCO2 });
  }
  return { ioni: c, eq, precipitati: prec, salinita: grammiPerKg(c, eq) };
}

// ---------- 4. IL MARE DEL PIANETA
const bil = (arr, W, H, x, y) => { const yy = limita(y, 0, H - 1.001), x0 = Math.floor(x), y0 = Math.floor(yy), u = x - x0, v = yy - y0, a = (i, j) => arr[j * W + (((i % W) + W) % W)];
  return a(x0, y0) * (1 - u) * (1 - v) + a(x0 + 1, y0) * u * (1 - v) + a(x0, y0 + 1) * (1 - u) * v + a(x0 + 1, y0 + 1) * u * v; };
const niente = (motivo, extra = {}) => ({ esiste: false, motivo, storia: motivo, W: 0, H: 0, salinitaMedia: 0, ioni: {}, pH: null, gas: {}, laghi: [], sorgentiCalde: [], foci: [], bilancio: null, ...extra });
// una coda per quota (come in geologia.js), per trovare le conche chiuse
function conche(alt, W, H, livello) {
  const N = W * H, pieno = new Float32Array(N), visto = new Uint8Array(N), hk = new Int32Array(N), hv = new Float32Array(N); let hn = 0;
  const push = (k, v) => { let i = hn++; while (i > 0) { const p = (i - 1) >> 1; if (hv[p] <= v) break; hk[i] = hk[p]; hv[i] = hv[p]; i = p; } hk[i] = k; hv[i] = v; };
  const pop = () => { const k = hk[0], lk = hk[--hn], lv = hv[hn]; let i = 0; for (;;) { let c = 2 * i + 1; if (c >= hn) break; if (c + 1 < hn && hv[c + 1] < hv[c]) c++; if (hv[c] >= lv) break; hk[i] = hk[c]; hv[i] = hv[c]; i = c; } hk[i] = lk; hv[i] = lv; return k; };
  let fonti = 0; for (let k = 0; k < N; k++) if (alt[k] < livello) { push(k, alt[k]); visto[k] = 1; pieno[k] = alt[k]; fonti++; }
  if (!fonti) { let m = 0; for (let k = 1; k < N; k++) if (alt[k] < alt[m]) m = k; push(m, alt[m]); visto[m] = 1; pieno[m] = alt[m]; }
  while (hn) { const c = pop(), i = c % W, j = (c - i) / W;
    for (let dj = -1; dj <= 1; dj++) { const jj = j + dj; if (jj < 0 || jj >= H) continue; for (let di = -1; di <= 1; di++) { const q = jj * W + ((i + di + W) % W); if (visto[q]) continue; visto[q] = 1; pieno[q] = Math.max(alt[q], pieno[c]); push(q, pieno[q]); } } }
  return pieno;
}

export function mare(P, sf, cl, se = null, caso = null) {
  const c0 = typeof caso === 'function' ? caso : sorgente(typeof caso === 'string' ? caso : 'mare'), s = se || sf;
  if (!s || !s.alt) return niente('manca la superficie del pianeta');
  const FW = s.W, FH = s.H, FN = FW * FH, livello = s.mare, R = P.raggioM, g = gravita(P);
  if (P.tipo === 'gassoso') return niente('un gigante gassoso non ha una superficie su cui l\'acqua possa raccogliersi');
  let celleMare = 0; if (isFinite(livello)) for (let k = 0; k < FN; k++) if (s.alt[k] < livello) celleMare++;
  let celleLago = 0; if (s.lago) for (let k = 0; k < FN; k++) if (s.lago[k] > 0 && !(s.alt[k] < livello)) celleLago++;
  if (!celleMare && !celleLago) return niente(String(P.clima?.acqua ?? '').startsWith('vapore') ? 'niente mare: qui l\'acqua bolle, sta nell\'aria come vapore (o è già fuggita nello spazio)' : 'niente mare: il pianeta non ha acqua in superficie');
  if (!cl || !cl.media) return niente('manca il clima del pianeta');
  { let tMax = 0; for (let k = 0; k < cl.media.length; k++) tMax = Math.max(tMax, cl.media[k]); const pAria = P.clima?.pressione ?? 0;
    if (tMax < 263) return niente('niente mare liquido in superficie: l\'acqua c\'è, ma è tutta ghiaccio (sotto, se l\'interno è caldo, può esserci un oceano chiuso)', { stato: 'ghiaccio' });
    if (isFinite(pAria) && pAria < 611) return niente('niente mare: sotto 611 Pa l\'acqua liquida non può esistere, il ghiaccio passa direttamente a vapore'); }
  // --- le griglie: quella fine della superficie (FW×FH) e quella del mare (W×H, il doppio di quella del clima se si può)
  const W = FW % (2 * cl.W) === 0 ? 2 * cl.W : FW % cl.W === 0 ? cl.W : FW, kx = FW / W, H = FH / kx, N = W * H, m = cl.meteo && cl.meteo.regime === 'aria' ? cl.meteo : null;
  const dl = (2 * Math.PI) / W, df = Math.PI / H, lat = (j) => Math.PI / 2 - (j + 0.5) * df, cosJ = Float64Array.from({ length: H }, (_, j) => Math.cos(lat(j))), area = (j) => R * R * dl * df * cosJ[j];
  const areaF = (jf) => (R * R * dl * df * Math.cos(Math.PI / 2 - ((jf + 0.5) / FH) * Math.PI)) / (kx * kx);
  const tipo = new Uint8Array(FN), fondoF = new Float32Array(FN), bagnato = new Float32Array(N), fondo = new Float32Array(N);
  let massaMare = 0, areaMare = 0;
  for (let jf = 0; jf < FH; jf++) for (let i = 0; i < FW; i++) { const k = jf * FW + i, h = s.alt[k];
    if (h < livello) { tipo[k] = 1; fondoF[k] = livello - h; const q = Math.floor(jf / kx) * W + Math.floor(i / kx); bagnato[q] += 1 / (kx * kx); fondo[q] += fondoF[k]; massaMare += 1000 * fondoF[k] * areaF(jf); areaMare += areaF(jf); }
    else if (s.lago && s.lago[k] > 0) { tipo[k] = 2; fondoF[k] = s.lago[k]; } }
  for (let k = 0; k < N; k++) if (bagnato[k] > 0) fondo[k] /= bagnato[k] * kx * kx;
  // --- il clima e il tempo, portati sulla griglia del mare
  const suGriglia = (x) => { const o = new Float32Array(N); if (!x) return o; for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) o[j * W + i] = bil(x, cl.W, cl.H, ((i + 0.5) / W) * cl.W - 0.5, ((j + 0.5) / H) * cl.H - 0.5); return o; };
  const Tclima = suGriglia(cl.media), ghiaccio = suGriglia(cl.freddo), vu = suGriglia(m?.u), vv = suGriglia(m?.v), evap = suGriglia(m?.evaporazione), piove = suGriglia(m?.pioggia), umid = suGriglia(m?.umidita);
  // --- l'aria: quanta anidride carbonica e quanto ossigeno premono sull'acqua
  let aria = P.atmosfera; if (!aria || !aria.gas) { try { aria = atmosfera(P); } catch { aria = { gas: {} }; } }
  const pAria = isFinite(P.clima?.pressione) ? P.clima.pressione : aria.pressione || 1e5, pCO2Aria = Math.max(1e-12, ((aria.gas.CO2 || 0) * pAria) / 1e5), pO2 = ((aria.gas.O2 || 0) * pAria) / 1e5;
  // --- le terre: quanta roccia si consuma (sulla griglia del clima; raccolta per temperatura: ciò che cede dipende da quella e dalla CO2)
  // UNA FONTE PER LA DENUDAZIONE: quanta roccia le terre perdono l'anno (m, in media) è ciò che l'erosione ha calcolato per
  // questo pianeta (geologia.js erosione: s.denudazione), e il sedimento che i fiumi portano al mare è il suo
  // (s.fangoAlMare). Solo se la superficie non è passata dall'erosione vale la stima attesa, una sola, di chimica.js
  // (ROCCE.denudazione: 30 m per milione di anni dove piove). I SALI li cede la roccia al suo primo giro (basamento e
  // lave: s.denudazioneFresca) e, di nuovo, il SEDIMENTO CHE L'EROSIONE RIPRENDE: è già passato da un suolo, che gli ha
  // sciolto la parte f dei minerali che il tempo del suolo permette, ma la parte che resta (1 − f) si scioglie ancora, con la
  // stessa legge che riparte da zero: le cronosequenze di White e Brantley 2003 (Merced, Santa Cruz) sono alluvioni e terrazzi
  // di sedimento già consumato a monte, e la loro età è quella del deposito. Per ogni elemento il sedimento cede f·(1 − f) di
  // ciò che la roccia aveva (un giro solo prima: il minimo). Prima il sedimento ripreso non cedeva niente: sulla Terra di
  // prova sei decimi della denudazione restavano muti (manca ancora: il calcare e il sale della copertura). Tra le celle la
  // roccia è ripartita come la pioggia (bagna), con la media sulle terre uguale a quella dell'erosione; la denudazione intera
  // dice quanto il granello resta nel suolo (rilascio di chimica.js, quarto argomento).
  const rocce = rocceDelPianeta(P), kc = FW / cl.W, fasce = new Map(), celleTerra = []; let sedimento = 0, fiumi = 0, areaTerra = 0, massaCont = 0, areaBagnata = 0, coperturaErosa = 0, Tsuoli = 0;
  for (let j = 0; j < cl.H; j++) for (let i = 0; i < cl.W; i++) { const k = j * cl.W + i; let terra = 0, cont = 0;
    for (let b = 0; b < kc; b++) for (let a = 0; a < kc; a++) { const q = (j * kc + b) * FW + i * kc + a; if (tipo[q] === 0) { terra++; if (s.cont && s.cont[q] && !(s.litologia && s.litologia[q] === 1)) cont++; } }
    if (!terra) continue; const A = (R * R * ((2 * Math.PI) / cl.W) * (Math.PI / cl.H) * Math.sin(((j + 0.5) / cl.H) * Math.PI) * terra) / (kc * kc), T = cl.media[k]; areaTerra += A;
    const bagna = (m ? Math.min(1, m.pioggia[k] / 500) : cl.piove === false ? 0 : limita((T - 255) / 40, 0, 1)) * (1 - cl.freddo[k]); areaBagnata += A * bagna; celleTerra.push([k, A, T, bagna, cont / terra]); }
  const dallErosione = s.denudazione > 0 && areaBagnata > 0, denudazione = dallErosione ? s.denudazione : ROCCE.denudazione, fresca = dallErosione ? Math.min(s.denudazione, s.denudazioneFresca ?? s.denudazione) : ROCCE.denudazione;
  const perCella = dallErosione ? (fresca * areaTerra) / areaBagnata : ROCCE.denudazione, ripresa = dallErosione ? ((s.denudazione - fresca) * areaTerra) / areaBagnata : 0;
  for (const [k, A, T, bagna, fc] of celleTerra) { const massa = perCella * ROCCE.densita * A * bagna, mr = ripresa * ROCCE.densita * A * bagna, tk = Math.round(T / 2) * 2;
    const f = fasce.get(tk) || [0, 0, 0, 0]; f[0] += massa * fc; f[1] += massa * (1 - fc); f[2] += mr * fc; f[3] += mr * (1 - fc); fasce.set(tk, f); massaCont += (massa + mr) * fc; sedimento += massa + mr; coperturaErosa += mr; Tsuoli += (massa + mr) * T; fiumi += A * (m ? m.deflusso[k] : 300 * bagna); }
  const consumata = sedimento; Tsuoli = consumata > 0 ? Tsuoli / consumata : 288; if (dallErosione && s.fangoAlMare > 0) sedimento = s.fangoAlMare; // (consumata: la roccia, fresca e ripresa, che si disfa sulle terre; sedimento: tutto ciò che arriva al mare)
  // (ciò che il sedimento ripreso cede: per ogni elemento f·(1 − f) della roccia, con f la parte che il suolo ne scioglie)
  const ELEMENTI_SUOLO = ['Na', 'K', 'Ca', 'Mg'], ripreso = (x, r) => { const o = { ...x }; let c = 0; for (const e of ELEMENTI_SUOLO) { const f = r[e] > 0 ? Math.min(1, x[e] / r[e]) : 0; o[e] = x[e] * (1 - f); c += (e === 'Na' || e === 'K' ? 1 : 2) * o[e]; } o.Si = x.Si * (x.cariche > 0 ? c / x.cariche : 0); o.cariche = c; o.argilla = x.argilla * (x.cariche > 0 ? c / x.cariche : 0); return o; };
  const NaConsumato = (() => { let n = 0; for (const [T, [mg, mb, rg, rb]] of fasce) { const fg = rilascio(rocce.granito, T, 2.8e-4, denudazione).Na / rocce.granito.Na, fb = rilascio(rocce.basalto, T, 2.8e-4, denudazione).Na / rocce.basalto.Na; n += mg * rocce.granito.Na + mb * rocce.basalto.Na + rg * rocce.granito.Na * (1 - fg) + rb * rocce.basalto.Na * (1 - fb); } return n; })(); // (mol/anno di sodio nella roccia consumata: fresca, e quello rimasto nel sedimento ripreso)
  const cedono = (p) => { const o = { Na: 0, K: 0, Ca: 0, Mg: 0, Si: 0, cariche: 0, argilla: 0, sabbia: 0 }; for (const [T, [mg, mb, mrg, mrb]] of fasce) { const rg = rilascio(rocce.granito, T, p, denudazione), rb = rilascio(rocce.basalto, T, p, denudazione), rg2 = mrg > 0 ? ripreso(rg, rocce.granito) : rg, rb2 = mrb > 0 ? ripreso(rb, rocce.basalto) : rb; for (const e of ['Na', 'K', 'Ca', 'Mg', 'Si', 'cariche', 'argilla']) o[e] += mg * rg[e] + mb * rb[e] + mrg * rg2[e] + mrb * rb2[e]; o.sabbia += mg * (1 - rg.argilla) + mrg * (1 - rg2.argilla); } return o; };
  // IL CARBONIO È UNO SOLO, nell'aria e nel mare. La pressione di CO2 è quella dell'aria del pianeta; ma se chi ha fatto
  // l'aria non ha contato i vulcani e le rocce (la CO2 è rimasta all'equilibrio di Urey o al minimo che tiene il mare
  // aperto), qui la si calcola: quella a cui le terre VERE di questo pianeta, con le loro temperature e le loro piogge,
  // consumano tanta CO2 quanta i vulcani ne emettono, più quella che il fondo del mare prende (co2DelCiclo di chimica.js: la
  // stessa legge di climaEAria). (Prima mancava il raggio: i vulcani di co2DelCiclo davano NaN, e la CO2 del ciclo qui era sempre 0)
  const pCO2Ciclo = co2DelCiclo({ calore: (P.interno?.vulcani ?? 1) > 0 ? P.interno?.q ?? 0 : 0, // (senza vulcani niente sorgente: come in cosmo.js)
    raggioM: R, massaKg: P.massaKg, composizione: P.composizione, T: cl.Tglobale || 288, mare: areaMare / (4 * Math.PI * R * R), consumo: (p) => cedono(p).cariche });
  // (sul termostato — il mare che col ciclo gelerebbe, e la CO2 che sale finché si riapre: climaEAria punto 3 — la CO2 dell'aria
  // è quella giusta, e qui non si cambia: la CO2 del ciclo, più bassa, lo farebbe gelare. Prima questo caso tornava al ciclo, ma la
  // CO2 del ciclo qui era sempre 0 — mancava il raggio — e non succedeva mai; ora che c'è, darebbe mari a pH 11 sotto 10⁻⁸ bar)
  const ariaSenzaCiclo = P.clima?.co2Ciclo == null && !(P.clima?.termostato > 0) && pCO2Ciclo > 0 && pCO2Aria <= (3 * pressioneCO2Urey(cl.Tglobale || 288)) / 1e5;
  // (se nemmeno sotto tutta la pressione dell'aria le rocce tengono il passo coi vulcani, la CO2 si accumula: qui ci si ferma alla pressione dell'aria che c'è, e lo si segnala)
  const nonRegge = ariaSenzaCiclo && pCO2Ciclo > pAria / 1e5, pCO2 = ariaSenzaCiclo ? Math.min(pCO2Ciclo, pAria / 1e5) : pCO2Aria, ceduto = cedono(pCO2), apporto = { Na: ceduto.Na, K: ceduto.K, Ca: ceduto.Ca, Mg: ceduto.Mg, Si: ceduto.Si }, arriva = consumata > 0 ? sedimento / consumata : 1, argilla = ceduto.argilla * arriva, sabbia = ceduto.sabbia * arriva; // (argilla e sabbia: di ciò che arriva al mare, nelle proporzioni della roccia fresca)
  // --- la temperatura media del mare; quanta parte del pianeta lascia sfiatare il magma (terra, o mare meno profondo
  // di ciò che fa 100 bar con l'aria sopra); dove si deposita il calcare (nei mari più caldi della media: quanta parte su fondali bassi, che un giorno torneranno terra)
  let Tmare = 0, aT = 0;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i; if (!(bagnato[k] > 0)) continue; const A = area(j) * bagnato[k]; Tmare += Math.max(271, Tclima[k]) * A; aT += A; }
  Tmare = aT > 0 ? Tmare / aT : 280;
  let aBassa = 0, aTutta = 0, calcBasso = 0, calcTutto = 0; const fondoSfiato = (DATI.pressioneSfiato - pAria) / (1025 * g);
  for (let jf = 0; jf < FH; jf++) { const A = areaF(jf); for (let i = 0; i < FW; i++) { const k = jf * FW + i; aTutta += A; if (tipo[k] === 1 ? fondoF[k] < fondoSfiato : pAria < DATI.pressioneSfiato) aBassa += A; } }
  // il calcare nasce dove il mare è più caldo della media (lì supera la soglia: omegaCritica) e cade sul fondo che ha sotto: quello
  // posato sulla crosta dei continenti (s.cont, la crosta leggera di tettonica.js anche dove è sommersa: piattaforme e margini) torna
  // terra con loro; quello sulla crosta degli oceani scende con la placca. (Prima: la parte sui fondali sotto 200 m, che su celle di
  // 150 km non sono le piattaforme, e tornava tutto sciolto.)
  for (let jf = 0; jf < FH; jf++) { const A = areaF(jf), jc = Math.floor(jf / kx); for (let i = 0; i < FW; i++) { const q = jf * FW + i; if (tipo[q] !== 1 || !(Tclima[jc * W + Math.floor(i / kx)] > Tmare)) continue; calcTutto += A; if (s.cont && s.cont[q]) calcBasso += A; } }
  const placche = P.interno?.tettonica ? P.interno.tettonica === 'a placche' : (s.placche || 0) > 1, q0 = P.interno?.q ?? 0;
  // ogni quanto i sedimenti tornano in gioco: il tempo in cui le placche chiudono un oceano (larghezza / velocità delle placche)
  const vPlacche = s.tettonica?.velocita > 0 ? s.tettonica.velocita : TETTONICA.vTerra * (q0 / TETTONICA.qTerra) ** 2, riciclo = placche && q0 > 0 && areaMare > 0 ? Math.sqrt(areaMare) / vPlacche : Infinity; // (la velocità delle placche è quella che la tettonica di questa superficie ha usato; la legge di scala solo se la superficie non la porta)
  // --- LE FOCI: dove i fiumi di erosione() entrano in mare (in proporzione alla portata), cella per cella
  const dolceFine = new Float32Array(FN); let sommaFoci = 0; if (s.flusso) for (let k = 0; k < FN; k++) if (tipo[k] === 1 && s.flusso[k] > 2) sommaFoci += s.flusso[k];
  if (sommaFoci > 0) for (let k = 0; k < FN; k++) if (tipo[k] === 1 && s.flusso[k] > 2) dolceFine[k] = ((s.flusso[k] / sommaFoci) * fiumi) / 1000 / ANNO; // (m³/s)
  // --- I MARI QUASI CHIUSI (bacini(), più sotto): la loro forma, il loro stretto, quanto evaporano
  const bac = baciniDelMare({ tipo, fondoF, FW, FH, areaF, R, eMenoP: (k) => { const i = k % FW, j = (k - i) / FW, x = ((i + 0.5) / FW) * W - 0.5, y = ((j + 0.5) / FH) * H - 0.5; return (bil(evap, W, H, x, y) - bil(piove, W, H, x, y)) / 1000 / ANNO; }, dolceFine, g, c0 });
  // (senza mare ma con laghi: il bilancio si fa lo stesso per avere l'acqua dei fiumi; due giri: i bacini che arrivano al sale dipendono da quanto è salato il mare, e viceversa)
  let bs = null, evaporiti = 0;
  let gesso = 0;
  for (let giro = 0; giro < 3; giro++) { const So = bs ? grammiPerKg(bs.ioni, bs.eq) : 35, fSat = bs ? fattoreDiSaturazione(bs.ioni, Tmare, pCO2) : 10;
    // (il gesso: con il mare del giro prima; kGesso è la parte del solfato del mare che i bacini tolgono in un anno)
    const perGesso = bs && bs.ioni.S > 0 && bs.ioni.Ca > 0 ? { f: fattoreDiSaturazione(bs.ioni, Tmare, pCO2, 'gesso'), Ca: bs.ioni.Ca, S: bs.ioni.S } : null; let moliGesso = 0;
    evaporiti = 0; for (const b of bac.lista) { chiudiBacino(b, So, fSat, g, perGesso); evaporiti += (b.depositoAtteso * 1000 * ANNO) / Math.max(massaMare, 1); moliGesso += b.gessoAtteso * ANNO; }
    gesso = perGesso ? moliGesso / (perGesso.S * Math.max(massaMare, 1)) : 0;
    bs = bilancioSali({ P, rocce, massaMare: Math.max(massaMare, 1), areaMare, fiumi, apporto, argilla, sedimento, evaporiti, gesso, riciclo, parteBassa: aTutta > 0 ? aBassa / aTutta : 0, suiContinenti: calcTutto > 0 ? calcBasso / calcTutto : 0, coperturaErosa: dallErosione ? coperturaErosa : Infinity, consumata, areaTerra, Tsuoli, pCO2, O2: pO2, Tmare, placche, sodioCheSiScioglie: NaConsumato > 0 ? ceduto.Na / NaConsumato : 0 }); }
  const ioni = bs.ioni, eq = bs.eq, salinitaMedia = celleMare ? grammiPerKg(ioni, eq) : 0, moli = ioni.Na + ioni.K + ioni.Mg + ioni.Ca + ioni.Cl + ioni.S + eq.bicarbonato;
  const out = { esiste: true, W, H, raggioM: R, gravita: g, livello, massaMare, areaMare, frazioneMare: areaMare / (4 * Math.PI * R * R), profonditaMedia: areaMare > 0 ? massaMare / 1000 / areaMare : 0,
    salinitaMedia, ioni: nomiIoni(ioni, eq), totali: { ...ioni }, pH: eq.pH, alcalinita: eq.alcalinita, carbonio: eq.carbonio, soglia: bs.soglia, pCO2, pO2,
    carbonioAria: { pCO2Aria, pCO2Ciclo, nonRegge, usata: ariaSenzaCiclo ? 'ciclo' : 'aria', vulcani: bs.flussi.CO2vulcani, consumo: ceduto.cariche }, pressioneAria: pAria, aria: { ...aria.gas },
    gas: gasSciolti(aria.gas, pAria, Tmare, eq.I), Tmedia: Tmare, congela: congelamento(moli), bilancio: bs.bilancio, fiume: bs.fiume, fondoDiSale: bs.fondoDiSale, flussi: bs.flussi,
    fine: { W: FW, H: FH, tipo, fondo: fondoF, lago: new Int16Array(FN).fill(-1) }, bagnato, fondo, ghiaccio, vento: { u: vu, v: vv }, radice: c0.radice };
  // LE TRACCE (elementi.js tracceDelMare: Li, B, F, Br, I, Sr, U, Mo, Fe, Mn, P, Rb, Ba e la silice, con la loro specie): dalla
  // crosta di QUESTO pianeta (cosmo.js la mette accanto alla composizione) che la pioggia consuma, nella parte che rilascio()
  // scioglie del minerale ospite, e dai vulcani; escono come escono i sali di bilancioSali. Un pianeta senza la sua catena
  // degli elementi (fatto a mano) non le ha. (Un campo a parte: «totali» resta quello dei sali di sempre.)
  try { const cr = P.composizione?.crosta, el = P.composizione?.elementi;
    if (cr && el?.simboli) { const S = el.simboli, perKg = (v, M) => { const o = {}; if (M > 0) for (let i = 0; i < S.length; i++) if (v[i] > 0) o[S[i]] = v[i] / M; return o; };
      let Ms = 0; for (const v of el.silicato) Ms += v; const T = Math.max(272, cl.Tglobale || Tmare), ril = (r) => { const x = rilascio(r, T, pCO2, denudazione); return { Na: x.Na, K: x.K, Ca: x.Ca, Mg: x.Mg }; };
      out.tracce = tracceDelMare(out, { crosta: { granito: cr.Mgranito > 0 ? perKg(cr.granito, cr.Mgranito) : perKg(cr.basalto, cr.Mbasalto), basalto: cr.Mbasalto > 0 ? perKg(cr.basalto, cr.Mbasalto) : perKg(cr.granito, cr.Mgranito) },
        rilascio: { granito: ril(rocce.granito), basalto: ril(rocce.basalto) }, consumata, granito: consumata > 0 ? massaCont / consumata : 0, mantello: perKg(el.silicato, Ms), eta: P.interno?.eta ?? 4.5e9,
        Ca: ioni.Ca, solfato: eq.liberi?.['SO4(2-)'] ?? ioni.S, carbonato: eq.liberi?.['CO3(2-)'] ?? 0, calcareMoliAnno: bs.bilancio?.esce?.Ca?.calcare ?? 0, ossigeno: pO2 }); } } catch { /* senza le tracce */ }
  // l'acqua dei fiumi in equilibrio con l'aria
  { const f = bs.fiume, ef = acqua({ ...f, Ca: f.Ca || 0 }, Math.max(274, cl.Tglobale || 285), { pCO2 }); out.fiume = { ...f, pH: ef.pH, salinita: grammiPerKg(f, ef), portataKgAnno: fiumi, sedimentoKgAnno: sedimento, argillaKgAnno: argilla, sabbiaKgAnno: sabbia }; }
  // la lista delle foci, con la loro acqua e il loro fango
  const lonDi = (i, w) => ((i + 0.5) / w) * 360 - 180, latDi = (j, h) => 90 - ((j + 0.5) / h) * 180, foci = [], dolce = new Float64Array(N), fango = new Float64Array(N);
  const kPortata = sommaFoci > 0 ? fiumi / sommaFoci : fiumi > 0 && areaTerra > 0 ? (fiumi / areaTerra) * areaF(FH >> 1) : 0, parteFine = sedimento > 0 ? argilla / sedimento : 0.3;
  if (sommaFoci > 0) for (let k = 0; k < FN; k++) if (dolceFine[k] > 0) { const i = k % FW, j = (k - i) / FW, parte = s.flusso[k] / sommaFoci, q = Math.floor(j / kx) * W + Math.floor(i / kx);
    dolce[q] += dolceFine[k]; fango[q] += (parte * argilla) / ANNO; // (m³/s d'acqua; kg/s d'argilla)
    foci.push({ lon: lonDi(i, FW), lat: latDi(j, FH), portata: dolceFine[k], sedimento: (parte * sedimento) / ANNO, argilla: parteFine }); }
  foci.sort((a, b) => b.portata - a.portata); out.foci = foci.slice(0, 400);
  // --- LE CORRENTI (correnti(), più sotto) e i campi che portano
  const rhoAria = pAria / ((m?.aria?.R ?? 287) * Tmare), tx = new Float64Array(N), ty = new Float64Array(N);
  for (let k = 0; k < N; k++) { const v = Math.hypot(vu[k], vv[k]); tx[k] = rhoAria * DATI.cd * v * vu[k]; ty[k] = rhoAria * DATI.cd * v * vv[k]; }
  let tMin = Infinity, tMax = -Infinity; for (let k = 0; k < N; k++) if (bagnato[k] >= 0.5) { tMin = Math.min(tMin, Math.max(out.congela, Tclima[k])); tMax = Math.max(tMax, Tclima[k]); }
  if (!isFinite(tMin)) { tMin = tMax = Tmare; }
  const co = correnti({ W, H, R, omega: (2 * Math.PI) / (P.giorno || GIORNO), bagnato, fondo, tx, ty, g, salto: Math.max(0.2, densita(tMin, salinitaMedia) - densita(tMax, salinitaMedia)), areaMare });
  const righe = { A: Float64Array.from({ length: H }, (_, j) => area(j)), dx: Float64Array.from({ length: H }, (_, j) => R * dl * cosJ[j]), dxS: Float64Array.from({ length: H }, (_, j) => R * dl * Math.max(0, Math.cos(lat(j) - df / 2))), dy: R * df };
  const h = DATI.strato, wMescola = DATI.mescola / co.termoclino, lambda = m?.scambio > 0 ? m.scambio : 4 * COSTANTI.sigma * Tmare ** 3, tauT = (1025 * 4000 * h) / lambda;
  const sorg = new Float64Array(N), perd = new Float64Array(N), porta = (q, fondoQ) => trasporta({ W, H, co, righe, h, q, fondoQ, sorg, perd, wMescola });
  // IL GHIACCIO MARINO: dove il clima tiene l'aria sotto il punto di gelo dell'acqua salata per una parte dell'anno, il
  // ghiaccio cresce dall'alto (legge di Stefan: h = √(2·k·ΔT·t/(ρ·L)), col calore di fusione di chimica.js); cristallizzando
  // lascia nell'acqua sotto quasi tutto il suo sale (l'85%: dato misurato), che la rende più densa
  const spessoreGhiaccio = new Float32Array(N), Lfus = (1000 * (MOLECOLE['H2O(l)'].dH - MOLECOLE['H2O(s)'].dH)) / MOLARE_ACQUA;
  for (let k = 0; k < N; k++) if (bagnato[k] > 0 && ghiaccio[k] > 0.01) spessoreGhiaccio[k] = Math.sqrt((2 * 2.2 * Math.max(1, out.congela - Tclima[k] + 5 * ghiaccio[k]) * ghiaccio[k] * (P.anno || ANNO)) / (917 * Lfus));
  let Tfondo = tMin, Sfondo = salinitaMedia; const Tm = Float32Array.from(Tclima, (t) => Math.max(out.congela, t)), Sm = new Float32Array(N).fill(salinitaMedia), dense = [];
  for (let giro = 0; giro < 2 && celleMare; giro++) {
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i, A = righe.A[j]; sorg[k] = ((A * h) / tauT) * Math.max(out.congela, Tclima[k]); perd[k] = (A * h) / tauT; }
    // L'ACQUA CHE RISALE NON È UN POZZO DI CALORE. Il fondo freddo (Tfondo, l'acqua più densa che affonda) riceve dall'alto il calore che
    // il rimescolamento e le risalite gli danno, e a regime lo rende: l'acqua che torna su è più calda di quella che è scesa, tanto da
    // pareggiare il conto (Munk 1966: la risalita è bilanciata dal calore che scende per diffusione). Qui: la temperatura dell'acqua che
    // torna in superficie è quella per cui ciò che il fondo prende e ciò che rende sono uguali, la media delle temperature di superficie
    // pesata con quanto ogni cella scambia col fondo. Prima l'acqua tornava su alla temperatura dell'acqua che affonda: il fondo era un
    // pozzo senza fine, il mare toglieva in media 40 W/m² all'aria sulla Terra di prova (test_fili: «un'incoerenza di mare.js») e
    // nessuna corrente arrivava a scaldare l'aria. La temperatura del fondo (Tfondo) resta quella dell'acqua che affonda
    const Tsu = (() => { const daSotto = 1 - Math.exp((-2 * h) / co.termoclino); let sT = 0, sC = 0;
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i; if (!co.mare[k]) continue; const kw = j * W + ((i + W - 1) % W), div = co.FE[k] - co.FE[kw] + (j > 0 ? co.FS[k - W] : 0) - co.FS[k], c = wMescola * righe.A[j] + (div > 0 ? div * daSotto : 0); sT += c * Tm[k]; sC += c; }
      return sC > 0 ? sT / sC : Tfondo; })();
    porta(Tm, Tsu); for (let k = 0; k < N; k++) if (Tm[k] < out.congela) Tm[k] = out.congela;
    // la salinità: l'evaporazione concentra, la pioggia e i fiumi diluiscono; la corrente e il fondo rimescolano
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i, A = righe.A[j]; sorg[k] = (A * evap[k] * Sm[k]) / 1000 / ANNO; perd[k] = (A * piove[k]) / 1000 / ANNO + dolce[k]; }
    for (let r = 0; r < 2; r++) { porta(Sm, Sfondo); for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i; sorg[k] = (righe.A[j] * evap[k] * Sm[k]) / 1000 / ANNO; } }
    { let sA = 0, aA = 0; for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i; if (co.mare[k]) { sA += Sm[k] * righe.A[j]; aA += righe.A[j]; } } const f = sA > 0 ? (salinitaMedia * aA) / sA : 1; for (let k = 0; k < N; k++) Sm[k] *= f; }
    // L'ACQUA PIÙ DENSA (fredda e salata) affonda e riempie il fondo: è lei l'acqua profonda di tutto il mare
    dense.length = 0; for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i; if (co.mare[k]) dense.push([densita(Tm[k], Sm[k] * (1 + (0.85 * spessoreGhiaccio[k]) / h)), k, righe.A[j]]); }
    dense.sort((a, b) => b[0] - a[0]); let aD = 0, tD = 0, sD = 0; for (const [, k, A] of dense) { if (aD > 0.02 * areaMare) break; aD += A; tD += Tm[k] * A; sD += Sm[k] * A; }
    if (aD > 0) { Tfondo = tD / aD; Sfondo = sD / aD; }
  }
  // i mari quasi chiusi hanno la loro salinità (lo scambio attraverso lo stretto contro evaporazione, pioggia e fiumi)
  { const So = salinitaMedia, fSat = fattoreDiSaturazione(ioni, Tmare, pCO2); for (const b of bac.lista) chiudiBacino(b, So, fSat, g);
    out.fine.bacino = bac.id; out.bacini = bac.lista.map(({ celle, ...b }) => ({ ...b, descrizione: b.saturo ? 'mare quasi chiuso che evapora: è arrivato al sale, che si deposita sul fondo e sulle rive' : b.salinita > 1.08 * So ? 'mare quasi chiuso dove evapora più acqua di quanta ne arrivi: più salato del mare aperto' : b.salinita < 0.92 * So ? 'mare quasi chiuso dove piove e arrivano fiumi più di quanto evapori: salmastro' : 'golfo che scambia bene col mare aperto' }));
    const conta = new Float32Array(N), sommaS = new Float32Array(N); for (const b of bac.lista) for (const k of b.celle) { const q = Math.floor(Math.floor(k / FW) / kx) * W + Math.floor((k % FW) / kx); conta[q] += 1 / (kx * kx); sommaS[q] += b.salinita / (kx * kx); }
    for (let q = 0; q < N; q++) if (conta[q] > 0 && bagnato[q] > 0) Sm[q] = Sm[q] * (1 - Math.min(1, conta[q] / bagnato[q])) + (sommaS[q] / conta[q]) * Math.min(1, conta[q] / bagnato[q]); }
  // l'argilla dei fiumi: entra alle foci, viaggia con la corrente, cade con la velocità di Stokes. Nel mare salato coagula
  // (Schulze-Hardy, inFiocchi: la stessa legge del pennacchio di luogo()), e i fiocchi cadono in pochi giorni, dentro il
  // pennacchio della foce: lontano arriva solo la parte che resta in granelli. (Prima viaggiava tutta come granelli, e un punto
  // di mare aperto a 4750 km dalle foci, in mezzo a un giro, aveva 0,12 g/m³ di argilla: il mare aperto vero ne ha qualche mg/m³)
  const wArgilla = Math.max(1e-7, stokes(DATI.taglie.argilla, DATI.densitaGrani, Tmare, salinitaMedia, g)), torb = new Float32Array(N), sciolta = 1 - inFiocchi(ioni);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i; sorg[k] = fango[k] * sciolta; perd[k] = righe.A[j] * wArgilla; }
  if (celleMare) porta(torb, 0);
  // --- le saturazioni: l'equilibrio calcolato su una tavola (temperatura × salinità) e interpolato
  const tavola = { T: [271, 276, 282, 288, 294, 300, 306, 314], f: [0.3, 0.6, 0.85, 1, 1.2, 1.6], pH: [], calcite: [], gesso: [], salgemma: [] };
  for (const T of tavola.T) for (const f of tavola.f) { const t = {}; for (const e in ioni) t[e] = ioni[e] * f; const a = acqua(t, T, { pCO2 }); tavola.pH.push(a.pH); for (const x of ['calcite', 'gesso', 'salgemma']) tavola[x].push(Math.log(Math.max(1e-30, a.omega[x]))); }
  out.tavola = tavola;
  const sat = { calcite: new Float32Array(N), gesso: new Float32Array(N), salgemma: new Float32Array(N) }, pHc = new Float32Array(N);
  for (let k = 0; k < N; k++) { const x = dallaTavola(tavola, Tm[k], salinitaMedia > 0 ? Sm[k] / salinitaMedia : 1); pHc[k] = x.pH; sat.calcite[k] = x.calcite; sat.gesso[k] = x.gesso; sat.salgemma[k] = x.salgemma; }
  // i campi valgono sul mare: sulle celle di terra si mette la media dei vicini bagnati (serve a interpolare lungo le coste)
  for (const x of [Tm, Sm, torb, co.u, co.v, co.w, pHc, sat.calcite, sat.gesso, sat.salgemma]) riempiTerra(x, co.mare, W, H);
  // la torbidità sulla griglia fine: l'argilla portata lontano, più il pennacchio di ogni foce nelle celle attorno
  const torbidaFine = new Float32Array(FN); for (let j = 0; j < FH; j++) for (let i = 0; i < FW; i++) { const k = j * FW + i; if (tipo[k] === 1) torbidaFine[k] = bil(torb, W, H, ((i + 0.5) / FW) * W - 0.5, ((j + 0.5) / FH) * H - 0.5); }
  out.fiume.sospeso = fiumi > 0 ? (sedimento / fiumi) * 1000 : 0; // (kg di fango per m³ d'acqua di fiume)
  for (const f of out.foci.slice(0, 200)) { const i0 = Math.floor(((f.lon + 180) / 360) * FW), j0 = Math.floor(((90 - f.lat) / 180) * FH);
    for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) { const j = j0 + dj, i = (i0 + di + FW) % FW; if (j < 0 || j >= FH || tipo[j * FW + i] !== 1) continue;
      const x = Math.max(0.3 * R * (Math.PI / FH), distanza(R, f.lon, f.lat, lonDi(i, FW), latDi(j, FH))), pn = pennacchio(f.portata, x, g); torbidaFine[j * FW + i] += out.fiume.sospeso * f.argilla * pn.parte * Math.exp((-x * wArgilla) / (pn.velocita * DATI.pennacchio)); } }
  // LA POLVERE CHE IL VENTO PORTA DALLE TERRE ASCIUTTE (polvereDelVento, più sotto): il flusso che cade su ogni cella (kg/m²/s)
  // (le terre che possono dare polvere: dove l'acqua ha lasciato sedimenti fini — la sorgente «geomorfica» di Zender e altri 2003:
  // la polvere viene dalle piane alluvionali e dai fondi dei laghi asciutti, non dalla roccia nuda né dai ciottoli)
  const erodibile = new Float32Array(N); if (s.depositato) for (let k = 0; k < FN; k++) if (tipo[k] !== 1 && s.depositato[k] > 3) { const i = k % FW, j = (k - i) / FW; erodibile[Math.floor(j / kx) * W + Math.floor(i / kx)] += 1 / (kx * kx); }
  out.polvere = polvereDelVento({ W, H, R, bagnato, erodibile, vu, vv, piove, umid, Tclima, rhoAria, g, area, lat, dl });
  out.fine.torbida = torbidaFine; out.vulcani = (s.vulcani || []).map(([i, j]) => ({ lon: lonDi(i, FW), lat: latDi(j, FH), sommerso: tipo[j * FW + i] === 1 })); out.spessoreGhiaccio = spessoreGhiaccio;
  out.coloreFondo = s.materiali?.coloreBasalto || [120, 110, 100]; out.coloreContinente = s.materiali?.coloreContinente || [170, 150, 130]; out.eta = P.interno?.eta ?? 4.5e9;
  // che cosa c'è sul fondo, cella per cella: 0 sabbia dei continenti, 1 roccia vulcanica (crosta dei fondali), 2 fango (dove i fiumi depositano)
  { const fd = new Uint8Array(FN); for (let k = 0; k < FN; k++) fd[k] = s.depositato && s.depositato[k] > 3 ? 2 : s.cont && !s.cont[k] ? 1 : 0; out.fine.fondale = fd; riempiTerra(torbidaFine, Uint8Array.from(tipo, (x) => (x === 1 ? 1 : 0)), FW, FH); }
  // LE ONDE (campoOnde, più sotto) e LA LUCE: lo spettro della stella di questo pianeta, nel rosso, nel verde e nel blu, rispetto a quello del Sole (corpo nero alla sua temperatura)
  out.onde = campoOnde({ W, H, R, vu, vv, mare: co.mare, fondo, g, righe });
  { const Ts = P.Tstella ?? (P.Mstella > 0 ? stellaDi(P.Mstella / MSOLE).T : TSOLE), planck = (lam, T) => 1 / (lam ** 5 * (Math.exp(0.014388 / (lam * T)) - 1)), l = [650e-9, 550e-9, 450e-9].map((x) => planck(x, Ts) / planck(x, TSOLE)); out.luce = l.map((x) => x / l[1]); out.Tstella = Ts; }
  out.raggioVortici = Math.sqrt((g * Math.max(0.2, densita(tMin, salinitaMedia) - densita(tMax, salinitaMedia)) * co.termoclino) / 1025) / (1.414 * ((2 * Math.PI) / (P.giorno || GIORNO))); // (m) il raggio di Rossby a 45°: la taglia dei vortici
  Object.assign(out, { corrente: { u: co.u, v: co.v }, risalita: co.w, giri: co.psi, termoclino: co.termoclino, temperatura: Tm, salinita: Sm, torbidita: torb, saturazione: sat, pHcampo: pHc, eMenoP: Float32Array.from(evap, (e, k) => e - piove[k]),
    profondo: { T: Tfondo, salinita: Sfondo, densita: densita(Tfondo, Sfondo), portataSv: (wMescola * areaMare) / 1e6, tempoGiroAnni: wMescola > 0 ? out.profonditaMedia / wMescola / ANNO : Infinity,
      dove: dense.slice(0, 3).map(([, k]) => ({ lon: lonDi(k % W, W), lat: latDi(Math.floor(k / W), H) })) } });
  // --- I LAGHI: dolci se traboccano, salati se l'acqua esce solo evaporando
  const laghi = [], Tfine = (k) => { const i = k % FW, j = (k - i) / FW; return bil(cl.media, cl.W, cl.H, ((i + 0.5) / FW) * cl.W - 0.5, ((j + 0.5) / FH) * cl.H - 0.5); };
  const eVapPot = (k) => { const i = k % FW, j = (k - i) / FW, x = ((i + 0.5) / FW) * W - 0.5, y = ((j + 0.5) / FH) * H - 0.5, T = Tfine(k), U = m ? Math.hypot(bil(vu, W, H, x, y), bil(vv, W, H, x, y)) + 1 : 3, rh = m ? bil(umid, W, H, x, y) : 0.5;
    return { E: (DATI.ce * (pressioneVapore(T) / (R_VAPORE * T)) * U * Math.max(0.1, 1 - 0.8 * rh) * ANNO) / 1000, P: m ? bil(piove, W, H, x, y) / 1000 : 0.3 }; }; // (m/anno: la formula di massa di meteo.js)
  const gruppi = (dentro) => { const visto = new Uint8Array(FN), ris = []; for (let k0 = 0; k0 < FN; k0++) { if (visto[k0] || !dentro(k0)) continue; const celle = [k0]; visto[k0] = 1;
    for (let n = 0; n < celle.length; n++) { const c = celle[n], i = c % FW, j = (c - i) / FW; for (let dj = -1; dj <= 1; dj++) { const jj = j + dj; if (jj < 0 || jj >= FH) continue; for (let di = -1; di <= 1; di++) { const q = jj * FW + ((i + di + FW) % FW); if (!visto[q] && dentro(q)) { visto[q] = 1; celle.push(q); } } } }
    ris.push(celle); } return ris; };
  const scheda = (celle, chiuso, livelloLago) => { let A = 0, V = 0, x = 0, y = 0, z = 0, fl = 0, kMin = celle[0];
    for (const k of celle) { const i = k % FW, j = (k - i) / FW, a = areaF(j), d = chiuso ? Math.max(0.5, livelloLago - s.alt[k]) : s.lago[k]; A += a; V += a * d; const lo = lonDi(i, FW) * RAD, la = latDi(j, FH) * RAD; x += a * Math.cos(la) * Math.cos(lo); y += a * Math.cos(la) * Math.sin(lo); z += a * Math.sin(la); if (s.flusso && s.flusso[k] > fl) fl = s.flusso[k]; if (s.alt[k] < s.alt[kMin]) kMin = k; }
    return { areaM2: A, volumeM3: V, profonditaM: V / A, lon: Math.atan2(y, x) / RAD, lat: Math.atan2(z, Math.hypot(x, y)) / RAD, afflussoKgAnno: kPortata * Math.max(fl, 1), T: Math.max(Tfine(kMin), 271), kMin }; };
  const fiumeIoni = bs.fiume, equilibriLaghi = new Map(); // (i laghi con emissario hanno quasi tutti la stessa acqua: l'equilibrio si calcola una volta)
  if (s.lago) for (const celle of gruppi((k) => tipo[k] === 2)) { const L = scheda(celle, false), ev = eVapPot(L.kMin), evapora_ = Math.min(0.97 * L.afflussoKgAnno, Math.max(0, ev.E - ev.P) * 1000 * L.areaM2), fatt = L.afflussoKgAnno / (L.afflussoKgAnno - evapora_);
    const chiaveLago = `${fatt.toFixed(2)}|${Math.round(L.T / 2)}`, e = equilibriLaghi.get(chiaveLago) || evapora(fiumeIoni, fatt, L.T, pCO2), id = laghi.length; equilibriLaghi.set(chiaveLago, e); for (const k of celle) out.fine.lago[k] = id;
    laghi.push({ id, tipo: 'aperto', ...L, evaporaKgAnno: evapora_, etaAnni: null, concentrato: fatt, salinita: e.salinita, totali: e.ioni, ioni: nomiIoni(e.ioni, e.eq), pH: e.eq.pH, saturazione: { calcite: e.eq.omega.calcite, gesso: e.eq.omega.gesso, salgemma: e.eq.omega.salgemma }, precipitati: e.precipitati, ghiaccio: bil(cl.freddo, cl.W, cl.H, ((L.lon + 180) / 360) * cl.W - 0.5, ((90 - L.lat) / 180) * cl.H - 0.5),
      descrizione: 'lago dolce: ha un emissario, l\'acqua resta poco e porta via i suoi sali' }); }
  { const pieno = conche(s.alt, FW, FH, isFinite(livello) ? livello : -Infinity), tutte = gruppi((k) => tipo[k] === 0 && pieno[k] > s.alt[k] + 1).map((celle) => ({ celle, fl: celle.reduce((a, k) => Math.max(a, s.flusso ? s.flusso[k] : 1), 0) })).sort((a, b) => b.fl - a.fl || a.celle[0] - b.celle[0]);
    for (const { celle } of tutte.slice(0, 40)) { celle.sort((a, b) => s.alt[a] - s.alt[b] || a - b); const k0 = celle[0], ev = eVapPot(k0), netto = Math.max(0.05, ev.E - ev.P), Q = kPortata * celle.reduce((a, k) => Math.max(a, s.flusso ? s.flusso[k] : 1), 1);
      // il lago terminale: si allarga finché ciò che evapora dalla sua superficie pareggia ciò che arriva
      const areaVoluta = Q / 1000 / netto, bagnate = []; let A = 0; for (const k of celle) { if (A >= areaVoluta) break; bagnate.push(k); A += areaF(Math.floor(k / FW)); }
      const piena = areaVoluta >= areaF(Math.floor(k0 / FW)), id = laghi.length;
      if (!piena) { // troppo poca acqua per una cella intera: una piana di sale, con al centro una pozza di salamoia
        out.fine.tipo[k0] = 4; out.fine.lago[k0] = id; out.fine.fondo[k0] = 0.3; }
      else { const liv = s.alt[bagnate[bagnate.length - 1]] + 1; for (const k of bagnate) { out.fine.tipo[k] = 3; out.fine.lago[k] = id; out.fine.fondo[k] = Math.max(0.5, liv - s.alt[k]); } }
      const L = piena ? scheda(bagnate, true, s.alt[bagnate[bagnate.length - 1]] + 1) : { ...scheda([k0], true, s.alt[k0] + 0.3), areaM2: areaVoluta, volumeM3: areaVoluta * 0.3, profonditaM: 0.3 };
      // da quanto tempo la conca è chiusa (l'ultima volta che ha traboccato, o che si è formata): un evento
      const etaAnni = Math.min(P.interno?.eta ?? 4.5e9, Math.pow(10, c0.tra(`lago ${id}/da quanto è chiuso`, 4, 7))), fatt = Math.max(1, (Q * etaAnni) / (1000 * L.volumeM3));
      const e = evapora(fiumeIoni, fatt, L.T, pCO2), satura = e.precipitati.salgemma > 0;
      laghi.push({ id, tipo: piena ? 'chiuso' : 'piana di sale', ...L, afflussoKgAnno: Q, evaporaKgAnno: Q, etaAnni, concentrato: fatt, salinita: e.salinita, totali: e.ioni, ioni: nomiIoni(e.ioni, e.eq), pH: e.eq.pH, saturazione: { calcite: e.eq.omega.calcite, gesso: e.eq.omega.gesso, salgemma: e.eq.omega.salgemma },
        precipitati: e.precipitati, ghiaccio: 0, descrizione: satura ? 'salamoia satura: l\'acqua esce solo evaporando e lascia qui tutti i suoi sali; sul fondo e sulle rive cresce il salgemma' : e.salinita > 3 ? 'lago salato: chiuso, i sali dei fiumi si accumulano' : 'lago chiuso ancora giovane: i sali non hanno avuto tempo di accumularsi' }); } }
  out.laghi = laghi;
  // --- LE SORGENTI CALDE DEL FONDO: dove la crosta è appena nata (le dorsali) e sui vulcani sommersi
  out.sorgentiCalde = sorgentiCalde(P, s, out, bs, { lonDi, latDi, FW, FH, tipo, fondoF, livello, g, pAria });
  // --- IL CALORE CHE IL MARE PORTA (W/m², sulla griglia del clima, come cl.meteo.trasportoCalore: positivo dove arriva).
  // A regime, in ogni cella, ciò che la corrente e il fondo portano pareggia ciò che la superficie scambia con l'aria:
  // dove il mare è tenuto più caldo di quanto il clima locale lo vorrebbe (una corrente che viene dai tropici) cede
  // calore all'aria: λ·(T − T del clima), con λ lo stesso scambio usato per il campo di temperatura.
  { const cal = new Float32Array(cl.W * cl.H), scalda = new Float32Array(N), kk = W / cl.W; let costa = 0, nCosta = 0, massimo = 0;
    for (let k = 0; k < N; k++) if (co.mare[k]) { scalda[k] = Tm[k] - Math.max(out.congela, Tclima[k]); massimo = Math.max(massimo, Math.abs(scalda[k])); }
    for (let j = 0; j < cl.H; j++) for (let i = 0; i < cl.W; i++) { let t = 0, n = 0; for (let b = 0; b < kk; b++) for (let a = 0; a < kk; a++) { const q = (j * kk + b) * W + i * kk + a; if (co.mare[q]) { t += scalda[q]; n++; } } cal[j * cl.W + i] = n ? (lambda * t) / (kk * kk) : 0; }
    for (let j = 1; j < H - 1; j++) for (let i = 0; i < W; i++) { const k = j * W + i; if (co.mare[k] && (!co.mare[k - W] || !co.mare[k + W] || !co.mare[j * W + ((i + 1) % W)] || !co.mare[j * W + ((i + W - 1) % W)])) { costa += Math.abs(scalda[k]); nCosta++; } }
    out.caloreDalMare = cal; out.scaldaDi = scalda; out.scambioColCielo = lambda; out.calore = { suCosteK: nCosta ? costa / nCosta : 0, massimoK: massimo, massimoWm2: lambda * massimo };
    // l'albedo del mare: l'acqua aperta rimanda il 7% della luce, il ghiaccio marino il 60% (misurati)
    out.albedo = Float32Array.from(ghiaccio, (gg, k) => (bagnato[k] > 0 ? 0.07 + 0.53 * Math.min(1, gg) : 0)); }
  // --- LE MAREE, LE STAGIONI, LE PROVINCE (più sotto)
  out.maree = mareeDelMare(P, out, { W, H, co, fondo, righe, tipo, FW, FH, areaF, s, evap, piove });
  out.stagioni = stagioniDelMare(P, cl, m, out, { W, H, co, fondo, righe, g, Tclima, suGriglia, rhoAria, Tm, Tfondo });
  out.province = provinceDelMare(out, { W, H, co, righe, fondo, dolce, lonDi, latDi });
  out.prebiotica = perLaChimicaPrebiotica(out, s);
  out.storia = racconta(out, bs);
  return out;
}

// l'attrito dello strato di superficie (1/s), tale che senza rotazione la deriva sia il 3% del vento: lo sforzo τ = ρ_aria·C·U²
// muove uno strato spesso h alla velocità τ/(ρ·r·h) = 0,03·U → r = √(τ·ρ_aria·C)/(0,03·ρ·h) (con l'aria a 1,2 kg/m³)
const attritoDeriva = (tau) => Math.max(1e-7, Math.sqrt(tau * 1.2 * DATI.cd) / (DATI.deriva * 1025 * DATI.strato));
// LE CORRENTI SPINTE DAL VENTO. Due pezzi, tutti e due dalla stessa forza (il vento sulla superficie) e dalla rotazione:
//  · la DERIVA DI EKMAN: lo strato di superficie, spinto dal vento e deviato da Coriolis, va di traverso (a destra del
//    vento nell'emisfero nord): trasporto = τ/(ρ·(r + i·f)), con un piccolo attrito r che lo tiene finito all'equatore.
//    Dove questo trasporto diverge (lungo l'equatore, lungo le coste da cui il vento allontana l'acqua) risale acqua dal
//    fondo; dove converge (il centro dei grandi giri) l'acqua scende.
//  · i GIRI: l'acqua che scende o sale sotto lo strato di Ekman deve spostarsi verso l'equatore o verso i poli (bilancio
//    di Sverdrup: β·V = rot τ/ρ), e torna indietro in una corrente stretta sul bordo OVEST di ogni bacino, perché la
//    rotazione del pianeta cresce verso i poli (Stommel 1948): r·∇²ψ + β·∂ψ/∂x = rot τ/ρ, con ψ = 0 sulle coste.
//    L'attrito r è scelto perché la corrente di bordo sia larga una cella (quella vera è larga cento chilometri: qui è
//    più larga e più lenta, ma porta la stessa acqua). Si risolve con passate successive da est a ovest.
// Lo spessore che il vento muove (il termoclino) viene dalla scala h = √(f²·w·L/(β·g′)): w la discesa di Ekman, L la
// larghezza dei bacini, g′ la gravità ridotta dalla differenza di densità tra l'acqua calda e la fredda.
function correnti({ W, H, R, omega, bagnato, fondo, tx, ty, g, salto, areaMare }) {
  const N = W * H, dl = (2 * Math.PI) / W, df = Math.PI / H, rho = 1025, mare = new Uint8Array(N), dy = R * df;
  const fi = (j) => Math.PI / 2 - (j + 0.5) * df, c = Float64Array.from({ length: H }, (_, j) => Math.cos(fi(j)));
  const Mx = new Float64Array(N), My = new Float64Array(N), psi = new Float64Array(N), F = new Float64Array(N);
  for (let j = 0; j < H; j++) { const f = 2 * omega * Math.sin(fi(j)); for (let i = 0; i < W; i++) { const k = j * W + i; mare[k] = bagnato[k] >= 0.5 ? 1 : 0; const rE = attritoDeriva(Math.hypot(tx[k], ty[k])), d = rho * (rE * rE + f * f); Mx[k] = (rE * tx[k] + f * ty[k]) / d; My[k] = (rE * ty[k] - f * tx[k]) / d; } }
  for (let j = 1; j < H - 1; j++) for (let i = 0; i < W; i++) { const k = j * W + i, e = j * W + ((i + 1) % W), w = j * W + ((i + W - 1) % W); F[k] = ((ty[e] - ty[w]) / (2 * dl) - (tx[k - W] * c[j - 1] - tx[k + W] * c[j + 1]) / (2 * df)) / (R * c[j] * rho); }
  const aE = new Float64Array(H), aW = new Float64Array(H), aN = new Float64Array(H), aS = new Float64Array(H), aP = new Float64Array(H);
  for (let j = 1; j < H - 1; j++) { const beta = (2 * omega * c[j]) / R, dx = R * c[j] * dl, r = Math.max(beta * dx, 1e-7), cn = Math.cos(fi(j) + df / 2), cs = Math.cos(fi(j) - df / 2);
    aE[j] = r / (dx * dx) + beta / (2 * dx); aW[j] = r / (dx * dx) - beta / (2 * dx); aN[j] = (r * cn) / (c[j] * dy * dy); aS[j] = (r * cs) / (c[j] * dy * dy); aP[j] = (2 * r) / (dx * dx) + (r * (cn + cs)) / (c[j] * dy * dy); }
  for (let giro = 0; giro < 220; giro++) for (let jj = 1; jj < H - 1; jj++) { const j = giro & 1 ? H - 1 - jj : jj; if (c[j] < 0.26) continue; /* (oltre i 75° le celle sono troppo strette: lì i giri non si calcolano) */ for (let i = W - 1; i >= 0; i--) { const k = j * W + i; if (!mare[k]) continue;
    const e = j * W + ((i + 1) % W), w = j * W + ((i + W - 1) % W); psi[k] = (aE[j] * psi[e] + aW[j] * psi[w] + aN[j] * psi[k - W] + aS[j] * psi[k + W] - F[k]) / aP[j]; } }
  // lo spessore mosso dal vento, dalla discesa di Ekman tipica alle medie latitudini
  let w2 = 0, n2 = 0; for (let j = 1; j < H - 1; j++) { const la = Math.abs(fi(j)); if (la < 0.26 || la > 0.87) continue; const f = 2 * omega * Math.sin(fi(j)); for (let i = 0; i < W; i++) { const k = j * W + i; if (mare[k]) { w2 += (F[k] * rho / (rho * f)) ** 2; n2++; } } }
  const wE = n2 ? Math.sqrt(w2 / n2) : 0, f30 = omega, beta30 = (1.73 * omega) / R, termoclino = limita(Math.sqrt((f30 * f30 * wE * 0.5 * Math.sqrt(areaMare)) / (beta30 * Math.max(1e-4, (g * salto) / rho))), 100, 1500);
  // i flussi dello strato di superficie attraverso le facce delle celle (m³/s): Ekman, più la parte dei giri che gli tocca
  const FE = new Float64Array(N), FS = new Float64Array(N), C = new Float64Array(N), u = new Float32Array(N), v = new Float32Array(N), w = new Float32Array(N), strato = DATI.strato;
  for (let j = 0; j < H - 1; j++) for (let i = 0; i < W; i++) { const k = j * W + i, e = j * W + ((i + 1) % W); C[k] = 0.25 * (psi[k] + psi[e] + psi[k + W] + psi[e + W]); }
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i, e = j * W + ((i + 1) % W), kw = j * W + ((i + W - 1) % W); if (!mare[k]) continue;
    const parte = strato / Math.max(strato, Math.min(termoclino, fondo[k] || termoclino));
    if (mare[e]) FE[k] = 0.5 * (Mx[k] + Mx[e]) * dy + parte * (C[k] - (j > 0 ? C[k - W] : 0));
    if (j < H - 1 && mare[k + W]) FS[k] = 0.5 * (My[k] + My[k + W]) * R * dl * Math.cos(fi(j) - df / 2) + parte * (C[k] - C[kw]); }
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i, kw = j * W + ((i + W - 1) % W); if (!mare[k]) continue; const fn = j > 0 ? FS[k - W] : 0, dx = R * c[j] * dl;
    u[k] = (FE[k] + FE[kw]) / (2 * dy * strato); v[k] = (fn + FS[k]) / (2 * dx * strato); w[k] = (FE[k] - FE[kw] + fn - FS[k]) / (dx * dy); }
  return { mare, u, v, w, FE, FS, psi: Float32Array.from(psi, (x) => x / 1e6), termoclino, discesaEkman: wE };
}
// LE ONDE DAL VENTO. Il vento alza onde tanto più alte e lunghe quanto più è forte e quanto più mare libero ha davanti
// (il «fetch»: qui lo si misura risalendo il vento sulla carta finché si incontra terra). LEGGI EMPIRICHE (JONSWAP,
// Hasselmann e altri 1973): altezza significativa H = 1,6·10⁻³·√(g·F)·U/g, periodo T = 0,286·(g·F/U²)^⅓·U/g, fino al
// mare «pienamente sviluppato» (Pierson e Moskowitz 1964: H = 0,243·U²/g, T = 8,13·U/g); sul fondale basso l'onda
// frange quando è alta più di 0,6 volte la profondità. Il MARE LUNGO sono le onde uscite dalla zona dove sono nate:
// qui l'energia delle onde di vento sparsa sulle celle vicine (viaggiano per migliaia di chilometri), con periodo più lungo.
// ---------- LA POLVERE PORTATA DAL VENTO. Al largo il fango dei fiumi non arriva: la torbidità del mare aperto senza vita è la
// polvere delle terre asciutte, che il vento solleva, porta per migliaia di km e lascia cadere (sulla Terra ~0,45 Pg/anno sui mari:
// Jickells e altri 2005). Le leggi:
//   · dove: le terre asciutte (indice d'aridità P/PET < 0,2: UNEP 1992, Middleton e Thomas 1997; qui la parte asciutta
//     max(0, 1 − (P/PET)/0,2)) coperte di sedimento fine (la parte della cella dove l'erosione ha depositato: Zender e altri
//     2003); su un pianeta senza vita il suolo è nudo ovunque;
//   · quanto il vento solleva: il flusso orizzontale di saltazione Q = 2,61·(ρa/g)·u*³·(1 + u*t/u*)·(1 − u*t²/u*²) (White 1979),
//     u* = κ·U₁₀/ln(10 m/z₀) con z₀ = 1 mm (suolo nudo), la soglia di Shao e Lu 2000 per i granelli di 75 µm,
//     u*t = √(A_N·(ρp·g·d/ρa + γ/(ρa·d))) con A_N = 0,0123 e γ = 3·10⁻⁴ kg/s²; la polvere è la parte che sale, F = α·Q, con
//     α = 10^(13,4·f_argilla − 6) m⁻¹ (Marticorena e Bergametti 1995), f_argilla = 0,1 (A MANO: suoli aridi, 5–20 %);
//     la velocità del vento non è costante: la distribuzione di Rayleigh (Weibull k = 2: Justus e altri 1978) attorno alla media;
//   · fin dove arriva: un nucleo isotropo e^(−x/Λ)/(2π·Λ·x), con Λ = Ū·τ, τ = 4 giorni la vita della polvere portata lontano
//     (Mahowald e altri 2014); il vento medio non la spinge da una parte (chiusura dichiarata: niente direzione).
// → Float32Array(W·H): kg/m²/s che cadono su ogni cella (anche sulle terre)
export const POLVERE = { fArgilla: 0.1, z0: 1e-3, dSalta: 75e-6, AN: 0.0123, gamma: 3e-4, vitaS: 4 * GIORNO, mmd: 2.5e-6, sigmaG: 2, densita: 2650 };
function polvereDelVento({ W, H, R, bagnato, erodibile, vu, vv, piove, umid, Tclima, rhoAria, g, area, lat, dl }) {
  const N = W * H, D = new Float32Array(N), E = new Float64Array(N), Pq = POLVERE, ra = Math.max(1e-3, rhoAria), alfa = Math.pow(10, 13.4 * Pq.fArgilla - 6);
  const ust = Math.sqrt(Pq.AN * ((Pq.densita * g * Pq.dSalta) / ra + Pq.gamma / (ra * Pq.dSalta))), kU = 0.41 / Math.log(10 / Pq.z0);
  const Q = (u) => { const us = kU * u; return us > ust ? 2.61 * (ra / g) * us ** 3 * (1 + ust / us) * (1 - (ust / us) ** 2) : 0; };
  let sU = 0, sA = 0, fonti = [];
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i, U = Math.hypot(vu[k], vv[k]), A = area(j); sU += U * A; sA += A; const terra = Math.min(1 - Math.min(1, bagnato[k]), erodibile[k]); if (!(terra > 0) || !(U > 0)) continue;
    const T = Tclima[k], PET = (DATI.ce * (pressioneVapore(T) / (R_VAPORE * T)) * (U + 1) * Math.max(0.1, 1 - 0.8 * (umid[k] || 0.5)) * ANNO) / 1000, P = (piove[k] || 0) / 1000, secco = Math.max(0, 1 - (PET > 0 ? P / PET : 1) / 0.2); if (!(secco > 0) || T < 260) continue;
    let m = 0; const n = 40; for (let q = 0; q < n; q++) { const u = ((q + 0.5) / n) * 5 * U, p = ((Math.PI * u) / (2 * U * U)) * Math.exp((-Math.PI * u * u) / (4 * U * U)); m += Q(u) * p * ((5 * U) / n); } // (Rayleigh con media U)
    E[k] = alfa * m * secco * terra; if (E[k] > 0) fonti.push(k); }
  // (il trasporto su una griglia grossa, al più 64 × 32 celle: il nucleo è largo migliaia di km, e la somma su tutte le coppie di
  // celle fini costava minuti; poi si torna sulla griglia del mare per interpolazione)
  const L = Math.max(1e5, (sU / Math.max(1e-30, sA)) * Pq.vitaS), f = Math.max(1, Math.ceil(W / 64)), Wg = Math.ceil(W / f), Hg = Math.ceil(H / f), Mg = new Float64Array(Wg * Hg), Dg = new Float64Array(Wg * Hg), dlg = (2 * Math.PI) / Wg, dfg = Math.PI / Hg, latg = (j) => Math.PI / 2 - (j + 0.5) * dfg, cella = R * dlg;
  for (const s of fonti) { const js = Math.floor(s / W), is = s - js * W; Mg[Math.min(Hg - 1, Math.floor(js / f)) * Wg + Math.min(Wg - 1, Math.floor(is / f))] += E[s] * area(js); }
  for (let q = 0; q < Wg * Hg; q++) { if (!(Mg[q] > 0)) continue; const js = Math.floor(q / Wg), la1 = latg(js), lo1 = (q - js * Wg + 0.5) * dlg;
    for (let j = 0; j < Hg; j++) { const la2 = latg(j), cl = Math.cos(la1) * Math.cos(la2), sl = Math.sin(la1) * Math.sin(la2);
      for (let i = 0; i < Wg; i++) { const x = R * Math.acos(Math.max(-1, Math.min(1, sl + cl * Math.cos((i + 0.5) * dlg - lo1)))); if (x > 8 * L) continue; const xe = Math.max(x, 0.5 * cella * Math.max(0.05, Math.cos(la2))); Dg[j * Wg + i] += (Mg[q] * Math.exp(-x / L)) / (2 * Math.PI * L * xe); } } }
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) D[j * W + i] = bil(Dg, Wg, Hg, ((i + 0.5) / W) * Wg - 0.5, ((j + 0.5) / H) * Hg - 0.5);
  return D;
}
// quanta polvere sospesa (kg/m³) e di che taglia, nello strato rimescolato a regime: ogni taglia vi entra col flusso che cade e
// ne esce cadendo e col rimescolamento che lo scambia con l'acqua di sotto (w_m = K/h_termoclino, la stessa di trasporta), quindi
// C(d) = F(d)/(w_s(d) + w_m) (le taglie del flusso: lognormale in massa, diametro mediano 2,5 µm e σg = 2 per la
// polvere portata lontano: Mahowald e altri 2014). → { kgM3, dMedio (della massa sospesa), legge(d): numero per unità di d (relativo) }
const polvereFatta = new Map();
export function polvereSospesa(F, T, S, g, wMescola = 0) {
  const ch = `${T.toFixed(1)}|${S.toFixed(1)}|${g.toFixed(3)}|${wMescola.toExponential(2)}`; let b = polvereFatta.get(ch);
  if (!b) { const Pq = POLVERE, s2 = 2 * Math.log(Pq.sigmaG) ** 2, pm = (d) => Math.exp(-(Math.log(d / Pq.mmd) ** 2) / s2) / Math.sqrt(Math.PI * s2), ws = (d) => Math.max(1e-12, stokes(d, Pq.densita, T, S, g)) + wMescola;
    let k = 0, m = 0; const n = 200, a = 1e-7, z = 1e-4; for (let q = 0; q < n; q++) { const d = a * Math.pow(z / a, (q + 0.5) / n), w = (pm(d) / ws(d)) * (Math.log(z / a) / n); k += w; m += w * Math.log(d); }
    b = { perFlusso: k, dMedio: Math.exp(m / k), legge: (d) => pm(d) / ws(d) / ((Math.PI / 6) * Pq.densita * d ** 3) / d }; polvereFatta.set(ch, b); }
  return { kgM3: F * b.perFlusso, dMedio: b.dMedio, legge: b.legge };
}
function campoOnde({ W, H, R, vu, vv, mare, fondo, g, righe }) {
  const N = W * H, alt = new Float32Array(N), per = new Float32Array(N), tratto = new Float32Array(N), ex = new Float32Array(N), ey = new Float32Array(N), en = new Float32Array(N), pm = new Float32Array(N);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i; if (!mare[k]) continue; const U = Math.hypot(vu[k], vv[k]); if (U < 0.3) continue;
    let x = i, y = j, F = 0; const dy = righe.dy; for (let n = 0; n < 60; n++) { const jj = limita(Math.round(y), 0, H - 1), dx = Math.max(righe.dx[jj], 0.2 * dy); x -= ((vu[k] / U) * dy) / dx; y += vv[k] / U; if (y < 0 || y > H - 1 || !mare[limita(Math.round(y), 0, H - 1) * W + ((((Math.round(x) % W) + W) % W))]) break; F += dy; }
    F = Math.max(F, 0.5 * dy); const chi = (g * F) / (U * U); tratto[k] = F; alt[k] = Math.min((Math.min(1.6e-3 * Math.sqrt(chi), 0.243) * U * U) / g, 0.6 * Math.max(fondo[k], 0.5)); per[k] = (Math.min(0.286 * Math.cbrt(chi), 8.13) * U) / g;
    en[k] = alt[k] * alt[k]; ex[k] = (en[k] * vu[k]) / U; ey[k] = (en[k] * vv[k]) / U; pm[k] = en[k] * per[k]; }
  // il mare lungo: l'energia si sparge (sei passate di media coi vicini), e arriva con la direzione media da cui viene
  const liscia = (a) => { const b = new Float32Array(N); for (let g2 = 0; g2 < 6; g2++) { for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i; if (!mare[k]) continue; let t = a[k], n = 1; for (const q of [j * W + ((i + 1) % W), j * W + ((i + W - 1) % W), j > 0 ? k - W : -1, j < H - 1 ? k + W : -1]) if (q >= 0 && mare[q]) { t += a[q]; n++; } b[k] = t / n; } a.set(b); } return a; };
  const E = liscia(Float32Array.from(en)), Ex = liscia(ex), Ey = liscia(ey), Pm = liscia(pm), lAlt = new Float32Array(N), lPer = new Float32Array(N), lu = new Float32Array(N), lv = new Float32Array(N);
  for (let k = 0; k < N; k++) if (mare[k] && E[k] > 0) { const m = Math.hypot(Ex[k], Ey[k]) || 1; lAlt[k] = Math.min(0.7 * Math.sqrt(Math.max(0, E[k] - 0.5 * en[k])), 0.6 * Math.max(fondo[k], 0.5)); lPer[k] = (1.3 * Pm[k]) / E[k]; lu[k] = Ex[k] / m; lv[k] = Ey[k] / m; }
  for (const x of [alt, per, lAlt, lPer, lu, lv]) riempiTerra(x, mare, W, H);
  return { altezza: alt, periodo: per, tratto, lungo: { altezza: lAlt, periodo: lPer, u: lu, v: lv } };
}
// una grandezza portata dalla corrente, a regime: in ogni cella ciò che entra (dai vicini a monte, dal fondo dove
// l'acqua risale, dalle sorgenti) pareggia ciò che esce; più il rimescolamento dei vortici (1000 m²/s, misurato) e lo
// scambio lento col fondo. Passate successive (Gauss-Seidel): niente passo di tempo.
function trasporta({ W, H, co, righe, h, q, fondoQ, sorg, perd, wMescola }) {
  const { mare, FE, FS } = co, Kor = 1000 * h, daSotto = 1 - Math.exp((-2 * h) / co.termoclino); // l'acqua che risale viene da poco sotto lo strato: è già in parte acqua di superficie
  for (let giro = 0; giro < 64; giro++) for (let jj = 0; jj < H; jj++) { const j = giro & 1 ? H - 1 - jj : jj, A = righe.A[j], dE = (Kor * righe.dy) / Math.max(righe.dx[j], 1), dS = (Kor * righe.dxS[j]) / righe.dy, dN = j > 0 ? (Kor * righe.dxS[j - 1]) / righe.dy : 0;
    for (let ii = 0; ii < W; ii++) { const i = giro & 2 ? W - 1 - ii : ii, k = j * W + i; if (!mare[k]) continue;
      const e = j * W + ((i + 1) % W), kw = j * W + ((i + W - 1) % W), fe = FE[k], fw = FE[kw], fs = FS[k], fn = j > 0 ? FS[k - W] : 0, div = fe - fw + fn - fs;
      let num = sorg[k] + wMescola * A * fondoQ, den = perd[k] + wMescola * A;
      if (div > 0) { num += div * daSotto * fondoQ; den += div * (daSotto - 1); } else den -= div;
      if (fe > 0) den += fe; else if (fe < 0) num -= fe * q[e]; if (fw > 0) num += fw * q[kw]; else den -= fw;
      if (fs > 0) num += fs * q[k + W]; else den -= fs; if (fn > 0) den += fn; else if (fn < 0) num -= fn * q[k - W];
      if (mare[e]) { num += dE * q[e]; den += dE; } if (mare[kw]) { num += dE * q[kw]; den += dE; }
      if (j < H - 1 && mare[k + W]) { num += dS * q[k + W]; den += dS; } if (j > 0 && mare[k - W]) { num += dN * q[k - W]; den += dN; }
      q[k] = den > 0 ? num / den : q[k]; } }
  return q;
}
// la distanza lungo il cerchio massimo (m), tra due punti dati in gradi
export function distanza(R, lon1, lat1, lon2, lat2) { const a = Math.sin(((lat2 - lat1) * RAD) / 2) ** 2 + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(((lon2 - lon1) * RAD) / 2) ** 2; return 2 * R * Math.asin(Math.min(1, Math.sqrt(a))); }
// IL PENNACCHIO DI UN FIUME IN MARE: l'acqua dolce, leggera, si allarga in superficie come una corrente di gravità di
// spessore h (dato: qualche metro), alla velocità c = √(g′·h) con g′ la gravità ridotta dalla differenza di densità;
// allargandosi su un semicerchio di raggio x ingloba acqua di mare: la parte di fiume che resta è
// f = (Q/(π·x·h·√(0,027·g·h)))^(2/3). → { parte (0…1), velocita (m/s) }
export function pennacchio(portata, x, g) { const h = DATI.pennacchio, parte = Math.min(1, Math.pow(portata / (Math.PI * Math.max(x, 1) * h * Math.sqrt(0.027 * g * h)), 2 / 3)); return { parte, velocita: Math.max(0.02, Math.sqrt(0.027 * g * h * parte)) }; }
function riempiTerra(x, mare, W, H) {
  const N = W * H, fatto = Uint8Array.from(mare); let media = 0, n = 0; for (let k = 0; k < N; k++) if (mare[k]) { media += x[k]; n++; } media = n ? media / n : 0;
  for (let giro = 0; giro < 4; giro++) { const nuovi = []; for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i; if (fatto[k]) continue; let s = 0, c = 0;
    for (let dj = -1; dj <= 1; dj++) { const jj = j + dj; if (jj < 0 || jj >= H) continue; for (let di = -1; di <= 1; di++) { const q = jj * W + ((i + di + W) % W); if (fatto[q]) { s += x[q]; c++; } } } if (c) nuovi.push([k, s / c]); }
    for (const [k, val] of nuovi) { x[k] = val; fatto[k] = 1; } }
  for (let k = 0; k < N; k++) if (!fatto[k]) x[k] = media;
}
// il pH e le saturazioni a una temperatura e a una salinità (rispetto alla media), dalla tavola calcolata da mare()
export function dallaTavola(tv, T, f) {
  const pos = (v, x) => { let i = 0; while (i < v.length - 2 && x > v[i + 1]) i++; return [i, limita((x - v[i]) / (v[i + 1] - v[i]), 0, 1)]; }, [a, u] = pos(tv.T, T), [b, w] = pos(tv.f, f), nf = tv.f.length;
  const leggi = (x) => (x[a * nf + b] * (1 - w) + x[a * nf + b + 1] * w) * (1 - u) + (x[(a + 1) * nf + b] * (1 - w) + x[(a + 1) * nf + b + 1] * w) * u;
  return { pH: leggi(tv.pH), calcite: Math.exp(leggi(tv.calcite)), gesso: Math.exp(leggi(tv.gesso)), salgemma: Math.exp(leggi(tv.salgemma)) };
}

// LE SORGENTI CALDE. Sul fondo dove la crosta è giovane (geologia.js: il fondale sprofonda come la radice dell'età, quindi
// l'età si legge dalla quota) il calore esce per conduzione, q = k·ΔT/√(π·κ·t), e l'acqua del mare entra nelle crepe, si
// scalda e risale. Quanto calda: fino a bollire alla pressione di quel fondo (più profondo, più caldo), mai oltre il
// punto critico. Che cosa porta: ha lasciato il magnesio nella roccia (prendendone acido: pH 3-4 misurato) e il solfato
// (l'anidrite è meno solubile al caldo), ha preso calcio, potassio, la silice che il quarzo cede a quella temperatura,
// il solfuro e il ferro del basalto (dato misurato: fino a qualche millimole per kg).
function sorgentiCalde(P, s, st, bs, { lonDi, latDi, FW, FH, tipo, fondoF, livello, g, pAria }) {
  const q = P.interno?.q ?? 0; if (!(q > 0.02) || !isFinite(livello)) return [];
  const cand = [], placche = bs.vivo === 1;
  if (placche && s.cont) for (let k = 0; k < FW * FH; k++) { if (tipo[k] !== 1 || s.cont[k]) continue; const sotto = -s.alt[k] - 2500, eta = s.etaCrosta ? Math.max(0.05, s.etaCrosta[k]) : Math.max(0.05, (Math.max(0, sotto) / 350) ** 2); if (eta < 4) cand.push([eta, k, 'dorsale']); } // (l'età della crosta: quella vera di tettonica.js se la superficie la porta («etaCrosta», milioni di anni), altrimenti letta dalla quota: il fondale sprofonda come la radice dell'età)
  for (const [i, j] of s.vulcani || []) { const k = j * FW + i; if (tipo[k] === 1) cand.push([0.01, k, 'vulcano sommerso']); }
  cand.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const scelte = [], lontano = (k) => scelte.every(([, q2]) => { const di = Math.abs((k % FW) - (q2 % FW)), dj = Math.abs(Math.floor(k / FW) - Math.floor(q2 / FW)); return Math.max(Math.min(di, FW - di), dj) >= 5; });
  for (const c of cand) { if (scelte.length >= 40) break; if (lontano(c[1])) scelte.push(c); }
  const mant = bs.flussi, rocce = rocceDelPianeta(P), olivina = (s.materiali?.basalto || []).find((x) => x.nome === 'olivina')?.frazione || 0;
  return scelte.map(([eta, k, dove], id) => { const i = k % FW, j = (k - i) / FW, prof = fondoF[k], pressione = pAria + 1025 * g * prof, T = Math.min(DATI.critico, ebollizione(pressione)), K = costanti(T);
    const calore = (DATI.conducibilita * (DATI.Tmantello - 275)) / Math.sqrt(Math.PI * DATI.diffusivita * eta * 1e6 * ANNO);
    // (il fluido: l'acqua di mare passata per la roccia a quella temperatura, fluidoCaldo(); in più la silice che il quarzo cede lì, il solfuro e il ferro del basalto; l'acido lo fa il magnesio lasciato nella roccia: pH 3,5 misurato)
    const pH = 3.5, fl = fluidoCaldo(st.totali, T, rocce), Fe = Math.min(0.006, rocce.basalto.Fe * 0.002);
    return { id, dove, lon: lonDi(i, FW), lat: latDi(j, FH), profonditaM: prof, pressione, etaCrostaMa: eta, calore, T, pH,
      // (salendo, il solfato rimasto esce come ANIDRITE, CaSO4, che al caldo non sta sciolta: una mole di calcio per ogni mole di
      // solfato, finché c'è calcio. Il calcio del fluido è quello che la roccia ha dato, meno il ferro e l'acido che ne hanno
      // preso il posto, meno quello che l'acido speso a ridurre il solfato non ha potuto sciogliere (SO4²⁻ + 2H⁺ → H2S…: due
      // cariche per mole). Se il mare ha più solfato che calcio e magnesio insieme, il calcio finisce e il solfato in più
      // RESTA nel fluido: le cariche si chiudono sempre, Na + K + 2Ca + 2Fe + H = Cl + 2SO4)
      fluido: (() => { const ridotto = Math.max(0, (st.totali.S || 0) - fl.S), calcio = Math.max(0, fl.Ca - ridotto - Fe - 0.5 * Math.pow(10, -pH)), anidrite = Math.min(fl.S, calcio);
        return { 'Mg2+': 0, 'Ca2+': calcio - anidrite, 'K+': fl.K, 'Na+': fl.Na, 'Cl-': fl.Cl, 'SO4(2-)': fl.S - anidrite, 
        H4SiO4: K.sali.quarzo, 'H2S(aq)': Math.min(0.012, DATI.solfuroSaturo * 0.2 + DATI.solfatoRidotto * (st.totali.S || 0)), 'Fe2+': Fe }; })(),
      alcalina: olivina > 0.02, portataKgAnno: mant.caldo / Math.max(1, scelte.length) }; });
}
// LE MAREE. Ogni luna (e la stella) alza sul mare un rigonfiamento: la marea di equilibrio di lune.js, col suo periodo.
// Il mare vero risponde di più o di meno secondo il bacino: un'onda lunga attraversa un mare largo L e profondo h in
// T_b = 2L/√(g·h); se quel tempo è vicino al periodo della marea il bacino risuona: ampiezza × 1/|1 − (T_b/T)²|, fino a
// 5 volte (l'attrito: il fattore di merito del mare terrestre). Sui fondali bassi l'onda cresce (legge di Green,
// h^−¼). La corrente di marea è quella di un'onda lunga, u = (a/2)·√(g/h): debole al largo, forte sul basso fondale.
// L'ATTRITO sul fondo (ρ·C·|u|³, C = 0,0025 misurato) consuma l'energia della marea, mai più di quanta l'onda ne porta
// (½·ρ·g·a²·√(g·h) per metro di fronte), e frena la rotazione del pianeta: dω/dt = −potenza/(0,33·M·R²·(ω − n)). LA ZONA TRA LE MAREE: lungo le coste l'acqua si ritira di
// dislivello/pendenza; dove evapora più di quanto piove restano pozze che si concentrano a ogni ciclo.
function mareeDelMare(P, st, { W, H, co, fondo, righe, tipo, FW, FH, areaF, s, evap, piove }) {
  const N = W * H, g = st.gravita, omega = (2 * Math.PI) / (P.giorno || GIORNO), corpi = [];
  for (const L of P.lune || []) { if (!(L.massaKg > 0 && L.aM > 0)) continue; const mr = mareaDi(P, L); if (mr.altezza > 1e-4 && isFinite(mr.periodo)) corpi.push({ corpo: `luna ${L.nome ?? L.id ?? corpi.length + 1}`, altezza: mr.altezza, periodo: mr.periodo, relativa: Math.PI / mr.periodo }); }
  if (P.Mstella > 0 && P.aM > 0) { const n = (2 * Math.PI) / (P.anno || ANNO), rel = Math.abs(omega - n), alt = 1.5 * (P.Mstella / P.massaKg) * (P.raggioM / P.aM) ** 3 * P.raggioM; if (rel > 1e-12 && !P.bloccato) corpi.push({ corpo: 'stella', altezza: alt, periodo: Math.PI / rel, relativa: rel }); else if (alt > 0) corpi.push({ corpo: 'stella (marea ferma: il pianeta le mostra sempre la stessa faccia)', altezza: alt, periodo: Infinity, relativa: 0 }); }
  const amp = new Float32Array(N), vel = new Float32Array(N), mobili = corpi.filter((c) => isFinite(c.periodo)); let potenza = 0, aMax = 0, aSomma = 0, aArea = 0, smorzate = 0;
  for (let j = 0; j < H; j++) { let i0 = -1; for (let i = 0; i < W; i++) if (!co.mare[j * W + i]) { i0 = i; break; }
    // i tratti di mare lungo il parallelo: la loro larghezza e la loro profondità media
    const tratti = []; if (i0 < 0) tratti.push([0, W, true]); else { let da = null; for (let n = 1; n <= W; n++) { const i = (i0 + n) % W, mm = co.mare[j * W + i]; if (mm && da === null) da = n; if (!mm && da !== null) { tratti.push([da, n, false]); da = null; } } }
    for (const [da, a, anello] of tratti) { let hm = 0; for (let q = da; q < a; q++) hm += fondo[j * W + (((i0 < 0 ? 0 : i0) + q) % W)] || 1; hm /= a - da; const Lb = (a - da) * righe.dx[j], Tb = (anello ? 1 : 2) * Lb / Math.sqrt(g * Math.max(hm, 1));
      for (let q = da; q < a; q++) { const k = j * W + (((i0 < 0 ? 0 : i0) + q) % W), h = Math.max(fondo[k], 2); let x = 0; for (const c of mobili) x += c.altezza * Math.cos((90 - ((j + 0.5) * 180) / H) * RAD) ** 2 * Math.min(5, 1 / Math.max(0.2, Math.abs(1 - (Tb / c.periodo) ** 2)));
        const largo = x; x *= Math.min(3, Math.pow(Math.max(hm, 50) / Math.max(h, 5), 0.25)); x = Math.min(x, 0.8 * h); let u = 0.5 * x * Math.sqrt(g / h); const A = righe.A[j]; let attrito = 1025 * 0.0025 * u ** 3 * (4 / (3 * Math.PI)) * A;
        // L'ENERGIA SI CONSERVA: l'attrito sul fondo di una cella non può consumare più di quanta l'onda di marea ne porta
        // dentro dal largo, ½·ρ·g·a²·√(g·h) per metro di fronte (a = metà dell'escursione al largo, h il fondo medio del
        // bacino), sul lato della cella. Dove l'attrito ne vorrebbe di più è lui che smorza l'onda: corrente ed escursione
        // calano finché i due conti tornano. (Prima, su un fondale di pochi metri, la legge di Green e la risonanza davano
        // correnti di metri al secondo su celle larghe 300 km: da sole consumavano dieci volte la marea di tutto il mare.)
        const porta = 0.5 * 1025 * g * (0.5 * largo) ** 2 * Math.sqrt(g * Math.max(hm, 1)) * Math.sqrt(A);
        if (attrito > porta) { const f = Math.cbrt(porta / attrito); u *= f; x *= f; attrito = porta; smorzate++; }
        amp[k] = x; vel[k] = u; potenza += attrito; aMax = Math.max(aMax, x); aSomma += x * A; aArea += A; } } }
  riempiTerra(amp, co.mare, W, H); riempiTerra(vel, co.mare, W, H);
  // la zona tra le maree, sulla carta fine: per ogni cella di costa, dislivello / pendenza della riva
  let areaZona = 0, lungoCosta = 0, pozze = 0, areaPozze = 0; const R = st.raggioM, lato = (2 * Math.PI * R) / FW;
  if (s.alt) for (let j = 1; j < FH - 1; j++) for (let i = 0; i < FW; i++) { const k = j * FW + i; if (tipo[k] !== 1) continue; let terra = -1; for (const q of [k - FW, k + FW, j * FW + ((i + 1) % FW), j * FW + ((i + FW - 1) % FW)]) if (tipo[q] === 0) terra = q; if (terra < 0) continue;
    const dx = lato * Math.max(0.1, Math.sin(((j + 0.5) / FH) * Math.PI)), pend = Math.max(1e-4, (s.alt[terra] - s.alt[k]) / dx), x = ((i + 0.5) / FW) * W - 0.5, y = ((j + 0.5) / FH) * H - 0.5, a = bil(amp, W, H, x, y), larg = Math.min(a / pend, 0.5 * dx);
    areaZona += larg * dx; lungoCosta += dx; if (bil(evap, W, H, x, y) > bil(piove, W, H, x, y)) { pozze++; areaPozze += larg * dx; } }
  const perMobile = mobili.length ? mobili.reduce((a, c) => (c.altezza > a.altezza ? c : a)) : null, I = 0.33 * P.massaKg * R * R;
  const frena = perMobile ? potenza / (I * perMobile.relativa) : 0; // (rad/s²: la potenza dissipata, divisa per il momento d'inerzia e per la velocità con cui il pianeta gira sotto il rigonfiamento)
  return { corpi, ampiezza: amp, corrente: vel, periodo: perMobile ? perMobile.periodo : Infinity, equilibrio: mobili.reduce((a, c) => a + c.altezza, 0), ampiezzaMedia: aArea ? aSomma / aArea : 0, ampiezzaMassima: aMax,
    attrito: { potenzaW: potenza, celleSmorzate: smorzate, frenaRadS2: frena, giornoPiuLungoMsAlSecolo: omega > 0 ? ((2 * Math.PI) / (omega * omega)) * frena * 100 * ANNO * 1000 : 0 },
    zonaTraLeMaree: { areaM2: areaZona, larghezzaMediaM: lungoCosta ? areaZona / lungoCosta : 0, costaM: lungoCosta, doveEvapora: { areaM2: areaPozze, tratti: pozze } } };
}
// LE STAGIONI. Il clima dà la temperatura della superficie in quattro parti dell'anno (cl.stagioni) e il tempo i venti
// di ognuna (cl.meteo.stagioni). Per ogni stagione: la temperatura del mare (quella media che le correnti hanno fatto,
// più lo scarto della stagione), il ghiaccio (dove quella temperatura sta sotto il punto di gelo dell'acqua salata), le
// onde di quel vento, la corrente (i grandi giri non fanno in tempo a cambiare: cambia la deriva di Ekman, che segue il
// vento in giorni: è lei che si rovescia coi monsoni), e lo strato rimescolato: il vento lo scava in proporzione a
// U^1,5, e d'inverno l'acqua di superficie, raffreddandosi, affonda finché trova acqua della sua temperatura
// (z = −h·ln((T_inverno − T_fondo)/(T_media − T_fondo)), sul profilo che il termoclino dà).
function stagioniDelMare(P, cl, m, st, { W, H, co, fondo, righe, g, Tclima, suGriglia, rhoAria, Tm, Tfondo }) {
  if (!Array.isArray(cl.stagioni) || cl.stagioni.length < 2) return null; const N = W * H, omega = (2 * Math.PI) / (P.giorno || GIORNO), df = Math.PI / H;
  const ekman = (u, v, k, j) => { const U = Math.hypot(u, v), tx = rhoAria * DATI.cd * U * u, ty = rhoAria * DATI.cd * U * v, rE = attritoDeriva(Math.hypot(tx, ty)), f = 2 * omega * Math.sin(Math.PI / 2 - (j + 0.5) * df), d = 1025 * (rE * rE + f * f) * DATI.strato; return [(rE * tx + f * ty) / d, (rE * ty - f * tx) / d]; };
  return cl.stagioni.map((Ts, q) => { const Tq = suGriglia(Ts), ms = m && m.stagioni ? m.stagioni[q] : null, vu = ms ? suGriglia(ms.u) : st.vento.u, vv = ms ? suGriglia(ms.v) : st.vento.v;
    const T = new Float32Array(N), gh = new Float32Array(N), cu = new Float32Array(N), cv = new Float32Array(N), strato = new Float32Array(N);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i; if (!co.mare[k]) continue; const scarto = Tq[k] - Tclima[k]; T[k] = Math.max(st.congela, Tm[k] + scarto); gh[k] = limita((st.congela + 1 - (Tm[k] + scarto)) / 2, 0, 1);
      const [ea, eb] = ekman(st.vento.u[k], st.vento.v[k], k, j), [sa, sb] = ekman(vu[k], vv[k], k, j); cu[k] = st.corrente.u[k] + (gh[k] > 0.8 ? -ea : sa - ea); cv[k] = st.corrente.v[k] + (gh[k] > 0.8 ? -eb : sb - eb);
      const U = Math.hypot(vu[k], vv[k]), fredda = Tm[k] - Tfondo > 0.5 && scarto < 0 ? -st.termoclino * Math.log(Math.max(0.02, (Tm[k] + scarto - Tfondo) / (Tm[k] - Tfondo))) : 0; strato[k] = Math.min(Math.max(fondo[k], 1), DATI.strato * Math.pow(Math.max(U, 0.5) / 5, 1.5) + Math.max(0, fredda)); }
    const onde = campoOnde({ W, H, R: st.raggioM, vu, vv, mare: co.mare, fondo, g, righe });
    for (const x of [T, gh, cu, cv, strato]) riempiTerra(x, co.mare, W, H);
    return { temperatura: T, ghiaccio: gh, vento: { u: vu, v: vv }, corrente: { u: cu, v: cv }, onde, strato }; });
}
// IL MARE A UN MOMENTO DELL'ANNO E DELLA MAREA. «fase»: 0…1 lungo l'anno (le quattro stagioni del clima, nell'ordine
// in cui il clima le dà, interpolate); «marea»: 0…1 lungo un ciclo di marea. → uno stato come quello di mare(), con i
// campi di quel momento al posto delle medie dell'anno (temperatura, ghiaccio, vento, onde, corrente, strato), e in più
// livello (m: quanto il mare è sopra o sotto il suo livello medio, punto per punto) e correnteDiMarea { u } (m/s, lungo
// i paralleli). Tutte le funzioni (coloreMare, aspettoMare, campioneAcqua, luogo…) lavorano anche su questo stato.
export function mareAl(stato, { fase = 0, marea = null } = {}) {
  if (!stato || !stato.esiste) return stato; const o = { ...stato, fase, marea }, S = stato.stagioni;
  if (S && S.length) { const x = (((fase % 1) + 1) % 1) * S.length - 0.5, a = ((Math.floor(x) % S.length) + S.length) % S.length, b = (a + 1) % S.length, w = x - Math.floor(x), mix = (p, q) => Float32Array.from(p, (v, k) => v * (1 - w) + q[k] * w);
    o.temperatura = mix(S[a].temperatura, S[b].temperatura); o.ghiaccio = mix(S[a].ghiaccio, S[b].ghiaccio); o.strato = mix(S[a].strato, S[b].strato);
    o.vento = { u: mix(S[a].vento.u, S[b].vento.u), v: mix(S[a].vento.v, S[b].vento.v) }; o.corrente = { u: mix(S[a].corrente.u, S[b].corrente.u), v: mix(S[a].corrente.v, S[b].corrente.v) };
    o.onde = { altezza: mix(S[a].onde.altezza, S[b].onde.altezza), periodo: mix(S[a].onde.periodo, S[b].onde.periodo), tratto: S[a].onde.tratto, lungo: { altezza: mix(S[a].onde.lungo.altezza, S[b].onde.lungo.altezza), periodo: mix(S[a].onde.lungo.periodo, S[b].onde.lungo.periodo), u: S[w < 0.5 ? a : b].onde.lungo.u, v: S[w < 0.5 ? a : b].onde.lungo.v } }; }
  if (marea != null && stato.maree) { const { W, H } = stato, liv = new Float32Array(W * H), cm = new Float32Array(W * H); // (il rigonfiamento segue l'astro: due creste lungo ogni parallelo)
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i, ph = 2 * Math.PI * marea - (4 * Math.PI * (i + 0.5)) / W; liv[k] = 0.5 * stato.maree.ampiezza[k] * Math.cos(ph); cm[k] = stato.maree.corrente[k] * Math.sin(ph); } o.livello = liv; o.correnteDiMarea = { u: cm }; }
  return o;
}
// LE PROVINCE DEL MARE: zone con un carattere proprio, trovate nei campi (non scritte). Ogni cella prende la prima
// regola che la riguarda, in quest'ordine; di ogni provincia: quante celle, quanta area, dove sta la sua macchia più
// grande, e i numeri che la fanno essere così.
function provinceDelMare(st, { W, H, co, righe, fondo, dolce, lonDi, latDi }) {
  const N = W * H, vel = Float32Array.from(st.corrente.u, (u, k) => Math.hypot(u, st.corrente.v[k])), ord = Array.from(vel).filter((_, k) => co.mare[k]).sort((a, b) => a - b), vForte = ord[Math.floor(ord.length * 0.97)] || 1, wSu = 20 / ANNO, So = st.salinitaMedia, anno = ANNO;
  const baciniQ = new Int16Array(N).fill(-1); if (st.fine.bacino) { const F = st.fine, kx = F.W / W; for (let k = 0; k < F.W * F.H; k++) if (F.bacino[k] >= 0) baciniQ[Math.floor(Math.floor(k / F.W) / kx) * W + Math.floor((k % F.W) / kx)] = F.bacino[k]; }
  const regole = [
    ['mare gelato', (k) => st.ghiaccio[k] > 0.6, (k) => `coperto di ghiaccio per ${Math.round(100 * st.ghiaccio[k])}% dell'anno (spesso ${st.spessoreGhiaccio[k].toFixed(1)} m): dentro il ghiaccio sacche di salamoia, sotto acqua al punto di gelo che il sale espulso appesantisce`],
    ['mare chiuso arrivato al sale', (k) => baciniQ[k] >= 0 && st.bacini[baciniQ[k]].saturo, (k) => `evapora più di quanto lo stretto (${(st.bacini[baciniQ[k]].larghezzaStrettoM / 1000).toFixed(0)} km × ${st.bacini[baciniQ[k]].sogliaM.toFixed(0)} m) lasci entrare: ${st.bacini[baciniQ[k]].salinita.toFixed(0)} g/kg, il sale si deposita`],
    ['mare quasi chiuso, più salato', (k) => baciniQ[k] >= 0 && st.bacini[baciniQ[k]].salinita > 1.08 * So, (k) => `bacino dove evapora più acqua di quanta ne arrivi: ${st.bacini[baciniQ[k]].salinita.toFixed(0)} g/kg contro ${So.toFixed(0)} del mare aperto`],
    ['mare quasi chiuso, salmastro', (k) => baciniQ[k] >= 0 && st.bacini[baciniQ[k]].salinita < 0.92 * So, (k) => `bacino dove piove e arrivano fiumi più di quanto evapori: ${st.bacini[baciniQ[k]].salinita.toFixed(0)} g/kg`],
    ['estuario e pennacchio di fiume', (k) => st.torbidita[k] > 1.5e-4 || dolce[k] > 3000, (k) => `acqua dolce e fango di fiume: ${(1000 * st.torbidita[k]).toFixed(2)} g/m³ di argilla sospesa, ${st.salinita[k].toFixed(0)} g/kg; l'argilla coagula incontrando il sale`],
    ['bordo del ghiaccio', (k) => st.ghiaccio[k] > 0.08, (k) => `ghiaccio di stagione (${Math.round(100 * st.ghiaccio[k])}% dell'anno): gela e si scioglie, d'inverno lascia sale nell'acqua`],
    ['bassofondo con forti maree', (k) => fondo[k] < 200 && st.maree && st.maree.ampiezza[k] > 2 && st.maree.ampiezza[k] > 3 * st.maree.ampiezzaMedia, (k) => `marea di ${st.maree.ampiezza[k].toFixed(1)} m su ${fondo[k].toFixed(0)} m di fondo: correnti di ${st.maree.corrente[k].toFixed(1)} m/s che rimescolano tutto`],
    ['mare caldo e basso che deposita calcare', (k) => fondo[k] < 200 && st.saturazione.calcite[k] > st.soglia, (k) => `acqua ${(st.saturazione.calcite[k] / st.soglia).toFixed(2)} volte oltre la soglia del calcare, su ${fondo[k].toFixed(0)} m di fondo: fanghi bianchi di carbonato`],
    ['risalita di acqua profonda', (k) => st.risalita[k] > wSu, (k) => `l'acqua di superficie diverge e ne sale da sotto ${(st.risalita[k] * anno).toFixed(0)} m l'anno: più fredda di ${Math.max(0, -st.scaldaDi[k]).toFixed(1)} K del clima di lì`],
    ['corrente forte', (k) => vel[k] > vForte, (k) => `${(100 * vel[k]).toFixed(0)} cm/s: porta ${st.scaldaDi[k] > 0 ? 'calore' : 'freddo'} (${st.scaldaDi[k].toFixed(1)} K rispetto al clima di lì)`],
    ['acque calde lattiginose', (k) => st.saturazione.calcite[k] > 1.05 * st.soglia, (k) => `mare aperto caldo (${(st.temperatura[k] - ZERO_CELSIUS).toFixed(0)} °C) dove il calcare nasce in cristalli minuti: acqua turchese`],
    ['strati che non si mescolano', (k) => st.salinita[k] < 0.93 * st.profondo.salinita && fondo[k] > 300, (k) => `acqua di superficie più dolce (${st.salinita[k].toFixed(1)} g/kg) sopra acqua salata (${st.profondo.salinita.toFixed(1)}): troppo leggera per affondare`],
    ['mare che affonda', (k) => densita(st.temperatura[k], st.salinita[k]) > st.profondo.densita - 0.15, (k) => `l'acqua più densa del pianeta (${(st.temperatura[k] - ZERO_CELSIUS).toFixed(1)} °C, ${st.salinita[k].toFixed(1)} g/kg): affonda e riempie il fondo`],
    ['centro di un grande giro', (k) => st.risalita[k] < -8 / ANNO && fondo[k] > 1000, (k) => `l'acqua converge e scende (${(st.risalita[k] * anno).toFixed(0)} m l'anno): limpida, blu, povera di tutto`],
    ['mare aperto', () => true, (k) => `${(st.temperatura[k] - ZERO_CELSIUS).toFixed(0)} °C, ${st.salinita[k].toFixed(1)} g/kg, limpido`]];
  const prov = new Uint8Array(N).fill(255), lista = regole.map(([nome]) => ({ nome, celle: 0, areaM2: 0, perche: '', dove: null, _k: -1, _peso: -1 }));
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i; if (!co.mare[k]) continue; for (let r = 0; r < regole.length; r++) if (regole[r][1](k)) { prov[k] = r; lista[r].celle++; lista[r].areaM2 += righe.A[j]; break; } }
  // l'esempio di ogni provincia: la cella con più vicine della stessa provincia (il cuore della macchia più grande)
  for (let j = 1; j < H - 1; j++) for (let i = 0; i < W; i++) { const k = j * W + i, r = prov[k]; if (r === 255) continue; let p = 0; for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) { const jj = j + dj; if (jj >= 0 && jj < H && prov[jj * W + ((i + di + W) % W)] === r) p++; } if (p > lista[r]._peso) { lista[r]._peso = p; lista[r]._k = k; } }
  const out = []; lista.forEach((x, r) => { if (!x.celle) return; const k = x._k >= 0 ? x._k : prov.indexOf(r); out.push({ indice: r, nome: x.nome, celle: x.celle, areaM2: x.areaM2, parte: x.areaM2 / st.areaMare, dove: { lon: lonDi(k % W, W), lat: latDi(Math.floor(k / W), H) }, perche: regole[r][2](k) }); });
  // (in più, fuori dalla griglia: i camini caldi e i laghi)
  if (st.sorgentiCalde.length) out.push({ indice: -1, nome: 'campi di camini caldi', celle: st.sorgentiCalde.length, areaM2: 0, parte: 0, dove: { lon: st.sorgentiCalde[0].lon, lat: st.sorgentiCalde[0].lat }, perche: `sul fondo dove la crosta è giovane: acqua a ${Math.round(Math.max(...st.sorgentiCalde.map((v) => v.T)) - 273)} °C, acida, con ferro e solfuro che precipitano in fumo nero` });
  const salati = st.laghi.filter((l) => l.tipo !== 'aperto'); if (salati.length) out.push({ indice: -2, nome: 'laghi chiusi e piane di sale', celle: salati.length, areaM2: salati.reduce((a, l) => a + l.areaM2, 0), parte: 0, dove: { lon: salati[0].lon, lat: salati[0].lat }, perche: `conche senza emissario: fino a ${Math.max(...salati.map((l) => l.salinita)).toFixed(0)} g/kg, pH ${Math.max(...salati.map((l) => l.pH)).toFixed(1)}` });
  st.provincia = prov; return out;
}
// CIÒ CHE SERVIREBBE ALLA CHIMICA PREBIOTICA (qui niente vita: solo dove ci sono gradienti, energia, minerali che
// catalizzano). L'energia chimica di una sorgente: l'idrogeno che la roccia cede all'acqua (dato: fino a ~10 mmol/kg dove
// c'è olivina che si idrata, ~0,1 altrove) contro l'anidride carbonica del mare, CO2 + 4H2 → CH4 + 2H2O, dalla tabella.
function perLaChimicaPrebiotica(st, s) {
  const T = st.Tmedia || 280, dG0 = gibbs('CH4', T) + 2 * gibbs('H2O(l)', T) - gibbs('CO2', T) - 4 * gibbs('H2', T);
  const camini = (st.sorgentiCalde || []).map((v) => { const H2 = v.alcalina ? 0.01 : 1e-4, Q = (1e-6 / 1.4e-3) / ((Math.max(st.gas.CO2 || 1e-9, 1e-9) / costanti(T).henry.CO2) * (H2 / 7.8e-4) ** 4);
    return { id: v.id, lon: v.lon, lat: v.lat, profonditaM: v.profonditaM, saltoDiTemperatura: v.T - (st.profondo?.T ?? T), saltoDiPH: st.pH - v.pH, energiaKJmol: -(dG0 + R_GAS * T * Math.log(Q)) / 1000,
      minerali: ['solfuro di ferro', ...(v.alcalina ? ['olivina che si idrata (serpentino, magnetite)'] : []), 'argille'], alcalina: v.alcalina }; });
  const pozze = (st.laghi || []).filter((l) => l.tipo !== 'aperto').map((l) => ({ id: l.id, lon: l.lon, lat: l.lat, concentrato: l.concentrato, salinita: l.salinita, pH: l.pH, T: l.T }));
  return { camini, pozzeCheEvaporano: pozze, pozzeDiMarea: st.maree ? { ...st.maree.zonaTraLeMaree.doveEvapora, ogniSecondi: st.maree.periodo, dislivelloM: st.maree.ampiezzaMedia } : null, foci: (st.foci || []).slice(0, 12).map((f) => ({ lon: f.lon, lat: f.lat, portata: f.portata })),
    gradienti: { pHmare: st.pH, anidrideCarbonica: st.gas.CO2 || 0, ferroSciolto: st.totali.Fe || 0, ossigeno: st.gas.O2 || 0 },
    nota: 'gradienti di pH e di temperatura ai camini (di più se il mare è acido e il camino alcalino), minerali catalitici (solfuri di ferro, argille), pozze che si concentrano evaporando; con ossigeno nell\'aria il ferro sciolto e l\'idrogeno non durano' };
}
function racconta(st, bs) {
  const i = st.ioni, ord = Object.entries(i).filter(([f]) => IONI[f]).sort((a, b) => b[1] * Math.abs(IONI[b[0]][2]) - a[1] * Math.abs(IONI[a[0]][2])), r = bs.bilancio.residenza, ma = (x) => (x >= 1e9 ? `${(x / 1e9).toFixed(1)} miliardi di anni` : `${Math.round(x / 1e6)} milioni di anni`);
  if (!(st.massaMare > 1)) return 'Niente mare: solo laghi. I fiumi portano i sali delle rocce; dove un lago ha un emissario resta dolce, dove è chiuso li accumula.';
  const tipoMare = st.pH < 6.5 ? 'acido' : st.pH > 9 ? 'di soda (alcalino)' : 'quasi neutro', sale = st.salinitaMedia > 150 ? 'una salamoia' : st.salinitaMedia > 20 ? 'salato' : st.salinitaMedia > 3 ? 'salmastro' : 'quasi dolce';
  return `Mare ${sale} (${st.salinitaMedia.toFixed(1)} g/kg), ${tipoMare} (pH ${st.pH.toFixed(1)}); dominano ${ord[0][0]} e ${ord[1][0]}. ` +
    `Il cloro è quello che i vulcani hanno portato fuori dal mantello in tutta la vita del pianeta, e non ha quasi modo di uscire dall'acqua (resta ${ma(r.Cl)}); il sodio lo cedono i feldspati consumati dalla pioggia e resta ${ma(r.Na)}; ` +
    `il calcio arriva di più ma esce subito come calcare (resta ${ma(r.Ca)}): per questo i fiumi sono acqua di calcio e bicarbonato e il mare è acqua di sale. ` +
    `Il magnesio lo trattiene la roccia calda del fondo (${ma(r.Mg)}). Il pH è quello a cui l'anidride carbonica dell'aria (${(st.pCO2 * 1e6).toPrecision(2)} milionesimi di bar) e il calcare stanno in equilibrio con le cariche dei sali.` +
    (st.fondoDiSale ? ` L'acqua non tiene sciolto tutto il sale che ha ricevuto: il resto è sul fondo (${Object.keys(st.fondoDiSale).join(', ')}).` : '');
}
// I MARI QUASI CHIUSI. Sulla carta fine si toglie al mare una fascia lungo le coste (le celle che toccano terra): ciò che
// resta si divide in pezzi dove un passaggio è largo due celle o meno; ogni cella di mare va poi al pezzo più vicino. Il
// pezzo più grande è l'oceano, gli altri sono bacini (mari interni, golfi), ciascuno con la sua bocca (quante celle,
// quanto profonde) o senza (un mare isolato). Ciò che la griglia non vede è quanto la bocca è stretta e bassa DAVVERO
// (una cella è larga 150 km; Gibilterra 14): sono due eventi di quel bacino.
function baciniDelMare({ tipo, fondoF, FW, FH, areaF, R, eMenoP, dolceFine, c0 }) {
  const N = FW * FH, id = new Int16Array(N).fill(-1), comp = new Int32Array(N).fill(-1), pezzi = [], costa = new Uint8Array(N);
  const vicini4 = (k, f) => { const i = k % FW, j = (k - i) / FW; f(j * FW + ((i + 1) % FW)); f(j * FW + ((i + FW - 1) % FW)); if (j > 0) f(k - FW); if (j < FH - 1) f(k + FW); };
  for (let j = 0; j < FH; j++) for (let i = 0; i < FW; i++) { const k = j * FW + i; if (tipo[k] !== 1) continue; for (let dj = -1; dj <= 1 && !costa[k]; dj++) for (let di = -1; di <= 1; di++) { const jj = j + dj; if (jj >= 0 && jj < FH && tipo[jj * FW + ((i + di + FW) % FW)] !== 1) { costa[k] = 1; break; } } }
  for (let k0 = 0; k0 < N; k0++) { if (tipo[k0] !== 1 || costa[k0] || comp[k0] >= 0) continue; const coda = [k0]; comp[k0] = pezzi.length; for (let n = 0; n < coda.length; n++) vicini4(coda[n], (q) => { if (tipo[q] === 1 && !costa[q] && comp[q] < 0) { comp[q] = pezzi.length; coda.push(q); } }); pezzi.push({ celle: [], A: 0 }); }
  { const coda = []; for (let k = 0; k < N; k++) if (comp[k] >= 0) coda.push(k); for (let n = 0; n < coda.length; n++) vicini4(coda[n], (q) => { if (tipo[q] === 1 && comp[q] < 0) { comp[q] = comp[coda[n]]; coda.push(q); } }); }
  // (i mari che non hanno un «largo»: stretti dappertutto, o isolati)
  for (let k0 = 0; k0 < N; k0++) { if (tipo[k0] !== 1 || comp[k0] >= 0) continue; const coda = [k0]; comp[k0] = pezzi.length; for (let n = 0; n < coda.length; n++) vicini4(coda[n], (q) => { if (tipo[q] === 1 && comp[q] < 0) { comp[q] = pezzi.length; coda.push(q); } }); pezzi.push({ celle: [], A: 0 }); }
  for (let k = 0; k < N; k++) if (comp[k] >= 0) { pezzi[comp[k]].celle.push(k); pezzi[comp[k]].A += areaF(Math.floor(k / FW)); }
  let oceano = 0; for (let n = 1; n < pezzi.length; n++) if (pezzi[n].A > pezzi[oceano].A) oceano = n;
  const lista = []; pezzi.forEach((pz, n) => { if (n === oceano || lista.length >= 80 || pz.celle.length < 2) return;
    // la bocca: le sue celle che toccano un altro pezzo di mare (larghezza: quante sono; soglia: la più profonda)
    const bocche = new Set(); let F = 0, x = 0, y = 0, z = 0, fondo = 0; for (const c of pz.celle) { vicini4(c, (q) => { if (tipo[q] === 1 && comp[q] !== n) bocche.add(c); }); const i = c % FW, j = (c - i) / FW, a = areaF(j), lo = (((i + 0.5) / FW) * 360 - 180) * RAD, la = (90 - ((j + 0.5) / FH) * 180) * RAD;
      F += eMenoP(c) * a - dolceFine[c]; x += a * Math.cos(la) * Math.cos(lo); y += a * Math.cos(la) * Math.sin(lo); z += a * Math.sin(la); fondo += a * fondoF[c]; }
    let soglia = 0, jB = 0; for (const q of bocche) { soglia = Math.max(soglia, fondoF[q]); jB = Math.floor(q / FW); }
    const b = { id: lista.length, celle: pz.celle, lon: Math.atan2(y, x) / RAD, lat: Math.atan2(z, Math.hypot(x, y)) / RAD, areaM2: pz.A, profonditaM: fondo / pz.A, evaporaMenoArriva: F, // (m³/s: positivo se evapora più di quanto piova e arrivi dai fiumi)
      chiuso: bocche.size === 0, strettoCelle: bocche.size, larghezzaCella: bocche.size * ((2 * Math.PI * R) / FW) * Math.max(0.05, Math.sin(((jB + 0.5) / FH) * Math.PI)), sogliaCella: soglia };
    // quanto è stretto e quanto è basso davvero (tra la cella intera e un trecentesimo; tra la profondità della cella e un trentesimo, mai meno di 5 m)
    b.u = [c0(`bacino ${b.id}/quanto è stretto davvero lo stretto`), c0(`bacino ${b.id}/quanto è bassa davvero la soglia`)];
    for (const c of b.celle) id[c] = b.id; lista.push(b); });
  return { lista, id };
}
// la salinità di un bacino: l'acqua esce in profondità più salata ed entra in superficie più dolce (o il contrario),
// tanta quanta lo stretto ne lascia passare, Q = 0,25·larghezza·soglia·√(g·β·ΔS·soglia) (controllo idraulico); a
// regime il sale che entra pareggia quello che esce: ΔS = (S·F/(0,25·L·h^1,5·√(g·β)))^(2/3), con F ciò che evapora in
// più (β = 7,8·10⁻⁴ per g/kg: quanto il sale appesantisce l'acqua). Se ΔS porta oltre la saturazione, il sale si
// deposita. «depositoAtteso»: la media sugli esiti possibili dei due eventi (serve alla storia lunga del mare, che ha
// visto molti stretti aprirsi e chiudersi); lo stato di oggi usa l'esito vero.
export function chiudiBacino(b, So, fSat, g, gesso = null) {
  const beta = 7.8e-4, F = b.evaporaMenoArriva, con = (u1, u2) => { if (b.chiuso) return { dS: F > 0 ? Infinity : -So, L: 0, h: 0, Q: 0 };
    const L = b.larghezzaCella * Math.pow(10, -2.5 * u1), h = Math.max(Math.min(5, b.sogliaCella), b.sogliaCella * Math.pow(10, -1.5 * u2)), k = DATI.scambioStretto * L * Math.pow(h, 1.5) * Math.sqrt(g * beta);
    const dS = Math.sign(F) * Math.pow((So * Math.abs(F)) / Math.max(k, 1e-9), 2 / 3); return { dS, L, h, Q: k * Math.sqrt(Math.abs(dS)) }; };
  // IL GESSO VIENE PRIMA DEL SALE (la sequenza di un'acqua di mare che evapora: Usiglio 1849; qui dalle solubilità di
  // chimica.js): un bacino che concentra l'acqua oltre la saturazione del gesso (gesso.f volte), senza arrivare al
  // salgemma, lascia sul fondo solfato di calcio e rimanda al mare un'acqua che ne ha di meno: per ogni kg che esce
  // dallo stretto, x moli con (c·Ca − x)(c·S − x) = f²·Ca·S. «gessoAtteso» (mol/s): la media sugli stessi esiti.
  const oggi = con(b.u[0], b.u[1]), Ssat = So * fSat; let atteso = 0, gessoAtteso = 0;
  for (let a = 0; a < 6; a++) for (let c = 0; c < 6; c++) { if (!(F > 0)) continue; const e = con((a + 0.5) / 6, (c + 0.5) / 6); if (So + e.dS >= Ssat) atteso += F / 36;
    else if (gesso && So > 0) { const conc = (So + e.dS) / So; if (conc > gesso.f) gessoAtteso += (e.Q * 1025 * toglieSale(conc * gesso.Ca, conc * gesso.S, gesso.f * gesso.f * gesso.Ca * gesso.S)) / 36; } }
  Object.assign(b, { salinita: limita(So + oggi.dS, 0.02 * So, Ssat), saturo: F > 0 && So + oggi.dS >= Ssat, larghezzaStrettoM: oggi.L, sogliaM: oggi.h, scambioSv: oggi.Q / 1e6, depositoAtteso: b.chiuso ? 0 : atteso, gessoAtteso: b.chiuso ? 0 : gessoAtteso });
}
// di quante volte l'acqua del mare va concentrata perché il salgemma (o un altro sale) cominci a depositarsi
function fattoreDiSaturazione(ioni, T, pCO2, sale = 'salgemma') { let lo = 1, hi = 60; for (let it = 0; it < 9; it++) { const f = Math.sqrt(lo * hi), t = {}; for (const e in ioni) t[e] = ioni[e] * f; if (acqua(t, T, { pCO2 }).omega[sale] > 1) hi = f; else lo = f; } return Math.sqrt(lo * hi); }
// le moli per kg, con i nomi degli ioni (il carbonio sciolto è quasi tutto bicarbonato)
const nomiIoni = (t, eq) => ({ 'Na+': t.Na || 0, 'K+': t.K || 0, 'Mg2+': t.Mg || 0, 'Ca2+': t.Ca || 0, 'Cl-': t.Cl || 0, 'SO4(2-)': t.S || 0, 'HCO3-': eq ? eq.bicarbonato : 0, 'CO3(2-)': eq ? eq.carbonato : 0, 'Fe2+': t.Fe || 0, H4SiO4: t.Si || 0 });
// LA REGOLA PER IL PUNTO: il mare è ben rimescolato rispetto ai tempi di residenza, quindi gli ioni maggiori hanno
// ovunque le stesse proporzioni (lo si misura dal 1819, Marcet): in un punto di salinità S ci sono gli ioni medi
// moltiplicati per S / S media. Il carbonio, il pH e le saturazioni no: dipendono dalla temperatura (acqua()).
// L'ARGILLA INCONTRA IL SALE (Schulze-Hardy): la parte dell'argilla che coagula in fiocchi, con gli ioni t (mol/kg): gli ioni a
// una carica schermano a DATI.coagula, quelli a due 64 volte meglio (z⁶)
function inFiocchi(t) { const schermo = ((t.Na || 0) + (t.K || 0)) / DATI.coagula + (64 * ((t.Mg || 0) + (t.Ca || 0))) / DATI.coagula; return schermo > 1 ? 1 - 1 / schermo : 0; }
export function ioniNelPunto(stato, salinita) { const f = stato.salinitaMedia > 0 ? salinita / stato.salinitaMedia : 1, o = {}; for (const e in stato.totali) o[e] = stato.totali[e] * f; return o; }

// ---------- 5. IL LUOGO: che acqua c'è in un punto (longitudine e latitudine in gradi, profondità in metri)
const campo = (st, x, lon, lat) => bil(x, st.W, st.H, ((lon + 180) / 360) * st.W - 0.5, ((90 - lat) / 180) * st.H - 0.5);
const cellaFine = (st, lon, lat) => { const F = st.fine, i = ((Math.floor(((lon + 180) / 360) * F.W) % F.W) + F.W) % F.W, j = limita(Math.floor(((90 - lat) / 180) * F.H), 0, F.H - 1); return j * F.W + i; };
const gradi = (x, n = 5) => (Math.round(x * 10 ** n) / 10 ** n).toFixed(n);
// Chi chiama può sapere meglio di questa griglia se quel punto è acqua (una tessera fine di geologia.js): «acqua»
// (vero/falso) e «fondoM» (la profondità del fondo lì) hanno la precedenza.
export function luogo(stato, lon, lat, { profondita = 0, acqua: forzata = null, fondoM = null } = {}, caso = null) {
  if (!stato || !stato.esiste) return { tipo: 'terra', asciutto: true, motivo: stato?.motivo || 'niente mare' };
  const k = cellaFine(stato, lon, lat), F = stato.fine; let tipo = F.tipo[k], idLago = F.lago[k];
  if (forzata === false) return { tipo: 'terra', asciutto: true, motivo: 'terra emersa' };
  if (forzata === true && tipo === 0) { // acqua che la griglia grossa non vede: mare se la cella tocca il mare, altrimenti un lago dolce
    const i = k % F.W, j = (k - i) / F.W; let vicinoMare = false; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const jj = j + dj; if (jj >= 0 && jj < F.H && F.tipo[jj * F.W + ((i + di + F.W) % F.W)] === 1) vicinoMare = true; }
    tipo = vicinoMare ? 1 : 2; idLago = -1; }
  if (tipo === 0) return { tipo: 'terra', asciutto: true, motivo: 'terra emersa' };
  const g = stato.gravita, c = caso || sorgente(stato.radice), vento = Math.hypot(campo(stato, stato.vento.u, lon, lat), campo(stato, stato.vento.v, lon, lat));
  const o = { tipo: tipo === 1 ? 'mare' : tipo === 4 ? 'piana di sale' : 'lago', lon, lat, vento, pCO2: stato.pCO2, foce: null, camino: null, vulcano: null, parteDiFiume: 0, sospeso: { sabbia: 0, limo: 0, argilla: 0, fiocchi: 0, polvere: 0 } };
  if (tipo !== 1) { // un lago: la sua acqua è quella della sua scheda (o, se la griglia non lo conosce, quella dei fiumi)
    const L = idLago >= 0 ? stato.laghi[idLago] : null, fondo = fondoM ?? (F.fondo[k] || 2), z = limita(profondita, 0, fondo);
    const Ts = L ? L.T : Math.max(271, campo(stato, stato.temperatura, lon, lat)), dolce = !L || L.salinita < 24.7;
    // sotto la superficie un lago profondo tiene l'acqua più densa: a 4 °C se è dolce
    const T = z > 10 && dolce && Ts > 277.13 ? Ts + (277.13 - Ts) * (1 - Math.exp(-(z - 10) / 20)) : Ts;
    const tot = L ? { ...L.totali } : { ...stato.fiume };
    return Object.assign(o, { lago: L, fondoM: fondo, profondita: z, T, salinita: L ? L.salinita : stato.fiume.salinita, totali: tot, u: 0, v: 0, w: 0, ghiaccio: L ? L.ghiaccio : 0, spessoreGhiaccio: 0,
      evapora: L && L.tipo !== 'aperto' ? Math.max(0, L.evaporaKgAnno / L.areaM2 / ANNO) : 0, precipita: L ? L.precipitati : null, sospeso: { sabbia: 0, limo: 0, argilla: L && L.tipo === 'aperto' ? 0.02 * stato.fiume.sospeso : 0, fiocchi: 0 } });
  }
  const fondo = fondoM ?? Math.max(1, F.fondo[k]), z = limita(profondita, 0, fondo), Ts = campo(stato, stato.temperatura, lon, lat), Ss = campo(stato, stato.salinita, lon, lat), ht = stato.termoclino, hs = DATI.strato;
  const giu = z > hs ? 1 - Math.exp(-(z - hs) / ht) : 0, us = campo(stato, stato.corrente.u, lon, lat), vs = campo(stato, stato.corrente.v, lon, lat), cala = 0.5 * Math.exp(-z / hs) + 0.5 * Math.exp(-z / ht);
  Object.assign(o, { fondoM: fondo, profondita: z, T: Ts + (stato.profondo.T - Ts) * giu, salinita: Ss + (stato.profondo.salinita - Ss) * giu, u: us * cala, v: vs * cala, w: campo(stato, stato.risalita, lon, lat) * Math.exp(-z / ht),
    ghiaccio: campo(stato, stato.ghiaccio, lon, lat), spessoreGhiaccio: campo(stato, stato.spessoreGhiaccio, lon, lat), eMenoP: campo(stato, stato.eMenoP, lon, lat) });
  // la foce più vicina (quella che conta di più qui): il pennacchio d'acqua dolce e di fango
  let meglio = null; for (const f of stato.foci) { const x = Math.max(30, distanza(stato.raggioM, lon, lat, f.lon, f.lat)); if (x > 3e6) continue; const p = pennacchio(f.portata, x, g); if (!meglio || p.parte > meglio.p.parte) meglio = { f, x, p }; }
  if (meglio && z < 4 * DATI.pennacchio) { const { f, x, p } = meglio, parte = p.parte * Math.exp(-z / DATI.pennacchio), cade = (d, rho) => Math.exp((-x * Math.max(0, stokes(d, rho, o.T, o.salinita, g))) / (p.velocita * DATI.pennacchio));
    const Cf = stato.fiume.sospeso * parte, fr = stato.fiume, pSabbia = fr.sedimentoKgAnno > 0 ? fr.sabbiaKgAnno / fr.sedimentoKgAnno : 0.3, pArg = f.argilla, pLimo = Math.max(0, 1 - pSabbia - pArg);
    // L'ARGILLA INCONTRA IL SALE (Schulze-Hardy): i granelli d'argilla, carichi negativi, si respingono; gli ioni positivi
    // li schermano, quelli a due cariche 64 volte meglio. Oltre la concentrazione critica si attaccano in fiocchi, che cadono
    const coagula = inFiocchi(ioniNelPunto(stato, Ss * (1 - parte)));
    o.foce = { lon: f.lon, lat: f.lat, distanzaM: x, portata: f.portata, parteDiFiume: parte, coagula }; o.parteDiFiume = parte; o.salinita = o.salinita * (1 - parte) + stato.fiume.salinita * parte;
    o.sospeso.sabbia = Cf * pSabbia * cade(DATI.taglie.sabbia, DATI.densitaGrani); o.sospeso.limo = Cf * pLimo * cade(DATI.taglie.limo, DATI.densitaGrani);
    o.sospeso.argilla = Cf * pArg * (1 - coagula) * cade(DATI.taglie.argilla, DATI.densitaGrani); o.sospeso.fiocchi = Cf * pArg * coagula * cade(DATI.fiocco, DATI.densitaFiocchi); }
  o.sospeso.argilla += campo(stato, stato.torbidita, lon, lat) * Math.exp(-z / (2 * hs));
  if (stato.polvere) { const Fp = Math.max(0, campo(stato, stato.polvere, lon, lat)), ps = polvereSospesa(Fp, limita(o.T, 271, 373), Math.min(o.salinita, 300), g, DATI.mescola / Math.max(1, stato.termoclino || 1)); o.sospeso.polvere = ps.kgM3 * Math.exp(-z / (2 * hs)); o.polvere = { flusso: Fp, dMedio: ps.dMedio }; }
  // gli ioni: quelli del mare a quella salinità, mescolati con quelli del fiume
  o.totali = {}; { const t = ioniNelPunto(stato, o.parteDiFiume < 1 ? (o.salinita - stato.fiume.salinita * o.parteDiFiume) : 0); for (const e in stato.totali) o.totali[e] = t[e] + (stato.fiume[e] || 0) * o.parteDiFiume; }
  // la sorgente calda più vicina: se il punto è sul fondo, in un campo di camini, il pennacchio caldo si mescola
  // all'acqua fredda come un getto che sale (Morton, Taylor e Turner 1956: la portata cresce come la distanza alla 5/3)
  let vc = null, dv = Infinity; for (const s of stato.sorgentiCalde) { const d = distanza(stato.raggioM, lon, lat, s.lon, s.lat); if (d < dv) { dv = d; vc = s; } }
  if (vc && dv < 1.2e5 && fondo - z < 300) { // dentro il campo: quanto dista il camino più vicino è un evento di quel punto
    const dC = Math.pow(10, c.tra(`camino ${vc.id}/${gradi(lon, 3)}/${gradi(lat, 3)}/a che distanza`, -0.3, 2.7)), r = Math.hypot(dC, fondo - z), parte = Math.min(1, Math.pow(Math.max(r, 0.05) / 0.05, -5 / 3));
    o.camino = { ...vc, distanzaM: r, parteDiFluido: parte }; o.Tintorno = o.T; o.T += parte * (vc.T - o.T); }
  for (const v of stato.vulcani || []) { const d = distanza(stato.raggioM, lon, lat, v.lon, v.lat); if (d < 8e5 && (!o.vulcano || d < o.vulcano.distanzaM)) o.vulcano = { ...v, distanzaM: d }; }
  return o;
}

// ---------- 6. IL CAMPIONE D'ACQUA: che cosa c'è in un cubetto di lato latoM, e come si muove
// I colori sono quelli dei minerali in polvere (chimica.js) e, per atomi e ioni, quelli convenzionali dei modelli.
const COLORE = { sabbia: [214, 200, 172], limo: [176, 160, 136], argilla: [150, 124, 100], fiocco: [136, 116, 98], colloide: [160, 140, 120], calcite: [244, 240, 228], gesso: [236, 230, 218], salgemma: [240, 236, 228], ghiaccio: [214, 232, 246],
  soda: [238, 234, 222], 'solfuro di ferro': [28, 26, 30], ruggine: [176, 96, 44], bolla: [226, 240, 250], pomice: [188, 182, 172], acqua: [226, 64, 56], 'Na+': [171, 92, 242], 'K+': [143, 64, 212], 'Mg2+': [138, 255, 0], 'Ca2+': [61, 255, 0], 'Fe2+': [224, 102, 51],
  'Cl-': [31, 240, 31], 'SO4(2-)': [255, 200, 50], 'HCO3-': [144, 144, 144], 'CO3(2-)': [110, 110, 110], 'H+': [255, 255, 255], 'OH-': [255, 120, 120], coppia: [250, 250, 160], gas: [200, 220, 255] };
// un conteggio a caso (Poisson) dalla sorgente degli eventi
function contaEvento(c, nome, media) {
  if (!(media > 0)) return 0; if (media > 40) return Math.max(0, Math.round(media + Math.sqrt(media) * c.normale(nome)));
  const L = Math.exp(-media); let k = 0, p = c(`${nome}#0`); while (p > L && k < 200) { k++; p *= c(`${nome}#${k}`); } return k;
}
export function campioneAcqua(stato, { lon = 0, lat = 0, profondita = 0, latoM = 1e-3, t = 0, massimo = 400, acqua: forzata = null, fondoM = null } = {}, caso = null) {
  const radice = `${stato?.radice || 'mare'}/campione/${gradi(lon)}/${gradi(lat)}/${profondita.toPrecision(4)}/${latoM.toExponential(2)}`, c = caso ? caso.sotto(`campione/${gradi(lon)}/${gradi(lat)}/${profondita.toPrecision(4)}/${latoM.toExponential(2)}`) : sorgente(radice);
  const qui = luogo(stato, lon, lat, { profondita, acqua: forzata, fondoM }, caso || sorgente(stato?.radice || 'mare'));
  if (qui.asciutto) return { asciutto: true, tipo: qui.tipo, particelle: [], cristalli: [], bolle: [], velo: [], quanteDavvero: {}, ioni: {}, descrizione: `Qui non c'è acqua: ${qui.motivo}.` };
  const L = latoM, V = L * L * L, g = stato.gravita; let T = qui.T, S = qui.salinita; const tot = { ...qui.totali }, note = [];
  // --- sotto il ghiaccio: dentro la lastra restano sacche di SALAMOIA, tanto più salata quanto più il ghiaccio è freddo
  // (è l'acqua che a quella temperatura non gela ancora: il punto di congelamento scende di 1,86 K per mole di ioni)
  let salamoia = null;
  if (qui.tipo === 'mare' && qui.ghiaccio > 0.5 && qui.profondita < qui.spessoreGhiaccio) { const Tg = Math.min(stato.congela - 0.5, campo(stato, stato.temperatura, lon, lat) - 6 * qui.ghiaccio), moli = (ZERO_CELSIUS - Tg) / (CRIOSCOPICA * 0.92), f = Math.max(1, moli / Math.max(1e-6, somma(tot)));
    const e = evapora(tot, f, Math.max(Tg, 250), stato.pCO2); for (const k in e.ioni) tot[k] = e.ioni[k]; T = Tg; S = e.salinita; salamoia = { concentrata: f, precipitati: e.precipitati, parteLiquida: 1 / f }; note.push('ghiaccio marino'); }
  // --- vicino a un camino: il fluido caldo e acido, col suo ferro e il suo solfuro
  let H2S = 0, ferro = tot.Fe || 0, acido = 0; const totIntorno = { ...tot };
  if (qui.camino) { const p = qui.camino.parteDiFluido, fl = qui.camino.fluido; for (const [e, f] of [['Na', 'Na+'], ['K', 'K+'], ['Mg', 'Mg2+'], ['Ca', 'Ca2+'], ['Cl', 'Cl-'], ['S', 'SO4(2-)']]) tot[e] += p * (fl[f] - tot[e]);
    tot.Si = (tot.Si || 0) * (1 - p) + p * fl.H4SiO4; H2S = p * fl['H2S(aq)']; ferro += p * fl['Fe2+']; acido = p * (Math.pow(10, -qui.camino.pH) + 2 * fl['Fe2+']); } // (l'acido del fluido, e quello che il ferro libera diventando solfuro, è già nel bilancio delle cariche)
  // --- l'equilibrio in soluzione, a questa temperatura
  // (sotto lo strato rimescolato l'acqua non tocca più l'aria: tiene il carbonio che aveva preso in superficie; il fluido dei camini ne porta di suo, ~10 mmol/kg misurati)
  const chiusa = qui.tipo === 'mare' && !salamoia && (qui.profondita > DATI.strato || qui.camino), cSup = chiusa ? acqua(totIntorno, limita(qui.Tintorno ?? T, 250, 640), { pCO2: stato.pCO2 }).carbonio : null, pv = qui.camino ? qui.camino.parteDiFluido : 0;
  const eq = acqua(tot, limita(T, 250, 640), chiusa ? { carbonio: cSup * (1 - pv) + 0.01 * pv } : { pCO2: stato.pCO2 }), K = costanti(limita(T, 250, 640)), rho = densita(Math.min(T, 373), Math.min(S, 300)), mu = viscosita(Math.min(T, 420), Math.min(S, 300)), kgAcqua = rho * (1 - S / 1000);
  const moliIoni = somma(tot) + eq.bicarbonato + eq.carbonato, Tgelo = congelamento(moliIoni);
  const gas = gasSciolti(stato.aria, stato.pressioneAria, Math.max(T, 271), eq.I), soglia = { calcite: omegaCritica('calcite', T), gesso: 1, salgemma: 1 };
  // --- LE CLASSI DI PARTICELLE: quante per m³ (n), di che taglia (d), di che cosa
  const classi = [], metti = (tipo, materiale, d, n, extra = {}) => { if (n > 0 && d > 0) classi.push({ tipo, materiale, d, n, sigma: 0.35, rho: DATI.densitaGrani, forma: 'granello', colore: COLORE[materiale] || COLORE[tipo] || [200, 200, 200], ...extra }); };
  const perMassa = (C, d, rhoG) => C / ((rhoG * Math.PI * d ** 3) / 6), sp = qui.sospeso, crosta = stato.coloreFondo;
  metti('granello', 'sabbia', DATI.taglie.sabbia, perMassa(sp.sabbia, DATI.taglie.sabbia, DATI.densitaGrani), { perche: 'portata dal fiume: cade in fretta' });
  metti('granello', 'limo', DATI.taglie.limo, perMassa(sp.limo, DATI.taglie.limo, DATI.densitaGrani), { perche: 'portato dal fiume' });
  metti('granello', 'argilla', DATI.taglie.argilla, perMassa(sp.argilla, DATI.taglie.argilla, DATI.densitaGrani), { forma: 'lamella', perche: 'il fango più fine: resta sospeso per mesi' });
  metti('fiocco', 'fiocco', DATI.fiocco, perMassa(sp.fiocchi, DATI.fiocco, DATI.densitaFiocchi - 1000), { rho: DATI.densitaFiocchi, forma: 'fiocco', sigma: 0.5, perche: 'argilla che il sale ha fatto coagulare' });
  // la polvere delle terre asciutte portata dal vento (polvereDelVento) e, di lei, gli AGGREGATI: due granelli che si sono
  // incontrati per l'agitazione termica (coagulazione browniana, β = 8kT/(3μ): Smoluchowski 1917) nel tempo in cui restano
  // nello strato rimescolato (h/w_s): la parte aggregata è β·n·h/w_s (senza la vita non ci sono la neve marina né i suoi collanti);
  // la coppia ha la massa di due granelli (il diametro della sfera di ugual volume: 2^⅓ d)
  if (sp.polvere > 0 && qui.polvere) { const dP = qui.polvere.dMedio, nP = perMassa(sp.polvere, dP, POLVERE.densita), beta = (8 * KB * Math.max(T, 271)) / (3 * mu), resta = DATI.strato / Math.max(1e-12, stokes(dP, POLVERE.densita, Math.max(T, 271), Math.min(S, 300), g)), parte = Math.min(0.5, beta * nP * resta);
    metti('granello', 'polvere', dP, nP * (1 - parte), { perche: `polvere delle terre asciutte portata dal vento (${(qui.polvere.flusso * 1e3 * ANNO).toPrecision(2)} g/m² all'anno): cade piano, resta mesi`, colore: stato.coloreContinente || COLORE.limo });
    if (parte * nP > 0) metti('granello', 'aggregato', dP * Math.cbrt(2), (parte * nP) / 2, { forma: 'fiocco', perche: `granelli di polvere incontrati per l'agitazione termica: ${(100 * parte).toPrecision(2)}% della polvere`, colore: (stato.coloreContinente || COLORE.limo).map((c) => c * 0.85) }); }
  // i colloidi: sotto il micron la stessa massa in ogni decade di taglia (legge di potenza misurata, Sheldon 1972): tante più quanto più piccole
  metti('colloide', 'colloide', 3e-7, perMassa(sp.argilla, 3e-7, DATI.densitaGrani), { forma: 'lamella', perche: 'troppo piccole per cadere: le tiene sospese l\'agitazione termica' });
  metti('colloide', 'colloide', 3e-8, perMassa(sp.argilla, 3e-8, DATI.densitaGrani), { forma: 'lamella', perche: 'troppo piccole per cadere: le tiene sospese l\'agitazione termica' });
  // i cristalli che nascono qui
  const om = eq.omega, cristallo = (materiale, moliPerKg, vm, d, forma, perche, rhoC) => metti('cristallo', materiale, d, (moliPerKg * kgAcqua * vm) / ((Math.PI * d ** 3) / 6), { rho: rhoC, forma, sigma: 0.3, perche });
  if (om.calcite > soglia.calcite && T < 420) { // quanti germi nascono in un giorno, e quanto calcare hanno da spartirsi
    const x = Math.min(eq.Ca, eq.carbonato) * (1 - soglia.calcite / om.calcite), germi = limita(tassoNascita('calcite', T, om.calcite) * GIORNO, 1e3, 1e13), d = limita(Math.cbrt((6 * x * kgAcqua * 3.69e-5) / (Math.PI * germi)), 3e-7, 3e-5);
    cristallo('calcite', x, 3.69e-5, d, 'rombo', `l'acqua è ${om.calcite.toFixed(1)} volte sovrasatura di calcare (la soglia a cui nasce da solo è ${soglia.calcite.toFixed(1)})`, 2710); note.push('calcare che precipita'); }
  // dove l'acqua evapora ed è satura: il sale prodotto ogni secondo per m² (evaporazione × concentrazione) resta sospeso
  // il tempo di cadere (Stokes): cristalli grossi, pochi
  const evap = qui.tipo === 'mare' ? Math.max(0, (qui.eMenoP || 0) / 1000 / ANNO) : qui.evapora || 0, saturo = (x) => om[x] >= 1 || (qui.precipita && qui.precipita[x === 'soda' ? 'amari' : x] > 0 && (x === 'soda' || om[x] > 0.8)) || (salamoia && salamoia.precipitati[x] > 0);
  for (const [nome, ione, vm, d, forma, rhoC] of [['salgemma', 'Cl', 2.70e-5, 5e-4, 'cubo', 2160], ['gesso', 'S', 7.47e-5, 1.2e-4, 'ago', 2320], ['soda', 'Na', 1.06e-4, 3e-4, 'ago', 2140]]) if (saturo(nome)) {
    const flusso = Math.max(evap, 3e-9) * 1000 * Math.min(tot[ione], nome === 'gesso' ? tot.Ca : tot.Na), cade = Math.max(1e-5, stokes(d, rhoC, Math.max(T, 271), 35, g)), strato = salamoia ? 1 : Math.exp(-qui.profondita / 2) + 0.05;
    cristallo(nome, (flusso / cade / kgAcqua) * strato * (salamoia ? 50 : 1), vm, d, forma, salamoia ? 'nella salamoia tra i cristalli di ghiaccio il sale non ci sta più' : `l'acqua è satura di ${nome}: evaporando lo lascia`, rhoC); note.push(`${nome} che cristallizza`); }
  // il ghiaccio che nasce (frazil): dischetti che salgono; quanto ne nasce lo dice la crescita della lastra (Stefan)
  if (T <= Tgelo + 0.03 && qui.ghiaccio > 0.05 && !salamoia) { const hG = Math.max(0.05, qui.spessoreGhiaccio), cresce = (2.2 * 5) / (917 * 3.34e5 * hG), d = 1e-3; metti('cristallo', 'ghiaccio', d, (cresce * 917) / 0.01 / ((917 * Math.PI * d ** 3) / 6 * 0.1) * Math.exp(-qui.profondita / 5), { rho: 917, forma: 'esagono', perche: 'l\'acqua è al punto di gelo: nascono dischetti di ghiaccio, che salgono' }); note.push('ghiaccio che nasce'); }
  if (salamoia) metti('cristallo', 'ghiaccio', Math.min(2e-3, L * 0.4), (1 - salamoia.parteLiquida) / ((Math.PI * Math.min(2e-3, L * 0.4) ** 3) / 6), { rho: 917, forma: 'esagono', sigma: 0.2, fermo: true, perche: 'la lastra: cristalli di ghiaccio puro, il sale è rimasto fuori' });
  // il «fumo» dei camini: ferro e solfuro, sciolti nel fluido caldo e acido, incontrano l'acqua fredda e precipitano subito
  let fumo = null;
  if (qui.camino && H2S > 0 && ferro > 0) { const aH = Math.pow(10, -eq.pH), HS = (H2S * K.KH2S) / (K.KH2S + aH), qui_ = (eq.gamma['Fe2+'] * ferro * eq.gamma['HS-'] * HS) / (K.sali['solfuro di ferro'] * aH);
    // (il solfuro nasce appena il fluido si mescola, quando è ancora dieci volte più concentrato di qui o più: lì si calcola la sovrasaturazione; poi i granuli viaggiano col pennacchio)
    const p = qui.camino.parteDiFluido, piu = Math.max(1, 0.1 / p), aH1 = Math.min(1e-5, aH * 10), omFeS = Math.max(qui_, (eq.gamma['Fe2+'] * ferro * piu * eq.gamma['HS-'] * ((H2S * piu * K.KH2S) / (K.KH2S + aH1))) / (K.sali['solfuro di ferro'] * aH1)); fumo = { omega: omFeS, qui: qui_, pH: eq.pH };
    if (omFeS > 1) { const x = Math.min(ferro, H2S) * (1 - 1 / Math.sqrt(omFeS)), germi = limita(tassoNascita('solfuro di ferro', T, omFeS) * 1, 1e9, 1e17), d = limita(Math.cbrt((6 * x * kgAcqua * 1.82e-5) / (Math.PI * germi)), 3e-8, 3e-6);
      cristallo('solfuro di ferro', x, 1.82e-5, d, 'granello', `il ferro e il solfuro del camino, ${omFeS.toExponential(0)} volte oltre la solubilità nell'acqua fredda`, 4840); note.push('fumo nero'); }
    if (stato.pO2 > 1e-6) metti('colloide', 'ruggine', 1e-7, perMassa(ferro * kgAcqua * 0.0558 * 0.3, 1e-7, 3800), { perche: 'il ferro sciolto incontra l\'ossigeno: ruggine' }); }
  // le bolle: sotto le creste che frangono (copertura misurata in funzione del vento); più giù la pressione le schiaccia e le scioglie
  if (qui.tipo !== 'piana di sale' && qui.vento > DATI.ventoCheFrange && qui.profondita < 12 * DATI.profonditaBolle && !(qui.ghiaccio > 0.8)) { const creste = 3.84e-6 * Math.pow(qui.vento, 3.41); metti('bolla', 'bolla', 1e-4, DATI.bolle * creste * Math.exp(-qui.profondita / DATI.profonditaBolle), { rho: 1.2, forma: 'bolla', sigma: 0.7, perche: `aria trascinata sotto dalle onde che frangono (vento ${qui.vento.toFixed(0)} m/s)` }); }
  // la pomice: vicino a un vulcano, in superficie, se di recente ha eruttato (un evento di quel vulcano)
  if (qui.vulcano && qui.profondita < 0.5) { const recente = c0evento(stato, `vulcano ${gradi(qui.vulcano.lon, 2)}/${gradi(qui.vulcano.lat, 2)}/ha eruttato da poco`) < 0.35; if (recente) { metti('granello', 'pomice', 6e-3, 40 * Math.exp(-qui.vulcano.distanzaM / 2e5), { rho: 700, forma: 'pomice', sigma: 0.6, perche: 'lava piena di bolle: galleggia, e la corrente la porta via dal vulcano' }); note.push('pomice che galleggia'); } }
  // --- GLI IONI E LE MOLECOLE (numeri veri): moli per kg d'acqua × kg d'acqua per m³ × numero di Avogadro
  const nomi = nomiIoni(tot, eq), ioni = {}, perM3 = (m) => m * kgAcqua * NA, acquaPerM3 = (kgAcqua / MOLARE_ACQUA) * NA;
  nomi['H+'] = eq.liberi['H+']; nomi['OH-'] = eq.liberi['OH-']; if (ferro > (tot.Fe || 0)) nomi['Fe2+'] = ferro;
  for (const f in nomi) if (nomi[f] > 0) ioni[f] = { moliPerKg: nomi[f], perM3: perM3(nomi[f]), nelCampione: perM3(nomi[f]) * V, ogniQuanteMolecoleDAcqua: 55.51 / nomi[f] };
  const fT = (T / 298.15) * (8.9e-4 / mu); // la diffusione degli ioni scala come T/μ (Stokes-Einstein)
  for (const f in nomi) { if (!IONI[f] || !(nomi[f] > 0)) continue; const x = IONI[f], libero = eq.liberi[f] ?? nomi[f];
    metti('ione', f, 2 * x[6] * 1e-10, perM3(libero), { forma: 'ione', sigma: 0, rho: rho, carica: x[2], guscio: x[7], raggioGuscioM: (x[6] + 2.76) * 1e-10, D: x[5] * 1e-9 * fT, perche: `sciolto: lo circondano ${x[7]} molecole d'acqua, girate verso di lui` }); }
  // le coppie: quante ce ne sono in ogni istante (equilibrio) e quanto durano (si incontrano per diffusione, Smoluchowski: k = 4π·N·D·a; si lasciano k/K volte al secondo)
  const coppie = {};
  for (const nome in eq.coppie) { const [ca, an] = nome.split(' '), a = (IONI[ca][6] + IONI[an][6] + (ca === 'Mg2+' ? 2.76 : 0)) * 1e-10, kIncontro = 4 * Math.PI * NA * (IONI[ca][5] + IONI[an][5]) * 1e-9 * fT * a * 1000, vita = coppia(ca, an, T) / kIncontro;
    coppie[nome] = { moliPerKg: eq.coppie[nome], perM3: perM3(eq.coppie[nome]), nelCampione: perM3(eq.coppie[nome]) * V, parteDelCatione: eq.coppie[nome] / Math.max(1e-30, nomi[ca]), vitaS: vita };
    metti('coppia', nome, 2 * a, perM3(eq.coppie[nome]), { forma: 'coppia', sigma: 0, rho, vitaS: vita, D: 0.5 * (IONI[ca][5] + IONI[an][5]) * 0.5e-9 * fT, perche: 'due ioni di segno opposto a contatto: restano insieme un istante, poi l\'agitazione li separa' }); }
  { const kNaCl = coppia('Na+', 'Cl-', T) * eq.gamma['Na+'] * eq.gamma['Cl-'] * (tot.Na || 0) * (tot.Cl || 0); if (kNaCl > 0) coppie['Na+ Cl- (incontri)'] = { moliPerKg: kNaCl, perM3: perM3(kNaCl), nelCampione: perM3(kNaCl) * V, parteDelCatione: kNaCl / tot.Na, vitaS: coppia('Na+', 'Cl-', T) / (4 * Math.PI * NA * 3.36e-9 * fT * 2.83e-10 * 1000) }; }
  for (const f in gas) metti('molecola', f, 3.5e-10, perM3(gas[f]), { forma: 'gas', sigma: 0, rho, colore: COLORE.gas, D: 2e-9 * fT, perche: 'gas dell\'aria sciolto (legge di Henry)' });
  metti('molecola', 'acqua', 2.8e-10, acquaPerM3, { forma: 'acqua', sigma: 0, rho, D: 2.3e-9 * fT, perche: 'le molecole d\'acqua: si urtano e si scambiano di posto ogni pochi picosecondi' });
  // --- CHE COSA SI VEDE A QUESTA SCALA (principio della nebbia): di ogni classe il numero vero nel campione; se ne
  // disegnano al più «massimo»: un campione rappresentativo. Ciò che è troppo piccolo per distinguersi è un velo
  // (lo si conta lo stesso); ciò che è più grande del campo non c'entra.
  const particelle = [], velo = [], fuoriScala = [], quanteDavvero = {}, visibili = [], contati = {};
  for (const cl of classi) { const N = cl.n * V, chiave = cl.materiale; quanteDavvero[chiave] = (quanteDavvero[chiave] || 0) + N;
    if (cl.d > 0.8 * L) { if (N > 0.05) fuoriScala.push({ tipo: cl.tipo, materiale: cl.materiale, diametroM: cl.d, perM3: cl.n, perche: cl.perche }); continue; }
    if (cl.d < L / 500) { velo.push({ tipo: cl.tipo, materiale: cl.materiale, diametroM: cl.d, perM3: cl.n, quanteDavvero: N, perche: cl.perche }); continue; }
    visibili.push({ cl, N }); }
  // (la parte di ogni classe nel campione disegnato cresce come la radice del suo numero: i rari si vedono, i tanti dominano)
  const pesi = visibili.reduce((a, x) => a + Math.sqrt(Math.max(x.N, 1e-9)), 0);
  visibili.forEach(({ cl, N }, q) => { const veri = contaEvento(c, `quante/${cl.tipo}/${cl.materiale}/${q}`, N), nd = Math.min(veri, Math.max(3, Math.round((massimo * Math.sqrt(Math.max(N, 1e-9))) / pesi))), bw = browniano(cl.d, T, S, cl.rho);
    const D = cl.D ?? bw.D, cade = cl.fermo || cl.tipo === 'ione' || cl.tipo === 'coppia' || cl.tipo === 'molecola' || cl.tipo === 'colloide' ? 0 : -stokes(cl.d, cl.rho, Math.max(271, Math.min(T, 373)), Math.min(S, 300), g);
    for (let i = 0; i < nd; i++) { const a = `p/${q}/${i}`, d = cl.sigma ? cl.d * Math.exp(cl.sigma * c.normale(`${a}/taglia`)) : cl.d, k = (d / cl.d) ** 2;
      particelle.push({ tipo: cl.tipo, materiale: cl.materiale, diametroM: d, pos: [c(`${a}/x`), c(`${a}/y`), c(`${a}/z`)], vel: [0, 0, cade * k], D: D / (cl.sigma ? d / cl.d : 1), forma: cl.forma, colore: cl.colore, angolo: c(`${a}/giro`) * Math.PI,
        rappresenta: veri / nd, fermo: !!cl.fermo, indirizzo: a, ...(cl.carica != null ? { carica: cl.carica, guscio: cl.guscio, raggioGuscioM: cl.raggioGuscioM } : {}), ...(cl.vitaS ? { vitaS: cl.vitaS } : {}) }); }
    cl.veri = veri; cl.disegnate = nd; contati[cl.materiale] = (contati[cl.materiale] || 0) + veri; });
  // i tempi propri di questa scala: in quanto la particella tipica attraversa il campo per agitazione termica
  let Dtip = 0, nT = 0; for (const p of particelle) if (!p.fermo) { Dtip += Math.log(p.D); nT++; } Dtip = nT ? Math.exp(Dtip / nT) : KB * T / (3 * Math.PI * mu * Math.max(L / 100, 1e-10));
  const corrente = salamoia ? { u: 0, v: 0, w: 0, velocita: 0 } : { u: qui.u || 0, v: qui.v || 0, w: qui.w || 0, velocita: Math.hypot(qui.u || 0, qui.v || 0) };
  const out = { asciutto: false, tipo: qui.tipo, lon, lat, profondita: qui.profondita, fondoM: qui.fondoM, latoM: L, t, T, salinita: S, pH: eq.pH, densita: rho, viscosita: mu, pressione: stato.pressioneAria + rho * g * qui.profondita, congelaA: Tgelo,
    corrente, tempoAttraversamento: (L * L) / (2 * Dtip), tempoCorrente: corrente.velocita > 0 ? L / corrente.velocita : Infinity,
    ioni, coppie, gas: Object.fromEntries(Object.entries(gas).map(([f, m]) => [f, { moliPerKg: m, perM3: perM3(m), nelCampione: perM3(m) * V }])), acquaNelCampione: acquaPerM3 * V, acquaPerM3,
    ioniPerMolecolaDAcqua: moliIoni / 55.51, saturazione: { ...om, 'solfuro di ferro': fumo ? fumo.omega : 0 }, soglie: soglia,
    particelle, cristalli: particelle.filter((p) => p.tipo === 'cristallo'), bolle: particelle.filter((p) => p.tipo === 'bolla'), velo, fuoriScala, quanteDavvero, contati, nuclei: nucleiDi(nomi, acquaPerM3, perM3, V),
    classi: classi.map((x) => ({ tipo: x.tipo, materiale: x.materiale, diametroM: x.d, perM3: x.n, perche: x.perche })), sospeso: { ...qui.sospeso }, torbidita: qui.sospeso.sabbia + qui.sospeso.limo + qui.sospeso.argilla + qui.sospeso.fiocchi + (qui.sospeso.polvere || 0),
    luogo: { foce: qui.foce, camino: qui.camino ? { id: qui.camino.id, distanzaM: qui.camino.distanzaM, parteDiFluido: qui.camino.parteDiFluido, T: qui.camino.T } : null, vulcano: qui.vulcano, ghiaccio: qui.ghiaccio, vento: qui.vento, lago: qui.lago ? qui.lago.id : null, salamoia },
    luce: stato.luce || [1, 1, 1], coloreFondale: stato.coloreContinente ? stato.coloreContinente.map((v, i) => 0.5 * (v + OTTICA.sabbia[i])) : OTTICA.sabbia, radice: c.radice, rami: c.rami || null };
  out.descrizione = descrivi(out, qui, note, stato);
  return out;
}
const somma = (t) => (t.Na || 0) + (t.K || 0) + (t.Mg || 0) + (t.Ca || 0) + (t.Cl || 0) + (t.S || 0);
// I NUCLEI che ci sono lì (per chi scende sotto l'atomo): gli isotopi naturali di ogni elemento (abbondanze misurate) e,
// per quelli instabili, quanti ne decadono: il potassio-40 (0,0117% del potassio, tempo di dimezzamento 1,248 miliardi
// di anni: 89% β⁻ verso il calcio-40, 11% cattura elettronica verso l'argo-40) fa dell'acqua di mare terrestre una
// sorgente di ~12 decadimenti al secondo per chilo. → { isotopo: { perM3, nelCampione } }, decadimenti: { … al secondo }
const ISOTOPI = { H: [[1, 0.999844], [2, 1.56e-4]], O: [[16, 0.99757], [17, 3.8e-4], [18, 2.05e-3]], Na: [[23, 1]], Mg: [[24, 0.79], [25, 0.1], [26, 0.11]], S: [[32, 0.9499], [33, 0.0075], [34, 0.0425]], Cl: [[35, 0.7576], [37, 0.2424]],
  K: [[39, 0.932581], [40, 1.17e-4], [41, 0.067302]], Ca: [[40, 0.96941], [42, 0.00647], [44, 0.02086]], C: [[12, 0.9893], [13, 0.0107]], Fe: [[54, 0.05845], [56, 0.91754], [57, 0.02119]], Si: [[28, 0.92223], [29, 0.04685], [30, 0.03092]] };
function nucleiDi(nomi, acquaPerM3, perM3, V) {
  const el = { H: 2 * acquaPerM3 + perM3((nomi['HCO3-'] || 0) + 4 * (nomi.H4SiO4 || 0)), O: acquaPerM3 + perM3(4 * (nomi['SO4(2-)'] || 0) + 3 * ((nomi['HCO3-'] || 0) + (nomi['CO3(2-)'] || 0)) + 4 * (nomi.H4SiO4 || 0)), Na: perM3(nomi['Na+'] || 0), Mg: perM3(nomi['Mg2+'] || 0), S: perM3(nomi['SO4(2-)'] || 0),
    Cl: perM3(nomi['Cl-'] || 0), K: perM3(nomi['K+'] || 0), Ca: perM3(nomi['Ca2+'] || 0), C: perM3((nomi['HCO3-'] || 0) + (nomi['CO3(2-)'] || 0)), Fe: perM3(nomi['Fe2+'] || 0), Si: perM3(nomi.H4SiO4 || 0) }, out = { isotopi: {}, decadimenti: {} };
  for (const e in el) for (const [A, f] of ISOTOPI[e]) if (el[e] * f > 0) out.isotopi[`${e}-${A}`] = { perM3: el[e] * f, nelCampione: el[e] * f * V };
  const k40 = el.K * 1.17e-4, lambda = Math.LN2 / (1.248e9 * ANNO); out.decadimenti['K-40'] = { perM3alSecondo: k40 * lambda, nelCampioneAlSecondo: k40 * lambda * V, verso: { 'Ca-40 (β⁻, 1,31 MeV)': 0.8928, 'Ar-40 (cattura elettronica, γ 1,46 MeV)': 0.1072 } };
  return out;
}
const c0evento = (stato, indirizzo) => sorgente(stato.radice)(indirizzo);
const fmtN = (x) => (x < 1 ? x.toPrecision(1) : x < 1e3 ? Math.round(x).toString() : x < 1e6 ? `${Math.round(x / 1e3)} mila` : x < 1e9 ? `${(x / 1e6).toFixed(0)} milioni` : x < 1e12 ? `${(x / 1e9).toFixed(0)} miliardi` : `10^${Math.round(Math.log10(x))}`);
const fmtL = (m) => (m >= 1 ? `${+m.toPrecision(2)} m` : m >= 1e-3 ? `${+(m * 1e3).toPrecision(2)} mm` : m >= 1e-6 ? `${+(m * 1e6).toPrecision(2)} µm` : `${+(m * 1e9).toPrecision(2)} nm`);
const NOMI_IONI = { 'Na+': 'sodio', 'K+': 'potassio', 'Mg2+': 'magnesio', 'Ca2+': 'calcio', 'Fe2+': 'ferro', 'Cl-': 'cloruro', 'SO4(2-)': 'solfato', 'HCO3-': 'bicarbonato', 'CO3(2-)': 'carbonato' };
const PLURALI = { sabbia: 'granelli di sabbia', limo: 'granelli di limo', argilla: 'granelli d\'argilla', fiocco: 'fiocchi d\'argilla', colloide: 'particelle colloidali', calcite: 'cristalli di calcite', gesso: 'aghi di gesso', salgemma: 'cubi di salgemma', soda: 'cristalli di soda',
  ghiaccio: 'cristalli di ghiaccio', 'solfuro di ferro': 'granuli di solfuro di ferro (il fumo nero)', ruggine: 'fiocchi di ruggine', bolla: 'bolle', pomice: 'frammenti di pomice', acqua: 'molecole d\'acqua' };
// una frase: che cosa si sta guardando, e perché qui è così
function descrivi(o, qui, note, stato) {
  const dove = qui.tipo === 'mare' ? (o.luogo.salamoia ? 'dentro il ghiaccio marino, in una sacca di salamoia' : qui.camino ? `sul fondo, a ${fmtL(qui.camino.distanzaM)} da un camino caldo (${Math.round(qui.camino.T - 273)} °C all'uscita)` : qui.foce && qui.foce.parteDiFiume > 0.02 ? `alla foce di un fiume (a ${Math.round(qui.foce.distanzaM / 1000)} km: ${(100 * qui.foce.parteDiFiume).toFixed(0)}% acqua dolce)` : qui.fondoM < 60 ? 'mare basso' : 'mare aperto')
    : qui.tipo === 'piana di sale' ? 'una pozza di salamoia su una piana di sale' : qui.lago ? (qui.lago.tipo === 'aperto' ? 'lago con emissario' : 'lago chiuso') : 'acqua dolce';
  const quota = o.profondita < 1e-6 ? 'in superficie' : `${fmtL(o.profondita)} sotto la superficie`, L = o.latoM, sale = `${o.salinita < 1 ? o.salinita.toFixed(2) : o.salinita.toFixed(0)} g di sali per kg`, cosa = [];
  if (L <= 1.2e-7) { const due = Object.entries(o.ioni).filter(([f]) => NOMI_IONI[f]).sort((a, b) => b[1].moliPerKg - a[1].moliPerKg).slice(0, 2);
    cosa.push(`${fmtN(o.acquaNelCampione)} molecole d'acqua` + (due.length === 2 ? `, ${fmtN(due[0][1].nelCampione)} ioni ${NOMI_IONI[due[0][0]]} e ${fmtN(due[1][1].nelCampione)} ${NOMI_IONI[due[1][0]]} (uno ogni ${Math.round(due[0][1].ogniQuanteMolecoleDAcqua)} e ogni ${Math.round(due[1][1].ogniQuanteMolecoleDAcqua)} molecole), ciascuno nel suo guscio d'acqua` : '')); }
  else { const viste = Object.entries(o.quanteDavvero).filter(([m, n]) => n >= 0.5 && o.particelle.some((p) => p.materiale === m)).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([m, n]) => `${fmtN(n)} ${PLURALI[m] || m}`);
    const opaca = o.torbidita * 1000 * 0.5 * L; // (quanta luce si perde attraversando il cubetto: 0,5 m² per grammo di fango)
    cosa.push(viste.length ? `in questo cubetto: ${viste.join(', ')}` : opaca > 0.1 ? 'acqua velata da particelle troppo piccole per distinguerle a questa scala' : 'acqua limpida: a questa scala non c\'è nulla di sospeso che si distingua'); }
  const perche = note.length ? ` Qui: ${note.join(', ')}.` : qui.tipo === 'mare' && !qui.foce?.parteDiFiume ? ' Lontano dai fiumi il fango è già caduto.' : '';
  return `${dove[0].toUpperCase()}${dove.slice(1)}, ${quota}, ${(o.T - ZERO_CELSIUS).toFixed(1)} °C, ${sale}, pH ${o.pH.toFixed(1)}; cubetto di ${fmtL(L)}: ${cosa.join('; ')}.${perche}` +
    (o.corrente.velocita > 0.005 ? ` La corrente lo porta a ${(100 * o.corrente.velocita).toFixed(0)} cm/s.` : '');
}

// COME SI MUOVONO: la posizione di ogni particella al tempo t (secondi), in unità del lato (0…1, il cubetto si richiude
// sui bordi). Il cubetto viaggia con la corrente; rispetto all'acqua ogni particella cade o sale (Stokes) e vaga
// (moto browniano: spostamento quadratico medio 2·D·t per asse). Il moto browniano è ricostruito come somma di
// armoniche con ampiezze dall'evento della particella (serie di Paley-Wiener: ampiezza ∝ 1/frequenza; le prime 16 una
// per una, poi a bande sempre più larghe fino a 20 000): è una funzione di t, uguale ogni volta.
// «periodo»: dopo quanto la traiettoria si richiude (per default 64 volte il tempo di attraversamento).
const ampiezze = new WeakMap(), MODI = (() => { const m = []; for (let k = 1; k <= 16; k++) m.push(k); let x = 16; while (x < 20000) { x = Math.ceil(x * 1.35); m.push(x); } const peso = m.map((k, i) => { const fine = i + 1 < m.length ? m[i + 1] : Math.ceil(k * 1.35); let w = 0; for (let q = k; q < fine; q++) w += 1 / (q * q); return Math.sqrt(w); }); return { m, peso }; })();
export function muovi(campione, t, periodo = null) {
  const P = campione.particelle || [], out = new Float32Array(P.length * 3), Tp = periodo || 64 * campione.tempoAttraversamento, L = campione.latoM, M = MODI.m.length;
  let amp = ampiezze.get(campione); // (gli esiti degli eventi si leggono una volta sola per campione)
  if (!amp) { const c = sorgente(campione.radice, campione.rami); amp = new Float32Array(P.length * 3 * M * 2); for (let i = 0; i < P.length; i++) for (let a = 0; a < 3; a++) for (let m = 0; m < M; m++) { const o = ((i * 3 + a) * M + m) * 2; amp[o] = c.normale(`${P[i].indirizzo}/b${a}/${m}s`); amp[o + 1] = c.normale(`${P[i].indirizzo}/b${a}/${m}c`); } ampiezze.set(campione, amp); }
  const si = new Float64Array(M), co = new Float64Array(M); for (let m = 0; m < M; m++) { const w = (2 * Math.PI * MODI.m[m] * t) / Tp; si[m] = MODI.peso[m] * Math.sin(w); co[m] = MODI.peso[m] * (Math.cos(w) - 1); }
  for (let i = 0; i < P.length; i++) { const p = P[i];
    for (let a = 0; a < 3; a++) { let x = p.pos[a];
      if (!p.fermo) { x += (p.vel[a] * t) / L; const A = Math.sqrt(p.D * Tp) / Math.PI / L, o0 = (i * 3 + a) * M * 2; let b = 0;
        for (let m = 0; m < M; m++) b += amp[o0 + 2 * m] * si[m] + amp[o0 + 2 * m + 1] * co[m];
        x += A * b; }
      out[i * 3 + a] = x - Math.floor(x); } }
  return out;
}
// UNA LISTA DISEGNABILE: ogni particella con la posizione al tempo t e il raggio in unità del lato
export function disegnabili(campione, t = campione.t || 0) { const pos = muovi(campione, t); return (campione.particelle || []).map((p, i) => ({ x: pos[i * 3], y: pos[i * 3 + 1], z: pos[i * 3 + 2], r: p.diametroM / (2 * campione.latoM), forma: p.forma, colore: p.colore, materiale: p.materiale, angolo: p.angolo, guscio: p.raggioGuscioM ? p.raggioGuscioM / campione.latoM : 0, carica: p.carica ?? 0 })); }
// UN'IMMAGINE RGBA N×N del campione al tempo t (come immagine() di rocce.js): l'acqua vista da dentro, in controluce.
// Lo sfondo è l'acqua (più torbida, più bruna); le particelle più lontane sono più scure; ogni forma è quella del cristallo.
export function immagineAcqua(campione, { N = 192, t = campione.t || 0 } = {}) {
  const px = new Uint8ClampedArray(N * N * 4), sp = campione.sospeso || {}, C = 1000 * ((sp.sabbia || 0) + (sp.limo || 0) + (sp.argilla || 0) + (sp.fiocchi || 0)), L = campione.latoM || 1;
  const nano = L <= 1.2e-7;
  if (campione.asciutto || nano) { const f0 = campione.asciutto ? [60, 52, 44] : [8, 14, 30]; for (let k = 0; k < N * N; k++) { const y = Math.floor(k / N) / N; px[k * 4] = f0[0] * (1.15 - 0.3 * y); px[k * 4 + 1] = f0[1] * (1.15 - 0.3 * y); px[k * 4 + 2] = f0[2] * (1.15 - 0.3 * y); px[k * 4 + 3] = 255; } }
  else {
    // L'ACQUA VISTA DA DENTRO, di lato. Il colore è quello della luce che l'acqua di quel punto rimanda (la stessa ottica
    // del mare visto da sopra: blu dove è limpida, verde e bruna col fango), e si spegne scendendo come exp(−K·z), il
    // rosso per primo. In alto, se il cubetto arriva alla superficie, si vede la superficie mossa e l'aria; in basso, se
    // arriva al fondo, il fondo. Vicino alla superficie la luce arriva a fasci che ondeggiano (le onde corte sopra fanno
    // da lenti: le caustiche). Tutto è funzione del punto e del tempo: lo stesso istante dà la stessa immagine.
    const luce = campione.luce || [1, 1, 1], z0 = Math.max(0, campione.profondita - L / 2), fondo = campione.fondoM ?? 1e9, K = [0, 0, 0], col = [0, 0, 0], sup = campione.profondita < L / 2 && campione.tipo !== 'piana di sale';
    for (let i = 0; i < 3; i++) { const a = OTTICA.acqua[i] + OTTICA.fango[i] * 1e-3 * C, b = OTTICA.indietro[i] + OTTICA.fangoIndietro * 1e-3 * C; K[i] = a + b; col[i] = luce[i] * Math.pow(Math.min(1, 14 * ((0.33 * b) / (a + b) + 0.004)), 1 / 2.2); }
    const seme = numero(campione.radice || 'acqua'), fa = (n) => ((seme >>> (n * 5)) & 31) / 31 * 6.283, onda = (x, tt) => 0.045 * Math.sin((x / 0.3) * 6.283 + fa(0) - 4.5 * tt) + 0.02 * Math.sin((x / 0.11) * 6.283 + fa(1) - 7.5 * tt) + 0.008 * Math.sin((x / 0.045) * 6.283 + fa(2) - 11.7 * tt);
    const vento = campione.luogo?.vento ?? 3, mosso = Math.min(1.5, vento / 6), cf = campione.coloreFondale || OTTICA.sabbia;
    for (let ix = 0; ix < N; ix++) { const x = (ix / N) * L, eta = sup ? Math.max(-0.3 * L, Math.min(0.3 * L, mosso * onda(x, t))) : 0, ySup = sup ? Math.round((0.18 * L - eta) / L * N) : -1;
      // la luce che arriva in questa colonna: più dove la superficie sopra fa da lente convergente
      const lente = 1 + 0.5 * mosso * (Math.sin((x / 0.3) * 6.283 + fa(0) - 4.5 * t) * 0.5 + Math.sin((x / 0.11) * 6.283 + fa(1) - 7.5 * t) * 0.35 + Math.sin((x / 0.045) * 6.283 + fa(2) - 11.7 * t) * 0.15) * (L > 0.004 ? 1 : 0);
      for (let iy = 0; iy < N; iy++) { const o = (iy * N + ix) * 4, z = z0 + Math.max(0, (iy - Math.max(ySup, 0)) / N) * L; px[o + 3] = 255;
        if (iy < ySup) { px[o] = 178 + 30 * (iy / N); px[o + 1] = 205 + 20 * (iy / N); px[o + 2] = 236; continue; } // l'aria sopra
        const fasci = 1 + (lente - 1) * Math.exp(-z / 8), bordo = sup && iy - ySup < 2 ? 1.5 : 1;
        if (z > fondo) { const g = 0.75 + 0.5 * (((ix * 73856093) ^ (iy * 19349663)) >>> 0) % 97 / 97; for (let i = 0; i < 3; i++) px[o + i] = Math.min(255, cf[i] * g * Math.min(1.2, 0.35 + Math.exp(-K[i] * Math.min(fondo, 60)) * fasci * luce[i])); continue; } // il fondo, coi suoi granelli
        for (let i = 0; i < 3; i++) px[o + i] = Math.min(255, 255 * col[i] * (0.12 + 0.88 * Math.exp(-K[i] * z)) * fasci * bordo); } }
  }
  if (campione.asciutto) return px;
  const lista = disegnabili(campione, t).sort((a, b) => a.z - b.z);
  const punto = (x, y, col, a) => { if (x < 0 || y < 0 || x >= N || y >= N || !(a > 0)) return; const o = (y * N + x) * 4; px[o] += (col[0] - px[o]) * a; px[o + 1] += (col[1] - px[o + 1]) * a; px[o + 2] += (col[2] - px[o + 2]) * a; };
  for (const p of lista) { const cx = p.x * N, cy = (1 - p.y) * N, r = Math.max(0.7, p.r * N), luce = 0.55 + 0.45 * p.z, col = p.colore.map((v) => v * luce), R = Math.ceil(r * (p.forma === 'ago' ? 3.2 : p.guscio ? Math.max(1.6, (p.guscio * N) / r) : 1.6)) + 1, co = Math.cos(p.angolo || 0), si = Math.sin(p.angolo || 0);
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const X = dx * co + dy * si, Y = -dx * si + dy * co, d = Math.hypot(dx, dy); let a = 0, tinta = col;
      if (p.forma === 'cubo') a = Math.max(Math.abs(X), Math.abs(Y)) <= r ? 1 : 0;
      else if (p.forma === 'rombo') a = Math.abs(X) + 0.7 * Math.abs(Y) <= r ? 1 : 0;
      else if (p.forma === 'ago') a = Math.abs(X) <= 3 * r && Math.abs(Y) <= Math.max(0.6, 0.3 * r) ? 1 : 0;
      else if (p.forma === 'esagono') a = Math.max(Math.abs(X), 0.5 * Math.abs(X) + 0.866 * Math.abs(Y)) <= r ? 0.75 : 0;
      else if (p.forma === 'lamella') a = (X / r) ** 2 + (Y / (0.55 * r)) ** 2 <= 1 ? 1 : 0;
      else if (p.forma === 'bolla') a = d <= r ? (d > 0.72 * r ? 0.9 : X < -0.2 * r && Y < -0.2 * r && d < 0.6 * r ? 0.8 : 0.12) : 0;
      else if (p.forma === 'fiocco' || p.forma === 'pomice') a = d <= r * (0.75 + 0.25 * Math.sin(5 * Math.atan2(dy, dx) + 7 * (p.angolo || 0))) ? (p.forma === 'pomice' && (Math.round(X * 1.3) + Math.round(Y * 1.3)) % 3 === 0 ? 0.5 : 0.92) : 0;
      else if (p.forma === 'acqua') { a = d <= r ? 1 : 0; if (!a) { const hx = 0.8 * r, hy = 0.62 * r; if (Math.hypot(X - hx, Y - hy) <= 0.55 * r || Math.hypot(X + hx, Y - hy) <= 0.55 * r) { a = 1; tinta = [236 * luce, 236 * luce, 236 * luce]; } } a *= 0.55; }
      else if (p.forma === 'ione') { if (d <= r) a = 1; else if (p.guscio && Math.abs(d - p.guscio * N) <= Math.max(0.5, 0.12 * r)) { a = 0.5; tinta = p.carica > 0 ? [226, 64, 56] : [236, 236, 236]; } }
      else if (p.forma === 'coppia') a = Math.hypot(X - 0.5 * r, Y) <= 0.55 * r || Math.hypot(X + 0.5 * r, Y) <= 0.55 * r ? 1 : 0;
      else a = d <= r ? 1 : d <= r + 1 ? r + 1 - d : 0;
      punto(Math.round(cx) + dx, Math.round(cy) + dy, tinta, a); } }
  return px;
}

// ---------- 7. L'ASPETTO DEL MARE VISTO DA SOPRA, A OGNI SCALA
// IL COLORE. La luce che torna su da un'acqua profonda è R = 0,33·b/(a + b) in ogni colore (Gordon e altri 1975): a ciò
// che l'acqua e ciò che contiene assorbono, b ciò che rimandano indietro. L'acqua pura assorbe il rosso cento volte più
// del blu (Pope e Fry 1997): per questo il mare limpido e profondo è blu scuro. Il fango rimanda luce in tutti i colori
// e assorbe il blu: bruno, e verde dove ce n'è poco. Il ferro sciolto (nei mari senza ossigeno) assorbe il rosso: verde.
// Dove il fondo è vicino si vede il fondo, attraverso due volte lo spessore dell'acqua (in acqua torbida no: è la
// profondità di Secchi): sabbia chiara, fango, roccia vulcanica scura, carbonati bianchi dove il mare caldo li deposita.
// La luce è quella della STELLA di quel pianeta (stato.luce): sotto una nana rossa c'è poco blu da rimandare, e il mare è
// più scuro e più verde-bruno. Sopra: il ghiaccio, le croste di sale.
const OTTICA = { acqua: [0.34, 0.0565, 0.0092], indietro: [0.0005, 0.00097, 0.00225], fango: [8, 20, 50], fangoIndietro: 12, ferro: [70, 12, 5], cielo: [0.008, 0.012, 0.018], esposizione: 3.5,
  sabbia: [214, 200, 172], carbonato: [238, 234, 218] }; // (assorbimento 1/m; fango per g/m³·10³; ferro per mol/kg; colori dei sedimenti)
const SALE = [240, 236, 228], GHIACCIO = [232, 238, 244], SCHIUMA = [246, 248, 250];
const rumoreH = (ix, iy, seme) => { let h = (ix * 374761393 + iy * 668265263 + seme * 1274126177) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const rumore2 = (x, y, seme) => { const x0 = Math.floor(x), y0 = Math.floor(y), u = x - x0, v = y - y0, su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v); return (rumoreH(x0, y0, seme) * (1 - su) + rumoreH(x0 + 1, y0, seme) * su) * (1 - sv) + (rumoreH(x0, y0 + 1, seme) * (1 - su) + rumoreH(x0 + 1, y0 + 1, seme) * su) * sv; };
// il colore in un punto → scrive in c [r, g, b] (0…255); falso se lì è terra. «scalaM»: quanti metri vale un punto
// dell'immagine (sotto i 30 km i VORTICI, che la griglia delle correnti non risolve, si vedono in ciò che l'acqua
// porta: il fango è spostato da vortici grandi come il raggio di Rossby del mare, raggioVortici; è una chiusura
// dichiarata: la loro forma viene da un rumore fisso del luogo, la loro taglia e dove c'è fango da spostare no);
// «ombra»: il rilievo del fondo (1 = piano).
function ottica(stato, lon, lat, d0, forzata, scalaM, ombra, c) {
  const F = stato.fine, k = cellaFine(stato, lon, lat); let tipo = F.tipo[k]; if (tipo === 0 && forzata) tipo = 1; if (tipo === 0) return false;
  if (tipo === 4) { c[0] = SALE[0]; c[1] = SALE[1]; c[2] = SALE[2]; return true; }
  const L = F.lago[k] >= 0 ? stato.laghi[F.lago[k]] : null, d = d0 ?? F.fondo[k], luce = stato.luce || [1, 1, 1], x = ((lon + 180) / 360) * F.W - 0.5, y = ((90 - lat) / 180) * F.H - 0.5;
  let C = 0, bianco = 0, dx = 0, dy = 0; // (g/m³ di fango sospeso; g/m³ di calcare appena nato, bianco)
  if (tipo === 1) { if (scalaM > 0 && scalaM < 3e4) { const u = (stato.raggioVortici || 4e4) / ((2 * Math.PI * stato.raggioM) / F.W), fx = x / (2.5 * u), fy = y / (2.5 * u); dx = 3 * u * (rumore2(fx, fy, 11) + 0.5 * rumore2(2.3 * fx, 2.3 * fy, 12) - 0.75); dy = 3 * u * (rumore2(fx, fy, 21) + 0.5 * rumore2(2.3 * fx, 2.3 * fy, 22) - 0.75); }
    C = 1000 * Math.max(0, bil(F.torbida, F.W, F.H, x + dx, y + dy));
    // dove l'acqua calda supera la soglia il calcare nasce in cristalli minuti che restano sospesi qualche giorno: l'acqua
    // diventa lattiginosa e turchese (sulla Terra: i «whitings» delle Bahamas). Quanto: un decimo del carbonato in eccesso
    if (stato.saturazione) { const om = bil(stato.saturazione.calcite, stato.W, stato.H, ((x + dx + 0.5) / F.W) * stato.W - 0.5, ((y + dy + 0.5) / F.H) * stato.H - 0.5), sg = stato.soglia || 20; if (om > sg) bianco = 0.1 * 1e5 * (stato.ioni['CO3(2-)'] || 0) * (1 - sg / om); } }
  else C = 1000 * (L && L.tipo === 'aperto' ? 0.02 * stato.fiume.sospeso : 0.002);
  const Fe = tipo === 1 ? stato.totali.Fe || 0 : 0, bacino = tipo === 1 && F.bacino && F.bacino[k] >= 0 ? stato.bacini[F.bacino[k]] : null;
  // il fondo: fango dove i fiumi depositano, roccia scura sui fondali vulcanici, sabbia dei continenti; carbonato bianco nei mari caldi e bassi dove il calcare precipita
  const tf = F.fondale ? F.fondale[k] : 0, calc = tipo === 1 && d < 60 && stato.saturazione && campo(stato, stato.saturazione.calcite, lon, lat) > 1.05 * (stato.soglia || 20);
  const cf = calc ? OTTICA.carbonato : tf === 1 ? stato.coloreFondo : tf === 2 ? stato.coloreContinente : OTTICA.sabbia, mf = calc ? 1 : tf === 2 ? 0.55 : tf === 0 ? 0.5 : 1;
  for (let i = 0; i < 3; i++) { const a = OTTICA.acqua[i] + OTTICA.fango[i] * 1e-3 * C + OTTICA.ferro[i] * Fe * 230, b = OTTICA.indietro[i] + OTTICA.fangoIndietro * 1e-3 * (C + bianco), R = (0.33 * b) / (a + b);
    const fondoC = tf === 0 && !calc ? 0.5 * (cf[i] + stato.coloreContinente[i]) : cf[i], Rf = 0.3 * mf * ombra * Math.pow(fondoC / 255, 2.2);
    c[i] = 255 * Math.pow(Math.min(1, OTTICA.esposizione * luce[i] * (R + (Rf - R) * Math.exp(-2 * (a + b) * Math.max(0, d)) + OTTICA.cielo[i])), 1 / 2.2); }
  // le croste di sale: sulle rive di un lago saturo e nei mari chiusi arrivati al sale; il ghiaccio copre in proporzione al tempo che il punto passa sotto il gelo
  const salato = (L && L.tipo !== 'aperto' && L.precipitati && L.precipitati.salgemma + L.precipitati.gesso + (L.precipitati.amari || 0) > 0) || (bacino && bacino.saturo);
  if (salato) { const q = d < 2 ? 0.7 : d < 20 ? 0.3 : 0.1; for (let i = 0; i < 3; i++) c[i] += (SALE[i] - c[i]) * q; }
  const gelo = tipo === 1 ? campo(stato, stato.ghiaccio, lon, lat) : L ? L.ghiaccio : 0; if (gelo > 0) { const gg = Math.pow(Math.min(1, gelo), 0.7); for (let i = 0; i < 3; i++) c[i] += (GHIACCIO[i] - c[i]) * gg; }
  return true;
}
// → [r, g, b] (0…255), o null se lì è terra. «profonditaM» e «acqua» (vero) per chi conosce il punto meglio (le tessere).
export function coloreMare(stato, lon, lat, { profonditaM = null, acqua: forzata = null, scalaM = 0 } = {}) {
  if (!stato || !stato.esiste) return null; const c = [0, 0, 0]; return ottica(stato, lon, lat, profonditaM, forzata, scalaM, 1, c) ? c.map(Math.round) : null;
}
// LA PARTE FERMA dell'aspetto: il colore dell'acqua e del fondo, punto per punto, sopra un'immagine di
// immagineSuperficie() (geologia.js). «sf»: una superficie o una tessera (W, H, il suo rettangolo «rett», e se le ha le
// sue quote «alt», il livello «mare», i laghi «lago»; senza quote vale la profondità della carta del mare).
// Dove l'acqua è limpida e bassa il fondo si vede col suo rilievo (ombreggiato dalle quote).
export function coloraMare(stato, sf, px) {
  if (!stato || !stato.esiste) return px; const { W, H } = sf, [u0, v0, u1, v1] = sf.rett || [0, 0, 1, 1], scalaM = ((v1 - v0) * Math.PI * stato.raggioM) / H, c = [0, 0, 0], alt = sf.alt || null;
  for (let j = 0; j < H; j++) { const lat = 90 - (v0 + ((j + 0.5) / H) * (v1 - v0)) * 180; for (let i = 0; i < W; i++) { const k = j * W + i; let d = null, forz = null;
    if (alt) { const mare = alt[k] < sf.mare, lago = sf.lago && sf.lago[k] > 0; if (!mare && !lago) continue; d = mare ? sf.mare - alt[k] : sf.lago[k]; forz = true; }
    const ombra = alt && d < 80 ? limita(1 + (alt[j * W + (i > 0 ? i - 1 : i)] - alt[k] + alt[(j > 0 ? j - 1 : j) * W + i] - alt[k]) / Math.max(2, 0.02 * scalaM), 0.55, 1.5) : 1;
    if (!ottica(stato, (u0 + ((i + 0.5) / W) * (u1 - u0)) * 360 - 180, lat, d, forz, scalaM, ombra, c)) continue;
    px[k * 4] = c[0]; px[k * 4 + 1] = c[1]; px[k * 4 + 2] = c[2]; px[k * 4 + 3] = 255; } }
  return px;
}

// LE ONDE COME SI VEDONO. La superficie è una somma di onde semplici: 16 lunghezze, da 2 cm a 2 km, tre per ogni fattore
// dieci, per 12 direzioni; ognuna con la sua fase, che è un evento del pianeta (la stessa a ogni scala e in ogni istante:
// una cresta vista da lontano è la stessa che da vicino diventa un'onda sola). Quanto è alta ciascuna in un punto lo
// dice lo spettro del mare di quel punto: quello di Pierson e Moskowitz, k⁻³·exp(−1,25·(k_p/k)²), col picco dal
// periodo e la somma dall'altezza che campoOnde ha calcolato lì (vento, tratto libero, fondale), sparso attorno alla
// direzione del vento come cos²; più il mare lungo, stretto attorno alla sua direzione. Ogni onda corre con la
// frequenza ω = √(g·k) dell'acqua profonda e la tiene anche sul basso fondale, dove invece rallenta e si accorcia
// (k cresce: ω² = g·k·tanh(k·d)), cresce (legge di Green, d^−¼) e accumula ritardo: le creste girano e si mettono
// parallele alla riva (la rifrazione), e dove sono più alte di 0,39 volte il fondale frangono in schiuma.
// A ogni scala si disegnano solo le onde che quella scala risolve (più lunghe di ~2 punti dell'immagine).
const ONDE = { n: 16, dir: 12, memo: new Map() };
function componentiOnde(stato) {
  let c = ONDE.memo.get(stato.radice); if (c) return c; const ev = sorgente(`${stato.radice}/onde`), n = ONDE.n * ONDE.dir, g = stato.gravita;
  c = { k: new Float64Array(n), cx: new Float64Array(n), cy: new Float64Array(n), fase: new Float64Array(n), om: new Float64Array(n), lam: new Float64Array(n), az: new Float64Array(n) };
  for (let j = 0; j < ONDE.n; j++) for (let a = 0; a < ONDE.dir; a++) { const q = j * ONDE.dir + a, lam = 0.02 * Math.pow(10, (j + 0.6 * (ev(`lunghezza ${j}/${a}`) - 0.5)) / 3), az = ((a + 0.7 * (ev(`direzione ${j}/${a}`) - 0.5)) * 2 * Math.PI) / ONDE.dir;
    c.lam[q] = lam; c.k[q] = (2 * Math.PI) / lam; c.az[q] = az; c.cx[q] = Math.cos(az); c.cy[q] = Math.sin(az); c.fase[q] = 2 * Math.PI * ev(`fase ${j}/${a}`); c.om[q] = Math.sqrt(g * c.k[q] + 7.4e-5 * c.k[q] ** 3); } // (con la tensione superficiale, che conta sotto i 2 cm)
  ONDE.memo.set(stato.radice, c); if (ONDE.memo.size > 8) ONDE.memo.delete(ONDE.memo.keys().next().value); return c;
}
// il mare in un punto: vento, onde di vento e mare lungo → { U, ax, ay (verso cui va il vento), H, T, Hl, Tl, lx, ly, creste }
export function ondeNelPunto(stato, lon, lat) {
  const u = campo(stato, stato.vento.u, lon, lat), v = campo(stato, stato.vento.v, lon, lat), U = Math.hypot(u, v), o = stato.onde, gelo = campo(stato, stato.ghiaccio, lon, lat), calma = gelo > 0.8 ? 0 : 1 - gelo;
  return { U, ax: U > 0 ? u / U : 1, ay: U > 0 ? v / U : 0, H: calma * campo(stato, o.altezza, lon, lat), T: campo(stato, o.periodo, lon, lat), Hl: calma * campo(stato, o.lungo.altezza, lon, lat), Tl: campo(stato, o.lungo.periodo, lon, lat),
    lx: campo(stato, o.lungo.u, lon, lat), ly: campo(stato, o.lungo.v, lon, lat), creste: calma * 3.84e-6 * Math.pow(U, 3.41), tratto: campo(stato, o.tratto, lon, lat) };
}
// le ampiezze (m) delle componenti in un punto, dallo spettro di lì
function ampiezzeOnde(stato, co, m, out) {
  const g = stato.gravita, parti = [[m.H, m.T, m.ax, m.ay, 2], [m.Hl, m.Tl, m.lx, m.ly, 10]];
  out.fill(0);
  for (const [Hs, Tp, dx, dy, punta] of parti) { if (!(Hs > 1e-4) || !(Tp > 0)) continue; const kp = (2 * Math.PI / Tp) ** 2 / g; let somma = 0; const D = new Float64Array(ONDE.dir);
    for (let j = 0; j < ONDE.n; j++) { somma = 0; for (let a = 0; a < ONDE.dir; a++) { const q = j * ONDE.dir + a, cs = Math.max(0, co.cx[q] * dx + co.cy[q] * dy); D[a] = Math.pow(cs, punta); somma += D[a]; }
      const r = kp / co.k[j * ONDE.dir], E = (Hs * Hs) / 16 * 5 * r * r * Math.exp(-1.25 * r * r) * (Math.LN10 / 3); if (!(somma > 0)) continue;
      for (let a = 0; a < ONDE.dir; a++) { const q = j * ONDE.dir + a; out[q] = Math.sqrt(out[q] * out[q] + (2 * E * D[a]) / somma); } } }
  return out;
}
// L'ASPETTO DEL MARE in un'immagine: la parte ferma (coloraMare: acqua, fondo, fango, ghiaccio) più ciò che si muove
// (le onde che questa scala risolve, la schiuma dove frangono; ciò che è più piccolo di un punto dell'immagine si vede
// solo come schiuma media, in proporzione alle creste che frangono con quel vento). «t» in secondi veri.
// La parte ferma si calcola una volta per superficie e si tiene (aspettoFermo): a ogni fotogramma si rifà solo il moto.
// → px; in più aspettoMare.ultimo = { scalaM, onde (quante componenti disegnate), lunghezze: [min, max] (m), periodo (s) }
const fermi = new WeakMap();
export function aspettoFermo(stato, sf) { return fermo(stato, sf).px; }
function fermo(stato, sf) { let f = fermi.get(sf); if (f && f.stato === stato) return f;
  const { W, H } = sf, px = new Uint8ClampedArray(W * H * 4), d = new Float32Array(W * H), pend = new Float32Array(W * H).fill(0.01), [u0, v0, u1, v1] = sf.rett || [0, 0, 1, 1], scalaM = ((v1 - v0) * Math.PI * stato.raggioM) / H, alt = sf.alt || null, F = stato.fine; coloraMare(stato, sf, px);
  // (la profondità e la pendenza del fondo, che servono alle onde: dalle quote della superficie se ci sono, altrimenti dalla carta del mare)
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i; if (!px[k * 4 + 3]) continue;
    if (alt) { d[k] = alt[k] < sf.mare ? sf.mare - alt[k] : sf.lago ? sf.lago[k] : 10; if (d[k] < 200) pend[k] = Math.max(0.002, Math.hypot(alt[j * W + Math.min(W - 1, i + 1)] - alt[j * W + Math.max(0, i - 1)], alt[Math.min(H - 1, j + 1) * W + i] - alt[Math.max(0, j - 1) * W + i]) / (2 * scalaM)); }
    else d[k] = F.fondo[cellaFine(stato, (u0 + ((i + 0.5) / W) * (u1 - u0)) * 360 - 180, 90 - (v0 + ((j + 0.5) / H) * (v1 - v0)) * 180)] || 10; }
  f = { stato, px, d, pend }; fermi.set(sf, f); return f; }
export function aspettoMare(stato, sf, px, { t = 0, onde = 8 } = {}) {
  aspettoMare.ultimo = { scalaM: 0, onde: 0, lunghezze: null, periodo: 0 };
  if (!stato || !stato.esiste) return px; const { W, H } = sf, N = W * H, fm = fermo(stato, sf), base = fm.px, [u0, v0, u1, v1] = sf.rett || [0, 0, 1, 1], R = stato.raggioM;
  for (let k = 0; k < N; k++) if (base[k * 4 + 3]) { px[k * 4] = base[k * 4]; px[k * 4 + 1] = base[k * 4 + 1]; px[k * 4 + 2] = base[k * 4 + 2]; px[k * 4 + 3] = 255; }
  const latC = 90 - 90 * (v0 + v1), scalaM = ((v1 - v0) * Math.PI * R) / H, scalaX = ((u1 - u0) * 2 * Math.PI * R * Math.cos(latC * RAD)) / W; aspettoMare.ultimo.scalaM = scalaM;
  if (scalaM > 900) return px; // (da qui in su nessuna onda è più lunga di due punti dell'immagine)
  // il mare ai quattro angoli e al centro della tessera (cambia piano: tra quelli si interpola), e le componenti che questa scala risolve
  const co = componentiOnde(stato), nC = ONDE.n * ONDE.dir, P5 = [[0, 0], [1, 0], [0, 1], [1, 1], [0.5, 0.5]].map(([a, b]) => ondeNelPunto(stato, (u0 + a * (u1 - u0)) * 360 - 180, 90 - (v0 + b * (v1 - v0)) * 180));
  const A5 = P5.map((m) => ampiezzeOnde(stato, co, m, new Float64Array(nC))), attive = []; let lMin = Infinity, lMax = 0, pMax = 0;
  for (let q = 0; q < nC; q++) { if (co.lam[q] < 2.6 * scalaM || co.lam[q] > 0.8 * W * scalaM) continue; const a = Math.max(...A5.map((x) => x[q])); if (a * co.k[q] < 0.004) continue; attive.push(q); lMin = Math.min(lMin, co.lam[q]); lMax = Math.max(lMax, co.lam[q]); pMax = Math.max(pMax, (2 * Math.PI) / co.om[q]); }
  // (quelle che si vedono di più: le più ripide, contando meno quelle appena risolte da questa scala)
  const peso = (q) => Math.max(...A5.map((x) => x[q])) * co.k[q] * limita((co.lam[q] / scalaM - 2.6) / 4, 0.15, 1);
  attive.sort((a, b) => peso(b) - peso(a)); attive.length = Math.min(attive.length, onde);
  const creste = P5[4].creste;
  Object.assign(aspettoMare.ultimo, { onde: attive.length, lunghezze: attive.length ? [lMin, lMax] : null, periodo: pMax, altezza: P5[4].H, vento: P5[4].U });
  const nA = attive.length, kk = new Float64Array(nA), cx = new Float64Array(nA), cy = new Float64Array(nA), f0 = new Float64Array(nA), a00 = new Float64Array(nA), a10 = new Float64Array(nA), a01 = new Float64Array(nA), a11 = new Float64Array(nA);
  for (let n = 0; n < nA; n++) { const q = attive[n]; kk[n] = co.k[q]; cx[n] = co.cx[q]; cy[n] = co.cy[q]; f0[n] = co.fase[q] - co.om[q] * t; const vede = limita((co.lam[q] / scalaM - 2.6) / 4, 0.15, 1); a00[n] = vede * A5[0][q]; a10[n] = vede * A5[1][q]; a01[n] = vede * A5[2][q]; a11[n] = vede * A5[3][q]; }
  const Hq = P5.map((m) => Math.hypot(m.H, m.Hl));
  const Lx = -0.6, Ly = 0.8; // (la luce viene da nord-ovest, come nell'ombreggiatura delle terre)
  const fr = new Float64Array(nA), dfr = new Float64Array(nA), DUE_PI = 2 * Math.PI;
  for (let j = 0; j < H; j++) { const fv = (j + 0.5) / H, latR = (90 - (v0 + fv * (v1 - v0)) * 180) * RAD, Y = R * latR, cosL = Math.cos(latR), X0 = R * cosL * ((u0 + (0.5 / W) * (u1 - u0)) * 360 - 180) * RAD, dX = (R * cosL * (u1 - u0) * 360 * RAD) / W;
    // (la fase di ogni onda all'inizio della riga, ridotta a un giro; lungo la riga cresce di passo in passo)
    for (let n = 0; n < nA; n++) { const f = kk[n] * (X0 * cx[n] + Y * cy[n]) + f0[n]; fr[n] = f - DUE_PI * Math.floor(f / DUE_PI); dfr[n] = kk[n] * cx[n] * dX; }
    for (let i = 0; i < W; i++) { const k = j * W + i; if (!base[k * 4 + 3]) continue; const fu = (i + 0.5) / W, d = fm.d[k], pend = fm.pend[k];
      // (dove il fondale è basso l'onda non può essere più alta di 0,6 volte la profondità: frange, e lì c'è schiuma)
      const Hs = (Hq[0] * (1 - fu) + Hq[1] * fu) * (1 - fv) + (Hq[2] * (1 - fu) + Hq[3] * fu) * fv, regge = Hs > 0 ? Math.min(1, (0.6 * d) / Hs) : 1; let ombra = 0, ripida = 0, alta = 0;
      for (let n = 0; n < nA; n++) { let a = (a00[n] * (1 - fu) + a10[n] * fu) * (1 - fv) + (a01[n] * (1 - fu) + a11[n] * fu) * fv; if (a <= 0) continue; a *= regge; let kq = kk[n], fase = fr[n] + i * dfr[n];
        if (kq * d < 3) { const x = kq * d, th = (x * (27 + x * x)) / (27 + 9 * x * x), rq = Math.sqrt(th), kb = kq / rq; fase += (0.5 * (kb - kq) * d) / pend; a *= Math.min(2.2, 1 / Math.sqrt(rq)); kq = kb; } // sul basso fondale: più corta, più alta, in ritardo (tanh approssimata)
        const sn = Math.sin(fase), cs = Math.cos(fase); ombra += a * kq * sn * (cx[n] * Lx + cy[n] * Ly); ripida += a * kq * cs; alta += a * cs; }
      let schiuma = creste * 0.6; if (nA) { if (ripida > 0.3) schiuma += Math.min(1, (ripida - 0.3) * 5); if (regge < 1 && alta > 0.12 * Hs * regge) schiuma += Math.min(0.9, (1 - regge) * 1.5); }
      const lume = limita(1 + 1.3 * ombra, 0.62, 1.45), sc = Math.min(1, schiuma);
      for (let c = 0; c < 3; c++) { const v = base[k * 4 + c] * lume; px[k * 4 + c] = v + (SCHIUMA[c] - v) * sc; } } }
  return px;
}

// ---------- 8. LE MOLECOLE IN TRE DIMENSIONI (per la vista atomo per atomo, atomi3d.js)
// Un cubetto di pochi nanometri del mare in quel punto, atomo per atomo. Ciò che è vero:
//  · QUANTE molecole e quanti ioni: gli stessi di campioneAcqua alla stessa scala (densità dell'acqua di lì, conteggi
//    degli ioni, delle coppie e dei gas: gli stessi eventi);
//  · LA MOLECOLA D'ACQUA: O–H 0,9572 Å, angolo 104,5° (misurati); ogni molecola dà due legami a idrogeno a due vicine
//    e ne riceve in media due: i suoi idrogeni puntano verso gli ossigeni delle vicine scelte (distanza O···O ~2,8-3,1 Å);
//  · GLI IONI nei loro gusci: attorno a un catione le molecole d'acqua girano l'ossigeno verso di lui, attorno a un
//    anione un idrogeno (distanze: raggio dello ione + 1,38 Å); solfato tetraedrico (S–O 1,49 Å), carbonato e
//    bicarbonato piani (C–O 1,29 Å), CO2 lineare (1,16 Å), O2 (1,21 Å), N2 (1,10 Å);
//  · I SOLIDI, se nel cubetto ce n'è uno (un cristallo che sta nascendo, il ghiaccio, un granello, il fondo), con il
//    loro reticolo: salgemma (cubico, 5,64 Å, faccia 100), ghiaccio (ossigeni a tetraedro, 2,75 Å), calcite (strati di
//    calcio e di carbonati piani, 4,99 Å nel piano e 2,84 Å tra gli strati: la faccia è quella basale, non quella di
//    sfaldatura), argilla (un foglio di caolinite idealizzato: silicio in esagoni, alluminio, ossidrili verso l'acqua);
//  · LA SUPERFICIE, se il cubetto la contiene: sopra, l'aria (a quella pressione: pochissime molecole);
//  · L'AGITAZIONE: di quanto ogni cosa vibra e si sposta alla temperatura di lì (diffusione vera, D ∝ T/viscosità).
// Ciò che NON è vero: le posizioni non vengono da una dinamica molecolare. Gli ossigeni stanno su un reticolo cubico
// alla densità giusta, spostati a caso (un evento per molecola) di ~0,5 Å: la distanza tra vicine è quella del liquido,
// l'ordine a lungo raggio no (si vede, guardando di taglio); i legami a idrogeno seguono quel reticolo (sei vicine
// invece di quattro-cinque). Chi anima (atomi3d.js) ha qui le ampiezze e i tempi veri.
// → { atomi: { pos (nm, 3N), raggio (nm), elemento (numero atomico) }, legami (coppie di indici: i legami covalenti),
//     legamiH (idrogeno → ossigeno che lo riceve), scatola [nm], parti: [{ nome, da, a }], etichette, agitazione, conteggi, campione }
const ATOMO = { H: [1, 0.11], C: [6, 0.17], N: [7, 0.155], O: [8, 0.152], Na: [11, 0.102], Mg: [12, 0.072], Al: [13, 0.054], Si: [14, 0.11], S: [16, 0.18], Cl: [17, 0.181], K: [19, 0.138], Ca: [20, 0.1], Fe: [26, 0.078] };
const SIMBOLO = { 'Na+': 'Na', 'K+': 'K', 'Mg2+': 'Mg', 'Ca2+': 'Ca', 'Fe2+': 'Fe', 'Cl-': 'Cl' };
export function scenaMolecolare(stato, { lon = 0, lat = 0, profondita = 0, latoM = 5e-9, t = 0, solido = 'auto', massimoAtomi = 400000, acqua: forzata = null, fondoM = null } = {}, caso = null) {
  const camp = campioneAcqua(stato, { lon, lat, profondita, latoM, t, acqua: forzata, fondoM }, caso);
  if (camp.asciutto) return { atomi: { pos: new Float32Array(0), raggio: new Float32Array(0), elemento: new Uint8Array(0) }, legami: new Uint32Array(0), legamiH: new Uint32Array(0), scatola: [0, 0, 0], parti: [], etichette: [], campione: camp, asciutto: true };
  const ev = sorgente(camp.radice, camp.rami).sotto('molecole'), seme = ev.seme('reticolo'), nW = camp.acquaPerM3 * 1e-27; // (molecole d'acqua per nm³)
  let Lnm = latoM * 1e9, ridotta = false; if (3 * nW * Lnm ** 3 > massimoAtomi) { Lnm = Math.cbrt(massimoAtomi / (3 * nW)); ridotta = true; }
  const nx = Math.max(2, Math.round(Lnm * Math.cbrt(nW))), a = Lnm / nx, NS = nx * nx * nx, vol = (Lnm * 1e-9) ** 3 / latoM ** 3;
  const h = (n, q) => { let x = (Math.imul(n + 1, 374761393) + Math.imul(q + 7, 668265263) + seme) | 0; x = Math.imul(x ^ (x >>> 13), 1274126177); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; }, gauss = (n, q) => (h(n, q) + h(n, q + 1) + h(n, q + 2) + h(n, q + 3) - 2) * 1.73;
  const sito = (i, j, k) => (((k % nx) + nx) % nx * nx + ((j % nx) + nx) % nx) * nx + ((i % nx) + nx) % nx, stato_ = new Int8Array(NS), versoIone = new Float32Array(NS * 3), segnoIone = new Int8Array(NS); // (0 acqua; 1 tolta)
  const P = [], Rr = [], El = [], legami = [], legamiH = [], parti = [], etichette = [], centro = (n) => { const i = n % nx, j = Math.floor(n / nx) % nx, k = Math.floor(n / (nx * nx)); return [(i + 0.5) * a, (j + 0.5) * a, (k + 0.5) * a]; };
  const metti = (el, x, y, z) => { P.push(x, y, z); Rr.push(ATOMO[el][1]); El.push(ATOMO[el][0]); return El.length - 1; }, parte = (nome, da) => { if (El.length > da) parti.push({ nome, da, a: El.length }); };
  // --- che cosa c'è di solido, e la superficie
  const zSup = profondita * 1e9 < Lnm ? Lnm - Math.max(0, profondita * 1e9) : Infinity, sulFondo = (camp.fondoM - camp.profondita) * 1e9 < Lnm;
  let quale = solido === 'auto' ? null : solido;
  if (solido === 'auto') { // c'è un solido nel cubetto? La probabilità vera: quante superfici di granelli o cristalli lo attraversano
    if (camp.luogo.salamoia) quale = 'ghiaccio'; else if (sulFondo) quale = 'argilla';
    else for (const cl of camp.classi) { if (!['cristallo', 'granello', 'colloide', 'fiocco'].includes(cl.tipo)) continue; const pr = cl.perM3 * Math.PI * cl.diametroM ** 2 * latoM; if (ev(`c'è un ${cl.materiale}`) < pr) { quale = cl.materiale === 'salgemma' || cl.materiale === 'calcite' || cl.materiale === 'ghiaccio' ? cl.materiale : 'argilla'; break; } } }
  const zSolido = quale ? Math.min(0.34 * Lnm, 2.2) : 0;
  for (let n = 0; n < NS; n++) { const z = (Math.floor(n / (nx * nx)) + 0.5) * a; if (z < zSolido + 0.12 || z > zSup) stato_[n] = 1; }
  if (quale) { const da = El.length; reticolo(quale, Lnm, zSolido, metti, legami, h); parte(`solido: ${quale}`, da); etichette.push({ testo: quale, pos: [Lnm / 2, Lnm / 2, zSolido / 2] }); }
  // --- gli ioni, le coppie, i gas: quanti ce ne sono davvero (gli stessi conteggi del campione), ognuno al posto di una molecola d'acqua
  const liberi = []; for (let n = 0; n < NS; n++) if (!stato_[n]) liberi.push(n); const L0 = liberi.length;
  let giro = 0; const prendi = () => { for (let p = 0; p < 50 && liberi.length; p++) { const q = Math.floor(h(giro++, 91) * liberi.length), n = liberi[q]; if (!stato_[n]) { stato_[n] = 1; return n; } } return -1; };
  const guscio = (n, pos, segno) => { const i = n % nx, j = Math.floor(n / nx) % nx, k = Math.floor(n / (nx * nx)); for (const [di, dj, dk] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) { const m = sito(i + di, j + dj, k + dk); if (stato_[m]) continue; versoIone[m * 3] = pos[0]; versoIone[m * 3 + 1] = pos[1]; versoIone[m * 3 + 2] = pos[2]; segnoIone[m] = segno; } };
  const molecola = (f, c, n) => { // gli atomi di uno ione o di un gas attorno al punto c
    const u = [gauss(n, 31), gauss(n, 35), gauss(n, 39)], lu = Math.hypot(...u) || 1, ux = u.map((x) => x / lu), w0 = [gauss(n, 43), gauss(n, 47), gauss(n, 51)], d0 = w0[0] * ux[0] + w0[1] * ux[1] + w0[2] * ux[2], w1 = w0.map((x, q) => x - d0 * ux[q]), lw = Math.hypot(...w1) || 1, wx = w1.map((x) => x / lw), vx = [ux[1] * wx[2] - ux[2] * wx[1], ux[2] * wx[0] - ux[0] * wx[2], ux[0] * wx[1] - ux[1] * wx[0]];
    const at = (el, pu, pw, pv) => metti(el, c[0] + pu * ux[0] + pw * wx[0] + pv * vx[0], c[1] + pu * ux[1] + pw * wx[1] + pv * vx[1], c[2] + pu * ux[2] + pw * wx[2] + pv * vx[2]);
    if (SIMBOLO[f]) return at(SIMBOLO[f], 0, 0, 0);
    if (f === 'SO4(2-)') { const s0 = at('S', 0, 0, 0), q = 0.149 / Math.sqrt(3); for (const [x, y, z] of [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]]) legami.push(s0, at('O', q * x, q * y, q * z)); return s0; }
    if (f === 'CO3(2-)' || f === 'HCO3-') { const c0 = at('C', 0, 0, 0); let ult = 0; for (let q = 0; q < 3; q++) { ult = at('O', 0.129 * Math.cos((q * 2 * Math.PI) / 3), 0.129 * Math.sin((q * 2 * Math.PI) / 3), 0); legami.push(c0, ult); } if (f === 'HCO3-') legami.push(ult, at('H', 0.129 * Math.cos((4 * Math.PI) / 3) - 0.05, 0.129 * Math.sin((4 * Math.PI) / 3) - 0.082, 0)); return c0; }
    if (f === 'CO2') { const c0 = at('C', 0, 0, 0); legami.push(c0, at('O', 0.116, 0, 0), c0, at('O', -0.116, 0, 0)); return c0; }
    if (f === 'O2') { const o0 = at('O', 0.0604, 0, 0); legami.push(o0, at('O', -0.0604, 0, 0)); return o0; }
    if (f === 'N2') { const n0 = at('N', 0.0549, 0, 0); legami.push(n0, at('N', -0.0549, 0, 0)); return n0; }
    if (f === 'H+') { const o0 = at('O', 0, 0, 0); for (let q = 0; q < 3; q++) legami.push(o0, at('H', 0.098 * 0.94 * Math.cos((q * 2 * Math.PI) / 3), 0.098 * 0.94 * Math.sin((q * 2 * Math.PI) / 3), 0.033)); return o0; } // (l'idrogenione sta su una molecola d'acqua: H3O⁺)
    if (f === 'OH-') { const o0 = at('O', 0, 0, 0); legami.push(o0, at('H', 0.097, 0, 0)); return o0; }
    return -1; };
  const conteggi = {}, quanti = (nome, atteso) => Math.round((camp.contati[nome] ?? atteso) * vol);
  for (const f of Object.keys(camp.ioni).filter((x) => IONI[x]).concat(Object.keys(camp.gas || {}))) { const da = El.length, N = quanti(f, (camp.ioni[f] || camp.gas[f]).nelCampione); let fatti = 0;
    for (let q = 0; q < N; q++) { const n = prendi(); if (n < 0) break; const c = centro(n); molecola(f, c, n); guscio(n, c, IONI[f] ? Math.sign(IONI[f][2]) : 0); fatti++; } conteggi[f] = fatti; parte(f, da); }
  for (const nome in camp.coppie) { if (nome.includes('incontri')) continue; const [ca, an] = nome.split(' '), da = El.length, N = quanti(nome, camp.coppie[nome].nelCampione); let fatti = 0;
    for (let q = 0; q < N; q++) { const n = prendi(); if (n < 0) break; const i = n % nx, j = Math.floor(n / nx) % nx, k = Math.floor(n / (nx * nx)), m = sito(i + 1, j, k), c = centro(n), dist = (IONI[ca][6] + IONI[an][6] + (ca === 'Mg2+' ? 2.76 : 0)) / 10; if (stato_[m]) continue; stato_[m] = 1;
      molecola(ca, [c[0] - dist / 2 + a / 2, c[1], c[2]], n); molecola(an, [c[0] + dist / 2 + a / 2, c[1], c[2]], n + NS); guscio(n, c, 1); guscio(m, centro(m), -1); fatti++; } conteggi[nome] = fatti; parte(`coppia ${nome}`, da); }
  // --- la densità vera: il reticolo ha nx³ posti, con nx arrotondato, cioè fino al ±12% di posti in più o in meno di quante
  // molecole d'acqua ci stanno davvero (nW·a³ per posto); i posti di troppo restano vuoti, a caso (prima erano tutti acqua)
  { const via = liberi.filter((n) => !stato_[n]).length - (Math.round(nW * a ** 3 * L0) - (L0 - liberi.filter((n) => !stato_[n]).length)); for (let q = 0; q < via; q++) if (prendi() < 0) break; }
  // --- l'aria sopra la superficie (a quella pressione e temperatura: p/kT molecole per m³)
  if (isFinite(zSup)) { const da = El.length, nAria = ((stato.pressioneAria / (KB * camp.T)) * 1e-27) * Lnm * Lnm * (Lnm - zSup), N = Math.round(nAria + h(5, 77) - 0.5); for (let q = 0; q < N; q++) molecola(h(q, 78) < (stato.aria.O2 || 0) ? 'O2' : (stato.aria.CO2 || 0) > 0.5 ? 'CO2' : 'N2', [h(q, 79) * Lnm, h(q, 80) * Lnm, zSup + 0.3 + h(q, 81) * Math.max(0, Lnm - zSup - 0.3)], q + 2 * NS); parte('aria', da); etichette.push({ testo: 'la superficie', pos: [Lnm / 2, Lnm / 2, zSup] }); }
  // --- l'acqua: ogni molecola al suo posto (spostata di ~0,5 Å), con gli idrogeni verso due vicine, o girata verso lo ione che ha accanto
  const daAcqua = El.length, OH = 0.09572, mezzo = (104.5 / 2) * RAD, cs = Math.cos(mezzo), sn = Math.sin(mezzo), posO = new Float32Array(NS * 3), DIR = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  for (let n = 0; n < NS; n++) { const c = centro(n); posO[n * 3] = c[0] + 0.05 * gauss(n, 1); posO[n * 3 + 1] = c[1] + 0.05 * gauss(n, 5); posO[n * 3 + 2] = c[2] + 0.05 * gauss(n, 9); }
  let nAcqua = 0;
  for (let n = 0; n < NS; n++) { if (stato_[n]) continue; const i = n % nx, j = Math.floor(n / nx) % nx, k = Math.floor(n / (nx * nx)), ox = posO[n * 3], oy = posO[n * 3 + 1], oz = posO[n * 3 + 2];
    // le due direzioni dei due idrogeni
    let d1, d2, m1 = -1, m2 = -1;
    const verso = (q) => { const [di, dj, dk] = DIR[q], m = sito(i + di, j + dj, k + dk); let x = posO[m * 3] - ox, y = posO[m * 3 + 1] - oy, z = posO[m * 3 + 2] - oz; x -= Lnm * Math.round(x / Lnm); y -= Lnm * Math.round(y / Lnm); z -= Lnm * Math.round(z / Lnm); const l = Math.hypot(x, y, z) || 1; return [[x / l, y / l, z / l], stato_[m] ? -1 : m]; };
    const q1 = Math.floor(h(n, 13) * 6); let q2 = Math.floor(h(n, 17) * 4); q2 = [0, 1, 2, 3, 4, 5].filter((q) => q >> 1 !== q1 >> 1)[q2];
    [d1, m1] = verso(q1); [d2, m2] = verso(q2);
    if (segnoIone[n]) { let x = ox - versoIone[n * 3], y = oy - versoIone[n * 3 + 1], z = oz - versoIone[n * 3 + 2]; x -= Lnm * Math.round(x / Lnm); y -= Lnm * Math.round(y / Lnm); z -= Lnm * Math.round(z / Lnm); const l = Math.hypot(x, y, z) || 1, via = [x / l, y / l, z / l];
      if (segnoIone[n] > 0) { const pr = d1[0] * via[0] + d1[1] * via[1] + d1[2] * via[2], pe = [d1[0] - pr * via[0], d1[1] - pr * via[1], d1[2] - pr * via[2]], lp = Math.hypot(...pe) || 1; d1 = [via[0] * cs + (pe[0] / lp) * sn, via[1] * cs + (pe[1] / lp) * sn, via[2] * cs + (pe[2] / lp) * sn]; d2 = [via[0] * cs - (pe[0] / lp) * sn, via[1] * cs - (pe[1] / lp) * sn, via[2] * cs - (pe[2] / lp) * sn]; m1 = m2 = -1; } // catione: l'ossigeno verso di lui, gli idrogeni in fuori
      else { d1 = [-via[0], -via[1], -via[2]]; m1 = -1; } } // anione: un idrogeno verso di lui
    // i due idrogeni: nel piano delle due direzioni, aperti esattamente di 104,5°
    let b = [d1[0] + d2[0], d1[1] + d2[1], d1[2] + d2[2]], lb = Math.hypot(...b); if (lb < 1e-3) { b = [d1[1], -d1[0], 0]; lb = Math.hypot(...b) || 1; } b = b.map((x) => x / lb);
    let pp = [d1[0] - d2[0], d1[1] - d2[1], d1[2] - d2[2]]; const pb = pp[0] * b[0] + pp[1] * b[1] + pp[2] * b[2]; pp = pp.map((x, q) => x - pb * b[q]); const lp = Math.hypot(...pp) || 1; pp = pp.map((x) => x / lp);
    const o = metti('O', ox, oy, oz), h1 = metti('H', ox + OH * (cs * b[0] + sn * pp[0]), oy + OH * (cs * b[1] + sn * pp[1]), oz + OH * (cs * b[2] + sn * pp[2])), h2 = metti('H', ox + OH * (cs * b[0] - sn * pp[0]), oy + OH * (cs * b[1] - sn * pp[1]), oz + OH * (cs * b[2] - sn * pp[2]));
    legami.push(o, h1, o, h2); posO[n * 3] = ox; stato_[n] = 0; if (m1 >= 0) legamiH.push(h1, m1); if (m2 >= 0) legamiH.push(h2, m2); nAcqua++; }
  // (i legami a idrogeno puntano al sito della molecola che riceve: lo si traduce nell'indice del suo ossigeno)
  { const indiceO = new Int32Array(NS).fill(-1); let q = daAcqua; for (let n = 0; n < NS; n++) if (!stato_[n]) { indiceO[n] = q; q += 3; } let w = 0; for (let x = 0; x < legamiH.length; x += 2) { const io = indiceO[legamiH[x + 1]]; if (io >= 0) { legamiH[w++] = legamiH[x]; legamiH[w++] = io; } } legamiH.length = w; }
  parte('acqua', daAcqua); conteggi.acqua = nAcqua;
  // --- l'agitazione alla temperatura di lì
  const T = camp.T, fT = (T / 298.15) * (8.9e-4 / camp.viscosita), Dnm = (D) => D * 1e18 * 1e-12; // (m²/s → nm²/ps)
  const agitazione = { T, kT: KB * T, // (J)
    legameOH: { ampiezzaNm: 0.007, periodoFs: 9.3 }, piegamento: { ampiezzaGradi: 8.7, periodoFs: 20 }, // (lo stiramento O–H e il piegamento H–O–H: moti di punto zero, misurati dagli spettri infrarossi: 3600 e 1640 cm⁻¹)
    oscillazione: { ampiezzaGradi: (15 * Math.sqrt(T / 298.15)), periodoFs: 60 }, // la molecola che dondola nella gabbia dei suoi legami a idrogeno (librazione, ~600 cm⁻¹)
    gabbia: { ampiezzaNm: 0.03 * Math.sqrt(T / 298.15), periodoFs: 170 }, // il centro che vibra tra le vicine (~200 cm⁻¹)
    legameIdrogeno: { vitaPs: 1.0 / fT, giratePs: 2.5 / fT }, // quanto dura un legame a idrogeno e in quanto la molecola si rigira (misurati a 25 °C: 1 ps e 2,5 ps; scalano con la viscosità)
    diffusione: Object.fromEntries([['acqua', Dnm(2.3e-9 * fT)], ...Object.keys(IONI).filter((f) => camp.ioni[f]).map((f) => [f, Dnm(IONI[f][5] * 1e-9 * fT)])]), // (nm²/ps: in t picosecondi lo spostamento quadratico medio è 6·D·t)
    velocitaTermica: { acqua: Math.sqrt((3 * KB * T) / (MOLARE_ACQUA / NA)) } }; // (m/s: ~640 a 25 °C)
  // (a un tempo t in secondi: ogni molecola si è spostata, in media, di √(6·D·t); qui la si sposta di quel tanto in una direzione sua, finché resta nella sua gabbia: oltre, la scena andrebbe rifatta con le vicine nuove)
  const pos = Float32Array.from(P); if (t > 0) { const s = Math.min(0.12, Math.sqrt(6 * agitazione.diffusione.acqua * t * 1e12)); for (let q = daAcqua; q < El.length; q += 3) { const n = q / 3 | 0, dx = s * (h(n, 201) - 0.5) * 2, dy = s * (h(n, 202) - 0.5) * 2, dz = s * (h(n, 203) - 0.5) * 2; for (let z = 0; z < 3; z++) { pos[(q + z) * 3] += dx; pos[(q + z) * 3 + 1] += dy; pos[(q + z) * 3 + 2] += dz; } } }
  return { atomi: { pos, raggio: Float32Array.from(Rr), elemento: Uint8Array.from(El) }, legami: Uint32Array.from(legami), legamiH: Uint32Array.from(legamiH), scatola: [Lnm, Lnm, Lnm], parti, etichette, agitazione, conteggi,
    attesi: { acqua: camp.acquaNelCampione * vol, ...Object.fromEntries(Object.entries(camp.ioni).map(([f, x]) => [f, x.nelCampione * vol])) }, ridotta, latoNm: Lnm, solido: quale, nuclei: camp.nuclei, campione: camp,
    descrizione: `${camp.descrizione.split(';')[0]}: un cubetto di ${Lnm.toFixed(1)} nm, ${nAcqua} molecole d'acqua${quale ? `, un pezzo di ${quale}` : ''}${isFinite(zSup) ? ', la superficie e l\'aria sopra' : ''}.` };
}
// i reticoli dei solidi: riempiono il fondo della scatola fino a zMax (nm)
function reticolo(quale, L, zMax, metti, legami, h) {
  if (quale === 'salgemma') { const a = 0.282; for (let k = 0; (k + 0.5) * a < zMax; k++) for (let j = 0; (j + 0.5) * a < L; j++) for (let i = 0; (i + 0.5) * a < L; i++) metti((i + j + k) & 1 ? 'Cl' : 'Na', (i + 0.5) * a, (j + 0.5) * a, (k + 0.5) * a); return; }
  if (quale === 'ghiaccio') { // ossigeni a tetraedro (il reticolo del diamante, lato 6,35 Å), un idrogeno su ogni legame, più vicino a uno dei due
    const a = 0.635, base = [[0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5]], vic = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];
    for (let k = 0; k * a < zMax; k++) for (let j = 0; j * a < L; j++) for (let i = 0; i * a < L; i++) for (const [bx, by, bz] of base) { const x = (i + bx) * a, y = (j + by) * a, z = (k + bz) * a; if (z > zMax || x > L || y > L) continue; const o1 = metti('O', x, y, z), x2 = x + 0.25 * a, y2 = y + 0.25 * a, z2 = z + 0.25 * a, o2 = z2 <= zMax ? metti('O', x2, y2, z2) : -1;
      for (let q = 0; q < 4; q++) { const [vx, vy, vz] = vic[q], vicino = h(i * 31 + j * 17 + k * 7 + q, 300 + Math.round(bx * 2 + by * 4 + bz * 8)) < 0.5, f = vicino ? 0.0957 / (0.433 * a) : 1 - 0.0957 / (0.433 * a), hx = x + f * 0.25 * a * vx, hy = y + f * 0.25 * a * vy, hz = z + f * 0.25 * a * vz; if (hz > zMax + 0.1 || hz < 0 || hx < 0 || hy < 0 || hx > L || hy > L) continue; const hh = metti('H', hx, hy, hz); if (vicino) legami.push(o1, hh); else if (q === 0 && o2 >= 0) legami.push(o2, hh); } } return; }
  if (quale === 'calcite') { const a = 0.499, c = 0.284; for (let k = 0; (k + 0.5) * c < zMax; k++) for (let j = 0; j * a * 0.866 < L; j++) for (let i = 0; i * a < L; i++) { const sf = ((k % 3) * a) / 3, x = i * a + (j & 1 ? a / 2 : 0) + sf, y = j * a * 0.866 + sf * 0.577, z = (k + 0.5) * c; if (x > L || y > L) continue;
      if (k & 1) metti('Ca', x, y, z); else { const c0 = metti('C', x, y, z), gira = (k >> 1) & 1 ? Math.PI : 0; for (let q = 0; q < 3; q++) legami.push(c0, metti('O', x + 0.129 * Math.cos(gira + (q * 2 * Math.PI) / 3), y + 0.129 * Math.sin(gira + (q * 2 * Math.PI) / 3), z)); } } return; }
  // argilla: un foglio di caolinite idealizzato, ripetuto ogni 7,2 Å: ossigeni di base, silicio in esagoni, ossigeni di punta, alluminio, ossidrili in alto
  { const a = 0.515, b = 0.894, strato = 0.72; for (let k = 0; k * strato + 0.45 < zMax + 0.2; k++) for (let j = 0; j * b < L; j++) for (let i = 0; i * a < L; i++) { const x0 = i * a, y0 = j * b, z0 = k * strato + Math.max(0, zMax - Math.floor(zMax / strato) * strato) * 0;
      for (const [fx, fy] of [[0, 1 / 3], [0.5, 1 / 6], [0, 2 / 3], [0.5, 5 / 6]]) { const x = x0 + fx * a, y = y0 + fy * b; if (x > L || y > L) continue; const si = metti('Si', x, y, z0 + 0.06), op = metti('O', x, y, z0 + 0.22); legami.push(si, op); }
      for (const [fx, fy] of [[0.25, 0.25], [0.75, 0.25], [0, 0.5], [0.25, 0.75], [0.75, 0.75], [0.5, 0]]) { const x = x0 + fx * a, y = y0 + fy * b; if (x <= L && y <= L) metti('O', x, y, z0); }
      for (const [fx, fy] of [[0, 0], [0.5, 0.5], [0.5, 1 / 6 + 0.33], [0, 2 / 3 + 0.33 - 1 + 1]]) { const x = x0 + fx * a, y = y0 + (fy % 1) * b; if (x <= L && y <= L && (fx + fy) % 1 !== 0.99) metti('Al', x, y, z0 + 0.33); }
      for (const [fx, fy] of [[0.25, 1 / 12], [0.75, 7 / 12], [0.25, 5 / 12], [0.75, 11 / 12], [0, 0.25 + 0.5], [0.5, 0.25]]) { const x = x0 + fx * a, y = y0 + fy * b; if (x > L || y > L) continue; const o = metti('O', x, y, z0 + 0.43); legami.push(o, metti('H', x, y, z0 + 0.527)); } } }
}
