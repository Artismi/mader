// reazioni.js — LA CHIMICA CHE SI MUOVE DA SÉ (PROGETTO.md, lavoro 10; la regola zero applicata alla chimica di un luogo).
//
// La vita non si scrive: in un luogo (una finestra del mare, una pozza che evapora, una sorgente calda) si danno gli STATI,
// le CONSERVAZIONI, le ENERGIE, le VELOCITÀ con il bilancio dettagliato e i FLUSSI DAL BORDO, e si lascia andare la
// chimica evento per evento. Poi si GUARDA che cosa è emerso, senza averlo chiesto.
//   STATI          le specie e il loro numero in un volume piccolo V. Vengono dalla scala sopra: gli ioni, i gas sciolti e
//                  il carbonio del mare dal campione di mare.js (campioneAcqua: lo stesso padre della finestra a
//                  nanometri di finestra.js), le molecole organiche dalla resa prebiotica dell'aria del pianeta
//                  (chimica.js prebiotica), la luce dalla stella. Ogni specie entra nel volume col suo numero di Poisson.
//   CONSERVAZIONI  gli atomi e la carica: ogni passo è una reazione delle regole di molecole_reazioni.js, che modificano un
//                  grafo solo (i prodotti sono i suoi pezzi): C, N, S, P e H − 2·O (l'acqua è il serbatoio del solvente) si
//                  conservano per costruzione, numero per numero, e la prova lo conta.
//   ENERGIE        le energie libere di formazione in acqua di molecole_energia.js (entalpie dai termini di legame tarati
//                  sulle tavole, entropie dalla meccanica statistica, idratazione, protonazione al pH del luogo), una sola
//                  tabella per tutte le specie: g_i = (G_i − n_O,i·μ_acqua)/RT (la trasformata di Legendre rispetto al
//                  solvente, come in molecole_rete.js equilibrioRete).
//   VELOCITÀ       la rete è GENERATA DA REGOLE (molecole_rete.js rete: le famiglie di passi elementari applicate a ogni
//                  sito che le ammette — addizioni e aldoliche del formosio, cianidrine e Strecker, condensazione e idrolisi,
//                  tautomerie —, generazione dopo generazione, potata dal criterio del flusso di RMG). k₊ dalla barriera di
//                  Marcus con la barriera intrinseca di famiglia misurata, Eyring, o dalla vita MISURATA della classe di
//                  legame (molecole_pozzi.js). k₋ dal BILANCIO DETTAGLIATO LOCALE con la stessa tabella delle energie:
//                  k₊/k₋ = exp(−Δg), Δg = Σ g prodotti − Σ g reagenti. Dove la regola aveva un ΔG misurato diverso da quello
//                  della tabella (le condensazioni di molecole_pozzi: glicoside, fosfodiestere) vale la tabella, perché con due
//                  fonti di energia i cicli della rete non tornerebbero a zero (Wegscheider): si tiene la k misurata
//                  dell'idrolisi e la condensazione segue. Sono NON TORNA dichiarati (nonTorna.energie).
//   FLUSSI         dal bordo: (1) il RICAMBIO con il padre — ogni specie tenuta entra con k·Ω·c_bordo ed esce con k·n
//                  (una coppia reversibile: il serbatoio ha il suo potenziale chimico, e la produzione d'entropia resta
//                  finita); (2) i CICLI DI BAGNATO E SECCO — l'attività dell'acqua cambia a fasi (una pozza di marea:
//                  mare.js pozzeDiMarea, il periodo); (3) la LUCE della stella e il CALORE e i MINERALI dei camini entrano
//                  nelle condizioni del luogo (velocità e catalisi di molecole_reazioni.js). Un sistema con un solo
//                  serbatoio, o con serbatoi compatibili, rilassa all'equilibrio; con potenziali incompatibili (formaldeide
//                  tenuta alta, glicolaldeide portata via) resta fuori equilibrio e produce entropia.
//                  IL BAGNO: dove il bordo rinnova una specie più in fretta della risoluzione (una finestra di un micron del
//                  mare si rinnova per diffusione in L²/6D = 0,17 ms) quella specie è una concentrazione fissa, come l'acqua;
//                  ciò che nasce nella scatola esce col ricambio (passi senza ritorno, contati a parte).
// I LUOGHI: la finestra del mare (luogoDelMare: il campione di mare.js, la resa prebiotica dell'aria), la pozza che
// evapora e il camino (le pozze e le sorgenti calde di mare.js prebiotica), i PORI DELLA CROSTA (luogoDellaCrosta: Athy e il
// tempo di residenza dell'acqua dalla colonna di suolo.js, il gradiente geotermico, l'H₂ della serpentinizzazione e della radiolisi, il CO₂ disciolto; vedi lì).
//   GILLESPIE      l'algoritmo diretto (Gillespie 1977) su questo volume: il tempo d'attesa Δt = −ln(1 − u)/a₀ (legge
//                  ESPONENZIALE da un tiro uniforme, col logaritmo esatto di eventi.js) e quale reazione (legge DISCRETA sui
//                  pesi a_j), scritto nella forma del prossimo scatto modificato di Anderson (2007): ogni canale ha il suo
//                  flusso, «…/chimica/canale/<tipo>: <reagenti> → <prodotti>/<andata|ritorno>» (c.serie), e il suo n-esimo
//                  scatto usa l'n-esima estrazione. Per lo stesso indirizzo la storia chimica è la stessa, bit per bit;
//                  allargare la rete non cambia i numeri dei canali che c'erano; con conRegistro ogni tiro è annotato. Le reazioni 1 ⇌ 1 con
//                  tempo di rilassamento sotto la RISOLUZIONE (le idratazioni, le tautomerie veloci, gli anelli che si aprono)
//                  stanno in un INSIEME in equilibrio: il loro numero totale è lo stato, e chi ne prende una molecola la
//                  prende con il peso di Boltzmann (multinomiale: Cao, Gillespie e Petzold 2005, J. Chem. Phys. 122, 014116,
//                  l'SSA a scala lenta; per reazioni del primo ordine la distribuzione condizionata è esatta — Jahnke e
//                  Huisinga 2007). È la stessa scelta che molecole_energia fa già per gli stati di protonazione.
// IL TEMPO GUARDATO. Le velocità della rete vanno da 10⁻¹⁵ a 10¹⁰ 1/s: in un tempo dato alcune reazioni si muovono, altre
// no. attiveNelTempo(τ) le separa con il loro tempo di rilassamento all'equilibrio vincolato, κ_j = v_j·Σ ν²/c (la stessa
// linearizzazione di molecole_rete evolvi): si muovono quelle con κ·τ ≥ 1; le altre restano ferme e la loro stechiometria
// diventa una conservazione in più. L'EQUILIBRIO è il minimo dell'energia di Gibbs con TUTTE le conservazioni delle
// reazioni che si muovono (lo spazio nullo sinistro della matrice stechiometrica: gli atomi, e ciò che le reazioni ferme
// non possono cambiare): c_i = exp(−g_i + Σ_j L_ij λ_j), il minimo di una funzione convessa (Newton).
// LA RILEVAZIONE, NON LA SCRITTURA (rileva): insiemi RAF (Hordijk e Steel 2004, J. Theor. Biol. 227, 451: l'algoritmo del
// massimo RAF, cibo + chiusura + catalisi), con la catalisi da regole — i cicli autocatalitici stechiometrici di Blokhuis,
// Lacoste e Nghe 2020 (molecole_rete autocatalitici: la reazione netta di un ciclo è catalizzata dai suoi membri), la
// catalisi acido-base di Brønsted (un sito con pKa entro 1,5 dal pH), gli ioni metallici e i minerali del luogo —; i cicli;
// le MEMBRANE (anfifiliche sopra la concentrazione micellare critica di molecole_forze aggregazione, Tanford);
// i POLIMERI CHE SI COPIANO (un prodotto di condensazione che, come stampo, accelera la propria formazione: molecole_incontri
// catalisiDa, il replicatore minimo di von Kiedrowski 1986). Le misure non garantiscono niente: sanno vedere.
// GLI EVENTI RARI: forward flux sampling (Allen, Warren e ten Wolde 2005, Phys. Rev. Lett. 94, 018104), sullo stesso motore,
// con le prove indirizzate (ffs).
// PARAMETRI LIBERI: SCALA_PREBIOTICA (mol/L per unità di resa: lo stesso 10⁻³ di molecole.js reteDelLuogo); il ricambio di
// una finestra col mare attorno, 6D/L² con D = 10⁻⁹ m²/s [R] (diffusione di una molecola piccola); BRONSTED_PKA = 1,5 (la
// regola di molecole_rete raf). DATI: quelli dei moduli da cui si legge.
// NON TORNA / MANCA (dichiarati): i pozzi misurati senza prodotti scritti (zuccheri che si disfano, basi che perdono
// l'ammina: molecole_pozzi) non conservano gli atomi e restano fuori dalla dinamica chiusa (si contano); la luce spezza
// le molecole in radicali (molecole_reazioni fotolisi) ma la rete dei radicali non è aperta qui: la fotolisi entra solo
// come «manca»; due scatole con pH diversi (il camino alcalino contro il mare acido) non sono ancora un luogo solo;
// l'induzione del formosio (il primo legame C–C dalla sola formaldeide) non ha via nelle regole: la sua probabilità per
// le regole è zero, contro la chimica vera (Breslow 1959).

import { sorgente, logEsatto } from './eventi.js';
import { rete as reteDiRegole, autocatalitici } from './molecole_rete.js';
import { energia, sitiAcidoBase, neutra, R } from './molecole_energia.js';
import { conta, molecola, chiave } from './molecole_grafo.js';
import { aggregazione } from './molecole_forze.js';
import { catalisiDa } from './molecole_incontri.js';
import { campioneAcqua } from './mare.js';
import { crostaDelPianeta, comeOggetto } from './elementi.js';
import { STORIA } from './storia.js';
import { colonnaDelPianeta } from './suolo.js'; // la porosità di Athy e il tempo di residenza dell'acqua nei pori: dal suolo
import { ANNO, COSTANTI, GIORNO, PESI_ATOMICI } from './leggi.js'; // le costanti e le unità: un posto solo

export const NA = COSTANTI.NA;
export const SCALA_PREBIOTICA = 1e-3, DIFFUSIONE = 1e-9, BRONSTED_PKA = 1.5;
// le leggi dei tiri di una storia (misura.js le pesa): un evento del luogo per canale, estrazione n-esima per l'n-esimo scatto
export const LEGGI_DEI_TIRI = Object.freeze({
  canale: 'esponenziale a tasso uno: il prossimo scatto interno del canale, E = −ln(1 − u), u uniforme (logEsatto); un flusso per canale, col nome della reazione (Anderson 2007)',
  scatola: 'Poisson del numero di ogni specie, media Ω·c (inversione della cumulata per media < 50, campana sopra)' });
const CONSERVATI = ['C', 'N', 'S', 'P', 'H-2O'];
const FAMIGLIE_ACIDO_BASE = new Set(['addizione', 'addizione C', 'eliminazione', 'tautomeria', 'sostituzione']);

// ---------- piccoli strumenti
const ionico = (nome) => { const m = /^(.*?)(\((\d*)([+-])\)|(\d*)([+-]))$/.exec(nome); if (!m) return { formula: nome, q: 0 }; const n = +(m[3] ?? m[5]) || 1, s = (m[4] ?? m[6]) === '+' ? 1 : -1; return { formula: m[1], q: s * n }; };
const atomiFormula = (f) => { const a = {}; for (const [, s, n] of f.matchAll(/([A-Z][a-z]?)(\d*)/g)) a[s] = (a[s] || 0) + (+n || 1); return a; };
const contenuto = (a) => ({ C: a.C || 0, N: a.N || 0, S: a.S || 0, P: a.P || 0, 'H-2O': (a.H || 0) - 2 * (a.O || 0) });

// le chiavi come le scrive la rete (la forma neutra, canonica): «OC(=O)O» e «C(=O)(O)O» sono la stessa specie
const forma0 = (k) => { const m = molecola(k); return m.atomi.some((a) => a.q) ? chiave(neutra(m)) : chiave(m); };
const forma1 = (L) => (k) => (k in (L.spettatori || {}) ? k : forma0(k)), rinomina = (o, f) => (o ? Object.fromEntries(Object.entries(o).map(([k, v]) => [f(k), v])) : o);
function canonico(L) { const f = forma1(L); return { ...L, molecole: rinomina(L.molecole, f), cibo: L.cibo ? L.cibo.map(f) : L.cibo, flussi: L.flussi ? { ...L.flussi, tenute: rinomina(L.flussi.tenute, f) } : L.flussi }; }

// ---------- IL SISTEMA: la rete delle regole, letta come specie, energie e reazioni reversibili
// luogo = { indirizzo, T, pH, attivitaAcqua, molecole: { chiave: mol/L } (ciò che reagisce), spettatori: { 'Ca2+': mol/L, … }
//   (ioni che non hanno reazioni nella rete: contano per la composizione e la carica, e i metalli catalizzano), ioni (le
//   condizioni di catalisi di molecole_reazioni), minerali, luce, cibo: [chiavi], flussi: { tenute: { chiave: mol/L }, ricambio }, fasi }
// opzioni: quelle di molecole_rete rete (profondita, atomiMassimi, …)
export function sistema(luogo = {}, { profondita = 4, atomiMassimi = 8, ...opzRete } = {}) {
  const t0 = performance.now(), cond = { T: luogo.T ?? 298.15, pH: luogo.pH ?? 7, solvente: 'acqua', ioni: luogo.ioni || {}, minerali: luogo.minerali || [], luce: luogo.luce || null };
  luogo = canonico(luogo); const partenza = { ...(luogo.molecole || {}) }; for (const k in luogo.flussi?.tenute || {}) if (!(k in partenza) && !(k in (luogo.spettatori || {}))) partenza[k] = luogo.flussi.tenute[k];
  const r = Object.keys(partenza).length ? reteDiRegole(partenza, cond, { profondita, atomiMassimi, ...opzRete }) : null;
  const S = leggiRete(r, luogo, cond); S.msRete = performance.now() - t0;
  // LA RETE PIGRA: cresce solo se si guarda più lontano (altre generazioni dove la storia ha portato materia sul fronte)
  S.espandi = (n = 1) => { if (!r) return S; const t1 = performance.now(); r.espandi(n); const N = leggiRete(r, luogo, cond); N.espandi = S.espandi; N.msRete = S.msRete + performance.now() - t1; return N; };
  return S;
}
function leggiRete(r, luogo, cond) {
  const T = cond.T, RT = R * T, aw = luogo.attivitaAcqua ?? 1, chiavi = [], idx = new Map();
  if (r) for (const k of r.specie.keys()) if (k !== 'O' && k !== '[H+]') { idx.set(k, chiavi.length); chiavi.push(k); }
  const nRete = chiavi.length;
  for (const k in luogo.spettatori || {}) if (!idx.has(k)) { idx.set(k, chiavi.length); chiavi.push(k); }
  const n = chiavi.length, g1 = new Float64Array(n), nO = new Float64Array(n), q = new Float64Array(n), cont = [], atomi = [];
  const condE = { T, pH: cond.pH, solvente: 'acqua', attivitaAcqua: 1 }, Gw = energia('O', condE).G;
  for (let i = 0; i < n; i++) { const k = chiavi[i];
    if (i < nRete) { const a = conta(k); atomi.push(a); nO[i] = a.O || 0; g1[i] = (energia(k, condE).G - nO[i] * Gw) / RT; }
    else { const io = ionico(k), a = atomiFormula(io.formula); atomi.push(a); q[i] = io.q; nO[i] = a.O || 0; g1[i] = 0; }
    cont.push(contenuto(atomi[i])); }
  // le reazioni reversibili (i pozzi senza prodotti restano fuori: non conservano gli atomi)
  const reazioni = [], nonTorna = { energie: [], pozzi: 0, doppie: 0 }, viste = new Set();
  for (const x of r ? r.reazioni : []) { if (x.tipo === 'pozzo') { nonTorna.pozzi++; continue; }
    // (la stessa reazione trovata da due regole — un'addizione e l'eliminazione inversa — è una reazione sola: contata due
    // volte andrebbe al doppio della velocità)
    const a1 = [...x.reagenti].sort().join('.'), b1 = [...x.prodotti].sort().join('.'), id = a1 < b1 ? `${a1}>${b1}` : `${b1}>${a1}`; if (viste.has(id)) { nonTorna.doppie++; continue; } viste.add(id);
    const re = [], pr = []; let wR = 0, wP = 0;
    for (const k of x.reagenti) { if (k === 'O') wR++; else if (k !== '[H+]') re.push(idx.get(k)); }
    for (const k of x.prodotti) { if (k === 'O') wP++; else if (k !== '[H+]') pr.push(idx.get(k)); }
    if (re.some((i) => i == null) || pr.some((i) => i == null) || (!re.length && !pr.length)) continue;
    let dg = 0; for (const i of pr) dg += g1[i]; for (const i of re) dg -= g1[i];
    // (la regola dà k e kInversa a attività dell'acqua 1; la tabella delle energie decide il rapporto. Si tiene la k della
    // direzione che consuma acqua — l'idrolisi, misurata dove la classe è misurata —, l'altra dal bilancio dettagliato)
    let kp, km; if (wR >= wP) { kp = x.k; km = kp * Math.exp(dg); } else { km = x.kInversa; kp = km * Math.exp(-dg); }
    const scarto = Math.log(x.k / x.kInversa) + dg; if (Math.abs(scarto) > 1e-6) nonTorna.energie.push({ tipo: x.tipo, misurato: x.misurato, reagenti: x.reagenti, prodotti: x.prodotti, scartoRT: scarto });
    if (!(kp > 0) || !(km > 0) || !isFinite(kp) || !isFinite(km)) continue;
    reazioni.push({ tipo: x.tipo, re, pr, wR, wP, kp1: kp, km1: km, dg1: dg, barriera: x.barriera, chiave: `${x.reagenti.join(' + ')} → ${x.prodotti.join(' + ')}` }); }
  const cibo = luogo.cibo || Object.keys({ ...(luogo.molecole || {}), ...(luogo.flussi?.tenute || {}) }).filter((k) => idx.has(k) && k !== 'O');
  return { luogo, condizioni: cond, rete: r, chiavi, idx, nRete, g1, nO, q, contenuto: cont, atomi, reazioni, nonTorna, aw, RT, cibo,
    g: (a = aw) => { const g = new Float64Array(n); const l = Math.log(a); for (let i = 0; i < n; i++) g[i] = g1[i] - (i < nRete ? nO[i] * l : 0); return g; } };
}

// ---------- GLI INSIEMI IN EQUILIBRIO VELOCE (le reazioni 1 ⇌ 1 più rapide della risoluzione)
function insiemi(S, risoluzione, aw) {
  const n = S.chiavi.length, padre = Int32Array.from({ length: n }, (_, i) => i), su = (i) => { while (padre[i] !== i) { padre[i] = padre[padre[i]]; i = padre[i]; } return i; };
  const uguale = (a, b) => CONSERVATI.every((e) => a[e] === b[e]);
  for (const x of S.reazioni) { if (x.re.length !== 1 || x.pr.length !== 1) continue; const kp = x.kp1 * aw ** x.wR, km = x.km1 * aw ** x.wP;
    if ((kp + km) * risoluzione >= 1 && uguale(S.contenuto[x.re[0]], S.contenuto[x.pr[0]])) { const a = su(x.re[0]), b = su(x.pr[0]); if (a !== b) padre[Math.max(a, b)] = Math.min(a, b); } }
  const di = new Int32Array(n), radici = new Map(); for (let i = 0; i < n; i++) { const p = su(i); if (!radici.has(p)) radici.set(p, radici.size); di[i] = radici.get(p); }
  const membri = Array.from({ length: radici.size }, () => []); for (let i = 0; i < n; i++) membri[di[i]].push(i);
  return { di, membri, P: radici.size };
}
// i pesi di Boltzmann dentro ogni insieme, all'attività dell'acqua aw
function pesiDegliInsiemi(ins, g) { const w = new Float64Array(g.length), G = new Float64Array(ins.P);
  for (let p = 0; p < ins.P; p++) { const m = ins.membri[p]; let gm = Infinity; for (const i of m) gm = Math.min(gm, g[i]); let Z = 0; for (const i of m) Z += Math.exp(-(g[i] - gm)); for (const i of m) w[i] = Math.exp(-(g[i] - gm)) / Z; G[p] = gm - Math.log(Z); }
  return { w, G }; }

// ---------- IL MOTORE DI GILLESPIE
// motore(S, { V (m³), risoluzione (s), attivitaAcqua, flussi, fasi, sorgente }) → { N (numero per insieme), t, passo(), corri(fino, opzioni), … }
export function motore(S, { V = 1e-21, risoluzione = 1e-3, flussi = S.luogo.flussi || null, fasi = S.luogo.fasi || null, caso = null } = {}) {
  const aw0 = S.aw, ins = insiemi(S, risoluzione, aw0), P = ins.P, Om = NA * V * 1e3; // (Ω = N_A·V in litri: molecole per mol/L)
  // i canali: per ogni reazione tra insiemi diversi l'andata e il ritorno; poi entrata e uscita di ogni specie tenuta dal bordo
  // IL BAGNO: le specie tenute che il bordo rinnova più in fretta della risoluzione (una finestra piccola nel mare: la
  // diffusione la attraversa in L²/6D) non sono numeri della scatola ma concentrazioni fisse, come l'acqua; l'insieme che
  // ne contiene una è fisso con lei. Le altre specie tenute entrano ed escono a coppie reversibili; con «uscita» ogni altra
  // specie libera esce col ricambio verso un bordo che non ne ha (un passo senza ritorno, contato a parte).
  if (flussi?.tenute) flussi = { ...flussi, tenute: rinomina(flussi.tenute, forma1(S.luogo)) }; // (le chiavi come le scrive la rete)
  const tenuteTutte = flussi?.tenute ? Object.keys(flussi.tenute).filter((k) => S.idx.has(k)) : [], ricambio = flussi?.ricambio ?? 0, bagno = ricambio * risoluzione >= 1;
  const fisso = new Map(); if (bagno) for (const k of tenuteTutte) { const i = S.idx.get(k), p = ins.di[i]; if (!fisso.has(p)) fisso.set(p, { i, cb: flussi.tenute[k] }); }
  const canali = [], interne = [];
  const multi = (lista) => { const m = new Map(); for (const i of lista) { const p = ins.di[i]; m.set(p, (m.get(p) || 0) + 1); } const tutti = [...m.entries()].sort((a, b) => a[0] - b[0]); return { liberi: tutti.filter(([p]) => !fisso.has(p)), fissi: tutti.filter(([p]) => fisso.has(p)) }; };
  const somma = (l) => l.reduce((x, [, m]) => x + m, 0);
  S.reazioni.forEach((x, j) => { const a = multi(x.re), b = multi(x.pr), A0 = [...a.liberi, ...a.fissi], B0 = [...b.liberi, ...b.fissi].sort((u, v) => u[0] - v[0]); A0.sort((u, v) => u[0] - v[0]);
    if ((A0.length === B0.length && A0.every(([p, m], k) => B0[k][0] === p && B0[k][1] === m)) || (!a.liberi.length && !b.liberi.length)) { interne.push(j); return; }
    canali.push({ r: j, verso: 1, da: a.liberi, a: b.liberi, fissi: a.fissi, ordine: somma(a.liberi) }, { r: j, verso: -1, da: b.liberi, a: a.liberi, fissi: b.fissi, ordine: somma(b.liberi) }); });
  const nReaz = canali.length, tenute = tenuteTutte.filter((k) => !fisso.has(ins.di[S.idx.get(k)]));
  for (const k of tenute) { const i = S.idx.get(k), p = ins.di[i]; canali.push({ bordo: i, verso: 1, da: [], a: [[p, 1]], fissi: [], ordine: 0, cb: flussi.tenute[k] }, { bordo: i, verso: -1, da: [[p, 1]], a: [], fissi: [], ordine: 1 }); }
  if (flussi?.uscita && ricambio > 0) { const giaTenuti = new Set(tenute.map((k) => ins.di[S.idx.get(k)])); for (let p = 0; p < P; p++) if (!fisso.has(p) && !giaTenuti.has(p)) canali.push({ bordo: ins.membri[p][0], insieme: true, verso: 1, da: [], a: [[p, 1]], fissi: [], ordine: 0, cb: 0 }, { bordo: ins.membri[p][0], insieme: true, verso: -1, da: [[p, 1]], a: [], fissi: [], ordine: 1 }); }
  const C = canali.length, F = new Float64Array(C);
  // le costanti di ogni canale all'attività dell'acqua aw: F = k·Π w^ν (la parte di ogni insieme che è la specie giusta)·Π c del bagno
  let pesi = null, awOra = aw0;
  const costanti = (aw) => { awOra = aw; pesi = pesiDegliInsiemi(ins, S.g(aw)); const w = pesi.w, cFisso = new Map(); for (const [p, f] of fisso) cFisso.set(p, f.cb / w[f.i]);
    for (let c = 0; c < C; c++) { const ch = canali[c];
      if (ch.bordo != null) { F[c] = ch.verso > 0 ? ricambio * Om * ch.cb : ricambio * (ch.insieme ? 1 : w[ch.bordo]); continue; }
      const x = S.reazioni[ch.r]; let f = ch.verso > 0 ? x.kp1 * aw ** x.wR : x.km1 * aw ** x.wP; for (const i of ch.verso > 0 ? x.re : x.pr) f *= w[i]; for (const [p, m] of ch.fissi) f *= cFisso.get(p) ** m; F[c] = f * Om ** (1 - ch.ordine); } };
  costanti(aw0);
  // dipendenze: insieme → canali la cui propensione ne dipende; e i cambi di ogni canale (CSR)
  const dip = Array.from({ length: P }, () => []); canali.forEach((ch, c) => { for (const [p] of ch.da) dip[p].push(c); });
  const dipI = new Int32Array(P + 1); for (let p = 0; p < P; p++) dipI[p + 1] = dipI[p] + dip[p].length; const dipC = new Int32Array(dipI[P]); for (let p = 0; p < P; p++) dipC.set(dip[p], dipI[p]);
  const daI = new Int32Array(C + 1), aI = new Int32Array(C + 1); canali.forEach((ch, c) => { daI[c + 1] = daI[c] + ch.da.length; aI[c + 1] = aI[c] + ch.a.length; });
  const daP = new Int32Array(daI[C]), daM = new Int32Array(daI[C]), aP = new Int32Array(aI[C]), aM = new Int32Array(aI[C]);
  canali.forEach((ch, c) => { ch.da.forEach(([p, m], k) => { daP[daI[c] + k] = p; daM[daI[c] + k] = m; }); ch.a.forEach(([p, m], k) => { aP[aI[c] + k] = p; aM[aI[c] + k] = m; }); });
  const N = new Float64Array(P);
  const prop = (c) => { let a = F[c]; for (let k = daI[c]; k < daI[c + 1]; k++) { const n = N[daP[k]]; for (let m = 0; m < daM[k]; m++) a *= n - m; } return a > 0 ? a : 0; };
  // l'albero delle somme parziali (foglie in [L, 2L))
  let L = 1; while (L < C) L *= 2; const albero = new Float64Array(2 * L);
  const metti = (c, v) => { let i = L + c; albero[i] = v; for (i >>= 1; i >= 1; i >>= 1) albero[i] = albero[2 * i] + albero[2 * i + 1]; };
  // IL METODO DEL PROSSIMO SCATTO MODIFICATO (Anderson 2007, J. Chem. Phys. 127, 214107; la rappresentazione a processi di
  // Poisson a tasso unitario, Kurtz): ogni canale c ha il SUO orologio interno T_c = ∫a_c dt e il suo prossimo scatto interno
  // P_c, una somma di esponenziali a tasso uno tirate dal SUO flusso, che ha il nome del canale («canale/<tipo>: <reagenti> →
  // <prodotti>/andata», «bordo/<specie>/entra»…). Scatta il canale con t + (P_c − T_c)/a_c più piccolo. È la stessa legge di
  // Gillespie (esatta), ma i numeri di un canale non dipendono da quanti canali ci sono né dal loro ordine: allargare la rete
  // non rimescola la storia dei canali che c'erano (prima i tiri erano due serie globali per numero di passo, «quando» e
  // «quale», e ogni canale nuovo spostava la scelta di tutti i passi dopo). Dà anche numeri casuali comuni tra due storie.
  const nomi = new Array(C), visti = new Map();
  canali.forEach((ch, c) => { let n = ch.bordo != null ? (ch.insieme ? `uscita/${S.chiavi[ch.bordo]}` : `bordo/${S.chiavi[ch.bordo]}/${ch.verso > 0 ? 'entra' : 'esce'}`) : `canale/${S.reazioni[ch.r].tipo}: ${S.reazioni[ch.r].chiave}/${ch.verso > 0 ? 'andata' : 'ritorno'}`;
    const v = visti.get(n) || 0; visti.set(n, v + 1); if (v) n += ` #${v + 1}`; nomi[c] = n; });
  const flusso = new Array(C), scatti = new Float64Array(C), Tint = new Float64Array(C), Pint = new Float64Array(C), tUlt = new Float64Array(C), tau = new Float64Array(C);
  const esp = (c) => -logEsatto(1 - flusso[c](scatti[c]++));
  // il mucchio (heap) dei prossimi tempi assoluti, con la posizione di ogni canale
  const mucchio = new Int32Array(C), posto = new Int32Array(C);
  const scambia = (i, j) => { const a = mucchio[i], b = mucchio[j]; mucchio[i] = b; mucchio[j] = a; posto[b] = i; posto[a] = j; };
  const sali = (i) => { while (i > 0) { const g = (i - 1) >> 1; if (tau[mucchio[g]] <= tau[mucchio[i]]) break; scambia(i, g); i = g; } };
  const scendi = (i) => { for (;;) { const a = 2 * i + 1, b = a + 1; let m = i; if (a < C && tau[mucchio[a]] < tau[mucchio[m]]) m = a; if (b < C && tau[mucchio[b]] < tau[mucchio[m]]) m = b; if (m === i) break; scambia(i, m); i = m; } };
  const ritocca = (c) => { const i = posto[c]; sali(i); scendi(posto[c]); };
  const prossimo = (c) => { const a = albero[L + c]; tau[c] = a > 0 ? tUlt[c] + (Pint[c] - Tint[c]) / a : Infinity; };
  // la propensione del canale c cambia al tempo M.t: l'orologio interno corre fin lì con quella vecchia, poi la nuova
  const aggiorna = (c) => { Tint[c] += albero[L + c] * (M.t - tUlt[c]); tUlt[c] = M.t; metti(c, prop(c)); prossimo(c); ritocca(c); };
  let freschi = true; // (orologi da ripartire: all'inizio e dopo un flusso nuovo)
  const rifai = () => {
    if (freschi) { for (let c = 0; c < C; c++) { Tint[c] = 0; tUlt[c] = M.t; Pint[c] = esp(c); } freschi = false; }
    else for (let c = 0; c < C; c++) { if (M.t >= tUlt[c]) Tint[c] += albero[L + c] * (M.t - tUlt[c]); else { Tint[c] = 0; Pint[c] = esp(c); } tUlt[c] = M.t; }
    for (let c = 0; c < C; c++) albero[L + c] = prop(c); for (let c = C; c < L; c++) albero[L + c] = 0; for (let i = L - 1; i >= 1; i--) albero[i] = albero[2 * i] + albero[2 * i + 1];
    for (let c = 0; c < C; c++) { prossimo(c); mucchio[c] = c; posto[c] = c; } for (let i = (C >> 1) - 1; i >= 0; i--) scendi(i); };
  const fonte = caso || sorgente(`${S.luogo.indirizzo || 'luogo'}/chimica`);
  const M = { S, ins, canali, interne, nReaz, C, N, F, Om, V, risoluzione, tenute, fissi: fisso, t: 0, eventi: 0, pesi: () => pesi, aw: () => awOra, nomi, fonte };
  // un flusso nuovo per ogni canale (il suo nome sotto la sorgente); gli orologi ripartono alla prossima imposta
  M.sorgente = (c) => { M.fonte = c; for (let k = 0; k < C; k++) { flusso[k] = c.serie(nomi[k]); scatti[k] = 0; } freschi = true; };
  M.sorgente(fonte);
  M.imposta = (Nuovo, t = 0) => { N.set(Nuovo); M.t = t; rifai(); };
  M.prop = prop; M.a0 = () => albero[1];
  // le fasi (bagnato e secco): l'attività dell'acqua cambia a tempi dati; tra un cambio e l'altro le velocità sono costanti
  // e l'attesa esponenziale si ritira dal cambio (senza memoria: è esatto)
  const ciclo = fasi && fasi.length ? fasi : null, durataCiclo = ciclo ? ciclo.reduce((s, f) => s + f.durata, 0) : Infinity;
  const faseA = (t) => { const x0 = t % durataCiclo; let x = x0, fine = t - x0; for (let i = 0; i < ciclo.length; i++) { fine += ciclo[i].durata; if (x < ciclo[i].durata) return { i, fine }; x -= ciclo[i].durata; } return { i: 0, fine: t + ciclo[0].durata }; };
  let fineFase = Infinity; if (ciclo) { const f = faseA(0); costanti(ciclo[f.i].attivitaAcqua ?? aw0); fineFase = f.fine; }
  // corri fino al tempo «fino» o a «massimo» eventi. Gli osservatori: avanza(t) prima che il tempo passi a t; cambia(c)
  // prima che il canale c cambi i numeri (al tempo nuovo); osserva(c, Δs) dopo, con Δs = ln(a_c/a_inverso) l'entropia
  // del mezzo (Seifert 2005; ±Infinity per un passo senza ritorno); ferma(N) → vero per fermarsi
  const cambiaFase = (avanza) => { if (avanza) avanza(fineFase); M.t = fineFase; const f = faseA(M.t + 1e-12 * Math.max(1, M.t)); costanti(ciclo[f.i].attivitaAcqua ?? aw0); fineFase = f.fine; rifai(); };
  M.corri = (fino, { massimo = Infinity, avanza = null, cambia = null, osserva = null, ferma = null } = {}) => {
    let fatti = 0;
    while (M.t < fino && fatti < massimo) {
      const c = mucchio[0], t1 = tau[c]; if (!(t1 < Infinity)) { if (fineFase < fino) { cambiaFase(avanza); continue; } if (avanza) avanza(fino); M.t = fino; break; }
      if (t1 > fineFase && fineFase <= fino) { cambiaFase(avanza); continue; }
      if (t1 > fino) { if (avanza) avanza(fino); M.t = fino; break; }
      if (avanza) avanza(t1); M.t = t1;
      const ap = albero[L + c]; if (cambia) cambia(c);
      // il canale scatta: il suo orologio interno arriva a P_c, e il prossimo scatto interno è un'esponenziale in più del suo flusso
      Tint[c] = Pint[c]; tUlt[c] = M.t; Pint[c] += esp(c);
      for (let k = daI[c]; k < daI[c + 1]; k++) N[daP[k]] -= daM[k]; for (let k = aI[c]; k < aI[c + 1]; k++) N[aP[k]] += aM[k];
      for (let k = daI[c]; k < daI[c + 1]; k++) { const p = daP[k]; for (let z = dipI[p]; z < dipI[p + 1]; z++) aggiorna(dipC[z]); }
      for (let k = aI[c]; k < aI[c + 1]; k++) { const p = aP[k]; for (let z = dipI[p]; z < dipI[p + 1]; z++) aggiorna(dipC[z]); }
      aggiorna(c); // (anche se la sua propensione non è cambiata — un ingresso —: il suo prossimo scatto interno sì)
      M.eventi++; fatti++;
      if (osserva) osserva(c, Math.log(ap) - Math.log(albero[L + (c ^ 1)])); // (il canale inverso è il vicino: andata 2j, ritorno 2j + 1)
      if (ferma && ferma(N)) break;
    }
    return fatti; };
  return M;
}

// i numeri iniziali di una scatola: Poisson di Ω·c per ogni specie (o la media arrotondata), sommati per insieme
export function scatola(S, M, { concentrazioni = null, media = false, caso = null } = {}) {
  const c0 = concentrazioni || { ...(S.luogo.molecole || {}), ...(S.luogo.spettatori || {}) }, n = new Float64Array(S.chiavi.length), fonte = caso || M.fonte.sotto('scatola');
  for (const k in c0) { const i = S.idx.get(k); if (i == null) continue; const mu = c0[k] * M.Om; n[i] = media ? Math.round(mu) : poissonDa(fonte.serie(k), mu); }
  const Np = new Float64Array(M.ins.P); for (let i = 0; i < n.length; i++) Np[M.ins.di[i]] += n[i];
  return { specie: n, insiemi: Np };
}
function poissonDa(s, mu) { if (!(mu > 0)) return 0;
  if (mu < 50) { const u = s(0); let p = Math.exp(-mu), F = p, k = 0; while (u > F && k < 1000) { k++; p *= mu / k; F += p; } return k; }
  const a = s(0), b = s(1), z = Math.sqrt(-2 * logEsatto(a < 1e-300 ? 1e-300 : a)) * Math.cos(2 * Math.PI * b); return Math.max(0, Math.round(mu + Math.sqrt(mu) * z)); }

// ---------- UNA STORIA: la scatola, lasciata andare per «tempo» (o «massimo» eventi), con le medie della seconda parte
// → { t, eventi, N, medie (per insieme, nella parte misurata), errori (scarti delle medie a blocchi), perReazione: [andate, ritorni],
//     attive (reazioni con almeno un evento), entropia: { totale, perSecondo, errore } (in unità di k_B), bordo: { entrate, uscite }, ms }
// (adatta: il tempo guardato si accorcia finché gli eventi attesi al ritmo iniziale stanno nel tetto: si guarda quanto si può)
export function storia(S, { V = 1e-21, tempo = 1, massimo = 2e5, risoluzione = null, misuraDa = 0.5, blocchi = 20, media = false, caso = null, concentrazioni = null, iniziale = null, flussi, fasi, adatta = false } = {}) {
  const t0 = performance.now(), M = motore(S, { V, risoluzione: risoluzione ?? tempo * 1e-4, caso, flussi, fasi }), P = M.ins.P;
  const sc = iniziale ? { insiemi: iniziale } : scatola(S, M, { concentrazioni, media }); M.imposta(sc.insiemi); const N0 = Float64Array.from(M.N);
  if (adatta && M.a0() > 0) tempo = Math.min(tempo, (0.8 * massimo) / M.a0());
  // la misura: dal tempo misuraDa·tempo, in blocchi uguali (le medie a blocchi danno l'errore delle medie nel tempo)
  const tMis = misuraDa * tempo, nb = blocchi, lb = (tempo - tMis) / nb, acc = Array.from({ length: nb }, () => new Float64Array(P)), ultimo = new Float64Array(P).fill(tMis), ep = new Float64Array(nb);
  const perR = new Float64Array(2 * S.reazioni.length), perCanale = new Float64Array(M.C), bordo = { entrate: 0, uscite: 0, senzaRitorno: 0 }; let b = 0, tOra = 0;
  const versa = (p, t) => { const da = ultimo[p] > tMis ? ultimo[p] : tMis; if (t > da) { acc[b][p] += M.N[p] * (t - da); ultimo[p] = t; } };
  // (il tempo passa a t: si chiudono i blocchi finiti, con i numeri di prima)
  const avanza = (t) => { while (b < nb - 1 && t > tMis + (b + 1) * lb) { const fine = tMis + (b + 1) * lb; for (let p = 0; p < P; p++) versa(p, fine); b++; } tOra = t; };
  const cambia = (c) => { const ch = M.canali[c]; for (const [p] of ch.da) versa(p, tOra); for (const [p] of ch.a) versa(p, tOra); };
  const osserva = (c, ds) => { const ch = M.canali[c]; perCanale[c]++;
    if (ch.r != null) perR[2 * ch.r + (ch.verso > 0 ? 0 : 1)]++; else if (ch.verso > 0) bordo.entrate++; else bordo.uscite++;
    if (!isFinite(ds)) { bordo.senzaRitorno++; return; } if (tOra >= tMis) ep[b] += ds; };
  M.corri(tempo, { massimo, avanza, cambia, osserva });
  const tFine = M.t, chiuso = tFine < tempo; // (il tetto degli eventi ha fermato la storia prima del tempo)
  avanza(tFine); for (let p = 0; p < P; p++) versa(p, tFine);
  const durata = Math.max(0, Math.min(tFine, tempo) - tMis), bloccoT = (i) => Math.max(0, Math.min(tMis + (i + 1) * lb, tFine) - (tMis + i * lb));
  const medie = new Float64Array(P), errori = new Float64Array(P), pieni = []; for (let i = 0; i < nb; i++) if (bloccoT(i) > 0.999 * lb) pieni.push(i);
  for (let p = 0; p < P; p++) { let s = 0; for (let i = 0; i < nb; i++) s += acc[i][p]; medie[p] = durata > 0 ? s / durata : M.N[p];
    if (pieni.length >= 4) { const mb = pieni.map((i) => acc[i][p] / lb), m = mb.reduce((x, y) => x + y, 0) / mb.length; errori[p] = Math.sqrt(mb.reduce((x, y) => x + (y - m) ** 2, 0) / (mb.length - 1) / mb.length); } }
  const epB = pieni.map((i) => ep[i] / lb), epM = epB.length ? epB.reduce((x, y) => x + y, 0) / epB.length : 0, epE = epB.length >= 4 ? Math.sqrt(epB.reduce((x, y) => x + (y - epM) ** 2, 0) / (epB.length - 1) / epB.length) : NaN;
  const attive = []; for (let j = 0; j < S.reazioni.length; j++) if (perR[2 * j] + perR[2 * j + 1] > 0) attive.push(j);
  const pesi = M.pesi().w, medieSpecie = new Float64Array(S.chiavi.length); for (let i = 0; i < S.chiavi.length; i++) medieSpecie[i] = medie[M.ins.di[i]] * pesi[i];
  return { motore: M, t: tFine, fermataDalTetto: chiuso, eventi: M.eventi, N0, N: Float64Array.from(M.N), medie, errori, medieSpecie, perReazione: perR, perCanale, attive, bordo,
    entropia: { totale: ep.reduce((x, y) => x + y, 0), perSecondo: epM, errore: epE }, durataMisura: durata, ms: performance.now() - t0 };
}

// le grandezze conservate di uno stato per insiemi (C, N, S, P, H − 2O, carica): numeri interi, la prova le confronta esatte
export function conservate(S, M, N) { const out = Object.fromEntries([...CONSERVATI, 'carica'].map((e) => [e, 0]));
  for (let p = 0; p < M.ins.P; p++) { if (!N[p]) continue; const i = M.ins.membri[p][0]; for (const e of CONSERVATI) out[e] += N[p] * S.contenuto[i][e]; out.carica += N[p] * S.q[i]; }
  return out; }

// ---------- LA DISTRIBUZIONE STAZIONARIA ESATTA di una scatola chiusa (Anderson, Craciun e Kurtz 2010, Bull. Math. Biol. 72,
// 1947): per una rete con il bilancio dettagliato π(n) ∝ Π_p (Ω·C_p)^{n_p}/n_p! sugli stati raggiungibili da N0, con C un
// equilibrio qualsiasi (quello di Gibbs). Gli stati si contano tutti (in ampiezza, fino a «massimo»): è la media vera della
// scatola, senza la differenza d'ordine Ω⁰ tra la media di pochi numeri e l'equilibrio delle concentrazioni.
// → { medie (per insieme), stati, completo }
export function stazionariaEsatta(M, N0, Cinsiemi, { massimo = 2e5 } = {}) {
  const P = M.ins.P, chiave = (n) => n.join(','), visti = new Map(), coda = [Array.from(N0)], lw = Float64Array.from(Cinsiemi, (c) => Math.log(Math.max(c * M.Om, 1e-300)));
  const lnfatt = (n) => { let s = 0; for (let k = 2; k <= n; k++) s += Math.log(k); return s; }, peso = (n) => { let s = 0; for (let p = 0; p < P; p++) if (n[p]) s += n[p] * lw[p] - lnfatt(n[p]); return s; };
  visti.set(chiave(coda[0]), peso(coda[0]));
  for (let q = 0; q < coda.length && visti.size < massimo; q++) { const n = coda[q];
    for (const ch of M.canali) { if (ch.r == null) continue; if (ch.da.some(([p, m]) => n[p] < m)) continue; const x = n.slice(); for (const [p, m] of ch.da) x[p] -= m; for (const [p, m] of ch.a) x[p] += m; const k = chiave(x); if (!visti.has(k)) { visti.set(k, peso(x)); coda.push(x); } } }
  let mx = -Infinity; for (const v of visti.values()) mx = Math.max(mx, v); let Z = 0; const medie = new Float64Array(P), m2 = new Float64Array(P);
  for (const [k, v] of visti) { const w = Math.exp(v - mx); Z += w; const n = k.split(','); for (let p = 0; p < P; p++) if (n[p] !== '0') { medie[p] += w * +n[p]; m2[p] += w * n[p] * n[p]; } }
  const scarti = new Float64Array(P); for (let p = 0; p < P; p++) { medie[p] /= Z; scarti[p] = Math.sqrt(Math.max(0, m2[p] / Z - medie[p] ** 2)); }
  return { medie, scarti, stati: visti.size, completo: visti.size < massimo };
}

// ---------- L'EQUILIBRIO DI GIBBS con le conservazioni delle reazioni che si muovono
// equilibrio(S, c0 (mol/L per specie: Float64Array o oggetto), { reazioni: indici (di suo tutte), attivitaAcqua }) → { c: Float64Array (mol/L), conservazioni (quante), converge }
export function equilibrio(S, c0, { reazioni = null, attivitaAcqua = S.aw } = {}) {
  const n = S.chiavi.length, x0 = c0 instanceof Float64Array ? c0 : Float64Array.from(S.chiavi, (k) => c0[k] || 0), g = S.g(attivitaAcqua), lista = reazioni ?? S.reazioni.map((_, j) => j);
  // le specie toccate: le altre restano dove sono
  const tocca = new Set(); for (const j of lista) { const x = S.reazioni[j]; for (const i of x.re) tocca.add(i); for (const i of x.pr) tocca.add(i); }
  const sp = [...tocca].sort((a, b) => a - b), pos = new Map(sp.map((i, k) => [i, k])), m = sp.length, c = Float64Array.from(x0);
  if (!m) return { c, conservazioni: 0, converge: true };
  // lo spazio nullo sinistro di S (specie × reazioni): l·S = 0 (eliminazione di Gauss sulla trasposta, perno parziale)
  const A = lista.map((j) => { const riga = new Float64Array(m), x = S.reazioni[j]; for (const i of x.re) riga[pos.get(i)] -= 1; for (const i of x.pr) riga[pos.get(i)] += 1; return riga; });
  const perni = []; let rr = 0;
  for (let col = 0; col < m && rr < A.length; col++) { let best = rr, bv = 0; for (let i = rr; i < A.length; i++) if (Math.abs(A[i][col]) > bv) { bv = Math.abs(A[i][col]); best = i; } if (bv < 1e-9) continue;
    [A[rr], A[best]] = [A[best], A[rr]]; const pr = A[rr], d = pr[col]; for (let k = 0; k < m; k++) pr[k] /= d;
    for (let i = 0; i < A.length; i++) if (i !== rr) { const f = A[i][col]; if (f !== 0) { const ri = A[i]; for (let k = col; k < m; k++) ri[k] -= f * pr[k]; } } perni.push(col); rr++; }
  const libere = []; { const ip = new Set(perni); for (let k = 0; k < m; k++) if (!ip.has(k)) libere.push(k); }
  const Lm = libere.map((f) => { const v = new Float64Array(m); v[f] = 1; perni.forEach((col, i) => { v[col] = -A[i][f]; }); return v; }), q = Lm.length;
  const b = Lm.map((v) => { let s = 0; for (let k = 0; k < m; k++) s += v[k] * x0[sp[k]]; return s; });
  const gl = sp.map((i) => g[i]), esp = (lam, k) => { let s = -gl[k]; for (let j = 0; j < q; j++) s += Lm[j][k] * lam[j]; return s; };
  const psi = (lam) => { let v = 0; for (let k = 0; k < m; k++) v += Math.exp(Math.min(esp(lam, k), 300)); for (let j = 0; j < q; j++) v -= b[j] * lam[j]; return v; };
  // partenza: i prezzi che darebbero alle specie presenti le loro concentrazioni (minimi quadrati), regolarizzati
  const sol = (G) => { const nn = G.length; for (let i = 0; i < nn; i++) { let p = i; for (let k = i + 1; k < nn; k++) if (Math.abs(G[k][i]) > Math.abs(G[p][i])) p = k; [G[i], G[p]] = [G[p], G[i]]; const d = G[i][i] || 1e-300; for (let k = i; k <= nn; k++) G[i][k] /= d; for (let r2 = 0; r2 < nn; r2++) if (r2 !== i) { const f = G[r2][i]; if (f) for (let k = i; k <= nn; k++) G[r2][k] -= f * G[i][k]; } } return G.map((r2) => r2[nn]); };
  const N0 = Array.from({ length: q }, () => new Float64Array(q + 1)); for (let k = 0; k < m; k++) { const ck = x0[sp[k]]; const y = gl[k] + Math.log(ck > 0 ? ck : 1e-30); for (let a = 0; a < q; a++) { if (!Lm[a][k]) continue; for (let bb = 0; bb < q; bb++) N0[a][bb] += Lm[a][k] * Lm[bb][k]; N0[a][q] += Lm[a][k] * y; } }
  for (let a = 0; a < q; a++) N0[a][a] += 1e-9; let lam = sol(N0.map((r2) => Array.from(r2))), converge = false, ck = new Float64Array(m);
  for (let it = 0; it < 400; it++) { const G = Array.from({ length: q }, () => new Float64Array(q + 1)); let v0 = 0;
    for (let k = 0; k < m; k++) { ck[k] = Math.exp(Math.min(esp(lam, k), 300)); v0 += ck[k]; for (let a = 0; a < q; a++) { const la = Lm[a][k]; if (!la) continue; G[a][q] -= la * ck[k]; for (let bb = 0; bb < q; bb++) G[a][bb] += la * Lm[bb][k] * ck[k]; } }
    let scarto = 0, scala = 0; for (let a = 0; a < q; a++) { G[a][q] += b[a]; v0 -= b[a] * lam[a]; scala = Math.max(scala, G[a][a]); }
    for (let a = 0; a < q; a++) { let tot = 0; for (let k = 0; k < m; k++) tot += Math.abs(Lm[a][k]) * ck[k]; scarto = Math.max(scarto, Math.abs(G[a][q]) / (Math.abs(b[a]) + tot + 1e-300)); G[a][a] += 1e-13 * scala + 1e-300; }
    if (scarto < 1e-11) { converge = true; break; }
    const res = G.map((r2) => r2[q]), d = sol(G.map((r2) => Array.from(r2))); let t = 1, mx = 0; for (let k = 0; k < m; k++) { let de = 0; for (let j = 0; j < q; j++) de += Lm[j][k] * d[j]; mx = Math.max(mx, de); } if (mx > 2) t = 2 / mx;
    let pend = 0; for (let a = 0; a < q; a++) pend -= res[a] * d[a];
    for (let z = 0; z < 50; z++, t /= 2) { const l2 = lam.map((x, j) => x + t * d[j]); if (psi(l2) <= v0 + 1e-4 * t * pend || z === 49) { lam = l2; break; } } }
  for (let k = 0; k < m; k++) c[sp[k]] = Math.exp(Math.min(esp(lam, k), 300));
  return { c, conservazioni: q, converge };
}

// ---------- IL TEMPO GUARDATO: quali reazioni si muovono in τ (κ·τ ≥ 1 all'equilibrio vincolato di quelle che si muovono)
// In una scatola di Ω molecole per mol/L nessuna specie ha meno di una molecola quando c'è: le concentrazioni sotto 1/Ω
// contano come 1/Ω (senza, una specie a 10⁻²⁰⁰ mol/L farebbe «veloce» una reazione che non accade mai).
// → { attive: [indici], ferme, c (equilibrio vincolato), kappa: Float64Array, separazione: min κ attive / max κ ferme }
export function attiveNelTempo(S, c0, tau, { giri = 8, Om = Infinity } = {}) {
  const cMin = 1 / Om;
  const x0 = c0 instanceof Float64Array ? c0 : Float64Array.from(S.chiavi, (k) => c0[k] || 0), aw = S.aw;
  let attive = S.reazioni.map((_, j) => j), eq = null, kappa = new Float64Array(S.reazioni.length);
  for (let it = 0; it < giri; it++) { eq = equilibrio(S, x0, { reazioni: attive }).c;
    S.reazioni.forEach((x, j) => { let v = x.kp1 * aw ** x.wR, den = 0; for (const i of x.re) v *= eq[i]; const nu = new Map(); for (const i of x.re) nu.set(i, (nu.get(i) || 0) + 1); for (const i of x.pr) nu.set(i, (nu.get(i) || 0) + 1); for (const [i, k] of nu) den += (k * k) / Math.max(eq[i], cMin, 1e-300); kappa[j] = v * den; });
    const nuove = S.reazioni.map((_, j) => j).filter((j) => kappa[j] * tau >= 1); if (nuove.length === attive.length && nuove.every((j, k) => j === attive[k])) break; attive = nuove; }
  const ferme = S.reazioni.map((_, j) => j).filter((j) => !attive.includes(j));
  const minA = Math.min(...attive.map((j) => kappa[j])), maxF = ferme.length ? Math.max(...ferme.map((j) => kappa[j])) : 0;
  return { attive, ferme, c: equilibrio(S, x0, { reazioni: attive }).c, kappa, separazione: maxF > 0 ? minA / maxF : Infinity, kMin: minA, kMaxFerme: maxF };
}
// il sottosistema delle sole reazioni date (le altre, ferme nel tempo guardato, non ci sono)
export function soltanto(S, indici) { return { ...S, reazioni: indici.map((j) => S.reazioni[j]), indiciOriginali: indici }; }

// ---------- LA RILEVAZIONE: che cosa è emerso
// RAF: il massimo insieme di reazioni (dirette) che si reggono dal cibo e sono ognuna catalizzata da qualcosa nella chiusura
// (Hordijk e Steel 2004). reazioni: [{ re: [chiavi], pr: [chiavi], cat: [chiavi] }], cibo: [chiavi] → { reazioni (indici), chiusura }
export function maxRAF(reazioni, cibo) {
  const F = new Set(cibo); let Rr = reazioni.map((_, j) => j), chiusura = new Set(F);
  for (let cambia = true; cambia;) { chiusura = new Set(F);
    for (let cresce = true; cresce;) { cresce = false; for (const j of Rr) { const x = reazioni[j]; if (x.re.every((k) => chiusura.has(k))) for (const k of x.pr) if (!chiusura.has(k)) { chiusura.add(k); cresce = true; } } }
    const prima = Rr.length; Rr = Rr.filter((j) => reazioni[j].re.every((k) => chiusura.has(k)) && reazioni[j].cat.some((k) => chiusura.has(k))); cambia = Rr.length !== prima; }
  return { reazioni: Rr, chiusura: [...chiusura] };
}
// rileva(S, st (una storia, facoltativa), { cicli, membrane, copie, tempoCicli (ms), cicliMassimi }) → { raf, rafProprio, cicli, membrane, copiatori, presenti, riga, ms }
export function rileva(S, st = null, { cicli = true, membrane = true, copie = true, lunghezza = 7, tempoCicli = 4000, cicliMassimi = 40 } = {}) {
  const t0 = performance.now(), Om = st?.motore.Om ?? 1, pH = S.condizioni.pH, T = S.condizioni.T;
  // chi c'è: in media almeno una molecola nella finestra (o nella partenza del luogo)
  const conc = new Map(); S.chiavi.forEach((k, i) => { const c = st ? st.medieSpecie[i] / Om : (S.luogo.molecole?.[k] || 0); if (c > 0) conc.set(k, c); });
  const presenti = new Set(st ? S.chiavi.filter((k, i) => st.medieSpecie[i] >= 1) : [...conc.keys()]);
  const cibo = S.cibo, metalli = Object.keys(S.condizioni.ioni || {}).length > 0 || (S.condizioni.minerali || []).length > 0;
  // le reazioni dirette della rete (andata e ritorno), con i loro catalizzatori dalle regole
  const acidoBase = []; for (const k of presenti) { if (S.idx.get(k) >= S.nRete) continue; try { if (sitiAcidoBase(k).siti.some((s) => Math.abs(s.pKa - pH) <= BRONSTED_PKA)) acidoBase.push(k); } catch { /* niente siti */ } }
  const dirette = [], chiave = (i) => S.chiavi[i];
  S.reazioni.forEach((x) => { const cat = FAMIGLIE_ACIDO_BASE.has(x.tipo) ? [...acidoBase, ...(metalli ? ['ioni e minerali del luogo'] : [])] : [];
    dirette.push({ re: x.re.map(chiave), pr: x.pr.map(chiave), cat, tipo: x.tipo }, { re: x.pr.map(chiave), pr: x.re.map(chiave), cat, tipo: `inversa di ${x.tipo}` }); });
  // i cicli autocatalitici stechiometrici (Blokhuis): la reazione netta del ciclo, catalizzata dai suoi membri
  let trovati = []; if (cicli && S.rete) { try { trovati = autocatalitici(S.rete, { cibo: [...cibo, 'O'], lunghezza, tempoMassimo: tempoCicli, massimo: cicliMassimi }); } catch { trovati = []; } }
  for (const ci of trovati) { const consumo = {}; for (const p of ci.reazioni) { for (const k of p.reagenti) if (!ci.membri.includes(k) && k !== 'O') consumo[k] = (consumo[k] || 0) + 1; for (const k of p.prodotti) if (!ci.membri.includes(k) && k !== 'O') consumo[k] = (consumo[k] || 0) - 1; }
    const re = [], pr = []; for (const k in consumo) { for (let z = 0; z < consumo[k]; z++) re.push(k); for (let z = 0; z < -consumo[k]; z++) pr.push(k); } for (const k in ci.guadagno) for (let z = 0; z < ci.guadagno[k]; z++) pr.push(k);
    dirette.push({ re, pr, cat: [...ci.membri], tipo: 'ciclo autocatalitico (netta)', ciclo: ci }); }
  const ciboR = [...cibo, ...(metalli ? ['ioni e minerali del luogo'] : [])], raf = maxRAF(dirette, ciboR);
  // il RAF «proprio»: la catalisi solo da molecole che il cibo non è (ciò che la rete fa da sé)
  const proprie = dirette.map((x) => ({ ...x, cat: x.cat.filter((k) => !ciboR.includes(k)) })), rafProprio = maxRAF(proprie, ciboR);
  // le membrane: anfifiliche sopra la concentrazione micellare critica (le più abbondanti con una coda di almeno 4 carboni)
  const mem = []; if (membrane) for (const [k, c] of [...conc.entries()].filter(([k]) => S.idx.get(k) < S.nRete && (conta(k).C || 0) >= 4).sort((a, b) => b[1] - a[1]).slice(0, 12)) { try { const a = aggregazione(k, { T, pH }); if (a.cmc) mem.push({ chiave: k, c, cmc: a.cmc, sopra: c >= a.cmc, forma: a.forma }); } catch { /* */ } }
  // i polimeri che si copiano: un prodotto di condensazione (due pezzi → uno, più acqua) che come stampo accelera la sua nascita
  const copiatori = []; if (copie && st) { const cand = S.reazioni.map((x, j) => ({ x, j })).filter(({ x }) => x.re.length === 2 && x.pr.length === 1 && x.wP >= 1 && st.medieSpecie[x.pr[0]] >= 1).sort((a, b) => st.medieSpecie[b.x.pr[0]] - st.medieSpecie[a.x.pr[0]]).slice(0, 3);
    for (const { x } of cand) { try { const cd = catalisiDa(chiave(x.pr[0]), { reagenti: x.re.map(chiave), prodotti: x.pr.map(chiave) }, { T }), f = cd.fattorePerMole * (st.medieSpecie[x.pr[0]] / Om); copiatori.push({ stampo: chiave(x.pr[0]), da: x.re.map(chiave), accelerazione: f, siCopia: f >= 1 }); } catch { /* */ } } }
  const out = { raf: { reazioni: raf.reazioni.length, specie: raf.chiusura.length, dettaglio: raf }, rafProprio: { reazioni: rafProprio.reazioni.length, cicli: rafProprio.reazioni.filter((j) => proprie[j].ciclo).length, dettaglio: rafProprio, dirette: proprie },
    cicli: trovati, membrane: mem, copiatori, presenti: [...presenti], ms: performance.now() - t0 };
  out.emerso = { raf: rafProprio.reazioni.length > 0, membrane: mem.some((m) => m.sopra), copie: copiatori.some((c) => c.siCopia), cicli: trovati.length > 0 };
  return out;
}

// ---------- GLI EVENTI RARI: forward flux sampling (Allen, Warren e ten Wolde 2005)
// ffs(S, { V, ordine: (N) → λ, A (λ ≤ A: il bacino), interfacce: [λ0 < λ1 < … < λB], prove: per interfaccia, tempoA: quanto
//   si sta nel bacino per contare il flusso, iniziale }) → { flusso (1/s), P: [P(λ_{i+1} | λ_i)], k (1/s: flusso × Π P), errore (relativo), eventi }
// Ogni prova è una storia con il suo indirizzo («…/ffs/interfaccia i/prova k»): la stima è funzione dell'indirizzo.
export function ffs(S, { V = 1e-21, ordine, A, interfacce, prove = 200, tempoA = 1e3, massimoA = 2e6, iniziale, risoluzione = 1e-6, flussi, caso = null } = {}) {
  const radice = caso || sorgente(`${S.luogo.indirizzo || 'luogo'}/chimica/ffs`), M = motore(S, { V, risoluzione, flussi, caso: radice.sotto('bacino') });
  // (inA: l'ultimo bacino visitato è A — il tempo conta; esce: da quando è tornato in A non ha ancora passato λ0)
  M.imposta(iniziale); let inA = ordine(M.N) <= A, esce = inA, uscite = 0, tempoInA = 0, tPrima = 0; const presi = [];
  // FASE 1: si corre nel bacino; la prima volta che si passa λ0 dopo essere stati in A si conta e si tiene lo stato
  M.corri(tempoA, { massimo: massimoA, avanza: (t) => { if (inA) tempoInA += t - tPrima; tPrima = t; }, osserva: () => { const l = ordine(M.N);
    if (l <= A) { inA = true; esce = true; } else if (esce && l >= interfacce[0]) { uscite++; presi.push(Float64Array.from(M.N)); esce = false; }
    if (l >= interfacce[interfacce.length - 1]) { inA = false; esce = false; } } });
  const flusso = tempoInA > 0 ? uscite / tempoInA : 0, P = [], err2 = [uscite > 0 ? 1 / uscite : Infinity]; let stati = presi, eventi = M.eventi;
  // FASE 2: da ogni interfaccia, prove fino alla successiva (successo) o di nuovo in A (fallimento)
  for (let i = 0; i + 1 < interfacce.length && stati.length; i++) { const arrivati = []; let ok = 0;
    const M2 = motore(S, { V, risoluzione, flussi, caso: radice.sotto(`interfaccia ${i}`) });
    for (let k = 0; k < prove; k++) { const s0 = stati[k % stati.length]; M2.sorgente(radice.sotto(`interfaccia ${i}`).sotto(`prova ${k}`)); M2.imposta(s0); const e0 = M2.eventi;
      let esito = 0; M2.corri(Infinity, { massimo: 1e6, ferma: (N) => { const l = ordine(N); if (l >= interfacce[i + 1]) { esito = 1; return true; } if (l <= A) { esito = -1; return true; } return false; } }); eventi += M2.eventi - e0;
      if (esito > 0) { ok++; arrivati.push(Float64Array.from(M2.N)); } }
    const p = ok / prove; P.push(p); err2.push(p > 0 ? (1 - p) / (p * prove) : Infinity); stati = arrivati; }
  const k = flusso * P.reduce((a, b) => a * b, 1);
  return { flusso, uscite, tempoInA, P, k, errore: Math.sqrt(err2.reduce((a, b) => a + b, 0)), eventi };
}

// ---------- IL LUOGO dal mare: il padre della finestra (lo stesso di finestra.js scenaNano)
// luogoDelMare(stato del mare, { lon, lat, latoM, fondoM, pianeta, tipo: 'mare' | 'pozza' | 'camino' }) → luogo
export function luogoDelMare(stato, { lon = 0, lat = 0, latoM = 1e-6, fondoM = null, pianeta = null, tipo = 'mare', profondita = 0 } = {}) {
  const camp = campioneAcqua(stato, { lon, lat, profondita, latoM, acqua: true, fondoM, massimo: 0 });
  if (camp.asciutto) return null;
  let T = camp.T, pH = camp.pH, fattore = 1, minerali = [], indirizzo = `${stato?.radice || 'mare'}/chimica/${lon.toFixed(5)}/${lat.toFixed(5)}/${latoM.toExponential(2)}`;
  const pre = stato?.prebiotica || {};
  // (la pozza che evapora: i sali nel rapporto della sua salinità con quella del mare; le molecole volatili — CO2, HCN,
  // formaldeide — restano in equilibrio con l'aria e non si concentrano: manca la storia lunga dei loro prodotti non volatili)
  if (tipo === 'pozza' && pre.pozzeCheEvaporano?.length) { const p = pre.pozzeCheEvaporano[0]; fattore = Math.max(1, (p.salinita || 0) / Math.max(1e-9, camp.salinita || 0)); T = p.T ?? T; pH = p.pH ?? pH; indirizzo = `${stato?.radice || 'mare'}/chimica/pozza ${p.id}/${latoM.toExponential(2)}`; }
  if (tipo === 'camino' && pre.camini?.length) { const v = pre.camini[0]; T = T + (v.saltoDiTemperatura || 0); pH = pH - (v.saltoDiPH || 0); minerali = v.minerali || []; indirizzo = `${stato?.radice || 'mare'}/chimica/camino ${v.id}/${latoM.toExponential(2)}`; }
  const molL = (perM3, f = 1) => (perM3 / NA / 1000) * f, molecole = {}, spettatori = {}, ioni = {}, aggiungi = (o, k, v) => { if (v > 0) o[k] = (o[k] || 0) + v; };
  // le classi del campione (le stesse che scenaNano mette nel cubetto): ioni liberi, coppie, gas sciolti. Il carbonio
  // inorganico (CO2 sciolto, bicarbonato, carbonato) è l'acido carbonico nei suoi stati di protonazione: la rete li tiene insieme
  const GAS = { H2: '[HH]', N2: 'N#N', O2: 'O=O', CO: '[C-]#[O+]', CO2: 'O=C=O', CH4: 'C', NH3: 'N', HCN: 'C#N', H2S: 'S' };
  const ione = (f, m) => { if (f === 'HCO3-' || f === 'CO3(2-)') aggiungi(molecole, 'OC(=O)O', m); else if (f !== 'H+' && f !== 'OH-') { aggiungi(spettatori, f, m); const io = /^([A-Z][a-z]?)(\d*)\+$/.exec(f); if (io) ioni[`${io[1]}+${io[2] || 1}`] = (ioni[`${io[1]}+${io[2] || 1}`] || 0) + m; } };
  for (const cl of camp.classi || []) { const m = molL(cl.perM3 || 0); if (!(m > 0)) continue;
    if (cl.tipo === 'ione') ione(cl.materiale, cl.materiale === 'HCO3-' || cl.materiale === 'CO3(2-)' ? m : m * fattore); else if (cl.tipo === 'coppia') for (const f of cl.materiale.split(' ')) ione(f, f === 'HCO3-' || f === 'CO3(2-)' ? m : m * fattore); else if (cl.tipo === 'molecola' && GAS[cl.materiale]) aggiungi(molecole, GAS[cl.materiale], m); }
  const pb = pianeta?.prebiotica; if (pb) { aggiungi(molecole, 'C#N', SCALA_PREBIOTICA * (pb.HCN || 0)); aggiungi(molecole, 'C=O', SCALA_PREBIOTICA * (pb.formaldeide || 0)); }
  // l'attività dell'acqua (Raoult, soluzione ideale): 1 − 0,018·Σ moli di soluto per kg
  let soluti = 0; for (const v of Object.values({ ...molecole, ...spettatori })) soluti += v; const attivitaAcqua = Math.max(0.3, 1 - 0.018 * soluti);
  const luce = pianeta?.Tstella && pianeta?.aM && pianeta?.Rstella ? { Tstella: pianeta.Tstella, diluizione: (pianeta.Rstella / pianeta.aM) ** 2 } : null;
  // il bordo: la finestra scambia con l'acqua attorno per diffusione (il tempo per attraversarla: L²/6D)
  const ricambio = (6 * DIFFUSIONE) / (latoM * latoM), tenute = { ...molecole, ...spettatori };
  const cicli = tipo === 'pozza' && pre.pozzeDiMarea?.ogniSecondi ? [{ durata: pre.pozzeDiMarea.ogniSecondi / 2, attivitaAcqua }, { durata: pre.pozzeDiMarea.ogniSecondi / 2, attivitaAcqua: Math.max(0.3, attivitaAcqua * 0.75) }] : null;
  return { indirizzo, T, pH, attivitaAcqua, molecole, spettatori, ioni, minerali, luce, cibo: Object.keys(molecole), flussi: { tenute, ricambio, uscita: true }, fasi: cicli, tipo, latoM, V: latoM ** 3, padre: { campione: camp, fattore },
    manca: ['la fotolisi (la rete dei radicali non è aperta qui)', ...(luce ? [] : ['la luce: la stella non è nota al luogo'])] };
}

// ---------- IL LUOGO NEI PORI DELLA CROSTA: l'acqua nelle crepe dei primi chilometri (dove sulla Terra vive la maggior
// parte dei microbi). Lo stesso luogo, la stessa regola; cambiano il padre e i flussi.
//   POROSITÀ    la legge di Athy (1930), φ = φ₀·e^(−z/L), con φ₀ e L DALLA ROCCIA DI QUEL PIANETA (suolo.js rocciaDelPianeta:
//               φ₀ la contrazione termica dei suoi minerali dal fuso alla superficie, L la chiusura delle sue crepe sotto il peso
//               della colonna con la gravità del pianeta; prima erano dati per tipo, 0,10 e 1 km per il basalto, 0,02 e 2 km per
//               il granito [R], ora stampati accanto come confronto). Il tipo è quello della crosta del pianeta (elementi.js
//               crostaDelPianeta: basalto, e granito se ci sono i continenti). La colonna è suolo.js colonnaDelPianeta, o
//               quella che chi chiama passa («colonna»: la colonna del punto, padreSuolo(...).colonna).
//   TEMPERATURA il gradiente geotermico del pianeta: T(z) = T_superficie + (q/k)·z, con q il flusso di calore dell'interno di
//               oggi (geologia.js interno, dalla storia termica) e k la conducibilità della roccia in alto di storia.js
//               (STORIA.kSu). Senza il calore prodotto dentro la crosta (dichiarato: a 1-3 km sposta di pochi kelvin).
//   FLUSSI      (1) l'H₂ della SERPENTINIZZAZIONE: 3 FeO + H₂O → Fe₃O₄ + H₂ sul ferro(II) della roccia (la composizione della
//               crosta del pianeta), con la velocità dell'olivina di Malvoisin, Brunet, Carlut e altri 2012 [R]: k(300 °C) ≈
//               3·10⁻⁸ 1/s per grani di 50 µm, Ea ≈ 80 kJ/mol [R], e un terzo del ferro che passa a magnetite (McCollom e Bach
//               2009 [R]); (2) la RADIOLISI dell'acqua: U, Th e K della crosta del pianeta, calore specifico 9,81·10⁻⁵,
//               2,64·10⁻⁵, 3,48·10⁻⁹ W/kg (Turcotte e Schubert 2002, tab. 4.2 [R]; all'età del pianeta con i tempi di
//               dimezzamento), l'energia che va all'acqua in proporzione alla sua massa nella roccia bagnata (la
//               semplificazione di Lin e altri 2005 [R]), G(H₂) = 0,45 molecole per 100 eV (alfa: Spinks e Woods 1990 [R]);
//               (3) il CO₂ DISCIOLTO: il carbonio inorganico del mare sopra (mare.js), o l'aria del pianeta con la costante
//               di Henry (0,034 mol/L/bar a 25 °C, ΔH/R = 2400 K [R]). L'H₂ a regime è produzione × tempo di residenza
//               dell'acqua nei pori a quella profondità: la colonna di suolo.js (Darcy con la ricarica, la partizione di Dupuit
//               tra gli strati, τ(z) = ∫φ/q dz, al più l'età della crosta). Prima era un parametro libero, 10⁴ anni.
//   Il limite di temperatura della vita conosciuta (122 °C: Takai e altri 2008) NON entra in niente: la riga lo stampa
//   accanto, come confronto.
export const RADIOGENICO = Object.freeze({ U: [9.81e-5, 4.468], Th: [2.64e-5, 14.05], K: [3.48e-9, 1.248] }), G_H2 = 0.45;
export const SERPENTINO = Object.freeze({ k300: 3e-8, Ea: 80, parte: 1 / 3 });
export function luogoDellaCrosta(pianeta, { profonditaM = 1000, latoM = 1e-6, roccia = null, stella = null, mare = null, kRoccia = STORIA.kSu, eta = null, colonna = null } = {}) {
  const P = pianeta, q = P?.interno?.q, crosta = P ? crostaDelPianeta(P, { stella }) : null; if (!(q > 0) || !crosta) return null;
  const tipo = roccia || (crosta.Mbasalto > 0 ? 'basalto' : 'granito'), ogg = comeOggetto(crosta[tipo]), frazioni = {}; let tot = 0; for (const s in ogg) if (Number.isFinite(ogg[s]) && ogg[s] > 0) tot += ogg[s];
  const z = profonditaM, col = colonna || colonnaDelPianeta(P, { tipo, kRoccia, eta: eta ?? P.interno?.eta }), phi = col.porosita(z), residenza = Math.max(1, col.residenza(z) * ANNO), Ts = P.clima?.T ?? 288, T = Ts + (q / kRoccia) * z, rhoR = 2900, rhoW = 1000;
  for (const s of ['Fe', 'U', 'Th', 'K', 'Mg', 'Si']) { const v = ogg[s]; frazioni[s] = Number.isFinite(v) && tot > 0 ? v / tot : null; }
  const anni = eta ?? P.interno?.eta ?? 4.5e9, ora = (s) => RADIOGENICO[s][0] * Math.pow(2, (4.5e9 - anni) / 1e9 / RADIOGENICO[s][1]); // (U e Th all'età del pianeta: più giovane, più caldo)
  let A = 0; const mancano = []; for (const s of ['U', 'Th', 'K']) { if (frazioni[s] == null) { mancano.push(s); continue; } A += frazioni[s] * ora(s); } // W per kg di roccia
  const wAcqua = (phi * rhoW) / (phi * rhoW + (1 - phi) * rhoR), Lpori = phi * 1000; // (litri d'acqua per m³ di roccia)
  const radiolisi = ((A * rhoR * (1 - phi) * wAcqua) / (100 * COSTANTI.e)) * G_H2 / NA / Lpori; // mol di H2 per litro d'acqua al secondo
  const kSerp = SERPENTINO.k300 * Math.exp((-SERPENTINO.Ea / R) * (1 / T - 1 / 573.15)), FeMol = (frazioni.Fe ?? 0) / (PESI_ATOMICI.Fe / 1000); // mol di ferro per kg di roccia
  const serpentinizzazione = ((kSerp * FeMol * SERPENTINO.parte * rhoR * (1 - phi)) / 3) / Lpori; // mol H2 / L / s
  const H2 = (radiolisi + serpentinizzazione) * residenza;
  // il carbonio inorganico: dal mare sopra, o dall'aria con Henry
  const pCO2 = (P.atmosfera?.gas?.CO2 ?? 0) * ((P.clima?.pressione ?? 1e5) / 1e5), henry = 0.034 * Math.exp(2400 * (1 / T - 1 / 298.15));
  const CO2 = mare?.carbonio > 0 ? mare.carbonio : henry * pCO2, pH = mare?.pH ?? 7;
  const molecole = {}; if (H2 > 0) molecole['[HH]'] = H2; if (CO2 > 0) molecole['OC(=O)O'] = CO2;
  const minerali = ['magnetite', ...(tipo === 'basalto' ? ['olivina', 'pirosseno', 'plagioclasio'] : ['feldspato potassico', 'quarzo'])];
  return { indirizzo: `${P.id ?? 'pianeta'}/crosta/${tipo}/${z.toFixed(0)} m/${latoM.toExponential(2)}`, tipo: 'pori della crosta', T, pH, attivitaAcqua: 1, molecole, spettatori: {}, ioni: {}, minerali, cibo: Object.keys(molecole),
    flussi: { tenute: { ...molecole }, ricambio: 1 / residenza }, latoM, V: latoM ** 3,
    padre: { profonditaM: z, porosita: phi, phi0: col.roccia.phi0, L: col.roccia.L, confrontoAthy: col.roccia.confronto, residenzaAnni: residenza / ANNO, ricarica: col.ricarica, ricaricaDa: col.ricaricaDa, roccia: tipo, gradienteKkm: (q / kRoccia) * 1000, q, radiolisi, serpentinizzazione, H2, CO2, pCO2, frazioni, mancano, profondita122: ((395.15 - Ts) * kRoccia) / q },
    manca: [...mancano.map((s) => `${s} della crosta non è un numero in elementi.js: la radiolisi non lo conta`), 'la pressione dei pori nelle energie', 'il calore prodotto dentro la crosta nel gradiente'] };
}

// ---------- LA RIGA DELLA FINESTRA (per l'app): che chimica si muove qui, calcolata solo quando si guarda
// chimicaDellaFinestra(stato, { lon, lat, latoM, fondoM, pianeta, tempo, massimo }) → { riga, ms, sistema, storia, rilevati }
export function chimicaDellaFinestra(stato, { lon = 0, lat = 0, latoM = 1e-6, fondoM = null, pianeta = null, tempo = 1, massimo = 2e4, profondita = 2, tipo = 'mare' } = {}) {
  const t0 = performance.now(), L = luogoDelMare(stato, { lon, lat, latoM, fondoM, pianeta, tipo }); if (!L) return { riga: 'qui non c\'è acqua: nessuna chimica in soluzione', ms: performance.now() - t0 };
  const S = sistema(L, { profondita, atomiMassimi: 6, tempoMassimo: 1500 }), ris = Math.max(tempo * 1e-4, 1 / L.flussi.ricambio);
  const st = storia(S, { V: L.V, tempo, massimo, flussi: L.flussi, fasi: L.fasi, risoluzione: ris, adatta: true }), ril = rileva(S, st, { cicli: true, membrane: true, copie: false, tempoCicli: 300 }), M = st.motore;
  // (nel bagno: le molecole del padre, in media; nate qui: quelle che la scatola conta)
  let nBagno = 0; for (const [, f] of M.fissi) nBagno += f.cb * M.Om; let nQui = 0; for (let p = 0; p < M.ins.P; p++) if (!M.fissi.has(p)) nQui += st.medie[p];
  const org = S.chiavi.filter((k, i) => i < S.nRete && (conta(k).C || 0) > 0 && !(k in L.molecole) && st.medieSpecie[i] >= 0.01).length, perSecondo = st.t > 0 ? st.eventi / st.t : 0;
  const riga = `chimica di questa finestra (${latoM >= 1e-6 ? `${(latoM * 1e6).toPrecision(2)} µm` : `${(latoM * 1e9).toPrecision(2)} nm`}): ${S.chiavi.length} specie possibili dalle regole, ${S.reazioni.length} reazioni; ` +
    `${nBagno.toPrecision(2)} molecole del mare nel bagno (si rinnova in ${fmtT(1 / L.flussi.ricambio)}); ${perSecondo.toPrecision(2)} reazioni al secondo, ${st.attive.length} diverse attive in ${fmtT(st.t)}, ${nQui.toPrecision(2)} molecole nate qui (${org} organiche nuove); ` +
    `${ril.emerso.raf ? `un RAF (${ril.rafProprio.reazioni} reazioni catalizzate da ciò che la rete fa)` : 'nessun RAF'}${ril.cicli.length ? `, ${ril.cicli.length} cicli autocatalitici possibili` : ''}${ril.emerso.membrane ? ', anfifiliche sopra la CMC' : ''}`;
  return { riga, ms: performance.now() - t0, sistema: S, storia: st, rilevati: ril, luogo: L };
}
const fmtT = (s) => (s >= ANNO ? `${(s / ANNO).toPrecision(2)} anni` : s >= GIORNO ? `${(s / GIORNO).toPrecision(2)} giorni` : s >= 1 ? `${s.toPrecision(2)} s` : s >= 1e-3 ? `${(s * 1e3).toPrecision(2)} ms` : s >= 1e-6 ? `${(s * 1e6).toPrecision(2)} µs` : `${(s * 1e9).toPrecision(2)} ns`);
