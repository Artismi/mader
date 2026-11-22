// linee.js — i motivi a linee chiuse: le orbite periodiche scelte (e, con la sorgente ✴️, le loro sorelle per
// simmetria), ognuna disegnata UNA volta e ripetuta dal reticolo; e il controcampo di Day (le regioni tra le linee
// colorate a scacchi, solo come vista).

import { creaCristallo, vincola } from './reticolo.js';
import { creaTessera } from './moto.js';
import { punti, sorelle, leggiOrbita } from './orbite.js';
import { gruppoDelSito } from './simmetria.js';

// il cristallo del pattern (piano) e le orbite da disegnare
export function orbiteDi(p) {
  const cr = creaCristallo({ ...vincola(p.reticolo), atomi: p.atomi, w: p.w, U0: p.U0 });
  let orbite = (p.orbite ?? []).map(leggiOrbita);
  if (p.sorgente && orbite.length) {
    const g = gruppoDelSito(cr, p.r0), tutte = [];
    for (const o of orbite) for (const q of sorelle(o, g, p.r0)) tutte.push(q);
    orbite = tutte;
  }
  return { cr, orbite };
}

// la tessera delle orbite: i tratti di un periodo di ognuna, ripiegati nella cella
export function tesseraDelleOrbite(p) {
  const { cr, orbite } = orbiteDi(p), t = creaTessera(cr);
  orbite.forEach((o, i) => {
    const { P } = punti(cr, o, p.B ?? [0, 0, 0]);
    for (let k = 1; k < P.length; k++) t.aggiungi([P[k - 1][0], P[k - 1][1], 0], [P[k][0], P[k][1], 0], i);
  });
  return { cr, orbite, tessera: t };
}

// IL CONTROCAMPO: su un'immagine a linee (1 dove c'è una linea, 0 altrove) le regioni connesse dello sfondo si
// colorano in due colori, con la regola pari/dispari: due regioni separate da una linea hanno colori diversi (un
// colore per BFS sul grafo delle regioni vicine attraverso una linea, partendo dalla più grande). Restituisce per ogni
// punto 0 (linea, o regione più piccola di «minimo» punti), 1 o 2.
export function controcampo(linee, W, H, minimo = Math.round(0.0004 * W * H)) {
  const lab = new Int32Array(W * H).fill(-1), coda = new Int32Array(W * H);
  let n = 0;
  for (let i = 0; i < W * H; i++) {
    if (linee[i] || lab[i] >= 0) continue;
    let a = 0, b = 0; coda[b++] = i; lab[i] = n;
    while (a < b) {
      const q = coda[a++], x = q % W, y = (q - x) / W;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        const r = Y * W + X; if (!linee[r] && lab[r] < 0) { lab[r] = n; coda[b++] = r; }
      }
    }
    n++;
  }
  // le regioni vicine attraverso una linea: per ogni punto di linea, le etichette nel suo intorno 5 × 5
  const vicini = Array.from({ length: n }, () => new Set()), dim = new Int32Array(n);
  for (let i = 0; i < W * H; i++) if (lab[i] >= 0) dim[lab[i]]++;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!linee[y * W + x]) continue;
    const viste = new Set();
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < W && Y < H && lab[Y * W + X] >= 0) viste.add(lab[Y * W + X]); }
    const v = [...viste]; for (const a of v) for (const b of v) if (a !== b) vicini[a].add(b);
  }
  const colore = new Int8Array(n).fill(0), ordine = [...Array(n).keys()].sort((a, b) => dim[b] - dim[a]);
  for (const s of ordine) {
    if (colore[s]) continue; colore[s] = 1; const q = [s];
    while (q.length) { const a = q.shift(); for (const b of vicini[a]) if (!colore[b]) { colore[b] = 3 - colore[a]; q.push(b); } }
  }
  const out = new Uint8Array(W * H);
  // le regioni minuscole (un rombino dove due linee spesse si incrociano) vanno col colore delle linee
  for (let i = 0; i < W * H; i++) out[i] = lab[i] >= 0 && dim[lab[i]] >= minimo ? colore[lab[i]] : 0;
  return out;
}
