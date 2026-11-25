// tessere_mappa.worker.js — LE TESSERE DELLA MAPPA PIATTA (livello 4) calcolate fuori dal filo dell'interfaccia.
//
// Una tessera costa da mezzo secondo a qualche secondo (geologia.js tessera: le due ottave del rilievo e l'erosione della
// tessera, più la madre se non c'è ancora), la sua immagine e il suo mare altre decine di millisecondi: sul filo principale
// fermavano la rotella a ogni tessera nuova. Qui si fanno con le stesse funzioni e gli stessi argomenti di mappa.js
// (disegnaSuperficie): gli stessi bit; la pagina intanto mostra le tessere più grosse che ha già.
//
// Messaggi:  { tipo: 'base', k, se, cl, mare, seme, T }      una volta per pianeta (la superficie di superficie.worker.js)
//            { tipo: 'tessera', k, L, tx, ty, t }           → { tipo: 'tessera', k, L, tx, ty, sf, px, base, mossa, ms }
// (sf: i dati della tessera senza le funzioni; px: l'immagine con il mare all'istante t; base: la stessa senz'acqua sopra, se
// c'è acqua: da lì la pagina ridisegna il mare che si muove; mossa: se le onde si vedono)
import { tessera, immagineSuperficie } from './geologia.js';
import { aspettoMare } from './mare.js';

let B = null;
function soloDati(o, visti = new Map()) {
  if (o === null || typeof o !== 'object') return typeof o === 'function' ? undefined : o; if (ArrayBuffer.isView(o)) return o; if (visti.has(o)) return visti.get(o);
  if (Array.isArray(o)) { const a = []; visti.set(o, a); for (const x of o) a.push(soloDati(x, visti)); return a; }
  const r = {}; visti.set(o, r); for (const k of Object.keys(o)) { const x = soloDati(o[k], visti); if (x !== undefined) r[k] = x; } return r;
}
self.onmessage = (e) => {
  const d = e.data;
  if (d.tipo === 'base') { B = d; return; }
  if (d.tipo !== 'tessera') return;
  const { k, L, tx, ty } = d;
  try {
    if (!B || B.k !== k) throw new Error('il pianeta non è questo');
    const t0 = performance.now(), sf = tessera(B.k, B.se, B.cl, L, tx, ty, B.seme), px = immagineSuperficie(sf, B.T, B.cl);
    let acqua = false; if (B.mare?.esiste) { for (let q = 0; q < sf.alt.length; q += 7) if (sf.alt[q] < sf.mare || (sf.lago && sf.lago[q] > 0)) { acqua = true; break; } }
    const base = acqua ? px.slice() : null;
    if (acqua) aspettoMare(B.mare, sf, px, { t: d.t, onde: 6 });
    const mossa = acqua && (aspettoMare.ultimo?.onde || 0) > 0;
    // (sf resta nella memoria delle tessere di questo filo, per le figlie: si copia; le immagini sono nuove e si passano)
    self.postMessage({ tipo: 'tessera', k, L, tx, ty, sf: L === 0 ? null : soloDati(sf), px, base, mossa, ms: performance.now() - t0 }, base ? [px.buffer, base.buffer] : [px.buffer]);
  } catch (err) { self.postMessage({ tipo: 'tessera', k, L, tx, ty, errore: String((err && err.stack) || err) }); }
};
