// superficie.worker.js — la superficie di un pianeta calcolata in secondo piano.
//
// Tettonica, clima, aria che circola ed erosione costano alcuni secondi: qui girano fuori dal filo
// dell'interfaccia, così la mappa resta viva mentre il pianeta «si forma». Il calcolo è lo stesso
// identico di mappa.js (stesso indirizzo, stesso risultato): cambia solo dove gira.
import { sistema } from './cosmo.js';
import { superficiePianeta, climaSuperficie, climaConIlMare, erosione } from './geologia.js';
import { mare } from './mare.js';
import { ricorda } from './deposito.js';
import { aiutiDelClima, passoClimaFilo, barrieraClima } from './geologia.js';

// IL CLIMA IN PIÙ FILI (clima.worker.js): se il navigatore dà la memoria condivisa (le origini isolate: electron/main.cjs) si accendono
// subito fino a tre fili che aiutano. Ogni integrazione del clima (geologia.js climaSuperficie) divide allora righe e colonne della
// griglia tra questo filo e loro, con le stesse funzioni: gli stessi bit. Senza, o finché non sono pronti, il clima si fa qui da solo.
let integrazioniInFili = 0; // (quante integrazioni del clima si sono fatte in più fili: va nel messaggio, per le misure)
const AIUTI = typeof SharedArrayBuffer !== 'undefined' && self.crossOriginIsolated ? Math.min(3, Math.max(0, (navigator.hardwareConcurrency || 2) - 3)) : 0;
if (AIUTI > 0) {
  const pronti = new Int32Array(new SharedArrayBuffer(4 * AIUTI)), fili = [];
  try { for (let i = 0; i < AIUTI; i++) { const w = new Worker(new URL('./clima.worker.js', import.meta.url), { type: 'module' }); w.postMessage({ tipo: 'avvio', pronti, i }); fili.push(w); } } catch { fili.length = 0; }
  const condivisa = (a) => { const b = new a.constructor(new SharedArrayBuffer(a.byteLength)); b.set(a); return b; };
  const fasce = (n, P, p) => [Math.round((n * p) / P), Math.round((n * (p + 1)) / P)];
  aiutiDelClima((Z, Fs, somma) => {
    if (!fili.length) return false; for (let i = 0; i < fili.length; i++) if (Atomics.load(pronti, i) !== 1) return false;
    const P = fili.length + 1, B = new Int32Array(new SharedArrayBuffer(8)), x = new Float64Array(Math.max(Z.W, Z.H));
    const Zs = { ...Z, alb: null, T: condivisa(Z.T), nuovo: condivisa(Z.nuovo), media: condivisa(Z.media), freddo: condivisa(Z.freddo), stagioni: Z.stagioni ? Z.stagioni.map(condivisa) : null, E: condivisa(Z.E), I: condivisa(Z.I) };
    for (let p = 1; p < P; p++) { const [j0, j1] = fasce(Z.H, P, p), [i0, i1] = fasce(Z.W, P, p); fili[p - 1].postMessage({ tipo: 'clima', Z: { ...Zs, soleJ: new Float64Array(Z.H) }, Fs, B, P, j0, j1, i0, i1 }); }
    const [j0, j1] = fasce(Z.H, P, 0), [i0, i1] = fasce(Z.W, P, 0);
    for (let n = 0; n < Z.totale; n++) passoClimaFilo(Zs, Fs, n, j0, j1, i0, i1, x, B, P, somma);
    barrieraClima(B, P); // (anche gli altri hanno chiuso l'ultimo passo)
    Z.T.set(Zs.T); Z.nuovo.set(Zs.nuovo); Z.media.set(Zs.media); Z.freddo.set(Zs.freddo); if (Z.stagioni) Z.stagioni.forEach((q, i) => q.set(Zs.stagioni[i]));
    integrazioniInFili++; return true;
  });
}

// i dati senza le funzioni (un messaggio tra fili porta numeri e tabelle, non codice)
function pulito(o, visti = new Map()) {
  if (o === null || typeof o !== 'object') return typeof o === 'function' ? undefined : o;
  if (ArrayBuffer.isView(o)) return o;
  if (visti.has(o)) return visti.get(o);
  if (Array.isArray(o)) { const a = []; visti.set(o, a); for (const x of o) a.push(pulito(x, visti)); return a; }
  const r = {}; visti.set(o, r);
  for (const k of Object.keys(o)) { const x = pulito(o[k], visti); if (x !== undefined) r[k] = x; }
  return r;
}

function buffers(o) { const visti = new Set(), out = new Set();
  const giro = (x) => { if (x === null || typeof x !== 'object' || visti.has(x)) return; visti.add(x); if (ArrayBuffer.isView(x)) { if (x.buffer instanceof ArrayBuffer) out.add(x.buffer); return; } for (const k of Object.keys(x)) giro(x[k]); };
  giro(o); return [...out]; }
// LA MEMORIA (deposito.js): la superficie è funzione dell'indirizzo e del codice; calcolata una volta si tiene nel navigatore,
// e alla visita dopo si legge (gli stessi bit: la memoria salva proprio ciò che il messaggio porterebbe)
function calcola(k, v) {
  const P = sistema(v.cosmo, v.galassia, v.stella).pianeti[v.pianeta];
  const sf0 = superficiePianeta(k, P, P.interno, P.origine), cl0 = climaSuperficie(k, P, sf0), se = erosione(k, sf0, cl0);
  // il mare del pianeta (mare.js): i sali, le correnti, ciò che è sospeso; se non c'è acqua liquida lo dice
  let acque = null; try { acque = mare(P, se, cl0, se, `${k}/mare`); } catch (err) { acque = { esiste: false, motivo: `il mare non si è potuto calcolare (${err && err.message})` }; }
  // il mare torna al clima: il calore che le correnti spostano e l'albedo della sua superficie (geologia.js, climaConIlMare)
  let cl = cl0; try { if (acque && acque.esiste) cl = climaConIlMare(k, P, sf0, cl0, acque); } catch { cl = cl0; }
  return { cl: pulito(cl), se: pulito(se), mare: pulito(acque) };
}
self.onmessage = async (e) => {
  const { k, v } = e.data;
  try {
    const t0 = performance.now(); let calcolata = false;
    const r = await ricorda('superficie', k, () => { calcolata = true; return calcola(k, v); }, { codice: import.meta.url });
    // (dalla memoria arriva un oggetto nuovo, solo di questo messaggio: i suoi array si passano invece di copiarli. Quelli appena
    // calcolati no: geologia.js tiene in memoria il clima e la superficie che li contengono, e un array passato qui resta vuoto)
    self.postMessage({ k, ...r, ms: performance.now() - t0, dallaMemoria: !calcolata, climaInFili: integrazioniInFili }, calcolata ? [] : buffers(r));
  } catch (err) { self.postMessage({ k, errore: String((err && err.stack) || err) }); }
};
