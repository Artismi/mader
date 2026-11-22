// pattern.js — dalla finestra al pattern: le simmetrie della ripetizione.
//
// Un ornamento vero non è una figura copiata accanto a sé: è un pezzo piccolo di
// piano (il «dominio fondamentale») ripetuto da un gruppo di simmetrie che
// riempie tutto il piano. Nei caleidoscopi il pezzo è un triangolo e le
// simmetrie sono specchi lungo i suoi lati: ogni linea che tocca un lato
// continua nella sua immagine, e intorno ai vertici nascono stelle e rosoni.
// Qui il pezzo è una sezione dell'universo: la natura disegna il triangolo, la
// ripetizione fa il resto (è anche come nascono i cristalli e i fiocchi di neve).
//
// Gruppi (coordinate della finestra, 0..lato, y in giù):
//   esagoni   p6m: un triangolo 30-60-90 con il vertice al centro della finestra,
//                  12 copie fanno un esagono, gli esagoni pavimentano il piano
//   quadrati  p4m: un triangolo 45-45-90, 8 copie fanno un quadrato
//   specchio  pmm: la finestra intera e i suoi tre riflessi
//   rotazione p4:  la finestra e i suoi tre quarti di giro
//   traslazione p1: la finestra copiata accanto a sé
//   una:      la finestra da sola

import { bellezza } from './cosmo/sezione.js';
export const GRUPPI = {
  esagoni: { nome: 'caleidoscopio a sei', spiega: 'un triangolo della finestra, riflesso nei suoi lati: dodici copie fanno un esagono, e intorno ai vertici nascono stelle a sei punte' },
  quadrati: { nome: 'caleidoscopio a quattro', spiega: 'un triangolo della finestra, riflesso nei suoi lati: otto copie fanno un quadrato, con stelle a quattro e a otto punte' },
  specchio: { nome: 'a specchio', spiega: 'la finestra intera e i suoi riflessi: le linee che toccano il bordo continuano nella loro immagine' },
  rotazione: { nome: 'a giro', spiega: 'quattro copie della finestra girano di un quarto intorno a un angolo comune' },
  traslazione: { nome: 'affiancata', spiega: 'la stessa finestra, copiata accanto a sé' },
  una: { nome: 'da sola', spiega: 'la sezione da sola, senza ripetizione' },
};
export const RIPETI_BASE = { gruppo: 'una', angolo: 0 }; // il modo normale: la finestra da sola, com'è

// ---------- trasformazioni affini [a, b, c, d, tx, ty]: (x, y) → (a·x + b·y + tx, c·x + d·y + ty)
const applica = (T, x, y) => [T[0] * x + T[1] * y + T[4], T[2] * x + T[3] * y + T[5]];
const rotazioneIntorno = (th, cx, cy) => { const c = Math.cos(th), s = Math.sin(th); return [c, -s, s, c, cx - c * cx + s * cy, cy - s * cx - c * cy]; };
const riflessioneIntorno = (th, cx, cy) => { const c = Math.cos(2 * th), s = Math.sin(2 * th); return [c, s, s, -c, cx - c * cx - s * cy, cy - s * cx + c * cy]; };
const componi = (A, B) => [A[0] * B[0] + A[1] * B[2], A[0] * B[1] + A[1] * B[3], A[2] * B[0] + A[3] * B[2], A[2] * B[1] + A[3] * B[3], A[0] * B[4] + A[1] * B[5] + A[4], A[2] * B[4] + A[3] * B[5] + A[5]];
const IDENTITA = [1, 0, 0, 1, 0, 0];

// la geometria di una ripetizione: il dominio (poligono convesso da ritagliare nella
// finestra), le copie che fanno il motivo, il poligono del motivo, il reticolo
export function geometria(ripeti, lato) {
  const g = ripeti?.gruppo || 'esagoni', a = ((ripeti?.angolo ?? 0) * Math.PI) / 180, l = lato, O = [l / 2, l / 2];
  if (g === 'esagoni' || g === 'quadrati') {
    const n = g === 'esagoni' ? 6 : 4, r = l / 2, R = r / Math.cos(Math.PI / n);
    const M = [O[0] + r * Math.cos(a), O[1] + r * Math.sin(a)], V = [O[0] + R * Math.cos(a + Math.PI / n), O[1] + R * Math.sin(a + Math.PI / n)];
    const copie = [];
    for (let k = 0; k < n; k++) { const Rk = rotazioneIntorno((2 * Math.PI * k) / n, O[0], O[1]); copie.push(Rk, componi(Rk, riflessioneIntorno(a, O[0], O[1]))); }
    const poligono = Array.from({ length: n }, (_, k) => [O[0] + R * Math.cos(a + Math.PI / n + (2 * Math.PI * k) / n), O[1] + R * Math.sin(a + Math.PI / n + (2 * Math.PI * k) / n)]);
    const reticolo = { a: [2 * r * Math.cos(a), 2 * r * Math.sin(a)], b: [2 * r * Math.cos(a + (2 * Math.PI) / n), 2 * r * Math.sin(a + (2 * Math.PI) / n)] };
    return { gruppo: g, dominio: [O, M, V], copie, poligono, reticolo, centro: O };
  }
  const quadrato = [[0, 0], [l, 0], [l, l], [0, l]];
  if (g === 'specchio') return { gruppo: g, dominio: quadrato, copie: [IDENTITA, [-1, 0, 0, 1, 2 * l, 0], [1, 0, 0, -1, 0, 2 * l], [-1, 0, 0, -1, 2 * l, 2 * l]], poligono: [[0, 0], [2 * l, 0], [2 * l, 2 * l], [0, 2 * l]], reticolo: { a: [2 * l, 0], b: [0, 2 * l] }, centro: [l, l] };
  if (g === 'rotazione') return { gruppo: g, dominio: quadrato, copie: [0, 1, 2, 3].map((k) => rotazioneIntorno((k * Math.PI) / 2, l, l)), poligono: [[0, 0], [2 * l, 0], [2 * l, 2 * l], [0, 2 * l]], reticolo: { a: [2 * l, 0], b: [0, 2 * l] }, centro: [l, l] };
  return { gruppo: g, dominio: quadrato, copie: [IDENTITA], poligono: quadrato, reticolo: g === 'una' ? null : { a: [l, 0], b: [0, l] }, centro: O };
}

// ritaglia un segmento con un poligono convesso (Cyrus–Beck); null se resta fuori
function ritaglia(x0, y0, x1, y1, P) {
  let t0 = 0, t1 = 1; const dx = x1 - x0, dy = y1 - y0, n = P.length;
  // orientamento del poligono
  let area = 0; for (let i = 0; i < n; i++) { const p = P[i], q = P[(i + 1) % n]; area += p[0] * q[1] - q[0] * p[1]; }
  const s = Math.sign(area) || 1;
  for (let i = 0; i < n; i++) {
    const p = P[i], q = P[(i + 1) % n], nx = -(q[1] - p[1]) * s, ny = (q[0] - p[0]) * s; // normale interna
    const num = nx * (x0 - p[0]) + ny * (y0 - p[1]), den = nx * dx + ny * dy;
    if (Math.abs(den) < 1e-12) { if (num < 0) return null; continue; }
    const t = -num / den;
    if (den > 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t);
    if (t0 > t1) return null;
  }
  return [x0 + dx * t0, y0 + dy * t0, x0 + dx * t1, y0 + dy * t1];
}

// i segmenti del motivo: quelli della sezione dentro il dominio, in tutte le copie
// (ogni segmento tiene spessore, traccia e indice, per i colori)
export function motivo(segmenti, ripeti, lato) {
  const G = geometria(ripeti, lato), dentro = [], out = [];
  for (const s of segmenti) { const r = ritaglia(s[0], s[1], s[2], s[3], G.dominio); if (r) dentro.push([r[0], r[1], r[2], r[3], s[4], s[5], s[6]]); }
  for (const T of G.copie) for (const s of dentro) { const p = applica(T, s[0], s[1]), q = applica(T, s[2], s[3]); out.push([p[0], p[1], q[0], q[1], s[4], s[5], s[6]]); }
  return { ...G, dentro, segmenti: out };
}

// ---------- la bellezza di un pattern
// Si guarda un pezzo di pattern finito (alcune ripetizioni) e ci si chiede se è un
// ornamento: abbastanza inchiostro ma non troppo; il fondo diviso in celle di
// grandezza media (come le maglie di un intreccio, i petali di un rosone), non in
// buchi minuscoli (i riccioli stretti) né in grandi vuoti; poche spirali strette;
// pochi frammenti; l'inchiostro sparso in modo uniforme.
export function rasterizzaPattern(M, N = 128) {
  const im = new Uint8Array(N * N);
  if (!M.reticolo) return { im, N, lato: 1 };
  const La = Math.hypot(...M.reticolo.a), lato = 2 * La, [cx, cy] = M.centro, x0 = cx - lato / 2, y0 = cy - lato / 2, k = N / lato;
  const { a, b } = M.reticolo;
  for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
    const ox = i * a[0] + j * b[0], oy = i * a[1] + j * b[1];
    if (Math.abs(ox) > lato * 1.3 || Math.abs(oy) > lato * 1.3) continue;
    for (const s of M.segmenti) {
      const ax = (s[0] + ox - x0) * k, ay = (s[1] + oy - y0) * k, bx = (s[2] + ox - x0) * k, by = (s[3] + oy - y0) * k;
      if (Math.max(ax, bx) < -2 || Math.min(ax, bx) > N + 2 || Math.max(ay, by) < -2 || Math.min(ay, by) > N + 2) continue;
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) * 1.5)), r = Math.max(0.55, (s[4] * k) / 2);
      for (let t = 0; t <= n; t++) {
        const x = ax + ((bx - ax) * t) / n, y = ay + ((by - ay) * t) / n;
        for (let yy = Math.floor(y - r); yy <= Math.ceil(y + r); yy++) for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx++) {
          if (xx < 0 || yy < 0 || xx >= N || yy >= N) continue;
          if ((xx + 0.5 - x) ** 2 + (yy + 0.5 - y) ** 2 <= r * r) im[yy * N + xx] = 1;
        }
      }
    }
  }
  return { im, N, lato };
}

export function bellezzaPattern(segmenti, ripeti, lato) {
  const M = motivo(segmenti, ripeti, lato), zero = { totale: 0, pieno: 0, celle: 0, nitido: 0, distese: 0, pulizia: 0, equilibrio: 0 };
  if (!M.dentro.length || !M.reticolo) return zero;
  const { im, N } = rasterizzaPattern(M);
  let pieno = 0; for (const v of im) pieno += v; pieno /= N * N;
  if (pieno < 0.02) return { ...zero, pieno };
  const sPieno = Math.exp(-(((pieno - 0.2) / 0.1) ** 2));
  // le celle del fondo: componenti connesse del bianco
  const et = new Int32Array(N * N).fill(-1), coda = new Int32Array(N * N), aree = [];
  for (let s = 0; s < N * N; s++) {
    if (im[s] || et[s] >= 0) continue;
    let testa = 0, fine = 0; coda[fine++] = s; et[s] = aree.length; let area = 0;
    while (testa < fine) {
      const p = coda[testa++]; area++; const x = p % N, y = (p - x) / N;
      if (x > 0 && !im[p - 1] && et[p - 1] < 0) { et[p - 1] = aree.length; coda[fine++] = p - 1; }
      if (x < N - 1 && !im[p + 1] && et[p + 1] < 0) { et[p + 1] = aree.length; coda[fine++] = p + 1; }
      if (y > 0 && !im[p - N] && et[p - N] < 0) { et[p - N] = aree.length; coda[fine++] = p - N; }
      if (y < N - 1 && !im[p + N] && et[p + N] < 0) { et[p + N] = aree.length; coda[fine++] = p + N; }
    }
    aree.push(area);
  }
  const fondo = N * N * (1 - pieno), aMin = 0.002 * N * N, aMax = 0.05 * N * N;
  let medie = 0, nMedie = 0, nPiccole = 0; for (const A of aree) { if (A >= aMin && A <= aMax) { medie += A; nMedie++; } else if (A < aMin) nPiccole++; }
  const sCelle = (medie / fondo) * Math.min(1, nMedie / 16);
  // nitidezza: i ritagli minuscoli (dove molte linee si incrociano quasi nello stesso punto) sono sporco
  const sNitido = nMedie / (nMedie + 0.6 * nPiccole + 1e-9);
  // le linee distese: quanta parte del disegno non è una spirale stretta
  let stretto = 0, lung = 0;
  const D = M.dentro;
  for (let j = 1; j < D.length; j++) {
    const s0 = D[j - 1], s1 = D[j], L = Math.hypot(s1[2] - s1[0], s1[3] - s1[1]); lung += L;
    if (s0[5] !== s1[5] || s1[6] !== s0[6] + 1) continue;
    let d = Math.atan2(s1[3] - s1[1], s1[2] - s1[0]) - Math.atan2(s0[3] - s0[1], s0[2] - s0[0]); d = Math.abs(Math.atan2(Math.sin(d), Math.cos(d)));
    if (d > 1e-6 && L / d < lato / 30) stretto += L;
  }
  const sDistese = lung ? 1 - stretto / lung : 0;
  // i frammenti: pezzi di traccia corti nel dominio
  const perTraccia = new Map(); for (const s of D) perTraccia.set(s[5], (perTraccia.get(s[5]) || 0) + Math.hypot(s[2] - s[0], s[3] - s[1]));
  let tutto = 0, frammenti = 0; for (const w of perTraccia.values()) { tutto += w; if (w < 0.06 * lato) frammenti += w; }
  const sPulizia = tutto ? 1 - frammenti / tutto : 0;
  // equilibrio: l'inchiostro su una griglia 4×4 del pezzo di pattern
  const c16 = new Float64Array(16), q = N / 4; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) c16[Math.floor(y / q) * 4 + Math.floor(x / q)] += im[y * N + x];
  const tot = c16.reduce((a, b) => a + b, 0); let H = 0; for (const c of c16) if (c) { const p = c / tot; H -= p * Math.log(p); }
  const sEq = H / Math.log(16);
  const totale = sPieno * (0.15 + 0.85 * sCelle) * (0.2 + 0.8 * sNitido) * (0.25 + 0.75 * sDistese) * (0.5 + 0.5 * sPulizia) * (0.4 + 0.6 * sEq);
  // (le tracce che entrano nel pezzo che si ripete, con la loro lunghezza: servono a cercare i rami)
  return { totale, pieno, celle: sCelle, nitido: sNitido, distese: sDistese, pulizia: sPulizia, equilibrio: sEq, pezzi: [...perTraccia] };
}

// ---------- la misura di una finestra, comunque la si guardi. LA FINESTRA DIRETTA («da sola») è il modo normale:
// ciò che le particelle hanno disegnato lì, senza specchi né copie; il suo ordine (una simmetria, un motivo che si
// ripete, linee che girano) dev'esserci davvero. Il caleidoscopio e le altre ripetizioni sono un'aggiunta di chi
// guarda, e si misurano a parte.
export const bellezzaFinestra = (segmenti, ripeti, lato) => (!ripeti || ripeti.gruppo === 'una' ? bellezza(segmenti, lato) : bellezzaPattern(segmenti, ripeti, lato));
