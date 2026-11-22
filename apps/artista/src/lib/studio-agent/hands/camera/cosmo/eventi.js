// eventi.js — una sola sorgente per tutto ciò che «va in un modo o in un altro».
//
// In questo universo niente è tirato a caso da un numero messo lì: ogni esito incerto è un EVENTO con un
// indirizzo (dove e quando accade, e che cosa: «cosmo 1/galassia 3/stella 53/pianeta 0/impatto 12/dove»).
// Lo stesso indirizzo dà sempre lo stesso esito: l'universo è già tutto lì, lo si calcola solo dove si guarda.
// Un universo parallelo è lo stesso universo con alcuni eventi andati diversamente: rami = { indirizzo: n }
// sceglie l'esito n-esimo di quell'evento (molti mondi). Tutto il resto resta identico; cambia ciò che ne discende.
// È la stessa regola degli eventi delle particelle (mondo.js, casoEvento), che leggono da qui.
//
// LA FONTE È UNA SOLA: Threefry-4x32 a 20 giri (Salmon, Moraes, Dror e Shaw 2011, «Parallel random numbers: as easy
// as 1, 2, 3»; libreria Random123), un generatore A CONTATORE: una funzione pura (contatore a 128 bit, chiave a 128
// bit) → 128 bit, senza stato, e per ogni chiave una biiezione sui contatori. Non c'è una sequenza da cui «tirare»:
// l'ordine in cui si calcola non conta, e si può chiedere l'estrazione numero k senza passare per le prime.
// Perché questa variante: è in aritmetica a 32 bit (quella esatta di JavaScript), è della famiglia che l'articolo
// verifica con TestU01 (4x32 a 12 giri passa SmallCrush, Crush e BigCrush; qui i giri sono 20, otto di margine), e la
// chiave a 128 bit rende trascurabile la coincidenza tra due indirizzi (sotto).
//   · LA CHIAVE è l'indirizzo. Un indirizzo è un cammino di nomi separati da «/»; la chiave di un nome si ricava da
//     quella di chi lo contiene: chiave(«a/b») = Threefry(nome «b» ; chiave(«a»)) (la costruzione ad albero di
//     Goldreich, Goldwasser e Micali). Il nome entra come contatore, a blocchi di 16 byte: 15 di testo (i caratteri in
//     UTF-8, unità per unità) e nel byte più alto 0xF0 + quanti byte di testo porta il blocco. Un blocco pieno (15)
//     dice «il nome continua»; l'ultimo ne ha da 0 a 14. Così nomi diversi danno successioni di blocchi diverse, e
//     due indirizzi diversi hanno la stessa chiave solo per una coincidenza a 128 bit: tra N indirizzi la
//     probabilità che ce ne sia una è circa N²/2¹²⁹ (1,5·10⁻¹⁵ a mille miliardi di indirizzi; con le chiavi a 64 bit
//     della fonte di prima era già il 2,7% a un miliardo). Due figli dello stesso nodo che differiscono solo
//     nell'ultimo blocco non coincidono MAI (con la stessa chiave Threefry è una biiezione). La radice di tutto è la
//     chiave (0, 0, 0, 0).
//   · IL CONTATORE è (k, ramo, 0, 0): k è il numero dell'estrazione DENTRO l'evento (un evento può aver bisogno di più
//     numeri: i due di una campana, il rumore di una griglia cella per cella), ramo è il mondo scelto per
//     quell'evento. Un ramo cambia quindi i numeri di quell'evento e di nessun altro: le chiavi di ciò che gli sta
//     accanto, e anche di ciò che gli sta sotto, restano quelle. Il byte più alto di un contatore d'esito è 0, quello
//     di un blocco di nome è almeno 0xF0: con la stessa chiave sono contatori diversi, quindi nessun esito di un
//     luogo è mai uguale alla chiave di una sua parte.
//   · L'ESITO: dei 128 bit usciti, c() usa i primi 53 (un numero tra 0 e 1 con tutta la precisione di un double),
//     numero() i primi 32. Dai bit all'esito si passa solo con operazioni esatte (somme, prodotti, divisioni,
//     radici): anche la campana, che ha il suo logaritmo e il suo coseno scritti qui sotto. Così lo stesso
//     indirizzo dà gli stessi bit su qualunque motore.
// Parametri liberi: nessuno (le costanti di rotazione e 0x1BD11BDA sono quelle di Threefry; il numero di giri, 20,
// è quello consigliato). Riscontro: i vettori noti di Random123 a 13, 20 e 72 giri (test/test_eventi.mjs). La qualità del
// flusso VERO, con la derivazione delle chiavi (un indirizzo nuovo per ogni numero: «prova/evento i», i fratelli; padre e
// figlio alternati, «p/i» e «p/i/figlio»; cammini di cinque nomi dalla radice), provata con TestU01 1.2.3 (novembre 2026):
// SmallCrush e Crush passati, 3,4·10¹⁰ indirizzi per Crush.

// ---------- Threefry
// le versioni «da leggere», con i giri a scelta: servono alle prove (i vettori noti di Random123). La 2x32 è la fonte
// di prima: resta per confronto, nessun esito la usa più.
const ROT2 = [13, 15, 26, 6, 17, 29, 16, 24];
export function threefry2x32(c0, c1, k0, k1, giri = 20) {
  const ks = [k0 | 0, k1 | 0, (0x1BD11BDA ^ k0 ^ k1) | 0];
  let x0 = (c0 + ks[0]) | 0, x1 = (c1 + ks[1]) | 0;
  for (let r = 0; r < giri; r++) {
    const s = ROT2[r & 7];
    x0 = (x0 + x1) | 0; x1 = ((x1 << s) | (x1 >>> (32 - s))) ^ x0;
    if ((r & 3) === 3) { const j = (r + 1) >> 2; x0 = (x0 + ks[j % 3]) | 0; x1 = (x1 + ks[(j + 1) % 3] + j) | 0; }
  }
  return [x0 >>> 0, x1 >>> 0];
}
// Threefry-4x32: quattro parole; nei giri pari si mescolano (0,1) e (2,3), in quelli dispari (0,3) e (2,1); ogni
// quattro giri si aggiunge la chiave, girata di una parola (cinque parole: le quattro e la loro parità)
const ROT4 = [[10, 26], [11, 21], [13, 27], [23, 5], [6, 20], [17, 11], [25, 10], [18, 20]];
export function threefry4x32(c, k, giri = 20) {
  const ks = [k[0] | 0, k[1] | 0, k[2] | 0, k[3] | 0, (0x1BD11BDA ^ k[0] ^ k[1] ^ k[2] ^ k[3]) | 0];
  const x = [0, 1, 2, 3].map((i) => (c[i] + ks[i]) | 0), giro = (i, j, s) => { x[i] = (x[i] + x[j]) | 0; x[j] = ((x[j] << s) | (x[j] >>> (32 - s))) ^ x[i]; };
  for (let r = 0; r < giri; r++) {
    const [s0, s1] = ROT4[r & 7];
    if (r & 1) { giro(0, 3, s0); giro(2, 1, s1); } else { giro(0, 1, s0); giro(2, 3, s1); }
    if ((r & 3) === 3) { const j = (r + 1) >> 2; for (let i = 0; i < 4; i++) x[i] = (x[i] + ks[(j + i) % 5] + (i === 3 ? j : 0)) | 0; }
  }
  return x.map((v) => v >>> 0);
}
// la versione di lavoro: i 20 giri della 4x32 scritti per esteso (niente tabelle né vettori: sta nei cicli caldi).
// Lascia l'esito in X0, X1, X2, X3 (interi a 32 bit con segno)
let X0 = 0, X1 = 0, X2 = 0, X3 = 0;
function tf(a, b, c, d, k0, k1, k2, k3) {
  const k4 = 0x1BD11BDA ^ k0 ^ k1 ^ k2 ^ k3;
  a = (a + k0) | 0; b = (b + k1) | 0; c = (c + k2) | 0; d = (d + k3) | 0;
  a = (a + b) | 0; b = ((b << 10) | (b >>> 22)) ^ a; c = (c + d) | 0; d = ((d << 26) | (d >>> 6)) ^ c; a = (a + d) | 0; d = ((d << 11) | (d >>> 21)) ^ a; c = (c + b) | 0; b = ((b << 21) | (b >>> 11)) ^ c;
  a = (a + b) | 0; b = ((b << 13) | (b >>> 19)) ^ a; c = (c + d) | 0; d = ((d << 27) | (d >>> 5)) ^ c; a = (a + d) | 0; d = ((d << 23) | (d >>> 9)) ^ a; c = (c + b) | 0; b = ((b << 5) | (b >>> 27)) ^ c;
  a = (a + k1) | 0; b = (b + k2) | 0; c = (c + k3) | 0; d = (d + k4 + 1) | 0;
  a = (a + b) | 0; b = ((b << 6) | (b >>> 26)) ^ a; c = (c + d) | 0; d = ((d << 20) | (d >>> 12)) ^ c; a = (a + d) | 0; d = ((d << 17) | (d >>> 15)) ^ a; c = (c + b) | 0; b = ((b << 11) | (b >>> 21)) ^ c;
  a = (a + b) | 0; b = ((b << 25) | (b >>> 7)) ^ a; c = (c + d) | 0; d = ((d << 10) | (d >>> 22)) ^ c; a = (a + d) | 0; d = ((d << 18) | (d >>> 14)) ^ a; c = (c + b) | 0; b = ((b << 20) | (b >>> 12)) ^ c;
  a = (a + k2) | 0; b = (b + k3) | 0; c = (c + k4) | 0; d = (d + k0 + 2) | 0;
  a = (a + b) | 0; b = ((b << 10) | (b >>> 22)) ^ a; c = (c + d) | 0; d = ((d << 26) | (d >>> 6)) ^ c; a = (a + d) | 0; d = ((d << 11) | (d >>> 21)) ^ a; c = (c + b) | 0; b = ((b << 21) | (b >>> 11)) ^ c;
  a = (a + b) | 0; b = ((b << 13) | (b >>> 19)) ^ a; c = (c + d) | 0; d = ((d << 27) | (d >>> 5)) ^ c; a = (a + d) | 0; d = ((d << 23) | (d >>> 9)) ^ a; c = (c + b) | 0; b = ((b << 5) | (b >>> 27)) ^ c;
  a = (a + k3) | 0; b = (b + k4) | 0; c = (c + k0) | 0; d = (d + k1 + 3) | 0;
  a = (a + b) | 0; b = ((b << 6) | (b >>> 26)) ^ a; c = (c + d) | 0; d = ((d << 20) | (d >>> 12)) ^ c; a = (a + d) | 0; d = ((d << 17) | (d >>> 15)) ^ a; c = (c + b) | 0; b = ((b << 11) | (b >>> 21)) ^ c;
  a = (a + b) | 0; b = ((b << 25) | (b >>> 7)) ^ a; c = (c + d) | 0; d = ((d << 10) | (d >>> 22)) ^ c; a = (a + d) | 0; d = ((d << 18) | (d >>> 14)) ^ a; c = (c + b) | 0; b = ((b << 20) | (b >>> 12)) ^ c;
  a = (a + k4) | 0; b = (b + k0) | 0; c = (c + k1) | 0; d = (d + k2 + 4) | 0;
  a = (a + b) | 0; b = ((b << 10) | (b >>> 22)) ^ a; c = (c + d) | 0; d = ((d << 26) | (d >>> 6)) ^ c; a = (a + d) | 0; d = ((d << 11) | (d >>> 21)) ^ a; c = (c + b) | 0; b = ((b << 21) | (b >>> 11)) ^ c;
  a = (a + b) | 0; b = ((b << 13) | (b >>> 19)) ^ a; c = (c + d) | 0; d = ((d << 27) | (d >>> 5)) ^ c; a = (a + d) | 0; d = ((d << 23) | (d >>> 9)) ^ a; c = (c + b) | 0; b = ((b << 5) | (b >>> 27)) ^ c;
  X0 = (a + k0) | 0; X1 = (b + k1) | 0; X2 = (c + k2) | 0; X3 = (d + k3 + 5) | 0;
}

// ---------- dall'indirizzo alla chiave
// prosegue una chiave (k0, k1, k2, k3) lungo il cammino «s» (nomi separati da «/»), dal carattere «da»; lascia la
// chiave nuova in X0, X1, X2, X3. Il blocco che si riempie è w (byte 0-3), v (4-7), u (8-11), t (12-14); n byte già messi
function scendi(k0, k1, k2, k3, s, da = 0) {
  let w = 0, v = 0, u = 0, t = 0, n = 0;
  for (let i = da, L = s.length; i <= L; i++) {
    const ch = i < L ? s.charCodeAt(i) : 47;
    if (ch === 47) { // finisce un nome: l'ultimo blocco, con nel byte più alto 0xF0 + i byte che porta (meno di 15)
      tf(w, v, u, t | ((0xF0 | n) << 24), k0, k1, k2, k3); k0 = X0; k1 = X1; k2 = X2; k3 = X3; w = 0; v = 0; u = 0; t = 0; n = 0;
      continue;
    }
    // i byte del carattere (UTF-8, unità per unità: uno per quasi tutti, due o tre per le lettere non semplici; anche le
    // due metà di un carattere fuori dal piano base, ognuna per sé), dal primo all'ultimo, in b
    let b = ch, quanti = 1;
    if (ch >= 0x80) {
      if (ch >= 0x800) { b = (0xE0 | (ch >> 12)) | ((0x80 | ((ch >> 6) & 63)) << 8) | ((0x80 | (ch & 63)) << 16); quanti = 3; }
      else { b = (0xC0 | (ch >> 6)) | ((0x80 | (ch & 63)) << 8); quanti = 2; }
    }
    for (; quanti > 0; quanti--, b >>>= 8) {
      const x = b & 255;
      if (n < 8) { if (n < 4) w |= x << (n << 3); else v |= x << ((n - 4) << 3); } else if (n < 12) u |= x << ((n - 8) << 3); else t |= x << ((n - 12) << 3);
      if (++n === 15) { tf(w, v, u, t | 0xFF000000, k0, k1, k2, k3); k0 = X0; k1 = X1; k2 = X2; k3 = X3; w = 0; v = 0; u = 0; t = 0; n = 0; } // un blocco pieno: il nome continua
    }
  }
  X0 = k0; X1 = k1; X2 = k2; X3 = k3;
}
// la chiave (128 bit, in quattro interi senza segno) di un indirizzo: per le prove e per chi vuole tenerla da parte
export function chiaveDi(indirizzo) { scendi(0, 0, 0, 0, String(indirizzo)); return [X0 >>> 0, X1 >>> 0, X2 >>> 0, X3 >>> 0]; }

// i 53 bit di un esito, come numero tra 0 (compreso) e 1 (escluso): tutta la prima parola e i 21 bit più alti della
// seconda (così numero(), che dà la prima parola, è lo stesso esito letto con meno cifre)
const DUE53 = 1 / 9007199254740992;
const frazione = () => ((X0 >>> 0) * 2097152 + (X1 >>> 11)) * DUE53;

// ---------- LA CAMPANA, CON SOLE OPERAZIONI ESATTE
// Lo standard del linguaggio non fissa al bit Math.log, Math.cos e le altre funzioni trascendenti: due motori, o due
// versioni dello stesso, possono dare un ultimo bit diverso, e in un sistema caotico un bit diventa un altro mondo.
// Somme, differenze, prodotti, divisioni e radici quadrate invece sono esatte ovunque (IEEE 754). Perciò ogni esito
// di questa fonte usa solo quelle: il logaritmo e il coseno della campana (Box-Muller) sono scritti qui, con
// polinomi a ordine fisso. Non sono «arrotondati giusti» all'ultimo bit (sbagliano di qualche 10⁻¹⁶), ma danno gli
// stessi bit su qualunque macchina. Parametri liberi: nessuno (gli ordini sono quelli a cui il resto è sotto 10⁻¹⁸).
const LN2 = 0.6931471805599453, RADICE2 = 1.4142135623730951, PI4 = 0.7853981633974483;
// logaritmo naturale di x > 0: x = m·2^e con m tra 1/√2 e √2 (raddoppi e dimezzamenti: esatti), poi
// ln m = 2·atanh(z) = 2z·(1 + z²/3 + z⁴/5 + … + z²²/23), z = (m − 1)/(m + 1), |z| < 0,172
export function logEsatto(x) {
  if (!(x > 0)) return x === 0 ? -Infinity : NaN; if (x === Infinity) return Infinity;
  let e = 0; while (x * RADICE2 < 1) { x *= 2; e--; } while (x >= RADICE2) { x /= 2; e++; }
  const z = (x - 1) / (x + 1), z2 = z * z; let s = 1 / 23; for (let k = 21; k >= 1; k -= 2) s = s * z2 + 1 / k;
  return 2 * z * s + e * LN2;
}
// 1/n! per n da 0 a 19 (prodotti e divisioni: gli stessi bit ovunque)
const SU_FATTORIALE = (() => { const v = [1]; for (let n = 1, f = 1; n < 20; n++) { f *= n; v.push(1 / f); } return v; })();
// il coseno di un giro: cosGiro(u) = cos(2π·u), u tra 0 e 1. Il giro si divide in otto spicchi (8u, la sua parte
// intera e il resto: esatti); in ognuno l'angolo ridotto x sta tra 0 e π/4, e seno e coseno sono le loro serie fino a x¹⁸
export function cosGiro(u) {
  const t = (u - Math.floor(u)) * 8, q = Math.floor(t), f = t - q, x = (q & 1 ? 1 - f : f) * PI4, x2 = x * x, F = SU_FATTORIALE;
  if (q === 0 || q === 3 || q === 4 || q === 7) { // ± cos x
    const c = ((((((((F[18] * x2 - F[16]) * x2 + F[14]) * x2 - F[12]) * x2 + F[10]) * x2 - F[8]) * x2 + F[6]) * x2 - F[4]) * x2 + F[2]) * -x2 + 1;
    return q === 0 || q === 7 ? c : -c;
  }
  const sn = x * ((((((((F[17] * x2 - F[15]) * x2 + F[13]) * x2 - F[11]) * x2 + F[9]) * x2 - F[7]) * x2 + F[5]) * x2 - F[3]) * x2 + 1); // ± sen x
  return q === 1 || q === 6 ? sn : -sn;
}
// la campana (media 0, scarto 1) da due numeri tra 0 e 1: Box-Muller
export const campana = (a, b) => Math.sqrt(-2 * logEsatto(a < 1e-12 ? 1e-12 : a)) * cosGiro(b);

// la scelta per cumulata: l'esito i con probabilità pesi[i]/Σ pesi (una somma e un confronto: esatta ovunque)
export function sceltaDiscreta(u, pesi) { let W = 0; for (const w of pesi) W += w; let s = 0; for (let i = 0; i < pesi.length; i++) { s += pesi[i]; if (u * W < s) return i; } return pesi.length - 1; }

// un numero intero (32 bit) da un indirizzo e da un ramo
// (chi chiede uno dopo l'altro molti eventi dello stesso luogo non ne rifà la chiave: si tiene quella dell'ultimo
// contenitore visto, cioè dell'indirizzo fino all'ultima «/»)
let contenitore = '', c0 = 0, c1 = 0, c2 = 0, c3 = 0;
export function numero(chiave, ramo = 0) {
  const s = String(chiave), j = s.lastIndexOf('/');
  if (j > 0) {
    const p = s.slice(0, j); if (p !== contenitore) { contenitore = p; scendi(0, 0, 0, 0, p); c0 = X0; c1 = X1; c2 = X2; c3 = X3; }
    scendi(c0, c1, c2, c3, s, j + 1);
  } else scendi(0, 0, 0, 0, s);
  tf(0, ramo | 0, 0, 0, X0, X1, X2, X3);
  return X0 >>> 0;
}

// LE ESTRAZIONI DI UN EVENTO, UNA DOPO L'ALTRA: per chi segue una storia passo per passo (una particella: quando
// decade, dove vanno le figlie, ogni deviazione nella materia) e chiede i numeri dello stesso evento in fila. È un
// contatore, non uno stato nascosto: l'estrazione k è sempre la stessa, da chiunque e quando che sia chiesta.
function inFila(k0, k1, k2, k3, ramo) { let k = 0; return () => { tf(k++, ramo, 0, 0, k0, k1, k2, k3); return frazione(); }; }
// (sotto: la chiave, già calcolata con chiaveDi, del luogo che contiene l'indirizzo: per non rifarla a ogni evento)
export function contatore(indirizzo, ramo = 0, sotto = null) { if (sotto) scendi(sotto[0] | 0, sotto[1] | 0, sotto[2] | 0, sotto[3] | 0, String(indirizzo)); else scendi(0, 0, 0, 0, String(indirizzo)); return inFila(X0, X1, X2, X3, ramo | 0); }

// la sorgente degli eventi di un luogo (radice: il suo indirizzo). c('nome') è l'esito dell'evento
// «radice/nome», un numero tra 0 e 1; c.sotto('parte') è la sorgente di una sua parte.
// La chiave della radice si calcola una volta sola: ogni evento prosegue da lì con il proprio nome.
export function sorgente(radice, rami = null) { scendi(0, 0, 0, 0, String(radice)); return fonte(String(radice), X0, X1, X2, X3, rami); }
// chi riceve «un seme» alla vecchia maniera (un numero) o già una sorgente: in ogni caso ne esce una sorgente
export const comeSorgente = (seme, nome) => (typeof seme === 'function' && seme.radice !== undefined ? seme : sorgente(`${nome} ${seme}`));
function fonte(radice, r0, r1, r2, r3, rami) {
  let haRami = false; if (rami) for (const k in rami) { haRami = true; break; } // (quasi sempre non ce ne sono: non si compone nemmeno la stringa)
  const ramoDi = (indirizzo) => (haRami ? (rami[`${radice}/${indirizzo}`] ?? 0) | 0 : 0);
  const c = (indirizzo) => { scendi(r0, r1, r2, r3, String(indirizzo)); tf(0, ramoDi(indirizzo), 0, 0, X0, X1, X2, X3); return frazione(); };
  c.radice = radice; c.rami = rami;
  c.sotto = (nome) => { scendi(r0, r1, r2, r3, String(nome)); return fonte(`${radice}/${nome}`, X0, X1, X2, X3, rami); };
  c.intero = (indirizzo, n) => Math.min(n - 1, Math.floor(c(indirizzo) * n));
  c.tra = (indirizzo, a, b) => a + (b - a) * c(indirizzo);
  // le estrazioni dello stesso evento: c.serie('nome')(k) è la k-esima (la numero 0 è c('nome')). Per i campi (il
  // rumore di una griglia: k è la cella) e per chi ha bisogno di più numeri per un esito solo. La chiave è calcolata
  // una volta; il ramo dell'evento le cambia tutte insieme
  c.serie = (indirizzo) => { scendi(r0, r1, r2, r3, String(indirizzo)); const k0 = X0, k1 = X1, k2 = X2, k3 = X3, ramo = ramoDi(indirizzo); return (k = 0) => { tf(k, ramo, 0, 0, k0, k1, k2, k3); return frazione(); }; };
  // le stesse, chieste in fila (vedi contatore)
  c.fila = (indirizzo) => { scendi(r0, r1, r2, r3, String(indirizzo)); return inFila(X0, X1, X2, X3, ramoDi(indirizzo)); };
  // un esito con distribuzione a campana (media 0, scarto 1): le prime due estrazioni dell'evento
  c.normale = (indirizzo) => { scendi(r0, r1, r2, r3, String(indirizzo)); const k0 = X0, k1 = X1, k2 = X2, k3 = X3, ramo = ramoDi(indirizzo); tf(0, ramo, 0, 0, k0, k1, k2, k3); const a = frazione(); tf(1, ramo, 0, 0, k0, k1, k2, k3); return campana(a, frazione()); };
  // le leggi discrete che i consumatori applicavano da sé al tiro (c(x) < p; una scelta per cumulata): dichiarate qui,
  // il registro sa quale legge ha consumato il tiro e la misura (misura.js) ne pesa l'esito. Stesso tiro di c(indirizzo).
  // (Il nome «sotto» è già della sorgente di una parte: la Bernoulli si chiama bernoulli.)
  c.bernoulli = (indirizzo, p) => c(indirizzo) < p;
  c.discreta = (indirizzo, pesi) => sceltaDiscreta(c(indirizzo), pesi);
  // per i moduli che chiedono ancora un «seme»: un intero legato a questo indirizzo e a questo ramo
  c.seme = (indirizzo) => { scendi(r0, r1, r2, r3, String(indirizzo)); tf(0, ramoDi(indirizzo), 0, 0, X0, X1, X2, X3); return (X0 >>> 0) % 2147483646 + 1; };
  return c;
}

// LA STESSA SORGENTE, CHE ANNOTA CIÒ CHE LEGGE: in «registro» (una Map) finisce ogni evento chiesto, indirizzo → esito
// (per le estrazioni dopo la prima: «indirizzo#k»). Dice da quali eventi dipende un calcolo, e serve alle prove di
// «un ramo cambia una cosa sola»: in due mondi che differiscono per un evento, ogni altro evento letto ha lo stesso esito.
// Con «leggi» (una Map, facoltativa) annota anche QUALE legge ha consumato il tiro: indirizzo → { legge, parametri, tiri,
// esito }, con legge tra uniforme (c nudo, serie, fila), intero, tra, bernoulli, discreta, normale, seme. È ciò che serve
// alla misura dei rami (misura.js: massa, storia, rapporto). Il registro dei tiri resta quello di prima, identico.
export function conRegistro(c, registro, leggi = null) {
  const nota = (indirizzo, v) => { registro.set(`${c.radice}/${indirizzo}`, v); return v; };
  const legge = leggi ? (indirizzo, nome, parametri, tiri, esito) => { leggi.set(`${c.radice}/${indirizzo}`, { legge: nome, parametri, tiri, esito }); return esito; } : (i, n, p, t, esito) => esito;
  const d = (indirizzo) => { const u = nota(indirizzo, c(indirizzo)); return legge(indirizzo, 'uniforme', {}, [u], u); };
  d.radice = c.radice; d.rami = c.rami;
  d.sotto = (nome) => conRegistro(c.sotto(nome), registro, leggi);
  d.intero = (indirizzo, n) => { const u = nota(indirizzo, c(indirizzo)); return legge(indirizzo, 'intero', { n }, [u], Math.min(n - 1, Math.floor(u * n))); };
  d.tra = (indirizzo, a, b) => { const u = nota(indirizzo, c(indirizzo)); return legge(indirizzo, 'tra', { a, b }, [u], a + (b - a) * u); };
  d.bernoulli = (indirizzo, p) => { const u = nota(indirizzo, c(indirizzo)); return legge(indirizzo, 'bernoulli', { p }, [u], u < p); };
  d.discreta = (indirizzo, pesi) => { const u = nota(indirizzo, c(indirizzo)); return legge(indirizzo, 'discreta', { pesi: [...pesi] }, [u], sceltaDiscreta(u, pesi)); };
  d.serie = (indirizzo) => { const s = c.serie(indirizzo); return (k = 0) => { const v = k ? `${indirizzo}#${k}` : indirizzo, u = nota(v, s(k)); return legge(v, 'uniforme', {}, [u], u); }; };
  d.fila = (indirizzo) => { const s = d.serie(indirizzo); let k = 0; return () => s(k++); };
  d.normale = (indirizzo) => { const s = c.serie(indirizzo), a = nota(indirizzo, s(0)), b = nota(`${indirizzo}#1`, s(1)); return legge(indirizzo, 'normale', {}, [a, b], campana(a, b)); };
  d.seme = (indirizzo) => { const u = nota(indirizzo, c(indirizzo)); return legge(indirizzo, 'seme', {}, [u], c.seme(indirizzo)); };
  return d;
}
// l'esito di un evento del registro («indirizzo» o «indirizzo#k»), chiesto da capo a una sorgente
export const rileggi = (voce, rami = null) => { const i = voce.lastIndexOf('#'), k = i < 0 ? 0 : Number(voce.slice(i + 1)), dove = i < 0 ? voce : voce.slice(0, i), j = dove.lastIndexOf('/'); return sorgente(dove.slice(0, j), rami).serie(dove.slice(j + 1))(k); };

// UN RETICOLO DI NUMERI, IN COORDINATE ASSOLUTE: per i campi su una griglia globale (eredita.js). reticolo(indirizzo)
// dà la funzione (i, j, k) → campana (media 0, scarto 1) del nodo (i, j, k): una chiamata a Threefry per nodo, con il
// contatore (i, ramo, j, k) e i due numeri della campana presi dalle due metà dei 128 bit usciti. Il nodo non dipende da
// chi lo chiede né dalla tessera che lo contiene: due tessere vicine leggono gli stessi numeri sul bordo comune.
// (k entro 2²⁸: il byte più alto del contatore resta sotto 0xF0, quello dei blocchi di nome; i e j: interi a 32 bit)
const frazione2 = () => ((X2 >>> 0) * 2097152 + (X3 >>> 11)) * DUE53;
export function reticolo(indirizzo, ramo = 0) {
  scendi(0, 0, 0, 0, String(indirizzo)); const k0 = X0, k1 = X1, k2 = X2, k3 = X3, r = ramo | 0;
  return (i, j = 0, k = 0) => { tf(i | 0, r, j | 0, k & 0x0FFFFFFF, k0, k1, k2, k3); const a = frazione(); return campana(a, frazione2()); };
}
