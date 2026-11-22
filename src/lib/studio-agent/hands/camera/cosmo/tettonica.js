// tettonica.js — la crosta di un pianeta che EVOLVE nel tempo: deriva dei continenti, oceani che nascono
// e affondano, catene di montagne nate dagli scontri.
//
// Non è una fotografia: si parte da un pianeta senza continenti e lo si lascia vivere per la sua età.
//   1. IL MANTELLO, scaldato dal basso, si organizza da solo in celle (l'equazione di Swift-Hohenberg,
//      come in fluidi.js, in regime a celle: discese fredde concentrate, circondate da una rete di
//      salite larghe, come in un mantello scaldato da dentro), e avanza nel tempo insieme alla crosta. La larghezza delle celle viene dallo
//      spessore del mantello, il vigore dal calore dell'interno. Trascina la crosta: via da dove sale,
//      verso dove scende. La litosfera è rigida: ogni placca va tutta alla stessa velocità, e le dorsali
//      e le fosse sono i bordi stretti dove quella velocità cambia verso.
//   2. LA CROSTA CONTINENTALE è una quantità che si conserva (uno spessore su griglia). È leggera e non
//      affonda. Nasce a poco a poco sopra le fosse (gli archi di vulcani), il mantello la raccoglie dove
//      converge, e lì si salda in continenti. LA LITOSFERA FREDDA È RIGIDA (litosfera(): la sua resistenza è molte
//      volte la spinta della dorsale): un continente non si ispessisce e non si stira, va tutto insieme. Si
//      ispessisce solo dove un bordo di placca lo stringe (le catene), fino allo spessore che quella spinta regge;
//      si stira solo dove un bordo si apre sotto di lui (McKenzie 1978): lì si assottiglia restando intero, la
//      litosfera si scalda e poi si raffredda (subsidenza iniziale e termica), e se arriva allo spessore del
//      basalto si strappa e nasce oceano; se il bordo si sposta prima, resta un bacino. I fiumi consumano ciò che
//      sporge DAL MARE (quello che l'acqua del pianeta fa, col suo peso) e lo depositano sulle coste, che così
//      avanzano: lo spessore dei continenti è l'equilibrio tra le catene, l'erosione fino al mare e il cedimento
//      della crosta che fonde in basso. Sotto un continente che resta fermo a lungo il mantello, coperto, si
//      scalda: la discesa si spegne, diventa una salita, e il continente si spacca. I pezzi vanno alla deriva e si
//      scontrano altrove (il ciclo dei supercontinenti: nessuno lo impone).
//   3. LA CROSTA OCEANICA nasce alle dorsali e dietro i continenti che si separano, invecchia
//      allontanandosi, affonda nelle fosse. Raffreddandosi si contrae: l'oceano è più profondo dove è
//      più vecchio.
//   4. LE QUOTE vengono dal galleggiamento della LITOSFERA (crosta più mantello freddo, sull'astenosfera calda:
//      litosfera()), misurate dalla dorsale; sotto il mare il peso dell'acqua le abbassa ancora.
//
// LEGGI E DATI (ciascuno con la fonte dov'è scritto: COSTANTI, litosfera(), crostaAttesa, passoCrosta):
//   · la colonna di McKenzie 1978 (via Angevine, Heller e Paola 1990, cap. 4 [V]): quote, stiramento, τ;
//   · lo stato di riferimento: l'energia potenziale media della litosfera (Coblentz e altri 1994 [V, riassunto]):
//     lo spessore neutro, quello a cui la spinta di un bordo debole smette di ispessire, è ricavato a ogni passo;
//   · la crosta che fonde scorre (700 °C, 10¹⁹ Pa·s: Beaumont e altri 2004 [V, riassunti]); l'attrito di Byerlee;
//   · il volume della crosta continentale terrestre (Cogley 1984 [V]) per crostaAttesa.
// LEGGI EMPIRICHE rimaste (misurate sulla Terra e usate così; i numeri sono in COSTANTI):
//   · la profondità dell'oceano con l'età: 2500 m + 350 m·√(milioni di anni), fino a 6000 m (profonditaOceano);
//   · la velocità delle placche: ricavata dal calore che portano (velocitaPlacche) se è dato lo stato del mantello; se no
//     4 cm/anno sulla Terra, e cresce come q² (legge di scala della convezione);
//   · lo spessore che uno scontro pieno regge: 70 km (il Tibet); tra quello e il neutro va come la forza (h²);
//   · l'erosione: i pendii si spianano (una catena larga 300 km in ~10 milioni di anni, se nulla la sostiene) e i
//     fiumi portano alle coste ciò che sporge dal mare (lo riducono a 1/e in 130 milioni di anni);
//   · la fossa: il fondo si piega in giù, fino a 2500 m, dove la crosta oceanica affonda.
// CON LA STORIA (test_tettonica): la Terra fa 19,6 km di spessore medio di crosta dei continenti (il vero 14,1) e continenti
// sul 49% (il vero ~40). Gli archi e il riciclo sono rapporti misurati oggi sulla Terra, usati per tutta la storia; manca il riciclo per
// erosione dove le fosse non toccano un continente. La delaminazione (COSTANTI.rhoEclogite) qui toglie poco: 1 km sulla Terra; sul
// pianeta d'avvio (0,67 masse terrestri) 18 km, perché lì l'eclogite comincia a 64 km, sotto l'isoterma dei 700 °C (52 km), e una
// radice che dura si scalda presto. La crosta che resta è la differenza di due flussi grandi (archi e fosse): un pozzo in più, anche
// piccolo rispetto a loro, la cambia molto (con la radice sempre calda e la viscosità del granito fuso i continenti sparivano).
// CHE COSA NON TORNA O MANCA (misurato su 8 Terre di prova, 2026-11: test_erosione, test_tettonica): le terre emerse sono
// il 24% qui e il 20% dopo erosione() (vero 29); la crosta continentale sommersa è l'11% (vero 11) da quando il sedimento
// dei fiumi si posa alla foce fino al pelo del mare (prima, in proporzione a quanto le celle erano fonde, era il 15%).
// La fascia 0–250 m sotto il mare (il 5% della superficie, come sulla Terra) batte ogni fascia abissale: la legge dei
// fondali, √età fino a 6000 m, sparge gli abissi su 3500 m invece di raccoglierli attorno a 4500. Il fine sospeso e le
// torbide che vanno ai fondali non ci sono: tutto il sedimento resta sul fronte dei delta. Un rift è
// largo una cella (150 km): i margini stirati a più celle non si formano (0,4% della superficie). Il mantello
// litosferico ispessito sotto le catene non si tiene (x ≥ 0), e manca il calore radioattivo della crosta: la crosta
// fonde solo oltre ~55–60 km, le radici delle catene vecchie restano finché l'erosione le toglie. I veli più sottili
// di 1 m vanno col fango. La rigidità è un conto a passate alterne: «stretta» conta il 50% in più del guadagno vero in
// uno scontro di prova. IL COSTO: una storia intera costa ~1,5 volte quella di prima (2 s contro 1,3): i conti in più
// sono la velocità d'entrata e d'uscita di ogni cella (rigidità), lo stiramento e lo stato termico che viaggiano con la
// crosta, il mare e l'energia media a ogni aggiornamento del mantello.
// CIÒ CHE PASSA ALL'EROSIONE (geologia.js erosione), senza cambiare niente di ciò che la crosta fa:
//   · la COPERTURA SEDIMENTARIA: quanta della crosta di ogni cella è sedimento posato nella storia (dai fiumi sulle
//     coste, dai pendii sulla cella accanto) e non più tolto. Va con la crosta, si ispessisce con lei, e ciò che finisce
//     sepolto sotto (Tmetamorfismo − Tsuolo)·conducibilità/q metri (sulla Terra 9,8 km) è già roccia metamorfica:
//     basamento. DATI: 300 °C, dove comincia la facies degli scisti verdi (ricordato, non riletto su una fonte); 3 W/m/K,
//     la conducibilità della roccia (lo stesso numero di materia.js, ancora scritto in due posti); q è quello di oggi.
//   · il SOLLEVAMENTO in m/anno: quanto la crosta si ispessisce oggi perché le placche la stringono (ciò che entra in una
//     cella meno ciò che ne uscirebbe se andasse rigida con chi le sta dietro), meno ciò che cede di lato sotto il proprio
//     peso, più la crosta nuova degli archi; per galleggia = 0,15 è la salita della superficie. Le velocità sono quelle
//     di questo modello (vTerra·(q/qTerra)²). E «regge»: di quanto può ancora salire prima che la crosta ceda.
//   · le due leggi empiriche dell'erosione qui sopra, cella per cella (consumata, posata): sono una SECONDA FONTE della
//     denudazione, a grana grossa e con un altro livello di base (la quota 0 di qui, non il mare vero che geologia.js
//     ricava dall'acqua; da quando la tettonica calcola il suo mare dalla stessa acqua i due livelli coincidono a ~10 m).
// PARAMETRI LIBERI (non misurati: scelti guardando il risultato, perché i continenti restino interi, si spacchino
// e si riuniscano): quanto è larga la zattera rigida, la coesione, quanto e in quanto tempo un continente scalda
// il mantello che ha sotto (rigida, coesione, coperta, inerzia).
// SEMPLIFICAZIONI: la carta è trattata come piana (longitudine periodica, i poli sono muri): vicino ai
// poli le forme sono stirate. La rigidità delle placche è approssimata (velocità uguale in modulo ovunque,
// continenti rigidi entro un ottavo di cella del mantello): niente faglie trasformi né rotazioni. Il calore
// q è quello di oggi per tutta la storia SOLO SE chi chiama non dà «tempo» (la tabella di storia.js): con la storia, a ogni
// passo valgono il calore, la velocità (per la mobilità di Korenaga), il basalto e il fuso di quel tempo (geologia.js la dà
// sempre). Il mantello è un'equazione delle celle, non le equazioni dei fluidi: il suo vigore (ε) è ancora 0,35·q/q⊕ (col q
// del tempo), la sua non linearità e la coperta dei continenti restano parametri della forma (PARAMETRI LIBERI).
// I sedimenti dei fiumi non seguono i fiumi uno per uno: si spargono sulle coste di tutto il pianeta.

import { comeSorgente } from './eventi.js';
import { STORIA } from './storia.js'; // (l'energia di attivazione della viscosità e la conducibilità del mantello: una fonte sola)
import { R_GAS, ANNO, RTERRA } from './leggi.js';
import { F_GRANITO } from './chimica.js'; // (quanta parte della crosta degli archi è il fuso chiaro che sale: il resto è il residuo denso, una fonte sola)
const RESIDUO = 1 - F_GRANITO;

export const COSTANTI = {
  hMisura: 38e3, // (m) lo spessore con cui si conta «quanta superficie» di continente c'è
  hMargine: 25e3, // lo spessore dei frammenti di crosta leggera non stirata (archi, altopiani): un velo spesso h copre h/hMargine della cella
  hMassimo: 70e3, // lo spessore che uno scontro pieno riesce a reggere (il Tibet) con la gravità della Terra: va come (g/g⊕)⁻¹ (Cowan e Abbot 2014 [V]: litosfera().hMassimo); senza spinta è hFermo, ricavato qui sotto
  bacino: 11.4e3, gTerra: 9.81, // (m, m/s²) il bacino più fondo possibile con la gravità della Terra, che va come (g/g⊕)⁻¹ (Cowan e Abbot 2014 [V])
  dorsale: 2500, raffredda: 350, abisso: 6000, // la profondità dell'oceano (m) con l'età (milioni di anni)
  fossa: 2500, // quanto si piega in giù la crosta oceanica dove affonda
  vTerra: 0.04, qTerra: 0.087, // (m/anno, W/m²) la velocità media delle placche terrestri e il calore che la muove
  qPlacche: 0.05, qVivo: 0.02, // sotto qPlacche (o senz'acqua) la crosta non si rompe; sotto qVivo il mantello è fermo
  fiumi: 130e6, // (anni) il tempo con cui i fiumi consumano ciò che sporge dal mare (si riduce a 1/e)
  erosione: 800, // (m²/anno) quanto in fretta i pendii si spianano: ciò che è alto scivola sulla cella accanto
  rigida: 0.12, // fin dove un continente va tutto insieme: il raggio della finestra, come frazione di una cella del mantello
  coesione: 0.5, // quanto forte la crosta robusta tira a sé quella vicina (celle per passo, per unità di differenza)
  Tmetamorfismo: 573, Tsuolo: 288, conducibilita: 3, // (K, K, W/m/K) dove un sedimento sepolto diventa roccia metamorfica, la superficie, la conducibilità della roccia
  inerzia: 4, // in quanti giri di cella il mantello sotto un continente si scalda (o si raffredda quando se ne va)
  coperta: 2.5, // quanto un continente scalda il mantello che ha sotto (nelle unità dell'equazione delle celle)
  // LA LITOSFERA (vedi litosfera()): i numeri di McKenzie 1978 come li riporta Angevine, Heller e Paola 1990, cap. 4 [V, letto 2026-11]
  rhoMantello: 3330, rhoCrosta: 2800, rhoAcqua: 1000, // (kg/m³) il mantello e la crosta dei continenti a 0 °C, l'acqua
  alfa: 3.28e-5, Tastenosfera: 1333, // (1/K; K sopra la superficie) la dilatazione termica; il salto di temperatura tra la superficie e la base della litosfera
  rhoBasalto: 2900, basalto: 7100, // (kg/m³; m) la crosta degli oceani: densità (Carlson e Raskin 1984: 2890 ± 40 [R]) e spessore (White e altri 1992: 7,1 ± 0,8 km [R]) se la storia del pianeta non lo dà
  Tfuso: 973, viscositaFusa: 1e19, // (K; Pa·s) sopra 700 °C la crosta comincia a fondere e scorre: la sua viscosità scende a ~10¹⁹ Pa·s (Beaumont e altri 2004 [V, dai riassunti: il testo intero non è stato letto])
  attrito: 0.65, // l'attrito della roccia (Byerlee: 0,6–0,7; lo stesso numero di storia.js)
  // LA CROSTA DEGLI ARCHI (con la storia, vedi evolviTettonica): la parte del basalto che affonda che torna su come crosta dei
  // continenti. Sulla Terra gli archi aggiungono ~2,5 km³/anno (Scholl e von Huene 2007 [R]) mentre affondano 3,45 km²/anno di
  // fondale (Parsons 1981 [R]) spessi 7,1 km (White e altri 1992, qui sopra): 2,5/24,5 = 0,10. È un rapporto misurato sulla
  // Terra, non una curva: quanto ne nasce lo decidono la velocità e le fosse del tempo
  archi: 0.10,
  // IL RICICLO alle fosse sotto i continenti: ~3,2 km³/anno sulla Terra, metà sedimenti che scendono e metà crosta erosa da sotto
  // (Scholl e von Huene 2007 [R]), sullo stesso fondale che affonda (24,5 km³/anno, qui sopra): 0,13. Più degli archi: una
  // fossa sotto un continente ne toglie più di quanta ne fa; la crosta cresce agli archi in mezzo al mare
  riciclo: 0.13,
  // LA DELAMINAZIONE (con la storia, vedi evolviTettonica): la crosta degli archi è basalto; rifondendo dà il fuso chiaro che sale
  // (chimica.js F_GRANITO) e lascia in basso un residuo di pirosseno e granato. Dove la base della crosta passa la pressione
  // dell'eclogite (storia.js STORIA.eclogite: la stessa soglia dei coperchi) il residuo diventa eclogite, più densa del mantello, e
  // se è abbastanza calda da scorrere (oltre Tfuso, qui sotto) si stacca e affonda (Kay e Kay 1993; Jull e Kelemen 2001 [a memoria]:
  // l'instabilità cresce in meno di 10 milioni di anni sopra i 700–800 °C). La radice affonda se pesa più del mantello: il residuo,
  // fatto eclogite, sì; la parte chiara no (alle stesse pressioni resta sotto i 3000 kg/m³), e resta. Del residuo si tiene il conto: lo
  // portano gli archi (1 − F_GRANITO della crosta nuova), lo tolgono la delaminazione e le fosse
  rhoEclogite: 3500, // (kg/m³) un'eclogite di basalto a 1,5 GPa (3400–3600: Jull e Kelemen 2001 [a memoria])
  // IL RITMO (Molnar e Houseman 2004; Conrad e Molnar 1997 [a memoria]): uno strato denso spesso L e viscoso η sopra un mantello più
  // debole cade come un'instabilità di Rayleigh-Taylor, con il ritmo q = q'·Δρ·g·L/η; q' è il ritmo adimensionale del modo più
  // veloce (~0,1). La viscosità della radice è quella della crosta che scorre (viscositaFusa a Tfuso) con la legge di Arrhenius della
  // roccia (storia.js STORIA.Enu), alla temperatura della geoterma della colonna a metà radice. LA GEOTERMA DI UNA CROSTA ISPESSITA:
  // stretta di β = h/hNeutro la colonna porta giù anche la sua litosfera fredda (McKenzie 1978, all'inverso dello stiramento), e la
  // temperatura a una profondità è quella di prima divisa per β; poi la colonna si riscalda col tempo della litosfera (τ, lo stesso
  // dello stato termico x): β_eff = 1 + (β − 1)·exp(−t/τ), t il tempo da cui la crosta di quella cella è oltre zDel (un tracciante
  // che viaggia con la crosta, come il residuo)
  ritmoRT: 0.1,
  // LA VISCOSITÀ DELLA RADICE: Jull e Kelemen 2001 [a memoria] trovano che una crosta inferiore densa cade in meno di 10 milioni di
  // anni solo se alla sua base ci sono più di ~800 °C. Qui quel punto: a Tradice, una radice di Lradice cade (q = 1/e) in tRadice; la
  // viscosità che ne esce (η = q'·Δρ·g⊕·L·t, ~5·10²⁰ Pa·s: quella delle radici dei loro conti, 10²⁰–10²¹) varia con la temperatura con
  // la legge di Arrhenius della roccia. (La viscosità della crosta che fonde, viscositaFusa, 10¹⁹ a 700 °C, è di un granito parzialmente
  // fuso, non di un'eclogite: con quella ogni radice cadeva in un milione di anni e i continenti sparivano nelle catene)
  Tradice: 1073, Lradice: 10e3, tRadice: 1e7,
  // SOTTO UN COPERCHIO (con la storia, vedi coperchio()): la scala di temperatura dello strato che convette sotto il coperchio,
  // ΔT_rh = 2,4·R·T²/E (Solomatov e Moresi 2000 [R])
  reologico: 2.4,
  acquaTerra: 1.4e18, // (m³) il mare terrestre, se chi chiama non dice quanta acqua ha il pianeta (allora: questa, in proporzione alla superficie)
};
const C = COSTANTI, C_PASSO = 0.3, PASSI_GROSSI = 2400, VELO = 1;

// ---------- LA LITOSFERA: a che quota galleggia una colonna, quando si stira, quanto regge.
// UNA COLONNA (McKenzie 1978, la stessa di Lachenbruch e Morgan 1990): crosta spessa h (densità ρc a 0 °C) sopra il
// mantello litosferico (ρ0 a 0 °C), fino alla profondità «ae» dove comincia l'astenosfera calda; la temperatura cresce in
// linea retta da 0 in superficie a T1 in fondo, e la roccia si dilata: ρ(T) = ρ(0)·(1 − α·T). La colonna GALLEGGIA
// sull'astenosfera (ρa = ρ0·(1 − α·T1)): la sua cima sta a B(h, ae) = ae − massa/ρa sopra la superficie libera
// dell'astenosfera. In forma chiusa [D]: B = −ae·θ + γ·h·(1 − α·T1·h/(2·ae)), con θ = α·T1/(2·(1 − α·T1)) e
// γ = (ρ0 − ρc)/ρa; se la crosta è più spessa della litosfera (ae < h) la parte sotto sta tutta a T1.
// IL LIVELLO ZERO è la DORSALE: una colonna senza litosfera fredda, con la crosta di basalto che il mantello produce,
// sotto «dorsale» metri d'acqua (la legge empirica dei fondali). Lo zero delle quote è il mare che lascia la dorsale a
// quella profondità (sulla Terra: il mare). «a», lo spessore della litosfera matura, è quello per cui il fondale vecchio
// sta ad «abisso»: così la legge dei fondali e questa sono UNA sola (un continente stirato all'infinito È un fondale
// vecchio), e lo stesso vale per il tempo: τ = a²/(π²·κ) (McKenzie [V]) con la κ che dà «raffredda»·√età, cioè
// τ = (16/π³)·((abisso − dorsale)/raffredda)² = 51,6 milioni di anni (con i numeri di McKenzie, a = 125 km e
// κ = 8·10⁻⁷ m²/s: 62,8 [V]). Le quote sono «in aria»: sotto il mare una colonna affonda ancora, di ρa/(ρa − ρw) volte.
// LO STIRAMENTO (McKenzie 1978 [V]): tirata, la litosfera si assottiglia tutta di un fattore β: h → h/β, ae → a/β. Qui lo
// stato termico è x = 1 − ae/a (0: litosfera matura; 1 − 1/β appena stirata; 1: astenosfera in superficie): la quota
// appena dopo è B(h/β, a/β) (subsidenza iniziale Si: la formula 4.2 di Angevine esce da qui, a 10⁻⁹: test_tettonica), poi
// x si spegne come e^(−t/τ) (il primo termine della serie di McKenzie: subsidenza termica) e la colonna scende ancora.
// QUANTO REGGE (derivato, [D]): una colonna pesa sui fianchi con l'integrale della sua pressione (energia potenziale).
// Quella che pesa quanto la dorsale non spinge e non è spinta: è lo spessore NEUTRO hN, quello a cui un continente che
// nessuno stringe smette di ispessirsi (prima era un numero fermo, hFermo = 39 km). Con i numeri qui sopra: 33,7 km (a
// +570 m); la differenza tra dorsale e fondale vecchio dà 2,6·10¹² N/m (la «spinta della dorsale» dei manuali) e 70 km
// di crosta 8,4·10¹² (il Tibet): la forza cresce come h² − hN², e così cresce lo spessore retto con la spinta.
// QUANDO CEDE (il «cedimento laterale» di prima era 3% a passo di ciò che superava hFermo, qualunque fosse il passo): la
// crosta più calda di Tfuso (700 °C) scorre come un fluido di viscosità η in un canale spesso c = h − zFuso·(1 − x), e il
// peso la spiana: ∂h/∂t = ∇·(D∇h), D = ρc·g·γ·c³/(12·η) (flusso di Poiseuille spinto dalla pendenza della quota). Con la
// geoterma della colonna zFuso = a·(Tfuso − Ts)/T1 (~55 km): le catene oltre quello spessore si allargano da sé in
// decine di milioni di anni; dove la litosfera è calda (x > 0) cede anche crosta più sottile; la crosta fredda no.
const memoLit = new Map();
export function litosfera({ dT = C.Tastenosfera, Ts = 273, alfa = C.alfa, rho0 = C.rhoMantello, rhoC = C.rhoCrosta, rhoW = C.rhoAcqua, rhoBasalto = C.rhoBasalto, basalto = C.basalto, g = 9.81 } = {}) {
  const chiave = [dT, Ts, alfa, rho0, rhoC, rhoW, rhoBasalto, basalto, g].join(); let L = memoLit.get(chiave); if (L) return L;
  // IL BACINO PIÙ FONDO che la gravità permette (Cowan e Abbot 2014 [V]): 11,4 km·(g/g⊕)⁻¹. Dove sta sopra l'abisso della legge
  // dei fondali (la Terra: 11,4 km contro 6) non cambia niente; dove sta sotto, tutta la legge si accorcia in proporzione (fondo:
  // la parte che resta), così la forma √età e τ restano quelle
  const fondoG = Math.min(1, (C.bacino * (C.gTerra / g)) / C.abisso), dorsaleG = C.dorsale * fondoG, abissoG = C.abisso * fondoG;
  const aT = alfa * dT, rhoA = rho0 * (1 - aT), teta = aT / (2 * (1 - aT)), gamma = (rho0 - rhoC) / rhoA, gammaB = (rho0 - rhoBasalto) / rhoA, gCaldo = 1 - rhoC / rho0, kCaldo = ((rhoC / rhoA) * aT) / 2;
  const aria = 1 - rhoW / rhoA, carica = 1 / aria, Bdorsale = basalto * (1 - rhoBasalto / rho0), salto = (abissoG - dorsaleG) * aria;
  // a: il fondale vecchio (basalto freddo sopra la litosfera matura) sta (abisso − dorsale) metri d'acqua sotto la dorsale
  let lo = basalto + 1, hi = 1e6; for (let n = 0; n < 60; n++) { const a = 0.5 * (lo + hi); if (Bdorsale - (-a * teta + gammaB * basalto * (1 - (aT * basalto) / (2 * a))) > salto) hi = a; else lo = a; }
  const a = 0.5 * (lo + hi), E0 = Bdorsale + dorsaleG * aria;
  const quota = (h, x = 0) => { const ae = a * (1 - x); return (ae >= h ? -ae * teta + gamma * h * (1 - (aT * h) / (2 * ae)) : h * gCaldo - ae * kCaldo) - E0; };
  const pendenza = (h, x = 0) => { const ae = a * (1 - x); return ae >= h ? gamma * (1 - (aT * h) / ae) : gCaldo; };
  // lo spessore a cui la cima della colonna sta alla quota s (l'inversa di quota)
  const base = (s, x = 0) => { const ae = a * (1 - x), y = s + E0 + ae * teta, d = 1 - (2 * aT * y) / (gamma * ae), h = d >= 0 && ae > 0 ? (ae / aT) * (1 - Math.sqrt(d)) : Infinity; return h <= ae ? (h > 0 ? h : 0) : Math.max(0, (s + E0 + ae * kCaldo) / gCaldo); };
  // l'energia potenziale: ∫ pressione dz dalla cima fino a una profondità comune, per strati di densità lineare
  const fondo = 2 * a + 1e5, peso = (strati) => { let P = 0, u = 0; for (const [z0, z1, r0, r1] of strati) { const n = 300, dz = (z1 - z0) / n; for (let i = 0; i < n; i++) { const r = r0 + ((r1 - r0) * (i + 0.5)) / n; u += (P + 0.5 * r * g * dz) * dz; P += r * g * dz; } } return u; };
  const Udorsale = peso([[0, dorsaleG, rhoW, rhoW], [dorsaleG, dorsaleG + basalto, rhoBasalto * (1 - aT), rhoBasalto * (1 - aT)], [dorsaleG + basalto, fondo, rhoA, rhoA]]);
  const forza = (h) => { const z = -quota(h, 0), Tm = (aT * Math.min(h, a)) / a; return peso(h < a ? [[z, z + h, rhoC, rhoC * (1 - Tm)], [z + h, z + a, rho0 * (1 - Tm), rhoA], [z + a, fondo, rhoA, rhoA]] : [[z, z + a, rhoC, rhoC * (1 - aT)], [z + a, z + h, rhoC * (1 - aT), rhoC * (1 - aT)], [z + h, fondo, rhoA, rhoA]]) - Udorsale; }; // (N/m) quanto una colonna asciutta spinge più della dorsale
  lo = 5e3; hi = 9e4; for (let n = 0; n < 50; n++) { const m = 0.5 * (lo + hi); if (forza(m) > 0) hi = m; else lo = m; }
  const hN = 0.5 * (lo + hi), tau = (16 / Math.PI ** 3) * ((C.abisso - C.dorsale) / C.raffredda) ** 2 * 1e6, zFuso = (a * (C.Tfuso - Ts)) / dT;
  // la spinta della dorsale (N/m): quanto la dorsale pesa più del fondale vecchio (basalto freddo, litosfera matura, sotto «abisso» d'acqua)
  const Tb = (aT * basalto) / a, spinta = Udorsale - peso([[0, abissoG, rhoW, rhoW], [abissoG, abissoG + basalto, rhoBasalto, rhoBasalto * (1 - Tb)], [abissoG + basalto, abissoG + a, rho0 * (1 - Tb), rhoA], [abissoG + a, fondo, rhoA, rhoA]]);
  // la resistenza della litosfera fredda (N/m): l'attrito di Byerlee con l'acqua nei pori, μ·(1 − ρw/ρc)·ρc·g·z, sommato fino a zFuso, dove la roccia scorre
  const resistenza = (C.attrito * (1 - rhoW / rhoC) * rhoC * g * zFuso * zFuso) / 2, xDebole = resistenza > spinta ? 1 - Math.sqrt(spinta / resistenza) : 0;
  // la stessa forza in tabella (ogni 500 m di crosta, litosfera matura), per chi la chiede cella per cella, e la sua inversa;
  // e quella di un fondale: la spinta della dorsale cresce come l'età e la profondità come la sua radice, quindi come
  // (profondità − dorsale)², fino al fondale vecchio
  const PASSO_F = 500, tab = Float64Array.from({ length: 221 }, (_, i) => forza(i * PASSO_F));
  const forzaDi = (h) => { const t = h / PASSO_F, i = t >= 219 ? 219 : t | 0; return tab[i] + (tab[i + 1] - tab[i]) * (t - i); };
  const spessoreDi = (F) => { let i0 = 0, i1 = 220; if (F <= tab[0]) return 0; if (F >= tab[220]) return 220 * PASSO_F; while (i1 - i0 > 1) { const im = (i0 + i1) >> 1; if (tab[im] > F) i1 = im; else i0 = im; } return PASSO_F * (i0 + (F - tab[i0]) / (tab[i1] - tab[i0])); };
  const forzaOceano = (etaMa) => { const f = (profonditaOceano(etaMa, fondoG) - dorsaleG) / (abissoG - dorsaleG); return -spinta * f * f; };
  L = { a, aT, rhoA, aria, carica, E0, tau, hN, galleggia: pendenza(hN, 0), quota, pendenza, base, forza, forzaDi, spessoreDi, forzaOceano, basalto, oceano: (etaMa) => -aria * profonditaOceano(etaMa, fondoG), fondoG, hMassimo: C.hMassimo * (C.gTerra / g), // (lo spessore che uno scontro pieno regge: 70 km·(g/g⊕)⁻¹, Cowan e Abbot 2014 [V])
    aTeta: a * teta, zFuso, cede: (rhoC * g * gamma) / (12 * C.viscositaFusa), spinta, resistenza, xDebole }; // cede·c³ = D (m²/s)
  memoLit.set(chiave, L); if (memoLit.size > 32) memoLit.delete(memoLit.keys().next().value); return L;
}
// LEGGE EMPIRICA: la profondità (m) del fondo dell'oceano secondo l'età della crosta (milioni di anni): la
// crosta nuova è calda e alta (la dorsale), raffreddandosi si contrae e scende.
export const profonditaOceano = (etaMa, fondo = 1) => fondo * Math.min(C.abisso, C.dorsale + C.raffredda * Math.sqrt(Math.max(0, etaMa)));
// la litosfera con i numeri di qui sopra (chi chiama i pezzi a mano, senza un pianeta): da lei i tre numeri ricavati
// che prima erano scritti: hFermo (lo spessore neutro: prima 39 km), hZero (lo stesso: la crosta «normale», misura
// della robustezza; prima 35 km) e galleggia (di quanto sale la superficie per metro di crosta in più; prima 0,15)
const LIT0 = litosfera();
C.hFermo = LIT0.hN; C.hZero = LIT0.hN; C.galleggia = LIT0.galleggia;

// ---------- la trasformata di Fourier (griglie periodiche, lati potenze di 2)
const tabelle = new Map();
function tabella(n) {
  let t = tabelle.get(n); if (t) return t;
  const inv = new Uint16Array(n), co = new Float64Array(n / 2), si = new Float64Array(n / 2);
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; inv[i] = j; }
  for (let k = 0; k < n / 2; k++) { co[k] = Math.cos((2 * Math.PI * k) / n); si[k] = Math.sin((2 * Math.PI * k) / n); }
  tabelle.set(n, (t = { inv, co, si })); return t;
}
function fft(re, im, n, inversa) {
  const { inv, co, si } = tabella(n), segno = inversa ? 1 : -1;
  for (let i = 1; i < n; i++) { const j = inv[i]; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
  for (let len = 2, salto = n >> 1; len <= n; len <<= 1, salto >>= 1) { const m = len >> 1;
    for (let i = 0; i < n; i += len) for (let k = 0, t = 0; k < m; k++, t += salto) {
      const wr = co[t], wi = segno * si[t], a = i + k, b = a + m, vr = re[b] * wr - im[b] * wi, vi = re[b] * wi + im[b] * wr;
      re[b] = re[a] - vr; im[b] = im[a] - vi; re[a] += vr; im[a] += vi;
    } }
  if (inversa) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}
function fft2(re, im, W, H, inversa) {
  const t = tabella(Math.max(W, H)), r = (t.r ??= new Float64Array(Math.max(W, H))), m = (t.m ??= new Float64Array(Math.max(W, H)));
  for (let y = 0; y < H; y++) { const o = y * W; for (let x = 0; x < W; x++) { r[x] = re[o + x]; m[x] = im[o + x]; } fft(r, m, W, inversa); for (let x = 0; x < W; x++) { re[o + x] = r[x]; im[o + x] = m[x]; } }
  for (let x = 0; x < W; x++) { for (let y = 0; y < H; y++) { r[y] = re[y * W + x]; m[y] = im[y * W + x]; } fft(r, m, H, inversa); for (let y = 0; y < H; y++) { re[y * W + x] = r[y]; im[y * W + x] = m[y]; } }
}

// ---------- IL MANTELLO: ∂u/∂t = εu − (1+∇²)²u + g·u² − u³ + coperta. u > 0 dove sale (caldo), u < 0 dove scende.
// «onde» celle lungo l'equatore. La carta (Wm × Hm, larga il doppio di quanto è alta) è la metà di un quadrato
// periodico, l'altra metà è la sua immagine allo specchio: così ai poli il mantello non attraversa il bordo (come la
// crosta, che lì trova un muro).
// LO STATO INIZIALE. Se è data «impronta» è l'anomalia termica lasciata dagli urti della formazione (impatti.js,
// improntaMantello: caldo dove sono caduti gli urti più grandi e più tardi): una mappa lon × lat larga il doppio di
// quanto è alta (un Float32Array di qualunque grana, o una funzione (W, H) → mappa), portata sulla griglia del
// mantello, a media zero, e scalata perché il suo massimo valga 0,025 (la stessa ampiezza del rumore che sostituisce:
// l'equazione parte piccola e cresce da sé; conta la forma, non la misura). Se manca, o è tutta uguale (un pianeta
// che nessun urto ha segnato), resta il ripiego: un rumore minuscolo tirato da «seme», che sta per le irregolarità
// del mantello appena solidificato che qui non si calcolano (in cosmo.js è un numero legato all'indirizzo del pianeta).
function mantello({ onde, epsilon, seme, impronta = null }) {
  const Wm = onde <= 8 ? 64 : 128, Hm = Wm / 2, Nm = Wm * Hm, Nq = Wm * Wm, dk = 1 / onde, g = -1.2; // g < 0: il mantello è scaldato soprattutto da DENTRO (il decadimento radioattivo) e raffreddato da sopra, perciò le discese fredde sono concentrate e le salite sono larghe e formano una rete (le dorsali)
  const caso = comeSorgente(seme, 'mantello').serie('irregolarità'); // (un evento solo, «mantello seme/irregolarità»: l'estrazione k è quella della cella k, in qualunque ordine la si chieda)
  const u = new Float64Array(Nm).map((_, k) => 0.05 * (caso(k) - 0.5)), re = new Float64Array(Nq), im = new Float64Array(Nq), k4 = new Float64Array(Nq);
  let daUrti = false;
  if (impronta) {
    const src = typeof impronta === 'function' ? impronta(Wm, Hm) : impronta, Ws = Math.round(Math.sqrt(2 * src.length)), Hs = Ws / 2, v = new Float64Array(Nm);
    if (Ws * Hs !== src.length) throw new Error('tettonica: l\'impronta deve essere una mappa larga il doppio di quanto è alta');
    // sulla griglia del mantello: la media delle celle dell'impronta che cadono in ogni cella (se è più grossa, quella in cui cade il centro)
    let media = 0, massimo = 0;
    for (let y = 0; y < Hm; y++) for (let x = 0; x < Wm; x++) { const i0 = Math.floor((x * Ws) / Wm), i1 = Math.max(i0 + 1, Math.floor(((x + 1) * Ws) / Wm)), j0 = Math.floor((y * Hs) / Hm), j1 = Math.max(j0 + 1, Math.floor(((y + 1) * Hs) / Hm)); let a = 0;
      for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) a += src[j * Ws + i]; v[y * Wm + x] = a / ((i1 - i0) * (j1 - j0)); media += v[y * Wm + x] / Nm; }
    for (let k = 0; k < Nm; k++) { v[k] -= media; massimo = Math.max(massimo, Math.abs(v[k])); }
    if (massimo > 0 && Number.isFinite(massimo)) { for (let k = 0; k < Nm; k++) u[k] = (0.025 * v[k]) / massimo; daUrti = true; }
  }
  for (let y = 0; y < Wm; y++) for (let x = 0; x < Wm; x++) { const kx = (x < Wm / 2 ? x : x - Wm) * dk, ky = (y < Wm / 2 ? y : y - Wm) * dk; k4[y * Wm + x] = (1 - kx * kx - ky * ky) ** 2; }
  // un passo: la parte che si piega da sé (u², u³) e la coperta in modo esplicito, la diffusione in modo implicito
  const passo = (dt, coperta = null, eps = epsilon) => {
    for (let y = 0; y < Hm; y++) for (let x = 0; x < Wm; x++) { const i = y * Wm + x, v = u[i], f = v + dt * (g * v * v - v * v * v + (coperta ? coperta[i] : 0)); re[i] = f; re[(Wm - 1 - y) * Wm + x] = f; }
    im.fill(0); fft2(re, im, Wm, Wm, false);
    for (let i = 0; i < Nq; i++) { const l = 1 / (1 - dt * (eps - k4[i])); re[i] *= l; im[i] *= l; }
    re[0] = 0; im[0] = 0; // la media non cambia: il moto sposta il calore, non lo crea
    fft2(re, im, Wm, Wm, true);
    for (let y = 0; y < Hm; y++) for (let x = 0; x < Wm; x++) u[y * Wm + x] = 0.5 * (re[y * Wm + x] + re[(Wm - 1 - y) * Wm + x]);
  };
  // il campo visto su una griglia W×H qualsiasi (centri delle celle): media a blocchi se è più grossa,
  // interpolazione liscia (cubica, prima lungo x poi lungo y) se è più fine
  const tmp = {}, su = (W, H, out = new Float64Array(W * H)) => {
    if (W === Wm) out.set(u);
    else if (W < Wm) { const r = Wm / W; for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { let a = 0; for (let b = 0; b < r; b++) for (let c = 0; c < r; c++) a += u[(j * r + b) * Wm + i * r + c]; out[j * W + i] = a / (r * r); } }
    else {
      const r = W / Wm, T = (tmp[W] ??= new Float64Array(W * Hm)), pesi = (t) => [(-t + 2 * t * t - t * t * t) / 2, (2 - 5 * t * t + 3 * t * t * t) / 2, (t + 4 * t * t - 3 * t * t * t) / 2, (-t * t + t * t * t) / 2];
      for (let i = 0; i < W; i++) { const x = (i + 0.5) / r - 0.5, x0 = Math.floor(x), [a, b, c, d] = pesi(x - x0), i0 = (x0 - 1 + Wm) % Wm, i1 = (x0 + Wm) % Wm, i2 = (x0 + 1) % Wm, i3 = (x0 + 2) % Wm;
        for (let y = 0; y < Hm; y++) { const o = y * Wm; T[y * W + i] = a * u[o + i0] + b * u[o + i1] + c * u[o + i2] + d * u[o + i3]; } }
      const sp = (y) => (y < 0 ? -1 - y : y >= Hm ? 2 * Hm - 1 - y : y) * W;
      for (let j = 0; j < H; j++) { const y = (j + 0.5) / r - 0.5, y0 = Math.floor(y), [a, b, c, d] = pesi(y - y0), o0 = sp(y0 - 1), o1 = sp(y0), o2 = sp(y0 + 1), o3 = sp(y0 + 2);
        for (let i = 0; i < W; i++) out[j * W + i] = a * T[o0 + i] + b * T[o1 + i] + c * T[o2 + i] + d * T[o3 + i]; }
    }
    return out;
  };
  // quante celle: le discese concentrate (i minimi del campo)
  const celle = () => { let mx = 0, n = 0; for (const v of u) if (-v > mx) mx = -v;
    for (let y = 0; y < Hm; y++) for (let x = 0; x < Wm; x++) { const v = -u[y * Wm + x]; if (v < 0.35 * mx) continue; let cima = true; for (let b = -1; b <= 1 && cima; b++) for (let a = -1; a <= 1; a++) { const yy = y + b; if ((a || b) && yy >= 0 && yy < Hm && -u[yy * Wm + ((x + a + Wm) % Wm)] > v) { cima = false; break; } } if (cima) n++; }
    return n; };
  return { Wm, Hm, u, passo, su, celle, daUrti };
}

// ---------- dalla forma del mantello alla velocità della superficie. La crosta scivola giù dal «colle» caldo
// verso la «valle» fredda, nella direzione di −∇u. Ma la litosfera è RIGIDA: una placca va tutta alla stessa
// velocità, e si deforma solo ai bordi. Perciò dal mantello si prende la direzione, e la velocità è la stessa
// ovunque (c0 celle per passo), salvo spegnersi proprio sopra le dorsali e le fosse, dove cambia verso.
// cx, cy: frazione di cella che attraversa in un passo il lato est e il lato sud (ai poli c'è un muro).
// Dove il flusso converge (conv, 0…1) la spinta regge crosta più spessa (cap): da hFermo, lo spessore neutro (nessuna
// spinta), a hMassimo (uno scontro pieno); la forza che una colonna oppone cresce come h² − hFermo² (litosfera(), forza),
// perciò è il QUADRATO dello spessore retto che cresce in proporzione alla spinta. «regge»: { fermo, massimo } del
// pianeta (se manca: quelli della litosfera di riserva).
export function campoDaPotenziale(u, W, H, c0, ca = null, regge = null) {
  const N = W * H; ca ??= { cx: new Float64Array(N), cy: new Float64Array(N), cap: new Float64Array(N), conv: new Float32Array(N), apre: new Float32Array(N), vx: new Float64Array(N), vy: new Float64Array(N) };
  const { cx, cy, cap, conv, apre, vx, vy } = ca; let s2 = 0;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i, a = 0.5 * (u[j * W + ((i + 1) % W)] - u[j * W + ((i + W - 1) % W)]), b = 0.5 * (u[j < H - 1 ? k + W : k] - u[j > 0 ? k - W : k]); vx[k] = a; vy[k] = b; s2 += a * a + b * b; }
  const d2 = 0.06 * (s2 / N) + 1e-300; // (sotto un quarto della pendenza media la crosta rallenta: i bordi delle placche)
  for (let k = 0; k < N; k++) { const m = -c0 / Math.sqrt(vx[k] * vx[k] + vy[k] * vy[k] + d2); vx[k] *= m; vy[k] *= m; }
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i; cx[k] = 0.5 * (vx[k] + vx[j * W + ((i + 1) % W)]); cy[k] = j < H - 1 ? 0.5 * (vy[k] + vy[k + W]) : 0; }
  const is = c0 > 0 ? 1 / c0 : 0, hF2 = (regge?.fermo ?? C.hFermo) ** 2, hM2 = Math.max(hF2, (regge?.massimo ?? C.hMassimo) ** 2); // (conta solo la convergenza netta dei bordi di placca, non quella larga e debole attorno)
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, stringe = (cx[j * W + ((i + W - 1) % W)] - cx[k] + (j > 0 ? cy[k - W] : 0) - cy[k]) * is, c = Math.max(0, Math.min(1, (stringe - 0.15) / 0.6));
    apre[k] = Math.max(0, Math.min(1, (-stringe - 0.15) / 0.6)); // (lo stesso, dove il flusso diverge: i bordi che si aprono)
    conv[k] = c; cap[k] = Math.sqrt(hF2 + (hM2 - hF2) * c); // quanto il flusso converge qui (0…1), e la crosta che regge
  }
  ca.c0 = c0; ca.hZero = regge?.normale ?? regge?.fermo ?? C.hZero; return ca;
}

// la media su una finestra quadrata di lato 2R+1 (in longitudine si fa il giro, ai poli la finestra si accorcia)
function sfoca(src, dst, tmp, W, H, R) {
  for (let j = 0; j < H; j++) { const r = j * W; let s = 0; for (let d = -R; d <= R; d++) s += src[r + ((d + W) % W)]; for (let i = 0; i < W; i++) { tmp[r + i] = s; s += src[r + ((i + R + 1) % W)] - src[r + ((i - R + W) % W)]; } }
  for (let i = 0; i < W; i++) { let s = 0; for (let d = 0; d <= Math.min(R, H - 1); d++) s += tmp[d * W + i]; for (let j = 0; j < H; j++) { dst[j * W + i] = s; if (j + R + 1 < H) s += tmp[(j + R + 1) * W + i]; if (j - R >= 0) s -= tmp[(j - R) * W + i]; } }
}

// quanto è robusta (0…1) la crosta secondo lo spessore: quella dei continenti è una lastra rigida, i veli sottili no
const robusta = (h, ih0) => { let f = h * ih0; if (f > 1) f = 1; f *= f; return f * f; };

// ---------- la velocità dei CONTINENTI. Un continente è una zattera rigida: non segue il mantello punto per
// punto, ma va tutto insieme, alla media delle spinte che riceve (qui: la media, su una finestra larga R celle,
// della velocità del mantello pesata con quanto è robusta la crosta: quella spessa è molto più forte di quella
// sottile). Perciò un continente tirato da due parti non si assottiglia come una pasta: cede dove è più debole
// e si spacca, e i due pezzi se ne vanno interi. La crosta sottile (veli, archi) segue invece il mantello.
// hx, hy: come cx, cy, ma per la crosta continentale.
export function velocitaCrosta(h, ca, W, H, R) {
  const N = W * H, { vx, vy, c0 } = ca, hZero = ca.hZero ?? C.hZero, ih0 = 1 / hZero;
  const hx = (ca.hx ??= new Float64Array(N)), hy = (ca.hy ??= new Float64Array(N)), tetto = (ca.tetto ??= new Float64Array(N));
  const A = (ca.A ??= new Float64Array(N)), B = (ca.B ??= new Float64Array(N)), P = (ca.P ??= new Float64Array(N)), p = (ca.p ??= new Float64Array(N)), Q = (ca.Q ??= new Float64Array(N)), T = (ca.T ??= new Float64Array(N));
  let c = false; for (let k = 0; k < N; k++) { const f = robusta(h[k], ih0); p[k] = f; A[k] = f * vx[k]; B[k] = f * vy[k]; if (f > 1e-4) c = true; }
  if (c) {
    // quanto è robusta la lastra attorno a ogni cella (5 × 5 celle: una lastra non ha crepe larghe una cella sola)
    for (let giro = 0; giro < 2; giro++) { sfoca(giro ? Q : p, Q, T, W, H, 1); for (let j = 0; j < H; j++) { const nj = (Math.min(H - 1, j + 1) - Math.max(0, j - 1) + 1) * 3; for (let i = 0; i < W; i++) Q[j * W + i] /= nj; } }
    sfoca(A, A, T, W, H, R); sfoca(B, B, T, W, H, R); sfoca(p, P, T, W, H, R);
    for (let k = 0; k < N; k++) { const f = Q[k], q = P[k]; if (q > 1e-9) { A[k] = vx[k] + f * (A[k] / q - vx[k]); B[k] = vy[k] + f * (B[k] / q - vy[k]); } else { A[k] = vx[k]; B[k] = vy[k]; } }
  } else { A.set(vx); B.set(vy); Q.fill(0); }
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i; hx[k] = 0.5 * (A[k] + A[j * W + ((i + 1) % W)]); hy[k] = j < H - 1 ? 0.5 * (B[k] + B[k + W]) : 0; }
  // la COESIONE: la lastra tiene insieme. La crosta è tirata verso dove, lì attorno, c'è più crosta robusta, finché
  // lì la crosta è più sottile del normale (c'è posto): così un continente stirato non diventa un velo, ma si
  // strappa in pezzi che restano spessi. Su un continente intero non fa nulla: non lo frena e non lo schiaccia
  if (c && C.coesione > 0) { const kc = (C.coesione * c0) / 0.3, ip = 1 / (hZero - C.hMargine), posto = (k) => { const f = (hZero - h[k]) * ip; return f <= 0 ? 0 : f < 1 ? f : 1; };
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i, e = j * W + ((i + 1) % W), gx = kc * (Q[e] - Q[k]); if (gx !== 0) hx[k] += gx * posto(gx > 0 ? e : k);
      if (j < H - 1) { const gy = kc * (Q[k + W] - Q[k]); if (gy !== 0) hy[k] += gy * posto(gy > 0 ? k + W : k); } } }
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, esce = Math.max(hx[k], 0) + Math.max(-hx[j * W + ((i + W - 1) % W)], 0) + Math.max(hy[k], 0) + Math.max(j > 0 ? -hy[k - W] : 0, 0);
    tetto[k] = esce > 0.35 ? 0.7 / esce : 2; // da una cella non può uscire più di quello che c'è
  }
  return ca;
}

// le vicine di ogni cella: v (a est, o a sud), m (dalla parte opposta), p (oltre v). In longitudine si fa il giro; ai poli ci si ferma
function vicine(W, H) {
  const N = W * H, g = { v: [new Int32Array(N), new Int32Array(N)], m: [new Int32Array(N), new Int32Array(N)], p: [new Int32Array(N), new Int32Array(N)] };
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i; g.v[0][k] = j * W + ((i + 1) % W); g.m[0][k] = j * W + ((i + W - 1) % W); g.p[0][k] = j * W + ((i + 2) % W); g.v[1][k] = j < H - 1 ? k + W : k; g.m[1][k] = j > 0 ? k - W : k; g.p[1][k] = j < H - 2 ? k + 2 * W : j < H - 1 ? k + W : k; }
  return g;
}

// ---------- UN PASSO DELLA CROSTA. stato = { W, H, h (spessore della crosta continentale, m), a (età della crosta
// oceanica, milioni di anni), sub (quanta crosta oceanica è affondata qui nell'ultimo passo, in frazione di cella) }.
// Tutto è scritto come scambio tra celle vicine: ciò che esce da una entra nell'altra, quindi la crosta
// continentale si conserva esattamente (salvo «apporto», la crosta nuova, distribuita dove l'oceano affonda; ciò che
// i fiumi portano via resta in viaggio un passo, in stato.fango, e si deposita al passo dopo). campo = quello fatto
// da campoDaPotenziale e poi velocitaCrosta. dtMa: milioni di anni del passo; kappa, fiumi: erosione per passo;
// cede: il cedimento della crosta che fonde (litosfera().cede × secondi del passo / lato della cella², in 1/m³).
// LA LITOSFERA (se lo stato la porta: st.lit, st.mare, st.m, st.x; se no vale quella di riserva, il mare a quota 0,
// nessuno stiramento):
//   · st.mare: la quota del mare (m, sullo zero della litosfera). Fiumi e pendii consumano ciò che sporge DAL MARE: lo
//     spessore di base di una cella, hb, è quello a cui la sua colonna (col suo stato termico) ha la cima sul mare;
//   · st.m: lo spessore a cui la crosta di una cella copre la cella intera (hMargine per i frammenti non stirati); la
//     cella è coperta per h/m, il resto è fondale. LO STIRAMENTO: dove la crosta è tirata da due parti (la velocità
//     diverge lungo un asse e da entrambi i lati c'è crosta continentale) si assottiglia restando intera: m cala con
//     h, la cella resta coperta. Non oltre lo spessore della crosta di basalto che il mantello, risalendo, mette al suo
//     posto: lì il rift è riuscito, la crosta si strappa e nasce fondale (età zero). Stretta, m risale;
//   · st.x: lo stato termico della litosfera (0 matura; 1 − 1/β appena stirata di β): viaggia con la crosta, cresce
//     con lo stiramento, torna indietro con la compressione (mai sotto 0: il mantello litosferico ispessito sotto una
//     catena qui non si tiene: si stacca), e si spegne come e^(−t/τ).
export function passoCrosta(st, ca, { dtMa = 1, kappa = 0, apporto = 0, fiumi = 0, cede = 0 } = {}) {
  const { W, H } = st, N = W * H, L = st.lit || LIT0, hM = C.hMargine;
  // (tutto ciò che il passo tiene nello stato, creato la prima volta; poi quattro tempi, ciascuno una funzione: gli scambi
  // tra celle vicine, l'ingorgo e la tenuta, lo spostamento, il bilancio di ogni cella)
  if (!st.passa) { st.m ??= new Float64Array(N).fill(hM); st.x ??= new Float64Array(N); st.im ??= Float64Array.from(st.m, (v) => 1 / v); st.hb = new Float64Array(N).fill(L.base(Number.isFinite(st.mare) ? st.mare : 0, 0));
    for (const nome of ['dh', 'dw', 'dq', 'vten', 'vin', 'vout', 'numM', 'numX', 'entra', 'esce', 'sete']) st[nome] ??= new Float64Array(N);
    st.tira = new Float64Array(N).fill(1); st.passa = new Float64Array(N).fill(1); st.tiene = new Uint8Array(2 * N); st.piena = Uint8Array.from(st.h, (v, k) => (v > 0 && v * st.im[k] >= 1 ? 1 : 0)); st.asciutta = Uint8Array.from(st.h, (v, k) => (v > 0 && v >= st.hb[k] ? 1 : 0)); st.FF = new Float64Array(2 * N); st.geo = vicine(W, H);
    if (st.cop) { st.dc ??= new Float64Array(N); st.via ??= new Float64Array(N); } if (st.res) { st.dr ??= new Float64Array(N); st.de ??= new Float64Array(N); } st.verso = false; st.xMax ??= 1; }
  scambi(st, ca); ingorgo(st, ca, L); sposta(st, ca, L, kappa, cede); bilancio(st, ca, L, dtMa, apporto, fiumi);
  return st;
}
  // lo scambio attraverso ogni lato, tra la cella k e la sua vicina v (velocità > 0: da k a v); prima i lati est, poi
  // i lati sud. m e p: le celle oltre k e oltre v. c: la velocità del mantello (porta la crosta oceanica); ch: quella
  // della crosta continentale
function scambi(st, ca) {
  const { W, H, h, a, im, dw, dq, tira, vten, tiene, piena, vin, vout, geo, FF, entra, esce, passa } = st, N = W * H, { cx, cy, hx, hy, tetto } = ca;
  for (let verso = 0; verso < 2; verso++) { const vv = geo.v[verso], mm = geo.m[verso], pp = geo.p[verso], cm = verso ? cy : cx, cc = verso ? hy : hx, fine = verso ? N - W : N, o = verso * N;
    for (let k = 0; k < fine; k++) { const v = vv[k], c = cm[k], ch = cc[k], hk = h[k], hv = h[v];
      // la crosta oceanica (la parte di cella non coperta dal continente) va col mantello, con la sua età
      if (c !== 0) { const d = c > 0 ? k : v; let wd = 1 - h[d] * im[d]; if (wd > 0) { wd *= c; dw[k] -= wd; dw[v] += wd; wd *= a[d]; dq[k] -= wd; dq[v] += wd; } }
      const hd = ch > 0 ? hk : hv; let F = 0;
      if (ch !== 0 && hd > 0) {
        // la crosta continentale: quanta ne passerebbe (guardando anche la cella a monte, per non sfumare i bordi dei continenti)
        const d = ch > 0 ? k : v, n = ch > 0 ? v : k, b = ch > 0 ? mm[k] : pp[k], D = (ch > 0 ? hv : hk) - hd; let f = hd;
        if (D !== 0) { const r = (hd - h[b]) / D; if (r > 0) f += 0.5 * (1 - (ch > 0 ? ch : -ch)) * ((2 * r) / (1 + r)) * D; }
        const t = hd * tetto[d]; if (f > t) f = t;
        // (oltre alla crosta, le VELOCITÀ: vin, quella con cui la crosta arriva, per quanto chi la cede era tenuto un attimo
        // fa; vout, quella con cui esce, per quanto chi sta davanti la lascia passare; vten, la parte di vout che passa per i
        // lati TENUTI: chi cede è tenuto da dietro se anche la cella alle sue spalle è tutta crosta continentale)
        F = ch * f; f = F > 0 ? F : -F; const pn = passa[n], u = (ch > 0 ? ch : -ch) * pn; entra[n] += f; vin[n] += (ch > 0 ? ch : -ch) * tira[d]; esce[d] += f * pn; vout[d] += u;
        if (b !== d && piena[b]) { tiene[o + k] = 1; vten[d] += u; } else tiene[o + k] = 0;
      }
      FF[o + k] = F;
    } }
}
  // …ma la crosta non si lascia comprimere oltre lo spessore che la spinta di lì riesce a reggere: in una cella
  // ne entra solo quanta ne esce (per quel che chi le sta davanti lasciava passare un attimo fa), più lo spazio
  // che resta. È l'ingorgo, che risale all'indietro: il continente si ferma e si allarga invece di accartocciarsi.
  // LO SPAZIO. Dove un bordo di placca stringe (conv > 0): fino allo spessore che quella spinta regge (cap). ALTROVE LA
  // LITOSFERA FREDDA È RIGIDA: la sua resistenza (litosfera().resistenza) è molte volte la spinta della dorsale, e non si
  // ispessisce: la crosta entra alla velocità con cui esce (vout / vin: è la traslazione rigida; un fronte che avanza
  // passa, una convergenza no). Fanno eccezione la cella non ancora tutta coperta (i frammenti si accostano fino a
  // coprirla), la litosfera ancora calda e debole (x oltre la soglia): quella la spinta della dorsale la stringe, fino
  // allo spessore neutro, e il FRONTE di una lastra che avanza (la cella che cede a una non tutta coperta): lì la coesione
  // (velocitaCrosta) frena la crosta sottile che sta davanti, e la lastra la raccoglie fino allo spessore normale.
  // (Prima lo spazio era, ovunque, fino a hFermo = 39 km: ogni continente ci finiva inchiodato.)
  // …E NON SI LASCIA NEMMENO STIRARE: la stessa lastra fredda regge anche la trazione. Da una cella tenuta da dietro la
  // crosta esce, per i lati tenuti, solo alla velocità con cui le arriva; per i lati liberi (il bordo di un continente che
  // si allontana dal fondale) esce come vuole. Si lascia stirare dove un bordo di placca si apre sotto di lei (apre > 0:
  // lì il mantello sale e diverge: un rift), dove la litosfera è ancora calda e debole, e dove la cella non è tutta
  // coperta. Come l'ingorgo, il vincolo risale la lastra passo dopo passo (tira resta in memoria). Alla fine vten[k] è
  // la PARTE della velocità d'uscita di k che passa per i lati tenuti (0…1)
  // (IL CONTO DELL'INGORGO: una passata sulle celle, un passo a ritroso e il passo dopo in avanti. Quando una cella cambia
  // quanto lascia passare lo dice subito a chi le cede crosta (ne corregge ciò che esce): così l'ingorgo risale tutta la
  // lastra nella stessa passata, lungo il verso in cui la si percorre, invece che di una cella a giro. Prima si rifaceva
  // il conto di tutti i lati due volte a passo, e l'ingorgo risaliva di due celle a passo: nel frattempo la lastra, che
  // doveva fermarsi, si accorciava del 10–15%.)
function ingorgo(st, ca, L) {
  const { W, H, h, m, x, tira, vten, tiene, piena, vin, vout, geo, FF, entra, esce, passa } = st, N = W * H, { hx, hy, cap, conv, apre } = ca;
  const hNeutro = st.hNeutro ?? L.hN, hNormale = ca.hZero ?? C.hZero, xDebole = L.xDebole;
  const vE = geo.v[0], mW = geo.m[0];
  { const ritroso = (st.verso = !st.verso);
    for (let n = 0; n < N; n++) { const k = ritroso ? N - 1 - n : n, e = entra[k]; let p = 1;
      if (e > 0) { const hk = h[k], mk = m[k], tk = tira[k], es = esce[k] * tk, vo = vout[k] * tk; let q = hk < mk ? (mk - hk + es) / e : vo > 0 ? vo / vin[k] : 0; // (i frammenti che si accostano, o la traslazione rigida)
        if (q < 1) { if (conv[k] > 0) { const q2 = (cap[k] - hk + es) / e; if (q2 > q) q = q2; } else if (x[k] > xDebole) { const q2 = (hNeutro - hk + es) / e; if (q2 > q) q = q2; }
          // (al FRONTE — la cella cede crosta a una vicina non tutta coperta — la coesione frena chi sta davanti: lì la crosta si raccoglie, fino allo spessore normale)
          if (q < 1 && hk < hNormale && ((FF[k] > 0 && !piena[vE[k]]) || (FF[mW[k]] < 0 && !piena[mW[k]]) || (k < N - W && FF[N + k] > 0 && !piena[k + W]) || (k >= W && FF[N + k - W] < 0 && !piena[k - W]))) { const q2 = (hNormale - hk + es) / e; if (q2 > q) q = q2; }
          if (q < 1) p = q; } }
      const p0 = passa[k];
      if (p !== p0) { passa[k] = p; const dp = p - p0; // chi cede crosta a k (dai quattro lati) ne vede uscire di più, o di meno
        let F = FF[k]; if (F < 0) { const d = vE[k], u = -hx[k] * dp; esce[d] -= F * dp; vout[d] += u; if (tiene[k]) vten[d] += u; }
        const w = mW[k]; F = FF[w]; if (F > 0) { const u = hx[w] * dp; esce[w] += F * dp; vout[w] += u; if (tiene[w]) vten[w] += u; }
        if (k < N - W) { F = FF[N + k]; if (F < 0) { const d = k + W, u = -hy[k] * dp; esce[d] -= F * dp; vout[d] += u; if (tiene[N + k]) vten[d] += u; } }
        if (k >= W) { const a = k - W; F = FF[N + a]; if (F > 0) { const u = hy[a] * dp; esce[a] += F * dp; vout[a] += u; if (tiene[N + a]) vten[a] += u; } } } }
  }
  for (let k = 0; k < N; k++) { const t = vten[k]; let q = 1;
    if (t > 0) { const vo = vout[k]; if (!(apre[k] > 0) && !(x[k] > xDebole) && h[k] >= m[k]) { const lascia = vo - t + vin[k] * passa[k]; if (lascia < vo) q = lascia > 0 ? lascia / vo : 0; } vten[k] = t < vo ? t / vo : 1; } else vten[k] = 0;
    tira[k] = q; }
}
  // CIÒ CHE SI SEGUE SENZA CAMBIARE NIENTE (solo se lo stato li porta: st.cop, st.conto). cop: quanta della crosta di ogni
  // cella è COPERTURA SEDIMENTARIA (m): viaggia con la crosta, cresce di ciò che i fiumi e i pendii posano, cala di ciò
  // che consumano (la copertura sta sopra: se ne va per prima; sotto c'è il basamento), e non supera copMax: più giù il
  // sedimento è già roccia metamorfica, cioè basamento. conto: le somme, sulla finestra che chi chiama decide, di quanto
  // la crosta si è ISPESSITA PERCHÉ COMPRESSA o assottigliata perché stirata (stretta: vedi G nel bilancio; lo spostarsi
  // di un continente intero non conta), di quanto ha ceduto ai lati sotto il proprio peso (dentro stretta, col segno), di
  // quanto lo stiramento ha scaldato la litosfera (termico: la variazione di x), della crosta nuova degli archi (arco), e
  // di quanto fiumi e pendii hanno tolto e posato
function sposta(st, ca, L, kappa, cede) {
  const { W, H, h, m, x, hb, dh, tira, numM, numX, geo, FF, passa } = st, N = W * H, hM = C.hMargine, zFuso = L.zFuso;
  const zMin = cede > 0 ? zFuso * (1 - (st.xMax ?? 0)) : Infinity; // (sotto zMin nessuna crosta fonde: xMax è lo stato termico più caldo del passo prima)
  const cop = st.cop || null, dc = cop ? st.dc : null, via = cop ? st.via : null, conto = st.conto || null, res = st.res || null, dr = res ? st.dr : null, er = res ? st.etaRad : null, de = res ? st.de : null;
  for (let verso = 0; verso < 2; verso++) { const vv = geo.v[verso], fine = verso ? N - W : N, o = verso * N;
    for (let k = 0; k < fine; k++) { const v = vv[k], hk = h[k], hv = h[v]; if (hk <= 0 && hv <= 0) continue;
      // ciò che le placche spostano davvero (dopo l'ingorgo e la tenuta); con la crosta vanno lo stiramento e lo stato termico
      let F = FF[o + k];
      if (F > 0) { F *= passa[v] * tira[k]; const dm = hM - m[k], xd = x[k]; if (dm !== 0) numM[v] += F * dm; if (xd !== 0) numX[v] += F * xd; }
      else if (F < 0) { F *= passa[k] * tira[v]; const dm = hM - m[v], xd = x[v]; if (dm !== 0) numM[k] -= F * dm; if (xd !== 0) numX[k] -= F * xd; }
      let Ft = F, Fe = 0, Fc = 0; // (la parte delle placche e quella dell'erosione, per i traccianti: F resta lo stesso numero di prima)
      // l'erosione: ciò che sporge dal mare si consuma e si deposita accanto, più in basso…
      const xk = hk - hb[k], xv = hv - hb[v];
      if (xk > 0 || xv > 0) { Fe = kappa * ((xk > 0 ? xk : 0) - (xv > 0 ? xv : 0)); F += Fe; }
      // …e la crosta che fonde in basso cede sotto il proprio peso: scorre dalla cella più spessa a quella più sottile
      if ((hk > zMin || hv > zMin) && hk !== hv) { const su = hk > hv ? k : v, c = h[su] - zFuso * (1 - x[su]); if (c > 0) { let D = cede * c * c * c; if (D > 0.125) D = 0.125; Fc = D * (hk - hv); F += Fc; Ft += Fc; if (conto) { conto.stretta[k] -= Fc; conto.stretta[v] += Fc; } } }
      if (F !== 0) { dh[k] -= F; dh[v] += F; }
      // (il residuo denso, in fondo alla colonna, va con la crosta che le placche e il cedimento spostano, come la copertura; l'erosione toglie da sopra)
      if (res && Ft !== 0) { const hd = Ft > 0 ? hk : hv, d = Ft > 0 ? k : v, q = hd > 0 ? (Ft * res[d]) / hd : 0, qe = hd > 0 ? (Ft * er[d]) / hd : 0; dr[k] -= q; dr[v] += q; de[k] -= qe; de[v] += qe; }
      if (cop) {
        // la copertura va con la crosta che si sposta (in proporzione a quanta ne ha la cella che cede)…
        if (Ft !== 0) { const hd = Ft > 0 ? hk : hv, q = hd > 0 ? (Ft * cop[Ft > 0 ? k : v]) / hd : 0; dc[k] -= q; dc[v] += q; }
        // …e ciò che i pendii tolgono a una cella si posa, sedimento, su quella accanto
        if (Fe > 0) { via[k] += Fe; dc[v] += Fe; if (conto) conto.posato[v] += Fe; } else if (Fe < 0) { via[v] -= Fe; dc[k] -= Fe; if (conto) conto.posato[k] -= Fe; }
      }
    } }
}
function bilancio(st, ca, L, dtMa, apporto, fiumi) {
  const { W, H, h, a, sub, m, x, im, hb, dh, dw, dq, tira, vten, piena, vin, vout, numM, numX, entra, esce, passa, sete, asciutta } = st, N = W * H, vE = st.geo.v[0], mW = st.geo.m[0];
  const mare = Number.isFinite(st.mare) ? st.mare : 0 /* (senza mare: lo zero delle quote, come prima) */, hM = C.hMargine, h0 = L.base(mare, 0), mMin = Math.min(hM, L.basalto), spegne = Math.exp((-dtMa * 1e6) / L.tau); let xMax = 0;
  const X0 = 0.05, dHb = (L.base(mare, X0) - h0) / X0; // (lo spessore di base di una colonna poco calda: in linea retta fino a x = X0; oltre, la formula intera)
  const cop = st.cop || null, copMax = st.copMax ?? Infinity, dc = cop ? st.dc : null, via = cop ? st.via : null, conto = st.conto || null, res = st.res || null, dr = res ? st.dr : null, er = res ? st.etaRad : null, de = res ? st.de : null;
  // il bilancio di ogni cella. Se dopo il trasporto la crosta oceanica non basta a coprire il fondo, lo spazio
  // si riempie di crosta nuova, di età zero (una dorsale, o il mare che si apre dietro un continente che si
  // spacca); se è troppa, la parte in più affonda nel mantello (una fossa).
  const deposito = st.sommaSete > 0 ? (st.fango ?? 0) / st.sommaSete : 0; let somma = 0, somma1 = 0, oceano = 0, totale = 0, fango = deposito > 0 ? 0 : st.fango ?? 0, sete2 = 0;
  for (let k = 0; k < N; k++) {
    const hv = h[k]; let imk = im[k], w0 = 1 - hv * imk; if (w0 < 0) w0 = 0;
    let q = w0 * a[k] + dq[k]; if (q < 0) q = 0; const w1 = w0 + dw[k], s0 = sub[k], nuova = apporto * s0 * s0;
    let posa = 0, hn = hv + dh[k] + nuova, e = 0, hbk = h0; if (hn < VELO) { if (hn > 0) fango += hn; hn = 0; } // (un velo più sottile di VELO non è crosta: va col fango dei fiumi, e si posa sulle coste)
    if (hv > 0 || hn > 0) {
      // QUANTO LA CROSTA È STRETTA O STIRATA in questo passo (G, metri di spessore): lo spessore per la differenza tra la
      // velocità con cui la crosta è entrata davvero e quella con cui è uscita (dopo l'ingorgo e la tenuta). G > 0: si
      // accumula (uno scontro); G < 0: si stira, ma solo per la parte dei lati tenuti (il bordo di un continente che si
      // allontana dal fondale non è stirato: lì nasce oceano). Vale per le celle tutte coperte: i frammenti sparsi non sono
      // una lastra. La deriva di un continente intero dà zero, anche al suo fronte
      let G = 0, mk = m[k], xk = x[k];
      if (hv > 0 && hv >= mk) { let d = vin[k] * passa[k] - vout[k] * tira[k]; if (d < 0) d *= vten[k]; if (d > 1e-9 || d < -1e-9) { G = hv * d; if (conto) conto.stretta[k] += G; } } // (sotto un miliardesimo a passo è l'arrotondamento del conto, non uno stiramento)
      // lo stiramento e lo stato termico della crosta che ora sta qui (la crosta nuova degli archi arriva a frammenti non stirati)
      // (di ciò che c'era resta r, ciò che non è uscito; il resto di ciò che c'è ora è arrivato: con le placche, con il suo
      // stiramento e il suo calore, o posato dai pendii e nato dagli archi, senza; mai meno di ciò che resta più ciò che le
      // placche portano: un tracciante non si concentra)
      { const nm = numM[k], nx = numX[k]; if (nm !== 0 || nx !== 0 || mk !== hM || xk !== 0) { let r = hv - esce[k] * tira[k]; if (r < 0) r = 0; let t = hv + dh[k] + nuova; const t2 = r + entra[k] * passa[k] + nuova; if (t < t2) t = t2; if (t > 0) { const it = 1 / t; mk = hM - (r * (hM - mk) + nm) * it; xk = (r * xk + nx) * it; if (mk < mMin) mk = mMin; else if (mk > hM) mk = hM; if (xk > 0.99) xk = 0.99; else if (xk < 0) xk = 0; } numM[k] = 0; numX[k] = 0; } }
      if (G !== 0) { const d = -G / hv, x0 = xk; // (la frazione di cui è stirata, o stretta se negativa)
        if (d > 0) { if (mk > mMin) { mk /= 1 + d; if (mk < mMin) mk = mMin; } xk = 1 - (1 - xk) / (1 + d); }
        else { mk *= 1 - d; if (mk > hM) mk = hM; if (xk > 0) { xk = 1 - (1 - xk) * (1 - d); if (xk < 0) xk = 0; } }
        if (xk > 0.99) xk = 0.99; if (conto && conto.termico) conto.termico[k] += xk - x0; } // (lo stato termico cambiato dallo stiramento: solleva la colonna)
      if (xk !== 0) { xk *= spegne; if (xk < 1e-6 || !(hn > 0)) xk = 0; x[k] = xk; if (xk > xMax) xMax = xk; if (xk > 0) hbk = xk < X0 ? h0 + dHb * xk : L.base(mare, xk); }
      if (!(hn > 0)) mk = hM; if (mk !== m[k]) { m[k] = mk; imk = 1 / mk; im[k] = imk; }
    }
    hb[k] = hbk;
    // IL SEDIMENTO DEI FIUMI SI POSA ALLA FOCE (un bilancio di massa, senza frazioni): alla cella sommersa che tocca la terra
    // tocca una parte del fango in viaggio in proporzione al tratto di costa (sete: quanti dei suoi quattro lati danno su
    // una cella asciutta); ne prende quanto ce ne sta fino al pelo del mare (lo spazio di accomodamento: hb − h, che la
    // subsidenza termica riapre da sé perché hb sale quando x si spegne), e ciò che avanza resta in viaggio: al passo dopo
    // trova il fronte del delta una cella più avanti. (Prima andava alle celle vicine ai continenti in proporzione a quanto
    // erano fonde: i fondali accanto alle coste se lo prendevano quasi tutto e le piattaforme restavano affamate.)
    { const vuole = deposito * sete[k]; if (vuole > 0) { const spazio = hbk - hn; posa = spazio <= 0 ? 0 : vuole < spazio ? vuole : spazio; hn += posa; fango += vuole - posa; } }
    // i FIUMI: ciò che sporge dal mare è terra emersa, e l'acqua la porta via…
    if (hn > hbk) { e = fiumi * (hn - hbk); hn -= e; fango += e; sete[k] = 0; asciutta[k] = 1; }
    else { let w = asciutta[vE[k]] + asciutta[mW[k]]; if (k >= W) w += asciutta[k - W]; if (k < N - W) w += asciutta[k + W]; sete[k] = w; sete2 += w; asciutta[k] = hn > 0 && hn >= hbk - 1e-3 ? 1 : 0; } // …fino alle coste
    h[k] = hn; totale += hn; piena[k] = hn > 0 && hn * imk >= 1 ? 1 : 0;
    if (res) { let r = res[k] + dr[k] + RESIDUO * nuova; if (r > hn) r = hn; if (!(r > 0)) r = 0; res[k] = r; dr[k] = 0; const e2 = er[k] + de[k]; er[k] = hn > 0 && e2 > 0 ? e2 : 0; de[k] = 0; } // (la crosta nuova degli archi è residuo per 1 − F_GRANITO)
    if (cop) { // il bilancio della copertura: quella che c'era e che è arrivata, più ciò che si è posato, meno ciò che è stato tolto
      let c = cop[k] + dc[k] + posa - via[k] - e; if (c > hn) c = hn; if (c > copMax) c = copMax; if (!(c > 0)) c = 0; cop[k] = c;
      if (conto) { conto.arco[k] += nuova; conto.tolto[k] += via[k] + e; conto.posato[k] += posa; }
      dc[k] = 0; via[k] = 0; }
    let wt = 1 - hn * imk; if (wt < 0) wt = 0;
    const s = w1 > wt ? w1 - wt : 0, den = w1 > wt ? w1 : wt; sub[k] = s; somma += s * s; somma1 += s; oceano += wt;
    a[k] = den > 1e-6 ? q / den + dtMa : 0;
  }
  dh.fill(0); dw.fill(0); dq.fill(0); entra.fill(0); esce.fill(0); vin.fill(0); vout.fill(0); vten.fill(0);
  st.sommaSub = somma; st.sommaSub1 = somma1; st.sommaMare = oceano; st.totale = totale; st.fango = fango; st.sommaSete = sete2; st.xMax = xMax; // (la crosta nuova nasce sopra le fosse più attive: peso s²)
}

// IL MARE CARICATO: la quota s a cui l'acqua (volume, m³) sta sulle quote «in aria» ea (w × hh, lon × lat), se il suo peso fa
// affondare il fondo di «carica» = ρa/(ρa − ρw) volte quanto l'acqua lo copre. Le celle pesano come sulla sfera (coseno della
// latitudine). Metodo di Newton sul volume (convesso, a tratti lineare)
export function livelloDelMare(ea, w, hh, raggioM, volume, carica, s0 = 0) {
  const cella = ((2 * Math.PI * raggioM) / w) * ((Math.PI * raggioM) / hh), V = volume / (cella * carica); if (!(V > 0)) return -Infinity;
  const pesi = Float64Array.from({ length: hh }, (_, j) => Math.cos(Math.PI / 2 - ((j + 0.5) / hh) * Math.PI)); let s = Number.isFinite(s0) ? s0 : 0, lo = Infinity; for (let k = 0; k < ea.length; k++) if (ea[k] < lo) lo = ea[k];
  for (let giro = 0; giro < 40; giro++) { let v = 0, sup = 0; for (let j = 0; j < hh; j++) { const p = pesi[j], o = j * w; let vj = 0, n = 0; for (let i = 0; i < w; i++) { const d = s - ea[o + i]; if (d > 0) { vj += d; n++; } } v += p * vj; sup += p * n; }
    if (!(sup > 0)) { s = lo + 1; continue; } const ds = (V - v) / sup; s += ds; if (Math.abs(ds) < 0.01) break; }
  return s;
}

// LA STORIA TERMICA LETTA NEL TEMPO: la tabella di storia.js (tabellaStoria: colonne parallele, «t» in anni) come funzione del
// tempo (interpolata in linea retta tra le righe), più ciò che serve alla crosta: se il pianeta ha mai avuto le placche (mobilità
// oltre un mezzo) e il mantello mai convetto, e l'orologio di una velocità v(t): la strada s(t) = ∫v dt e la sua inversa
function nelTempo(tab, raggioM, eta = Infinity) {
  const n = tab.t.length, A = 4 * Math.PI * raggioM * raggioM, ts = tab.t, D = tab.struttura ? tab.struttura.D : raggioM * 0.454;
  const cerca = (t) => { let lo = 0, hi = n - 1; if (t <= ts[0]) return [0, 0, 0]; if (t >= ts[hi]) return [hi, hi, 0]; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ts[m] <= t) lo = m; else hi = m; } return [lo, hi, (t - ts[lo]) / (ts[hi] - ts[lo])]; };
  const di = (t) => { const [a, b, u] = cerca(t), v = (c) => tab[c][a] + u * (tab[c][b] - tab[c][a]);
    return { q: (v('Qconv') + v('Qfuso')) / A, dT: v('Tum') - v('Ts'), mob: v('mob'), basalto: v('crosta'), Mfuso: v('Mfuso'), Qcmb: v('Qcmb'), Qconv: v('Qconv'), Qfuso: v('Qfuso'), Tum: v('Tum'), Ts: v('Ts'), vInterno: v('vInterno'), lid: v('lid'), convette: v('convette') > 0.5 }; };
  const fino = (eta) => { let k = 0; while (k < n && ts[k] <= eta) k++; return k; };
  const orologio = (vDi, eta) => { const tt = [0], S = [0]; let vPrima = vDi(ts[0]); for (let k = 0; k < n && ts[k] < eta; k++) { const v = vDi(ts[k]); S.push(S[S.length - 1] + 0.5 * (v + vPrima) * (ts[k] - tt[tt.length - 1])); tt.push(ts[k]); vPrima = v; }
    { const v = vDi(eta); S.push(S[S.length - 1] + 0.5 * (v + vPrima) * (eta - tt[tt.length - 1])); tt.push(eta); }
    const m = tt.length;
    return { strada: S[m - 1], stradaDi: (t) => { let i = 1; while (i < m - 1 && tt[i] < t) i++; const u = tt[i] > tt[i - 1] ? Math.min(1, Math.max(0, (t - tt[i - 1]) / (tt[i] - tt[i - 1]))) : 1; return S[i - 1] + u * (S[i] - S[i - 1]); },
      tempoDi: (s) => { if (s <= 0) return 0; if (s >= S[m - 1]) return eta; let lo = 0, hi = m - 1; while (hi - lo > 1) { const c = (lo + hi) >> 1; if (S[c] < s) lo = c; else hi = c; } return S[hi] > S[lo] ? tt[lo] + ((s - S[lo]) / (S[hi] - S[lo])) * (tt[hi] - tt[lo]) : tt[hi]; } }; };
  return { di, D, A, n, ts, tab, orologio, fino, get placche() { for (let k = 0; k < n && ts[k] <= eta; k++) if (tab.mob[k] > 0.5) return true; return false; }, get convette() { for (let k = 0; k < n && ts[k] <= eta; k++) if (tab.convette[k] > 0.5) return true; return false; } };
}

// passare a una griglia due volte più fine senza cambiare i totali: ogni cella si divide in quattro, con la
// pendenza delle vicine (limitata, per non inventare valori negativi né nuovi massimi)
function raffina(src, W, H) {
  const out = new Float64Array(4 * W * H), mm = (p, q) => (p * q <= 0 ? 0 : Math.abs(p) < Math.abs(q) ? p : q);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, v = src[k], sx = mm(v - src[j * W + ((i + W - 1) % W)], src[j * W + ((i + 1) % W)] - v) / 4, sy = mm(v - src[j > 0 ? k - W : k], src[j < H - 1 ? k + W : k] - v) / 4, o = 2 * j * 2 * W + 2 * i;
    out[o] = v - sx - sy; out[o + 1] = v + sx - sy; out[o + 2 * W] = v - sx + sy; out[o + 2 * W + 1] = v + sx + sy;
  }
  return out;
}

// LEGGE EMPIRICA: quanta crosta continentale si è separata dal mantello dopo t anni, come frazione della
// superficie che coprirebbe se fosse tutta spessa hMisura. In fretta all'inizio, poi sempre più piano (la forma: un
// esponenziale con 4 miliardi di anni di costante, com'era). LA MISURA è il volume della crosta continentale terrestre
// di oggi: 7,177·10⁹ km³ su 210,4·10⁶ km² (Cogley 1984, nella tabella di Taylor e McLennan 1995 [V, 2026-11]), cioè
// 14,07 km di spessore medio su tutta la Terra: 0,370 della superficie a 38 km. (Prima era «un terzo»: 0,338, il 9% in
// meno; quel terzo è la parte EMERSA più le piattaforme, non il volume.)
// È UNA TARATURA SULLA TERRA: vale solo per chi chiama evolviTettonica senza la storia (le prove coi numeri sciolti) e per
// elementi.js. Con la storia la crosta nasce agli archi e torna giù alle fosse (evolviTettonica, C.archi e C.riciclo).
const CROSTA_TERRA = { volume: 7.177e18, eta: 4.5e9, superficie: 4 * Math.PI * RTERRA ** 2, tempo: 4e9 }; // (m³, anni, m², anni)
export const crostaAttesa = (t) => ((CROSTA_TERRA.volume / (CROSTA_TERRA.superficie * C.hMisura)) * (1 - Math.exp(-Math.max(0, t) / CROSTA_TERRA.tempo))) / (1 - Math.exp(-CROSTA_TERRA.eta / CROSTA_TERRA.tempo));

// LA VELOCITÀ DI UNA PLACCA (m/anno) dal calore che porta [derivata]: una placca nasce calda alla dorsale e si raffredda
// come un semispazio; il flusso medio sulla sua vita τ è q = 2·k·ΔT/√(π·κ·τ); vive finché ha attraversato la sua
// lunghezza L, τ = L/v. Quindi v = π·κ·L·q²/(2·k·ΔT)²: cresce come q² (la legge di scala), ma senza numeri presi dalla
// Terra: k e κ sono la conducibilità e la diffusività del mantello alto, ΔT il salto tra il mantello e la superficie
// (storia.js), L la larghezza di una cella del mantello. Con i numeri della Terra della storia (q = 0,077 W/m², ΔT =
// 1374 K, L = 8000 km) dà 3,6 cm/anno (misurati: 4 in media). q qui è il flusso medio del pianeta, non quello dei soli
// fondali (sulla Terra 0,10): manca la parte che esce dai continenti senza passare dalle placche.
export const velocitaPlacche = ({ q, dT, lunghezza, k = 4.2, kappa = 1e-6 }) => ((Math.PI * kappa * lunghezza * q * q) / (2 * k * dT) ** 2) * ANNO;

// ---------- SENZA PLACCHE, CON LA STORIA: IL RILIEVO DI UN COPERCHIO. Tre sorgenti, tutte dallo stato termico nel tempo:
//   1. LA CROSTA DI BASALTO ISPESSITA (isostasia di Airy): il fuso di ogni epoca (la portata di storia.js, Ṁ(t), che sotto un
//      coperchio è quella di Foley 2019) si posa dove il mantello sale (u > 0 nell'equazione delle celle, in proporzione); il
//      mantello avanza col suo orologio, la velocità sotto il coperchio (storia.js vInterno: v = 0,05·(κ/d)·(Ra_i/θ)^(2/3)), un
//      giro di cella per ogni spessore del mantello percorso. Lo spessore medio è quello della storia (una fonte sola: la
//      crosta del coperchio, che non lo supera); la quota sale di (1 − ρ_b/ρ_m) per metro di crosta in più della media;
//   2. LA TOPOGRAFIA DINAMICA di oggi (Hager e Richards 1989 [R]; per i coperchi Kiefer e Hager 1991 [R]): la spinta dello strato
//      che convette sotto il coperchio, ampiezza ρ_m·α·ΔT_rh·δ_rh/ρ_m (in aria), con ΔT_rh = 2,4·R·T²/E (Solomatov e Moresi 2000
//      [R]) e δ_rh = k·ΔT_rh/q lo strato che porta il calore q per conduzione; la forma è quella del mantello di oggi, con la
//      sua lunghezza d'onda. Se oggi il mantello non convette, niente;
//   3. I PENNACCHI (Sleep 1990 [R]) li fa geologia.js sulle cime di «salite», col flusso del nucleo: qui si restituiscono
//      il campo e i numeri della storia che servono (pennacchi).
// Il SOLLEVAMENTO di oggi è la crosta che il fuso di oggi aggiunge, in quota: (1 − ρ_b/ρ_m)·Ṁ/(ρ_b·A) dove il mantello sale.
// Le quote sono «in aria», poi l'acqua del pianeta le copre e il suo peso affonda il fondo (livelloDelMare, come con le placche).
// SEMPLIFICAZIONI: il fuso si posa dove sale il mantello, non dove il fuso esce davvero; la crosta non sprofonda (l'eclogite) e
// non si piega (niente rigidità flessurale: tutto in isostasia locale); più di 400 passi del mantello non si fanno (un pianeta
// con molti più giri ha il passato lontano compresso in passi di mezzo giro).
function coperchio({ W, H, N, man, T, eta, raggioM, gravita, acquaM3, vigore, origine, campi }) {
  const alt = new Float32Array(N), sollevamento = new Float32Array(N), basalto = new Float32Array(N), accumulo = new Float64Array(N), u = new Float64Array(N);
  campi.etaCrosta.fill(eta / 1e6);
  // l'orologio del mantello: giri di cella (∫v dt / D)
  const anno = ANNO, giri = T.orologio((t) => T.di(t).vInterno * anno / T.D, eta), passi = Math.min(400, Math.ceil(giri.strada / 0.25)), dg = giri.strada / Math.max(1, passi);
  const peso = (out) => { man.su(W, H, u); let m = 0; for (let k = 0; k < N; k++) { const v = u[k] > 0 ? u[k] : 0; out[k] = v; m += v; } return m / N; };
  const w = new Float64Array(N); let t = 0;
  // LA CROSTA NON CRESCE SENZA LIMITI, a ogni passo: dove supera la profondità dell'eclogite la parte sotto affonda (storia.js
  // eclogite: la stessa che limita lo spessore medio della storia); e dove la sua base sta oltre i 700 °C scorre di lato sotto
  // il proprio peso (la stessa legge del cedimento delle catene, 10¹⁹ Pa·s: per decine di km in più il rilassamento dura milioni
  // di anni, istantaneo per la storia) finché nessuna cella supera la profondità di quell'isoterma nel coperchio di allora (la
  // geoterma lineare dalla superficie, a T_s, alla base del coperchio, a T_UM): l'eccesso va, in proporzione, dove c'è posto
  const zEcl = STORIA.eclogite / (STORIA.rhoBasalto * gravita);
  const rilassa = (c, x) => { const zF = x.lid > 0 && x.Tum > x.Ts ? (x.lid * Math.max(0, C.Tfuso - x.Ts)) / (x.Tum - x.Ts) : Infinity, tetto = Math.min(zEcl, zF); let troppo = 0, posto = 0;
    for (let k = 0; k < N; k++) { if (c[k] > zEcl) c[k] = zEcl; if (c[k] > tetto) troppo += c[k] - tetto; else posto += tetto - c[k]; }
    if (!(troppo > 0)) return; const f = posto > 0 ? Math.min(1, troppo / posto) : 0, resta = troppo > posto ? (troppo - posto) / N : 0;
    for (let k = 0; k < N; k++) c[k] = (c[k] > tetto ? tetto : c[k] + (tetto - c[k]) * f) + resta; };
  for (let p = 0; p < passi; p++) {
    const t1 = p === passi - 1 ? eta : giri.tempoDi((p + 1) * dg), x = T.di(0.5 * (t + t1));
    if (x.convette) man.passo(Math.min(0.5, dg), null, vigore(x.q));
    const volume = (1 - x.mob) * x.Mfuso * (t1 - t) * anno / C.rhoBasalto; // (m³ di fuso in questo passo che resta sotto il coperchio: con le placche il basalto torna giù)
    if (volume > 0) { const m = peso(w); if (m > 0) { const dz = volume / T.A; for (let k = 0; k < N; k++) accumulo[k] += (dz * w[k]) / m; } rilassa(accumulo, x); }
    t = t1;
  }
  const oggi = T.di(eta), vivo = oggi.convette, Lit = litosfera({ g: gravita }), aria = 1 - C.rhoBasalto / C.rhoMantello;
  // 1. la crosta: il fuso di tutta la storia, dove si è posato
  let mb = 0; for (let k = 0; k < N; k++) { basalto[k] = accumulo[k]; mb += basalto[k] / N; }
  // 2. la topografia dinamica di oggi
  let Adin = 0, mx = 1e-30; if (vivo) { man.su(W, H, u); for (let k = 0; k < N; k++) mx = Math.max(mx, Math.abs(u[k])); const dTrh = (C.reologico * R_GAS * oggi.Tum * oggi.Tum) / STORIA.Enu, qc = oggi.Qconv / T.A; Adin = qc > 0 ? (C.alfa * dTrh * STORIA.kSu * dTrh) / qc : 0; }
  const ea = new Float64Array(N); let me = 0;
  for (let k = 0; k < N; k++) { ea[k] = aria * (basalto[k] - mb) + (vivo ? (Adin * u[k]) / mx : 0); me += ea[k] / N; }
  for (let k = 0; k < N; k++) ea[k] -= me;
  // il sollevamento di oggi: la crosta nuova, dove il mantello sale
  if (vivo && oggi.Mfuso > 0) { const m = peso(w), r = (aria * oggi.Mfuso * anno) / C.rhoBasalto / T.A; if (m > 0) for (let k = 0; k < N; k++) sollevamento[k] = (r * w[k]) / m; }
  // il mare e il suo peso
  const volumeAcqua = acquaM3 ?? 0, mare = volumeAcqua > 0 ? livelloDelMare(ea, W, H, raggioM, volumeAcqua, Lit.carica, 0) : -Infinity;
  for (let k = 0; k < N; k++) alt[k] = !(ea[k] < mare) ? ea[k] : mare - (mare - ea[k]) * Lit.carica;
  const salite = vivo ? Float32Array.from(man.su(W, H, u)) : null;
  return { W, H, alt, ...campi, sollevamento, basalto, mare, litosfera: null, celle: vivo ? man.celle() : 0, salite, regime: vivo ? 'coperchio unico' : 'fermo', bilancio: { prodotta: 0, presente: 0, inViaggio: 0 },
    pennacchi: { Qcmb: oggi.Qcmb, Qconv: oggi.Qconv, Qfuso: oggi.Qfuso, Mfuso: oggi.Mfuso, giro: oggi.vInterno > 0 ? T.D / (oggi.vInterno * anno) : Infinity },
    rilievo: { dinamica: vivo ? Adin : 0, crostaMedia: mb, crostaStoria: oggi.basalto, giri: giri.strada, passi },
    storia: { simulati: 0, saltati: eta, passi: 0, velocita: 0, livelli: [], impronta: origine, finestra: 0, conLaStoria: true } };
}

// ---------- LA STORIA INTERA. raggioM: raggio del pianeta; nucleo: raggio del nucleo / raggio del pianeta (il
// resto è mantello); q: calore interno oggi (W/m²; Terra 0,087); eta: età in anni; acqua: se la crosta è indebolita
// dall'acqua (senza, non si rompe in placche); passi: quanti passi sulla griglia finale; impronta: lo stato iniziale
// del mantello, l'anomalia termica lasciata dagli urti (vedi mantello: una mappa lon × lat o una funzione (W, H) → mappa);
// termico: { dT, k, kappa } lo stato del mantello dalla storia termica (storia.js), per la velocità delle placche;
// seme: il ripiego, se l'impronta manca o è piatta (storia.impronta dice quale dei due ha deciso: 'urti' o 'seme').
// IL TEMPO. La velocità è quella vera, e in un passo la crosta non può fare più di un terzo di cella: quindi il
// passato lontano si simula a grana grossa (griglie larghe 64, 128… celle: tanto il rimescolamento ne cancella i
// dettagli) e solo gli ultimi «passi» passi su ogni griglia più fine, fino a W×H (sulla Terra, con 160 passi: fino
// a 560 milioni di anni fa a 64, poi a 128, e gli ultimi 190 a 256: vedi storia.livelli). Se la storia chiede più
// di PASSI_GROSSI passi sulla griglia più grossa (pianeti molto caldi, o piccoli, o molto vecchi), il tratto più
// antico si salta (storia.saltati) e si parte con la crosta separata fino a quel momento, stesa in un velo uniforme.
// RESTITUISCE { W, H, alt, cont, spinta, etaCrosta, celle } e in più { spessore, fosse, regime, bilancio, storia }:
//   alt        Float32Array, metri rispetto al livello a cui galleggia la crosta normale (35 km): circa il mare terrestre
//   cont       Uint8Array, 1 dove c'è crosta continentale (spessore ≥ 25 km)
//   spinta     Float32Array 0…1, dove oggi la crosta dei continenti è compressa: lì i monti stanno crescendo
//   etaCrosta  Float32Array, milioni di anni della crosta oceanica (0 sui continenti)
//   celle      quanti pennacchi del mantello salgono oggi
//   salite     Float32Array, il campo del mantello oggi (> 0 dove sale, caldo: lì stanno i vulcani; < 0 dove scende); null se è fermo
//   spessore   Float32Array, metri di crosta continentale (anche i veli sottili fuori dai continenti)
//   fosse      Float32Array 0…1, dove la crosta oceanica sta affondando (lì alt è più fonda, fino a 2500 m)
//   velEst, velSud  Float32Array, m/anno: la velocità della crosta oggi (la zattera a cui la cella appartiene)
//   sollevamento    Float32Array, m/anno: di quanto la superficie sale (o scende, se < 0) OGGI perché la crosta sotto si
//              ispessisce: galleggia × (ciò che le placche stringono + ciò che cede di lato + la crosta nuova degli
//              archi), in media su storia.finestra anni. È il sollevamento senza erosione: se l'erosione toglie E metri di
//              roccia la superficie risale di altri (1 − galleggia)·E per isostasia (lo conta chi erode: geologia.js)
//   regge      Float32Array, m: di quanto la superficie può ancora salire prima che la crosta superi lo spessore che la
//              spinta di lì regge (cap): oltre, cede e si allarga invece di alzarsi
//   copertura  Float32Array, m: quanta della crosta è copertura sedimentaria (ciò che fiumi e pendii hanno posato nella
//              storia e nessuno ha più tolto, fino alla profondità dove diventa roccia metamorfica); 0 = basamento a nudo
//   arco       Float32Array, m/anno di crosta nuova che nasce oggi sopra le fosse (gli archi di vulcani)
//   consumata, posata  Float32Array, m/anno di crosta che l'erosione DELLA TETTONICA (le sue due leggi empiriche: fiumi e
//              pendii) toglie e posa oggi in ogni cella: una seconda fonte della denudazione, a grana grossa, da
//              confrontare con erosione() di geologia.js (test_erosione lo stampa)
//   regime     'a placche' | 'coperchio unico' | 'fermo'
//   bilancio   { prodotta, presente, inViaggio }: metri di spessore medio di crosta continentale: quanta ne è nata,
//              quanta ce n'è, quanta è sedimento portato dai fiumi nell'ultimo passo (prodotta = presente + inViaggio)
//   storia     { simulati, saltati (anni), passi, velocita (m/anno), livelli: [{ W, passi, anni }], impronta: 'urti' | 'seme', finestra (anni) }
// SE LA CROSTA NON SI ROMPE e c'è la storia («tempo»): il rilievo del coperchio (coperchio(), qui sopra). Senza la storia
// (q ≤ 0,05 o niente acqua, le soglie di riserva; «placche» true/false forza la scelta, per esempio per
// seguire interno() di geologia.js): un COPERCHIO UNICO. Nessuna deriva: cont = 0,
// spinta = 0, spessore = 0, fosse = 0 (e così velocità, sollevamento, copertura), etaCrosta = l'età del pianeta ovunque; alt = solo i rigonfiamenti sopra i
// pennacchi del mantello (fino a 1,5 km, come Tharsis o gli altopiani di Venere), o piatta (tutta 0) se anche il
// mantello è fermo (q ≤ 0,02).
export function evolviTettonica({ W = 256, H = 128, raggioM = RTERRA, nucleo = 0.546, q = C.qTerra, eta = 4.5e9, acqua = true, seme = 1, passi = 160, placche = null, impronta = null, termico = null, acquaM3 = null, gravita = 9.81, tempo = null } = {}) {
  if (W !== 2 * H || W < 32 || (W & (W - 1))) throw new Error('tettonica: serve W = 2H, potenza di 2, almeno 32');
  const N = W * H, alt = new Float32Array(N), cont = new Uint8Array(N), copre = new Float32Array(N), calore = new Float32Array(N), termica = new Float32Array(N), stiramento = new Float32Array(N).fill(1), spinta = new Float32Array(N), etaCrosta = new Float32Array(N), spessore = new Float32Array(N), fosse = new Float32Array(N), copertura = new Float32Array(N), sollevamento = new Float32Array(N), regge = new Float32Array(N), arco = new Float32Array(N), consumata = new Float32Array(N), posata = new Float32Array(N), velEst = new Float32Array(N), velSud = new Float32Array(N);
  // LA LUNGHEZZA D'ONDA DELLA CONVEZIONE: quella che cresce per prima in uno strato scaldato con i bordi liberi, 2√2 volte il suo
  // spessore (Chandrasekhar 1961, il numero d'onda critico π/√2 [R]); prima «una volta e mezza lo spessore» per cella, cioè 3 per
  // onda: sulla Terra le stesse 5 onde. Quante ce ne stanno in un giro (3…11: la grana della griglia del mantello)
  const Dm = raggioM * (1 - nucleo), onde = Math.max(3, Math.min(11, Math.round((2 * Math.PI * raggioM) / (2 * Math.SQRT2 * Dm))));
  // LA STORIA TERMICA (tempo: la tabella di storia.js, tabellaStoria): lo stato del mantello a ogni tempo, e da lì il regime (la
  // mobilità di Korenaga), se il mantello convette (il numero di Rayleigh), il calore, la velocità, la crosta di basalto. Senza
  // (le prove che chiamano coi numeri sciolti) restano il calore di oggi per tutta la storia e le due soglie di riserva su q
  const T = tempo ? nelTempo(tempo, raggioM, eta) : null;
  const aPlacche = placche ?? (T ? T.placche : q > C.qPlacche && !!acqua), vivo = T ? T.convette : q > C.qVivo;
  const vigore = (qq) => Math.max(0.15, Math.min(0.8, 0.35 * (qq / C.qTerra))); // (il controllo dell'equazione delle celle: ancora agganciato alla Terra, ma col calore del tempo)
  const man = mantello({ onde, epsilon: vigore(T ? T.di(Math.min(eta, 1e8)).q : q), seme, impronta }), origine = man.daUrti ? 'urti' : 'seme';
  if (vivo) for (let n = 0; n < 80; n++) man.passo(0.5); // il mantello convette da subito: le celle ci sono già quando la crosta comincia a separarsi
  if (!aPlacche && T) return coperchio({ W, H, N, man, T, eta, raggioM, gravita, acquaM3, vigore, origine, campi: { cont, copre, calore, termica, stiramento, spinta, etaCrosta, spessore, fosse, copertura, regge, arco, consumata, posata, velEst, velSud } });
  if (!aPlacche) {
    etaCrosta.fill(eta / 1e6);
    if (vivo) { const u = man.su(W, H), A = 1500 * Math.min(1, q / C.qTerra); let mx = 1e-9; for (const v of u) mx = Math.max(mx, Math.abs(v)); for (let k = 0; k < N; k++) alt[k] = (A * u[k]) / mx; }
    return { W, H, alt, cont, copre, calore, termica, stiramento, mare: null, litosfera: null, spinta, etaCrosta, celle: vivo ? man.celle() : 0, salite: vivo ? Float32Array.from(man.su(W, H)) : null, spessore, fosse, copertura, sollevamento, regge, arco, consumata, posata, velEst, velSud, regime: vivo ? 'coperchio unico' : 'fermo', bilancio: { prodotta: 0, presente: 0, inViaggio: 0 }, storia: { simulati: 0, saltati: eta, passi: 0, velocita: 0, livelli: [], impronta: origine, finestra: 0 } };
  }
  // LA VELOCITÀ DELLE PLACCHE. Se chi chiama dà lo stato del mantello (termico: { dT, k, kappa }, dalla storia termica del
  // pianeta: storia.js) è quella di velocitaPlacche(), ricavata; se no resta la LEGGE DI SCALA di prima (strato limite
  // della convezione: cresce come il quadrato del calore che esce), agganciata alla Terra (4 cm/anno a 0,087 W/m²)
  const Vdi = (qq, dT, mob = 1) => mob * (termico && dT > 0 ? velocitaPlacche({ q: qq, dT, lunghezza: (2 * Math.PI * raggioM) / onde, k: termico.k, kappa: termico.kappa }) : C.vTerra * (qq / C.qTerra) ** 2);
  const V = T ? Vdi(T.di(eta).q, T.di(eta).dT, T.di(eta).mob) : Vdi(q, termico?.dT), tau = Dm / V; // tau: il tempo di un giro di una cella (sulla Terra ~70 milioni di anni): l'orologio del mantello
  // L'OROLOGIO DELLE PLACCHE (con la storia): ogni passo sposta la crosta della stessa frazione di cella, e la velocità è quella
  // del tempo — velocitaPlacche col calore e il salto di temperatura di allora, per la mobilità di allora (Tackley 2000: la
  // velocità della superficie su quella del mantello; sotto un coperchio fermo è zero). Si conta la strada fatta, s(t) = ∫v dt:
  // i passi sono uguali in strada, e la durata di ognuno viene dalla strada (un'epoca a coperchio fermo passa in un passo solo)
  const orologio = T ? T.orologio((tt) => { const x = T.di(tt); return Vdi(x.q, x.dT, x.mob); }, eta) : null;
  // i livelli di griglia e quanti passi su ciascuno, partendo dal presente e andando indietro
  const larghezze = []; for (let w = W; w >= Math.min(64, W); w /= 2) larghezze.unshift(w);
  // (con l'orologio i conti qui sotto sono in metri di strada: L.dt è la strada di un passo, e alla fine L.ds)
  const liv = larghezze.map((w) => ({ W: w, H: w / 2, dt: (C_PASSO * 2 * Math.PI * raggioM) / w / (orologio ? 1 : V), n: 0 }));
  let resto = orologio ? orologio.strada : eta, saltati = 0;
  for (let l = liv.length - 1; l >= 0; l--) { const L = liv[l], vuole = Math.ceil(resto / L.dt - 1e-9), n = Math.max(0, Math.min(l > 0 ? passi : PASSI_GROSSI, vuole)); L.n = n; if (n) { if (l === 0 && vuole > n) saltati = resto - n * L.dt; L.dt = Math.min(L.dt, (resto - (l === 0 ? saltati : 0)) / n); resto -= n * L.dt; } }
  if (orologio) { for (const L of liv) L.ds = L.dt; saltati = orologio.tempoDi(saltati); }
  const copMax = ((C.Tmetamorfismo - C.Tsuolo) * C.conducibilita) / q; // (m) più giù di così un sedimento è già roccia metamorfica: basamento
  // LA LITOSFERA DEL PIANETA: dallo stato del mantello (salto di temperatura, dilatazione, densità, crosta di basalto: storia.js,
  // se chi chiama li dà) e dalla gravità; da lei lo spessore neutro, le quote, lo stiramento, il cedimento
  const tm = termico || {}, L = litosfera({ ...(tm.dT > 0 ? { dT: tm.dT } : {}), ...(tm.Ts > 0 ? { Ts: tm.Ts } : {}), ...(tm.alfa > 0 ? { alfa: tm.alfa } : {}), ...(tm.rho > 0 ? { rho0: tm.rho } : {}), ...(tm.basalto > 0 ? { basalto: tm.basalto } : {}), g: gravita });
  const reggeP = { fermo: L.hN, massimo: L.hMassimo, normale: L.hN }, ihN = 1 / L.hN, volume = acquaM3 ?? C.acquaTerra * (raggioM / RTERRA) ** 2;
  // IL MARE: l'acqua del pianeta (quella di oggi, per tutta la storia) riempie i punti più bassi, e il suo peso li fa
  // affondare (una colonna sotto il mare scende ancora di ρa/(ρa − ρw) volte): la quota s a cui sta, sullo zero della
  // litosfera. Le celle pesano come sulla sfera (coseno della latitudine). Metodo di Newton sul volume (convesso, a tratti lineare)
  // la fossa (0…1): dove la crosta oceanica affonda in fretta, qui o sotto il bordo del continente accanto; il fondo lì si piega in giù
  const fossaDi = (st, c0, k, i, j) => { const { sub, W: w, H: hh } = st; let s = sub[k]; const e = sub[j * w + (i + 1 === w ? 0 : i + 1)], o = sub[j * w + (i === 0 ? w - 1 : i - 1)]; if (e > s) s = e; if (o > s) s = o; if (j > 0 && sub[k - w] > s) s = sub[k - w]; if (j < hh - 1 && sub[k + w] > s) s = sub[k + w]; const f = (s / c0 - 0.1) / 0.35; return f <= 0 ? 0 : f < 1 ? f : 1; };
  // la quota «in aria» di ogni cella: la parte coperta dalla crosta leggera alla quota della sua colonna, il resto al fondale della sua età (con la fossa)
  const quotaAria = (st, out, c0) => { const { h, a: ae, m, im, x, W: w, H: hh } = st, fa = C.fossa * L.aria; for (let j = 0, k = 0; j < hh; j++) for (let i = 0; i < w; i++, k++) { const hk = h[k], c = hk > 0 ? hk * im[k] : 0; out[k] = c >= 1 ? L.quota(hk, x[k]) : (c > 0 ? c * L.quota(m[k], x[k]) : 0) + (1 - c) * (L.oceano(ae[k]) - fa * fossaDi(st, c0, k, i, j)); } return out; };
  const livelloMare = (ea, w, hh, s0) => livelloDelMare(ea, w, hh, raggioM, volume, L.carica, s0);
  const caldo = new Float64Array(man.Wm * man.Hm); // quanto il mantello si è scaldato sotto i continenti (0…1)
  // LA CROSTA CONTINENTALE NASCE AGLI ARCHI E TORNA GIÙ ALLE FOSSE (con la storia; Höning e Spohn 2023, eq. 1 [V]: la crescita
  // va con la velocità delle placche per la lunghezza delle fosse, le perdite con la lunghezza delle fosse sotto i continenti).
  // Qui: a ogni passo nasce, sopra le fosse, la parte «archi» del basalto che in quel passo affonda davvero (la crosta oceanica
  // della storia di quel tempo, per l'area che la simulazione fa scendere); e dove il fondale affonda sotto un continente la
  // fossa ne porta giù la parte «riciclo» (i sedimenti e l'erosione da sotto). Quanta crosta c'è è l'equilibrio tra le due: più
  // continenti, più fosse sotto i continenti. Il tratto più antico, se
  // saltato, parte senza crosta: i passi simulati bastano perché nasca e torni giù molte volte (lo dice la prova: con la crosta che
  // gli archi vi avrebbero fatto, senza riciclo, il pianeta d'avvio partiva coperto da 110 km di crosta). Senza la storia resta la
  // curva della Terra, crostaAttesa
  const crostaSaltata = () => (T ? 0 : crostaAttesa(saltati) * C.hMisura);
  // (la profondità dell'eclogite sotto una colonna di crosta dei continenti, e se la radice che vi passa pesa più del mantello)
  const zDel = STORIA.eclogite / (C.rhoCrosta * gravita), radiceAffonda = C.rhoEclogite > C.rhoMantello, etaRadice = C.ritmoRT * (C.rhoEclogite - C.rhoMantello) * C.gTerra * C.Lradice * C.tRadice * ANNO, Ts = (termico || {}).Ts > 0 ? termico.Ts : 273; let delaminata = 0;
  let t = saltati, prodotta = crostaSaltata(), riciclata = 0, debito = 0, st = null, ca = null, nPassi = 0, c0 = C_PASSO, finestra = 0, strada = orologio ? orologio.stradaDi(saltati) : 0, tFinestra = null, dtUltimo = 0;
  for (let l = 0; l < liv.length; l++) {
    const { W: w, H: hh, dt, n } = liv[l], Nl = w * hh;
    st = st ? { W: w, H: hh, h: raffina(st.h, w / 2, hh / 2), a: raffina(st.a, w / 2, hh / 2), sub: raffina(st.sub, w / 2, hh / 2), sommaSub: st.sommaSub * 4, sommaSub1: (st.sommaSub1 ?? 0) * 4, sommaMare: (st.sommaMare ?? 0) * 4, fango: (st.fango ?? 0) * 4, cop: raffina(st.cop, w / 2, hh / 2), res: T ? raffina(st.res, w / 2, hh / 2) : null, etaRad: T ? raffina(st.etaRad, w / 2, hh / 2) : null, copMax, m: raffina(st.m, w / 2, hh / 2), x: raffina(st.x, w / 2, hh / 2), lit: L, mare: st.mare } : { W: w, H: hh, h: new Float64Array(Nl).fill(prodotta), a: new Float64Array(Nl), sub: new Float64Array(Nl), sommaSub: 0, cop: new Float64Array(Nl), res: T ? new Float64Array(Nl) : null, etaRad: T ? new Float64Array(Nl) : null, copMax, m: new Float64Array(Nl).fill(C.hMargine), x: new Float64Array(Nl), lit: L, mare: 0 };
    st.im = Float64Array.from(st.m, (v) => 1 / v); const ea = new Float64Array(Nl), lato = (2 * Math.PI * raggioM) / w;
    st.hNeutro = L.hN; st.xMax = 1;
    ca = null; if (!n && l < liv.length - 1) continue;
    c0 = ((orologio ? dt : dt * V) * w) / (2 * Math.PI * raggioM); // (con l'orologio dt è la strada di un passo)
    const giro = orologio ? Dm / dt : tau / dt; // (passi per giro di una cella)
    const R = Math.max(2, Math.round((C.rigida * w) / onde)), ogni = Math.max(1, Math.min(4, Math.round(0.25 * giro))), dtM = ogni / giro, kappa0 = Math.min(0.04, (C.erosione * dt) / ((2 * Math.PI * raggioM) / w) ** 2);
    const coperta = new Float64Array(man.Wm * man.Hm), lento = 1 - Math.exp(-dtM / C.inerzia), uL = new Float64Array(Nl), rm = w / man.Wm;
    const aggiorna = (avanza) => {
      // la coperta: quanta parte di ogni cella del mantello sta sotto un continente (rispetto alla media)
      let m = 0;
      for (let j = 0; j < man.Hm; j++) for (let i = 0; i < man.Wm; i++) { let c = 0; if (rm >= 1) { for (let b = 0; b < rm; b++) for (let a = 0; a < rm; a++) c += robusta(st.h[(j * rm + b) * w + i * rm + a], ihN); c /= rm * rm; } else c = robusta(st.h[Math.floor(j * rm) * w + Math.floor(i * rm)], ihN); const k = j * man.Wm + i; caldo[k] += (c - caldo[k]) * lento; m += caldo[k]; }
      m /= coperta.length; for (let i = 0; i < coperta.length; i++) coperta[i] = C.coperta * (caldo[i] - m);
      if (avanza) man.passo(dtM, coperta, T ? vigore(T.di(t).q) : undefined);
      // il mare di adesso (il livello di base di fiumi e pendii) e LO STATO DI RIFERIMENTO: l'energia potenziale media della
      // litosfera del pianeta (Coblentz, Richardson e Sandiford 1994 [V, dal riassunto]: chi pesa quanto la media non è né
      // stretto né tirato; sulla Terra è un continente vicino al livello del mare, o un fondale a 4,3 km). Lo spessore
      // neutro è quello della colonna continentale che pesa quanto la media di adesso; la crosta «normale» (la misura
      // della robustezza) è quella che ha la cima sul mare
      st.mare = livelloMare(quotaAria(st, ea, c0), w, hh, st.mare);
      { const { h, a: eo, m, im } = st; let F = 0, P = 0; for (let j = 0; j < hh; j++) { const pj = Math.cos(Math.PI / 2 - ((j + 0.5) / hh) * Math.PI); let Fj = 0; for (let i = 0; i < w; i++) { const k = j * w + i, hk = h[k]; if (hk > 0) { const c = hk * im[k]; Fj += c >= 1 ? L.forzaDi(hk) : c * L.forzaDi(m[k]) + (1 - c) * L.forzaOceano(eo[k]); } else Fj += L.forzaOceano(eo[k]); } F += pj * Fj; P += pj * w; }
        st.hNeutro = L.spessoreDi(F / P); reggeP.fermo = st.hNeutro; reggeP.normale = Number.isFinite(st.mare) ? Math.max(C.hMargine, L.base(st.mare, 0)) : L.hN; }
      ca = campoDaPotenziale(man.su(w, hh, uL), w, hh, c0, ca, reggeP); velocitaCrosta(st.h, ca, w, hh, R);
    };
    for (let p = 0; p < n; p++) {
      if (p % ogni === 0) aggiorna(p > 0 || l > 0);
      // OGGI: da quando le velocità sono state calcolate l'ultima volta (gli ultimi «ogni» passi della griglia più fine) si
      // tiene il conto di quanto la crosta è stretta, di quanta ne nasce agli archi e di quanto fiumi e pendii tolgono e posano
      if (l === liv.length - 1 && p === Math.max(0, n - Math.max(ogni, Math.round(0.25 * giro)))) { st.conto = { stretta: new Float64Array(Nl), termico: new Float64Array(Nl), arco: new Float64Array(Nl), tolto: new Float64Array(Nl), posato: new Float64Array(Nl) }; finestra = (n - p) * dt; tFinestra = t; }
      // la durata del passo: con l'orologio, quella in cui le placche di allora fanno la strada di un passo
      const dtp = orologio ? Math.max(1, (p === n - 1 && l === liv.length - 1 ? eta : orologio.tempoDi(strada + dt)) - t) : dt, kappa = orologio ? Math.min(0.04, (C.erosione * dtp) / ((2 * Math.PI * raggioM) / w) ** 2) : kappa0;
      // la crosta nuova di questo passo (se non c'è ancora nessuna fossa dove farla nascere, resta in debito)
      let apporto = 0;
      if (T) { const nuova = C.archi * T.di(t + 0.5 * dtp).basalto * (st.sommaSub1 ?? 0); if (st.sommaSub > 0 && nuova > 0) { apporto = nuova / st.sommaSub; prodotta += nuova / Nl; } }
      else { const nuova = (crostaAttesa(t + dt) - crostaAttesa(t)) * C.hMisura * Nl + debito; if (st.sommaSub > 0) { apporto = nuova / st.sommaSub; prodotta += nuova / Nl; debito = 0; } else debito = nuova; }
      passoCrosta(st, ca, { dtMa: dtp / 1e6, kappa, apporto, fiumi: 1 - Math.exp(-dtp / C.fiumi), cede: (L.cede * dtp * ANNO) / (lato * lato) }); t += dtp; strada += orologio ? dt : 0; nPassi++; dtUltimo = dtp;
      // il riciclo: dove il fondale affonda sotto un continente (la cella, o una delle quattro accanto, è tutta crosta leggera: non i
      // veli degli archi, che nascono lì sopra) la fossa se ne porta via la parte «riciclo» del basalto che affonda, dalla cella
      // di continente più spessa
      if (T) { const b = C.riciclo * T.di(t).basalto, { h: hh2, sub: sb, piena: pn } = st, vE = st.geo.v[0], mW = st.geo.m[0];
        for (let k = 0; k < Nl; k++) { const sk = sb[k]; if (!(sk > 0)) continue; let q = pn[k] ? k : -1; const vic = [vE[k], mW[k], k >= w ? k - w : -1, k < Nl - w ? k + w : -1]; for (const v of vic) if (v >= 0 && pn[v] && (q < 0 || hh2[v] > hh2[q])) q = v;
          if (q < 0) continue; const via = Math.min(hh2[q], b * sk); hh2[q] -= via; riciclata += via / Nl; if (st.res) st.res[q] *= hh2[q] + via > 0 ? hh2[q] / (hh2[q] + via) : 0; if (st.cop) st.cop[q] = Math.min(st.cop[q], hh2[q]); } }
      // LA DELAMINAZIONE, cella per cella: dove la colonna intera di crosta (la cella tutta coperta) scende oltre zDel, la parte del suo
      // residuo che sta sotto zDel è eclogite (solo quella: il residuo sopra la transizione e la crosta chiara restano), e cade col
      // ritmo di Rayleigh-Taylor alla temperatura della radice (la geoterma ispessita, che si rilassa): in questo passo ne cade la
      // parte 1 − exp(−q·dt). eta_ è il tempo della radice per lo spessore (si somma e viaggia come una quantità)
      if (T && radiceAffonda) { const { h: hd, x: xd, im: imd, res, etaRad: eta_ } = st, zF = L.zFuso, hN = st.hNeutro || L.hN, dts = dtp * ANNO; let tolta = 0;
        for (let k = 0; k < Nl; k++) { const hk = hd[k], rk = res[k]; if (hk > zDel && hk * imd[k] >= 1) eta_[k] += hk * dtp; else { eta_[k] = 0; continue; } if (!(rk > 0)) continue;
          const Lr = Math.min(hk - zDel, rk), z = zDel + 0.5 * Lr, beta = 1 + (Math.max(1, hk / hN) - 1) * Math.exp(-(eta_[k] / hk) / L.tau), Tr = Math.min(Ts + C.Tastenosfera, Ts + ((C.Tfuso - Ts) * z) / (zF * (1 - xd[k]) * beta)),
            eta = etaRadice * Math.exp((STORIA.Enu / R_GAS) * (1 / Tr - 1 / C.Tradice)), q = (C.ritmoRT * (C.rhoEclogite - C.rhoMantello) * gravita * Lr) / eta, via = -Lr * Math.expm1(-q * dts);
          if (via > 0) { tolta += via; hd[k] = hk - via; res[k] = rk - via; if (st.cop) st.cop[k] = Math.min(st.cop[k], hd[k]); } }
        delaminata += tolta / Nl; }
    }
    debito *= 4; // (alla griglia successiva le celle sono quattro volte tante)
    if (!ca) aggiorna(false);
  }
  // ---------- il presente: quote dal galleggiamento della litosfera, mare, continenti, spinta, fosse
  if (orologio && tFinestra != null) finestra = eta - tFinestra;
  const dtFine = orologio ? dtUltimo : liv[liv.length - 1].dt, metriAnno = dtFine > 0 ? (2 * Math.PI * raggioM) / W / dtFine : 0; let presente = 0;
  const { h, a, m, im, x } = st, { conv } = ca;
  const ea = quotaAria(st, new Float64Array(N), c0), mare = livelloMare(ea, W, H, st.mare), gN = L.galleggia;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, hk = h[k], c = Math.min(1, hk * im[k]), wo = 1 - c; presente += hk / N;
    spessore[k] = hk; copre[k] = c; cont[k] = hk > 0 && c >= 1 ? 1 : 0; etaCrosta[k] = wo > 0 ? a[k] : 0; // (continente: la cella è tutta crosta leggera, anche stirata e sommersa)
    spinta[k] = cont[k] ? conv[k] : 0; // dove la crosta dei continenti è compressa oggi: lì i monti crescono
    fosse[k] = wo * fossaDi(st, c0, k, i, j);
    // ISOSTASIA: la quota a cui la colonna galleggia (litosfera()); sotto il mare il peso dell'acqua la abbassa ancora
    alt[k] = ea[k] >= mare ? ea[k] : mare - (mare - ea[k]) * L.carica;
    // lo stato termico, e di quanto la colonna scenderà ancora (in aria) raffreddandosi: la subsidenza termica che resta
    if (hk > 0) { const hc = c >= 1 ? hk : m[k]; calore[k] = x[k]; stiramento[k] = C.hMargine / m[k]; termica[k] = c * (L.quota(hc, x[k]) - L.quota(hc, 0)); }
    copertura[k] = st.cop[k];
    regge[k] = gN * Math.max(0, ca.cap[k] - hk);
    if (finestra > 0) { const cn = st.conto; arco[k] = cn.arco[k] / finestra; consumata[k] = cn.tolto[k] / finestra; posata[k] = Math.max(0, cn.posato[k]) / finestra; sollevamento[k] = (gN * (cn.stretta[k] + cn.arco[k]) + L.aTeta * cn.termico[k]) / finestra; }
    velEst[k] = ca.A[k] * metriAnno; velSud[k] = ca.B[k] * metriAnno;
  }
  return { W, H, alt, cont, copre, calore, termica, stiramento, mare, litosfera: { a: L.a, tau: L.tau, aria: L.aria, hNeutro: st.hNeutro, hDorsale: L.hN, xDebole: L.xDebole, galleggia: gN, zFuso: L.zFuso, basalto: L.basalto, carica: L.carica }, spinta, etaCrosta, celle: man.celle(), salite: Float32Array.from(man.su(W, H)), spessore, fosse, copertura, sollevamento, regge, arco, consumata, posata, velEst, velSud, regime: 'a placche', bilancio: { prodotta, presente, inViaggio: (st.fango ?? 0) / N, riciclata, delaminata }, storia: { simulati: eta - saltati, saltati, passi: nPassi, velocita: V, livelli: liv.map((L) => ({ W: L.W, passi: L.n, ...(orologio ? { strada: L.n * L.dt } : { anni: L.n * L.dt }) })), impronta: origine, finestra, conLaStoria: !!T } };
}
