// cosmo3d.js — il cosmo in tre dimensioni e nel tempo: il campo di densità con lo spettro vero, le galassie dentro,
// i loro moti, l'espansione.
//
// cosmo.js dà il cosmo visto dall'alto: un toro a due dimensioni, con le galassie sui picchi di un campo fatto di poche
// onde lunghe (troppo forti: le velocità che ne venivano erano di mille km/s). Quel disegno resta la carta d'identità
// delle galassie (dove stanno in x e y, quanto è alto il loro picco: da lì il loro alone e tutta la loro storia, che
// NON cambiano). Qui il cosmo diventa quello che la carta proietta:
//   · UN TORO A TRE DIMENSIONI, lato TORO_M: alle due coordinate di ogni galassia si aggiunge la profondità z (un
//     evento, uniforme: l'universo non ha un piano preferito);
//   · IL CAMPO è gaussiano, con lo SPETTRO DI POTENZA VERO della materia (quello di galassie.js: forma BBKS con il
//     parametro di Sugiyama, normalizzato a σ₈ di leggi.js), ed è il CAMPO SENZA BORDO di campo_pigro.js: rumore con
//     indirizzo livello per livello («radice/campo/livello j/cella x,y,z»), calcolato solo dove si guarda. Il toro non è
//     più periodico: è la regione in cui stanno le galassie segnate, dentro uno spazio che continua (piatto; una
//     topologia chiusa, se c'è, starebbe molto oltre l'orizzonte e non si vede). Non è un campo qualunque: è una
//     REALIZZAZIONE VINCOLATA (Hoffman & Ribak 1991, fatta sulle celle: campo_pigro.js vincola), cioè il campo casuale
//     più la correzione minima che fa valere al campo lisciato, nel punto di ogni galassia, l'altezza del suo picco;
//   · I MOTI vengono dalla teoria lineare: la materia cade verso dove ce n'è di più, v_k = i·H·f·δ_k·k/k², con
//     f = dlnD/dlna (≈ Ωm^0,55) dalla crescita di galassie.js. Con lo spettro vero le velocità sono quelle vere;
//   · L'ESPANSIONE: le coordinate sul toro sono comoventi; la distanza vera è quella per il fattore di scala a(t) della
//     cosmologia di leggi.js. Nel tempo ogni punto si sposta dalla sua posizione iniziale di D(t)·Ψ (approssimazione
//     di Zel'dovich: lo spostamento cresce come le fluttuazioni), con Ψ = v/(H·f) di oggi;
//   · L'ASSE DI OGNI GALASSIA viene dalla teoria delle coppie mareali in tre dimensioni: L_i ∝ ε_ijk·T_jl·I_lk, con T
//     il tensore di marea del campo in quel punto e I l'inerzia del proto-alone, la cui forma è quella del picco (gli
//     assi lunghi dove la densità filtrata cala più piano: l'inverso dell'hessiano).
// LA NEBBIA (regola 9): le galassie segnate sono un CAMPIONE. Nel volume del toro gli aloni pesanti almeno quanto il
// più piccolo dei loro sono milioni (li conta la funzione di massa di Press & Schechter 1974 con lo stesso σ(M)):
// `peso` dice quante galassie vere rappresenta ognuna.
//
// IL VINCOLO DELLE GALASSIE: galassie.js legge l'altezza del picco (G.peso) in scarti del campo filtrato alle onde lunghe
// (taglio netto a `onde` = 9 giri per lato: σ_onde = SIGMA_CAMPO). Su un campo senza bordo il taglio netto non è locale;
// il vincolo è allora sul campo lisciato con la GAUSSIANA che ha lo stesso scarto (σ(R_eq) = σ_onde: R_eq ricavato qui
// dallo spettro, 21 Mpc): l'altezza in scarti e il valore peso·σ_onde restano IDENTICI, e con loro la massa degli
// aloni e tutto ciò che sta sotto. Cambia ciò che il campo dice attorno: velocità e assi (misurato in test_spazio3d).
// LA RISOLUZIONE: i livelli fino a celle di L/64 (18,7 Mpc): onde da 75 Mpc in su per intero, sfumate fino a 37.
// COSTI (misurati): il campo vincolato alle galassie ~0,5–1 s; la griglia 64³ (a richiesta: convoluzione per regione
// con la trasformata, campo_pigro.js grigliaFFT) ~4 s; un punto ~2–6 ms; velocità e assi delle galassie ~0,5 s.
// CHE COSA NON C'È: le galassie non sono obbligate a stare su un massimo esatto del campo; i moti sono lineari (niente
// orbite negli ammassi); la carta piatta di cosmo.js (la rete disegnata sulla mappa) non è la proiezione di questo
// campo; le posizioni della carta sono lette come posizioni di OGGI (aloniIn di ragnatela.js legge invece la materia
// spostata con Ψ: le due letture differiscono di |Ψ| ≈ 13 Mpc).

import { COSMO, MPC } from './leggi.js';
import { sorgente, campana } from './eventi.js';
import { COSMOLOGIA as U, SIGMA_CAMPO } from './galassie.js';
import { campoPigro } from './campo_pigro.js';

const PI2 = 2 * Math.PI;
// la trasformata di Fourier (potenze di 2), sul posto, lungo una riga di passo `s` che parte da `o`
function fft(re, im, n, o, s, inversa) {
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { const a = o + i * s, c = o + j * s; let t = re[a]; re[a] = re[c]; re[c] = t; t = im[a]; im[a] = im[c]; im[c] = t; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inversa ? 1 : -1) * PI2) / len, wr = Math.cos(ang), wi = Math.sin(ang), h = len >> 1;
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < h; k++) { const a = o + (i + k) * s, b = a + h * s, xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr; re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } }
  }
}
// (ondeDelToro e ampiezzeLibere NON sono più la fonte del cosmo: restano per i campi di onde su un toro che si chiedono
// apposta, come seconda via per le prove della teoria: bolle.js campoLibero con kmax, ragnatela.js.)
// LE ONDE DEL TORO: mezzo spazio (le altre sono le coniugate), |k| ≤ kmax giri per lato, ognuna con la sua potenza
// vera ⟨|δ_k|²⟩ = Δ²(k)/(4π·k³). La lista è la stessa per chiunque faccia un campo su questo toro (bolle.js).
export function ondeDelToro(toroM, kmax) {
  const L = toroM / MPC, kx = [], ky = [], kz = [], P = [];
  for (let z = 0; z <= kmax; z++) for (let y = -kmax; y <= kmax; y++) for (let x = -kmax; x <= kmax; x++) {
    if (z === 0 && (y < 0 || (y === 0 && x <= 0))) continue; const k2 = x * x + y * y + z * z; if (k2 > kmax * kmax) continue;
    const k = Math.sqrt(k2); kx.push(x); ky.push(y); kz.push(z); P.push(U.potenza((PI2 * k) / L) / (4 * Math.PI * k2 * k)); // k in giri per lato
  }
  return { N: P.length, KX: Int16Array.from(kx), KY: Int16Array.from(ky), KZ: Int16Array.from(kz), PK: Float64Array.from(P) };
}
// IL CAMPO LIBERO DI UN INDIRIZZO: le due ampiezze (parte reale e immaginaria) di ogni onda, a campana, con varianza
// metà della sua potenza. Ogni onda è UN EVENTO con il suo nome, dal suo vettore d'onda: «radice/campo/onda 3,-2,7»
// (quattro estrazioni: due per campana). Così il campo non dipende dall'ordine in cui lo si genera né da quante onde
// si prendono (alzando kmax le onde lunghe restano le stesse: regola 4), è identico al bit su ogni macchina (campana
// di eventi.js: logaritmo e coseno esatti), e un ramo su un'onda cambia quell'onda sola (regola 3).
// O: ciò che dà ondeDelToro. → { A, B }
export function ampiezzeLibere(radice, rami, O) {
  const c = sorgente(`${radice}/campo`, rami), A = new Float64Array(O.N), B = new Float64Array(O.N);
  for (let m = 0; m < O.N; m++) { const s = c.serie(`onda ${O.KX[m]},${O.KY[m]},${O.KZ[m]}`), a = Math.sqrt(O.PK[m] / 2); A[m] = a * campana(s(0), s(1)); B[m] = a * campana(s(2), s(3)); }
  return { A, B };
}
const campi = new WeakMap();
// lo scarto del campo lisciato con una gaussiana di raggio R (Mpc), dallo spettro di galassie.js (tutte le scale)
const sigmaGauss = (R) => { let s = 0; const n = 3000, l0 = Math.log(1e-6), dl = (Math.log(30) - l0) / n; for (let i = 0; i < n; i++) { const k = Math.exp(l0 + (i + 0.5) * dl); s += U.potenza(k) * Math.exp(-k * k * R * R) * dl; } return Math.sqrt(s); };
const raggioEquivalente = (sigma) => { let lo = 1, hi = 1000; for (let i = 0; i < 60; i++) { const m = Math.sqrt(lo * hi); if (sigmaGauss(m) > sigma) lo = m; else hi = m; } return Math.sqrt(lo * hi); };
// IL COSMO IN 3D. C: cosmo(n) di cosmo.js (le galassie con pos [x, y] e peso); radice e rami: l'indirizzo del cosmo
// («cosmo 1») e i suoi rami; toroM: il lato della regione delle galassie. → vedi i campi restituiti in fondo.
export function cosmo3d(C, radice, rami = null, { toroM = 3.7e25, onde = 9, celle = 64, livello = 16 } = {}) {
  let F = campi.get(C); if (F) return F;
  const L = toroM / MPC, P = campoPigro(radice, { rami, lato0: L * 1024 }), J = livello; // celle del livello j: L·2^(10−j)
  // ---- le galassie: x, y dalla carta; z un evento di ognuna
  const G = C.galassie, ng = G.length, pos = G.map((g) => [g.pos[0], g.pos[1], sorgente(`${radice}/galassia ${g.id}`, rami)('profondità')]);
  // ---- il vincolo: il campo lisciato a R_eq vale peso·σ_onde nel punto di ogni galassia
  const sigmaOnde = SIGMA_CAMPO(toroM, onde), Req = raggioEquivalente(sigmaOnde) * MPC, valori = Float64Array.from(G, (g) => (g.peso ?? 0) * sigmaOnde);
  const vincoliGalassie = pos.map((x, i) => ({ nome: `galassia ${i}`, posizione: x.map((v) => v * toroM), scala: Req, valore: valori[i] }));
  const K = P.vincola(vincoliGalassie, { fissi: ng }); if (!K.esiste) throw new Error(`cosmo3d: le galassie di ${radice} non stanno in un campo solo (${K.perche})`);
  // ---- le grandezze in un punto (coordinate in unità del lato, 0…1 dentro la regione; fuori lo spazio continua)
  const f0 = Math.log(U.D(1.01) / U.D(0.99)) / Math.log(1.01 / 0.99), m = (x) => [x[0] * toroM, x[1] * toroM, x[2] * toroM];
  const densita = (x) => K.delta(m(x), { livello: J }), densitaLunga = (x) => K.delta(m(x), { scala: Req }), velocita = (x) => K.in(m(x), { livello: J }).velocita;
  // il tensore di marea (∂²φ/∂x∂x, ∇²φ = δ: la sua traccia è δ) e l'hessiano del campo lisciato a R_eq (in 1/Mpc²): è la
  // marea del campo con filtro −k²·e^(−k²R²/2), perché ∂i∂j(∇⁻²∇²δ_R) = ∂i∂jδ_R
  const filtroH = { chiave: `hess${Req}`, F: (k) => -k * k * Math.exp(-0.5 * k * k * (Req / MPC) ** 2), kTop: (6 * MPC) / Req };
  const marea = (x) => ({ T: K.in(m(x), { livello: J }).marea, H: K.in(m(x), { filtro: filtroH }).marea });
  // ---- ciò che costa, a richiesta
  let grigliaFatta = null, moti = null, assi = null;
  const griglia = () => {
    if (grigliaFatta) return grigliaFatta;
    const n = celle, lv = 10 + Math.round(Math.log2(n)); if (2 ** (lv - 10) !== n) throw new Error('cosmo3d: le celle della griglia sono una potenza di 2');
    const g = K.grigliaFFT([0, 0, 0], lv, n, { livello: Math.min(J, lv) }); let v = 0; const d = new Float32Array(n * n * n); for (let i = 0; i < d.length; i++) { d[i] = g.delta[i]; v += g.delta[i] ** 2; }
    return (grigliaFatta = { n, delta: d, sigma: Math.sqrt(v / d.length), latoCellaM: toroM / n }); // delta[z·n² + y·n + x]: la sovradensità lineare di oggi nel punto (x/n, y/n, z/n) della regione
  };
  const motiGalassie = () => moti || (moti = pos.map((x) => velocita(x)));
  const assiGalassie = () => assi || (assi = pos.map((x, i) => {
    const { T, H } = marea(x), sim = (S) => [[S[0], S[3], S[4]], [S[3], S[1], S[5]], [S[4], S[5], S[2]]], Tm = sim(T), Hm = sim(H.map((v) => -v));
    // l'inerzia del proto-alone ∝ l'inverso dell'hessiano (cambiato di segno): gli assi lunghi dove il picco è più piatto
    const d = Hm[0][0] * (Hm[1][1] * Hm[2][2] - Hm[1][2] ** 2) - Hm[0][1] * (Hm[0][1] * Hm[2][2] - Hm[1][2] * Hm[0][2]) + Hm[0][2] * (Hm[0][1] * Hm[1][2] - Hm[1][1] * Hm[0][2]);
    const I = [[Hm[1][1] * Hm[2][2] - Hm[1][2] ** 2, Hm[0][2] * Hm[1][2] - Hm[0][1] * Hm[2][2], Hm[0][1] * Hm[1][2] - Hm[0][2] * Hm[1][1]], [0, Hm[0][0] * Hm[2][2] - Hm[0][2] ** 2, Hm[0][1] * Hm[0][2] - Hm[0][0] * Hm[1][2]], [0, 0, Hm[0][0] * Hm[1][1] - Hm[0][1] ** 2]]; I[1][0] = I[0][1]; I[2][0] = I[0][2]; I[2][1] = I[1][2];
    const TI = [0, 1, 2].map((a) => [0, 1, 2].map((b) => (Tm[a][0] * I[0][b] + Tm[a][1] * I[1][b] + Tm[a][2] * I[2][b]) / (d || 1)));
    // L_i = ε_ijk·(T·I)_jk: la parte antisimmetrica del prodotto (nulla se marea e forma sono allineate)
    let J = [TI[1][2] - TI[2][1], TI[2][0] - TI[0][2], TI[0][1] - TI[1][0]]; const n = Math.hypot(...J);
    if (!(n > 1e-12)) { const cg = sorgente(`${radice}/galassia ${G[i].id}`, rami), z = 2 * cg('asse/z') - 1, fi = PI2 * cg('asse/fi'), r = Math.sqrt(1 - z * z); J = [r * Math.cos(fi), r * Math.sin(fi), z]; return { asse: J, coppia: 0, picco: d > 0 }; }
    return { asse: J.map((v) => v / n), coppia: n, picco: Hm[0][0] > 0 && d > 0 };
  }));
  // quante galassie vere rappresenta ognuna di quelle segnate: gli aloni del toro pesanti almeno quanto il più piccolo dei loro
  const mMin = Math.min(...G.map((g) => g.forma?.alone?.massa ?? Infinity)), vere = isFinite(mMin) ? U.aloni(mMin) * L ** 3 : NaN;
  // ---- nel tempo (t in Ga dall'inizio; oggi U.tempo(1)): il fattore di scala, la crescita, dove sta e come va ogni galassia
  const crescita = (a) => ({ a, D: U.D(a), f: Math.log(U.D(a * 1.01) / U.D(a * 0.99)) / Math.log(1.01 / 0.99), H: COSMO.H0 * U.E(a) });
  const alTempo = (tGa) => {
    const a = U.scala(Math.max(tGa, 1e-4)), g = crescita(a), V = motiGalassie(), k = (a * g.H * g.f * g.D) / (COSMO.H0 * f0); // quanto vale la velocità peculiare rispetto a oggi
    const comoventi = pos.map((x, i) => [0, 1, 2].map((d) => x[d] - ((1 - g.D) * V[i][d]) / (COSMO.H0 * f0 * L))); // Zel'dovich: x(t) = x₀ − (1 − D)·Ψ, Ψ = v/(H₀·f₀)
    return { a, z: 1 / a - 1, D: g.D, H: g.H, latoM: a * toroM, comoventi, velocita: V.map((v) => v.map((q) => q * k)) };
  };
  F = { toroM, latoMpc: L, onde: null, libere: null, vincoli: { taglio: onde, scala: Req, valori }, vincoliGalassie, sigmaOnde, sigmaLunghe: Math.sqrt(P.varianza({ scala: Req })), pos, densita, densitaLunga, velocita, marea, griglia, motiGalassie, assiGalassie, alTempo, crescita, f0, vere, peso: vere / ng, massaMinima: mMin, oggiGa: U.tempo(1),
    campo: K, libero: P, livello: J, scalaVincoli: Req, pigro: true };
  campi.set(C, F); return F;
}
