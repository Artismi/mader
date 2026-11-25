// ragnatela.js — LA GRANDE SCALA: la ragnatela cosmica, che cosa c'è nel vuoto, il fondo cosmico, l'universo osservabile.
//
// Tutto qui si LEGGE dallo stesso campo di cosmo3d.js (le onde del toro, ognuna un evento con indirizzo): niente campi
// nuovi, niente disegni. Funzioni pure e pigre: ogni risposta è funzione di (cosmo, punto, tempo), si calcola solo dove
// si chiede (regola 8) e si può buttare e rifare identica (regola 1).
//
//   cosmo   un numero di cosmo della biblioteca (3, '3#…'), oppure ciò che danno campoCosmo() di spazio3d.js,
//           campoLibero() / campoCondizionato() di bolle.js, campoVincolato() e raffina() di qui, oppure un indirizzo
//           qualunque (una stringa: il campo libero di quell'indirizzo)
//   punto   [x, y, z] in METRI comoventi di oggi sul toro (come `posizione` di bolle.js); si richiude da solo
//   t       SECONDI DA OGGI (come spazio3d.js: t = 0 oggi, t < 0 il passato)
//
// A. LA RAGNATELA DAL CAMPO (doveSono, direzioneFilamento, classiSuGriglia, frazioni, vuoti, scheletro, raffina)
//    LEGGE [R, e V su Hahn et al. 2007]: il tensore di marea T_ij = ∂i∂j φ, con ∇²φ = δ (la sua traccia è δ: è lo stesso
//    `marea` di cosmo3d.js, qui con le tre grandezze in un giro solo). Nell'approssimazione di Zel'dovich (1970, A&A 5,
//    84) un elemento di materia si contrae lungo l'asse i quando D(t)·λ_i arriva a 1, e la sua densità è
//    ρ/ρ̄ = 1/|(1−Dλ₁)(1−Dλ₂)(1−Dλ₃)|: quindi prima o poi crolla lungo OGNI asse con λ_i > 0 e mai lungo gli altri. Il
//    numero di autovalori positivi dice che cosa diventerà quel punto: 0 VUOTO, 1 FOGLIO (crolla lungo un asse), 2
//    FILAMENTO (resta lungo l'asse che non crolla: la sua DIREZIONE è l'autovettore dell'autovalore più piccolo), 3
//    NODO. È la classificazione di Hahn, Porciani, Carollo & Dekel 2007 (MNRAS 375, 489).
//    LA SOGLIA è ZERO: è l'unica che viene dalla teoria (il segno non cambia con D(t): la classe di un punto è la
//    stessa a ogni tempo). Soglie più alte (λ_th tra 0,2 e 0,4: Forero-Romero et al. 2009, MNRAS 396, 1815 [V
//    sull'estratto]) fanno vuoti più grandi «come li vede l'occhio» ma sono di comodo: si possono chiedere (`soglia`),
//    non sono il valore di partenza. LA LISCIATURA: nessuna oltre le onde che ci sono (taglio netto a kmax giri per
//    lato: lunghezze d'onda ≥ L/kmax ≈ 50 Mpc); `scala` (m) aggiunge una finestra gaussiana e^(−k²R²/2).
//    RISCONTRO ESATTO [V: Hahn et al. 2007 §3.3, che cita Doroshkevich 1970]: per un campo gaussiano le quattro classi
//    occupano l'8%, il 42%, il 42% e l'8% dei punti, qualunque sia lo spettro. Lette alla Zel'dovich quelle sono
//    frazioni di MASSA (i punti sono elementi di materia); le frazioni di VOLUME di oggi si hanno pesando ogni
//    elemento con il suo volume |Π(1−λ_i)| (i vuoti si gonfiano, i nodi si stringono).
//    LO SCHELETRO (a richiesta, in una regione): i punti di classe filamento (o nodo) dove la densità è massima nel
//    piano perpendicolare alla direzione del filamento (una cresta), uniti al vicino più allineato. È una regola
//    dichiarata, alla risoluzione della griglia chiesta (non c'è raffinamento sotto la cella).
//    LA RISOLUZIONE e COME SCENDERE SOTTO (regola 4): il cosmo è il campo senza bordo, con celle fino a L/64 (18,7 Mpc: onde
//    da 75 Mpc in su per intero, sfumate fino a 37); `dettaglio` (in doveSono, classiSuGriglia, vuoti, scheletro,
//    contenutoCosmico, scenaRagnatela) aggiunge i livelli più fini, eventi «…/campo/livello j/cella x,y,z», lasciando
//    identici quelli di prima: pigro nella scala E nello spazio. Senza `dettaglio` tutto è com'è. raffina() resta per i campi
//    di onde su un toro (lì le onde più corte vanno messe dappertutto).
//    A RISOLUZIONE FINE (misurato sui cosmi 1 e 2): il contrasto medio dei vuoti passa da −0,59 (onde da ~40 Mpc) a −0,73 e
//    −0,83 (12, 6 Mpc), e la loro parte del volume da 19 a 31 e 52%: quello era risoluzione. La massa per classe resta
//    8/42/42/8 a ogni scala (teorema gaussiano): quello è il campo lineare. Sotto ~10 Mpc buona parte della materia è già
//    crollata (38% a 6 Mpc) e lo spostamento lineare non basta: servirebbe dinamica non lineare vera, non un raccordo.
//    GLI ALONI UNO PER UNO: aloniIn() (picchi con esclusione sul campo completo, elementi di materia spostati con Ψ).
//
// B. CHE COSA C'È NEL VUOTO (contenutoCosmico, aloniAttesi): barioni, materia oscura, fotoni del fondo, neutrini
//    fossili, luce delle galassie, campo magnetico, e la nebbia degli aloni piccoli (regola 9). Ogni voce ha valore,
//    unità, fonte e marca. Le leggi sono accanto alle funzioni.
//
// C. IL FONDO COSMICO COME IMMAGINE DEL SEME (fondoCosmico): la mappa di temperatura vista da un osservatore viene
//    dalle STESSE onde. La ricombinazione (Peebles 1968), la profondità ottica, l'istante dell'ultima diffusione,
//    l'orizzonte sonoro, lo smorzamento di Silk e le sorgenti [Θ₀+Ψ] e Θ₁ di ogni onda sono CALCOLATI qui dalle
//    equazioni (fluido fotoni-barioni in accoppiamento stretto, materia oscura, neutrini senza massa con la loro
//    gerarchia: Ma & Bertschinger 1995; Hu & Sugiyama 1995; Dodelson 2003 cap. 4–8 [R]), non presi da formule di
//    raccordo. Sul cielo: ΔT/T(n) = Σ_onde [Θ₀+Ψ] + n·(v_oss − v_barioni)/c sulla sfera dell'ultima diffusione
//    (Sachs & Wolfe 1967 a grande scala; picchi acustici; Doppler; dipolo dell'osservatore).
//    LA TOPOLOGIA: i cosmi della biblioteca sono il CAMPO SENZA BORDO di campo_pigro.js (cosmo3d.js): nessuna copia
//    dell'osservatore, nessun cerchio accoppiato, a ℓ basso tutta la potenza (fondoPigro, misurato in test_ragnatela). Un
//    campo di onde su un toro (campoLibero con kmax) si può ancora chiedere, come seconda via della teoria: allora la sfera
//    dell'ultima diffusione (raggio 14 Gpc) attraversa il toro di 1,2 Gpc ~23 volte, con decine di migliaia di coppie di
//    cerchi uguali e senza potenza sotto ℓ ≈ 73: è il toro che le osservazioni escludono (Cornish et al. 2004 [R]).
//
// D. IL VERSO INVERSO (vincoliDelCielo, vincoliDi, campoVincolato): una macchia di cielo, o «qui c'è un filamento / un
//    vuoto», sono vincoli LINEARI sulle onde. Il conto è tutto di campoCondizionato di bolle.js (una fonte), che per
//    ogni vincolo accetta la sua forma (il guadagno dell'onda): qui si scrivono solo le forme (marea, pendenza, cielo
//    con o senza Doppler) e i valori tipici da chiedere.
//
// E. L'UNIVERSO OSSERVABILE (distanze, orizzonti, conoDiLuce): dalla cosmologia di leggi.js / galassie.js (U.E, U.tempo)
//    più la radiazione (che in COSMO non c'è: Ω_r viene da T₀ e dalle costanti).
//
// F. scenaRagnatela: i dati per il motore, nella forma di scenaCosmo.
//
// DATI MISURATI (non scelti guardando il risultato):
//   · T₀ = 2,7255 K (Fixsen 2009, ApJ 707, 916: 2,72548 ± 0,00057 [V sull'estratto]);
//   · τ della reionizzazione = 0,054 ± 0,007 (Planck 2018 VI [V sull'estratto]): da lì z_re è RICAVATO;
//   · N_eff = 3,046 (Mangano et al. 2005 [R]; misurato 2,99 ± 0,17, Planck 2018 [V]); α = 1/137,036 (CODATA [R]);
//     il decadimento a due fotoni 2s→1s: 8,2246 s⁻¹ (Goldman 1989 [R]);
//   · la luce delle galassie: 24 ± 4 (ottico) e 26 ± 5 (infrarosso) nW m⁻² sr⁻¹ (Driver et al. 2016, ApJ 827, 108 [V]);
//   · il campo magnetico tra le galassie: tra 3·10⁻¹⁶ G (Neronov & Vovk 2010 [V]) e ~10⁻⁹ G (Planck 2015 XIX [V]);
//   · il gas dopo la reionizzazione: T ≈ 10⁴ K·(ρ/ρ̄)^0,6 (Hui & Gnedin 1997 [R]) e il ritmo di fotoionizzazione
//     dell'idrogeno Γ(z) (Haardt & Madau 2012 [R], incerto di un fattore ~2).
// PARAMETRI LIBERI: nessuno fisico. Di comodo (dichiarati dove stanno): il numero di celle delle griglie, il coseno
//   minimo (0,5) con cui due punti dello scheletro si uniscono, la gerarchia dei neutrini troncata a ℓ = 8.
// CHE COSA NON TORNA / NON C'È (le prove lo stampano):
//   · il campo è LINEARE, con onde ≥ 50 Mpc: i vuoti e i filamenti sono quelli grandi; il contrasto nei vuoti è più
//     debole del vero, le frazioni di volume stanno tra quelle gaussiane e quelle delle simulazioni; dove Dλ₁ > 1 la
//     materia è già crollata e la densità di Zel'dovich non vale (lo si dice: `crollato`);
//   · il fondo: manca l'effetto Sachs–Wolfe integrato (primo e tardo), la lente, la polarizzazione; l'ultima
//     diffusione è un istante (τ = 1; il suo spessore entra solo nello smorzamento); l'elio è contato solo nei barioni;
//     l'opacità della reionizzazione e^(−τ) è applicata a tutte le scale (sotto ℓ ~ 10 non dovrebbe). Ne segue (misurato):
//     il primo picco esce a ℓ ≈ 240 invece di 220 e alto 3700 µK² invece di 5750; il secondo e il terzo tornano;
//   · lo spettro del campo (BBKS in galassie.js, normalizzato a σ₈) sottintende un seme primordiale A_s = 1,85·10⁻⁹,
//     il 12% sotto quello misurato (2,10·10⁻⁹): il cielo esce più debole del 6% in ampiezza anche per questo;
//   · «qui c'è un filamento»: il tensore di marea e la pendenza sono vincolati, la curvatura della densità no: lo
//     scheletro del campo vincolato passa esattamente per il punto detto in 2 casi su 3;
//   · il cielo dei cosmi arriva per intero a ℓ ≈ 20 con ellMax 30 (di più costa: ~1 ms a direzione per ellMax 30); i picchi
//     acustici si misurano sullo spettro atteso (spettroAtteso), non ancora sulla mappa del cosmo;
//   · tempi e distanze oltre z ~ 100 usano Ω_r, che U.tempo di galassie.js non ha (differenza stampata nella prova).
// COSTI (misurati in test/test_ragnatela.mjs, che li stampa): un punto (doveSono) ~1,5 ms; la griglia 48³ di tutto il
//   toro con le classi ~0,2 s (la somma diretta ne chiederebbe 40); lo scheletro di una regione 32³ ~0,1–0,2 s; raffina
//   fino a 25 Mpc ~0,25 s; la ricombinazione 25 ms e le tabelle del fondo 0,4 s (una volta); una direzione di cielo
//   ~1,3 ms; 49 vincoli di cielo ~0,25 s; un filamento detto (8 vincoli) ~50 ms; la scena di una regione ~70 ms.

import { COSTANTI, COSMO, ANNO, MSOLE, PC, KPC, MPC, DELTA_C } from './leggi.js';
import { sorgente, campana } from './eventi.js';
import { COSMOLOGIA as U, LEGGI as LEGGI_GALASSIE } from './galassie.js';
import { ondeDelToro, ampiezzeLibere } from './cosmo3d.js';
import { campoCondizionato, campoLibero, LIVELLO_COSMO } from './bolle.js';
import { campoCosmo } from './spazio3d.js';
import { cosmoBase, ramiCosmo, cosmo as cosmoDi, TORO_M } from './cosmo.js';
import { DATI as DATI_STELLE } from './stelle.js';
import { campoPigro, FILTRI, cieloPigro, fft3 } from './campo_pigro.js';

const PI2 = 2 * Math.PI, GA = 1e9 * ANNO, C_LUCE = COSTANTI.c;
export const CLASSI = ['vuoto', 'foglio', 'filamento', 'nodo']; // per numero di autovalori sopra la soglia
// i dati misurati di questo modulo (vedi l'intestazione per le fonti e le marche)
export const DATI = {
  T0: COSMO.Tcmb, // K [V] Fixsen 2009
  tauReionizzazione: 0.054, // [V] Planck 2018 VI
  Neff: COSMO.Neff, // [R] Mangano et al. 2005
  alfa: 7.2973525693e-3, // [R] CODATA 2018
  duePhotoni: 8.2246, // s⁻¹ [R] Goldman 1989
  zeta3: 1.2020569031595942, // ζ(3) (matematica)
  luceGalassie: { ottico: 24e-9, infrarosso: 26e-9 }, // W m⁻² sr⁻¹ [V] Driver et al. 2016
  campoMagnetico: { minimo: 3e-20, massimo: 1e-13 }, // tesla (3·10⁻¹⁶ G [V] Neronov & Vovk 2010; ~1 nG [V] Planck 2015 XIX: 0,9–4,4 nG secondo l'ipotesi)
  gasIonizzato: { T0: 1e4, gamma: 1.6 }, // [R] Hui & Gnedin 1997: T = T0·(ρ/ρ̄)^(γ−1); T0 misurata tra 0,5 e 2·10⁴ K
  gammaHI: [[0, 2.3e-14], [1, 3.4e-13], [2, 9e-13], [3, 8e-13], [4, 5.5e-13], [5, 3.7e-13], [6, 2e-13]], // s⁻¹ [R] Haardt & Madau 2012, incerto ×2
  elioDoppio: 3, // [R] il redshift a cui l'elio perde il secondo elettrone (McQuinn 2016)
};
const Y_ELIO = DATI_STELLE.YPRIMO; // l'elio del Big Bang (stelle.js: una fonte)
const stringi = (x, a, b) => Math.max(a, Math.min(b, x));
const frazione = (v) => v - Math.floor(v);

// =====================================================================================================
// 0. LA COSMOLOGIA CON LA RADIAZIONE (da U di galassie.js + T₀)
// =====================================================================================================
const H0s = (COSMO.H0 * 1e3) / MPC; // 1/s
const RHO_C = (U.rhoC * MSOLE) / KPC ** 3; // kg/m³ (U.rhoC è in M☉/kpc³: una fonte)
const kT0 = COSTANTI.kB * DATI.T0, HC = COSTANTI.hbar * C_LUCE;
// [D] corpo nero: u = (π²/15)(kT)⁴/(ħc)³; n = (2ζ(3)/π²)(kT/ħc)³
const U_FOTONI = ((Math.PI ** 2 / 15) * kT0 ** 4) / HC ** 3, N_FOTONI = ((2 * DATI.zeta3) / Math.PI ** 2) * (kT0 / HC) ** 3;
const OmG = U_FOTONI / (RHO_C * C_LUCE ** 2), OmNu = DATI.Neff * (7 / 8) * Math.pow(4 / 11, 4 / 3) * OmG, OmR = OmG + OmNu; // [D] neutrini: T_ν = (4/11)^(1/3)·T
const OmB = COSMO.Ob, OmC = COSMO.Om - COSMO.Ob, F_NU = OmNu / OmR, RB0 = (3 * OmB) / (4 * OmG); // R = 3ρ_b/4ρ_γ = RB0·a
const E_ = (a) => Math.sqrt(U.E(a) ** 2 + OmR / a ** 4); // U.E di galassie.js più la radiazione
const CH = (H0s / C_LUCE) * MPC; // H₀/c in 1/Mpc
// tabelle in ln a: il tempo conforme η (Mpc), il tempo t (Ga), l'orizzonte sonoro r_s (Mpc)
const TAB = (() => {
  const n = 5600, l0 = Math.log(1e-9), l1 = Math.log(1e3), dl = (l1 - l0) / n, eta = new Float64Array(n + 1), tt = new Float64Array(n + 1), rs = new Float64Array(n + 1);
  const fe = (l) => { const a = Math.exp(l); return 1 / (CH * a * E_(a)); }, ft = (l) => 1 / (H0s * E_(Math.exp(l)) * GA), fs = (l) => fe(l) / Math.sqrt(3 * (1 + RB0 * Math.exp(l)));
  eta[0] = 1e-9 / (CH * Math.sqrt(OmR)); tt[0] = 1e-18 / (2 * H0s * Math.sqrt(OmR) * GA); rs[0] = eta[0] / Math.sqrt(3); // nell'era della radiazione: η = a/(H₀√Ω_r)
  for (let i = 0; i < n; i++) { const l = l0 + i * dl, m = l + dl / 2, r = l + dl; eta[i + 1] = eta[i] + (dl / 6) * (fe(l) + 4 * fe(m) + fe(r)); tt[i + 1] = tt[i] + (dl / 6) * (ft(l) + 4 * ft(m) + ft(r)); rs[i + 1] = rs[i] + (dl / 6) * (fs(l) + 4 * fs(m) + fs(r)); }
  const leggi = (T) => (a) => { const x = stringi((Math.log(a) - l0) / dl, 0, n), i = Math.min(n - 1, Math.floor(x)); return T[i] + (x - i) * (T[i + 1] - T[i]); };
  const inversa = (T) => (v) => { let lo = 0, hi = n; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T[m] < v) lo = m; else hi = m; } return Math.exp(l0 + (lo + stringi((v - T[lo]) / (T[hi] - T[lo] || 1), 0, 1)) * dl); };
  return { eta: leggi(eta), tempo: leggi(tt), suono: leggi(rs), aDaEta: inversa(eta), aDaTempo: inversa(tt), etaFutura: eta[n] + 1 / (CH * 1e3 * Math.sqrt(COSMO.OL)) }; // oltre a = 1000: ∫da/(a²H) = 1/(a·H₀√Ω_Λ)
})();
const ETA0 = TAB.eta(1), T_OGGI = TAB.tempo(1);
// da t (secondi da oggi) al fattore di scala: la scala di galassie.js (U.scala, la fonte del tempo dei livelli sopra)
const scalaAl = (t) => (t === 0 ? 1 : U.scala(Math.max(U.tempo(1) + t / (GA), 1e-4)));

// ---------- E. L'UNIVERSO OSSERVABILE
// LE DISTANZE a un redshift (cosmo piatto): comovente χ = c∫dz/H; di luminosità (1+z)χ; angolare χ/(1+z) [R: Hogg 1999].
// → { z, a, comoventeM, luminositaM, angolareM, tempoDiRitornoAnni, etaAnni (l'età dell'universo a quel redshift),
//     tempoSenzaRadiazioneAnni (l'età secondo U.tempo di galassie.js, che la radiazione non ce l'ha), moduloDistanza }
export function distanze(z) {
  const a = 1 / (1 + z), chi = (ETA0 - TAB.eta(a)) * MPC, t = TAB.tempo(a);
  return { z, a, comoventeM: chi, luminositaM: chi * (1 + z), angolareM: chi * a, tempoDiRitornoAnni: (T_OGGI - t) * 1e9, etaAnni: t * 1e9, tempoSenzaRadiazioneAnni: U.tempo(a) * 1e9, moduloDistanza: chi > 0 ? 5 * Math.log10((chi * (1 + z)) / (10 * PC)) : -Infinity };
}
// il redshift a cui si vede ciò che sta a una distanza comovente data (m); null oltre l'orizzonte delle particelle
export const redshiftA = (comoventeM) => { const e = ETA0 - comoventeM / MPC; return e > TAB.eta(1e-9) ? 1 / TAB.aDaEta(e) - 1 : null; };
// GLI ORIZZONTI, oggi (m comoventi = m veri di oggi). Particelle: fin dove è arrivata la luce dall'inizio, c∫₀^t₀ dt/a.
// Eventi: fin dove arriverà mai un segnale che parte oggi, c∫_t₀^∞ dt/a (finito perché c'è Λ). Hubble: c/H₀.
// Ultima diffusione: il raggio della sfera da cui viene il fondo cosmico (vedi ricombinazione()).
export function orizzonti() {
  const r = ricombinazione();
  return { particelleM: ETA0 * MPC, eventiM: (TAB.etaFutura - ETA0) * MPC, hubbleM: C_LUCE / H0s, ultimaDiffusioneM: r.raggioM, etaAnni: T_OGGI * 1e9, etaSenzaRadiazioneAnni: U.tempo(1) * 1e9, OmegaRadiazione: OmR, OmegaFotoni: OmG, zUguaglianza: COSMO.Om / OmR - 1,
    fonte: '[D] da COSMO (leggi.js), U.E (galassie.js) e T₀; riscontro [R, Planck 2018]: età 13,8 Ga, orizzonte delle particelle 14,1–14,2 Gpc (46 miliardi di anni luce), degli eventi ~5 Gpc' };
}
// IL CONO DI LUCE di un osservatore: che epoca si vede a ogni distanza. osservatore: { posizione (m) } (o niente).
// → { a(distanzaM) → { z, a, etaAnni, tempoDiRitornoAnni, giriDelToro } | null (oltre l'orizzonte),
//     epocaDi(punto) → lo stesso per un punto del toro (l'immagine più vicina) più `immagini`: quante copie di
//     quel punto stanno dentro l'orizzonte (il toro si ripete), orizzonti }
export function conoDiLuce(osservatore = {}, { toroM = 3.7e25 } = {}) {
  const O = orizzonti(), x0 = osservatore.posizione ?? [toroM / 2, toroM / 2, toroM / 2];
  const a = (d) => { const z = redshiftA(d); if (z == null) return null; const D = distanze(z); return { distanzaM: d, z, a: D.a, etaAnni: D.etaAnni, tempoDiRitornoAnni: D.tempoDiRitornoAnni, giriDelToro: d / toroM }; };
  const epocaDi = (punto) => { const d = Math.hypot(...punto.map((p, i) => { const q = frazione((p - x0[i]) / toroM); return Math.min(q, 1 - q) * toroM; })); return { ...a(d), immagini: (4 / 3) * Math.PI * (O.particelleM / toroM) ** 3 }; };
  return { osservatore: { posizione: x0 }, toroM, a, epocaDi, orizzonti: O, copieDelToroNellOrizzonte: (4 / 3) * Math.PI * (O.particelleM / toroM) ** 3 };
}

// ---------- LA RICOMBINAZIONE (per il fondo e per lo stato del gas): Peebles 1968 (ApJ 153, 1), l'atomo a tre livelli
// [R: come in Dodelson 2003 §3.3]. dx/dt = C·[β(1−x) − x²·n_H·α⁽²⁾]; α⁽²⁾ = 9,78·(α²ħ²/m_e²c)·√(ε₀/kT)·ln(ε₀/kT);
// β = α⁽²⁾·(m_e kT/2πħ²)^(3/2)·e^(−ε₀/kT); C = (Λ_α + Λ_2γ)/(Λ_α + Λ_2γ + β⁽²⁾), Λ_α = H·(3ε₀)³/((8π)²·n_1s·(ħc)³).
// ε₀ = α²m_e c²/2 e σ_T = (8π/3)(αħ/m_e c)² sono ricavati dalle costanti [D]. Prima di z = 1700: Saha (tutto ionizzato).
// La reionizzazione è un istante z_re, ricavato dalla profondità ottica misurata (DATI.tauReionizzazione).
let ricFatta = null;
export function ricombinazione() {
  if (ricFatta) return ricFatta;
  const { me, mp, kB, hbar } = COSTANTI, eps0 = 0.5 * DATI.alfa ** 2 * me * C_LUCE ** 2, sigmaT = ((8 * Math.PI) / 3) * ((DATI.alfa * hbar) / (me * C_LUCE)) ** 2;
  const nH0 = ((1 - Y_ELIO) * OmB * RHO_C) / mp, fHe = Y_ELIO / (4 * (1 - Y_ELIO)), ZMAX = 1700;
  const alfa2 = (T) => { const x = eps0 / (kB * T); return ((9.78 * ((DATI.alfa * hbar) / me) ** 2) / C_LUCE) * Math.sqrt(x) * Math.log(x); };
  const fase = (T) => Math.pow((me * kB * T) / (PI2 * hbar * hbar), 1.5);
  const der = (z, x) => { const T = DATI.T0 * (1 + z), H = H0s * E_(1 / (1 + z)), nH = nH0 * (1 + z) ** 3, al = alfa2(T), ex = eps0 / (kB * T), ff = al * fase(T), beta = ff * Math.exp(-ex), beta2 = ff * Math.exp(-ex / 4), La = (H * (3 * eps0) ** 3) / ((8 * Math.PI) ** 2 * Math.max(1 - x, 1e-12) * nH * HC ** 3), C = (La + DATI.duePhotoni) / (La + DATI.duePhotoni + beta2); return (-C * (beta * (1 - x) - x * x * nH * al)) / (H * (1 + z)); };
  const xe = new Float64Array(ZMAX + 1);
  { const T = DATI.T0 * (1 + ZMAX), s = (fase(T) * Math.exp(-eps0 / (kB * T))) / (nH0 * (1 + ZMAX) ** 3); let x = (-s + Math.sqrt(s * s + 4 * s)) / 2; xe[ZMAX] = x; // Saha: x²/(1−x) = s
    const passi = 8, h = -1 / passi; for (let z = ZMAX; z > 0; z--) { for (let i = 0; i < passi; i++) { const zz = z + i * h, k1 = der(zz, x), k2 = der(zz + h / 2, x + (h / 2) * k1), k3 = der(zz + h / 2, x + (h / 2) * k2), k4 = der(zz + h, x + h * k3); x = stringi(x + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4), 0, 1); } xe[z - 1] = x; } }
  const xDi = (z) => (z >= ZMAX ? 1 : (() => { const i = Math.floor(z); return xe[i] + (z - i) * (xe[Math.min(ZMAX, i + 1)] - xe[i]); })());
  const dtauDz = (z, x) => (x * nH0 * (1 + z) ** 2 * sigmaT * C_LUCE) / (H0s * E_(1 / (1 + z))); // dτ/dz = n_e·σ_T·c/(H(1+z))
  // la reionizzazione: z_re tale che la profondità ottica del gas tutto ionizzato da lì a oggi sia quella misurata
  let zRe = 0; { let tau = 0; const dz = 0.01; while (tau < DATI.tauReionizzazione && zRe < 50) { const z = zRe + dz / 2; tau += dtauDz(z, 1 + fHe * (z < DATI.elioDoppio ? 2 : 1)) * dz; zRe += dz; } }
  // la profondità ottica della sola ricombinazione e la visibilità g(z) = dτ/dz·e^(−τ)
  const tau = new Float64Array(ZMAX + 1), g = new Float64Array(ZMAX + 1); for (let z = 1; z <= ZMAX; z++) tau[z] = tau[z - 1] + 0.5 * (dtauDz(z - 1, xe[z - 1]) + dtauDz(z, xe[z]));
  let zP = 0; for (let z = 0; z <= ZMAX; z++) { g[z] = dtauDz(z, xe[z]) * Math.exp(-tau[z]); if (g[z] > g[zP]) zP = z; }
  const zPicco = zP + (0.5 * (g[zP - 1] - g[zP + 1])) / (g[zP - 1] - 2 * g[zP] + g[zP + 1]); let zTau1 = 0; while (tau[zTau1 + 1] < 1) zTau1++; zTau1 += (1 - tau[zTau1]) / (tau[zTau1 + 1] - tau[zTau1]);
  // lo smorzamento di Silk [R: Hu & Sugiyama 1995; Dodelson eq. 8.40]: k_D⁻²(z) = ∫ dη·[R² + 16(1+R)/15]/(6(1+R)²·τ'), τ' = n_e σ_T a
  const kD2 = new Float64Array(ZMAX + 1), fD = (z, x) => { const a = 1 / (1 + z), R = RB0 * a, cH = C_LUCE / (H0s * E_(a)) / MPC /* dη/dz in Mpc */, libero = 1 / (x * nH0 * (1 + z) ** 2 * sigmaT * MPC) /* 1/τ' in Mpc */; return (cH * libero * (R * R + (16 * (1 + R)) / 15)) / (6 * (1 + R) ** 2); };
  { let s = 0; const n = 400, l1 = Math.log(1e6), l0 = Math.log(ZMAX), dl = (l1 - l0) / n; for (let i = 0; i < n; i++) { const z = Math.exp(l0 + (i + 0.5) * dl); s += fD(z, 1) * z * dl; } kD2[ZMAX] = s; for (let z = ZMAX; z > 0; z--) kD2[z - 1] = kD2[z] + 0.5 * (fD(z, xe[z]) + fD(z - 1, xe[z - 1])); }
  // l'inviluppo: D(k) = ∫ g(z)·e^(−k²/k_D²(z)) dz / ∫ g dz (la visibilità pesa lo smorzamento: lo spessore dell'ultima diffusione)
  const z0 = 400, norma = (() => { let s = 0; for (let z = z0; z <= ZMAX; z++) s += g[z]; return s; })();
  const smorza = (k) => { let s = 0; const k2 = k * k; for (let z = z0; z <= ZMAX; z++) s += g[z] * Math.exp(-k2 * kD2[z]); return s / norma; };
  // la larghezza della visibilità (metà altezza), in redshift
  let za = zP, zb = zP; while (za > 0 && g[za] > g[zP] / 2) za--; while (zb < ZMAX && g[zb] > g[zP] / 2) zb++;
  const aS = 1 / (1 + zTau1), etaS = TAB.eta(aS); // l'ultima diffusione: dove la profondità ottica vale 1 (la definizione di z* di Planck); il picco della visibilità in z è poco sotto
  // quando il gas smette di seguire la temperatura dei fotoni [R: Peebles 1993; 1 + z_t ≈ 137·(Ω_b h²/0,022)^(2/5)]
  const zTermico = 137 * Math.pow((OmB * U.h * U.h) / 0.022, 0.4) - 1;
  return (ricFatta = { xe: xDi, zPicco, zTau1, larghezza: zb - za, zReionizzazione: zRe, zTermico, aUltima: aS, etaUltimaMpc: etaS, raggioMpc: ETA0 - etaS, raggioM: (ETA0 - etaS) * MPC, orizzonteSonoroMpc: TAB.suono(aS), angoloSonoro: TAB.suono(aS) / (ETA0 - etaS),
    etaUltimaAnni: TAB.tempo(aS) * 1e9, kSilk: 1 / Math.sqrt(kD2[Math.round(zTau1)]), smorza, residuo: xe[200], sigmaT, eps0, nH0, fHe, dtauDz,
    fonte: '[D] Peebles 1968 integrata qui; riscontro [V, Planck 2018]: z* = 1090, 100θ* = 1,0411; [R] r_s ≈ 144–145 Mpc, z_re = 7,7' });
}

// =====================================================================================================
// LE ONDE DI UN COSMO, in una forma sola
// =====================================================================================================
const eUnNumero = (c) => typeof c === 'number' || /^\d+(#.*)?$/.test(String(c));
const memoOnde = new WeakMap();
// → { toroM, Lmpc, N, KX, KY, KZ, PK, A, B, kmax, radice, rami, libere: { A, B } | null, fissi: [vincoli già presi] }
export function ondeDi(cosmo, opz = {}) {
  if (cosmo == null) throw new Error('ragnatela: manca il cosmo');
  if (cosmo.ragnatela === 'onde') return cosmo;
  if (campoDi(cosmo)) throw new Error('ragnatela: questo è un campo senza bordo, non un campo di onde');
  const chiave = typeof cosmo === 'object' ? (cosmo.onde?.A ?? cosmo.A) : null; if (chiave && memoOnde.has(chiave)) return memoOnde.get(chiave);
  let O;
  if (eUnNumero(cosmo)) { const n = typeof cosmo === 'number' ? cosmo : String(cosmo), F = campoCosmo(n), o = F.onde; if (memoOnde.has(o.A)) return memoOnde.get(o.A);
    O = { toroM: F.toroM, N: o.n, KX: o.kx, KY: o.ky, KZ: o.kz, PK: o.potenza, A: o.A, B: o.B, kmax: o.kmax, radice: `cosmo ${cosmoBase(n)}`, rami: ramiCosmo(n), libere: F.libere, fissi: F.pos.map((x, i) => ({ nome: `galassia ${i}`, x, taglio: F.vincoli.taglio, valore: F.vincoli.valori[i] })) };
  } else if (typeof cosmo === 'string') { const F = campoLibero(cosmo, opz); O = { toroM: F.toroM, N: F.N, KX: F.KX, KY: F.KY, KZ: F.KZ, PK: F.PK, A: F.A, B: F.B, kmax: F.kmax, radice: F.radice, rami: opz.rami ?? null, libere: null, fissi: [] };
  } else if (cosmo.onde && cosmo.onde.A) { const o = cosmo.onde; O = { toroM: cosmo.toroM, N: o.n, KX: o.kx, KY: o.ky, KZ: o.kz, PK: o.potenza, A: o.A, B: o.B, kmax: o.kmax, radice: cosmo.radice ?? opz.radice ?? null, rami: cosmo.rami ?? opz.rami ?? null, libere: cosmo.libere ?? null, fissi: cosmo.libere && cosmo.pos && cosmo.vincoli ? cosmo.pos.map((x, i) => ({ nome: `galassia ${i}`, x, taglio: cosmo.vincoli.taglio, valore: cosmo.vincoli.valori[i] })) : [] };
  } else if (cosmo.A && cosmo.PK) O = { toroM: cosmo.toroM, N: cosmo.N, KX: cosmo.KX, KY: cosmo.KY, KZ: cosmo.KZ, PK: cosmo.PK, A: cosmo.A, B: cosmo.B, kmax: cosmo.kmax, radice: cosmo.radice ?? opz.radice ?? null, rami: cosmo.rami ?? opz.rami ?? null, libere: null, fissi: cosmo.fissi ?? [] };
  else throw new Error('ragnatela: non riconosco questo cosmo');
  O.ragnatela = 'onde'; O.Lmpc = O.toroM / MPC; let s2 = 0; for (let m = 0; m < O.N; m++) s2 += 2 * O.PK[m]; O.sigma = Math.sqrt(s2);
  memoOnde.set(O.A, O); return O;
}
// la finestra gaussiana per ogni |k|² intero (R in metri); null se R = 0
const finestra = (O, R) => { if (!(R > 0)) return null; const K2 = O.kmax * O.kmax, q = 0.5 * ((PI2 * R) / O.toroM) ** 2, W = new Float64Array(K2 + 1); for (let k2 = 0; k2 <= K2; k2++) W[k2] = Math.exp(-q * k2); return W; };
const f0Crescita = Math.log(U.D(1.01) / U.D(0.99)) / Math.log(1.01 / 0.99); // f = dlnD/dlna oggi (la stessa espressione di cosmo3d.js)
// IL CAMPO SENZA BORDO (campo_pigro.js): ciò che i cosmi della biblioteca e gli indirizzi sono, oggi. → { ragnatela: 'pigro',
//   K (il campo, vincolato alle galassie se è un cosmo), libero (lo stesso senza vincoli), livello (la risoluzione «nel punto»),
//   toroM (il lato della regione delle galassie: non si richiude), radice, rami, fissi (i vincoli delle galassie), sigma() }
// o null se `cosmo` è un campo di onde su un toro (allora vale ondeDi).
const memoPigri = new WeakMap(), pigriPerChiave = new Map();
const pigroDa = (chiave, fai) => { const m = typeof chiave === 'object' ? memoPigri : pigriPerChiave; let C = m.get(chiave); if (!C) { C = { ragnatela: 'pigro', ...fai() }; let sg = null; C.sigma = () => sg ?? (sg = Math.sqrt(C.libero.varianza({ livello: C.livello }))); m.set(chiave, C); } return C; };
export function campoDi(cosmo) {
  if (cosmo == null) throw new Error('ragnatela: manca il cosmo');
  if (cosmo.ragnatela === 'pigro') return cosmo;
  if (cosmo.ragnatela === 'onde' || (cosmo.A && cosmo.PK && cosmo.tipo !== 'pigro') || cosmo.onde?.A) return null;
  if (eUnNumero(cosmo)) { const F = campoCosmo(typeof cosmo === 'number' ? cosmo : String(cosmo)); return pigroDa(F, () => ({ K: F.campo, libero: F.libero, livello: F.livello, toroM: F.toroM, radice: `cosmo ${cosmoBase(cosmo)}`, rami: ramiCosmo(cosmo), fissi: F.vincoliGalassie, numero: cosmo })); }
  if (typeof cosmo === 'string') return pigroDa(`indirizzo|${cosmo}`, () => { const d = campoLibero(cosmo); return { K: d.campo, libero: d.campo, livello: d.livello, toroM: d.toroM, radice: d.radice, rami: null, fissi: [] }; });
  if (cosmo.tipo === 'pigro') return pigroDa(cosmo, () => ({ K: cosmo.campo, libero: cosmo.campo.libero ?? cosmo.campo, livello: cosmo.livello ?? LIVELLO_COSMO, toroM: cosmo.toroM ?? TORO_M, radice: cosmo.radice, rami: cosmo.rami ?? null, fissi: cosmo.fissiVincoli ?? cosmo.fissi ?? [] }));
  if (cosmo.pigro === true && cosmo.campo && cosmo.libero) return pigroDa(cosmo, () => ({ K: cosmo.campo, libero: cosmo.libero, livello: cosmo.livello, toroM: cosmo.toroM, radice: cosmo.libero.radice, rami: cosmo.libero.rami, fissi: cosmo.vincoliGalassie ?? [] }));
  if (cosmo.pigro === true && cosmo.delta) return pigroDa(cosmo, () => ({ K: cosmo, libero: cosmo.libero ?? cosmo, livello: LIVELLO_COSMO, toroM: TORO_M, radice: cosmo.radice, rami: cosmo.rami, fissi: [] }));
  return null;
}
// il livello del campo per una lunghezza d'onda voluta (m): quello la cui ottava ha λ = 4 lati di cella; mai sotto la risoluzione del cosmo
const livelloDet = (C, dettaglio) => (dettaglio ? Math.max(C.livello, Math.floor(Math.log2((4 * C.K.lato0) / (dettaglio / MPC)))) : C.livello);
const pPunto = (C, punto, scala = 0, dettaglio = null) => { const J = livelloDet(C, dettaglio), w = C.K.in(punto, scala > 0 ? { scala, livello: J } : { livello: J }); return { delta: w.delta, T: w.marea, v: w.velocita, J }; };
// la posizione (m) del nodo v lungo l'asse d di una griglia (sul toro si richiude, senza bordo no)
const posDi = (G, d, v) => (G.periodica ? frazione(G.origine[d] + v * G.passo) : G.origine[d] + v * G.passo) * G.toroM;
// IN UN PUNTO (x: frazioni del toro), in un giro solo sulle onde: δ, il tensore di marea [xx, yy, zz, xy, xz, yz] (la
// sua traccia è δ) e la velocità lineare (km/s, oggi: v_k = i·H₀·f·δ_k·k/k², come cosmo3d.js).
function nelPunto(O, x, W = null) {
  const { N, KX, KY, KZ, A, B } = O, X = PI2 * x[0], Y = PI2 * x[1], Z = PI2 * x[2], T = [0, 0, 0, 0, 0, 0], v = [0, 0, 0], kV = (COSMO.H0 * f0Crescita * O.Lmpc) / PI2;
  for (let m = 0; m < N; m++) { const a = KX[m], b = KY[m], c = KZ[m], k2 = a * a + b * b + c * c, t = a * X + b * Y + c * Z, cs = Math.cos(t), sn = Math.sin(t), w = (W ? 2 * W[k2] : 2) / k2, r = w * (A[m] * cs - B[m] * sn), q = -kV * w * (A[m] * sn + B[m] * cs);
    T[0] += r * a * a; T[1] += r * b * b; T[2] += r * c * c; T[3] += r * a * b; T[4] += r * a * c; T[5] += r * b * c; v[0] += q * a; v[1] += q * b; v[2] += q * c; }
  return { delta: T[0] + T[1] + T[2], T, v };
}
// gli autovalori di una matrice simmetrica 3×3, dal più grande (formula trigonometrica), e un autovettore
function autovalori(xx, yy, zz, xy, xz, yz, out) {
  const q = (xx + yy + zz) / 3, a = xx - q, b = yy - q, c = zz - q, p2 = (a * a + b * b + c * c + 2 * (xy * xy + xz * xz + yz * yz)) / 6;
  if (!(p2 > 1e-300)) { out[0] = out[1] = out[2] = q; return out; }
  const p = Math.sqrt(p2), det = a * (b * c - yz * yz) - xy * (xy * c - yz * xz) + xz * (xy * yz - b * xz), f = Math.acos(stringi(det / (2 * p * p2), -1, 1)) / 3;
  out[0] = q + 2 * p * Math.cos(f); out[2] = q + 2 * p * Math.cos(f + PI2 / 3); out[1] = 3 * q - out[0] - out[2]; return out;
}
function autovettore(xx, yy, zz, xy, xz, yz, l) {
  const r = [[xx - l, xy, xz], [xy, yy - l, yz], [xz, yz, zz - l]], cr = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  let meglio = null, n2 = -1; for (const [i, j] of [[0, 1], [0, 2], [1, 2]]) { const v = cr(r[i], r[j]), q = v[0] * v[0] + v[1] * v[1] + v[2] * v[2]; if (q > n2) { n2 = q; meglio = v; } }
  if (!(n2 > 1e-300)) return [1, 0, 0]; const n = Math.sqrt(n2); return [meglio[0] / n, meglio[1] / n, meglio[2] / n];
}
const classeDi = (l, soglia) => (l[0] > soglia ? 1 : 0) + (l[1] > soglia ? 1 : 0) + (l[2] > soglia ? 1 : 0);

// =====================================================================================================
// IL CAMPO COMPLETO: le onde del toro (intatte) più, sotto i 50 Mpc, il campo pigro nello spazio (campo_pigro.js)
// =====================================================================================================
// Le onde di cosmo3d tengono tutta la potenza fino a |k| = kmax giri per lato (k_c = 2π·kmax/L), e niente oltre. Il
// dettaglio è il campo pigro con la finestra complementare F(k) = 1 per k > k_c, 0 altrimenti: le due finestre al quadrato
// sommano 1 a ogni k (il taglio è netto perché le onde del toro non si toccano). Le sue celle si richiudono col periodo
// del toro (lato del livello j: L·2^(10−j)), quindi è un campo sul toro; i suoi eventi sono «radice/campo/livello j/cella
// x,y,z», accanto a «radice/campo/onda x,y,z». IL RACCORDO DICHIARATO: un taglio netto in k allunga il nucleo dei due
// livelli che lo attraversano; troncato a 6 celle e rinormalizzato, il livello di 19 Mpc ha il 21% della sua varianza
// fuori dal raggio (ma porta solo 0,03 di varianza), quello di 9 Mpc il 3%: attorno a k_c la potenza è sfumata su ~10%
// in k (la prova misura lo spettro attraverso il taglio). Senza `dettaglio` niente di questo viene nemmeno costruito.
//   dettaglio: la lunghezza d'onda più corta voluta (m): entrano i livelli la cui ottava (onde tra 2 e 8 lati di cella) la contiene
// → { livello, risoluzioneM (2 lati di cella del livello più fine), pigro (il campo di campo_pigro.js), in(punto, { scala }) }
// (OGGI: il cosmo È il campo senza bordo, e il raccordo col toro non c'è più: `dettaglio` alza solo il livello più fine.)
export function campoCompleto(cosmo, { dettaglio } = {}) {
  const C = campoDi(cosmo); if (!C) throw new Error('campoCompleto: i campi di onde su un toro non si completano più (il cosmo è senza bordo: si chiede `dettaglio`)'); if (!(dettaglio > 0)) throw new Error('campoCompleto: serve `dettaglio` (m)');
  const J = livelloDet(C, dettaglio);
  return { livello: J, risoluzioneM: 2 * C.K.latoDi(J) * MPC, pigro: C.K, campo: C, in: (punto, { scala = 0 } = {}) => { const a = pPunto(C, punto, scala, dettaglio); return { delta: a.delta, marea: a.T, velocita: a.v }; } };
}

// =====================================================================================================
// A. LA RAGNATELA
// =====================================================================================================
// DOVE SONO: la classe del punto e tutto ciò che il campo dice lì.
//   opz: { scala (m: lisciatura gaussiana in più; 0 = solo le onde che ci sono), soglia (0: Zel'dovich), t (secondi da oggi),
//          dettaglio (m: la lunghezza d'onda più corta voluta, sotto i 50 Mpc: si aggiunge il campo pigro, vedi campoCompleto) }
// → { classe ('vuoto' | 'foglio' | 'filamento' | 'nodo'), numero (0…3), autovalori [λ₁ ≥ λ₂ ≥ λ₃] (oggi; a un altro tempo
//     valgono ×crescita), assi (i tre autovettori, nello stesso ordine), direzione (del filamento: l'asse che non
//     crolla; di un foglio: la sua normale, l'asse che crolla; altrimenti null), delta (il contrasto LINEARE a quel
//     tempo), densita (ρ/ρ̄ di Zel'dovich a quel tempo), crollato (Dλ₁ ≥ 1: lì la materia è già caduta e la densità di
//     Zel'dovich non vale), velocita (km/s, il moto lineare a quel tempo), crescita, sigma (lo scarto del campo oggi),
//     risoluzioneM (la lunghezza d'onda più corta che c'è), soglia, scala }
export function doveSono(cosmo, punto, { scala = 0, soglia = 0, t = 0, dettaglio = null } = {}) {
  const C = campoDi(cosmo), O = C ? null : ondeDi(cosmo); if (dettaglio && !C) throw new Error('doveSono: `dettaglio` vale per il campo senza bordo'); const P = C ? pPunto(C, punto, scala, dettaglio) : nelPunto(O, punto.map((p) => frazione(p / O.toroM)), finestra(O, scala)), [xx, yy, zz, xy, xz, yz] = P.T, l = autovalori(xx, yy, zz, xy, xz, yz, [0, 0, 0]);
  const a = scalaAl(t), D = U.D(a), numero = classeDi(l, soglia), assi = l.map((v) => autovettore(xx, yy, zz, xy, xz, yz, v)), J = (1 - D * l[0]) * (1 - D * l[1]) * (1 - D * l[2]);
  const fv = t === 0 ? 1 : (a * U.E(a) * D * (Math.log(U.D(a * 1.01) / U.D(a * 0.99)) / Math.log(1.01 / 0.99))) / f0Crescita; // come cosmo3d.js alTempo
  return { classe: CLASSI[numero], numero, autovalori: l, assi, direzione: numero === 2 ? assi[2] : numero === 1 ? assi[0] : null, delta: D * P.delta, densita: 1 / Math.abs(J), crollato: D * l[0] >= 1, velocita: P.v.map((q) => q * fv), crescita: D, sigma: C ? C.sigma() : O.sigma, risoluzioneM: C ? 2 * C.K.latoDi(P.J) * MPC : O.toroM / O.kmax, soglia, scala,
    densitaSferica: nonLinDaLin(Math.min(D * P.delta, 0.9 * LEGGI_GALASSIE.deltaC)) }; // ρ/ρ̄ dal collasso sferico (Mo & White 1996 eq. 18 [R]): per l'interno dei vuoti, dove Zel'dovich lungo tre assi sottostima
}
// la direzione del filamento in un punto (un versore, a meno del verso), o null se lì non c'è un filamento
export const direzioneFilamento = (cosmo, punto, opz = {}) => { const w = doveSono(cosmo, punto, opz); return w.numero === 2 ? w.direzione : null; };

// LA SINTESI SU UNA GRIGLIA REGOLARE, esatta e separabile: δ e il tensore di marea negli n³ nodi
// (origine + (i, j, l)·passo, in frazioni del toro). Costa ~3·N·n + 6·(2kmax+1)(kmax+1)·n² + 6·(kmax+1)·n³ prodotti invece
// di N·n³ seni: la regione guardata si calcola da sola, senza rifare il toro. I valori sono gli stessi di nelPunto.
// → { n, origine, passo, delta, xx, yy, zz, xy, xz, yz: Float64Array(n³) (indice l·n² + j·n + i) }
export function sintesi(cosmo, origine, passo, n, { scala = 0 } = {}) {
  const O = ondeDi(cosmo), { N, KX, KY, KZ, A, B, kmax } = O, nk = 2 * kmax + 1, np = nk * (kmax + 1), W = finestra(O, scala);
  const tab = (o, k0, k1) => { const c = new Float64Array((k1 - k0 + 1) * n), s = new Float64Array((k1 - k0 + 1) * n); for (let k = k0; k <= k1; k++) for (let i = 0; i < n; i++) { const t = PI2 * k * (o + i * passo); c[(k - k0) * n + i] = Math.cos(t); s[(k - k0) * n + i] = Math.sin(t); } return [c, s]; };
  const [cx, sx] = tab(origine[0], -kmax, kmax), [cy, sy] = tab(origine[1], -kmax, kmax), [cz, sz] = tab(origine[2], 0, kmax);
  // primo stadio: per ogni coppia (ky, kz) le tre somme su kx di d·e^(i kx x), d·kx·…, d·kx²·… (d = ampiezza/k²)
  const S = [0, 1, 2, 3, 4, 5].map(() => new Float64Array(np * n)), pieno = new Uint8Array(np);
  for (let m = 0; m < N; m++) { const a = KX[m], b = KY[m], c = KZ[m], k2 = a * a + b * b + c * c, w = (W ? W[k2] : 1) / k2, dr = A[m] * w, di = B[m] * w, pp = b + kmax + nk * c, p = pp * n, ox = (a + kmax) * n; pieno[pp] = 1;
    for (let i = 0; i < n; i++) { const co = cx[ox + i], si = sx[ox + i], er = dr * co - di * si, ei = dr * si + di * co; S[0][p + i] += er; S[1][p + i] += ei; S[2][p + i] += a * er; S[3][p + i] += a * ei; S[4][p + i] += a * a * er; S[5][p + i] += a * a * ei; } }
  const n2 = n * n, n3 = n2 * n, out = { n, origine: [...origine], passo, delta: new Float64Array(n3), xx: new Float64Array(n3), yy: new Float64Array(n3), zz: new Float64Array(n3), xy: new Float64Array(n3), xz: new Float64Array(n3), yz: new Float64Array(n3) };
  const Q = Array.from({ length: 12 }, () => new Float64Array(n2)); // (xx, xy, x, yy, y, 0) × (re, im)
  for (let c = 0; c <= kmax; c++) {
    for (const q of Q) q.fill(0);
    for (let b = -kmax; b <= kmax; b++) { const pp = b + kmax + nk * c; if (!pieno[pp]) continue; const p = pp * n, oy = (b + kmax) * n;
      for (let i = 0; i < n; i++) { const s0r = S[0][p + i], s0i = S[1][p + i], s1r = S[2][p + i], s1i = S[3][p + i], s2r = S[4][p + i], s2i = S[5][p + i];
        for (let j = 0; j < n; j++) { const co = cy[oy + j], si = sy[oy + j], q = j * n + i, e0r = s0r * co - s0i * si, e0i = s0r * si + s0i * co, e1r = s1r * co - s1i * si, e1i = s1r * si + s1i * co;
          Q[0][q] += s2r * co - s2i * si; Q[1][q] += s2r * si + s2i * co; Q[2][q] += b * e1r; Q[3][q] += b * e1i; Q[4][q] += e1r; Q[5][q] += e1i; Q[6][q] += b * b * e0r; Q[7][q] += b * b * e0i; Q[8][q] += b * e0r; Q[9][q] += b * e0i; Q[10][q] += e0r; Q[11][q] += e0i; } } }
    for (let l = 0; l < n; l++) { const co = 2 * cz[c * n + l], si = 2 * sz[c * n + l], o = l * n2;
      for (let q = 0; q < n2; q++) { out.xx[o + q] += Q[0][q] * co - Q[1][q] * si; out.xy[o + q] += Q[2][q] * co - Q[3][q] * si; out.xz[o + q] += c * (Q[4][q] * co - Q[5][q] * si); out.yy[o + q] += Q[6][q] * co - Q[7][q] * si; out.yz[o + q] += c * (Q[8][q] * co - Q[9][q] * si); out.zz[o + q] += c * c * (Q[10][q] * co - Q[11][q] * si); } }
  }
  for (let q = 0; q < n3; q++) out.delta[q] = out.xx[q] + out.yy[q] + out.zz[q];
  return out;
}
// LE CLASSI SU UNA GRIGLIA: di tutta la regione delle galassie (regione = null) o di una regione { centro: [m], lato: m,
// celle: n }. Sul campo senza bordo i nodi stanno sul reticolo delle celle del livello col lato più vicino a lato/celle
// (il passo può differire fino a √2 da quello chiesto; `latoCellaM` dice il vero) e, per tutta la regione, il loro numero è
// quello che la copre (64 per 48 chiesti); su un toro di onde (regione = null: periodica) come prima.
// → { n, periodica, origine (frazioni), passo (frazione), latoCellaM, classe: Uint8Array(n³), delta: Float32Array (lineare,
//     oggi), volume: Float32Array (|Π(1−λ_i)|: il volume di oggi di quell'elemento, in unità del suo volume iniziale),
//     l1, l3: Float32Array (l'autovalore più grande e il più piccolo), campo (ciò che dà sintesi), sigma }
export function classiSuGriglia(cosmo, regione = null, { celle = 48, scala = 0, soglia = 0, dettaglio = null } = {}) {
  const C = campoDi(cosmo); let n, periodica, origine, passo, F, toroM, sigma;
  if (C) { // sul campo senza bordo: i nodi sul reticolo del livello più vicino al passo chiesto (convoluzione per regione, campo_pigro.js grigliaFFT)
    toroM = C.toroM; const passoM = regione ? regione.lato / (regione.celle ?? celle) : toroM / celle, m = Math.round(Math.log2(C.K.lato0 / (passoM / MPC))), sM = C.K.latoDi(m) * MPC; n = regione ? regione.celle ?? celle : Math.round(toroM / sM);
    const oi = regione ? regione.centro.map((c) => Math.round(c / sM - (n - 1) / 2)) : [0, 0, 0]; periodica = false; origine = oi.map((v) => (v * sM) / toroM); passo = sM / toroM; sigma = C.sigma();
    F = C.K.grigliaFFT(oi.map((v) => v * sM), m, n, { livello: Math.min(m, livelloDet(C, dettaglio)), marea: true, scala: scala > 0 ? scala : undefined });
  } else { if (dettaglio) throw new Error('classiSuGriglia: `dettaglio` vale per il campo senza bordo'); const O = ondeDi(cosmo); toroM = O.toroM; sigma = O.sigma; n = regione?.celle ?? celle; periodica = !regione; passo = periodica ? 1 / n : regione.lato / O.toroM / n;
    origine = periodica ? [0, 0, 0] : regione.centro.map((c) => c / O.toroM - (regione.lato / O.toroM) / 2 + passo / 2); F = sintesi(O, origine, passo, n, { scala }); }
  const n3 = n * n * n, classe = new Uint8Array(n3), delta = new Float32Array(n3), volume = new Float32Array(n3), l1 = new Float32Array(n3), l3 = new Float32Array(n3), l = [0, 0, 0];
  for (let q = 0; q < n3; q++) { autovalori(F.xx[q], F.yy[q], F.zz[q], F.xy[q], F.xz[q], F.yz[q], l); classe[q] = classeDi(l, soglia); delta[q] = F.delta[q]; volume[q] = Math.abs((1 - l[0]) * (1 - l[1]) * (1 - l[2])); l1[q] = l[0]; l3[q] = l[2]; }
  return { n, periodica, origine, passo, latoCellaM: passo * toroM, classe, delta, volume, l1, l3, campo: F, sigma, toroM, soglia, scala };
}
// LE FRAZIONI per classe, su tutto il toro.
// → { massa: [4] (la parte dei punti, cioè degli elementi di materia: per un campo gaussiano 0,08 0,42 0,42 0,08),
//     volume: [4] (pesata col volume di Zel'dovich di oggi), densita: [4] (ρ/ρ̄ media della classe = massa/volume),
//     deltaMedio: [4] (il contrasto lineare medio), autovaloriMedi: [4][3] (in unità dello scarto del campo),
//     crollati (la parte dei punti con λ₁ ≥ 1: lì |Π(1−λ)| non è più un volume, e `volume` va preso con cautela),
//     volumeDeiVuoti, densitaDeiVuoti (validi anche a risoluzione fine), sigma, n (punti), gaussiana: [0,08 0,42 0,42 0,08] }
export function frazioni(cosmo, opz = {}) {
  const G = opz.griglia ?? classiSuGriglia(cosmo, null, opz), n3 = G.classe.length, conta = [0, 0, 0, 0], vol = [0, 0, 0, 0], dm = [0, 0, 0, 0], lm = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]]; let vt = 0, crollati = 0;
  for (let q = 0; q < n3; q++) { const c = G.classe[q]; conta[c]++; vol[c] += G.volume[q]; vt += G.volume[q]; dm[c] += G.delta[q]; lm[c][0] += G.l1[q]; lm[c][2] += G.l3[q]; lm[c][1] += G.delta[q] - G.l1[q] - G.l3[q]; if (G.l1[q] >= 1) crollati++; }
  return { massa: conta.map((c) => c / n3), volume: vol.map((v) => v / vt), densita: conta.map((c, i) => (c / n3) / (vol[i] / vt)), deltaMedio: dm.map((d, i) => d / (conta[i] || 1)), autovaloriMedi: lm.map((v, i) => v.map((x) => x / (conta[i] || 1) / G.sigma)), crollati: crollati / n3, sigma: G.sigma, n: n3, gaussiana: [0.08, 0.42, 0.42, 0.08], griglia: G,
    // i vuoti non si incrociano mai (tre autovalori negativi): il loro volume di Zel'dovich vale anche dove altrove la materia è crollata.
    // Il volume totale è quello iniziale (la massa si conserva): parte del volume nei vuoti e loro densità media senza usare |J| degli altri
    volumeDeiVuoti: vol[0] / n3, densitaDeiVuoti: conta[0] / (vol[0] || 1) };
}
// I VUOTI di tutto il toro: le regioni connesse (per facce, sul toro che si richiude) di classe vuoto.
// → { n, vuoti: [{ celle, volumeM3 (di oggi, Zel'dovich: comovente), raggioM (della sfera di ugual volume), centro (m: dove
//     δ è minimo), deltaMinimo (lineare), densitaMinima (ρ/ρ̄ di Zel'dovich nel centro), contrasto (ρ/ρ̄ − 1 medio) }]
//     dal più grande, raggioTipicoM (la mediana pesata sul volume), contrastoMedio (di tutti i vuoti insieme),
//     contrastoNeiCentri (mediana pesata), frazioneDiVolume, latoCellaM }
export function vuoti(cosmo, opz = {}) {
  const G = opz.griglia ?? classiSuGriglia(cosmo, null, opz), n = G.n, n2 = n * n, n3 = n2 * n, visto = new Int32Array(n3).fill(-1), coda = new Int32Array(n3), cella = (G.latoCellaM) ** 3, lista = [];
  for (let s = 0; s < n3; s++) { if (G.classe[s] !== 0 || visto[s] >= 0) continue; let testa = 0, fine = 0, vol = 0, min = s; coda[fine++] = s; visto[s] = lista.length;
    while (testa < fine) { const q = coda[testa++], i = q % n, j = ((q - i) / n) % n, l = (q - i - j * n) / n2; vol += G.volume[q]; if (G.delta[q] < G.delta[min]) min = q;
      for (const v of (G.periodica ? [l * n2 + j * n + ((i + 1) % n), l * n2 + j * n + ((i + n - 1) % n), l * n2 + ((j + 1) % n) * n + i, l * n2 + ((j + n - 1) % n) * n + i, ((l + 1) % n) * n2 + j * n + i, ((l + n - 1) % n) * n2 + j * n + i] : [i + 1 < n ? q + 1 : -1, i > 0 ? q - 1 : -1, j + 1 < n ? q + n : -1, j > 0 ? q - n : -1, l + 1 < n ? q + n2 : -1, l > 0 ? q - n2 : -1].filter((x) => x >= 0))) if (G.classe[v] === 0 && visto[v] < 0) { visto[v] = lista.length; coda[fine++] = v; } }
    const i = min % n, j = ((min - i) / n) % n, l = (min - i - j * n) / n2;
    lista.push({ celle: fine, volumeM3: vol * cella, raggioM: Math.cbrt((3 * vol * cella) / (4 * Math.PI)), centro: [i, j, l].map((v, d) => posDi(G, d, v)), deltaMinimo: G.delta[min], densitaMinima: 1 / G.volume[min], contrasto: fine / vol - 1 }); }
  lista.sort((a, b) => b.volumeM3 - a.volumeM3 || a.centro[0] - b.centro[0]);
  const vt = lista.reduce((a, v) => a + v.volumeM3, 0), mediana = (f) => { const o = [...lista].sort((a, b) => f(a) - f(b)); let s = 0; for (const v of o) { s += v.volumeM3; if (s >= vt / 2) return f(v); } return NaN; };
  let tutto = 0; for (let q = 0; q < n3; q++) tutto += G.volume[q];
  return { n: lista.length, vuoti: lista, raggioTipicoM: mediana((v) => v.raggioM), contrastoMedio: lista.reduce((a, v) => a + v.celle, 0) / (vt / cella) - 1, contrastoNeiCentri: mediana((v) => v.densitaMinima) - 1, frazioneDiVolume: vt / cella / tutto, latoCellaM: G.latoCellaM, griglia: G };
}
// LO SCHELETRO DEI FILAMENTI in una regione { centro: [m], lato: m, celle: n }.
// Un nodo della griglia è sullo scheletro se è di classe filamento (o nodo) e la densità lì è più alta che nei due punti
// a una cella di distanza lungo ciascuno dei due assi che crollano (una cresta: massimo nel piano perpendicolare alla
// direzione). Due punti dello scheletro vicini (26 vicini) si uniscono se il loro distacco è allineato alla direzione
// di entrambi (|cos| > 0,5: di comodo). Il bordo della regione (una cella) resta fuori.
// → { n, pos: Float64Array(3n) (m comoventi), delta: Float32Array (lineare, oggi), densita: Float32Array (ρ/ρ̄ di
//     Zel'dovich), direzione: Float32Array(3n), classe: Uint8Array (2 filamento, 3 nodo), cella (l'indice nella griglia), segmenti: Int32Array(2m)
//     (coppie di indici), m, lunghezzaM (la somma dei segmenti), latoCellaM, griglia }
export function scheletro(cosmo, regione, opz = {}) {
  const G = opz.griglia ?? classiSuGriglia(cosmo, regione, opz), n = G.n, n2 = n * n, F = G.campo, dove = new Int32Array(n * n2).fill(-1), P = [], l = [0, 0, 0], fatti = new Set();
  const interp = (x, y, z) => { const i = stringi(Math.floor(x), 0, n - 2), j = stringi(Math.floor(y), 0, n - 2), k = stringi(Math.floor(z), 0, n - 2), u = x - i, v = y - j, w = z - k, q = k * n2 + j * n + i, d = F.delta;
    return (1 - w) * ((1 - v) * ((1 - u) * d[q] + u * d[q + 1]) + v * ((1 - u) * d[q + n] + u * d[q + n + 1])) + w * ((1 - v) * ((1 - u) * d[q + n2] + u * d[q + n2 + 1]) + v * ((1 - u) * d[q + n2 + n] + u * d[q + n2 + n + 1])); };
  for (let k = 1; k < n - 1; k++) for (let j = 1; j < n - 1; j++) for (let i = 1; i < n - 1; i++) { const q = k * n2 + j * n + i; if (G.classe[q] < 2) continue;
    const T = [F.xx[q], F.yy[q], F.zz[q], F.xy[q], F.xz[q], F.yz[q]]; autovalori(...T, l); const e1 = autovettore(...T, l[0]), e2 = autovettore(...T, l[1]), d0 = F.delta[q]; let cresta = true;
    for (const e of [e1, e2]) if (interp(i + e[0], j + e[1], k + e[2]) > d0 || interp(i - e[0], j - e[1], k - e[2]) > d0) { cresta = false; break; }
    if (!cresta) continue; dove[q] = P.length; P.push({ q, i, j, k, e3: autovettore(...T, l[2]) }); }
  const np = P.length, pos = new Float64Array(3 * np), delta = new Float32Array(np), densita = new Float32Array(np), direzione = new Float32Array(3 * np), classe = new Uint8Array(np), cella = new Int32Array(np), seg = []; let lunga = 0;
  P.forEach((p, a) => { [p.i, p.j, p.k].forEach((v, d) => { pos[3 * a + d] = posDi(G, d, v); direzione[3 * a + d] = p.e3[d]; }); delta[a] = G.delta[p.q]; densita[a] = 1 / G.volume[p.q]; classe[a] = G.classe[p.q]; cella[a] = p.q; });
  P.forEach((p, a) => { for (const verso of [1, -1]) { let meglio = -1, quanto = 0.5;
    for (let dk = -1; dk <= 1; dk++) for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { if (!di && !dj && !dk) continue; const b = dove[(p.k + dk) * n2 + (p.j + dj) * n + p.i + di]; if (b < 0) continue;
      const r = Math.hypot(di, dj, dk), c1 = (verso * (di * p.e3[0] + dj * p.e3[1] + dk * p.e3[2])) / r, e = P[b].e3, c2 = Math.abs(di * e[0] + dj * e[1] + dk * e[2]) / r; if (c1 > quanto && c2 > 0.5) { quanto = c1; meglio = b; } }
    if (meglio >= 0) { const lo = Math.min(a, meglio), hi = Math.max(a, meglio); if (!fatti.has(lo * np + hi)) { fatti.add(lo * np + hi); seg.push(lo, hi); lunga += Math.hypot(P[lo].i - P[hi].i, P[lo].j - P[hi].j, P[lo].k - P[hi].k) * G.latoCellaM; } } } });
  return { n: np, pos, delta, densita, direzione, classe, cella, segmenti: Int32Array.from(seg), m: seg.length / 2, lunghezzaM: lunga, latoCellaM: G.latoCellaM, griglia: G };
}
// SCENDERE SOTTO LA RISOLUZIONE (regola 4): lo stesso cosmo con le onde fino a un kmax più alto. Le onde in più sono
// eventi «radice/campo/onda x,y,z» (ampiezzeLibere di cosmo3d.js: la fonte unica, gli stessi che cosmo3d leggerebbe con
// quel kmax); quelle che c'erano restano IDENTICHE (con i loro vincoli). Serve la radice del campo: c'è per un cosmo
// della biblioteca, per un indirizzo, per campoLibero/campoCondizionato; altrimenti si dà in opz.radice.
// → un cosmo (da passare alle funzioni di qui) con kmax più alto; `aggiunte`: quante onde nuove, `risoluzioneM`
const raffinati = new Map();
export function raffina(cosmo, kmax, opz = {}) {
  if (campoDi(cosmo)) throw new Error('raffina vale per i campi di onde su un toro; il campo senza bordo si guarda più fine con `dettaglio`');
  const O = ondeDi(cosmo, opz); if (!(kmax > O.kmax)) return O; if (O.radice == null) throw new Error('raffina: di questo campo non conosco l\'indirizzo (opz.radice)');
  if (!(kmax <= 512)) throw new Error('raffina: kmax fino a 512');
  const chiave = `${kmax}`, gia = raffinati.get(O.A)?.get(chiave); if (gia) return gia;
  const O2 = ondeDelToro(O.toroM, kmax), { A, B } = ampiezzeLibere(O.radice, O.rami, O2), K = O.kmax, nk = 2 * K + 1, posto = new Int32Array(nk * nk * (K + 1)).fill(-1);
  for (let m = 0; m < O.N; m++) posto[O.KX[m] + K + nk * (O.KY[m] + K + nk * O.KZ[m])] = m;
  let messe = 0; for (let m = 0; m < O2.N; m++) { const a = O2.KX[m], b = O2.KY[m], c = O2.KZ[m]; if (Math.abs(a) > K || Math.abs(b) > K || c > K) continue; const v = posto[a + K + nk * (b + K + nk * c)]; if (v >= 0) { A[m] = O.A[v]; B[m] = O.B[v]; messe++; } }
  if (messe !== O.N) throw new Error('raffina: le onde lunghe non combaciano');
  const R = { ragnatela: 'onde', toroM: O.toroM, Lmpc: O.Lmpc, N: O2.N, KX: O2.KX, KY: O2.KY, KZ: O2.KZ, PK: O2.PK, A, B, kmax, radice: O.radice, rami: O.rami, libere: null, fissi: [], aggiunte: O2.N - O.N, risoluzioneM: O.toroM / kmax, daKmax: O.kmax };
  let s2 = 0; for (let m = 0; m < R.N; m++) s2 += 2 * R.PK[m]; R.sigma = Math.sqrt(s2);
  if (!raffinati.has(O.A)) raffinati.set(O.A, new Map()); const M = raffinati.get(O.A); if (M.size > 1) M.delete(M.keys().next().value); M.set(chiave, R); memoOnde.set(R.A, R); return R;
}
// quanto costa un toro (lato in m) con le onde fino a una lunghezza minima (m): onde, memoria, tempo per punto
export const costoDelToro = (latoM, lambdaMinM, msPerOnda = 5e-5 /* misurato: 1,5 ms per 28 888 onde */) => { const kmax = Math.ceil(latoM / lambdaMinM), onde = (2 * Math.PI / 3) * kmax ** 3; return { kmax, onde, memoriaByte: onde * 30 /* due ampiezze, la potenza, tre interi */, msPerPunto: onde * msPerOnda, msPerGenerarle: onde * 1e-3 /* misurato: ~0,25 s per 2·10⁵ onde */ }; };

// =====================================================================================================
// B. CHE COSA C'È LÌ
// =====================================================================================================
// LA NEBBIA DEGLI ALONI (regola 9): quanti aloni di materia oscura ci si aspetta entro un raggio (m comoventi) attorno a
// un punto, per fasce di massa. LEGGE: la funzione di massa di Press & Schechter 1974 CONDIZIONATA all'ambiente
// (insiemi di escursione: Bond et al. 1991, ApJ 379, 440; Mo & White 1996, MNRAS 282, 347 [R]): in una regione il cui
// contrasto lineare, mediato sulla sfera, è δ₀ (con varianza S₀ per le onde che ci sono), la soglia del collasso è più
// lontana o più vicina:
//   dn/dlnM = √(2/π)·(ρ̄/M)·ν·|dlnσ/dlnM|·(S/(S−S₀))·e^(−ν²/2),  ν = (δc/D − δ₀)/√(S − S₀),  S = σ²(M)
// (σ(M) e δc sono quelli di galassie.js; con δ₀ = S₀ = 0 è U.aloni: la stessa legge). Questo è il numero per unità di
// MATERIA (per Mpc³ di volume iniziale): la sua media sugli ambienti ridà la funzione di massa del cosmo. Nel volume di
// OGGI la materia della regione è (1+δ) volte più fitta, con δ dal collasso sferico: δ_lin = 1,68647 − 1,35/(1+δ)^(2/3)
// − 1,12431/(1+δ)^(1/2) + 0,78785/(1+δ)^0,58661 (Mo & White 1996, eq. 18 [R]: vale 0 in δ = 0 e 1,686 al collasso).
// In un vuoto gli aloni grandi spariscono e i piccoli restano: è ciò che si trova zoomando nel vuoto.
//   opz: { fasce: [[Mmin, Mmax], …] in M☉, t }
// → { raggioM, delta0 (lineare, oggi, mediato sulla sfera), sigma0, rapportoDiDensita (1+δ), dentroUnAlone (δ₀ oltre 0,9·δc:
//     la regione stessa è crollata; si conta come a 0,9·δc, come massaAlone di galassie.js), fasce: [{ da, a, attesi (quanti
//     nella sfera, oggi), perMpc3 (oggi), perMpc3DiMateria (per volume iniziale), senzaAmbiente (quanti nella sfera con la
//     densità media del cosmo), probabilitaNessuno (e^(−attesi)) }], fonte }
const linDaNonLin = (r) => DELTA_C - 1.35 * Math.pow(r, -2 / 3) - 1.12431 / Math.sqrt(r) + 0.78785 * Math.pow(r, -0.58661); // r = 1+δ
const nonLinDaLin = (d) => { let lo = 1e-3, hi = 1e4; for (let i = 0; i < 60; i++) { const m = Math.sqrt(lo * hi); if (linDaNonLin(m) < d) lo = m; else hi = m; } return Math.sqrt(lo * hi); };
export function aloniAttesi(cosmo, punto, raggioM, { fasce = [[1e6, 1e8], [1e8, 1e10], [1e10, 1e12], [1e12, 1e16]], t = 0 } = {}) {
  const Cp = campoDi(cosmo); let d0 = 0, S0 = 0, dentroUnAlone = false;
  if (Cp) { const F = FILTRI.sfera(raggioM); d0 = Cp.K.delta(punto, { filtro: F }); S0 = Cp.libero.varianza({ filtro: F }); } else {
  const O = ondeDi(cosmo), x = punto.map((p) => frazione(p / O.toroM)), K2 = O.kmax * O.kmax, W = new Float64Array(K2 + 1), q = (PI2 * raggioM) / O.toroM;
  for (let k2 = 1; k2 <= K2; k2++) { const y = q * Math.sqrt(k2); W[k2] = y < 1e-2 ? 1 - (y * y) / 10 : (3 * (Math.sin(y) - y * Math.cos(y))) / y ** 3; } // la finestra a sfera piena: la media vera nella sfera
  for (let m = 0; m < O.N; m++) { const a = O.KX[m], b = O.KY[m], c = O.KZ[m], w = W[a * a + b * b + c * c], tt = PI2 * (a * x[0] + b * x[1] + c * x[2]); d0 += 2 * w * (O.A[m] * Math.cos(tt) - O.B[m] * Math.sin(tt)); S0 += 2 * O.PK[m] * w * w; } }
  const D = U.D(scalaAl(t)), dc = LEGGI_GALASSIE.deltaC / D; if (d0 > 0.9 * dc) { dentroUnAlone = true; d0 = 0.9 * dc; }
  const rapporto = nonLinDaLin(D * d0), rho = U.Om * U.rhoC * 1e9 /* M☉/Mpc³ */, V = ((4 / 3) * Math.PI * raggioM ** 3) / MPC ** 3;
  const conta = (M0, M1, delta, S00) => { let s = 0; const nn = 80, l0 = Math.log(M0), dl = (Math.log(M1) - l0) / nn; for (let i = 0; i < nn; i++) { const m = Math.exp(l0 + (i + 0.5) * dl), sg = U.sigma(m), S = sg * sg; if (S <= S00) continue; const p = -(Math.log(U.sigma(m * 1.05)) - Math.log(U.sigma(m / 1.05))) / (2 * Math.log(1.05)), nu = (dc - delta) / Math.sqrt(S - S00); s += Math.sqrt(2 / Math.PI) * (rho / m) * nu * p * (S / (S - S00)) * Math.exp((-nu * nu) / 2) * dl; } return s; };
  return { raggioM, delta0: d0, sigma0: Math.sqrt(S0), rapportoDiDensita: rapporto, crescita: D, dentroUnAlone,
    fasce: fasce.map(([a, b]) => { const nL = conta(a, b, d0, S0), n = nL * rapporto, medio = conta(a, b, 0, 0); return { da: a, a: b, attesi: n * V, perMpc3: n, perMpc3DiMateria: nL, senzaAmbiente: medio * V, perMpc3Medio: medio, probabilitaNessuno: Math.exp(-n * V) }; }),
    fonte: '[R] Press & Schechter 1974 condizionata (Bond et al. 1991; Mo & White 1996) con σ(M) e δc di galassie.js; [R] Mo & White 1996 eq. 18 per 1+δ' };
}
// GLI ALONI UNO PER UNO in una regione { centro: [m], lato: m }: ciò che popola filamenti e vuoti quando si zooma tra le galassie.
// LETTURA DELLE COORDINATE: quella che conserva la massa. I nodi di un reticolo ASSOLUTO (quello delle celle del livello m del
// campo, passo g ≤ R(massaMinima)/1,5) sono elementi di materia; il campo senza bordo, alla risoluzione g, vi è letto come
// campo iniziale; ogni alone sta OGGI in q + Ψ(q) (Zel'dovich, lo stesso Ψ = v/(H₀f) delle velocità). Le galassie di cosmo3d
// hanno invece per posizione di oggi il punto q del loro picco (la carta): al prim'ordine le due letture coincidono, e lo
// scarto è |Ψ| (misurato nella prova sulle galassie della biblioteca).
// LEGGE (picchi con esclusione: Bond & Myers 1996, ApJS 103, 1 [R], nella forma più semplice): per le masse M = massaMinima·2^s,
// s = 0…5 (la più grande: 32·massaMinima; sopra stanno le galassie della biblioteca e la nebbia), δ mediato sulla sfera che
// contiene M (raggio R(M) = (3M/4πρ̄)^(1/3), ρ̄ di galassie.js). Un nodo è CANDIDATO alla massa M se lì δ_M ≥ δc/D(t) ed è un
// massimo tra i 26 vicini. Un candidato diventa un alone di massa M se nessun candidato a una massa più grande sta entro
// R(M) + R(M') (la massa grande vince: «la massa dal filtro»), nessun candidato della stessa massa più alto sta entro 2R(M),
// e non tocca la sfera di una galassia della biblioteca (che c'è già: non nasce due volte). L'esclusione guarda solo
// CANDIDATI (non aloni già decisi): la decisione dipende solo dal campo entro una finestra fissa attorno al nodo (raggio
// 2R(Mmax) + R(M)), mai dal bordo della regione chiesta: l'indirizzo è l'identità (regola 1). (Il prezzo: un candidato
// escluso da uno che a sua volta è escluso non rinasce: un po' meno aloni del vero, dichiarato.)
// Ogni alone è un evento col suo indirizzo «radice/aloni/passo m/cella i,j,k» (il nodo). Sotto massaMinima c'è la nebbia.
// → { aloni: [{ indirizzo, massa (M☉), posizione (m, oggi), iniziale (m: il nodo), spostamento (m), altezza (δ nella sfera),
//     galassia (l'indice in biblioteca, o null) }], n, passoM, attesi (Press–Schechter condizionata nella regione, per le masse
//     elencate), nebbia (le fasce di aloniAttesi sotto massaMinima), massaMassima, delta0 }
export function aloniIn(cosmo, regione, { massaMinima = 2e12, t = 0 } = {}) {
  const Cp = campoDi(cosmo); if (!Cp) throw new Error('aloniIn: vale per il campo senza bordo (un cosmo della biblioteca o un indirizzo)');
  const K = Cp.K, rho = U.Om * U.rhoC * 1e9, RL = (M) => Math.cbrt((3 * M) / (4 * Math.PI * rho)), SCALE = 5, Mmax = massaMinima * 2 ** SCALE;
  const m = Math.ceil(Math.log2(K.lato0 / (RL(massaMinima) / 1.5))), g = K.latoDi(m), lato = regione.lato / MPC, Rmax = RL(Mmax) / g;
  const margine = Math.ceil(3 * Rmax) + 3, i0 = regione.centro.map((c) => Math.floor((c / MPC - lato / 2) / g) - margine), nn = Math.ceil(lato / g) + 1 + 2 * margine; if (nn > 150) throw new Error(`aloniIn: regione troppo grande per questa massa minima (${nn}³ nodi)`);
  const G = K.grigliaFFT(i0.map((v) => v * g * MPC), m, nn, { livello: m }), d = G.delta, n2 = nn * nn, n3 = n2 * nn, soglia = LEGGI_GALASSIE.deltaC / U.D(scalaAl(t));
  // le medie sulle sfere, con la trasformata (la griglia messa in un cubo di zeri: valgono dove la sfera sta tutta dentro)
  let N = 8; while (N < nn + 2 * Math.ceil(Rmax) + 2) N *= 2; const N3 = N ** 3, re = new Float64Array(N3), im = new Float64Array(N3);
  for (let l = 0; l < nn; l++) for (let j = 0; j < nn; j++) for (let i = 0; i < nn; i++) re[(l * N + j) * N + i] = d[(l * nn + j) * nn + i];
  fft3(re, im, N); const Dr = Float64Array.from(re), Di = Float64Array.from(im), kr = new Float64Array(N3), ki = new Float64Array(N3);
  const candidati = [], idx = (i, j, k) => (k * nn + j) * nn + i;
  for (let sc = SCALE; sc >= 0; sc--) { const M = massaMinima * 2 ** sc, R = RL(M) / g, r = Math.ceil(R); kr.fill(0); ki.fill(0); let quanti = 0;
    for (let c = -r; c <= r; c++) for (let b = -r; b <= r; b++) for (let a = -r; a <= r; a++) if (a * a + b * b + c * c <= R * R) { kr[((((c % N) + N) % N) * N + ((b % N) + N) % N) * N + ((a % N) + N) % N] = 1; quanti++; }
    fft3(kr, ki, N); for (let q = 0; q < N3; q++) { const x = Dr[q] * kr[q] - Di[q] * ki[q], y = Dr[q] * ki[q] + Di[q] * kr[q]; kr[q] = x / quanti; ki[q] = y / quanti; } fft3(kr, ki, N, true);
    const dR = new Float64Array(n3).fill(-Infinity); for (let l = r; l < nn - r; l++) for (let j = r; j < nn - r; j++) for (let i = r; i < nn - r; i++) dR[idx(i, j, l)] = kr[(l * N + j) * N + i];
    for (let l = r + 1; l < nn - r - 1; l++) for (let j = r + 1; j < nn - r - 1; j++) for (let i = r + 1; i < nn - r - 1; i++) { const q = idx(i, j, l), v = dR[q]; if (!(v >= soglia)) continue; let massimo = true;
      for (let c = -1; c <= 1 && massimo; c++) for (let b = -1; b <= 1 && massimo; b++) for (let a = -1; a <= 1; a++) if ((a || b || c) && dR[q + (c * nn + b) * nn + a] > v) { massimo = false; break; }
      if (massimo) candidati.push({ sc, M, R, v, i, j, k: l }); } }
  // le galassie della biblioteca (nella regione col margine): ci sono già, con il loro alone
  const galassie = []; if (Cp.numero != null) { const C = cosmoDi(Cp.numero), Fc = campoCosmo(Cp.numero); Fc.pos.forEach((x, id) => { const c = x.map((v, a) => (v * Cp.toroM) / MPC / g - i0[a]); if (c.some((v) => v < -2 * Rmax || v > nn - 1 + 2 * Rmax)) return; galassie.push({ id, c, M: C.galassie[id].forma.alone.massa, R: RL(C.galassie[id].forma.alone.massa) / g, x }); }); }
  const lontano = (a, b, D) => (a.i - b.i) ** 2 + (a.j - b.j) ** 2 + (a.k - b.k) ** 2 >= D * D;
  const aloni = [], dentro = (i, j, k) => i >= margine && j >= margine && k >= margine && i < nn - margine && j < nn - margine && k < nn - margine;
  for (const c of candidati) { if (!dentro(c.i, c.j, c.k)) continue; let vive = true;
    for (const o of candidati) { if (o === c) continue; if (o.sc > c.sc ? !lontano(c, o, c.R + o.R) : o.sc === c.sc && (o.v > c.v || (o.v === c.v && idx(o.i, o.j, o.k) < idx(c.i, c.j, c.k))) && !lontano(c, o, 2 * c.R)) { vive = false; break; } }
    if (vive) for (const gl of galassie) if ((c.i - gl.c[0]) ** 2 + (c.j - gl.c[1]) ** 2 + (c.k - gl.c[2]) ** 2 < (c.R + gl.R) ** 2) { vive = false; break; }
    if (!vive) continue; const gi = [c.i + i0[0], c.j + i0[1], c.k + i0[2]], q = gi.map((v) => v * g * MPC), w = K.in(q, { livello: m }), psi = w.velocita.map((v) => (v / (COSMO.H0 * f0Crescita)) * MPC);
    aloni.push({ indirizzo: `${Cp.radice}/aloni/passo ${m}/cella ${gi.join(',')}`, massa: c.M, posizione: q.map((v, a) => v + psi[a]), iniziale: q, spostamento: psi, altezza: c.v, galassia: null }); }
  for (const gl of galassie) { const q = gl.x.map((v) => v * Cp.toroM); if (!q.every((v, a) => v >= regione.centro[a] - regione.lato / 2 && v < regione.centro[a] + regione.lato / 2)) continue; const psi = K.in(q, { livello: m }).velocita.map((v) => (v / (COSMO.H0 * f0Crescita)) * MPC);
    aloni.push({ indirizzo: `${Cp.radice}/galassia ${gl.id}`, massa: gl.M, posizione: q, iniziale: q, spostamento: psi, altezza: null, galassia: gl.id }); }
  aloni.sort((a, b) => b.massa - a.massa || a.indirizzo.localeCompare(b.indirizzo));
  const A = aloniAttesi(cosmo, regione.centro, Math.cbrt(3 / (4 * Math.PI)) * regione.lato, { fasce: [[1e6, 1e8], [1e8, massaMinima], [massaMinima, 2 * Mmax]], t });
  return { aloni, n: aloni.length, passoM: g * MPC, massaMassima: Mmax, attesi: A.fasce[2].perMpc3DiMateria * lato ** 3, attesiMedi: A.fasce[2].perMpc3Medio * lato ** 3, nebbia: A.fasce.slice(0, 2), delta0: A.delta0, candidati: candidati.length };
}
// CHE COSA C'È in un punto e a un tempo. Ogni voce: { valore…, unita, fonte } con la marca [V]/[R]/[D].
// La densità locale è quella media per il rapporto di Zel'dovich ρ/ρ̄ del punto (doveSono; se lì la materia è crollata,
// `crollato`, il numero è solo un ordine di grandezza: dentro un alone le densità le dà galassie.js).
// → { dove (doveSono), z, a, etaAnni, barioni, materiaOscura, fotoniDelFondo, neutrini, luceDelleGalassie,
//     campoMagnetico, aloni (aloniAttesi entro `raggio`, 10 Mpc se non detto) }
export function contenutoCosmico(cosmo, punto, t = 0, { scala = 0, raggio = 10 * MPC, dettaglio = null } = {}) {
  const w = doveSono(cosmo, punto, { scala, t, dettaglio }), a = scalaAl(t), z = 1 / a - 1, R = ricombinazione(), ro = w.densita, { mp, kB } = COSTANTI;
  const nb = ((OmB * RHO_C) / mp) * (1 + z) ** 3 * ro, nH = (1 - Y_ELIO) * nb, nHe = (Y_ELIO / 4) * nb;
  // lo stato del gas: prima della ricombinazione plasma; poi neutro (con il residuo di Peebles); dopo z_re ionizzato dalla luce delle prime stelle
  const dopo = z < R.zReionizzazione, xe = dopo ? 1 : R.xe(z), stato = dopo ? 'ionizzato (dalla luce di stelle e quasar, dopo la reionizzazione)' : xe > 0.5 ? 'plasma (prima della ricombinazione)' : 'neutro (tra la ricombinazione e la reionizzazione)';
  const Tfondo = DATI.T0 * (1 + z), Tgas = dopo ? DATI.gasIonizzato.T0 * Math.pow(Math.min(ro, 10) /* la legge vale per il gas diffuso, ρ/ρ̄ ≲ 10 [R Hui & Gnedin 1997] */, DATI.gasIonizzato.gamma - 1) : z > R.zTermico ? Tfondo : DATI.T0 * (1 + R.zTermico) * ((1 + z) / (1 + R.zTermico)) ** 2;
  const ne = dopo ? nH + nHe * (z < DATI.elioDoppio ? 2 : 1) : xe * nH;
  // l'idrogeno rimasto neutro nel gas ionizzato: equilibrio di fotoionizzazione x_HI = α_A(T)·n_e/Γ [R: Osterbrock: α_A = 4,2·10⁻¹³ cm³/s a 10⁴ K, ∝ T^−0,7]
  const G = DATI.gammaHI, gamma = (() => { if (z >= G[G.length - 1][0]) return G[G.length - 1][1]; let i = 0; while (G[i + 1][0] < z) i++; const f = (z - G[i][0]) / (G[i + 1][0] - G[i][0]); return Math.exp(Math.log(G[i][1]) * (1 - f) + Math.log(G[i + 1][1]) * f); })();
  const neutra = dopo ? Math.min(1, (4.2e-19 * Math.pow(Tgas / 1e4, -0.7) * ne) / gamma) : 1 - xe;
  const rhoDM = OmC * RHO_C * (1 + z) ** 3 * ro, nFot = N_FOTONI * (1 + z) ** 3, uEBL = (4 * Math.PI * (DATI.luceGalassie.ottico + DATI.luceGalassie.infrarosso)) / C_LUCE;
  return {
    dove: w, z, a, etaAnni: (U.tempo(1) + t / GA) * 1e9,
    barioni: { nucleoni: nb, idrogeno: nH, elio: nHe, elettroniLiberi: ne, unita: 'm⁻³', mediaCosmica: nb / ro, stato, frazioneNeutra: neutra, idrogenoNeutro: neutra * nH, temperatura: Tgas, unitaTemperatura: 'K', incerto: dopo ? 'T entro un fattore ~2; nei filamenti e nei nodi il gas scaldato dagli urti (10⁵–10⁷ K) non è calcolato; Γ entro un fattore ~2' : z < 30 ? 'tra le prime stelle e la reionizzazione i raggi X scaldano già il gas: qui c\'è solo il raffreddamento adiabatico (un limite inferiore)' : null,
      fonte: '[D] Ω_b·ρ_c/m_p·(1+z)³·ρ/ρ̄ con Ω_b, H₀ di leggi.js e Y di stelle.js; stato: [D] Peebles 1968 e z_re da τ [V Planck 2018]; T: [R] Hui & Gnedin 1997 dopo z_re, T_γ fino a z_t [R Peebles 1993] poi ∝ (1+z)²; neutri: [R] Haardt & Madau 2012' },
    materiaOscura: { densita: rhoDM, unita: 'kg/m³', energia: (rhoDM * C_LUCE ** 2) / COSTANTI.e / 1e9 / 1e6, unitaEnergia: 'GeV/cm³', particelle: null, incerto: 'la massa della particella non è nota: il numero per m³ non si può dire', fonte: '[D] (Ω_m − Ω_b)·ρ_c·(1+z)³·ρ/ρ̄ (leggi.js)' },
    fotoniDelFondo: { numero: nFot, unita: 'm⁻³', perCm3: nFot / 1e6, temperatura: Tfondo, energia: U_FOTONI * (1 + z) ** 4, unitaEnergia: 'J/m³', perBarione: N_FOTONI / ((OmB * RHO_C) / mp), fonte: '[D] corpo nero: n = (2ζ(3)/π²)(kT/ħc)³ con T₀ = 2,7255 K [V Fixsen 2009], ×(1+z)³: 411 per cm³ oggi; uniforme (le sue pieghe sono 10⁻⁵: fondoCosmico)' },
    neutrini: { perSpecie: (3 / 11) * nFot, unita: 'm⁻³ (neutrini più antineutrini)', perCm3PerSpecie: ((3 / 11) * nFot) / 1e6, tutteLeSpecie: (9 / 11) * nFot, temperatura: Math.cbrt(4 / 11) * Tfondo, incerto: 'la temperatura vale finché sono relativistici; con massa si addensano un poco negli aloni: non calcolato', fonte: '[D] n_ν = (3/11)·n_γ per specie, T_ν = (4/11)^(1/3)·T (disaccoppiamento prima dell\'annichilazione e⁺e⁻): 112 per cm³ oggi' },
    luceDelleGalassie: t === 0 ? { intensita: DATI.luceGalassie.ottico + DATI.luceGalassie.infrarosso, unita: 'W m⁻² sr⁻¹', energia: uEBL, unitaEnergia: 'J/m³', rispettoAlFondo: uEBL / U_FOTONI, fotoni: { ottico: (4 * Math.PI * DATI.luceGalassie.ottico) / C_LUCE / (PI2 * HC / 1e-6), infrarosso: (4 * Math.PI * DATI.luceGalassie.infrarosso) / C_LUCE / (PI2 * HC / 150e-6), unita: 'm⁻³ (contati a 1 µm e a 150 µm: ordine di grandezza)' }, incerto: 'è il valore MISURATO di oggi, uguale ovunque lontano dalle galassie; non è ancora ricavato dalle galassie del cosmo (∫ luce·peso lungo il cono di luce)', fonte: '[V] Driver et al. 2016: 24 ± 4 e 26 ± 5 nW m⁻² sr⁻¹' } : { intensita: null, incerto: 'misurata solo oggi; ad altri tempi andrebbe ricavata dalla storia delle galassie: non fatto' },
    campoMagnetico: { minimo: DATI.campoMagnetico.minimo, massimo: DATI.campoMagnetico.massimo * Math.pow(ro, 2 / 3) * (1 + z) ** 2, unita: 'T', incerto: 'MOLTO: tra il limite inferiore dai blazar e quello superiore dal fondo ci sono sette ordini di grandezza; l\'origine (primordiale o dalle galassie) non è nota. Il massimo è scalato col flusso congelato, B ∝ ρ^(2/3)', fonte: '[V] Neronov & Vovk 2010 (≥ 3·10⁻¹⁶ G); [V] Planck 2015 XIX (≲ 1–4 nG)' },
    aloni: aloniAttesi(cosmo, punto, raggio, { t }),
  };
}

// =====================================================================================================
// C. IL FONDO COSMICO
// =====================================================================================================
// LE SORGENTI DI UN'ONDA all'ultima diffusione, per unità del potenziale iniziale Φ = 1 (convenzioni di Dodelson 2003:
// ds² = −(1+2Ψ)dt² + a²(1+2Φ)dx²; in una sovradensità Φ > 0, Ψ < 0). Variabili: Φ, δ e V (= i·v) della materia oscura,
// δ_b, Θ₀, Θ₁ dei fotoni (i barioni si muovono con loro: v_b = −3iΘ₁), N₀…N_L dei neutrini. In ln a, con ℋ = aH/c:
//   Ψ = −Φ − 12(H₀/c)²Ω_ν N₂/(k a)²          Φ' = ℋΨ − k²Φ/3ℋ + (H₀²/2ℋc²)[(Ω_c δ + Ω_b δ_b)/a + 4(Ω_γ Θ₀ + Ω_ν N₀)/a²]
//   δ' = −kV − 3Φ'   V' = −ℋV + kΨ   δ_b' = −3kΘ₁ − 3Φ'   Θ₀' = −kΘ₁ − Φ'   Θ₁' = [kΘ₀/3 − ℋRΘ₁]/(1+R) + kΨ/3
//   N₀' = −kN₁ − Φ'   N₁' = (k/3)(N₀ − 2N₂ + Ψ)   N_l' = k/(2l+1)·[l N_{l−1} − (l+1) N_{l+1}]
// Condizioni iniziali adiabatiche fuori dall'orizzonte (Ma & Bertschinger 1995 [R]): Φ = 1, Ψ = −1/(1+2f_ν/5),
// Θ₀ = N₀ = −Ψ/2, δ = δ_b = −3Ψ/2, Θ₁ = N₁ = kηΨ/6, V = kηΨ/2, N₂ = (kη)²Ψ/30.
// k in 1/Mpc. → { S0 (= Θ₀+Ψ), S1 (= Θ₁), Phi, Psi, delta } all'istante aFine (se non detto: l'ultima diffusione, τ = 1)
const NU_L = 8;
export function sorgentiDelFondo(k, aFine = null) {
  const R = ricombinazione(), af = aFine ?? R.aUltima, n = 7 + NU_L, y = new Float64Array(n), k1 = new Float64Array(n), k2 = new Float64Array(n), k3 = new Float64Array(n), k4 = new Float64Array(n), yt = new Float64Array(n);
  const ai = Math.min(1e-6, (0.01 * CH * Math.sqrt(OmR)) / k), ei = TAB.eta(ai), P0 = -1 / (1 + 0.4 * F_NU), ke = k * ei;
  y[0] = 1; y[1] = y[3] = -1.5 * P0; y[2] = (ke * P0) / 2; y[4] = y[6] = -P0 / 2; y[5] = y[7] = (ke * P0) / 6; y[8] = (ke * ke * P0) / 30;
  let PsiUltimo = P0;
  const f = (la, v, d) => { const a = Math.exp(la), HH = a * E_(a) * CH, Rb = RB0 * a, eta = TAB.eta(a), Psi = -v[0] - (12 * CH * CH * OmNu * v[8]) / (k * k * a * a);
    const dPhi = HH * Psi - (k * k * v[0]) / (3 * HH) + ((CH * CH) / (2 * HH)) * ((OmC * v[1] + OmB * v[3]) / a + (4 * (OmG * v[4] + OmNu * v[6])) / (a * a));
    d[0] = dPhi; d[1] = -k * v[2] - 3 * dPhi; d[2] = -HH * v[2] + k * Psi; d[3] = -3 * k * v[5] - 3 * dPhi; d[4] = -k * v[5] - dPhi; d[5] = ((k * v[4]) / 3 - HH * Rb * v[5]) / (1 + Rb) + (k * Psi) / 3;
    d[6] = -k * v[7] - dPhi; d[7] = (k / 3) * (v[6] - 2 * v[8] + Psi);
    for (let l = 2; l <= NU_L; l++) { const su = l < NU_L ? v[6 + l + 1] : ((2 * NU_L + 1) * v[6 + NU_L]) / (k * eta) - v[6 + NU_L - 1]; d[6 + l] = (k / (2 * l + 1)) * (l * v[6 + l - 1] - (l + 1) * su); }
    for (let i = 0; i < n; i++) d[i] /= HH; PsiUltimo = Psi; };
  let la = Math.log(ai); const lf = Math.log(af);
  while (la < lf - 1e-12) { const a = Math.exp(la), HH = a * E_(a) * CH, h = Math.min(0.02, (0.12 * HH) / k, (4 * HH * HH) / (k * k) /* l'equazione di Φ è rigida sotto l'orizzonte: −k²Φ/3ℋ² */, lf - la);
    f(la, y, k1); for (let i = 0; i < n; i++) yt[i] = y[i] + 0.5 * h * k1[i]; f(la + h / 2, yt, k2); for (let i = 0; i < n; i++) yt[i] = y[i] + 0.5 * h * k2[i]; f(la + h / 2, yt, k3); for (let i = 0; i < n; i++) yt[i] = y[i] + h * k3[i]; f(la + h, yt, k4);
    for (let i = 0; i < n; i++) y[i] += (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]); la += h; }
  f(lf, y, k1);
  return { S0: y[4] + PsiUltimo, S1: y[5], Phi: y[0], Psi: PsiUltimo, delta: y[1], deltaBarioni: y[3] };
}
// DAL CAMPO DI OGGI AL POTENZIALE INIZIALE. Molto dopo la ricombinazione, a grande scala, Φ = Φ_m·T(k)·D₁(a)/a con
// Φ_m = (3/5)ζ e, per le condizioni iniziali sopra, ζ = (3/2)·(1+4f_ν/15)/(1+2f_ν/5)·Φ_iniziale; Poisson dà
// δ(oggi) = (2/3)·(k c/H₀)²/Ω_m · Φ_m·T(k)·D₁(1) [R: Dodelson eq. 7.5, con i neutrini di Ma & Bertschinger]. T(k) è quella
// del campo (BBKS in galassie.js, letta da U.potenza: una fonte); D₁(1) = lim a/D(a) (la crescita di galassie.js).
const ZETA_SU_PHI = (1.5 * (1 + (4 * F_NU) / 15)) / (1 + 0.4 * F_NU), G0 = 0.1 / U.D(0.1);
const T2BBKS = (() => { const k0 = 1e-6, n0 = U.potenza(k0) / Math.pow(k0, 3 + COSMO.ns); return (kMpc) => U.potenza(kMpc) / Math.pow(kMpc, 3 + COSMO.ns) / n0; })();
// q(k) = Φ_iniziale/δ_oggi per un'onda di numero d'onda k (1/Mpc)
const phiSuDelta = (k) => 1 / ((2 / 3) * (k / CH) ** 2 * (1 / COSMO.Om) * 0.6 * ZETA_SU_PHI * Math.sqrt(T2BBKS(k)) * G0);
// l'ampiezza primordiale che il campo sottintende: Δ²_ζ(k) = Δ²_δ(k)·q²·(ζ/Φ)² (riscontro: A_s = 2,1·10⁻⁹ a 0,05/Mpc [R Planck 2018])
export const ampiezzaPrimordiale = (kMpc = 0.05) => U.potenza(kMpc) * (phiSuDelta(kMpc) * ZETA_SU_PHI) ** 2;
// le funzioni di Bessel sferiche j_0…j_lmax in x (ricorrenza all'indietro di Miller, normalizzata su j_0 o j_1)
function bessel(x, lmax, out) {
  out.fill(0, 0, lmax + 1); if (x < 1e-6) { out[0] = 1; return out; }
  const j0 = Math.sin(x) / x, j1 = Math.sin(x) / (x * x) - Math.cos(x) / x, L = Math.floor(x + 20 * Math.cbrt(x / 2) + 20), cima = Math.min(lmax, L);
  let su = 0, qui = 1e-30, v0 = 0, v1 = 0;
  for (let l = L; l >= 0; l--) {
    if (Math.abs(qui) > 1e250) { qui *= 1e-250; su *= 1e-250; v1 *= 1e-250; for (let i = l + 1; i <= cima; i++) out[i] *= 1e-250; }
    if (l <= lmax) out[l] = qui; if (l === 1) v1 = qui; if (l === 0) v0 = qui;
    const giu = ((2 * l + 1) / x) * qui - su; su = qui; qui = giu;
  }
  const f = Math.abs(j0) > Math.abs(j1) ? j0 / v0 : j1 / v1; for (let l = 0; l <= cima; l++) out[l] *= f; return out;
}
// le funzioni di Legendre associate GIÀ NORMALIZZATE, Y_ℓm(θ, φ) = P̄_ℓ^m(cos θ)·e^(imφ) (con la fase di Condon–Shortley), per
// m ≥ 0, indice ℓ(ℓ+1)/2 + m. La ricorrenza è quella stabile sulle funzioni normalizzate (quella sulle P_ℓ^m nude perde
// i termini di m alto già a ℓ ~ 90: il fattore (ℓ−m)!/(ℓ+m)! esce dai numeri in doppia precisione).
function legendre(lmax, ct, st, P) {
  P[0] = Math.sqrt(1 / (4 * Math.PI));
  for (let m = 1; m <= lmax; m++) P[(m * (m + 1)) / 2 + m] = -Math.sqrt((2 * m + 1) / (2 * m)) * st * P[((m - 1) * m) / 2 + m - 1];
  for (let m = 0; m < lmax; m++) { P[((m + 1) * (m + 2)) / 2 + m] = Math.sqrt(2 * m + 3) * ct * P[(m * (m + 1)) / 2 + m];
    for (let l = m + 2; l <= lmax; l++) P[(l * (l + 1)) / 2 + m] = Math.sqrt((4 * l * l - 1) / (l * l - m * m)) * (ct * P[((l - 1) * l) / 2 + m] - Math.sqrt(((l - 1) * (l - 1) - m * m) / (4 * (l - 1) * (l - 1) - 1)) * P[((l - 2) * (l - 1)) / 2 + m]); }
  return P;
}
// le tabelle del fondo per un toro (una volta): per ogni |k|² intero presente, i pesi W0 = q·D·e^(−τ)·[Θ₀+Ψ] e
// W1 = 3·q·D·e^(−τ)·Θ₁ (ΔT/T di un'onda di ampiezza δ_k: W0 + i·μ·W1, μ = k̂·n)
const tabelleFondo = new Map();
function tabelle(O) {
  const chiave = `${O.toroM}|${O.kmax}`; if (tabelleFondo.has(chiave)) return tabelleFondo.get(chiave);
  const R = ricombinazione(), K2 = O.kmax * O.kmax, c_e = new Uint8Array(K2 + 1), W0 = new Float64Array(K2 + 1), W1 = new Float64Array(K2 + 1), molt = new Float64Array(K2 + 1), pk = new Float64Array(K2 + 1), opaco = Math.exp(-DATI.tauReionizzazione);
  for (let m = 0; m < O.N; m++) { const k2 = O.KX[m] ** 2 + O.KY[m] ** 2 + O.KZ[m] ** 2; c_e[k2] = 1; molt[k2]++; pk[k2] = O.PK[m]; }
  for (let k2 = 1; k2 <= K2; k2++) { if (!c_e[k2]) continue; const k = (PI2 * Math.sqrt(k2)) / O.Lmpc, s = sorgentiDelFondo(k), q = phiSuDelta(k) * R.smorza(k) * opaco; W0[k2] = q * s.S0; W1[k2] = 3 * q * s.S1; }
  const T = { W0, W1, molt, pk, K2 }; if (tabelleFondo.size > 3) tabelleFondo.delete(tabelleFondo.keys().next().value); tabelleFondo.set(chiave, T); return T;
}
// LO SPETTRO ATTESO C_ℓ (ΔT/T)², per un elenco di ℓ:
//   continuo (l'universo senza bordo, stesso seme primordiale): C_ℓ = 4π∫dlnk Δ²_Φ(k)·[W0·j_ℓ(kχ) + W1·j_ℓ'(kχ)]²
//   toro (la media sui cosmi di questo toro): C_ℓ = 4π·Σ_onde ⟨|δ_k|²⟩·[…]², le sole onde che nel toro ci sono
// (j_ℓ' viene dal termine Doppler: i·μ·e^(ikχμ) = d/d(kχ) e^(ikχμ)). → { ell, continuo, toro } (Float64Array)
const sorgentiContinue = (() => { let T = null; return () => { if (T) return T; const R = ricombinazione(), dk = 1e-3, n = 420, S0 = new Float64Array(n + 1), S1 = new Float64Array(n + 1), opaco = Math.exp(-DATI.tauReionizzazione); for (let i = 0; i <= n; i++) { const k = Math.max(i * dk, 2e-5), s = sorgentiDelFondo(k), d = R.smorza(k) * opaco; S0[i] = d * s.S0; S1[i] = 3 * d * s.S1; } return (T = { dk, n, S0, S1 }); }; })();
export function spettroAtteso(ell, cosmo = null, { raggioMpc = null } = {}) {
  const R = ricombinazione(), chi = raggioMpc ?? R.raggioMpc, lmax = Math.max(...ell), jl = new Float64Array(lmax + 2), continuo = new Float64Array(ell.length), toro = new Float64Array(ell.length);
  const C = sorgentiContinue(), kMax = C.n * C.dk, dk = 4e-5;
  for (let k = dk / 2; k < kMax; k += dk) { const x = k / C.dk, i = Math.min(C.n - 1, Math.floor(x)), u = x - i, q = phiSuDelta(k), w0 = q * (C.S0[i] + u * (C.S0[i + 1] - C.S0[i])), w1 = q * (C.S1[i] + u * (C.S1[i + 1] - C.S1[i])), peso = (U.potenza(k) * dk) / k, X = k * chi; bessel(X, lmax + 1, jl);
    for (let e = 0; e < ell.length; e++) { const l = ell[e], f = w0 * jl[l] + w1 * ((l > 0 ? (l * jl[l]) / X : 0) - jl[l + 1]); continuo[e] += 4 * Math.PI * peso * f * f; } }
  if (cosmo != null && !campoDi(cosmo)) { const O = ondeDi(cosmo), T = tabelle(O); for (let k2 = 1; k2 <= T.K2; k2++) { if (!T.molt[k2]) continue; const X = ((PI2 * Math.sqrt(k2)) / O.Lmpc) * chi; bessel(X, lmax + 1, jl);
    for (let e = 0; e < ell.length; e++) { const l = ell[e], f = T.W0[k2] * jl[l] + T.W1[k2] * ((l * jl[l]) / X - jl[l + 1]); toro[e] += 4 * Math.PI * 2 * T.molt[k2] * T.pk[k2] * f * f; } } }
  return { ell: [...ell], continuo, toro };
}
// IL FONDO COSMICO VISTO DA UN OSSERVATORE.
//   osservatore: { posizione: [m] (se manca: il centro del toro), velocita: [km/s] (se manca: quella del campo lì, cioè il
//                  moto lineare della materia; i moti dentro la galassia si aggiungono in `motoProprio`), motoProprio: [km/s] }
//   opz: { raggioM (per le prove: una sfera più piccola dell'ultima diffusione), doppler (true) }
// → { T0 (K), z (dell'ultima diffusione), raggioM, giriDelToro (raggio/lato), osservatore: { posizione, velocita (km/s) },
//     dipolo: { ampiezza (ΔT/T = v/c), verso, velocita (km/s), microK },
//     in(n, { dipolo = false }) → ΔT/T nella direzione n (versore), senza il dipolo dell'osservatore se non chiesto,
//     parti(n) → { isotropo (Sachs–Wolfe e picchi: [Θ₀+Ψ]), doppler (dei barioni lassù), dipolo (dell'osservatore) },
//     mappa(nLat) → { nLat, nLon, dati: Float32Array (ΔT/T; righe da nord a sud, colonne in longitudine), rms },
//     armoniche(lmax) → { lmax, re, im (a_ℓm, m ≥ 0, indice ℓ(ℓ+1)/2 + m), C: Float64Array (C_ℓ di QUESTO cielo) },
//     daArmoniche(alm, n) → la somma Σ a_ℓm Y_ℓm(n) (per le prove),
//     scartoAtteso (la radice della varianza attesa del cielo, media sui cosmi di questo toro), attesa(ell) (spettroAtteso),
//     topologia: { coppieDiCerchi, ellMinima (dove cade l'onda più lunga del toro), attraversamenti, cerchio(m, quanti) },
//     pesi: { W0, W1 } (per i vincoli), ricombinazione }
export function fondoCosmico(cosmo, osservatore = {}, { raggioM = null, doppler = true, ellMax = 30 } = {}) {
  { const C = campoDi(cosmo); if (C) return fondoPigro(C, osservatore, { doppler, ellMax }); }
  const O = ondeDi(cosmo), R = ricombinazione(), T = tabelle(O), { N, KX, KY, KZ } = O, chiM = raggioM ?? R.raggioM, giri = chiM / O.toroM;
  const pos = osservatore.posizione ?? [O.toroM / 2, O.toroM / 2, O.toroM / 2], x0 = pos.map((p) => frazione(p / O.toroM));
  const vCampo = nelPunto(O, x0).v, vel = (osservatore.velocita ?? vCampo).map((v, i) => v + (osservatore.motoProprio?.[i] ?? 0)), vAss = Math.hypot(...vel), beta = (vAss * 1e3) / C_LUCE;
  // le ampiezze ruotate della fase dell'osservatore, già moltiplicate per i pesi
  const a0 = new Float64Array(N), b0 = new Float64Array(N), a1 = new Float64Array(N), b1 = new Float64Array(N);
  for (let m = 0; m < N; m++) { const k2 = KX[m] ** 2 + KY[m] ** 2 + KZ[m] ** 2, t = PI2 * (KX[m] * x0[0] + KY[m] * x0[1] + KZ[m] * x0[2]), c = Math.cos(t), s = Math.sin(t), ar = O.A[m] * c - O.B[m] * s, br = O.A[m] * s + O.B[m] * c, w1 = doppler ? T.W1[k2] / Math.sqrt(k2) : 0; a0[m] = 2 * T.W0[k2] * ar; b0[m] = 2 * T.W0[k2] * br; a1[m] = 2 * w1 * ar; b1[m] = 2 * w1 * br; }
  const parti = (n) => { const g = PI2 * giri, nx = n[0], ny = n[1], nz = n[2]; let iso = 0, dop = 0;
    for (let m = 0; m < N; m++) { const kn = KX[m] * nx + KY[m] * ny + KZ[m] * nz, t = g * kn, c = Math.cos(t), s = Math.sin(t); iso += a0[m] * c - b0[m] * s; dop -= kn * (a1[m] * s + b1[m] * c); }
    return { isotropo: iso, doppler: dop, dipolo: ((vel[0] * nx + vel[1] * ny + vel[2] * nz) * 1e3) / C_LUCE }; };
  const in_ = (n, { dipolo = false } = {}) => { const p = parti(n); return p.isotropo + p.doppler + (dipolo ? p.dipolo : 0); };
  const mappa = (nLat = 32, o = {}) => { const nLon = 2 * nLat, dati = new Float32Array(nLat * nLon); let s = 0, w = 0; for (let i = 0; i < nLat; i++) { const th = (Math.PI * (i + 0.5)) / nLat, st = Math.sin(th), ct = Math.cos(th); for (let j = 0; j < nLon; j++) { const fi = (PI2 * (j + 0.5)) / nLon, v = in_([st * Math.cos(fi), st * Math.sin(fi), ct], o); dati[i * nLon + j] = v; s += st * v * v; w += st; } } return { nLat, nLon, dati, rms: Math.sqrt(s / w) }; };
  // la varianza attesa del cielo (media sul cielo e sui cosmi): Σ 2P·(W0² + W1²/3)
  let var0 = 0; for (let k2 = 1; k2 <= T.K2; k2++) var0 += 2 * T.molt[k2] * T.pk[k2] * (T.W0[k2] ** 2 + (doppler ? T.W1[k2] ** 2 / 3 : 0));
  // le armoniche: a_ℓm = 4π·i^ℓ·Σ_onde F_ℓ(k)·Y*_ℓm(k̂)·[c + (−1)^ℓ·c*], c = (A + iB)·e^(ik·x₀), F_ℓ = W0·j_ℓ(kχ) + W1·j_ℓ'(kχ)
  const armoniche = (lmax) => { const nl = ((lmax + 1) * (lmax + 2)) / 2, re = new Float64Array(nl), im = new Float64Array(nl), jl = new Float64Array(lmax + 2), Fl = new Map(), P = new Float64Array(nl), Lm = O.Lmpc, chi = chiM / MPC;
    for (let w = 0; w < N; w++) { const kx = KX[w], ky = KY[w], kz = KZ[w], k2 = kx * kx + ky * ky + kz * kz, k = Math.sqrt(k2); let F = Fl.get(k2);
      if (!F) { const X = ((PI2 * k) / Lm) * chi; bessel(X, lmax + 1, jl); F = new Float64Array(lmax + 1); for (let l = 0; l <= lmax; l++) F[l] = T.W0[k2] * jl[l] + (doppler ? T.W1[k2] * ((l * jl[l]) / X - jl[l + 1]) : 0); Fl.set(k2, F); }
      const t = PI2 * (kx * x0[0] + ky * x0[1] + kz * x0[2]), cr = O.A[w] * Math.cos(t) - O.B[w] * Math.sin(t), ci = O.A[w] * Math.sin(t) + O.B[w] * Math.cos(t), ct = kz / k, st = Math.sqrt(Math.max(0, 1 - ct * ct)), fi = Math.atan2(ky, kx);
      legendre(lmax, ct, st, P);
      for (let l = 0; l <= lmax; l++) { // 4π·i^ℓ·[c + (−1)^ℓ c*]: per ℓ pari 2·Re c·i^ℓ, per ℓ dispari 2i·Im c·i^ℓ
        const base = 4 * Math.PI * F[l] * 2 * (l % 2 === 0 ? cr : ci), fase = l % 2 === 0 ? l : l + 1, segno = fase % 4 === 0 ? 1 : -1, g = segno * base; // i^ℓ (ℓ pari) o i^(ℓ+1) (ℓ dispari): reale, ±1
        for (let m = 0; m <= l; m++) { const q = (l * (l + 1)) / 2 + m, yv = P[q] * g; re[q] += yv * Math.cos(m * fi); im[q] -= yv * Math.sin(m * fi); } } }
    const C = new Float64Array(lmax + 1); for (let l = 0; l <= lmax; l++) { let s = 0; for (let m = 0; m <= l; m++) { const q = (l * (l + 1)) / 2 + m; s += (m ? 2 : 1) * (re[q] ** 2 + im[q] ** 2); } C[l] = s / (2 * l + 1); }
    return { lmax, re, im, C }; };
  const daArmoniche = (alm, n) => { const { lmax, re, im } = alm, ct = n[2], st = Math.sqrt(Math.max(0, 1 - ct * ct)), fi = Math.atan2(n[1], n[0]), P = legendre(lmax, ct, st, new Float64Array(re.length)); let s = 0;
    for (let l = 0; l <= lmax; l++) for (let m = 0; m <= l; m++) { const q = (l * (l + 1)) / 2 + m; s += (m ? 2 : 1) * P[q] * (re[q] * Math.cos(m * fi) - im[q] * Math.sin(m * fi)); } return s; };
  // la topologia: le copie dell'osservatore a distanza d = L·|m| < 2χ tagliano la sfera in due cerchi che mostrano gli
  // STESSI punti del toro (Cornish, Spergel & Starkman 1998 [R]): raggio angolare α con cos α = d/2χ
  const cerchio = (m, quanti = 180) => { const d = Math.hypot(...m), ca = d / (2 * giri); if (!(ca < 1)) return null; const u = m.map((v) => v / d), sa = Math.sqrt(1 - ca * ca), t = Math.abs(u[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0], e1 = [u[1] * t[2] - u[2] * t[1], u[2] * t[0] - u[0] * t[2], u[0] * t[1] - u[1] * t[0]], n1 = Math.hypot(...e1), p = e1.map((v) => v / n1), q = [u[1] * p[2] - u[2] * p[1], u[2] * p[0] - u[0] * p[2], u[0] * p[1] - u[1] * p[0]], a = [], b = [];
    for (let i = 0; i < quanti; i++) { const f = (PI2 * i) / quanti, c = Math.cos(f) * sa, s = Math.sin(f) * sa; a.push([0, 1, 2].map((j) => ca * u[j] + c * p[j] + s * q[j])); b.push([0, 1, 2].map((j) => -ca * u[j] + c * p[j] + s * q[j])); } return { a, b, raggioAngolare: Math.acos(ca), copia: [...m] }; };
  const topologia = { coppieDiCerchi: Math.round((4 / 3) * Math.PI * (2 * giri) ** 3 / 2), ellMinima: PI2 * giri, attraversamenti: 2 * giri, facce: 4 * Math.PI * giri * giri, cerchio,
    nota: 'la sfera dell\'ultima diffusione è più grande del toro: lo stesso punto del toro si vede in più direzioni (cerchi uguali a coppie), e sotto ellMinima il cielo ha solo la potenza che le onde corte vi lasciano cadere' };
  return { T0: DATI.T0, z: R.zTau1, raggioM: chiM, giriDelToro: giri, osservatore: { posizione: pos, velocita: vel, delCampo: vCampo },
    dipolo: { ampiezza: beta, verso: vAss > 0 ? vel.map((v) => v / vAss) : [0, 0, 1], velocita: vAss, microK: beta * DATI.T0 * 1e6 },
    in: in_, parti, mappa, armoniche, daArmoniche, scartoAtteso: Math.sqrt(var0), attesa: (ell) => spettroAtteso(ell, O, { raggioMpc: chiM / MPC }), topologia, pesi: { W0: T.W0, W1: T.W1 }, x0, doppler, ricombinazione: R, onde: O, ragnatela: 'fondo' };
}

// IL FONDO DAL CAMPO SENZA BORDO (cieloPigro di campo_pigro.js): le stesse sorgenti, sulla sfera vera dell'ultima diffusione
// (14 Gpc), senza copie: nessun cerchio accoppiato, e a ℓ basso tutta la potenza. La mappa ha le scale fino a ℓ ≈ ellPiena
// (per intero) ed è zero oltre ellBanda: ellMax decide i livelli (e il costo: una direzione ~1 ms per ellMax 30).
function fondoPigro(C, osservatore, { doppler, ellMax }) {
  const R = ricombinazione(), pos = osservatore.posizione ?? [C.toroM / 2, C.toroM / 2, C.toroM / 2], vCampo = C.K.in(pos, { livello: C.livello }).velocita;
  const vel = (osservatore.velocita ?? vCampo).map((v, i) => v + (osservatore.motoProprio?.[i] ?? 0)), vAss = Math.hypot(...vel), beta = (vAss * 1e3) / C_LUCE, S = cieloPigro(C.K, { posizione: pos }, { ellMax, doppler });
  const parti = (n) => ({ ...S.parti(n), dipolo: ((vel[0] * n[0] + vel[1] * n[1] + vel[2] * n[2]) * 1e3) / C_LUCE });
  const in_ = (n, { dipolo = false } = {}) => { const p = parti(n); return p.isotropo + p.doppler + (dipolo ? p.dipolo : 0); };
  const mappa = (nLat = 32, o = {}) => { const nLon = 2 * nLat, dati = new Float32Array(nLat * nLon); let s = 0, w = 0; for (let i = 0; i < nLat; i++) { const th = (Math.PI * (i + 0.5)) / nLat, st = Math.sin(th), ct = Math.cos(th); for (let j = 0; j < nLon; j++) { const fi = (PI2 * (j + 0.5)) / nLon, v = in_([st * Math.cos(fi), st * Math.sin(fi), ct], o); dati[i * nLon + j] = v; s += st * v * v; w += st; } } return { nLat, nLon, dati, rms: Math.sqrt(s / w) }; };
  // le armoniche per quadratura di Gauss–Legendre (esatta fino al grado 2·NT − 1: la mappa è nulla oltre ellBanda)
  const armoniche = (lmax) => { const NT = Math.ceil((lmax + S.ellBanda) / 2) + 2, NF = 2 * NT, x = [], wq = []; for (let i = 0; i < NT; i++) { let z = Math.cos((Math.PI * (i + 0.75)) / (NT + 0.5)), dp = 1; for (let it = 0; it < 60; it++) { let p0 = 1, p1 = z; for (let k = 2; k <= NT; k++) { const p2 = ((2 * k - 1) * z * p1 - (k - 1) * p0) / k; p0 = p1; p1 = p2; } dp = (NT * (z * p1 - p0)) / (z * z - 1); const dz = p1 / dp; z -= dz; if (Math.abs(dz) < 1e-15) break; } x.push(z); wq.push(2 / ((1 - z * z) * dp * dp)); }
    const nl = ((lmax + 1) * (lmax + 2)) / 2, re = new Float64Array(nl), im = new Float64Array(nl), P = new Float64Array(nl);
    for (let i = 0; i < NT; i++) { const ct = x[i], st = Math.sqrt(1 - ct * ct); legendre(lmax, ct, st, P); for (let j = 0; j < NF; j++) { const fi = (PI2 * j) / NF, T = in_([st * Math.cos(fi), st * Math.sin(fi), ct]), w = (wq[i] * PI2) / NF; for (let l = 0; l <= lmax; l++) for (let m = 0; m <= l; m++) { const q = (l * (l + 1)) / 2 + m; re[q] += w * T * P[q] * Math.cos(m * fi); im[q] -= w * T * P[q] * Math.sin(m * fi); } } }
    const Cl = new Float64Array(lmax + 1); for (let l = 0; l <= lmax; l++) { let s = 0; for (let m = 0; m <= l; m++) { const q = (l * (l + 1)) / 2 + m; s += (m ? 2 : 1) * (re[q] ** 2 + im[q] ** 2); } Cl[l] = s / (2 * l + 1); }
    return { lmax, re, im, C: Cl, direzioni: NT * NF }; };
  const daArmoniche = (alm, n) => { const { lmax, re, im } = alm, ct = n[2], st = Math.sqrt(Math.max(0, 1 - ct * ct)), fi = Math.atan2(n[1], n[0]), P = legendre(lmax, ct, st, new Float64Array(re.length)); let s = 0;
    for (let l = 0; l <= lmax; l++) for (let m = 0; m <= l; m++) { const q = (l * (l + 1)) / 2 + m; s += (m ? 2 : 1) * P[q] * (re[q] * Math.cos(m * fi) - im[q] * Math.sin(m * fi)); } return s; };
  return { T0: DATI.T0, z: R.zTau1, raggioM: S.raggioM, giriDelToro: S.raggioM / C.toroM, osservatore: { posizione: pos, velocita: vel, delCampo: vCampo },
    dipolo: { ampiezza: beta, verso: vAss > 0 ? vel.map((v) => v / vAss) : [0, 0, 1], velocita: vAss, microK: beta * DATI.T0 * 1e6 },
    in: in_, parti, mappa, armoniche, daArmoniche, scartoAtteso: S.scartoAtteso, ellPiena: S.ellPiena, ellBanda: S.ellBanda, attesa: (ell) => spettroAtteso(ell),
    topologia: { coppieDiCerchi: 0, ellMinima: 0, attraversamenti: 0, facce: 0, cerchio: () => null, nota: 'il campo è senza bordo: nessuna copia dell\'osservatore, nessun cerchio accoppiato' },
    cielo: S.cielo, pesi: null, doppler, ricombinazione: R, pigro: true, ragnatela: 'fondo' };
}

// =====================================================================================================
// D. IL VERSO INVERSO: dal cielo, o da «qui c'è un filamento», al campo
// =====================================================================================================
// I VALORI TIPICI DEL TENSORE DI MAREA per classe, in unità dello scarto σ del campo: la distribuzione di Doroshkevich
// (1970) campionata qui [D]: per un campo gaussiano isotropo ⟨T_ij T_kl⟩ = (σ²/15)(δ_ij δ_kl + δ_ik δ_jl + δ_il δ_jk), cioè
// T_ii = √(2/15)·z_i + z₀/√15, T_ij = z_ij/√15 con sette campane indipendenti (eventi «ragnatela/doroshkevich/…»).
// → { frazioni: [4], autovalori: [4][3] (le medie di λ₁ ≥ λ₂ ≥ λ₃ per classe), n }
let doro = null;
export function doroshkevich(n = 40000) {
  if (doro && doro.n === n) return doro;
  const c = sorgente('ragnatela/doroshkevich'), conta = [0, 0, 0, 0], somma = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]], l = [0, 0, 0], a = Math.sqrt(2 / 15), b = 1 / Math.sqrt(15);
  for (let i = 0; i < n; i++) { const s = c.serie(`tensore ${i}`), z = (j) => campana(s(2 * j), s(2 * j + 1)), z0 = z(0); autovalori(a * z(1) + b * z0, a * z(2) + b * z0, a * z(3) + b * z0, b * z(4), b * z(5), b * z(6), l); const k = classeDi(l, 0); conta[k]++; for (let d = 0; d < 3; d++) somma[k][d] += l[d]; }
  return (doro = { n, frazioni: conta.map((v) => v / n), autovalori: somma.map((v, k) => v.map((x) => x / conta[k])) });
}
// I VINCOLI DI UNA COSA DETTA: «qui c'è un vuoto / un foglio / un filamento / un nodo», alla scala R.
//   { cosa, posizione: [m], scala: R (m), direzione: [versore] (per il filamento: lungo dove corre; per il foglio: la normale;
//     se manca, gli assi restano quelli che il campo ha già lì: si cambiano solo gli autovalori), altezza (1: i valori
//     tipici di quella classe; 2: due volte più marcata), forma (true) }
// SEI vincoli sul tensore di marea lisciato: T = Σ λ_a·e_a e_a, con gli autovalori tipici della classe (doroshkevich) per
// σ_R·altezza. Un vincolo lineare fissa VALORI, non disuguaglianze: «è un filamento» diventa «il tensore di marea vale
// quello di un filamento tipico» (così la classe in quel punto, a quella scala, è garantita). Con `forma: false` si dà
// solo la densità (UN vincolo senza forma, δ_R = la somma di quegli autovalori):
// dice «qui è vuoto quanto un vuoto tipico», ma non garantisce la classe (la prova misura quante volte la dà).
// → i vincoli ({ tipo: 'marea' | 'pendenza' | 'densita', … }) da dare a campoVincolato, anche insieme ad altri (regola 12)
export function vincoliDi(cosmo, { cosa, posizione, scala = 0, direzione = null, altezza = 1, forma = true, centrato = true }) {
  const k = CLASSI.indexOf(cosa); if (k < 0) throw new Error(`vincoliDi: cosa = ${CLASSI.join(' | ')}`); const Cp = campoDi(cosmo); let s2 = 0;
  if (Cp) s2 = Cp.libero.varianza(scala > 0 ? { scala } : { livello: Cp.livello }); else { const O = ondeDi(cosmo), W = finestra(O, scala); for (let m = 0; m < O.N; m++) { const w = W ? W[O.KX[m] ** 2 + O.KY[m] ** 2 + O.KZ[m] ** 2] : 1; s2 += 2 * O.PK[m] * w * w; } }
  const sR = Math.sqrt(s2), lam = doroshkevich().autovalori[k].map((v) => v * sR * altezza);
  if (!forma) return [{ tipo: 'densita', posizione: [...posizione], scala, valore: lam[0] + lam[1] + lam[2] }];
  let assi;
  if (direzione) { // la terna: per il filamento l'asse dato è quello che NON crolla (λ₃); per il foglio la normale è l'asse che crolla (λ₁)
    const nn = Math.hypot(...direzione), u = direzione.map((v) => v / nn), t = Math.abs(u[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    let p = [u[1] * t[2] - u[2] * t[1], u[2] * t[0] - u[0] * t[2], u[0] * t[1] - u[1] * t[0]]; const np = Math.hypot(...p); p = p.map((v) => v / np); const q = [u[1] * p[2] - u[2] * p[1], u[2] * p[0] - u[0] * p[2], u[0] * p[1] - u[1] * p[0]];
    assi = cosa === 'foglio' ? [u, p, q] : [p, q, u];
  } else assi = doveSono(cosmo, posizione, { scala }).assi;
  const out = [];
  for (const [i, j] of [[0, 0], [1, 1], [2, 2], [0, 1], [0, 2], [1, 2]]) out.push({ tipo: 'marea', posizione: [...posizione], scala, i, j, valore: lam[0] * assi[0][i] * assi[0][j] + lam[1] * assi[1][i] * assi[1][j] + lam[2] * assi[2][i] * assi[2][j] });
  // «qui»: la cosa è centrata nel punto. La pendenza della densità lisciata è zero lungo gli assi che crollano (per un
  // filamento i due perpendicolari: la cresta passa di lì; per un foglio la normale; per un nodo e per un vuoto tutti e
  // tre: è un massimo, o un minimo, non solo un valore). Sono altri vincoli lineari (guadagno i·(k·e)·W).
  if (centrato) for (const e of cosa === 'filamento' ? [assi[0], assi[1]] : cosa === 'foglio' ? [assi[0]] : assi) out.push({ tipo: 'pendenza', posizione: [...posizione], scala, direzione: [...e], valore: 0 });
  return out;
}
// I VINCOLI DI UNA MACCHIA DI CIELO: per ogni direzione osservata, il valore ΔT/T (già tolto il dipolo dell'osservatore,
// come si fa con le mappe vere). fondo: ciò che dà fondoCosmico per quell'osservatore (dice dove sta e a che raggio guarda).
//   doppler: true = il vincolo è sulla temperatura intera (isotropo + Doppler); false = solo il termine isotropo [Θ₀+Ψ].
export const vincoliDelCielo = (fondo, direzioni, valori, { doppler = fondo.doppler } = {}) => direzioni.map((n, i) => ({ tipo: 'cielo', fondo, direzione: [...n], valore: valori[i], doppler }));

// IL CAMPO VINCOLATO da vincoli lineari qualunque sulle onde: il conto è di campoCondizionato di bolle.js (Hoffman &
// Ribak 1991: una fonte), che accetta per ogni vincolo la sua FORMA, cioè il guadagno g dell'onda in quel vincolo:
//   c_j = Σ_onde 2·Re[(A + iB)·W_j·g_j·e^(ik·x_j)]
// Qui si scrivono solo le forme: densità lisciata g = 1; marea ij g = k_i k_j/k²; pendenza della densità lungo e
// g = i·(k·e) (in giri per lato: ∂δ/∂x·L/2π); cielo g = W0(k) + i·(k̂·n)·W1(k) nel punto x₀ + χ·n (W0, W1 di fondoCosmico).
// Per un cosmo della biblioteca i vincoli delle sue galassie restano (come in bolle.js), e χ² è quello dei vincoli nuovi.
// → { esiste, via: 'bolle.js', toroM, radice, gradi, chi2, probabilita, chi2Libero, ridondanti,
//     vincoli (ognuno con `libero`: quanto valeva nel campo di partenza, e `ottenuto`), onde: { A, B, … } (un cosmo per le
//     funzioni di qui), campo (ciò che dà campoCondizionato: in, attesa, misura…), liberta() → { gradiLiberi, gradiTotali,
//     varianzaLibera (la parte della varianza del campo, media sul toro, che i vincoli NON fissano) } }
const formaDi = (v) => {
  if (v.tipo === 'densita') return null;
  if (v.tipo === 'marea') { const i = v.i, j = v.j; return (kx, ky, kz, k2, out) => { out[0] = ((i === 0 ? kx : i === 1 ? ky : kz) * (j === 0 ? kx : j === 1 ? ky : kz)) / k2; out[1] = 0; return out; }; }
  if (v.tipo === 'pendenza') { const [a, b, c] = v.direzione; return (kx, ky, kz, k2, out) => { out[0] = 0; out[1] = kx * a + ky * b + kz * c; return out; }; }
  if (v.tipo === 'cielo') { const W0 = v.fondo.pesi.W0, W1 = v.doppler ? v.fondo.pesi.W1 : null, [a, b, c] = v.direzione; return (kx, ky, kz, k2, out) => { out[0] = W0[k2]; out[1] = W1 ? (W1[k2] * (kx * a + ky * b + kz * c)) / Math.sqrt(k2) : 0; return out; }; }
  throw new Error(`campoVincolato: tipo di vincolo sconosciuto (${v.tipo})`);
};
export function campoVincolato(cosmo, vincoli = []) {
  const Cp = campoDi(cosmo);
  if (Cp) { // il campo senza bordo: gli stessi vincoli, sulle celle (bolle.js → campo_pigro.js vincola)
    const base = { tipo: 'pigro', radice: Cp.radice, toroM: Cp.toroM, campo: Cp.libero, livello: Cp.livello, fissi: Cp.fissi };
    const r = campoCondizionato(base, vincoli.map((v) => (v.tipo === 'cielo' ? { tipo: 'cielo', cielo: v.fondo.cielo, direzione: v.direzione, doppler: v.doppler, valore: v.valore } : !v.tipo || v.tipo === 'densita' ? { posizione: v.posizione, scala: v.scala ?? 0, valore: v.valore } : { ...v })));
    if (!r.esiste) return { esiste: false, via: 'bolle.js', perche: r.perche, incompatibili: r.incompatibili };
    return { esiste: true, via: 'bolle.js', tipo: 'pigro', toroM: Cp.toroM, radice: Cp.radice, rami: Cp.rami, livello: Cp.livello, gradi: r.gradi, chi2: r.chi2, probabilita: r.probabilita, chi2Libero: r.chi2Libero, ridondanti: r.ridondanti,
      vincoli: r.vincoli.map((v) => ({ ...vincoli[v.dato], dato: v.dato, libero: v.libero, ottenuto: v.valore })), campo: r.campo, condizionato: r, liberta: r.liberta, fissiVincoli: Cp.fissi };
  }
  const O = ondeDi(cosmo), { N, KX, KY, KZ, PK, kmax } = O;
  const base = { radice: O.radice, toroM: O.toroM, kmax, N, KX, KY, KZ, PK, A: O.libere ? O.libere.A : O.A, B: O.libere ? O.libere.B : O.B, fissi: O.libere ? O.fissi : [] };
  const F = campoCondizionato(base, vincoli.map((v) => (v.tipo === 'cielo' ? { posizione: v.direzione.map((n, d) => v.fondo.osservatore.posizione[d] + v.fondo.raggioM * n), scala: 0, valore: v.valore, forma: formaDi(v) } : { posizione: v.posizione, scala: v.scala ?? 0, valore: v.valore, forma: formaDi(v) })));
  if (!F.esiste) return { esiste: false, via: 'bolle.js', perche: F.perche, incompatibili: F.incompatibili };
  return { esiste: true, via: 'bolle.js', toroM: O.toroM, radice: O.radice, rami: O.rami, kmax, gradi: F.gradi, chi2: F.chi2, probabilita: F.probabilita, chi2Libero: F.chi2Libero, ridondanti: F.ridondanti,
    vincoli: F.vincoli.map((v) => ({ ...vincoli[v.dato], dato: v.dato, libero: v.libero, ottenuto: v.valore })), A: F.onde.A, B: F.onde.B, onde: F.onde, campo: F, liberta: F.liberta };
}

// =====================================================================================================
// F. LA SCENA per il motore (la forma di scenaCosmo in spazio3d.js; src/tre/FORMATO.md)
// =====================================================================================================
// regione: { centro: [m comoventi], lato: m, celle: n } (se manca: tutto il toro, 32 celle per lato). t: secondi da oggi.
// Posizioni in METRI VERI a quel tempo (comoventi × a), dall'angolo del toro, in doppia precisione.
// → { livello: 'ragnatela', via, t, eta, riferimento, nelGenitore,
//     punti: lo scheletro { n, pos, densita (ρ/ρ̄ di Zel'dovich a quel tempo), delta (lineare a quel tempo), direzione, classe },
//     segmenti: { n, coppie: Int32Array(2n) (indici in punti), lunghezzaM },
//     vuoti: { n, pos, raggio (m veri), contrasto (ρ/ρ̄ − 1 nel centro), deltaMinimo }  (i minimi dei vuoti della regione),
//     nodi: { n, pos, densita } (i massimi di densità di classe nodo),
//     campi: { classe: { n, dati: Uint8Array(n³), nomi }, densita: { n, delta: Float32Array(n³), crescita, in(x) }, in(punto) → doveSono },
//     frazioni: { massa, volume } della regione, risoluzione: { ondeM, cellaM } }
export function scenaRagnatela(cosmo, regione = null, t = 0, opz = {}) {
  const Cp = campoDi(cosmo), O = Cp ? null : ondeDi(cosmo), toroM = Cp ? Cp.toroM : O.toroM, a = scalaAl(t), D = U.D(a), reg = regione ?? { centro: [toroM / 2, toroM / 2, toroM / 2], lato: toroM, celle: opz.celle ?? 32 };
  const G = classiSuGriglia(cosmo, reg, opz), S = scheletro(cosmo, reg, { griglia: G }), n = G.n, n2 = n * n, F = G.campo, l = [0, 0, 0];
  const zel = (q) => { autovalori(F.xx[q], F.yy[q], F.zz[q], F.xy[q], F.xz[q], F.yz[q], l); return 1 / Math.abs((1 - D * l[0]) * (1 - D * l[1]) * (1 - D * l[2])); };
  const pos = Float64Array.from(S.pos, (v) => v * a), dens = new Float32Array(S.n), delta = Float32Array.from(S.delta, (v) => v * D);
  for (let i = 0; i < S.n; i++) dens[i] = zel(S.cella[i]);
  // gli estremi: minimi di δ tra le celle di vuoto, massimi tra quelle di nodo (26 vicini, dentro il bordo)
  const vp = [], vr = [], vc = [], vd = [], np_ = [], nd = [];
  for (let k = 1; k < n - 1; k++) for (let j = 1; j < n - 1; j++) for (let i = 1; i < n - 1; i++) { const q = k * n2 + j * n + i, c = G.classe[q]; if (c !== 0 && c !== 3) continue; let estremo = true; const d0 = G.delta[q];
    for (let dk = -1; dk <= 1 && estremo; dk++) for (let dj = -1; dj <= 1 && estremo; dj++) for (let di = -1; di <= 1; di++) { if (!di && !dj && !dk) continue; const d = G.delta[q + dk * n2 + dj * n + di]; if (c === 0 ? d < d0 : d > d0) { estremo = false; break; } }
    if (!estremo) continue; const p = [i, j, k].map((v, d) => posDi(G, d, v) * a);
    if (c === 0) { // il raggio del vuoto: fin dove, dal centro, la classe resta vuoto (media sulle sei direzioni), in metri veri
      let r = 0; for (const [di, dj, dk] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) { let s = 1; while (s < n && i + s * di >= 0 && i + s * di < n && j + s * dj >= 0 && j + s * dj < n && k + s * dk >= 0 && k + s * dk < n && G.classe[q + s * (dk * n2 + dj * n + di)] === 0) s++; r += s - 0.5; }
      vp.push(...p); vr.push((r / 6) * G.latoCellaM * a); vc.push(zel(q) - 1); vd.push(d0 * D); } else { np_.push(...p); nd.push(zel(q)); } }
  const conta = [0, 0, 0, 0], vol = [0, 0, 0, 0]; let vt = 0; for (let q = 0; q < G.classe.length; q++) { conta[G.classe[q]]++; vol[G.classe[q]] += G.volume[q]; vt += G.volume[q]; }
  const lato = toroM * a;
  return { livello: 'ragnatela', via: { cosmo: typeof cosmo === 'number' || typeof cosmo === 'string' ? cosmo : (Cp ?? O).radice, regione: reg }, t, eta: (U.tempo(1) + t / GA) * 1e9,
    riferimento: { origine: Cp ? 'un angolo della regione delle galassie (lo spazio continua oltre)' : 'un angolo del toro', assi: 'x, y: quelle della carta piatta; z: la profondità', unita: 'm', periodico: Cp ? null : [lato, lato, lato], fattoreDiScala: a, redshift: 1 / a - 1, hubble: COSMO.H0 * U.E(a) },
    nelGenitore: null,
    punti: { n: S.n, pos, densita: dens, delta, direzione: S.direzione, classe: S.classe, cosa: 'lo scheletro dei filamenti: creste di densità nei punti di classe filamento (2) o nodo (3)' },
    segmenti: { n: S.m, coppie: S.segmenti, lunghezzaM: S.lunghezzaM * a },
    vuoti: { n: vr.length, pos: Float64Array.from(vp), raggio: Float64Array.from(vr), contrasto: Float32Array.from(vc), deltaMinimo: Float32Array.from(vd), cosa: 'i minimi di densità di classe vuoto: centro, raggio (fin dove resta vuoto), contrasto ρ/ρ̄ − 1 di Zel\'dovich' },
    nodi: { n: nd.length, pos: Float64Array.from(np_), densita: Float32Array.from(nd) },
    campi: { classe: { n, dati: G.classe, nomi: CLASSI, origine: G.origine.map((v) => v * lato), passo: G.passo * lato }, densita: { n, delta: G.delta, crescita: D, lato: reg.lato * a, in: (x) => (Cp ? Cp.K.delta(x.map((v) => v * toroM), { livello: livelloDet(Cp, opz.dettaglio) }) : nelPunto(O, x).delta) * D }, in: (punto) => doveSono(Cp ? cosmo : O, punto, { t, scala: opz.scala ?? 0, soglia: opz.soglia ?? 0, dettaglio: Cp ? opz.dettaglio ?? null : null }) },
    frazioni: { massa: conta.map((c) => c / G.classe.length), volume: vol.map((v) => v / vt), nomi: CLASSI },
    risoluzione: { ondeM: Cp ? 2 * Cp.K.latoDi(livelloDet(Cp, opz.dettaglio)) * MPC : O.toroM / O.kmax, cellaM: G.latoCellaM },
    figlio: () => ({ livello: 'cosmo', via: { cosmo } }),
  };
}

// per le prove e per chi vuole i numeri della cosmologia usata qui
export const dentro = { OmR, OmG, OmNu, F_NU, RB0, E: E_, TAB, ETA0, T_OGGI, N_FOTONI, U_FOTONI, RHO_C, H0s, CH, MPC, GA, nelPunto, autovalori, autovettore, bessel, phiSuDelta, ZETA_SU_PHI, G0, T2BBKS, tabelle, f0Crescita, legendre, sorgentiContinue, campoDi };
