import { PESI_ATOMICI } from './leggi.js'; // le costanti e le unità: un posto solo
// molecole_atomi.js — GLI ATOMI: la prima parte della chimica generale (vedi molecole.js per l'intestazione completa).
//
// LEGGI (ricavate qui, e confrontate con le misure nelle prove):
//   · il riempimento dei gusci (ordine di Madelung: 1s 2s 2p 3s 3p 4s 3d 4p 5s 4d; eccezioni dichiarate: Cr, Cu, Mo
//     tengono un solo elettrone s per avere il guscio d mezzo pieno o pieno) → periodo, gruppo, blocco, elettroni di valenza;
//   · le regole di Slater (1930) per la carica efficace vista da un elettrone: gli altri del suo gruppo schermano 0,35
//     (0,30 nell'1s), quelli del guscio sotto 0,85, i più interni 1; per un elettrone d tutto ciò che sta sotto scherma 1;
//   · da questa: il raggio dell'orbitale esterno r = n*²·a₀/Z_eff; l'energia di ionizzazione come differenza tra le
//     energie totali −13,6 eV·Σ(Z_eff/n*)² dell'atomo e dello ione; l'elettronegatività di Allred e Rochow (1958),
//     χ = 0,359·Z_eff/r² + 0,744 (la forza con cui il nucleo tira un elettrone al raggio covalente);
//   · le valenze: quanti elettroni mancano all'ottetto (8 − elettroni di valenza; al duetto per H), e dal terzo periodo
//     in su anche quelle «espanse» (di due in due, fino a impegnare tutti gli elettroni di valenza: S 2, 4, 6); una
//     carica formale sposta l'atomo di una casella (N⁺ si comporta come C, O⁻ come F); gli stati di ossidazione vanno
//     da −(8 − v) a +v.
// DATI (misurati, usati nei conti dove la legge qui sopra non basta; fonti):
//   · masse, elettronegatività di Pauling, raggi di van der Waals, energie di ionizzazione, affinità elettroniche, stati
//     di ossidazione osservati: PubChem Periodic Table (NIH/NLM, dominio pubblico; a sua volta da IUPAC e NIST);
//   · raggi covalenti: Cordero e altri 2008, Dalton Trans. 2832 (per Mn, Fe, Co il valore ad alto spin; per il carbonio
//     0,76 sp³, 0,73 sp², 0,69 sp);
//   · entalpia di formazione dell'atomo gassoso a 298 K (kJ/mol): CODATA 1989 (Cox, Wagman e Medvedev);
//   · per il campo di forze (molecole_forze.js): distanza e profondità di van der Waals, carica efficace, barriera di
//     torsione, elettronegatività e durezza per l'equilibrio delle cariche: Rappé, Casewit, Colwell, Goddard e Skiff 1992,
//     J. Am. Chem. Soc. 114, 10024 (UFF, tabella 1) e Rappé e Goddard 1991, J. Phys. Chem. 95, 3358 (QEq). Sono numeri
//     pubblicati, riportati da codici a licenza libera (RDKit, BSD-3: Code/ForceField/UFF/Params.cpp, da cui sono letti).
// CHE COSA NON TORNA: le regole di Slater sono rozze per i metalli di transizione (ionizzazione entro il 20-40%) e per
// i raggi (l'idrogeno esce 0,53 Å contro 0,31): le prove stampano gli scarti; nei conti si usano i dati misurati.

// simbolo, nome, massa (u), χ Pauling, raggio covalente (pm), raggio di van der Waals (pm), ionizzazione (eV), affinità
// elettronica (eV), ΔHf dell'atomo gassoso (kJ/mol), stati di ossidazione osservati, UFF [x (Å), D (kcal/mol), Z*,
// V torsione sp³ (kcal/mol), χ QEq (eV), durezza QEq (eV)]
const TAVOLA = [null,
  ['H', 'idrogeno', PESI_ATOMICI.H, 2.2, 31, 120, 13.598, 0.754, 217.998, '1,-1', [2.886, 0.044, 0.712, 0, 4.528, 6.9452]],
  ['He', 'elio', PESI_ATOMICI.He, null, 28, 140, 24.587, null, 0, '0', [2.362, 0.056, 0.098, 0, 9.66, 14.92]],
  ['Li', 'litio', 7, 0.98, 128, 182, 5.392, 0.618, 159.3, '1', [2.451, 0.025, 1.026, 0, 3.006, 2.386]],
  ['Be', 'berillio', 9.01218, 1.57, 96, 153, 9.323, null, 324, '2', [2.745, 0.085, 1.565, 0, 4.877, 4.443]],
  ['B', 'boro', 10.81, 2.04, 84, 192, 8.298, 0.277, 565, '3', [4.083, 0.18, 1.755, 0, 5.11, 4.75]],
  ['C', 'carbonio', PESI_ATOMICI.C, 2.55, 76, 170, 11.26, 1.263, 716.68, '4,2,-4', [3.851, 0.105, 1.912, 2.119, 5.343, 5.063]],
  ['N', 'azoto', PESI_ATOMICI.N, 3.04, 71, 155, 14.534, null, 472.68, '5,4,3,2,1,-1,-2,-3', [3.66, 0.069, 2.544, 0.45, 6.899, 5.88]],
  ['O', 'ossigeno', PESI_ATOMICI.O, 3.44, 66, 152, 13.618, 1.461, 249.18, '-2', [3.5, 0.06, 2.3, 0.018, 8.741, 6.682]],
  ['F', 'fluoro', 18.9984, 3.98, 57, 135, 17.423, 3.339, 79.38, '-1', [3.364, 0.05, 1.735, 0, 10.874, 7.474]],
  ['Ne', 'neon', 20.18, null, 58, 154, 21.565, null, 0, '0', [3.243, 0.042, 0.194, 0, 11.04, 10.55]],
  ['Na', 'sodio', 22.9898, 0.93, 166, 227, 5.139, 0.548, 107.5, '1', [2.983, 0.03, 1.081, 0, 2.843, 2.296]],
  ['Mg', 'magnesio', PESI_ATOMICI.Mg, 1.31, 141, 173, 7.646, null, 147.1, '2', [3.021, 0.111, 1.787, 0, 3.951, 3.693]],
  ['Al', 'alluminio', 26.9815, 1.61, 121, 184, 5.986, 0.441, 330.0, '3', [4.499, 0.505, 1.792, 0, 4.06, 3.59]],
  ['Si', 'silicio', PESI_ATOMICI.Si, 1.9, 111, 210, 8.152, 1.385, 450.0, '4,2,-4', [4.295, 0.402, 2.323, 1.225, 4.168, 3.487]],
  ['P', 'fosforo', 30.9738, 2.19, 107, 180, 10.487, 0.746, 316.5, '5,3,-3', [4.147, 0.305, 2.863, 2.4, 5.463, 4]],
  ['S', 'zolfo', 32.07, 2.58, 105, 180, 10.36, 2.077, 277.17, '6,4,-2', [4.035, 0.274, 2.703, 0.484, 6.928, 4.486]],
  ['Cl', 'cloro', PESI_ATOMICI.Cl, 3.16, 102, 175, 12.968, 3.617, 121.301, '7,5,1,-1', [3.947, 0.227, 2.348, 0, 8.564, 4.946]],
  ['Ar', 'argo', 39.9, null, 106, 188, 15.76, null, 0, '0', [3.868, 0.185, 0.3, 0, 9.465, 6.355]],
  ['K', 'potassio', 39.0983, 0.82, 203, 275, 4.341, 0.501, 89.0, '1', [3.812, 0.035, 1.165, 0, 2.421, 1.92]],
  ['Ca', 'calcio', 40.08, 1, 176, 231, 6.113, null, 177.8, '2', [3.399, 0.238, 2.141, 0, 3.231, 2.88]],
  ['Sc', 'scandio', 44.9559, 1.36, 170, 211, 6.561, 0.188, 377.8, '3', [3.295, 0.019, 2.592, 0, 3.395, 3.08]],
  ['Ti', 'titanio', 47.867, 1.54, 160, 187, 6.828, 0.079, 473, '4,3,2', [3.175, 0.017, 2.659, 0, 3.47, 3.38]],
  ['V', 'vanadio', 50.9415, 1.63, 153, 179, 6.746, 0.525, 515.5, '5,4,3,2', [3.144, 0.016, 2.679, 0, 3.65, 3.41]],
  ['Cr', 'cromo', 51.996, 1.66, 139, 189, 6.767, 0.666, 397.5, '6,3,2', [3.023, 0.015, 2.463, 0, 3.415, 3.865]],
  ['Mn', 'manganese', 54.938, 1.55, 161, 197, 7.434, null, 283.3, '7,4,3,2', [2.961, 0.013, 2.43, 0, 3.325, 4.105]],
  ['Fe', 'ferro', 55.84, 1.83, 152, 194, 7.902, 0.163, 416.3, '3,2', [2.912, 0.013, 2.43, 0, 3.76, 4.14]],
  ['Co', 'cobalto', 58.9332, 1.88, 150, 192, 7.881, 0.661, 426.7, '3,2', [2.872, 0.014, 2.43, 0, 4.105, 4.175]],
  ['Ni', 'nichel', 58.693, 1.91, 124, 163, 7.64, 1.156, 430.1, '3,2', [2.834, 0.015, 2.43, 0, 4.465, 4.205]],
  ['Cu', 'rame', 63.55, 1.9, 132, 140, 7.726, 1.228, 337.4, '2,1', [3.495, 0.005, 1.756, 0, 4.2, 4.22]],
  ['Zn', 'zinco', 65.4, 1.65, 122, 139, 9.394, null, 130.4, '2', [2.763, 0.124, 1.308, 0, 5.106, 4.285]],
  ['Ga', 'gallio', 69.723, 1.81, 122, 187, 5.999, 0.3, 272, '3', [4.383, 0.415, 1.821, 0, 3.641, 3.16]],
  ['Ge', 'germanio', 72.63, 2.01, 120, 211, 7.9, 1.35, 372, '4,2', [4.28, 0.379, 2.789, 0.701, 4.051, 3.438]],
  ['As', 'arsenico', 74.9216, 2.18, 119, 185, 9.815, 0.81, 302.5, '5,3,-3', [4.23, 0.309, 2.864, 1.5, 5.188, 3.809]],
  ['Se', 'selenio', 78.97, 2.55, 120, 190, 9.752, 2.021, 227.2, '6,4,-2', [4.205, 0.291, 2.764, 0.335, 6.428, 4.131]],
  ['Br', 'bromo', 79.9, 2.96, 120, 183, 11.814, 3.365, 111.87, '5,1,-1', [4.189, 0.251, 2.519, 0, 7.79, 4.425]],
  ['Kr', 'cripto', 83.8, 3, 116, 202, 14, null, 0, '0', [4.141, 0.22, 0.452, 0, 8.505, 5.715]],
];
TAVOLA[42] = ['Mo', 'molibdeno', 95.95, 2.16, 154, 209, 7.092, 0.746, 658.98, '6', [3.052, 0.056, 3.4, 0, 3.465, 3.755]];
export const NUMERO = Object.fromEntries(TAVOLA.map((r, Z) => (r ? [r[0], Z] : null)).filter(Boolean)); // simbolo → Z
export const NUMERI_ATOMICI = Object.values(NUMERO);

// ---------- i gusci
const ORDINE = ['1s', '2s', '2p', '3s', '3p', '4s', '3d', '4p', '5s', '4d', '5p'], CAPIENZA = { s: 2, p: 6, d: 10 };
const ECCEZIONI = { 24: { '4s': 1, '3d': 5 }, 29: { '4s': 1, '3d': 10 }, 42: { '5s': 1, '4d': 5 } };
// gli elettroni di un atomo (o di uno ione) guscio per guscio. Lo ione positivo perde prima quelli del guscio più
// esterno (il 4s prima del 3d: è così che si ionizzano i metalli di transizione).
export function gusci(Z, carica = 0) {
  const g = {}; let n = Z;
  for (const o of ORDINE) { if (n <= 0) break; const k = Math.min(n, CAPIENZA[o[1]]); g[o] = k; n -= k; }
  Object.assign(g, ECCEZIONI[Z] || {});
  if (carica < 0) { let da = -carica; for (const o of ORDINE) { if (!da) break; const k = Math.min(da, CAPIENZA[o[1]] - (g[o] || 0)); if (k > 0) { g[o] = (g[o] || 0) + k; da -= k; } } }
  for (let q = carica; q > 0; q--) { const piu = Object.keys(g).filter((o) => g[o] > 0).sort((a, b) => b[0] - a[0] || 'spd'.indexOf(b[1]) - 'spd'.indexOf(a[1]))[0]; if (!piu) break; g[piu]--; }
  for (const o in g) if (!g[o]) delete g[o];
  return g;
}
const N_EFFICACE = [0, 1, 2, 3, 3.7, 4.0, 4.2], A0 = 0.529177, RYDBERG = 13.6057;
const gruppoSlater = (o) => (o[1] === 'd' ? o : o[0] + 'sp');
// la carica efficace vista da un elettrone dell'orbitale «orbitale» (regole di Slater); «aggiunto»: quella vista da un
// elettrone in più, messo lì (serve all'elettronegatività)
export function caricaEfficace(Z, orbitale, { carica = 0, aggiunto = false, g = gusci(Z, carica) } = {}) {
  const n = +orbitale[0], d = orbitale[1] === 'd', mio = gruppoSlater(orbitale); let s = 0;
  for (const o in g) {
    const no = +o[0], stesso = gruppoSlater(o) === mio;
    if (stesso) s += (g[o] - (o === orbitale && !aggiunto ? 1 : 0)) * (n === 1 ? 0.30 : 0.35);
    else if (d) s += no < n || (no === n && o[1] !== 'd') ? g[o] : 0;
    else if (no === n - 1) s += 0.85 * g[o]; else if (no < n - 1) s += g[o];
  }
  return Z - s;
}
const energiaSlater = (Z, g) => { let e = 0; for (const o in g) { const zeff = caricaEfficace(Z, o, { g }); e -= g[o] * RYDBERG * (zeff / N_EFFICACE[+o[0]]) ** 2; } return e; };
const esterno = (g) => Object.keys(g).sort((a, b) => b[0] - a[0] || 'spd'.indexOf(b[1]) - 'spd'.indexOf(a[1]))[0];

// ---------- le valenze
// quanti legami covalenti può fare un atomo con carica formale q: ciò che manca all'ottetto, e le valenze espanse
export function valenzeDi(Z, q = 0) {
  const a = atomo(Z), ev = a.elettroniValenza - q;
  if (ev < 0) return [];
  if (a.periodo === 1) return ev === 1 ? [1] : ev === 0 || ev === 2 ? [0] : [];
  if (a.blocco === 'd') { const o = []; for (let k = 0; k <= Math.min(ev, 6); k++) o.push(k); return o; }
  if (ev > 8) return [];
  if (ev === 8) return [0];
  if (ev <= 4) return [ev];
  const o = []; for (let k = 8 - ev; k <= ev; k += 2) { o.push(k); if (a.periodo < 3) break; }
  return o;
}
// quanti elettroni tiene il guscio di valenza: 2, 8, e oltre l'ottetto solo dove ci sono orbitali d vicini
export const capienzaGuscio = (Z) => { const a = atomo(Z); return a.periodo === 1 ? 2 : a.periodo === 2 ? 8 : a.blocco === 'd' || a.periodo >= 4 ? 18 : 12; };

const memo = new Map();
// atomo(Z o simbolo) → tutto ciò che si sa di un elemento: i dati misurati e ciò che si ricava dai gusci
export function atomo(z) {
  const Z = typeof z === 'string' ? NUMERO[z] : z, r = TAVOLA[Z];
  if (!r) throw new Error(`molecole: elemento sconosciuto ${z}`);
  if (memo.has(Z)) return memo.get(Z);
  const g = gusci(Z), est = esterno(g), periodo = +est[0], nd = g[`${periodo - 1}d`] || 0, np = g[`${periodo}p`] || 0, ns = g[`${periodo}s`] || 0;
  const blocco = np > 0 ? 'p' : nd > 0 && nd < 10 ? 'd' : nd === 10 && Z !== 30 && ns === 1 ? 'd' : 's';
  // (lo zinco ha il guscio d pieno e chiuso: si comporta da metallo a due elettroni; il rame no: perde anche un d)
  const elettroniValenza = Z === 2 ? 2 : blocco === 'd' ? ns + nd : ns + np, gruppo = Z === 2 ? 18 : blocco === 'p' ? 10 + elettroniValenza : blocco === 'd' ? ns + nd : nd === 10 ? 12 : ns;
  const zeff = caricaEfficace(Z, est, { g }), nstar = N_EFFICACE[periodo], rc = r[4] / 100;
  const ione = gusci(Z, 1), uff = r[10];
  const a = {
    Z, simbolo: r[0], nome: r[1], massa: r[2], periodo, gruppo, blocco, gusci: g, elettroniValenza,
    configurazione: ORDINE.filter((o) => g[o]).map((o) => o + g[o]).join(' '),
    metallo: blocco === 'd' || (blocco === 's' && Z > 2 && Z !== 1) || [13, 31].includes(Z),
    // misurati
    chi: r[3], raggioCovalente: rc, raggioVdW: r[5] / 100, ionizzazione: r[6], affinita: r[7], HfAtomo: r[8], ossidazioniMisurate: r[9].split(',').map(Number),
    // ricavati dalla struttura elettronica
    caricaEfficace: zeff, raggioSlater: (nstar * nstar * A0) / zeff, ionizzazioneSlater: energiaSlater(Z, ione) - energiaSlater(Z, g),
    chiAllredRochow: Z === 2 || Z === 10 || Z === 18 || Z === 36 ? null : (0.359 * caricaEfficace(Z, est, { g, aggiunto: true })) / (rc * rc) + 0.744,
    ossidazioni: blocco === 'd' ? [0, Math.min(elettroniValenza, 8)] : [elettroniValenza >= 4 ? elettroniValenza - 8 : Z === 1 ? -1 : 0, elettroniValenza === 8 || Z === 2 ? 0 : elettroniValenza],
    uff: { x: uff[0], D: uff[1], Zstar: uff[2], V: uff[3], chi: uff[4], durezza: uff[5] },
  };
  memo.set(Z, a);
  a.valenze = valenzeDi(Z, 0);
  return a;
}
// il raggio di un legame covalente: quello di Cordero, e per il carbonio quello della sua ibridazione (pm → Å)
export const raggioDiLegame = (Z, sterico = 4) => (Z === 6 ? (sterico >= 4 ? 0.76 : sterico === 3 ? 0.73 : 0.69) : atomo(Z).raggioCovalente);
// il raggio con cui uno ione sta nell'acqua (per l'energia di Born). LEGGE EMPIRICA (Latimer, Pitzer e Slansky 1939):
// un catione ha il raggio dell'atomo meno un guscio, e la cavità che scava è più larga di 0,85 Å (in tutto: raggio
// covalente + 0,2 Å, entro 0,1 Å per Na, K, Mg, Ca, Fe, Zn); un anione semplice ha il suo raggio di van der Waals + 0,1.
export const raggioDiBorn = (Z, q) => (q > 0 ? atomo(Z).raggioCovalente + 0.2 : atomo(Z).raggioVdW + 0.1);
export const SIMBOLI = TAVOLA.map((r) => (r ? r[0] : null));
