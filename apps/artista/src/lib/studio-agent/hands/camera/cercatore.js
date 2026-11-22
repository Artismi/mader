// cercatore.js — il dado che porta a cose belle, in un processo a parte.
// Sfoglia molti universi della biblioteca e, per ognuno, molte inquadrature
// (dove, quanto larga, da che angolo, quale fetta di tempo); tiene quella che la
// misura estetica giudica più bella.
import { universo } from './cosmo/biblioteca.js';
import { simulaMondo, generatore } from './cosmo/mondo.js';
import { segmentiSezione } from './cosmo/sezione.js';
import { bellezzaFinestra } from './pattern.js';
import { perfeziona } from './vicini.js';

export function cercaSezione({ da = 1, universi = 24, inquadrature = 16, solo = null, seme = 1, gruppo = null, cella: cellaData = null }, avanza = () => {}) {
  const caso = generatore(seme), tra = (a, b) => a + caso() * (b - a);
  let migliore = null;
  // numeri sparsi: regioni di pianeti e stelle diverse (numeri vicini sono regioni dello stesso pianeta)
  const numeri = solo != null ? [solo] : Array.from({ length: universi }, (_, i) => da + i * 7919);
  numeri.forEach((n, k) => {
    const cella = cellaData || universo(n).cella, tracce = simulaMondo(cella);
    // i posti interessanti: dove nascono le stelle e gli sciami, e dove c'è inchiostro
    const centri = cella.sorgenti.filter((s) => s.specie.startsWith('stella') || s.specie === 'kaone0').map((s) => s.pos);
    for (const t of tracce) if (t.punti.length > 30) { const p = t.punti[Math.floor(caso() * t.punti.length)]; centri.push([p[0], p[1]]); }
    const tMax = Math.max(1, ...tracce.map((t) => t.punti[t.punti.length - 1][3]));
    for (let j = 0; j < (solo != null ? inquadrature * 4 : inquadrature); j++) {
      const c = centri[Math.floor(caso() * centri.length)] || [500, 500];
      const finestra = { centro: [c[0] + tra(-40, 40), c[1] + tra(-40, 40)], lato: tra(100, 440) };
      // chi guarda: fermo nella regione, oppure in moto (un osservatore vero, secondo la relatività: sezione.js)
      const vista = caso() < 0.35 ? { inclinazione: 0, rotazione: 0, scalaTempo: 5 } : { inclinazione: 0, rotazione: 0, scalaTempo: 5, velocita: Math.round(tra(0.1, 0.9) * 100) / 100, direzione: Math.round(tra(0, 360)) };
      const fine = tra(0.3, 1) * tMax, durata = caso() < 0.5 ? fine : tra(0.15, 0.8) * fine;
      // la finestra diretta è il modo normale; il caleidoscopio solo se lo si chiede
      const g = !gruppo ? 'una' : gruppo === 'caleidoscopio' ? (caso() < 0.45 ? 'esagoni' : caso() < 0.8 ? 'quadrati' : 'specchio') : gruppo, ripeti = { gruppo: g, angolo: g === 'specchio' || g === 'una' ? 0 : Math.round(tra(0, 360)) };
      const prova = { ...cella, finestra, vista, sezione: { fine, durata } };
      const b = bellezzaFinestra(segmentiSezione(tracce, prova), ripeti, finestra.lato);
      if (!migliore || b.totale > migliore.bellezza.totale) migliore = { numero: n, finestra, vista, sezione: { fine, durata }, ripeti, bellezza: b };
    }
    avanza((k + 1) / numeri.length, migliore);
  });
  return migliore;
}

if (typeof self !== 'undefined' && typeof self.postMessage === 'function' && typeof window === 'undefined') {
  self.onmessage = (ev) => {
    try {
      const d = ev.data;
      // 1. il dado: molti universi, molte inquadrature (se non si parte già da una sezione)
      let st = d.stato;
      if (!st) {
        const m = cercaSezione(d, (frazione, migliore) => self.postMessage({ fase: 'cerca', frazione, migliore }));
        st = { cella: d.cella ? { ...d.cella } : { ...universo(m.numero).cella }, finestra: m.finestra, vista: m.vista, sezione: m.sezione, ripeti: m.ripeti, numero: m.numero };
      }
      // 2. i vicini: si cammina verso l'universo vicino più bello
      // (dentro una bolla dello zoom niente rami: le sue particelle vengono dalla regione, e un ramo andrebbe scelto lassù)
      const p = perfeziona(st, { passi: d.cella ? 0 : d.passi ?? 45, seme: d.seme ?? 1 }, (frazione, b) => self.postMessage({ fase: 'perfeziona', frazione, bellezza: b }));
      self.postMessage({ fatto: true, migliore: { ...p, numero: st.numero ?? st.cella.seme } });
    } catch (err) { self.postMessage({ errore: String((err && err.stack) || err) }); }
  };
}
