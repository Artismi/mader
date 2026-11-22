// caso.js — la fonte del caso con indirizzo.
//
// Ogni cosa che «va in un modo o in un altro» (le vibrazioni di una cella, un atomo che manca, il pattern del 🎲) ha un
// INDIRIZZO, un cammino di nomi separati da «/»: «pattern 7/vibra/3,-1,0/atomo 2». Lo stesso indirizzo dà sempre lo
// stesso esito, su qualunque macchina, e in qualunque ordine lo si chieda.
//
// È una copia minima dell'idea di src/camera/eventi.js del ramo «stateyour» (qui non si importa nulla da lì):
//   · la fonte è Threefry-4x32 a 20 giri (Salmon, Moraes, Dror e Shaw 2011), un generatore a contatore: una funzione
//     pura (contatore 128 bit, chiave 128 bit) → 128 bit, in aritmetica intera a 32 bit, esatta in JavaScript;
//   · la chiave di «a/b» è Threefry(nome «b» ; chiave di «a»): il nome entra come contatore a blocchi di 16 byte, 15 di
//     testo in UTF-8 e nel byte più alto 0xF0 + quanti byte porta il blocco (0xFF: il nome continua). La radice è la
//     chiave (0, 0, 0, 0). È la stessa costruzione di eventi.js, quindi gli stessi indirizzi danno le stesse chiavi;
//   · l'esito k di un evento è Threefry(contatore (k, 0, 0, 0) ; chiave dell'evento); il numero tra 0 e 1 usa 53 bit;
//   · dai bit all'esito solo operazioni esatte in IEEE 754 (somme, prodotti, divisioni, radici): il logaritmo e il
//     coseno della campana sono scritti qui con polinomi a ordine fisso, perché Math.log e Math.cos non sono fissati
//     al bit dallo standard.

const ROT = [[10, 26], [11, 21], [13, 27], [23, 5], [6, 20], [17, 11], [25, 10], [18, 20]];

// Threefry-4x32: c e k sono quattro interi a 32 bit; esce un vettore di quattro interi senza segno
export function threefry4x32(c, k, giri = 20) {
  const ks = [k[0] | 0, k[1] | 0, k[2] | 0, k[3] | 0, (0x1BD11BDA ^ k[0] ^ k[1] ^ k[2] ^ k[3]) | 0];
  const x = [(c[0] + ks[0]) | 0, (c[1] + ks[1]) | 0, (c[2] + ks[2]) | 0, (c[3] + ks[3]) | 0];
  const giro = (i, j, s) => { x[i] = (x[i] + x[j]) | 0; x[j] = ((x[j] << s) | (x[j] >>> (32 - s))) ^ x[i]; };
  for (let r = 0; r < giri; r++) {
    const [s0, s1] = ROT[r & 7];
    if (r & 1) { giro(0, 3, s0); giro(2, 1, s1); } else { giro(0, 1, s0); giro(2, 3, s1); }
    if ((r & 3) === 3) { const j = (r + 1) >> 2; for (let i = 0; i < 4; i++) x[i] = (x[i] + ks[(j + i) % 5] + (i === 3 ? j : 0)) | 0; }
  }
  return [x[0] >>> 0, x[1] >>> 0, x[2] >>> 0, x[3] >>> 0];
}

// prosegue la chiave k lungo il cammino s (nomi separati da «/»)
function scendi(k, s) {
  let blocco = [0, 0, 0, 0], n = 0;
  const metti = (byte) => {
    blocco[n >> 2] |= byte << ((n & 3) << 3);
    if (++n === 15) { blocco[3] |= 0xFF << 24; k = threefry4x32(blocco, k); blocco = [0, 0, 0, 0]; n = 0; }
  };
  for (let i = 0; i <= s.length; i++) {
    const ch = i < s.length ? s.charCodeAt(i) : 47;
    if (ch === 47) { blocco[3] |= (0xF0 | n) << 24; k = threefry4x32(blocco, k); blocco = [0, 0, 0, 0]; n = 0; continue; }
    if (ch < 0x80) metti(ch);
    else if (ch < 0x800) { metti(0xC0 | (ch >> 6)); metti(0x80 | (ch & 63)); }
    else { metti(0xE0 | (ch >> 12)); metti(0x80 | ((ch >> 6) & 63)); metti(0x80 | (ch & 63)); }
  }
  return k;
}

export const chiaveDi = (indirizzo) => scendi([0, 0, 0, 0], String(indirizzo));

const DUE53 = 1 / 9007199254740992;
const frazione = (x) => (x[0] * 2097152 + (x[1] >>> 11)) * DUE53;

// ---------- la campana con sole operazioni esatte
const LN2 = 0.6931471805599453, RADICE2 = 1.4142135623730951, PI4 = 0.7853981633974483;
// ln x: x = m·2^e con m tra 1/√2 e √2, poi ln m = 2·atanh(z), z = (m − 1)/(m + 1), serie fino a z²³
export function logEsatto(x) {
  if (!(x > 0)) return x === 0 ? -Infinity : NaN;
  let e = 0; while (x * RADICE2 < 1) { x *= 2; e--; } while (x >= RADICE2) { x /= 2; e++; }
  const z = (x - 1) / (x + 1), z2 = z * z; let s = 1 / 23; for (let k = 21; k >= 1; k -= 2) s = s * z2 + 1 / k;
  return 2 * z * s + e * LN2;
}
const F = (() => { const v = [1]; for (let n = 1, f = 1; n < 20; n++) { f *= n; v.push(1 / f); } return v; })();
// seno e coseno dell'angolo ridotto x in [0, π/4], serie fino a x¹⁸
const cosR = (x2) => ((((((((F[18] * x2 - F[16]) * x2 + F[14]) * x2 - F[12]) * x2 + F[10]) * x2 - F[8]) * x2 + F[6]) * x2 - F[4]) * x2 + F[2]) * -x2 + 1;
const senR = (x, x2) => x * ((((((((F[17] * x2 - F[15]) * x2 + F[13]) * x2 - F[11]) * x2 + F[9]) * x2 - F[7]) * x2 + F[5]) * x2 - F[3]) * x2 + 1);
// cos(2π·u) e sin(2π·u): il giro in otto spicchi, in ognuno l'angolo ridotto sta tra 0 e π/4
export function cosGiro(u) {
  const t = (u - Math.floor(u)) * 8, q = Math.floor(t), f = t - q, x = (q & 1 ? 1 - f : f) * PI4, x2 = x * x;
  if (q === 0 || q === 3 || q === 4 || q === 7) { const c = cosR(x2); return q === 0 || q === 7 ? c : -c; }
  const s = senR(x, x2); return q === 1 || q === 6 ? s : -s;
}
export const senGiro = (u) => cosGiro(u - 0.25);
export const campana = (a, b) => Math.sqrt(-2 * logEsatto(a < 1e-300 ? 1e-300 : a)) * cosGiro(b);

// ---------- la sorgente di un luogo
// c('nome') è l'esito di «radice/nome», tra 0 (compreso) e 1 (escluso); c.sotto('parte') è la sorgente di una parte;
// c.serie('nome')(k) è l'estrazione k dello stesso evento; c.normale('nome') una campana (media 0, scarto 1).
export function sorgente(radice) {
  const kr = chiaveDi(radice);
  const esito = (nome, k = 0) => frazione(threefry4x32([k, 0, 0, 0], scendi(kr, String(nome))));
  const c = (nome) => esito(nome, 0);
  c.radice = String(radice);
  c.sotto = (nome) => sorgente(`${radice}/${nome}`);
  c.serie = (nome) => { const k = scendi(kr, String(nome)); return (i = 0) => frazione(threefry4x32([i, 0, 0, 0], k)); };
  c.tra = (nome, a, b) => a + (b - a) * c(nome);
  c.intero = (nome, n) => Math.min(n - 1, Math.floor(c(nome) * n));
  c.normale = (nome) => { const s = c.serie(nome); return campana(s(0), s(1)); };
  return c;
}
