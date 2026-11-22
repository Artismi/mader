// storia.js — LA STORIA DI UN PIANETA: lo stato lento a un tempo qualsiasi della sua vita, come soluzione di equazioni
// differenziali ordinarie integrate dall'origine (INTRECCIO, regola 6: «lo stato di una cosa a un istante viene dalla sua
// storia»; regola 7: una grandezza, una fonte; regola 11: il «prima» si deve poter guardare).
//
//   storia(P, t, { stella })  →  lo stato a t anni dalla nascita: mantello, nucleo, calore, nucleo interno, dinamo,
//                                 regime della crosta, vulcani, la stella a quel tempo (luce, XUV), e «interno» nella
//                                 forma che geologia.interno() ha sempre restituito.
//
// La storia si calcola UNA VOLTA per pianeta (qualche centinaio di righe in memoria, allungate se si chiede un tempo
// più avanti) ed è una funzione pura dei numeri del pianeta e della sua stella: lo stesso indirizzo dà la stessa storia.
// Nessun esito è tirato a caso: negli stadi 1–3 non c'è nessun evento incerto (le sole incertezze sono parametri di
// scienza aperta, che si cambiano come «rami» delle leggi: vedi APERTI).
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// STADIO 1 — LA STORIA TERMICA. Due temperature, T_m (media del mantello) e T_cmb (al confine nucleo–mantello):
//   M_m·(c_p + L_m·dφ/dT)·dT_m/dt = Q_rad + Q_marea + Q_cmb − Q_conv − Q_fuso      (L_m·dφ/dT solo finché sotto il coperchio c'è fuso)
//   [M_c·c_c·a_c + (L_Fe + E_G)·ρ_c·4πR_ic²·(−dR_ic/dT_cmb)]·dT_cmb/dt = −Q_cmb
// È il modello di Driscoll e Bercovici 2014 come sta scritto nel sorgente di ThermInt (VPLanet, licenza MIT), letto riga
// per riga in research_notes/Leggi fisiche complete per stateyour/interno_rocce_paesaggio.md §2 [V]. Marche delle fonti,
// come nelle note: [V] letto sulla fonte, [T] triangolato, [D] derivato qui, [R] ricordato.
//   · strati limite: δ = [Ra_c·ν·κ/(α·g·ΔT)]^(1/3); flussi q = k·ΔT/δ, in alto (verso la superficie) e in basso (dal nucleo) [V];
//   · viscosità ν = ν_rif·exp(E_ν/(R·T_UM))/ε_fuso, con ε_fuso la legge di Costa per la roccia in parte fusa [V]; la frazione fusa
//     sotto il coperchio è quella della risalita isoentropica di Katz (fusoIsoentropico), la stessa della colonna;
//   · le temperature degli strati limite: sulla Terra T_UM = 0,7·T_m e T_LM = 1,3·T_m [V]; sono rapporti adiabatici:
//     per un altro pianeta T ∝ ρ^γ lungo l'adiabatica, con la densità della roccia sotto pressione di Seager e altri
//     2007 [V] e l'esponente che sulla Terra ridà quei due numeri [D] (una super-Terra non ha così un mantello a 30 000 K);
//   · il fuso: la risalita fonde dove l'adiabatica incontra il solidus di Katz, Spiegelman e Langmuir 2003 [V] e si ferma
//     alla base del coperchio; con le placche (mobilità oltre un mezzo) ci sono dorsali e arriva in superficie; la frazione fusa
//     lungo la risalita isoentropica è quella di Katz e altri 2003 (F ∝ (T − T_s)^1,5, il calore latente che raffredda) [V]; portata Ṁ = 1,16·κ·A·ρ·φ/δ e calore portato dalle
//     eruzioni ε_erutt·Ṁ·c_p·ΔT, ε_erutt = 0,1 [V, ThermInt]; sotto un coperchio fermo la portata è quella di Foley 2019
//     [V]: 17,8·π·R·v·(spessore che fonde)·φ con v = 0,05·(κ/d)·(Ra_i/θ)^(2/3);
//   · calore radiogenico: leggi.js caloreDellaRoccia (ISOTOPI: condriti) per la massa di roccia e ferro, come lune.js:
//     una legge sola per pianeti e lune. Sparisce il fattore √Z che interno() aveva in più (parametro libero);
//   · calore di marea (maree.js, la fonte unica): −Im(k₂*)·[(21/2)e² + (3/2)sin²ε]·G·M²·R⁵·n/a⁶, con k₂* dalla viscosità e
//     dalla rigidità che il mantello ha in quel momento (reologia di Andrade). IL CICLO marea → temperatura → viscosità →
//     marea si chiude qui, dentro l'integrazione: il ramo caldo (Io) è dove il calore che esce uguaglia quello di marea.
//     Chi alza la marea: la stella sull'orbita del pianeta, o il pianeta sulla luna (P.marea);
//   · IL REGIME DELLA CROSTA (Korenaga 2010, arXiv:1008.4782 [V]): la litosfera si rompe in placche se il contrasto di
//     viscosità che la attraversa, Δη_L = exp(0,327·γ^0,647·θ), resta sotto 0,25·Ra_i^(1/2); γ = μ_eff/(α·ΔT),
//     θ = E·ΔT/(R·T_u²), ΔT = T_u − T_superficie. L'UNICA IPOTESI è l'attrito efficace: μ_eff = μ_secco·(1 − λ·w), con
//     μ_secco = 0,65 (Byerlee, 0,6–0,7 [V]), λ = 0,97 dove c'è acqua (è il μ_eff ≈ 0,02 di riferimento di Korenaga
//     [V]: quanto l'acqua abbassi l'attrito non è misurato, è scienza aperta) e w = la parte del pianeta sotto il
//     mare (leggi.js mareAtteso; 0 se l'acqua è vapore: la luce assorbita supera leggi.js LIMITE_VAPORE; 1 sotto un
//     guscio di ghiaccio). Non ci sono più soglie su q, sulla massa o sulla frazione d'acqua;
//   · se lo strato limite verrebbe più spesso del mantello (Rayleigh sotto il critico, 660 [V]) il mantello non convette:
//     conduzione attraverso tutto il mantello, crosta ferma, niente fuso;
//   · il flusso sotto un coperchio fermo: la legge di Foley 2019 (arXiv:1903.12111 [V], c₁ = 0,5 «assunto dagli
//     autori»): nelle variabili di ThermInt è q_UM·c₁·Ra_c^(1/3)·θ^(−4/3) [D] (≈ 1/11 sulla Terra; ThermInt usa 1/25
//     fisso [V]). Tra i due regimi si passa con l'indice di mobilità m = 1/[1 + (Δη_L/Δη_crit)^s], s = 1 (PARAMETRO
//     NUMERICO di raccordo, dichiarato: Δη_L varia di ordini di grandezza, il passaggio è comunque netto);
//   · IL NUCLEO. Adiabatica T(P) = T_cmb·exp[(P − P_cmb)/P_D], P_D = ρ_c·c_c/α_c (identità termodinamica [D]; con la
//     pressione di un nucleo a densità uniforme è T_cmb·exp[(R_c² − r²)/D_N²], la forma di ThermInt [V], con
//     D_N = √(3c_c/(2π·α_c·ρ_c·G)) = 7390 km per ρ_c = 11 000 kg/m³; ThermInt ha 6340 km). Liquidus del ferro puro:
//     la curva di Simon di Zhang e altri 2015 usata da Zhang e Rogers 2022 (arXiv:2208.06523 [V]),
//     T = 1900 K·(P/31,3 GPa + 1)^(1/1,99): vale a ogni pressione, quindi per ogni pianeta (la forma di ThermInt è scritta
//     per il raggio della Terra). Gli elementi leggeri lo abbassano come una soluzione ideale (abbassamento crioscopico
//     [D]): 1/T = 1/T_puro − (R/L)·ln(1 − x), con il calore latente L_Fe = 7,5·10⁵ J/kg [V] e x la frazione molare
//     nel liquido, che cresce mentre il nucleo interno li rifiuta [V]. Il nucleo interno arriva dove le due curve si
//     incontrano; crescendo libera calore latente e gravitazionale (E_G = 3·10⁵ J/kg [V]);
//   · LA DINAMO. Il flusso che l'adiabatica porta per conduzione è q_ad = k_c·α_c·g·T_cmb/c_c (Zhang e Rogers [V];
//     ThermInt scrive k·T·R_c/D_N², la metà [V]: qui si tiene la derivata vera dell'adiabatica [D]). Galleggiamento
//     termico F_th = α_c·g·(q_cmb − q_ad)/(ρ_c·c_c) e composizionale F_χ = g_icb·(Δρ_χ/ρ_c)·(R_ic/R_c)²·dR_ic/dt [V].
//     C'è dinamo se F_th + F_χ > 0 e se il numero di Reynolds magnetico μ₀·σ·v·D supera 50, con v = (F·D)^(1/3) e
//     σ = k_c/(L₀·T) (Zhang e Rogers [V]). Momento di dipolo M = 4π·R_c³·γ_d·√(ρ_c/(2μ₀))·[F·(R_c − R_ic)]^(1/3) [V],
//     campo all'equatore B = μ₀·M/(4π·R³);
//   · LA ROTAZIONE (già in interno): il dipolo c'è solo se il numero di Rossby locale sta sotto 0,12 (Olson e
//     Christensen 2006 [V]); Ro_l ∝ F^(1/2)·Ω^(−7/6)·D^(−1/3) [D dalle loro leggi]; la costante contiene le diffusività
//     del ferro liquido, che non si conoscono abbastanza: come nella letteratura (Zuluaga e Cuartas 2012 [V]) è
//     fissata sulla Terra di oggi, Ro_l = 0,09 (DATO [R]; è l'unica costante presa dalla Terra). Sopra la soglia il
//     campo in superficie è dieci volte più debole («almeno dieci»: di quanto, la legge non lo sa).
// STADIO 2 — «interno» nella forma di sempre: geologia.interno(P, stella) è storia(P, età).interno.
// STADIO 3 — LA STELLA NEL TEMPO: la luce da stelle.js (stella(M, { Z, eta: t })); l'ultravioletto estremo e i raggi X
//   dalla legge di Ribas e altri 2005 [V], F(1–1200 Å, 1 UA) = 29,7·τ^(−1,23) erg/s/cm² (τ in miliardi di anni), satura
//   prima di 0,1 miliardi di anni. Alla saturazione L_XUV/L = 5,1·10⁻⁴: è lo stesso numero che Johnstone e altri 2021
//   misurano per i raggi X saturi (R_X,sat = 5,135·10⁻⁴ [V]), ed è così che la legge passa alle altre stelle.
//
// STADIO 4 — ARIA E ACQUA NEL TEMPO: FATTO SOLO IN PARTE (esposto, non collegato):
//   · il degassamento: la CO2 che esce con il fuso, (Ṁ_fuso/φ)·C del mantello (chimica.js ROCCE.rimasto: una fonte sola);
//   · il TETTO ENERGETICO della fuga dell'aria: dM/dt = ε·π·F_XUV·R³/(G·M), ε = 0,1 (VPLanet/Come farlo emergere §1
//     [V-prec]; R_XUV = R e K_marea = 1), e il suo integrale dalla nascita. È un tetto: vale per un'alta atmosfera di
//     idrogeno; per un'aria di N2 o CO2 comandano il limite di diffusione e il raffreddamento della termosfera, che qui
//     MANCANO: da solo il tetto non distingue la Terra da Marte (lo dice la prova);
//   · il clima a un tempo t (climaNelTempo): chimica.js climaEAria, cioè il bilancio per fasce con il ciclo carbonati–
//     silicati che c'è già (§8), con la luce della stella, il calore dell'interno e il regime della crosta di QUEL tempo.
//     I livelli veloci (clima, aria) stanno in equilibrio con quelli lenti a ogni istante (regola 6): il carbonio dell'aria
//     si pareggia in meno di un milione di anni. Si calcola solo quando lo si chiede (costa come un clima: decine di ms).
//   MANCA: i serbatoi integrati nel tempo (acqua persa, carbonio sepolto), la fuga vera, e lo STADIO 5 (ossigeno e
//   carbonio organico sotto l'ipotesi della fotosintesi ossigenica): non è stato fatto.
//
// PARAMETRI DI SCIENZA APERTA (APERTI: ciascuno con valore centrale e intervallo; si cambiano con { rami: { nome: valore } }
// e la storia che ne esce è un altro ramo, tenuto in memoria a parte):
//   conducibilitaNucleo  70 W/m/K a 4000 K (20–160: 40 dalle misure, 100 dai calcoli da principi primi; ∝ T, Wiedemann–Franz)
//   dipolo               γ_d = 0,2 (0,14–0,28 nella forma con 2μ₀: Olson e Christensen 2006, verifica A1)
//   poriAcqua            λ = 0,97 (l'attrito efficace con l'acqua: μ_eff ≈ 0,02; aperto tra 0,02 e 0,1)
//   leggeriNucleo        0,10 in massa, contati come zolfo (5–15%; quali elementi siano è aperto)
// DATI E SEMPLIFICAZIONI DICHIARATE:
//   · la struttura è quella di interno(): due strati a densità uniforme, nucleo a 11 000 kg/m³ (per un pianeta piccolo
//     è troppo: il nucleo viene più piccolo del vero; la struttura vera è il blocco 3 della tabella di marcia);
//   · la temperatura di superficie che il mantello vede è quella di equilibrio con albedo 0,3 (senza serra): il clima
//     non è ancora collegato alla storia (si può passare con { Tsuperficie }); sotto un guscio di ghiaccio 273 K;
//   · un mondo ghiacciato è trattato come il suo interno di roccia e ferro sotto il guscio (densità del guscio e
//     dell'interno nelle proporzioni dei materiali non compressi di Seager e altri 2007 [V]);
//   · partenza calda [D]: il mantello parte dal suo liquidus in superficie (o, per un corpo piccolo, dall'energia di
//     accrescimento 3GM/5R), il nucleo dal liquidus dei silicati alla pressione del confine (curva di Simon, Zhang e
//     Rogers [V]); il transitorio dell'oceano di magma dura pochi milioni di anni;
//   · il giorno nel tempo: rotazione.js dà solo quello di oggi; il numero di Rossby usa quello;
//   · MANCA: gli elementi radioattivi che la crosta porta via al mantello, il fuso alla base del mantello, la neve di
//     ferro (un nucleo che gela dall'alto), il regime episodico (Venere), i giganti di gas (restano la legge di prima).
//   · RESTA DELLA TERRA: le proprietà dei materiali sono quelle misurate o adottate per la Terra (conducibilità del
//     mantello profondo, dilatazione del ferro, salto di viscosità, viscosità senza la pressione): per un pianeta piccolo o
//     molto grande sono un'estrapolazione; e la costante del numero di Rossby.
// CHE COSA NON TORNA con la realtà (lo stampa test/test_storia.mjs, con i numeri):
//   · il nucleo interno della Terra nasce 2,5 miliardi di anni fa e oggi ha 2240 km di raggio (vero: meno di 1,5; 1221 km):
//     45 K di T_cmb separano «nessun nucleo interno» da «quello di oggi», e con gli elementi leggeri al 15% non nasce affatto;
//   · Marte (e ogni pianeta piccolo con un nucleo di ferro) tiene una dinamo debole finché il nucleo interno cresce: il Marte
//     vero non ne ha da 4 miliardi di anni (nucleo ricco di zolfo, tutto liquido); la Luna qui non ne ha mai avuta una;
//   · sotto un coperchio fermo il mantello resta sul suo solidus e fonde sempre un poco: Marte oggi esce «con vulcani», e la
//     crosta di basalto accumulata arriva alla profondità dell'eclogite (Marte: 140 km; il vero ~50);
//   · la temperatura potenziale del mantello terrestre cala di 38 K per miliardo di anni (dalle lave antiche: 50–100);
//     (la crosta degli oceani veniva di 14 km e il magma il doppio del vero con la produttività lineare di Foley 2019; con la
//     fusione isoentropica di Katz è 8,6 km e 36 km³/anno: test_storia);
//   · il campo senza dipolo (Venere, Mercurio) è solo «dieci volte meno»: resta 10⁻⁶ T dove il vero è sotto 10⁻⁸;
//   · stadio 4: il tetto energetico della fuga supera di 200 volte l'aria della Terra come quella di Marte (non le
//     distingue); con il ciclo del carbonio di chimica.js la Terra di 3,5 miliardi di anni fa non gela ma bolle (i
//     vulcani di allora, 3,7 volte oggi, emettono più CO2 di quanta la roccia fresca esposta possa consumare).

import { COSTANTI, MSOLE, LSOLE, UA, R_GAS, ANNO, ZERO_CELSIUS, PESI_ATOMICI, MTERRA, RTERRA, caloreDellaRoccia, temperaturaEquilibrio, acquaInSuperficie, mareAtteso, LIMITE_VAPORE } from './leggi.js';
import { stella as stellaVera } from './stelle.js';
import { MAREE, epsilonFuso, dissipazioneIn, coefficienteDelCorpo, forzanteMareale, motoMedio } from './maree.js'; // la marea e la viscosità della roccia: una fonte sola
import { ROCCE, climaEAria } from './chimica.js'; // il carbonio del mantello e il ciclo del carbonio: una fonte sola (§8)

const G = COSTANTI.G, PI = Math.PI, ANNO_S = ANNO, MU0 = 4e-7 * PI;

// ---------- le costanti, ognuna con la sua fonte
export const STORIA = Object.freeze({
  // il mantello (ThermInt [V] dove non è detto altro: Driscoll e Bercovici 2014, PEPI 236, 36, come sta in thermint.c di VPLanet)
  nuRif: MAREE.roccia.nuRif, Enu: MAREE.roccia.Enu, // (m²/s, J/mol) viscosità cinematica: ν_rif·exp(E_ν/RT): la stessa che maree.js usa per la dissipazione
  saltoViscosita: 2.4, // la viscosità del mantello inferiore su quella del superiore: ν_LM = 2,40·ν_UM (Driscoll e Bercovici 2014, in thermint.c [V]; è un rapporto, non un logaritmo)
  RaC: 660, // il numero di Rayleigh critico dello strato limite
  alfa: 3e-5, cp: 1265, // (1/K, J/kg/K)
  kSu: 4.2, kGiu: 10, // (W/m/K) conducibilità in alto e in basso: k_UM = 4,2, k_LM = 10 (Driscoll e Bercovici 2014, in thermint.c [V]; la peridotite misurata sta tra 3 e 5)
  rhoSu: 3300, // (kg/m³) la roccia del mantello non compressa (κ = k/(ρ·c_p) = 10⁻⁶ m²/s)
  // l'adiabatica del mantello: T ∝ ρ^γ, con la densità della roccia sotto pressione di Seager e altri 2007 (tab. 3 [V]):
  // ρ = 4100 + 0,00161·P^0,541. L'esponente e il livello a cui la temperatura è quella media sono i due numeri che sulla
  // Terra (133 GPa al confine col nucleo) ridanno T_UM = 0,7·T_m e T_LM = 1,3·T_m di ThermInt [D da due V]
  eosRoccia: Object.freeze([4100, 0.00161, 0.541]), gruneisenMantello: 1.805, livelloMedio: 0.314,
  costa: MAREE.costa, // la viscosità con il fuso (forma di Costa): in maree.js (epsilonFuso)
  erutta: 0.1, portataFuso: 1.16, // la parte del fuso che erutta; Ṁ = 1,16·κ·A·ρ·φ/δ
  // (J/kg; m³/K) il calore latente del mantello, L_m = 3,2·10⁵ J/kg, e il volume che fonde per kelvin, dV_liq/dT = 8·10¹⁷ m³/K
  // (Driscoll e Bercovici 2014, tabella 2, e thermint.c [V]): due misure della Terra. Quanta parte del mantello fonde per kelvin
  // (struttura().dFdT) è dV_liq/dT sul volume del mantello della Terra DEL MODELLO, (4/3)π(R⊕³ − R_c³) con la sua struttura a
  // due strati (VM_TERRA, 9,10·10²⁰ m³; prima il numero scritto a mano 9,06·10²⁰). NON sul mantello del pianeta: il dV_liq/dT
  // di ThermInt è della Terra, e diviso per il mantello di un corpo piccolo fa fondere tutto in pochi kelvin (Io senza marea
  // fonderebbe 3000 volte di più e non gelerebbe: test_maree). Il rapporto giusto per ogni pianeta viene dal suo solidus e dalla
  // sua gravità (lo spessore che fonde per kelvin, ∝ 1/(ρ·g·(dT_sol/dP − dT_ad/dP))): è il passo che resta
  latenteMantello: 3.2e5, volumeFusoPerKelvin: 8e17,
  // la fusione (Katz e altri 2003, letti nel sorgente di pyMelt [V]; T in K, P in Pa); i polinomi valgono fino a ~8 GPa
  solidus: Object.freeze([1085.7 + ZERO_CELSIUS, 132.9e-9, -5.1e-18]), liquidus: Object.freeze([1780 + ZERO_CELSIUS, 45e-9, -2.0e-18]), pMaxFusione: 8e9,
  adiabaticaSolida: 1e-8, // (K/Pa) Foley 2019 [V]
  // LA FUSIONE LUNGO LA RISALITA (Katz e altri 2003, tab. 2, letti nel sorgente di pyMelt [V]): la frazione fusa della
  // lherzolite F(T, P) = ((T − T_s)/(T_lherz − T_s))^β₁ fino all'esaurimento del clinopirosseno (F_cpx = M_cpx/(r₀ + r₁·P)),
  // poi verso il liquidus con β₂; la risalita è isoentropica (c_p·dT/T − α/ρ·dP + ΔS·dF = 0, con il c_p e il ΔS di Katz):
  // il calore latente raffredda la colonna, e vicino al solidus la produttività è piccola (F ∝ ΔT^1,5). Prima era lineare,
  // dF/dP = 1,5·10⁻¹⁰ Pa⁻¹ costante (Foley 2019): la crosta degli oceani veniva di 14 km e il magma il doppio del vero
  lherzolite: Object.freeze([1475 + ZERO_CELSIUS, 80e-9, -3.2e-18]), katz: Object.freeze({ beta1: 1.5, beta2: 1.5, Mcpx: 0.17, r0: 0.5, r1: 0.08e-9, cp: 1000, dS: 300 }),
  // il coperchio fermo (Foley 2019 [V]) e il criterio delle placche (Korenaga 2010 [V])
  c1Fermo: 0.5, c2Fermo: 0.05, foleyFuso: 17.8, rhoFuso: 2800, korenagaA: 0.327, korenagaN: 0.647, korenagaCrit: 0.25, raccordo: 1,
  attritoSecco: 0.65, // Byerlee: 0,6–0,7 [V]
  // LA CROSTA DI BASALTO NON SCENDE OLTRE L'ECLOGITE: sotto ~1,5 GPa il basalto diventa eclogite, più densa del mantello, e
  // affonda (Ito e Kennedy 1971 [R]; per i coperchi O'Rourke e Korenaga 2012 [V]: la profondità del limite va come 1/g). Prima la
  // crosta di un coperchio arrivava allo spessore del coperchio (Marte: 360 km)
  eclogite: 1.5e9, rhoBasalto: 2900,
  // il nucleo (ThermInt [V]; le curve di Simon: Zhang e Rogers 2022 [V])
  rhoNucleo: 11000, // (kg/m³) la stessa di geologia.interno
  alfaNucleo: 1e-5, cNucleo: 840, latenteFerro: 7.5e5, gravitazionale: 3e5, saltoLeggeri: 700, // (1/K, J/kg/K, J/kg, J/kg, kg/m³)
  lorenz: 2.5e-8, Tconducibilita: 4000, // (W·Ω/K²; K) Wiedemann–Franz: k ∝ T; la conducibilità dichiarata è a 4000 K
  simonFerro: Object.freeze([1900, 31.3e9, 1 / 1.99]), simonSilicato: Object.freeze([1831, 4.6e9, 0.33]),
  massaFerro: PESI_ATOMICI.Fe / 1000, massaLeggero: PESI_ATOMICI.S / 1000, leggeriMassimo: 0.36, // (kg/mol) ferro e zolfo; oltre il 36% (FeS puro) la legge non vale
  reynoldsMagnetico: 50, // la soglia della dinamo (Zhang e Rogers [V])
  rossby: Object.freeze({ soglia: 0.12, terra: 0.09, senzaDipolo: 0.1 }), // Olson e Christensen 2006: soglia [V], Terra [R], «almeno dieci volte»
  campoSenzaDinamo: 1e-9, // (T) il fondo che interno() ha sempre dato a chi non ha dinamo (convenzione rimasta)
  // la superficie e la stella
  albedoNuda: 0.3, Tghiaccio: 273, // come leggi.js clima() (Tnuda); la base di un guscio di ghiaccio
  seager: Object.freeze({ ferro: 8300, roccia: 4100, ghiaccio: 1460 }), // (kg/m³) densità a pressione zero (Seager e altri 2007, tab. 3 [V])
  ribas: Object.freeze({ F: 29.7e-3, esponente: -1.23, saturo: 0.1e9 }), // (W/m² a 1 UA, —, anni) Ribas e altri 2005 [V]
  efficienzaFuga: 0.1, // ε della fuga limitata dall'energia (VPLanet [V-prec])
  vulcaniPerFlusso: 0.02, // (W/m²) CONVENZIONE RIMASTA di interno(): quanti edifici vulcanici disegnare, uno ogni 0,02 W/m²
});
// i parametri di scienza aperta: valore centrale e intervallo; si cambiano come rami
export const APERTI = Object.freeze({
  conducibilitaNucleo: Object.freeze({ valore: 70, intervallo: Object.freeze([20, 160]), unita: 'W/m/K a 4000 K', fonte: 'Zhang e Rogers 2022 (40; provano 80 e 160); Pozzo e altri 2012 (100): aperto [V]' }),
  dipolo: Object.freeze({ valore: 0.2, intervallo: Object.freeze([0.14, 0.28]), unita: 'γ_d, forma con 2μ₀', fonte: 'Olson e Christensen 2006; Driscoll e Barnes 2015 (0,2); ThermInt (0,155) [V]' }),
  poriAcqua: Object.freeze({ valore: 0.97, intervallo: Object.freeze([0.85, 0.97]), unita: 'λ: μ_eff = 0,65·(1 − λ)', fonte: 'Korenaga 2010: μ_eff ≈ 0,02 di riferimento [V]; il valore vero è aperto (0,02–0,1)' }),
  andradeAlfa: Object.freeze({ valore: MAREE.andrade.alfa, intervallo: MAREE.andrade.intervalloAlfa, unita: 'α di Andrade', fonte: 'Renaud e Henning 2018: 0,1–0,4 sull\'olivina, 1/3 per Io [V]' }),
  andradeZeta: Object.freeze({ valore: MAREE.andrade.zeta, intervallo: MAREE.andrade.intervalloZeta, unita: 'ζ = τ_A/τ_M', fonte: 'Renaud e Henning 2018: nominale 1; in laboratorio 10⁻¹⁰–10⁻⁴ [V]: aperto' }),
  leggeriNucleo: Object.freeze({ valore: 0.10, intervallo: Object.freeze([0.05, 0.15]), unita: 'frazione in massa (come zolfo)', fonte: 'ThermInt: 10% [V]; quali elementi, aperto' }),
});
// la Terra di riferimento per la costante del numero di Rossby (i numeri di test/test_fili.mjs)
// (la luce è quella che stelle.js dà al Sole di 4,5 miliardi di anni, come per ogni altro pianeta: prima era L☉, l'8% in più, e la
// Terra di riferimento girava attorno a un Sole diverso da quello del modello; con la fusione di Katz la differenza spostava Ro_l
// della Terra delle prove di 1,2·10⁻⁴)
const TERRA_RIF = Object.freeze({ tipo: 'roccioso', massaKg: MTERRA, raggioM: RTERRA, composizione: Object.freeze({ ferro: 0.32, roccia: 0.674, acqua: 0.006 }), aM: UA, Mstella: MSOLE, giorno: 86164 });
// il mantello della Terra del modello (la stessa struttura a due strati di struttura(): il nucleo di ferro a densità uniforme)
const VM_TERRA = (4 / 3) * PI * (RTERRA ** 3 - (3 * MTERRA * TERRA_RIF.composizione.ferro) / (4 * PI * STORIA.rhoNucleo)), FUSO_PER_KELVIN = STORIA.volumeFusoPerKelvin / VM_TERRA;

// ---------- piccoli attrezzi
const simon = ([T0, P0, n], P) => T0 * Math.pow(Math.max(0, P) / P0 + 1, n);
const poli = (c, P) => { const p = Math.min(Math.max(0, P), STORIA.pMaxFusione); return c[0] + c[1] * p + c[2] * p * p; };
// LA COLONNA CHE FONDE (Katz e altri 2003 [V], vedi STORIA.lherzolite): la frazione fusa all'equilibrio a (T, P), e la tabella,
// fatta una volta, dell'integrale ∫F dP lungo la risalita isoentropica da dove l'adiabatica solida (T_p + adiabaticaSolida·P)
// incontra il solidus fino a una pressione P: per T_p da 1200 a 2600 K ogni 5 K e P ogni 50 MPa fino a 8 GPa. ∫F dP/(ρ·g) è lo
// spessore del fuso estratto da una colonna (McKenzie e Bickle 1988: la crosta è ∫F dz) [D]; la frazione media è ∫F dP/(P_i − P)
function frazioneFusa(T, P) {
  const S = STORIA, k = S.katz, Ts = poli(S.solidus, P); if (T <= Ts) return 0;
  const Tl = poli(S.lherzolite, P), TL = poli(S.liquidus, P), Fc = Math.min(1, k.Mcpx / (k.r0 + k.r1 * Math.min(P, S.pMaxFusione))), Tc = Ts + Math.pow(Fc, 1 / k.beta1) * (Tl - Ts);
  return T < Tc ? Math.pow((T - Ts) / (Tl - Ts), k.beta1) : Math.min(1, Fc + (1 - Fc) * Math.pow(Math.max(0, (T - Tc) / (TL - Tc)), k.beta2));
}
// LA FRAZIONE FUSA DEL MANTELLO DI TEMPERATURA POTENZIALE T_p ALLA PRESSIONE P: il mantello che sale è in equilibrio con
// l'entropia di partenza, T = (T_p + adiabaticaSolida·P)·e^(−ΔS·F/c_p), F = frazioneFusa(T, P), risolto per bisezione (Katz e
// altri 2003 [V]; McKenzie e Bickle 1988). È una sola frazione fusa: quella che la risalita estrae (la colonna, qui sotto) e
// quella che sotto il coperchio ammorbidisce il mantello (la viscosità e la rigidità di flussi()). (Prima la seconda era la retta
// (T_p − T_s)/(T_L − T_s) tra solidus e liquidus, senza il calore latente: Io a 1911 K aveva il 70% di fuso sotto il coperchio
// dove la sua stessa risalita ne dava il 35%, e l'equilibrio della marea stava oltre il massimo della dissipazione)
// (la radice di g(F) = F − frazioneFusa(T₀·e^(−ΔS·F/c_p), P), che cresce con F, sta tra 0 e frazioneFusa(T₀, P): regula falsi
// con la correzione di Illinois, fino a 10⁻¹³ — continua in T_p per lo jacobiano per differenze dell'integratore)
function fusoIsoentropico(Tp, P) {
  const S = STORIA, a = S.katz.dS / S.katz.cp, T0 = Tp + S.adiabaticaSolida * P, F0 = frazioneFusa(T0, P); if (!(F0 > 0)) return 0;
  let x0 = 0, g0 = -F0, x1 = F0, g1 = F0 - frazioneFusa(T0 * Math.exp(-a * F0), P), lato = 0;
  for (let n = 0; n < 100 && x1 - x0 > 1e-13; n++) {
    const x = g1 - g0 > 0 ? x1 - (g1 * (x1 - x0)) / (g1 - g0) : 0.5 * (x0 + x1), g = x - frazioneFusa(T0 * Math.exp(-a * x), P);
    if (g === 0) return x;
    if (g < 0) { x0 = x; g0 = g; if (lato === -1) g1 *= 0.5; lato = -1; } else { x1 = x; g1 = g; if (lato === 1) g0 *= 0.5; lato = 1; }
  }
  return 0.5 * (x0 + x1);
}
// (la tabella si fa una riga di T_p per volta, la prima volta che serve: in ogni punto della risalita fusoIsoentropico)
const COLONNA = { T0: 1200, dT: 5, nT: 281, dP: 5e7, nP: 161, righe: [] };
function rigaColonna(a) {
  const c = COLONNA; let r = c.righe[a]; if (r) return r; r = c.righe[a] = new Float64Array(c.nP);
  const Tp = c.T0 + a * c.dT, Fdi = (P) => fusoIsoentropico(Tp, P);
  let I = 0, Fsu = Fdi((c.nP - 1) * c.dP); for (let b = c.nP - 1; b > 0; b--) { const Fgiu = Fdi((b - 1) * c.dP); I += 0.5 * (Fsu + Fgiu) * c.dP; r[b - 1] = I; Fsu = Fgiu; }
  return r;
}
// ∫F dP (Pa) della colonna di temperatura potenziale Tp, dall'inizio della fusione fino alla pressione Pfine
function fusoDellaColonna(Tp, Pfine) {
  // (interpolazione cubica di Catmull-Rom nei due versi: la derivata è continua, e lo jacobiano per differenze dell'integratore
  // non vede i nodi della tabella; con quella lineare i passi di lavoro si staccavano da quelli fitti di 12 K)
  const c = COLONNA, x = Math.min(c.nT - 1.000001, Math.max(0, (Tp - c.T0) / c.dT)), y = Math.min(c.nP - 1.000001, Math.max(0, Pfine / c.dP)), a = Math.floor(x), b = Math.floor(y), u = x - a, v = y - b;
  const g = (i, j) => rigaColonna(Math.min(c.nT - 1, Math.max(0, i)))[Math.min(c.nP - 1, Math.max(0, j))], cr = (p0, p1, p2, p3, t) => p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
  const riga = (i) => cr(g(i, b - 1), g(i, b), g(i, b + 1), g(i, b + 2), v);
  return Math.max(0, cr(riga(a - 1), riga(a), riga(a + 1), riga(a + 2), u));
}
// ---------- STADIO 3: la stella nel tempo
// la luce della stella (in unità solari) a t anni, tenuta in memoria per (massa, metalli): quaranta punti in logaritmo
const memoStelle = new Map();
function luceNelTempo(massa, Z) {
  const chiave = `${massa}|${Z}`; let v = memoStelle.get(chiave); if (v) return v;
  const N = 48, lt0 = Math.log(1e6), lt1 = Math.log(2e10), L = new Float64Array(N); let vita = Infinity;
  for (let i = 0; i < N; i++) { const s = stellaVera(massa, { Z, eta: Math.exp(lt0 + ((lt1 - lt0) * i) / (N - 1)) }); L[i] = Math.log(Math.max(1e-30, s.L)); vita = s.vita; }
  v = { vita, L: (t) => { const x = ((Math.log(Math.max(1e6, Math.min(2e10, t))) - lt0) / (lt1 - lt0)) * (N - 1), i = Math.min(N - 2, Math.floor(x)); return Math.exp(L[i] + (L[i + 1] - L[i]) * (x - i)); } };
  memoStelle.set(chiave, v); if (memoStelle.size > 400) memoStelle.delete(memoStelle.keys().next().value);
  return v;
}
// → { L (W), flusso (W/m² sul pianeta), XUV (W/m² sul pianeta), XUVsuL, saturo } a t anni; null se della stella non si sa niente
function stellaA(st, t) {
  if (!st) return null;
  let L, a = st.aM;
  if (st.fine != null && t >= st.fine) L = st.LwOggi; // (dopo la morte della stella: ciò che resta, con la luce di oggi)
  else { L = st.luce.L(Math.min(t, st.luce.vita)) * LSOLE * st.scala; if (st.fine != null) a = st.aM * st.stretta; } // (prima che la stella perdesse massa l'orbita era più stretta)
  const R = STORIA.ribas, saturo = t < R.saturo, LXUV = st.Lsaturo * (saturo ? 1 : Math.pow(t / R.saturo, R.esponente)) * (st.fine != null && t >= st.fine ? 0 : 1);
  const area = 4 * PI * a * a;
  return { L, aM: a, flusso: L / area, XUV: LXUV / area, XUVsuL: L > 0 ? LXUV / L : 0, saturo };
}

// ---------- la struttura (quella di interno(): due strati a densità uniforme) e ciò che non cambia nel tempo
function struttura(P, stella, rami) {
  const S = STORIA, comp = P.composizione || {}, ghiacciato = P.tipo === 'ghiacciato', fg = ghiacciato ? Math.min(0.95, comp.ghiaccio ?? 0.5) : 0;
  const M = P.massaKg, R = P.raggioM, rhoMedia = M / ((4 / 3) * PI * R ** 3), ferro = Math.min(0.95, Math.max(0, comp.ferro ?? 0.1)), Mi = M * (1 - fg), ferroI = Math.min(0.95, ferro / (1 - fg));
  // sotto un guscio di ghiaccio: guscio e interno si comprimono nelle proporzioni dei loro materiali a pressione zero
  let Ri = R, rhoG = 0;
  if (fg > 0) { const rhoI0 = 1 / (ferroI / S.seager.ferro + (1 - ferroI) / S.seager.roccia); rhoG = rhoMedia * (fg + ((1 - fg) * S.seager.ghiaccio) / rhoI0); Ri = Math.cbrt((3 * Mi) / (4 * PI * ((rhoG * rhoI0) / S.seager.ghiaccio))); }
  const Mc = M * ferro, Rc = Math.min(0.98 * Ri, Math.cbrt((3 * Mc) / (4 * PI * S.rhoNucleo))), Mm = Math.max(1e-6 * M, Mi - Mc), D = Ri - Rc, rhoM = Mm / ((4 / 3) * PI * (Ri ** 3 - Rc ** 3));
  const g = (G * Mi) / (Ri * Ri), gc = (G * Mc) / (Rc * Rc), A = 4 * PI * Ri * Ri, Ac = 4 * PI * Rc * Rc;
  const Ptop = rhoG * ((G * M) / (R * R)) * (R - Ri), Pcmb = Ptop + rhoM * 0.5 * (g + gc) * D, Kp = ((2 * PI) / 3) * G * S.rhoNucleo ** 2, Pcentro = Pcmb + Kp * Rc * Rc;
  // l'adiabatica del mantello: T ∝ ρ^γ tra la cima, il livello medio e il fondo
  const rho = (Pp) => S.eosRoccia[0] + S.eosRoccia[1] * Math.pow(Math.max(0, Pp), S.eosRoccia[2]), rhoMedio = rho(Ptop + S.livelloMedio * (Pcmb - Ptop));
  const eSu = Math.pow(rho(Ptop) / rhoMedio, S.gruneisenMantello), eGiu = Math.pow(rho(Pcmb) / rhoMedio, S.gruneisenMantello);
  // IL NUCLEO: adiabatica e liquidus in funzione del raggio; il raggio del nucleo interno come funzione di T_cmb
  const PD = (S.rhoNucleo * S.cNucleo) / S.alfaNucleo, DN2 = PD / Kp, w0 = rami.leggeriNucleo, Lmol = S.latenteFerro * S.massaFerro;
  const NR = 64, rr = new Float64Array(NR), Gr = new Float64Array(NR); let nBuoni = 1;
  for (let k = 0; k < NR; k++) {
    const r = (Rc * k) / (NR - 1), Pr = Pcentro - Kp * r * r, w = Math.min(S.leggeriMassimo, w0 / Math.max(1e-9, 1 - (r / Rc) ** 3)), xm = w / S.massaLeggero / (w / S.massaLeggero + (1 - w) / S.massaFerro);
    const Tp = simon(S.simonFerro, Pr), Tl = Tp / (1 - ((R_GAS * Tp) / Lmol) * Math.log(1 - xm));
    rr[k] = r; Gr[k] = Tl * Math.exp(-(Pr - Pcmb) / PD); // la T_cmb a cui il nucleo interno arriva a r
  }
  while (nBuoni < NR && Gr[nBuoni] < Gr[nBuoni - 1]) nBuoni++; // (fin dove il nucleo gela dal centro: liquidus più ripido dell'adiabatica)
  // la media dell'adiabatica sul volume del nucleo, su T_cmb (ThermInt: 1/0,8 sulla Terra)
  let ac = 0; for (let k = 0; k < 200; k++) { const u = (k + 0.5) / 200; ac += 3 * u * u * Math.exp(((Rc * Rc) / DN2) * (1 - u * u)) / 200; }
  // la superficie: l'acqua che lubrifica le faglie
  const acqua = acquaInSuperficie(P), bagnato = ghiacciato ? 1 : acqua.kg > 0 ? mareAtteso({ acquaKg: acqua.kg, raggioM: R, placche: false }) : 0;
  // LA MAREA (maree.js): chi la alza — P.marea = { Mospite, aM, eccentricita, obliquita } per una luna attorno al suo pianeta,
  // se no la stella sull'orbita del pianeta —, la sua frequenza e la forzante (W per unità di −Im k₂*). Quanto ne diventa
  // calore lo decide lo stato del mantello a ogni istante (flussi). Sotto un guscio di ghiaccio non è ancora calcolata
  const orbita = ghiacciato ? null : P.marea ? { ...P.marea, raggioM: R } : P.Mstella > 0 && P.aM > 0 ? { Mospite: P.Mstella, aM: P.aM, eccentricita: P.eccentricita ?? 0, obliquita: 0, raggioM: R } : null;
  const forzante = orbita ? forzanteMareale(orbita) : 0, omegaMarea = orbita ? motoMedio(orbita.Mospite, orbita.aM) : 0;
  // la partenza calda
  const Taccr = (0.6 * G * M) / (R * S.cp), TumZero = Math.min(poli(S.liquidus, Ptop), 300 + Taccr), TcmbZero = Math.max((TumZero / eSu) * eGiu, Math.min(simon(S.simonSilicato, Pcmb), 300 + Taccr));
  return { M, R, Ri, Rc, D, Mi, Mc, Mm, rhoM, g, gc, A, Ac, Ptop, Pcmb, Pcentro, Kp, PD, DN2, eSu, eGiu, ac, rr, Gr, nBuoni, neve: nBuoni < 2, bagnato, forzante, omegaMarea, parteMantello: 1 - (Rc / Ri) ** 3, dFdT: FUSO_PER_KELVIN, Mrad: Mi, TumZero, TcmbZero,
    kappaSu: S.kSu / (S.rhoSu * S.cp), kappaGiu: S.kGiu / (rhoM * S.cp), nucleo: Rc / R, ghiacciato, haNucleo: Mc > 1e-4 * M && Rc > 1e3 };
}
// il raggio del nucleo interno (m) e la sua derivata rispetto a T_cmb (m/K, negativa), dalla tabella della struttura
function nucleoInterno(st, Tcmb, esce) {
  const { rr, Gr, nBuoni } = st; esce.r = 0; esce.dr = 0;
  if (nBuoni < 2 || Tcmb >= Gr[0]) return esce;
  if (Tcmb <= Gr[nBuoni - 1]) { esce.r = rr[nBuoni - 1]; return esce; }
  let lo = 0, hi = nBuoni - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (Gr[m] > Tcmb) lo = m; else hi = m; }
  // (vicino al centro G(r) ≈ G(0) − c·r²: si interpola in r², così il raggio nasce come una radice e non a scatti)
  const u = (Gr[lo] - Tcmb) / (Gr[lo] - Gr[hi]), r2 = rr[lo] ** 2 + u * (rr[hi] ** 2 - rr[lo] ** 2), r = Math.sqrt(r2);
  esce.r = r; esce.dr = r > 0 ? -(rr[hi] ** 2 - rr[lo] ** 2) / (Gr[lo] - Gr[hi]) / (2 * r) : 0; return esce;
}

// ---------- STADIO 1: i flussi a uno stato (T_m, T_cmb) e a un tempo; «o» è riempito e restituito
// ciò che viene da fuori a un tempo t (non dipende dallo stato): la stella, la temperatura di superficie, se l'acqua è
// vapore, il calore radiogenico
function ambiente(st, sv, t, e = {}) {
  const S = STORIA, sole = sv.stella ? stellaA(sv.stella, t) : null;
  e.t = t; e.sole = sole; e.Ts = sv.Tsuperficie ? sv.Tsuperficie(t) : st.ghiacciato ? S.Tghiaccio : sole ? Math.max(30, Math.pow((sole.flusso * (1 - S.albedoNuda)) / (4 * COSTANTI.sigma), 0.25)) : S.Tghiaccio;
  e.vapore = !st.ghiacciato && !!sole && (sole.flusso * (1 - S.albedoNuda)) / 4 > LIMITE_VAPORE; e.Qrad = caloreDellaRoccia(t) * st.Mrad;
  return e;
}
// (PRESTAZIONI, senza cambiare un bit: ciò che non dipende dallo stato si calcola una volta — i logaritmi e la radice cubica
// delle costanti qui sotto; D³ e il coefficiente 19/(2ρgR) del corpo in «piu» (piuDi) —; la dissipazione di marea riempie
// due numeri senza creare oggetti (maree.js dissipazioneIn). Le espressioni e il loro ordine sono quelli di prima.)
const LN_KORENAGA = Math.log(STORIA.korenagaCrit), LN_FERMO = Math.log(STORIA.korenagaCrit) + 0.5 * Math.log(STORIA.RaC), C1_CBRT_RAC = STORIA.c1Fermo * Math.cbrt(STORIA.RaC), DZ = { imK2: 0, k2Reale: 0 };
const piuDi = (st) => ({ D3: st.D ** 3, cMarea: coefficienteDelCorpo(st.Mi, st.Ri) });
function flussi(st, piu, amb, rami, Tm, Tcmb, o) {
  const S = STORIA, Tum = Tm * st.eSu, Tlm = Tm * st.eGiu, sole = amb.sole, Ts = amb.Ts;
  const dT = Math.max(1, Tum - Ts), arr = S.nuRif * Math.exp(S.Enu / (R_GAS * Tum)), base = (S.alfa * st.g * dT) / (S.RaC * st.kappaSu);
  // il criterio di Korenaga con la viscosità a un dato fuso → la mobilità; poi lo strato limite e il coperchio
  const teta = (S.Enu * dT) / (R_GAS * Tum * Tum), vapore = amb.vapore, w = vapore ? 0 : st.bagnato;
  const attrito = S.attritoSecco * (1 - rami.poriAcqua * w), gam = attrito / (S.alfa * dT), lnEta = S.korenagaA * Math.pow(gam, S.korenagaN) * teta, fermo = Math.min(1, C1_CBRT_RAC * Math.pow(teta, -4 / 3));
  let eps = 1, nu = arr, delta = 0, mob = 0, pref = 1, lid = 0, Pbase = 0, Fv = 0, lnCrit = 0, fermoDelTutto = false;
  for (let giro = 0; giro < 3; giro++) { // (il fuso sotto il coperchio dipende dallo spessore del coperchio, che dipende dalla viscosità, che dipende dal fuso)
    nu = arr / eps; delta = Math.cbrt(nu / base);
    // SE IL MANTELLO NON CONVETTE (lo strato limite sarebbe più spesso del mantello: numero di Rayleigh sotto il critico) il
    // calore esce per sola conduzione attraverso tutto il mantello: niente placche, niente risalite che fondono
    if (delta >= st.D) { fermoDelTutto = true; delta = st.D; mob = 0; pref = 1; lid = st.D; Pbase = st.Ptop + S.rhoSu * st.g * st.D; Fv = 0; lnCrit = LN_FERMO; break; }
    lnCrit = LN_KORENAGA + 0.5 * Math.log((S.alfa * st.g * dT * piu.D3) / (st.kappaSu * nu));
    mob = 1 / (1 + Math.exp(Math.max(-50, Math.min(50, S.raccordo * (lnEta - lnCrit)))));
    pref = mob + (1 - mob) * fermo; lid = delta / pref; Pbase = st.Ptop + S.rhoSu * st.g * Math.min(lid, st.D);
    // (il mantello che convette comincia sotto il coperchio: è lì che fonde o no, con la frazione fusa della risalita)
    const F = fusoIsoentropico(Tum, Pbase);
    if (!(F > 0)) { Fv = 0; if (eps === 1) break; eps = Math.sqrt(eps); continue; }
    Fv = F; const e2 = epsilonFuso(Fv); if (Math.abs(e2 - eps) < 1e-3 * eps) { eps = e2; break; } eps = giro === 0 ? e2 : Math.sqrt(eps * e2);
  }
  const qUM = (S.kSu * dT) / delta, Qconv = st.A * qUM * pref;
  // la risalita che fonde: dall'incontro dell'adiabatica con il solidus fino alla base del coperchio (alla superficie, a placche)
  const s0 = S.solidus[0], s1 = S.solidus[1], s2 = S.solidus[2], bq = s1 - S.adiabaticaSolida, disc = bq * bq + 4 * s2 * (Tum - s0);
  const Pi = Tum <= s0 ? 0 : disc <= 0 ? S.pMaxFusione : Math.min(S.pMaxFusione, (-bq + Math.sqrt(disc)) / (2 * s2));
  // (con le placche — mobilità oltre un mezzo — ci sono dorsali, e lì la risalita arriva in superficie; senza, si ferma
  // alla base del coperchio. Le dorsali ci sono o non ci sono: qui i due regimi non si mescolano)
  // (fi: la frazione fusa media della colonna, ∫F dP/colonna, lungo la risalita isoentropica di Katz: vedi fusoDellaColonna)
  const Pfine = mob > 0.5 ? st.Ptop : Pbase, colonna = fermoDelTutto ? 0 : Math.max(0, Pi - Pfine), fi = colonna > 0 ? Math.min(1, fusoDellaColonna(Tum, Pfine) / colonna) : 0;
  // quanto fuso (kg/s): con le placche la legge di ThermInt, Ṁ = 1,16·κ·A·ρ·φ/δ [V]; sotto un coperchio fermo quella di
  // Foley 2019 [V]: volume 17,8·π·R·v·(spessore della zona che fonde)·φ, con la velocità sotto il coperchio
  // v = 0,05·(κ/d)·(Ra_i/θ)^(2/3) e la densità del fuso 2800 kg/m³
  const Mfuso = !(fi > 0) ? 0 : mob > 0.5 ? (S.portataFuso * st.kappaSu * st.A * S.rhoSu * fi) / delta
    : S.rhoFuso * S.foleyFuso * PI * st.Ri * (S.c2Fermo * (st.kappaSu / st.D) * Math.pow(Math.exp(2 * (lnCrit - LN_KORENAGA)) / teta, 2 / 3)) * (colonna / (S.rhoSu * st.g)) * fi;
  const Qfuso = S.erutta * Mfuso * S.cp * dT;
  // la velocità del mantello sotto il coperchio (m/s), la stessa della portata di Foley 2019 qui sopra: v = 0,05·(κ/d)·(Ra_i/θ)^(2/3)
  const vInterno = fermoDelTutto ? 0 : S.c2Fermo * (st.kappaSu / st.D) * Math.pow(Math.exp(2 * (lnCrit - LN_KORENAGA)) / teta, 2 / 3);
  // il confine nucleo–mantello
  let Qcmb = 0, qcmb = 0;
  if (st.haNucleo) { const d = Tcmb - Tlm, nuGiu = S.saltoViscosita * arr, // (il fuso alla base del mantello non è modellato: lì la viscosità è quella della roccia solida)
     dl = Math.min(st.D, Math.cbrt((S.RaC * nuGiu * st.kappaGiu) / (S.alfa * st.gc * Math.max(1e-6, Math.abs(d))))); qcmb = (S.kGiu * d) / dl; Qcmb = st.Ac * qcmb; }
  // IL CALORE DI MAREA dallo stato del mantello: la stessa viscosità (con il suo fuso) che fa la convezione, la rigidità
  // che cala con il fuso; dissipa il mantello (la sua parte del volume). È il ciclo marea → temperatura → viscosità → marea
  let Qmarea = 0, imK2 = 0, k2re = 0;
  if (st.forzante > 0) { const dz = dissipazioneIn(piu.cMarea, MAREE.roccia.rigidita / eps, MAREE.roccia.densita * nu, st.omegaMarea, rami.reologia, DZ); imK2 = dz.imK2; k2re = dz.k2Reale; Qmarea = st.forzante * imK2 * st.parteMantello; }
  const Qrad = amb.Qrad;
  // il calore latente del mantello che gela: una capacità in più finché è in parte fuso
  const capM = st.Mm * (S.cp + (Fv > 0 ? S.latenteMantello * st.dFdT : 0));
  o.dTm = ((Qrad + Qmarea + Qcmb - Qconv - Qfuso) / capM) * ANNO_S; // (K per anno)
  // il nucleo
  nucleoInterno(st, Tcmb, o);
  const Ric = o.r, capC = st.Mc * S.cNucleo * st.ac + (S.latenteFerro + S.gravitazionale) * S.rhoNucleo * 4 * PI * Ric * Ric * -o.dr;
  o.dTc = st.haNucleo ? (-Qcmb / capC) * ANNO_S : 0;
  o.Tum = Tum; o.Tlm = Tlm; o.Ts = Ts; o.delta = delta; o.lid = lid; o.mob = mob; o.lnEta = lnEta; o.lnCrit = lnCrit; o.attrito = attrito; o.teta = teta; o.Fv = Fv; o.eps = eps; o.nu = nu;
  o.Qconv = Qconv; o.Qfuso = Qfuso; o.Qcmb = Qcmb; o.Qrad = Qrad; o.Qmarea = Qmarea; o.imK2 = imK2; o.k2re = k2re; o.qcmb = qcmb; o.Mfuso = Mfuso; o.fi = fi; o.colonna = colonna; o.Ric = Ric; o.dRic = o.dr * o.dTc / ANNO_S; // (m/s)
  o.vapore = vapore; o.convette = !fermoDelTutto; o.vInterno = vInterno;
  o.arr = arr; o.capM = capM; // (per flussiDelNucleo, qui sotto)
  return o;
}
// (PRESTAZIONI) LA STESSA COSA QUANDO È CAMBIATA SOLO LA TEMPERATURA DEL NUCLEO: «a» sono i flussi già calcolati con lo
// stesso mantello, lo stesso tempo e la stessa struttura (stessa T_m); con un'altra T_cmb cambiano solo il calore che passa
// dal nucleo al mantello e, per lui, le due derivate. È la colonna del jacobiano rispetto a T_cmb: tutto ciò che viene dal
// mantello (viscosità, coperchio, fuso, marea) è identico a quello di «a» e non si rifà. Riempie o.dTm e o.dTc (e o.r, o.dr),
// con le stesse operazioni di flussi() nello stesso ordine: gli stessi bit.
function flussiDelNucleo(st, a, Tcmb, o) {
  const S = STORIA; let Qcmb = 0, qcmb = 0;
  if (st.haNucleo) { const d = Tcmb - a.Tlm, nuGiu = S.saltoViscosita * a.arr,
     dl = Math.min(st.D, Math.cbrt((S.RaC * nuGiu * st.kappaGiu) / (S.alfa * st.gc * Math.max(1e-6, Math.abs(d))))); qcmb = (S.kGiu * d) / dl; Qcmb = st.Ac * qcmb; }
  o.dTm = ((a.Qrad + a.Qmarea + Qcmb - a.Qconv - a.Qfuso) / a.capM) * ANNO_S;
  nucleoInterno(st, Tcmb, o);
  const Ric = o.r, capC = st.Mc * S.cNucleo * st.ac + (S.latenteFerro + S.gravitazionale) * S.rhoNucleo * 4 * PI * Ric * Ric * -o.dr;
  o.dTc = st.haNucleo ? (-Qcmb / capC) * ANNO_S : 0;
  return o;
}
// la dinamo a uno stato (dai flussi già calcolati): galleggiamento, Reynolds magnetico, momento di dipolo
function dinamo(st, rami, Tcmb, f) {
  const S = STORIA; if (!st.haNucleo) return { F: 0, Fth: 0, Fchi: 0, qad: 0, Rem: 0, accesa: false, M: 0, guscio: 0 };
  const k = rami.conducibilitaNucleo * (Tcmb / S.Tconducibilita), qad = (k * S.alfaNucleo * st.gc * Tcmb) / S.cNucleo, Fth = (S.alfaNucleo * st.gc * (f.qcmb - qad)) / (S.rhoNucleo * S.cNucleo);
  const Fchi = f.Ric > 0 ? ((st.gc * f.Ric) / st.Rc) * (S.saltoLeggeri / S.rhoNucleo) * (f.Ric / st.Rc) ** 2 * Math.max(0, f.dRic) : 0, F = Fth + Fchi, guscio = st.Rc - f.Ric;
  const v = F > 0 && guscio > 0 ? Math.cbrt(F * guscio) : 0, Rem = MU0 * (k / (S.lorenz * Tcmb)) * v * guscio, accesa = F > 0 && guscio > 0 && Rem > S.reynoldsMagnetico;
  return { F, Fth, Fchi, qad, Rem, accesa, guscio, M: accesa ? 4 * PI * st.Rc ** 3 * rami.dipolo * Math.sqrt(S.rhoNucleo / (2 * MU0)) * Math.cbrt(F * guscio) : 0 };
}

// lo spessore (m) a cui la base della crosta di basalto arriva alla pressione dell'eclogite
const eclogite = (st) => Math.max(0, (STORIA.eclogite - st.Ptop) / (STORIA.rhoBasalto * st.g));
// ---------- l'integrazione: Rosenbrock a due stadi (ROS2, L-stabile: le equazioni sono rigide quando il mantello è in
// parte fuso), jacobiano per differenze, passo adattivo dall'errore tra il primo e il secondo ordine. Il passo non supera
// il 10% del tempo trascorso: la tabella ha così qualche centinaio di righe, fitte dove la storia cambia in fretta.
const COLONNE = ['t', 'Tm', 'Tcmb', 'Tum', 'Ts', 'Qconv', 'Qfuso', 'Qcmb', 'Qrad', 'Qmarea', 'Ric', 'dRic', 'mob', 'lid', 'delta', 'Mfuso', 'fi', 'F', 'Fth', 'Fchi', 'M', 'Rem', 'qad', 'qcmb', 'accesa', 'lnEta', 'lnCrit', 'Fv', 'crosta', 'imK2', 'k2re', 'vInterno', 'convette'];
const T_INIZIO = 1e5; // (anni) da dove parte l'integrazione: prima c'è la formazione (disco.js, impatti.js)
function integra(voce, finoA) {
  const { st, sv, rami, tab } = voce, piu = voce.piu || (voce.piu = piuDi(st)), b = {}, gR = 1 + Math.SQRT1_2, fine = voce.fine, tol = 1 / fine; // (K) l'errore ammesso per passo
  let a = {}, c = {}, qui = {}, poi = {};
  let { t, Tm, Tc, h, crosta } = voce.stato;
  const scrivi = (f) => { const d = dinamo(st, rami, Tc, f);
    tab.t.push(t); tab.Tm.push(Tm); tab.Tcmb.push(Tc); tab.Tum.push(f.Tum); tab.Ts.push(f.Ts); tab.Qconv.push(f.Qconv); tab.Qfuso.push(f.Qfuso); tab.Qcmb.push(f.Qcmb); tab.Qrad.push(f.Qrad); tab.Qmarea.push(f.Qmarea);
    tab.Ric.push(f.Ric); tab.dRic.push(f.dRic); tab.mob.push(f.mob); tab.lid.push(f.lid); tab.delta.push(f.delta); tab.Mfuso.push(f.Mfuso); tab.fi.push(f.fi); tab.F.push(d.F); tab.Fth.push(d.Fth); tab.Fchi.push(d.Fchi); tab.M.push(d.M); tab.Rem.push(d.Rem);
    tab.qad.push(d.qad); tab.qcmb.push(f.qcmb); tab.accesa.push(d.accesa ? 1 : 0); tab.lnEta.push(f.lnEta); tab.lnCrit.push(f.lnCrit); tab.Fv.push(f.Fv); tab.crosta.push(crosta); tab.imK2.push(f.imK2); tab.k2re.push(f.k2re); tab.vInterno.push(f.vInterno); tab.convette.push(f.convette ? 1 : 0); };
  ambiente(st, sv, t, qui); flussi(st, piu, qui, rami, Tm, Tc, a);
  if (!tab.t.length) scrivi(a);
  let passi = 0;
  while (t < finoA && passi++ < 20000) {
    const f1 = a.dTm, f2 = a.dTc, MfusoPrima = a.Mfuso, lidPrima = a.lid, mobPrima = a.mob; // («a»: i flussi allo stato di adesso, già calcolati)
    const e1 = Math.max(0.05, 1e-5 * Tm), e2 = Math.max(0.05, 1e-5 * Tc);
    flussi(st, piu, qui, rami, Tm + e1, Tc, b); const j11 = (b.dTm - f1) / e1, j21 = (b.dTc - f2) / e1;
    flussiDelNucleo(st, a, Tc + e2, b); const j12 = (b.dTm - f1) / e2, j22 = (b.dTc - f2) / e2;
    for (;;) {
      h = Math.min(h, Math.max(2e4, 0.1 * t) / fine, Math.max(1, finoA - t));
      // (I − γhJ)·k = rhs, due per due
      const m11 = 1 - gR * h * j11, m12 = -gR * h * j12, m21 = -gR * h * j21, m22 = 1 - gR * h * j22, det = m11 * m22 - m12 * m21;
      const k1a = (m22 * f1 - m12 * f2) / det, k1b = (m11 * f2 - m21 * f1) / det;
      ambiente(st, sv, t + h, poi); flussi(st, piu, poi, rami, Tm + h * k1a, Tc + h * k1b, c);
      const r1 = c.dTm - 2 * k1a, r2 = c.dTc - 2 * k1b, k2a = (m22 * r1 - m12 * r2) / det, k2b = (m11 * r2 - m21 * r1) / det;
      const err = Math.max(Math.abs(0.5 * h * (k1a + k2a)), Math.abs(0.5 * h * (k1b + k2b)));
      if (!(err <= tol) && h > 1) { h *= Math.max(0.2, 0.9 * Math.sqrt(tol / err)); continue; }
      const TmN = Tm + 1.5 * h * k1a + 0.5 * h * k2a, TcN = Tc + 1.5 * h * k1b + 0.5 * h * k2b;
      // (LA NASCITA DEL NUCLEO INTERNO è un evento: lì la capacità del nucleo salta, per il calore latente. Il passo che la
      // scavalca si accorcia finché arriva a un quarto di kelvin oltre: con la fusione di Katz il passo di lavoro la scavalcava
      // e il nucleo interno nasceva 0,3 Ga dopo quello dei passi fitti)
      // (e subito dopo, finché il raggio va come la radice della distanza dalla nascita, il passo non sposta T_cmb più di un
      // quarto di quella distanza: lo jacobiano per differenze lì non vede la radice, e T_cmb oscillava risalendo)
      if (st.nBuoni >= 2 && h > 1 && ((Tc > st.Gr[0] && TcN < st.Gr[0] - 0.25) || (Tc <= st.Gr[0] && Math.abs(TcN - Tc) > 0.25 * (st.Gr[0] - Tc) + 0.25))) { h *= Tc > st.Gr[0] ? Math.max(0.1, (Tc - st.Gr[0] + 0.25) / (Tc - TcN)) : 0.5; continue; }
      // la crosta di basalto (m): quella di una colonna che fonde fino in superficie con le placche; sotto un coperchio
      // fermo si accumula con le eruzioni e le intrusioni, e non supera il coperchio (ciò che lo supera sprofonda: Foley 2019)
      const colonnaM = (a.fi * a.colonna) / (STORIA.rhoSu * st.g), accumulo = crosta + ((MfusoPrima * ANNO_S * h) / (STORIA.rhoSu * st.A)) * (1 - mobPrima);
      crosta = mobPrima > 0.5 ? colonnaM : Math.min(lidPrima, eclogite(st), Math.max(accumulo, 0));
      t += h; Tm = Math.max(50, TmN); Tc = Math.max(50, TcN);
      h *= err > 0 ? Math.min(3, Math.max(0.3, 0.9 * Math.sqrt(tol / err))) : 3;
      break;
    }
    { const x = qui; qui = poi; poi = x; } flussi(st, piu, qui, rami, Tm, Tc, a); scrivi(a);
  }
  voce.stato = { t, Tm, Tc, h, crosta }; voce.eventi = null;
}

// ---------- la memoria: una storia per pianeta (e per ramo dei parametri aperti)
const memoStorie = new WeakMap();
const ramiDi = (r = null) => { const o = {}; for (const k in APERTI) o[k] = r && Number.isFinite(r[k]) ? r[k] : APERTI[k].valore;
  // (la reologia della marea: Andrade con α e ζ aperti; { maxwell: 1 } per il confronto)
  Object.defineProperty(o, 'reologia', { enumerable: false, value: Object.freeze({ reologia: r?.maxwell ? 'maxwell' : 'andrade', alfa: o.andradeAlfa, zeta: o.andradeZeta }) }); if (r?.maxwell) o.maxwell = 1; return o; };
function voceDi(P, opz = {}) {
  const stella = opz.stella || null, rami = ramiDi(opz.rami), comp = P.composizione || {};
  const massaStella = stella?.massaNascita || stella?.massa || (P.Mstella > 0 ? P.Mstella / MSOLE : 1), Z = stella?.Z ?? 1;
  const firma = [P.tipo, P.massaKg, P.raggioM, comp.ferro, comp.acqua, comp.ghiaccio, P.Lw, P.aM, P.Mstella, P.eccentricita, P.marea ? `${P.marea.Mospite},${P.marea.aM},${P.marea.eccentricita},${P.marea.obliquita}` : '', stella ? `${massaStella}|${Z}|${stella.stato ?? ''}|${stella.massa ?? ''}` : '', Object.values(rami).join(','), opz.Tsuperficie ? `Ts${typeof opz.Tsuperficie === 'function' ? '' : opz.Tsuperficie}` : '', opz.fine > 1 ? opz.fine : ''].join('|');
  let lista = memoStorie.get(P); if (!lista) { lista = []; memoStorie.set(P, lista); }
  // (chi chiede senza dire la stella trova la storia che il pianeta ha già: quella calcolata con la sua stella)
  let voce = lista.find((v) => v.firma === firma) || (!stella && !opz.rami && !opz.Tsuperficie && !(opz.fine > 1) ? lista.find((v) => v.principale) : null);
  if (voce) return voce;
  const st = struttura(P, stella, rami);
  // la stella: la luce nel tempo dalla sua massa e dai suoi metalli; se il pianeta porta la luce di oggi (P.Lw) è quella che fa fede
  let sv = { stella: null, Tsuperficie: typeof opz.Tsuperficie === 'function' ? opz.Tsuperficie : Number.isFinite(opz.Tsuperficie) ? () => opz.Tsuperficie : null };
  if (P.aM > 0 && (P.Lw > 0 || stella || P.Mstella > 0)) {
    const luce = luceNelTempo(massaStella, Z), eta = stella?.eta ?? 4.5e9, viva = !stella?.stato || stella.stato === 'in vita' || stella.stato === 'gigante rossa';
    const scala = viva && P.Lw > 0 ? P.Lw / (luce.L(Math.min(eta, luce.vita)) * LSOLE) : 1; // (di norma 1: è la stessa stella(); diversa solo se chi chiama dà un'altra luce)
    const fine = viva ? null : stella.morta != null ? Math.max(0, eta - stella.morta) : Math.min(eta, luce.vita);
    sv.stella = { luce, scala, aM: P.aM, fine, LwOggi: P.Lw ?? 0, stretta: !viva && stella.massaNascita > 0 && stella.massa > 0 ? stella.massa / stella.massaNascita : 1,
      Lsaturo: (STORIA.ribas.F * Math.pow(STORIA.ribas.saturo / 1e9, STORIA.ribas.esponente) * 4 * PI * UA * UA) / (luceNelTempo(1, 1).L(STORIA.ribas.saturo) * LSOLE) * luce.L(Math.min(STORIA.ribas.saturo, luce.vita)) * LSOLE * scala };
  }
  voce = { firma, principale: !!stella && !opz.rami && !opz.Tsuperficie && !(opz.fine > 1), fine: opz.fine > 1 ? opz.fine : 1, st, sv, rami, tab: Object.fromEntries(COLONNE.map((n) => [n, []])), stato: { t: T_INIZIO, Tm: st.TumZero / st.eSu, Tc: st.TcmbZero, h: 1e3, crosta: 0 }, eventi: null, eta: stella?.eta ?? null };
  lista.push(voce); if (lista.length > 8) lista.shift();
  return voce;
}

// la costante del numero di Rossby: il galleggiamento e il guscio della Terra di riferimento, oggi (calcolati una volta per ramo)
const memoTerra = new Map();
function terraDiOggi(rami) {
  const chiave = Object.values(rami).join(','); let v = memoTerra.get(chiave); if (v) return v;
  v = { F: 1e-12, guscio: 2.26e6, giorno: TERRA_RIF.giorno }; memoTerra.set(chiave, v); // (provvisorio: la Terra stessa chiede di sé)
  const s = storia({ ...TERRA_RIF }, 4.5e9, { stella: { eta: 4.5e9, Z: 1, massa: 1 }, rami });
  if (s.dinamo.F > 0) { v.F = s.dinamo.F; v.guscio = s.dinamo.guscio; }
  return v;
}

// ---------- LA DOMANDA: lo stato del pianeta a t anni dalla sua nascita
// P: il pianeta (tipo, massaKg, raggioM, composizione; e se ci sono: Lw, aM, Mstella, eccentricita, giorno);
// opz.stella: { eta, Z, massa, massaNascita, stato, morta } (quella di cosmo.js; serve la prima volta), opz.rami: i
// parametri aperti da cambiare ({ conducibilitaNucleo: 40 }), opz.Tsuperficie: la temperatura di superficie (K, o una
// funzione di t) quando il clima sarà collegato; opz.fine: quante volte più fitto integrare (per le prove di convergenza).
// → { t, Tm, Tcmb, Tum, Ts, q (W/m² in superficie), Q: { conv, fuso, cmb, rad, marea } (W), urey,
//     nucleoInterno: { raggio (m), cresce (m/s) }, dinamo: { accesa, F, Fth, Fchi, qad, qcmb, Rem, momento (A·m²), rossby, dipolo, B0 (T) },
//     crosta: { regime, mobilita (0…1), lnContrasto, lnCritico, coperchio (m), basalto (m) }, fuso: { kgAnno, frazione, vulcani },
//     degassamento: { CO2 (mol/anno) }, fuga: { kgAnno, kgTotali } | null (il tetto energetico),
//     stella: { L (W), flusso, XUV (W/m²), XUVsuL, saturo } | null, eventi: { nucleoInterno, fineDinamo, … } (anni), interno: {…} }
export function storia(P, t = null, opz = {}) {
  if (P.tipo === 'gassoso') return { t, gassoso: true, interno: internoGassoso(P) };
  const voce = voceDi(P, opz), eta = t ?? opz.stella?.eta ?? voce.eta ?? 4.5e9, quando = Math.max(T_INIZIO, eta);
  if (voce.stato.t < quando) integra(voce, quando);
  return statoA(P, voce, quando, opz);
}
// la tabella intera (le colonne sono vettori paralleli; «t» in anni): per chi vuole disegnare o integrare lungo la storia
export function tabellaStoria(P, opz = {}) { const voce = voceDi(P, opz), eta = opz.finoA ?? opz.stella?.eta ?? voce.eta ?? 4.5e9; if (voce.stato.t < eta) integra(voce, eta); return { ...voce.tab, struttura: voce.st, rami: voce.rami }; }

function statoA(P, voce, t, opz) {
  const { tab, st, rami } = voce, n = tab.t.length; let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tab.t[m] <= t) lo = m; else hi = m; }
  const u = n > 1 && tab.t[hi] > tab.t[lo] ? Math.min(1, Math.max(0, (t - tab.t[lo]) / (tab.t[hi] - tab.t[lo]))) : 0, v = (nome) => tab[nome][lo] + u * (tab[nome][hi] - tab[nome][lo]), vicino = u < 0.5 ? lo : hi;
  const Qconv = v('Qconv'), Qfuso = v('Qfuso'), Qrad = caloreDellaRoccia(t) * st.Mrad /* (esatto a t, non interpolato) */, q = (Qconv + Qfuso) / (4 * PI * st.R * st.R), mob = v('mob'), Mfuso = v('Mfuso'), accesa = tab.accesa[vicino] === 1, F = accesa ? Math.max(0, v('F')) : 0, Ric = v('Ric'), guscio = st.Rc - Ric;
  const M = accesa ? v('M') : 0;
  // la rotazione: il numero di Rossby locale, con la costante fissata sulla Terra di oggi
  let rossby = null, dipolo = true;
  if (accesa && P.giorno > 0) { const T = terraDiOggi(rami); rossby = STORIA.rossby.terra * Math.sqrt(F / T.F) * Math.pow(P.giorno / T.giorno, 7 / 6) * Math.pow(guscio / T.guscio, -1 / 3); dipolo = !(rossby > STORIA.rossby.soglia); }
  const B0 = accesa ? Math.max(STORIA.campoSenzaDinamo, ((MU0 * M) / (4 * PI * st.R ** 3)) * (dipolo ? 1 : STORIA.rossby.senzaDipolo)) : STORIA.campoSenzaDinamo;
  const aPlacche = mob > 0.5, fonde = Mfuso > 0, vulcani = fonde ? Math.max(1, Math.round(q / STORIA.vulcaniPerFlusso)) : 0, basalto = v('crosta');
  const regime = aPlacche ? 'a placche' : fonde ? 'coperchio unico, con vulcani' : 'ferma';
  if (!voce.eventi) voce.eventi = eventiDi(voce);
  const sole = voce.sv.stella ? stellaA(voce.sv.stella, t) : null;
  const interno = { eta: t, nucleo: st.nucleo, crosta: basalto / st.R, q, dinamo: accesa, B0, tettonica: regime, vulcani, ...(rossby != null ? { rossby, dipolo } : {}) };
  return { t, Tm: v('Tm'), Tcmb: v('Tcmb'), Tum: v('Tum'), Ts: v('Ts'), q, Q: { conv: Qconv, fuso: Qfuso, cmb: v('Qcmb'), rad: Qrad, marea: v('Qmarea') }, marea: { potenza: v('Qmarea'), imK2: v('imK2'), k2: v('k2re'), Q: v('imK2') > 0 ? v('k2re') / v('imK2') : Infinity, frequenza: st.omegaMarea, fusoSottoIlCoperchio: v('Fv') }, urey: Qrad / Math.max(1, Qconv + Qfuso),
    nucleoInterno: { raggio: Ric, cresce: v('dRic') }, dinamo: { accesa, F, Fth: v('Fth'), Fchi: v('Fchi'), qad: v('qad'), qcmb: v('qcmb'), Rem: v('Rem'), guscio, momento: M, rossby, dipolo: accesa && dipolo, B0 },
    crosta: { regime, mobilita: mob, lnContrasto: v('lnEta'), lnCritico: v('lnCrit'), coperchio: v('lid'), basalto }, fuso: { kgAnno: Mfuso * ANNO_S, frazione: v('fi'), vulcani },
    // STADIO 4 (in parte): la CO2 che esce con il fuso (mol/anno) e il tetto energetico della fuga dell'aria
    degassamento: { CO2: fonde ? ((Mfuso * ANNO_S) / Math.max(1e-6, v('fi'))) * ROCCE.rimasto.C : 0 }, fuga: fugaA(voce, t),
    stella: sole, eventi: voce.eventi, rami, interno };
}
// il tetto energetico della fuga: quanta aria l'ultravioletto estremo può sollevare (kg/anno adesso, kg dalla nascita a t)
function fugaA(voce, t) {
  const st = voce.sv.stella; if (!st) return null;
  if (!voce.fuga) { // l'integrale, una volta: 96 punti in logaritmo dalla nascita a 20 miliardi di anni
    const N = 96, lt0 = Math.log(T_INIZIO), lt1 = Math.log(2e10), tt = new Float64Array(N), kg = new Float64Array(N), k = (STORIA.efficienzaFuga * PI * voce.st.R ** 3) / (G * voce.st.M) * ANNO_S; let prima = 0;
    for (let i = 0; i < N; i++) { tt[i] = Math.exp(lt0 + ((lt1 - lt0) * i) / (N - 1)); const r = k * stellaA(st, tt[i]).XUV; kg[i] = i ? kg[i - 1] + 0.5 * (r + prima) * (tt[i] - tt[i - 1]) : r * tt[0]; prima = r; }
    voce.fuga = { tt, kg, k };
  }
  const { tt, kg, k } = voce.fuga; let i = 0; while (i < tt.length - 2 && tt[i + 1] < t) i++;
  const u = Math.min(1, Math.max(0, (t - tt[i]) / (tt[i + 1] - tt[i])));
  return { kgAnno: k * stellaA(st, t).XUV, kgTotali: kg[i] + u * (kg[i + 1] - kg[i]) };
}
// IL CLIMA E L'ARIA A UN TEMPO t (stadio 4, esposto e non collegato): chimica.js climaEAria con la luce, il calore e il
// regime della crosta che la storia dà a quel tempo; il resto (acqua, asse, giorno, composizione) è quello del pianeta.
// Non tocca P.clima. → { clima, atmosfera, t, luce (in unità di oggi), calore, placche }
export function climaNelTempo(P, t, opz = {}) {
  const s = storia(P, t, opz), oggi = storia(P, opz.stella?.eta ?? null, opz); if (!s.stella) throw new Error('storia: per il clima nel tempo servono la luce e la distanza della stella (P.Lw, P.aM)');
  const acqua = acquaInSuperficie(P), placche = s.crosta.regime === 'a placche';
  const r = climaEAria({ Lw: s.stella.L, aM: s.stella.aM, massaKg: P.massaKg, raggioM: P.raggioM, tipo: P.tipo, acqua: acqua.frazione, acquaKg: acqua.kg, anno: P.anno ?? 2 * PI * Math.sqrt(P.aM ** 3 / (G * (P.Mstella || MSOLE))), obliquita: P.obliquita ?? 0, bloccato: !!P.bloccato,
    placche, composizione: P.composizione, involucro: P.involucro || 0, calore: s.fuso.vulcani > 0 ? s.q : 0, ...(opz.gas ? { gas: opz.gas } : {}), ...(opz.inerti ? { inerti: opz.inerti } : {}) }, { Z: opz.stella?.Z ?? 1 });
  return { clima: r.clima, atmosfera: r.atmosfera, t, luce: oggi.stella ? s.stella.L / oggi.stella.L : 1, calore: s.q, placche };
}
// i momenti della storia (anni dalla nascita; null se non è successo entro il tempo calcolato): quando nasce il nucleo
// interno, quando la dinamo si accende e si spegne l'ultima volta, quando la crosta cambia regime
function eventiDi(voce) {
  const { tab } = voce, n = tab.t.length, e = { nucleoInterno: null, dinamoAccesa: null, fineDinamo: null, placche: [], fino: tab.t[n - 1] };
  for (let k = 1; k < n; k++) {
    if (e.nucleoInterno == null && tab.Ric[k] > 0) e.nucleoInterno = tab.t[k];
    if (tab.accesa[k] && !tab.accesa[k - 1]) { if (e.dinamoAccesa == null) e.dinamoAccesa = tab.t[k]; e.fineDinamo = null; }
    if (!tab.accesa[k] && tab.accesa[k - 1]) e.fineDinamo = tab.t[k];
    if ((tab.mob[k] > 0.5) !== (tab.mob[k - 1] > 0.5)) e.placche.push({ t: tab.t[k], a: tab.mob[k] > 0.5 ? 'a placche' : 'coperchio' });
  }
  if (tab.accesa[0] && e.dinamoAccesa == null) e.dinamoAccesa = tab.t[0];
  return e;
}
// i giganti di gas: la dinamo è nell'idrogeno metallico e cresce con la massa (Giove ~ 4·10⁻⁴ T). È la legge che
// interno() aveva: la storia termica di un gigante non è ancora scritta
function internoGassoso(P) {
  return { nucleo: 0.1, mantello: 'idrogeno metallico', crosta: 0, q: 5, dinamo: true, B0: 4.2e-4 * Math.pow(P.massaKg / 1.9e27, 0.6), tettonica: 'nessuna (è un gas)', vulcani: 0 };
}
// «interno» nella forma di sempre: lo stato di oggi (l'età della stella) letto dalla storia
export const internoDaStoria = (P, stella) => storia(P, stella?.eta ?? 4.5e9, { stella: stella || { eta: 4.5e9, Z: 1 } }).interno;
