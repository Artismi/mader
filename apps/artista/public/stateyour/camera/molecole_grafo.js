// molecole_grafo.js — LE MOLECOLE COME GRAFI: atomi, legami, cariche, radicali (vedi molecole.js per l'intestazione).
//
// Una molecola è { atomi: [{ Z, q, h, r, ar, chir, ord }], legami: [{ a, b, o, t, ar }], vic }:
//   Z numero atomico · q carica formale · h idrogeni attaccati (gli idrogeni non sono nodi: stanno sul loro atomo; un
//   idrogeno è un nodo solo quando è solo, H⁺, H•, o quando fa H₂) · r elettroni spaiati (ricavati) · ar aromatico
//   (ricavato) · chir ±1 e ord: la chiralità, come in SMILES (guardando dal primo vicino di «ord», gli altri tre girano
//   in senso antiorario se +1; −1 in «ord» è l'idrogeno);
//   legame: o ordine (1, 2, 3; 0 se ionico) · t tipo: 'c' covalente, 'd' dativo (da a verso b: la coppia è di a),
//   'i' ionico (due ioni tenuti insieme dalla carica) · ar delocalizzato in un anello aromatico (ricavato).
// LEGGI: la regola dell'ottetto e del duetto con le valenze di molecole_atomi.js (valida); l'aromaticità di Hückel
// (4n + 2 elettroni π in un anello piano); le priorità di Cahn, Ingold e Prelog per R e S.
// NOTAZIONE: SMILES semplificato. Atomi B C N O P S F Cl Br (idrogeni sottintesi) o tra quadre [Fe+2], [NH4+], [C@H];
// minuscoli gli aromatici; legami - = # ; rami ( ) ; anelli con le cifre; «.» separa; in più «->» e «<-» il legame dativo
// e «~» quello ionico. Non letti: / e \ (cis e trans dei doppi legami: vedi SEMPLIFICAZIONI in molecole.js), isotopi.
// LA CHIAVE (chiave): la stessa notazione scritta in un ordine che dipende solo dal grafo (raffinamento dei ranghi alla
// Morgan/Weininger, poi una visita in profondità per ranghi): stessa molecola → stessa stringa. È il suo indirizzo.

import { atomo, valenzeDi, capienzaGuscio, NUMERO, SIMBOLI } from './molecole_atomi.js';

const ORGANICI = new Set([5, 6, 7, 8, 15, 16, 9, 17, 35]), AROMATICI = new Set([5, 6, 7, 8, 15, 16]);
const errore = (s) => { throw new Error(`molecole: ${s}`); };

// ---------- lettura
export function leggi(testo) {
  const s = String(testo).trim(), atomi = [], legami = [], pila = [], aperti = new Map(); let prec = -1, leg = null, i = 0;
  const lega = (a, b, sim) => { const ar = sim === ':' || (sim == null && atomi[a]._min && atomi[b]._min);
    legami.push(sim === '>' ? { a, b, o: 1, t: 'd' } : sim === '<' ? { a: b, b: a, o: 1, t: 'd' } : sim === '~' ? { a, b, o: 0, t: 'i' } : { a, b, o: sim === '=' ? 2 : sim === '#' ? 3 : 1, t: 'c', _ar: ar, _dir: sim === '/' || sim === '\\' ? sim : null }); };
  const nuovo = (at) => { atomi.push(at); const k = atomi.length - 1; at.ord = prec >= 0 ? [prec] : []; if (at._quadre && at.h > 0) at.ord.push(-1);
    if (prec >= 0) { lega(prec, k, leg); atomi[prec].ord.push(k); } prec = k; leg = null; };
  while (i < s.length) {
    const c = s[i];
    if (c === '(') { pila.push(prec); i++; } else if (c === ')') { prec = pila.pop() ?? errore(`parentesi in ${s}`); i++; }
    else if (c === '.') { prec = -1; leg = null; i++; }
    else if (c === '-' && s[i + 1] === '>') { leg = '>'; i += 2; } else if (c === '<' && s[i + 1] === '-') { leg = '<'; i += 2; }
    else if ('-=#:~/\\'.includes(c)) { leg = c; i++; }
    else if (c === '%' || (c >= '0' && c <= '9')) {
      const n = c === '%' ? +s.slice(i + 1, i + 3) : +c; i += c === '%' ? 3 : 1; if (prec < 0) errore(`anello senza atomo in ${s}`);
      if (aperti.has(n)) { const ap = aperti.get(n); aperti.delete(n); lega(ap.atomo, prec, leg ?? ap.sim); atomi[ap.atomo].ord[ap.posto] = prec; atomi[prec].ord.push(ap.atomo); }
      else { aperti.set(n, { atomo: prec, sim: leg, posto: atomi[prec].ord.length }); atomi[prec].ord.push(-2); }
      leg = null;
    } else if (c === '[') {
      const m = /^\[(\d+)?([A-Z][a-z]?|[bcnops])(@@?)?(H\d*)?([+-]+\d*)?\]/.exec(s.slice(i)); if (!m) errore(`atomo illeggibile in ${s} alla posizione ${i}`);
      const min = m[2] >= 'a', sim = min ? m[2].toUpperCase() : m[2], Z = NUMERO[sim] ?? errore(`elemento ${sim} non previsto`);
      const car = m[5] ? (/\d/.test(m[5]) ? +(m[5][0] + m[5].replace(/[+-]/g, '')) : (m[5][0] === '+' ? 1 : -1) * m[5].length) : 0;
      nuovo({ Z, q: car, h: m[4] ? (m[4].length > 1 ? +m[4].slice(1) : 1) : 0, chir: m[3] ? (m[3] === '@' ? 1 : -1) : 0, _quadre: true, _min: min }); i += m[0].length;
    } else {
      const due = s.slice(i, i + 2), sim = due === 'Cl' || due === 'Br' ? due : c, min = sim >= 'a', Z = NUMERO[min ? sim.toUpperCase() : sim];
      if (!Z || !(ORGANICI.has(Z) && (!min || AROMATICI.has(Z)))) errore(`simbolo «${sim}» illeggibile in ${s}`);
      nuovo({ Z, q: 0, h: -1, chir: 0, _min: min }); i += sim.length;
    }
  }
  if (aperti.size || pila.length) errore(`anelli o parentesi non chiusi in ${s}`);
  // gli idrogeni sottintesi: ciò che manca alla valenza più piccola che basta
  const somma = atomi.map(() => 0); for (const l of legami) if (l.t === 'c') { somma[l.a] += l.o; somma[l.b] += l.o; }
  atomi.forEach((a, k) => { if (a.h < 0) { const bs = somma[k] + (a._min ? 1 : 0), V = valenzeDi(a.Z, 0), v = a._min ? V[0] : V.find((x) => x >= bs); a.h = v > bs ? v - bs : 0; } });
  // gli aromatici scritti in minuscolo: si mettono i doppi legami (una delle forme di Kekulé; poi «percepisci» li riconosce)
  const serve = atomi.map((a, k) => { if (!a._min) return false; const sg = somma[k] + a.h, V = valenzeDi(a.Z, a.q); return !V.includes(sg) && V.some((v) => v > sg); });
  const quali = serve.map((v, k) => (v ? k : -1)).filter((k) => k >= 0);
  if (quali.length) {
    const vicA = atomi.map(() => []); legami.forEach((l, k) => { if (l._ar && serve[l.a] && serve[l.b]) { vicA[l.a].push([l.b, k]); vicA[l.b].push([l.a, k]); } });
    const coppia = new Map();
    const prova = () => { let a = -1, meno = 99; for (const k of quali) if (!coppia.has(k)) { const lib = vicA[k].filter(([j]) => !coppia.has(j)).length; if (lib < meno) { meno = lib; a = k; } }
      if (a < 0) return true; for (const [j, k] of vicA[a]) { if (coppia.has(j)) continue; coppia.set(a, k); coppia.set(j, k); if (prova()) return true; coppia.delete(a); coppia.delete(j); } return false; };
    if (!prova()) errore(`anello aromatico impossibile in ${s}`);
    for (const k of new Set(coppia.values())) legami[k].o = 2;
  }
  // cis e trans: «/» e «\\» sui legami accanto a un doppio legame dicono da che parte sta il sostituente (scritto X/Y: Y sta
  // sopra X). ez = { p, q, cis }: il vicino p del primo atomo e il vicino q del secondo stanno dalla stessa parte, o no.
  for (const l of legami) { if (l.o !== 2 || l.t !== 'c') continue; const lato = (x, altro) => { for (const d of legami) { if (!d._dir || d === l) continue; if (d.a === x && d.b !== altro) return [d.b, d._dir === '/' ? 1 : -1]; if (d.b === x && d.a !== altro) return [d.a, d._dir === '/' ? -1 : 1]; } return null; };
    const A = lato(l.a, l.b), B = lato(l.b, l.a); if (A && B) l.ez = { p: A[0], q: B[0], cis: A[1] === B[1] }; }
  return molecola({ atomi, legami });
}

// ---------- normalizzazione: da un grafo grezzo { atomi, legami } alla molecola con i suoi campi ricavati
const LETTE = new Map(); // (memoria delle stringhe già lette: una molecola letta non cambia più)
export function molecola(x) {
  if (typeof x === 'string') { let m = LETTE.get(x); if (!m) { m = leggi(x); if (LETTE.size > 50000) LETTE.clear(); LETTE.set(x, m); } return m; }
  if (x && x._molecola) return x;
  let atomi = x.atomi.map((a) => ({ Z: a.Z, q: a.q || 0, h: a.h || 0, r: 0, ar: false, chir: a.chir || 0, ord: a.chir && a.ord ? a.ord.slice() : null }));
  let legami = x.legami.filter((l) => l.a !== l.b).map((l) => ({ a: l.a, b: l.b, o: l.t === 'i' ? 0 : l.o || 1, t: l.t || 'c', ar: false, ez: l.ez && l.o === 2 ? { p: l.ez.p, q: l.ez.q, cis: !!l.ez.cis } : null }));
  // gli idrogeni scritti come atomi tornano sul loro atomo
  const grado = atomi.map(() => 0); for (const l of legami) { grado[l.a]++; grado[l.b]++; }
  const via = new Set();
  legami.forEach((l, k) => { if (l.t !== 'c' || l.o !== 1) return; for (const [hh, su] of [[l.a, l.b], [l.b, l.a]]) { const H = atomi[hh];
    if (H.Z === 1 && !H.q && !H.h && grado[hh] === 1 && !via.has(hh) && !via.has(su) && (atomi[su].Z !== 1 || su < hh || grado[su] > 1)) { via.add(hh); atomi[su].h++; l._via = true; if (atomi[su].ord) atomi[su].ord = atomi[su].ord.map((v) => (v === hh ? -1 : v)); break; } } });
  if (via.size) { const nuovoIndice = []; let n = 0; atomi.forEach((a, k) => { nuovoIndice[k] = via.has(k) ? -1 : n++; });
    atomi = atomi.filter((a, k) => !via.has(k)); legami = legami.filter((l) => !l._via).map((l) => ({ ...l, a: nuovoIndice[l.a], b: nuovoIndice[l.b], ez: l.ez && nuovoIndice[l.ez.p] >= 0 && nuovoIndice[l.ez.q] >= 0 ? { p: nuovoIndice[l.ez.p], q: nuovoIndice[l.ez.q], cis: l.ez.cis } : null }));
    for (const a of atomi) if (a.ord) a.ord = a.ord.map((v) => (v < 0 ? v : nuovoIndice[v])); }
  const vic = atomi.map(() => []); legami.forEach((l, k) => { vic[l.a].push({ j: l.b, k }); vic[l.b].push({ j: l.a, k }); });
  const m = { atomi, legami, vic, _molecola: true };
  // gli elettroni spaiati: ciò che manca alla valenza
  atomi.forEach((a, k) => { const bs = sommaLegami(m, k), V = valenzeDi(a.Z, a.q); a.r = V.includes(bs) || atomo(a.Z).blocco === 'd' ? 0 : Math.max(0, (V.find((v) => v > bs) ?? bs) - bs); });
  percepisci(m);
  // (un cis/trans vale solo su un doppio legame non aromatico i cui vicini di riferimento ci sono ancora)
  for (const l of legami) if (l.ez && (l.o !== 2 || l.ar || l.t !== 'c' || !vic[l.a].some((v) => v.j === l.ez.p && v.j !== l.b) || !vic[l.b].some((v) => v.j === l.ez.q && v.j !== l.a))) l.ez = null;
  for (const a of atomi) if (a.chir && (!a.ord || a.ord.length !== 4)) { a.chir = 0; a.ord = null; }
  return m;
}
// la somma degli ordini dei legami covalenti di un atomo, idrogeni compresi
export const sommaLegami = (m, k) => { let s = m.atomi[k].h; for (const v of m.vic[k]) if (m.legami[v.k].t === 'c') s += m.legami[v.k].o; return s; };
// le coppie solitarie di un atomo (quelle date in un legame dativo non sono più libere)
export function coppieSolitarie(m, k) {
  const a = m.atomi[k], A = atomo(a.Z); if (A.blocco === 'd') return 0;
  let dati = 0; for (const v of m.vic[k]) { const l = m.legami[v.k]; if (l.t === 'd' && l.a === k) dati++; }
  return Math.max(0, Math.floor((A.elettroniValenza - a.q - sommaLegami(m, k) - a.r) / 2) - dati);
}
// i vicini σ di un atomo (legami covalenti e dativi; non gli ionici), e il numero sterico: vicini + idrogeni + coppie
export const viciniSigma = (m, k) => m.vic[k].filter((v) => m.legami[v.k].t !== 'i');
export const sterico = (m, k) => viciniSigma(m, k).length + m.atomi[k].h + coppieSolitarie(m, k) + (m.atomi[k].r ? 1 : 0);

// ---------- anelli: per ogni legame, il ciclo più corto che lo contiene (fino a 8 atomi)
export function anelli(m) {
  if (m._anelli) return m._anelli;
  const visti = new Set(), out = [], n = m.atomi.length;
  for (let k = 0; k < m.legami.length; k++) {
    const { a, b, t } = m.legami[k]; if (t === 'i' || m.vic[a].length < 2 || m.vic[b].length < 2) continue;
    const da = new Map([[a, -1]]); let fronte = [a], trovato = false;
    for (let passo = 0; passo < 7 && fronte.length && !trovato; passo++) { const poi = [];
      for (const u of fronte) { for (const v of m.vic[u]) { if (v.k === k || m.legami[v.k].t === 'i' || da.has(v.j)) continue; da.set(v.j, u); if (v.j === b) { trovato = true; break; } poi.push(v.j); } if (trovato) break; }
      fronte = poi; }
    if (!trovato) continue;
    const anello = []; for (let u = b; u !== -1; u = da.get(u)) anello.push(u);
    const ch = anello.slice().sort((x, y) => x - y).join(','); if (!visti.has(ch)) { visti.add(ch); out.push(anello); }
  }
  Object.defineProperty(m, '_anelli', { value: out, enumerable: false }); void n;
  return out;
}
// l'aromaticità (Hückel): un anello di 5-7 atomi tutti con un orbitale p, e 4n + 2 elettroni π. Ogni atomo dà: 1 se ha
// un doppio legame nell'anello (o in un anello accanto), 2 se non ne ha ma ha una coppia solitaria, 0 se ha un orbitale
// vuoto o un doppio legame verso un atomo fuori (C=O).
function percepisci(m) {
  const rr = anelli(m).filter((r) => r.length >= 5 && r.length <= 7); if (!rr.length) return;
  const inAnello = new Set(anelli(m).flat()), fatto = rr.map(() => false);
  for (let giro = 0; giro < 4; giro++) { let nuovi = 0;
    rr.forEach((r, q) => { if (fatto[q]) return; const dentro = new Set(r); let pi = 0;
      for (const k of r) { const a = m.atomi[k]; let c = -1;
        for (const v of m.vic[k]) { const l = m.legami[v.k]; if (l.t !== 'c') continue; if (l.o === 3) { c = -9; break; } if (l.o === 2) c = dentro.has(v.j) ? 1 : inAnello.has(v.j) && (m.atomi[v.j].ar || m.atomi[k].ar) ? 1 : m.atomi[v.j].Z === 6 && !inAnello.has(v.j) ? -9 : 0; }
        if (c === -1) c = a.ar ? 1 : coppieSolitarie(m, k) > 0 && a.Z !== 6 ? 2 : a.Z === 6 && a.q === -1 ? 2 : (a.Z === 5 || (a.Z === 6 && a.q === 1)) ? 0 : -9;
        if (c < 0) return; pi += c; }
      if (pi % 4 === 2) { fatto[q] = true; nuovi++; for (const k of r) m.atomi[k].ar = true; for (const l of m.legami) if (dentro.has(l.a) && dentro.has(l.b) && l.t === 'c') l.ar = true; } });
    if (!nuovi) break; }
}

// ---------- è una molecola possibile?
// Per ogni atomo: i legami che fa devono essere una delle sue valenze (o meno: allora ha elettroni spaiati, o un
// orbitale vuoto); gli elettroni nel guscio di valenza (i suoi, più uno per ogni legame, più due per ogni coppia che
// riceve) non possono superare la capienza: 2 per H, 8 nel secondo periodo, 12 o 18 più giù; chi dà una coppia deve averla.
// → { ok, problemi: [testo], aperti: [{ atomo, che }] } (aperti: radicali, orbitali vuoti: molecole possibili ma reattive)
export function valida(x) {
  let m; try { m = molecola(x); } catch (e) { return { ok: false, problemi: [e.message], aperti: [] }; }
  const problemi = [], aperti = [];
  m.atomi.forEach((a, k) => {
    const A = atomo(a.Z), ev = A.elettroniValenza - a.q, bs = sommaLegami(m, k), V = valenzeDi(a.Z, a.q), nome = `${A.simbolo}${k}`;
    let ricevute = 0, date = 0; for (const v of m.vic[k]) { const l = m.legami[v.k]; if (l.t === 'd') { if (l.b === k) ricevute++; else date++; } }
    if (ev < 0) { problemi.push(`${nome}: carica ${a.q} oltre i suoi elettroni di valenza`); return; }
    if (!V.length) { problemi.push(`${nome}: con carica ${a.q} non ha valenze`); return; }
    if (bs > Math.max(...V)) { problemi.push(`${nome}: ${bs} legami, più della valenza ${Math.max(...V)}`); return; }
    const guscio = ev + bs + 2 * ricevute, cap = capienzaGuscio(a.Z);
    if (guscio > cap) problemi.push(`${nome}: ${guscio} elettroni nel guscio (capienza ${cap})`);
    if (date > 0 && Math.floor((ev - bs - a.r) / 2) < date) problemi.push(`${nome}: dà ${date} coppie ma non le ha`);
    if (a.Z === 1 && a.h > 1) problemi.push(`${nome}: tre idrogeni insieme`);
    if (a.r) aperti.push({ atomo: k, che: a.r === 1 ? 'radicale' : `${a.r} elettroni spaiati` });
    else if (A.blocco !== 'd' && !A.metallo && guscio < (A.periodo === 1 ? 2 : 8) && ev > 0) aperti.push({ atomo: k, che: 'orbitale vuoto' });
  });
  return { ok: problemi.length === 0, problemi, aperti };
}

// ---------- i ranghi canonici e la chiave
const segnoPermutazione = (da, a) => { const p = da.map((v) => a.indexOf(v)); let s = 1; for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) if (p[i] > p[j]) s = -s; return s; };
const codiceLegame = (l, k) => (l.t === 'i' ? 'i' : l.t === 'd' ? (l.a === k ? 'd' : 'e') : l.ar ? 'a' : String(l.o));
const CODICE = { i: 0, d: 1, e: 2, a: 3, 1: 4, 2: 5, 3: 6 };
export function ranghi(m) {
  if (m._ranghi) return m._ranghi;
  const n = m.atomi.length, inAnello = new Set(anelli(m).flat()), ord = new Array(n);
  // (tutto con numeri: il rango di un atomo e un'impronta dei ranghi dei suoi vicini; è la parte che la rete chiama più spesso)
  const denso = (ch) => { for (let i = 0; i < n; i++) ord[i] = i; ord.sort((x, y) => ch[x] - ch[y]); const c = new Array(n); let r = -1, prec = NaN; for (const i of ord) { if (ch[i] !== prec) { r++; prec = ch[i]; } c[i] = r; } return [c, r + 1]; };
  let [cls, quante] = denso(m.atomi.map((a, k) => (((((a.Z * 9 + a.q + 4) * 6 + Math.min(a.h, 5)) * 10 + Math.min(m.vic[k].length, 9)) * 2 + (a.ar ? 1 : 0)) * 6 + Math.min(a.r, 5)) * 2 + (inAnello.has(k) ? 1 : 0)));
  const cod = m.vic.map((vv, k) => vv.map((v) => CODICE[codiceLegame(m.legami[v.k], k)])), tmp = [];
  const raffina = () => { for (let giro = 0; giro < n + 2; giro++) { const ch = new Array(n);
      for (let k = 0; k < n; k++) { const vv = m.vic[k]; tmp.length = vv.length; for (let i = 0; i < vv.length; i++) tmp[i] = cod[k][i] * n + cls[vv[i].j] + 1; if (vv.length > 1) tmp.sort((x, y) => x - y); let h = 7; for (let i = 0; i < tmp.length; i++) h = (h * 1000003 + tmp[i]) % 2147483647; ch[k] = cls[k] * 2147483648 + h; }
      const [c2, q2] = denso(ch), fermo = q2 === quante; cls = c2; quante = q2; if (fermo) break; } };
  raffina();
  // la chiralità entra nei ranghi dove i quattro vicini sono già distinti
  const centri = []; m.atomi.forEach((a, k) => { if (!a.chir) return; const cl = a.ord.map((v) => (v < 0 ? -1 : cls[v])); if (new Set(cl).size === 4) centri.push([k, a.chir * segnoPermutazione(cl, cl.slice().sort((x, y) => x - y))]); });
  if (centri.length) { const par = new Map(centri); [cls, quante] = denso(cls.map((c, k) => c * 3 + (par.get(k) > 0 ? 0 : par.has(k) ? 1 : 2))); raffina(); }
  const simm = cls.slice(); // (le classi di simmetria, prima delle scelte arbitrarie)
  // gli atomi ancora alla pari sono simmetrici: se ne sceglie uno, e si raffina di nuovo
  while (quante < n) { const conta = new Array(quante).fill(0); for (const c of cls) conta[c]++; let c0 = 0; while (conta[c0] < 2) c0++; const scelto = cls.indexOf(c0);
    [cls, quante] = denso(cls.map((c, k) => c * 2 + (k === scelto ? 0 : 1))); raffina(); }
  Object.defineProperty(m, '_ranghi', { value: { cls, centri: new Set(centri.map(([k]) => k)), simm }, enumerable: false });
  return m._ranghi;
}
const hSottintesi = (m, k) => { const a = m.atomi[k]; let bs = a.ar ? 1 : 0; for (const v of m.vic[k]) { const l = m.legami[v.k]; if (l.t === 'c') bs += l.ar ? 1 : l.o; } const V = valenzeDi(a.Z, 0), v = a.ar ? V[0] : V.find((x) => x >= bs); return v > bs ? v - bs : 0; };
export function chiave(x) {
  const m = molecola(x); if (m._chiave) return m._chiave;
  const { cls, centri, simm } = ranghi(m), n = m.atomi.length, visto = new Array(n).fill(false), figli = m.atomi.map(() => []), chiusure = m.atomi.map(() => []), padre = new Array(n).fill(-1), legameDelPadre = new Array(n).fill(-1), segnoEZ = new Map();
  const scendi = (a, legPadre) => { visto[a] = true;
    for (const v of m.vic[a].slice().sort((x, y) => cls[x.j] - cls[y.j])) { if (v.k === legPadre) continue; if (visto[v.j]) { if (!chiusure[a].some((c) => c.k === v.k)) { chiusure[a].push(v); chiusure[v.j].push({ j: a, k: v.k }); } } else { padre[v.j] = a; legameDelPadre[v.j] = v.k; figli[a].push(v); scendi(v.j, v.k); } } };
  // cis e trans: un segno «/» o «\\» sul legame dell'albero verso il vicino di rango più basso di ciascuno dei due atomi
  const segnaEZ = () => { m.legami.forEach((l) => { if (!l.ez) return;
    const scegli = (x, y, rif) => { const altri = m.vic[x].filter((v) => v.j !== y && m.legami[v.k].t === 'c' && m.legami[v.k].o === 1); if (!altri.length || altri.length + m.atomi[x].h !== 2 || (altri.length === 2 && simm[altri[0].j] === simm[altri[1].j])) return null;
      const al = altri.filter((v) => legameDelPadre[v.j] === v.k || legameDelPadre[x] === v.k).sort((p, q) => cls[p.j] - cls[q.j])[0]; return al ? { j: al.j, k: al.k, inverti: al.j !== rif, padre: legameDelPadre[x] === al.k } : null; };
    const A = scegli(l.a, l.b, l.ez.p), B = scegli(l.b, l.a, l.ez.q); if (!A || !B) return; const cis = l.ez.cis !== (A.inverti !== B.inverti);
    const sA = segnoEZ.get(A.k) || '/', latoA = (sA === '/') === A.padre ? -1 : 1, latoB = cis ? latoA : -latoA, sB = (latoB > 0) === B.padre ? '\\' : '/';
    if (segnoEZ.has(B.k) && segnoEZ.get(B.k) !== sB) return; segnoEZ.set(A.k, sA); segnoEZ.set(B.k, sB); }); };
  const simboloLegame = (k, da, verso) => { const l = m.legami[k]; if (segnoEZ.has(k)) return segnoEZ.get(k); return l.t === 'i' ? '~' : l.t === 'd' ? (l.a === da ? '->' : '<-') : l.ar ? '' : l.o === 2 ? '=' : l.o === 3 ? '#' : m.atomi[da].ar && m.atomi[verso].ar ? '-' : ''; };
  const cifre = new Map(); let libere = [];
  const scriviAtomo = (a, ordineScritto) => { const at = m.atomi[a], A = atomo(at.Z), min = at.ar && AROMATICI.has(at.Z), stereo = at.chir && centri.has(a);
    if (ORGANICI.has(at.Z) && !at.q && !stereo && at.h === hSottintesi(m, a)) return min ? A.simbolo.toLowerCase() : A.simbolo;
    const ch = stereo ? (at.chir * segnoPermutazione(at.ord, ordineScritto) > 0 ? '@' : '@@') : '';
    return `[${min ? A.simbolo.toLowerCase() : A.simbolo}${ch}${at.h ? 'H' + (at.h > 1 ? at.h : '') : ''}${at.q ? (at.q > 0 ? '+' : '-') + (Math.abs(at.q) > 1 ? Math.abs(at.q) : '') : ''}]`; };
  const scrivi = (a) => { let anelli_ = ''; const ordine = padre[a] >= 0 ? [padre[a]] : []; if (m.atomi[a].h) ordine.push(-1);
    for (const c of chiusure[a].slice().sort((x, y) => cls[x.j] - cls[y.j])) { ordine.push(c.j);
      if (cifre.has(c.k)) { const d = cifre.get(c.k); anelli_ += d > 9 ? '%' + d : d; libere.push(d); libere.sort((x, y) => x - y); cifre.delete(c.k); }
      else { let d = libere.length ? libere.shift() : (cifre._max = (cifre._max || 0) + 1); cifre.set(c.k, d); anelli_ += simboloLegame(c.k, a, c.j) + (d > 9 ? '%' + d : d); } }
    for (const f of figli[a]) ordine.push(f.j);
    let s = scriviAtomo(a, ordine) + anelli_;
    figli[a].forEach((f, i) => { const ramo = simboloLegame(f.k, a, f.j) + scrivi(f.j); s += i < figli[a].length - 1 ? `(${ramo})` : ramo; });
    return s; };
  const pezzi = []; const perRango = m.atomi.map((_, k) => k).sort((x, y) => cls[x] - cls[y]);
  for (const k of perRango) if (!visto[k]) { scendi(k, -1); segnoEZ.clear(); segnaEZ(); cifre.clear(); cifre._max = 0; libere = []; pezzi.push(scrivi(k)); }
  const ch = pezzi.sort().join('.');
  Object.defineProperty(m, '_chiave', { value: ch, enumerable: false });
  return ch;
}

// ---------- formula, massa, carica, pezzi
export function conta(x) { const m = molecola(x), c = {}; for (const a of m.atomi) { const s = SIMBOLI[a.Z]; c[s] = (c[s] || 0) + 1; if (a.h) c.H = (c.H || 0) + a.h; } return c; }
export const carica = (x) => molecola(x).atomi.reduce((s, a) => s + a.q, 0);
export const massa = (x) => Object.entries(conta(x)).reduce((s, [el, n]) => s + n * atomo(el).massa, 0);
export function formula(x) { const c = conta(x), q = carica(x), el = Object.keys(c).sort((a, b) => (c.C ? (a === 'C' ? -1 : b === 'C' ? 1 : a === 'H' ? -1 : b === 'H' ? 1 : 0) : 0) || (a < b ? -1 : 1));
  return el.map((e) => e + (c[e] > 1 ? c[e] : '')).join('') + (q ? (Math.abs(q) > 1 ? Math.abs(q) : '') + (q > 0 ? '+' : '-') : ''); }
// i pezzi non collegati (anche «~», il legame ionico, tiene insieme)
export function componenti(x) {
  const m = molecola(x), n = m.atomi.length, di = new Array(n).fill(-1); let q = 0;
  for (let s = 0; s < n; s++) { if (di[s] >= 0) continue; const pila = [s]; di[s] = q; while (pila.length) { const u = pila.pop(); for (const v of m.vic[u]) if (di[v.j] < 0) { di[v.j] = q; pila.push(v.j); } } q++; }
  if (q === 1) return [m];
  const out = [];
  for (let c = 0; c < q; c++) { const idx = new Map(); m.atomi.forEach((a, k) => { if (di[k] === c) idx.set(k, idx.size); });
    out.push(molecola({ atomi: [...idx.keys()].map((k) => ({ ...m.atomi[k], ord: m.atomi[k].ord ? m.atomi[k].ord.map((v) => (v < 0 ? v : idx.get(v))) : null })), legami: m.legami.filter((l) => idx.has(l.a)).map((l) => ({ ...l, a: idx.get(l.a), b: idx.get(l.b), ez: l.ez ? { p: idx.get(l.ez.p), q: idx.get(l.ez.q), cis: l.ez.cis } : null })) })); }
  return out;
}
// una copia che si può modificare (per le reazioni): poi molecola(copia) la rimette in ordine
export const grezzo = (x) => { const m = molecola(x); return { atomi: m.atomi.map((a) => ({ Z: a.Z, q: a.q, h: a.h, chir: a.chir, ord: a.ord ? a.ord.slice() : null })), legami: m.legami.map((l) => ({ a: l.a, b: l.b, o: l.o, t: l.t, ez: l.ez ? { ...l.ez } : null })) }; };
// più molecole in un grafo solo (per le reazioni tra due molecole): → { grezzo, inizio: [indice del primo atomo di ognuna] }
export function unisci(...ms) { const g = { atomi: [], legami: [] }, inizio = [];
  for (const x of ms) { const m = grezzo(x), d = g.atomi.length; inizio.push(d); for (const a of m.atomi) { if (a.ord) a.ord = a.ord.map((v) => (v < 0 ? v : v + d)); g.atomi.push(a); } for (const l of m.legami) g.legami.push({ ...l, a: l.a + d, b: l.b + d, ez: l.ez ? { p: l.ez.p + d, q: l.ez.q + d, cis: l.ez.cis } : null }); }
  return { grezzo: g, inizio }; }

// ---------- chiralità: R e S (Cahn, Ingold, Prelog)
// La priorità di un sostituente: il numero atomico, e a parità gli atomi che seguono, sfera per sfera (un legame doppio
// conta l'atomo due volte). Semplificata: confronta le sfere intere, non ramo per ramo (basta per amminoacidi e zuccheri).
function prioritaCIP(m, centro, primo) {
  if (primo < 0) return [[1]];
  const sfere = [[m.atomi[primo].Z]]; let fronte = [[primo, centro]]; const visti = new Set([centro, primo]);
  for (let d = 0; d < 6 && fronte.length; d++) { const zz = [], poi = [];
    for (const [u, da] of fronte) { const a = m.atomi[u]; for (let i = 0; i < a.h; i++) zz.push(1);
      for (const v of m.vic[u]) { const l = m.legami[v.k]; if (l.t === 'i') continue; if (v.j === da) { for (let i = 1; i < l.o; i++) zz.push(m.atomi[da].Z); continue; }
        zz.push(m.atomi[v.j].Z); for (let i = 1; i < (l.ar ? 2 : l.o); i++) zz.push(m.atomi[v.j].Z); if (!visti.has(v.j)) { visti.add(v.j); poi.push([v.j, u]); } } }
    sfere.push(zz.sort((x, y) => y - x)); fronte = poi; }
  return sfere;
}
const confrontaCIP = (A, B) => { for (let d = 0; d < Math.max(A.length, B.length); d++) { const a = A[d] || [], b = B[d] || []; for (let i = 0; i < Math.max(a.length, b.length); i++) { const x = a[i] || 0, y = b[i] || 0; if (x !== y) return x - y; } } return 0; };
// → [{ atomo, RS: 'R' | 'S' | null (centro non assegnato) }] per ogni centro con quattro sostituenti diversi
export function chiralita(x) {
  const m = molecola(x), { cls } = ranghi(m), out = [];
  m.atomi.forEach((a, k) => {
    const vicini = viciniSigma(m, k).map((v) => v.j); if (vicini.length + a.h !== 4 || a.h > 1) return;
    // (diversi davvero: i ranghi senza scelte arbitrarie non bastano qui, si usano le priorità)
    const sost = (a.h ? [-1] : []).concat(vicini), pr = sost.map((s) => prioritaCIP(m, k, s)), ordine = sost.map((_, i) => i).sort((i, j) => confrontaCIP(pr[i], pr[j]));
    for (let i = 0; i < 3; i++) if (confrontaCIP(pr[ordine[i]], pr[ordine[i + 1]]) === 0) return;
    if (!a.chir) { out.push({ atomo: k, RS: null }); return; }
    const basso = ordine.map((i) => sost[i]), bersaglio = [basso[0], basso[3], basso[2], basso[1]];
    out.push({ atomo: k, RS: a.chir * segnoPermutazione(a.ord, bersaglio) > 0 ? 'R' : 'S' }); void cls;
  });
  return out;
}
// tutte le forme di una molecola che ha centri chirali o doppi legami non assegnati (fino a 16): gli enantiomeri, i
// diastereomeri, i cis e i trans, ognuno una molecola con la sua chiave. Una molecola già tutta assegnata dà sé stessa.
export function stereoisomeri(x, massimo = 16) {
  const m = molecola(x), { simm } = ranghi(m), centri = chiralita(m).filter((c) => !c.RS).map((c) => c.atomo), inAnello = new Set(anelli(m).flat()), doppi = [];
  m.legami.forEach((l, k) => { if (l.ez || l.o !== 2 || l.ar || l.t !== 'c' || (inAnello.has(l.a) && inAnello.has(l.b))) return; const lato = (x_, y) => { const altri = m.vic[x_].filter((v) => v.j !== y && m.legami[v.k].o === 1 && m.legami[v.k].t === 'c'); return altri.length && altri.length + m.atomi[x_].h === 2 && !(altri.length === 2 && simm[altri[0].j] === simm[altri[1].j]) ? altri[0].j : -1; };
    const p = lato(l.a, l.b), q = lato(l.b, l.a); if (p >= 0 && q >= 0) doppi.push([k, p, q]); });
  const nn = centri.length + doppi.length; if (!nn || 2 ** nn > massimo) return [m];
  const out = new Map();
  for (let s = 0; s < 2 ** nn; s++) { const g = grezzo(m); centri.forEach((c, i) => { g.atomi[c].chir = (s >> i) & 1 ? 1 : -1; g.atomi[c].ord = (m.atomi[c].h ? [-1] : []).concat(viciniSigma(m, c).map((v) => v.j)); }); doppi.forEach(([k, p, q], i) => { g.legami[k].ez = { p, q, cis: !!((s >> (centri.length + i)) & 1) }; }); const mm = molecola(g); out.set(chiave(mm), mm); }
  return [...out.values()];
}
// l'immagine allo specchio
export const speculare = (x) => { const g = grezzo(x); for (const a of g.atomi) a.chir = -a.chir; return molecola(g); };
// due molecole sono isomeri se hanno gli stessi atomi ma non sono la stessa
export const isomeri = (a, b) => formula(a) === formula(b) && chiave(a) !== chiave(b);
