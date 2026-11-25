// molecole_incontri.js — COME DUE MOLECOLE SI RICONOSCONO, e ciò che ne discende: la catalisi da parte di qualsiasi
// molecola, la copia su uno stampo, il ripiegamento di una catena, le superfici dei minerali (vedi molecole.js).
//
// Niente qui dice «le basi si appaiano» o «questo enzima catalizza quello»: c'è una funzione sola, l'energia
// d'interazione di due molecole QUALSIASI (interazione), dal campo di forze di molecole_forze.js; il resto sono conseguenze:
//   · CATALISI: una molecola che lega lo stato di transizione meglio dei reagenti abbassa la barriera di quella differenza.
//     Lo stato di transizione sta a metà strada tra reagenti e prodotti (Marcus, coefficiente ½): ΔΔG‡ = ½·(E con i
//     prodotti − E con i reagenti). In più la VICINANZA: due reagenti legati allo stesso ospite si trovano a una
//     concentrazione efficace 1/(N_A·V), V il volume in cui stanno i due estremi (raggio 5 Å: 3,2 mol/L) [PARAMETRO LIBERO: 5 Å];
//   · COPIA SU STAMPO: un monomero legato a un'unità dello stampo accanto a un altro monomero legato condensa con lui
//     più in fretta di quel fattore; la fedeltà è il rapporto tra le costanti di legame del monomero giusto e degli altri;
//   · RIPIEGAMENTO: ricottura Monte Carlo sui diedri della spina dorsale, con l'energia del campo in acqua;
//   · SUPERFICI: i cationi che un reticolo espone sono siti che prendono coppie solitarie (adsorbimento = complesso).
// LEGGE EMPIRICA: legarsi costa entropia: +15 kJ/mol a 1 mol/L e 25 °C (due molecole che diventano una perdono 40-60
// J/mol/K: Finkelstein e Janin 1989), sommato all'energia d'interazione in acqua per avere il ΔG di legame.
// LIMITI: l'aggancio prova gli accostamenti a legame a idrogeno e a pila, poi minimizza i migliori: non è una ricerca
// completa; il solvente è implicito; gli ospiti grandi (una proteina ripiegata) costano secondi per coppia.

import { atomo } from './molecole_atomi.js';
import { molecola, chiave, grezzo, valida, coppieSolitarie } from './molecole_grafo.js';
import { forma, inerzia, vettori } from './molecole_forma.js';
import { campo, forze, minimizza, insieme, cariche, diedriPeptide } from './molecole_forze.js';
import { logKComplesso, R } from './molecole_energia.js';
import { numero } from './eventi.js';
import { COSTANTI } from './leggi.js'; // le costanti e le unità: un posto solo

const { somma, meno, per, scalare, vettore, lungo, unita, ruotaAttorno, perpendicolare } = vettori;
const p3 = (f, i) => [f.pos[3 * i], f.pos[3 * i + 1], f.pos[3 * i + 2]];
const baricentro = (f) => { const c = [0, 0, 0]; for (let i = 0; i < f.n; i++) for (let q = 0; q < 3; q++) c[q] += f.pos[3 * i + q] / f.n; return c; };
// la rotazione che porta il versore v su w, applicata a un punto attorno a un centro, poi un giro attorno a w
const porta = (v, w) => { const ax = vettore(v, w), s = lungo(ax), ang = Math.atan2(s, scalare(v, w)), asse = s > 1e-9 ? per(ax, 1 / s) : perpendicolare(v); return (x) => ruotaAttorno(x, asse, ang); };
const MEMO = new Map(), COSTO_LEGARSI = 15, RAGGIO_VICINANZA = 5;
export const CONCENTRAZIONE_EFFICACE = 1 / (COSTANTI.NA * (4 / 3) * Math.PI * (RAGGIO_VICINANZA * 1e-9) ** 3); // mol/L (1e-9 dm per Å… 5 Å = 5·10⁻⁹ dm)

// interazione(a, b, { solvente }) → { dE (kJ/mol: insieme meno separati, il migliore degli accostamenti provati), dG (di legame, a 1 mol/L),
//   K (L/mol), legamiH (idrogeni di una a meno di 2,4 Å da un N/O dell'altra), configurazione }
export function interazione(a, b, { solvente = 'acqua', passi = 40, tieni = 3, T = 298.15 } = {}) {
  const ma = molecola(chiave(molecola(a))), mb = molecola(chiave(molecola(b))), id = `${chiave(ma)}|${chiave(mb)}|${solvente}|${passi}`; if (MEMO.has(id)) return MEMO.get(id);
  const fa = forma(ma), fb = forma(mb), qa = cariche(fa), qb = cariche(fb), ca = baricentro(fa), cb = baricentro(fb);
  const donatori = (f) => { const o = []; for (const [i, j] of f.legami) for (const [h, x] of [[i, j], [j, i]]) if (f.Z[h] === 1 && (f.Z[x] === 7 || f.Z[x] === 8 || f.Z[x] === 16)) o.push([h, x]); return o; }, accettori = (f, q) => f.Z.map((z, i) => ((z === 7 || z === 8 || z === 16) && q[i] < -0.25 ? i : -1)).filter((i) => i >= 0);
  const prove = [], metti = (R_, t) => { const pos = new Float64Array(fb.pos.length); for (let i = 0; i < fb.n; i++) { const v = somma(R_(meno(p3(fb, i), cb)), t); pos[3 * i] = v[0]; pos[3 * i + 1] = v[1]; pos[3 * i + 2] = v[2]; } prove.push(pos); };
  // b accostata ad a: un suo accettore davanti a un idrogeno di a (e viceversa), il resto di b dalla parte opposta; quattro giri attorno al legame
  for (const [h, x] of donatori(fa)) { const u = unita(meno(p3(fa, h), p3(fa, x))); for (const j of accettori(fb, qb)) { const fuori = unita(meno(cb, p3(fb, j))), R0 = porta(fuori, u); for (let g = 0; g < 4; g++) { const Rg = (v) => ruotaAttorno(R0(v), u, (g * Math.PI) / 2); metti(Rg, meno(somma(p3(fa, h), per(u, 1.9)), Rg(meno(p3(fb, j), cb)))); } } }
  for (const j of accettori(fa, qa)) { const w = lungo(meno(p3(fa, j), ca)) > 0.1 ? unita(meno(p3(fa, j), ca)) : [1, 0, 0]; for (const [h, x] of donatori(fb)) { const d = unita(meno(p3(fb, h), p3(fb, x))), R0 = porta(d, per(w, -1)); for (let g = 0; g < 4; g++) { const Rg = (v) => ruotaAttorno(R0(v), w, (g * Math.PI) / 2); metti(Rg, meno(somma(p3(fa, j), per(w, 1.9)), Rg(meno(p3(fb, h), cb)))); } } }
  // a pila: b sopra e sotto il piano di a (l'asse di momento d'inerzia più grande), a 3,6 Å
  if (fa.n > 2 && fb.n > 2) { const na = inerzia(fa).assi[2], nb = inerzia(fb).assi[2], R0 = porta(unita(nb), unita(na)); for (const lato of [1, -1]) for (let g = 0; g < 4; g++) metti((v) => ruotaAttorno(R0(v), unita(na), (g * Math.PI) / 2), somma(ca, per(unita(na), 3.6 * lato))); }
  if (!prove.length) metti((v) => v, somma(ca, [4, 0, 0]));
  const fbIn = (pos) => ({ ...fb, pos }), provati = prove.map((pos) => { const c = campo(insieme([fa, fbIn(pos)]), { solvente }); return { c, e: forze(c).energia }; }).sort((x, y) => x.e - y.e).slice(0, tieni);
  let meglio = null; for (const pr of provati) { const mn = minimizza(pr.c, { passi: 2 * passi }); if (!meglio || mn.energia < meglio.energia) meglio = mn; }
  let legamiH = 0; for (let i = 0; i < fa.n; i++) for (let j = fa.n; j < meglio.n; j++) { const [h, x] = meglio.Z[i] === 1 ? [i, j] : [j, i]; if (meglio.Z[h] !== 1 || ![7, 8].includes(meglio.Z[x]) || Math.abs(meglio.q[h]) < 0.2) continue; if (Math.hypot(meglio.pos[3 * h] - meglio.pos[3 * x], meglio.pos[3 * h + 1] - meglio.pos[3 * x + 1], meglio.pos[3 * h + 2] - meglio.pos[3 * x + 2]) < 2.4) legamiH++; }
  // l'energia d'interazione: solo le coppie di atomi una di qua e una di là, nella geometria trovata (le tensioni interne non contano)
  const tutti = (da, a_) => { const o = new Set(); for (let i = da; i < a_; i++) o.add(i); return o; }, sA = tutti(0, fa.n), sB = tutti(fa.n, meglio.n), soloTra = { ...meglio, legami: [], angoli: [], torsioni: [], escl: Array.from({ length: meglio.n }, (_, i) => (i < fa.n ? sA : sB)), uno4: Array.from({ length: meglio.n }, () => new Set()) };
  const dE = Math.min(0, forze(soloTra, meglio.pos).energia), dG = dE + (solvente === 'acqua' ? COSTO_LEGARSI : 0), out = { dE, dG, K: Math.exp(-dG / (R * T)), legamiH, configurazione: meglio };
  if (MEMO.size > 3000) MEMO.clear(); MEMO.set(id, out); return out;
}

// catalisiDa(catalizzatore, reazione, { T, solvente }) → { ddG (di quanto scende, o sale, la barriera per i reagenti legati),
//   legame: [K di ogni reagente], accelerazioneDeiLegati (e^(−ΔΔG‡/RT)), vicinanza (mol/L, se i reagenti sono due),
//   fattorePerMole: v catalizzata / v libera per ogni mol/L di catalizzatore (reagenti diluiti) }
export function catalisiDa(cat, r, { T = 298.15, solvente = 'acqua' } = {}) {
  const veri = (l) => l.filter((k) => k !== 'O' && k !== '[H+]' && k !== '[HH]'), re = veri(r.reagenti), pr = veri(r.prodotti), con = (l) => l.map((k) => interazione(cat, k, { solvente, T }));
  const iR = con(re), iP = con(pr), ER = iR.reduce((s, x) => s + x.dE, 0), EP = iP.reduce((s, x) => s + x.dE, 0), ddG = 0.5 * (EP - ER), K = iR.map((x) => x.K), vicinanza = re.length >= 2 ? CONCENTRAZIONE_EFFICACE : 1;
  return { ddG, legame: K, accelerazioneDeiLegati: Math.exp(-ddG / (R * T)), vicinanza, fattorePerMole: K.reduce((p, x) => p * x, 1) * vicinanza * Math.exp(-ddG / (R * T)), conReagenti: ER, conProdotti: EP };
}

// copia(stampo: [unità], monomeri: { molecola: mol/L }, { T, solvente }) → per ogni posto dello stampo chi ci si lega e quanto,
//   { posti: [{ unita, legato: { monomero: occupazione }, giusto (il monomero che lega di più), fedelta }], fedelta (media per posto),
//     errore (1 − fedeltà), accelerazione (velocità di giunzione tra due monomeri legati vicini / quella in soluzione), dG: { 'stampo|monomero': kJ/mol } }
// «Giusto» non è scritto da nessuna parte: è il monomero che l'energia d'interazione preferisce per quell'unità.
export function copia(stampo, monomeri, { T = 298.15, solvente = 'acqua' } = {}) {
  const nomi = Object.keys(monomeri), dG = {}, posti = stampo.map((u) => { const w = nomi.map((m) => { const i = interazione(u, m, { solvente, T }); dG[`${chiave(u)}|${chiave(m)}`] = i.dG; return monomeri[m] * i.K; }), tot = w.reduce((s, x) => s + x, 0), occ = Object.fromEntries(nomi.map((m, i) => [m, w[i] / (1 + tot)])), g = nomi[w.indexOf(Math.max(...w))];
    return { unita: u, legato: occ, giusto: g, fedelta: tot > 0 ? Math.max(...w) / tot : 0, occupazione: tot / (1 + tot) }; });
  const fed = posti.reduce((s, p) => s + p.fedelta, 0) / posti.length; let acc = 0; for (let i = 0; i + 1 < posti.length; i++) acc += (CONCENTRAZIONE_EFFICACE * posti[i].legato[posti[i].giusto] * posti[i + 1].legato[posti[i + 1].giusto]) / (monomeri[posti[i].giusto] * monomeri[posti[i + 1].giusto]) / Math.max(1, posti.length - 1);
  return { posti, fedelta: fed, errore: 1 - fed, accelerazione: acc, dG };
}

// ripiega(polimero peptidico, { passi, caso, solvente }) → ricottura Monte Carlo sui diedri φ, ψ di ogni residuo (da 1000 a 300 K),
//   energia = campo di forze in acqua (tutti gli atomi). → { energia (la più bassa), angoli: [[φ, ψ]], distesa (energia della catena distesa),
//   stati: [{ forma: 'αβα…', energia }] (il migliore per ogni forma della spina dorsale: α, β, altro), salto (kJ/mol tra i primi due),
//   netto (il minimo è solo: salto > 3·RT, e sta sotto l'entropia di catena), entropiaDiCatena (T·S, kJ/mol: R·ln 3 per residuo), forma3D }
// FIN DOVE ARRIVA: catene fino a 20-30 residui in secondi-minuti; dice se il campo vede un minimo netto, non garantisce
// che sia quello vero (solvente implicito, niente catene laterali che ruotano, poche centinaia di passi).
export function ripiega(p, { passi = 300, caso = null, solvente = 'acqua', T = 300 } = {}) {
  const n = p.unita.length, dd = diedriPeptide(p, -139, 135), radice = caso ? caso.radice : `molecole/ripiega/${chiave(p.m)}`, u = (k) => numero(`${radice}/${k}`) / 4294967296;
  const diedri = (ang) => { const o = []; for (let i = 0; i < n; i++) { if (i > 0) { o.push([dd.CA[i - 1], dd.C[i - 1], dd.N[i], dd.CA[i], 180]); o.push([dd.C[i - 1], dd.N[i], dd.CA[i], dd.C[i], ang[i][0]]); } if (i < n - 1) o.push([dd.N[i], dd.CA[i], dd.C[i], dd.N[i + 1], ang[i][1]]); } return o; };
  const E = (ang) => { const f = forma(p.m, { diedri: diedri(ang) }); return [forze(campo(f, { solvente })).energia, f]; }, bacini = [[-57, -47], [-139, 135], [-75, 150], [-90, 0]];
  const classe = (a) => (a[0] < 0 && a[1] > -90 && a[1] < 30 ? 'α' : a[0] < -45 && (a[1] > 90 || a[1] < -150) ? 'β' : '·'), nome = (ang) => ang.map(classe).join('');
  let ang = Array.from({ length: n }, () => [-139, 135]), [e, f] = E(ang); const distesa = e, stati = new Map([[nome(ang), e]]); let meglio = { e, ang: ang.map((a) => a.slice()), f };
  for (let s = 0; s < passi; s++) { const Tk = 1000 * Math.pow(T / 1000, s / Math.max(1, passi - 1)), i = Math.floor(u(`${s}/chi`) * n), nuovo = ang.map((a) => a.slice());
    if (u(`${s}/come`) < 0.5) { const b = bacini[Math.floor(u(`${s}/bacino`) * bacini.length)]; nuovo[i] = [b[0] + 30 * (u(`${s}/a`) - 0.5), b[1] + 30 * (u(`${s}/b`) - 0.5)]; } else nuovo[i] = [ang[i][0] + 40 * (u(`${s}/a`) - 0.5), ang[i][1] + 40 * (u(`${s}/b`) - 0.5)];
    const [e2, f2] = E(nuovo); if (e2 < e || u(`${s}/accetta`) < Math.exp(-(e2 - e) / (R * Tk))) { ang = nuovo; e = e2; const k = nome(ang); if (!stati.has(k) || e < stati.get(k)) stati.set(k, e); if (e < meglio.e) meglio = { e, ang: ang.map((a) => a.slice()), f: f2 }; } }
  const lista = [...stati].map(([forma_, energia]) => ({ forma: forma_, energia })).sort((x, y) => x.energia - y.energia), salto = lista.length > 1 ? lista[1].energia - lista[0].energia : Infinity, TS = R * T * Math.log(3) * n;
  return { energia: meglio.e, angoli: meglio.ang, distesa, stati: lista.slice(0, 8), salto, entropiaDiCatena: TS, netto: salto > 3 * R * T && meglio.e - distesa < -TS, forma3D: meglio.f, passi };
}

// ---------- le superfici dei minerali
// superficie(reticolo) — il reticolo è quello VERO, dato da materia.js reticolo(minerale) (qui non lo si importa: lo passa chi chiama).
// Si taglia la cella in cima (gli atomi entro «spessore» Å dal più alto, lungo c): i cationi rimasti senza una parte dei loro
// ossigeni sono posti vuoti (acidi di Lewis: prendono coppie solitarie), gli ossigeni sono basi (in acqua: –OH, –O⁻).
// → { minerale, areaNm2 (della faccia della cella), siti: [{ elemento, Z, carica, tipo, perNm2 }] }
export function superficie(ret, { spessore = 1.5 } = {}) {
  const A = ret.base.A, B = ret.base.B, area = lungo(vettore(A, B)) / 100, zmax = Math.max(...ret.atomi.map((a) => a.pos[2])), conta_ = new Map();
  for (const a of ret.atomi) { if (a.pos[2] < zmax - spessore) continue; conta_.set(a.el, (conta_.get(a.el) || 0) + (a.occ ?? 1)); }
  const siti = [...conta_].map(([el, nn]) => { const At = atomo(el), catione = At.metallo || el === 'Si'; return { elemento: el, Z: At.Z, carica: catione ? Math.max(...At.ossidazioniMisurate) : el === 'O' ? -2 : 0, tipo: catione ? 'posto vuoto (acido di Lewis)' : el === 'O' ? 'ossigeno (base)' : 'altro', perNm2: nn / area }; });
  return { minerale: ret.nome, areaNm2: area, siti };
}
// adsorbi(molecola, sito, { T }) → la molecola legata a un catione della superficie con una sua coppia solitaria:
//   { specie (il grafo: donatore->[M+q], un complesso), logK, dG (kJ/mol), con (l'atomo che lega), copertura: (mol/L) → frazione dei siti occupati }
export function adsorbi(x, sito, { T = 298.15 } = {}) {
  const m = molecola(x); let meglio = null;
  m.atomi.forEach((a, k) => { if (![7, 8, 16].includes(a.Z) || a.q > 0 || coppieSolitarie(m, k) < 1) return; const lk = logKComplesso(sito.Z, Math.min(sito.carica, 3), a.Z, a.q); if (!meglio || lk > meglio.logK) meglio = { k, logK: lk }; });
  if (!meglio || sito.carica <= 0) return null;
  const g = grezzo(m); g.atomi.push({ Z: sito.Z, q: Math.min(sito.carica, 3), h: 0 }); g.legami.push({ a: meglio.k, b: g.atomi.length - 1, o: 1, t: 'd' }); const sp = molecola(g), K = Math.pow(10, meglio.logK);
  return { specie: chiave(sp), valida: valida(sp).ok, logK: meglio.logK, dG: -R * T * Math.LN10 * meglio.logK, con: atomo(m.atomi[meglio.k].Z).simbolo, copertura: (c) => (K * c) / (1 + K * c) };
}
