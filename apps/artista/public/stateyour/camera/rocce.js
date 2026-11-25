// rocce.js — ciò che si vede zoomando sotto la cella di terreno: dal metro al micron.
//
// Quattro modi in cui la materia solida prende forma da sola, ciascuno simulato
// nel tempo su una griglia N×N (cristalli e fratture si richiudono sui bordi, come
// piastrelle; il sedimento solo di lato; il fiocco è un oggetto solo, al centro):
//   · CRISTALLI. Un fuso che si raffredda: i cristalli nascono a caso e crescono
//     finché si toccano. Lento = pochi e grandi (granito), rapido = tanti e piccoli
//     (basalto), rapidissimo = non fa in tempo e resta vetro (ossidiana).
//   · FIOCCO DI NEVE. Il ghiaccio cresce dal vapore su un reticolo a sei: dove il
//     vapore arriva più facilmente (le punte) cresce di più, e nascono i rami.
//   · SEDIMENTO. L'acqua o il vento posano granelli: quanto è grosso ciò che cade
//     dipende dalla forza della corrente, che cambia nel tempo e lascia le lamine.
//   · FRATTURE. Una roccia che si raffredda o un fango che secca si stringono, ma
//     sono incollati a ciò che sta sotto: la trazione li spacca in poligoni.
// Ogni funzione è pura: stessi parametri e stesso seme, stesso risultato.
// IL CASO viene dalla fonte unica (eventi.js). «seme» è la sorgente degli eventi di quel pezzo di roccia, o un numero
// («cristalli numero», «fiocco numero»…). Ogni cosa incerta è un evento con il suo nome: il germe k nato al passo p
// («passo p/germe k»: dove, come è girato, di che minerale), il granello n («granello n»), la crepa nata nel punto c
// («crepa da c/direzione») e le deviazioni di ogni sua punta («punta t/deviazioni»), la resistenza punto per punto
// («resistenza», estrazione = la cella). Un ramo ne cambia uno; l'ordine in cui si calcola non conta.
// Le LEGGI EMPIRICHE (misurate, non derivate qui) sono dichiarate dove si usano.

import { comeSorgente } from './eventi.js';
import { MOLARE_ACQUA, R_GAS, ZERO_CELSIUS } from './leggi.js'; // le costanti e le unità: un posto solo

const limita = (x, a, b) => (x < a ? a : x > b ? b : x);
// una campana a caso (Box-Muller: le estrazioni k e k+1 di un evento) e un conteggio a caso (Poisson: le sue estrazioni, una dopo l'altra)
const campana = (serie, k = 0) => Math.sqrt(-2 * Math.log(1 - serie(k))) * Math.cos(2 * Math.PI * serie(k + 1));
function poisson(media, serie) {
  if (media <= 0) return 0;
  if (media > 30) return Math.max(0, Math.round(media + Math.sqrt(media) * campana(serie)));
  const L = Math.exp(-media); let k = 0, p = serie(0); while (p > L) { k++; p *= serie(k); } return k;
}
// una tinta fissa per ogni numero (per distinguere a colpo d'occhio grani e poligoni vicini)
const tinta = (k) => { let h = Math.imul(k + 1, 0x9e3779b1); h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; return ((h >>> 0) % 1024) / 1023; };

// =====================================================================================
// 1. IL FUSO CHE SOLIDIFICA
// =====================================================================================
// Sotto la temperatura di fusione (liquidus) il fuso «vorrebbe» cristallizzare, ma
// deve fare due cose, e nessuna è istantanea (curve di Tammann):
//   · NASCERE: un germe di cristallo deve superare una barriera (la sua superficie
//     costa energia): teoria classica della nucleazione, I ∝ exp(−b/ΔT²). Con poco
//     sottoraffreddamento ΔT non nasce quasi nulla; con molto, moltissimi.
//   · CRESCERE: la spinta cresce con ΔT (G ∝ ΔT), ma il fuso freddo è viscoso e gli
//     atomi faticano a muoversi: la mobilità crolla avvicinandosi al vetro
//     (legge EMPIRICA di Vogel-Fulcher-Tammann per la viscosità: exp(−A·u/(1−u))).
// u = ΔT in unità della finestra liquidus → transizione vetrosa (0 = appena sotto la
// fusione, 1 = vetro). Lunghezze in celle; l'unità di tempo è quella in cui un
// cristallo crescerebbe di una cella se G valesse 1.
const NASCITA0 = 0.05, BARRIERA = 0.05, VISCOSITA = 3;
export function tammann(u) {
  if (!(u > 0) || u >= 1) return { nascita: 0, crescita: 0 };
  const mob = Math.exp((-VISCOSITA * u) / (1 - u));
  return { nascita: NASCITA0 * Math.exp(-BARRIERA / (u * u)) * mob, crescita: u * mob };
}
// A quale sottoraffreddamento il fuso comincia davvero a cristallizzare? Lo si calcola
// seguendo la discesa u = r·t: la frazione «estesa» (i cristalli come se non si
// ostacolassero) è Xe(u) = (π/r³)·∫ I(v)·[∫_v^u G]² dv. Quando arriva all'1% i cristalli
// decollano. Più si raffredda in fretta, più in basso si arriva prima che succeda; se si
// arriva al vetro senza che sia successo, non succede più: quella è la velocità CRITICA.
function decollo(r) {
  const n = 2000, du = 1 / n, r3 = r * r * r; let H = 0, S0 = 0, S1 = 0, S2 = 0, F = 0;
  for (let k = 1; k < n; k++) {
    const u = k * du, { nascita: I, crescita: G } = tammann(u);
    H += G * du; S0 += I * du; S1 += I * H * du; S2 += I * H * H * du; F = Math.PI * (H * H * S0 - 2 * H * S1 + S2);
    if (r && F > 0.01 * r3) return u;
  }
  return r ? 1 : F;
}
const CRITICO = Math.cbrt(decollo(0) / 0.01);
// raffreddamento si misura in unità di quella velocità critica: sopra 1 resta solo vetro
export const sottoraffreddamento = (raffreddamento) => decollo(Math.max(1e-9, raffreddamento) * CRITICO);
// i minerali: colori e forme sono quelli osservati (dati, non regole). L'anisotropia dice
// quanto il cristallo cresce più in fretta lungo un asse: 0 = tozzo (quarzo, olivina),
// 1 = listelle e lamelle 4:1 (plagioclasio, mica).
export const GRANITO = [
  { nome: 'quarzo', frazione: 0.3, colore: [206, 204, 200], anisotropia: 0 },
  { nome: 'feldspato potassico', frazione: 0.35, colore: [222, 168, 148], anisotropia: 0.25 },
  { nome: 'plagioclasio', frazione: 0.25, colore: [238, 234, 224], anisotropia: 0.5 },
  { nome: 'biotite', frazione: 0.1, colore: [48, 40, 36], anisotropia: 0.9 },
];
export const BASALTO = [
  { nome: 'plagioclasio', frazione: 0.5, colore: [150, 154, 158], anisotropia: 0.9 },
  { nome: 'pirosseno', frazione: 0.35, colore: [46, 50, 46], anisotropia: 0.3 },
  { nome: 'olivina', frazione: 0.1, colore: [120, 136, 58], anisotropia: 0 },
  { nome: 'magnetite', frazione: 0.05, colore: [20, 20, 24], anisotropia: 0 },
];
export const VETRO = 255; // il valore di «minerale» dove il fuso è rimasto vetro

// raffreddamento: velocità in unità di quella critica di vetrificazione (un numero puro).
// Ordini di grandezza: 0,001 = un plutone in profondità (granito), 0,1 = una colata (basalto),
// 0,5 = microliti nel vetro, da 1 in su = lava nell'acqua (ossidiana).
export function cristallizza({ N = 192, raffreddamento = 0.01, minerali = GRANITO, seme = 1 } = {}) {
  const caso = comeSorgente(seme, 'cristalli'), n2 = N * N, M = minerali.length, meta = N / 2;
  const tot = minerali.reduce((a, m) => a + m.frazione, 0) || 1, f = minerali.map((m) => m.frazione / tot);
  const r = Math.max(1e-9, raffreddamento) * CRITICO, u = decollo(r), { nascita: I, crescita: G } = tammann(u);
  const grano = new Int32Array(n2).fill(-1), minerale = new Uint8Array(n2).fill(VETRO), frazioneNelTempo = [];
  // i cristalli: dove sono nati, come sono girati, di che minerale, e quanto «raggio» aveva il loro minerale alla nascita
  const gx = [], gy = [], gc = [], gs = [], gl = [], gt = [], gw = [], gm = [], g0 = [], orientamento = [];
  const fine = (passo) => {
    const nGrani = gx.length, solido = n2 - liquido, quota = new Array(M).fill(0);
    for (let i = 0; i < n2; i++) if (grano[i] >= 0) { minerale[i] = gm[grano[i]]; quota[gm[grano[i]]]++; }
    return { tipo: 'cristalli', N, grano, minerale, minerali, nGrani, orientamento: Float32Array.from(orientamento), mineraleDelGrano: Uint8Array.from(gm),
      // il grano medio: il diametro del cerchio che ha l'area media di un cristallo, in celle
      granoMedio: nGrani ? 2 * Math.sqrt(solido / nGrani / Math.PI) : 0,
      frazioneNelTempo, passo, invaso, sottoraffreddamento: u, cristallino: solido / n2, vetro: liquido / n2, frazioni: quota.map((q) => (solido ? q / solido : 0)) };
  };
  let liquido = n2, invaso = false;
  if (!(G > 0) || !(I > 0)) return fine(0); // arrivato al vetro senza cristallizzare
  // IL PLATEAU. Quando i cristalli decollano, il calore latente che liberano compensa quello
  // che esce: la temperatura resta quasi ferma finché c'è fuso. Per questo nascita I e
  // crescita G restano costanti, ed è il caso in cui vale la legge di Johnson-Mehl-Avrami:
  // frazione solida X(t) = 1 − exp(−(π/3)·I·G²·t³) (in sezione, cioè in due dimensioni: esponente 3).
  // Il plateau dura al più il tempo che resta prima del vetro: ciò che avanza resta vetro.
  const aspetto = minerali.map((m) => 1 + 3 * limita(m.anisotropia || 0, 0, 1)), vmax = 2 * Math.sqrt(Math.max(...aspetto));
  const dt = 1 / (G * vmax), passi = Math.floor((1 - u) / r / dt); // il passo di tempo: nessun fronte avanza più di una cella
  // Se i cristalli sono molto più grandi del quadro, nel quadro può non nascerne nessuno per tantissimo tempo: si salta
  // l'attesa fino al primo germe. E se il resto della roccia fa in tempo a solidificare prima (1,7 tempi di Avrami),
  // il quadro viene invaso da un cristallo nato fuori: lo si fa nascere in un punto a caso.
  const perPasso = I * dt * n2, pieno = (1.7 * Math.cbrt(3 / (Math.PI * I * G * G))) / dt;
  let attesa = perPasso < 0.05 ? Math.floor(-Math.log(1 - caso('attesa del primo germe')) / perPasso) : 0;
  if (attesa >= pieno && pieno < passi) { attesa = Math.floor(pieno); invaso = true; }
  if (attesa >= passi) return fine(dt); // il vetro arriva prima del primo germe
  const area = new Float64Array(M), R = new Float64Array(M), vel = new Float64Array(M), conc = new Float64Array(M), marca = new Int32Array(n2).fill(-1);
  // la distanza «a modo del cristallo»: più corta lungo l'asse veloce; le facce piane vengono dal fatto
  // che un cristallo avanza più lento di fronte alle sue facce dense (miscela fra cerchio e rettangolo)
  const distanza = (g, c) => {
    let dx = (c % N) - gx[g], dy = ((c / N) | 0) - gy[g]; if (dx > meta) dx -= N; else if (dx < -meta) dx += N; if (dy > meta) dy -= N; else if (dy < -meta) dy += N;
    const a = Math.abs(dx * gc[g] + dy * gs[g]) * gl[g], b = Math.abs(dy * gc[g] - dx * gs[g]) * gt[g], e = Math.sqrt(a * a + b * b);
    return gw[g] ? e + gw[g] * (1.13 * Math.max(a, b) - e) : e;
  };
  let coda = [];
  const vicini = (c, lista) => { const x = c % N, y = (c - x) / N; lista.push(y * N + (x + 1) % N, y * N + (x + N - 1) % N, ((y + 1) % N) * N + x, ((y + N - 1) % N) * N + x); };
  const quattro = [];
  for (let k = Math.min(attesa, 2000); k > 0; k--) frazioneNelTempo.push(0);
  for (let passo = attesa; passo < passi && liquido > 0; passo++) {
    // IL FUSO HA UNA COMPOSIZIONE. Ogni minerale consuma i suoi ingredienti: se ne ha già presi più della sua
    // parte, il fuso ne è povero e lui rallenta (e ne nascono meno); gli altri accelerano. Così le proporzioni
    // finali sono quelle della ricetta, e gli ultimi arrivati riempiono gli interstizi.
    let sc = 0;
    for (let k = 0; k < M; k++) { conc[k] = Math.max(0, f[k] * n2 - area[k]) / liquido; sc += conc[k]; vel[k] = limita(conc[k] / f[k], 0.1, 2); R[k] += vel[k] / vmax; }
    // NASCITA: germi a caso nello spazio; quelli che cadono nel già solido non nascono (i «fantasmi» di Avrami)
    for (let k = passo === attesa && attesa ? 1 : poisson(perPasso, caso.serie(`passo ${passo}/germi`)); k > 0; k--) {
      const germe = caso.serie(`passo ${passo}/germe ${k}`), c = (germe(0) * n2) | 0, giro = germe(1) * Math.PI, dado = germe(2) * sc;
      if (grano[c] >= 0) continue;
      let m = 0, acc = conc[0]; while (m < M - 1 && dado > acc) acc += conc[++m];
      const al = Math.sqrt(aspetto[m]), g = gx.length;
      gx.push(c % N); gy.push((c / N) | 0); gc.push(Math.cos(giro)); gs.push(Math.sin(giro)); gl.push(1 / al); gt.push(al); gw.push(limita(minerali[m].anisotropia || 0, 0, 1)); gm.push(m); g0.push(R[m]); orientamento.push(giro);
      grano[c] = g; area[m]++; liquido--; vicini(c, coda);
    }
    // CRESCITA: una cella di fuso che tocca un cristallo ne entra a far parte quando il suo fronte la raggiunge
    const prossima = [];
    for (let i = 0; i < coda.length; i++) {
      const c = coda[i]; if (grano[c] >= 0) continue;
      quattro.length = 0; vicini(c, quattro);
      let chi = -1, margine = -1;
      for (let j = 0; j < 4; j++) { const g = grano[quattro[j]]; if (g < 0 || g === chi) continue; const mg = R[gm[g]] - g0[g] - distanza(g, c); if (mg > margine) { margine = mg; chi = g; } }
      if (chi >= 0 && margine >= 0) { grano[c] = chi; area[gm[chi]]++; liquido--; for (let j = 0; j < 4; j++) if (grano[quattro[j]] < 0) coda.push(quattro[j]); }
      else if (marca[c] !== passo) { marca[c] = passo; prossima.push(c); }
    }
    coda = prossima;
    frazioneNelTempo.push(1 - liquido / n2);
  }
  return fine(dt);
}

// LO STESSO RISULTATO IN FORMA CHIUSA, quando servono solo i numeri (la taglia dei cristalli, quanto è cristallino, quanto vetro,
// quanti grani): sul plateau nascita I e crescita G sono costanti, e vale Johnson-Mehl-Avrami in sezione,
// X(t) = 1 − exp(−(π/3)·I·G²·t³), fino al tempo del vetro t_v = (1 − u)/r; i grani per cella sono quelli nati nel fuso che
// restava, ν = ∫₀^t_v I·(1 − X) dt (Johnson e Mehl 1939; Avrami 1939). Non dipende dal quadro di N×N celle (la simulazione,
// quando i cristalli sono più grandi del quadro, ne vede uno solo, nato fuori): il grano medio è 2·√(X/(π·ν)) celle.
// Costa meno di un millisecondo (la simulazione 1,6–3 s). → { tipo: 'cristalli', N, minerali, granoMedio, cristallino, vetro,
// nGrani (attesi nel quadro), sottoraffreddamento, chiusa: true }, oppure null se il fuso resta vetro (lì serve l'immagine)
export function cristallizzaChiusa({ N = 192, raffreddamento = 0.01, minerali = GRANITO } = {}) {
  const r = Math.max(1e-9, raffreddamento) * CRITICO, u = decollo(r), { nascita: I, crescita: G } = tammann(u);
  if (!(G > 0) || !(I > 0)) return null;
  const tv = (1 - u) / r, tA = Math.cbrt(3 / (Math.PI * I * G * G)), t1 = Math.min(tv, 6 * tA), n = 2000, X = (t) => 1 - Math.exp(-(Math.PI / 3) * I * G * G * t * t * t);
  let nu = 0; for (let q = 0; q < n; q++) { const t = ((q + 0.5) / n) * t1; nu += I * (1 - X(t)) * (t1 / n); }
  const Xv = X(tv); if (!(Xv > 1e-6) || !(nu > 0)) return null;
  return { tipo: 'cristalli', N, minerali, granoMedio: 2 * Math.sqrt(Xv / (Math.PI * nu)), cristallino: Xv, vetro: 1 - Xv, nGrani: Math.max(1, Math.round(nu * N * N)), sottoraffreddamento: u, chiusa: true };
}

// =====================================================================================
// 2. IL FIOCCO DI NEVE
// =====================================================================================
// Le molecole d'acqua nel ghiaccio si legano a 120°: il reticolo è esagonale, e da lì
// viene la simmetria a sei. L'automa (Reiter 2005, della famiglia di Packard) vive su
// celle esagonali; ognuna ha una quantità d'acqua s, ed è ghiaccio quando s ≥ 1.
//   · il vapore DIFFONDE fra le celle libere (media con le sei vicine, forza alfa);
//   · le celle che toccano il ghiaccio non lo lasciano più andare: lo accumulano, più
//     un piccolo apporto gamma che arriva da sopra e da sotto il piano del cristallo;
//   · lontano, l'aria ha un livello di vapore beta.
// Una punta sporge nel vapore fresco e ne riceve di più: cresce più in fretta e sporge
// ancora di più (instabilità di Mullins-Sekerka). Da qui i rami; con molto vapore
// ovunque (beta, gamma alti) la gara non c'è e resta una piastra piena.
//
// LEGGE MISURATA (dichiarata): il diagramma di NAKAYA (1954; Libbrecht 2005). La forma
// dipende da temperatura ed eccesso di vapore: le stelle ramificate vengono vicino a
// −15 °C e con molta umidità; con poca, o a temperature lontane da lì, piastre (e fra
// −4 e −10 °C colonne, che viste lungo l'asse sono piccoli esagoni). Qui lega (T, umidità)
// ai parametri dell'automa: la «ramificazione» b fra 0 e 1.
// L'eccesso di vapore invece si calcola: è la differenza fra il vapore che l'aria contiene
// (umidità × saturazione sull'acqua liquida) e quello in equilibrio col ghiaccio, con le
// formule di Magnus per le due pressioni di saturazione (fit EMPIRICI, WMO). È massimo
// proprio fra −12 e −15 °C (0,22 g/m³): metà della ragione per cui le stelle vengono lì.
export function nakaya(T, umidita) {
  const t = T - ZERO_CELSIUS, eAcqua = 611.2 * Math.exp((17.62 * t) / (243.12 + t)), eGhiaccio = 611.2 * Math.exp((22.46 * t) / (272.62 + t));
  const eccesso = (1000 * (umidita * eAcqua - eGhiaccio)) / ((R_GAS / MOLARE_ACQUA) * T); // g/m³ di vapore oltre l'equilibrio col ghiaccio
  // la finestra delle forme piatte e ramificate: attorno a −15 °C (e una stretta, più debole, vicino a −2 °C)
  const finestra = Math.exp(-(((t + 15) / 5.5) ** 2)) + 0.45 * Math.exp(-(((t + 2) / 1.5) ** 2));
  const b = limita((eccesso / 0.2) * finestra, 0, 1);
  // nell'automa conta quanta parte del vapore arriva «da fuori piano», uguale per tutti (gamma), rispetto a quella
  // che deve diffondere nel piano e premia le punte: tanta = piastra, poca = rami. Taratura sul diagramma.
  return { eccesso, ramificazione: b, alfa: 1, beta: 0.6, gamma: 0.1 * Math.pow(0.03, b * b) };
}

// T in kelvin; umidita relativa all'acqua liquida (1 = dentro una nube). parametri = { alfa, beta, gamma } per forzare l'automa.
// celle = raggio del fiocco in celle esagonali: il fiocco è sempre lo stesso oggetto, N è solo la finezza dell'immagine.
export function fioccoDiNeve({ N = 192, T = 258, umidita = 1, seme = 1, parametri = null, celle = 59 } = {}) {
  const caso = comeSorgente(seme, 'fiocco'), nk = nakaya(T, umidita), { alfa, beta, gamma } = { ...nk, ...(parametri || {}) };
  // il fiocco cresce fino a Rf celle; l'aria «lontana» sta a Rc. Regole e germe sono simmetrici, quindi il
  // risultato lo è per forza: si calcola un solo spicchio (un dodicesimo: q ≥ r ≥ 0) e i vicini fuori dallo
  // spicchio si leggono nelle celle specchiate. È un risparmio di calcolo, non una simmetria imposta alla fisica.
  const Rf = Math.max(8, Math.round(celle)), Rc = Math.ceil(1.45 * Rf), L = Rc + 3;
  const canonica = (q, r) => { let a = q, b = r, c = -q - r, s; if (a < b) { s = a; a = b; b = s; } if (b < c) { s = b; b = c; c = s; } if (a < b) { s = a; a = b; b = s; } return b >= 0 ? a * L + b : -c * L - b; };
  const indice = new Int32Array(L * L).fill(-1), cq = [], cr = [];
  for (let q = 0; q < L; q++) for (let r = 0; r <= q; r++) if (q * q + q * r + r * r <= (Rc + 1.5) ** 2) { indice[q * L + r] = cq.length; cq.push(q); cr.push(r); }
  const n = cq.length, vic = new Int32Array(n * 6), libera = new Uint8Array(n), raggio2 = new Float32Array(n), interne = [];
  for (let i = 0; i < n; i++) {
    const q = cq[i], r = cr[i]; raggio2[i] = q * q + q * r + r * r; libera[i] = raggio2[i] <= Rc * Rc ? 1 : 0;
    if (libera[i]) { interne.push(i); [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]].forEach(([a, b], k) => { vic[i * 6 + k] = indice[canonica(q + a, r + b)]; }); }
  }
  const s = new Float32Array(n).fill(beta), s2 = new Float32Array(n), u = new Float32Array(n), ghiaccioS = new Uint8Array(n), tocca = new Uint8Array(n), eta = new Float32Array(n), ni = interne.length;
  const gela = (i, quando) => { ghiaccioS[i] = 1; tocca[i] = 1; eta[i] = quando; for (let k = 0; k < 6; k++) tocca[vic[i * 6 + k]] = 1; };
  s[0] = 1; gela(0, 0); // il germe: un granello di polvere al centro
  // mentre cresce il fiocco cade attraverso strati d'aria un po' diversi: il vapore oscilla nel tempo, uguale
  // per tutti e sei i rami. Per questo ogni fiocco è unico e resta simmetrico. (Il seme sceglie la storia.)
  const onde = [0, 1, 2].map((k) => { const onda = caso.serie(`aria/onda ${k}`); return [0.05 / (k + 1), (2 + 3 * k + 2 * onda(0)) * Math.PI, 2 * Math.PI * onda(1)]; });
  let estensione2 = 0, passo = 0;
  // se l'aria non è nemmeno satura rispetto al ghiaccio (eccesso ≤ 0) il germe non cresce affatto
  const maxPassi = !parametri && nk.eccesso <= 0 ? 0 : 20000, Rf2 = Rf * Rf;
  for (; passo < maxPassi && estensione2 < Rf2; passo++) {
    const avanzamento = Math.sqrt(estensione2) / Rf; let meteo = 1; for (const [amp, freq, fase] of onde) meteo += amp * Math.sin(freq * avanzamento + fase);
    const b = Math.min(0.98, beta * meteo), g = gamma * meteo * meteo * meteo, meta = alfa / 2;
    for (let i = 0; i < n; i++) u[i] = tocca[i] ? 0 : libera[i] ? s[i] : b; // il vapore libero: quello delle celle che non toccano il ghiaccio
    for (let k = 0; k < ni; k++) {
      const i = interne[k], j = i * 6, media = (u[vic[j]] + u[vic[j + 1]] + u[vic[j + 2]] + u[vic[j + 3]] + u[vic[j + 4]] + u[vic[j + 5]]) / 6;
      s2[i] = tocca[i] ? s[i] + g + meta * media : u[i] + meta * (media - u[i]);
    }
    for (let k = 0; k < ni; k++) { const i = interne[k]; s[i] = s2[i]; if (!ghiaccioS[i] && s2[i] >= 1) { gela(i, passo + 1); if (raggio2[i] > estensione2) estensione2 = raggio2[i]; } }
  }
  // CHE FORMA È: lo si misura sul risultato, non sui parametri (le soglie sono solo i nomi che diamo alle forme).
  //   «rami» = quanta parte del ghiaccio sta sul bordo: quasi tutto, se è fatto di rametti sottili → dendrite;
  //   «frastaglio» = lunghezza del bordo rispetto a quello di un esagono pieno della stessa area: vicino a 1–2 → piastra;
  //   in mezzo (sei bracci larghi, piastre a settori) → stella.
  //   «pienezza» = area rispetto all'esagono entro cui sta il 95% del ghiaccio (1,2 = esagono pieno).
  let areaG = 0, bordo = 0, rMax2 = 0; const anelli = new Float64Array(L + 1);
  for (let i = 0; i < n; i++) if (ghiaccioS[i]) {
    const peso = !cq[i] ? 1 : !cr[i] || cq[i] === cr[i] ? 6 : 12; areaG += peso; anelli[Math.floor(Math.sqrt(raggio2[i]))] += peso; if (raggio2[i] > rMax2) rMax2 = raggio2[i]; // peso: quante volte lo spicchio ripete la cella
    for (let k = 0; k < 6; k++) if (!ghiaccioS[vic[i * 6 + k]]) { bordo += peso; break; }
  }
  let r95 = 0; for (let dentro = 0; r95 < L && dentro < 0.95 * areaG; r95++) dentro += anelli[r95];
  const pienezza = areaG / Math.max(1, 3 * r95 * r95), rami = bordo / Math.max(1, areaG), frastaglio = bordo / Math.max(1, 6 * Math.sqrt(areaG / 3));
  const forma = areaG < 19 ? 'piastra' : rami > 0.45 ? 'dendrite' : frastaglio < 3 ? 'piastra' : 'stella'; // il germe che non cresce è un prisma esagonale minuscolo
  // dallo spicchio all'immagine: ogni punto del quadrato N×N guarda (in nove punti) le celle esagonali in cui cade
  const ghiaccio = new Uint8Array(N * N), copertura = new Float32Array(N * N), quando = new Float32Array(N * N), passoCella = (0.46 * N) / Rf, r3 = Math.sqrt(3);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let quanti = 0, e = 0;
    for (let k = 0; k < 9; k++) {
      const X = (x + ((k % 3) + 0.5) / 3 - N / 2) / passoCella, Y = (y + (((k / 3) | 0) + 0.5) / 3 - N / 2) / passoCella, rf = (Y * 2) / r3, qf = X - rf / 2;
      let a = Math.round(qf), bq = Math.round(rf); const c = Math.round(-qf - rf), da = Math.abs(a - qf), db = Math.abs(bq - rf), dc = Math.abs(c + qf + rf);
      if (da > db && da > dc) a = -bq - c; else if (db > dc) bq = -a - c;
      if (Math.max(Math.abs(a), Math.abs(bq), Math.abs(a + bq)) >= L) continue;
      const i = indice[canonica(a, bq)]; if (i >= 0 && ghiaccioS[i]) { quanti++; e += 1 - eta[i] / Math.max(1, passo); }
    }
    const k = y * N + x; copertura[k] = quanti / 9; ghiaccio[k] = quanti >= 5 ? 1 : 0; quando[k] = quanti ? e / quanti : 0;
  }
  return { tipo: 'fiocco', N, ghiaccio, copertura, eta: quando, forma, pienezza, rami, frastaglio, passi: passo, raggio: Math.sqrt(rMax2) * passoCella, eccesso: nk.eccesso, ramificazione: nk.ramificazione, parametri: { alfa, beta, gamma } };
}

// =====================================================================================
// 3. IL SEDIMENTO
// =====================================================================================
// Una corrente porta granelli. Quali si posano qui e ora lo decidono due soglie:
//   · la COMPETENZA: la corrente smuove un granello sul fondo solo se lo sforzo che
//     esercita (∝ velocità²) vince il suo peso: diametro massimo ∝ energia²
//     (criterio di Shields: la soglia è una costante MISURATA, θ ≈ 0,045);
//   · la SOSPENSIONE: i granelli che cadono più lenti di quanto la turbolenza li
//     rimescoli restano in volo e passano oltre. La caduta dei fini segue Stokes
//     (velocità ∝ diametro²): diametro minimo ∝ √energia.
// Fra le due soglie sta ciò che si posa. Con molta energia la fascia è larga (dal
// granulo al ciottolo: mal selezionato), con poca è stretta e bassa (limo ben
// selezionato): la selezione EMERGE dalle due leggi di potenza.
// L'energia poi cambia nel tempo (piene e magre): ogni periodo lascia la sua lamina.
// IPOTESI dichiarata: gli ambienti energici sono anche i più incostanti (torrenti,
// tempeste), quelli calmi i più regolari (laghi, fondali): osservato, non derivato.
// Sezione verticale: il tempo va dal basso (riga N−1) verso l'alto. energia fra 0 (acqua quasi ferma)
// e 1 (piena); grano = −1 dove fra i granelli restano pori e fango.
export function sedimento({ N = 192, energia = 0.5, seme = 1 } = {}) {
  const caso = comeSorgente(seme, 'sedimento'), corrente = caso.serie('corrente'), E = limita(energia, 0.02, 1.5), n2 = N * N;
  const grano = new Int32Array(n2).fill(-1), quota = new Float32Array(N), diam = [], specie = [], energiaNelTempo = [];
  const COMPETENZA = 24, SOSPENSIONE = 2.6, incostanza = 0.09 + 0.3 * E;
  // la memoria della corrente: una lamina è spessa una quindicina di celle (o un solo evento, se i granelli sono più grossi di così)
  const ricordo = Math.exp(-Math.max(1, 0.6 * COMPETENZA * E * E) / 14);
  let x = 0, sommaArea = 0, sommaD = 0, sommaL = 0, sommaL2 = 0, minimo = 0, tentativi = 0, momento = 0;
  const altezzaDi = (cx, a, b) => { let top = 0; for (let i = Math.floor(cx - a); i <= Math.floor(cx + a); i++) { const o = (i + 0.5 - cx) / a; if (o * o >= 1) continue; const q = quota[((i % N) + N) % N] + b * Math.sqrt(1 - o * o); if (q > top) top = q; } return top; };
  while (minimo < N && tentativi < 60 * n2) {
    // l'energia di questo momento: oscilla attorno alla media con una memoria (processo di Ornstein-Uhlenbeck sul logaritmo)
    x = ricordo * x + incostanza * Math.sqrt(1 - ricordo * ricordo) * campana(corrente, 2 * momento++); // (la corrente, momento per momento: le estrazioni dell'evento «corrente»)
    const e = E * Math.exp(x), dMax = Math.min(N / 3, COMPETENZA * e * e), dMin = Math.min(SOSPENSIONE * Math.sqrt(e), 0.7 * dMax), lMin = Math.log(dMin), lMax = Math.log(dMax);
    energiaNelTempo.push(e);
    // in questo intervallo si posa uno straterello spesso circa un granello
    for (let posato = 0, daPosare = N * Math.max(1, 0.6 * dMax); posato < daPosare && tentativi < 60 * n2; tentativi++) {
      const granello = caso.serie(`granello ${tentativi}`), d = Math.exp(lMin + (lMax - lMin) * granello(0)), cx0 = granello(1) * N, id = diam.length;
      // di che cosa è fatto: più lungo e calmo è il viaggio, più resta solo il quarzo, che resiste (maturità: OSSERVATA)
      const dado = granello(2), sp = dado < 0.08 + 0.3 * Math.min(1, E) ? 2 : dado < 0.3 + 0.4 * Math.min(1, E) ? 1 : 0;
      const peso = Math.max(1, d) ** 2; posato += peso; // quanto posto occupa nella sezione
      if (d < 1.5) {
        // sotto la cella i granelli non si distinguono: ognuno occupa una cella, nel punto più basso lì vicino
        let i = Math.floor(cx0); const s = (i + 1) % N, p = (i + N - 1) % N; if (quota[s] < quota[i]) i = s; if (quota[p] < quota[i]) i = p;
        const j = Math.floor(quota[i]); quota[i] = j + 1; if (j >= N) continue;
        grano[(N - 1 - j) * N + i] = id;
      } else {
        // un granello arrotondato dal trasporto, un po' schiacciato, che si corica sul lato lungo e rotola nell'incavo più vicino
        const schiaccia = 1 + 0.5 * granello(3), a = (d / 2) * Math.sqrt(schiaccia), b = d / 2 / Math.sqrt(schiaccia);
        let cx = cx0, top = altezzaDi(cx0, a, b);
        for (let k = 0, salto = Math.max(0.5, a / 3); k < 16; k++) { const s = altezzaDi(cx - salto, a, b), d2 = altezzaDi(cx + salto, a, b); if (Math.min(s, d2) >= top - 1e-6) break; if (s < d2) { top = s; cx -= salto; } else { top = d2; cx += salto; } }
        if (top - b >= N) { for (let i = Math.floor(cx - a); i <= Math.floor(cx + a); i++) { const k = ((i % N) + N) % N; quota[k] = Math.max(quota[k], N); } continue; }
        for (let i = Math.floor(cx - a); i <= Math.floor(cx + a); i++) {
          const o = (i + 0.5 - cx) / a; if (o * o >= 1) continue;
          const mezza = b * Math.sqrt(1 - o * o), k = ((i % N) + N) % N;
          for (let j = Math.max(0, Math.round(top - mezza)); j < Math.min(N, Math.round(top + mezza)); j++) { const c = (N - 1 - j) * N + k; if (grano[c] < 0) grano[c] = id; }
          quota[k] = Math.max(quota[k], top + mezza);
        }
      }
      diam.push(d); specie.push(sp); sommaArea += peso; sommaD += peso * d; sommaL += peso * Math.log2(d); sommaL2 += peso * Math.log2(d) ** 2;
    }
    minimo = Infinity; for (let i = 0; i < N; i++) if (quota[i] < minimo) minimo = quota[i];
  }
  // la grana di ogni riga (per vedere le lamine) e le due misure dei sedimentologi, pesate sulla massa:
  // la grana media e la «selezione» (scarto del logaritmo in base 2: < 0,5 ben selezionato, > 1 mal selezionato)
  const granaPerRiga = new Float32Array(N), diametri = Float32Array.from(diam);
  for (let j = 0; j < N; j++) { let sl = 0, k = 0; for (let i = 0; i < N; i++) { const g = grano[j * N + i]; if (g >= 0) { sl += Math.log(diametri[g]); k++; } } granaPerRiga[j] = k ? Math.exp(sl / k) : 0; }
  const mediaL = sommaL / sommaArea;
  return { tipo: 'sedimento', N, grano, diametri, specie: Uint8Array.from(specie), nGranelli: diam.length, granaMedia: sommaD / sommaArea, selezione: Math.sqrt(Math.max(0, sommaL2 / sommaArea - mediaL * mediaL)), granaPerRiga, energiaNelTempo, energia: E };
}

// =====================================================================================
// 4. LE FRATTURE DA CONTRAZIONE
// =====================================================================================
// Uno strato che si raffredda o secca vorrebbe restringersi, ma è attaccato a ciò che
// sta sotto: resta in TRAZIONE, uguale in tutte le direzioni, e la trazione cresce nel
// tempo. Dove supera la resistenza di un difetto nasce una crepa, che corre.
//   · Una crepa SCARICA la trazione ai suoi lati, fino a una distanza h dell'ordine
//     dello spessore dello strato (σ = σ₀·(1 − e^(−d/h)), dal modello «shear-lag»;
//     qui troncata a 1,6·h, oltre cui la trazione è piena): vicino a una crepa non
//     ne nascono altre, in mezzo a un pezzo grande sì.
//   · Accanto a una crepa resta solo la trazione PARALLELA ad essa: perciò una crepa
//     che si avvicina a un'altra curva e la incontra ad angolo retto (giunti a T), e
//     lì si ferma. Lontano da tutto corre dritta, deviando appena per i difetti.
//   · La resistenza dei difetti segue la statistica di WEIBULL (legge EMPIRICA della
//     rottura dei materiali fragili).
// Lo spessore h dello strato già freddo quando comincia a rompersi è tanto maggiore
// quanto più lenta è la contrazione (il freddo penetra come √tempo): h ∝ 1/√sforzo.
// Contrazione lenta = poligoni larghi; rapida = stretti (colonnato e «entablature»).
// POI IL FRONTE AVANZA. Nelle colonne di basalto le crepe scendono a scatti dentro la
// roccia che si raffredda. A ogni scatto ogni colonna si contrae verso il proprio
// baricentro, e la crepa nuova si apre dove la trazione fra due colonne è massima: a
// metà strada (modello di Budkewitsch e Robin, 1994). I giunti a T diventano a Y e i
// poligoni si regolarizzano verso l'esagono. IPOTESI del modello: più la contrazione è
// lenta, più scatti di assestamento (maturazione ≈ 2,5/sforzo − 2,5; si può forzare).
// Un fango che secca una volta sola non matura: maturazione 0.
// sforzo: velocità di contrazione, fra 0,05 (lenta) e 2 (brusca).
const H_CREPE = 11; // la distanza di scarico, in celle, quando sforzo = 1 (sceglie solo l'inquadratura)
export function fratture({ N = 192, sforzo = 0.5, seme = 1, maturazione = null, colore = [78, 76, 80] } = {}) {
  const caso = comeSorgente(seme, 'fratture'), S = limita(sforzo, 0.05, 2), n2 = N * N, meta = N / 2;
  const h = limita(H_CREPE / Math.sqrt(S), 3, N / 6), Rmax = Math.min(N / 2 - 1, 1.6 * h), sonda = limita(0.6 * h, 3, 14), ogni = Math.max(1, Math.floor(sonda / 2));
  const crepe = new Uint8Array(n2), chi = new Int32Array(n2).fill(-1), quando = new Int32Array(n2), dist = new Float64Array(n2).fill(1e9), vic = new Int32Array(n2).fill(-1);
  const avvolgi = (d) => (d > meta ? d - N : d < -meta ? d + N : d), mod = (i) => ((i % N) + N) % N;
  const OTTO_X = [1, -1, 0, 0, 1, 1, -1, -1], OTTO_Y = [0, 0, 1, -1, 1, -1, 1, -1], nuove = [], fila = [];
  let cap = 1; while (cap < 4 * n2) cap *= 2;
  const anello = new Int32Array(cap), maschera = cap - 1; // una fila ad anello
  const segna = (c, id, passo) => { crepe[c] = 1; chi[c] = id; quando[c] = passo; dist[c] = 0; vic[c] = c; nuove.push(c); };
  // aggiorna, attorno alle celle appena rotte, «quanto dista la crepa più vicina e qual è»: un fronte che si allarga da tutte insieme
  const aggiorna = () => {
    let testa = 0, coda = 0; for (let i = 0; i < nuove.length; i++) anello[coda++ & maschera] = nuove[i]; nuove.length = 0;
    while (testa < coda) {
      const p = anello[testa++ & maschera], px = p % N, py = (p - px) / N, o = vic[p], ox = o % N, oy = (o - ox) / N;
      for (let k = 0; k < 8; k++) {
        let qx = px + OTTO_X[k], qy = py + OTTO_Y[k]; if (qx === N) qx = 0; else if (qx < 0) qx = N - 1; if (qy === N) qy = 0; else if (qy < 0) qy = N - 1;
        let dx = qx - ox, dy = qy - oy; if (dx > meta) dx -= N; else if (dx < -meta) dx += N; if (dy > meta) dy -= N; else if (dy < -meta) dy += N;
        const q = qy * N + qx, d = Math.sqrt(dx * dx + dy * dy);
        if (d < Rmax && d < dist[q]) { dist[q] = d; vic[q] = o; anello[coda++ & maschera] = q; }
      }
    }
  };
  // la resistenza di ogni punto (Weibull, modulo 6) e l'ordine in cui i punti cederebbero
  const resistenza = new Float32Array(n2), ordine = new Int32Array(n2), scarico = new Float32Array(Math.ceil(Rmax) + 2).map((_, d) => (1 - Math.exp(-d / h)) / (1 - Math.exp(-Rmax / h)));
  const debole = caso.serie('resistenza'); for (let i = 0; i < n2; i++) { resistenza[i] = Math.pow(-Math.log(1 - debole(i)), 1 / 6); ordine[i] = i; }
  ordine.sort((a, b) => resistenza[a] - resistenza[b]);
  const sigma0 = resistenza[ordine[0]], sigmaFine = 1, durata = Math.ceil(24 / S);
  const px = [], py = [], pf = [], pid = [], devia = []; let vive = [], nCrepe = 0, pronti = 0;
  const fatto = new Uint8Array(n2);
  for (let passo = 0; passo < durata + 8 * N && (passo <= durata || vive.length); passo++) {
    // NASCITA: la trazione sale; cede ogni punto dove quella rimasta (dopo lo scarico delle crepe vicine) supera la sua resistenza
    if (passo <= durata) {
      const sigma = sigma0 + ((sigmaFine - sigma0) * passo) / durata;
      while (pronti < n2 && resistenza[ordine[pronti]] <= sigma) pronti++;
      for (let k = 0; k < pronti; k++) {
        const c = ordine[k]; if (fatto[c]) continue; if (crepe[c]) { fatto[c] = 1; continue; }
        const d = dist[c]; if (sigma * (d >= Rmax ? 1 : scarico[d | 0]) < resistenza[c]) continue;
        // la direzione: perpendicolare alla trazione più forte. Vicino a una crepa quella è parallela alla crepa, quindi si parte verso di lei; lontano, a caso
        let fi; if (d >= Rmax) fi = caso(`crepa da ${c}/direzione`) * Math.PI; else { const v = vic[c]; fi = Math.atan2(avvolgi(((v / N) | 0) - ((c / N) | 0)), avvolgi((v % N) - (c % N))); }
        fatto[c] = 1; const id = nCrepe++; segna(c, id, passo); aggiorna();
        for (const verso of [0, Math.PI]) { vive.push(px.length); px.push((c % N) + 0.5); py.push(((c / N) | 0) + 0.5); pf.push(fi + verso); pid.push(id); devia.push(caso.serie(`punta ${px.length - 1}/deviazioni`)); }
      }
    }
    // PROPAGAZIONE: ogni punta avanza di una cella. Da sola va dritta (deviando appena per i difetti); se davanti a sé sente
    // un'altra crepa, la trazione lì è rimasta solo lungo quella: la punta ruota fino a mettersi perpendicolare ad essa
    const ancora = [];
    for (const t of vive) {
      const sx = mod(Math.floor(px[t] + sonda * Math.cos(pf[t]))), sy = mod(Math.floor(py[t] + sonda * Math.sin(pf[t]))), s = sy * N + sx, v = vic[s];
      if (v >= 0 && dist[s] < sonda - 1 && (chi[v] !== pid[t] || passo - quando[v] > meta)) {
        let svolta = Math.atan2(avvolgi(((v / N) | 0) - sy), avvolgi((v % N) - sx)) - pf[t]; svolta = Math.atan2(Math.sin(2 * svolta), Math.cos(2 * svolta)) / 2;
        pf[t] += limita((svolta * Math.exp(-dist[s] / h) * 2.5) / sonda, -0.3, 0.3);
      }
      pf[t] += 0.025 * campana(devia[t], 2 * passo);
      const ox = Math.floor(px[t]), oy = Math.floor(py[t]); px[t] = (px[t] + Math.cos(pf[t]) + N) % N; py[t] = (py[t] + Math.sin(pf[t]) + N) % N;
      const nx = Math.floor(px[t]), ny = Math.floor(py[t]);
      if (nx === ox && ny === oy) { ancora.push(t); continue; }
      if (nx !== ox && ny !== oy) { const lato = oy * N + nx; if (crepe[lato]) continue; segna(lato, pid[t], passo); } // in diagonale si passa per la cella di lato: la crepa non lascia varchi
      const c = ny * N + nx; if (crepe[c]) continue; // ha incontrato un'altra crepa: si ferma lì (giunto a T)
      segna(c, pid[t], passo); ancora.push(t);
    }
    vive = ancora; if (passo % ogni === 0) aggiorna();
  }
  // i pezzi: le regioni chiuse dalle crepe (le schegge minuscole si sbriciolano nella crepa)
  let poligono = new Int32Array(n2).fill(-1), nP = 0; const cx = [], cy = [];
  for (let c0 = 0; c0 < n2; c0++) {
    if (crepe[c0] || poligono[c0] >= 0) continue;
    let cxs = 0, sxs = 0, cys = 0, sys = 0; fila.length = 0; fila.push(c0); poligono[c0] = nP;
    for (let testa = 0; testa < fila.length; testa++) {
      const p = fila[testa], x = p % N, y = (p / N) | 0, ax = (2 * Math.PI * (x + 0.5)) / N, ay = (2 * Math.PI * (y + 0.5)) / N; cxs += Math.cos(ax); sxs += Math.sin(ax); cys += Math.cos(ay); sys += Math.sin(ay);
      for (let k = 0; k < 4; k++) { const q = mod(y + OTTO_Y[k]) * N + mod(x + OTTO_X[k]); if (!crepe[q] && poligono[q] < 0) { poligono[q] = nP; fila.push(q); } }
    }
    if (fila.length < 8) { for (const p of fila) { poligono[p] = -1; crepe[p] = 1; } continue; }
    // il baricentro (su una griglia che si richiude: media degli angoli)
    cx.push(mod((Math.atan2(sxs, cxs) / (2 * Math.PI)) * N)); cy.push(mod((Math.atan2(sys, cys) / (2 * Math.PI)) * N)); nP++;
  }
  // MATURAZIONE: a ogni scatto del fronte le crepe si riformano a metà strada fra i baricentri delle colonne
  const scatti = Math.round(limita(maturazione ?? 2.5 / S - 2.5, 0, 40));
  if (scatti > 0 && nP > 1) {
    const nb = Math.max(1, Math.floor(N / Math.sqrt(n2 / nP))), lb = N / nb, zona = new Int32Array(n2), inizio = new Int32Array(nb * nb + 1), lista = new Int32Array(nP), sx = new Float64Array(nP), sy = new Float64Array(nP), sa = new Float64Array(nP);
    const secchio = (k) => Math.min(nb - 1, Math.floor(cy[k] / lb)) * nb + Math.min(nb - 1, Math.floor(cx[k] / lb));
    for (let giro = 0; giro <= scatti; giro++) {
      // i centri, ordinati per riquadro, così ogni punto cerca il suo solo fra quelli vicini
      inizio.fill(0); for (let k = 0; k < nP; k++) inizio[secchio(k) + 1]++;
      for (let b = 0; b < nb * nb; b++) inizio[b + 1] += inizio[b];
      const posto = inizio.slice(0, nb * nb); for (let k = 0; k < nP; k++) lista[posto[secchio(k)]++] = k;
      sx.fill(0); sy.fill(0); sa.fill(0);
      const salto = giro < scatti ? 2 : 1; // negli scatti intermedi basta un punto ogni quattro per trovare i baricentri
      for (let y = 0; y < N; y += salto) for (let x = 0; x < N; x += salto) {
        const X = x + 0.5, Y = y + 0.5, bx = Math.min(nb - 1, Math.floor(X / lb)), by = Math.min(nb - 1, Math.floor(Y / lb)); let meglio = -1, dm = 1e18, mx = 0, my = 0;
        for (let largo = 1; largo <= 2 && (meglio < 0 || dm > largo * lb * largo * lb - 1e-9) && 2 * largo + 1 <= nb; largo++) for (let j = -largo; j <= largo; j++) for (let i = -largo; i <= largo; i++) {
          const b = ((by + j + nb) % nb) * nb + ((bx + i + nb) % nb);
          for (let a = inizio[b]; a < inizio[b + 1]; a++) { const k = lista[a]; let dx = X - cx[k], dy = Y - cy[k]; if (dx > meta) dx -= N; else if (dx < -meta) dx += N; if (dy > meta) dy -= N; else if (dy < -meta) dy += N; const d = dx * dx + dy * dy; if (d < dm) { dm = d; meglio = k; mx = dx; my = dy; } }
        }
        if (meglio < 0 || dm > 4 * lb * lb || nb < 5) for (let k = 0; k < nP; k++) { const dx = avvolgi(X - cx[k]), dy = avvolgi(Y - cy[k]), d = dx * dx + dy * dy; if (d < dm) { dm = d; meglio = k; mx = dx; my = dy; } } // caso raro: il più vicino sta più in là
        zona[y * N + x] = meglio; sx[meglio] += mx; sy[meglio] += my; sa[meglio]++;
      }
      if (giro < scatti) for (let k = 0; k < nP; k++) if (sa[k]) { cx[k] = mod(cx[k] + sx[k] / sa[k]); cy[k] = mod(cy[k] + sy[k] / sa[k]); }
    }
    crepe.fill(0); poligono = zona;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const c = y * N + x; if (zona[c] !== zona[y * N + mod(x + 1)] || zona[c] !== zona[mod(y + 1) * N + x]) crepe[c] = 1; }
    for (let c = 0; c < n2; c++) if (crepe[c]) poligono[c] = -1;
  }
  // I LATI: un poligono ha tanti lati quanti sono i vicini che tocca attraverso una crepa (un giunto a T conta per tutti e tre).
  // Due pezzi sono vicini se almeno due celle di crepa li vedono entrambi (uno spigolo solo non basta).
  const coppie = new Map(), visti = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (!crepe[y * N + x]) continue; visti.length = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const p = poligono[mod(y + j) * N + mod(x + i)]; if (p >= 0 && !visti.includes(p)) visti.push(p); }
    for (let a = 0; a < visti.length; a++) for (let b = a + 1; b < visti.length; b++) { const k = Math.min(visti[a], visti[b]) * nP + Math.max(visti[a], visti[b]); coppie.set(k, (coppie.get(k) || 0) + 1); }
  }
  const lati = new Int32Array(nP); for (const [k, quante] of coppie) if (quante >= 2) { lati[Math.floor(k / nP)]++; lati[k % nP]++; }
  let somma = 0, esagoni = 0; for (let k = 0; k < nP; k++) { somma += lati[k]; if (lati[k] === 6) esagoni++; }
  return { tipo: 'fratture', N, crepe, poligono, nPoligoni: nP, lati, latiMedi: nP ? somma / nP : 0, frazioneEsagoni: nP ? esagoni / nP : 0, scala: h, maturazione: scatti, nCrepe, colore };
}

// =====================================================================================
// 5. LE IMMAGINI
// =====================================================================================
// Da un risultato qualunque dei quattro, N×N punti RGBA. I colori sono quelli dei
// materiali; i bordi fra un grano e l'altro sono più scuri (lì la luce si perde).
export function immagine(ris) {
  const N = ris.N, px = new Uint8ClampedArray(N * N * 4), dx = (k) => (k % N === N - 1 ? k + 1 - N : k + 1), giu = (k) => (k + N) % (N * N);
  for (let k = 0; k < N * N; k++) {
    let c;
    if (ris.tipo === 'cristalli') {
      const g = ris.grano[k];
      if (g < 0) { // il vetro: la stessa ricetta, scura e senza grana, con le striature del flusso
        const y = (k / N) | 0, v = 0.3 + 0.05 * Math.sin((y + 6 * Math.sin((k % N) / 17)) / 5); c = [0, 1, 2].map((i) => v * ris.minerali.reduce((a, m) => a + m.colore[i] * m.frazione, 0));
      } else {
        // a luce polarizzata ogni cristallo ha la sua tinta secondo come è girato
        const m = ris.minerali[ris.mineraleDelGrano[g]].colore, lume = (0.84 + 0.26 * tinta(g)) * (g !== ris.grano[dx(k)] || g !== ris.grano[giu(k)] ? 0.58 : 1); c = [m[0] * lume, m[1] * lume, m[2] * lume];
      }
    } else if (ris.tipo === 'fiocco') {
      // ghiaccio chiaro sul cielo notturno; il cuore (il ghiaccio più vecchio) più opaco, con gli anelli di crescita
      const v = ris.copertura[k], e = ris.eta[k], riga = 0.5 + 0.5 * Math.cos(e * 40), g = [182 + 44 * e + 16 * riga, 208 + 30 * e + 10 * riga, 234 + 14 * e + 6 * riga];
      c = [14 + (g[0] - 14) * v, 22 + (g[1] - 22) * v, 40 + (g[2] - 40) * v];
    } else if (ris.tipo === 'sedimento') {
      const g = ris.grano[k];
      if (g < 0) { const v = 0.9 + 0.2 * tinta(k); c = [84 * v, 73 * v, 62 * v]; } // fra i granelli: pori, fango e cemento
      else {
        const d = ris.diametri[g], m = [[206, 198, 182], [210, 166, 142], [96, 90, 86]][ris.specie[g]];
        if (d < 1.5) { // i fini non si distinguono uno a uno: si vede la tinta, più scura dove c'è più argilla (le lamine)
          const chiaro = limita((Math.log2(d) + 5.5) / 6, 0, 1), v = 0.92 + 0.16 * tinta(g); c = [0, 1, 2].map((i) => v * ([92, 80, 70][i] + ([196, 184, 164][i] * 0.7 + m[i] * 0.3 - [92, 80, 70][i]) * chiaro));
        } else { const lume = (0.82 + 0.3 * tinta(g)) * (d >= 4 && (g !== ris.grano[dx(k)] || g !== ris.grano[giu(k)]) ? 0.66 : 1); c = [m[0] * lume, m[1] * lume, m[2] * lume]; }
      }
    } else {
      const p = ris.poligono[k];
      if (ris.crepe[k] || p < 0) c = [12, 11, 12];
      else { const lume = (0.86 + 0.24 * tinta(p)) * (ris.crepe[dx(k)] || ris.crepe[giu(k)] ? 1.18 : 1); c = [ris.colore[0] * lume, ris.colore[1] * lume, ris.colore[2] * lume]; }
    }
    px[k * 4] = c[0]; px[k * 4 + 1] = c[1]; px[k * 4 + 2] = c[2]; px[k * 4 + 3] = 255;
  }
  return px;
}
