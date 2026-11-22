// vicini.js — gli universi paralleli.
//
// Ogni decadimento è un evento quantistico: quando avviene, e in che direzioni
// partono le figlie, è caso vero. Per l'interpretazione a molti mondi a ogni
// evento l'universo si divide in rami, uno per esito, e questo succede in
// continuazione. Due rami sono identici fino all'istante in cui si separano;
// da lì differiscono solo in ciò che discende da quell'evento. Più tardi si sono
// separati, più si somigliano. (I campi, le masse, i cristalli, i raggi cosmici
// non cambiano tra rami: per averli diversi serve un altro seme, un universo
// lontano.)
//
// Perfezionare una sezione è cercare il ramo giusto. Se una linea è a caso,
// spezzata o storta, si risale all'evento in cui è nata (il decadimento della
// madre, o il suo) e si passa al ramo in cui quell'evento è andato diversamente.
// È la correzione minima: tutto il resto resta com'è.

import { simulaMondo, generatore } from './cosmo/mondo.js';
import { segmentiSezione } from './cosmo/sezione.js';
import { bellezzaFinestra, RIPETI_BASE } from './pattern.js';

const gauss = (caso) => { let u = 0; for (let i = 0; i < 6; i++) u += caso(); return u - 3; };

// l'istante in cui un evento si manifesta: il suo decadimento (nel ramo vecchio o nel nuovo)
const istante = (tracce, ev) => { for (const d of tracce.decadimenti || []) if (d.evento === ev) return d.t; return Infinity; };

// un universo parallelo: lo stesso, con l'evento «ev» andato in un altro modo
export function ramo(cella, ev, caso) {
  const rami = { ...(cella.rami || {}) };
  rami[ev] = (rami[ev] || 0) + 1 + Math.floor(caso() * 1e6);
  return { ...cella, rami };
}

// gli eventi da cui nascono le tracce date: il decadimento della madre (che ne
// decide la direzione) e il loro (che ne decide la durata)
export function eventiDi(tracce, ids) {
  const out = [];
  for (const id of ids) {
    const tr = tracce[id]; if (!tr?.evento) continue;
    out.push(tr.evento);
    const i = tr.evento.lastIndexOf('.'); if (i > 0) out.push(tr.evento.slice(0, i));
  }
  return out;
}

// un'inquadratura vicina: la finestra, lo sguardo, la fetta di tempo e il caleidoscopio, appena mossi
export function inquadraturaVicina(st, forza, caso) {
  const g = () => gauss(caso);
  const f = st.finestra, v = st.vista, z = st.sezione;
  return {
    finestra: { centro: f.centro.map((x) => x + g() * 0.06 * f.lato * forza), lato: f.lato * Math.exp(g() * 0.06 * forza) },
    vista: { inclinazione: Math.max(0, Math.min(85, v.inclinazione + (v.inclinazione ? g() * 4 * forza : 0))), rotazione: v.rotazione + (v.inclinazione ? g() * 6 * forza : 0), scalaTempo: Math.max(1, v.scalaTempo * Math.exp(g() * 0.08 * forza)) },
    sezione: { fine: Math.max(1, z.fine + g() * 3 * forza), durata: Math.max(1, Math.min(z.fine, z.durata * Math.exp(g() * 0.08 * forza))) },
    ripeti: { ...(st.ripeti || RIPETI_BASE), angolo: (st.ripeti?.angolo ?? 0) + (st.ripeti?.gruppo === 'specchio' ? 0 : g() * 6 * forza) },
  };
}

const misura = (cella, tracce, st) => bellezzaFinestra(segmentiSezione(tracce, { ...cella, ...st }), st.ripeti || RIPETI_BASE, st.finestra.lato);

// la ricerca del ramo giusto: stato = { cella, finestra, vista, sezione, ripeti }
export function perfeziona(stato, { passi = 50, seme = 1 } = {}, avanza = () => {}) {
  const caso = generatore(seme);
  let cella = stato.cella, tracce = simulaMondo(cella), st = { finestra: stato.finestra, vista: stato.vista, sezione: stato.sezione, ripeti: stato.ripeti || RIPETI_BASE };
  let b = misura(cella, tracce, st);
  const partenza = b.totale;
  let meglio = { cella, ...st, bellezza: b };
  for (let i = 0; i < passi; i++) {
    const forza = 1 - (0.7 * i) / passi;
    let c2 = cella, t2 = tracce, s2 = st;
    // le linee del pezzo che si ripete; i frammenti (pezzi corti) contano di più: sono i difetti
    const pezzi = b.pezzi || [];
    if (pezzi.length && caso() < 0.75) {
      const pesi = pezzi.map(([, L]) => (L < 0.06 * st.finestra.lato ? 4 : 1)), tot = pesi.reduce((x, y) => x + y, 0);
      let r = caso() * tot, k = 0; while (k < pesi.length - 1 && (r -= pesi[k]) > 0) k++;
      const eventi = eventiDi(tracce, [pezzi[k][0]]);
      if (eventi.length) {
        const ev = eventi[Math.floor(caso() * eventi.length)];
        c2 = ramo(cella, ev, caso); t2 = simulaMondo(c2);
        c2.separato = Math.min(cella.separato ?? Infinity, istante(tracce, ev), istante(t2, ev));
      }
    } else s2 = inquadraturaVicina(st, forza, caso);
    const b2 = misura(c2, t2, s2);
    if (b2.totale >= b.totale || caso() < 0.12 * (1 - i / passi)) { cella = c2; tracce = t2; st = s2; b = b2; }
    if (b.totale > meglio.bellezza.totale) meglio = { cella, ...st, bellezza: b };
    avanza((i + 1) / passi, meglio.bellezza);
  }
  // si tiene il punto più alto toccato, anche se poi la strada è scesa
  const { pezzi, ...bellezza } = meglio.bellezza;
  return { ...meglio, bellezza, partenza };
}
