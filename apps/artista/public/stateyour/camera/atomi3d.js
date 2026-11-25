// atomi3d.js — LA MATERIA ALLA SCALA DEGLI ATOMI, in tre dimensioni.
//
// In fondo allo zoom l'universo non è più un'immagine: è materia fatta di atomi. Questa è la vista che la mostra
// atomo per atomo: ogni atomo una sferetta col suo raggio vero, centinaia di migliaia insieme, e la forma dell'insieme
// che si legge perché le sferette vicine si fanno ombra (come nelle rese «atomo per atomo» delle macchine molecolari).
// WebGL scritto a mano (WebGL2; ripiega su WebGL1 con le estensioni che servono), nessuna libreria, nessuno stato
// globale: una vista si monta su una tela e si smonta.
//
// ───────────────────────────── L'INGRESSO: UNA SCENA (generica, non legata a un caso) ─────────────────────────────
//   scena = {
//     unita: 'nm' | 'A' | 'm',            // l'unità di pos, raggio, scatola, agitazione, etichette (se manca: NANOMETRI)
//     atomi: {
//       pos:      Float32Array(3N),       // x, y, z di ogni atomo
//       raggio:   Float32Array(N),        // il raggio VERO (van der Waals, ionico o covalente: lo sceglie chi fa la scena);
//                                         //   se manca, quello di van der Waals dell'elemento (tabella ELEMENTI qui sotto)
//       elemento: Uint8Array(N),          // (facoltativo) il numero atomico Z: serve al colore per elemento e a dire che cos'è
//       colore:   Uint8Array(3N),         // (facoltativo) un colore per atomo; se manca: quello della parte, o dell'elemento
//       parte:    Uint16Array(N),         // (facoltativo) l'indice in `parti` (se manca si usano parti[k].da / .a)
//       gruppo:   Uint32Array(N),         // (facoltativo) a quale molecola appartiene: il taglio «ad atomi interi» la toglie tutta insieme
//       agitazione: Float32Array(N),      // (facoltativo) ampiezza dell'agitazione termica di ogni atomo (scarto per asse)
//       pos2:     Float32Array(3N),       // (facoltativo) le posizioni «dopo»: vista.mescola(f) le interpola (0 → pos, 1 → pos2)
//     },
//     legami:   Uint32Array(2M),          // (facoltativo) coppie di indici: bastoncini tra gli atomi (si vedono se i raggi
//                                         //   sono rimpiccioliti: opzione scalaRaggi < 0,9)
//     colora:   'elemento' | 'parte',     // (facoltativo) come la scena preferisce essere colorata, se chi la monta non dice altro
//     scatola:  [lx, ly, lz],             // il volume della scena (da 0 a l su ogni asse); serve a inquadrare
//     parti:    [{ nome, da, a, colore: [r, g, b] }],   // le parti (una proteina, l'acqua, il cristallo…): atomi da `da`
//                                         //   (compreso) ad `a` (escluso), oppure dette da atomi.parte
//     etichette: [{ testo, pos: [x, y, z], scarto: [dx, dy] }],   // una scritta bianca con la linea che indica il punto
//     agitazione: { 8: 0.012, 1: 0.02, … } | numero,   // (facoltativo) ampiezza per elemento (chiave Z o simbolo), alla
//                                         //   temperatura della scena: la calcola chi fa la scena; qui si muove soltanto
//     tempo:    (t, pos) => true | false  // (facoltativo) una funzione che a ogni fotogramma riscrive `pos` (una copia di
//               | { fotogrammi: [Float32Array(3N), …], durata: secondi, ciclo: true },   // lavoro) — oppure posizioni
//                                         //   successive, tra cui la vista interpola. Basta questo: un buffer per fotogramma.
//     nome, descrizione                   // (facoltativi) per chi la mostra
//   }
// Dentro, tutto è in NANOMETRI (numeri a 32 bit: un atomo è 0,1, una scena 100: nessun problema di precisione).
//
// ───────────────────────────── COME È RESA ─────────────────────────────
//   · ogni atomo è un «impostore»: nel frammento si calcola dove il raggio dell'occhio per quel pixel tocca la sfera, e
//     si scrive la profondità GIUSTA (le sfere si compenetrano come sfere vere, a ogni ingrandimento). L'impostore è
//     un quadratino a ISTANZE per gli atomi larghi sullo schermo e un PUNTO (un vertice solo) per quelli piccoli, che
//     sono quasi tutti: stessi buffer, stesso frammento. (Attorno all'immagine si disegna un bordo di 32 pixel che poi
//     non si mostra: un punto col centro appena fuori schermo sarebbe scartato tutto insieme e sparirebbe di colpo.)
//     Con `punti: false` è tutto a istanze;
//   · luce semplice (una lampada in alto a sinistra, un po' di ambiente, un riflesso piccolo), colori pieni;
//   · OMBRE MORBIDE TRA ATOMI VICINI: occlusione ambientale calcolata dallo schermo (dalla sola profondità: le normali
//     si ricostruiscono), a due scale — quella dell'atomo (il contatto tra sferette) e quella della forma (le pieghe
//     dell'insieme: il suo raggio segue l'inquadratura) — a metà risoluzione, poi sfumata rispettando i bordi;
//   · contorno scuro dove la profondità salta, attenuazione con la distanza dietro il centro di rotazione, sfocatura
//     leggera dei piani lontani (`sfoca`); sfondo nero; etichette bianche con la linea, disegnate nella stessa tela;
//   · un PIANO DI TAGLIO: le sfere tagliate mostrano la sezione piena (un dischetto), oppure (`interi`) si tolgono gli
//     atomi — o le molecole, se la scena dice i gruppi — che stanno oltre il piano: così si guarda dentro la materia;
//   · il principio della nebbia (nebbia.js) per le quantità: da lontano gli atomi di una celletta sono rappresentati da
//     UNA sferetta più grande (stesso volume, il colore medio della parte che lì prevale, la posizione di un atomo
//     vero), e ognuna dichiara quanti atomi rappresenta; da vicino tornano gli atomi. Quattro grossezze (≈ 8, 64, 512,
//     4096 atomi), scelte pezzo per pezzo dai pixel che la celletta occupa, e dal tetto `massimoIstanze`;
//   · gli atomi SEPOLTI (coperti da almeno un nanometro scarso di materia fitta da ogni lato) non si disegnano finché
//     il taglio o l'occhio non li scoprono: in un blocco pieno sono i quattro quinti;
//   · il moto: un'agitazione per atomo calcolata nel vertice (nessun costo per chi disegna), due insiemi di posizioni
//     mescolati, o un buffer di posizioni riscritto a ogni fotogramma (`tempo`).
// WebGL1 va con ANGLE_instanced_arrays, EXT_frag_depth e WEBGL_depth_texture (senza l'ultima: niente ombre).
//
// ───────────────────────────── L'USO ─────────────────────────────
//   const v = creaVista3D(tela, { alCambio: () => … });   // la tela è solo sua (un contesto WebGL per tela)
//   v.carica(scena);                 // prepara e manda alla scheda; restituisce le statistiche; carica(null) svuota
//   v.disegna(t);                    // un fotogramma all'istante t (secondi): lo chiama il ciclo di chi la monta.
//                                    //   Senza `alCambio` la vista si ridisegna da sé quando la camera cambia;
//                                    //   v.avvia() / v.ferma() fanno girare un ciclo suo (serve se la scena si muove)
//   v.ridimensiona();                // quando la tela cambia misura
//   v.camera                         // { bersaglio: [x, y, z] nm, yaw, pitch, dist, fov, inquadra() }: si può scrivere
//   v.suAtomo((a) => …);             // a = { indice, elemento, simbolo, nome, parte, rappresenta, pos, x, y } oppure null
//   v.taglio({ vista: true, scarto: 0 });   // o { normale, quota, interi }; null lo toglie
//   v.mescola(f); v.aggiornaPosizioni(pos); v.scegli(x, y); v.statistiche(); v.opzioni (si possono cambiare al volo)
//   v.libera();                      // toglie ascolti, orologi, buffer e contesto: la tela non si riusa, se ne fa un'altra
// Con il mouse: trascinare ruota; tasto destro o maiuscolo sposta; la rotella avvicina verso il punto sotto il cursore;
// due clic portano lì il centro di rotazione; passare sopra un atomo chiama suAtomo.
//
// Le scene vere (acqua col sale, cristalli e la loro faccia bagnata, la prova di carico) sono in fondo: scenaAcqua,
// scenaCristallo, scenaDoppioStrato. Il caso viene dalla sorgente degli eventi (eventi.js): stessa radice, stessa scena.
// preparaScena (dalla scena ai buffer) non ha bisogno della grafica e si prova da sola: test/test_atomi3d.mjs.

import { sorgente } from './eventi.js';
import { ZERO_CELSIUS } from './leggi.js'; // le costanti e le unità: un posto solo

// ---------- gli elementi: colori convenzionali (Corey-Pauling-Koltun, nella versione di Jmol) e raggi in ångström
// [simbolo, nome, colore, raggio di van der Waals (Bondi 1964; Mantina e altri 2009), covalente (Cordero e altri 2008),
//  ionico a sei vicini (Shannon 1976) con la carica a cui si riferisce]
const TAVOLA = {
  1: ['H', 'idrogeno', [255, 255, 255], 1.10, 0.31, 0, 1], 2: ['He', 'elio', [217, 255, 255], 1.40, 0.28, 0, 0],
  3: ['Li', 'litio', [204, 128, 255], 1.82, 1.28, 0.76, 1], 6: ['C', 'carbonio', [144, 144, 144], 1.70, 0.76, 0, 0],
  7: ['N', 'azoto', [48, 80, 248], 1.55, 0.71, 0, 0], 8: ['O', 'ossigeno', [255, 13, 13], 1.52, 0.66, 1.40, -2],
  9: ['F', 'fluoro', [144, 224, 80], 1.47, 0.57, 1.33, -1], 10: ['Ne', 'neon', [179, 227, 245], 1.54, 0.58, 0, 0],
  11: ['Na', 'sodio', [171, 92, 242], 2.27, 1.66, 1.02, 1], 12: ['Mg', 'magnesio', [138, 255, 0], 1.73, 1.41, 0.72, 2],
  13: ['Al', 'alluminio', [191, 166, 166], 1.84, 1.21, 0.535, 3], 14: ['Si', 'silicio', [240, 200, 160], 2.10, 1.11, 0.40, 4],
  15: ['P', 'fosforo', [255, 128, 0], 1.80, 1.07, 0, 0], 16: ['S', 'zolfo', [255, 255, 48], 1.80, 1.05, 1.84, -2],
  17: ['Cl', 'cloro', [31, 240, 31], 1.75, 1.02, 1.81, -1], 18: ['Ar', 'argon', [128, 209, 227], 1.88, 1.06, 0, 0],
  19: ['K', 'potassio', [143, 64, 212], 2.75, 2.03, 1.38, 1], 20: ['Ca', 'calcio', [61, 255, 0], 2.31, 1.76, 1.00, 2],
  22: ['Ti', 'titanio', [191, 194, 199], 2.15, 1.60, 0.605, 4], 25: ['Mn', 'manganese', [156, 122, 199], 2.05, 1.39, 0.83, 2],
  26: ['Fe', 'ferro', [224, 102, 51], 2.04, 1.32, 0.78, 2], 28: ['Ni', 'nichel', [80, 208, 80], 1.63, 1.24, 0.69, 2],
  29: ['Cu', 'rame', [200, 128, 51], 1.40, 1.32, 0.73, 2], 30: ['Zn', 'zinco', [125, 128, 176], 1.39, 1.22, 0.74, 2],
  35: ['Br', 'bromo', [166, 41, 41], 1.85, 1.20, 1.96, -1], 38: ['Sr', 'stronzio', [0, 255, 0], 2.49, 1.95, 1.18, 2],
  53: ['I', 'iodio', [148, 0, 148], 1.98, 1.39, 2.20, -1], 56: ['Ba', 'bario', [0, 201, 0], 2.68, 2.15, 1.35, 2],
};
// ELEMENTI[Z] e ELEMENTI['Na']: { Z, simbolo, nome, colore, vdw, covalente, ionico (nm), carica }
export const ELEMENTI = {};
for (const [z, [simbolo, nome, colore, vdw, cov, ion, carica]] of Object.entries(TAVOLA)) {
  const e = { Z: +z, simbolo, nome, colore, vdw: vdw / 10, covalente: cov / 10, ionico: ion ? ion / 10 : null, carica };
  ELEMENTI[z] = e; ELEMENTI[simbolo] = e;
}
// i colori delle parti quando la scena non li dà (pieni e saturi: ogni parte si distingue da lontano)
export const COLORI_PARTI = [[255, 208, 0], [236, 38, 143], [0, 196, 200], [70, 200, 60], [255, 122, 20], [60, 124, 255], [156, 92, 240], [235, 56, 50], [240, 240, 240], [150, 110, 70]];
const UNITA = { nm: 1, A: 0.1, 'Å': 0.1, m: 1e9, pm: 1e-3 };

// ---------- LA PREPARAZIONE (senza grafica: si prova da sola). Dalla scena ai buffer da disegnare:
// gli atomi riordinati a PEZZI di spazio (per scartare ciò che è fuori dallo schermo e scegliere il dettaglio pezzo per
// pezzo), in ogni pezzo prima gli esposti e poi i SEPOLTI, e in coda i GRUPPI: le sferette che da lontano stanno per
// molti atomi, a quattro grossezze (cellette di lato s, 2s, 4s, 8s).
//   → { N, M, pos (3M, nm), statico (M × 8 byte: raggio a 32 bit + r, g, b, agitazione), ordine (M: quale atomo),
//       rappresenta (M − N: quanti atomi per gruppo), pezzi: [{ c, r, liv: [{ da, nE, nB }] × 5 }], passi: [s…], … }
export function preparaScena(scena, opz = {}) {
  const A = scena && scena.atomi; if (!A || !A.pos) throw new Error('atomi3d: la scena non ha atomi.pos');
  const ku = UNITA[scena.unita || 'nm']; if (!ku) throw new Error(`atomi3d: unità sconosciuta «${scena.unita}»`);
  const N = Math.floor(A.pos.length / 3), pos = new Float32Array(3 * N), rag = new Float32Array(N), el = A.elemento || null;
  for (let i = 0; i < 3 * N; i++) pos[i] = A.pos[i] * ku;
  let rMax = 0, rSomma = 0;
  for (let i = 0; i < N; i++) { const r = A.raggio ? (A.raggio.length ? A.raggio[i] : A.raggio) * ku : ELEMENTI[el ? el[i] : 6]?.vdw || 0.17; rag[i] = r; rSomma += r; if (r > rMax) rMax = r; }
  // la parte di ogni atomo
  const parti = scena.parti || []; let parteDi = A.parte || null;
  if (!parteDi && parti.length && parti[0].da != null) { parteDi = new Uint16Array(N).fill(65535); parti.forEach((p, k) => parteDi.fill(k, Math.max(0, p.da), Math.min(N, p.a))); }
  // il colore: dato atomo per atomo, o della parte, o dell'elemento
  const modo = opz.colora && opz.colora !== 'auto' ? opz.colora : scena.colora || 'auto', rgb = new Uint8Array(3 * N);
  const perParte = parteDi && (modo === 'parte' || (modo === 'auto' && !A.colore && parti.some((p) => p.colore))), perElemento = el && !perParte && (modo === 'elemento' || !A.colore);
  if (perParte) { const tav = parti.map((p, k) => p.colore || COLORI_PARTI[k % COLORI_PARTI.length]); for (let i = 0; i < N; i++) { const c = tav[parteDi[i]] || [150, 150, 150]; rgb[3 * i] = c[0]; rgb[3 * i + 1] = c[1]; rgb[3 * i + 2] = c[2]; } }
  else if (perElemento) { const tav = []; for (let z = 0; z < 256; z++) tav.push(ELEMENTI[z]?.colore || [255, 20, 147]); for (let i = 0; i < N; i++) { const c = tav[el[i]]; rgb[3 * i] = c[0]; rgb[3 * i + 1] = c[1]; rgb[3 * i + 2] = c[2]; } }
  else if (A.colore) rgb.set(A.colore.subarray ? A.colore.subarray(0, 3 * N) : A.colore);
  else rgb.fill(170);
  // l'agitazione termica: per atomo, o per elemento; nel buffer va in un byte (frazione della massima)
  const agita = new Float32Array(N); let agitaMax = 0;
  if (A.agitazione) for (let i = 0; i < N; i++) agita[i] = A.agitazione[i] * ku;
  else if (typeof scena.agitazione === 'number') agita.fill(scena.agitazione * ku);
  else if (scena.agitazione && el) { const tav = new Float32Array(256); for (const [k, v] of Object.entries(scena.agitazione)) { const z = ELEMENTI[k]?.Z ?? +k; if (z >= 0 && z < 256) tav[z] = v * ku; } for (let i = 0; i < N; i++) agita[i] = tav[el[i]]; }
  for (let i = 0; i < N; i++) if (agita[i] > agitaMax) agitaMax = agita[i];
  // la scatola che contiene tutto
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < N; i++) for (let k = 0; k < 3; k++) { const x = pos[3 * i + k]; if (x < lo[k]) lo[k] = x; if (x > hi[k]) hi[k] = x; }
  if (!N) { lo.fill(0); hi.fill(1); }
  const dim = [0, 1, 2].map((k) => Math.max(1e-3, hi[k] - lo[k]));
  // --- I SEPOLTI. Una griglia di cellette: è «opaca» quella attorno a cui gli atomi, messi in fila, coprirebbero
  // quasi tutta la sua faccia (0,8 volte); un atomo è sepolto se tutte le cellette intorno, per una profondità data, sono opache.
  const cs = Math.max(0.45, Math.cbrt((dim[0] * dim[1] * dim[2]) / 3e6)), gx = Math.ceil(dim[0] / cs) + 1, gy = Math.ceil(dim[1] / cs) + 1, gz = Math.ceil(dim[2] / cs) + 1;
  const cellaDi = new Int32Array(N), area = new Float32Array(gx * gy * gz); let occupate = 0;
  for (let i = 0; i < N; i++) {
    const c = Math.floor((pos[3 * i] - lo[0]) / cs) + gx * (Math.floor((pos[3 * i + 1] - lo[1]) / cs) + gy * Math.floor((pos[3 * i + 2] - lo[2]) / cs));
    cellaDi[i] = c; if (area[c] === 0) occupate++; area[c] += Math.PI * rag[i] * rag[i];
  }
  const sepolto = new Uint8Array(N); let quantiSepolti = 0;
  if (opz.scartaSepolti !== false && N > 2000) {
    // (la copertura si media sulle cellette intorno, due volte — un peso a triangolo largo cinque cellette — perché conti
    // quanta materia c'è lì attorno e non come il reticolo di un cristallo cade sulla griglia)
    const passi = [1, gx, gx * gy], lati = [gx, gy, gz]; let m1 = area, m2 = new Float32Array(area.length);
    for (let volta = 0; volta < 6; volta++) { const asse = volta % 3, p = passi[asse], n = lati[asse];
      for (let c = 0; c < m1.length; c++) { const k = asse === 0 ? c % gx : asse === 1 ? Math.floor(c / gx) % gy : Math.floor(c / (gx * gy)); m2[c] = m1[c] + (k > 0 ? m1[c - p] : 0) + (k < n - 1 ? m1[c + p] : 0); }
      if (volta === 0) { m1 = m2; m2 = new Float32Array(area.length); } else { const t = m1; m1 = m2; m2 = t; } }
    let g = new Uint8Array(area.length), h = new Uint8Array(area.length); const soglia = 729 * 0.8 * cs * cs;
    for (let c = 0; c < area.length; c++) g[c] = m1[c] >= soglia ? 1 : 0;
    const giri = Math.max(2, Math.round((opz.profonditaSepolti ?? 0.9) / cs));
    for (let giro = 0; giro < giri; giro++) for (let asse = 0; asse < 3; asse++) {
      const p = passi[asse], n = lati[asse];
      for (let c = 0; c < g.length; c++) { const k = asse === 0 ? c % gx : asse === 1 ? Math.floor(c / gx) % gy : Math.floor(c / (gx * gy)); h[c] = k > 0 && k < n - 1 ? g[c] & g[c - p] & g[c + p] : 0; }
      const s = g; g = h; h = s;
    }
    for (let i = 0; i < N; i++) if (g[cellaDi[i]]) { sepolto[i] = 1; quantiSepolti++; }
  }
  // --- I PEZZI. Il passo fine s è il doppio della distanza media tra atomi (≈ 8 atomi per celletta); un pezzo è 8 s.
  const passoAtomi = Math.cbrt((Math.max(1, occupate) * cs * cs * cs) / Math.max(1, N)), s1 = Math.max(2 * Math.min(passoAtomi, cs), 2.2 * (rSomma / Math.max(1, N)), Math.max(...dim) / 4096);
  // (se la materia è rada o a fogli e i pezzi verrebbero quasi vuoti, il pezzo raddoppia: 16 o 32 s)
  const pezzoDi = new Int32Array(N); let m0 = 8, lp, origini, conta;
  for (;;) {
    lp = m0 * s1; const px = Math.ceil(dim[0] / lp) || 1, py = Math.ceil(dim[1] / lp) || 1, pz = Math.ceil(dim[2] / lp) || 1;
    const tanti = px * py * pz, mappa = tanti > 4e6, tabella = mappa ? new Map() : new Int32Array(tanti).fill(-1); origini = []; conta = [];
    for (let i = 0; i < N; i++) {
      const ix = Math.min(px - 1, Math.floor((pos[3 * i] - lo[0]) / lp)), iy = Math.min(py - 1, Math.floor((pos[3 * i + 1] - lo[1]) / lp)), iz = Math.min(pz - 1, Math.floor((pos[3 * i + 2] - lo[2]) / lp)), id = ix + px * (iy + py * iz);
      let k = mappa ? tabella.get(id) ?? -1 : tabella[id];
      if (k < 0) { k = origini.length; origini.push([lo[0] + ix * lp, lo[1] + iy * lp, lo[2] + iz * lp]); conta.push(0, 0); if (mappa) tabella.set(id, k); else tabella[id] = k; }
      pezzoDi[i] = k; conta[2 * k + sepolto[i]]++;
    }
    if (m0 >= 32 || N / origini.length >= 2500 || origini.length <= 8) break; m0 *= 2;
  }
  const P = origini.length, inizio = new Int32Array(2 * P + 1); for (let k = 0; k < 2 * P; k++) inizio[k + 1] = inizio[k] + conta[k];
  const ordAtomi = new Uint32Array(N), cursore = inizio.slice(0, 2 * P);
  for (let i = 0; i < N; i++) ordAtomi[cursore[2 * pezzoDi[i] + sepolto[i]]++] = i;
  // --- I GRUPPI, pezzo per pezzo. Al livello 1 le cellette hanno lato s (8 per lato del pezzo); i livelli 2, 3, 4 si
  // fanno fondendo a otto a otto quelli del livello prima. Di ogni gruppo: quanti atomi, il volume (somma dei raggi al
  // cubo), il baricentro, la parte che prevale (a volume), il suo colore medio, un atomo vero che lo rappresenta.
  const gOrd = [], gRag = [], gCol = [], gConta = [], pezzi = [], LIV = 4;
  const nc = m0 ** 3, cn = new Int32Array(nc), cv = new Float32Array(nc), cx = new Float32Array(nc), cy = new Float32Array(nc), cz = new Float32Array(nc), cp = new Int32Array(nc), cw = new Float32Array(nc), cb = new Uint8Array(nc);
  const kr = new Float32Array(nc), kg = new Float32Array(nc), kb = new Float32Array(nc), kw = new Float32Array(nc), cr = new Int32Array(nc), cd = new Float32Array(nc);
  for (let k = 0; k < P; k++) {
    const o = origini[k], da = inizio[2 * k], nE = conta[2 * k], nB = conta[2 * k + 1], n = nE + nB, liv = [{ da, nE, nB }];
    // la sfera che contiene il pezzo
    let bx = 0, by = 0, bz = 0; for (let j = da; j < da + n; j++) { const i = ordAtomi[j]; bx += pos[3 * i]; by += pos[3 * i + 1]; bz += pos[3 * i + 2]; }
    bx /= n; by /= n; bz /= n; let r2 = 0; for (let j = da; j < da + n; j++) { const i = ordAtomi[j], d = (pos[3 * i] - bx) ** 2 + (pos[3 * i + 1] - by) ** 2 + (pos[3 * i + 2] - bz) ** 2; if (d > r2) r2 = d; }
    cn.fill(0); cv.fill(0); cx.fill(0); cy.fill(0); cz.fill(0); cw.fill(0); cb.fill(1); kr.fill(0); kg.fill(0); kb.fill(0); kw.fill(0); cd.fill(Infinity);
    const mm = m0 - 1, cellina = (i) => Math.min(mm, Math.max(0, Math.floor((pos[3 * i] - o[0]) / s1))) + m0 * (Math.min(mm, Math.max(0, Math.floor((pos[3 * i + 1] - o[1]) / s1))) + m0 * Math.min(mm, Math.max(0, Math.floor((pos[3 * i + 2] - o[2]) / s1))));
    for (let j = da; j < da + n; j++) {
      const i = ordAtomi[j], c = cellina(i), r = rag[i], v = r * r * r, p = parteDi ? parteDi[i] : 0;
      cn[c]++; cv[c] += v; cx[c] += v * pos[3 * i]; cy[c] += v * pos[3 * i + 1]; cz[c] += v * pos[3 * i + 2]; if (!sepolto[i]) cb[c] = 0;
      if (cw[c] === 0) { cp[c] = p; cw[c] = v; } else if (cp[c] === p) cw[c] += v; else { cw[c] -= v; if (cw[c] < 0) { cp[c] = p; cw[c] = -cw[c]; } } // la parte che prevale (voto di maggioranza)
    }
    for (let c = 0; c < nc; c++) if (cn[c]) { cx[c] /= cv[c]; cy[c] /= cv[c]; cz[c] /= cv[c]; }
    for (let j = da; j < da + n; j++) {
      const i = ordAtomi[j], c = cellina(i); if (parteDi && parteDi[i] !== cp[c]) continue;
      const w = rag[i] * rag[i], d = (pos[3 * i] - cx[c]) ** 2 + (pos[3 * i + 1] - cy[c]) ** 2 + (pos[3 * i + 2] - cz[c]) ** 2;
      kr[c] += w * rgb[3 * i]; kg[c] += w * rgb[3 * i + 1]; kb[c] += w * rgb[3 * i + 2]; kw[c] += w; if (d < cd[c]) { cd[c] = d; cr[c] = i; }
    }
    let lato = m0, prima = n;
    for (let L = 1; L <= LIV; L++) {
      if (L > 1) { // fonde a otto a otto (sul posto: la celletta madre ha indice minore o uguale a quello delle figlie)
        const m = lato / 2;
        for (let z = 0; z < m; z++) for (let y = 0; y < m; y++) for (let x = 0; x < m; x++) {
          let tn = 0, tv = 0, sx = 0, sy = 0, sz = 0, sep = 1, pMeglio = 0, wMeglio = -1; const figlie = [];
          for (let q = 0; q < 8; q++) { const c = 2 * x + (q & 1) + lato * (2 * y + ((q >> 1) & 1) + lato * (2 * z + (q >> 2))); if (cn[c]) figlie.push(c); }
          for (const c of figlie) { tn += cn[c]; tv += cv[c]; sx += cv[c] * cx[c]; sy += cv[c] * cy[c]; sz += cv[c] * cz[c]; if (!cb[c]) sep = 0; }
          if (tn) { sx /= tv; sy /= tv; sz /= tv; }
          for (const c of figlie) { let w = 0; for (const e of figlie) if (cp[e] === cp[c]) w += cw[e] + 1e-9; if (w > wMeglio) { wMeglio = w; pMeglio = cp[c]; } }
          let r = 0, g = 0, b = 0, w = 0, rap = 0, dm = Infinity;
          for (const c of figlie) if (cp[c] === pMeglio) { r += kr[c]; g += kg[c]; b += kb[c]; w += kw[c]; const i = cr[c], d = (pos[3 * i] - sx) ** 2 + (pos[3 * i + 1] - sy) ** 2 + (pos[3 * i + 2] - sz) ** 2; if (d < dm) { dm = d; rap = i; } }
          const c = x + m * (y + m * z); cn[c] = tn; cv[c] = tv; cx[c] = sx; cy[c] = sy; cz[c] = sz; cb[c] = sep; cp[c] = pMeglio; cw[c] = Math.max(0, wMeglio); kr[c] = r; kg[c] = g; kb[c] = b; kw[c] = w; cr[c] = rap;
        }
        lato = m;
      }
      const tot = lato ** 3; let quanti = 0; for (let c = 0; c < tot; c++) if (cn[c]) quanti++;
      if (quanti > 0.6 * prima) { liv.push(liv[L - 1]); continue; } // non conviene: questo livello è quello prima
      const qui = N + gOrd.length; let e = 0, s = 0;
      for (let giro = 0; giro < 2; giro++) for (let c = 0; c < tot; c++) {
        if (!cn[c] || cb[c] !== giro) continue;
        gOrd.push(cr[c]); gRag.push(cn[c] === 1 ? rag[cr[c]] : 1.1 * Math.cbrt(cv[c])); gCol.push(kr[c] / kw[c], kg[c] / kw[c], kb[c] / kw[c]); gConta.push(cn[c]); if (giro) s++; else e++;
      }
      liv.push({ da: qui, nE: e, nB: s }); prima = quanti;
    }
    pezzi.push({ c: [bx, by, bz], r: Math.sqrt(r2) + rMax, liv });
  }
  // --- i buffer
  const G = gOrd.length, M = N + G, ordine = new Uint32Array(M); ordine.set(ordAtomi); for (let j = 0; j < G; j++) ordine[N + j] = gOrd[j];
  const posOrd = new Float32Array(3 * M), statico = new ArrayBuffer(8 * M), sf = new Float32Array(statico), sb = new Uint8Array(statico);
  for (let j = 0; j < M; j++) {
    const i = ordine[j]; posOrd[3 * j] = pos[3 * i]; posOrd[3 * j + 1] = pos[3 * i + 1]; posOrd[3 * j + 2] = pos[3 * i + 2];
    if (j < N) { sf[2 * j] = rag[i]; sb[8 * j + 4] = rgb[3 * i]; sb[8 * j + 5] = rgb[3 * i + 1]; sb[8 * j + 6] = rgb[3 * i + 2]; sb[8 * j + 7] = agitaMax > 0 ? Math.round((255 * agita[i]) / agitaMax) : 0; }
    else { const q = j - N; sf[2 * j] = gRag[q]; sb[8 * j + 4] = gCol[3 * q]; sb[8 * j + 5] = gCol[3 * q + 1]; sb[8 * j + 6] = gCol[3 * q + 2]; sb[8 * j + 7] = 0; }
  }
  // i PERNI: se la scena dice a quale gruppo (molecola) appartiene ogni atomo, il taglio «ad atomi interi» toglie o
  // lascia il gruppo tutto insieme, guardando il suo baricentro
  let perni = null;
  if (A.gruppo) {
    let ng = 0; for (let i = 0; i < N; i++) if (A.gruppo[i] >= ng) ng = A.gruppo[i] + 1;
    const b = new Float64Array(4 * ng); for (let i = 0; i < N; i++) { const g = 4 * A.gruppo[i]; b[g] += pos[3 * i]; b[g + 1] += pos[3 * i + 1]; b[g + 2] += pos[3 * i + 2]; b[g + 3]++; }
    perni = new Float32Array(3 * M);
    for (let j = 0; j < M; j++) { const i = ordine[j], g = 4 * A.gruppo[i]; if (j < N) { perni[3 * j] = b[g] / b[g + 3]; perni[3 * j + 1] = b[g + 1] / b[g + 3]; perni[3 * j + 2] = b[g + 2] / b[g + 3]; } else { perni[3 * j] = posOrd[3 * j]; perni[3 * j + 1] = posOrd[3 * j + 1]; perni[3 * j + 2] = posOrd[3 * j + 2]; } }
  }
  const centro = [0, 1, 2].map((k) => (lo[k] + hi[k]) / 2), raggioScena = 0.5 * Math.hypot(dim[0], dim[1], dim[2]) + rMax;
  return { N, M, ku, pos: posOrd, statico, perni, ordine, rappresenta: Uint32Array.from(gConta), pezzi, passi: [0, s1, 2 * s1, 4 * s1, 8 * s1], lo, hi, centro, raggioScena, rMax, rMedio: rSomma / Math.max(1, N), agitaMax, quantiSepolti, parteDi, lato: lp };
}

// ---------- piccola algebra (matrici 4×4 per colonne, come le vuole WebGL)
function prospettiva(tanY, aspetto, vicino, lontano) {
  const m = new Float32Array(16); m[0] = 1 / (tanY * aspetto); m[5] = 1 / tanY; m[10] = -(lontano + vicino) / (lontano - vicino); m[11] = -1; m[14] = (-2 * lontano * vicino) / (lontano - vicino); return m;
}
const norma = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const vett = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const scal = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// ---------- i programmi (scritti per WebGL2; per WebGL1 li traduce `perVecchio`)
// Gli atomi si disegnano in due modi con lo stesso frammento: quelli piccoli sullo schermo come PUNTI (un vertice per
// atomo, un quadratino largo quanto la sfera), quelli grandi come quadratini a ISTANZE. Il raggio dell'occhio si
// ricava dal pixel, quindi il frammento non sa quale dei due lo ha generato.
const V_ATOMI = `
in vec2 a_angolo; in vec3 a_pos; in vec3 a_pos2; in float a_raggio; in vec4 a_colore;
#ifdef VECCHIO
in float a_id;
#endif
#ifdef PERNI
in vec3 a_perno;
#endif
uniform mat4 u_vista, u_proj;
uniform vec4 u_scegli;   // per leggere un solo pixel: scala e scarto dello schermo
uniform vec4 u_moto;     // mescolanza tra pos e pos2, tempo, agitazione massima (nm), scala dei raggi
uniform vec4 u_taglio;   // il piano di taglio nello spazio dell'occhio: resta ciò che ha n·p + w >= 0
uniform vec4 u_sepolti;  // x: questo intervallo è di sepolti; y: si vedono entro questa distanza dall'occhio; z: ed entro questa dal taglio; w: c'è il taglio
uniform vec4 u_evid;     // l'atomo sotto il cursore (si schiarisce)
uniform vec4 u_schermo;  // x: il taglio toglie atomi interi (quelli col centro oltre il piano); z: lunghezza focale in pixel; w: lato massimo di un punto in pixel (0: tutto a quadratini)
uniform float u_base;
out vec3 v_c; out vec3 v_col; out float v_r;
#ifdef SCEGLI
out float v_id;
#endif
void main() {
  vec3 pw = mix(a_pos, a_pos2, u_moto.x);
  float amp = a_colore.a * u_moto.z;
  if (amp > 0.0) { // l'agitazione termica: ogni atomo trema attorno al suo posto con fasi sue
    vec3 h = fract(sin(vec3(dot(a_pos, vec3(127.1, 311.7, 74.7)), dot(a_pos, vec3(269.5, 183.3, 246.1)), dot(a_pos, vec3(113.5, 271.9, 124.6)))) * 43758.5453);
    vec3 f = h * 6.2832; float t = u_moto.y;
    pw += amp * 1.16 * (sin(t * (9.0 + 5.0 * h.yzx) + f) + 0.7 * sin(t * (17.0 + 8.0 * h.zxy) + f.zxy * 1.7));
  }
  vec3 c = (u_vista * vec4(pw, 1.0)).xyz;
  float r = a_raggio * u_moto.w, d2 = dot(c, c), dp = dot(u_taglio.xyz, c) + u_taglio.w;
#ifdef PERNI
  float dq = dot(u_taglio.xyz, (u_vista * vec4(a_perno, 1.0)).xyz) + u_taglio.w; // la molecola intera sta di qua o di là
#else
  float dq = dp;
#endif
  bool via = (u_schermo.x > 0.5 ? dq < 0.0 : dp < -r) || d2 <= r * r * 1.0001 || c.z - r > 0.0;
  if (u_sepolti.x > 0.5 && !(d2 < u_sepolti.y * u_sepolti.y || (u_sepolti.w > 0.5 && dp < u_sepolti.z))) via = true;
  v_c = c; v_r = r;
  vec3 col = a_colore.rgb;
  if (u_evid.w > 0.5 && distance(a_pos, u_evid.xyz) < 1e-5) col = mix(col, vec3(1.0), 0.6);
  v_col = col;
#ifdef SCEGLI
#ifdef VECCHIO
  v_id = a_id + 1.0;
#else
#ifdef PUNTI
  v_id = u_base + float(gl_VertexID) + 1.0;
#else
  v_id = u_base + float(gl_InstanceID) + 1.0;
#endif
#endif
#endif
  // quanto è larga la sfera sullo schermo: dal cono che la tocca (tA) e da quanto è fuori asse (tT)
  float tA = r / sqrt(max(d2 - r * r, 1e-12)), tT = length(c.xy) / max(-c.z, 1e-6), den = 1.0 - tT * tA;
  float px = (den > 0.02 && c.z < 0.0) ? 2.0 * ((tT + tA) / den - tT) * u_schermo.z + 2.0 : 1e6;
#ifdef PUNTI
  if (via || px > u_schermo.w) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 1.0; return; }
  vec4 clip = u_proj * vec4(c, 1.0);
  gl_PointSize = px;
#else
  if (via || px <= u_schermo.w) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  // il quadratino: perpendicolare alla retta occhio-centro, largo quanto il cono tangente alla sfera
  float d = sqrt(d2); vec3 w = c / d, u = normalize(cross(w, vec3(0.0, 1.0, 0.0))), v = cross(u, w);
  vec4 clip = u_proj * vec4(c + (a_angolo.x * u + a_angolo.y * v) * (d * tA), 1.0);
#endif
#ifdef CON_PROFONDITA
  clip.z = 0.0; // la profondità vera la scrive il frammento: né il punto né il quadratino devono essere tagliati dai piani vicino e lontano
#else
  clip.z = (u_proj * vec4(c, 1.0)).z / max(1e-6, -c.z) * clip.w;
#endif
  clip.xy = clip.xy * u_scegli.xy + u_scegli.zw * clip.w;
  gl_Position = clip;
}`;
const F_ATOMI = `
in vec3 v_c; in vec3 v_col; in float v_r;
#ifdef SCEGLI
in float v_id;
#endif
uniform vec4 u_tappo; uniform vec4 u_piani; uniform vec3 u_sole; uniform vec4 u_ottica; uniform vec3 u_raggio;
out vec4 o_col;
void main() {
#ifdef SCEGLI
  vec3 d = u_raggio;
#else
  vec3 d = normalize(vec3(gl_FragCoord.xy * u_ottica.xy + u_ottica.zw, -1.0)); // il raggio dell'occhio per questo pixel
#endif
  float b = dot(d, v_c), disc = b * b - dot(v_c, v_c) + v_r * v_r;
  if (disc < 0.0) discard;
  float s = sqrt(disc), t = b - s, tappo = 0.0;
  vec3 n;
  if (dot(u_tappo.xyz, d * t) + u_tappo.w < 0.0) { // il davanti è tagliato: se il piano attraversa la sfera se ne vede la sezione
    float den = dot(u_tappo.xyz, d);
    if (den <= 0.0) discard;
    float tp = -u_tappo.w / den;
    if (tp > b + s) discard;
    t = tp; n = -u_tappo.xyz; tappo = 1.0;
  } else n = (d * t - v_c) / v_r;
  if (t < u_piani.x) discard;
#ifdef CON_PROFONDITA
  gl_FragDepth = clamp((-d.z * t - u_piani.x) / u_piani.y, 0.0, 1.0);
#endif
#ifdef SCEGLI
  o_col = vec4(mod(v_id, 256.0), mod(floor(v_id / 256.0), 256.0), floor(v_id / 65536.0), 255.0) / 255.0;
#else
  float luce = max(dot(n, u_sole), 0.0), q = max(dot(n, normalize(u_sole - d)), 0.0);
  q *= q; q *= q; q *= q; q *= q; q *= q; // il riflesso: alla trentaduesima potenza
  vec3 col = v_col * (u_piani.z + (1.0 - u_piani.z) * luce) + u_piani.w * q;
  if (tappo > 0.5) col = v_col * 0.9; // la sezione: piatta, del colore dell'atomo
  o_col = vec4(col, 1.0);
#endif
}`;
const V_PIENO = `
in vec2 a_angolo; out vec2 v_uv;
void main() { v_uv = a_angolo * 0.5 + 0.5; gl_Position = vec4(a_angolo, 0.0, 1.0); }`;
// l'occlusione ambientale dalla profondità (sul modello di «Scalable Ambient Obscurance», McGuire e altri 2012), a due raggi
const F_OMBRE = `
in vec2 v_uv; out vec4 o_col;
uniform sampler2D u_prof;
uniform vec4 u_pr;   // tangente di metà campo in x e in y, piano vicino, lontano − vicino
uniform vec4 u_px;   // 1/larghezza, 1/altezza; pixel per nanometro a distanza 1; raggio massimo in pixel
uniform vec4 u_ao;   // raggio piccolo e grande (nm), forza piccola e grande
float zDi(vec2 uv) { return u_pr.z + texture(u_prof, uv).r * u_pr.w; }
vec3 pDi(vec2 uv) { float z = zDi(uv); return vec3((uv * 2.0 - 1.0) * u_pr.xy * z, -z); }
void main() {
  float d = texture(u_prof, v_uv).r;
  if (d >= 1.0) { o_col = vec4(1.0); return; }
  float z = u_pr.z + d * u_pr.w;
  vec3 P = vec3((v_uv * 2.0 - 1.0) * u_pr.xy * z, -z);
  // la normale, dalle differenze di profondità (dalla parte dove il salto è minore)
  vec3 a = pDi(v_uv + vec2(u_px.x, 0.0)) - P, b = P - pDi(v_uv - vec2(u_px.x, 0.0));
  vec3 dx = abs(a.z) < abs(b.z) ? a : b;
  a = pDi(v_uv + vec2(0.0, u_px.y)) - P; b = P - pDi(v_uv - vec2(0.0, u_px.y));
  vec3 dy = abs(a.z) < abs(b.z) ? a : b;
  vec3 n = normalize(cross(dx, dy));
  float rumore = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  float k = u_px.z / z, r1 = min(u_ao.x * k, u_px.w), r2 = min(u_ao.y * k, u_px.w), R1 = r1 / k, R2 = r2 / k, s1 = 0.0, s2 = 0.0;
  for (int i = 0; i < 8; i++) {
    float f = (float(i) + 0.5) / 8.0, ang = 6.2832 * (rumore + f * 2.6);
    vec2 dir = vec2(cos(ang), sin(ang));
    vec3 v = pDi(v_uv + dir * (f * r1) * u_px.xy) - P;
    float vv = dot(v, v), q = max(R1 * R1 - vv, 0.0);
    s1 += q * q * q * max((dot(v, n) - 0.05 * R1) / (vv + 1e-3 * R1 * R1), 0.0);
    v = pDi(v_uv + vec2(-dir.y, dir.x) * (sqrt(f) * r2) * u_px.xy) - P;
    vv = dot(v, v); q = max(R2 * R2 - vv, 0.0);
    s2 += q * q * q * max((dot(v, n) - 0.10 * R2) / (vv + 1e-3 * R2 * R2), 0.0);
  }
  // (la somma ha le dimensioni di 1/lunghezza: moltiplicata per il raggio non dipende più dalla scala)
  float A1 = max(0.0, 1.0 - u_ao.z * 5.0 * s1 / (pow(R1, 5.0) * 8.0)), A2 = max(0.0, 1.0 - u_ao.w * 5.0 * s2 / (pow(R2, 5.0) * 8.0));
  float p = d * 65535.0;
  o_col = vec4(max(A1 * A2, 0.08), floor(p / 256.0) / 255.0, mod(p, 256.0) / 255.0, 1.0);
}`;
// la sfumatura dell'ombra, che non scavalca i salti di profondità
const F_SFUMA = `
in vec2 v_uv; out vec4 o_col;
uniform sampler2D u_ao; uniform vec4 u_dir;  // passo (in coordinate dell'immagine), e in w quanto conta la profondità
void main() {
  vec4 c = texture(u_ao, v_uv);
  float z0 = c.g * 255.0 * 256.0 + c.b * 255.0, tot = 0.20, somma = c.r * 0.20;
  if (z0 >= 65535.0) { o_col = c; return; }
  for (int i = 1; i <= 4; i++) {
    float g = i == 1 ? 0.17 : i == 2 ? 0.12 : i == 3 ? 0.07 : 0.035;
    for (int s = -1; s <= 1; s += 2) {
      vec4 q = texture(u_ao, v_uv + u_dir.xy * float(i * s));
      float w = g * max(0.0, 1.0 - abs(q.g * 255.0 * 256.0 + q.b * 255.0 - z0) * u_dir.w);
      somma += q.r * w; tot += w;
    }
  }
  o_col = vec4(somma / tot, c.g, c.b, 1.0);
}`;
// la composizione: colore × ombra, contorno dove la profondità salta, attenuazione con la distanza
const F_COMPONI = `
in vec2 v_uv; out vec4 o_col;
uniform sampler2D u_col, u_prof, u_ao;
uniform vec4 u_pr;    // tangente di metà campo in x e in y, piano vicino, lontano − vicino
uniform vec4 u_px;    // 1/larghezza, 1/altezza dell'immagine; 1/larghezza, 1/altezza dell'ombra
uniform vec4 u_eff;   // forza dell'ombra, del contorno, della nebbia; larghezza del contorno in pixel
uniform vec4 u_dist;  // nebbia da, a; fuoco: da qui comincia a sfocare, e qui è sfocato del tutto
uniform vec4 u_sog;   // soglie del contorno (per unità di distanza), quanto conta la profondità nell'ombra, c'è l'ombra
uniform vec3 u_sfondo;
float zDi(vec2 uv) { return u_pr.z + texture(u_prof, uv).r * u_pr.w; }
void main() {
  float d = texture(u_prof, v_uv).r;
  if (d >= 1.0) { o_col = vec4(u_sfondo, 1.0); return; }
  float z = u_pr.z + d * u_pr.w;
  vec3 col = texture(u_col, v_uv).rgb;
  if (u_sog.w > 0.5) { // l'ombra, presa dai quattro punti vicini che stanno alla stessa profondità
    vec2 p = v_uv / u_px.zw - 0.5, f = fract(p), base = (floor(p) + 0.5) * u_px.zw; float tot = 0.0, ao = 0.0, p16 = d * 65535.0;
    for (int j = 0; j < 2; j++) for (int i = 0; i < 2; i++) {
      vec4 q = texture(u_ao, base + vec2(float(i), float(j)) * u_px.zw);
      float w = (i == 0 ? 1.0 - f.x : f.x) * (j == 0 ? 1.0 - f.y : f.y) / (0.02 + abs(q.g * 255.0 * 256.0 + q.b * 255.0 - p16) * u_sog.z);
      ao += q.r * w; tot += w;
    }
    col *= mix(1.0, ao / max(tot, 1e-6), u_eff.x);
  }
  vec2 e = u_px.xy * u_eff.w;
  float zs = min(min(zDi(v_uv + vec2(e.x, 0.0)), zDi(v_uv - vec2(e.x, 0.0))), min(zDi(v_uv + vec2(0.0, e.y)), zDi(v_uv - vec2(0.0, e.y))));
  col *= 1.0 - u_eff.y * smoothstep(u_sog.x * z, u_sog.y * z, z - zs);
  col *= 1.0 - u_eff.z * smoothstep(u_dist.x, u_dist.y, z);
  o_col = vec4(col, smoothstep(u_dist.z, u_dist.w, z));
}`;
// la sfocatura dei piani lontani: ogni punto raccoglie dai vicini che sono sfocati quanto basta per arrivare fin lì
const F_SFOCA = `
in vec2 v_uv; out vec4 o_col;
uniform sampler2D u_col; uniform vec4 u_px;   // 1/larghezza, 1/altezza, raggio massimo in pixel
void main() {
  vec4 c = texture(u_col, v_uv);
  float r = c.a * u_px.z, tot = 1.0; vec3 somma = c.rgb;
  if (r > 0.5) for (int i = 0; i < 14; i++) {
    float f = sqrt((float(i) + 0.5) / 14.0), ang = float(i) * 2.39996;
    vec2 o = vec2(cos(ang), sin(ang)) * f * r;
    vec4 q = texture(u_col, v_uv + o * u_px.xy);
    float w = smoothstep(0.0, 1.0, q.a * u_px.z - f * r + 1.0);
    somma += q.rgb * w; tot += w;
  }
  o_col = vec4(somma / tot, 1.0);
}`;
// le etichette e le loro linee: rettangoli sullo schermo presi da un'immagine di scritte
const V_SCRITTE = `
in vec4 a_pv; out vec2 v_uv;
void main() { v_uv = a_pv.zw; gl_Position = vec4(a_pv.xy, 0.0, 1.0); }`;
const F_SCRITTE = `
in vec2 v_uv; out vec4 o_col; uniform sampler2D u_col;
void main() { o_col = texture(u_col, v_uv); }`;
// i legami: un rettangolo lungo il segmento tra due atomi, ombreggiato come un cilindro
const V_LEGAMI = `
in vec2 a_angolo; in vec3 a_pos; in vec3 a_pos2; in vec4 a_colore;
uniform mat4 u_vista, u_proj; uniform vec4 u_moto; uniform vec4 u_taglio;
out vec3 v_col; out vec3 v_p; out vec2 v_lato;
void main() {
  vec3 a = (u_vista * vec4(a_pos, 1.0)).xyz, b = (u_vista * vec4(a_pos2, 1.0)).xyz, m = mix(a, b, a_angolo.y * 0.5 + 0.5);
  vec3 asse = normalize(b - a), lato = normalize(cross(asse, m));
  float r = u_moto.w;
  v_p = m + lato * a_angolo.x * r; v_lato = vec2(a_angolo.x, r); v_col = a_colore.rgb;
  gl_Position = u_proj * vec4(v_p, 1.0);
  if (dot(u_taglio.xyz, m) + u_taglio.w < 0.0) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
}`;
const F_LEGAMI = `
in vec3 v_col; in vec3 v_p; in vec2 v_lato;
uniform vec4 u_piani; uniform vec3 u_sole;
out vec4 o_col;
void main() {
  float h = sqrt(max(0.0, 1.0 - v_lato.x * v_lato.x));
  vec3 d = normalize(v_p), p = v_p - d * h * v_lato.y;
#ifdef CON_PROFONDITA
  gl_FragDepth = clamp((-p.z - u_piani.x) / u_piani.y, 0.0, 1.0);
#endif
  o_col = vec4(v_col * (u_piani.z + (1.0 - u_piani.z) * (0.35 + 0.65 * h)), 1.0);
}`;
function perVecchio(src, frammento) {
  let s = src.replace(/\btexture\(/g, 'texture2D(');
  if (frammento) s = s.replace(/\bin (vec\d|float) /g, 'varying $1 ').replace(/out vec4 o_col;/, '').replace(/\bo_col\b/g, 'gl_FragColor').replace(/gl_FragDepth/g, 'gl_FragDepthEXT');
  else s = s.replace(/\bin (vec\d|float) /g, 'attribute $1 ').replace(/\bout (vec\d|float) /g, 'varying $1 ');
  return s;
}

// ---------- LA VISTA
export function creaVista3D(tela, opzioni = {}) {
  const O = {
    ombre: 1, // quanto pesano le ombre morbide (0: spente)
    raggioOmbre: 0.32, // il raggio dell'ombra di contatto, in nanometri (≈ un atomo e mezzo)
    ombreForma: 1, // il peso dell'ombra larga, quella che fa leggere la forma (il suo raggio segue l'inquadratura)
    risoluzioneOmbre: 0, // 1: piena, 0.5: metà; 0: sceglie da sé (metà, tranne che nelle tele piccole)
    contorno: 0.45, nebbia: 0.6, sfoca: 0, // contorno e attenuazione con la profondità (0–1); sfocatura dei piani lontani: raggio massimo in pixel (0: spenta)
    luceAmbiente: 0.48, riflesso: 0.14, sfondo: [0, 0, 0],
    densita: 0, // pixel veri per pixel della pagina (0: quella dello schermo, al più 2)
    dettaglio: 3, // sotto quanti pixel per celletta gli atomi si fondono in gruppi
    massimoIstanze: 600000, // oltre, il dettaglio scende finché ci si sta
    fotogrammiVoluti: 0, minimoIstanze: 120000, // (0: spento) se la scheda non tiene questo ritmo, il tetto delle istanze scende (mai sotto il minimo) mentre ci si muove, e da fermi si ridisegna al dettaglio pieno. Serve quando il costo sono gli atomi; quando sono i pixel (schede deboli, disegno a software) conviene abbassare `densita`
    punti: true, // gli atomi piccoli sullo schermo come punti (un vertice ciascuno); false: tutti quadratini a istanze
    scartaSepolti: true, profonditaSepolti: 0.9, // gli atomi coperti da questa profondità di materia fitta non si disegnano
    scalaRaggi: 1, raggioLegami: 0.03, colora: 'auto', // 'auto' | 'parte' | 'elemento'
    etichette: true, interazione: true, agitazione: 1,
    alCambio: null, // chiamata quando c'è da ridisegnare (se manca, la vista si ridisegna da sé)
    alFuori: null, // chiamata quando con la rotella ci si allontana oltre la scena intera: per tornare alla scala di prima
    vecchio: false, ...opzioni,
  };
  const attributi = { antialias: false, alpha: false, depth: false, stencil: false, preserveDrawingBuffer: !!O.conserva, powerPreference: 'high-performance' };
  let gl = O.vecchio ? null : tela.getContext('webgl2', attributi); const due = !!gl;
  if (!gl) gl = tela.getContext('webgl', attributi) || tela.getContext('experimental-webgl', attributi);
  if (!gl) throw new Error('atomi3d: questo programma non riesce a creare un contesto WebGL');
  const est = due ? {} : { ist: gl.getExtension('ANGLE_instanced_arrays'), prof: gl.getExtension('EXT_frag_depth'), tess: gl.getExtension('WEBGL_depth_texture') };
  if (!due && !est.ist) throw new Error('atomi3d: WebGL1 senza disegno a istanze (ANGLE_instanced_arrays)');
  const conProfondita = due || !!est.prof, conPost = due || !!est.tess;
  const divisore = (i, n) => (due ? gl.vertexAttribDivisor(i, n) : est.ist.vertexAttribDivisorANGLE(i, n));
  const aIstanze = (n) => (due ? gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, n) : est.ist.drawArraysInstancedANGLE(gl.TRIANGLE_STRIP, 0, 4, n));
  // i punti: larghi al più LP pixel; attorno all'immagine si disegna un bordo di LP/2 pixel in più, perché un punto col
  // centro appena fuori dallo schermo non sparisca di colpo (un punto è scartato tutto insieme quando il suo centro esce)
  const LP = O.punti && conProfondita ? Math.min(64, Math.floor(gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1])) : 0, conPunti = LP >= 16, BORDO = conPunti ? LP >> 1 : 0;

  // --- programmi
  const POSTI = { a_angolo: 0, a_pos: 1, a_pos2: 2, a_raggio: 3, a_colore: 4, a_id: 5, a_pv: 6, a_perno: 7 };
  function programma(v, f, definizioni = '') {
    const testa = (due ? '#version 300 es\n' : (conProfondita ? '#extension GL_EXT_frag_depth : enable\n' : '')) + 'precision highp float;\n' + (due ? '' : '#define VECCHIO\n') + (conProfondita ? '#define CON_PROFONDITA\n' : '') + definizioni;
    const fai = (tipo, src) => { const s = gl.createShader(tipo); gl.shaderSource(s, testa + (due ? src : perVecchio(src, tipo === gl.FRAGMENT_SHADER))); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('atomi3d: ' + gl.getShaderInfoLog(s) + '\n' + src); return s; };
    const p = gl.createProgram(), sv = fai(gl.VERTEX_SHADER, v), sf = fai(gl.FRAGMENT_SHADER, f); gl.attachShader(p, sv); gl.attachShader(p, sf);
    for (const [nome, i] of Object.entries(POSTI)) gl.bindAttribLocation(p, i, nome);
    gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('atomi3d: ' + gl.getProgramInfoLog(p));
    gl.deleteShader(sv); gl.deleteShader(sf);
    const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const nome = gl.getActiveUniform(p, i).name; u[nome] = gl.getUniformLocation(p, nome); }
    return { p, u };
  }
  const prg = { quadri: programma(V_ATOMI, F_ATOMI) };
  const pigro = (nome, v, f, def) => prg[nome] || (prg[nome] = programma(v, f, def));

  // --- buffer e immagini
  const bufAngoli = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bufAngoli); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  let bufPos = null, bufPos2 = null, bufStatico = null, bufId = null, bufPerni = null, bufLegA = null, bufLegB = null, bufLegC = null, nLegami = 0;
  const bufScritte = gl.createBuffer();
  // i «grandi»: gli atomi vicini, troppo larghi per essere punti, copiati a ogni fotogramma in buffer piccoli e disegnati a istanze
  const grandi = { n: 0, cap: 0, pos: null, pos2: null, st: null, quale: null, id: null, perni: null, bPos: gl.createBuffer(), bPos2: gl.createBuffer(), bSt: gl.createBuffer(), bId: due ? null : gl.createBuffer(), bPerni: gl.createBuffer() };
  let S = null, scena = null, lista = [], viva = null, fotogrammi = null, mesc = 0, coppia = -1, piano = null, evid = null;
  let imm = null; // le immagini su cui si disegna prima di comporre
  const immagine = (w, h, filtro, formato) => {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    if (formato === 'profondita') gl.texImage2D(gl.TEXTURE_2D, 0, due ? gl.DEPTH_COMPONENT24 : gl.DEPTH_COMPONENT, w, h, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filtro); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filtro);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t;
  };
  const telaio = (colore, profondita) => { const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colore, 0); if (profondita) gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, profondita, 0); return f; };
  function buttaImmagini() { if (!imm) return; for (const k of ['col', 'prof', 'ao1', 'ao2', 'comp']) if (imm[k]) gl.deleteTexture(imm[k]); for (const k of ['fG', 'fA1', 'fA2', 'fC']) if (imm[k]) gl.deleteFramebuffer(imm[k]); imm = null; }
  function preparaImmagini() { // grandi quanto la tela più il bordo
    const W = tela.width + 2 * BORDO, H = tela.height + 2 * BORDO, sa = O.risoluzioneOmbre || (W * H > 4e5 ? 0.5 : 1), wa = Math.max(1, Math.round(W * sa)), ha = Math.max(1, Math.round(H * sa));
    if (imm && imm.W === W && imm.H === H && imm.wa === wa) return;
    buttaImmagini(); if (!conPost) { imm = { W, H, wa, ha }; return; }
    imm = { W, H, wa, ha, col: immagine(W, H, gl.NEAREST), prof: immagine(W, H, gl.NEAREST, 'profondita'), ao1: immagine(wa, ha, gl.NEAREST), ao2: immagine(wa, ha, gl.NEAREST), comp: immagine(W, H, gl.LINEAR) };
    imm.fG = telaio(imm.col, imm.prof); imm.fA1 = telaio(imm.ao1); imm.fA2 = telaio(imm.ao2); imm.fC = telaio(imm.comp);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  // per leggere che cosa c'è sotto il cursore: un'immagine piccola attorno al pixel (larga quanto un punto, perché i
  // punti col centro fuori sono scartati), di cui si disegna e si legge solo il pixel di mezzo
  let scelta = null; const LS = conPunti ? 2 * BORDO + 1 : 1;
  function preparaScelta() {
    if (scelta) return; const t = immagine(LS, LS, gl.NEAREST), rb = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rb); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, LS, LS);
    const f = telaio(t); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb); gl.bindFramebuffer(gl.FRAMEBUFFER, null); scelta = { t, rb, f };
  }

  // --- la camera: gira attorno a un bersaglio (in nanometri); yaw e pitch in radianti
  const cam = { bersaglio: [0, 0, 0], yaw: 0.6, pitch: 0.35, dist: 10, fov: 0.6, vicino: 0.02 };
  cam.inquadra = () => { if (!S) return; cam.bersaglio = S.centro.slice(); cam.dist = cam.distTutto = (S.raggioScena / Math.sin(cam.fov / 2)) * 0.92; cambia(); }; // distTutto: da dove si vede la scena intera
  // (tanX e tanY sono quelle dell'immagine col bordo: W e H le sue misure; la tela è la parte di mezzo)
  const M4 = { vista: new Float32Array(16), proj: null, occhio: [0, 0, 0], dx: [1, 0, 0], su: [0, 1, 0], dietro: [0, 0, 1], tanX: 0, tanY: 0, W: 1, H: 1, fuoco: 1, vicino: 0.02, lontano: 100 };
  function matrici() {
    const cp = Math.cos(cam.pitch), f = [cp * Math.sin(cam.yaw), Math.sin(cam.pitch), cp * Math.cos(cam.yaw)], b = cam.bersaglio, o = [b[0] + cam.dist * f[0], b[1] + cam.dist * f[1], b[2] + cam.dist * f[2]];
    const dx = norma(vett([0, 1, 0], f)), su = vett(f, dx), m = M4.vista;
    m[0] = dx[0]; m[4] = dx[1]; m[8] = dx[2]; m[12] = -scal(dx, o); m[1] = su[0]; m[5] = su[1]; m[9] = su[2]; m[13] = -scal(su, o); m[2] = f[0]; m[6] = f[1]; m[10] = f[2]; m[14] = -scal(f, o); m[3] = m[7] = m[11] = 0; m[15] = 1;
    M4.occhio = o; M4.dx = dx; M4.su = su; M4.dietro = f;
    M4.W = tela.width + 2 * BORDO; M4.H = tela.height + 2 * BORDO; M4.fuoco = tela.height / (2 * Math.tan(cam.fov / 2)); M4.tanY = M4.H / (2 * M4.fuoco); M4.tanX = M4.W / (2 * M4.fuoco);
    const dc = S ? Math.hypot(o[0] - S.centro[0], o[1] - S.centro[1], o[2] - S.centro[2]) : cam.dist;
    M4.vicino = cam.vicino; M4.lontano = Math.max(dc + (S ? S.raggioScena : 1) * 1.05, cam.vicino * 10);
    M4.proj = prospettiva(M4.tanY, M4.W / M4.H, M4.vicino, M4.lontano);
  }
  const inVista = (p) => { const m = M4.vista; return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]]; };
  // il piano di taglio nello spazio dell'occhio (resta ciò che ha n·p + w ≥ 0)
  function pianoOcchio() {
    if (!piano) return null;
    if (piano.vista) return [0, 0, -1, -(cam.dist - (piano.scarto || 0))];
    const n = norma(piano.normale || [0, 0, 1]), q = piano.quota ?? 0, nv = [-scal(M4.dx, n), -scal(M4.su, n), -scal(M4.dietro, n)];
    return [nv[0], nv[1], nv[2], q - scal(n, M4.occhio)]; // resta n·p ≤ quota
  }

  // --- caricare una scena
  function carica(nuova) {
    for (const b of [bufPos, bufPos2, bufStatico, bufId, bufPerni, bufLegA, bufLegB, bufLegC]) if (b) gl.deleteBuffer(b);
    bufPos = bufPos2 = bufStatico = bufId = bufPerni = bufLegA = bufLegB = bufLegC = null; nLegami = 0; S = null; scena = nuova || null; lista = []; grandi.n = 0; viva = null; fotogrammi = null; coppia = -1; evid = null; mesc = 0;
    if (!scena) { cambia(); return null; }
    const t0 = performance.now();
    S = preparaScena(scena, O); S.sf = new Float32Array(S.statico); S.sb = new Uint8Array(S.statico); S.pos2 = null;
    bufPos = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bufPos); gl.bufferData(gl.ARRAY_BUFFER, S.pos, scena.tempo ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
    bufStatico = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bufStatico); gl.bufferData(gl.ARRAY_BUFFER, S.statico, gl.STATIC_DRAW);
    if (!due) { const id = new Float32Array(S.M); for (let i = 0; i < S.M; i++) id[i] = i; bufId = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bufId); gl.bufferData(gl.ARRAY_BUFFER, id, gl.STATIC_DRAW); }
    if (S.perni) { bufPerni = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bufPerni); gl.bufferData(gl.ARRAY_BUFFER, S.perni, gl.STATIC_DRAW); }
    const A = scena.atomi;
    if (A.pos2) aggiornaPosizioni(A.pos2, true);
    if (typeof scena.tempo === 'function') viva = Float32Array.from(A.pos);
    else if (scena.tempo && scena.tempo.fotogrammi) fotogrammi = scena.tempo;
    if (scena.legami && scena.legami.length) caricaLegami(A.pos);
    S.memoria = S.M * (12 + 8 + (bufPos2 ? 12 : 0) + (bufPerni ? 12 : 0) + (due ? 0 : 4)); S.tempoPreparazione = performance.now() - t0;
    faiScritte(); if (!O.tieniCamera) cam.inquadra(); cambia();
    return statistiche();
  }
  // le posizioni di tutti gli atomi (nell'ordine della scena, nella sua unità) messe nell'ordine dei buffer
  function ordinate(pos, out) {
    const M = S.M, ord = S.ordine, k = S.ku;
    for (let j = 0; j < M; j++) { const i = 3 * ord[j]; out[3 * j] = pos[i] * k; out[3 * j + 1] = pos[i + 1] * k; out[3 * j + 2] = pos[i + 2] * k; }
    return out;
  }
  function aggiornaPosizioni(pos, seconde = false) {
    if (!S) return;
    if (seconde) { const nuovo = !bufPos2; if (nuovo) { bufPos2 = gl.createBuffer(); S.pos2 = new Float32Array(3 * S.M); } ordinate(pos, S.pos2); gl.bindBuffer(gl.ARRAY_BUFFER, bufPos2); if (nuovo) gl.bufferData(gl.ARRAY_BUFFER, S.pos2, gl.DYNAMIC_DRAW); else gl.bufferSubData(gl.ARRAY_BUFFER, 0, S.pos2); }
    else { ordinate(pos, S.pos); gl.bindBuffer(gl.ARRAY_BUFFER, bufPos); gl.bufferSubData(gl.ARRAY_BUFFER, 0, S.pos); if (nLegami) { leg.vecchi = true; leg.pos = pos; } }
  }
  // i legami: gli estremi di ogni bastoncino (si rifanno quando le posizioni cambiano, ma solo se i bastoncini si vedono)
  const leg = { a: null, b: null, vecchi: false };
  function caricaLegami(pos) {
    const L = scena.legami, n = L.length >> 1, k = S.ku, nuovo = !bufLegA;
    if (nuovo) { leg.a = new Float32Array(3 * n); leg.b = new Float32Array(3 * n); bufLegA = gl.createBuffer(); bufLegB = gl.createBuffer(); bufLegC = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bufLegC); gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(4 * n).fill(205), gl.STATIC_DRAW); }
    for (let j = 0; j < n; j++) { const p = 3 * L[2 * j], q = 3 * L[2 * j + 1]; for (let e = 0; e < 3; e++) { leg.a[3 * j + e] = pos[p + e] * k; leg.b[3 * j + e] = pos[q + e] * k; } }
    gl.bindBuffer(gl.ARRAY_BUFFER, bufLegA); gl.bufferData(gl.ARRAY_BUFFER, leg.a, gl.DYNAMIC_DRAW); gl.bindBuffer(gl.ARRAY_BUFFER, bufLegB); gl.bufferData(gl.ARRAY_BUFFER, leg.b, gl.DYNAMIC_DRAW); nLegami = n; leg.vecchi = false;
  }

  // --- che cosa disegnare in questo fotogramma: i pezzi dentro lo schermo, ognuno al suo livello di dettaglio
  const stat = { disegnate: 0, intervalli: 0, grandi: 0, cpuMs: 0, livelli: [0, 0, 0, 0, 0], sepolteMostrate: 0, fattore: 1 };
  function faiLista() {
    const tX = M4.tanX, tY = M4.tanY, lX = Math.hypot(1, tX), lY = Math.hypot(1, tY), pv = pianoOcchio();
    const sR = O.scalaRaggi, tutti = sR < 0.9, De = tutti ? 1e9 : O.profonditaSepolti * 1.6 + 0.3, Dp = O.profonditaSepolti * 1.3 + 0.2, visti = []; // (con i raggi rimpiccioliti si vede attraverso: niente è sepolto)
    for (const z of S.pezzi) {
      const c = inVista(z.c), r = z.r + S.agitaMax * 3;
      if (c[2] - r > -M4.vicino || (c[0] + c[2] * tX) / lX > r || (-c[0] + c[2] * tX) / lX > r || (c[1] + c[2] * tY) / lY > r || (-c[1] + c[2] * tY) / lY > r) continue;
      const dp = pv ? pv[0] * c[0] + pv[1] * c[1] + pv[2] * c[2] + pv[3] : 1e9; if (dp < -r) continue;
      const d = Math.hypot(c[0], c[1], c[2]), dMin = Math.max(d - r, M4.vicino);
      visti.push({ z, ppn: M4.fuoco / Math.max(d - r * 0.6, M4.vicino), sepolti: d - r < De || (pv && dp < Dp + r), vicino: conPunti && (2.9 * S.rMax * sR * M4.fuoco) / dMin + 2 > LP });
    }
    // il dettaglio: la celletta più grossa che sta ancora sotto la soglia di pixel; se le istanze sono troppe, la soglia sale
    let fattore = 1, totale = 0;
    for (let giro = 0; giro < 12; giro++) {
      totale = 0;
      for (const v of visti) { let L = 0; if (!v.vicino) for (let k = 4; k >= 1; k--) if (S.passi[k] * v.ppn <= O.dettaglio * fattore) { L = k; break; } v.L = L; const l = v.z.liv[L]; totale += l.nE + (v.sepolti ? l.nB : 0); }
      if (totale <= Math.min(O.massimoIstanze, rifinisce ? Infinity : ritmo.tetto)) break; fattore *= 1.5;
    }
    lista = []; grandi.n = 0; stat.livelli.fill(0); stat.sepolteMostrate = 0; stat.fattore = fattore;
    let ultimo = null;
    const aggiungi = (da, n, sep) => { if (!n) return; if (ultimo && ultimo.sep === sep && ultimo.da + ultimo.n === da) ultimo.n += n; else lista.push((ultimo = { da, n, sep })); };
    for (const v of visti) {
      const l = v.z.liv[v.L]; aggiungi(l.da, l.nE, false); stat.livelli[v.L] += l.nE; if (v.sepolti && l.nB) { aggiungi(l.da + l.nE, l.nB, true); stat.sepolteMostrate += l.nB; }
      if (v.vicino) cercaGrandi(l.da, l.nE, false, pv, De, Dp), v.sepolti && l.nB && cercaGrandi(l.da + l.nE, l.nB, true, pv, De, Dp);
    }
    stat.disegnate = totale; stat.intervalli = lista.length; stat.grandi = grandi.n; return pv;
  }
  // tra gli atomi di un pezzo vicino, quelli che sullo schermo sono più larghi di un punto (con un po' di margine: il
  // programma dei punti scarta quelli sopra il limite e quello dei quadratini quelli sotto, con lo stesso conto)
  function cercaGrandi(da, n, sep, pv, De, Dp) {
    const m = M4.vista, p = S.pos, q = mesc > 0 && S.pos2 ? S.pos2 : null, sf = S.sf, sR = O.scalaRaggi, soglia = LP * 0.8 - 2, F = 2 * M4.fuoco;
    for (let j = da; j < da + n; j++) {
      let x = p[3 * j], y = p[3 * j + 1], z = p[3 * j + 2]; if (q) { x += (q[3 * j] - x) * mesc; y += (q[3 * j + 1] - y) * mesc; z += (q[3 * j + 2] - z) * mesc; }
      const cz = m[2] * x + m[6] * y + m[10] * z + m[14], r = sf[2 * j] * sR; if (cz - r > 0) continue;
      if (-cz * F > 0 && (r * F) / Math.max(1e-6, -cz - r) < soglia * 0.5) continue; // di sicuro piccolo
      const cx = m[0] * x + m[4] * y + m[8] * z + m[12], cy = m[1] * x + m[5] * y + m[9] * z + m[13], d2 = cx * cx + cy * cy + cz * cz;
      if (d2 <= r * r) continue;
      if (sep) { const dp = pv ? pv[0] * cx + pv[1] * cy + pv[2] * cz + pv[3] : 1e9; if (!(d2 < De * De || (pv && dp < Dp))) continue; }
      const tA = r / Math.sqrt(d2 - r * r), tT = Math.hypot(cx, cy) / Math.max(-cz, 1e-6), den = 1 - tT * tA;
      if (den > 0.02 && cz < 0 && ((tT + tA) / den - tT) * F < soglia) continue;
      if (grandi.n === grandi.cap) { // i buffer piccoli crescono a raddoppio
        const cap = Math.max(1024, grandi.cap * 2), cresci = (v, T, k) => { const w = new T(cap * k); if (v) w.set(v); return w; };
        grandi.pos = cresci(grandi.pos, Float32Array, 3); grandi.pos2 = cresci(grandi.pos2, Float32Array, 3); grandi.st = cresci(grandi.st, Uint8Array, 8); grandi.quale = cresci(grandi.quale, Uint32Array, 1); if (S.perni) grandi.perni = cresci(grandi.perni && grandi.perni.length === 3 * grandi.cap ? grandi.perni : null, Float32Array, 3); if (!due) grandi.id = cresci(grandi.id, Float32Array, 1); grandi.cap = cap;
      }
      const g = grandi.n++; grandi.pos[3 * g] = p[3 * j]; grandi.pos[3 * g + 1] = p[3 * j + 1]; grandi.pos[3 * g + 2] = p[3 * j + 2];
      if (q) { grandi.pos2[3 * g] = q[3 * j]; grandi.pos2[3 * g + 1] = q[3 * j + 1]; grandi.pos2[3 * g + 2] = q[3 * j + 2]; }
      if (S.perni) { if (!grandi.perni || grandi.perni.length < 3 * grandi.cap) grandi.perni = new Float32Array(3 * grandi.cap); grandi.perni[3 * g] = S.perni[3 * j]; grandi.perni[3 * g + 1] = S.perni[3 * j + 1]; grandi.perni[3 * g + 2] = S.perni[3 * j + 2]; }
      grandi.st.set(S.sb.subarray(8 * j, 8 * j + 8), 8 * g); grandi.quale[g] = j; if (!due) grandi.id[g] = S.M + g;
    }
  }
  function caricaGrandi() {
    const n = grandi.n; if (!n) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, grandi.bPos); gl.bufferData(gl.ARRAY_BUFFER, grandi.pos.subarray(0, 3 * n), gl.STREAM_DRAW);
    if (mesc > 0 && S.pos2) { gl.bindBuffer(gl.ARRAY_BUFFER, grandi.bPos2); gl.bufferData(gl.ARRAY_BUFFER, grandi.pos2.subarray(0, 3 * n), gl.STREAM_DRAW); }
    gl.bindBuffer(gl.ARRAY_BUFFER, grandi.bSt); gl.bufferData(gl.ARRAY_BUFFER, grandi.st.subarray(0, 8 * n), gl.STREAM_DRAW);
    if (!due) { gl.bindBuffer(gl.ARRAY_BUFFER, grandi.bId); gl.bufferData(gl.ARRAY_BUFFER, grandi.id.subarray(0, n), gl.STREAM_DRAW); }
    if (S.perni) { gl.bindBuffer(gl.ARRAY_BUFFER, grandi.bPerni); gl.bufferData(gl.ARRAY_BUFFER, grandi.perni.subarray(0, 3 * n), gl.STREAM_DRAW); }
  }
  function punta(bP, bP2, bS, bI, bQ, da) {
    if (bQ) { gl.bindBuffer(gl.ARRAY_BUFFER, bQ); gl.vertexAttribPointer(7, 3, gl.FLOAT, false, 12, da * 12); }
    gl.bindBuffer(gl.ARRAY_BUFFER, bP); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 12, da * 12);
    gl.bindBuffer(gl.ARRAY_BUFFER, bP2); gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 12, da * 12);
    gl.bindBuffer(gl.ARRAY_BUFFER, bS); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 8, da * 8); gl.vertexAttribPointer(4, 4, gl.UNSIGNED_BYTE, true, 8, da * 8 + 4);
    if (bI) { gl.bindBuffer(gl.ARRAY_BUFFER, bI); gl.vertexAttribPointer(5, 1, gl.FLOAT, false, 4, da * 4); }
  }
  // gli atomi: prima i punti (o, senza punti, tutti gli intervalli a istanze), poi i grandi a istanze.
  // sceglie = { finestra: [scala x, y, scarto x, y], raggio: [x, y, z] } quando si legge un pixel solo; scarto: quanto
  // l'immagine è spostata rispetto ai pixel su cui si disegna (quando si disegna direttamente sulla tela)
  function disegnaAtomi(nomeQ, nomeP, pv, t, sceglie, scarto) {
    const def = (sceglie ? '#define SCEGLI\n' : '') + (bufPerni ? '#define PERNI\n' : ''), mescola = mesc > 0 && bufPos2 ? mesc : 0, quali = [1, 2, 3, 4]; if (bufId) quali.push(5); if (bufPerni) { quali.push(7); nomeQ += 'Perni'; nomeP += 'Perni'; }
    const comuni = (P) => {
      gl.useProgram(P.p); gl.uniformMatrix4fv(P.u.u_vista, false, M4.vista); gl.uniformMatrix4fv(P.u.u_proj, false, M4.proj);
      gl.uniform4f(P.u.u_scegli, ...(sceglie ? sceglie.finestra : [1, 1, 0, 0])); if (sceglie) gl.uniform3f(P.u.u_raggio, ...sceglie.raggio);
      gl.uniform4f(P.u.u_moto, mescola, t, S.agitaMax * O.agitazione, O.scalaRaggi);
      const interi = pv && piano && piano.interi;
      gl.uniform4f(P.u.u_taglio, ...(pv || [0, 0, 0, 1])); gl.uniform4f(P.u.u_tappo, ...(pv && !interi ? pv : [0, 0, 0, 1]));
      gl.uniform4f(P.u.u_piani, M4.vicino, M4.lontano - M4.vicino, O.luceAmbiente, O.riflesso);
      gl.uniform4f(P.u.u_schermo, interi ? 1 : 0, 0, M4.fuoco, conPunti ? LP : 0);
      gl.uniform4f(P.u.u_ottica, (2 * M4.tanX) / M4.W, (2 * M4.tanY) / M4.H, -M4.tanX + (scarto * 2 * M4.tanX) / M4.W, -M4.tanY + (scarto * 2 * M4.tanY) / M4.H);
      gl.uniform3f(P.u.u_sole, ...norma([-0.45, 0.6, 0.72]));
      gl.uniform4f(P.u.u_evid, ...(evid && !sceglie ? [S.pos[3 * evid.istanza], S.pos[3 * evid.istanza + 1], S.pos[3 * evid.istanza + 2], 1] : [0, 0, 0, 0]));
    };
    const intervalli = (P, come) => {
      let sep = null;
      for (const x of lista) {
        if (x.sep !== sep) { sep = x.sep; gl.uniform4f(P.u.u_sepolti, sep && O.scalaRaggi >= 0.9 ? 1 : 0, O.profonditaSepolti * 1.6 + 0.3, O.profonditaSepolti * 1.3 + 0.2, pv ? 1 : 0); }
        gl.uniform1f(P.u.u_base, x.da); punta(bufPos, mescola ? bufPos2 : bufPos, bufStatico, bufId, bufPerni, x.da); come(x.n);
      }
    };
    for (const i of quali) gl.enableVertexAttribArray(i);
    if (conPunti) {
      const P = pigro(nomeP, V_ATOMI, F_ATOMI, '#define PUNTI\n' + def); comuni(P);
      gl.disableVertexAttribArray(0); for (const i of quali) divisore(i, 0);
      intervalli(P, (n) => gl.drawArrays(gl.POINTS, 0, n));
    }
    if (!conPunti || grandi.n) {
      const P = pigro(nomeQ, V_ATOMI, F_ATOMI, def); comuni(P);
      gl.bindBuffer(gl.ARRAY_BUFFER, bufAngoli); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); divisore(0, 0);
      for (const i of quali) divisore(i, 1);
      if (!conPunti) intervalli(P, aIstanze);
      else { gl.uniform4f(P.u.u_sepolti, 0, 0, 0, 0); gl.uniform1f(P.u.u_base, S.M); punta(grandi.bPos, mescola ? grandi.bPos2 : grandi.bPos, grandi.bSt, grandi.bId, bufPerni ? grandi.bPerni : null, 0); aIstanze(grandi.n); }
    }
    for (const i of [1, 2, 3, 4, 5, 7]) { divisore(i, 0); gl.disableVertexAttribArray(i); }
  }
  function disegnaLegami(pv) {
    const P = pigro('legami', V_LEGAMI, F_LEGAMI); gl.useProgram(P.p);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufAngoli); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); divisore(0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufLegA); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0); divisore(1, 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufLegB); gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0); divisore(2, 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufLegC); gl.enableVertexAttribArray(4); gl.vertexAttribPointer(4, 4, gl.UNSIGNED_BYTE, true, 0, 0); divisore(4, 1);
    gl.uniformMatrix4fv(P.u.u_vista, false, M4.vista); gl.uniformMatrix4fv(P.u.u_proj, false, M4.proj);
    gl.uniform4f(P.u.u_moto, 0, 0, 0, O.raggioLegami); gl.uniform4f(P.u.u_taglio, ...(pv || [0, 0, 0, 1])); gl.uniform4f(P.u.u_piani, M4.vicino, M4.lontano - M4.vicino, O.luceAmbiente, 0);
    aIstanze(nLegami);
    for (const i of [1, 2, 4]) { divisore(i, 0); gl.disableVertexAttribArray(i); }
  }
  const pieno = (P) => { gl.useProgram(P.p); gl.bindBuffer(gl.ARRAY_BUFFER, bufAngoli); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };
  const lega = (unita, t, u) => { gl.activeTexture(gl.TEXTURE0 + unita); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(u, unita); };

  // --- il tempo: le posizioni che cambiano
  function avanza(t) {
    if (viva) { if (scena.tempo(t, viva, scena) !== false) aggiornaPosizioni(viva); }
    else if (fotogrammi) {
      const F = fotogrammi.fotogrammi, n = F.length, dur = fotogrammi.durata || n; let x = (t / dur) * (fotogrammi.ciclo === false ? n - 1 : n);
      x = fotogrammi.ciclo === false ? Math.max(0, Math.min(n - 1.0001, x)) : ((x % n) + n) % n;
      const k = Math.floor(x); if (k !== coppia) { coppia = k; aggiornaPosizioni(F[k]); aggiornaPosizioni(F[(k + 1) % n], true); }
      mesc = x - k;
    }
  }

  // --- il ritmo: quanto ci mette davvero la scheda a finire un fotogramma (un segnale messo in coda ai comandi, e
  // un orologio che guarda quando arriva). Se è troppo, il tetto delle istanze scende; se avanza tempo, risale.
  // Quando per un terzo di secondo nessuno ridisegna, si rifà il fotogramma al dettaglio pieno.
  const ritmo = { segnale: null, t0: 0, orologio: 0, media: 0, tetto: Infinity, fermo: 0 }; let rifinisce = false;
  function misuraRitmo() {
    if (!due || !(O.fotogrammiVoluti > 0)) { ritmo.tetto = Infinity; return; }
    if (stat.fattore > 1 && !rifinisce) { clearTimeout(ritmo.fermo); ritmo.fermo = setTimeout(() => { ritmo.fermo = 0; if (perso || !S) return; rifinisce = true; if (O.alCambio) O.alCambio(); else disegna(tempoOra); }, 350); }
    if (ritmo.segnale || rifinisce) return;
    ritmo.segnale = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); gl.flush(); ritmo.t0 = performance.now(); ritmo.disegnate = stat.disegnate; ritmo.orologio = setTimeout(guardaRitmo, 4);
  }
  function guardaRitmo() {
    ritmo.orologio = 0; if (perso || !ritmo.segnale) return;
    const arrivato = gl.clientWaitSync(ritmo.segnale, 0, 0) !== gl.TIMEOUT_EXPIRED, dt = performance.now() - ritmo.t0;
    if (!arrivato && dt < 1500) { ritmo.orologio = setTimeout(guardaRitmo, 4); return; }
    gl.deleteSync(ritmo.segnale); ritmo.segnale = null; if (!arrivato) return;
    ritmo.media = ritmo.media ? 0.6 * ritmo.media + 0.4 * dt : dt; const voluto = 1000 / O.fotogrammiVoluti;
    if (ritmo.media > 1.2 * voluto) ritmo.tetto = Math.max(O.minimoIstanze, Math.min(ritmo.tetto, ritmo.disegnate, O.massimoIstanze) * 0.8);
    else if (ritmo.media < 0.6 * voluto && ritmo.tetto < O.massimoIstanze) ritmo.tetto = Math.min(O.massimoIstanze, ritmo.tetto * 1.15);
  }

  // --- IL DISEGNO di un fotogramma (t in secondi)
  let tempoOra = 0;
  function disegna(t) {
    if (perso) return;
    const t0 = performance.now(); tempoOra = t = t ?? t0 / 1000;
    if (!tela.width || !tela.height) return;
    if (!S) { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, tela.width, tela.height); gl.clearColor(O.sfondo[0], O.sfondo[1], O.sfondo[2], 1); gl.clear(gl.COLOR_BUFFER_BIT); return; }
    preparaImmagini(); avanza(t); matrici();
    const pv = faiLista(), W = M4.W, H = M4.H, post = conPost; caricaGrandi();
    // 1. gli atomi: colore e profondità
    gl.bindFramebuffer(gl.FRAMEBUFFER, post ? imm.fG : null); gl.viewport(post ? 0 : -BORDO, post ? 0 : -BORDO, W, H);
    gl.disable(gl.BLEND); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.depthMask(true);
    gl.clearColor(post ? 0 : O.sfondo[0], post ? 0 : O.sfondo[1], post ? 0 : O.sfondo[2], post ? 0 : 1); gl.clearDepth(1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    disegnaAtomi('quadri', 'punti', pv, t, null, post ? 0 : BORDO);
    if (nLegami && O.scalaRaggi < 0.9) { if (leg.vecchi) caricaLegami(leg.pos); disegnaLegami(pv); }
    gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
    if (post) {
      const pr = [M4.tanX, M4.tanY, M4.vicino, M4.lontano - M4.vicino], conOmbre = O.ombre > 0, kz = 65535 / (M4.lontano - M4.vicino);
      const campo = cam.dist * Math.tan(cam.fov / 2), Rg = Math.max(2.5 * O.raggioOmbre, 0.22 * campo); // il raggio largo segue l'inquadratura
      if (conOmbre) {
        // 2. l'ombra morbida, 3. sfumata in due passate
        let P = pigro('ombre', V_PIENO, F_OMBRE); gl.bindFramebuffer(gl.FRAMEBUFFER, imm.fA1); gl.viewport(0, 0, imm.wa, imm.ha); gl.useProgram(P.p);
        lega(0, imm.prof, P.u.u_prof); gl.uniform4f(P.u.u_pr, ...pr); gl.uniform4f(P.u.u_px, 1 / W, 1 / H, M4.fuoco, 0.2 * tela.height); gl.uniform4f(P.u.u_ao, O.raggioOmbre, Rg, 1.1, 1.0 * O.ombreForma); pieno(P);
        P = pigro('sfuma', V_PIENO, F_SFUMA); gl.useProgram(P.p);
        gl.bindFramebuffer(gl.FRAMEBUFFER, imm.fA2); lega(0, imm.ao1, P.u.u_ao); gl.uniform4f(P.u.u_dir, 1 / imm.wa, 0, 0, 1 / (kz * O.raggioOmbre * 1.5)); pieno(P);
        gl.bindFramebuffer(gl.FRAMEBUFFER, imm.fA1); lega(0, imm.ao2, P.u.u_ao); gl.uniform4f(P.u.u_dir, 0, 1 / imm.ha, 0, 1 / (kz * O.raggioOmbre * 1.5)); pieno(P);
      }
      // 4. la composizione (sulla tela va la parte di mezzo dell'immagine: il bordo resta fuori)
      const sfoca = O.sfoca > 0, P = pigro('componi', V_PIENO, F_COMPONI);
      gl.bindFramebuffer(gl.FRAMEBUFFER, sfoca ? imm.fC : null); gl.viewport(sfoca ? 0 : -BORDO, sfoca ? 0 : -BORDO, W, H); gl.useProgram(P.p);
      lega(0, imm.col, P.u.u_col); lega(1, imm.prof, P.u.u_prof); lega(2, imm.ao1, P.u.u_ao);
      gl.uniform4f(P.u.u_pr, ...pr); gl.uniform4f(P.u.u_px, 1 / W, 1 / H, 1 / imm.wa, 1 / imm.ha);
      const dens = tela.width / Math.max(1, tela.clientWidth || tela.width);
      gl.uniform4f(P.u.u_eff, O.ombre, O.contorno, O.nebbia, Math.max(1, dens));
      const dc = Math.hypot(M4.occhio[0] - S.centro[0], M4.occhio[1] - S.centro[1], M4.occhio[2] - S.centro[2]);
      // (l'attenuazione comincia poco prima del centro di rotazione: ciò che si guarda resta pieno, ciò che sta dietro si spegne)
      const fondo = Math.min(S.raggioScena, 1.6 * cam.dist), nebbiaDa = Math.max(M4.vicino, cam.dist - 0.3 * fondo), nebbiaA = Math.max(nebbiaDa + 0.5, Math.min(dc + S.raggioScena, cam.dist + 1.3 * fondo));
      gl.uniform4f(P.u.u_dist, nebbiaDa, nebbiaA, cam.dist * 1.08 + 0.3, cam.dist * 2.0 + 1.5);
      const pxMondo = 1 / M4.fuoco; // quanti nanometri è largo un pixel a distanza 1
      gl.uniform4f(P.u.u_sog, Math.max(0.12 / cam.dist, 2 * pxMondo), Math.max(0.4 / cam.dist, 6 * pxMondo), 1 / (kz * O.raggioOmbre), conOmbre ? 1 : 0);
      gl.uniform3f(P.u.u_sfondo, O.sfondo[0], O.sfondo[1], O.sfondo[2]); pieno(P);
      if (sfoca) { const Q = pigro('sfoca', V_PIENO, F_SFOCA); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(-BORDO, -BORDO, W, H); gl.useProgram(Q.p); lega(0, imm.comp, Q.u.u_col); gl.uniform4f(Q.u.u_px, 1 / W, 1 / H, O.sfoca * dens, 0); pieno(Q); }
    }
    if (O.etichette && scritte.voci.length) disegnaScritte();
    misuraRitmo(); rifinisce = false;
    stat.cpuMs = performance.now() - t0;
  }

  // --- le etichette: il testo disegnato una volta in un'immagine, poi rettangoli sullo schermo e la linea fino al punto
  const scritte = { voci: [], tex: null, w: 1, h: 1 };
  function faiScritte() {
    scritte.voci = []; const E = (scena && scena.etichette) || []; if (!E.length || typeof document === 'undefined') return;
    const dens = Math.max(1, tela.width / Math.max(1, tela.clientWidth || tela.width)), corpo = Math.round(14 * dens), cv = document.createElement('canvas'), c2 = cv.getContext('2d'), tipo = `600 ${corpo}px system-ui, -apple-system, 'Segoe UI', sans-serif`;
    c2.font = tipo;
    const righe = E.map((e) => ({ e, w: Math.ceil(c2.measureText(e.testo).width) + 8, h: Math.ceil(corpo * 1.5) }));
    cv.width = Math.min(4096, Math.max(64, ...righe.map((r) => r.w))); cv.height = 8 + righe.reduce((s, r) => s + r.h + 2, 0);
    c2.font = tipo; c2.textBaseline = 'middle'; c2.fillStyle = '#fff'; c2.fillRect(0, 0, 4, 4);
    let y = 6;
    for (const r of righe) { c2.shadowColor = 'rgba(0,0,0,0.9)'; c2.shadowBlur = 4 * dens; c2.fillText(r.e.testo, 4, y + r.h / 2); c2.fillText(r.e.testo, 4, y + r.h / 2); scritte.voci.push({ pos: r.e.pos.map((x) => x * S.ku), scarto: r.e.scarto, u0: 0, v0: y / cv.height, u1: r.w / cv.width, v1: (y + r.h) / cv.height, w: r.w, h: r.h }); y += r.h + 2; }
    if (!scritte.tex) scritte.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, scritte.tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    scritte.w = cv.width; scritte.h = cv.height; scritte.dens = dens;
  }
  // un punto della scena sulla tela (in pixel veri, origine in alto a sinistra), o null se è dietro l'occhio
  function sulloSchermo(p) { const c = inVista(p); if (c[2] > -M4.vicino) return null; return [(0.5 + (0.5 * c[0]) / (M4.tanX * -c[2])) * M4.W - BORDO, (0.5 - (0.5 * c[1]) / (M4.tanY * -c[2])) * M4.H - BORDO, -c[2]]; }
  function disegnaScritte() {
    const W = tela.width, H = tela.height, dens = scritte.dens || 1, v = [], bianco = [1.5 / scritte.w, 1.5 / scritte.h], cs = sulloSchermo(S.centro) || [W / 2, H / 2];
    const rett = (x0, y0, x1, y1, u0, v0, u1, v1) => { const a = [(x0 / W) * 2 - 1, 1 - (y0 / H) * 2], b = [(x1 / W) * 2 - 1, 1 - (y1 / H) * 2]; v.push(a[0], a[1], u0, v0, b[0], a[1], u1, v0, a[0], b[1], u0, v1, b[0], a[1], u1, v0, b[0], b[1], u1, v1, a[0], b[1], u0, v1); };
    const linea = (x0, y0, x1, y1, sp) => { const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = (-dy / l) * sp * 0.5, ny = (dx / l) * sp * 0.5, q = [[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x0 - nx, y0 - ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]]; for (const p of q) v.push((p[0] / W) * 2 - 1, 1 - (p[1] / H) * 2, bianco[0], bianco[1]); };
    for (const e of scritte.voci) {
      const p = sulloSchermo(e.pos); if (!p || p[0] < 0 || p[0] > W || p[1] < 0 || p[1] > H) continue;
      let sx, sy; if (e.scarto) { sx = e.scarto[0] * dens; sy = e.scarto[1] * dens; } else { const dx = p[0] - cs[0], dy = p[1] - cs[1], l = Math.hypot(dx, dy) || 1; sx = (dx >= 0 ? 1 : -1) * (60 + 40 * Math.abs(dx / l)) * dens; sy = (dy / l) * 60 * dens - 20 * dens; }
      const aDestra = sx >= 0, bx = p[0] + sx, by = p[1] + sy, x0 = aDestra ? bx : bx - e.w, sp = 1.4 * dens;
      linea(p[0], p[1], bx, by, sp); linea(bx, by, aDestra ? bx + e.w : bx - e.w, by, sp); rett(p[0] - 2.5 * dens, p[1] - 2.5 * dens, p[0] + 2.5 * dens, p[1] + 2.5 * dens, bianco[0], bianco[1], bianco[0], bianco[1]);
      rett(x0, by - e.h - 1 * dens, x0 + e.w, by - 1 * dens, e.u0, e.v0, e.u1, e.v1);
    }
    if (!v.length) return;
    const P = pigro('scritte', V_SCRITTE, F_SCRITTE); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H); gl.useProgram(P.p);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufScritte); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.DYNAMIC_DRAW); gl.enableVertexAttribArray(6); gl.vertexAttribPointer(6, 4, gl.FLOAT, false, 0, 0);
    lega(0, scritte.tex, P.u.u_col); gl.drawArrays(gl.TRIANGLES, 0, v.length / 4); gl.disableVertexAttribArray(6); gl.disable(gl.BLEND);
  }

  // --- che cosa c'è sotto il cursore: si ridisegna la scena attorno a quel pixel, ogni atomo col suo numero come colore
  function scegli(x, y) { // x, y in pixel della pagina, dentro la tela
    if (!S || perso || !(lista.length || grandi.n)) return null;
    const W = M4.W, H = M4.H, px = Math.floor((x / Math.max(1, tela.clientWidth)) * tela.width) + BORDO + 0.5, py = H - (Math.floor((y / Math.max(1, tela.clientHeight)) * tela.height) + BORDO + 0.5), nx = (px / W) * 2 - 1, ny = (py / H) * 2 - 1, mezzo = LS >> 1;
    preparaScelta();
    gl.bindFramebuffer(gl.FRAMEBUFFER, scelta.f); gl.viewport(0, 0, LS, LS); gl.enable(gl.SCISSOR_TEST); gl.scissor(mezzo, mezzo, 1, 1);
    gl.disable(gl.BLEND); gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS); gl.depthMask(true); gl.clearColor(0, 0, 0, 0); gl.clearDepth(1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    disegnaAtomi('scegliQuadri', 'scegliPunti', pianoOcchio(), tempoOra, { finestra: [W / LS, H / LS, (-nx * W) / LS, (-ny * H) / LS], raggio: norma([nx * M4.tanX, ny * M4.tanY, -1]) }, 0);
    const b = new Uint8Array(4); gl.readPixels(mezzo, mezzo, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, b); gl.disable(gl.SCISSOR_TEST); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
    if (!b[3]) return null; let istanza = b[0] + 256 * b[1] + 65536 * b[2] - 1; if (istanza >= S.M) istanza = grandi.quale[istanza - S.M]; if (!(istanza >= 0 && istanza < S.M)) return null;
    return descrivi(istanza, x, y);
  }
  function descrivi(istanza, x, y) {
    const i = S.ordine[istanza], A = scena.atomi, z = A.elemento ? A.elemento[i] : 0, e = ELEMENTI[z] || null, k = S.parteDi ? S.parteDi[i] : -1, parte = (scena.parti || [])[k] || null;
    return { istanza, indice: i, elemento: z, simbolo: e ? e.simbolo : null, nome: e ? e.nome : null, parte: parte ? parte.nome : null, indiceParte: parte ? k : -1, rappresenta: istanza >= S.N ? S.rappresenta[istanza - S.N] : 1,
      pos: [S.pos[3 * istanza], S.pos[3 * istanza + 1], S.pos[3 * istanza + 2]], raggio: S.sf[2 * istanza], x, y };
  }

  // --- l'interazione: trascinare ruota; col tasto destro (o maiuscolo) sposta; la rotella avvicina verso il punto
  // sotto il cursore; due clic portano lì il centro di rotazione; passando sopra un atomo si dice che cos'è
  const ascolti = []; let ascoltatoreAtomo = null, trascina = null, ancora = null, daScegliere = null, quadro = 0, giro = 0, perso = false, quadroScelta = 0;
  const ascolta = (chi, che, f, o) => { chi.addEventListener(che, f, o); ascolti.push([chi, che, f, o]); };
  function cambia() { if (O.alCambio) O.alCambio(); else if (!giro && !quadro) quadro = requestAnimationFrame(() => { quadro = 0; disegna(); }); }
  const dove = (e) => { const r = tela.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  // la direzione (nella scena) del raggio che dall'occhio passa per un punto della tela (pixel della pagina)
  function raggioDaSchermo(x, y) { const a = (((x / tela.clientWidth) * tela.width + BORDO) / M4.W * 2 - 1) * M4.tanX, b = (1 - (((y / tela.clientHeight) * tela.height + BORDO) / M4.H) * 2) * M4.tanY; return norma([a * M4.dx[0] + b * M4.su[0] - M4.dietro[0], a * M4.dx[1] + b * M4.su[1] - M4.dietro[1], a * M4.dx[2] + b * M4.su[2] - M4.dietro[2]]); }
  function sceltaPigra() {
    quadroScelta = 0; if (!daScegliere || !ascoltatoreAtomo || trascina) return;
    const a = scegli(daScegliere[0], daScegliere[1]); daScegliere = null;
    if ((a ? a.istanza : -1) !== (evid ? evid.istanza : -1)) { evid = a; cambia(); }
    ascoltatoreAtomo(a);
  }
  if (O.interazione) {
    const dita = new Map(); let pizzico = 0;
    ascolta(tela, 'contextmenu', (e) => e.preventDefault());
    ascolta(tela, 'pointerdown', (e) => { const [x, y] = dove(e); dita.set(e.pointerId, [x, y]); trascina = { x, y, sposta: e.shiftKey || e.button === 2 || e.button === 1, mosso: 0 }; pizzico = 0; ancora = null; try { tela.setPointerCapture(e.pointerId); } catch { /* il puntatore non c'è più */ } });
    ascolta(tela, 'pointermove', (e) => {
      const [x, y] = dove(e);
      if (!trascina) { ancora = null; daScegliere = [x, y]; if (ascoltatoreAtomo && !quadroScelta) quadroScelta = requestAnimationFrame(sceltaPigra); return; }
      if (dita.has(e.pointerId)) dita.set(e.pointerId, [x, y]);
      if (dita.size === 2) { // due dita: allargare avvicina
        const [a, b] = [...dita.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pizzico) cam.dist = Math.max(0.08, cam.dist * (pizzico / Math.max(1, d))); pizzico = d; cambia(); return;
      }
      const dx = x - trascina.x, dy = y - trascina.y; trascina.x = x; trascina.y = y; trascina.mosso += Math.abs(dx) + Math.abs(dy);
      if (trascina.sposta) { const k = (2 * cam.dist * Math.tan(cam.fov / 2)) / Math.max(1, tela.clientHeight); for (let i = 0; i < 3; i++) cam.bersaglio[i] += (-dx * M4.dx[i] + dy * M4.su[i]) * k; }
      else { cam.yaw -= dx * 0.006; cam.pitch = Math.max(-1.55, Math.min(1.55, cam.pitch + dy * 0.006)); }
      cambia();
    });
    const lascia = (e) => { dita.delete(e.pointerId); if (!dita.size) trascina = null; pizzico = 0; };
    ascolta(tela, 'pointerup', lascia); ascolta(tela, 'pointercancel', lascia);
    ascolta(tela, 'pointerleave', () => { daScegliere = null; if (evid) { evid = null; cambia(); } if (ascoltatoreAtomo) ascoltatoreAtomo(null); });
    ascolta(tela, 'wheel', (e) => {
      e.preventDefault(); if (!S) return; const [x, y] = dove(e);
      if (!ancora) { // il punto sotto il cursore: l'atomo che c'è, o il piano del bersaglio
        matrici(); const a = scegli(x, y), d = raggioDaSchermo(x, y);
        let s = cam.dist / Math.max(1e-6, -scal(d, M4.dietro));
        if (a) { const oc = [a.pos[0] - M4.occhio[0], a.pos[1] - M4.occhio[1], a.pos[2] - M4.occhio[2]], b = scal(oc, d), q = b * b - scal(oc, oc) + (a.raggio * O.scalaRaggi) ** 2; s = q > 0 ? b - Math.sqrt(q) : b; } // dove il raggio tocca la sfera
        ancora = [M4.occhio[0] + d[0] * s, M4.occhio[1] + d[1] * s, M4.occhio[2] + d[2] * s];
      }
      const k = Math.exp(Math.max(-1, Math.min(1, e.deltaY * 0.0015))), lontano = O.alFuori ? 1.8 * (cam.distTutto || cam.dist) : S.raggioScena * 40;
      if (O.alFuori && k > 1 && cam.dist >= lontano * 0.999) { O.alFuori(); return; } // ci si allontana oltre la scena intera: chi ha montato la vista torna alla scala di prima
      const nuova = Math.max(0.08, Math.min(lontano, cam.dist * k)), f = nuova / cam.dist;
      for (let i = 0; i < 3; i++) cam.bersaglio[i] = ancora[i] + (cam.bersaglio[i] - ancora[i]) * f; cam.dist = nuova; cambia();
    }, { passive: false });
    ascolta(tela, 'dblclick', (e) => { const [x, y] = dove(e), a = scegli(x, y); if (a) { cam.bersaglio = a.pos.slice(); cambia(); } });
  }
  ascolta(tela, 'webglcontextlost', (e) => { e.preventDefault(); perso = true; });

  function ridimensiona() {
    const d = O.densita || Math.min(2, (typeof devicePixelRatio !== 'undefined' && devicePixelRatio) || 1), w = Math.max(1, Math.round((tela.clientWidth || tela.width) * d)), h = Math.max(1, Math.round((tela.clientHeight || tela.height) * d));
    if (tela.width !== w || tela.height !== h) { tela.width = w; tela.height = h; if (scena && scritte.voci.length && Math.abs((scritte.dens || 1) - d) > 0.01) faiScritte(); }
    cambia();
  }
  function statistiche() { return S ? { webgl: due ? 2 : 1, punti: conPunti ? LP : 0, atomi: S.N, istanze: S.M, gruppi: S.M - S.N, sepolti: S.quantiSepolti, pezzi: S.pezzi.length, memoria: S.memoria, preparazioneMs: S.tempoPreparazione, pixel: [tela.width, tela.height], ...stat, livelli: stat.livelli.slice(), tetto: Math.min(O.massimoIstanze, ritmo.tetto), msScheda: ritmo.media } : { webgl: due ? 2 : 1, atomi: 0 }; }
  function passo(ms) { if (!giro) return; disegna(ms / 1000); giro = requestAnimationFrame(passo); }
  function libera() {
    if (giro) cancelAnimationFrame(giro); if (quadro) cancelAnimationFrame(quadro); if (quadroScelta) cancelAnimationFrame(quadroScelta); giro = quadro = quadroScelta = 0; clearTimeout(ritmo.orologio); clearTimeout(ritmo.fermo);
    for (const [chi, che, f, o] of ascolti) chi.removeEventListener(che, f, o); ascolti.length = 0; ascoltatoreAtomo = null;
    if (perso) return;
    for (const b of [bufPos, bufPos2, bufStatico, bufId, bufPerni, bufAngoli, bufScritte, bufLegA, bufLegB, bufLegC, grandi.bPos, grandi.bPos2, grandi.bSt, grandi.bId, grandi.bPerni]) if (b) gl.deleteBuffer(b);
    buttaImmagini(); if (scelta) { gl.deleteTexture(scelta.t); gl.deleteRenderbuffer(scelta.rb); gl.deleteFramebuffer(scelta.f); } if (scritte.tex) gl.deleteTexture(scritte.tex);
    for (const p of Object.values(prg)) if (p) gl.deleteProgram(p.p);
    S = null; scena = null; perso = true;
    if (O.tieniContesto !== true) gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
  ridimensiona();
  return {
    carica, disegna, ridimensiona, camera: cam, libera, opzioni: O, statistiche, scegli, gl,
    suAtomo: (f) => { ascoltatoreAtomo = f || null; },
    // il piano di taglio: { vista: true, scarto } (guarda l'occhio e passa dal bersaglio, spostato di `scarto` verso l'occhio)
    // oppure { normale: [x, y, z], quota } (resta ciò che ha normale·p ≤ quota); con interi: true toglie atomi interi (quelli
    // col centro oltre il piano) invece di mostrare la sezione delle sfere tagliate; null lo toglie
    taglio: (p) => { piano = p || null; cambia(); return piano; },
    mescola: (f) => { mesc = Math.max(0, Math.min(1, f)); cambia(); },
    aggiornaPosizioni, // (Float32Array(3N) nell'ordine e nell'unità della scena): un buffer per fotogramma
    ricarica: () => { const s = scena, c = { ...cam, bersaglio: cam.bersaglio.slice() }; if (s) { carica(s); Object.assign(cam, c); cambia(); } },
    avvia: () => { if (!giro) giro = requestAnimationFrame(passo); }, ferma: () => { if (giro) cancelAnimationFrame(giro); giro = 0; },
    sulloSchermo: (p) => { matrici(); const q = sulloSchermo(p.map((x) => x * (S ? S.ku : 1))); return q ? [(q[0] / tela.width) * tela.clientWidth, (q[1] / tela.height) * tela.clientHeight] : null; },
  };
}

// ═════════════════════════════════════ LE SCENE ═════════════════════════════════════
// Geometrie vere, costruite (non simulate): chi le chiama dà il caso — la sorgente degli eventi di quel luogo — e la
// stessa radice dà sempre la stessa scena. Tutto in nanometri.

// un generatore svelto di numeri tra 0 e 1 dal seme di un evento (come la nebbia): per le migliaia di tiri di una scena
function tiri(caso, nome) { let s = (caso || sorgente('atomi3d')).seme(nome); return () => (s = (s * 16807) % 2147483647) / 2147483647; }
const versoreACaso = (r) => { const z = 2 * r() - 1, a = 2 * Math.PI * r(), s = Math.sqrt(1 - z * z); return [s * Math.cos(a), s * Math.sin(a), z]; };
// una direzione che fa l'angolo dato con d, attorno a d di un azimut dato
function aLato(d, coseno, azimut) {
  const a = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], u = norma(vett(d, a)), v = vett(d, u), s = Math.sqrt(1 - coseno * coseno), c = Math.cos(azimut), z = Math.sin(azimut);
  return [d[0] * coseno + s * (c * u[0] + z * v[0]), d[1] * coseno + s * (c * u[1] + z * v[1]), d[2] * coseno + s * (c * u[2] + z * v[2])];
}
// punti ben sparsi su una sfera (per i gusci degli ioni): l'ottaedro per sei, la spirale di Fibonacci per gli altri
function sullaSfera(n) {
  if (n === 6) return [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const out = []; for (let i = 0; i < n; i++) { const z = 1 - (2 * i + 1) / n, s = Math.sqrt(1 - z * z), a = i * 2.399963; out.push([s * Math.cos(a), s * Math.sin(a), z]); } return out;
}
function ruotaACaso(punti, r) { // la stessa rotazione a caso per tutti
  const w = versoreACaso(r), u = norma(vett(w, Math.abs(w[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), v = vett(w, u), a = 2 * Math.PI * r(), c = Math.cos(a), s = Math.sin(a), U = [0, 1, 2].map((k) => c * u[k] + s * v[k]), V = [0, 1, 2].map((k) => -s * u[k] + c * v[k]);
  return punti.map((p) => [0, 1, 2].map((k) => p[0] * U[k] + p[1] * V[k] + p[2] * w[k]));
}

// la molecola d'acqua: O–H 0,9572 Å, angolo 104,52° (misurati nel vapore: Benedict, Gailar e Plyler 1956)
export const ACQUA = { OH: 0.09572, angolo: (104.52 * Math.PI) / 180, perNm3: 33.428 }; // 33,43 molecole per nm³ a 1 g/cm³
const cM = Math.cos(ACQUA.angolo / 2), sM = Math.sin(ACQUA.angolo / 2);
// densità dell'acqua pura (g/cm³), con il massimo a 4 °C (parabola: entro lo 0,3% tra 0 e 60 °C), e di quella salata
const densitaAcqua = (T, S = 0) => (1 - 6.8e-6 * (T - 277.13) ** 2) * (1 + 7.7e-4 * S);

// gli ioni del mare che la scena sa mettere (raggio ionico; quante molecole d'acqua nel primo guscio; atomi in più se
// lo ione è fatto di più atomi). Chi ha i numeri veri di un punto (mare.js) passa `ioni: [{ el, quanti | perMolecola }]`.
export const IONI = {
  'Na+': { el: 'Na', carica: 1, guscio: 6 }, 'K+': { el: 'K', carica: 1, guscio: 6 }, 'Mg2+': { el: 'Mg', carica: 2, guscio: 6 }, 'Ca2+': { el: 'Ca', carica: 2, guscio: 7 },
  'Cl-': { el: 'Cl', carica: -1, guscio: 6 }, 'Fe2+': { el: 'Fe', carica: 2, guscio: 6 },
  'SO4(2-)': { el: 'S', carica: -2, guscio: 10, raggio: 0.24, raggioCentro: 0.105, intorno: { el: 'O', n: 4, d: 0.149, raggio: 0.152 } }, // tetraedro, S–O 1,49 Å
  'HCO3-': { el: 'C', carica: -1, guscio: 8, raggio: 0.21, raggioCentro: 0.076 * 2, intorno: { el: 'O', n: 3, d: 0.127, raggio: 0.152, piano: true } },
};

// ACQUA LIQUIDA CON I SUOI IONI. { latoNm | dimNm: [x, y, z], salinita (g/kg), T (K), ioni, origine, ostacoli }
//   · le molecole: quante ne vuole la densità a quella temperatura e salinità; disordinate ma senza sovrapposizioni
//     (griglia scossa e poi rilassata: nessun ossigeno a meno di ~2,6 Å da un altro, primo vicino attorno a 2,8 Å);
//   · gli idrogeni: ogni molecola punta i suoi due O–H verso due ossigeni vicini che possono ancora riceverli (al più
//     due per ossigeno) e che stanno tra loro a un angolo vicino a 104,5°: una rete di legami a idrogeno plausibile;
//   · gli ioni: sodio e cloro alla concentrazione data (35 g/kg → uno ione ogni ~90 molecole per specie; oppure
//     l'elenco `ioni`), ognuno col suo guscio: attorno a un catione le molecole voltano l'ossigeno verso lo ione (Na–O
//     2,4 Å), attorno a un anione gli porgono un idrogeno (Cl–O 3,2 Å);
//   · il moto: scena.tempo(t, pos) fa oscillare ogni molecola rigida attorno al suo posto (ampiezze ∝ √T: ~0,25 Å di
//     spostamento e ~12° di rotazione a 25 °C). È il tremito dentro la gabbia dei vicini, rallentato di ~10¹³ volte;
//     NON è una dinamica: le molecole non diffondono né si scambiano legami.
// `ostacoli` = { pos, raggio, carica } sono atomi fermi di qualcos'altro (la faccia di un cristallo): l'acqua li evita e
// si orienta verso di loro come verso gli ioni.
export function scenaAcqua({ latoNm = 6, dimNm = null, salinita = 35, T = 298.15, ioni = null, origine = [0, 0, 0], ostacoli = null, moto = true } = {}, caso = null) {
  caso = caso || sorgente('atomi3d/acqua'); const r = tiri(caso, 'acqua');
  const L = dimNm || [latoNm, latoNm, latoNm], V = L[0] * L[1] * L[2], rho = densitaAcqua(T, salinita), nAcqua = Math.round(ACQUA.perNm3 * rho * (1 - salinita / 1000) * V);
  // --- gli ioni: quanti, e dove
  const specie = ioni ? ioni.map((x) => ({ ...(IONI[x.nome] || {}), ...x })) : (() => { const n = Math.round(salinita * rho * 0.010304 * V); return [{ nome: 'Na+', ...IONI['Na+'], quanti: n }, { nome: 'Cl-', ...IONI['Cl-'], quanti: n }]; })();
  const fermi = grigliaFermi(ostacoli, origine); // ciò che sta fermo mentre l'acqua si sistema: gli ostacoli e gli ioni
  const centri = []; // gli ioni messi: { p, s (specie), R (raggio dello ione), G (distanza del guscio) }
  for (const s of specie) { const e = ELEMENTI[s.el] || ELEMENTI.Na; s.R = s.raggio ?? e.ionico ?? e.vdw; s.messi = 0; }
  for (const k of specie.map((s, i) => i).sort((a, b) => specie[b].R - specie[a].R)) { // prima i più grossi, che hanno meno posto
    const s = specie[k], R = s.R, G = R + 0.14, quanti = s.quanti ?? Math.round((s.perMolecola || 0) * nAcqua);
    for (let q = 0, prove = 0; q < quanti && prove < quanti * 3000; prove++) {
      const p = [0, 1, 2].map((a) => (L[a] > 2 * (G + 0.2) ? G + 0.15 + r() * (L[a] - 2 * (G + 0.15)) : L[a] / 2));
      let libero = true; fermi.vicini(p, (q, R, carica, m, ione) => { if ((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2 < (ione ? m + G + (prove < quanti * 1500 ? 0.24 : 0.02) : R + G + 0.25) ** 2) libero = false; }); if (!libero) continue; // i gusci non si compenetrano (se proprio non c'è posto, si toccano)
      centri.push({ p, s, k, R, G, carica: s.carica }); fermi.metti(p, R, s.carica, G + 0.08, true); q++; s.messi++;
    }
  }
  // --- le molecole: prima i gusci degli ioni, poi le altre su una griglia scossa
  const O = [], guscioDi = []; // ossigeni [x, y, z]; di quale ione è il guscio (−1: libera)
  const occupato = (p, meno) => { let su = false; fermi.vicini(p, (q, R, carica, m) => { if ((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2 < (m - meno) ** 2) su = true; }); return su; };
  const dentro = (p) => p[0] > 0.02 && p[1] > 0.02 && p[2] > 0.02 && p[0] < L[0] - 0.02 && p[1] < L[1] - 0.02 && p[2] < L[2] - 0.02;
  centri.forEach((c, i) => { for (const d of ruotaACaso(sullaSfera(c.s.guscio || 6), r)) { const p = [c.p[0] + d[0] * c.G, c.p[1] + d[1] * c.G, c.p[2] + d[2] * c.G]; if (dentro(p) && !O.some((q) => (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 + (q[2] - p[2]) ** 2 < 0.068)) { O.push(p); guscioDi.push(i); } } });
  const nGusci = O.length, liberi = Math.max(0, nAcqua - nGusci); let candidati = [];
  for (let piu = 1.15; piu < 3 && candidati.length < liberi; piu *= 1.12) { // la griglia si infittisce finché i posti bastano
    const passo = Math.cbrt(V / (liberi * piu + 1)), n = L.map((l) => Math.max(1, Math.round(l / passo))); candidati = [];
    for (let z = 0; z < n[2]; z++) for (let y = 0; y < n[1]; y++) for (let x = 0; x < n[0]; x++) {
      const p = [((x + 0.5 + 0.7 * (r() - 0.5)) * L[0]) / n[0], ((y + 0.5 + 0.7 * (r() - 0.5)) * L[1]) / n[1], ((z + 0.5 + 0.7 * (r() - 0.5)) * L[2]) / n[2]];
      if (occupato(p, 0.04)) continue;
      candidati.push(p);
    }
  }
  for (let i = candidati.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)), t = candidati[i]; candidati[i] = candidati[j]; candidati[j] = t; }
  for (let i = 0; i < Math.min(liberi, candidati.length); i++) { O.push(candidati[i]); guscioDi.push(-1); }
  const nO = O.length;
  // --- il rilassamento: gli ossigeni liberi si respingono sotto 2,8 Å, stanno fuori dai gusci e dagli ostacoli
  const lc = 0.36, g = L.map((l) => Math.max(1, Math.ceil(l / lc))), cellaDi = (p) => Math.min(g[0] - 1, Math.max(0, Math.floor(p[0] / lc))) + g[0] * (Math.min(g[1] - 1, Math.max(0, Math.floor(p[1] / lc))) + g[1] * Math.min(g[2] - 1, Math.max(0, Math.floor(p[2] / lc))));
  const testa = new Int32Array(g[0] * g[1] * g[2]), dopo = new Int32Array(nO);
  const rifaiCelle = () => { testa.fill(-1); for (let i = 0; i < nO; i++) { const c = cellaDi(O[i]); dopo[i] = testa[c]; testa[c] = i; } };
  const vicini = (p, f) => { // chiama f(j) per ogni ossigeno nelle cellette attorno a p
    const cx = Math.min(g[0] - 1, Math.max(0, Math.floor(p[0] / lc))), cy = Math.min(g[1] - 1, Math.max(0, Math.floor(p[1] / lc))), cz = Math.min(g[2] - 1, Math.max(0, Math.floor(p[2] / lc)));
    for (let z = Math.max(0, cz - 1); z <= Math.min(g[2] - 1, cz + 1); z++) for (let y = Math.max(0, cy - 1); y <= Math.min(g[1] - 1, cy + 1); y++) for (let x = Math.max(0, cx - 1); x <= Math.min(g[0] - 1, cx + 1); x++) for (let j = testa[x + g[0] * (y + g[1] * z)]; j >= 0; j = dopo[j]) f(j);
  };
  const d0 = 0.282, spinta = new Float32Array(3 * nO);
  for (let giro = 0; giro < 40; giro++) {
    rifaiCelle(); spinta.fill(0);
    for (let i = nGusci; i < nO; i++) {
      const p = O[i]; let sx = 0, sy = 0, sz = 0;
      vicini(p, (j) => { if (j === i) return; const q = O[j], dx = p[0] - q[0], dy = p[1] - q[1], dz = p[2] - q[2], d2 = dx * dx + dy * dy + dz * dz; if (d2 >= d0 * d0) return; const d = Math.sqrt(d2) || 1e-4, k = ((d0 - d) / d) * (j < nGusci ? 0.9 : 0.45); sx += dx * k; sy += dy * k; sz += dz * k; });
      fermi.vicini(p, (q, R, carica, m) => { const dx = p[0] - q[0], dy = p[1] - q[1], dz = p[2] - q[2], d2 = dx * dx + dy * dy + dz * dz; if (d2 < m * m) { const d = Math.sqrt(d2) || 1e-4, k = (0.9 * (m - d)) / d; sx += dx * k; sy += dy * k; sz += dz * k; } });
      spinta[3 * i] = sx; spinta[3 * i + 1] = sy; spinta[3 * i + 2] = sz;
    }
    for (let i = nGusci; i < nO; i++) for (let a = 0; a < 3; a++) O[i][a] = Math.min(L[a] - 0.03, Math.max(0.03, O[i][a] + spinta[3 * i + a]));
  }
  rifaiCelle();
  // --- gli idrogeni. Di ogni molecola: i cationi vicini (da cui voltarsi), e a chi può porgere un idrogeno
  const H = new Float32Array(6 * nO), riceve = new Uint8Array(nO), dona = new Int32Array(2 * nO).fill(-1), ordine = [];
  for (let i = 0; i < nGusci; i++) ordine.push(i);
  { const resto = []; for (let i = nGusci; i < nO; i++) resto.push(i); for (let i = resto.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)), t = resto[i]; resto[i] = resto[j]; resto[j] = t; } ordine.push(...resto); }
  let legamiH = 0;
  for (const i of ordine) {
    const p = O[i], via = [0, 0, 0], cand = []; let cationi = 0; // cand: [ux, uy, uz, costo, indice dell'ossigeno o −1]
    const fermo = (q, R, carica) => { const dx = q[0] - p[0], dy = q[1] - p[1], dz = q[2] - p[2], d = Math.hypot(dx, dy, dz); if (d > R + 0.14 + 0.07 || d < 1e-6) return; if (carica > 0) { via[0] -= dx / d; via[1] -= dy / d; via[2] -= dz / d; cationi++; } else if (carica < 0) cand.push([dx / d, dy / d, dz / d, -25, -1]); };
    fermi.vicini(p, fermo);
    vicini(p, (j) => { if (j === i || dona[2 * j] === i || dona[2 * j + 1] === i) return; const q = O[j], dx = q[0] - p[0], dy = q[1] - p[1], dz = q[2] - p[2], d = Math.hypot(dx, dy, dz); if (d < 0.36) cand.push([dx / d, dy / d, dz / d, (riceve[j] >= 2 ? 60 : riceve[j] * 6) + Math.abs(d - 0.28) * 100, j]); });
    const lontanoDa = cationi ? norma(via) : null;
    let meglio = 45, a = -1, b = -1;
    for (let k = 0; k < cand.length; k++) for (let l = k + 1; l < cand.length; l++) {
      const ck = cand[k], cl = cand[l], coseno = ck[0] * cl[0] + ck[1] * cl[1] + ck[2] * cl[2], ang = Math.acos(Math.max(-1, Math.min(1, coseno)));
      let costo = (Math.abs(ang - ACQUA.angolo) * 180) / Math.PI + ck[3] + cl[3] + 25;
      if (lontanoDa) { const bis = norma([ck[0] + cl[0], ck[1] + cl[1], ck[2] + cl[2]]); costo += 60 * (1 - scal(bis, lontanoDa)); }
      if (costo < meglio) { meglio = costo; a = k; b = l; }
    }
    let d1, d2;
    if (a >= 0) { d1 = cand[a]; d2 = cand[b]; for (const c of [d1, d2]) if (c[4] >= 0) { riceve[c[4]]++; dona[2 * i + (dona[2 * i] < 0 ? 0 : 1)] = c[4]; legamiH++; } else legamiH++; }
    else {
      // un solo idrogeno ha dove andare (o nessuno): l'altro si mette a 104,5°, dalla parte opposta ai cationi
      let uno = null, costo = 30; for (const c of cand) if (c[3] < costo && (!lontanoDa || scal(c, lontanoDa) > -0.2)) { costo = c[3]; uno = c; }
      if (uno && !(lontanoDa && cationi)) { d1 = uno; d2 = aLato(uno, Math.cos(ACQUA.angolo), 2 * Math.PI * r()); if (uno[4] >= 0) { riceve[uno[4]]++; dona[2 * i] = uno[4]; } legamiH++; }
      else { const bis = lontanoDa || versoreACaso(r), e = aLato(bis, 0, 2 * Math.PI * r()); d1 = [0, 1, 2].map((k) => cM * bis[k] + sM * e[k]); d2 = [0, 1, 2].map((k) => cM * bis[k] - sM * e[k]); }
    }
    // la molecola rigida: la bisettrice tra le due direzioni volute, e l'angolo vero
    const bis = norma([d1[0] + d2[0], d1[1] + d2[1], d1[2] + d2[2]]); let e = [d1[0] - d2[0], d1[1] - d2[1], d1[2] - d2[2]]; const k = scal(e, bis); e = norma([e[0] - k * bis[0], e[1] - k * bis[1], e[2] - k * bis[2]]);
    for (let a3 = 0; a3 < 3; a3++) { H[6 * i + a3] = p[a3] + ACQUA.OH * (cM * bis[a3] + sM * e[a3]); H[6 * i + 3 + a3] = p[a3] + ACQUA.OH * (cM * bis[a3] - sM * e[a3]); }
  }
  // --- la scena
  let nIoni = 0; for (const c of centri) nIoni += 1 + (c.s.intorno ? c.s.intorno.n : 0);
  const N = 3 * nO + nIoni, pos = new Float32Array(3 * N), raggio = new Float32Array(N), elemento = new Uint8Array(N), agitazione = new Float32Array(N), gruppo = new Uint32Array(N), kT = Math.sqrt(T / 298.15);
  for (let i = 0; i < nO; i++) {
    for (let a = 0; a < 3; a++) { pos[9 * i + a] = O[i][a] + origine[a]; pos[9 * i + 3 + a] = H[6 * i + a] + origine[a]; pos[9 * i + 6 + a] = H[6 * i + 3 + a] + origine[a]; }
    raggio[3 * i] = ELEMENTI.O.vdw; raggio[3 * i + 1] = raggio[3 * i + 2] = ELEMENTI.H.vdw; elemento[3 * i] = 8; elemento[3 * i + 1] = elemento[3 * i + 2] = 1; gruppo[3 * i] = gruppo[3 * i + 1] = gruppo[3 * i + 2] = i;
  }
  const parti = [{ nome: 'acqua', da: 0, a: 3 * nO, colore: [58, 132, 255] }]; let j = 3 * nO;
  let nGruppi = nO;
  specie.forEach((s, k) => {
    const da = j, e = ELEMENTI[s.el] || ELEMENTI.Na;
    for (const c of centri) if (c.k === k) {
      const g = nGruppi++;
      for (let a = 0; a < 3; a++) pos[3 * j + a] = c.p[a] + origine[a]; raggio[j] = s.raggioCentro ?? c.R; elemento[j] = e.Z; agitazione[j] = 0.02 * kT; gruppo[j] = g; j++;
      if (s.intorno) { const I = s.intorno, dir = s.intorno.piano ? [0, 1, 2].map((q) => [Math.cos((q * 2 * Math.PI) / 3), Math.sin((q * 2 * Math.PI) / 3), 0]) : I.n === 4 ? [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map(norma) : sullaSfera(I.n);
        for (const d of ruotaACaso(dir, r)) { for (let a = 0; a < 3; a++) pos[3 * j + a] = c.p[a] + d[a] * I.d + origine[a]; raggio[j] = I.raggio; elemento[j] = (ELEMENTI[I.el] || ELEMENTI.O).Z; agitazione[j] = 0.02 * kT; gruppo[j] = g; j++; } }
    }
    parti.push({ nome: s.nome || e.simbolo, da, a: j, colore: s.colore || e.colore, carica: s.carica, quanti: s.messi });
  });
  const scena = { nome: 'acqua', unita: 'nm', colora: 'elemento', atomi: { pos, raggio, elemento, agitazione, gruppo }, legami: Uint32Array.from({ length: 4 * nO }, (_, q) => (q & 1 ? 3 * (q >> 2) + 1 + ((q >> 1) & 1) : 3 * (q >> 2))), scatola: L.slice(), origine: origine.slice(), parti, etichette: [],
    molecole: nO, legamiIdrogeno: legamiH, T, salinita, ioni: specie.map((s) => ({ nome: s.nome, quanti: s.messi })),
    descrizione: `acqua a ${Math.round(T - ZERO_CELSIUS)} °C, ${salinita} g/kg di sale: ${nO} molecole in ${L.map((x) => +x.toFixed(2)).join(' × ')} nm (${(nO / V).toFixed(1)} per nm³), ${specie.map((s) => `${s.messi} ${s.nome}`).join(', ')}` };
  // etichette: per ogni specie lo ione più vicino al centro, col suo guscio (scena.ioniVicini: i loro indici)
  scena.ioniVicini = [];
  for (const p of parti.slice(1)) { let meglio = -1, dm = Infinity; const passo = 1 + (specie[parti.indexOf(p) - 1].intorno ? specie[parti.indexOf(p) - 1].intorno.n : 0);
    for (let i = p.da; i < p.a; i += passo) { const d = (pos[3 * i] - origine[0] - L[0] / 2) ** 2 + (pos[3 * i + 1] - origine[1] - L[1] / 2) ** 2 + (pos[3 * i + 2] - origine[2] - L[2] / 2) ** 2; if (d < dm) { dm = d; meglio = i; } }
    if (meglio >= 0) { scena.ioniVicini.push(meglio); scena.etichette.push({ testo: `${p.nome} col suo guscio d'acqua`, pos: [pos[3 * meglio], pos[3 * meglio + 1], pos[3 * meglio + 2]] }); } }
  if (moto) scena.tempo = motoAcqua(pos, nO, kT, caso);
  return scena;
}
// il tremito dell'acqua: ogni molecola, rigida, oscilla attorno al suo posto e al suo orientamento (somma di due seni
// con fasi sue); gli ioni li muove la vista (agitazione). Riscrive solo i primi 9·nO numeri.
function motoAcqua(pos0, nO, kT, caso) {
  const r = tiri(caso, 'moto'), fasi = new Float32Array(12 * nO), base = pos0.slice(0, 9 * nO); for (let i = 0; i < fasi.length; i++) fasi[i] = r() * 6.2832;
  const aT = 0.025 * kT, aR = 0.21 * kT; // 0,25 Å e 12° a 25 °C
  return (t, pos) => {
    for (let i = 0; i < nO; i++) {
      const f = 12 * i, b = 9 * i, w1 = 5 + (i % 7) * 0.45, w2 = 8.3 + (i % 5) * 0.6;
      const tx = aT * (Math.sin(w1 * t + fasi[f]) + 0.6 * Math.sin(w2 * t + fasi[f + 3])), ty = aT * (Math.sin(w1 * 1.13 * t + fasi[f + 1]) + 0.6 * Math.sin(w2 * 0.9 * t + fasi[f + 4])), tz = aT * (Math.sin(w1 * 0.89 * t + fasi[f + 2]) + 0.6 * Math.sin(w2 * 1.1 * t + fasi[f + 5]));
      const rx = aR * Math.sin(w2 * 1.3 * t + fasi[f + 6]), ry = aR * Math.sin(w2 * 1.55 * t + fasi[f + 7]), rz = aR * Math.sin(w2 * 1.21 * t + fasi[f + 8]);
      // rotazione attorno al baricentro (in pratica l'ossigeno): formula di Rodrigues con il vettore di rotazione (rx, ry, rz)
      const th = Math.hypot(rx, ry, rz) || 1e-9, kx = rx / th, ky = ry / th, kz = rz / th, c = Math.cos(th), s = Math.sin(th), ox = base[b], oy = base[b + 1], oz = base[b + 2];
      pos[b] = ox + tx; pos[b + 1] = oy + ty; pos[b + 2] = oz + tz;
      for (let h = 3; h <= 6; h += 3) {
        const vx = base[b + h] - ox, vy = base[b + h + 1] - oy, vz = base[b + h + 2] - oz, kv = (kx * vx + ky * vy + kz * vz) * (1 - c);
        pos[b + h] = ox + tx + vx * c + (ky * vz - kz * vy) * s + kx * kv; pos[b + h + 1] = oy + ty + vy * c + (kz * vx - kx * vz) * s + ky * kv; pos[b + h + 2] = oz + tz + vz * c + (kx * vy - ky * vx) * s + kz * kv;
      }
    }
    return true;
  };
}
// ciò che sta fermo (gli atomi di una faccia di cristallo, gli ioni) in una griglia, per trovarne i vicini in fretta.
// Le posizioni sono riferite all'origine dell'acqua; di ognuno: raggio, carica, e il margine sotto cui un ossigeno
// dell'acqua non deve scendere (raggio + 1,4 Å per un atomo; per uno ione il suo guscio).
function grigliaFermi(ost, origine) {
  const lc = 0.8, m = new Map(), chiave = (x, y, z) => (x + 512) + 1024 * ((y + 512) + 1024 * (z + 512));
  const metti = (p, R, carica, margine, ione) => { const k = chiave(Math.floor(p[0] / lc), Math.floor(p[1] / lc), Math.floor(p[2] / lc)); (m.get(k) || m.set(k, []).get(k)).push({ p, R, carica, margine, ione }); };
  if (ost) for (let i = 0, n = ost.raggio.length; i < n; i++) metti([ost.pos[3 * i] - origine[0], ost.pos[3 * i + 1] - origine[1], ost.pos[3 * i + 2] - origine[2]], ost.raggio[i], ost.carica ? ost.carica[i] : 0, ost.raggio[i] + 0.14, false);
  return { metti, vicini(p, f) { const cx = Math.floor(p[0] / lc), cy = Math.floor(p[1] / lc), cz = Math.floor(p[2] / lc); for (let z = cz - 1; z <= cz + 1; z++) for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) { const l = m.get(chiave(x, y, z)); if (l) for (const e of l) f(e.p, e.R, e.carica, e.margine, e.ione); } } };
}

// ---------- PER LE SCENE CHE ARRIVANO DA FUORI
// DARE IL MOTO a una scena che non ce l'ha (per esempio quella di mare.js `scenaMolecolare`, che dà posizioni, legami e
// le ampiezze vere ma non una funzione): i legami dicono quali atomi fanno una molecola; ogni molecola piccola, rigida,
// oscilla attorno al suo posto e al suo orientamento; gli atomi sciolti (gli ioni) e quelli dei solidi tremano ognuno
// per sé (agitazione per atomo, mossa dalla vista). Le ampiezze: quelle di scena.agitazione se ci sono ({ gabbia:
// { ampiezzaNm }, oscillazione: { ampiezzaGradi } }), altrimenti 0,25 Å e 12° a 25 °C, ∝ √T. Come in scenaAcqua, è il
// tremito dentro la gabbia dei vicini, non una dinamica. Restituisce una scena nuova (gli atomi sono gli stessi).
export function conMoto(scena, { T = scena.T || (scena.agitazione && scena.agitazione.T) || 298.15, caso = null } = {}) {
  const A = scena.atomi, N = Math.floor(A.pos.length / 3), L = scena.legami || [], ku = UNITA[scena.unita || 'nm'], kT = Math.sqrt(T / 298.15), capo = new Uint32Array(N);
  for (let i = 0; i < N; i++) capo[i] = i;
  const trova = (i) => { while (capo[i] !== i) { capo[i] = capo[capo[i]]; i = capo[i]; } return i; };
  for (let q = 0; q + 1 < L.length; q += 2) { const a = trova(L[q]), b = trova(L[q + 1]); if (a !== b) capo[Math.max(a, b)] = Math.min(a, b); }
  const taglia = new Uint32Array(N), gruppo = new Uint32Array(N); for (let i = 0; i < N; i++) { gruppo[i] = trova(i); taglia[gruppo[i]]++; }
  // le molecole che si muovono rigide: da 2 a 16 atomi (oltre è un reticolo legato: un solido)
  const numero = new Int32Array(N).fill(-1), inizio = [0]; let nMol = 0;
  for (let i = 0; i < N; i++) { const g = gruppo[i]; if (taglia[g] >= 2 && taglia[g] <= 16 && numero[g] < 0) { numero[g] = nMol++; inizio.push(inizio[inizio.length - 1] + taglia[g]); } }
  const elenco = new Uint32Array(inizio[nMol]), cursore = inizio.slice(0, nMol), agitazione = new Float32Array(N);
  for (let i = 0; i < N; i++) { const m = numero[gruppo[i]]; if (m >= 0) elenco[cursore[m]++] = i; else agitazione[i] = A.agitazione ? A.agitazione[i] : ((taglia[gruppo[i]] === 1 ? 0.02 : 0.012) * kT) / ku; }
  const r = tiri(caso || sorgente(`atomi3d/moto/${scena.nome || N}`), 'moto'), fasi = new Float32Array(9 * nMol), base = Float32Array.from(A.pos), centri = new Float32Array(3 * nMol);
  for (let i = 0; i < fasi.length; i++) fasi[i] = r() * 6.2832;
  for (let m = 0; m < nMol; m++) { for (let q = inizio[m]; q < inizio[m + 1]; q++) for (let k = 0; k < 3; k++) centri[3 * m + k] += base[3 * elenco[q] + k]; for (let k = 0; k < 3; k++) centri[3 * m + k] /= inizio[m + 1] - inizio[m]; }
  const ag = scena.agitazione || {}, aT = (ag.gabbia && ag.gabbia.ampiezzaNm ? ag.gabbia.ampiezzaNm : 0.025 * kT) / ku, aR = ((ag.oscillazione && ag.oscillazione.ampiezzaGradi ? ag.oscillazione.ampiezzaGradi : 12 * kT) * Math.PI) / 180;
  const tempo = (t, pos) => {
    for (let m = 0; m < nMol; m++) {
      const f = 9 * m, w1 = 5 + (m % 7) * 0.45, w2 = 8.3 + (m % 5) * 0.6, cx = centri[3 * m], cy = centri[3 * m + 1], cz = centri[3 * m + 2];
      const tx = aT * (Math.sin(w1 * t + fasi[f]) + 0.6 * Math.sin(w2 * t + fasi[f + 3])), ty = aT * (Math.sin(w1 * 1.13 * t + fasi[f + 1]) + 0.6 * Math.sin(w2 * 0.9 * t + fasi[f + 4])), tz = aT * (Math.sin(w1 * 0.89 * t + fasi[f + 2]) + 0.6 * Math.sin(w2 * 1.1 * t + fasi[f + 5]));
      const rx = aR * Math.sin(w2 * 1.3 * t + fasi[f + 6]), ry = aR * Math.sin(w2 * 1.55 * t + fasi[f + 7]), rz = aR * Math.sin(w2 * 1.21 * t + fasi[f + 8]), th = Math.hypot(rx, ry, rz) || 1e-9, kx = rx / th, ky = ry / th, kz = rz / th, c = Math.cos(th), s = Math.sin(th);
      for (let q = inizio[m]; q < inizio[m + 1]; q++) { const i = 3 * elenco[q], vx = base[i] - cx, vy = base[i + 1] - cy, vz = base[i + 2] - cz, kv = (kx * vx + ky * vy + kz * vz) * (1 - c);
        pos[i] = cx + tx + vx * c + (ky * vz - kz * vy) * s + kx * kv; pos[i + 1] = cy + ty + vy * c + (kz * vx - kx * vz) * s + ky * kv; pos[i + 2] = cz + tz + vz * c + (kx * vy - ky * vx) * s + kz * kv; }
    }
    return nMol > 0;
  };
  return { ...scena, agitazione: null, atomi: { ...A, gruppo: A.gruppo || gruppo, agitazione }, tempo, molecoleMosse: nMol };
}
// LE CONDIZIONI PERIODICHE: un campione di liquido (o di cristallo) non sta nel vuoto. Come nelle simulazioni di un
// liquido, ciò che esce da un lato della scatola rientra dall'altro: lo spazio attorno è pieno di copie della scatola
// (ripeti: quante su ogni asse, dispari; la copia del punto sta al centro, le altre attorno). Il moto è lo stesso in ogni
// copia (è la stessa materia: ciò che fa una molecola vicino al lato lo fa anche la sua immagine). Chi guarda non vede
// mai più di quanto lo schermo regga: le copie lontane passano per la nebbia della vista (sferette che ne rappresentano
// molte). Restituisce una scena nuova; scatola: [lx, ly, lz] del campione (se manca: quella della scena).
// simmetria(i, j, k) (facoltativa; i, j, k: la copia, 0 quella del punto) → [a, b, c, e]: ogni copia girata o ribaltata nel
// piano x–y attorno al centro della scatola (x' = a·x + b·y, y' = c·x + e·y; per una scatola quadrata le otto simmetrie del
// quadrato: mappa.js varianteCella). Una copia così è ancora lo stesso liquido, ma le copie non sono più tutte uguali.
export function periodica(scena, ripeti = [3, 3, 1], scatola = null, { simmetria = null } = {}) {
  const A = scena.atomi, N = Math.floor(A.pos.length / 3), box = scatola || scena.scatola, R = ripeti.map((n) => Math.max(1, n | 0)), copie = R[0] * R[1] * R[2];
  if (copie === 1 || !N || !box) return scena;
  const spost = []; for (let k = 0; k < R[2]; k++) for (let j = 0; j < R[1]; j++) for (let i = 0; i < R[0]; i++) { const ii = i - (R[0] - 1) / 2, jj = j - (R[1] - 1) / 2, kk = k - (R[2] - 1) / 2, d = [ii * box[0], jj * box[1], kk * box[2]]; if (simmetria && (ii || jj || kk)) d.m = simmetria(ii, jj, kk); spost.push(d); }
  // (la copia del punto, quella senza spostamento, resta la prima: i suoi atomi hanno gli stessi indici di prima)
  const zero = spost.findIndex((d) => !d[0] && !d[1] && !d[2]); if (zero > 0) [spost[0], spost[zero]] = [spost[zero], spost[0]];
  const pos = new Float32Array(3 * N * copie), rip = (a, n) => { if (!a) return a; const o = new a.constructor(a.length * copie); for (let c = 0; c < copie; c++) o.set(a, c * a.length); return o; };
  const cx = box[0] / 2, cy = box[1] / 2;
  const sposta = (src, dst) => { for (let c = 0; c < copie; c++) { const d = spost[c], b = 3 * N * c, m = d.m;
    if (m) { for (let i = 0; i < 3 * N; i += 3) { const x = src[i] - cx, y = src[i + 1] - cy; dst[b + i] = cx + m[0] * x + m[1] * y + d[0]; dst[b + i + 1] = cy + m[2] * x + m[3] * y + d[1]; dst[b + i + 2] = src[i + 2] + d[2]; } continue; }
    for (let i = 0; i < 3 * N; i += 3) { dst[b + i] = src[i] + d[0]; dst[b + i + 1] = src[i + 1] + d[1]; dst[b + i + 2] = src[i + 2] + d[2]; } } };
  sposta(A.pos, pos);
  let parte = A.parte; if (!parte && scena.parti?.length && scena.parti[0].da != null) { parte = new Uint16Array(N).fill(65535); scena.parti.forEach((p, k) => parte.fill(k, Math.max(0, p.da), Math.min(N, p.a))); }
  let gruppo = null; if (A.gruppo) { let g = 0; for (let i = 0; i < N; i++) if (A.gruppo[i] > g) g = A.gruppo[i]; gruppo = new Uint32Array(N * copie); for (let c = 0; c < copie; c++) for (let i = 0; i < N; i++) gruppo[c * N + i] = A.gruppo[i] + c * (g + 1); }
  const lega = (L) => { if (!L || !L.length) return L; const o = new Uint32Array(L.length * copie); for (let c = 0; c < copie; c++) for (let q = 0; q < L.length; q++) o[c * L.length + q] = L[q] + c * N; return o; };
  let pos2 = null; if (A.pos2) { pos2 = new Float32Array(pos.length); sposta(A.pos2, pos2); }
  const atomi = { ...A, pos, raggio: rip(A.raggio), elemento: rip(A.elemento), colore: rip(A.colore), parte: rip(parte), gruppo, agitazione: rip(A.agitazione), pos2 };
  for (const k in atomi) if (atomi[k] == null) delete atomi[k];
  const parti = (scena.parti || []).map((p) => { const q = { ...p }; delete q.da; delete q.a; return q; });
  let tempo = scena.tempo;
  if (typeof tempo === 'function') { const t0 = tempo, mio = Float32Array.from(A.pos); tempo = (t, P) => { const v = t0(t, mio); if (v === false) return false; sposta(mio, P); return true; }; }
  else if (tempo && tempo.fotogrammi) tempo = { ...tempo, fotogrammi: tempo.fotogrammi.map((f) => { const o = new Float32Array(pos.length); sposta(f, o); return o; }) };
  return { ...scena, atomi, legami: lega(scena.legami), legamiH: lega(scena.legamiH), parti, tempo, scatola: [box[0] * R[0], box[1] * R[1], box[2] * R[2]], periodica: { ripeti: R, scatola: box, copie } };
}
// Un elenco di atomi come oggetti ({ x, y, z, el: simbolo o numero atomico, raggio, colore }: per esempio quello di
// materia.js `atomi(minerale, …)`, che è in metri) messo nel formato della scena.
export function scenaDaElenco(elenco, { unita = 'm', nome = '', scatola = null } = {}) {
  const N = elenco.length, pos = new Float32Array(3 * N), raggio = new Float32Array(N), elemento = new Uint8Array(N), conColore = N > 0 && elenco.every((a) => a.colore), colore = conColore ? new Uint8Array(3 * N) : null, lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < N; i++) { const a = elenco[i], e = ELEMENTI[a.el] || ELEMENTI[a.Z] || ELEMENTI.C, p = [a.x, a.y, a.z || 0];
    for (let k = 0; k < 3; k++) { pos[3 * i + k] = p[k]; if (p[k] < lo[k]) lo[k] = p[k]; if (p[k] > hi[k]) hi[k] = p[k]; }
    raggio[i] = a.raggio ?? (e.ionico ?? e.vdw) / UNITA[unita]; elemento[i] = e.Z; if (colore) colore.set(a.colore.slice(0, 3), 3 * i); }
  return { nome, unita, colora: 'elemento', atomi: colore ? { pos, raggio, elemento, colore } : { pos, raggio, elemento }, scatola: scatola || (N ? [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]] : [0, 0, 0]), parti: [], etichette: [] };
}

// ---------- I RETICOLI. Una cella elementare è { a, b, c: i tre vettori (nm), base: [{ el, uvw, carica, raggio }] }:
// lo stesso formato che può arrivare da fuori (`reticolo` in scenaCristallo). L'asse y è quello «in alto»: la faccia che
// si bagna è quella di sopra. I raggi: ionici dove il legame è ionico, e dichiarati negli altri casi.
const R3 = Math.sqrt(3) / 2;
export const RETICOLI = {
  // salgemma NaCl: cubico a facce centrate, passo 5,640 Å (a 25 °C); raggi ionici (Na⁺ 1,02 + Cl⁻ 1,81 = 2,83 ≈ a/2: si toccano)
  salgemma: (() => { const a = 0.5640, f = [[0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5]];
    return { nome: 'salgemma', formula: 'NaCl', a: [a, 0, 0], b: [0, a, 0], c: [0, 0, a], base: [...f.map((u) => ({ el: 'Na', uvw: u, carica: 1, raggio: 0.102 })), ...f.map((u) => ({ el: 'Cl', uvw: [u[0] + 0.5, u[1], u[2]], carica: -1, raggio: 0.181 }))], agitazione: { Na: 0.0145, Cl: 0.0135 } }; })(), // spostamento quadratico medio a 295 K (fattori B ≈ 1,6 e 1,4 Å²)
  // ghiaccio Ih: esagonale, a = 4,518 Å, c = 7,356 Å (a 250 K); ossigeni in (1/3, 2/3, z) con z = 0,0625; gli idrogeni,
  // uno per legame e due per ossigeno (regole di Bernal e Fowler), li mette scenaCristallo
  ghiaccio: (() => { const a = 0.4518, c = 0.7356, z = 0.0625;
    return { nome: 'ghiaccio', formula: 'H2O', a: [a, 0, 0], b: [-a / 2, 0, a * R3], c: [0, c, 0], base: [[1 / 3, 2 / 3, z], [2 / 3, 1 / 3, z + 0.5], [2 / 3, 1 / 3, 1 - z], [1 / 3, 2 / 3, 0.5 - z]].map((u) => ({ el: 'O', uvw: u, carica: -0.8, raggio: 0.152 })), ghiaccio: true, agitazione: { O: 0.02, H: 0.025 } }; })(),
  // quarzo α: trigonale (P3₂21), a = 4,913 Å, c = 5,405 Å; Si in (0,4697, 0, 0), O in (0,4135, 0,2669, 0,1191) (Levien,
  // Prewitt e Weidner 1980); ossigeno col raggio ionico (1,35 Å), silicio col covalente (1,11 Å) perché si veda tra gli ossigeni
  quarzo: (() => { const a = 0.4913, c = 0.5405, u = 0.4697, [x, y, z] = [0.4135, 0.2669, 0.1191], m = (v) => v.map((q) => ((q % 1) + 1) % 1);
    const Si = [[u, 0, 0], [0, u, 2 / 3], [-u, -u, 1 / 3]], Ox = [[x, y, z], [-y, x - y, z + 2 / 3], [-x + y, -x, z + 1 / 3], [x - y, -y, -z], [y, x, 2 / 3 - z], [-x, -x + y, 1 / 3 - z]];
    return { nome: 'quarzo', formula: 'SiO2', a: [a, 0, 0], b: [-a / 2, 0, a * R3], c: [0, c, 0], base: [...Si.map((v) => ({ el: 'Si', uvw: m(v), carica: 2.4, raggio: 0.111 })), ...Ox.map((v) => ({ el: 'O', uvw: m(v), carica: -1.2, raggio: 0.135 }))], agitazione: { Si: 0.007, O: 0.0105 } }; })(),
};
// riempie il blocco [0, dim] con la cella ripetuta → { pos: [], el: [], raggio: [], carica: [] }
function riempi(ret, dim) {
  const { a, b, c } = ret, det = a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
  const inv = [vett(b, c), vett(c, a), vett(a, b)].map((v) => v.map((x) => x / det)); // i vettori reciproci: le coordinate nella cella di un punto
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (let q = 0; q < 8; q++) { const p = [q & 1 ? dim[0] : 0, q & 2 ? dim[1] : 0, q & 4 ? dim[2] : 0]; for (let k = 0; k < 3; k++) { const f = inv[k][0] * p[0] + inv[k][1] * p[1] + inv[k][2] * p[2]; if (f < lo[k]) lo[k] = f; if (f > hi[k]) hi[k] = f; } }
  const pos = [], el = [], raggio = [], carica = [], e = 1e-4;
  for (let i = Math.floor(lo[0]) - 1; i <= Math.ceil(hi[0]); i++) for (let j = Math.floor(lo[1]) - 1; j <= Math.ceil(hi[1]); j++) for (let k = Math.floor(lo[2]) - 1; k <= Math.ceil(hi[2]); k++) for (const at of ret.base) {
    const u = at.uvw[0] + i, v = at.uvw[1] + j, w = at.uvw[2] + k, x = u * a[0] + v * b[0] + w * c[0], y = u * a[1] + v * b[1] + w * c[1], z = u * a[2] + v * b[2] + w * c[2];
    if (x < -e || y < -e || z < -e || x > dim[0] + e || y > dim[1] + e || z > dim[2] + e) continue;
    const E = ELEMENTI[at.el] || ELEMENTI.C; pos.push(x, y, z); el.push(E.Z); raggio.push(at.raggio ?? E.ionico ?? E.vdw); carica.push(at.carica || 0);
  }
  return { pos, el, raggio, carica };
}
// gli idrogeni del ghiaccio: uno su ogni legame tra ossigeni vicini (2,76 Å), due vicino a ogni ossigeno; chi sta in
// superficie e ha meno di quattro vicini tiene gli idrogeni che avanzano rivolti dove il vicino manca
function idrogeniGhiaccio(pos, r) {
  const n = pos.length / 3, lc = 0.3, m = new Map(), ch = (x, y, z) => (x + 512) + 1024 * ((y + 512) + 1024 * (z + 512)), vic = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) { const k = ch(Math.floor(pos[3 * i] / lc), Math.floor(pos[3 * i + 1] / lc), Math.floor(pos[3 * i + 2] / lc)); (m.get(k) || m.set(k, []).get(k)).push(i); }
  const legami = []; // [i, j, verso]: verso 0 → l'idrogeno è di i
  for (let i = 0; i < n; i++) { const cx = Math.floor(pos[3 * i] / lc), cy = Math.floor(pos[3 * i + 1] / lc), cz = Math.floor(pos[3 * i + 2] / lc);
    for (let z = cz - 1; z <= cz + 1; z++) for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) for (const j of m.get(ch(x, y, z)) || []) if (j > i && (pos[3 * i] - pos[3 * j]) ** 2 + (pos[3 * i + 1] - pos[3 * j + 1]) ** 2 + (pos[3 * i + 2] - pos[3 * j + 2]) ** 2 < 0.3 * 0.3) { vic[i].push(legami.length); vic[j].push(legami.length); legami.push([i, j, r() < 0.5 ? 0 : 1]); } }
  const dati = new Int32Array(n); for (const [i, j, v] of legami) dati[v ? j : i]++;
  const donatore = (l) => (legami[l][2] ? legami[l][1] : legami[l][0]);
  // si girano i legami finché ogni ossigeno ne dà al più due e ne riceve al più due
  for (let giro = 0, fatto = false; giro < 400 && !fatto; giro++) { fatto = true;
    for (let i = 0; i < n; i++) { const b = vic[i].length;
      while (dati[i] > 2) { fatto = false; const miei = vic[i].filter((l) => donatore(l) === i), l = miei[Math.floor(r() * miei.length)], altro = legami[l][0] === i ? legami[l][1] : legami[l][0]; legami[l][2] ^= 1; dati[i]--; dati[altro]++; }
      while (b - dati[i] > 2) { fatto = false; const suoi = vic[i].filter((l) => donatore(l) !== i), l = suoi[Math.floor(r() * suoi.length)], altro = legami[l][0] === i ? legami[l][1] : legami[l][0]; legami[l][2] ^= 1; dati[i]++; dati[altro]--; }
    } }
  const H = [], OH = 0.0985, di = Array.from({ length: n }, () => []); // di[i]: le posizioni dei suoi idrogeni
  for (let i = 0; i < n; i++) {
    const dir = vic[i].map((l) => { const j = legami[l][0] === i ? legami[l][1] : legami[l][0]; return norma([pos[3 * j] - pos[3 * i], pos[3 * j + 1] - pos[3 * i + 1], pos[3 * j + 2] - pos[3 * i + 2]]); });
    const mie = vic[i].map((l, k) => (donatore(l) === i ? dir[k] : null)).filter(Boolean);
    // le direzioni del tetraedro rimaste libere
    let libere = [];
    if (dir.length === 3) libere = [norma([-dir[0][0] - dir[1][0] - dir[2][0], -dir[0][1] - dir[1][1] - dir[2][1], -dir[0][2] - dir[1][2] - dir[2][2]])];
    else if (dir.length === 2) { const bis = norma([-dir[0][0] - dir[1][0], -dir[0][1] - dir[1][1], -dir[0][2] - dir[1][2]]), p = norma(vett(dir[0], dir[1])), c = Math.cos(0.9553), s = Math.sin(0.9553); libere = [[0, 1, 2].map((k) => c * bis[k] + s * p[k]), [0, 1, 2].map((k) => c * bis[k] - s * p[k])]; }
    else if (dir.length === 1) { const az = 2 * Math.PI * r(); libere = [0, 1, 2].map((q) => aLato(dir[0], -1 / 3, az + (q * 2 * Math.PI) / 3)); }
    else if (dir.length === 0) { const d = versoreACaso(r); libere = [d, aLato(d, -1 / 3, 2 * Math.PI * r())]; }
    for (let k = libere.length - 1; k > 0; k--) { const j = Math.floor(r() * (k + 1)), t = libere[k]; libere[k] = libere[j]; libere[j] = t; }
    for (const d of [...mie, ...libere].slice(0, 2)) { H.push(pos[3 * i] + OH * d[0], pos[3 * i + 1] + OH * d[1], pos[3 * i + 2] + OH * d[2]); di[i].push(H.length / 3 - 1); }
  }
  return { H, di };
}

// UN CRISTALLO, e se si vuole la sua faccia bagnata. { minerale: 'salgemma' | 'ghiaccio' | 'quarzo' | reticolo: {…},
//   dimNm: [x, y, z] | latoNm, T, acqua: { spessoreNm, salinita, T, ioni } }
// Il blocco è tagliato netto lungo le facce della scatola (la faccia di sopra è (100) per il salgemma, il piano basale
// per ghiaccio e quarzo): NON è ricostruita né rivestita (nel quarzo vero la faccia bagnata si copre di gruppi Si–OH).
// Con `acqua`, sopra il blocco c'è uno strato dell'acqua di scenaAcqua, che vede gli atomi della faccia come ostacoli
// e come ioni: l'ossigeno verso i cationi, un idrogeno verso gli anioni.
export function scenaCristallo({ minerale = 'salgemma', reticolo = null, latoNm = 10, dimNm = null, T = 298.15, acqua = null } = {}, caso = null) {
  caso = caso || sorgente(`atomi3d/cristallo/${minerale}`); const r = tiri(caso, 'cristallo'), ret = reticolo || RETICOLI[minerale]; if (!ret) throw new Error(`atomi3d: non conosco il reticolo di «${minerale}»`);
  const dim = dimNm || [latoNm, latoNm, latoNm], B = riempi(ret, dim); let nC = B.el.length;
  const ag = ret.agitazione || {}, kT = Math.sqrt(T / 298.15), parti = [];
  let molecoleGhiaccio = null;
  if (ret.ghiaccio) { // gli idrogeni, e gli atomi riordinati molecola per molecola (O, H, H)
    const { H, di } = idrogeniGhiaccio(B.pos, r), n = nC, p2 = [], e2 = [], r2 = [], c2 = [];
    for (let i = 0; i < n; i++) { p2.push(B.pos[3 * i], B.pos[3 * i + 1], B.pos[3 * i + 2]); e2.push(8); r2.push(B.raggio[i]); c2.push(-0.8); for (const h of di[i]) { p2.push(H[3 * h], H[3 * h + 1], H[3 * h + 2]); e2.push(1); r2.push(ELEMENTI.H.vdw); c2.push(0.4); } }
    B.pos = p2; B.el = e2; B.raggio = r2; B.carica = c2; nC = e2.length; molecoleGhiaccio = n;
  }
  let W = null, alto = 0;
  if (acqua) {
    for (let i = 0; i < nC; i++) if (B.pos[3 * i + 1] > alto) alto = B.pos[3 * i + 1];
    // gli atomi della faccia (l'ultimo nanometro scarso) sono gli ostacoli dell'acqua
    const op = [], or = [], oc = []; for (let i = 0; i < nC; i++) if (B.pos[3 * i + 1] > alto - 0.7 && B.el[i] !== 1) { op.push(B.pos[3 * i], B.pos[3 * i + 1], B.pos[3 * i + 2]); or.push(B.raggio[i]); oc.push(B.carica[i]); }
    W = scenaAcqua({ dimNm: [dim[0], acqua.spessoreNm ?? 4, dim[2]], salinita: acqua.salinita ?? 35, T: acqua.T ?? T, ioni: acqua.ioni || null, origine: [0, alto + 0.02, 0], ostacoli: { pos: op, raggio: or, carica: oc }, moto: acqua.moto !== false }, caso.sotto('acqua'));
  }
  const nW = W ? W.atomi.raggio.length : 0, N = nC + nW, pos = new Float32Array(3 * N), raggio = new Float32Array(N), elemento = new Uint8Array(N), agitazione = new Float32Array(N);
  const gruppo = new Uint32Array(N); let ng = 0;
  for (let i = 0; i < nC; i++) gruppo[i] = ret.ghiaccio && B.el[i] === 1 ? ng - 1 : ng++;
  pos.set(B.pos); raggio.set(B.raggio); elemento.set(B.el);
  for (let i = 0; i < nC; i++) agitazione[i] = (ag[ELEMENTI[B.el[i]].simbolo] || 0.012) * kT;
  parti.push({ nome: ret.nome || minerale, da: 0, a: nC, colore: [255, 208, 0] });
  if (W) { pos.set(W.atomi.pos, 3 * nC); raggio.set(W.atomi.raggio, nC); elemento.set(W.atomi.elemento, nC); agitazione.set(W.atomi.agitazione, nC); for (let i = 0; i < nW; i++) gruppo[nC + i] = ng + W.atomi.gruppo[i]; for (const p of W.parti) parti.push({ ...p, da: p.da + nC, a: p.a + nC }); }
  // i legami del reticolo: tra atomi diversi più vicini della somma dei raggi covalenti (più il 15%)
  const legami = [];
  if (nC <= 400000) { const lc = 0.36, m = new Map(), ch = (x, y, z) => (x + 512) + 1024 * ((y + 512) + 1024 * (z + 512));
    for (let i = 0; i < nC; i++) { const k = ch(Math.floor(pos[3 * i] / lc), Math.floor(pos[3 * i + 1] / lc), Math.floor(pos[3 * i + 2] / lc)); (m.get(k) || m.set(k, []).get(k)).push(i); }
    for (let i = 0; i < nC; i++) { const cx = Math.floor(pos[3 * i] / lc), cy = Math.floor(pos[3 * i + 1] / lc), cz = Math.floor(pos[3 * i + 2] / lc), ci = ELEMENTI[elemento[i]].covalente;
      for (let z = cz - 1; z <= cz + 1; z++) for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) for (const j of m.get(ch(x, y, z)) || []) if (j > i && elemento[j] !== elemento[i] && (pos[3 * i] - pos[3 * j]) ** 2 + (pos[3 * i + 1] - pos[3 * j + 1]) ** 2 + (pos[3 * i + 2] - pos[3 * j + 2]) ** 2 < (1.15 * (ci + ELEMENTI[elemento[j]].covalente)) ** 2) legami.push(i, j); } }
  if (W) for (let q = 0; q < W.legami.length; q++) legami.push(W.legami[q] + nC);
  const scatola = [dim[0], W ? alto + 0.02 + W.scatola[1] : dim[1], dim[2]], conta = {}; for (let i = 0; i < nC; i++) { const s = ELEMENTI[B.el[i]].simbolo; conta[s] = (conta[s] || 0) + 1; }
  // (i gruppi servono solo dove ci sono molecole: nel ghiaccio e nell'acqua)
  const scena = { nome: ret.nome || minerale, unita: 'nm', colora: 'elemento', atomi: W || ret.ghiaccio ? { pos, raggio, elemento, agitazione, gruppo } : { pos, raggio, elemento, agitazione }, legami: Uint32Array.from(legami), scatola, parti, etichette: [], T, reticolo: ret, atomiCristallo: nC, composizione: conta, molecoleGhiaccio,
    descrizione: `${ret.nome || minerale} (${ret.formula || ''}): ${nC} atomi in ${dim.map((x) => +x.toFixed(2)).join(' × ')} nm${W ? `; sopra, ${W.descrizione}` : ''}` };
  scena.etichette.push({ testo: `${ret.nome || minerale}: ${Object.entries(conta).map(([s, n]) => `${n} ${s}`).join(', ')}`, pos: [dim[0] * 0.8, (W ? alto : dim[1]) * 0.55, dim[2]] });
  if (W) {
    scena.etichette.push({ testo: 'la faccia bagnata', pos: [dim[0] * 0.3, alto + 0.15, dim[2]] }, { testo: `acqua: ${W.molecole} molecole`, pos: [dim[0] * 0.7, alto + W.scatola[1] * 0.6, dim[2]] });
    if (W.tempo) { const moto = W.tempo, parte = new Float32Array(W.atomi.pos); scena.tempo = (t, p) => { moto(t, parte); p.set(parte.subarray(0, 9 * W.molecole), 3 * nC); return true; }; }
    scena.acqua = { molecole: W.molecole, ioni: W.ioni, da: nC };
  }
  return scena;
}

// LA PROVA DI CARICO: un doppio strato di molecole anfifiliche SCHEMATICHE (una testa di una dozzina di atomi, due
// code di sedici gruppi CH₂ ciascuna, 0,64 nm² per molecola come un fosfolipide), una colonna di subunità impilate a
// elica che lo attraversa e ioni sparsi attorno. Non è una struttura vera (nessuna vita è «messa lì»): serve a misurare
// quanti atomi regge la vista e a vedere se parti di colori diversi si leggono. { atomi: quanti, colonna: true }
export function scenaDoppioStrato({ atomi = 200000, colonna = true, ioni = true } = {}, caso = null) {
  caso = caso || sorgente('atomi3d/carico'); const r = tiri(caso, 'strato');
  const perLipide = 44, perSub = 620, nSub = colonna ? Math.round(Math.min(0.22 * atomi, 30000 + 0.04 * atomi) / perSub) : 0, nIoni = ioni ? Math.round(atomi * 0.012) : 0;
  const nLip = Math.max(2, Math.floor((atomi - nSub * perSub - nIoni) / perLipide)), passo = Math.sqrt(0.64 / R3), perLato = Math.sqrt(nLip / 2), lato = perLato * Math.sqrt(0.64);
  const nx = Math.max(1, Math.round(lato / passo)), nz = Math.max(1, Math.ceil(nLip / 2 / nx)), LX = nx * passo, LZ = nz * passo * R3, raggioColonna = 4.2, cxC = LX / 2, czC = LZ / 2;
  const P = [], Rg = [], El = [], Pa = []; // posizioni, raggi, elementi, parte
  const metti = (x, y, z, rr, el, parte) => { P.push(x, y, z); Rg.push(rr); El.push(el); Pa.push(parte); };
  const onda = (x, z) => 0.9 * Math.sin((x / LX) * 2 * Math.PI * 1.5) * Math.cos((z / LZ) * 2 * Math.PI) + 0.4 * Math.sin((x / LX + z / LZ) * 2 * Math.PI * 3); // la membrana ondeggia un poco
  let lip = 0;
  for (let foglio = 0; foglio < 2; foglio++) for (let j = 0; j < nz; j++) for (let i = 0; i < nx && lip < nLip; i++) {
    const x = (i + 0.5 * (j & 1) + 0.25 * (r() - 0.5)) * passo, z = (j + 0.25 * (r() - 0.5)) * passo * R3;
    if (colonna && (x - cxC) ** 2 + (z - czC) ** 2 < (raggioColonna + 0.3) ** 2) continue;
    lip++;
    const verso = foglio ? -1 : 1, y0 = onda(x, z), az = 2 * Math.PI * r(), ca = Math.cos(az), sa = Math.sin(az), incl = [0.12 * (r() - 0.5), 0.12 * (r() - 0.5)];
    // le due code: sedici gruppi CH₂ a zig-zag (1,27 Å di salita ciascuno), dal centro verso la testa
    for (let coda = 0; coda < 2; coda++) { const ox = (coda ? 0.24 : -0.24) * ca, oz = (coda ? 0.24 : -0.24) * sa;
      for (let k = 0; k < 16; k++) { const h = 0.12 + k * 0.127, zz = (k & 1 ? 0.045 : -0.045); metti(x + ox + incl[0] * h + zz * sa, y0 + verso * h, z + oz + incl[1] * h - zz * ca, 0.2, 6, 1); } }
    // la testa: fosforo, quattro ossigeni, azoto e qualche carbonio, in un grumo
    const hy = 0.12 + 16 * 0.127 + 0.22, T = [[0, 0, 0, 0.18, 15], [0.15, 0.05, 0, 0.152, 8], [-0.15, 0.05, 0, 0.152, 8], [0, 0.06, 0.15, 0.152, 8], [0, -0.14, -0.05, 0.152, 8], [0.1, 0.3, 0.1, 0.155, 7], [0.22, 0.38, 0.02, 0.17, 6], [0, 0.42, 0.2, 0.17, 6], [0.05, 0.2, -0.1, 0.17, 6], [-0.22, -0.2, 0.05, 0.17, 6], [0.2, -0.22, 0.02, 0.17, 6], [-0.05, -0.3, 0.2, 0.152, 8]];
    for (const [a, b, c, rr, el] of T) metti(x + a * ca - c * sa + incl[0] * hy, y0 + verso * (hy + b), z + a * sa + c * ca + incl[1] * hy, rr, el, 0);
  }
  // la colonna: subunità (grumi di atomi fitti) impilate a elica, undici per giro, di due colori alternati
  if (colonna) for (let s = 0; s < nSub; s++) {
    const ang = (s / 11) * 2 * Math.PI, y = -9 + s * (5.2 / 11), cx = cxC + (raggioColonna - 1.3) * Math.cos(ang), cz = czC + (raggioColonna - 1.3) * Math.sin(ang), parte = 2 + (s & 1);
    for (let k = 0, prove = 0; k < perSub && prove < perSub * 20; prove++) { // un ellissoide riempito a griglia scossa
      const u = versoreACaso(r), q = Math.cbrt(r()), px = u[0] * q * 1.5, py = u[1] * q * 2.6, pz = u[2] * q * 1.5;
      metti(cx + px * Math.cos(ang) - pz * Math.sin(ang), y + py, cz + px * Math.sin(ang) + pz * Math.cos(ang), k % 5 === 0 ? 0.152 : 0.17, k % 5 === 0 ? 8 : k % 7 === 0 ? 7 : 6, parte); k++;
    }
  }
  // gli ioni sparsi sopra e sotto
  const alto = colonna ? Math.max(8, -9 + nSub * (5.2 / 11) + 2) : 8;
  for (let k = 0; k < nIoni; k++) { const sopra = r() < 0.6, y = sopra ? 3.6 + r() * (alto - 3.6) : -3.6 - r() * 6; metti(r() * LX, y, r() * LZ, 0.19, k & 1 ? 11 : 17, 4); }
  const N = Rg.length, scena = { nome: 'prova di carico', unita: 'nm', colora: 'parte', atomi: { pos: Float32Array.from(P), raggio: Float32Array.from(Rg), elemento: Uint8Array.from(El), parte: Uint16Array.from(Pa) }, scatola: [LX, alto + 12, LZ],
    parti: [{ nome: 'teste delle molecole anfifiliche', colore: [236, 38, 143] }, { nome: 'code idrofobe', colore: [255, 208, 0] }, { nome: 'colonna: subunità A', colore: [0, 196, 200] }, { nome: 'colonna: subunità B', colore: [70, 200, 60] }, { nome: 'ioni', colore: [245, 245, 245] }],
    agitazione: { C: 0.02, O: 0.02, N: 0.02, P: 0.02, Na: 0.03, Cl: 0.03 }, etichette: [], lipidi: lip, subunita: nSub,
    descrizione: `prova di carico (schematica): ${N} atomi — ${lip} molecole anfifiliche in doppio strato ${LX.toFixed(0)} × ${LZ.toFixed(0)} nm, ${nSub} subunità impilate, ${nIoni} ioni` };
  scena.etichette.push({ testo: 'doppio strato (schematico)', pos: [LX * 0.82, 2.6, LZ * 0.8] });
  if (colonna) scena.etichette.push({ testo: `colonna: ${nSub} subunità impilate`, pos: [cxC + raggioColonna, alto - 6, czC] });
  if (nIoni) scena.etichette.push({ testo: 'ioni', pos: [P[3 * (N - 1)], P[3 * (N - 1) + 1], P[3 * (N - 1) + 2]] });
  return scena;
}
