// albero_vita.js — L'ALBERO DELLA VITA DI UN PIANETA, INDIRIZZABILE: solo la struttura (chi è parente di chi, e da
// quando), senza organismi. Date due specie viventi (due indirizzi), dice quanto tempo fa viveva il loro ultimo
// antenato comune: una funzione pura dell'indirizzo, calcolata solo dove si chiede.
//
// LEGGE. Se le specie nascono (una ne dà due) e muoiono a ritmo costante, l'albero delle sole specie VIVENTI — quello
// che si ricostruisce da chi c'è oggi — è un processo puntuale coalescente (Lambert e Stadler 2013, Theor. Popul.
// Biol. 90, 113; Nee, May e Harvey 1994): messe le specie in fila, le profondità H dei nodi tra due vicine sono
// INDIPENDENTI e hanno tutte la stessa legge,
//     P(H > t) = 1/F(t),   F(t) = 1 + (λ/r)·(e^(r·t) − 1),   r = λ − μ      (r = 0: F = 1 + λ·t)
// condizionate a stare sotto l'età T della radice. Il tempo dell'antenato comune di due specie i < j è il massimo
// delle profondità tra loro: t(i, j) = max(H_i, …, H_(j−1)). È ultrametrico da solo: t(i, k) = max(t(i, j), t(j, k)).
// Il numero atteso di specie viventi dopo un tempo T è F(T).
//
// IL CALCOLO PIGRO. Le H non si generano: sono 2^K (K = 40: mille miliardi). Si tiene un albero binario di BLOCCHI di
// profondità consecutive. Il massimo di un blocco di m variabili indipendenti ha quantile U^(1/m); dato il massimo
// di un blocco, sta in una delle sue due metà con probabilità ½ (un evento), e l'altra metà ha il suo massimo più in
// basso: quantile del padre × U^(2/m) (un altro evento: il massimo di m/2 variabili che stanno tutte sotto quello del
// padre). Il massimo su un intervallo qualunque si ottiene scendendo come in un albero di segmenti: al più 4·K nodi,
// due eventi per nodo. Ogni evento ha il suo indirizzo («…/vita/blocco 7.93»): lo stesso antenato, a chiunque lo
// chieda e in qualunque ordine. Si lavora con il LOGARITMO del quantile (somme di logEsatto(U)/m: operazioni esatte),
// perché vicino alla radice i quantili distano da 1 meno di quanto un numero a 64 bit distingua: così la struttura
// dell'albero (chi è il massimo di che cosa) è la stessa, bit per bit, su ogni macchina; solo l'ultimo passo, dal
// quantile al tempo, usa esponenziale e logaritmo del linguaggio.
//
// IL VINCOLO VERSO L'ALTO (regola 5: che cosa chiede a chi sta sopra). La radice non può essere più antica del tempo
// da cui il pianeta ha acqua liquida: T ≤ quel tempo, e nessun antenato comune può precedere T (le H sono condizionate
// a stare sotto). OGGI il pianeta sa solo la sua età e lo stato dell'acqua adesso: se l'acqua è liquida oggi si prende
// come limite l'età del pianeta (come se lo fosse sempre stata), se non lo è l'albero non c'è. LA STORIA VERA
// DELL'ABITABILITÀ (da quando, con quali interruzioni) arriverà con storia.js: allora T verrà da lì.
//
// PARAMETRI DICHIARATI (non sono leggi: sono misure fatte sulla Terra, messe in un posto solo, TASSI):
//   nascita  0,5 per milione di anni: una specie ne dà un'altra ogni ~2 Ma (Hedges, Marin, Suleski, Paymer e Kumar 2015,
//            Mol. Biol. Evol. 32, 835: la speciazione come un orologio, 2 Ma tra due eventi);
//   morte    quasi uguale alla nascita (Marshall 2017, Nat. Ecol. Evol. 1, 0165: origine ed estinzione si pareggiano
//            sui tempi lunghi); il valore è quello che in 1800 Ma (l'età degli eucarioti) dà 8,7 milioni di specie
//            (Mora e altri 2011, PLoS Biol. 9, e1001127): TARATO SULLA TERRA.
// CHE COSA NON TORNA / NON C'È:
//   · con ritmi costanti la diversità cresce senza limite, come e^(r·T): un pianeta di dieci miliardi di anni con i
//     ritmi della Terra avrebbe 10²⁹ specie. Il numero vero lo limita ciò che il pianeta può sostenere (energia, area
//     abitabile): finché nessun modulo lo calcola si può dare la capacità (`specie`), e la morte si ricava da quella;
//   · quando è nata la vita non lo dice nessuna legge qui: T è il LIMITE (l'età del pianeta), non una stima;
//   · gli alberi veri sono più sbilanciati di questi (Aldous: β ≈ −1; qui β = 0, la forma di Yule);
//   · un oceano sotto il ghiaccio non conta come acqua liquida (il pianeta, oggi, sa solo la superficie);
//   · niente dentro la specie (coalescente di Kingman), niente genomi, niente scambio di geni tra rami: solo i tempi
//     tra specie. Infiniti scenari di ritmi variabili danno lo stesso albero dei viventi (Louca e Pennell 2020):
//     scegliere ritmi costanti non contraddice niente che si possa osservare dall'interno.
// UNITÀ: milioni di anni (Ma). Le specie sono numeri interi da 0 a foglie − 1, in fila.

import { sorgente, logEsatto } from './eventi.js';

export const TASSI = Object.freeze({ nascita: 0.5, morte: 0.4935389 }); // per milione di anni (vedi sopra: fonti e taratura)
export const FOGLIE_MAX = 2 ** 52; // oltre, un numero di specie non è più un intero esatto

// F(t) = 1/P(H > t): il numero atteso di specie viventi dopo un tempo t
export const attese = (t, nascita, r) => (Math.abs(r * t) < 1e-9 ? 1 + nascita * t : 1 + (nascita / r) * Math.expm1(r * t));
// il ritmo netto r che in un tempo T dà N specie attese (bisezione: F cresce con r)
export function ritmoPer(N, T, nascita) { let a = -nascita, b = nascita; for (let k = 0; k < 200; k++) { const m = (a + b) / 2; if (attese(T, nascita, m) < N) a = m; else b = m; } return (a + b) / 2; }

// L'ALBERO.
//   radice   l'indirizzo sotto cui stanno i suoi eventi («cosmo 1/galassia 0/stella 21/pianeta 0/vita»)
//   T        l'età della radice (Ma)
//   tassi    { nascita, morte } per Ma (di default TASSI); specie: la capacità (se data, la morte si ricava: F(T) = specie)
//   foglie   quante specie viventi (se manca: un evento, con la legge geometrica del processo, media F(T))
// → { radice, T, nascita, morte, r, attese (F(T)), foglie, K, oltre (le specie attese passano FOGLIE_MAX),
//     antenato(i, j) → Ma fa (0 se i = j), ripartizione(t) = P(H ≤ t | H ≤ T), quantile(q) la sua inversa,
//     ultimi: { nodi, eventi } il costo dell'ultima domanda }
export function alberoVita(radice, { T, tassi = TASSI, specie = null, foglie = null, rami = null } = {}) {
  if (!(T > 0)) throw new Error('serve l\'età della radice T (milioni di anni), positiva');
  const nascita = tassi.nascita, r = specie ? ritmoPer(specie, T, nascita) : nascita - tassi.morte, morte = nascita - r, FT = attese(T, nascita, r), PT = 1 - 1 / FT;
  const c = sorgente(String(radice), rami);
  // quante specie: P(N = k) = P(H > T)·P(H ≤ T)^(k−1)
  let N = foglie, oltre = false;
  if (N == null) { const n = 1 + Math.floor(logEsatto(c('quante specie')) / Math.log1p(-1 / FT)); oltre = !(n <= FOGLIE_MAX); N = oltre ? FOGLIE_MAX : n; }
  if (!(N >= 1 && N <= FOGLIE_MAX && Number.isInteger(N))) throw new Error(`le foglie sono un intero tra 1 e 2^52 (${N})`);
  let K = 0; while (2 ** K < N) K++;
  // dal logaritmo del quantile al tempo: x = P(H ≤ t) = PT·e^ℓ; 1 − x contato senza perdere cifre vicino a 1
  const tempo = (l) => { const x = PT * Math.exp(l), resto = 1 / FT + PT * -Math.expm1(l), y = x / resto; return Math.abs(r * T) < 1e-9 ? y / nascita : Math.log1p((r / nascita) * y) / r; };
  const ripartizione = (t) => (1 - 1 / attese(Math.min(t, T), nascita, r)) / PT, quantile = (q) => tempo(Math.log(q));
  const ultimi = { nodi: 0, eventi: 0 }, u = (nome) => { ultimi.eventi++; return c(nome); };
  // il massimo (in logaritmo del quantile) sulle profondità a…b−1, scendendo dal blocco (livello, idx) che comincia in `da` ed è lungo `m`
  const massimo = (a, b, livello, idx, da, m, l) => {
    ultimi.nodi++;
    if (a <= da && da + m <= b) return l;
    const meta = m / 2, pesante = u(`lato ${livello}.${idx}`) < 0.5 ? 1 : 0; let meglio = -Infinity;
    for (let f = 0; f < 2; f++) { const inizio = da + f * meta; if (b <= inizio || inizio + meta <= a) continue;
      const lf = f === pesante ? l : l + logEsatto(u(`blocco ${livello + 1}.${2 * idx + f}`)) / meta, v = massimo(a, b, livello + 1, 2 * idx + f, inizio, meta, lf); if (v > meglio) meglio = v; }
    return meglio;
  };
  const antenato = (i, j) => {
    if (!(Number.isInteger(i) && Number.isInteger(j) && i >= 0 && j >= 0 && i < N && j < N)) throw new Error(`le specie vanno da 0 a ${N - 1} (${i}, ${j})`);
    ultimi.nodi = 0; ultimi.eventi = 0; if (i === j) return 0; if (i > j) { const t = i; i = j; j = t; }
    return tempo(massimo(i, j, 0, 0, 0, 2 ** K, logEsatto(u('blocco 0.0')) / 2 ** K));
  };
  return { radice: String(radice), T, nascita, morte, r, attese: FT, foglie: N, K, oltre, antenato, ripartizione, quantile, ultimi };
}

// IL VINCOLO VERSO L'ALTO: da quanto tempo, al più, quel pianeta può avere avuto vita (Ma). Con ciò che il pianeta sa
// OGGI: la sua età e lo stato dell'acqua adesso. → { Ma, perche }
export function radiceMassima(P, stella = null) {
  const acqua = P?.clima?.acqua, anni = P?.interno?.eta ?? stella?.eta ?? 0;
  if (acqua !== 'liquida') return { Ma: 0, perche: `oggi l'acqua di questo pianeta è «${acqua ?? 'assente'}», non liquida: senza la storia dell'abitabilità (storia.js, non ancora) non si può dire se e quando lo è stata; l'albero non c'è` };
  return { Ma: anni / 1e6, perche: `l'acqua oggi è liquida; il pianeta ha ${(anni / 1e9).toFixed(2)} miliardi di anni: la radice non può essere più antica (è un limite: come se l'acqua fosse stata liquida da sempre; la storia vera arriverà con storia.js)` };
}
// L'ALBERO DI UN PIANETA: P e stella da sistema() di cosmo.js, luogo il suo indirizzo («cosmo 1/galassia 0/stella 21/pianeta 0»).
//   opz.T   l'età della radice che si vuole (Ma): se supera il limite del pianeta, l'albero non esiste e lo si dice
// → { esiste: false, perche } oppure l'albero, con in più `limite` (Ma) e `perche`
export function alberoDelPianeta(P, stella, luogo, opz = {}) {
  const lim = radiceMassima(P, stella); if (!(lim.Ma > 0)) return { esiste: false, limite: 0, perche: lim.perche };
  if (opz.T != null && opz.T > lim.Ma) return { esiste: false, limite: lim.Ma, perche: `una radice di ${opz.T} Ma è più antica del tempo da cui questo pianeta può avere acqua liquida (${lim.Ma.toFixed(0)} Ma): quell'albero non può esserci` };
  return { esiste: true, limite: lim.Ma, perche: lim.perche, ...alberoVita(`${luogo}/vita`, { ...opz, T: opz.T ?? lim.Ma }) };
}
