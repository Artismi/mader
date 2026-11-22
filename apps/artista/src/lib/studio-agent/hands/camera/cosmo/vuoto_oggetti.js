// vuoto_oggetti.js — GLI OGGETTI CHE SI TROVANO ZOOMANDO tra le stelle (parte «b» di vuoto.js: leggi lì l'intestazione
// generale). Nubi molecolari (e, viste contro le stelle, nebulose oscure), regioni H II, nebulose a riflessione,
// nebulose planetarie, resti di supernova: ognuno è un EVENTO CON INDIRIZZO sotto quello della galassia
// («…/vuoto/nube/5.3.17/2»), e i numeri attesi non sono scelti: vengono da galassie.js e stelle.js.
//
// COME SONO FATTI (uguale per tutti i tipi): il disco è diviso in CELLE — l'anello di galassie.js, in strisce di raggio
// larghe ~¼ kpc, in settori presi RISPETTO AI BRACCI (un settore gira con l'onda). In ogni cella gli oggetti di un tipo
// sono un processo di Poisson: Γ₁ < Γ₂ < … sono somme di intervalli esponenziali (un evento per striscia, «nube/5.3/quanti»,
// con le estrazioni di ogni cella una dopo l'altra), e l'oggetto j esiste se Γ_j è sotto il numero atteso nella cella. Per i tipi che hanno una
// grandezza che li ordina (la massa di una nube, la massa della stella che accende una regione H II) Γ_j È quella
// grandezza: la massa dell'oggetto j è quella sopra la quale nella cella se ne aspettano Γ_j. Così i più grandi vengono
// per primi, la funzione di massa è quella giusta, e per elencare «quelli sopra una soglia» ci si ferma appena la si
// passa: non si genera mai ciò che non si mostra (regola 8). LA NEBBIA (regola 9): se nella regione gli oggetti attesi
// sono più di `massimo` si alza la soglia finché ne restano `massimo`, e si dice quanti sono davvero (`veri`); zoomando
// la soglia scende, e quelli di prima restano dov'erano con lo stesso indirizzo.
// I resti di supernova e le nebulose planetarie durano poco: sono eventi NEL TEMPO (cella × epoca), e a un tempo t si
// vedono quelli nati da meno della loro durata. Per questo la loro rarità non è scritta: è ritmo × durata.
//
// DA DOVE VENGONO I NUMERI (regola 7):
//   · nubi: la massa molecolare di ogni cella è l'integrale del gas molecolare di contenuto() (vuoto_mezzo.js): la somma
//     delle nubi ridà il gas molecolare (regola 4); la massa più grande è quella di Jeans del disco; pendenza −1,6 (misurata);
//   · regioni H II e nebulose a riflessione: le stelle che nascono oggi in quell'anello (forma.interno.nati), con la
//     distribuzione delle masse di leggi.js e le vite di stelle.js: numero = nascite × vita. Stanno sui bracci come le
//     stelle giovani del catalogo (forma.bracci.cdf: la stessa ripartizione di stelleGalassia);
//   · nebulose planetarie: le stelle che muoiono oggi lasciando una nana bianca, dalla storia di formazione dell'anello
//     (quante ne nacquero una vita fa) × la durata visibile (misurata: 0,9 pc a 42 km/s);
//   · resti di supernova: ritmoSupernove(forma), ripartito tra gli anelli come nel catalogo (collasso: dove nascono le
//     stelle; Ia: dove stanno le stelle), × la durata del resto (dalle sue fasi). Le ULTIME supernove di galassie.js
//     (stelleGalassia: fino a 8, stelle vere) sono quelle del catalogo, se lo si passa: stesso posto, stessa età.
// CHE COSA MANCA (dichiarato): una stella calda non è agganciata alla SUA nube madre (stanno entrambe sui bracci, ma
// indipendenti); nubi e stelle sono una fotografia di oggi (valgono per |t| piccolo rispetto alle loro vite, milioni
// di anni), solo resti e planetarie nascono e muoiono nel tempo; gli oggetti restano fermi rispetto all'onda dei bracci
// (non la attraversano); dentro la barra e nello sferoide non c'è niente; le stelle dello sferoide e quelle portate dalle
// fusioni non danno nebulose planetarie; le binarie non ci sono.
import { COSTANTI, MSOLE, LSOLE, ANNO, massaNascita } from './leggi.js';
import * as ST from './stelle.js';
import { LEGGI, ANELLI, popolazione, cinematica, faseBraccioAlTempo, dentro as GAL } from './galassie.js';
import { sorgente, logEsatto } from './eventi.js';
import { MEZZO, LARSON, KPC, PC, GA_S, quadro, contenuto, nubeDi, restoSupernova, fotoniSopra, parteDiLuce, coloreVero, dentroMezzo, neiGrani } from './vuoto_mezzo.js';

const K = COSTANTI, PI = Math.PI, PI4 = 4 * PI, PI2 = 2 * PI, Z = MEZZO, H_PLANCK = PI2 * K.hbar;
const stringi = (x, a, b) => Math.max(a, Math.min(b, x));
export const OGGETTI = Object.freeze({
  cella: 0.25, // (kpc) il lato di una cella: SCELTA DI CALCOLO (cambia gli indirizzi, non le statistiche)
  planetaria: { raggio: 0.9 * PC, velocita: 4.2e4, guscio: 0.2 * MSOLE }, // [V] Jacob, Schönberner & Steffen 2013 (A&A 558, A78; arXiv:1307.6189, riassunto): velocità vera media di espansione 42 km/s; arriva a 0,9 pc in 21000 ± 5000 anni. La massa ionizzata tipica, 0,1–0,3 M☉, è [R] (Pottasch 1984)
  mestel: [8.8e6, 5 / 7, 7 / 5, 1.5e5], // la nana bianca appena nata: la STESSA legge di galassie.js (stelleGalassia, Mestel 1952): formula riscritta, è privata là
  urtoHbeta: [7.44e-6, 2.41], // [R] un urto radiativo emette in Hβ 7,44·10⁻⁶·(v/100 km/s)^2,41·n erg/cm²/s (Dopita & Sutherland 1996, ApJS 102, 161, eq. 3.4)
  urtoBalmer: 3.0, urtoOIII: 2.0, // [R] dietro un urto Hα/Hβ ≈ 3; [O III]/Hβ ~ 2 (da 1 a 6) se l'urto supera ~100 km/s (Hartigan, Raymond & Hartmann 1987): INDICATIVO
  elio: 9.5, // (n_H/n_He)·(α_B(H)/α_B(He)) = 10·2,59/2,73: la zona dell'elio ionizzato di Strömgren (Osterbrock & Ferland 2006, § 2.4) [D]
  radio: 6e4, // [R] (anni) un resto si vede in radio per ~60 mila anni (Frail, Goss & Whiteoak 1994): solo per il riscontro con i ~300 resti noti
});
const O = OGGETTI;

// ---------- le stelle di una metallicità: vita, luce, temperatura, fine, per le masse di popolazione() (una volta per Z)
const perZ = new Map();
function stelleDi(Zr) {
  const kk = Math.round(Math.log10(Math.max(Zr, 1e-4)) * 20); if (perZ.has(kk)) return perZ.get(kk);
  const P = popolazione(), N = P.N, o = { vita: new Float64Array(N), L: new Float64Array(N), T: new Float64Array(N), sn: new Uint8Array(N), nb: new Uint8Array(N), resto: new Float64Array(N), iSN: N };
  for (let i = 0; i < N; i++) { const s = ST.stella(P.m[i], { Z: Zr }), f = ST.fine(P.m[i], 1e-4, { Z: Zr }); o.vita[i] = s.vita; o.L[i] = s.L * LSOLE; o.T[i] = s.T; o.sn[i] = f.supernova ? 1 : 0; o.nb[i] = f.tipo === 'nana bianca' ? 1 : 0; o.resto[i] = f.massa; if (f.supernova && o.iSN === N) o.iSN = i; }
  perZ.set(kk, o); return o;
}

// =====================================================================================================
// IL CENSIMENTO: per ogni anello, quanti oggetti di ogni tipo ci si aspetta e come sono distribuiti (pigro, per anello)
// =====================================================================================================
const censimenti = new WeakMap();
export function censimento(forma) {
  let Cn = censimenti.get(forma); if (Cn) return Cn;
  const Q = quadro(forma), A = forma.anelli, e = forma.interno, NR = ANELLI, nt = e.nt, P = popolazione(), B = forma.bracci, C = cinematica(forma), DTa = GAL.DT * 1e9;
  const natiOra = Array.from({ length: NR }, (_, k) => e.nati[nt * NR + k]), natiTot = natiOra.reduce((s, v) => s + v, 0), stelleTot = Array.from(A.sigmaStelle).reduce((s, v, k) => s + v * A.area[k], 0);
  const numero = Math.max(1, B.numero | 0), uniforme = Float64Array.from({ length: 49 }, (_, i) => i / 48), giovani = B.contrasto > 0 ? B.cdf : uniforme, vecchie = B.contrasto > 0 ? B.cdfVecchie : uniforme;
  const fatti = new Array(NR).fill(null);
  const anello = (k) => {
    if (fatti[k]) return fatti[k];
    const a = Q.anello(k), S = stelleDi(a.Z), b0 = A.bordo[k], b1 = A.bordo[k + 1], nr = Math.max(1, Math.round((b1 - b0) / O.cella)), spa = Math.max(1, Math.round((PI2 * A.r[k]) / (O.cella * numero))), ns = numero * spa;
    const nascite = natiOra[k] / DTa / P.massaMedia; // stelle che nascono all'anno nell'anello, oggi
    // --- LE NUBI: la massa molecolare dell'anello e come sta rispetto ai bracci (dall'integrale di contenuto())
    const NC = 48, NZ = 8, cdfMol = new Float64Array(NC + 1), h = LEGGI.spessoreGas; let mol = 0;
    for (let i = 0; i < NC; i++) { let s = 0; for (let q = 0; q < NZ; q++) { const u = -1 + (2 * (q + 0.5)) / NZ, z = h * Math.atanh(u), c = contenuto(forma, { r: A.r[k], z, fase: (i + 0.5) / NC - 0.5 }), ch = Math.cosh(z / h); s += c.gas.densita * c.gas.molecolare * (2 / NZ) * h * ch * ch * KPC; } mol += (s * a.area) / NC; cdfMol[i + 1] = mol; }
    if (mol > 0) for (let i = 0; i <= NC; i++) cdfMol[i] /= mol; else for (let i = 0; i <= NC; i++) cdfMol[i] = i / NC;
    const g = LARSON.pendenza, Mmin = a.nubeMin, Mmax = Math.max(a.jeansKg, 2 * Mmin), Kn = mol > 0 ? (mol * (2 - g)) / (Math.pow(Mmax, 2 - g) - Math.pow(Mmin, 2 - g)) : 0;
    const nubi = { molKg: mol, Mmin, Mmax, K: Kn, cdf: cdfMol, sopra: (M) => (M >= Mmax ? 0 : (Kn * (Math.pow(Math.max(M, Mmin), 1 - g) - Math.pow(Mmax, 1 - g))) / (g - 1)), massa: (Nn) => Math.pow((Nn * (g - 1)) / Kn + Math.pow(Mmax, 1 - g), 1 / (1 - g)) };
    nubi.totale = nubi.sopra(Mmin);
    // --- LE STELLE CALDE (regioni H II): quelle che finiranno in supernova; numero = nascite × vita, dalla più grande in giù
    const N = P.N, hii = new Float64Array(N + 1), rifl = new Float64Array(N + 1);
    for (let i = N - 1; i >= S.iSN; i--) hii[i] = hii[i + 1] + nascite * P.w[i] * S.vita[i];
    // --- LE NEBULOSE A RIFLESSIONE: le stelle sotto quella soglia finché la nube da cui sono nate c'è ancora (LARSON.vita),
    // se la loro luce supera quella delle altre stelle fin oltre il nucleo denso più piccolo (0,1 pc): R = √(L/4πcu)
    const rMin = Math.sqrt(a.nubeMin / (PI * (LARSON.sigmaSole / Math.max(a.Z, 0.05)))); let iRif = S.iSN;
    for (let i = S.iSN - 1; i >= 0; i--) { if (!(a.uStelle > 0) || Math.sqrt(S.L[i] / (PI4 * K.c * a.uStelle)) < rMin) break; iRif = i; }
    for (let i = S.iSN - 1; i >= iRif; i--) rifl[i] = rifl[i + 1] + nascite * P.w[i] * Math.min(S.vita[i], LARSON.vita);
    // --- LE NEBULOSE PLANETARIE: chi muore oggi lasciando una nana bianca (nato una vita fa, se la galassia c'era)
    const pnCum = new Float64Array(N + 1);
    for (let i = 0; i < N; i++) { let r = 0; if (S.nb[i] && isFinite(S.vita[i])) { const tN = GAL.T0 - S.vita[i] / 1e9; if (tN > e.inizio) { const j = stringi(Math.floor(tN / GAL.DT) + 1, 1, nt); r = (e.nati[j * NR + k] / DTa / P.massaMedia) * P.w[i]; } } pnCum[i + 1] = pnCum[i] + r; }
    // --- LE SUPERNOVE: il ritmo dell'anello; la durata di un resto nel gas medio dell'anello (come galassie.js: n ≥ 10³ m⁻³)
    const nRes = Math.max(1e3, a.nMedio), tFine = restoSupernova({ n: nRes, t: 0 }).tFine; let wSN = 0; for (let i = S.iSN; i < N; i++) wSN += P.w[i];
    const sn = { collasso: forma.ritmoSN.collasso * (natiTot > 0 ? natiOra[k] / natiTot : 0), Ia: forma.ritmoSN.Ia * (stelleTot > 0 ? (A.sigmaStelle[k] * A.area[k]) / stelleTot : 0), n: nRes, durata: tFine, uSN: 1 - wSN };
    return (fatti[k] = { k, a, S, b0, b1, nr, spa, ns, nascite, nubi, hii, rifl, iRif, pn: { ritmo: pnCum[N], cum: pnCum, durata: O.planetaria.raggio / O.planetaria.velocita / ANNO }, sn, z0: C.z0[k] });
  };
  Cn = { anello, numero, giovani, vecchie, get anelli() { return Array.from({ length: NR }, (_, k) => anello(k)); } };
  censimenti.set(forma, Cn); return Cn;
}
// quanti oggetti di ogni tipo ha tutta la galassia (attesi): per i riscontri, e per la nebbia a scala di galassia
export function quantiInTutto(forma) {
  const Cn = censimento(forma), o = { nubi: 0, nubiGiganti: 0, massaMolecolare: 0, regioniHII: 0, riflessione: 0, planetarie: 0, resti: 0, restiRadio: 0, stelleNasconoNelleNubi: 0, mortiPerAnno: 0 };
  for (const R of Cn.anelli) {
    o.nubi += R.nubi.totale; o.nubiGiganti += R.nubi.K > 0 ? R.nubi.sopra(1e5 * MSOLE) : 0; o.massaMolecolare += R.nubi.molKg / MSOLE; o.regioniHII += R.hii[R.S.iSN]; o.riflessione += R.rifl[R.iRif];
    o.planetarie += R.pn.ritmo * R.pn.durata; o.mortiPerAnno += R.pn.ritmo; o.resti += (R.sn.collasso + R.sn.Ia) * R.sn.durata; o.restiRadio += (R.sn.collasso + R.sn.Ia) * Math.min(R.sn.durata, O.radio);
    // quante stelle nascono nelle nubi di quell'anello, con l'1% per caduta libera: ∫ ε·M/t_ff dN [D], da confrontare con le nascite vere
    if (R.nubi.K > 0) { const NM = 40, h = Math.log(R.nubi.Mmax / R.nubi.Mmin) / NM; for (let i = 0; i < NM; i++) { const M = R.nubi.Mmin * Math.exp((i + 0.5) * h); o.stelleNasconoNelleNubi += nubeDi(M, R.a.Z).stelleAllAnno * R.nubi.K * Math.pow(M, -LARSON.pendenza) * M * h; } }
  }
  return o;
}

// =====================================================================================================
// LA GEOMETRIA DELLE CELLE
// =====================================================================================================
const cdfIn = (cdf, f) => { const x = stringi(f, 0, 1) * (cdf.length - 1), i = Math.min(cdf.length - 2, Math.floor(x)); return cdf[i] + (x - i) * (cdf[i + 1] - cdf[i]); };
const cdfInversa = (cdf, v) => { let lo = 0, hi = cdf.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cdf[m] <= v) lo = m; else hi = m; } const d = cdf[lo + 1] - cdf[lo]; return (lo + (d > 0 ? (v - cdf[lo]) / d : 0.5)) / (cdf.length - 1); };
// il peso di una cella (la parte dell'anello che le tocca): area × posto rispetto ai bracci
function pesoCella(R, i, s, cdf, numero) {
  const dr = (R.b1 - R.b0) / R.nr, r1 = R.b0 + i * dr, r2 = r1 + dr, b = s % R.spa;
  return (((r2 * r2 - r1 * r1) / (R.b1 * R.b1 - R.b0 * R.b0)) * (cdfIn(cdf, (b + 1) / R.spa) - cdfIn(cdf, b / R.spa))) / numero;
}
// dove sta l'oggetto di una cella: raggio (uniforme in area), angolo (secondo la ripartizione rispetto ai bracci, che al
// tempo tG girano con l'onda), altezza (strato sech² di spessore hz: z = hz·atanh(2u − 1)) [D]. o: la sorgente dell'oggetto
function postoIn(forma, R, i, s, cdf, numero, hz, o, tG) {
  const dr = (R.b1 - R.b0) / R.nr, r1 = R.b0 + i * dr, r2 = r1 + dr, r = Math.sqrt(r1 * r1 + o('raggio') * (r2 * r2 - r1 * r1)), braccio = Math.floor(s / R.spa), b = s % R.spa;
  const c1 = cdfIn(cdf, b / R.spa), c2 = cdfIn(cdf, (b + 1) / R.spa), f = cdfInversa(cdf, c1 + o('angolo') * (c2 - c1)), fi = faseBraccioAlTempo(forma, r, tG) + (PI2 * (braccio + f - 0.5)) / numero;
  const u = stringi(o('altezza'), 1e-9, 1 - 1e-9), z = hz * Math.atanh(2 * u - 1);
  return { r, fi, pos: [r * Math.cos(fi), r * Math.sin(fi), z], faseBraccio: f - 0.5 };
}
// le celle che una sfera (centro, raggio in kpc) può toccare: [{ k, i, s }]
function celleToccate(forma, Cn, centro, raggio, tG) {
  const Rc = Math.hypot(centro[0], centro[1]), fic = Math.atan2(centro[1], centro[0]), A = forma.anelli, out = [];
  for (let k = 0; k < ANELLI; k++) {
    if (A.bordo[k + 1] < Rc - raggio || A.bordo[k] > Rc + raggio) continue;
    const R = Cn.anello(k), dr = (R.b1 - R.b0) / R.nr;
    for (let i = 0; i < R.nr; i++) {
      const r1 = R.b0 + i * dr, r2 = r1 + dr; if (r2 < Rc - raggio || r1 > Rc + raggio) continue;
      const tutto = Rc <= raggio || raggio / Rc >= 1; let s0 = 0, quanti = R.ns;
      if (!tutto) { // l'arco che la sfera copre, allargato di quanto i bracci si avvolgono dentro la striscia
        const f1 = faseBraccioAlTempo(forma, r1 || 1e-3, tG), f2 = faseBraccioAlTempo(forma, r2, tG), meta = Math.asin(Math.min(1, raggio / Rc)) + 0.5 * Math.abs(f2 - f1) + PI2 / R.ns, fm = 0.5 * (f1 + f2);
        if (meta < PI) { const x0 = (((fic - meta - fm) * Cn.numero) / PI2 + 0.5) * R.spa, x1 = (((fic + meta - fm) * Cn.numero) / PI2 + 0.5) * R.spa; s0 = Math.floor(x0); quanti = Math.min(R.ns, Math.floor(x1) - s0 + 1); }
      }
      for (let q = 0; q < quanti; q++) out.push({ k, i, s: (((s0 + q) % R.ns) + R.ns) % R.ns });
    }
  }
  return out;
}

// =====================================================================================================
// CHE COSA EMETTE: righe (W) e colore vero
// =====================================================================================================
const riga = (nome, W) => ({ nome, nm: Z.righe[nome], W });
const HNU = (nm) => (H_PLANCK * K.c) / (nm * 1e-9);
const ABB_O = 10 ** (ST.DATI.metalli[2][2] - 12);
// UNA NEBULOSA DI GAS IONIZZATO DA UNA STELLA: che cosa emette, e a che temperatura sta. Tre conti, tutti [D] con dati atomici [R]:
//   1. Hα e Hβ dalle ricombinazioni (ogni fotone ionizzante assorbito ne paga una: caso B).
//   2. DOVE C'È O⁺⁺. L'ossigeno è due volte ionizzato dove l'elio è ionizzato (zona di Strömgren dell'elio: la parte
//      min(1, 9,5·Q₁/Q₀) del volume) E dove i fotoni sopra 35,1 eV vincono la ricombinazione: O⁺⁺/O⁺ = Q₂·σ/(4πr²·n_e·α) =
//      (r₁/r)². La media sul volume della parte O⁺⁺/(O⁺+O⁺⁺) è 3u²·(1 − u·atan(1/u)), u = r₁/R. (Attorno a una stella di
//      39000 K in gas denso viene ~0,9, come nella nebulosa di Orione; nel gas rado, dove la sfera è grande, molto meno.)
//      Allo stesso modo, con i fotoni sopra 54,9 eV e dentro la zona dell'elio ionizzato due volte, la parte salita a O³⁺
//      (solo attorno alle stelle delle planetarie): lì la riga verde manca.
//   3. LA TEMPERATURA NON È DATA: è quella a cui il gas perde quanto riceve (il «termostato» delle nebulose). Riceve
//      l'energia che avanza a ogni fotoionizzazione, ⟨hν⟩ − 13,6 eV (dallo spettro della stella: tutti i fotoni se la
//      nebulosa li assorbe tutti; pesati con la sezione d'urto ∝ ν⁻³ se è sottile, come un guscio di planetaria); perde
//      per ricombinazione, frenamento, e soprattutto per le righe eccitate dagli urti: [O III] 500,7 nm e [O II], [N II]
//      nel visibile, e le righe nell'infrarosso di O⁺⁺, N⁺, N⁺⁺, Ne⁺, Ne⁺⁺, S⁺⁺, S³⁺ (52, 88, 122, 205, 57, 12,8, 15,6, 18,7, 33,5, 10,5 µm);
//      sopra i 15000 K anche per C III] e C IV nell'ultravioletto e per Lyα eccitata dagli urti nel poco idrogeno neutro.
//      Più metalli → più righe → gas più FREDDO → la riga verde, che vuole 29000 K di salto, si spegne: per questo le
//      regioni H II ricche di metalli sono rosse di Hα, e [O III] è forte attorno alle stelle calde con pochi metalli.
// Abbondanze: O, N, Ne, S di stelle.js (DATI.metalli) per i metalli dell'anello; dell'ossigeno la parte fuori dai grani
// (neiGrani(Z), la legge di Rémy-Ruyer come nel mezzo); azoto, neon e zolfo non stanno nei grani. SEMPLIFICAZIONI: righe nel limite di bassa
// densità (le infrarosse si spengono sopra ~10³ atomi/cm³: nelle regioni compatte il gas vero è un po' più caldo); lo zolfo
// è tutto S⁺⁺ dove c'è O⁺ e tutto S³⁺ dove c'è O⁺⁺, il carbonio C⁺⁺ dove c'è O⁺⁺ e C³⁺ dove c'è O³⁺; mancano Ar e l'elio
// (gas un po' più caldo del vero), e le righe di N, Ne, S dove c'è O³⁺; stelle come corpi neri.
export const NEBULA = Object.freeze({
  ricombinazione: 0.7, frenamento: 1.85e-27, // [R] energia persa per ricombinazione in unità di kT (β_B/α_B) e frenamento 1,42·10⁻²⁷·g·√T erg·cm³/s con g = 1,3 (Osterbrock & Ferland 2006, § 3.2–3.4)
  // righe: [E/k (K), forza d'urto Ω, peso statistico del livello di partenza]. [R] Osterbrock & Ferland 2006, tab. 3.3–3.7 e 3.12–3.13
  tre: { O: [[555, 2.34, 2]], C: [[92900, 8.88, 2]] }, // dove c'è O³⁺ (stelle oltre ~80000 K): [O IV] 25,9 µm; C IV 154,9 nm
  due: { O: [[29169, 2.29, 9], [62100, 0.29, 9], [163, 0.55, 1], [441, 0.27, 1]], N: [[251, 1.45, 2]], Ne: [[925, 0.77, 5]], S: [[1369, 8.5, 2]], C: [[75400, 1.05, 1]] }, // dove c'è O⁺⁺: [O III] 500,7+495,9 nm, 436,3 nm, 88 e 52 µm; [N III] 57 µm; [Ne III] 15,6 µm; [S IV] 10,5 µm; C III] 190,9 nm
  una: { O: [[38600, 1.34, 4]], N: [[22000, 2.64, 9], [70, 0.41, 1], [188, 0.27, 1]], Ne: [[1123, 0.28, 4]], S: [[16290, 6.95, 9], [430, 3.98, 1], [1199, 1.31, 1]] }, // dove c'è O⁺: [O II] 372,7 nm; [N II] 658,4 nm, 205 e 122 µm; [Ne II] 12,8 µm; [S III] 953+907 nm, 33,5 e 18,7 µm
  // fotoionizzazione alla soglia (m²) e ricombinazione totale, radiativa + dielettronica (m³/s a 10⁴ K, esponente): [R], incerte di un fattore 2
  Opiu: { eV: 35.12, sigma: 7.3e-22, alfa: [3.7e-18, -0.65], elio: 24.587, zonaElio: 9.5 }, // O⁺ → O⁺⁺, dentro la zona dell'elio ionizzato una volta: (n_H/n_He)·(α_B(H)/α_B(He)) = 10·2,59/2,73 (Osterbrock & Ferland 2006, § 2.4)
  Opp: { eV: 54.93, sigma: 3.6e-22, alfa: [1.0e-17, -0.65], elio: 54.42, zonaElio: 1.9 }, // O⁺⁺ → O³⁺, dentro la zona dell'elio ionizzato due volte: 10·α_B(H)/α_B(He⁺), con α_B(He⁺, T) = 2·α_B(H, T/4) [D]
  neutro: 3, // lo spessore ottico, alla soglia dell'idrogeno, di una nebulosa che assorbe tutti i suoi fotoni: qualche unità. Da qui la parte di idrogeno rimasta neutra, 3/(n·σ·R), che raffredda con Lyα quando il gas supera i 15000 K (ORDINE DI GRANDEZZA)
});
const ABBONDANZA = (i) => 10 ** (ST.DATI.metalli[i][2] - 12); // per atomo di H nel Sole: C = 0, N = 1, O = 2, Ne = 3, S = 6
// la parte del volume di una nebulosa (raggio R in m, densità n in H per m³) dove uno ione è salito di un gradino: sta
// dentro la zona dell'elio che lascia passare quei fotoni, e lì lo ione superiore su quello inferiore vale (r₁/r)² [D]
function parteIonizzata(Q0, st, ione, n, R, Te) {
  const Q = fotoniSopra(st.Lw, st.T, ione.eV); if (!(Q > 0) || !(Q0 > 0)) return 0; const yHe = Math.min(1, (ione.zonaElio * fotoniSopra(st.Lw, st.T, ione.elio)) / Q0), RHe = R * Math.cbrt(yHe);
  const r1 = Math.sqrt((Q * ione.sigma) / (PI4 * 1.1 * n * ione.alfa[0] * Math.pow(Te / 1e4, ione.alfa[1]))), u = r1 / Math.max(RHe, 1e-300);
  return yHe * (u > 30 ? 1 - 0.6 / (u * u) : 3 * u * u * (1 - u * Math.atan(1 / u)));
}
// la temperatura di equilibrio (K) di una nebulosa attorno a una stella a Tstella, con metalli Zr; y: la parte di
// ossigeno che è O⁺⁺; y3: la parte che è O³⁺ (il resto è O⁺); neutro: la parte di idrogeno rimasta neutra
export function temperaturaNebulosa(Tstella, Zr, y, sottile = false, { y3 = 0, neutro = 0 } = {}) {
  const kT = K.kB * Tstella, x0 = (Z.ionizzazioni.H * K.e) / kT; let medio;
  if (sottile) { let s = 0; for (let n = 1; n < 40; n++) { const e = dentroMezzo.expint1(n * x0); s += e; if (e < 1e-12) break; } medio = (kT * -Math.log(-Math.expm1(-x0))) / s; } // ∫dx/(eˣ−1) / ∫dx/(x(eˣ−1))
  else medio = (kT * dentroMezzo.planck3(x0)) / dentroMezzo.planck2(x0);
  const gas = 1 - neiGrani(Zr), avanza = Math.max(0, medio - Z.ionizzazioni.H * K.e) * 1e7, kErg = K.kB * 1e7, ab = { C: ABBONDANZA(0) * Zr * gas, O: ABBONDANZA(2) * Zr * gas, N: ABBONDANZA(1) * Zr, Ne: ABBONDANZA(3) * Zr, S: ABBONDANZA(6) * Zr };
  const righe = (zona, T) => { let s = 0; for (const el in zona) for (const [E, om, g] of zona[el]) s += (ab[el] * om * kErg * E * Math.exp(-E / T)) / g; return s; };
  const sbilancio = (T) => { const aB = Z.alfaB[0] * Math.pow(T / 1e4, Z.alfaB[1]); return aB * NEBULA.ricombinazione * kErg * T + NEBULA.frenamento * Math.sqrt(T) + (8.629e-6 / Math.sqrt(T)) * (y3 * righe(NEBULA.tre, T) + y * righe(NEBULA.due, T) + Math.max(0, 1 - y - y3) * righe(NEBULA.una, T))
    + (neutro * Z.lyAlfa[0] * Math.exp(-Z.lyAlfa[1] / T)) / (1 + Math.sqrt(T / 1e5)) - aB * avanza; };
  let lo = 500, hi = 1e5; for (let k = 0; k < 27; k++) { const m = Math.sqrt(lo * hi); if (sbilancio(m) < 0) lo = m; else hi = m; } // (a meno di una parte su dieci milioni)
  return Math.sqrt(lo * hi);
}
// → { righe: [Hα, Hβ, [O III]] in watt, Te, y (parte di O⁺⁺), y3 (di O³⁺) }. st: { Lw, T } della stella; n, raggio: densità
// e raggio della nebulosa; limiteHalfa: se il gas è meno di quanto la stella potrebbe ionizzare (i gusci delle planetarie)
function righeNebulosa({ st, Zr, n, raggio, limiteHalfa = Infinity }) {
  const Q0 = fotoniSopra(st.Lw, st.T, Z.ionizzazioni.H), pieno = Q0 * Z.HalfaPerFotone * HNU(Z.righe.Halfa), Ha = Math.min(pieno, limiteHalfa), sottile = limiteHalfa < pieno, ric = Ha / (Z.HalfaPerFotone * HNU(Z.righe.Halfa)); // ricombinazioni al secondo
  const neutro = Math.min(1, NEBULA.neutro / (n * ST.dentro.SIGMA_K * raggio)) * (sottile ? limiteHalfa / pieno : 1); // (la sezione d'urto dell'idrogeno alla soglia: quella di stelle.js; un guscio sottile è ancora più ionizzato)
  let Te = Z.ionizzato.T, y = 0, y3 = 0; for (let giro = 0; giro < 2; giro++) { const alto = parteIonizzata(Q0, st, NEBULA.Opiu, n, raggio, Te); y3 = Math.min(alto, parteIonizzata(Q0, st, NEBULA.Opp, n, raggio, Te)); y = alto - y3; Te = temperaturaNebulosa(st.T, Zr, y, sottile, { y3, neutro }); }
  const aB = Z.alfaB[0] * Math.pow(Te / 1e4, Z.alfaB[1]), o = Z.OIII5007, q = ((8.629e-6 * o.omega) / (o.g * Math.sqrt(Te))) * Math.exp(-o.E / Te);
  return { righe: [riga('Halfa', Ha), riga('Hbeta', Ha / Z.balmer), riga('OIII', (ric / aB) * ABB_O * Zr * (1 - neiGrani(Zr)) * y * q * o.ramo * HNU(Z.righe.OIII))], Te, y, y3, sottile, Q0 };
}
const emette = (righe, continuo = null) => { const c = coloreVero(righe, continuo); return { righe, continuo, colore: c.rgb, visibile: righe.reduce((s, r) => s + r.W, 0) + (continuo?.W || 0) }; };

// =====================================================================================================
// GLI OGGETTI, tipo per tipo: da (anello, sorgente dell'oggetto, grandezza) alla scheda
// =====================================================================================================
function nube(R, M, o) {
  const n = nubeDi(M, R.a.Z), td = 16.4 * Math.pow(Math.max(R.a.uStelle / 8.6e-14, 1e-6), 1 / 6), tau = n.AV / 1.086;
  // non emette luce visibile: oscura le stelle dietro (A_V), e riemette nell'infrarosso lontano la luce che assorbe [D]
  return { tipo: 'nube molecolare', massaKg: M, raggio: n.raggio, nH: n.nH, T: n.T, velocitaInterna: n.sigmaV, viriale: n.viriale, cadutaLibera: n.cadutaLibera, massaDiJeans: n.jeansKg, quanteJeans: n.massaDiJeans, stelleAllAnno: n.stelleAllAnno,
    estinzione: n.AV, oscura: n.AV > 1, emette: { righe: [], continuo: { T: td, W: PI * n.raggio ** 2 * K.c * R.a.uStelle * -Math.expm1(-tau), dove: 'infrarosso lontano' }, colore: null, visibile: 0 }, vita: LARSON.vita, orientamento: PI * o('asse') };
}
function stellaCalda(R, i, fr, o, tAnni) {
  const P = popolazione(), m = P.m[i] * Math.pow((i + 1 < P.N ? P.m[i + 1] : P.m[i] * 1.05) / P.m[i], fr), vita = ST.stella(m, { Z: R.a.Z }).vita, eta = o('età') * vita + tAnni;
  if (eta < 0 || eta > vita) return null; const s = ST.stella(m, { Z: R.a.Z, eta }); return { m, eta, vita, Lw: s.L * LSOLE, T: s.T, raggioStella: s.R };
}
function regioneHII(R, i, fr, o, tAnni) {
  const st = stellaCalda(R, i, fr, o, tAnni); if (!st) return null;
  const Q0 = fotoniSopra(st.Lw, st.T, Z.ionizzazioni.H), nDiffuso = Math.max(1e3, R.a.nMedio), nellaNube = st.eta < LARSON.vita;
  const forma = (Te) => { // il raggio e la densità, con il gas ionizzato a Te
    const aB = Z.alfaB[0] * 1e-6 * Math.pow(Te / 1e4, Z.alfaB[1]), stromgren = (n) => Math.cbrt((3 * Q0) / (PI4 * aB * 1.1 * n * n)), fuori = stromgren(nDiffuso);
    if (nellaNube) { // ancora nella nube madre: la sfera di Strömgren a quella densità, che poi si allarga spinta dalla pressione
      // del gas ionizzato: R = R_S·(1 + 7·c·t/4R_S)^(4/7) (Spitzer 1978) [R], finché non sbuca nel gas diffuso
      const r0 = stromgren(R.a.nube.nH), cII = Math.sqrt((2.2 * K.kB * Te) / dentroMezzo.MASSA_PER_H), r = r0 * Math.pow(1 + (7 * cII * st.eta * ANNO) / (4 * r0), 4 / 7);
      if (r < fuori) return { raggio: r, n: R.a.nube.nH * Math.pow(r0 / r, 1.5), stato: r > 1.5 * r0 ? 'si allarga nella nube madre' : 'compatta, nella nube madre' };
    }
    return { raggio: fuori, n: nDiffuso, stato: 'nel gas diffuso' };
  };
  // la temperatura del gas dipende (poco) da quanto è grande la nebulosa, e il raggio (poco) dalla temperatura: si
  // ripete finché le due cose si accordano (due o tre giri)
  let Te = Z.ionizzato.T, F = null, N = null; for (let giro = 0; giro < 6; giro++) { F = forma(Te); N = righeNebulosa({ st, Zr: R.a.Z, n: F.n, raggio: F.raggio }); if (Math.abs(N.Te / Te - 1) < 1e-5) break; Te = N.Te; }
  return { tipo: 'regione H II', raggio: F.raggio, nH: F.n, T: N.Te, ossigenoDueVolte: N.y, stato: F.stato, stella: { massa: st.m, eta: st.eta, vita: st.vita, T: st.T, L: st.Lw, raggio: st.raggioStella }, ionizzanti: Q0, massaIonizzataKg: (PI4 / 3) * F.raggio ** 3 * F.n * dentroMezzo.MASSA_PER_H,
    emette: emette(N.righe) };
}
function riflessione(R, i, fr, o, tAnni) {
  const st = stellaCalda(R, i, fr, o, tAnni); if (!st || st.eta > LARSON.vita) return null;
  const raggio = Math.sqrt(st.Lw / (PI4 * K.c * R.a.uStelle)), pol = R.a.polvere, tau = (R.a.nube.nH * pol.AV * raggio) / 1.086, vis = st.Lw * parteDiLuce(st.T, 1.59, 3.26); // la luce tra 380 e 780 nm
  // la polvere della nube rimanda la luce della stella: la parte che incontra un grano (1 − e^−τ) per l'albedo; più blu
  // della stella, perché i grani piccoli diffondono di più le onde corte (lo stesso conto dell'estinzione) [D]
  return { tipo: 'nebulosa a riflessione', raggio, nH: R.a.nube.nH, T: Z.molecolare.T, stella: { massa: st.m, eta: st.eta, T: st.T, L: st.Lw }, spessoreOttico: tau,
    emette: emette([], { T: st.T, W: vis * Z.albedo.visibile * -Math.expm1(-tau), peso: (nm) => pol.estinzione(nm * 1e-9) / pol.AV, dove: 'luce della stella diffusa dalla polvere' }) };
}
function planetaria(R, o, eta) {
  // chi era: una delle stelle che muoiono oggi in quell'anello (in proporzione a quante ne muoiono di ogni massa)
  const P = popolazione(), i = Math.min(P.N - 1, Math.max(0, Math.round(cdfInversa(R.pn.cum, o('chi') * R.pn.ritmo) * P.N - 0.5))), m0 = P.m[i], mNana = R.S.resto[i], M = O.mestel;
  const raggio = O.planetaria.velocita * eta * ANNO, Rn = ST.fine(m0, 1e-4, { Z: R.a.Z }).raggio, Lw = LSOLE * Math.pow((M[0] * Math.pow(mNana, M[1])) / Math.max(eta, 1e4), M[2]), T = Math.min(M[3], Math.pow(Lw / (PI4 * Rn * Rn * K.sigma), 0.25));
  const Q0 = fotoniSopra(Lw, T, Z.ionizzazioni.H), n = O.planetaria.guscio / dentroMezzo.MASSA_PER_H / ((PI4 / 3) * raggio ** 3);
  // il guscio è poco: se la stella lo ionizza tutto, Hα è limitata dalla massa (ricombinazioni = α_B·n_e·n_p·V), non dai fotoni
  // (la ricombinazione a 10⁴ K: la temperatura vera del guscio esce dal bilancio, qui sotto, tra 10 e 13 mila K)
  const tutta = Z.alfaB[0] * 1e-6 * 1.1 * n * n * (PI4 / 3) * raggio ** 3 * Z.HalfaPerFotone * HNU(Z.righe.Halfa), N = righeNebulosa({ st: { Lw, T }, Zr: R.a.Z, n, raggio, limiteHalfa: tutta });
  return { tipo: 'nebulosa planetaria', raggio, nH: n, T: N.Te, ossigenoDueVolte: N.y, ossigenoTreVolte: N.y3, eta, velocita: O.planetaria.velocita, stella: { massaNascita: m0, massa: mNana, T, L: Lw, stato: 'nana bianca appena nata' }, ionizzanti: Q0, emette: emette(N.righe) };
}
// un resto di supernova di età `eta` (anni) nel gas di densità n: le fasi di vuoto_mezzo.js e ciò che emette
export function schedaResto({ n, eta, ia, espulsaKg, Zr = 1, resto = null }) {
  const r = restoSupernova({ n, t: eta, espulsaKg }), V = (PI4 / 3) * r.raggio ** 3, righe = []; let X = 0;
  if (r.fase === 'radiativa') { // l'urto irradia: Hβ dalla legge degli urti radiativi (per unità di superficie), Hα tre volte tanto, [O III] se dietro l'urto si superano 10⁵ K
    const Hb = Math.min(O.urtoHbeta[0] * Math.pow(r.v / 1e5, O.urtoHbeta[1]) * (n / 1e6) * 1e-3 * PI4 * r.raggio ** 2, 0.1 * 0.5 * dentroMezzo.MASSA_PER_H * n * r.v ** 3 * PI4 * r.raggio ** 2);
    righe.push(riga('Halfa', O.urtoBalmer * Hb), riga('Hbeta', Hb), riga('OIII', r.T > 1e5 ? O.urtoOIII * Hb : 0));
  } else if (r.fase !== 'dissolto') X = 4 * 1.2 * n * n * V * GAL.lambda(Math.max(r.T, 1e5), Zr); // gas a milioni di gradi: raggi X (il gas spazzato sta in un guscio quattro volte più denso: ∫n² = 4·n²·V) [D], con la curva di raffreddamento di galassie.js
  return { tipo: 'resto di supernova', raggio: r.raggio, velocita: r.v, fase: r.fase, T: r.T, eta, nH: n, daNanaBianca: !!ia, espulsaKg, spazzataKg: r.spazzataKg, momento: r.momento, durata: r.tFine, tRadiativa: r.tRadiativa, lascia: resto, raggiX: X,
    emette: righe.length ? emette(righe) : { righe: [], continuo: X > 0 ? { T: r.T, W: X, dove: 'raggi X' } : null, colore: null, visibile: 0 } };
}

// =====================================================================================================
// oggettiIn: GLI OGGETTI DI UNA REGIONE
// =====================================================================================================
// forma: la galassia; regione: { centro: [x, y, z] (kpc, riferimento della galassia: lo stesso di scenaGalassia), raggio (kpc) };
// t: secondi da oggi. opz: { caso (la sorgente della galassia: «cosmo 1/galassia 3»), catalogo (ciò che dà stelleGalassia
// o galassia(n, id): le ultime supernove vengono da lì), massimo (per tipo: oltre, la nebbia), tipi }.
// → { oggetti: [{ tipo, indirizzo, pos (kpc), raggio (m), …, emette: { righe: [{ nome, nm, W }], continuo, colore } }],
//     nebbia: { tipo: { veri (attesi nelle celle toccate), mostrati, soglia } }, celle }
const TIPI = ['nube molecolare', 'regione H II', 'nebulosa a riflessione', 'nebulosa planetaria', 'resto di supernova'];
export function oggettiIn(forma, regione, t = 0, { caso = sorgente('galassia'), catalogo = null, massimo = 400, tipi = TIPI } = {}) {
  const Cn = censimento(forma), tG = t / GA_S, tAnni = t / ANNO, centro = regione.centro, raggio = regione.raggio, celle = celleToccate(forma, Cn, centro, raggio, tG), c0 = caso.sotto('vuoto');
  const dentro = (p) => Math.hypot(p[0] - centro[0], p[1] - centro[1], p[2] - centro[2]) <= raggio, oggetti = [], nebbia = {};
  const perAnello = (peso) => { const W = new Float64Array(ANELLI); for (const c of celle) { c.w = peso(c); W[c.k] += c.w; } return W; };
  const intervallo = (s, j) => -logEsatto(1 - s(j)); // l'intervallo j di un processo di Poisson di ritmo 1 (esatto: decide chi esiste)
  // gli intervalli di tutte le celle di una striscia di raggio sono estrazioni dello stesso evento («nube/5.3/quanti»: la
  // cella s usa le estrazioni da s·65536 in su): così guardare una cella vuota costa un numero, non un indirizzo nuovo
  // (le celle arrivano in fila striscia per striscia: la serie si rifà solo quando la striscia cambia)
  const PER_CELLA = 65536, ultima = { nome: null, k: -1, i: -1, ep: null, s: null }, striscia = (nome, c, ep = null) => { if (ultima.nome !== nome || ultima.k !== c.k || ultima.i !== c.i || ultima.ep !== ep) { ultima.nome = nome; ultima.k = c.k; ultima.i = c.i; ultima.ep = ep; ultima.s = c0.serie(`${nome}/${c.k}.${c.i}${ep == null ? '' : `/epoca ${ep}`}/quanti`); } return ultima.s; };
  // --- i tipi ordinati da una grandezza: sopra(M) = quanti se ne aspettano nell'anello sopra M; fai(R, valore, sorgente)
  const ordinati = (tipo, nome, cdf, hz, attesiTot, valoreDi, fai) => {
    if (!tipi.includes(tipo)) return;
    const W = perAnello((c) => pesoCella(Cn.anello(c.k), c.i, c.s, cdf(c.k), Cn.numero)); let veri = 0; for (let k = 0; k < ANELLI; k++) if (W[k] > 0) veri += W[k] * attesiTot(Cn.anello(k));
    const taglio = veri > massimo ? massimo / veri : 1; let mostrati = 0;
    // (la nebbia: di ogni anello si tiene la stessa parte, dall'alto: i più grandi; zoomando la parte cresce e i primi restano)
    for (const c of celle) {
      const R = Cn.anello(c.k), tot = attesiTot(R) * c.w, fin = tot * taglio; if (!(fin > 0)) continue;
      const s = striscia(nome, c), s0 = c.s * PER_CELLA; let G = 0, nomeCella = null;
      for (let j = 0; j < PER_CELLA; j++) { G += intervallo(s, s0 + j); if (G >= fin) break; nomeCella ??= `${nome}/${c.k}.${c.i}.${c.s}`; const o = c0.sotto(`${nomeCella}/${j}`), p = postoIn(forma, R, c.i, c.s, cdf(c.k), Cn.numero, hz(R), o, tG); if (!dentro(p.pos)) continue; // (prima il posto: chi sta fuori dalla regione non si costruisce nemmeno)
        const ogg = fai(R, valoreDi(R, G / c.w), o); if (!ogg) continue; oggetti.push({ ...ogg, indirizzo: `${c0.radice}/${nomeCella}/${j}`, pos: p.pos, faseBraccio: p.faseBraccio, anello: c.k }); mostrati++; }
    }
    nebbia[tipo] = { veri, mostrati, soglia: taglio, cosa: taglio < 1 ? `i ${Math.round(massimo)} più grandi di ${Math.round(veri)}` : 'tutti' };
  };
  const prima = { nome: null, k: -1, i: -1, ep: null, s: null }, strisciaPrima = (nome, c, ep) => { if (prima.nome !== nome || prima.k !== c.k || prima.i !== c.i || prima.ep !== ep) { prima.nome = nome; prima.k = c.k; prima.i = c.i; prima.ep = ep; prima.s = c0.serie(`${nome}/${c.k}.${c.i}/epoca ${ep}/quanti`); } return prima.s; };
  const hGas = () => LEGGI.spessoreGas, indice = (cum, v, da) => { let lo = da, hi = cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] > v) lo = m; else hi = m; } return [lo, cum[lo] > cum[lo + 1] ? (cum[lo] - v) / (cum[lo] - cum[lo + 1]) : 0]; };
  ordinati('nube molecolare', 'nube', (k) => Cn.anello(k).nubi.cdf, hGas, (R) => R.nubi.totale, (R, N) => R.nubi.massa(N), (R, M, o) => (M >= R.nubi.Mmin ? nube(R, M, o) : null));
  ordinati('regione H II', 'stella calda', () => Cn.giovani, hGas, (R) => R.hii[R.S.iSN], (R, N) => indice(R.hii, N, R.S.iSN), (R, v, o) => regioneHII(R, v[0], v[1], o, tAnni));
  ordinati('nebulosa a riflessione', 'stella nella nube', () => Cn.giovani, hGas, (R) => R.rifl[R.iRif], (R, N) => indice(R.rifl, N, R.iRif), (R, v, o) => riflessione(R, v[0], v[1], o, tAnni));
  // --- i tipi che nascono e muoiono: in ogni cella e in ogni epoca (lunga quanto la durata) un processo di Poisson; a t si
  // vedono quelli con età tra 0 e la durata. ritmo(R): all'anno nell'anello; fai(R, sorgente, età)
  const nelTempo = (tipo, nome, cdf, hz, ritmo, durata, fai, salta = null) => {
    if (!tipi.includes(tipo)) return;
    const W = perAnello((c) => pesoCella(Cn.anello(c.k), c.i, c.s, cdf, Cn.numero)); let veri = 0; for (let k = 0; k < ANELLI; k++) if (W[k] > 0) veri += W[k] * ritmo(Cn.anello(k)) * durata(Cn.anello(k));
    const taglio = veri > massimo ? massimo / veri : 1; let mostrati = 0;
    for (const c of celle) {
      const R = Cn.anello(c.k), D = durata(R), perEpoca = ritmo(R) * c.w * D; if (!(perEpoca > 0)) continue; const e1 = Math.floor(tAnni / D);
      for (let ep = e1 - 1; ep <= e1; ep++) {
        const s = ep === e1 ? striscia(nome, c, ep) : strisciaPrima(nome, c, ep), s0 = c.s * PER_CELLA; let G = 0, nomeCella = null;
        for (let j = 0; j < PER_CELLA; j++) { G += intervallo(s, s0 + j); if (G >= perEpoca * taglio) break; nomeCella ??= `${nome}/${c.k}.${c.i}.${c.s}/epoca ${ep}`; const o = c0.sotto(`${nomeCella}/${j}`), nato = (ep + o('quando')) * D, eta = tAnni - nato; if (eta < 0 || eta >= D || (salta && salta(nato))) continue;
          const p = postoIn(forma, R, c.i, c.s, cdf, Cn.numero, hz(R), o, tG); if (!dentro(p.pos)) continue; const ogg = fai(R, o, eta); if (!ogg) continue; oggetti.push({ ...ogg, indirizzo: `${c0.radice}/${nomeCella}/${j}`, pos: p.pos, faseBraccio: p.faseBraccio, anello: c.k, nato }); mostrati++; }
      }
    }
    nebbia[tipo] = { veri, mostrati, soglia: taglio, cosa: taglio < 1 ? `un campione di ${Math.round(massimo)} su ${Math.round(veri)}, scelto per indirizzo` : 'tutti' };
  };
  nelTempo('nebulosa planetaria', 'planetaria', Cn.vecchie, (R) => R.z0, (R) => R.pn.ritmo, (R) => R.pn.durata, (R, o, eta) => planetaria(R, o, eta));
  // le supernove del catalogo (le ultime: stelle vere di galassie.js) coprono gli ultimi anni fino alla più vecchia di
  // loro: lì i resti sono i loro, e il processo di qui tace
  const ultime = (catalogo?.sorgenti || []).filter((x) => x.tipo === 'supernova'), finoA = ultime.length ? Math.max(...ultime.map((x) => x.eta)) : 0;
  const P = popolazione(), salta = (nato) => nato <= 0 && nato > -finoA;
  nelTempo('resto di supernova', 'supernova da collasso', Cn.giovani, hGas, (R) => R.sn.collasso, (R) => R.sn.durata, (R, o, eta) => { let m0 = massaNascita(R.sn.uSN + (1 - R.sn.uSN) * o('massa')), f = null; for (let it = 0; it < 40; it++) { f = ST.fine(m0, 1e-4, { Z: R.a.Z }); if (f.supernova) break; m0 *= 1.03; } return { ...schedaResto({ n: R.sn.n, eta, ia: false, espulsaKg: (m0 - f.massa) * MSOLE, Zr: R.a.Z, resto: f.tipo }), stella: { massaNascita: m0 } }; }, salta);
  const conResti = nebbia['resto di supernova'];
  nelTempo('resto di supernova', 'supernova Ia', Cn.vecchie, (R) => R.z0, (R) => R.sn.Ia, (R) => R.sn.durata, (R, o, eta) => schedaResto({ n: R.sn.n, eta, ia: true, espulsaKg: P.MCH * MSOLE, Zr: R.a.Z, resto: 'niente (è esplosa una nana bianca)' }), salta);
  if (conResti && nebbia['resto di supernova']) nebbia['resto di supernova'] = { veri: conResti.veri + nebbia['resto di supernova'].veri, mostrati: conResti.mostrati + nebbia['resto di supernova'].mostrati, soglia: Math.min(conResti.soglia, nebbia['resto di supernova'].soglia), cosa: nebbia['resto di supernova'].cosa };
  if (tipi.includes('resto di supernova')) for (const x of ultime) { // (del catalogo: posizione nel piano, in unità di forma.unitaKpc; l'altezza non c'è: 0)
    const pos = [x.pos[0] * forma.unitaKpc, x.pos[1] * forma.unitaKpc, 0], eta = x.eta + tAnni; if (eta < 0 || !dentro(pos)) continue; let k = 0; const r = Math.hypot(pos[0], pos[1]); while (k < ANELLI - 1 && forma.anelli.bordo[k + 1] < r) k++;
    const st = x.stella != null ? catalogo.stelle?.[x.stella] : null, R = Cn.anello(k), espulsa = st ? (st.massaNascita - st.massa) * MSOLE : P.MCH * MSOLE;
    oggetti.push({ ...schedaResto({ n: R.sn.n, eta, ia: !st, espulsaKg: espulsa, Zr: R.a.Z, resto: x.resto }), indirizzo: `${caso.radice}/${x.nome.replace('il resto della ', '')}`, pos, anello: k, nato: -x.eta, delCatalogo: true, stellaDelCatalogo: x.stella ?? null }); if (nebbia['resto di supernova']) { nebbia['resto di supernova'].mostrati++; nebbia['resto di supernova'].veri++; }
  }
  return { oggetti, nebbia, celle: celle.length, t, regione };
}

// la densità numerica attesa (per kpc³) di ogni tipo in un punto del piano: per «il più vicino» (vuoto.js)
export function densitaOggetti(forma, r) {
  const Cn = censimento(forma); let k = 0; while (k < ANELLI - 1 && forma.anelli.bordo[k + 1] < r) k++; const R = Cn.anello(k), V = (R.a.area / KPC ** 2) * 2 * LEGGI.spessoreGas, Vs = (R.a.area / KPC ** 2) * 2 * R.z0;
  return { 'nube molecolare': R.nubi.totale / V, 'nube molecolare gigante': (R.nubi.K > 0 ? R.nubi.sopra(1e5 * MSOLE) : 0) / V, 'regione H II': R.hii[R.S.iSN] / V, 'nebulosa a riflessione': R.rifl[R.iRif] / V, 'nebulosa planetaria': (R.pn.ritmo * R.pn.durata) / Vs, 'resto di supernova': (R.sn.collasso * R.sn.durata) / V + (R.sn.Ia * R.sn.durata) / Vs };
}
export const dentroOggetti = { stelleDi, pesoCella, postoIn, celleToccate, righeNebulosa, parteIonizzata, cdfIn, cdfInversa, TIPI };
