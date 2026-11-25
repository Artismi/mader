// mare_lungo.js — IL MARE LUNGO CHE ARRIVA DALLE TEMPESTE LONTANE, nell'istante e nel punto in cui lo si guarda.
//
// mare.js dà, cella per cella, il vento medio della stagione e le onde che quel vento alza (campoOnde), e un mare lungo
// fatto spargendo quell'energia sulle celle vicine: senza tempo e senza strada. Qui il mare lungo ha una sorgente, una
// strada e un ritardo:
//   · LE SORGENTI. Ogni cella di mare della carta di mare.js col suo vento è una sorgente. Il vento di un momento non è
//     quello medio: sul mare la sua distribuzione è vicina a una Weibull di forma k = 2 (Monahan 2006, J. Climate 19, 497),
//     quindi U = Ū·w con w = √(−ln(1 − u))/Γ(3/2) (media 1). Ogni cella cambia «episodio» quando il vento ha portato via
//     l'aria che c'era sopra (ipotesi di Taylor 1938: il tempo di un episodio è il lato della cella diviso per il vento
//     medio), e l'estrazione u è il nodo (I, J, n) del reticolo con nome «…/mare lungo» (eventi.js); tra un episodio e il
//     seguente il vento passa in linea retta, senza salti.
//   · LE ONDE DELLA SORGENTE: quelle che quel vento alza su quel tratto libero (le leggi di campoOnde di mare.js: JONSWAP,
//     Hasselmann e altri 1973, H = 1,6·10⁻³·√(gF)·U/g, T = 0,286·(gF/U²)^⅓·U/g, fino al mare pienamente sviluppato di
//     Pierson e Moskowitz 1964, H = 0,243·U²/g, T = 8,13·U/g), con la forma in frequenza di Pierson e Moskowitz,
//     S(f) ∝ f⁻⁵·exp(−1,25·(f_p/f)⁴), divisa in bande di periodo.
//   · LA STRADA: il cerchio massimo dalla sorgente al punto, se resta sul mare (la si segue sulla carta di mare.js: una cella
//     di terra la ferma). Ogni periodo T viaggia alla sua velocità di gruppo in acqua alta, c_g = g·T/(4π): l'onda di periodo
//     T che arriva adesso è partita quando a quella sorgente soffiava il vento di allora (t − d/c_g). Così i periodi lunghi
//     arrivano prima, e il mare lungo di un punto cambia con le tempeste che lo hanno mandato.
//   · QUANTO NE ARRIVA: la parte che la sorgente manda verso il punto (la distribuzione in direzione del mare di vento,
//     (2/π)·cos²θ attorno al vento), sparsa sull'arco R·sin(d/R) che il ventaglio copre a quella distanza (l'energia di una
//     sorgente larga ℓ diventa ℓ/(R·sin Δ) volte più rada: la dispersione angolare), e smorzata con la distanza: le misure da
//     satellite danno lunghezze di smorzamento da 3300 km a oltre 20 000 km (Ardhuin, Chapron e Collard 2009, GRL 36,
//     L06607); si prende la più corta, quella dei mari lunghi ripidi che le tempeste mandano.
// → per ogni banda di periodo: altezza significativa (m), periodo (s), direzione in cui va (est, nord); le più forti per prime.
// NON TORNA (dichiarato): le sorgenti sono le celle della carta, non i cicloni con la loro forma; la strada non rifrange
// sui fondali; il mare lungo del punto non toglie energia alla sorgente; l'episodio è lo stesso su tutta la cella.
import { reticolo } from './eventi.js';
import { normaleCumulata } from './finestra.js';

const RAD = Math.PI / 180, GAMMA_15 = 0.886226925452758; // Γ(3/2)
export const MARE_LUNGO = Object.freeze({ smorza: 3.3e6, periodi: Array.from({ length: 13 }, (_, k) => 2 * 1.22 ** k), passiStrada: 24, vicino: 1.5 });
const memo = new WeakMap();

function sorgenti(st) {
  let m = memo.get(st); if (m) return m;
  const { W, H } = st, R = st.raggioM, g = st.gravita || 9.81, lista = [], dy = (Math.PI * R) / H, caso = reticolo(`${st.radice}/mare lungo`); // (l'episodio n della cella (I, J): il nodo (I, J, n) del reticolo con nome)
  const tratto = st.onde?.tratto, bagnato = st.bagnato, mare = new Uint8Array(W * H);
  for (let k = 0; k < W * H; k++) mare[k] = bagnato ? (bagnato[k] > 0.5 ? 1 : 0) : 1;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i; if (!mare[k]) continue; const u = st.vento.u[k], v = st.vento.v[k], U = Math.hypot(u, v); if (!(U > 1)) continue;
    const lat = 90 - ((j + 0.5) / H) * 180, lon = ((i + 0.5) / W) * 360 - 180, lato = Math.sqrt(dy * dy * Math.max(0.05, Math.cos(lat * RAD)) * 2);
    lista.push({ i, j, lon, lat, ux: u / U, uy: v / U, U, F: Math.max(tratto ? tratto[k] : dy, 0.5 * dy), lato, episodio: dy / U }); }
  m = { lista, mare, W, H, R, g, caso, strade: new Map() }; memo.set(st, m); return m;
}
// il vento della sorgente all'istante te (Weibull k = 2 per episodio, in linea retta tra un episodio e il seguente)
function ventoDi(s, te, caso) { const x = te / s.episodio, n = Math.floor(x), f = x - n, w = (q) => Math.sqrt(-Math.log(1 - Math.min(0.999999, normaleCumulata(caso(s.i, s.j, q))))) / GAMMA_15; return s.U * ((1 - f) * w(n) + f * w(n + 1)); }
// le onde che un vento U alza su un tratto F (campoOnde di mare.js): [H (m), T (s)]
function ondeDi(U, F, g) { const chi = (g * F) / (U * U); return [(Math.min(1.6e-3 * Math.sqrt(chi), 0.243) * U * U) / g, (Math.min(0.286 * Math.cbrt(chi), 8.13) * U) / g]; }
// la parte dell'energia di Pierson e Moskowitz (picco Tp) nella banda di periodo [Ta, Tb]: ∫S(f)df normalizzato (in forma chiusa)
const parteBanda = (Tp, Ta, Tb) => { const C = (f) => Math.exp(-1.25 * (1 / Tp / f) ** 4); return Math.max(0, C(1 / Ta) - C(1 / Tb)); }; // (∫ f⁻⁵·e^(−1,25(fp/f)⁴) df ∝ e^(−1,25(fp/f)⁴))

// la strada dalla sorgente al punto (gradi) è tutta sul mare? (si campiona il cerchio massimo sulla carta)
function stradaLibera(m, s, lon, lat) {
  const a1 = s.lat * RAD, b1 = s.lon * RAD, a2 = lat * RAD, b2 = lon * RAD, p1 = [Math.cos(a1) * Math.cos(b1), Math.cos(a1) * Math.sin(b1), Math.sin(a1)], p2 = [Math.cos(a2) * Math.cos(b2), Math.cos(a2) * Math.sin(b2), Math.sin(a2)];
  const n = MARE_LUNGO.passiStrada; for (let q = 1; q < n; q++) { const t = q / n, x = p1[0] * (1 - t) + p2[0] * t, y = p1[1] * (1 - t) + p2[1] * t, z = p1[2] * (1 - t) + p2[2] * t, r = Math.hypot(x, y, z) || 1;
    const la = Math.asin(z / r) / RAD, lo = Math.atan2(y, x) / RAD, i = ((Math.floor(((lo + 180) / 360) * m.W) % m.W) + m.W) % m.W, j = Math.max(0, Math.min(m.H - 1, Math.floor(((90 - la) / 180) * m.H))); if (!m.mare[j * m.W + i]) return false; }
  return true;
}

// il mare lungo nel punto (gradi) all'istante t (s): [{ H, T, lx, ly }] dalla banda più forte
export function mareLungo(st, lon, lat, t) {
  if (!st || !st.esiste || !st.vento) return [];
  const m = sorgenti(st), R = m.R, g = m.g, Tb = MARE_LUNGO.periodi, nb = Tb.length, E = new Float64Array(nb), Ex = new Float64Array(nb), Ey = new Float64Array(nb);
  const iP = ((Math.floor(((lon + 180) / 360) * m.W) % m.W) + m.W) % m.W, jP = Math.max(0, Math.min(m.H - 1, Math.floor(((90 - lat) / 180) * m.H))), chiave = jP * m.W + iP;
  let strade = m.strade.get(chiave); if (!strade) { strade = new Map(); m.strade.set(chiave, strade); if (m.strade.size > 64) m.strade.delete(m.strade.keys().next().value); }
  const a2 = lat * RAD, b2 = lon * RAD;
  for (const s of m.lista) {
    const a1 = s.lat * RAD, b1 = s.lon * RAD, cosD = Math.sin(a1) * Math.sin(a2) + Math.cos(a1) * Math.cos(a2) * Math.cos(b2 - b1), D = Math.acos(Math.max(-1, Math.min(1, cosD))), d = R * D;
    if (D < (MARE_LUNGO.vicino * Math.PI) / m.H || Math.sin(D) < 1e-3) continue; // (il mare di vento di lì è quello del punto)
    // la direzione con cui parte verso il punto (da nord verso est) e quella con cui arriva
    const yS = Math.sin(b2 - b1) * Math.cos(a2), xS = Math.cos(a1) * Math.sin(a2) - Math.sin(a1) * Math.cos(a2) * Math.cos(b2 - b1), parte = Math.atan2(yS, xS);
    const ct = s.ux * Math.sin(parte) + s.uy * Math.cos(parte); if (ct <= 0) continue; // (il vento soffia via dal punto)
    let libera = strade.get(s); if (libera === undefined) { libera = stradaLibera(m, s, lon, lat); strade.set(s, libera); } if (!libera) continue;
    const yA = Math.sin(b1 - b2) * Math.cos(a1), xA = Math.cos(a2) * Math.sin(a1) - Math.sin(a2) * Math.cos(a1) * Math.cos(b1 - b2), verso = Math.atan2(yA, xA) + Math.PI; // (arriva andando via dalla sorgente)
    const geo = ((2 / Math.PI) * ct * ct * s.lato) / (R * Math.sin(D)) * Math.exp(-d / MARE_LUNGO.smorza);
    for (let b = 0; b < nb; b++) { const T = Tb[b], cg = (g * T) / (4 * Math.PI), U = ventoDi(s, t - d / cg, m.caso); if (!(U > 1)) continue; const [Hs, Tp] = ondeDi(U, s.F, g);
      const Ta = b > 0 ? Math.sqrt(Tb[b - 1] * T) : T / Math.sqrt(Tb[1] / Tb[0]), Tz = b < nb - 1 ? Math.sqrt(Tb[b + 1] * T) : T * Math.sqrt(Tb[1] / Tb[0]), e = ((Hs * Hs) / 16) * parteBanda(Tp, Ta, Tz) * geo;
      E[b] += e; Ex[b] += e * Math.sin(verso); Ey[b] += e * Math.cos(verso); } }
  const out = []; for (let b = 0; b < nb; b++) if (E[b] > 0) { const r = Math.hypot(Ex[b], Ey[b]) || 1; out.push({ H: 4 * Math.sqrt(E[b]), T: Tb[b], lx: Ex[b] / r, ly: Ey[b] / r }); }
  return out.sort((a, b) => b.H - a.H);
}
