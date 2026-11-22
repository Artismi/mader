// campo_pigro.js — IL CAMPO DEL COSMO PIGRO ANCHE NELLO SPAZIO: gaussiano, con lo spettro vero, definito a ogni scala e in
// ogni luogo da eventi con indirizzo, calcolato solo dove si guarda, in un dominio senza bordo, a costo fisso.
//
// PERCHÉ. Il campo di cosmo3d.js è una somma di onde piane su un toro di 1,2 Gpc: (1) il toro è più piccolo della sfera
// dell'ultima diffusione (26 054 coppie di cerchi uguali nel cielo: test_ragnatela), (2) un'onda piana non ha un posto:
// per dimezzare la scala servono otto volte le onde, dappertutto. Questo modulo è ADDITIVO: non cambia cosmo3d.js né i
// mondi che esistono (che cosa cambierebbe a passarci è scritto in fondo: lo decide l'utente).
//
// COME LO FANNO GLI ALTRI (letti ora sugli estratti di arXiv [V]; i dettagli interni sono ricordati [R]):
//   · Panphasia (Jenkins 2013, MNRAS 434, 2094; arXiv:1306.5968 [V]): «an extremely large discrete realisation of a
//     Gaussian white noise field that has a hierarchical structure», su un albero a ottanti, 50 livelli (10¹⁵ in scala);
//     le fasi si condividono «specifying a spatial location within the realisation»: è la nostra regola 1. [R: in ogni
//     ottante il rumore è sviluppato su polinomi di Legendre, e raffinare aggiunge solo i coefficienti nuovi.]
//   · MUSIC (Hahn & Abel 2011, MNRAS 415, 2101; arXiv:1103.6031 [V]): «adaptive convolution of Gaussian white noise with a
//     real space transfer function kernel», livello per livello; errori 10⁻⁴ localizzati ai bordi tra livelli.
// CHE COSA SI FA QUI (la via più semplice con errore dichiarato): le due idee insieme, ma con una base del rumore scelta
// perché il conto in un punto sia LOCALE ed ESATTO nello spettro:
//   δ(x) = Σ_livelli j Σ_celle c  w_{j,c} · K_j(|x − x_{j,c}|)
//   · il livello j è un'OTTAVA di numeri d'onda attorno a k_j = π/(2h_j), con celle di lato h_j = 2²⁰ Mpc / 2^j messe su
//     un reticolo assoluto (cella (ix, iy, iz): centro (i + ½)·h_j; gli indici sono interi qualunque: non c'è bordo);
//   · w_{j,c} è un EVENTO: una campana (media 0, scarto 1) all'indirizzo «radice/campo/livello j/cella ix,iy,iz»
//     (eventi.js: la fonte unica; un ramo cambia una cella sola, e con lei il campo entro il raggio del nucleo);
//   · K_j ha trasformata h_j^(3/2)·√P(k)·B_j(k): P(k) è lo spettro di galassie.js (U.potenza: una fonte) e B_j una finestra
//     liscia sull'ottava, B_j = cos(π/2·|log₂(k/k_j)|) per k_j/2 < k < 2k_j, zero fuori: Σ_j B_j² = 1 a ogni k.
// PERCHÉ È ESATTO: (1) un rumore bianco su reticolo ha spettro piatto 1/h³ a ogni k; (2) K̂_j è nullo oltre 2k_j = π/h_j,
// cioè dentro il cubo di Nyquist del suo reticolo: il campo del livello è stazionario e isotropo ESATTAMENTE (teorema del
// campionamento), con spettro P·B_j²; (3) i livelli sono indipendenti e Σ B_j² = 1: la somma ha spettro P. Un campo
// gaussiano è definito dal suo spettro: è lo stesso campo (in legge) delle onde di cosmo3d, senza toro.
// REGOLA 4, per costruzione: guardare più fine = aggiungere il livello j+1; i livelli di prima non cambiano di un bit, e
// ciò che si aggiunge non ha potenza sotto k_{j+1}/2: mediato su scale più grandi fa zero (la prova lo misura).
// L'ERRORE DICHIARATO: K_j ha code lunghe (la finestra ha uno spigolo): lo si TRONCA a `raggio` celle (6: 905 celle per
// livello) con un raccordo a coseno sull'ultimo quinto, e lo si rinormalizza perché la varianza del livello sia esatta.
// La parte di varianza del nucleo fuori dal raggio è 1–3·10⁻³ per δ e marea (raggio 6; meno con raggi più grandi, come
// R⁻⁴), ~10⁻² per i nuclei che pesano le onde lunghe (potenziale, cielo): lo spettro è giusto nella media di ogni
// ottava e storto localmente in k di ~√ε; potenziale, spostamento e marea sono derivate l'uno dell'altro a meno di
// quello (misurato: −∇·Ψ e δ differiscono di 0,06 scarti, ∂Ψ_x/∂y e −T_xy del 5%). Le tabelle radiali sono
// interpolate linearmente (96 punti per cella: 10⁻⁴). Sotto k = 1,5·10⁻⁶ /Mpc (livello 0) non c'è niente.
// ALTRE GRANDEZZE, stesso rumore: il potenziale φ (∇²φ = δ), la marea T_ij = ∂i∂jφ (traccia δ), lo spostamento Ψ = −∇φ
// (Zel'dovich; velocità H·f·Ψ) hanno ciascuno il suo nucleo radiale per livello; così i filtri isotropi (gaussiana, sfera
// piena, passa-banda) e il cielo del fondo (i pesi W0, W1 di ragnatela.js).
// I VINCOLI (Hoffman & Ribak 1991, nella forma originale): δ_c(x) = δ(x) + Σ_i w_i·ξ_i(|x − x_i|), w = C⁻¹(c − δ(x_i)), con ξ e
// C dalla funzione di correlazione dello stesso spettro (tabelle radiali). Niente ampiezze da correggere: il campo
// libero resta com'è, la correzione si somma dove si guarda e si spegne con ξ; costa N valutazioni del campo libero, una
// matrice N×N, e poi N letture di tabella a punto, quale che sia il dominio.
// COSTI (misurati in test/test_campo_pigro.mjs): un punto, δ con marea, spostamento e potenziale: 0,05–0,07 ms a
// livello a caldo, ~0,6 ms a freddo (le celle si estraggono una volta: ~0,5 µs l'una); 10–11 livelli (6 ms a freddo)
// per arrivare alle onde di 50 Mpc dalle scale dell'orizzonte, 17 per σ₈; una direzione di cielo fino a ℓ ~ 20: 0,5 ms;
// 24 vincoli: 70 ms più 200 ms di tabelle la prima volta. Il costo non dipende da dove si è né da quanto è grande il dominio. In memoria: blocchi di 8³ celle (4 kB), al più `memoria` (1500) blocchi per livello: 6 MB a livello.
//
// PARAMETRI DI COMODO (numerici, dichiarati): il raggio di troncamento (6 celle), il raccordo sull'ultimo quinto, 96
// punti di tabella per cella, 480 punti nell'integrale in k, blocchi di 8³ celle, il livello più grosso usato di suo
// (quello sotto cui manca meno di 10⁻⁴ della varianza dello spostamento).
//
// IL CAMPO DEI COSMI (FATTO, per decisione dell'utente): cosmo3d.js usa questo campo per tutta la banda, senza toro. Le galassie
//   restano quelle della carta (posto, altezza del picco, quindi alone e tutto ciò che sta sotto: niente mondo cambia
//   identità); cambiano ciò che il campo dice attorno a loro: velocità e assi. Misurato su 189 galassie dei cosmi 1–3
//   (prima/dopo): 186 assi cambiano di più di 10° (133 di più di 45°, mediana 62°); lo scarto delle velocità resta lo stesso
//   (469 → 470 km/s) ma la differenza tra prima e dopo ha scarto 659 km/s: sono altre. Gli eventi «…/campo/onda x,y,z» non
//   sono più la fonte del cosmo (restano per i campi di onde chiesti apposta); un ramo si fa ora su una cella.
// I VINCOLI NELLE CELLE (vincola): il campo è lineare nelle celle (δ = G·w, w indipendenti N(0,1)); la realizzazione vincolata
//   di Hoffman & Ribak è w' = w + Gᵀ·C⁻¹·(c − G·w), C = G·Gᵀ: esatta per questo campo e locale (cambiano solo le celle che un
//   vincolo tocca). Una grandezza è qualunque forma lineare: densità lisciata, pendenza, marea, un punto del cielo del fondo.
// LE GRIGLIE (grigliaFFT, alla MUSIC: Hahn & Abel 2011): convoluzione per regione con la trasformata, esatta per i tre livelli
//   più fini (a meno degli arrotondamenti, 10⁻¹⁶), interpolata (Catmull–Rom, nodi a un quarto di cella) per i più grossi:
//   ~5·10⁻⁵ dello scarto. Costa ~2,5 s per 32³ solo densità, ~4 s con la marea, ~4 s per 64³ (il lato della FFT è 128 per il
//   margine del nucleo più largo, 6·4 celle): non è ancora il secondo della scena; il passo successivo sarebbe tenere le
//   trasformate dei nuclei (sono le stesse per ogni regione).
// GLI ALONI UNO PER UNO: aloniIn() di ragnatela.js, su questo campo, con l'esclusione che dipende solo dal campo.
import { COSMO, MPC } from './leggi.js';
import { sorgente, campana } from './eventi.js';
import { COSMOLOGIA as U } from './galassie.js';
import { probabilitaChi2, RANGO } from './bolle.js';
import { ricombinazione, dentro as RAGNATELA } from './ragnatela.js';

const PI2 = 2 * Math.PI, LATO0 = 2 ** 20; // (MPC: leggi.js) Mpc: il lato delle celle del livello 0
export const PIGRO = { lato0Mpc: LATO0, raggio: 6, raccordo: 0.8, puntiPerCella: 96, puntiK: 480, blocco: 8, memoria: 1500, livelloMassimo: 34 };
const f0Crescita = Math.log(U.D(1.01) / U.D(0.99)) / Math.log(1.01 / 0.99); // f = dlnD/dlna oggi (come cosmo3d.js)
export const latoDi = (j) => LATO0 / 2 ** j; // Mpc
export const kDi = (j) => Math.PI / (2 * latoDi(j)); // 1/Mpc: il centro dell'ottava
// il livello più fine la cui ottava contiene ancora la lunghezza d'onda λ (m): onde tra 2h e 8h
export const livelloPer = (lambdaM) => Math.max(0, Math.floor(Math.log2((4 * LATO0) / (lambdaM / MPC))));
// la finestra del livello j (in ampiezza) e la parte di potenza che i livelli fino a J tengono a un dato k
export const finestraLivello = (j, k) => { const u = Math.abs(Math.log2(k / kDi(j))); return u >= 1 ? 0 : Math.cos((Math.PI / 2) * u); };
export const finoA = (J, k) => { let s = 0; for (let j = Math.max(0, Math.floor(Math.log2(k / kDi(0)))); j <= Math.min(J, Math.ceil(Math.log2(k / kDi(0))) + 1); j++) s += finestraLivello(j, k) ** 2; return s; };
const P3 = (k) => (2 * Math.PI ** 2 * U.potenza(k)) / k ** 3; // P(k) in Mpc³ da Δ²(k) di galassie.js

// I FILTRI ISOTROPI: { chiave, F(k in 1/Mpc) }. (R in metri.)
export const FILTRI = {
  nessuno: { chiave: '', F: null },
  // (kTop: il numero d'onda oltre cui il filtro non lascia più niente che conti: decide il livello più fine da sommare)
  gaussiana: (R) => { const r = R / MPC; return { chiave: `g${r}`, F: (k) => Math.exp(-0.5 * k * k * r * r), scala: r, kTop: 5 / r }; },
  sfera: (R) => { const r = R / MPC; return { chiave: `s${r}`, F: (k) => { const x = k * r; return x < 1e-2 ? 1 - (x * x) / 10 : (3 * (Math.sin(x) - x * Math.cos(x))) / x ** 3; }, scala: r, kTop: 25 / r }; },
  // un passa-banda attorno a kc (1/Mpc): F² = e^(−4·ln²(k/kc)), largo circa un'ottava; per misurare lo spettro
  banda: (kc) => ({ chiave: `b${kc}`, F: (k) => { const u = Math.log(k / kc); return Math.exp(-2 * u * u); }, scala: 1 / kc, kTop: 11 * kc }),
};
// j₀, j₁, j₂ sferiche divise per x⁰, x¹, x⁰: P0 = j0(x), P1 = j1(x)/x, P2 = j2(x)
const bess = (x, out) => { if (x < 1e-3) { out[0] = 1 - (x * x) / 6; out[1] = 1 / 3 - (x * x) / 30; out[2] = (x * x) / 15; return; } const s = Math.sin(x), c = Math.cos(x), j0 = s / x, j1 = (j0 - c) / x; out[0] = j0; out[1] = j1 / x; out[2] = (3 * j1) / x - j0; };
// le tabelle radiali di un'ampiezza a(k) data su una griglia di k (con i pesi d'integrazione già dentro):
//   f  = (1/2π²)∫k²a·j0(kr)          (uno scalare con quel filtro: la densità)
//   g  = −(1/2π²)∫a·j0(kr)           (il potenziale, ∇²g = f)
//   A1 = g'/r = (1/2π²)∫k²a·j1(kr)/(kr),   A2 = g'' − g'/r = −(1/2π²)∫k²a·j2(kr)     (marea: δ_ij·A1 + r̂_i r̂_j·A2; f = 3A1 + A2)
function tabelleRadiali(ks, amp, rs) {
  const n = rs.length, f = new Float64Array(n), g = new Float64Array(n), A1 = new Float64Array(n), A2 = new Float64Array(n), b = [0, 0, 0], c = 1 / (2 * Math.PI ** 2);
  for (let i = 0; i < n; i++) { let sf = 0, sg = 0, s1 = 0, s2 = 0; const r = rs[i]; for (let q = 0; q < ks.length; q++) { const k = ks[q], a = amp[q]; if (a === 0) continue; bess(k * r, b); const k2a = k * k * a; sf += k2a * b[0]; sg -= a * b[0]; s1 += k2a * b[1]; s2 -= k2a * b[2]; } f[i] = c * sf; g[i] = c * sg; A1[i] = c * s1; A2[i] = c * s2; }
  return { f, g, A1, A2 };
}

// =====================================================================================================
// IL CAMPO. radice: l'indirizzo («cosmo 7», o qualunque stringa); opz: { rami, raggio (celle), memoria (blocchi per
// livello), finestra: { chiave, F(k) } una finestra in più sullo spettro (in ampiezza), lato0 (Mpc: il lato delle celle del
// livello 0), periodo (Mpc: se dato le celle si richiudono, e il campo è periodico: ogni livello usato deve starci un numero
// intero di volte), da (un altro campo dello stesso indirizzo: se ne condividono le celle e i nuclei), correzione (le
// celle cambiate da vincola(): Map livello → Map blocco → Float64Array) }
// =====================================================================================================
// LA FFT 3D complessa sul posto (potenze di 2), con le tavole per N (per grigliaFFT)
const tavole = new Map();
function tavola(N) { let T = tavole.get(N); if (T) return T; const rev = new Int32Array(N); for (let i = 0, j = 0; i < N; i++) { rev[i] = j; let b = N >> 1; while (j & b) { j ^= b; b >>= 1; } j |= b; } const c = new Float64Array(N / 2), s = new Float64Array(N / 2); for (let k = 0; k < N / 2; k++) { c[k] = Math.cos((PI2 * k) / N); s[k] = Math.sin((PI2 * k) / N); } T = { rev, c, s, br: new Float64Array(N), bi: new Float64Array(N) }; tavole.set(N, T); return T; }
function rigaFFT(re, im, o, passo, N, T, segno) { const { rev, c, s, br, bi } = T; for (let i = 0; i < N; i++) { const q = o + rev[i] * passo; br[i] = re[q]; bi[i] = im[q]; }
  for (let len = 2; len <= N; len <<= 1) { const h = len >> 1, st = N / len; for (let i = 0; i < N; i += len) for (let k = 0; k < h; k++) { const wr = c[k * st], wi = segno * s[k * st], a = i + k, b = a + h, xr = br[b] * wr - bi[b] * wi, xi = br[b] * wi + bi[b] * wr; br[b] = br[a] - xr; bi[b] = bi[a] - xi; br[a] += xr; bi[a] += xi; } }
  for (let i = 0; i < N; i++) { const q = o + i * passo; re[q] = br[i]; im[q] = bi[i]; } }
export function fft3(re, im, N, inversa = false) { const T = tavola(N), sg = inversa ? 1 : -1, N2 = N * N;
  for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) rigaFFT(re, im, z * N2 + y * N, 1, N, T, sg);
  for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) rigaFFT(re, im, z * N2 + x, N, N, T, sg);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) rigaFFT(re, im, y * N + x, N2, N, T, sg);
  if (inversa) { const f = 1 / (N * N2); for (let i = 0; i < re.length; i++) { re[i] *= f; im[i] *= f; } } }
// Catmull–Rom: i quattro pesi per t in [0, 1)
const pesiCR = (t, w) => { const t2 = t * t, t3 = t2 * t; w[0] = 0.5 * (-t3 + 2 * t2 - t); w[1] = 0.5 * (3 * t3 - 5 * t2 + 2); w[2] = 0.5 * (-3 * t3 + 4 * t2 + t); w[3] = 0.5 * (t3 - t2); return w; };

export function campoPigro(radice, { rami = null, raggio = PIGRO.raggio, memoria = PIGRO.memoria, finestra = null, lato0 = LATO0, periodo = null, da = null, correzione = null } = {}) {
  const latoDi = (j) => lato0 / 2 ** j, kDi = (j) => Math.PI / (2 * latoDi(j)), finestraLivello = (j, k) => { const u = Math.abs(Math.log2(k / kDi(j))); return u >= 1 ? 0 : Math.cos((Math.PI / 2) * u); };
  const I = da ? da._interni : { livelli: new Map(), nuclei: new Map(), utili: new Map(), contatori: { celle: 0, blocchi: 0 } }, { livelli, nuclei, contatori } = I;
  const NB = PIGRO.blocco, NB3 = NB ** 3;
  const lato = Math.ceil(raggio) * 2 + 2, NG = lato ** 3, gw = new Float64Array(NG), gx = new Float64Array(NG), gy = new Float64Array(NG), gz = new Float64Array(NG), gr = new Float64Array(NG), gix = new Float64Array(NG), giy = new Float64Array(NG), giz = new Float64Array(NG);
  // ---- le celle di un livello: eventi, tenuti a blocchi (si possono buttare: si rifanno identici)
  const livello = (j) => { let Lv = livelli.get(j); if (!Lv) { const h = latoDi(j), M = periodo ? Math.round(periodo / h) : 0; if (periodo && (M < 1 || Math.abs(M * h - periodo) > 1e-9 * periodo)) throw new Error(`campoPigro: il livello ${j} (celle di ${h} Mpc) non sta un numero intero di volte nel periodo`); Lv = { j, h, M, fonte: sorgente(`${radice}/campo/livello ${j}`, rami), blocchi: new Map() }; livelli.set(j, Lv); } return Lv; };
  const blocco = (Lv, k) => { let B = Lv.blocchi.get(k); if (!B) { if (Lv.blocchi.size >= memoria) Lv.blocchi.delete(Lv.blocchi.keys().next().value); B = new Float64Array(NB3).fill(NaN); Lv.blocchi.set(k, B); contatori.blocchi++; } return B; };
  const giro = (Lv, i) => (Lv.M ? ((i % Lv.M) + Lv.M) % Lv.M : i);
  // il valore di una cella (indici già richiusi): l'evento «…/livello j/cella ix,iy,iz» più la correzione, se c'è
  const valore = (Lv, wx, wy, wz) => { const bx = Math.floor(wx / NB), by = Math.floor(wy / NB), bz = Math.floor(wz / NB), k = `${bx},${by},${bz}`, B = blocco(Lv, k), o = ((wz - bz * NB) * NB + wy - by * NB) * NB + wx - bx * NB; let w = B[o]; if (w !== w) { const s = Lv.fonte.serie(`cella ${wx},${wy},${wz}`); w = B[o] = campana(s(0), s(1)); contatori.celle++; } const S = correzione?.get(Lv.j)?.get(k); return S ? w + S[o] : w; };
  const cella = (j, ix, iy, iz) => { const Lv = livello(j); return valore(Lv, giro(Lv, ix), giro(Lv, iy), giro(Lv, iz)); };
  // raccoglie le celle entro il raggio dal punto x (Mpc): valori, distacchi (Mpc), indici (richiusi); → quante
  const raccogli = (Lv, x) => { const h = Lv.h, R = raggio * h, R2 = R * R, lo = [0, 0, 0], hi = [0, 0, 0], M = Lv.M, Sj = correzione?.get(Lv.j); let n = 0;
    for (let d = 0; d < 3; d++) { lo[d] = Math.ceil((x[d] - R) / h - 0.5); hi[d] = Math.floor((x[d] + R) / h - 0.5); }
    for (let iz = lo[2]; iz <= hi[2]; iz++) { const dz = x[2] - (iz + 0.5) * h, wz = M ? ((iz % M) + M) % M : iz, bz = Math.floor(wz / NB), oz = (wz - bz * NB) * NB * NB;
      for (let iy = lo[1]; iy <= hi[1]; iy++) { const dy = x[1] - (iy + 0.5) * h, q = dz * dz + dy * dy; if (q >= R2) continue; const wy = M ? ((iy % M) + M) % M : iy, by = Math.floor(wy / NB), oy = oz + (wy - by * NB) * NB; let bx = NaN, B = null, S = null;
        for (let ix = lo[0]; ix <= hi[0]; ix++) { const dx = x[0] - (ix + 0.5) * h, r2 = q + dx * dx; if (r2 >= R2) continue; const wx = M ? ((ix % M) + M) % M : ix, b = Math.floor(wx / NB);
          if (b !== bx) { bx = b; const k = `${bx},${by},${bz}`; B = blocco(Lv, k); S = Sj ? Sj.get(k) ?? null : null; }
          const o = oy + wx - bx * NB; let w = B[o]; if (w !== w) { const s = Lv.fonte.serie(`cella ${wx},${wy},${wz}`); w = B[o] = campana(s(0), s(1)); contatori.celle++; } if (S) w += S[o];
          gw[n] = w; gx[n] = dx; gy[n] = dy; gz[n] = dz; gr[n] = Math.sqrt(r2); gix[n] = wx; giy[n] = wy; giz[n] = wz; n++; } } }
    return n; };
  // ---- i nuclei di un livello per un filtro: tabelle radiali troncate, raccordate e rinormalizzate
  const nucleo = (j, filtro = FILTRI.nessuno) => {
    const chiave = `${j}|${filtro.chiave}`; let N = nuclei.get(chiave); if (N) return N;
    const h = latoDi(j), kj = kDi(j), nk = PIGRO.puntiK, k0 = kj / 2, dk = (1.5 * kj) / nk, ks = new Float64Array(nk + 1), amp = new Float64Array(nk + 1); let varianza = 0;
    for (let i = 0; i <= nk; i++) { const k = k0 + i * dk, w = ((i === 0 || i === nk ? 1 : i % 2 ? 4 : 2) * dk) / 3, a = Math.sqrt(P3(k)) * finestraLivello(j, k) * (filtro.F ? filtro.F(k) : 1) * (finestra ? finestra.F(k) : 1); ks[i] = k; amp[i] = h ** 1.5 * a * w; varianza += (k * k * a * a * w) / (2 * Math.PI ** 2); }
    if (!(varianza > 0)) { N = { j, h, varianza: 0, vuoto: true }; nuclei.set(chiave, N); return N; }
    const pc = PIGRO.puntiPerCella, nr = Math.ceil(raggio * pc) + 2, rs = new Float64Array(nr), dr = h / pc; for (let i = 0; i < nr; i++) rs[i] = i * dr;
    // (la coda: la parte di ∫K²d³x fuori dal raggio; il totale è la varianza, per Parseval)
    const T = tabelleRadiali(ks, amp, rs), R = raggio * h, Rr = PIGRO.raccordo * R; let dentro = 0, tenuta = 0;
    for (let i = 0; i < nr; i++) { const r = rs[i], t = r <= Rr ? 1 : r >= R ? 0 : Math.cos((Math.PI / 2) * ((r - Rr) / (R - Rr))) ** 2; dentro += r * r * T.f[i] ** 2 * dr; T.f[i] *= t; T.g[i] *= t; T.A1[i] *= t; T.A2[i] *= t; tenuta += r * r * T.f[i] ** 2 * dr; }
    // la varianza del livello è (1/h³)∫K²d³x: si rinormalizza perché, troncato, la dia esatta
    const norma = Math.sqrt(varianza / ((4 * Math.PI * tenuta) / h ** 3)), coda = 1 - (4 * Math.PI * dentro) / h ** 3 / varianza;
    for (let i = 0; i < nr; i++) { T.f[i] *= norma; T.g[i] *= norma; T.A1[i] *= norma; T.A2[i] *= norma; }
    // la derivata di f (per le pendenze), dalle differenze centrate della stessa tabella
    const fp = new Float64Array(nr); for (let i = 1; i < nr - 1; i++) fp[i] = (T.f[i + 1] - T.f[i - 1]) / (2 * dr);
    N = { j, h, varianza, coda, norma, passo: dr, f: T.f, g: T.g, A1: T.A1, A2: T.A2, fp }; nuclei.set(chiave, N); return N; };
  const tab = (t, r, p) => { const u = r / p, q = u | 0; return t[q] + (u - q) * (t[q + 1] - t[q]); };
  // ---- i livelli da sommare: da `da` (se non detto: quello sotto cui manca < 10⁻⁴ della varianza dello spostamento) a `livello`
  const daLivello = (() => { let tot = 0; const v = []; for (let j = 0; j <= 24; j++) { const kj = kDi(j); let s = 0; for (let i = 0; i < 60; i++) { const k = kj * 2 ** (-1 + (i + 0.5) / 30); s += (U.potenza(k) / (k * k)) * finestraLivello(j, k) ** 2 * (Math.LN2 / 30); } v.push(s); tot += s; } let c = 0, j = 0; while (c + v[j] < 1e-4 * tot) c += v[j++]; return j; })();
  const mpc = (punto) => [punto[0] / MPC, punto[1] / MPC, punto[2] / MPC];
  const filtroDi = (opz) => opz.filtro ?? (opz.scala ? FILTRI.gaussiana(opz.scala) : FILTRI.nessuno);
  // il livello più fine: quello chiesto, o quello oltre cui il filtro non lascia niente (la sua ottava parte sopra kTop)
  const cima = (opz, F) => { const perFiltro = F.kTop ? Math.max(0, Math.ceil(Math.log2((2 * F.kTop) / kDi(0)))) : Infinity, J = Math.min(opz.livello ?? Infinity, perFiltro, PIGRO.livelloMassimo); if (opz.livello == null && !F.kTop) throw new Error('campoPigro: serve il livello (la risoluzione) o una scala di lisciatura'); return J; };
  // i livelli che contano per la densità con quel filtro: quelli con più di 10⁻¹⁰ della varianza (i più grossi non pesano niente)
  const livelliUtili = (opz, F) => { const J = cima(opz, F), soglia = opz.soglia ?? 1e-10, k = `${J}|${F.chiave}|${soglia}`; let L = I.utili.get(k); if (!L) { const v = []; let tot = 0; for (let j = 0; j <= J; j++) { v.push(nucleo(j, F).varianza); tot += v[j]; } L = []; for (let j = 0; j <= J; j++) if (v[j] > soglia * tot) L.push(j); I.utili.set(k, L); } return L; };
  // i livelli per marea, spostamento e potenziale: tutti, da `da` (se non detto: daLivello) al più fine
  const livelliIn = (opz, F) => { const J = cima(opz, F), j0 = Math.min(opz.da ?? daLivello, J), L = []; for (let j = j0; j <= J; j++) L.push(j); return L; };
  // LA DENSITÀ in un punto (m), ai livelli chiesti. opz: { livello: J (il più fine), scala (m: gaussiana) o filtro, soglia (10⁻¹⁰:
  // i livelli che portano meno di questa parte della varianza non si sommano; 0 = tutti quelli che hanno potenza) }
  const delta = (punto, opz = {}) => { const x = mpc(punto), F = filtroDi(opz); let d = 0;
    for (const j of livelliUtili(opz, F)) { const N = nucleo(j, F), n = raccogli(livello(j), x), t = N.f, p = N.passo; let s = 0; for (let i = 0; i < n; i++) { const u = gr[i] / p, q = u | 0; s += gw[i] * (t[q] + (u - q) * (t[q + 1] - t[q])); } d += s; }
    return d; };
  // TUTTO in un punto: → { delta, marea [xx, yy, zz, xy, xz, yz] (traccia = delta), spostamento [m] (Ψ = −∇φ), velocita [km/s]
  //   (H₀·f·Ψ: il moto lineare di oggi), potenziale (m²: a meno di una costante e di una pendenza, che vengono dai livelli
  //   più grossi di `da`), livelli: [da, a], perLivello (se opz.perLivello: il contributo di ognuno a delta) }
  const in_ = (punto, opz = {}) => { const x = mpc(punto), F = filtroDi(opz), L = livelliIn(opz, F), T = [0, 0, 0, 0, 0, 0], S = [0, 0, 0], per = opz.perLivello ? [] : null; let fi = 0;
    for (const j of L) { const N = nucleo(j, F); if (N.vuoto) { per?.push(0); continue; } const n = raccogli(livello(j), x), p = N.passo, tg = N.g, t1 = N.A1, t2 = N.A2; let tr = 0;
      for (let i = 0; i < n; i++) { const r = gr[i], u = r / p, q = u | 0, f = u - q, w = gw[i], a1 = w * (t1[q] + f * (t1[q + 1] - t1[q])), a2 = r > 0 ? (w * (t2[q] + f * (t2[q + 1] - t2[q]))) / (r * r) : 0, dx = gx[i], dy = gy[i], dz = gz[i];
        fi += w * (tg[q] + f * (tg[q + 1] - tg[q])); S[0] -= a1 * dx; S[1] -= a1 * dy; S[2] -= a1 * dz; T[0] += a1 + a2 * dx * dx; T[1] += a1 + a2 * dy * dy; T[2] += a1 + a2 * dz * dz; T[3] += a2 * dx * dy; T[4] += a2 * dx * dz; T[5] += a2 * dy * dz; tr += 3 * a1 + a2 * r * r; }
      per?.push(tr); }
    return { delta: T[0] + T[1] + T[2], marea: T, spostamento: S.map((v) => v * MPC), velocita: S.map((v) => v * COSMO.H0 * f0Crescita), potenziale: fi * MPC * MPC, livelli: [L[0], L[L.length - 1]], perLivello: per }; };
  // la varianza attesa (teoria: ∫dlnk Δ²·F²·Σ_j B_j²) della densità ai livelli e col filtro chiesti; e, per livello, la coda tagliata
  const varianza = (opz = {}) => { const F = filtroDi(opz); let v = 0; for (const j of livelliUtili(opz, F)) v += nucleo(j, F).varianza; return v; };
  const code = (opz = {}) => { const F = filtroDi(opz), out = []; for (const j of livelliUtili(opz, F)) { const N = nucleo(j, F); out.push({ livello: j, latoMpc: N.h, varianza: N.varianza, coda: N.coda ?? 0 }); } return out; };
  // una griglia regolare di densità (n³ punti: origine + (i, j, l)·passo, in metri): gli stessi valori di delta(), punto per punto
  const griglia = (origine, passo, n, opz = {}) => { const out = new Float64Array(n * n * n); for (let l = 0; l < n; l++) for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) out[(l * n + j) * n + i] = delta([origine[0] + i * passo, origine[1] + j * passo, origine[2] + l * passo], opz); return out; };

  // ---- UNA GRANDEZZA LINEARE del campo (un «vincolo»): parti [{ F, livelli, x (Mpc), guadagno(N, dx, dy, dz, r) }]: il suo valore
  // è Σ_parti Σ_livelli Σ_celle w·guadagno. v: { tipo: 'densita' (di suo) | 'pendenza' (direzione: versore; ∂δ/∂x in 1/Mpc) |
  // 'marea' (i, j) | 'cielo' (cielo: ciò che dà filtriCielo, direzione, doppler), posizione (m), scala (m) o filtro, livello }
  const partiDi = (v) => {
    if (v.tipo === 'cielo') { const C = v.cielo, n = v.direzione, x = [0, 1, 2].map((d) => C.centro[d] + C.chi * n[d]), out = [{ F: C.W0, livelli: C.livelli, x, guadagno: (N, dx, dy, dz, r) => tab(N.f, r, N.passo) }];
      if (v.doppler) out.push({ F: C.W1, livelli: C.livelli, x, guadagno: (N, dx, dy, dz, r) => tab(N.A1, r, N.passo) * (n[0] * dx + n[1] * dy + n[2] * dz) }); return out; }
    const F = filtroDi(v), x = mpc(v.posizione), opz = { livello: v.livello, soglia: v.soglia };
    if (!v.tipo || v.tipo === 'densita') return [{ F, livelli: livelliUtili(opz, F), x, guadagno: (N, dx, dy, dz, r) => tab(N.f, r, N.passo) }];
    if (v.tipo === 'pendenza') { const e = v.direzione; return [{ F, livelli: livelliIn(opz, F), x, guadagno: (N, dx, dy, dz, r) => (r > 0 ? (tab(N.fp, r, N.passo) * (e[0] * dx + e[1] * dy + e[2] * dz)) / r : 0) }]; }
    if (v.tipo === 'marea') { const a = v.i, b = v.j; return [{ F, livelli: livelliIn(opz, F), x, guadagno: (N, dx, dy, dz, r) => { const d = [dx, dy, dz], a1 = tab(N.A1, r, N.passo), a2 = r > 0 ? tab(N.A2, r, N.passo) / (r * r) : 0; return (a === b ? a1 : 0) + a2 * d[a] * d[b]; } }]; }
    throw new Error(`campoPigro: grandezza sconosciuta (${v.tipo})`); };
  const misura = (v) => { let s = 0; for (const P of partiDi(v)) for (const j of P.livelli) { const N = nucleo(j, P.F); if (N.vuoto) continue; const n = raccogli(livello(j), P.x); for (let i = 0; i < n; i++) s += gw[i] * P.guadagno(N, gx[i], gy[i], gz[i], gr[i]); } return s; };

  // ---- IL CAMPO VINCOLATO (Hoffman & Ribak 1991, nello spazio delle celle): il campo è lineare nelle celle, δ = G·w, w ~ N(0, 1)
  // indipendenti. Dati i valori c dei vincoli, la realizzazione vincolata è w' = w + Gᵀ·C⁻¹·(c − G·w), C = G·Gᵀ: ESATTA per questo
  // campo (con i nuclei troncati com'è), e LOCALE: cambiano solo le celle che un vincolo tocca (entro il raggio dei nuclei, a ogni
  // livello). χ² = cᵀC⁻¹c sui vincoli dopo i primi `fissi` (che sono dati: le galassie). → un campo con le stesse funzioni, più
  // { esiste, gradi, chi2, probabilita, logPeso, logDensita, chi2Libero, ridondanti, liberi (G·w), valori, attesa(v) → { media,
  //   varianza, libera }, liberta() → { celle, gradiFissati, varianzaLibera (sulle celle toccate: 1 − gradi/celle) } }
  const vincola = (vincoli, { fissi = 0 } = {}) => {
    if (correzione) throw new Error('vincola: si vincola il campo libero, con tutti i vincoli insieme (i fissi per primi)');
    const n = vincoli.length, per = new Map();
    for (let i = 0; i < n; i++) { if (!Number.isFinite(vincoli[i].valore)) throw new Error(`vincola: il vincolo ${i} non ha valore`);
      for (const P of partiDi(vincoli[i])) for (const j of P.livelli) { const N = nucleo(j, P.F); if (N.vuoto) continue; let L = per.get(j); if (!L) { L = { chiavi: new Map(), w: [], idx: [], voci: [] }; per.set(j, L); }
        const m = raccogli(livello(j), P.x); for (let c = 0; c < m; c++) { const g = P.guadagno(N, gx[c], gy[c], gz[c], gr[c]); if (g === 0) continue; const k = `${gix[c]},${giy[c]},${giz[c]}`; let q = L.chiavi.get(k);
          if (q === undefined) { q = L.w.length; L.chiavi.set(k, q); L.w.push(gw[c]); L.idx.push(gix[c], giy[c], giz[c]); L.voci.push([]); } const vo = L.voci[q]; if (vo.length && vo[vo.length - 2] === i) vo[vo.length - 1] += g; else vo.push(i, g); } } }
    const C = new Float64Array(n * n), d0 = new Float64Array(n); let celle = 0;
    for (const L of per.values()) { celle += L.w.length; for (let q = 0; q < L.w.length; q++) { const vo = L.voci[q], w = L.w[q]; for (let a = 0; a < vo.length; a += 2) { const ia = vo[a], ga = vo[a + 1]; d0[ia] += ga * w; for (let b = a; b < vo.length; b += 2) { const ib = vo[b]; C[Math.min(ia, ib) * n + Math.max(ia, ib)] += ga * vo[b + 1]; } } } }
    // Cholesky nell'ordine dato (i fissi per primi), saltando i vincoli che non aggiungono niente (RANGO di bolle.js)
    const diag = new Float64Array(n), yc = new Float64Array(n), y0 = new Float64Array(n), vivo = new Uint8Array(n), ridondanti = []; let logDet = 0;
    for (let j = 0; j < n; j++) { const rj = j * n; let s = C[rj + j], ac = vincoli[j].valore, a0 = d0[j]; diag[j] = s; for (let k = 0; k < j; k++) if (vivo[k]) { const l = C[rj + k]; s -= l * l; ac -= l * yc[k]; a0 -= l * y0[k]; }
      if (!(s > RANGO * diag[j])) { if (Math.abs(ac) > 1e-7 * (Math.abs(vincoli[j].valore) + Math.sqrt(Math.max(diag[j], 1e-300)))) return { esiste: false, incompatibili: [j], perche: `il vincolo ${j} è già deciso da quelli che lo precedono, ma chiede un valore diverso di ${ac.toExponential(2)}` }; ridondanti.push(j); continue; }
      const l = Math.sqrt(s); vivo[j] = 1; C[rj + j] = l; yc[j] = ac / l; y0[j] = a0 / l; if (j >= fissi) logDet += Math.log(l); for (let i = j + 1; i < n; i++) { const ri = i * n; let t = C[rj + i]; for (let k = 0; k < j; k++) if (vivo[k]) t -= C[ri + k] * C[rj + k]; C[ri + j] = t / l; } }
    const lam = new Float64Array(n); for (let j = n - 1; j >= 0; j--) { if (!vivo[j]) continue; let t = yc[j] - y0[j]; for (let i = j + 1; i < n; i++) if (vivo[i]) t -= C[i * n + j] * lam[i]; lam[j] = t / C[j * n + j]; }
    let chi2 = 0, chi2Libero = 0, gradi = 0, rango = 0; for (let j = 0; j < n; j++) if (vivo[j]) { rango++; if (j >= fissi) { chi2 += yc[j] * yc[j]; chi2Libero += y0[j] * y0[j]; gradi++; } }
    // le celle cambiate: Δw = Gᵀλ, messe a blocchi come le celle
    const cambiate = new Map();
    for (const [j, L] of per) { const M = new Map(); cambiate.set(j, M); for (let q = 0; q < L.w.length; q++) { const vo = L.voci[q]; let d = 0; for (let a = 0; a < vo.length; a += 2) d += vo[a + 1] * lam[vo[a]]; if (d === 0) continue;
      const wx = L.idx[3 * q], wy = L.idx[3 * q + 1], wz = L.idx[3 * q + 2], bx = Math.floor(wx / NB), by = Math.floor(wy / NB), bz = Math.floor(wz / NB), k = `${bx},${by},${bz}`; let B = M.get(k); if (!B) { B = new Float64Array(NB3); M.set(k, B); } B[((wz - bz * NB) * NB + wy - by * NB) * NB + wx - bx * NB] += d; } }
    const V = campoPigro(radice, { rami, raggio, memoria, finestra, lato0, periodo, da: F, correzione: cambiate });
    // ciò che la teoria dice di una grandezza Q nel campo vincolato: media ξᵀC⁻¹c, varianza ⟨Q²⟩ − ξᵀC⁻¹ξ (ξ_i = Σ_celle g_Q·g_i)
    const attesa = (v) => { const xi = new Float64Array(n); let libera = 0;
      for (const P of partiDi(v)) for (const j of P.livelli) { const N = nucleo(j, P.F); if (N.vuoto) continue; const L = per.get(j), m = raccogli(livello(j), P.x); for (let c = 0; c < m; c++) { const g = P.guadagno(N, gx[c], gy[c], gz[c], gr[c]); libera += g * g; if (!L) continue; const q = L.chiavi.get(`${gix[c]},${giy[c]},${giz[c]}`); if (q === undefined) continue; const vo = L.voci[q]; for (let a = 0; a < vo.length; a += 2) xi[vo[a]] += g * vo[a + 1]; } }
      let media = 0, tolta = 0; for (let j = 0; j < n; j++) { if (!vivo[j]) continue; let t = xi[j]; for (let k = 0; k < j; k++) if (vivo[k]) t -= C[j * n + k] * xi[k]; xi[j] = t / C[j * n + j]; media += xi[j] * yc[j]; tolta += xi[j] * xi[j]; }
      return { media, varianza: Math.max(0, libera - tolta), libera }; };
    return Object.assign(V, { esiste: true, gradi, chi2, probabilita: probabilitaChi2(chi2, gradi), logPeso: -chi2 / 2, logDensita: -chi2 / 2 - logDet - (gradi / 2) * Math.log(PI2), chi2Libero, ridondanti, liberi: d0, valori: vincoli.map((v) => v.valore), fissi, attesa, libero: F,
      liberta: () => ({ celle, gradiFissati: rango, varianzaLibera: 1 - rango / celle }) }); };

  // ---- LA GRIGLIA PER CONVOLUZIONE (alla MUSIC: Hahn & Abel 2011): i nodi stanno a origine + (i, j, l)·s, con s = il lato delle
  // celle del livello `m` e l'origine un multiplo di s. Per i livelli fini (celle di s, 2s, 4s) è la convoluzione ESATTA delle
  // celle col nucleo campionato sul reticolo, fatta con la trasformata di Fourier (gli stessi numeri del punto per punto, a
  // meno degli arrotondamenti: ~10⁻¹⁵); i livelli più grossi si calcolano esatti su nodi a un quarto delle loro celle e si
  // interpolano (Catmull–Rom: errore ~10⁻³ della loro parte, che è piccola). La risoluzione del campo sulla griglia è al più
  // quella dei suoi nodi (livello ≤ m). opz: { livello, scala o filtro, marea (true: anche il tensore di marea) }
  // → { n, passo (m), origine (m), livello, delta: Float64Array(n³) (indice (l·n + j)·n + i), xx, yy, zz, xy, xz, yz (se marea) }
  const grigliaFFT = (origine, m, n, opz = {}) => {
    const s = latoDi(m), o = mpc(origine).map((v) => v / s), oi = o.map(Math.round); if (o.some((v, d) => Math.abs(v - oi[d]) > 1e-6 * Math.max(1, Math.abs(v)))) throw new Error('grigliaFFT: l\'origine deve stare sul reticolo delle celle del livello m');
    const F = filtroDi(opz), J = Math.min(cima(opz, F), m), oL = { ...opz, livello: J }, lista = opz.soloLivelli ?? (opz.marea ? livelliIn(oL, F) : livelliUtili(oL, F)), nomi = opz.marea ? ['xx', 'yy', 'zz', 'xy', 'xz', 'yz'] : ['delta'], n3 = n * n * n, out = { n, passo: s * MPC, origine: [...origine], livello: J };
    for (const k of nomi) out[k] = new Float64Array(n3);
    const valoriKern = (N, dx, dy, dz, r, v) => { const f = r > 0 ? 1 / (r * r) : 0; if (!opz.marea) { v[0] = tab(N.f, r, N.passo); return; } const a1 = tab(N.A1, r, N.passo), a2 = r > 0 ? tab(N.A2, r, N.passo) * f : 0; v[0] = a1 + a2 * dx * dx; v[1] = a1 + a2 * dy * dy; v[2] = a1 + a2 * dz * dz; v[3] = a2 * dx * dy; v[4] = a2 * dx * dz; v[5] = a2 * dy * dz; };
    const fini = lista.filter((j) => m - j <= 2), grossi = lista.filter((j) => m - j > 2);
    if (fini.length) { const Rm = Math.max(...fini.map((j) => Math.ceil(raggio * 2 ** (m - j)) + 1)); let N = 8; while (N < n + 2 * Rm + 2) N *= 2; if (N > 256) throw new Error('grigliaFFT: griglia troppo grande');
      const N3 = N ** 3, coppie = Math.ceil(nomi.length / 2), accR = Array.from({ length: coppie }, () => new Float64Array(N3)), accI = Array.from({ length: coppie }, () => new Float64Array(N3)), re = new Float64Array(N3), im = new Float64Array(N3), kr = new Float64Array(N3), ki = new Float64Array(N3), v = [0, 0, 0, 0, 0, 0];
      for (const j of fini) { const Nk = nucleo(j, F); if (Nk.vuoto) continue; const a = m - j, h = latoDi(j), Lv = livello(j), sh = a === 0 ? 0.5 : 0, R = Math.ceil(raggio * 2 ** a) + 1; re.fill(0); im.fill(0);
        // le celle: centro in unità di nodo u = (c + ½)·2^a − o; si mettono in p = u − sh + R
        const c0 = [0, 1, 2].map((d) => Math.ceil(((oi[d] - R) * s) / h - 0.5)), c1 = [0, 1, 2].map((d) => Math.floor(((oi[d] + n - 1 + R) * s) / h - 0.5));
        for (let cz = c0[2]; cz <= c1[2]; cz++) { const pz = (cz + 0.5) * 2 ** a - oi[2] - sh + Rm; for (let cy = c0[1]; cy <= c1[1]; cy++) { const py = (cy + 0.5) * 2 ** a - oi[1] - sh + Rm; for (let cx = c0[0]; cx <= c1[0]; cx++) { const px = (cx + 0.5) * 2 ** a - oi[0] - sh + Rm; re[(pz * N + py) * N + px] = valore(Lv, giro(Lv, cx), giro(Lv, cy), giro(Lv, cz)); } } }
        fft3(re, im, N);
        for (let cp = 0; cp < coppie; cp++) { kr.fill(0); ki.fill(0); const Rk = raggio * h;
          for (let tz = -R; tz <= R; tz++) { const dz = (tz - sh) * s; if (Math.abs(dz) >= Rk) continue; for (let ty = -R; ty <= R; ty++) { const dy = (ty - sh) * s, q = dz * dz + dy * dy; if (q >= Rk * Rk) continue; for (let tx = -R; tx <= R; tx++) { const dx = (tx - sh) * s, r2 = q + dx * dx; if (r2 >= Rk * Rk) continue; valoriKern(Nk, dx, dy, dz, Math.sqrt(r2), v); const ix = (((tz % N) + N) % N * N + ((ty % N) + N) % N) * N + ((tx % N) + N) % N; kr[ix] = v[2 * cp]; ki[ix] = 2 * cp + 1 < nomi.length ? v[2 * cp + 1] : 0; } } }
          fft3(kr, ki, N); const AR = accR[cp], AI = accI[cp]; for (let q = 0; q < N3; q++) { AR[q] += re[q] * kr[q] - im[q] * ki[q]; AI[q] += re[q] * ki[q] + im[q] * kr[q]; } } }
      for (let cp = 0; cp < coppie; cp++) { fft3(accR[cp], accI[cp], N, true); const A = out[nomi[2 * cp]], B = 2 * cp + 1 < nomi.length ? out[nomi[2 * cp + 1]] : null;
        for (let l = 0, q = 0; l < n; l++) for (let jj = 0; jj < n; jj++) for (let i = 0; i < n; i++, q++) { const ix = ((l + Rm) * N + jj + Rm) * N + i + Rm; A[q] = accR[cp][ix]; if (B) B[q] = accI[cp][ix]; } } }
    // (ogni livello ha il suo raggio R ≤ Rm in nodi; le celle stanno tutte a + Rm, e l'uscita si legge a + Rm)
    // i livelli grossi: esatti su nodi a h/4 (con la trasformata se sono tanti, punto per punto se pochi), poi interpolati
    const w3 = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], v = [0, 0, 0, 0, 0, 0];
    for (const j of grossi) { const Nk = nucleo(j, F); if (Nk.vuoto) continue; const h = latoDi(j), sg = h / 4, a0 = [0, 1, 2].map((d) => Math.floor((oi[d] * s) / sg) - 1), na = Math.ceil(((n - 1) * s) / sg) + 4, Lv = livello(j); let aux;
      if (na > 24) { const G = grigliaFFT(a0.map((v) => v * sg * MPC), j + 2, na, { ...opz, soloLivelli: [j] }); aux = nomi.map((k) => G[k]); }
      else { aux = nomi.map(() => new Float64Array(na ** 3)); for (let l = 0, q = 0; l < na; l++) for (let jj = 0; jj < na; jj++) for (let i = 0; i < na; i++, q++) { const x = [(a0[0] + i) * sg, (a0[1] + jj) * sg, (a0[2] + l) * sg], c = raccogli(Lv, x); const acc = [0, 0, 0, 0, 0, 0];
        for (let t = 0; t < c; t++) { valoriKern(Nk, gx[t], gy[t], gz[t], gr[t], v); for (let e = 0; e < nomi.length; e++) acc[e] += gw[t] * v[e]; } for (let e = 0; e < nomi.length; e++) aux[e][q] = acc[e]; } }
      for (let l = 0, q = 0; l < n; l++) { const uz = ((oi[2] + l) * s) / sg - a0[2], kz = Math.floor(uz); pesiCR(uz - kz, w3[2]);
        for (let jj = 0; jj < n; jj++) { const uy = ((oi[1] + jj) * s) / sg - a0[1], ky = Math.floor(uy); pesiCR(uy - ky, w3[1]);
          for (let i = 0; i < n; i++, q++) { const ux = ((oi[0] + i) * s) / sg - a0[0], kx = Math.floor(ux); pesiCR(ux - kx, w3[0]);
            for (let e = 0; e < nomi.length; e++) { const A = aux[e]; let t = 0; for (let c = 0; c < 4; c++) for (let b = 0; b < 4; b++) { const wb = w3[2][c] * w3[1][b], base = ((kz - 1 + c) * na + ky - 1 + b) * na + kx - 1; t += wb * (w3[0][0] * A[base] + w3[0][1] * A[base + 1] + w3[0][2] * A[base + 2] + w3[0][3] * A[base + 3]); } out[nomi[e]][q] += t; } } } } }
    if (opz.marea) { out.delta = new Float64Array(n3); for (let q = 0; q < n3; q++) out.delta[q] = out.xx[q] + out.yy[q] + out.zz[q]; }
    return out; };

  const F = { radice, rami, raggio, lato0, daLivello, latoDi, kDi, delta, in: in_, varianza, code, griglia, grigliaFFT, misura, vincola, cella, nucleo, livello, raccogli, livelliUtili: (opz = {}) => livelliUtili(opz, filtroDi(opz)), livelliIn: (opz = {}) => livelliIn(opz, filtroDi(opz)), memoriaIn: { gw, gx, gy, gz, gr }, contatori, _interni: I, vincolato: !!correzione,
    stato: () => { let b = 0; for (const Lv of livelli.values()) b += Lv.blocchi.size; return { livelli: livelli.size, blocchi: b, byte: b * NB3 * 8, celle: contatori.celle, nuclei: nuclei.size }; },
    dimentica: () => { livelli.clear(); }, pigro: true };
  return F;
}

// =====================================================================================================
// LE CORRELAZIONI dello spettro (senza bordo), per i vincoli e per i riscontri: tabelle radiali di
//   ξ(r) = ∫dlnk Δ²(k)·F1·F2·j0(kr)   e delle sue compagne per potenziale e marea (come nei nuclei)
// fino a rMax, con passo dr (Mpc); oltre rMax valgono zero (dichiarato).
// =====================================================================================================
const correlazioni = new Map();
function correlazione(chiave, F12, scala, kTop) {
  let C = correlazioni.get(chiave); if (C) return C;
  const rMax = 64 * scala, dr = scala / 16, nr = Math.ceil(rMax / dr) + 2, rs = new Float64Array(nr); for (let i = 0; i < nr; i++) rs[i] = i * dr;
  const dk = 0.25 / rMax, nk = 2 * Math.ceil(kTop / dk / 2), ks = new Float64Array(nk + 1), amp = new Float64Array(nk + 1);
  for (let i = 1; i <= nk; i++) { const k = i * dk; ks[i] = k; amp[i] = (P3(k) * F12(k) * (i === nk ? 1 : i % 2 ? 4 : 2) * dk) / 3; }
  C = { ...tabelleRadiali(ks, amp, rs), passo: dr, rMax, xi0: 0 }; C.xi0 = C.f[0]; if (correlazioni.size > 12) correlazioni.delete(correlazioni.keys().next().value); correlazioni.set(chiave, C); return C;
}
// la funzione di correlazione della densità lisciata (gaussiana R, in metri) a distanza r (m): per i riscontri
export const correlazioneAttesa = (R, r) => { const s = R / MPC, C = correlazione(`gg${s}`, (k) => Math.exp(-k * k * s * s), s, 8 / s), u = r / MPC / C.passo, i = u | 0; return u >= C.f.length - 1 ? 0 : C.f[i] + (u - i) * (C.f[i + 1] - C.f[i]); };

// IL CAMPO VINCOLATO, locale. campo: ciò che dà campoPigro; vincoli: [{ posizione: [m], scala: R (m, > 0: la densità lisciata
// con una gaussiana), valore }]. → { esiste, gradi, chi2, probabilita, chi2Libero, pesi, ridondanti,
//   delta(punto, { scala }) la densità vincolata lisciata a quella scala (la stessa dei vincoli, o un'altra),
//   in(punto, { scala }) → come campo.in (marea, spostamento, velocità, potenziale del campo vincolato),
//   correzione(punto, { scala }), raggioM (oltre questa distanza da ogni vincolo il campo è quello libero, bit per bit),
//   attesa(punto, { scala }) → { media, varianza, libera } }
// Costa: N valutazioni del campo libero + N²/2 letture di tabella + N³/6; poi, a punto, il campo libero + N letture.
export function condiziona(campo, vincoli) {
  const n = vincoli.length, X = vincoli.map((v) => v.posizione.map((p) => p / MPC)), S = vincoli.map((v) => { if (!(v.scala > 0) || !Number.isFinite(v.valore)) throw new Error('condiziona: ogni vincolo ha scala > 0 e valore'); return v.scala / MPC; });
  const tab = (a, b) => { const lo = Math.min(a, b), hi = Math.max(a, b), q = 0.5 * (a * a + b * b); return correlazione(`gg${lo}|${hi}`, (k) => Math.exp(-q * k * k), Math.sqrt(q), 8 / Math.sqrt(q)); };
  const leggi = (t, C, r) => { const u = r / C.passo, i = u | 0; return u >= t.length - 1 ? 0 : t[i] + (u - i) * (t[i + 1] - t[i]); };
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const d0 = vincoli.map((v) => campo.delta(v.posizione, { scala: v.scala })), M = new Float64Array(n * n);
  for (let i = 0; i < n; i++) for (let j = i; j < n; j++) { const C = tab(S[i], S[j]); M[i * n + j] = leggi(C.f, C, dist(X[i], X[j])); }
  // Cholesky, saltando i vincoli che non aggiungono niente (RANGO di bolle.js)
  const diag = new Float64Array(n), yc = new Float64Array(n), y0 = new Float64Array(n), vivo = new Uint8Array(n), ridondanti = [];
  for (let j = 0; j < n; j++) { const rj = j * n; let s = M[rj + j], ac = vincoli[j].valore, a0 = d0[j]; diag[j] = s; for (let k = 0; k < j; k++) if (vivo[k]) { const l = M[rj + k]; s -= l * l; ac -= l * yc[k]; a0 -= l * y0[k]; }
    if (!(s > RANGO * diag[j])) { if (Math.abs(ac) > 1e-7 * (Math.abs(vincoli[j].valore) + Math.sqrt(diag[j]))) return { esiste: false, incompatibili: [j], perche: `il vincolo ${j} è già deciso da quelli che lo precedono, ma chiede un valore diverso` }; ridondanti.push(j); continue; }
    const l = Math.sqrt(s); vivo[j] = 1; M[rj + j] = l; yc[j] = ac / l; y0[j] = a0 / l; for (let i = j + 1; i < n; i++) { const ri = i * n; let t = M[rj + i]; for (let k = 0; k < j; k++) if (vivo[k]) t -= M[ri + k] * M[rj + k]; M[ri + j] = t / l; } }
  const w = new Float64Array(n); for (let j = n - 1; j >= 0; j--) { if (!vivo[j]) continue; let t = yc[j] - y0[j]; for (let i = j + 1; i < n; i++) if (vivo[i]) t -= M[i * n + j] * w[i]; w[j] = t / M[j * n + j]; }
  let chi2 = 0, chi2Libero = 0, gradi = 0, raggio = 0; for (let j = 0; j < n; j++) if (vivo[j]) { chi2 += yc[j] * yc[j]; chi2Libero += y0[j] * y0[j]; gradi++; }
  const correzione = (punto, opz) => { const x = punto.map((p) => p / MPC), s = opz.scala / MPC; let d = 0; for (let j = 0; j < n; j++) { if (w[j] === 0) continue; const C = tab(s, S[j]); d += w[j] * leggi(C.f, C, dist(x, X[j])); } return d; };
  for (let j = 0; j < n; j++) raggio = Math.max(raggio, 64 * S[j] * Math.SQRT2);
  const in_ = (punto, opz) => { const L = campo.in(punto, opz), x = punto.map((p) => p / MPC), s = opz.scala / MPC, T = [...L.marea], Sp = L.spostamento.map((v) => v / MPC); let fi = L.potenziale / (MPC * MPC);
    for (let j = 0; j < n; j++) { if (w[j] === 0) continue; const C = tab(s, S[j]), dx = x[0] - X[j][0], dy = x[1] - X[j][1], dz = x[2] - X[j][2], r = Math.hypot(dx, dy, dz), a1 = w[j] * leggi(C.A1, C, r), a2 = r > 0 ? (w[j] * leggi(C.A2, C, r)) / (r * r) : 0;
      fi += w[j] * leggi(C.g, C, r); Sp[0] -= a1 * dx; Sp[1] -= a1 * dy; Sp[2] -= a1 * dz; T[0] += a1 + a2 * dx * dx; T[1] += a1 + a2 * dy * dy; T[2] += a1 + a2 * dz * dz; T[3] += a2 * dx * dy; T[4] += a2 * dx * dz; T[5] += a2 * dy * dz; }
    return { delta: T[0] + T[1] + T[2], marea: T, spostamento: Sp.map((v) => v * MPC), velocita: Sp.map((v) => v * COSMO.H0 * f0Crescita), potenziale: fi * MPC * MPC, livelli: L.livelli }; };
  const attesa = (punto, opz) => { const x = punto.map((p) => p / MPC), s = opz.scala / MPC, xi = new Float64Array(n), libera = tab(s, s).f[0]; let media = 0, tolta = 0;
    for (let j = 0; j < n; j++) { const C = tab(s, S[j]); xi[j] = leggi(C.f, C, dist(x, X[j])); }
    for (let j = 0; j < n; j++) { if (!vivo[j]) continue; let t = xi[j]; for (let k = 0; k < j; k++) if (vivo[k]) t -= M[j * n + k] * xi[k]; xi[j] = t / M[j * n + j]; media += xi[j] * yc[j]; tolta += xi[j] * xi[j]; }
    return { media, varianza: Math.max(0, libera - tolta), libera }; };
  return { esiste: true, gradi, chi2, probabilita: probabilitaChi2(chi2, gradi), chi2Libero, pesi: w, ridondanti, liberi: d0, raggioM: raggio * MPC,
    delta: (punto, opz) => campo.delta(punto, opz) + correzione(punto, opz), correzione, in: in_, attesa, campo };
}

// =====================================================================================================
// IL CIELO DEL FONDO da questo campo: senza toro, senza cerchi, con le onde più lunghe dell'orizzonte.
// ΔT/T(n) = Σ_livelli Σ_celle w·[K_iso(r) + (n·r)·K_dop(r)] nel punto x₀ + χ·n: K_iso ha per filtro W0(k) = q·D·e^(−τ)·[Θ₀+Ψ],
// K_dop viene dal gradiente del campo con filtro W1(k)/k (i·μ·W1 = n·∇/k: il Doppler dei barioni), con W0, W1 di ragnatela.js.
//   osservatore: { posizione: [m] }; opz: { ellMax (fin dove il cielo deve avere tutta la potenza: decide i livelli), doppler }
// → { in(n), parti(n) → { isotropo, doppler }, livelli: [0, J], raggioM, ellPiena (fin dove la potenza è tutta), ellBanda (oltre non ce n'è) }
// =====================================================================================================
export function cieloPigro(campo, osservatore = {}, { ellMax = 8, doppler = true } = {}) {
  const Ric = ricombinazione(), chi = Ric.raggioMpc, C = RAGNATELA.sorgentiContinue(), x0 = (osservatore.posizione ?? [0, 0, 0]).map((p) => p / MPC);
  const leggi = (T, k) => { const u = k / C.dk, i = Math.min(C.n - 1, Math.floor(u)); return T[i] + (u - i) * (T[i + 1] - T[i]); };
  const W0 = { chiave: 'W0', F: (k) => RAGNATELA.phiSuDelta(k) * leggi(C.S0, k) }, W1 = { chiave: '-kW1', F: (k) => -k * RAGNATELA.phiSuDelta(k) * leggi(C.S1, k) };
  // i livelli: fino a quello la cui ottava copre per intero k = (ellMax + 6)/χ (lì Σ_j≤J B_j² = 1 ancora)
  let J = 0; while (campo.kDi(J) < (ellMax + 6) / chi) J++; if (2 * campo.kDi(J) > C.n * C.dk) throw new Error('cieloPigro: ellMax troppo alto per le tabelle delle sorgenti');
  const { gw, gx, gy, gz, gr } = campo.memoriaIn;
  const parti = (n) => { const x = [x0[0] + chi * n[0], x0[1] + chi * n[1], x0[2] + chi * n[2]]; let iso = 0, dop = 0;
    for (let j = 0; j <= J; j++) { const N0 = campo.nucleo(j, W0), N1 = doppler ? campo.nucleo(j, W1) : null; if (N0.vuoto) continue; const m = campo.raccogli(campo.livello(j), x), p = N0.passo, t0 = N0.f, t1 = N1 && !N1.vuoto ? N1.A1 : null;
      // (il Doppler è n·∇ dello scalare di filtro W1/k; il gradiente di un nucleo c(r) è (c'/r)·r, e c'/r è la tabella A1
      // dell'ampiezza −k²·(W1/k) = −k·W1: per questo il filtro è «−kW1»)
      for (let i = 0; i < m; i++) { const u = gr[i] / p, q = u | 0, f = u - q; iso += gw[i] * (t0[q] + f * (t0[q + 1] - t0[q])); if (t1) dop += gw[i] * (t1[q] + f * (t1[q + 1] - t1[q])) * (n[0] * gx[i] + n[1] * gy[i] + n[2] * gz[i]); } }
    return { isotropo: iso, doppler: dop }; };
  const livelli = []; for (let j = 0; j <= J; j++) livelli.push(j);
  // la varianza attesa del cielo (media sul cielo): ∫dlnk Δ²·Σ_j≤J B_j²·(W0² + W1²/3), con W1 = −(−kW1)/k
  let v = 0; { const n = 4000, l0 = Math.log(1e-7), dl = (Math.log(2 * campo.kDi(J)) - l0) / n; for (let i = 0; i < n; i++) { const k = Math.exp(l0 + (i + 0.5) * dl); let b = 0; for (let j = 0; j <= J; j++) { const u = Math.abs(Math.log2(k / campo.kDi(j))); if (u < 1) b += Math.cos((Math.PI / 2) * u) ** 2; } v += U.potenza(k) * b * (W0.F(k) ** 2 + (doppler ? (W1.F(k) / k) ** 2 / 3 : 0)) * dl; } }
  return { in: (n) => { const p = parti(n); return p.isotropo + p.doppler; }, parti, livelli: [0, J], raggioM: chi * MPC, ellPiena: campo.kDi(J) * chi, ellBanda: 2 * campo.kDi(J) * chi, z: Ric.zTau1, scartoAtteso: Math.sqrt(v),
    cielo: { centro: x0, chi, W0, W1, livelli } }; // (cielo: per i vincoli di campoPigro.vincola, tipo 'cielo')
}
