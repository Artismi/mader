// cosmo.js — l'universo intero, da esplorare.
//
// Niente entra dal bordo, perché il bordo non c'è: lo spazio è richiuso su sé
// stesso (un toro: chi va sempre dritto torna da dove è partito). Tutto ha una
// causa che si può raggiungere con lo zoom:
//   le fluttuazioni quantistiche dell'inizio → la rete cosmica → le galassie
//   (con un buco nero al centro, i bracci, i resti di supernova, le pulsar) →
//   le stelle → i pianeti, i loro campi e i loro anelli → le regioni, dove i
//   raggi cosmici partiti da quelle sorgenti incontrano la polvere e il campo
//   del pianeta: i nostri universi della camera, le finestre, i pattern.
//
// Niente è conservato: c'è una regola che, dato un indirizzo, dice che cosa c'è
// lì, sempre la stessa cosa. L'universo «c'è già», infinito; si calcola solo il
// pezzo che si guarda.
//
// Indirizzo: { cosmo, galassia, stella, pianeta, regione }. «cosmo» è il ramo
// dell'inizio: cosmi diversi sono universi paralleli separati prestissimo (già
// le galassie sono altre). Il numero della biblioteca è l'indirizzo scritto in
// cifre: numeri vicini sono posti vicini dello stesso universo.

import { simulaMondo } from './mondo.js';
import { unita, catalogoVero, velocita, fmtLunghezza, ME_MEV, MP_ME, MP_MEV } from './unita.js'; // (le masse delle particelle: dal registro, leggi.js)
import { COSTANTI, etaUniverso, ANNO, LSOLE, UA, clima, acquaInSuperficie, gravitaDiSuperficie } from './leggi.js';
import { stellaOggi } from './stelle.js'; // le stelle calcolate dalla loro struttura (non più le curve misurate sul Sole)
import { interno } from './geologia.js';
import { storia, tabellaStoria } from './storia.js'; // la storia termica (per il magma dei vulcani: una stima sola)
import { formaPianeti, disco as discoDi } from './disco.js';
import { storiaImpatti, giganteDi } from './impatti.js';
import { rotazione } from './rotazione.js';
import { sorgente, numero, contatore } from './eventi.js';
import { formaGalassia, stelleGalassia, miscelaDiNascita } from './galassie.js';
import { crostaDelPianeta } from './elementi.js'; // la catena degli elementi: la crosta
import { motiRegione } from './spazio3d.js'; // (i due moduli si chiamano a vicenda, ma solo dentro le funzioni) // le galassie come conseguenza: alone → gas → stelle → metalli
import { anelli } from './anelli.js';
import { lune, tempoBlocco } from './lune.js';
import { climaEAria, prebiotica, minerali } from './chimica.js';
import { gasRadiogenici, energiaPerLaChimica, ventoStellare, increspatura } from './risalita.js'; // ciò che il piccolo fa al grande
import { luogoDaAria } from './materia.js';
const ADESSO = etaUniverso(); // in secondi: tutto il cosmo è guardato in questo istante

export const REGIONI = 12, PIANETI_MAX = 16, STELLE = 2500, GALASSIE_MAX = 200;

// il caso di un indirizzo: dalla fonte unica (eventi.js), i primi 32 bit dell'esito dell'evento «parti/unite/così»
export function hash(...parti) {
  return numero(parti.join('/'));
}
// ---------- UNIVERSI PARALLELI A OGNI SCALA. Ogni corso di eventi ha un indirizzo: «disco/3/53» è la formazione
// dei pianeti della stella 53 nella galassia 3, «mantello/3/53/0» la storia interna del suo primo pianeta. Un cosmo
// parallelo è lo stesso cosmo con alcuni di questi eventi andati diversamente: lo si scrive «n#{"evento":ramo}».
// Tutto ciò che non discende da quegli eventi resta identico (stesse galassie, stesse stelle, stessi altri pianeti).
const scomposti = new Map();
function scomponi(n) {
  if (typeof n !== 'string') return [n, null];
  let r = scomposti.get(n);
  if (!r) { const i = n.indexOf('#'); r = i < 0 ? [Number(n), null] : [Number(n.slice(0, i)), JSON.parse(n.slice(i + 1))]; scomposti.set(n, r); }
  return r;
}
export const cosmoBase = (n) => scomponi(n)[0];
export const ramiCosmo = (n) => scomponi(n)[1] || {};
// lo stesso cosmo con l'evento andato nel modo «ramo» (0: come nel cosmo di partenza)
export function cosmoRamo(n, evento, ramo) {
  const [b, r0] = scomponi(n), r = { ...(r0 || {}) };
  if (ramo) r[evento] = ramo; else delete r[evento];
  const chiavi = Object.keys(r).sort();
  return chiavi.length ? `${b}#${JSON.stringify(Object.fromEntries(chiavi.map((k) => [k, r[k]])))}` : b;
}
export const cosmoCon = (n, rami) => Object.entries(rami || {}).reduce((c, [e, r]) => cosmoRamo(c, e, r), cosmoBase(n));
// il numero da cui parte un corso di eventi: nel cosmo di partenza è quello di sempre
// (l'indirizzo del corso: «disco/1/3/53»; nel ramo r del corso intero, «disco/1/3/53/ramo/r»: tutto ciò che sta sotto cambia)
const indirizzoEvento = (nome, n, ...resto) => { const [b, rami] = scomponi(n), r = rami ? rami[[nome, ...resto].join('/')] : 0; return r ? [nome, b, ...resto, 'ramo', r].join('/') : [nome, b, ...resto].join('/'); };
export function semeEvento(nome, n, ...resto) {
  return numero(indirizzoEvento(nome, n, ...resto));
}
// la sorgente degli eventi di un corso: ogni suo evento ha un indirizzo sotto quello del corso e un ramo suo, nella
// mappa dei rami del cosmo. Con un posto («cosmo 1/galassia 3/stella 53/disco») gli eventi stanno sotto il posto
// («…/disco/embrione 12/incontro con 13»); il ramo del corso intero («disco/3/53», come sempre) lo sposta tutto
export const sorgenteEvento = (nome, n, ...resto) => sorgente(indirizzoEvento(nome, n, ...resto), ramiCosmo(n));
const sorgenteCorso = (posto, n, corso) => { const r = ramiCosmo(n)[corso]; return sorgente(r ? `${posto}/ramo ${r}` : posto, ramiCosmo(n)); };
export const casoDisco = (n, gid, sid) => sorgenteCorso(`cosmo ${cosmoBase(n)}/galassia ${gid}/stella ${sid}/disco`, n, `disco/${gid}/${sid}`);
export const casoLune = (n, gid, sid, pid) => sorgenteCorso(`cosmo ${cosmoBase(n)}/galassia ${gid}/stella ${sid}/pianeta ${pid}/lune`, n, `lune/${gid}/${sid}/${pid}`);
// (le estrazioni di un corso chieste in fila: la k-esima è sempre la stessa)
const casoDi = (nome, n, ...resto) => { const c = contatore(indirizzoEvento(nome, n, ...resto)); const tra = (a, b) => a + c() * (b - a); return { c, tra, intero: (a, b) => Math.floor(tra(a, b + 1)), gauss: () => { let u = 0; for (let i = 0; i < 6; i++) u += c(); return (u - 3) / Math.SQRT1_2 / 1.0; } }; };
const memo = (f) => { const m = new Map(); return (...a) => { const k = a.join('|'); if (!m.has(k)) { if (m.size > 64) m.delete(m.keys().next().value); m.set(k, f(...a)); } return m.get(k); }; };

// ---------- il numero della biblioteca ↔ l'indirizzo
export function indirizzoDi(numero, rami = null) {
  let n = Math.max(1, Math.floor(numero)) - 1;
  const regione = n % REGIONI; n = Math.floor(n / REGIONI);
  const slot = n % PIANETI_MAX; n = Math.floor(n / PIANETI_MAX);
  const stella = n % STELLE; n = Math.floor(n / STELLE);
  const gslot = n % GALASSIE_MAX; n = Math.floor(n / GALASSIE_MAX);
  const cosmoN = cosmoCon(n + 1, rami);
  const C = cosmo(cosmoN), galassia = gslot % C.galassie.length;
  let st = stella, S = sistemaPigro(cosmoN, galassia, st); // (qui si contano i pianeti: l'aria e gli anelli non servono)
  while (!S.pianeti.length) { st = (st + 1) % STELLE; S = sistemaPigro(cosmoN, galassia, st); }
  return { cosmo: cosmoN, galassia, stella: st, pianeta: slot % S.pianeti.length, regione };
}
export function numeroDi(a) {
  return 1 + a.regione + REGIONI * (a.pianeta + PIANETI_MAX * (a.stella + STELLE * (a.galassia + GALASSIE_MAX * (cosmoBase(a.cosmo) - 1))));
}

// ---------- il cosmo: le fluttuazioni dell'inizio, la rete, le galassie
export const cosmo = memo((n) => {
  const { c, tra, intero } = casoDi('cosmo', n);
  // le fluttuazioni: onde con vettori interi (il toro si richiude), più forti le lunghe
  const modi = [];
  for (let i = 0; i < 70; i++) {
    let kx = 0, ky = 0; while (!kx && !ky) { kx = intero(-9, 9); ky = intero(-9, 9); }
    const k = Math.hypot(kx, ky); modi.push({ kx, ky, a: Math.pow(k, -1.25) * tra(0.5, 1.5), fi: tra(0, 2 * Math.PI) });
  }
  const densita = (x, y) => { let s = 0; for (const m of modi) s += m.a * Math.cos(2 * Math.PI * (m.kx * x + m.ky * y) + m.fi); return s; };
  // la rete: la densità su una griglia (per disegnarla e per trovare i picchi)
  const N = 96, griglia = new Float32Array(N * N);
  let media = 0, var2 = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const v = densita(i / N, j / N); griglia[j * N + i] = v; media += v; var2 += v * v; }
  media /= N * N; const sigma = Math.sqrt(var2 / (N * N) - media * media);
  // le galassie: dove la materia è più densa (i picchi), e qualcuna più piccola lungo i filamenti
  const galassie = [];
  const g = (i, j) => griglia[((j + N) % N) * N + ((i + N) % N)];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const v = g(i, j); if (v < media + 0.9 * sigma) continue;
    let picco = true; for (let dj = -1; dj <= 1 && picco; dj++) for (let di = -1; di <= 1; di++) if ((di || dj) && g(i + di, j + dj) > v) { picco = false; break; }
    if (picco) galassie.push({ pos: [(i + tra(0, 1)) / N, (j + tra(0, 1)) / N], peso: (v - media) / sigma });
  }
  for (let k = 0; k < 400 && galassie.length < 150; k++) {
    const x = c(), y = c(), v = (densita(x, y) - media) / sigma;
    if (v > 0.2 && c() < 0.25 * v) galassie.push({ pos: [x, y], peso: v * 0.6 });
  }
  galassie.sort((a, b) => b.peso - a.peso); galassie.length = Math.min(galassie.length, GALASSIE_MAX);
  // LE GALASSIE COME CONSEGUENZA (galassie.js): dal picco la massa dell'alone, dalle maree dei vicini veri lo spin, dalla
  // storia dell'alone le fusioni; poi gas, disco, stelle, metalli. Tipo, bracci, colore, buco nero ne escono (G.forma li
  // tiene tutti; qui si copiano i campi di sempre). Gli eventi incerti stanno all'indirizzo della galassia, nella stessa
  // mappa dei rami del cosmo. Il raggio G.r è quello VERO sul toro: una galassia, nel cosmo, è un puntino.
  galassie.forEach((G, id) => { G.id = id; });
  for (const G of galassie) {
    G.forma = formaGalassia(G, galassie, sorgente(`cosmo ${cosmoBase(n)}/galassia ${G.id}`, ramiCosmo(n)), { toroM: TORO_M });
    Object.assign(G, G.forma.perG); G.r = G.forma.unitaM / TORO_M;
  }
  return { n, modi, densita, griglia, N, media, sigma, galassie };
});

// ---------- una galassia: le stelle, il buco nero, le sorgenti dei raggi cosmici
// coordinate della galassia: il raggio è 1, il buco nero è al centro
// Le STELLE sono un campione (galassie.js: stelleGalassia): ognuna è estratta tra tutte quelle nate nella storia di
// QUELLA galassia (quando, dove, con che metalli), e ne rappresenta `peso`; le ultime supernove sono stelle vere, e il
// loro resto sta dove stavano loro. L'unità delle posizioni è G.forma.unitaM (il raggio che tiene il 97% delle stelle).
export const galassia = memo((n, id) => {
  const G = cosmo(n).galassie[id], cat = stelleGalassia(G.forma, sorgente(`cosmo ${cosmoBase(n)}/galassia ${id}`, ramiCosmo(n)), { quante: STELLE });
  return { G, forma: G.forma, stelle: cat.stelle, sorgenti: cat.sorgenti, buco: G.forma.buco, ritmoSN: cat.ritmoSN, pesoCampione: cat.pesoCampione, stelleVere: cat.stelleVere };
});

// ---------- le grandezze vere di ogni livello (per il metro sullo schermo). Dal cosmo al pianeta le scale sono quelle
// vere anche tra un livello e l'altro: una galassia nel cosmo, un sistema nella galassia, un pianeta nel sistema sono
// grandi quanto sono (cioè puntini, finché non ci si avvicina moltissimo).
export const TORO_M = 3.7e25; // il lato del cosmo richiuso (circa 1,2 miliardi di parsec)
export const metriPerUnita = (livello, via) => {
  if (livello === 0) return TORO_M;
  if (livello === 1) return cosmo(via.cosmo).galassie[via.galassia].forma.unitaM;
  if (livello === 2) return LATO_SISTEMA_M;
  const R = sistemaPigro(via.cosmo, via.galassia, via.stella).pianeti[via.pianeta].raggioM;
  return livello === 4 ? 2 * Math.PI * R : R; // sulla superficie l'unità è il giro dell'equatore
};

// ---------- un sistema: la stella e i suoi pianeti
// coordinate del sistema: l'orbita più esterna è circa 1 (trenta unità astronomiche)
export const LATO_SISTEMA_M = 30 * UA; // l'unità del sistema: trenta unità astronomiche
// quanto è grande un sistema (30 UA) nelle unità della sua galassia: la taglia vera, circa 10⁻⁸
export const raggioSistema = (n, gid) => LATO_SISTEMA_M / cosmo(n).galassie[gid].forma.unitaM;
// il magma dei vulcani di un pianeta, dalla sua storia termica (storia.js: la stessa che interno() riassume, già in
// memoria): il magma (kg/anno) e il mantello che fonde per farlo. Così i vulcani del ciclo del carbonio (chimica.js)
// sono quelli della storia, non una seconda stima dal calore
// il mantello passato per la zona di fusione dalla nascita a oggi (kg): ∫ Ṁ_fuso/φ dt lungo la stessa storia termica, fino
// all'età della stella (le righe oltre, se qualcuno ha chiesto un tempo più tardi, non contano). È da lì che i vulcani hanno
// portato fuori il carbonio del mantello (chimica.js atmosfera, «processato»)
const processatoDi = (p, S) => { if (p.tipo === 'gassoso' || !p.composizione?.elementi) return 0; let tb; try { tb = tabellaStoria(p, { stella: S }); } catch { return 0; }
  let m = 0; for (let i = 1; i < tb.t.length && tb.t[i - 1] < S.eta; i++) { const M = tb.Mfuso[i], f = tb.fi[i]; if (M > 0 && f > 0) m += (M / f) * (Math.min(tb.t[i], S.eta) - tb.t[i - 1]) * ANNO; } return m; };
const magmaDi = (p, S) => { if (p.tipo === 'gassoso' || !(p.interno.vulcani > 0)) return {}; const f = storia(p, S.eta, { stella: S }).fuso; return f && f.kgAnno > 0 && f.frazione > 0 ? { magma: f.kgAnno, fusoMantello: f.kgAnno / f.frazione } : {}; };
// ---------- (PRESTAZIONI) «SI CALCOLA SOLO CIÒ CHE SI GUARDA», anche dentro un sistema
// Niente di ciò che un pianeta ha oltre la sua nascita nel disco si calcola quando il sistema viene fatto: TUTTO È PIGRO.
// Il sistema fatto subito è la stella e i pianeti con orbita, massa, raggio, composizione, l'urto gigante e i semi; il
// resto, in tre gruppi per pianeta, ognuno calcolato tutto insieme la prima volta che se ne legge (o scrive) un campo
// qualunque, con gli stessi conti di prima sugli stessi numeri e nello stesso ordine:
//   · IL CORPO:  giro, giorno, bloccato, obliquita, retrogrado, risonanza, schiacciamento, interno, B0, campo, lune (e la
//                crosta in composizione: geologia.interno è la storia termica, metà del costo di un sistema)
//   · L'ARIA:    clima, atmosfera, prebiotica, magnetopausa, energiaChimica (chimica.js climaEAria: l'altra metà; chiede il
//                corpo, perché i suoi dati sono il giorno, l'asse, il calore dell'interno, il magma, i gas radiogenici)
//   · L'ANELLO:  anello, anelli (anelli.js legge le lune, e il clima del pianeta — temperatura, pressione, gas tenuti, e sui
//                rocciosi lo stato dell'acqua —: chiedere l'anello fa calcolare l'aria, se l'anello ha materia)
// Sono proprietà come le altre (enumerabili, nello stesso posto tra le chiavi, scrivibili); dopo la prima lettura sono
// dati qualunque. Il risultato non dipende da quando né in che ordine le si legge (le impronte, bit per bit, sono le
// stesse di quando si calcolava tutto subito): ogni gruppo legge solo dati fissati alla nascita del sistema o gruppi
// che si calcolano prima di lui.
// L'UNICO CICLO VERO, dentro il corpo: la luna nata dall'urto di un roccioso si allontana quanto vuole il k₂/Q del
// pianeta, cioè lo stato dell'acqua (lune.js k2QPianeta): lì, mentre il corpo si fa, l'aria si calcola con il giro di
// allora; poi, se la luna ha cambiato il giorno, si rifà (pigra) con il giorno nuovo. aria → luna → giorno → aria.
// DUE PORTE, lo stesso sistema (la stessa memoria, gli stessi oggetti): sistema(n, gid, sid) e sistemaPigro(n, gid, sid).
// (sistema() prima preparava l'anello di ogni pianeta e l'aria di ogni roccioso; ora non prepara niente: si calcola
// solo ciò che si guarda. Il nome resta per chi lo chiama.)
export function sistema(n, gid, sid) { return sistemaPigro(n, gid, sid); }
export const sistemaPigro = memo((n, gid, sid) => {
  const S = galassia(n, gid).stelle[sid], { c, tra, intero } = casoDi('sistema', n, gid, sid);
  // I PIANETI NASCONO DAL DISCO della stella giovane (disco.js): la sua massa e i suoi metalli fanno il
  // disco; oltre la linea della neve anche il ghiaccio è solido; gli embrioni crescono, si scontrano e si
  // fondono; un nucleo abbastanza grande, se fa in tempo prima che il gas si disperda, lo cattura a valanga
  // e diventa un gigante. Numero, posizione, massa, tipo e composizione vengono da lì. Le stelle di neutroni
  // e i buchi neri non hanno pianeti: la supernova li ha dispersi.
  const morta = S.stato === 'stella di neutroni' || S.stato === 'buco nero';
  // LA CATENA DEGLI ELEMENTI (elementi.js): il gas da cui la stella è nata ha la miscela che la storia della sua galassia gli
  // ha dato in quell'anello a quel passo (galassie.js miscelaDiNascita: i metalli per canale, cioè chi li ha fatti); da lì il
  // disco e i pianeti, elemento per elemento
  const miscela = miscelaDiNascita(galassia(n, gid).forma, S);
  const nascita = { massa: S.massaNascita || S.massa, Z: S.Z ?? 1, eta: S.eta, ...(miscela ? { abbondanze: miscela.abbondanze } : {}) }, semeDisco = casoDisco(n, gid, sid);
  const nati = morta ? [] : formaPianeti(nascita, semeDisco).slice(0, PIANETI_MAX);
  const pianeti = nati.map((q, k) => {
    const a = q.aUA / 30, fase = tra(0, 2 * Math.PI);
    return {
      id: k, a, fase, pos: [a * Math.cos(fase), a * Math.sin(fase)], tipo: q.tipo, raggioM: q.raggioM, massaKg: q.massaKg, composizione: q.composizione, eccentricita: q.eccentricita, storia: q.storia, formazione: q.formazione, involucro: q.involucro || 0,
      r: q.raggioM / (30 * UA), B0: 0, campo: 0, // il raggio VERO nelle unità del sistema (30 UA): sulla mappa un pianeta è grande quanto è

      colore: { roccioso: [176, 140, 110], gassoso: [214, 178, 128], ghiacciato: [156, 196, 222] }[q.tipo].map((v) => Math.round(v * tra(0.8, 1.15))),
    };
  });
  // una gigante rossa inghiotte i pianeti vicini; la nana bianca che ne resta, avendo perso massa, ha anche lasciato
  // allontanare gli altri (l'orbita si allarga come la massa iniziale su quella finale)
  if (S.stato === 'nana bianca' || S.stato === 'gigante rossa') { const k = S.stato === 'nana bianca' ? (S.massaNascita || 1) / S.massa : 1; for (let i = pianeti.length - 1; i >= 0; i--) { if (pianeti[i].a < 0.05) { pianeti.splice(i, 1); continue; } pianeti[i].a *= k; pianeti[i].pos = pianeti[i].pos.map((v) => v * k); } pianeti.forEach((p, i) => { p.id = i; }); }
  // il clima di ogni pianeta, dalla luce della sua stella (una nana bianca è piccola: la sua luce è quella di una
  // sfera con il suo raggio e la sua temperatura, 4πR²σT⁴: da un decimo del Sole appena nata a meno di un millesimo)
  // (luce, raggio e temperatura di oggi vengono da una via sola, viva o morta che sia la stella: stelle.js stellaOggi)
  const oggiStella = stellaOggi(S), viva = oggiStella.viva, Lw = oggiStella.L;
  // il sistema com'è restituito: serve già qui, perché la storia degli impatti di un pianeta (impatti.js) guarda la
  // stella, il disco e gli altri pianeti
  const Sis = { stella: { ...S, r: oggiStella.R / (30 * UA) } /* il raggio vero, nelle unità del sistema */, pianeti, disco: morta ? null : discoDi(nascita, semeDisco) };
  for (const p of pianeti) {
    const massaKg = p.massaKg; // dal disco
    // (la massa della stella è quella di oggi: una nana bianca pesa meno di quando è nata, e l'anno si è allungato)
    const Mst = S.massa * 1.989e30, aM = p.a * 30 * UA, anno = 2 * Math.PI * Math.sqrt(aM ** 3 / (6.674e-11 * Mst));
    const eta = S.eta;
    Object.assign(p, { aM, Lw, Mstella: Mst, anno, Rstella: oggiStella.R, ...(S.T > 0 ? { Tstella: S.T } : {}) }); // (Tstella: la temperatura vera di questa stella, per chi ne vuole lo spettro: il mare, l'ultravioletto; Rstella: il suo raggio vero, per chi ne vuole il vento)
    // L'URTO GIGANTE (impatti.js): l'ultimo della formazione del pianeta, con i numeri veri di disco.js. I suoi eventi
    // incerti stanno all'indirizzo del pianeta, e i loro rami nella stessa mappa dei rami del cosmo
    const casoP = sorgente(`cosmo ${cosmoBase(n)}/galassia ${gid}/stella ${sid}/pianeta ${p.id}`, ramiCosmo(n));
    p.urto = p.tipo === 'gassoso' ? null : giganteDi(p, Sis, casoP);
    // il seme del tempo atmosferico: un evento alla sorgente del pianeta (risalita.js); un ramo su «…/pianeta k/meteo/seme/0» è un altro tempo, stesso clima
    p.semeMeteo = increspatura(casoP);
    // (le proprietà pigre: «dato» la scrive come un dato qualunque, «pigro» la lascia da calcolare alla prima lettura o scrittura)
    const dato = (k, v) => Object.defineProperty(p, k, { value: v, writable: true, enumerable: true, configurable: true });
    const valore = (k) => { const d = Object.getOwnPropertyDescriptor(p, k); return d && 'value' in d ? d.value : undefined; };
    const pigro = (k, risolvi) => Object.defineProperty(p, k, { enumerable: true, configurable: true, get: () => { risolvi(); return valore(k); }, set: (v) => { risolvi(); dato(k, v); } });
    // l'acqua alla superficie: la stessa per il mare, per il clima e per l'interno (leggi.js)
    const acqua = acquaInSuperficie(p);
    // IL CORPO, PIGRO (vedi in cima a sistema()): il giro, la forma, l'interno, la crosta, le lune, tutti insieme alla prima
    // lettura di uno dei loro campi, negli stessi passi di prima
    let statoCorpo = 0, inerti = null, processato = 0, datiAria = null, aria = null, chiedeAria = null; // (l'aria con quei dati, quando è stata calcolata)
    // LA ROTAZIONE (rotazione.js): il giorno e l'asse sono una conseguenza, non un sorteggio. Il giro nasce dagli urti
    // giganti, o dal gas caduto attraverso un disco (giganti e mondi con involucro), o dalla crescita dell'embrione; poi
    // la marea della stella lo frena per tutta l'età del sistema (la legge di lune.js, tempoBlocco, integrata): fino a
    // mostrarle sempre la stessa faccia (bloccato) o a una risonanza, se l'orbita è allungata (p.risonanza: «3:2»)
    const giroDi = (luna) => { p.giro = rotazione(p, Sis, casoP, { urto: p.urto, luna }); Object.assign(p, { giorno: p.giro.giorno, bloccato: p.giro.bloccato, obliquita: p.giro.obliquita, retrogrado: p.giro.retrogrado, risonanza: p.giro.risonanza }); };
    // (PRESTAZIONI: i minerali della superficie servono due volte con gli stessi dati — qui sotto e più giù, con l'energia
    // vera per la chimica —: se temperatura, ossidazione e mare sono gli stessi (confronto esatto) vale la lista già fatta)
    let fatti = null;
    const mineraliDi = (T, ossidato, acqua) => { if (!(fatti && fatti.T === T && fatti.ossidato === ossidato && fatti.acqua === acqua)) fatti = { T, ossidato, acqua, lista: minerali({ composizione: p.composizione, T, ossidato, acqua }) }; return fatti.lista; };
    // L'ARIA, PIGRA (vedi in cima a sistema()). «fotoAria»: i dati di climaEAria com'è il pianeta adesso; «ariaCon»: il conto
    // di sempre — clima e aria insieme, poi i mattoni della vita con la sola luce —, senza toccare il pianeta
    // (il ciclo del carbonio vuole i vulcani: dove interno() dice che non ce ne sono, la CO2 non ha una sorgente)
    const aAria = p.a * 30 * UA, Zs = { Z: S.Z ?? 1 };
    const fotoAria = () => ({ Lw, aM: p.a * 30 * UA, massaKg, raggioM: p.raggioM, tipo: p.tipo, acqua: acqua.frazione, acquaKg: acqua.kg, anno, giorno: p.giorno, obliquita: p.obliquita, bloccato: p.bloccato, placche: p.interno.tettonica === 'a placche', composizione: p.composizione, involucro: p.involucro,
      calore: p.interno.vulcani > 0 ? p.interno.q : 0, ...magmaDi(p, S), inerti, processato });
    const ariaCon = (dati) => {
      const r = climaEAria(dati, Zs), cl = r.clima; cl.giro = { obliquita: dati.obliquita, bloccato: dati.bloccato, giorno: dati.giorno }; // (con quale asse e quale giorno è stato calcolato: il giorno entra nel calore che l'aria porta, leggi.js)
      // L'ARIA e i MATTONI DELLA VITA (chimica.js): quali gas ha davvero, e quanto rendono lì le reazioni che fanno
      // aminoacidi e zuccheri (scariche e ultravioletto)
      let atm, pre;
      try { atm = r.atmosfera; pre = prebiotica({ atmosfera: atm, T: cl.T, energia: Lw / (4 * Math.PI * aAria ** 2) / 1361, pressione: cl.pressione, acqua: cl.acqua, // (lo stato dell'acqua, non un sì/no: prebiotica lo confronta con «liquida»)
        minerali: mineraliDi(cl.T, !atm.riducente, cl.acqua === 'liquida') }); } catch { atm = null; pre = null; }
      return { clima: cl, atmosfera: atm, prebiotica: pre };
    };
    const posaAria = () => { if (!aria) aria = ariaCon(datiAria); dato('clima', aria.clima); dato('atmosfera', aria.atmosfera); dato('prebiotica', aria.prebiotica); };
    const risolviCorpo = () => {
      if (statoCorpo) return; statoCorpo = 1;
      try {
        giroDi(null);
        const omega = (2 * Math.PI) / p.giorno;
        // la FORMA: un corpo grande si arrotonda da solo (la gravità vince la roccia); ruotando si schiaccia ai poli
        // (schiacciamento ≈ 5/4 · ω²R³/(GM), per un corpo fluido omogeneo)
        p.schiacciamento = Math.min(0.3, 1.25 * (omega ** 2 * p.raggioM ** 3) / (6.674e-11 * massaKg));
        // l'interno: nucleo, dinamo, tettonica; il campo magnetico ora EMERGE dall'interno
        p.interno = interno(p, S); p.B0 = p.interno.B0; p.campo = Math.min(1, Math.max(0, Math.log10(p.B0 / 1e-8) / Math.log10(4.5e-4 / 1e-8)));
        // LA CROSTA di questo pianeta (elementi.js: la fusione del SUO mantello con la frazione fusa della SUA storia), accanto alla
        // composizione, non enumerabile come gli elementi: chimica.js ne fa le rocce che la pioggia consuma, mare.js le tracce
        if (p.composizione?.elementi) Object.defineProperty(p.composizione, 'crosta', { value: crostaDelPianeta(p, { stella: S }), enumerable: false, configurable: true, writable: true });
        p.interno.acquaKg = acqua.kg;
        processato = processatoDi(p, S);
        // I GAS RADIOGENICI (risalita.js): l'argon del potassio-40 e l'elio delle α usciti dall'interno nell'età del pianeta, se
        // la gravità li tiene (in Pa: entrano nell'aria insieme agli altri, dentro climaEAria)
        try { const gr = gasRadiogenici({ pianeta: { g: gravitaDiSuperficie(massaKg, p.raggioM), raggioM: p.raggioM, eta: p.interno.eta }, stella: { Lw, aM } }, { P: { tipo: p.tipo, massaKg, raggioM: p.raggioM, composizione: p.composizione, interno: p.interno, Lw, aM } });
          inerti = { Ar: gr.argon40.trattenuto ? gr.perLAria.Ar : 0, He: gr.elio4.trattenuto ? gr.perLAria.He : 0 }; } catch { inerti = null; }
        // PRIMA DELLE LUNE: chi legge l'aria adesso (la luna dell'urto di un roccioso) la fa calcolare con il giro di adesso
        datiAria = fotoAria(); chiedeAria = posaAria;
        // LE LUNE (lune.js): dal disco attorno al pianeta, da un grande urto, o catturate; con le loro maree
        p.lune = lune(p, { eta, Z: S.Z ?? 1, massa: S.massa, massaNascita: S.massaNascita, ...(p.tipo === 'roccioso' ? { urto: p.urto } : {}) }, casoLune(n, gid, sid, p.id));
        // la luna nata dall'urto, allontanandosi, ha frenato il pianeta: il giorno di oggi è quello che resta (e con lui lo schiacciamento ai poli)
        { const luna = p.lune.find((l) => l.origine === 'urto' && l.giornoPianeta); if (luna) { giroDi(luna); p.schiacciamento = Math.min(0.3, (1.25 * ((2 * Math.PI) / p.giorno) ** 2 * p.raggioM ** 3) / (6.674e-11 * massaKg));
          // la dinamo sente il giorno (geologia.interno: il numero di Rossby): con il giorno di oggi il campo si rifà
          const oggi = interno(p, S); Object.assign(p.interno, { B0: oggi.B0, ...(oggi.rossby != null ? { rossby: oggi.rossby, dipolo: oggi.dipolo } : {}) }); p.B0 = oggi.B0; p.campo = Math.min(1, Math.max(0, Math.log10(p.B0 / 1e-8) / Math.log10(4.5e-4 / 1e-8))); } }
        // (se la luna dell'urto ha cambiato l'asse, il blocco o il giorno, l'aria di oggi è quella con il giro nuovo: i dati si
        // rifotografano, e ciò che era stato calcolato per le lune non vale più)
        if (datiAria.obliquita !== p.obliquita || datiAria.bloccato !== p.bloccato || datiAria.giorno !== p.giorno) { datiAria = fotoAria(); aria = null; }
        chiedeAria = risolviAria;
        pigro('clima', leggeAria); pigro('atmosfera', leggeAria); pigro('prebiotica', leggeAria); // (di nuovo pigri, anche se le lune li avevano letti: la prima lettura fa tutto il gruppo)
        statoCorpo = 2;
      } finally { if (statoCorpo === 1) statoCorpo = 0; }
    };
    // (l'aria chiede prima il corpo; mentre il corpo si fa — le lune — vale l'aria con il giro di allora, e prima ancora non c'è)
    const leggeAria = () => { risolviCorpo(); if (chiedeAria) chiedeAria(); };
    for (const k of ['giro', 'giorno', 'bloccato', 'obliquita', 'retrogrado', 'risonanza', 'schiacciamento', 'interno', 'B0', 'campo']) pigro(k, risolviCorpo);
    pigro('clima', leggeAria); pigro('atmosfera', leggeAria); pigro('prebiotica', leggeAria);
    pigro('lune', risolviCorpo);
    // DA QUI L'ARIA È QUELLA DI OGGI, e con lei CIÒ CHE IL PICCOLO FA AL GRANDE (risalita.js), con il campo, il giorno e l'aria
    // di oggi: il vento della stella ferma la magnetosfera a p.magnetopausa raggi (oltre, niente fascia: attorno a una stella
    // morta non c'è vento che la fermi); l'energia vera per la chimica dell'aria (ultravioletto sotto 200 nm, fulmini,
    // aurore, raggi cosmici: 1 = la Terra) al posto della sola luce. Tutto insieme, alla prima lettura di uno dei cinque campi
    let statoAria = 0; // 0: da fare, 1: in corso, 2: fatta
    const risolviAria = () => {
      if (statoAria) return; statoAria = 1;
      try {
        posaAria();
        try {
          const qui = luogoDaAria({ P: p }), dalPiccolo = { P: p, stella: { T: S.T > 0 ? S.T : undefined, eta: S.eta, massa: S.massa } }, vento = viva ? ventoStellare(qui, dalPiccolo) : null;
          dato('magnetopausa', vento ? vento.magnetopausa : Infinity);
          if (p.atmosfera) {
            dato('energiaChimica', energiaPerLaChimica(qui, dalPiccolo));
            dato('prebiotica', prebiotica({ atmosfera: p.atmosfera, T: p.clima.T, energia: p.energiaChimica.relativa, pressione: p.clima.pressione, acqua: p.clima.acqua,
              minerali: mineraliDi(p.clima.T, !p.atmosfera.riducente, p.clima.acqua === 'liquida') }));
          }
        } catch { /* restano l'aria e la chimica di prima */ }
        // (ciò che non è stato scritto — l'aria non c'è, o un conto è fallito — non c'è, come prima)
        for (const k of ['magnetopausa', 'energiaChimica']) if (valore(k) === undefined && Object.getOwnPropertyDescriptor(p, k)?.get) delete p[k];
        statoAria = 2;
      } finally { if (statoAria === 1) statoAria = 0; }
    };
    // GLI ANELLI (anelli.js): ciò che resta oggi della materia finita dentro il limite di Roche (una luna spezzata dalle
    // maree, i detriti di un urto); si allargano, piovono sul pianeta e spariscono: c'è un anello solo se la materia è
    // arrivata abbastanza di recente o era abbastanza tanta. Le divisioni vengono dalle risonanze con le lune vere.
    // PIGRI anche loro (anello e anelli insieme): leggono le lune, e l'aria del pianeta se c'è materia per un anello
    let statoAnello = 0;
    const risolviAnello = () => {
      if (statoAnello) return; statoAnello = 1;
      try { const A = anelli(p, p.lune, { massa: S.massa, massaNascita: S.massaNascita, eta: eta - (S.morta ?? 0), morta: S.morta, Z: S.Z ?? 1 }, sorgente(`anelli/${cosmoBase(n)}/${gid}/${sid}/${p.id}`, ramiCosmo(n)));
        dato('anello', A); dato('anelli', !!A); statoAnello = 2;
      } finally { if (statoAnello === 1) statoAnello = 0; }
    };
    pigro('anello', risolviAnello); pigro('anelli', risolviAnello);
    pigro('magnetopausa', leggeAria); pigro('energiaChimica', leggeAria);
    // LA STORIA DEGLI IMPATTI (impatti.js), calcolata solo quando qualcuno la guarda: p.impatti
    Object.defineProperty(p, 'impatti', { configurable: true, enumerable: false, get() { const v = storiaImpatti(p, Sis, casoP); Object.defineProperty(p, 'impatti', { value: v, enumerable: false }); return v; } });
    // lo stato da cui parte il mantello: le irregolarità lasciate dalla formazione di QUESTO pianeta, in questa stella
    // di questa galassia di questo cosmo (per ora un numero legato all'indirizzo e alla massa, non ancora ai suoi urti veri)
    p.origine = hash(semeEvento('mantello', n, gid, sid, p.id), Math.round(Math.log(p.massaKg) * 1e6));
  }
  return Sis;
});

// ---------- un pianeta: l'anello, la magnetosfera, le regioni
// coordinate del pianeta: il raggio del pianeta è 1
export const LATO_REGIONE = 0.32; // in raggi del pianeta
export const pianeta = memo((n, gid, sid, pid) => {
  const P = sistema(n, gid, sid).pianeti[pid], { tra } = casoDi('pianeta', n, gid, sid, pid);
  // l'anello: fasce più e meno dense (come quelle vere); una funzione sola per il disegno e per la fisica
  const A = P.anello, anello = A ? [A.interno, A.esterno] : null;
  const densitaAnello = A ? A.densita : () => 0;
  const regioni = [];
  for (let k = 0; k < REGIONI; k++) {
    const nelAnello = anello && k < 6;
    const ang = (2 * Math.PI * k) / REGIONI + tra(-0.15, 0.15), rr = nelAnello ? tra(A.denso[0], A.denso[1]) : tra(1.45, 4);
    regioni.push({ id: k, pos: [rr * Math.cos(ang), rr * Math.sin(ang)], angolo: ang, r: rr, nellAnello: !!nelAnello && densitaAnello(rr) > 0.05 });
  }
  return { P, anello, densitaAnello, regioni, anelloVero: A };
});

// ---------- la fisica alla scala del pianeta: il suo campo (un dipolo), il pianeta come ostacolo
// mondo del pianeta: 4000 × 4000 unità, il pianeta al centro con raggio 100 unità
const MONDO_P = 4000, R_P = 100;
function mondoPianeta(P) {
  const u = unita(P.raggioM * (1000 / R_P));
  return { u, cella: { larghezza: MONDO_P, altezza: MONDO_P, c: 40, relativita: true, bordo: 'aperto', tempo: 900, fondo: { B: 0, K: 0 }, domini: [],
    masse: [{ pos: [MONDO_P / 2, MONDO_P / 2], M: 0, R: R_P }], dipoli: [{ centro: [MONDO_P / 2, MONDO_P / 2], B0: u.B(P.B0), R: R_P }], pellicola: { w0: 0.8, saturazione: 4, vRif: 5 } } };
}
// lo spettro dei raggi cosmici: tanti lenti, pochi velocissimi (energia cinetica in MeV, ~E^-2.7)
const energiaRaggio = (x, Emin = 500) => { const a = Emin ** -1.7, b = 1e6 ** -1.7; return (a - x * (a - b)) ** (-1 / 1.7); };
// la soglia di Størmer: sotto questa rigidità (GV) un raggio non arriva a quella distanza dal pianeta
// (cresce con il campo e il raggio del pianeta, cala come il quadrato della distanza; Terra all'equatore: 14,9 GV)
const sogliaStormer = (P, r) => (14.9 / (3.1e-5 * 6.371e6)) * P.B0 * P.raggioM / (r * r);
const energiaDaRigidita = (GV) => Math.sqrt((GV * 1000) ** 2 + MP_MEV ** 2) - MP_MEV;
const impulsoProtone = (E) => Math.sqrt(E * E + 2 * E * MP_MEV);
// da quali direzioni arrivano i raggi alla stella del pianeta: le sorgenti della galassia, sparpagliate dal suo campo
function cieloDeiRaggi(a) {
  const Gx = galassia(a.cosmo, a.galassia), st = Gx.stelle[a.stella].pos;
  const sorgenti = Gx.sorgenti.map((s) => { const d = Math.hypot(st[0] - s.pos[0], st[1] - s.pos[1]); return { ...s, verso: Math.atan2(s.pos[1] - st[1], s.pos[0] - st[0]), peso: s.potenza / (0.02 + d * d), k: Math.max(0.6, 6 / (1 + 25 * d)) }; });
  const fondo = 0.15 * sorgenti.reduce((x, s) => x + s.peso, 0);
  const contributi = (fi) => sorgenti.map((s) => s.peso * Math.exp(s.k * (Math.cos(fi - s.verso) - 1)));
  const flusso = (fi) => fondo + contributi(fi).reduce((x, y) => x + y, 0);
  const chi = (fi, u) => { const w = contributi(fi), t = w.reduce((x, y) => x + y, 0) + fondo; let r = u * t; for (let i = 0; i < w.length; i++) if ((r -= w[i]) < 0) return sorgenti[i].nome; return 'il fondo di raggi della galassia'; };
  return { flusso, chi, massimo: fondo + sorgenti.reduce((x, s) => x + s.peso, 0), sorgenti };
}

// le orbite dei raggi cosmici attorno al pianeta (orbite di Størmer), per la mappa
export const magnetosfera = memo((n, gid, sid, pid) => {
  const P = sistema(n, gid, sid).pianeti[pid], { c: caso } = casoDi('magnetosfera', n, gid, sid, pid);
  const { cella } = mondoPianeta(P), cielo = cieloDeiRaggi({ cosmo: n, galassia: gid, stella: sid });
  const sorgenti = [];
  for (let k = 0; k < 400 && sorgenti.length < 36; k++) {
    const fi = caso() * 2 * Math.PI; if (caso() * cielo.massimo > cielo.flusso(fi)) continue;
    // arriva da lontano, dalla direzione fi, con un parametro d'urto a caso
    const b = (caso() - 0.5) * 2 * 12 * R_P, E = energiaRaggio(caso() * 0.9, Math.max(500, energiaDaRigidita(0.3 * sogliaStormer(P, 6))));
    const pos = [MONDO_P / 2 + Math.cos(fi) * 1950 - Math.sin(fi) * b, MONDO_P / 2 + Math.sin(fi) * 1950 + Math.cos(fi) * b];
    if (pos[0] < 0 || pos[1] < 0 || pos[0] > MONDO_P || pos[1] > MONDO_P) continue;
    sorgenti.push({ pos, dir: fi + Math.PI, v: velocita(impulsoProtone(E), MP_ME), t0: 0, specie: 'protone' });
  }
  const tracce = simulaMondo({ ...cella, specie: { protone: { q: 1, m: MP_ME } }, sorgenti }, { passo: 6, maxPassi: 8000 });
  // in raggi del pianeta, con l'origine al centro
  return tracce.map((t) => t.punti.filter((_, i) => i % 2 === 0 || i === t.punti.length - 1).map((p) => [(p[0] - MONDO_P / 2) / R_P, (p[1] - MONDO_P / 2) / R_P]));
});

// ---------- le FASCE DI RADIAZIONE. I raggi cosmici che colpiscono il pianeta (e il suo anello)
// ne fanno uscire neutroni; un neutrone non sente il campo, vola via, e ogni tanto decade in
// un protone e un elettrone proprio dentro la magnetosfera: lì il campo li intrappola. In
// anni si accumula una fascia. Quanto è piena a una distanza r: i neutroni si diradano
// allontanandosi (1/r), le particelle restano intrappolate solo se il campo le tiene (il loro
// giro è piccolo rispetto alla distanza), e l'anello le assorbe dove è denso.
// p in MeV/c, B in tesla → raggio del giro in metri
const raggioGiro = (pMeV, B) => (pMeV * 3.336e-3) / Math.max(B, 1e-15);
export const fascia = (P, Pl, r) => {
  if (r < 1.15 || r > (P.magnetopausa ?? Infinity)) return 0; // (oltre la magnetopausa il vento della stella porta via tutto: risalita.js, ventoStellare)
  const B = P.B0 / r ** 3, tiene = raggioGiro(450, B) < 0.1 * r * P.raggioM ? 1 : 0; // un protone da 100 MeV
  return (tiene * Math.max(0, 1 - 1.12 / r) * Math.exp(-25 * Pl.densitaAnello(r))) / r;
};
// il massimo di fascia() senza anello e dove il campo tiene: (1 − 1,12/r)/r è massima a r = 2,24 e lì vale 1/(4·1,12)
export const FASCIA_MAX = 1 / (4 * 1.12);
// le particelle di una fascia in un quadrato (coordinate del motore), con le energie dei neutroni che decadono
function particelleFascia(P, Pl, r, u, lato, quante, caso, prefisso, { fini = false } = {}) {
  const out = [], B = P.B0 / r ** 3, f = fascia(P, Pl, r) / FASCIA_MAX;
  const n = Math.round(quante * Math.min(1, f));
  for (let i = 0; i < n; i++) {
    // alla scala della regione i protoni (il loro giro si vede); gli elettroni nascono al livello in cui il loro giro si vede
    const protone = !fini;
    // i più fini (visibili solo da vicino): elettroni il cui giro è grande quanto un decimo della finestra
    let pMeV;
    if (fini) { const rg = (0.03 + 0.12 * caso()) * u.metri(lato); pMeV = (rg * B) / 3.336e-3; }
    else if (protone) { const E = 10 * Math.pow(30, caso()); pMeV = Math.sqrt(E * E + 2 * E * MP_MEV); }
    else { const E = 0.05 + 0.73 * caso(); pMeV = Math.sqrt(E * E + 2 * E * ME_MEV); }
    const m = protone ? MP_ME : 1;
    out.push({ pos: [caso() * lato, caso() * lato], dir: caso() * 2 * Math.PI, v: velocita(pMeV, m), t0: 0, specie: protone ? 'protone lento' : 'elettrone', ev: `${prefisso}${i}`,
      origine: "un neutrone uscito dal pianeta (colpito da un raggio cosmico) e decaduto qui: la fascia di radiazione lo tiene" });
  }
  return out;
}

// ---------- una regione: un pezzo della magnetosfera (o dell'anello) del pianeta
export const descriviIndirizzo = (a) => {
  const G = cosmo(a.cosmo).galassie[a.galassia], P = sistema(a.cosmo, a.galassia, a.stella).pianeti[a.pianeta];
  return `${a.cosmo > 1 ? `cosmo ${a.cosmo} · ` : ''}galassia ${a.galassia + 1} (${G.tipo}) · stella ${a.stella + 1} · pianeta ${a.pianeta + 1} (${P.tipo}${P.anelli ? ', con anelli' : ''}) · regione ${a.regione + 1}`;
};
export const CATALOGO = catalogoVero(unita(1e6));

export function regione(a) {
  const numero = numeroDi(a), S = sistema(a.cosmo, a.galassia, a.stella), P = S.pianeti[a.pianeta], Pl = pianeta(a.cosmo, a.galassia, a.stella, a.pianeta), R = Pl.regioni[a.regione];
  const { c: caso } = casoDi('regione', a.cosmo, a.galassia, a.stella, a.pianeta, a.regione);
  const LATO = 1000, latoM = LATO_REGIONE * P.raggioM, u = unita(latoM), { cella: cp } = mondoPianeta(P);
  // la regione nel mondo del pianeta
  const cx = MONDO_P / 2 + R.pos[0] * R_P, cy = MONDO_P / 2 + R.pos[1] * R_P, lp = LATO_REGIONE * R_P, x0 = cx - lp / 2, y0 = cy - lp / 2, k = LATO / lp;
  // I RAGGI COSMICI, CALCOLATI ALL'INDIETRO. Si parte dal bordo della regione con una direzione
  // verso l'interno e un'energia dallo spettro vero, e si segue la particella indietro nel tempo
  // (stessa strada, carica opposta, verso opposto) nel campo vero del pianeta. Se all'indietro
  // esce dalla magnetosfera, è arrivata davvero, dalla direzione da cui è uscita; se sbatte
  // contro il pianeta o resta intrappolata, quella traiettoria non esiste.
  const cielo = cieloDeiRaggi(a), sorgenti = [], specieP = { indietro: { q: -1, m: MP_ME } };
  let prove = 0, vietate = 0;
  // sotto un terzo della soglia non arriva nessuno da nessuna direzione; e più alta è la soglia, meno
  // raggi ci sono (lo spettro cala): così una magnetosfera forte è davvero schermata
  const Emin = Math.max(500, energiaDaRigidita(0.3 * sogliaStormer(P, R.r)));
  const voluti = Math.round((9 + caso() * 8) * Math.min(1, (Emin / 500) ** -1.7));
  while (sorgenti.length < voluti && prove < 12 * voluti + 20) {
    prove++;
    const lato = Math.floor(caso() * 4), t = caso(), nrm = [Math.PI / 2, Math.PI, -Math.PI / 2, 0][lato];
    const pe = [[x0 + t * lp, y0], [x0 + lp, y0 + t * lp], [x0 + t * lp, y0 + lp], [x0, y0 + t * lp]][lato];
    const dir = nrm + Math.asin(2 * caso() - 1), E = energiaRaggio(caso(), Emin), v = velocita(impulsoProtone(E), MP_ME);
    const tr = simulaMondo({ ...cp, tempo: 400, specie: specieP, sorgenti: [{ pos: pe, dir: dir + Math.PI, v, specie: 'indietro' }] }, { passo: 6, maxParticelle: 1, maxPassi: 5000 })[0];
    if (!tr || tr.fine !== 'fuori') { vietate++; continue; }
    const q = tr.punti, ult = q[q.length - 1], pen = q[Math.max(0, q.length - 3)], esce = Math.atan2(ult[1] - pen[1], ult[0] - pen[0]);
    // il flusso da quella direzione decide se c'è davvero un raggio
    if (caso() * cielo.massimo > cielo.flusso(esce)) continue;
    const pos = [Math.min(LATO - 0.01, Math.max(0.01, (pe[0] - x0) * k)), Math.min(LATO - 0.01, Math.max(0.01, (pe[1] - y0) * k))];
    sorgenti.push({ pos, dir, v, t0: 0, specie: 'protone', emissione: { t0: [0, 100] }, origine: `${cielo.chi(esce, caso())} (galassia ${a.galassia + 1})`, energia: E, arrivo: esce });
  }
  // la materia dell'anello: la stessa densità che si vede sulla mappa. Un raggio che la
  // attraversa può urtare un granello di ghiaccio: ne esce uno sciame.
  // la fascia di radiazione, se il campo la tiene
  const fascia0 = particelleFascia(P, Pl, R.r, u, LATO, 18, caso, 'f');
  sorgenti.push(...fascia0);
  const tau = Pl.densitaAnello(R.r), urtoProtone = tau > 0.05 ? (0.9 * LATO) / tau : Infinity;
  const specie = catalogoVero(u, { urtoProtone, urtoFotone: urtoProtone * 0.55 });
  const centroP = [(MONDO_P / 2 - x0) * k, (MONDO_P / 2 - y0) * k], RPr = R_P * k;
  const cella = {
    larghezza: LATO, altezza: LATO, c: 40, G: 1, bordo: 'aperto', tempo: 140, relativita: true, seme: numero, indirizzo: { ...a },
    fondo: { B: 0, K: 0 }, domini: [], masse: [{ pos: centroP, M: 0, R: RPr }], dipoli: [{ centro: centroP, B0: u.B(P.B0), R: RPr }],
    pellicola: { w0: 0.8, saturazione: 4, vRif: 5 }, specie, sorgenti,
    finestra: { centro: [LATO / 2, LATO / 2], lato: 400 }, sezione: { fine: 140, durata: 140 },
    scala: { latoM, secondi: 140 * u.tu, urtoProtone, r: R.r },
  };
  const Breg = P.B0 / R.r ** 3;
  const descrizione = [`il campo del pianeta, ${(Breg * 1e9).toLocaleString('it-IT', { maximumFractionDigits: 0 })} nT`, `${sorgenti.length} raggi cosmici arrivati fin qui (${vietate} strade all'indietro finivano contro il pianeta: da lì non arriva niente)`, tau > 0.05 ? `la polvere dell'anello (spessore ottico ${tau.toFixed(2)})` : 'niente materia', fascia0.length ? `${fascia0.length} particelle della fascia di radiazione` : null].filter(Boolean).join(', ');
  return { nome: `universo n. ${numero}`, nota: `${descriviIndirizzo(a)}, a ${R.r.toFixed(2)} raggi dal centro; la regione è larga ${fmtLunghezza(latoM)}, l'esposizione dura ${(140 * u.tu * 1000).toLocaleString('it-IT', { maximumFractionDigits: 1 })} ms. ${descrizione}. Nessuno l'ha costruito: ogni cosa ha una causa più in là.`, cella };
}

// ---------- lo ZOOM DENTRO UNA REGIONE: una bolla di spaziotempo dieci volte più piccola, nello
// spazio e nel tempo (comincia all'inizio della fetta scelta sopra), calcolata da quella grande. Le particelle che la attraversano sono le stesse, con lo stesso stato e lo stesso caso
// (il loro indirizzo, il tempo proprio e la strada già fatti): decadono dove decadevano lassù.
// In più compare solo ciò che da lontano non si vedeva: gli elettroni più fini della fascia.
// a.zoom = [[i, j], ...]: il quadratino (su una griglia 10 × 10) a ogni livello.
const tracceMemo = new Map();
const tracceDi = (cella, chiave) => { if (!tracceMemo.has(chiave)) { if (tracceMemo.size > 6) tracceMemo.delete(tracceMemo.keys().next().value); tracceMemo.set(chiave, simulaMondo(cella)); } return tracceMemo.get(chiave); };
export function cellaDi(a, rami = null) {
  const zoom = a.zoom || [];
  if (!zoom.length) { const c = regione(a).cella; return rami ? { ...c, rami } : c; }
  const padre = cellaDi({ ...a, zoom: zoom.slice(0, -1) }, rami), [i, j] = zoom[zoom.length - 1];
  const tracce = tracceDi(padre, JSON.stringify([a.cosmo, a.galassia, a.stella, a.pianeta, a.regione, zoom.slice(0, -1), rami]));
  const L = padre.larghezza / 10, x0 = i * L, y0 = j * L, k = 10, dentro = (p) => p[0] >= x0 && p[0] <= x0 + L && p[1] >= y0 && p[1] <= y0 + L;
  const ts = padre.sezione ? Math.max(0, padre.sezione.fine - padre.sezione.durata) : 0, te = ts + padre.tempo / k;
  const visibili = new Set(tracce.map((t) => t.evento));
  // chi decade dentro la bolla mentre dura: la bolla ne rifà da sé il decadimento, con tutte le figlie e le nipoti
  const decadeQui = new Set(tracce.filter((t) => t.evento && t.fine === 'decade' && dentro(t.punti.at(-1)) && t.punti.at(-1)[3] >= ts && t.punti.at(-1)[3] <= te).map((t) => t.evento));
  // l'antenata più vicina che lascia traccia (l'indirizzo di una figlia è quello della madre più un punto e un numero)
  const antenata = (ev) => { for (let e = String(ev), n = e.lastIndexOf('.'); n > 0; n = e.lastIndexOf('.')) { e = e.slice(0, n); if (visibili.has(e)) return e; } return null; };
  const sorgenti = [];
  for (const tr of tracce) {
    if (tr.sagoma || !tr.evento) continue;
    const P = tr.punti, src = tr.madre == null ? padre.sorgenti[tr.sorgente] : null;
    let tp = src?.tp0 ?? 0, strada = src?.percorso0 ?? 0;
    const nome = tr.specie.nome, entra = (q, d, vx, vy) => sorgenti.push({ pos: [Math.min(999.99, Math.max(0.01, (q[0] - x0) * k)), Math.min(999.99, Math.max(0.01, (q[1] - y0) * k))], dir: Math.atan2(vy, vx), v: Math.hypot(vx, vy), t0: (q[3] - ts) * k, nascita: (P[0][3] - ts) * k, specie: nome, ev: tr.evento, tp0: d.tp * k, percorso0: d.strada * k, generazione: tr.generazione, origine: src?.origine, gamma: tr.gamma, impulso: tr.impulso });
    // nata qui dentro (nella bolla) da una madre che non lascia traccia (la luce, le neutre): comincia qui. Ma se la
    // sua antenata visibile decade anche lei dentro la bolla, la bolla rifà tutta la cascata (la luce va dritta e non
    // esce): questa figlia nascerà da sola, e metterla qui la farebbe esistere due volte
    if (dentro(P[0]) && P[0][3] >= ts && P[0][3] <= te && (tr.madre == null || (!visibili.has(tr.madre.evento) && !decadeQui.has(antenata(tr.evento)))) && P.length > 1) { const dt = P[1][3] - P[0][3] || 1e-9; entra(P[0], { tp, strada }, (P[1][0] - P[0][0]) / dt, (P[1][1] - P[0][1]) / dt); }
    for (let n = 1; n < P.length; n++) {
      const a0 = P[n - 1], b = P[n], dt = b[3] - a0[3], ds = Math.hypot(b[0] - a0[0], b[1] - a0[1]);
      if (!(dt > 0)) continue;
      // (il tempo proprio: con il γ della particella, che la traccia porta con sé; la velocità della corda non basta vicino a c)
      const v = Math.min(0.999 * padre.c, ds / dt), dtp = padre.relativita ? (tr.gamma ? dt / tr.gamma : dt * Math.sqrt(1 - (v / padre.c) ** 2)) : dt;
      if (b[3] > te) break;
      // già dentro quando la bolla comincia: continua dal suo stato in quell'istante
      if (a0[3] < ts && b[3] >= ts && a0[2]) {
        const f = (ts - a0[3]) / dt, q = [a0[0] + (b[0] - a0[0]) * f, a0[1] + (b[1] - a0[1]) * f, true, ts];
        if (dentro(q)) entra(q, { tp: tp + dtp * f, strada: strada + ds * f }, (b[0] - a0[0]) / dt, (b[1] - a0[1]) / dt);
      }
      tp += dtp; strada += ds;
      // ogni volta che entra nel quadratino durante la bolla, continua da lì
      if (b[3] >= ts && !dentro(a0) && dentro(b) && a0[2] && a0[3] >= ts) entra(b, { tp, strada }, (b[0] - a0[0]) / dt, (b[1] - a0[1]) / dt);
    }
  }
  const latoM = padre.scala.latoM / 10, u = unita(latoM), r = padre.scala.r;
  const Sx = sistema(a.cosmo, a.galassia, a.stella), Px = Sx.pianeti[a.pianeta], Pl = pianeta(a.cosmo, a.galassia, a.stella, a.pianeta);
  const { c: caso } = casoDi('zoom', a.cosmo, a.galassia, a.stella, a.pianeta, a.regione, JSON.stringify(zoom));
  sorgenti.push(...particelleFascia(Px, Pl, r, u, 1000, 14, caso, `z${zoom.length}.${i}.${j}.f`, { fini: true }));
  const urto = padre.scala.urtoProtone * k;
  return {
    ...padre, larghezza: 1000, altezza: 1000, tempo: padre.tempo, indirizzo: { ...a, zoom },
    masse: padre.masse.map((m) => ({ ...m, pos: [(m.pos[0] - x0) * k, (m.pos[1] - y0) * k], R: m.R * k })),
    dipoli: padre.dipoli.map((d) => ({ ...d, centro: [(d.centro[0] - x0) * k, (d.centro[1] - y0) * k], R: d.R * k, B0: d.B0 / k })),
    specie: catalogoVero(u, { urtoProtone: urto, urtoFotone: urto * 0.55 }), sorgenti,
    finestra: { centro: [500, 500], lato: 400 }, sezione: { fine: padre.tempo, durata: padre.tempo },
    scala: { ...padre.scala, latoM, secondi: padre.tempo * u.tu, urtoProtone: urto },
  };
}

// ---------- I MOTI VERI DI UNA REGIONE: con quale velocità si muove, rispetto a lei, chi sta fermo più in su.
// La traccia di una particella dipende dal suo moto e da quello di chi la guarda: fermo nella regione (che non gira,
// centrata sul pianeta), sul pianeta che gira, fermo rispetto alla stella mentre il pianeta le corre attorno. Ogni
// voce dà la velocità di chi guarda rispetto alla regione (frazione di c) e la direzione (gradi nel piano della
// regione, che è quello dell'orbita). Sono moti lenti rispetto alla luce: lo si dice con i numeri veri.
export function motiDi(a) {
  const P = sistema(a.cosmo, a.galassia, a.stella).pianeti[a.pianeta], R = pianeta(a.cosmo, a.galassia, a.stella, a.pianeta).regioni[a.regione], c = COSTANTI.c, gr = 180 / Math.PI;
  const giro = (2 * Math.PI * R.r * P.raggioM) / P.giorno, orbita = (2 * Math.PI * P.aM) / P.anno;
  // I MOTI PIÙ GRANDI vengono dal mondo in tre dimensioni (spazio3d.js: motiRegione): la stella nella galassia (il suo
  // cerchio guida alla velocità della curva di rotazione, più l'epiciclo e il su e giù attraverso il disco; nello
  // sferoide la sua orbita), la galassia nel cosmo (la teoria lineare sul campo in tre dimensioni con lo spettro vero:
  // cosmo3d.js), ognuna girata nel riferimento del sistema (il piano di un sistema non è quello della galassia). La
  // regione, che è piatta, ne vede la parte che sta nel piano del sistema; `kmS3d` è la velocità intera.
  const Gx = galassia(a.cosmo, a.galassia), S = Gx.stelle[a.stella], M3 = motiRegione(a), n3 = (v) => Math.hypot(v[0], v[1], v[2]);
  const vP = [-orbita * Math.sin(P.fase), orbita * Math.cos(P.fase), 0], vS = M3.stella.map((x) => x * 1e3), vG = M3.galassia.map((x) => x * 1e3);
  // chi guarda è fermo rispetto a qualcosa di più grande: rispetto alla regione va al contrario della somma dei moti di sotto
  const voce = (nome, v, cosa) => { const m = Math.hypot(v[0], v[1]); return { nome, kmS: m / 1000, velocita: m / c, direzione: ((Math.atan2(-v[1], -v[0]) * gr) % 360 + 360) % 360, kmS3d: n3(v) / 1000, fuoriDalPiano: -v[2] / 1000, cosa }; };
  const somma = (...vs) => vs.reduce((t, v) => [t[0] + v[0], t[1] + v[1], t[2] + v[2]], [0, 0, 0]);
  return [
    { nome: 'ferma nella regione', kmS: 0, velocita: 0, direzione: 0, cosa: 'chi guarda sta fermo rispetto al pianeta, senza girare con lui' },
    { nome: 'sul pianeta che gira', kmS: giro / 1000, velocita: giro / c, direzione: ((R.angolo * gr + (P.retrogrado ? -90 : 90)) % 360 + 360) % 360, cosa: 'chi guarda gira con il pianeta (e con il suo campo magnetico)' },
    { nome: 'ferma rispetto alla stella', kmS: orbita / 1000, velocita: orbita / c, direzione: ((P.fase * gr - 90) % 360 + 360) % 360, cosa: 'chi guarda sta fermo rispetto alla stella: il pianeta, con la regione, gli corre davanti lungo l\'orbita' },
    voce('ferma rispetto alla galassia', somma(vP, vS), `chi guarda sta fermo rispetto al centro della galassia: la stella gli passa davanti a ${Math.round(n3(vS) / 1000)} km/s (${S.componente === 'sferoide' ? 'la sua orbita nello sferoide' : `il giro del disco a ${(Math.hypot(S.pos[0], S.pos[1]) * Gx.forma.unitaKpc).toPrecision(2)} kpc dal centro`}), con il pianeta che le gira attorno`),
    voce('ferma rispetto al fondo cosmico', somma(vP, vS, vG), `chi guarda sta fermo rispetto all'universo: la galassia cade verso dove c'è più materia a ${Math.round(n3(vG) / 1000)} km/s (teoria lineare sul campo del cosmo in tre dimensioni), e dentro girano la stella e il pianeta`),
  ];
}
