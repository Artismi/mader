// orbite.js — le orbite e gli assi in tre dimensioni e nel tempo: dove sta un corpo, come si muove e come è girato a
// ogni istante. È il moto dei due corpi di Keplero (esatto), con gli elementi che la formazione ha lasciato.
//
// Un'orbita ha sei numeri. Due c'erano già (disco.js, lune.js): il semiasse e l'eccentricità. Gli altri quattro:
//   · L'INCLINAZIONE sul piano medio del sistema. Gli incontri tra embrioni che danno l'eccentricità danno anche
//     l'inclinazione: le velocità a caso si ripartiscono tra il piano e la verticale, ⟨i²⟩^½ = ⟨e²⟩^½/2 (legge
//     dichiarata: Ida & Makino 1992, dalle simulazioni dei dischi di planetesimi). L'eccentricità di un pianeta è
//     presa come un'estrazione dalla distribuzione di Rayleigh del suo sistema (di scarto e/1,25: la media di una
//     Rayleigh è 1,25 volte il suo scarto), e l'inclinazione come un'altra estrazione, con metà dello scarto: un evento;
//   · IL NODO e L'ARGOMENTO DEL PERICENTRO: nessuna legge sceglie una direzione nel piano. Due eventi (uniformi);
//   · DOVE STA OGGI lungo l'orbita: la longitudine di oggi nel piano del sistema è la `fase` che cosmo.js aveva già
//     (la mappa piatta resta la vista dall'alto: stessa direzione; la distanza vera differisce dal cerchio medio di
//     al più e·a).
// Le lune: quelle nate dal disco attorno al pianeta o da un grande urto girano nel piano dell'EQUATORE del pianeta
// (lì stava il disco da cui sono nate; l'inclinazione residua è la stessa ripartizione, dalla loro eccentricità); le
// catturate hanno un piano qualunque rispetto all'orbita del pianeta, tranne tra 55° e 130° dove la stella le
// strappa via (oscillazioni di Kozai: nessuna luna irregolare vera sta lì; Carruba et al. 2002), dirette o al contrario
// come dice lune.js.
// GLI ASSI. L'asse di un pianeta è un vettore: l'angolo con la normale alla sua orbita è l'obliquità di rotazione.js
// (oltre 90° se gira al contrario); la direzione attorno alla normale è quella da cui è arrivato l'ultimo urto: un
// evento (uniforme). Chi è bloccato dalla marea ha l'asse dritto e mostra alla stella sempre lo stesso meridiano
// (la longitudine 0); chi è in risonanza (3:2…) le mostra il meridiano 0 al pericentro. L'asse della stella sta vicino
// alla normale al piano del sistema (dato misurato: il Sole a 6°; le stelle fredde con pianeti entro una decina di
// gradi, le calde, sopra 6250 K, anche molto storte: Winn et al. 2010); il suo giro rallenta con l'età come la
// radice (Skumanich 1972: misurato sul Sole, 25,4 giorni a 4,57 miliardi di anni), per le stelle con un involucro
// convettivo; le calde girano in fretta (velocità all'equatore ~120 km/s: Kraft 1967).
//
// CHE COSA NON C'È (dichiarato): le orbite non cambiano nel tempo (niente precessione, niente risonanze tra pianeti,
// niente migrazione delle lune: gli elementi sono quelli di oggi a ogni istante dopo la formazione); l'asse non
// precede; le perturbazioni tra pianeti non ci sono (ognuno gira attorno alla stella come se fosse solo; la stella
// risponde a tutti: il baricentro è fermo).

import { COSTANTI, GIORNO } from './leggi.js';

export const ORBITE = Object.freeze({
  ripartizione: 0.5, // ⟨i²⟩^½ / ⟨e²⟩^½ (Ida & Makino 1992)
  rayleigh: 1.2533, // media / scarto di una distribuzione di Rayleigh: √(π/2)
  kozai: [55, 130], // (gradi) tra queste inclinazioni una luna catturata non resta (Carruba et al. 2002)
  stellaFredda: [6, 6250], // (gradi, K) lo scarto dell'asse delle stelle sotto 6250 K rispetto al piano dei pianeti
  stellaCalda: 30, // (gradi) lo scarto per le stelle più calde (Winn et al. 2010: spesso disallineate)
  skumanich: [25.4, 4.57e9], // (giorni, anni) il giro del Sole oggi: P ∝ √età
  kraft: 1.2e5, // (m/s) la velocità all'equatore delle stelle calde
});
const G = COSTANTI.G, PI2 = 2 * Math.PI;

// ---------- vettori (tre numeri)
export const V = {
  somma: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], meno: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], per: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  scalare: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], croce: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  norma: (a) => Math.hypot(a[0], a[1], a[2]), versore: (a) => { const n = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / n, a[1] / n, a[2] / n]; },
};
// una terna destra con il terzo asse dato: (e1, e2, n); e1 è la proiezione dell'asse x sul piano (o y, se x è lungo n)
export function terna(n) {
  n = V.versore(n); let e1 = V.meno([1, 0, 0], V.per(n, n[0])); if (V.norma(e1) < 1e-6) e1 = V.meno([0, 1, 0], V.per(n, n[1]));
  e1 = V.versore(e1); return [e1, V.croce(n, e1), n];
}
// da una terna (le componenti nei suoi assi) al riferimento in cui la terna è scritta
export const daTerna = (T, v) => [T[0][0] * v[0] + T[1][0] * v[1] + T[2][0] * v[2], T[0][1] * v[0] + T[1][1] * v[1] + T[2][1] * v[2], T[0][2] * v[0] + T[1][2] * v[1] + T[2][2] * v[2]];

// ---------- Keplero
// l'anomalia eccentrica dall'anomalia media (Newton; converge in pochi passi per e < 1)
export function anomaliaEccentrica(M, e) {
  M = ((M % PI2) + PI2) % PI2; let E = e < 0.8 ? M : Math.PI;
  for (let k = 0; k < 30; k++) { const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); E -= d; if (Math.abs(d) < 1e-13) break; }
  return E;
}
export const anomaliaMedia = (nu, e) => { const E = 2 * Math.atan2(Math.sqrt(1 - e) * Math.sin(nu / 2), Math.sqrt(1 + e) * Math.cos(nu / 2)); return E - e * Math.sin(E); };
// gli assi del piano dell'orbita nel riferimento: P verso il pericentro, Q a 90° nel verso del moto, W la normale
export function assiOrbita({ i, nodo, peri }) {
  const cO = Math.cos(nodo), sO = Math.sin(nodo), ci = Math.cos(i), si = Math.sin(i), cw = Math.cos(peri), sw = Math.sin(peri);
  return [[cO * cw - sO * sw * ci, sO * cw + cO * sw * ci, sw * si], [-cO * sw - sO * cw * ci, -sO * sw + cO * cw * ci, cw * si], [sO * si, -cO * si, ci]];
}
// LO STATO a t secondi dall'epoca: posizione (m) e velocità (m/s) rispetto al corpo attorno a cui gira.
// el: { a (m), e, i, nodo, peri (rad), M0 (anomalia media all'epoca), mu (G·massa totale, m³/s²) }
export function statoKeplero(el, t = 0) {
  const n = Math.sqrt(el.mu / el.a ** 3), E = anomaliaEccentrica(el.M0 + n * t, el.e), c = Math.cos(E), s = Math.sin(E), b = Math.sqrt(1 - el.e * el.e), r = el.a * (1 - el.e * c);
  const x = el.a * (c - el.e), y = el.a * b * s, vx = (-el.a * n * s * el.a) / r, vy = (el.a * n * b * c * el.a) / r, [P, Q] = el.assi || (el.assi = assiOrbita(el));
  return { pos: [x * P[0] + y * Q[0], x * P[1] + y * Q[1], x * P[2] + y * Q[2]], vel: [vx * P[0] + vy * Q[0], vx * P[1] + vy * Q[1], vx * P[2] + vy * Q[2]], r, anomaliaMedia: el.M0 + n * t };
}
export const periodo = (el) => PI2 * Math.sqrt(el.a ** 3 / el.mu);
// l'anomalia vera che, proiettata sul piano di riferimento, cade alla longitudine data (per ritrovare la posizione di oggi)
const anomaliaAllaLongitudine = (long, el) => Math.atan2(Math.sin(long - el.nodo) / Math.cos(el.i), Math.cos(long - el.nodo)) - el.peri;

// ---------- GLI ELEMENTI DI UN PIANETA. P: il pianeta di cosmo.js sistema() ({ aM, eccentricita, fase, massaKg, Mstella });
// caso: la sorgente degli eventi del pianeta («…/pianeta 2»). L'epoca è oggi.
export function elementiPianeta(P, caso) {
  const e = Math.min(0.95, P.eccentricita || 0), i = Math.min(1.2, ((ORBITE.ripartizione * e) / ORBITE.rayleigh) * Math.sqrt(-2 * Math.log(1 - caso('orbita/inclinazione'))));
  const el = { a: P.aM, e, i, nodo: PI2 * caso('orbita/nodo'), peri: PI2 * caso('orbita/pericentro'), mu: P.anno ? (PI2 * PI2 * P.aM ** 3) / P.anno ** 2 : G * P.Mstella }; // (l'anno è quello di cosmo.js: una grandezza, una fonte)
  el.M0 = anomaliaMedia(anomaliaAllaLongitudine(P.fase ?? 0, el), e); el.assi = assiOrbita(el); el.normale = el.assi[2];
  return el;
}
// L'ASSE DI UN PIANETA (un versore nel riferimento del sistema) e come gira. el: i suoi elementi.
// → { asse, terna (e1, e2, asse: il riferimento dell'equatore), giorno (s), meridiano0, angolo(t): di quanto è girato il
//     meridiano 0 attorno all'asse, da e1, a t secondi dall'epoca }
export function assePianeta(P, el, caso) {
  const [Pp, Qp, W] = el.assi, teta = ((P.retrogrado ? 180 - (P.obliquita || 0) : P.obliquita || 0) * Math.PI) / 180, psi = PI2 * caso('asse/direzione');
  // attorno alla normale: la direzione da cui è arrivato l'ultimo urto (misurata dalla linea dei nodi)
  const u = [Math.cos(el.nodo), Math.sin(el.nodo), 0], w = V.croce(W, u);
  const asse = V.versore(V.somma(V.per(W, Math.cos(teta)), V.per(V.somma(V.per(u, Math.cos(psi)), V.per(w, Math.sin(psi))), Math.sin(teta)))), T = terna(asse);
  const n = Math.sqrt(el.mu / el.a ** 3), giri = P.bloccato ? 1 : P.risonanza ? (() => { const [p, q] = String(P.risonanza).split(':').map(Number); return p / q; })() : null;
  // l'angolo, nel piano dell'equatore, della direzione verso la stella quando il pianeta è al pericentro
  const versoStella = (v) => Math.atan2(-V.scalare(v, T[1]), -V.scalare(v, T[0])), alPericentro = versoStella(Pp); void Qp;
  // (agganciato: il meridiano 0 guarda la stella al pericentro e poi gira uniforme, `giri` volte per orbita; libero: dove sta oggi è un evento)
  const meridiano0 = giri ? alPericentro + giri * el.M0 : PI2 * caso('asse/meridiano'), ritmo = giri ? giri * n : PI2 / P.giorno;
  return { asse, terna: T, giorno: PI2 / ritmo, agganciato: giri, meridiano0, angolo: (t = 0) => meridiano0 + ritmo * t };
}
// GLI ELEMENTI DI UNA LUNA attorno al suo pianeta (nel riferimento del sistema, rispetto al centro del pianeta).
// L: la luna di lune.js; asseP: ciò che assePianeta ha dato; elP: gli elementi del pianeta; fase0: l'angolo di oggi nel
// suo piano (quello che la mappa piatta usa già); caso: la sorgente della luna («…/pianeta 2/luna 0»)
export function elementiLuna(P, L, asseP, elP, fase0, caso) {
  const e = Math.min(0.95, L.eccentricita || 0), catturata = L.origine === 'cattura';
  let i, base;
  if (catturata) { // un piano qualunque rispetto all'orbita del pianeta, fuori dalla fascia di Kozai; dirette o al contrario
    const c0 = Math.cos((ORBITE.kozai[0] * Math.PI) / 180), c1 = Math.cos((ORBITE.kozai[1] * Math.PI) / 180), u = caso('orbita/inclinazione');
    i = Math.acos(L.retrograda ? -1 + u * (c1 + 1) : 1 - u * (1 - c0)); base = [terna(elP.assi[2])[0], terna(elP.assi[2])[1], elP.assi[2]];
  } else { // nel piano dell'equatore del pianeta, nel verso in cui il pianeta gira
    i = Math.min(0.5, ((ORBITE.ripartizione * e) / ORBITE.rayleigh) * Math.sqrt(-2 * Math.log(1 - caso('orbita/inclinazione')))); base = asseP.terna;
  }
  const loc = { a: L.aM, e, i, nodo: PI2 * caso('orbita/nodo'), peri: PI2 * caso('orbita/pericentro'), mu: G * (P.massaKg + L.massaKg) };
  loc.M0 = anomaliaMedia(anomaliaAllaLongitudine(fase0, loc), e);
  // gli assi dell'orbita, portati dal riferimento del piano di base a quello del sistema
  const A = assiOrbita(loc); loc.assi = A.map((v) => daTerna(base, v)); loc.normale = loc.assi[2];
  return loc;
}
// L'ASSE E IL GIRO DELLA STELLA. S: la stella del catalogo ({ T, raggioM?, stato }); R: il suo raggio (m); eta: anni
export function asseStella(S, R, eta, caso) {
  const calda = S.T > ORBITE.stellaFredda[1], scarto = ((calda ? ORBITE.stellaCalda : ORBITE.stellaFredda[0]) * Math.PI) / 180;
  const teta = Math.min(Math.PI, scarto * Math.sqrt(-2 * Math.log(1 - caso('asse/inclinazione')))), fi = PI2 * caso('asse/direzione');
  const asse = [Math.sin(teta) * Math.cos(fi), Math.sin(teta) * Math.sin(fi), Math.cos(teta)], viva = S.stato === 'in vita' || S.stato === 'gigante rossa';
  // il giro: Skumanich per chi ha un involucro convettivo (il vento magnetico la frena), svelta se è calda; un resto: non si sa (null)
  const giro = !viva ? null : calda ? (PI2 * R) / ORBITE.kraft : Math.max(0.3, ORBITE.skumanich[0] * Math.sqrt(Math.max(eta, 1e6) / ORBITE.skumanich[1])) * GIORNO;
  const meridiano0 = PI2 * caso('asse/meridiano');
  return { asse, terna: terna(asse), giro, meridiano0, angolo: (t = 0) => meridiano0 + (giro ? (PI2 * t) / giro : 0) };
}
