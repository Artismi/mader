// lingua.js — il linguaggio dell'indirizzo come oggetto del programma (la specifica sta in LINGUA.md).
//
// Un indirizzo nomina un CILINDRO: tutti i mondi che cominciano con quel percorso, a quel tempo, in quei rami. Qui ci
// sono la sua forma scritta (una sola: quella di intreccio.js), la misura dei cilindri (quanto pesa un luogo, livello
// per livello, e che cosa si conta), la discesa a caso con quella misura dalla fonte unica del caso (eventi.js), e
// l'impronta del contenuto di un pianeta a una grana (regola 13).
//
//   leggi(testo) / scrivi(a)     la forma canonica: «cosmo 1/galassia 3/stella 53/pianeta 0/punto 12.5,-30/scala 10000
//                                @13797000000#{"disco/3/53":1}» (intreccio.js; cosmo.js scrive i rami come «1#{…}»:
//                                daVia / viaDi passano da una forma all'altra senza una terza)
//   peso(a)                      −log₂ P del cilindro, in bit, con le parti livello per livello
//   puntoACaso(seme)             la discesa dell'albero con quei pesi: deterministica dal seme
//   specialita(a)                i bit di a contro quelli tipici (la mediana di N punti a caso)
//   impronta(pianeta, grana)     la forma canonica delle grandezze del pianeta a quella grana, e il suo hash a 128 bit
//   fondi(indirizzi, grana)      le fusioni (C11): i cilindri raggruppati per impronta, con i pesi sommati
//   stellaVera(a), galassiaVera(a)  la stella (la galassia) vera k tra quelle che una del campione rappresenta
//   frazione(predicato)          la frazione, per la misura, dei luoghi che hanno un contenuto (C13, via evolutiva)
// I pesi degli esiti degli eventi (C4) e il rapporto di verosimiglianza di un mondo con i suoi rami stanno in misura.js.
//
// Leggi: Kraft (Σ 2^−ℓ(n) = 1 per un codice prefisso completo); HEALPix «nested» (Górski et al. 2005: 12·4^k pixel di
// area uguale). Dati: nessuno. PARAMETRI LIBERI (regola 2), tutti in OPZIONI e scritti nel risultato di peso():
//   codice      il peso dell'indice del cosmo: Elias γ (predefinito) o δ. Nessuna legge lo dà.
//   galassie    che cosa si conta tra le galassie di un cosmo: 'massa' in stelle (predefinito), 'stelle' (quante sono:
//               3 s per cosmo), 'uniforme'
//   pianeti     che cosa si conta tra i pianeti di un sistema: 'area' (predefinito: la superficie del pianeta e delle sue
//               lune; con il luogo uniforme in area, un punto è uniforme su tutte le superfici del sistema), 'massa',
//               'uniforme'
//   lune        se i punti stanno anche sulle lune (predefinito sì); corpi: 'area' (predefinito) o 'uniforme'
//   scala       il lato del luogo, in metri (predefinito 10 km), se l'indirizzo non lo dice: fissa l'ordine HEALPix
//   tempo       'eta' (predefinito: uniforme sulla vita della stella del luogo; senza stella, sull'età del cosmo) o
//               'adesso' (il tempo non si estrae: è l'oggi di chi guarda, peso 1, e ogni altro istante pesa 0)
//   granaTempo  la cella di tempo, in anni (predefinito 1)
//   granaMassa  la classe di massa di una stella, in dex (predefinito 0,1): una stella vera ha la massa nella classe di
//               quella del campione che la rappresenta
//   vere        se puntoACaso scende anche alle galassie e alle stelle vere (predefinito sì: la discesa è uniforme sulle
//               stelle vere, non sul campione); non cambia la misura, solo fin dove si estrae
//   grana       (misura.js) la cella di un esito continuo, 2^−grana nella variabile della legge (predefinito 20)
//   leggi, registri  da dove vengono i pesi dei rami: le leggi degli eventi dei rami (una Map evento → { legge,
//               parametri }), o i due cammini annotati { base, mondo } (misura.js conMisura). Senza: tiro uniforme, 1
// NON TORNA / MANCA (stampato da test_lingua): i tiri letti senza legge (quasi tutti, oggi: c(…) nudo, confrontato poi con
// una probabilità nel consumatore) pesano come uniformi, quindi i loro rami hanno rapporto 1; registro con le leggi:
// la patch di eventi.js (non ancora applicata: conMisura ne fa le veci). Una stella vera ha come sistema di pianeti
// quello della stella del campione che la rappresenta (il modello ne calcola uno per stella del campione), e il suo posto
// non è calcolato; una galassia vera è quella del campione in un altro posto del toro (gli aloni non sono correlati). La
// misura dei punti su un pianeta è condizionata ad avere pianeti, e la costante di quel condizionamento (quante stelle
// hanno pianeti) non si calcola (servirebbe un sistema per stella): la si stima nella prova.
import { indirizzo, scrivi as scriviIntreccio, leggi as leggiIntreccio } from './intreccio.js';
import { sorgente } from './eventi.js';
import { cosmo, galassia, sistemaPigro, cosmoBase, ramiCosmo, cosmoCon, REGIONI, TORO_M } from './cosmo.js';
import { ANNI_OGGI } from './spazio3d.js';
import { COSMOLOGIA, dentro as GALASSIE } from './galassie.js';
import { massaNascita, KROUPA_2001, MPC } from './leggi.js';
import * as ST from './stelle.js';
import { rapporto, pesoDegliEventi } from './misura.js';

export const OPZIONI = Object.freeze({ codice: 'gamma', galassie: 'massa', pianeti: 'area', lune: true, corpi: 'area', scala: 1e4, tempo: 'eta', granaTempo: 1, granaMassa: 0.1, vere: true });
const opzioniDi = (o) => ({ ...OPZIONI, ...(o || {}) });
export const ORDINE_MASSIMO = 24; // HEALPix: 12·4²⁴ pixel stanno ancora negli interi esatti di un double (2⁵³)

// ---------- LA GRAMMATICA
// percorso := nome ('/' nome)* ; nome := ogni testo senza «/», «@», «#». Il luogo è il prefisso fatto di questi nomi, in
// quest'ordine: cosmo N (N ≥ 1) / galassia g [/ vera k] / stella s [/ vera k] / pianeta p [/ luna l] [/ (punto lon,lat |
// regione r)] [/ scala L]. «vera k» (facoltativo) è la galassia, o la stella, vera numero k tra le N che quella del
// campione rappresenta (0 ≤ k < N). Quello che segue (o un nome che non è di questi) è il resto: le parti di un luogo che
// la misura non conta («buco», «disco/embrione 12/incontro con 13», gli indirizzi degli eventi). Un indirizzo che non
// comincia da «cosmo N» è un indirizzo d'evento: è nella lingua, ma non è un luogo.
const LIVELLI = ['cosmo', 'galassia', 'vera', 'stella', 'pianeta', 'luna', 'regione', 'punto', 'scala'];
const num = (x) => String(Number(x)); // la forma canonica di un numero: quella di String (andata e ritorno esatte)
const intero = (v, min) => /^(0|[1-9]\d*)$/.test(v) && Number(v) >= min && Number.isSafeInteger(Number(v));
// «vera» dopo la galassia è veraGalassia, dopo la stella veraStella (le chiavi di analizza)
const TAG = (liv, prima) => (liv !== 'vera' ? liv : prima === 'galassia' ? 'veraGalassia' : prima === 'stella' ? 'veraStella' : 'vera');
const NOME = (tag) => (tag.startsWith('vera') ? 'vera' : tag);
const DOPO = { cosmo: ['galassia'], galassia: ['veraGalassia', 'stella'], veraGalassia: ['stella'], stella: ['veraStella', 'pianeta'], veraStella: ['pianeta'], pianeta: ['luna', 'punto', 'regione', 'scala'], luna: ['punto', 'regione', 'scala'], punto: ['scala'], regione: ['scala'], scala: [] };

// dall'indirizzo (di intreccio.js) alle sue parti: { cosmo, galassia, veraGalassia, stella, veraStella, pianeta, luna, regione, punto, scala, resto, tempo, rami }
export function analizza(a0) {
  const a = comeIndirizzo(a0), d = { cosmo: null, galassia: null, veraGalassia: null, stella: null, veraStella: null, pianeta: null, luna: null, regione: null, punto: null, scala: null, resto: [], tempo: a.tempo, rami: { ...a.rami } };
  let atteso = ['cosmo'], i = 0, prima = null;
  for (; i < a.percorso.length; i++) {
    const nome = a.percorso[i], m = /^(\S+) (.+)$/.exec(nome), liv = m && LIVELLI.includes(m[1]) ? TAG(m[1], prima) : null;
    if (!liv || !atteso.includes(liv)) break;
    const v = m[2];
    if (liv === 'cosmo') { if (!intero(v, 1)) throw new Error(`«${nome}»: il cosmo è un intero da 1 in su, scritto senza zeri davanti`); d.cosmo = Number(v); }
    else if (liv === 'punto') {
      const p = v.split(','), lon = Number(p[0]), lat = Number(p[1]);
      if (p.length !== 2 || !Number.isFinite(lon) || !Number.isFinite(lat) || lat < -90 || lat > 90 || lon <= -180 || lon > 180 || `${num(lon)},${num(lat)}` !== v) throw new Error(`«${nome}»: il punto è «punto lon,lat» in gradi (−180 < lon ≤ 180, −90 ≤ lat ≤ 90), con i numeri nella forma di String(Number)`);
      d.punto = [lon, lat];
    } else if (liv === 'scala') { if (!(Number(v) > 0) || !Number.isFinite(Number(v)) || num(v) !== v) throw new Error(`«${nome}»: la scala è un lato in metri, > 0, nella forma di String(Number)`); d.scala = Number(v); }
    else { if (!intero(v, 0)) throw new Error(`«${nome}»: ${NOME(liv)} è un intero da 0 in su, scritto senza zeri davanti`); d[liv] = Number(v); }
    atteso = DOPO[liv]; prima = liv;
  }
  // un nome di livello fuori posto (es. «cosmo 1/stella 5»: manca la galassia; una luna dopo il punto) non è un resto: è un errore
  if (d.cosmo != null && i < a.percorso.length) { const m = /^(\S+) /.exec(a.percorso[i]); if (m && LIVELLI.includes(m[1])) throw new Error(`«${a.percorso.slice(0, i + 1).join('/')}»: dopo «${a.percorso[i - 1]}» può venire ${atteso.length ? [...new Set(atteso.map(NOME))].join(', ') : 'solo il resto'}, non ${m[1]}`); }
  if (d.cosmo == null) i = 0;
  d.resto = a.percorso.slice(i);
  return d;
}
// le parti → l'indirizzo (l'inverso di analizza)
export function componi(d) {
  const p = [];
  for (const l of ['cosmo', 'galassia', 'veraGalassia', 'stella', 'veraStella', 'pianeta', 'luna', 'regione']) if (d[l] != null) p.push(`${NOME(l)} ${d[l]}`);
  if (d.punto) p.push(`punto ${num(d.punto[0])},${num(d.punto[1])}`);
  if (d.scala != null) p.push(`scala ${num(d.scala)}`);
  p.push(...(d.resto || []));
  return indirizzo(p, { tempo: d.tempo ?? null, rami: d.rami || null });
}
const comeIndirizzo = (a) => (typeof a === 'string' ? leggi(a) : a && a.percorso ? a : a && a.cosmo != null ? daVia(a) : (() => { throw new Error('un indirizzo è un testo, un indirizzo di intreccio.js o una via { cosmo, galassia, … }'); })());

// LA FORMA SCRITTA. Una sola, quella di intreccio.js: «percorso@tempo#{rami}», con i rami in ordine di chiave e senza
// gli esiti 0. leggi è severa: un testo che non è già nella forma canonica (un numero scritto in un altro modo, i rami
// in un altro ordine) non si legge, perché per la fonte del caso due testi diversi sono due luoghi diversi.
export function leggi(testo, { severo = true } = {}) {
  if (typeof testo !== 'string' || !testo.length) throw new Error('un indirizzo scritto è un testo non vuoto');
  let a; try { a = leggiIntreccio(testo); } catch (e) { throw new Error(`«${testo}» non si legge: ${e.message} (un nome non può contenere «#», «@» o «/»)`); }
  if (a.percorso.some((n) => !n.length)) throw new Error(`«${testo}»: un nome vuoto`);
  if (a.tempo != null && !Number.isFinite(a.tempo)) throw new Error(`«${testo}»: il tempo è un numero di anni dall'inizio del cosmo`);
  for (const [k, v] of Object.entries(a.rami)) if (!Number.isSafeInteger(v)) throw new Error(`«${testo}»: l'esito dell'evento «${k}» è un intero`);
  analizza(a); // (la grammatica del luogo)
  const c = scriviIntreccio(a);
  if (severo && c !== testo) throw new Error(`«${testo}» non è nella forma canonica: «${c}»`);
  return a;
}
export function scrivi(a0) { const a = comeIndirizzo(a0); analizza(a); return scriviIntreccio(a); }
export const canonico = (testo) => scrivi(leggi(testo, { severo: false }));

// DA E VERSO LA «VIA» di cosmo.js e della mappa: { cosmo, galassia, stella, pianeta, luna?, regione? }, con i rami del
// cosmo scritti nel suo numero («1#{…}», cosmo.js cosmoRamo). I rami passano dal numero all'indirizzo e ritorno.
export function daVia(via, { tempo = null, rami = null, punto = null, scala = null, resto = [] } = {}) {
  const r = { ...ramiCosmo(via.cosmo), ...(rami || {}) };
  return componi({ cosmo: cosmoBase(via.cosmo), galassia: via.galassia, stella: via.stella, pianeta: via.pianeta, luna: via.luna, regione: via.regione, punto, scala, resto, tempo, rami: r });
}
// (la via non conosce le galassie e le stelle vere: hanno quella del campione che le rappresenta)
export function viaDi(a0) {
  const d = analizza(a0), v = {}; if (d.cosmo == null) return v;
  v.cosmo = Object.keys(d.rami).length ? cosmoCon(d.cosmo, d.rami) : d.cosmo;
  for (const l of ['galassia', 'stella', 'pianeta', 'luna', 'regione']) if (d[l] != null) v[l] = d[l];
  return v;
}

// ---------- HEALPix «nested» (Górski et al. 2005; l'algoritmo è quello di healpix_base): z = cos θ, φ in [0, 2π)
const JRLL = [2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4], JPLL = [1, 3, 5, 7, 0, 2, 4, 6, 1, 3, 5, 7];
function xy2pix(ix, iy, k) { let p = 0, b = 1; for (let i = 0; i < k; i++, b *= 4) p += ((ix >> i) & 1) * b + ((iy >> i) & 1) * 2 * b; return p; }
function pix2xy(p, k) { let ix = 0, iy = 0; for (let i = 0; i < k; i++) { const d = p % 4; p = Math.floor(p / 4); ix |= (d & 1) << i; iy |= (d >> 1) << i; } return [ix, iy]; }
export function ang2pixNest(k, z, phi) {
  const ns = 2 ** k, za = Math.abs(z); let tt = (phi / (Math.PI / 2)) % 4; if (tt < 0) tt += 4;
  let face, ix, iy;
  if (za <= 2 / 3) {
    const t1 = ns * (0.5 + tt), t2 = ns * (z * 0.75), jp = Math.floor(t1 - t2), jm = Math.floor(t1 + t2), ifp = Math.floor(jp / ns), ifm = Math.floor(jm / ns);
    face = ifp === ifm ? (ifp | 4) : ifp < ifm ? ifp : ifm + 8; ix = jm & (ns - 1); iy = ns - (jp & (ns - 1)) - 1;
  } else {
    const ntt = Math.min(3, Math.floor(tt)), tp = tt - ntt, tmp = ns * Math.sqrt(3 * (1 - za));
    const jp = Math.min(ns - 1, Math.floor(tp * tmp)), jm = Math.min(ns - 1, Math.floor((1 - tp) * tmp));
    if (z >= 0) { face = ntt; ix = ns - jm - 1; iy = ns - jp - 1; } else { face = ntt + 8; ix = jp; iy = jm; }
  }
  return face * 4 ** k + xy2pix(ix, iy, k);
}
// il centro del pixel: [z, φ]
export function pix2angNest(k, pix) {
  const ns = 2 ** k, npf = 4 ** k, face = Math.floor(pix / npf), [ix, iy] = pix2xy(pix - face * npf, k), jr = JRLL[face] * ns - ix - iy - 1;
  let nr, z;
  if (jr < ns) { nr = jr; z = 1 - (nr * nr) / (3 * ns * ns); } else if (jr > 3 * ns) { nr = 4 * ns - jr; z = (nr * nr) / (3 * ns * ns) - 1; } else { nr = ns; z = ((2 * ns - jr) * 2) / (3 * ns); }
  let t = JPLL[face] * nr + ix - iy; if (t < 0) t += 8 * nr;
  return [z, (Math.PI / 4) * (t / nr)];
}
// dal punto (gradi) al pixel e ritorno; il punto si scrive con le cifre che bastano a ritrovare lo stesso pixel
const GR = 180 / Math.PI;
export const pixelDi = (k, lon, lat) => ang2pixNest(k, Math.sin(lat / GR), ((lon / GR) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI));
export function puntoDelPixel(k, pix) {
  const [z, phi] = pix2angNest(k, pix); let lon = phi * GR; if (lon > 180) lon -= 360; const lat = Math.asin(Math.max(-1, Math.min(1, z))) * GR;
  for (let d = Math.max(0, Math.ceil(Math.log10((8 * 2 ** k) / 58.6))); d <= 17; d++) {
    const L = Number(lon.toFixed(d)) || 0, B = Number(lat.toFixed(d)) || 0, Lc = L <= -180 ? L + 360 : L;
    if (pixelDi(k, Lc, B) === pix) return [Lc, B];
  }
  return [lon, lat];
}
// l'ordine HEALPix di un luogo di lato L su un corpo di raggio R: il primo il cui pixel (lato R·√(π/3)/2^k) non supera L
export const ordineDi = (R, L) => Math.max(0, Math.min(ORDINE_MASSIMO, Math.ceil(Math.log2((R * Math.sqrt(Math.PI / 3)) / L))));

// ---------- L'INDICE DEL COSMO: un codice prefisso completo (Kraft: Σ 2^−ℓ = 1). LIBERO.
const lg = (n) => { let k = 0; while (n >= 2 ** (k + 1)) k++; return k; }; // ⌊log₂ n⌋, esatto
export const lunghezzaGamma = (n) => 2 * lg(n) + 1;
export const lunghezzaDelta = (n) => { const L = lg(n); return L + 2 * lg(L + 1) + 1; };
export const lunghezzaCodice = (n, codice = 'gamma') => (codice === 'delta' ? lunghezzaDelta(n) : lunghezzaGamma(n));
// un intero dal codice: il gruppo k = ⌊log₂ n⌋ ha peso 2^−(k+1) (γ) o 2^−ℓγ(k+1) (δ), poi uniforme nel gruppo. Solo
// raddoppi e parti intere (esatti). Il cosmo deve stare negli interi esatti (n < 2⁵³): con δ la coda oltre (circa il 2%)
// si riestrae, e lo si dice (fuori).
function gruppoGamma(u) { let k = 0; while (u < 0.5 && k < 52) { u *= 2; k++; } return k; }
function interoDalCodice(serie, codice) {
  for (let t = 0; t < 64; t++) {
    const u = serie(3 * t), v = serie(3 * t + 1);
    let k = gruppoGamma(u);
    if (codice === 'delta') { const m = 2 ** k + Math.floor(serie(3 * t + 2) * 2 ** k); if (m - 1 > 52) continue; k = m - 1; }
    return { n: 2 ** k + Math.floor(v * 2 ** k), tentativi: t + 1 };
  }
  return { n: 1, tentativi: 64 };
}

// ---------- I NUCLEI PER LIVELLO (O5): per ogni livello, i figli con il loro peso e che cosa si conta
const memo = new Map(); const ricorda = (k, f) => { if (!memo.has(k)) { if (memo.size > 256) memo.delete(memo.keys().next().value); memo.set(k, f()); } return memo.get(k); };
const cosmoDi = (d) => (Object.keys(d.rami).length ? cosmoCon(d.cosmo, d.rami) : d.cosmo);
const somma = (v) => v.reduce((s, x) => s + x, 0);
const normalizza = (pesi, nomi) => { const W = somma(pesi); return pesi.map((w, i) => ({ nome: nomi(i), p: W > 0 ? w / W : 0, w })); };

const NUCLEI = {
  galassia(d, O) {
    const nc = cosmoDi(d), C = cosmo(nc);
    const voci = ricorda(`g|${nc}|${O.galassie}`, () => normalizza(C.galassie.map((G, i) => (O.galassie === 'uniforme' ? 1 : O.galassie === 'stelle' ? galassia(nc, i).stelleVere : G.forma.massaStelle)), (i) => i));
    return { voci, conta: O.galassie === 'uniforme' ? 'le galassie del campione del cosmo, una uguale all\'altra' : O.galassie === 'stelle' ? 'le stelle vere di ogni galassia (galassie.js stelleVere)' : 'la massa in stelle di ogni galassia (galassie.js massaStelle)' };
  },
  stella(d) {
    const nc = cosmoDi(d), Gx = galassia(nc, d.galassia);
    return { voci: ricorda(`s|${nc}|${d.galassia}`, () => normalizza(Gx.stelle.map((s) => s.peso), (i) => i)), conta: `le stelle vere che ogni stella del campione rappresenta (galassie.js peso: ~${Math.round(Gx.pesoCampione).toExponential(1)}; le ultime supernove 1)`, nota: 'condizionata ad avere pianeti se si scende più giù: la costante (quante stelle hanno pianeti) non è calcolata' };
  },
  pianeta(d, O) {
    const nc = cosmoDi(d), S = sistemaPigro(nc, d.galassia, d.stella), lune = (P) => (O.lune ? P.lune || [] : []);
    const w = (P) => (O.pianeti === 'uniforme' ? 1 : O.pianeti === 'massa' ? P.massaKg + somma(lune(P).map((l) => l.massaKg || 0)) : P.raggioM ** 2 + somma(lune(P).map((l) => (l.raggioM || 0) ** 2)));
    return { voci: ricorda(`p|${nc}|${d.galassia}|${d.stella}|${O.pianeti}|${O.lune}`, () => normalizza(S.pianeti.map(w), (i) => i)), conta: O.pianeti === 'uniforme' ? 'i pianeti del sistema, uno uguale all\'altro' : O.pianeti === 'massa' ? `la massa di ogni pianeta${O.lune ? ' con le sue lune' : ''}` : `la superficie di ogni pianeta${O.lune ? ' e delle sue lune' : ''} (4πR²)`, S };
  },
  // il corpo dentro il sistema di un pianeta: il pianeta stesso (nome null) o una sua luna
  corpo(d, O) {
    const P = sistemaPigro(cosmoDi(d), d.galassia, d.stella).pianeti[d.pianeta], L = O.lune ? P.lune || [] : [];
    const w = (c) => (O.corpi === 'uniforme' ? 1 : (c.raggioM || 0) ** 2);
    const voci = normalizza([w(P), ...L.map(w)], (i) => (i === 0 ? null : L[i - 1].id));
    return { voci, conta: O.lune ? (O.corpi === 'uniforme' ? 'il pianeta e le sue lune, uno uguale all\'altro' : 'la superficie del pianeta e di ogni luna') : 'solo il pianeta (lune escluse)', P, L };
  },
};
// ---------- DAL CAMPIONE AL VERO. Una galassia del campione del cosmo ne rappresenta N vere, una stella del campione di una
// galassia ne rappresenta N vere (il suo `peso`). «vera k» sceglie la k-esima, uniforme: si contano le galassie e le stelle
// per NUMERO (una vera vale l'altra); la funzione di massa iniziale non entra nella scelta ma nella massa di ognuna
// (stellaVera). N è un intero: max(1, round(peso)); l'arrotondamento sposta il peso di una stella vera di < 1/(2N) (2·10⁻⁹).
// Le galassie vere: gli aloni del toro pesanti almeno quanto il più piccolo del campione (Press–Schechter: COSMOLOGIA.aloni
// di galassie.js), divisi tra le galassie del campione, ognuna lo stesso numero. È la convenzione di cosmo3d.js (`vere`,
// `peso`), qui senza costruire il campo (la prova le confronta).
export function galassieVere(n) {
  return ricorda(`gv|${n}`, () => { const C = cosmo(n), ng = C.galassie.length, mMin = Math.min(...C.galassie.map((G) => G.forma.alone.massa)), vere = COSMOLOGIA.aloni(mMin) * (TORO_M / MPC) ** 3;
    return { vere, perGalassia: Math.max(1, Math.round(vere / ng)), massaMinima: mMin, campione: ng }; });
}
export const stelleVereDi = (S) => Math.max(1, Math.round(S.peso));
NUCLEI.veraGalassia = (d) => { const V = galassieVere(cosmoDi(d)); return { N: V.perGalassia, conta: `una delle ${V.perGalassia} galassie vere che ogni galassia del campione rappresenta (gli aloni del toro da ${V.massaMinima.toExponential(1)} M☉ in su, Press–Schechter: ${V.vere.toExponential(2)} in ${V.campione} galassie), una uguale all'altra` }; };
NUCLEI.veraStella = (d) => { const S = galassia(cosmoDi(d), d.galassia).stelle[d.stella]; if (!S) return { N: 0, conta: 'la stella non c\'è' }; const N = stelleVereDi(S); return { N, conta: N === 1 ? 'una stella vera (le ultime supernove): rappresenta solo se stessa' : `una delle ${N} stelle vere che la stella del campione rappresenta (galassie.js peso), una uguale all'altra: contate per numero` }; };
const raggioDelCorpo = (d, O) => { const { P } = NUCLEI.corpo(d, O); if (d.luna == null) return P.raggioM; const l = (P.lune || []).find((x) => x.id === d.luna); return l ? l.raggioM : NaN; };
// (l'età della stella dal catalogo della galassia: è lo stesso oggetto che sistemaPigro copia in Sis.stella, senza calcolarne i pianeti)
const nascitaDi = (d) => (d.stella != null ? ANNI_OGGI - galassia(cosmoDi(d), d.galassia).stelle[d.stella].eta : 0);

// ---------- IL PESO DEI RAMI (C4, misura.js): il rapporto di verosimiglianza del mondo con i rami rispetto a quello di
// partenza, Π p_e(o_e)/p_e(o_e⁰). Con opzioni.registri = { base, mondo } (i due cammini annotati da misura.conMisura): tutti
// gli eventi, anche ciò che ne discende. Con opzioni.leggi (evento → { legge, parametri }): solo gli eventi dei rami. Senza:
// ogni tiro è letto come uniforme (la legge non è dichiarata), e il rapporto è 1. Un ramo può pesare più della partenza
// (p > 1, bit negativi): i pesi dei rami sono in unità del mondo di partenza.
function pesoRami(rami, O) {
  const nr = Object.keys(rami).length, nome = nr ? `${nr} ${nr === 1 ? 'evento' : 'eventi'} andati diversamente` : 'nessun ramo';
  if (!nr) return { nome, P: 1, conta: 'il mondo di partenza: l\'unità dei pesi dei rami', voci: [] };
  if (O.registri) { const r = rapporto(O.registri.mondo, O.registri.base, O); return { nome, P: r.P, conta: `rapporto di verosimiglianza dei due cammini annotati (misura.js): ${r.diversi.length} eventi contano, ${r.uguali} si semplificano (grana ${r.grana})`, voci: r.diversi }; }
  const r = pesoDegliEventi(rami, O.leggi, O), senza = r.voci.filter((v) => v.nota).length;
  return { nome, P: r.P, conta: `Π p(esito del ramo)/p(esito di partenza) degli eventi dei rami (misura.js)${senza ? `; ${senza} senza legge dichiarata: tiro uniforme, rapporto 1` : ''}; ciò che ne discende non è contato (servono i due cammini: opzione registri)`, voci: r.voci };
}

// ---------- IL PESO DI UN CILINDRO
// → { bit: −log₂P, P, parti: [{ livello, nome, p, bit, conta }], completo, fuori, opzioni }. Le parti si sommano (in bit):
// P è il prodotto dei nuclei lungo il percorso (O7). Un livello che non c'è nell'indirizzo non costa niente (il
// cilindro lo contiene tutto).
export function peso(a0, opzioni = {}) {
  const O = opzioniDi(opzioni), a = comeIndirizzo(a0), d = analizza(a), parti = [];
  const metti = (livello, nome, p, conta, extra = {}) => parti.push({ livello, nome, p, bit: p > 0 ? -Math.log2(p) : Infinity, conta, ...extra });
  const fine = (nota) => { const bit = somma(parti.map((x) => x.bit)); return { bit, P: 2 ** -bit, parti, completo: !d.resto.length, fuori: d.resto, nota, opzioni: O, testo: scriviIntreccio(a) }; };
  if (d.cosmo == null) return { ...fine('non è un luogo: è un indirizzo d\'evento (non comincia da «cosmo N»); la misura non lo conta'), bit: NaN, P: NaN };
  metti('cosmo', `cosmo ${d.cosmo}`, 2 ** -lunghezzaCodice(d.cosmo, O.codice), `l'indice del cosmo con il codice di Elias ${O.codice === 'delta' ? 'δ' : 'γ'}: 2^−ℓ(n), ℓ(${d.cosmo}) = ${lunghezzaCodice(d.cosmo, O.codice)} (LIBERO: nessuna legge dà una frequenza dei cosmi)`);
  if (d.galassia != null) { const K = NUCLEI.galassia(d, O), v = K.voci[d.galassia]; metti('galassia', `galassia ${d.galassia}`, v ? v.p : 0, K.conta, v ? {} : { nota: `il cosmo ha ${K.voci.length} galassie` }); }
  if (d.veraGalassia != null) { const K = NUCLEI.veraGalassia(d); metti('vera galassia', `vera ${d.veraGalassia}`, d.veraGalassia < K.N ? 1 / K.N : 0, K.conta, d.veraGalassia < K.N ? { N: K.N } : { N: K.N, nota: `la galassia rappresenta ${K.N} galassie vere` }); }
  if (d.stella != null) { const K = NUCLEI.stella(d, O), v = K.voci[d.stella]; metti('stella', `stella ${d.stella}`, v ? v.p : 0, K.conta, { nota: v ? K.nota : `la galassia ha ${K.voci.length} stelle nel campione` }); }
  if (d.veraStella != null) { const K = NUCLEI.veraStella(d); metti('vera stella', `vera ${d.veraStella}`, d.veraStella < K.N ? 1 / K.N : 0, K.conta, d.veraStella < K.N ? { N: K.N } : { N: K.N, nota: `la stella rappresenta ${K.N} stelle vere` }); }
  if (d.pianeta != null) { const K = NUCLEI.pianeta(d, O), v = K.voci[d.pianeta]; metti('pianeta', `pianeta ${d.pianeta}`, v ? v.p : 0, K.conta, v ? {} : { nota: `il sistema ha ${K.voci.length} pianeti` }); }
  const suCorpo = d.pianeta != null && (d.luna != null || d.punto || d.regione != null);
  if (suCorpo && d.regione == null) { const K = NUCLEI.corpo(d, O), v = K.voci.find((x) => x.nome === d.luna); metti('corpo', d.luna == null ? 'il pianeta stesso' : `luna ${d.luna}`, v ? v.p : 0, K.conta); }
  if (d.regione != null) metti('luogo', `regione ${d.regione}`, d.regione < REGIONI ? 1 / REGIONI : 0, `le ${REGIONI} regioni della magnetosfera della biblioteca (cosmo.js), uguali (LIBERO)`);
  if (d.punto) {
    const L = d.scala ?? O.scala, R = raggioDelCorpo(d, O), k = ordineDi(R, L);
    metti('luogo', `punto ${d.punto.join(',')}`, 1 / (12 * 4 ** k), `l'area sulla superficie: il pixel HEALPix nested di ordine ${k} (12·4^${k} di area uguale, lato ≈ ${(R * Math.sqrt(Math.PI / 3) / 2 ** k).toPrecision(3)} m, per una scala di ${L} m${d.scala == null ? ' (predefinita: l\'indirizzo non la dice)' : ''})`, { ordine: k, pixel: pixelDi(k, d.punto[0], d.punto[1]) });
  }
  if (d.scala != null) metti('scala', `scala ${d.scala}`, 1, 'la scala non si estrae: è la grana a cui si guarda, scelta da chi guarda (peso 1); fissa il cilindro del luogo');
  // il tempo
  if (O.tempo === 'adesso') metti('tempo', d.tempo == null ? 'adesso' : `@${d.tempo}`, d.tempo == null || Math.abs(d.tempo - ANNI_OGGI) < O.granaTempo / 2 ? 1 : 0, 'il tempo non si estrae: è l\'oggi di chi guarda (peso 1; ogni altro istante pesa 0). LIBERO');
  else {
    const nascita = nascitaDi(d), eta = ANNI_OGGI - nascita, dt = O.granaTempo, t = d.tempo ?? ANNI_OGGI - dt / 2, j = Math.floor((t - nascita) / dt);
    const p = t < nascita || t > ANNI_OGGI ? 0 : Math.min(dt, eta - j * dt) / eta;
    metti('tempo', d.tempo == null ? 'adesso' : `@${d.tempo}`, p, `uniforme sulla vita ${d.stella != null ? 'della stella del luogo' : 'del cosmo'} (${eta.toPrecision(4)} anni), a celle di ${dt} anni (LIBERO: su un tempo infinito non c'è uniforme; i «momenti d'osservatore» non si contano perché nessun modulo sa ancora dire dove c'è un osservatore)`, p ? {} : { nota: t < nascita ? 'prima che la stella nascesse' : 'nel futuro: lo stato si sa solo fino a oggi' });
  }
  const R = pesoRami(d.rami, O);
  metti('rami', R.nome, R.P, R.conta, { voci: R.voci });
  return fine(d.resto.length ? `il resto «${d.resto.join('/')}» non è un luogo della grammatica: non è contato` : null);
}

// ---------- LA DISCESA A CASO (O7 come campionamento): ogni livello con il peso di peso(), dalla fonte unica del caso
// sotto l'indirizzo «lingua/punto a caso/<seme>», un evento per livello con lo stesso nome qualunque sia il prefisso: così
// puntoACaso(s, { da: un inizio di puntoACaso(s) }) è puntoACaso(s) (la discesa condizionata a un luogo noto).
// opzioni: quelle di peso, più `da` (un inizio di indirizzo già fissato) e `fino` (il livello a cui fermarsi: 'cosmo',
// 'galassia', 'vera galassia', 'stella', 'vera stella', 'pianeta', 'corpo', 'luogo', 'tempo'). Con `vere` (predefinito)
// scende anche alla galassia e alla stella vera: la discesa è uniforme sulle stelle vere (P(s, k) = peso_s/Σpeso · 1/N_s),
// non sul campione; ciò che sta sotto (pianeti, luogo, tempo) è quello della stella del campione (vedi stellaVera).
const ORDINE = ['cosmo', 'galassia', 'vera galassia', 'stella', 'vera stella', 'pianeta', 'corpo', 'luogo', 'tempo'];
const kDi = (N, u) => Math.min(N - 1, Math.floor(u * N));
const scegli = (voci, u) => { const W = somma(voci.map((v) => v.p)); let s = 0; for (const v of voci) { s += v.p; if (u * W < s) return v; } return voci.filter((v) => v.p > 0).at(-1); };
export function puntoACaso(seme, opzioni = {}) {
  const O = opzioniDi(opzioni), c = sorgente(`lingua/punto a caso/${seme}`), fino = ORDINE.indexOf(O.fino || 'tempo'), arriva = (l) => ORDINE.indexOf(l) <= fino;
  const d = O.da ? analizza(comeIndirizzo(O.da)) : { ...analizza(indirizzo(['cosmo 1'])), cosmo: null }; // (senza inizio: tutto da estrarre)
  const note = [];
  if (d.cosmo == null) { const r = interoDalCodice(c.serie('cosmo'), O.codice); d.cosmo = r.n; if (r.tentativi > 1) note.push(`indice del cosmo riestratto ${r.tentativi - 1} volte (oltre 2⁵³)`); }
  if (arriva('galassia') && d.galassia == null) d.galassia = scegli(NUCLEI.galassia(d, O).voci, c('galassia')).nome;
  if (arriva('vera galassia') && O.vere && d.veraGalassia == null) d.veraGalassia = kDi(NUCLEI.veraGalassia(d).N, c('vera galassia'));
  if (arriva('stella') && d.stella == null) {
    const voci = NUCLEI.stella(d, O).voci;
    if (!arriva('pianeta')) d.stella = scegli(voci, c('stella/tentativo 0')).nome;
    else { for (let t = 0; t < 32 && d.stella == null; t++) { const s = scegli(voci, c(`stella/tentativo ${t}`)).nome; if (sistemaPigro(cosmoDi(d), d.galassia, s).pianeti.length) d.stella = s; else note.push(`stella ${s} senza pianeti: riestratta`); }
      if (d.stella == null) return { indirizzo: null, testo: null, bit: Infinity, note: [...note, 'nessuna stella con pianeti in 32 tentativi'] }; }
  }
  if (arriva('vera stella') && O.vere && d.veraStella == null) d.veraStella = kDi(NUCLEI.veraStella(d).N, c('vera stella'));
  if (arriva('pianeta') && d.pianeta == null) d.pianeta = scegli(NUCLEI.pianeta(d, O).voci, c('pianeta')).nome;
  if (arriva('corpo') && d.luna == null && d.punto == null && d.regione == null) { const v = scegli(NUCLEI.corpo(d, O).voci, c('corpo')); d.luna = v.nome; }
  if (arriva('luogo') && d.punto == null && d.regione == null) {
    const L = d.scala ?? O.scala, k = ordineDi(raggioDelCorpo(d, O), L), s = c.serie('luogo');
    let pix = Math.floor(s(0) * 12); for (let i = 1; i <= k; i++) pix = pix * 4 + Math.floor(s(i) * 4); // l'albero HEALPix, un figlio su quattro per livello
    d.punto = puntoDelPixel(k, pix); d.scala = L;
  }
  if (arriva('tempo') && d.tempo == null && O.tempo !== 'adesso') {
    const nascita = nascitaDi(d), eta = ANNI_OGGI - nascita, dt = O.granaTempo, M = eta / dt, j = Math.min(Math.ceil(M) - 1, Math.floor(c('tempo') * M));
    d.tempo = nascita + (j * dt + Math.min(eta, (j + 1) * dt)) / 2;
  }
  const a = componi(d), P = peso(a, O);
  return { indirizzo: a, testo: scriviIntreccio(a), bit: P.bit, peso: P, note };
}

// ---------- QUANTO È SPECIALE UN INDIRIZZO: i suoi bit contro quelli di N punti a caso con le stesse opzioni. I punti a caso
// scendono alle galassie e alle stelle vere solo se a ci scende (vere = a ha un livello «vera»): si confrontano cilindri
// della stessa specie, altrimenti un luogo senza «vera» risulterebbe più comune di ~45 bit solo per questo.
export function specialita(a0, { N = 100, seme = 'specialità', ...opzioni } = {}) {
  const an = analizza(comeIndirizzo(a0)), O = opzioniDi({ vere: an.veraGalassia != null || an.veraStella != null, ...opzioni }), bit = peso(a0, O).bit, campione = [];
  for (let i = 0; i < N; i++) { const r = puntoACaso(`${seme}/${i}`, O); if (r.indirizzo) campione.push(r.bit); }
  campione.sort((x, y) => x - y);
  const mediana = campione.length ? (campione[(campione.length - 1) >> 1] + campione[campione.length >> 1]) / 2 : NaN;
  return { bit, mediana, scarto: bit - mediana, quantile: campione.filter((b) => b <= bit).length / Math.max(1, campione.length), N: campione.length, campione,
    dice: !(bit === bit) ? 'non è un luogo' : bit > mediana ? `più speciale del tipico di ${(bit - mediana).toFixed(1)} bit` : `più comune del tipico di ${(mediana - bit).toFixed(1)} bit` };
}

// ---------- LA DISTANZA TRA RAMI (O12, di lato): quanti eventi sono andati diversamente tra due indirizzi dello stesso
// luogo (eventi), e quanto costa passare dall'uno all'altro (bit = −log₂ del rapporto dei loro pesi, P(b)/P(a), con i pesi
// dei rami di misura.js: d_w). È orientata: bit(a→b) = −bit(b→a); negativa se b è più probabile. Le opzioni sono quelle del
// peso dei rami: { leggi } (le leggi degli eventi dei rami) o { registri: { a, b } } (i due cammini annotati). Senza leggi
// ogni tiro è uniforme e d_w = 0, e lo dice.
export function distanzaRami(a0, b0, opzioni = {}) {
  const a = comeIndirizzo(a0), b = comeIndirizzo(b0), chiavi = new Set([...Object.keys(a.rami), ...Object.keys(b.rami)]), diversi = [...chiavi].filter((k) => (a.rami[k] || 0) !== (b.rami[k] || 0)).sort();
  let bit, nota;
  if (opzioni.registri) { const r = rapporto(opzioni.registri.b, opzioni.registri.a, opzioni); bit = r.bit; nota = `d_w dai due cammini annotati: ${r.diversi.length} eventi pesano, ${r.uguali} si semplificano`; }
  else { const pa = pesoDegliEventi(a.rami, opzioni.leggi, opzioni), pb = pesoDegliEventi(b.rami, opzioni.leggi, opzioni), senza = [...pa.voci, ...pb.voci].filter((v) => v.nota).length; bit = pb.bit - pa.bit;
    nota = `d_w dagli eventi dei rami (non ciò che ne discende)${senza ? `; ${senza} rami senza legge dichiarata pesano come tiri uniformi (rapporto 1)` : ''}`; }
  return { eventi: diversi.length, diversi, stessoLuogo: a.percorso.join('/') === b.percorso.join('/'), bit, peso: 2 ** -bit, nota };
}

// ---------- LA STELLA VERA k tra le N che una stella del campione rappresenta. Gli eventi che la rendono individuale hanno
// l'indirizzo della stella vera («…/stella s/vera k/massa», «…/quando»), con i rami dell'indirizzo.
// UGUALE per tutte le N (è la loro classe, quella del campione): la cella di nascita (il passo di tempo e l'anello o la
// componente: quindi metalli Z, componente, venuta da un compagno), la classe di massa (granaMassa dex attorno alla massa
// del campione), il campo magnetico di nascita, e IL SISTEMA DEI PIANETI (il modello ne calcola uno per stella del
// campione: sotto «vera k» i pianeti, il luogo e il tempo sono quelli del campione: NON TORNA, dichiarato).
// VARIA: la massa di nascita, dalla distribuzione di Kroupa (leggi.js massaNascita) dentro la classe; l'età, uniforme
// dentro il passo di nascita; da qui, con stelle.js, vita, stato, temperatura, luce, raggio di oggi. Il POSTO varia ma
// non è calcolato (la funzione che lo dà è interna a galassie.js): resta quello del campione, dichiarato.
// Le ultime supernove (peso 1) sono stelle vere: N = 1, e la vera 0 è lei.
// → { indirizzo, k, N, campione, massaNascita, eta, Z, componente, vita, viva, stato, T, L, R, classe: { da, a } (M☉),
//     passo: { da, a } (Ga dall'inizio), uguale: [...], varia: [...], nota }
const uDiMassa = (m) => { let lo = 0, hi = 1; for (let i = 0; i < 64; i++) { const x = (lo + hi) / 2; if (massaNascita(x) < m) lo = x; else hi = x; } return (lo + hi) / 2; }; // la ripartizione di Kroupa, per bisezione sulla sua inversa
export function stellaVera(a0, opzioni = {}) {
  const O = opzioniDi(opzioni), a = comeIndirizzo(a0), d = analizza(a);
  if (d.stella == null || d.veraStella == null) throw new Error('stellaVera: l\'indirizzo deve arrivare a «stella s/vera k»');
  const nc = cosmoDi(d), Gx = galassia(nc, d.galassia), S = Gx.stelle[d.stella], N = S ? stelleVereDi(S) : 0;
  if (!S || d.veraStella >= N) throw new Error(`stellaVera: la stella ${d.stella} rappresenta ${S ? N : 0} stelle vere`);
  const testo = componi({ ...d, pianeta: null, luna: null, regione: null, punto: null, scala: null, resto: [], tempo: null }).percorso.join('/');
  const m0c = S.massaNascita ?? S.massa, uguale = ['Z', 'componente', 'cella di nascita (passo e anello)', 'classe di massa', 'campo magnetico di nascita', 'sistema dei pianeti (quello del campione)', 'posto (non calcolato: quello del campione)'];
  if (N === 1) return { indirizzo: testo, k: 0, N, campione: S, massaNascita: m0c, eta: S.eta, Z: S.Z, componente: S.componente, stato: S.stato, uguale: ['tutto: è una stella vera del catalogo'], varia: [], nota: 'una delle ultime supernove: il campione è la stella vera' };
  const c = sorgente(testo, d.rami), e = Gx.forma.interno, { T0, DT } = GALASSIE;
  // la classe di massa: [0,08·10^(j·g), 0,08·10^((j+1)·g)) dex, tagliata a 100 M☉ (i limiti di Kroupa in leggi.js)
  const [mMin, , mMax] = KROUPA_2001.masse, g = O.granaMassa, j = Math.min(Math.ceil(Math.log10(mMax / mMin) / g) - 1, Math.floor(Math.log10(m0c / mMin) / g + 1e-12)), mDa = mMin * 10 ** (j * g), mA = Math.min(mMax, mMin * 10 ** ((j + 1) * g)), uDa = uDiMassa(mDa), uA = uDiMassa(mA);
  const m0 = massaNascita(uDa + (uA - uDa) * c('massa'));
  // il passo di nascita del campione (galassie.js: il passo i va da (i−1)·DT a i·DT Ga dall'inizio; il primo da e.inizio)
  const nascitaC = T0 - S.eta / 1e9, i = Math.max(1, Math.min(e.nt, Math.floor(nascitaC / DT) + 1)), pDa = i === 1 ? e.inizio : (i - 1) * DT, pA = i * DT;
  const nascita = pDa + c('quando') * (pA - pDa), eta = (T0 - nascita) * 1e9, Z = S.Z ?? 1, vita = ST.stella(m0, { Z }).vita, viva = eta < vita;
  const ora = viva ? ST.stella(m0, { Z, eta }) : null, stato = viva ? (ora.nanaBruna ? 'nana bruna' : 'in vita') : ST.fine(m0, S.B ?? 1e-4, { Z }).tipo;
  return { indirizzo: testo, k: d.veraStella, N, campione: S, massaNascita: m0, eta, Z, componente: S.componente, vita, viva, stato, ...(ora ? { T: ora.T, L: ora.L, R: ora.R } : {}), classe: { da: mDa, a: mA }, passo: { da: pDa, a: pA },
    uguale, varia: ['massa di nascita (Kroupa nella classe)', 'età (uniforme nel passo)', 'vita, stato, T, L, R di oggi (stelle.js)'],
    nota: `${viva ? '' : 'morta: lo stato è stelle.fine; '}la «gigante rossa» e il raffreddamento delle nane bianche sono di galassie.js per il campione, qui non ripetuti` };
}
// LA GALASSIA VERA k tra le N che una del campione rappresenta: UGUALE al campione in tutto (alone, forma, stelle, sistemi:
// non si ricalcolano); VARIA il posto nel toro (tre eventi uniformi all'indirizzo della galassia vera: le correlazioni tra
// aloni non sono seguite; aloniIn di ragnatela.js le dà regione per regione, non sul toro intero: NON TORNA, dichiarato).
export function galassiaVera(a0) {
  const a = comeIndirizzo(a0), d = analizza(a);
  if (d.veraGalassia == null) throw new Error('galassiaVera: l\'indirizzo deve arrivare a «galassia g/vera k»');
  const V = galassieVere(cosmoDi(d)); if (d.veraGalassia >= V.perGalassia) throw new Error(`galassiaVera: ogni galassia rappresenta ${V.perGalassia} galassie vere`);
  const testo = componi({ ...d, stella: null, veraStella: null, pianeta: null, luna: null, regione: null, punto: null, scala: null, resto: [], tempo: null }).percorso.join('/'), c = sorgente(testo, d.rami);
  return { indirizzo: testo, k: d.veraGalassia, N: V.perGalassia, campione: cosmo(cosmoDi(d)).galassie[d.galassia], posto: [c('posto/x'), c('posto/y'), c('posto/z')].map((u) => u * TORO_M), uguale: ['alone', 'forma', 'stelle', 'sistemi'], varia: ['posto nel toro (uniforme)'] };
}

// ---------- L'IMPRONTA DEL CONTENUTO (O8, regola 13), prima versione: per un pianeta
// La forma canonica delle grandezze del pianeta alla grana g (un intero ≥ 0; DICHIARATA, e LIBERA la scelta dei campi):
//   · grandezze positive (massa, raggio, semiasse, anno, giorno, temperatura, pressione, masse delle lune): la casella
//     ⌊2^g·log₂ x⌋ (larghezza 2^−g in log₂: un fattore 2 a g = 0, lo 0,3% a g = 8)
//   · frazioni in [0, 1] (eccentricità, albedo, composizione): ⌊2^g·x⌋; angoli (obliquità): ⌊2^g·obliquità/180°⌋
//   · categorie, a ogni grana: tipo, stato dell'acqua, giro bloccato, retrogrado, regime della crosta, gas tenuti, anelli,
//     numero di lune. Le lune sono un insieme: si mettono in ordine di massa (la forma canonica per isomorfismo)
// Le caselle a grana g+1 stanno dentro quelle a grana g (⌊2y⌋/2 → ⌊y⌋: moltiplicare per 2 è esatto), quindi uguali a
// grana fine ⇒ uguali a grana grossa (O3). Non entrano l'indirizzo, la fase dell'orbita né l'ora: è il contenuto.
// Hash: FNV-1a a 128 bit (Fowler, Noll, Vo) sui byte UTF-8 della forma: non crittografico, LIBERO.
const qlog = (x, g) => (x > 0 && Number.isFinite(x) ? Math.floor(Math.log2(x) * 2 ** g) : x === 0 ? 'zero' : x === Infinity ? 'inf' : x == null || x !== x ? '-' : `neg${qlog(-x, g)}`);
const q01 = (x, g) => (x == null || x !== x ? '-' : Math.floor(x * 2 ** g));
export function formaCanonica(P, g = 8) {
  if (!P || P.raggioM == null) throw new Error('impronta: serve un pianeta di sistema() (o il suo indirizzo)');
  const cl = P.clima || {}, lune = [...(P.lune || [])].sort((x, y) => (y.massaKg || 0) - (x.massaKg || 0)), comp = P.composizione || {};
  const campi = [
    ['grana', g], ['tipo', P.tipo], ['acqua', cl.acqua ?? '-'], ['bloccato', !!P.bloccato], ['retrogrado', !!P.retrogrado], ['crosta', P.interno?.tettonica ?? '-'],
    ['tenuti', [...(cl.tenuti || [])].sort().join('+')], ['anelli', !!(P.anello && P.anello.massaKg > 0)], ['lune', lune.length],
    ['massa', qlog(P.massaKg, g)], ['raggio', qlog(P.raggioM, g)], ['semiasse', qlog(P.aM, g)], ['anno', qlog(P.anno, g)], ['giorno', qlog(Math.abs(P.giorno), g)],
    ['T', qlog(cl.T, g)], ['pressione', qlog(cl.pressione, g)], ['eccentricita', q01(P.eccentricita, g)], ['albedo', q01(cl.albedo, g)], ['obliquita', q01((P.obliquita ?? NaN) / 180, g)],
    ['composizione', Object.keys(comp).sort().map((k) => `${k}:${q01(comp[k], g)}`).join('+')], ['masseLune', lune.map((l) => qlog(l.massaKg, g)).join('+')],
  ];
  return { testo: campi.map(([k, v]) => `${k}=${v}`).join(';'), campi: Object.fromEntries(campi) };
}
const FNV_BASE = 0x6c62272e07bb014262b821756295c58dn, FNV_PRIMO = 0x0000000001000000000000000000013bn, M128 = (1n << 128n) - 1n;
export function hash128(testo) { let h = FNV_BASE; for (const b of new TextEncoder().encode(testo)) h = ((h ^ BigInt(b)) * FNV_PRIMO) & M128; return h.toString(16).padStart(32, '0'); }
const pianetaDi = (x) => { if (x && x.raggioM != null) return x; const d = analizza(comeIndirizzo(x)); if (d.pianeta == null) throw new Error('impronta: l\'indirizzo deve arrivare al pianeta'); return sistemaPigro(cosmoDi(d), d.galassia, d.stella).pianeti[d.pianeta]; };
export function impronta(stato, grana = 8) { const f = formaCanonica(pianetaDi(stato), grana); return { hash: hash128(f.testo), forma: f.testo, campi: f.campi, grana }; }
export const uguali = (a, b, grana = 8) => impronta(a, grana).hash === impronta(b, grana).hash;

// ---------- LE FUSIONI (O8, C11): i cilindri raggruppati per impronta a una grana, con i pesi sommati. Il peso di una classe
// è w_g(s) = Σ μ([x]) sui cilindri x della classe: è l'immagine diretta della misura (additiva su cilindri disgiunti), e si
// sommano i PESI, non le ampiezze, perché le storie riunite qui sono DECOERENTI: differiscono per eventi macroscopici
// (un disco, un impatto, un mantello, una stella in un altro ramo), registrati dall'ambiente molto sopra la scala
// quantistica. Sotto la decoerenza (particelle in sovrapposizione) il peso sarebbe |Σ A_x|²: non è fatto.
// voci: indirizzi (fino al pianeta, o più giù) o { indirizzo, peso, storia }: il peso, se non c'è, è peso(indirizzo).P (in
// unità del mondo di partenza per i rami); «storia» identifica il cilindro quando due indirizzi diversi nominano lo stesso
// (due rami che danno gli stessi esiti alla grana: misura.js storia). Lo stesso cilindro due volte si conta una; due
// cilindri di cui uno contiene l'altro (un pianeta e un suo punto, un luogo senza «vera» e uno con) non si possono sommare:
// errore. L'impronta è quella del pianeta (impronta): luogo e tempo sotto il pianeta non la cambiano.
// → { classi: [{ hash, forma, peso, membri: [testi] }] (per peso), totale (Σ delle classi), ingresso (Σ dei cilindri), grana, nota }
const contiene = (A, B) => JSON.stringify(A.rami) === JSON.stringify(B.rami) && (A.tempo == null || A.tempo === B.tempo) && ['cosmo', 'galassia', 'veraGalassia', 'stella', 'veraStella', 'pianeta', 'luna', 'regione', 'scala'].every((l) => A[l] == null || A[l] === B[l]) && (!A.punto || (B.punto && A.punto[0] === B.punto[0] && A.punto[1] === B.punto[1]));
export function fondi(voci, grana = 8, opzioni = {}) {
  const cilindri = new Map();
  for (const v0 of voci) {
    const v = v0 && typeof v0 === 'object' && v0.indirizzo ? v0 : { indirizzo: v0 }, a = comeIndirizzo(v.indirizzo), testo = scriviIntreccio(a), chiave = v.storia ?? testo;
    if (cilindri.has(chiave)) continue;
    cilindri.set(chiave, { testo, d: analizza(a), w: v.peso ?? peso(a, opzioni).P, h: impronta(a, grana) });
  }
  const tutti = [...cilindri.values()];
  for (const x of tutti) for (const y of tutti) if (x !== y && contiene(x.d, y.d)) throw new Error(`fondi: «${x.testo}» contiene «${y.testo}»: i cilindri da sommare devono essere disgiunti`);
  const classi = new Map();
  for (const x of tutti) { const k = x.h.hash; if (!classi.has(k)) classi.set(k, { hash: k, forma: x.h.forma, peso: 0, membri: [] }); const C = classi.get(k); C.peso += x.w; C.membri.push(x.testo); }
  const lista = [...classi.values()].sort((p, q) => q.peso - p.peso || (p.hash < q.hash ? -1 : 1));
  return { classi: lista, totale: somma(lista.map((C) => C.peso)), ingresso: somma(tutti.map((x) => x.w)), grana, nota: 'pesi sommati (storie decoerenti, sopra la scala quantistica); il peso dei rami in unità del mondo di partenza' };
}

// ---------- LA FRAZIONE DEI LUOGHI CON UN CONTENUTO, per la misura (C13, la via evolutiva): N punti a caso (puntoACaso fino a
// opzioni.fino, predefinito il pianeta), e la parte di quelli per cui predicato(pianeta, punto) è vero. Con l'errore di una
// binomiale; se nessuno lo è, il limite superiore al 95% (3/N). Conta ciò che le opzioni contano (pianeti: 'uniforme' conta
// i pianeti uno per uno; il predefinito 'area' le superfici).
export function frazione(predicato, { N = 100, seme = 'frazione', ...opzioni } = {}) {
  const O = opzioniDi({ fino: 'pianeta', ...opzioni }); let si = 0, n = 0; const trovati = [];
  for (let i = 0; i < N; i++) {
    const r = puntoACaso(`${seme}/${i}`, O); if (!r.indirizzo) continue; n++;
    const d = analizza(r.indirizzo), P = sistemaPigro(cosmoDi(d), d.galassia, d.stella).pianeti[d.pianeta];
    if (predicato(P, r)) { si++; trovati.push({ testo: r.testo, P }); }
  }
  const f = si / Math.max(1, n);
  return { f, errore: Math.sqrt(Math.max(f * (1 - f), 1 / n) / n), si, N: n, limite: si ? null : 3 / n, trovati, nota: si ? null : `nessuno in ${n}: f < ${(3 / n).toPrecision(2)} (95%)` };
}
