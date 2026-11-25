// misura.js — i pesi degli esiti degli eventi (C4), il peso di un mondo con i suoi rami, e una prima stima dei cervelli di
// Boltzmann (C13). La specifica è in LINGUA.md; lingua.js lo usa per il peso dei rami e per la distanza tra rami.
//
// UN EVENTO È UN TIRO u ∈ [0, 1) (o più tiri: la campana ne usa due) CONSUMATO DA UNA LEGGE. Il peso di un esito è la
// probabilità che la legge gli dà: per un esito discreto la sua massa; per un esito continuo la massa della CELLA che lo
// contiene, alla grana dichiarata: F(fine della cella) − F(inizio), con F la funzione di ripartizione della legge (cioè
// densità × ampiezza, ma senza l'errore del rettangolo). Le celle di un evento ne coprono tutti gli esiti senza
// sovrapporsi, quindi i pesi di tutti gli esiti di un evento sommano a 1 (C4: normalizzazione locale). Con nuclei
// normalizzati, ognuno condizionato a ciò che è venuto prima (la legge e i suoi parametri possono dipendere dagli esiti
// precedenti), il prodotto lungo un cammino è UN'UNICA misura sui cammini: il teorema di Ionescu-Tulcea.
//
// IL PESO DI UN MONDO CON I SUOI RAMI = Π_e p_e(o_e) sul cammino di quel mondo, DIVISO lo stesso prodotto sul mondo di
// partenza (senza rami): il rapporto di verosimiglianza, in unità del mondo di partenza. Gli eventi letti nei due mondi
// con la stessa legge, gli stessi parametri e lo stesso esito alla grana si semplificano; contano quelli cambiati, quelli
// che il ramo ha fatto nascere (pesano nel mondo) e quelli che ha tolto (pesavano nella partenza).
// Nota: un ramo n di eventi.js NON è «l'esito n-esimo» in un ordine: è un altro tiro u_n, indipendente, della stessa
// legge. Rami diversi possono dare lo stesso esito (alla grana): sono lo stesso cilindro e pesano uguale.
//
//   LEGGI                    le leggi dei tiri: uniforme, tra, intero, bernoulli, discreta, normale, seme
//   massa(voce, opz)         il peso dell'esito di una voce { legge, parametri, tiri | esito }
//   celle(legge, parametri)  tutte le celle di una legge (per la prova della normalizzazione)
//   conMisura(c, leggi)      una sorgente che annota in «leggi» (una Map) QUALE legge ha consumato ogni tiro, con quali
//                            parametri e con quale esito: come conRegistro di eventi.js, che oggi annota solo i tiri
//   storia(leggi)            −log₂ Π p del cammino annotato, in bit
//   rapporto(mondo, base)    il peso di un mondo rispetto a quello di partenza (le due Map), con gli eventi che contano
//   pesoDegliEventi(rami, leggiDegliEventi)   lo stesso, solo per gli eventi dei rami (senza ciò che ne discende)
//   cervelliDiBoltzmann(contenuto)            C13: storia evolutiva contro storia per fluttuazione, in bit
//
// PARAMETRI LIBERI (regola 2):
//   grana   l'ampiezza delle celle di un esito continuo, 2^−grana nella variabile NATURALE della legge: u per «uniforme»,
//           la frazione dell'intervallo per «tra», lo scarto per «normale» (predefinito 20: ~10⁻⁶). Con un'altra variabile
//           (un'altra parametrizzazione dello stesso esito) i pesi dei continui cambiano: è il fatto noto che una densità
//           non è invariante; il rapporto tra due esiti della stessa legge alla stessa grana tende al rapporto delle
//           densità, che dipende dalla variabile scelta. Per «tra» la grana relativa fa sì che il peso non dipenda da a, b:
//           un evento i cui estremi cambiano tra due mondi ha celle di ampiezza assoluta diversa (dichiarato).
// I TIRI LETTI SENZA LEGGE (c(x) nudo, c.serie) sono «uniforme» su u: il peso della cella è 2^−grana per ogni esito,
// quindi, a parità di numero di tiri, il rapporto è 1. È ciò che vale oggi per quasi tutti gli eventi del programma
// (disco.js, lune.js leggono c(…) e poi lo confrontano con una probabilità: la legge vera, per esempio una Bernoulli,
// è nel consumatore e non arriva al registro). Per pesarli i consumatori devono dichiarare la legge: c.bernoulli,
// c.discreta (nuove: la patch di eventi.js, e conMisura qui), c.intero, c.tra, c.normale.
// Le funzioni trascendenti di Math sono usate liberamente: i pesi non decidono nessun esito (r. 1 vale per i tiri).
import { campana, rileggi } from './eventi.js';
import { ANNO, COSTANTI } from './leggi.js'; // le costanti e le unità: un posto solo

const DUE32 = 4294967296, SEMI = 2147483646;
export const OPZIONI_MISURA = Object.freeze({ grana: 20 });

// ---------- la funzione d'errore complementare (per la ripartizione della campana): serie di erf sotto 2, frazione continua
// di Laplace sopra (60 termini, dal fondo). Errore relativo < 10⁻¹⁴ (riscontrato nella prova su valori di tabella).
export function erfc(x) {
  if (x < 0) return 2 - erfc(-x);
  if (x < 2) { let s = 0, t = x; for (let n = 0; n < 60; n++) { s += t / (2 * n + 1); t *= (-x * x) / (n + 1); } return 1 - (2 / Math.sqrt(Math.PI)) * s; }
  let f = x; for (let k = 60; k >= 1; k--) f = x + k / 2 / f;
  return Math.exp(-x * x) / Math.sqrt(Math.PI) / f;
}
const coda = (z) => 0.5 * erfc(z / Math.SQRT2); // P(Z ≥ z)
// la massa della campana in [a, b), senza perdere cifre nelle code
const massaCampana = (a, b) => (a >= 0 ? coda(a) - coda(b) : b <= 0 ? coda(-b) - coda(-a) : 1 - coda(b) - coda(-a));

// ---------- LE LEGGI. Per ognuna: quanti tiri, l'esito dai tiri (come lo calcola eventi.js), la cella dell'esito e la sua massa
// (celle: un identificatore della cella, uguale per esiti uguali alla grana)
function* conta(a, b) { for (let j = a; j < b; j++) yield j; }
const cellaU = (u, g) => Math.floor(u * 2 ** g), massaU = (j, g) => Math.min(1, (j + 1) / 2 ** g) - j / 2 ** g;
export const LEGGI = {
  uniforme: { tiri: 1, esito: ([u]) => u, cella: (x, P, g) => cellaU(x, g), massa: (j, P, g) => massaU(j, g), celle: (P, g) => conta(0, 2 ** g) },
  // tra(a, b) = a + (b − a)·u: la cella è una frazione 2^−g dell'intervallo, contata da a
  tra: { tiri: 1, esito: ([u], P) => P.a + (P.b - P.a) * u, cella: (x, P, g) => Math.min(2 ** g - 1, Math.max(0, cellaU((x - P.a) / (P.b - P.a), g))), massa: (j, P, g) => massaU(j, g), celle: (P, g) => conta(0, 2 ** g) },
  intero: { tiri: 1, esito: ([u], P) => Math.min(P.n - 1, Math.floor(u * P.n)), cella: (x) => x, massa: (k, P) => (k >= 0 && k < P.n ? 1 / P.n : 0), celle: (P) => conta(0, P.n) },
  bernoulli: { tiri: 1, esito: ([u], P) => u < P.p, cella: (x) => !!x, massa: (x, P) => (x ? P.p : 1 - P.p), celle: () => [true, false] },
  // discreta(pesi): l'esito i con probabilità pesi[i]/Σ (la scelta per cumulata, come scegli di lingua.js)
  discreta: { tiri: 1, esito: ([u], P) => { const W = P.pesi.reduce((s, w) => s + w, 0); let s = 0; for (let i = 0; i < P.pesi.length; i++) { s += P.pesi[i]; if (u * W < s) return i; } return P.pesi.length - 1; },
    cella: (x) => x, massa: (i, P) => P.pesi[i] / P.pesi.reduce((s, w) => s + w, 0), celle: (P) => P.pesi.map((_, i) => i) },
  // la campana di eventi.js (Box-Muller, media 0 e scarto 1). Le celle sono nello scarto: [j, j+1)·2^−g. (eventi.js tiene il
  // primo tiro sopra 10⁻¹²: |z| ≤ 7,43; la massa tolta, 1,1·10⁻¹³, non è contata: dichiarato)
  normale: { tiri: 2, esito: ([a, b]) => campana(a, b), cella: (z, P, g) => Math.floor(z * 2 ** g),
    massa: (j, P, g) => { const d = 2 ** -g; return d < 2 ** -24 ? (Math.exp(-(((j + 0.5) * d) ** 2) / 2) / Math.sqrt(2 * Math.PI)) * d : massaCampana(j * d, (j + 1) * d); },
    celle: (P, g) => conta(-9 * 2 ** g, 9 * 2 ** g), coda: (g) => 2 * coda(9) },
  // c.seme: (X0 mod 2147483646) + 1, con X0 i primi 32 bit del tiro: 2³² = 2·2147483646 + 4, quindi gli esiti 1…4 hanno
  // tre parole che li danno, gli altri due (la massa è esatta)
  seme: { tiri: 1, esito: ([u]) => (Math.floor(u * DUE32) % SEMI) + 1, cella: (x) => x, massa: (x) => (x >= 1 && x <= SEMI ? (x <= 4 ? 3 : 2) / DUE32 : 0), celle: null },
};

// il peso dell'esito di una voce: { legge, parametri, tiri } (o con l'esito già calcolato) → { p, cella, esito }
export function massa(voce, opzioni = {}) {
  const g = opzioni.grana ?? OPZIONI_MISURA.grana, L = LEGGI[voce.legge];
  if (!L) throw new Error(`misura: la legge «${voce.legge}» non è tra quelle note (${Object.keys(LEGGI).join(', ')})`);
  const P = voce.parametri || {}, esito = voce.esito !== undefined ? voce.esito : L.esito(voce.tiri, P), cella = L.cella(esito, P, g);
  return { p: L.massa(cella, P, g), cella, esito };
}
// tutte le celle di una legge con la loro massa (per la normalizzazione); «seme» si somma per conteggio (2³² parole)
export function celle(legge, parametri = {}, opzioni = {}) {
  const g = opzioni.grana ?? OPZIONI_MISURA.grana, L = LEGGI[legge];
  if (legge === 'seme') return { somma: (4 * 3 + (SEMI - 4) * 2) / DUE32, quante: SEMI };
  let s = 0, quante = 0; for (const j of L.celle(parametri, g)) { s += L.massa(j, parametri, g); quante++; }
  return { somma: s + (L.coda ? L.coda(g) : 0), quante };
}

// ---------- LA SORGENTE CHE ANNOTA LE LEGGI. Come conRegistro di eventi.js (stessi nomi, stessi esiti, stesse estrazioni),
// ma in «leggi» (una Map) per ogni evento chiesto: indirizzo completo → { legge, parametri, tiri, esito }. Le estrazioni
// dopo la prima di una serie sono «indirizzo#k», uniformi. Un evento letto due volte con leggi diverse: vale l'ultima,
// e la voce lo dice (doppio). Due metodi nuovi, che eventi.js ancora non ha (li aggiunge la patch): bernoulli(x, p)
// (vero con probabilità p: u < p) e discreta(x, pesi). Il nome «sotto» è già della sorgente di una parte: la Bernoulli
// non può chiamarsi così.
export function conMisura(c, leggi = new Map()) {
  const nota = (indirizzo, legge, parametri, tiri, esito) => { const k = `${c.radice}/${indirizzo}`, prima = leggi.get(k); leggi.set(k, { legge, parametri, tiri, esito, ...(prima && prima.legge !== legge ? { doppio: prima.legge } : {}) }); return esito; };
  const d = (indirizzo) => { const u = c(indirizzo); return nota(indirizzo, 'uniforme', {}, [u], u); };
  d.radice = c.radice; d.rami = c.rami; d.leggi = leggi;
  d.sotto = (nome) => conMisura(c.sotto(nome), leggi);
  d.intero = (indirizzo, n) => { const u = c(indirizzo); return nota(indirizzo, 'intero', { n }, [u], LEGGI.intero.esito([u], { n })); };
  d.tra = (indirizzo, a, b) => { const u = c(indirizzo); return nota(indirizzo, 'tra', { a, b }, [u], LEGGI.tra.esito([u], { a, b })); };
  d.bernoulli = (indirizzo, p) => { const u = c(indirizzo); return nota(indirizzo, 'bernoulli', { p }, [u], u < p); };
  d.discreta = (indirizzo, pesi) => { const u = c(indirizzo); return nota(indirizzo, 'discreta', { pesi: [...pesi] }, [u], LEGGI.discreta.esito([u], { pesi })); };
  d.serie = (indirizzo) => { const s = c.serie(indirizzo); return (k = 0) => { const u = s(k); return nota(k ? `${indirizzo}#${k}` : indirizzo, 'uniforme', {}, [u], u); }; };
  d.fila = (indirizzo) => { const s = d.serie(indirizzo); let k = 0; return () => s(k++); };
  d.normale = (indirizzo) => { const s = c.serie(indirizzo), a = s(0), b = s(1); return nota(indirizzo, 'normale', {}, [a, b], campana(a, b)); };
  d.seme = (indirizzo) => { const u = c(indirizzo); return nota(indirizzo, 'seme', {}, [u], c.seme(indirizzo)); };
  return d;
}

// ---------- IL PESO DI UN CAMMINO ANNOTATO: −log₂ Π p, in bit (le voci con p = 0 danno Infinity)
export function storia(leggi, opzioni = {}) {
  let bit = 0; const celleDi = new Map();
  for (const [k, v] of leggi) { const m = massa(v, opzioni); bit += m.p > 0 ? -Math.log2(m.p) : Infinity; celleDi.set(k, { ...m, legge: v.legge, parametri: v.parametri }); }
  return { bit, P: 2 ** -bit, voci: leggi.size, celle: celleDi };
}
const stessa = (a, b) => a.legge === b.legge && a.cella === b.cella && JSON.stringify(a.parametri) === JSON.stringify(b.parametri);
// IL PESO DI UN MONDO RISPETTO A QUELLO DI PARTENZA: le due Map annotate (conMisura) dei due cammini. Il rapporto è
// Π_mondo p / Π_partenza p sulle sole voci che non si semplificano.
// → { P (il rapporto), bit (−log₂ P: quanti bit costa il ramo in più della partenza; negativo se è più probabile), diversi:
//     [{ evento, mondo: p | null, partenza: p | null }], uguali (le voci semplificate), grana }
export function rapporto(mondo, base, opzioni = {}) {
  const A = storia(mondo, opzioni).celle, B = storia(base, opzioni).celle, diversi = []; let bit = 0, uguali = 0;
  for (const [k, a] of A) { const b = B.get(k); if (b && stessa(a, b)) { uguali++; continue; } bit += -Math.log2(a.p) + (b ? Math.log2(b.p) : 0); diversi.push({ evento: k, mondo: a.p, partenza: b ? b.p : null }); }
  for (const [k, b] of B) if (!A.has(k)) { bit += Math.log2(b.p); diversi.push({ evento: k, mondo: null, partenza: b.p }); }
  diversi.sort((x, y) => (x.evento < y.evento ? -1 : 1));
  return { P: 2 ** -bit, bit, diversi, uguali, grana: opzioni.grana ?? OPZIONI_MISURA.grana };
}
// SOLO GLI EVENTI DEI RAMI, data la loro legge: leggiDegliEventi è una Map (o un oggetto) evento → { legge, parametri }
// (per esempio presa da una conMisura del mondo di partenza). Per ogni { evento: n } dei rami: p(esito del ramo n) /
// p(esito del ramo 0), con i tiri riletti da eventi.js (rileggi). Ciò che ne discende (gli eventi letti dopo, con parametri
// cambiati, o nati e tolti) NON è contato: per quello servono i due cammini interi (rapporto). Un evento di cui non si dà
// la legge pesa 1, e lo si dice.
export function pesoDegliEventi(rami, leggiDegliEventi = null, opzioni = {}) {
  const leggeDi = (e) => (leggiDegliEventi ? (leggiDegliEventi instanceof Map ? leggiDegliEventi.get(e) : leggiDegliEventi[e]) : null);
  let bit = 0; const voci = [];
  for (const [e, n] of Object.entries(rami || {})) {
    const L = leggeDi(e); if (!L || !n) { voci.push({ evento: e, ramo: n, p: 1, nota: 'legge non dichiarata: il tiro è uniforme, rapporto 1' }); continue; }
    const tiri = (r) => Array.from({ length: LEGGI[L.legge].tiri }, (_, k) => rileggi(k ? `${e}#${k}` : e, r ? { [e]: r } : null));
    const m1 = massa({ legge: L.legge, parametri: L.parametri, tiri: tiri(n) }, opzioni), m0 = massa({ legge: L.legge, parametri: L.parametri, tiri: tiri(0) }, opzioni);
    const b = -Math.log2(m1.p) + Math.log2(m0.p); bit += b; voci.push({ evento: e, ramo: n, legge: L.legge, esito: m1.esito, esitoPartenza: m0.esito, p: m1.p / m0.p, bit: b });
  }
  return { P: 2 ** -bit, bit, voci };
}

// ---------- C13: I CERVELLI DI BOLTZMANN CONTATI, una prima stima. STIMA D'ORDINE DI GRANDEZZA, dichiarata.
// Per un contenuto (un oggetto di massa M fatto di particelle di massa m, con entropia s_ogg·k per particella) si
// confrontano due famiglie di storie che lo producono:
//   · EVOLUTIVA: la via ordinaria del modello. Il suo peso è la frazione f degli oggetti della classe che hanno quel
//     contenuto, dalla misura (la dà lingua.frazione con puntoACaso); in un mondo ce ne sono f·N_ogg.
//   · PER FLUTTUAZIONE: le particelle dell'oggetto, prese dal mezzo che lo circonda (un gas ideale a densità n e
//     temperatura T), si raccolgono da sole per una fluttuazione termica. Probabilità per tentativo ∝ e^{−ΔS/k}, con
//     ΔS = N·k·(s_gas − s_ogg), N = M/m e s_gas l'entropia per particella del gas (Sackur-Tetrode,
//     s = ln[(V/N)/λ³] + 5/2, λ = h/√(2π m k T)). I tentativi in un mondo: i volumi indipendenti che contengono
//     quella massa (V_mondo/V_ogg, V_ogg = N/n) per i tempi indipendenti (età/τ, τ il tempo in cui il suono attraversa
//     V_ogg): un'ABBONDANZA (ogni volume del mondo pieno di quel mezzo), che favorisce la fluttuazione.
// Si conta PER MONDO (un cosmo fino a oggi: un tempo finito, perché la misura sui cammini estrae il tempo dalla vita
// del cosmo, mai uniforme su un tempo infinito: O7). PER OSSERVATORE manca: nessun modulo sa dire dove c'è un
// osservatore, e in un futuro di de Sitter eterno i tentativi divergono: lì il conto per osservatore è il problema della
// misura (Carroll 2017), non un numero. Non contati: l'energia di legame e il calore che la fluttuazione deve restituire,
// la radiazione, la struttura fine (molecole, ordine) oltre l'entropia per particella; ciascuno cambia ΔS di un fattore
// d'ordine uno, non l'esponente.
const K_B = COSTANTI.kB, H_P = COSTANTI.h, M_U = COSTANTI.u;
export function sackurTetrode(n, T, m) { const l = H_P / Math.sqrt(2 * Math.PI * m * K_B * T); return Math.log(1 / n / l ** 3) + 2.5; }
export function cervelliDiBoltzmann({ massaKg, massaParticella = 26 * M_U, entropiaPerParticella = 3, frazioneEvolutiva, oggettiNelMondo = 1, mezzo = { n: 1e6, T: 8000, nome: 'il mezzo interstellare tiepido' }, volumeMondoM3, etaAnni, deltaS = null } = {}) {
  const N = massaKg / massaParticella, sg = sackurTetrode(mezzo.n, mezzo.T, massaParticella), dS = deltaS ?? N * (sg - entropiaPerParticella); // ΔS/k
  const Vogg = N / mezzo.n, cs = Math.sqrt((5 / 3) * K_B * mezzo.T / massaParticella), tau = Math.cbrt(Vogg) / cs, eta = etaAnni * ANNO;
  const bitTentativo = dS / Math.LN2, log2Tentativi = Math.log2(volumeMondoM3 / Vogg) + Math.log2(Math.max(1, eta / tau));
  const bitEvolutivaOggetto = -Math.log2(frazioneEvolutiva), log2Evolutivi = Math.log2(frazioneEvolutiva * oggettiNelMondo), log2Fluttuazioni = log2Tentativi - bitTentativo;
  return {
    particelle: N, entropiaGas: sg, deltaS_k: dS, bitFluttuazioneTentativo: bitTentativo, log2Tentativi, bitEvolutivaOggetto, log2Evolutivi, log2Fluttuazioni,
    rapportoBit: log2Evolutivi - log2Fluttuazioni, // log₂(oggetti evolutivi / oggetti per fluttuazione) nello stesso mondo
    conta: 'per mondo: oggetti attesi in un cosmo fino a oggi, per le due vie (per osservatore: manca)', mezzo,
    nota: `stima d'ordine di grandezza: ΔS = N·k·(s_gas − s_oggetto), ${mezzo.nome} (n = ${mezzo.n} m⁻³, T = ${mezzo.T} K), s_oggetto = ${entropiaPerParticella} k; esclusi energia di legame, calore restituito, struttura fine`,
  };
}
