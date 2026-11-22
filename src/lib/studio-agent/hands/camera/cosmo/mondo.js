// mondo.js — una sezione di spaziotempo con poche leggi vere.
//
// Il pattern è la fotografia di un evento possibile, in uno dei tanti universi
// possibili. Nessun oggetto costruito: solo ciò che la natura mette nello
// spazio vuoto. Le leggi sono quattro, quelle del nostro universo:
//
//   1. GRAVITÀ   le MASSE stanno ferme e curvano lo spazio intorno a sé. Chi
//                passa segue la curvatura ma non sposta la massa (è un corpo di
//                prova: niente problema a molti corpi). Una particella con massa
//                cade con a = G·M/r², la stessa per tutte, leggere o pesanti
//                (principio di equivalenza); la luce si piega il doppio (la
//                deflessione della relatività generale in campo debole). Chi
//                tocca il corpo della massa (raggio R) ci cade dentro.
//   2. MAGNETISMO dove c'è campo B (perpendicolare al piano) una carica gira con
//                ω = q·B/m. Il campo è a zone, o continuo come in natura: una
//                somma di onde (campi che variano dolcemente) e i CRISTALLI, dove
//                il campo si ripete con il passo del reticolo.
//   3. MATERIA   dove c'è materia (a zone, o a NUBI che variano dolcemente) una
//                carica perde energia (Bethe): dv/dt = −K·q²/(m·v²). Più lenta,
//                frena più in fretta: si ferma dopo m·v⁴/(4·K·q²) e la curva si
//                stringe in spirale fino all'occhio.
//   4. DECADIMENTO una particella instabile si divide nelle figlie della sua
//                specie. Ognuna decade quando capita: la specie dà solo la vita
//                media (la vita di ciascuna si estrae a caso, esponenziale), e
//                gli angoli delle figlie possono essere a caso in un intervallo.
//                Il caso è deterministico: lo fissa il «seme» dell'universo.
//
// La LASTRA registra le cariche come bolle: lo spessore è proporzionale alla
// carica e cresce quando la particella rallenta, w = w0·|q|·min(saturazione,
// vRif/v); in fondo resta una macchia tonda (il picco di Bragg). Le neutre e la
// luce non lasciano traccia, a meno che la specie non dica «visibile».
//
// Il passo è esatto dove il campo è uniforme: la velocità ruota di ω·dt, la
// velocità scalare segue Bethe in forma chiusa, la posizione avanza lungo la
// corda dell'arco. Vicino alle masse la gravità entra con mezzi calci (Verlet);
// nei campi continui il passo resta piccolo rispetto alla loro lunghezza d'onda.

import { contatore, chiaveDi } from './eventi.js';

const DUE_PI = 2 * Math.PI;

// ---------- geometria dei domini
export function dentro(forma, x, y) {
  switch (forma.tipo) {
    case 'tutto': return true;
    case 'cerchio': { const dx = x - forma.centro[0], dy = y - forma.centro[1]; return dx * dx + dy * dy <= forma.r * forma.r; }
    case 'anello': {
      const dx = x - forma.centro[0], dy = y - forma.centro[1], r2 = dx * dx + dy * dy;
      if (r2 < forma.r[0] * forma.r[0] || r2 > forma.r[1] * forma.r[1]) return false;
      if (forma.ampiezza == null) return true;
      let a = Math.atan2(dy, dx) - forma.da; a = ((a % DUE_PI) + DUE_PI) % DUE_PI;
      return a <= forma.ampiezza;
    }
    case 'poligono': {
      const P = forma.punti; let d = false;
      for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
        if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) d = !d;
      }
      return d;
    }
    default: return false;
  }
}
function riquadro(forma) {
  if (forma.tipo === 'cerchio') return [forma.centro[0] - forma.r, forma.centro[1] - forma.r, forma.centro[0] + forma.r, forma.centro[1] + forma.r];
  if (forma.tipo === 'anello') return [forma.centro[0] - forma.r[1], forma.centro[1] - forma.r[1], forma.centro[0] + forma.r[1], forma.centro[1] + forma.r[1]];
  if (forma.tipo === 'poligono') { const xs = forma.punti.map((p) => p[0]), ys = forma.punti.map((p) => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; }
  return [-Infinity, -Infinity, Infinity, Infinity];
}

// una griglia per trovare in fretta i domini che contengono un punto
function indiceDomini(domini, larghezza, altezza, vivo = () => true) {
  const N = 48, cw = larghezza / N, ch = altezza / N, celle = Array.from({ length: N * N }, () => []), ovunque = [];
  domini.forEach((d, i) => {
    const [x0, y0, x1, y1] = riquadro(d.forma);
    if (!isFinite(x0)) { ovunque.push(i); return; }
    const a = Math.max(0, Math.floor(x0 / cw)), b = Math.min(N - 1, Math.floor(x1 / cw)), c = Math.max(0, Math.floor(y0 / ch)), e = Math.min(N - 1, Math.floor(y1 / ch));
    if (a > N - 1 || b < 0 || c > N - 1 || e < 0) { ovunque.push(i); return; }
    for (let gy = c; gy <= e; gy++) for (let gx = a; gx <= b; gx++) celle[gy * N + gx].push(i);
  });
  return (x, y) => {
    const gx = Math.floor(x / cw), gy = Math.floor(y / ch);
    const lista = gx >= 0 && gy >= 0 && gx < N && gy < N ? celle[gy * N + gx] : [];
    let best = -1;
    for (const i of ovunque) if (i > best && vivo(i) && dentro(domini[i].forma, x, y)) best = i;
    for (const i of lista) if (i > best && vivo(i) && dentro(domini[i].forma, x, y)) best = i;
    return best;
  };
}

// le cinque leggi, tutte accese se non si dice altrimenti (mondo.leggi)
export const LEGGI = { gravita: true, magnetico: true, materia: true, decadimento: true };

// il caso, ripetibile: lo stesso seme dà lo stesso universo
export function generatore(seme) {
  let a = seme >>> 0 || 1;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// I RAMI. Ogni particella ha un indirizzo nella sua genealogia: «3» è la terza
// sorgente, «3.0» la sua prima figlia, «3.0.1» la seconda figlia di quella. Il
// suo decadimento (quando, e in che direzioni partono le figlie) è un evento
// quantistico: ha il suo caso, che dipende solo dal seme e dall'indirizzo.
// Un universo parallelo è lo stesso universo con alcuni eventi andati
// diversamente: mondo.rami = { indirizzo: n } sceglie l'esito n-esimo di
// quell'evento. Tutto il resto resta identico; cambia solo ciò che ne discende.
// Il caso viene dalla fonte unica (eventi.js): l'evento ha l'indirizzo «mondo seme/indirizzo», e i numeri che gli
// servono (quando decade, dove vanno le figlie, ogni deviazione nella materia) sono le sue estrazioni, chieste in
// fila; il ramo le cambia tutte, e non tocca nessun altro evento.
let semeVisto = null, chiaveSeme = null; // (la chiave di «mondo seme» si calcola una volta, non a ogni particella)
export function casoEvento(seme, indirizzo, ramo = 0) {
  if (seme !== semeVisto) { chiaveSeme = chiaveDi(`mondo ${seme}`); semeVisto = seme; }
  return contatore(indirizzo, ramo, chiaveSeme);
}
// una mappa si può scrivere compatta: «sparsa» = [scarto d'indice, valore, ...]
const mappeDense = new WeakMap();
function densa(m, chiave = 'sparsa') {
  if (chiave === 'sparsa' && m.B) return m.B;
  if (!m[chiave]) return null;
  let tutte = mappeDense.get(m); if (!tutte) { tutte = {}; mappeDense.set(m, tutte); }
  if (!tutte[chiave]) { const d = new Float32Array(m.nx * m.ny); let n = -1; for (let i = 0; i < m[chiave].length; i += 2) { n += m[chiave][i]; d[n] = m[chiave][i + 1]; } tutte[chiave] = d; }
  return tutte[chiave];
}
// i campi continui: onde (campi che variano dolcemente) e cristalli (campi periodici)
export function campiContinui(mondo) {
  const ondeB = mondo.onde?.B || [], nubi = mondo.nubi || null, cristalli = mondo.cristalli || [], mappa = mondo.mappa || null;
  // il DIPOLO di un pianeta (o di una stella), visto nel suo piano equatoriale: il campo è
  // perpendicolare al piano e cala come il cubo della distanza, B = B0·(R/r)³
  const dipoli = mondo.dipoli || [];
  const ondeK = nubi?.modi || [];
  let lambdaOnde = Infinity;
  for (const o of [...ondeB, ...ondeK]) lambdaOnde = Math.min(lambdaOnde, (2 * Math.PI) / Math.hypot(...o.k));
  // la lunghezza su cui il campo cambia, qui: fitta dentro un cristallo, larga fuori
  // la MAPPA: un campo dato su una griglia fine e interpolato con continuità (bilineare)
  const dentroMappa = (x, y) => mappa && x >= mappa.x0 && y >= mappa.y0 && x <= mappa.x0 + (mappa.nx - 1) * mappa.h && y <= mappa.y0 + (mappa.ny - 1) * mappa.h;
  const MB = mappa ? densa(mappa) : null, MK = mappa ? densa(mappa, 'sparsaK') : null;
  const valoreMappa = (x, y, M = MB) => {
    const fx = (x - mappa.x0) / mappa.h, fy = (y - mappa.y0) / mappa.h, i = Math.min(mappa.nx - 2, Math.floor(fx)), j = Math.min(mappa.ny - 2, Math.floor(fy)), u = fx - i, v = fy - j, n = mappa.nx;
    return M[j * n + i] * (1 - u) * (1 - v) + M[j * n + i + 1] * u * (1 - v) + M[(j + 1) * n + i] * (1 - u) * v + M[(j + 1) * n + i + 1] * u * v;
  };
  const lambda = (x, y) => { let l = lambdaOnde; for (const d of dipoli) l = Math.min(l, Math.max(d.R * 0.05, Math.hypot(x - d.centro[0], y - d.centro[1]) / 4)); for (const c of cristalli) if (Math.hypot(x - c.centro[0], y - c.centro[1]) < c.r + c.passo) l = Math.min(l, c.passo); if (dentroMappa(x, y)) l = Math.min(l, mappa.h * 2); return l; };
  if (!ondeB.length && !ondeK.length && !cristalli.length && !mappa && !dipoli.length) return null;
  const B = (x, y) => {
    let b = 0;
    for (const o of ondeB) b += o.a * Math.cos(o.k[0] * x + o.k[1] * y + o.fi);
    for (const c of cristalli) {
      const dx = x - c.centro[0], dy = y - c.centro[1], r = Math.hypot(dx, dy);
      if (r >= c.r) continue;
      // il reticolo: tre onde a 60°, come in un cristallo esagonale; ai bordi il cristallo sfuma
      const sfuma = Math.min(1, (c.r - r) / (0.15 * c.r)), g = (4 * Math.PI) / (Math.sqrt(3) * c.passo);
      let somma = 0;
      for (let j = 0; j < 3; j++) { const an = c.angolo + (j * Math.PI) / 3; somma += Math.cos(g * (dx * Math.cos(an) + dy * Math.sin(an))); }
      b += (c.a * sfuma * somma) / 3;
    }
    if (dentroMappa(x, y)) b += valoreMappa(x, y);
    for (const d of dipoli) { const r = Math.max(d.R, Math.hypot(x - d.centro[0], y - d.centro[1])); b += d.B0 * (d.R / r) ** 3; }
    return b;
  };
  const K = (x, y) => {
    let k = 0;
    if (nubi) { let s = 0; for (const o of ondeK) s += o.a * Math.cos(o.k[0] * x + o.k[1] * y + o.fi); k = nubi.K * Math.max(0, s); }
    if (MK && dentroMappa(x, y)) k += Math.max(0, valoreMappa(x, y, MK));
    return k;
  };
  return { B, K, lambda };
}

// gli interruttori nel tempo: un oggetto parte acceso (o spento, se «spento») e
// cambia stato a ogni scatto { t, acceso } della sua lista «interruttori».
// Una legge è true, false, oppure una lista di scatti (parte accesa).
export function accesoA(o, t) { let a = !o.spento; for (const e of o.interruttori || []) if (e.t <= t) a = e.acceso; return a; }
export const leggeA = (v, t) => (Array.isArray(v) ? v.reduce((a, e) => (e.t <= t ? e.acceso : a), true) : v !== false);

// le specie si possono scrivere per nome: mondo.specie = { elettrone: {...}, ... }
export function risolviSpecie(s, catalogo = {}) {
  if (typeof s === 'string') { const o = catalogo[s]; if (!o) throw new Error(`specie sconosciuta: ${s}`); return { nome: s, ...o }; }
  return s;
}

// ---------- la simulazione di un'esposizione
// mondo = { larghezza, altezza, bordo: 'aperto'|'periodico', G, c, seme,
//           fondo: { B, K }, domini: [{ forma, B, K }],
//           onde: { B: [{ k, a, fi }] }, nubi: { K, modi: [{ k, a, fi }] },
//           cristalli: [{ centro, r, passo, angolo, a }], masse: [{ pos, M, R }],
//           pellicola: { w0, saturazione, vRif }, tempo,
//           specie: { nome: { q, m, luce, vita | vitaMedia, visibile, figli: [{ specie, angolo, quota }] } },
//           sorgenti: [{ pos, dir, v, t0, vita, specie }] }
// angolo e quota delle figlie: un numero, o un intervallo [da, a] da cui si
// estrae a caso. Angolo in gradi, relativo alla direzione della madre. Per la
// luce m è la sua energia (in unità di massa): la sua quantità di moto è m·c.
// le SAGOME: corpi opachi appoggiati sulla lastra. Un lampo di luce uniforme,
// all'istante zero, ne imprime la forma piena (un fotogramma, come una
// radiografia). Sono le campiture: esatte, istantanee, senza riempimenti.
function sagomeImpresse(mondo) {
  if (mondo.lampo === false) return [];
  return (mondo.sagome || []).filter((s) => accesoA(s, 0)).map((s, i) => ({
    sagoma: true, indice: i, contorno: s.contorno, buchi: s.buchi || [], fine: 'lampo', specie: { nome: 'lampo', luce: true }, sorgente: -1, generazione: 0,
    punti: [...s.contorno, s.contorno[0]].map((p) => [p[0], p[1], true, 0, 0, 'luce']),
  }));
}

// ---------- LA CINEMATICA VERA dei decadimenti e degli urti (solo con «relativita»). Energie e impulsi si
// contano in masse, con c = 1: ε = γ·m, π = γ·β·m; la luce ha ε = π. Un quadrivettore è { e, x, y }.
// n corpi nel riferimento in cui il loro impulso totale è zero, con massa invariante W: a ciascuno una direzione e
// una spinta a caso, si toglie la media (così la somma è zero) e poi si riscalano tutte insieme finché l'energia
// torna (Σ√(m² + λ²q²) = W). Per due corpi è la cinematica esatta: schiena contro schiena, con l'impulso obbligato.
function spartisci(W, masse, caso) {
  const n = masse.length, qx = new Array(n), qy = new Array(n); let mx = 0, my = 0, somma = 0;
  for (let i = 0; i < n; i++) { const r = 0.2 + 0.8 * caso(), a = DUE_PI * caso(); qx[i] = r * Math.cos(a); qy[i] = r * Math.sin(a); mx += qx[i] / n; my += qy[i] / n; }
  for (let i = 0; i < n; i++) { qx[i] -= mx; qy[i] -= my; somma += Math.hypot(qx[i], qy[i]); }
  if (!(somma > 1e-9)) { qx.fill(0); qy.fill(0); qx[0] = 1; qx[1] = -1; somma = 2; }
  const energia = (l) => { let e = 0; for (let i = 0; i < n; i++) e += Math.sqrt(masse[i] * masse[i] + l * l * (qx[i] * qx[i] + qy[i] * qy[i])); return e; };
  let lo = 0, hi = W / somma; // (l'energia è almeno λ·Σ|q|: la radice sta sotto W/Σ|q|)
  for (let k = 0; k < 90; k++) { const m = (lo + hi) / 2; if (energia(m) < W) lo = m; else hi = m; }
  return masse.map((m, i) => ({ e: Math.sqrt(m * m + lo * lo * (qx[i] * qx[i] + qy[i] * qy[i])), x: lo * qx[i], y: lo * qy[i] }));
}
// la spinta di Lorentz: un quadrivettore visto da un riferimento in cui il suo va a velocità (bx, by)·c.
// «gamma»: chi chiama lo conosce già come rapporto esatto (energia / massa invariante) e lo passa: ricavarlo da
// 1/√(1 − β²) quando β è a un passo da 1 perde cifre (l'errore cresce come γ²: una coppia nata da un fotone di 6 GeV,
// γ ≈ 6500, usciva con l'energia sbagliata di una parte su 10⁹)
function spinta(v, bx, by, gamma = 0) {
  const b2 = bx * bx + by * by; if (!(b2 > 0)) return v;
  const g = gamma > 0 ? gamma : 1 / Math.sqrt(1 - b2), lungo = (v.x * bx + v.y * by) / b2, k = (g - 1) * lungo + g * v.e;
  return { e: g * (v.e + v.x * bx + v.y * by), x: v.x + k * bx, y: v.y + k * by };
}
// IL DECADIMENTO β (solo se la specie lo dichiara: beta = { Z: carica del nucleo figlio, segno: −1 per β⁺, proibita: 0, 1 o 3 }).
// Tre corpi, nell'ordine [nucleo figlio, elettrone, neutrino]: l'energia dell'elettrone si estrae dallo spettro vero
// (teoria di Fermi: N ∝ F(Z, E)·p·E·(Q − T)², con F = 2πη/(1 − e^(−2πη)), η = ±Z·α·E/p, e per le transizioni «uniche» il
// loro fattore di forma), il neutrino prende il resto, le due direzioni sono a caso e il nucleo rincula con l'impulso
// che avanza: energia e impulso tornano esatti. Nel riferimento della madre, in masse dell'elettrone se m_e = 1.
function spartisciBeta(W, masse, caso, beta) {
  const [M, me] = masse, Q = W - M - me, segno = beta.segno ?? 1, Z = beta.Z ?? 0, alfa = 1 / 137.036;
  const peso = (T) => { const E = T + me, p = Math.sqrt(T * (T + 2 * me)), q = Q - T, eta = (segno * Z * alfa * E) / p, F = Z ? (2 * Math.PI * eta) / (1 - Math.exp(-2 * Math.PI * eta)) : 1, p2 = p * p, q2 = q * q;
    return F * p * E * q2 * (beta.proibita === 3 ? p2 * p2 * p2 + 7 * p2 * p2 * q2 + 7 * p2 * q2 * q2 + q2 * q2 * q2 : beta.proibita === 1 ? p2 + q2 : 1); };
  let massimo = 0; for (let i = 1; i < 64; i++) massimo = Math.max(massimo, peso((Q * i) / 64));
  let T = Q / 3; for (let k = 0; k < 200; k++) { const t = Q * (1e-6 + (1 - 2e-6) * caso()); if (caso() * massimo * 1.1 <= peso(t)) { T = t; break; } }
  const a1 = DUE_PI * caso(), a2 = DUE_PI * caso(), p = Math.sqrt(T * (T + 2 * me)), ex = p * Math.cos(a1), ey = p * Math.sin(a1);
  let q = Q - T, rx = 0, ry = 0; // il neutrino cede al rinculo del nucleo quel poco che serve perché l'energia torni
  for (let k = 0; k < 4; k++) { rx = -(ex + q * Math.cos(a2)); ry = -(ey + q * Math.sin(a2)); q = Q - T - (Math.sqrt(M * M + rx * rx + ry * ry) - M); }
  rx = -(ex + q * Math.cos(a2)); ry = -(ey + q * Math.sin(a2));
  return [{ e: Math.sqrt(M * M + rx * rx + ry * ry), x: rx, y: ry }, { e: T + me, x: ex, y: ey }, { e: q, x: q * Math.cos(a2), y: q * Math.sin(a2) }];
}
// Le figlie di una madre con quadrivettore «madre» e direzione (dx, dy). «specie» è quella della madre:
//   canali      le liste di figlie possibili, dalla più ricca alla più povera (nasce la prima per cui l'energia basta);
//               se mancano, vale la lista «figli»
//   bersaglio   il corpo fermo contro cui avviene l'urto (un nucleone, un nucleo): entra nel conto con la sua massa
//   spettatore  il bersaglio non si rompe e non entra tra le figlie del canale: prende solo l'impulso che avanza (il
//               meno possibile, in avanti), e le figlie partono in avanti (un fotone che fa una coppia accanto a un nucleo)
// Restituisce [{ specie, e, x, y }] (anche il bersaglio, dopo), o null se l'energia non basta per nessun canale.
function figlieVere(sp, madre, dx, dy, catalogo, caso) {
  const massa = (nome) => { const s = risolviSpecie(nome, catalogo); return s.luce ? 0 : s.m ?? 1; };
  const canali = sp.canali || (sp.figli ? [sp.figli.map((f) => (typeof f.specie === 'string' ? f.specie : f.specie.nome))] : []);
  const M = sp.bersaglio ? massa(sp.bersaglio) : 0, pm = Math.hypot(madre.x, madre.y);
  if (sp.bersaglio && sp.spettatore) {
    for (const nomi of canali) {
      const masse = nomi.map(massa), soglia = masse.reduce((a, b) => a + b, 0), Wtot = Math.sqrt(Math.max(0, (madre.e + M) ** 2 - pm * pm));
      if (nomi.length < 2 || !(Wtot - M > soglia * 1.000001)) continue;
      // la massa invariante dell'insieme delle figlie: poco sopra la soglia (così partono strette, in avanti)
      const u = caso(), w = Math.min(soglia * (1 + 3 * u * u), soglia + 0.9 * (Wtot - M - soglia));
      let rinculo = 0, ef = madre.e, pf = 0, q = 0;
      // (il rinculo si cerca a giri finché non cambia più: con sei giri fissi restava uno scarto di 10⁻⁹ dell'energia. Poi
      // le figlie prendono proprio ciò che il nucleo lascia: energia e impulso tornano al bit, non «quasi»)
      for (let k = 0; k < 60; k++) { ef = madre.e - rinculo; pf = Math.sqrt(Math.max(0, ef * ef - w * w)); q = pm - pf; const r = Math.sqrt(M * M + q * q) - M, fermo = Math.abs(r - rinculo) <= 1e-16 * madre.e; rinculo = r; if (fermo) break; }
      ef = madre.e - rinculo; pf = Math.sqrt(Math.max(0, ef * ef - w * w)); q = pm - pf;
      const bx = (pf / ef) * dx, by = (pf / ef) * dy, fuori = spartisci(w, masse, caso).map((v, i) => ({ specie: nomi[i], ...spinta(v, bx, by, ef / w) }));
      fuori.push({ specie: sp.bersaglio, e: M + rinculo, x: q * dx, y: q * dy });
      return fuori;
    }
    return null;
  }
  const e = madre.e + M, W = Math.sqrt(Math.max(0, e * e - pm * pm));
  for (const nomi of canali) {
    const masse = nomi.map(massa); if (nomi.length < 2 || !(W > masse.reduce((a, b) => a + b, 0) * (sp.margine ?? 1.000001))) continue; // (margine: per i nuclei, dove l'energia liberata è un milionesimo della massa)
    return (sp.beta && !sp.bersaglio && nomi.length === 3 ? spartisciBeta(W, masse, caso, sp.beta) : spartisci(W, masse, caso)).map((v, i) => ({ specie: nomi[i], ...spinta(v, madre.x / e, madre.y / e, e / W) }));
  }
  return null;
}

// i nomi della legge che agisce in un punto: gravità (1), campo magnetico (2), materia (4), uniti da «+»
const SENZA_GRAVITA = Object.freeze([0, 0]);
const NOMI_LEGGE = Array.from({ length: 8 }, (_, k) => [k & 1 && 'gravita', k & 2 && 'magnetico', k & 4 && 'materia'].filter(Boolean).join('+') || 'libero');
export function simulaMondo(mondo, opzioni = {}) {
  // più esposizioni sulla stessa lastra: ognuna con i suoi campi, le sue masse,
  // i suoi specchi e le sue sorgenti; le specie, la pellicola e c sono comuni
  if (mondo.esposizioni) {
    const tutte = [], decadimenti = [];
    const lista = [{ domini: mondo.domini, masse: mondo.masse, sorgenti: mondo.sorgenti }, ...mondo.esposizioni];
    for (const s of sagomeImpresse(mondo)) tutte.push({ ...s, id: tutte.length, esposizione: -1 });
    lista.forEach((e, k) => {
      if (!e.sorgenti || !e.sorgenti.length) return;
      const tr = simulaMondo({ ...mondo, esposizioni: undefined, sagome: undefined, domini: e.domini || [], masse: e.masse || [], mappa: e.mappa, sorgenti: e.sorgenti, tempo: e.tempo ?? mondo.tempo }, opzioni);
      for (const t of tr) tutte.push({ ...t, id: tutte.length, esposizione: k - 1 });
      for (const d of tr.decadimenti) decadimenti.push({ ...d, esposizione: k - 1 });
    });
    tutte.decadimenti = decadimenti;
    return tutte;
  }
  const W = mondo.larghezza, H = mondo.altezza, T = mondo.tempo ?? 200;
  const G = mondo.G ?? 1, C = mondo.c ?? 30;
  // le leggi si possono spegnere, gli oggetti pure: per vedere che cosa fa ognuno
  // e anche nel tempo: un interruttore che scatta a metà cambia le traiettorie da lì in poi
  const leggiIn = { ...LEGGI, ...(mondo.leggi || {}) };
  const f0 = { B: 0, K: 0, ...(mondo.fondo || {}) };
  const domini = mondo.domini || [], tutteMasse = mondo.masse || [];
  const continui = campiContinui(mondo), seme = mondo.seme ?? 1, rami = mondo.rami || {}, rel = !!mondo.relativita;
  // LA MATERIA VERA (materia.js; spenta se manca «mezzo», e solo con la relatività). Dove K > 0 una carica la cui specie porta
  // una tabella «perdita» = { x0, dx, G } perde energia secondo quella: G[i] = −dγ/ds (per unità di lunghezza, con K = 1) a
  // ln(γ − 1) = x0 + i·dx; K del luogo la scala (un minerale più denso frena di più), e sotto la tabella la particella è
  // ferma. In più, da mondo.mezzo = { X0, n, fotone, ogniFotone, delta: { A, taglio, specie } } (lunghezze nelle unità del
  // mondo, energie in masse dell'elettrone: le masse delle specie devono essere in masse dell'elettrone):
  //   X0     la lunghezza di radiazione: le DEVIAZIONI MULTIPLE (Highland), a caso ma dal caso della particella
  //   n      l'indice di rifrazione: sopra β = 1/n la carica emette luce CHERENKOV, un fotone (la specie «fotone», che
  //          viaggia a c/n) ogni «ogniFotone» di strada, a cos θ = 1/(nβ) dalla traccia, da una parte e dall'altra
  //   delta  i RAGGI DELTA: gli elettroni strappati con più di «taglio», A·q²/β²·(1/taglio − 1/Tmax) per unità di strada,
  //          con dN/dT ∝ 1/T²; l'energia la paga chi li strappa (la tabella è allora la frenata «ristretta»)
  // e gli urti (camminoLibero) contano la strada pesata con K: dove non c'è materia non si urta niente.
  const mz = rel && mondo.mezzo ? mondo.mezzo : null;
  const frena = (tab, g) => { const u = (Math.log(g - 1) - tab.x0) / tab.dx; if (!(u > 0)) return 0; const i = Math.min(tab.G.length - 2, Math.floor(u)); return tab.G[i] + (tab.G[i + 1] - tab.G[i]) * (u - i); };
  const scatti = [...new Set([...domini, ...tutteMasse].flatMap((o) => (o.interruttori || []).map((e) => e.t)).concat(Object.values(leggiIn).flatMap((v) => (Array.isArray(v) ? v.map((e) => e.t) : []))))].sort((a, b) => a - b);
  const prossimoScatto = (t) => { for (const x of scatti) if (x > t + 1e-12) return x; return Infinity; };
  let S, masse; // lo stato del mondo adesso: tra due scatti non cambia
  const statoA = (t) => {
    const L = {}; for (const k of Object.keys(LEGGI)) L[k] = leggeA(leggiIn[k], t);
    S = { L, fondo: { B: L.magnetico ? f0.B : 0, K: L.materia ? f0.K : 0 }, dom: domini.map((d) => accesoA(d, t)) };
    masse = L.gravita ? tutteMasse.filter((m) => accesoA(m, t)) : [];
  };
  statoA(0);
  const catalogo = mondo.specie || {};
  const pel = { w0: 1, saturazione: 4, vRif: 10, ...(mondo.pellicola || {}) };
  const bordo = mondo.bordo || 'aperto';
  const quale = indiceDomini(domini, W, H, (i) => S.dom[i]);
  const campoIn = (x, y) => {
    const i = quale(x, y), f = S.fondo, L = S.L;
    let B = f.B, K = f.K;
    if (i >= 0) { const d = domini[i]; B = L.magnetico ? d.B ?? f0.B : 0; K = L.materia ? d.K ?? f0.K : 0; }
    if (continui) { if (L.magnetico) B += continui.B(x, y); if (L.materia) K += continui.K(x, y); }
    return { B, K, i };
  };
  // la gravità delle masse: accelerazione di caduta e distanza dalla superficie più vicina
  const gravita = (x, y) => {
    let gx = 0, gy = 0;
    for (const s of masse) { const dx = s.pos[0] - x, dy = s.pos[1] - y, r2 = dx * dx + dy * dy + 1e-9, k = (G * s.M) / (r2 * Math.sqrt(r2)); gx += k * dx; gy += k * dy; }
    return [gx, gy];
  };
  const superficie = (x, y) => { let d = Infinity, chi = -1; masse.forEach((s, j) => { const e = Math.hypot(x - s.pos[0], y - s.pos[1]) - (s.R ?? 0); if (e < d) { d = e; chi = j; } }); return { d, chi }; };
  const lontano = (x, y) => { let d = Infinity; for (const s of masse) d = Math.min(d, Math.hypot(x - s.pos[0], y - s.pos[1])); return d; };
  const passoMax = opzioni.passo ?? Math.max(W, H) / 500;
  const maxParticelle = opzioni.maxParticelle ?? 20000;
  const tracce = [], decadimenti = [];
  const coda = (mondo.sorgenti || []).map((s0, i) => {
    // l'EMISSIONE come evento quantistico: quando parte e in che direzione esatta, estratti
    // dal caso del suo evento (cambiano nei rami); «dal: 'bordo'» la fa entrare dal bordo
    let s = s0;
    if (s0.emissione) {
      const e = s0.emissione, ce = casoEvento(seme, `${i}|emissione`, rami[`${i}`] ?? 0), est = (x, d) => (Array.isArray(x) ? x[0] + ce() * (x[1] - x[0]) : x ?? d);
      const dir = est(e.dir, s0.dir ?? 0), t0 = est(e.t0, s0.t0 ?? 0);
      let pos = s0.pos;
      if (e.dal === 'bordo') {
        const u = est(e.u, 0.5), dx = Math.cos(dir), dy = Math.sin(dir), P = [W / 2 - dy * (u - 0.5) * W, H / 2 + dx * (u - 0.5) * H];
        // all'indietro lungo la direzione fino al bordo
        let tt = Infinity;
        if (dx > 1e-9) tt = Math.min(tt, (P[0] - 0) / dx); if (dx < -1e-9) tt = Math.min(tt, (P[0] - W) / dx);
        if (dy > 1e-9) tt = Math.min(tt, (P[1] - 0) / dy); if (dy < -1e-9) tt = Math.min(tt, (P[1] - H) / dy);
        pos = [Math.min(W - 0.01, Math.max(0.01, P[0] - dx * (tt - 0.01))), Math.min(H - 0.01, Math.max(0.01, P[1] - dy * (tt - 0.01)))];
      }
      s = { ...s0, dir, t0, pos };
    }
    if (!accesoA(s, s.t0 ?? 0)) return null;
    const specie = risolviSpecie(s.specie, catalogo), v = specie.luce ? C : s.v;
    // «vita» sulla sorgente: l'istante in cui QUESTA particella decade (le particelle di una
    // stessa specie decadono ognuna a un istante diverso; la specie ne dà solo la media)
    // una particella può anche CONTINUARE da un livello più grande: con il suo indirizzo (ev), il tempo
    // proprio e la strada già fatti; così il suo caso è lo stesso, e decade dove decadeva lassù
    return { pos: s.pos.slice(), vel: [Math.cos(s.dir ?? 0) * v, Math.sin(s.dir ?? 0) * v], t: s.t0 ?? 0, specie, nascita: s.nascita ?? s.t0 ?? 0, sorgente: i, generazione: s.generazione ?? 0, madre: null, vita: s.vita, ev: s.ev ?? `${i}`, tp0: s.tp0 ?? 0, percorso0: s.percorso0 ?? 0, gamma: s.gamma, impulso: s.impulso };
  }).filter(Boolean);
  let nate = 0;

  while (coda.length && nate < maxParticelle) {
    const p = coda.shift(); nate++;
    const sp = p.specie, luce = !!sp.luce, q = luce ? 0 : sp.q ?? 0, m = sp.m ?? 1;
    // la vita di QUESTA particella: data, o estratta dalla vita media della specie
    // (il suo caso: quello del suo evento, nel ramo scelto per questo universo)
    const caso = casoEvento(seme, p.ev, rami[p.ev] ?? 0);
    // la vita: nel proprio tempo (vitaMedia, si dilata con la velocità) o come cammino libero in
    // un mezzo (camminoLibero: l'urto con la materia, contato nel tempo del laboratorio)
    const vita = p.vita ?? sp.vita ?? (sp.vitaMedia != null ? -sp.vitaMedia * Math.log(1 - caso()) : Infinity);
    let urto = sp.camminoLibero != null ? -sp.camminoLibero * Math.log(1 - caso()) : Infinity; // in unità di lunghezza
    let tp = p.tp0 ?? 0, percorso = p.percorso0 ?? 0; // il tempo proprio e la strada fatta
    const tab = mz && q && sp.perdita ? sp.perdita : null, fondoTab = tab ? Math.exp(tab.x0) : 0 /* (il fondo della tabella, γ − 1: uno per particella) */, casoM = mz ? casoEvento(seme, `${p.ev}|mezzo`, rami[p.ev] ?? 0) : null; let colonna = 0, luceC = 0, lato = 1, nC = 0, nD = 0;
    statoA(p.t); let scatto = prossimoScatto(p.t);
    const visibile = sp.visibile ?? q !== 0;
    const larghezza = (v) => (!visibile ? 0 : q ? pel.w0 * Math.abs(q) * Math.min(pel.saturazione, pel.vRif / Math.max(v, 1e-9)) : pel.w0 * 0.35);
    let [x, y] = p.pos, [vx, vy] = p.vel, t = p.t;
    // IN RELATIVITÀ lo stato di una particella con massa è il suo γ (l'energia, in masse), non la velocità: vicino a c
    // la velocità non distingue più un'energia dall'altra. La velocità (per avanzare) discende da γ, e nessuna è
    // tagliata: un elettrone può avere γ centomila. γ cambia solo dove la materia frena o la gravità tira.
    let gamS = 1;
    const veloceCome = (g) => C * Math.sqrt(Math.max(0, 1 - 1 / (g * g)));
    if (rel && !luce) {
      const v0 = Math.hypot(vx, vy);
      if (p.gamma > 1 && v0 > 0) { gamS = p.gamma; const k = veloceCome(gamS) / v0; vx *= k; vy *= k; } else gamS = 1 / Math.sqrt(Math.max(1e-12, 1 - (v0 * v0) / (C * C)));
    }
    // il quadrivettore di adesso (in masse, c = 1), e le figlie che la cinematica permette (null: l'energia non basta)
    // (PRESTAZIONI, stessi bit: nessuna funzione qui dentro legge la posizione, la velocità o γ della particella dal suo
    // ambito — le ricevono come argomenti —: così restano variabili semplici, e non vivono in un contesto sul mucchio
    // rifatto a ogni passo. I conti sono gli stessi, nello stesso ordine)
    const quadri = (vx, vy, gamS) => { const v = Math.hypot(vx, vy) || 1e-12, pi = luce ? (p.impulso ?? m * C) / C : m * Math.sqrt(Math.max(0, gamS * gamS - 1)); return { e: luce ? pi : gamS * m, x: (pi * vx) / v, y: (pi * vy) / v }; };
    // l'accelerazione di gravità: per la luce solo la parte trasversale, doppia, divisa per n²
    const accel = (px, py, ux, uy) => {
      if (!masse.length) return [0, 0];
      const [gx, gy] = gravita(px, py);
      if (!luce) return [gx, gy];
      const k = 2, par = gx * ux + gy * uy;
      return [k * (gx - par * ux), k * (gy - par * uy)];
    };
    // un passo lungo h da (x, y) con velocità (vx, vy): l'accelerazione (ax, ay), la rotazione w del campo, la frenata kq
    const avanza = (h, x, y, vx, vy, ax, ay, w, kq) => {
      // mezzo calcio di gravità, poi rotazione esatta, Bethe esatto e corda
      // dell'arco, poi l'altro mezzo calcio (velocity Verlet)
      let wx = vx + (ax * h) / 2, wy = vy + (ay * h) / 2;
      const v0 = Math.hypot(wx, wy) || 1e-12;
      const fi = w * h, v3 = v0 * v0 * v0 - 3 * kq * h, v1 = kq ? (v3 > 0 ? Math.cbrt(v3) : 0) : v0;
      const sm = Math.sin(fi / 2), vm = (v0 + v1) / 2, fattore = Math.abs(fi) > 1e-9 ? sm / (fi / 2) : 1;
      const ux = wx / v0, uy = wy / v0, cm = Math.cos(fi / 2);
      const nx = x + vm * h * fattore * (ux * cm - uy * sm), ny = y + vm * h * fattore * (ux * sm + uy * cm);
      const cf = Math.cos(fi), sf = Math.sin(fi);
      wx = v1 * (ux * cf - uy * sf); wy = v1 * (ux * sf + uy * cf);
      if (masse.length) { const u = Math.hypot(wx, wy) || 1e-12, [bx, by] = accel(nx, ny, wx / u, wy / u); wx += (bx * h) / 2; wy += (by * h) / 2; }
      if (luce) { const u = Math.hypot(wx, wy) || 1e-12, s = C / u; wx *= s; wy *= s; }
      else if (!rel) { const u = Math.hypot(wx, wy); if (u > 0.99 * C) { const s = (0.99 * C) / u; wx *= s; wy *= s; } } // nessuna particella con massa raggiunge c
      else { const u = Math.hypot(wx, wy); if (u >= C) { const s = (C * (1 - 1e-12)) / u; wx *= s; wy *= s; } } // (in relatività il limite è c, e l'energia sta in γ)
      return { x: nx, y: ny, vx: wx, vy: wy, ferma: kq > 0 && v3 <= 0 };
    };
    let c = campoIn(x, y);
    // il nome della legge che agisce in un punto, per colorare e per spiegare
    // (PRESTAZIONI, stessi risultati: i nomi possibili sono otto, scritti una volta; prima ogni passo faceva un array e un join)
    const legge = (cc, gx, gy, v, vx, vy) => {
      let g = 0;
      if (masse.length) { const gp = Math.abs(gx * vy - gy * vx) / (v || 1); if ((gp * (luce ? 2 : 1)) / ((v * v) || 1) > 1 / (6 * Math.max(W, H))) g = 1; }
      if (luce) return NOMI_LEGGE[g];
      return NOMI_LEGGE[g | (q && cc.B ? 2 : 0) | (q && cc.K ? 4 : 0)];
    };
    // (PRESTAZIONI, stessi bit: la velocità di fine passo, |v| per la pellicola e per la legge, è anche quella con cui parte il
    // passo dopo — vx e vy non cambiano in mezzo —: si calcola una volta)
    const g0 = gravita(x, y); let vFine = Math.hypot(vx, vy);
    const punti = [[x, y, visibile, t, larghezza(vFine), legge(c, g0[0], g0[1], vFine, vx, vy)]];
    let fine = 'tempo', guardia = 0, gamG0 = NaN, G0 = 0;
    while (t < T && guardia++ < (opzioni.maxPassi ?? 200000)) {
      const v = vFine;
      if (v < 1e-9) { fine = 'ferma'; break; }
      // un interruttore scatta: il mondo cambia qui, la particella prosegue nel mondo nuovo
      if (t >= scatto - 1e-12) { statoA(t); scatto = prossimoScatto(t); c = campoIn(x, y); }
      if (S.L.decadimento && (rel ? tp >= vita : t >= p.nascita + vita)) { fine = 'decade'; break; }
      if ((mz ? colonna : percorso) >= urto) {
        // (in relatività un urto avviene solo se l'energia basta almeno per il canale più povero; se no, prosegue)
        if (!rel || !sp.figli || !(sp.canali || sp.bersaglio) || figlieVere(sp, quadri(vx, vy, gamS), vx / v, vy / v, catalogo, () => 0.5)) { fine = 'decade'; break; }
        urto = Infinity;
      }
      const gam = rel ? (luce ? 1 / Math.sqrt(Math.max(1e-12, 1 - (v * v) / (C * C))) : gamS) : 1;
      const w = q ? (q * c.B) / (m * gam) : 0, kq = q && !tab ? (c.K * q * q) / m : 0;
      let ax = 0, ay = 0; if (masse.length) [ax, ay] = accel(x, y, vx / v, vy / v); // (senza masse l'accelerazione è [0, 0]: senza farne un array)
      // il passo: piccolo abbastanza per la svolta, per il rallentamento, vicino alle masse
      let dt = Math.min(passoMax / v, T - t, S.L.decadimento ? (rel ? (vita - tp) * gam : p.nascita + vita - t) : Infinity, scatto - t, isFinite(urto) ? (mz ? (c.K > 0 ? (urto - colonna) / (v * c.K) + 1e-12 : Infinity) : (urto - percorso) / v + 1e-12) : Infinity);
      if (tab && c.K > 0) { G0 = frena(tab, gamS); gamG0 = gamS; if (!(G0 > 0)) { fine = 'ferma'; break; } dt = Math.min(dt, (0.08 * (gamS - 1)) / (c.K * G0 * v) + 1e-12); }
      if (masse.length) { const L = lontano(x, y), a = Math.hypot(ax, ay) + 1e-12; dt = Math.min(dt, (0.02 * L) / v, 0.1 * Math.sqrt(L / a)); }
      if (w) dt = Math.min(dt, 0.06 / Math.abs(w));
      if (kq) dt = Math.min(dt, (0.15 * v * v * v) / (3 * kq) + 1e-12);
      if (continui && q) dt = Math.min(dt, continui.lambda(x, y) / (14 * v));
      let s = avanza(dt, x, y, vx, vy, ax, ay, w, kq);
      // si attraversa un confine di dominio: si accorcia il passo fino al confine
      // (il campo nel punto d'arrivo serve anche a fine passo, se la particella è ancora lì: si tiene)
      let cArrivo = campoIn(s.x, s.y);
      if (cArrivo.i !== c.i) {
        let lo = 0, hi = dt;
        for (let k = 0; k < 22; k++) { const mid = (lo + hi) / 2, r = avanza(mid, x, y, vx, vy, ax, ay, w, kq); if (campoIn(r.x, r.y).i === c.i) lo = mid; else hi = mid; }
        dt = hi; s = avanza(dt, x, y, vx, vy, ax, ay, w, kq); cArrivo = null;
      }
      const ds = Math.hypot(s.x - x, s.y - y);
      percorso += ds; x = s.x; y = s.y; vx = s.vx; vy = s.vy; t += dt; if (rel) tp += dt / gam;
      if (rel && !luce) { // γ: nuovo dove materia o gravità hanno cambiato la velocità; altrove resta lui, e la velocità lo segue
        const u = Math.hypot(vx, vy);
        if (kq || masse.some((ms) => ms.M)) gamS = 1 / Math.sqrt(Math.max(1e-12, 1 - (u * u) / (C * C)));
        else if (u > 0) { const k = veloceCome(gamS) / u; vx *= k; vy *= k; }
      }
      if (mz && c.K > 0) { // nella materia vera: la frenata della tabella, le deviazioni, la luce Cherenkov, i raggi delta
        const dm = v * dt; colonna += dm * c.K; // (la strada di questo passo, dalla velocità: la differenza delle posizioni si perde quando il passo è minuscolo)
        if (tab) {
          const G1 = gamS === gamG0 ? G0 : frena(tab, gamS), g2 = gamS - c.K * G1 * dm, G2 = g2 > 1 ? frena(tab, g2) : 0; let b2 = 1 - 1 / (gamS * gamS);
          if (mz.delta && m > 1.5 && b2 > 0) { // un elettrone strappato: parte a cos²θ = T·(E + 1)²/(p²·(T + 2)) dalla traccia
            const Tmax = (2 * (gamS * gamS - 1)) / (1 + (2 * gamS) / m + 1 / (m * m)), Tc = mz.delta.taglio, quanti = Tmax > Tc ? ((c.K * mz.delta.A * q * q) / b2) * (1 / Tc - 1 / Tmax) * dm : 0;
            if (quanti > 0 && casoM() < quanti) {
              const T = 1 / (1 / Tc - casoM() * (1 / Tc - 1 / Tmax)), E = gamS * m, cos = Math.min(1, Math.sqrt((T * (E + 1) * (E + 1)) / (m * m * (gamS * gamS - 1) * (T + 2)))), a = Math.atan2(vy, vx) + (casoM() < 0.5 ? -1 : 1) * Math.acos(cos), fs = risolviSpecie(mz.delta.specie || 'elettrone', catalogo), vf = C * Math.sqrt(1 - 1 / ((1 + T) * (1 + T)));
              coda.push({ pos: [x, y], vel: [vf * Math.cos(a), vf * Math.sin(a)], t, nascita: t, specie: fs, gamma: 1 + T, sorgente: p.sorgente, generazione: p.generazione + 1, madre: { specie: sp.nome, t, evento: p.ev }, ev: `${p.ev}.d${nD++}` });
              gamS -= T / m;
            }
          }
          gamS -= (c.K * dm * (G1 + G2)) / 2;
          if (!(gamS - 1 > fondoTab)) { gamS = 1 + fondoTab; s.ferma = true; }
          const u = Math.hypot(vx, vy) || 1e-12, k = veloceCome(gamS) / u; vx *= k; vy *= k; b2 = 1 - 1 / (gamS * gamS);
          if (mz.X0 > 0 && !s.ferma) { // la deviazione multipla di questo tratto: θ0 = 13,6 MeV/(β·c·p)·|q|·√(x/X0)·(1 + 0,038·ln(x·q²/(X0·β²)))
            const tr = (dm * c.K) / mz.X0, th = (26.614 / (m * b2 * gamS)) * Math.abs(q) * Math.sqrt(tr) * Math.max(0.2, 1 + 0.038 * Math.log((tr * q * q) / b2)) * Math.sqrt(-2 * Math.log(1 - casoM())) * Math.cos(DUE_PI * casoM());
            const cs = Math.cos(th), sn = Math.sin(th), wx = vx * cs - vy * sn; vy = vx * sn + vy * cs; vx = wx;
          }
        }
        if (mz.n > 1 && mz.fotone && q && !luce && mz.ogniFotone > 0) { // sopra la velocità della luce nel mezzo
          const bn = (Math.hypot(vx, vy) / C) * mz.n;
          if (bn > 1) { luceC += dm; while (luceC >= mz.ogniFotone) { luceC -= mz.ogniFotone; lato = -lato; const a = Math.atan2(vy, vx) + lato * Math.acos(1 / bn), fs = risolviSpecie(mz.fotone, catalogo), vf = C / mz.n;
            coda.push({ pos: [x, y], vel: [vf * Math.cos(a), vf * Math.sin(a)], t, nascita: t, specie: fs, sorgente: p.sorgente, generazione: p.generazione + 1, madre: { specie: sp.nome, t, evento: p.ev }, ev: `${p.ev}.c${nC++}` }); } }
        }
      }
      // il corpo di una massa: chi lo tocca ci cade dentro
      if (masse.length) {
        const { d, chi } = superficie(x, y);
        if (d <= 0) {
          const mm = masse[chi], dx = x - mm.pos[0], dy = y - mm.pos[1], r = Math.hypot(dx, dy) || 1, R = mm.R ?? 0;
          x = mm.pos[0] + (dx / r) * R; y = mm.pos[1] + (dy / r) * R;
          punti.push([x, y, visibile, t, larghezza(Math.hypot(vx, vy)), punti[punti.length - 1][5]]);
          fine = 'caduta'; break;
        }
      }
      // il bordo del mondo
      if (x < 0 || y < 0 || x > W || y > H) {
        if (bordo === 'periodico') {
          punti.push([x, y, visibile, t, larghezza(Math.hypot(vx, vy)), punti[punti.length - 1][5]]);
          x = ((x % W) + W) % W; y = ((y % H) + H) % H;
          punti.push([x, y, false, t, 0, 'libero']);
        } else { fine = 'fuori'; punti.push([x, y, visibile, t, larghezza(Math.hypot(vx, vy)), punti[punti.length - 1][5]]); break; }
      }
      c = cArrivo && x === s.x && y === s.y ? cArrivo : campoIn(x, y);
      const gg = masse.length ? gravita(x, y) : SENZA_GRAVITA; vFine = Math.hypot(vx, vy);
      punti.push([x, y, visibile, t, larghezza(vFine), legge(c, gg[0], gg[1], vFine, vx, vy)]);
      if (s.ferma) { fine = 'ferma'; vx = 0; vy = 0; break; }
    }
    if (visibile && punti.length > 1) tracce.push({ id: tracce.length, punti, fine, specie: sp, sorgente: p.sorgente, generazione: p.generazione, madre: p.madre, evento: p.ev, ...(rel ? (luce ? { impulso: p.impulso ?? m * C } : { gamma: gamS }) : {}) });
    // il decadimento: le figlie partono da qui, ora
    if (fine === 'decade' && sp.figli) {
      // IN RELATIVITÀ: la cinematica vera. Le figlie nascono nel riferimento della madre (o del centro di massa, se c'è
      // un bersaglio) con energia e impulso che tornano esatti, poi la spinta di Lorentz le porta nel laboratorio. Le
      // figlie «perse» (neutrini, il nucleone o il nucleo colpito) prendono la loro parte ma non si seguono.
      const prima = rel ? quadri(vx, vy, gamS) : null, v0 = Math.hypot(vx, vy) || 1e-12, vere = rel ? figlieVere(sp, prima, vx / v0, vy / v0, catalogo, caso) : null;
      if (vere) {
        for (let k = 0; k < vere.length; k++) { const f = vere[k];
          const fs = risolviSpecie(f.specie, catalogo), pi = Math.hypot(f.x, f.y); if (fs.persa || !(pi > 0)) continue;
          const mf = fs.luce ? 0 : fs.m ?? 1, vf = fs.luce ? C : (C * pi) / f.e;
          coda.push({ pos: [x, y], vel: [(vf * f.x) / pi, (vf * f.y) / pi], t, nascita: t, specie: fs, impulso: fs.luce ? pi * C : undefined, gamma: fs.luce ? undefined : f.e / mf, sorgente: p.sorgente, generazione: p.generazione + 1, madre: { specie: sp.nome, t, evento: p.ev }, ev: `${p.ev}.${k}` });
        }
      } else {
        const v = Math.hypot(vx, vy), dir = Math.atan2(vy, vx), P = luce ? (p.impulso ?? m * C) : rel ? (m * v) / Math.sqrt(Math.max(1e-12, 1 - (v * v) / (C * C))) : m * v;
        for (let k = 0; k < sp.figli.length; k++) { const f = sp.figli[k];
          const estrai = (x, d) => (Array.isArray(x) ? x[0] + caso() * (x[1] - x[0]) : x ?? d);
          const fs = risolviSpecie(f.specie, catalogo), a = dir + (estrai(f.angolo, 0) * Math.PI) / 180, mf = fs.m ?? 1;
          const pf = estrai(f.quota, 0.5) * (P || m * pel.vRif);
          // con la relatività: dall'impulso alla velocità, v = p / √(m² + (p/c)²), mai oltre c
          const vf = fs.luce ? C : f.v != null ? f.v : rel ? Math.min(0.99 * C, pf / Math.sqrt(mf * mf + (pf / C) ** 2)) : Math.min(0.95 * C, pf / mf);
          coda.push({ pos: [x, y], vel: [Math.cos(a) * vf, Math.sin(a) * vf], t, nascita: t, specie: fs, impulso: fs.luce && rel ? pf : undefined, sorgente: p.sorgente, generazione: p.generazione + 1, madre: { specie: sp.nome, t, evento: p.ev }, ev: `${p.ev}.${k}` });
        }
      }
      decadimenti.push({ pos: [x, y], t, specie: sp.nome, sorgente: p.sorgente, generazione: p.generazione, evento: p.ev, ...(vere ? { prima, bersaglio: sp.bersaglio ?? null, prodotti: vere } : {}) });
    }
  }
  for (const s of sagomeImpresse(mondo)) tracce.push({ ...s, id: tracce.length });
  tracce.decadimenti = decadimenti;
  return tracce;
}

// ---------- le forze in un punto, separate per legge (per vederle)
// Restituisce le accelerazioni che ogni legge dà a una particella di quella
// specie che passa in (x, y) con velocità (vx, vy), e il dominio dove si trova.
export function forze(mondo, specie, x, y, vx, vy, esposizione = -1, t = 0) {
  if (esposizione >= 0 && mondo.esposizioni) { const e = mondo.esposizioni[esposizione]; mondo = { ...mondo, domini: e.domini || [], masse: e.masse || [], mappa: e.mappa }; }
  const leggi = {}; for (const k of Object.keys(LEGGI)) leggi[k] = leggeA((mondo.leggi || {})[k] ?? true, t);
  mondo = { ...mondo, domini: (mondo.domini || []).filter((d) => accesoA(d, t)), masse: leggi.gravita ? (mondo.masse || []).filter((m) => accesoA(m, t)) : [],
    fondo: { ...(mondo.fondo || {}), B: leggi.magnetico ? mondo.fondo?.B : 0, K: leggi.materia ? mondo.fondo?.K : 0 } };
  if (!leggi.magnetico || !leggi.materia) mondo.domini = mondo.domini.map((d) => ({ ...d, B: leggi.magnetico ? d.B : 0, K: leggi.materia ? d.K : 0 }));
  const fondo = { B: 0, K: 0, ...(mondo.fondo || {}) }, G = mondo.G ?? 1;
  let d = { ...fondo, i: -1 };
  (mondo.domini || []).forEach((dm, i) => { if (dentro(dm.forma, x, y)) d = { B: dm.B ?? fondo.B, K: dm.K ?? fondo.K, i }; });
  const continui = campiContinui(mondo);
  if (continui) d = { ...d, B: d.B + (leggi.magnetico ? continui.B(x, y) : 0), K: d.K + (leggi.materia ? continui.K(x, y) : 0) };
  const sp = risolviSpecie(specie, mondo.specie), luce = !!sp.luce, q = luce ? 0 : sp.q ?? 0, m = sp.m ?? 1;
  const v = Math.hypot(vx, vy) || 1e-12, ux = vx / v, uy = vy / v, out = { dominio: d, v };
  let gx = 0, gy = 0;
  for (const s of mondo.masse || []) { const dx = s.pos[0] - x, dy = s.pos[1] - y, r2 = dx * dx + dy * dy + 1e-9, k = (G * s.M) / (r2 * Math.sqrt(r2)); gx += k * dx; gy += k * dy; }
  if (luce) { const par = gx * ux + gy * uy; gx = 2 * (gx - par * ux); gy = 2 * (gy - par * uy); }
  if (gx || gy) out.gravita = [gx, gy];
  if (q && d.B) { const w = (q * d.B) / m; out.magnetico = [-w * vy, w * vx]; }
  if (q && d.K) { const a = (d.K * q * q) / (m * v * v); out.materia = [-a * ux, -a * uy]; }
  return out;
}

// ---------- un esperimento: più esposizioni sovrapposte sulla stessa lastra
export function simulaEsperimento(esp, opzioni = {}) {
  const out = [];
  for (const [k, mondo] of (esp.esposizioni || []).entries()) {
    for (const tr of simulaMondo({ larghezza: esp.larghezza, altezza: esp.altezza, ...mondo }, opzioni)) out.push({ ...tr, esposizione: k });
  }
  return out;
}

// ---------- utilità fisiche per chi progetta un esperimento
// raggio di curvatura: r = m·v / (|q|·|B|)
export const raggio = (specie, v, B) => ((specie.m ?? 1) * v) / (Math.abs(specie.q) * Math.abs(B));
// gittata nella materia: m·v⁴ / (4·K·q²)
export const gittata = (specie, v, K) => ((specie.m ?? 1) * v ** 4) / (4 * K * specie.q * specie.q);
// la velocità che dà una certa gittata
export const velocitaPerGittata = (specie, R, K) => Math.pow((4 * K * specie.q * specie.q * R) / (specie.m ?? 1), 0.25);
// il tempo per fermarsi: m·v³ / (3·K·q²)
export const tempoDiArresto = (specie, v, K) => ((specie.m ?? 1) * v ** 3) / (3 * K * specie.q * specie.q);
// velocità dell'orbita circolare attorno a una massa: √(G·M/r)
export const velocitaOrbitale = (G, M, r) => Math.sqrt((G * M) / r);
// deflessione della luce che passa a distanza b: 4·G·M/(b·c²)
export const deflessioneLuce = (G, M, b, c) => (4 * G * M) / (b * c * c);
