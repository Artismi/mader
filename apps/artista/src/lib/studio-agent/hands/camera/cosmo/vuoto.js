// vuoto.js — CHE COSA C'È TRA LE STELLE E TRA I PIANETI. Zoomando nel vuoto qualcosa si trova: che cosa, quanto, e
// perché, discende dalle stesse leggi del resto (galassie.js, stelle.js, disco.js, impatti.js, materia.js). Niente è
// messo a mano e niente è tarato sulla Via Lattea o sul Sistema Solare: i riscontri (test/test_vuoto.mjs) si stampano
// come escono, e ciò che non torna è elencato qui sotto.
//
// I PEZZI (ognuno con la sua intestazione, le sue fonti e i suoi conti):
//   vuoto_mezzo.js    a. contenuto(forma, punto, t): il mezzo interstellare in un punto di una galassia — il gas per
//                        fase, la polvere, la luce, il campo, i raggi cosmici, il fondo; massaDelGas(forma) lo ricontra;
//   vuoto_oggetti.js  b. oggettiIn(forma, regione, t): nubi molecolari (e oscure), regioni H II, nebulose a riflessione,
//                        nebulose planetarie, resti di supernova, come eventi con indirizzo, pigri, con la nebbia;
//   vuoto_sistema.js  c. vaganti(forma, r), incontri(forma, r): oggetti interstellari, pianeti vaganti, stelle di passaggio;
//                     d. corpiMinori(sistema, t): fasce, taglie, risonanze, nube esterna, comete, polvere, vento, proiettili;
//   qui               e. quantoVuoto(luogo), piuVicino(luogo, tipo): quanti atomi, fotoni, grani in un metro cubo, e a
//                        che distanza sta la cosa più vicina di ogni tipo, a ogni scala;
//                     f. scenaVuoto(dove, t): i dati per il motore 3D, nella forma delle scene di spazio3d.js.
// Marche delle fonti in tutti i file: [V] letta sulla fonte ora · [R] ricordata (da verificare) · [D] derivata qui.
// (Quasi tutte le costanti di letteratura sono [R]: non rilette. [V], lette ora sui riassunti di arXiv: la durata delle
//  nebulose planetarie (Jacob, Schönberner & Steffen 2013, arXiv:1307.6189: 42 km/s, 0,9 pc in 21000 ± 5000 anni) e tre
//  RISCONTRI: la ionizzazione dall'H₃⁺ (Indriolo & McCall 2012, arXiv:1111.6936: ζ₂ = 3,5·10⁻¹⁶ s⁻¹, da 1,7 a 10,6), gli
//  oggetti interstellari (Do, Tucker & Tonry 2018, arXiv:1801.02821: 0,2 per UA³), le stelle di passaggio (Bailer-Jones
//  et al. 2018, arXiv:1805.07581: 19,7 ± 2,2 per milione di anni entro 1 pc). Di Blitz & Rosolowsky 2006 il riassunto
//  conferma solo «quasi lineare con la pressione»: esponente e P₀ restano [R]. [V] vale anche per ciò che è letto nel codice.)
//
// LA FORMA DEI DATI
//   contenuto(forma, { r, z, fi | fase }, t) → {
//     dove: { r, z, fi, anello, faseBraccio (−½…½), sulBraccio },
//     gas: { densita (kg/m³), nH (atomi di H per m³), molecolare (parte in massa),
//            pressione: { termica (Pa), suK (K/cm³), peso (Pa: il peso dello strato), min, max (K/cm³: tra questi due le fasi coesistono) },
//            fasi: [{ nome: 'molecolare freddo' | 'atomico freddo' | 'atomico tiepido' | 'ionizzato tiepido' | 'caldo',
//                     stato, n (H per m³ DENTRO la fase), T (K), volume (parte), massa (parte), ionizzato (elettroni per H) }],
//            chiusura (Σ volume·n / nH: 1) },
//     alone: { nH, T } (il gas caldo dell'alone di galassie.js: c'è anche fuori dal disco),
//     polvere: { densita, suGas, grani (per m³), taglie, AVperAtomo (mag·m²), AVperMetro, RV, T },
//     radiazione: { G0 (unità di Habing), ultravioletta, stelle (J/m³), fotoniStelle (per m³), ionizzanti (per m²·s), sfr },
//     campo: { B (tesla), incerto: [B/2, 2B] }, cosmici: { relativo, numero (per m³), energia (J/m³), ionizzazione (per H·s), spettro(E) },
//     fondo: { T, fotoni (per m³), energia }, perMetroCubo: { atomi, elettroni, fotoniFondo, fotoniStelle, grani, cosmici }, nubeTipica }
//   oggettiIn(forma, { centro: [x, y, z] kpc, raggio kpc }, t, { caso, catalogo, massimo }) → { oggetti: [{ tipo, indirizzo,
//     pos (kpc), raggio (m), …, emette: { righe: [{ nome, nm, W }], continuo, colore: [r, g, b] | null } }], nebbia: { tipo: { veri, mostrati, soglia } } }
//   corpiMinori(sistema, t, { caso, attorno }) → { fasce, esaurite, nube, comete, polvere, vento(rM), flusso, espulso, corpi }
//   scenaVuoto({ sistema, caso, attorno }, t) → (tutto in metri, watt, secondi; gli elementi delle orbite valgono a t = 0)
//     corpi[]:  { cosa, id, pos, vel, raggio, massaKg, colore, albedo (geometrico), albedoDiBond, fase: { legge: 'HG', G }, fascia,
//                 orbita: { a, e, inclinazione, nodo, pericentro, M0, epoca, motoMedio, assi, periodo } }
//     fasce[]:  { nome, interno, esterno, spessore, sigma (rad: larghezza in latitudine dei corpi), massaKg, veri, mostrati,
//                 colore, albedo, fase, polvere: null | { tau, massaKg, raggioGrano, sigma }, risonanze }
//     comete[]: { id, pos, vel, raggio, orbita (come i corpi, più perielio e tPerielio), attivita (0…1), accesa, acquaKgS,
//                 molecoleS, velocitaGas, vitaAcqua, nucleo: { raggio, albedo, colore, fase: { legge: 'lineare', magPerGrado }, densita },
//                 lumen, magnitudineA1UA,
//                 chioma: { raggio, colore, righe: [{ nome, nm, W, molecole }] (C₂, CN, C₃), W, polvere: { sezione (m²), W, colore } },
//                 codaIoni: { direzione, lunghezza, velocita, colore, righe: [{ nome: 'CO⁺', nm, W, molecole }], W, ioni },
//                 codaPolvere: { kgS, suGas, taglie: { esponente, aMin, aMax }, albedo, fase, densitaGrano, eta: [s], direzione, colore,
//                                sindine: [{ raggioGrano, beta, uscita (m/s), kgS, perSecondo, soffiato, punti: [{ eta, pos, attivita, larghezza }] }],
//                                linee (come prima: 1, 10, 100 µm a 3, 10, 30 giorni) } }
//     polvere:  { sezione(r, lat) (m²/m³), in(r, lat) (kg/m³), grani(r, lat) (per m³), tau(r), raggioGrano(r), bordoInterno,
//                 bordoGhiaccio, albedo, fase: { g, pesi, in(θ) }, grano: { densita, indice: { n, k } }, versoLaStellaKgS, daCometeKgS,
//                 fasce: [{ nome, interno, esterno, sigma, tau, massaKg, raggioGrano, tauBordo, profilo(r) → { tau, massa, numero, raggioGrano } }],
//                 luceZodiacale({ rOss, elongazione }) → { brillanza (W/m²/sr), suStella } }
//   Tempi: t in SECONDI da oggi (come spazio3d.js). Distanze nella galassia in kpc (come galassie.js); nel sistema in metri.
//
// CHE COSA SI DERIVA [D] E CHE COSA SI PRENDE [R] (in breve; i numeri stanno in MEZZO, LARSON, OGGETTI, SISTEMA)
//   derivato: la curva a due fasi P(n) dal pareggio tra riscaldamento e raffreddamento (Field, Goldsmith & Habing; i
//     TASSI sono presi: Bakes & Tielens, Draine, Weingartner & Draine); la luce delle stelle e G₀ dalle stelle nate
//     nell'anello (stelle.js come corpi neri) in uno strato che assorbe; ζ, densità ed energia dei raggi cosmici dallo
//     spettro di materia.js; il campo dall'equipartizione; il volume del gas caldo dai resti di supernova di qui (la
//     porosità di McKee & Ostriker); il gas ionizzato diffuso dal bilancio dei fotoni; l'estinzione dalle taglie dei grani
//     (MRN + ottica di van de Hulst); la massa massima delle nubi (Jeans del disco) e la minima (dove la turbolenza
//     diventa subsonica); Strömgren, la zona dell'O⁺⁺, le righe; le fasi di un resto (le prime due SONO quelle di
//     galassie.js); la pendenza delle cascate; la nube esterna; chioma e code; β e Poynting–Robertson; il più vicino;
//   preso: la parte molecolare dalla pressione (Blitz & Rosolowsky 2006); la pressione di equilibrio √(P_min·P_max)
//     (Wolfire et al. 2003); temperatura, parte di fotoni che sfugge e altezza del gas ionizzato diffuso (Reynolds); le
//     relazioni di Larson (Solomon et al. 1987) e la pendenza −1,6 delle masse delle nubi; la vita delle nubi (25 Ma) e
//     l'1% per caduta libera; durata e massa di una nebulosa planetaria; la resa in Hβ di un urto radiativo; il calcio di
//     un pianeta a una cometa; i coefficienti delle risonanze; albedo e densità di un nucleo; le vite delle molecole.
// PARAMETRI LIBERI (scelte nostre, da sapere): il lato delle celle (¼ kpc: cambia gli indirizzi, non i numeri); il
//   taglio dei raggi cosmici a 1 MeV; un solo materiale «medio» per i grani (n = 1,7, k = 0,1, 3000 kg/m³); le epoche
//   di dieci anni per le comete; il grano di 100 µm per la polvere zodiacale. Nessuno è stato regolato guardando un riscontro.
//
// DOPPIONI (regola 7) — da sistemare a monte, qui solo segnalati (vedi anche il rapporto delle prove):
//   · (risolto: lo spettro interstellare dei raggi cosmici ora si legge da materia.js, `spettroInterstellare`: nessuna copia qui)
//   · risalita.js DATI: COSMICI_GALASSIA (1 eV/cm³, scritto), SN_VIA_LATTEA (0,02/anno), VITA_RESTO (3·10⁴ anni),
//     SPESSORE_DISCO (100 pc), RAGGIO_VIA_LATTEA (15 kpc): le stesse grandezze che qui escono da materia.js e galassie.js;
//     materia.js cieloRelativo ripete 0,02 e 15 kpc;
//   · la nana bianca appena nata (Mestel) e la temperatura viriale sono formule private di galassie.js, qui riscritte;
//   · la stima «quanti sassi restano orfani» è di impatti.js (nubeOrfana, privata): qui riscritta per le fasce che
//     impatti.js non segue perché non arrivano a nessun pianeta.
// CHE COSA MANCA A MONTE (perché qui torni di più):
//   · galassie.js: lo strato di gas ha spessore fisso (LEGGI.spessoreGas = 0,1 kpc), non quello dell'equilibrio
//     idrostatico con la sua stessa dispersione (verrebbe ~0,2 kpc a 8 kpc, e si svaserebbe in fuori); non c'è lo
//     strato alto di gas ionizzato (~1 M☉/pc², alto 1 kpc); l'alone caldo isotermo (ρ ∝ r⁻²) ha a 8 kpc una pressione
//     più alta di quella del disco; le stelle giganti non ci sono (stelle.js: per le planetarie la stella centrale è la
//     nana bianca di Mestel, non una traccia vera); le supernove recenti non hanno altezza sul piano;
//   · disco.js: non restituisce i corpi sotto 0,02 Terre né i solidi oltre l'ultimo pianeta; niente migrazione;
//   · impatti.js: non espone il ritmo di polvere di oggi, né le orbite delle comete che i giganti portano dentro;
//   · materia.js: i raggi cosmici sono uniformi in tutta la galassia (nessun calo verso il bordo).
// CHE COSA NON TORNA (stampato dalle prove, con il numero):
//   · la ionizzazione dei raggi cosmici viene 1,7·10⁻¹⁷ per atomo e per secondo vicino al Sole: è il valore «classico»
//     (Spitzer & Tomasko 1968), ma l'H₃⁺ nelle nubi diffuse ne chiede ~1,5·10⁻¹⁶ (Indriolo & McCall 2012: ζ₂ = 3,5·10⁻¹⁶
//     per molecola): è una discordanza nota anche nel mondo vero (i raggi cosmici sotto il MeV non li misura nessuno).
//     Con così pochi elettroni e un campo ultravioletto 1,5 volte quello misurato, la pressione delle due fasi viene
//     2–3 volte quella vera (3800 K/cm³), e il gas atomico freddo viene poco;
//   · i fotoni ionizzanti per stella nata sono il doppio dei veri (stelle come corpi neri);
//   · gli oggetti interstellari: tre ordini di grandezza meno della stima da 1I/'Oumuamua (lo sono anche nei modelli veri);
//   · le fasce: quelle interne sono quasi tutte esaurite a 4,5 miliardi di anni (impatti.js lo dichiara: manca Yarkovsky),
//     quelle esterne pesano decine di Terre (manca la migrazione); gli urti di oggi sui mondi di roccia dieci volte meno dei veri.
//     LA POLVERE A 1 UA: 6 volte la nostra in massa, 25 in profondità ottica, 40 nella luce zodiacale (mediane di 12
//     sistemi). Viene tutta dalla parte RIMESCOLATA dei resti attorno ai pianeti esterni lenti (impatti.js rimastaKg:
//     ~200 fasce degli asteroidi, a eccentricità 0,3): le decine di Terre ferme non si macinano e non ne fanno. (Prima
//     veniva 4·10⁵ volte: mancavano gli urti tra i grani mentre scendono, ora ci sono: polvereDellaFascia.) (Le STESSE leggi, con la massa vera della fascia degli
//     asteroidi, danno invece numeri giusti: 440 corpi sopra 100 km, urti distruttivi ogni 4,6 miliardi di anni, 10⁴ kg/s di polvere.)
//   · la pendenza dell'estinzione: R_V = 3,8 invece di 3,1 (un solo materiale per i grani, ottica approssimata).
// I COLORI DELLE NEBULOSE, da sapere. `coloreVero` è quello dell'OCCHIO (CIE 1931), che a 501 nm è quattro volte più
//   sensibile che a 656: una regione H II è rosa finché [O III]/Hβ sta sotto ~0,8, sbiadisce attorno a 1, ed è verde-azzurra
//   sopra ~1,5 (così si vede Orione al telescopio; nelle fotografie è rossa perché i sensori pesano Hα molto più
//   dell'occhio). Le righe in watt ci sono tutte (`emette.righe`): chi disegna può pesarle come vuole, e lo dica.
//   Quanto vale [O III]/Hβ non è scelto: esce dalla stella (quanto O⁺⁺), dalla densità e dal termostato del gas
//   (vuoto_oggetti.js NEBULA): con i metalli del Sole 0,03–5 (mediana 0,9 attorno alle stelle O, T_e 7000–9000 K), quasi
//   zero con tre volte tanti metalli (gas a 2–3 mila K: lì il limite di bassa densità lo fa troppo freddo, il vero è 4–5 mila).
// DA DOVE VENGONO LE NEBULOSE NELLE GALASSIE DI cosmo.js: dagli anelli di galassie.js. Dove un anello non fa nascere
//   stelle (forma.interno.nati = 0) non ci sono regioni H II né nebulose a riflessione, anche se c'è gas e ci sono nubi;
//   la nebbia NON taglia il disco esterno (tiene la stessa parte di ogni cella: provato). Nelle galassie di cosmo 1 gli
//   anelli arrivano a 70–140 kpc (5–10 kpc l'uno) e le stelle nascono solo nel primo, con metalli 3–4 volte il Sole:
//   per questo lì tutte le regioni H II stanno entro 2–4 kpc e sono rosa. È a monte (galassie.js), qui solo segnalato.
// I COSTI (misurati in test_vuoto.mjs): contenuto() ~10 µs a punto (più ~25 ms la prima volta in ogni anello: la curva
//   termica); il censimento di una galassia ~0,3 s una volta; oggettiIn ~0,3–0,5 µs per cella toccata e per tipo più
//   ~5 µs per oggetto: 2 ms in una sfera di 50 pc, ~0,15 s per tutta una galassia come la nostra con la nebbia (55 mila
//   celle), SECONDI per tutto il disco di una gigante (10⁶ celle: lì conviene guardare a pezzi); corpiMinori ~0,1–0,3 s la
//   prima volta (è la storia degli impatti di impatti.js, pianeta per pianeta) poi ~1 ms; vaganti ~1,3 s una volta per anello.
// ANCORA DA SAPERE: attorno a una nana bianca le fasce stanno dov'erano (cosmo.js allarga le orbite dei pianeti quando la
//   stella perde massa: qui no); quantoVuoto in un sistema non dà i raggi cosmici (li frena il vento: è materia.js, raggiCosmici).
import { COSTANTI, MSOLE, UA } from './leggi.js';
import * as ST from './stelle.js';
import { LEGGI, ANELLI, popolazione, COSMOLOGIA, dentro as GAL } from './galassie.js';
import { sorgente } from './eventi.js';
import { MEZZO, KPC, GA_S, contenuto, quadro, coloreVero } from './vuoto_mezzo.js';
import { oggettiIn, densitaOggetti } from './vuoto_oggetti.js';
import { corpiMinori, vaganti, ventoA } from './vuoto_sistema.js';

export * from './vuoto_mezzo.js';
export * from './vuoto_oggetti.js';
export * from './vuoto_sistema.js';

const K = COSTANTI, PI = Math.PI, PI4 = 4 * PI;

// =====================================================================================================
// e. QUANTO È VUOTO IL VUOTO
// =====================================================================================================
// la distanza attesa dal più vicino di una popolazione sparsa a caso con densità n (per m³): Γ(4/3)·(3/4πn)^(1/3) =
// 0,554·n^(−1/3) [D: Poisson in tre dimensioni]. Se sta in uno strato più sottile di quella distanza (mezzo spessore h)
// conta la densità di superficie: 1/(2·√(n·2h)) [D: Poisson in due dimensioni]
const GAMMA43 = 0.8929795116;
export function distanzaDelPiuVicino(n, h = Infinity) {
  if (!(n > 0)) return { distanza: Infinity, come: 'non ce ne sono' };
  const d3 = GAMMA43 * Math.cbrt(3 / (PI4 * n)); if (d3 <= h) return { distanza: d3, come: 'nello spazio' };
  return { distanza: 0.5 / Math.sqrt(n * 2 * h), come: 'nel piano del disco' };
}
// il cosmo in media (galassie.js COSMOLOGIA, dalle costanti di leggi.js): barioni per m³, fotoni del fondo, galassie
function cosmoMedio(t = 0) {
  const U = COSMOLOGIA, a = U.scala(GAL.T0 + t / GA_S), rhoB = (U.fb * U.Om * U.rhoC * MSOLE) / KPC ** 3 / a ** 3, Tf = MEZZO.Tfondo / a;
  const fotoni = 16 * PI * 1.2020569 * Math.pow((K.kB * Tf) / (2 * PI * K.hbar * K.c), 3), MPC3 = (1e3 * KPC) ** 3;
  return { a, barioni: (rhoB * (1 - ST.DATI.YPRIMO)) / K.mp + (rhoB * ST.DATI.YPRIMO) / (4 * K.mp) /* atomi: idrogeno ed elio del Big Bang */, densita: rhoB, fotoniFondo: fotoni, Tfondo: Tf,
    galassie: (massaAlone = 1e11) => U.aloni(massaAlone) / MPC3 /* aloni più pesanti di così, per m³ (Press & Schechter: galassie.js) */ };
}
// QUANTE COSE IN UN METRO CUBO. luogo è uno di:
//   { forma, r, z, fi | fase }          un punto di una galassia (kpc);
//   { sistema, rM, caso, attorno }      a rM metri dalla stella di un sistema;
//   { cosmo: true }                     lo spazio tra le galassie, in media.
// → { dove, atomi, ioni (protoni liberi), elettroni, fotoni: { fondo, stelle }, grani, cosmici (per m³), temperatura (K), nota,
//     … } (per la galassia anche `fasi`: gli stessi conti dentro ogni fase, con la parte di volume: dove ti trovi più spesso)
export function quantoVuoto(luogo = {}, t = 0) {
  if (luogo.sistema) {
    const Sis = luogo.sistema, m = corpiMinori(Sis, t, { caso: luogo.caso || sorgente('sistema'), attorno: luogo.attorno ?? null, massimo: 0 }), rM = luogo.rM ?? UA, v = m.vento(rM), st = m.stella, c = cosmoMedio(t);
    // la luce della stella: fotoni per m³ = L/(4πr²·c·⟨hν⟩), ⟨hν⟩ = 2,70·kT (corpo nero) [D]
    const fotoniStella = st.Lw > 0 && st.T > 0 ? st.Lw / (PI4 * rM * rM * K.c * 2.701 * K.kB * st.T) : 0;
    return { dove: `a ${(rM / UA).toPrecision(3)} UA dalla stella`, atomi: 0, ioni: v.protoni, elettroni: v.protoni, fotoni: { fondo: c.fotoniFondo, stelle: fotoniStella }, grani: m.polvere.graniA(rM), polvere: m.polvere.densitaA(rM), cosmici: null, velocitaVento: v.velocita,
      nota: 'il vento della stella (risalita.js) spazza via il gas della galassia: qui ci sono i suoi protoni; i grani sono quelli che scendono dalle fasce' };
  }
  if (luogo.cosmo) { const c = cosmoMedio(t); return { dove: 'tra le galassie, in media', atomi: c.barioni, ioni: c.barioni, elettroni: c.barioni, fotoni: { fondo: c.fotoniFondo, stelle: 0 }, grani: 0, cosmici: null, temperatura: null, nota: 'la densità media dei barioni (Ω_b); quasi tutti ionizzati. Di fotoni del fondo ce ne sono un miliardo e mezzo per ogni atomo' }; }
  const c = contenuto(luogo.forma, luogo, t), p = c.perMetroCubo, ioniDi = (f) => f.n * Math.min(1, f.ionizzato);
  const fasi = c.gas.fasi.filter((f) => f.volume > 0).map((f) => ({ nome: f.nome, volume: f.volume, atomi: f.n * 1.1, ioni: ioniDi(f), elettroni: f.n * f.ionizzato, T: f.T })).sort((x, y) => y.volume - x.volume);
  return { dove: `a ${c.dove.r.toPrecision(3)} kpc dal centro, ${Math.round(c.dove.z * 1e3)} pc sopra il piano`, atomi: p.atomi, ioni: c.gas.fasi.reduce((s, f) => s + f.volume * ioniDi(f), 0), elettroni: p.elettroni, fotoni: { fondo: p.fotoniFondo, stelle: p.fotoniStelle }, grani: p.grani, cosmici: p.cosmici,
    fasi, piuProbabile: fasi[0] || null, contenuto: c, nota: 'media sulle fasi; `fasi` dice che cosa c\'è dentro ognuna e che parte dello spazio occupa' };
}
// A CHE DISTANZA STA IL PIÙ VICINO di un tipo. luogo come per quantoVuoto; tipo: nella galassia 'stella', 'nube molecolare',
// 'nube molecolare gigante', 'regione H II', 'nebulosa a riflessione', 'nebulosa planetaria', 'resto di supernova',
// 'oggetto interstellare', 'pianeta vagante', 'atomo', 'grano', 'fotone'; in un sistema 'corpo di una fascia' (più grande
// di opz.diametro, default 1 km, nella fascia più vicina a rM), 'cometa attiva', 'protone', 'grano'; nel cosmo 'galassia', 'atomo'.
// Senza tipo: tutti. → { tipo, densita (per m³), distanza (m), come }
export function piuVicino(luogo = {}, tipo = null, opz = {}) {
  const uno = (nome, n, h = Infinity, extra = {}) => ({ tipo: nome, densita: n, ...distanzaDelPiuVicino(n, h), ...extra }), out = [];
  if (luogo.sistema) {
    const m = corpiMinori(luogo.sistema, opz.t ?? 0, { caso: luogo.caso || sorgente('sistema'), attorno: luogo.attorno ?? null, massimo: 0 }), rM = luogo.rM ?? UA, D = opz.diametro ?? 1e3, q = quantoVuoto(luogo, opz.t ?? 0);
    const f = m.fasce.slice().sort((x, y) => Math.abs(x.a - rM) - Math.abs(y.a - rM))[0];
    if (f) out.push(uno('corpo di una fascia', f.taglie.sopra(D) / f.volume, Infinity, { fascia: f.nome, diametro: D, dentro: rM >= f.a1 && rM <= f.a2 }));
    if (m.comete) out.push(uno('cometa attiva', (m.comete.nuoveAllAnno * 1) / ((PI4 / 3) * m.comete.entro ** 3), Infinity, { nota: 'quelle che passano in un anno dentro la sfera in cui si accendono (ordine di grandezza)' }));
    out.push(uno('protone', q.ioni), uno('grano', q.grani), uno('fotone', q.fotoni.stelle + q.fotoni.fondo));
  } else if (luogo.cosmo) { const c = cosmoMedio(opz.t ?? 0); out.push(uno('galassia', c.galassie(opz.massaAlone ?? 1e11)), uno('atomo', c.barioni), uno('fotone', c.fotoniFondo)); }
  else {
    const forma = luogo.forma, r = luogo.r ?? 8, d = densitaOggetti(forma, r), h = LEGGI.spessoreGas * KPC, q = quantoVuoto(luogo, opz.t ?? 0), P = popolazione(); let k = 0; while (k < ANELLI - 1 && forma.anelli.bordo[k + 1] < r) k++;
    const a = quadro(forma).anello(k), nStelle = ((a.sigmaStelle / (2 * a.z0)) / MSOLE) * (forma.bilancio.nate / forma.massaStelle / P.massaMedia);
    out.push(uno('stella', nStelle, a.z0)); for (const nome in d) out.push(uno(nome, d[nome] / KPC ** 3, h));
    if (!tipo || tipo === 'oggetto interstellare' || tipo === 'pianeta vagante') { const v = opz.vaganti || vaganti(forma, r, { caso: luogo.caso || sorgente('galassia'), campione: opz.campione ?? 24 }); out.push(uno('oggetto interstellare', v.oggetti.perM3, Infinity, { soglia: v.oggetti.soglia }), uno('pianeta vagante', v.pianetiVaganti.perM3)); }
    out.push(uno('atomo', q.atomi), uno('grano', q.grani), uno('fotone', q.fotoni.stelle + q.fotoni.fondo));
  }
  return tipo ? out.find((x) => x.tipo === tipo) || null : out;
}

// =====================================================================================================
// f. scenaVuoto: i dati per il motore 3D (stessa forma delle scene di spazio3d.js: metri, watt, colori 0…255)
// =====================================================================================================
// dove è uno di:
//   { forma, caso, catalogo, regione: { centro: [x, y, z] (kpc), raggio (kpc) }, massimo }   un pezzo di galassia;
//   { sistema, caso, attorno, massimo }                                                       un sistema.
// t: secondi da oggi. Non c'è lo strato grafico: solo ciò che c'è, dove, e che luce fa.
// GALASSIA → { livello: 'galassia', t, riferimento (come scenaGalassia: origine al centro, x e y nel piano, metri),
//   volumi: [{ cosa, id (l'indirizzo), pos, raggio, righe: [{ nome, nm, W }], continuo, colore, brillanza (W/m²/sr: la
//             luce visibile divisa per 4π²R²), estinzione (magnitudini attraverso il centro: le nubi), fase, eta }],
//   polvere: { in(x, y, z) → { densita (kg/m³), AVperMetro }, colonne: [per anello: r, AV attraverso il disco] },
//   mezzo: (x, y, z) → contenuto() in quel punto, nebbia: { tipo: { veri, mostrati } } }
// SISTEMA → { livello: 'sistema', t, riferimento (origine: la stella; gli assi di scenaSistema),
//   corpi: [{ cosa, id, pos, vel, raggio, massaKg, colore, orbita: { attorno, a, e, inclinazione, assi, periodo } }],
//   fasce: [{ nome, interno, esterno, spessore, massaKg, veri (più grandi di 1 km), risonanze }],
//   comete: [{ id, pos, vel, raggio, orbita, chioma: { raggio, colore }, codaIoni: { direzione, lunghezza, colore },
//             codaPolvere: { linee: [per taglia di grano: punti], colore } }],
//   nube: { interno, esterno, massaKg, veri }, polvere: { in(r) → kg/m³ }, vento: (r) → { protoni per m³, velocita } }
export function scenaVuoto(dove = {}, t = 0) {
  if (dove.sistema) {
    const m = corpiMinori(dove.sistema, t, { caso: dove.caso || sorgente('sistema'), attorno: dove.attorno ?? null, massimo: dove.massimo ?? 40 });
    return { livello: 'sistema', t, riferimento: { origine: 'la stella', assi: 'x, y: il piano medio del sistema; z: la normale (gli stessi di scenaSistema)', unita: 'm', epoca: 'gli elementi delle orbite valgono a t = 0 (oggi): l\'anomalia media a t è M0 + motoMedio·t' },
      corpi: m.corpi.map((c) => ({ cosa: c.tipo, id: c.indirizzo, pos: c.pos, vel: c.vel, raggio: c.diametroM / 2, massaKg: c.massaKg, luminosita: 0, colore: c.colore, albedo: c.albedo, albedoDiBond: c.albedoDiBond, fase: c.fase, fascia: c.fascia, orbita: c.orbita })),
      fasce: m.fasce.map((f) => ({ nome: f.nome, interno: f.a1, esterno: f.a2, spessore: 2 * f.a * Math.sin(Math.min(1, 0.5 * f.e)), sigma: f.sigma, massaKg: f.oggiKg, veri: f.sopra1km, mostrati: m.corpi.filter((c) => c.fascia === f.nome).length, colore: f.superficie.colore, albedo: f.superficie.albedo, fase: f.superficie.fase,
        polvere: f.polvereFine ? { tau: f.polvereFine.tau, massaKg: f.polvereFine.massaKg, raggioGrano: f.polvereFine.raggioGrano, sigma: f.polvereFine.sigma } : null, risonanze: f.risonanze.map((x) => ({ nome: x.nome, a: x.aM, larghezza: x.larghezza, con: x.con })) })),
      // le comete: tutto è dato sempre (anche lontano, dove è quasi niente): `attivita` dice quanto è accesa (0…1), senza soglie
      comete: (m.comete?.attive || []).map((c) => ({ cosa: 'cometa', id: c.indirizzo, pos: c.pos, vel: c.vel, raggio: c.diametroM / 2, orbita: c.orbita, attiva: true, attivita: c.attivita, accesa: c.attiva, acquaKgS: c.acquaKgS, molecoleS: c.molecoleS, velocitaGas: c.velocitaGas, vitaAcqua: c.vitaAcqua,
        nucleo: c.nucleo, albedo: c.nucleo.albedo, colore: c.nucleo.colore, fase: c.nucleo.fase, lumen: c.lumen, magnitudineA1UA: c.magnitudineA1UA,
        chioma: { raggio: c.chioma.raggio, colore: c.chioma.emette.colore, righe: c.chioma.righe, W: c.chioma.W, polvere: c.chioma.polvere },
        codaIoni: { direzione: c.codaIoni.direzione, lunghezza: c.codaIoni.lunghezza, velocita: c.codaIoni.velocita, colore: c.codaIoni.emette.colore, righe: c.codaIoni.righe, W: c.codaIoni.W, ioni: c.codaIoni.ioni },
        codaPolvere: { direzione: c.codaPolvere.direzione, colore: c.codaPolvere.colore, kgS: c.codaPolvere.kgS, suGas: c.codaPolvere.suGas, taglie: c.codaPolvere.taglie, albedo: c.codaPolvere.albedo, fase: c.codaPolvere.fase, densitaGrano: c.codaPolvere.densitaGrano, eta: c.codaPolvere.eta,
          // `sindine`: per ogni taglia, dove stanno oggi i grani lasciati eta[k] secondi fa (a età fissa, tra le taglie: una sincrona)
          sindine: c.codaPolvere.grani.filter((g) => g.punti.length).map((g) => ({ raggioGrano: g.raggioGrano, beta: g.beta, uscita: g.uscita, kgS: g.kgS, perSecondo: g.perSecondo, soffiato: g.soffiato, punti: g.punti.map((p) => ({ eta: p.eta, pos: p.pos, attivita: p.attivita, larghezza: p.larghezza })) })),
          // (come prima, per chi leggeva `linee`: le taglie di 1, 10 e 100 µm, il nucleo e i grani di 3, 10 e 30 giorni)
          linee: [1e-6, 1e-5, 1e-4].map((a) => c.codaPolvere.grani.find((g) => g.raggioGrano === a)).filter((g) => g && g.punti.length).map((g) => ({ raggioGrano: g.raggioGrano, beta: g.beta, punti: [c.pos, ...[3, 10, 30].map((d) => g.punti.find((p) => p.giorni === d).pos)] })) } })),
      nube: m.nube ? { interno: m.nube.aIn, esterno: m.nube.aOut, massaKg: m.nube.massaKg, veri: m.nube.sopra1km, profilo: m.nube.profilo } : null,
      // la polvere: `sezione(r, lat)` (m² di grani per m³) è ciò che diffonde; ATTENZIONE: non è più una somma di scalini K/r
      // (i grani si urtano mentre scendono): per ogni fascia che fa polvere c'è `profilo(r)` → { tau, massa, numero, raggioGrano }
      polvere: { in: (r, lat = 0) => m.polvere.densitaA(r, lat), grani: (r, lat = 0) => m.polvere.graniA(r, lat), sezione: (r, lat = 0) => m.polvere.sezioneA(r, lat), tau: (r) => m.polvere.tauA(r), raggioGrano: (r) => m.polvere.raggioGranoA(r),
        fasce: m.polvere.fasce, bordoInterno: m.polvere.bordoInterno, bordoGhiaccio: m.polvere.bordoGhiaccio, albedo: m.polvere.albedo, fase: m.polvere.fase, grano: m.polvere.grano, versoLaStellaKgS: m.polvere.versoLaStellaKgS, daCometeKgS: m.comete?.polvereKgS ?? 0,
        luceZodiacale: m.polvere.luceZodiacale, colore: m.stella.T > 0 ? coloreVero([], { T: m.stella.T, W: 1 }).rgb : null },
      vento: (r) => ventoA(dove.sistema, r), accensione: m.rAttiva, elenco: m.rElenco, nebbia: Object.fromEntries(m.fasce.map((f) => [f.nome, { veri: f.sopra1km, mostrati: m.corpi.filter((c) => c.fascia === f.nome).length }])) };
  }
  const forma = dove.forma, k = KPC, reg = dove.regione || { centro: [0, 0, 0], raggio: forma.anelli.bordo[ANELLI] }, O = oggettiIn(forma, reg, t, { caso: dove.caso || sorgente('galassia'), catalogo: dove.catalogo || null, massimo: dove.massimo ?? 400 }), Q = quadro(forma);
  return { livello: 'galassia', t, riferimento: { origine: 'il centro della galassia (il buco nero)', assi: 'x, y: il piano della galassia; z: la normale (gli stessi di scenaGalassia)', unita: 'm', regione: { centro: reg.centro.map((v) => v * k), raggio: reg.raggio * k } },
    volumi: O.oggetti.map((o) => ({ cosa: o.tipo, id: o.indirizzo, pos: o.pos.map((v) => v * k), raggio: o.raggio, righe: o.emette.righe, continuo: o.emette.continuo, colore: o.emette.colore, brillanza: o.emette.visibile / (4 * PI * PI * o.raggio * o.raggio),
      estinzione: o.estinzione ?? 0, densita: o.nH, temperatura: o.T, fase: o.fase ?? o.stato ?? null, eta: o.eta ?? o.stella?.eta ?? null, stella: o.stella ?? null })),
    polvere: { in: (x, y, z) => { const c = contenuto(forma, { r: Math.hypot(x, y) / k, z: z / k, fi: Math.atan2(y, x) }, t); return { densita: c.polvere.densita, AVperMetro: c.polvere.AVperMetro }; },
      colonne: Q.anelli.map((a) => ({ r: a.r * k, AV: (a.sigmaGas / (K.mp / ST.composizione(1).X)) * a.polvere.AV, sigmaPolvere: a.sigmaGas * a.polvere.suGas })) },
    mezzo: (x, y, z) => contenuto(forma, { r: Math.hypot(x, y) / k, z: z / k, fi: Math.atan2(y, x) }, t), nebbia: O.nebbia, celle: O.celle };
}

export const dentroVuoto = { cosmoMedio, GAMMA43 };
