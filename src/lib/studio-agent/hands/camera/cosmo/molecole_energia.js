// molecole_energia.js — L'ENERGIA di una molecola qualsiasi: entalpia, entropia, energia libera, in gas e in acqua
// (vedi molecole.js per l'intestazione con le fonti).
//
// LEGGI:
//   · ENTALPIA DI FORMAZIONE (gas, 298 K) = Σ entalpie degli atomi liberi − Σ termini di legame. I termini sono: uno per
//     ogni legame (per elementi e ordine: C–H, C=O, C≡N, aromatico…), uno per ogni coppia di vicini pesanti sullo stesso
//     atomo (le interazioni «1,3» di Allen 1959: è lì che stanno la ramificazione, la stabilizzazione di un C=O da parte
//     di un alchile, la risonanza di acidi, esteri e ammidi, i doppi legami cumulati della CO2), e la tensione degli
//     anelli piccoli. I valori dei termini NON sono scritti: si ricavano ai minimi quadrati dalle entalpie MISURATE di un
//     insieme di molecole di riferimento (RIFERIMENTI, dichiarato qui sotto). Per un legame che i riferimenti non coprono
//     vale la regola di Pauling (media geometrica dei legami tra atomi uguali + 96,5·Δχ²): la «riserva»;
//   · ENTROPIA dalla meccanica statistica: traslazione (Sackur e Tetrode, dalla massa), rotazione (dai momenti
//     d'inerzia della forma e dal numero di simmetria), vibrazioni (un oscillatore per modo: gli stiramenti dalla regola
//     di Gordy 1946, i piegamenti da numeri d'onda caratteristici), rotazioni interne attorno ai legami semplici (rotore
//     libero o frenato, il minore dei due), degenerazione elettronica dei radicali;
//   · H e S a un'altra temperatura dalle stesse funzioni di partizione; G = H − T·S + RT·ln(P/1 bar);
//   · IN ACQUA: ΔG di idratazione per siti (cavità, carbonio apolare, donatori e accettori di legami a idrogeno), con i
//     coefficienti ricavati da energie di idratazione misurate (IDRATAZIONE); ioni semplici: Born; acidi e basi: pKa per
//     classe di sito + effetto induttivo dei sostituenti (ρ = 9,8 a due legami, ×0,4 a ogni legame in più) e tutti gli
//     stati di protonazione insieme (l'energia «trasformata» a un pH: è quella che decide le reazioni in acqua).
// Unità: kJ/mol, J/(mol·K), K, Pa.

import { atomo, raggioDiBorn, SIMBOLI, NUMERO } from './molecole_atomi.js';
import { molecola, chiave, anelli, ranghi, speculare, grezzo, componenti as componentiDi, coppieSolitarie, viciniSigma, sommaLegami, carica as caricaDi, conta } from './molecole_grafo.js';
import { forma, inerzia, numeroDiSimmetria, lunghezzaLegame, dominio } from './molecole_forma.js';
import { COSTANTI, ZERO_CELSIUS } from './leggi.js'; // le costanti e le unità: un posto solo

export const R = 8.314462618e-3; // kJ/(mol·K)
const KB = COSTANTI.kB, HP = COSTANTI.h, NA = COSTANTI.NA, UMA = COSTANTI.u, HC_K = 1.438777; // (h·c/k in cm·K)
const LN10 = Math.LN10;

// ---------- DATI: le molecole di riferimento (ΔHf gas, 298 K, kJ/mol)
// FONTI (riviste l'11-2026: il NIST WebBook e le tabelle NIST-JANAF sono «dati standard di riferimento» protetti, e non
// sono la fonte da citare). Diciotto molecole piccole (H2O, CH4, CO2, CO, NH3, HCN, H2CO, CH3OH, etano, propano, etilene,
// acetilene, benzene, etanolo, acido formico, acido acetico, urea, etilammina) hanno ora il valore delle Active
// Thermochemical Tables (Ruscic e Bross, ATcT versione 1.202 della rete termochimica, Argonne National Laboratory,
// atct.anl.gov, lette l'11-11-2026): rispetto a prima cambiano di meno di 1 kJ/mol tranne HCN (135,1 → 129,3),
// etilammina (−47,5 → −49,8) e acetilene (226,7 → 228,3). Le altre settantuno sono misure della letteratura primaria,
// raccolte da Pedley, Naylor e Kirby 1986 (Thermochemical Data of Organic Compounds, 2ª ed.), Pedley 1994, Cox, Wagman e
// Medvedev 1989 (CODATA) e Gurvich e altri 1989-94: sono state trovate consultando l'indice del WebBook e NON rilette
// sulle fonti primarie né su ATcT (resta da fare: è detto in testa a molecole.js).
export const RIFERIMENTI = [
  ['O', -241.81], ['C', -74.51], ['CC', -84.01], ['CCC', -104.99], ['CCCC', -125.6], ['CC(C)C', -134.2], ['CC(C)(C)C', -167.9], ['CCCCCC', -167.1],
  ['C1CCCCC1', -123.4], ['C1CC1', 53.3], ['C1CCC1', 28.4], ['C1CCCC1', -76.4], ['C=C', 52.4], ['CC=C', 20.41], ['CC=CC', -10.8], ['CC(C)=C', -17.9], ['C=CC=C', 108.8],
  ['C#C', 228.34], ['CC#C', 185.4], ['c1ccccc1', 83.19], ['Cc1ccccc1', 50.1],
  ['CO', -200.84], ['CCO', -234.89], ['CC(C)O', -272.8], ['CCCO', -256.0], ['COC', -184.1], ['COCOC', -348.2], ['C1CCOC1', -184.2], ['C1CO1', -52.64], ['OCCO', -389.0],
  ['C=O', -109.22], ['CC=O', -166.2], ['CC(C)=O', -217.1], ['CCC=O', -188.7], ['O=CC=O', -212.0],
  ['OC=O', -378.27], ['CC(=O)O', -432.59], ['COC(C)=O', -410.0], ['O=C=O', -393.48], ['[C-]#[O+]', -110.52],
  ['N', -45.56], ['CN', -22.5], ['CNC', -18.8], ['CN(C)C', -23.7], ['CCN', -49.79],
  ['C#N', 129.3], ['CC#N', 74.04], ['N#CC#N', 309.07], ['C=N', 69.0],
  ['NC=O', -186.0], ['CC(N)=O', -238.33], ['CNC(C)=O', -248.0], ['NC(N)=O', -234.56], ['C=CC#N', 180.6], ['C=CC=O', -77.6],
  ['S', -20.6], ['CS', -22.9], ['CSC', -37.5], ['CSSC', -24.1], ['O=S=O', -296.81], ['O=S(=O)=O', -395.77], ['CS(C)=O', -150.5], ['O=C=S', -138.41], ['S=C=S', 116.94], ['S=S', 128.6],
  ['Cl', -92.31], ['CCl', -81.9], ['ClC(Cl)(Cl)Cl', -95.7], ['F', -273.3], ['CF', -234.3],
  ['OO', -136.11], ['NN', 95.35], ['[N]=O', 91.3], ['[N-]=[N+]=O', 82.05], ['O[N+](=O)[O-]', -134.31], ['C[N+](=O)[O-]', -74.3], ['[O-][O+]=O', 142.67], ['ON=O', -76.73],
  ['c1ccncc1', 140.2], ['Nc1ccccc1', 87.03], ['Oc1ccccc1', -96.4], ['c1cc[nH]c1', 108.3], ['c1c[nH]cn1', 132.9], ['c1ccoc1', -34.8], ['c1ccsc1', 115.0], ['c1cncnc1', 195.8],
  ['P', 5.47], ['[SiH4]', 34.31], ['OC=C', -128.0],
];
// legami semplici tra atomi uguali (kJ/mol): Huheey, Keiter e Keiter 1993, app. E; per i metalli l'energia della
// molecola biatomica nel vapore [ricordati: servono solo alla regola di riserva, il cui errore è più grande del loro]
const OMO = { H: 436, Li: 105, Be: 208, B: 293, C: 346, N: 167, O: 142, F: 155, Na: 72, Mg: 129, Al: 186, Si: 222, P: 201, S: 266, Cl: 240, K: 49, Ca: 105, Sc: 163, Ti: 118, V: 269, Cr: 152, Mn: 61, Fe: 118, Co: 167, Ni: 204, Cu: 201, Zn: 22, Ga: 106, Ge: 188, As: 146, Se: 172, Br: 190, Mo: 436 };
const OMO_MULTIPLI = { C: [614, 839], N: [418, 945.36], O: [498.36, 0], S: [425, 0], P: [310, 490], Si: [310, 0] };
// ('gP:DD': due P=O sullo stesso fosforo, cioè il METAFOSFATO monomero. Senza questo termine le regole lo davano 81 kJ/mol
// SOTTO il fosfato (H3PO4 → HPO3 + H2O in discesa: ogni fosfato della rete si disfaceva in microsecondi); è invece un
// intermedio fugace, circa 110 kJ/mol sopra [ricordato, incerto: stime di Guthrie 1977 per l'idratazione di PO3⁻]: il
// termine è TARATO su quel numero, un parametro solo per tutti i metafosfati.)
// ('gc:im': l'imminolo HO–C=N. Lo schema additivo dà la stessa coppia di vicini ('gc:DX') all'ammide O=C–N e al suo
// tautomero N=C–OH, e l'idratazione per siti premia il secondo: in acqua l'imminolo risultava 33 kJ/mol SOTTO l'ammide,
// e nelle reti ogni ammide — ogni peptide — scivolava lì. Misurato/calcolato: l'ammide è più stabile di circa 50 kJ/mol
// [ricordato: formammide → acido formimidico, +46…+54 kJ/mol in fase gas e in acqua]. Il termine è TARATO perché in
// acqua torni +50: un parametro solo per tutti gli imminoli (in fase gas dà +83: troppo, dichiarato).)
// ('gc:am': l'ammidina N–C=N non aromatica. Per la stessa ragione — la coppia 'gc:DX' presa dagli acidi e dalle ammidi —
// un nitrile con l'ammoniaca dava l'ammidina con ΔG = −94 kJ/mol in acqua, e nelle reti ogni nitrile (l'amminoacetonitrile
// di Strecker) finiva lì invece di idrolizzarsi. In realtà l'addizione è circa in pari e l'ammidina si idrolizza
// all'ammide [ricordato, incerto]: il termine è TARATO perché nitrile + NH3 → ammidina valga circa −9 kJ/mol.)
const FOSFORO = { 'gO:YY': -34.0, 'gO:CY': 9.4, 'gO:Yc': -19.2, 'gP:DD': -191, 'gc:im': -83, 'gc:am': -85 };
// lo stato di riferimento di questi elementi È la molecola biatomica: il suo legame vale due volte l'entalpia dell'atomo
const BIATOMICI = { 'H-H': 1, 'N#N': 7, 'O=O': 8, 'F-F': 9, 'Cl-Cl': 17 };

// ---------- i termini di una molecola
const nomeAtomo = (m, k) => { const a = m.atomi[k]; return SIMBOLI[a.Z] + (a.q > 0 ? '+' : a.q < 0 ? '-' : ''); };
// (un eteroatomo aromatico che dà all'anello la sua coppia solitaria: l'azoto del pirrolo, l'ossigeno del furano)
const coppieNelAnello = (m, k) => !m.vic[k].some((v) => m.legami[v.k].t === 'c' && m.legami[v.k].o === 2);
export function termini(x) {
  const m = molecola(x); if (m._termini) return m._termini;
  const t = {}, piu = (k, n = 1) => { t[k] = (t[k] || 0) + n; }, nomi = m.atomi.map((_, k) => nomeAtomo(m, k));
  m.atomi.forEach((a, k) => { if (a.h) piu(a.Z === 1 ? 'H-H' : `${nomi[k]}-H`, a.h); });
  // i legami aromatici: quelli di una forma di Kekulé scelta in un modo che dipende solo dal grafo (gli atomi che
  // portano un doppio legame si accoppiano in ordine di rango canonico), più un termine per anello aromatico
  const doppio = new Set(), piAtomi = m.atomi.map((a, k) => a.ar && m.vic[k].some((v) => m.legami[v.k].ar && m.legami[v.k].o === 2));
  if (piAtomi.some(Boolean)) { const { cls } = ranghi(m), ordine = m.atomi.map((_, k) => k).filter((k) => piAtomi[k]).sort((x, y) => cls[x] - cls[y]), coppia = new Map();
    const prova = () => { let a = -1, meno = 99; for (const k of ordine) if (!coppia.has(k)) { const lib = m.vic[k].filter((v) => m.legami[v.k].ar && piAtomi[v.j] && !coppia.has(v.j)).length; if (lib < meno) { meno = lib; a = k; } }
      if (a < 0) return true; for (const v of m.vic[a].filter((w) => m.legami[w.k].ar && piAtomi[w.j] && !coppia.has(w.j)).sort((x, y) => cls[x.j] - cls[y.j])) { coppia.set(a, v.k); coppia.set(v.j, v.k); if (prova()) return true; coppia.delete(a); coppia.delete(v.j); } return false; };
    if (prova()) for (const k of coppia.values()) doppio.add(k); else m.legami.forEach((l, k) => { if (l.ar && l.o === 2) doppio.add(k); }); }
  m.legami.forEach((l, k) => { if (l.t === 'i') return; const [p, q] = m.atomi[l.a].Z < m.atomi[l.b].Z || (m.atomi[l.a].Z === m.atomi[l.b].Z && nomi[l.a] <= nomi[l.b]) ? [l.a, l.b] : [l.b, l.a], o = l.ar ? (doppio.has(k) ? 2 : 1) : l.o;
    piu(l.t === 'd' ? `${nomi[l.a]}>${nomi[l.b]}` : `${nomi[p]}${o === 3 ? '#' : o === 2 ? '=' : '-'}${nomi[q]}`); });
  // le coppie di vicini sullo stesso atomo. Le classi del vicino: C carbonio saturo, c carbonio insaturo legato con un
  // legame semplice a un centro insaturo (coniugazione), X azoto o ossigeno, Y altro eteroatomo, d =C, D =O/=N/=S, t legame triplo (negli anelli aromatici: come nella forma di Kekulé)
  const insaturo = (j) => m.atomi[j].ar || m.vic[j].some((v) => m.legami[v.k].t === 'c' && m.legami[v.k].o >= 2);
  // (un carbonio con il suo C=O legato a un ossigeno che dall'altra parte ha fosforo o zolfo: un'anidride mista, come l'acetil-fosfato)
  const acile = (j) => m.vic[j].some((v) => m.legami[v.k].t === 'c' && m.legami[v.k].o === 2 && !m.legami[v.k].ar && (m.atomi[v.j].Z === 8 || m.atomi[v.j].Z === 16));
  m.atomi.forEach((a, k) => { const cl = [], centroPi = insaturo(k);
    // (l'IMMINOLO, HO–C=N: il tautomero sfavorito dell'ammide; vedi 'gc:im' tra i termini tarati)
    { const doppioN = a.Z === 6 && !a.ar && m.vic[k].some((v) => { const l = m.legami[v.k]; return l.t === 'c' && !l.ar && l.o === 2 && m.atomi[v.j].Z === 7; }), semplice = (Z) => m.vic[k].some((v) => { const l = m.legami[v.k]; return l.t === 'c' && l.o === 1 && m.atomi[v.j].Z === Z; });
      if (doppioN && semplice(8)) piu('gc:im'); else if (doppioN && semplice(7)) piu('gc:am'); }
    for (const v of m.vic[k]) { const l = m.legami[v.k]; if (l.t !== 'c') continue; const C = m.atomi[v.j].Z === 6; const o = l.ar ? (doppio.has(v.k) ? 2 : 1) : l.o; cl.push(o === 3 ? 't' : o === 2 ? (C ? 'd' : 'D') : C ? ((centroPi && insaturo(v.j)) || (a.Z !== 6 && acile(v.j) && m.vic[k].some((w) => m.atomi[w.j].Z === 15 || m.atomi[w.j].Z === 16)) ? 'c' : 'C') : m.atomi[v.j].Z === 7 || m.atomi[v.j].Z === 8 ? 'X' : 'Y'); }
    for (let i = 0; i < cl.length; i++) for (let j = i + 1; j < cl.length; j++) { piu(`g${a.Z === 6 ? (centroPi ? 'c' : 'C') : SIMBOLI[a.Z]}:${[cl[i], cl[j]].sort().join('')}`); }
    // (l'effetto anomerico non si somma oltre: tre ossigeni sullo stesso carbonio saturo valgono due coppie, non tre)
    const nX = cl.filter((c) => c === 'X').length; if (a.Z === 6 && !centroPi && nX >= 3) piu('gC:XX', nX - 1 - (nX * (nX - 1)) / 2); });
  // (un anello è «aromatico» per l'energia solo se il sestetto è tutto suo: non i lattami come l'uracile, che hanno C=O fuori dall'anello e la risonanza delle ammidi)
  // la stabilizzazione aromatica cresce con il numero di atomi del sistema (benzene 150, naftalene 255, antracene 351 kJ/mol: 25 per atomo): un termine per atomo
  const in6 = new Set(), in5 = new Set();
  for (const r of anelli(m)) { const dentro = new Set(r); if (r.every((k) => m.atomi[k].ar) && !r.some((k) => m.vic[k].some((v) => !dentro.has(v.j) && m.legami[v.k].o === 2 && !m.legami[v.k].ar))) r.forEach((k) => (r.length === 6 ? in6 : in5).add(k)); else if (r.length <= 5) piu(`anello${r.length}`); }
  if (in6.size) piu('aromatico6', in6.size); const solo5 = [...in5].filter((k) => !in6.has(k)).length; if (solo5) piu('aromatico5', solo5);
  Object.defineProperty(m, '_termini', { value: t, enumerable: false });
  return t;
}
// la regola di riserva per un termine di legame (Pauling), 0 per le correzioni
function riserva(k) {
  const mm = /^([A-Z][a-z]?)[+*-]*([-=#:>])([A-Z][a-z]?)[+*-]*$/.exec(k); if (!mm) return 0;
  const [, a, tipo, b] = mm, A = atomo(a), B = atomo(b), dchi = A.chi != null && B.chi != null ? Math.abs(A.chi - B.chi) : 0, ion = 96.5 * dchi * dchi;
  const semplice = Math.sqrt((OMO[a] ?? 100) * (OMO[b] ?? 100)) + ion;
  const multiplo = (n) => { const ma = OMO_MULTIPLI[a]?.[n - 2] || (OMO[a] ?? 100) * (n === 2 ? 1.6 : 2.2), mb = OMO_MULTIPLI[b]?.[n - 2] || (OMO[b] ?? 100) * (n === 2 ? 1.6 : 2.2); return (ma + mb) / 2 + n * ion; };
  return tipo === '-' ? semplice : tipo === '=' ? multiplo(2) : tipo === '#' ? multiplo(3) : tipo === ':' ? (semplice + multiplo(2)) / 2 + 15 : 0.5 * semplice;
}
const fisso = (k) => (BIATOMICI[k] ? 2 * atomo(BIATOMICI[k]).HfAtomo : null);
const atomizzazione = (m) => { let s = 0; for (const a of m.atomi) s += atomo(a.Z).HfAtomo + a.h * atomo(1).HfAtomo; return s; };

// i termini ricavati dai riferimenti (una volta sola): minimi quadrati, tenuti vicino alla riserva dove i dati non dicono
let TERMINI = null;
export function termochimica({ escludi = null } = {}) {
  if (TERMINI && !escludi) return TERMINI;
  const righe = RIFERIMENTI.filter(([s]) => !escludi || !escludi.includes(s)).map(([s, dH]) => { const m = molecola(s); return { s, t: termini(m), y: atomizzazione(m) - dH }; });
  const nomi = [...new Set(righe.flatMap((r) => Object.keys(r.t)))].filter((k) => fisso(k) == null).sort(), K = nomi.length, pos = new Map(nomi.map((k, i) => [k, i]));
  const p0 = nomi.map(riserva), sigma = 3, sigmaP = nomi.map((k) => (k[0] === 'g' || k.startsWith('anello') || k.startsWith('aromatico') ? 60 : 120));
  const N = nomi.map(() => new Array(K + 1).fill(0));
  for (const r of righe) { let y = r.y; const riga = new Array(K).fill(0); for (const k in r.t) { const f = fisso(k); if (f != null) y -= f * r.t[k]; else riga[pos.get(k)] = r.t[k]; }
    for (let i = 0; i < K; i++) { if (!riga[i]) continue; for (let j = 0; j < K; j++) N[i][j] += (riga[i] * riga[j]) / (sigma * sigma); N[i][K] += (riga[i] * y) / (sigma * sigma); } }
  for (let i = 0; i < K; i++) { N[i][i] += 1 / (sigmaP[i] * sigmaP[i]); N[i][K] += p0[i] / (sigmaP[i] * sigmaP[i]); }
  const x = risolvi(N), valori = Object.fromEntries(nomi.map((k, i) => [k, x[i]]));
  // IL FOSFORO IN ACQUA. Per i legami del fosforo non ci sono entalpie in fase gas tra i riferimenti: i tre termini che
  // decidono quanto costa un legame P–O–P, P–O–C e P–O–C(=O) rispetto a P–OH e C–OH sono TARATI su tre energie di idrolisi
  // misurate a pH 7 (kJ/mol; Alberty 2003; Jencks 1976 [ricordati]): pirofosfato −19,2, un fosfomonoestere −9, acetil-fosfato −43.
  // (ATP → ADP + Pi, −30,5, e i fosfodiesteri NON sono usati: sono la verifica, nelle prove.)
  Object.assign(valori, FOSFORO);
  const out = { valori, riserva: Object.fromEntries(nomi.map((k, i) => [k, p0[i]])), riferimenti: righe.length };
  if (!escludi) TERMINI = out;
  return out;
}
// eliminazione di Gauss con perno (matrice aumentata n × (n+1))
export function risolvi(G) { const n = G.length;
  for (let j = 0; j < n; j++) { let p = j; for (let k = j + 1; k < n; k++) if (Math.abs(G[k][j]) > Math.abs(G[p][j])) p = k; [G[j], G[p]] = [G[p], G[j]]; const piv = G[j][j] || 1e-300;
    for (let k = j + 1; k < n; k++) { const f = G[k][j] / piv; if (f) for (let l = j; l <= n; l++) G[k][l] -= f * G[j][l]; } }
  const x = new Array(n); for (let j = n - 1; j >= 0; j--) { let s = G[j][n]; for (let k = j + 1; k < n; k++) s -= G[j][k] * x[k]; x[j] = s / (G[j][j] || 1e-300); } return x; }

// ---------- ioni in fase gas (dati [ricordati], servono poco: in acqua si passa dal pKa)
const ION2 = { Be: [18.211], Mg: [15.035], Ca: [11.872], Al: [18.829, 28.448], Sc: [12.80, 24.76], Ti: [13.576, 27.49], V: [14.618, 29.31], Cr: [16.486, 30.96], Mn: [15.640, 33.67], Fe: [16.199, 30.651], Co: [17.084, 33.50], Ni: [18.169, 35.19], Cu: [20.292, 36.84], Zn: [17.964], Mo: [16.16, 27.13] }; // 2ª e 3ª ionizzazione (eV): NIST Atomic Spectra Database
const EV = 96.485, HF_PROTONE = 1536.2; // ΔHf di H⁺ gas a 298 K: 218,0 + 1312,0 + 6,2 (convenzione dell'elettrone termico)
const AFFINITA_PROTONE = { 7: [854, 899, 930, 949], 8: [691, 754, 792], 16: [705, 773, 831], 15: [785, 850, 900] }; // per numero di sostituenti di carbonio: Hunter e Lias 1998
const AFFINITA_RADICALE = { 1: 0.754, 6: 0.08, 7: 0.77, 8: 1.83, 9: 3.40, 15: 1.27, 16: 2.31, 17: 3.61, 35: 3.36 }; // eV: OH, NH2, CH3, SH…
function entalpiaIone(m) {
  if (m.atomi.length === 1 && !m.atomi[0].h) { const a = m.atomi[0], A = atomo(a.Z); let h = A.HfAtomo;
    if (a.q > 0) { const ie = [A.ionizzazione, ...(ION2[A.simbolo] || [])]; for (let i = 0; i < a.q; i++) h += EV * (ie[i] ?? A.ionizzazione * (i + 1) * 1.9) + 6.2; } else h -= (EV * (A.affinita ?? 0) + 6.2) * -a.q;
    return { H: h, stima: 'ione semplice' }; }
  const k = m.atomi.findIndex((a) => a.q !== 0), a = m.atomi[k], g = grezzo(m);
  if (a.q > 0 && a.h > 0) { g.atomi[k].h--; g.atomi[k].q--; const base = molecola(g), nC = viciniSigma(m, k).filter((v) => m.atomi[v.j].Z === 6).length, doppio = m.vic[k].some((v) => m.legami[v.k].o === 2);
    const pa = (AFFINITA_PROTONE[a.Z] || [750])[Math.min(nC, 3)] ?? 900; return { H: entalpiaGas(base).H + HF_PROTONE - (doppio ? pa + 20 : pa), stima: 'ione: affinità protonica per classe' }; }
  if (a.q < 0 && a.Z !== 1) { g.atomi[k].h++; g.atomi[k].q++; let acido; try { acido = molecola(g); } catch { acido = null; }
    if (acido && !acido.atomi[k].r) { const osso = viciniSigma(m, k).reduce((s, v) => s + m.vic[v.j].filter((w) => m.legami[w.k].o === 2 && m.atomi[w.j].Z !== 6).length, 0), tv = termochimica().valori;
      const bde = tv[`${SIMBOLI[a.Z]}-H`] ?? riserva(`${SIMBOLI[a.Z]}-H`), ea = EV * ((AFFINITA_RADICALE[a.Z] ?? 1) + 1.4 * Math.min(osso, 1));
      return { H: entalpiaGas(acido).H + bde + 1318.2 - ea - HF_PROTONE, stima: 'ione: acidità in gas per classe' }; } }
  return null;
}
// (per le prove: l'entalpia con un altro insieme di termini, per esempio ricavati senza una molecola)
export function entalpiaCon(x, tv) { const m = molecola(x), t = termini(m); let H = atomizzazione(m); for (const k in t) H -= (fisso(k) ?? tv[k] ?? riserva(k)) * t[k]; return H; }
// entalpia di formazione in fase gas a 298 K → { H, stima: 'riferimenti' | 'riserva' (qualche termine dalla regola di Pauling) | 'ione…', riservati: [termini] }
const canonica = (x) => { const m = molecola(x); return molecola(chiave(m)); };
export function entalpiaGas(x) {
  const m1 = molecola(x); if (m1._hf) return m1._hf; const m = canonica(m1); if (m !== m1) { const r = entalpiaGas(m); Object.defineProperty(m1, '_hf', { value: r, enumerable: false }); return r; }
  let out = null;
  if (m.atomi.some((a) => a.q !== 0) && m.atomi.reduce((s, a) => s + a.q, 0) !== 0) out = entalpiaIone(m);
  if (!out) { const tv = termochimica().valori, t = termini(m), riservati = []; let H = atomizzazione(m);
    for (const k in t) { const f = fisso(k); let e = f ?? tv[k]; if (e == null) { e = riserva(k); if (e) riservati.push(k); } H -= e * t[k]; }
    // i legami ionici: attrazione di Coulomb alla distanza dei raggi (1389,35 kJ·Å/mol)
    for (const l of m.legami) if (l.t === 'i') H += (1389.35 * m.atomi[l.a].q * m.atomi[l.b].q) / (atomo(m.atomi[l.a].Z).raggioCovalente + atomo(m.atomi[l.b].Z).raggioCovalente);
    // cis e trans: due sostituenti pesanti dalla stessa parte di un doppio legame si urtano (cis-2-butene 4,3 kJ/mol sopra il trans: dato); contato rispetto alla media, così la forma non assegnata non si sposta
    for (const l of m.legami) { if (!l.ez) continue; const sa = m.vic[l.a].filter((v) => v.j !== l.b).map((v) => v.j), sb = m.vic[l.b].filter((v) => v.j !== l.a).map((v) => v.j); let cis = 0; for (const x_ of sa) for (const y of sb) if (((x_ === l.ez.p) === (y === l.ez.q)) === l.ez.cis) cis++; H += 4.3 * (cis - (sa.length * sb.length) / 2); }
    out = { H, stima: riservati.length ? 'riserva' : 'riferimenti', riservati }; }
  Object.defineProperty(m, '_hf', { value: out, enumerable: false });
  return out;
}

// ---------- entropia e funzioni termiche (meccanica statistica)
// i modi di vibrazione (cm⁻¹) e i rotori interni di una molecola, dalla sua forma
function modi(m0) {
  if (m0._modi) return m0._modi;
  // (la forma si costruisce sulla molecola riletta dalla sua chiave: così l'entropia non dipende dall'ordine in cui gli atomi sono stati scritti)
  // (e, se è chirale, su quella delle due immagini allo specchio che ha la chiave minore: le due mani hanno la stessa entropia, esattamente)
  let kc = chiave(m0); if (m0.atomi.some((x) => x.chir)) { const ks = chiave(speculare(m0)); if (ks < kc) kc = ks; }
  const m = molecola(kc); if (m !== m0) { const r = modi(m); Object.defineProperty(m0, '_modi', { value: r, enumerable: false }); return r; }
  const f = forma(m), n = f.n, nu = [], rotori = [];
  const { massa, momenti } = inerzia(f), lineare = n === 2 || (n > 2 && momenti[0] < 1e-3 * momenti[2]);
  const out = { f, n, massa, momenti, lineare, sigma: numeroDiSimmetria(f), nu, rotori, elettronica: 1 };
  if (n === 1) { out.elettronica = m.atomi[0].r ? m.atomi[0].r + 1 : 1; Object.defineProperty(m, '_modi', { value: out, enumerable: false }); return out; }
  // la molteplicità: un elettrone spaiato raddoppia gli stati; O2 e S2 hanno due elettroni spaiati (regola di Hund, non deducibile dal grafo: dato)
  const spaiati = m.atomi.reduce((s, a) => s + a.r, 0); out.elettronica = spaiati + 1;
  if (m.atomi.length === 2 && m.legami.length === 1 && m.legami[0].o === 2 && m.atomi.every((a) => (a.Z === 8 || a.Z === 16) && !a.q && !a.h)) out.elettronica = 3;
  // stiramenti: uno per legame; costante di forza dalla regola di Gordy (1946): k = 1,67·N·(χa·χb/d²)^¾ + 0,30 mdyn/Å
  const chi = (Z) => atomo(Z).chi ?? 2.5;
  for (const [i, j, o] of f.legami) { if (!o) continue; const d = Math.hypot(f.pos[3 * i] - f.pos[3 * j], f.pos[3 * i + 1] - f.pos[3 * j + 1], f.pos[3 * i + 2] - f.pos[3 * j + 2]);
    const k = 1.67 * o * Math.pow((chi(f.Z[i]) * chi(f.Z[j])) / (d * d), 0.75) + 0.30, mi = atomo(f.Z[i]).massa, mj = atomo(f.Z[j]).massa; nu.push(1302.8 * Math.sqrt((k * (mi + mj)) / (mi * mj))); }
  // piegamenti: per ogni atomo con d vicini, 2d − 3 (2 se in linea). Numeri d'onda caratteristici (spettri infrarossi:
  // H–X–H 1450, H–X–Y 1200, Y–X–Y 420 su un centro tetraedrico, 550 su uno piano, 620 su uno in linea; i più pesanti
  // del carbonio più lenti, come la radice della massa)
  const vicini = Array.from({ length: n }, () => []); for (const [i, j, o] of f.legami) if (o) { vicini[i].push(j); vicini[j].push(i); }
  for (let k = 0; k < m.atomi.length; k++) { const d = vicini[k].length; if (d < 2) continue; const h = vicini[k].filter((j) => f.Z[j] === 1).length, x = d - h, dm = dominio(m, k);
    const pes = vicini[k].filter((j) => f.Z[j] !== 1).map((j) => atomo(f.Z[j]).massa), lento = pes.length ? Math.sqrt(12 / (pes.reduce((a, b) => a + b, 0) / pes.length)) : 1, centro = Math.sqrt(Math.min(1, 14 / atomo(f.Z[k]).massa));
    if (d === 2 && dm.sn <= 2) { nu.push(620 * (h ? 1.1 : lento), 620 * (h ? 1.1 : lento)); continue; }
    const tot = 2 * d - 3, nXX = Math.min(tot, x >= 2 ? 2 * x - 3 : 0), nHH = Math.min(tot - nXX, h >= 2 ? 2 * h - 3 : 0), nHX = tot - nXX - nHH;
    for (let i = 0; i < nXX; i++) nu.push((dm.sn === 3 ? 550 : 420) * Math.min(1.2, lento) * centro); for (let i = 0; i < nHH; i++) nu.push(1450 * centro); for (let i = 0; i < nHX; i++) nu.push(1200 * centro); }
  // rotazioni interne: i legami semplici fuori dagli anelli con qualcosa da tutte e due le parti
  const inAnello = new Set(); for (const r of anelli(m)) for (let i = 0; i < r.length; i++) inAnello.add(`${Math.min(r[i], r[(i + 1) % r.length])},${Math.max(r[i], r[(i + 1) % r.length])}`);
  for (const l of m.legami) { if (l.t !== 'c' || l.o !== 1 || l.ar || inAnello.has(`${Math.min(l.a, l.b)},${Math.max(l.a, l.b)}`)) continue; if (vicini[l.a].length < 2 || vicini[l.b].length < 2) continue;
    const da = dominio(m, l.a), db = dominio(m, l.b); if (da.sn <= 2 || db.sn <= 2) continue;
    // i momenti d'inerzia delle due parti attorno all'asse del legame
    const lato = new Set([l.b]), pila = [l.b]; while (pila.length) { const u = pila.pop(); for (const v of vicini[u]) if (!lato.has(v) && !(u === l.b && v === l.a)) { lato.add(v); pila.push(v); } }
    const o = [f.pos[3 * l.a], f.pos[3 * l.a + 1], f.pos[3 * l.a + 2]], ax = [f.pos[3 * l.b] - o[0], f.pos[3 * l.b + 1] - o[1], f.pos[3 * l.b + 2] - o[2]], la = Math.hypot(...ax); let I1 = 0, I2 = 0;
    for (let i = 0; i < n; i++) { const v = [f.pos[3 * i] - o[0], f.pos[3 * i + 1] - o[1], f.pos[3 * i + 2] - o[2]], pr = (v[0] * ax[0] + v[1] * ax[1] + v[2] * ax[2]) / la, r2 = Math.max(0, v[0] * v[0] + v[1] * v[1] + v[2] * v[2] - pr * pr); if (lato.has(i)) I2 += atomo(f.Z[i]).massa * r2; else I1 += atomo(f.Z[i]).massa * r2; }
    const I = (I1 * I2) / (I1 + I2 || 1); if (!(I > 1e-6)) continue;
    // la barriera (regole di UFF, kJ/mol): sp³–sp³ √(Vi·Vj); con un atomo piano 4,2; tra due piani coniugati (ammide, estere) 5·√(Ui·Uj)·(1 + 4,18·ln 1,4) ≈ 84
    const sp3 = (dd) => dd.sn === 4, piano = (k, dd) => dd.sn === 3, V = sp3(da) && sp3(db) ? 4.184 * Math.sqrt(Math.max(0.05, atomo(m.atomi[l.a].Z).uff.V || (m.atomi[l.a].Z === 8 ? 2 : 0.5)) * Math.max(0.05, atomo(m.atomi[l.b].Z).uff.V || (m.atomi[l.b].Z === 8 ? 2 : 0.5))) : piano(l.a, da) && piano(l.b, db) ? (da.piano || db.piano ? 84 : 20) : 4.2;
    const pieghe = sp3(da) && sp3(db) ? 3 : piano(l.a, da) && piano(l.b, db) ? 2 : 6, simm = [l.a, l.b].some((k) => { const vv = vicini[k].filter((j) => j !== l.a && j !== l.b); return vv.length === 3 && vv.every((j) => f.Z[j] === f.Z[vv[0]] && vicini[j].length === 1); }) ? 3 : 1;
    rotori.push({ I, V, pieghe, simm }); }
  // ciò che manca per arrivare a 3n − 6 modi (deformazioni degli anelli): 400 cm⁻¹
  const attesi = 3 * n - (lineare ? 5 : 6); while (nu.length + rotori.length < attesi) nu.push(400); nu.sort((a, b) => b - a); while (nu.length + rotori.length > attesi && nu.length) nu.pop();
  Object.defineProperty(m, '_modi', { value: out, enumerable: false });
  return out;
}
// → { S (J/mol/K a T e P), Htermica (kJ/mol: energia termica + RT, da 0 K), Cp }
export function termica(x, T = 298.15, P = 1e5) {
  const m = molecola(x), q = modi(m), RJ = R * 1000; let S = 0, E = 0;
  const mk = q.massa * UMA; S += RJ * (Math.log(Math.pow((2 * Math.PI * mk * KB * T) / (HP * HP), 1.5) * ((KB * T) / P)) + 2.5); E += 2.5 * R * T; // traslazione (+ PV)
  if (q.n > 1) { const conv = UMA * 1e-20, th = (I) => (8 * Math.PI * Math.PI * I * conv * KB * T) / (HP * HP);
    if (q.lineare) { S += RJ * (Math.log(th(q.momenti[2]) / q.sigma) + 1); E += R * T; } else { S += RJ * (Math.log((Math.sqrt(Math.PI * th(q.momenti[0]) * th(q.momenti[1]) * th(q.momenti[2]))) / q.sigma) + 1.5); E += 1.5 * R * T; } }
  for (const nu of q.nu) { const xx = (HC_K * nu) / T, e = Math.exp(-xx); S += RJ * ((xx * e) / (1 - e) - Math.log(1 - e)); E += (R * T * xx * e) / (1 - e); }
  for (const r of q.rotori) { const libero = RJ * (0.5 + Math.log(Math.sqrt(8 * Math.PI ** 3 * r.I * UMA * 1e-20 * KB * T) / (r.simm * HP)));
    const nu = (r.pieghe / (2 * Math.PI)) * Math.sqrt((r.V * 1000) / NA / (2 * r.I * UMA * 1e-20)) / 2.99792458e10, xx = (HC_K * nu) / T, e = Math.exp(-xx), frenato = RJ * ((xx * e) / (1 - e) - Math.log(1 - e));
    if (libero < frenato) { S += libero; E += 0.5 * R * T; } else { S += frenato; E += (R * T * xx * e) / (1 - e);
      // un rotore a tre buche non simmetrico ha tre conformeri (anti e due gauche, questi 3,3 kJ/mol più su: il butano, dato): si mescolano
      if (r.pieghe === 3 && r.simm === 1) { const g = 2 * Math.exp(-3.3 / (R * T)); S += RJ * (Math.log(1 + g) + (g / (1 + g)) * (3.3 / (R * T))); E += (3.3 * g) / (1 + g); } } }
  S += RJ * Math.log(q.elettronica);
  // un centro chirale non assegnato è una miscela delle due forme
  return { S, Htermica: E };
}
export const entropiaGas = (x, T = 298.15, P = 1e5) => termica(x, T, P).S;

// ---------- in acqua: l'idratazione dei neutri
// DATI: energie libere di idratazione misurate (kcal/mol, da gas 1 M a soluzione 1 M): banca FreeSolv 0.52 (Mobley e
// Guthrie 2014, J. Comput.-Aided Mol. Des. 28, 711; letta l'11-11-2026); per i gas piccoli dalle costanti di Henry
// (Sander 2015, Atmos. Chem. Phys. 15, 4399) con ΔG = −RT·ln(K_H·RT).
export const IDRATAZIONE = [
  ['C', 2.00], ['CC', 1.83], ['CCC', 2.0], ['CCCCCC', 2.48], ['CCCCCCCC', 2.88], ['C1CCCCC1', 1.23], ['CCC=C', 1.38], ['c1ccccc1', -0.9], ['Cc1ccccc1', -0.9], ['c1ccc2ccccc2c1', -2.4],
  ['CO', -5.1], ['CCO', -5.0], ['CCCO', -4.85], ['CCCCO', -4.72], ['CCCCCCCCO', -4.09], ['CCCCCCCCCCO', -3.64], ['CC(C)O', -4.74], ['CC(C)(C)O', -4.47], ['Oc1ccccc1', -6.6], ['OCC(O)CO', -13.43],
  ['COC', -1.91], ['CCOCC', -1.59], ['C1CCOC1', -3.47], ['C1COCCO1', -5.06], ['CC=O', -3.5], ['CCC=O', -3.43], ['CCCC=O', -3.18], ['CC(C)=O', -3.8], ['CCCC(C)=O', -3.52], ['C=O', -2.75],
  ['CC(=O)O', -6.69], ['CCCCC(=O)O', -6.16], ['CCCCCC(=O)O', -6.21], ['COC=O', -2.78], ['COC(C)=O', -3.13], ['CCC(=O)OC', -2.93], ['CCCCCC(=O)OC', -2.49],
  ['N', -4.29], ['CN', -4.55], ['CCN', -4.5], ['CCCN', -4.39], ['CCCCN', -4.24], ['CNC', -4.29], ['CN(C)C', -3.2], ['C1CCNCC1', -5.11], ['C1CCNC1', -5.48], ['C1COCCN1', -7.17], ['Nc1ccccc1', -5.49], ['NN', -9.3],
  ['CC(N)=O', -9.71], ['CNC(C)=O', -10.0], ['NC(=O)c1ccccc1', -11.0], ['CC#N', -3.88], ['c1ccncc1', -4.69], ['CS', -1.2], ['CCS', -1.14], ['CSC', -1.61], ['S', -0.7], ['C[N+](=O)[O-]', -4.02], ['CCl', -0.55],
  ['[HH]', 2.34], ['N#N', 2.45], ['O=O', 2.03], ['[C-]#[O+]', 2.20], ['O=C=O', 0.11], ['C#N', -3.2], ['C=C', 1.27], ['C#C', 0.0], ['[N]=O', 1.82], ['O=S=O', -2.0],
];
function caratteriAcqua(m) {
  const c = { costante: 1, carbonio: 0, aromatico: 0, multiplo: 0, OH: 0, etere: 0, carbonile: 0, acile: 0, ammide: 0, NH: 0, ammina: 0, azotoPi: 0, nitrile: 0, zolfo: 0, alogeno: 0, osso: 0, nudo: 0 };
  m.atomi.forEach((a, k) => { const doppi = m.vic[k].filter((v) => m.legami[v.k].t === 'c' && m.legami[v.k].o >= 2 && !m.legami[v.k].ar), suC = m.vic[k].some((v) => m.atomi[v.j].Z === 6);
    if (a.Z === 6) { if (a.ar) c.aromatico++; else c.carbonio++; if (doppi.some((v) => m.atomi[v.j].Z === 6 && v.j > k)) c.multiplo++;
      if (doppi.length === 1 && m.legami[doppi[0].k].o === 2 && m.atomi[doppi[0].j].Z === 8) { const N = m.vic[k].some((v) => m.legami[v.k].o === 1 && m.atomi[v.j].Z === 7), O = m.vic[k].some((v) => m.legami[v.k].o === 1 && m.atomi[v.j].Z === 8); if (N) c.ammide++; else if (O) c.acile++; else c.carbonile++; }
      else if (doppi.some((v) => m.atomi[v.j].Z !== 6 && m.legami[v.k].o === 2)) c.osso++; }
    else if (a.Z === 8) { if (a.h) c.OH += a.h; else if (!doppi.length && !a.q) c.etere++; else if (!suC) c.osso++; }
    else if (a.Z === 7) { c.NH += a.h; if (a.q > 0 || !suC) { if (!suC && !a.h) c.osso++; return; } if (doppi.some((v) => m.legami[v.k].o === 3)) c.nitrile++; else if (doppi.length || a.ar) { if (coppieSolitarie(m, k) > 0 && !(a.ar && coppieNelAnello(m, k))) c.azotoPi++; } else c.ammina++; }
    else if (a.Z === 16 || a.Z === 15) c.zolfo++; else if ([9, 17, 35].includes(a.Z)) c.alogeno++; });
  // (una molecola di due atomi senza idrogeni da dare — H2, N2, O2, CO, NO — è solo una cavità nell'acqua)
  if (m.atomi.length <= 2 && m.atomi.every((a) => a.Z === 1 || a.h === 0) && !c.zolfo && !c.alogeno) { for (const k in c) c[k] = 0; c.costante = 1; c.nudo = 1; }
  return c;
}
let IDRO = null;
function idratazioneFit() {
  if (IDRO) return IDRO;
  const righe = IDRATAZIONE.map(([s, kcal]) => ({ c: caratteriAcqua(molecola(s)), y: kcal * 4.184 })), nomi = Object.keys(righe[0].c), K = nomi.length, N = nomi.map(() => new Array(K + 1).fill(0));
  for (const r of righe) for (let i = 0; i < K; i++) { const ci = r.c[nomi[i]]; if (!ci) continue; for (let j = 0; j < K; j++) N[i][j] += ci * r.c[nomi[j]]; N[i][K] += ci * r.y; }
  for (let i = 0; i < K; i++) N[i][i] += 1e-3;
  const x = risolvi(N); return (IDRO = Object.fromEntries(nomi.map((k, i) => [k, x[i]])));
}
// ΔG di idratazione di una molecola neutra (kJ/mol, da gas 1 M a soluzione 1 M: convenzione di Ben-Naim)
export function idratazione(x) { const m = molecola(x), w = idratazioneFit(), c = caratteriAcqua(m); let g = 0; for (const k in c) g += w[k] * c[k]; return g; }
// ΔG per passare dal gas a un liquido apolare (l'interno di una micella, di una membrana, di una proteina): solo
// dispersione. LEGGE EMPIRICA dai coefficienti di ripartizione aria-esadecano degli alcani (Abraham 1987, log L16:
// metano −0,32, etano 0,49, propano 1,05, butano 1,62 [ricordati]): 5,0 − 3,2 kJ/mol per atomo pesante.
export const inOlio = (x) => 5.0 - 3.2 * molecola(x).atomi.filter((a) => a.Z > 1).length;

// ---------- acidi e basi: il pKa di ogni sito
// σ induttiva di un atomo visto attraverso i legami (Charton 1981, σ_I dei gruppi, ridotte agli atomi): dato
const SIGMA_I = (m, j) => { const a = m.atomi[j], d = m.vic[j].some((v) => m.legami[v.k].o === 2 && !m.legami[v.k].ar), t = m.vic[j].some((v) => m.legami[v.k].o === 3);
  const el = a.Z === 9 ? 0.52 : a.Z === 17 ? 0.47 : a.Z === 35 ? 0.45 : a.Z === 8 ? (d ? 0.72 : 0.28) : a.Z === 7 ? (t ? 1.4 : d ? 0.5 : 0.15) : a.Z === 16 ? 0.26 : a.Z === 15 ? 0.2 : 0; return el + 0.6 * a.q; };
const RHO = 9.8, SMORZA = 0.4;
const ossoOS = (m, A) => m.vic[A].filter((v) => m.legami[v.k].t === 'c' && m.legami[v.k].o === 2 && !m.legami[v.k].ar && (m.atomi[v.j].Z === 8 || m.atomi[v.j].Z === 16)).map((v) => v.j);
const ossoDi = (m, A) => m.vic[A].filter((v) => m.legami[v.k].t === 'c' && ((m.legami[v.k].o === 2 && m.atomi[v.j].Z !== 6) || (m.legami[v.k].o === 1 && m.atomi[v.j].q < 0 && m.atomi[A].q > 0 && m.atomi[v.j].Z === 8))).map((v) => v.j);
// il pKa dell'idrogeno sull'atomo k (com'è nel grafo): valore di base della classe (DATI: tabelle di pKa in acqua a
// 25 °C: CRC Handbook; Perrin, Dempsey e Serjeant 1981) + effetto induttivo. → { pKa, classe } o null
export function pKaSito(m, k) {
  const a = m.atomi[k]; if (!a.h) return null;
  const vic = viciniSigma(m, k).map((v) => v.j), nucleo = new Set([k]); let base = null, classe = '';
  const nC = vic.filter((j) => m.atomi[j].Z === 6).length, piAccanto = (j) => m.atomi[j].ar || m.vic[j].some((v) => m.legami[v.k].t === 'c' && m.legami[v.k].o >= 2 && v.j !== k);
  if (a.Z === 8 && a.q === 0) {
    if (!vic.length) { base = 14.0; classe = 'acqua'; }
    else { const A = vic[0], ZA = m.atomi[A].Z, osso = ZA === 6 ? ossoOS(m, A) : ossoDi(m, A); nucleo.add(A); osso.forEach((j) => nucleo.add(j));
      // (ciò che sta sullo stesso centro fa parte della classe: gli altri OH di un ossiacido, l'OH o l'NH2 di un acido carbonico o carbammico)
      for (const v of m.vic[A]) if (ZA !== 6 || (osso.length && m.atomi[v.j].Z !== 6)) nucleo.add(v.j);
      if (ZA === 6) { if (osso.length) { const sost = viciniSigma(m, A).map((v) => v.j).filter((j) => j !== k && !osso.includes(j)); base = sost.some((j) => m.atomi[j].Z === 6) ? 4.76 : 3.75; classe = 'acido carbossilico'; if (osso.some((j) => m.atomi[j].Z === 16)) base -= 1.4; }
        else if (m.atomi[A].ar) { base = 10.0; classe = 'fenolo'; } else if (piAccanto(A)) { base = 10.5; classe = 'enolo'; } else { base = 16.0; classe = 'alcol'; } }
      else if (ZA === 15) { base = osso.length ? 2.15 : 8; classe = 'acido del fosforo'; } else if (ZA === 16) { base = [11, 1.9, -3][Math.min(2, osso.length)]; classe = 'acido dello zolfo'; }
      else if (ZA === 7) { base = osso.length >= 2 ? -1.4 : osso.length ? 3.3 : 13.7; classe = 'acido dell\'azoto'; } else if (ZA === 14) { base = 9.8; classe = 'acido silicico'; } else if (ZA === 5) { base = 9.2; classe = 'acido borico'; }
      else if (ZA === 8) { base = 11.6; classe = 'perossido'; } else if (atomo(ZA).metallo) { base = 14 - 1.5 * Math.max(0, m.atomi[A].q) ** 2; classe = 'idrossido di metallo'; } else { base = 8 - 5 * osso.length; classe = 'ossiacido (regola di Pauling)'; } } }
  else if (a.Z === 8 && a.q === 1) { if (!vic.length) { base = 0; classe = 'idrossonio'; } else { const A = vic[0], dop = m.vic[k].some((v) => m.legami[v.k].o === 2); nucleo.add(A); base = dop ? (m.vic[A].some((v) => m.atomi[v.j].Z === 7 && m.legami[v.k].o === 1) ? -0.5 : -7) : -2; classe = 'ossonio'; } }
  else if (a.Z === 7 && a.q === 1) { const dop = m.vic[k].find((v) => m.legami[v.k].t === 'c' && m.legami[v.k].o === 2), tri = m.vic[k].some((v) => m.legami[v.k].o === 3);
    if (tri) { base = -10; classe = 'nitrilio'; }
    else if (a.ar) { const r = anelli(m).find((rr) => rr.includes(k) && rr.length === 5); base = r && r.some((j) => j !== k && m.atomi[j].Z === 7) ? 7.0 : 5.2; classe = r ? 'imidazolio' : 'piridinio'; if (r) r.forEach((j) => nucleo.add(j)); }
    else if (dop) { const C = dop.j, altriN = m.vic[C].filter((v) => v.j !== k && m.atomi[v.j].Z === 7 && m.legami[v.k].o === 1); nucleo.add(C); altriN.forEach((v) => nucleo.add(v.j)); base = altriN.length >= 2 ? 13.6 : altriN.length ? 12.4 : 7.0; classe = altriN.length ? 'amidinio' : 'imminio'; }
    else if (vic.some((j) => m.atomi[j].Z === 6 && ossoOS(m, j).length)) { base = -8; classe = 'ammide protonata sull\'azoto'; }
    else if (vic.some((j) => m.atomi[j].ar)) { base = 4.6; classe = 'anilinio'; } else if (vic.some((j) => m.atomi[j].Z === 7)) { base = 8.1; classe = 'idrazinio'; nucleo.add(vic.find((j) => m.atomi[j].Z === 7)); } else if (vic.some((j) => m.atomi[j].Z === 8)) { base = 6.0; classe = 'idrossilammonio'; nucleo.add(vic.find((j) => m.atomi[j].Z === 8)); }
    else { base = [9.25, 10.64, 10.73, 9.80][Math.min(nC, 3)]; classe = 'ammonio'; } }
  else if (a.Z === 7 && a.q === 0) { const acili = vic.filter((j) => ossoOS(m, j).length);
    if (a.ar) { const r = anelli(m).find((rr) => rr.includes(k)); const altri = r ? r.filter((j) => j !== k && m.atomi[j].Z === 7).length : 0, acil = vic.filter((j) => m.vic[j].some((v) => m.legami[v.k].o === 2 && m.atomi[v.j].Z === 8)).length; base = acil >= 2 ? 9.5 : acil ? 11.5 : altri ? 14.5 - 2.3 * (anelli(m).filter((rr) => rr.includes(k) || rr.some((j) => r.includes(j))).length - 1) : 17.5; classe = 'NH aromatico'; r?.forEach((j) => nucleo.add(j)); }
    else if (acili.length) { base = acili.length >= 2 ? 9.6 : 15.1; classe = 'ammide'; acili.forEach((j) => { nucleo.add(j); ossoOS(m, j).forEach((o) => nucleo.add(o)); }); }
    else if (vic.some((j) => m.vic[j].some((v) => m.legami[v.k].o === 3))) { base = 10.3; classe = 'cianammide'; } else { base = 35; classe = 'ammina'; } }
  else if (a.Z === 16 && a.q === 0) { if (!vic.length) { base = 7.0; classe = 'idrogeno solforato'; } else { const A = vic[0]; nucleo.add(A); base = ossoDi(m, A).length ? 3.3 : m.atomi[A].ar ? 6.6 : 10.5; classe = 'tiolo'; } }
  else if (a.Z === 6 && a.q === 0 && !a.ar) { const tripN = m.vic[k].some((v) => m.legami[v.k].o === 3 && m.atomi[v.j].Z === 7), acc = vic.filter((j) => ossoOS(m, j).length || (m.atomi[j].Z === 7 && m.atomi[j].q > 0 && ossoDi(m, j).length) || m.vic[j].some((v) => m.legami[v.k].o === 3 && m.atomi[v.j].Z === 7));
    if (tripN) { base = 9.21; classe = 'acido cianidrico'; } else if (m.vic[k].some((v) => m.legami[v.k].o === 3)) { base = 25; classe = 'alchino'; }
    else if (acc.length) { const nitro = acc.some((j) => m.atomi[j].Z === 7), ald = acc.some((j) => m.atomi[j].Z === 6 && m.atomi[j].h > 0 && ossoOS(m, j).length), est = acc.every((j) => m.vic[j].some((v) => m.legami[v.k].o === 1 && (m.atomi[v.j].Z === 8 || m.atomi[v.j].Z === 7)) || m.vic[j].some((v) => m.legami[v.k].o === 3));
      base = nitro ? 10.2 : (est ? 24.5 : ald ? 16.7 : 19.3) - 9 * (acc.length - 1); classe = 'carbonio α'; acc.forEach((j) => { nucleo.add(j); ossoDi(m, j).concat(ossoOS(m, j)).forEach((o) => nucleo.add(o)); m.vic[j].forEach((v) => { if (m.legami[v.k].o === 3 || (est && m.legami[v.k].o === 1 && m.atomi[v.j].Z !== 6)) nucleo.add(v.j); }); }); }
    else { base = 50; classe = 'alcano'; } }
  else if (a.Z === 6) return null;
  else if (a.Z === 9) { base = 3.17; classe = 'HF'; } else if (a.Z === 17) { base = -7; classe = 'HCl'; } else if (a.Z === 35) { base = -9; classe = 'HBr'; } else if (a.Z === 34) { base = 3.9; classe = 'H2Se'; } else if (a.Z === 15) { base = 27; classe = 'fosfina'; } else return null;
  // l'effetto induttivo: gli eteroatomi e le cariche a due o più legami di distanza
  const dist = new Map([[k, 0]]); let fronte = [k], ind = 0; // (dist: i legami tra k e ogni altro atomo, fino a 5)
  for (let d = 1; d <= 5 && fronte.length; d++) { const poi = []; for (const u of fronte) for (const v of m.vic[u]) { if (dist.has(v.j) || m.legami[v.k].t === 'i') continue; dist.set(v.j, d); poi.push(v.j); if (d >= 2 && !nucleo.has(v.j)) ind += SIGMA_I(m, v.j) * SMORZA ** (d - 2); } fronte = poi; }
  let pKa = base - (base > 12 ? Math.min(4 / RHO, ind) : ind) * RHO;
  // un gruppo amminico sull'anello, in orto o in para all'azoto aromatico, gli cede elettroni per risonanza (2- e 4-amminopiridina: pKa 6,86 e 9,17 contro 5,2: dati)
  if (a.Z === 7 && a.q === 1 && a.ar) for (const [j, d] of dist) { if ((d !== 2 && d !== 4) || !m.atomi[j].ar) continue; for (const v of m.vic[j]) if (m.atomi[v.j].Z === 7 && !m.atomi[v.j].ar && !m.atomi[v.j].q && m.legami[v.k].o === 1) pKa += d === 2 ? 3.2 : 4.3; }
  return { pKa, classe };
}
// la forma neutra di riferimento: gli acidi con il loro idrogeno, le basi senza
export function neutra(x) {
  const m = molecola(x); if (!m.atomi.some((a) => a.q)) return m; if (m._neutra) return m._neutra;
  const g = grezzo(m);
  m.atomi.forEach((a, k) => { const A = atomo(a.Z); if (A.metallo || !m.vic[k].length && !a.h && a.Z !== 8 && a.Z !== 16 && a.Z !== 17 && a.Z !== 9 && a.Z !== 35) return;
    if (a.q < 0 && [6, 7, 8, 9, 16, 17, 35].includes(a.Z) && !m.vic[k].some((v) => m.atomi[v.j].q > 0)) { g.atomi[k].h -= a.q; g.atomi[k].q = 0; }
    else if (a.q > 0 && a.h >= a.q && [7, 8, 15, 16].includes(a.Z) && !m.vic[k].some((v) => m.atomi[v.j].q < 0 && m.legami[v.k].t === 'c')) { g.atomi[k].h -= a.q; g.atomi[k].q = 0; } });
  const out = molecola(g); Object.defineProperty(m, '_neutra', { value: out, enumerable: false }); return out;
}
// i siti che contano in acqua: acidi (pKa < 20) e basi (pKa dell'acido coniugato > −3) della forma neutra
export function sitiAcidoBase(x) {
  const m = neutra(x); if (m._siti) return m._siti;
  const siti = [];
  m.atomi.forEach((a, k) => {
    if (a.h && !a.q && a.Z !== 1) { const p = pKaSito(m, k); if (p && p.pKa < 20) siti.push({ atomo: k, tipo: 'acido', pKa: p.pKa, classe: p.classe }); }
    if (a.Z === 7 && !a.q && coppieSolitarie(m, k) > 0 && !(a.ar && coppieNelAnello(m, k))) { const g = grezzo(m); g.atomi[k].h++; g.atomi[k].q = 1; let p = null; try { p = pKaSito(molecola(g), k); } catch { p = null; } if (p && p.pKa > -3) siti.push({ atomo: k, tipo: 'base', pKa: p.pKa, classe: p.classe }); } });
  // l'accoppiamento tra due siti carichi (in unità di pK): ρ·0,6·0,4^(d−2), d i legami tra i due atomi
  const W = siti.map(() => siti.map(() => 0));
  for (let i = 0; i < siti.length; i++) { const dist = new Map([[siti[i].atomo, 0]]); let fronte = [siti[i].atomo];
    for (let d = 1; d <= 7 && fronte.length; d++) { const poi = []; for (const u of fronte) for (const v of m.vic[u]) if (!dist.has(v.j)) { dist.set(v.j, d); poi.push(v.j); } fronte = poi; }
    for (let j = 0; j < siti.length; j++) { if (i === j) continue; const d = dist.get(siti[j].atomo); if (d != null) W[i][j] = RHO * 0.6 * SMORZA ** (Math.max(d, 1) - 2) * (siti[i].tipo === siti[j].tipo ? 1 : -1); } }
  const out = { m, siti, W }; Object.defineProperty(m, '_siti', { value: out, enumerable: false }); return out;
}
// FORZA IONICA: il coefficiente di attività di uno ione di carica z (legge di Debye e Hückel estesa da Davies 1962):
// −log γ = A·z²·(√I/(1 + √I) − 0,3·I), A = 0,509 a 25 °C (∝ (εT)^−3/2). → −log γ (positivo: lo ione è stabilizzato)
export const debyeHuckel = (z, I, T = 298.15) => { const eps = 87.74 * Math.exp(-0.0046 * (T - ZERO_CELSIUS)), A = 0.509 * Math.pow((78.3 * 298.15) / (eps * T), 1.5), r = Math.sqrt(Math.max(I, 0)); return A * z * z * (r / (1 + r) - 0.3 * I); };
// IL pKa CON LA TEMPERATURA (van 't Hoff): pKa(T) = pKa(25 °C) + ΔH/(R·ln 10)·(1/T − 1/298). ΔH di ionizzazione per classe
// (kJ/mol; Christensen, Hansen e Izatt 1976 [ricordati]): acidi carbossilici ~0, ammonio 52, acqua 55,8, fenoli 23, tioli 26,
// fosforico 4 (medio), imidazolio 36, HCN 44; le altre classi: 20.
const DH_IONIZZAZIONE = { 'acido carbossilico': 0, ammonio: 52, acqua: 55.8, fenolo: 23, tiolo: 26, 'idrogeno solforato': 22, 'acido del fosforo': 4, imidazolio: 36, piridinio: 20, 'acido cianidrico': 44, alcol: 40, anilinio: 31, amidinio: 55 };
export const pKaAllaT = (pKa, classe, T) => (T === 298.15 ? pKa : pKa + ((DH_IONIZZAZIONE[classe] ?? 20) / (R * LN10)) * (1 / T - 1 / 298.15));
// tutti gli stati di protonazione a un pH → { dG (kJ/mol: di quanto l'insieme sta sotto la forma neutra), carica (media),
// stato: [sito ionizzato sì/no] del più popolato, pKa: i pKa apparenti (macroscopici) in ordine }
export function speciazione(x, pH = 7, T = 298.15, I = 0) {
  const { m, siti, W } = sitiAcidoBase(x), n = siti.length; if (!n) return { dG: 0, carica: caricaDi(m), stato: [], siti, neutra: m };
  // i siti lontani non si sentono: si sommano gli stati a gruppi (qui: tutti insieme fino a 14 siti, poi a uno a uno)
  const pk = siti.map((s) => pKaAllaT(s.pKa, s.classe, T)), esp = (i) => (siti[i].tipo === 'acido' ? pH - pk[i] : pk[i] - pH), q0 = caricaDi(m), dh = I > 0 ? (z) => debyeHuckel(z, I, T) : null;
  if (n > 14) { let ln = 0, q = 0; const stato = []; for (let i = 0; i < n; i++) { const e = esp(i), p = 1 / (1 + 10 ** -e); ln += Math.log(1 + 10 ** e); q += p * (siti[i].tipo === 'acido' ? -1 : 1); stato.push(p > 0.5); } return { dG: -R * T * ln, carica: caricaDi(m) + q, stato, siti, neutra: m }; }
  let Zs = 0, qm = 0, meglio = -Infinity, statoM = 0;
  for (let s = 0; s < 1 << n; s++) { let e = 0, q = 0; for (let i = 0; i < n; i++) { if (!((s >> i) & 1)) continue; e += esp(i); q += siti[i].tipo === 'acido' ? -1 : 1; for (let j = i + 1; j < n; j++) if ((s >> j) & 1) e -= W[i][j]; }
    if (dh) e += dh(q0 + q); const w = 10 ** e; Zs += w; qm += w * q; if (e > meglio) { meglio = e; statoM = s; } }
  return { dG: -R * T * Math.log(Zs), carica: caricaDi(m) + qm / Zs, stato: siti.map((_, i) => !!((statoM >> i) & 1)), siti, neutra: m };
}
// la molecola nello stato di protonazione più popolato a quel pH (per la forma, le cariche, il disegno)
export function alPH(x, pH = 7) { const sp = speciazione(x, pH), g = grezzo(sp.neutra); sp.siti.forEach((s, i) => { if (!sp.stato[i]) return; if (s.tipo === 'acido') { g.atomi[s.atomo].h--; g.atomi[s.atomo].q--; } else { g.atomi[s.atomo].h++; g.atomi[s.atomo].q++; } }); return molecola(g); }
// i pKa apparenti: i pH a cui la carica media passa per i mezzi interi
export function pKaApparenti(x) { const { siti } = sitiAcidoBase(x); if (!siti.length) return []; const out = []; let prima = speciazione(x, -4).carica;
  for (let pH = -4; pH <= 18; pH += 0.02) { const q = speciazione(x, pH).carica; if (Math.floor(prima + 0.5) !== Math.floor(q + 0.5)) out.push(+pH.toFixed(2)); prima = q; } return out; }

// log K del primo complesso di uno ione metallico con un donatore, in acqua. LEGGE EMPIRICA rozza (ordine di grandezza):
// una parte elettrostatica, carica dello ione × (½ − carica del donatore) / distanza, e una parte «tenero con tenero»
// (Pearson 1963) per i metalli con elettroni d verso azoto e zolfo. Tarata a occhio su [ricordati]: Mg²⁺-acetato 0,5-1,3,
// Fe³⁺-acetato 3,4, Cu²⁺-NH3 4,1, Zn²⁺-NH3 2,4, Mg²⁺-NH3 0,2, tiolati di Zn/Cu/Fe 6-12. PARAMETRI LIBERI: 4,5; 3,5; 6.
export function logKComplesso(Zmetallo, q, Zdonatore, qDonatore = 0) {
  const M = atomo(Zmetallo), D = atomo(Zdonatore), r = M.raggioCovalente - 0.65 + D.raggioVdW, tenero = (M.blocco === 'd' ? 1 : 0) * (Zdonatore === 16 ? 6 : Zdonatore === 7 ? 3.5 : 0);
  return -1.5 + (4.5 * q * (0.5 - qDonatore)) / (r * 2) + tenero * (q >= 2 ? 1 : 0.5);
}

// ---------- l'energia a T e P, in gas o in acqua
// l'acqua liquida rispetto al suo vapore a 1 bar: ΔG = RT·ln(p_vapore/1 bar), con Clausius e Clapeyron (ΔH di
// evaporazione 44,0 kJ/mol a 298 K, 40,65 a 373 K: dati; bolle a 373,15 K)
const EVAP = (T) => 44.0 - 0.0447 * (T - 298.15);
export const condensaAcqua = (T) => { const a = 44.0 + 0.0447 * 298.15, b = 0.0447, Tb = 373.15; return T * (a * (1 / Tb - 1 / T) + b * Math.log(Tb / T)) + R * T * Math.log(1.01325); };
// raggi ionici (Å, coordinazione 6): Shannon 1976, Acta Cryst. A32, 751 [ricordati]; dove mancano: la regola di molecole_atomi.js
const SHANNON = { Li1: 0.76, Na1: 1.02, K1: 1.38, Be2: 0.45, Mg2: 0.72, Ca2: 1.00, Al3: 0.535, Sc3: 0.745, Ti4: 0.605, Cr3: 0.615, Mn2: 0.83, Fe2: 0.78, Fe3: 0.645, Co2: 0.745, Ni2: 0.69, Cu1: 0.77, Cu2: 0.73, Zn2: 0.74, Ga3: 0.62 };
// IONI SEMPLICI IN ACQUA, MISURATI: ΔHf (kJ/mol) e S (J/mol/K) nella convenzione H⁺(aq) = 0 (NBS Tables, Wagman e altri
// 1982 [ricordati]; Na, K, Mg, Ca, Cl sono gli stessi di mare.js). L'energia di Born di qui sotto resta come regola di
// riserva per gli ioni che non ci sono, e la prova ne stampa l'errore (Mg²⁺ −87, Fe²⁺ +190 kJ/mol: manca il campo dei
// leganti). Con questi dati i potenziali di ossidoriduzione escono da soli (Fe³⁺/Fe²⁺: +0,77 V).
export const IONI_MISURATI = { '[Li+]': [-278.5, 13.4], '[Na+]': [-240.34, 58.45], '[K+]': [-252.14, 101.2], '[Mg+2]': [-467.0, -137.0], '[Ca+2]': [-543.0, -56.2], '[Al+3]': [-531.0, -321.7], '[Mn+2]': [-220.8, -73.6], '[Fe+2]': [-89.1, -137.7], '[Fe+3]': [-48.5, -315.9], '[Co+2]': [-58.2, -113.0], '[Ni+2]': [-54.0, -128.9], '[Cu+]': [71.7, 40.6], '[Cu+2]': [64.8, -99.6], '[Zn+2]': [-153.9, -112.1] };
// lo stesso metallo con un elettrone in più o in meno, se è tra gli ioni misurati → la sua chiave (o null)
export const statoRedox = (Z, q, d) => { const k = `[${SIMBOLI[Z]}+${q + d > 1 ? q + d : ''}]`; return q + d >= 1 && IONI_MISURATI[k] ? k : null; };
const DS_SOLUTO = -0.085; // kJ/mol/K: ciò che un soluto perde entrando in acqua dal gas (regola di Barclay e Butler 1938: dato)
// energia(molecola, { T, P, solvente: null | 'acqua', pH, attivitaAcqua }) →
//   { H, S, G (alla T e P date; gas: stato 1 bar corretto a P; in acqua: soluto 1 M, già sommato sugli stati di protonazione a quel pH),
//     Hf298, S298, stima, in acqua anche: idratazione, carica, protonazione (ΔG degli stati), fase }
export function energia(x, { T = 298.15, P = 1e5, solvente = null, pH = 7, attivitaAcqua = 1, misure = null, born = false, forzaIonica = 0 } = {}) {
  // (si lavora sempre sulla molecola riletta dalla sua chiave: stessa molecola → stessi numeri fino all'ultima cifra, comunque sia stata scritta)
  const m0 = canonica(x), acqua = solvente === 'acqua', m = acqua ? canonica(neutra(m0)) : m0;
  // (misure: { chiave: [ΔHf, S] } di specie misurate — per esempio gli ioni di mare.js — usate al posto della stima)
  if (misure) { const d = misure[chiave(m0)]; if (d) return { H: d[0], S: d[1], G: d[0] - (T * d[1]) / 1000, fase: acqua ? 'acqua' : 'gas', stima: 'misurato', carica: caricaDi(m0), Hf298: d[0], S298: d[1] }; }
  const mono = m.atomi.length === 1 && !m.atomi[0].h && m.atomi[0].q !== 0;
  if (acqua && m.atomi.length === 1 && m.atomi[0].Z === 1 && m.atomi[0].q === 1) return { H: 0, S: 0, G: -R * T * LN10 * pH, fase: 'acqua', stima: 'convenzione: H⁺(aq) = 0', carica: 1, Hf298: 0, S298: 0 };
  // un complesso di uno ione metallico in acqua: lo ione e i suoi leganti presi separati, più l'energia di ogni legame dativo (regola di logK)
  // (vale anche per i legami ionici con un metallo: i gruppi ferro-zolfo, [Fe+3]~[S-2]: ione e solfuro presi separati, più log K per legame)
  const met = (k) => atomo(m.atomi[k].Z).metallo && m.atomi[k].q > 0, legato = (l) => (l.t === 'd' && met(l.b)) || (l.t === 'i' && (met(l.a) !== met(l.b)));
  if (acqua && m.legami.some(legato)) { const g = grezzo(m); let dG = 0; g.legami = m.legami.map((l, i) => ({ l, g: g.legami[i] })).filter(({ l }) => { if (!legato(l)) return true; const [M_, D] = met(l.b) ? [l.b, l.a] : [l.a, l.b]; dG += -R * T * LN10 * logKComplesso(m.atomi[M_].Z, m.atomi[M_].q, m.atomi[D].Z, m.atomi[D].q); return false; }).map(({ g: gg }) => gg);
    const pezzi = componentiDi(molecola(g)).map((c) => energia(c, { T, P, solvente, pH, attivitaAcqua, misure, forzaIonica })); return { H: pezzi.reduce((s, e) => s + e.H, 0) + dG, S: pezzi.reduce((s, e) => s + e.S, 0), G: pezzi.reduce((s, e) => s + e.G, 0) + dG, legame: dG, fase: 'acqua', stima: 'complesso: regola di log K', carica: caricaDi(m), Hf298: NaN, S298: NaN }; }
  const hf = entalpiaGas(m), t298 = termica(m, 298.15, 1e5), tT = T === 298.15 ? t298 : termica(m, T, 1e5);
  const H = hf.H + tT.Htermica - t298.Htermica, S = tT.S;
  if (!acqua) return { H, S: S - 1000 * R * Math.log(P / 1e5), G: H - (T * S) / 1000 + R * T * Math.log(P / 1e5), fase: 'gas', stima: hf.stima, riservati: hf.riservati, Hf298: hf.H, S298: t298.S };
  if (chiave(m) === 'O') { const g = condensaAcqua(T); return { H: H - EVAP(T), S: S - (1000 * (EVAP(T) + g)) / T, G: H - (T * S) / 1000 + g + R * T * Math.log(Math.max(attivitaAcqua, 1e-12)), fase: 'acqua (solvente)', stima: hf.stima, carica: 0, Hf298: hf.H, S298: t298.S }; }
  if (mono && !born && IONI_MISURATI[chiave(m)]) { const d = IONI_MISURATI[chiave(m)], q = m.atomi[0].q, gamma = forzaIonica > 0 ? -R * T * LN10 * debyeHuckel(q, forzaIonica, T) : 0; return { H: d[0], S: d[1], G: d[0] - (T * d[1]) / 1000 + gamma, fase: 'acqua', stima: 'misurato', carica: q, Hf298: d[0], S298: d[1] }; }
  if (mono) { // ione semplice senza dati: Born, nella convenzione H⁺(aq) = 0
    const a = m.atomi[0], eps = 87.74 * Math.exp(-0.0046 * (T - ZERO_CELSIUS)), born = (-694.65 * a.q * a.q * (1 - 1 / eps)) / (SHANNON[SIMBOLI[a.Z] + a.q] != null ? SHANNON[SIMBOLI[a.Z] + a.q] + (a.q > 0 ? 0.85 : 0.1) : raggioDiBorn(a.Z, a.q));
    // (la scala: ΔG di idratazione assoluta di H⁺ −1056 kJ/mol, Marcus 1991, la stessa su cui sono tarati i raggi di Latimer; S di H⁺ gas 108,9 J/mol/K)
    const G = H - (T * S) / 1000 + born - a.q * (HF_PROTONE - T * 0.1089 - 1056);
    return { H, S, G, fase: 'acqua', stima: 'ione semplice: Born', idratazione: born, carica: a.q, Hf298: hf.H, S298: t298.S }; }
  const idr = idratazione(m) + R * 298.15 * Math.log(24.465), sp = speciazione(m, pH, T, forzaIonica); // (da gas a 1 bar a soluzione 1 M)
  const Gn = H - (T * S) / 1000 + idr - (T - 298.15) * DS_SOLUTO;
  return { H: H + idr + 298.15 * DS_SOLUTO, S: S + 1000 * DS_SOLUTO, G: Gn + sp.dG, Gneutra: Gn, fase: 'acqua', stima: hf.stima, riservati: hf.riservati, idratazione: idr, protonazione: sp.dG, carica: sp.carica, Hf298: hf.H, S298: t298.S };
}
export { caricaDi, conta, NUMERO, lunghezzaLegame, sommaLegami };
