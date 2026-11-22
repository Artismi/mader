// finestra.js — LA FINESTRA A OGNI DISTANZA (PROGETTO.md, lavoro 9; INTRECCIO.md, regole 4, 8, 9 e 14): il mare.
//
// A ogni distanza si calcola, con la legge di quella grana, SOLO la finestra inquadrata, come campione condizionato della
// grana sopra; riassunta, la finestra ridà il padre (M∘μ = I). Qui per l'acqua del mare (mare.js); la stessa forma passerà
// alla roccia, all'aria e al suolo (PROGETTO.md, punto 9).
//
// IL PADRE di ogni finestra è lo stato del mare in quel punto, letto dalle funzioni di mare.js e basta (luogo, ondeNelPunto,
// campioneAcqua, coloreMare): il vento di meteo.js, l'altezza e il periodo delle onde che quel vento alza su quel tratto
// libero (campoOnde), la corrente, la temperatura, la salinità, gli ioni e la torbidità del bilancio dei sali. Chi cambia
// la chimica di mare.js o di chimica.js cambia da sé ciò che si vede qui: niente è copiato.
//
// LE GRANE non sono soglie: ogni popolazione si mostra nelle finestre dove la sua taglia sta tra un punto dell'immagine e il
// lato della finestra (il principio della nebbia: ciò che è più piccolo di un punto è il colore dell'acqua; ciò che è più
// grande della finestra è la grana sopra, di cui la finestra è un pezzo). Così il passaggio tra le scale è continuo.
//   DA LONTANO   il colore (l'ottica dell'acqua e di ciò che porta: coloreMare) e lo stato del mare: lo SPETTRO delle onde
//                di quel vento (Elfouhaily e altri 1997, «unified directional spectrum»: la parte lunga col picco e l'età
//                dell'onda, la parte corta delle onde capillari dalla velocità d'attrito del vento), con la dispersione
//                gravità-capillarità ω² = (g·k + σ/ρ·k³)·tanh(k·d) con la tensione superficiale σ di QUELL'acqua
//                (IAPWS 1994 per l'acqua pura, Sharqawy e altri 2010 per il sale) e la gravità del pianeta; la direzione
//                dal vento (Mitsuyasu e altri 1975: cos^2s, s dall'età dell'onda); il mare lungo a parte. L'energia della
//                parte lunga è quella che campoOnde ha dato a quel punto (Hs: una fonte sola); il tratto libero e la durata
//                del vento dicono chi limita la crescita (CEM 2002: t_min = 68,8·χ^(2/3)·U/g).
//   A METRI      il CAMPO DELLE ONDE di quel tratto, nato dallo stesso spettro: per ottave di lunghezza d'onda, tessere
//                periodiche di quattro lunghezze d'onda (Tessendorf 2001: una trasformata di Fourier per tessera) sovrapposte
//                a metà e pesate con pesi che fanno w² + w² = 1 (la varianza resta quella dello spettro in ogni punto, e il
//                campo non si ripete); le ampiezze di ogni tessera sono un evento del tratto («…/onde/tratto I,J/banda b/tessera i,j»):
//                due finestre sovrapposte vedono le stesse onde. Ogni onda corre con la sua ω, più l'effetto Doppler della
//                corrente (ω + k·U). La SCHIUMA copre la parte di mare che dice la legge di Monahan e O'Muircheartaigh
//                (1980): W = 3,84·10⁻⁶·U^3,41; sta dove l'accelerazione verso il basso delle onde lunghe di vento (la parte
//                lunga dello spettro, quella che frange: Longuet-Higgins 1969) supera la soglia che dà proprio W.
//   A CENTIMETRI le increspature (le stesse tessere, onde capillari), le BOLLE sotto la schiuma (Deane e Stokes 2002: numero
//                per taglia ∝ a^−3/2 sotto la scala di Hinze, ∝ a^−10/3 sopra; le più piccole sono quelle che non si
//                sciolgono prima che l'onda passi: Epstein e Plesset 1950), i GRANELLI sospesi nel numero della torbidità
//                (Poisson su concentrazione × volume, cella per cella) con le taglie dalla legge di Stokes (la sorgente di
//                Sheldon, uguale volume per decade, filtrata da ciò che cade: lungo il pennacchio di un fiume, o a regime
//                nello strato rimescolato). IL PLANCTON: nessuno — il modello non ha ancora la vita (lavoro 10).
//   A MICRON     i FIOCCHI d'argilla (aggregati frattali, dimensione 2: Kranenburg 1994; grandi quanto la scala di
//                Kolmogorov della turbolenza dello strato: Winterwerp 1998), le bollicine coi GAS DELL'ARIA DI QUEL PIANETA
//                (pressione parziale del vapore alla temperatura dell'acqua, il resto nelle proporzioni dell'aria, alla
//                pressione dell'aria + quella dell'acqua sopra + quella di Laplace 2σ/a).
//   A NANOMETRI  l'acqua liquida vera e fitta (scenaNano): la densità di quell'acqua, la struttura del liquido dal potenziale
//                mW (Molinero e Moore 2009: acqua_mw.js), ogni ione nel numero della sua concentrazione col suo guscio
//                d'idratazione; mai un cristallo solo nel vuoto.
//
// LE FINESTRE SOVRAPPOSTE CONCORDANO: le onde vengono da tessere con indirizzo nel tratto, le particelle da celle con
// indirizzo nel tratto (una cella, un evento: quante ce ne sono e dove), la finestra si appoggia sulla griglia della sua
// ottava. Le prove (test/test_finestre.mjs, test/test_coerenza_scale.mjs) riassumono le finestre e ridanno il padre.
//
// DISCRETIZZAZIONI (classe b di «Scelte a mano nella vista»): quattro lunghezze d'onda per tessera e otto campioni per
// lunghezza d'onda; l'ottava più fine calcolata è quella con quattro punti per l'onda più corta (le più corte vanno nella
// pendenza media sotto il punto, che allarga il riflesso: Cox e Munk 1954); le ottave più lunghe di 8 picchi non si
// calcolano (lo spettro lì vale meno di e^−80). Lo spettro è quello del CENTRO DEL TRATTO (la cella della griglia del mare
// che contiene la finestra): dentro un tratto è uniforme, tra un tratto e l'altro c'è un bordo (dichiarato).
// LA RESA: la finestra si guarda dall'alto, come dal 3D (l'occhio sopra il centro, all'altezza da cui la finestra riempie
// lo schermo: la prospettiva), con il colore dell'acqua di coloreMare, il cielo riflesso secondo la pendenza di ogni punto,
// il riflesso della stella (Cox e Munk), la schiuma, e sotto la superficie le particelle attenuate dall'acqua sopra e
// spostate dalla rifrazione.
// A MANO (dichiarate, nel rapporto delle scelte a mano): la resa sullo schermo eredita da coloreMare l'esposizione 3,5 (e il
// cielo che coloreMare ci mette, 0,008; 0,012; 0,018, lo si toglie per avere la luce che l'acqua rimanda); il cielo riflesso
// è a diffusione semplice di Rayleigh (senza la diffusione multipla e la foschia); la stella, se chi chiama non la dice, è a mezzogiorno
// dell'equinozio; la riflettanza della schiuma è quella efficace misurata (0,22: Koepke 1984).
// NON TORNA: la schiuma è istantanea (nasce e muore con l'accelerazione delle onde: niente schiuma vecchia trascinata);
// le bolle stanno solo sotto la schiuma; le onde non frangono davvero (il profilo resta quello lineare).

import { DATI, IONI, luogo, ondeNelPunto, campioneAcqua, densita, viscosita, coloreMare, stokes, pennacchio, costanti, muovi, scenaMolecolare, polvereSospesa } from './mare.js';
import { vaporeSaturo, COSTANTI, MOLARE_ACQUA, ZERO_CELSIUS, R_GAS, GRADO } from './leggi.js';
import { sorgente } from './eventi.js';
import { TEMPLATE_MW } from './acqua_mw.js';
import { densitaAtomo } from './quanti.js';

const RAD = GRADO, DUE_PI = 2 * Math.PI, NA = COSTANTI.NA, KB = COSTANTI.kB;
const limita = (x, a, b) => (x < a ? a : x > b ? b : x);

// ======================================================================================================================
// 1. L'ACQUA: le proprietà che servono alle onde e alla luce, da temperatura e salinità
// ======================================================================================================================
// tensione superficiale (N/m): acqua pura IAPWS 1994 (σ = 235,8·τ^1,256·(1 − 0,625·τ) mN/m, τ = 1 − T/647,096), acqua di
// mare Sharqawy, Lienhard e Zubair 2010 (σ_sw = σ_w·(1 + 3,766·10⁻⁴·S + 2,347·10⁻⁶·S·t), S in g/kg, t in °C; misurata fino
// a 40 °C e 40 g/kg: oltre è estrapolata)
export function tensioneSuperficiale(T, S = 0) {
  const tau = Math.max(0, 1 - T / 647.096), w = 0.2358 * Math.pow(tau, 1.256) * (1 - 0.625 * tau);
  return w * (1 + 3.766e-4 * S + 2.347e-6 * S * (T - ZERO_CELSIUS));
}
// indice di rifrazione dell'acqua di mare (Quan e Fry 1995: S in g/kg, t in °C, λ in nm; misurato 400–700 nm, 0–30 °C, 0–35 g/kg)
export function rifrazione(T, S = 35, lambdaNm = 550) {
  const t = T - ZERO_CELSIUS, l = lambdaNm;
  return 1.31405 + (1.779e-4 - 1.05e-6 * t + 1.6e-8 * t * t) * S - 2.02e-6 * t * t + (15.868 + 0.01155 * S - 0.00423 * t) / l - 4382 / (l * l) + 1.1455e6 / (l * l * l);
}
// la densità dell'aria sopra (kg/m³): gas perfetto con la massa molare dei gas di quell'aria
const MOLARI = { N2: 0.028014, O2: 0.031998, CO2: 0.04401, H2O: MOLARE_ACQUA, Ar: 0.039948, CH4: 0.01604, H2: 0.002016, He: 0.004003, NH3: 0.017031, CO: 0.02801, SO2: 0.06406, H2S: 0.03408, Ne: 0.02018 };
export function massaMolareAria(aria = {}) { let m = 0, t = 0; for (const f in aria) if (MOLARI[f] && aria[f] > 0) { m += aria[f] * MOLARI[f]; t += aria[f]; } return t > 0 ? m / t : 0.029; }

// ======================================================================================================================
// 2. IL PADRE: lo stato del mare in un punto (tutto da mare.js), e lo spettro delle onde che ne viene
// ======================================================================================================================
// opz: { acqua (vero se chi chiama sa che lì è acqua), fondoM, anno (s: per la durata del vento), stagioni }
export function padreMare(stato, lon, lat, { acqua = true, fondoM = null, anno = null, stagioni = null } = {}) {
  if (!stato || !stato.esiste) return null;
  const q = luogo(stato, lon, lat, { profondita: 0, acqua, fondoM }); if (q.asciutto) return null;
  const o = ondeNelPunto(stato, lon, lat), g = stato.gravita, T = limita(q.T ?? 288, 250, 400), S = limita(q.salinita ?? 0, 0, 300);
  const rho = densita(Math.min(T, 373), Math.min(S, 300)), mu = viscosita(Math.min(T, 420), Math.min(S, 300)), sigma = tensioneSuperficiale(T, Math.min(S, 300));
  const Ta = T, rhoAria = (stato.pressioneAria * massaMolareAria(stato.aria)) / (R_GAS * Ta);
  const gelo = q.ghiaccio || 0, calma = gelo > 0.8 ? 0 : 1 - gelo;
  const U = o.U, ustar = Math.sqrt(DATI.cd) * U, ustarAcqua = ustar * Math.sqrt(rhoAria / rho);
  const km = Math.sqrt((rho * g) / sigma), cm = Math.sqrt((2 * g) / km); // il minimo della velocità di fase: dove gravità e capillarità pesano uguale
  const d = Math.max(0.5, q.fondoM ?? fondoM ?? 1e4);
  // la durata: il vento di meteo.js è la media della stagione, e soffia per la stagione; t_min è quanto gli serve per
  // portare le onde allo stato limitato dal tratto (CEM 2002, II-2-35)
  const chi = U > 0 ? (g * Math.max(o.tratto || 0, 1)) / (U * U) : 0, tMin = U > 0 ? (68.8 * Math.pow(chi, 2 / 3) * U) / g : 0;
  const durata = anno ? anno / Math.max(1, stagioni || 1) : null;
  return { lon, lat, g, T, S, rho, mu, nu: mu / rho, sigma, rhoAria, U, ux: o.ax, uy: o.ay, ustar, ustarAcqua, km, cm, d, calma, ghiaccio: gelo,
    Hs: o.H, Tp: o.T, Hl: o.Hl, Tl: o.Tl, lx: o.lx, ly: o.ly, tratto: o.tratto, chi, tMin, durata, limita: durata && tMin > durata ? 'la durata del vento' : 'il tratto libero',
    copertura: calma * 3.84e-6 * Math.pow(U, 3.41), corrente: { u: q.u || 0, v: q.v || 0 }, n: rifrazione(T, Math.min(S, 40)), luogo: q, pressione: stato.pressioneAria };
}

// la dispersione: ω² = (g·k + σ/ρ·k³)·tanh(k·d)
export const omega = (P, k) => Math.sqrt((P.g * k + (P.sigma / P.rho) * k * k * k) * Math.tanh(Math.min(k * P.d, 40)));
// il numero d'onda di una pulsazione (gravità, col fondale): Newton su ω² = g·k·tanh(k·d)
function kDiOmega(P, w) { let k = (w * w) / P.g; for (let i = 0; i < 40; i++) { const th = Math.tanh(Math.min(k * P.d, 40)), f = P.g * k * th - w * w, df = P.g * th + P.g * k * P.d * (1 - th * th); const dk = f / df; k -= dk; if (Math.abs(dk) < 1e-12 * k) break; } return k; }
const lgamma = (x) => { // Lanczos (g = 7, n = 9)
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x); x -= 1; let a = c[0]; const t = x + 7.5; for (let i = 1; i < 9; i++) a += c[i] / (x + i); return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
};
// la normalizzazione di cos^2s(φ/2): G(s) = 2^(2s−1)·Γ(s+1)²/(π·Γ(2s+1))
const normaDir = (s) => (s < 1e-6 ? 1 / DUE_PI : Math.exp((2 * s - 1) * Math.LN2 + 2 * lgamma(s + 1) - lgamma(2 * s + 1)) / Math.PI);

// LO SPETTRO (m³ per unità di k, e m⁴ per unità di k² nella forma direzionale) del padre P
export function spettro(P) {
  if (!P) return null; if (P._spettro) return P._spettro;
  const g = P.g, cDeep = (k) => Math.sqrt((g / k) * (1 + (k / P.km) ** 2));
  const parti = [];
  // --- il mare di vento (Elfouhaily e altri 1997)
  if (P.U > 0.05 && P.Tp > 0) {
    const wp = DUE_PI / P.Tp, kp = kDiOmega(P, wp), cp = wp / kp, Om = P.U / cp, ap = 6e-3 * Math.sqrt(Om), gam = Om <= 1 ? 1.7 : 1.7 + 6 * Math.log10(Math.min(Om, 5)), sg = 0.08 * (1 + 4 * Math.pow(Om, -3));
    const r = P.ustar / P.cm, am = Math.max(0, r <= 1 ? 0.01 * (1 + Math.log(r)) : 0.01 * (1 + 3 * Math.log(r)));
    const Jp = (k) => Math.pow(gam, Math.exp(-((Math.sqrt(k / kp) - 1) ** 2) / (2 * sg * sg))), Lpm = (k) => Math.exp(-1.25 * (kp / k) ** 2);
    const Bl = (k) => 0.5 * ap * (cp / cDeep(k)) * Lpm(k) * Jp(k) * Math.exp(-(Om / Math.SQRT2 / Math.sqrt(5)) * (Math.sqrt(k / kp) - 1));
    const Bh = (k) => 0.5 * am * (P.cm / cDeep(k)) * Lpm(k) * Jp(k) * Math.exp(-0.25 * (k / P.km - 1) ** 2);
    // (l'energia della parte lunga è quella del padre: Hs di campoOnde, una fonte sola)
    const lunga = integra((k) => Bl(k) / (k * k * k), kp / 8, kp * 4e4), fl = P.Hs > 0 && lunga > 0 ? (P.Hs * P.Hs) / 16 / lunga : 0;
    const sp = 11.5 * Math.pow(Om, -2.5); // Mitsuyasu: s al picco dall'età dell'onda
    parti.push({ nome: 'vento', kp, wp, cp, Om, ap, gam, am, fl, sp, dir: Math.atan2(P.uy, P.ux), lunga: (k) => (fl * Bl(k)) / (k * k * k), corta: (k) => (P.calma * Bh(k)) / (k * k * k) });
  }
  // --- il mare lungo (onde nate altrove): la stessa forma di un mare vecchio (Ω = 0,84), stretta attorno alla sua direzione
  if (P.Hl > 1e-4 && P.Tl > 0) {
    const wp = DUE_PI / P.Tl, kp = kDiOmega(P, wp), cp = wp / kp, Om = 0.84, ap = 6e-3 * Math.sqrt(Om), sg = 0.08 * (1 + 4 * Math.pow(Om, -3));
    const B = (k) => 0.5 * ap * (cp / cDeep(k)) * Math.exp(-1.25 * (kp / k) ** 2) * Math.pow(1.7, Math.exp(-((Math.sqrt(k / kp) - 1) ** 2) / (2 * sg * sg))) * Math.exp(-(Om / Math.sqrt(10)) * (Math.sqrt(k / kp) - 1));
    const tot = integra((k) => B(k) / (k * k * k), kp / 8, kp * 4e4), fl = (P.Hl * P.Hl) / 16 / tot;
    // (Mitsuyasu con l'età del mare lungo rispetto al vento di qui; senza vento, o oltre, il più stretto misurato: s = 75 per il mare lungo che ha viaggiato a lungo, Goda 1985)
    const sp = P.U > 0.05 ? Math.min(75, 11.5 * Math.pow(P.U / cp, -2.5)) : 75;
    parti.push({ nome: 'mare lungo', kp, wp, cp, Om, fl, sp, dir: Math.atan2(P.ly, P.lx), lunga: (k) => (fl * B(k)) / (k * k * k), corta: () => 0 });
  }
  const sDi = (pt, k) => { const x = omega(P, k) / pt.wp; return pt.sp * (x <= 1 ? Math.pow(x, 5) : Math.pow(x, -2.5)); };
  const D = (pt, k, phi) => { const s = sDi(pt, k); let a = phi - pt.dir; a -= DUE_PI * Math.round(a / DUE_PI); return normaDir(s) * Math.pow(Math.max(0, Math.cos(a / 2)), 2 * s); };
  const omni = (k) => { let s = 0; for (const pt of parti) s += pt.lunga(k) + pt.corta(k); return s; };
  // direzionale (m⁴): F(kx, ky) con ∬F dkx dky = ∫S dk; e la parte che frange (la lunga del vento)
  const F = (kx, ky) => { const k = Math.hypot(kx, ky); if (!(k > 0)) return 0; const phi = Math.atan2(ky, kx); let s = 0; for (const pt of parti) s += (pt.lunga(k) + pt.corta(k)) * D(pt, k, phi); return s / k; };
  const Frange = (kx, ky) => { const pt = parti[0]; if (!pt || pt.nome !== 'vento') return 0; const k = Math.hypot(kx, ky); if (!(k > 0)) return 0; return (pt.lunga(k) * D(pt, k, Math.atan2(ky, kx))) / k; };
  const kp = parti.length ? Math.min(...parti.map((p) => p.kp)) : P.km;
  // ∫ di una funzione di k (e dell'angolo) sul disco k1 ≤ k < k2: in log k e in angolo (Gauss-Legendre)
  const momento = (f, k1, k2) => integra((k) => { let a = 0; for (let i = 0; i < GL.x.length; i++) { const phi = Math.PI * (GL.x[i] + 1); a += GL.w[i] * Math.PI * f(k, phi) * F(k * Math.cos(phi), k * Math.sin(phi)) * k; } return a; }, k1, k2);
  const out = { parti, omni, F, Frange, D, kp, km: P.km,
    varianza: (k1, k2) => integra(omni, k1, k2),
    mss: (k1, k2) => integra((k) => k * k * omni(k), k1, k2),
    pendenze: (k1, k2) => ({ xx: momento((k, phi) => (k * Math.cos(phi)) ** 2, k1, k2), yy: momento((k, phi) => (k * Math.sin(phi)) ** 2, k1, k2), xy: momento((k, phi) => k * k * Math.cos(phi) * Math.sin(phi), k1, k2) }) };
  P._spettro = out; return out;
}
// l'integrale di f(k) tra a e b in log k (Simpson composito, 60 passi per unità di ln k: f è liscia; le prove lo confrontano col doppio)
function integra(f, a, b) {
  if (!(b > a) || !(a > 0)) return 0; const L = Math.log(b / a), n = 2 * Math.ceil(Math.min(2000, Math.max(40, 60 * L)) / 2), h = L / n; let s = 0;
  for (let i = 0; i <= n; i++) { const k = a * Math.exp(i * h), v = f(k) * k; s += (i === 0 || i === n ? 1 : i % 2 ? 4 : 2) * v; } return (s * h) / 3;
}
const GLQ = new Map(); function gaussLegendre(n) { let g = GLQ.get(n); if (!g) { g = nodiGL(n); GLQ.set(n, g); } return g; }
const GL = nodiGL(24); function nodiGL(n) { const x = [], w = []; for (let i = 1; i <= n; i++) { let z = Math.cos((Math.PI * (i - 0.25)) / (n + 0.5)), dp = 0; for (let it = 0; it < 100; it++) { let p0 = 1, p1 = z; for (let k = 2; k <= n; k++) { const p2 = ((2 * k - 1) * z * p1 - (k - 1) * p0) / k; p0 = p1; p1 = p2; } dp = (n * (z * p1 - p0)) / (z * z - 1); const dz = p1 / dp; z -= dz; if (Math.abs(dz) < 1e-15) break; } x.push(z); w.push(2 / ((1 - z * z) * dp * dp)); } return { x, w }; }

// ======================================================================================================================
// 3. IL TRATTO: la cella della griglia del mare che contiene la finestra. Ha il suo padre (al centro) e i suoi eventi.
// ======================================================================================================================
const TRATTI = new Map();
export function trattoDi(stato, lon, lat, opz = {}) {
  const W = stato.W, H = stato.H, I = ((Math.floor(((lon + 180) / 360) * W) % W) + W) % W, J = limita(Math.floor(((90 - lat) / 180) * H), 0, H - 1), chiave = `${stato.radice}|${I},${J}`;
  let t = TRATTI.get(chiave); if (t && t.stato === stato) return t;
  const lonC = ((I + 0.5) / W) * 360 - 180, latC = 90 - ((J + 0.5) / H) * 180, P = padreMare(stato, lonC, latC, { ...opz, acqua: true, fondoM: null });
  t = { stato, I, J, lon: lonC, lat: latC, chiave, P, sp: spettro(P), R: stato.raggioM, caso: sorgente(`${stato.radice}/onde/tratto ${I},${J}`), bande: new Map(), tessere: new Map() };
  t.coslat = Math.cos(latC * RAD);
  TRATTI.set(chiave, t); if (TRATTI.size > 16) TRATTI.delete(TRATTI.keys().next().value);
  return t;
}
// dalle coordinate del pianeta a quelle del tratto (metri: est, nord dal suo centro) e ritorno
export const nelTratto = (t, lon, lat) => { let dl = lon - t.lon; dl -= 360 * Math.round(dl / 360); return [t.R * t.coslat * dl * RAD, t.R * (lat - t.lat) * RAD]; };
export const dalTratto = (t, x, y) => [t.lon + x / (t.R * t.coslat * RAD), t.lat + y / (t.R * RAD)];

// ======================================================================================================================
// 4. LE ONDE DI UN TRATTO: ottave di lunghezza d'onda, ognuna fatta di tessere periodiche sovrapposte a metà
// ======================================================================================================================
// ottava b: lunghezze d'onda λ in (2^(b−1), 2^b] metri, cioè k in [2π/2^b, 4π/2^b). Tessera: lato 4·2^b, 32 campioni per lato
// (passo 2^b/8), disposte ogni mezzo lato. I modi della tessera: k = 2π·(i, j)/lato con 4 ≤ |(i, j)| < 8.
export const ONDE = { M: 4, campioniPerOnda: 8, dalPicco: 8, quadratura: 4, get n() { return this.M * this.campioniPerOnda; } };
const lambdaDi = (b) => Math.pow(2, b);
// i modi di un'ottava nel tratto: (kx, ky), quanto pesa ciascuno (s = F·Δk²: la sua varianza), la sua ω con la corrente, la
// parte che frange — gli stessi per ogni tessera del tratto (cambiano solo gli esiti degli eventi)
function bandaDi(t, b) {
  const chiave = `${b}|${ONDE.n}|${ONDE.M}|${ONDE.quadratura}`; let B = t.bande.get(chiave); if (B) return B;
  const P = t.P, sp = t.sp, n = ONDE.n, M = ONDE.M, T = M * lambdaDi(b), dk = DUE_PI / T, idx = [], kx = [], ky = [], s = [], om = [], fr = [];
  let varianza = 0, pendenza = 0, varX = 0;
  const q = gaussLegendre(ONDE.quadratura), r1 = M * M, r2 = 4 * M * M;
  if (sp) for (let j = -2 * M; j <= 2 * M; j++) for (let i = -2 * M; i <= 2 * M; i++) {
    const r = Math.hypot(i, j); if (r < M - 0.71 || r >= 2 * M + 0.71 || Math.abs(i) >= n / 2 || Math.abs(j) >= n / 2) continue;
    // la varianza del modo: l'integrale di F sulla sua cella, solo per la parte che sta nella corona dell'ottava (Gauss-Legendre):
    // così le ottave, una accanto all'altra, coprono il piano dei numeri d'onda senza buchi né doppioni
    let v = 0, vX = 0; for (let a = 0; a < q.x.length; a++) for (let c = 0; c < q.x.length; c++) { const u = i + 0.5 * q.x[a], w = j + 0.5 * q.x[c], rr = u * u + w * w; if (rr < r1 || rr >= r2) continue; const peso = 0.25 * q.w[a] * q.w[c] * dk * dk; v += peso * sp.F(u * dk, w * dk); vX += peso * sp.Frange(u * dk, w * dk); }
    if (!(v > 0)) continue;
    const ax = i * dk, ay = j * dk, k = Math.hypot(ax, ay), F = v / (dk * dk);
    const w = omega(P, k) + ax * P.corrente.u + ay * P.corrente.v, quota = vX / v;
    idx.push(((j + n) % n) * n + ((i + n) % n)); kx.push(ax); ky.push(ay); s.push(v); om.push(w); fr.push(quota);
    varianza += v; pendenza += v * k * k; varX += v * quota * w ** 4;
  }
  B = { b, T, h: T / n, dk, n: s.length, idx: Int32Array.from(idx), neg: Int32Array.from(idx.map((q) => { const i = q % n, j = (q - i) / n; return (((n - j) % n) * n + ((n - i) % n)); })),
    kx: Float64Array.from(kx), ky: Float64Array.from(ky), amp: Float64Array.from(s, Math.sqrt), om: Float64Array.from(om), fr: Float64Array.from(fr, Math.sqrt), varianza, pendenza, varX };
  t.bande.set(chiave, B); return B;
}
// le ottave che contano in un tratto: dalla più corta dove c'è ancora energia (o pendenza) alla più lunga sotto 8 picchi
export function bandeDelTratto(t) {
  const qui = `${ONDE.n}|${ONDE.M}|${ONDE.quadratura}`; if (t._bande && t._bandeN === qui) return t._bande; t._bandeN = qui; t.tessere.clear(); const sp = t.sp, out = []; if (!sp) return (t._bande = out);
  const bMax = Math.ceil(Math.log2((ONDE.dalPicco * DUE_PI) / sp.kp)); let vTot = 0, sTot = 0;
  for (let b = bMax; b > -14; b--) { const B = bandaDi(t, b); out.push(B); vTot += B.varianza; sTot += B.pendenza; if (b < bMax - 6 && B.varianza < 1e-9 * vTot && B.pendenza < 1e-9 * sTot) break; }
  out.sort((a, c) => a.b - c.b);
  // la soglia della schiuma: σ_X dell'accelerazione verso il basso della parte che frange, su tutte le ottave (la somma discreta: è la varianza vera del campo)
  t.sigmaX = Math.sqrt(out.reduce((a, B) => a + B.varX, 0)); t.sogliaSchiuma = t.P && t.P.copertura > 0 ? normaleInversa(1 - t.P.copertura) : Infinity;
  return (t._bande = out);
}
// le ampiezze di una tessera: UN evento per tessera (il suo seme), da cui le due normali di ogni modo
function tesseraDi(t, B, ti, tj) {
  const k = `${B.b}|${ti}|${tj}`; let a = t.tessere.get(k); if (a) return a;
  const r = generatore(t.caso.seme(`banda ${B.b}/tessera ${ti},${tj}`)); a = new Float64Array(2 * B.n);
  for (let m = 0; m < B.n; m++) { const [g1, g2] = gaussiane(r); a[2 * m] = g1 * B.amp[m]; a[2 * m + 1] = g2 * B.amp[m]; }
  t.tessere.set(k, a); if (t.tessere.size > 6000) { let i = 0; for (const q of t.tessere.keys()) { t.tessere.delete(q); if (++i > 1500) break; } }
  return a;
}
// il campo di una tessera al tempo t, sui suoi 32×32 campioni: η (parte reale) e l'accelerazione che frange normalizzata
// (parte immaginaria), dalla stessa trasformata (spettri hermitiani)
const FFT = { n: 0, re: null, im: null }; const fftDi = (n) => { if (FFT.n !== n) { FFT.n = n; FFT.re = new Float64Array(n * n); FFT.im = new Float64Array(n * n); } return FFT; };
function campoTessera(t, B, a, tempo, conX, a2 = null) {
  const n = ONDE.n, F = fftDi(n), re = F.re, im = F.im; re.fill(0); im.fill(0); const sx = conX && t.sigmaX > 0 ? 1 / t.sigmaX : 0;
  if (B._t !== tempo) { B._t = tempo; B._c ||= new Float64Array(B.n); B._s ||= new Float64Array(B.n); for (let m = 0; m < B.n; m++) { B._c[m] = Math.cos(B.om[m] * tempo); B._s[m] = -Math.sin(B.om[m] * tempo); } }
  const C = B._c, Sn = B._s;
  for (let m = 0; m < B.n; m++) {
    const c = C[m], s = Sn[m], ar = a[2 * m] * c - a[2 * m + 1] * s, ai = a[2 * m] * s + a[2 * m + 1] * c; // h₀·e^(−iωt)
    const p = B.idx[m], q = B.neg[m];
    // η: (A e^{ikx} + c.c.)/2 → +A/2 in k, +conj(A)/2 in −k
    re[p] += 0.5 * ar; im[p] += 0.5 * ai; re[q] += 0.5 * ar; im[q] -= 0.5 * ai;
    if (sx) { const f = B.om[m] * B.om[m] * B.fr[m] * sx, xr = f * ar, xi = f * ai; // X = −η_tt della parte che frange = Σ ω²·√quota·A: entra come i·X
      re[p] -= 0.5 * xi; im[p] += 0.5 * xr; re[q] += 0.5 * xi; im[q] += 0.5 * xr; }
    else if (a2) { const br = a2[2 * m] * c - a2[2 * m + 1] * s, bi = a2[2 * m] * s + a2[2 * m + 1] * c; // la seconda tessera, come i·η₂
      re[p] -= 0.5 * bi; im[p] += 0.5 * br; re[q] += 0.5 * bi; im[q] += 0.5 * br; }
  }
  fft2(re, im, n, +1);
  return F;
}
// LE ONDE DI UNA FINESTRA: η e X sulla griglia dell'ottava più fine (passo h), dentro il quadrato [x0, x0 + N·h)² del tratto
// (più un orlo di 3 campioni), sommando le ottave dalla più lunga (piramide: ogni ottava si somma alla precedente
// interpolata a passo metà, Catmull-Rom). → { eta, X, N, h, x0, y0, orlo, bande }
export function ondeFinestra(fin, tempo = 0, { conX = true } = {}) {
  const t = fin.tratto, bande = fin.bande; if (!bande.length) return null;
  // le ottave molto più lunghe della finestra (meno di 8 campioni della loro griglia sul lato) non passano dalla piramide: le
  // si somma esatte su una griglia di 9×9 punti della finestra (dove sono lisce: almeno 16 punti per onda), e poi si interpolano
  const lunghe = bande.filter((B) => B.h > fin.L / 8), corte = bande.filter((B) => B.h <= fin.L / 8);
  const orlo = 3, perB = new Map(corte.map((B) => [B.b, B])), bMax = corte.length ? corte[corte.length - 1].b : fin.bf; let G = null;
  for (let b = bMax; b >= fin.bf; b--) {
    const B = perB.get(b), h = lambdaDi(b) / ONDE.campioniPerOnda, gx0 = Math.floor(fin.x0 / h) - orlo, gy0 = Math.floor(fin.y0 / h) - orlo, nx = Math.ceil((fin.x0 + fin.L) / h) + orlo + 1 - gx0, ny = Math.ceil((fin.y0 + fin.L) / h) + orlo + 1 - gy0;
    const eta = new Float64Array(nx * ny), X = conX ? new Float64Array(nx * ny) : null;
    if (G) sali(G, { eta, X, gx0, gy0, nx, ny, h });
    if (B) aggiungiBanda(t, B, { eta, X, gx0, gy0, nx, ny }, tempo, conX);
    G = { eta, X, gx0, gy0, nx, ny, h };
  }
  // (le lunghe: 9×9 punti per quelle fino a 8 volte il lato, 4×4 per le più lunghe; un punto in più oltre ogni bordo per l'interpolazione)
  for (const [gruppo, m] of [[lunghe.filter((B) => B.h <= fin.L), 8], [lunghe.filter((B) => B.h > fin.L), 3]]) { if (!gruppo.length) continue;
    // (i nodi sono sulla griglia del tratto di passo 2^k metri: due finestre sovrapposte della stessa grandezza li condividono)
    const span = Math.max(G.nx - 1, G.ny - 1) * G.h, d = Math.pow(2, Math.floor(Math.log2(span / m))), ox = (Math.floor((G.gx0 * G.h) / d) - 1) * d, oy = (Math.floor((G.gy0 * G.h) / d) - 1) * d;
    const n1 = Math.ceil(span / d) + 4, E = new Float64Array(n1 * n1), XL = new Float64Array(n1 * n1);
    ondeEsatteGriglia(t, ox, oy, d, d, n1, tempo, gruppo, E, XL);
    // (Lagrange cubica, separabile: esatta fino ai polinomi di terzo grado — Catmull-Rom lo è solo fino al secondo, e su
    // un'onda lunga la sua coda si vede); i pesi per ogni colonna e ogni riga della griglia fine, poi due passate
    const pesi = (nn, g0, o) => { const I = new Int32Array(nn), W = new Float64Array(4 * nn); for (let x = 0; x < nn; x++) { const X = ((g0 + x) * G.h - o) / d - 1, i = Math.min(Math.max(Math.floor(X), 0), n1 - 4), u = X - i; I[x] = i;
      W[4 * x] = (-u * (u - 1) * (u - 2)) / 6; W[4 * x + 1] = ((u + 1) * (u - 1) * (u - 2)) / 2; W[4 * x + 2] = (-(u + 1) * u * (u - 2)) / 2; W[4 * x + 3] = ((u + 1) * u * (u - 1)) / 6; } return { I, W }; };
    const px = pesi(G.nx, G.gx0, ox), py = pesi(G.ny, G.gy0, oy), righe = new Float64Array(n1 * G.nx);
    for (const [A, D] of [[E, G.eta], [XL, G.X]]) { if (!D) continue;
      for (let j = 0; j < n1; j++) for (let x = 0; x < G.nx; x++) { const i = px.I[x], o = j * n1 + i; righe[j * G.nx + x] = px.W[4 * x] * A[o] + px.W[4 * x + 1] * A[o + 1] + px.W[4 * x + 2] * A[o + 2] + px.W[4 * x + 3] * A[o + 3]; }
      for (let y = 0; y < G.ny; y++) { const j = py.I[y], w0 = py.W[4 * y], w1 = py.W[4 * y + 1], w2 = py.W[4 * y + 2], w3 = py.W[4 * y + 3], r0 = j * G.nx, r1 = r0 + G.nx, r2 = r1 + G.nx, r3 = r2 + G.nx, o = y * G.nx;
        for (let x = 0; x < G.nx; x++) D[o + x] += w0 * righe[r0 + x] + w1 * righe[r1 + x] + w2 * righe[r2 + x] + w3 * righe[r3 + x]; } }
  }
  return G;
}
function aggiungiBanda(t, B, G, tempo, conX) {
  const n = ONDE.n, mezzo = n / 2, ti0 = Math.floor(G.gx0 / mezzo) - 1, ti1 = Math.floor((G.gx0 + G.nx - 1) / mezzo), tj0 = Math.floor(G.gy0 / mezzo) - 1, tj1 = Math.floor((G.gy0 + G.ny - 1) / mezzo);
  // (dove la parte che frange non c'è, due tessere nella stessa trasformata: una nella parte reale, una nell'immaginaria)
  const conXqui = conX && G.X && B.varX > 1e-9 * (t.sigmaX || 0) ** 2, lista = [];
  for (let tj = tj0; tj <= tj1; tj++) for (let ti = ti0; ti <= ti1; ti++) lista.push([ti, tj]);
  for (let q = 0; q < lista.length; q += conXqui ? 1 : 2) {
    const [ti, tj] = lista[q], due = !conXqui && q + 1 < lista.length ? lista[q + 1] : null;
    const F = campoTessera(t, B, tesseraDi(t, B, ti, tj), tempo, conXqui, due ? tesseraDi(t, B, due[0], due[1]) : null);
    accumula(G, F.re, ti * mezzo - G.gx0, tj * mezzo - G.gy0, conXqui ? F.im : null, false);
    if (due) accumula(G, F.im, due[0] * mezzo - G.gx0, due[1] * mezzo - G.gy0, null, false);
  }
}
function accumula(G, A, ox, oy, X) {
  const n = ONDE.n, W = seni(n);
  for (let q = 0; q < n; q++) { const y = oy + q; if (y < 0 || y >= G.ny) continue; const wy = W[q], riga = y * G.nx, f0 = q * n;
    for (let p = 0; p < n; p++) { const x = ox + p; if (x < 0 || x >= G.nx) continue; const w = W[p] * wy; G.eta[riga + x] += w * A[f0 + p]; if (X) G.X[riga + x] += w * X[f0 + p]; } }
}
// il peso della tessera: w(u) = sin(π/2·sin²(πu/T)) (la finestra «di Vorbis»): tra due tessere sovrapposte a metà w² + w² = 1
// (la varianza resta quella dello spettro in ogni punto) e, al bordo della tessera, w e la sua derivata vanno a zero (niente
// spigoli nella pendenza: con sin(πu/T) la pendenza saltava del 12% al bordo di ogni tessera)
export const pesoTessera = (u) => Math.sin((Math.PI / 2) * Math.sin(Math.PI * u) ** 2);
const SENI_ = new Map(), seni = (n) => { let w = SENI_.get(n); if (!w) { w = Float64Array.from({ length: n }, (_, p) => pesoTessera(p / n)); SENI_.set(n, w); } return w; };
// la griglia di passo 2h interpolata su quella di passo h (Catmull-Rom separabile)
function sali(A, Bg) {
  const cr = (p0, p1, p2, p3, u) => p1 + 0.5 * u * (p2 - p0 + u * (2 * p0 - 5 * p1 + 4 * p2 - p3 + u * (3 * (p1 - p2) + p3 - p0)));
  const tmpE = new Float64Array(A.nx * Bg.ny), tmpX = A.X ? new Float64Array(A.nx * Bg.ny) : null;
  for (let y = 0; y < Bg.ny; y++) { const Y = (Bg.gy0 + y) * Bg.h / A.h - A.gy0, j = Math.floor(Y), u = Y - j;
    const r = (jj) => limita(jj, 0, A.ny - 1) * A.nx;
    for (let x = 0; x < A.nx; x++) { tmpE[y * A.nx + x] = cr(A.eta[r(j - 1) + x], A.eta[r(j) + x], A.eta[r(j + 1) + x], A.eta[r(j + 2) + x], u); if (tmpX) tmpX[y * A.nx + x] = cr(A.X[r(j - 1) + x], A.X[r(j) + x], A.X[r(j + 1) + x], A.X[r(j + 2) + x], u); } }
  for (let x = 0; x < Bg.nx; x++) { const X = (Bg.gx0 + x) * Bg.h / A.h - A.gx0, i = Math.floor(X), u = X - i, c = (ii) => limita(ii, 0, A.nx - 1);
    for (let y = 0; y < Bg.ny; y++) { const o = y * A.nx; Bg.eta[y * Bg.nx + x] = cr(tmpE[o + c(i - 1)], tmpE[o + c(i)], tmpE[o + c(i + 1)], tmpE[o + c(i + 2)], u); if (tmpX && Bg.X) Bg.X[y * Bg.nx + x] = cr(tmpX[o + c(i - 1)], tmpX[o + c(i)], tmpX[o + c(i + 1)], tmpX[o + c(i + 2)], u); } }
}
// IL CAMPO ESATTO in un punto del tratto (la somma dei modi delle quattro tessere che lo coprono, ottava per ottava): la legge,
// senza la griglia. Per le prove (e per chi vuole un punto solo). → { eta, X }
export function ondeEsatte(t, x, y, tempo = 0, bande = bandeDelTratto(t)) {
  let eta = 0, X = 0; const sx = t.sigmaX > 0 ? 1 / t.sigmaX : 0;
  for (const B of bande) { const T = B.T, mezzo = T / 2, ti0 = Math.floor(x / mezzo) - 1, tj0 = Math.floor(y / mezzo) - 1;
    for (let tj = tj0; tj <= tj0 + 1; tj++) for (let ti = ti0; ti <= ti0 + 1; ti++) {
      const u = x - ti * mezzo, v = y - tj * mezzo; if (u < 0 || u >= T || v < 0 || v >= T) continue; const w = pesoTessera(u / T) * pesoTessera(v / T), a = tesseraDi(t, B, ti, tj);
      for (let m = 0; m < B.n; m++) { const th = B.kx[m] * u + B.ky[m] * v - B.om[m] * tempo, c = Math.cos(th), s = Math.sin(th), re = a[2 * m] * c - a[2 * m + 1] * s; eta += w * re; if (sx) X += w * re * B.om[m] * B.om[m] * B.fr[m] * sx; } } }
  return { eta, X };
}

// lo stesso, su una griglia n×n (origine x0, y0; passi dx, dy): i fattori e^(ik·x) per righe e colonne, poi solo prodotti
export function ondeEsatteGriglia(t, x0, y0, dx, dy, n, tempo, bande, E, XL) {
  E.fill(0); XL.fill(0); const sx = t.sigmaX > 0 ? 1 / t.sigmaX : 0, cxr = new Float64Array(n), cxi = new Float64Array(n), cyr = new Float64Array(n), cyi = new Float64Array(n), wx = new Float64Array(n), wy = new Float64Array(n);
  for (const B of bande) { const T = B.T, mezzo = T / 2, ti0 = Math.floor(x0 / mezzo) - 1, ti1 = Math.floor((x0 + (n - 1) * dx) / mezzo), tj0 = Math.floor(y0 / mezzo) - 1, tj1 = Math.floor((y0 + (n - 1) * dy) / mezzo);
    for (let tj = tj0; tj <= tj1; tj++) for (let ti = ti0; ti <= ti1; ti++) {
      let sx_ = false, sy_ = false; for (let i = 0; i < n; i++) { const u = x0 + i * dx - ti * mezzo; wx[i] = u >= 0 && u < T ? pesoTessera(u / T) : 0; const v = y0 + i * dy - tj * mezzo; wy[i] = v >= 0 && v < T ? pesoTessera(v / T) : 0; if (wx[i] > 0) sx_ = true; if (wy[i] > 0) sy_ = true; } if (!sx_ || !sy_) continue;
      const a = tesseraDi(t, B, ti, tj), ux = x0 - ti * mezzo, vy = y0 - tj * mezzo;
      for (let m = 0; m < B.n; m++) { const th0 = B.kx[m] * ux + B.ky[m] * vy - B.om[m] * tempo, c0 = Math.cos(th0), s0 = Math.sin(th0), ar = a[2 * m] * c0 - a[2 * m + 1] * s0, ai = a[2 * m] * s0 + a[2 * m + 1] * c0, fx = sx ? B.om[m] * B.om[m] * B.fr[m] * sx : 0;
        const ex = B.kx[m] * dx, ey = B.ky[m] * dy, sr = Math.cos(ex), si = Math.sin(ex), tr = Math.cos(ey), tq = Math.sin(ey); cxr[0] = 1; cxi[0] = 0; cyr[0] = 1; cyi[0] = 0;
        for (let i = 1; i < n; i++) { cxr[i] = cxr[i - 1] * sr - cxi[i - 1] * si; cxi[i] = cxr[i - 1] * si + cxi[i - 1] * sr; cyr[i] = cyr[i - 1] * tr - cyi[i - 1] * tq; cyi[i] = cyr[i - 1] * tq + cyi[i - 1] * tr; }
        for (let j = 0; j < n; j++) { if (!wy[j]) continue; const br = ar * cyr[j] - ai * cyi[j], bi = ar * cyi[j] + ai * cyr[j];
          for (let i = 0; i < n; i++) { const w = wx[i] * wy[j]; if (!w) continue; const re = br * cxr[i] - bi * cxi[i]; E[j * n + i] += w * re; if (fx) XL[j * n + i] += w * re * fx; } } } } }
}

// ======================================================================================================================
// 5. LA FINESTRA: un quadrato di lato L attorno a (lon, lat), che scende di L sotto la superficie
// ======================================================================================================================
// opz: { latoM, Nmin (punti minimi per lato: 128), fondoM, P (il pianeta: per la durata del vento), sole: { dir: [est, nord, su], raggio (rad) } }
export function finestraAcqua(stato, { lon = 0, lat = 0, latoM = 1, Nmin = 128, fondoM = null, P = null, sole = null, stagioni = null } = {}) {
  const opz = { anno: P?.anno ?? null, stagioni: stagioni ?? (Array.isArray(stato?.stagioni) ? stato.stagioni.length : null) };
  const padre = padreMare(stato, lon, lat, { acqua: true, fondoM, ...opz }); if (!padre) return { asciutto: true, descrizione: 'Qui non c\'è acqua.' };
  const t = trattoDi(stato, lon, lat, opz), L = latoM;
  // l'ottava più fine: otto campioni per la sua λ, e almeno Nmin punti sul lato → la griglia dell'immagine (passo h)
  const bf = Math.floor(Math.log2((ONDE.campioniPerOnda * L) / Nmin)), h = lambdaDi(bf) / ONDE.campioniPerOnda, [xc, yc] = nelTratto(t, lon, lat);
  const N = Math.max(8, Math.round(L / h)), x0 = Math.floor((xc - L / 2) / h) * h, y0 = Math.floor((yc - L / 2) / h) * h;
  const tutte = bandeDelTratto(t), bande = tutte.filter((B) => B.b >= bf);
  const fin = { stato, tratto: t, padre, lon, lat, L: N * h, latoChiesto: L, N, h, x0, y0, bf, bande, sole: sole || soleDiMezzogiorno(lat), fondoM: padre.d };
  // la pendenza sotto il punto: le ottave più corte di quella calcolata (k ≥ 4π/2^bf), più il disco della stella
  const kc = (2 * DUE_PI) / lambdaDi(bf), pe = t.sp ? t.sp.pendenze(kc, Math.max(kc * 1e4, 40 * t.sp.km)) : { xx: 0, yy: 0, xy: 0 }, ds = ((fin.sole.raggio || 0) ** 2) / 4;
  fin.sotto = { xx: pe.xx + ds, yy: pe.yy + ds, xy: pe.xy };
  // LE SCINTILLE SOTTO IL PUNTO. Il riflesso d'un punto è la media su molte faccette più piccole di lui: ognuna rimanda la
  // stella in un PUNTO SPECULARE. Quanti ce ne sono per m² con la pendenza ζ che serve (Longuet-Higgins 1960, per una
  // superficie gaussiana: gradiente ed hessiano indipendenti): n(ζ) = p(ζ)·E|det H|, con p la densità delle pendenze sotto il
  // punto (quella di Cox e Munk del lampo) e, per uno spettro isotropo, E|det H| = M₄/(2√3) (M₄ = ∫k⁴S(k)dk delle ottave sotto
  // il punto; la costante 2/√3 dalla media della |det| di tre gaussiane correlate). Chi guarda la finestra più ingrandita della
  // distanza tra le scintille vede punti di luce staccati, non una macchia: mappa.js, scintille
  // (solo se le pendenze sotto il punto allargano il lampo ben oltre il disco della stella — quattro volte la sua varianza —: se no
  // il riflesso è già risolto dai punti della finestra, e resta nell'immagine)
  if (pe.xx + pe.yy > 4 * 2 * ds) fin.scintille = { detH: t.sp ? integra((k) => k ** 4 * t.sp.omni(k), kc, Math.max(kc * 1e4, 40 * t.sp.km)) / (2 * Math.sqrt(3)) : 0, pend: { xx: pe.xx, yy: pe.yy, xy: pe.xy } };
  fin.varianza = bande.reduce((a, B) => a + B.varianza, 0);
  fin.popolazioni = popolazioni(fin);
  fin.descrizione = descrivi(fin);
  return fin;
}
// la stella, se chi chiama non la dice: a mezzogiorno dell'equinozio (verso l'equatore, alta 90° − |lat|), col disco del Sole
export function soleDiMezzogiorno(lat) { const el = (90 - Math.abs(lat)) * RAD; return { dir: [0, lat >= 0 ? -Math.cos(el) : Math.cos(el), Math.sin(el)], raggio: 0.00465, dichiarata: 'mezzogiorno dell\'equinozio' }; }

// ======================================================================================================================
// 6. LE POPOLAZIONI: bolle, granelli, fiocchi, cristalli; ogni cella del tratto un evento (quante, dove, di che taglia)
// ======================================================================================================================
// la classe di mare.js (campioneAcqua: perM3 per classe, al punto e alla profondità) e una legge delle taglie → le particelle
// della finestra. Le celle hanno lato n^(−1/3) (una particella attesa per cella), indirizzo nel tratto: finestre sovrapposte
// vedono le stesse particelle. Si generano solo le classi che la finestra distingue (diametro ≥ un punto) e che ci stanno.
export const POPOLAZIONI = { massimo: 60000 };
function popolazioni(fin) {
  const { stato, padre, L, h } = fin, P = padre, camp = campioneAcqua(stato, { lon: fin.lon, lat: fin.lat, profondita: Math.min(L / 2, P.d / 2), latoM: L, acqua: true, fondoM: P.d, massimo: 0 }, fin.tratto.caso.sotto('campione'));
  const out = { classi: [], particelle: [], campione: camp, velo: [] };
  if (camp.asciutto) return out;
  const g = P.g, Tq = limita(camp.T, 271, 373), Sq = Math.min(camp.salinita, 300);
  for (const cl of camp.classi) {
    if (cl.tipo === 'ione' || cl.tipo === 'coppia' || cl.tipo === 'molecola') continue; // (sciolti: sono la finestra dei nanometri)
    const legge = taglie(fin, cl, camp); if (!legge) continue;
    // (il numero: per le bolle quello di mare.js; per i solidi quello che dà la stessa massa di mare.js con la legge delle taglie)
    const m0 = cl.tipo === 'fiocco' ? (Math.PI / 6) * cl.diametroM ** 3 * (DATI.densitaFiocchi - 1000) : legge.massa ? legge.massa(cl.diametroM) : 0; // (la massa per particella con cui mare.js ha contato la classe)
    const n = cl.tipo === 'bolla' || !legge.massa ? cl.perM3 : (cl.perM3 * m0) / legge.massaMedia, dVis = Math.max(h, legge.dMin), parteVis = legge.parteSopra(dVis), nVis = n * parteVis * (cl.tipo === 'bolla' ? 1 / Math.max(P.copertura, 1e-30) : 1);
    const voce = { tipo: cl.tipo, materiale: cl.materiale, perM3: n, kgPerM3: legge.massaMedia ? n * legge.massaMedia : null, legge: legge.nome, perche: cl.perche, diametroMedio: legge.medio, nellaFinestra: n * L * L * L, visibili: n * L * L * L * parteVis, sottoIlPunto: 1 - parteVis, condizionata: cl.tipo === 'bolla' ? 'sotto la schiuma' : null };
    out.classi.push(voce);
    if (!(parteVis > 0) || legge.dMax < h) { out.velo.push(voce); continue; }
    // (le bolle: sotto la schiuma la densità è quella sotto le creste — mediata sulla copertura torna quella di mare.js —;
    // si generano quando si disegna, solo nelle celle dove la schiuma c'è: bolleSottoSchiuma)
    if (cl.tipo === 'bolla') { out.bolle = { voce, cl, legge, n: nVis, dVis, ambiente: { T: Tq, S: Sq, g } }; continue; }
    genera(fin, voce, cl, legge, nVis, dVis, out.particelle, { T: Tq, S: Sq, g });
  }
  // la schiuma in superficie: una zattera di bolle (la stessa legge delle taglie, coprono tutta la schiuma)
  const lb = leggeBolle(fin, camp); if (lb && P.copertura > 0) { const Ab = lb.areaMedia, nA = 1 / Ab, dVis = Math.max(h, lb.dMin), part = lb.parteSopra(dVis); out.zattera = { legge: lb, perM2: nA, n: nA * part, dVis, visibile: part > 0 && lb.dMax >= h }; }
  return out;
}
// le bolle delle celle che la schiuma tocca adesso (le celle sono del tratto: le stesse in ogni finestra; tenute per finestra)
export function bolleSottoSchiuma(fin, schiuma, { pennacchio = true } = {}) {
  const pz = fin.popolazioni, N = fin.N, L = fin.L, out = []; if (!pz.bolle && !pz.zattera) return out; fin._celleBolle ||= new Map();
  const colonne = (lato) => { const s = new Set(); for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (schiuma[j * N + i]) { const x = fin.x0 + (i + 0.5) * fin.h, y = fin.y0 + (N - 1 - j + 0.5) * fin.h, a = Math.floor(x / lato), b = Math.floor(y / lato), r = Math.ceil(fin.h / lato / 2); for (let db = -r; db <= r; db++) for (let da = -r; da <= r; da++) s.add(`${a + da},${b + db}`); } return s; };
  if (pennacchio && pz.bolle && pz.bolle.n > 0 && pz.bolle.legge.dMax >= fin.h) { const B = pz.bolle; let lato = Math.cbrt(1 / B.n); const tetto = POPOLAZIONI.massimo, k1 = Math.floor(L / lato);
    const col = colonne(lato); if (col.size * (k1 + 1) > tetto) lato = Math.cbrt((col.size * (k1 + 1) * lato ** 3) / tetto);
    for (const c of colonne(lato)) { const [i, j] = c.split(',').map(Number); for (let kz = 0; kz <= Math.floor(L / lato); kz++) { const k = `b|${lato}|${i},${j},${kz}`; let l = fin._celleBolle.get(k);
      if (!l) { l = []; genera(fin, B.voce, B.cl, B.legge, B.n, B.dVis, l, B.ambiente, { lato, i, j, kz }); fin._celleBolle.set(k, l); } for (const p of l) out.push(p); } } }
  if (pz.zattera && pz.zattera.visibile) { const Z = pz.zattera; let lato = Math.sqrt(1 / Z.n); const col0 = colonne(lato); if (col0.size > POPOLAZIONI.massimo) lato *= Math.sqrt(col0.size / POPOLAZIONI.massimo);
    for (const c of colonne(lato)) { const [i, j] = c.split(',').map(Number), k = `z|${lato}|${i},${j}`; let l = fin._celleBolle.get(k);
      if (!l) { l = []; genera2D(fin, Z.n, Z.dVis, Z.legge, l, { lato, i, j }); fin._celleBolle.set(k, l); } for (const p of l) out.push(p); } }
  return out;
}
// LE PARTICELLE NON DIPENDONO DALLA FINESTRA che le guarda: ogni ottava di taglia [2^b, 2^(b+1)) ha le sue celle (lato
// n_b^(−1/3), una particella attesa per cella) e il suo caso, con l'indirizzo nel tratto; una finestra prende le ottave che
// distingue (d ≥ un suo punto) e, di quella a cavallo, le particelle sopra il punto. Prima le celle e il caso dipendevano dalla
// taglia più piccola visibile, cioè dalla finestra: ogni finestra aveva altre particelle (il puntino che saltava di posto)
function genera(fin, voce, cl, legge, n, dVis, lista, amb, cella = null) {
  if (cella || !legge.estraiTra) return generaCelle(fin, voce, cl, legge, n, dVis, lista, amb, cella);
  const nTot = n / Math.max(1e-300, legge.parteSopra(dVis)), b0 = Math.floor(Math.log2(dVis)), b1 = Math.ceil(Math.log2(legge.dMax));
  for (let b = b0; b < b1; b++) { const lo = Math.max(2 ** b, legge.dMin), hi = Math.min(2 ** (b + 1), legge.dMax), nb = nTot * (legge.parteSopra(lo) - legge.parteSopra(hi)); if (!(nb > 0) || hi <= lo) continue;
    generaCelle(fin, voce, cl, legge, nb, dVis, lista, amb, null, { b, lo, hi }); }
}
function generaCelle(fin, voce, cl, legge, n, dVis, lista, { T, S, g }, cella = null, ottava = null) {
  const t = fin.tratto, L = fin.L, attesi = n * L * L * L; if (!(attesi > 0)) return;
  let lato = cella ? cella.lato : Math.cbrt(1 / n); if (!cella && Math.pow(L / lato + 1, 3) > POPOLAZIONI.massimo) lato = L / (Math.cbrt(POPOLAZIONI.massimo) - 1);
  const media = n * lato ** 3, i0 = cella ? cella.i : Math.floor(fin.x0 / lato), i1 = cella ? cella.i : Math.floor((fin.x0 + L) / lato), j0 = cella ? cella.j : Math.floor(fin.y0 / lato), j1 = cella ? cella.j : Math.floor((fin.y0 + L) / lato), k0 = cella ? cella.kz : 0, k1 = cella ? cella.kz : Math.floor(L / lato);
  for (let kz = k0; kz <= k1; kz++) for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const r = generatore(t.caso.seme(ottava ? `classe ${cl.tipo} ${cl.materiale}/ottava ${ottava.b}/cella ${lato.toExponential(3)}/${i},${j},${kz}` : `classe ${cl.tipo} ${cl.materiale} ${dVis.toExponential(2)}/cella ${lato.toExponential(3)}/${i},${j},${kz}`)), quante = poisson(r, media);
    for (let q = 0; q < quante; q++) { const x = (i + r()) * lato, y = (j + r()) * lato, z = (kz + r()) * lato, u = r(), ang = r(); if (x < fin.x0 || x >= fin.x0 + L || y < fin.y0 || y >= fin.y0 + L || z >= L) continue;
      const d = ottava ? legge.estraiTra(u, ottava.lo, ottava.hi) : legge.estrai(u, dVis); if (d < dVis) continue; const cade = cl.tipo === 'bolla' ? Math.max(0, -stokes(d, 1.2, T, S, g)) : cl.tipo === 'granello' || cl.tipo === 'fiocco' || cl.tipo === 'cristallo' ? -Math.max(0, stokes(d, legge.rho ? legge.rho(d) : cl.rho || DATI.densitaGrani, T, S, g)) : 0;
      lista.push({ tipo: cl.tipo, materiale: cl.materiale, forma: formaDi(cl), colore: cl.colore || COLORI[cl.materiale] || [200, 200, 200], d, x: (x - fin.x0) / L, y: (y - fin.y0) / L, z: z / L, angolo: ang * Math.PI, vz: cade, sottoSchiuma: cl.tipo === 'bolla', primarie: legge.primarie ? legge.primarie(d) : 0 }); } }
}
function genera2D(fin, nA, dVis, legge, lista, cella = null) {
  const t = fin.tratto, L = fin.L, lato = cella ? cella.lato : Math.sqrt(1 / nA), media = nA * lato * lato, i0 = cella ? cella.i : Math.floor(fin.x0 / lato), i1 = cella ? cella.i : Math.floor((fin.x0 + L) / lato), j0 = cella ? cella.j : Math.floor(fin.y0 / lato), j1 = cella ? cella.j : Math.floor((fin.y0 + L) / lato);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const r = generatore(t.caso.seme(`zattera ${dVis.toExponential(2)}/cella ${lato.toExponential(3)}/${i},${j}`)), quante = poisson(r, media);
    for (let q = 0; q < quante; q++) { const x = (i + r()) * lato, y = (j + r()) * lato, d = legge.estrai(r(), dVis); if (x < fin.x0 || x >= fin.x0 + L || y < fin.y0 || y >= fin.y0 + L) continue;
      lista.push({ tipo: 'bolla', materiale: 'schiuma', forma: 'bolla', colore: COLORI.bolla, d, x: (x - fin.x0) / L, y: (y - fin.y0) / L, z: 0, angolo: 0, vz: 0, sottoSchiuma: true, zattera: true }); } }
}
const formaDi = (cl) => (cl.tipo === 'bolla' ? 'bolla' : cl.tipo === 'fiocco' || cl.materiale === 'aggregato' ? 'fiocco' : cl.materiale === 'argilla' || cl.materiale === 'colloide' ? 'lamella' : cl.materiale === 'salgemma' ? 'cubo' : cl.materiale === 'calcite' ? 'rombo' : cl.materiale === 'gesso' || cl.materiale === 'soda' ? 'ago' : cl.materiale === 'ghiaccio' ? 'esagono' : 'granello');
const COLORI = { bolla: [226, 240, 250], schiuma: [246, 248, 250], sabbia: [214, 200, 172], limo: [176, 160, 136], argilla: [150, 124, 100], fiocco: [136, 116, 98], colloide: [160, 140, 120], polvere: [180, 150, 120], aggregato: [150, 125, 100] };

// I GAS D'UNA BOLLA di raggio a a profondità z: dentro c'è il vapore alla pressione di saturazione dell'acqua di lì e il resto
// nelle proporzioni dell'aria di quel pianeta (stato.aria), alla pressione dell'aria + quella dell'acqua sopra + quella di
// Laplace 2σ/a. (Appena nata: poi i gas si sciolgono ognuno col suo ritmo — Epstein e Plesset —, e qui non lo si segue.)
export function gasDellaBolla(fin, a, z = 0) {
  const P = fin.padre, aria = fin.stato.aria || {}, laplace = (2 * P.sigma) / a, p = P.pressione + P.rho * P.g * z + laplace, pv = Math.min(vaporeSaturo(P.T), p);
  let secca = 0; for (const f in aria) if (f !== 'H2O' && aria[f] > 0) secca += aria[f];
  const parziali = { H2O: pv }; for (const f in aria) if (f !== 'H2O' && aria[f] > 0) parziali[f] = ((p - pv) * aria[f]) / secca;
  const frazioni = Object.fromEntries(Object.entries(parziali).map(([f, x]) => [f, x / p])), V = (4 / 3) * Math.PI * a ** 3;
  return { raggio: a, profondita: z, pressione: p, laplace, parziali, frazioni, molecole: (p * V) / (KB * P.T) };
}
// LE LEGGI DELLE TAGLIE. → { nome, dMin, dMax, medio, parteSopra(d) (la parte di numero sopra d), estrai(u, dVis) (una taglia ≥ dVis), rho(d) }
// Le classi d'ogni taglia di Wentworth (1922): sabbia 62,5 µm–2 mm, limo 3,9–62,5 µm, argilla sotto 3,9 µm (fino alla
// taglia dei colloidi di mare.js, 0,3 µm). La sorgente: uguale volume per decade di taglia (Sheldon e altri 1972: numero
// ∝ d⁻⁴). Il filtro: ciò che cade (Stokes) — lungo il pennacchio d'un fiume e^(−x·w_s(d)/(v·h)); al largo, a regime in uno
// strato rimescolato alto h con sorgente costante, la concentrazione di ogni taglia è sorgente × h/w_s(d).
const WENTWORTH = { sabbia: [62.5e-6, 2e-3], limo: [3.9e-6, 62.5e-6], argilla: [3e-7, 3.9e-6] };
function taglie(fin, cl, camp) {
  const P = fin.padre, g = P.g, T = limita(camp.T, 271, 373), S = Math.min(camp.salinita, 300);
  if (cl.tipo === 'bolla') return leggeBolle(fin, camp);
  if (cl.tipo === 'granello' && WENTWORTH[cl.materiale]) {
    const [a, b] = WENTWORTH[cl.materiale], f = P.luogo.foce, ws = (d) => Math.max(1e-12, stokes(d, DATI.densitaGrani, T, S, g));
    let filtro;
    if (f && f.distanzaM > 0) { const pn = pennacchio(f.portata, f.distanzaM, g), c = f.distanzaM / (pn.velocita * DATI.pennacchio); filtro = (d) => Math.exp(-c * ws(d)); }
    else filtro = (d) => 1 / ws(d);
    return conMassa(tabulata(`Wentworth ${cl.materiale}: sorgente di Sheldon (d⁻⁴) × ${f ? 'pennacchio del fiume e^(−x·w_s/(v·h))' : 'strato rimescolato a regime h/w_s'}`, a, b, (d) => Math.pow(d, -4) * filtro(d)));
  }
  if (cl.tipo === 'granello' && cl.materiale === 'polvere') { // la polvere del vento: il flusso che cade (lognormale) diviso la sua velocità di Stokes (mare.js polvereSospesa)
    const ps = polvereSospesa(1, T, S, g, DATI.mescola / Math.max(1, fin.stato.termoclino || 1)); return conMassa(tabulata('polvere del vento: lognormale di Mahowald 2014 (2,5 µm, σg 2) nel flusso, a regime nello strato C(d) = F(d)/(w_s(d) + w_m)', 1e-7, 1e-4, ps.legge)); }
  if (cl.tipo === 'fiocco') { // la scala di Kolmogorov dello strato (ε a metà dello strato rimescolato: legge di parete, u*³/(κ·z)) e la densità frattale
    const z = DATI.strato / 2, eps = Math.max(1e-12, P.ustarAcqua ** 3 / (0.41 * z)), eta = Math.pow(P.nu ** 3 / eps, 0.25), Dp = DATI.taglie.argilla, nf = 2;
    const D0 = Math.max(Dp, eta), rhoF = (d) => 1000 + (DATI.densitaGrani - 1000) * Math.pow(Math.max(d, Dp) / Dp, nf - 3);
    const L = tabulata(`fiocchi frattali (n_f = 2, Kranenburg 1994) grandi quanto la scala di Kolmogorov η = (ν³/ε)^¼ = ${(eta * 1e6).toFixed(0)} µm (Winterwerp 1998)`, Dp * 2, 4 * D0, (d) => Math.exp(-((Math.log(d / D0)) ** 2) / (2 * 0.5 * 0.5)) / d);
    L.rho = rhoF; L.kolmogorov = eta; L.primarie = (d) => Math.round(Math.pow(d / Dp, nf)); return conMassa(L, (d) => rhoF(d) - 1000);
  }
  // il resto (colloidi, cristalli, gli aggregati di polvere): la taglia di mare.js, con la sua dispersione dichiarata lì (gli
  // aggregati sono granelli: con la loro massa, come la sabbia e la polvere)
  const s = cl.tipo === 'colloide' ? 0.35 : 0.3, d0 = cl.diametroM;
  if (cl.materiale === 'aggregato') return conMassa(tabulata(`coppie di granelli di polvere: la taglia di mare.js (${(d0 * 1e6).toPrecision(2)} µm), lognormale ${s}`, d0 * Math.exp(-4 * s), d0 * Math.exp(4 * s), (d) => Math.exp(-((Math.log(d / d0)) ** 2) / (2 * s * s)) / d));
  return tabulata(`la taglia di mare.js (${(d0 * 1e6).toPrecision(2)} µm), lognormale ${s}`, d0 * Math.exp(-4 * s), d0 * Math.exp(4 * s), (d) => Math.exp(-((Math.log(d / d0)) ** 2) / (2 * s * s)) / d);
}
// LE BOLLE (Deane e Stokes 2002): numero per raggio ∝ a^−3/2 sotto la scala di Hinze a_H, ∝ a^−10/3 sopra. a_H: il loro 1 mm
// misurato in mare, scalato con la legge di Hinze (a_H ∝ (σ/ρ)^(3/5) alla stessa turbolenza). La più piccola: quella che si
// scioglie in un periodo dell'onda (Epstein e Plesset 1950, per la pressione di Laplace: t = p·a³/(6·D·Λ·σ), Λ il coefficiente
// di Ostwald del gas principale dell'aria); la più grande: 10 a_H (oltre, la coda vale meno di 10⁻³ del numero).
const leggiBolle = new WeakMap();
function leggeBolle(fin, camp) {
  let lb = leggiBolle.get(fin); if (lb) return lb; const P = fin.padre, aH = 1e-3 * Math.pow((P.sigma / P.rho) / (0.0728 / 1025), 0.6);
  const K = costanti(limita(P.T, 271, 373)), henry = K.henry.N2 || 6.4e-4, ostwald = (henry * P.rho * R_GAS * P.T) / 1e5, D = 2e-9 * (P.T / 298.15) * (8.9e-4 / P.mu), Tp = P.Tp > 0 ? P.Tp : 1;
  const aMin = Math.min(aH / 2, Math.cbrt((6 * D * ostwald * P.sigma * Tp) / Math.max(P.pressione, 1))), aMax = 10 * aH;
  lb = tabulata(`Deane e Stokes 2002: a^−3/2 sotto a_H = ${(aH * 1e3).toFixed(2)} mm, a^−10/3 sopra; dalla più piccola che dura un periodo (${(aMin * 1e6).toFixed(0)} µm)`, 2 * aMin, 2 * aMax, (d) => { const a = d / 2; return a < aH ? Math.pow(a, -1.5) : Math.pow(aH, -1.5) * Math.pow(a / aH, -10 / 3); });
  lb.aH = aH; lb.aMin = aMin; leggiBolle.set(fin, lb); return lb;
}
// una legge delle taglie data per punti (512 in log d): la parte sopra una taglia, l'estrazione, la taglia media
function tabulata(nome, a, b, f) {
  const n = 512, d = new Float64Array(n), c = new Float64Array(n); let s = 0, m = 0, m2 = 0;
  for (let i = 0; i < n; i++) { d[i] = a * Math.pow(b / a, i / (n - 1)); const w = f(d[i]) * d[i]; c[i] = s; s += i < n - 1 ? w : 0; m += i < n - 1 ? w * d[i] : 0; m2 += i < n - 1 ? w * Math.PI * d[i] * d[i] / 4 : 0; }
  const cdf = (x) => { if (x <= a) return 0; if (x >= b) return 1; const u = (Math.log(x / a) / Math.log(b / a)) * (n - 1), i = Math.floor(u); return (c[i] + (c[Math.min(n - 1, i + 1)] - c[i]) * (u - i)) / s; };
  const inv = (p) => { let lo = 0, hi = n - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (c[mid] / s < p) lo = mid; else hi = mid; } const p0 = c[lo] / s, p1 = c[hi] / s, u = p1 > p0 ? (p - p0) / (p1 - p0) : 0; return d[lo] * Math.pow(d[hi] / d[lo], u); };
  return { nome, dMin: a, dMax: b, medio: m / s, areaMedia: m2 / s, parteSopra: (x) => 1 - cdf(x), estrai: (u, dv = a) => { const p0 = cdf(dv); return inv(p0 + u * (1 - p0)); }, estraiTra: (u, lo, hi) => { const p0 = cdf(lo), p1 = cdf(hi); return inv(p0 + u * (p1 - p0)); },
    // la media di g(d) sopra una taglia (quadratura sulla cumulata: 4000 punti)
    media: (g, dv = a) => { const p0 = cdf(dv); let q = 0; for (let i = 0; i < 4000; i++) q += g(inv(p0 + ((i + 0.5) / 4000) * (1 - p0))); return q / 4000; } };
}
// la massa solida di un granello di taglia d (densità del minerale, o quella in eccesso del fiocco frattale: ciò che pesa di più dell'acqua)
function conMassa(L, rho = () => DATI.densitaGrani) { L.massa = (d) => (Math.PI / 6) * d * d * d * rho(d); L.massaMedia = L.media(L.massa); return L; }

// ======================================================================================================================
// 7. L'IMMAGINE DELLA FINESTRA, vista dall'alto (come dal 3D, guardando giù): RGBA N×N, il nord in alto
// ======================================================================================================================
const GAMMA = Uint8ClampedArray.from({ length: 8192 }, (_, i) => Math.round(255 * Math.pow(i / 8191, 1 / 2.2))); // (la curva 1/2,2 di coloreMare, in una tavola)
const CIELO = [0.008, 0.012, 0.018], ESPOSIZIONE = 3.5, SCHIUMA = 0.22; // (le prime due ereditate da coloreMare, a mano: vedi la testa; la schiuma: Koepke 1984)
export function immagineFinestra(fin, tempo = 0, { onde = null } = {}) {
  const N = fin.N, px = new Uint8ClampedArray(N * N * 4); if (fin.asciutto) return px;
  const P = fin.padre, st = fin.stato, luce = st.luce || [1, 1, 1];
  const c0 = coloreMare(st, fin.lon, fin.lat, { profonditaM: fin.fondoM, acqua: true, scalaM: fin.L }) || [10, 30, 60];
  const n = P.n, F0 = ((n - 1) / (n + 1)) ** 2, Rw = c0.map((c, i) => Math.max(0, Math.pow(c / 255, 2.2) / (ESPOSIZIONE * luce[i]) - CIELO[i]));
  const G = onde || ondeFinestra(fin, tempo); const s = fin.sole, sd = s.dir, Sx = fin.sotto.xx, Sy = fin.sotto.yy, Sxy = fin.sotto.xy, det = Math.max(1e-12, Sx * Sy - Sxy * Sxy);
  const soglia = fin.tratto.sogliaSchiuma, h = fin.h, fresnel = (c) => { const u = 1 - limita(c, 0, 1), u2 = u * u; return F0 + (1 - F0) * u2 * u2 * u; };
  const pend = new Float32Array(2 * N * N), schiuma = new Uint8Array(N * N), lin = new Float32Array(3 * N * N), cielo = cieloDi(fin);
  // (le scintille: il lampo di ogni punto, e quanti punti speculari per m² lo fanno — la densità delle pendenze senza il disco della stella)
  const sc = fin.scintille, lampi = sc ? new Float32Array(N * N) : null, dens = sc ? new Float32Array(N * N) : null, P0 = sc?.pend, det0 = P0 ? Math.max(1e-12, P0.xx * P0.yy - P0.xy * P0.xy) : 1;
  // L'OCCHIO: sopra il centro, all'altezza da cui la finestra riempie lo schermo (come nel 3D: tan(fov/2) = 0,375 rad di
  // nucleo.js), così ogni punto si guarda da una direzione sua (la prospettiva: verso i bordi il cielo riflesso cambia)
  const Hocchio = fin.L / (2 * Math.tan(fin.occhio ?? 0.375)), muS = Math.max(0.02, sd[2]), q2 = 1 / (2 * det), kG = 1 / (DUE_PI * Math.sqrt(det));
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const o = j * N + i; let sx = 0, sy = 0, X = -Infinity;
    if (G) { const gx = Math.round(fin.x0 / h) + i - G.gx0, gy = Math.round(fin.y0 / h) + (N - 1 - j) - G.gy0, q = gy * G.nx + gx; sx = (G.eta[q + 1] - G.eta[q - 1]) / (2 * h); sy = (G.eta[q + G.nx] - G.eta[q - G.nx]) / (2 * h); if (G.X) X = G.X[q]; }
    pend[2 * o] = sx; pend[2 * o + 1] = sy; const foam = X > soglia; schiuma[o] = foam ? 1 : 0;
    // la faccetta: normale (−sx, −sy, 1); lo sguardo dall'alto; la stella: quanta parte delle faccette sotto il punto la rimanda all'occhio (Cox e Munk 1954)
    let ex = (N / 2 - i - 0.5) * h, ey = (j + 0.5 - N / 2) * h, ez = Hocchio; const ne = 1 / Math.sqrt(ex * ex + ey * ey + ez * ez); ex *= ne; ey *= ne; ez *= ne;
    const nq = 1 / Math.sqrt(sx * sx + sy * sy + 1), nx = -sx * nq, ny = -sy * nq, nz = nq, cv = nx * ex + ny * ey + nz * ez, Fv = fresnel(cv);
    // il riflesso della stella: la faccetta che la manda all'occhio ha la normale h = (s + e)/|s + e| (Cox e Munk 1954)
    const hx = sd[0] + ex, hy = sd[1] + ey, hz = sd[2] + ez, hn = Math.sqrt(hx * hx + hy * hy + hz * hz), cb = hz / hn, ci = (sd[0] * hx + sd[1] * hy + sd[2] * hz) / hn, dx = -hx / hz - sx, dy = -hy / hz - sy;
    const lampo = hz > 0 ? (Math.PI * fresnel(ci) * kG * Math.exp(-(Sy * dx * dx - 2 * Sxy * dx * dy + Sx * dy * dy) * q2)) / (4 * Math.max(0.02, ez) * muS * cb ** 4) : 0;
    // il cielo riflesso nella direzione speculare r = 2(n·e)n − e (e = verso l'occhio, in alto)
    const rx = 2 * cv * nx - ex, ry = 2 * cv * ny - ey, rz = 2 * cv * nz - ez;
    for (let c = 0; c < 3; c++) { let R = (Rw[c] * (1 - Fv)) / (1 - F0) + Fv * cielo(c, rx, ry, rz) + lampo; if (foam) R = SCHIUMA; lin[3 * o + c] = R; }
    if (lampi && !foam && lampo > 0) { lampi[o] = lampo; dens[o] = hz > 0 ? (sc.detH / (DUE_PI * Math.sqrt(det0))) * Math.exp(-(P0.yy * dx * dx - 2 * P0.xy * dx * dy + P0.xx * dy * dy) / (2 * det0)) : 0; }
  }
  // la stessa finestra senza il lampo (per chi la guarda più da vicino delle scintille: mappa.js le mette una per una)
  const linS = lampi ? lin.slice() : null; if (linS) for (let o = 0; o < N * N; o++) if (lampi[o] > 0) for (let c = 0; c < 3; c++) linS[3 * o + c] -= lampi[o];
  // le particelle, viste attraverso la superficie: spostate dalla rifrazione (di z·(1 − 1/n)·pendenza), attenuate dall'acqua sopra
  const bolle = bolleSottoSchiuma(fin, schiuma, { pennacchio: false });
  for (const L of linS ? [lin, linS] : [lin]) {
    disegnaParticelle(fin, fin.popolazioni.particelle, L, pend, schiuma, tempo);
    // (si vede la schiuma, cioè la zattera di bolle in superficie: le bolle del pennacchio stanno sotto di lei, nascoste)
    disegnaParticelle(fin, bolle, L, pend, schiuma, tempo);
  }
  const kc = [0, 1, 2].map((c) => ESPOSIZIONE * luce[c] * (GAMMA.length - 1)), inPx = (L, out) => { for (let o = 0; o < N * N; o++) { for (let c = 0; c < 3; c++) { const v = L[3 * o + c] * kc[c]; out[4 * o + c] = v >= GAMMA.length - 1 ? 255 : GAMMA[v > 0 ? v | 0 : 0]; } out[4 * o + 3] = 255; } return out; };
  inPx(lin, px);
  fin.ultima = { schiuma: schiuma.reduce((a, b) => a + b, 0) / (N * N), tempo };
  // (le scintille: l'immagine senza lampo, il lampo e la densità dei punti speculari, e come il lampo diventa colore: ×E·luce, poi 1/2,2)
  if (lampi) fin.ultima.scintille = { senza: inPx(linS, new Uint8ClampedArray(N * N * 4)), lampi, dens, esposizione: [0, 1, 2].map((c) => ESPOSIZIONE * luce[c]), N, L: fin.L };
  return px;
}
// IL CIELO che la superficie riflette: un'aria piana di Rayleigh a diffusione semplice (Chandrasekhar 1950; la radianza
// verso il basso L = E₀·P(γ)/(4π)·μ₀/(μ₀ − μ)·(e^(−τ/μ₀) − e^(−τ/μ)), P = ¾(1 + cos²γ)), con lo spessore ottico della
// colonna d'aria di quel pianeta, τ(λ) = σ(λ)·p·N_A/(M·g) (σ: la sezione d'urto di Rayleigh dell'aria per molecola,
// 4,6·10⁻³¹ m² a 550 nm ∝ λ⁻⁴: Bucholtz 1995; le differenze tra un gas e l'altro non contate) → la riflettanza π·L/E_d,
// con E_d la luce che arriva su un piano (diretta + diffusa: metà della diffusa scende). Nel rosso, verde e blu: 650, 550, 450 nm.
function cieloDi(fin) {
  if (fin._cielo) return fin._cielo; const P = fin.padre, st = fin.stato, s = fin.sole.dir, mu0 = Math.max(0.02, s[2]);
  const colonna = (P.pressione * NA) / (massaMolareAria(st.aria) * P.g), tau = [650, 550, 450].map((l) => 4.6e-31 * (550 / l) ** 4 * colonna);
  const Ed = tau.map((t) => mu0 * Math.exp(-t / mu0) + 0.5 * mu0 * (1 - Math.exp(-t / mu0)));
  return (fin._cielo = (c, rx, ry, rz) => { const mu = Math.max(1e-3, rz), cg = rx * s[0] + ry * s[1] + rz * s[2], Pg = 0.75 * (1 + cg * cg), t = tau[c], d = mu0 - mu;
    const f = Math.abs(d) > 1e-6 ? (mu0 / d) * (Math.exp(-t / mu0) - Math.exp(-t / mu)) : (t / mu0) * Math.exp(-t / mu0);
    return (Math.PI * (Pg / (4 * Math.PI)) * f) / Ed[c]; });
}
function disegnaParticelle(fin, part, lin, pend, schiuma, tempo) {
  const N = fin.N, L = fin.L, n = fin.padre.n; if (!part.length) return;
  const K = attenuazione(fin), luce = fin.stato.luce || [1, 1, 1];
  // il moto: la caduta (o la salita) di Stokes e l'agitazione browniana (una funzione del tempo, come in mare.js), dentro la finestra che si richiude
  const Dbr = (d) => (KB * fin.padre.T) / (3 * Math.PI * fin.padre.mu * d);
  for (const p of part) {
    const d = p.d, rpx = (d / 2 / L) * N; if (rpx < 0.5 && !p.zattera) continue;
    const br = Math.sqrt(2 * Dbr(d) * Math.max(tempo, 0)) / L, fx = Math.sin(7.1 * p.angolo + 0.37 * tempo), fy = Math.cos(5.3 * p.angolo + 0.29 * tempo);
    let x = p.x + 0.3 * br * fx, y = p.y + 0.3 * br * fy, z = p.z - (p.vz * tempo) / L; z -= Math.floor(z); x -= Math.floor(x); y -= Math.floor(y);
    const i0 = Math.floor(x * N), j0 = N - 1 - Math.floor(y * N); if (i0 < 0 || j0 < 0 || i0 >= N || j0 >= N) continue;
    const o0 = j0 * N + i0; if (p.sottoSchiuma && !schiuma[o0]) continue; // (le bolle: sotto la schiuma, che passa)
    const prof = z * L, sh = prof * (1 - 1 / n), ci = limita(Math.round(i0 + (sh * pend[2 * o0]) / fin.h), 0, N - 1), cj = limita(Math.round(j0 - (sh * pend[2 * o0 + 1]) / fin.h), 0, N - 1);
    const att = [0, 1, 2].map((c) => Math.exp(-2 * K[c] * prof)), col = p.colore.map((v) => Math.pow(v / 255, 2.2) * 0.3), R = Math.max(0.5, rpx);
    const Ri = Math.ceil(R * (p.forma === 'ago' ? 3 : 1.2)) + 1, co = Math.cos(p.angolo), si = Math.sin(p.angolo);
    for (let dy = -Ri; dy <= Ri; dy++) for (let dx = -Ri; dx <= Ri; dx++) { const X = dx * co + dy * si, Y = -dx * si + dy * co, dd = Math.hypot(dx, dy); let a = 0;
      if (p.forma === 'bolla') a = dd <= R ? (dd > 0.7 * R ? 0.85 : X < -0.25 * R && Y < -0.25 * R && dd < 0.55 * R ? 0.7 : 0.08) : 0;
      else if (p.forma === 'cubo') a = Math.max(Math.abs(X), Math.abs(Y)) <= R ? 1 : 0;
      else if (p.forma === 'rombo') a = Math.abs(X) + 0.7 * Math.abs(Y) <= R ? 1 : 0;
      else if (p.forma === 'ago') a = Math.abs(X) <= 3 * R && Math.abs(Y) <= Math.max(0.6, 0.3 * R) ? 1 : 0;
      else if (p.forma === 'esagono') a = Math.max(Math.abs(X), 0.5 * Math.abs(X) + 0.866 * Math.abs(Y)) <= R ? 0.75 : 0;
      else if (p.forma === 'lamella') a = (X / R) ** 2 + (Y / (0.55 * R)) ** 2 <= 1 ? 1 : 0;
      else if (p.forma === 'fiocco') a = dd <= R * (0.7 + 0.3 * Math.sin(5 * Math.atan2(dy, dx) + 7 * p.angolo)) && ((Math.round(X * 1.7) ^ Math.round(Y * 1.7)) & 1) === 0 ? 0.9 : 0;
      else a = dd <= R ? 1 : dd <= R + 1 ? R + 1 - dd : 0;
      if (!(a > 0)) continue; const ii = ci + dx, jj = cj + dy; if (ii < 0 || jj < 0 || ii >= N || jj >= N) continue; const o = jj * N + ii;
      for (let c = 0; c < 3; c++) { const v = p.zattera ? Math.pow(p.colore[c] / 255, 2.2) * SCHIUMA * 1.6 : col[c] * luce[c] * att[c] + lin[3 * o + c] * (1 - att[c]); lin[3 * o + c] += (v - lin[3 * o + c]) * a; } }
  }
}
// l'attenuazione dell'acqua di quel punto (1/m), con il fango che porta: la stessa ottica di mare.js (acqua pura: Pope e Fry
// 1997; fango: Babin e altri 2003), letta dalla torbidità del campione
function attenuazione(fin) { const C = 1000 * (fin.popolazioni.campione?.torbidita || 0); return [0.34 + 8e-3 * C + 0.0005, 0.0565 + 20e-3 * C + 0.00097, 0.0092 + 50e-3 * C + 0.00225]; }

// ======================================================================================================================
// 8. CHE COSA C'È: la descrizione, coi numeri veri e la grana da cui vengono
// ======================================================================================================================
const fmt = (x) => (!Number.isFinite(x) ? String(x) : x === 0 ? '0' : Math.abs(x) >= 1e4 || Math.abs(x) < 1e-2 ? x.toExponential(1).replace('.', ',').replace('e+', '·10^').replace('e-', '·10^−') : (+x.toPrecision(3)).toString().replace('.', ','));
const lung = (m) => (m >= 1 ? `${fmt(m)} m` : m >= 1e-2 ? `${fmt(m * 100)} cm` : m >= 1e-3 ? `${fmt(m * 1000)} mm` : m >= 1e-6 ? `${fmt(m * 1e6)} µm` : `${fmt(m * 1e9)} nm`);
function descrivi(fin) {
  const P = fin.padre, sp = fin.tratto.sp, pz = fin.popolazioni, parti = [];
  parti.push(`Una finestra di ${lung(fin.L)} sul mare (${fin.N}×${fin.N} punti, un punto ${lung(fin.h)})`);
  if (P.U > 0.05) parti.push(`vento ${fmt(P.U)} m/s (meteo.js); onde alte ${fmt(P.Hs)} m e lunghe ${fmt(sp ? DUE_PI / sp.kp : 0)} m (le limita ${P.limita}, ${fmt(P.tratto / 1000)} km)`);
  else parti.push('niente vento: il mare è fermo');
  const bv = fin.bande.filter((B) => B.varianza > 0); if (bv.length) parti.push(`qui si muovono le onde da ${lung(Math.max(fin.h * 4, lambdaDi(bv[0].b) / 2))} a ${lung(lambdaDi(bv[bv.length - 1].b))} (le più lunghe della finestra sono la grana sopra che la solleva e la inclina)`);
  parti.push(`la tensione superficiale di quest'acqua è ${fmt(P.sigma * 1000)} mN/m: sotto ${lung(DUE_PI / P.km)} comanda lei (onde capillari)`);
  if (P.copertura > 0) parti.push(`la schiuma copre ${fmt(100 * P.copertura)}% del mare (Monahan)`);
  if (Math.hypot(P.corrente.u, P.corrente.v) > 1e-3) parti.push(`la corrente porta tutto a ${fmt(Math.hypot(P.corrente.u, P.corrente.v))} m/s`);
  const vis = pz.classi.filter((c) => c.visibili >= 0.5).map((c) => `${fmt(c.visibili)} ${c.materiale === 'bolla' ? 'bolle (sotto la schiuma)' : c.materiale}`);
  if (vis.length) parti.push(`nella finestra: ${vis.join(', ')}`);
  const sotto = pz.classi.filter((c) => c.nellaFinestra >= 1 && c.visibili < 0.5).map((c) => `${fmt(c.nellaFinestra)} ${c.materiale}`);
  if (sotto.length) parti.push(`più piccoli di un punto (sono il colore dell'acqua): ${sotto.join(', ')}`);
  const camp = pz.campione; if (camp && camp.ioni) { const io = Object.entries(camp.ioni).filter(([, x]) => x.nelCampione >= 1).sort((a, b) => b[1].nelCampione - a[1].nelCampione).slice(0, 3).map(([f, x]) => `${fmt(x.nelCampione)} ${f}`); if (io.length) parti.push(`sciolti: ${io.join(', ')} (e ${fmt(camp.acquaNelCampione)} molecole d'acqua)`); }
  parti.push('plancton: nessuno — il modello non ha ancora la vita (PROGETTO.md, lavoro 10)');
  return `${parti.join('; ')}.`;
}

// ======================================================================================================================
// 9. A NANOMETRI: l'acqua liquida vera e fitta, con ogni ione nel suo numero e il suo guscio
// ======================================================================================================================
// IL LIQUIDO: le posizioni degli ossigeni di una scatola periodica di acqua all'equilibrio col potenziale mW (Molinero e Moore
// 2009: un sito per molecola, due corpi più tre corpi alla Stillinger-Weber, che dà la struttura tetraedrica e la funzione di
// distribuzione radiale dell'acqua), generata da strumenti/acqua_mw.mjs con il Monte Carlo (acqua_mw.js); qui portata alla
// densità di QUELL'acqua (mare.js: densità a quella temperatura e salinità) e ripetuta per riempire la finestra (condizioni
// periodiche: la scatola ripete ogni 3 nm). Gli idrogeni: verso due delle quattro vicine più vicine (la rete dei legami a
// idrogeno), O–H 0,9572 Å e 104,52° (misurati).
// GLI IONI: quanti ne dice la concentrazione di mare.js (campioneAcqua: perM3 × volume), Poisson ione per ione CONDIZIONATI alla
// scatola neutra (la lunghezza di Debye dell'acqua di mare è 0,3 nm: in pochi nanometri la carica non fluttua; campioniNeutri); ognuno al posto di
// una molecola, con le vicine del primo guscio girate verso di lui (l'ossigeno verso un catione, un idrogeno verso un anione).
// → la stessa forma di scena di mare.js scenaMolecolare (atomi, legami, legamiH, scatola, parti, etichette, agitazione)
// IL RAGGIO DI OGNI SFERA: dove la densità elettronica dell'atomo (o dello ione: la sua carica di qui sotto) scende a 0,001
// e/a₀³ (quanti.js densitaAtomo: regole di Slater 1930; la superficie di Bader e altri 1987), in nm. Prima: i raggi di van der
// Waals e ionici scelti da tabella
const CARICA_IONE = { Na: 1, K: 1, Mg: 2, Ca: 2, Fe: 2, Cl: -1 }, raggiFatti = {};
const raggioIso = (el) => (raggiFatti[el] ??= densitaAtomo(ELEMENTO[el][0], CARICA_IONE[el] || 0).rIso() * 0.0529177210903);
// (i colori convenzionali degli elementi, quelli dei modelli CPK/Jmol, per gli ioni)
const COLORI_ELEMENTI = { 1: [255, 255, 255], 6: [144, 144, 144], 7: [48, 80, 248], 8: [255, 13, 13], 11: [171, 92, 242], 12: [138, 255, 0], 16: [255, 255, 48], 17: [31, 240, 31], 18: [128, 209, 227], 19: [143, 64, 212], 20: [61, 255, 0], 26: [224, 102, 51] };
const ELEMENTO = { H: [1, 0.11], C: [6, 0.17], N: [7, 0.155], O: [8, 0.152], Na: [11, 0.102], Mg: [12, 0.072], S: [16, 0.18], Cl: [17, 0.181], K: [19, 0.138], Ca: [20, 0.1], Fe: [26, 0.078], Ar: [18, 0.188] };
const SIMBOLI = { 'Na+': 'Na', 'K+': 'K', 'Mg2+': 'Mg', 'Ca2+': 'Ca', 'Fe2+': 'Fe', 'Cl-': 'Cl' };
let modello = null;
export function liquidoMW() {
  if (modello) return modello; const T = TEMPLATE_MW, bin = typeof atob === 'function' ? atob(T.posizioni) : Buffer.from(T.posizioni, 'base64').toString('binary'), n = bin.length / 2, q = new Int16Array(n);
  for (let i = 0; i < n; i++) { const v = bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8); q[i] = v > 32767 ? v - 65536 : v; }
  const pos = new Float64Array(n); for (let i = 0; i < n; i++) pos[i] = ((q[i] + 32768) / 65536) * T.latoNm;
  return (modello = { ...T, pos, N: n / 3 });
}
// («campione»: un'acqua già nota, nella forma di campioneAcqua — l'acqua dei pori di suolo.js —; se manca, quella del mare)
export function scenaNano(stato, { lon = 0, lat = 0, latoM = 1e-8, fondoM = null, profondita = 0, campione = null } = {}, caso = null) {
  const radiceCaso = caso || sorgente(`${stato?.radice || 'mare'}/nano/${lon.toFixed(5)}/${lat.toFixed(5)}`);
  const camp = campione || campioneAcqua(stato, { lon, lat, profondita, latoM, acqua: true, fondoM, massimo: 0 }, radiceCaso);
  if (camp.asciutto) return { atomi: { pos: new Float32Array(0), raggio: new Float32Array(0), elemento: new Uint8Array(0) }, legami: new Uint32Array(0), legamiH: new Uint32Array(0), scatola: [0, 0, 0], parti: [], etichette: [], campione: camp, asciutto: true };
  // sotto il ghiaccio marino (la finestra dentro la lastra) il solido c'è davvero: la scena del ghiaccio e della salamoia di mare.js
  if (camp.luogo?.salamoia) return scenaMolecolare(stato, { lon, lat, profondita, latoM, acqua: true, fondoM }, radiceCaso);
  const ev = radiceCaso.sotto('nano'), r = generatore(ev.seme('liquido')), M = liquidoMW(), Lnm = latoM * 1e9;
  // la densità di quell'acqua: molecole d'acqua per nm³ (campioneAcqua: kg d'acqua per m³ / massa molare)
  const nW = camp.acquaPerM3 * 1e-27, a0 = Math.cbrt(M.N / nW); // il lato della scatola mW portata a quella densità (nm)
  const rip = Math.max(1, Math.round(Lnm / a0)), Lb = rip * a0, scala = a0 / M.latoNm, NS = M.N * rip * rip * rip;
  const O = new Float64Array(3 * NS); let w = 0;
  for (let kz = 0; kz < rip; kz++) for (let ky = 0; ky < rip; ky++) for (let kx = 0; kx < rip; kx++) for (let i = 0; i < M.N; i++) { O[w++] = M.pos[3 * i] * scala + kx * a0; O[w++] = M.pos[3 * i + 1] * scala + ky * a0; O[w++] = M.pos[3 * i + 2] * scala + kz * a0; }
  // le vicine (celle di 0,35 nm, periodiche): le quattro più vicine di ogni molecola
  const vicine = quattroVicine(O, NS, Lb);
  // --- gli ioni: Poisson di ciascuno sul volume vero della scatola, CONDIZIONATI alla carica totale zero (la scatola è neutra:
  // la lunghezza di Debye è sotto il nanometro). La legge giusta è quella dei Poisson indipendenti condizionati a Σ z·n = 0
  // (campioniNeutri, sotto: esatta, per rigetto). Prima si aggiungeva sempre lo ione più abbondante del segno che mancava, e
  // quello si gonfiava (HCO₃⁻ 554 contro 426 ± 83 nelle prove): ora la media di ogni specie è E[n | Q = 0] = λ·P(Q = −z)/P(Q = 0)
  const V = (Lb * 1e-9) ** 3, quanti = {}, carica = {};
  // (gli ioni liberi e le coppie, come le classi di campioneAcqua: perM3 di ciascuno)
  const classiIoni = [];
  for (const cl of camp.classi) {
    if (cl.tipo === 'ione' && IONI[cl.materiale] && (SIMBOLI[cl.materiale] || ['SO4(2-)', 'HCO3-', 'CO3(2-)'].includes(cl.materiale))) classiIoni.push({ tipo: 'ione', f: cl.materiale, lam: cl.perM3 * V, z: IONI[cl.materiale][2] });
    if (cl.tipo === 'coppia') { const [ca, an] = cl.materiale.split(' '); if (IONI[ca] && IONI[an]) classiIoni.push({ tipo: 'coppia', ca, an, lam: cl.perM3 * V, z: IONI[ca][2] + IONI[an][2] }); }
  }
  const neutri = campioniNeutri(r, classiIoni), coppie = [];
  classiIoni.forEach((c, i) => { const m = neutri.n[i]; if (c.tipo === 'ione') { quanti[c.f] = (quanti[c.f] || 0) + m; carica[c.f] = c.z; } else if (m > 0) coppie.push({ ca: c.ca, an: c.an, m }); });
  let Q = 0; for (const f in quanti) Q += quanti[f] * carica[f]; for (const c of coppie) Q += c.m * (IONI[c.ca][2] + IONI[c.an][2]);
  // (se il condizionamento non riesce — nessuno ione di un segno, o la carica zero troppo improbabile —, come prima: si aggiunge
  // uno ione a una carica del segno che manca, o se ne toglie uno del segno in più; si conta in «aggiustati», e le prove lo dicono)
  let aggiustati = 0; const aggiunti = {};
  for (let giro = 0; Q !== 0 && giro < 1000; giro++, aggiustati++) {
    const segno = Q > 0 ? -1 : 1, uno = Object.keys(quanti).filter((f) => carica[f] === segno).sort((x, y) => quanti[y] - quanti[x])[0] || Object.keys(IONI).find((f) => IONI[f][2] === segno && SIMBOLI[f]);
    const togli = Object.keys(quanti).filter((f) => Math.sign(carica[f]) === -segno && quanti[f] > 0 && Math.abs(carica[f]) <= Math.abs(Q)).sort((x, y) => quanti[y] - quanti[x])[0];
    if (uno && Math.abs(Q) >= 1) { quanti[uno] = (quanti[uno] || 0) + 1; carica[uno] = segno; Q += segno; aggiunti[uno] = (aggiunti[uno] || 0) + 1; } else if (togli) { quanti[togli]--; Q -= carica[togli]; aggiunti[togli] = (aggiunti[togli] || 0) - 1; } else break;
  }
  const gas = {}; for (const f in camp.gas || {}) gas[f] = poisson(r, camp.gas[f].perM3 * V);
  // --- ogni ione al posto di una molecola (scelta per evento), via le molecole troppo vicine ai suoi atomi
  const via = new Uint8Array(NS), versoIone = new Float64Array(3 * NS), segnoIone = new Int8Array(NS), P = [], Rr = [], El = [], legami = [], legamiH = [], parti = [], etichette = [];
  const metti = (el, x, y, z) => { P.push(x, y, z); Rr.push(raggioIso(el)); El.push(ELEMENTO[el][0]); return El.length - 1; }, parte = (nome, da, extra = {}) => { if (El.length > da) parti.push({ nome, da, a: El.length, ...extra }); };
  const conteggi = {}, ioniMessi = [];
  const posti = (f, numero) => { const da = El.length; let fatti = 0;
    for (let q = 0; q < numero; q++) { let n = -1; for (let p = 0; p < 60; p++) { const c = Math.floor(r() * NS); if (!via[c]) { n = c; break; } } if (n < 0) break; via[n] = 2;
      const c = [O[3 * n], O[3 * n + 1], O[3 * n + 2]]; molecolaIone(f, c, r, metti, legami); ioniMessi.push({ f, c, n }); fatti++;
      // il primo guscio: le molecole entro raggio dello ione + 1,38 Å + metà della distanza tra vicine
      const rg = ((IONI[f] ? IONI[f][6] : 2) + 1.38 + 1.4) / 10, sg = IONI[f] ? Math.sign(IONI[f][2]) : 0;
      perVicinanza(O, NS, Lb, c, rg + 0.05, (m, d2) => { if (m === n || via[m]) return; if (d2 < ((IONI[f] ? IONI[f][6] : 2) / 10 + 0.12) ** 2) { via[m] = 1; return; } versoIone[3 * m] = c[0]; versoIone[3 * m + 1] = c[1]; versoIone[3 * m + 2] = c[2]; segnoIone[m] = sg; }); }
    conteggi[f] = fatti; parte(f, da, IONI[f] ? { carica: IONI[f][2] } : {}); };
  for (const f of Object.keys(quanti).sort()) posti(f, quanti[f]);
  // le coppie: il catione al posto di una molecola, l'anione a contatto (Mg²⁺ con il suo guscio in mezzo: 2,76 Å in più)
  for (const { ca, an, m } of coppie) { const da = El.length; let fatti = 0;
    for (let q = 0; q < m; q++) { let n = -1; for (let p = 0; p < 60; p++) { const c = Math.floor(r() * NS); if (!via[c]) { n = c; break; } } if (n < 0) break; via[n] = 2;
      const c = [O[3 * n], O[3 * n + 1], O[3 * n + 2]], g = gaussiane(r), g2 = gaussiane(r), dv = [g[0], g[1], g2[0]], ld = Math.hypot(...dv) || 1, dist = (IONI[ca][6] + IONI[an][6] + (ca === 'Mg2+' ? 2.76 : 0)) / 10, c2 = c.map((x, k) => x + (dv[k] / ld) * dist);
      molecolaIone(ca, c, r, metti, legami); molecolaIone(an, c2, r, metti, legami); ioniMessi.push({ f: ca, c, n }, { f: an, c: c2, n: -1 }); fatti++;
      for (const [f, cc] of [[ca, c], [an, c2]]) { const rg = (IONI[f][6] + 1.38 + 1.4) / 10, sg = Math.sign(IONI[f][2]); perVicinanza(O, NS, Lb, cc, rg + 0.05, (mm, d2) => { if (mm === n || via[mm]) return; if (d2 < (IONI[f][6] / 10 + 0.12) ** 2) { via[mm] = 1; return; } if (!segnoIone[mm]) { versoIone[3 * mm] = cc[0]; versoIone[3 * mm + 1] = cc[1]; versoIone[3 * mm + 2] = cc[2]; segnoIone[mm] = sg; } }); } }
    conteggi[`${ca} ${an}`] = fatti; parte(`coppia ${ca} ${an}`, da); }
  for (const f of Object.keys(gas)) posti(f, gas[f]);
  // --- l'acqua: ogni molecola al suo posto, gli idrogeni verso due delle sue vicine (o girata verso lo ione che ha accanto)
  const daAcqua = El.length, OH = 0.09572, mezzo = (104.52 / 2) * RAD, cs = Math.cos(mezzo), sn = Math.sin(mezzo), indiceO = new Int32Array(NS).fill(-1), riceve = new Uint8Array(NS); let nAcqua = 0;
  const dif = (m, n) => { let x = O[3 * m] - O[3 * n], y = O[3 * m + 1] - O[3 * n + 1], z = O[3 * m + 2] - O[3 * n + 2]; x -= Lb * Math.round(x / Lb); y -= Lb * Math.round(y / Lb); z -= Lb * Math.round(z / Lb); const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
  for (let n = 0; n < NS; n++) { if (via[n]) continue; const ox = O[3 * n], oy = O[3 * n + 1], oz = O[3 * n + 2];
    // i due donatori: le vicine che hanno ricevuto meno (ognuna ne riceve al più due), in ordine di distanza
    const vic = []; for (let q = 0; q < 4; q++) { const m = vicine[4 * n + q]; if (m >= 0 && !via[m]) vic.push(m); }
    vic.sort((a, b) => riceve[a] - riceve[b]); let m1 = vic[0] ?? -1, m2 = vic[1] ?? -1;
    let d1 = m1 >= 0 ? dif(m1, n) : [1, 0, 0], d2 = m2 >= 0 ? dif(m2, n) : [0, 1, 0];
    if (segnoIone[n]) { let x = ox - versoIone[3 * n], y = oy - versoIone[3 * n + 1], z = oz - versoIone[3 * n + 2]; x -= Lb * Math.round(x / Lb); y -= Lb * Math.round(y / Lb); z -= Lb * Math.round(z / Lb); const l = Math.hypot(x, y, z) || 1, v = [x / l, y / l, z / l];
      if (segnoIone[n] > 0) { const pr = d1[0] * v[0] + d1[1] * v[1] + d1[2] * v[2], pe = [d1[0] - pr * v[0], d1[1] - pr * v[1], d1[2] - pr * v[2]], lp = Math.hypot(...pe) || 1; d1 = [v[0] * cs + (pe[0] / lp) * sn, v[1] * cs + (pe[1] / lp) * sn, v[2] * cs + (pe[2] / lp) * sn]; d2 = [v[0] * cs - (pe[0] / lp) * sn, v[1] * cs - (pe[1] / lp) * sn, v[2] * cs - (pe[2] / lp) * sn]; m1 = -1; m2 = -1; }
      else { d1 = [-v[0], -v[1], -v[2]]; m1 = -1; } }
    let b = [d1[0] + d2[0], d1[1] + d2[1], d1[2] + d2[2]], lb = Math.hypot(...b); if (lb < 1e-3) { b = [d1[1], -d1[0], 0]; lb = Math.hypot(...b) || 1; } b = b.map((x) => x / lb);
    let pp = [d1[0] - d2[0], d1[1] - d2[1], d1[2] - d2[2]]; const pb = pp[0] * b[0] + pp[1] * b[1] + pp[2] * b[2]; pp = pp.map((x, q) => x - pb * b[q]); const lpp = Math.hypot(...pp) || 1; pp = pp.map((x) => x / lpp);
    const o = metti('O', ox, oy, oz), h1 = metti('H', ox + OH * (cs * b[0] + sn * pp[0]), oy + OH * (cs * b[1] + sn * pp[1]), oz + OH * (cs * b[2] + sn * pp[2])), h2 = metti('H', ox + OH * (cs * b[0] - sn * pp[0]), oy + OH * (cs * b[1] - sn * pp[1]), oz + OH * (cs * b[2] - sn * pp[2]));
    legami.push(o, h1, o, h2); indiceO[n] = o; if (m1 >= 0) { legamiH.push(h1, m1); riceve[m1]++; } if (m2 >= 0) { legamiH.push(h2, m2); riceve[m2]++; } nAcqua++; }
  { let q = 0; for (let x = 0; x < legamiH.length; x += 2) { const io = indiceO[legamiH[x + 1]]; if (io >= 0) { legamiH[q++] = legamiH[x]; legamiH[q++] = io; } } legamiH.length = q; }
  parte('acqua', daAcqua); conteggi.acqua = nAcqua;
  // il guscio misurato: quante molecole stanno nel primo guscio di ogni catione (per le prove e per chi guarda)
  const gusci = {}; for (const { f, c } of ioniMessi) { if (!IONI[f]) continue; const rg = (IONI[f][6] + 1.38 + 0.9) / 10; let k = 0; perVicinanza(O, NS, Lb, c, rg, (m) => { if (!via[m]) k++; }); (gusci[f] ||= []).push(k); }
  const Tq = camp.T, fT = (Tq / 298.15) * (8.9e-4 / camp.viscosita), Dnm = (D) => D * 1e6;
  const agitazione = { T: Tq, kT: KB * Tq, legameOH: { ampiezzaNm: 0.007, periodoFs: 9.3 }, piegamento: { ampiezzaGradi: 8.7, periodoFs: 20 }, oscillazione: { ampiezzaGradi: 15 * Math.sqrt(Tq / 298.15), periodoFs: 60 },
    gabbia: { ampiezzaNm: 0.03 * Math.sqrt(Tq / 298.15), periodoFs: 170 }, legameIdrogeno: { vitaPs: 1.0 / fT, giratePs: 2.5 / fT },
    diffusione: Object.fromEntries([['acqua', Dnm(2.3e-9 * fT)], ...Object.keys(quanti).filter((f) => IONI[f]).map((f) => [f, Dnm(IONI[f][5] * 1e-9 * fT)])]) };
  const attesi = { acqua: nW * Lb ** 3 }; for (const f in camp.ioni) attesi[f] = (camp.ioni[f].perM3 || 0) * V;
  const messi = {}; for (const f in quanti) messi[f] = (messi[f] || 0) + (conteggi[f] || 0); for (const c of coppie) { const k = conteggi[`${c.ca} ${c.an}`] || 0; messi[c.ca] = (messi[c.ca] || 0) + k; messi[c.an] = (messi[c.an] || 0) + k; }
  // I COLORI, ALLA «ILLUSTRATE» (Goodsell e altri 2019: un colore pieno per tipo di molecola, l'ombra solo dove le sfere si
  // toccano): l'acqua ha il colore che quest'acqua rimanda a chi la guarda (coloreMare, lo stesso delle finestre di sopra),
  // l'ossigeno un poco più scuro e l'idrogeno più chiaro; gli ioni e il resto i colori convenzionali degli elementi. Così,
  // avvicinandosi, le molecole escono dall'acqua del loro colore e non da un altro (mappa.js, tesseraNano: la stessa scena in piano)
  const cAcqua = coloreMare(stato, lon, lat, { profonditaM: fondoM ?? camp.luogo?.fondoM ?? 100, acqua: true, scalaM: latoM }) || [40, 70, 100], col = new Uint8Array(3 * El.length), pa = parti.find((q) => q.nome === 'acqua');
  for (let i = 0; i < El.length; i++) { const z = El[i], acquaI = pa && i >= pa.da && i < pa.a, c = acquaI ? cAcqua.map((v) => (z === 1 ? v + (255 - v) * 0.35 : v * 0.9)) : COLORI_ELEMENTI[z] || [200, 200, 200]; col[3 * i] = c[0]; col[3 * i + 1] = c[1]; col[3 * i + 2] = c[2]; }
  return { atomi: { pos: Float32Array.from(P), raggio: Float32Array.from(Rr), elemento: Uint8Array.from(El), colore: col }, colora: 'auto', coloreAcqua: cAcqua, legami: Uint32Array.from(legami), legamiH: Uint32Array.from(legamiH), scatola: [Lb, Lb, Lb], unita: 'nm', parti, etichette, agitazione, conteggi, attesi,
    gusci, messi, carica: Q, aggiustati, aggiunti, classiIoni, tentativi: neutri.tentativi, condizionati: neutri.riuscito, latoNm: Lb, volumeM3: V, solido: null, campione: camp, nuclei: camp.nuclei, densitaNm3: nW, ripetizioni: rip, modello: { nome: M.nome, T: M.T, N: M.N, latoNm: M.latoNm, fonte: M.fonte },
    descrizione: `l'acqua di questo mare in un cubetto di ${Lb.toFixed(1)} nm: ${nAcqua} molecole d'acqua alla sua densità (${(nW).toFixed(2)} per nm³, struttura del liquido dal potenziale mW), ${Object.entries(conteggi).filter(([f, x]) => f !== 'acqua' && x > 0).map(([f, x]) => `${x} ${f}`).join(', ') || 'nessuno ione (in questo volume se ne aspettano meno di uno)'}; ogni ione col suo guscio d'acqua.` };
}
function molecolaIone(f, c, r, metti, legami) {
  // un orientamento a caso (dall'evento della scena), poi gli atomi della specie
  const u = gaussiane(r), v = gaussiane(r), ux = [u[0], u[1], v[0]], lu = Math.hypot(...ux) || 1, e1 = ux.map((x) => x / lu), t0 = Math.abs(e1[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  let e2 = [e1[1] * t0[2] - e1[2] * t0[1], e1[2] * t0[0] - e1[0] * t0[2], e1[0] * t0[1] - e1[1] * t0[0]]; const l2 = Math.hypot(...e2); e2 = e2.map((x) => x / l2); const e3 = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
  const at = (el, a, b, cc) => metti(el, c[0] + a * e1[0] + b * e2[0] + cc * e3[0], c[1] + a * e1[1] + b * e2[1] + cc * e3[1], c[2] + a * e1[2] + b * e2[2] + cc * e3[2]);
  if (SIMBOLI[f]) return at(SIMBOLI[f], 0, 0, 0);
  if (f === 'SO4(2-)') { const s0 = at('S', 0, 0, 0), q = 0.149 / Math.sqrt(3); for (const [x, y, z] of [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]]) legami.push(s0, at('O', q * x, q * y, q * z)); return s0; }
  if (f === 'CO3(2-)' || f === 'HCO3-') { const c0 = at('C', 0, 0, 0); let ult = 0; for (let q = 0; q < 3; q++) { ult = at('O', 0.129 * Math.cos((q * DUE_PI) / 3), 0.129 * Math.sin((q * DUE_PI) / 3), 0); legami.push(c0, ult); } if (f === 'HCO3-') legami.push(ult, at('H', 0.129 * Math.cos((4 * Math.PI) / 3) - 0.05, 0.129 * Math.sin((4 * Math.PI) / 3) - 0.082, 0)); return c0; }
  if (f === 'CO2') { const c0 = at('C', 0, 0, 0); legami.push(c0, at('O', 0.116, 0, 0), c0, at('O', -0.116, 0, 0)); return c0; }
  if (f === 'O2') { const o0 = at('O', 0.0604, 0, 0); legami.push(o0, at('O', -0.0604, 0, 0)); return o0; }
  if (f === 'N2') { const n0 = at('N', 0.0549, 0, 0); legami.push(n0, at('N', -0.0549, 0, 0)); return n0; }
  if (f === 'H2S') { const s0 = at('S', 0, 0, 0); legami.push(s0, at('H', 0.134, 0, 0), s0, at('H', -0.0045, 0.134, 0)); return s0; }
  return at('Ar', 0, 0, 0);
}
// le molecole entro r da un punto (periodico): una passata sola sulle celle, con una griglia tenuta per scena
const griglie = new WeakMap();
function grigliaDi(O, NS, Lb) { let g = griglie.get(O); if (g) return g; const nc = Math.max(1, Math.floor(Lb / 0.35)), cel = Lb / nc, testa = new Int32Array(nc * nc * nc).fill(-1), dopo = new Int32Array(NS);
  for (let i = 0; i < NS; i++) { const a = ((Math.floor(O[3 * i] / cel) % nc) + nc) % nc, b = ((Math.floor(O[3 * i + 1] / cel) % nc) + nc) % nc, c = ((Math.floor(O[3 * i + 2] / cel) % nc) + nc) % nc, k = (c * nc + b) * nc + a; dopo[i] = testa[k]; testa[k] = i; }
  g = { nc, cel, testa, dopo }; griglie.set(O, g); return g; }
function perVicinanza(O, NS, Lb, c, raggio, f) { const g = grigliaDi(O, NS, Lb), R = Math.ceil(raggio / g.cel), a0 = Math.floor(c[0] / g.cel), b0 = Math.floor(c[1] / g.cel), c0 = Math.floor(c[2] / g.cel), r2 = raggio * raggio, visti = new Set();
  for (let dc = -R; dc <= R; dc++) for (let db = -R; db <= R; db++) for (let da = -R; da <= R; da++) { const a = (((a0 + da) % g.nc) + g.nc) % g.nc, b = (((b0 + db) % g.nc) + g.nc) % g.nc, cc = (((c0 + dc) % g.nc) + g.nc) % g.nc, k = (cc * g.nc + b) * g.nc + a; if (visti.has(k)) continue; visti.add(k);
    for (let m = g.testa[k]; m >= 0; m = g.dopo[m]) { let x = O[3 * m] - c[0], y = O[3 * m + 1] - c[1], z = O[3 * m + 2] - c[2]; x -= Lb * Math.round(x / Lb); y -= Lb * Math.round(y / Lb); z -= Lb * Math.round(z / Lb); const d2 = x * x + y * y + z * z; if (d2 <= r2) f(m, d2); } } }
function quattroVicine(O, NS, Lb) { const out = new Int32Array(4 * NS).fill(-1), d = new Float64Array(4);
  for (let n = 0; n < NS; n++) { d.fill(Infinity); const c = [O[3 * n], O[3 * n + 1], O[3 * n + 2]];
    perVicinanza(O, NS, Lb, c, 0.34, (m, d2) => { if (m === n) return; for (let q = 0; q < 4; q++) if (d2 < d[q]) { for (let s = 3; s > q; s--) { d[s] = d[s - 1]; out[4 * n + s] = out[4 * n + s - 1]; } d[q] = d2; out[4 * n + q] = m; break; } }); }
  return out; }
// la funzione di distribuzione radiale ossigeno-ossigeno di una nuvola periodica di punti (nm), fino a rMax, in nb intervalli
export function distribuzioneRadiale(O, NS, Lb, { rMax = 0.8, nb = 80 } = {}) {
  const h = rMax / nb, conta = new Float64Array(nb), rho = NS / Lb ** 3;
  for (let n = 0; n < NS; n++) perVicinanza(O, NS, Lb, [O[3 * n], O[3 * n + 1], O[3 * n + 2]], rMax, (m, d2) => { if (m === n) return; const k = Math.floor(Math.sqrt(d2) / h); if (k < nb) conta[k]++; });
  const r = new Float64Array(nb), g = new Float64Array(nb); for (let k = 0; k < nb; k++) { r[k] = (k + 0.5) * h; const V = (4 / 3) * Math.PI * (((k + 1) * h) ** 3 - (k * h) ** 3); g[k] = conta[k] / (NS * rho * V); }
  return { r, g, h, rho };
}

// ======================================================================================================================
// 10. ATTREZZI: il generatore di una cella (dal suo evento), le gaussiane, Poisson, la normale inversa, la trasformata
// ======================================================================================================================
// (un evento per cella o per tessera — il suo seme — e da lì una successione: mulberry32)
export function generatore(seme) { let a = seme >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return (((t ^ (t >>> 14)) >>> 0) + 0.5) / 4294967296; }; }
export function gaussiane(r) { const u = r(), v = r(), m = Math.sqrt(-2 * Math.log(u)); return [m * Math.cos(DUE_PI * v), m * Math.sin(DUE_PI * v)]; }
// I POISSON CONDIZIONATI ALLA CARICA ZERO. Classi c con media λ_c e carica z_c (ioni liberi e coppie); la legge è quella dei
// Poisson indipendenti condizionati a Q = Σ z_c·n_c = 0. Esatta, per rigetto: si tirano tutte le classi tranne il PERNO (lo ione
// a una carica più abbondante), il perno è allora fissato a n_p = −Q'/z_p, e lo si accetta con probabilità p(n_p)/p(moda)
// (p la legge di Poisson del perno: l'inviluppo è la sua moda). Senza ioni a una carica: rigetto semplice su tutto. Poisson
// esatto anche per le medie grandi (PTRS, Hörmann 1993; la «poisson» qui sotto approssima con una normale sopra 60).
// → { n: [conteggi per classe], riuscito, tentativi }
const LNF = [0]; for (let i = 1; i < 32; i++) LNF[i] = LNF[i - 1] + Math.log(i);
export const lnFattoriale = (n) => (n < 32 ? LNF[n] : (n + 0.5) * Math.log(n + 1) - (n + 1) + 0.5 * Math.log(DUE_PI) + 1 / (12 * (n + 1)) - 1 / (360 * (n + 1) ** 3) + 1 / (1260 * (n + 1) ** 5));
export function poissonEsatto(r, lam) {
  if (!(lam > 0)) return 0; if (lam < 10) { const L = Math.exp(-lam); let k = 0, p = r(); while (p > L) { k++; p *= r(); } return k; }
  const sl = Math.sqrt(lam), ll = Math.log(lam), b = 0.931 + 2.53 * sl, a = -0.059 + 0.02483 * b, ia = 1.1239 + 1.1328 / (b - 3.4), vr = 0.9277 - 3.6224 / (b - 2);
  for (;;) { const U = r() - 0.5, Vv = r(), us = 0.5 - Math.abs(U), k = Math.floor(((2 * a) / us + b) * U + lam + 0.43);
    if (us >= 0.07 && Vv <= vr) return k; if (k < 0 || (us < 0.013 && Vv > us)) continue;
    if (Math.log(Vv) + Math.log(ia) - Math.log(a / (us * us) + b) <= -lam + k * ll - lnFattoriale(k)) return k; }
}
export function campioniNeutri(r, classi, { massimo = 200000 } = {}) {
  const n = classi.map(() => 0); if (!classi.length) return { n, riuscito: true, tentativi: 0 };
  let p = -1; classi.forEach((c, i) => { if (c.tipo !== 'coppia' && Math.abs(c.z) === 1 && c.lam > 0 && (p < 0 || c.lam > classi[p].lam)) p = i; });
  const lp = p >= 0 ? classi[p].lam : 0, moda = Math.floor(lp), lnMax = p >= 0 ? moda * Math.log(lp) - lnFattoriale(moda) : 0;
  for (let t = 1; t <= massimo; t++) {
    let Q = 0; for (let i = 0; i < classi.length; i++) { if (i === p) continue; n[i] = poissonEsatto(r, classi[i].lam); Q += n[i] * classi[i].z; }
    if (p < 0) { if (Q === 0) return { n, riuscito: true, tentativi: t }; continue; }
    const np = -Q * classi[p].z; if (np < 0) continue; // (z_p = ±1: −Q/z_p = −Q·z_p)
    if (r() <= Math.exp(np * Math.log(lp) - lnFattoriale(np) - lnMax)) { n[p] = np; return { n, riuscito: true, tentativi: t }; }
  }
  for (let i = 0; i < classi.length; i++) n[i] = poissonEsatto(r, classi[i].lam); return { n, riuscito: false, tentativi: massimo };
}
// le medie esatte di quella legge: E[n_c | Q = 0] = λ_c·P(Q = −z_c)/P(Q = 0) (da E[n·f(n)] = λ·E[f(n + 1)] del Poisson), con la
// legge di Q per convoluzione delle classi (ognuna troncata dove la sua coda pesa meno di 10⁻¹⁶). Per le prove e per chi guarda.
export function medieNeutre(classi) {
  const pmfZ = classi.map((c) => { const nM = Math.ceil(c.lam + 12 * Math.sqrt(c.lam) + 30), p = new Float64Array(nM + 1); for (let k = 0; k <= nM; k++) p[k] = c.lam > 0 ? Math.exp(k * Math.log(c.lam) - c.lam - lnFattoriale(k)) : k === 0 ? 1 : 0; return p; });
  let lo = 0, d = new Float64Array([1]);
  classi.forEach((c, i) => { const p = pmfZ[i], z = c.z, nM = p.length - 1, lo2 = lo + Math.min(0, z * nM), hi2 = lo + d.length - 1 + Math.max(0, z * nM), e = new Float64Array(hi2 - lo2 + 1);
    for (let a = 0; a < d.length; a++) { const da = d[a]; if (da < 1e-300) continue; for (let k = 0; k <= nM; k++) e[a + lo - lo2 + z * k] += da * p[k]; } d = e; lo = lo2; });
  const PQ = (q) => (q - lo >= 0 && q - lo < d.length ? d[q - lo] : 0), p0 = PQ(0);
  return { medie: classi.map((c) => (p0 > 0 ? (c.lam * PQ(-c.z)) / p0 : NaN)), pZero: p0, mediaQ: classi.reduce((a, c) => a + c.z * c.lam, 0), varQ: classi.reduce((a, c) => a + c.z * c.z * c.lam, 0) };
}
export function poisson(r, media) {
  if (!(media > 0)) return 0; if (media > 60) return Math.max(0, Math.round(media + Math.sqrt(media) * gaussiane(r)[0]));
  const L = Math.exp(-media); let k = 0, p = r(); while (p > L) { k++; p *= r(); } return k;
}
// Φ⁻¹ (Acklam 2003: errore relativo sotto 1,15·10⁻⁹)
export function normaleInversa(p) {
  if (!(p > 0)) return -Infinity; if (!(p < 1)) return Infinity;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239], b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1], c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783], d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  if (p < 0.02425) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - 0.02425) return -normaleInversa(1 - p);
  const q = p - 0.5, r = q * q; return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}
// Φ (Abramowitz e Stegun 7.1.26 sull'erf: errore sotto 1,5·10⁻⁷)
export function normaleCumulata(x) { const z = Math.abs(x) / Math.SQRT2, t = 1 / (1 + 0.3275911 * z), y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z); return x >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y); }
// la trasformata di Fourier 2D n×n (n potenza di 2), sul posto: segno +1 = e^(+i…) (sintesi, senza 1/n²); tavole per n
const TAVOLE = new Map();
function tavola(n, segno) { const k = n * segno; let t = TAVOLE.get(k); if (t) return t; const rev = new Int32Array(n); for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; rev[i] = j; }
  const wr = new Float64Array(n / 2), wi = new Float64Array(n / 2); for (let q = 0; q < n / 2; q++) { wr[q] = Math.cos((segno * DUE_PI * q) / n); wi[q] = Math.sin((segno * DUE_PI * q) / n); } t = { rev, wr, wi }; TAVOLE.set(k, t); return t; }
function fft1(re, im, off, passo, n, T) {
  const { rev, wr, wi } = T; for (let i = 1; i < n; i++) { const j = rev[i]; if (i < j) { const a = off + i * passo, b = off + j * passo; let t = re[a]; re[a] = re[b]; re[b] = t; t = im[a]; im[a] = im[b]; im[b] = t; } }
  for (let len = 2; len <= n; len <<= 1) { const mezzo = len >> 1, salto = n / len;
    for (let i = 0; i < n; i += len) for (let k = 0; k < mezzo; k++) { const cr = wr[k * salto], ci = wi[k * salto], a = off + (i + k) * passo, b = a + mezzo * passo, xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr; re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi; } }
}
function fft2(re, im, n, segno) { const T = tavola(n, segno);
  for (let j = 0; j < n; j++) { let vuota = true; for (let i = j * n, f = i + n; i < f; i++) if (re[i] !== 0 || im[i] !== 0) { vuota = false; break; } if (!vuota) fft1(re, im, j * n, 1, n, T); } // (le righe vuote dello spettro restano vuote)
  for (let i = 0; i < n; i++) fft1(re, im, i, n, n, T); }
