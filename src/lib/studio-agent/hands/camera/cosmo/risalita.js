// risalita.js — CIÒ CHE IL PICCOLO FA AL GRANDE: come le particelle, i decadimenti, i raggi cosmici e le fluttuazioni
// risalgono ai livelli di sopra (l'aria, il pianeta, il sistema, il cosmo).
//
// INTRECCIO.md lo dichiarava come un buco: «un evento piccolo non risale mai». Qui ci sono le due sole vie fisiche:
//   A. I FLUSSI (regola 7). Miliardi di eventi piccoli, sommati, danno un numero al livello di sopra: ioni nell'aria,
//      azoto fissato, argon, calore, dose. La somma NON dipende da come è andato ciascun evento: per questo un ramo
//      (eventi.js) non la cambia. Ogni flusso è calcolato per il luogo (pianeta, punto, profondità) da ciò che
//      materia.js sa già: `raggiCosmici`, `attivita`, `calore`, `perdita`. Niente è rifatto qui.
//   B. GLI AMPLIFICATORI (regola 3). Un evento SINGOLO decide qualcosa di grande solo attraverso un sistema che lo
//      amplifica. Ce ne sono di tre specie: (i) stati metastabili (aria sovrassatura, acqua sopraffusa, una nube carica
//      sotto la soglia della scarica, una salamoia sovrassatura); (ii) sistemi caotici (il tempo atmosferico, i vortici
//      del mare, il mantello, la dinamo, le orbite dei corpi piccoli); (iii) chimica che si copia (una mutazione).
//      Per ciascuno: se in quel luogo c'è, con che ritmo un evento subatomico lo innesca, e IL TEMPO DI AMPLIFICAZIONE.
//      `finDoveRisale(evento, luogo)` dice quali livelli possono essere diversi nel mondo dove quell'evento è andato in
//      un altro modo, e da quando. Tutto il resto è identico (è la regola di `puoToccare`, intreccio.js, con il tempo).
//   E IL RACCORDO INVERSO: gli esiti incerti dei livelli grandi (gli eventi della `sorgente`: dove cade un corpo, come
//   parte il mantello, quale stella esplode, le fasi delle onde del cosmo) NON sono un caso in più. Sono eventi
//   subatomici amplificati: `FAMIGLIE` dice, per ogni famiglia di eventi del progetto, quale amplificatore le sta sotto.
//
// LEGGI
//   · Ionizzazione dell'aria: q = Σ (flusso di ogni componente, da tutte le direzioni) × (frenata in quell'aria, Bethe:
//     materia.js) × densità / W, con W l'energia per coppia di ioni. Il massimo in quota (Pfotzer) esce da solo: sopra
//     c'è poca aria da ionizzare, sotto lo sciame è già spento.
//   · Ioni all'equilibrio: n = √(q/α) (produzione = ricombinazione α·n²); conducibilità σ = 2·e·n·μ, con la mobilità
//     μ ∝ 1/densità. Circuito globale: i temporali caricano l'alta atmosfera (corrente = fulmini al secondo × carica);
//     il potenziale è corrente × resistenza della colonna / superficie (legge di Ohm); la corrente di bel tempo ne discende.
//   · Fulmini: la loro potenza è una parte fissa del calore latente della pioggia (convezione umida).
//   · Azoto fissato: N per coppia di ioni (cosmici) e NO per fulmine (aria scaldata a 30 000 K e raffreddata in fretta).
//   · Ultravioletto che rompe le molecole (sotto i 200 nm): la parte del corpo nero della stella (Planck) sotto quella
//     soglia, corretta per le righe dei metalli, più l'emissione della cromosfera.
//   · Radiolisi: moli di H2 = energia assorbita dall'acqua × G; nella roccia bagnata l'acqua dei pori prende una parte
//     dell'energia in proporzione alla sua massa e a quanto frena rispetto alla roccia (rapporto delle frenate di
//     materia.js: non è un dato).
//   · Gas radiogenici: argon-40 = K-40 decaduto nell'età del pianeta × 10,72% (cattura elettronica) × parte uscita
//     dall'interno; elio-4 = le α delle catene (8, 7, 6 per U-238, U-235, Th-232: contate su CATENE). Restano se la
//     gravità li tiene (`trattiene`, leggi.js). Piombo radiogenico: Pb/U = e^(λt) − 1 (l'orologio dello zircone).
//   · Vento della stella: pressione = Ṁ·v/(4π a²); la magnetosfera arriva dove il campo la regge:
//     r/R = 2^(1/3)·(B0²/(2μ0·p))^(1/6). Aria portata via: al più la massa di vento che il pianeta intercetta (i suoi
//     ioni caricano il vento, che rallenta: conservazione della quantità di moto). Aurore: una parte della potenza del
//     vento sulla sezione della magnetosfera. Superfici senz'aria: atomi strappati = ioni arrivati × resa.
//   · Dose: energia ionizzante per kg (gray) = flusso × frenata nell'acqua; in sievert pesando ciò che ionizza fitto
//     (nuclei pesanti, α, neutroni). Sopra un suolo radioattivo arriva metà dei γ che la roccia assorbirebbe se fosse
//     tutt'attorno (un semispazio): il coefficiente dell'UNSCEAR esce da questa sola riga entro il 10–16%.
//   · Supernova vicina: i raggi cosmici di un'esplosione diffondono; a distanza d la densità di energia tocca al
//     massimo 0,0736·E/d³ (soluzione della diffusione da un punto, al tempo d²/6D). Quante: il ritmo della galassia
//     diviso il volume del suo disco.
//   · Tempo di amplificazione del tempo atmosferico: la turbolenza porta un disturbo dalla scala delle molecole a quella
//     dei temporali in 2,7 giri del vortice più grande (cascata di Kolmogorov: i tempi dei vortici vanno come l^(2/3) e si
//     sommano in serie geometrica); poi i cicloni lo fanno crescere col ritmo dell'instabilità baroclina (Eady:
//     0,31·f·(dU/dz)/N, con il vento termico dal salto di temperatura tra equatore e polo) per ln(R/H) raddoppi «e».
//   · Orbite: un disturbo δ cresce come e^(t/T_L); arriva a contare dopo T_L·ln(1/δ).
//
// DATI (misurati; [V] = verificato in rete per questo file, [R] = ricordato, da verificare)
//   · W = 35 eV per coppia di ioni nell'aria [V: Usoskin, Desorgher e altri 2009, Acta Geophys. 57, 88, eq. 2].
//   · Riscontri della ionizzazione: ~2 coppie/cm³/s al livello del mare, ~10 a 10 km, 14–41 a 15 km secondo la
//     latitudine [V: proposta CLOUD, arXiv physics/0104048]; massimo tra 15 e 20 km [V, ivi].
//   · Ricombinazione degli ioni: α = 6·10⁻⁸·√(300/T) + 6·10⁻²⁶·[M]·(300/T)⁴ cm³/s (1,6–1,9·10⁻⁶ al suolo) [R];
//     mobilità dei piccoli ioni 1,4·10⁻⁴ m²/V/s a pressione e temperatura normali [R].
//   · Circuito globale della Terra: resistenza della colonna 1,3·10¹⁷ Ω·m², potenziale 250 kV, corrente 2 pA/m² [R].
//   · Fulmini sulla Terra: 44 ± 5 al secondo, 250 mol di NO ciascuno (fattore d'incertezza 0,13–2,7), 5 ± 3 Tg di azoto
//     all'anno [V: Schumann e Huntrieser 2007, Atmos. Chem. Phys. 7, 3823]; 10⁹ J e 20 C per fulmine [R].
//   · 1,25 atomi di N e 2 radicali HOx per coppia di ioni [V: Porter, Jackman e Green 1976; Jackman e altri 1980;
//     Solomon e altri 1981; l'intervallo proposto per N va da 0,96 a 1,6].
//   · C-14: ~2 atomi/cm²/s (1,6–2,5) e Be-10: 0,02–0,03 [V: Usoskin 2008, Living Rev. Sol. Phys., arXiv 0810.3972].
//   · Nuclei di condensazione: sul ciclo del Sole (i cosmici variano del ~15%) cambiano dell'1% o meno [V: Gordon e altri
//     2017, JGR 122, 8739; Pierce 2017]. Sensibilità: d ln(nuclei)/d ln(ionizzazione) ≲ 0,05.
//   · Ultravioletto del Sole sotto i 200 nm: ~0,1 W/m² a 1 UA (7·10⁻⁵ della sua luce) [R: SORCE]: un ventesimo del corpo
//     nero a 5772 K. Cromosfera delle stelle fredde: ~10⁻⁵ della loro luce nell'ultravioletto lontano [R].
//   · Tabella di Miller e Urey (1959) per la Terra, in cal/cm²/anno: ultravioletto sotto 200 nm 85, scariche 4,
//     radioattività (primo km) 0,8, raggi cosmici 0,0015 [R]. (1 cal/cm²/anno = 1,33·10⁻³ W/m².)
//   · Radiolisi: G(H2) = 1,57 (α), 0,53 (β), 0,45 (γ) molecole per 100 eV [V: Blair e altri 2007, Astrobiology 7, 951,
//     da Spinks e Woods 1990]. Riscontro: la crosta antica dei continenti dà 0,36–2,27·10¹¹ mol di H2 all'anno
//     (radiolisi più idratazione) [V: Sherwood Lollar e altri 2014, Nature 516, 379]; solo radiolisi 0,16–0,47·10¹¹ [R].
//   · Argon-40 nell'aria della Terra: 6,6·10¹⁶ kg, lo 0,934% in volume; ne è uscito circa metà di quello prodotto [R:
//     Allègre e altri 1996]. Venere ne ha un quarto per chilo di pianeta [R], Marte ~2% del prodotto [R, conto mio].
//     L'argon gela a 83,81 K (punto triplo: 68,9 kPa; sublimazione 7,7 kJ/mol) [R].
//   · Elio: 5,2 milionesimi dell'aria; ne escono ~2·10⁶ atomi/cm²/s e resta ~un milione di anni [R].
//   · Zircone: non diffrange più i raggi X a 4,5·10¹⁸ α per grammo [V: Murakami e altri 1991, Am. Mineral. 76, 1510];
//     dose caratteristica 3,5·10¹⁸ [V: Salje e altri 1999], e non c'è una soglia netta.
//   · Vento del Sole: 1,3·10⁹ kg/s a 400 km/s; nelle stelle giovani di più, Ṁ ∝ t^(−2,33) [R: Wood e altri 2005].
//     Magnetopausa della Terra a 10 raggi; aurore 1–10·10¹⁰ W [R]. Marte perde oggi 1–2 kg/s in tutto e ne ha persi,
//     integrando all'indietro, fino a ~0,8 bar di CO2 [V: Jakosky e altri 2018, Icarus 315, 146]; gli ioni soli ~0,1 kg/s [R].
//   · Resa dello sputtering del vento solare su un silicato: ~0,05 atomi per ione; il suolo lunare annerisce in
//     10⁵–10⁶ anni [R].
//   · Dose: Terra al livello del mare 0,27 mSv/anno di cosmici che ionizzano più 0,05 di neutroni; totale medio 2,4
//     (cosmici 0,39, γ del suolo 0,48, radon respirato 1,26, mangiato 0,29) [V: UNSCEAR 2008]. Marte al suolo:
//     0,210 ± 0,040 mGy al giorno [V: Hassler e altri 2014, Science 343, 1244797] e 0,64 mSv al giorno [R, ivi].
//   · Composizione dei raggi cosmici alla stessa energia per nucleone: per 1 protone, 0,06 nuclei di elio e ~0,005 più
//     pesanti; pesando con z² i pesanti portano il 29% della dose e, con il fattore di qualità Q(LET) dell'ICRP 60,
//     i tre quarti del danno: ne esce un Q medio di 3,7 nello spazio (misurato: 3,8) [R; conto in questo file].
//   · Neutroni cosmici: 200 pSv·cm² per neutrone, in media sul loro spettro [R].
//   · Rotture del DNA: ~1000 a filamento singolo per cellula umana (6,4·10⁹ basi) per gray; l'acqua stacca una purina
//     ogni 3·10⁻¹¹ s a 37 °C, con energia di attivazione 130 kJ/mol [R: Lindahl e Nyberg 1972].
//   · Raggi cosmici nella galassia: 1 eV/cm³; diffusione 3·10²⁸ cm²/s [R]. Una supernova ne fa 10⁴³ J (un decimo
//     della sua energia: lo stesso numero di galassie.js). Raggi γ pronti 1,8·10⁴⁰ J; lo strato d'ozono si dimezza sotto ~8 parsec,
//     cioè sopra ~20 kJ/m² [R: Gehrels e altri 2003, ApJ 585, 1169].
//   · Caos: il sistema solare interno ha un tempo di Lyapunov di ~5 milioni di anni (15 m d'errore sulla Terra
//     diventano 150 milioni di km in 100 milioni di anni) [V: Laskar 1989; Laskar 2012, arXiv 1209.5996]; i corpi
//     piccoli nelle zone caotiche ~10⁵ anni [R]. Il tempo atmosferico: limite di due settimane (Lorenz 1969), nato da
//     un tempo di raddoppio di 5 giorni nei modelli degli anni '60 [V: Shen e altri 2024, Atmosphere 15, 837]; i
//     modelli di oggi raddoppiano gli errori piccoli in 1,5–2,5 giorni [R].
//
// PARAMETRI LIBERI
//   · RESA_FULMINI = 1,08·10⁻⁶: la parte del calore latente che diventa fulmine (fissata sulla Terra: 44 al secondo).
//   · QUOTA_IONIZZAZIONE = 0,6: la parte dell'energia dei primari che resta nell'aria come ionizzazione (il resto ai
//     neutrini, ai muoni che arrivano al suolo, ai nuclei spezzati). Sta tra 0,5 e 0,8 secondo quanta energia va ai
//     pioni carichi; 0,6 è scelto perché il massimo in quota alle medie latitudini della Terra venga 25.
//   · La parte di gas radiogenici uscita dall'interno: 0,5 con le placche, 0,25 con i soli vulcani, 0,02 se è fermo.
//   · POROSITA = 1%: l'acqua nelle fratture della crosta. · ECCESSO_ESOSFERA = 4: quanto è più calda l'aria altissima
//     (dove i gas fuggono) rispetto alla temperatura d'equilibrio (Terra: ~1000 K contro 255).
//   · RESA_AURORE = 1% della potenza del vento sulla magnetosfera. · L'1‰ dell'aria spostato da un tempo diverso (per
//     quanto un pianeta disturba le orbite). · I «cinque giri» del mantello, i «dieci giri» della dinamo e dei vortici
//     del mare dopo cui un disturbo è grande quanto il moto.
//
// SEMPLIFICAZIONI
//   · I flussi dei cosmici sono quelli di materia.js (attraverso una superficie orizzontale); per sapere quanti ne
//     passano da tutte le direzioni si moltiplica per un fattore tra 2 (in cima) e 1,3 (in fondo all'aria).
//   · Elettroni dello sciame a 30 MeV, protoni secondari a 1 GeV; i neutroni non ionizzano l'aria (solo dose). Il numero
//     degli elettroni dello sciame è riscalato, uguale a ogni quota, perché l'energia torni (vedi colonnaDi).
//   · L'aria ha una temperatura che cala con la quota fino a quella «di pelle» e poi resta costante; W uguale per ogni gas.
//   · La ricombinazione ignora la polvere: gli ioni che si attaccano agli aerosol mancano (la conducibilità vera al
//     suolo è 2–5 volte più bassa sopra la terraferma).
//   · I fulmini ci sono solo dove piove acqua; niente fulmini di polvere o di cenere.
//   · Il vento della stella è quello del Sole, scalato con la superficie della stella e con l'età.
//   · La stessa parte degassata per l'argon e per l'elio; la stessa crosta (i minerali del luogo) per tutto il pianeta.
//   · Una supernova: disco uniforme, niente bracci; i suoi raggi diffondono liberi come nel resto della galassia (vicino
//     alla sorgente in realtà restano intrappolati più a lungo): si danno i due estremi, picco breve o rilascio lento in
//     30 mila anni (la vita del resto, come in galassie.js), e l'integrale, che è lo stesso.
//   · `finDoveRisale` conta solo ciò che passa per la materia (suono, calore, fluidi) dentro il pianeta, e la gravità
//     solo per le orbite dei corpi piccoli. In linea di principio la gravità porta ogni disturbo ovunque alla
//     velocità della luce, e il moto caotico delle molecole lo amplifica in una frazione di secondo (Borel 1914): il
//     contenitore vero di un evento è tutto il suo cono di luce. Ma ciò che cambia così altrove è soltanto QUALE dei
//     microstati equivalenti: cioè gli esiti che lì sono già eventi della sorgente di quel luogo. La regola 3 taglia
//     questo legame, e qui lo si dichiara.
//
// CHE COSA NON TORNA (i numeri li stampa test/test_risalita.mjs)
//   · Il massimo di ionizzazione in quota: 25 coppie/cm³/s a 45° (misurate 20–30), ma solo perché QUOTA_IONIZZAZIONE è
//     scelta per questo: con i «2 secondari per primario» di materia.js verrebbe 16. Poi la latitudine esce da sola:
//     11 all'equatore e 32 ai poli (misurate a 15 km: 14 e 41). Il massimo sta a 13 km: quello del FLUSSO di particelle
//     è a 15–20, quello delle coppie per cm³ più in basso, ma forse non così tanto.
//   · L'azoto fissato dai cosmici viene 0,14 Tg all'anno contro 0,06–0,09 pubblicati.
//   · Marte: 150 mSv all'anno contro 234 misurati dal rover (54 mGy contro 77); la Luna: 180 contro ~500. Mancano i
//     secondari nati nell'aria sottile e nel suolo, e ciò che il suolo rimanda indietro.
//   · Un campo magnetico forte NON azzera i cosmici al suolo: a 45° li dimezza soltanto (passano i muoni dei primari
//     più energici); li spegne in quota e ai tropici.
//   · L'aria portata via dal vento: per Marte ~0,06 bar in tutta la sua storia, contro i ~0,8 dedotti da MAVEN: qui c'è
//     solo ciò che il vento carica; la fuga fotochimica e lo sputtering dei primi tempi mancano. E il campo magnetico
//     in questa legge NON protegge (la Terra perde quanto intercetta, ~0,6 kg/s: misurato ~1): è onesto, ma non è
//     ciò che il progetto dice altrove.
//   · L'elio: con la regola di `trattiene` alla temperatura d'equilibrio la Terra lo terrebbe (e ne avrebbe l'1%);
//     in realtà fugge dall'aria altissima, calda e ionizzata. Qui la fuga è decisa a 4 volte quella temperatura e il
//     tempo di permanenza è quello misurato sulla Terra: è una pezza, non una legge.
//   · L'ultravioletto di una nana rossa: il corpo nero dà quasi zero, la cromosfera (un numero solo) fa tutto.
//   · La tabella delle energie mette nella stessa unità energie che rendono molto diversamente: una scarica fa cento
//     volte più molecole per joule di un fotone ultravioletto in un'aria neutra. `relativa` non lo sa.
//   · I tempi di amplificazione sono stime d'ordine di grandezza, non uscite di un modello: quello dell'aria viene da
//     due formule (cascata + Eady), gli altri da «N giri» dichiarati.
//   · Il campo iniziale di cosmo.js: vedi `fluttuazioniDellInizio()`.
import { ELEMENTI, atomiDi, mezzo, perdita, CATENE, SOLI, CONDRITI, VOLATILI_RIMASTI, ETA_RIFERIMENTO, radioelementi, concentrazioni, attivita, calore, raggiCosmici, energiaDeiPrimari, sogliaStormer, radonNellAria, fmtTempo, ritenzione, luogoDaAria, luogoDaRoccia } from './materia.js';
import { COSTANTI, ANNO, MSOLE, RSOLE, LSOLE, UA, trattiene, temperaturaEquilibrio, gravitaDiSuperficie, LIVELLO_GIGANTI, R_GAS, ATMOSFERA, GIORNO, MTERRA, PC, PESI_ATOMICI, RTERRA, TSOLE, ZERO_CELSIUS } from './leggi.js';
import { stella as stellaDiMassa } from './stelle.js'; // le stelle dalla loro struttura
import { LEGGI as LEGGI_GALASSIE } from './galassie.js'; // lo spessore del disco di gas: una fonte
import { raggiCosmiciIn } from './vuoto_mezzo.js'; // l'energia dei raggi cosmici di una galassia nota
import { rocceDelPianeta } from './chimica.js';
import { sorgente } from './eventi.js';
import { puoToccare } from './intreccio.js';

const G_N = COSTANTI.G, K_B = COSTANTI.kB, E_C = COSTANTI.e, SIGMA = COSTANTI.sigma, N_A = COSTANTI.NA, UMA = COSTANTI.u, MU0 = 4e-7 * Math.PI;
const MEV_J = 1.602177e-13, PARSEC = PC, MOLE_PER_J = 1.0364e-7; // (una molecola per 100 eV, in moli per joule)
export const DATI = Object.freeze({
  W_ARIA: 35, // eV per coppia di ioni
  MOBILITA: 1.4e-4, // m²/V/s a 2,55·10²⁵ molecole per m³
  N_PER_COPPIA: 1.25, HOX_PER_COPPIA: 2,
  ENERGIA_FULMINE: 1e9, CARICA_FULMINE: 20, NO_PER_FULMINE: 250, // J, C, mol
  RESA_FULMINI: 1.08e-6, // PARAMETRO LIBERO (Terra: 44 fulmini al secondo da 79 W/m² di calore latente)
  BE10_TERRA: 210, // atomi/m²/s (0,021 per cm²)
  SENSIBILITA_NUCLEI: 0.05,
  RIGHE: 0.05, CROMOSFERA: 1e-5, UV_NM: 200,
  G_H2: { alfa: 1.57, beta: 0.53, gamma: 0.45 }, // molecole per 100 eV
  POROSITA: 0.01, // PARAMETRO LIBERO
  DEGASSATA: { 'a placche': 0.5, 'coperchio unico, con vulcani': 0.25, ferma: 0.02 }, // PARAMETRI LIBERI (Terra, Venere, Marte)
  ARGON_VAPORE: [83.81, 68.9e3, 7700], // punto triplo (K, Pa) e calore di sublimazione (J/mol)
  ECCESSO_ESOSFERA: 4, PERMANENZA_ELIO: 1e6, // PARAMETRO LIBERO; anni (Terra)
  ZIRCONE_AMORFO: 4.5e18, // α per grammo
  VENTO_SOLE: 1.3e9, VELOCITA_VENTO: 4e5, ETA_SOLE: 4.6e9, ESPONENTE_VENTO: -2.33, VENTO_MASSIMO: 100,
  RESA_AURORE: 0.01, RESA_SPUTTERING: 0.05, ANNERIMENTO: 3e5, // PARAMETRO LIBERO; atomi per ione; anni a 1 UA dal Sole
  NEUTRONE_SV: 200e-12 * 1e-4, // Sv·m² per neutrone
  PESANTI_DOSE: 0.31, PESANTI_DANNO: 3.85, PESANTI_CAMMINO: 60, // l'eccesso dei nuclei pesanti (in gray, in sievert) e in quanti g/cm² si spezzano
  PESO_ALFA: 20, RADON_SV: 9e-9 * 0.6 * 8766, // Sv all'anno per Bq/m³ di radon all'aperto (per chi ha polmoni)
  ROTTURE_PER_GY: 1000 / 6.4e9, IDROLISI: 3e-11, IDROLISI_T: 310, IDROLISI_EA: 1.3e5, // per base per gray; 1/s a 310 K; J/mol
  COSMICI_GALASSIA: 1.602e-13, DIFFUSIONE: 3e24, ENERGIA_SN_COSMICI: 1e43, ENERGIA_SN_GAMMA: 1.8e40, OZONO: 2e4, // J/m³, m²/s, J, J, J/m²
  // (SPESSORE_DISCO: la mezza altezza dello strato di gas, letta da galassie.js LEGGI.spessoreGas (0,1 kpc): una fonte.
  // COSMICI_GALASSIA è la RISERVA per quando la galassia non è nota: dove lo è, supernovaVicina legge l'energia dei raggi
  // cosmici di QUELLA galassia da vuoto_mezzo.js raggiCosmiciIn. Restano doppioni dichiarati (vedi la mappa delle grandezze):
  // VITA_RESTO (3·10⁴ anni; galassie.js LEGGI.sedov dà 2,9·10⁴·n^(−9/17)), SN_VIA_LATTEA e RAGGIO_VIA_LATTEA (gli stessi
  // 0,02 all'anno e 15 kpc che materia.js cieloRelativo scrive in linea: nessuno dei due li espone con un nome))
  VITA_RESTO: 3e4, SPESSORE_DISCO: LEGGI_GALASSIE.spessoreGas * 1e3, SN_VIA_LATTEA: 0.02, RAGGIO_VIA_LATTEA: 15e3, // anni; parsec; all'anno; parsec
  LYAPUNOV_PICCOLI: 1e5, LYAPUNOV_PIANETI: 5e6, // anni
  ARIA_SPOSTATA: 1e-3, GIRI_MANTELLO: 5, GIRI_DINAMO: 10, GIRI_MARE: 10, // PARAMETRI LIBERI
});
const D = DATI;

// ---------- piccoli attrezzi
const ARIA_TERRA = { N2: 0.781, O2: 0.209, Ar: 0.0093 };
const CP_MOLARE = { He: 2.5, Ar: 2.5, Ne: 2.5, N2: 3.5, O2: 3.5, H2: 3.5, CO: 3.5, CO2: 4.47, H2O: 4.04, CH4: 4.3, NH3: 4.3, SO2: 4.8 }; // in unità di R
const massaGas = (f) => { const a = atomiDi(f); let m = 0; for (const e in a) m += a[e] * ELEMENTI[e].A; return m; }; // g/mol
function gasPuliti(gas) { if (!gas) return null; const o = {}; let n = 0; for (const f in gas) { if (!(gas[f] > 1e-9)) continue; try { massaGas(f); o[f] = gas[f]; n++; } catch { /* un gas che la tavola non conosce */ } } return n ? o : null; }
const resta = (mezza, eta) => Math.pow(2, (ETA_RIFERIMENTO - (eta ?? ETA_RIFERIMENTO)) / mezza); // quanto c'è oggi di un nuclide rispetto al riferimento (come in materia.js)
const cifre = (x, n = 2) => (x === 0 || !isFinite(x) ? String(x) : Math.abs(x) >= 1e5 || Math.abs(x) < 1e-2 ? x.toExponential(Math.max(0, n - 1)).replace('.', ',').replace(/e\+?(-?)(\d+)/, (_, s, e) => `·10${[...(s + e)].map((c) => '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(c)]).join('')}`) : Number(x.toPrecision(n)).toLocaleString('it-IT', { maximumSignificantDigits: n }));
const anni = (a) => (isFinite(a) ? fmtTempo(a * ANNO) : 'mai');
// la parte di un corpo nero a temperatura T emessa sotto la lunghezza d'onda λ (nm): integrale di Planck in serie
export function sottoLaSoglia(T, nm = D.UV_NM) {
  if (!(T > 0)) return 0; const x = 1.43878e7 / (nm * T); let s = 0;
  for (let n = 1; n < 40; n++) { const t = Math.exp(-n * x) * (x ** 3 / n + (3 * x * x) / n ** 2 + (6 * x) / n ** 3 + 6 / n ** 4); s += t; if (t < 1e-18 * s) break; }
  return (15 / Math.PI ** 4) * s;
}

// ---------- IL MONDO DEL LUOGO: ciò che serve del pianeta e della stella, da `luogo` (materia.js) e, se c'è, dal pianeta
// di cosmo.js (opz.P), dalla stella (opz.stella: { T, eta, massa }) e dalla galassia (opz.galassia, opz.posizione)
const mondi = new WeakMap();
export function mondoDi(luogo = {}, opz = {}) {
  if (!opz.P && !opz.stella && mondi.has(luogo)) return mondi.get(luogo);
  const P = opz.P || luogo.P || null, pn = luogo.pianeta || {}, ar = luogo.aria || {}, I = P?.interno || {};
  const R = pn.raggioM ?? P?.raggioM ?? RTERRA, g = pn.g ?? P?.clima?.g ?? (P?.massaKg ? gravitaDiSuperficie(P.massaKg, R) : 9.81), M = P?.massaKg ?? (g * R * R) / G_N, area = 4 * Math.PI * R * R;
  const gas = gasPuliti(ar.gas) || gasPuliti(P?.atmosfera?.gas) || ARIA_TERRA; let mu = 0, tot = 0, cp = 0;
  for (const f in gas) { mu += gas[f] * massaGas(f); cp += gas[f] * (CP_MOLARE[f] ?? 4) * R_GAS; tot += gas[f]; } mu = (mu / tot) * 1e-3; cp = cp / tot / mu;
  const Ts = luogo.Tsuperficie ?? ar.T ?? P?.clima?.T ?? 288, Talta = ar.Talta ?? 0.76 * Ts, Teq = P?.clima?.Teq ?? Talta * Math.pow(2, 0.25);
  const H = (R_GAS * Ts) / (mu * g), Hm = (R_GAS * 0.5 * (Ts + Talta)) / (mu * g), pQui = ar.pressione ?? 0;
  // la pressione al suolo (in un gigante di gas non c'è un suolo: si parte dal livello di 1 bar, come fa chimica.js)
  const gassoso = P?.tipo === 'gassoso', p0 = gassoso && !isFinite(P?.clima?.pressione) ? P?.clima?.livello ?? LIVELLO_GIGANTI : isFinite(P?.clima?.pressione) ? P.clima.pressione : luogo.tipo === 'aria' && luogo.quotaM > 0 ? pQui * Math.exp(luogo.quotaM / H) : pQui;
  const eta = luogo.etaPianeta ?? pn.eta ?? I.eta ?? ETA_RIFERIMENTO, B0 = pn.B0 ?? P?.B0 ?? I.B0 ?? 0, lat = luogo.latitudine ?? 45;
  // la stella
  const s0 = luogo.stella || {}, Lw = s0.Lw ?? P?.Lw ?? 0, aM = s0.aM ?? P?.aM ?? 0, S = Lw > 0 && aM > 0 ? Lw / (4 * Math.PI * aM * aM) : 0;
  const Ms = opz.stella?.massa ?? (P?.Mstella ? P.Mstella / MSOLE : null), Tst = opz.stella?.T ?? P?.Tstella ?? (Ms ? stellaDiMassa(Ms).T : Lw > 0 ? TSOLE * Math.pow(Lw / LSOLE, 0.14) : 0);
  // (il raggio della stella si LEGGE: da chi chiama, o dal pianeta, che lo porta in P.Rstella (cosmo.js, da stelle.js stellaOggi).
  // Solo se nessuno lo dà — un pianeta fatto a mano in una prova — lo si ricava da luce e temperatura, √(L/4πσT⁴))
  const Rst = opz.stella?.raggioM ?? s0.raggioM ?? P?.Rstella ?? (Tst > 0 && Lw > 0 ? Math.sqrt(Lw / (4 * Math.PI * SIGMA * Tst ** 4)) : RSOLE), etaStella = opz.stella?.eta ?? eta;
  const albedo = P?.clima?.albedo ?? 0.3, assorbita = P?.clima?.bilancio?.assorbita ?? (S * (1 - albedo)) / 4;
  const acqua = P?.clima ? P.clima.acqua ?? null : luogo.denudazione > 0 || luogo.tipo === 'acqua' ? 'liquida' : undefined, mare = P?.clima?.mare ?? (acqua === 'liquida' ? 0.7 : 0); // (undefined: non si sa)
  const tettonica = I.tettonica ?? (luogo.denudazione > 0 ? 'a placche' : null);
  // la roccia del pianeta intero: il potassio del suo mantello (chimica.js: la stessa fonte delle rocce e del mare) e,
  // da quello, uranio e torio (materia.js: la stessa fonte dei decadimenti)
  let Kmantello = CONDRITI.K * VOLATILI_RIMASTI * 1.83; try { Kmantello = rocceDelPianeta(P || {}).mantello.K * 39.098e-3; } catch { /* resta la stima */ }
  const silicati = gassoso ? 0 : (P?.composizione?.roccia ?? 0.68) * M;
  let dT = 0.14 * Ts; const fT = P?.clima?.fasce?.T; if (fT && fT.length > 1) { let lo = Infinity, hi = -Infinity; for (const t of fT) { if (t < lo) lo = t; if (t > hi) hi = t; } if (hi > lo) dT = hi - lo; }
  // (la temperatura a cui si decide che cosa la gravità trattiene: la stessa di clima() in leggi.js, albedo 0,3)
  const Tfuga = S > 0 ? temperaturaEquilibrio(Lw, aM, 0.3) : Teq;
  const m = { P, R, g, M, area, gas, mu, cp, Ts, Talta, Teq, Tfuga, H, Hm, p0, colonna: p0 / g, massaAria: (p0 / g) * area, eta, B0, lat, q: pn.q ?? I.q ?? 0.087,
    Lw, aM, S, Tst, Rst, etaStella, Ms, assorbita, acqua, mare, tettonica, vulcani: I.vulcani ?? null, dinamo: B0 > 1e-9, nucleo: I.nucleo ?? 0.55, gassoso,
    giorno: P?.bloccato ? P?.anno ?? GIORNO : P?.giorno ?? GIORNO, dT, mantello: radioelementi([], { K: Kmantello }), silicati, vita: !!(opz.vita ?? P?.prebiotica?.autocatalisi) };
  if (!opz.P && !opz.stella && typeof luogo === 'object') mondi.set(luogo, m);
  return m;
}
// un pianeta «come lo dà cosmo.js» ricostruito dal luogo, per chiedere a materia.js un altro luogo dello stesso mondo
const pianetaDa = (m) => m.P || { massaKg: m.M, raggioM: m.R, B0: m.B0, Lw: m.Lw, aM: m.aM, clima: { g: m.g, pressione: m.p0, T: m.Ts, Teq: m.Teq, acqua: m.acqua }, atmosfera: { gas: m.gas }, interno: { eta: m.eta, q: m.q, B0: m.B0, tettonica: m.tettonica ?? undefined } };
const sopraDi = (luogo) => { const s = luogo.sopra || {}; return { acquaM: s.acquaM || 0, ghiaccioM: s.ghiaccioM || 0, rocciaM: s.rocciaM || 0 }; };
const sepolto = (luogo) => { const s = sopraDi(luogo); return s.acquaM + s.ghiaccioM + s.rocciaM; };
// gli elementi radioattivi (frazioni in massa di riferimento) della roccia di un luogo
const elementiDi = (luogo) => luogo.elementi || radioelementi([...(luogo.minerali || []), ...(luogo.accessori || [])]);
// IL SUOLO sotto un luogo in superficie: quanti γ emette (W/kg) e quanto radon dà all'aria (Bq/m³ al suolo). Sul mare niente.
function suoloDi(luogo, m) {
  let el = null; if (m.gassoso) return null;
  if (luogo.tipo === 'aria') { if (!luogo.suolo) return null; const U = luogo.suolo.U ?? 2.7e-6; el = { U, Th: (U * CONDRITI.Th) / CONDRITI.U, K: (U * CONDRITI.K * VOLATILI_RIMASTI) / CONDRITI.U, Rb: 0 }; }
  else if (luogo.tipo === 'roccia' && !(sopraDi(luogo).acquaM > 0)) el = elementiDi(luogo);
  if (!el) return null;
  const att = attivita({ tipo: 'roccia', elementi: el, etaPianeta: m.eta }); let gamma = 0; for (const a of att) if (a.gamma > 0) gamma += a.perKg * a.gamma;
  return { elementi: el, gamma: gamma * MEV_J, radon: radonNellAria({ suolo: { U: el.U, densita: luogo.suolo?.densita ?? 1600 }, etaPianeta: m.eta, sopra: {} }) };
}
// l'energia che un decadimento del radon lascia nell'aria, con i figli a vita breve in equilibrio al 60% (MeV): da CATENE
const ENERGIA_RADON = (() => { const p = CATENE['uranio-238'].passi.slice(6, 11); let e = 0; p.forEach(([, , , tipo, Q, , , x, y], i) => { e += (i === 0 ? 1 : 0.6) * (tipo === 'α' ? Q : (x || 0) + (y || 0)); }); return e; })();
const SCALA_RADON = Math.sqrt(5 / (Math.LN2 / (3.8222 * GIORNO))); // m: quanto in alto l'aria lo porta prima che decada (√(K/λ), come in materia.js)

// =====================================================================================
// A1. LA IONIZZAZIONE DELL'ARIA
// =====================================================================================
const ACQUA = mezzo({ tipo: 'acqua' });
const mezziAria = new Map();
const ariaMezzo = (m) => { const k = JSON.stringify(m.gas); if (!mezziAria.has(k)) mezziAria.set(k, mezzo({ tipo: 'aria', aria: { pressione: ATMOSFERA, T: 288, gas: m.gas } })); return mezziAria.get(k); };
// la frenata media dei nucleoni primari in un mezzo (MeV·cm²/g): sui quantili del loro spettro in quel punto
const frenatePrimari = new WeakMap();
function frenataPrimari(rc, bersaglio) {
  let per = frenatePrimari.get(rc); if (!per) { per = new Map(); frenatePrimari.set(rc, per); }
  if (!per.has(bersaglio)) { let s = 0; const n = 12; for (let i = 0; i < n; i++) s += perdita('protone', Math.max(20, rc.primarioTipico((i + 0.5) / n) * 1000), bersaglio).totale; per.set(bersaglio, s / n); }
  return per.get(bersaglio);
}
// l'energia media di un nucleone primario (GeV) sopra la soglia del campo, e il flusso di energia in cima (W/m²)
export function energiaDeiCosmici(rc) { const e = energiaDeiPrimari(rc.soglia, rc.relativo); return { media: e.media, flusso: e.flusso * 1e3 * MEV_J }; }
// CIÒ CHE I COSMICI LASCIANO in un grammo di `bersaglio` messo in quel punto (MeV per grammo e per secondo), per componente.
// rc: raggiCosmici(luogo). I flussi di materia.js attraversano una superficie orizzontale: da tutte le direzioni ne
// passano di più (2 volte in cima, dove arrivano da mezzo cielo; 1,3 in fondo, dove scendono quasi dritti).
// cascata: per quanto moltiplicare gli elettroni dello sciame (vedi fattoreCascata: la conservazione dell'energia).
export function depositoCosmico(rc, bersaglio = ACQUA, cascata = 1) {
  const X = rc.colonnaAria + rc.colonnaSopra, f = 1.3 + 0.7 * Math.exp(-X / 100), cm2 = 1e-4;
  const Smu = rc.muoni > 0 ? perdita('muone', Math.max(10, rc.energiaMuoni * 1000), bersaglio).totale : 0, Sel = perdita('elettrone', 30, bersaglio).elettronica;
  const Sn = rc.nucleoni > 0 ? (X < 300 ? frenataPrimari(rc, bersaglio) : perdita('protone', 1000, bersaglio).totale) : 0;
  // in cima i nucleoni sono tutti dentro nuclei carichi; in fondo metà sono neutroni. I nuclei pesanti (z² grande)
  // danno più dose di quanti nucleoni portano, finché non si spezzano
  const carichi = 0.5 + 0.5 * Math.exp(-X / 120), pesanti = Math.exp(-X / D.PESANTI_CAMMINO);
  // gli elettroni: quelli che accompagnano i muoni (0,3 per muone, materia.js) e quelli dello sciame
  const conMuoni = Math.min(rc.elettroni, 0.3 * rc.muoni), sciame = Math.max(0, rc.elettroni - conMuoni) * cascata;
  const muoni = rc.muoni * f * cm2 * Smu, elettroniSciame = sciame * f * cm2 * Sel, elettroni = conMuoni * f * cm2 * Sel + elettroniSciame, nucleoni = rc.nucleoni * f * cm2 * carichi * Sn * (1 + D.PESANTI_DOSE * pesanti);
  return { muoni, elettroni, elettroniSciame, nucleoni, totale: muoni + elettroni + nucleoni, qualita: (1 + D.PESANTI_DANNO * pesanti) / (1 + D.PESANTI_DOSE * pesanti), neutroni: (rc.neutroni || 0) * f, colonna: X, daTutteLeDirezioni: f };
}
// lo stato dell'aria a una quota (m sopra il suolo di quel punto)
function ariaA(m, z) {
  const T = Math.max(m.Talta, m.Ts - 0.65 * (m.g / m.cp) * z), p = m.p0 * Math.exp(-z / m.Hm), rho = (p * m.mu) / (R_GAS * T);
  return { T, p, rho, N: p / (K_B * T) };
}
const ricombinazione = (a) => 6e-8 * Math.sqrt(300 / a.T) + 6e-26 * (a.N * 1e-6) * Math.pow(300 / a.T, 4); // cm³/s
const luogoInAria = (luogo, m, a, z) => ({ pianeta: luogo.pianeta, latitudine: m.lat, raggi: luogo.raggi, tipo: 'aria', quotaM: z, aria: { ...(luogo.aria || {}), pressione: a.p, T: m.Ts, Talta: m.Talta, gas: m.gas }, sopra: {} });
// LA CONSERVAZIONE DELL'ENERGIA NELLO SCIAME. materia.js dà agli elettroni dello sciame «2 secondari per primario»,
// qualunque sia l'energia del primario: va bene alle medie latitudini della Terra, ma all'equatore (dove passano solo
// primari da più di 14 GeV, pochi e ricchi) ne dà troppo pochi e ai poli troppi. Qui il loro numero è fissato da ciò
// che i primari PORTANO: dell'energia entrata, nell'aria resta come ionizzazione la parte QUOTA (il resto va nei
// neutrini dei pioni e dei muoni, nei muoni che arrivano al suolo, nei nuclei spezzati), per la parte di colonna che
// l'aria copre. → il fattore per cui moltiplicare gli elettroni dello sciame in tutta la colonna di quel luogo, e la
// colonna stessa calcolata una volta (i punti servono poi al profilo)
const QUOTA_IONIZZAZIONE = 0.6, N_PROFILO = 26; // PARAMETRO LIBERO (tra 0,5 e 0,8 secondo quanta energia va ai pioni carichi)
const colonne = new Map();
function colonnaDi(luogo, m) {
  const k = JSON.stringify([luogo.pianeta, m.lat, luogo.raggi, m.p0, m.gas, m.Ts, m.Talta]); if (colonne.has(k)) return colonne.get(k);
  const bersaglio = ariaMezzo(m), punti = []; let rc0 = null;
  for (let i = 0; i <= N_PROFILO; i++) { const z = (8.5 * m.Hm * i) / N_PROFILO, a = ariaA(m, z), rc = raggiCosmici(luogoInAria(luogo, m, a, z)); if (!i) rc0 = rc; punti.push({ z, a, rc, colonna: rc.colonnaAria, dep: depositoCosmico(rc, bersaglio, 1) }); }
  // l'energia lasciata nella colonna (W/m²): quella dello sciame e tutto il resto
  let sciame = 0, altro = 0; const w = (p, x) => x * 1e3 * MEV_J * p.a.rho; // MeV/g/s → W/m³
  for (let i = 1; i <= N_PROFILO; i++) { const p = punti[i], q = punti[i - 1], dz = p.z - q.z; sciame += 0.5 * (w(p, p.dep.elettroniSciame) + w(q, q.dep.elettroniSciame)) * dz; altro += 0.5 * (w(p, p.dep.totale - p.dep.elettroniSciame) + w(q, q.dep.totale - q.dep.elettroniSciame)) * dz; }
  const E = energiaDeiCosmici(rc0), coperta = -Math.expm1(-rc0.colonnaAria / 160); let alSuolo = 0;
  if (rc0.muoni > 0) { let s = 0; const n = 12; for (let i = 0; i < n; i++) s += rc0.spettroMuoni((i + 0.5) / n); alSuolo = rc0.muoni * (s / n) * 1e3 * MEV_J; }
  const pieno = sciame > 0 ? Math.min(200, Math.max(0.2, (QUOTA_IONIZZAZIONE * E.flusso * coperta - altro) / sciame)) : 1, fattore = 1 + (pieno - 1) * coperta;
  const out = { punti, fattore, energiaPrimari: E.flusso, energiaMedia: E.media, muoniAlSuolo: alSuolo, coperta };
  colonne.set(k, out); if (colonne.size > 16) colonne.delete(colonne.keys().next().value);
  return out;
}
export const fattoreCascata = (luogo, opz = {}) => { const m = mondoDi(luogo, opz); return m.p0 > 0 ? colonnaDi(luogo, m).fattore : 1; };
// la ionizzazione in un punto dell'aria, dai pezzi già calcolati
function ioniIn(m, z, a, rc, dep, s) {
  const rhoG = a.rho * 1e-3, cosmici = ((dep.totale * 1e6) / D.W_ARIA) * rhoG; let radon = 0, suolo = 0;
  if (s) { // il radon uscito dal suolo e i γ della roccia, che l'aria assorbe in ~16 g/cm² (130 m al livello del mare)
    radon = ((s.radon * 1e-6 * Math.exp(-z / SCALA_RADON) * ENERGIA_RADON * 1e6) / D.W_ARIA) * (a.rho / ariaA(m, 0).rho);
    suolo = ((0.5 * s.gamma * Math.exp(-((m.p0 - a.p) / m.g / 10) / 15.7)) / (D.W_ARIA * E_C)) * rhoG * 1e-3;
  }
  const totale = cosmici + radon + suolo, ioni = Math.sqrt(totale / ricombinazione(a)), mob = D.MOBILITA * (2.55e25 / a.N);
  return { quotaM: z, pressione: a.p, T: a.T, densita: a.rho, colonna: rc.colonnaAria, cosmici, radon, suolo, totale, perKg: (totale / rhoG) * 1e3, ioni, conducibilita: 2 * E_C * ioni * 1e6 * mob, potenza: cosmici * 1e6 * D.W_ARIA * E_C };
}
const VUOTO = (z, T) => ({ quotaM: z, pressione: 0, T, densita: 0, colonna: 0, cosmici: 0, radon: 0, suolo: 0, totale: 0, perKg: 0, ioni: 0, conducibilita: 0, potenza: 0 });
// → { quotaM, pressione (Pa), T, densita (kg/m³), colonna (g/cm² d'aria sopra), cosmici, radon, suolo, totale (coppie di
//     ioni per cm³ e per secondo), perKg (coppie per kg e per secondo), ioni (per cm³, di ogni segno),
//     conducibilita (S/m), potenza (W/m³ lasciati dai cosmici) }. opz.senzaSuolo: solo i cosmici
export function ionizzazione(luogo, quotaM = 0, opz = {}) {
  const m = mondoDi(luogo, opz), z = Math.max(0, quotaM); if (!(m.p0 > 0)) return VUOTO(z, m.Ts);
  const a = ariaA(m, z), rc = raggiCosmici(luogoInAria(luogo, m, a, z));
  return ioniIn(m, z, a, rc, depositoCosmico(rc, ariaMezzo(m), colonnaDi(luogo, m).fattore), opz.senzaSuolo ? null : suoloDi(luogo, m));
}
// IL PROFILO in quota, fino a 8,5 scale d'altezza: il massimo (Pfotzer), la colonna, l'energia, la resistenza elettrica
const profili = new Map();
export function profiloIonizzazione(luogo, opz = {}) {
  const m = mondoDi(luogo, opz), s = opz.senzaSuolo ? null : suoloDi(luogo, m), k = JSON.stringify([luogo.pianeta, m.lat, luogo.raggi, m.p0, m.gas, m.Ts, m.Talta, s?.elementi]);
  if (profili.has(k)) return profili.get(k);
  if (!(m.p0 > 0)) { const v = VUOTO(0, m.Ts); return { punti: [v], alSuolo: v, massimo: { quotaM: 0, valore: 0, colonna: 0 }, coppie: 0, energia: 0, resistenza: 0, energiaPrimari: energiaDeiCosmici(raggiCosmici(luogoInAria(luogo, m, { p: 0 }, 0))).flusso, fattoreCascata: 1 }; }
  const col = colonnaDi(luogo, m), bersaglio = ariaMezzo(m), n = N_PROFILO, punti = col.punti.map((p) => ioniIn(m, p.z, p.a, p.rc, depositoCosmico(p.rc, bersaglio, col.fattore), s));
  let iMax = 0, coppie = 0, energia = 0, resistenza = 0;
  for (let i = 0; i <= n; i++) { if (punti[i].cosmici > punti[iMax].cosmici) iMax = i; if (i) { const dz = punti[i].quotaM - punti[i - 1].quotaM; coppie += 0.5 * (punti[i].cosmici + punti[i - 1].cosmici) * 1e6 * dz; energia += 0.5 * (punti[i].potenza + punti[i - 1].potenza) * dz;
    const s0 = punti[i - 1].conducibilita, s1 = punti[i].conducibilita; if (s0 > 0 && s1 > 0) resistenza += Math.abs(s1 - s0) < 1e-9 * s0 ? dz / s0 : (dz * (1 / s0 - 1 / s1)) / Math.log(s1 / s0); } } // (σ cresce come un esponenziale tra due quote)
  // (il massimo: una parabola per i tre punti attorno)
  let massimo = { quotaM: punti[iMax].quotaM, valore: punti[iMax].cosmici, colonna: punti[iMax].colonna };
  if (iMax > 0 && iMax < n) { const y0 = punti[iMax - 1].cosmici, y1 = punti[iMax].cosmici, y2 = punti[iMax + 1].cosmici, d = y0 - 2 * y1 + y2, x = d < 0 ? (0.5 * (y0 - y2)) / d : 0, h = punti[iMax].quotaM - punti[iMax - 1].quotaM; massimo = { quotaM: punti[iMax].quotaM + x * h, valore: y1 - 0.25 * (y0 - y2) * x, colonna: punti[iMax].colonna }; }
  const out = { punti, alSuolo: punti[0], massimo, coppie, energia, resistenza, energiaPrimari: col.energiaPrimari, fattoreCascata: col.fattore };
  profili.set(k, out); if (profili.size > 12) profili.delete(profili.keys().next().value);
  return out;
}
// la colonna di ionizzazione media sul pianeta (coppie per m² e per secondo): quella del luogo, per quanto l'energia che i
// primari portano in media su tre latitudini (pesate con la loro superficie) sta a quella che portano lì
export function colonnaMedia(luogo, opz = {}) {
  const m = mondoDi(luogo, opz), pr = profiloIonizzazione(luogo, { ...opz, senzaSuolo: true }); if (!(pr.energiaPrimari > 0)) return 0;
  return (pr.coppie * energiaMedia(luogo, m)) / pr.energiaPrimari;
}
function energiaMedia(luogo, m) { let s = 0; for (const [lat, peso] of [[15, 0.5], [45, 0.366], [75, 0.134]]) s += peso * energiaDeiPrimari(sogliaStormer(luogo.pianeta, lat), luogo.raggi?.relativo ?? 1).flusso * 1e3 * MEV_J; return s; }

// =====================================================================================
// A2. I FULMINI, IL CIRCUITO ELETTRICO, CIÒ CHE LA IONIZZAZIONE PRODUCE
// =====================================================================================
// i fulmini di un pianeta: dove piove, una parte fissa del calore latente. opz.pioggia: la pioggia media (mm all'anno)
// se meteo.js l'ha calcolata; se no, un terzo della luce assorbita evapora acqua (Terra: 79 di 238 W/m²), meno se c'è poco mare
export function fulmini(luogo, opz = {}) {
  const m = mondoDi(luogo, opz); let latente = 0;
  if (opz.pioggia != null) latente = (opz.pioggia * 2.5e6) / ANNO; else if (m.acqua === 'liquida' && m.p0 > 1e3 && !m.gassoso) latente = (m.assorbita / 3) * Math.min(1, m.mare / 0.7);
  const potenza = D.RESA_FULMINI * latente * m.area;
  return { latente, potenza, perM2: potenza / m.area, alSecondo: potenza / D.ENERGIA_FULMINE, perKm2Anno: (potenza / D.ENERGIA_FULMINE / m.area) * 1e6 * ANNO };
}
// il circuito elettrico globale: i temporali caricano, l'aria resa conduttrice dai cosmici scarica dappertutto
export function circuitoElettrico(luogo, opz = {}) {
  const m = mondoDi(luogo, opz), pr = profiloIonizzazione(luogo, opz), f = fulmini(luogo, opz), corrente = f.alSecondo * D.CARICA_FULMINE;
  const potenziale = pr.resistenza > 0 ? (corrente * pr.resistenza) / m.area : 0, densita = corrente / m.area;
  return { conducibilita: pr.alSuolo.conducibilita, resistenza: pr.resistenza, resistenzaTotale: pr.resistenza / m.area, corrente, potenziale, correnteBelTempo: densita, campoAlSuolo: pr.alSuolo.conducibilita > 0 ? densita / pr.alSuolo.conducibilita : 0 };
}
// → { azoto: { cosmici, fulmini: { molAnno, kgAnno, perKgAria (mol di N per kg d'aria all'anno) }, domina }, radicali,
//     carbonio14, berillio10 (atomi/m²/s), nuclei: { tetto (per cm³ e per secondo), sensibilita, frase } }
export function prodotti(luogo, opz = {}) {
  const m = mondoDi(luogo, opz), pr = profiloIonizzazione(luogo, { ...opz, senzaSuolo: true }), coppie = m.p0 > 0 ? colonnaMedia(luogo, opz) : 0, f = fulmini(luogo, opz), xN2 = m.gas.N2 || 0;
  const ossigeno = (m.gas.O2 || 0) + (m.gas.CO2 || 0) + (m.gas.H2O || 0) > 1e-4 || m.acqua === 'liquida', azotoC = Math.min(1, xN2 / 0.78);
  const perAnno = (molS) => ({ molAnno: molS * ANNO, kgAnno: molS * ANNO * 14.007e-3, perKgAria: m.massaAria > 0 ? (molS * ANNO) / m.massaAria : 0 });
  // (ciò che è del pianeta intero usa la colonna media su tre latitudini, non quella del luogo)
  const daCosmici = perAnno((coppie * D.N_PER_COPPIA * azotoC * m.area) / N_A), daFulmini = perAnno(f.alSecondo * D.NO_PER_FULMINE * Math.sqrt(azotoC) * (ossigeno ? 1 : 0));
  const rc = raggiCosmici({ ...luogo, tipo: 'aria', quotaM: 0, sopra: {}, aria: { ...(luogo.aria || {}), pressione: m.p0, gas: m.gas } }), rif = cosmiciDiRiferimento();
  let bersagli = 0, atomi = 0; for (const g in m.gas) { const a = atomiDi(g); for (const e in a) { atomi += m.gas[g] * a[e] * ELEMENTI[e].A; if (e === 'N' || e === 'O') bersagli += m.gas[g] * a[e] * ELEMENTI[e].A; } }
  const be10 = m.p0 > 0 ? D.BE10_TERRA * (energiaMedia(luogo, m) / rif.energia) * (bersagli / (atomi || 1)) * -Math.expm1(-rc.colonnaAria / 126) : 0;
  const quota = pr.massimo.valore > 0 ? ionizzazione(luogo, m.Hm * 0.5, { ...opz, senzaSuolo: true }).cosmici : 0;
  return { azoto: { cosmici: daCosmici, fulmini: daFulmini, domina: daFulmini.molAnno > daCosmici.molAnno ? 'fulmini' : 'cosmici', nota: ossigeno ? null : "aria senza ossigeno: le scariche fanno acido cianidrico (HCN), non ossidi d'azoto" },
    radicali: perAnno((coppie * D.HOX_PER_COPPIA * ((m.gas.H2O || 0) > 0 || m.acqua === 'liquida' ? 1 : 0) * m.area) / N_A),
    carbonio14: { atomiM2s: rc.produzioneC14 || 0, kgAnno: ((rc.produzioneC14 || 0) * m.area * ANNO * 14.003e-3) / N_A }, berillio10: { atomiM2s: be10 },
    nuclei: { tetto: quota, sensibilita: D.SENSIBILITA_NUCLEI, frase: `ogni coppia di ioni può fare al più un nucleo: ${cifre(quota)} per cm³ al secondo tra le nubi. Ma raddoppiare i raggi cosmici cambierebbe i nuclei di condensazione del ${cifre(100 * (Math.pow(2, D.SENSIBILITA_NUCLEI) - 1), 1)}% al più (CLOUD): quasi tutte le gocce nascono su polveri e acidi già presenti.` } };
}
let rifCosmici = null;
const TERRA = { massaKg: MTERRA, raggioM: RTERRA, B0: 3.1e-5, Lw: LSOLE, aM: UA, Mstella: MSOLE, Tstella: TSOLE, giorno: 86164, clima: { g: 9.81, pressione: ATMOSFERA, T: 288, Teq: 255, acqua: 'liquida', mare: 0.71, albedo: 0.3 }, atmosfera: { gas: ARIA_TERRA }, interno: { eta: 4.5e9, q: 0.087, B0: 3.1e-5, tettonica: 'a placche', vulcani: 1, nucleo: 0.546 }, composizione: { ferro: 0.32, roccia: 0.68 } };
function cosmiciDiRiferimento() { if (!rifCosmici) { const L = luogoDaAria({ P: TERRA }); rifCosmici = { energia: energiaMedia(L, mondoDi(L, { P: TERRA })) }; } return rifCosmici; }

// =====================================================================================
// A3. LA RADIOATTIVITÀ DELLA ROCCIA E DELL'ACQUA
// =====================================================================================
// l'energia dei decadimenti che resta nella materia, per tipo di radiazione (W/kg): la stessa `attivita` di materia.js
export function energiaPerTipo(luogo) {
  let alfa = 0, beta = 0, gamma = 0; for (const a of attivita(luogo)) { if (a.tipo === 'α' || a.tipo === 'fissione') alfa += a.perKg * a.depositata; else if (a.tipo === 'β') { beta += a.perKg * (a.energia || 0); gamma += a.perKg * (a.gamma || 0); } else gamma += a.perKg * (a.depositata || 0); }
  return { alfa: alfa * MEV_J, beta: beta * MEV_J, gamma: gamma * MEV_J, totale: (alfa + beta + gamma) * MEV_J };
}
// quanto frena l'acqua rispetto a una roccia (per grammo): α da 5 MeV, elettroni da 0,5 MeV, γ (Compton: elettroni per grammo).
// È anche la dose che prende una goccia d'acqua tra i grani, rispetto a quella della roccia (cavità di Bragg e Gray)
const rapportiAcqua = (mz) => ({ alfa: perdita('alfa', 5, ACQUA).totale / perdita('alfa', 5, mz).totale, beta: perdita('elettrone', 0.5, ACQUA).totale / perdita('elettrone', 0.5, mz).totale, gamma: ACQUA.ZsuA / mz.ZsuA });
// LA RADIOLISI DELL'ACQUA in quel punto: idrogeno e ossidanti. Nell'acqua (mare, ghiaccio) tutta l'energia va all'acqua;
// nella roccia l'acqua dei pori ne prende una parte. → { H2, ossidanti (mol per kg d'acqua all'anno; gli ossidanti in
//   moli di O2 equivalente), perKgRoccia, perM3 (mol di H2 all'anno), dose (Gy all'anno all'acqua, per tipo), porosita, parte }
export function radiolisi(luogo, opz = {}) {
  const m = mondoDi(luogo, opz), mz = mezzo(luogo), e = energiaPerTipo(luogo), solido = luogo.tipo === 'roccia', G = D.G_H2;
  const cosmica = depositoCosmico(raggiCosmici(luogo), ACQUA).totale * 1e3 * MEV_J; // W per kg d'acqua
  let acquaPerKg = 1, parte = { alfa: 1, beta: 1, gamma: 1 }, porosita = 1;
  if (solido) {
    porosita = opz.porosita ?? (m.acqua === 'liquida' || m.acqua === 'ghiaccio' || m.acqua === undefined ? D.POROSITA : 0); // (un mondo senz'acqua ha i pori vuoti)
    acquaPerKg = (porosita * 1000) / ((1 - porosita) * mz.densita * 1000);
    const r = rapportiAcqua(mz);
    for (const k in parte) parte[k] = (acquaPerKg * r[k]) / (acquaPerKg * r[k] + 1) / (acquaPerKg || 1); // energia all'acqua, per kg d'acqua, per W/kg di roccia
    parte.rapporti = r;
  }
  const dose = { alfa: e.alfa * parte.alfa, beta: e.beta * parte.beta, gamma: e.gamma * parte.gamma, cosmici: porosita > 0 ? cosmica : 0 }; // W per kg d'acqua
  const H2 = porosita > 0 ? (dose.alfa * G.alfa + dose.beta * G.beta + (dose.gamma + dose.cosmici) * G.gamma) * MOLE_PER_J * ANNO : 0;
  for (const k in dose) dose[k] *= ANNO;
  return { H2, ossidanti: H2 / 2, perKgRoccia: solido ? H2 * acquaPerKg : null, perM3: H2 * (solido ? acquaPerKg * mz.densita * 1000 : mz.densita * 1000), dose, porosita, parte: solido ? parte : null };
}
// sul pianeta intero: i primi 5 km dei continenti (la roccia del luogo, se è roccia; se no quella che materia.js dà ai
// continenti di quel pianeta) e tutta l'acqua del mare, con il suo potassio se il luogo è acqua
export function radiolisiDelPianeta(luogo, opz = {}) {
  const m = mondoDi(luogo, opz), roccia = luogo.tipo === 'roccia' ? luogo : luogoDaRoccia({ P: pianetaDa(m), continente: true });
  const r = radiolisi({ ...roccia, sopra: { rocciaM: 2500 }, profonditaM: 2500 }, opz), terre = m.area * (1 - m.mare), massa = terre * 5000 * mezzo(roccia).densita * 1000;
  const acquaKg = m.P?.interno?.acquaKg ?? 0, mare = luogo.tipo === 'acqua' && acquaKg > 0 ? radiolisi({ ...luogo, sopra: { acquaM: 2000 } }, opz).H2 * acquaKg : null;
  return { crosta: (r.perKgRoccia || 0) * massa, perKgAcqua: r.H2, mare, massaCrosta: massa };
}
// I GAS RADIOGENICI saliti nell'aria nell'età del pianeta. → { argon40: { prodotto, nellAria (kg), degassata, trattenuto, gelato (kg),
//   colonna (kg/m²), pressione (Pa), frazione (in volume, dell'aria con lui) }, elio4: { flusso (atomi/m²/s), trattenuto,
//   colonna, pressione, frazione, permanenza (anni) }, perLAria: { Ar, He } (Pa da aggiungere all'aria) }
export function gasRadiogenici(luogo, opz = {}) {
  const m = mondoDi(luogo, opz), el = m.mantello, eta = m.eta, k40 = SOLI['potassio-40'];
  const degassata = opz.degassata ?? D.DEGASSATA[m.tettonica] ?? 0.5;
  // argon-40: il potassio-40 decaduto dalla nascita, per il ramo di cattura
  const n40 = (el.K / (ELEMENTI.K.A * 1e-3)) * N_A * k40.abbondanza * resta(k40.mezza, eta), decaduti = n40 * (Math.pow(2, eta / k40.mezza) - 1);
  const ramo = k40.rami.find((r) => r.tipo === 'cattura').ramo, prodotto = (decaduti * ramo * 39.962e-3 * m.silicati) / N_A, tieneAr = !m.gassoso && trattiene(m.M, m.R, m.Tfuga, 39.96 * UMA);
  // sui mondi freddi l'argon gela al suolo: nell'aria ne resta al più la pressione di vapore a quella temperatura
  const tetto = D.ARGON_VAPORE[1] * Math.exp(-(D.ARGON_VAPORE[2] / R_GAS) * (1 / m.Ts - 1 / D.ARGON_VAPORE[0])), uscito = tieneAr ? (prodotto * degassata) / m.area : 0;
  const moliAria = m.colonna / m.mu, colAr = Math.min(uscito, tetto / m.g), molAr = colAr / 39.962e-3;
  // elio-4: le α delle tre catene; quante ne nascono adesso (per secondo e per kg) e quante dalla nascita
  let ora = 0, sempre = 0;
  for (const c of Object.values(CATENE)) { const nAlfa = c.passi.reduce((s, p) => s + (p[3] === 'α' ? p[6] ?? 1 : 0), 0), n = ((el[c.elemento] || 0) / (ELEMENTI[c.elemento].A * 1e-3)) * N_A * c.abbondanza * resta(c.mezza, eta);
    ora += (n * Math.LN2 * nAlfa) / (c.mezza * ANNO); sempre += n * (Math.pow(2, eta / c.mezza) - 1) * nAlfa; }
  const flusso = (ora * m.silicati * degassata) / m.area, tieneHe = !m.gassoso && trattiene(m.M, m.R, D.ECCESSO_ESOSFERA * m.Tfuga, PESI_ATOMICI.He * UMA);
  const atomiHe = m.gassoso ? 0 : tieneHe ? (sempre * m.silicati * degassata) / m.area : flusso * D.PERMANENZA_ELIO * ANNO, molHe = atomiHe / N_A, colHe = molHe * 4.0026e-3;
  const tot = moliAria + molAr + molHe || 1, conAria = moliAria + molAr > 1; // (meno di una mole per m²: non è un'aria, gli atomi non si urtano)
  return { degassata, potassio: el.K, argon40: { prodotto, nellAria: colAr * m.area, trattenuto: tieneAr, gelato: uscito > colAr ? (uscito - colAr) * m.area : 0, colonna: colAr, pressione: colAr * m.g, frazione: conAria ? molAr / tot : 0 },
    elio4: { flusso, trattenuto: tieneHe, colonna: colHe, pressione: colHe * m.g, frazione: conAria ? molHe / tot : 0, permanenza: tieneHe ? Infinity : D.PERMANENZA_ELIO },
    perLAria: { Ar: colAr * m.g, He: colHe * m.g } };
}
// GLI OROLOGI E IL DANNO nella roccia di un luogo: il piombo radiogenico accumulato nell'età della roccia e la dose di α
// nello zircone. → { eta, piombo: { ppm, rapporti: { 'Pb206/U238', 'Pb207/U235', 'Pb208/Th232', 'Pb207/Pb206' } },
//   zircone: { alfaPerGrammo, anni (da quando tiene il danno), stato, soglia } }
export function orologi(luogo) {
  if (luogo.tipo !== 'roccia') return null;
  const t = luogo.etaRoccia ?? luogo.etaPianeta ?? ETA_RIFERIMENTO, etaP = luogo.etaPianeta ?? ETA_RIFERIMENTO, el = elementiDi(luogo), C = CATENE;
  const cresce = (c, anniFa) => Math.pow(2, anniFa / c.mezza) - 1, n = (c, w) => ((w || 0) / (ELEMENTI[c.elemento].A * 1e-3)) * N_A * c.abbondanza * resta(c.mezza, etaP);
  const u8 = C['uranio-238'], u5 = C['uranio-235'], th = C['torio-232'], pb = [n(u8, el.U) * cresce(u8, t), n(u5, el.U) * cresce(u5, t), n(th, el.Th) * cresce(th, t)];
  const piombo = { ppm: ((pb[0] * 205.974 + pb[1] * 206.976 + pb[2] * 207.977) * 1e-3 * 1e6) / N_A, rapporti: { 'Pb206/U238': cresce(u8, t), 'Pb207/U235': cresce(u5, t), 'Pb208/Th232': cresce(th, t), 'Pb207/Pb206': pb[0] > 0 ? pb[1] / pb[0] : 0 } };
  let zircone = null;
  if ((luogo.accessori || []).some((a) => a.nome === 'zircone')) {
    const z = concentrazioni(luogo, 'zircone'), tiene = ritenzione(luogo, 'zircone', 'fissione'), tz = Math.min(t, tiene.anni || 0), nA = (c) => c.passi.reduce((s, p) => s + (p[3] === 'α' ? p[6] ?? 1 : 0), 0);
    const alfa = (n(u8, z.U) * cresce(u8, tz) * nA(u8) + n(u5, z.U) * cresce(u5, tz) * nA(u5) + n(th, z.Th) * cresce(th, tz) * nA(th)) / 1000;
    zircone = { uranio: z.U, alfaPerGrammo: alfa, anni: tz, soglia: D.ZIRCONE_AMORFO, stato: alfa >= D.ZIRCONE_AMORFO ? 'metamittico: il reticolo non diffrange più' : alfa >= D.ZIRCONE_AMORFO / 4 ? 'danneggiato: isole di vetro in un reticolo gonfio' : 'cristallino' };
  }
  return { eta: t, piombo, zircone };
}

// =====================================================================================
// A4. LE PARTICELLE DELLA STELLA
// =====================================================================================
// → { perditaStella (kg/s), pressione (Pa), flussoMassa (kg/m²/s), magnetopausa (raggi del pianeta; 0 senza campo),
//     scoperto, perditaAria (kg/s), tempoAria (anni per portar via l'aria di oggi), ariaPersa (kg, Pa: in tutta l'età),
//     aurora: { potenza (W), perM2 (media sul pianeta), sugliOvali (W/m²), colatitudine (gradi) }, sputtering (se non c'è aria) }
export function ventoStellare(luogo, opz = {}) {
  const m = mondoDi(luogo, opz); if (!(m.S > 0)) return null;
  const quanto = (anniStella) => Math.min(D.VENTO_MASSIMO, Math.pow(Math.max(anniStella, 1e7) / D.ETA_SOLE, D.ESPONENTE_VENTO)), base = D.VENTO_SOLE * (m.Rst / RSOLE) ** 2, v = D.VELOCITA_VENTO;
  const perditaStella = base * quanto(m.etaStella), flussoMassa = perditaStella / (4 * Math.PI * m.aM ** 2), pressione = flussoMassa * v, sezione = Math.PI * m.R ** 2;
  const magnetopausa = m.B0 > 0 ? Math.cbrt(2) * Math.pow((m.B0 * m.B0) / (2 * MU0 * pressione), 1 / 6) : 0, scoperto = magnetopausa < 1.3, haAria = m.colonna > 1e-3;
  const perditaAria = haAria ? flussoMassa * sezione : 0;
  // in tutta l'età: l'integrale di (t/4,6)^(−2,33), con il tetto dei primi tempi
  let integrale = 0; { const n = 200, t1 = Math.max(m.etaStella, 2e7), t0 = Math.max(1e7, t1 - m.eta), h = Math.log(t1 / t0) / n; for (let i = 0; i <= n; i++) { const t = t0 * Math.exp(i * h); integrale += (i === 0 || i === n ? 0.5 : 1) * quanto(t) * t * h; } }
  const persa = haAria ? (base / (4 * Math.PI * m.aM ** 2)) * sezione * integrale * ANNO : 0;
  const potenzaVento = 0.5 * flussoMassa * v * v, potenza = D.RESA_AURORE * potenzaVento * sezione * (scoperto ? 1 : magnetopausa ** 2) * (haAria ? 1 : 0);
  const col = scoperto ? null : Math.asin(Math.min(1, 1 / Math.sqrt(magnetopausa))), ovali = scoperto ? m.area / 2 : 2 * 2 * Math.PI * m.R ** 2 * Math.sin(col) * ((5 * Math.PI) / 180);
  let sputtering = null;
  if (!haAria && !m.gassoso && scoperto) { const ioni = flussoMassa / (1.2 * COSTANTI.mp) / 4, atomi = ioni * D.RESA_SPUTTERING, perM3 = 2700 / (21 * UMA);
    sputtering = { ioni, atomi, metriPerAnno: (atomi / perM3) * ANNO, annerimento: D.ANNERIMENTO * (D.VENTO_SOLE / (4 * Math.PI * UA * UA)) / flussoMassa }; }
  return { perditaStella, pressione, flussoMassa, magnetopausa, scoperto, perditaAria, tempoAria: perditaAria > 0 ? m.massaAria / perditaAria / ANNO : Infinity, ariaPersa: { kg: persa, pressione: (persa / m.area) * m.g },
    aurora: { potenza, perM2: potenza / m.area, sugliOvali: potenza / ovali, colatitudine: col == null ? null : (col * 180) / Math.PI }, sputtering };
}

// =====================================================================================
// A5. LA DOSE
// =====================================================================================
// L'energia ionizzante che un chilo di materia vivente (acqua) prende in un anno in quel punto.
// → { cosmici: { Gy, Sv, muoni, elettroni, nucleoni, neutroni (Sv) }, suolo: { Gy } (i γ della roccia sotto i piedi),
//     interna: { alfa, beta, gamma (Gy), Sv } (la radioattività del mezzo, se ci si sta dentro: nella roccia è la dose
//     di una goccia d'acqua tra i grani; le α contano solo a meno di ~30 µm da un grano, e in sievert pesano 20),
//     radonPerChiRespira (Sv), totale: { Gy, Sv }, mutazioni: { daRadiazione, daCalore (rotture per base all'anno), rapporto } }
export function dose(luogo, opz = {}) {
  const m = mondoDi(luogo, opz), rc = raggiCosmici(luogo), dep = depositoCosmico(rc, ACQUA, rc.colonnaSopra > 0 ? 1 : fattoreCascata(luogo, opz)), k = 1e3 * MEV_J * ANNO; // (MeV/g/s → Gy all'anno)
  const neutroni = dep.neutroni * D.NEUTRONE_SV * ANNO;
  const cosmici = { muoni: dep.muoni * k, elettroni: dep.elettroni * k, nucleoni: dep.nucleoni * k, neutroni, Gy: dep.totale * k + neutroni / 10, Sv: (dep.muoni + dep.elettroni + dep.nucleoni * dep.qualita) * k + neutroni };
  const dentro = luogo.tipo === 'acqua' || luogo.tipo === 'ghiaccio' || (luogo.tipo === 'roccia' && (luogo.profonditaM || 0) > 0.3), s = dentro ? null : suoloDi(luogo, m);
  const quota = luogo.tipo === 'aria' ? luogo.quotaM || 0 : 0, suolo = { Gy: s ? 0.5 * s.gamma * ANNO * Math.exp(-((m.p0 - ariaA(m, quota).p) / m.g / 10) / 15.7) : 0 };
  const e = dentro ? energiaPerTipo(luogo) : { alfa: 0, beta: 0, gamma: 0 }, ra = dentro && luogo.tipo === 'roccia' ? rapportiAcqua(mezzo(luogo)) : { alfa: 1, beta: 1, gamma: 1 }, interna = { alfa: e.alfa * ra.alfa * ANNO, beta: e.beta * ra.beta * ANNO, gamma: e.gamma * ra.gamma * ANNO }; interna.Gy = interna.alfa + interna.beta + interna.gamma; interna.Sv = interna.alfa * D.PESO_ALFA + interna.beta + interna.gamma;
  const totale = { Gy: cosmici.Gy + suolo.Gy + interna.Gy, Sv: cosmici.Sv + suolo.Gy + interna.Sv };
  const T = luogo.T ?? m.Ts, daCalore = D.IDROLISI * Math.exp((-D.IDROLISI_EA / R_GAS) * (1 / T - 1 / D.IDROLISI_T)) * ANNO, daRadiazione = totale.Gy * D.ROTTURE_PER_GY;
  return { cosmici, suolo, interna, radonPerChiRespira: s && quota < 100 ? s.radon * D.RADON_SV : 0, totale, mutazioni: { daRadiazione, daCalore, rapporto: daCalore > 0 ? daRadiazione / daCalore : Infinity, T } };
}

// =====================================================================================
// A6. L'ENERGIA PER LA CHIMICA: CHI DOMINA
// =====================================================================================
// In superficie (la colonna d'aria e il primo chilometro di roccia, W/m²) e, se il luogo è sommerso o sepolto, in uno
// strato di un metro a quella profondità. → { superficie: { ultravioletto, fulmini, cosmici, aurore, radioattivita, domina },
//   qui: { … } o null, domina (nel luogo), relativa (1 = la Terra: ciò che `prebiotica` di chimica.js chiama «energia») }
export function energiaPerLaChimica(luogo, opz = {}) {
  const m = mondoDi(luogo, opz), nome = (o) => Object.keys(o).filter((k) => typeof o[k] === 'number').sort((a, b) => o[b] - o[a])[0];
  const inCima = energiaDeiPrimari(sogliaStormer(luogo.pianeta, m.lat), luogo.raggi?.relativo ?? 1).flusso * 1e3 * MEV_J, colonnaAria = m.p0 / m.g / 10; // (W/m²; g/cm²)
  const uv = (m.S / 4) * (D.RIGHE * sottoLaSoglia(m.Tst) + D.CROMOSFERA), v = ventoStellare(luogo, opz), f = fulmini(luogo, opz);
  const crosta = luogo.tipo === 'roccia' ? luogo : m.gassoso ? null : luogoDaRoccia({ P: pianetaDa(m), continente: true });
  const superficie = { ultravioletto: uv, fulmini: f.perM2, cosmici: inCima * (m.p0 > 0 ? -Math.expm1(-colonnaAria / 126) : 1), aurore: v ? v.aurora.perM2 : 0, radioattivita: crosta ? calore(crosta) * mezzo(crosta).densita * 1000 * 1000 : 0 };
  superficie.domina = nome(superficie);
  let qui = null; const s = sopraDi(luogo), sotto = sepolto(luogo) > 0;
  if (sotto) { const mz = mezzo(luogo), rho = mz.densita * 1000, dep = depositoCosmico(raggiCosmici(luogo), ACQUA);
    qui = { ultravioletto: s.rocciaM > 0 ? 0 : uv * Math.exp(-s.acquaM / 0.1 - s.ghiaccioM / 0.05), fulmini: 0, cosmici: dep.totale * 1e3 * MEV_J * rho, aurore: 0, radioattivita: calore(luogo) * rho };
    qui.domina = nome(qui); qui.spessoreM = 1; }
  const somma = (o) => o.ultravioletto + o.fulmini + o.cosmici + o.aurore;
  return { superficie, qui, domina: (qui || superficie).domina, relativa: luogo.__terra ? 1 : somma(superficie) / somma(energiaTerra().superficie), unita: 'W/m²' };
}
let eTerra = null;
function energiaTerra() { if (!eTerra) eTerra = energiaPerLaChimica({ ...luogoDaAria({ P: TERRA }), __terra: true }, { P: TERRA }); return eTerra; }

// =====================================================================================
// A7. UNA SUPERNOVA VICINA
// =====================================================================================
// opz.galassia: ciò che dà cosmo.js (galassia(n, id): ritmoSN, forma.unitaM, sorgenti); opz.posizione: la posizione
// della stella nelle unità della galassia (stelle[i].pos). Senza galassia: la Via Lattea.
// → { ritmo (per anno e per pc³), ogniQuanto(dPc) (anni), effetto(dPc) → { cosmici (volte il fondo, al picco), durata
//     (anni), dose (Sv all'anno in più in questo luogo, al picco), cosmiciLento, durataLento (se il resto li rilascia piano),
//     anniDiFondo, doseTotale (Sv: in tutto, comunque vada), gamma (J/m²), ozono (vero se lo strato soffre) },
//     distanzaPericolosa (pc: la dose dei cosmici raddoppia), vicine: i resti veri di quella galassia, dal più vicino,
//     prossima (se si passa opz.caso, la sorgente degli eventi della stella): { tra (anni), distanza (pc) } entro 100 pc }
export function supernovaVicina(luogo, opz = {}) {
  // (la densità di energia dei raggi cosmici del posto, J/m³: quella di questa galassia se è nota — vuoto_mezzo.js, dal suo
  // ritmo di supernove e dal suo disco —, se no la riserva dichiarata, 1 eV/cm³)
  const uCosmici = opz.galassia?.forma?.ritmoSN?.totale > 0 ? raggiCosmiciIn(opz.galassia.forma).energia : D.COSMICI_GALASSIA; // (serve la forma vera della galassia, con il suo ritmo di supernove)
  const Gx = opz.galassia, ritmoSN = Gx?.ritmoSN > 0 ? Gx.ritmoSN : D.SN_VIA_LATTEA, Rd = Gx?.forma?.unitaM > 0 ? Gx.forma.unitaM / PARSEC : D.RAGGIO_VIA_LATTEA;
  const ritmo = ritmoSN / (Math.PI * Rd * Rd * 2 * D.SPESSORE_DISCO), h = D.SPESSORE_DISCO; // per anno e per parsec cubo
  const volume = (d) => (d <= h ? (4 / 3) * Math.PI * d ** 3 : Math.PI * (2 * d * d * h - (2 / 3) * h ** 3)); // la sfera tagliata dal disco
  const ogniQuanto = (dPc) => 1 / (ritmo * volume(dPc)), base = dose(luogo, opz).cosmici.Sv;
  // due casi estremi: tutti i raggi liberati insieme (un picco alto e breve: al tempo d²/6D) o liberati piano nella vita
  // del resto (una sorgente che dura: E/(4πDd·τ)). L'integrale nel tempo è lo stesso, E/(4πDd): è il numero solido
  const effetto = (dPc) => { const d = dPc * PARSEC, cosmici = (0.0736 * D.ENERGIA_SN_COSMICI) / d ** 3 / uCosmici, gamma = D.ENERGIA_SN_GAMMA / (4 * Math.PI * d * d), anniDiFondo = D.ENERGIA_SN_COSMICI / (4 * Math.PI * D.DIFFUSIONE * d * uCosmici) / ANNO;
    return { cosmici, durata: (d * d) / (6 * D.DIFFUSIONE) / ANNO, dose: base * cosmici, cosmiciLento: anniDiFondo / D.VITA_RESTO, durataLento: D.VITA_RESTO, anniDiFondo, doseTotale: base * anniDiFondo, gamma, ozono: gamma > D.OZONO }; };
  const vicine = []; const qui = opz.posizione;
  if (Gx?.sorgenti && qui && Gx.forma?.unitaM > 0) for (const s of Gx.sorgenti) { if (s.tipo !== 'supernova') continue; const d = Math.hypot(s.pos[0] - qui[0], s.pos[1] - qui[1]) * Gx.forma.unitaM, t = Math.max(s.eta, 1) * ANNO, l2 = 4 * D.DIFFUSIONE * t;
    vicine.push({ nome: s.nome, distanzaPc: d / PARSEC, eta: s.eta, cosmici: (D.ENERGIA_SN_COSMICI / Math.pow(Math.PI * l2, 1.5)) * Math.exp(-(d * d) / l2) / uCosmici }); }
  vicine.sort((a, b) => a.distanzaPc - b.distanzaPc);
  let prossima = null; if (opz.caso) { const c = opz.caso.sotto ? opz.caso.sotto('supernova vicina') : sorgente(`${opz.caso}/supernova vicina`); prossima = { tra: -Math.log(1 - c('quando')) * ogniQuanto(100), distanza: 100 * Math.cbrt(c('dove')) }; prossima.effetto = effetto(prossima.distanza); }
  return { ritmo, ogniQuanto, effetto, distanzaPericolosa: Math.cbrt((0.0736 * D.ENERGIA_SN_COSMICI) / uCosmici) / PARSEC, vicine, prossima };
}

// =====================================================================================
// B. GLI AMPLIFICATORI
// =====================================================================================
// IL TEMPO DI AMPLIFICAZIONE DEL TEMPO ATMOSFERICO: da una molecola spostata a un altro tempo sul pianeta intero.
// → { secondi, giorni, molecole, cascata, vortici (s: i tre tratti), lyapunov (s: 1/ritmo di crescita dei cicloni),
//     raddoppio (s), regime } o null se non c'è un'aria che faccia da fluido
export function tempoMeteo(luogo, opz = {}) {
  const m = mondoDi(luogo, opz); if (!(m.p0 > 1) || m.gassoso) return null;
  const rho = (m.p0 * m.mu) / (R_GAS * m.Ts), flusso = Math.max(1, 0.4 * m.assorbita), w = Math.cbrt((m.g * flusso * m.H) / (rho * m.cp * m.Ts)), giro = m.H / w;
  const nu = 1.5e-5 * (1.2 / rho), eps = (w * w * w) / m.H, molecole = Math.sqrt(nu / eps), cascata = giro / (1 - Math.pow(2, -2 / 3));
  // i cicloni: vento termico dal salto di temperatura (al più quello che la spinta regge), crescita di Eady
  const f = (2 * Math.SQRT1_2 * 2 * Math.PI) / m.giorno, N = Math.sqrt(((m.g / m.Ts) * m.g) / m.cp / 2), Umax = Math.sqrt((m.g * m.H * m.dT) / m.Ts), U = Math.min((m.g * m.H * m.dT) / (f * m.Ts * m.R), Umax);
  const rossby = (N * m.H) / f, veloce = rossby < m.R, ritmo = veloce ? (0.31 * f * U) / (N * m.H) : U / m.R, vortici = Math.log(m.R / m.H) / ritmo, secondi = molecole + cascata + vortici;
  return { secondi, giorni: secondi / GIORNO, molecole, cascata, vortici, lyapunov: 1 / ritmo, raddoppio: Math.LN2 / ritmo, vento: U, regime: veloce ? 'cicloni (il pianeta gira in fretta)' : 'una sola circolazione (il pianeta gira piano)' };
}
// I TEMPI DEGLI ALTRI SISTEMI CAOTICI del pianeta (anni)
export function tempiCaotici(luogo, opz = {}) {
  const m = mondoDi(luogo, opz), meteo = tempoMeteo(luogo, opz), mare = m.mare > 0.02 && m.acqua === 'liquida' ? (D.GIRI_MARE * 2 * Math.PI * 5e4) / 0.1 / ANNO : null;
  const mantello = m.gassoso || !(m.q > 0) ? null : (D.GIRI_MANTELLO * m.R * (1 - m.nucleo)) / (0.05 * (m.q / 0.087) ** 2);
  const dinamo = m.dinamo && !m.gassoso ? (D.GIRI_DINAMO * m.R * m.nucleo) / 5e-4 / ANNO : null;
  // le orbite: un tempo diverso sposta un millesimo dell'aria; la sua gravità disturba un corpo lontano di δ; cresce come e^(t/T_L)
  const mossa = meteo ? D.ARIA_SPOSTATA * m.massaAria : mantello ? 1e-9 * m.M : 0, Mst = m.Ms ? m.Ms * MSOLE : MSOLE, a = m.aM || UA;
  const delta = mossa > 0 ? (mossa / m.M) * (m.R / a) ** 2 * (m.M / Mst) : 0, raddoppi = delta > 0 ? Math.log(1 / delta) : Infinity, prima = meteo ? meteo.secondi / ANNO : mantello ?? Infinity;
  return { meteo, mare, mantello, dinamo, delta, raddoppi, corpiPiccoli: prima + raddoppi * D.LYAPUNOV_PICCOLI, pianeti: prima + raddoppi * D.LYAPUNOV_PIANETI };
}
// → [{ specie: 'metastabile' | 'caotico' | 'copia', nome, acceso, dove, ritmo: { valore, unita, che }, tempo (secondi),
//      tempoTesto, cosa (che cosa decide), livello ('punto' | 'pianeta' | 'sistema'), nota }]
export function amplificatori(luogo, opz = {}) {
  const m = mondoDi(luogo, opz), t = tempiCaotici(luogo, opz), f = fulmini(luogo, opz), nubi = m.acqua === 'liquida' && m.p0 > 1e3 && !m.gassoso, out = [];
  const q = m.p0 > 0 ? ionizzazione(luogo, 0.5 * m.Hm, { ...opz, senzaSuolo: true }).cosmici : 0, att = sommaAttivita(luogo);
  const metti = (specie, nome, acceso, dove, ritmo, tempo, cosa, livello, nota = null) => out.push({ specie, nome, acceso: !!acceso, dove, ritmo, tempo, tempoTesto: isFinite(tempo) ? fmtTempo(tempo) : 'mai', cosa, livello, nota });
  metti('metastabile', 'aria sovrassatura: una goccia nasce su uno ione', nubi, "nelle nubi (aria più che satura di vapore)", { valore: q, unita: 'coppie di ioni per cm³ al secondo', che: 'ognuna può fare da nucleo' }, 1e3,
    "quale goccia nasce e dove; non quanta pioggia (CLOUD: i nuclei cambiano dell'1% al più)", 'punto', "da sola non sale: sale come seme del tempo atmosferico");
  metti('metastabile', "acqua sopraffusa: una goccia gela", nubi && m.Talta < 273 && m.Ts > 235, 'nelle nubi tra 0 e −38 °C', { valore: q, unita: 'coppie di ioni per cm³ al secondo', che: 'una traccia può avviare il gelo' }, 1,
    'quale goccia diventa ghiaccio e fa cadere le altre', 'punto');
  metti('metastabile', 'nube carica: un elettrone veloce avvia la scarica', f.alSecondo > 0, 'sotto i temporali (campo sotto la soglia dei 3 MV/m, sopra quella della valanga di elettroni veloci)', { valore: f.alSecondo * ANNO, unita: "fulmini all'anno sul pianeta", che: 'ogni fulmine parte da una particella' }, 1e-3,
    "quando e dove cade ogni fulmine: l'azoto fissato lì, un incendio", 'pianeta');
  metti('metastabile', 'salamoia sovrassatura: un cristallo nasce', !!(opz.salamoia || luogo.salamoia), "dove il mare evapora fino al sale (mare.js: «piana di sale»)", { valore: att, unita: 'decadimenti per kg al secondo', che: "una traccia può fare da germe" }, 1,
    'quale cristallo nasce per primo e dove: il disegno di quella crosta di sale', 'punto');
  metti('caotico', 'il tempo atmosferico', !!t.meteo, "tutta l'aria", { valore: 1, unita: 'ogni evento', che: 'non serve sceglierne uno: il moto delle molecole amplifica qualunque differenza' }, t.meteo ? t.meteo.secondi : Infinity,
    'dove e quando piove, ogni tempesta, ogni fulmine; NON il clima (le medie, le fasce di vento, i deserti)', 'pianeta', t.meteo ? `cascata della turbolenza ${fmtTempo(t.meteo.cascata)}, poi ${cifre(Math.log(m.R / m.H))} tempi di crescita dei cicloni da ${fmtTempo(t.meteo.lyapunov)} (${t.meteo.regime})` : "non c'è un'aria abbastanza densa");
  metti('caotico', 'i vortici del mare', t.mare != null, 'il mare', { valore: 1, unita: 'ogni evento', che: 'attraverso il vento' }, t.mare != null ? ((t.meteo?.secondi || 0) + t.mare * ANNO) : Infinity, 'dove sta ogni vortice e ogni meandro delle correnti; non le correnti medie', 'pianeta');
  metti('caotico', 'la dinamo del nucleo', t.dinamo != null, 'il nucleo liquido', { valore: 1, unita: 'ogni evento', che: 'attraverso la roccia (onde elastiche)' }, t.dinamo != null ? t.dinamo * ANNO : Infinity, "quando il campo magnetico s'inverte; non la sua forza media", 'pianeta');
  metti('caotico', 'il mantello', t.mantello != null, 'il mantello che convette', { valore: 1, unita: 'ogni evento', che: 'attraverso la roccia' }, t.mantello != null ? t.mantello * ANNO : Infinity, "dove salgono i pennacchi e dove si rompono le placche: la forma dei continenti; non quanti sono né quanto calore esce", 'pianeta');
  metti('caotico', 'le orbite dei corpi piccoli', isFinite(t.corpiPiccoli), 'il sistema della stella', { valore: t.delta, unita: "disturbo relativo sull'orbita di un corpo lontano", che: "la gravità dell'aria spostata da un tempo diverso" }, t.corpiPiccoli * ANNO,
    'quale corpo cade su quale pianeta, e quando: i prossimi impatti di tutto il sistema; non quanti in media', 'sistema', isFinite(t.raddoppi) ? `${cifre(t.raddoppi)} tempi di Lyapunov da ${anni(D.LYAPUNOV_PICCOLI)}; le orbite dei pianeti dopo ${anni(t.pianeti)}` : null);
  { const d = dose(luogo, opz).mutazioni; metti('copia', 'chimica che si copia: una mutazione', m.vita, m.vita ? "dove c'è chimica che si copia" : 'in questo progetto non è ancora accesa (prebiotica.autocatalisi)', { valore: d.daRadiazione, unita: "rotture per base all'anno dalla radiazione", che: `il calore ne fa ${cifre(d.daCalore)}: ${d.rapporto < 1 ? `${cifre(1 / d.rapporto)} volte di più` : 'meno'}` }, Infinity,
    'quale variante esiste: da lì tutta la discendenza', 'pianeta', 'il tempo è quello delle generazioni (ln N / vantaggio): non c’è ancora una legge nel progetto'); }
  return out;
}
const sommaAttivita = (luogo) => attivita(luogo).reduce((s, a) => s + a.perKg, 0);

// FIN DOVE RISALE UN EVENTO. evento: il suo indirizzo scritto (o { indirizzo, quando }); luogo: dove accade.
// → { evento, contenitori: { punto, pianeta, sistema }, livelli: [{ livello, contenitore, da (secondi dopo l'evento),
//      daTesto, via, cambia, nonCambia }] in ordine di tempo, mai: [ciò che resta identico in ogni caso],
//     tocca(a, dopoAnni): vero se l'indirizzo `a` (intreccio.js) può essere diverso `dopoAnni` anni dopo l'evento,
//     livelloDi(dopoAnni): il contenitore più largo raggiunto a quel tempo }
export function finDoveRisale(evento, luogo, opz = {}) {
  const ev = typeof evento === 'string' ? { indirizzo: evento } : evento || {}, scritto = ev.indirizzo || `${luogo.indirizzo || 'luogo'}/evento`, m = mondoDi(luogo, opz), t = tempiCaotici(luogo, opz);
  // i contenitori: il punto (il luogo), il pianeta, il sistema della stella
  const pezzi = String(luogo.indirizzo || scritto).split('/'), iP = pezzi.findIndex((p) => /^pianeta\b/.test(p)), iS = pezzi.findIndex((p) => /^stella\b/.test(p)), iL = pezzi.findIndex((p) => /^(aria|roccia|acqua|ghiaccio|mare|materia)$/.test(p));
  const pianeta = opz.pianeta || (iP >= 0 ? pezzi.slice(0, iP + 1).join('/') : iL > 0 ? pezzi.slice(0, iL).join('/') : pezzi[0]), sistema = opz.sistema || (iS >= 0 ? pezzi.slice(0, iS + 1).join('/') : iP > 0 ? pezzi.slice(0, iP).join('/') : pianeta);
  const contenitori = { punto: luogo.indirizzo || scritto, pianeta, sistema };
  // quanto ci mette il disturbo a toccare un fluido: nell'aria o nell'acqua è già lì; nella roccia viaggia col suono
  const s = sopraDi(luogo), fluido = luogo.tipo === 'aria' || luogo.tipo === 'acqua', viaggio = fluido ? 0 : s.rocciaM / 5000 + s.ghiaccioM / 3500 + s.acquaM / 1500;
  const urti = luogo.tipo === 'acqua' ? 1e-12 : m.p0 > 0 ? 1.5e-9 * (ATMOSFERA / m.p0) : Infinity, livelli = [];
  const metti = (livello, contenitore, da, via, cambia, nonCambia) => { if (isFinite(da)) livelli.push({ livello, contenitore, da, daTesto: da === 0 ? 'subito' : `dopo ${fmtTempo(da)}`, via, cambia, nonCambia }); };
  metti('il punto', 'punto', 0, "l'evento stesso", 'le tracce in quella finestra di materia: quale atomo è spostato, quale alone cresce, quale difetto resta', 'quante tracce ci sono in media, la dose, il calore');
  if (m.p0 > 1 || luogo.tipo === 'acqua') metti('i moti delle molecole attorno', 'punto', viaggio + 10 * urti, fluido ? 'gli urti tra molecole (ogni urto raddoppia la differenza)' : "un'onda elastica fino al fluido più vicino, poi gli urti tra molecole", 'dove sta ogni molecola del fluido', 'temperatura, pressione, composizione');
  if (t.meteo) { metti('il tempo atmosferico', 'pianeta', viaggio + t.meteo.secondi, 'turbolenza (cascata) e poi cicloni (caos)', 'dove e quando piove, ogni tempesta; dove cade ogni fulmine', 'il clima: le medie, le fasce di vento, i deserti, quanta pioggia in un anno');
    if (t.mare != null) metti('i vortici del mare', 'pianeta', viaggio + t.meteo.secondi + t.mare * ANNO, 'il vento diverso, poi il caos dei vortici', 'dove sta ogni vortice', 'le correnti medie, la chimica del mare');
    metti('i dettagli del rilievo', 'pianeta', viaggio + t.meteo.secondi + 1e3 * ANNO, 'ogni piena e ogni frana cadono in un altro giorno', 'quale ansa taglia un fiume, quale versante frana', "la rete dei fiumi, quanto erode in media"); }
  if (t.dinamo != null) metti('la dinamo', 'pianeta', viaggio + t.dinamo * ANNO, 'caos del nucleo liquido', "quando il campo s'inverte", 'la forza media del campo');
  if (t.mantello != null) metti('il mantello e le placche', 'pianeta', viaggio + t.mantello * ANNO, 'caos della convezione', 'dove salgono i pennacchi, la forma dei continenti', 'se ci sono placche, quanto calore esce');
  if (m.vita) metti('la vita', 'pianeta', viaggio + (t.meteo ? t.meteo.secondi : 0), 'una mutazione, o un tempo diverso che cambia chi sopravvive', 'quali varianti esistono', 'che la chimica si copi');
  metti('gli impatti nel sistema', 'sistema', t.corpiPiccoli * ANNO, "la gravità delle masse spostate, amplificata dal caos delle orbite dei corpi piccoli", 'quale corpo cade su quale pianeta e quando', 'quanti impatti in media, le orbite dei pianeti');
  metti('le orbite dei pianeti', 'sistema', t.pianeti * ANNO, 'il caos lento dei pianeti', 'dove sta ogni pianeta lungo la sua orbita, le fasi delle eccentricità', 'i semiassi, quali pianeti ci sono');
  livelli.sort((a, b) => a.da - b.da);
  const livelloDi = (dopoAnni) => { let c = 'punto'; for (const l of livelli) if (l.da <= dopoAnni * ANNO) { if (l.contenitore === 'sistema') c = 'sistema'; else if (l.contenitore === 'pianeta' && c === 'punto') c = 'pianeta'; } return c; };
  const tocca = (a, dopoAnni = Infinity) => (dopoAnni < 0 ? false : puoToccare(scritto, contenitori[livelloDi(dopoAnni)], a, ev.quando ?? null));
  return { evento: scritto, contenitori, livelli, livelloDi, tocca,
    mai: ['le somme: ogni flusso di risalita(luogo) (ionizzazione, azoto, argon, calore, dose)', 'il clima e la composizione del pianeta', 'la stella', 'gli altri sistemi e la galassia (servirebbe più dell\'età del cosmo: il caos delle orbite delle stelle ha tempi di centinaia di milioni di anni)', 'tutto ciò che è accaduto prima'] };
}

// IL RACCORDO INVERSO: sotto ogni famiglia di eventi incerti del progetto (eventi.js: sorgente) c'è un amplificatore.
// Non sono «caso in più»: sono eventi subatomici di molto tempo prima, amplificati. Dove non è così, è detto.
export const FAMIGLIE = Object.freeze([
  { famiglia: "le onde del campo di densità del cosmo (fasi e ampiezze)", dove: 'cosmo.js: cosmo(n)', specie: 'metastabile', sotto: "fluttuazioni quantistiche del campo che gonfiava il cosmo, stirate dall'espansione oltre l'orizzonte e lì congelate: ogni onda una fase a caso, indipendente dalle altre", tempo: "~10⁻³² s (l'inflazione), poi la gravità per miliardi di anni" },
  { famiglia: 'le galassie: quale picco, le fusioni, lo spin', dove: 'cosmo.js, galassie.js: formaGalassia', specie: 'caotico', sotto: 'lo stesso campo iniziale; poi il caos gravitazionale di molti corpi (le maree dei vicini danno lo spin)', tempo: 'miliardi di anni' },
  { famiglia: 'le stelle: dove nascono, con che massa e che campo', dove: 'galassie.js: stelleGalassia', specie: 'caotico', sotto: 'la turbolenza del gas, che decide dove una nube supera la soglia del collasso (metastabile)', tempo: 'milioni di anni (un giro della nube)' },
  { famiglia: 'le supernove: quale stella, quando, dove', dove: 'galassie.js: «supernova k/quando, dove, tipo, massa»', specie: 'caotico', sotto: "la massa di nascita viene dalla turbolenza della nube; l'istante dipende dalla massa (per le nane bianche, dall'orbita della compagna)", tempo: 'milioni di anni' },
  { famiglia: 'il disco e i pianeti: quali embrioni, gli urti giganti', dove: 'disco.js, impatti.js: «urto gigante k/dove, …»', specie: 'caotico', sotto: 'il caos delle orbite di molti corpi che si incrociano (tempi di Lyapunov di 10³–10⁶ anni)', tempo: '10⁵–10⁸ anni' },
  { famiglia: "il giro e l'asse dei pianeti", dove: 'rotazione.js: «impatto k/giro», «giro/sassi»', specie: 'caotico', sotto: "gli stessi urti: da che parte e con che angolo, deciso dal caos orbitale", tempo: '10⁵–10⁸ anni' },
  { famiglia: 'le lune e gli anelli: catture, urti, una luna che si spezza', dove: 'lune.js, anelli.js: «grande urto/storia», «ultima luna perduta»', specie: 'caotico', sotto: 'caos orbitale; e la rottura di un corpo alla soglia delle maree (metastabile)', tempo: '10⁴–10⁹ anni' },
  { famiglia: 'gli impatti: quando, dove, quale corpo', dove: 'impatti.js: «impatto id/quando, dove, corpo, angolo, sorte»', specie: 'caotico', sotto: 'il caos delle orbite dei corpi piccoli (risonanze con i pianeti giganti)', tempo: '10⁵–10⁷ anni' },
  { famiglia: 'lo stato di partenza del mantello', dove: 'cosmo.js: p.origine; tettonica.js', specie: 'caotico', sotto: 'la convezione di un fluido molto viscoso scaldato da dentro (numero di Rayleigh alto): caotica', tempo: '10⁸ anni (qualche giro del mantello)' },
  { famiglia: "l'increspatura da cui parte il tempo atmosferico", dove: 'meteo.js: PARAMETRI.increspatura (oggi fissa)', specie: 'caotico', sotto: "la turbolenza e i cicloni: qualunque evento dell'aria, due settimane prima", tempo: 'giorni' },
  { famiglia: 'le onde del mare, i campioni, dove sta ogni molecola', dove: 'mare.js: «onde», «campione», «molecole»', specie: 'caotico', sotto: 'la turbolenza del vento (onde) e gli urti tra molecole (posizioni): caos a ogni scala', tempo: 'da picosecondi (molecole) a ore (onde)' },
  { famiglia: 'i cristalli: dove nasce ogni grano, quale difetto', dove: 'rocce.js, atomi3d.js', specie: 'metastabile', sotto: 'la nucleazione in un fuso o in una soluzione oltre la soglia: il primo germe è una fluttuazione', tempo: 'subito' },
  { famiglia: 'i decadimenti, gli urti, gli sciami', dove: 'materia.js, mondo.js: casoEvento', specie: 'primo', sotto: "sono l'evento subatomico stesso: niente sotto (qui il caso è della fisica)", tempo: '—' },
  { famiglia: 'quale finestra, quali tracce mostrare', dove: 'mappa.js: «finestra/…», laboratorio.js', specie: 'nessuna', sotto: 'non è fisica: è la scelta di che cosa guardare (un campione di ciò che c\'è)', tempo: '—' },
]);

// LE FLUTTUAZIONI DELL'INIZIO: che cosa c'è in cosmo.js, che cosa è vero, che cosa manca
export function fluttuazioniDellInizio() {
  return { doveSta: 'cosmo.js, cosmo(n): 70 onde con numeri d\'onda interi fino a 9 per lato, fase a caso, ampiezza ∝ k^(−1,25) per un numero tra 0,5 e 1,5',
    vero: ["la somma di molte onde con fasi indipendenti è un campo gaussiano: è ciò che lasciano fluttuazioni quantistiche amplificate dall'espansione (ogni onda è un oscillatore nel suo stato fondamentale, stirato oltre l'orizzonte)", "le fasi sono eventi della sorgente del cosmo: un cosmo parallelo è un'altra fase di un'onda", "le galassie nascono nei picchi: è la stessa amplificazione, continuata dalla gravità"],
    manca: ["lo spettro: lì la varianza per ottava va come k^(−0,5) (le onde lunghe sono le più forti), mentre quella vera cresce con k su quelle scale (k^(3+n)·T²(k), n = 0,965: quasi k⁴ sotto 0,015/Mpc, poi sempre più piano): le onde lunghe sono troppo forti, quelle corte troppo deboli", "le ampiezze: per un campo gaussiano |a|² ha distribuzione esponenziale (Rayleigh), non uniforme tra 0,5 e 1,5", "due dimensioni e 70 onde invece di tre e tutte: niente piccola scala (la danno poi galassie.js con σ(M))", "la normalizzazione (σ8) non viene da lì: è imposta dopo"],
    esponenti: { quiPerOttava: -0.5, veroSottoIlPicco: 3 + 0.965 } };
}

// LA DIFFERENZA MINIMA TRA DUE MONDI per il tempo atmosferico: non un'increspatura fissa, ma un evento alla sorgente
// del pianeta (eventi.js). Tre fasi, una per ciascuna delle onde che meteo.js usa per rompere la simmetria; senza
// `caso` sono quelle di oggi (0, 1, 2): così chi non lo passa ottiene lo stesso tempo di prima. Un ramo
// { 'cosmo…/pianeta 2/meteo/seme/0': 1 } è il mondo in cui un evento di due settimane prima è andato in un altro modo.
export function increspatura(caso = null) {
  if (!caso) return { fasi: [0, 1, 2], evento: null };
  const c = caso.sotto ? caso.sotto('meteo/seme') : sorgente(`${caso}/meteo/seme`);
  return { fasi: [0, 1, 2].map((k) => 2 * Math.PI * c(String(k))), evento: `${c.radice}/0` };
}

// =====================================================================================
// TUTTO INSIEME
// =====================================================================================
// risalita(luogo, { P, stella, galassia, posizione, caso, pioggia, porosita }) → { luogo, flussi: [{ nome, valore, unita,
//   verso (a quale livello arriva), legge }], dose, ionizzazione(quotaM), profilo, circuito, fulmini, prodotti, radiolisi,
//   gasRadiogenici, orologi, vento, energiaPerLaChimica, supernova, amplificatori, tempi, famiglie, racconto: [frasi],
//   breve: [quattro frasi per il pannello del pianeta] }
export function risalita(luogo, opz = {}) {
  const m = mondoDi(luogo, opz), pr = profiloIonizzazione(luogo, opz), ci = circuitoElettrico(luogo, opz), fu = fulmini(luogo, opz), po = prodotti(luogo, opz), ra = radiolisi(luogo, opz), rp = m.gassoso ? null : radiolisiDelPianeta(luogo, opz);
  const ga = gasRadiogenici(luogo, opz), or = orologi(luogo), ve = ventoStellare(luogo, opz), ds = dose(luogo, opz), en = energiaPerLaChimica(luogo, opz), sn = supernovaVicina(luogo, opz), am = amplificatori(luogo, opz), tm = tempoMeteo(luogo, opz);
  const flussi = [], f = (nome, valore, unita, verso, legge) => { if (valore != null && isFinite(valore)) flussi.push({ nome, valore, unita, verso, legge }); };
  f('ionizzazione al suolo', pr.alSuolo.totale, 'coppie di ioni per cm³ al secondo', "l'aria", 'flusso × frenata × densità / 35 eV, più radon e γ del suolo');
  f('ionizzazione massima in quota', pr.massimo.valore, `coppie per cm³ al secondo, a ${cifre(pr.massimo.quotaM / 1000)} km`, "l'aria", 'il massimo di Pfotzer: sopra poca aria, sotto lo sciame è spento');
  f("energia dei raggi cosmici nell'aria", pr.energia, 'W/m²', "l'aria (chimica)", 'la somma della ionizzazione sulla colonna');
  f("conducibilità dell'aria al suolo", ci.conducibilita, 'S/m', 'il pianeta (circuito elettrico)', 'σ = 2·e·√(q/α)·μ');
  f('potenziale della ionosfera', ci.potenziale, 'V', 'il pianeta (circuito elettrico)', 'corrente dei temporali × resistenza della colonna / superficie');
  f('corrente di bel tempo', ci.correnteBelTempo, 'A/m²', 'il pianeta (circuito elettrico)', 'fulmini al secondo × carica / superficie');
  f('fulmini', fu.alSecondo, 'al secondo sul pianeta', "l'aria (chimica)", 'una parte fissa del calore latente della pioggia');
  f('azoto fissato dai fulmini', po.azoto.fulmini.kgAnno, "kg all'anno", "l'aria, il suolo, il mare (chimica)", '250 mol di NO per fulmine');
  f('azoto fissato dai raggi cosmici', po.azoto.cosmici.kgAnno, "kg all'anno", "l'aria (chimica)", '1,25 atomi di N per coppia di ioni');
  f('carbonio-14', po.carbonio14.atomiM2s, 'atomi per m² al secondo', "il carbonio che scambia con l'aria (un orologio)", "neutroni catturati dall'azoto (materia.js)");
  f('berillio-10', po.berillio10.atomiM2s, 'atomi per m² al secondo', 'i ghiacci e i sedimenti (un orologio)', "nuclei d'azoto e ossigeno spezzati");
  if (luogo.tipo !== 'aria') f('calore della radioattività', calore(luogo), 'W/kg in questo punto', "l'interno del pianeta (tettonica, dinamo)", 'la somma dei decadimenti (materia.js = leggi.js)');
  if (luogo.tipo !== 'aria') f('idrogeno dalla radiolisi', ra.H2, "mol per kg d'acqua all'anno, qui", 'la chimica sotto terra e sotto il mare', 'energia assorbita × G');
  if (rp) f('idrogeno dalla radiolisi nella crosta', rp.crosta, "mol all'anno (i primi 5 km dei continenti)", 'la chimica sotto terra', 'lo stesso, sulla crosta bagnata');
  f("argon-40 nell'aria", ga.argon40.frazione, "frazione dell'aria in volume", "l'aria (composizione)", 'potassio-40 decaduto × 10,72% × parte degassata');
  f("elio-4 che esce dall'interno", ga.elio4.flusso, 'atomi per m² al secondo', "l'aria, poi lo spazio", 'le α delle catene di uranio e torio');
  if (or?.zircone) f('danno negli zirconi', or.zircone.alfaPerGrammo, 'α per grammo', 'il minerale (reticolo)', 'le α accumulate da quando lo zircone tiene il danno');
  if (ve) { f('vento della stella', ve.pressione, 'Pa', 'la magnetosfera', 'Ṁ·v/(4πa²)'); f("aria portata via dal vento", ve.perditaAria, 'kg/s', "l'aria (quanta ne resta)", 'la massa di vento intercettata'); f('aurore', ve.aurora.potenza, 'W', "l'aria alta ai poli", "1% della potenza del vento sulla magnetosfera");
    if (ve.sputtering) f('superficie strappata dal vento', ve.sputtering.metriPerAnno, "m all'anno", 'la superficie (colore, grani)', 'ioni × resa'); }
  f('dose', ds.totale.Sv, "Sv all'anno", 'la chimica che si copia (mutazioni)', 'flusso × frenata, più la radioattività attorno');
  f('supernova entro 10 parsec', sn.ogniQuanto(10), 'anni tra una e la successiva', 'tutto il pianeta (dose, ozono)', 'ritmo della galassia / volume del disco');
  // il racconto: poche frasi con i numeri di questo luogo
  const r = [], E = en.superficie, mSv = (x) => `${cifre(x * 1000)} mSv`, tc = tempiCaotici(luogo, opz);
  if (m.gassoso) r.push("È un gigante di gas: non c'è un suolo. I numeri dell'aria valgono sopra il livello di 1 bar; i suoi fulmini e il suo tempo qui non sono calcolati.");
  if (m.p0 > 0) r.push(`I raggi cosmici fanno ${cifre(pr.alSuolo.cosmici)} coppie di ioni per cm³ al secondo ${m.gassoso ? 'al livello di 1 bar' : 'al suolo'}${pr.alSuolo.radon + pr.alSuolo.suolo > 0.05 * pr.alSuolo.cosmici ? ` (più ${cifre(pr.alSuolo.radon + pr.alSuolo.suolo)} dalla roccia: radon e raggi γ)` : ''}${pr.massimo.quotaM > 1000 ? ` e ${cifre(pr.massimo.valore)} a ${cifre(pr.massimo.quotaM / 1000)} km di quota` : ' (in quota di meno: l’aria è troppo poca perché lo sciame cresca)'}${m.dinamo ? '' : ': non c’è campo magnetico a fermarli'}. È questo che rende l'aria un poco conduttrice${fu.alSecondo > 0 ? ` (${cifre(ci.conducibilita)} S/m): i ${cifre(fu.alSecondo)} fulmini al secondo tengono l'alta atmosfera a ${cifre(ci.potenziale / 1000)} kV` : ''}.`);
  else r.push(`Non c'è aria: i raggi cosmici${ve?.scoperto ? ' e il vento della stella' : ''} arrivano fino alla superficie${ve?.sputtering ? `, che il vento consuma di ${cifre(ve.sputtering.metriPerAnno * 1e10)} ångström all'anno e annerisce in ${anni(ve.sputtering.annerimento)}` : ''}.`);
  r.push(`Energia per la chimica (W/m²): ultravioletto della stella ${cifre(E.ultravioletto)}, fulmini ${cifre(E.fulmini)}, aurore ${cifre(E.aurore)}, raggi cosmici ${cifre(E.cosmici)}; nel primo chilometro di roccia la radioattività ne dà ${cifre(E.radioattivita)}. ${en.qui ? `Qui sotto domina ${en.qui.domina === 'cosmici' ? 'ciò che resta dei raggi cosmici' : en.qui.domina === 'radioattivita' ? 'la radioattività' : "l'ultravioletto che ancora filtra"}.` : `In superficie domina ${E.domina === 'ultravioletto' ? "l'ultravioletto" : E.domina === 'radioattivita' ? 'la radioattività della roccia' : `${E.domina === 'fulmini' ? 'i fulmini' : E.domina === 'aurore' ? 'le aurore' : 'i raggi cosmici'}`}.`}`);
  if (m.p0 > 0 && (po.azoto.fulmini.kgAnno > 0 || po.azoto.cosmici.kgAnno > 0)) r.push(`Azoto fissato: ${cifre(po.azoto.fulmini.kgAnno / 1e9)} milioni di tonnellate all'anno dai fulmini, ${cifre(po.azoto.cosmici.kgAnno / 1e9)} dai raggi cosmici. Carbonio-14: ${cifre(po.carbonio14.atomiM2s / 1e4)} atomi per cm² al secondo.`);
  if (!m.gassoso) r.push(`Dalla roccia: il potassio-40 decaduto in ${anni(m.eta)} ha messo nell'aria ${!ga.argon40.trattenuto ? 'argon che la gravità non ha tenuto' : ga.argon40.gelato > ga.argon40.nellAria ? 'argon che a questo freddo è quasi tutto gelato al suolo' : `argon per ${cifre(ga.argon40.pressione)} Pa${m.p0 > 0 ? ` (${cifre(ga.argon40.frazione * 100)}% dell'aria)` : ''}`}; l'elio delle α ${ga.elio4.trattenuto ? `si accumula (${cifre(ga.elio4.frazione * 100)}%)` : `esce (${cifre(ga.elio4.flusso / 1e4)} atomi per cm² al secondo) e fugge nello spazio`}.${ra.H2 > 0 && luogo.tipo !== 'aria' ? ` L'acqua ${luogo.tipo === 'roccia' ? 'nei pori della roccia' : 'di qui'} è spezzata dalla radioattività: ${cifre(ra.H2 * 1e9)} nanomoli di idrogeno per chilo all'anno.` : ''}`);
  r.push(`Dose in questo punto: ${mSv(ds.totale.Sv)} all'anno (${mSv(ds.cosmici.Sv)} dai raggi cosmici${ds.suolo.Gy > 0 ? `, ${mSv(ds.suolo.Gy)} dai γ del suolo` : ''}${ds.interna.Sv > 0 ? `, ${mSv(ds.interna.Sv)} dalla radioattività attorno${ds.interna.alfa > 0.2 * ds.interna.Gy ? `: quasi tutto dalle α, che arrivano solo a 30 µm da un grano; β e γ danno ${cifre((ds.interna.beta + ds.interna.gamma) * 1000)} mGy` : ''}` : ''}). Rompe ${cifre(ds.mutazioni.daRadiazione)} legami per base all'anno in una molecola che si copia: il calore, a ${Math.round(ds.mutazioni.T - ZERO_CELSIUS)} °C, ne rompe ${cifre(ds.mutazioni.daCalore)}.`);
  if (ve && m.p0 > 0) r.push(`Il vento della stella preme ${cifre(ve.pressione * 1e9)} nPa: ${ve.scoperto ? "senza un campo che lo tenga lontano tocca l'aria alta" : `il campo lo ferma a ${cifre(ve.magnetopausa)} raggi e le aurore ricevono ${cifre(ve.aurora.potenza / 1e9)} GW`}; porta via ${cifre(ve.perditaAria)} kg d'aria al secondo (${cifre(ve.ariaPersa.pressione / 1e5)} bar in tutta la storia del pianeta).`);
  r.push(`Un solo evento risale così: ${tm ? `il tempo atmosferico è un altro dopo ${fmtTempo(tm.secondi)} (non il clima)` : "qui non c'è un'aria che lo amplifichi"}; ${isFinite(tc.corpiPiccoli) ? `gli impatti del sistema dopo ${anni(tc.corpiPiccoli)}` : 'niente porta il disturbo fino alle orbite'}. Una supernova entro 10 parsec capita ogni ${anni(sn.ogniQuanto(10))}: moltiplica i raggi cosmici per ${cifre(sn.effetto(10).cosmici)} per ${anni(sn.effetto(10).durata)} (o per ${cifre(sn.effetto(10).cosmiciLento)} per ${anni(sn.effetto(10).durataLento)}): in tutto, la dose di ${anni(sn.effetto(10).anniDiFondo)} normali.`);
  const breve = [
    m.p0 > 0 ? `Raggi cosmici: ${cifre(pr.alSuolo.cosmici)} coppie di ioni per cm³ al secondo ${m.gassoso ? 'a 1 bar' : 'al suolo'}${pr.massimo.quotaM > 1000 ? `, ${cifre(pr.massimo.valore)} a ${cifre(pr.massimo.quotaM / 1000)} km` : ''}${m.dinamo ? '' : ' (nessun campo li ferma)'}; dose ${mSv(ds.totale.Sv)} all'anno, di cui ${mSv(ds.cosmici.Sv)} dal cielo.` : `Senz'aria i raggi cosmici arrivano al suolo: ${mSv(ds.cosmici.Sv)} all'anno${ve?.sputtering ? `; il vento della stella annerisce la superficie in ${anni(ve.sputtering.annerimento)}` : ''}.`,
    `Energia per la chimica dell'aria (W/m²): ultravioletto ${cifre(E.ultravioletto)}, fulmini ${cifre(E.fulmini)}, aurore ${cifre(E.aurore)}, raggi cosmici ${cifre(E.cosmici)}: ${cifre(en.relativa)} volte la Terra.${po.azoto.fulmini.kgAnno + po.azoto.cosmici.kgAnno > 0 ? ` Azoto fissato: ${cifre((po.azoto.fulmini.kgAnno + po.azoto.cosmici.kgAnno) / 1e9)} milioni di tonnellate all'anno.` : ''}`,
    m.gassoso ? "È un gigante di gas: niente roccia sotto i piedi." : `Dalla roccia: ${!ga.argon40.trattenuto ? "l'argon del potassio-40 è fuggito" : ga.argon40.gelato > ga.argon40.nellAria ? "l'argon del potassio-40 è gelato al suolo" : `argon-40 per ${cifre(ga.argon40.pressione)} Pa${m.p0 > 0 ? ` (${cifre(ga.argon40.frazione * 100)}% dell'aria)` : ''}`}; l'elio ${ga.elio4.trattenuto ? `resta (${cifre(ga.elio4.frazione * 100)}%)` : 'fugge'}${rp && rp.crosta > 0 ? `; la radioattività spezza l'acqua della crosta: ${cifre(rp.crosta)} moli di idrogeno all'anno` : ''}.`,
    `Un solo evento andato diversamente: ${tm ? `il tempo atmosferico è un altro dopo ${fmtTempo(tm.secondi)} (il clima no)` : 'niente lo amplifica nell\'aria'}${isFinite(tc.corpiPiccoli) ? `, gli impatti del sistema dopo ${anni(tc.corpiPiccoli)}` : ''}.`];
  return { luogo: luogo.nome || luogo.tipo, flussi, breve, dose: ds, ionizzazione: (quotaM) => ionizzazione(luogo, quotaM, opz), profilo: pr, circuito: ci, fulmini: fu, prodotti: po, radiolisi: ra, radiolisiPianeta: rp, gasRadiogenici: ga, orologi: or, vento: ve,
    energiaPerLaChimica: en, supernova: sn, amplificatori: am, tempi: tc, famiglie: FAMIGLIE, racconto: r };
}
