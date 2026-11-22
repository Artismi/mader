// grani.js — LA MATERIA COME POPOLAZIONE: i grani di una roccia e le tracce delle particelle, ovunque attorno al punto.
//
// Una roccia non è un cristallo: è un aggregato di cristalli (o di granelli, o di grani di ghiaccio) che continua in ogni
// direzione. E in un pezzo di roccia non c'è una traccia sola: ci sono quelle di tutti gli eventi che quella materia
// ricorda. Qui due campi PIGRI e senza bordi, in metri, attorno al punto che si guarda:
//   · campoGrani: ogni grano è un evento con indirizzo («cella ix iy», estrazione k); se ne calcolano solo quelli che
//     cadono nella parte di schermo guardata, e solo se sono grandi almeno un pixel (sotto: la nebbia, col conteggio vero);
//   · popolazioneTracce: ogni decadimento, ogni raggio cosmico è un evento con indirizzo («processo/cella ix iy»,
//     estrazione k); quanti sono lo dicono i ritmi veri (materia.js) per il tempo che la materia li ricorda; se ne
//     disegnano quanti lo schermo ne può mostrare (regola 8), gli altri sono contati (regola 9).
//
// LE LEGGI (dichiarate, nessun numero scelto per l'aspetto):
//   · I CRISTALLI DI UN FUSO: nascita a ritmo costante I e crescita a velocità costante G (il plateau di rocce.js, la
//     legge di Johnson-Mehl-Avrami). Ogni punto appartiene al cristallo che ci arriva per primo: t_nascita + distanza/G
//     (la tassellatura di Johnson-Mehl, 1939; i germi nati nel già solido non vincono mai: sono i «fantasmi» di Avrami).
//     La distanza è quella «a modo del cristallo» di rocce.js (listelle per i minerali anisotropi). In sezione, la densità
//     dei grani è N = Γ(4/3)·(3/π)^⅓·(I/G)^⅔ (dall'integrale di Avrami): dato il grano medio si ricava I/G, non lo si sceglie.
//     Dove il fuso non fa in tempo (cristallino < 1) resta vetro: il tempo si ferma quando la frazione X(t) = 1 − exp(−π/3·I·G²·t³)
//     arriva al cristallino della roccia.
//   · I GRANELLI DI UN SEDIMENTO: diametri log-normali con la mediana e la «selezione» (scarto in φ = log₂) del deposito
//     simulato (rocce.js, sedimento: Shields e Stokes); posati alla rinfusa (modello booleano: copertura 1 − e^(−n·π·⟨r²⟩))
//     con la porosità di un impacchettamento casuale di sabbia, 0,38 (OSSERVATA: 0,35–0,45); dove si toccano vince la
//     distanza di potenza (Laguerre), e il resto è poro e cemento.
//   · I GRANI DEL GHIACCIO crescono con l'età (Gow 1969, costanti in Alley 1982): area media A = A₀ + K·t, con
//     K = 6,75·10⁷ mm²/anno · exp(−47,0 kJ/mol / RT). A₀ è il cristallo di neve che si posa (rocce.js, fioccoDiNeve).
//   · LA LUCE: ogni minerale ha il suo colore (i dati di rocce.js). La tinta che cambia grano per grano è quella della
//     luce polarizzata (strumento dichiarato: polarizzata = true, come la tessera di rocce.js): un cristallo birifrangente
//     tra polarizzatori incrociati è chiaro come sin²(2φ), φ il suo orientamento. Senza polarizzatori i grani di uno stesso
//     minerale hanno lo stesso colore; i bordi dei grani diffondono la luce e sono più scuri (come in rocce.js).

import { sorgente, logEsatto, cosGiro } from './eventi.js';
import { pesoDiscreto } from './eredita.js';
import { sorgentiNaturali, ritenzione, concentrazioni } from './materia.js';
import { R_GAS, ANNO } from './leggi.js'; // le costanti e le unità: un posto solo

const limita = (x, a, b) => (x < a ? a : x > b ? b : x);
const SEN = (u) => cosGiro(u - 0.25); // sen(2πu)
// Γ(4/3)·(3/π)^⅓: quanti grani per unità d'area per (I/G)^⅔ (Avrami in due dimensioni, nascita costante)
export const AVRAMI_2D = 0.8929795115692493 * Math.cbrt(3 / Math.PI);
// LA CRESCITA DEI GRANI DEL GHIACCIO (Gow 1969; Alley 1982): diametro medio (m) dopo `anni` a temperatura T (K),
// partendo da un diametro D0 (m)
export const GOW = { K0mm2: 6.75e7, E: 47.0e3, R: R_GAS };
export function granoGhiaccio(T, anni, D0) {
  const K = GOW.K0mm2 * 1e-6 * Math.exp(-GOW.E / (GOW.R * Math.max(1, T))), A = (Math.PI / 4) * D0 * D0 + K * Math.max(0, anni);
  return { D: 2 * Math.sqrt(A / Math.PI), K, A };
}
// QUANTI CRISTALLI SONO GIÀ NATI quando il fuso si ferma alla frazione cristallina X (nascita costante I, crescita G = 1, in
// sezione): N(t) = I·∫₀ᵗ (1 − X(τ)) dτ = I·∫₀ᵗ e^(−π/3·I·τ³) dτ = N(∞)·P(⅓, π/3·I·t³), con P la funzione gamma incompleta
// regolarizzata e π/3·I·t³ = −ln(1 − X). → N(X)/N(∞) (la serie di P(s, x) = x^s·e^(−x)·Σ x^k/(s(s+1)…(s+k)) / Γ(s), che
// converge per ogni x: fino a X = 0,9999, x = 9,2, bastano una cinquantina di termini)
export function natiFinoA(X) {
  if (!(X > 0)) return 0; if (X >= 1) return 1;
  const x = -Math.log(1 - X), s = 1 / 3, GAMMA_TERZO = 2.678938534707747; let t = 1 / s, somma = t;
  for (let k = 1; k < 400 && t > 1e-17 * somma; k++) { t *= x / (s + k); somma += t; }
  return Math.min(1, (Math.pow(x, s) * Math.exp(-x) * somma) / GAMMA_TERZO);
}
// un conteggio di Poisson con le estrazioni di un evento (k0, k0+1, …); sopra 30 la campana
function poisson(media, s, k0) {
  if (!(media > 0)) return 0;
  if (media > 30) { const z = Math.sqrt(-2 * logEsatto(Math.max(1e-12, s(k0)))) * cosGiro(s(k0 + 1)); return Math.max(0, Math.round(media + Math.sqrt(media) * z)); }
  const L = Math.exp(-media); let k = 0, p = s(k0); while (p > L && k < 200) { k++; p *= s(k0 + k); } return k;
}
const tela = (w, h) => (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h }));

// =====================================================================================
// I GRANI
// =====================================================================================
// spec = { modo: 'tassellatura' | 'impacchettamento', granoM (diametro medio, m), minerali: [{ nome, frazione, colore,
//   anisotropia }], cristallino (0–1, tassellatura), vetro: [r,g,b], selezione (φ, impacchettamento), porosita, matrice:
//   [r,g,b], polarizzata (vero: la tinta per orientamento), legge (a parole) }
// caso: la sorgente degli eventi di quel punto (eventi.js). → campo: { granoIn(x, y), mediaColore, conta(areaM2), dipingi(ctx, vista) }
export function campoGrani(spec, caso) {
  const S = { cristallino: 1, porosita: 0.38, selezione: 0.5, matrice: [84, 73, 62], vetro: null, polarizzata: false, ...spec };
  const u = S.granoM, M = S.minerali, tot = M.reduce((a, m) => a + m.frazione, 0) || 1, f = M.map((m) => m.frazione / tot);
  const asp = M.map((m) => 1 + 3 * limita(m.anisotropia || 0, 0, 1)), cel = caso.sotto('grani');
  const tass = S.modo !== 'impacchettamento';
  // tassellatura: densità (per u², u = il grano medio) → I/G; G = 1 (un'unità di lunghezza per unità di tempo)
  // Dove il fuso si ferma a X < 1 i cristalli sono quelli nati fino ad allora: N(X) = AVRAMI_2D·I^⅔·P(⅓, −ln(1 − X)) (vedi
  // natiFinoA). Perché il grano medio sia quello della roccia (l'area cristallina divisa per i cristalli: X·u²/(N·u²) = π/4·u²,
  // come rocce.js granoMedio) deve essere N = NA·X: è I che lo dà, non la densità di una roccia tutta cristallina.
  const NA = 4 / Math.PI, X = limita(S.cristallino, 0, 1), I = X >= 0.9999 ? Math.pow(NA / AVRAMI_2D, 1.5) : Math.pow((NA * X) / (AVRAMI_2D * natiFinoA(X)), 1.5);
  const tFine = X >= 0.9999 ? 2.4 * Math.cbrt(3 / (Math.PI * I)) : Math.cbrt((-3 * Math.log(1 - X)) / (Math.PI * I));
  // impacchettamento: n·π·⟨r²⟩ = −ln(porosità), con ⟨D²⟩ = D50²·e^(2s²), s = selezione·ln 2
  const s = S.selezione * Math.LN2, nImp = (-Math.log(S.porosita) * 4) / (Math.PI * Math.exp(2 * s * s));
  // fin dove arriva un cristallo: nel tempo t un germe raggiunge i punti a distanza «a modo del cristallo» t, cioè fino a
  // t·portata in metri-u lungo la sua direzione più veloce (le listelle: l'asse lungo, o lo spigolo delle facce piane). Si
  // cercano i germi in tutte le celle che un cristallo nato a 0 può raggiungere entro tFine (prima: sempre 5 × 5 celle, e i
  // grani allungati che arrivavano da più lontano erano persi: il punto andava a un germe più vicino e più tardo, e i grani
  // contati erano il 13% di più di quanti la legge ne dà). Per i granelli del sedimento basta il raggio più grande (1,75).
  const portataDi = (m) => { const al = Math.sqrt(asp[m]), w = limita(M[m].anisotropia || 0, 0, 1); let k = 0; for (let q = 0; q <= 720; q++) { const f = (q / 720) * (Math.PI / 2), a = Math.cos(f) / al, b = Math.sin(f) * al, e = Math.sqrt(a * a + b * b); k = Math.max(k, 1 / (w ? e + w * (1.13 * Math.max(a, b) - e) : e)); } return k * 1.01; };
  const portata = tass ? Math.max(...M.map((m, i) => portataDi(i))) : 1;
  const lam = tass ? I * tFine : nImp, R = tass ? Math.max(2, Math.ceil(tFine * portata)) : 2; // germi per cella (cella = u × u); si cerca nelle (2R + 1)² celle attorno
  const memo = new Map();
  // I GERMI DI UNA CELLA: eventi con indirizzo («grani/cella ix iy», estrazioni 0… : quanti, poi 6 per germe)
  function germi(ix, iy) {
    const k = ix * 73856093 ^ iy * 19349663; let l = memo.get(k);
    if (l && l.ix === ix && l.iy === iy) return l;
    const sr = cel.serie(`cella ${ix} ${iy}`), n = poisson(lam, sr, 0); l = []; l.ix = ix; l.iy = iy;
    for (let j = 0; j < n; j++) {
      const b = 210 + 6 * j, dado = sr(b + 3); let m = 0, acc = f[0]; while (m < M.length - 1 && dado > acc) acc += f[++m];
      const phi = sr(b + 4) * 0.5, al = Math.sqrt(asp[m]), g = { x: ix + sr(b), y: iy + sr(b + 1), m, phi, c: cosGiro(phi), s: SEN(phi), al, w: limita(M[m].anisotropia || 0, 0, 1), id: `cella ${ix} ${iy}/${j}` };
      if (tass) g.t = tFine * sr(b + 2); else { const z = Math.sqrt(-2 * logEsatto(Math.max(1e-12, sr(b + 2)))) * cosGiro(sr(b + 5)); g.r = Math.min(1.75, 0.5 * Math.exp(s * z)); }
      l.push(g);
    }
    if (tass) l.sort((a, b) => a.t - b.t);
    if (memo.size > 60000) memo.clear(); memo.set(k, l); return l;
  }
  // la distanza «a modo del cristallo» (rocce.js): più corta lungo l'asse veloce, con le facce piane dei minerali anisotropi
  const dist = (g, x, y) => { const dx = x - g.x, dy = y - g.y, a = Math.abs(dx * g.c + dy * g.s) / g.al, b = Math.abs(dy * g.c - dx * g.s) * g.al, e = Math.sqrt(a * a + b * b); return g.w ? e + g.w * (1.13 * Math.max(a, b) - e) : e; };
  // le celle attorno, dalle più vicine: così i primi arrivi si trovano presto e le celle lontane si saltano senza guardarle
  const ORDINE = []; { const c = []; for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) c.push([i, j]); c.sort((a, b) => Math.max(Math.abs(a[0]), Math.abs(a[1])) - Math.max(Math.abs(b[0]), Math.abs(b[1])) || a[0] * a[0] + a[1] * a[1] - b[0] * b[0] - b[1] * b[1]); for (const [i, j] of c) ORDINE.push(i, j); }
  // UN GERME È VERO se quando nasce il suo posto è ancora fuso: nessun germe vero nato prima ci è già arrivato. Con una sola
  // legge di crescita (grani tondi) un fantasma non vince mai un punto (disuguaglianza triangolare) e la prova non serve;
  // con le listelle orientate a caso sì: un germe nato dentro il lato lento di un cristallo arriverebbe prima di lui lungo
  // il proprio asse veloce, e i grani contati sarebbero più di quanti ne nascono (misurato: il 13% con anisotropia 1).
  // Si risale per tempo di nascita (un germe guarda solo quelli nati prima): la ricorsione finisce, e il risultato resta nel germe.
  const tutteTonde = M.every((m, i) => asp[i] === 1 && !(m.anisotropia > 0));
  function vero(g) {
    if (tutteTonde) return true;
    if (g.vero !== undefined) return g.vero;
    const cx = Math.floor(g.x), cy = Math.floor(g.y);
    for (let o = 0; o < ORDINE.length; o += 2) { const i = cx + ORDINE[o], j = cy + ORDINE[o + 1];
      const ex = g.x < i ? i - g.x : g.x > i + 1 ? g.x - i - 1 : 0, ey = g.y < j ? j - g.y : g.y > j + 1 ? g.y - j - 1 : 0, d2 = ex * ex + ey * ey, tp = g.t * portata; if (d2 >= tp * tp) continue; const lb = Math.sqrt(d2) / portata;
      const l = germi(i, j);
      for (let q = 0; q < l.length; q++) { const h = l[q]; if (h.t + lb >= g.t) break; if (h !== g && h.t + dist(h, g.x, g.y) < g.t && vero(h)) return (g.vero = false); }
    }
    return (g.vero = true);
  }
  // il grano in un punto (in unità u): { g, primo, secondo } (primo: il tempo d'arrivo o la distanza di potenza)
  function trova(x, y) {
    const cx = Math.floor(x), cy = Math.floor(y); let best = Infinity, sec = Infinity, chi = null;
    for (let o = 0; o < ORDINE.length; o += 2) { const i = cx + ORDINE[o], j = cy + ORDINE[o + 1];
      // (nessun germe di questa cella arriva prima di t + lb: lb è la distanza dal punto alla cella divisa per la portata)
      let lb = 0;
      if (tass) { const ex = x < i ? i - x : x > i + 1 ? x - i - 1 : 0, ey = y < j ? j - y : y > j + 1 ? y - j - 1 : 0, d2 = ex * ex + ey * ey; if (d2 > 0) { const sp = sec * portata; if (d2 >= sp * sp) continue; lb = Math.sqrt(d2) / portata; } }
      const l = germi(i, j);
      for (let q = 0; q < l.length; q++) {
        const g = l[q];
        if (tass) { if (g.t + lb >= sec) break; const v = g.t + dist(g, x, y); if (v >= sec || !vero(g)) continue; if (v < best) { sec = best; best = v; chi = g; } else sec = v; }
        else { const dx = x - g.x, dy = y - g.y, d2 = dx * dx + dy * dy; if (d2 >= g.r * g.r) continue; const v = d2 - g.r * g.r; if (v < best) { sec = best; best = v; chi = g; } else if (v < sec) sec = v; }
      }
    }
    return { g: chi, primo: best, secondo: sec };
  }
  const lumeDi = (g) => (S.polarizzata ? 0.84 + 0.26 * (SEN(2 * g.phi) ** 2) : 1);
  const vetro = S.vetro || [0, 1, 2].map((i) => 0.3 * M.reduce((a, m, k) => a + m.colore[i] * f[k], 0));
  const lumeMedio = S.polarizzata ? 0.97 : 1;
  const mediaColore = [0, 1, 2].map((i) => { const c = M.reduce((a, m, k) => a + m.colore[i] * f[k], 0) * lumeMedio; return tass ? X * c + (1 - X) * vetro[i] : (1 - S.porosita) * c + S.porosita * S.matrice[i]; });
  // il colore di un punto (x, y in u); larghezza: mezzo pixel in u (i bordi dei grani sono larghi un pixel)
  function colore(x, y, mezzo, out) {
    const r = trova(x, y), g = r.g;
    if (!g || (tass && r.primo > tFine)) { const c = g ? vetro : S.matrice; out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; return; }
    const c = M[g.m].colore; let lume = lumeDi(g);
    // (il bordo vero è sottilissimo: disegnato largo un pixel, il suo buio pesa quanto un pixel pesa sul grano; così,
    // rimpicciolendo, la media dei grani converge al colore medio della roccia invece di annerire)
    const peso = Math.min(1, 1 / (12 * mezzo));
    if (tass) { if (r.secondo - r.primo < 2 * mezzo) lume *= 1 - 0.42 * peso; }
    else if (-r.primo < g.r * g.r * 0.36) lume *= 1 - 0.34 * peso * pesoDiscreto(g.r / (4 * mezzo)); // l'orlo del granello (la sua ombra), che compare per gradi quando il granello passa i due pixel (prima: di colpo)
    out[0] = c[0] * lume; out[1] = c[1] * lume; out[2] = c[2] * lume;
  }
  // ---- LA RESA: una tela fuori schermo che copre lo schermo (più un margine), rifatta solo quando la vista ne esce o
  // la scala cambia di più del 20%; ogni fotogramma la si posa trasformata. Il costo è legato ai pixel (al più ~260 000).
  let cache = null;
  function rendi(W, H, ox, oy, k) {
    const marg = 0.2, w0 = W * (1 + 2 * marg), h0 = H * (1 + 2 * marg), passo = Math.max(1, Math.sqrt((w0 * h0) / 260000));
    const w = Math.ceil(w0 / passo), h = Math.ceil(h0 / passo), sx = -W * marg, sy = -H * marg; // (in pixel dello schermo)
    const cv = cache?.cv && cache.cv.width === w && cache.cv.height === h ? cache.cv : tela(w, h), x = cv.getContext('2d'), img = x.createImageData(w, h), d = img.data, out = [0, 0, 0];
    const pu = (passo / k) / u, granoPx = (u * k) / passo, campioni = granoPx < 2.5 ? 2 : 1, mezzo = pu / 2 / campioni;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      let r = 0, gg = 0, b = 0;
      for (let a = 0; a < campioni; a++) for (let c = 0; c < campioni; c++) {
        const X0 = ((sx + (i + (a + 0.5) / campioni) * passo - ox) / k) / u, Y0 = ((sy + (j + (c + 0.5) / campioni) * passo - oy) / k) / u;
        colore(X0, Y0, mezzo, out); r += out[0]; gg += out[1]; b += out[2];
      }
      const q = 4 * (j * w + i), n = campioni * campioni; d[q] = r / n; d[q + 1] = gg / n; d[q + 2] = b / n; d[q + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    cache = { cv, ox, oy, k, sx, sy, passo, W, H };
  }
  return {
    spec: S, granoM: u, mediaColore, legge: S.legge || '',
    // il grano in un punto (metri, nelle coordinate del campo): il suo indirizzo, il minerale, l'orientamento
    granoIn(xm, ym) { const r = trova(xm / u, ym / u); if (!r.g || (tass && r.primo > tFine)) return null; return { indirizzo: `${cel.radice}/${r.g.id}`, minerale: M[r.g.m].nome, orientamento: r.g.phi * Math.PI, nascita: r.g.t ?? null }; },
    // quanti grani veri in un'area (m²): la densità della legge
    conta(area) { return tass ? (area / (u * u)) * (X >= 0.9999 ? NA : NA * X) : (area / (u * u)) * nImp; },
    // vista: { W, H (pixel della tela), ox, oy: dove sta lo zero del campo, k: pixel per metro }. → { vere, disegnati }
    dipingi(ctx, { W, H, ox, oy, k, alfa = 1 }) {
      const granoPx = u * k, area = (W / k) * (H / k), vere = this.conta(area);
      if (alfa <= 0) return { vere, disegnati: 0 };
      // DISCRETO SOPRA IL PIXEL, CONTINUO SOTTO (eredita.js, pesoDiscreto: la rampa di un'ottava attorno al pixel): un grano largo
      // w·… pesa w come grano disegnato e 1 − w nel colore medio (la nebbia), così il totale si conserva e i grani compaiono per
      // gradi, non a una soglia secca (prima: sotto 0,7 pixel il colore medio, sopra i grani)
      const w = pesoDiscreto(granoPx), media = () => { ctx.globalAlpha = alfa; ctx.fillStyle = `rgb(${mediaColore.map(Math.round).join(',')})`; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; };
      if (!(w > 0)) { media(); return { vere, disegnati: 0 }; } // la nebbia: il colore medio
      if (w < 1) { media(); alfa *= w; }
      const C = cache, scala = C ? k / C.k : 0, dx = C ? ox - C.ox * scala : 0, dy = C ? oy - C.oy * scala : 0;
      // (la tela fatta copre ancora lo schermo, alla stessa scala entro il 20%?)
      const copre = C && C.W === W && C.H === H && scala > 0.83 && scala < 1.2 && C.sx * scala + dx <= 0 && C.sy * scala + dy <= 0 && (C.sx + C.cv.width * C.passo) * scala + dx >= W && (C.sy + C.cv.height * C.passo) * scala + dy >= H;
      if (!copre) rendi(W, H, ox, oy, k);
      const D = cache, sc = k / D.k, tx = ox - D.ox * sc, ty = oy - D.oy * sc;
      ctx.globalAlpha = alfa; ctx.imageSmoothingEnabled = D.passo > 1.2; ctx.drawImage(D.cv, D.sx * sc + tx, D.sy * sc + ty, D.cv.width * D.passo * sc, D.cv.height * D.passo * sc); ctx.imageSmoothingEnabled = true; ctx.globalAlpha = 1;
      return { vere, disegnati: Math.round(vere * w) };
    },
  };
}

// =====================================================================================
// LE TRACCE COME POPOLAZIONE
// =====================================================================================
// Ogni processo di quel luogo (materia.js, sorgentiNaturali): i decadimenti con il loro ritmo per m³, i raggi cosmici con
// il loro flusso per m². Quanto tempo la materia ne tiene il segno lo dice ritenzione() (materia.js) per il minerale in
// cui si guarda: le tracce di fissione e i danni delle α e dei rinculi restano per gli anni di memoria del minerale; ciò
// che un minerale non tiene (e tutto, nell'acqua e nel ghiaccio) si vede solo nel presente: il tempo d'integrazione
// dell'occhio, 0,1 s (legge di Bloch: lo strumento dichiarato è l'occhio). Ogni evento è un indirizzo
// «processo/cella ix iy»/k, in celle cubiche larghe quanto la sua traccia più lunga (al più un metro): si guarda la
// proiezione di uno strato spesso una cella, come nella finestra delle particelle.
export const PRESENTE_S = 0.1;
// LA LARGHEZZA DI UNA TRACCIA: la colonna di materia danneggiata (o ionizzata) attorno al percorso, una decina di nanometri
// (le tracce latenti: Fleischer, Price e Walker 1975; si vedono al microscopio solo dopo l'attacco chimico). Il principio della
// nebbia: una traccia più sottile di un punto dell'immagine ne prende la sua parte (la frazione del punto che copre), non un
// punto intero; altrimenti a ogni scala le tracce sarebbero righe larghe un punto, cioè sparse e sempre visibili.
export const LARGHEZZA_TRACCIA_M = 1e-8;
// una spezzata (x0, y0, x1, y1, …) passa per il rettangolo [0, W] × [0, H]? (Liang-Barsky, tratto per tratto)
function tocca(p, W, H) {
  for (let i = 2; i < p.length; i += 2) {
    const x0 = p[i - 2], y0 = p[i - 1], dx = p[i] - x0, dy = p[i + 1] - y0; let a = 0, b = 1, ok = true;
    for (const [q, r] of [[-dx, x0], [dx, W - x0], [-dy, y0], [dy, H - y0]]) { if (q === 0) { if (r < 0) { ok = false; break; } continue; } const t = r / q; if (q < 0) { if (t > b) { ok = false; break; } if (t > a) a = t; } else { if (t < a) { ok = false; break; } if (t < b) b = t; } }
    if (ok && a <= b) return true;
  }
  return false;
}
const DISEGNABILI = (n) => n === 'alfa' || n.startsWith('frammento') || n.startsWith('muone') || n === 'elettrone' || n.startsWith('protone');
export const COLORE_TRACCIA = (n) => (n === 'alfa' ? '255,190,90' : n.startsWith('frammento') || n === 'rinculo' ? '255,96,96' : n.startsWith('muone') ? '245,245,245' : n === 'elettrone' || n === 'positrone' ? '120,255,160' : n.startsWith('protone') ? '255,240,120' : '255,150,220');
export function popolazioneTracce(luogo, { minerale = null } = {}, caso) {
  const roccia = luogo.tipo === 'roccia', qui = roccia && minerale ? { ...luogo, elementi: concentrazioni(luogo, minerale) } : luogo;
  let src; try { src = sorgentiNaturali(qui); } catch { return null; }
  const memoria = (tipo) => { if (!roccia || !minerale) return 0; try { const r = ritenzione(luogo, minerale, tipo); return r.registra ? r.anni : 0; } catch { return 0; } };
  const anniFissione = memoria('fissione'), anniAlfa = memoria('alone'), anniRinculo = memoria('rinculo');
  const processi = [];
  for (const p of src.processi) {
    if (p.visibile === false) continue;
    const parti = (p.emette || []).map((e) => ({ nome: e.rinculo ? 'rinculo' : e.particella, L: e.percorso })).filter((e) => (DISEGNABILI(e.nome) || e.nome === 'rinculo') && isFinite(e.L) && e.L > 0);
    if (!parti.length) continue;
    const cosmico = p.tipo === 'cosmico', anni = cosmico ? 0 : p.tipo === 'fissione' ? anniFissione : p.tipo === 'α' ? Math.max(anniAlfa, anniRinculo) : 0;
    const T = anni > 0 ? anni * ANNO : PRESENTE_S, c = limita(Math.max(...parti.map((e) => e.L)), 1e-9, 1);
    const media = cosmico ? (p.flusso || 0) * c * c * T : (p.perM3 || 0) * c * c * c * T;
    if (!(media > 0)) continue;
    processi.push({ id: p.id, cosmico, parti, cella: c, media, T, memoria: anni > 0, serie: caso.sotto(`tracce/${p.id}`), origine: p.origine });
  }
  const memo = new Map();
  const quante = (P, ix, iy) => { const k = `${P.id}|${ix}|${iy}`; let n = memo.get(k); if (n === undefined) { n = poisson(P.media, P.serie.serie(`cella ${ix} ${iy}`), 0); if (memo.size > 50000) memo.clear(); memo.set(k, n); } return n; };
  return {
    processi,
    // vista come in campoGrani (lo zero del campo: il punto). → { vere, disegnate, voci: [{ id, vere, disegnate }] }
    // escludi: { x0, y0, x1, y1 } (metri) dove le tracce sono già disegnate da un campione (non le si conta due volte)
    dipingi(ctx, { W, H, ox, oy, k, dpr = 1, alfa = 1, escludi = null }) {
      let vere = 0, disegnate = 0; const voci = [];
      const x0 = -ox / k, y0 = -oy / k, x1 = (W - ox) / k, y1 = (H - oy) / k, area = (x1 - x0) * (y1 - y0);
      ctx.lineCap = 'round';
      // QUANTE SE NE POSSONO MOSTRARE, tutte insieme: che coprano al più un terzo dei pixel, e mai più di 3000. Il posto
      // si divide tra i processi in proporzione a quante tracce vere ognuno ha qui (la nebbia tiene le proporzioni)
      const lpx = (P) => Math.max(...P.parti.map((e) => e.L)) * k, vis = processi.map((P) => (lpx(P) >= 1.5 && alfa > 0 ? (P.media * area) / (P.cella * P.cella) : 0)), somma = vis.reduce((a, b) => a + b, 0);
      const pixel = somma > 0 ? processi.reduce((a, P, q) => a + (vis[q] / somma) * Math.min(lpx(P), 2 * Math.hypot(W, H)) * 1.4 * dpr, 0) : 1, tetto = Math.min(3000, Math.floor((W * H) / (3 * Math.max(1, pixel))));
      processi.forEach((P, q) => {
        const c = P.cella, nVere = (P.media * area) / (c * c); vere += nVere;
        if (!vis[q]) { voci.push({ id: P.id, vere: nVere, disegnate: 0, memoria: P.memoria }); return; }
        const budget = (tetto * vis[q]) / somma, i0 = Math.floor(x0 / c) - 1, i1 = Math.floor(x1 / c) + 1, j0 = Math.floor(y0 / c) - 1, j1 = Math.floor(y1 / c) + 1;
        const celle = (i1 - i0 + 1) * (j1 - j0 + 1); if (celle > 40000 || budget < 0.5) { voci.push({ id: P.id, vere: nVere, disegnate: 0, memoria: P.memoria }); return; }
        // (se il posto è meno delle celle, si guarda una cella su 1/quota, scelta dal suo evento «scelta»: lo stesso campione a ogni scala)
        const perCella = Math.max(1, Math.floor(budget / celle)), quota = Math.min(1, budget / celle); let n = 0;
        ctx.globalAlpha = alfa * Math.min(1, (LARGHEZZA_TRACCIA_M * k) / dpr);
        // (si guarda uno strato spesso una cella: di una traccia lunga si vede il pezzo dentro lo strato. Quante sono
        // davvero quelle che passano per lo schermo: in ogni cella se ne provano fino a qualche migliaio, e il conteggio vero
        // per la parte delle provate che ci passa; se ne disegnano al più quante ne regge lo schermo)
        let stima = 0;
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
          const nc = quante(P, i, j), q = Math.min(nc, Math.max(perCella, Math.ceil(6000 / celle))); if (!q) continue; let qui = 0; const sr = P.serie.serie(`cella ${i} ${j}`); if (quota < 1 && sr(63) >= quota) continue; let colpite = 0;
          for (let e = 0; e < q; e++) {
            const b = 64 + 10 * e, x = (i + sr(b)) * c, y = (j + sr(b + 1)) * c;
            if (escludi && x > escludi.x0 && x < escludi.x1 && y > escludi.y0 && y < escludi.y1) continue;
            // la direzione: isotropa per i decadimenti; i muoni arrivano dall'alto con ∝ cos²θ (cosθ = u^⅓); si guarda dall'alto
            const cz = P.cosmico ? Math.cbrt(sr(b + 2)) : 2 * sr(b + 2) - 1, sn = Math.sqrt(Math.max(0, 1 - cz * cz)), az = sr(b + 3), dx = cosGiro(az) * sn, dy = SEN(az) * sn;
            const linee = P.parti.map((pt, h) => {
              const verso = h === 0 ? 1 : -1, L = Math.min(pt.L, c / Math.max(0.05, Math.abs(cz))); let px = ox + x * k, py = oy + y * k; const pts = [px, py];
              if (pt.nome === 'elettrone') { // un elettrone non va dritto: cinque tratti, ognuno deviato (in linea d'aria fa circa metà del percorso)
                let ang = Math.atan2(dy * verso, dx * verso); for (let t = 0; t < 5; t++) { ang += 1.1 * (sr(b + 4 + t) - 0.5) * 2; const l = (L / 5) * k * Math.max(0.3, sn); px += Math.cos(ang) * l; py += Math.sin(ang) * l; pts.push(px, py); }
              } else pts.push(px + verso * dx * L * k, py + verso * dy * L * k);
              return { pt, pts };
            });
            if (!linee.some((l) => tocca(l.pts, W, H))) continue; // non passa per lo schermo
            colpite++; if (qui >= perCella) continue; qui++;
            for (const { pt, pts } of linee) {
              ctx.strokeStyle = `rgba(${COLORE_TRACCIA(pt.nome)},${pt.nome === 'elettrone' ? 0.8 : 0.9})`; ctx.lineWidth = Math.max(dpr * (pt.nome === 'alfa' || pt.nome.startsWith('frammento') || pt.nome === 'rinculo' ? 1.4 : 1), LARGHEZZA_TRACCIA_M * k);
              ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let t = 2; t < pts.length; t += 2) ctx.lineTo(pts[t], pts[t + 1]); ctx.stroke();
            }
          }
          n += qui; stima += (nc * colpite) / q / quota;
        }
        vere += stima - nVere;
        ctx.globalAlpha = 1; disegnate += n; voci.push({ id: P.id, vere: stima, disegnate: n, memoria: P.memoria });
      });
      return { vere, disegnate, voci };
    },
  };
}
