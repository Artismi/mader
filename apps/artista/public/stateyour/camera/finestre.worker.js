// finestre.worker.js — LE FINESTRE DEL LIVELLO 5 (l'acqua e il suolo di un punto) calcolate fuori dal filo dell'interfaccia.
//
// Una finestra dell'acqua costa 25–200 ms (finestra.js finestraAcqua: il padre, il tratto, lo spettro, le bande), la sua prima
// immagine fino a quasi un secondo (le tessere delle onde), ognuna delle seguenti 20–100 ms; la chimica sotto il micron
// 30–180 ms; l'immagine del suolo 100–500 ms (il campo fine e la tinta). Sul filo principale bloccavano la rotella a ogni
// passo di dieci. Qui si fanno con le stesse funzioni e gli stessi argomenti di mappa.js (gli stessi bit), e la pagina mostra
// intanto il padre, poi sfuma al figlio quando arriva (mappa.js, rocciaDi).
//
// Messaggi:  { tipo: 'base', k, v, mare, se, cl, seme }              una volta per pianeta (la superficie di superficie.worker.js)
//            { tipo: 'acqua', id, k, lon, lat, lato, fondoM, u, v }   → { tipo: 'acqua', id, N, px, frase, ms }
//            { tipo: 'immagine', id, tempo }                          → { tipo: 'immagine', id, N, px, tempo, ms }
//            { tipo: 'suolo', id, k, lon, lat, lato, livello, tessera, chimica } → { tipo: 'suolo', id, N, px, riga, ms }
//            { tipo: 'nano', id, k, lon, lat, lato, fondoM, u, v }      → { tipo: 'nano', id, scena, ms } (la scena degli atomi 3D, senza il moto)
//            { tipo: 'dimentica', id }
// Ciò che non cambia col tempo si tiene anche nel deposito per indirizzo (deposito.js): la prima immagine e la frase della finestra
// dell'acqua, l'immagine del suolo, la riga della chimica. Le immagini seguenti dell'acqua (il mare che si muove) si calcolano.
import { sistema } from './cosmo.js';
import { finestraAcqua, immagineFinestra, scenaNano } from './finestra.js';
import { campioneAcqua, immagineAcqua } from './mare.js';
import { chimicaDellaFinestra, luogoDellaCrosta, sistema as sistemaChimico, storia as storiaChimica, rileva } from './reazioni.js';
import { finestraSuolo, immagineSuolo } from './suolo.js';
import { sorgente } from './eventi.js';
import { ricorda } from './deposito.js';

let B = null; const fatte = new Map(), tessere = new Map();
const tieni = (id, x) => { fatte.set(id, x); if (fatte.size > 64) fatte.delete(fatte.keys().next().value); };
const immagine = (A, tempo) => (A.fin && !A.fin.asciutto ? immagineFinestra(A.fin, tempo) : immagineAcqua(A.camp, { N: A.N, t: tempo }));
const manda = (m, px) => self.postMessage(m, px ? [px.buffer] : []);

// (i parametri di ogni finestra chiesta: se il filo l'ha dimenticata, o se l'immagine del tempo 0 veniva dal deposito, la si rifà)
const parametri = new Map();
function finestraDi(id) {
  let A = fatte.get(id); if (A) return A; const d = parametri.get(id); if (!d) return null; const S = B, { lon, lat, lato, fondoM: profondo, u, v } = d;
  const fin = finestraAcqua(S.mare, { lon, lat, latoM: lato, fondoM: profondo, P: S.P }), camp = fin.popolazioni?.campione || campioneAcqua(S.mare, { lon, lat, profondita: 0, latoM: lato, acqua: true, fondoM: profondo }, sorgente(`${S.k}/acqua/${u.toFixed(6)}/${v.toFixed(6)}`));
  A = { fin, camp, N: fin.N || 128 }; tieni(id, A); return A;
}
async function acqua(d) {
  const t0 = performance.now(), S = B, { lon, lat, lato, fondoM: profondo } = d; parametri.set(d.id, d); if (parametri.size > 256) parametri.delete(parametri.keys().next().value);
  // la finestra al tempo 0 (la sua prima immagine e la frase) è funzione dell'indirizzo: dal deposito, se c'è
  const v = await ricorda('finestra acqua', d.id, () => { const A = finestraDi(d.id);
    return { N: A.N, px: immagine(A, 0), frase: `${A.fin.descrizione || A.camp.descrizione}${lato <= 2e-9 ? " Avvicinati ancora: sotto le molecole c'è l'evento vero che le attraversa (un decadimento, un raggio cosmico), con la sua attesa." : ''}` }; }, { codice: CODICE });
  let frase = v.frase;
  if (lato <= 1.0001e-6) { try { const ch = await ricorda('chimica acqua', `${d.id}`, () => { const c = chimicaDellaFinestra(S.mare, { lon, lat, latoM: lato, fondoM: profondo, pianeta: S.P }); return { riga: c.riga, ms: c.ms }; }, { codice: CODICE });
    frase += ` ${ch.riga} (calcolata in ${Math.round(ch.ms)} ms).`; } catch { /* la chimica non c'è: la finestra resta quella dell'acqua */ } }
  manda({ tipo: 'acqua', id: d.id, k: S.k, N: v.N, px: v.px, frase, ms: performance.now() - t0 }, v.px);
}
async function suolo(d) {
  // (la tessera del padre arriva una volta per filo; poi solo il suo nome)
  let tt = d.tessera || null; if (tt) { if (tt.gia && !tt.rett) tt = tessere.get(tt.gia) || null; else { tessere.set(tt.gia, tt); if (tessere.size > 8) tessere.delete(tessere.keys().next().value); } }
  const t0 = performance.now(), S = B, Ssu = S.Ssu; let fin; const finDi = () => (fin !== undefined ? fin : (fin = finestraSuolo(Ssu, { lon: d.lon, lat: d.lat, uv: d.uv, latoM: d.lato, livello: d.livello, tessera: tt })));
  // l'immagine del suolo (statica: funzione dell'indirizzo) dal deposito, se c'è
  const im = await ricorda('finestra suolo', d.id, () => { const f = finDi(); return !f || f.acqua ? { nulla: true } : { N: f.N, px: immagineSuolo(f) }; }, { codice: CODICE });
  if (im.nulla) { manda({ tipo: 'suolo', id: d.id, k: S.k, nulla: true, ms: performance.now() - t0 }); return; }
  let riga = null;
  if (d.chimica) { try { riga = await ricorda('chimica pori', `${d.id}`, () => { // la chimica dei pori a quella profondità: il luogo della crosta col padre del suolo
    const fin = finDi(), t1 = performance.now(), A = fin.acquaPori, L = luogoDellaCrosta(S.P, { profonditaM: fin.profonditaM, latoM: 1e-6, stella: S.stella, colonna: fin.padre.colonna, mare: { carbonio: A.neutri['CO2(aq)'] + A.ioni['HCO3-'] + A.ioni['CO3(2-)'], pH: A.pH } });
    if (!L) return ''; const Sc = sistemaChimico(L, { profondita: 3, atomiMassimi: 4 }), st = storiaChimica(Sc, { V: L.V, tempo: Math.min(3.156e9, Math.max(1, L.padre.residenzaAnni * 3.156e7)), massimo: 2e4, flussi: L.flussi, adatta: true }), ri = rileva(Sc, st, { tempoCicli: 200 });
    return ` La chimica dei pori lì (1 µm, ${Math.round(fin.profonditaM * 100)} cm sotto, ${Math.round(L.T - 273.15)} °C): H₂ ${L.padre.H2.toExponential(1)} mol/L dalla roccia, ${Sc.chiavi.length} specie possibili, ${st.eventi} reazioni in ${(st.t / 3.156e7).toPrecision(2)} anni, ${ri.emerso.raf ? 'un RAF' : 'nessun RAF'} (calcolata in ${Math.round(performance.now() - t1)} ms).`; }, { codice: CODICE }); } catch { riga = null; } }
  manda({ tipo: 'suolo', id: d.id, k: S.k, N: im.N, px: im.px, riga, ms: performance.now() - t0 }, im.px);
}
// (la versione del codice: questo filo e la superficie da cui vengono i suoi dati)
const CODICE = [import.meta.url, new URL('./superficie.worker.js', import.meta.url).href];
self.onmessage = async (e) => {
  const d = e.data;
  try {
    if (d.tipo === 'base') { const Sis = sistema(d.v.cosmo, d.v.galassia, d.v.stella), P = Sis.pianeti[d.v.pianeta]; B = { k: d.k, P, stella: Sis.stella, mare: d.mare, Ssu: { k: d.k, P, se: d.se, cl: d.cl, seme: d.seme } }; fatte.clear(); tessere.clear(); parametri.clear(); return; }
    if (d.tipo === 'dimentica') { fatte.delete(d.id); return; }
    if (!B || d.k !== B.k) { manda({ tipo: d.tipo, id: d.id, k: d.k, errore: 'il pianeta non è questo' }); return; }
    if (d.tipo === 'acqua') return await acqua(d);
    if (d.tipo === 'suolo') return await suolo(d);
    // le molecole e gli ioni di un cubetto d'acqua (mappa.js scenaAtomi: gli stessi argomenti), preparate prima di arrivarci
    if (d.tipo === 'nano') { const t0 = performance.now(), sc = scenaNano(B.mare, { lon: d.lon, lat: d.lat, profondita: 0, latoM: d.lato, fondoM: d.fondoM }, sorgente(`${B.k}/acqua/${d.u.toFixed(6)}/${d.v.toFixed(6)}`)); // (il moto e le copie periodiche, che portano funzioni, li mette la pagina)
      manda({ tipo: 'nano', id: d.id, k: B.k, scena: sc, ms: performance.now() - t0 }); return; }
    if (d.tipo === 'immagine') { const A = finestraDi(d.id); if (!A) { manda({ tipo: 'immagine', id: d.id, k: B.k, errore: 'finestra dimenticata' }); return; }
      // (con l'immagine, le scintille: l'immagine senza lampo, il lampo e la densità dei punti speculari — finestra.js)
      const t0 = performance.now(), px = immagine(A, d.tempo), sc = A.fin?.ultima?.tempo === d.tempo ? A.fin.ultima.scintille : null;
      self.postMessage({ tipo: 'immagine', id: d.id, k: B.k, N: A.N, px, tempo: d.tempo, ms: performance.now() - t0, scintille: sc || null }, sc ? [px.buffer, sc.senza.buffer, sc.lampi.buffer, sc.dens.buffer] : [px.buffer]); }
  } catch (err) { manda({ tipo: d.tipo, id: d.id, k: d.k, errore: String((err && err.stack) || err) }); }
};
