// spazio3d.js — il mondo in tre dimensioni e nel tempo, per i livelli grandi: il sistema, la galassia, il cosmo.
//
// cosmo.js dà il mondo di OGGI visto dall'alto: le stelle di una galassia hanno `pos: [x, y]`, i pianeti una `fase` su
// un cerchio. Qui ogni cosa ha una posizione in tre dimensioni e un moto, come conseguenza delle stesse leggi, e si
// può chiedere a un tempo qualunque. La mappa piatta resta vera: è la proiezione di questo spazio sul piano del
// sistema (o della galassia), a oggi. Niente di ciò che cosmo.js dà cambia: qui si AGGIUNGE (terza coordinata,
// velocità, assi), con eventi nuovi agli stessi indirizzi (regola 3: un ramo cambia solo ciò che ne discende).
//
// IL TEMPO. `t` è in SECONDI DA OGGI (l'epoca: l'età dell'universo di leggi.js): t = 0 è il mondo di cosmo.js;
// t < 0 è il passato. (Gli anni dall'inizio del cosmo sono ANNI_OGGI + t/ANNO.)
// I RIFERIMENTI (tutti destrorsi, in metri):
//   · del sistema: origine nel baricentro, piano xy = il piano medio del sistema (quello della mappa), z la normale;
//   · della galassia: origine nel centro, piano xy = il piano della galassia (quello della mappa, x e y le stesse), z
//     lungo il momento angolare… (vedi più sotto: assiGalassia);
//   · del cosmo: coordinate comoventi sul toro (x, y le stesse della mappa; z la profondità), per il fattore di scala.
//   Come uno sta nell'altro lo dicono `assiSistema` e `assiGalassia` (tre versori: le colonne della rotazione).
//
// CHE COSA È VERO NEL TEMPO E CHE COSA RESTA FERMO A OGGI (regola 6), livello per livello: vedi le funzioni `stato…`.

import { COSTANTI, ANNO, LSOLE, RSOLE, UA, MSOLE, KPC, etaUniverso } from './leggi.js';
import { stella as stellaVera, fine } from './stelle.js';
import { sorgente } from './eventi.js';
import { sistema, galassia, cosmo, semeEvento, cosmoBase, ramiCosmo, LATO_SISTEMA_M, TORO_M } from './cosmo.js';
import { cosmo3d } from './cosmo3d.js';
import { rotazione } from './rotazione.js';
import { V, terna, daTerna, statoKeplero, periodo, elementiPianeta, assePianeta, elementiLuna, asseStella } from './orbite.js';
import { motoStella, faseBraccioAlTempo, cinematica, densitaGalassia, curvaRotazione, galassiaAlTempo, colorePerTemperatura } from './galassie.js';
import { scenaVuoto } from './vuoto.js';

export const ANNI_OGGI = etaUniverso() / ANNO; // l'epoca: t = 0
const PI2 = 2 * Math.PI, G = COSTANTI.G;
const memo = (f, quante = 48) => { const m = new Map(); return (...a) => { const k = a.join('|'); if (!m.has(k)) { if (m.size > quante) m.delete(m.keys().next().value); m.set(k, f(...a)); } return m.get(k); }; };
const radiceStella = (n, gid, sid) => `cosmo ${cosmoBase(n)}/galassia ${gid}/stella ${sid}`;
// una direzione qualunque sulla sfera, e una terna qualunque, da tre eventi
const direzione = (caso, nome) => { const z = 2 * caso(`${nome}/z`) - 1, fi = PI2 * caso(`${nome}/fi`), r = Math.sqrt(1 - z * z); return [r * Math.cos(fi), r * Math.sin(fi), z]; };
const ruota = (v, asse, ang) => { const c = Math.cos(ang), s = Math.sin(ang), d = V.scalare(asse, v), x = V.croce(asse, v); return [v[0] * c + x[0] * s + asse[0] * d * (1 - c), v[1] * c + x[1] * s + asse[1] * d * (1 - c), v[2] * c + x[2] * s + asse[2] * d * (1 - c)]; };
// la magnitudine assoluta bolometrica da una luminosità in watt (il Sole: 4,74)
export const magnitudine = (W) => (W > 0 ? 4.74 - 2.5 * Math.log10(W / LSOLE) : Infinity);

// =====================================================================================================
// IL SISTEMA
// =====================================================================================================
// Gli elementi (fissi) di tutte le orbite e di tutti gli assi di un sistema, a oggi.
export const elementiSistema = memo((n, gid, sid) => {
  const Sis = sistema(n, gid, sid), S = Sis.stella, rami = ramiCosmo(n), radice = radiceStella(n, gid, sid), casoS = sorgente(radice, rami);
  const stella = asseStella(S, S.r * LATO_SISTEMA_M, S.eta, casoS);
  const pianeti = Sis.pianeti.map((P) => {
    const c = sorgente(`${radice}/pianeta ${P.id}`, rami), el = elementiPianeta(P, c), asse = assePianeta(P, el, c);
    const lune = (P.lune || []).map((L) => ({ L, el: elementiLuna(P, L, asse, el, (semeEvento('fase luna', n, gid, sid, P.id, L.id) / 4294967296) * PI2, c.sotto(`luna ${L.id}`)) }));
    return { P, el, asse, lune, caso: c };
  });
  // come il sistema è girato nella galassia: il piano di un disco protoplanetario viene dal momento angolare del suo
  // pezzo di nube, che non sa niente del piano della galassia (il Sole: 60°): una terna qualunque, da tre eventi
  const z = direzione(casoS, 'sistema/piano'), T = terna(z), a = PI2 * casoS('sistema/piano/giro'), x = ruota(T[0], z, a);
  return { Sis, stella, pianeti, assi: [x, V.croce(z, x), z] };
});
// gli assi del sistema nel riferimento della galassia (tre versori: x, y, z del sistema)
export const assiSistema = (n, gid, sid) => elementiSistema(n, gid, sid).assi;

// LO STATO DI UN SISTEMA a t secondi da oggi: dove sono e come sono girati la stella, i pianeti, le lune.
// → { t, eta (anni della stella a quel tempo), fase: 'non nata' | 'disco' | 'pianeti',
//     stella: { pos, vel (m, m/s nel riferimento del sistema), massaKg, raggioM, L (W), T (K), magnitudine, stato, asse, angolo (rad), giro (s) },
//     disco: (solo nella fase 'disco') il disco di disco.js con ciò che resta del gas,
//     pianeti: [{ id, pos, vel, raggioM, massaKg, formato, asse, terna, angolo, giorno, elementi, lune: [{ id, pos, vel, raggioM, massaKg, elementi, bloccata, dalPianeta }] }] }
// (`terna`: [e1, e2, asse]; il meridiano 0 sta, sull'equatore, all'angolo `angolo` da e1 verso e2: vedi assettoDa)
// CHE COSA È VERO NEL TEMPO: le posizioni lungo le orbite (Keplero, esatte), il giro di ogni corpo, il baricentro; la
// stella alla sua età di allora (luce, raggio, temperatura: stelle.js; prima di morire era ancora viva, con la massa
// di nascita e le orbite più strette in proporzione: m·a si conserva quando la massa si perde piano); il giorno dei
// pianeti com'era (rotazione.js rifatto con l'età di allora: la marea della stella non l'aveva ancora frenato); il
// disco prima dei pianeti (fase 'disco': gli embrioni non sono ancora pianeti: `formato: false` fino all'ultimo urto).
// CHE COSA RESTA FERMO A OGGI: gli elementi delle orbite (niente precessione né migrazione: le lune sono dove sono
// oggi anche nel passato), le direzioni degli assi, i pianeti inghiottiti da una gigante (non ricompaiono nel passato),
// i raggi dei pianeti (non la contrazione da giovani), clima e interno (sono di cosmo.js: di oggi).
export function statoSistema(n, gid, sid, t = 0) {
  const E = elementiSistema(n, gid, sid), { Sis } = E, S = Sis.stella, eta = S.eta + t / ANNO;
  if (!(eta > 0)) return { t, eta, fase: 'non nata', stella: null, disco: null, pianeti: [] };
  // la stella alla sua età di allora
  const m0 = S.massaNascita || S.massa, Z = S.Z ?? 1, vita = stellaVera(m0, { Z }).vita, viva = eta < vita, vivaOggi = S.stato === 'in vita' || S.stato === 'gigante rossa';
  let stella;
  if (viva) { const s = stellaVera(m0, { Z, eta }); stella = { massaKg: m0 * MSOLE, raggioM: s.R * RSOLE, L: s.L * LSOLE, T: eta > 0.9 * vita ? Math.min(s.T, 4200) : s.T, stato: eta > 0.9 * vita ? 'gigante rossa' : 'in vita' }; }
  else { const f = vivaOggi ? fine(m0, S.B ?? 1e-4, { Z }) : { tipo: S.stato, massa: S.massa, raggio: S.raggioM }, R = f.raggio || 1e4, T = S.stato === 'nana bianca' ? S.T : 0; stella = { massaKg: f.massa * MSOLE, raggioM: R, L: 4 * Math.PI * R * R * COSTANTI.sigma * T ** 4, T, stato: f.tipo }; }
  stella.magnitudine = magnitudine(stella.L); stella.asse = E.stella.asse; stella.terna = E.stella.terna; stella.angolo = E.stella.angolo(t); stella.giro = E.stella.giro;
  const fase = Sis.disco && eta < Sis.disco.vita ? 'disco' : 'pianeti', stretta = stella.massaKg / (S.massa * MSOLE); // quanto pesava la stella rispetto a oggi
  // i pianeti: ognuno sulla sua orbita attorno alla stella; poi tutto rispetto al baricentro
  const lontano = Math.abs(t) > 1e5 * ANNO, corpi = [];
  for (const { P, el, asse, lune, caso } of E.pianeti) {
    const elT = stretta === 1 ? el : { ...el, a: el.a / stretta, mu: el.mu * stretta }, k = statoKeplero(elT, t);
    const formato = eta >= (P.urto?.t ?? P.formazione?.tGas ?? 0);
    // il giorno di allora: la marea della stella (e la luna) lo frenano nel tempo (rotazione.js, con l'età di allora)
    let giorno = asse.giorno, angolo = asse.angolo(t);
    if (lontano && !asse.agganciato) { try { const luna = (P.lune || []).find((l) => l.origine === 'urto' && l.giornoPianeta) || null, g = rotazione(P, { ...Sis, stella: { ...S, eta } }, caso, { urto: P.urto, luna }); if (g.giorno > 0 && !g.bloccato && !g.risonanza) { giorno = g.giorno; angolo = asse.meridiano0 + (PI2 * t) / giorno; } } catch { /* resta quello di oggi */ } }
    const lu = lune.map(({ L, el: eL }) => ({ L, k: statoKeplero(eL, t), el: eL }));
    corpi.push({ P, k, formato, giorno, angolo, asse: asse.asse, terna: asse.terna, el: elT, lu });
  }
  let mTot = stella.massaKg; const bar = [0, 0, 0], vbar = [0, 0, 0];
  for (const c of corpi) { let m = c.P.massaKg; for (const l of c.lu) m += l.L.massaKg; c.m = m; mTot += m; for (let d = 0; d < 3; d++) { bar[d] += m * c.k.pos[d]; vbar[d] += m * c.k.vel[d]; } }
  stella.pos = bar.map((x) => -x / mTot); stella.vel = vbar.map((x) => -x / mTot);
  const pianeti = corpi.map((c) => {
    // il baricentro del pianeta con le sue lune sta sull'orbita; il pianeta gli gira attorno, poco
    const cp = V.somma(stella.pos, c.k.pos), cv = V.somma(stella.vel, c.k.vel), sp = [0, 0, 0], sv = [0, 0, 0];
    for (const l of c.lu) { const f = l.L.massaKg / c.m; for (let d = 0; d < 3; d++) { sp[d] -= f * l.k.pos[d]; sv[d] -= f * l.k.vel[d]; } }
    const pos = V.somma(cp, sp), vel = V.somma(cv, sv);
    return { id: c.P.id, pos, vel, raggioM: c.P.raggioM, massaKg: c.P.massaKg, formato: c.formato, asse: c.asse, terna: c.terna, angolo: c.angolo, giorno: c.giorno, elementi: c.el,
      lune: c.lu.map((l) => ({ id: l.L.id, pos: V.somma(pos, l.k.pos), vel: V.somma(vel, l.k.vel), raggioM: l.L.raggioM, massaKg: l.L.massaKg, elementi: l.el, bloccata: !!l.L.bloccata, dalPianeta: l.k.pos })) };
  });
  return { t, eta, fase, stella, disco: fase === 'disco' ? { ...Sis.disco, gasRimasto: 1 - eta / Sis.disco.vita } : null, pianeti };
}
export { periodo, daTerna };

// =====================================================================================================
// LA GALASSIA
// =====================================================================================================
const GA = 1e9 * ANNO;
const STATI = ['in vita', 'gigante rossa', 'nana bianca', 'stella di neutroni', 'buco nero', 'non nata'];
// i moti (fissi) di tutte le stelle del campione: ognuna con i suoi eventi, all'indirizzo della stella
const motiGalassia = memo((n, gid) => {
  const Gx = galassia(n, gid), rami = ramiCosmo(n);
  return Gx.stelle.map((S) => motoStella(Gx.forma, S, sorgente(radiceStella(n, gid, S.id), rami)));
}, 6);
// LO STATO DI UNA GALASSIA a t secondi da oggi: dove sono, come si muovono e come sono le stelle del campione.
// → { t, n, pos: Float64Array(3n) (m, riferimento della galassia: xy il suo piano, origine nel centro), vel: Float32Array(3n)
//     (m/s), esiste: Uint8Array (0 se non era ancora nata), stato: Uint8Array (indice in STATI), L: Float32Array (W),
//     T: Float32Array (K), raggio: Float32Array (m), massa: Float32Array (M☉), peso (le stelle vere che ognuna
//     rappresenta), bracci: l'angolo delle creste a quel tempo, forma }
// CHE COSA È VERO NEL TEMPO: il moto di ogni stella (cerchio guida, epiciclo, su e giù attraverso il piano: galassie.js
// motoStella; a t = 0, viste dall'alto, sono dove le mette il catalogo); i bracci che girano con la loro velocità; chi
// non era ancora nata non c'è; chi oggi è un resto, prima di morire era una stella viva (stelle.js alla sua età di allora).
// CHE COSA RESTA FERMO A OGGI: la forma della galassia (la curva di rotazione, gli anelli, i bracci, lo sferoide sono
// quelli di oggi: andando indietro di miliardi di anni le stelle girano in un potenziale che allora era diverso; la
// storia vera delle masse sta in forma.storia); le stelle del campione sono quelle esistite fino a oggi (regola 9: gli
// stessi individui a ogni tempo), senza le supernove future.
export function statoGalassia(n, gid, t = 0, { stati = Math.abs(t) > 1e5 * ANNO } = {}) {
  const Gx = galassia(n, gid), M = motiGalassia(n, gid), N = Gx.stelle.length, tG = t / GA, anni = t / ANNO;
  const pos = new Float64Array(3 * N), vel = new Float32Array(3 * N), esiste = new Uint8Array(N), stato = new Uint8Array(N), L = new Float32Array(N), T = new Float32Array(N), raggio = new Float32Array(N), massa = new Float32Array(N);
  const oggi = statiDiOggi(n, gid);
  for (let i = 0; i < N; i++) {
    const S = Gx.stelle[i], eta = S.eta + anni, m = M[i].stato(tG);
    for (let d = 0; d < 3; d++) { pos[3 * i + d] = m.pos[d] * KPC; vel[3 * i + d] = m.vel[d] * 1e3; }
    if (!(eta > 0)) { stato[i] = 5; continue; }
    esiste[i] = 1;
    if (!stati) { stato[i] = oggi.stato[i]; L[i] = oggi.L[i]; T[i] = oggi.T[i]; raggio[i] = oggi.raggio[i]; massa[i] = oggi.massa[i]; continue; }
    const q = statoStella(S, eta); stato[i] = q.stato; L[i] = q.L; T[i] = q.T; raggio[i] = q.raggio; massa[i] = q.massa;
  }
  return { t, n: N, pos, vel, esiste, stato, L, T, raggio, massa, peso: Gx.pesoCampione, stati: STATI, forma: Gx.forma, bracci: (rKpc) => faseBraccioAlTempo(Gx.forma, rKpc, tG) };
}
// com'è una stella del catalogo alla sua età `eta` (anni): viva (stelle.js a quell'età) o resto
function statoStella(S, eta) {
  const m0 = S.massaNascita || S.massa, Z = S.Z ?? 1, viveOggi = S.stato === 'in vita' || S.stato === 'gigante rossa', vita = viveOggi && eta <= S.eta ? Infinity : stellaVera(m0, { Z }).vita;
  if (eta < vita) { const s = stellaVera(m0, { Z, eta }), v = viveOggi && eta <= S.eta ? stellaVera(m0, { Z }).vita : vita, gig = eta > 0.9 * v; return { stato: gig ? 1 : 0, L: s.L * LSOLE, T: gig ? Math.min(s.T, 4200) : s.T, raggio: s.R * RSOLE, massa: m0 }; }
  const f = viveOggi ? fine(m0, S.B ?? 1e-4, { Z }) : { tipo: S.stato, massa: S.massa, raggio: S.raggioM }, R = f.raggio || 1e4, Tn = f.tipo === 'nana bianca' ? (S.stato === 'nana bianca' ? S.T : 2e4) : 0;
  return { stato: Math.max(2, STATI.indexOf(f.tipo)), L: 4 * Math.PI * R * R * COSTANTI.sigma * Tn ** 4, T: Tn, raggio: R, massa: f.massa };
}
const statiDiOggi = memo((n, gid) => {
  const Gx = galassia(n, gid), N = Gx.stelle.length, o = { stato: new Uint8Array(N), L: new Float32Array(N), T: new Float32Array(N), raggio: new Float32Array(N), massa: new Float32Array(N) };
  Gx.stelle.forEach((S, i) => { const q = statoStella(S, S.eta); o.stato[i] = q.stato; o.L[i] = q.L; o.T[i] = q.T; o.raggio[i] = q.raggio; o.massa[i] = q.massa; });
  return o;
}, 6);
// GLI ASSI DI UNA GALASSIA nel riferimento del cosmo (tre versori: x, y, z della galassia). L'asse z è quello attorno a cui
// le stelle girano in senso antiorario viste da +z… cioè: il momento angolare della galassia è lungo `verso·z`, dove
// `verso` è il senso in cui il disco gira sulla mappa (galassie.js cinematica); la direzione del momento angolare nello
// spazio viene dalle coppie mareali del campo in tre dimensioni (cosmo3d.js assiGalassie)
export const assiGalassia = memo((n, gid) => {
  const C = cosmo(n), F = campoCosmo(n), J = F.assiGalassie()[gid].asse, s = cinematica(C.galassie[gid].forma).verso, z = V.per(J, s), T = terna(z);
  return [T[0], T[1], T[2]];
}, 400);
const campoCosmo = (n) => cosmo3d(cosmo(n), `cosmo ${cosmoBase(n)}`, ramiCosmo(n), { toroM: TORO_M });
export { campoCosmo };

// =====================================================================================================
// IL COSMO
// =====================================================================================================
// LO STATO DEL COSMO a t secondi da oggi: dove sono le galassie, come si muovono, quanto è grande il toro.
// → { t, a (il fattore di scala: 1 oggi), z (redshift), H (km/s/Mpc), latoM (il lato del toro a quel tempo: a·TORO_M),
//     n, pos: Float64Array(3n) (m: la posizione vera, cioè comovente × a, dall'angolo del toro), comoventi: Float64Array(3n)
//     (0…1 sul toro), vel: Float32Array(3n) (m/s: il moto proprio, oltre l'espansione), esiste: Uint8Array, massaStelle,
//     luce (W), tinta, raggio (m), peso (quante galassie vere rappresenta ognuna), campo (cosmo3d: la densità campionabile) }
// CHE COSA È VERO NEL TEMPO: l'espansione (a(t) esatto per la cosmologia di leggi.js), la crescita delle fluttuazioni
// (il campo a quel tempo è D(t) volte quello di oggi), lo spostamento e la velocità di ogni galassia (Zel'dovich),
// la galassia com'era (stelle, luce, colore dalla sua storia: galassie.js galassiaAlTempo; prima che l'alone raffreddasse
// gas non c'è). CHE COSA RESTA FERMO: gli assi delle galassie e la loro taglia (sono quelli di oggi); le fusioni non
// si vedono come due galassie che si avvicinano (i compagni non hanno una posizione sul toro).
export function statoCosmo(n, t = 0) {
  const C = cosmo(n), F = campoCosmo(n), tGa = ANNI_OGGI / 1e9 + t / GA /* (l'epoca è l'età dell'universo di leggi.js) */, T = F.alTempo(tGa), N = C.galassie.length;
  const pos = new Float64Array(3 * N), com = new Float64Array(3 * N), vel = new Float32Array(3 * N), esiste = new Uint8Array(N), massaStelle = new Float64Array(N), luce = new Float64Array(N), tinta = new Uint8Array(3 * N), raggio = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const g = galassiaAlTempo(C.galassie[i].forma, tGa);
    for (let d = 0; d < 3; d++) { const x = ((T.comoventi[i][d] % 1) + 1) % 1; com[3 * i + d] = x; pos[3 * i + d] = x * T.latoM; vel[3 * i + d] = T.velocita[i][d] * 1e3; tinta[3 * i + d] = g.tinta[d]; }
    esiste[i] = g.esiste && g.massaStelle > 0 ? 1 : 0; massaStelle[i] = g.massaStelle; luce[i] = g.luce * LSOLE; raggio[i] = C.galassie[i].forma.unitaM;
  }
  return { t, tGa, a: T.a, z: T.z, H: T.H, D: T.D, latoM: T.latoM, n: N, pos, comoventi: com, vel, esiste, massaStelle, luce, tinta, raggio, peso: F.peso, vere: F.vere, campo: F };
}

// =====================================================================================================
// I MOTI DI UNA REGIONE, in tre dimensioni (per cosmo.js motiDi): la velocità del pianeta attorno alla stella, della
// stella nella galassia, della galassia nel cosmo, tutte portate nel riferimento del sistema (km/s)
// =====================================================================================================
export function motiRegione(a) {
  const st = statoSistema(a.cosmo, a.galassia, a.stella, 0), p = st.pianeti[a.pianeta], pianeta = V.per(V.meno(p.vel, st.stella.vel), 1e-3);
  const AS = assiSistema(a.cosmo, a.galassia, a.stella), AG = assiGalassia(a.cosmo, a.galassia), in_ = (T, v) => [V.scalare(v, T[0]), V.scalare(v, T[1]), V.scalare(v, T[2])];
  const vS = motiGalassia(a.cosmo, a.galassia)[a.stella].stato(0).vel, vG = campoCosmo(a.cosmo).motiGalassie()[a.galassia];
  return { pianeta, stella: in_(AS, vS), galassia: in_(AS, in_(AG, vG)), stellaNellaGalassia: vS, galassiaNelCosmo: vG };
}

// =====================================================================================================
// LE SCENE per il motore (il formato è in src/tre/FORMATO.md): per ogni livello, a un tempo, ciò che c'è da disegnare.
// Posizioni in METRI, in doppia precisione, rispetto all'origine dichiarata in `riferimento`; raggi veri; luminosità in
// watt e magnitudine assoluta; colori (r, g, b 0…255) dalla temperatura. `nelGenitore` dice dove sta e come è girato
// questo riferimento in quello del livello sopra, allo stesso tempo.
// =====================================================================================================
const coloreDi = (T, stato) => (stato === 2 ? [225, 230, 255] : stato === 3 ? [150, 200, 255] : stato === 4 ? [20, 20, 30] : colorePerTemperatura(T));
export function scenaCosmo(n, t = 0, { griglia = true } = {}) {
  const S = statoCosmo(n, t), F = S.campo, N = S.n, mag = new Float32Array(N), id = Int32Array.from({ length: N }, (_, i) => i);
  for (let i = 0; i < N; i++) mag[i] = magnitudine(S.luce[i]);
  const g = griglia ? F.griglia() : null;
  return {
    livello: 'cosmo', via: { cosmo: n }, t, eta: S.tGa * 1e9, // (eta: anni dall'inizio)
    riferimento: { origine: 'un angolo del toro', assi: 'x, y: quelle della carta piatta; z: la profondità', unita: 'm', periodico: [S.latoM, S.latoM, S.latoM], fattoreDiScala: S.a, redshift: S.z, hubble: S.H },
    nelGenitore: null,
    punti: { n: N, id, pos: S.pos, vel: S.vel, raggio: S.raggio, luminosita: S.luce, magnitudine: mag, colore: S.tinta, esiste: S.esiste, peso: S.peso, cosa: 'galassie: un campione; ognuna ne rappresenta `peso` vere' },
    // la rete: la sovradensità lineare su una griglia che si richiude (delta[z·n² + y·n + x], al nodo (x, y, z)/n del toro),
    // a quel tempo (già moltiplicata per la crescita D); `in` la dà in un punto qualunque (coordinate comoventi 0…1)
    campi: { densita: g ? { n: g.n, delta: g.delta, crescita: S.D, lato: S.latoM, sigma: g.sigma * S.D, in: (x) => F.densita(x) * S.D } : { in: (x) => F.densita(x) * S.D, crescita: S.D }, velocita: { in: (x) => F.velocita(x), unita: 'km/s, oggi' } },
    figlio: (i) => ({ livello: 'galassia', via: { cosmo: n, galassia: i } }),
  };
}
export function scenaGalassia(n, gid, t = 0) {
  const S = statoGalassia(n, gid, t), Gx = galassia(n, gid), F = Gx.forma, N = S.n, colore = new Uint8Array(3 * N), mag = new Float32Array(N), id = Int32Array.from({ length: N }, (_, i) => i);
  for (let i = 0; i < N; i++) { const c = coloreDi(S.T[i], S.stato[i]); colore[3 * i] = c[0]; colore[3 * i + 1] = c[1]; colore[3 * i + 2] = c[2]; mag[i] = magnitudine(S.L[i]); }
  const C = statoCosmo(n, t), D = densitaGalassia(F), tG = t / GA, k = KPC, quando = galassiaAlTempo(F, C.tGa);
  // LA LUCE DEL CAMPIONE, CONSERVATA. Ogni stella del campione ne rappresenta `peso`; la somma L·peso è una stima della luce
  // della galassia, ma con 2500 stelle è dominata dalle poche massicce (una stella di 30 M☉ ne vale 10⁵ del Sole, e ne
  // rappresenta 10⁸): da galassia a galassia va da metà al doppio di quella vera. La luce vera è quella delle popolazioni
  // (galassiaAlTempo): la stima di rapporto (Cochran 1977, Sampling Techniques, cap. 6) dà alla luce rappresentata dal
  // campione il fattore normaLuce = luce vera / Σ L·peso, così le stelle da lontano (la parte discreta) e la luce diffusa (il
  // continuo) sommano per costruzione la luce della galassia; le stelle viste da vicino restano con la loro luce
  let somma = 0; for (let i = 0; i < N; i++) if (S.esiste[i]) somma += S.L[i];
  const normaLuce = somma > 0 && S.peso > 0 ? (quando.luce * LSOLE) / (somma * S.peso) : 1;
  return {
    livello: 'galassia', via: { cosmo: n, galassia: gid }, t, eta: C.tGa * 1e9,
    riferimento: { origine: 'il centro della galassia (il buco nero)', assi: 'x, y: il piano della galassia (le stesse della mappa); z: la normale', unita: 'm', raggio: F.unitaM },
    nelGenitore: { livello: 'cosmo', pos: [C.pos[3 * gid], C.pos[3 * gid + 1], C.pos[3 * gid + 2]], vel: [C.vel[3 * gid], C.vel[3 * gid + 1], C.vel[3 * gid + 2]], assi: assiGalassia(n, gid) },
    // da lontano: un punto solo, con la luce di tutte le sue stelle
    daLontano: { luminosita: quando.luce * LSOLE, magnitudine: magnitudine(quando.luce * LSOLE), colore: quando.tinta, raggio: F.unitaM, massaStelle: quando.massaStelle },
    punti: { n: N, id, pos: S.pos, vel: S.vel, raggio: S.raggio, luminosita: S.L, magnitudine: mag, colore, esiste: S.esiste, stato: S.stato, stati: S.stati, massa: S.massa, peso: S.peso, normaLuce, cosa: 'stelle: un campione; ognuna ne rappresenta `peso` vere (le ultime supernove: se stesse)' },
    // la forma continua, per la luce diffusa (kg/m³ in un punto; le colonne anello per anello in kg/m²)
    campi: {
      densita: (x, y, z) => { const d = D.in3d(Math.hypot(x, y) / k, z / k, Math.atan2(y, x), tG), u = MSOLE / k ** 3; return { stelle: d.stelle * u, gas: d.gas * u, polvere: d.polvere * u }; },
      anelli: { r: Array.from(D.colonne.r, (v) => v * k), bordo: Array.from(D.colonne.bordo, (v) => v * k), stelle: Array.from(D.colonne.stelle, (v) => (v * MSOLE) / k ** 2), gas: Array.from(D.colonne.gas, (v) => (v * MSOLE) / k ** 2), Z: Array.from(D.colonne.Z), spessore: Array.from(D.colonne.spessore, (v) => v * k), spessoreGas: D.colonne.spessoreGas * k },
      sferoide: { massaKg: D.sferoide.massa * MSOLE, scala: D.sferoide.scala * k, schiacciata: D.sferoide.schiacciata },
      bracci: { numero: D.bracci.numero, contrasto: D.bracci.contrasto, contrastoGas: D.bracci.contrastoGas, fase: (r) => D.bracci.fase(r / k, tG), velocitaAngolare: (D.bracci.verso * D.bracci.velocita * 1e3) / k /* rad/s */, corotazione: D.bracci.corotazione * k },
      barra: F.barra ? { raggio: F.barra.raggio * k, angolo: F.barra.angolo + (D.bracci.verso * D.bracci.velocita * 1e3 * t) / k } : null,
      rotazione: (r) => curvaRotazione(F, Math.max(r / k, 1e-3)) * 1e3, // m/s al raggio r (m)
    },
    buco: { pos: [0, 0, 0], massaKg: Gx.buco.M * MSOLE, raggio: (2 * G * Gx.buco.M * MSOLE) / COSTANTI.c ** 2, potenzaGetto: Gx.buco.potenzaW },
    // ciò che riempie lo spazio tra le stelle in un pezzo della galassia (vuoto.js: nebulose, nubi oscure, resti, polvere), a questo tempo
    vuoto: (regione, opz) => scenaVuoto({ forma: F, caso: sorgente(`cosmo ${cosmoBase(n)}/galassia ${gid}`, ramiCosmo(n)), catalogo: Gx, regione, ...opz }, t),
    figlio: (i) => ({ livello: 'sistema', via: { cosmo: n, galassia: gid, stella: i } }),
  };
}
// L'ASSETTO di un corpo che gira: la matrice 3×3 (per righe, 9 numeri) che porta dagli assi DEL CORPO a quelli del
// riferimento. Gli assi del corpo, come li vuole il motore (src/tre/nucleo.js): x esce dall'equatore al meridiano 0,
// y è il polo nord (l'asse di rotazione), z = x × y (esce dall'equatore a 90° OVEST): un punto a longitudine λ (verso
// est) e latitudine φ sta in (cos φ cos λ, sin φ, −cos φ sin λ).
export function assettoDa(terna, angolo, o = new Array(9)) {
  const [e1, e2, polo] = terna, c = Math.cos(angolo), s = Math.sin(angolo);
  for (let d = 0; d < 3; d++) { o[3 * d] = c * e1[d] + s * e2[d]; o[3 * d + 1] = polo[d]; o[3 * d + 2] = s * e1[d] - c * e2[d]; }
  return o;
}
// una luna agganciata guarda il pianeta sempre con la stessa faccia (il meridiano 0), e il suo polo è la normale
// all'orbita; di una non agganciata il giro non lo dà nessuna legge qui: null (dichiarato)
function assettoLuna(l) {
  if (!l.bloccata) return null;
  const W = l.elementi.assi[2], m = V.versore(V.per(l.dalPianeta, -1)), z = V.croce(m, W), o = new Array(9);
  for (let d = 0; d < 3; d++) { o[3 * d] = m[d]; o[3 * d + 1] = W[d]; o[3 * d + 2] = z[d]; }
  return o;
}
export function scenaSistema(n, gid, sid, t = 0) {
  const S = statoSistema(n, gid, sid, t), E = elementiSistema(n, gid, sid), Sis = E.Sis, G = statoGalassia(n, gid, t, { stati: false });
  const corpi = [];
  if (S.stella) corpi.push({ cosa: 'stella', id: sid, pos: S.stella.pos, vel: S.stella.vel, raggio: S.stella.raggioM, massaKg: S.stella.massaKg, luminosita: S.stella.L, magnitudine: S.stella.magnitudine, colore: coloreDi(S.stella.T, STATI.indexOf(S.stella.stato)), temperatura: S.stella.T, stato: S.stella.stato, asse: S.stella.asse, angolo: S.stella.angolo, assetto: assettoDa(S.stella.terna, S.stella.angolo) });
  for (const p of S.pianeti) {
    const P = Sis.pianeti[p.id];
    corpi.push({ cosa: 'pianeta', id: p.id, pos: p.pos, vel: p.vel, raggio: p.raggioM, massaKg: p.massaKg, luminosita: 0, colore: P.colore, tipo: P.tipo, formato: p.formato, asse: p.asse, angolo: p.angolo, assetto: assettoDa(p.terna, p.angolo), giorno: p.giorno, schiacciamento: P.schiacciamento || 0, anello: P.anello ? { interno: P.anello.interno * P.raggioM, esterno: P.anello.esterno * P.raggioM } : null, orbita: orbitaDi(p.elementi, 'stella') });
    for (const l of p.lune) corpi.push({ cosa: 'luna', id: l.id, pianeta: p.id, pos: l.pos, vel: l.vel, raggio: l.raggioM, massaKg: l.massaKg, luminosita: 0, colore: [170, 170, 165], bloccata: l.bloccata, assetto: assettoLuna(l), orbita: orbitaDi(l.elementi, `pianeta ${p.id}`) });
  }
  return {
    livello: 'sistema', via: { cosmo: n, galassia: gid, stella: sid }, t, eta: S.eta, fase: S.fase,
    riferimento: { origine: 'il baricentro del sistema', assi: 'x, y: il piano medio del sistema (le stesse della mappa); z: la normale', unita: 'm', raggio: LATO_SISTEMA_M },
    nelGenitore: { livello: 'galassia', pos: [G.pos[3 * sid], G.pos[3 * sid + 1], G.pos[3 * sid + 2]], vel: [G.vel[3 * sid], G.vel[3 * sid + 1], G.vel[3 * sid + 2]], assi: assiSistema(n, gid, sid) },
    corpi, disco: S.disco ? { interno: S.disco.rIn * UA, esterno: S.disco.rOut * UA, neve: S.disco.neve * UA, massaKg: S.disco.massaKg * S.disco.gasRimasto } : null,
    // i corpi minori e la polvere del sistema (vuoto.js: fasce, comete, nube esterna), a questo tempo; le posizioni sono
    // rispetto alla stella (sommare quella della stella). `attorno`: stelle e gas della galassia nel punto della stella (kg/m³)
    vuoto: () => { const k = KPC, x = G.pos[3 * sid], y = G.pos[3 * sid + 1], z = G.pos[3 * sid + 2], d = densitaGalassia(galassia(n, gid).forma).in3d(Math.hypot(x, y) / k, z / k, Math.atan2(y, x), t / GA);
      return scenaVuoto({ sistema: Sis, caso: sorgente(`cosmo ${cosmoBase(n)}/galassia ${gid}/stella ${sid}`, ramiCosmo(n)), attorno: ((d.stelle + d.gas) * MSOLE) / k ** 3 }, t); },
    figlio: (i) => ({ livello: 'pianeta', via: { cosmo: n, galassia: gid, stella: sid, pianeta: i } }),
  };
}
// un'orbita per disegnarla: i suoi assi (verso il pericentro, a 90° nel verso del moto, la normale), semiasse, eccentricità,
// periodo; un punto dell'orbita: centro + a·(cos E − e)·P + a·√(1−e²)·sin E·Q, con E da 0 a 2π
const orbitaDi = (el, attorno) => ({ attorno, a: el.a, e: el.e, inclinazione: el.i, assi: el.assi, periodo: periodo(el) });

// I CORPI DI UN SISTEMA COME LI VUOLE IL MOTORE (src/tre/nucleo.js: N.corpo({ nome, genitore, raggio, posizione(t, out),
// assetto(t, out) })): la stella (rispetto al baricentro), i pianeti (rispetto alla stella), le lune (rispetto al loro
// pianeta), in metri, negli assi del sistema (inerziali: non girano). `genitore` è l'indice nella lista (−1: nessuno).
// Il tempo è lo stesso di tutto questo modulo: secondi da oggi (N.tempo.t = 0 è il mondo di cosmo.js).
// Lo stato a un tempo si calcola una volta sola per tutti i corpi (~0,1 ms).
export function corpiSistema(n, gid, sid) {
  let tUlt = NaN, S = null; const a = (t) => { if (t !== tUlt) { S = statoSistema(n, gid, sid, t); tUlt = t; } return S; };
  const metti = (o, v) => { o[0] = v[0]; o[1] = v[1]; o[2] = v[2]; return o; }, meno = (o, x, y) => { o[0] = x[0] - y[0]; o[1] = x[1] - y[1]; o[2] = x[2] - y[2]; return o; };
  const S0 = a(0), E = elementiSistema(n, gid, sid), corpi = [];
  if (!S0.stella) return corpi;
  corpi.push({ nome: 'stella', cosa: 'stella', id: sid, genitore: -1, raggio: S0.stella.raggioM, luminosita: S0.stella.L, colore: coloreDi(S0.stella.T, STATI.indexOf(S0.stella.stato)),
    posizione: (t, o = [0, 0, 0]) => metti(o, a(t).stella.pos), assetto: (t, o) => assettoDa(a(t).stella.terna, a(t).stella.angolo, o) });
  S0.pianeti.forEach((p, i) => {
    const io = corpi.length;
    corpi.push({ nome: `pianeta ${p.id}`, cosa: 'pianeta', id: p.id, genitore: 0, raggio: p.raggioM, colore: E.Sis.pianeti[p.id].colore,
      posizione: (t, o = [0, 0, 0]) => { const s = a(t); return meno(o, s.pianeti[i].pos, s.stella.pos); }, assetto: (t, o) => { const q = a(t).pianeti[i]; return assettoDa(q.terna, q.angolo, o); } });
    p.lune.forEach((l, j) => corpi.push({ nome: `pianeta ${p.id}/luna ${l.id}`, cosa: 'luna', id: l.id, pianeta: p.id, genitore: io, raggio: l.raggioM, colore: [170, 170, 165],
      posizione: (t, o = [0, 0, 0]) => { const q = a(t).pianeti[i]; return meno(o, q.lune[j].pos, q.pos); }, assetto: l.bloccata ? (t, o = new Array(9)) => metti9(o, assettoLuna(a(t).pianeti[i].lune[j])) : null }));
  });
  return corpi;
}
const metti9 = (o, m) => { for (let k = 0; k < 9; k++) o[k] = m[k]; return o; };
