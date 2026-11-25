// deposito.js — LA MEMORIA DEI NODI COSTOSI, PER INDIRIZZO.
//
// Il clima, il vento, la chimica del mare, le tessere della superficie, le finestre: tutto è funzione dell'indirizzo (e del
// codice che lo calcola). Calcolato una volta, si tiene qui, nel navigatore (IndexedDB: c'è nella pagina e nei fili, anche in
// Electron con app://), e alla visita dopo si legge invece di rifarlo. Il determinismo non cambia: la chiave è
//   nodo | versione del modello | versione del codice | indirizzo
// e il valore è salvato con la clonazione strutturata (la stessa di postMessage: numeri a 64 bit, −0, NaN, array tipizzati
// byte per byte), quindi dalla memoria escono gli stessi bit del calcolo (test/test_deposito.mjs lo verifica).
//
// LA VERSIONE DEL CODICE non si scrive a mano: è l'impronta (SHA-256) dei sorgenti di tutti i moduli che il nodo importa,
// letti seguendo gli import a partire dal modulo d'ingresso. Basta cambiare una riga di geologia.js perché ogni superficie
// salvata diventi un'altra chiave (e si ricalcoli). VERSIONE_MODELLO serve per ciò che il codice non vede (si alza a mano
// se cambia il significato di un nodo senza che ne cambi il sorgente: per esempio un dato letto da fuori).
//
// Uso:  const v = await ricorda('superficie', k, () => calcola(), { codice: import.meta.url })   (codice: uno o più moduli d'ingresso)
//       → il valore salvato se c'è, se no calcola(), lo salva e lo restituisce (calcola può essere asincrona).
// Senza IndexedDB (le prove in node) ricorda() calcola e basta. svuota() lo vuota (anche da DevTools: indexedDB.deleteDatabase('stateyour-deposito')).
export const VERSIONE_MODELLO = 1;
const NOME = 'stateyour-deposito', TAVOLA = 'nodi', USI = 'usi', MASSIMO = 3000; // (righe; le meno usate da tempo si buttano)
// (DUE TAVOLE: «nodi» tiene i valori, «usi» quando ognuno è stato usato l'ultima volta. Prima il tempo stava con il valore, e ogni
// lettura riscriveva il valore intero — per una superficie 7,6 MB clonati e scritti di nuovo — solo per cambiare un numero)

export const disponibile = () => typeof indexedDB !== 'undefined';

// ---------- l'impronta del codice: i sorgenti del modulo e di tutto ciò che importa (in ordine di indirizzo)
const IMPORT = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|new URL\(\s*)['"](\.{1,2}\/[^'"]+\.js)['"]/g;
const impronte = new Map();
export function improntaCodice(ingresso) {
  const ingressi = (Array.isArray(ingresso) ? ingresso : [ingresso]).map((u) => new URL(String(u)).href), k = ingressi.join(' ');
  if (impronte.has(k)) return impronte.get(k);
  const p = (async () => {
    const testi = new Map();
    const visita = async (url) => { if (testi.has(url)) return; testi.set(url, ''); const r = await fetch(url); if (!r.ok) { testi.set(url, `(${r.status})`); return; } const t = await r.text(); testi.set(url, t); // (un import citato in un commento può non esistere)
      await Promise.all([...t.matchAll(IMPORT)].map((m) => visita(new URL(m[1], url).href))); };
    await Promise.all(ingressi.map(visita));
    const base = new URL('../../', ingressi[0]).href, chiavi = [...testi.keys()].sort(), enc = new TextEncoder();
    const tutto = enc.encode(chiavi.map((u) => `${u.replace(base, '')}\n${testi.get(u)}\n`).join('\u0000'));
    const h = new Uint8Array(await crypto.subtle.digest('SHA-256', tutto));
    return [...h.slice(0, 8)].map((b) => b.toString(16).padStart(2, '0')).join('');
  })();
  impronte.set(k, p); return p;
}

// ---------- IndexedDB
let db = null;
function apri() {
  if (db) return db;
  db = new Promise((ok, no) => { const q = indexedDB.open(NOME, 2); q.onupgradeneeded = () => { const d = q.result; // (dalla versione 1, col tempo nel valore: si riparte vuoti)
    for (const n of [TAVOLA, USI]) if (d.objectStoreNames.contains(n)) d.deleteObjectStore(n); d.createObjectStore(TAVOLA); d.createObjectStore(USI).createIndex('t', 't'); }; q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error); q.onblocked = () => no(new Error('deposito bloccato')); });
  db.catch(() => { db = null; }); return db;
}
const fatto = (q) => new Promise((ok, no) => { q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error); });
export async function chiaveDi(nodo, indirizzo, { codice = null } = {}) { return `${nodo}|m${VERSIONE_MODELLO}|c${codice ? await improntaCodice(codice) : '-'}|${indirizzo}`; }
export async function leggi(chiave) {
  if (!disponibile()) return undefined;
  try { const d = await apri(), r = await fatto(d.transaction(TAVOLA, 'readonly').objectStore(TAVOLA).get(chiave)); if (!r) return undefined;
    // (quando è stato usato l'ultima volta, nella sua tavola: per buttare i meno usati; non serve aspettarlo)
    try { d.transaction(USI, 'readwrite').objectStore(USI).put({ t: Date.now() }, chiave); } catch { /* niente */ }
    statistiche.letti++; return r.v; } catch { return undefined; }
}
let scritture = 0;
// (put() copia il valore subito, quando la si chiama: quando scrivi() si risolve il valore si può già trasferire ad altri
// fili o cambiare; il salvataggio vero finisce dopo, in `fine`)
export async function scrivi(chiave, valore) {
  if (!disponibile()) return { fine: Promise.resolve(false) };
  try { const d = await apri(), tx = d.transaction([TAVOLA, USI], 'readwrite'); tx.objectStore(TAVOLA).put({ v: valore }, chiave); tx.objectStore(USI).put({ t: Date.now() }, chiave);
    const fine = new Promise((ok) => { tx.oncomplete = () => { statistiche.scritti++; if (++scritture % 50 === 1) pota(d); ok(true); }; tx.onerror = tx.onabort = () => { statistiche.errori++; ok(false); }; });
    return { fine }; } catch { statistiche.errori++; return { fine: Promise.resolve(false) }; }
}
async function pota(d) {
  try { const tx = d.transaction([TAVOLA, USI], 'readwrite'), s = tx.objectStore(TAVOLA), u = tx.objectStore(USI), n = await fatto(u.count()); if (n <= MASSIMO) return; let via = n - MASSIMO * 0.9;
    const c = u.index('t').openKeyCursor(); c.onsuccess = () => { const k = c.result; if (!k || via-- <= 0) return; s.delete(k.primaryKey); u.delete(k.primaryKey); k.continue(); }; } catch { /* niente */ }
}
export const statistiche = { letti: 0, scritti: 0, calcolati: 0, errori: 0 };
export async function svuota() { if (!disponibile()) return; const d = await apri(), tx = d.transaction([TAVOLA, USI], 'readwrite'); tx.objectStore(USI).clear(); await fatto(tx.objectStore(TAVOLA).clear()); }

// il valore del nodo per quell'indirizzo: dalla memoria se c'è, se no calcolato (e salvato senza farlo aspettare)
export async function ricorda(nodo, indirizzo, calcola, { codice = null } = {}) {
  let k = null; if (disponibile()) { try { k = await chiaveDi(nodo, indirizzo, { codice }); } catch { k = null; } }
  if (k) { const v = await leggi(k); if (v !== undefined) return v; }
  const v = await calcola(); statistiche.calcolati++;
  if (k && v !== undefined && v !== null) await scrivi(k, v);
  return v;
}
