// clima.worker.js — UN FILO CHE AIUTA IL CLIMA (geologia.js climaSuperficie): fa, passo dopo passo, le sue righe e le sue colonne
// della griglia del clima con le stesse funzioni del filo che coordina (celleClima, righeClima, colonneClima, chiudiClima), sulla
// stessa memoria condivisa; a ogni passo si aspettano (barrieraClima). Celle diverse, fili diversi, gli stessi conti nello stesso
// ordine: gli stessi bit del clima fatto in un filo solo. Lo accende superficie.worker.js, se il navigatore dà la memoria condivisa.
// Messaggi:  { tipo: 'avvio', pronti, i }                                 (segna pronti[i] = 1 quando il modulo è caricato)
//            { tipo: 'clima', Z, Fs, B, P, j0, j1, i0, i1 }              (un'integrazione intera: Z.totale passi)
import { passoClimaFilo, barrieraClima } from './geologia.js';

self.onmessage = (e) => {
  const d = e.data;
  if (d.tipo === 'avvio') { Atomics.store(d.pronti, d.i, 1); return; }
  if (d.tipo !== 'clima') return;
  const { Z, Fs, B, P, j0, j1, i0, i1 } = d, x = new Float64Array(Math.max(Z.W, Z.H));
  for (let n = 0; n < Z.totale; n++) passoClimaFilo(Z, Fs, n, j0, j1, i0, i1, x, B, P, null);
  barrieraClima(B, P);
};
