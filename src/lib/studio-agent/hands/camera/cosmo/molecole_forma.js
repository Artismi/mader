// molecole_forma.js — LA FORMA: dal grafo alle coordinate in tre dimensioni (vedi molecole.js per l'intestazione).
//
// LEGGI:
//   · i domini elettronici (VSEPR, Gillespie e Nyholm 1957): attorno a un atomo i legami σ e le coppie solitarie si
//     dispongono il più lontano possibile: 2 in linea (180°), 3 in un piano (120°), 4 a tetraedro (109,47°), 5 a
//     bipiramide, 6 a ottaedro. Una coppia solitaria spinge più di un legame: l'angolo tra i legami si chiude;
//   · una coppia solitaria accanto a un legame π (l'azoto di un'ammide, l'ossigeno di un acido) si delocalizza: l'atomo
//     diventa piano (è la ragione per cui il legame peptidico è rigido);
//   · le lunghezze: la somma dei raggi covalenti, accorciata per i legami doppi e tripli;
//   · attorno a un legame semplice si ruota: la forma di partenza è tutta «anti» (catene a zig-zag), e ogni diedro si può
//     assegnare (opzione diedri) o cambiare dopo (ruota); gli anelli sono poligoni regolari, a sedia quelli saturi a sei.
// DATI: raggi covalenti (Cordero 2008) e raggi dei legami doppi e tripli (Pyykkö e Atsumi 2009; Pyykkö, Riedel e
//   Patzschke 2005); di quanto una coppia solitaria chiude l'angolo: 2,5° per coppia nel secondo periodo (misurati:
//   NH3 106,7°, H2O 104,5°); dal terzo periodo in giù i legami usano quasi solo orbitali p: 92,5° (H2S 92,1°, PH3 93,5°).
// SEMPLIFICAZIONI: gli anelli non aromatici a cinque sono quasi piani, i sistemi a ponte (norbornano) non sono
//   costruiti bene; nessuna ricerca del conformero di minima energia: la dà, a richiesta, minimizza() di molecole_forze.js.
// Unità: ångström.

import { atomo, raggioDiLegame } from './molecole_atomi.js';
import { molecola, anelli, sterico, coppieSolitarie, viciniSigma } from './molecole_grafo.js';

const RAD = Math.PI / 180, TETRA = Math.acos(-1 / 3);
const MULTIPLI = { 5: [0.85, 0.78, 0.73], 6: [0.75, 0.67, 0.60], 7: [0.71, 0.60, 0.54], 8: [0.63, 0.57, 0.53], 14: [1.16, 1.07, 1.02], 15: [1.11, 1.02, 0.94], 16: [1.03, 0.94, 0.95] };
const somma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], meno = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], per = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const scalare = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], vettore = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const lungo = (a) => Math.hypot(a[0], a[1], a[2]), unita = (a) => { const l = lungo(a); return l > 1e-12 ? per(a, 1 / l) : [1, 0, 0]; };
const perpendicolare = (d) => unita(Math.abs(d[0]) < 0.9 ? vettore(d, [1, 0, 0]) : vettore(d, [0, 1, 0]));
const ruotaAttorno = (v, asse, ang) => { const c = Math.cos(ang), s = Math.sin(ang), k = scalare(asse, v), x = vettore(asse, v); return [v[0] * c + x[0] * s + asse[0] * k * (1 - c), v[1] * c + x[1] * s + asse[1] * k * (1 - c), v[2] * c + x[2] * s + asse[2] * k * (1 - c)]; };

// la lunghezza di un legame (Å) tra due atomi con i loro numeri sterici
export function lunghezzaLegame(Za, Zb, ordine = 1, stA = 4, stB = 4) {
  if (ordine <= 1) return (Za === 1 || Zb === 1 ? atomo(Za).raggioCovalente + atomo(Zb).raggioCovalente : raggioDiLegame(Za, stA) + raggioDiLegame(Zb, stB));
  // (legami multipli: i raggi di Pyykkö, che sono fatti per questo; il legame aromatico sta a 0,585 = log 1,5 / log 2 della strada tra semplice e doppio)
  const r = (Z) => { const p = MULTIPLI[Z], r1 = p ? p[0] : atomo(Z).raggioCovalente; return p ? (ordine >= 3 ? p[2] : ordine === 2 ? p[1] : p[0] - 0.585 * (p[0] - p[1])) : r1 * (1 - 0.1332 * Math.log(ordine)); };
  return r(Za) + r(Zb);
}
// il numero sterico e l'angolo tra i legami attorno a un atomo
export function dominio(m, k) {
  const a = m.atomi[k], A = atomo(a.Z), vic = viciniSigma(m, k), legati = vic.length + a.h; let sn = sterico(m, k); const lp = coppieSolitarie(m, k);
  // la coppia solitaria coniugata: N e O accanto a un atomo con un legame π diventano piani
  const pi = (j) => m.atomi[j].ar || m.vic[j].some((v) => m.legami[v.k].t === 'c' && m.legami[v.k].o >= 2);
  let piano = false; if (sn === 4 && lp >= 1 && (a.Z === 7 || a.Z === 8) && !a.ar && vic.some((v) => pi(v.j))) { sn = 3; piano = true; }
  if (a.ar) sn = Math.min(sn, 3);
  if (A.blocco === 'd' || (A.metallo && legati > 4)) sn = legati;
  let angolo = sn <= 2 ? 180 : sn === 3 ? (piano && a.Z === 8 ? 113 : 120) : sn === 4 ? (lp === 0 || A.metallo ? 109.4712 : A.periodo === 2 ? 109.4712 - 2.5 * lp - (lp === 1 ? 0.25 : 0) : 92.5) : 90;
  return { sn, lp, legati, angolo, piano };
}

// forma(molecola, { diedri: [[a, b, c, d, gradi], …] }) → la molecola con tutti i suoi atomi (idrogeni compresi) nello spazio:
//   { m, n, Z: [numero atomico], pos: Float64Array(3n) (Å), legami: [[i, j, ordine]], indiceH: [primo idrogeno di ogni atomo], pesante: [per ogni atomo, l'atomo del grafo a cui appartiene] }
export function forma(x, { diedri = [] } = {}) {
  const m = molecola(x), nP = m.atomi.length, Z = m.atomi.map((a) => a.Z), indiceH = [], pesante = m.atomi.map((_, k) => k), legami = [];
  for (let k = 0; k < nP; k++) { indiceH.push(Z.length); for (let i = 0; i < m.atomi[k].h; i++) { legami.push([k, Z.length, 1]); Z.push(1); pesante.push(k); } }
  for (const l of m.legami) legami.push([l.a, l.b, l.t === 'i' ? 0 : l.ar ? 1.5 : l.o]);
  const n = Z.length, P = new Array(n).fill(null), dom = m.atomi.map((_, k) => dominio(m, k));
  const dist = (a, b, l) => (l.t === 'i' || l.t === 'd' ? atomo(Z[a]).raggioCovalente + atomo(Z[b]).raggioCovalente : lunghezzaLegame(Z[a], Z[b], l.ar ? 1.5 : l.o, dom[a].sn, dom[b].sn));
  const distH = (k) => lunghezzaLegame(Z[k], 1);
  const anello = anelli(m), anelliDi = m.atomi.map(() => []); anello.forEach((r, q) => r.forEach((k) => anelliDi[k].push(q))); const anelloFatto = anello.map(() => false);
  const chiesti = new Map(); for (const [a, b, c, d, g] of diedri) chiesti.set(`${b},${c}`, [a, d, g]);
  // (cis e trans dei doppi legami: sono diedri di 0° e 180° tra i due vicini di riferimento)
  for (const l of m.legami) if (l.ez) { const g = l.ez.cis ? 0 : 180; if (!chiesti.has(`${l.a},${l.b}`)) chiesti.set(`${l.a},${l.b}`, [l.ez.p, l.ez.q, g]); if (!chiesti.has(`${l.b},${l.a}`)) chiesti.set(`${l.b},${l.a}`, [l.ez.q, l.ez.p, g]); }
  const posti = (k) => m.vic[k].filter((v) => P[v.j]).map((v) => v.j);
  // i posti liberi attorno a un atomo, dati i vicini già messi
  const liberi = (k, messi, rif) => {
    const { sn, angolo } = dom[k], th = angolo * RAD, c = P[k], d = messi.map((j) => unita(meno(P[j], c)));
    if (sn > 4) { // bipiramide, ottaedro: i vertici ideali, girati sul primo vicino
      const ideali = sn === 5 ? [[0, 0, 1], [1, 0, 0], [-0.5, 0.866, 0], [-0.5, -0.866, 0], [0, 0, -1]] : sn === 6 ? [[0, 0, 1], [1, 0, 0], [0, 1, 0], [-1, 0, 0], [0, -1, 0], [0, 0, -1]] : Array.from({ length: sn }, (_, i) => { const z = 1 - (2 * i + 1) / sn, r = Math.sqrt(1 - z * z), f = i * 2.39996; return [r * Math.cos(f), r * Math.sin(f), z]; });
      if (!d.length) return ideali;
      const asse = unita(vettore([0, 0, 1], d[0])), ang = Math.acos(Math.max(-1, Math.min(1, d[0][2]))); let v = ideali.map((u) => (ang > 1e-6 ? ruotaAttorno(u, lungo(vettore([0, 0, 1], d[0])) > 1e-6 ? asse : [1, 0, 0], ang) : u));
      if (d.length > 1) { let meglio = 0, quanto = -2; for (let t = 0; t < 72; t++) { const w = v.map((u) => ruotaAttorno(u, d[0], t * 5 * RAD)); let s = 0; for (const dj of d.slice(1)) s += Math.max(...w.slice(1).map((u) => scalare(u, dj))); if (s > quanto) { quanto = s; meglio = t; } } v = v.map((u) => ruotaAttorno(u, d[0], meglio * 5 * RAD)); }
      return v.filter((u) => !d.some((dj) => scalare(u, dj) > 0.9));
    }
    if (!d.length) { if (sn <= 2) return [[1, 0, 0], [-1, 0, 0]];
      if (sn === 3) return [[1, 0, 0], [Math.cos(th), Math.sin(th), 0], [Math.cos(th), -Math.sin(th), 0]];
      const al = Math.asin(Math.min(1, (2 * Math.sin(th / 2)) / Math.sqrt(3))); return [0, 1, 2].map((i) => [Math.sin(al) * Math.cos((i * 2 * Math.PI) / 3), Math.sin(al) * Math.sin((i * 2 * Math.PI) / 3), -Math.cos(al)]).concat([[0, 0, 1]]); }
    if (sn <= 2) return [per(d[0], -1)];
    if (d.length === 1) { // il riferimento per la torsione: un vicino del vicino (o quello chiesto)
      let e = null, giro = 0; const ch = chiesti.get(`${messi[0]},${k}`);
      const g = ch && P[ch[0]] ? ch[0] : rif; if (ch && P[ch[0]]) giro = -(ch[2] - 180) * RAD;
      if (g != null && P[g]) { const gv = meno(P[g], P[messi[0]]), pr = scalare(gv, d[0]), pe = meno(gv, per(d[0], pr)); if (lungo(pe) > 1e-6) e = per(unita(pe), -1); }
      if (!e) e = perpendicolare(d[0]);
      const f = vettore(d[0], e), sito = (az) => somma(per(d[0], Math.cos(th)), per(somma(per(e, Math.cos(az + giro)), per(f, Math.sin(az + giro))), Math.sin(th)));
      if (sn === 3) return [sito(0), sito(Math.PI)];
      const passo = Math.acos(Math.max(-1, Math.min(1, Math.cos(th) / (1 + Math.cos(th))))); return [sito(0), sito(passo), sito(-passo)];
    }
    if (d.length === 2) { const u = unita(per(somma(d[0], d[1]), -1)), w0 = vettore(d[0], d[1]);
      if (sn === 3 || lungo(w0) < 1e-6) return [lungo(somma(d[0], d[1])) > 1e-6 ? u : perpendicolare(d[0])];
      const w = unita(w0), cg = Math.sqrt(Math.max(0, (1 + scalare(d[0], d[1])) / 2)), cb = Math.max(-1, Math.min(1, -Math.cos(th) / Math.max(cg, 0.3))), b = Math.acos(cb);
      return [somma(per(u, Math.cos(b)), per(w, Math.sin(b))), somma(per(u, Math.cos(b)), per(w, -Math.sin(b)))]; }
    const s = per(d.reduce(somma), -1); return [lungo(s) > 1e-6 ? unita(s) : perpendicolare(d[0])];
  };
  // un anello tutto da mettere: poligono regolare (a sedia se saturo a sei), girato perché il sostituente punti a «verso»
  const mettiAnello = (q, da, verso, piano = false, normale = null) => {
    const r = anello[q], nn = r.length, i0 = Math.max(0, r.indexOf(da)), giro = r.slice(i0).concat(r.slice(0, i0));
    let d = 0; for (let i = 0; i < nn; i++) { const a = giro[i], b = giro[(i + 1) % nn], l = m.legami[m.vic[a].find((v) => v.j === b).k]; d += dist(a, b, l) / nn; }
    const saturo = giro.every((k) => dom[k].sn === 4), piega = saturo && nn >= 6 && nn % 2 === 0 ? 0.25 : 0, R = Math.sqrt(d * d - 4 * piega * piega) / (2 * Math.sin(Math.PI / nn));
    const loc = giro.map((_, i) => [R * Math.cos((2 * Math.PI * i) / nn), R * Math.sin((2 * Math.PI * i) / nn), i % 2 ? -piega : piega]);
    // il verso del sostituente in coordinate locali
    let fuori = [1, 0, 0];
    if (!piano && dom[giro[0]].sn === 4) { const d1 = unita(meno(loc[1], loc[0])), d2 = unita(meno(loc[nn - 1], loc[0])), u = unita(per(somma(d1, d2), -1)), w = unita(vettore(d1, d2)), cg = Math.sqrt((1 + scalare(d1, d2)) / 2), b = Math.acos(Math.max(-1, Math.min(1, (1 / 3) / Math.max(cg, 0.3)))); fuori = somma(per(u, Math.cos(b)), per(w, Math.sin(b))); }
    const base = da >= 0 && P[da] ? P[da] : [0, 0, 0];
    // la rotazione che porta «fuori» su «verso»
    let ruota = (v) => v;
    if (verso) { const ax = vettore(fuori, verso), sl = lungo(ax), ang = Math.atan2(sl, scalare(fuori, verso)), asse = sl > 1e-6 ? per(ax, 1 / sl) : perpendicolare(fuori); ruota = (v) => ruotaAttorno(v, asse, ang);
      if (normale) { const z = ruota([0, 0, 1]), zp = meno(z, per(verso, scalare(z, verso))), np_ = meno(normale, per(verso, scalare(normale, verso))); if (lungo(zp) > 1e-6 && lungo(np_) > 1e-6) { const a2 = Math.atan2(scalare(vettore(zp, np_), verso), scalare(zp, np_)), r1 = ruota; ruota = (v) => ruotaAttorno(r1(v), verso, a2); } } }
    giro.forEach((k, i) => { if (!P[k]) P[k] = somma(base, ruota(meno(loc[i], loc[0]))); });
    anelloFatto[q] = true;
  };
  // un anello che ne tocca uno già messo: sul lato condiviso, dall'altra parte
  const attaccaAnello = (q) => {
    const r = anello[q], nn = r.length, gia = r.filter((k) => P[k]);
    if (gia.length === 2 && m.vic[gia[0]].some((v) => v.j === gia[1])) {
      const [a, b] = gia, ia = r.indexOf(a), verso = r[(ia + 1) % nn] === b ? 1 : -1, altri = []; for (let i = 1; i <= nn - 2; i++) altri.push(r[(ia + (verso > 0 ? 1 + i : -1 - i) + 2 * nn) % nn]);
      // il piano: quello dei vicini già messi di a e b; il lato: opposto al centro dell'altro anello
      const vicP = posti(a).concat(posti(b)).filter((j) => j !== a && j !== b), medio = per(somma(P[a], P[b]), 0.5), ab = unita(meno(P[b], P[a]));
      let dentro = vicP.length ? meno(per(vicP.map((j) => P[j]).reduce(somma), 1 / vicP.length), medio) : perpendicolare(ab); dentro = meno(dentro, per(ab, scalare(dentro, ab)));
      const fuori = lungo(dentro) > 1e-6 ? per(unita(dentro), -1) : perpendicolare(ab), lato = lungo(meno(P[b], P[a])), R = lato / (2 * Math.sin(Math.PI / nn)), apotema = R * Math.cos(Math.PI / nn), centro = somma(medio, per(fuori, apotema));
      // gli altri atomi: si gira il vettore centro→b, un passo alla volta
      const normale = unita(vettore(meno(P[a], centro), meno(P[b], centro))); let v = meno(P[b], centro);
      for (const k of altri) { v = ruotaAttorno(v, normale, (2 * Math.PI) / nn); if (!P[k]) P[k] = somma(centro, v); }
      anelloFatto[q] = true; return true; }
    return false;
  };
  const coda = [];
  const espandi = (k, rif) => {
    const messi = posti(k), daMettere = viciniSigma(m, k).map((v) => v.j).filter((j) => !P[j]);
    // prima gli anelli che passano di qui e toccano già qualcosa di messo
    const messiSigma = () => posti(k).filter((j) => m.legami[m.vic[k].find((v) => v.j === j).k].t !== 'i');
    for (const q of anelliDi[k]) { if (anelloFatto[q]) continue; if (anello[q].every((j) => P[j])) { anelloFatto[q] = true; continue; }
      if (attaccaAnello(q)) { for (const j of anello[q]) coda.push([j, k]); continue; }
      if (anello[q].filter((j) => P[j]).length === 1) { const st = liberi(k, messiSigma(), rif); mettiAnello(q, k, st.length >= 2 ? unita(per(somma(st[0], st[1]), -1)) : null, true, st.length >= 2 ? unita(vettore(st[0], st[1])) : null); for (const j of anello[q]) if (j !== k) coda.push([j, k]); } }
    const ancora = daMettere.filter((j) => !P[j]), siti = liberi(k, messiSigma(), rif);
    // (se per questo legame è chiesto un diedro, l'atomo a cui si riferisce prende il primo posto)
    const chiesto = messi.length === 1 ? chiesti.get(`${messi[0]},${k}`) : null; if (chiesto && ancora.includes(chiesto[1])) { ancora.splice(ancora.indexOf(chiesto[1]), 1); ancora.unshift(chiesto[1]); }
    const chi = ancora.map((j) => ({ j })).concat(Array.from({ length: m.atomi[k].h }, (_, i) => ({ h: indiceH[k] + i })));
    // la chiralità: se i quattro vicini girano dal lato sbagliato, si scambiano due dei nuovi
    const a = m.atomi[k];
    if (a.chir && a.ord && chi.length >= 2 && siti.length >= 2) {
      const dove = new Map(); for (const j of messi) dove.set(j, unita(meno(P[j], P[k]))); chi.forEach((c, i) => { if (siti[i]) dove.set(c.j ?? -1, siti[i]); });
      const v = a.ord.map((o) => dove.get(o)); if (v.every(Boolean)) { const vol = scalare(vettore(v[1], v[2]), v[3]); if ((vol < 0 ? 1 : -1) !== a.chir) { const [p, q] = chiesto && chi.length >= 3 && siti.length >= 3 ? [1, 2] : [0, 1], t = siti[p]; siti[p] = siti[q]; siti[q] = t; } }
    }
    chi.forEach((c, i) => { const s = siti[i] || perpendicolare([1, 0, 0]);
      if (c.h != null) { P[c.h] = somma(P[k], per(s, distH(k))); return; }
      const j = c.j, l = m.legami[m.vic[k].find((v) => v.j === j).k], lung = dist(k, j, l), q = anelliDi[j].find((x) => !anelloFatto[x]);
      P[j] = somma(P[k], per(s, lung));
      if (q != null && !anelliDi[k].includes(q)) { mettiAnello(q, j, per(s, -1)); for (const x of anello[q]) if (x !== j) coda.push([x, j]); }
      coda.push([j, k]); });
  };
  // si parte da un atomo per ogni pezzo (meglio se di un anello), e ci si allarga
  let spiazza = 0;
  for (let s = 0; s < nP; s++) {
    if (P[s]) continue;
    const q = anelliDi[s].find((x) => !anelloFatto[x]);
    if (q != null) { mettiAnello(q, s, null); for (const j of anello[q]) { P[j] = somma(P[j], [spiazza, 0, 0]); coda.push([j, -1]); } }
    else { P[s] = [spiazza, 0, 0]; coda.push([s, -1]); }
    while (coda.length) { const [k] = coda.shift(); if (k >= nP) continue;
      // il riferimento per la torsione: un vicino già messo del vicino da cui si arriva
      let rif = null; const pm = posti(k); if (pm.length === 1) { const p = pm[0], altri = m.vic[p].filter((v) => v.j !== k && P[v.j]).map((v) => v.j); rif = altri.length ? altri[0] : m.atomi[p].h && P[indiceH[p]] ? indiceH[p] : null; }
      espandi(k, rif); }
    // (i pezzi staccati, e gli ioni tenuti da «~», uno accanto all'altro)
    let maxX = -Infinity; for (let i = 0; i < n; i++) if (P[i]) maxX = Math.max(maxX, P[i][0]); spiazza = maxX + 3;
  }
  for (let i = 0; i < n; i++) if (!P[i]) P[i] = [spiazza += 1.5, 0, 0];
  const pos = new Float64Array(3 * n); P.forEach((p, i) => { pos[3 * i] = p[0]; pos[3 * i + 1] = p[1]; pos[3 * i + 2] = p[2]; });
  return { m, n, Z, pos, legami, indiceH, pesante };
}

// ---------- misure su una forma (indici degli atomi della forma; gli atomi del grafo vengono prima, con lo stesso indice)
const p3 = (f, i) => [f.pos[3 * i], f.pos[3 * i + 1], f.pos[3 * i + 2]];
export const distanza = (f, i, j) => lungo(meno(p3(f, i), p3(f, j)));
export const angolo = (f, i, j, k) => Math.acos(Math.max(-1, Math.min(1, scalare(unita(meno(p3(f, i), p3(f, j))), unita(meno(p3(f, k), p3(f, j))))))) / RAD;
export function diedro(f, i, j, k, l) { const b1 = meno(p3(f, j), p3(f, i)), b2 = meno(p3(f, k), p3(f, j)), b3 = meno(p3(f, l), p3(f, k)), n1 = vettore(b1, b2), n2 = vettore(b2, b3); return Math.atan2(scalare(vettore(n1, n2), unita(b2)), scalare(n1, n2)) / RAD; }
// ruota di «gradi» attorno al legame i–j tutto ciò che sta dalla parte di j (solo legami fuori dagli anelli) → una forma nuova
export function ruota(f, i, j, gradi) {
  const vic = Array.from({ length: f.n }, () => []); for (const [a, b] of f.legami) { vic[a].push(b); vic[b].push(a); }
  const parte = new Set([j]), pila = [j]; while (pila.length) { const u = pila.pop(); for (const v of vic[u]) if (!parte.has(v) && !(u === j && v === i)) { if (v === i) throw new Error('molecole: il legame è in un anello, non si ruota'); parte.add(v); pila.push(v); } }
  const o = p3(f, j), asse = unita(meno(o, p3(f, i))), pos = Float64Array.from(f.pos);
  for (const a of parte) { const v = somma(o, ruotaAttorno(meno(p3(f, a), o), asse, gradi * RAD)); pos[3 * a] = v[0]; pos[3 * a + 1] = v[1]; pos[3 * a + 2] = v[2]; }
  return { ...f, pos };
}
// il baricentro, i tre momenti principali d'inerzia (u·Å²) e gli assi
export function inerzia(f) {
  let M = 0; const c = [0, 0, 0]; for (let i = 0; i < f.n; i++) { const w = atomo(f.Z[i]).massa; M += w; for (let q = 0; q < 3; q++) c[q] += w * f.pos[3 * i + q]; } for (let q = 0; q < 3; q++) c[q] /= M;
  const I = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < f.n; i++) { const w = atomo(f.Z[i]).massa, x = f.pos[3 * i] - c[0], y = f.pos[3 * i + 1] - c[1], z = f.pos[3 * i + 2] - c[2]; I[0][0] += w * (y * y + z * z); I[1][1] += w * (x * x + z * z); I[2][2] += w * (x * x + y * y); I[0][1] -= w * x * y; I[0][2] -= w * x * z; I[1][2] -= w * y * z; }
  I[1][0] = I[0][1]; I[2][0] = I[0][2]; I[2][1] = I[1][2];
  const { valori, vettori } = jacobi(I); return { massa: M, centro: c, momenti: valori, assi: vettori };
}
// autovalori di una matrice simmetrica piccola (rotazioni di Jacobi) → valori crescenti e vettori (per colonne)
export function jacobi(A0) {
  const n = A0.length, A = A0.map((r) => r.slice()), V = A.map((_, i) => A.map((__, j) => +(i === j)));
  for (let giro = 0; giro < 60; giro++) { let fuori = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) fuori += A[i][j] * A[i][j]; if (fuori < 1e-22) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) { if (Math.abs(A[p][q]) < 1e-300) continue; const th = (A[q][q] - A[p][p]) / (2 * A[p][q]), t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) { const akp = A[k][p], akq = A[k][q]; A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq; }
      for (let k = 0; k < n; k++) { const apk = A[p][k], aqk = A[q][k]; A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk; }
      for (let k = 0; k < n; k++) { const vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq; } } }
  const ord = A.map((_, i) => i).sort((i, j) => A[i][i] - A[j][j]);
  return { valori: ord.map((i) => A[i][i]), vettori: ord.map((i) => V.map((r) => r[i])) };
}
// il numero di simmetria: in quanti modi la molecola, ruotata, si sovrappone a sé stessa (serve all'entropia di
// rotazione). Si provano gli assi che passano per il baricentro e per gli atomi, i punti di mezzo e le normali ai piani.
export function numeroDiSimmetria(f) {
  if (f.n === 1) return 1; if (f.n > 40) return 1;
  const { centro, momenti } = inerzia(f), X = []; for (let i = 0; i < f.n; i++) X.push(meno(p3(f, i), centro));
  const lineare = momenti[0] < 1e-3 * Math.max(momenti[2], 1e-9);
  if (lineare) { const asse = unita(X.reduce((a, b) => (lungo(b) > lungo(a) ? b : a))), t = X.map((x) => scalare(x, asse)); return f.Z.every((z, i) => t.some((tj, j) => f.Z[j] === z && Math.abs(tj + t[i]) < 0.05)) ? 2 : 1; }
  const uguale = (R) => X.every((x, i) => { const y = R(x); return X.some((xj, j) => f.Z[j] === f.Z[i] && lungo(meno(xj, y)) < 0.12); });
  const assi = [], metti = (v) => { if (lungo(v) < 0.05) return; const u = unita(v); if (!assi.some((a) => Math.abs(scalare(a, u)) > 0.9995)) assi.push(u); };
  for (let i = 0; i < f.n; i++) { metti(X[i]); for (let j = i + 1; j < f.n; j++) { if (f.Z[i] !== f.Z[j]) continue; metti(somma(X[i], X[j])); metti(vettore(X[i], X[j])); if (f.n <= 14) for (let k = j + 1; k < f.n; k++) if (f.Z[k] === f.Z[i]) metti(vettore(meno(X[j], X[i]), meno(X[k], X[i]))); } }
  let sigma = 1; for (const a of assi) { let ordineMax = 1; for (const o of [6, 5, 4, 3, 2]) if (uguale((x) => ruotaAttorno(x, a, (2 * Math.PI) / o))) { ordineMax = o; break; } sigma += ordineMax - 1; }
  return sigma;
}
export const vettori = { somma, meno, per, scalare, vettore, lungo, unita, ruotaAttorno, perpendicolare };
