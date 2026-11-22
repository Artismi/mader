// disco.js — i pianeti che nascono dal disco attorno alla stella giovane.
//
// Una stella appena nata è circondata da un disco di gas e polvere, fatto della
// sua stessa materia. Qui non si sceglie «quanti pianeti e di che tipo»: si
// mette il disco, e si lascia che la sua storia faccia i pianeti.
//   1 IL DISCO: tanto gas vicino, sempre meno lontano; la polvere è la parte
//     pesante del gas (Z); oltre la LINEA DELLA NEVE anche il ghiaccio è solido.
//   2 GLI EMBRIONI: ogni corpo mangia la striscia di disco che la sua gravità
//     domina (qualche raggio di Hill) e lì si ferma: la massa di isolamento.
//   3 IL GAS: un nucleo abbastanza grosso tira a sé il gas a valanga e diventa
//     un gigante, ma solo se fa in tempo prima che il disco svanisca.
//   4 GLI URTI GIGANTI: sparito il gas, gli embrioni troppo vicini si disturbano,
//     le orbite si incrociano, e si fondono (o, accanto a un gigante, sono
//     scacciati) finché quelli che restano sono abbastanza distanti.
//   5 RAGGIO e COMPOSIZIONE: da quanta massa e di che materia è fatto ciascuno.
// Ciò che EMERGE: quanti pianeti, dove, quanto grandi, di che tipo, perché i
// giganti amano le stelle ricche di metalli e disertano le stelle piccole.
// Le LEGGI EMPIRICHE (misurate, o ricavate da simulazioni che qui non si
// possono rifare) sono dichiarate una per una dove si usano, con «LEGGE EMPIRICA».
// LA MATERIA (la catena degli elementi, elementi.js): i solidi sono gli elementi del gas di QUELLA stella che a quella
// temperatura condensano (Lodders 2003: ogni elemento alla sua temperatura del 50%), con la temperatura che il disco ha lì
// QUANDO i planetesimi nascono (il disco viscoso che si raffredda, scaldato dal suo gas e dalla stella giovane: Cassen 1996);
// oltre la neve anche i ghiacci. Ogni pianeta sa di quali embrioni
// è fatto, e quindi di quale roccia; poi si separa (elementi.js differenzia): il suo «ferro» è il nucleo che ne esce.
// (Prima: i solidi erano Z × 0,0119 × una parte fissa, e il ferro della polvere cresceva come T², una regola semplice.)
// Che cosa manca: la migrazione delle orbite nel disco (niente «Giovi caldi»),
// le risonanze, i sistemi con due stelle.

import { COSTANTI, MSOLE, ANNO, UA, PARTE_FUORI, MTERRA, RTERRA, MGIOVE, RGIOVE } from './leggi.js';
import { stella as stellaVera, luceGiovane } from './stelle.js';
import { comeSorgente } from './eventi.js';
import { PROTOSOLARE, miscelaSolare, tabellaSolidi, vettore, differenzia, SIMBOLI, D_MASSA, perditeAccrescimento, fusoDaAlluminio, FA_NEBULOSA, ELEMENTI } from './elementi.js';
const MASSA_MG = ELEMENTI.Mg.massa, MASSA_FE = ELEMENTI.Fe.massa, MASSA_O = ELEMENTI.O.massa; // la catena degli elementi
import { STORIA } from './storia.js'; // (la densità del nucleo: la stessa struttura a due strati della storia termica)
import { modiSecolari, tempoIncrocio, blocchiSecolari } from './secolare.js'; // (gli urti giganti: Laplace–Lagrange e il tempo di incrocio di Petit)

export { MTERRA, RTERRA, MGIOVE, RGIOVE }; // (i corpi di riferimento: in leggi.js, un posto solo)
const G = COSTANTI.G, IDX = Object.fromEntries(SIMBOLI.map((s, i) => [s, i]));
const tipoDi = (gas, ghiaccio) => (gas > 0.5 ? 'gassoso' : ghiaccio > 0.2 ? 'ghiacciato' : 'roccioso'); // (i tre tipi: una soglia di comodo dichiarata in grandezze.js)

// ---------- i parametri del modello (pochi, e tutti qui)
// DI CHE COSA È FATTO IL DISCO: la miscela del gas da cui è nata la stella (elementi.js: dalla storia della sua galassia, o
// per chi non la sa la miscela protosolare scalata a Z). I numeri qui sotto sono quelli della miscela protosolare, per chi
// vuole un riferimento (impatti.js, le prove): il disco vero di una stella li calcola dalla sua miscela, temperatura per
// temperatura (elementi.js tabellaSolidi: ogni elemento condensa alla sua temperatura del 50%, Lodders 2003)
const SOLARE = tabellaSolidi(PROTOSOLARE), ZS = 1 - PROTOSOLARE.H - PROTOSOLARE.He;
export const DISCO = Object.freeze({
  metalliSole: ZS, // la frazione di materia pesante della miscela protosolare (Z☉ di stelle.js: 0,0142)
  roccia: SOLARE.rocciaFredda / ZS, // la parte dei metalli che è solida al freddo dentro la neve (roccia, ferro, zolfo e il loro ossigeno): 0,35
  solidiFreddi: (SOLARE.rocciaFredda + SOLARE.ghiaccio) / ZS, // oltre la neve si aggiungono i ghiacci (l'acqua, e il carbonio e l'azoto gelati con lei): 0,84 dei metalli
  ghiaccio: SOLARE.ghiaccio / (SOLARE.ghiaccio + SOLARE.rocciaFredda), // la parte di ghiacci nei solidi oltre la neve: 0,58
  ferro: PROTOSOLARE.Fe / SOLARE.rocciaFredda, // il ferro (come elemento) sulla roccia fredda: 0,28
  idrogeno: PROTOSOLARE.H / (PROTOSOLARE.H + PROTOSOLARE.He), // il gas: idrogeno ed elio, 73 a 27
  // Σ ∝ r^(−3/2): la nebulosa solare di massa minima (Weidenschilling 1977, Ap&SS 51, 153; Hayashi 1981, PThPS 70, 35); i
  // dischi misurati in millimetrico danno pendenze più dolci, γ ≈ 0,9 (Andrews et al. 2009, ApJ 700, 1502): l'alternativa, non usata
  pendenza: 1.5, raggio: 30, // fino a 30 UA·√M
  // LA MASSA DEL DISCO ALLA NASCITA: mediana (per una stella come il Sole) e larghezza in logaritmo naturale, e come cresce con
  // la stella. Dai dischi più giovani, di Classe 0, quando i solidi non si sono ancora convertiti: Tychoniec et al. 2020 (A&A 640,
  // A19), Perseo, masse della polvere a 9 mm della loro tabella A.2 [V: letta]: mediana 158 M⊕, e tra il 16° e l'84° percentile
  // (23 e 484 M⊕, con i 9 limiti superiori in fondo) ±0,66 dex, cioè 1,52 in logaritmo naturale. La mediana di 0,055 dà 153 M⊕ di
  // solidi per il Sole (la si tiene: è già quella). LA STELLA: Pascucci et al. 2016 (ApJ 831, 125 [V: l'estratto]), nelle regioni
  // più giovani (Taurus, Lupus, Camaleonte I, 1–3 milioni di anni: la stessa relazione) M_polvere ∝ M*^(1,3…1,9), i due estremi
  // per la temperatura della polvere; qui il mezzo, 1,6, cioè la frazione ∝ M*^0,6 (dichiarato: è misurata su dischi di Classe II,
  // e la si porta alla nascita). (Prima: 0,5 di larghezza, cioè ±0,22 dex, e la frazione uguale per ogni stella.)
  frazione: 0.055, sparpaglio: 1.52, pendenzaStella: 0.6,
  // il limite d'instabilità gravitazionale: un disco più pesante di così su quello della stella si fa spirali che portano la
  // massa in più sulla stella in pochi giri, finché torna al limite (Kratter e Lodato 2016, ARA&A 54, 271 [R]); che una parte
  // si frammenti in compagni non è modellato (dichiarato)
  instabile: 0.12,
  vitaMinima: 1e6, vitaMedia: 3.5e6, // quanto dura il gas (anni): si osserva che metà dei dischi è sparita in 2–3 milioni di anni
  // mezza larghezza della striscia che un embrione mangia, in raggi di Hill RECIPROCI di due embrioni uguali, a(2m/3M*)^⅓: in
  // tutto 10, la distanza tra embrioni della crescita oligarchica (Kokubo e Ida 1998, 2000 [R]; è la b_H = 10 delle condizioni
  // iniziali di Kimura et al. 2025 e la loro massa di isolamento, eq. 30 [V]: 0,16 M⊕ con Σ = 10 g/cm² a 1 UA, che la formula
  // qui sotto ridà). (Prima: 10 raggi di Hill del corpo SOLO, cioè 7,9 reciproci: le orbite nascevano troppo vicine.)
  C: 5,
  mescola: 0.25, // la velocità a caso che gli incontri danno agli embrioni, come frazione della loro velocità di fuga
  eMax: 0.3, pari: 0.1, // l'eccentricità più grande che un corpo regge senza perdersi; sopra un decimo della massa dell'altro, due corpi sono «pari»
  presa: 0.05, // la parte del gas rimasto che un gigante riesce a intercettare
  minimo: 0.02, // sotto questa massa (in Terre) non lo chiamiamo pianeta: resta tra i detriti
  senzaGas: 300, // sparito il gas i sassi non sono più frenati: gli embrioni li catturano centinaia di volte più lentamente
  // il disco viscoso (LA STORIA DEL DISCO, in disco()): α di Shakura e Sunyaev e raggio di scala del disco, quelli con cui
  // Hartmann et al. 1998 (ApJ 495, 385) riproducono l'afflusso misurato delle T Tauri [R]; opacità dei grani (Bell e Lin 1994)
  alfa: 0.01, raggioViscoso: 10, kappaGrani: 0.01, // (UA·√M; κ = 0,01·√T m²/kg, cioè 0,1·T^½ cm²/g, con i metalli del Sole)
});

const limita = (x, a, b) => Math.max(a, Math.min(b, x));
// GLI ESITI DEGLI URTI tra corpi tenuti insieme dalla gravità (Leinhardt e Stewart 2012, ApJ 745, 79 [V]): Q*_RD = c*·(4/5)·π·ρ₁·G·R_C1²,
// corretto per il rapporto delle masse con l'esponente μ̄; c* = 1,9 per i corpi senza resistenza; i frammenti N(>D) ∝ D^-β, due i più
// grossi. Qui e in impatti.js (una fonte sola).
export const URTI = Object.freeze({ cStar: 1.9, rho1: 1000, mu: 0.36, beta: 2.85, secondi: 2 });
// IL CASO. Ogni esito incerto è un evento con il suo indirizzo, sotto quello del disco (eventi.js): «massa», «vita del
// gas», «bordo interno», «acqua portata da fuori», e per gli embrioni (numerati dal più interno, come nascono)
// «embrione 12/incontro con 13» (si fondono o uno scaccia l'altro), «embrione 12/fusione con 13» (l'orbita allungata
// che resta), «embrione 12/eccentricità» (quanta ne resta oggi). L'ordine in cui si calcola non conta, e in un mondo
// parallelo dove UNO di questi eventi è andato diversamente tutti gli altri restano com'erano: cambia solo ciò che
// ne discende. «seme» è la sorgente del disco (in cosmo.js: «cosmo 1/galassia 3/stella 53/disco», con i rami del
// cosmo); un numero vale come «disco numero».

// ---------- 1. il disco
// Restituisce il disco di una stella { massa, Z, eta }: distanze in UA, densità in kg/m², tempi in anni.
// la luce del Sole al tempo del suo disco (in unità di quella di oggi): dalla stessa fonte, a metà della vita mediana del gas
let soleGiovane = 0;
const luceDelSoleGiovane = () => (soleGiovane ||= luceGiovane(1, { Z: 1, eta: 0.5 * DISCO.vitaMedia }).L);
export function disco(st, seme = 1) {
  const c = comeSorgente(seme, 'disco'), M = Math.max(0.01, st.massa ?? 1), Z = Math.max(0, st.Z ?? 1);
  // LEGGE EMPIRICA: il gas dura pochi milioni di anni (poi la luce della stella lo soffia via), meno attorno alle stelle grandi
  const vita = Math.min(1.2e7, DISCO.vitaMinima - (DISCO.vitaMedia - DISCO.vitaMinima) * Math.log(1 - 0.98 * c('vita del gas'))) / Math.sqrt(M);
  // LA LUCE DELLA STELLA AL TEMPO DEL DISCO. È la stessa stella che scalda i pianeti oggi (stelle.js), letta a un altro
  // tempo e CON LA CONTRAZIONE PRIMA DELLA SEQUENZA PRINCIPALE (stelle.js luceGiovane: la traccia di Hayashi, la stessa
  // fisica delle nane brune): a un milione di anni il Sole dà ~2 volte la sua luce di età zero, una nana rossa di 0,3 M☉ ~25
  // volte, una di 0,1 M☉ ~80 (Baraffe et al. 2015 per confronto [R]). Il tempo è metà della vita del gas (o dell'età della
  // stella, se è più giovane del suo disco). «L» è in unità della luce che il SOLE aveva al tempo del suo disco
  // (luceDelSoleGiovane): la taratura del disco è una sola, la linea della neve del Sistema Solare a 2,7 UA (da lì 280 K a
  // 1 UA e la polvere che evapora a 0,034 UA: la stessa legge T ∝ L^¼/√r), e le altre stelle la scalano con la loro luce di
  // ALLORA rispetto a quella del Sole di allora. «Lstella» è la stessa luce in unità del Sole di oggi. (Prima la luce era
  // quella dell'età zero della sequenza principale: le nane rosse giovani erano 10–30 volte troppo deboli e le loro linee
  // della neve 3–5 volte troppo vicine.)
  const tDisco = 0.5 * Math.min(vita, st.eta > 0 ? st.eta : vita), Lsole0 = luceDelSoleGiovane(), Lstella = luceGiovane(M, { Z, eta: tDisco }).L, L = Lstella / Lsole0;
  // la linea della neve: dove la luce della stella lascia il disco sotto i 170 K e il ghiaccio non evapora più
  const neve = 2.7 * Math.sqrt(L);
  // LEGGE EMPIRICA: i dischi osservati arrivano a qualche decina di UA, più larghi attorno alle stelle più grandi
  const rOut = DISCO.raggio * Math.sqrt(M);
  // LEGGE EMPIRICA: la massa del disco è qualche centesimo di quella della stella, e varia molto da una stella all'altra
  const m = c.serie('massa'), gauss = (m(0) + m(1) + m(2) + m(3) - 2) * Math.sqrt(3);
  const frazione = Math.min(DISCO.instabile, DISCO.frazione * Math.pow(M, DISCO.pendenzaStella) * Math.exp(DISCO.sparpaglio * gauss)), massaKg = frazione * M * MSOLE;
  // Σ(r) = Σ₀·r^(-3/2): Σ₀ (a 1 UA) è quella che, sommata fino al bordo esterno, dà la massa del disco
  const sigma0 = massaKg / (4 * Math.PI * UA * UA * Math.sqrt(rOut));
  const sigmaGas = (r) => sigma0 * Math.pow(r, -DISCO.pendenza);
  // LA STORIA DEL DISCO. Il disco è viscoso e si svuota sulla stella: l'afflusso cala nel tempo come nella soluzione di
  // Lynden-Bell e Pringle (1974) con ν ∝ r, Ṁ(t) = Ṁ₀·(1 + t/t_s)^−3/2 (Hartmann et al. 1998 [R]: è la legge che segue
  // l'afflusso misurato delle stelle giovani, ~10⁻⁸ M☉/anno a un milione di anni). ν = α·c_s²/Ω (Shakura e Sunyaev 1973), e
  // con la temperatura della luce T ∝ r^−½ è proprio ν ∝ r; t_s = R₁²/(3ν(R₁)) è il tempo viscoso al raggio di scala R₁, e
  // Ṁ₀ = massa/(2·t_s) perché tutto il disco cada sulla stella (∫Ṁ dt = massa: la massa del disco di qui sopra è quella della
  // nascita). Per il Sole t_s ≈ 5·10⁴ anni, Ṁ₀ ≈ 6·10⁻⁷ e 6·10⁻⁹ M☉/anno a un milione di anni.
  // LA TEMPERATURA A METÀ DEL DISCO, a ogni tempo: T⁴ = T_visc⁴ + T_luce⁴. Il calore viscoso esce a fatica attraverso la
  // polvere: T_visc⁴ = 9·κ·Σ·G·M·Ṁ/(128·π·σ·r³) (la legge di prima), con la colonna del disco viscoso Σ = Ṁ/(3πν) e l'opacità
  // dei grani di metallo e silicato κ = 0,01·√T m²/kg × Z (Bell e Lin 1994 [R], tra il ghiaccio che evapora e i grani che
  // evaporano, ~170–1400 K: oltre, il termostato dei grani che evaporano manca, dichiarato); la luce è quella della stella di
  // quel tempo (luceGiovane), 280 K·L(t)^¼/√r. Il disco giovane a 1 UA supera così i 1300 K, e si raffredda in un milione di anni.
  const GM = G * M * MSOLE, MUH = 2.34 * COSTANTI.mp, om = (r) => Math.sqrt(GM / (r * UA) ** 3);
  const Lt = (t) => luceGiovane(M, { Z, eta: Math.max(t, 1) }).L / Lsole0, Tluce = (r, Lx) => (280 * Math.pow(Lx, 0.25)) / Math.sqrt(r);
  const R1 = DISCO.raggioViscoso * Math.sqrt(M), ts = ((R1 * UA) ** 2 * om(R1) * MUH) / (3 * DISCO.alfa * COSTANTI.kB * Tluce(R1, L)) / ANNO;
  const Mdot0 = massaKg / (2 * ts * ANNO), Mdot = (t) => Mdot0 * Math.pow(1 + t / ts, -1.5);
  const B1 = (9 * DISCO.kappaGrani * Z * GM * MUH) / (384 * Math.PI * Math.PI * DISCO.alfa * COSTANTI.kB * COSTANTI.sigma);
  // (T⁴ = b·T^−½ + T_luce⁴: con y = √T è y⁹ − T_luce⁴·y − b = 0, che Newton risolve in pochi passi partendo da sopra)
  const radiceT = (b, ti4, y) => { if (!(y > 0)) y = Math.max(Math.pow(ti4, 0.125), Math.pow(b, 1 / 9)) * 1.01;
    for (let k = 0; k < 30; k++) { const y8 = (y * y) ** 4, d = (y8 * y - ti4 * y - b) / (9 * y8 - ti4); y -= d; if (Math.abs(d) < 1e-7 * y) break; } return y * y; };
  const Tmezzo = (r, Md, Lx) => radiceT((B1 * om(r) * Md * Md) / (r * UA) ** 3, Tluce(r, Lx) ** 4);
  // il bordo interno dei solidi: dove il disco giovane supera i 1500 K la polvere evapora, e non c'è di che fare pianeti. Resta
  // la legge di prima, con la colonna di gas di qui sopra e l'afflusso medio della vita del gas (il disco viscoso ne fa cadere
  // sulla stella massa·(1 − 1/√(1 + vita/t_s)) in una vita; prima era massa / vita) e l'opacità κ ≈ 0,1 m²/kg × Z:
  //   T⁴ = 9·κ·Σ·G·M·Ṁ / (128·π·σ·r³)   →   con Σ ∝ r^(-3/2), T ∝ r^(-9/8)
  // (dichiarato: è un bordo medio; la storia termica qui sopra dice di che cosa sono fatti i solidi dal bordo in fuori, non
  // sposta il bordo). Più dentro di così restano solo il limite della luce della stella e quello del suo campo magnetico.
  const xFine = 1 + vita / ts, MdotMedio = (massaKg * (1 - 1 / Math.sqrt(xFine))) / (vita * ANNO);
  const T4 = (9 * 0.1 * Z * sigma0 * G * M * MSOLE * MdotMedio) / (128 * Math.PI * COSTANTI.sigma * UA ** 3);
  const rIn = Math.min(0.5 * rOut, Math.max(0.02, 0.034 * Math.sqrt(L), 0.05 * Math.cbrt(M), Math.pow(T4 / 1500 ** 4, 1 / 4.5)));
  // I SOLIDI (la catena degli elementi, elementi.js): la miscela del gas di QUESTA stella; ogni elemento condensa alla sua
  // temperatura (Lodders 2003, con la curva di Clausius–Clapeyron). I SOLIDI CHE SI SEPARANO DAL GAS MENTRE IL DISCO SI
  // RAFFREDDA tengono ciò che era condensato quando si sono separati (Cassen 1996 [R]): i planetesimi di un luogo nascono a ogni
  // tempo della vita del gas, in proporzione alla polvere che c'è (Σ del disco viscoso lì e allora: un tempo di crescita fisso
  // in giri), e ognuno ha la roccia condensata alla temperatura di quel momento. La roccia di un luogo è la loro miscela: ciò che
  // condensa solo al freddo (Na, K, Cl, S, Zn, …) manca a chi è nato quando faceva caldo. La sua TEMPERATURA DI FORMAZIONE è la
  // media sulla roccia (Tcond); la QUANTITÀ di roccia è quella che condensa a quella temperatura (approssimazione dichiarata: la
  // miscela ne avrebbe un poco meno dove il disco giovane era più caldo dei silicati). Oltre la neve anche i ghiacci (la neve
  // resta quella della luce a metà vita del gas: dichiarato).
  const X = st.abbondanze || miscelaSolare(Z), tab = tabellaSolidi(X), NE = SIMBOLI.length;
  let storia = null; // (fatta al primo uso: chi chiede solo il disco non la paga)
  const laStoria = () => {
    if (storia) return storia;
    const NT = 24, NR = 64, lr0 = Math.log(0.99 * rIn), lr1 = Math.log(1.01 * rOut), dl = (lr1 - lr0) / (NR - 1), lx = Math.log(xFine) / NT;
    const tk = new Float64Array(NT), wk = new Float64Array(NT), Mk = new Float64Array(NT), Lk = new Float64Array(NT);
    for (let k = 0; k < NT; k++) { const x0 = Math.exp(k * lx), x1 = Math.exp((k + 1) * lx), x = Math.sqrt(x0 * x1); tk[k] = (x - 1) * ts; wk[k] = (x1 - x0) * ts; Mk[k] = Mdot(tk[k]); Lk[k] = Lt(tk[k]); }
    const Tm = new Float64Array(NR), fm = new Float64Array(NR), el = new Float64Array(NR * NE), somme = new Float64Array(NR), v = new Float64Array(NE), u = new Float64Array(NE);
    // (I PLANETESIMI FUSI DALL'ALLUMINIO 26: per ogni luogo e ogni tempo di nascita la parte della roccia nata da allora in poi che
    // l'²⁶Al fonde, elemento per elemento — elementi.js fusoDaAlluminio, con l'alluminio di quella roccia —, sommata dalla fine:
    // fusa[(i·(NT+1) + k)·NE + j]; perditeAccrescimento ne fa evaporare i moderatamente volatili)
    const fusa = new Float64Array(NR * (NT + 1) * NE), fk = new Float64Array(NT * NE);
    for (let i = 0; i < NR; i++) {
      const r = Math.exp(lr0 + i * dl), br = (B1 * om(r)) / (r * UA) ** 3, lr = 280 ** 4 / (r * r); let W = 0, Wr = 0, WrT = 0, Wm = 0, Tultima = 0, y = 0; v.fill(0); fk.fill(0);
      for (let k = 0; k < NT; k++) { const T = radiceT(br * Mk[k] * Mk[k], lr * Lk[k], y), w = (Mk[k] / T) * wk[k], ro = tab.roccia(T); y = Math.sqrt(T) * 1.0001; Tultima = T; W += w; if (!(ro > 0)) continue; Wr += w * ro; WrT += w * ro * T; Wm += w * tab.metallo(T);
        u.fill(0); tab.aggiungi(u, w * ro, T);
        // (dentro la neve, la lentezza del ferro che si ossida — elementi.js FA_NEBULOSA, Grossman et al. 2012 —: il FeO che
        // l'equilibrio vorrebbe oltre il 2% di fayalite resta ferro metallo, e il suo ossigeno resta nel gas; oltre la neve
        // l'acqua dentro i planetesimi lo ossida, e vale l'equilibrio)
        if (r < neve) { const nMg = u[IDX.Mg] / MASSA_MG, cap = (FA_NEBULOSA / (1 - FA_NEBULOSA)) * nMg * MASSA_FE, eccesso = Math.max(0, w * tab.feo(T) - cap);
          if (eccesso > 0) { const dO = Math.min(u[IDX.O], (eccesso / MASSA_FE) * MASSA_O); u[IDX.O] -= dO; Wm += eccesso; Wr -= dO; WrT -= dO * T; } }
        const psi = fusoDaAlluminio(u[IDX.Al] / (w * ro), tk[k], T); for (let j = 0; j < NE; j++) { v[j] += u[j]; fk[k * NE + j] = psi * u[j]; } }
      if (Wr > 1e-30 * W) { Tm[i] = WrT / Wr; fm[i] = Wm / Wr; for (let j = 0; j < NE; j++) el[i * NE + j] = v[j] / Wr;
        for (let k = NT - 1; k >= 0; k--) for (let j = 0; j < NE; j++) fusa[(i * (NT + 1) + k) * NE + j] = fusa[(i * (NT + 1) + k + 1) * NE + j] + fk[k * NE + j] / Wr; }
      else { Tm[i] = Tultima; fm[i] = 0; } // (sempre troppo caldo: niente roccia)
      let sum = 0; for (let j = 0; j < NE; j++) sum += el[i * NE + j]; somme[i] = sum;
    }
    const luogo = (r) => { const x = (Math.log(r) - lr0) / dl, k = Math.max(0, Math.min(NR - 2, Math.floor(x))); return [k, Math.max(0, Math.min(1, x - k))]; };
    return (storia = {
      T: (r) => { const [k, u] = luogo(r); return Tm[k] + u * (Tm[k + 1] - Tm[k]); },
      metallo: (r) => { const [k, u] = luogo(r); return fm[k] + u * (fm[k + 1] - fm[k]); },
      // aggiunge a «dove» kg di roccia nata a r, nelle proporzioni della miscela del luogo (sommano esattamente a kg)
      aggiungi: (dove, kg, r) => { const [k, u] = luogo(r), sm = somme[k] + u * (somme[k + 1] - somme[k]); if (!(sm > 0) || !(kg > 0)) return; const q = kg / sm; for (let j = 0; j < NE; j++) { const p = el[k * NE + j], s2 = el[(k + 1) * NE + j]; if (p || s2) dove[j] += q * (p + u * (s2 - p)); } },
      // aggiunge a «dove» la parte di quei kg (stesse proporzioni) che viene dai planetesimi nati dopo «tDopo» (anni) e fusi
      // dall'²⁶Al, elemento per elemento (≤ ciò che aggiungi dà)
      fusa: (dove, kg, r, tDopo) => { const [k, u] = luogo(r), sm = somme[k] + u * (somme[k + 1] - somme[k]); if (!(sm > 0) || !(kg > 0)) return; const q = kg / sm; let n = 0; while (n < NT && tk[n] < tDopo) n++;
        const a = (k * (NT + 1) + n) * NE, b = ((k + 1) * (NT + 1) + n) * NE; for (let j = 0; j < NE; j++) { const p = fusa[a + j], s2 = fusa[b + j]; if (p || s2) dove[j] += q * (p + u * (s2 - p)); } },
    });
  };
  const Tcond = (r) => laStoria().T(r);
  const sigmaSolidi = (r) => (tab.roccia(Tcond(r)) + (r < neve ? 0 : tab.ghiaccio)) * sigmaGas(r);
  const rocciaNata = (dove, kg, r) => laStoria().aggiungi(dove, kg, r), metalloNato = (r) => laStoria().metallo(r), rocciaFusa = (dove, kg, r, tDopo) => laStoria().fusa(dove, kg, r, tDopo);
  return { massaStella: M, Z, L, Lstella, tDisco, neve, rIn, rOut, frazione, massaKg, sigma0, vita, ts, Mdot0, sigmaGas, sigmaSolidi, Tcond, Tmezzo, Mdot, rocciaNata, metalloNato, rocciaFusa, miscela: X, solidi: tab };
}

// ---------- 5. il raggio, dalla massa e da ciò di cui è fatto
// LEGGE EMPIRICA (relazioni massa-raggio, dai modelli dell'interno confrontati con i pianeti misurati):
//  · solidi: R = (1,07 − 0,21·ferro + 0,34·ghiaccio)·M^0,27 in unità terrestri: più ferro, più piccolo; più ghiaccio, più grande
//  · un velo di idrogeno ed elio gonfia molto anche se pesa poco (è leggero e caldo)
//  · giganti: sopra 0,3 masse di Giove il raggio non cresce più (il gas si schiaccia sotto il proprio peso): circa un raggio di Giove
export function raggioPianeta({ massaKg, ferro = 0.3, ghiaccio = 0, gas = 0, flusso = 1, eta = 4.5e9 }) {
  if (gas > 0.5) { const x = massaKg / (0.3 * MGIOVE); return RGIOVE * Math.pow(x, x < 1 ? 0.55 : -0.04); }
  const m = massaKg / MTERRA, solido = (1.07 - 0.21 * ferro + 0.34 * ghiaccio) * Math.pow(m * (1 - gas), 0.27);
  const velo = gas > 0 ? 2.06 * Math.pow(m, -0.21) * Math.pow(gas / 0.05, 0.59) * Math.pow(Math.max(1e-6, flusso), 0.044) * Math.pow(limita(eta, 1e8, 1.4e10) / 5e9, -0.18) : 0;
  return RTERRA * (solido + velo);
}

// LEGGE EMPIRICA (dalle simulazioni della crescita degli embrioni nel gas, Kokubo–Ida e Ida–Lin): il tempo in cui un
// embrione di massa m raddoppia. Cresce con la distanza (lontano le orbite sono lente) e cala dove ci sono più solidi
// (più cibo) e più gas (il gas frena i sassi, e i sassi lenti si lasciano catturare). Anni; r in UA, Σ in kg/m².
// (Confrontata con Kokubo e Ida 2012, PTEP 01A308, eq. 4.8, letta [V]: 1,3·10⁵ fd⁻¹ fg^−2/5 ε⁻¹ (m/10¹⁸ g)^2/15 (ρp/2 g cm⁻³)^3/5
// (a/1 UA)^27/10 (M/M⊕)^⅓ (M*/M☉)^−⅙ anni, con Σd = 10 ε fd a^−3/2 g/cm² e Σg = 2400 fg a^−3/2: gli stessi esponenti; qui
// 1,2·10⁵ e i planetesimi della misura e della densità di riferimento. Il tempo fino all'isolamento è 3 volte questo.)
export const tempoCrescita = (m, r, sigmaS, sigmaG, Mst) => (1.2e5 / (sigmaS / 100)) * Math.sqrt(r) * Math.cbrt(m / MTERRA) * Math.pow(Mst, -1 / 6) * Math.pow(sigmaG / 24000, -0.4) * Math.pow(r, 0.1);
// LEGGE EMPIRICA (dai modelli degli involucri): il tempo in cui un nucleo fermo raffredda e stringe il suo involucro di
// gas fino a pesare quanto lui: un miliardo di anni per una Terra, un milione per dieci Terre (cala come il cubo della
// massa). È da qui che esce la soglia «circa dieci masse terrestri»: sotto, il disco svanisce prima.
const tempoInvolucro = (m) => 1e9 * Math.pow(m / MTERRA, -3);
// LEGGE EMPIRICA (simulazioni di molti corpi, Chambers e altri 1996): orbite vicine reggono per un numero di giri che
// cresce in fretta con la distanza in raggi di Hill reciproci Δ: log₁₀(giri) = b·Δ + c, con b e c misurati per corpi
// leggeri (un decimilionesimo della stella: b = 0,765, c = −0,03) e pesanti (un centomillesimo: b = 1,176, c = −1,663);
// tra i due, e fino ai giganti, si va in proporzione al logaritmo della massa. Quanti raggi servono per reggere «giri»
// giri: circa 8 per un sistema giovane, 10–13 dopo miliardi di anni per corpi piccoli, 7–8 accanto a un gigante.
// Mai meno di 2√3 ≈ 3,5: più vicine di così due orbite si disfano subito (il limite di Hill, questo esatto).
export const raggiNecessari = (giri, mu) => { const x = limita(Math.log10(mu) + 7, 0, 4); return Math.max(2 * Math.sqrt(3), (Math.log10(Math.max(10, giri)) + 0.03 + 0.8165 * x) / (0.765 + 0.2055 * x)); };
// la stessa legge letta al contrario: quanti giri reggono due orbite distanti Δ raggi di Hill reciproci (entro il limite
// di Hill, nessuno: si incrociano subito). Serve a dire QUANDO è avvenuto un urto gigante (e a impatti.js)
export const giriCheRegge = (delta, mu) => { if (delta <= 2 * Math.sqrt(3)) return 0; const x = limita(Math.log10(mu) + 7, 0, 4); return Math.pow(10, delta * (0.765 + 0.2055 * x) - 0.03 - 0.8165 * x); };

// ---------- 2–6. dal disco ai pianeti
// stella = { massa (masse solari alla nascita), Z (metalli, Sole = 1), eta (anni) }; stesso seme (un numero, o la sorgente
// degli eventi del disco) → stessi pianeti.
// Restituisce i pianeti in ordine di distanza: { aUA, massaKg, raggioM, tipo, composizione, eccentricita, storia, involucro }
// (involucro: la parte della massa che è un velo di idrogeno ed elio, per i mondi ghiacciati rimasti a metà strada;
// la composizione di rocciosi e ghiacciati descrive la parte solida).
// In più ogni pianeta porta «formazione», i NUMERI della sua storia (quelli che «storia» racconta a parole; serve a
// impatti.js). Non è enumerabile: chi elenca, stampa o confronta i pianeti vede quelli di sempre; chi li copia campo per
// campo deve copiarla apposta.
//   formazione = { embrione, urti, cibo, tGas, mIso, tIso, nato, scacciati, orfani, massaAlGas, misto }
//   embrione    il numero dell'embrione da cui è cresciuto (quello dei suoi eventi: «embrione 12/eccentricità»)
//   urti        gli urti giganti che l'hanno fatto, in ordine di tempo: [{ bersaglioKg, massaKg (i solidi dei due corpi,
//               il più grosso e il più piccolo), delta (la distanza tra le due orbite, in raggi di Hill reciproci, a cui
//               sono state trovate instabili; ≤ 2√3: già incrociate), tIncrocio (anni dalla nascita del sistema: quando
//               quella distanza ha ceduto, con la legge di Chambers contata dall'ultimo urto dei due o dalla fine del gas),
//               aUA, laterale (true se è un urto precedente del corpo più piccolo, non del pianeta) }]
//   cibo        (kg) i solidi delle sue strisce che gli embrioni non hanno mangiato: sono ancora in giro
//   tGas        (anni) quando è sparito il gas; mIso (kg) la somma delle masse di isolamento delle sue strisce; tIso (anni)
//               il tempo di isolamento dell'embrione principale; nato (UA); scacciati: quanti vicini ha scacciato
//   massaAlGas  (kg) quanti solidi avevano già raccolto i suoi embrioni quando il gas è sparito
//   misto       vero se tra i suoi embrioni ce n'erano di qua e di là della linea della neve
//   orfani      i corpi che ha scacciato (con la fionda): [{ aUA (dov'era), massaKg (i suoi solidi), ciboKg (la parte della
//               sua striscia non ancora mangiata), ghiaccio (frazione), t (anni: quando), dentro (stava più vicino alla stella) }]:
//               i sassi che gli giravano attorno restano lì, senza più chi li raccoglie (impatti.js ne fa una fascia)
export function formaPianeti(st, seme = 1) {
  const D = disco(st, seme), c = comeSorgente(seme, 'disco'), Mst = D.massaStella * MSOLE, eta = Math.max(0, st.eta ?? 4.5e9);
  const P = DISCO, hill = (m, a) => a * Math.cbrt(m / (3 * Mst)), vK = (a) => Math.sqrt((G * Mst) / (a * UA));
  // il tempo con il gas (fino a che il disco svanisce); dopo, senza gas i sassi non sono più frenati, corrono, e gli embrioni
  // li catturano centinaia di volte più lentamente (la crescita dopo il gas la fa la fase degli urti: cresci, qui sotto)
  const colGas = Math.min(eta, D.vita);
  const acquaSistema = 0.5 + c('acqua portata da fuori'); // quanta acqua hanno portato dentro i corpi venuti da fuori: cambia da un sistema all'altro

  // 2. GLI EMBRIONI. Si riempie il disco di strisce, dal bordo interno all'esterno: ogni striscia è larga 2C raggi di
  // Hill reciproci di due embrioni come quello che vi cresce. LA FINE DELLA CRESCITA OLIGARCHICA (Goldreich, Lithwick e Sari
  // 2004, ARA&A 42, 549, §2 e §3.3 [V: letto il testo]): «oligarchy ends when approximately half the original surface density
  // has been accreted», cioè quando la densità degli embrioni Σ è pari a quella dei corpi piccoli σ: da lì la frizione dei
  // piccoli non regge più il riscaldamento reciproco dei grandi, le loro orbite si incrociano e comincia la fase degli urti.
  // L'embrione ha allora METÀ dei solidi della sua striscia; l'altra metà sono planetesimi, il suo «cibo». M = π·r·Σs·(2C·r_H)
  // e r_H = r·(2M/3M*)^(1/3) danno   M_iso = (2π r² Σs C)^(3/2) · (2 / 3M*)^(1/2)
  // (Prima l'embrione si prendeva tutta la striscia, (4π r² Σs C)^(3/2)·…: 2^(3/2) volte di più, e nella fase degli urti non
  // restava niente che frenasse le orbite.)
  const massaIso = (r) => Math.pow(2 * Math.PI * (r * UA) ** 2 * D.sigmaSolidi(r) * P.C, 1.5) * Math.sqrt(2 / (3 * Mst));
  const corpi = [];
  let wPrima = 0;
  for (let lo = D.rIn * (1 + 0.15 * c('bordo interno')); lo < D.rOut && corpi.length < 6000;) {
    // (la larghezza della striscia che comincia a lo: quella dell'embrione di lo, o — dopo il primo — quella della striscia di prima,
    // che cambia piano: serve solo a mettere il centro)
    let m = 0, w = wPrima; if (!(w > 0)) { m = massaIso(lo); w = 2 * P.C * hill(2 * m, lo); }
    const r = lo + Math.min(w, 0.4 * lo) / 2, T = D.Tcond(r), sG = D.sigmaGas(r), sS = (D.solidi.roccia(T) + (r < D.neve ? 0 : D.solidi.ghiaccio)) * sG; // (D.sigmaSolidi(r), con T e Σ_gas che servono anche dopo)
    m = Math.pow(2 * Math.PI * (r * UA) ** 2 * sS * P.C, 1.5) * Math.sqrt(2 / (3 * Mst)); w = 2 * P.C * hill(2 * m, r); // (massaIso(r), con la Σ già letta)
    if (!(w > 0)) break;
    if (w > 0.4 * r) { w = 0.4 * r; m = Math.PI * r * UA * w * UA * sS; } // un disco enorme: la striscia non può essere più larga dell'orbita (e l'embrione ne ha metà)
    lo += w; wPrima = w; if (lo > D.rOut) break;
    const tIso = 3 * tempoCrescita(m, r, sS, sG, D.massaStella);
    // la massa cresce come il cubo del tempo (il tempo di raddoppio va come M^(1/3)) fino all'isolamento, finché c'è il gas
    const mora = m * Math.min(1, (colGas / tIso) ** 3);
    // 6. LA MATERIA. Il ferro condensa prima della roccia: vicino alla stella, dove fa caldo, la polvere è più ricca di
    // ferro (regola semplice: cresce col quadrato della temperatura del disco, 280 K·L^¼/√r), e ce n'è di più se la
    // stella è metallica. L'acqua: oltre la neve i solidi sono per tre quarti ghiaccio; dentro sono asciutti, salvo
    // quella portata dai corpi caduti da oltre la neve, sempre meno andando verso la stella (regola semplice,
    // suggerita dalle simulazioni: un decimo al bordo della neve, che cala come la distanza alla 2,5)
    // (LA CATENA DEGLI ELEMENTI: la roccia è quella che lì condensa, alla temperatura del luogo; il suo metallo — ferro non
    // ossidato, nichel, cobalto, zolfo — è il «ferro» che il raggio vede finché il pianeta non si separa davvero, alla fine)
    const ferroRoccia = D.metalloNato(r); // (il metallo della roccia nata lì, sulla roccia)
    const acqua = r < D.neve ? Math.min(0.1, 0.1 * acquaSistema * Math.pow(r / D.neve, 2.5)) : D.solidi.ghiaccio / (D.solidi.ghiaccio + D.solidi.roccia(T));
    // L'ORBITA ALLA FINE DEL GAS: l'eccentricità che gli incontri tra embrioni lasciano contro il freno del gas, con la legge di
    // Rayleigh e lo scarto delle condizioni iniziali di Kimura et al. 2025 (eq. 31 [V], dalle N-corpi dell'accrescimento
    // oligarchico): ⟨e²⟩^½ = 0,01·(Σs/10 g cm⁻²)^½, qui con la Σs del luogo; il perielio dove capita
    const orb = c.serie(`embrione ${corpi.length}/orbita`), e0 = 0.01 * Math.sqrt(sS / 100) * Math.sqrt(-Math.log(1 - orb(0))), fi0 = 2 * Math.PI * orb(1);
    corpi.push({ id: corpi.length, a: r, r0: r, m: mora, w, zr: e0 * Math.cos(fi0), zi: e0 * Math.sin(fi0), fe: mora * (1 - acqua) * ferroRoccia, fe0: mora * (1 - acqua) * ferroRoccia, h2o: mora * acqua, gas: 0, e: 0, urti: 0, scacciati: 0, mIso: m, tIso, nato: r, nucleo: 0, tGas: 0, freddo: r >= D.neve, misto: false, T, m0: mora, acqua0: acqua,
      lista: [], orfani: [], tUrto: D.vita, iso: m, cibo: 2 * m - mora, cibo0: 2 * m - mora, accr: 0, alGas: m * Math.min(1, (colGas / tIso) ** 3) }); // (i numeri per «formazione»)
  }

  // LA CRESCITA DAI PLANETESIMI DELLA STRISCIA (il cibo, sparso sulla sua larghezza): dm/dt = m/τ con τ = tempoCrescita(m, Σ_p) ∝
  // m^⅓/Σ_p, e la Σ_p che cala man mano: con M = m + cibo fisso è dm/dt = m^⅔·(M − m)/(k·A), che si integra esatta [D]: con x = m^⅓ e
  // a = M^⅓, t = k·A·[F(x)], F(x) = (1/a²)·(−ln(a − x) + ½·ln(x² + ax + a²) + √3·atan((2x + a)/(a√3))); si risolve per x (bisezione
  // sul logaritmo di ciò che manca). «lento» è quante volte più lenta senza gas (DISCO.senzaGas). Il cibo porta la materia della
  // striscia, nelle proporzioni del corpo.
  const legge = (b, lento) => { const area = 2 * Math.PI * b.a * b.w * UA * UA, ms = b.m - b.gas, sp = b.cibo / area, k0 = (lento * tempoCrescita(ms, b.a, sp, D.sigmaGas(b.a), D.massaStella) * sp) / Math.cbrt(ms);
    const aa = Math.cbrt(ms + b.cibo), F = (y) => { const x = aa - y; return (-Math.log(y) + 0.5 * Math.log(x * x + aa * x + aa * aa) + Math.sqrt(3) * Math.atan((2 * x + aa) / (aa * Math.sqrt(3)))) / (aa * aa); };
    return { ms, ka: k0 * area, aa, F }; };
  const mangia = (b, dt, lento) => {
    if (!(dt > 0) || !(b.cibo > 1e-9 * b.m)) return;
    // (Newton sul logaritmo di ciò che manca, u = ln y: dF/du = −3y/(a³ − x³); F cresce quando y cala, e la radice è unica)
    const { ms, ka, aa, F } = legge(b, lento), y0 = aa - Math.cbrt(ms), meta = F(y0) + dt / ka, a3 = aa * aa * aa; let u = Math.log(y0);
    for (let k = 0; k < 30; k++) { const y = Math.exp(u), x = aa - y, d = (F(y) - meta) / ((-3 * y) / (a3 - x * x * x)); const u2 = Math.min(Math.log(y0), Math.max(u - 5, u - d)); if (Math.abs(u2 - u) < 1e-10) { u = u2; break; } u = u2; }
    const dm = Math.min(b.cibo, Math.max(0, (aa - Math.exp(u)) ** 3 - ms));
    b.fe += (dm * b.fe) / ms; b.h2o += (dm * b.h2o) / ms; b.m += dm; b.cibo -= dm; b.accr += dm;
  };
  // 3. IL GAS. Un nucleo isolato raffredda il suo involucro in tempoInvolucro(M): se nucleo e involucro sono pronti
  // prima che il disco svanisca, il gas cade a valanga. I primi a riuscirci si servono per primi. MENTRE L'INVOLUCRO SI FA
  // il nucleo continua a mangiare i planetesimi della sua striscia, con la legge della crescita nel gas (il gas li frena e
  // smorza le orbite: Kokubo e Ida 2002 [R]; è la seconda fase di Pollack et al. 1996 [R], in cui il nucleo cresce col suo
  // involucro): è pronto al primo tempo t in cui t + tempoInvolucro(m(t)) non supera il disco (si cerca su 16 tempi, in
  // logaritmo, tra l'isolamento e la fine del gas). Chi non diventa un gigante arriva alla fine del gas con la metà della
  // striscia di Goldreich, Lithwick e Sari (vedi sopra): lì comincia la fase degli urti.
  for (const b of corpi) {
    // (chi nemmeno con tutta la striscia ce la farebbe non si segue)
    if (!(b.tIso < colGas) || !(b.tIso + tempoInvolucro(b.m + b.cibo) < colGas)) continue; const c0 = { m: b.m, cibo: b.cibo, fe: b.fe, h2o: b.h2o, accr: b.accr }; let t = b.tIso, migliore = b.tIso + tempoInvolucro(b.m), mm = { ...c0 };
    for (let k = 1; k <= 16; k++) { const t2 = b.tIso * Math.pow(colGas / b.tIso, k / 16); mangia(b, t2 - t, 1); t = t2; if (t + tempoInvolucro(b.m) < migliore) { migliore = t + tempoInvolucro(b.m); mm = { m: b.m, cibo: b.cibo, fe: b.fe, h2o: b.h2o, accr: b.accr }; } }
    Object.assign(b, c0); b.tPronto = migliore; b.pronto = mm;
  }
  const pronti = corpi.filter((b) => b.tPronto < colGas).sort((p, q) => p.tPronto - q.tPronto);
  let gasRimasto = D.massaKg;
  for (const b of pronti) {
    if (b.morto) continue;
    Object.assign(b, b.pronto); const t0 = b.tPronto, resta = Math.exp((-2 * t0) / D.vita); // il gas cala col tempo: chi arriva tardi trova meno
    // quanto gas prende: tutto quello della sua striscia (la stessa formula dell'isolamento, col gas al posto dei solidi),
    // ma non più di una parte di quello che il disco gli fa arrivare
    const mGas = Math.min(Math.pow(4 * Math.PI * (b.a * UA) ** 2 * D.sigmaGas(b.a) * resta * P.C, 1.5) / Math.sqrt(3 * Mst), P.presa * gasRimasto * resta);
    b.nucleo = b.m; b.tGas = t0; b.gas = mGas; gasRimasto -= mGas;
    // gli embrioni dentro la sua nuova striscia (C raggi di Hill del gigante) gli cadono addosso
    const rh = P.C * hill(b.m + mGas, b.a);
    for (const o of corpi) if (o !== b && !o.morto && Math.abs(o.a - b.a) < rh) { b.m += o.m; b.gas += o.gas; b.fe += o.fe; b.h2o += o.h2o; b.iso += o.iso; b.cibo += o.cibo; b.diffusi = (b.diffusi || 0) + (o.diffusi || 0); b.w += o.w; b.alGas += o.alGas; o.morto = true; o.in = b.id; }
    b.m += mGas;
  }
  // i nuclei tardivi: l'involucro cresce piano (in proporzione al tempo che resta), e quando il disco svanisce resta
  // un velo di gas. Solo al freddo: dentro la neve la luce della stella e gli urti lo strappano via.
  for (const b of corpi) if (!b.morto && !b.gas && b.freddo && b.m >= b.mIso) {
    const x = Math.max(0, colGas - b.tIso) / tempoInvolucro(b.m);
    if (x > 0.01) { b.gas = b.m * x; b.m += b.gas; }
  }

  // 4. GLI URTI GIGANTI: il modello a eventi di Kimura, Hoshino, Kokubo, Matsumoto e Ikoma 2025 (arXiv:2505.20548 [V: letto il
  // testo]; secolare.js per le leggi). Sparito il gas (che teneva le orbite rotonde) il sistema passa da un evento all'altro:
  //  a. LE ECCENTRICITÀ SECOLARI: tra un evento e l'altro i corpi si scambiano l'eccentricità con la teoria di Laplace e
  //     Lagrange; per la stabilità conta la media sul ciclo, ⟨e²⟩ = Σ dei modi (Kimura, eq. 21);
  //  b. QUANDO tre orbite vicine cedono: il tempo di incrocio di Petit et al. 2020 sulla distanza minima tra orbite eccentriche
  //     (Kimura, eq. 4, 5, 22): tocca alla terna col tempo più breve, e nella terna alla coppia più stretta; con due corpi soli
  //     l'energia di Jacobi (Kimura, eq. 28: Ẽ = ½(ẽ² + Ĩ²) − ⅜b̃² + 9/2 > 0, in unità di Hill, Ĩ = ẽ/2) dice se si incrociano;
  //  c. ALL'INCROCIO gli incontri portano la velocità relativa a quella di fuga: e_ij con la legge di Rayleigh, ⟨e_ij²⟩^½ =
  //     e_fuga, ripartita col peso √m dell'altro e mai sotto quella che serve a toccarsi né sotto quella secolare (eq. 6–7);
  //     poi è una gara tra diffusione e urto: τ_diff = 4ba/(π(R_i+R_j)²·lnΛ)·(e/e_fuga)⁴·T_K, τ_urto = ba/(π(R_i+R_j)²)·
  //     1/(1 + e_fuga²/e²)·T_K, lnΛ = 3; l'urto ha probabilità 1 − e^(−τ_diff/τ_urto) (eq. 9–14). L'orologio va avanti del
  //     più breve dei due;
  //  d. L'URTO fonde i due corpi: massa e baricentro (eq. 25), e l'eccentricità dal vettore di Laplace–Runge–Lenz con l'angolo
  //     tra i perieli tra quelli in cui le orbite si toccano (eq. 26–27). LA DIFFUSIONE allarga la coppia di e_i·a_i + e_j·a_j
  //     (eq. 23–24; qui conservando l'energia delle due orbite: vedi sotto). Fuori da Kimura (che non ha giganti): se nella diffusione il corpo più piccolo esce
  //     con e ≥ 1 è slegato, scagliato fuori dal sistema (la fionda: il grande paga l'energia, 1/a' = 1/a + (m/M)/a_piccolo),
  //     e se la diffusione lo porta dentro il bordo del disco cade sulla stella;
  //  e. LO SMORZAMENTO da parte dei planetesimi rimasti (il «cibo» delle strisce, sparso sulla loro larghezza): non è in
  //     Kimura. È la stessa frizione che dà il loro τ_diff (Chandrasekhar 1943 [R]: quella legge è la frizione tra due anelli),
  //     con un anello di planetesimi piccoli al posto del secondo embrione (la massa (M_i+M_j)·M_j di Chandrasekhar diventa
  //     M·M_p) [D]: τ_attrito/T_K = e⁴·M*²/(4π²·M·Σ_p·a²·lnΛ). Vale finché le velocità superano quella di Hill: e mai sotto
  //     (M/3M*)^⅓ (dichiarato). Si applica corpo per corpo all'eccentricità secolare (dichiarato: ciò che un corpo perde non
  //     lo toglie ai modi che ha in comune con gli altri; dentro i modi, al primo ordine, varrebbe solo per un attrito più lento
  //     dei giri secolari, e qui spesso è più rapido); la Σ_p resta quella della fine del gas (dichiarato:
  //     i planetesimi che il corpo intanto si mangia non sono tolti).
  // L'eccentricità di oggi è quella secolare all'età della stella. (Prima: orbite a 10 raggi di Hill del corpo solo, cioè 7,9
  // reciproci; dopo ogni fusione l'eccentricità piena subito, e la coppia accanto si incrociava senza attesa; nessun tempo tra
  // l'incrocio e l'urto; e l'eccentricità di oggi un sorteggio.)
  let vivi = corpi.filter((b) => !b.morto && b.m > 0).sort((p, q) => p.a - q.a); const fusioni = [];
  const MS = D.massaStella, LN = 3, anno = (a) => Math.pow(a, 1.5) / Math.sqrt(MS), cache = new Map(), incontri = new Map(); // (incontri: quante volte si è incontrata ogni coppia)
  const raggio = (b) => { if (b._rm !== b.m || b._rf !== b.fe || b._rh !== b.h2o) { b._rm = b.m; b._rf = b.fe; b._rh = b.h2o; b._R = raggioPianeta({ massaKg: b.m, ferro: b.fe / (b.m - b.gas), ghiaccio: b.h2o / (b.m - b.gas), gas: b.gas / b.m }); } return b._R; }; // (in memoria finché il corpo non cambia)
  // IL DESTINO DEI PLANETESIMI RIMASTI, DOPO IL GAS (il cibo: i resti della striscia e i frammenti degli urti). Il corpo li agita fino
  // alla sua velocità di fuga (Safronov), e da lì ognuno o lo colpisce o ne è diffuso via — scagliato fuori, sulla stella, sugli
  // altri —. Quanti lo colpiscono: Ida e Lin 2004 (ApJ 604, 388, §3 [V: letto il testo]), il rapporto tra urti ed espulsioni è
  // f_cap ≈ (V_fuga,stella/V_sup)⁴ = 4/Θ², con V_sup = √(GM/R), V_fuga,stella = √(2GM*/a) e Θ = (v_fuga/v_orbita)²/2 il numero di
  // Safronov: una Terra a 1 UA (Θ ≈ 0,07) se li prende quasi tutti, un gigante li scaglia. Quanto in fretta: il tempo d'urto della
  // fase degli urti giganti (Kimura et al. 2025, eq. 11), con lo sciame largo quanto la striscia e agitato alla fuga (e = e_fuga:
  // 1/(1 + e_fuga²/e²) = ½), τ = w·a/(π·R²)·T_K·2; lo svuotamento è quello dinamico dello sciame — urti più diffusioni, al ritmo
  // (1 + 1/f_cap)/τ, più lo svuotamento dinamico qui sotto — e non più la crescita del gas 300 volte più lenta. (Dichiarato: dentro
  // un intervallo la massa e il raggio del corpo restano quelli dell'inizio.)
  for (const b of vivi) b.tAcc = Math.min(eta, D.vita);
  const sciame = (b) => { const R = raggio(b), th = (G * b.m) / R / vK(b.a) ** 2, fcap = 4 / (th * th), tau = ((b.w * UA * b.a * UA) / (Math.PI * R * R)) * anno(b.a) * 2; return { ritmo: (1 + 1 / fcap) / tau, presa: fcap / (1 + fcap) }; };
  // (la massa che il corpo avrà a T, senza toccarlo: serve al tempo d'incrocio, che con i corpi che crescono si accorcia — la
  // crescita stessa avvicina le orbite in raggi di Hill)
  // LO SVUOTAMENTO DINAMICO dei resti (Morbidelli et al. 2012, EPSL 355, 144, §4 [V: letto il testo]: nelle N-corpi di Walsh et al.
  // 2011 il ritmo d'urto dei planetesimi rimasti cala come exp(−(t/t₀)^β), tra (t₀ = 10 milioni di anni, β = 0,5) e (3, 0,34);
  // qui la prima, contando dalla fine del gas — dichiarato: loro contano da quando i pianeti sono finiti): oltre a ciò che il
  // corpo prende o scaglia, la popolazione cala da sola (risonanze, la stella, gli altri pianeti) al ritmo −d ln S/dt =
  // β·t^(β−1)/t₀^β. Si integra a passi in logaritmo del tempo, ciascuno coi ritmi del suo mezzo.
  const DIN = { t0: 1e7, beta: 0.5 };
  const evolvi = (b, t1, t2) => { const { ritmo, presa } = sciame(b); let c = b.cibo, dm = 0; const u1 = Math.max(1, t1 - D.vita), u2 = Math.max(u1, t2 - D.vita), passi = 8;
    for (let k = 0; k < passi && c > 0; k++) { const a = u1 * Math.pow(u2 / u1, k / passi), z = u1 * Math.pow(u2 / u1, (k + 1) / passi), dt = z - a; if (!(dt > 0)) continue;
      const din = Math.pow(z / DIN.t0, DIN.beta) - Math.pow(a / DIN.t0, DIN.beta), tot = ritmo * dt + din, via = c * -Math.expm1(-tot); dm += via * presa * (ritmo * dt) / tot; c -= via; }
    return { dm, via: b.cibo - c }; };
  const massaA = (b, T) => (T > b.tAcc && b.cibo > 0 && b.w > 0 ? b.m + evolvi(b, b.tAcc, T).dm : b.m);
  const cresci = (b, T) => { const t1 = b.tAcc, dt = T - t1; b.tAcc = Math.max(b.tAcc, T); if (!(dt > 0) || !(b.cibo > 0) || !(b.w > 0)) return;
    const ms = b.m - b.gas, { dm, via } = evolvi(b, t1, T);
    // (la «vernice tardiva» è la parte primitiva — i planetesimali mai fusi —, non i frammenti dell'urto, che sono il pianeta stesso
    // già separato: Walker 2009 la misura con gli elementi siderofili, che i frammenti non riportano)
    const qf = b.frantumi > 0 ? Math.min(1, b.frantumi / b.cibo) : 0; b.frantumi = (b.frantumi || 0) * (1 - via / b.cibo);
    b.cibo -= via; b.fe += (dm * b.fe) / ms; b.h2o += (dm * b.h2o) / ms; b.m += dm; b.accr += dm; b.vernice = (b.vernice || 0) + dm * (1 - qf); b.diffusi = (b.diffusi || 0) + via - dm; };
  // (e) l'attrito: de/dt = −e/τ con τ ∝ e⁴, cioè e⁴ cala di 4·dt/C, C = M*²·T_K/(4π²·M·Σ_p·a²·lnΛ); fermo alla velocità di Hill
  const attrito = (b, e, dt) => { if (!(b.cibo > 0) || !(b.w > 0) || !(dt > 0)) return e;
    if (b._a !== b.a || b._m !== b.m || b._c !== b.cibo || b._w !== b.w) { b._a = b.a; b._m = b.m; b._c = b.cibo; b._w = b.w; b._eH = Math.cbrt(b.m / (3 * Mst)); const sp = b.cibo / (2 * Math.PI * b.a * b.w * UA * UA); b._C = (Mst * Mst * anno(b.a)) / (4 * Math.PI * Math.PI * b.m * sp * (b.a * UA) ** 2 * LN); } // (C: ricalcolato solo quando il corpo cambia)
    const eH = b._eH; if (!(e > eH)) return e; const x = e * e * e * e - (4 * dt) / b._C; return x > eH ** 4 ? Math.sqrt(Math.sqrt(x)) : eH; };
  // (la teoria secolare costa come il cubo dei corpi: si fa a pezzi di al più 12 corpi, tagliando la catena dove i vicini si
  // scambiano meno eccentricità (secolare.js blocchiSecolari; dichiarato: tra un pezzo e l'altro lo scambio è trascurato); un
  // pezzo si rifà solo quando uno dei suoi corpi cambia. Con più di 40 corpi — i dischi poveri di metalli fanno migliaia di
  // embrioni piccoli — non si fa, e ogni corpo tiene la sua eccentricità finché non ne restano 40. Scelte di calcolo.)
  // (fatti: gli eventi; al più 600 in tutto, come i giri di prima, e al più 150 mentre i corpi sono più di 40: i dischi poveri di
  // metalli fanno migliaia di embrioni piccoli, e oltre quel bilancio la loro gara si ferma lì — una scelta di calcolo, dichiarata.
  // L'errore, misurato: con i piccolissimi seguiti come popolazione (qui sotto), su 300 sistemi della galassia 0 del cosmo 1 e 60
  // dischi di una stella di 0,1 M☉ con Z = 0,01, i pianeti sono identici con 150 e con 600 eventi; prima della popolazione il
  // tetto toglieva a quei 60 dischi 2 pianeti sopra il minimo su 4)
  let t = Math.min(eta, D.vita), terne = [], evento = 0, fatti = 0;
  for (const b of vivi) { b.tz = t; b.tocco = -1; b.blocco = null; b.ver = 0; b.terna = null; }
  // l'eccentricità di un corpo al tempo T (anni dalla nascita): quella secolare del suo pezzo, frenata dai planetesimi
  const zA = (b, T) => { const B = b.blocco, [x, y] = B ? B.L.z(b.jb, T - B.t0) : [b.zr, b.zi], e = Math.hypot(x, y), f = e > 0 ? attrito(b, e, T - (B ? B.t0 : b.tz)) / e : 1; return [x * f, y * f]; };
  const eA = (b, T) => { const B = b.blocco; return B ? attrito(b, Math.sqrt(B.L.e2(b.jb, T - B.t0)), T - B.t0) : attrito(b, Math.hypot(b.zr, b.zi), T - b.tz); };
  // (c) l'incontro della coppia i (con i+1) cominciato a T: quanto si agitano, chi vince tra diffusione e urto, e quando finisce.
  // Gli eventi della coppia: «embrione A/agitazione con B» (e_ij, una estrazione per incontro), «embrione A/incontro con B» (urto o
  // diffusione; i ritorni dopo una diffusione: «…/ritorno k»), «embrione A/fusione con B» (l'angolo tra i perieli)
  const esito = (p, q, T) => {
    const k = incontri.get(p.id * 1e6 + q.id) || 0, z = [zA(p, T), zA(q, T)], m = p.m + q.m, mp = p.m, mq = q.m;
    const ep = Math.hypot(...z[0]), eq = Math.hypot(...z[1]), fp = Math.atan2(z[0][1], z[0][0]), fq = Math.atan2(z[1][1], z[1][0]);
    const am = 0.5 * (p.a + q.a), Rp = raggio(p), Rq = raggio(q), eFuga = Math.sqrt((2 * G * m) / (Rp + Rq)) / vK(am), b = q.a - p.a;
    const eij = eFuga * Math.sqrt(-Math.log(1 - c.serie(`embrione ${p.id}/agitazione con ${q.id}`)(k))), x0 = Math.sqrt(mq) * p.a + Math.sqrt(mp) * q.a;
    const ep0 = Math.max(Math.sqrt(mq / m) * eij, (Math.sqrt(mq) * b) / x0, ep), eq0 = Math.max(Math.sqrt(mp / m) * eij, (Math.sqrt(mp) * b) / x0, eq), er = Math.hypot(ep0, eq0);
    const sezione = Math.PI * (Rp + Rq) ** 2, tDiff = ((4 * b * am * UA * UA) / (sezione * LN)) * (er / eFuga) ** 4 * anno(am), tUrto = ((b * am * UA * UA) / sezione / (1 + (eFuga / er) ** 2)) * anno(am);
    // (slegato: chi esce dall'incontro con e ≥ 1, il più piccolo se lo sono tutti e due — un corpo grande ci arriva solo se la
    // teoria secolare gli ha già dato e ≥ 1, una risonanza secolare che al primo ordine non si ferma)
    const grande = mp >= mq ? p : q, piccolo = grande === p ? q : p, eP = piccolo === p ? ep0 : eq0, eG = grande === p ? ep0 : eq0, slegato = eP >= 1 ? piccolo : eG >= 1 ? grande : null;
    const urto = !slegato && c(`embrione ${p.id}/incontro con ${q.id}${k ? `/ritorno ${k}` : ''}`) < -Math.expm1(-tDiff / tUrto);
    return { p, q, k, m, mp, mq, ep, eq, fp, fq, am, b, ep0, eq0, grande, piccolo, slegato, urto, tIncrocio: T, tEvento: T + (urto ? Math.min(tDiff, tUrto) : tDiff) };
  };
  // (b) quando cede la terna che comincia dal corpo i (o la coppia, se i corpi sono due), contando da t0: il tempo di incrocio con
  // le eccentricità di QUEL momento; lo smorzamento le cala, e il tempo si allunga: si cerca il primo tempo che si regge da sé
  // (cresce a ogni passo: ci si ferma quando non si muove più). Poi l'incontro della coppia che cede, e quando finisce.
  const terna = (i, t0) => terna3(vivi[i], vivi[i + 1], vivi[i + 2], vivi.length, t0);
  const terna3 = (p, q, r, n, t0) => {
    const K = Math.min(0.5 * (n - 3) + 1, 3); let dt = 0, coppia = 0; t0 = Math.max(t0, p.tz, q.tz, r ? r.tz : 0); // (chi esce dalla popolazione dei piccolissimi c'è solo da quando ne esce)
    for (let passo = 0; passo < 20; passo++) {
      const T = t0 + dt; let tau = Infinity;
      if (n === 2) { const h = Math.cbrt((p.m + q.m) / (3 * Mst)), et = Math.hypot(eA(p, T), eA(q, T)) / h, bt = (q.a - p.a) / ((0.5 * (p.a + q.a)) * h);
        if (0.5 * (et * et + 0.25 * et * et) - 0.375 * bt * bt + 4.5 > 0) tau = 0; }
      else { const x = tempoIncrocio(p.a, q.a, r.a, massaA(p, T) / Mst, massaA(q, T) / Mst, massaA(r, T) / Mst, eA(p, T), eA(q, T), eA(r, T), anno(p.a), K, giriCheRegge); tau = x.tau; coppia = x.coppia; }
      const fermo = !(tau > dt * (1 + 1e-2)); dt = Math.max(dt, tau); if (fermo || t0 + dt > eta) break;
    }
    return (p.terna = { T: t0 + dt, coppia, x: null, b: [p, q, r], ver: [p.ver, q.ver, r?.ver], K: n === 2 ? 0 : K });
  };
  // dopo ogni evento: i pezzi della teoria secolare (si rifanno quelli che hanno un corpo nuovo o toccato: i loro corpi passano
  // prima all'ora di adesso), e le terne (si rifanno quelle con un corpo rifatto)
  const rifai = () => {
    const N = vivi.length, pezzi = [];
    if (N <= 40) { const inizi = blocchiSecolari(vivi.map((b) => ({ a: b.a, m: b.m / Mst, chiave: b.id })), MS, 12, cache); for (let k = 0; k < inizi.length; k++) pezzi.push(vivi.slice(inizi[k], k + 1 < inizi.length ? inizi[k + 1] : N)); }
    else for (const o of vivi) if (o.tocco === evento) pezzi.push([o]); // (senza teoria secolare: cambia solo chi è stato toccato)
    const nuovi = pezzi.filter((P) => { const B = P[0].blocco; return P.length === 1 ? P[0].tocco === evento || B : !(B && B.membri.length === P.length && P.every((o, j) => o.blocco === B && o.jb === j && o.tocco !== evento)); });
    for (const P of nuovi) for (const o of P) { const zz = zA(o, t); o.zn = zz; }
    for (const P of nuovi) { for (const o of P) { [o.zr, o.zi] = o.zn; o.tz = t; o.ver++; o.blocco = null; }
      if (P.length < 2) continue;
      const B = { t0: t, membri: P, L: modiSecolari(P.map((o) => ({ a: o.a, m: o.m / Mst, zr: o.zr, zi: o.zi, chiave: o.id })), MS, cache) }; P.forEach((o, j) => { o.blocco = B; o.jb = j; }); }
    const nT = N === 2 ? 1 : N - 2, KN = N === 2 ? 0 : Math.min(0.5 * (N - 3) + 1, 3); terne.length = nT;
    for (let i = 0; i < nT; i++) { const v = vivi[i].terna, [o1, o2, o3] = v ? v.b : [];
      terne[i] = v && v.K === KN && o2 === vivi[i + 1] && o3 === vivi[i + 2] && o1.ver === v.ver[0] && o2.ver === v.ver[1] && (!o3 || o3.ver === v.ver[2]) ? v : terna(i, t); }
  };
  // L'EVENTO: l'incontro x finisce (urto, diffusione, o il piccolo scagliato fuori)
  const applica = (x) => {
    const { p, q, ep, eq, fp, fq, am, b, ep0, eq0, urto, tIncrocio, tEvento } = x, slegato = x.slegato; incontri.set(p.id * 1e6 + q.id, x.k + 1); cresci(p, tEvento); cresci(q, tEvento);
    const mp = p.m, mq = q.m, m = mp + mq, grande = mp >= mq ? p : q, piccolo = grande === p ? q : p, Rp0 = raggio(p), Rq0 = raggio(q);
    evento++; p.tocco = q.tocco = evento; for (const o of [p, q]) { const zz = zA(o, tEvento); o.zr = zz[0]; o.zi = zz[1]; o.tz = tEvento; o.blocco = null; }
    const distanza = Math.max(0, (q.a * (1 - eq) - p.a * (1 + ep)) / (am * Math.cbrt(m / (3 * Mst)))); // (per «formazione»: in raggi di Hill reciproci)
    if (urto) {
      // (d) si fondono: l'angolo tra i perieli tra quelli in cui le orbite si toccano
      const cmin = (ep0 * ep0 * p.a * p.a + eq0 * eq0 * q.a * q.a - b * b) / (2 * ep0 * eq0 * p.a * q.a), dmin = Math.acos(limita(cmin, -1, 1)), dfi = dmin + (2 * Math.PI - 2 * dmin) * c(`embrione ${p.id}/fusione con ${q.id}`);
      const zr = (mp * ep0 * Math.cos(fp) + mq * eq0 * Math.cos(fp + dfi)) / m, zi = (mp * ep0 * Math.sin(fp) + mq * eq0 * Math.sin(fp + dfi)) / m;
      fusioni.push({ g: grande.id, p: piccolo.id, t: tEvento, Mg: grande.m - grande.gas, Mp: piccolo.m - piccolo.gas, Rg: raggio(grande), Rp: raggio(piccolo), a: am });
      for (const u of piccolo.lista) { u.laterale = true; grande.lista.push(u); } // (gli urti del più piccolo: laterali per il grande; il piccolo non c'è più)
      grande.lista.push({ bersaglioKg: Math.max(grande.m - grande.gas, piccolo.m - piccolo.gas), massaKg: Math.min(grande.m - grande.gas, piccolo.m - piccolo.gas), delta: distanza, tIncrocio, t: tEvento, aUA: am });
      grande.iso += piccolo.iso; grande.cibo += piccolo.cibo; grande.diffusi = (grande.diffusi || 0) + (piccolo.diffusi || 0); grande.w += piccolo.w; grande.alGas += piccolo.alGas; for (const o of piccolo.orfani) grande.orfani.push(o);
      grande.a = (mp * p.a + mq * q.a) / m; grande.zr = zr; grande.zi = zi;
      grande.nato = (grande.nato * grande.m + piccolo.nato * piccolo.m) / m;
      if (grande.gas < 0.5 * grande.m) { grande.m = m - piccolo.gas - grande.gas; grande.gas = 0; } // l'urto strappa il velo di gas
      else { grande.m = m; grande.gas += piccolo.gas; }
      grande.vernice = 0; grande.frantumi = (grande.frantumi || 0) + (piccolo.frantumi || 0); // (la «vernice tardiva»: ciò che il corpo prenderà dopo questo urto)
      grande.fe += piccolo.fe; grande.h2o += piccolo.h2o; grande.urti += 1 + piccolo.urti; grande.misto ||= piccolo.misto || grande.freddo !== piccolo.freddo; piccolo.in = grande.id; piccolo.morto = true;
      // I FRAMMENTI DELLO SCONTRO (Leinhardt e Stewart 2012, ApJ 745, 79, eq. 4 [V: letto il testo]): il resto più grosso è
      // M_lr/M_tot = 1 − ½·Q_R/Q*_RD, con Q_R = ½·μ·V²/M_tot l'energia dell'urto per chilo (V² = v_fuga² + v_∞², v_∞ = e·v_orbita,
      // la e relativa dell'incontro) e Q*_RD quella che ne disperde metà, per corpi senza resistenza (c* = 1,9, ρ₁ = 1000 kg/m³,
      // μ̄ = 0,36, corretta per il rapporto delle masse: URTI, qui in cima); urto centrale (dichiarato:
      // obliquo ne disperde meno), e mai sotto un decimo (oltre è il regime super-catastrofico, eq. 44). Il resto sono frammenti
      // attorno all'orbita del corpo: si aggiungono al suo cibo, lo frenano e si fanno riprendere (Chambers 2013; Quintana et al.
      // 2016 [R]). (I giganti no.)
      if (grande.gas < 0.5 * grande.m) {
        const U = URTI, Ms = grande.m - grande.gas, ga = Math.min(mp, mq) / Math.max(mp, mq), Rc1 = Math.cbrt((3 * Ms) / (4 * Math.PI * U.rho1)), Qs = U.cStar * 0.8 * Math.PI * U.rho1 * G * Rc1 * Rc1 * Math.pow((1 + ga) ** 2 / (4 * ga), 2 / (3 * U.mu) - 1);
        const V2 = (2 * G * m) / (Rp0 + Rq0) + (Math.hypot(ep0, eq0) * vK(am)) ** 2, QR = (0.5 * ((mp * mq) / m) * V2) / m, fd = Math.min(0.9, (0.5 * QR) / Qs) * Ms;
        grande.fe -= (fd * grande.fe) / Ms; grande.h2o -= (fd * grande.h2o) / Ms; grande.m -= fd; grande.cibo += fd; grande.frantumi = (grande.frantumi || 0) + fd;
      }
    } else {
      if (slegato) {
        // (d) fuori da Kimura: il più piccolo esce slegato (la fionda): parte con energia nulla, e il grande paga il conto
        // (e il rinculo gli lascia un'eccentricità di qualche decimo della massa scagliata sulla sua: la regola di prima, 0,4·m/M,
        // sommata in quadratura a quella secolare; e_ij qui è oltre la fuga dal sistema, e la ripartizione di Kimura non vale)
        // (se a uscire è il più grande, perché la teoria secolare gli aveva già dato e ≥ 1, l'altro resta com'era)
        const altro = slegato === p ? q : p, fa = altro === p ? fp : fq, ea = altro === p ? ep : eq;
        if (slegato === piccolo) { altro.a = Math.max(D.rIn, 1 / (1 / altro.a + slegato.m / altro.m / slegato.a)); const eg = Math.min(0.99, Math.hypot(ea, (0.4 * slegato.m) / altro.m)); altro.zr = eg * Math.cos(fa); altro.zi = eg * Math.sin(fa); }
        else { altro.zr = ea * Math.cos(fa); altro.zi = ea * Math.sin(fa); }
      } else {
        // (d) la diffusione: la coppia si allarga di Δb. Kimura la divide col baricentro, e nel loro regime (e ≪ 1) l'energia
        // si conserva entro qualche per cento; con e vicine a 1 (embrioni pesanti lontano dalla stella, dove la fuga supera la
        // velocità dell'orbita) quella divisione porterebbe il corpo di dentro a una frazione della sua orbita senza che l'altro
        // possa pagarne l'energia: qui la coppia si allarga di Δb conservando l'energia delle due orbite, m_p/a_p + m_q/a_q [D]
        const db = ep0 * p.a + eq0 * q.a, B2 = b + db, E0 = mp / p.a + mq / q.a; let lo = 1e-6 * p.a, hi = p.a;
        for (let k2 = 0; k2 < 60; k2++) { const x = Math.sqrt(lo * hi); if (mp / x + mq / (x + B2) > E0) lo = x; else hi = x; }
        p.a = Math.sqrt(lo * hi); q.a = p.a + B2;
        p.zr = ep0 * Math.cos(fp); p.zi = ep0 * Math.sin(fp); q.zr = eq0 * Math.cos(fq); q.zi = eq0 * Math.sin(fq); p.diffusioni = (p.diffusioni || 0) + 1; q.diffusioni = (q.diffusioni || 0) + 1;
      }
      const perso = slegato || (p.a < 0.5 * D.rIn ? p : null); // (scagliato fuori, o caduto sulla stella)
      if (perso) {
        const altro = perso === p ? q : p; altro.scacciati++;
        // (per «formazione») il corpo perso lascia ORFANI i sassi che gli giravano attorno: dov'era, quanto pesava, quando
        const sol = perso.m - perso.gas; for (const o of perso.orfani) altro.orfani.push(o); altro.orfani.push({ aUA: perso.a, massaKg: sol, ciboKg: Math.max(0, perso.cibo), ghiaccio: perso.h2o / sol, t: tEvento, dentro: perso.a < altro.a });
        perso.morto = true;
      }
    }
  };
  // LA FASE DEI MOLTI (più di 40 corpi: niente teoria secolare, e ogni terna dipende solo dai suoi tre corpi): gli eventi in
  // ordine con una coda di priorità e la catena dei vicini, così il costo di un evento non cresce col numero dei corpi. Le voci
  // della coda: una terna col suo tempo di incrocio (che è un limite inferiore della fine del suo incontro), o col suo incontro
  // calcolato; una voce è vecchia se uno dei suoi corpi è cambiato o non sono più vicini.
  // I PICCOLISSIMI COME POPOLAZIONE. Nei dischi poveri gli embrioni alla fine del gas sono migliaia, e tutti sotto la massa minima
  // di un pianeta: seguirli uno per uno costa come il loro numero. Come nei codici ibridi (Kenyon e Bromley 2006; Kobayashi,
  // Tanaka e Krivov 2010 [R]: i corpi piccoli come popolazione statistica, i grandi uno per uno), una fila di embrioni vicini sotto
  // il minimo si segue a generazioni: a ogni generazione i vicini si fondono a due a due, quando la loro terna cede (lo stesso
  // tempo di incrocio di Petit, con le masse e le distanze di quel momento) e si sono trovati (lo stesso τ_urto, con l'agitazione
  // media di Kimura, e = e_fuga); l'eccentricità che ne esce è quella media della fusione di Kimura, e² = m₁m₂·e_fuga²/M², nella
  // direzione dell'evento «…/fusione con…». Chi arriva al minimo esce dalla popolazione ed entra nella gara come corpo; chi a oggi
  // non c'è arrivato resta un detrito. Dichiarato: nella popolazione nessuno è scagliato né diffuso (con e = e_fuga la gara di Kimura
  // dà l'urto nove volte su dieci), e i frammenti degli urti non si contano.
  if (eta > D.vita) {
    const minimo = P.minimo * MTERRA, piccolo = (b) => b.m < minimo && !(b.gas > 0.5 * b.m), escono = [];
    for (let j = 0; j < vivi.length;) {
      if (!piccolo(vivi[j])) { escono.push(vivi[j]); j++; continue; }
      let k = j; while (k < vivi.length && piccolo(vivi[k])) k++;
      if (k - j < 2) { escono.push(vivi[j]); j = k; continue; }
      const R = (g) => raggioPianeta({ massaKg: g.m, ferro: g.fe / g.m, ghiaccio: g.h2o / g.m });
      let gruppi = vivi.slice(j, k).map((b) => { const g = { capo: b, m: b.m, fe: b.fe, h2o: b.h2o, a: b.a, t: b.tz, e: Math.hypot(b.zr, b.zi), zr: b.zr, zi: b.zi, lista: [], membri: [b], urti: 0 }; g.R = R(g); return g; });
      for (let giro = 0; giro < 40; giro++) {
        const dopo = []; let fusi = 0;
        for (let i = 0; i < gruppi.length; i++) {
          const A = gruppi[i], B = gruppi[i + 1];
          if (!B || A.m >= minimo || B.m >= minimo || A.fermo || B.fermo) { dopo.push(A); continue; }
          const C = gruppi[i + 2], Cp = C ? null : gruppi[i - 1], ms = A.m + B.m, am = (A.m * A.a + B.m * B.a) / ms, Ra = A.R, Rb = B.R, eF = Math.sqrt((2 * G * ms) / (Ra + Rb)) / vK(am);
          const [u1, u2, u3] = C ? [A, B, C] : Cp ? [Cp, A, B] : [];
          const x = u1 ? tempoIncrocio(u1.a, u2.a, u3.a, u1.m / Mst, u2.m / Mst, u3.m / Mst, u1.e, u2.e, u3.e, anno(u1.a), 3, giriCheRegge) : { tau: 0 };
          const b = Math.abs(B.a - A.a), tU = ((b * am * UA * UA) / (Math.PI * (Ra + Rb) ** 2) / 2) * anno(am), t0 = Math.max(A.t, B.t), tI = t0 + x.tau, tF = tI + tU;
          if (!(tF <= eta)) { A.fermo = true; dopo.push(A); continue; } // (a oggi non si sono ancora fusi: A resta com'è — dichiarato: non si riprova con l'altro vicino)
          const [gA, pA] = A.m >= B.m ? [A, B] : [B, A], fi = 2 * Math.PI * c(`embrione ${A.capo.id}/fusione con ${B.capo.id}`), en = (Math.sqrt(A.m * B.m) / ms) * eF;
          fusioni.push({ g: gA.capo.id, p: pA.capo.id, t: tF, Mg: gA.m, Mp: pA.m, Rg: gA === A ? Ra : Rb, Rp: gA === A ? Rb : Ra, a: am });
          for (const u of pA.lista) { u.laterale = true; gA.lista.push(u); }
          gA.lista.push({ bersaglioKg: gA.m, massaKg: pA.m, delta: 0, tIncrocio: tI, t: tF, aUA: am });
          const nuovo = { capo: gA.capo, m: ms, fe: A.fe + B.fe, h2o: A.h2o + B.h2o, a: am, t: tF, e: en, zr: en * Math.cos(fi), zi: en * Math.sin(fi), lista: gA.lista, membri: gA.membri, urti: A.urti + B.urti + 1 }; nuovo.R = R(nuovo); for (const o of pA.membri) nuovo.membri.push(o); dopo.push(nuovo);
          i++; fusi++;
        }
        gruppi = dopo; if (!fusi) break;
      }
      for (const g of gruppi) {
        const b = g.capo;
        if (g.membri.length > 1) {
          for (const o of g.membri) { if (o === b) continue; b.iso += o.iso; b.cibo += o.cibo; b.diffusi = (b.diffusi || 0) + (o.diffusi || 0); b.w += o.w; b.alGas += o.alGas; for (const x of o.orfani) b.orfani.push(x); b.misto ||= o.misto || o.freddo !== b.freddo; b.nato = (b.nato * b.m + o.nato * o.m) / (b.m + o.m); b.m += o.m; o.in = b.id; o.morto = true; }
          b.m = g.m; b.fe = g.fe; b.h2o = g.h2o; b.a = g.a; b.zr = g.zr; b.zi = g.zi; b.tz = g.t; b.lista = g.lista; b.urti = g.urti;
        }
        if (g.m >= minimo || gruppi.length < 2) escono.push(b); else b.detrito = true; // (sotto il minimo a oggi: un detrito)
      }
      j = k;
    }
    vivi = escono;
  }
  if (eta > D.vita && vivi.length > 40) {
    vivi.forEach((o, j) => { o.prima = vivi[j - 1] || null; o.dopo = vivi[j + 1] || null; });
    let N = vivi.length; const coda = [], su = (v) => { coda.push(v); let j = coda.length - 1; while (j > 0) { const h = (j - 1) >> 1; if (coda[h].k <= v.k) break; coda[j] = coda[h]; j = h; } coda[j] = v; };
    const giu = () => { const top = coda[0], v = coda.pop(); if (coda.length) { let j = 0; for (;;) { const l = 2 * j + 1, r = l + 1; let m2 = j; const km = (x) => (x === j ? v.k : coda[x].k); if (l < coda.length && coda[l].k < km(m2)) m2 = l; if (r < coda.length && coda[r].k < km(m2)) m2 = r; if (m2 === j) break; coda[j] = coda[m2]; j = m2; } coda[j] = v; } return top; };
    const metti = (p) => { const q = p?.dopo, r = q?.dopo; if (!r) return; const v = terna3(p, q, r, N, t); if (v.T <= eta) { v.k = v.T; su(v); } };
    const vale = (v) => !v.b[0].morto && v.b[0].dopo === v.b[1] && v.b[1].dopo === v.b[2] && v.b.every((o, j) => o.ver === v.ver[j]);
    for (const o of vivi) metti(o);
    while (N > 40 && coda.length && fatti < 150) {
      const v = giu();
      if (!vale(v)) continue;
      // (qui, senza teoria secolare, ogni coppia ha il suo orologio: l'incontro che comincia per primo si risolve subito, alla sua
      // fine, e i due corpi ne escono a quell'ora — fino ad allora sono occupati tra loro —; le terne che non li toccano vanno avanti
      // per conto loro. È l'orologio di Kimura, ma uno per coppia: un incontro lento non ferma il resto del disco [D])
      const x = esito(v.b[v.coppia], v.b[v.coppia + 1], v.T); if (!(x.tEvento <= eta)) continue; // (finisce dopo oggi: è ancora in corso)
      fatti++; applica(x); t = x.tEvento;
      // la catena: chi è uscito se ne va; chi si è spostato torna al suo posto
      const sinistra = x.p.prima; // (il vicino di dentro della coppia, prima di toccare la catena)
      for (const o of [x.p, x.q]) { o.ver++; if (o.prima) o.prima.dopo = o.dopo; if (o.dopo) o.dopo.prima = o.prima; }
      const vivo = [x.p, x.q].filter((o) => !o.morto); N -= 2 - vivo.length; let vicino = (x.p.prima && !x.p.prima.morto ? x.p.prima : null) || x.q.dopo || x.p.dopo;
      if (vicino?.morto) vicino = null; if (!vicino) vicino = vivi.find((o) => !o.morto && !vivo.includes(o));
      for (const o of vivo) { let w = vicino; while (w.prima && w.prima.a > o.a) w = w.prima; while (w.dopo && w.dopo.a < o.a) w = w.dopo;
        if (w.a < o.a) { o.prima = w; o.dopo = w.dopo; if (w.dopo) w.dopo.prima = o; w.dopo = o; } else { o.dopo = w; o.prima = w.prima; if (w.prima) w.prima.dopo = o; w.prima = o; } vicino = o; }
      // le terne nuove: quelle che hanno dentro un corpo toccato
      // (le terne che contengono un corpo toccato cominciano fino a due posti prima di lui; e chi stava a sinistra della coppia ha
      // un vicino nuovo: le terne che cominciano da lui e da quello prima)
      const nuove = new Set(); for (const o of vivo) { let w = o; nuove.add(w); for (let k = 0; k < 2 && w.prima; k++) { w = w.prima; nuove.add(w); } }
      if (sinistra && !sinistra.morto) { nuove.add(sinistra); if (sinistra.prima) nuove.add(sinistra.prima); }
      for (const w of nuove) metti(w);
    }
    vivi = vivi.filter((o) => !o.morto).sort((x, y) => x.a - y.a); for (const o of vivi) o.terna = null;
  }
  if (eta > D.vita && vivi.length >= 2) rifai();
  for (; eta > D.vita && fatti < 600 && vivi.length <= 40 && vivi.length >= 2; fatti++) {
    if (vivi.length < 2) terne = [];
    // (il prossimo evento è l'incontro che finisce per primo: mentre una coppia si cerca, il resto del sistema va avanti. Kimura
    // ha un orologio solo, che salta alla fine di ogni incontro: in un sistema lungo decine di UA un incontro lento fermerebbe
    // tutti gli altri [D])
    // (l'incontro si calcola solo per le terne che cedono prima della fine del migliore trovato: finisce sempre dopo l'incrocio)
    let x = null; for (const v of terne) if (v.x && (!x || v.x.tEvento < x.tEvento)) x = v.x;
    for (;;) { let pv = -1; for (let j = 0; j < terne.length; j++) { const v = terne[j]; if (!v.x && v.T <= eta && (pv < 0 || v.T < terne[pv].T)) pv = j; }
      if (pv < 0 || (x && terne[pv].T >= x.tEvento)) break;
      const v = terne[pv]; v.x = esito(v.b[v.coppia], v.b[v.coppia + 1], v.T); if (!x || v.x.tEvento < x.tEvento) x = v.x; }
    if (!x || !(x.tEvento <= eta)) break; // (nessun incontro finisce prima di oggi: quelli in corso restano in corso)
    applica(x); const { p, q, tEvento } = x;
    t = tEvento; for (const o of [p, q]) if (o.morto) vivi.splice(vivi.indexOf(o), 1);
    if (!vivi.every((o, j) => !j || vivi[j - 1].a <= o.a)) vivi.sort((x, y) => x.a - y.a); if (vivi.length >= 2) rifai();
  }
  // NESSUNA COPPIA SOTTO IL LIMITE DI HILL A OGGI. Due orbite più vicine di 2√3 raggi di Hill reciproci si incrociano entro poche
  // migliaia di giri (Gladman 1993, Icarus 106, 247 [R]: è il limite di stabilità di Hill di due pianeti): una coppia così non può
  // esserci all'età della stella. Se gli eventi l'hanno lasciata (un incontro che a oggi non era ancora finito), lo si chiude
  // adesso, con lo scontro o la diffusione di Kimura, all'età della stella. Contano i corpi da pianeta (sopra il minimo).
  if (eta > D.vita) for (let giro = 0; giro < 200; giro++) {
    const grandi = vivi.filter((o) => !o.morto && o.m >= P.minimo * MTERRA).sort((x, y) => x.a - y.a); let fatto = false;
    for (let i = 0; i + 1 < grandi.length; i++) { const p = grandi[i], q = grandi[i + 1], h = Math.cbrt((p.m + q.m) / (3 * Mst)) * 0.5 * (p.a + q.a);
      if ((q.a - p.a) / h >= 2 * Math.sqrt(3)) continue;
      const x = esito(p, q, eta); x.tEvento = eta; applica(x); fatto = true; break; }
    vivi = vivi.filter((o) => !o.morto).sort((x, y) => x.a - y.a); if (!fatto) break;
  }
  // l'eccentricità di oggi: quella secolare, all'età della stella
  if (eta > D.vita && vivi.length >= 2 && vivi.length <= 40) rifai();
  for (const b of vivi) if (eta > D.vita) cresci(b, eta);
  // (al primo ordine l'eccentricità secolare può passare 1: il perielio è sceso dentro la stella, e il corpo vi è caduto —
  // dichiarato: lì la teoria di Laplace e Lagrange non vale più da tempo)
  for (const b of vivi) { const zz = eta > D.vita ? zA(b, eta) : [b.zr, b.zi]; b.e = Math.hypot(zz[0], zz[1]); if (!(b.e < 1)) b.morto = true; }
  vivi = vivi.filter((b) => !b.morto);

  // i pianeti: quelli abbastanza grandi; il resto sono detriti (fasce di asteroidi e di comete)
  const terre = (m) => { const x = m / MTERRA; return (x < 10 ? x.toFixed(x < 1 ? 2 : 1) : String(Math.round(x))).replace('.', ','); };
  // la luce della stella OGGI (Sole di oggi = 1): il velo di gas di un pianeta si gonfia con il flusso che riceve adesso
  // (Lopez e Fortney 2014: la legge del raggio è data con il flusso di oggi e l'età); è la stessa luce che cosmo.js dà al clima
  const Loggi = stellaVera(D.massaStella, { Z: D.Z, eta }).L;
  // (per le perdite: la luce di sequenza principale al tempo del disco, che scala la luce dura del Sole giovane come prima, e la
  // luce della stella giovane a ogni tempo, che scalda il fuso dopo il gas: prima era quella sola, ferma al tempo del disco)
  const Lsequenza = stellaVera(D.massaStella, { Z: D.Z, eta: D.tDisco }).L, luceAllora = (t) => luceGiovane(D.massaStella, { Z: D.Z, eta: t }).L;
  // LA CATENA DEGLI ELEMENTI: di quali embrioni è fatto ogni pianeta (chi è caduto su chi: «in»), e quindi di quale roccia
  // (quella del luogo e della temperatura di ciascuno: elementi.js tabellaSolidi) e di quali ghiacci (la ricetta della
  // stella: acqua, e il carbonio e l'azoto gelati con lei; l'acqua portata dentro la neve dai corpi venuti da fuori ha la
  // stessa ricetta: sono ghiacci di comete). Il gas (giganti, veli) è il gas della stella, elemento per elemento.
  const radice = (o) => { let q = o; while (q.in != null) q = corpi[q.in]; return q; }, membri = new Map();
  for (const o of corpi) { const r = radice(o); if (!r.morto) { let l = membri.get(r.id); if (!l) membri.set(r.id, (l = [])); l.push(o); } }
  const ricettaGhiaccio = Object.fromEntries(Object.entries(D.solidi.ghiacci || {}).map(([k, v]) => [k, D.solidi.ghiaccio > 0 ? v / D.solidi.ghiaccio : 0]));
  const pianeti = vivi.filter((b) => b.m >= P.minimo * MTERRA && b.a >= 0.02).map((b) => {
    let sol = vettore(), ghi = vettore(), aria = vettore(), Tm = 0, mm = 0; const tutti = [], gigante = b.gas > 0.5 * b.m;
    // (il cibo mangiato dopo la nascita, diviso sulle strisce dei suoi embrioni; e i frammenti degli urti non ancora ripresi,
    // tolti a tutti in proporzione: la somma è la massa solida del corpo)
    const chi = membri.get(b.id) || [b], quota = b.accr > 0 ? b.accr / chi.reduce((x, o) => x + Math.max(0, o.cibo0 || 0), 0) : 0, grezzo = chi.reduce((x, o) => x + o.m0 + quota * Math.max(0, o.cibo0 || 0), 0), scala = grezzo > 0 ? (b.m - b.gas) / grezzo : 1;
    for (const o of chi) { const mo = (o.m0 + quota * Math.max(0, o.cibo0 || 0)) * scala, roccia = mo * (1 - o.acqua0), g = mo * o.acqua0, r = vettore(), gh = vettore(), fu = vettore(); D.rocciaNata(r, roccia, o.r0); for (const k in ricettaGhiaccio) gh[IDX[k]] += g * ricettaGhiaccio[k];
      // (la parte della sua roccia nata dopo il suo isolamento e fusa dall'²⁶Al da sola: elementi.js EVAPORA_PLANETESIMI. Solo dentro la
      // neve: in un planetesimo di ghiaccio il calore dell'²⁶Al scioglie il ghiaccio e l'acqua che circola lo porta via, e la roccia
      // non fonde — i corpi d'origine delle condriti carbonacee, alterati dall'acqua e mai fusi: Grimm e McSween 1989; Travis e
      // Schubert 2005 [R] —)
      if (!o.freddo) D.rocciaFusa(fu, roccia, o.r0, o.tIso);
      for (let i = 0; i < SIMBOLI.length; i++) { sol[i] += r[i]; ghi[i] += gh[i]; } Tm += o.T * o.m0; mm += o.m0;
      // (R: con il ferro suo, di quando è nato — fe0 —: «fe» cresce con chi gli cade addosso, e un embrione che ne ha preso molto
      // veniva col raggio negativo, e le perdite di quel pianeta con NaN)
      if (!gigante) tutti.push({ id: o.id, roccia: r, ghiacci: gh, fusa: fu, t: o.tIso, T: o.T, a: o.nato, R: raggioPianeta({ massaKg: o.m0, ferro: o.fe0 / Math.max(o.m0, 1e-30), ghiaccio: o.acqua0 }) }); }
    // LE PERDITE DURANTE L'ACCRESCIMENTO (elementi.js perditeAccrescimento): gli embrioni fusi liberano i volatili, gli urti e la
    // fuga portano via una parte di ciò che è fuori; ciò che parte va nello spazio (un serbatoio del libro dei conti) e il
    // pianeta pesa di meno. (I giganti no: la roccia resta il loro nucleo, sotto il gas.)
    const perdite = gigante ? null : perditeAccrescimento({ membri: tutti, fusioni, tGas: D.vita, eta, L: Lsequenza, Lt: luceAllora, radice: b.id, miscela: D.miscela });
    let perso = 0, persoGhiacci = 0;
    if (perdite) { sol = perdite.roccia; for (let i = 0; i < SIMBOLI.length; i++) { persoGhiacci += ghi[i] - perdite.ghiacci[i]; perso += perdite.spazio[i]; } ghi = perdite.ghiacci; }
    if (b.gas > 0) for (let i = 0; i < SIMBOLI.length; i++) aria[i] = b.gas * (D.miscela[SIMBOLI[i]] || 0);
    let Mr = 0; for (let i = 0; i < SIMBOLI.length; i++) Mr += sol[i];
    // IL PIANETA SI SEPARA (elementi.js differenzia): metallo e silicato all'equilibrio sul fondo dell'oceano di magma; il
    // nucleo che ne esce è il «ferro» del pianeta (per i giganti la roccia resta il loro nucleo, senza separarsi)
    // (la parte di ghiaccio è quella degli elementi dei ghiacci che restano: la stessa materia che il libro dei conti di elementi.js
    // conta; prima era b.h2o, che con la crescita dal cibo e i frammenti degli urti non coincide più con la somma dei membri)
    let Mg = 0; for (let i = 0; i < SIMBOLI.length; i++) Mg += ghi[i];
    const massa = b.m - perso, solidi = massa - b.gas, gas = b.gas / massa, ghiaccio = Mg / solidi;
    const sep = gas > 0.5 || !(Mr > 0) ? null : differenzia(sol, { M: Mr, R: raggioPianeta({ massaKg: Mr, ferro: b.fe / solidi }), rhoNucleo: STORIA.rhoNucleo });
    let Mc = 0; if (sep) for (let i = 0; i < SIMBOLI.length; i++) Mc += sep.nucleo[i];
    // I VOLATILI DEI GHIACCI: la parte che il pianeta ha liberato in superficie (leggi.js PARTE_FUORI; nei mondi di ghiaccio
    // tutta) e quella rimasta dentro; di questa il CARBONIO, che è siderofilo, si divide tra metallo e silicato come gli altri
    // (D in massa, elementi.js D_MASSA.C): la parte nel nucleo non tornerà mai fuori coi vulcani
    const fuori = tipoDi(gas, ghiaccio) === 'ghiacciato' ? 1 : PARTE_FUORI, ghiFuori = vettore(), ghiDentro = vettore();
    for (let i = 0; i < SIMBOLI.length; i++) { ghiFuori[i] = ghi[i] * fuori; ghiDentro[i] = ghi[i] - ghiFuori[i]; }
    if (sep && Mc > 0) { const Ms = Mr - Mc, q = (D_MASSA.C * Mc) / Math.max(Ms, 1e-30), c = (ghiDentro[IDX.C] * q) / (1 + q); ghiDentro[IDX.C] -= c; sep.nucleo[IDX.C] += c; Mc += c; }
    const ferro = sep ? Mc / solidi : b.fe / solidi;
    const tipo = tipoDi(gas, ghiaccio), involucro = tipo === 'gassoso' || gas < 0.005 ? 0 : gas;
    const raggioM = raggioPianeta({ massaKg: massa, ferro, ghiaccio, gas: tipo === 'gassoso' ? gas : involucro, flusso: Loggi / (b.a * b.a), eta });
    // di che cosa è fatto. Il gas di un gigante è quello della stella: idrogeno ed elio (71 a 27, la miscela misurata
    // del Sole) con i suoi metalli; i «pesanti» sono quelli più il nucleo
    const metGas = 1 - D.miscela.H - D.miscela.He, h = D.miscela.H / (D.miscela.H + D.miscela.He); // (i metalli e l'idrogeno del gas di QUESTA stella)
    const pesanti = tipo === 'gassoso' ? Math.min(0.5, solidi / massa + gas * metGas) : 0;
    const composizione = tipo === 'gassoso' ? { idrogeno: (1 - pesanti) * h, elio: (1 - pesanti) * (1 - h), pesanti }
      : tipo === 'ghiacciato' ? { ghiaccio, roccia: 1 - ghiaccio - ferro, ferro } : { ferro, roccia: 1 - ferro - ghiaccio, acqua: ghiaccio };
    // (gli elementi del pianeta, non enumerabili: viaggiano con la composizione — chimica.js, mare.js, il libro dei conti di
    // elementi.js li leggono — e chi la elenca o la somma vede le tre parti di sempre). Masse in kg.
    Object.defineProperty(composizione, 'elementi', { value: Object.freeze({ solidi: sol, acqua: ghi, acquaFuori: ghiFuori, acquaDentro: ghiDentro, involucro: b.gas > 0 ? aria : null, spazio: perdite ? perdite.spazio : null, perdite: perdite ? { urti: perdite.urti, fuga: perdite.fuga, negliUrti: perdite.negliUrti, evaporato: perdite.evaporato, planetesimi: perdite.planetesimi, solidificato: perdite.solidificato } : null, nucleo: sep ? sep.nucleo : sol, silicato: sep ? sep.silicato : vettore(),
      separazione: sep ? { P: sep.P, T: sep.T, deltaIW: sep.deltaIW } : null, stella: D.miscela, Tformazione: mm > 0 ? Tm / mm : null, simboli: SIMBOLI,
      // (quanta parte della massa dei ghiacci è acqua: il resto è il CO e l'NH3 gelati con lei. leggi.js e chimica.js contano
      // l'acqua del pianeta con questa: prima la massa intera dei ghiacci passava per acqua, e il mare ne aveva un terzo di troppo)
      quotaAcqua: D.solidi.quotaAcqua, ghiaccioPerAcqua: D.solidi.perAcqua }), enumerable: false });
    const eccentricita = b.e; // (quella secolare di oggi: vedi gli urti giganti)
    const dopo = b.scacciati ? `; ha scacciato ${b.scacciati === 1 ? 'un vicino' : `${b.scacciati} vicini`}` : '';
    const storia = tipo === 'gassoso' ? `un nucleo di ${terre(b.nucleo)} Terre, pronto in ${(b.tGas / 1e6).toFixed(1).replace('.', ',')} milioni di anni, ha catturato il gas a valanga prima che il disco svanisse${dopo}`
      : involucro ? `un nucleo di ghiaccio di ${terre(solidi)} Terre arrivato tardi: il disco è svanito prima della valanga, gli è rimasto un velo di gas${dopo}`
        : b.urti ? `${b.urti === 1 ? 'un urto gigante' : `${b.urti} urti giganti`} tra embrioni nati attorno a ${b.nato.toFixed(2).replace('.', ',')} UA${b.misto ? ', a cavallo della linea della neve: roccia e ghiaccio insieme' : ''}${dopo}`
          : `un embrione ${b.freddo ? 'di ghiaccio' : 'di roccia'} rimasto solo${b.m < 0.99 * b.mIso ? ', cresciuto piano: il suo cibo è ancora in giro' : ', che ha mangiato tutta la sua striscia di disco'}${dopo}`;
    const formazione = { embrione: b.id, urti: b.lista.slice().sort((x, y) => x.tIncrocio - y.tIncrocio), cibo: Math.max(0, b.cibo), tGas: D.vita, mIso: b.iso, tIso: b.tIso, nato: b.nato, scacciati: b.scacciati, orfani: b.orfani, massaAlGas: b.alGas, misto: b.misto, diffusioni: b.diffusioni || 0, vernice: b.vernice || 0, cibiDiffusi: b.diffusi || 0 };
    return Object.defineProperty({ aUA: b.a, massaKg: massa, raggioM, tipo, composizione, eccentricita, storia, involucro }, 'formazione', { value: formazione, enumerable: false });
  });
  // (le perdite dell'accrescimento tolgono un poco di massa: chi scende sotto il minimo resta tra i detriti)
  for (let i = pianeti.length - 1; i >= 0; i--) if (pianeti[i].massaKg < P.minimo * MTERRA) pianeti.splice(i, 1);
  // le orbite di oggi non si incrociano: se due si toccassero, i detriti le avrebbero già arrotondate
  for (let i = 0; i + 1 < pianeti.length; i++) {
    const p = pianeti[i], q = pianeti[i + 1], spazio = 0.8 * (q.aUA - p.aUA), serve = p.aUA * p.eccentricita + q.aUA * q.eccentricita;
    if (serve > spazio) { p.eccentricita *= spazio / serve; q.eccentricita *= spazio / serve; }
  }
  return pianeti;
}
