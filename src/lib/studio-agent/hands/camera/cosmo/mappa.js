// mappa.js — lo zoom continuo, dal cosmo alle particelle.
//
// Quattro livelli, uno dentro l'altro; si passa dall'uno all'altro zoomando:
//   0 il cosmo (il toro: lo spazio si richiude) con la rete e le galassie
//   1 una galassia: le stelle, il buco nero col suo getto, i resti di supernova
//   2 un sistema: la stella e i pianeti
//   3 un pianeta: il suo anello, la magnetosfera, le regioni (gli universi della camera)
// Dentro una regione si entra nella camera (l'universo, la finestra, il pattern).
// Ogni livello ha le sue coordinate; la camera della mappa è { livello, via, cx, cy, z }
// (via = l'indirizzo dei livelli sopra), e passare di livello non muove niente sullo schermo.
// LE SCALE SONO VERE dal cosmo al pianeta: una galassia nel cosmo (10⁻⁵ del toro), un sistema nella galassia (30 UA:
// 10⁻⁸ della galassia), un pianeta nel sistema sono grandi quanto sono, cioè puntini (con una taglia minima in pixel, per
// poterli trovare) finché non ci si avvicina moltissimo. Per arrivarci: zoomando in avanti lo sguardo scivola verso la
// cosa più vicina al punto che si guarda; un clic ci vola. Le coordinate si ribasano a ogni livello (cx, cy relativi al
// figlio): i numeri a sedici cifre bastano (un sistema a 10⁻⁸ della galassia ne ha ancora otto buone).

import { cosmo, galassia, sistema, pianeta, regione, magnetosfera, fascia, metriPerUnita, raggioSistema, LATO_REGIONE, numeroDi, cosmoBase, ramiCosmo, semeEvento } from './cosmo.js';
import { fmtLunghezza } from './unita.js';
import { nebbiaPianeta, ACCELERA, fmtGrande } from './nebbia.js';
import { sorgente } from './eventi.js';
import { serie } from './eredita.js';
import { bellezzaImmagine } from './sezione.js';
import { pesoDiscreto } from './eredita.js';
import { cristallizza, cristallizzaChiusa, fioccoDiNeve, sedimento, immagine as immagineRoccia, GRANITO, BASALTO } from './rocce.js';
import { superficiePianeta, immagineSuperficie, climaSuperficie, erosione, tessera, climaConIlMare } from './geologia.js';
import { mare as mareDi, campioneAcqua, immagineAcqua, coloraMare, coloreMare, aspettoMare, luogo as luogoMare, scenaMolecolare } from './mare.js';
import { conMoto, scenaDaElenco, periodica } from './atomi3d.js';
import { finestraAcqua, immagineFinestra, scenaNano } from './finestra.js';
import { chimicaDellaFinestra, luogoDellaCrosta, sistema as sistemaChimico, storia as storiaChimica, rileva } from './reazioni.js';
import { finestraSuolo, immagineSuolo, scenaSuolo, tesseraNota, granoNelPunto } from './suolo.js';
import { luogoDaRoccia, luogoDaAcqua, luogoDaAria, cieloRelativo, memoriaDelLuogo, aloni, tracceFossili, atomi as atomiDelReticolo, tesseraReticolo, immagineAtomi, incanalamento, cellaMateria, sorgentiNaturali, concentrazioni, RETICOLI, fmtTempo } from './materia.js';
import { simulaMondo } from './mondo.js';
import { campoGrani, granoGhiaccio, popolazioneTracce } from './grani.js';

const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const minimo = (W, H) => Math.min(W, H);

// ---------- il genitore e i figli di ogni livello
function figli(cam) {
  const v = cam.via;
  if (cam.livello === 0) return cosmo(v.cosmo).galassie.map((G) => ({ pos: G.pos, scala: G.r, raggio: 1.05, via: { ...v, galassia: G.id }, dato: G }));
  if (cam.livello === 1) { const rs = raggioSistema(v.cosmo, v.galassia); return galassia(v.cosmo, v.galassia).stelle.map((S) => ({ pos: S.pos, scala: rs, raggio: 1.2, via: { ...v, stella: S.id }, dato: S })); } // (un sistema, 30 UA, nelle unità vere della galassia: ~10⁻⁸)
  if (cam.livello === 2) return sistema(v.cosmo, v.galassia, v.stella).pianeti.map((P) => ({ pos: P.pos, scala: P.r, raggio: Math.max(2.8, 1.1 * estensioneLune(P)), via: { ...v, pianeta: P.id }, dato: P }));
  return [];
}
// la grandezza a schermo (in lati corti) a cui un livello prende il posto del genitore, e a cui glielo rende
const sogliaLivello = (livello) => (livello === 3 ? 0.42 : 0.4);
// dove sta il livello dentro il genitore (posizione e scala)
function nelGenitore(cam) {
  const v = cam.via;
  if (cam.livello === 1) { const G = cosmo(v.cosmo).galassie[v.galassia]; return { pos: G.pos, scala: G.r }; }
  if (cam.livello === 2) { const S = galassia(v.cosmo, v.galassia).stelle[v.stella]; return { pos: S.pos, scala: raggioSistema(v.cosmo, v.galassia) }; }
  if (cam.livello === 3) { const P = sistema(v.cosmo, v.galassia, v.stella).pianeti[v.pianeta]; return { pos: P.pos, scala: P.r }; }
  return null;
}

// la camera che guarda una regione (per uscire dalla camera verso la mappa)
export function camSuRegione(a, W, H) {
  const R = pianeta(a.cosmo, a.galassia, a.stella, a.pianeta).regioni[a.regione];
  return { livello: 3, via: { cosmo: a.cosmo, galassia: a.galassia, stella: a.stella, pianeta: a.pianeta }, cx: R.pos[0] * 0.45, cy: R.pos[1] * 0.45, z: minimo(W, H) / 6.2, regione: a.regione };
}

// ---------- lo zoom: k > 1 avvicina, intorno al punto (fx, fy) dello schermo.
// Restituisce { entra: indirizzo } quando si entra in una regione.
export function zoomMappa(cam, fx, fy, k, W, H) {
  // (la direzione del moto: le finestre dei livelli dopo, in quella direzione, si preparano in anticipo — preparaAvanti)
  cam.verso = k > 1 ? 1 : k < 1 ? -1 : 0; const esito = zoomMappaQui(cam, fx, fy, k, W, H); if (cam.livello === 5) preparaAvanti(cam); return esito;
}
function zoomMappaQui(cam, fx, fy, k, W, H) {
  const ax = cam.cx + (fx - W / 2) / cam.z, ay = cam.cy + (fy - H / 2) / cam.z, cx0 = cam.cx, cy0 = cam.cy;
  cam.z *= k; cam.cx = ax - (fx - W / 2) / cam.z; cam.cy = ay - (fy - H / 2) / cam.z;
  const m = minimo(W, H), sulPunto = () => { cam.cx = 0.5 + (cx0 - 0.5) / k; cam.cy = 0.5 + (cy0 - 0.5) / k; };
  // LA ROCCIA (livello 5): in fondo alla superficie, avvicinandosi ancora, si guarda di che cosa è fatto quel punto
  if (cam.livello === 4 && cam.z > Z4_ROCCIA) { cam.roccia = { cx: cam.cx, cy: cam.cy }; cam.livello = 5; cam.cx = 0.5; cam.cy = 0.5; cam.z = (cam.z / Z4_ROCCIA) * Z5_ROCCIA * m; cam.passoRoccia = 0; cam.eventoAcqua = false; cam.latoSuolo = undefined; cam.dalSuolo = undefined; cam.ancoraSuolo = undefined; return null; }
  if (cam.livello === 5) {
    // (sotto il metro tutto è centrato nel punto: le finestre dell'acqua e del suolo, la roccia e i suoi livelli uno dentro
    // l'altro. La rotella ingrandisce attorno al punto, che resta dove sta sullo schermo: così la vista è una funzione del
    // punto e dello zoom, e andata e ritorno passano per gli stessi quadri qualunque sia la strada)
    sulPunto();
    // SUL SUOLO (suolo.js, PROGETTO.md lavoro 9): prima della roccia, le finestre del suolo di quel punto, di dieci in dieci
    // (LATI_SUOLO), come per l'acqua; sotto l'ultima, la roccia del punto alla sua grandezza vera. «latoSuolo» non detto è la
    // prima finestra; null è la roccia
    if (cam.latoSuolo !== null && !cam.suAcqua) {
      const r = rocciaDi(cam);
      if (r?.suolo) {
        const L = r.larghezzaM, i = LATI_SUOLO.findIndex((x) => Math.abs(x / L - 1) < 1e-9);
        // SOTTO L'ULTIMA (10 µm): non si torna alla roccia grande, si continua nella stessa scala sola della roccia (vedi sotto),
        // dal primo suo livello più piccolo della finestra (la lamina, il reticolo, gli atomi del granello che sta nel punto
        // guardato: granoNelPunto), fino alla scena dei nanometri in 3D (la superficie del minerale con l'acqua dei pori)
        if (i === LATI_SUOLO.length - 1) {
          sulPunto();
          const c = sottoIlSuolo(cam)[0], Lc = c != null ? latoPasso(cam, c) : null;
          if (Lc) { const zc = (cam.z * Lc) / L;
            // (il livello sotto sta nel punto, al centro delle finestre: lì si scende, e lì si risale; il granello è quello del punto)
            if (!cam.ancoraSuolo) { cam.ancoraSuolo = [0.5, 0.5]; const g = granoNelPunto(r.fin, r.fin.x0 + 0.5 * r.fin.L, r.fin.y0 + 0.5 * r.fin.L); cam.mineraleRoccia = g && RETICOLI[g] ? g : null; }
            if (zc >= m) { const b = cam.ancoraSuolo; cam.cx = 0.5 + ((cam.cx - b[0]) * L) / Lc; cam.cy = 0.5 + ((cam.cy - b[1]) * L) / Lc; cam.z = zc; cam.latoSuolo = null; cam.passoRoccia = c; cam.dalSuolo = c; cam.ancore = {}; return null; }
            if (cam.z < 0.8 * m) { cam.latoSuolo = LATI_SUOLO[i - 1]; sulPunto(); dentroDieci(cam, 0.1); cam.ancoraSuolo = undefined; return null; }
            return null; }
        }
        sulPunto();
        if (cam.z > 9 * m) { if (i + 1 < LATI_SUOLO.length) { cam.latoSuolo = LATI_SUOLO[i + 1]; dentroDieci(cam, 10); return null; }
          const b = rocciaDi({ ...cam, latoSuolo: null, passoRoccia: 0 }); cam.latoSuolo = null; cam.passoRoccia = 0; cam.ancore = {}; ribasa(cam, Math.max(0.5 * m, (cam.z * (b?.larghezzaM || L)) / L)); return null; }
        if (cam.z < 0.8 * m && i > 0) { cam.latoSuolo = LATI_SUOLO[i - 1]; dentroDieci(cam, 0.1); return null; }
        if (cam.z < Z5_ROCCIA * m) { cam.livello = 4; cam.cx = cam.roccia.cx; cam.cy = cam.roccia.cy; cam.z = (cam.z / (Z5_ROCCIA * m)) * Z4_ROCCIA; cam.passoRoccia = 0; cam.latoSuolo = undefined; cam.dalSuolo = undefined; cam.ancoraSuolo = undefined; cam.ancore = {}; cam.mineraleRoccia = null; return null; }
        cam.z = Math.min(cam.z, 12 * m); return null;
      }
      if (!cam.suAcqua) cam.latoSuolo = null; // (niente suolo lì: la roccia)
    }
    // DENTRO LA ROCCIA si continua a scendere (materia.js) in UNA SCALA SOLA: ogni livello è grande quanto è (latoPasso), e
    // sta dentro quello di sopra nel punto che si guarda (cam.ancore[passo]: il centro del livello sotto, nelle coordinate di
    // questo). Passare all'uno o all'altro non cambia la grandezza a schermo: cambia solo in quali coordinate si conta.
    // 0 la roccia → 1 un suo cristallo con ciò che ha registrato (aloni o tracce di fissione; il passo manca dove niente
    // tiene memoria) → 2 la lamina che disegna la stella d'incanalamento (spessa qualche decimo di micron) → 4 il reticolo,
    // trenta nanometri → 3 tre nanometri dei suoi atomi (in tre dimensioni, se la scheda grafica c'è: laboratorio.js)
    if (!cam.suAcqua) {
      const seq = sequenzaRoccia(cam), i = Math.max(0, seq.indexOf(cam.passoRoccia ?? 0)), p = (cam.passoRoccia = seq[i]), L = latoPasso(cam, p); cam.ancore ??= {};
      if (i + 1 < seq.length && L) {
        const c = seq[i + 1], Lc = latoPasso(cam, c), zc = (cam.z * Lc) / L;
        // il livello sotto sta nel punto, al centro di questo (il cristallo di quel punto, la sua lamina, il suo reticolo:
        // per indirizzo). Prima seguiva il cursore finché era un puntino e poi restava dov'era: la strada decideva il quadro
        if (!cam.ancore[p]) { cam.ancore[p] = [0.5, 0.5]; if (p === 0) { cam.puntoRoccia = [0.5, 0.5]; cam.mineraleRoccia = rocciaDi({ ...cam, passoRoccia: 0 })?.mineraleIn?.(0.5, 0.5) ?? null; } }
        if (Lc && zc >= m) { const b = cam.ancore[p]; cam.cx = 0.5 + ((cam.cx - b[0]) * L) / Lc; cam.cy = 0.5 + ((cam.cy - b[1]) * L) / Lc; cam.z = zc; cam.passoRoccia = c; return null; }
      }
      // (entrati dal suolo: sopra il primo livello c'è la finestra del suolo di 10 µm, non la roccia grande)
      if (cam.dalSuolo === p && cam.z < 0.5 * m) { const Ls = LATI_SUOLO[LATI_SUOLO.length - 1], a = cam.ancoraSuolo || [0.5, 0.5]; cam.cx = a[0] + ((cam.cx - 0.5) * L) / Ls; cam.cy = a[1] + ((cam.cy - 0.5) * L) / Ls; cam.z = (cam.z * Ls) / L; cam.latoSuolo = Ls; cam.passoRoccia = 0; cam.dalSuolo = undefined; cam.ancore = {}; return null; }
      if (i > 0 && cam.z < 0.5 * m) { const q = seq[i - 1], Lq = latoPasso(cam, q), a = cam.ancore[q] || [0.5, 0.5]; cam.cx = a[0] + ((cam.cx - 0.5) * L) / Lq; cam.cy = a[1] + ((cam.cy - 0.5) * L) / Lq; cam.z = (cam.z * Lq) / L; cam.passoRoccia = q; return null; }
      if (i === 0 && cam.z < 0.45 * m && rocciaDi({ ...cam, latoSuolo: LATI_SUOLO[LATI_SUOLO.length - 1], passoRoccia: 0 })?.suolo) { const Ls = [...LATI_SUOLO].reverse().find((x) => x >= L) ?? LATI_SUOLO[0]; ribasa(cam, (cam.z * Ls) / L); cam.latoSuolo = Ls; cam.passoRoccia = 0; return null; }
      if (i === 0 && cam.z < Z5_ROCCIA * m && !rocciaDi({ ...cam, latoSuolo: LATI_SUOLO[LATI_SUOLO.length - 1], passoRoccia: 0 })?.suolo) { cam.livello = 4; cam.latoSuolo = undefined; cam.dalSuolo = undefined; cam.ancoraSuolo = undefined; cam.cx = cam.roccia.cx; cam.cy = cam.roccia.cy; cam.z = (cam.z / (Z5_ROCCIA * m)) * Z4_ROCCIA; cam.passoRoccia = 0; cam.ancore = {}; cam.mineraleRoccia = null; return null; }
      if (i === seq.length - 1) cam.z = Math.min(cam.z, 12 * m); // (in fondo: gli atomi; sotto, in tre dimensioni, la scala quantistica)
      return null;
    }
    // dentro l'acqua si continua a scendere: ogni volta che il campione riempie dieci schermi se ne guarda uno dieci volte più
    // piccolo, alla stessa grandezza a schermo (z diviso dieci). L'evento vero di quell'acqua non sta in fondo: sta alla sua
    // scala (millimetri), sovrapposto al campione quando lo si attraversa (finestraDelPunto, laboratorio.js)
    cam.eventoAcqua = false; sulPunto();
    if (cam.z > 9 * m && (cam.latoAcqua ?? 1) > 2e-9) { cam.latoAcqua = dieci((cam.latoAcqua ?? 1) / 10); dentroDieci(cam, 10); return null; }
    if (cam.z < 0.8 * m && (cam.latoAcqua ?? 1) < 0.5) { cam.latoAcqua = dieci(cam.latoAcqua * 10); dentroDieci(cam, 0.1); return null; }
    if (cam.z < Z5_ROCCIA * m) { cam.livello = 4; cam.cx = cam.roccia.cx; cam.cy = cam.roccia.cy; cam.z = (cam.z / (Z5_ROCCIA * m)) * Z4_ROCCIA; cam.latoAcqua = undefined; cam.passoRoccia = 0; cam.eventoAcqua = false; cam.mineraleRoccia = null; return null; }
    cam.z = Math.min(cam.z, 12 * m); return null;
  }
  return passaggi(cam, W, H, k > 1, { fx, fy, k });
}
// (le finestre dell'acqua e del suolo stanno tutte centrate nel punto: passando a quella dieci volte più piccola, o più grande,
// lo schermo resta com'è — le coordinate si contano nella finestra nuova. LA VISTA È UNA FUNZIONE DI PUNTO E ZOOM: nelle
// finestre la rotella ingrandisce attorno al punto (sulPunto), che resta dov'è sullo schermo (dove lo si è portato
// trascinando). Prima andava verso il cursore e il punto veniva trattenuto entro un terzo dello schermo (tieniIlPunto): un
// taglio che non si disfa, e al ritorno la stessa scala mostrava un altro pezzo. Ora andata e ritorno passano per gli stessi
// quadri. ribasa: cambiare il lato contato tenendo fermo il punto sullo schermo (prima si rimetteva il punto al centro).)
const dieci = (x) => 10 ** Math.round(Math.log10(x));
function dentroDieci(cam, f) { cam.cx = 0.5 + (cam.cx - 0.5) * f; cam.cy = 0.5 + (cam.cy - 0.5) * f; cam.z /= f; }
function ribasa(cam, z1) { cam.cx = 0.5 + ((cam.cx - 0.5) * cam.z) / z1; cam.cy = 0.5 + ((cam.cy - 0.5) * cam.z) / z1; cam.z = z1; }
// IL PASSAGGIO TRA LA CARTA DEL PIANETA (livello 4) E LA ROCCIA DEL PUNTO (livello 5): una soglia sola nei due versi (prima si
// entrava a 6·10⁶ verso 0,8 schermi e si usciva a 0,45 schermi verso 5,5·10⁶: andata e ritorno non si incontravano), e lo
// zoom che passa è proporzionale: z₅/(Z5·m) = z₄/Z4. (A MANO, dichiarato: la carta non va oltre Z4, la roccia si vede all'80%.)
export const Z4_ROCCIA = 6e6, Z5_ROCCIA = 0.8;
// le finestre attorno a quella di adesso, centrate nello stesso punto: la dieci volte più grande, lei, la dieci volte più
// piccola (disegnaFinestre). → [{ L, r }] o null (dove non c'è una catena di finestre: la roccia)
export function finestreDelPunto(cam) {
  const r0 = rocciaDi(cam); if (!r0) return null;
  // (le finestre si calcolano solo quando si disegnano davvero: r è pigra)
  const pigra = (L, fai) => { let r; return { L, get r() { if (r === undefined) r = fai() || null; return r; } }; };
  if (cam.suAcqua) { const l = dieci(cam.latoAcqua ?? 1); return [l * 10, l, l / 10].map(dieci).filter((L) => L >= 1e-9).map((L) => pigra(L, () => (L === l ? r0 : rocciaDi({ ...cam, latoAcqua: L, secondaria: true })))); }
  if (r0.suolo) { const l = r0.larghezzaM; return [l * 10, l, l / 10].map(dieci).filter((L) => L >= LATI_SUOLO[LATI_SUOLO.length - 1] * 0.999).map((L) => pigra(L, () => { const r = Math.abs(L / l - 1) < 1e-9 ? r0 : rocciaDi({ ...cam, latoSuolo: L, secondaria: true }); return r?.suolo ? r : null; })); }
  return null;
}
// LE LUNE: fin dove arrivano (in raggi del pianeta), e dove sta ognuna adesso lungo la sua orbita
// (per il passaggio di livello si conta fino a 70 raggi: le lune lontanissime, catturate, restano fuori dallo schermo)
const estensioneLune = (P) => Math.min(70, (P?.lune || []).reduce((m, L) => Math.max(m, (L.aM * (1 + (L.eccentricita || 0))) / P.raggioM), 0));
function posLuna(v, P, L, t) {
  const a = L.aM / P.raggioM, e = L.eccentricita || 0, f0 = (semeEvento('fase luna', v.cosmo, v.galassia, v.stella, v.pianeta, L.id) / 4294967296) * 2 * Math.PI;
  const f = f0 + ((L.retrograda ? -1 : 1) * 2 * Math.PI * t) / L.periodo, r = (a * (1 - e * e)) / (1 + e * Math.cos(f));
  return [r * Math.cos(f), r * Math.sin(f), a, e];
}
const tempoMappa = () => ((typeof performance !== 'undefined' ? performance.now() : 0) / 1000) * ACCELERA;
function descriviLuna(P, L) {
  const nata = { disco: 'nata dal disco attorno al pianeta', urto: 'nata da un grande urto', cattura: 'un corpo catturato' }[L.origine] || L.origine;
  const giorni = L.periodo / 86400, lun = L.massaKg / 7.35e22;
  return `luna ${L.id + 1}: ${nata}${L.retrograda ? ', gira al contrario' : ''} · raggio ${Math.round(L.raggioM / 1000)} km${L.forma && !L.forma.rotonda ? ' (irregolare)' : ''}, ${lun >= 0.01 ? `${lun.toPrecision(2)} Lune` : `${L.massaKg.toExponential(1)} kg`} · a ${Math.round(L.aM / 1000).toLocaleString('it')} km, un giro in ${giorni < 3 ? `${(giorni * 24).toFixed(1)} ore` : `${giorni.toFixed(1)} giorni`}${L.bloccata ? ' · mostra sempre la stessa faccia' : ''} · ${L.stato}${L.risonanza ? ` · in risonanza ${L.risonanza}` : ''}`;
}
function passaggi(cam, W, H, dentro = false, fuoco = null) {
  const m = minimo(W, H);
  for (let giro = 0; giro < 4; giro++) {
    // LA SUPERFICIE (livello 4): la mappa del pianeta, x = longitudine (0..1, si richiude), y = latitudine (0..0,5)
    if (cam.livello === 4) {
      cam.cx = ((cam.cx % 1) + 1) % 1; cam.cy = Math.max(0, Math.min(0.5, cam.cy)); cam.z = Math.min(cam.z, 6e6);
      // (si torna al disco alla stessa soglia a cui ci si è scesi, 0,8 schermi, e nel punto che si guardava: la proiezione
      // inversa di quella della discesa qui sotto; prima si usciva a 0,9/2π ≈ 0,14 schermi al centro del disco)
      if (cam.z < 0.8 * 2 * Math.PI * m) { const P = sistema(cam.via.cosmo, cam.via.galassia, cam.via.stella).pianeti[cam.via.pianeta], lon = cam.cx * 2 * Math.PI - Math.PI, lat = Math.PI / 2 - cam.cy * 2 * Math.PI;
        cam.livello = 3; cam.cx = Math.cos(lat) * Math.sin(lon); cam.cy = -Math.sin(lat) * (1 - (P.schiacciamento || 0)); cam.z /= 2 * Math.PI; continue; }
      break;
    }
    if (cam.livello === 3 && cam.z > 0.8 * m && Math.hypot(cam.cx, cam.cy) < 0.95) {
      const P = sistema(cam.via.cosmo, cam.via.galassia, cam.via.stella).pianeti[cam.via.pianeta];
      if (P.tipo !== 'gassoso' && P.interno) { // sopra il disco di un pianeta solido: si scende sulla superficie, nel punto che si guardava
        const u = cam.cx, w = cam.cy / (1 - (P.schiacciamento || 0)), zz = Math.sqrt(Math.max(0, 1 - u * u - w * w)), lat = Math.asin(Math.max(-1, Math.min(1, -w))), lon = Math.atan2(u, zz);
        cam.livello = 4; cam.cx = (lon + Math.PI) / (2 * Math.PI); cam.cy = ((Math.PI / 2 - lat) / Math.PI) * 0.5; cam.z *= 2 * Math.PI; continue;
      }
    }
    if (cam.livello === 0) { cam.cx = ((cam.cx % 1) + 1) % 1; cam.cy = ((cam.cy % 1) + 1) % 1; cam.z = Math.max(cam.z, m / 1.25); }
    // dentro: un figlio che riempie lo schermo e contiene il centro
    if (cam.livello < 3) {
      const soglia = sogliaLivello(cam.livello + 1) * m;
      let scelto = null, dmin = Infinity;
      for (const f of figli(cam)) {
        if (f.scala * cam.z * f.raggio < soglia) continue;
        let dx = cam.cx - f.pos[0], dy = cam.cy - f.pos[1];
        if (cam.livello === 0) { dx -= Math.round(dx); dy -= Math.round(dy); }
        const d = Math.hypot(dx, dy) / f.scala; if (d < f.raggio * 1.1 && d < dmin) { dmin = d; scelto = { f, dx, dy }; }
      }
      if (scelto) { const { f, dx, dy } = scelto; cam.livello++; cam.via = f.via; cam.cx = dx / f.scala; cam.cy = dy / f.scala; cam.z *= f.scala; continue; }
      // nel vuoto tra le cose non si scende oltre; avvicinandosi, lo sguardo scivola
      // verso la cosa più vicina al centro, così zoomare porta sempre da qualche parte
      // (a ogni livello i figli hanno la taglia VERA: una galassia nel cosmo, un sistema nella galassia, un pianeta nel sistema
      // sono puntini, e per arrivarci serve avvicinarsi moltissimo; il tetto è lo zoom a cui il figlio più vicino riempirebbe lo schermo)
      // Il punto attorno a cui si zooma (il cursore) resta fermo: il figlio più vicino a QUEL punto gli scivola incontro, tanto
      // più in fretta quanto più forte è il colpo di rotella (se no lo zoom lo porterebbe via più in fretta di quanto arriva)
      const ax = fuoco ? cam.cx + (fuoco.fx - W / 2) / cam.z : cam.cx, ay = fuoco ? cam.cy + (fuoco.fy - H / 2) / cam.z : cam.cy;
      const vicino = (() => { let b = null, d = Infinity; for (const f of figli(cam)) { let dx = f.pos[0] - ax, dy = f.pos[1] - ay; if (cam.livello === 0) { dx -= Math.round(dx); dy -= Math.round(dy); } const e = Math.hypot(dx, dy); if (e < d) { d = e; b = { f, dx, dy }; } } return b; })();
      // (un puntino: avvicinandosi, lo sguardo va verso quello che è già vicino al punto che si guarda)
      if (vicino) { const f = vicino.f, perTaglia = Math.min(1, (f.scala * cam.z * f.raggio) / soglia);
        const prossimita = dentro ? Math.max(perTaglia, 1 - (Math.hypot(vicino.dx, vicino.dy) * cam.z) / (0.3 * m)) : perTaglia; if (prossimita > 0.3) { const k = prossimita * Math.max(0.25, dentro && fuoco ? 1 - 0.8 / fuoco.k : 0); cam.cx += vicino.dx * k; cam.cy += vicino.dy * k; } }
      const tetto = cam.livello === 2 ? m / 5e-7 : vicino ? m / (vicino.f.scala * 0.8) : Infinity;
      cam.z = Math.min(cam.z, tetto);
    } else {
      // una regione grande quanto lo schermo, al centro: si entra
      const P = pianeta(cam.via.cosmo, cam.via.galassia, cam.via.stella, cam.via.pianeta);
      // VERSO LA SUPERFICIE (laboratorio.js, la rotella che ha raggiunto una regione): le regioni non fermano più lo zoom; lo
      // sguardo scivola verso il pianeta con la stessa legge dei figli degli altri livelli, e quando il centro è sul disco si
      // scende sulla superficie (il ramo del livello 3 qui sopra). Le regioni restano un posto da cliccare.
      if (cam.versoSuolo && Math.hypot(cam.cx, cam.cy) >= 0.95) { const k = Math.max(0.25, dentro && fuoco ? 1 - 0.8 / fuoco.k : 0); cam.cx -= cam.cx * k; cam.cy -= cam.cy * k; }
      else if (!cam.versoSuolo && LATO_REGIONE * cam.z > 0.35 * m) { // vicino alle regioni: lo sguardo scivola verso la più vicina
        let b = null, d = Infinity; for (const R of P.regioni) { const e = Math.hypot(R.pos[0] - cam.cx, R.pos[1] - cam.cy); if (e < d) { d = e; b = R; } }
        if (b) { const k = 0.25 * Math.min(1, (LATO_REGIONE * cam.z) / (0.9 * m)); cam.cx += (b.pos[0] - cam.cx) * k; cam.cy += (b.pos[1] - cam.cy) * k; }
      }
      if (!cam.versoSuolo) for (const R of P.regioni) {
        if (LATO_REGIONE * cam.z < 0.9 * m) break;
        if (Math.abs(cam.cx - R.pos[0]) < LATO_REGIONE / 2 && Math.abs(cam.cy - R.pos[1]) < LATO_REGIONE / 2) return { entra: { ...cam.via, regione: R.id } };
      }
      cam.z = Math.min(cam.z, (1.1 * m) / LATO_REGIONE);
    }
    // fuori: il livello è diventato piccolo sullo schermo
    const g = nelGenitore(cam);
    // (si esce alla stessa grandezza a schermo a cui si entra: il raggio del figlio in figli() contro sogliaLivello. Prima si
    // usciva a 0,3 schermi con un raggio più largo, ed entrare e uscire avvenivano a scale diverse: andata e ritorno non si
    // incontravano. Il livello del pianeta arriva fin dove arrivano le sue lune: è già nel suo raggio.)
    const largo = cam.livello === 3 ? Math.max(2.8, 1.1 * estensioneLune(sistema(cam.via.cosmo, cam.via.galassia, cam.via.stella).pianeti[cam.via.pianeta])) : cam.livello === 2 ? 1.2 : 1.05;
    if (g && cam.z * largo < sogliaLivello(cam.livello) * m) {
      cam.cx = g.pos[0] + cam.cx * g.scala; cam.cy = g.pos[1] + cam.cy * g.scala; cam.z /= g.scala; cam.livello--;
      const v = { ...cam.via }; delete v[['galassia', 'stella', 'pianeta'][cam.livello]]; cam.via = v;
      continue;
    }
    break;
  }
  return null;
}

// ---------- che cosa c'è sotto il cursore
export function colpisciMappa(cam, sx, sy, W, H) {
  const x = cam.cx + (sx - W / 2) / cam.z, y = cam.cy + (sy - H / 2) / cam.z, px = 9 / cam.z;
  if (cam.livello === 5) { // in fondo allo zoom: un clic entra nella finestra di quel punto (le particelle dentro quella materia)
    const mt = materiaDelPunto(cam); return mt ? { tipo: 'materia', pos: [x, y], scala: 0, testo: `clic: entra nella finestra — ${mt.che}`, materia: mt } : null;
  }
  if (cam.livello === 4) { // sulla superficie: la quota e la temperatura del punto
    const S = superficieDi(cam.via); if (!S) return null;
    const L = livelloTessere(cam.z), n = 4 ** L, u = ((x % 1) + 1) % 1, v = Math.max(0, Math.min(0.9999, y * 2));
    const t = tessereFatte.get(`${S.k}|${L}|${Math.floor(u * n)}|${Math.floor(v * n)}`); if (!t) return null;
    const i = Math.floor((u * n - Math.floor(u * n)) * t.sf.W), j = Math.floor((v * n - Math.floor(v * n)) * t.sf.H), c = j * t.sf.W + i, h = t.sf.alt[c];
    const T = S.cl.media[Math.min(S.cl.H - 1, Math.floor(v * S.cl.H)) * S.cl.W + Math.min(S.cl.W - 1, Math.floor(u * S.cl.W))];
    let acquaQuiTesto = '';
    if (S.mare?.esiste && (h < S.se.mare || t.sf.lago[c] > 0)) { const M = S.mare, km = Math.max(0, Math.min(M.H - 1, Math.floor(v * M.H))) * M.W + Math.min(M.W - 1, Math.floor(u * M.W)), cu = M.corrente.u[km], cv2 = M.corrente.v[km], vel = Math.hypot(cu, cv2), verso = ['est', 'nord-est', 'nord', 'nord-ovest', 'ovest', 'sud-ovest', 'sud', 'sud-est'][((Math.round(Math.atan2(cv2, cu) / (Math.PI / 4)) % 8) + 8) % 8];
      acquaQuiTesto = ` · acqua a ${(M.temperatura[km] - 273.15).toFixed(1)} °C, ${M.salinita[km].toFixed(1)} g di sali per kg, corrente ${vel < 0.005 ? 'quasi ferma' : `${(vel * 100).toFixed(vel < 0.1 ? 1 : 0)} cm/s verso ${verso}`}, fango sospeso ${(M.torbidita[km] * 1000).toPrecision(2)} g/m³${M.ghiaccio && M.ghiaccio[km] > 0.3 ? ', sotto il ghiaccio' : ''}${Math.abs(M.risalita[km]) * 3.156e7 > 20 ? (M.risalita[km] > 0 ? ", acqua che sale dal fondo" : ", acqua che scende") : ''}`; }
    // L'ARIA SOPRA QUEL PUNTO: quando lo schermo è largo poche centinaia di chilometri (la taglia di uno sciame) un clic apre la
    // finestra su uno sciame di raggi cosmici in quell'aria, se ce n'è abbastanza perché nasca (30 g/cm²)
    let aria = null; const gP = S.P.clima?.g ?? 9.81, colonna = isFinite(S.P.clima?.pressione) ? S.P.clima.pressione / gP / 10 : 0;
    if ((W / cam.z) * metriPerUnita(4, cam.via) < 4e5 && colonna > 30) aria = { luogo: luogoDaAria({ S, lat: 90 - v * 180, lon: u * 360 - 180, quotaM: Math.max(0, h - Math.max(S.se.mare, -1e9)), suMare: h < S.se.mare, raggi: cieloDi(cam.via) }), opzioni: { processo: 'sciame' }, che: "lo sciame di un raggio cosmico nell'aria qui sopra" };
    return { tipo: 'punto', pos: [x, y], scala: 0, materia: aria, testo: `${h < S.se.mare ? `mare, profondo ${Math.round(S.se.mare - h)} m` : t.sf.lago[c] > 0 ? `lago, profondo ${Math.round(t.sf.lago[c])} m` : `${Math.round(h - Math.max(S.se.mare, -1e9))} m sul mare`} · ${Math.round(T - 273.15)} °C in media · lat ${(90 - v * 180).toFixed(2)}°${acquaQuiTesto}${aria ? ' · clic: lo sciame di un raggio cosmico nell\'aria qui sopra' : ''}` };
  }
  if (cam.livello === 3) {
    const P = pianeta(cam.via.cosmo, cam.via.galassia, cam.via.stella, cam.via.pianeta);
    for (const R of P.regioni) if (Math.abs(x - R.pos[0]) < LATO_REGIONE / 2 && Math.abs(y - R.pos[1]) < LATO_REGIONE / 2) { const a = { ...cam.via, regione: R.id }; return { tipo: 'regione', pos: R.pos, scala: LATO_REGIONE / 2, testo: `regione ${R.id + 1}${R.nellAnello ? ", nell'anello" : ''} · universo n. ${numeroDi(a)} · clic per entrare`, via: a }; }
    if (Math.hypot(x, y) < 1) return { tipo: 'pianeta', pos: [0, 0], scala: 1, testo: descriviPianeta(P.P) };
    { const t = tempoMappa(); for (const L of P.P.lune || []) { const q = posLuna(cam.via, P.P, L, t), rr = Math.max(px, L.raggioM / P.P.raggioM); if (Math.hypot(x - q[0], y - q[1]) < rr) return { tipo: 'luna', pos: [q[0], q[1]], scala: Math.max(L.raggioM / P.P.raggioM, 0.2), testo: descriviLuna(P.P, L) }; } }
    return null;
  }
  let migliore = null, dm = Infinity;
  for (const f of figli(cam)) {
    let dx = x - f.pos[0], dy = y - f.pos[1];
    if (cam.livello === 0) { dx -= Math.round(dx); dy -= Math.round(dy); }
    const d = Math.hypot(dx, dy), r = Math.max(px, f.scala * (cam.livello === 2 ? 2.5 : 1));
    if (d < r && d < dm) { dm = d; migliore = f; }
  }
  if (cam.livello === 1 && !migliore) { const Gx = galassia(cam.via.cosmo, cam.via.galassia), rb = raggioBuco(Gx); if (Math.hypot(x, y) < Math.max(px, rb)) return { tipo: 'buco', pos: [0, 0], scala: Math.max(px, rb), testo: `il buco nero al centro della galassia: ${fmtGrande(Gx.buco.M)} masse solari, largo ${fmtLunghezza(2 * rb * Gx.forma.unitaM)}${Gx.G.attivita > 0.3 ? ' · attivo: il suo getto lancia raggi cosmici' : ''}` }; }
  if (!migliore) return null;
  const d = migliore.dato;
  const testo = cam.livello === 0 ? `galassia ${d.id + 1} · ${d.tipo}${d.attivita > 0.3 ? ', con il buco nero attivo' : ''} · clic per avvicinarti`
    : cam.livello === 1 ? (d.stato === 'in vita' || d.stato === 'gigante rossa'
      ? `stella ${d.id + 1} · ${d.stato === 'gigante rossa' ? 'gigante rossa, alla fine' : d.T > 9000 ? 'azzurra' : d.T > 6500 ? 'bianca' : d.T > 5000 ? 'gialla' : d.T > 3800 ? 'arancione' : 'rossa'}, ${d.massa.toFixed(1)} masse solari, ${Math.round(d.eta / 1e6).toLocaleString('it-IT')} milioni di anni, metalli ${d.Z.toFixed(2)}× il Sole · clic per i suoi pianeti`
      : `stella ${d.id + 1} · ${d.stato}, ${d.massa.toFixed(2)} masse solari (nata con ${d.massaNascita.toFixed(1)}), raggio ${fmtLunghezza(d.raggioM)}${d.B ? `, campo ${d.B.toExponential(0)} tesla` : ''}, morta da ${Math.round(d.morta / 1e6).toLocaleString('it-IT')} milioni di anni${d.stato === 'nana bianca' ? ' · clic per i pianeti sopravvissuti' : ' · nessun pianeta: la supernova li ha dispersi'}`)
    : descriviPianeta(d) + ' · clic per avvicinarti';
  return { tipo: ['galassia', 'stella', 'pianeta'][cam.livello], pos: migliore.pos, scala: migliore.scala * migliore.raggio, testo };
}
const descriviClima = (c) => !c ? '' : ` · ${Math.round(c.T - 273.15)} °C${isFinite(c.pressione) ? `, ${c.pressione < 1 ? 'senza atmosfera' : `${(c.pressione / 1e5).toPrecision(2)} bar`}` : ''}, acqua ${c.acqua}`;
const descriviPianeta = (P) => `pianeta ${P.id + 1}${descriviClima(P.clima)} · ${P.tipo}${P.anelli ? ', con anelli' : ''}${P.lune?.length ? `, ${P.lune.length} ${P.lune.length === 1 ? 'luna' : 'lune'}` : ''}, raggio ${fmtLunghezza(P.raggioM)}, campo ${Math.round(P.B0 * 1e9).toLocaleString('it-IT')} nT, fatto di ${Object.entries(P.composizione || {}).map(([k, v]) => `${k} ${Math.round(v * 100)}%`).join(', ')}`;

// la camera che va verso un oggetto: un passo di volo (da chiamare a ogni fotogramma)
export function volaVerso(cam, obiettivo, W, H) {
  const m = minimo(W, H), zFin = (0.5 * m) / obiettivo.scala;
  let dx = obiettivo.pos[0] - cam.cx, dy = obiettivo.pos[1] - cam.cy;
  if (cam.livello === 0) { dx -= Math.round(dx); dy -= Math.round(dy); }
  cam.cx += dx * 0.3; cam.cy += dy * 0.3;
  // (la meta può essere miliardi di volte più piccola dello schermo: ci si avvicina solo quanto basta a tenerla in vista,
  // così lo zoom segue lo sguardo che converge su di lei)
  const resta = 0.7 * Math.hypot(dx, dy), zVista = resta > 0 ? (0.25 * m) / resta : Infinity;
  const k = Math.exp(Math.max(-0.45, Math.min(0.45, Math.log(zFin / cam.z) * 0.18, Math.log(zVista / cam.z))));
  return zoomMappa(cam, W / 2, H / 2, k, W, H);
}

// la riga «dove sei»
export function percorso(cam) {
  const v = cam.via, out = [`cosmo ${cosmoBase(v.cosmo)}${Object.keys(ramiCosmo(v.cosmo)).length ? ' (un ramo parallelo)' : ''}`];
  if (cam.livello >= 1) out.push(`galassia ${v.galassia + 1}`);
  if (cam.livello >= 2) out.push(`stella ${v.stella + 1}`);
  if (cam.livello >= 3) out.push(`pianeta ${v.pianeta + 1}`);
  if (cam.livello >= 4) out.push('la superficie');
  if (cam.livello >= 5) out.push(rocciaDi(cam)?.nome || 'la roccia');
  return out;
}

// ---------- il disegno
// (le stelle di fondo della carta piatta: una serie con nome, non più il seme fisso 7 con il generatore 16807)
const fondoStelle = (() => { const p = [], r = serie('mappa piatta', 'stelle di fondo'); for (let i = 0; i < 260; i++) p.push([r(3 * i), r(3 * i + 1), r(3 * i + 2)]); return p; })();
const reteImg = new Map();
function immagineRete(n) {
  if (reteImg.has(n)) return reteImg.get(n);
  const C = cosmo(n), N = C.N, cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(N, N) : Object.assign(document.createElement('canvas'), { width: N, height: N });
  const x = cv.getContext('2d'), im = x.createImageData(N, N);
  for (let i = 0; i < N * N; i++) {
    const v = Math.max(0, (C.griglia[i] - C.media) / C.sigma + 0.6), t = Math.min(1, v / 3);
    im.data[4 * i] = 20 + 90 * t; im.data[4 * i + 1] = 18 + 40 * t * t; im.data[4 * i + 2] = 40 + 110 * t; im.data[4 * i + 3] = 255;
  }
  x.putImageData(im, 0, 0); reteImg.set(n, cv); return cv;
}
const anteprime = new Map();
function anteprimaRegione(a) {
  const k = JSON.stringify(a); if (anteprime.has(k)) return anteprime.get(k);
  const u = regione(a), tr = simulaMondo(u.cella); anteprime.set(k, tr); if (anteprime.size > 8) anteprime.delete(anteprime.keys().next().value);
  return tr;
}

export function disegnaMappa(ctx, W, H, cam, { sopra = null, evidenzia = null, dpr = 1, nudo = false } = {}) {
  const z = cam.z, X = (x) => W / 2 + (x - cam.cx) * z, Y = (y) => H / 2 + (y - cam.cy) * z;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#05060b'; ctx.fillRect(0, 0, W, H);
  // le stelle lontane (sfondo, fisso)
  if (!nudo) for (const [u, v, b] of fondoStelle) { ctx.fillStyle = `rgba(220,225,255,${0.12 + 0.35 * b})`; ctx.fillRect(u * W, v * H, dpr * (b > 0.9 ? 1.5 : 1), dpr * (b > 0.9 ? 1.5 : 1)); }
  const v = cam.via;
  if (cam.livello === 0) {
    const C = cosmo(v.cosmo), img = immagineRete(v.cosmo);
    // la rete cosmica, ripetuta: lo spazio si richiude
    const i0 = Math.floor(cam.cx - W / 2 / z) - 1, i1 = Math.floor(cam.cx + W / 2 / z) + 1, j0 = Math.floor(cam.cy - H / 2 / z) - 1, j1 = Math.floor(cam.cy + H / 2 / z) + 1;
    // (la rete è la materia a grande scala: avvicinandosi a una galassia vera — un punto, sulla rete — una sua cella riempie
    // lo schermo e poi sbiadisce, fino al buio in cui sta la galassia)
    const cella = z / C.N, velo = 0.85 * Math.max(0, Math.min(1, 1 - Math.log10(cella / (4 * Math.max(W, H))) / 2));
    ctx.imageSmoothingEnabled = true; ctx.globalAlpha = velo;
    if (velo > 0 && cella < 0.5 * Math.max(W, H)) { for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) ctx.drawImage(img, X(i), Y(j), z, z); }
    else if (velo > 0) { // molto dentro: il colore della rete in quel punto (la stessa densità, calcolata lì), senza stirare l'immagine
      const d = Math.max(0, (C.densita(cam.cx, cam.cy) - C.media) / C.sigma + 0.6), t = Math.min(1, d / 3); ctx.fillStyle = `rgb(${Math.round(20 + 90 * t)},${Math.round(18 + 40 * t * t)},${Math.round(40 + 110 * t)})`; ctx.fillRect(0, 0, W, H);
    }
    ctx.globalAlpha = 1;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) for (const G of C.galassie) {
      const x = X(G.pos[0] + i), y = Y(G.pos[1] + j), r = G.r * z;
      if (x < -r - 20 || y < -r - 20 || x > W + r + 20 || y > H + r + 20) continue;
      disegnaGalassiaLontana(ctx, G, x, y, r, dpr, v.cosmo);
    }
  } else if (cam.livello === 1) {
    const Gx = galassia(v.cosmo, v.galassia);
    disegnaGalassia(ctx, Gx, X, Y, z, dpr, v);
    // le sorgenti dei raggi cosmici
    for (const s of Gx.sorgenti) {
      if (s.tipo === 'supernova') { ctx.strokeStyle = 'rgba(255,140,170,0.55)'; ctx.lineWidth = dpr; cerchio(ctx, X(s.pos[0]), Y(s.pos[1]), Math.max(2 * dpr, s.r * z)); }
      if (s.tipo === 'pulsar') { ctx.strokeStyle = 'rgba(150,210,255,0.9)'; ctx.lineWidth = dpr; const x = X(s.pos[0]), y = Y(s.pos[1]), l = 4 * dpr; if (!(Math.abs(x) < 1e5 && Math.abs(y) < 1e5)) continue; ctx.beginPath(); ctx.moveTo(x - l, y); ctx.lineTo(x + l, y); ctx.moveTo(x, y - l); ctx.lineTo(x, y + l); ctx.stroke(); }
    }
    if (evidenzia?.stella != null && evidenzia.galassia === v.galassia) {
      const S = Gx.stelle[evidenzia.stella];
      for (const s of Gx.sorgenti) if (evidenzia.sorgenti?.some((n) => n.startsWith(s.nome))) { ctx.strokeStyle = 'rgba(255,190,90,0.7)'; ctx.setLineDash([5 * dpr, 4 * dpr]); ctx.lineWidth = dpr; tratto(ctx, X(s.pos[0]), Y(s.pos[1]), X(S.pos[0]), Y(S.pos[1])); ctx.setLineDash([]); scrivi(ctx, s.nome, X(s.pos[0]) + 6 * dpr, Y(s.pos[1]) - 6 * dpr, 'rgba(255,200,120,0.9)', dpr); }
      ctx.strokeStyle = 'rgba(255,200,120,0.95)'; ctx.lineWidth = 1.5 * dpr; ctx.beginPath(); ctx.arc(X(S.pos[0]), Y(S.pos[1]), 7 * dpr, 0, 7); ctx.stroke();
    }
  } else if (cam.livello === 2) {
    disegnaSistema(ctx, sistema(v.cosmo, v.galassia, v.stella), X, Y, z, dpr, v);
  } else if (cam.livello === 5) {
    disegnaRoccia(ctx, W, H, cam, dpr);
  } else if (cam.livello === 4) {
    disegnaSuperficie(ctx, W, H, cam, dpr);
  } else {
    disegnaPianeta(ctx, v, X, Y, z, dpr, evidenzia);
  }
  // (il metro: la barra di scala vera, una sola per tutte le viste, la disegna la pagina: laboratorio.js, barraDiScala;
  // qui resta solo l'avviso del tempo accelerato sul pianeta)
  if (cam.livello === 3) { ctx.font = `${12 * dpr}px ui-monospace, monospace`; ctx.fillStyle = 'rgba(235,230,215,0.9)'; ctx.fillText(`il tempo scorre ${ACCELERA} volte più in fretta`, 18 * dpr, H - 42 * dpr); }
  if (sopra) {
    ctx.strokeStyle = 'rgba(255,200,120,0.9)'; ctx.lineWidth = 1.2 * dpr;
    let px = sopra.pos[0], py = sopra.pos[1];
    if (cam.livello === 0) { px = cam.cx + ((px - cam.cx + 0.5) % 1 + 1) % 1 - 0.5; py = cam.cy + ((py - cam.cy + 0.5) % 1 + 1) % 1 - 0.5; }
    const r = Math.max(8 * dpr, sopra.scala * z * 1.05);
    if (sopra.tipo === 'regione') ctx.strokeRect(X(px) - r, Y(py) - r, 2 * r, 2 * r); else { ctx.beginPath(); ctx.arc(X(px), Y(py), r, 0, 7); ctx.stroke(); }
    scrivi(ctx, sopra.testo, X(px) + r + 6 * dpr, Y(py), 'rgba(255,215,150,0.95)', dpr);
  }
}
function scrivi(ctx, t, x, y, c, dpr) { ctx.font = `${12 * dpr}px ui-monospace, monospace`; ctx.fillStyle = 'rgba(5,6,11,0.7)'; const w = ctx.measureText(t).width; ctx.fillRect(x - 3 * dpr, y - 12 * dpr, w + 6 * dpr, 16 * dpr); ctx.fillStyle = c; ctx.fillText(t, x, y); }
function alone(ctx, x, y, r, c, a) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgb(c, a)); g.addColorStop(1, rgb(c, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }

// un cerchio che può essere enorme (il resto di una supernova visto da dentro, un'orbita): se è più grande dello
// schermo se ne disegna solo il tratto che ci passa, per punti (i numeri troppo grandi la tela li sbaglia)
function cerchio(ctx, x, y, r) {
  const W = ctx.canvas.width, H = ctx.canvas.height, d = Math.hypot(W / 2 - x, H / 2 - y), mezza = Math.hypot(W, H) / 2;
  if (d > r + mezza || d < r - mezza) return; // non tocca lo schermo
  ctx.beginPath();
  if (r < 8000) ctx.arc(x, y, r, 0, 7);
  else { const fi0 = Math.atan2(H / 2 - y, W / 2 - x), semi = Math.min(Math.PI, (1.5 * mezza) / r); for (let q = 0; q <= 48; q++) { const fi = fi0 - semi + (2 * semi * q) / 48, px = x + r * Math.cos(fi), py = y + r * Math.sin(fi); q ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } }
  ctx.stroke();
}
// un tratto tra due punti che possono essere lontanissimi dallo schermo: se ne disegna solo la parte vicina
function tratto(ctx, x0, y0, x1, y1) {
  const W = ctx.canvas.width, H = ctx.canvas.height, L = 4 * (W + H); let t0 = 0, t1 = 1;
  for (const [p, q] of [[x0 - x1, x0 + L], [x1 - x0, W + L - x0], [y0 - y1, y0 + L], [y1 - y0, H + L - y0]]) { if (p === 0) { if (q < 0) return; continue; } const t = q / p; if (p < 0) { if (t > t1) return; if (t > t0) t0 = t; } else { if (t < t0) return; if (t < t1) t1 = t; } }
  ctx.beginPath(); ctx.moveTo(x0 + t0 * (x1 - x0), y0 + t0 * (y1 - y0)); ctx.lineTo(x0 + t1 * (x1 - x0), y0 + t1 * (y1 - y0)); ctx.stroke();
}
// il raggio del buco nero centrale (l'orizzonte, 2GM/c²) nelle unità della galassia: la sua taglia vera
const raggioBuco = (Gx) => (2 * 6.674e-11 * Gx.buco.M * 1.989e30) / 2.998e8 ** 2 / Gx.forma.unitaM;
function disegnaGalassiaLontana(ctx, G, x, y, r, dpr, n) {
  // la taglia è quella vera: da lontano un puntino (più grande se ha più stelle), per poterla trovare
  if (r < 30 * dpr) { const p = Math.max(2.2, Math.min(4.5, 2.2 + 1.2 * Math.log10(G.forma.massaStelle / 1e10))) * dpr; alone(ctx, x, y, Math.max(p, r * 1.4), G.tinta, 0.8); ctx.fillStyle = 'rgba(255,250,240,0.95)'; ctx.fillRect(x - dpr / 2, y - dpr / 2, dpr, dpr); return; }
  // da vicino: le sue stelle vere, disegnate come quando ci si entra (così entrare non cambia niente sullo schermo)
  disegnaGalassia(ctx, galassia(n, G.id), (u) => x + u * r, (u) => y + u * r, r, dpr, { cosmo: n, galassia: G.id });
}
function disegnaGalassia(ctx, Gx, X, Y, z, dpr, v) {
  const G = Gx.G, W = ctx.canvas.width, H = ctx.canvas.height;
  // il chiarore di tutte le stelle che il campione non mostra: sfuma dal centro; da dentro è una tinta uniforme, che si
  // spegne avvicinandosi ancora (le stelle si separano: tra l'una e l'altra c'è il buio)
  if (0.45 * z < 6000) alone(ctx, X(0), Y(0), 0.45 * z, G.tinta, 0.35);
  else { const d = Math.hypot(W / 2 - X(0), H / 2 - Y(0)) / (0.45 * z), spento = Math.max(0, 1 - Math.log10((0.45 * z) / 6000) / 1.5); if (d < 1 && spento > 0) { ctx.fillStyle = rgb(G.tinta, 0.35 * (1 - d) * spento); ctx.fillRect(0, 0, W, H); } }
  const rs = raggioSistema(v.cosmo, v.galassia), sistemaPx = rs * z;
  for (const s of Gx.stelle) {
    const x = X(s.pos[0]), y = Y(s.pos[1]); if (!(x > -50 - sistemaPx && y > -50 - sistemaPx && x < W + 50 + sistemaPx && y < H + 50 + sistemaPx)) continue;
    // da vicino la stella è il suo sistema, con la taglia vera (30 UA): lo stesso disegno di quando ci si entra
    if (sistemaPx > 10 * dpr) { disegnaSistema(ctx, sistema(v.cosmo, v.galassia, s.id), (u) => x + u * sistemaPx, (u) => y + u * sistemaPx, sistemaPx, dpr, { ...v, stella: s.id }); continue; }
    // da lontano un puntino (più grande se pesa di più), per poterla trovare
    const b = Math.min(2.2, 0.6 + Math.cbrt(s.massa) * 0.5) * dpr, sola = Math.max(0, Math.min(1, Math.log10(z / 3e4) / 2)); // (sola: da vicino ne resta una sullo schermo, e le si dà un alone per non perderla)
    if (sola > 0) alone(ctx, x, y, (3 + 5 * sola) * dpr, s.colore, 0.6 * sola);
    ctx.fillStyle = rgb(s.colore, 0.95); ctx.fillRect(x - b / 2, y - b / 2, b, b);
  }
  // il buco nero: con la sua taglia vera (l'orizzonte), il chiarore di ciò che gli cade dentro, e il getto
  const rb = Math.max(2 * dpr, raggioBuco(Gx) * z), a = G.getto;
  if (G.attivita > 0.15) { ctx.strokeStyle = `rgba(150,190,255,${0.25 + 0.5 * G.attivita})`; ctx.lineWidth = Math.max(dpr, Math.min(3 * dpr, 0.004 * z)); for (const q of [1, -1]) tratto(ctx, X(0), Y(0), X(q * Math.cos(a) * 0.6), Y(q * Math.sin(a) * 0.6)); }
  if (Math.abs(X(0)) < 1e5 + rb && Math.abs(Y(0)) < 1e5 + rb) {
    if (rb < 6000) { alone(ctx, X(0), Y(0), rb * 3, [255, 190, 120], 0.25 + 0.55 * Math.max(G.attivita, 0.2)); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(X(0), Y(0), rb, 0, 7); ctx.fill(); }
    else if (Math.hypot(W / 2 - X(0), H / 2 - Y(0)) < rb) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); } // dentro l'orizzonte: buio
  }
}
function disegnaSistema(ctx, S, X, Y, z, dpr, v) {
  const st = S.stella;
  alone(ctx, X(0), Y(0), Math.max(10 * dpr, st.r * z * 4), st.colore, 0.9);
  ctx.fillStyle = rgb(st.colore); ctx.beginPath(); ctx.arc(X(0), Y(0), Math.max(2 * dpr, st.r * z), 0, 7); ctx.fill();
  for (const P of S.pianeti) {
    ctx.strokeStyle = 'rgba(200,210,255,0.16)'; ctx.lineWidth = dpr; ctx.beginPath();
    if (P.a * z < 8000 * dpr) ctx.arc(X(0), Y(0), P.a * z, 0, 7);
    else { // da molto vicino l'orbita è un cerchio enorme: se ne disegna solo il tratto che passa sullo schermo, per punti
      const cxs = ctx.canvas.width / 2, cys = ctx.canvas.height / 2, fi0 = Math.atan2(cys - Y(0), cxs - X(0)), semi = Math.min(Math.PI, (1.5 * Math.hypot(cxs, cys)) / (P.a * z));
      for (let q = 0; q <= 48; q++) { const fi = fi0 - semi + (2 * semi * q) / 48, x = X(P.a * Math.cos(fi)), y = Y(P.a * Math.sin(fi)); q ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    }
    ctx.stroke();
    disegnaCorpo(ctx, P, X(P.pos[0]), Y(P.pos[1]), Math.max(2.5 * dpr, P.r * z), st, v, dpr, P.pos); // (taglia vera; da lontano un puntino, per poterlo trovare)
  }
}
function disegnaCorpo(ctx, P, x, y, r, st, v, dpr, pos) {
  // il pianeta, illuminato dalla sua stella
  const luce = Math.atan2(-pos[1], -pos[0]);
  if (P.anelli && r > 3 * dpr) { ctx.strokeStyle = rgb(P.colore, 0.45); ctx.lineWidth = Math.max(dpr, r * 0.5); ctx.beginPath(); ctx.arc(x, y, r * 2, 0, 7); ctx.stroke(); }
  const g = ctx.createRadialGradient(x + Math.cos(luce) * r * 0.5, y + Math.sin(luce) * r * 0.5, r * 0.1, x, y, r);
  g.addColorStop(0, rgb(P.colore.map((c) => Math.min(255, c + 40)))); g.addColorStop(1, rgb(P.colore.map((c) => c * 0.25)));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
}
function disegnaPianeta(ctx, v, X, Y, z, dpr, evidenzia) {
  const Pl = pianeta(v.cosmo, v.galassia, v.stella, v.pianeta), P = Pl.P, S = sistema(v.cosmo, v.galassia, v.stella);
  // la magnetosfera: linee di campo, come quelle di un dipolo
  ctx.strokeStyle = `rgba(110,150,255,${0.08 + 0.18 * P.campo})`; ctx.lineWidth = dpr;
  for (const L of [1.6, 2.2, 3, 4]) { ctx.beginPath(); for (let t = 0; t <= 64; t++) { const th = (t / 64) * 2 * Math.PI, r = L * Math.cos(th) ** 2; const x = X(r * Math.cos(th)), y = Y(r * Math.sin(th)); t ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
  // l'anello: le sue fasce, disegnate con la stessa densità che usa la fisica delle regioni
  if (Pl.anello) for (let r = Pl.anello[0]; r < Pl.anello[1]; r += 0.01) { const d = Pl.densitaAnello(r); ctx.strokeStyle = rgb(Pl.anelloVero?.colore || P.colore, Math.min(0.4, 0.25 * d)); ctx.lineWidth = Math.max(1, 0.011 * z); ctx.beginPath(); ctx.arc(X(0), Y(0), r * z, 0, 7); ctx.stroke(); }
  // LA NEBBIA: la fascia e l'anello come particelle che scorrono (lo stesso campione, sempre). Da
  // lontano sono puntini; quando il giro di una particella diventa abbastanza grande da vedersi,
  // il puntino diventa il suo cerchio vero.
  const neb = nebbiaPianeta(v.cosmo, v.galassia, v.stella, v.pianeta), t = (performance.now() / 1000) * ACCELERA;
  for (const g of neb.anello) { const f = g.fi + g.omega * t; ctx.fillStyle = rgb(Pl.anelloVero?.colore || P.colore, 0.55); ctx.fillRect(X(g.r * Math.cos(f)), Y(g.r * Math.sin(f)), dpr, dpr); }
  for (const q of neb.fascia) {
    const f = q.fi + q.omega * t, cx = q.r * Math.cos(f), cy = q.r * Math.sin(f), R = q.rg * z, x = X(cx), y = Y(cy);
    if (x < -R - 2 || y < -R - 2 || x > ctx.canvas.width + R + 2 || y > ctx.canvas.height + R + 2) continue;
    const col = q.elettrone ? '150,210,255' : '200,170,255', cerchio = Math.min(1, Math.max(0, (R - 2 * dpr) / (4 * dpr)));
    if (cerchio < 1) { ctx.fillStyle = `rgba(${col},${0.7 * (1 - cerchio)})`; ctx.fillRect(x, y, 1.3 * dpr, 1.3 * dpr); }
    if (cerchio > 0) { ctx.strokeStyle = `rgba(${col},${0.5 * cerchio})`; ctx.lineWidth = dpr; ctx.beginPath(); ctx.arc(x + R, y, R, 0, 7); ctx.stroke(); }
  }
  // LE LUNE (lune.js): l'orbita vera (in raggi del pianeta) e il corpo con la sua taglia vera; girano col tempo della mappa
  { const t = tempoMappa();
    for (const L of P.lune || []) {
      const [lx, ly, a, e] = posLuna(v, P, L, t), rl = (L.raggioM / P.raggioM) * z;
      if (a * z > 4 * ctx.canvas.width) continue; // orbita molto più grande dello schermo: non si vede
      ctx.strokeStyle = 'rgba(200,210,255,0.18)'; ctx.lineWidth = dpr; ctx.beginPath(); ctx.ellipse(X(-a * e), Y(0), a * z, a * Math.sqrt(1 - e * e) * z, 0, 0, 7); ctx.stroke();
      const ghiaccio = L.composizione?.ghiaccio || 0, col = [150 + 70 * ghiaccio, 145 + 75 * ghiaccio, 140 + 90 * ghiaccio].map(Math.round);
      const luce = Math.atan2(-P.pos[1], -P.pos[0]), x = X(lx), y = Y(ly), r = Math.max(2.2 * dpr, rl);
      const g = ctx.createRadialGradient(x + Math.cos(luce) * r * 0.5, y + Math.sin(luce) * r * 0.5, r * 0.1, x, y, r);
      g.addColorStop(0, rgb(col)); g.addColorStop(1, rgb(col.map((c) => c * 0.25))); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      if (L.stato === 'vulcanica') { ctx.fillStyle = 'rgba(255,150,60,0.9)'; ctx.fillRect(x - dpr, y - dpr, 2 * dpr, 2 * dpr); }
    } }
  // i raggi cosmici nel campo del pianeta: le orbite di Størmer, calcolate davvero
  // (sono calcolate fino a 20 raggi dal pianeta: guardando da più lontano sfumano, invece di mostrare il bordo del calcolo)
  const vicino = Math.max(0, Math.min(1, ((40 * z) / Math.min(ctx.canvas.width, ctx.canvas.height) - 0.9) / 0.6));
  ctx.strokeStyle = `rgba(255,196,120,${0.5 * vicino})`; ctx.lineWidth = dpr;
  if (vicino > 0) for (const t of magnetosfera(v.cosmo, v.galassia, v.stella, v.pianeta)) { ctx.beginPath(); t.forEach((p, i) => (i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])))); ctx.stroke(); }
  disegnaCorpo(ctx, P, X(0), Y(0), z, S.stella, v, dpr, P.pos);
  // la sua superficie, vista da sopra l'equatore: la stessa mappa del pannello, avvolta sulla sfera
  // la sua forma (schiacciata ai poli dalla rotazione) e la sua superficie vista dall'equatore
  const disco = discoPianeta(v, P), fz = 1 - (P.schiacciamento || 0);
  if (disco) { ctx.save(); ctx.beginPath(); ctx.ellipse(X(0), Y(0), z, z * fz, 0, 0, 7); ctx.clip(); ctx.drawImage(disco, X(0) - z, Y(0) - z * fz, 2 * z, 2 * z * fz); ctx.restore(); }
  // la direzione della stella
  const ds = Math.atan2(-P.pos[1], -P.pos[0]); alone(ctx, X(Math.cos(ds) * 6), Y(Math.sin(ds) * 6), 40 * dpr, S.stella.colore, 0.25);
  // le regioni: gli universi della camera
  const lato = LATO_REGIONE * z;
  for (const R of Pl.regioni) {
    const x = X(R.pos[0]) - lato / 2, y = Y(R.pos[1]) - lato / 2;
    const qui = evidenzia?.regione === R.id && evidenzia.pianeta === v.pianeta && evidenzia.stella === v.stella && evidenzia.galassia === v.galassia;
    ctx.strokeStyle = qui ? 'rgba(255,190,90,0.95)' : 'rgba(240,235,220,0.35)'; ctx.lineWidth = (qui ? 1.6 : 1) * dpr; ctx.strokeRect(x, y, lato, lato);
    // da vicino si vedono le tracce: è l'universo della camera
    if (lato > 120 * dpr && x < ctx.canvas.width && y < ctx.canvas.height && x + lato > 0 && y + lato > 0) {
      const tr = anteprimaRegione({ ...v, regione: R.id }), k = lato / 1000;
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, lato, lato); ctx.clip();
      // nessun foglio sopra: è lo stesso spazio, visto con più dettaglio (stessi colori del resto della mappa)
      ctx.strokeStyle = `rgba(200,190,255,${Math.min(0.75, (lato - 120 * dpr) / (250 * dpr))})`; ctx.lineWidth = Math.max(0.6 * dpr, 0.8 * k);
      for (const t of tr) { if (t.sagoma) continue; ctx.beginPath(); let su = false; for (const p of t.punti) { if (!p[2]) { su = false; continue; } const px = x + p[0] * k, py = y + p[1] * k; su ? ctx.lineTo(px, py) : ctx.moveTo(px, py); su = true; } ctx.stroke(); }
      ctx.restore();
    }
  }
  void evidenzia;
}

// la superficie di un pianeta solido proiettata sul disco (proiezione ortografica), con la luce della stella
const dischi = new Map();
export function discoPianeta(v, P) {
  if (P.tipo === 'gassoso' || !P.interno) return null;
  const k = JSON.stringify(v); if (dischi.has(k)) return dischi.get(k);
  const S = superficieDi(v); if (!S) return null; // si sta ancora calcolando: intanto il pianeta si vede come da lontano
  const cl = S.cl, sf = S.se, px = immagineSuperficie(sf, P.clima.T, cl), N = 256;
  if (S.mare?.esiste) coloraMare(S.mare, sf, px); // l'acqua ha il colore di ciò che porta: limpida, torbida alle foci, bassa, gelata, con croste di sale
  const cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(N, N) : Object.assign(document.createElement('canvas'), { width: N, height: N });
  const c = cv.getContext('2d'), im = c.createImageData(N, N), luce = Math.atan2(-P.pos[1], -P.pos[0]), lx = Math.cos(luce), ly = Math.sin(luce);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = (x + 0.5) / N * 2 - 1, w = (y + 0.5) / N * 2 - 1, r2 = u * u + w * w; if (r2 > 1) continue;
    const zz = Math.sqrt(1 - r2), lat = Math.asin(-w), lon = Math.atan2(u, zz);
    const i = Math.floor(((lon + Math.PI) / (2 * Math.PI)) * sf.W) % sf.W, j = Math.min(sf.H - 1, Math.floor(((Math.PI / 2 - lat) / Math.PI) * sf.H)), q = (j * sf.W + i) * 4;
    const ill = Math.max(0.12, 0.25 + 0.75 * (u * lx + w * ly + 0.3 * zz)), o = (y * N + x) * 4;
    im.data[o] = px[q] * ill; im.data[o + 1] = px[q + 1] * ill; im.data[o + 2] = px[q + 2] * ill; im.data[o + 3] = 255;
  }
  c.putImageData(im, 0, 0); dischi.set(k, cv); if (dischi.size > 6) dischi.delete(dischi.keys().next().value);
  return cv;
}

// ---------- la superficie esplorabile: tessere sempre più fini mentre ci si avvicina (geologia.js, tessera)
// La superficie (tettonica, clima, aria, erosione) costa alcuni secondi: si calcola IN SECONDO PIANO
// (superficie.worker.js) e intanto la mappa resta viva; superficieDi dà null finché non è pronta, poi avvisa.
const superfici = new Map(), tessereFatte = new Map(), inCalcolo = new Set();
let operaio = null, avvisa = null;
export function quandoSuperficiePronta(f) { avvisa = f; }
export const superficieInCalcolo = (v) => inCalcolo.has(JSON.stringify(v));
function tieni(k, out) { superfici.set(k, out); if (superfici.size > 4) superfici.delete(superfici.keys().next().value); return out; }
// (una superficie già calcolata altrove — le prove nel navigatore la fanno senza il filo — si mette qui per quella via)
export function ricordaSuperficie(v, S) { return tieni(JSON.stringify(v), S); }
export function superficieDi(v) {
  const k = JSON.stringify(v); if (superfici.has(k)) return superfici.get(k);
  const P = sistema(v.cosmo, v.galassia, v.stella).pianeti[v.pianeta]; const seme = P.origine;
  if (P.tipo === 'gassoso' || !P.interno) return null;
  if (typeof Worker === 'undefined' || typeof document === 'undefined') { // senza fili in secondo piano (le prove): subito
    const sf0 = superficiePianeta(k, P, P.interno, seme), cl0 = climaSuperficie(k, P, sf0), se = erosione(k, sf0, cl0);
    let acque = null; try { acque = mareDi(P, se, cl0, se, `${k}/mare`); } catch { acque = null; }
    let cl = cl0; try { if (acque && acque.esiste) cl = climaConIlMare(k, P, sf0, cl0, acque); } catch { cl = cl0; }
    return tieni(k, { k, P, cl, se, seme, mare: acque });
  }
  if (!inCalcolo.has(k)) mandaAlFilo(k, v);
  return null;
}
function mandaAlFilo(k, v) {
  if (!operaio) {
    operaio = new Worker(new URL('./superficie.worker.js', import.meta.url), { type: 'module' });
    operaio.onmessage = (e) => {
      const d = e.data; inCalcolo.delete(d.k);
      if (d.errore) { console.error('la superficie non si è potuta calcolare:', d.errore); return; }
      const w = JSON.parse(d.k), Pw = sistema(w.cosmo, w.galassia, w.stella).pianeti[w.pianeta];
      tieni(d.k, { k: d.k, P: Pw, cl: d.cl, se: d.se, seme: Pw.origine, mare: d.mare }); if (avvisa) avvisa(w);
    };
  }
  inCalcolo.add(k); operaio.postMessage({ k, v });
}
// LA SUPERFICIE DI UN PIANETA CHE SI SA GIÀ DI VOLER VEDERE (il pianeta d'avvio): si comincia subito nel filo, senza chiedere qui
// sistema() (costa secondi sul filo dell'interfaccia: lo fa il filo). Quando lo zoom ci arriva superficieDi la trova pronta, o in calcolo
export function preparaSuperficie(v) {
  const k = JSON.stringify(v); if (superfici.has(k) || inCalcolo.has(k) || typeof Worker === 'undefined' || typeof document === 'undefined') return;
  mandaAlFilo(k, v);
}
// LE TESSERE IN SECONDO PIANO (tessere_mappa.worker.js): la stessa tessera, la stessa immagine e lo stesso mare di qui sotto,
// calcolati in due fili invece che sul filo dell'interfaccia (ognuna costava da mezzo secondo a qualche secondo: la rotella si
// fermava). Una tessera va sempre al filo della sua antenata del livello 1, che ha già in memoria le madri. Quando arriva si
// mette tra le tessere fatte come prima; finché non c'è si vedono quelle più grosse. Senza fili (le prove) si resta qui.
const FILI_TESSERE = 2, filiT = [], chiesteT = new Map(); let baseT = null, senzaFiliTessere = false;
function filiTessere(S) {
  if (senzaFiliTessere || typeof Worker === 'undefined' || typeof document === 'undefined') return null;
  if (baseT === S.k) return filiT;
  for (const f of filiT) f.w.terminate(); filiT.length = 0; chiesteT.clear(); baseT = S.k;
  try {
    for (let i = 0; i < FILI_TESSERE; i++) {
      const w = new Worker(new URL('./tessere_mappa.worker.js', import.meta.url), { type: 'module' }), f = { w, inVolo: 0 };
      w.onmessage = (e) => { f.inVolo--; arrivataTessera(e.data); };
      w.onerror = (e) => { console.error('tessere_mappa.worker.js:', e.message); senzaFiliTessere = true; };
      w.postMessage({ tipo: 'base', k: S.k, se: S.se, cl: S.cl, mare: S.mare, seme: S.seme, T: S.P.clima.T }); filiT.push(f);
    }
  } catch (err) { console.warn('le tessere restano sul filo principale:', err); senzaFiliTessere = true; return null; }
  return filiT;
}
function chiediTessera(S, L, tx, ty) {
  const k = `${S.k}|${L}|${tx}|${ty}`; if (chiesteT.has(k)) return;
  const f = filiT[L === 0 ? 0 : ((tx >> (2 * (L - 1))) + (ty >> (2 * (L - 1)))) % filiT.length];
  if (f.inVolo >= 2) return; // (al più due per filo: le altre si chiedono ai fotogrammi dopo, se si guardano ancora)
  f.inVolo++; chiesteT.set(k, true); f.w.postMessage({ tipo: 'tessera', k: S.k, L, tx, ty, t: performance.now() / 1000 });
}
function arrivataTessera(d) {
  const k = `${d.k}|${d.L}|${d.tx}|${d.ty}`; chiesteT.delete(k);
  if (d.errore) { console.warn('tessere_mappa.worker.js, si torna al filo principale:', d.errore); senzaFiliTessere = true; return; }
  const S = superfici.get(d.k); if (!S || d.k !== baseT) return;
  const sf = d.L === 0 ? tessera(S.k, S.se, S.cl, 0, 0, 0, S.seme) : d.sf; // (la tessera 0 è la superficie stessa, come qui sotto)
  const cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(sf.W, sf.H) : Object.assign(document.createElement('canvas'), { width: sf.W, height: sf.H });
  cv.getContext('2d').putImageData(new ImageData(d.px, sf.W, sf.H), 0, 0);
  tessereFatte.set(k, { cv, sf, base: d.base, mossa: d.mossa }); if (tessereFatte.size > 60) tessereFatte.delete(tessereFatte.keys().next().value);
}
const livelloTessere = (z) => Math.max(0, Math.min(7, Math.floor(Math.log(z / 420) / Math.log(4))));
export let tessereInAttesa = 0;
let giroMare = 1; // a ogni giro tutte le tessere con onde in vista vengono ridisegnate una volta
function disegnaSuperficie(ctx, W, H, cam, dpr) {
  const S = superficieDi(cam.via), z = cam.z, Lmax = livelloTessere(z);
  if (!S) { ctx.fillStyle = 'rgba(235,230,215,0.85)'; ctx.font = `${14 * dpr}px ui-monospace, monospace`; ctx.textAlign = 'center'; ctx.fillText('la superficie si sta formando: tettonica, clima, aria, erosione…', W / 2, H / 2); ctx.textAlign = 'start'; return; }
  const x0 = cam.cx - W / 2 / z, x1 = cam.cx + W / 2 / z, y0 = Math.max(0, cam.cy - H / 2 / z), y1 = Math.min(0.5, cam.cy + H / 2 / z);
  ctx.imageSmoothingEnabled = true; tessereInAttesa = 0; let nuove = 0, mosse = 0, restano = 0;
  // dal più grosso al più fine: si disegna quello che c'è, e si calcola una tessera nuova per fotogramma
  for (let L = Math.max(0, Lmax - 2); L <= Lmax; L++) {
    const n = 4 ** L;
    for (let ty = Math.floor(y0 * 2 * n); ty <= Math.min(n - 1, Math.floor(y1 * 2 * n)); ty++) for (let txg = Math.floor(x0 * n); txg <= Math.floor(x1 * n); txg++) {
      const tx = ((txg % n) + n) % n, k = `${S.k}|${L}|${tx}|${ty}`; let t = tessereFatte.get(k);
      if (!t && filiTessere(S)) { chiediTessera(S, L, tx, ty); tessereInAttesa++; continue; } // (in un filo: arriva a un fotogramma dopo)
      if (!t) {
        if (nuove >= 1 && L > 0) { tessereInAttesa++; continue; }
        const sf = tessera(S.k, S.se, S.cl, L, tx, ty, S.seme), px = immagineSuperficie(sf, S.P.clima.T, S.cl);
        // il mare com'è lì: il colore dall'ottica vera e dal fondale (parte ferma), e sopra le onde di quel punto (mare.js)
        let acqua = false; if (S.mare?.esiste) { for (let q = 0; q < sf.alt.length; q += 7) if (sf.alt[q] < sf.mare || (sf.lago && sf.lago[q] > 0)) { acqua = true; break; } }
        const base = acqua ? px.slice() : null; // la terra e il fondo, senz'acqua sopra: da qui si ridisegna il mare che si muove
        if (acqua) aspettoMare(S.mare, sf, px, { t: performance.now() / 1000, onde: 6 });
        const cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(sf.W, sf.H) : Object.assign(document.createElement('canvas'), { width: sf.W, height: sf.H });
        cv.getContext('2d').putImageData(new ImageData(px, sf.W, sf.H), 0, 0);
        t = { cv, sf, base, mossa: acqua && (aspettoMare.ultimo?.onde || 0) > 0 }; tessereFatte.set(k, t); if (tessereFatte.size > 60) tessereFatte.delete(tessereFatte.keys().next().value); nuove++;
      }
      // dove le onde si vedono (tessere fini con acqua) il mare si ridisegna all'istante di adesso: poche tessere per
      // fotogramma, a turno, perché costa
      if (t.mossa && L === Lmax && mosse < 2 && (t.giro || 0) < giroMare) { const q = t.base.slice(); aspettoMare(S.mare, t.sf, q, { t: performance.now() / 1000, onde: 6 }); t.cv.getContext('2d').putImageData(new ImageData(q, t.sf.W, t.sf.H), 0, 0); t.giro = giroMare; mosse++; }
      else if (t.mossa && L === Lmax && (t.giro || 0) < giroMare) restano++;
      const px0 = W / 2 + (txg / n - cam.cx) * z, py0 = H / 2 + ((ty / n) * 0.5 - cam.cy) * z;
      ctx.drawImage(t.cv, px0, py0, z / n + 0.5, (0.5 * z) / n + 0.5);
    }
  }
  if (!restano) giroMare++;
}

// ---------- la roccia di un punto della superficie (rocce.js): che cosa c'è lì lo decide il posto
// (crosta continentale o vulcanica, fiume o lago, ghiaccio), e la sua tessitura nasce da come si è formata
const rocceFatte = new Map();
// ---------- LE FINESTRE IN SECONDO PIANO (finestre.worker.js). Prima il padre, poi il figlio: la finestra che non c'è ancora
// si mostra subito col livello di sopra (il decimo centrale della finestra dieci volte più grande, ingrandito, o il colore del
// mare in quel punto), il figlio si calcola in un filo e quando arriva vi si sfuma (SFUMA ms). Le richieste stanno in una coda
// con priorità: prima la finestra che si guarda, poi le sue immagini che si muovono, poi le vicine in scala (dieci volte più
// grandi e più piccole: disegnaFinestre), poi quelle preparate in anticipo nella direzione dello zoom (cam.verso); ciò che
// nessuno chiede più da 1,5 s esce dalla coda. Il calcolo è lo stesso di prima, con gli stessi argomenti: gli stessi bit.
const SFUMA = 400, FILI_FINESTRE = 2, filiF = [], richiesteF = new Map(), scenePronte = new Map(); let codaF = [], baseF = null, avvisaFinestra = null;
const conFili = () => typeof Worker !== 'undefined' && typeof document !== 'undefined' && !senzaFiliFinestre;
let senzaFiliFinestre = false;
export function quandoFinestraPronta(f) { avvisaFinestra = f; }
export const statoFinestre = { chieste: 0, arrivate: 0, msFilo: 0, scartate: 0, get inCoda() { return codaF.length; }, get inCorso() { return filiF.filter((f) => !f.libero).length; } };
function filiPer(S) {
  if (baseF === S.k) return filiF;
  for (const f of filiF) f.w.terminate(); filiF.length = 0; codaF = []; richiesteF.clear(); baseF = S.k;
  try {
    for (let i = 0; i < FILI_FINESTRE; i++) {
      const w = new Worker(new URL('./finestre.worker.js', import.meta.url), { type: 'module' }), f = { w, libero: true, tessere: new Set() };
      w.onmessage = (e) => { f.libero = true; arrivataF(e.data); distribuisciF(); };
      w.onerror = (e) => { console.error('finestre.worker.js:', e.message); f.libero = true; distribuisciF(); };
      w.postMessage({ tipo: 'base', k: S.k, v: JSON.parse(S.k), mare: S.mare, se: S.se, cl: S.cl, seme: S.seme }); filiF.push(f);
    }
  } catch (err) { console.warn('le finestre restano sul filo principale:', err); senzaFiliFinestre = true; }
  return filiF;
}
// rid: la chiave della richiesta; dest: il filo che tiene già quella finestra (le immagini seguenti vanno a lui)
function chiediF(S, rid, msg, pri, A, dest = null) {
  filiPer(S); const ora = performance.now(); let r = richiesteF.get(rid);
  if (r) { r.uso = ora; r.pri = Math.min(r.pri, pri); return r; }
  r = { rid, msg, pri, uso: ora, A, dest, t: ora }; richiesteF.set(rid, r); codaF.push(r); statoFinestre.chieste++; distribuisciF(); return r;
}
function distribuisciF() {
  const ora = performance.now();
  codaF = codaF.filter((r) => { if (ora - r.uso < 1500) return true; richiesteF.delete(r.rid); if (r.A && r.msg.tipo === 'immagine') r.A.inVolo = false; statoFinestre.scartate++; return false; }); // (nessuno la guarda più)
  for (const f of filiF) {
    if (!f.libero || !codaF.length) continue; let m = -1;
    for (let i = 0; i < codaF.length; i++) { const r = codaF[i]; if (r.dest && r.dest !== f) continue; if (m < 0 || r.pri < codaF[m].pri) m = i; }
    if (m < 0) continue; const r = codaF.splice(m, 1)[0]; f.libero = false; r.f = f; r.inviata = ora; if (r.A && !r.dest) r.A.filo = f;
    let msg = r.msg; if (msg.tipo === 'suolo' && msg.tessera) { const T = msg.tessera, kt = `${S_K(T)}`; msg = { ...msg, tessera: f.tessere.has(kt) ? { gia: kt } : { ...soloDati(T), gia: kt } }; f.tessere.add(kt); }
    f.w.postMessage(msg);
  }
}
const S_K = (T) => `${T.livello}|${T.rett}`;
// (i dati di una tessera senza le funzioni: ciò che un messaggio può portare)
function soloDati(o, visti = new Map()) {
  if (o === null || typeof o !== 'object') return typeof o === 'function' ? undefined : o; if (ArrayBuffer.isView(o)) return o; if (visti.has(o)) return visti.get(o);
  if (Array.isArray(o)) { const a = []; visti.set(o, a); for (const x of o) a.push(soloDati(x, visti)); return a; }
  const r = {}; visti.set(o, r); for (const k of Object.keys(o)) { const x = soloDati(o[k], visti); if (x !== undefined) r[k] = x; } return r;
}
function arrivataF(d) {
  const rid = d.tipo === 'immagine' ? `${d.id}|immagine` : d.id, r = richiesteF.get(rid); richiesteF.delete(rid); if (!r || d.k !== baseF) return;
  statoFinestre.arrivate++; statoFinestre.msFilo += d.ms || 0;
  if (d.tipo === 'nano') { if (d.scena) { scenePronte.set(d.id, d.scena); if (scenePronte.size > 3) scenePronte.delete(scenePronte.keys().next().value); } return; }
  const A = r.A; if (!A) return;
  // (se il filo non ce la fa, si torna al calcolo sul filo principale: la finestra si rifà alla prossima chiamata)
  if (d.errore && d.tipo === 'immagine') { A.inVolo = false; A.pronto = false; return; } // (il filo l'ha dimenticata: la si rifà, dall'immagine di adesso)
  if (d.errore) { console.warn('finestre.worker.js, si torna al filo principale:', d.errore); senzaFiliFinestre = true; for (const [q, x] of rocceFatte) if (x === A) rocceFatte.delete(q); return; }
  if (d.tipo === 'suolo' && d.nulla) { A.vuota = true; A.inVolo = false; return; }
  const nuova = telaN(d.N); nuova.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(d.px.buffer), d.N, d.N), 0, 0);
  if (d.tipo === 'immagine') { A.inVolo = false; A.costo = (d.ms || 0) / 1000; A.ultimo = d.tempo; if (A.sfuma) A.sfuma.a = nuova; else { A.cv = nuova; A.versione = (A.versione || 0) + 1; } A.scintille = conScintille(d.scintille, A.versione); }
  else { // il figlio è arrivato: si sfuma dal padre (il segnaposto) a lui
    A.N = d.N; A.pronto = true; A.inVolo = false; A.ultimo = 0; A.costo = (d.ms || 0) / 4000; A.msFilo = d.ms; A.msAttesa = performance.now() - r.t;
    if (d.tipo === 'acqua') A.frase = d.frase; else if (d.tipo === 'suolo') A.frase = `${A.fraseBase}${d.riga || ''} (la finestra calcolata in ${Math.round(d.ms)} ms, in secondo piano)`;
    A.sfuma = { da: A.cv, a: nuova, t0: performance.now() }; A.cv = telaN(d.N); componi(A);
    if (avvisaFinestra) avvisaFinestra(A); // (la frase è cambiata)
  }
}
// la dissolvenza dal padre al figlio, nel canvas della finestra (chi disegna la legge da lì)
function componi(A) {
  const s = A.sfuma; if (!s) return; const a = Math.min(1, (performance.now() - s.t0) / SFUMA), N = A.cv.width, x = A.cv.getContext('2d');
  if (a >= 1) { A.cv = s.a; A.sfuma = null; A.versione = (A.versione || 0) + 1; return; }
  x.globalAlpha = 1; x.imageSmoothingEnabled = true; x.drawImage(s.da, 0, 0, N, N); x.globalAlpha = a; x.drawImage(s.a, 0, 0, N, N); x.globalAlpha = 1; A.versione = (A.versione || 0) + 1;
}
// il segnaposto: il livello di sopra se c'è (la parte centrale della finestra dieci volte più grande, ingrandita), se no il colore
function segnaposto(sopra, colore) {
  const N = 64, cv = telaN(N), x = cv.getContext('2d');
  if (sopra?.cv && sopra.cv.width > 0) { const M = sopra.cv.width, c = M * 0.45, l = M * 0.1; x.imageSmoothingEnabled = true; x.drawImage(sopra.cv, c, c, l, l, 0, 0, N, N); }
  else { const c = colore || [10, 30, 60]; x.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; x.fillRect(0, 0, N, N); }
  return cv;
}
function acquaInSecondoPiano(cam, S, k, u, v, profondo, lato, ka, A) {
  const lon = u * 360 - 180, lat = 90 - v * 180;
  if (!A) {
    const sopra = rocceFatte.get(`${k}|acqua|${dieci(lato * 10)}`);
    let colore = null; if (!sopra) { try { colore = coloreMare(S.mare, lon, lat, { profonditaM: profondo, acqua: true, scalaM: lato }); } catch { colore = null; } }
    A = { cv: segnaposto(sopra, colore), acqua: true, liscio: true, N: 64, nome: `acqua (una finestra larga ${fmtLunghezza(lato)})`, larghezzaM: lato, frase: `una finestra d'acqua larga ${fmtLunghezza(lato)}: si sta calcolando (intanto il livello di sopra)…`, t0: performance.now() / 1000, ultimo: -1, punto: { u, v, profondo }, pronto: false };
    rocceFatte.set(ka, A); if (rocceFatte.size > 48) rocceFatte.delete(rocceFatte.keys().next().value);
  }
  if (A.sfuma) componi(A);
  // la priorità: la finestra che si guarda, poi le vicine in scala, poi quelle preparate in anticipo
  const pri = cam.prepara ? 2 + (cam.prepara - 1) : cam.secondaria ? 1 : 0;
  if (!A.pronto) { chiediF(S, ka, { tipo: 'acqua', id: ka, k: S.k, lon, lat, lato, fondoM: profondo, u, v }, pri, A); return A; }
  // il mare si muove nel tempo vero: le immagini seguenti le fa lo stesso filo, al più venti al secondo e per un quarto del suo
  // tempo (le vicine due al secondo, un ventesimo); le preparate in anticipo stanno ferme finché non si guardano
  if (cam.prepara) return A;
  const tt = performance.now() / 1000 - A.t0, passo = cam.secondaria ? Math.max(0.5, 20 * (A.costo || 0)) : Math.max(0.05, 4 * (A.costo || 0));
  if (!A.inVolo && tt - A.ultimo >= passo) { A.inVolo = true; chiediF(S, `${ka}|immagine`, { tipo: 'immagine', id: ka, k: S.k, tempo: tt }, cam.secondaria ? 3 : 0.5, A, A.filo); }
  else if (A.inVolo) { const r = richiesteF.get(`${ka}|immagine`); if (r) r.uso = performance.now(); }
  return A;
}
// PREPARARE LUNGO IL VOLO «VAI A» (adozione 12; universo.js vaiA): la meta è nota prima dell'arrivo, quindi la superficie del
// pianeta d'arrivo (il nodo che costa di più: tettonica, clima, vento, erosione, mare — superficie.worker.js, o il deposito se
// c'è già) si chiede alla partenza, e il viaggio nasconde il calcolo. meta: { galassia, stella, pianeta } o { corpo } (un
// pianeta del sistema aperto) o un bersaglio del doppio clic ({ rif }); U: l'universo 3D (per sapere dove si è)
export function preparaVolo(meta, U) {
  try {
    if (!meta) return null; let v = null; const ora = U?.viaOra?.() || {};
    if (meta.galassia != null && meta.stella != null && meta.pianeta != null) v = { cosmo: ora.cosmo ?? meta.cosmo, galassia: meta.galassia, stella: meta.stella, pianeta: meta.pianeta };
    else { const c = meta.corpo || meta.rif || meta, Sis = U?.sistema?.(), s = Sis?.scheda?.(c); if (s?.c?.cosa === 'pianeta' && Sis.via) v = { ...Sis.via, pianeta: s.c.id }; }
    if (!v || v.cosmo == null) return null; const P = sistema(v.cosmo, v.galassia, v.stella).pianeti[v.pianeta]; if (!P || P.tipo === 'gassoso' || !P.interno) return null;
    superficieDi(v); return v;
  } catch (err) { console.warn('preparaVolo:', err); return null; }
}
// PREPARARE IN ANTICIPO (adozione 12): mentre si zooma nell'acqua o nel suolo, le finestre dei due livelli dopo nella direzione
// del moto (cam.verso: +1 avanti, −1 indietro) si mettono in coda, dietro a quelle che si guardano
export function preparaAvanti(cam) {
  if (!conFili() || cam?.livello !== 5 || !cam.verso) return;
  try {
    if (cam.suAcqua && !cam.eventoAcqua) { const l = dieci(cam.latoAcqua ?? 1); for (const p of [1, 2]) { const L = dieci(l * 10 ** (-cam.verso * p)); if (L < 1e-9 * 0.999 || L > 1.0001) continue; rocciaDi({ ...cam, latoAcqua: L, prepara: p }); }
      // e, da tre livelli prima delle molecole, la loro scena in 3D (scenaAtomi: la si monta sotto i 10 nm; nel filo costa ~1 s)
      if (cam.verso > 0 && l <= 1.0001e-5) { const r = rocciaDi(cam), S = superficieDi(cam.via); if (r?.punto && S) for (const L of [1e-8, 1e-9]) { if (L > l * 1.0001) continue; const { u, v, profondo } = r.punto, ch = `${S.k}|${u.toFixed(7)}|${v.toFixed(7)}|acqua3d|${L}`; if (!scenePronte.has(ch)) chiediF(S, ch, { tipo: 'nano', id: ch, k: S.k, lon: u * 360 - 180, lat: 90 - v * 180, lato: L, fondoM: profondo, u, v }, L === 1e-8 ? 2.5 : 3.5, null); } } }
    else if (cam.latoSuolo !== null && cam.latoSuolo !== undefined) { const i = LATI_SUOLO.indexOf(cam.latoSuolo); for (const p of [1, 2]) { const L = LATI_SUOLO[i + cam.verso * p]; if (L) rocciaDi({ ...cam, latoSuolo: L, prepara: p }); } }
  } catch (err) { console.warn('preparaAvanti:', err); }
}
// i cristalli di una roccia: i cinque numeri dalla forma chiusa; se il fuso resta vetro (o quasi), la simulazione (veloce: si ferma subito)
const cristalli = (o) => { const c = cristallizzaChiusa(o); return c ? { ...c, raffreddamento: o.raffreddamento, seme: o.seme } : cristallizza(o); };
export function rocciaDi(cam) { // → { cv, nome, larghezzaM, frase, … }: ciò che si vede in fondo allo zoom, a ogni passo

  const S = superficieDi(cam.via); if (!S) return null;
  const u = ((cam.roccia.cx % 1) + 1) % 1, v = Math.max(0, Math.min(0.9999, cam.roccia.cy * 2)), k = `${S.k}|${u.toFixed(7)}|${v.toFixed(7)}`;
  if (rocceFatte.has(k)) { const base = rocceFatte.get(k); if (!cam.suAcqua && !(cam.passoRoccia > 0) && cam.latoSuolo !== null) { const w = suoloDelPunto(cam, S, base, k); if (w) return w; } return cam.passoRoccia > 0 && !cam.suAcqua ? passoRoccia(cam, S, base, k) : base; }
  // il punto, letto alla risoluzione più fine già calcolata (o sulla mappa intera)
  let t = S.se; for (let L = 7; L >= 1; L--) { const n = 4 ** L, q = tessereFatte.get(`${S.k}|${L}|${Math.floor(u * n)}|${Math.floor(v * n)}`); if (q) { t = q.sf; break; } }
  const [u0, v0, u1, v1] = t.rett || [0, 0, 1, 1], i = Math.min(t.W - 1, Math.floor(((u - u0) / (u1 - u0)) * t.W)), j = Math.min(t.H - 1, Math.floor(((v - v0) / (v1 - v0)) * t.H)), c = j * t.W + i;
  const cl = S.cl, ck = Math.min(cl.H - 1, Math.floor(v * cl.H)) * cl.W + Math.min(cl.W - 1, Math.floor(u * cl.W)), T = cl.media[ck], seme = semeEvento('roccia', cam.via.cosmo, cam.via.galassia, cam.via.stella, cam.via.pianeta, Math.floor(u * 1e6), Math.floor(v * 1e6)); // il caso di QUEL punto di QUEL pianeta
  // SULL'ACQUA: in fondo allo zoom non c'è la roccia ma un campione di quell'acqua (mare.js), con ciò che vi è sciolto
  // e sospeso proprio lì; avvicinandosi ancora il campione si restringe di dieci in dieci, fino alle molecole
  const profondo = t.alt[c] < t.mare ? t.mare - t.alt[c] : t.lago && t.lago[c] > 0 ? t.lago[c] : 0;
  cam.suAcqua = profondo > 0 && !!S.mare?.esiste;
  if (cam.suAcqua) {
    if (cam.eventoAcqua) return eventoNellAcqua(cam, S, k, u, v, profondo);
    const lato = cam.latoAcqua ?? 1, ka = `${k}|acqua|${lato}`; let A = rocceFatte.get(ka);
    // con i fili (la pagina): la finestra la calcola finestre.worker.js; qui intanto c'è il padre, poi si sfuma al figlio
    if (conFili()) return acquaInSecondoPiano(cam, S, k, u, v, profondo, lato, ka, A);
    if (!A) {
      // LA FINESTRA (finestra.js, PROGETTO.md lavoro 9): a ogni lato si calcola con la legge di quella grana solo il quadrato
      // inquadrato, come campione del mare di sopra: le onde di quel tratto (dallo spettro del vento, con le fasi degli eventi
      // del tratto), la schiuma, la corrente, le bolle, i granelli e i fiocchi nel loro numero
      const fin = finestraAcqua(S.mare, { lon: u * 360 - 180, lat: 90 - v * 180, latoM: lato, fondoM: profondo, P: S.P }), camp = fin.popolazioni?.campione || campioneAcqua(S.mare, { lon: u * 360 - 180, lat: 90 - v * 180, profondita: 0, latoM: lato, acqua: true, fondoM: profondo }, sorgente(`${S.k}/acqua/${u.toFixed(6)}/${v.toFixed(6)}`));
      const NA = fin.N || 128, cvA = telaN(NA);
      A = { cv: cvA, camp, fin, acqua: true, liscio: true, N: NA, nome: `acqua (una finestra larga ${fmtLunghezza(lato)})`, larghezzaM: lato, frase: `${fin.descrizione || camp.descrizione}${lato <= 2e-9 ? " Avvicinati ancora: sotto le molecole c'è l'evento vero che le attraversa (un decadimento, un raggio cosmico), con la sua attesa." : ''}`, quante: camp.quanteDavvero, t0: performance.now() / 1000, ultimo: -1, punto: { u, v, profondo } };
      // LA CHIMICA CHE SI MUOVE LÌ (reazioni.js, lavoro 10): dal micron in giù, una riga — quante specie e reazioni le regole
      // permettono, quante si muovono nel bagno di quest'acqua, se c'è un RAF. Si calcola solo quando si guarda (decine di ms)
      if (lato <= 1.0001e-6) { try { const ch = chimicaDellaFinestra(S.mare, { lon: u * 360 - 180, lat: 90 - v * 180, latoM: lato, fondoM: profondo, pianeta: S.P }); A.chimica = ch; A.frase += ` ${ch.riga} (calcolata in ${Math.round(ch.ms)} ms).`; } catch { /* la chimica non c'è: la finestra resta quella dell'acqua */ } }
      rocceFatte.set(ka, A); if (rocceFatte.size > 48) rocceFatte.delete(rocceFatte.keys().next().value);
    }
    // il mare si muove nel tempo vero (le onde corrono con la loro ω); la finestra si ridisegna al più venti volte al secondo,
    // e mai per più di un quarto del tempo (un'immagine costa 20–60 ms: a venti al secondo era quasi tutto il filo principale);
    // le finestre attorno a quella di adesso (secondaria: sopra e sotto, disegnaFinestre) al più due volte al secondo e per un
    // ventesimo del tempo
    const tt = performance.now() / 1000 - A.t0, passo = cam.secondaria ? Math.max(0.5, 20 * (A.costo || 0)) : Math.max(0.05, 4 * (A.costo || 0));
    if (tt - A.ultimo >= passo || A.ultimo < 0) { const t0 = performance.now(); A.ultimo = tt; A.cv.getContext('2d').putImageData(new ImageData(A.fin && !A.fin.asciutto ? immagineFinestra(A.fin, tt) : immagineAcqua(A.camp, { N: A.N, t: tt }), A.N, A.N), 0, 0); A.costo = (performance.now() - t0) / 1000; A.versione = (A.versione || 0) + 1; A.scintille = conScintille(A.fin?.ultima?.tempo === tt ? A.fin.ultima.scintille : null, A.versione); }
    return A;
  }
  const bagnato = t.alt[c] < t.mare || (t.lago && t.lago[c] > 0) || (t.depositato && t.depositato[c] > 3), mat = S.se.materiali || {};
  const conAnisotropia = (lista, base) => (lista && lista.length ? lista.map((x) => ({ nome: x.nome, frazione: x.frazione, colore: x.colore, anisotropia: 1.2 })) : base);
  // una PIANA DI SALE (mare.js: una conca dove l'acqua evapora tutta) è una crosta di cristalli cresciuti dalla salamoia
  let sale = null; if (S.mare?.esiste) { try { const q = luogoMare(S.mare, u * 360 - 180, 90 - v * 180); if (q.tipo === 'piana di sale') sale = q; } catch { sale = null; } }
  const neve = cl.neve > 0 && cl.freddo[ck] > 0.6, continente = !!(t.cont && t.cont[c]), etaP = S.P.interno?.eta ?? 4.5e9;
  let r, nome, larghezzaM, frase;
  if (neve) { r = fioccoDiNeve({ T: Math.max(238, Math.min(271, T)), umidita: cl.meteo?.umidita ? Math.max(0.3, Math.min(1, cl.meteo.umidita[ck])) : 0.86 + 0.14 * ((seme % 97) / 97), seme }); nome = `un cristallo di neve (${r.forma})`; larghezzaM = 0.004; frase = 'cresciuto dal vapore: la forma a sei viene dal reticolo del ghiaccio, i rami dall\'umidità'; }
  else if (sale) { r = cristalli({ raffreddamento: 0.003, minerali: [{ nome: 'salgemma', frazione: 0.85, colore: [240, 236, 228], anisotropia: 0 }, { nome: 'gesso', frazione: 0.15, colore: [236, 230, 218], anisotropia: 0.6 }], seme }); nome = 'crosta di sale'; larghezzaM = 0.02; frase = 'cristalli cresciuti dalla salamoia di una conca dove l\'acqua evapora tutta: salgemma (cubi) e un po\' di gesso'; }
  else if (bagnato) { const e = Math.max(0.05, Math.min(1, Math.log10(1 + (t.flusso[c] || 0)) / 4)); r = sedimento({ energia: e, seme }); nome = e > 0.6 ? 'ghiaia e sabbia grossa' : e > 0.3 ? 'sabbia' : 'limo'; larghezzaM = 0.02 + 0.3 * e; frase = 'granelli portati e depositati dall\'acqua: più corre, più sono grossi e mescolati'; }
  else if (continente) { r = cristalli({ raffreddamento: 0.003, minerali: conAnisotropia(mat.continente, GRANITO), seme }); nome = 'roccia dei continenti, a cristalli grossi'; larghezzaM = 0.04; frase = 'raffreddata lentamente in profondità: pochi cristalli, cresciuti a lungo'; }
  else { r = cristalli({ raffreddamento: 0.15, minerali: conAnisotropia(mat.basalto, BASALTO), seme }); nome = 'basalto, a cristalli minuti'; larghezzaM = 0.004; frase = 'lava raffreddata in fretta in superficie: tanti cristalli piccoli'; }
  // L'IMMAGINE DEL CAMPIONE si fa solo se la si guarda: per la roccia a cristalli si vede il campo dei grani (grani.js), che
  // vuole cinque numeri soli (la forma chiusa di Avrami: rocce.js cristallizzaChiusa, meno di un millisecondo); la simulazione
  // cella per cella (1,6–3 s sul filo principale) si fa solo se qualcuno chiede l'immagine (out.cv, più sotto)
  const faiTela = () => { const rr = r.chiusa ? cristallizza({ raffreddamento: r.raffreddamento, minerali: r.minerali, seme: r.seme }) : r, px = immagineRoccia(rr), N = rr.N || Math.round(Math.sqrt(px.length / 4));
    // (il cristallo di neve sta SOPRA la neve: dove non c'è ghiaccio la sua immagine è trasparente, non cielo)
    if (neve) for (let q = 0; q < N * N; q++) px[4 * q + 3] = Math.round(255 * Math.min(1, 1.5 * rr.copertura[q]));
    const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(N, N) : Object.assign(document.createElement('canvas'), { width: N, height: N }); c.getContext('2d').putImageData(new ImageData(px, N, N), 0, 0); return c; };
  const N = r.N || 192; let tela = null;
  // LA ROCCIA ATTORNO (grani.js): l'immagine è un campione dell'aggregato; attorno continua lo stesso aggregato, con la
  // stessa legge e la taglia dei grani che questa simulazione ha dato (in celle × la larghezza della cella)
  const cellaM = larghezzaM / N; let specCampo;
  if (neve) { const D0 = Math.max(2 * (r.raggio || N / 4) * cellaM, cellaM), g = granoGhiaccio(T, 1, D0); specCampo = { modo: 'tassellatura', granoM: g.D, minerali: [{ nome: "ghiaccio d'acqua", frazione: 1, colore: [212, 228, 244], anisotropia: 0 }], legge: `neve: grani di ${fmtLunghezza(g.D)} (il cristallo che si posa, ${fmtLunghezza(D0)}, cresciuto un anno con la legge di Gow: K = ${(g.K * 1e6).toExponential(1)} mm²/anno a ${Math.round(T - 273.15)} °C)` }; }
  else if (r.tipo === 'sedimento') { const n = [0, 0, 0]; for (const q of r.specie) n[q]++; const t = n[0] + n[1] + n[2] || 1; specCampo = { modo: 'impacchettamento', granoM: Math.max(cellaM, r.granaMedia * cellaM), selezione: r.selezione, minerali: [[206, 198, 182], [210, 166, 142], [96, 90, 86]].map((colore, k) => ({ nome: ['quarzo', 'feldspato', 'frammenti di roccia'][k], frazione: n[k] / t, colore })), legge: `granelli di ${fmtLunghezza(r.granaMedia * cellaM)} (selezione ${r.selezione.toFixed(2)} φ), alla rinfusa` }; }
  else if (r.tipo === 'cristalli' && r.nGrani > 0) specCampo = { modo: 'tassellatura', granoM: Math.max(cellaM, r.granoMedio * cellaM), cristallino: r.cristallino, minerali: r.minerali, polarizzata: true, legge: `cristalli di ${fmtLunghezza(r.granoMedio * cellaM)} (Johnson-Mehl)${r.vetro > 0.01 ? `, ${Math.round(100 * r.vetro)}% vetro` : ''}` };
  // IL LUOGO PER LE PARTICELLE (materia.js): i minerali veri di quel punto, la sua temperatura, la quota, l'età della sua
  // roccia (i continenti hanno l'età del pianeta; il fondo degli oceani quella della sua crosta, dalla tettonica; sotto un
  // coperchio con vulcani la lava rifà la superficie ogni 1,1 miliardi di anni: le stesse regole di geologia.js)
  const etaRoccia = neve ? null : sale ? Math.max(1e3, sale.lago?.etaAnni ?? 1e4) : continente ? etaP : t.etaCrosta ? Math.max(1e4, 1e6 * t.etaCrosta[c]) : S.P.interno?.vulcani > 0 ? Math.min(etaP, 1e9 / 0.9) : etaP;
  const base = { lat: 90 - v * 180, lon: u * 360 - 180, T, quotaM: Math.max(0, t.alt[c] - (isFinite(t.mare) ? t.mare : t.alt[c])), raggi: cieloDi(cam.via) };
  let luogo;
  if (neve) luogo = luogoDaRoccia({ S, ghiaccio: true, ...base });
  else if (sale) { luogo = luogoDaRoccia({ S, continente: false, minerali: [{ nome: 'salgemma', frazione: 0.85 }, { nome: 'gesso', frazione: 0.15 }], etaRoccia, elementi: { K: 0, U: 0, Th: 0, Rb: 0 }, ...base }); luogo.accessori = []; luogo.nome = 'crosta di sale'; }
  else luogo = luogoDaRoccia({ S, continente, etaRoccia, ...base });
  const memoria = memoriaDelLuogo(luogo, sorgente(luogo.indirizzo, ramiCosmo(cam.via.cosmo)));
  // quale minerale sta in un punto dell'immagine (per scendere dentro QUEL cristallo)
  // IL GRANO DEL PUNTO. Per la roccia (cristalli, granelli) ciò che si vede è il campo dei grani (grani.js), con la stessa
  // legge della simulazione e la sua taglia, che continua in ogni direzione e resta nitido a ogni ingrandimento: il
  // campione del punto è il grano che sta lì, e si scende dentro il suo minerale. Il cristallo di neve invece è un oggetto
  // posato sopra la neve: resta la sua immagine, sopra i grani.
  const campo = specCampo ? campoGrani(specCampo, sorgente(luogo.indirizzo, ramiCosmo(cam.via.cosmo))) : null, alPosto = !!campo && !neve;
  if (alPosto) { const x = campo.granoIn(larghezzaM / 2, larghezzaM / 2); if (x) nome = `${nome}: il grano del punto è ${x.minerale}`; }
  const mineraleIn = alPosto ? (x, y) => campo.granoIn(x * larghezzaM, y * larghezzaM)?.minerale ?? null : (x, y) => { if (r.tipo !== 'cristalli') return null; const m = r.minerale[Math.max(0, Math.min(N - 1, Math.floor(y * N))) * N + Math.max(0, Math.min(N - 1, Math.floor(x * N)))]; return m === 255 ? null : r.minerali[m]?.nome ?? null; };
  const sotto = memoria.tipo === 'alone' ? `un granello di ${memoria.granello} dentro la biotite, con il suo alone` : memoria.tipo === 'tracce' ? `le tracce di fissione in un granello di ${memoria.minerale}` : '';
  const out = { specCampo, campo, alPosto, get cv() { return (tela ||= faiTela()); }, nome, larghezzaM, frase: `${frase}. Avvicinati ancora: dentro c'è ${memoria.tipo ? `${sotto}, poi ` : ''}la stella che il cristallo disegna con le particelle, e i suoi atomi`, luogo, memoria, mineraleIn, neve, sale: !!sale };
  out.punto = { u, v, t }; rocceFatte.set(k, out); if (rocceFatte.size > 48) rocceFatte.delete(rocceFatte.keys().next().value);
  if (!(cam.passoRoccia > 0) && cam.latoSuolo !== null) { const w = suoloDelPunto(cam, S, out, k); if (w) return w; }
  return cam.passoRoccia > 0 ? passoRoccia(cam, S, out, k) : out;
}
// ---------- IL SUOLO DI UN PUNTO (suolo.js, PROGETTO.md lavoro 9): la finestra del suolo di lato «latoSuolo», calcolata con la
// legge di quella grana solo quando la si guarda, come campione della cella della mappa (il padre: la tessera più fine già
// calcolata in quel punto, dalla mappa o dalla vista 3D: suolo.js tesseraNota). A metri il rilievo fine, il suolo, la falda; nella finestra più piccola
// la riga dei granelli, dei pori, dell'acqua dei pori e della chimica che si muove lì (reazioni.js luogoDellaCrosta a quella
// profondità, con il pH e il carbonio di quell'acqua). → null dove non c'è suolo (l'acqua, la neve, il sale), o
// { cv, nome, larghezzaM, frase, suolo: true, fin, base, luogo, memoria }
export const LATI_SUOLO = [10, 1, 0.1, 0.01, 1e-3, 1e-4, 1e-5];
function suoloDelPunto(cam, S, base, k) {
  if (base.neve || base.sale || base.acqua) return null; const lato = cam.latoSuolo ?? LATI_SUOLO[0];
  // (il punto è quello della camera, non quello di «base»: base si ricorda per u e v a sette cifre — fino a qualche metro sul
  // pianeta —, e la finestra del suolo, di centimetri, si apriva attorno al punto di chi l'aveva chiesta per primo. Il 3D e il
  // livello 5 nello stesso punto avevano così padri diversi quando il punto di prima stava sul confine di due celle — il
  // centro di una cella del padre è il confine di quattro celle della tessera sotto —; per lo stesso motivo la finestra si
  // ricorda col punto intero)
  const u = ((cam.roccia.cx % 1) + 1) % 1, v = Math.max(0, Math.min(0.9999, cam.roccia.cy * 2)); k = `${k}|${u}|${v}`;
  // (il padre: la tessera più fine già calcolata lì, dalla mappa o dalla vista 3D — suolo.js tesseraNota —: la stessa cella e
  // lo stesso indirizzo della finestra che il 3D mostra a pochi metri dal suolo)
  const t3 = tesseraNota(S.k, u, v), t = t3 && !(base.punto.t?.livello >= t3.livello) ? t3 : base.punto.t, ks = `${k}|suolo|${lato}|${t?.livello ?? 0}`; let w = rocceFatte.get(ks);
  if (w !== undefined) { if (w?.attesa) suoloInSecondoPiano(cam, S, w, ks); return w; } w = null;
  try {
    // (lo stesso S per tutte le finestre del pianeta: trattoSuolo tiene il padre della cella per S, e con un S nuovo a ogni
    // finestra il padre — ~0,5 s — si rifaceva a ogni lato)
    const t0 = performance.now(), Ssu = suoloDi(S), fin = finestraSuolo(Ssu, { lon: u * 360 - 180, lat: 90 - v * 180, uv: [u, v], latoM: lato, livello: t?.livello ?? 0, tessera: t?.livello ? t : null });
    if (fin && !fin.acqua && conFili()) {
      // con i fili: la finestra c'è subito (fin: il rilievo e i granelli si calcolano solo se servono), l'immagine e la chimica dei
      // pori le fa finestre.worker.js; intanto si vede il padre (la finestra del suolo dieci volte più grande, il suo centro)
      const i = LATI_SUOLO.indexOf(lato), sopra = i > 0 ? rocceFatte.get(`${k}|suolo|${LATI_SUOLO[i - 1]}|${t?.livello ?? 0}`) : null;
      w = { cv: segnaposto(sopra, [128, 112, 92]), nome: `il suolo (una finestra larga ${fmtLunghezza(fin.L)})`, larghezzaM: fin.L, frase: `${fin.descrizione} (l'immagine si sta calcolando: intanto il livello di sopra…)`, fraseBase: fin.descrizione, liscio: false, suolo: true, fin, base, luogo: base.luogo, memoria: base.memoria, mineraleIn: base.mineraleIn, attesa: true,
        richiesta: { tipo: 'suolo', id: ks, k: S.k, lon: u * 360 - 180, lat: 90 - v * 180, uv: [u, v], lato, livello: t?.livello ?? 0, tessera: t?.livello ? t : null, chimica: lato === LATI_SUOLO[LATI_SUOLO.length - 1] } };
      rocceFatte.set(ks, w); if (rocceFatte.size > 48) rocceFatte.delete(rocceFatte.keys().next().value); suoloInSecondoPiano(cam, S, w, ks); return w;
    }
    if (fin && !fin.acqua) {
      const px = immagineSuolo(fin), N = fin.N, cv = telaN(N); cv.getContext('2d').putImageData(new ImageData(px, N, N), 0, 0);
      let frase = fin.descrizione;
      if (lato === LATI_SUOLO[LATI_SUOLO.length - 1]) { try { // la chimica dei pori a quella profondità: il luogo della crosta col padre del suolo
        const t1 = performance.now(), A = fin.acquaPori, Sis = sistema(cam.via.cosmo, cam.via.galassia, cam.via.stella), L = luogoDellaCrosta(S.P, { profonditaM: fin.profonditaM, latoM: 1e-6, stella: Sis.stella, colonna: fin.padre.colonna, mare: { carbonio: A.neutri['CO2(aq)'] + A.ioni['HCO3-'] + A.ioni['CO3(2-)'], pH: A.pH } });
        if (L) { const Sc = sistemaChimico(L, { profondita: 3, atomiMassimi: 4 }), st = storiaChimica(Sc, { V: L.V, tempo: Math.min(3.156e9, Math.max(1, L.padre.residenzaAnni * 3.156e7)), massimo: 2e4, flussi: L.flussi, adatta: true }), ri = rileva(Sc, st, { tempoCicli: 200 });
          frase += ` La chimica dei pori lì (1 µm, ${Math.round(fin.profonditaM * 100)} cm sotto, ${Math.round(L.T - 273.15)} °C): H₂ ${L.padre.H2.toExponential(1)} mol/L dalla roccia, ${Sc.chiavi.length} specie possibili, ${st.eventi} reazioni in ${(st.t / 3.156e7).toPrecision(2)} anni, ${ri.emerso.raf ? 'un RAF' : 'nessun RAF'} (calcolata in ${Math.round(performance.now() - t1)} ms).`; } } catch (err) { console.warn(err); } }
      frase += ` (la finestra calcolata in ${Math.round(performance.now() - t0)} ms)`;
      w = { cv, nome: `il suolo (una finestra larga ${fmtLunghezza(fin.L)})`, larghezzaM: fin.L, frase, liscio: true /* (ingrandita, levigata: senza, i punti a blocchi davano barre attorno al millimetro) */, suolo: true, fin, base, luogo: base.luogo, memoria: base.memoria, mineraleIn: base.mineraleIn };
    }
  } catch (err) { console.warn('il suolo non si è potuto calcolare:', err); w = null; }
  rocceFatte.set(ks, w); if (rocceFatte.size > 48) rocceFatte.delete(rocceFatte.keys().next().value); return w;
}
const suoli = new WeakMap(), suoloDi = (S) => { let x = suoli.get(S); if (!x) { x = { k: S.k, P: S.P, se: S.se, cl: S.cl, seme: S.seme }; suoli.set(S, x); } return x; };
function suoloInSecondoPiano(cam, S, w, ks) {
  if (w.sfuma) componi(w); if (w.pronto) { w.attesa = !!w.sfuma; return; }
  chiediF(S, ks, w.richiesta, cam.prepara ? 2 + (cam.prepara - 1) : cam.secondaria ? 1 : 0, w);
}
// ---------- LA SCALA DENTRO LA ROCCIA: quali livelli ci sono in quel punto, dal più grande al più piccolo, e quanto è grande
// ognuno (in metri). Il passo della memoria c'è solo dove qualcosa tiene memoria.
export function sequenzaRoccia(cam) { const b = rocciaDi({ ...cam, passoRoccia: 0, latoSuolo: null }); return b?.acqua ? [0] : b?.memoria?.tipo ? [0, 1, 2, 4, 3] : [0, 2, 4, 3]; }
// i livelli della roccia sotto l'ultima finestra del suolo: quelli più piccoli di lei (la lamina, il reticolo, gli atomi)
export function sottoIlSuolo(cam) { const Ls = LATI_SUOLO[LATI_SUOLO.length - 1]; return sequenzaRoccia(cam).filter((p) => p > 1 && (latoPasso(cam, p) || Infinity) < Ls); }
export const latoPasso = (cam, p) => rocciaDi({ ...cam, passoRoccia: p, latoSuolo: null })?.larghezzaM || null;
// un'immagine quadrata (N×N) messa sullo schermo in o + x·zz (x da 0 a 1): se ne disegna solo il pezzo che si vede, tagliato
// sui suoi pixel (così anche ingrandita un milione di volte resta giusta, e i pixel restano dove sono)
function pezzo(ctx, cv, ox, oy, zz, W, H, liscio) {
  const N = cv.width, k = zz / N, x0 = Math.max(0, Math.floor(-ox / k)), y0 = Math.max(0, Math.floor(-oy / k)), x1 = Math.min(N, Math.ceil((W - ox) / k)), y1 = Math.min(N, Math.ceil((H - oy) / k));
  if (x1 <= x0 || y1 <= y0) return; ctx.imageSmoothingEnabled = !!liscio; ctx.drawImage(cv, x0, y0, x1 - x0, y1 - y0, ox + x0 * k, oy + y0 * k, (x1 - x0) * k, (y1 - y0) * k); ctx.imageSmoothingEnabled = true;
}
// LA ROCCIA A TUTTE LE SUE SCALE: il livello in cui si conta, i livelli sopra (dietro, ingranditi: ciò che c'è attorno) e il
// livello sotto alla sua grandezza vera, nel punto che si guarda (prima un quadratino col bordo, poi l'immagine che compare)
function disegnaRoccia(ctx, W, H, cam, dpr) {
  const r0 = rocciaDi(cam); if (!r0) return;
  // L'ACQUA È PIENA: il campione continua oltre i suoi lati con le condizioni periodiche (come nelle simulazioni di un
  // liquido: ciò che esce da un lato rientra dall'altro); il campione del punto è quello al centro
  // (il campione è una sezione verticale che prende la superficie: si ripete solo di lato; sopra continua l'aria della sua
  // prima riga, sotto l'acqua della sua ultima)
  // (l'acqua si guarda dall'alto: la finestra dieci volte più grande sta sotto e riempie lo schermo, quella di adesso e quella
  // dieci volte più piccola ci si fondono sopra, ognuna secondo la sua grandezza a schermo: disegnaFinestre)
  const m = minimo(W, H), Ls = LATI_SUOLO[LATI_SUOLO.length - 1];
  if (cam.suAcqua) {
    cam.nebbiaGrani = null; const zz = cam.z; if (!(zz > 2)) return;
    if (r0.evento) { pezzo(ctx, r0.cv, W / 2 - cam.cx * zz, H / 2 - cam.cy * zz, zz, W, H, r0.liscio); return; }
    const F = finestreDelPunto(cam), px = W / 2 + (0.5 - cam.cx) * zz, py = H / 2 + (0.5 - cam.cy) * zz, pxm = zz / r0.larghezzaM; if (F) disegnaFinestre(ctx, { W, H, px, py, pxm, m, finestre: F });
    // le molecole che escono dall'acqua (tesseraNano): dal micron in giù, secondo quanto è grande una molecola sullo schermo
    if ((cam.latoAcqua ?? 1) <= 1.0001e-6) molecoleInPiano(ctx, cam, r0, px, py, pxm, W, H);
    return;
  }
  if (r0.suolo) { // (il suolo: le finestre una dentro l'altra; nell'ultima, nel punto guardato, il primo livello della roccia sotto, alla sua grandezza)
    cam.nebbiaGrani = null; const ox = W / 2 - cam.cx * cam.z, oy = H / 2 - cam.cy * cam.z, F = finestreDelPunto(cam);
    if (F) disegnaFinestre(ctx, { W, H, px: ox + cam.z / 2, py: oy + cam.z / 2, pxm: cam.z / r0.larghezzaM, m, finestre: F }); else pezzo(ctx, r0.cv, ox, oy, cam.z, W, H, r0.liscio);
    const c = Math.abs(r0.larghezzaM / Ls - 1) < 1e-9 && cam.ancoraSuolo ? sottoIlSuolo(cam)[0] : null, Lc = c != null ? latoPasso(cam, c) : null; if (!Lc) return;
    const zz = (cam.z * Lc) / r0.larghezzaM, a = Math.max(0, Math.min(1, Math.log(zz / (0.02 * m)) / Math.log(5))); if (!(zz >= 3 * dpr) || !(a > 0)) return;
    const r = rocciaDi({ ...cam, passoRoccia: c, latoSuolo: null }); if (!r) return; const cx = ox + cam.ancoraSuolo[0] * cam.z, cy = oy + cam.ancoraSuolo[1] * cam.z;
    ctx.globalAlpha = a; if (r.passo === 3 || r.passo === 4) periodico(ctx, r.cv, cx - zz / 2, cy - zz / 2, zz, W, H, r.liscio); else pezzo(ctx, r.cv, cx - zz / 2, cy - zz / 2, zz, W, H, r.liscio); ctx.globalAlpha = 1; return;
  }
  const seq = sequenzaRoccia(cam), i = Math.max(0, seq.indexOf(cam.passoRoccia ?? 0)), lato = (p) => latoPasso(cam, p), img = (p) => rocciaDi({ ...cam, passoRoccia: p, latoSuolo: null });
  // (entrati dal suolo: i livelli cominciano da quello in cui si è entrati, e sopra c'è la finestra del suolo di 10 µm)
  const k0 = cam.dalSuolo != null ? Math.max(0, Math.min(i, seq.indexOf(cam.dalSuolo))) : 0;
  const pos = []; pos[i] = { ox: W / 2 - cam.cx * cam.z, oy: H / 2 - cam.cy * cam.z, zz: cam.z };
  for (let j = i - 1; j >= k0; j--) { const a = cam.ancore?.[seq[j]] || [0.5, 0.5], f = pos[j + 1], zz = (f.zz * lato(seq[j])) / lato(seq[j + 1]); pos[j] = { ox: f.ox + f.zz * 0.5 - zz * a[0], oy: f.oy + f.zz * 0.5 - zz * a[1], zz }; }
  const copre = (q) => q.ox <= 0 && q.oy <= 0 && q.ox + q.zz >= W && q.oy + q.zz >= H;
  let j0 = k0; for (let j = i; j >= k0; j--) if (copre(pos[j])) { j0 = j; break; }
  if (k0 > 0) { cam.nebbiaGrani = null; if (j0 === k0 && !copre(pos[k0])) { const s = rocciaDi({ ...cam, passoRoccia: 0, latoSuolo: Ls }), a = cam.ancoraSuolo || [0.5, 0.5], f = pos[k0], zz = (f.zz * Ls) / lato(seq[k0]); if (s?.suolo) pezzo(ctx, s.cv, f.ox + f.zz * 0.5 - zz * a[0], f.oy + f.zz * 0.5 - zz * a[1], zz, W, H, s.liscio); } }
  else {
  // attorno al campione, la roccia continua: i grani della stessa legge (grani.js), alla scala di adesso. Il campione del
  // punto (l'immagine di rocce.js) ci sta sopra, al centro, senza cornice
  const alPosto = !!img(0)?.alPosto;
  if (j0 === 0 && (alPosto || !copre(pos[0]))) { const g = campoDelPunto(cam); if (g) { try { cam.nebbiaGrani = g.campo.dipingi(ctx, { W, H, ox: pos[0].ox, oy: pos[0].oy, k: pos[0].zz / g.L0 }); } catch (err) { console.warn(err); } } }
  else cam.nebbiaGrani = null; }
  for (let j = j0; j <= i; j++) { const r = img(seq[j]); if (!r || (seq[j] === 0 && alPosto)) continue; if (r.passo === 3 || r.passo === 4) periodico(ctx, r.cv, pos[j].ox, pos[j].oy, pos[j].zz, W, H, r.liscio); else pezzo(ctx, r.cv, pos[j].ox, pos[j].oy, pos[j].zz, W, H, r.liscio); }
  const b = cam.ancore?.[seq[i]]; if (i + 1 >= seq.length || !b) return;
  const Lc = lato(seq[i + 1]), zz = (cam.z * Lc) / lato(seq[i]); if (!(zz >= 3 * dpr)) return;
  const cx = pos[i].ox + b[0] * pos[i].zz, cy = pos[i].oy + b[1] * pos[i].zz, a = Math.max(0, Math.min(1, Math.log(zz / (0.02 * m)) / Math.log(5)));
  // (il reticolo non è un oggetto: è il cristallo stesso, dappertutto. Quando compare, compare su tutto lo schermo, con le
  // condizioni periodiche, e la sua copia del punto sta al centro)
  if (a > 0) { const r = img(seq[i + 1]); if (r) { ctx.globalAlpha = a; if (r.passo === 3 || r.passo === 4) periodico(ctx, r.cv, cx - zz / 2, cy - zz / 2, zz, W, H, r.liscio); else pezzo(ctx, r.cv, cx - zz / 2, cy - zz / 2, zz, W, H, r.liscio); ctx.globalAlpha = 1; } }
}
// un campione che si ripete oltre i suoi lati (condizioni periodiche): si disegnano solo le copie che toccano lo schermo.
// (ox, oy, zz): il quadrato di lato zz in cui sta il campione; la tessera (cv.width × cv.height pixel, alta zz·altezza/larghezza)
// ha il centro nel centro del quadrato, e ogni fila è spostata sulla precedente di cv.scarto (in frazioni della larghezza):
// materia.js atomi, la tessera del reticolo
function periodico(ctx, cv, ox, oy, zz, W, H, liscio) {
  if (!(zz > 0.5)) return; const zh = (zz * cv.height) / cv.width, sf = (cv.scarto || 0) * zz, X0 = ox, Y0 = oy + zz / 2 - zh / 2;
  const j0 = Math.floor(-Y0 / zh), j1 = Math.floor((H - Y0) / zh), file = j1 - j0 + 1, perFila = Math.ceil(W / zz) + 1;
  ctx.imageSmoothingEnabled = !!liscio;
  if (file * perFila > 64 && typeof DOMMatrix !== 'undefined') { // (tante copie: un motivo solo, che si ripete, fila per fila; sotto i due pixel la fila è il motivo)
    const m = ctx.createPattern(cv, 'repeat'); ctx.fillStyle = m;
    if (zh < 2 || file > 400) { m.setTransform(new DOMMatrix([zz / cv.width, 0, 0, zh / cv.height, X0, Y0])); ctx.fillRect(0, 0, W, H); }
    else for (let j = j0; j <= j1; j++) { const y = Y0 + j * zh; m.setTransform(new DOMMatrix([zz / cv.width, 0, 0, zh / cv.height, X0 + j * sf, y])); ctx.fillRect(0, Math.max(0, y), W, Math.min(H, y + zh) - Math.max(0, y)); }
    ctx.imageSmoothingEnabled = true; return;
  }
  for (let j = j0; j <= j1; j++) { const xr = X0 + j * sf, i0 = Math.floor(-xr / zz), i1 = Math.floor((W - xr) / zz); for (let i = i0; i <= i1; i++) ctx.drawImage(cv, xr + i * zz, Y0 + j * zh, zz, zh); }
  ctx.imageSmoothingEnabled = true;
}
// ---------- LE FINESTRE UNA DENTRO L'ALTRA (l'acqua e il suolo, di dieci in dieci): ogni finestra si fonde con quella sopra.
// Quanto si vede una finestra lo dice solo la sua grandezza a schermo (non il tempo, non quale finestra è «quella di adesso»):
// così avvicinandosi e allontanandosi si passa per gli stessi stati, e il cambio di finestra nello zoom non si vede.
// LA FINESTRA DI FONDO (e ognuna del suolo) RIEMPIE LO SCHERMO: il campione si ripete oltre i suoi lati (condizioni periodiche, come nella scena
// degli atomi), ma senza cuciture — le copie si sovrappongono per una fascia di un quinto del lato in cui l'una sfuma nell'altra con
// pesi che sommano a uno (smoothstep(u) + smoothstep(1 − u) = 1, sommati in luce: 'lighter'), così non c'è né un bordo né una
// riga dove si vede quella sotto. A MANO (dichiarate): la finestra compare tra 0,3 e 0,9 volte il lato corto dello schermo
// (0,9 è la grandezza a cui lo zoom passa alla finestra dieci volte più piccola, così in quel momento è già piena); la fascia
// in cui le copie sfumano l'una nell'altra è un quinto del lato.
const FINESTRA_COMPARE = [0.3, 0.9], BORDO_SFUMATO = 0.2;
export const alfaFinestra = (s, m) => Math.max(0, Math.min(1, Math.log(s / (FINESTRA_COMPARE[0] * m)) / Math.log(FINESTRA_COMPARE[1] / FINESTRA_COMPARE[0])));
// (la fascia in pixel dell'immagine, intera: così le copie sono spostate di un numero intero di pixel e i pesi, letti nei
// centri dei pixel, sommano a uno esattamente)
const fasciaDi = (N) => Math.max(1, Math.round(BORDO_SFUMATO * N));
const maschere = new Map();
function mascheraBordo(N) {
  let c = maschere.get(N); if (c) return c; c = telaN(N); const px = new Uint8ClampedArray(4 * N * N), R = fasciaDi(N), liscio = (x) => { const t = Math.max(0, Math.min(1, x / R)); return t * t * (3 - 2 * t); };
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const q = 4 * (j * N + i); px[q] = px[q + 1] = px[q + 2] = 255; px[q + 3] = Math.round(255 * liscio(Math.min(i + 0.5, N - i - 0.5)) * liscio(Math.min(j + 0.5, N - j - 0.5))); }
  c.getContext('2d').putImageData(new ImageData(px, N, N), 0, 0); maschere.set(N, c); return c;
}
// la copia sfumata dell'immagine di una finestra (rifatta solo quando l'immagine cambia: l'acqua si ridisegna col tempo)
function sfumata(r, senza = false) {
  const cv = senza ? r.scintille.cv : r.cv, chi = senza ? 'sfumataSenza' : 'sfumata', N = cv.width, quando = `${r.ultimo ?? 0}|${r.versione ?? 0}`; if (r[chi] && r[chi].width === N && r[chi + 'Di'] === quando) return r[chi];
  const s = r[chi] && r[chi].width === N ? r[chi] : telaN(N), x = s.getContext('2d');
  x.globalCompositeOperation = 'copy'; x.drawImage(cv, 0, 0); x.globalCompositeOperation = 'destination-in'; x.drawImage(mascheraBordo(N), 0, 0); x.globalCompositeOperation = 'source-over';
  r[chi] = s; r[chi + 'Di'] = quando; return s;
}
// il mosaico senza cuciture di una finestra larga s pixel, con la copia del punto centrata in (px, py), su una tela grande
// quanto lo schermo (riusata)
// (oltre 900 copie la finestra è larga pochi pixel: il motivo semplice che si ripete, senza la sfumatura, la cui cucitura
// è più piccola di un pixel; prima la tela restava vuota)
let telaMosaico = null;
const copieMosaico = (N, s, px, py, W, H) => { const P = (s * (N - fasciaDi(N))) / N, i0 = Math.floor((-px - s / 2) / P), i1 = Math.ceil((W - px + s / 2) / P), j0 = Math.floor((-py - s / 2) / P), j1 = Math.ceil((H - py + s / 2) / P); return { P, i0, i1, j0, j1, n: (i1 - i0 + 1) * (j1 - j0 + 1) }; };
function mosaico(r, s, px, py, W, H, senza = false) {
  if (!telaMosaico || telaMosaico.width !== W || telaMosaico.height !== H) telaMosaico = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(W, H) : Object.assign(document.createElement('canvas'), { width: W, height: H });
  const x = telaMosaico.getContext('2d'), cv = senza ? r.scintille.cv : r.cv, N = cv.width, { P, i0, i1, j0, j1, n } = copieMosaico(N, s, px, py, W, H);
  x.globalCompositeOperation = 'copy'; x.clearRect(0, 0, W, H);
  if (n > 900 && typeof DOMMatrix !== 'undefined') { const m = x.createPattern(cv, 'repeat'); m.setTransform(new DOMMatrix([P / N, 0, 0, P / N, px - s / 2, py - s / 2])); x.globalCompositeOperation = 'source-over'; x.fillStyle = m; x.fillRect(0, 0, W, H); return telaMosaico; }
  const img = sfumata(r, senza); x.globalCompositeOperation = 'lighter';
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) pezzo(x, img, px + i * P - s / 2, py + j * P - s / 2, s, W, H, r.liscio);
  x.globalCompositeOperation = 'source-over'; return telaMosaico;
}
// ---------- LE SCINTILLE (finestra.js, fin.scintille): il riflesso della stella in un punto della finestra è la media dei punti
// speculari delle onde più piccole del punto; se ne conoscono la luce (il lampo) e quanti sono per m² (Longuet-Higgins 1960).
// DISCRETO SOPRA IL PIXEL, CONTINUO SOTTO (eredita.js, pesoDiscreto): quando la distanza tra i punti speculari (1/√n) è più
// grande del pixel la luce del lampo si vede come punti staccati, ognuno con la sua parte (lampo/(n·area del pixel)); quando è
// più piccola, come la media (l'immagine col lampo); attorno alla soglia, su un'ottava, i due pesi sommano a uno. I punti hanno
// l'indirizzo del punto della finestra, della copia e dell'immagine (cambiano quando il mare si muove).
function conScintille(sc, versione) {
  if (!sc || !sc.senza) return null; const N = sc.N, cv = telaN(N); cv.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(sc.senza.buffer, sc.senza.byteOffset, N * N * 4), N, N), 0, 0);
  let nMax = 0; for (let o = 0; o < N * N; o++) if (sc.dens[o] > nMax && sc.lampi[o] > 0) nMax = sc.dens[o];
  return { cv, lampi: sc.lampi, dens: sc.dens, esposizione: sc.esposizione, N, L: sc.L, nMax, versione };
}
const pesoMedia = (sc, s) => (sc && sc.nMax > 0 ? 1 - pesoDiscreto(1 / Math.sqrt(sc.nMax) / (sc.L / s)) : 1); // (eredita.js: la distanza tra le scintille contro il pixel)
let telaScintille = null, pxScintille = null;
const hashS = (a, b, c, d) => { let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x7f4a7c15, 0xc2b2ae35) ^ Math.imul(c + 0x165667b1, 0x27d4eb2f) ^ Math.imul(d, 0x61c88647); return () => { h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); h = Math.imul(h ^ (h >>> 12), 0x297a2d39); h ^= h >>> 15; return (h >>> 0) / 4294967296; }; };
function scintille(ctx, r, s, px, py, W, H, copie, peso) {
  const sc = r.scintille, N = sc.N, h = sc.L / N, Apx = (sc.L / s) ** 2, k = s / N, f = fasciaDi(N), maschera = !copie;
  if (!telaScintille || telaScintille.width !== W || telaScintille.height !== H) { telaScintille = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(W, H) : Object.assign(document.createElement('canvas'), { width: W, height: H }); pxScintille = new ImageData(W, H); }
  const d = pxScintille.data; d.fill(0); let tot = 0; const TETTO = 60000, liscio = (x) => { const t = Math.max(0, Math.min(1, x / f)); return t * t * (3 - 2 * t); };
  const C = copie || { P: s, i0: 0, i1: 0, j0: 0, j1: 0 };
  for (let cj = C.j0; cj <= C.j1 && tot < TETTO; cj++) for (let ci = C.i0; ci <= C.i1 && tot < TETTO; ci++) {
    const X0 = px + ci * C.P - s / 2, Y0 = py + cj * C.P - s / 2, a0 = Math.max(copie ? Math.floor(f / 2) : 0, Math.floor(-X0 / k)), a1 = Math.min(copie ? N - Math.ceil(f / 2) : N, Math.ceil((W - X0) / k)), b0 = Math.max(copie ? Math.floor(f / 2) : 0, Math.floor(-Y0 / k)), b1 = Math.min(copie ? N - Math.ceil(f / 2) : N, Math.ceil((H - Y0) / k));
    for (let j = b0; j < b1; j++) for (let i = a0; i < a1; i++) { const o = j * N + i, n = sc.dens[o], g = sc.lampi[o]; if (!(n > 0 && g > 0)) continue;
      const w = peso * (maschera ? liscio(Math.min(i + 0.5, N - i - 0.5)) * liscio(Math.min(j + 0.5, N - j - 0.5)) : 1), mu = n * h * h * w; if (!(mu > 1e-4)) continue;
      const R = hashS(o, ci, cj, sc.versione | 0); let q = 0; for (let L = Math.exp(-Math.min(mu, 50)), p = R(); p > L && q < 64; q++) p *= R(); if (mu > 50) q = Math.round(mu); // (Poisson)
      const v = g / (n * Apx);
      for (let t = 0; t < q; t++) { const x = (X0 + (i + R()) * k) | 0, y = (Y0 + (j + R()) * k) | 0; if (x < 0 || y < 0 || x >= W || y >= H) continue; const z = 4 * (y * W + x);
        for (let c = 0; c < 3; c++) d[z + c] = Math.min(255, d[z + c] + 255 * Math.pow(Math.min(1, v * sc.esposizione[c]), 1 / 2.2)); d[z + 3] = 255; tot++; } }
  }
  telaScintille.getContext('2d').putImageData(pxScintille, 0, 0); ctx.drawImage(telaScintille, 0, 0);
}
// le finestre [{ L (metri), r (rocciaDi) }], dalla più grande, centrate nel punto (px, py) dello schermo, a pxm pixel per metro.
// fondo: la più grande sta sotto a tutto, piena; se no anche lei si fonde secondo la sua grandezza (sopra il 3D).
// peso: quanto pesano tutte insieme (nello spazio: quanto lo sguardo è verso il basso)
export function disegnaFinestre(ctx, { W, H, px, py, pxm, m, finestre, fondo = true, peso = 1 }) {
  finestre.forEach((f, q) => {
    const s = f.L * pxm, a = q === 0 && fondo ? 1 : alfaFinestra(s, m) * peso; if (!(a > 0) || !(s > 2)) return; const r = f.r; if (!r?.cv) return;
    // (si ripetono la finestra che fa da fondo e quelle del suolo; quelle dell'acqua stanno una volta sola nel punto, sfumate:
    // ripetute mostrerebbero a righe ciò che dentro la finestra cambia da un lato all'altro, il riflesso della stella)
    // (le scintille solo quando un punto della finestra è almeno un pixel dello schermo: più piccolo, il lampo resta la media del
    // punto della finestra — una semplificazione dichiarata: lì i punti speculari stanno sotto il pixel della finestra e, se radi,
    // sarebbero ancora punti staccati, ma contarli punto per punto costerebbe una passata su tutta la finestra a ogni immagine)
    const tutto = (q === 0 && fondo) || r.suolo, copie = tutto && r.scintille ? copieMosaico(r.scintille.N, s, px, py, W, H) : null, w = r.scintille && s >= r.scintille.N && !(copie && copie.n > 900) ? pesoMedia(r.scintille, s) : 1, disegna = (senza, al) => { ctx.globalAlpha = al; if (tutto) ctx.drawImage(mosaico(r, s, px, py, W, H, senza), 0, 0); else pezzo(ctx, sfumata(r, senza), px - s / 2, py - s / 2, s, W, H, r.liscio); };
    // (più vicino delle scintille: l'immagine senza lampo, e il lampo in punti; più lontano: l'immagine col lampo, la media)
    if (w < 1) { disegna(true, a); if (w > 0) disegna(false, a * w); ctx.globalAlpha = 1; scintille(ctx, r, s, px, py, W, H, copie, a * (1 - w)); }
    else disegna(false, a);
    ctx.globalAlpha = 1;
  });
}
// I GRANI ATTORNO AL PUNTO (grani.js): l'aggregato di cui il campione è un pezzo, con lo zero nell'angolo del campione e
// i metri come unità. → { campo, L0 } o null (nell'acqua: niente grani)
export function campoDelPunto(cam) {
  const b = rocciaDi({ ...cam, passoRoccia: 0 }); if (!b || b.acqua || !b.campo) return null;
  return { campo: b.campo, L0: b.larghezzaM, legge: b.specCampo.legge };
}
// LE TRACCE DI TUTTI GLI EVENTI che la materia di quel punto ricorda (o che accadono adesso), nel minerale in cui si
// guarda (grani.js, popolazioneTracce). → la popolazione o null
const popolazioni = new Map();
export function popolazioneDelPunto(cam) {
  const mt = materiaDelPunto(cam); if (!mt) return null; const r = rocciaDi(cam), b = r?.base || r;
  const minerale = mt.luogo.tipo === 'roccia' ? (r?.passo === 1 ? b.memoria?.minerale : null) || cam.mineraleRoccia || b?.mineraleIn?.(0.5, 0.5) || r?.minerale || null : null;
  const k = `${mt.luogo.indirizzo}|${minerale}`; if (popolazioni.has(k)) return popolazioni.get(k);
  let P = null; try { P = popolazioneTracce(mt.luogo, { minerale }, sorgente(mt.luogo.indirizzo, ramiCosmo(cam.via.cosmo))); } catch (err) { console.warn(err); }
  popolazioni.set(k, P); if (popolazioni.size > 8) popolazioni.delete(popolazioni.keys().next().value); return P;
}
// LA FINESTRA DELLE PARTICELLE AL SUO POSTO NELLA SCALA (INTRECCIO.md, regola 10: una finestra è un luogo e una scala): la
// cella di quel punto (la stessa in cui si entra con un clic) e le sue tracce, disegnate su fondo trasparente, larghe
// latoM. Chi guarda la sovrappone a ciò che c'è a quella scala quando la attraversa. Pigra: la cella si costruisce quando
// la si chiede, le tracce si simulano solo con { tracce: true } (cioè quando la scala è vicina). → null o { latoM, cv?, che, nome, materia }
const finestreFatte = new Map();
export function finestraDelPunto(cam, { tracce = false } = {}) {
  const mt = materiaDelPunto(cam); if (!mt) return null;
  const k = JSON.stringify([mt.luogo.indirizzo, mt.opzioni, cam.via]); let f = finestreFatte.get(k);
  if (f === undefined) {
    let r = null; try { r = cellaMateria(mt.luogo, { ...(mt.opzioni.modo === 'memoria' ? { massimo: 110 } : {}), ...mt.opzioni, via: { ...cam.via } }, sorgente(mt.luogo.indirizzo, ramiCosmo(cam.via.cosmo))); } catch { r = null; }
    f = r && r.cella.sorgenti.length ? { latoM: r.cella.scala.latoM, che: mt.che, nome: r.nome, materia: mt, cella: r.cella, cv: null } : null;
    finestreFatte.set(k, f); if (finestreFatte.size > 12) finestreFatte.delete(finestreFatte.keys().next().value);
  }
  if (f && tracce && !f.cv) { const cv = telaN(512); disegnaTracce(cv, f.cella, simulaMondo(f.cella), { trasparente: true }); f.cv = cv; }
  return f;
}
// il cielo dei raggi cosmici di quella stella rispetto al Sole (materia.js: dal ritmo delle supernove della sua galassia)
const cieli = new Map();
function cieloDi(via) { const k = `${via.cosmo}|${via.galassia}`; if (!cieli.has(k)) { let c = { relativo: 1 }; try { c = cieloRelativo(galassia(via.cosmo, via.galassia)); } catch { /* resta quello del Sole */ } cieli.set(k, c); } return cieli.get(k); }
const telaN = (N) => (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(N, N) : Object.assign(document.createElement('canvas'), { width: N, height: N }));
const numero = (x, d = 2) => (Math.abs(x) >= 1e5 || (x !== 0 && Math.abs(x) < 0.01) ? fmtGrande(x) : x.toLocaleString('it-IT', { maximumSignificantDigits: d + 1 }));
// ---------- SOTTO LA ROCCIA (materia.js): il cristallo con ciò che ha registrato, i suoi atomi, la sua stella d'incanalamento.
// Ogni passo si calcola una volta e resta in memoria (l'incanalamento costa un decimo di secondo).
function passoRoccia(cam, S, base, k) {
  const L = base.luogo, mem = base.memoria, passo = cam.passoRoccia === 1 && !mem.tipo ? 2 : cam.passoRoccia;
  // il minerale in cui si scende: quello che si aveva sotto gli occhi, se la sua cella è nota; se no il più abbondante che lo sia
  const noto = (n) => n && RETICOLI[n], minerale = L.tipo === 'ghiaccio' ? 'ghiaccio d\'acqua' : noto(cam.mineraleRoccia) ? cam.mineraleRoccia : (L.minerali.find((m) => noto(m.nome)) || { nome: 'quarzo' }).nome;
  // (gli atomi di tre nanometri sono un pezzo del reticolo di trenta proprio dove li si guarda: il loro centro è l'ancora
  // dentro i trenta nanometri, in metri dall'origine del reticolo; gli atomi sono gli stessi, con la stessa istantanea)
  const L4 = passo === 3 ? latoPasso(cam, 4) : null, b4 = passo === 3 && L4 ? cam.ancore?.[4] : null, centroM = b4 ? [(b4[0] - 0.5) * L4, (b4[1] - 0.5) * L4] : null;
  const kk = `${k}|passo ${passo}|${passo === 1 ? mem.tipo : minerale}${centroM ? `|${centroM[0].toExponential(4)},${centroM[1].toExponential(4)}` : ''}`; if (rocceFatte.has(kk)) return rocceFatte.get(kk);
  const caso = sorgente(L.indirizzo, ramiCosmo(cam.via.cosmo)), il = (n) => (/^[aeiou]/.test(n) ? `l'${n}` : n === 'zircone' ? `lo ${n}` : ['biotite', 'calcite', 'monazite', 'olivina'].includes(n) ? `la ${n}` : `il ${n}`), del = (n) => il(n).replace(/^l'/, "dell'").replace(/^lo /, 'dello ').replace(/^la /, 'della ').replace(/^il /, 'del ');
  let px, N, nome, larghezzaM, frase, liscio = false, tessera = null;
  if (passo === 1 && mem.tipo === 'alone') {
    // l'alone: gli anelli escono dalle energie delle α della catena e dal loro percorso nella biotite
    const al = aloni(L, { ospite: mem.ospite, granello: mem.granello, raggioM: mem.raggioM, N: 192 }), cz = concentrazioni(L, mem.granello), forti = al.anelli.filter((a) => !a.debole), buio = Math.max(...al.profilo.oscuramento);
    px = al.immagine; N = al.N; larghezzaM = al.latoM; liscio = true; nome = `un alone nella biotite attorno a un granello di ${mem.granello}`;
    frase = `un granello di ${mem.granello} largo ${fmtLunghezza(2 * mem.raggioM)} dentro una lamella di biotite: concentra l'uranio (${numero(cz.U * 1e6)} ppm) e il torio (${numero(cz.Th * 1e6)} ppm) della roccia, e ogni particella α delle loro catene si ferma a una distanza fissa, dove annerisce la mica. Anelli a ${forti.map((a) => numero(a.raggioM * 1e6, 2)).join(', ')} µm dal centro (il più largo è ${del(forti[forti.length - 1]?.nuclidi[0] || 'polonio-214')}). Si accumula da ${fmtTempo(al.anni * 3.156e7)}: ${mem.perche}. In quel tempo il granello ha emesso ${fmtGrande(al.alfa)} α${buio > 0.95 ? ': il centro è saturo, restano i gradini più esterni' : buio < 0.08 ? ': troppo poche perché l\'alone si veda bene (ne servono ~10⁸)' : ''}`;
  } else if (passo === 1) {
    // le tracce di fissione sulla faccia di un granello: densità = età × uranio × costante di fissione × percorso
    const tf = tracceFossili(L, { minerale: mem.minerale, latoM: 200e-6, N: 256 }, caso), vecchia = tf.tracce.reduce((x, q) => Math.max(x, q.anniFa), 0);
    px = tf.immagine; N = tf.N; larghezzaM = tf.latoM; nome = `tracce di fissione ${/^[aeiou]/.test(mem.minerale) ? `nell'${mem.minerale}` : `nello ${mem.minerale}`}`;
    frase = `la faccia lucidata di un granello di ${mem.minerale} (${numero(tf.uranioPpm)} ppm di uranio): ogni segno è la scia di una fissione spontanea dell'uranio-238, due frammenti schiena contro schiena, ${fmtLunghezza(tf.percorsoM)} in tutto. ${fmtGrande(tf.densita)} tracce per cm² (qui ${tf.quante}${tf.quante > tf.tracce.length ? `, disegnate ${tf.tracce.length}` : ''}) accumulate in ${fmtTempo(tf.anni * 3.156e7)}: ${mem.perche}. La più vecchia di queste ha ${fmtTempo(vecchia * 3.156e7)}. È il metodo con cui si datano le rocce: densità = età × uranio × costante di fissione × percorso`;
  } else if (passo === 4) {
    // il reticolo largo trenta nanometri: la stessa legge degli atomi qui sotto, un campione cento volte più grande (una fetta
    // spessa quanto basta per stare in 20 000 atomi): a questa scala gli atomi sono puntini di un pixel o due, e si vede la trama
    // (l'immagine si fa solo quando la si guarda: per sapere quanto è grande basta la tessera)
    const opz = { latoM: 3e-8, T: L.T ?? 288, massimo: 20000, tessera: true }; N = 384; px = () => immagineAtomi(atomiDelReticolo(minerale, opz, caso), N); tessera = tesseraReticolo(minerale, opz.latoM); larghezzaM = tessera.latoM; liscio = true; nome = `il reticolo ${del(minerale.replace(' d\'acqua', ''))}, trenta nanometri`;
    frase = `${minerale}, visto lungo il suo asse: trenta nanometri, gli atomi sono puntini, le file del reticolo una trama. Avvicinati ancora: tre nanometri, gli atomi uno per uno`;
  } else if (passo === 3) {
    const a = atomiDelReticolo(minerale, { latoM: 3e-9, T: L.T ?? 288, tessera: true, centroM }, caso); N = 320; px = immagineAtomi(a, N); larghezzaM = a.latoM; liscio = true; tessera = a; nome = `gli atomi ${del(minerale.replace(' d\'acqua', ''))}`;
    frase = `${a.descrizione}. Le sfere hanno il raggio vero degli ioni e i colori dei modelli (${Object.keys(a.agitazione).map((e) => ({ O: 'ossigeno rosso', Si: 'silicio chiaro, piccolo, nascosto tra gli ossigeni', Na: 'sodio viola', Cl: 'cloro verde', K: 'potassio viola scuro', Ca: 'calcio verde chiaro', Mg: 'magnesio verde-giallo', Fe: 'ferro arancio', Al: 'alluminio grigio', C: 'carbonio grigio', H: 'idrogeno bianco' })[e] || e).join('; ')}); le più scure stanno più in profondità. È un'istantanea: un attimo dopo ogni atomo è spostato altrove attorno al suo posto. Sotto, in tre dimensioni, gli atomi uno per uno e poi la scala quantistica; un clic entra nella finestra, dove corrono le particelle di questo punto`;
  } else {
    // la particella: una α della radioattività di questa roccia (la più frequente); dove non ce n'è (ghiaccio, sale), un muone cosmico
    const src = sorgentiNaturali(L), alfa = src.processi.filter((q) => q.tipo === 'α').sort((p, q) => q.perKg - p.perKg)[0], E = alfa ? alfa.energia : Math.max(200, src.cosmici.energiaMuoni * 1000);
    const r = incanalamento(minerale, alfa ? 'alfa' : 'muone+', E, null, { T: L.T ?? 288, N: 40, punti: 12 }); px = r.immagine; N = r.N; liscio = true; larghezzaM = r.spessoreM; nome = `la stella d'incanalamento ${del(minerale.replace(' d\'acqua', ''))}, in una lamina spessa ${fmtLunghezza(r.spessoreM)}`;
    frase = `${r.descrizione} La particella è ${alfa ? `una α ${del(alfa.nuclide)} di questa stessa roccia (${numero(alfa.perKg)} al secondo per chilo)` : `un muone cosmico da ${numero(E / 1000)} GeV (qui non c'è radioattività che dia α)`}. La figura è in angoli (su uno schermo a un metro dal cristallo sarebbe larga ${fmtLunghezza(2 * r.campoRad)}): qui sta nella scala alla grandezza della lamina che la disegna, spessa ${fmtLunghezza(r.spessoreM)}. La simmetria la decide il reticolo di questo minerale, non chi guarda. Avvicinati ancora: gli atomi di quel reticolo`;
  }
  // (la tessera del reticolo: N × Ny, e la fila sopra spostata di «scarto», in frazioni della larghezza: periodico)
  const faiTela = () => { const p = typeof px === 'function' ? px() : px, Ny = p.length / (4 * N), cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(N, Ny) : Object.assign(document.createElement('canvas'), { width: N, height: Ny }); cv.getContext('2d').putImageData(new ImageData(p, N, Ny), 0, 0);
    if (tessera) cv.scarto = (tessera.scartoM || 0) / tessera.latoM; return cv; };
  let tela = typeof px === 'function' ? null : faiTela();
  const out = { get cv() { return (tela ||= faiTela()); }, nome, larghezzaM, frase, liscio, passo, base, luogo: L, memoria: mem, minerale };
  rocceFatte.set(kk, out); if (rocceFatte.size > 48) rocceFatte.delete(rocceFatte.keys().next().value);
  return out;
}
// le tracce di una cella simulata, disegnate su una tela (per l'evento nell'acqua): ogni specie il suo colore
const COLORE_TRACCIA = (n) => (n === 'alfa' ? '255,190,90' : n.startsWith('frammento') ? '255,96,96' : n === 'fotone Cherenkov' ? '110,160,255' : n.startsWith('muone') ? '245,245,245' : n === 'elettrone' || n === 'positrone' ? '120,255,160' : n.startsWith('protone') ? '255,240,120' : '255,150,220');
function disegnaTracce(cv, cella, tracce, { trasparente = false } = {}) {
  const N = cv.width, x = cv.getContext('2d'), k = N / cella.larghezza; if (trasparente) x.clearRect(0, 0, N, N); else { x.fillStyle = '#0a1420'; x.fillRect(0, 0, N, N); } x.lineCap = 'round';
  for (const t of tracce) { if (t.sagoma) continue; const n = t.specie.nome, P = t.punti; x.strokeStyle = `rgba(${COLORE_TRACCIA(n)},${n === 'fotone Cherenkov' ? 0.55 : 0.95})`;
    for (let i = 1; i < P.length; i++) { if (!P[i][2] || !P[i - 1][2]) continue; x.lineWidth = Math.max(1.2, P[i][4] * k); x.beginPath(); x.moveTo(P[i - 1][0] * k, P[i - 1][1] * k); x.lineTo(P[i][0] * k, P[i][1] * k); x.stroke(); } }
}
// il luogo di un punto d'acqua per le particelle: i sali veri di quel punto (il potassio sciolto), la sua temperatura
function luogoAcqua(cam, S, u, v, profondo) {
  const lon = u * 360 - 180, lat = 90 - v * 180; let qui = null; try { qui = luogoMare(S.mare, lon, lat, { profondita: 0, acqua: true, fondoM: profondo }, sorgente(`${S.k}/acqua/${u.toFixed(6)}/${v.toFixed(6)}`)); } catch { qui = null; }
  return luogoDaAcqua({ S, lat, lon, profonditaM: 0, T: qui?.T, totali: qui?.totali || S.mare.totali, raggi: cieloDi(cam.via) });
}
// ---------- SOTTO LE MOLECOLE DELL'ACQUA: l'evento vero. In un nanometro cubo non accade niente per tempi lunghissimi; si
// guarda allora il prossimo evento di quell'acqua alla SUA scala (millimetri per un elettrone del potassio-40), simulato
// dal motore con la sua data: è la stessa cella in cui si entra con un clic.
function eventoNellAcqua(cam, S, k, u, v, profondo) {
  const ke = `${k}|evento`; if (rocceFatte.has(ke)) return rocceFatte.get(ke);
  const L = luogoAcqua(cam, S, u, v, profondo), r = cellaMateria(L, { via: { ...cam.via } }, sorgente(L.indirizzo, ramiCosmo(cam.via.cosmo))), tracce = simulaMondo(r.cella), cv = telaN(384); disegnaTracce(cv, r.cella, tracce);
  const nano = sorgentiNaturali(L).attesa(1e-9).find((a) => a.id === r.racconto.veri.processo);
  const out = { cv, acqua: true, evento: true, liscio: true, nome: `acqua: ${r.cella.sorgenti[0].origine}`, larghezzaM: r.cella.scala.latoM, luogo: L, punto: { u, v, profondo },
    frase: `${r.racconto.frasi[1]} ${r.racconto.frasi[2]} In un nanometro cubo, come quello delle molecole qui sopra, lo stesso evento accade una volta ogni ${nano ? fmtTempo(nano.secondi) : 'tempo lunghissimo'}: per questo lo si guarda alla sua scala (${fmtLunghezza(r.cella.scala.latoM)}: la barra). Verde l'elettrone, azzurra la luce Cherenkov, bianco un muone` };
  rocceFatte.set(ke, out); if (rocceFatte.size > 48) rocceFatte.delete(rocceFatte.keys().next().value);
  return out;
}
// ---------- LE MOLECOLE IN PIANO, PRIMA DEL 3D: DAL CAMPO DI DENSITÀ ALLE MOLECOLE (alla «Illustrate»: Goodsell, Autin e
// Olson 2019). Sotto il micron l'acqua della finestra è il colore medio di ciò che contiene (continuo sotto il pixel); le
// molecole sono larghe 0,3 nm, e quando sullo schermo una molecola diventa più grande di un pixel (eredita.js, pesoDiscreto:
// la rampa di un'ottava attorno al pixel, la stessa regola di tutto lo zoom) compaiono, una per una, sopra la finestra:
// sono LE STESSE della scena in 3D che si monta sotto i 10 nm (scenaNano, preparata da finestre.worker.js con gli stessi
// argomenti), viste dall'alto come la vede il 3D (la x a destra, la y in su), con i colori della scena (l'acqua del colore
// del mare): così il 3D, quando compare, ha sotto di sé già le sue molecole.
// SENZA RIPETIZIONE. Il cubetto di 10 nm è periodico, ma ripetuto tale e quale si vedeva una griglia (gli ioni a 100 nm in
// file). Ora il piano è fatto di CELLE di 10 nm, e ogni cella prende dal cubetto una sua variante, scelta con serie() per
// cella (eredita.js, serie per nome): uno degli otto STRATI del cubetto (fette di 1,25 nm a profondità diverse: altre
// molecole, altri ioni, e insieme tutto il cubetto, quindi le concentrazioni restano quelle) visto in una delle otto
// SIMMETRIE del quadrato (rotazioni di 90° e ribaltamenti: il cubetto resta un campione dello stesso liquido). Le molecole
// non si tagliano sul bordo della cella: ognuna appartiene alla cella del suo centro e si disegna intera, anche oltre il
// bordo (il margine della tessera, trasparente), sopra il fondo del colore dell'acqua. Le nove celle attorno al punto sono
// quelle del 3D (lo strato davanti, con le stesse simmetrie delle copie in atomi3d.js periodica: varianteCella).
// Il dettaglio sotto il pixel lo fa la piramide di immagini (ognuna la media di quattro pixel di quella sopra).
// GLI IONI, FUORI DALLE NOVE CELLE DEL 3D, SONO UN CAMPO DI POISSON PER INDIRIZZO. Con le varianti del cubetto gli ioni di
// una cella erano ancora quelli di uno degli otto strati, negli otto posti delle simmetrie: a 100 nm, dove le molecole
// d'acqua sono un pixel e gli ioni le macchie che si vedono, le celle tornavano a righe. Ora, fuori dalle nove celle,
// lo strato si disegna senza i suoi ioni, e gli ioni della cella si tirano per indirizzo («ioni della cella i j», serie per
// nome): per ogni specie un numero di Poisson con la media del cubetto in uno strato (i suoi ioni / STRATI_NANO, lo stesso
// volume: la concentrazione si conserva), ognuno uno ione vero del cubetto (gli stessi atomi), in un punto a caso della
// cella e girato a caso. Il colore medio si conserva in media: gli atomi si disegnano col lume medio della sfera dello strato.
const tessereNano = new Map(), DIAMETRO_ACQUA = 2 * 0.152e-9; // (m: il diametro di van der Waals dell'ossigeno, Bondi 1964)
const STRATI_NANO = 8;
// (il totale si conserva, come vuole eredita.js separa: la media della tessera è il colore della finestra sotto, quello che le
// molecole sotto il pixel già facevano; i colori delle molecole si scalano di kc, e la scena in 3D con loro: scenaAtomi.
// Prima i fattori si scrivevano in T.k, che è anche la scala in pixel per nanometro: gli strati diversi dal primo, fatti dopo,
// uscivano vuoti, e a 100 nm si vedevano solo le celle dello strato davanti, cioè lo stesso cubetto ruotato: gli ioni in file)
const mediaTela = (cv) => { const c = telaN(16), x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingEnabled = true; x.drawImage(cv, 0, 0, 16, 16); const d = x.getImageData(0, 0, 16, 16).data, m = [0, 0, 0]; for (let i = 0; i < 256; i++) for (let k = 0; k < 3; k++) m[k] += d[4 * i + k] / 256; return m; };
// le otto simmetrie del quadrato, nelle coordinate della scena (x a destra, y in su), attorno al centro della cella:
// d = 0…3 rotazioni di d·90°, 4…7 le stesse dopo il ribaltamento x → −x. → [a, b, c, e]: x' = a·x + b·y, y' = c·x + e·y
export function simmetriaQuadrato(d) {
  const R = [[1, 0, 0, 1], [0, -1, 1, 0], [-1, 0, 0, -1], [0, 1, -1, 0]][d & 3];
  return d >= 4 ? [-R[0], R[1], -R[2], R[3]] : R;
}
// la variante della cella (i, j) (coordinate della scena, la cella del punto è 0, 0): { strato, simmetria }. Le nove
// attorno al punto (|i|, |j| ≤ 1) hanno lo strato davanti, come nel 3D; quella del punto è il cubetto tale e quale
const intero = (i) => (i >= 0 ? 2 * i : -2 * i - 1), coppia = (a, b) => ((a + b) * (a + b + 1)) / 2 + b;
export function varianteCella(chiave, i, j) {
  if (!i && !j) return { strato: 0, simmetria: 0 };
  const u = serie(chiave, 'celle delle molecole'), n = coppia(intero(i), intero(j)), simmetria = Math.floor(u(2 * n) * 8) & 7;
  return { strato: Math.abs(i) <= 1 && Math.abs(j) <= 1 ? 0 : Math.floor(u(2 * n + 1) * STRATI_NANO) % STRATI_NANO, simmetria };
}
function tesseraNano(sc, voluto = null) {
  const A = sc.atomi, Lb = sc.latoNm || sc.scatola[0], N = 512, k = N / Lb, c0 = sc.coloreAcqua || [40, 70, 100];
  let rm = 0; for (let a = 0; a < A.raggio.length; a++) if (A.raggio[a] > rm) rm = A.raggio[a];
  const T = { latoM: Lb * 1e-9, Lb, N, k, margine: Math.ceil(rm * k + 0.2 * k) + 1, A, kc: [1, 1, 1], c0, strati: [], senzaIoni: [], celle: new Map(), ioni: ioniDelCubetto(sc) };
  // i colori: la media dello strato davanti sul fondo dell'acqua è il colore della finestra (come prima della divisione in strati)
  const s0 = stratoNano(T, 0, true);
  if (voluto) { const m = [0, 0, 0], M = T.N + 2 * T.margine, b = s0.buf; for (let y = T.margine; y < T.margine + N; y++) for (let x = T.margine; x < T.margine + N; x++) { const o = 4 * (y * M + x), w = b[o + 3] / 255; for (let c = 0; c < 3; c++) m[c] += (b[o + c] * w + c0[c] * (1 - w)) / (N * N); } T.kc = m.map((x, c) => (x > 0 ? voluto[c] / x : 1)); }
  T.strati[0] = stratoInMip(T, s0.buf); T.fondo = `rgb(${c0.map((x, c) => Math.round(Math.min(255, x * T.kc[c]))).join(',')})`;
  return T;
}
// gli ioni del cubetto (finestra.js scenaNano: le parti con la carica, e le coppie, con i loro conteggi): per specie, le unità
// (gli atomi di uno ione, o di una coppia) col loro centro. → { specie: [{ nome, unita: [[indici]] }], ione: Uint8Array (1 se l'atomo è di uno ione) }
function ioniDelCubetto(sc) {
  const A = sc.atomi, n = A.raggio.length, ione = new Uint8Array(n), specie = [];
  for (const p of sc.parti || []) {
    if (!(p.carica || /^coppia /.test(p.nome)) || !(p.a > p.da)) continue;
    const quante = sc.conteggi?.[p.nome.replace(/^coppia /, '')] || 0, passo = quante > 0 && (p.a - p.da) % quante === 0 ? (p.a - p.da) / quante : 1, unita = [];
    for (let i = p.da; i < p.a; i += passo) { const u = []; for (let j = i; j < i + passo; j++) { u.push(j); ione[j] = 1; } unita.push(u); }
    specie.push({ nome: p.nome, unita });
  }
  return { specie, ione };
}
// uno strato del cubetto: gli atomi con la profondità nella fetta s (0: quella davanti, la z più alta), ognuno intero,
// coperto da chi gli sta davanti, l'ombra dove la sfera si allontana dal centro; il resto trasparente («senzaIoni»: solo
// l'acqua e le altre molecole, per le celle i cui ioni sono il campo di Poisson)
function stratoNano(T, s, _, senzaIoni = false) {
  const { A, Lb, N, k, margine } = T, M = N + 2 * margine, buf = new Uint8ClampedArray(M * M * 4), prof = new Float32Array(M * M).fill(-Infinity), h = Lb / STRATI_NANO, n = A.raggio.length;
  for (let a = 0; a < n; a++) { const z = A.pos[3 * a + 2], q = Math.min(STRATI_NANO - 1, Math.max(0, Math.floor((Lb - z) / h))); if (q !== s || (senzaIoni && T.ioni.ione[a])) continue;
    const r = A.raggio[a] * k, X = A.pos[3 * a] * k + margine, Y = (Lb - A.pos[3 * a + 1]) * k + margine, col = A.colore ? [A.colore[3 * a], A.colore[3 * a + 1], A.colore[3 * a + 2]] : [200, 200, 200];
    for (let y = Math.max(0, Math.floor(Y - r)); y <= Math.min(M - 1, Math.ceil(Y + r)); y++) for (let x = Math.max(0, Math.floor(X - r)); x <= Math.min(M - 1, Math.ceil(X + r)); x++) {
      const d2 = ((x + 0.5 - X) ** 2 + (y + 0.5 - Y) ** 2) / (r * r); if (d2 > 1) continue; const zz = z + A.raggio[a] * Math.sqrt(1 - d2), o = y * M + x; if (zz <= prof[o]) continue; prof[o] = zz;
      const lume = 0.62 + 0.38 * Math.sqrt(1 - d2); buf[4 * o] = col[0] * lume; buf[4 * o + 1] = col[1] * lume; buf[4 * o + 2] = col[2] * lume; buf[4 * o + 3] = 255; } }
  return { buf, M };
}
function stratoInMip(T, buf) {
  const M = T.N + 2 * T.margine, kc = T.kc; if (kc[0] !== 1 || kc[1] !== 1 || kc[2] !== 1) for (let i = 0; i < M * M; i++) for (let c = 0; c < 3; c++) buf[4 * i + c] *= kc[c];
  const mip = [telaN(M)]; mip[0].getContext('2d').putImageData(new ImageData(buf, M, M), 0, 0);
  for (let L = M >> 1; L >= 8; L >>= 1) { const c = telaN(L), x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.drawImage(mip[mip.length - 1], 0, 0, L, L); mip.push(c); }
  return mip;
}
const stratoDi = (T, s) => (T.strati[s] ||= stratoInMip(T, stratoNano(T, s).buf));
const stratoSenzaIoni = (T, s) => (T.senzaIoni[s] ||= stratoInMip(T, stratoNano(T, s, false, true).buf));
// un numero di Poisson di media m dai numeri u(0), u(1), … (il prodotto delle uniformi; e^(−m) resta un numero per m < 700)
const poissonDa = (m, u) => { if (!(m > 0)) return { n: 0, usati: 0 }; const L = Math.exp(-m); let n = 0, p = u(0); while (p > L && n < 10 * m + 50) { n++; p *= u(n); } return { n, usati: n + 1 }; };
// la cella (i, j) fuori dalle nove: lo strato senza ioni, alla larghezza della piramide `w`, con sopra gli ioni di Poisson
// della cella (vedi sopra). Si tiene in memoria (le ultime 600)
function cellaConIoni(T, ch, i, j, strato, w) {
  const chiave = `${i},${j}|${strato}|${w}`; let cv = T.celle.get(chiave); if (cv) return cv;
  const mip = stratoSenzaIoni(T, strato), base = mip.find((q) => q.width === w) || mip[0], M = T.N + 2 * T.margine, f = base.width / M;
  cv = telaN(base.width); const x = cv.getContext('2d'); x.drawImage(base, 0, 0);
  const u = serie(ch, `ioni della cella ${i} ${j}`), A = T.A, kc = T.kc, LUME = 0.62 + 0.38 * (2 / 3); let o = 0; // (il lume medio della sfera disegnata in stratoNano)
  for (const sp of T.ioni.specie) {
    const { n } = poissonDa(sp.unita.length / STRATI_NANO, (q) => u(o + q)); o += n + 1;
    for (let q = 0; q < n; q++) {
      const un = sp.unita[Math.min(sp.unita.length - 1, Math.floor(u(o) * sp.unita.length))], X = u(o + 1) * T.Lb, Y = u(o + 2) * T.Lb, ang = 2 * Math.PI * u(o + 3), ca = Math.cos(ang), sa = Math.sin(ang); o += 4;
      let cx = 0, cy = 0; for (const a of un) { cx += A.pos[3 * a] / un.length; cy += A.pos[3 * a + 1] / un.length; }
      for (const a of un) { const dx = A.pos[3 * a] - cx, dy = A.pos[3 * a + 1] - cy, px = X + ca * dx - sa * dy, py = Y + sa * dx + ca * dy, col = A.colore ? [A.colore[3 * a], A.colore[3 * a + 1], A.colore[3 * a + 2]] : [200, 200, 200];
        x.fillStyle = `rgb(${col.map((c, k) => Math.round(Math.min(255, c * LUME * kc[k]))).join(',')})`; x.beginPath(); x.arc((px * T.k + T.margine) * f, ((T.Lb - py) * T.k + T.margine) * f, Math.max(0.5, A.raggio[a] * T.k * f), 0, 2 * Math.PI); x.fill(); }
    }
  }
  T.celle.set(chiave, cv); if (T.celle.size > 600) T.celle.delete(T.celle.keys().next().value);
  return cv;
}
let telaMolecole = null;
function molecoleInPiano(ctx, cam, r0, px, py, pxm, W, H) {
  const S = superficieDi(cam.via); if (!S || !r0.punto) return; const { u, v } = r0.punto, ch = `${S.k}|${u.toFixed(7)}|${v.toFixed(7)}|acqua3d|1e-8`;
  const a = pesoDiscreto(DIAMETRO_ACQUA * pxm); if (!(a > 0)) return; // (eredita.js: la molecola contro il pixel, su un'ottava)
  let T = tessereNano.get(ch); if (!T) { const sc = scenePronte.get(ch); if (!sc) return; try { T = tesseraNano(sc, r0.cv ? mediaTela(r0.cv) : null); } catch (err) { console.warn(err); return; } tessereNano.set(ch, T); if (tessereNano.size > 3) tessereNano.delete(tessereNano.keys().next().value); }
  // (sotto il peso pieno le molecole si disegnano a parte e si posano con il loro peso: a·molecole + (1 − a)·finestra)
  let c = ctx; if (a < 1) { if (!telaMolecole || telaMolecole.width !== W || telaMolecole.height !== H) telaMolecole = Object.assign(document.createElement('canvas'), { width: W, height: H }); c = telaMolecole.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); }
  const zt = T.latoM * pxm, Mt = T.N + 2 * T.margine, lato = (zt * Mt) / T.N; c.fillStyle = T.fondo; c.fillRect(0, 0, W, H); c.imageSmoothingEnabled = true;
  const i0 = Math.ceil((-px - lato / 2) / zt), i1 = Math.floor((W - px + lato / 2) / zt), j0 = Math.ceil((-py - lato / 2) / zt), j1 = Math.floor((H - py + lato / 2) / zt);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const { strato, simmetria } = varianteCella(ch, i, -j), mip = stratoDi(T, strato); let cv = mip[0]; for (const q of mip) if (q.width >= lato) cv = q;
    if (Math.abs(i) > 1 || Math.abs(j) > 1) cv = cellaConIoni(T, ch, i, -j, strato, cv.width); // (fuori dalle nove celle del 3D: gli ioni di Poisson)
    // (la simmetria nella scena, portata sullo schermo dove la y va in giù: G = Fy·M·Fy)
    const [ma, mb, mc, me] = simmetriaQuadrato(simmetria); c.setTransform(ma, -mc, -mb, me, px + i * zt, py + j * zt); c.drawImage(cv, -lato / 2, -lato / 2, lato, lato);
  }
  c.setTransform(1, 0, 0, 1, 0, 0); if (c !== ctx) { ctx.globalAlpha = a; ctx.drawImage(telaMolecole, 0, 0); ctx.globalAlpha = 1; }
}
// ---------- GLI ATOMI IN TRE DIMENSIONI (atomi3d.js). Ai livelli più profondi la materia non è più un'immagine: chi monta
// la vista (laboratorio.js) chiede qui se dove si sta guardando c'è una scena di atomi, e quale. Nell'acqua, sotto i dieci
// nanometri: le molecole e gli ioni veri di quel punto (mare.js, scenaMolecolare: gli stessi conteggi del campione).
// Nella roccia, all'ultimo passo: tre nanometri del reticolo del minerale che si aveva sotto gli occhi, con l'agitazione
// termica di Debye-Waller alla temperatura di lì. → null, oppure { chiave, crea() → scena, acqua, che }
export function scenaAtomi(cam, m = 0) { // (m: il lato corto dello schermo, in pixel: gli atomi in 3D si montano quando il loro campione lo riempie)
  if (cam.livello !== 5) return null; const r = rocciaDi(cam), S = superficieDi(cam.via); if (!r || !S) return null;
  if (cam.suAcqua) {
    const lato = cam.latoAcqua ?? 1; if (cam.eventoAcqua || lato > 1.0001e-8 || !r.punto || cam.z < 0.85 * m) return null; const { u, v, profondo } = r.punto;
    return { acqua: true, chiave: `${S.k}|${u.toFixed(7)}|${v.toFixed(7)}|acqua3d|${lato}`, che: `le molecole e gli ioni di quest'acqua in un cubetto di ${fmtLunghezza(lato)}`,
      // (l'acqua attorno: le copie periodiche del cubetto, otto attorno a quello del punto, nel piano che si guarda)
      // (finestra.js scenaNano: l'acqua liquida alla sua densità e con la sua struttura, ogni ione nel suo numero e nel suo guscio)
      // (se finestre.worker.js l'ha già preparata, arrivando, è quella: gli stessi argomenti, gli stessi bit; si usa una volta)
      crea: () => { const ch = `${S.k}|${u.toFixed(7)}|${v.toFixed(7)}|acqua3d|${lato}`, pronta = scenePronte.get(ch); if (pronta && !tessereNano.has(ch)) { try { tessereNano.set(ch, tesseraNano(pronta, r.cv ? mediaTela(r.cv) : null)); } catch { /* resta senza */ } } if (pronta) scenePronte.delete(ch);
        const sc0 = pronta || scenaNano(S.mare, { lon: u * 360 - 180, lat: 90 - v * 180, profondita: 0, latoM: lato, fondoM: profondo }, sorgente(`${S.k}/acqua/${u.toFixed(6)}/${v.toFixed(6)}`)), T = tessereNano.get(ch);
        if (T && sc0.atomi.colore) { const c = Uint8Array.from(sc0.atomi.colore); for (let i = 0; i < c.length; i++) c[i] = Math.min(255, c[i] * T.kc[i % 3]); sc0.atomi = { ...sc0.atomi, colore: c }; } // (i colori della tessera: la media è quella dell'acqua)
        return periodica(conMoto(sc0), [3, 3, 1], null, { simmetria: (i, j) => simmetriaQuadrato(varianteCella(`${S.k}|${u.toFixed(7)}|${v.toFixed(7)}|acqua3d|${lato}`, i, j).simmetria) }); } };
  }
  if (cam.passoRoccia !== 3 || !r.minerale || !r.luogo || cam.z < 0.95 * m) return null;
  // (sul suolo: la superficie del minerale con sopra l'acqua dei pori a metà del suolo, ogni ione nel suo numero: suolo.js)
  const w = rocciaDi({ ...cam, passoRoccia: 0, latoSuolo: LATI_SUOLO[LATI_SUOLO.length - 1] });
  if (w?.suolo && w.fin?.padre) { const pad = w.fin.padre; return { acqua: true, chiave: `${r.luogo.indirizzo}|pori3d|${r.minerale}|${pad.I},${pad.J}`, che: `la superficie ${del3(r.minerale)} e l'acqua dei pori sopra, in un cubetto di 6 nm`,
    crea: () => { const sc = scenaSuolo(pad, { latoM: 6e-9, minerale: r.minerale }, sorgente(`${r.luogo.indirizzo}/pori`, ramiCosmo(cam.via.cosmo))); return periodica(conMoto(sc), sc.ripeti); } }; }
  return { acqua: false, chiave: `${r.luogo.indirizzo}|atomi3d|${r.minerale}`, che: `tre nanometri di ${r.minerale.replace(" d'acqua", '')}`,
    // (il reticolo continua oltre lo schermo: una fetta nove volte più larga dei tre nanometri che si guardano, atomi veri)
    crea: () => { const a = atomiDelReticolo(r.minerale, { latoM: 9e-9, spessoreM: 3e-9, T: r.luogo.T ?? 288, massimo: 120000, fermi: true }, sorgente(r.luogo.indirizzo, ramiCosmo(cam.via.cosmo))), sc = scenaDaElenco(a.atomi, { unita: 'm', nome: r.nome });
      // l'agitazione vera di ogni atomo (in metri, come le posizioni): la vista li fa tremare attorno al loro posto
      sc.atomi.agitazione = Float32Array.from(a.atomi, (q) => (a.agitazione[q.el] || 0) * 1e-10); sc.descrizione = a.descrizione; return sc; } };
}
const del3 = (n) => (/^[aeiou]/.test(n) ? `dell'${n}` : n === 'zircone' ? `dello ${n}` : ['biotite', 'calcite', 'monazite', 'olivina'].includes(n) ? `della ${n}` : `del ${n}`);
// che cosa si apre con un clic in fondo allo zoom: il luogo e il modo di guardarlo (laboratorio.js, entraMateria)
function materiaDelPunto(cam) {
  const r = rocciaDi(cam); if (!r) return null;
  if (r.acqua) { const S = superficieDi(cam.via); if (!S || !r.punto) return null; r.luogo ??= luogoAcqua(cam, S, r.punto.u, r.punto.v, r.punto.profondo); return { luogo: r.luogo, opzioni: {}, che: "il prossimo evento vero in quest'acqua, al suo istante" }; }
  const base = r.base || r, mem = base.memoria; if (!base.luogo) return null;
  return mem?.tipo ? { luogo: base.luogo, opzioni: { modo: 'memoria', ospite: mem.ospite, granello: mem.granello }, che: mem.tipo === 'alone' ? `le α che il granello di ${mem.granello} ha lanciato nella biotite in ${fmtTempo(mem.anni * 3.156e7)}` : `le fissioni che ${mem.minerale === 'apatite' ? "l'apatite" : `lo ${mem.minerale}`} ha registrato in ${fmtTempo(mem.anni * 3.156e7)}` }
    : { luogo: base.luogo, opzioni: {}, che: 'il prossimo evento vero in questo punto, al suo istante' };
}

// ---------- LA FINESTRA OVUNQUE. La finestra non è una cosa a parte: è un punto di osservazione qualsiasi del mondo,
// a qualsiasi scala. Qui si cerca, attorno a dove si sta guardando e alla stessa scala (un po' più vicino, un po' più
// lontano), il punto di vista dove il mondo disegna di più: si prova un certo numero di inquadrature, si guarda ciò che
// c'è davvero in ognuna e si misura il disegno (sezione.js, bellezzaImmagine). I posti provati dipendono solo da dove
// si è (stesso luogo, stessa ricerca, stesso risultato): niente è aggiunto, il disegno c'era già.
export function cercaFinestra(cam, W, H, { prove = 28 } = {}) {
  if (typeof OffscreenCanvas === 'undefined') return null;
  const m = minimo(W, H), n = 176, hN = Math.max(64, Math.round((n * H) / W)), cv = new OffscreenCanvas(n, hN), ctx = cv.getContext('2d', { willReadFrequently: true });
  const caso = sorgente(`finestra/${JSON.stringify(cam.via)}/livello ${cam.livello}/${cam.cx.toPrecision(5)}/${cam.cy.toPrecision(5)}/${cam.z.toPrecision(3)}`);
  const zMin = cam.livello === 4 ? 0.95 * m : cam.livello === 5 ? 0.5 * m : cam.z / 3, zMax = cam.livello === 4 ? 5.5e6 : cam.livello === 5 ? 11 * m : cam.z * 3;
  let meglio = null;
  for (let q = 0; q < prove; q++) {
    const kz = q ? Math.exp(caso.tra(`prova ${q}/scala`, -0.9, 0.9)) : 1, z = Math.max(zMin, Math.min(zMax, cam.z * kz));
    const c = { ...cam, z, cx: cam.cx + (q ? (caso.tra(`prova ${q}/x`, -1.2, 1.2) * W) / cam.z : 0), cy: cam.cy + (q ? (caso.tra(`prova ${q}/y`, -1.2, 1.2) * H) / cam.z : 0) };
    if (cam.livello === 4) { c.cx = ((c.cx % 1) + 1) % 1; c.cy = Math.max(0.02, Math.min(0.48, c.cy)); }
    if (cam.livello === 5) { c.cx = Math.max(0.1, Math.min(0.9, c.cx)); c.cy = Math.max(0.1, Math.min(0.9, c.cy)); }
    disegnaMappa(ctx, n, hN, { ...c, z: (c.z * n) / W }, { nudo: true, dpr: 1 });
    const b = bellezzaImmagine(ctx.getImageData(0, 0, n, hN).data, n, hN);
    if (!meglio || b.totale > meglio.bellezza.totale) meglio = { cx: c.cx, cy: c.cy, z: c.z, bellezza: b, prova: q };
  }
  return meglio;
}

