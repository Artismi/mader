// impatti.js — la STORIA DEGLI IMPATTI di un pianeta, ricavata dalla sua formazione.
//
// Nessun cratere è tirato da un seme. Si parte da ciò che la formazione ha lasciato in giro, e lo si segue:
//   1. CHE COSA RESTA. Due sole origini, entrambe con una causa:
//      · i DETRITI dell'ultimo urto gigante (la parte dei due corpi che sfugge invece di fondersi);
//      · i RESTI della striscia di disco che un embrione lento non ha ancora finito di mangiare («il suo cibo è
//        ancora in giro»), che diventano raggiungibili a poco a poco, prima i vicini poi i lontani.
//      Ogni pianeta del sistema ha la sua NUBE; una nube arriva anche ai pianeti vicini, se le sue orbite li incrociano.
//      IL BOMBARDAMENTO TARDO viene da ciò che resta lontano, e da chi lo rifornisce:
//      · le FASCE: quando un pianeta scaccia un vicino (la fionda di disco.js: formazione.orfani) i sassi che giravano
//        attorno a quel vicino restano orfani. Quelli la cui orbita non incrocia nessuno stanno lì (una fascia di
//        asteroidi), e la fascia si consuma dal bordo: la distanza dal pianeta più vicino cede sempre più lontano
//        (Chambers), e chi cede è pompato dal pianeta su orbite sempre più allungate, che incrociano di traverso i
//        pianeti interni (urti veloci) fino a cadere sulla stella;
//      · le COMETE: i sassi di ghiaccio dei mondi lontani che un gigante palleggia verso l'interno; al Sole
//        evaporano: i piccoli non arrivano. Senza un gigante non c'è chi scacci né chi palleggi: niente bombardamento tardo.
//   2. COME SI CONSUMA. Dentro la nube i corpi si urtano tra loro e si frantumano: una CASCATA simulata in 40 classi
//      di taglia (da 5 m a 4000 km), in cui ogni urto tra due classi rompe, scheggia o fonde secondo l'energia.
//      Intanto i pianeti che la nube incrocia la spazzano: ogni corpo ha, a ogni giro, una probabilità di cadere su
//      un pianeta (la sua sezione d'urto, allargata dalla gravità) o di esserne scagliato via (la fionda). Chi corre
//      forte e inclinato dura di più: la nube è divisa in 8 classi di velocità, ognuna col suo tempo.
//   3. GLI URTI SUL PIANETA. I corpi grandi uno per uno (quando, massa, velocità, angolo, dove; l'aria li frena o li
//      fa esplodere; il cratere; la roccia fusa), i piccoli come numeri attesi per classe e per epoca, dagli stessi conti.
//   4. L'URTO GIGANTE: energia, momento angolare (il giorno e l'inclinazione che dà al pianeta), i detriti che
//      sfuggono, il disco che resta in orbita e la luna che ne nasce.
//
// CIÒ CHE EMERGE (non è scritto da nessuna parte): la distribuzione delle taglie (dalla cascata: tende alla pendenza
// di Dohnanyi senza che nessuno la imponga), il calo del bombardamento nel tempo (non è un'esponenziale: è la somma
// dei tempi delle classi di velocità, più il rilascio lento dei resti), quanta massa arriva davvero sul pianeta e
// quanta finisce in polvere, ai vicini o fuori dal sistema, la taglia sotto cui l'aria ferma tutto, quando il
// mantello smette di essere comandato dagli urti, quali crateri si vedono ancora.
//
// LEGGI EMPIRICHE (misurate, o tratte da simulazioni che qui non si possono rifare; i numeri sono in IMPATTI):
//   · quanto reggono due orbite vicine (Chambers e altri 1996): la legge di disco.js, importata da lì (raggiNecessari,
//     giriCheRegge): dice quando un resto della striscia comincia a incrociare il pianeta, e (se disco.js non lo dà)
//     quando arriva l'ultimo urto gigante;
//   · la crescita di un embrione nel gas (tempoCrescita e DISCO.senzaGas, importati da disco.js): serve solo, quando
//     «formazione» manca, a risalire dalla massa di un embrione lento a quanto cibo gli resta;
//   · la parte del corpo che manca il bersaglio: un terzo resta in orbita, un dodicesimo sfugge (dalle simulazioni
//     dell'urto che ha fatto la Luna, Canup 2004 e 2008); la luna che nasce da un disco (Ida, Canup e Stewart 1997);
//   · ciò che un urto più veloce della fuga disperde, e la taglia dei frammenti (Leinhardt e Stewart 2012);
//   · l'energia che serve a rompere un corpo secondo la taglia, Q*_D (Benz e Asphaug 1999), e come si divide in
//     frammenti (dagli esperimenti: il numero cresce come 1/D^2,5; il resto più grosso cala come (Q*/Q)^1,24);
//   · i planetesimi nascono grandi, attorno a 100 km (Morbidelli e altri 2009);
//   · quanto ghiaccio nudo la luce fa sublimare (calore di sublimazione 2,8·10⁶ J/kg: tutta la luce assorbita va in vapore);
//   · la teoria secolare di Laplace e Lagrange (quanto in fretta un pianeta fa crescere l'eccentricità di un corpo
//     che ha destabilizzato) e la relazione di Tisserand per le velocità d'incontro (esatte, al primo ordine);
//   · sotto i 5 m (dove la cascata non è calcolata) la popolazione si prolunga con la pendenza di Dohnanyi (1969): è la
//     condizione al bordo, serve solo perché i corpi più piccoli calcolati abbiano chi li rompe;
//   · le eccentricità di uno sciame rimescolato seguono la legge di Rayleigh (Ida e Makino 1992), con una velocità a
//     caso pari alla velocità di fuga di chi lo rimescola (Safronov 1969);
//   · la probabilità di urto tra due orbite che si incrociano (Öpik 1951, mediata sulle direzioni);
//   · la legge di scala dei crateri (Holsapple e Schmidt, nella forma di Collins, Melosh e Marcus 2005) e il passaggio
//     da cratere semplice a complesso (3,2 km sulla Terra, in proporzione inversa alla gravità); la profondità (Pike 1977);
//   · la roccia fusa da un urto: 8,9·10⁻¹² m³ per joule (Pierazzo, Vickery e Melosh 1997);
//   · l'aria: rottura quando la pressione del vento supera la resistenza del corpo, poi il corpo si allarga «a
//     frittella» fino a 7 volte e si ferma (Chyba e altri 1993; Collins, Melosh e Marcus 2005);
//   · il momento d'inerzia di un pianeta roccioso, 0,33·M·R² (la Terra: 0,3307);
//   · LA ROTAZIONE che gli urti lasciano: un fluido che ruota non supera 0,53 volte la velocità di rottura (le figure
//     di equilibrio di Maclaurin e Jacobi, esatte per densità uniforme: oltre, il corpo si allunga e perde il di più);
//     due corpi troppo veloci e di striscio non si fondono, «mordi e fuggi» (la velocità critica di Genda, Kokubo e Ida
//     2012); un embrione cresciuto nel gas gira già, nel verso dell'orbita, a un decimo della rottura (Marte 0,07, i
//     grandi asteroidi 0,2–0,4; simulazioni dell'accrescimento nel gas: Johansen e Lacerda 2010, Visser e altri 2020).
// PARAMETRI LIBERI (scelte di calcolo, non misure): le 40 classi di taglia e le 8 di velocità; il passo del tempo
// (cresce del 40% a ogni passo: il conto di ogni passo è esatto a ritmi costanti, e passi più fitti cambiano i
// risultati di un decimo); quanti urti si seguono uno per uno («massimo», 2000); il momento angolare del disco di
// detriti (quello di un'orbita a metà tra la superficie e il limite di Roche); la massa che il disco perde (5%).
// SEMPLIFICAZIONI (da sapere):
//   · contano solo i detriti dell'ULTIMO urto gigante; quelli degli urti prima si danno per già ripresi o macinati;
//   · le nubi dei pianeti vicini sono calcolate con i valori attesi dei loro urti giganti, non con i loro eventi veri;
//   · le classi di velocità non si scambiano corpi (nessun incontro ravvicinato sposta un corpo da lenta a veloce);
//   · le fasce: quanti sassi restano orfani è una stima (la parte fionda²/(1+fionda²) della massa del corpo scacciato,
//     più il suo cibo); la legge di Chambers, misurata per pianeti che si disturbano a vicenda, qui decide quando cede
//     un sasso accanto a UN pianeta: è troppo severa di un paio di raggi di Hill (la fascia vera regge più vicino a
//     Giove), e fa calare il flusso più in fretta del vero negli ultimi miliardi di anni; MANCA la spinta della luce
//     sui sassi piccoli (Yarkovsky), che nel Sistema Solare rifornisce le risonanze a ritmo quasi costante;
//   · le comete: mentre il gigante le palleggia passano una parte a_pianeta/a_gigante del tempo su orbite che scendono
//     fino al pianeta interno; il ghiaccio è nudo (nessuna crosta lo protegge: evapora al ritmo più alto possibile);
//     MANCA la nube lontana (i corpi scagliati quasi fuori che tornano dopo miliardi di anni);
//   · dentro una nube volume e velocità degli urti sono quelli iniziali; le nubi non si urtano tra loro; in un urto
//     tra due corpi si conta la sorte del più grosso (il piccolo fa da martello: lo rompono i suoi urti);
//   · la massa dei detriti e quella che ricade non sono tolte né aggiunte alla massa del pianeta (che è quella di
//     disco.js); e un embrione lento qui cresce, dopo il gas, molto meno di quanto disco.js gli fa fare (il suo «300
//     volte più lento»): lontano dalla stella quasi tutto il cibo finisce in polvere o scagliato via;
//   · gli urti arrivano da ogni direzione (nessuna preferenza per l'equatore o per la faccia avanti);
//   · la luna, se c'è, è bersagliata alla distanza di oggi; la resistenza Q* è quella misurata a 3–5 km/s.
// I DATI DELLA FORMAZIONE. Se il pianeta porta P.formazione (la dà formaPianeti di disco.js: gli urti giganti veri
// con masse e tempi, il cibo rimasto, la fine del gas) si usa quella. In un urto di formazione.urti contano:
// bersaglioKg, massaKg, e uno tra t (quando è avvenuto, anni), tIncrocio (quando le orbite si sono incrociate: si
// aggiunge il tempo per trovarsi) e delta (la distanza che ha ceduto: si applica Chambers); facoltativi angolo, v,
// inclinazione (gradi tra il piano dell'urto e quello dell'orbita: se manca è un evento),
// laterale (un urto precedente del corpo più piccolo: non conta per la rotazione del pianeta).
// SE MANCA, LE STIME (ripiego dichiarato, elencate in bilancio.stime): il numero degli urti giganti letto dal testo
// di P.storia, gli embrioni presi tutti uguali e mangiati uno a uno, il momento dell'ultimo un evento tra il primo
// giro di urti e oggi; la fine del gas alla vita media dei dischi (o sistema.disco.vita, se c'è sistema.disco =
// disco(stella, seme)); il cibo rimasto dalla massa di isolamento (da sistema.disco, o dal disco che serve a un
// embrione «cresciuto piano» per arrivare a questa massa).
//
// IL CASO: tutto ciò che è incerto si chiede alla sorgente degli eventi (eventi.js), con indirizzi stabili:
//   «urto gigante k/angolo|piano|verso|dove|quando», «classe c/nube p/quanti», «impatto k/quando|corpo|angolo|dove|sorte».
// L'impatto k è sempre lo stesso evento: un ramo che ne cambia uno lascia identici tutti gli altri.

import { COSTANTI, MSOLE, ANNO, MTERRA, RTERRA, UA } from './leggi.js';
import { stella as stellaVera } from './stelle.js';
import { DISCO, URTI, raggioPianeta, raggiNecessari, giriCheRegge, tempoCrescita } from './disco.js';
import { MATERIALI, densitaCorpo, limiteRoche } from './lune.js';
import { MOLECOLE } from './chimica.js';
import { COSTANTI as TETTONICA } from './tettonica.js';

const G = COSTANTI.G, PI = Math.PI, ANNO_S = ANNO, UA_M = UA;

// ---------- i numeri del modello, tutti qui
export const IMPATTI = Object.freeze({
  // della calotta che manca il bersaglio: un terzo resta in orbita, un dodicesimo sfugge (Canup 2004: ciò che sfugge è circa un quarto del disco)
  inOrbita: 1 / 3, sfugge: 1 / 12,
  // Leinhardt e Stewart 2012: sopra la velocità di fuga dei due corpi fusi l'energia in più disperde materia
  // (Q*_RD = c*·(4/5)·π·ρ₁·G·R_C1², corretto per il rapporto di massa); i frammenti: N(>D) ∝ D^-β, due i più grossi
  urtoGrande: URTI, // (disco.js: la stessa legge per i frammenti degli urti della formazione)
  luna: { a: 1.9, b: 1.1, persa: 0.05 }, // Ida, Canup e Stewart 1997: M_luna = a·L/√(G·M·a_R) − b·M_d − a·M_persa
  inerzia: 0.33,
  giroLimite: 0.53, // la velocità angolare più alta di un fluido che ruota, in unità di quella di rottura √(GM/R³) (dove la sequenza di Maclaurin si biforca in quella di Jacobi: ω² = 0,374·πGρ)
  giroEmbrione: 0.1, // quanto gira un embrione cresciuto nel gas, in unità della rottura, nel verso dell'orbita
  mordiEFuggi: { c1: 2.43, c2: -0.0408, c3: 1.86, c4: 1.08, c5: 2.5 }, // Genda, Kokubo e Ida 2012: v_critica/v_fuga = c1·Γ·Θ^c5 + c2·Γ + c3·Θ^c5 + c4, Γ = (1−γ)/(1+γ), Θ = 1 − b
  // Benz e Asphaug 1999 (J/kg, raggio in cm): Q* = q0·R^a + B·ρ·R^b
  rottura: { roccia: { q0: 9e3, a: -0.36, B: 5e-8, b: 1.36 }, ghiaccio: { q0: 1.6e3, a: -0.39, B: 1.2e-7, b: 1.26 } },
  resto: 1.24, frammenti: 2.5, // il resto più grosso ∝ (Q*/Q)^1,24; i frammenti: N(>D) ∝ D^-2,5
  planetesimo: 1e5, // (m) il diametro con cui nascono i planetesimi
  cratere: { k: 1.161, d: 0.78, v: 0.44, g: -0.22, semplice: 1.25, complesso: 1.17, esponente: 1.13, passaggio: { roccia: 3.14e4, ghiaccio: 3.6e3 } }, // passaggio: D_c·g (m²/s²)
  profondita: { semplice: 0.2, esponente: 0.3 }, // Pike 1977
  fusione: { roccia: 3.4e7, ghiaccio: 1.5e7 },
  // lo spessore di ghiaccio nudo che la luce del Sole a 1 UA fa sublimare in un secondo, mediato sulla sfera: S₁/(4·L_s·ρ) = 1361/(4 · 2,8·10⁶ · 930) m/s
  ghiaccioAlSole: 1361 / (4 * 2.8e6 * 930), // joule dell'urto per ogni kg fuso (Pierazzo e altri 1997; il ghiaccio in proporzione al suo calore di fusione)
  aria: { CD: 2, frittella: 7 },
  // il mantello: calore specifico della roccia, quanto calore regge prima di fondere del tutto (il calore latente), diffusività
  mantello: { cp: 1200, latente: 4e5, kappa: 1e-6, densita: 3300 },
});

// ---------- le classi di taglia (ogni classe: √2 in diametro) e di velocità (in unità della velocità a caso dello sciame)
export const CLASSI = 40;
const NC = CLASSI, SOTTO = 14, DMAX = 4.096e6, NV = 8, BORDI = [0, 0.4, 0.7, 1.0, 1.3, 1.65, 2.05, 2.5, 3.2];
const dSup = (c) => DMAX * Math.pow(2, -c / 2), dMed = (c) => dSup(c) * Math.pow(2, -0.25);
export const classeDi = (D) => Math.max(0, Math.min(NC - 1, Math.floor(2 * Math.log2(DMAX / D))));
export const diametroClasse = dMed;
// Rayleigh: la parte dello sciame con velocità tra a e b volte quella media è exp(−a²) − exp(−b²)
const XV = BORDI.slice(1).map((b, j) => Math.sqrt((b * b + BORDI[j] ** 2) / 2)), PV = BORDI.slice(1).map((b, j) => Math.exp(-(BORDI[j] ** 2)) - Math.exp(-b * b));
// sotto l'ultima classe la popolazione non si calcola, ma i suoi corpi fanno da martello per quelli appena sopra: la si
// prolunga per 14 classi (fino a 4 cm) con la pendenza di equilibrio di Dohnanyi (1969), n ∝ D^-3,5: per classe, 2^(2,5/2)
const DOHNANYI = Math.pow(2, 1.25);
const PASSO0 = 1e3, CRESCE = 1.4; // (anni) il primo passo di una nube, e di quanto cresce ogni passo

const limita = (x, a, b) => Math.max(a, Math.min(b, x));
// la legge di Chambers nei due versi: quanti giri regge un'orbita a Δ raggi di Hill, e viceversa
// (è la legge di disco.js, importata: giriCheRegge e raggiNecessari; entro il limite di Hill, 2√3, i giri sono zero)
export const giriChambers = giriCheRegge, deltaChambers = raggiNecessari;

// ---------- un pianeta visto da qui: orbita, velocità di fuga, fionda (il numero di Safronov, come in disco.js)
const ghiaccioDi = (q) => (q.tipo === 'ghiacciato' ? q.composizione?.ghiaccio ?? 0.5 : q.tipo === 'gassoso' ? 0.5 : q.composizione?.acqua ?? 0);
function scheda(q, Mst) {
  const vK = Math.sqrt((G * Mst) / q.aM), vf = Math.sqrt((2 * G * q.massaKg) / q.raggioM);
  return { q, a: q.aM, M: q.massaKg, R: q.raggioM, vK, vf, T: (2 * PI * q.aM) / vK / ANNO_S, fionda: (vf * vf) / (2 * vK * vK), hill: q.aM * Math.cbrt(q.massaKg / (3 * Mst)) };
}
// i solidi di un pianeta: tutto, salvo nei giganti (i «pesanti» meno i metalli del loro stesso gas)
const solidi = (q, Z) => (q.tipo === 'gassoso' ? q.massaKg * limita(((q.composizione?.pesanti ?? 0.1) - DISCO.metalliSole * Z) / (1 - DISCO.metalliSole * Z), 0.01, 1) : q.massaKg);
// finché disco.js non espone i numeri: quanti urti giganti, dal testo della storia («un urto gigante», «5 urti giganti»)
const urtiDallaStoria = (storia) => { const m = /^(un|\d+) urt[oi] gigant[ei]/.exec(storia || ''); return m ? (m[1] === 'un' ? 1 : Number(m[1])) : 0; };

const contesti = new WeakMap();
function contesto(sistema, P) {
  let cx = contesti.get(sistema);
  if (cx && cx.pianeti.includes(P)) return cx;
  const st = sistema.stella || {}, dentro = (sistema.pianeti || []).includes(P), pianeti = dentro ? sistema.pianeti : [...(sistema.pianeti || []), P].sort((x, y) => x.aM - y.aM);
  const Mst = P.Mstella ?? (st.massaNascita || st.massa || 1) * MSOLE;
  cx = { sistema, st, Mst, Z: st.Z ?? 1, eta: st.eta ?? 4.5e9, pianeti, sk: pianeti.map((q) => scheda(q, Mst)), nubi: new Map() };
  cx.nubeAttesa = (r) => { if (!cx.nubi.has(r)) cx.nubi.set(r, nube(cx, r, formazioneDi(cx, r, null))); return cx.nubi.get(r); };
  // LA FASCIA lasciata da un corpo che il pianeta r ha scacciato: i sassi che gli giravano attorno. Quanti: il cibo
  // che non aveva mangiato, più quelli che aveva scagliato invece di mangiare (la regola della fionda di disco.js
  // applicata ai sassi: di quelli che un corpo incontra, la parte fionda²/(1 + fionda²)); girano attorno a dov'era
  // lui, con la velocità a caso che lui gli dava (la sua velocità di fuga)
  cx.nubeOrfana = (r, k) => { const chiave = `${r}.${k}`; if (!cx.nubi.has(chiave)) { const o = cx.sk[r].q.formazione.orfani[k], a = o.aUA * UA_M, vK = Math.sqrt((G * Mst) / a), R = raggioPianeta({ massaKg: o.massaKg, ghiaccio: o.ghiaccio ?? 0 }), vf = Math.sqrt((2 * G * o.massaKg) / R), fi = (vf * vf) / (2 * vK * vK);
    cx.nubi.set(chiave, nube(cx, -1, null, { casa: { a, vK, vf, T: (2 * PI * a) / vK / ANNO_S, M: o.massaKg }, massaKg: (o.ciboKg || 0) + (o.massaKg * fi * fi) / (1 + fi * fi), ghiaccio: o.ghiaccio ?? 0, t: Math.min(0.9999 * cx.eta, o.t ?? 0) })); }
    return cx.nubi.get(chiave); };
  if (dentro) contesti.set(sistema, cx);
  return cx;
}

// ---------- L'URTO GIGANTE tra due corpi grandi. angolo: gradi sopra l'orizzonte (90 = a picco, 0 = di striscio).
// v: se manca, la velocità di fuga dei due più la velocità a caso degli embrioni (il «mescola» di disco.js).
// Restituisce energia, momento angolare, detriti che sfuggono, disco in orbita, luna, roccia fusa.
export function urtoGigante({ bersaglioKg, massaKg, raggioBersaglioM, raggioM, v, angolo = 45, ghiaccio = 0 }) {
  const U = IMPATTI.urtoGrande, Mt = bersaglioKg + massaKg, mu = (bersaglioKg * massaKg) / Mt, gamma = Math.min(bersaglioKg, massaKg) / Math.max(bersaglioKg, massaKg);
  const R1 = raggioBersaglioM ?? raggioPianeta({ massaKg: bersaglioKg, ghiaccio }), R2 = raggioM ?? raggioPianeta({ massaKg, ghiaccio }), Rf = Math.cbrt(R1 ** 3 + R2 ** 3);
  const vFuga = Math.sqrt((2 * G * Mt) / (R1 + R2)); v ??= vFuga * Math.sqrt(1 + DISCO.mescola ** 2);
  const b = Math.cos((angolo * PI) / 180), energiaJ = 0.5 * mu * v * v, momentoAngolare = mu * v * b * (R1 + R2);
  // LA CALOTTA. La parte del corpo che, arrivando, non incontra il bersaglio (geometria esatta) prosegue oltre.
  // LEGGE EMPIRICA (le simulazioni dell'urto lunare): un terzo resta in orbita, un dodicesimo sfugge, il resto ricade
  const h = limita(b * (R1 + R2) + R2 - R1, 0, 2 * R2), fuori = (h * h * (3 * R2 - h)) / (4 * R2 ** 3);
  // I DETRITI: quel dodicesimo, più (Leinhardt e Stewart 2012) ciò che disperde l'energia in eccesso rispetto alla
  // velocità di fuga dei due corpi fusi: a quella velocità o meno si fondono e basta (è il caso degli embrioni di
  // disco.js); molto sopra, si disfano. Il frammento più grosso è una parte fissa dei detriti
  const RC1 = Math.cbrt((3 * Mt) / (4 * PI * U.rho1)), Qs = U.cStar * 0.8 * PI * U.rho1 * G * RC1 * RC1 * Math.pow((1 + gamma) ** 2 / (4 * gamma), 2 / (3 * U.mu) - 1);
  const eccesso = Math.max(0, 0.5 * mu * (v * v - (2 * G * Mt) / Rf)) / Mt;
  const detritiKg = Math.min(0.9 * Mt, IMPATTI.sfugge * fuori * massaKg + Mt * Math.min(0.5, (0.5 * eccesso) / Qs)), frammentoKg = (detritiKg * (3 - U.beta)) / (U.secondi * U.beta);
  // IL DISCO: non può portare più momento angolare di quanto ne ha l'urto
  const aR = limiteRoche({ massaKg: Mt, raggioM: Rf }, densitaCorpo(1, ghiaccio)), jd = Math.sqrt(G * Mt * 0.5 * (Rf + aR));
  const discoKg = Math.min(IMPATTI.inOrbita * fuori * massaKg, momentoAngolare / jd);
  // LA LUNA che il disco riesce a fare fuori dal limite di Roche (Ida, Canup e Stewart 1997)
  const lunaKg = Math.max(0, (IMPATTI.luna.a * discoKg * jd) / Math.sqrt(G * Mt * aR) - IMPATTI.luna.b * discoKg - IMPATTI.luna.a * IMPATTI.luna.persa * discoKg);
  const fusione = Math.min(Mt, (energiaJ * Math.sin((angolo * PI) / 180)) / IMPATTI.fusione[ghiaccio > 0.3 ? 'ghiaccio' : 'roccia']);
  // MORDI E FUGGI (LEGGE EMPIRICA: Genda, Kokubo e Ida 2012): sopra una velocità critica, tanto più bassa quanto più
  // l'urto è di striscio, i due corpi si toccano e proseguono ognuno per la sua strada (torneranno a incontrarsi)
  const F = IMPATTI.mordiEFuggi, gam = (1 - gamma) / (1 + gamma), th = Math.pow(1 - b, F.c5), vCritica = vFuga * (F.c1 * gam * th + F.c2 * gam + F.c3 * th + F.c4), mordiEFuggi = v > vCritica;
  // IL MOMENTO ANGOLARE che resta al pianeta: quello dell'urto, meno ciò che si portano via il disco e i detriti che
  // sfuggono (la calotta che manca il bersaglio passa a R₁ + 0,4·h dal centro, con la velocità d'arrivo)
  const momentoDetriti = Math.min(momentoAngolare - discoKg * jd, IMPATTI.sfugge * fuori * massaKg * v * (R1 + 0.4 * h)), momentoPianeta = mordiEFuggi ? 0 : momentoAngolare - discoKg * jd - momentoDetriti;
  return { bersaglioKg, massaKg, raggioM: R2, raggioDopoM: Rf, v, vFuga, vCritica, mordiEFuggi, angolo, energiaJ, momentoAngolare, momentoPianeta, momentoDetriti, detritiKg, frammentoKg, discoKg, lunaKg, fusione, frazioneFusa: fusione / Mt };
}

// ---------- LA FORMAZIONE di un pianeta, per quel che serve qui: quando il gas è sparito, i suoi urti giganti (l'ultimo
// con tutti i suoi numeri), la rotazione che gli hanno dato, e il cibo rimasto nella sua striscia.
// caso: la sorgente degli eventi del pianeta; se manca (i pianeti vicini) si usano i valori attesi.
function formazioneDi(cx, i, caso) {
  const me = cx.sk[i], q = me.q, F = q.formazione || {}, D = cx.sistema.disco, Mst = cx.Mst, eta = cx.eta, rUA = me.a / UA_M;
  // quando sparisce il gas: dal disco, se è esposto; se no la vita media dei dischi (LEGGE EMPIRICA di disco.js)
  const tGas = Math.min(0.999 * eta, F.tGas ?? D?.vita ?? DISCO.vitaMedia / Math.sqrt(Mst / MSOLE));
  const Ms = solidi(q, cx.Z), gh = ghiaccioDi(q), ferro = q.composizione?.ferro ?? 0.3, muP = Ms / (2 * Mst);
  const out = { tGas, t0: tGas, urti: 0, ultimo: null, resti: null, rotazione: null, stime: [] };
  if (!D) out.stime.push('il disco non è esposto: vita del gas media');
  if (q.tipo === 'gassoso') return out; // un gigante ha inghiottito tutto: né detriti né superficie
  // GLI URTI GIGANTI. Quelli veri di disco.js (formazione.urti); se mancano: il numero dal testo, e gli embrioni tutti
  // uguali, mangiati uno a uno. Gli urti «laterali» (di un corpo poi caduto sul pianeta) non danno rotazione al pianeta
  const lista = Array.isArray(F.urti) ? F.urti : null, N = lista ? lista.length : typeof F.urti === 'number' ? F.urti : urtiDallaStoria(q.storia);
  if (!lista && N) out.stime.push('urti giganti: numero letto dal testo della storia, embrioni uguali');
  const raggio = (m) => raggioPianeta({ massaKg: m, ferro, ghiaccio: gh });
  // LA ROTAZIONE. Ogni embrione gira già un poco, nel verso dell'orbita (giroEmbrione); ogni urto aggiunge il suo
  // momento angolare (ciò che resta al pianeta: vedi urtoGigante), in una direzione qualunque; e a ogni passo il
  // corpo, fuso, non può girare oltre il limite dei fluidi che ruotano: il di più si stacca dall'equatore
  const critico = (m, R) => IMPATTI.inerzia * m * R * R * Math.sqrt((G * m) / R ** 3), Lv = [0, 0, 0]; let ult = null, primo = true;
  for (let k = 1; k <= N; k++) {
    const u = lista ? lista[k - 1] : { bersaglioKg: (Ms * k) / (N + 1), massaKg: Ms / (N + 1) };
    if (u.laterale) continue;
    if (primo) { Lv[2] += IMPATTI.giroEmbrione * critico(u.bersaglioKg, raggio(u.bersaglioKg)); primo = false; }
    Lv[2] += IMPATTI.giroEmbrione * critico(u.massaKg, raggio(u.massaKg));
    // (se i due corpi si mordono e fuggono tornano a incontrarsi, con un'altra geometria: al più tre volte, poi si fondono)
    let r = null;
    for (let giro = 0; giro < 4; giro++) {
      const ev = (nome, medio) => (caso ? caso(`urto gigante ${k}/${giro ? `ritorno ${giro}/` : ''}${nome}`) : medio);
      // l'angolo: il parametro d'urto al quadrato è uniforme (chi arriva da lontano non mira): 45° il più probabile
      const angolo = (!giro && u.angolo) || (Math.acos(Math.sqrt(ev('angolo', 0.5))) * 180) / PI;
      r = urtoGigante({ bersaglioKg: u.bersaglioKg, massaKg: u.massaKg, raggioBersaglioM: raggio(u.bersaglioKg), raggioM: raggio(u.massaKg), v: u.v, angolo, ghiaccio: gh });
      if (r.mordiEFuggi && giro < 3) continue;
      // il piano dell'urto: gli embrioni arrivano da ogni direzione (lo sciame è spesso quanto il raggio d'azione del pianeta)
      const cosI = !giro && u.inclinazione != null ? Math.cos((u.inclinazione * PI) / 180) : 2 * ev('piano', 0.75) - 1, sinI = Math.sqrt(1 - cosI * cosI), fi = 2 * PI * ev('verso', 0), Lk = r.mordiEFuggi ? r.momentoAngolare : r.momentoPianeta;
      Lv[0] += Lk * sinI * Math.cos(fi); Lv[1] += Lk * sinI * Math.sin(fi); Lv[2] += Lk * cosI;
      break;
    }
    const Lmax = IMPATTI.giroLimite * critico(u.bersaglioKg + u.massaKg, r.raggioDopoM), Ln = Math.hypot(...Lv);
    if (Ln > Lmax) for (let d = 0; d < 3; d++) Lv[d] *= Lmax / Ln;
    ult = { k, u, r };
  }
  if (ult) {
    const { k, u, r } = ult, ev = (nome, medio) => (caso ? caso(`urto gigante ${k}/${nome}`) : medio);
    // QUANDO. disco.js lo dà (t): il modello a eventi di Kimura et al. 2025 ha il tempo dell'incrocio (Petit et al. 2020) e
    // quello per trovarsi dopo (la gara tra urto e diffusione). Se dà solo il momento in cui le orbite si incrociano
    // (tIncrocio), serve il tempo per trovarsi («cerca»: Öpik, con la velocità a caso degli embrioni di disco.js).
    // Se non dà nemmeno quello: due embrioni vicini stanno a 2C raggi di Hill reciproci, e il primo giro di urti arriva
    // allora; se gli urti sono stati più d'uno, l'ultimo è tra corpi già fusi, con orbite allungate: la loro distanza
    // utile sta tra il limite di Hill (2√3: si incrociano subito) e il limite di oggi (oltre non si sarebbero fusi):
    // dove, è un evento
    const cerca = (DISCO.mescola * r.vFuga * me.T) / me.vK / ((3 / PI) * ((r.raggioM + raggio(u.bersaglioKg)) / me.a) ** 2 * (1 + 1 / DISCO.mescola ** 2));
    let t0 = u.t == null ? null : Math.min(0.9999 * eta, u.t);
    if (t0 == null) {
      let incrocio = u.tIncrocio;
      if (incrocio == null) {
        const d1 = 2 * DISCO.C, dOggi = deltaChambers((eta - tGas) / me.T, muP), dMin = 2 * Math.sqrt(3);
        const delta = u.delta ?? Math.min(dOggi, Math.max(d1, N === 1 ? d1 : dMin + ev('quando', 0.5) * Math.max(0, dOggi - dMin)));
        incrocio = tGas + me.T * giriChambers(delta, muP);
        if (u.delta == null) out.stime.push('quando è avvenuto l\'ultimo urto gigante: dalla legge di Chambers');
      }
      // l'urto è avvenuto (il pianeta c'è): l'attesa media, sapendo che è finita prima di oggi (vicino alla stella è
      // «cerca»; lontano, dove trovarsi richiederebbe più dell'età del sistema, è a metà del tempo che c'era)
      const resta = Math.max(0, eta - incrocio);
      t0 = Math.min(0.9999 * eta, incrocio + (resta > 1e-6 * cerca ? cerca - resta / Math.expm1(resta / cerca) : 0));
    }
    const dove = caso ? punto(caso(`urto gigante ${k}/dove`)) : { lat: 0, lon: 0 };
    const Ln = Math.min(Math.hypot(...Lv), IMPATTI.giroLimite * critico(q.massaKg, q.raggioM)), I = IMPATTI.inerzia * q.massaKg * q.raggioM ** 2;
    out.rotazione = { momentoAngolare: Ln, giorno: Ln > 0 ? (2 * PI * I) / Ln : Infinity, suRottura: Ln / critico(q.massaKg, q.raggioM), obliquita: Ln > 0 ? (Math.acos(limita(Lv[2] / Ln, -1, 1)) * 180) / PI : 0 };
    out.t0 = t0; out.urti = N; out.ultimo = { ...r, t: t0, ...dove };
  }
  // IL CIBO RIMASTO. Un embrione mangia la striscia larga 2C raggi di Hill della sua massa di isolamento; se non ha
  // finito, il resto è ancora lì: lo dice formazione.cibo. Se manca: con il disco esposto la massa di isolamento è la formula di disco.js; se no, per un
  // embrione che la storia dice «cresciuto piano», si risale al disco che serve perché in questo tempo sia arrivato a
  // questa massa (la crescita di disco.js rovesciata)
  let cibo = F.cibo ?? null;
  if (cibo == null && !N) {
    let sigma = null;
    if (D?.sigmaSolidi) sigma = D.sigmaSolidi(rUA);
    else if (/cresciuto piano/.test(q.storia || '')) {
      const MsS = Mst / MSOLE, neve = 2.7 * Math.sqrt(stellaVera(MsS, { Z: cx.Z }).L), f = cx.Z * DISCO.metalliSole * (rUA < neve ? DISCO.roccia : 1);
      // M = M_iso·(t/t_iso)³ con t_iso = 3·tempoCrescita(M_iso) ∝ M_iso^⅓: la massa di isolamento si semplifica, e resta
      // tempoCrescita(M⊕, Σ) = t / (3·(M/M⊕)^⅓): la Σ che lo soddisfa si trova per bisezione (più solidi, più in fretta)
      const serve = (tGas + (eta - tGas) / DISCO.senzaGas) / (3 * Math.cbrt(Ms / MTERRA)); let poco = 1e-9, tanto = 1e9;
      for (let giro = 0; giro < 60; giro++) { const m = Math.sqrt(poco * tanto); if (tempoCrescita(MTERRA, rUA, m, m / f, MsS) > serve) poco = m; else tanto = m; }
      sigma = Math.sqrt(poco * tanto);
      out.stime.push('il cibo rimasto: dal disco che serve a un embrione lento per arrivare a questa massa');
    }
    // (come in disco.js: la massa di isolamento della striscia di 2C raggi di Hill reciproci, e la striscia non può essere più
    // larga di 0,4 volte l'orbita)
    if (sigma > 0) cibo = Math.max(0, Math.min(Math.pow(4 * PI * me.a * me.a * sigma * DISCO.C, 1.5) * Math.sqrt(2 / (3 * Mst)), 0.8 * PI * me.a * me.a * sigma) - Ms);
  }
  if (cibo > 0) out.resti = { massaKg: cibo, larghezza: Math.min(DISCO.C * Math.cbrt((2 * (Ms + cibo)) / Ms), (0.2 * me.a) / me.hill) }; // mezza larghezza della striscia, in raggi di Hill del pianeta di oggi (C reciproci di due corpi come lui a isolamento)
  return out;
}

// un punto sulla sfera da UN evento: i 16 bit alti danno la longitudine, i 16 bassi il seno della latitudine
// (uniforme sulla sfera: gli urti arrivano da ogni direzione)
function punto(u) {
  const x = Math.round(u * 4294967296), alti = Math.floor(x / 65536) % 65536, bassi = x % 65536;
  return { lat: (Math.asin(((bassi + 0.5) / 32768) - 1) * 180) / PI, lon: ((alti + 0.5) / 65536) * 360 - 180 };
}

// ---------- LA CASCATA: la tabella di ciò che succede a un corpo della classe i (il bersaglio) quando lo urta uno
// della classe j, più piccolo o uguale. L'energia per chilo Q contro la resistenza Q*_D del bersaglio decide: sotto,
// il bersaglio è scheggiato (perde metà di Q/Q* della massa); sopra, è rotto, e il resto più grosso cala come
// (Q*/Q)^1,24. I frammenti vanno nelle classi più piccole, con il numero che cresce come 1/D^2,5; sotto l'ultima
// classe è polvere. Tutto è contato PER BERSAGLIO (la sua parte dei prodotti): il proiettile fa da martello e la
// sua sorte la decidono i suoi urti, quando tocca a lui fare da bersaglio: così la massa si conserva esattamente.
// la velocità con cui un corpo su un'orbita (a, e, inclinazione) incontra un pianeta su un'orbita tonda: la relazione di
// Tisserand (esatta): U² = v_pianeta²·(3 − a_p/a − 2·√((a/a_p)·(1−e²))·cos i)
const tisserand = (a, o, e, inc) => o.vK * Math.sqrt(Math.max(1e-3, 3 - o.a / a - 2 * Math.sqrt((a / o.a) * (1 - e * e)) * Math.cos(inc)));
function qRottura(raggioM, rho, mat) { const r = IMPATTI.rottura[mat], cm = raggioM * 100; return r.q0 * Math.pow(cm, r.a) + r.B * rho * Math.pow(cm, r.b); }
function tabellaUrti(mc, v, volume, rho, mat) {
  const da = new Uint16Array(NC + 1), pj = [], K = [], L = [], resto = [], mRes = [], persa = [], B = [], mf = [], lr = Math.log(mc[0] / mc[1]);
  for (let i = 0; i < NC; i++) { const Qs = qRottura(dMed(i) / 2, rho, mat); da[i] = pj.length;
    for (let j = i; j < NC + SOTTO; j++) {
      const mi = mc[i], mj = mc[j], Mt = mi + mj, Q = (0.5 * ((mi * mj) / Mt) * v * v) / Mt; if (Q < 0.003 * Qs) break; // un sassolino contro un macigno non conta: da qui in giù si salta
      const flr = Q < Qs ? 1 - (0.5 * Q) / Qs : 0.5 * Math.pow(Qs / Q, IMPATTI.resto), mlr = flr * Mt, parte = mi / Mt, grosso = Math.min(mlr, Mt - mlr);
      const l = mlr >= mi ? i : Math.min(NC, i + Math.round(Math.log(mi / mlr) / lr)); // (un bersaglio appena scheggiato resta nella sua classe: ne conta un po' meno di uno)
      pj.push(j); K.push(((PI / 4) * (dMed(i) + dMed(j)) ** 2 * v) / volume);
      L.push(l); mRes.push(mlr * parte); resto.push(l < NC ? (mlr * parte) / mc[l] : 0); persa.push(l === i ? Math.max(0, 1 - flr) : 1); mf.push((Mt - mlr) * parte);
      B.push(grosso > 0 ? Math.min(NC, Math.max(l + 1, i + Math.round(Math.log(mi / grosso) / lr))) : NC);
    } }
  da[NC] = pj.length;
  return { da, pj: Uint8Array.from(pj), K: Float64Array.from(K), L: Uint8Array.from(L), resto: Float64Array.from(resto), mRes: Float64Array.from(mRes), persa: Float64Array.from(persa), B: Uint8Array.from(B), mf: Float64Array.from(mf) };
}

// ---------- LA NUBE di un pianeta: i suoi detriti e i suoi resti, seguiti dalla nascita a oggi.
// Restituisce la popolazione a ogni passo (corpi per classe di taglia, quote per classe di velocità) e il bilancio
// della massa; chi ne viene colpito lo si calcola dopo (colpi), per qualunque bersaglio.
function nube(cx, i, form, orfano = null) {
  const me = orfano ? orfano.casa : cx.sk[i], np = cx.sk.length, eta = cx.eta, mDet = form?.ultimo ? form.ultimo.detritiKg : 0, mRes = form?.resti ? form.resti.massaKg : 0, mOrf = orfano ? orfano.massaKg : 0;
  if (!(mDet + mRes + mOrf > 0)) return null;
  const gh = orfano ? orfano.ghiaccio : ghiaccioDi(me.q), rho = densitaCorpo(1, gh), mat = gh > 0.3 ? 'ghiaccio' : 'roccia';
  // LE CLASSI DI VELOCITÀ. La velocità a caso dello sciame è la velocità di fuga del corpo che lo rimescola (Safronov);
  // attorno a quella, la legge di Rayleigh. Per ogni classe: l'eccentricità (U/v_orbita) e l'inclinazione (la metà),
  // quali pianeti l'orbita raggiunge, e per ciascuno: la velocità d'incontro VERA (la relazione di Tisserand tra
  // l'orbita del corpo e quella del pianeta), la probabilità per anno di caderci (Öpik: (3/π)·(b/a)²/(u·T), con
  // b² = R²·(1 + v_fuga²/U²), la sezione allargata dalla gravità) e di esserne scagliato via (fionda² volte tanto, la
  // stessa regola di disco.js). Chi corre più della velocità di fuga dalla stella in quella direzione è perso subito.
  const Lam = new Float64Array(NV), fuga = new Float64Array(NV), lam = new Float64Array(np * NV), Ur = new Float64Array(np * NV), w = new Float64Array(NV);
  const ferma = new Uint8Array(NV), cede = [], pEsc = new Float64Array(np * NV), Ue = new Float64Array(np * NV), svapora = new Float64Array(NV), ritmo = new Float64Array(NV), mano = new Uint8Array(np * NV), svMano = new Float64Array(np * NV), ritMano = new Float64Array(np * NV);
  const lumi = stellaVera(cx.Mst / MSOLE, { Z: cx.Z }).L, neve = (cx.sistema.disco?.neve ?? 2.7 * Math.sqrt(lumi)) * UA_M;
  const legato = (u) => limita(0.5 * (1 + (1 - u * u) / (2 * u)), 0, 1), opik = (o, U, T) => ((3 / PI) * (o.R / o.a) ** 2 * (1 + (o.vf / U) ** 2)) / ((U / o.vK) * T);
  let legati = 0, e2 = 0, u2 = 0;
  for (let j = 0; j < NV; j++) {
    const Uj = me.vf * XV[j], u = Uj / me.vK, e = Math.min(0.98, u), inc = e / 2;
    w[j] = PV[j] * legato(u); legati += w[j]; e2 += w[j] * e * e; u2 += w[j] * Uj * Uj;
    // IL GHIACCIO AL SOLE. Un corpo di ghiaccio la cui orbita scende dentro la linea della neve evapora: a ogni giro
    // perde lo spessore che la luce assorbita riesce a far sublimare, ∫(luce/calore di sublimazione)·dt lungo l'orbita
    // = (S₁/(4·L_s·ρ))·T/(a²·√(1−e²)) (esatto: ∫dt/r² = T/(a²√(1−e²))). In metri di diametro all'anno:
    if (mat === 'ghiaccio' && me.a * (1 - e) < neve) svapora[j] = (2 * IMPATTI.ghiaccioAlSole * lumi * ANNO_S) / ((me.a / UA_M) ** 2 * Math.sqrt(1 - e * e));
    for (let r = 0; r < np; r++) { const o = cx.sk[r]; if (r !== i && (o.a < me.a * (1 - e) || o.a > me.a * (1 + e))) continue;
      const U = tisserand(me.a, o, e, inc), l = opik(o, U, me.T); Ur[r * NV + j] = U; lam[r * NV + j] = l; Lam[j] += l * (1 + o.fionda ** 2); fuga[j] += l * o.fionda ** 2; }
    // LE COMETE. Un gigante che scaglia un corpo (fionda > 1) non lo butta subito fuori: lo palleggia, cambiandogli orbita a
    // ogni incontro, finché una volta gli dà la velocità di fuga dalla stella (succede a una parte «slegata» degli
    // incontri). Intanto l'eccentricità del corpo passa da tutti i valori: per una parte a_t/a_G del tempo la sua orbita
    // scende fino a un pianeta interno t, che può esserne colpito: è così che i corpi lontani arrivano dentro
    for (let r = 0; r < np; r++) { const gig = cx.sk[r]; if (!(lam[r * NV + j] > 0 && gig.fionda > 1)) continue;
      const slegato = Math.max(0.01, 1 - legato(Ur[r * NV + j] / gig.vK));
      for (let t = 0; t < np; t++) { const o = cx.sk[t]; if (o.a >= gig.a || lam[t * NV + j] > 0) continue;
        const eM = 1 - o.a / (2 * gig.a), U = tisserand(gig.a, o, eM, inc), l = (opik(o, U, gig.T) * (o.a / gig.a)) / slegato; Ur[t * NV + j] = U; lam[t * NV + j] = l; Lam[j] += l;
        // (su quell'orbita il ghiaccio evapora: fa in tempo a colpire solo se il gigante lo tiene in gioco meno di quanto dura)
        mano[t * NV + j] = 1; ritMano[t * NV + j] = lam[r * NV + j] * gig.fionda ** 2 * slegato; if (mat === 'ghiaccio' && gig.a * (1 - eM) < neve) svMano[t * NV + j] = (2 * IMPATTI.ghiaccioAlSole * lumi * ANNO_S) / ((gig.a / UA_M) ** 2 * Math.sqrt(1 - eM * eM)); } }
    // UNA FASCIA. Se l'orbita non raggiunge nessuno (succede solo ai sassi rimasti orfani di un corpo scacciato) la classe
    // sta ferma lì, finché la sua distanza dal pianeta più vicino (in raggi di Hill di lui) non cede: la legge di Chambers,
    // la stessa del cibo di un embrione. I più larghi di orbita cedono prima: la fascia si consuma dal bordo, e ciò che
    // cede in un passo è sempre meno (la distanza che cede cresce come il logaritmo del tempo).
    if (!(Lam[j] > 0) && np) {
      const eA = Math.min(0.98, (me.vf * BORDI[j]) / me.vK), eB = Math.min(0.98, (me.vf * BORDI[j + 1]) / me.vK), dist = (o, ecc) => (Math.abs(o.a - me.a) - ecc * me.a - (o.q.eccentricita ?? 0) * o.a) / o.hill;
      let chi = 0; for (let r = 1; r < np; r++) if (dist(cx.sk[r], e) < dist(cx.sk[chi], e)) chi = r;
      const o = cx.sk[chi], dA = dist(o, eA), dB = Math.min(dA - 1e-9, dist(o, eB)), muO = o.M / (2 * cx.Mst);
      ferma[j] = 1; cede[j] = (tau) => (tau > 0 ? limita((deltaChambers(tau / me.T, muO) - dB) / (dA - dB), 0, 1) : 0);
      // CHI CEDE È POMPATO: il pianeta che lo ha destabilizzato gli fa crescere l'eccentricità, di e_forzata a ogni giro
      // del suo perielio (teoria secolare di Laplace e Lagrange: il perielio gira con g = ¾·n·μ·α³, e l'eccentricità
      // forzata è (5/4)·α·e del pianeta; α il rapporto tra le due orbite), fino a cadere sulla stella. Mentre sale,
      // l'orbita incrocia i pianeti uno dopo l'altro, e ognuno può prenderlo (Öpik) o scagliarlo via: una gara.
      const alfa = Math.min(me.a / o.a, o.a / me.a), g = 0.75 * ((2 * PI) / me.T) * (o.M / cx.Mst) * alfa ** (me.a < o.a ? 3 : 2), pompa = g * Math.max(1e-4, 1.25 * alfa * (o.q.eccentricita ?? 0)) / (2 * PI);
      let esce = pompa; const prende = new Float64Array(np);
      for (let r = 0; r < np; r++) { const t = cx.sk[r], eC = Math.abs(1 - t.a / me.a); if (eC >= 0.98) continue;
        const e1 = Math.max(eC, e), U = tisserand(me.a, t, (e1 + 1) / 2, inc); Ue[r * NV + j] = U; prende[r] = opik(t, U, me.T) * ((1 - e1) / (1 - e)); esce += prende[r] * (1 + t.fionda ** 2); }
      for (let r = 0; r < np; r++) pEsc[r * NV + j] = prende[r] / esce; ritmo[j] = esce;
    }
  }
  for (let j = 0; j < NV; j++) if (!ferma[j]) ritmo[j] = Lam[j];
  const tuttiPV = PV.reduce((x, y) => x + y, 0), fb = legati / tuttiPV;
  if (!(legati > 0)) return null;
  for (let j = 0; j < NV; j++) w[j] /= legati;
  const ts = orfano ? orfano.t : mRes > 0 ? form.tGas : form.t0, dur = eta - ts; if (!(dur > 0)) return null;
  const tb = [0]; for (let x = PASSO0; x < dur; x *= CRESCE) tb.push(x); tb.push(dur);
  const nS = tb.length - 1, mc = new Float64Array(NC + SOTTO); for (let c = 0; c < NC + SOTTO; c++) mc[c] = (rho * PI * dMed(c) ** 3) / 6;
  // i detriti dell'urto gigante: dal frammento più grosso in giù, N(>D) ∝ D^-β (Leinhardt e Stewart)
  const det = new Float64Array(NC);
  if (mDet > 0) { const c1 = classeDi(Math.cbrt((6 * form.ultimo.frammentoKg) / (PI * rho))); let S = 0; for (let c = c1; c < NC; c++) { det[c] = Math.pow(dMed(c), 3 - IMPATTI.urtoGrande.beta); S += det[c]; } for (let c = c1; c < NC; c++) det[c] *= (mDet * fb) / S / mc[c]; }
  // i resti della striscia: planetesimi di 100 km, sparsi fino a «larghezza» raggi di Hill dal pianeta. Quelli entro
  // 2√3 lo incrociano da subito; gli altri quando la loro distanza cede (Chambers): Δ cresce come il logaritmo del tempo
  const cP = classeDi(IMPATTI.planetesimo), dW = form?.resti ? form.resti.larghezza : 0, muP = me.M / (2 * cx.Mst);
  const rilasciato = (tau) => (dW > 0 ? Math.min(dW, Math.max(2 * Math.sqrt(3), tau > 0 ? deltaChambers(tau / me.T, muP) : 0)) / dW : 0);
  // la cascata: velocità tra due corpi dello sciame √2 volte quella a caso; il volume è quello dell'anello che le
  // orbite riempiono (largo 2e·a, spesso 2i·a con i = e/2); g: di quanto cala la massa dei frammenti da una classe alla successiva
  const tab = tabellaUrti(mc, Math.SQRT2 * Math.sqrt(u2 / legati), 4 * PI * (e2 / legati) * me.a ** 3, rho, mat), g = Math.pow(mc[1] / mc[0], (3 - IMPATTI.frammenti) / 3);
  const n = new Float64Array(NC + SOTTO), f = new Float64Array(NV), tolti = new Float64Array(nS * NC), fS = new Float64Array(nS * NV), parte = new Float64Array(nS * NV), guad = new Float64Array(NC), sparsi = new Float64Array(NC + 1), via = new Float64Array(NV);
  const colpiti = new Float64Array(np), primi = new Float64Array(NC); let polvere = 0, scagliata = (mDet + mRes + mOrf) * (1 - fb), entrata = 0, massa = 0, fatto = false;
  const aggiungi = (kg, classe, corpi) => { // nuova materia: le quote di velocità si mescolano in proporzione alla massa
    if (corpi) for (let c = 0; c < NC; c++) n[c] += corpi[c]; else n[classe] += kg / mc[classe];
    for (let j = 0; j < NV; j++) f[j] = (f[j] * massa + w[j] * kg) / (massa + kg); massa += kg; entrata += kg;
  };
  for (let s = 0; s < nS; s++) {
    const dtA = tb[s + 1] - tb[s], dt = dtA * ANNO_S;
    if (mDet > 0 && !fatto && ts + tb[s + 1] > form.t0) { aggiungi(mDet * fb, 0, det); fatto = true; }
    if (mRes > 0) { const kg = mRes * fb * (rilasciato(tb[s + 1]) - (s ? rilasciato(tb[s]) : 0)); if (kg > 0) aggiungi(kg, cP); }
    if (mOrf > 0 && !s) aggiungi(mOrf * fb, cP);
    if (!s) primi.set(n.subarray(0, NC));
    for (let c = NC; c < NC + SOTTO; c++) n[c] = n[c - 1] * DOHNANYI; // sotto l'ultima classe: i martelli che non si calcolano
    // i pianeti spazzano la nube: ogni classe di velocità col suo ritmo; «lento» è il ritmo medio del passo
    let resta = 0, tolta = 0; for (let j = 0; j < NV; j++) { fS[s * NV + j] = f[j]; let e = Math.exp(-Lam[j] * dtA); if (ferma[j]) { const c1 = cede[j](tb[s]); e = c1 < 1 ? (1 - cede[j](tb[s + 1])) / (1 - c1) : 0; } parte[s * NV + j] = 1 - e; via[j] = f[j] * (1 - e); f[j] *= e; resta += f[j]; }
    const lento = resta > 0 ? -Math.log(Math.min(1, resta)) / dt : 1e300;
    // gli urti tra i corpi della nube, dalla classe più grossa in giù (i frammenti scendono soltanto). Per ogni classe,
    // nel passo: dn/dt = guadagno − (rottura + lento)·n, risolta esattamente (ritmi costanti nel passo): così una
    // classe che si consuma in fretta sta al suo equilibrio, senza passi corti, e la massa si conserva
    guad.fill(0); sparsi.fill(0);
    for (let a = 0, coda = 0; a <= NC; a++) {
      coda += sparsi[a]; if (a === NC) { polvere += coda; break; }
      guad[a] += (coda * (1 - g)) / mc[a]; coda *= g;
      const n0 = n[a], G = guad[a]; if (!(n0 + G > 0)) continue;
      let R = 0; for (let p = tab.da[a]; p < tab.da[a + 1]; p++) R += tab.K[p] * n[tab.pj[p]] * tab.persa[p];
      const x = (R + lento) * dt, e = Math.exp(-x), fine = n0 * e + (x > 1e-9 ? (G * -Math.expm1(-x)) / x : G), persi = Math.max(0, n0 + G - fine), k = persi / (R + lento);
      tolti[s * NC + a] = k * lento; tolta += k * lento * mc[a];
      if (R > 0) for (let p = tab.da[a]; p < tab.da[a + 1]; p++) { const ev = tab.K[p] * n[tab.pj[p]] * k, l = tab.L[p]; if (!(ev > 0)) continue;
        if (l !== a) { if (l < NC) guad[l] += ev * tab.resto[p]; else polvere += ev * tab.mRes[p]; }
        sparsi[tab.B[p]] += ev * tab.mf[p]; }
      n[a] = fine;
    }
    // dove è finito ciò che i pianeti hanno tolto: su ciascuno, o scagliato via
    if (tolta > 0 && resta < 1) for (let j = 0; j < NV; j++) { if (!(via[j] > 0)) continue; const q = (tolta * via[j]) / (1 - resta);
      if (ferma[j]) { let presi = 0; for (let r = 0; r < np; r++) { colpiti[r] += q * pEsc[r * NV + j]; presi += pEsc[r * NV + j]; } scagliata += q * (1 - presi); } // (il resto: sulla stella, o scagliato)
      else { for (let r = 0; r < np; r++) colpiti[r] += (q * lam[r * NV + j]) / Lam[j]; scagliata += (q * fuga[j]) / Lam[j]; } }
    if (resta > 0) for (let j = 0; j < NV; j++) f[j] /= resta;
    massa = 0; for (let c = 0; c < NC; c++) massa += n[c] * mc[c];
  }
  return { i, ts, nS, tb, tolti, fS, parte, ferma, Ur, Ue, pEsc, svapora, ritmo, mano, svMano, ritMano, Lam, lam, mc, rho, w, primi, ultimi: n.subarray(0, NC), bilancio: { detritiKg: mDet, restiKg: mRes, orfaniKg: mOrf, entrataKg: entrata, colpiti, polvereKg: polvere, scagliataKg: scagliata, rimastaKg: massa, daRilasciareKg: mRes * fb * (1 - rilasciato(dur)) } };
}

// i corpi di una nube che cadono su un bersaglio, passo per passo e classe per classe, dopo il tempo t0: di quelli
// che i pianeti tolgono in un passo, la parte che spetta al bersaglio. quota: per ogni classe di velocità, la parte
// di ciò che se ne va che cade sul bersaglio. gS: da quali classi di velocità arrivano.
function colpi(nu, quota, t0, svapora = nu.svapora, ritmo = nu.ritmo) {
  const { nS, tb, ts, tolti, fS, parte } = nu, H = new Float64Array(nS * NC), gS = new Float64Array(nS * NV), evapora = svapora.some((x) => x > 0);
  for (let s = 0; s < nS; s++) {
    const t1 = ts + tb[s], t2 = ts + tb[s + 1]; if (t2 <= t0) continue;
    let q = 0, tutti = 0;
    for (let j = 0; j < NV; j++) { const v = fS[s * NV + j] * parte[s * NV + j], x = v * quota[j]; gS[s * NV + j] = x; q += x; tutti += v; }
    if (!(q > 0)) continue;
    const dopo = (t1 >= t0 ? 1 : (t2 - t0) / (t2 - t1)) / tutti;
    if (!evapora) { for (let c = 0; c < NC; c++) H[s * NC + c] = tolti[s * NC + c] * q * dopo; continue; }
    // (il ghiaccio che evapora al Sole: di un corpo di diametro D arriva la parte che fa in tempo, ritmo / (ritmo + 3·svapora/D))
    for (let c = 0; c < NC; c++) { let qc = 0; for (let j = 0; j < NV; j++) if (gS[s * NV + j] > 0) qc += (gS[s * NV + j] * ritmo[j]) / (ritmo[j] + (3 * svapora[j]) / dMed(c)); H[s * NC + c] = tolti[s * NC + c] * qc * dopo; }
  }
  return { H, gS };
}

// ---------- L'ARIA. Scala di altezza e densità al suolo dalla pressione, dalla gravità, dalla temperatura e dai gas.
export function ariaDi(P) {
  const p = P.clima?.pressione;
  if (p === Infinity || P.tipo === 'gassoso') return { senzaFondo: true };
  if (!(p > 0)) return null;
  const g = (G * P.massaKg) / P.raggioM ** 2, T = P.clima.T ?? P.clima.Teq ?? 250, gas = P.atmosfera?.gas;
  let mu = 0, tot = 0; if (gas) for (const f in gas) if (MOLECOLE[f]) { mu += gas[f] * MOLECOLE[f].massa; tot += gas[f]; }
  mu = tot > 0 ? mu / tot : 30; // senza la chimica: un'aria di azoto e anidride carbonica
  const H = (COSTANTI.kB * T) / (mu * COSTANTI.mp * g);
  return { H, rho0: p / (g * H), pressione: p };
}
// un corpo di diametro D e densità rho entra a velocità v con un angolo (seno) sull'orizzonte. Tre esiti:
//   'intatto' (frenato appena), 'a pezzi' (rotto, ma i pezzi arrivano insieme e scavano), 'esplode in aria' (niente cratere).
// Il modello è quello «a frittella» (LEGGE: Chyba e altri 1993, nelle formule di Collins, Melosh e Marcus 2005): il corpo si
// rompe dove la pressione del vento, ρ_aria·v², supera la sua resistenza (LEGGE EMPIRICA: log₁₀Y = 2,107 + 0,0624·√ρ);
// da lì si allarga, frena sempre di più, e se arriva a 7 volte la sua larghezza prima del suolo è un'esplosione in aria.
export function attraversaAria(aria, D, rho, v, seno = Math.SQRT1_2) {
  if (!aria) return { esito: 'intatto', v };
  if (aria.senzaFondo) return { esito: 'inghiottito', v: 0 };
  if (rho * D * seno > 1000 * aria.rho0 * aria.H) return { esito: 'intatto', v }; // mille volte più pesante dell'aria che attraversa: non se ne accorge
  const { H, rho0 } = aria, { CD, frittella } = IMPATTI.aria, Y = Math.pow(10, 2.107 + 0.0624 * Math.sqrt(rho));
  const If = (4.07 * CD * H * Y) / (rho * D * v * v * seno), zs = If < 1 ? -H * (Math.log(Y / (rho0 * v * v)) + 1.308 - 0.314 * If - 1.303 * Math.sqrt(1 - If)) : 0;
  if (!(zs > 0)) return { esito: 'intatto', v: v * Math.exp((-3 * rho0 * CD * H) / (4 * rho * D * seno)) };
  const rs = rho0 * Math.exp(-zs / H), vs = v * Math.exp((-3 * rs * CD * H) / (4 * rho * D * seno)), l = D * seno * Math.sqrt(rho / (CD * rs));
  if (zs - 2 * H * Math.log(1 + (l / (2 * H)) * Math.sqrt(frittella * frittella - 1)) > 0) return { esito: 'esplode in aria', v: 0 };
  // arriva al suolo allargato: l'aria spazzata dalla frittella (integrale lungo la discesa, 16 fette)
  let S = 0; for (let k = 0; k < 16; k++) { const z = (zs * (k + 0.5)) / 16, x = Math.exp((zs - z) / (2 * H)) - 1; S += rho0 * Math.exp(-z / H) * (1 + ((2 * H) / l) ** 2 * x * x); }
  return { esito: 'a pezzi', v: vs * Math.exp((-3 * CD * S * (zs / 16)) / (4 * rho * D * seno)) };
}

// ---------- IL CRATERE (LEGGE DI SCALA: Holsapple e Schmidt, nella forma di Collins, Melosh e Marcus 2005).
// Il diametro della cavità scavata: 1,161·(ρ_corpo/ρ_suolo)^⅓·D^0,78·v^0,44·g^-0,22·sen^⅓ (unità SI). Sotto il diametro
// di passaggio (3,2 km sulla Terra, in proporzione inversa alla gravità) il cratere finale è una scodella più larga
// di un quarto; sopra, i bordi franano e si allarga ancora (complesso: fondo piatto, picco al centro).
// La profondità (LEGGE EMPIRICA, Pike 1977): un quinto del diametro i semplici; i complessi molto meno.
export function cratere({ diametroM, densita = MATERIALI.roccia.densita, v, angolo = 45, g, ghiaccio = false, raggioM = Infinity }) {
  if (!(v > 0 && diametroM > 0)) return { transienteM: 0, diametroM: 0, profonditaM: 0, complesso: false };
  const K = IMPATTI.cratere, mat = ghiaccio ? 'ghiaccio' : 'roccia', Dc = K.passaggio[mat] / g;
  const Dt = K.k * Math.cbrt(densita / MATERIALI[mat].densita) * Math.pow(diametroM, K.d) * Math.pow(v, K.v) * Math.pow(g, K.g) * Math.cbrt(Math.sin((angolo * PI) / 180));
  const complesso = K.semplice * Dt > Dc, Df = Math.min(PI * raggioM, complesso ? (K.complesso * Math.pow(Dt, K.esponente)) / Math.pow(Dc, K.esponente - 1) : K.semplice * Dt);
  return { transienteM: Math.min(Dt, 2 * raggioM), diametroM: Df, profonditaM: complesso ? IMPATTI.profondita.semplice * Dc * Math.pow(Df / Dc, IMPATTI.profondita.esponente) : IMPATTI.profondita.semplice * Df, complesso };
}

// ---------- L'URTO GIGANTE di un pianeta (l'ultimo: quello da cui comincia la sua storia), senza calcolare il resto: è
// lo stesso oggetto di storiaImpatti(...).gigante, ma costa pochi microsecondi. Serve a chi deve sapere subito il
// giorno, l'inclinazione e la luna che l'urto ha lasciato (cosmo.js, mentre costruisce il sistema: basta che il
// pianeta abbia già aM, massaKg, raggioM, tipo, composizione e formazione; degli altri pianeti non guarda niente).
function schedaGigante(form, P) {
  const u = form.ultimo; if (!u) return null;
  return { t: u.t, urti: form.urti, massaKg: u.massaKg, bersaglioKg: u.bersaglioKg, diametroM: 2 * u.raggioM, v: u.v, angolo: u.angolo, lat: u.lat, lon: u.lon, energiaJ: u.energiaJ, momentoAngolare: u.momentoAngolare,
    detritiKg: u.detritiKg, discoKg: u.discoKg, lunaKg: u.lunaKg, luna: u.lunaKg > 0 ? { massaKg: u.lunaKg, mu: u.lunaKg / P.massaKg } : null, giornoDopo: form.rotazione.giorno, giroSuRottura: form.rotazione.suRottura, obliquita: form.rotazione.obliquita, fusione: u.fusione, frazioneFusa: u.frazioneFusa };
}
export function giganteDi(P, sistema, caso) {
  const st = sistema.stella || {}, Mst = P.Mstella ?? (st.massaNascita || st.massa || 1) * MSOLE;
  return schedaGigante(formazioneDi({ sistema, st, Mst, Z: st.Z ?? 1, eta: st.eta ?? 4.5e9, sk: [scheda(P, Mst)] }, 0, caso), P);
}

// ---------- LA STORIA DEGLI IMPATTI.
// P: un pianeta di sistema() (aM, massaKg, raggioM, Mstella, tipo, composizione, clima, atmosfera, interno, storia;
//    se c'è, P.formazione: vedi in cima). sistema: { stella: { massa, eta, Z… }, pianeti: [...], disco? }; stella.eta
//    sono gli anni dalla nascita a oggi (l'unica età del sistema, anche per una stella morta).
// caso: la sorgente degli eventi del pianeta (eventi.js). opzioni: { massimo: quanti urti seguire uno per uno (2000);
//    luna: una luna di lune.js (aM, massaKg, raggioM): allora il bersaglio è lei, dentro la buca del suo pianeta }.
// I TEMPI sono anni dalla nascita del sistema (lo stesso orologio di stella.eta); la storia della superficie comincia
// a «formazione» (l'ultimo urto gigante; se non ce ne sono stati, quando il gas è sparito).
// RESTITUISCE:
//   formazione, eta   quando comincia la storia e quando finisce (oggi), in anni
//   grandi     [{ id, t, classe, da, massaKg, diametroM, v, vInfinito, lat, lon, angolo, energiaJ, esito, vSuolo,
//                cratereM, profonditaM, complesso, fusione (kg di roccia fusa), sorte }], in ordine di tempo.
//                angolo: gradi sopra l'orizzonte; da: di quale pianeta è la nube; sorte: un numero 0…1 per decidere
//                dopo se il cratere si è conservato; id: il numero dell'evento («impatto id»)
//   piccoli    { classi, diametroM, massaKg, v, cratereM, aTerra (la parte che l'aria lascia arrivare), numero
//                (attesi per classe), epoche (bordi, anni), perEpoca (Float64Array classi × epoche) }
//   taglio     null | { classe, t }: della prima classe dei piccoli gli urti dopo t sono tra i grandi (i più recenti)
//   attesi     la stessa tabella per TUTTE le classi (anche quelle seguite una per una): serve a contaCrateri
//   gigante    null | { t, massaKg, bersaglioKg, v, angolo, lat, lon, energiaJ, momentoAngolare, detritiKg, discoKg,
//                lunaKg, luna: null | { massaKg, mu }, giornoDopo (s), obliquita (gradi), fusione, frazioneFusa, urti }
//   quiete     { t, potenzaW }: quando il calore degli urti scende sotto quello che esce dall'interno del pianeta
//   popolazione { diametroM, iniziale, oggi }: i corpi della nube del pianeta, per classe (la cascata li ha cambiati)
//   bilancio   masse in kg: arrivataKg (e arrivataSuM), dei grandi e dei piccoli; fasce: le fasce di sassi orfani che
//                arrivano fin qui ({ da, inizioKg, oggiKg, polvereKg, t }); della nube del pianeta: detritiKg,
//                restiKg, entrataKg, sulPianetaKg, aiViciniKg, scagliataKg, polvereKg, rimastaKg, daRilasciareKg; energiaJ; stime
export function storiaImpatti(P, sistema, caso, { massimo = 2000, luna = null } = {}) {
  const cx = contesto(sistema, P), i = cx.pianeti.indexOf(P), me = cx.sk[i], eta = cx.eta;
  const form = formazioneDi(cx, i, caso), t0 = form.t0, c = luna ? caso.sotto(`luna ${luna.id ?? 0}`) : caso;
  // IL BERSAGLIO: il pianeta, o una sua luna (che sta in fondo alla buca del pianeta: i corpi le arrivano più veloci)
  const B = luna || P, gB = (G * B.massaKg) / B.raggioM ** 2, vf2 = (2 * G * B.massaKg) / B.raggioM + (luna ? (2 * G * P.massaKg) / luna.aM : 0);
  const ghB = luna ? luna.composizione?.ghiaccio ?? 0 : ghiaccioDi(P), ghiacciato = ghB > 0.3, aria = luna ? null : ariaDi(P);
  // LE NUBI che lo raggiungono: la sua (con i suoi eventi veri) e quelle dei vicini le cui orbite arrivano fin qui
  const nubi = []; let mia = null;
  const metti = (nu, da) => { // la parte di ciò che lascia la nube che cade sul bersaglio, e con che velocità, classe per classe
    const quota = new Float64Array(NV), vel = new Float64Array(NV), sv = Float64Array.from(nu.svapora), rit = Float64Array.from(nu.ritmo); let tocca = false;
    for (let j = 0; j < NV; j++) { const U = nu.ferma[j] ? nu.Ue[i * NV + j] : nu.Ur[i * NV + j], q = nu.ferma[j] ? nu.pEsc[i * NV + j] : nu.Lam[j] > 0 ? nu.lam[i * NV + j] / nu.Lam[j] : 0; if (!(q > 0)) continue; tocca = true; vel[j] = U; if (nu.mano[i * NV + j]) { sv[j] = nu.svMano[i * NV + j]; rit[j] = nu.ritMano[i * NV + j]; }
      // (una luna: bersaglio più piccolo, e in fondo alla buca del pianeta)
      quota[j] = luna ? q * (B.raggioM / P.raggioM) ** 2 * ((1 + vf2 / (U * U)) / (1 + (me.vf / U) ** 2)) : q; }
    if (tocca) nubi.push({ nu, da, vel, ...colpi(nu, quota, t0, sv, rit) });
  };
  for (let r = 0; r < cx.sk.length; r++) {
    const o = cx.sk[r], eMax = Math.min(0.98, (o.vf * XV[NV - 1]) / o.vK), lontano = me.a < o.a * (1 - eMax) || me.a > o.a * (1 + eMax);
    // (una nube che non arriva fin qui non serve calcolarla; a meno che incroci un gigante, che può mandarla dentro)
    if (r !== i && lontano && !cx.sk.some((g) => g.fionda > 1 && g.a > me.a && g.a > o.a * (1 - eMax) && g.a < o.a * (1 + eMax))) continue;
    const nu = r === i ? (mia = nube(cx, i, form)) : cx.nubeAttesa(r); if (nu) metti(nu, o.q.id ?? r);
    // LE FASCE: i sassi rimasti orfani dei corpi che questo pianeta ha scacciato (formazione.orfani)
    (o.q.formazione?.orfani || []).forEach((orf, k) => { const nf = cx.nubeOrfana(r, k); if (nf) metti(nf, `fascia ${o.q.id ?? r}.${k}`); });
  }
  // quanti per classe, e con che velocità (la media dei quadrati, pesata sugli arrivi)
  const N = new Float64Array(NC), U2 = new Float64Array(NC), mMed = new Float64Array(NC);
  for (const b of nubi) { b.N = new Float64Array(NC);
    for (let s = 0; s < b.nu.nS; s++) { let q = 0, q2 = 0; for (let j = 0; j < NV; j++) { const x = b.gS[s * NV + j]; q += x; q2 += x * b.vel[j] ** 2; } if (!(q > 0)) continue;
      for (let k = 0; k < NC; k++) { const h = b.H[s * NC + k]; b.N[k] += h; U2[k] += (h * q2) / q; mMed[k] += h * b.nu.mc[k]; } }
    for (let k = 0; k < NC; k++) N[k] += b.N[k]; }
  // i numeri attesi per epoca (bordi: dalla formazione a oggi, quattro per ogni fattore dieci)
  const epoche = [t0]; for (let x = 1e5; t0 + x < eta; x *= Math.pow(10, 0.25)) epoche.push(t0 + x); epoche.push(eta);
  const nE = epoche.length - 1, perEpoca = new Float64Array(NC * nE);
  for (const b of nubi) for (let s = 0, e = 0; s < b.nu.nS; s++) {
    const t1 = Math.max(t0, b.nu.ts + b.nu.tb[s]), t2 = b.nu.ts + b.nu.tb[s + 1]; if (t2 <= t1) continue;
    while (e < nE - 1 && epoche[e + 1] <= t1) e++;
    for (let z = e; z < nE && epoche[z] < t2; z++) { const parte = (Math.min(t2, epoche[z + 1]) - Math.max(t1, epoche[z])) / (t2 - t1); if (parte > 0) for (let k = 0; k < NC; k++) perEpoca[k * nE + z] += b.H[s * NC + k] * parte; }
  }
  // I GRANDI: dalle classi più grosse in giù, finché sono al più «massimo»; della classe dopo, se avanza posto, solo
  // gli ultimi arrivati (dopo «taglio.t»: su un mondo colpito senza sosta sono loro che si vedono)
  // (ogni nube può arrotondare per eccesso il suo numero: lo si conta, così i grandi non superano mai «massimo»)
  const alPiu = (k) => { let x = 0; for (const b of nubi) x += Math.ceil(b.N[k]); return x; };
  let cS = 0, tot = 0; for (; cS < NC && tot + alPiu(cS) <= massimo; cS++) tot += alPiu(cS);
  // quanti ne sono arrivati da una nube prima del tempo t (dentro un passo gli arrivi sono sparsi in modo uniforme)
  const prima = (b, k, t) => { let C = 0; for (let s = 0; s < b.nu.nS; s++) { const t1 = Math.max(t0, b.nu.ts + b.nu.tb[s]), t2 = b.nu.ts + b.nu.tb[s + 1]; if (t2 <= t1) continue; if (t <= t1) break; C += b.H[s * NC + k] * Math.min(1, (t - t1) / (t2 - t1)); } return C; };
  let taglio = null;
  const posto = massimo - tot - nubi.length;
  if (cS < NC && posto >= 1) { // il momento dopo il quale gli arrivi di quella classe sono quanti i posti rimasti (per bisezione)
    let ta = t0, tz = eta; for (let giro = 0; giro < 40; giro++) { const tm = 0.5 * (ta + tz); let dopo = 0; for (const b of nubi) dopo += b.N[cS] - prima(b, cS, tm); if (dopo > posto) ta = tm; else tz = tm; }
    taglio = { classe: cS, t: tz };
  }
  const grandi = []; let id = 0, energia = 0, arrivataGrandi = 0;
  for (let k = 0; k < cS + (taglio ? 1 : 0); k++) for (const b of nubi) {
    const Ca = k === cS ? prima(b, k, taglio.t) : 0, Nk = b.N[k] - Ca; if (!(Nk > 0)) continue;
    // il numero atteso non è intero: se ce n'è uno in più o no è un evento
    const quanti = Math.floor(Nk) + (c(`classe ${k}/nube ${b.da}/quanti`) < Nk - Math.floor(Nk) ? 1 : 0), nu = b.nu;
    for (let x = 0, s = 0, cum = 0; x < quanti; x++, id++) {
      // QUANDO: ogni urto ha la sua fetta degli arrivi attesi, e dentro la fetta il momento è un evento
      const bersaglio = Ca + ((x + c(`impatto ${id}/quando`)) / quanti) * Nk; while (s < nu.nS - 1 && cum + b.H[s * NC + k] < bersaglio) cum += b.H[s++ * NC + k];
      const h = b.H[s * NC + k], ta = Math.max(t0, nu.ts + nu.tb[s]), t = ta + (h > 0 ? limita((bersaglio - cum) / h, 0, 1) : 0.5) * (nu.ts + nu.tb[s + 1] - ta);
      // IL CORPO, un evento solo: i 16 bit alti danno la taglia dentro la classe, i 16 bassi la velocità (da quale classe
      // di velocità arriva, secondo chi sta cadendo in quel momento)
      const xc = Math.round(c(`impatto ${id}/corpo`) * 4294967296), D = dSup(k + 1) * Math.pow(2, (0.5 * ((Math.floor(xc / 65536) % 65536) + 0.5)) / 65536), m = (nu.rho * PI * D ** 3) / 6;
      let uv = ((xc % 65536) + 0.5) / 65536, q = 0, j = 0; for (let z = 0; z < NV; z++) q += b.gS[s * NV + z];
      uv *= q; while (j < NV - 1 && uv >= b.gS[s * NV + j]) uv -= b.gS[s * NV + j++];
      const vInf = (b.vel[j] / XV[j]) * (BORDI[j] + (BORDI[j + 1] - BORDI[j]) * (b.gS[s * NV + j] > 0 ? limita(uv / b.gS[s * NV + j], 0, 1) : 0.5)), v = Math.sqrt(vInf * vInf + vf2);
      // L'ANGOLO: sen² uniforme (45° il più probabile: vale per qualunque sciame che arrivi da lontano); DOVE: un punto della sfera
      const seno = Math.sqrt(c(`impatto ${id}/angolo`)), angolo = (Math.asin(seno) * 180) / PI, dove = punto(c(`impatto ${id}/dove`));
      const giu = attraversaAria(aria, D, nu.rho, v, Math.max(seno, 0.02)), E = 0.5 * m * v * v, Es = 0.5 * m * giu.v ** 2;
      const cr = cratere({ diametroM: D, densita: nu.rho, v: giu.v, angolo: Math.max(angolo, 1), g: gB, ghiaccio: ghiacciato, raggioM: B.raggioM });
      grandi.push({ id, t, classe: k, da: b.da, massaKg: m, diametroM: D, v, vInfinito: vInf, lat: dove.lat, lon: dove.lon, angolo, energiaJ: E, esito: giu.esito, vSuolo: giu.v,
        cratereM: cr.diametroM, transienteM: cr.transienteM, profonditaM: cr.profonditaM, complesso: cr.complesso, fusione: (Es * seno) / IMPATTI.fusione[ghiacciato ? 'ghiaccio' : 'roccia'], sorte: c(`impatto ${id}/sorte`) });
      energia += E; arrivataGrandi += m;
    }
  }
  grandi.sort((x, y) => x.t - y.t || x.id - y.id);
  // TUTTE LE CLASSI come statistica: taglia, velocità e cratere tipici (a 45°), e la parte che l'aria lascia passare
  // (su quattro angoli di uguale probabilità)
  const tabella = { classi: [], diametroM: [], massaKg: [], v: [], cratereM: [], aTerra: [], numero: [] }, SENI = [0.125, 0.375, 0.625, 0.875].map(Math.sqrt), rhoM = nubi.length ? nubi[0].nu.rho : MATERIALI.roccia.densita;
  const potenza = new Float64Array(nE); let arrivata = 0;
  for (let k = 0; k < NC; k++) {
    const D = dMed(k), m = N[k] > 0 ? mMed[k] / N[k] : (rhoM * PI * D ** 3) / 6, rho = (6 * m) / (PI * D ** 3), v = Math.sqrt((N[k] > 0 ? U2[k] / N[k] : me.vf ** 2) + vf2);
    let passa = 0; for (const s of SENI) if (attraversaAria(aria, D, rho, v, s).v > 0) passa += 0.25;
    const giu = attraversaAria(aria, D, rho, v);
    tabella.classi.push(k); tabella.diametroM.push(D); tabella.massaKg.push(m); tabella.v.push(v); tabella.aTerra.push(passa); tabella.numero.push(N[k]);
    tabella.cratereM.push(cratere({ diametroM: D, densita: rho, v: giu.v, g: gB, ghiaccio: ghiacciato, raggioM: B.raggioM }).diametroM);
    arrivata += N[k] * m; for (let z = 0; z < nE; z++) potenza[z] += (perEpoca[k * nE + z] * 0.5 * m * v * v) / ((epoche[z + 1] - epoche[z]) * ANNO_S);
  }
  const taglia = (da, a) => ({ ...Object.fromEntries(Object.entries(tabella).map(([n, v]) => [n, v.slice(da, a)])), epoche, perEpoca: perEpoca.slice(da * nE, a * nE) });
  // i piccoli: le classi non seguite una per una; della classe tagliata, solo gli arrivi prima del taglio
  const piccoli = taglia(cS, NC);
  if (taglio) { let n = 0; for (let z = 0; z < nE; z++) { piccoli.perEpoca[z] *= limita((taglio.t - epoche[z]) / (epoche[z + 1] - epoche[z]), 0, 1); n += piccoli.perEpoca[z]; } piccoli.numero[0] = n; }
  // LA QUIETE: finché gli urti portano più calore di quello che esce dall'interno, il mantello è comandato da loro
  const qInterno = P.interno?.q ?? TETTONICA.qTerra * (P.massaKg / MTERRA) / (P.raggioM / RTERRA) ** 2, soglia = qInterno * 4 * PI * B.raggioM ** 2;
  let zQ = -1; for (let z = 0; z < nE; z++) if (potenza[z] > soglia) zQ = z;
  // il rimescolamento del mantello (la legge di tettonica.js: un giro di cella dura spessore / velocità delle placche)
  const mescola = P.interno?.q > TETTONICA.qVivo ? (P.raggioM * (1 - (P.interno.nucleo ?? 0.5))) / (TETTONICA.vTerra * (P.interno.q / TETTONICA.qTerra) ** 2) : Infinity;
  const mb = mia?.bilancio, altri = mb ? mb.colpiti.reduce((x, y) => x + y, 0) - mb.colpiti[i] : 0;
  return {
    formazione: t0, eta, raggioM: B.raggioM, gravita: gB, ghiacciato, mescolaAnni: mescola, grandi, taglio, piccoli, attesi: taglia(0, NC),
    gigante: luna ? null : schedaGigante(form, P),
    quiete: { t: zQ < 0 ? t0 : epoche[zQ + 1], potenzaW: soglia },
    popolazione: mia ? { diametroM: Array.from({ length: NC }, (_, k) => dMed(k)), iniziale: Array.from(mia.primi), oggi: Array.from(mia.ultimi) } : null,
    bilancio: { arrivataKg: arrivata, arrivataSuM: arrivata / B.massaKg, grandiKg: arrivataGrandi, numeroGrandi: grandi.length, numeroPiccoli: piccoli.numero.reduce((x, y) => x + y, 0), energiaJ: energia, nubi: nubi.map((b) => b.da),
      fasce: nubi.filter((b) => b.nu.bilancio.orfaniKg > 0).map((b) => ({ da: b.da, inizioKg: b.nu.bilancio.entrataKg, oggiKg: b.nu.bilancio.rimastaKg, polvereKg: b.nu.bilancio.polvereKg, t: b.nu.ts })),
      detritiKg: mb?.detritiKg ?? 0, restiKg: mb?.restiKg ?? 0, entrataKg: mb?.entrataKg ?? 0, sulPianetaKg: mb ? mb.colpiti[i] : 0, aiViciniKg: altri, scagliataKg: mb?.scagliataKg ?? 0, polvereKg: mb?.polvereKg ?? 0, rimastaKg: mb?.rimastaKg ?? 0, daRilasciareKg: mb?.daRilasciareKg ?? 0, stime: form.stime },
  };
}

// ---------- quanti crateri più larghi di «diametroM» ha raccolto una superficie che ha «superficie» anni (di default
// tutta la storia): i grandi contati uno per uno, i piccoli dai numeri attesi (la classe a cavallo della soglia in
// proporzione), tolti quelli che l'aria non lascia arrivare.
export function contaCrateri(storia, { diametroM = 2e4, superficie = Infinity } = {}) {
  const da = Math.max(storia.formazione, storia.eta - superficie), T = storia.piccoli, nE = T.epoche.length - 1;
  let n = 0; for (const g of storia.grandi) if (g.t >= da && g.cratereM >= diametroM) n++;
  for (let k = 0; k < T.classi.length; k++) {
    // dentro una classe il diametro del corpo varia di √2: il cratere quasi altrettanto
    const alto = T.cratereM[k] * Math.pow(2, 0.25 * 0.88), parte = limita(Math.log(alto / diametroM) / Math.log(Math.pow(2, 0.5 * 0.88)), 0, 1); if (!(parte > 0)) continue;
    for (let z = 0; z < nE; z++) { const a = T.epoche[z], b = T.epoche[z + 1]; if (b > da) n += T.perEpoca[k * nE + z] * T.aTerra[k] * parte * (a >= da ? 1 : (b - da) / (b - a)); }
  }
  return n;
}

// ---------- L'IMPRONTA NEL MANTELLO: l'anomalia termica (kelvin, media zero sulla griglia) lasciata dagli urti, vista
// nel momento «t» (di default storia.quiete.t: quando gli urti smettono di comandare e il mantello comincia la sua
// storia). Griglia W×H come le mappe: i da 0 a W è la longitudine da −180° a 180°, j da 0 a H la latitudine da +90° a −90°.
// Ogni urto lascia una macchia calda: il calore E si allarga finché la roccia non è più fusa (al più il calore latente
// sopra il mantello: raggio r₀ con E = π^(3/2)·ρ·c_p·ΔT·r₀³), mai meno della cavità scavata. Poi due cose la sbiadiscono:
// la conduzione (esatta per una macchia a campana: r² = r₀² + 4κ·Δt, e l'ampiezza cala come (r₀/r)³) e il rimescolamento
// del mantello (cala di e a ogni giro di cella; «mescola», anni: di default dal calore interno del pianeta, con la legge di
// tettonica.js). Perciò contano gli urti più grandi e più tardi. Se non c'è stato nessun urto restituisce tutti zeri.
export function improntaMantello(storia, W, H, { t = storia.quiete.t, mescola = storia.mescolaAnni } = {}) {
  const out = new Float32Array(W * H), M = IMPATTI.mantello, R = storia.raggioM, vol = Math.pow(PI, 1.5) * M.densita * M.cp, dTmax = M.latente / M.cp;
  const macchie = [], gig = storia.gigante;
  const metti = (E, tu, lat, lon, rCavo) => { if (!(E > 0)) return;
    const r0 = Math.max(rCavo, Math.cbrt(E / (vol * dTmax))), dt = Math.max(0, t - tu), r = Math.sqrt(r0 * r0 + 4 * M.kappa * dt * ANNO_S);
    macchie.push({ amp: (E / (vol * r ** 3)) * Math.exp(-dt / mescola), sig: r / R, lat: (lat * PI) / 180, lon: (lon * PI) / 180 }); };
  if (gig) metti(gig.energiaJ, gig.t, gig.lat, gig.lon, gig.diametroM / 2);
  let prima = storia.grandi.filter((g) => g.t <= t); if (!prima.length && !gig) prima = storia.grandi;
  for (const g of prima) metti(0.5 * g.massaKg * g.vSuolo ** 2, g.t, g.lat, g.lon, g.transienteM / 2);
  const dLat = PI / H, dLon = (2 * PI) / W;
  for (const m of macchie) {
    const cl = Math.cos(m.lat), sl = Math.sin(m.lat);
    if (m.sig < 0.5 * dLat) { // più piccola di una cella: tutto il suo calore nella cella dove cade
      const j = Math.min(H - 1, Math.floor((PI / 2 - m.lat) / dLat)), i = Math.min(W - 1, Math.floor((m.lon + PI) / dLon));
      out[j * W + i] += m.amp * Math.min(1, (PI * m.sig * m.sig) / (dLat * dLon * Math.cos(PI / 2 - (j + 0.5) * dLat))); continue;
    }
    const lim = 3.5 * m.sig, is2 = 1 / (m.sig * m.sig), i0 = Math.floor((m.lon + PI) / dLon);
    for (let j = 0; j < H; j++) { const la = PI / 2 - (j + 0.5) * dLat; if (Math.abs(la - m.lat) > lim) continue; const c1 = Math.cos(la) * cl, s1 = Math.sin(la) * sl;
      // in longitudine basta guardare fin dove la macchia arriva a quella latitudine (vicino ai poli: tutto il giro)
      const largo = Math.min(W >> 1, Math.ceil((1.6 * lim) / Math.max(1e-6, Math.cos(la)) / dLon) + 1);
      for (let di = -largo; di < largo; di++) { const i = (((i0 + di) % W) + W) % W, d = Math.acos(limita(s1 + c1 * Math.cos((i + 0.5) * dLon - PI - m.lon), -1, 1)); if (d < lim) out[j * W + i] += m.amp * Math.exp(-d * d * is2); } }
  }
  let media = 0; for (const v of out) media += v; media /= W * H;
  for (let k = 0; k < out.length; k++) out[k] -= media;
  return out;
}

// ---------- I CRATERI CHE SI VEDONO ANCORA. Di tutti i grandi urti restano quelli che nulla ha cancellato:
//   eta       (anni) l'oggi a cui si guarda; di default l'età del sistema
//   rinnovo   quanto è vecchia la superficie: un numero (anni: il tempo medio con cui placche e vulcani la rifanno; un
//             cratere di età x sopravvive con probabilità exp(−x/rinnovo), deciso dalla sua «sorte») oppure una mappa W×H
//             di età in anni (per esempio 1e6 × etaCrosta di tettonica.js sui fondali: resta solo chi è più giovane del suo suolo)
//   erosione  (m/anno) quanto in fretta pioggia e vento riempiono e spianano: un numero o una mappa W×H; il cratere
//             si vede finché l'erosione non ha mangiato la sua profondità
//   minimoM   il diametro più piccolo che interessa (di default mezza cella all'equatore, se W è dato)
// In più, senza parametri: un cratere caduto dentro un cratere più giovane e più grande di lui non c'è più.
// RESTITUISCE, dal più vecchio al più giovane: [{ id, t, eta (del cratere), lat, lon, i, j, diametroM, raggioCelle,
//   profonditaM (quella rimasta), profonditaInizialeM, complesso (ha il picco al centro) }]
export function crateriVisibili(storia, { eta = storia.eta, rinnovo = Infinity, erosione = 0, W = 0, H = 0, minimoM = W ? (PI * storia.raggioM) / W : 0 } = {}) {
  const mappa = (x) => typeof x !== 'number' && x?.length === W * H, cella = W ? (2 * PI * storia.raggioM) / W : 0, vivi = [];
  for (const g of storia.grandi) {
    if (g.t > eta || !(g.cratereM > 0) || g.cratereM < minimoM) continue;
    const anni = eta - g.t, i = W ? Math.min(W - 1, Math.floor(((g.lon + 180) / 360) * W)) : 0, j = H ? Math.min(H - 1, Math.floor(((90 - g.lat) / 180) * H)) : 0, k = j * W + i;
    if (mappa(rinnovo) ? anni >= rinnovo[k] : g.sorte >= Math.exp(-anni / rinnovo)) continue;
    const resta = g.profonditaM - (mappa(erosione) ? erosione[k] : erosione) * anni; if (!(resta > 0)) continue;
    const la = (g.lat * PI) / 180, lo = (g.lon * PI) / 180;
    vivi.push({ id: g.id, t: g.t, eta: anni, lat: g.lat, lon: g.lon, i, j, diametroM: g.cratereM, raggioCelle: cella ? g.cratereM / 2 / cella : 0, profonditaM: resta, profonditaInizialeM: g.profonditaM, complesso: g.complesso, x: Math.cos(la) * Math.cos(lo), y: Math.cos(la) * Math.sin(lo), z: Math.sin(la) });
  }
  // sepolti: dentro un cratere più giovane e più grande (i grandi sono pochi: si guardano solo quelli)
  vivi.sort((a, b) => a.t - b.t || a.id - b.id);
  const R = storia.raggioM, grossi = vivi.map((v, n) => n).sort((a, b) => vivi[b].diametroM - vivi[a].diametroM);
  const out = vivi.filter((v) => { for (const m of grossi) { const w = vivi[m]; if (w.diametroM <= v.diametroM) break; if (w.t > v.t && v.x * w.x + v.y * w.y + v.z * w.z > Math.cos(w.diametroM / 2 / R)) return false; } return true; });
  for (const v of out) { delete v.x; delete v.y; delete v.z; }
  return out;
}
