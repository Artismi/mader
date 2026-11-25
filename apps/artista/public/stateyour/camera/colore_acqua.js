// colore_acqua.js — IL COLORE DELL'ACQUA IN 21 BANDE invece di tre (per tessere.worker.js: il mare e i laghi del 3D).
//
// mare.js (coloraMare) fa l'ottica dell'acqua in tre bande, a 650, 550 e 450 nm. Ma lo spettro dell'acqua pura non è fatto di
// tre righe: l'assorbimento ha il minimo a 417 nm (0,0044/m) e sale di cento volte verso il rosso, e la diffusione delle
// molecole cresce come λ^−4,32 verso il viola. Il blu di un mare limpido viene dalle lunghezze d'onda sotto i 450 nm, che la
// banda a 450 non vede. Qui la stessa ottica di mare.js è fatta lunghezza d'onda per lunghezza d'onda, da 400 a 700 nm ogni
// 15 nm, e poi portata nei tre colori dello schermo con le funzioni dell'occhio e la luce della stella:
//   · ACQUA PURA: l'assorbimento di Pope e Fry 1997 (Appl. Opt. 36, 8710, cavità integratrice, 380–727,5 nm; la tabella di
//     omlc.org, letta alle 21 lunghezze d'onda); la diffusione all'indietro dell'acqua di mare b_b = ½·0,00288·(500/λ)^4,32 /m
//     (Morel 1974; la stessa di mare.js, che la usa nelle sue tre bande). Smith e Baker 1981 (Appl. Opt. 20, 177) danno la
//     stessa forma con un assorbimento più alto nel blu (la loro acqua non era del tutto pura): si prende Pope e Fry.
//   · CIÒ CHE L'ACQUA PORTA (mare.js, gli stessi numeri): il fango sospeso C (g/m³, la carta della torbidità di mare.js), che
//     assorbe con la forma esponenziale delle particelle minerali, a(λ) = a(450)·e^(−0,0123·(λ − 450)) (Babin e altri 2003,
//     J. Geophys. Res. 108, 3211: pendenza media 0,0123/nm), con a(450) quello della banda blu di mare.js, e rimanda la luce
//     allo stesso modo a tutte le lunghezze d'onda; il calcare appena nato che sbianca l'acqua calda; il ferro sciolto
//     (interpolato tra le tre bande di mare.js in scala logaritmica). NIENTE PLANCTON: il modello non ha vita.
//   · LA RIFLETTANZA sotto la superficie R = 0,33·b_b/(a + b_b) (Gordon e altri 1975, come mare.js), con il fondo che si vede
//     attraverso due volte lo spessore d: R + (R_fondo − R)·e^(−2(a + b_b)d); sopra la superficie ×0,54 (t²/n²: Mobley 1994).
//     La riflettanza del fondo, nota in tre bande, è interpolata in linea retta tra 450, 550 e 650 nm (costante fuori).
//   · NEI TRE COLORI: X, Y, Z con le funzioni dell'osservatore CIE 1931 nella forma a lobi di Wyman, Sloan e Shirley 2013
//     (JCGT 2, 1), sotto lo spettro di corpo nero della stella; poi sRGB lineare (IEC 61966-2-1). La riflettanza di ogni colore
//     è il colore della luce rimandata diviso il colore della luce che arriva: pianeta.js la moltiplica per la luce della
//     stella, e così torna il colore giusto anche sotto una stella rossa.
// → riflettanza(…) [r, g, b] lineari, la riflettanza vista da sopra (senza il riflesso della superficie: lo fa il 3D).
export const BANDE = Array.from({ length: 21 }, (_, i) => 400 + 15 * i);
export const ACQUA_PURA = [0.00663, 0.00444, 0.00495, 0.00751, 0.00979, 0.0114, 0.015, 0.0256, 0.0409, 0.0452, 0.0565, 0.0642, 0.0896, 0.1672, 0.2644, 0.2834, 0.3108, 0.371, 0.439, 0.486, 0.624]; // (1/m, Pope e Fry 1997)
const BB_ACQUA = BANDE.map((l) => 0.5 * 0.00288 * (500 / l) ** 4.32);
// le tre bande di mare.js (OTTICA): fango (assorbimento per 10³ g/m³) a 650, 550, 450; diffusione all'indietro del fango; ferro (per mol/kg)
export const TRE_BANDE = Object.freeze({ lambda: [650, 550, 450], fango: [8, 20, 50], fangoIndietro: 12, ferro: [70, 12, 5], sabbia: [214, 200, 172], carbonato: [238, 234, 218] });
const FANGO = BANDE.map((l) => TRE_BANDE.fango[2] * Math.exp(-0.0123 * (l - 450)));
const logInterp = (v, l) => { const [a, b, c] = TRE_BANDE.lambda; // (650, 550, 450): in logaritmo, a tratti, prolungato
  const ln = v.map(Math.log), seg = l >= b ? [b, a, ln[1], ln[0]] : [c, b, ln[2], ln[1]]; return Math.exp(seg[2] + ((seg[3] - seg[2]) * (l - seg[0])) / (seg[1] - seg[0])); };
const FERRO = BANDE.map((l) => logInterp(TRE_BANDE.ferro, l));
const linInterp = (v, l) => { const [a, b, c] = TRE_BANDE.lambda; if (l <= c) return v[2]; if (l >= a) return v[0]; return l < b ? v[2] + ((v[1] - v[2]) * (l - c)) / (b - c) : v[1] + ((v[0] - v[1]) * (l - b)) / (a - b); };
// le funzioni dell'osservatore CIE 1931 (Wyman, Sloan e Shirley 2013, la forma a più lobi)
const g = (l, m, s1, s2) => { const t = (l - m) / (l < m ? s1 : s2); return Math.exp(-0.5 * t * t); };
const XB = (l) => 1.056 * g(l, 599.8, 37.9, 31.0) + 0.362 * g(l, 442.0, 16.0, 26.7) - 0.065 * g(l, 501.1, 20.4, 26.2);
const YB = (l) => 0.821 * g(l, 568.8, 46.9, 40.5) + 0.286 * g(l, 530.9, 16.3, 31.1);
const ZB = (l) => 1.217 * g(l, 437.0, 11.8, 36.0) + 0.681 * g(l, 459.0, 26.0, 13.8);
const XYZ_RGB = [[3.2406, -1.5372, -0.4986], [-0.9689, 1.8758, 0.0415], [0.0557, -0.204, 1.057]];
// i pesi di ogni banda per i tre colori sotto la luce della stella (corpo nero a T), normalizzati sulla luce che arriva
const pesi = new Map();
export function pesiStella(T = 5772) {
  const k = Math.round(T); let p = pesi.get(k); if (p) return p;
  const planck = (l) => 1 / ((l * 1e-9) ** 5 * (Math.exp(0.014388 / (l * 1e-9 * T)) - 1));
  const w = BANDE.map((l) => { const E = planck(l), x = XB(l) * E, y = YB(l) * E, z = ZB(l) * E; return XYZ_RGB.map((r) => r[0] * x + r[1] * y + r[2] * z); });
  const tot = [0, 1, 2].map((c) => w.reduce((s, q) => s + q[c], 0)); p = w.map((q) => q.map((x, c) => x / tot[c])); pesi.set(k, p); if (pesi.size > 16) pesi.delete(pesi.keys().next().value); return p;
}
// C: fango sospeso (g/m³); bianco: calcare sospeso (g/m³, come mare.js); Fe: ferro sciolto (mol/kg); d: profondità (m, Infinity
// in mare aperto); fondo: la riflettanza del fondo nelle tre bande di mare.js (lineare, 650, 550, 450), già con la sua ombra
export function riflettanza({ C = 0, bianco = 0, Fe = 0, d = Infinity, fondo = null, T = 5772 } = {}, out = [0, 0, 0]) {
  const p = pesiStella(T); out[0] = out[1] = out[2] = 0;
  for (let i = 0; i < BANDE.length; i++) {
    const a = ACQUA_PURA[i] + FANGO[i] * 1e-3 * C + FERRO[i] * Fe * 230, b = BB_ACQUA[i] + TRE_BANDE.fangoIndietro * 1e-3 * (C + bianco);
    let R = (0.33 * b) / (a + b); if (fondo && d < 1e4) { const Rf = linInterp(fondo, BANDE[i]); R += (Rf - R) * Math.exp(-2 * (a + b) * Math.max(0, d)); }
    R *= 0.54; for (let c = 0; c < 3; c++) out[c] += p[i][c] * R;
  }
  for (let c = 0; c < 3; c++) out[c] = Math.max(0, out[c]);
  return out;
}

// IL PUNTO: ciò che l'acqua porta lì, letto dallo stato di mare.js come lo legge coloraMare (la torbidità della carta fine,
// il calcare dove l'acqua è soprassatura, il ferro, il fondo) → la riflettanza in out, oppure null dove coloraMare mette
// ghiaccio o sale (lì resta il suo colore). d: profondità (m); ombra: il rilievo del fondo (1 = piano), come in coloraMare.
// (Senza lo spostamento del fango che mare.js fa con un rumore fisso sotto i 30 km: nel 3D il fango lo girano i vortici, vortici.js.)
const limita = (x, a, b) => Math.max(a, Math.min(b, x));
const bil = (arr, W, H, x, y) => { const yy = limita(y, 0, H - 1.001), x0 = Math.floor(x), y0 = Math.floor(yy), u = x - x0, v = yy - y0, a = (i, j) => arr[j * W + (((i % W) + W) % W)];
  return (a(x0, y0) * (1 - u) + a(x0 + 1, y0) * u) * (1 - v) + (a(x0, y0 + 1) * (1 - u) + a(x0 + 1, y0 + 1) * u) * v; };
const lin = (c) => Math.pow(c / 255, 2.2);
export function acquaNelPunto(stato, lon, lat, d, ombra = 1, out = [0, 0, 0]) {
  const F = stato?.fine; if (!F || !F.tipo) return null;
  const i = ((Math.floor(((lon + 180) / 360) * F.W) % F.W) + F.W) % F.W, j = limita(Math.floor(((90 - lat) / 180) * F.H), 0, F.H - 1), k = j * F.W + i;
  let tipo = F.tipo[k]; if (tipo === 0) tipo = 1; if (tipo === 4) return null;
  const L = F.lago && F.lago[k] >= 0 ? stato.laghi[F.lago[k]] : null, bacino = tipo === 1 && F.bacino && F.bacino[k] >= 0 ? stato.bacini[F.bacino[k]] : null;
  const campo = (arr) => bil(arr, stato.W, stato.H, ((lon + 180) / 360) * stato.W - 0.5, ((90 - lat) / 180) * stato.H - 0.5);
  const gelo = tipo === 1 ? (stato.ghiaccio ? campo(stato.ghiaccio) : 0) : L ? L.ghiaccio : 0; if (gelo > 0) return null;
  if ((L && L.tipo !== 'aperto' && L.precipitati && L.precipitati.salgemma + L.precipitati.gesso + (L.precipitati.amari || 0) > 0) || (bacino && bacino.saturo)) return null;
  const x = ((lon + 180) / 360) * F.W - 0.5, y = ((90 - lat) / 180) * F.H - 0.5;
  let C = 0, bianco = 0;
  if (tipo === 1) { C = 1000 * Math.max(0, bil(F.torbida, F.W, F.H, x, y));
    if (stato.saturazione) { const om = bil(stato.saturazione.calcite, stato.W, stato.H, ((x + 0.5) / F.W) * stato.W - 0.5, ((y + 0.5) / F.H) * stato.H - 0.5), sg = stato.soglia || 20; if (om > sg) bianco = 0.1 * 1e5 * (stato.ioni['CO3(2-)'] || 0) * (1 - sg / om); } }
  else C = 1000 * (L && L.tipo === 'aperto' ? 0.02 * stato.fiume.sospeso : 0.002);
  const Fe = tipo === 1 ? stato.totali.Fe || 0 : 0, tf = F.fondale ? F.fondale[k] : 0, calc = tipo === 1 && d < 60 && stato.saturazione && campo(stato.saturazione.calcite) > 1.05 * (stato.soglia || 20);
  const cf = calc ? TRE_BANDE.carbonato : tf === 1 ? stato.coloreFondo : tf === 2 ? stato.coloreContinente : TRE_BANDE.sabbia, mf = calc ? 1 : tf === 2 ? 0.55 : tf === 0 ? 0.5 : 1;
  const fondo = [0, 1, 2].map((q) => 0.3 * mf * ombra * lin(tf === 0 && !calc ? 0.5 * (cf[q] + stato.coloreContinente[q]) : cf[q]));
  return riflettanza({ C, bianco, Fe, d, fondo, T: stato.Tstella || 5772 }, out);
}
