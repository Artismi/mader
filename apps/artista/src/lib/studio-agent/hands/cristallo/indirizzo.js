// indirizzo.js — un pattern è un indirizzo corto (punto 5), scritto come testo leggibile.
//
// Esempio:
//   reticolo=cubico.F a=1 b=1 c=1 alfa=90 beta=90 gamma=90 atomi=+0,0,0;-0.5,0.5,0.5 U0=1 w=0.15
//   r0=0.1,0.2,0.3 v0=1.5,0.4,0 B=0,0,0 T=0 difetti=0 C=0,0,0 R=4 n=0,0,1 psi=0 L=4 D=3 h=0.3
//   modo=prospettiva vista=tessera tempo=300
// I numeri si scrivono con la scrittura più corta che ridà lo stesso double (String di JavaScript): leggere ciò che si
// è scritto ridà gli stessi bit. R = ∞ si scrive «inf». Il passo di integrazione non c'è: si sceglie per convergenza
// dall'indirizzo stesso, quindi è anch'esso sempre lo stesso.
// La fonte del caso del pattern (le vibrazioni, i difetti) ha per radice la parte FISICA dell'indirizzo (tutto tranne
// la finestra e la vista): girare la finestra non cambia il cristallo.
//
// LE LINEE CHIUSE (orbite=x,y,vx,vy,T,n;…, scritte solo se ce ne sono): le orbite periodiche scelte (orbite.js),
// disegnate una volta e ripetute dal reticolo al posto della pallina.
// LA SORGENTE (sorgente=1, scritta solo se accesa): da r0, che è un sito speciale, partono le palline nelle direzioni
// dell'orbita di v0 sotto il gruppo del sito (simmetria.js).
//
// UN ATOMO si scrive ±x,y,z, e facoltativamente @altezza (reale, al posto del segno) e ~larghezza (la sua w).
//
// IL 🎲: casuale(k) dà un indirizzo dalla fonte del caso con l'indirizzo «🎲/k». Il reticolo (sistema, centratura,
// parametri nei vincoli), gli atomi, il lancio, il magnete; la finestra con n uniforme sulla sfera (cos θ uniforme in
// [−1, 1], φ uniforme in [0, 2π)), ψ uniforme in [0, 2π), C nel primo atomo della cella, R = (L/2)·10^u con u uniforme
// in [0, 1,5] (da dentro il cristallo a 30 volte più lontano) oppure, una volta su cinque, R = ∞.

import { sorgente, cosGiro, senGiro } from './caso.js';
import { reticoloACaso, vincola, vettoriCella, combina } from './reticolo.js';

export const PREDEFINITO = {
  reticolo: { sistema: 'cubico', centratura: 'P', a: 1, b: 1, c: 1, alfa: 90, beta: 90, gamma: 90, piano: false },
  atomi: [{ p: [0, 0, 0], s: 1 }], U0: 1, w: 0.15,
  r0: [0.5, 0.5, 0.5], v0: [2.2, 0.9, 0.4], B: [0, 0, 0], T: 0, difetti: 0,
  finestra: { C: [0, 0, 0], R: 4, n: [0, 0, 1], psi: 0, L: 4, D: 1.5, h: 0.3, modo: 'prospettiva' },
  vista: 'tessera', tempo: 40, sorgente: 0,
};

const num = (x) => (x === Infinity ? 'inf' : x === -Infinity ? '-inf' : Object.is(x, -0) ? '-0' : String(x));
const leggiNum = (s) => { if (s === 'inf') return Infinity; if (s === '-inf') return -Infinity; const x = Number(s); if (!Number.isFinite(x) && s !== 'NaN') throw new Error(`numero illeggibile: ${s}`); return x; };
const vet = (v) => v.map(num).join(',');
const leggiVet = (s) => s.split(',').map(leggiNum);

export function scriviFisica(p) {
  const r = p.reticolo;
  return [
    `reticolo=${r.piano ? 'piano.' : ''}${r.sistema}.${r.centratura}`, `a=${num(r.a)}`, `b=${num(r.b)}`, `c=${num(r.c)}`,
    `alfa=${num(r.alfa)}`, `beta=${num(r.beta)}`, `gamma=${num(r.gamma)}`,
    `atomi=${p.atomi.length ? p.atomi.map((a) => (a.s < 0 ? '-' : '+') + vet(a.p) + (a.ampiezza != null ? `@${num(a.ampiezza)}` : '') + (a.w != null ? `~${num(a.w)}` : '')).join(';') : 'nessuno'}`,
    `U0=${num(p.U0)}`, `w=${num(p.w)}`, `r0=${vet(p.r0)}`, `v0=${vet(p.v0)}`, `B=${vet(p.B)}`, `T=${num(p.T)}`, `difetti=${num(p.difetti)}`,
  ].join(' ');
}
export function scrivi(p) {
  const f = p.finestra;
  return [scriviFisica(p), `C=${vet(f.C)}`, `R=${num(f.R)}`, `n=${vet(f.n)}`, `psi=${num(f.psi)}`, `L=${num(f.L)}`, `D=${num(f.D)}`, `h=${num(f.h)}`,
    `modo=${f.modo}`, `vista=${p.vista}`, `tempo=${num(p.tempo)}`, ...(p.sorgente ? ['sorgente=1'] : []), ...(p.orbite?.length ? [`orbite=${p.orbite.join(';')}`] : [])].join(' ');
}

export function leggi(testo) {
  const p = structuredClone(PREDEFINITO);
  for (const pezzo of String(testo).trim().split(/\s+/)) {
    const i = pezzo.indexOf('='); if (i < 0) throw new Error(`pezzo senza «=»: ${pezzo}`);
    const k = pezzo.slice(0, i), v = pezzo.slice(i + 1);
    switch (k) {
      case 'reticolo': { const q = v.split('.'), piano = q[0] === 'piano'; if (piano) q.shift(); p.reticolo.piano = piano; p.reticolo.sistema = q[0]; p.reticolo.centratura = q[1] ?? 'P'; break; }
      case 'a': case 'b': case 'c': case 'alfa': case 'beta': case 'gamma': p.reticolo[k] = leggiNum(v); break;
      case 'atomi': p.atomi = v === 'nessuno' ? [] : v.split(';').map((s) => {
        const m = s.slice(1).match(/^([^@~]*)(?:@([^~]*))?(?:~(.*))?$/), a = { s: s[0] === '-' ? -1 : 1, p: leggiVet(m[1]) };
        if (m[2] != null) a.ampiezza = leggiNum(m[2]); if (m[3] != null) a.w = leggiNum(m[3]); return a;
      }); break;
      case 'U0': case 'w': case 'T': case 'difetti': case 'tempo': case 'sorgente': p[k] = leggiNum(v); break;
      case 'r0': case 'v0': case 'B': p[k] = leggiVet(v); break;
      case 'C': case 'n': p.finestra[k] = leggiVet(v); break;
      case 'R': case 'psi': case 'L': case 'D': case 'h': p.finestra[k] = leggiNum(v); break;
      case 'modo': p.finestra.modo = v; break;
      case 'vista': p.vista = v; break;
      case 'orbite': p.orbite = v.split(';'); break;
      default: throw new Error(`chiave sconosciuta: ${k}`);
    }
  }
  return p;
}

// la direzione uniforme sulla sfera da due esiti: cos θ = 1 − 2u, φ = 2π·v (solo operazioni esatte)
export function direzioneUniforme(u, v) {
  const z = 1 - 2 * u, s = Math.sqrt(Math.max(0, 1 - z * z));
  return [s * cosGiro(v), s * senGiro(v), z];
}

// le posizioni dove si può mettere un atomo: gli otto punti della griglia a metà cella
export const POSTI = [[0, 0, 0], [0.5, 0, 0], [0, 0.5, 0], [0, 0, 0.5], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5], [0.5, 0.5, 0.5]];

export function casuale(k) {
  const c = sorgente(`🎲/${k}`);
  const reticolo = reticoloACaso(c.sotto('reticolo'));
  const A = vettoriCella(vincola(reticolo));
  // gli atomi: da uno a tre posti diversi, collina o conca
  const quanti = 1 + c.intero('quanti atomi', 3), posti = [...POSTI.keys()], atomi = [];
  for (let i = 0; i < quanti; i++) {
    const j = c.intero(`posto ${i}`, posti.length), [q] = posti.splice(j, 1);
    atomi.push({ p: [...POSTI[q]], s: c(`segno ${i}`) < 0.7 ? 1 : -1 });
  }
  const w = c.tra('w', 0.1, 0.22);
  // il lancio: un punto della cella, una direzione uniforme, l'energia cinetica tra 0,3 e 6 U₀ (uniforme nel logaritmo)
  const f0 = [c('r0 x'), c('r0 y'), c('r0 z')], r0 = combina(f0, A);
  const E = 0.3 * Math.pow(20, c('energia')), dir = direzioneUniforme(c('lancio cos'), c('lancio fi')), vv = Math.sqrt(2 * E);
  const v0 = dir.map((x) => x * vv);
  // il magnete, una volta su due: il raggio di curvatura tra 0,3 e 3 celle, la direzione uniforme
  let B = [0, 0, 0];
  if (c('magnete') < 0.5) { const raggio = 0.3 * Math.pow(10, c('raggio')), b = direzioneUniforme(c('B cos'), c('B fi')); B = b.map((x) => (x * vv) / raggio); }
  const L = 4, n = direzioneUniforme(c('n cos'), c('n fi')), psi = 2 * Math.PI * c('psi');
  const R = c('lontano') < 0.2 ? Infinity : (L / 2) * Math.pow(10, 1.5 * c('R'));
  const C = combina(atomi[0].p, A);
  return {
    reticolo: { ...vincola(reticolo), piano: false }, atomi, U0: 1, w, r0, v0, B, T: 0, difetti: 0,
    finestra: { C, R, n, psi, L, D: 1.5, h: 0.3, modo: 'prospettiva' }, vista: 'tessera', tempo: 40,
  };
}
