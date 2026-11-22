// eredita.js — la base comune per passare da un padre ai figli, da una scala a quella sotto, senza giunture e senza
// semi aritmetici. Tre attrezzi, uno per ognuna delle regole comuni del rapporto «Generatore multiscala più emergente e
// fluido» (sezione «Cinque regole ricorrono in tutti i nove livelli»):
//
// 1. L'OTTAVA CONDIZIONATA DAL PADRE (regola «il figlio è il padre più una correzione a media nulla»).
//      import { ottava, discendi, scartoOttava, varianzaSotto } from './eredita.js';
//      const f = ottava({ padre: (I, J) => quota(I, J), livello: 7, I0, J0, nI: 16, nJ: 16,
//                         radice: 'cosmo 1/galassia 3/stella 53/pianeta 0', nome: 'rilievo', sigma: 120 });
//    · padre(I, J[, K]) è il campo del padre nelle coordinate ASSOLUTE delle sue celle al livello «livello» (serve
//      anche un anello di DUE celle attorno al blocco: la predizione guarda i vicini).
//    · Il risultato (Float64Array, x più veloce: f[(y·2nI) + x], e in 3D f[((z·2nJ) + y)·2nI + x]) sono i 2^d figli di
//      ogni cella padre del blocco [I0, I0+nI) × [J0, J0+nJ) (× [K0, K0+nK) in 3D): il figlio (2I+a, 2J+b) del
//      livello «livello + 1».
//    · figlio = padre + correzione, e la correzione ha media NULLA ESATTA su ogni cella padre (entro l'arrotondamento,
//      ~10⁻¹⁶ del campo). È additiva, quindi una piana a zero resta a zero in media (il precedente negativo di
//      geologia.js:650-655 era moltiplicativo). Ha due parti: (a) la predizione «average-interpolating» di quarto grado
//      di Donoho (liscia, conserva le medie, rende esatti i campi costanti e lineari); (b) il rumore a ondine di Cook e
//      DeRose (2005) in forma esatta: R − Pred(Media(R)), dove R è un reticolo di campane sui figli passato per il
//      nucleo [1, 4, 1]/6, Media è la media di blocco e Pred la stessa predizione. La media di blocco della banda è zero per costruzione, e quasi tutta la
//      sua energia sta nell'ottava del figlio (sotto la frequenza del padre cresce come k²).
//    · Il rumore è in COORDINATE GLOBALI: il nodo (i, j, k) del livello L è l'evento «radice/nome/ottava L», con
//      contatore (i, ramo, j, k) (eventi.js, reticolo). Due tessere vicine leggono gli stessi numeri: stessi bit sul
//      bordo, nessuna giuntura (prova: una tessera grande e due mezze danno gli stessi bit).
//    · sigma è lo scarto quadratico della correzione di rumore a quel livello: lo sceglie il chiamante dalla fisica del
//      padre. Può essere un numero o una funzione sigma(I, J, K, padre) della cella padre (la rugosità dove c'è
//      roccia, la turbolenza dove c'è gas): moltiplica tutta la banda di una cella, quindi la media resta nulla.
//      Per uno spettro a legge di potenza: sigma = scartoOttava(ampiezza, hurst, latoFiglio) = ampiezza·lato^H,
//      e lo spettro 2D che ne esce è P(k) ∝ k^−(2H+d) (prova: la pendenza misurata). Niente ampiezza fissa qui dentro.
//    · discendi({ base, livello0, livello, I0, J0, nI, nJ, radice, nome, sigma | {ampiezza, hurst, lato0} }) fa
//      le ottave una dopo l'altra da un campo base(I, J) al livello0 fino al blocco chiesto al «livello», con i margini
//      giusti. varianzaSotto(ampiezza, hurst, lato) è la varianza di tutte le ottave non ancora generate sotto una cella
//      (la terza regola: «ciò che sta sotto il pixel si somma in forma chiusa»).
//    · d = 1, 2 o 3: basta dare nJ (2D) e nK (3D); in 1D padre(I).
//
// 2. LE SERIE CASUALI CON NOME (regola «ogni canale ha il proprio flusso»).
//      import { serie } from './eredita.js';
//      const u = serie('cosmo 1/galassia 3', 'fondo di stelle');  u(0), u(1), … numeri in [0, 1)
//    È Threefry-4x32 di eventi.js: la serie «nome» del luogo «indirizzo». Ogni fenomeno ha la sua serie per nome, e
//    aggiungerne una non sposta le altre (le chiavi sono derivate per nome, non per posizione nell'ordine dei tiri).
//    Al posto di «seme + 31·L» si scrive serie(indirizzo, `nome/livello ${L}`).
//
// 3. IL PASSAGGIO SOPRA O SOTTO IL PIXEL (regola «discreto sopra una soglia legata al pixel, continuo sotto»).
//      import { separa, pesoDiscreto } from './eredita.js';
//      const { singoli, sotto, discreto, continuo, totale } =
//        separa(stelle, { grandezza: (s) => s.raggioAngolare, valore: (s) => s.luce, pixel: radPerPixel });
//    Ogni oggetto ha un peso liscio w = pesoDiscreto(grandezza/soglia) (rampa su un'ottava, in log₂, centrata sulla
//    soglia = k·pixel, k = 1 se non detto, oppure «soglia» data direttamente, per esempio L_cut in luce): w·valore va
//    disegnato come oggetto, (1 − w)·valore va sommato nel continuo dove l'oggetto sta. La somma è sempre 1, quindi
//    discreto + continuo = totale per ogni oggetto, e nessuna dissolvenza a tempo serve: lo zoom sposta solo i pesi.
//    «singoli» sono gli oggetti con w > 0 ({ oggetto, indice, peso }), «sotto» quelli con w < 1 ({ …, peso: 1 − w }).
//
// Parametri liberi: nessuno di fisica. I pesi della predizione sono quelli dello schema di quarto grado di Donoho (1993),
// il nucleo del rumore è la B-spline cubica ai nodi;
// la larghezza della rampa (un'ottava) è la scelta di Sagristà e altri (Gaia Sky, 2019) di una rampa lineare.
import { sorgente, reticolo } from './eventi.js';

// ---------- 2. le serie con nome
export const serie = (indirizzo, nome, rami = null) => sorgente(String(indirizzo), rami).serie(String(nome));

// ---------- 1. l'ottava condizionata dal padre
// la predizione a media conservata di Donoho (1993), di quarto grado: il figlio a (0 o 1) della cella m guarda le celle
// da m−2 a m+2 con pesi W[a]; somma 1 per ogni figlio, media sui due figli [0, 0, 1, 0, 0]; esatta per i polinomi fino
// al quarto grado nelle medie. (Quella di secondo grado, tre celle, lascia sui bordi delle celle padre salti più grandi
// che dentro: 1,4–2,1 volte, misurato sui bordi di 2–16 celle con H 0,3–0,8; questa 1,1–1,3 con il nucleo sotto.)
const W = [[-3 / 128, 22 / 128, 1, -22 / 128, 3 / 128], [3 / 128, -22 / 128, 1, 22 / 128, -3 / 128]], A = 2;
// il reticolo di campane passa per il nucleo [1, 4, 1]/6 (la B-spline cubica ai nodi) in ogni direzione, come le
// B-spline con cui Cook e DeRose valutano la banda: toglie la granulosità al pixel del figlio e, con la predizione,
// avvicina i salti sui bordi delle celle padre a quelli dentro (rapporto 1,1 contro 1,24 senza, misurato in
// test_eredita C). Il nucleo [1, 2, 1]/4, più largo, va sotto 1 e piega lo spettro dell'ultima ottava.
const F = [1 / 6, 4 / 6, 1 / 6];
// la varianza della banda N = F·R − Pred(Media(F·R)) per R campane indipendenti: tutto è a prodotto tensore, quindi
// N = (⊗f)·R − (⊗u)·R con f il nucleo e u = W·Media·f in una dimensione, e Var N = (Σf²)^d − 2(Σf·u)^d + (Σu²)^d
const varianzaBanda = (() => {
  const n = 32, o = 16, f = new Float64Array(n), u = new Float64Array(n); // posizioni dei nodi del reticolo, il figlio 0 della cella 0 in o
  for (let e = -1; e <= 1; e++) f[o + e] = F[e + 1];
  for (let m = -A; m <= A; m++) for (const x of [2 * m, 2 * m + 1]) for (let e = -1; e <= 1; e++) u[o + x + e] += W[0][m + A] * 0.5 * F[e + 1];
  let ff = 0, fu = 0, uu = 0; for (let i = 0; i < n; i++) { ff += f[i] * f[i]; fu += f[i] * u[i]; uu += u[i] * u[i]; }
  return (d) => ff ** d - 2 * fu ** d + uu ** d;
})();

export const scartoOttava = (ampiezza, hurst, lato) => ampiezza * Math.pow(lato, hurst);
// la varianza di tutte le ottave sotto una cella di lato «lato» (figli di lato/2, lato/4, …): Σ σ² 2^(−2Hm), m ≥ 1
export const varianzaSotto = (ampiezza, hurst, lato) => { const s = scartoOttava(ampiezza, hurst, lato), q = 2 ** (-2 * hurst); return s * s * q / (1 - q); };

// (periodoI: il campo si richiude in I con quel periodo, in celle del padre: la longitudine di un pianeta. Il rumore dei figli
// si prende allora all'indice ridotto modulo 2·periodoI, così le due parti della cucitura vedono le stesse campane; dentro il
// periodo nulla cambia, al bit.)
export function ottava({ padre, livello, I0 = 0, J0 = 0, K0 = 0, nI, nJ = 0, nK = 0, radice, nome, sigma = 0, ramo = 0, periodoI = 0 }) {
  const d = nK > 0 ? 3 : nJ > 0 ? 2 : 1;
  const nj = d >= 2 ? nJ : 1, nk = d === 3 ? nK : 1, dj = d >= 2 ? 1 : 0, dk = d === 3 ? 1 : 0;
  const P = d === 1 ? (I) => padre(I) : d === 2 ? (I, J) => padre(I, J) : padre;
  // il padre sul blocco con un anello di A celle
  const aj = A * dj, ak = A * dk, pi = nI + 2 * A, pj = nj + 2 * aj, pk = nk + 2 * ak, p = new Float64Array(pi * pj * pk);
  for (let z = 0; z < pk; z++) for (let y = 0; y < pj; y++) for (let x = 0; x < pi; x++) p[(z * pj + y) * pi + x] = P(I0 - A + x, J0 - aj + y, K0 - ak + z);
  // il rumore: le campane sui figli del blocco e del suo anello, la loro media per cella padre
  const ci = 2 * pi, cj = dj ? 2 * pj : 1, ck = dk ? 2 * pk : 1, R = new Float64Array(ci * cj * ck), M = new Float64Array(pi * pj * pk);
  const usaRumore = typeof sigma === 'function' || sigma !== 0;
  if (usaRumore) {
    const g0 = reticolo(`${radice}/${nome}/ottava ${livello + 1}`, ramo), i0 = 2 * (I0 - A), j0 = 2 * (J0 - aj), k0 = 2 * (K0 - ak), Pf = 2 * periodoI;
    const g = Pf > 0 ? (i, j, k) => g0(((i % Pf) + Pf) % Pf, j, k) : g0;
    for (let z = 0; z < ck; z++) for (let y = 0; y < cj; y++) for (let x = 0; x < ci; x++) {
      let v = 0; for (let ez = -dk; ez <= dk; ez++) for (let ey = -dj; ey <= dj; ey++) for (let ex = -1; ex <= 1; ex++) v += F[ex + 1] * (dj ? F[ey + 1] : 1) * (dk ? F[ez + 1] : 1) * g(i0 + x + ex, dj ? j0 + y + ey : 0, dk ? k0 + z + ez : 0);
      R[(z * cj + y) * ci + x] = v;
      M[((z >> dk) * pj + (y >> dj)) * pi + (x >> 1)] += v;
    }
    const f = 1 / 2 ** d; for (let n = 0; n < M.length; n++) M[n] *= f;
  }
  const norma = 1 / Math.sqrt(varianzaBanda(d));
  const oi = 2 * nI, oj = dj ? 2 * nj : 1, ok = dk ? 2 * nk : 1, out = new Float64Array(oi * oj * ok);
  const mx = []; for (let m = -A; m <= A; m++) mx.push(m); const mz = dk ? mx : [0], my = dj ? mx : [0];
  for (let Z = 0; Z < nk; Z++) for (let Y = 0; Y < nj; Y++) for (let X = 0; X < nI; X++) {
    const qx = X + A, qy = Y + aj, qz = Z + ak, q = (qz * pj + qy) * pi + qx, p0 = p[q], m0 = M[q];
    const s = usaRumore ? (typeof sigma === 'function' ? sigma(I0 + X, J0 + Y, K0 + Z, p0) : sigma) * norma : 0;
    for (let c = 0; c <= dk; c++) for (let b = 0; b <= dj; b++) for (let a = 0; a <= 1; a++) {
      // predizione del padre e della media del rumore, scritta come scarti dal centro: un campo costante resta esatto
      let pred = 0, predM = 0;
      for (const mzv of mz) { const wz = dk ? W[c][mzv + A] : 1; for (const myv of my) { const wy = dj ? W[b][myv + A] : 1; for (const mxv of mx) {
        if (mxv === 0 && myv === 0 && mzv === 0) continue;
        const w = wz * wy * W[a][mxv + A], r = q + (mzv * pj + myv) * pi + mxv; pred += w * (p[r] - p0); predM += w * (M[r] - m0);
      } } }
      let v = p0 + pred;
      if (s !== 0) { const xr = 2 * qx + a, yr = dj ? 2 * qy + b : 0, zr = dk ? 2 * qz + c : 0; v += s * (R[(zr * cj + yr) * ci + xr] - m0 - predM); }
      out[((2 * Z + c) * oj + 2 * Y + b) * oi + 2 * X + a] = v;
    }
  }
  return out;
}

// le ottave una dopo l'altra, da base(I, J[, K]) al livello0 fino al blocco chiesto al «livello»
// (giroI: il periodo in I al livello0, in celle; a ogni livello sotto raddoppia: vedi ottava, periodoI)
export function discendi({ base, livello0, livello, I0 = 0, J0 = 0, K0 = 0, nI, nJ = 0, nK = 0, radice, nome, sigma, ampiezza, hurst, lato0 = 1, ramo = 0, giroI = 0 }) {
  const d = nK > 0 ? 3 : nJ > 0 ? 2 : 1, dj = d >= 2 ? 1 : 0, dk = d === 3 ? 1 : 0;
  const sig = sigma !== undefined ? sigma : (L) => scartoOttava(ampiezza, hurst, lato0 * 2 ** (livello0 - L));
  const blocco = (L, i0, j0, k0, ni, nj, nk) => {
    const out = new Float64Array(ni * nj * nk);
    if (L === livello0) { for (let z = 0; z < nk; z++) for (let y = 0; y < nj; y++) for (let x = 0; x < ni; x++) out[(z * nj + y) * ni + x] = base(i0 + x, j0 + y, k0 + z); return out; }
    // i padri che servono: quelli dei figli chiesti, più un anello di A celle
    const a0 = Math.floor(i0 / 2), a1 = Math.floor((i0 + ni - 1) / 2), b0 = dj ? Math.floor(j0 / 2) : 0, b1 = dj ? Math.floor((j0 + nj - 1) / 2) : 0, c0 = dk ? Math.floor(k0 / 2) : 0, c1 = dk ? Math.floor((k0 + nk - 1) / 2) : 0;
    const pi = a1 - a0 + 1 + 2 * A, pj = dj ? b1 - b0 + 1 + 2 * A : 1, pk = dk ? c1 - c0 + 1 + 2 * A : 1, p = blocco(L - 1, a0 - A, b0 - A * dj, c0 - A * dk, pi, pj, pk);
    const s = typeof sig === 'function' ? sig(L) : sig;
    const f = ottava({ padre: (I, J = 0, K = 0) => p[((K - c0 + A * dk) * pj + (J - b0 + A * dj)) * pi + (I - a0 + A)], livello: L - 1, I0: a0, J0: b0, K0: c0,
      nI: a1 - a0 + 1, nJ: dj ? b1 - b0 + 1 : 0, nK: dk ? c1 - c0 + 1 : 0, radice, nome, sigma: s, ramo, periodoI: giroI * 2 ** (L - 1 - livello0) });
    const fi = 2 * (a1 - a0 + 1), fj = dj ? 2 * (b1 - b0 + 1) : 1, ox = i0 - 2 * a0, oy = dj ? j0 - 2 * b0 : 0, oz = dk ? k0 - 2 * c0 : 0;
    for (let z = 0; z < nk; z++) for (let y = 0; y < nj; y++) for (let x = 0; x < ni; x++) out[(z * nj + y) * ni + x] = f[((z + oz) * fj + y + oy) * fi + x + ox];
    return out;
  };
  return blocco(livello, I0, dj ? J0 : 0, dk ? K0 : 0, nI, dj ? nJ : 1, dk ? nK : 1);
}

// ---------- 3. sopra o sotto il pixel
// il peso del discreto: rampa liscia (smoothstep) in log₂(grandezza/soglia), larga «larghezza» ottave, 1/2 sulla soglia
export function pesoDiscreto(rapporto, larghezza = 1) {
  if (!(rapporto > 0)) return 0;
  const t = Math.log2(rapporto) / larghezza + 0.5; if (t <= 0) return 0; if (t >= 1) return 1;
  return t * t * (3 - 2 * t);
}
export function separa(oggetti, { grandezza, valore = () => 1, pixel = 1, k = 1, soglia = null, larghezza = 1 } = {}) {
  const S = soglia !== null ? soglia : k * pixel, singoli = [], sotto = []; let discreto = 0, continuo = 0, totale = 0;
  oggetti.forEach((o, indice) => {
    const v = valore(o), w = pesoDiscreto(grandezza(o) / S, larghezza);
    totale += v; discreto += w * v; continuo += v - w * v; // (1 − w)·v scritto come v − w·v: la somma torna al bit
    if (w > 0) singoli.push({ oggetto: o, indice, peso: w });
    if (w < 1) sotto.push({ oggetto: o, indice, peso: 1 - w });
  });
  return { singoli, sotto, discreto, continuo, totale, soglia: S };
}
