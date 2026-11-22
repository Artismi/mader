// sezione.js — guardare l'universo da un angolo: proiezione, finestra, bellezza.
//
// L'universo della camera è un piano più il tempo: uno spaziotempo (x, y, t).
// Ogni particella vi traccia una linea d'universo. La lastra «da sopra» guarda
// lungo il tempo: vede solo il piano. Inclinandosi, il tempo diventa una
// direzione del disegno: una spirale diventa un'elica e, proiettata, un'onda,
// una trocoide, una catena di anelli.
//
// vista = { inclinazione, rotazione (gradi), scalaTempo (unità di spazio per unità di tempo) }
// La direzione da cui si guarda è d = (sinθ·cosφ, sinθ·sinφ, cosθ) nello spazio
// (x, y, τ = scalaTempo·t); il disegno sta sul piano perpendicolare, con assi
// u = (cosθ·cosφ, cosθ·sinφ, −sinθ) e v = (−sinφ, cosφ, 0). Da sopra (θ = 0, φ = 0)
// u = x e v = y: la lastra di sempre.

export const VISTA_SOPRA = { inclinazione: 0, rotazione: 0, scalaTempo: 5 };

export function proiettore(vista = VISTA_SOPRA, centro = [0, 0, 0]) {
  const th = ((vista.inclinazione ?? 0) * Math.PI) / 180, fi = ((vista.rotazione ?? 0) * Math.PI) / 180, k = vista.scalaTempo ?? 5;
  const u = [Math.cos(th) * Math.cos(fi), Math.cos(th) * Math.sin(fi), -Math.sin(th)], v = [-Math.sin(fi), Math.cos(fi), 0];
  // si ruota intorno a un centro (x, y, t), così la finestra non scappa via inclinando
  const [cx, cy, ct] = centro;
  return (x, y, t) => {
    const X = x - cx, Y = y - cy, T = k * (t - ct);
    return [cx + X * u[0] + Y * u[1] + T * u[2], cy + X * v[0] + Y * v[1] + T * v[2]];
  };
}
// ---------- L'OSSERVATORE IN MOTO. Una sezione inclinata dello spaziotempo, presa sul serio, è il punto di vista
// di qualcuno che si muove: la relatività ristretta dice esattamente che cosa vede. Nello spaziotempo (x, y, c·t)
// la scala del tempo non è libera: è la velocità della luce. Chi va a velocità β (frazione di c) nella direzione n
// registra ogni punto di una traccia in   r' = r + (γ − 1)(r·n)n − γ·β·c·t ,   t' = γ(t − β·r/c),   γ = 1/√(1 − β²):
// le lunghezze lungo il moto si accorciano, il tempo di lassù si mescola allo spazio di quaggiù, e un cerchio
// percorso da una particella diventa una trocoide. La fetta di tempo è quella dell'orologio di chi guarda (t').
// vista.velocita (0…<1) e vista.direzione (gradi): la velocità di chi guarda rispetto alla regione. I moti veri
// (il pianeta che gira, la sua orbita) sono piccolissimi rispetto alla luce; chi viaggia con una particella no.
export const inMoto = (vista) => !!vista && (vista.velocita ?? 0) > 0;
export function osservatore(vista, centro, c = 40) {
  const b = Math.min(0.995, vista.velocita), fi = ((vista.direzione ?? 0) * Math.PI) / 180, nx = Math.cos(fi), ny = Math.sin(fi), g = 1 / Math.sqrt(1 - b * b);
  const [cx, cy, ct] = centro;
  return (x, y, t) => { const X = x - cx, Y = y - cy, T = t - ct, par = X * nx + Y * ny, k = (g - 1) * par - g * b * c * T; return [cx + X + k * nx, cy + Y + k * ny, ct + g * (T - (b * par) / c)]; };
}
export const inclinata = (vista) => !!vista && ((vista.inclinazione ?? 0) !== 0 || (vista.rotazione ?? 0) !== 0 || inMoto(vista));

// i segmenti visibili della sezione: proiettati, dentro la fetta di tempo e la finestra
// → [[u0, v0, u1, v1, spessore], ...] in coordinate della finestra (0..lato)
export function segmentiSezione(tracce, cella) {
  const f = cella.finestra, sez = cella.sezione || { fine: Infinity, durata: Infinity }, vista = cella.vista || VISTA_SOPRA;
  const t1 = sez.fine, t0 = sez.fine - sez.durata, l = f.lato, x0 = f.centro[0] - l / 2, y0 = f.centro[1] - l / 2;
  const tc = isFinite(t0 + t1) ? (t0 + t1) / 2 : 0, P = proiettore(vista, [f.centro[0], f.centro[1], tc]), out = [];
  if (inMoto(vista)) { // chi guarda si muove: i punti nel suo riferimento, la fetta di tempo sul suo orologio
    const O = osservatore(vista, [f.centro[0], f.centro[1], tc], cella.c ?? 40);
    for (const tr of tracce) {
      if (tr.sagoma) continue;
      const Q = tr.punti; let prec = null;
      for (let i = 0; i < Q.length; i++) {
        const p = Q[i]; if (!p[2]) { prec = null; continue; }
        const [U, Vv, T] = O(p[0], p[1], p[3]); if (T < t0 || T > t1) { prec = null; continue; }
        const q = [U - x0, Vv - y0, p[4]];
        if (prec && ((q[0] >= 0 && q[0] <= l && q[1] >= 0 && q[1] <= l) || (prec[0] >= 0 && prec[0] <= l && prec[1] >= 0 && prec[1] <= l))) out.push([prec[0], prec[1], q[0], q[1], (prec[2] + q[2]) / 2, tr.id, i]);
        prec = q;
      }
    }
    return out;
  }
  for (const tr of tracce) {
    if (tr.sagoma) continue;
    const Q = tr.punti; let prec = null;
    for (let i = 0; i < Q.length; i++) {
      const p = Q[i];
      if (!p[2] || p[3] < t0 || p[3] > t1) { prec = null; continue; }
      const [U, Vv] = P(p[0], p[1], p[3]), q = [U - x0, Vv - y0, p[4]];
      if (prec && ((q[0] >= 0 && q[0] <= l && q[1] >= 0 && q[1] <= l) || (prec[0] >= 0 && prec[0] <= l && prec[1] >= 0 && prec[1] <= l))) out.push([prec[0], prec[1], q[0], q[1], (prec[2] + q[2]) / 2, tr.id, i]);
      prec = q;
    }
  }
  return out;
}

// ---------- la bellezza, misurata (alla buona, ma onesta)
// Su un'immagine ridotta della sezione: quanto è piena (né vuota né satura),
// quanto è equilibrata (il disegno sparso nella finestra), quanto è simmetrica
// (specchi e mezzo giro), quanto ripete un motivo (autocorrelazione), quanto
// curva (le linee che girano). Il prodotto premia ciò che ha tutto un po'.
export function rasterizzaSezione(segmenti, lato, N = 96) {
  const m = new Float32Array(N * N), k = N / lato;
  for (const [a, b, c, d, w] of segmenti) {
    const n = Math.max(1, Math.ceil(Math.hypot(c - a, d - b) * k * 1.5)), r = Math.max(0.6, (w * k) / 2);
    for (let i = 0; i <= n; i++) {
      const x = (a + ((c - a) * i) / n) * k, y = (b + ((d - b) * i) / n) * k;
      for (let yy = Math.floor(y - r); yy <= Math.ceil(y + r); yy++) for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx++) {
        if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue;
        if ((xx + 0.5 - x) ** 2 + (yy + 0.5 - y) ** 2 <= r * r) m[yy * N + xx] = 1;
      }
    }
  }
  return m;
}
export function bellezza(segmenti, lato) {
  const N = 96, m = rasterizzaSezione(segmenti, lato, N);
  let pieno = 0; for (const v of m) pieno += v; pieno /= N * N;
  if (pieno < 0.01) return { totale: 0, pieno, equilibrio: 0, simmetria: 0, ripetizione: 0, curve: 0 };
  const sPieno = Math.exp(-(((pieno - 0.2) / 0.11) ** 2));
  // equilibrio: l'entropia dell'inchiostro su una griglia 4×4
  const celle = new Float64Array(16); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) celle[Math.floor(y / 24) * 4 + Math.floor(x / 24)] += m[y * N + x];
  const tot = celle.reduce((a, b) => a + b, 0); let H = 0; for (const c of celle) if (c) { const p = c / tot; H -= p * Math.log(p); }
  const sEq = H / Math.log(16);
  // simmetria: la migliore tra quattro specchi e il mezzo giro (IoU dell'immagine con la sua copia)
  const iou = (f) => { let i = 0, u = 0; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const a = m[y * N + x], b = m[f(x, y)]; if (a && b) i++; if (a || b) u++; } return u ? i / u : 0; };
  const sSim = Math.max(iou((x, y) => y * N + (N - 1 - x)), iou((x, y) => (N - 1 - y) * N + x), iou((x, y) => x * N + y), iou((x, y) => (N - 1 - x) * N + (N - 1 - y)), iou((x, y) => (N - 1 - y) * N + (N - 1 - x)));
  // ripetizione: la correlazione più alta per uno spostamento non piccolo
  let sRip = 0;
  for (let dy = -40; dy <= 40; dy += 4) for (let dx = 0; dx <= 40; dx += 4) {
    if (Math.hypot(dx, dy) < 12) continue;
    let i = 0, a = 0, b = 0;
    for (let y = Math.max(0, -dy); y < Math.min(N, N - dy); y += 2) for (let x = 0; x < N - dx; x += 2) { const p = m[y * N + x], q = m[(y + dy) * N + x + dx]; i += p * q; a += p; b += q; }
    if (a && b) sRip = Math.max(sRip, i / Math.sqrt(a * b));
  }
  // curve: quanto girano le linee (angolo medio tra segmenti consecutivi della stessa traccia)
  let giro = 0, lung = 0;
  for (let j = 1; j < segmenti.length; j++) {
    const s0 = segmenti[j - 1], s1 = segmenti[j]; if (s0[5] !== s1[5] || s1[6] !== s0[6] + 1) continue;
    const a0 = Math.atan2(s0[3] - s0[1], s0[2] - s0[0]), a1 = Math.atan2(s1[3] - s1[1], s1[2] - s1[0]); let d = a1 - a0; d = Math.atan2(Math.sin(d), Math.cos(d));
    giro += Math.abs(d); lung += Math.hypot(s1[2] - s1[0], s1[3] - s1[1]);
  }
  const sCurve = 1 - Math.exp(-((giro / Math.max(1e-9, lung)) * lato) / 12);
  // ordine: quanta parte del disegno appartiene ai quattro motivi più grandi
  const perTraccia = new Map();
  for (const sg of segmenti) perTraccia.set(sg[5], (perTraccia.get(sg[5]) || 0) + Math.hypot(sg[2] - sg[0], sg[3] - sg[1]) * Math.max(0.5, sg[4]));
  const pesi = [...perTraccia.values()].sort((a, b) => b - a), tutto = pesi.reduce((a, b) => a + b, 0);
  const sOrdine = tutto ? pesi.slice(0, 4).reduce((a, b) => a + b, 0) / tutto : 0;
  // pulizia: i frammenti (pezzi di linea brevi dentro la finestra) sembrano rumore
  let frammenti = 0; for (const w of perTraccia.values()) if (w < 0.15 * lato) frammenti += w;
  const sPulizia = tutto ? 1 - frammenti / tutto : 0;
  const totale = sPieno * (0.35 + 0.65 * sEq) * (0.25 + 1.2 * sSim + 0.8 * sRip) * (0.4 + 0.6 * sCurve) * (0.3 + 0.7 * sOrdine) * (0.4 + 0.6 * sPulizia);
  return { totale, pieno, equilibrio: sEq, simmetria: sSim, ripetizione: sRip, curve: sCurve, ordine: sOrdine, pulizia: sPulizia };
}

// ---------- la bellezza di una finestra QUALSIASI (non solo di tracce di particelle): un'immagine a colori.
// La finestra è un punto di osservazione del mondo, a qualunque scala: una rete di fiumi, una costa, i cristalli di
// una roccia, le orbite, la rete delle galassie. Si misura il suo disegno (i contorni: dove l'immagine cambia) con
// le stesse domande della sezione: né vuoto né saturo, sparso nella finestra, con una simmetria o una ripetizione.
export function bellezzaImmagine(px, W, H) {
  const N = 96, g = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const x0 = Math.floor((x * W) / N), x1 = Math.max(x0 + 1, Math.floor(((x + 1) * W) / N)), y0 = Math.floor((y * H) / N), y1 = Math.max(y0 + 1, Math.floor(((y + 1) * H) / N)); let a = 0, n = 0;
    for (let j = y0; j < y1 && j < H; j++) for (let i = x0; i < x1 && i < W; i++) { const o = (j * W + i) * 4; a += 0.3 * px[o] + 0.59 * px[o + 1] + 0.11 * px[o + 2]; n++; }
    g[y * N + x] = n ? a / n : 0;
  }
  let lo = Infinity, hi = -Infinity; for (const v of g) { if (v < lo) lo = v; if (v > hi) hi = v; }
  const zero = { totale: 0, pieno: 0, equilibrio: 0, simmetria: 0, ripetizione: 0 };
  if (hi - lo < 8) return zero; // un'immagine piatta: niente da vedere
  const m = new Uint8Array(N * N), soglia = 0.09 * (hi - lo);
  for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) { const k = y * N + x; if (Math.hypot(g[k + 1] - g[k - 1], g[k + N] - g[k - N]) > soglia) m[k] = 1; }
  let pieno = 0; for (const v of m) pieno += v; pieno /= N * N;
  if (pieno < 0.01) return zero;
  const sPieno = Math.exp(-(((pieno - 0.2) / 0.13) ** 2));
  const celle = new Float64Array(16); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) celle[Math.floor(y / 24) * 4 + Math.floor(x / 24)] += m[y * N + x];
  const tot = celle.reduce((a, b) => a + b, 0); let Hh = 0; for (const c of celle) if (c) { const p = c / tot; Hh -= p * Math.log(p); }
  const sEq = Hh / Math.log(16);
  const iou = (f) => { let i = 0, u = 0; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const a = m[y * N + x], b = m[f(x, y)]; if (a && b) i++; if (a || b) u++; } return u ? i / u : 0; };
  const sSim = Math.max(iou((x, y) => y * N + (N - 1 - x)), iou((x, y) => (N - 1 - y) * N + x), iou((x, y) => x * N + y), iou((x, y) => (N - 1 - x) * N + (N - 1 - y)));
  let sRip = 0;
  for (let dy = -40; dy <= 40; dy += 4) for (let dx = 0; dx <= 40; dx += 4) {
    if (Math.hypot(dx, dy) < 12) continue; let i = 0, a = 0, b = 0;
    for (let y = Math.max(0, -dy); y < Math.min(N, N - dy); y += 2) for (let x = 0; x < N - dx; x += 2) { const p = m[y * N + x], q = m[(y + dy) * N + x + dx]; i += p * q; a += p; b += q; }
    if (a && b) sRip = Math.max(sRip, i / Math.sqrt(a * b));
  }
  return { totale: sPieno * (0.35 + 0.65 * sEq) * (0.25 + 1.2 * sSim + 0.8 * sRip), pieno, equilibrio: sEq, simmetria: sSim, ripetizione: sRip };
}
