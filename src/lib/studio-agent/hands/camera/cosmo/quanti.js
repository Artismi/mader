// quanti.js — SOTTO L'ATOMO: gli elettroni come onde, la misura come evento, il nucleo e i nucleoni dalle misure.
//
// A questa scala non c'è niente da fotografare: nessuna luce visibile rimbalza su un elettrone (la sua «grandezza»
// è un decimo di nanometro, la luce visibile è cinquemila volte più larga) e un elettrone non ha una posizione finché
// non la si misura. Quello che si può «vedere» è ciò che vede uno strumento: un rivelatore che, misura dopo misura,
// registra dove ha trovato l'elettrone. È quello che hanno fatto Stodolna e altri (PRL 110, 213001, 2013 [V]): un
// fascio di atomi di idrogeno, un elettrone per atomo sul rivelatore, e l'immagine della funzione d'onda che si
// compone punto per punto. Qui si fa la stessa cosa con le leggi: niente nuvola disegnata, solo EVENTI.
//
// IL PUNTO, detto esattamente:
//   · LO STATO. L'atomo guardato ha la sua funzione d'onda, calcolata dalle equazioni (non da un disegno): per
//     l'idrogeno (e per ogni ione con un solo elettrone) quella ESATTA dell'equazione di Schrödinger con il potenziale
//     di Coulomb; per un atomo con più elettroni un CAMPO CENTRALE con la schermatura di Slater (la stessa che la
//     chimica del modello usa già: molecole_atomi.js `caricaEfficace`), un orbitale idrogenoide per ogni elettrone;
//     per una MOLECOLA di atomi dall'idrogeno al neon (H₂, l'acqua del modello…) il metodo di HARTREE-FOCK-ROOTHAAN
//     con la base minima STO-3G (Hehre, Stewart & Pople 1969 [R]): gli orbitali della molecola, e la sua densità, sono
//     la soluzione del campo autoconsistente per QUELLE posizioni dei nuclei, non una somma di forme scelte.
//   · LA MISURA È UN EVENTO (regola 3; eventi.js). La misura numero k dello strumento ha un indirizzo,
//     «…/atomo/misura k», e un istante; il suo esito è un punto tirato dalla densità di probabilità |ψ|² (regola di
//     Born) con i numeri di quell'evento. Lo stesso atomo dà sempre la stessa funzione d'onda; le misure sono eventi
//     diversi a tempi diversi; ogni esito esiste in un ramo, e leggerne uno non cambia gli altri.
//     Ogni misura è fatta su un atomo PREPARATO UGUALE (come nell'esperimento: un atomo nuovo del fascio per ogni
//     elettrone) — la perturbazione della misura precedente è sparita (decoerenza e rilassamento: Zurek 2003, RMP 75,
//     715 [V]); qui la si dichiara, non la si simula.
//   · LA FINESTRA E L'INDETERMINAZIONE. Una misura di posizione vera non è un punto: ha una risoluzione σ. Lo
//     strumento è un operatore di Kraus gaussiano (la misura «non nitida» della teoria quantistica della misura:
//     Arthurs & Kelly 1965; Busch, Lahti & Mittelstaedt [R]): l'esito x₀ esce da |ψ|² sfumata di σ, e lo stato
//     DOPO è ψ(x)·e^(−|x−x₀|²/4σ²). Se subito dopo si misura l'impulso, lo si tira da |φ(p)|², dove φ è la
//     TRASFORMATA DI FOURIER (calcolata qui con la FFT su una griglia, non scritta a mano) di quello stato: più la
//     finestra è stretta, più l'impulso si allarga. Riscontri: Δx·Δp ≥ ħ/2 sui campioni (Kennard 1927), uguale per lo
//     stato gaussiano; e la coppia (x₀, p) di una stessa misura non scende sotto ħ (Arthurs & Kelly 1965).
//   · IL MOTO. Uno stato stazionario non si muove: |ψ|² è fermo. Si muove una SOVRAPPOSIZIONE di stati con energie
//     diverse: la nuvola oscilla al ritmo (E₂ − E₁)/h (per 1s + 2p: 2,47·10¹⁵ volte al secondo, i battimenti
//     quantistici). E un pacchetto libero si allarga: σ(t) = σ₀√(1 + (ħt/2mσ₀²)²). Al tempo vero del motore questi
//     moti sono sotto il femtosecondo: a un secondo per secondo se ne vede la media (regola 11, Nyquist), rallentando
//     il tempo li si vede. Lo stato eccitato non dura: si svuota emettendo un fotone (emissione spontanea, con il
//     ritmo A calcolato qui dal momento di dipolo: per il 2p 6,27·10⁸/s, misurato 6,2649·10⁸ [R]); quando avviene il
//     salto è un evento («…/salto»: funzione d'onda Monte Carlo, Dalibard, Castin & Mølmer 1992 [R]).
//   · IL NUCLEO E I NUCLEONI. Scendendo ancora: la distribuzione di carica del nucleo MISURATA (raggi quadratici medi
//     dalla diffusione di elettroni e dagli atomi muonici: Angeli & Marinova 2013 [R]) con la forma del modello a
//     shell dell'oscillatore armonico per i nuclei leggeri (A ≤ 20) e quella di Fermi a due parametri sopra
//     (diffusività a = 0,52 fm [R]); i neutroni con la stessa forma (modello: la «pelle» di neutroni dei nuclei pesanti,
//     0,28 fm nel piombo — PREX-II 2021 [R] — qui non c'è). Ogni «istantanea» del nucleo è un evento con indirizzo:
//     Z protoni e N neutroni ai posti tirati dalla densità. Dentro il nucleone: la densità di carica dalla trasformata
//     dei FATTORI DI FORMA misurati (Kelly 2004 per G_E del protone, Galster 1971 per il neutrone [R]), e da quelle,
//     con la simmetria di isospin, le densità dei quark u e d; ogni istantanea mette tre quark di valenza.
//   · NON È LUCE. La resa (src/tre/quanti.js) è ciò che registrerebbe lo strumento, e lo dice a schermo.
//
// UNITÀ: unità atomiche per l'elettrone (lunghezze in a₀ = raggio di Bohr, impulsi in ħ/a₀, energie in hartree,
// tempi in ħ/E_h = 2,4189·10⁻¹⁷ s); femtometri per nucleo e nucleoni.
// PARAMETRI LIBERI: nessuno nelle leggi. Sono SCELTE DI CHI GUARDA (lo strumento, non il mondo): la finestra σ, il
// ritmo delle misure, la griglia della FFT (N, con il suo limite dichiarato), la preparazione di uno stato eccitato.
// CHE COSA NON TORNA (le prove lo stampano): le regole di Slater sono rozze (l'orbitale 2p dell'ossigeno esce più
// stretto di Hartree-Fock del 10% circa); STO-3G è una base minima (l'energia dell'acqua è 0,1 hartree sopra il limite
// di Hartree-Fock, e la correlazione non c'è); la forma del nucleo leggero non è quella misurata punto per punto; il
// raggio di carica del protone dai fattori di forma di Kelly (0,86 fm, dalla diffusione di elettroni) non è quello
// degli atomi muonici (0,841 fm: è il «problema del raggio del protone», oggi risolto a favore del secondo); le
// densità tridimensionali del nucleone dal fattore di forma valgono solo nel riferimento di Breit (Miller 2007 [R]);
// il vuoto della QCD tra i quark (Leinweber 2000, hep-lat/0004025 [V]) non è simulato.
import { contatore, campana, logEsatto, cosGiro } from './eventi.js';
import { gusci, caricaEfficace, atomo as datiAtomo } from './molecole_atomi.js';
import { COSMO, COSTANTI } from './leggi.js'; // le costanti e le unità: un posto solo

// ---------- costanti (CODATA 2018 [R])
export const AU = Object.freeze({ a0: 5.29177210903e-11, Eh: 27.211386245988, t: 2.4188843265857e-17, c: 137.035999084, eV: 27.211386245988 });
export const ME_SU_MU = 1 / 1822.888486; // massa dell'elettrone in unità di massa atomica
const PI = Math.PI;
const fatt = (n) => { let f = 1; for (let i = 2; i <= n; i++) f *= i; return f; };

// ======================================================================= GLI ORBITALI IDROGENOIDI (esatti)
// il polinomio di Laguerre generalizzato L^α_k(x) (ricorrenza a tre termini)
export function laguerre(k, a, x) { if (k === 0) return 1; let l0 = 1, l1 = 1 + a - x; for (let j = 1; j < k; j++) { const l2 = ((2 * j + 1 + a - x) * l1 - (j + a) * l0) / (j + 1); l0 = l1; l1 = l2; } return l1; }
// la parte radiale R_nl(r), normalizzata: ∫R²r²dr = 1
export function radiale(n, l, Z) {
  const N = Math.sqrt((2 * Z / n) ** 3 * fatt(n - l - 1) / (2 * n * fatt(n + l)));
  return (r) => { const x = (2 * Z * r) / n; return N * Math.exp(-x / 2) * x ** l * laguerre(n - l - 1, 2 * l + 1, x); };
}
// le armoniche sferiche REALI (m > 0: cos mφ; m < 0: sin |m|φ), normalizzate sulla sfera; senza la fase di Condon-Shortley
function legendre(l, m, x) {
  let pmm = 1; if (m > 0) { const s = Math.sqrt(Math.max(0, 1 - x * x)); let f = 1; for (let i = 1; i <= m; i++) { pmm *= f * s; f += 2; } }
  if (l === m) return pmm; let p1 = x * (2 * m + 1) * pmm; if (l === m + 1) return p1;
  let p0 = pmm; for (let ll = m + 2; ll <= l; ll++) { const p2 = ((2 * ll - 1) * x * p1 - (ll + m - 1) * p0) / (ll - m); p0 = p1; p1 = p2; } return p1;
}
export function armonica(l, m) {
  const am = Math.abs(m), N = Math.sqrt(((2 * l + 1) / (4 * PI)) * fatt(l - am) / fatt(l + am)) * (m === 0 ? 1 : Math.SQRT2);
  return (x, y, z) => { const r = Math.hypot(x, y, z); if (r === 0) return l === 0 ? N : 0; const P = legendre(l, am, z / r); if (m === 0) return N * P; const f = Math.atan2(y, x); return N * P * (m > 0 ? Math.cos(am * f) : Math.sin(am * f)); };
}
const NOMI_L = 'spdfg', NOMI_M = { 1: { 1: 'x', '-1': 'y', 0: 'z' }, 2: { 0: 'z²', 1: 'xz', '-1': 'yz', 2: 'x²−y²', '-2': 'xy' } };
// ⟨r⟩ e ⟨r²⟩ esatti di un orbitale idrogenoide (Bethe & Salpeter 1957 [R])
export const rMedio = (n, l, Z) => (3 * n * n - l * (l + 1)) / (2 * Z);
export const r2Medio = (n, l, Z) => (n * n * (5 * n * n + 1 - 3 * l * (l + 1))) / (2 * Z * Z);
// l'energia (hartree), con la massa ridotta se si dà la massa del nucleo (u)
export const energiaIdrogenoide = (n, Z, massaNucleoU = Infinity) => (-(Z * Z) / (2 * n * n)) / (1 + ME_SU_MU / massaNucleoU);

// un orbitale: { n, l, m, Z, E, psi(x, y, z), campiona(r), estensione, nome }
const memoOrb = new Map();
export function orbitale(n, l, m, Z) {
  const chiave = `${n} ${l} ${m} ${Z}`; if (memoOrb.has(chiave)) return memoOrb.get(chiave);
  const R = radiale(n, l, Z), Y = armonica(l, m);
  // la distribuzione radiale r²R² cumulata (per tirare r col metodo dell'inversa): fin dove resta meno di 10⁻¹² fuori
  const rTop = (2 * (3 * n * n + 10 * n)) / Z, M = 8000, dr = rTop / M, cum = new Float64Array(M + 1);
  for (let i = 1; i <= M; i++) { const a = (i - 1) * dr, b = i * dr, c = (a + b) / 2, f = (r) => r * r * R(r) ** 2; cum[i] = cum[i - 1] + (dr / 6) * (f(a) + 4 * f(c) + f(b)); }
  const tot = cum[M]; for (let i = 0; i <= M; i++) cum[i] /= tot;
  const quantile = (u) => { let lo = 0, hi = M; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] < u) lo = mid; else hi = mid; } const f = (u - cum[lo]) / Math.max(1e-300, cum[hi] - cum[lo]); return (lo + f) * dr; };
  // il massimo di |Y|² (per tirare la direzione per rigetto)
  let ymax = 0; for (let i = 0; i <= 2000; i++) { const th = (PI * i) / 2000, s = Math.sin(th), c = Math.cos(th); for (const f of [0, PI / (2 * Math.max(1, Math.abs(m))), PI / Math.max(1, Math.abs(m))]) { const v = Y(s * Math.cos(f), s * Math.sin(f), c) ** 2; if (v > ymax) ymax = v; } } ymax *= 1.0001;
  const o = {
    n, l, m, Z, E: energiaIdrogenoide(n, Z), centro: [0, 0, 0],
    nome: `${n}${NOMI_L[l]}${l > 0 && NOMI_M[l] ? NOMI_M[l][m] ?? m : ''}`,
    rMedio: rMedio(n, l, Z), estensione: quantile(1 - 1e-6), estensioneFFT: quantile(1 - 1e-5),
    psi: (x, y, z) => R(Math.hypot(x, y, z)) * Y(x, y, z),
    radiale: R, angolare: Y, quantile,
    // un punto da |ψ|²: r dall'inversa della distribuzione radiale, la direzione per rigetto su |Y|²
    campiona(rnd) { const r = quantile(rnd()); for (let k = 0; k < 10000; k++) { const z = 2 * rnd() - 1, s = Math.sqrt(1 - z * z), f = rnd(), x = s * cosGiro(f), y = s * cosGiro(f - 0.25); if (rnd() * ymax <= Y(x, y, z) ** 2) return [r * x, r * y, r * z]; } return [0, 0, r]; },
  };
  memoOrb.set(chiave, o); return o;
}

// ---------- i componenti di uno stato: { peso (elettroni), psiT(x, y, z, t) → [re, im], campiona(rnd, t), estensioneFFT, centro, nome }
// uno stato è { componenti, elettroni, ... }: la densità è Σ peso·|ψ|²; una misura sceglie un componente con
// probabilità ∝ peso (quale elettrone si è trovato), poi un punto dal suo |ψ|².
const stazionario = (o, peso) => ({ peso, nome: o.nome, orbitale: o, centro: o.centro, estensione: o.estensione, estensioneFFT: o.estensioneFFT, psiT: (x, y, z) => [o.psi(x, y, z), 0], campiona: (rnd) => o.campiona(rnd), stazionario: true });

// UN ATOMO CON PIÙ ELETTRONI: campo centrale, schermatura di Slater (molecole_atomi.js), un orbitale idrogenoide con
// la sua Z efficace per ogni sottoguscio; un guscio aperto è la MEDIA sui suoi m (l'atomo libero non polarizzato:
// gli stati del multipletto fondamentale sono degeneri, e la loro media è sferica).
export function statoAtomo(Z, { carica = 0 } = {}) {
  const g = gusci(Z, carica), componenti = [];
  for (const sub in g) {
    const n = +sub[0], l = NOMI_L.indexOf(sub[1]), zeff = Z === 1 && carica === 0 ? 1 : (Z - carica === 1 ? Z : caricaEfficace(Z, sub, { g }));
    for (let m = -l; m <= l; m++) componenti.push({ ...stazionario(orbitale(n, l, m, zeff), g[sub] / (2 * l + 1)), sottoguscio: sub, zeff });
  }
  const el = componenti.reduce((s, c) => s + c.peso, 0);
  return { tipo: 'atomo', Z, carica, componenti, elettroni: el, estensione: Math.max(...componenti.map((c) => c.estensione)), nucleo: { Z, A: numeroDiMassa(Z) } };
}

// UNA SOVRAPPOSIZIONE di stati idrogenoidi (una PREPARAZIONE: chi guarda la sceglie, come il laser dell'esperimento),
// con l'emissione spontanea. termini: [{ n, l, m, c: [re, im] }] — al più uno stato fondamentale e stati eccitati.
// Il ritmo di decadimento di ogni stato eccitato è la somma, sugli stati più bassi raggiungibili con un fotone di
// dipolo (l' = l ± 1), di A = (4/3)·ω³·|⟨f|r|i⟩|²/c³ (unità atomiche; Weisskopf & Wigner 1930 [R]), con il momento
// di dipolo calcolato qui dalle funzioni d'onda. Il salto (il fotone emesso) è un evento: «indirizzo/salto».
export function dipoloRadiale(n1, l1, n2, l2, Z = 1) { const a = radiale(n1, l1, Z), b = radiale(n2, l2, Z), top = (4 * (n1 + n2) ** 2 + 40) / Z, M = 20000, h = top / M; let s = 0; for (let i = 1; i < M; i++) { const r = i * h; s += (i & 1 ? 4 : 2) * a(r) * b(r) * r ** 3; } return (s * h) / 3; }
export function ritmoEmissione(n, l, Z = 1) { // 1/s, sommato su tutti i canali e sugli m finali
  let A = 0; for (let n2 = 1; n2 < n; n2++) for (const l2 of [l - 1, l + 1]) { if (l2 < 0 || l2 >= n2) continue; const w = energiaIdrogenoide(n, Z) - energiaIdrogenoide(n2, Z), d = dipoloRadiale(n, l, n2, l2, Z), ang = Math.max(l, l2) / (2 * l + 1); A += (4 / 3) * (w ** 3) * d * d * ang / AU.c ** 3; }
  return A / AU.t;
}
export function sovrapposizione(termini, Z = 1, { indirizzo = 'sovrapposizione', emissione = true, tempoDecoerenza = Infinity } = {}) {
  const T = termini.map((t) => ({ ...t, o: orbitale(t.n, t.l, t.m, Z), c: Array.isArray(t.c) ? t.c : [t.c, 0] }));
  const norma = Math.sqrt(T.reduce((s, t) => s + t.c[0] ** 2 + t.c[1] ** 2, 0)); for (const t of T) { t.c = [t.c[0] / norma, t.c[1] / norma]; t.w = t.c[0] ** 2 + t.c[1] ** 2; }
  const fondo = T.reduce((a, t) => (t.o.E < a.o.E ? t : a), T[0]), eccitati = T.filter((t) => t !== fondo);
  // il salto: un evento solo per l'atomo (a una preparazione con un solo stato eccitato la legge è esatta; con più
  // eccitati si usa il ritmo totale pesato: dichiarato)
  const wE = eccitati.reduce((s, t) => s + t.w, 0), G = emissione && wE > 0 ? eccitati.reduce((s, t) => s + t.w * ritmoEmissione(t.n, t.l, Z), 0) / wE : 0;
  const u = contatore(`${indirizzo}/salto`)(), tSalto = G > 0 && u < wE ? -logEsatto(1 - u / wE) / G : Infinity; // secondi dalla preparazione
  const ampiezze = (t) => { // t in unità atomiche dalla preparazione → [{ o, re, im, a }]
    const ts = t * AU.t; if (ts >= tSalto) return [{ o: fondo.o, re: 1, im: 0, a: 1 }];
    const sm = G > 0 ? Math.exp((-G * ts) / 2) : 1, v = T.map((q) => ({ o: q.o, s: q === fondo ? 1 : sm, q })); const nn = Math.sqrt(v.reduce((s, x) => s + x.s * x.s * x.q.w, 0));
    return v.map(({ o, s, q }) => { const ph = -o.E * t, cr = Math.cos(ph), ci = Math.sin(ph), re = (s / nn) * (q.c[0] * cr - q.c[1] * ci), im = (s / nn) * (q.c[0] * ci + q.c[1] * cr); return { o, re, im, a: Math.hypot(re, im) }; });
  };
  const psiT = (x, y, z, t) => { let re = 0, im = 0; for (const q of ampiezze(t)) { const p = q.o.psi(x, y, z); re += q.re * p; im += q.im * p; } return [re, im]; };
  const comp = {
    peso: 1, nome: T.map((t) => t.o.nome).join(' + '), centro: [0, 0, 0], estensione: Math.max(...T.map((t) => t.o.estensione)), estensioneFFT: Math.max(...T.map((t) => t.o.estensioneFFT)), psiT, ampiezze,
    // un punto da |Σ aψ|²: proposta dalla miscela Σ|a||ψ|², accettato con |Σaψ|²/((Σ|a|)(Σ|a||ψ|²)) (esatto)
    campiona(rnd, t) { const A = ampiezze(t), sa = A.reduce((s, q) => s + q.a, 0);
      // decoerenza: con probabilità 1 − e^(−t/τ_D) l'ambiente ha già distinto le parti, e la misura legge una di esse
      // (la matrice densità con le coerenze smorzate di e^(−t/τ_D); l'impulso dopo la misura usa sempre il ramo coerente)
      if (tempoDecoerenza < Infinity && rnd() > Math.exp((-t * AU.t) / tempoDecoerenza)) { let v = rnd(), q = A[0]; for (const x of A) { v -= x.a * x.a; if (v <= 0) { q = x; break; } } return q.o.campiona(rnd); }
      for (let k = 0; k < 100000; k++) { let u = rnd() * sa, q = A[0]; for (const x of A) { u -= x.a; if (u <= 0) { q = x; break; } } const p = q.o.campiona(rnd), [re, im] = psiT(p[0], p[1], p[2], t); let mix = 0; for (const x of A) mix += x.a * x.o.psi(p[0], p[1], p[2]) ** 2; if (rnd() * sa * mix <= re * re + im * im) return p; }
      return [0, 0, 0]; },
  };
  const vivi = T.filter((t) => t.w > 0), batt = vivi.length > 1 ? (2 * PI) / Math.abs(vivi[1].o.E - vivi[0].o.E) * AU.t : null; // (i battimenti ci sono solo se almeno due stati hanno peso)
  return { tipo: 'sovrapposizione', Z, componenti: [comp], elettroni: 1, estensione: comp.estensione, periodoBattimento: batt, ritmoEmissione: G, tSalto, tempoDecoerenza, nucleo: { Z, A: numeroDiMassa(Z) } };
}

// UN PACCHETTO LIBERO gaussiano (massa dell'elettrone): ψ(x, t) esatto; σ(t) = σ₀√(1 + (t/2σ₀²)²) in unità atomiche
export function pacchetto({ sigma0 = 1, p0 = [0, 0, 0] } = {}) {
  const s2 = sigma0 * sigma0, sig = (t) => sigma0 * Math.sqrt(1 + (t / (2 * s2)) ** 2);
  const psiT = (x, y, z, t) => { // prodotto dei tre assi: (2πσ₀²)^(−1/4)·(1 + it/2σ₀²)^(−1/2)·exp(−(x − p₀t)²/(4σ₀²(1 + it/2σ₀²)) + ip₀x − ip₀²t/2)
    let lr = 0, li = 0; const ar = 1, ai = t / (2 * s2), md = ar * ar + ai * ai, X = [x, y, z];
    for (let k = 0; k < 3; k++) { const d = X[k] - p0[k] * t, q = (d * d) / (4 * s2); lr += -q * ar / md; li += q * ai / md + p0[k] * X[k] - (p0[k] * p0[k] * t) / 2; }
    // (1 + iτ)^(−3/2): modulo md^(−3/4), fase −(3/2)·atan(τ)
    const mod = (2 * PI * s2) ** -0.75 * md ** -0.75 * Math.exp(lr), fase = li - 1.5 * Math.atan2(ai, ar); return [mod * Math.cos(fase), mod * Math.sin(fase)];
  };
  const comp = { peso: 1, nome: 'pacchetto libero', centro: [0, 0, 0], estensione: 6 * sigma0, estensioneFFT: 6 * sigma0, psiT, sigma: sig,
    campiona(rnd, t) { const s = sig(t); return [0, 1, 2].map((k) => p0[k] * t + s * campana(rnd(), rnd())); } };
  return { tipo: 'pacchetto', componenti: [comp], elettroni: 1, estensione: comp.estensione };
}

// ======================================================================= LE MOLECOLE: HARTREE-FOCK-ROOTHAAN, STO-3G
// Base minima di Hehre, Stewart & Pople 1969 (J. Chem. Phys. 51, 2657) [R]: ogni orbitale di Slater approssimato da
// tre gaussiane; esponenti per ζ = 1 (si scalano con ζ²), coefficienti; ζ «molecolari» standard di ogni elemento.
// (Controllo dei numeri: l'energia dell'acqua e dell'idrogeno molecolare contro valori pubblicati, nelle prove.)
const STO3G = { a1s: [2.227660584, 0.4057711562, 0.1098175104], d1s: [0.1543289673, 0.5353281423, 0.4446345422], a2sp: [0.994202729, 0.2310313333, 0.0751385600], d2s: [-0.09996722919, 0.3995128261, 0.7001154689], d2p: [0.155916275, 0.6076837186, 0.3919573931] };
const ZETA = { 1: [1.24], 2: [1.69], 3: [2.69, 0.80], 4: [3.68, 1.15], 5: [4.68, 1.50], 6: [5.67, 1.72], 7: [6.67, 1.95], 8: [7.66, 2.25], 9: [8.65, 2.55], 10: [9.64, 2.88] };
const df = (n) => { let f = 1; for (let i = n; i > 1; i -= 2) f *= i; return f; }; // (n)!! con (−1)!! = 1
function basiSTO3G(atomi) {
  const B = [];
  const metti = (A, lmn, as, ds, z) => { const al = as.map((a) => a * z * z), L = lmn[0] + lmn[1] + lmn[2]; const N = al.map((a) => (2 * a / PI) ** 0.75 * (4 * a) ** (L / 2) / Math.sqrt(df(2 * lmn[0] - 1) * df(2 * lmn[1] - 1) * df(2 * lmn[2] - 1))); B.push({ A, lmn, al, d: ds.map((d, k) => d * N[k]) }); };
  for (const at of atomi) {
    const z = ZETA[at.Z]; if (!z) throw new Error(`quanti: STO-3G qui solo dall'idrogeno al neon (Z = ${at.Z})`);
    metti(at.pos, [0, 0, 0], STO3G.a1s, STO3G.d1s, z[0]);
    if (at.Z > 2) { metti(at.pos, [0, 0, 0], STO3G.a2sp, STO3G.d2s, z[1]); for (const l of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) metti(at.pos, l, STO3G.a2sp, STO3G.d2p, z[1]); }
  }
  return B;
}
// --- gli integrali (McMurchie & Davidson 1978 [R]): i coefficienti di Hermite E, la funzione di Boys
function boys(nmax, T) {
  const F = new Float64Array(nmax + 1);
  if (T < 1e-12) { for (let n = 0; n <= nmax; n++) F[n] = 1 / (2 * n + 1); return F; }
  if (T > 45) { F[nmax] = (df(2 * nmax - 1) / 2 ** (nmax + 1)) * Math.sqrt(PI / T ** (2 * nmax + 1)); }
  else { let s = 0, termine = 1 / (2 * nmax + 1); for (let k = 0; k < 400; k++) { s += termine; termine *= (2 * T) / (2 * nmax + 2 * k + 3); if (termine < 1e-17 * s) break; } F[nmax] = Math.exp(-T) * s; }
  const e = Math.exp(-T); for (let n = nmax; n > 0; n--) F[n - 1] = (2 * T * F[n] + e) / (2 * n - 1);
  return F;
}
function hermiteE(i, j, Q, a, b) { // → array su t (0 … i+j) di E^{ij}_t
  const p = a + b, q = (a * b) / p, memo = new Map();
  const E = (i, j, t) => { if (t < 0 || t > i + j || i < 0 || j < 0) return 0; const k = i * 100 + j * 10 + t; if (memo.has(k)) return memo.get(k); let v;
    if (i === 0 && j === 0) v = t === 0 ? Math.exp(-q * Q * Q) : 0;
    else if (j === 0) v = E(i - 1, j, t - 1) / (2 * p) - (q * Q / a) * E(i - 1, j, t) + (t + 1) * E(i - 1, j, t + 1);
    else v = E(i, j - 1, t - 1) / (2 * p) + (q * Q / b) * E(i, j - 1, t) + (t + 1) * E(i, j - 1, t + 1);
    memo.set(k, v); return v; };
  const o = []; for (let t = 0; t <= i + j; t++) o.push(E(i, j, t)); return o;
}
function tabellaR(L, p, X, Y, Z) { // R^0_{tuv} per t+u+v ≤ L (ricorrenza di Hermite) → funzione (t, u, v)
  const F = boys(L, p * (X * X + Y * Y + Z * Z)), D = L + 1, memo = new Float64Array(D * D * D * D).fill(NaN);
  const R = (t, u, v, n) => { if (t < 0 || u < 0 || v < 0) return 0; const k = ((t * D + u) * D + v) * D + n; if (!Number.isNaN(memo[k])) return memo[k]; let r;
    if (t === 0 && u === 0 && v === 0) r = (-2 * p) ** n * F[n];
    else if (t === 0 && u === 0) r = (v > 1 ? (v - 1) * R(t, u, v - 2, n + 1) : 0) + Z * R(t, u, v - 1, n + 1);
    else if (t === 0) r = (u > 1 ? (u - 1) * R(t, u - 2, v, n + 1) : 0) + Y * R(t, u - 1, v, n + 1);
    else r = (t > 1 ? (t - 1) * R(t - 2, u, v, n + 1) : 0) + X * R(t - 1, u, v, n + 1);
    memo[k] = r; return r; };
  return (t, u, v) => R(t, u, v, 0);
}
// le coppie di primitive di due funzioni di base: esponente, centro, coefficienti di Hermite per asse
function coppie(f, g) { const o = []; for (let k = 0; k < f.al.length; k++) for (let m = 0; m < g.al.length; m++) { const a = f.al[k], b = g.al[m], p = a + b, P = [0, 1, 2].map((x) => (a * f.A[x] + b * g.A[x]) / p); o.push({ a, b, p, P, c: f.d[k] * g.d[m], E: [0, 1, 2].map((x) => hermiteE(f.lmn[x], g.lmn[x], f.A[x] - g.A[x], a, b)) }); } return o; }
function sovrapposizioneP(i, j, Q, a, b) { return hermiteE(i, j, Q, a, b)[0] * Math.sqrt(PI / (a + b)); }
function integraliUnElettrone(B, atomi) {
  const n = B.length, S = new Float64Array(n * n), T = new Float64Array(n * n), V = new Float64Array(n * n);
  for (let u = 0; u < n; u++) for (let v = 0; v <= u; v++) {
    const f = B[u], g = B[v]; let s = 0, t = 0, w = 0;
    for (let k = 0; k < f.al.length; k++) for (let m = 0; m < g.al.length; m++) {
      const a = f.al[k], b = g.al[m], c = f.d[k] * g.d[m], ov = (dl = [0, 0, 0]) => sovrapposizioneP(f.lmn[0], g.lmn[0] + dl[0], f.A[0] - g.A[0], a, b) * sovrapposizioneP(f.lmn[1], g.lmn[1] + dl[1], f.A[1] - g.A[1], a, b) * sovrapposizioneP(f.lmn[2], g.lmn[2] + dl[2], f.A[2] - g.A[2], a, b);
      const s0 = ov(); s += c * s0;
      const [l2, m2, n2] = g.lmn; let tk = b * (2 * (l2 + m2 + n2) + 3) * s0 - 2 * b * b * (ov([2, 0, 0]) + ov([0, 2, 0]) + ov([0, 0, 2]));
      tk -= 0.5 * (l2 * (l2 - 1) * (l2 > 1 ? ov([-2, 0, 0]) : 0) + m2 * (m2 - 1) * (m2 > 1 ? ov([0, -2, 0]) : 0) + n2 * (n2 - 1) * (n2 > 1 ? ov([0, 0, -2]) : 0)); t += c * tk;
      const p = a + b, P = [0, 1, 2].map((x) => (a * f.A[x] + b * g.A[x]) / p), E = [0, 1, 2].map((x) => hermiteE(f.lmn[x], g.lmn[x], f.A[x] - g.A[x], a, b)), L = E[0].length + E[1].length + E[2].length - 3;
      for (const at of atomi) { const R = tabellaR(L, p, P[0] - at.pos[0], P[1] - at.pos[1], P[2] - at.pos[2]); let q = 0; for (let x = 0; x < E[0].length; x++) for (let y = 0; y < E[1].length; y++) for (let z = 0; z < E[2].length; z++) q += E[0][x] * E[1][y] * E[2][z] * R(x, y, z); w += c * (-at.Z * 2 * PI / p) * q; }
    }
    S[u * n + v] = S[v * n + u] = s; T[u * n + v] = T[v * n + u] = t; V[u * n + v] = V[v * n + u] = w;
  }
  return { S, T, V };
}
function integraliDueElettroni(B) {
  const n = B.length, idx = (a, b) => (a > b ? (a * (a + 1)) / 2 + b : (b * (b + 1)) / 2 + a), np = (n * (n + 1)) / 2, G = new Float64Array(np * np), cp = [];
  for (let u = 0; u < n; u++) for (let v = 0; v <= u; v++) cp[idx(u, v)] = coppie(B[u], B[v]);
  for (let ab = 0; ab < np; ab++) for (let cd = 0; cd <= ab; cd++) {
    let s = 0;
    for (const P1 of cp[ab]) for (const Q1 of cp[cd]) {
      const p = P1.p, q = Q1.p, al = (p * q) / (p + q), L = P1.E[0].length + P1.E[1].length + P1.E[2].length + Q1.E[0].length + Q1.E[1].length + Q1.E[2].length - 6;
      const R = tabellaR(L, al, P1.P[0] - Q1.P[0], P1.P[1] - Q1.P[1], P1.P[2] - Q1.P[2]); let v = 0;
      for (let t = 0; t < P1.E[0].length; t++) for (let u = 0; u < P1.E[1].length; u++) for (let w = 0; w < P1.E[2].length; w++) { const e1 = P1.E[0][t] * P1.E[1][u] * P1.E[2][w]; if (!e1) continue;
        for (let t2 = 0; t2 < Q1.E[0].length; t2++) for (let u2 = 0; u2 < Q1.E[1].length; u2++) for (let w2 = 0; w2 < Q1.E[2].length; w2++) { const e2 = Q1.E[0][t2] * Q1.E[1][u2] * Q1.E[2][w2]; if (!e2) continue; v += e1 * e2 * ((t2 + u2 + w2) & 1 ? -1 : 1) * R(t + t2, u + u2, w + w2); } }
      s += P1.c * Q1.c * v * (2 * PI ** 2.5) / (p * q * Math.sqrt(p + q));
    }
    G[ab * np + cd] = G[cd * np + ab] = s;
  }
  return (a, b, c, d) => G[idx(a, b) * np + idx(c, d)];
}
// autovalori e autovettori di una matrice simmetrica (Jacobi) → { w, V (colonne) } in ordine crescente
export function autovalori(A0, n) {
  const A = Float64Array.from(A0), V = new Float64Array(n * n); for (let i = 0; i < n; i++) V[i * n + i] = 1;
  for (let giro = 0; giro < 100; giro++) { let off = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i * n + j] ** 2; if (off < 1e-26) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) { const apq = A[p * n + q]; if (Math.abs(apq) < 1e-300) continue; const th = (A[q * n + q] - A[p * n + p]) / (2 * apq), t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) { const akp = A[k * n + p], akq = A[k * n + q]; A[k * n + p] = c * akp - s * akq; A[k * n + q] = s * akp + c * akq; }
      for (let k = 0; k < n; k++) { const apk = A[p * n + k], aqk = A[q * n + k]; A[p * n + k] = c * apk - s * aqk; A[q * n + k] = s * apk + c * aqk; }
      for (let k = 0; k < n; k++) { const vkp = V[k * n + p], vkq = V[k * n + q]; V[k * n + p] = c * vkp - s * vkq; V[k * n + q] = s * vkp + c * vkq; } } }
  const ord = [...Array(n).keys()].sort((a, b) => A[a * n + a] - A[b * n + b]), w = ord.map((i) => A[i * n + i]), W = new Float64Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) W[i * n + j] = V[i * n + ord[j]];
  return { w, V: W };
}
// valore delle funzioni di base in un punto (in out)
function valoriBase(B, x, y, z, out) { for (let u = 0; u < B.length; u++) { const f = B[u], dx = x - f.A[0], dy = y - f.A[1], dz = z - f.A[2], r2 = dx * dx + dy * dy + dz * dz; let s = 0; for (let k = 0; k < 3; k++) s += f.d[k] * Math.exp(-f.al[k] * r2); out[u] = s * (f.lmn[0] ? dx : 1) * (f.lmn[1] ? dy : 1) * (f.lmn[2] ? dz : 1); } return out; }

// LA MOLECOLA: atomi [{ Z, pos: [x, y, z] (a₀) }], carica → { energia, energiaNucleare, orbitali, densita(x, y, z), componenti, … }
export function molecola(atomi, { carica = 0, giri = 200 } = {}) {
  const B = basiSTO3G(atomi), n = B.length, el = atomi.reduce((s, a) => s + a.Z, 0) - carica;
  if (el % 2) throw new Error('quanti: Hartree-Fock ristretto solo con un numero pari di elettroni');
  const occ = el / 2, { S, T, V } = integraliUnElettrone(B, atomi);
  // (le contratte rinormalizzate: STO-3G è normalizzata a meno di 10⁻⁶; così è esatta)
  for (let u = 0; u < n; u++) { const k = 1 / Math.sqrt(S[u * n + u]); for (let q = 0; q < 3; q++) B[u].d[q] *= k; }
  const { S: S2, T: T2, V: V2 } = integraliUnElettrone(B, atomi), eri = integraliDueElettroni(B), H = new Float64Array(n * n); for (let i = 0; i < n * n; i++) H[i] = T2[i] + V2[i];
  let En = 0; for (let i = 0; i < atomi.length; i++) for (let j = 0; j < i; j++) En += (atomi[i].Z * atomi[j].Z) / Math.hypot(...[0, 1, 2].map((k) => atomi[i].pos[k] - atomi[j].pos[k]));
  // X = S^(−1/2)
  const s = autovalori(S2, n), X = new Float64Array(n * n); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { let v = 0; for (let k = 0; k < n; k++) v += s.V[i * n + k] * s.V[j * n + k] / Math.sqrt(s.w[k]); X[i * n + j] = v; }
  const mul = (A, B2, tA = false) => { const o = new Float64Array(n * n); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { let v = 0; for (let k = 0; k < n; k++) v += (tA ? A[k * n + i] : A[i * n + k]) * B2[k * n + j]; o[i * n + j] = v; } return o; };
  let P = new Float64Array(n * n), E = 0, C = null, eps = null, F = H, conv = false;
  for (let it = 0; it < giri; it++) {
    F = new Float64Array(n * n); for (let u = 0; u < n; u++) for (let v = 0; v < n; v++) { let g = 0; for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) g += P[a * n + b] * (eri(u, v, b, a) - 0.5 * eri(u, a, b, v)); F[u * n + v] = H[u * n + v] + g; }
    let e = 0; for (let i = 0; i < n * n; i++) e += 0.5 * P[i] * (H[i] + F[i]);
    const Fp = mul(mul(X, F, true), X), d = autovalori(Fp, n); C = mul(X, d.V); eps = d.w;
    const Pn = new Float64Array(n * n); for (let u = 0; u < n; u++) for (let v = 0; v < n; v++) { let q = 0; for (let k = 0; k < occ; k++) q += 2 * C[u * n + k] * C[v * n + k]; Pn[u * n + v] = q; }
    let dP = 0; for (let i = 0; i < n * n; i++) dP = Math.max(dP, Math.abs(Pn[i] - P[i]));
    P = Pn; if (it > 0 && Math.abs(e - E) < 1e-11 && dP < 1e-8) { E = e; conv = true; break; } E = e;
  }
  const bv = new Float64Array(n);
  const densita = (x, y, z) => { valoriBase(B, x, y, z, bv); let r = 0; for (let u = 0; u < n; u++) { if (!bv[u]) continue; let q = 0; for (let v = 0; v < n; v++) q += P[u * n + v] * bv[v]; r += bv[u] * q; } return r; };
  const centroide = [0, 1, 2].map((k) => atomi.reduce((s, a) => s + a.Z * a.pos[k], 0) / atomi.reduce((s, a) => s + a.Z, 0));
  const orbitali = []; for (let k = 0; k < occ; k++) { const c = Float64Array.from({ length: n }, (_, u) => C[u * n + k]), b2 = new Float64Array(n); orbitali.push({ k, energia: eps[k], c, psi: (x, y, z) => { valoriBase(B, x, y, z, b2); let s2 = 0; for (let u = 0; u < n; u++) s2 += c[u] * b2[u]; return s2; } }); }
  const mol = { tipo: 'molecola', atomi, base: B, energia: E + En, energiaElettronica: E, energiaNucleare: En, convergito: conv, P, orbitali, densita, elettroni: el, centroide };
  // i componenti: un orbitale molecolare per coppia di elettroni, con il suo campionatore a griglia
  mol.componenti = orbitali.map((o) => componenteSuGriglia(o, atomi, `orbitale ${o.k + 1} (${(o.energia * AU.eV).toFixed(1)} eV)`));
  mol.estensione = Math.max(...mol.componenti.map((c) => c.estensione));
  return mol;
}
// UN PUNTO DA |ψ|² DI UNA FUNZIONE QUALSIASI (statica): si divide la scatola in celle, ogni cella pesa quanto il
// massimo di |ψ|² sui suoi vertici e nel centro (per 1,3); si sceglie una cella con quel peso, un punto a caso dentro,
// e lo si tiene con probabilità |ψ|²/tetto. È esatto finché il tetto non è superato dentro la cella: le volte che
// succede si contano (`eccessi`: le prove le stampano). I nuclei che stanno su un vertice della griglia (l'atomo
// guardato sta nell'origine) hanno il loro picco sul vertice.
function componenteSuGriglia(o, atomi, nome, { celle = 40, margine = 4.5 } = {}) {
  let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity]; for (const a of atomi) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], a.pos[k] - margine); hi[k] = Math.max(hi[k], a.pos[k] + margine); }
  const L = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]), h = L / celle; lo = lo.map((v) => Math.floor(v / h) * h); // (l'origine su un vertice)
  const M = celle + 1, nodi = new Float64Array((M + 1) ** 3), Mn = M + 1;
  for (let k = 0; k <= M; k++) for (let j = 0; j <= M; j++) for (let i = 0; i <= M; i++) nodi[(k * Mn + j) * Mn + i] = o.psi(lo[0] + i * h, lo[1] + j * h, lo[2] + k * h) ** 2;
  const nc = M ** 3, tetto = new Float64Array(nc), cum = new Float64Array(nc + 1); let s = 0, c0 = [0, 0, 0], r2 = 0;
  for (let k = 0; k < M; k++) for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) {
    let m = o.psi(lo[0] + (i + 0.5) * h, lo[1] + (j + 0.5) * h, lo[2] + (k + 0.5) * h) ** 2; for (let q = 0; q < 8; q++) m = Math.max(m, nodi[((k + (q >> 2)) * Mn + j + ((q >> 1) & 1)) * Mn + i + (q & 1)]);
    const c = (k * M + j) * M + i; tetto[c] = 1.3 * m + 1e-14; s += tetto[c]; cum[c + 1] = s;
    const w = nodi[(k * Mn + j) * Mn + i] * h ** 3; c0[0] += w * (lo[0] + i * h); c0[1] += w * (lo[1] + j * h); c0[2] += w * (lo[2] + k * h);
  }
  let norma = 0; for (let i = 0; i < nodi.length; i++) norma += nodi[i]; norma *= h ** 3; c0 = c0.map((v) => v / norma);
  for (let k = 0; k <= M; k++) for (let j = 0; j <= M; j++) for (let i = 0; i <= M; i++) r2 += nodi[(k * Mn + j) * Mn + i] * ((lo[0] + i * h - c0[0]) ** 2 + (lo[1] + j * h - c0[1]) ** 2 + (lo[2] + k * h - c0[2]) ** 2);
  const rms = Math.sqrt((r2 * h ** 3) / norma), comp = { peso: 2, nome, orbitale: o, centro: c0, estensione: Math.min(L / 2, 5 * rms + 1), estensioneFFT: Math.min(L / 2, 4 * rms + 0.5), rms, eccessi: 0, tentativi: 0, psiT: (x, y, z) => [o.psi(x, y, z), 0], stazionario: true,
    campiona(rnd) { for (let t = 0; t < 100000; t++) { const u = rnd() * s; let a = 0, b = nc; while (b - a > 1) { const mid = (a + b) >> 1; if (cum[mid] <= u) a = mid; else b = mid; } const i = a % M, j = ((a / M) | 0) % M, k = (a / (M * M)) | 0, x = lo[0] + (i + rnd()) * h, y = lo[1] + (j + rnd()) * h, z = lo[2] + (k + rnd()) * h, f = o.psi(x, y, z) ** 2; comp.tentativi++; if (f > tetto[a]) comp.eccessi++; if (rnd() * tetto[a] <= f) return [x, y, z]; } return c0.slice(); } };
  return comp;
}

// ======================================================================= LA TRASFORMATA DI FOURIER (FFT su griglia)
function fft1(re, im, n, inversa = false) { // radice 2, sul posto
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
  for (let len = 2; len <= n; len <<= 1) { const a = ((inversa ? 2 : -2) * PI) / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) { let ur = 1, ui = 0; for (let k = 0; k < len / 2; k++) { const p = i + k, q = p + len / 2, tr = re[q] * ur - im[q] * ui, ti = re[q] * ui + im[q] * ur; re[q] = re[p] - tr; im[q] = im[p] - ti; re[p] += tr; im[p] += ti; const t = ur * wr - ui * wi; ui = ur * wi + ui * wr; ur = t; } } }
}
export function fft3(re, im, N, inversa = false) {
  const lr = new Float64Array(N), li = new Float64Array(N);
  for (let asse = 0; asse < 3; asse++) { const passo = asse === 0 ? 1 : asse === 1 ? N : N * N;
    for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) { const base = asse === 0 ? (a * N + b) * N : asse === 1 ? a * N * N + b : a * N + b;
      for (let k = 0; k < N; k++) { lr[k] = re[base + k * passo]; li[k] = im[base + k * passo]; } fft1(lr, li, N, inversa); for (let k = 0; k < N; k++) { re[base + k * passo] = lr[k]; im[base + k * passo] = li[k]; } } }
}
export const fft1d = fft1;
// LA DISTRIBUZIONE DEGLI IMPULSI di f(x) = ψ(x, t)·finestra(x): f su una griglia N³ di lato L attorno a «centro»,
// la sua trasformata, |F(p)|² normalizzato. → { prob: Float64Array(N³), cum, N, L, dp }
// `riempi`: la griglia si allarga di tanto con zeri (fuori dalla scatola la funzione è già trascurabile): gli impulsi
// escono più fitti di quel fattore (dp = 2π/(riempi·L)), senza cambiare la funzione
export function impulsi(psiT, { centro = [0, 0, 0], L = 20, N = 32, t = 0, finestra = null, riempi = 1 } = {}) {
  const h = L / N, G = N * riempi, n3 = G * G * G, re = new Float64Array(n3), im = new Float64Array(n3);
  for (let k = 0; k < N; k++) for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = centro[0] + (i - N / 2) * h, y = centro[1] + (j - N / 2) * h, z = centro[2] + (k - N / 2) * h, [a, b] = psiT(x, y, z, t), g = finestra ? Math.exp(-((x - finestra.x0[0]) ** 2 + (y - finestra.x0[1]) ** 2 + (z - finestra.x0[2]) ** 2) / (4 * finestra.sigma ** 2)) : 1, q = (k * G + j) * G + i;
    re[q] = a * g; im[q] = b * g;
  }
  const N0 = N; N = G; L = G * h; fft3(re, im, N); void N0;
  const prob = new Float64Array(n3), cum = new Float64Array(n3 + 1); let s = 0; for (let q = 0; q < n3; q++) { prob[q] = re[q] * re[q] + im[q] * im[q]; s += prob[q]; cum[q + 1] = s; }
  for (let q = 0; q < n3; q++) { prob[q] /= s; cum[q + 1] /= s; }
  return { prob, cum, N, L, dp: (2 * PI) / L };
}
const freq = (k, N) => (k < N / 2 ? k : k - N);
// un impulso tirato da quella distribuzione: una cella con il suo peso, poi un punto a caso dentro la cella
export function tiraImpulso(D, rnd) { const u = rnd(), n3 = D.prob.length; let a = 0, b = n3; while (b - a > 1) { const mid = (a + b) >> 1; if (D.cum[mid] <= u) a = mid; else b = mid; } const N = D.N, i = a % N, j = ((a / N) | 0) % N, k = (a / (N * N)) | 0; return [(freq(i, N) + rnd() - 0.5) * D.dp, (freq(j, N) + rnd() - 0.5) * D.dp, (freq(k, N) + rnd() - 0.5) * D.dp]; }
// i momenti della distribuzione degli impulsi sulla griglia (ai centri delle celle): ⟨p⟩ e lo scarto per asse. (I
// campioni di tiraImpulso, sparsi a caso dentro la cella, hanno in più dp²/12 di varianza: per questo si riempie.)
export function momentiImpulso(D) { const N = D.N, m1 = [0, 0, 0], m2 = [0, 0, 0]; for (let k = 0; k < N; k++) for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const w = D.prob[(k * N + j) * N + i], p = [freq(i, N) * D.dp, freq(j, N) * D.dp, freq(k, N) * D.dp]; for (let a = 0; a < 3; a++) { m1[a] += w * p[a]; m2[a] += w * p[a] * p[a]; } } return { media: m1, scarto: m2.map((v, a) => Math.sqrt(v - m1[a] ** 2)) }; }
// la scatola della FFT per un componente e una finestra: stretta attorno a x₀ se la finestra lo è, altrimenti tutto lo stato
export function scatolaFFT(comp, x0, sigma) { const E = comp.estensioneFFT; return sigma > 0 && sigma < Infinity && 12 * sigma < 2 * E ? { centro: x0, L: 12 * sigma } : { centro: comp.centro, L: 2 * E }; }

// ======================================================================= LA MISURA (un evento)
// misura(stato, indirizzo, k, { t (unità atomiche dalla preparazione), sigma (a₀; 0: ideale), impulso, N }) →
//   { x: [x₀] (a₀), p: [p] (ħ/a₀) o null, componente, k }
// I numeri sono quelli dell'evento «indirizzo/misura k» (eventi.js); il punto «vero» tirato da |ψ|² non esce: si
// vede solo x₀, che lo strumento sfuma di σ.
export function misura(stato, indirizzo, k, { t = 0, sigma = 0, impulso = false, N = 32, riempi = 1 } = {}) {
  const rnd = contatore(`${indirizzo}/misura ${k}`), C = stato.componenti, tot = C.reduce((s, c) => s + c.peso, 0);
  let u = rnd() * tot, ci = 0; for (; ci < C.length - 1; ci++) { u -= C[ci].peso; if (u <= 0) break; }
  const comp = C[ci], x = comp.campiona(rnd, t);
  if (sigma > 0) for (let a = 0; a < 3; a++) x[a] += sigma * campana(rnd(), rnd());
  let p = null;
  if (impulso && sigma > 0) { const sc = scatolaFFT(comp, x, sigma), D = impulsi(comp.psiT, { centro: sc.centro, L: sc.L, N, t, riempi, finestra: { x0: x, sigma } }); p = tiraImpulso(D, rnd); }
  return { x, p, componente: ci, k };
}
// MISURE IN FILA SULLO STESSO ATOMO: l'ordine conta solo dove la fisica lo dice. sequenza: ['x', 'px', 'y', …,
// 'posizione', 'impulso'] — ogni misura è un evento il cui indirizzo dice CHE COSA si misura e la STORIA delle misure
// prima: «indirizzo/misura k/px dopo x». Lo stato dopo ogni misura è quello RIDOTTO: per la posizione ψ·finestra(x),
// per l'impulso φ·finestra(p) riportata nello spazio con la trasformata inversa (operatori di Kraus gaussiani, larghezze
// sigmaX e sigmaP; un passo può essere { cosa, dopo: Δt in unità atomiche }: in mezzo lo stato evolve, vedi sotto; 'resta'
// è la misura «è ancora nello stato iniziale?», che con misure fitte dà l'effetto Zeno). Posizione e impulso lungo lo stesso asse non commutano: x poi p_x dà altro che p_x poi x; lungo
// assi diversi commutano, e l'ordine non cambia la statistica (prove). Tutto su una griglia N³ attorno al componente.
const ASSE = { x: 0, y: 1, z: 2, px: 0, py: 1, pz: 2 };
export function misureInFila(stato, indirizzo, k, sequenza, { t = 0, sigmaX = 0.5, sigmaP = 0.5, N = 32, L = null, potenziale = null } = {}) {
  const C = stato.componenti, tot = C.reduce((s, c) => s + c.peso, 0), r0 = contatore(`${indirizzo}/misura ${k}/quale elettrone`);
  let u = r0() * tot, ci = 0; for (; ci < C.length - 1; ci++) { u -= C[ci].peso; if (u <= 0) break; }
  const comp = C[ci], lato = L || 2 * comp.estensioneFFT, h = lato / N, n3 = N * N * N, re = new Float64Array(n3), im = new Float64Array(n3), dp = (2 * PI) / lato;
  const coord = (i, a) => comp.centro[a] + (i - N / 2) * h, fr = (i) => freq(i, N) * dp, idx = (q) => [q % N, ((q / N) | 0) % N, (q / (N * N)) | 0];
  for (let q = 0; q < n3; q++) { const [i, j, kk] = idx(q), [a, b] = comp.psiT(coord(i, 0), coord(j, 1), coord(kk, 2), t); re[q] = a; im[q] = b; }
  const tira = (rnd, spazio) => { let s = 0; for (let q = 0; q < n3; q++) s += re[q] * re[q] + im[q] * im[q]; let v = rnd() * s, q = 0; for (; q < n3 - 1; q++) { v -= re[q] * re[q] + im[q] * im[q]; if (v <= 0) break; } const g = idx(q); return spazio === 'x' ? g.map((i, a) => coord(i, a) + (rnd() - 0.5) * h) : g.map((i) => fr(i) + (rnd() - 0.5) * dp); };
  const esiti = []; let storia = 'niente', nelloSpazio = 'x';
  const vaiA = (spazio) => { if (spazio === nelloSpazio) return; fft3(re, im, N, spazio === 'x'); nelloSpazio = spazio; };
  // TRA DUE MISURE lo stato ridotto evolve con l'equazione di Schrödinger (passo diviso, Feit, Fleck & Steiger 1982 [R]):
  // e^(−iVdt/2)·e^(−ip²dt/2)·e^(−iVdt/2); libero (V = 0) il passo è esatto in un colpo solo; nell'atomo V = −Z/√(r² + (h/2)²)
  // (il Coulomb ammorbidito di mezza cella: la griglia non risolve la cuspide; dichiarato)
  const Zv = potenziale === 'coulomb' ? stato.Z || 1 : 0, Vg = Zv ? new Float64Array(n3) : null;
  if (Vg) for (let q = 0; q < n3; q++) { const g = idx(q), r2 = coord(g[0], 0) ** 2 + coord(g[1], 1) ** 2 + coord(g[2], 2) ** 2; Vg[q] = -Zv / Math.sqrt(r2 + (h / 2) ** 2); }
  const fase = (arr, k) => { for (let q = 0; q < n3; q++) { const c = Math.cos(k * arr(q)), sn = -Math.sin(k * arr(q)), a = re[q], b = im[q]; re[q] = a * c - b * sn; im[q] = a * sn + b * c; } };
  const cinetica = (q) => { const g = idx(q); return 0.5 * (fr(g[0]) ** 2 + fr(g[1]) ** 2 + fr(g[2]) ** 2); };
  const evolvi = (dt) => { if (!(dt > 0)) return; const passi = Vg ? Math.ceil(dt / 0.05) : 1, d = dt / passi;
    for (let i = 0; i < passi; i++) { if (Vg) { vaiA('x'); fase((q) => Vg[q], d / 2); } vaiA('p'); fase(cinetica, d); if (Vg) { vaiA('x'); fase((q) => Vg[q], d / 2); } } };
  const iniziale = { re: Float64Array.from(re), im: Float64Array.from(im) }; { let s0 = 0; for (let q = 0; q < n3; q++) s0 += re[q] ** 2 + im[q] ** 2; const k0 = 1 / Math.sqrt(s0); for (let q = 0; q < n3; q++) { iniziale.re[q] *= k0; iniziale.im[q] *= k0; } }
  for (let passo of sequenza) {
    if (typeof passo === 'string') passo = { cosa: passo }; const cosa = passo.cosa; evolvi(passo.dopo || 0);
    if (cosa === 'resta') { // la misura del proiettore sullo stato iniziale: «è ancora com'era?» (sì / no)
      vaiA('x'); let s2 = 0, ar = 0, ai = 0; for (let q = 0; q < n3; q++) { s2 += re[q] ** 2 + im[q] ** 2; ar += iniziale.re[q] * re[q] + iniziale.im[q] * im[q]; ai += iniziale.re[q] * im[q] - iniziale.im[q] * re[q]; }
      const P = (ar * ar + ai * ai) / s2, rnd = contatore(`${indirizzo}/misura ${k}/resta dopo ${storia}`), si = rnd() < P;
      for (let q = 0; q < n3; q++) { if (si) { re[q] = iniziale.re[q]; im[q] = iniziale.im[q]; } else { re[q] -= ar * iniziale.re[q] - ai * iniziale.im[q]; im[q] -= ar * iniziale.im[q] + ai * iniziale.re[q]; } }
      esiti.push({ cosa, valore: si, probabilita: P, indirizzo: `${indirizzo}/misura ${k}/resta dopo ${storia}` }); storia = storia === 'niente' ? cosa : `${storia} poi ${cosa}`; continue;
    }
    const rnd = contatore(`${indirizzo}/misura ${k}/${cosa} dopo ${storia}`), impulso = cosa[0] === 'p' || cosa === 'impulso', spazio = impulso ? 'p' : 'x', assi = cosa === 'posizione' || cosa === 'impulso' ? [0, 1, 2] : [ASSE[cosa]], sg = impulso ? sigmaP : sigmaX;
    vaiA(spazio); const vero = tira(rnd, spazio), esito = vero.slice(); for (const a of assi) esito[a] += sg * campana(rnd(), rnd());
    // la riduzione: la finestra attorno all'esito, lungo gli assi misurati
    for (let q = 0; q < n3; q++) { const g = idx(q); let e = 0; for (const a of assi) { const c = spazio === 'x' ? coord(g[a], a) : fr(g[a]); e += (c - esito[a]) ** 2; } const w = Math.exp(-e / (4 * sg * sg)); re[q] *= w; im[q] *= w; }
    esiti.push({ cosa, valore: assi.length === 3 ? esito : esito[assi[0]], indirizzo: `${indirizzo}/misura ${k}/${cosa} dopo ${storia}` });
    storia = storia === 'niente' ? cosa : `${storia} poi ${cosa}`;
  }
  return { componente: ci, esiti };
}

// LA DECOERENZA: quanto dura una sovrapposizione dentro il suo ambiente (Joos & Zeh 1985, Z. Phys. B 59, 223 [R];
// Zurek 2003, RMP 75, 715 [V]; Schlosshauer 2007 per le formule [R]). Due parti di una sovrapposizione separate di Δx
// si distinguono per l'ambiente che le urta: il ritmo è Λ·Δx² finché Δx è più piccola della lunghezza d'onda di chi urta,
// e non supera il ritmo degli urti stessi (ogni urto, al più, «misura» una volta):
//   · molecole (gas, o un liquido visto come gas fitto: STIMA) di densità n, massa m, temperatura T, contro un oggetto
//     di raggio a: Λ = (8/3ħ²)·n·√(2πm)·(k_BT)^(3/2)·a²; urti Γ = n·π(a + a_m)²·v̄, v̄ = √(8k_BT/πm);
//   · fotoni termici a T: Λ = 8!·8ζ(9)·c·a⁶/(9π)·(k_BT/ħc)⁹.
// → { tempo (s), ritmo (1/s), regime }. ambiente: { n (1/m³), massaKg, T, raggioM (di chi urta) } o { fotoni: T }.
export function decoerenza({ ambiente = { fotoni: COSMO.Tcmb }, raggioM = 1e-10, separazioneM = 1e-10 } = {}) {
  const hb = COSTANTI.hbar, kB = COSTANTI.kB, c = COSTANTI.c;
  if (ambiente.fotoni != null) { const T = ambiente.fotoni, L = (40320 * 8 * 1.0020083928 * c * raggioM ** 6) / (9 * PI) * ((kB * T) / (hb * c)) ** 9, r = L * separazioneM ** 2; return { tempo: 1 / r, ritmo: r, regime: `fotoni termici a ${T} K`, Lambda: L }; }
  const { n, massaKg: m, T, raggioM: am = 1.4e-10 } = ambiente, L = (8 / (3 * hb * hb)) * n * Math.sqrt(2 * PI * m) * (kB * T) ** 1.5 * raggioM ** 2, urti = n * PI * (raggioM + am) ** 2 * Math.sqrt((8 * kB * T) / (PI * m)), r = Math.min(L * separazioneM ** 2, urti);
  return { tempo: 1 / r, ritmo: r, regime: r === urti ? 'ogni urto distingue (Δx più grande della lunghezza d\'onda di chi urta)' : 'Λ·Δx²', Lambda: L, urti };
}

// la densità totale (elettroni per a₀³) di uno stato, a un tempo
export function densita(stato, x, y, z, t = 0) { if (stato.densita) return stato.densita(x, y, z); let s = 0; for (const c of stato.componenti) { const [a, b] = c.psiT(x, y, z, t); s += c.peso * (a * a + b * b); } return s; }

// ======================================================================= LA DENSITÀ DELL'ATOMO INTERO E LA SUA SUPERFICIE
// La densità elettronica di un atomo libero (o di uno ione) dalle regole di Slater (Slater 1930, Phys. Rev. 36, 57): ogni
// gruppo di elettroni (1s)(2s,2p)(3s,3p)(3d)(4s,4p)… è un orbitale di Slater r^(n*−1)·e^(−ζr), ζ = (Z − schermo)/n*, con lo
// schermo delle sue regole (0,35 dallo stesso gruppo, 0,30 nell'1s; 0,85 dal guscio sotto e 1 da quelli più giù per s e p;
// 1 da tutti quelli prima per d e f) e n* = 1, 2, 3, 3,7, 4, 4,2. La base STO-3G qui sopra (Hehre, Stewart e Pople 1969) è
// questa stessa funzione scritta con tre gaussiane. La «superficie» di un atomo non è una sfera di raggio scelto: è dove la
// densità scende a 0,001 elettroni per a₀³ (Bader, Carroll, Cheeseman e Chang 1987: quella superficie racchiude quasi tutta la
// carica e dà le grandezze di van der Waals). Al nucleo la densità è finita: ρ(0) = Σ_1s ζ³/π (la «densità di contatto»).
// → { rho(r) (e/a₀³, r in a₀), rIso(livello = 0,001) (a₀), rho0, gruppi }
const ORDINE_AUFBAU = [[1, 0], [2, 0], [2, 1], [3, 0], [3, 1], [4, 0], [3, 2], [4, 1], [5, 0], [4, 2], [5, 1], [6, 0], [4, 3], [5, 2], [6, 1]], NSTAR = { 1: 1, 2: 2, 3: 3, 4: 3.7, 5: 4.0, 6: 4.2 };
const gammaFn = (x) => { if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gammaFn(1 - x)); x -= 1; const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7]; let a = c[0]; const t = x + g + 0.5; for (let i = 1; i < 9; i++) a += c[i] / (x + i); return Math.sqrt(2 * Math.PI) * t ** (x + 0.5) * Math.exp(-t) * a; }; // (Lanczos)
const densitaFatte = new Map();
export function densitaAtomo(Z, carica = 0) {
  const ch = `${Z}|${carica}`; if (densitaFatte.has(ch)) return densitaFatte.get(ch);
  let resta = Math.max(1, Z - carica); const occ = []; for (const [n, l] of ORDINE_AUFBAU) { if (resta <= 0) break; const k = Math.min(resta, 2 * (2 * l + 1)); occ.push({ n, l, k }); resta -= k; }
  // i gruppi di Slater: s e p dello stesso n insieme; d e f a parte
  const gruppi = []; for (const o of occ) { const chi = o.l <= 1 ? `${o.n}sp` : `${o.n}${'spdf'[o.l]}`; let g = gruppi.find((x) => x.chi === chi); if (!g) gruppi.push((g = { chi, n: o.n, l: o.l <= 1 ? 0 : o.l, k: 0 })); g.k += o.k; }
  const posto = (g) => (g.l <= 1 ? 2 * g.n : 2 * g.n + 1) + (g.l >= 2 ? g.l * 0.1 : 0); gruppi.sort((a, b) => posto(a) - posto(b));
  for (const g of gruppi) { let sch = 0; for (const h of gruppi) { if (h === g) sch += (g.k - 1) * (g.n === 1 ? 0.3 : 0.35); else if (posto(h) < posto(g)) { if (g.l >= 2) sch += h.k; else sch += h.k * (h.n === g.n - 1 ? 0.85 : h.n < g.n - 1 ? 1 : 0); } }
    g.ns = NSTAR[g.n] || 4.2; g.zeta = Math.max(0.3, Z - sch) / g.ns; g.N2 = (2 * g.zeta) ** (2 * g.ns + 1) / gammaFn(2 * g.ns + 1); }
  const rho = (r) => { let s = 0; for (const g of gruppi) s += (g.k * g.N2 * r ** (2 * g.ns - 2) * Math.exp(-2 * g.zeta * r)) / (4 * Math.PI); return s; };
  const rIso = (liv = 0.001) => { let a = 0.3, b = 30; if (rho(b) > liv) return b; for (let i = 0; i < 80; i++) { const m = 0.5 * (a + b); if (rho(m) > liv) a = m; else b = m; } return 0.5 * (a + b); };
  const out = { rho, rIso, rho0: rho(0), gruppi }; densitaFatte.set(ch, out); return out;
}
// LA CARICA INDOTTA NEL VUOTO attorno a un nucleo (Uehling 1935): il potenziale di una carica Ze cresce, a distanze sotto la
// lunghezza Compton ridotta dell'elettrone (ƛ = 386 fm), del termine (2α/3π)·∫₁^∞ e^(−2rt/ƛ)·(1 + 1/(2t²))·√(t² − 1)/t² dt; la
// carica che lo fa (per r > 0, dall'equazione di Poisson) è −Z·(2α/3π)/(4π r)·∫₁^∞ f(t)·(2t/ƛ)²·e^(−2rt/ƛ) dt, negativa:
// scherma il nucleo, che da vicino si vede più carico. → e/m³ (in valore assoluto), r in metri
export const LAMBDA_E = 3.8615926796e-13;
export function caricaUehling(Z, r) {
  const a = 1 / AU.c, k0 = 2 / LAMBDA_E; let s = 0; const n = 400, tTop = 1 + 60 / (k0 * r + 1e-30);
  for (let i = 0; i < n; i++) { const u = (i + 0.5) / n, t = 1 + (tTop - 1) * u * u, dt = 2 * (tTop - 1) * u / n, f = ((1 + 1 / (2 * t * t)) * Math.sqrt(t * t - 1)) / (t * t), k = k0 * t; s += f * k * k * Math.exp(-k * r) * dt; }
  return (Z * ((2 * a) / (3 * Math.PI)) * s) / (4 * Math.PI * r);
}

// ======================================================================= IL NUCLEO
// raggi quadratici medi di CARICA misurati, fm (Angeli & Marinova 2013, At. Data Nucl. Data Tables 99, 69 [R]), per
// l'isotopo più abbondante; il protone: CODATA 2018 (atomi muonici e idrogeno) [R]
export const RAGGI_CARICA = { 1: 0.8414, 2: 1.6755, 3: 2.444, 4: 2.519, 5: 2.406, 6: 2.4702, 7: 2.5582, 8: 2.6991, 9: 2.8976, 10: 3.0055, 11: 2.9936, 12: 3.057, 13: 3.061, 14: 3.1224, 15: 3.1889, 16: 3.2611, 17: 3.3654, 18: 3.4274, 19: 3.4349, 20: 3.4776, 26: 3.7377, 29: 3.8823, 30: 3.9283, 82: 5.5012 };
const A_DIVERSO = { 17: 35, 29: 63, 30: 64, 32: 74, 34: 80, 35: 79, 42: 98, 82: 208 }; // dove l'isotopo più abbondante non è la massa arrotondata
export function numeroDiMassa(Z) { if (A_DIVERSO[Z]) return A_DIVERSO[Z]; try { return Math.round(datiAtomo(Z).massa); } catch { return Math.round(2.5 * Z); } }
export const RP2 = 0.8409 ** 2, RN2 = -0.1161; // raggio² di carica del protone (atomi muonici, Antognini 2013 [R]) e del neutrone (PDG [R]), fm²
const DIFFUSIVITA = 0.52; // fm: la diffusività della superficie dei nuclei medi e pesanti (sistematica della diffusione di elettroni [R])
// una densità radiale tabulata → { densita(r), quantile(u), rms }
function radialeTabulata(f, rTop, M = 4000) {
  const dr = rTop / M, cum = new Float64Array(M + 1), val = new Float64Array(M + 1); let r2 = 0;
  for (let i = 0; i <= M; i++) val[i] = f(i * dr);
  for (let i = 1; i <= M; i++) { const a = (i - 1) * dr, b = i * dr, w = (dr / 2) * (Math.max(0, val[i - 1]) * a * a + Math.max(0, val[i]) * b * b); cum[i] = cum[i - 1] + w; r2 += (dr / 2) * (val[i - 1] * a ** 4 + val[i] * b ** 4); }
  let n0 = 0, neg = 0; for (let i = 1; i <= M; i++) { const w = (dr / 2) * (val[i - 1] * ((i - 1) * dr) ** 2 + val[i] * (i * dr) ** 2); n0 += w; if (w < 0) neg -= w; }
  const tot = cum[M]; for (let i = 0; i <= M; i++) cum[i] /= tot;
  return { densita: (r) => { const x = r / dr, i = Math.floor(x); return i >= M ? 0 : val[i] + (val[i + 1] - val[i]) * (x - i); }, quantile: (u) => { let lo = 0, hi = M; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] < u) lo = mid; else hi = mid; } return (lo + (u - cum[lo]) / Math.max(1e-300, cum[hi] - cum[lo])) * dr; }, rms: Math.sqrt(r2 / n0), parteNegativa: neg / (tot || 1), valori: val, dr };
}
const direzione = (rnd) => { const z = 2 * rnd() - 1, s = Math.sqrt(1 - z * z), f = rnd(); return [s * cosGiro(f), s * cosGiro(f - 0.25), z]; };
const bisezione = (f, a, b) => { for (let i = 0; i < 200; i++) { const m = (a + b) / 2; if (f(a) * f(m) <= 0) b = m; else a = m; } return (a + b) / 2; };
// il nucleo di numero atomico Z (e numero di massa A): la densità dei centri dei protoni e dei neutroni
export function nucleo(Z, A = numeroDiMassa(Z)) {
  const N = A - Z, misurato = RAGGI_CARICA[Z] != null, rch = misurato ? RAGGI_CARICA[Z] : Math.sqrt(3 / 5) * 1.2 * A ** (1 / 3);
  if (A === 1) return { Z, A, N: 0, rCarica: rch, misurato, forma: 'un protone', protoni: null, neutroni: null, raggio: rch };
  // i centri dei protoni: il raggio di carica tolto delle dimensioni del protone e del neutrone (r² si sommano)
  const rpt = Math.sqrt(rch * rch - RP2 - (N / Z) * RN2);
  let forma, profilo;
  if (A <= 20) { // modello a shell con l'oscillatore armonico: 1s² e il resto nel guscio 1p → ρ ∝ (1 + α(r/b)²)e^(−(r/b)²), α = (Z − 2)/3
    const al = Math.max(0, (Z - 2) / 3), b = rpt / Math.sqrt(1.5 * (1 + 2.5 * al) / (1 + 1.5 * al)), aln = Math.max(0, (N - 2) / 3);
    forma = `oscillatore armonico (b = ${b.toFixed(3)} fm)`; profilo = { p: (r) => (1 + al * (r / b) ** 2) * Math.exp(-((r / b) ** 2)), n: (r) => (1 + aln * (r / b) ** 2) * Math.exp(-((r / b) ** 2)), top: 6 * b };
  } else { // Fermi a due parametri, con la diffusività misurata e il raggio a metà densità c fissato dal raggio misurato
    const a = DIFFUSIVITA, f = (c) => (r) => 1 / (1 + Math.exp((r - c) / a)), top = (c) => c + 14 * a;
    const c = bisezione((c) => radialeTabulata(f(c), top(c), 1500).rms - rpt, 0.1, 12);
    forma = `Fermi a due parametri (c = ${c.toFixed(3)} fm, a = ${a} fm)`; profilo = { p: f(c), n: f(c), top: top(c) };
  }
  const protoni = radialeTabulata(profilo.p, profilo.top), neutroni = radialeTabulata(profilo.n, profilo.top);
  return { Z, A, N, rCarica: rch, misurato, rPunti: rpt, forma, protoni, neutroni, raggio: Math.sqrt(5 / 3) * rch };
}

// ======================================================================= IL NUCLEONE (dai fattori di forma misurati)
const HC = 0.1973269804, MP = 0.93827208816, MN = 0.93956542052; // GeV·fm, GeV
const GD = (Q2) => 1 / (1 + Q2 / 0.71) ** 2;
// G_E del protone: Kelly 2004 (PRC 70, 068202) [R], a₁ = −0,24, b = 10,98, 12,82, 21,97; del neutrone: Galster 1971,
// nella forma di Kelly A = 1,70, B = 3,30 [R]
export const FATTORE_FORMA = { protone: (Q2) => { const t = Q2 / (4 * MP * MP); return (1 - 0.24 * t) / (1 + 10.98 * t + 12.82 * t * t + 21.97 * t ** 3); }, neutrone: (Q2) => { const t = Q2 / (4 * MN * MN); return ((1.70 * t) / (1 + 3.30 * t)) * GD(Q2); } };
// la densità di carica (e/fm³) dalla trasformata: ρ(r) = (1/2π²)∫G(q)·sin(qr)/(qr)·q²dq, Q² = (ħc·q)²
function densitaDaFattore(G, r, qTop = 60, M = 12000) { const h = qTop / M; let s = 0; for (let i = 1; i < M; i++) { const q = i * h, x = q * r; s += (i & 1 ? 4 : 2) * G((HC * q) ** 2) * (x < 1e-8 ? 1 : Math.sin(x) / x) * q * q; } return (s * h) / 3 / (2 * PI * PI); }
let memoNucleone = null;
export function nucleone() {
  if (memoNucleone) return memoNucleone;
  const top = 4, M = 400, dr = top / M, rp = new Float64Array(M + 1), rn = new Float64Array(M + 1);
  for (let i = 0; i <= M; i++) { rp[i] = densitaDaFattore(FATTORE_FORMA.protone, i * dr); rn[i] = densitaDaFattore(FATTORE_FORMA.neutrone, i * dr); }
  const interp = (v) => (r) => { const x = r / dr, i = Math.floor(x); return i >= M ? 0 : v[i] + (v[i + 1] - v[i]) * (x - i); };
  const p = interp(rp), n = interp(rn);
  // isospin: nel protone u = 2ρ_p + ρ_n, d = ρ_p + 2ρ_n (densità di NUMERO dei quark meno antiquark; lo strano trascurato)
  const u = radialeTabulata((r) => 2 * p(r) + n(r), top, 2000), d = radialeTabulata((r) => p(r) + 2 * n(r), top, 2000);
  const momento = (f, k) => { let s = 0; for (let i = 1; i < 4000; i++) { const r = (i * top) / 4000; s += f(r) * r ** (2 + k); } return 4 * PI * s * (top / 4000); };
  memoNucleone = { caricaProtone: p, caricaNeutrone: n, u, d, normaProtone: momento(p, 0), normaNeutrone: momento(n, 0), r2Protone: momento(p, 2) / momento(p, 0), r2Neutrone: momento(n, 2),
    // r² = −6·dG/dQ² in Q² = 0 (fm²): il raggio che lo stesso fattore di forma dà dalla pendenza
    r2DaPendenza: (G) => -6 * ((G(1e-7) - G(0)) / 1e-7) * HC * HC };
  return memoNucleone;
}
// un'istantanea del nucleo (un evento): i centri di Z protoni e N neutroni (fm, dal centro), e i tre quark di valenza
// di ognuno (fm, dal centro del nucleo). → { nucleoni: [{ tipo: 'p'|'n', pos, quark: [{ sapore: 'u'|'d', pos }] }] }
// (due nucleoni non stanno più vicini di 0,9 fm: il nocciolo repulsivo della forza nucleare; la «distanza di espulsione» con cui
// si tirano i nucleoni nei modelli di Glauber, Broniowski e Rybczyński 2010, PRC 81, 064909 [R]. Il nucleo pieno ne ha uno
// ogni ρ₀^(−1/3) = 1,8 fm)
export const DISTANZA_MINIMA = 0.9;
export function istantanea(nuc, indirizzo, k) {
  const rnd = contatore(`${indirizzo}/istantanea ${k}`), Q = nucleone(), out = [];
  const metti = (tipo, pos) => { const sapori = tipo === 'p' ? ['u', 'u', 'd'] : ['u', 'd', 'd'], quark = sapori.map((s) => { const dist = tipo === 'p' ? (s === 'u' ? Q.u : Q.d) : (s === 'u' ? Q.d : Q.u), r = dist.quantile(rnd()), d = direzione(rnd); return { sapore: s, pos: [pos[0] + r * d[0], pos[1] + r * d[1], pos[2] + r * d[2]] }; }); out.push({ tipo, pos, quark }); };
  if (!nuc.protoni) metti('p', [0, 0, 0]);
  else { const posti = [], lontano = (p) => posti.every((q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2 >= DISTANZA_MINIMA ** 2), tira = (dist) => { let p = null; for (let t = 0; t < 60; t++) { const r = dist.quantile(rnd()), d = direzione(rnd); p = d.map((v) => v * r); if (lontano(p)) break; } posti.push(p); return p; };
    for (let i = 0; i < nuc.Z; i++) metti('p', tira(nuc.protoni)); for (let i = 0; i < nuc.N; i++) metti('n', tira(nuc.neutroni)); }
  return { k, nucleoni: out };
}

// ======================================================================= L'ATOMO VERO DEL MODELLO
// da una scena di atomi3d.js (unità 'nm', 'A' o 'm') e un indice: l'atomo e la sua molecola (stesso `gruppo`, o i
// vicini entro 1,25 volte la somma dei raggi covalenti), con le posizioni in a₀ relative all'atomo guardato.
const UNITA_M = { nm: 1e-9, A: 1e-10, m: 1 };
export function atomoDaScena(scena, indice, { indirizzo = null } = {}) {
  const A = scena.atomi, u = UNITA_M[scena.unita || 'nm'], Z = A.elemento[indice], p0 = [0, 1, 2].map((k) => A.pos[3 * indice + k]), tutti = A.elemento.length, mol = [];
  const raggioCov = (z) => { try { return datiAtomo(z).raggioCovalente * 1e-10 / u; } catch { return 1.5e-10 / u; } };
  for (let j = 0; j < tutti; j++) {
    const d = Math.hypot(...[0, 1, 2].map((k) => A.pos[3 * j + k] - p0[k]));
    const stesso = A.gruppo ? A.gruppo[j] === A.gruppo[indice] : d < 1.25 * (raggioCov(Z) + raggioCov(A.elemento[j]));
    if (stesso && (A.gruppo ? d < 0.5e-9 / u : true)) mol.push({ Z: A.elemento[j], pos: [0, 1, 2].map((k) => ((A.pos[3 * j + k] - p0[k]) * u) / AU.a0), indice: j });
  }
  mol.sort((a, b) => (a.indice === indice ? -1 : b.indice === indice ? 1 : a.indice - b.indice));
  // LA CARICA: uno ione di un atomo solo (le parti della scena con la loro carica, un atomo per ione: gli ioni del mare di
  // atomi3d.js) ha Z − carica elettroni; prima l'atomo si prendeva sempre neutro, e il Na⁺ dell'acqua di mare ne aveva 11.
  // Le cariche parziali dei campi di forza (l'ossigeno dell'acqua, il silicio del quarzo) non sono elettroni tolti: lì resta neutro.
  const parte = (scena.parti || []).find((q) => indice >= q.da && indice < q.a && Number.isInteger(q.carica) && q.a - q.da === q.quanti);
  const carica = parte && mol.length === 1 ? parte.carica : 0;
  return { Z, indice, pos: p0, scala: u, molecola: mol, ...(carica ? { carica } : {}), indirizzo: indirizzo || `${scena.nome || 'scena'}/atomo ${indice}` };
}
// lo stato quantistico dell'atomo guardato: la molecola con Hartree-Fock se si può (tutti gli atomi dall'idrogeno al
// neon, elettroni pari, al più 8 atomi), altrimenti l'atomo nel campo centrale; `preparazione` (solo un elettrone):
// una sovrapposizione scelta da chi guarda
export function statoDi(atomo) {
  if (atomo.preparazione) return sovrapposizione(atomo.preparazione, atomo.Z, { indirizzo: atomo.indirizzo, tempoDecoerenza: atomo.tempoDecoerenza ?? Infinity });
  const m = atomo.molecola || [];
  if (m.length >= 2 && m.length <= 8 && m.every((a) => a.Z <= 10) && (m.reduce((s, a) => s + a.Z, 0) - (atomo.carica || 0)) % 2 === 0) { const s = molecola(m, { carica: atomo.carica || 0 }); s.nucleo = { Z: atomo.Z, A: numeroDiMassa(atomo.Z) }; return s; }
  return statoAtomo(atomo.Z, { carica: atomo.carica || 0 });
}

// ======================================================================= LO STATO SPERIMENTALE DI OGNI LEGGE
export const STATO = Object.freeze([
  { legge: 'equazione di Schrödinger dell\'idrogeno: energie e orbitali esatti', funzioni: 'orbitale, radiale, energiaIdrogenoide', stato: 'misurata', misura: 'righe di Lyman e Balmer; 1S–2S a 2 466 061 413 187 kHz (Parthey et al. 2011 [R]: lì servono anche Dirac e Lamb, qui no); la struttura dei nodi vista direttamente al microscopio a fotoionizzazione (Stodolna et al. 2013, PRL 110, 213001 [V])' },
  { legge: 'regola di Born: la misura dà un esito con probabilità |ψ|²', funzioni: 'misura', stato: 'misurata', misura: 'immagini composte elettrone per elettrone (Stodolna 2013 [V]; interferenza di elettroni singoli: Tonomura et al. 1989 [R]); ogni statistica di laboratorio' },
  { legge: 'campo centrale con la schermatura di Slater', funzioni: 'statoAtomo', stato: 'modello (approssimato)', misura: 'regole empiriche del 1930; Hartree-Fock e le misure di diffusione X danno raggi e densità degli atomi che qui tornano solo entro il 10–20%' },
  { legge: 'Hartree-Fock-Roothaan, base minima STO-3G', funzioni: 'molecola', stato: 'modello (approssimato)', misura: 'le densità elettroniche dei cristalli si misurano per diffrazione X (densità di deformazione dei legami) e si vedono i legami con la microscopia a forza atomica (Gross et al. 2009, Science 325, 1110; 2012, Science 337, 1326 [R]); la base minima ne dà la forma, non i valori fini; la correlazione manca' },
  { legge: 'misura non nitida (Kraus gaussiano) e trasformata di Fourier: l\'indeterminazione', funzioni: 'misura, impulsi, tiraImpulso', stato: 'misurata', misura: 'Δx·Δp ≥ ħ/2 (Kennard 1927): stati coerenti e compressi della luce e degli ioni la raggiungono; il limite delle misure congiunte (Arthurs & Kelly 1965) e l\'errore-disturbo (Ozawa; neutroni: Erhart et al. 2012 [R])' },
  { legge: 'battimenti tra stati di energie diverse; pacchetto che si allarga', funzioni: 'sovrapposizione, pacchetto', stato: 'misurata', misura: 'battimenti quantistici; il moto degli elettroni di valenza seguito ad attosecondi (Goulielmakis et al. 2010, Nature 466, 739 [R]); pacchetti di Rydberg (citati in Stodolna 2013 [V])' },
  { legge: 'emissione spontanea (Weisskopf-Wigner) e salto come evento', funzioni: 'ritmoEmissione, sovrapposizione', stato: 'misurata', misura: 'vita del 2p dell\'idrogeno 1,596 ns (A = 6,2649·10⁸/s [R]); salti quantistici osservati su un singolo ione (Nagourney, Sandberg & Dehmelt 1986 [R])' },
  { legge: 'decoerenza per urti e fotoni (Joos-Zeh): tempo stimato, coerenze smorzate', funzioni: 'decoerenza, sovrapposizione', stato: 'misurata (il fenomeno) / stima (il liquido visto come gas fitto)', misura: 'decoerenza per urti di molecole di fullerene con un gas, misurata dal contrasto delle frange (Hornberger et al. 2003, PRL 90, 160401 [R]); in cavità (Brune et al. 1996 [R]); Zurek 2003 [V]. Ogni misura dello strumento è su un atomo preparato uguale (dichiarato)' },
  { legge: 'misure in fila: l\'ordine conta per osservabili che non commutano; tra due misure l\'evoluzione di Schrödinger; effetto Zeno', funzioni: 'misureInFila', stato: 'misurata', misura: 'misure successive di spin lungo assi diversi (Stern-Gerlach in fila); errore e disturbo con i neutroni (Erhart et al. 2012 [R]); effetto Zeno su ioni di berillio intrappolati (Itano, Heinzen, Bollinger & Wineland 1990, PRA 41, 2295 [R])' },
  { legge: 'densità di carica dei nuclei: raggi misurati, forma a shell o di Fermi', funzioni: 'nucleo', stato: 'misurata (raggio) / modello (forma)', misura: 'diffusione di elettroni (Hofstadter 1956 [R]); compilazioni di De Vries, De Jager & De Vries 1987 e Angeli & Marinova 2013 [R]' },
  { legge: 'densità dei neutroni uguale a quella dei protoni', funzioni: 'nucleo', stato: 'modello', misura: 'la pelle di neutroni del piombo è 0,28 ± 0,07 fm (PREX-II 2021 [R]): qui manca' },
  { legge: 'carica del nucleone dai fattori di forma; quark u e d per isospin', funzioni: 'nucleone, istantanea', stato: 'misurata (fattori di forma) / interpretazione (densità 3D) / modello (posizioni dei quark)', misura: 'raggio di carica del protone 0,84087 fm (idrogeno muonico, Antognini et al. 2013 [R]); CODATA 2018 0,8414 fm [R]; r² del neutrone −0,1161 fm² (PDG [R]); separazione dei sapori (Cates et al. 2011 [R]); la densità tridimensionale vale solo nel riferimento di Breit (Miller 2007 [R])' },
  { legge: 'vuoto della QCD (istantoni, vortici)', funzioni: '—', stato: 'non simulato', misura: 'calcolato sul reticolo e visto come densità d\'azione (Leinweber 2000, hep-lat/0004025 [V]); non osservabile direttamente' },
]);
