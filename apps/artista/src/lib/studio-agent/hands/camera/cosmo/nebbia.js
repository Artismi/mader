// nebbia.js — le particelle tutte, senza simularle tutte.
//
// Da lontano una fascia di radiazione o un anello sono una nebbia: quante
// particelle ci sono in ogni punto e come si muovono in media. La nebbia è un
// CAMPIONE fisso di particelle (sempre le stesse per lo stesso pianeta): da
// lontano si vede come puntini che scorrono, avvicinandosi ognuna diventa il
// suo giro vero, e più vicino ancora (dentro una regione) le traiettorie sono
// simulate una per una. La nebbia è la media delle particelle; le particelle
// sono un campione della nebbia: non si contraddicono.
//
// Come si muove: i protoni della fascia scivolano attorno al pianeta in un
// verso, gli elettroni nell'altro (deriva di gradiente: Ω = 3·r·W / (q·B0·R²),
// con W l'energia); i granelli dell'anello girano con la velocità di Keplero
// (Ω = √(G·M / (rR)³)), con la massa vera del pianeta (quella che gli ha dato
// il disco: la stessa di tutti gli altri calcoli).

import { sistema, pianeta, fascia, FASCIA_MAX, sorgenteEvento } from './cosmo.js';
import { COSTANTI } from './leggi.js'; // le costanti e le unità: un posto solo
import { ME_MEV, MP_MEV } from './unita.js'; // le masse delle particelle in MeV, dal registro

const Q = COSTANTI.e, MEV = 1.602e-13, G = COSTANTI.G;
export const ACCELERA = 40; // il tempo della mappa scorre 40 volte più in fretta
const memo = new Map();

export function nebbiaPianeta(n, gid, sid, pid) {
  const k = `${n}|${gid}|${sid}|${pid}`; if (memo.has(k)) return memo.get(k);
  const P = sistema(n, gid, sid).pianeti[pid], Pl = pianeta(n, gid, sid, pid);
  // il campione è scelto per indirizzo (eventi.js): la candidata numero i ha le sue estrazioni (8·i, 8·i+1, …) dell'evento
  // «nebbia/…/fascia» (o «…/anello»), qualunque cosa sia successa alle altre: gli stessi individui, in qualunque ordine
  const ev = sorgenteEvento('nebbia', n, gid, sid, pid), cf = ev.serie('fascia'), ca = ev.serie('anello');
  const fascia_ = [], anello = [], fmax = FASCIA_MAX;
  for (let i = 0; i < 40000 && fascia_.length < 2600; i++) {
    const q = 8 * i, r = 1.15 + cf(q) * 4.85; if (cf(q + 1) > fascia(P, Pl, r) / fmax) continue;
    const elettrone = cf(q + 2) < 0.5, E = elettrone ? 0.05 + 0.73 * cf(q + 3) : 10 * Math.pow(30, cf(q + 3)), m = elettrone ? ME_MEV : MP_MEV;
    const p = Math.sqrt(E * E + 2 * E * m), B = P.B0 / r ** 3;
    fascia_.push({ r, fi: cf(q + 4) * 2 * Math.PI, rg: (p * 3.336e-3) / B / P.raggioM, elettrone, omega: ((elettrone ? -1 : 1) * 3 * r * E * MEV) / (Q * P.B0 * P.raggioM ** 2) });
  }
  const M = P.massaKg;
  if (Pl.anello) for (let i = 0; i < 60000 && anello.length < 3000; i++) {
    const q = 8 * i, r = Pl.anello[0] + ca(q) * (Pl.anello[1] - Pl.anello[0]); if (ca(q + 1) * 2 > Pl.densitaAnello(r)) continue;
    anello.push({ r, fi: ca(q + 2) * 2 * Math.PI, omega: Math.sqrt((G * M) / (r * P.raggioM) ** 3) });
  }
  const out = { fascia: fascia_, anello, M };
  memo.set(k, out); if (memo.size > 6) memo.delete(memo.keys().next().value);
  return out;
}

// quante particelle ci sono davvero in una regione, in ogni istante, in uno strato spesso un metro
// (raggi cosmici: ~4 per cm² al secondo, che corrono quasi alla velocità della luce; fascia: fino
// a qualche decina per metro cubo, dove è piena)
export function conteggioVero(cella) {
  const a = cella.indirizzo, d = cella.dipoli?.[0]; if (!a || !d || !cella.scala) return null;
  const P = sistema(a.cosmo, a.galassia, a.stella).pianeti[a.pianeta], Pl = pianeta(a.cosmo, a.galassia, a.stella, a.pianeta);
  const r = Math.hypot(cella.larghezza / 2 - d.centro[0], cella.altezza / 2 - d.centro[1]) / d.R, V = cella.scala.latoM ** 2;
  const raggi = 1.7e-4 * V * (cella.sorgenti.some((s) => s.specie === 'protone') ? 1 : 0), fasciaN = 20 * (fascia(P, Pl, r) / FASCIA_MAX) * V;
  return { raggi, fascia: fasciaN, r, disegnate: cella.sorgenti.length };
}
export const fmtGrande = (x) => (x < 1e3 ? Math.round(x).toString() : x < 1e6 ? `${Math.round(x / 1e3)} mila` : x < 1e9 ? `${(x / 1e6).toFixed(0)} milioni` : x < 1e12 ? `${(x / 1e9).toFixed(0)} miliardi` : `${(x / 1e12).toFixed(0)} mila miliardi`);
