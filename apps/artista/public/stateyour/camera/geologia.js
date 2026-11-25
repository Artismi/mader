// geologia.js — l'interno e la superficie di un pianeta, che emergono da massa, composizione ed età.
//
// INTERNO, DINAMO, TETTONICA. Lo stato dell'interno di un pianeta a un istante viene dalla sua storia (storia.js): il
// mantello e il nucleo che si raffreddano dalla nascita (convezione parametrizzata, calore radiogenico e di marea), il
// nucleo interno che cresce, la dinamo (finché il nucleo cede più calore di quanto l'adiabatica ne porti per
// conduzione, o finché il nucleo interno cresce), il regime della crosta dal criterio di Korenaga con l'attrito che
// l'acqua abbassa. interno(P, stella) è quella storia letta all'età della stella: una fonte sola.
// SUPERFICIE. Il rilievo nasce dalle placche; l'acqua che il pianeta ha riempie
// i punti più bassi (mari e laghi emergono da quanta acqua c'è); dove piove l'acqua
// scende lungo la pendenza più ripida e si raccoglie: i fiumi e le loro valli.

import { celle } from './fluidi.js';
import { minerali, coloreRoccia, ROCCE } from './chimica.js';
import { evolviTettonica, COSTANTI as TETTONICA } from './tettonica.js';
import { meteoPianeta, pioggiaPerErosione } from './meteo.js';
import { improntaMantello, crateriVisibili } from './impatti.js';
import { internoDaStoria, storia, tabellaStoria, STORIA } from './storia.js'; // l'interno di oggi è la storia del pianeta letta alla sua età
import { acquaInSuperficie, COSTANTI as COSTANTI_LEGGI, CLIMA, NUVOLE, riflette, riflessoNuvoleAtteso, coperturaDelCielo, acquaPerIlGhiaccio, nuvoleAttese, bilancioPerFasce, serraDaPressione, luceDelGiorno, frenaPasso, caloreDellaRoccia } from './leggi.js';
// L'INTERNO DI OGGI: lo stato della storia del pianeta (storia.js) all'età della sua stella, nella forma di sempre:
// { eta, nucleo (raggio del nucleo / raggio), crosta (spessore della crosta di basalto / raggio), q (W/m²), dinamo, B0 (T
// all'equatore), tettonica ('a placche' | 'coperchio unico, con vulcani' | 'ferma'), vulcani, rossby e dipolo (se il
// pianeta porta il giorno) }. Le soglie nette di prima (q > 0,025 e R > 3500 km per il nucleo liquido; q > 0,05, acqua
// > 0,5% e M > 0,3 Terre per le placche; q > 0,02 per i vulcani) non ci sono più: decidono il galleggiamento nel nucleo,
// il criterio di Korenaga e la roccia che fonde o no sotto il coperchio. RESTANO, dichiarate in storia.js: il numero di
// edifici vulcanici da disegnare (uno ogni 0,02 W/m² dove il mantello fonde), il campo di 10⁻⁹ T di chi non ha dinamo,
// «dieci volte più debole» senza dipolo (soglia di Rossby 0,12), e per i giganti di gas la legge di prima.
export function interno(P, stella) { return internoDaStoria(P, stella); }

// lo stato del mantello dalla storia termica del pianeta (storia.js: quella che il pianeta ha già), per tettonica.js: il
// salto di temperatura tra il mantello alto e la superficie, la sua conducibilità e la sua diffusività; null se non c'è
export function statoDelMantello(P, int = P.interno) {
  try { const sto = storia(P, int?.eta ?? 4.5e9); return sto && sto.Tum > sto.Ts ? { dT: sto.Tum - sto.Ts, k: STORIA.kSu, kappa: STORIA.kSu / (STORIA.rhoSu * STORIA.cp) } : null; } catch { return null; }
}

// ---------- la superficie: una mappa equirettangolare (longitudine × latitudine) di quote in metri
const memo = new Map();
import { comeSorgente } from './eventi.js';
import { discendi } from './eredita.js'; // l'ottava condizionata dal padre: il figlio è il padre più una correzione a media nulla // il caso della superficie: dalla fonte unica («seme» è un numero o la sorgente del luogo)
export function superficiePianeta(chiave, P, int, seme, { W = 256, H = 128 } = {}) {
  if (memo.has(chiave)) return memo.get(chiave);
  const caso = comeSorgente(seme, 'superficie'); // gli eventi della superficie, ognuno con il suo nome («onda 3/fase», «vulcano 2/dove»): l'ordine non conta
  const sfera = (i, j) => { const lon = ((i + 0.5) / W) * 2 * Math.PI - Math.PI, lat = Math.PI / 2 - ((j + 0.5) / H) * Math.PI; return [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)]; };
  const casuale = (nome) => { const t = caso.serie(nome), z = 2 * t(0) - 1, a = t(1) * 2 * Math.PI, r = Math.sqrt(1 - z * z); return [r * Math.cos(a), r * Math.sin(a), z]; };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  // LA TETTONICA EVOLVE NEL TEMPO (tettonica.js). Il mantello scaldato dal basso si organizza in celle che
  // cambiano lentamente; la crosta dei continenti, leggera, è trascinata: si spacca dove il mantello sale, deriva,
  // e dove due masse si scontrano si ispessisce in catene di montagne; la crosta degli oceani nasce alle dorsali,
  // invecchia allontanandosi (e il fondo sprofonda come la radice dell'età) e affonda nelle fosse. Le quote
  // vengono dal galleggiamento: la crosta spessa sta alta. Forma, numero e storia dei continenti non sono scelti.
  const alt = new Float32Array(W * H), quale = new Int16Array(W * H), spinta = new Float32Array(W * H), lava = new Float32Array(W * H);
  // l'acqua che sta in superficie, come mare o come ghiaccio: quella che l'interno le dà, ma solo se lo stato che il
  // clima le assegna non è vapore. Dove bolle o sublima non c'è mare: l'acqua è nell'aria, o è già fuggita
  const acquaKg = String(P.clima?.acqua ?? '').startsWith('vapore') ? 0 : int.acquaKg || 0;
  const aPlacche = int.tettonica === 'a placche';
  // la storia degli impatti del pianeta (impatti.js, P.impatti); se il pianeta non la porta restano i ripieghi da seme.
  // Lo stato da cui parte il mantello è l'impronta termica dei suoi urti
  const storiaUrti = P.impatti ?? null;
  // (dalla storia termica: da lì la velocità delle placche; e, per la litosfera, la dilatazione e la densità del mantello che
  // la storia usa, la crosta di basalto che il mantello produce, la temperatura della superficie; poi l'acqua e la gravità)
  const mantello0 = aPlacche ? statoDelMantello(P, int) : null, Tsup = P.clima?.T ?? P.clima?.Teq, mantello = mantello0 ? { ...mantello0, alfa: STORIA.alfa, rho: STORIA.rhoSu, ...(int.crosta > 0 ? { basalto: int.crosta * P.raggioM } : {}), ...(Tsup > 0 ? { Ts: Tsup } : {}) } : null;
  const gravita = P.massaKg > 0 ? (6.674e-11 * P.massaKg) / P.raggioM ** 2 : 9.81;
  // LA STORIA TERMICA NEL TEMPO (storia.js, la tabella intera fino all'età): la tettonica la legge passo per passo (il calore, la
  // velocità, la mobilità, il fuso di ogni epoca), con le placche e senza
  const tempo = (() => { try { const tb = tabellaStoria(P, { finoA: int.eta ?? 4.5e9 }); return tb && tb.t.length > 1 ? tb : null; } catch { return null; } })();
  const opzT = { W, H, raggioM: P.raggioM, nucleo: int.nucleo, q: int.q, eta: int.eta ?? 4.5e9, acqua: true, seme, acquaM3: acquaKg / 1000, gravita, tempo, impronta: storiaUrti ? (w, h) => improntaMantello(storiaUrti, w, h) : null };
  const tt = aPlacche ? evolviTettonica({ ...opzT, placche: true, termico: mantello }) : null;
  const lid = !aPlacche && tempo ? evolviTettonica({ ...opzT, placche: false }) : null; // (senza placche: il rilievo del coperchio, tettonica.js coperchio)
  const cont = tt ? tt.cont : new Uint8Array(W * H), placche = tt ? tt.celle : 1;
  // IL RILIEVO. Con le placche è quello della tettonica (il galleggiamento della crosta, l'età dei fondali, le catene), e
  // basta: il dettaglio sotto la cella lo aggiungono le tessere, con l'ottava condizionata dal padre (tessera, sotto). Prima
  // vi si sommava un rumore di 24 sinusoidi a caso (±180 m), lo stesso su catene, cratoni e abissi.
  // SENZA PLACCHE il rilievo grande è quello del coperchio (tettonica.js coperchio, con la storia termica): la crosta di basalto
  // ispessita dove il fuso di ogni epoca si è posato (isostasia) e la topografia dinamica del mantello di oggi. Sotto la grana
  // del mantello continua con lo spettro del terreno vero: le ottave di eredita.js con l'esponente di Hurst dei continenti
  // (0,66: Gagnon e altri 2006), dalla cella di 1/4 del giro fino a quella della carta, con l'AMPIEZZA DEL RILIEVO GRANDE: la
  // prima ottava sotto quella del mantello ha lo scarto del campo del coperchio per 2^(−H) (l'autoaffinità che continua). Prima
  // l'ampiezza era 700·1,25 m a mano, attorno a −1500 m; resta solo se la storia manca.
  // (Il campo si richiude in longitudine: due campi, in x e in x − W, pesati cos e sin di πx/2W, che hanno la stessa varianza.)
  // (Il caso del rilievo è quello del LUOGO — la sorgente della superficie, dal seme —, non la chiave della memo: prima era
  // «chiave/superficie», e lo stesso pianeta chiesto con due chiavi aveva due rilievi, e due mari: 339957 m contro 340069 m)
  let rilievo = null;
  if (!tt) { const lv = Math.log2(W / 4), f = discendi({ base: () => 0, livello0: 0, livello: lv, I0: -W, J0: 0, nI: 2 * W, nJ: H, radice: caso.radice, nome: 'rilievo del pianeta', ampiezza: 1, hurst: HURST.continente, lato0: 1 });
    rilievo = new Float64Array(W * H); let s2 = 0; for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const t = (Math.PI * i) / (2 * W), v = f[j * 2 * W + i + W] * Math.cos(t) + f[j * 2 * W + i] * Math.sin(t); rilievo[j * W + i] = v; s2 += v * v; }
    let sigma = 700 * 1.25; if (lid) { let m = 0, m2 = 0, a = 0; for (let j = 0; j < H; j++) { const c = Math.sin(((j + 0.5) / H) * Math.PI); for (let i = 0; i < W; i++) { const v = lid.alt[j * W + i]; m += c * v; m2 += c * v * v; a += c; } } sigma = (Math.sqrt(Math.max(0, m2 / a - (m / a) ** 2)) * 2 ** -HURST.continente) / Math.sqrt(1 - 4 ** -HURST.continente); } // (la prima ottava σ·2^(−H), e tutte quelle sotto: Σ 4^(−H·m))
    const sc = sigma / Math.sqrt(s2 / (W * H)); for (let k = 0; k < W * H; k++) rilievo[k] *= sc; }
  for (let k = 0; k < W * H; k++) { alt[k] = tt ? tt.alt[k] : (lid ? lid.alt[k] : -1500) + rilievo[k]; if (tt) spinta[k] = tt.spinta[k]; } // (spinta: l'OROGENESI, dove oggi la crosta è compressa e i monti crescono)
  // GLI IMPATTI. Per tutta la sua vita il pianeta è colpito: moltissimo da giovane, poi sempre meno; molti
  // crateri piccoli e pochi grandi; un'atmosfera densa brucia i corpi piccoli. Quanti se ne vedono ancora
  // dipende da quanto la superficie si rinnova: un mondo fermo e senz'aria li conserva tutti (la Luna), uno
  // con tettonica, vulcani e pioggia li cancella quasi tutti (la Terra). L'erosione, dopo, fa il resto.
  const etaG = (int.eta ?? 4.5e9) / 1e9, aria = isFinite(P.clima?.pressione) ? P.clima.pressione / 1e5 : 100;
  const rinnovo = (aPlacche ? 3 : int.vulcani > 0 ? 1 : 0) + (aria > 0.01 && acquaKg > 0 ? 1.5 : 0);
  let conservati = Math.exp(-rinnovo * Math.min(4, etaG) * 0.9), crateriVisti = 0; const nCrateri = storiaUrti ? 0 : Math.round(900 * (1 - Math.exp(-etaG / 1.2)) * conservati);
  if (storiaUrti) {
    // I CRATERI VERI: quelli dei grandi urti della sua storia che nulla ha cancellato (impatti.js). Quanto è vecchia la
    // superficie, punto per punto: con le placche i fondali hanno l'età della loro crosta e i continenti quella del
    // pianeta; sotto un coperchio con vulcani la lava la rifà in media ogni 1,1 miliardi di anni (il ritmo che c'era
    // già qui: 0,9 per miliardo di anni); un mondo fermo non la rifà mai
    let eta = Infinity;
    if (tt) { eta = new Float32Array(W * H); const anni = int.eta ?? 4.5e9; for (let k = 0; k < W * H; k++) eta[k] = tt.cont[k] ? anni : 1e6 * tt.etaCrosta[k]; }
    else if (int.vulcani > 0) eta = 1e9 / 0.9;
    // l'erosione (m/anno). LEGGE EMPIRICA: dove piove, i continenti terrestri si consumano di circa 30 m ogni milione di
    // anni; con la sola aria (il vento) mille volte meno; senz'aria niente
    // (la denudazione attesa di chimica.js, ROCCE.denudazione: una fonte sola; quella vera la calcola erosione(), che però viene dopo i crateri)
    const erode = aria > 0.01 && (int.acquaKg || 0) > 0 ? ROCCE.denudazione : aria > 0.01 ? ROCCE.denudazione / 1000 : 0;
    const visibili = crateriVisibili(storiaUrti, { W, H, rinnovo: eta, erosione: erode, minimoM: (2 * Math.PI * P.raggioM) / W });
    for (const cr of visibili) { // (la stessa forma di prima: scodella, bordo rialzato, picco al centro nei crateri complessi)
      const raggio = cr.raggioCelle, ci = cr.i, cj = cr.j, prof = cr.profonditaM, R2 = Math.ceil(raggio * 1.6), allarga = 1 / Math.max(0.2, Math.cos(Math.PI / 2 - ((cj + 0.5) / H) * Math.PI)), largo = Math.min(W >> 1, Math.ceil(R2 * allarga));
      for (let dj = -R2; dj <= R2; dj++) { const y = cj + dj; if (y < 0 || y >= H) continue; for (let di = -largo; di < Math.min(largo + 1, W - largo); di++) { const d = Math.hypot(di / allarga, dj) / raggio; if (d > 1.6) continue; const k = y * W + ((ci + di + W * 4) % W); alt[k] += d < 1 ? -prof * (1 - d * d) + (cr.complesso && d < 0.18 ? prof * 0.5 : 0) : prof * 0.28 * Math.exp(-(d - 1) * 5); } }
    }
    crateriVisti = visibili.length; conservati = storiaUrti.grandi.length ? visibili.length / storiaUrti.grandi.length : 1;
  }
  for (let n = 0; n < nCrateri; n++) { // (ripiego, per un pianeta senza storia degli impatti: i crateri tirati dal seme)
    const cr = caso.serie(`cratere ${n}`), raggio = Math.min(22, 1.2 * Math.pow(1 - cr(0) * 0.985, -1 / 1.8)); if (raggio < 2.2 && aria > 0.5) continue; // (in celle; i piccoli bruciano nell'aria)
    const ci = Math.floor(cr(1) * W), cj = Math.floor(cr(2) * H), prof = 180 * raggio, R2 = Math.ceil(raggio * 1.6), allarga = 1 / Math.max(0.2, Math.cos(Math.PI / 2 - ((cj + 0.5) / H) * Math.PI));
    for (let dj = -R2; dj <= R2; dj++) { const y = cj + dj; if (y < 0 || y >= H) continue; for (let di = -Math.ceil(R2 * allarga); di <= R2 * allarga; di++) { const d = Math.hypot(di / allarga, dj) / raggio; if (d > 1.6) continue; const k = y * W + ((ci + di + W * 4) % W); alt[k] += d < 1 ? -prof * (1 - d * d) + (raggio > 9 && d < 0.18 ? prof * 0.5 : 0) : prof * 0.28 * Math.exp(-(d - 1) * 5); } }
  }
  // i vulcani: sopra i pennacchi caldi del mantello e lungo i confini che si aprono. Dove la tettonica ha il campo del
  // mantello (tt.salite) stanno sulle sue cime più alte, la più calda per prima e non due nello stesso pennacchio; se
  // le cime non bastano, o il mantello non è stato calcolato (i mondi senza placche), i restanti cadono dove capita
  const vulcani = [], cime = [];
  const campoU = (tt || lid)?.salite; if (campoU) { const u = campoU, tutte = [];
    for (let j = 1; j < H - 1; j++) for (let i = 0; i < W; i++) { const v = u[j * W + i]; if (!(v > 0)) continue; let cima = true; for (let b = -1; b <= 1 && cima; b++) for (let a = -1; a <= 1; a++) if ((a || b) && u[(j + b) * W + ((i + a + W) % W)] > v) { cima = false; break; } if (cima) tutte.push([v, i, j]); }
    tutte.sort((a, b) => b[0] - a[0] || a[2] - b[2] || a[1] - b[1]);
    for (const [v, i, j] of tutte) { const pi = sfera(i, j); if (cime.every(([a, b]) => dot(pi, sfera(a, b)) < Math.cos(0.25))) cime.push([i, j, v]); } } // (almeno un quarto di radiante tra due vulcani)
  // I VULCANI DEI PENNACCHI (con la storia): un pennacchio su ogni cima del mantello (le salite; il numero viene dalla convezione),
  // e il loro flusso dal calore: i pennacchi portano su il calore che esce dal nucleo (Davies 1988, Sleep 1990 [R]: il flusso di
  // galleggiamento è B = α·Q_cmb/c_p), quindi la loro parte del fuso della storia è Q_cmb/(Q_conv + Q_fuso), divisa tra le cime in
  // proporzione a quanto salgono; ne esce in superficie la parte che erutta (storia.js erutta, ThermInt [V]). L'EDIFICIO è un cono
  // con i fianchi di uno scudo (5°: Mauna Loa, Olympus Mons [R]). Sotto un coperchio cresce per un giro del mantello (il tempo di
  // vita di una salita: storia.js vInterno); sopra una placca che corre resta l'edificio che si fa mentre la placca gli passa
  // sopra (il resto è la catena, che qui non si disegna): V = F·2r/v, con r = h/tan 5° e v quella delle placche. L'edificio pesa e
  // affonda in isostasia locale, come tutto il rilievo del coperchio: in quota resta (1 − ρ_roccia/ρ_mantello) della pila di lave (la
  // rigidità della litosfera, che sulla Terra regge circa metà dell'edificio, manca). Senza la storia
  // resta la convenzione di prima: int.vulcani edifici da 2500 m
  const pennacchi = (() => { if (!tempo || !cime.length) return null; try { const s = storia(P, int.eta ?? 4.5e9), n = tempo.t.length - 1, vI = tempo.vInterno[n], D = tempo.struttura.D;
    const f = s.Q.cmb > 0 ? s.Q.cmb / Math.max(1, s.Q.conv + s.Q.fuso) : 0; return { flusso: (STORIA.erutta * f * s.fuso.kgAnno) / ROCCE.densita, giro: vI > 0 ? D / (vI * 3.156e7) : 0 }; } catch { return null; } })();
  // (QUANTI: quelli di storia.js, interno.vulcani, sulle cime più calde: una fonte sola del numero. Prima qui un pennacchio per
  // ogni cima del campo, e la Terra di test_fili ne disegnava 11 dove il suo interno ne contava 4)
  const nPennacchi = pennacchi ? Math.min(int.vulcani || 0, cime.length) : 0;
  if (nPennacchi > 0) { const pendio = Math.tan((5 * Math.PI) / 180), dy = (Math.PI * P.raggioM) / H; let su = 0; for (let k = 0; k < nPennacchi; k++) su += cime[k][2];
    for (const [i, j, v] of cime.slice(0, nPennacchi)) { const F = (pennacchi.flusso * v) / su, vel = tt ? tt.storia.velocita : 0; // (la placca corre sul pennacchio alla velocità delle placche: sopra la salita la cella stessa quasi non si muove, è la dorsale)
      const h = vel > 0 ? Math.sqrt((6 * F * pendio) / (Math.PI * vel)) : Math.cbrt((3 * F * pennacchi.giro * pendio * pendio) / Math.PI); if (!(h > 1)) { vulcani.push([i, j]); continue; } // (un camino senza un edificio di un metro: c'è, ma non si vede)
      const r = h / pendio, dx = Math.max(0.1 * dy, ((2 * Math.PI * P.raggioM) / W) * Math.cos(Math.PI / 2 - ((j + 0.5) / H) * Math.PI)), rj = Math.ceil(r / dy), ri = Math.min(W >> 1, Math.ceil(r / dx)); // (dx: il lato della cella lungo il parallelo)
      const V = (Math.PI * r * r * h) / 3; let posto = 0; const pezzi = [];
      for (let b = -rj; b <= rj; b++) { const jj = j + b; if (jj < 0 || jj >= H) continue; for (let a = -ri; a <= ri; a++) { const z = h * (1 - Math.hypot(a * dx, b * dy) / r); if (z > 0) { pezzi.push([jj * W + ((i + a + W) % W), z]); posto += z * dx * dy; } } }
      const sc = V / posto; // (il volume si conserva anche se il cono è più stretto di una cella: la cella del centro c'è sempre)
      for (const [q, z] of pezzi) { alt[q] += z * sc * (1 - ROCCE.densita / TETTONICA.rhoMantello); lava[q] += z * sc; } vulcani.push([i, j]); } }
  for (let k = nPennacchi; k < int.vulcani; k++) { const p = casuale(`vulcano ${k}/dove`), lat = Math.asin(p[2]), lon = Math.atan2(p[1], p[0]); const [i, j] = cime[k] || [Math.floor(((lon + Math.PI) / (2 * Math.PI)) * W) % W, Math.min(H - 1, Math.floor(((Math.PI / 2 - lat) / Math.PI) * H))]; vulcani.push([i, j]); for (let dj = -3; dj <= 3; dj++) for (let di = -3; di <= 3; di++) { const jj = j + dj, ii = (i + di + W) % W; if (jj >= 0 && jj < H) { const colata = 2500 * Math.exp(-(di * di + dj * dj) / 3); alt[jj * W + ii] += colata; lava[jj * W + ii] += colata; } } } // (l'edificio è una pila di lave: quello spessore è roccia vulcanica)
  // il mare: l'acqua del pianeta riempie i punti più bassi (si cerca il livello che contiene quel volume)
  const area = (j) => Math.cos(Math.PI / 2 - ((j + 0.5) / H) * Math.PI) * (2 * Math.PI * P.raggioM ** 2 * (Math.PI / H)) / W;
  const volumeAcqua = acquaKg / 1000;
  let lo = Infinity, hi = -Infinity, areaTutta = 0, capienza = 0;
  for (let j = 0; j < H; j++) { const A = area(j); for (let i = 0; i < W; i++) { const h = alt[j * W + i]; if (h < lo) lo = h; if (h > hi) hi = h; areaTutta += A; capienza -= h * A; } }
  capienza += hi * areaTutta; // quanta acqua sta sotto la cima più alta
  // se l'acqua è più di quanta il rilievo ne contiene, copre tutto: un GUSCIO d'acqua (oceano o ghiaccio, lo decide il
  // clima) spesso anche centinaia di chilometri, e il rilievo è il suo fondo. È il caso dei mondi ghiacciati. (Lo
  // spessore è contato come su un piano: per un guscio profondo quanto una parte del raggio è una stima.)
  let mare = -Infinity;
  if (volumeAcqua >= capienza) mare = hi + (volumeAcqua - capienza) / areaTutta;
  else if (volumeAcqua > 0) {
    for (let it = 0; it < 44; it++) { const m = (lo + hi) / 2; let v = 0; for (let j = 0; j < H; j++) { const A = area(j); for (let i = 0; i < W; i++) { const h = alt[j * W + i]; if (h < m) v += (m - h) * A; } } if (v > volumeAcqua) hi = m; else lo = m; }
    mare = lo;
  }
  // i fiumi: la pioggia scende lungo la pendenza più ripida; dove se ne raccoglie molta c'è un fiume
  const flusso = new Float32Array(W * H).fill(1), ordine = [...alt.keys()].sort((a, b) => alt[b] - alt[a]), giu = new Int32Array(W * H).fill(-1);
  for (const k of ordine) {
    const i = k % W, j = (k - i) / W; let best = -1, bh = alt[k];
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const jj = j + dj; if (jj < 0 || jj >= H || (!di && !dj)) continue; const kk = jj * W + ((i + di + W) % W); if (alt[kk] < bh) { bh = alt[kk]; best = kk; } }
    giu[k] = best; if (best >= 0 && alt[k] > mare) flusso[best] += flusso[k];
  }
  // di che cosa è fatta la superficie: crosta leggera (continenti) o basalto; quanto ferro, e se l'acqua l'ha ossidato
  const materiali = { ferro: P.composizione.ferro ?? 0.1, ghiacciato: P.tipo === 'ghiacciato', ossidato: (int.acquaKg || 0) > 0 || (isFinite(P.clima?.pressione) && P.clima.pressione > 100) };
  // i MINERALI (chimica.js): di che cosa sono fatte la crosta dei continenti e quella vulcanica, dalla
  // composizione del pianeta, dalla temperatura, dall'ossigeno e dall'acqua; il colore è il loro
  try {
    const base = { composizione: P.composizione, T: P.clima?.T ?? P.clima?.Teq ?? 280, ossidato: materiali.ossidato, acqua: acquaKg > 0 };
    materiali.continente = minerali({ ...base, continente: true }); materiali.basalto = minerali({ ...base, continente: false });
    materiali.coloreContinente = coloreRoccia(materiali.continente); materiali.coloreBasalto = coloreRoccia(materiali.basalto);
  } catch { /* senza chimica restano i colori di riserva */ }
  // (con le placche la superficie porta anche l'età della crosta degli oceani, in milioni di anni (0 sui continenti), e le
  // fosse dove affonda (0…1): servono a chi guarda le rocce — materia.js: da quanto tempo quella roccia ricorda — e al mare
  // — mare.js: le sorgenti calde stanno dove la crosta è giovane davvero)
  // LA ROCCIA E IL MOTO, per l'erosione (dalla storia delle placche, tettonica.js): copertura = metri di sedimento posato
  // nella storia e non più tolto (0 = basamento a nudo); lava = metri di lave degli edifici vulcanici; arco = la crosta
  // nuova che nasce sopra le fosse (m/anno); sollevamento = di quanto la superficie sale oggi perché la crosta si
  // ispessisce (m/anno); tetto = la quota (m) oltre la quale la crosta, più spessa di quanto la spinta regge, cede
  const tetto = tt ? new Float32Array(W * H) : null; if (tt) for (let k = 0; k < W * H; k++) tetto[k] = alt[k] + tt.regge[k];
  const out = { W, H, raggioM: P.raggioM, alt, mare, flusso, vulcani, placche, quale, cont, materiali, spinta, lava, crateri: storiaUrti ? crateriVisti : nCrateri, crateriConservati: conservati, radiceRilievo: caso.radice, // (le tessere continuano lo stesso caso)
    ...(tt ? { etaCrosta: tt.etaCrosta, fosse: tt.fosse, copertura: tt.copertura, arco: tt.arco, sollevamento: tt.sollevamento, tetto, velEst: tt.velEst, velSud: tt.velSud, spessore: tt.spessore, copre: tt.copre, calore: tt.calore, termica: tt.termica,
      tettonica: { consumata: tt.consumata, posata: tt.posata, finestra: tt.storia.finestra, velocita: tt.storia.velocita, mare: tt.mare, litosfera: tt.litosfera, salite: tt.salite, stiramento: tt.stiramento, bilancio: tt.bilancio } } : {}),
    ...(lid ? { sollevamento: lid.sollevamento, basalto: lid.basalto, tettonica: { salite: lid.salite, mare: lid.mare, rilievo: lid.rilievo, regime: lid.regime } } : {}) };
  memo.set(chiave, out); if (memo.size > 6) memo.delete(memo.keys().next().value);
  return out;
}

// i colori: profondità del mare, terre secondo quota e temperatura, ghiaccio dove fa freddo, fiumi
export function immagineSuperficie(sf, T, cl = null) {
  const { W, H, alt, mare, flusso } = sf, px = new Uint8ClampedArray(W * H * 4);
  const lg = sf.largo && sf.largo.W > W ? sf.largo : null, lgx = lg ? (lg.W - W) / 2 : 0, lgy = lg ? (lg.H - H) / 2 : 0;
  // il clima (a risoluzione più bassa) interpolato dolcemente sulla mappa
  const [ru0, rv0, ru1, rv1] = sf.rett || [0, 0, 1, 1], divOmbra = Math.max(6, 900 * Math.pow(0.36, sf.livello || 0));
  const campo = (arr, i, j) => { if (!cl) return null; const x = (ru0 + ((i + 0.5) / W) * (ru1 - ru0)) * cl.W - 0.5, y = Math.min(cl.H - 1.001, Math.max(0, (rv0 + ((j + 0.5) / H) * (rv1 - rv0)) * cl.H - 0.5)), x0 = Math.floor(x), y0 = Math.floor(y), u = x - x0, v = y - y0, a = (xx, yy) => arr[yy * cl.W + ((xx % cl.W) + cl.W) % cl.W]; return a(x0, y0) * (1 - u) * (1 - v) + a(x0 + 1, y0) * u * (1 - v) + a(x0, y0 + 1) * (1 - u) * v + a(x0 + 1, y0 + 1) * u * v; };
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, h = alt[k], lat = Math.abs(90 - ((j + 0.5) / H) * 180);
    // la temperatura del punto: quella del clima, corretta per la sua quota vera (6,5 °C ogni km): la neve sui monti
    const su = cl && h >= mare ? (Math.max(h, mare) - Math.max(campo(cl.quota, i, j), mare)) / 1000 : 0;
    const Tloc = cl ? campo(cl.media, i, j) - 6.5 * su : T - 0.45 * lat - Math.max(0, h) * 0.0065;
    const gelo = cl ? Math.min(1, Math.max(0, campo(cl.freddo, i, j), h >= mare ? ((cl.neve ?? 1) * (268 - Tloc)) / 12 : 0)) : Tloc < 265 ? 1 : 0;
    let c;
    if (h < mare || (sf.lago && sf.lago[k] > 0)) { const d = Math.min(1, ((h < mare ? mare - h : sf.lago[k] * 3)) / 5000); c = [20 + 30 * (1 - d), 60 + 60 * (1 - d), 110 + 80 * (1 - d)]; }
    else {
      // il colore è quello dei materiali: basalto scuro (crosta nuova, vulcanica), roccia chiara dei continenti,
      // il rosso del ferro ossidato dall'acqua e dall'aria, il ghiaccio sporco dei mondi ghiacciati, i sedimenti
      // pallidi dove i fiumi depositano. Nessun verde: la vegetazione ci sarà solo se la vita emergerà.
      const e = Math.min(1, (h - Math.max(0, mare)) / 4000), mat = sf.materiali || { ferro: 0.25, ossidato: true }, continente = sf.cont ? sf.cont[k] : 1;
      if (mat.coloreContinente) c = (continente ? mat.coloreContinente : mat.coloreBasalto).slice(); // il colore dei minerali veri
      else { c = mat.ghiacciato ? [172, 180, 186] : continente ? [148, 138, 124] : [84, 80, 76]; if (mat.ossidato && !mat.ghiacciato) { const r = Math.min(0.65, Math.max(0, (mat.ferro - 0.12) * 2.4)); c = [c[0] + (170 - c[0]) * r, c[1] + (98 - c[1]) * r, c[2] + (66 - c[2]) * r]; } }
      if (sf.depositato && sf.depositato[k] > 3) { const d = Math.min(0.6, sf.depositato[k] / 60); c = [c[0] + (196 - c[0]) * d, c[1] + (182 - c[1]) * d, c[2] + (150 - c[2]) * d]; } // sedimenti: pianure e delta
      c = c.map((x) => x * (0.82 + 0.3 * e)); if (flusso[k] > (sf.passiErosione ? 18 * Math.pow(4, sf.livello || 0) : 60) && gelo < 0.5) c = [60, 110, 170]; }
    // il ghiaccio copre in proporzione a quanta parte dell'anno quel punto passa sotto lo zero: bordi sfumati
    const g = Math.pow(gelo, 0.7), ice = [232, 238, 244];
    // (l'ombra viene dalla pendenza: sul bordo di una tessera il vicino si legge nel suo bordo in più, non dall'altro lato)
    const sinistra = lg ? lg.alt[(j + lgy) * lg.W + i + lgx - 1] : alt[j * W + ((i + W - 1) % W)], sopra = lg ? lg.alt[(j + lgy - 1) * lg.W + i + lgx] : alt[Math.max(0, j - 1) * W + i];
    const ombra = h >= mare ? Math.max(0.6, Math.min(1.25, 1 + (sinistra - alt[k] + sopra - alt[k]) / divOmbra)) : 1;
    px.set([(c[0] + (ice[0] - c[0]) * g) * ombra, (c[1] + (ice[1] - c[1]) * g) * ombra, (c[2] + (ice[2] - c[2]) * g) * ombra, 255], k * 4);
  }
  for (const [i, j] of sf.vulcani) px.set([200, 60, 30, 255], (j * W + i) * 4);
  return px;
}

// ---------- IL CLIMA come equilibrio di energia che evolve nel tempo (modello di Budyko-Sellers, su una
// griglia sulla sfera). In ogni punto: C·∂T/∂t = luce assorbita − luce irradiata + calore portato dai vicini.
//   · la luce: quella della stella a quella latitudine e in quella stagione (l'asse è inclinato); se il
//     pianeta è bloccato, sempre la stessa faccia al sole e mai le stagioni;
//   · irradiata: σT⁴, trattenuta dall'effetto serra della sua atmosfera;
//   · il ghiaccio riflette più luce dell'acqua e della roccia: dove fa freddo si raffredda ancora (il
//     ghiaccio si fa avanzare da sé); il mare si scalda e si raffredda lentamente, la terra in fretta;
//   · il calore scorre dal caldo al freddo, tanto più quanto più l'atmosfera è densa.
// Si parte caldo, come un pianeta appena nato, e si lascia evolvere per molti anni: quello che resta è il suo clima
// (se il ghiaccio, riflettendo, prende il sopravvento, il pianeta scivola in una glaciazione totale).
// ---------- I QUATTRO TEMPI DI UN PASSO DEL CLIMA (climaSuperficie, integra), come funzioni del modulo: le chiama il filo che
// calcola, da solo, e le stesse le chiamano i fili che lo aiutano (clima.worker.js), ognuno sulle sue righe e colonne. Z porta
// lo stato (W, H, gli array e i numeri del pianeta). Sono i conti di prima, nello stesso ordine: celle diverse, fili diversi,
// gli stessi bit.
//   A. celleClima: la luce assorbita meno quella irradiata, cella per cella (righe j0…j1); nell'ultimo anno scrive in E e I ciò
//      che va nelle somme del bilancio (le somme le fa chi coordina, nell'ordine di sempre);
//   B. righeClima: il calore portato lungo i paralleli (righe j0…j1); C. colonneClima: lungo i meridiani (colonne i0…i1);
//   D. chiudiClima: le medie dell'ultimo anno e la temperatura nuova (righe j0…j1).
export function albedoDelGiro(Z, k, t, luce) { // (riflette() di leggi.js scritta per esteso: vedi climaSuperficie)
  let suolo = Z.conSotto ? Z.sottoK[k] : NaN;
  if (suolo !== suolo) { if (Z.acquaPerGhiaccio === 0 && t === t) suolo = Z.nudoK[k]; else { const y = (t - Z.geloK[k]) / 4, ghiaccio = Z.acquaPerGhiaccio * 0.5 * (1 - (y >= 22 ? 1 : y <= -22 ? -1 : Math.tanh(y))); suolo = ghiaccio * CLIMA.albedoGhiaccio + (1 - ghiaccio) * Z.nudoK[k]; } }
  const cielo = Z.conRifl ? Z.riflK[k] : Z.nuvoleMeteo ? (Z.nuvoleMeteo[k] * riflessoNuvoleAtteso(t, luce, Z.ventoAtteso)) / coperturaDelCielo : Z.nuvole > 0 ? Z.nuvole * riflessoNuvoleAtteso(t, luce, Z.ventoAtteso) : 0;
  return suolo + cielo * (1 - suolo);
}
export function celleClima(Z, n, j0, j1) {
  const { W, H, T, nuovo, sole, soleJ, cap, fonte, sigma, serra, passiAnno, totale, lenti, dtLento, dtVero, E, I } = Z, bl = Z.bloccato, alb = Z.alb, fin = Z.albedoFinita;
  const f = (n % passiAnno) / passiAnno, ultimo = n >= totale - passiAnno, dt = n < lenti ? dtLento : dtVero;
  if (!bl) { const d = Z.eps * Math.sin(2 * Math.PI * f); for (let j = j0; j < j1; j++) soleJ[j] = luceDelGiorno(Z.S0, Math.PI / 2 - ((j + 0.5) / H) * Math.PI, d); }
  for (let j = j0; j < j1; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, t = T[k], arriva = bl ? sole[k] : soleJ[j], entra = (arriva === 0 && fin && t === t ? 0 : arriva * (1 - (alb ? alb(k, t, arriva) : albedoDelGiro(Z, k, t, arriva)))) + (fonte ? fonte[k] : 0), esce = (sigma * t ** 4) / serra, molla = (4 * esce) / t;
    const dT = frenaPasso(t, (dt * (entra - esce)) / (cap[k] + dt * molla));
    nuovo[k] = Math.max(3, t + dT);
    if (ultimo) { E[k] = entra; I[k] = esce + molla * dT; }
  }
}
export function righeClima(Z, F, j0, j1, x) {
  const { W, nuovo } = Z, sR = F.sR, cR = F.cR, qR = F.qR, zR = F.zR;
  for (let j = j0; j < j1; j++) {
    const o = j * W;
    x[0] = nuovo[o] / qR[o]; for (let i = 1; i < W; i++) x[i] = (nuovo[o + i] - sR[o + i] * x[i - 1]) / qR[o + i]; for (let i = W - 2; i >= 0; i--) x[i] -= cR[o + i] * x[i + 1];
    const g = F.g[j], fatt = (x[0] + (F.be[j] * x[W - 1]) / g) / F.den[j]; for (let i = 0; i < W; i++) nuovo[o + i] = x[i] - fatt * zR[o + i];
  }
}
export function colonneClima(Z, F, i0, i1, x) {
  const { W, H, nuovo } = Z, sC = F.sC, cC = F.cC, qC = F.qC;
  for (let i = i0; i < i1; i++) {
    const o = i * H;
    x[0] = nuovo[i] / qC[o]; for (let j = 1; j < H; j++) x[j] = (nuovo[j * W + i] - sC[o + j] * x[j - 1]) / qC[o + j]; for (let j = H - 2; j >= 0; j--) x[j] -= cC[o + j] * x[j + 1];
    for (let j = 0; j < H; j++) nuovo[j * W + i] = x[j];
  }
}
export function chiudiClima(Z, n, j0, j1) {
  const { W, T, nuovo, media, freddo, stagioni, terra, passiAnno, totale, acquaPerGhiaccio } = Z, k0 = j0 * W, k1 = j1 * W;
  if (n >= totale - passiAnno) { const quarto = stagioni ? stagioni[Math.min(3, Math.floor((4 * (n % passiAnno)) / passiAnno))] : null; for (let k = k0; k < k1; k++) { media[k] += nuovo[k] / passiAnno; if (quarto) quarto[k] += (4 * nuovo[k]) / passiAnno; if (nuovo[k] < (terra[k] ? 268 : 271)) freddo[k] += acquaPerGhiaccio / passiAnno; } }
  for (let k = k0; k < k1; k++) T[k] = nuovo[k];
}
// la barriera tra i fili del clima (un contatore e una generazione in un Int32Array condiviso: chi arriva ultimo apre)
export function barrieraClima(B, P) { const g = Atomics.load(B, 1); if (Atomics.add(B, 0, 1) === P - 1) { Atomics.store(B, 0, 0); Atomics.add(B, 1, 1); Atomics.notify(B, 1); return; }
  for (let s = 0; s < 400 && Atomics.load(B, 1) === g; s++); // (prima un poco di attesa attiva: di solito gli altri arrivano in pochi microsecondi)
  let attese = 0; while (Atomics.load(B, 1) === g) { Atomics.wait(B, 1, g, 20); if (++attese > 3000) throw new Error('un filo del clima non risponde da un minuto'); } }
// (il passo n per un filo: le sue righe j0…j1 e le sue colonne i0…i1; tra B e C e tra C e D si aspettano tutti; tra C e D chi
// coordina somma il bilancio, se è l'ultimo anno)
export function passoClimaFilo(Z, Fs, n, j0, j1, i0, i1, x, B, P, somma) {
  celleClima(Z, n, j0, j1); const F = Fs[n < Z.lenti ? 0 : 1]; righeClima(Z, F, j0, j1, x); barrieraClima(B, P);
  colonneClima(Z, F, i0, i1, x); if (somma) somma(n, Z); barrieraClima(B, P);
  chiudiClima(Z, n, j0, j1);
}
// I FILI CHE AIUTANO IL CLIMA (clima.worker.js): li accende chi può aspettare (un filo, con la memoria condivisa: superficie.worker.js),
// e qui si registrano; senza (node, la pagina, un navigatore senza isolamento delle origini) il clima si fa in un filo solo
let aiutoClima = null;
export function aiutiDelClima(a) { aiutoClima = a; }
const memoClima = new Map();
// L'ARIA CHE CIRCOLA (meteo.js). Il clima qui sopra tratta il calore portato dall'aria con un coefficiente (quello equivalente
// alla legge dell'aria di leggi.js, che clima() ha calcolato per questo pianeta) e le nuvole con i loro valori attesi;
// quando il pianeta ha un giorno e un'aria, si fa un secondo giro: dal primo clima si calcolano i venti, il vapore, le
// nuvole e la pioggia veri (meteo.js), e con quelli si rifà il bilancio (meteo: nuvole punto per punto, e quanto calore
// l'aria porta davvero). La pioggia che l'erosione usa viene da lì (cl.meteo).
// FINCHÉ NON SI RISPONDONO PIÙ. Clima e aria si cercano a giri: dal clima i venti e le nuvole, dai venti e dalle nuvole
// il clima; ci si ferma quando la temperatura media cambia meno di mezzo grado da un giro all'altro (al più GIRI_ARIA
// giri d'aria: ognuno costa una circolazione).
// IL MARE CHE TORNA AL CLIMA (opzione «mare»: lo stato di mare.js, che è stato calcolato su un clima): le correnti
// portano calore (mare.caloreDalMare, W/m² sulla griglia del clima) e la superficie del mare rimanda la luce che dice
// mare.albedo (acqua aperta, ghiaccio marino). Il mare non crea energia: del calore si usa solo ciò che sposta (tolta
// la media sul pianeta). climaConIlMare() rifà il giro con quei due termini.
const GIRI_ARIA = 3;
export function climaSuperficie(chiave, P, sf, { W = 64, H = 32, anni = 14, passiAnno = 240, meteo = null, aria = true, mare = null, Dprima = null } = {}) {
  if (chiave != null && memoClima.has(chiave)) return memoClima.get(chiave);
  if (!meteo && aria && P.giorno > 0 && isFinite(P.clima.pressione) && P.clima.pressione > 1) {
    const primo = climaSuperficie(`${chiave}|primo giro`, P, sf, { W, H, anni, passiAnno, aria: false });
    let cl = primo; const storia = [primo.Tglobale];
    for (let giro = 1; giro <= GIRI_ARIA; giro++) {
      let m = null; try { m = meteoPianeta(P, sf, cl); } catch { m = null; }
      if (!m || m.regime !== 'aria') break;
      const prima = cl, dopo = climaSuperficie(null, P, sf, { W, H, anni, passiAnno, meteo: m, Dprima: cl.D }); dopo.meteo = m; cl = dopo; storia.push(cl.Tglobale);
      if (prima.meteo && Math.abs(cl.Tglobale - prima.Tglobale) < 0.5) break;
    }
    cl.giri = storia.length; cl.storiaGiri = storia; memoClima.set(chiave, cl); return cl;
  }
  // (la serra, il calore portato e la temperatura di partenza sono quelli di clima(), leggi.js: è la stessa legge, risolta
  // lì per fasce e qui sulla mappa; se il pianeta non li porta con sé, valgono le stesse formule di riserva)
  const sigma = 5.67e-8, S0 = P.Lw / (4 * Math.PI * P.aM * P.aM), tau = P.clima.tau ?? serraDaPressione(P.clima.pressione);
  const kx = sf.W / W, ky = sf.H / H;
  const terra = new Uint8Array(W * H), quota = new Float32Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { let h = 0; for (let b = 0; b < ky; b++) for (let a = 0; a < kx; a++) h += sf.alt[(j * ky + b) * sf.W + i * kx + a]; h /= kx * ky; quota[j * W + i] = h; terra[j * W + i] = h >= sf.mare ? 1 : 0; }
  // IL CALORE PORTATO. Senza i venti è quello ATTESO: il coefficiente equivalente alla legge dell'aria di leggi.js, che
  // clima() ha già calcolato per questo pianeta (P.clima.D, W/m²/K; con la stessa definizione di meteo.diffusivita). Se il
  // pianeta non lo porta con sé (un mondo costruito a mano, con la sola pressione) si chiede alla stessa legge, con ciò
  // che si sa: il giorno, il raggio, la gravità, il mare di questa mappa. Con i venti (dal secondo giro) è la media tra
  // quello del giro prima e quello che i venti hanno portato davvero (meteo.diffusivita): i due si rispondono, e a metà
  // strada non rimbalzano
  const attesoDallaLegge = () => { let m = 0; for (let k = 0; k < W * H; k++) m += 1 - terra[k]; m /= W * H;
    return bilancioPerFasce({ S0, anno: P.anno, obliquita: P.obliquita ?? 0, bloccato: !!P.bloccato, mare: m, pressione: P.clima.pressione, tau, giorno: P.giorno ?? null, raggioM: P.raggioM, gravita: (COSTANTI_LEGGI.G * P.massaKg) / (P.raggioM * P.raggioM), Tavvio: P.clima.Tavvio ?? 288 }); };
  const riserva = (Dprima == null && P.clima.D == null) || (!meteo && P.clima.vento == null) ? attesoDallaLegge() : null;
  const Dattesa = Dprima ?? P.clima.D ?? riserva.D, D = meteo ? (Dattesa + Math.max(0, meteo.diffusivita)) / 2 : Dattesa, ventoAtteso = P.clima.vento ?? riserva?.vento;
  const lat = (j) => Math.PI / 2 - ((j + 0.5) / H) * Math.PI, dphi = Math.PI / H, dlam = (2 * Math.PI) / W;
  // un pianeta nasce caldo (gli urti che l'hanno formato) e si raffredda: si parte da lì, non dal freddo. Per un mondo
  // lontano dalla sua stella «caldo» vuol dire un quarto sopra la temperatura a cui lo porterebbe la sola luce (Tfine:
  // quanto basta per essere sopra qualunque equilibrio, anche senza ghiaccio né nuvole), non 310 K
  const Tfine = P.clima.Tavvio ? Math.max(3, P.clima.Tavvio / 1.25) : Math.max(30, P.clima.Teq * Math.pow(1 + 0.75 * tau, 0.25));
  const T = new Float32Array(W * H).fill(P.clima.Tavvio ?? Math.max(P.clima.Teq, Math.min(310, 1.25 * Tfine))), nuovo = new Float32Array(W * H), freddo = new Float32Array(W * H), media = new Float32Array(W * H);
  const C = (k) => (terra[k] ? CLIMA.capacitaTerra : CLIMA.capacitaMare), anno = P.anno, eps = (P.obliquita * Math.PI) / 180;
  // il ghiaccio ha bisogno di acqua: su un pianeta senza mari al freddo resta solo un po' di brina;
  // dove c'è acqua che evapora e un'atmosfera che la tiene si formano le nuvole, che riflettono la luce
  let mareFraz = 0; for (let k = 0; k < W * H; k++) mareFraz += 1 - terra[k]; mareFraz /= W * H;
  // senza acqua niente ghiaccio; piove solo se c'è acqua che evapora e un'aria che la porta. Quanta luce torna indietro
  // (suolo, ghiaccio, nuvole) lo dice riflette() di leggi.js, con le nuvole vere di meteo.js quando ci sono
  const acquaPerGhiaccio = acquaPerIlGhiaccio(mareFraz), piove = meteo ? meteo.bilancio.piovuta > 1 : mareFraz > 0.005 && isFinite(P.clima.pressione) && P.clima.pressione > 100, nuvole = nuvoleAttese(mareFraz, P.clima.pressione);
  // il mare di mare.js, se c'è: il calore che sposta (W/m², a media nulla) e quanto rimanda la sua superficie (sulla
  // griglia del mare, che può essere più fine: qui la media delle celle bagnate)
  let fonte = null, albedoMare = null;
  if (mare && mare.caloreDalMare && mare.caloreDalMare.length === W * H) {
    fonte = new Float32Array(W * H); let s = 0, a = 0; for (let j = 0; j < H; j++) { const w = Math.cos(lat(j)); for (let i = 0; i < W; i++) { s += w * mare.caloreDalMare[j * W + i]; a += w; } }
    for (let k = 0; k < W * H; k++) fonte[k] = mare.caloreDalMare[k] - s / a;
    const r = mare.albedo ? Math.round(Math.sqrt(mare.albedo.length / (W * H))) : 0;
    if (r >= 1 && mare.albedo.length === W * H * r * r) { albedoMare = new Float32Array(W * H).fill(-1); for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { let x = 0, n = 0; for (let b = 0; b < r; b++) for (let c = 0; c < r; c++) { const v = mare.albedo[(j * r + b) * W * r + i * r + c]; if (v > 0) { x += v; n++; } } if (n && !terra[j * W + i]) albedoMare[j * W + i] = x / n; } }
  }
  // (le nuvole di meteo.js: quanta luce rimandano davvero, dall'acqua che tengono; senza meteo, quelle attese dalla stessa
  // legge, con il vento al suolo atteso per questo pianeta — clima().vento, dalla legge del trasporto)
  const albedo = (k, t, luce) => riflette(t, 1 - terra[k], acquaPerGhiaccio, nuvole, meteo ? (meteo.riflessoNuvole ? meteo.riflessoNuvole[k] : meteo.nuvole[k] * riflessoNuvoleAtteso(t, luce, ventoAtteso) / coperturaDelCielo) : null, albedoMare && albedoMare[k] >= 0 ? albedoMare[k] : null, luce, ventoAtteso);
  // (LA STESSA albedo, scritta per il giro lungo dell'integrazione: riflette() di leggi.js con gli stessi conti nello stesso
  // ordine, gli stessi bit. Cambia solo ciò che non entra nel risultato: il ghiaccio non si calcola dove la superficie del mare
  // di mare.js lo dice già, né dove non c'è acqua per farlo (vale 0 esatto); le nuvole di meteo.js si leggono una volta;
  // oltre 88 K dal gelo tanh vale ±1 esatto — fdlibm, che V8 usa, lo dà da |x| ≥ 22 — e non la si chiama)
  const N = W * H, cap = new Float64Array(N), sottoK = new Float64Array(N).fill(NaN), riflK = new Float64Array(N).fill(NaN), geloK = new Float64Array(N), nudoK = new Float64Array(N);
  for (let k = 0; k < N; k++) { cap[k] = C(k); const m = 1 - terra[k]; geloK[k] = m ? CLIMA.geloMare : CLIMA.geloTerra; nudoK[k] = m ? CLIMA.albedoMare : CLIMA.albedoTerra;
    if (albedoMare && albedoMare[k] >= 0) sottoK[k] = albedoMare[k]; if (meteo && meteo.riflessoNuvole) riflK[k] = meteo.riflessoNuvole[k]; }
  const nuvoleMeteo = meteo && !meteo.riflessoNuvole ? meteo.nuvole : null, conRifl = !!(meteo && meteo.riflessoNuvole && meteo.riflessoNuvole.length === N), conSotto = !!albedoMare;
  const albedoGiro = (conRifl || !meteo || (nuvoleMeteo && nuvoleMeteo.length === N)) ? null : albedo; // (null: albedoDelGiro, qui sopra)
  // dove non arriva luce (la notte polare; la faccia buia di un pianeta bloccato) la luce assorbita è 0·(1 − albedo) = 0 qualunque
  // sia l'albedo, se è un numero: lì non la si calcola. Lo è se lo sono le nuvole di meteo.js e il vento atteso (si guarda qui)
  // (e se il vento atteso non è negativo: con la luce a 0 la pioggia attesa è allora min(≥ 0, 0) = 0, e la nube un numero)
  let albedoFinita = albedoGiro !== albedo && Number.isFinite(ventoAtteso ?? NUVOLE.ventoAtteso) && (ventoAtteso ?? NUVOLE.ventoAtteso) >= 0 && Number.isFinite(nuvole);
  for (let k = 0; k < N && albedoFinita; k++) if ((conRifl && !Number.isFinite(riflK[k])) || (nuvoleMeteo && !Number.isFinite(nuvoleMeteo[k])) || !(sottoK[k] !== sottoK[k] || Number.isFinite(sottoK[k]))) albedoFinita = false;
  const luce = (j, i, f) => {
    const ph = lat(j);
    if (P.bloccato) { const lon = ((i + 0.5) / W) * 2 * Math.PI - Math.PI, cz = Math.cos(ph) * Math.cos(lon); return S0 * Math.max(0, cz); }
    return luceDelGiorno(S0, ph, eps * Math.sin(2 * Math.PI * f));
  };
  // IL TEMPO. Il passo è un 240-esimo d'anno (le stagioni si vedono). Perché l'energia si conservi con qualunque
  // passo, anche lungo rispetto al tempo in cui la terraferma si scalda:
  //  · la luce irradiata è linearizzata attorno alla temperatura di adesso (σT⁴ + 4σT³·ΔT): la cella va verso il
  //    suo equilibrio senza scavalcarlo;
  //  · il calore portato dai vicini è calcolato in modo implicito (con le temperature nuove), prima lungo i
  //    paralleli e poi lungo i meridiani: ciò che esce da una cella entra nella vicina, niente si crea.
  // Quanto dura: abbastanza perché il mare dimentichi la temperatura di partenza (otto volte il suo tempo di risposta
  // C/(4σT³); dodici se è bloccato: il ghiaccio della faccia buia avanza piano). Se quattordici anni non bastano (anni corti, o mondi freddi coperti d'acqua), nei primi dieci il passo
  // si allunga quanto serve (le stagioni scorrono al rallentatore: la media è quella giusta) e gli ultimi quattro
  // sono anni veri; un pianeta bloccato non ha stagioni, e lì il passo è lungo sempre.
  const serra = 1 + 0.75 * tau, memoria = ((mareFraz > 0 ? CLIMA.capacitaMare : CLIMA.capacitaTerra) * serra) / (4 * sigma * Tfine ** 3), veri = Math.min(4, anni - 1);
  const totale = anni * passiAnno, lenti = P.bloccato ? totale : (anni - veri) * passiAnno, dtVero = anno / passiAnno;
  const dtLento = dtVero * Math.max(1, P.bloccato ? (12 * memoria) / (anni * anno) : (8 * memoria - veri * anno) / ((anni - veri) * anno));
  const cosLat = new Float64Array(H), cosN = new Float64Array(H), cosS = new Float64Array(H), sole = new Float64Array(W * H), soleJ = new Float64Array(H);
  for (let j = 0; j < H; j++) { cosLat[j] = Math.cos(lat(j)); cosN[j] = Math.max(0, Math.cos(lat(j) + dphi / 2)); cosS[j] = Math.max(0, Math.cos(lat(j) - dphi / 2)); }
  if (P.bloccato) for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) sole[j * W + i] = luce(j, i, 0);
  // un sistema a tre diagonali (sotto·x[i−1] + diag·x[i] + sopra·x[i+1] = noto), anche chiuso ad anello
  const M = Math.max(W, H), sotto = new Float64Array(M), diag = new Float64Array(M), sopra = new Float64Array(M), x = new Float64Array(M), z = new Float64Array(M), u = new Float64Array(M), cp = new Float64Array(M);
  const risolvi = (d, r, m, out) => { cp[0] = sopra[0] / d[0]; out[0] = r[0] / d[0]; for (let i = 1; i < m; i++) { const q = d[i] - sotto[i] * cp[i - 1]; cp[i] = sopra[i] / q; out[i] = (r[i] - sotto[i] * out[i - 1]) / q; } for (let i = m - 2; i >= 0; i--) out[i] -= cp[i] * out[i + 1]; };
  // I DUE SISTEMI A TRE DIAGONALI non dipendono dalle temperature ma solo dal passo (lento o vero), dalle capacità e da D: la
  // loro eliminazione (i rapporti cp e i pivot q di risolvi) e la correzione dell'anello (formula di Sherman-Morrison: l'anello
  // è una catena più una correzione, z e il suo denominatore) si fanno una volta per passo, con gli stessi conti nello stesso
  // ordine di prima; a ogni passo resta solo la sostituzione con il termine noto. Gli stessi bit, un terzo del lavoro
  const fattori = new Map();
  const fattoriDi = (dt) => { let F = fattori.get(dt); if (F) return F;
    F = { sR: new Float64Array(N), cR: new Float64Array(N), qR: new Float64Array(N), zR: new Float64Array(N), g: new Float64Array(H), be: new Float64Array(H), den: new Float64Array(H), sC: new Float64Array(N), cC: new Float64Array(N), qC: new Float64Array(N) };
    const fattorizza = (m, sOut, cOut, qOut, o) => { cp[0] = sopra[0] / diag[0]; qOut[o] = diag[0]; for (let i = 1; i < m; i++) { const q = diag[i] - sotto[i] * cp[i - 1]; cp[i] = sopra[i] / q; qOut[o + i] = q; sOut[o + i] = sotto[i]; } for (let i = 0; i < m; i++) cOut[o + i] = cp[i]; };
    for (let j = 0; j < H; j++) {
      const q = (dt * D) / (cosLat[j] * cosLat[j] * dlam * dlam);
      for (let i = 0; i < W; i++) { const a = q / C(j * W + i); sotto[i] = -a; sopra[i] = -a; diag[i] = 1 + 2 * a; }
      const g = -diag[0], al = sopra[W - 1], be = sotto[0]; diag[0] -= g; diag[W - 1] -= (al * be) / g;
      fattorizza(W, F.sR, F.cR, F.qR, j * W); u.fill(0, 0, W); u[0] = g; u[W - 1] = al; risolvi(diag, u, W, z);
      for (let i = 0; i < W; i++) F.zR[j * W + i] = z[i]; F.g[j] = g; F.be[j] = be; F.den[j] = 1 + z[0] + (be * z[W - 1]) / g;
    }
    for (let i = 0; i < W; i++) {
      for (let j = 0; j < H; j++) { const q = (dt * D) / (C(j * W + i) * cosLat[j] * dphi * dphi), a = j > 0 ? q * cosN[j] : 0, b = j < H - 1 ? q * cosS[j] : 0; sotto[j] = -a; sopra[j] = -b; diag[j] = 1 + a + b; }
      fattorizza(H, F.sC, F.cC, F.qC, i * H);
    }
    fattori.set(dt, F); return F; };
  let assorbita = 0, irradiata = 0, pesi = 0, riprese = 0; const stagioni = P.bloccato ? null : [0, 1, 2, 3].map(() => new Float32Array(W * H));
  // (lo stato del passo per i quattro tempi: celleClima, righeClima, colonneClima, chiudiClima)
  const Z = { W, H, T, nuovo, media, freddo, stagioni, terra, sole, soleJ, cap, fonte, sottoK, riflK, geloK, nudoK, nuvoleMeteo, conRifl, conSotto, acquaPerGhiaccio, nuvole, ventoAtteso, albedoFinita, alb: albedoGiro,
    sigma, serra, S0, eps, bloccato: !!P.bloccato, passiAnno, totale, lenti, dtLento, dtVero, E: new Float64Array(W * H), I: new Float64Array(W * H) };
  const bilancioDelPasso = (n, Zx = Z) => { if (n < totale - passiAnno) return; const { E, I } = Zx; for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const k = j * W + i; assorbita += cosLat[j] * E[k]; irradiata += cosLat[j] * I[k]; pesi += cosLat[j]; } };
  const integra = () => {
  assorbita = 0; irradiata = 0; pesi = 0; media.fill(0); freddo.fill(0); if (stagioni) for (const q of stagioni) q.fill(0);
  if (aiutoClima && !albedoGiro && aiutoClima(Z, [fattoriDi(dtLento), fattoriDi(dtVero)], bilancioDelPasso)) return; // (in più fili: gli stessi conti)
  for (let n = 0; n < totale; n++) {
    const dt = n < lenti ? dtLento : dtVero;
    // 1. in ogni cella: la luce assorbita meno quella irradiata
    celleClima(Z, n, 0, H); bilancioDelPasso(n);
    // 2. il calore portato dai vicini: lungo i paralleli (un anello)… e lungo i meridiani (da un polo all'altro: attraverso i poli non passa niente)
    const F = fattoriDi(dt); righeClima(Z, F, 0, H, x); colonneClima(Z, F, 0, W, x);
    chiudiClima(Z, n, 0, H);
  } };
  // A REGIME il pianeta irradia quanta luce assorbe. Se alla fine il bilancio non chiude entro l'1% il clima sta ancora
  // cambiando (un mare che sta gelando sotto nuvole più fitte di quelle attese ci mette più delle otto «memorie» contate
  // sulla temperatura di partenza, perché al freddo irradia meno e risponde più piano): si riprende da dove si è arrivati,
  // con lo stesso passo, finché chiude (al più quattro volte; quante ne sono servite resta scritto in «riprese»)
  integra();
  while (riprese < 4 && assorbita > 0 && Math.abs(irradiata / assorbita - 1) > 0.01) { riprese++; integra(); }
  // UN PIANETA BLOCCATO CHE NON PORTA CALORE (D = 0, nessun mare che lo sposti): niente stagioni e niente vicini, ogni cella
  // è al suo bilancio fermo (minimo 3 K), come nel clima a fasce (leggi.js bilancioPerFasce). L'integrazione da caldo
  // lasciava la faccia buia alla temperatura a cui si era raffreddata quando finiva: si porta ogni cella al bilancio con lo
  // stesso passo a tempo lungo quanto si vuole (Newton), partendo da dove l'integrazione è arrivata
  if (P.bloccato && !(D > 0) && !fonte) {
    assorbita = 0; irradiata = 0; pesi = 0; freddo.fill(0);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const k = j * W + i; let t = T[k];
      for (let n = 0; n < 200; n++) { const entra = sole[k] * (1 - albedo(k, t, sole[k])), esce = (sigma * t ** 4) / serra, nt = Math.max(3, t + frenaPasso(t, ((entra - esce) * t) / (4 * esce))); if (Math.abs(nt - t) < 1e-6 * t) { t = nt; break; } t = nt; }
      const entra = sole[k] * (1 - albedo(k, t, sole[k]));
      T[k] = t; media[k] = t; assorbita += cosLat[j] * entra; irradiata += cosLat[j] * (t > 3 ? (sigma * t ** 4) / serra : entra); pesi += cosLat[j]; if (t < (terra[k] ? 268 : 271)) freddo[k] = acquaPerGhiaccio;
    }
  }
  // in montagna fa più freddo (6,5 °C ogni chilometro sopra il mare)
  const quotaMedia = quota; // la quota media della cella del clima: la neve in quota si calcola punto per punto
  let gm = 0, gg = 0, a = 0; for (let j = 0; j < H; j++) { const w = Math.cos(lat(j)); for (let i = 0; i < W; i++) { gm += media[j * W + i] * w; gg += freddo[j * W + i] * w; a += w; } }
  const out = { W, H, media, freddo, quota: quotaMedia, mare: sf.mare, Tglobale: gm / a, ghiaccio: gg / a, piove, neve: acquaPerGhiaccio, D,
    // il bilancio dell'ultimo anno, in media sul pianeta (W/m²): la luce assorbita e quella irradiata; a regime sono uguali
    bilancio: { assorbita: assorbita / pesi, irradiata: irradiata / pesi, arriva: S0 / 4 }, riprese,
    // la temperatura media dei quattro quarti dell'ultimo anno (le stagioni: per meteo.js); un pianeta bloccato non ne ha
    stagioni,
    // quanto in fretta i pendii si consumano: con la pioggia molto, con il solo vento poco, senz'aria quasi niente
    sgretola: piove ? 0.05 : isFinite(P.clima.pressione) && P.clima.pressione > 1000 ? 0.015 : 0.002 };
  if (chiave != null) { memoClima.set(chiave, out); if (memoClima.size > 6) memoClima.delete(memoClima.keys().next().value); }
  return out;
}
// il clima rifatto con il mare che c'è (mare.js: mare(P, se, cl, …)): lo stesso bilancio, con i venti e le nuvole di cl,
// più il calore che le correnti spostano e l'albedo della superficie del mare. → un clima come cl (con cl.meteo), e in
// più conIlMare: { caloreMedioTolto (W/m²: ciò che mare.js aveva in più o in meno in media, e che qui non entra),
// caloreSpostato (W/m², medio in valore assoluto), dT (K: di quanto cambia la temperatura media) }
export function climaConIlMare(chiave, P, sf, cl, mare) {
  if (!cl || !mare || !mare.caloreDalMare) return cl;
  const k = `${chiave}|con il mare`; if (memoClima.has(k)) return memoClima.get(k);
  const out = climaSuperficie(null, P, sf, { W: cl.W, H: cl.H, meteo: cl.meteo || null, aria: false, mare, Dprima: cl.meteo ? 2 * cl.D - Math.max(0, cl.meteo.diffusivita) : cl.D });
  let s = 0, a = 0, w = 0; for (let j = 0; j < cl.H; j++) { const c = Math.cos(Math.PI / 2 - ((j + 0.5) / cl.H) * Math.PI); for (let i = 0; i < cl.W; i++) { s += c * mare.caloreDalMare[j * cl.W + i]; w += c; } }
  for (let j = 0; j < cl.H; j++) { const c = Math.cos(Math.PI / 2 - ((j + 0.5) / cl.H) * Math.PI); for (let i = 0; i < cl.W; i++) a += c * Math.abs(mare.caloreDalMare[j * cl.W + i] - s / w); }
  if (cl.meteo) out.meteo = cl.meteo; out.giri = cl.giri; out.storiaGiri = cl.storiaGiri;
  out.conIlMare = { caloreMedioTolto: s / w, caloreSpostato: a / w, dT: out.Tglobale - cl.Tglobale };
  memoClima.set(k, out); if (memoClima.size > 6) memoClima.delete(memoClima.keys().next().value);
  return out;
}

// ---------- L'EROSIONE: il paesaggio che evolve, in metri e in anni (il modello dei geomorfologi, come in FastScape).
// A ogni passo di tempo: piove dove il clima lo dice; l'acqua scende lungo la pendenza più ripida; dove resta
// intrappolata in una conca la riempie fino a traboccare (un LAGO); poi
//  · I FIUMI SCAVANO: E = K·A^m·S^n (m/anno), con m = 0,4 e n = 1, e K MISURATO per classe di roccia (Stock e Montgomery
//    1999, J. Geophys. Res. 104, 4983: graniti e rocce metamorfiche 10⁻⁷–10⁻⁶ m^0,2/anno; vulcaniche 10⁻⁵–10⁻⁴; argilliti e
//    sedimenti 10⁻⁴–10⁻²: di ogni classe qui la media geometrica). A è l'area drenata: qui la portata vera (pioggia × area,
//    m³/anno) divisa per un metro di pioggia l'anno, così dove piove il doppio il fiume vale un bacino doppio.
//    Il passo è implicito (Braun e Willett 2013): stabile con qualunque passo di tempo.
//  · LA ROCCIA È QUELLA CHE LA STORIA HA LASCIATO, a strati dall'alto. Il SEDIMENTO SCIOLTO: ciò che si posa durante
//    questa erosione (laghi, coste, conoidi): la classe delle argilliti, K = 10⁻³. La COPERTURA sedimentaria (sf.copertura,
//    metri: ciò che nella storia delle placche fiumi e pendii hanno posato e nessuno ha più tolto, fino alla profondità
//    dove il sedimento sepolto diventa roccia metamorfica: tettonica.js): è stata sepolta, è roccia; la sola classe di
//    roccia clastica litificata che Stock e Montgomery misurano è quella di mezzo (le loro «volcaniclastic rocks», 10⁻⁵–
//    10⁻⁴): K = 3,2·10⁻⁵, cento volte il granito. Le LAVE (sf.lava: gli edifici dei vulcani; sf.arco: la crosta nuova
//    degli archi sopra le fosse, che esce un po' per passo per tutta la durata, contata tutta come vulcanica): la stessa classe. Poi il BASAMENTO: granito e
//    metamorfiche sotto i continenti, vulcanica (basalto) dove la crosta è quella dei fondali. Il fiume scava lo strato
//    che ha sotto, e quando lo ha consumato passa a quello dopo dentro lo stesso passo. Nessuna quota di terre
//    «sedimentarie» è data: quanta copertura resta è un'uscita (terreCoperte).
//  · I PENDII SCIVOLANO: diffusione, ∂h/∂t = K_d·∇²h con K_d = 0,01 m²/anno (il valore d'uso di FastScape; le misure vanno
//    da 10⁻³ a 10⁻²). Il LETTO di un fiume non è un pendio: una cella che riceve acqua da altre non viene spianata; ciò
//    che i versanti le portano entra nel carico del fiume.
//  · IL SEDIMENTO scende col fiume. È di due specie. Fin dove il SUOLO riesce a formarsi (al più P₀ = 0,31 mm/anno: Heimsath
//    e altri 1997, misure da 0,05 a 2 mm/anno, media geometrica) la roccia esce dai versanti disfatta in grani, qui
//    contati tutti come CARICO FINE: l'acqua lo porta sospeso senza un tetto (limo e argilla hanno numero di Rouse sotto
//    0,8; la sabbia grossa no: manca) e lo posa solo dove si ferma, nei laghi e sulle coste (i delta). Ciò che è scavato
//    più in fretta di P₀ viene da roccia nuda, a BLOCCHI: ghiaia, che il fiume porta sul fondo al più quanto la sua
//    capacità, Q_s = 0,041·I·Q·S^(7/6), con I = 0,01 la parte del tempo in piena (Wickert e Schildgen 2019), e che per
//    strada si consuma in carico fine: dello 0,42% al km il granito, del 2% le vulcaniche e la copertura litificata, del
//    20% il sedimento sciolto (Attal e Lavé 2009, perdita di massa: granito 0,3–0,6% al km, classi tipo 0,2 / 2 / 20). Se
//    la ghiaia supera la capacità, il fiume non scava il di più (lo lascia dov'è, dal fondo dello scavo), e quella che
//    arriva da monte in più si posa lì: una conoide. (Prima la capacità della ghiaia era il tetto di TUTTO il carico: da
//    sola teneva la denudazione 25 volte sotto, misurato togliendola. E una conca era giudicata sulla quota già scavata:
//    ogni cella incisa si riprendeva metà dello scavo, e il 98% della roccia tolta «si posava» lungo i fiumi.)
//    Il conto torna: eroso = depositato + portato al mare.
//  · LA CROSTA RISPONDE: tolto un carico, risale di ρ_crosta/ρ_mantello = 2800/3300 dello spessore tolto (isostasia), sulla
//    media della regione (la crosta è rigida: flette su ~200 km). E LE PLACCHE LA SOLLEVANO: sf.sollevamento (m/anno, da
//    tettonica.js: quanto la crosta si ispessisce oggi perché è stretta, o si assottiglia perché è stirata, per quanto
//    sporge ciò che galleggia), finché la quota non passa sf.tetto (oltre, la crosta cede di lato invece di alzarsi). Solo
//    le terre: il fondo del mare resta quello della tettonica, salvo dove si posa sedimento: lì il fondo cede sotto il
//    peso di (ρ_sedimento − ρ_acqua)/(ρ_mantello − ρ_acqua) = 0,74 dello spessore posato.
//  · L'ACQUA SI CONSERVA: il volume del mare resta quello di partenza; il sedimento che riempie le coste sposta acqua, e
//    il livello del mare (out.mare) sale di quanto serve. (Sulle Terre di prova sale di 23–27 m, e annega le piane costiere
//    che i fiumi tengono al loro livello di base: 4 punti di terre emerse su 24, tutte da 0,1 a 25 m sotto il mare nuovo;
//    misurate sul mare di partenza le terre crescono. È il doppio conto del sedimento: negli stessi T anni la tettonica ne ha
//    già posato in mare ~1,9·10¹⁷ m³, che alzano il fondo di ~110 m e stanno già nel suo mare. Tenere fermo il mare toglie
//    l'annegamento ma perde l'1% dell'acqua: PROVATO E NON TENUTO. La via giusta è partire senza il sedimento di quei T anni.)
//  · QUANTO DURA: quanto è durata la geografia di oggi, cioè l'età media dei fondali (etaCrosta, da tettonica.js: sulla Terra
//    ~60–100 milioni di anni); senza placche, 100 milioni di anni (manca un orologio migliore). Una tessera, che aggiunge
//    il dettaglio a una scala più piccola, dura in proporzione al lato delle sue celle (un gradino risale un fiume in un
//    tempo proporzionale alla distanza).
// DATI (misurati, con la fonte, in EROSIONE): K per classe, m e n; K_d; k_Qs e I; i tre consumi della ghiaia; P₀; le due
// densità dell'isostasia. PARAMETRI LIBERI: velo (1 m: sotto, una copertura è un velo che un suolo attraversa: conta solo
// per dire, alla fine, quali terre sono coperte); durataSenzaPlacche.
// CHE COSA NON TORNA O MANCA: la geografia sta ferma per tutta la durata mentre le placche fanno ~1700 km, e il
// sollevamento è quello di oggi; la copertura che arriva dalla tettonica ha già subìto l'erosione a grana grossa di
// quella (le sue due leggi empiriche: la denudazione è così contata da due fonti, test_erosione le confronta); tutta la
// copertura della storia vale come roccia clastica litificata (manca una legge della litificazione: quanto in fretta e
// a che profondità un sedimento diventa roccia; e manca una misura di K per calcari e arenarie: con il K delle argilliti,
// 10⁻³, la copertura delle terre sparisce lo stesso: provato); il clima è quello di oggi; ciò che si posa sulle coste
// la tettonica lo ha già contato a modo suo nei margini dei continenti (i due conti si sommano), e il fondo del mare, che
// in quel tempo si rinnova, qui sta fermo; niente ghiacciai, frane, vento, carsismo; le conche sotto il livello del mare
// chiuse dentro un continente contano come mare; le celle di ~150 km non vedono le valli (vedi tessera).
// Escono, oltre al rilievo e al livello del mare (mare: quello a cui l'acqua di partenza riempie il rilievo eroso): flusso (la pioggia raccolta, in celle × metri l'anno, come prima), lago, depositato (m),
// versoValle (per ogni cella, la cella in cui versa; −1 il mare), copertura, sciolto e lava (m: ciò che resta; sciolto è
// la parte della copertura posata durante questa erosione), litologia (per
// cella: 0 basamento, 1 vulcanica, 2 sedimentaria), e i numeri veri: durataErosione (anni), denudazione (m/anno di roccia
// tolta, in media sulle terre di partenza), denudazioneFresca (m/anno: la parte che è basamento o lava, roccia al suo
// primo giro; il resto è sedimento già passato una volta dal suolo: è la roccia fresca che cede i suoi sali, mare.js), fangoAlMare (kg/anno), terreCoperte e terreVulcaniche (frazioni delle terre
// di oggi), sollevamentoMedio (m/anno, ciò che le placche hanno dato davvero alle terre), bilancio (m³) e
// bilancioCopertura (m³: prima + posata − erosa = dopo).
// kQs = 0,041 (Wickert e Schildgen 2019, eq. 19, riletta 2026-11) è costruita sul trasporto di Wong e Parker,
// 3,97·(τ* − 0,0495)^1,5, e vale per granuli di roccia in acqua (Δ = (ρs − ρ)/ρ = 1,65); con altri fluidi o granuli va
// moltiplicata per (1,65/Δ)^(7/6). Non dipende dalla gravità. Vale per fiumi ghiaiosi a larghezza d'equilibrio.
export const EROSIONE = Object.freeze({ m: 0.4, n: 1, K: Object.freeze({ granito: 3.2e-7, vulcanica: 3.2e-5, sedimento: 1e-3 }), pioggiaRif: 1, pendii: 0.01, kQs: 0.041, piena: 0.01, capacitaEsponente: 7 / 6,
  consumo: Object.freeze({ granito: 4.2e-6, vulcanica: 2e-5, sedimento: 2e-4 }), // (1/m) la parte della ghiaia che si disfa in carico fine per ogni metro di strada
  suolo: 3.1e-4, // (m/anno) P₀: quanto in fretta, al più, la roccia diventa suolo
  velo: 1, // (m) sotto, una copertura non conta
  isostasia: 2800 / 3300, sottoIlMare: (2700 - 1000) / (3300 - 1000), sottoLAcqua: 1000 / 3300, densita: 2700, durataSenzaPlacche: 1e8 });
const memoErosione = new Map();
// la più piccola quota a 32 bit che non sta sotto x: le quote sono scritte in un Float32Array e il mare è un numero a 64
// bit; una terra a un millimetro dal mare, arrotondata, non deve finire sotto il mare
const f32NonSotto = (x) => { const f = Math.fround(x); return f >= x ? f : Math.fround(f + Math.abs(f) * 2 ** -23) || 1e-30; };
export function erosione(chiave, sf, cl, { passi = 160, aperto = false, afflusso = null, crescita = true, scala = 1, durata = null } = {}) {
  if (memoErosione.has(chiave)) return memoErosione.get(chiave);
  const { W, H } = sf, N = W * H, alt = Float32Array.from(sf.alt); let mare = sf.mare;
  // la pioggia: dove fa abbastanza caldo e non c'è ghiaccio (dal clima simulato)
  const pioggia = new Float32Array(N), pm = cl.meteo ? pioggiaPerErosione(cl.meteo, sf) : null;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const [u0, v0, u1, v1] = sf.rett || [0, 0, 1, 1];
    const ci = ((Math.floor((u0 + (i / W) * (u1 - u0)) * cl.W) % cl.W) + cl.W) % cl.W, cj = Math.max(0, Math.min(cl.H - 1, Math.floor((v0 + (j / H) * (v1 - v0)) * cl.H))), k = cj * cl.W + ci;
    // (con l'aria che circola: la pioggia vera di quel punto, 1 = mille millimetri l'anno; altrimenti dove fa abbastanza caldo)
    pioggia[j * W + i] = cl.piove === false ? 0 : pm ? pm[j * W + i] * (1 - cl.freddo[k]) : Math.max(0, Math.min(1, (cl.media[k] - 255) / 40)) * (1 - cl.freddo[k]);
  }
  const vicini = (k, f) => { const i = k % W, j = (k - i) / W; for (let dj = -1; dj <= 1; dj++) { const jj = j + dj; if (jj < 0 || jj >= H) continue; for (let di = -1; di <= 1; di++) if (di || dj) f(jj * W + ((i + di + W) % W), di && dj ? 1.414 : 1, di, jj); } };
  // la coda per altezza (heap), per l'inondazione dal mare verso l'interno
  const heapK = new Int32Array(N), heapV = new Float32Array(N); let hn = 0;
  const push = (k, v) => { let i = hn++; while (i > 0) { const p = (i - 1) >> 1; if (heapV[p] <= v) break; heapK[i] = heapK[p]; heapV[i] = heapV[p]; i = p; } heapK[i] = k; heapV[i] = v; };
  const pop = () => { const k = heapK[0], lk = heapK[--hn], lv = heapV[hn]; let i = 0; for (;;) { let c = 2 * i + 1; if (c >= hn) break; if (c + 1 < hn && heapV[c + 1] < heapV[c]) c++; if (heapV[c] >= lv) break; heapK[i] = heapK[c]; heapV[i] = heapV[c]; i = c; } heapK[i] = lk; heapV[i] = lv; return k; };
  const pieno = new Float32Array(N), ricevente = new Int32Array(N), ordine = new Int32Array(N), visto = new Uint8Array(N), area = new Float32Array(N), dist = new Float32Array(N);
  let laghi = 0; const sedimento = new Float64Array(N), depositato = new Float32Array(N), portata = new Float64Array(N), versante = new Float64Array(N), inizio = new Float32Array(N), calo = new Float32Array(N);
  // ciò che il fiume ha scavato in questo passo, strato per strato (m³), e la ghiaia in viaggio per classe di roccia (m³)
  const eSci = new Float64Array(N), eMez = new Float64Array(N), eBase = new Float64Array(N), ghS = new Float64Array(N), ghV = new Float64Array(N), ghG = new Float64Array(N), sottoMonte = new Float32Array(N);
  // LE MISURE VERE: il lato di una cella (m) lungo i paralleli e lungo i meridiani, e la sua area
  const E = EROSIONE, R = sf.raggioM ?? 6.371e6, [ru0, rv0, ru1, rv1] = sf.rett || [0, 0, 1, 1], dy = (Math.PI * R * (rv1 - rv0)) / H, dxJ = new Float64Array(H), aJ = new Float64Array(H);
  // (verso i poli i paralleli si stringono: sotto un decimo del lato lungo il meridiano la cella non si stringe più, per il conto)
  for (let j = 0; j < H; j++) { const lat = Math.PI / 2 - (rv0 + ((j + 0.5) / H) * (rv1 - rv0)) * Math.PI; dxJ[j] = Math.max(0.1 * dy, (2 * Math.PI * R * Math.cos(lat) * (ru1 - ru0)) / W); aJ[j] = dxJ[j] * dy; }
  const aDi = (k) => aJ[(k - (k % W)) / W];
  // QUANTO DURA: l'età media dei fondali (la geografia di oggi), o ciò che dice chi chiama (una tessera: in proporzione al lato)
  let T = durata ? durata * Math.min(1, dy / ((Math.PI * R) / 128)) : E.durataSenzaPlacche;
  if (!durata && sf.etaCrosta && sf.cont) { let e = 0, m = 0; for (let k = 0; k < N; k++) if (!sf.cont[k] && sf.etaCrosta[k] > 0) { e += sf.etaCrosta[k]; m++; } if (m) T = (1e6 * e) / m; }
  const dt = T / passi;
  // LA ROCCIA, a strati dall'alto: sedimento sciolto (sci), poi copertura litificata (cop) o lave (lava: dove ci sono, la
  // copertura di prima, sepolta, non si conta più), poi il basamento (base: 0 granito e metamorfiche, 1 vulcanica)
  const sci = sf.sciolto ? Float32Array.from(sf.sciolto) : new Float32Array(N), cop = new Float32Array(N), lava = new Float32Array(N), base = new Uint8Array(N), diLava = new Uint8Array(N), arco = sf.arco && !durata ? sf.arco : null;
  for (let k = 0; k < N; k++) { base[k] = sf.roccia ? sf.roccia[k] : sf.cont && !sf.cont[k] ? 1 : 0; if (sf.copertura) cop[k] = Math.max(0, sf.copertura[k] - sci[k]);
    // (le lave: gli edifici ci sono già; quelle degli archi escono un po' per volta, per tutta la durata: vedi il passo)
    const l = sf.lava ? sf.lava[k] : 0; if (l + (arco ? arco[k] * T : 0) > E.velo) { lava[k] = l; diLava[k] = 1; cop[k] = 0; } }
  const soll = crescita && sf.sollevamento ? sf.sollevamento : null, tetto = sf.tetto || null, V0 = E.suolo * dt;
  const lit = sf.tettonica?.litosfera || null, termica = crescita && sf.termica && lit?.tau > 0 ? sf.termica : null, tauT = lit?.tau ?? 1, affonda = lit?.aria > 0 ? 1 - lit.aria : E.sottoLAcqua; // (ρw/ρ del mantello caldo: dalla litosfera del pianeta, se c'è)
  const kSed = E.K.sedimento, kMez = E.K.vulcanica, kGra = E.K.granito, cS = E.consumo.sedimento, cV = E.consumo.vulcanica, cG = E.consumo.granito;
  const resiste = (x) => (x > 1e-6 ? (1 - Math.exp(-x)) / x : 1); // quanta della ghiaia nata lungo un tratto ne esce ancora ghiaia (x = consumo × lunghezza)
  let erosoTot = 0, depTerra = 0, depMare = 0, alMare = 0, daiVersanti = 0, areaTerre = 0, copPrima = 0, copErosa = 0, copPosata = 0, sollevato = 0, fresca = 0;
  // (UNA STORIA SOLA, PROVATA E NON TENUTA: rimettere com'era ciò che le due leggi della tettonica hanno tolto e posato negli
  // ultimi T anni, prima di erodere qui. Nelle catene quelle leggi tolgono fino a un millimetro l'anno, e questa erosione
  // sul granito molto meno: i monti rimessi restano, 17 km. Il doppio conto resta dichiarato, vedi CHE COSA NON TORNA.)
  // L'ACQUA DEL MARE SI CONSERVA (solo sul pianeta intero): il suo volume è quello di partenza; se il fondo si alza il livello sale
  // (in m³ VERI: l'area della cella senza il pavimento di un decimo vicino ai poli, che vale solo per i conti dei fiumi. È la
  // misura con cui la superficie ha messo l'acqua: con quella del conto il mare polare cambiava volume, 3·10⁻⁵ del totale)
  const aVeroJ = Float64Array.from(aJ, (a, j) => (2 * Math.PI * R * Math.cos(Math.PI / 2 - (rv0 + ((j + 0.5) / H) * (rv1 - rv0)) * Math.PI) * (ru1 - ru0) / W) * dy);
  const acqua = () => { let v = 0, a = 0; for (let k = 0; k < N; k++) if (alt[k] < mare) { const ak = aVeroJ[(k - (k % W)) / W]; v += (mare - alt[k]) * ak; a += ak; } return [v, a]; }, volumeMare = crescita && Number.isFinite(mare) ? acqua()[0] : 0;
  for (let k = 0; k < N; k++) { const a = aDi(k); if (!(alt[k] < mare)) areaTerre += a; copPrima += (cop[k] + sci[k]) * a; }
  for (let it = 0; it < passi; it++) {
    // inondazione: dal mare (o dal punto più basso, se non c'è mare) verso l'interno; chi resta sotto il
    // livello di chi lo precede sta in una conca: lì c'è un lago
    hn = 0; visto.fill(0); let n = 0; const mareSu = Number.isFinite(mare) ? f32NonSotto(mare) : 0;
    let fonti = 0; for (let k = 0; k < N; k++) if (alt[k] < mare) { push(k, alt[k]); visto[k] = 1; ricevente[k] = -1; pieno[k] = alt[k]; fonti++; }
    // una tessera ha i bordi aperti: l'acqua esce verso le tessere vicine
    if (aperto) for (let k = 0; k < N; k++) { const i = k % W, j = (k - i) / W; if ((i === 0 || j === 0 || i === W - 1 || j === H - 1) && !visto[k]) { push(k, alt[k]); visto[k] = 1; ricevente[k] = -1; pieno[k] = alt[k]; fonti++; } }
    if (!fonti) { let m = 0; for (let k = 1; k < N; k++) if (alt[k] < alt[m]) m = k; push(m, alt[m]); visto[m] = 1; ricevente[m] = -1; pieno[m] = alt[m]; }
    while (hn) {
      const c = pop(), jc = (c - (c % W)) / W; ordine[n++] = c;
      vicini(c, (q, d, di, jq) => { if (visto[q]) return; visto[q] = 1; ricevente[q] = c; dist[q] = Math.hypot(di * 0.5 * (dxJ[jq] + dxJ[jc]), (jq - jc) * dy); pieno[q] = Math.max(alt[q], pieno[c] + 0.01); push(q, pieno[q]); });
    }
    // la portata: la pioggia raccolta da monte a valle (area: in celle × m/anno, per chi legge il flusso; portata: m³/anno)
    const secco = cl.piove === false ? 0 : 0.2;
    for (let k = 0; k < N; k++) { area[k] = secco + pioggia[k] + (afflusso ? afflusso[k] : 0); portata[k] = area[k] * aDi(k); inizio[k] = alt[k]; }
    // GLI ARCHI ERUTTANO PER TUTTA LA DURATA: la crosta nuova che nasce sopra le fosse (sf.arco, m/anno) arriva in cima come
    // lava un passo per volta. Dove ne esce più di quanta il fiume ne porta via la superficie resta vulcanica; dove
    // l'erosione vince affiora ciò che sta sotto. (La quota la alza già il sollevamento, che conta anche questa crosta.)
    if (arco) for (let k = 0; k < N; k++) if (diLava[k] && arco[k] > 0) lava[k] += arco[k] * dt;
    for (let x = n - 1; x > 0; x--) { const k = ordine[x], r = ricevente[k]; if (r >= 0) { area[r] += area[k]; portata[r] += portata[k]; } }
    // I FIUMI SCAVANO (implicito, da valle a monte) dove l'acqua scorre e non ristagna: lo strato che c'è sotto, e
    // consumato quello, nel tempo che resta del passo, lo strato dopo
    for (let x = 0; x < n; x++) {
      const k = ordine[x], r = ricevente[k]; if (r < 0 || alt[k] < mare) continue;
      if (pieno[k] > alt[k] + 0.5) continue; // nel lago non si scava: si deposita
      const zr = alt[r] < mare ? mare : alt[r]; let z = alt[k]; if (!(zr < z)) continue; // (il livello di base di un fiume che sbocca in mare è il MARE, non il fondo: prima la costa veniva scavata fin sotto il pelo dell'acqua)
      const g = (Math.pow(portata[k] / E.pioggiaRif, E.m) * dt) / dist[k], ak = aDi(k); let resto = 1, tc = 0, tl = 0;
      let c = sci[k];
      if (c > 0) { const F = kSed * g, giu = ((z - zr) * F) / (1 + F); if (giu <= c) { tc = giu; resto = 0; } else { tc = c; resto -= c / ((z - zr - c) * F); } z -= tc; sci[k] = c - tc; eSci[k] = tc * ak; }
      if (resto > 0 && (c = diLava[k] ? lava[k] : cop[k]) > 0) { const F = kMez * g * resto, giu = ((z - zr) * F) / (1 + F); if (giu <= c) { tl = giu; resto = 0; } else { tl = c; resto -= (resto * c) / ((z - zr - c) * F); } z -= tl; if (diLava[k]) lava[k] = c - tl; else cop[k] = c - tl; eMez[k] = tl * ak; }
      if (resto > 0) { const F = (base[k] ? kMez : kGra) * g * resto, giu = ((z - zr) * F) / (1 + F); z -= giu; eBase[k] = giu * ak; }
      // (il fiume non scava sotto il suo livello di base: z ≥ zr ≥ mare; ma scritta in 32 bit una quota a meno di un decimo di
      // millimetro dal mare poteva arrotondarsi SOTTO il mare, e la cella, spianata fino al livello di base, diventava mare
      // per un bit: su un mondo senza sollevamento le terre «annegavano» a metà senza che la quota media cambiasse di un metro)
      alt[k] = z; if (alt[k] < mare) alt[k] = mareSu;
    }
    // IL SEDIMENTO (m³): scende con l'acqua, da monte a valle. Il carico fine passa; la ghiaia al più quanto la capacità
    // del fiume: quella che lui stesso ha fatto in più non la scava (resta dov'era), quella che arriva in più si posa.
    // Tutto si posa dove l'acqua si ferma, nei laghi e sulle coste: le conche si riempiono, nascono pianure e delta
    sottoMonte.fill(Infinity);
    for (let x = n - 1; x > 0; x--) {
      const k = ordine[x], r = ricevente[k]; if (r < 0) continue;
      const ak = aDi(k), ar = aDi(r); let scavato = eSci[k] + eMez[k] + eBase[k];
      let carico = sedimento[k] + scavato + versante[k], gS = ghS[k], gV = ghV[k], gG = ghG[k]; daiVersanti += versante[k]; erosoTot += versante[k]; versante[k] = 0; sedimento[k] = 0;
      if (gS + gV + gG > 0 || scavato > V0 * ak) {
        const d = dist[k]; ghS[k] = 0; ghV[k] = 0; ghG[k] = 0; gS *= Math.exp(-cS * d); gV *= Math.exp(-cV * d); gG *= Math.exp(-cG * d); // la ghiaia in arrivo si consuma per strada
        // i blocchi di questo passo: ciò che è stato scavato oltre quanto il suolo riesce a disfare, dal fondo dello scavo
        let bB = 0, bL = 0, bC = 0; const blocchi = scavato - V0 * ak; if (blocchi > 0) { bB = Math.min(eBase[k], blocchi); bL = Math.min(eMez[k], blocchi - bB); bC = Math.max(0, blocchi - bB - bL); }
        const pB = resiste((base[k] ? cV : cG) * d), pL = resiste(cV * d), pC = resiste(cS * d), S = Math.max(0, alt[k] - (alt[r] < mare ? mare : alt[r])) / d;
        let troppo = gS + gV + gG + pB * bB + pL * bL + pC * bC - E.kQs * E.piena * portata[k] * Math.pow(S, E.capacitaEsponente) * dt;
        if (troppo > 0) {
          const uB = Math.min(bB, troppo / pB); troppo -= uB * pB; bB -= uB;
          const uL = troppo > 0 ? Math.min(bL, troppo / pL) : 0; troppo -= uL * pL; bL -= uL;
          const uC = troppo > 0 ? Math.min(bC, troppo / pC) : 0; troppo -= uC * pC; bC -= uC;
          const u = uB + uL + uC; if (u > 0) { alt[k] += u / ak; if (diLava[k]) lava[k] += uL / ak; else cop[k] += uL / ak; sci[k] += uC / ak; eBase[k] -= uB; eMez[k] -= uL; eSci[k] -= uC; carico -= u; scavato -= u; }
          // la ghiaia arrivata da monte in più di quanta il fiume ne porta si posa qui (una conoide), senza superare chi sta a monte
          const arrivata = gS + gV + gG; if (troppo > 1e-9 * arrivata && arrivata > 0) { const posa = Math.min(troppo, arrivata, Math.max(0, 0.5 * (sottoMonte[k] - alt[k])) * ak);
            if (posa > 0) { const f = 1 - posa / arrivata; gS *= f; gV *= f; gG *= f; alt[k] += posa / ak; sci[k] += posa / ak; depositato[k] += posa / ak; carico -= posa; depTerra += posa; copPosata += posa; } }
        }
        gS += pC * bC; gV += pL * bL; if (base[k]) gV += pB * bB; else gG += pB * bB;
      }
      erosoTot += scavato; copErosa += eSci[k] + (diLava[k] ? 0 : eMez[k]); fresca += eBase[k] + (diLava[k] ? eMez[k] : 0); eSci[k] = 0; eMez[k] = 0; eBase[k] = 0;
      if (alt[k] < sottoMonte[r]) sottoMonte[r] = alt[k];
      // (una conca è tale se era sotto il pelo dell'acqua PRIMA che il fiume scavasse in questo passo: il letto appena inciso non è una conca.
      // Prima si guardava la quota già scavata: ogni cella incisa passava per conca e si riprendeva metà dello scavo)
      const spazio = alt[r] < mare ? mare - alt[r] : pieno[r] > inizio[r] + 0.5 ? pieno[r] - alt[r] : 0;
      if (spazio > 0.5) { const dep = Math.max(0, Math.min(carico / ar, spazio * 0.5)), eraMare = alt[r] < mare, prima = carico; alt[r] += dep; carico = Math.max(0, carico - dep * ar); depositato[r] += dep; sci[r] += dep; copPosata += dep * ar; if (eraMare) depMare += dep * ar; else depTerra += dep * ar;
        if (gS + gV + gG > 0) { const f = prima > 0 ? carico / prima : 0; gS *= f; gV *= f; gG *= f; } }
      sedimento[r] += carico; if (gS + gV + gG > 0) { ghS[r] += gS; ghV[r] += gV; ghG[r] += gG; }
    }
    for (let k = 0; k < N; k++) if (ricevente[k] < 0) { if (sedimento[k] > 0) { alMare += sedimento[k]; sedimento[k] = 0; } ghS[k] = 0; ghV[k] = 0; ghG[k] = 0; } // ciò che arriva al mare (o esce dalla tessera) e non si è posato
    // I PENDII SCIVOLANO: tra due celle di terra vicine passa K_d·Δh/d per metro di confine. Una cella che riceve acqua
    // da altre è un letto di fiume: non cede e non si alza; ciò che i versanti le danno va nel carico del fiume
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const k = j * W + i; if (alt[k] < mare || pieno[k] > alt[k] + 0.5) continue;
      for (let lato = 0; lato < 2; lato++) { const q = lato ? (j + 1 < H ? k + W : -1) : j * W + ((i + 1) % W); if (q < 0 || alt[q] < mare || pieno[q] > alt[q] + 0.5) continue;
        const d = lato ? dy : 0.5 * (dxJ[j] + dxJ[j]), largo = lato ? dxJ[j] : dy, su = alt[k] > alt[q] ? k : q, giu = su === k ? q : k, aS = aDi(su), aG = aDi(giu);
        if (area[su] > secco + pioggia[su] + (afflusso ? afflusso[su] : 0) + 1e-6) continue; // chi cede è un letto: non è un pendio
        // (al più un quinto del dislivello per passo: oltre, il conto esplicito salterebbe; è già il pendio all'equilibrio)
        const vol = Math.min((E.pendii * (cl.sgretola ?? 0.05) / 0.05) * ((alt[su] - alt[giu]) / d) * largo * dt, 0.2 * (alt[su] - alt[giu]) * Math.min(aS, aG));
        calo[su] += vol / aS; if (area[giu] > secco + pioggia[giu] + (afflusso ? afflusso[giu] : 0) + 1e-6) versante[giu] += vol; else calo[giu] -= vol / aG; }
    }
    // (ciò che un versante perde lo perde dall'alto: prima il sedimento sciolto, poi la copertura o le lave; ciò che riceve è sedimento)
    for (let k = 0; k < N; k++) { let giu = calo[k]; if (giu === 0) continue; alt[k] -= giu; calo[k] = 0;
      if (giu < 0) { sci[k] -= giu; copPosata -= giu * aDi(k); } else { let c = sci[k], t = giu < c ? giu : c; sci[k] = c - t; giu -= t; copErosa += t * aDi(k);
        if (giu > 0) { if (diLava[k]) lava[k] = Math.max(0, lava[k] - giu); else { c = cop[k]; t = giu < c ? giu : c; cop[k] = c - t; copErosa += t * aDi(k); } } } }
    // LA CROSTA RISPONDE (solo sul pianeta intero): l'isostasia rialza la regione di ρc/ρm di ciò che ha perso; e le
    // placche la sollevano (o la abbassano) di quanto la crosta si ispessisce, finché regge
    if (crescita) { for (let k = 0; k < N; k++) { if (alt[k] < mare) { if (alt[k] > inizio[k]) alt[k] -= E.sottoIlMare * (alt[k] - inizio[k]); calo[k] = 0; } else calo[k] = inizio[k] - alt[k]; } // (sotto il mare il fondo cede al peso del sedimento che prende il posto dell'acqua)
      for (let k = 0; k < N; k++) { if (alt[k] < mare) continue; let m = calo[k], c = 1; vicini(k, (q) => { if (!(alt[q] < mare)) { m += calo[q]; c++; } }); portata[k] = (E.isostasia * m) / c; }
      for (let k = 0; k < N; k++) { if (!(alt[k] < mare)) { let su = portata[k];
          if (soll) { const u = soll[k] * dt, z = alt[k] + su, fin = tetto ? tetto[k] : Infinity, s = u < 0 ? u : z < fin ? Math.min(u, fin - z) : 0; su += s; sollevato += s * aDi(k); }
          alt[k] += su; } calo[k] = 0; }
      // LA SUBSIDENZA TERMICA: la litosfera stirata si raffredda e la colonna scende di ciò che le resta (sf.termica, m in
      // aria: tettonica.js), come e^(−t/τ) (McKenzie 1978); sotto il mare il peso dell'acqua che entra la fa scendere di più
      if (termica) { const f = Math.exp((-it * dt) / tauT) - Math.exp((-(it + 1) * dt) / tauT); for (let k = 0; k < N; k++) { const s = termica[k]; if (s !== 0) alt[k] -= alt[k] < mare ? (s * f) / (1 - affonda) : s * f; } }
      // l'acqua si conserva, e PESA: se il fondo si alza di sedimento il mare deve salire di w metri d'acqua in più, ma sotto
      // quel peso il fondo cede di w·ρw/ρm: il livello sale di w·(1 − ρw/ρm), le terre non si muovono
      if (volumeMare > 0) { const [v, a] = acqua(); if (a > 0) { const w = (volumeMare - v) / a, giu = w * affonda; for (let k = 0; k < N; k++) if (alt[k] < mare) alt[k] -= giu; mare += w - giu; } } }
  }
  if (volumeMare > 0) for (let giro = 0; giro < 6; giro++) { const [v, a] = acqua(); if (!(a > 0) || Math.abs(volumeMare - v) < 1e-9 * volumeMare) break; mare += (volumeMare - v) / a; }
  // una conca diventa lago solo se l'acqua che le arriva supera quella che evapora (più fa caldo, più
  // evapora); altrimenti resta asciutta, una piana di sale
  const lago = new Float32Array(N);
  for (let k = 0; k < N; k++) {
    if (alt[k] < mare || pieno[k] <= alt[k] + 1) continue;
    const [u0, v0, u1, v1] = sf.rett || [0, 0, 1, 1];
    const ci = ((Math.floor((u0 + ((k % W) / W) * (u1 - u0)) * cl.W) % cl.W) + cl.W) % cl.W, cj = Math.max(0, Math.min(cl.H - 1, Math.floor((v0 + (Math.floor(k / W) / H) * (v1 - v0)) * cl.H))), T = cl.media[cj * cl.W + ci];
    const evapora = 4 + 30 * Math.max(0, Math.min(1, (T - 260) / 50));
    if (area[k] > evapora * scala) { lago[k] = pieno[k] - alt[k]; laghi++; }
  }
  const flusso = new Float32Array(N); for (let k = 0; k < N; k++) flusso[k] = area[k];
  // di che roccia è fatta oggi la superficie, e quanta delle terre ha ancora la sua copertura
  const litologia = new Uint8Array(N); let copDopo = 0, aTerre = 0, aCoperte = 0, aVulcaniche = 0;
  for (let k = 0; k < N; k++) { const a = aDi(k); cop[k] += sci[k]; const l = cop[k] > E.velo ? 2 : lava[k] > E.velo || base[k] ? 1 : 0; litologia[k] = l; copDopo += cop[k] * a; if (!(alt[k] < mare)) { aTerre += a; if (l === 2) aCoperte += a; else if (l === 1) aVulcaniche += a; } }
  const out = { ...sf, mare, alt, flusso, lago, depositato, copertura: cop, sciolto: sci, lava, litologia, celleLago: laghi, passiErosione: passi, versoValle: Int32Array.from(ricevente), durataErosione: T, denudazione: areaTerre > 0 ? erosoTot / areaTerre / T : 0, denudazioneFresca: areaTerre > 0 ? fresca / areaTerre / T : 0, fangoAlMare: ((alMare + depMare) * E.densita) / T,
    terreCoperte: aTerre > 0 ? aCoperte / aTerre : 0, terreVulcaniche: aTerre > 0 ? aVulcaniche / aTerre : 0, sollevamentoMedio: areaTerre > 0 ? sollevato / areaTerre / T : 0,
    bilancio: { eroso: erosoTot, depositato: depTerra + depMare, alMare, daiVersanti }, bilancioCopertura: { prima: copPrima, erosa: copErosa, posata: copPosata, dopo: copDopo } };
  memoErosione.set(chiave, out); if (memoErosione.size > 6) memoErosione.delete(memoErosione.keys().next().value);
  return out;
}

// ---------- LE TESSERE: la risoluzione continua. Avvicinandosi, ogni tessera si divide in 4 × 4 tessere
// più fini. Una tessera figlia nasce dalla madre: le sue quote (interpolate), più il dettaglio che da
// lontano non si vedeva (rumore su coordinate globali: uguale da qualunque parte ci si arrivi), poi
// l'erosione alla sua scala, con i bordi aperti e i fiumi della madre che entrano con la loro portata;
// i laghi della madre restano al loro livello. Lo stesso posto dà sempre la stessa tessera.
const memoTessere = new Map();
// LA COSTA È QUELLA DELLA MADRE (regola 4: il dettaglio è condizionato da ciò che c'è sopra). Una cella della madre è terra
// o è mare, tutta: la figlia non può spostare la costa se non di ciò che da lontano non si vedeva. Interpolare le quote in
// linea retta tra i centri non lo rispetta: tra una piana a +20 m e un fondale a −300 la quota zero cade a un sedicesimo
// della strada, e la piana perde metà della sua cella per ogni lato che dà sul mare; e un rumore di ampiezza fissa annega
// le piane più basse della sua ampiezza e non fa emergere nessun fondale (misurato su un mondo spianato fino al mare:
// pezzi tutti di terra nella madre uscivano mare per il 70–80%). Perciò, dove c'è un mare:
//   · IL LATO (σ, da −1 a +1): l'interpolazione del segno delle quattro celle attorno (+1 terra, −1 mare). La costa è
//     dove σ = 0: sul confine tra le celle, come la vede la madre;
//   · LA QUOTA: la media delle sole celle di terra (o di mare) attorno, per σ: scende in linea retta fino a zero sulla
//     costa, da una parte e dall'altra, senza gradini;
//   · IL DETTAGLIO sposta la costa di quanto la sposterebbe sul pendio tra la quota di terra A e il fondale B (di
//     2·δ/(A + B) in σ, lo stesso numero da una parte e dall'altra: in media la parte di mare non cambia; non oltre
//     1 − σ²: dentro una terra o un mare interi non nasce costa), e lontano dalla costa si somma com'era, ma mai più di
//     quanto il punto sta sopra (o sotto) il mare: il rilievo che da lontano non si vedeva non scende sotto il livello di
//     base;
// CHE COSA NON TORNA: la media. Una cella di costa che scende in linea retta fino a zero sul suo bordo non ha più la
// media della madre (il fondale accanto alla costa esce meno fondo, la piana più bassa), e la costa spostata dal dettaglio
// costa quota dove il fondale è più fondo di quanto la terra è alta. Misurato su 16 tessere di livello 1, prima della loro
// erosione: +9 m su una Terra di prova (al più 22 su una tessera), +0,2 m su un mondo spianato fino al mare; la parte di
// mare torna entro 0,003 (al più 0,006). Riscalare ogni cella della madre perché la media delle sue sedici figlie sia la
// sua è stato PROVATO E NON TENUTO: una piana a zero metri non si riscala, e il conto finiva a −12 m.
// Senza mare (o tutto sotto il mare) non cambia niente: è l'interpolazione di prima.
// IL BORDO. Ogni tessera si calcola un po' più larga di quel che mostra (un ottavo in più per lato): così l'erosione
// vede anche il terreno appena fuori, i fiumi non «sentono» il taglio, e due tessere vicine combaciano. Il bordo in
// più non si mostra, ma resta alla tessera per fare da madre alle sue figlie (che così leggono oltre il loro lato).
const BORDO = 1 / 8;
// gli esponenti di Hurst del rilievo per luogo (Gagnon, Lovejoy e Schertzer 2006, NPG 13, 541)
export const HURST = Object.freeze({ fondale: 0.46, continente: 0.66, margine: 0.77 });
// κ(H): in un campo auto-affine di eredita.js con esponente H, lo scarto dell'ottava che viene dopo una griglia diviso per lo
// scarto quadratico tra celle vicine di quella griglia (√S₁). Si misura una volta per esponente, su un campo di 128 × 128
// fatto con sette ottave a legge di potenza (l'ottava dopo la settima ha scarto 2^(−8H) per ampiezza 1).
const KAPPA = new Map();
export function kappaHurst(H) {
  let k = KAPPA.get(H); if (k) return k; const n = 128, f = discendi({ base: () => 0, livello0: 0, livello: 7, I0: 0, J0: 0, nI: n, nJ: n, radice: 'taratura del rilievo', nome: `hurst ${H}`, ampiezza: 1, hurst: H, lato0: 1 });
  let s = 0, c = 0; for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) { s += (f[j * n + i] - f[j * n + i + 1]) ** 2 + (f[j * n + i] - f[(j + 1) * n + i]) ** 2; c += 2; }
  k = 2 ** (-8 * H) / Math.sqrt(s / c); KAPPA.set(H, k); return k;
}
export function tessera(chiave, radice, cl, L, tx, ty, seme = 1) {
  if (L === 0) return radice.rett ? radice : Object.assign(radice, { rett: [0, 0, 1, 1], livello: 0 });
  const k = `${chiave}|${L}|${tx}|${ty}`; if (memoTessere.has(k)) return memoTessere.get(k);
  const m = tessera(chiave, radice, cl, L - 1, tx >> 2, ty >> 2, seme), { W, H, mare } = m, n = 4 ** L;
  const Pw = Math.round(W * BORDO), Ph = Math.round(H * BORDO), Wl = W + 2 * Pw, Hl = H + 2 * Ph, N = Wl * Hl, du = 1 / n;
  const rett = [tx / n, ty / n, (tx + 1) / n, (ty + 1) / n], rettL = [rett[0] - BORDO * du, rett[1] - BORDO * du, rett[2] + BORDO * du, rett[3] + BORDO * du];
  // la madre con il suo bordo; la radice (il pianeta intero) si richiude in longitudine
  const M = m.largo || { W: m.W, H: m.H, rett: m.rett, alt: m.alt, flusso: m.flusso, lago: m.lago, versoValle: m.versoValle, giro: true }, [mu0, mv0, mu1, mv1] = M.rett, MW = M.W, MH = M.H;
  const ix = (x) => (M.giro ? ((x % MW) + MW) % MW : Math.max(0, Math.min(MW - 1, x))), iy = (y) => Math.max(0, Math.min(MH - 1, y));
  const bil = (arr, fx, fy) => { const x0 = Math.floor(fx), y0 = Math.floor(fy), u = fx - x0, v = fy - y0, a = iy(y0) * MW, b = iy(y0 + 1) * MW, p = ix(x0), q = ix(x0 + 1); return arr[a + p] * (1 - u) * (1 - v) + arr[a + q] * u * (1 - v) + arr[b + p] * (1 - u) * v + arr[b + q] * u * v; };
  const alt = new Float32Array(N), afflusso = new Float32Array(N), livelloLago = new Float32Array(N), cellaMadre = new Int32Array(N), pfx = new Float32Array(N), pfy = new Float32Array(N);
  // la roccia della madre (copertura, lave, basamento), cella per cella: la figlia scava la stessa roccia
  const copertura = m.copertura ? new Float32Array(N) : null, sciolto = m.sciolto ? new Float32Array(N) : null, lava = m.lava ? new Float32Array(N) : null, roccia = new Uint8Array(N), [nu0, nv0, nu1, nv1] = m.rett;
  // IL DETTAGLIO CHE DA LONTANO NON SI VEDEVA: le due ottave che la tessera aggiunge sotto la cella della madre (quattro
  // volte più fine: due raddoppi), con l'ottava condizionata dal padre di eredita.js (Donoho 1993 per la predizione a media
  // conservata, Cook e DeRose 2005 per il rumore a banda limitata in coordinate globali). La correzione ha media NULLA ESATTA
  // su ogni cella della madre: riassunta, la figlia ridà la madre. QUANTO è grande lo dice il padre, cella per cella:
  //   · l'ESPONENTE di Hurst del luogo: 0,46 sui fondali, 0,66 sui continenti, 0,77 sui margini continentali (Gagnon, Lovejoy
  //     e Schertzer 2006, Nonlin. Processes Geophys. 13, 541: quattro modelli digitali del terreno dal pianeta a 50 cm). Il
  //     margine: un mare sopra la crosta dei continenti (la piattaforma), o una cella con le due croste attorno; senza placche,
  //     le celle a due celle dalla costa;
  //   · l'AMPIEZZA: quella che il rilievo della madre ha alla sua grana, continuata con quell'esponente. Si misura lo scarto
  //     quadratico tra celle vicine della madre (la funzione di struttura a un passo, S₁, sulle 5 × 5 celle attorno, solo tra
  //     celle dalla stessa parte del mare della cella: la costa non è rilievo, e una piana non prende il rilievo del fondale), e l'ottava dopo vale κ(H)·√S₁, la seconda 2^(−H) volte
  //     meno. κ(H) non è scelto: è il rapporto che un campo auto-affine di eredita.js con quell'esponente ha tra le due cose
  //     (tarato una volta, qui sotto). Così il dettaglio porta da sé ciò che il padre sa: le catene sollevate, ancora ripide,
  //     ne hanno molto; i cratoni vecchi e le piane che l'erosione ha spianato quasi niente; i fondali lo hanno delle loro colline.
  // (Prima: un rumore di valore di ampiezza 260·0,36^L, la stessa sulle catene e sugli abissi, che non tornava alla media.)
  // LA COSTA resta quella della madre: dove le celle attorno sono dalle due parti del mare la quota si interpola col segno
  // (sulMare, vedi sopra) e il dettaglio la sposta solo di ciò che da lontano non si vedeva; lontano dalla costa (le 5 × 5
  // celle tutte dalla stessa parte: quelle che la predizione di Donoho guarda) vale la predizione, che conserva la media.
  // (Provato e non tenuto: metà e metà nell'anello tra le due; la predizione che guarda un fondale di −1000 m accanto a una
  // piana a +1 m vi fa nascere colline di 150 m.)
  const conMare = Number.isFinite(mare), valore = (x, y) => M.alt[iy(y) * MW + ix(x)] - (conMare ? mare : 0), nG = 4 ** (L - 1), WgM = W * nG, HgM = H * nG;
  const oxM = Math.round(mu0 * WgM), oyM = Math.round(mv0 * HgM), lato = (2 * Math.PI * radice.raggioM) / (W * n); // (dove sta la madre larga nella griglia globale del suo livello; il lato della cella figlia, m)
  const qM = (I, J) => iy(J - oyM) * MW + ix(I - oxM), latoM = (x) => conMare ? (x < 0 ? -1 : 1) : 1;
  const crosta = radice.cont || null, sh0 = 2 * (L - 1), contM = (I, J) => (crosta ? crosta[Math.max(0, Math.min(radice.H - 1, J >> sh0)) * radice.W + (((I >> sh0) % radice.W) + radice.W) % radice.W] : 1); // (le croste: quelle del pianeta intero)
  const sigmaCella = new Map(); // (per cella della madre: [σ della prima ottava, H])
  const sigmaDi = (I, J) => { const c = qM(I, J); let v = sigmaCella.get(c); if (v) return v;
    const z0 = M.alt[c] - (conMare ? mare : 0), terra = !conMare || z0 >= 0; let misto = false, contMisto = false; const c0 = contM(I, J);
    let s2 = 0, nn = 0; for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) { const za = valore(I - oxM + a, J - oyM + b), zb = valore(I - oxM + a + 1, J - oyM + b), zc = valore(I - oxM + a, J - oyM + b + 1);
      if (latoM(za) !== latoM(z0)) misto = true; if (contM(I + a, J + b) !== c0) contMisto = true;
      const l0 = latoM(z0); if (latoM(za) === l0 && latoM(zb) === l0) { s2 += (za - zb) ** 2; nn++; } if (latoM(za) === l0 && latoM(zc) === l0) { s2 += (za - zc) ** 2; nn++; } }
    const margine = crosta ? (!terra && c0) || contMisto : misto, H = margine ? HURST.margine : terra ? HURST.continente : HURST.fondale;
    v = [nn ? kappaHurst(H) * Math.sqrt(s2 / nn) : 0, H]; sigmaCella.set(c, v); return v; };
  // le due ottave (livelli della griglia globale: la madre è al raddoppio 2(L − 1), la figlia al 2L), dalla cella (I0, J0) della figlia larga
  const I0 = Math.round(rettL[0] * W * n), J0 = Math.round(rettL[1] * H * n), radiceR = radice.radiceRilievo ?? `${chiave}/superficie`; // (il caso della superficie madre: quello del luogo)
  const pred = discendi({ base: (I, J) => M.alt[qM(I, J)], livello0: 2 * (L - 1), livello: 2 * L, I0, J0, nI: Wl, nJ: Hl, radice: radiceR, nome: 'rilievo', sigma: 0, giroI: WgM });
  const ottave = discendi({ base: () => 0, livello0: 2 * (L - 1), livello: 2 * L, I0, J0, nI: Wl, nJ: Hl, radice: radiceR, nome: 'rilievo', giroI: WgM, // (la longitudine si richiude: le campane della cucitura sono le stesse dalle due parti)
    sigma: (Lv) => (I, J) => { const sh = Lv - 2 * (L - 1) - 1, [s1, H] = sigmaDi(I >> sh, J >> sh); return s1 * 2 ** (-H * sh); } });
  const lontano = new Map(); // (per cella della madre: 2 se le 5 × 5 attorno stanno dalla stessa parte del mare, se no meno)
  const lontanoDi = (x, y) => { const c = iy(y) * MW + ix(x); let v = lontano.get(c); if (v !== undefined) return v; const z0 = latoM(valore(x, y)); v = 2;
    for (let b = -2; b <= 2 && v; b++) for (let a = -2; a <= 2; a++) if (latoM(valore(x + a, y + b)) !== z0) { v = Math.abs(a) <= 1 && Math.abs(b) <= 1 ? 0 : Math.min(v, 1); if (!v) break; } lontano.set(c, v); return v; };
  // la quota condizionata alla costa della madre (vedi sopra), in metri SUL MARE, col dettaglio d (dS: quanto vale il dettaglio
  // al più, tre scarti: sotto, il dettaglio non porta un punto oltre il livello del mare)
  const sulMare = (fx, fy, d, dS) => { const x0 = Math.floor(fx), y0 = Math.floor(fy), u = fx - x0, v = fy - y0;
    const z00 = valore(x0, y0), z10 = valore(x0 + 1, y0), z01 = valore(x0, y0 + 1), z11 = valore(x0 + 1, y0 + 1), w00 = (1 - u) * (1 - v), w10 = u * (1 - v), w01 = (1 - u) * v, w11 = u * v;
    let t = 0, A = 0, B = 0; // t: quanta parte dei pesi sta su celle di terra; A, B: le somme pesate delle quote di terra e dei fondali
    if (z00 >= 0) { t += w00; A += w00 * z00; } else B -= w00 * z00; if (z10 >= 0) { t += w10; A += w10 * z10; } else B -= w10 * z10;
    if (z01 >= 0) { t += w01; A += w01 * z01; } else B -= w01 * z01; if (z11 >= 0) { t += w11; A += w11 * z11; } else B -= w11 * z11;
    let z; const tutta = z00 >= 0 && z10 >= 0 && z01 >= 0 && z11 >= 0, niente = z00 < 0 && z10 < 0 && z01 < 0 && z11 < 0;
    if (tutta) z = A; else if (niente) z = -B;
    else { if (t <= 0) z = -B; else if (t >= 1) z = A; else { A /= t; B /= 1 - t; const s0 = 2 * t - 1, lim = 1 - s0 * s0; let ds = A + B > 0 ? (2 * d) / (A + B) : d > 0 ? lim : d < 0 ? -lim : 0; if (ds > lim) ds = lim; else if (ds < -lim) ds = -lim; const s = s0 + ds; z = s >= 0 ? A * s : B * s; d *= s0 < 0 ? -s0 : s0; } }
    const q = z < 0 ? -z : z; return z + (q < dS ? (d * q) / dS : d); };
  const mareSu = conMare ? f32NonSotto(mare) : 0; // (una terra a un millimetro dal mare resta terra anche scritta in un Float32)
  for (let j = 0; j < Hl; j++) for (let i = 0; i < Wl; i++) {
    const gu = rettL[0] + ((i + 0.5) / Wl) * (rettL[2] - rettL[0]), gv = rettL[1] + ((j + 0.5) / Hl) * (rettL[3] - rettL[1]), c = j * Wl + i;
    const fx = ((gu - mu0) / (mu1 - mu0)) * MW - 0.5, fy = ((gv - mv0) / (mv1 - mv0)) * MH - 0.5;
    pfx[c] = fx; pfy[c] = fy; cellaMadre[c] = iy(Math.round(fy)) * MW + ix(Math.round(fx));
    const d = ottave[c], dS = 3 * sigmaDi(((I0 + i) >> 2), ((J0 + j) >> 2))[0] + 1e-9;
    if (conMare) { const xm = Math.round(fx), ym = Math.round(fy), zl = pred[c] - mare; let z;
      // (la predizione, dove il fondale scende ripido, può passare il livello del mare: lì vale la quota col segno, come sulla costa)
      if (lontanoDi(xm, ym) < 2 || latoM(zl) !== latoM(valore(xm, ym))) z = sulMare(fx, fy, d, dS); else { const q = zl < 0 ? -zl : zl; z = zl + (q < dS ? (d * q) / dS : d); }
      alt[c] = mare + z; if (z >= 0 && alt[c] < mare) alt[c] = mareSu; else if (z < 0 && !(alt[c] < mare)) alt[c] = mare + z - Math.abs(mare) * 2 ** -23; }
    else alt[c] = pred[c] + d;
    { const mi = Math.floor(((gu - nu0) / (nu1 - nu0)) * W), mj = Math.max(0, Math.min(H - 1, Math.floor(((gv - nv0) / (nv1 - nv0)) * H))), q = mj * W + (L === 1 ? ((mi % W) + W) % W : Math.max(0, Math.min(W - 1, mi)));
      if (copertura) copertura[c] = m.copertura[q]; if (sciolto) sciolto[c] = m.sciolto[q]; if (lava) lava[c] = m.lava[q]; roccia[c] = m.roccia ? m.roccia[q] : m.cont && !m.cont[q] ? 1 : 0; }
    if (M.lago) { // il lago della madre: la sua superficie è piatta, la riva la decide il terreno fine
      // (−∞ se nessuna delle quattro celle è lago: prima si partiva da 0 m, e dove il mare sta sotto lo zero delle quote — su
      // 33/11/0 a −320 m — ogni terra della figlia, più bassa di 0, diventava un lago profondo fino a 0: tutte le terre del
      // livello 0 uscivano acqua da vicino)
      const x0 = Math.floor(fx), y0 = Math.floor(fy); let lev = -Infinity;
      for (const q of [iy(y0) * MW + ix(x0), iy(y0) * MW + ix(x0 + 1), iy(y0 + 1) * MW + ix(x0), iy(y0 + 1) * MW + ix(x0 + 1)]) if (M.lago[q] > 0) lev = Math.max(lev, M.alt[q] + M.lago[q]);
      livelloLago[c] = lev;
    }
  }
  // I FIUMI CHE ENTRANO: l'area che la madre ha drenato fin lì. Per ogni cella della madre fuori dalla tessera larga che versa
  // in una cella dentro, la sua area drenata (nelle celle della madre, 16 volte quelle della figlia) entra nella cella di bordo
  // della figlia dove la strada tra le due passa il bordo: una volta sola, dove il fiume passa davvero. (Prima: l'area della
  // madre per 4 su OGNI cella del bordo, anche dove l'acqua esce o scorre lungo il bordo: i fiumi entravano da tutte le parti.)
  if (M.versoValle && M.flusso) { const fx0 = ((rettL[0] - mu0) / (mu1 - mu0)) * MW, fy0 = ((rettL[1] - mv0) / (mv1 - mv0)) * MH, fxW = ((rettL[2] - rettL[0]) / (mu1 - mu0)) * MW, fyH = ((rettL[3] - rettL[1]) / (mv1 - mv0)) * MH;
    const dentro = (x, y) => x >= 0 && y >= 0 && x < fxW && y < fyH; // (x, y: centro di una cella della madre, nelle celle della madre contate dall'angolo della figlia larga)
    const i0 = Math.floor(fx0) - 2, i1 = Math.ceil(fx0 + fxW) + 2, j0 = Math.max(0, Math.floor(fy0) - 2), j1 = Math.min(MH - 1, Math.ceil(fy0 + fyH) + 2);
    for (let y = j0; y <= j1; y++) for (let xx = i0; xx <= i1; xx++) { const x = ix(xx); if (!M.giro && x !== xx) continue; const p = y * MW + x, q = M.versoValle[p]; if (q < 0) continue;
      const ax = xx + 0.5 - fx0, ay = y + 0.5 - fy0; if (dentro(ax, ay)) continue; let qx = (q % MW) + 0.5 - fx0; const qy = Math.floor(q / MW) + 0.5 - fy0; if (M.giro) qx -= MW * Math.round((qx - ax) / MW); if (!dentro(qx, qy)) continue;
      // il punto dove la strada a → q passa il bordo
      let tE = 0; for (const [num, den] of [[-ax, qx - ax], [fxW - ax, qx - ax], [-ay, qy - ay], [fyH - ay, qy - ay]]) if (den) { const tt = num / den; if (tt > 0 && tt < 1) { const bx = ax + tt * (qx - ax), by = ay + tt * (qy - ay); if (bx >= -1e-9 && by >= -1e-9 && bx <= fxW + 1e-9 && by <= fyH + 1e-9) tE = Math.max(tE, tt); } }
      const bx = ax + tE * (qx - ax), by = ay + tE * (qy - ay), ci = Math.max(0, Math.min(Wl - 1, Math.floor((bx / fxW) * Wl))), cj = Math.max(0, Math.min(Hl - 1, Math.floor((by / fyH) * Hl)));
      afflusso[cj * Wl + ci] += M.flusso[p] * 16; } }
  const alt0 = Float32Array.from(alt);
  const e = erosione(k, { W: Wl, H: Hl, raggioM: radice.raggioM, alt, mare, rett: rettL, vulcani: [], roccia, ...(copertura ? { copertura } : {}), ...(sciolto ? { sciolto } : {}), ...(lava ? { lava } : {}) }, cl, { passi: 26, aperto: true, afflusso, crescita: false, scala: 4 ** L, durata: radice.durataErosione });
  // L'EROSIONE FINE NON RIFÀ QUELLA DELLA MADRE. La madre è già stata erosa per la stessa durata (T_grossa): ciò che la sua
  // erosione ha portato via da ogni sua cella, e dove l'ha posato, è già nella sua quota. L'erosione della tessera vede in più
  // solo il rilievo sotto la cella della madre, e può soltanto ridistribuirlo DENTRO la cella: la parte del suo cambiamento
  // che ha la scala della madre (la media su ogni cella della madre) si toglie, e la media della figlia su ogni cella ridà
  // quella della quota interpolata (M∘μ = I, per costruzione). La correzione è liscia (bilineare sulle celle della madre, a
  // giri: dopo quattro le medie per cella tornano entro il millimetro), così non nascono gradini al bordo delle celle.
  // (Prima la tessera era erosa di nuovo per tutta la durata: su un mondo con il mare una tessera di livello 2 scendeva di
  // 565 m sotto la madre; misurato: −471 m dall'erosione della tessera di livello 1, −45 da quella di livello 2.)
  { const corr = new Float32Array(N), somme = new Map(); let giri = 0;
    for (; giri < 6; giri++) { somme.clear(); let peggio = 0;
      for (let c = 0; c < N; c++) { const d = e.alt[c] - alt0[c] - corr[c], q = cellaMadre[c], s = somme.get(q); if (s) { s[0] += d; s[1]++; } else somme.set(q, [d, 1]); }
      const media = new Float32Array(MW * MH); for (const [q, [a, n]] of somme) { media[q] = a / n; peggio = Math.max(peggio, Math.abs(a / n)); }
      if (peggio < 1e-3) break; for (let c = 0; c < N; c++) corr[c] += bil(media, pfx[c], pfy[c]); }
    for (let c = 0; c < N; c++) e.alt[c] -= corr[c]; }
  for (let c = 0; c < N; c++) if (livelloLago[c] > e.alt[c]) e.lago[c] = Math.max(e.lago[c], livelloLago[c] - e.alt[c]);
  // ciò che si mostra: il centro, senza il bordo
  const out = { ...e, W, H, rett, livello: L, vulcani: [], materiali: m.materiali };
  for (const [nome, v] of Object.entries(e)) if (ArrayBuffer.isView(v) && v.length === N) { const r = new v.constructor(W * H); for (let j = 0; j < H; j++) r.set(v.subarray((j + Ph) * Wl + Pw, (j + Ph) * Wl + Pw + W), j * W); out[nome] = r; }
  // (versoValle parla delle celle della tessera larga: qui diventa l'indice nella parte mostrata; −1 se l'acqua esce dal bordo)
  if (out.versoValle) for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const q = e.versoValle[(j + Ph) * Wl + i + Pw], qi = q < 0 ? -1 : (q % Wl) - Pw, qj = q < 0 ? -1 : Math.floor(q / Wl) - Ph; out.versoValle[j * W + i] = qi >= 0 && qi < W && qj >= 0 && qj < H ? qj * W + qi : -1; }
  const qx = tx & 3, qy = ty & 3, cont = new Uint8Array(W * H); if (m.cont) for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) cont[j * W + i] = m.cont[Math.min(H - 1, Math.floor((qy + j / H) * (H / 4))) * W + Math.min(W - 1, Math.floor((qx + i / W) * (W / 4)))];
  out.cont = cont; out.largo = { W: Wl, H: Hl, rett: rettL, alt: e.alt, flusso: e.flusso, lago: e.lago, versoValle: e.versoValle };
  // l'età della crosta e le fosse della madre, ricampionate come i continenti
  for (const nome of ['etaCrosta', 'fosse']) if (m[nome]) { const r = new Float32Array(W * H); for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) r[j * W + i] = m[nome][Math.min(H - 1, Math.floor((qy + j / H) * (H / 4))) * W + Math.min(W - 1, Math.floor((qx + i / W) * (W / 4)))]; out[nome] = r; }
  memoTessere.set(k, out); if (memoTessere.size > 48) memoTessere.delete(memoTessere.keys().next().value);
  return out;
}
