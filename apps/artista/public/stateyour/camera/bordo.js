// bordo.js — LE BOLLE SUL BORDO (PROGETTO.md lavoro 6; LINGUA.md O11, C9, C10, C15; INTRECCIO.md regole 11–13).
//
// L'IDEA (dell'utente, resa precisa): «qualsiasi sfera di spaziotempo può essere riassunta in un campo; qualsiasi campo
// lascia un'impronta sulla propria sfera». Una bolla qui è una sfera S di raggio R (comovente) attorno a un punto x_B, a
// un istante, sulla fetta del fondo cosmico; il campo è quello del cosmo senza bordo (campo_pigro.js), uno solo.
//
// 1. L'IMPRONTA DI BORDO (O11).  a^φ_ℓm = ∫_∂S φ(x_B + R n̂)·Y_ℓm(n̂) dΩ,  ℓ ≤ ℓmax,  per φ = densità δ e potenziale Φ.
//    · Y_ℓm REALI e ortonormali (Y_ℓ0 = P̄_ℓ⁰; Y_ℓ,±m = √2·P̄_ℓ^m·cos mφ, sin mφ, con le P̄ normalizzate e la fase di
//      Condon–Shortley di ragnatela.js `legendre`): il campo è reale, i coefficienti anche; indice ℓ² + ℓ + m.
//    · ℓmax DAL MODELLO, non scelto: ℓmax = ⌈k_max·R⌉, con k_max = π/h_J il bordo ESATTO della banda del campo alla grana J
//      (la finestra B_J di campo_pigro.js è nulla oltre 2k_J = π/h_J). Un'onda di numero k sulla sfera ha potenza solo in
//      j_ℓ(kR)², che oltre ℓ ≈ kR cade a picco [R: Abramowitz & Stegun 10.1]: troncare a ℓmax è il riassunto M_g del bordo
//      (LINGUA.md: ℓ ≈ πR/λ). Ciò che resta oltre ℓmax NON è nascosto: `coda` è la parte della varianza del bordo che sta
//      oltre (dalla teoria: C_ℓ = 4π∫dlnk Δ²(k)·ΣB_j²(k)·j_ℓ(kR)²), e la prova la usa come tolleranza.
//    · COME SI CALCOLA, ESATTO per il campo com'è (nuclei troncati e tabelle interpolate comprese): il campo è lineare nelle
//      celle, δ(x) = Σ_c w_c·K_j(|x − x_c|) (w_c gli eventi di eventi.js); l'impronta di una cella è, per il teorema di
//      Funk–Hecke [R], a_ℓm(c) = λ_ℓ(d)·Y_ℓm(d̂), d = x_c − x_B, con
//          λ_ℓ(d) = 2π∫₋₁¹ K(√(R² + d² − 2Rdμ))·P_ℓ(μ) dμ = (2π/(Rd))·∫_{|R−d|}^{R+d} K(r)·P_ℓ(μ(r))·r dr.
//      K è lineare a tratti sulla tabella (passo h/96): su ogni tratto l'integrando è un polinomio di grado 2ℓ + 2, che
//      Gauss–Legendre con ℓmax + 2 nodi integra ESATTAMENTE. Quindi a_ℓm = Σ_c w_c·a_ℓm(c) è l'integrale vero sulla sfera
//      del campo che `delta` dà punto per punto (la prova lo rifà con una quadratura sulla sfera: seconda via).
//    · IL TEMPO: il campo lineare cresce come D(a) (galassie.js U.D: una fonte); il potenziale fisico è quello di Poisson
//      in coordinate comoventi, ∇²Φ = (3/2)Ω_m H₀²·δ/a, cioè Φ = (3/2)Ω_m H₀²·(D/a)·φ con ∇²φ = δ (φ: `in().potenziale`).
//      L'istante è in anni dall'inizio del cosmo, come in bolle.js; il fattore di scala è quello di U.scala.
//    · È FUNZIONE PURA dell'indirizzo e della bolla: le stesse celle, nello stesso ordine; la geometria (le impronte delle
//      celle) non dipende dall'indirizzo e si tiene in memoria (si può buttare: torna identica).
//
// 2. L'INCOLLAMENTO E LA RICOSTRUZIONE (C15, C10).  Due bolle che si sovrappongono vedono lo stesso campo: sulla parte di
//    bordo comune (il cerchio ∂S₁ ∩ ∂S₂) le due impronte, risommate, danno lo stesso valore a meno di ciò che ciascuna
//    tronca, e quel resto ha una varianza che il modello dà ESATTA (le celle sono N(0,1) indipendenti: è Σ_c r_c², con r la
//    forma lineare «campo nel punto meno la sua risomma»). Il condizionamento al bordo è quello di Hoffman e Ribak (1991)
//    nelle celle, come `vincola` di campo_pigro.js, con l'impronta come vincolo: w′ = w + Aᵀ(AAᵀ)⁻¹(c − Aw). Dato solo il
//    bordo, l'interno ha media ξᵀC⁻¹c e varianza ⟨φ²⟩ − ξᵀC⁻¹ξ (ξ = A·g_x): la prova controlla, su mondi indipendenti, che
//    il campo vero ci stia con la statistica attesa (χ²). Due bolle di DUE MONDI DIVERSI sulla stessa regione si possono
//    sempre condizionare insieme (un campo gaussiano ha infiniti gradi), ma pesano meno: il loro χ² ha media
//    tr(C⁻¹·diag(C₁₁, C₂₂)) invece del numero dei vincoli. È la regola 12 detta per il bordo: le bolle non si cuciono,
//    si condiziona lo stesso campo a tutte insieme, e se non vengono dallo stesso mondo lo dice il peso.
//    NON C'È: il condizionamento di un campo già vincolato (il cosmo con le sue galassie): si vincola il campo libero con
//    tutti i vincoli insieme, e la correzione di un campo vincolato non è leggibile da fuori (campo_pigro.js non la dà);
//    per un cosmo della biblioteca servirebbe passare le impronte a `vincola` insieme alle galassie (manca).
//
// 3. L'ANTENATO COMUNE TRA LUOGHI E ISTANTI DIVERSI (C10; INTRECCIO.md r. 12). In tempo conforme η (Mpc: c = 1) e
//    coordinate comoventi la metrica di Friedmann piatta è conforme a quella di Minkowski: i coni di luce sono a 45° e
//    J⁻(p) = { (x, η) : η_p − η ≥ |x − x_p| } ESATTAMENTE [R]. Due eventi p, q (o due bolle, con i loro raggi R_p, R_q):
//      s = max(0, |x_p − x_q| − R_p − R_q);  se |η_p − η_q| ≥ s l'uno sta nel passato dell'altro e l'antenato è il più vecchio;
//      altrimenti  η_c = (η_p + η_q − s)/2,  sul segmento, a distanza R_p + η_p − η_c da x_p
//    (la formula di «Tesi del multiverso indirizzabile», qui con i raggi). η(a) è la tabella di ragnatela.js (con la
//    radiazione: una fonte). Se η_c ≤ 0 l'antenato sarebbe PRIMA DELL'INIZIO (η = 0 a a = 0): in Friedmann quelle due
//    bolle non hanno passato comune (oltre 2η₀ ≈ 28 Gpc oggi). IPOTESI DICHIARATA, L'INFLAZIONE: prima di η = 0 c'è un'epoca
//    con tempo conforme negativo (de Sitter: η = −1/(aH)); lì l'antenato esiste, a η_c < 0, quando la scala |Δx|/2 usciva
//    dall'orizzonte di Hubble. Il campo del modello ha già questa ipotesi dentro: è correlato oltre l'orizzonte.
//    Per più di due eventi: la punta dell'intersezione dei coni; qui è esatta quando la sostiene una coppia (la punta della
//    coppia più stretta sta nei coni di tutti), altrimenti si dà il limite superiore e lo si dice.
//
// 4. IL CONO DI LUCE DI UN RAMO (C9).  Un ramo su una cella del campo cambia il campo solo entro il raggio del suo nucleo,
//    r_j = 6·h_j (campo_pigro.js). Perché questo sia «solo in J⁺(e)» l'evento della cella deve stare a η_e ≤ −r_j: è la
//    stessa IPOTESI DELL'INFLAZIONE (le celle sono fluttuazioni nate prima della fine dell'inflazione, η = 0). Senza di essa
//    i livelli con r_j > η della bolla violerebbero C9 (è il problema dell'orizzonte): `senzaInflazione` li elenca, con la
//    parte della varianza che portano. La prova: un ramo su una cella fuori dalla portata della sfera lascia l'impronta
//    identica al bit; dentro la cambia, e la cella sta nel passato causale del bordo.
//
// PARAMETRI LIBERI: nessuno. Numerici (dichiarati): ℓmax + 2 nodi di Gauss–Legendre per tratto di tabella (esatto);
// RANGO di bolle.js per i vincoli che non aggiungono niente (10⁻¹²); 4000 punti in ln k per la coda teorica.
// CHE COSA NON TORNA / NON C'È (dichiarato): Gauss (∮∇Φ·dA = 4πG·M_dentro) e Dirichlet valgono per i nuclei veri, ma quelli
// di campo_pigro.js sono troncati e rinormalizzati ciascuno per conto suo (δ e −∇·Ψ differiscono di ~0,06 scarti): qui non
// sono provati; temperatura, campo magnetico e radianza (O11) non hanno ancora un campo su cui lasciare l'impronta; la
// bolla è sulla fetta del fondo (in moto, la sua sezione è inclinata: relativita.js `sezioneDi`, non usata qui).

import { campoPigro, PIGRO } from './campo_pigro.js';
import { campoLibero, LIVELLO_COSMO, RANGO, probabilitaChi2 } from './bolle.js';
import { dentro as RG } from './ragnatela.js';
import { COSMOLOGIA as U } from './galassie.js';
import { COSMO, MPC } from './leggi.js';

const PI2 = 2 * Math.PI, SQ2 = Math.SQRT2;
const H0s = (COSMO.H0 * 1e3) / MPC; // 1/s
const lungo = (a) => Math.hypot(a[0], a[1], a[2]), cifre = (x) => String(+x.toPrecision(4)).replace('.', ',');

// ---------- attrezzi: Gauss–Legendre, Legendre, armoniche reali
const nodiGL = new Map();
export function gaussLegendre(n) { // nodi e pesi su [−1, 1]
  let G = nodiGL.get(n); if (G) return G; const x = new Float64Array(n), w = new Float64Array(n);
  for (let i = 0; i < n; i++) { let z = Math.cos((Math.PI * (i + 0.75)) / (n + 0.5)), dp = 1;
    for (let it = 0; it < 100; it++) { let p0 = 1, p1 = z; for (let k = 2; k <= n; k++) { const p2 = ((2 * k - 1) * z * p1 - (k - 1) * p0) / k; p0 = p1; p1 = p2; } dp = (n * (z * p1 - p0)) / (z * z - 1); const dz = p1 / dp; z -= dz; if (Math.abs(dz) < 1e-16) break; }
    x[i] = z; w[i] = 2 / ((1 - z * z) * dp * dp); }
  G = { x, w }; nodiGL.set(n, G); return G;
}
export const indice = (l, m) => l * l + l + m;
// le Y_ℓm reali in una direzione (non per forza unitaria; il vettore nullo vale ẑ) → out[(ℓ+1)²]
export function armonicheReali(lmax, n, out = new Float64Array((lmax + 1) ** 2), P = new Float64Array(((lmax + 1) * (lmax + 2)) / 2)) {
  const r = lungo(n), ct = r > 0 ? n[2] / r : 1, st = Math.sqrt(Math.max(0, 1 - ct * ct)), fi = r > 0 ? Math.atan2(n[1], n[0]) : 0;
  RG.legendre(lmax, ct, st, P);
  for (let l = 0; l <= lmax; l++) { const b = (l * (l + 1)) / 2, o = l * l + l; out[o] = P[b]; for (let m = 1; m <= l; m++) { const c = SQ2 * P[b + m]; out[o + m] = c * Math.cos(m * fi); out[o - m] = c * Math.sin(m * fi); } }
  return out;
}
// la risomma Σ a_ℓm·Y_ℓm(n̂) fino a lmax (≤ quello dei coefficienti)
export function ricomponi(alm, lmax, n) { const Y = armonicheReali(lmax, n); let s = 0; for (let q = 0; q < Y.length; q++) s += alm[q] * Y[q]; return s; }

// ---------- la grana e ℓmax
export const latoCella = (campo, livello) => campo.latoDi(livello) * MPC; // m
export const ellMassimo = (raggioM, latoM) => Math.max(0, Math.ceil((Math.PI * raggioM) / latoM));
const campoDi = (c) => (typeof c === 'string' ? campoLibero(c).campo : c && c.tipo === 'pigro' && c.campo ? c.campo : c);
const livelloDi = (c, b) => b.livello ?? (c && c.tipo === 'pigro' && c.livello) ?? LIVELLO_COSMO;
const livelliDi = (F, J, grandezza) => (grandezza === 'potenziale' ? F.livelliIn({ livello: J }) : F.livelliUtili({ livello: J }));
const tabellaDi = (N, grandezza) => (grandezza === 'potenziale' ? N.g : N.f);
// l'impronta delle tabelle dei nuclei (la geometria vale per tutti i campi che hanno gli stessi nuclei)
const firmaNuclei = (F, livelli) => `${F.lato0}|${F.raggio}|${livelli.map((j) => F.nucleo(j).norma ?? 0).join(',')}`;

// ---------- IL TEMPO: fattore di scala, crescita, tempo conforme
export function tempoDi(istante = null) { // istante: anni dall'inizio (null = adesso)
  const a = istante == null ? 1 : U.scala(Math.max(istante, 0) / 1e9), D = U.D(a);
  return { a, D, eta: RG.TAB.eta(a), fattorePotenziale: 1.5 * COSMO.Om * H0s * H0s * (D / a) }; // Φ [m²/s²] = fattore·φ [m²]
}
// dal tempo conforme (Mpc) all'istante (anni dall'inizio, sull'orologio di U.tempo) → null se η ≤ 0 (prima dell'inizio)
export function istanteDa(eta) { if (!(eta > 0)) return null; const a = RG.TAB.aDaEta(eta); return { a, istante: U.tempo(a) * 1e9 }; }
const etaDi = (e) => (e.eta != null ? e.eta : tempoDi(e.istante ?? null).eta);
const mpcDi = (p) => [p[0] / MPC, p[1] / MPC, p[2] / MPC];

// =====================================================================================================
// 1. L'IMPRONTA DI BORDO
// =====================================================================================================
// Una FORMA è un insieme di grandezze lineari del campo (righe) sulle stesse celle: { righe, n (celle), j, i, k, l
// (gli indici delle celle), g: Float64Array(n·righe), cella per cella }. Il valore su un campo: Σ_c g[c·righe + r]·w_c.
function nuovaForma(righe) { return { righe, n: 0, j: [], i: [], k: [], l: [], g: [] }; }
function chiudi(Fo) { Fo.j = Int16Array.from(Fo.j); Fo.i = Int32Array.from(Fo.i); Fo.k = Int32Array.from(Fo.k); Fo.l = Int32Array.from(Fo.l); Fo.g = Float64Array.from(Fo.g); return Fo; }
export function valoriForma(F, Fo) {
  const out = new Float64Array(Fo.righe), R = Fo.righe, g = Fo.g;
  for (let c = 0; c < Fo.n; c++) { const w = F.cella(Fo.j[c], Fo.i[c], Fo.k[c], Fo.l[c]), o = c * R; for (let r = 0; r < R; r++) out[r] += g[o + r] * w; }
  return out;
}
// λ_ℓ(d) di Funk–Hecke per una cella a distanza d (Mpc) dal centro, sfera di raggio R (Mpc), tabella t a passo p,
// portata rK (oltre il nucleo vale zero, come in raccogli di campo_pigro.js) → out[0..L]
function proiezione(t, p, rK, R, d, L, out) {
  out.fill(0, 0, L + 1);
  if (!(d > 1e-12 * R)) { if (R < rK) { const u = R / p, q = u | 0; out[0] = 4 * Math.PI * (t[q] + (u - q) * (t[q + 1] - t[q])); } return out; }
  const lo = Math.abs(R - d), hi = Math.min(R + d, rK); if (!(hi > lo)) return out;
  const G = gaussLegendre(L + 2), q0 = Math.floor(lo / p), q1 = Math.ceil(hi / p), RR = R * R + d * d, D2 = 2 * R * d;
  for (let q = q0; q < q1; q++) { const a = Math.max(lo, q * p), b = Math.min(hi, (q + 1) * p); if (!(b > a)) continue; const m = 0.5 * (a + b), h = 0.5 * (b - a), t0 = t[q], dt = t[q + 1] - t0;
    for (let s = 0; s < G.x.length; s++) { const r = m + h * G.x[s], K = t0 + (r / p - q) * dt, mu = (RR - r * r) / D2, w = h * G.w[s] * K * r; let P0 = 1, P1 = mu; out[0] += w; if (L >= 1) out[1] += w * mu;
      for (let l = 2; l <= L; l++) { const P2 = ((2 * l - 1) * mu * P1 - (l - 1) * P0) / l; out[l] += w * P2; P0 = P1; P1 = P2; } } }
  const f = PI2 / (R * d); for (let l = 0; l <= L; l++) out[l] *= f; return out;
}
const geometrie = new Map();
// LA FORMA DELL'IMPRONTA di una sfera (centro e raggio in m) alla grana J, per una grandezza ('densita' | 'potenziale'):
// le righe sono gli a_ℓm, ℓ ≤ lmax (in unità del campo: δ, o φ in Mpc², a oggi).
export function formaImpronta(campo, { centro, raggio, livello, lmax = null, grandezza = 'densita' }) {
  const F = campoDi(campo), J = livello ?? LIVELLO_COSMO, L = lmax ?? ellMassimo(raggio, latoCella(F, J)), livelli = livelliDi(F, J, grandezza), x = mpcDi(centro), R = raggio / MPC;
  const chiave = `${firmaNuclei(F, livelli)}|${grandezza}|${J}|${L}|${x.join(',')}|${R}`; let Fo = geometrie.get(chiave); if (Fo) return Fo;
  Fo = nuovaForma((L + 1) ** 2); const lam = new Float64Array(L + 1), Y = new Float64Array((L + 1) ** 2), P = new Float64Array(((L + 1) * (L + 2)) / 2);
  for (const j of livelli) { const N = F.nucleo(j); if (N.vuoto) continue; const h = N.h, rK = F.raggio * h, t = tabellaDi(N, grandezza), lo = [0, 0, 0], hi = [0, 0, 0];
    for (let a = 0; a < 3; a++) { lo[a] = Math.ceil((x[a] - R - rK) / h - 0.5); hi[a] = Math.floor((x[a] + R + rK) / h - 0.5); }
    for (let iz = lo[2]; iz <= hi[2]; iz++) for (let iy = lo[1]; iy <= hi[1]; iy++) for (let ix = lo[0]; ix <= hi[0]; ix++) {
      const dv = [(ix + 0.5) * h - x[0], (iy + 0.5) * h - x[1], (iz + 0.5) * h - x[2]], d = lungo(dv); if (!(Math.abs(d - R) < rK)) continue;
      proiezione(t, N.passo, rK, R, d, L, lam); armonicheReali(L, dv, Y, P);
      Fo.j.push(j); Fo.i.push(ix); Fo.k.push(iy); Fo.l.push(iz); Fo.n++; for (let l = 0; l <= L; l++) for (let q = l * l; q <= l * l + 2 * l; q++) Fo.g.push(lam[l] * Y[q]); } }
  chiudi(Fo); Object.assign(Fo, { tipo: 'impronta', lmax: L, grandezza, livello: J, centro: [...centro], raggio, livelli });
  if (geometrie.size > 24) geometrie.delete(geometrie.keys().next().value); geometrie.set(chiave, Fo); return Fo;
}
// LA FORMA DEL CAMPO IN PUNTI (m): una riga per punto, con le celle e il criterio di raccogli() di campo_pigro.js
export function formaPunti(campo, punti, { livello, grandezza = 'densita' } = {}) {
  const F = campoDi(campo), J = livello ?? LIVELLO_COSMO, livelli = livelliDi(F, J, grandezza), R = punti.length, Fo = nuovaForma(R), dove = new Map();
  for (const j of livelli) { const N = F.nucleo(j); if (N.vuoto) continue; const h = N.h, rK = F.raggio * h, R2 = rK * rK, t = tabellaDi(N, grandezza), p = N.passo;
    punti.forEach((P0, r) => { const x = mpcDi(P0), lo = [0, 0, 0], hi = [0, 0, 0]; for (let a = 0; a < 3; a++) { lo[a] = Math.ceil((x[a] - rK) / h - 0.5); hi[a] = Math.floor((x[a] + rK) / h - 0.5); }
      for (let iz = lo[2]; iz <= hi[2]; iz++) { const dz = x[2] - (iz + 0.5) * h; for (let iy = lo[1]; iy <= hi[1]; iy++) { const dy = x[1] - (iy + 0.5) * h, qq = dz * dz + dy * dy; if (qq >= R2) continue;
        for (let ix = lo[0]; ix <= hi[0]; ix++) { const dx = x[0] - (ix + 0.5) * h, r2 = qq + dx * dx; if (r2 >= R2) continue; const u = Math.sqrt(r2) / p, q = u | 0, K = t[q] + (u - q) * (t[q + 1] - t[q]), key = `${j},${ix},${iy},${iz}`;
          let c = dove.get(key); if (c === undefined) { c = Fo.n++; dove.set(key, c); Fo.j.push(j); Fo.i.push(ix); Fo.k.push(iy); Fo.l.push(iz); for (let s = 0; s < R; s++) Fo.g.push(0); } Fo.g[c * R + r] += K; } } } }); }
  return Object.assign(chiudi(Fo), { tipo: 'punti', grandezza, livello: J, punti: punti.map((p) => [...p]) });
}
// il prodotto di due forme: ⟨A_a·B_b⟩ = Σ_celle comuni g_A·g_B (le celle sono N(0,1) indipendenti) → Float64Array(Ra·Rb)
const chiaviDi = (Fo) => { if (Fo._chiavi) return Fo._chiavi; const M = new Map(); for (let c = 0; c < Fo.n; c++) M.set(`${Fo.j[c]},${Fo.i[c]},${Fo.k[c]},${Fo.l[c]}`, c); Fo._chiavi = M; return M; };
export function covarianza(A, B) {
  const Ra = A.righe, Rb = B.righe, out = new Float64Array(Ra * Rb), MB = chiaviDi(B);
  for (let c = 0; c < A.n; c++) { const cb = MB.get(`${A.j[c]},${A.i[c]},${A.k[c]},${A.l[c]}`); if (cb === undefined) continue; const oa = c * Ra, ob = cb * Rb;
    for (let a = 0; a < Ra; a++) { const ga = A.g[oa + a]; if (ga === 0) continue; const o = a * Rb; for (let b = 0; b < Rb; b++) out[o + b] += ga * B.g[ob + b]; } }
  return out;
}
// LO SPETTRO ATTESO SUL BORDO, dalla teoria: C_ℓ = 4π∫dlnk Δ²(k)·Σ_j B_j²(k)·j_ℓ(kR)² (densità; per il potenziale Δ²/k⁴), a
// oggi e in unità del campo; σ² = ∫dlnk Δ²·ΣB_j² (la varianza in un punto) → { C, sigma2, coda: la parte di 4πσ² oltre lmax }
export function spettroAtteso(campo, { raggio, livello, lmax, grandezza = 'densita', ellFino = null }) {
  const F = campoDi(campo), J = livello ?? LIVELLO_COSMO, livelli = livelliDi(F, J, grandezza), R = raggio / MPC, Lf = ellFino ?? 3 * lmax + 10;
  const k0 = F.kDi(livelli[0]) / 2, k1 = 2 * F.kDi(J), n = 4000, dl = Math.log(k1 / k0) / n, C = new Float64Array(Lf + 1), jl = new Float64Array(Lf + 2); let s2 = 0;
  for (let i = 0; i < n; i++) { const k = k0 * Math.exp((i + 0.5) * dl); let W = 0; for (const j of livelli) { const u = Math.abs(Math.log2(k / F.kDi(j))); if (u < 1) W += Math.cos((Math.PI / 2) * u) ** 2; }
    if (!(W > 0)) continue; const v = U.potenza(k) * W * dl * (grandezza === 'potenziale' ? k ** -4 : 1); s2 += v; RG.bessel(k * R, Lf, jl); for (let l = 0; l <= Lf; l++) C[l] += 4 * Math.PI * v * jl[l] * jl[l]; }
  let dentro = 0; for (let l = 0; l <= lmax; l++) dentro += (2 * l + 1) * C[l];
  return { C, sigma2: s2, coda: 1 - dentro / (4 * Math.PI * s2) };
}
// L'IMPRONTA DI BORDO DI UNA BOLLA.
//   campo   un indirizzo (stringa: il campo libero di bolle.js campoLibero), il risultato di campoLibero, o un campo pigro
//   bolla   { centro: [x, y, z] (m, comoventi), raggio (m, comovente), istante (anni dall'inizio; null = adesso),
//             livello (la grana J del campo; di suo quella del cosmo, LIVELLO_COSMO) }
//   opz     { grandezze: ['densita', 'potenziale'], lmax (di suo dal modello: ⌈πR/h_J⌉) }
// → { centro, raggio, istante, a, D, livello, lato (m: la cella della grana), kMax (1/Mpc), lmax,
//     densita: { alm (δ a quell'istante), attesa (⟨a_ℓm²⟩ esatta per il campo), coda (teoria: la parte oltre lmax) },
//     potenziale: { alm (Φ in m²/s²), attesa, coda } }
export function improntaDiBordo(campo, bolla, { grandezze = ['densita', 'potenziale'], lmax = null } = {}) {
  const F = campoDi(campo), J = livelloDi(campo, bolla), h = latoCella(F, J), L = lmax ?? ellMassimo(bolla.raggio, h), T = tempoDi(bolla.istante ?? null);
  const out = { centro: [...bolla.centro], raggio: bolla.raggio, istante: bolla.istante ?? null, a: T.a, D: T.D, eta: T.eta, livello: J, lato: h, kMax: Math.PI / (h / MPC), lmax: L };
  for (const g of grandezze) { const Fo = formaImpronta(F, { centro: bolla.centro, raggio: bolla.raggio, livello: J, lmax: L, grandezza: g }), f = g === 'potenziale' ? T.fattorePotenziale * MPC * MPC : T.D;
    const v = valoriForma(F, Fo), att = new Float64Array(Fo.righe); for (let c = 0; c < Fo.n; c++) for (let r = 0; r < Fo.righe; r++) att[r] += Fo.g[c * Fo.righe + r] ** 2;
    out[g] = { alm: v.map((x) => x * f), attesa: att.map((x) => x * f * f), coda: spettroAtteso(F, { raggio: bolla.raggio, livello: J, lmax: L, grandezza: g }).coda, unita: g === 'potenziale' ? 'm²/s²' : '' }; }
  return out;
}
// LA SECONDA VIA (per le prove): la stessa impronta per quadratura sulla sfera del campo punto per punto (delta, o
// in().potenziale), Gauss–Legendre in cos θ con nt nodi e 2nt passi in φ (esatta fino al grado 2nt − 1), a oggi, in unità
// del campo. → Float64Array((lmax + 1)²)
export function improntaPerQuadratura(campo, { centro, raggio, livello, lmax, grandezza = 'densita', nodi = null }) {
  const F = campoDi(campo), J = livello ?? LIVELLO_COSMO, nt = nodi ?? 2 * lmax + 8, nf = 2 * nt, G = gaussLegendre(nt), out = new Float64Array((lmax + 1) ** 2), Y = new Float64Array(out.length);
  for (let i = 0; i < nt; i++) { const ct = G.x[i], st = Math.sqrt(1 - ct * ct); for (let s = 0; s < nf; s++) { const fi = (PI2 * s) / nf, n = [st * Math.cos(fi), st * Math.sin(fi), ct], x = [centro[0] + raggio * n[0], centro[1] + raggio * n[1], centro[2] + raggio * n[2]];
    const v = grandezza === 'potenziale' ? F.in(x, { livello: J }).potenziale / (MPC * MPC) : F.delta(x, { livello: J }), w = (G.w[i] * PI2) / nf; armonicheReali(lmax, n, Y); for (let q = 0; q < out.length; q++) out[q] += w * v * Y[q]; } }
  return out;
}

// =====================================================================================================
// 2. IL CONDIZIONAMENTO AL BORDO (Hoffman e Ribak nelle celle)
// =====================================================================================================
// Il sistema dei vincoli: le righe di più forme, C = AAᵀ, Cholesky saltando i vincoli che non aggiungono niente (RANGO).
export function sistema(forme) {
  const off = [], n = forme.reduce((s, f) => { off.push(s); return s + f.righe; }, 0), C = new Float64Array(n * n);
  for (let a = 0; a < forme.length; a++) for (let b = a; b < forme.length; b++) { const P = covarianza(forme[a], forme[b]), Ra = forme[a].righe, Rb = forme[b].righe;
    for (let i = 0; i < Ra; i++) for (let j = 0; j < Rb; j++) { C[(off[a] + i) * n + off[b] + j] = P[i * Rb + j]; C[(off[b] + j) * n + off[a] + i] = P[i * Rb + j]; } }
  const diag = new Float64Array(n), vivo = new Uint8Array(n), Lc = new Float64Array(C), ridondanti = []; let logDet = 0;
  for (let j = 0; j < n; j++) { let s = Lc[j * n + j]; diag[j] = s; for (let k = 0; k < j; k++) if (vivo[k]) s -= Lc[j * n + k] ** 2;
    if (!(s > RANGO * diag[j])) { ridondanti.push(j); continue; } const l = Math.sqrt(s); vivo[j] = 1; Lc[j * n + j] = l; logDet += Math.log(l);
    for (let i = j + 1; i < n; i++) { let t = Lc[i * n + j]; for (let k = 0; k < j; k++) if (vivo[k]) t -= Lc[i * n + k] * Lc[j * n + k]; Lc[i * n + j] = t / l; } }
  const avanti = (b) => { const y = new Float64Array(n); for (let j = 0; j < n; j++) { if (!vivo[j]) continue; let t = b[j]; for (let k = 0; k < j; k++) if (vivo[k]) t -= Lc[j * n + k] * y[k]; y[j] = t / Lc[j * n + j]; } return y; };
  const indietro = (y) => { const x = new Float64Array(n); for (let j = n - 1; j >= 0; j--) { if (!vivo[j]) continue; let t = y[j]; for (let i = j + 1; i < n; i++) if (vivo[i]) t -= Lc[i * n + j] * x[i]; x[j] = t / Lc[j * n + j]; } return x; };
  const gradi = n - ridondanti.length;
  return { n, off, C, forme, gradi, ridondanti, logDet, avanti, indietro, risolvi: (b) => indietro(avanti(b)),
    chi2: (c) => { const y = avanti(c); let s = 0; for (let j = 0; j < n; j++) if (vivo[j]) s += y[j] * y[j]; return s; },
    // un vincolo di troppo deve chiedere ciò che gli altri già decidono (altrimenti i valori sono incompatibili)
    compatibili: (c) => { if (!ridondanti.length) return true; const x = indietro(avanti(c)); for (const j of ridondanti) { let s = 0; for (let k = 0; k < n; k++) s += C[j * n + k] * x[k]; if (Math.abs(s - c[j]) > 1e-7 * (Math.abs(c[j]) + Math.sqrt(diag[j]))) return false; } return true; } };
}
const unisci = (vv) => { const n = vv.reduce((s, v) => s + v.length, 0), out = new Float64Array(n); let o = 0; for (const v of vv) { out.set(v, o); o += v.length; } return out; };
// IL CAMPO CONDIZIONATO AL BORDO.
//   campo    il campo libero (un indirizzo, o campoLibero): quello che si condiziona
//   vincoli  [{ bolla, grandezza ('densita'), valori: Float64Array degli a_ℓm in unità del campo, a oggi (di suo: quelli del
//              campo stesso; per prenderli da un altro mondo: valoriForma(altro, formaImpronta(…))) }]
// → { esiste, perche, gradi, chi2, probabilita, logPeso, chi2Libero, ridondanti, sistema, campo: il campo vincolato (un campo
//     pigro con la correzione delle celle: w′ = w + Aᵀλ), attesa(punti, grandezza) → { media, varianza, libera } per punto,
//     date le sole impronte (la media vincolata e la varianza che resta) }
export function condizionaAlBordo(campo, vincoli) {
  const F = campoDi(campo); if (F.vincolato) throw new Error('condizionaAlBordo: si condiziona il campo libero (un campo già vincolato va vincolato con tutti i vincoli insieme: vedi l\'intestazione)');
  const forme = vincoli.map((v) => formaImpronta(F, { centro: v.bolla.centro, raggio: v.bolla.raggio, livello: livelloDi(campo, v.bolla), lmax: v.lmax ?? null, grandezza: v.grandezza ?? 'densita' }));
  const S = sistema(forme), liberi = unisci(forme.map((Fo) => valoriForma(F, Fo))), c = unisci(vincoli.map((v, i) => v.valori ?? liberi.subarray(S.off[i], S.off[i] + forme[i].righe)));
  if (!S.compatibili(c)) return { esiste: false, perche: 'le impronte chiedono a una parte comune valori diversi: un campo ha un valore solo in ogni punto', sistema: S };
  const lam = S.risolvi(c.map((x, i) => x - liberi[i])), NB = PIGRO.blocco, NB3 = NB ** 3, correzione = new Map();
  forme.forEach((Fo, f) => { const R = Fo.righe, o0 = S.off[f]; for (let c0 = 0; c0 < Fo.n; c0++) { let d = 0; for (let r = 0; r < R; r++) d += Fo.g[c0 * R + r] * lam[o0 + r]; if (d === 0) continue;
    const j = Fo.j[c0], wx = Fo.i[c0], wy = Fo.k[c0], wz = Fo.l[c0], bx = Math.floor(wx / NB), by = Math.floor(wy / NB), bz = Math.floor(wz / NB), k = `${bx},${by},${bz}`; let M = correzione.get(j); if (!M) correzione.set(j, (M = new Map()));
    let B = M.get(k); if (!B) M.set(k, (B = new Float64Array(NB3))); B[((wz - bz * NB) * NB + wy - by * NB) * NB + wx - bx * NB] += d; } });
  const V = campoPigro(F.radice, { rami: F.rami, raggio: F.raggio, lato0: F.lato0, da: F, correzione }), chi2 = S.chi2(c);
  const attesa = (punti, grandezza = 'densita', livello = null) => { const P = formaPunti(F, punti, { livello: livello ?? forme[0].livello, grandezza }), libera = covarianza(P, P), Rp = P.righe, X = forme.map((Fo) => covarianza(P, Fo));
    const yc = S.avanti(c);
    return punti.map((_, r) => { const xi = unisci(X.map((M, f) => M.subarray(r * forme[f].righe, (r + 1) * forme[f].righe))), y = S.avanti(xi); let media = 0, tolta = 0; for (let q = 0; q < S.n; q++) { media += y[q] * yc[q]; tolta += y[q] * y[q]; }
      return { media, varianza: Math.max(0, libera[r * Rp + r] - tolta), libera: libera[r * Rp + r] }; }); };
  return { esiste: true, gradi: S.gradi, chi2, probabilita: probabilitaChi2(chi2, S.gradi), logPeso: -chi2 / 2, chi2Libero: S.chi2(liberi), ridondanti: S.ridondanti, sistema: S, forme, campo: V, attesa };
}

// =====================================================================================================
// 3. L'ANTENATO COMUNE TRA LUOGHI E ISTANTI DIVERSI (tempo conforme)
// =====================================================================================================
// Un evento: { posizione: [m] comovente, istante (anni dall'inizio; null = adesso) | eta (Mpc), raggio (m, facoltativo:
// una bolla) }. η in Mpc (c = 1), distanze comoventi.
export const ORIZZONTE_OGGI = RG.ETA0; // Mpc: η₀, l'orizzonte delle particelle (ragnatela.js, con la radiazione)
// LA RELAZIONE CAUSALE (invariante): e1 'prima' di e2 se e2 sta nel cono futuro di e1 (anche sul cono), 'dopo', 'altrove'
// (nessuno dei due può aver toccato l'altro), 'stesso'. Con i raggi: tra due bolle conta il punto più vicino.
export function relazioneConforme(e1, e2) {
  const d = Math.max(0, lungo([0, 1, 2].map((a) => e2.posizione[a] - e1.posizione[a])) / MPC - (e1.raggio ?? 0) / MPC - (e2.raggio ?? 0) / MPC), de = etaDi(e2) - etaDi(e1);
  if (d === 0 && de === 0) return 'stesso'; if (Math.abs(de) >= d) return de >= 0 ? 'prima' : 'dopo'; return 'altrove';
}
// L'ANTENATO COMUNE PIÙ RECENTE di due eventi (o due bolle): la punta di J⁻(p) ∩ J⁻(q).
// → { eta (Mpc), posizione (m), istante (anni; null se prima dell'inizio), a, caso: 'stesso' | 'uno nel passato dell\'altro' |
//     'punta dei coni', separazione: 'tempo' | 'luce' | 'spazio', esiste (in Friedmann: η_c > 0), inflazione (η_c ≤ 0: esiste
//     solo con l'ipotesi dell'inflazione, a η_c < 0), scalaCheUsciva (Mpc: |Δx|/2, la scala comovente che usciva dall'orizzonte
//     a quel tempo conforme, se nell'inflazione), perche }
export function antenatoTraEventi(p, q) {
  const ep = etaDi(p), eq = etaDi(q), Rp = (p.raggio ?? 0) / MPC, Rq = (q.raggio ?? 0) / MPC, xp = mpcDi(p.posizione), xq = mpcDi(q.posizione), dv = [xq[0] - xp[0], xq[1] - xp[1], xq[2] - xp[2]], d = lungo(dv), s = Math.max(0, d - Rp - Rq), de = eq - ep;
  let eta, x, caso;
  if (s === 0 && de === 0 && d === 0) { eta = ep; x = xp; caso = 'stesso'; }
  else if (Math.abs(de) >= s) { eta = Math.min(ep, eq); x = de >= 0 ? xp : xq; caso = s === 0 && de === 0 ? 'si toccano' : 'uno nel passato dell\'altro'; }
  else { eta = 0.5 * (ep + eq - s); const u = d > 0 ? dv.map((v) => v / d) : [0, 0, 0], l = Rp + ep - eta; x = [xp[0] + u[0] * l, xp[1] + u[1] * l, xp[2] + u[2] * l]; caso = 'punta dei coni'; }
  const separazione = Math.abs(de) > s ? 'tempo' : Math.abs(de) === s ? 'luce' : 'spazio', I = istanteDa(eta);
  return { eta, posizione: x.map((v) => v * MPC), istante: I ? I.istante : null, a: I ? I.a : 0, caso, separazione, esiste: eta > 0, inflazione: !(eta > 0), scalaCheUsciva: eta > 0 ? null : s / 2,
    perche: eta > 0 ? `il passato comune comincia a η = ${cifre(eta)} Mpc` : `a η_c = ${cifre(eta)} Mpc, prima dell'inizio: in Friedmann non c'è passato comune; con l'ipotesi dell'inflazione l'antenato è nell'inflazione, quando la scala di ${cifre(s / 2)} Mpc usciva dall'orizzonte` };
}
// PIÙ EVENTI: la punta dell'intersezione dei coni. Esatta quando la sostiene una coppia (o uno solo: il più vecchio, se
// sta nel passato di tutti); altrimenti → { esatto: false, limiteSuperiore }.
export function antenatoComuneEventi(eventi) {
  if (eventi.length === 1) { const e = eventi[0], I = istanteDa(etaDi(e)); return { eta: etaDi(e), posizione: [...e.posizione], istante: I ? I.istante : null, esatto: true, esiste: etaDi(e) > 0 }; }
  let meglio = null; for (let i = 0; i < eventi.length; i++) for (let j = i + 1; j < eventi.length; j++) { const A = antenatoTraEventi(eventi[i], eventi[j]); if (!meglio || A.eta < meglio.eta) meglio = { ...A, coppia: [i, j] }; }
  // (la punta sta sul cono delle due della coppia: il confronto ammette l'arrotondamento, 10⁻¹² della scala)
  const tutti = eventi.every((e) => { const d = Math.max(0, lungo([0, 1, 2].map((a) => e.posizione[a] - meglio.posizione[a])) / MPC - (e.raggio ?? 0) / MPC), de = etaDi(e) - meglio.eta; return de >= d - 1e-12 * (Math.abs(etaDi(e)) + Math.abs(meglio.eta) + d); });
  return tutti ? { ...meglio, esatto: true } : { esatto: false, limiteSuperiore: meglio.eta, coppia: meglio.coppia, perche: 'la punta della coppia più stretta non sta nei coni di tutti: l\'antenato è prima, e qui non lo si cerca' };
}

// =====================================================================================================
// 4. IL CONO DI LUCE DI UNA CELLA DEL CAMPO (C9, con l'ipotesi dell'inflazione)
// =====================================================================================================
export const IPOTESI_INFLAZIONE = 'le celle del campo sono fluttuazioni dell\'inflazione: la cella del livello j è un evento a η_j ≤ −r_j (r_j = raggio del suo nucleo, 6·h_j), prima della fine dell\'inflazione (η = 0); da lì il suo cono futuro copre tutto ciò che la cella tocca';
export function eventoDiCella(campo, j, ix, iy, iz) { const F = campoDi(campo), h = F.latoDi(j), r = F.raggio * h; return { livello: j, posizione: [(ix + 0.5) * h * MPC, (iy + 0.5) * h * MPC, (iz + 0.5) * h * MPC], eta: -r, portata: r * MPC, nome: `${F.radice}/campo/livello ${j}/cella ${ix},${iy},${iz}` }; }
// che cosa può toccare un ramo di quella cella: la sfera della bolla? (la sua portata arriva al bordo) e il bordo sta nel suo
// cono futuro? → { tocca, nelCono, distanza (Mpc dal bordo) }
export function ramoTocca(campo, cella, bolla) { const d = Math.abs(lungo([0, 1, 2].map((a) => cella.posizione[a] - bolla.centro[a])) - bolla.raggio) / MPC, eb = tempoDi(bolla.istante ?? null).eta; return { tocca: d < cella.portata / MPC, nelCono: eb - cella.eta >= d, distanza: d }; }
// SENZA L'INFLAZIONE (celle a η ≥ 0): i livelli il cui nucleo supera ciò che la luce ha percorso fino a η della bolla
// violerebbero C9. → { eta (Mpc), livelli: [{ livello, portata (Mpc), parte: la frazione della varianza (nel punto) che porta }], parte }
export function senzaInflazione(campo, { istante = null, livello = LIVELLO_COSMO, grandezza = 'densita' } = {}) {
  const F = campoDi(campo), eta = tempoDi(istante).eta, L = livelliDi(F, livello, grandezza), v = L.map((j) => { const N = F.nucleo(j); if (N.vuoto) return 0; if (grandezza !== 'potenziale') return N.varianza; let s = 0; const t = N.g, p = N.passo, h3 = N.h ** 3; for (let i = 0; i < t.length - 1; i++) { const r = (i + 0.5) * p; s += 4 * Math.PI * r * r * (0.5 * (t[i] + t[i + 1])) ** 2 * p; } return s / h3; });
  const tot = v.reduce((a, b) => a + b, 0), fuori = L.map((j, i) => ({ livello: j, portata: F.raggio * F.latoDi(j), parte: v[i] / tot })).filter((x) => x.portata > eta);
  return { eta, livelli: fuori, parte: fuori.reduce((s, x) => s + x.parte, 0) };
}
