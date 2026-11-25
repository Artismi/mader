// laboratorio.js — la camera dell'universo: lo zoom continuo dal cosmo alla scala quantistica.
//
// Una scala sola, misurata in metri per pixel: lo spazio in tre dimensioni (src/tre) dal cosmo al suolo di un pianeta, la
// roccia o l'acqua di quel punto con i suoi livelli uno dentro l'altro (mappa.js), gli atomi in tre dimensioni (atomi3d.js)
// e sotto la scala quantistica (src/tre/quanti.js): le particelle e i campi dentro l'atomo. Lì lo zoom finisce.
// (Il generatore di pattern, che prima si apriva in fondo allo zoom, è un progetto a parte: pattern/LEGGIMI.md.)

import { metriPerUnita, cosmoBase, ramiCosmo, cosmoRamo, sorgenteEvento, LATO_REGIONE } from './cosmo.js';
import { universo } from './biblioteca.js';
import { fmtLunghezza } from './unita.js';
import { fmtGrande } from './nebbia.js';
import { convezione, celle } from './fluidi.js';
import { immagineSuperficie } from './geologia.js';
import { sistema as sistemaDi, galassia as galassiaDi } from './cosmo.js';
import { Z5_ROCCIA, LATI_SUOLO, disegnaMappa, zoomMappa, colpisciMappa, camSuRegione, volaVerso, percorso, rocciaDi, superficieDi, preparaSuperficie, quandoSuperficiePronta, quandoFinestraPronta, preparaVolo, cercaFinestra, scenaAtomi, finestraDelPunto, campoDelPunto, popolazioneDelPunto, finestreDelPunto, disegnaFinestre } from './mappa.js';
import { creaVista3D as creaVistaAtomi } from './atomi3d.js';
import { creaNucleo } from '../tre/nucleo.js';
import { pesoDiscreto } from './eredita.js';
import { creaUniverso } from '../tre/universo.js';
import { scriviBolla, leggiBolla, viaDi as viaDellaBolla, passoSensato, scalaDi, bolla as bollaNuova } from '../tre/bolla.js';
import { luogoDaAria } from './materia.js';
import { risalita } from './risalita.js';
import { puntoACaso, analizza as analizzaIndirizzo, viaDi as viaDellIndirizzo } from './lingua.js'; // (LINGUA.md: «portami in un punto a caso»)

const $ = (id) => document.getElementById(id);
const tela = $('tela'), ctx = tela.getContext('2d'), pannello = $('pannello');
// IL PUNTO D'AVVIO: un numero della biblioteca (biblioteca.js) è un indirizzo del cosmo. IL CRITERIO, scritto prima di
// cercare (21/11/2026, con la massa aggiunta dall'utente il 22/11/2026): il primo numero, in ordine (cosmo 1; galassia,
// stella, pianeta crescenti; regione 0), che dia un pianeta roccioso di 0,5–2 masse terrestri con acqua liquida, aria tra
// 0,5 e 3 bar, terre emerse (dopo l'erosione, pesate con l'area) tra il 20% e il 50%, temperatura media tra 0 e 25 °C,
// attorno a una stella tra 0,7 e 1,2 M☉. È il 309721: galassia 0, stella 1613, pianeta 2 (in base 0): 0,90 M⊕, 2,34 bar,
// 25% di terre, 2,8 °C, attorno a una stella di 0,98 M☉ (cercato col motore dell'app, il V8 di Electron, dopo le costanti
// CODATA a precisione piena). Prima erano il 5689 (0,12 M⊕, senza il criterio della massa), il 217 e il 15853643: il modello
// cambia e il primo pianeta che rispetta il criterio con lui. Non è un difetto nascosto: gli altri pianeti restano tutti
// raggiungibili. Da lì si apre lo spazio.
const AVVIO = universo(309721).cella.indirizzo;

// ---------- il disegno: la mappa piatta (quando lo spazio in tre dimensioni non c'è, o in fondo, nella materia di un punto);
// sopra ci sono le tele del mondo, degli atomi e dei quanti, ognuna col suo ciclo
function disegna() {
  const dpr = devicePixelRatio || 1;
  tela.width = tela.clientWidth * dpr; tela.height = tela.clientHeight * dpr;
  if (!mondo3d) disegnaMappa(ctx, tela.width, tela.height, camMappa, { sopra: sopraMappa, dpr });
}

// =================================================================== IL COSMO
// La catena dello zoom, nei due versi: il cosmo ↔ la galassia ↔ la stella ↔ il pianeta ↔ il suolo ↔ la materia ↔ gli
// atomi ↔ la scala quantistica.
let camMappa = null, sopraMappa = null, volo = null;
let animazione = 0;
function anima() { if (!(camMappa?.livello >= 3)) { animazione = 0; return; } if (!volo) disegna(); animazione = requestAnimationFrame(anima); }
function apriCosmo(a = AVVIO) {
  const dpr = devicePixelRatio || 1; camMappa = camSuRegione(a, tela.clientWidth * dpr, tela.clientHeight * dpr);
  sopraMappa = null; aggiornaVista();
}
// UN PUNTO A CASO (lingua.js, LINGUA.md): la discesa dell'albero con la misura dichiarata, dal seme che si scrive in basso;
// si apre lo spazio sopra quel punto, alla quota da cui il suolo è largo quanto la sua scala. Niente lune (la vista dal suolo
// sta sui pianeti) e il tempo è adesso (sopra le particelle lo stato c'è solo oggi: regola 11): lo si dice nella barra.
let notaPunto = null;
function vaiAPuntoACaso() {
  const seme = String(Date.now()), r = puntoACaso(seme, { lune: false, tempo: 'adesso' }); if (!r.indirizzo) { $('dove').textContent = r.note.join('; '); return; }
  const d = analizzaIndirizzo(r.indirizzo), via = viaDellIndirizzo(r.indirizzo); delete via.luna; // (la via della mappa: lingua.viaDi, i rami nel numero del cosmo)
  notaPunto = { via, testo: `un punto a caso (seme ${seme}, senza lune, adesso): «${r.testo}» ${via.galassia != null ? ` (nell'indirizzo galassie, stelle e pianeti si contano da 0, nei nomi qui sotto e nei pannelli da 1: «galassia ${via.galassia}» è la galassia ${via.galassia + 1})` : ''} · ${r.bit.toFixed(1)} bit (${r.peso.parti.filter((x) => x.bit > 0).map((x) => `${x.livello} ${x.bit.toFixed(1)}`).join(', ')})` };
  camMappa = { livello: 4, via, cx: (d.punto[0] + 180) / 360, cy: (90 - d.punto[1]) / 360, z: 5.5e6, quota3d: d.scala / (2 * tanMondo()) };
  const nota = notaPunto.testo; smontaMondo(); sopraMappa = null; aggiornaVista(); $('dove').textContent = nota;
}
document.getElementById('puntoACaso')?.addEventListener('click', vaiAPuntoACaso);
const risalite = new Map(); // (che cosa fanno le particelle su un pianeta: una nota, tenuta per gli ultimi pianeti visti)
// ---------- LO ZOOM CONTINUO: UNA SCALA SOLA, dall'universo alla scala quantistica, misurata in metri per pixel (misura) e
// detta sempre dalla barra di scala. Dal cosmo al suolo è lo spazio in tre dimensioni (src/tre); sotto, la roccia o l'acqua di
// quel punto con i suoi livelli uno dentro l'altro, ognuno alla sua grandezza vera (mappa.js: cristallo, lamina, reticolo);
// poi gli atomi in tre dimensioni e sotto la scala quantistica (src/tre/quanti.js), dove lo zoom finisce. Le tracce delle
// particelle di un punto non stanno in fondo: stanno alla loro scala (30 cm per un muone nel ghiaccio), sovrapposte a ciò
// che c'è lì (disegnaSopra). Si passa da una vista all'altra solo con la rotella, e a ogni passaggio la grandezza a schermo
// resta quella: la nuova parte alla stessa grandezza, centrata sullo stesso punto, e la vista di prima resta sopra come
// un'istantanea che segue lo zoom della nuova e sfuma su un intervallo di scala (un fattore 4): è la dissolvenza. LA
// DISSOLVENZA È UNA FUNZIONE DELLA SCALA, NON DEL TEMPO: l'opacità dipende solo dal rapporto tra la grandezza di adesso e
// quella a cui l'istantanea è stata presa (prima contava da quando la vista nuova era pronta, fino a 8 s dopo, e sfumava da
// sola col tempo se ci si fermava: la stessa scala dava quadri diversi a seconda di quanto si era aspettato). Se ci si
// ferma a metà, il quadro resta quello di metà.
let passaggio = null, telaPassaggio = null, puntoRotella = null, oraRotella = 0;
const RAGGIO_DISSOLVENZA = Math.log(4);
// la grandezza di ciò che c'è davvero a schermo: mentre la vista nuova si prepara (il mondo che si posa sopra il punto) a
// schermo c'è ancora l'istantanea di prima, ferma alla sua grandezza
let mppASchermo = null;
function scalaASchermo() { const P = passaggio; if (P && P.t0 == null && P.mppImg > 0) return P.mppImg; return misura(); }
// LA GRANDEZZA VERA di ciò che si guarda: metri per pixel (della pagina), al centro dello schermo, in ogni vista; null dove la
// vista non ha ancora una scala in metri
let ultimaQuanti = 0; // (l'ultima grandezza valida della scala quantistica)
function misura() {
  const dpr = devicePixelRatio || 1, H = tela.clientHeight || 1;
  try {
    {
      if (vistaQuanti) { const g = grandezzaQuanti(); if (g > 0) { ultimaQuanti = g; return g / H; } if (ultimaQuanti > 0) return ultimaQuanti / H; } // (al fondo la camera tocca l'atomo, distanza 0: resta l'ultima grandezza, non quella degli atomi di sopra)
      if (vistaAtomi) { const c = vistaAtomi.camera; return (2 * c.dist * Math.tan((c.fov || 0.6) / 2) * 1e-9) / H; } // (la camera degli atomi conta in nanometri)
      if (mondo3d && universo3d) { const g = universo3d.bolla().grandezza; return g > 0 ? g / H : null; }
      if (camMappa?.livello === 5) { if (camMappa.suAcqua) return ((camMappa.latoAcqua ?? 1) / camMappa.z) * dpr; const r = rocciaDi(camMappa); return r ? (r.larghezzaM / camMappa.z) * dpr : null; } // (l'acqua: il lato del campione, senza ridisegnarlo)
      if (camMappa) return (metriPerUnita(camMappa.livello, camMappa.via) / camMappa.z) * dpr;
      return null;
    }
  } catch { /* una vista a metà montaggio */ }
  return null;
}
// l'istantanea di ciò che si vede adesso (le tele una sopra l'altra, e il passaggio in corso)
function istantanea() {
  const dpr = devicePixelRatio || 1, W = tela.clientWidth, H = tela.clientHeight; if (!W || !H) return null;
  const cv = document.createElement('canvas'); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); const c = cv.getContext('2d');
  try {
    c.fillStyle = '#000'; c.fillRect(0, 0, cv.width, cv.height);
    c.drawImage(tela, 0, 0, cv.width, cv.height);
    for (const t of [telaMondo, telaAtomi]) if (t) c.drawImage(t, 0, 0, cv.width, cv.height);
    if (passaggio && telaPassaggio) c.drawImage(telaPassaggio, 0, 0, cv.width, cv.height);
    // (e la tela di sopra: le finestre dell'acqua e del suolo che nello spazio si fondono col 3D, le tracce; senza, l'istantanea
    // dello spazio non sarebbe ciò che si vedeva, e la dissolvenza verso il livello 5 lo mostrerebbe)
    c.drawImage(telaSopra, 0, 0, cv.width, cv.height);
  } catch { return null; }
  return cv;
}
function avviaPassaggio(img, { pronto = null } = {}) {
  if (!img) return;
  if (!telaPassaggio) { telaPassaggio = document.createElement('canvas'); telaPassaggio.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none'; tela.parentNode.insertBefore(telaPassaggio, tela.nextSibling); }
  const corre = !!passaggio; passaggio = { img, m0: null, t0: null, inizio: performance.now(), pronto, centro: puntoRotella ? puntoRotella.slice() : null, mppImg: mppASchermo };
  if (!corre) requestAnimationFrame(disegnaPassaggio);
}
function disegnaPassaggio() {
  const P = passaggio; if (!P || !telaPassaggio) return;
  const dpr = devicePixelRatio || 1, cv = telaPassaggio, W = Math.round(tela.clientWidth * dpr), H = Math.round(tela.clientHeight * dpr); if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  // (finché la vista nuova non è pronta, cioè posata alla sua grandezza, l'istantanea resta piena e ferma; oltre gli 8 s si
  // smette di aspettare. Poi il riferimento è la grandezza dell'istantanea, non quella del momento in cui è pronta)
  const adesso = performance.now(), pronta = !P.pronto || P.pronto() || adesso - P.inizio > 8000;
  if (pronta && P.t0 == null) { P.t0 = adesso; P.m0 = misura(); }
  const m = pronta ? misura() : null, rif = P.mppImg > 0 ? P.mppImg : P.m0, k = rif > 0 && m > 0 ? rif / m : 1;
  const a = pronta ? Math.max(0, 1 - Math.abs(Math.log(k)) / RAGGIO_DISSOLVENZA) : 1;
  const c = cv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
  if (a <= 0) { passaggio = null; return; }
  const [fx, fy] = P.centro ? [P.centro[0] * dpr, P.centro[1] * dpr] : [W / 2, H / 2];
  c.globalAlpha = a; c.setTransform(k, 0, 0, k, fx - k * fx, fy - k * fy); c.drawImage(P.img, 0, 0, W, H); c.globalAlpha = 1;
  requestAnimationFrame(disegnaPassaggio);
}
// ---------- GLI ATOMI IN TRE DIMENSIONI (atomi3d.js), ai livelli più profondi della mappa: le molecole dell'acqua sotto i
// dieci nanometri, il reticolo del minerale in fondo alla roccia (mappa.js, scenaAtomi, dice se c'è una scena e quale).
// La vista vuole una tela tutta sua: se ne monta una nuova sopra la mappa (sotto i comandi) e la si toglie quando la
// condizione cade. Sulla tela montata la rotella è sua: allontanandosi oltre la scena si risale di un passo; avvicinandosi
// oltre il più vicino possibile si scende nella scala quantistica (montaQuanti): senza bottoni, sempre con la rotella.
// Senza scheda grafica (o se il contesto non nasce) resta l'immagine piatta di mappa.js.
let telaAtomi = null, vistaAtomi = null, chiaveAtomi = null, bottoneAtomi = null, senzaAtomi3D = false;
function smontaAtomi() {
  smontaQuanti();
  if (vistaAtomi) { try { vistaAtomi.libera(); } catch { /* già perso */ } }
  telaAtomi?.remove(); bottoneAtomi?.remove(); telaAtomi = null; vistaAtomi = null; bottoneAtomi = null; chiaveAtomi = null; coloreAtomoVisto = null;
}
// allontanandosi oltre la scena degli atomi si torna all'immagine piatta, alla stessa grandezza a schermo (z dalla grandezza vera)
// (liscio: ci si esce alla grandezza a cui si era entrati, dove gli atomi sono già sfumati del tutto: niente istantanea)
function esciDagliAtomi(liscio = false) {
  const img = liscio ? null : istantanea(), mpp = misura(), r = rocciaDi(camMappa), dpr = devicePixelRatio || 1;
  if (r && mpp > 0) { camMappa.z = (r.larghezzaM * dpr) / mpp; if (!liscio) { camMappa.cx = 0.5; camMappa.cy = 0.5; } }
  smontaAtomi(); senzaAtomiFino = camMappa.z; montaMondo(); disegna(); dove(); if (img) avviaPassaggio(img);
}
// GLI ATOMI SI FONDONO CON L'IMMAGINE PIATTA secondo la scala, non col tempo: montati alla grandezza mppAtomi0 (quando il
// campione riempie lo schermo) sono trasparenti, e diventano pieni a un terzo di quella grandezza; nel mezzo l'immagine piatta
// sotto segue la stessa scala. Allontanandosi fino a mppAtomi0 si torna all'immagine piatta: avanti e indietro passano per gli
// stessi stati. (A MANO, dichiarato: la dissolvenza su un fattore 3 di scala)
let mppAtomi0 = 0;
function fondiAtomi() {
  if (!telaAtomi || !(mppAtomi0 > 0)) return; const mpp = misura(); if (!(mpp > 0)) return;
  const a = Math.max(0, Math.min(1, Math.log(mppAtomi0 / mpp) / Math.log(3))); telaAtomi.style.opacity = String(a);
  if (a < 1 && camMappa) { const r = rocciaDi(camMappa), dpr = devicePixelRatio || 1; if (r) { camMappa.z = (r.larghezzaM * dpr) / mpp; disegna(); } }
}
// (dopo esserne usciti, gli atomi in 3D tornano solo riavvicinandosi: non alla stessa grandezza da cui si è usciti)
let senzaAtomiFino = 0;
function montaAtomi() {
  const mm = Math.min(tela.width, tela.height); if (senzaAtomiFino && !(camMappa?.z > senzaAtomiFino * 1.05)) { if (!telaAtomi) return; } else senzaAtomiFino = 0;
  let sc = null; try { sc = camMappa && !senzaAtomi3D ? scenaAtomi(camMappa, telaAtomi ? 0 : mm) : null; } catch (err) { console.warn(err); sc = null; }
  if (!sc) { if (telaAtomi) smontaAtomi(); return; }
  if (sc.chiave === chiaveAtomi) return; // stesso punto, stessa scala: la scena c'è già
  const mppPrima = misura(); smontaAtomi();
  try {
    telaAtomi = document.createElement('canvas'); telaAtomi.style.cssText = 'position:absolute;inset:0;width:100%;height:100%'; tela.parentNode.insertBefore(telaAtomi, tela.nextSibling);
    vistaAtomi = creaVistaAtomi(telaAtomi, { alFuori: () => esciDagliAtomi(), conserva: true });
    vistaAtomi.suAtomo((a) => { if (!a) { dove(); return; } ultimoAtomo = a; $('dove').textContent = `${a.nome || a.simbolo || 'un atomo'}${a.simbolo && a.nome ? ` (${a.simbolo})` : ''}${a.parte ? ` · ${typeof a.parte === 'string' ? a.parte : a.parte.nome || ''}` : ''}${a.rappresenta > 1 ? ` · da qui questa sfera ne rappresenta ${a.rappresenta}: avvicinati e tornano gli atomi` : ''}`; });
    scenaAtomiOra = sc.crea(); vistaAtomi.carica(scenaAtomiOra); vistaAtomi.avvia(); chiaveAtomi = sc.chiave;
    // la camera degli atomi parte alla grandezza a cui si era (niente salto): lo schermo alto quanto era alto un attimo prima,
    // e guarda come l'immagine piatta: dall'alto, il piano x–y della scena con la x a destra e la y in su (nessuna rotazione
    // sua: la ruota solo chi trascina). La scena è periodica: le copie attorno a quella del punto riempiono lo schermo
    { const c = vistaAtomi.camera; c.yaw = 0; c.pitch = 0; if (mppPrima > 0) c.dist = (mppPrima * tela.clientHeight) / (2 * Math.tan((c.fov || 0.6) / 2)) * 1e9; }
    mppAtomi0 = mppPrima > 0 ? mppPrima : 0; telaAtomi.style.opacity = mppAtomi0 > 0 ? '0' : '1';
    // (la rotella la usa prima la vista; poi qui: la dissolvenza, e oltre la grandezza d'ingresso si torna all'immagine piatta)
    telaAtomi.addEventListener('wheel', (e) => { if (!vistaAtomi) return; if (e.deltaY > 0 && mppAtomi0 > 0 && misura() >= mppAtomi0 * 0.999) { esciDagliAtomi(true); return; } fondiAtomi(); requestAnimationFrame(guardaAtomo); });
    // oltre il più vicino possibile (dentro l'atomo): la scala quantistica, alla sua grandezza (montaQuanti)
    telaAtomi.addEventListener('wheel', (e) => {
      if (!(e.deltaY < 0 && vistaAtomi && vistaAtomi.camera.dist <= 0.1)) return;
      e.stopImmediatePropagation(); e.preventDefault(); montaQuanti();
    }, { capture: true, passive: false });
  } catch (err) { console.warn('la vista degli atomi in 3D non si è potuta montare: resta l\'immagine piatta', err); smontaAtomi(); senzaAtomi3D = true; }
}
// ---------- SOTTO GLI ATOMI: LA SCALA QUANTISTICA (src/tre/quanti.js, creaQuanti(N, { atomo, luogo, scala }): un altro
// modulo). Si monta sopra gli atomi, alla grandezza a cui si è arrivati (scala: l'altezza dello schermo, in metri), con
// l'atomo che si aveva sotto gli occhi e il luogo di quella materia. Se il modulo non c'è ancora lo si dice, e si resta qui.
let telaQuanti = null, vistaQuanti = null, nucleoQuanti = null, ultimoAtomo = null, quantiAssenti = false, scenaAtomiOra = null, telaDensita = null, cicloDensita = 0;
function smontaQuanti() {
  try { vistaQuanti?.libera?.(); nucleoQuanti?.libera?.(); } catch { /* già perso */ }
  cancelAnimationFrame(cicloDensita); cicloDensita = 0; telaDensita?.remove(); telaDensita = null;
  telaQuanti?.remove(); telaQuanti = null; vistaQuanti = null; nucleoQuanti = null; ultimaQuanti = 0;
  if (telaAtomi) telaAtomi.style.transform = '';
}
// LA SCALA QUANTISTICA CONTINUA LO ZOOM: non è un'altra vista che prende il posto degli atomi, ma lo stesso atomo più da
// vicino. (1) Si fonde con gli atomi secondo la grandezza a schermo, non col tempo: il peso w = pesoDiscreto (eredita.js)
// di quante volte l'atomo è più grande sullo schermo di quando si è entrati (alta / g), con la rampa larga FUSIONE_QUANTI:
// w = 0 alla grandezza d'ingresso, 1 a un trentesimo di quella. Le due viste stanno alla stessa scala: gli atomi, fermi
// alla loro camera più vicina, seguono lo zoom ingranditi di alta / g attorno al centro (da lì si è scesi), e la tela dei
// quanti (opaca) sta sopra con opacità w: a schermo w·quanti + (1 − w)·atomi, la luce totale conservata. (Prima la
// dissolvenza andava su un fattore 3, dentro un solo scatto di mezza decade, con gli atomi fermi sotto: un salto.)
// (A MANO, dichiarato: la larghezza della rampa, una decade e mezza: sotto la decade una mezza decade di zoom cambia tutto.)
// (2) Sotto gli eventi dello strumento c'è sempre il CAMPO, la densità di carica attorno al nucleo dell'atomo guardato, a
// ogni decade (quanti.js): la densità elettronica di Slater, la cui superficie a 0,001 e/a₀³ è la sfera che si vedeva da fuori;
// dentro, i gusci e poi, sotto il raggio dell'1s, la densità di contatto, uniforme; sotto ƛ = 386 fm la carica che il vuoto
// polarizzato mette attorno al nucleo (Uehling 1935, in magenta: negativa); il nucleo con la sua densità di carica misurata
// (raggi di Angeli e Marinova 2013, forma di Fermi o dell'oscillatore); sotto, le istantanee dei nucleoni, mai più vicini di
// 0,9 fm. Ogni decade di densità è una fascia appena più chiara (le isolinee in log ρ): a ogni ingrandimento c'è una
// superficie da vedere, come chiede la continuità (rapporto «Generatore multiscala», §5).
// (3) IL COLORE DEL CAMPO È QUELLO DELL'ATOMO: la densità elettronica è l'atomo stesso, la sfera vista da vicino. Il suo colore
// è quello della sfera vista da fuori, l'ultima volta che la camera degli atomi le stava fuori (guardaAtomo; se manca, lo
// schermo entrando), `media0`: il guadagno di ogni canale si
// sceglie perché la media a schermo della densità, alla grandezza d'ingresso, sia proprio quella. Così nella fusione la media
// del colore e la luminanza si conservano (w·densità + (1 − w)·atomi con le due medie uguali). Le misure dello strumento,
// i punti, restano nel verde del suo fosforo: quello è lo strumento, non l'atomo. (Prima il campo era nel verde del
// fosforo, scuro: dalla sfera colorata al verde un salto di ΔE ≈ 25 in un passo di mezza decade.)
const FUSIONE_QUANTI = 10 ** 1.5;
// L'ATOMO VISTO DA FUORI: a ogni scatto della rotella sugli atomi, finché la camera sta fuori dalla sfera dell'atomo più
// vicino al punto guardato, la media a schermo della tela degli atomi. L'ultima è la sfera vista da vicino: il colore che la
// densità deve avere (densitaQuanti, 3). (Dentro la sfera la vista degli atomi non la disegna più: si vede ciò che c'è dietro.)
let coloreAtomoVisto = null;
function guardaAtomo() {
  const sc = scenaAtomiOra; if (!vistaAtomi || !sc || !telaAtomi || telaQuanti) return;
  const u = { m: 1, nm: 1e-9, A: 1e-10 }[sc.unita || 'nm'] || 1e-9, c = vistaAtomi.camera, b = c.bersaglio.map((x) => (x * 1e-9) / u), P = sc.atomi.pos; let i0 = -1, d0 = Infinity;
  for (let i = 0; i < P.length / 3; i++) { const d = (P[3 * i] - b[0]) ** 2 + (P[3 * i + 1] - b[1]) ** 2 + (P[3 * i + 2] - b[2]) ** 2; if (d < d0) { d0 = d; i0 = i; } }
  if (i0 < 0 || !((c.dist * 1e-9) / u > sc.atomi.raggio[i0] + Math.sqrt(d0))) return;
  try { coloreAtomoVisto = mediaTela(telaAtomi); } catch { /* resta quello di prima */ }
}
// la media del colore a schermo (sRGB, 0–255) di una tela: la si riduce a 16×16 col filtro del navigatore
const mediaTela = (cv) => { if (!cv) return null; const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingEnabled = true; x.drawImage(cv, 0, 0, 16, 16); const d = x.getImageData(0, 0, 16, 16).data, m = [0, 0, 0]; for (let i = 0; i < 256; i++) for (let k = 0; k < 3; k++) m[k] += d[4 * i + k] / 256; return m; };
function densitaQuanti(Qc, atomo, alta, media0 = null) {
  // (la densità sta sotto la tela dei quanti, a fusione normale sugli atomi: w·densità + (1 − w)·atomi; i punti dello strumento
  // vi si sommano sopra, la tela dei quanti a fusione «screen», nera dove non c'è misura. Prima la densità stava sopra in
  // «screen» con la stessa opacità: a metà fusione il prodotto atomi × densità toglieva luce, la media scendeva)
  telaDensita = document.createElement('canvas'); telaDensita.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none'; telaQuanti.parentNode.insertBefore(telaDensita, telaQuanti); telaQuanti.style.mixBlendMode = 'screen';
  const Z = atomo.Z, d = Qc.densitaAtomo(Z, atomo.carica || 0), a0 = Qc.AU.a0, nuc = Qc.nucleo(Z), iso = 0.001 / a0 ** 3;
  // (la densità di carica del nucleo, e/m³: il profilo dei protoni normalizzato a Z)
  let norma = 0; if (nuc.protoni) { const top = 12, n = 600; for (let i = 0; i < n; i++) { const r = ((i + 0.5) / n) * top; norma += nuc.protoni.densita(r) * 4 * Math.PI * r * r * (top / n); } }
  const rhoN = (r) => (nuc.protoni && norma > 0 ? (Z * nuc.protoni.densita(r * 1e15)) / norma * 1e45 : 0), top = Math.log10(0.16e45), bassa = Math.log10(iso);
  const luce = (rho) => { if (!(rho > 0)) return 0; const L = Math.log10(rho), x = (L - bassa) / (top - bassa); if (x < -0.15) return 0; return Math.max(0, Math.min(1, 0.12 + 0.5 * x)) * (0.82 + 0.18 * Math.cos(2 * Math.PI * L)); };
  const elettroni = (r) => { const rho = d.rho(r / a0) / a0 ** 3; return luce(rho) + Math.exp(-((rho / iso - 1) ** 2) / 0.02) * 0.35; }; // (la densità e la sua superficie)
  // IL GUADAGNO DI OGNI CANALE (vedi sopra, 3): la media a schermo, alla grandezza d'ingresso, di min(1, 0,8·G·elettroni(r))
  // deve dare media0; la si cerca per bisezione su un campione dei pixel (r dal centro). Senza media0: il verde del fosforo.
  let G = [0.25, 1.0, 0.18];
  if (media0 && telaDensita.clientWidth > 0) {
    const W = telaDensita.clientWidth, H = telaDensita.clientHeight, mpp = alta / H, passo = Math.max(1, Math.sqrt((W * H) / 4096)), campione = [];
    for (let y = passo / 2; y < H; y += passo) for (let x = passo / 2; x < W; x += passo) campione.push(elettroni(Math.max(Math.hypot(x - W / 2, y - H / 2), 0.25) * mpp));
    // (oltre il guadagno che satura anche il punto più debole dello schermo non si guadagna più niente all'ingresso: è il tetto)
    const media = (g) => campione.reduce((a, e) => a + Math.min(1, 0.8 * g * e), 0) / campione.length, debole = campione.reduce((a, e) => (e > 0 && e < a ? e : a), Infinity), tetto = 1 / (0.8 * debole);
    if (Number.isFinite(tetto)) G = media0.map((m) => { const voluto = m / 255; if (!(voluto > 0)) return 0; if (media(tetto) <= voluto) return tetto; let lo = 0, hi = tetto; for (let it = 0; it < 40; it++) { const mm = 0.5 * (lo + hi); if (media(mm) < voluto) lo = mm; else hi = mm; } return 0.5 * (lo + hi); });
  }
  let ultima = 0;
  const disegna1 = () => {
    cicloDensita = requestAnimationFrame(disegna1); if (!telaDensita) return; const g = grandezzaQuanti(); if (!(g > 0)) return;
    const a = pesoDiscreto(alta / g / Math.sqrt(FUSIONE_QUANTI), Math.log2(FUSIONE_QUANTI)); telaQuanti.style.opacity = String(a); telaDensita.style.opacity = String(a);
    if (telaAtomi) { const k = a < 1 ? Math.max(1, alta / g) : 1; telaAtomi.style.transformOrigin = '50% 50%'; telaAtomi.style.transform = k > 1 ? `scale(${k})` : ''; }
    const W = telaDensita.clientWidth, H = telaDensita.clientHeight; if (!W || !H) return; if (telaDensita.width !== W || telaDensita.height !== H) { telaDensita.width = W; telaDensita.height = H; ultima = 0; } // (assegnare la misura svuota la tela: solo se cambia)
    if (Math.abs(g / ultima - 1) < 1e-3) return; ultima = g;
    const x = telaDensita.getContext('2d'), mpp = g / H, R = Math.hypot(W, H) / 2, grad = x.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, R), n = 96;
    for (let k = 0; k <= n; k++) { const rp = k === 0 ? 0 : 0.25 * Math.pow(R / 0.25, (k - 1) / (n - 1)), r = Math.max(rp, 0.25) * mpp, e = elettroni(r), v = r < 4 * Qc.LAMBDA_E ? luce(Qc.caricaUehling(Z, r)) : 0, nN = luce(rhoN(r));
      const c = [G[0] * e + 0.9 * v + 0.95 * nN, G[1] * e + 0.3 * v + 0.85 * nN, G[2] * e + 0.9 * v + 0.5 * nN].map((q) => Math.round(255 * Math.min(1, q * 0.8)));
      grad.addColorStop(Math.min(1, rp / R), `rgb(${c[0]},${c[1]},${c[2]})`); }
    x.fillStyle = grad; x.fillRect(0, 0, W, H);
  };
  telaQuanti.style.opacity = '0'; disegna1();
}
async function montaQuanti() {
  if (telaQuanti || quantiAssenti) { if (quantiAssenti) $('dove').textContent = 'Sotto gli atomi: la scala quantistica (src/tre/quanti.js) non si è potuta montare. Qui finisce, per ora, la scala.'; return; }
  const alta = (misura() || 0) * tela.clientHeight, r = camMappa ? rocciaDi(camMappa) : null, sc = scenaAtomiOra; if (!sc || !(alta > 0)) return;
  let media0 = coloreAtomoVisto; if (!media0) { try { media0 = mediaTela(istantanea()); } catch { media0 = null; } } // (il colore della sfera vista da fuori, o lo schermo entrando: quello della densità, vedi densitaQuanti)
  let mod, Qc; try { [mod, Qc] = await Promise.all([import('../tre/quanti.js'), import('./quanti.js')]); } catch { quantiAssenti = true; return montaQuanti(); }
  if (!vistaAtomi || telaQuanti || typeof mod.creaQuanti !== 'function') return;
  try {
    // l'atomo: quello più vicino al punto verso cui si è scesi (il bersaglio della camera degli atomi, in nanometri)
    const u = { m: 1, nm: 1e-9, A: 1e-10 }[sc.unita || 'nm'] || 1e-9, b = vistaAtomi.camera.bersaglio.map((x) => (x * 1e-9) / u), P = sc.atomi.pos; let i0 = 0, d0 = Infinity;
    for (let i = 0; i < P.length / 3; i++) { const d = (P[3 * i] - b[0]) ** 2 + (P[3 * i + 1] - b[1]) ** 2 + (P[3 * i + 2] - b[2]) ** 2; if (d < d0) { d0 = d; i0 = i; } }
    const atomo = Qc.atomoDaScena(sc, i0, { indirizzo: `${r?.luogo?.indirizzo || r?.base?.luogo?.indirizzo || chiaveAtomi}/atomo ${i0}` });
    telaQuanti = document.createElement('canvas'); telaQuanti.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;outline:none'; (telaAtomi || tela).parentNode.insertBefore(telaQuanti, (telaAtomi || tela).nextSibling);
    nucleoQuanti = creaNucleo(telaQuanti, { conserva: true });
    vistaQuanti = mod.creaQuanti(nucleoQuanti, { atomo, luogo: null, scala: atomo.scala });
    // la camera parte alla grandezza a cui si era: lo schermo alto `alta` metri
    nucleoQuanti.attacca(vistaQuanti.corpo, { distanza: alta / (2 * Math.tan((nucleoQuanti.camera.fov || 0.75) / 2)) }); nucleoQuanti.avvia();
    try { densitaQuanti(Qc, atomo, alta, media0); } catch (err) { console.warn('la densità sotto la scala quantistica:', err); }
    // allontanandosi oltre la grandezza da cui si è entrati si torna agli atomi. IL FONDO: la camera arriva al bordo del
    // nucleo (quanti.js, distanzaMinima: il nucleo è l'ultimo bersaglio della rotella) e lì lo zoom finisce: è la scala più
    // piccola, e lo si dice. Gli scatti in avanti oltre il fondo non arrivano più alla camera. (Prima, arrivata al nucleo, la
    // rotella proseguiva «verso ciò che c'è dentro» senza più bersagli, a passi di un metro: la camera usciva di colpo a
    // quaranta raggi dell'atomo, e lo schermo tornava largo 10⁻⁸ m.)
    telaQuanti.addEventListener('wheel', (e) => {
      if (!(e.deltaY < 0) || !vistaQuanti) return; const d = vistaQuanti.stato?.distanza, min = vistaQuanti.distanzaMinima;
      if (!(d > 0 && min > 0 && d <= min * 1.02)) return;
      e.stopImmediatePropagation(); e.preventDefault(); nucleoQuanti?.fermaZoom?.();
      $('dove').textContent = 'La scala quantistica: le particelle e i campi dentro l\'atomo. È la scala più piccola: qui lo zoom finisce.';
    }, { capture: true, passive: false });
    telaQuanti.addEventListener('wheel', (e) => { if (e.deltaY > 0 && !(grandezzaQuanti() < alta)) { e.stopImmediatePropagation(); e.preventDefault(); const img = istantanea(); smontaQuanti(); disegna(); dove(); avviaPassaggio(img); } }, { capture: true, passive: false });
  } catch (err) { console.warn('la scala quantistica non si è potuta montare', err); smontaQuanti(); quantiAssenti = true; }
}
// l'altezza dello schermo nella scala quantistica (metri): dalla distanza della camera dall'atomo
const grandezzaQuanti = () => { const d = vistaQuanti?.stato?.distanza; return d > 0 ? 2 * (nucleoQuanti?.stato?.tanY || Math.tan(0.375)) * d : null; };
// ---------- IL MONDO IN TRE DIMENSIONI (src/tre): dal cosmo fino al suolo, lo spazio in cui ci si
// muove prende il posto della mappa piatta (che resta: senza WebGL2, e a richiesta col bottone «mappa piatta»). Una tela
// nuova sopra #tela; il motore ha il suo ciclo. La camera della mappa (camMappa) segue: dice a che livello e dove si è,
// così il pannello, il percorso e il ritorno alla mappa piatta restano giusti. In fondo, a pochi metri dal suolo,
// avvicinandosi ancora si passa al livello 5 (la roccia o l'acqua di quel punto: rocciaDi, montaAtomi).
let telaMondo = null, mondo3d = null, universo3d = null, barraMondo = null, segniMondo = null, bricioleOra = '', senzaMondo3D = false, cursoreMondo = null, orologioMondo = 0, bottoneMondo = null, mondoPosato = false, primoMondo = true;
const VERSIONE_SALVATAGGI = 2, CHIAVE_BOLLA = `stateyour.bolla3d.v${VERSIONE_SALVATAGGI}`;
const ANNO_S = 31557600, VELOCITA_MONDO = [1, 60, 600, 3600, 21600, 86400, 604800, 2592000, ANNO_S, 100 * ANNO_S, 1e4 * ANNO_S, 1e6 * ANNO_S, 1e8 * ANNO_S];
const diceTempo = (v) => (v === 1 ? 'tempo vero' : v < 60 ? `${v.toLocaleString('it-IT', { maximumSignificantDigits: 2 })} secondi al secondo` : v < 3600 ? `${v / 60} minuti al secondo` : v < 86400 ? `${v / 3600} ore al secondo` : v < ANNO_S ? `${Math.round(v / 86400)} giorni al secondo` : v === ANNO_S ? 'un anno al secondo' : v < 1e6 * ANNO_S ? `${(v / ANNO_S).toLocaleString('it-IT')} anni al secondo` : `${(v / ANNO_S / 1e6).toLocaleString('it-IT')} milioni di anni al secondo`);
function smontaMondo() {
  clearInterval(orologioMondo); orologioMondo = 0;
  if (mondo3d) { try { universo3d?.libera(); mondo3d.libera(); } catch { /* già perso */ } }
  telaMondo?.remove(); barraMondo?.remove(); segniMondo?.remove(); telaMondo = null; mondo3d = null; universo3d = null; barraMondo = null; segniMondo = null;
  const br = $('briciole'); if (br) { br.hidden = true; br.innerHTML = ''; } bricioleOra = '';
}
// la camera della mappa segue quella dello spazio: il livello e la via di ciò a cui si è attaccati
function seguiMondo() {
  if (!universo3d || !camMappa) return; const v = universo3d.viaOra(), L = v.pianeta != null ? 3 : v.stella != null ? 2 : v.galassia != null ? 1 : 0, m = Math.min(tela.width, tela.height);
  if (JSON.stringify(v) === JSON.stringify(camMappa.via) && (camMappa.livello === L || (L === 3 && camMappa.livello === 4))) return;
  camMappa = { livello: L, via: v, cx: L === 0 ? 0.5 : 0, cy: L === 0 ? 0.5 : 0, z: L === 3 ? m / 3 : m / 2.4 }; mostraPannello();
}
// dal suolo alla roccia (o all'acqua) di quel punto: il livello 5 della mappa, nello stesso punto e alla stessa grandezza. Il
// suolo si guarda dall'alto (lo zoom vicino al suolo raddrizza lo sguardo verso il basso): a quota q lo schermo è alto
// 2·q·tan(fov/2) metri, e la roccia (larga larghezzaM) si mette allo zoom che le dà la stessa larghezza in pixel.
const tanMondo = () => mondo3d?.stato?.tanY || Math.tan(0.375);
let ingressoSuolo = null; // (la quota e lo sguardo di quando si è entrati sotto i tre chilometri)
// mettersi sopra un punto a una quota: `vai` del nucleo conta la quota dal punto del corpo (corpo.punto), `dove` dal suolo
// (quotaSuolo); se i due non combaciano (il rilievo che arriva dopo, in secondo piano) si corregge dello scarto misurato qui
let quotaVoluta = null; // (l'ultima quota chiesta: se il suolo si alza sotto la camera dopo che ci si è posati, la si rimette lì)
let oraVaiSopra = 0;
function vaiSopra(o, { correzione = false } = {}) {
  quotaVoluta = o.quota; if (!correzione) oraVaiSopra = performance.now(); const M = mondo3d, c = M.camera.corpo, d = M.dove(); let h = o.quota;
  try { if (c.punto && isFinite(d.quota)) { const p = c.punto(d.lon, d.lat, d.quota), scarto = d.distanza - Math.hypot(p[0], p[1], p[2]); if (isFinite(scarto)) h += scarto; } } catch { /* senza carta: la quota com'è */ }
  M.vai({ ...o, quota: h });
}
const camRoccia = (d, v) => ({ livello: 5, via: v, roccia: { cx: (d.lon + Math.PI) / (2 * Math.PI), cy: ((Math.PI / 2 - d.lat) / Math.PI) * 0.5 }, cx: 0.5, cy: 0.5, z: 0, passoRoccia: 0, eventoAcqua: false });
// la quota da cui il suolo è largo quanto la roccia di quel punto quando la si vede intera (all'80% del lato corto)
function quotaDellaRoccia(cam) { const r = rocciaDi(cam), H = tela.clientHeight, m = Math.min(tela.clientWidth, H); return r ? (r.larghezzaM * H) / (0.8 * m) / (2 * tanMondo()) : 6; }
function scendiNellaMateria(q = null) {
  const d = mondo3d.dove(), v = universo3d.viaOra(), dpr = devicePixelRatio || 1, H = tela.clientHeight * dpr, m = Math.min(tela.clientWidth * dpr, H); if (v.pianeta == null) return;
  const img = istantanea(), cam = camRoccia(d, v), r = rocciaDi(cam);
  cam.z = r && q ? Math.max(0.5 * m, Math.min(8.5 * m, (r.larghezzaM * H) / (2 * q * tanMondo()))) : 0.8 * m;
  camMappa = cam; smontaMondo(); sopraMappa = null; montaAtomi(); disegna(); dove(); mostraPannello(); if (!animazione) animazione = requestAnimationFrame(anima);
  avviaPassaggio(img);
}
function rigaMondo() {
  if (!mondo3d || !universo3d) return; seguiMondo();
  if (mondoPosato && mondo3d.camera.corpo?.punto) { const g = mondo3d.dove(); if (g.quota < 0) vaiSopra({ lon: g.lon, lat: g.lat, quota: quotaVoluta || 1, direzione: g.direzione, alza: g.alza }); } // (sotto il suolo: di nuovo sopra)
  const solido = !!mondo3d.camera.corpo?.quota, d = solido ? mondo3d.dove() : null, pi = universo3d.sistema()?.vero(), gradi = (lon, lat) => `${Math.abs((lat * 180) / Math.PI).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs((lon * 180) / Math.PI).toFixed(2)}° ${lon >= 0 ? 'E' : 'O'}`;
  const lungo = (x) => (x >= 9.46e14 ? `${(x / 9.461e15).toLocaleString('it-IT', { maximumFractionDigits: x > 9.46e17 ? 0 : 2 })} anni luce` : x >= 1.5e10 ? `${(x / 1.496e11).toFixed(2)} UA` : fmtLunghezza(x));
  // LA BOLLA (INTRECCIO.md, regola 11): lo stato di questa vista è lei; la si tiene scritta, per ripartire da lì
  const bolla = universo3d.bolla(); try { if (universo3d.pronto()) localStorage.setItem(CHIAVE_BOLLA, scriviBolla(bolla)); } catch { /* senza memoria: pazienza */ }
  briciole3d();
  let testo = `${scalaDi(bolla.grandezza).nome}: un volume largo ${lungo(bolla.grandezza)}` + ' · ' + (d ? `sopra ${gradi(d.lon, d.lat)}, a ${lungo(d.quota)} dal suolo` : `a ${lungo(mondo3d.stato.vicinoM || 0)} dalla cosa più vicina`);
  const q = d && cursoreMondo ? mondo3d.sotto(cursoreMondo[0], cursoreMondo[1]) : null, i = q && pi ? pi.info(q.lon, q.lat) : null;
  if (i) testo += ` · sotto il cursore (${gradi(q.lon, q.lat)}, a ${lungo(q.distanza)}): ${i.acqua ? `acqua profonda ${fmtLunghezza(i.profondita)}` : `terra a quota ${Math.round(i.quota)} m`}`;
  if (d && d.quota < 3) testo += ' · avvicinati ancora: si entra nella materia di questo punto';
  // L'OCCHIO (nucleo.js, OCCHIO): a quanta luce è adattato, e se vede i colori; sotto la sua soglia ciò che c'è resta scuro
  const ad = mondo3d.stato.adattamento; if (ad && Number.isFinite(ad.LA)) testo += ` · l'occhio è adattato a ${ad.LA >= 0.1 ? ad.LA.toPrecision(2).replace('.', ',') : ad.LA.toExponential(0).replace('e', '·10^')} cd/m²${ad.LA <= 1.0001e-6 ? ' (la sua soglia: qui quasi non vede)' : ad.coni <= 0 ? ' (visione notturna: coi bastoncelli, senza colori)' : ad.coni < 1 ? ' (crepuscolo: i colori sbiadiscono)' : ''}`;
  const qui = universo3d.viaOra(); if (notaPunto && universo3d.pronto() && (qui.stella !== notaPunto.via.stella || qui.galassia !== notaPunto.via.galassia)) notaPunto = null; if (notaPunto) testo = `${notaPunto.testo} · ${testo}`; // (finché lo spazio non è pronto la nota resta)
  $('dove').textContent = testo + '. Trascina: gira il mondo sotto la mano; tasto destro: orbita; rotella: verso ciò che sta sotto il cursore (l\'anello); doppio clic: vola lì; W A S D R F: vola.';
  if (barraMondo) barraMondo.querySelector('span').textContent = mondo3d.tempo.pausa ? 'in pausa' : diceTempo(mondo3d.tempo.velocita);
}
// GLI AIUTI PER NON PERDERSI (rapporto «Navigazione e resa per stateyour», adozione 3), sempre a schermo e sobri:
//  · il percorso dell'indirizzo, in basso a sinistra nella riga «dove»: ogni voce porta lì in volo (universo.js, vaiA), e
//    «↑ risali» al livello sopra;
//  · il prossimo bersaglio: un anello attorno alla cosa verso cui porterebbe la rotella (quella sotto il cursore; durante un
//    gesto o un volo, quella del gesto: allora l'anello è rosso) e il suo nome;
//  · le etichette delle cose che si vedono, che compaiono quando la cosa è larga qualche pixel e svaniscono quando riempie
//    lo schermo (l'opacità segue il raggio angolare, come le etichette di Gaia Sky): al più sei, le più grandi;
//  · la barra di scala in potenze di dieci (barraDiScala, in fondo).
const LIVELLI_3D = ['cosmo', 'galassia', 'stella', 'pianeta'];
function briciole3d() {
  const br = $('briciole'); if (!br || !universo3d) return; const v = universo3d.viaOra(), L = v.pianeta != null ? 3 : v.stella != null ? 2 : v.galassia != null ? 1 : 0, chiave = JSON.stringify(v);
  if (chiave === bricioleOra) return; bricioleOra = chiave; br.hidden = false;
  const nomi = percorso({ livello: L, via: v }).slice(0, L + 1), voci = nomi.map((n, i) => (i === L ? `<b>${n}</b>` : `<button data-livello="${LIVELLI_3D[i]}" title="vola fin qui">${n}</button>`));
  br.innerHTML = (L > 0 ? `<button class="su" data-livello="${LIVELLI_3D[L - 1]}" title="risali di un livello: ${nomi[L - 1]}">↑ risali</button>` : '') + voci.join('<i>›</i>');
  for (const b of br.querySelectorAll('button')) b.onclick = () => volaAlLivello(b.dataset.livello);
}
function volaAlLivello(liv) {
  if (!universo3d) return; const v = universo3d.viaOra(), Sis = universo3d.sistema();
  const meta = liv === 'cosmo' ? { cosmo: true } : liv === 'galassia' ? { galassia: v.galassia } : liv === 'stella' ? { sistema: true } : { corpo: Sis?.pianeta(v.pianeta) };
  if (meta.corpo === undefined || meta.corpo) universo3d.vaiA(meta, { fine: () => rigaMondo() });
}
// il nome di una cosa dello spazio (un bersaglio del nucleo)
function nomeCosa(b) {
  if (!b) return ''; if (b.corpo) { const Sis = universo3d?.sistema(), s = Sis?.scheda(b.corpo); if (s?.c?.cosa === 'pianeta') return `pianeta ${s.c.id + 1}`; if (s?.c?.cosa === 'luna') return `una luna del pianeta ${s.c.pianeta + 1}`; if (b.corpo.nome === 'stella' && Sis) return `stella ${Sis.via.stella + 1}`; return b.corpo.nome; }
  return b.stella != null ? `stella ${b.stella + 1}` : b.galassia != null ? `galassia ${b.galassia + 1}` : '';
}
// dal vettore occhio → cosa (assi del mondo) al punto della tela (pixel della pagina), con i pixel per metro a quella distanza
function aSchermo(p) {
  const S = mondo3d.stato, a = S.assi; if (!a) return null; const x = p[0] * a[0] + p[1] * a[3] + p[2] * a[6], y = p[0] * a[1] + p[1] * a[4] + p[2] * a[7], z = p[0] * a[2] + p[1] * a[5] + p[2] * a[8]; if (z >= 0) return null;
  const W = telaMondo.clientWidth, H = telaMondo.clientHeight; return { x: W / 2 + (x / -z / S.tanX) * (W / 2), y: H / 2 - (y / -z / S.tanY) * (H / 2), k: H / 2 / (Math.hypot(p[0], p[1], p[2]) * S.tanY) };
}
let giroSegni = 0, miraOra = null, miraQuando = 0;
function segni3d() {
  giroSegni = 0; if (!mondo3d || !segniMondo || !telaMondo) return; giroSegni = requestAnimationFrame(segni3d);
  const W = telaMondo.clientWidth, H = telaMondo.clientHeight, M = mondo3d, S = M.stato, rampa = (x, a, b) => Math.max(0, Math.min(1, (x - a) / (b - a)));
  const [anello, nomeA, ...etichette] = segniMondo.children;
  // il prossimo bersaglio (scelto al più dieci volte al secondo quando non ci si muove: costa un raggio contro il suolo)
  const ora = performance.now(), muove = M.volo || M.gesto; if (muove || ora - miraQuando > 100) { miraQuando = ora; const c = cursoreMondo || [W / 2, H / 2]; miraOra = mondoPosato ? M.mira(c[0], c[1]) : null; }
  const m = miraOra, sm = m ? aSchermo(m.p) : null, rpx = sm ? m.raggio * sm.k : 0;
  if (sm && rpx < 0.3 * H && sm.x > -50 && sm.x < W + 50 && sm.y > -50 && sm.y < H + 50) { const r = Math.max(9, rpx * 1.15 + 5);
    anello.hidden = false; anello.className = m.fermo || m.volo ? 'anello fermo' : 'anello'; Object.assign(anello.style, { left: `${sm.x}px`, top: `${sm.y}px`, width: `${2 * r}px`, height: `${2 * r}px` });
    nomeA.hidden = false; nomeA.textContent = (m.volo ? 'in volo verso ' : '') + (nomeCosa(m.b) || m.nome || ''); Object.assign(nomeA.style, { left: `${sm.x}px`, top: `${sm.y + r + 3}px`, opacity: 1 }); }
  else { anello.hidden = true; nomeA.hidden = true; }
  // le etichette: le cose più grandi a schermo, con l'opacità dal raggio angolare (da 2 a 8 pixel compaiono; da un quinto
  // a un terzo dell'altezza dello schermo svaniscono: lì la cosa è il paesaggio, non ha bisogno di nome)
  const viste = [], nomeMeta = m ? nomeCosa(m.b) : null;
  for (const b of S.bersagli) { const d = Math.hypot(b.p[0], b.p[1], b.p[2]); if (d <= b.raggio) continue; const r = (b.raggio / d / S.tanY) * (H / 2); if (r < 2 || r > 0.35 * H) continue; viste.push([r, b]); }
  viste.sort((a, b) => b[0] - a[0]); let n = 0;
  for (const [r, b] of viste) { if (n >= etichette.length) break; const s = aSchermo(b.p); if (!s || s.x < 0 || s.x > W || s.y < 0 || s.y > H) continue; const nome = nomeCosa(b); if (!nome || nome === nomeMeta) continue;
    const e = etichette[n++]; e.hidden = false; e.textContent = nome; Object.assign(e.style, { left: `${s.x}px`, top: `${s.y + r + 3}px`, opacity: (0.8 * rampa(r, 2, 8) * (1 - rampa(r, 0.2 * H, 0.35 * H))).toFixed(2) }); }
  for (; n < etichette.length; n++) etichette[n].hidden = true;
}
function montaMondo() {
  const serve = camMappa && !senzaMondo3D && camMappa.livello <= 4 && camMappa.via;
  // (il bottone per tornare nello spazio, quando si è scelta la mappa piatta)
  if (senzaMondo3D === 'scelta' && !bottoneMondo) { bottoneMondo = document.createElement('button'); bottoneMondo.textContent = '◉ nello spazio (3D)'; bottoneMondo.style.cssText = 'position:absolute;left:12px;top:12px;z-index:3;font:inherit;padding:4px 9px;border:1px solid #666;border-radius:4px;background:rgba(20,20,24,0.85);color:#eee;cursor:pointer'; bottoneMondo.onclick = () => { senzaMondo3D = false; bottoneMondo.remove(); bottoneMondo = null; montaMondo(); }; tela.parentNode.appendChild(bottoneMondo); }
  if (!serve) { if (telaMondo) smontaMondo(); return; }
  if (telaMondo) return;
  try {
    telaMondo = document.createElement('canvas'); telaMondo.tabIndex = 0; telaMondo.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;outline:none;touch-action:none'; tela.parentNode.insertBefore(telaMondo, tela.nextSibling);
    mondo3d = creaNucleo(telaMondo, { alPassaggio: () => seguiMondo(), conserva: true, quotaMinima: 0.004 }); mondoPosato = false; // (conserva: per l'istantanea della dissolvenza; quotaMinima: fino ai centimetri della roccia)
    const L = camMappa.livello, via = { ...camMappa.via }, R = L >= 3 ? sistemaDi(via.cosmo, via.galassia, via.stella).pianeti[via.pianeta]?.raggioM : 0;
    // se l'ultima bolla tenuta è proprio in questo luogo (stesso cosmo, galassia, stella, pianeta fin dove la mappa arriva), si
    // riparte da lei: stesso punto, stessa grandezza, stesso istante (così anche tornando su dalla materia o dalla mappa piatta)
    // (all'avvio no: si parte da lontano, col pianeta intero)
    let tenuta = null; try { tenuta = L === 4 || primoMondo ? null : leggiBolla(localStorage.getItem(CHIAVE_BOLLA)); } catch { tenuta = null; } primoMondo = false;
    if (tenuta) { const vb = viaDellaBolla(tenuta), chiavi = ['cosmo', 'galassia', 'stella', 'pianeta'].slice(0, Math.min(L, 3) + 1); if (!tenuta.posizione || vb.luna != null || chiavi.some((k) => vb[k] !== via[k]) || (L < 3 && vb[['galassia', 'stella', 'pianeta'][L]] != null)) tenuta = null; }
    universo3d = creaUniverso(mondo3d, { via, livello: ['cosmo', 'galassia', 'sistema', 'pianeta', 'pianeta'][L], bolla: tenuta, superficie: (v) => superficieDi(v) });
    { const vaiA = universo3d.vaiA, U = universo3d; if (vaiA) U.vaiA = (meta, o) => { preparaVolo(meta, U); return vaiA(meta, o); }; } // (la superficie della meta si prepara durante il volo: mappa.js preparaVolo)
    // sulla superficie (livello 4): sopra lo stesso punto della mappa, alla quota da cui si vede la stessa larghezza
    // (risalendo dalla roccia: camMappa.quota3d, la quota da cui il suolo è largo quanto la roccia era a schermo, guardando giù)
    const dallaRoccia = camMappa.quota3d > 0 ? camMappa.quota3d : 0; delete camMappa.quota3d;
    if (L === 4 && R) { const lon = camMappa.cx * 2 * Math.PI - Math.PI, lat = Math.PI / 2 - camMappa.cy * 2 * Math.PI, quota = dallaRoccia ? Math.max(0.004, dallaRoccia) : Math.max(30, Math.min(2 * R, ((tela.height * 2 * Math.PI * R) / camMappa.z) / (2 * Math.tan(0.375)))); let giri = 0, posata = false;
      const posa = setInterval(() => { if (!mondo3d || ++giri > 60) { mondoPosato = true; return clearInterval(posa); } if (universo3d.pronto() && mondo3d.camera.corpo?.punto) {
        // (ci si posa, e si controlla al giro dopo che la camera sia rimasta lì: appena montato il mondo può riattaccarla altrove)
        const h = mondo3d.dove().quota; if (posata && h > 0 && Math.abs(Math.log(h / quota)) < 0.3) { clearInterval(posa); mondoPosato = true; return; }
        vaiSopra({ lon, lat, quota, direzione: 0, alza: dallaRoccia ? -1.54 : quota > 0.05 * R ? -1.5 : -0.5 }); posata = true; } }, 100); }
    else { const guarda = setInterval(() => { if (!mondo3d || universo3d.pronto()) { clearInterval(guarda); mondoPosato = true; } }, 100); }
    mondo3d.avvia();
    segniMondo = document.createElement('div'); segniMondo.className = 'segni3d'; segniMondo.innerHTML = '<div class="anello" hidden></div><span class="meta" hidden></span>' + '<span hidden></span>'.repeat(6); tela.parentNode.insertBefore(segniMondo, telaMondo.nextSibling);
    if (!giroSegni) giroSegni = requestAnimationFrame(segni3d);
    // il doppio clic su una cosa (una galassia, una stella, un pianeta): il volo fin lì (universo.js, vaiA)
    telaMondo.addEventListener('dblclick', (e) => { if (!mondoPosato) return; const r = telaMondo.getBoundingClientRect(), b = mondo3d.cosaSotto(e.clientX - r.left, e.clientY - r.top); if (b) universo3d.vaiA(b, { fine: () => rigaMondo() }); });
    telaMondo.addEventListener('pointermove', (e) => { const r = telaMondo.getBoundingClientRect(); cursoreMondo = [e.clientX - r.left, e.clientY - r.top]; });
    // VICINO AL SUOLO (sotto i tre chilometri) la rotella è questa: si scende verso il punto sotto il cursore e lo sguardo si
    // raddrizza piano verso il basso (del tutto sotto il metro), così il suolo diventa una carta vista dall'alto; quando il
    // suolo a schermo è largo quanto la roccia di quel punto, si entra nella roccia (scendiNellaMateria), alla stessa grandezza.
    telaMondo.addEventListener('wheel', (e) => {
      // (mentre il mondo si prepara e si posa sopra il punto, la rotella non fa niente: prima la camera non è ancora attaccata al
      // pianeta, e la rotella libera dello spazio la porterebbe lontano, oltre la galassia)
      if (!mondo3d) return; if (!mondoPosato) { e.stopImmediatePropagation(); e.preventDefault(); return; } if (!mondo3d.camera.corpo?.punto) return;
      const d = mondo3d.dove(); if (d.quota < 0) { e.stopImmediatePropagation(); e.preventDefault(); vaiSopra({ lon: d.lon, lat: d.lat, quota: quotaVoluta || 1, direzione: d.direzione, alza: d.alza }); return; } if (!(d.quota < 3000)) return;
      e.stopImmediatePropagation(); e.preventDefault(); mondo3d.fermaZoom(); universo3d.fermaVolo(); // (qui la rotella è questa: lo zoom e il volo del nucleo si fermano)
      const k = Math.exp(Math.max(-0.7, Math.min(0.7, e.deltaY * 0.0016))), q = d.quota * k;
      if (k < 1 && q < 3) { const v = universo3d.viaOra(); if (v.pianeta != null && q <= Math.max(quotaDellaRoccia(camRoccia(d, v)), 0.006)) return scendiNellaMateria(q); }
      let lon = d.lon, lat = d.lat; const r = telaMondo.getBoundingClientRect(), sotto = k < 1 ? mondo3d.sotto(e.clientX - r.left, e.clientY - r.top) : null;
      if (sotto && sotto.distanza < 30 * Math.max(d.quota, 1)) { let dl = sotto.lon - lon; dl -= 2 * Math.PI * Math.round(dl / (2 * Math.PI)); lon += dl * (1 - k); lat += (sotto.lat - lat) * (1 - k); }
      // (lo sguardo dipende solo dalla quota, così risalendo si ripassa per gli stessi sguardi della discesa: dall'inclinazione
      // che si aveva entrando sotto i tre chilometri, in proporzione al logaritmo della quota, fino a dritto in giù al metro)
      if (!ingressoSuolo || d.quota >= ingressoSuolo.q) ingressoSuolo = { q: Math.max(1.0001, d.quota), alza: d.alza };
      const alza = -1.54 + (ingressoSuolo.alza + 1.54) * Math.max(0, Math.log(Math.max(1, q))) / Math.log(ingressoSuolo.q);
      vaiSopra({ lon, lat, quota: Math.max(q, 0.004), direzione: d.direzione, alza }); rigaMondo();
    }, { capture: true, passive: false });
    // il tempo del mondo: più lento, pausa, più veloce, e quanto vale; e il ritorno alla mappa piatta
    barraMondo = document.createElement('div'); barraMondo.style.cssText = 'position:absolute;left:12px;top:12px;z-index:3;font:inherit;display:flex;gap:4px;align-items:center;padding:3px 7px;border:1px solid #555;border-radius:4px;background:rgba(20,20,24,0.8);color:#eee';
    barraMondo.innerHTML = '<button data-t="-1" title="il tempo più lento (,)">◀◀</button><button data-t="0" title="pausa (p)">❚❚</button><button data-t="1" title="il tempo più veloce (.)">▶▶</button><span style="min-width:11em"></span><button data-t="passo" title="il passo del tempo che ha senso a questa grandezza (ore per un pianeta, milioni di anni per una galassia)">≈</button><button data-t="piatta" title="la mappa piatta di prima (con le regioni in cui entrare)">▦ mappa piatta</button>';
    const tempoMondo = (su) => { const T = mondo3d.tempo; if (su === 0) T.pausa = !T.pausa; else { const k = VELOCITA_MONDO.findIndex((v) => v >= T.velocita); T.velocita = VELOCITA_MONDO[Math.max(0, Math.min(VELOCITA_MONDO.length - 1, (k < 0 ? VELOCITA_MONDO.length - 1 : k) + su))]; } rigaMondo(); };
    for (const b of barraMondo.querySelectorAll('button')) { b.style.cssText = 'font:inherit;padding:1px 7px;border:1px solid #666;border-radius:3px;background:#222;color:#eee;cursor:pointer'; b.onclick = () => { if (b.dataset.t === 'passo') { mondo3d.tempo.velocita = passoSensato(universo3d.bolla().grandezza); mondo3d.tempo.pausa = false; rigaMondo(); } else if (b.dataset.t === 'piatta') { seguiMondo(); senzaMondo3D = 'scelta'; smontaMondo(); montaMondo(); disegna(); dove(); } else tempoMondo(+b.dataset.t); }; }
    telaMondo.addEventListener('keydown', (e) => { if (e.key === ',') tempoMondo(-1); else if (e.key === '.') tempoMondo(1); else if (e.key === 'p') tempoMondo(0); });
    tela.parentNode.insertBefore(barraMondo, telaMondo.nextSibling);
    orologioMondo = setInterval(rigaMondo, 400); rigaMondo();
  } catch (err) { console.warn('il mondo in tre dimensioni non si è potuto montare: resta la mappa piatta', err); smontaMondo(); senzaMondo3D = true; }
}
// il volo sulla mappa piatta verso una cosa cliccata
function passoVolo() {
  if (!volo) return;
  const W = tela.width, H = tela.height, r = volaVerso(camMappa, volo, W, H);
  // arrivati (o sopra una regione, che è solo un posto del pianeta): se l'oggetto è ora un livello, ci si ferma
  if (r?.entra || ++volo.passi > 160 || (volo.livello !== camMappa.livello)) { volo = null; sopraMappa = null; aggiornaVista(); return; }
  disegna(); dove(); requestAnimationFrame(passoVolo);
}
// ---------- la mano sulla mappa piatta: trascinare, passare sopra, cliccare per volare lì
let presa = null;
tela.addEventListener('pointerdown', (e) => { tela.setPointerCapture(e.pointerId); volo = null; presa = { sx: e.clientX, sy: e.clientY, cx: camMappa.cx, cy: camMappa.cy }; });
tela.addEventListener('pointermove', (e) => {
  const dpr = devicePixelRatio || 1, r = tela.getBoundingClientRect();
  if (presa) { camMappa.cx = presa.cx - ((e.clientX - presa.sx) * dpr) / camMappa.z; camMappa.cy = presa.cy - ((e.clientY - presa.sy) * dpr) / camMappa.z; disegna(); return; }
  let h = colpisciMappa(camMappa, (e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr, tela.width, tela.height);
  if (h?.tipo === 'materia') h = null; // (in fondo alla roccia: lì un clic entrava nel pattern; ora la mappa non ha niente da offrire, si scende con la rotella)
  if ((h?.testo || null) !== (sopraMappa?.testo || null)) { sopraMappa = h; tela.style.cursor = h ? 'pointer' : 'grab'; disegna(); }
});
tela.addEventListener('pointerup', (e) => {
  if (!presa) return; const fermo = Math.hypot(e.clientX - presa.sx, e.clientY - presa.sy) < 5; presa = null;
  if (fermo && sopraMappa && !['buco', 'punto', 'materia', 'regione'].includes(sopraMappa.tipo)) { volo = { pos: sopraMappa.pos, scala: sopraMappa.scala, livello: camMappa.livello, passi: 0 }; requestAnimationFrame(passoVolo); }
});
tela.parentNode.addEventListener('wheel', (e) => { const r = tela.parentNode.getBoundingClientRect(); puntoRotella = [e.clientX - r.left, e.clientY - r.top]; oraRotella = performance.now(); }, { capture: true, passive: true });
tela.addEventListener('wheel', (e) => {
  e.preventDefault(); volo = null;
  const r = tela.getBoundingClientRect(), dpr = devicePixelRatio || 1, k = Math.exp(-e.deltaY * 0.0015), m = Math.min(tela.width, tela.height);
  // nel livello 5 i passi sono una scala sola, disegnati uno dentro l'altro (la roccia: cristallo, lamina, atomi; l'acqua e il
  // suolo: le finestre di dieci in dieci, che si fondono secondo la grandezza a schermo, mappa.js disegnaFinestre): niente
  // istantanea che sfuma col tempo; la dissolvenza resta solo entrando e uscendo dal livello
  const in5 = camMappa?.livello === 5, chiave = (c) => `${c.livello}`, prima = in5 ? chiave(camMappa) : null, img = in5 ? istantanea() : null;
  if (in5) {
    const R = rocciaDi(camMappa);
    // in cima (la roccia intera, o il campione d'acqua più grande): si torna nello spazio sopra lo stesso punto, guardando giù,
    // alla quota da cui il suolo è largo quanto la roccia era a schermo
    // (in cima vuol dire: il campione d'acqua più grande, la finestra del suolo più grande, o la roccia dove non c'è suolo; la
    // soglia è la stessa dell'entrata, Z5_ROCCIA, quindi sotto, nelle catene di finestre, si cambia finestra prima di uscire)
    const inCima = R && !camMappa.passoRoccia && !camMappa.eventoAcqua && (camMappa.suAcqua ? (camMappa.latoAcqua ?? 1) >= 0.5 : R.suolo ? R.larghezzaM >= LATI_SUOLO[0] * 0.999 : !rocciaDi({ ...camMappa, latoSuolo: LATI_SUOLO[LATI_SUOLO.length - 1], passoRoccia: 0 })?.suolo);
    if (k < 1 && camMappa.z * k < Z5_ROCCIA * m && inCima && !senzaMondo3D) {
      const q = (R.larghezzaM * tela.height) / (camMappa.z * k) / (2 * tanMondo());
      camMappa = { livello: 4, via: { ...camMappa.via }, cx: camMappa.roccia.cx, cy: camMappa.roccia.cy, z: 5.5e6, quota3d: q };
      sopraMappa = null; smontaAtomi(); montaMondo(); disegna(); dove(); mostraPannello(); avviaPassaggio(img, { pronto: () => mondoPosato }); return;
    }
    // (in fondo, gli atomi: in tre dimensioni li monta montaAtomi quando il loro campione riempie lo schermo; le tracce delle
    // particelle non stanno in fondo ma alla loro scala, sovrapposte a ciò che c'è lì: disegnaSopra)
  }
  // (una regione grande quanto lo schermo: lì un tempo si entrava nel pattern, poi lo zoom sulla mappa piatta vi si fermava.
  // Ora la rotella prosegue verso la superficie: da lì lo sguardo scivola verso il pianeta, mappa.js passaggi, «versoSuolo»,
  // finché si torna indietro o si cambia livello)
  if (camMappa.versoSuolo && (k < 1 || camMappa.livello !== 3)) delete camMappa.versoSuolo;
  const esito = zoomMappa(camMappa, (e.clientX - r.left) * dpr, (e.clientY - r.top) * dpr, k, tela.width, tela.height);
  if (esito?.entra) { camMappa.z = Math.min(camMappa.z, (1.1 * m) / LATO_REGIONE); camMappa.versoSuolo = true; }
  if (camMappa.versoSuolo && camMappa.livello !== 3) delete camMappa.versoSuolo;
  sopraMappa = null; montaAtomi(); montaMondo(); disegna(); dove(); mostraPannello(); if (!animazione) animazione = requestAnimationFrame(anima);
  if (in5 && chiave(camMappa) !== prima) avviaPassaggio(img);
}, { passive: false });

// ---------- il pannello del luogo (nel visore: le spiegazioni del taccuino, e i bottoni che i suoi tasti premono)
function mostraPannello() { const h = []; pannelloCosmo(h); pannello.innerHTML = h.join(''); }
// la superficie di un pianeta con acqua: una pozza scaldata dal basso (fluidi.js). La profondità si
// sceglie dall'indirizzo, attorno a quella in cui l'acqua comincia a muoversi
const superfici = new Map();
function superficie(v) {
  const k = JSON.stringify(v); if (superfici.has(k)) return superfici.get(k);
  const P = sistemaDi(v.cosmo, v.galassia, v.stella).pianeti[v.pianeta], q = P.interno.q, g = P.clima.g; // il calore che esce dall'interno: quello di interno(), lo stesso scritto nel pannello
  let lo = 1e-4, hi = 1; for (let i = 0; i < 50; i++) { const m = Math.sqrt(lo * hi); if (convezione({ g, q, d: m }).epsilon < 0) lo = m; else hi = m; }
  // (la profondità e il seme delle celle: due eventi con nome della pozza, non più due passi di un generatore 16807)
  const ev = sorgenteEvento('pozza', v.cosmo, v.galassia, v.stella, v.pianeta), sd = ev.seme('celle');
  const d = hi * (1.03 + 0.35 * ev('profondità')), c = convezione({ g, q, d }), out = { P, q, d, c, url: null }; superfici.set(k, out);
  // (le celle sono 600 passi di Swift-Hohenberg su 128²: quasi due secondi. Le fa volume.worker.js; quando arrivano il
  // pannello si rifà con l'immagine. Senza filo, qui)
  const disegnaPozza = (r) => { const cv = document.createElement('canvas'); cv.width = cv.height = r.N; const x = cv.getContext('2d'), im = x.createImageData(r.N, r.N); let mx = 1e-9; for (const w of r.u) mx = Math.max(mx, Math.abs(w)); for (let i = 0; i < r.N * r.N; i++) { const t = 0.5 + 0.5 * (r.u[i] / mx); im.data[4 * i] = 40 + 150 * t; im.data[4 * i + 1] = 80 + 140 * t; im.data[4 * i + 2] = 120 + 120 * t; im.data[4 * i + 3] = 255; } x.putImageData(im, 0, 0); out.url = cv.toDataURL(); };
  if (c.epsilon > 0) { let w = null; try { w = new Worker(new URL('../tre/volume.worker.js', import.meta.url), { type: 'module' }); } catch { w = null; }
    if (!w) disegnaPozza(celle(c, { seme: sd }));
    else { w.onmessage = (e) => { w.terminate(); if (e.data.errore) { console.error('la pozza non si è potuta fare:', e.data.errore); return; } disegnaPozza(e.data); if (superfici.get(k) === out) mostraPannello(); }; w.postMessage({ tipo: 'pozza', c, seme: sd }); } }
  return out;
}
function pannelloCosmo(h) {
  h.push(`<div class="briciole"><b>dove si trova</b></div>`);
  h.push(`<p class="nota">${percorso(camMappa).join(' › ')}</p>`);
  h.push(`<div class="riga-bottoni"><button class="primo" data-finestra-bella title="prova molte inquadrature qui attorno, a questa scala, e va dove il mondo disegna di più">🎲 una finestra bella a questa scala</button></div><p class="nota" id="finestraStato">La finestra è un punto di osservazione qualsiasi, a qualsiasi scala: le galassie, le orbite, i continenti, i fiumi, i cristalli, le particelle. Il disegno c'è già: lo si cerca.</p>`);
  h.push(`<p class="aiuto">L'universo intero, da esplorare. Nessun bordo: lo spazio si richiude su sé stesso. Ogni cosa ha una causa più in là: le galassie nascono dove le fluttuazioni dell'inizio hanno lasciato più materia; le stelle nei bracci; i pianeti attorno alle stelle; le regioni nell'anello o nel campo dei pianeti. <b>Avvicinati con la rotella</b> fino alle particelle, <b>allontanati</b> fino alla rete delle galassie.</p>`);
  {
    if (camMappa.livello >= 3) {
      const P = sistemaDi(camMappa.via.cosmo, camMappa.via.galassia, camMappa.via.stella).pianeti[camMappa.via.pianeta], cl = P.clima;
      // LA TEMPERATURA: una sola. Finché la mappa non c'è è quella del bilancio di energia per fasce di latitudine (clima(), leggi.js);
      // quando la mappa è pronta è quella dello stesso bilancio risolto lì sopra, con le terre, i mari, i venti e le nuvole veri
      const mappaPronta = P.interno && P.tipo !== 'gassoso' ? superficieDi(camMappa.via) : null, Tmedia = mappaPronta ? mappaPronta.cl.Tglobale : cl.T;
      const origineT = P.tipo === 'gassoso' ? 'dove la pressione è di un bar' : mappaPronta ? 'in media sulla superficie: dal bilancio di energia sulla mappa del pianeta, con le sue terre, i suoi mari e i suoi venti' : 'in media sulla superficie: dal bilancio di energia per fasce di latitudine (luce assorbita, ghiaccio e nuvole che la rimandano, serra dei gas dell\'aria)';
      h.push(`<h2>il pianeta</h2><p class="nota">${Math.round(Tmedia - 273.15)} °C ${origineT} (${Math.round(cl.Teq - 273.15)} °C senza atmosfera), ${isFinite(cl.pressione) ? (cl.pressione < 1 ? 'nessuna atmosfera' : `${(cl.pressione / 1e5).toPrecision(2)} bar`) : 'un gigante di gas'}, gravità ${cl.g.toFixed(1)} m/s², acqua ${cl.acqua}. Trattiene: ${cl.tenuti.join(', ') || 'niente'}. Tutto discende dalla luce della sua stella, dalla distanza, dalla massa e da che cosa è fatto.</p>`);
      // UN PIANETA PARALLELO: lo stesso pianeta, della stessa stella, in un cosmo dove UN SOLO evento della sua storia è
      // andato diversamente: l'impatto che più ha segnato il suo mantello è caduto in un altro punto. Tutti gli altri
      // impatti, la luna, il giorno, la massa restano identici; cambia ciò che ne discende (i continenti, quel cratere).
      { const v = camMappa.via, st = P.tipo !== 'gassoso' ? P.impatti : null, prima = st ? st.grandi.filter((g) => g.t <= st.quiete.t) : [];
        const peso = (g) => g.energiaJ * Math.exp(-(st.quiete.t - g.t) / st.mescolaAnni), g = prima.length ? prima.reduce((a, b) => (peso(b) > peso(a) ? b : a)) : null;
        const ev = g ? `cosmo ${cosmoBase(v.cosmo)}/galassia ${v.galassia}/stella ${v.stella}/pianeta ${v.pianeta}/impatto ${g.id}/dove` : `mantello/${v.galassia}/${v.stella}/${v.pianeta}`;
        const r = ramiCosmo(v.cosmo)[ev] || 0, n = Object.keys(ramiCosmo(v.cosmo)).length;
        const che = g ? `un corpo di ${Math.round(g.diametroM / 1000)} km, caduto ${g.t >= 1e9 ? `${(g.t / 1e9).toFixed(1).replace('.', ',')} miliardi` : `${Math.round(g.t / 1e6)} milioni`} di anni dopo la nascita del sistema, è caduto in un altro punto` : 'il suo mantello è partito da un altro stato';
        if (P.tipo !== 'gassoso') h.push(`<p class="nota"><button data-ramo-p="${ev}|${r + 1}">✦ un pianeta parallelo</button>${n ? ` <button data-ramo-p="|0">↩ il cosmo di partenza</button>` : ''}<br>${r ? `Sei in un cosmo parallelo (${n} ${n === 1 ? 'evento andato' : 'eventi andati'} diversamente): ${che}. Stessa stella, stessa massa, stessa luna, stessi altri impatti; cambia ciò che ne discende.` : `Lo stesso pianeta in un cosmo dove un solo evento è andato diversamente: ${che}. Tutto il resto del cosmo resta identico; cambia ciò che ne discende (${P.interno?.tettonica === 'a placche' ? 'i continenti, quel cratere' : 'quel cratere'}).`}</p>`); }
      // L'ARIA e la prima tappa verso la vita
      if (P.atmosfera) {
        const gas = Object.entries(P.atmosfera.gas).sort((x, y) => y[1] - x[1]).filter(([, f]) => f > 0.001).slice(0, 5).map(([g, f]) => `${g} ${(f * 100).toFixed(f < 0.1 ? 1 : 0)}%`).join(', ');
        const pre = P.prebiotica, idro = cl.acqua === 'liquida' && P.interno?.vulcani > 0;
        h.push(`<h2>l'aria e i mattoni della vita</h2><p class="nota">${gas ? `L'aria: ${gas}` : "Nessun'aria"}${P.atmosfera.riducente ? ' (ricca di idrogeno: riducente)' : gas ? " (senza idrogeno libero: ossidata)" : ''}. Viene dai gas che la gravità trattiene, all'equilibrio chimico a quella temperatura.${pre ? ` Le reazioni che fanno i mattoni (scariche elettriche e ultravioletto nell'aria, come nel famoso esperimento): ${pre.HCN > 0.1 ? 'rendono molto' : pre.HCN > 1e-3 ? 'rendono poco' : 'non rendono quasi niente'}${P.atmosfera.riducente ? '' : ", perché l'aria è ossidata"}.` : ''} ${idro ? "Sul fondo del mare l'interno caldo alimenta sorgenti idrotermali: un altro posto dove i mattoni si formano e si concentrano." : cl.acqua === 'liquida' ? "C'è acqua liquida, ma l'interno è freddo: niente sorgenti calde." : "Senza acqua liquida i mattoni non hanno dove incontrarsi."}${pre?.autocatalisi ? ' Ci sono le condizioni perché gli zuccheri si moltiplichino da soli (formaldeide, acqua liquida, un minerale basico).' : ''} Nessuna vita: solo le condizioni.</p>`);
      }
      try {
        const v = camMappa.via, Gx = galassiaDi(v.cosmo, v.galassia), St = Gx.stelle[v.stella], chiave = `${v.cosmo}|${v.galassia}|${v.stella}|${v.pianeta}`;
        let ris = risalite.get(chiave); if (!ris) { ris = risalita(luogoDaAria({ P }), { P, stella: St, galassia: Gx, posizione: St.pos }); risalite.set(chiave, ris); if (risalite.size > 8) risalite.delete(risalite.keys().next().value); }
        h.push(`<h2>che cosa fanno qui le particelle</h2><p class="nota">${ris.breve.join('<br>')}</p>`);
      } catch { /* il pannello resta com'era */ }
      // PERCHÉ È FATTO COSÌ: la catena delle cause, dall'inizio al suo nucleo
      {
        const v = camMappa.via, Gx = galassiaDi(v.cosmo, v.galassia), St = Gx.stelle[v.stella], Gg = Gx.G, ANNI = 3.156e7;
        const dopo = (13.8e9 - St.eta - Gg.formazione / ANNI) / 1e9, rc = Math.hypot(...St.pos);
        h.push(`<h2>perché è fatto così</h2><ol class="nota catena">
          <li><b>L'inizio.</b> Le fluttuazioni dell'universo appena nato (quelle che si vedono ancora nella radiazione cosmica di fondo) qui erano ${Gg.peso.toFixed(1)} volte più dense della media.</li>
          <li><b>La galassia.</b> Su quel picco la materia è collassata presto: la galassia ${v.galassia + 1} ha cominciato a fare stelle ${(Gg.formazione / ANNI / 1e9).toFixed(1)} miliardi di anni dopo l'inizio.</li>
          <li><b>Le generazioni di stelle.</b> Le stelle grandi vivono pochi milioni di anni ed esplodono, lasciando nel gas ferro, silicio, ossigeno. Questa stella è nata ${Math.max(0, dopo).toFixed(1)} miliardi di anni dopo le prime, a ${rc.toFixed(2)} raggi dal centro: il suo gas aveva ${St.Z.toFixed(2)} volte i metalli del Sole.</li>
          <li><b>Il disco.</b> Dal gas della stella giovane, il disco: ${P.tipo === 'roccioso' ? `vicino alla stella, dove fa caldo, restano solo roccia e metalli; ferro al ${Math.round((P.composizione.ferro ?? 0) * 100)}%` : P.tipo === 'ghiacciato' ? 'oltre la linea della neve, roccia e ghiaccio' : 'oltre la linea della neve un nucleo abbastanza grande da catturare il gas'}.</li>
          <li><b>Il pianeta.</b> ${P.interno && P.tipo !== 'gassoso' ? `Fuso da giovane, il ferro è sceso nel nucleo (${Math.round(P.interno.nucleo * 100)}% del raggio); la radioattività ereditata dalle stesse supernove lo scalda ancora (${P.interno.q.toFixed(3)} W/m²), ${P.interno.dinamo ? 'e il nucleo liquido fa il campo magnetico' : 'ma non abbastanza: il nucleo si è congelato e il campo è sparito'}.` : 'Il gas avvolge il nucleo.'}</li>
        </ol>`);
      }
      const it = P.interno;
      if (it) h.push(`<h2>l'interno</h2><p class="nota">${P.tipo === 'gassoso' ? `idrogeno metallico in profondità: la dinamo fa un campo di ${Math.round(P.B0 * 1e9).toLocaleString('it-IT')} nT.` : `un nucleo di ferro largo ${Math.round(it.nucleo * 100)}% del raggio, ${it.dinamo ? `ancora liquido: la dinamo fa un campo di ${Math.round(P.B0 * 1e9).toLocaleString('it-IT')} nT` : 'congelato: nessuna dinamo, nessun campo magnetico'}; il calore che esce dall'interno ${it.q.toFixed(3)} W/m²; la crosta ${it.tettonica === 'a placche' ? 'si è rotta in placche (il mantello spinge e l\'acqua la indebolisce)' : it.tettonica === 'ferma' ? 'è un guscio unico e fermo' : 'è un guscio unico, bucato dai vulcani'}.`}</p>`);
      // la superficie si calcola in secondo piano (mappa.js): finché non è pronta il pannello lo dice, poi si aggiorna da sé
      const Sx = it && P.tipo !== 'gassoso' ? superficieDi(camMappa.via) : null;
      if (it && P.tipo !== 'gassoso' && !Sx) h.push(`<h2>il clima e la superficie</h2><p class="nota">La superficie si sta formando: la deriva dei continenti per tutta l'età del pianeta, il clima, l'aria che circola, la pioggia e l'erosione. Qualche secondo.</p>`);
      if (Sx) {
        const clm = Sx.cl, sf = Sx.se, px = immagineSuperficie(sf, cl.T, clm);
        h.push(`<h2>il clima</h2><p class="nota">${P.bloccato ? `Le maree della stella lo hanno frenato: le mostra sempre la stessa faccia (il giorno dura quanto l'anno, ${(P.anno / 86400).toFixed(0)} giorni terrestri).` : `Gira in ${(P.giorno / 3600).toFixed(0)} ore, con l'asse inclinato di ${Math.round(P.obliquita)}° (le stagioni); l'anno dura ${(P.anno / 86400).toFixed(0)} giorni terrestri; la rotazione lo schiaccia ai poli del ${(P.schiacciamento * 100).toFixed(1)}%.`} Simulato per molti anni (luce che arriva, calore irradiato e trattenuto dall'atmosfera, calore portato dall'aria e dal mare, ghiaccio che riflette la luce): ghiaccio sul ${Math.round(clm.ghiaccio * 100)}%${clm.ghiaccio > 0.97 ? ': il ghiaccio, riflettendo la luce, ha raffreddato il pianeta fino a coprirlo tutto' : P.bloccato && clm.ghiaccio > 0.2 ? ': mare aperto sotto la stella, ghiaccio sul lato in ombra' : ''}.</p>`);
        const cv = document.createElement('canvas'); cv.width = sf.W; cv.height = sf.H; cv.getContext('2d').putImageData(new ImageData(px, sf.W, sf.H), 0, 0);
        h.push(`<h2>la superficie</h2><img src="${cv.toDataURL()}" style="width:100%;border-radius:3px;image-rendering:auto" alt="la mappa del pianeta"><p class="nota">${sf.placche > 1 ? `il mantello si è organizzato da solo in circa ${sf.placche} celle: dove sale (pennacchi) la crosta si apre, dove scende (una rete di fosse) si accartoccia in montagne e raccoglie la crosta leggera dei continenti` : 'una crosta sola, senza placche'}; i colori sono quelli dei materiali (basalto scuro, roccia chiara dei continenti, il rosso del ferro ossidato, sedimenti pallidi lungo i fiumi; nessun verde: non c'è vita); ${isFinite(sf.mare) ? 'il mare riempie i punti più bassi con l\'acqua che il pianeta ha' : 'niente mari'}; poi ${sf.passiErosione} passi di erosione: la pioggia (dove il clima la permette) scorre, scava le valli in proporzione alla portata e alla pendenza, riempie le conche dove l'acqua che arriva supera quella che evapora (${sf.celleLago ? 'qui ci sono laghi' : 'qui nessun lago'}); in rosso i vulcani (${sf.vulcani.length}). Nessuno l'ha disegnata: viene dalla massa, dalla composizione e dall'età.</p>`);
      }
      // IL MARE (mare.js): che cosa c'è sciolto, e perché
      if (Sx?.mare) {
        const M = Sx.mare;
        if (!M.esiste) h.push(`<h2>il mare</h2><p class="nota">${M.motivo || 'Qui non c\'è acqua liquida in superficie.'}</p>`);
        else {
          const ioni = Object.entries(M.ioni || {}).map(([f, x]) => [f, typeof x === 'number' ? x : x?.moliPerKg ?? 0]).filter(([, x]) => x > 1e-4).sort((p, q) => q[1] - p[1]).slice(0, 6);
          h.push(`<h2>il mare</h2><p class="nota">${M.storia || ''}</p><p class="nota">Salinità ${M.salinitaMedia.toFixed(1)} g per kg d'acqua, pH ${M.pH.toFixed(1)}. Sciolti (moli per kg): ${ioni.map(([f, x]) => `${f} ${x.toPrecision(2)}`).join(', ')}.${M.laghi?.length ? ` Laghi: ${M.laghi.length}${M.laghi.some((l) => l.pH > 9) ? ', alcuni di soda' : ''}.` : ''}${M.sorgentiCalde?.length ? ` Sorgenti calde sul fondo: ${M.sorgentiCalde.length}.` : ''} Avvicinati al mare fino in fondo: sotto il terreno più fine c'è un campione di quell'acqua, e dentro, di dieci in dieci, i granelli, i colloidi, gli ioni e le molecole di quel punto.</p>`);
        }
      }
      const climaSim = Sx ? Sx.cl : null;
      if (cl.acqua === 'liquida' && climaSim && climaSim.ghiaccio < 0.97) {
        const sf = superficie(camMappa.via);
        h.push(`<h2>la superficie: una pozza</h2><p class="nota">Il calore dell'interno (${sf.q.toFixed(3)} W/m²) attraversa una pozza profonda ${(sf.d * 100).toFixed(1)} cm: Rayleigh ${Math.round(sf.c.Ra)}, Marangoni ${Math.round(sf.c.Ma)} → ${sf.c.regime}.</p>${sf.url ? `<img src="${sf.url}" style="width:100%;image-rendering:auto;border-radius:3px" alt="la convezione nella pozza">` : ''}<p class="nota">Nessuno disegna le celle: l'acqua calda sale e quella fredda scende, e si organizzano da sole. Negli strati sottili vince la tensione della superficie e vengono esagoni (le celle di Bénard); più in profondità la gravità, e vengono rulli e labirinti.</p>`);
      }
    }
  }
}
pannello.addEventListener('click', (e) => {
  const t = e.target.closest('button'); if (!t) return;
  const d = t.dataset;
  if ('finestraBella' in d) { const r = cercaFinestra(camMappa, tela.width, tela.height); if (r) { camMappa.cx = r.cx; camMappa.cy = r.cy; camMappa.z = r.z; disegna(); dove(); const s = $('finestraStato'); if (s) s.textContent = `Trovata tra 28 inquadrature (${r.bellezza.totale.toFixed(2)}): ${r.bellezza.simmetria > 0.35 ? 'ha una simmetria' : r.bellezza.ripetizione > 0.35 ? 'ripete un motivo' : 'il disegno più ricco qui attorno'}. Ancora 🎲 per cercare da qui.`; } return; }
  if (d.ramoP) { const k = d.ramoP.lastIndexOf('|'), ev = d.ramoP.slice(0, k), r = +d.ramoP.slice(k + 1), nuovo = ev ? cosmoRamo(camMappa.via.cosmo, ev, r) : cosmoBase(camMappa.via.cosmo);
    // NELLO SPAZIO (3D) il mondo montato è quello del cosmo di prima, e montaMondo non lo rifà: lo si smonta e lo si rimonta nel
    // cosmo nuovo, con la camera dov'era (la stessa bolla — luogo, istante, posizione, sguardo — con i rami nuovi)
    if (mondo3d && universo3d) { let b = null; try { const b0 = universo3d.bolla(); b = bollaNuova({ percorso: b0.indirizzo.percorso, rami: ramiCosmo(nuovo), t: b0.t, posizione: b0.posizione, assi: b0.assi, grandezza: b0.grandezza, moto: b0.moto }); } catch { b = null; }
      camMappa.via = { ...camMappa.via, cosmo: nuovo }; if (camMappa.livello === 4) camMappa.livello = 3; // (la superficie si rimonta dalla bolla, non posandosi sul punto della mappa)
      smontaMondo(); montaMondo(); if (b && universo3d) universo3d.vaiAllaBolla(b); mostraPannello(); return; }
    camMappa.via = { ...camMappa.via, cosmo: nuovo }; aggiornaVista(); return; }
});
// la riga in basso: dove sei e che cosa puoi fare (nello spazio in tre dimensioni la scrive rigaMondo)
function dove() {
  $('dove').textContent = `${percorso(camMappa).join(' › ')}. Rotella per avvicinarti o allontanarti, trascina per muoverti, clic su una cosa per andarci. ${camMappa.livello === 0 ? 'Lo spazio si richiude su sé stesso: andando sempre dritto si torna qui.' : camMappa.livello === 3 ? 'Avvicinati al pianeta per scendere sulla sua superficie.' : camMappa.livello === 5 ? `${rocciaDi(camMappa)?.nome || ''}: ${(rocciaDi(camMappa)?.frase || '')}. ${telaAtomi ? `Atomo per atomo, in tre dimensioni: trascina per ruotare, rotella per avvicinarti (verso il cursore); allontanati oltre la scena per risalire; avvicinati fino in fondo per la scala quantistica, dove lo zoom finisce.` : 'Avvicinati: gli atomi di questa materia. Rotella indietro per risalire.'}` : camMappa.livello === 4 ? 'La superficie: avvicinandoti il terreno si calcola sempre più fine, dai continenti alle valli (fino a celle di una decina di metri). Passa sopra un punto per quota e temperatura.' : ''}`;
}
function aggiornaVista() {
  montaAtomi(); montaMondo(); disegna(); dove(); mostraPannello();
  if (!animazione) animazione = requestAnimationFrame(anima);
}
addEventListener('resize', disegna);
addEventListener('resize', () => vistaAtomi?.ridimensiona());
addEventListener('resize', () => mondo3d?.ridimensiona());
// si apre lo spazio sopra il punto d'avvio (AVVIO)
apriCosmo();
{ const v = viaDellIndirizzo(AVVIO); preparaSuperficie({ cosmo: v.cosmo, galassia: v.galassia, stella: v.stella, pianeta: v.pianeta }); } // (la sua superficie, già in un filo: mappa.js)
// quando una superficie calcolata in secondo piano è pronta: si ridisegna, e il pannello la mostra
quandoSuperficiePronta(() => { disegna(); mostraPannello(); });
// (le finestre del livello 5 si calcolano in secondo piano, mappa.js: quando una arriva la sua frase è nuova)
quandoFinestraPronta(() => { if (camMappa?.livello === 5) dove(); });
// ---------- CIÒ CHE C'È A OGNI SCALA, SOVRAPPOSTO: una tela sopra tutte le viste, che non prende la mano. A ogni grandezza ci si
// mette ciò che il modello ha a quella grandezza nel punto che si guarda, alla sua grandezza vera, centrato:
//   · LA FINESTRA DELLE PARTICELLE di quel punto (regola 10: è un luogo e una scala): le tracce, larghe quanto la cella
//     (le tracce di un muone nel ghiaccio ~30 cm sopra il suolo; le α attorno al granello tra il cristallo e la lamina);
//     scendendo la si attraversa: compare piccola, riempie lo schermo, si allarga oltre.
//   · nello spazio a pochi metri dal suolo, LA ROCCIA (o l'acqua) di quel punto, alla sua grandezza: quando riempie lo
//     schermo si è già dentro (scendiNellaMateria), allo stesso posto e alla stessa grandezza.
// Il punto è quello sotto la camera (nello spazio, guardando giù) o la roccia in cui si è; si ricalcola al più ogni 300 ms.
const telaSopra = document.createElement('canvas'); telaSopra.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2'; tela.parentNode.appendChild(telaSopra);
let sopraCalcolo = { t: 0, mpp: 0, P: null }, vociSopraOra = [], nebbiaOra = null; const tracceSopra = { cv: null, pop: null, mpp: 1, t: 0, mezza: 0, neb: null };
function camDelPunto() { // → { cam, verticale, chiave } o null
  if (vistaAtomi || telaQuanti) return null;
  if (mondo3d && universo3d && mondo3d.camera.corpo?.punto) { const d = mondo3d.dove(), v = universo3d.viaOra(); if (v.pianeta == null || !(d.quota < 600) || !(d.quota > 0)) return null; return { cam: camRoccia(d, v), verticale: Math.max(0, Math.min(1, (-(d.alza ?? 0) - 1.2) / 0.3)), chiave: `${JSON.stringify(v)}|${d.lon.toFixed(7)}|${d.lat.toFixed(7)}`, spazio: true }; }
  if (camMappa?.livello === 5) return { cam: camMappa, verticale: 1, chiave: `5|${JSON.stringify(camMappa.via)}|${camMappa.roccia?.cx}|${camMappa.roccia?.cy}|${camMappa.mineraleRoccia}`, spazio: false };
  return null;
}
function disegnaSopra() {
  requestAnimationFrame(disegnaSopra);
  const dpr = devicePixelRatio || 1, W = tela.clientWidth, H = tela.clientHeight, cv = telaSopra; if (!W || !H) return;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const c = cv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
  // (appena posati, il rilievo che arriva in secondo piano può alzare o abbassare il suolo sotto la camera: per tre secondi
  // dopo l'ultima quota chiesta la si rimette lì, così la grandezza a schermo non salta)
  if (mondo3d && mondoPosato && quotaVoluta > 0 && quotaVoluta < 3000 && performance.now() - oraVaiSopra < 3000 && mondo3d.camera.corpo?.punto) { try { const d = mondo3d.dove(); if (isFinite(d.quota) && Math.abs(Math.log(Math.max(d.quota, 1e-4) / quotaVoluta)) > 0.15) vaiSopra({ lon: d.lon, lat: d.lat, quota: quotaVoluta, direzione: d.direzione, alza: d.alza }, { correzione: true }); } catch { /* il mondo a metà */ } }
  const mpp = scalaASchermo(); mppASchermo = mpp; barraDiScala(mpp); if (!(mpp > 0) || (passaggio && passaggio.t0 == null)) { if (!(mpp > 0)) vociSopraOra = []; return; }
  // (ciò che c'è e dove lo si chiede si ricalcola al più ogni 300 ms, o quando la scala è cambiata di più di un terzo; ogni
  // fotogramma si ridisegna soltanto, alla grandezza di adesso)
  const ora = performance.now(), cambiata = !(sopraCalcolo.mpp > 0) || Math.abs(Math.log(mpp / sopraCalcolo.mpp)) > 0.3;
  let voci = vociSopraOra; const m = Math.min(W, H);
  if (ora - sopraCalcolo.t > 300 || cambiata) {
    sopraCalcolo.t = ora; sopraCalcolo.mpp = mpp; let P = null; try { P = camDelPunto(); } catch { P = null; } sopraCalcolo.P = P;
    voci = []; const dentro = (L) => L / mpp > 2 && L / mpp < 60 * Math.max(W, H);
    if (P) try {
      // (nello spazio, guardando giù: le finestre dell'acqua o del suolo di quel punto, una dentro l'altra, che si fondono col 3D
      // secondo la loro grandezza a schermo, come poi nel livello 5: entrando e uscendo non cambia niente)
      if (P.spazio) { const r = rocciaDi(P.cam), F = r && !r.alPosto ? finestreDelPunto(P.cam) : null; if (F?.length && dentro(F[F.length - 1].L)) voci.push({ L: r.larghezzaM, finestre: F, peso: P.verticale, nome: r.nome }); }
      const f0 = finestraDelPunto(P.cam); if (f0 && dentro(f0.latoM) && f0.latoM / mpp > m / 40) { const f = finestraDelPunto(P.cam, { tracce: true }); voci.push({ L: f.latoM, cv: f.cv, liscio: true, peso: P.spazio ? Math.max(0.35, P.verticale) : 1, nome: `le particelle: ${f.che} (una finestra larga ${fmtLunghezza(f.latoM)})`, tracce: true }); }
    } catch (err) { console.warn(err); }
  }
  vociSopraOra = voci;
  const [qx, qy] = [W / 2, H / 2];
  // LO SCHERMO PIENO (grani.js): attorno al punto, la materia continua. Nello spazio, guardando giù da vicino, i grani
  // della roccia di quel punto (quando sono grandi almeno un pixel: prima, il suolo in 3D ne è la media); ovunque, le
  // tracce di tutti gli eventi che quella materia ricorda (o che accadono adesso), quante lo schermo ne può mostrare.
  // Il punto sta al centro dello schermo; la sua finestra e il suo campione ci stanno sopra, senza cornice.
  const Pp = sopraCalcolo.P, kpx = dpr / mpp; let neb = { grani: null, tracce: null };
  if (Pp) try {
    if (Pp.spazio && Pp.verticale > 0) { const g = campoDelPunto(Pp.cam); if (g) { const gpx = g.campo.granoM * kpx; if (gpx >= 0.7 * dpr) neb.grani = g.campo.dipingi(c, { W: cv.width, H: cv.height, ox: qx * dpr - (g.L0 / 2) * kpx, oy: qy * dpr - (g.L0 / 2) * kpx, k: kpx, alfa: Pp.verticale * Math.min(1, Math.log(gpx / (0.7 * dpr)) / Math.log(3)) }); } }
    else if (camMappa?.livello === 5 && camMappa.nebbiaGrani) neb.grani = camMappa.nebbiaGrani;
    // (dentro il campione delle tracce fossili le tracce ci sono già: lì non si aggiungono)
    const pop = popolazioneDelPunto(Pp.cam), rq = !Pp.spazio ? rocciaDi(camMappa) : null, mezza = rq?.passo === 1 ? rq.larghezzaM / 2 : 0;
    // (le tracce si ricalcolano su una tela a parte al più ogni 250 ms, o quando la scala cambia di più del 4%; in mezzo la
    // si posa ingrandita attorno al centro)
    if (pop) {
      const T = tracceSopra, vecchia = !T.cv || T.pop !== pop || T.cv.width !== cv.width || T.cv.height !== cv.height || Math.abs(Math.log(mpp / T.mpp)) > 0.04 || (ora - T.t > 250 && Math.abs(Math.log(mpp / T.mpp)) > 0.002) || T.mezza !== mezza;
      if (vecchia) { if (!T.cv || T.cv.width !== cv.width || T.cv.height !== cv.height) { T.cv = document.createElement('canvas'); T.cv.width = cv.width; T.cv.height = cv.height; } const x = T.cv.getContext('2d'); x.clearRect(0, 0, cv.width, cv.height);
        T.neb = pop.dipingi(x, { W: cv.width, H: cv.height, ox: qx * dpr, oy: qy * dpr, k: kpx, dpr, escludi: mezza ? { x0: -mezza, y0: -mezza, x1: mezza, y1: mezza } : null }); Object.assign(T, { pop, mpp, t: ora, mezza }); }
      const f = T.mpp / mpp; c.globalAlpha = Pp.spazio ? Pp.verticale : 1; c.drawImage(T.cv, qx * dpr * (1 - f), qy * dpr * (1 - f), cv.width * f, cv.height * f); c.globalAlpha = 1; neb.tracce = T.neb;
    }
  } catch (err) { console.warn(err); }
  nebbiaOra = neb;
  for (const v of voci) {
    if (v.finestre) { if (v.peso > 0) disegnaFinestre(c, { W: cv.width, H: cv.height, px: qx * dpr, py: qy * dpr, pxm: dpr / mpp, m: Math.min(cv.width, cv.height), finestre: v.finestre, fondo: false, peso: v.peso }); continue; }
    const sz = v.L / mpp, entra = Math.max(0, Math.min(1, Math.log(sz / (0.02 * m)) / Math.log(5))), esce = v.tracce ? Math.max(0, Math.min(1, Math.log((40 * Math.max(W, H)) / sz) / Math.log(5))) : 1, a = v.peso * Math.min(entra, esce);
    const x = qx - sz / 2, y = qy - sz / 2;
    if (a > 0 && v.cv) { c.globalAlpha = a; c.imageSmoothingEnabled = !!v.liscio; const N = v.cv.width, k = (sz * dpr) / N, x0 = Math.max(0, Math.floor((-x * dpr) / k)), y0 = Math.max(0, Math.floor((-y * dpr) / k)), x1 = Math.min(N, Math.ceil(((W - x) * dpr) / k)), y1 = Math.min(N, Math.ceil(((H - y) * dpr) / k)); if (x1 > x0 && y1 > y0) c.drawImage(v.cv, x0, y0, x1 - x0, y1 - y0, x * dpr + x0 * k, y * dpr + y0 * k, (x1 - x0) * k, (y1 - y0) * k); c.globalAlpha = 1; c.imageSmoothingEnabled = true; }
    // (né cornici né scritte sullo schermo: ciò che è, lo dice la barra)
  }
}
// LA BARRA DI SCALA VERA, sempre visibile, in una riga: un tratto di lunghezza tonda (1, 2, 5 × 10ⁿ metri) e che cosa si guarda
const barraScala = document.getElementById('barraScala');
let barraPrima = '', barraOra = 0, barraMpp = 1;
function cosaSiGuarda() {
  try {
    if (telaQuanti) return 'la scala quantistica';
    if (vistaAtomi) return chiaveAtomi && camMappa ? scenaAtomi(camMappa)?.che || 'gli atomi' : 'gli atomi';
    if (mondo3d && universo3d) return scalaDi(universo3d.bolla().grandezza).nome;
    if (camMappa?.livello === 5) return rocciaDi(camMappa)?.nome || 'la roccia';
    return percorso(camMappa).slice(-1)[0] || '';
  } catch { return ''; }
}
// 10ⁿ metri a parole: coi prefissi fin dove sono d'uso (dal nanometro ai mille chilometri), poi la potenza (la misura degli
// astronomi la dice, accanto, la larghezza dello schermo)
const APICI = '⁰¹²³⁴⁵⁶⁷⁸⁹';
function potenzaDiDieci(n) {
  if (n < -9) return `10⁻${String(-n).split('').map((c) => APICI[+c]).join('')} m`;
  if (n < 7) { const [u, e] = n < -6 ? ['nm', -9] : n < -3 ? ['µm', -6] : n < 0 ? ['mm', -3] : n < 3 ? ['m', 0] : ['km', 3]; return `${(10 ** (n - e)).toLocaleString('it-IT')} ${u}`; }
  return `10${String(n).split('').map((c) => APICI[+c]).join('')} m`;
}
function barraDiScala(mpp) {
  if (!barraScala) return;
  barraScala.style.bottom = telaQuanti ? '36px' : ''; // (sopra la riga dello strumento della scala quantistica)
  if (!(mpp > 0)) { if (barraPrima !== '') { barraScala.innerHTML = ''; barraPrima = ''; } return; }
  const ora = performance.now(); if (ora - barraOra < 200 && Math.abs(Math.log(mpp / barraMpp)) < 0.02) return; barraOra = ora; barraMpp = mpp; // (il testo al più cinque volte al secondo)
  // (in potenze di dieci, come Powers of Ten: il tratto è largo da 16 a 160 pixel)
  const n = Math.floor(Math.log10(160 * mpp)), passo = Math.pow(10, n), px = passo / mpp;
  let sopra = vociSopraOra.find((v) => v.tracce && v.L / mpp > 0.05 * Math.min(tela.clientWidth, tela.clientHeight)), testo = `${potenzaDiDieci(n)} · lo schermo è largo ${fmtLunghezza(mpp * tela.clientWidth)} · ${cosaSiGuarda()}${sopra ? ` · con ${sopra.nome.replace(/^le particelle: /, 'le particelle di questo punto: ')}` : ''}`;
  // la nebbia: quanti grani e quante tracce ci sono davvero nello schermo, e quante se ne vedono
  const nb = nebbiaOra, gr = nb?.grani, tr = nb?.tracce, conta = (x) => (x >= 1e5 ? fmtGrande(x) : Math.round(x).toLocaleString('it-IT'));
  const nebbia = `${gr && gr.vere >= 1 ? ` · ${conta(gr.vere)} grani${gr.disegnati ? '' : ' (più piccoli di un pixel: se ne vede la media)'}` : ''}${tr && tr.vere >= 0.01 ? ` · tracce: ${tr.vere >= 1 ? conta(tr.vere) : tr.vere.toPrecision(1)} vere qui, ${tr.disegnate} disegnate` : ''}`;
  testo += nebbia;
  const k = `${px.toFixed(1)}|${testo}`; if (k === barraPrima) return; barraPrima = k;
  barraScala.innerHTML = `<i style="width:${px.toFixed(1)}px"></i><span></span>`; barraScala.querySelector('span').textContent = testo;
}
requestAnimationFrame(disegnaSopra);
window.__camera = {
  mpp: () => scalaASchermo(), roccia: (c) => rocciaDi(c), get passaggio() { return !!passaggio && passaggio.t0 == null; }, cosa: () => cosaSiGuarda(), get sopra() { return vociSopraOra.map((v) => ({ L: v.L, nome: v.nome, tracce: !!v.tracce })); }, get vistaAtomi() { return vistaAtomi; }, // (passaggio: in attesa della vista nuova; a vista pronta la dissolvenza è un quadro fermo per ogni scala)
  get camMappa() { return camMappa; }, get mondo3d() { return mondo3d; }, get universo3d() { return universo3d; }, get bolla() { return universo3d ? scriviBolla(universo3d.bolla()) : null; }, vaiAllaBolla(testo) { const b = leggiBolla(testo); if (b && universo3d) universo3d.vaiAllaBolla(b); return !!b; }, vaiA: (meta) => !!universo3d?.vaiA(meta), volaAlLivello,
  aggiorna: () => aggiornaVista(), // (dopo aver cambiato camMappa da fuori: il visore torna così nello spazio)
};
