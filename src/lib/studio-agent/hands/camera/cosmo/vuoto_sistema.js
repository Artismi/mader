// vuoto_sistema.js — CHE COSA C'È TRA I PIANETI, e ciò che un sistema manda tra le stelle (parti «c» e «d» di vuoto.js:
// leggi lì l'intestazione generale).
//
// Niente qui è messo a mano. Ciò che il disco ha lasciato dove non si sono formati pianeti viene da disco.js
// (formaPianeti: `formazione.orfani`, `formazione.cibo`, `formazione.mIso`; disco(): `sigmaSolidi`, `rOut`), e la sua
// storia (quanto ne resta oggi, quanto è finito in polvere, quanto è stato scagliato fuori, quanti proiettili cadono
// oggi su ogni pianeta) da impatti.js (storiaImpatti: `bilancio`, `attesi`, `popolazione`): È LA STESSA FONTE dei
// crateri (regola 7). Qui si aggiunge: dove stanno le fasce e dove le risonanze le svuotano, la distribuzione delle
// taglie fuori da ciò che impatti.js simula, la nube esterna di comete, le comete attive con chioma e code, la polvere
// che scende a spirale, il vento della stella (risalita.js), e i corpi uno per uno con le loro orbite (orbite.js).
//
// LEGGI DERIVATE QUI [D] (i conti sono accanto alle funzioni):
//   · la pendenza di una cascata di collisioni: dN/dD ∝ D^−p con p = (7 + s/3)/(2 + s/3), s la pendenza della
//     resistenza Q*(D) ∝ D^s. Con s = 0 è il 3,5 di Dohnanyi (1969); con le due pendenze di Benz & Asphaug che
//     impatti.js già usa (IMPATTI.rottura) viene 3,66 sotto qualche centinaio di metri e 3,04 sopra (O'Brien & Greenberg 2003);
//   · la nube esterna: una cometa scagliata da un pianeta diffonde in energia finché la marea della galassia non le
//     alza il perielio fuori dalla portata dei pianeti; dove i due tempi sono uguali comincia la nube (se i calci sono
//     grandi, come quelli di un gigante: dove la marea ce la fa in un giro solo); finisce dove la marea vince la stella.
//     Quanta parte ci resta invece di uscire: (1/a_interno − 1/a_esterno)/(calcio del pianeta), al più 1: un pianeta
//     piccolo riempie la nube, un gigante espelle quasi tutto (Giove vero, in questa legge: il 2%);
//   · quando una cometa si accende: dove metà della luce assorbita al punto sotto la stella va in vapore;
//   · β = spinta della luce / gravità = 3·L·Q/(16π·G·M·c·ρ·a); il tempo di Poynting–Robertson c·r²/(4·G·M·β);
//   · il più vicino, gli incontri tra stelle: n·σ·v con il fuoco gravitazionale.
//   · le comete in watt: molecole figlie = acqua × rapporto × vita, per il fattore di fluorescenza alla luce della
//     stella in quella banda; la polvere: (non ghiaccio/ghiaccio) × gas, il grano più grosso che il gas solleva, la
//     velocità d'uscita dal lavoro dell'attrito; sindine e sincrone integrate; la magnitudine dai lumen;
//   · la polvere fine di una fascia e quella che ne scende: cascata contro Poynting–Robertson, taglia per taglia
//     (polvereDellaFascia, sulla traccia di Wyatt 2005); la campana in latitudine; i bordi dove i grani evaporano;
// DATI MISURATI O PRESI (usati così; i numeri in SISTEMA): i rapporti C₂, CN, C₃ su acqua, le loro vite e i fattori di
// fluorescenza (A'Hearn et al. 1995), il CO e il CO⁺ (Huebner et al. 1992; Magnani & A'Hearn 1986), albedo e leggi di fase
// dei corpi (Bowell et al. 1989; Mainzer et al. 2011; Stansberry et al. 2008; Lamy et al. 2004), albedo e funzione di fase
// dei grani (Leinert et al. 1998; Hong 1985), il tempo tra due urti di un grano (Wyatt 2005); il calcio in energia che un pianeta dà a una cometa (Duncan,
// Quinn & Tremaine 1987), i coefficienti delle risonanze (Murray & Dermott 1999), l'albedo di un nucleo di cometa, la
// vita di una molecola d'acqua alla luce del Sole (Huebner et al. 1992), il profilo della nube (r^−3,5: Duncan et al.).
// CHE COSA MANCA (dichiarato; vedi anche vuoto.js):
//   · disco.js non restituisce i corpi rimasti sotto la soglia di «pianeta» (0,02 Terre) né i loro resti: qui la FASCIA
//     ESTERNA è ricostruita come i solidi del disco oltre la striscia dell'ultimo pianeta, e nessuno l'ha macinata
//     (impatti.js segue solo le nubi che incrociano un pianeta): viene troppo pesante;
//   · niente migrazione dei giganti (disco.js lo dichiara): la fascia esterna non è stata svuotata, come la nostra;
//   · la polvere: nessun pianeta ferma o scaglia via i grani che scendono verso la stella (i giganti veri ne tolgono gran
//     parte); le fasce fredde (che nessun pianeta rimescola) qui non fanno polvere fine; la polvere lasciata dalle comete
//     è data come ritmo (kg/s), non distribuita nello spazio; impatti.js dà la polvere di tutta la storia, non di oggi:
//     il ritmo di oggi è ricavato qui dalla cascata (macina, polvereDellaFascia);
//   · le comete: la vita delle molecole va con l'ultravioletto della stella (legge di risalita.js), i fattori di
//     fluorescenza con la sua luce nella banda, presa come corpo nero (le righe della stella, effetto Swings, non ci sono);
//     gli ioni della coda sono contati per il tempo in cui il vento li accelera lungo `lunghezza` (ordine di grandezza);
//   · le comete periodiche (quelle che i giganti portano dentro dalla fascia esterna) non hanno orbite qui: sono nel
//     flusso dei proiettili di impatti.js, non nell'elenco; la nube esterna non è erosa dalle stelle di passaggio;
//   · le lacune delle risonanze sono tolte con la larghezza di librazione; nella fascia vera alcune risonanze (3:2) sono abitate.
import { COSTANTI, MSOLE, LSOLE, ANNO, UA, massaNascita, GIORNO, RSOLE, TSOLE } from './leggi.js';
import * as ST from './stelle.js';
import { DISCO, MTERRA, formaPianeti, disco as discoDi } from './disco.js';
import { storiaImpatti, IMPATTI } from './impatti.js';
import { MATERIALI } from './lune.js';
import { LEGGI_ANELLI, sublimazione } from './anelli.js';
import { statoKeplero, periodo, assiOrbita, ORBITE } from './orbite.js';
import { ventoStellare, sottoLaSoglia, DATI as RISALITA } from './risalita.js';
import { sorgente, logEsatto } from './eventi.js';
import { cinematica, popolazione, ANELLI, dentro as GAL } from './galassie.js';
import { quadro, coloreVero, occhio, MEZZO, KPC, PC } from './vuoto_mezzo.js';

const K = COSTANTI, G = K.G, PI = Math.PI, PI4 = 4 * PI, PI2 = 2 * PI;
const stringi = (x, a, b) => Math.max(a, Math.min(b, x));
export const SISTEMA = Object.freeze({
  // [S] la parte dei planetesimi espulsi dai giganti che a 4 miliardi di anni sta nella nube: Dones et al. 2004 (ASP Conf. Ser. 323,
  // 371), il modello di riferimento, 5% alla fine (2,5% nella nube esterna, oltre 20 000 UA); le simulazioni successive tra il 5 e il
  // 7% (Kaib e Quinn 2008; Brasser e Morbidelli 2013, Icarus 225, 40: 7,1 ± 0,3%) [S: letti in Brasser e Morbidelli 2013, §1.2 e
  // §4.1 — Dones et al. e Brasser 2008 (A&A 492, 251) non riletti sulla fonte]. Uno solo per ogni età e ogni stella (dichiarato:
  // nelle simulazioni cresce fino a ~1 miliardo di anni e poi cala; e dipende dal gigante e dall'ammasso in cui il Sole è nato)
  intrappolati: 0.05,
  calcio: 10, // [R] il calcio in energia (1/a) che un pianeta dà a ogni passaggio a una cometa che arriva fin da lui: ~10·(M_p/M★)/a_p (Duncan, Quinn & Tremaine 1987, AJ 94, 1330; Tremaine 1993)
  nube: -3.5, // [R] la densità della nube esterna cala come r^−3,5 (Duncan, Quinn & Tremaine 1987): dN/da ∝ a^−1,5
  densitaSole: (0.1 * MSOLE) / PC ** 3, // [R] la materia attorno al Sole, 0,10 M☉/pc³ (Holmberg & Flynn 2000): SOLO se non si dice in che punto di quale galassia sta il sistema
  // le risonanze di moto medio: [nome, p, q (giri del corpo : giri del pianeta = p:q), ordine, α·f_d]. I coefficienti: Murray & Dermott 1999, tab. 8.5 e app. B [R]; dove mancano (null) si dà solo il posto
  risonanze: [['2:1', 2, 1, 1, 0.75], ['3:2', 3, 2, 1, 1.546], ['4:3', 4, 3, 1, 2.345], ['3:1', 3, 1, 2, 0.2875], ['5:3', 5, 3, 2, 2.33], ['5:2', 5, 2, 3, null], ['7:3', 7, 3, 4, null]],
  cometa: { albedo: 0.04, densita: 500, emissivita: 0.9 }, // [R] i nuclei visitati dalle sonde (1P/Halley, 67P): albedo 0,04, densità ~500 kg/m³
  vitaAcqua: 8.3e4, vitaIone: 1e6, // [R] (s, a 1 UA dal Sole) una molecola d'acqua regge 8·10⁴ s alla luce ultravioletta prima di spezzarsi; uno ione CO⁺ nasce in ~10⁶ s (Huebner, Keady & Lyon 1992)
  righe: { C2: 516.5, COpiu: 426.0 }, // [R] (nm) la banda di Swan del C₂ (il verde della chioma) e la banda più forte del CO⁺ (l'azzurro della coda di ioni)
  granoTipico: 1e-4, pressioneLuce: 1, // (m) il grano che porta la luce zodiacale, ~100 µm (Grün et al. 1985) [R]; Q della pressione di radiazione per un grano grande = 1
  // --- le comete: che cosa brilla, e quanto. [R] tutti; i rapporti e le lunghezze di scala: A'Hearn et al. 1995 (Icarus 118, 223: comete «tipiche»)
  Tsole: TSOLE, // (K) la temperatura del Sole a cui sono misurati i fattori di fluorescenza (valore nominale IAU 2015)
  // le molecole figlie della chioma: lunghezza d'onda (nm), molecole per molecola d'acqua (log Q/Q_OH = −2,44, −2,50, −3,59, con 0,9 OH per H₂O),
  // vita a 1 UA dal Sole (s: le lunghezze di scala 6,6·10⁴, 2,1·10⁵, 2,7·10⁴ km a 1 km/s), fluorescenza g a 1 UA dal Sole (W per molecola: 4,5·10⁻¹³,
  // 3,3·10⁻¹³, 1,0·10⁻¹² erg/s; A'Hearn 1982; Schleicher 2010 per il CN, che cambia del 50% con la velocità verso il Sole)
  figlie: [{ nome: 'C₂', nm: 516.5, suAcqua: 0.0033, vita: 6.6e4, g: 4.5e-20 }, { nome: 'CN', nm: 388.3, suAcqua: 0.0028, vita: 2.1e5, g: 3.3e-20 }, { nome: 'C₃', nm: 405.0, suAcqua: 2.3e-4, vita: 2.7e4, g: 1.0e-19 }],
  // il CO: quanto ce n'è (dall'1 al 30% dell'acqua: Bockelée-Morvan et al. 2004; qui 10%), con che ritmo la luce del Sole a 1 UA lo ionizza e lo spezza
  // (per secondo: Huebner, Keady & Lyon 1992), e la fluorescenza del CO⁺ nella banda a 426 nm (3,55·10⁻¹⁴ erg/s: Magnani & A'Hearn 1986)
  CO: { nome: 'CO⁺', nm: 426.0, suAcqua: 0.1, ionizza: 3.8e-7, spezza: 7.5e-7, g: 3.55e-21 },
  graniCometa: { aMin: 1e-7, taglie: [3e-7, 1e-6, 3e-6, 1e-5, 3e-5, 1e-4, 1e-3, 1e-2], giorni: [1, 3, 10, 30, 60, 120, 240], CD: 2 }, // i grani più piccoli misurati nella chioma di Halley (~0,1 µm: McDonnell et al. 1991) [R]; le taglie e le età a cui si danno i punti della coda (SCELTA DI CALCOLO); C_D = 2: attrito di un gas rarefatto su una sfera (Whipple 1951; Finson & Probstein 1968)
  nucleo: { fase: 0.04 }, // [R] (magnitudini per grado) la legge di fase lineare dei nuclei di cometa (Lamy et al. 2004: 0,04–0,06)
  // --- i corpi delle fasce: albedo geometrico e parametro G della legge di fase H–G dell'IAU (Bowell et al. 1989) [R]
  //     roccia: l'albedo di anelli.js (0,1: tra gli asteroidi scuri di tipo C, 0,06, e i chiari di tipo S, 0,2: Mainzer et al. 2011), G = 0,15;
  //     ghiaccio: i corpi piccoli di ghiaccio sono SCURI (un mantello di organici): 0,04 i nuclei di cometa (Lamy et al. 2004), 0,08 i corpi
  //     di 100 km oltre Nettuno (Stansberry et al. 2008); il ghiaccio pulito di anelli.js (0,6) vale per gli anelli e le lune, non per loro
  superfici: { roccia: { G: 0.15 }, ghiaccio: { albedo: [0.04, 0.08], diametri: [1e4, 1e5], G: 0.15 } },
  HG: [3.33, 0.63, 1.87, 1.22], // Φ(α) = (1−G)·e^(−3,33·tan^0,63(α/2)) + G·e^(−1,87·tan^1,22(α/2)) (Bowell et al. 1989) [R]
  // --- la polvere tra i pianeti
  polvere: { albedo: 0.1, g: [0.7, -0.2, -0.81], pesi: [0.665, 0.33, 0.005], evapora: 1500, aMax: 5e-3 }, // [R] albedo dei grani interplanetari (~0,1: Leinert et al. 1998); la funzione di fase misurata sulla luce zodiacale, tre Henyey–Greenstein (Hong 1985, A&A 146, 67); i silicati evaporano a ~1500 K (lo stesso numero di disco.js); sopra mezzo centimetro di raggio non è più «polvere» (SCELTA)
  urtiPerGiro: 4 * Math.PI, // un grano attraversa lo strato due volte per giro, e urta chi gli sta entro due raggi: t_urti = periodo/(4π·τ) (Wyatt 1999, 2005) [R]
  oumuamua: 100, // (m) [R] la taglia di 1I/'Oumuamua (~100–200 m: Meech et al. 2017): la soglia per contare gli oggetti interstellari. (Il riscontro, 0,2 per UA³, è [V]: Do, Tucker & Tonry 2018, arXiv:1801.02821, riassunto)
});
const SS = SISTEMA;

// ---------- LA CASCATA DI COLLISIONI [D]
// A regime la massa che attraversa ogni taglia è la stessa. Un corpo di diametro D è rotto da proiettili di almeno
// D_p con ½·m_p·v² = Q*(D)·m, cioè D_p ∝ D·Q*^(1/3) ∝ D^(1+s/3). La massa per intervallo logaritmico è ∝ D^(4−p); ogni
// corpo è rotto con ritmo ∝ N(>D_p)·D² ∝ D^((1+s/3)(1−p))·D². Flusso costante: 6 − p + (1+s/3)(1−p) = 0, da cui
// p = (7 + s/3)/(2 + s/3). Con Q* che non dipende dalla taglia (s = 0): 7/2.
export const esponenteCascata = (s = 0) => (7 + s / 3) / (2 + s / 3);
// la distribuzione delle taglie di una fascia di massa M (kg) e materiale dato: i corpi nati grandi (IMPATTI.planetesimo,
// 100 km) e sotto di loro la coda della cascata, con le due pendenze della resistenza di impatti.js e il passaggio dove
// la gravità comincia a tenere insieme i frammenti (dove le due leggi di Q* si incrociano). La massa fissa quanti sono.
export function taglie(massaKg, materiale = 'roccia') {
  const r = IMPATTI.rottura[materiale], rho = MATERIALI[materiale].densita, D0 = IMPATTI.planetesimo, pG = esponenteCascata(r.b), pS = esponenteCascata(r.a);
  const Dt = 2 * 0.01 * Math.pow(r.q0 / (r.B * rho), 1 / (r.b - r.a)), m0 = (PI / 6) * rho * D0 ** 3; // (i raggi di Benz & Asphaug sono in cm)
  // N(>D) = N₀·(D/D₀)^(1−pG) tra Dt e D₀; sotto Dt continua con pS. La massa della coda, in unità di N₀·m₀: [D]
  const coda = ((pG - 1) / (4 - pG)) * (1 - Math.pow(Dt / D0, 4 - pG)) + ((pS - 1) / (4 - pS)) * Math.pow(Dt / D0, 4 - pG), N0 = massaKg / (m0 * (1 + coda)), Nt = N0 * Math.pow(Dt / D0, 1 - pG);
  const sopra = (D) => (D >= D0 ? (D > D0 ? 0 : N0) : D >= Dt ? N0 * Math.pow(D / D0, 1 - pG) : Nt * Math.pow(D / Dt, 1 - pS));
  const diametro = (N) => (N <= N0 ? D0 : N <= Nt ? D0 * Math.pow(N / N0, 1 / (1 - pG)) : Dt * Math.pow(N / Nt, 1 / (1 - pS))); // il diametro sopra il quale ce ne sono N
  return { massaKg, materiale, densita: rho, natiGrandi: N0, D0, passaggio: Dt, pendenze: { forza: pS, gravita: pG, dohnanyi: esponenteCascata(0) }, sopra, diametro, massaDi: (D) => (PI / 6) * rho * D ** 3 };
}

// QUANTO IN FRETTA SI MACINA UNA FASCIA [D]. I corpi più grandi (D₀) sono rotti da chi porta almeno l'energia Q*(D₀) per
// chilo: D_p = D₀·(2Q*/v²)^(1/3), con v = v_K·√(5e²/4 + i²) la velocità con cui si incontrano due corpi di uno sciame
// (Lissauer & Stewart 1993) [R] e Q* quella di impatti.js. Il tempo tra due urti così: volume / (N(>D_p)·sezione·v).
// A regime la massa che i grandi perdono scende lungo la cascata ed esce come polvere: Ṁ = M / t. Se D_p > D₀ nessuno
// è abbastanza grosso e veloce: la fascia è fredda e non si macina.
function macina(f, mu, massaKg = f.oggiKg, ecc = f.e) {
  const tg = massaKg === f.oggiKg ? f.taglie : taglie(massaKg, f.materiale), r = IMPATTI.rottura[f.materiale], vK = Math.sqrt(mu / f.a), inc = ORBITE.ripartizione * ecc, v = vK * Math.sqrt(1.25 * ecc * ecc + inc * inc), cm = 50 * tg.D0, Qs = r.q0 * Math.pow(cm, r.a) + r.B * tg.densita * Math.pow(cm, r.b);
  const V = PI2 * f.a * (f.a2 - f.a1) * 2 * f.a * Math.sin(Math.min(1, inc)), Dp = tg.D0 * Math.cbrt((2 * Qs) / (v * v));
  if (!(Dp < tg.D0) || !(tg.natiGrandi >= 1)) return { volume: V, velocitaUrti: v, tempoUrti: Infinity, polvereKgS: 0 };
  const t = V / (tg.sopra(Dp) * PI * (0.5 * (tg.D0 + Dp)) ** 2 * v); return { volume: V, velocitaUrti: v, tempoUrti: t / ANNO, polvereKgS: massaKg / t };
}

// ---------- LA LUCE DI UNA STELLA dove serve [D]
// quanta luce arriva a rM rispetto al Sole a 1 UA: tutta (`tutta`); a una lunghezza d'onda (`a(nm)`: la forma è quella di un
// corpo nero a T: conta per la fluorescenza, che è eccitata da una banda sola); nell'ultravioletto che spezza le molecole
// (`uv`: la stessa legge di risalita.js per l'ultravioletto sotto 200 nm: fotosfera con le righe più cromosfera)
const planckA = (nm, T) => 1 / ((nm * 1e-9) ** 5 * Math.expm1((PI2 * K.hbar * K.c) / (nm * 1e-9 * K.kB * T))) / T ** 4;
const uvDi = (T) => RISALITA.RIGHE * sottoLaSoglia(T) + RISALITA.CROMOSFERA;
export function luceA(st, rM) {
  const tutta = st.Lw / LSOLE / (rM / UA) ** 2, T = st.T > 0 ? st.T : SS.Tsole;
  return { tutta, uv: (tutta * uvDi(T)) / uvDi(SS.Tsole), a: (nm) => (tutta * planckA(nm, T)) / planckA(nm, SS.Tsole) };
}
// quanti lumen fa un watt di luce di corpo nero a T (683 lm/W per la curva dell'occhio: il Sole ~95), e la magnitudine
// visuale di una sorgente di `lumen` (in tutte le direzioni) vista da `distanza` metri: m = −13,98 − 2,5·log₁₀(lux) [R:
// la definizione; il Sole a 1 UA, 1,28·10⁵ lux, dà −26,74]
const efficacie = new Map();
export function efficaciaLuminosa(T) { const k = Math.round(T); if (efficacie.has(k)) return efficacie.get(k); let s = 0; for (let nm = 382.5; nm < 780; nm += 5) s += occhio(nm)[1] * planckA(nm, T) * T ** 4 * 5e-9; const v = (683 * s * 2 * (PI2 * K.hbar) * K.c * K.c * PI) / (K.sigma * T ** 4); efficacie.set(k, v); return v; }
export const magnitudineDa = (lumen, distanza) => (lumen > 0 ? -13.98 - 2.5 * Math.log10(lumen / (PI4 * distanza * distanza)) : Infinity);
// la legge di fase H–G: quanta luce rimanda un corpo all'angolo di fase alfa (rad) rispetto a fase zero
export const faseHG = (alfa, Gp = 0.15) => { const t = Math.tan(Math.min(alfa, 3.1) / 2), h = SS.HG; return (1 - Gp) * Math.exp(-h[0] * Math.pow(t, h[1])) + Gp * Math.exp(-h[2] * Math.pow(t, h[3])); };
// la superficie di un corpo di una fascia: albedo geometrico, legge di fase, albedo di Bond (= albedo × integrale di fase 0,290 + 0,684·G), colore
export function superficieDi(materiale, D) {
  const S = SS.superfici[materiale], Gp = S.G; let albedo = LEGGI_ANELLI.albedo.roccia;
  if (materiale === 'ghiaccio') { const u = stringi(Math.log(D / S.diametri[0]) / Math.log(S.diametri[1] / S.diametri[0]), 0, 1); albedo = S.albedo[0] * Math.pow(S.albedo[1] / S.albedo[0], u); }
  return { albedo, fase: { legge: 'HG', G: Gp }, albedoDiBond: albedo * (0.29 + 0.684 * Gp), colore: materiale === 'ghiaccio' ? LEGGI_ANELLI.colore.roccia.map((v, k) => Math.round(v * [1.15, 1, 0.85][k])) /* scuro e rossastro: organici irradiati, non ghiaccio pulito */ : LEGGI_ANELLI.colore.roccia };
}
// la funzione di fase dei grani interplanetari (per steradiante: l'integrale su tutte le direzioni fa 1), all'angolo di diffusione theta
export const fasePolvere = (theta) => { const c = Math.cos(theta), P = SS.polvere; let s = 0; for (let k = 0; k < 3; k++) { const g = P.g[k]; s += (P.pesi[k] * (1 - g * g)) / (PI4 * Math.pow(1 + g * g - 2 * g * c, 1.5)); } return s; };

// ---------- LA POLVERE FINE DI UNA FASCIA, E QUELLA CHE NE SCENDE VERSO LA STELLA [D, sulla traccia di Wyatt 2005 (A&A 433, 1007)]
// La cascata di `taglie` continua sotto il millimetro fino ai grani che la luce soffia via (β > ½). Ma un grano piccolo ha
// due modi di sparire: un urto che lo rompe (t_u = periodo/(4π·τ), τ la profondità ottica di chi è abbastanza grosso da
// romperlo: almeno a·(2Q*/v²)^(1/3)) oppure la frenata di Poynting–Robertson che lo porta fuori dalla fascia
// (t_PR = c·(a₂² − a₁²)/(8GMβ)). Taglia per taglia, dall'alto in giù: della massa che la cascata fa arrivare a una taglia
// la parte φ = 1/(1 + t_u/t_PR) prosegue a rompersi, il resto se ne va verso la stella; e quanti ce ne sono è flusso ×
// vita. In una fascia DENSA (τ grande) gli urti vincono: quasi tutto finisce in grani soffiati via, e verso la stella
// scende poco. In una RADA (la nostra fascia degli asteroidi) vince la frenata sotto ~100 µm: è la polvere zodiacale.
// Dentro il bordo interno ogni taglia scende a spirale e intanto si urta ancora: τ(r) = τ_bordo/(1 + 4η·(1 − √(r/r₀))),
// η = t_PR/t_u al bordo (Wyatt 2005, eq. 4): per quanto sia densa la fascia, dentro non si supera mai τ ≈ β·√(M/r₀)/20000.
// f: { materiale, a, a1, a2, e, taglie (o taglieCalde), velocitaUrti, tempoUrti }; st: { M, Lw }.
// → null se la fascia non si macina; se no { sigma (rad: la larghezza in latitudine), raggioSoffiato, tau (nella fascia),
//   massaKg, raggioGrano (quello che fa la luce: medio pesato con la sezione), versoLaStellaKgS, soffiatiKgS, taglie: [...],
//   profilo(rM) → { tau, massa (kg/m²), numero (per m²), raggioGrano } a ogni distanza dentro la fascia }
export function polvereDellaFascia(f, st, { taglieN = 32 } = {}) {
  const tg = f.taglieCalde || f.taglie; if (!(f.tempoUrti < Infinity) || !(st.Lw > 0) || !(tg.natiGrandi > 0)) return null;
  const rho = tg.densita, r = IMPATTI.rottura[f.materiale], mu = G * st.M, area = PI * (f.a2 * f.a2 - f.a1 * f.a1), per = PI2 * Math.sqrt(f.a ** 3 / mu), v = f.velocitaUrti, sigma = Math.max(1e-4, (ORBITE.ripartizione * f.e) / ORBITE.rayleigh);
  const aBl = (3 * st.Lw * SS.pressioneLuce) / (16 * PI * G * st.M * K.c * rho * 0.5), aTop = Math.max(SS.polvere.aMax, 30 * aBl), h = Math.log(aTop / aBl) / taglieN, B = [];
  // (sopra aTop la cascata è intatta: la sua profondità ottica, sommata fino ai corpi nati grandi)
  let tauSopra = 0; { const n = 60, hh = Math.log(tg.D0 / (2 * aTop)) / n; for (let i = 0; i < n; i++) { const D1 = 2 * aTop * Math.exp(i * hh), D2 = D1 * Math.exp(hh); tauSopra += ((tg.sopra(D1) - (i === n - 1 ? 0 : tg.sopra(D2))) * PI * D1 * D2) / 4 / area; } }
  for (let j = 0; j < taglieN; j++) { const lo = aBl * Math.exp(j * h), hi = lo * Math.exp(h), a = Math.sqrt(lo * hi), nC = tg.sopra(2 * lo) - tg.sopra(2 * hi), beta = betaGrano(a, st.Lw, st.M, rho), Qs = r.q0 * Math.pow(100 * a, r.a);
    B.push({ a, lo, hi, beta, massa: (PI4 / 3) * rho * a ** 3, sez: PI * a * a, nC, tauC: (nC * PI * a * a) / area, aRompe: a * Math.min(1, Math.cbrt((2 * Qs) / (v * v))), tEsce: (K.c * (f.a2 * f.a2 - f.a1 * f.a1)) / (8 * mu * beta), n: nC }); }
  // la profondità ottica di chi ha raggio ≥ x (dentro una taglia, in proporzione al logaritmo)
  const sopra = (x, campo) => { let s = tauSopra; for (const b of B) { if (b.hi <= x) continue; s += b[campo] * (b.lo >= x ? 1 : Math.log(b.hi / x) / h); } return s; };
  for (let giro = 0; giro < 6; giro++) { for (const b of B) b.tau = (b.n * b.sez) / area; let flusso = 1;
    for (let j = taglieN - 1; j >= 0; j--) { const b = B[j], tA = sopra(b.aRompe, 'tau'), tCas = sopra(b.aRompe, 'tauC'); b.tUrti = per / (SS.urtiPerGiro * tA); b.phi = 1 / (1 + b.tUrti / b.tEsce); b.n = b.nC * (tCas / tA) * b.phi * flusso; flusso *= b.phi; } }
  let tau = 0, massa = 0, sez = 0, sezA = 0, verso = 0; const r0 = f.a1, vr0 = (bb) => (2 * mu * bb.beta) / (K.c * r0), per0 = PI2 * Math.sqrt(r0 ** 3 / mu);
  for (const b of B) { b.tau = (b.n * b.sez) / area; tau += b.tau; massa += b.n * b.massa; sez += b.n * b.sez; sezA += b.n * b.sez * b.a; b.perS = b.n / b.tEsce; verso += b.perS * b.massa; b.tauBordo = ((b.perS / (PI2 * r0 * vr0(b))) * b.sez); }
  for (const b of B) { const tU = per0 / (SS.urtiPerGiro * Math.max(1e-300, sopra(b.aRompe, 'tauBordo') - tauSopra)); b.eta = tempoPR(r0, b.beta, st.M) / tU; }
  const soffiati = f.polvereKgS != null ? Math.max(0, f.polvereKgS - verso) : null;
  const profilo = (rM) => { if (rM >= f.a1) return rM <= f.a2 ? { tau, massa: massa / area, numero: B.reduce((x, b) => x + b.n, 0) / area, raggioGrano: sez > 0 ? sezA / sez : 0 } : { tau: 0, massa: 0, numero: 0, raggioGrano: 0 };
    const x = 1 - Math.sqrt(rM / r0); let t = 0, m = 0, n = 0, ta = 0; for (const b of B) { const tb = b.tauBordo / (1 + 4 * b.eta * x); t += tb; m += (tb / b.sez) * b.massa; n += tb / b.sez; ta += tb * b.a; } return { tau: t, massa: m, numero: n, raggioGrano: t > 0 ? ta / t : 0 }; };
  return { sigma, raggioSoffiato: aBl, tau, massaKg: massa, raggioGrano: sez > 0 ? sezA / sez : 0, versoLaStellaKgS: verso, soffiatiKgS: soffiati, tauBordo: B.reduce((x, b) => x + b.tauBordo, 0), densita: rho, taglie: B.map((b) => ({ raggio: b.a, beta: b.beta, tau: b.tau, tauBordo: b.tauBordo, eta: b.eta, prosegue: b.phi })), profilo };
}
// dove un grano evapora: i silicati dove un corpo nero arriva a SISTEMA.polvere.evapora, (L/16πσ)^½/T² (per il Sole 0,034 UA:
// lo stesso bordo di disco.js); il ghiaccio dove sublima più in fretta di quanto la frenata lo porti dentro (non dipende
// dalla taglia: tutti e due i tempi vanno come il raggio del grano) [D, con la sublimazione di anelli.js]
export function bordiDellaPolvere(st) {
  if (!(st.Lw > 0)) return { silicati: 0, ghiaccio: 0 }; const Tg = (rM) => Math.pow(st.Lw / (16 * PI * K.sigma * rM * rM), 0.25), sil = Math.sqrt(st.Lw / (16 * PI * K.sigma)) / SS.polvere.evapora ** 2, a = 1e-5, beta = betaGrano(a, st.Lw, st.M, MATERIALI.ghiaccio.densita);
  let lo = sil, hi = 1e4 * UA; for (let k = 0; k < 60; k++) { const m = Math.sqrt(lo * hi); if (a / Math.max(1e-300, sublimazione(Tg(m))) < tempoPR(m, beta, st.M)) lo = m; else hi = m; }
  return { silicati: sil, ghiaccio: Math.sqrt(lo * hi), temperatura: Tg };
}
// LA LUCE ZODIACALE vista da rOss (nel piano) guardando a `elongazione` dalla stella, nel piano: ∫ (sezione per volume) ·
// (luce della stella lì) · albedo · fase(θ) lungo la linea di vista [D]. → { brillanza (W/m²/sr), suStella: rispetto alla
// brillanza media del disco della stella, L/(4π²R²) }. polvere: quello di corpiMinori (o qualunque { sezioneA(r, lat) })
export function luceZodiacale(polvere, st, { rOss = UA, elongazione = PI / 2, lat = 0 } = {}) {
  const ce = Math.cos(elongazione), se = Math.sin(elongazione), n = 400, lMax = 60 * rOss, h = Math.log(lMax / (1e-4 * rOss)) / n; let I = 0;
  for (let i = 0; i < n; i++) { const l = 1e-4 * rOss * Math.exp((i + 0.5) * h), x = rOss - l * ce, y = l * se, r = Math.hypot(x, y), cosTheta = -((x * -ce + y * se) / r) /* tra (stella → grano) e (grano → chi guarda) */;
    I += polvere.sezioneA(r, lat) * (st.Lw / (PI4 * r * r)) * SS.polvere.albedo * fasePolvere(Math.acos(stringi(cosTheta, -1, 1))) * l * h; }
  const Rst = st.T > 0 ? Math.sqrt(st.Lw / (PI4 * K.sigma * st.T ** 4)) : RSOLE; return { brillanza: I, suStella: I / (st.Lw / (4 * PI * PI * Rst * Rst)) };
}

// ---------- IL SISTEMA VISTO DA QUI
const stellaDi = (Sis) => {
  const s = Sis.stella || {}, M = (s.massa || 1) * MSOLE, viva = !s.stato || s.stato === 'in vita' || s.stato === 'gigante rossa', p0 = (Sis.pianeti || [])[0];
  const Lw = p0?.Lw ?? (viva ? ST.stella(s.massa || 1, { Z: s.Z ?? 1, eta: s.eta }).L * LSOLE : 0), T = s.T > 0 ? s.T : viva ? ST.stella(s.massa || 1, { Z: s.Z ?? 1, eta: s.eta }).T : 0;
  return { M, Lw, T, eta: s.eta ?? 4.5e9, Z: s.Z ?? 1, massa: s.massa || 1, massaNascita: s.massaNascita || s.massa || 1, viva };
};
// la storia degli impatti di un pianeta: quella di cosmo.js (p.impatti, calcolata una volta) se c'è; se il sistema è
// fatto a mano (le prove), la stessa funzione con la sorgente del pianeta sotto quella data
const storie = new WeakMap();
function storiaDi(Sis, p, caso) {
  let m = storie.get(Sis); if (!m) storie.set(Sis, (m = new Map())); if (m.has(p)) return m.get(p);
  let v = null; try { v = Object.getOwnPropertyDescriptor(p, 'impatti') ? p.impatti : storiaImpatti(p, Sis, caso.sotto(`pianeta ${p.id}`)); } catch { v = null; }
  m.set(p, v); return v;
}
const schedaPianeta = (p, Mst) => { const aM = p.aM ?? p.aUA * UA, vK = Math.sqrt((G * Mst) / aM), vf = Math.sqrt((2 * G * p.massaKg) / p.raggioM); return { p, aM, aUA: aM / UA, mu: p.massaKg / Mst, vK, vf, fionda: (vf * vf) / (2 * vK * vK), hill: aM * Math.cbrt(p.massaKg / (3 * Mst)) }; };

// ---------- LE RISONANZE di un pianeta dentro una fascia tra a1 e a2 (metri) [D: terza legge di Keplero; larghezza: pendolo]
// La larghezza di librazione: δa/a = √(16·μ·(α f_d)·e^|q| / 3) (Murray & Dermott 1999, eq. 8.76, senza il termine di
// pressione), con e l'eccentricità tipica della fascia. Dove il coefficiente manca: null.
export function risonanzeIn(a1, a2, pianeti, eTipica = 0.1) {
  const out = [];
  for (const s of pianeti) for (const [nome, p, q, ordine, af] of SS.risonanze) for (const dentro of [true, false]) {
    const a = s.aM * Math.pow(dentro ? q / p : p / q, 2 / 3); if (a < a1 || a > a2) continue;
    out.push({ nome: dentro ? nome : `${q}:${p}`, con: s.p.id, aM: a, aUA: a / UA, ordine, larghezza: af == null ? null : a * Math.sqrt((16 * s.mu * af * Math.pow(eTipica, ordine)) / 3), interna: dentro });
  }
  return out.sort((x, y) => x.aM - y.aM);
}

// ---------- LA NUBE ESTERNA DI COMETE [D]
// rho: la densità di materia attorno al sistema (kg/m³: stelle e gas della galassia in quel punto). Per un pianeta che
// scaglia (scheda s): dove comincia la nube e che parte dei corpi scagliati ci resta.
function nubeDa(s, Mst, rho, eta = 4.5e9) {
  const Dx = (SS.calcio * s.mu) / s.aM; // il calcio in 1/a (per metro) a ogni passaggio
  // A un semiasse a la cometa resta, prima che i calci la portino altrove, t_r = P(a)·max(1, 1/(a·Dx)²): molti giri se i
  // calci sono piccoli rispetto alla sua energia (cammina a caso), uno solo se sono grandi. La marea della galassia le
  // cambia il momento angolare di quanto serve a staccare il perielio dal pianeta in t_q = √(2GM·a_p)/(4πGρ·a²).
  // La nube comincia dove t_q = t_r:  calci piccoli → a = [GM·√(2a_p)·Dx²/(8π²Gρ)]^(2/3);
  //                                   calci grandi  → a^3,5 = GM·√(2a_p)/(8π²Gρ) (il perielio si stacca in un giro solo).
  // E la marea deve averne avuto il tempo nell'età del sistema: t_q(a) ≤ età → a ≥ √(√(2GM·a_p)/(4πGρ·età)).
  const c = (G * Mst * Math.sqrt(2 * s.aM)) / (8 * PI * PI * G * rho), piccoli = Math.pow(c * Dx * Dx, 2 / 3), aPari = piccoli * Dx <= 1 ? piccoli : Math.pow(c, 1 / 3.5);
  const aEta = Math.sqrt(Math.sqrt(2 * G * Mst * s.aM) / (PI4 * G * rho * eta * ANNO)), aIn = Math.max(aPari, aEta), aOut = bordoNube(Mst, rho);
  // quanta parte ci resta: la cometa cammina in 1/a a passi Dx verso lo zero (oltre, è persa); la nube è la finestra tra
  // 1/a_esterno e 1/a_interno: se è più larga di un passo ci cade dentro di sicuro, se no con probabilità finestra/passo
  return { aIn, aPari, aEta, calcio: Dx, unGiro: piccoli * Dx > 1, resta: Math.min(1, Math.max(0, 1 / aIn - 1 / aOut) / Dx) };
}
// il bordo esterno: dove la marea vince la stella, (M/4πρ)^(1/3); e da dove il «cono di perdita» è sempre pieno (la
// marea sposta il perielio di più di q in un giro): a^3,5 = GM·√(2q)/(8π²Gρ)
function bordoNube(Mst, rho) { return Math.cbrt(Mst / (PI4 * rho)); }
const conoPieno = (Mst, rho, q) => Math.pow((G * Mst * Math.sqrt(2 * q)) / (8 * PI * PI * G * rho), 1 / 3.5);

// ---------- UNA COMETA ALLA LUCE DELLA STELLA
// la temperatura del punto sotto la stella e quanta acqua sublima lì (kg/m²/s): (1−A)·L/(4πr²) = ε·σ·T⁴ + Z(T)·calore,
// con Z(T) dalla pressione di vapore del ghiaccio (anelli.js `sublimazione`, la stessa legge degli anelli) [D]
export function sublimaA(rM, Lw) {
  const c = SS.cometa, F = ((1 - c.albedo) * Lw) / (PI4 * rM * rM), Zdi = (T) => sublimazione(T) * MATERIALI.ghiaccio.densita; let lo = 20, hi = 600;
  for (let k = 0; k < 50; k++) { const T = 0.5 * (lo + hi); if (c.emissivita * K.sigma * T ** 4 + Zdi(T) * LEGGI_ANELLI.calore < F) lo = T; else hi = T; }
  const T = 0.5 * (lo + hi), Zs = Zdi(T); return { T, flusso: Zs, inVapore: F > 0 ? (Zs * LEGGI_ANELLI.calore) / F : 0 };
}
// la distanza a cui una cometa si accende: dove metà della luce assorbita va in vapore
export function distanzaAttiva(Lw) { let lo = 0.01 * UA, hi = 100 * UA; for (let k = 0; k < 50; k++) { const m = Math.sqrt(lo * hi); if (sublimaA(m, Lw).inVapore > 0.5) lo = m; else hi = m; } return Math.sqrt(lo * hi); }
// β di un grano di raggio a (m) e densità rho attorno a una stella di luminosità Lw e massa Mst [D]
export const betaGrano = (a, Lw, Mst, rho = MATERIALI.roccia.densita, Q = SS.pressioneLuce) => (3 * Lw * Q) / (16 * PI * G * Mst * K.c * rho * a);
// il tempo in cui un grano su un'orbita tonda di raggio r scende a spirale sulla stella (Poynting 1903, Robertson 1937;
// Wyatt & Whipple 1950): t = c·r²/(4·G·M·β) (secondi) [D]
export const tempoPR = (rM, beta, Mst) => (K.c * rM * rM) / (4 * G * Mst * beta);
// dove finisce un grano lasciato da un corpo (stato: pos, vel) dopo tau secondi, se la luce gli toglie la parte β della
// gravità: due corpi con G·M·(1−β), integrati (Runge–Kutta 4) [D]
function granoDopo(stato, tau, mu, beta, passi = 24) {
  const m = mu * (1 - beta), h = tau / passi; let x = stato.pos[0], y = stato.pos[1], z = stato.pos[2], vx = stato.vel[0], vy = stato.vel[1], vz = stato.vel[2];
  for (let i = 0; i < passi; i++) { // (senza vettori d'appoggio: è il conto più ripetuto di una cometa)
    let r = Math.sqrt(x * x + y * y + z * z), k = -m / (r * r * r); const a1x = k * x, a1y = k * y, a1z = k * z, x2 = x + 0.5 * h * vx, y2 = y + 0.5 * h * vy, z2 = z + 0.5 * h * vz, u2x = vx + 0.5 * h * a1x, u2y = vy + 0.5 * h * a1y, u2z = vz + 0.5 * h * a1z;
    r = Math.sqrt(x2 * x2 + y2 * y2 + z2 * z2); k = -m / (r * r * r); const a2x = k * x2, a2y = k * y2, a2z = k * z2, x3 = x + 0.5 * h * u2x, y3 = y + 0.5 * h * u2y, z3 = z + 0.5 * h * u2z, u3x = vx + 0.5 * h * a2x, u3y = vy + 0.5 * h * a2y, u3z = vz + 0.5 * h * a2z;
    r = Math.sqrt(x3 * x3 + y3 * y3 + z3 * z3); k = -m / (r * r * r); const a3x = k * x3, a3y = k * y3, a3z = k * z3, x4 = x + h * u3x, y4 = y + h * u3y, z4 = z + h * u3z, u4x = vx + h * a3x, u4y = vy + h * a3y, u4z = vz + h * a3z;
    r = Math.sqrt(x4 * x4 + y4 * y4 + z4 * z4); k = -m / (r * r * r); const a4x = k * x4, a4y = k * y4, a4z = k * z4;
    x += (h / 6) * (vx + 2 * u2x + 2 * u3x + u4x); y += (h / 6) * (vy + 2 * u2y + 2 * u3y + u4y); z += (h / 6) * (vz + 2 * u2z + 2 * u3z + u4z);
    vx += (h / 6) * (a1x + 2 * a2x + 2 * a3x + a4x); vy += (h / 6) * (a1y + 2 * a2y + 2 * a3y + a4y); vz += (h / 6) * (a1z + 2 * a2z + 2 * a3z + a4z); }
  return [x, y, z];
}
// LA CHIOMA E LE CODE di un nucleo di diametro D (m) nello stato dato (pos, vel rispetto alla stella), al tempo t.
// Niente scatta a una distanza: la sublimazione cresce con continuità avvicinandosi (`attivita`: la parte della luce
// assorbita che va in vapore; `attiva` dice solo se ha passato la metà), e ogni grandezza la segue.
//   · IL GAS: acqua al ritmo del punto sotto la stella per la sezione del nucleo; esce alla velocità termica.
//   · CHE COSA BRILLA nella chioma [D + dati di SISTEMA.figlie]: le molecole figlie (C₂, CN, C₃) nascono in proporzione
//     all'acqua e durano `vita` (accorciata dall'ultravioletto della stella lì): ce ne sono Q·rapporto·vita; ognuna rimanda
//     g watt della luce della stella nella sua banda (fluorescenza: g vale per il Sole a 1 UA, e va con la luce della
//     stella A QUELLA lunghezza d'onda). Per questo una cometa attorno a una stella rossa ha la chioma verde più spenta.
//   · LA CODA DI IONI: la parte del CO che la luce ionizza invece di spezzare, portata via dal vento; gli ioni che si
//     vedono sono quelli nati nel tempo che il vento impiega a percorrere `lunghezza` accelerandoli (2·lunghezza/v_vento).
//   · LA POLVERE: ciò che non è ghiaccio (disco.js: nei solidi oltre la neve i ghiacci sono DISCO.ghiaccio; il resto esce
//     con il gas: polvere/gas = (1 − ghiaccio)/ghiaccio), in grani da 0,1 µm al più grosso che il gas riesce a sollevare
//     contro la gravità del nucleo, a_max = 3·C_D·Z·v_gas/(8·ρ·g) [D], con le taglie della cascata (dn/da ∝ a^−p, la
//     pendenza di esponenteCascata per il ghiaccio). Un grano esce con la velocità che il gas gli dà trascinandolo mentre
//     si dirada: v² = 3·C_D·Z·v_gas·R/(4·ρ·a) [D: lavoro dell'attrito in un gas che cala come 1/r²; Whipple 1951], mai più
//     del gas. Poi la luce gli toglie la parte β della gravità: `punti` dà dove sta OGGI un grano di ogni taglia lasciato
//     1, 3, …, 240 giorni fa (a taglia fissa una sindine, a età fissa una sincrona), con quanto produceva allora la cometa.
export function chiomaECode(D, stato, st, el = null, t = 0) {
  const r = Math.hypot(...stato.pos), s = sublimaA(r, st.Lw), versoStella = stato.pos.map((x) => -x / r), L = luceA(st, r), Rn = D / 2, C = SS.cometa, GC = SS.graniCometa;
  const gas = s.flusso * PI * Rn * Rn, molecole = gas / (18 * K.mp), vGas = Math.sqrt((8 * K.kB * s.T) / (PI * 18 * K.mp)), vita = SS.vitaAcqua / Math.max(L.uv, 1e-300), chiomaR = vGas * vita, vV = RISALITA.VELOCITA_VENTO;
  const nucleo = { raggio: Rn, albedo: C.albedo, colore: LEGGI_ANELLI.colore.roccia, fase: { legge: 'lineare', magPerGrado: SS.nucleo.fase }, densita: C.densita };
  // la chioma: le righe in watt (e, per molecola d'acqua al secondo, il colore: non dipende da quanta acqua esce)
  const perAcqua = SS.figlie.map((m) => ({ nome: m.nome, nm: m.nm, W: (m.suAcqua * m.vita / Math.max(L.uv, 1e-300)) * m.g * L.a(m.nm) })), righeChioma = perAcqua.map((x) => ({ ...x, W: x.W * molecole, molecole: (x.W * molecole) / Math.max(1e-300, SS.figlie.find((m) => m.nome === x.nome).g * L.a(x.nm)) }));
  // la coda di ioni: lungo il vento VISTO DALLA COMETA (per questo resta un po' indietro rispetto alla direzione opposta alla
  // stella) [D]. `lunghezza` è quanto il vento percorre nella vita di una molecola d'acqua lì: un ORDINE DI GRANDEZZA, non un
  // bordo (la coda sfuma: dove la si smette di vedere dipende da chi guarda)
  const w = [0, 1, 2].map((d) => -versoStella[d] * vV - stato.vel[d]), wn = Math.hypot(...w), lunghezza = vV * vita, ionizzata = SS.CO.ionizza / (SS.CO.ionizza + SS.CO.spezza), ioni = molecole * SS.CO.suAcqua * ionizzata * ((2 * lunghezza) / vV);
  const rigaIoni = { nome: SS.CO.nome, nm: SS.CO.nm, W: ioni * SS.CO.g * L.a(SS.CO.nm), molecole: ioni };
  const codaIoni = { direzione: w.map((x) => x / wn), lunghezza, velocita: vV, scarto: (Math.acos(stringi(-(w[0] * versoStella[0] + w[1] * versoStella[1] + w[2] * versoStella[2]) / wn, -1, 1)) * 180) / PI, ioni, perSecondo: molecole * SS.CO.suAcqua * ionizzata,
    righe: [rigaIoni], W: rigaIoni.W, emette: { righe: [rigaIoni], colore: coloreVero([{ nm: SS.CO.nm, W: 1 }]).rgb } };
  // la polvere
  const rhoG = MATERIALI.roccia.densita, gN = (PI4 / 3) * G * C.densita * Rn, aMax = Math.max(GC.aMin, (3 * GC.CD * s.flusso * vGas) / (8 * rhoG * gN)), p = esponenteCascata(IMPATTI.rottura.ghiaccio.a), suGas = (1 - DISCO.ghiaccio) / DISCO.ghiaccio, kgS = suGas * gas;
  const peso = (a1, a2) => (a2 > a1 ? Math.pow(a2, 4 - p) - Math.pow(a1, 4 - p) : 0), tutto = peso(GC.aMin, aMax), mu = G * st.M, F = st.Lw / (PI4 * r * r), uscitaDi = (a) => { const v2 = (3 * GC.CD * s.flusso * vGas * Rn) / (4 * rhoG * a); return Math.sqrt((v2 * vGas * vGas) / (v2 + vGas * vGas)); };
  const eta = GC.giorni.map((g) => g * GIORNO), allora = el && s.flusso > 0 ? eta.map((tau) => { const prima = statoKeplero(el, t - tau), rr = Math.hypot(...prima.pos); return { prima, attivita: sublimaA(rr, st.Lw).flusso / s.flusso }; }) : null;
  let sezioneChioma = 0; const grani = GC.taglie.map((a, k) => { const lo = k === 0 ? GC.aMin : Math.sqrt(GC.taglie[k - 1] * a), hi = Math.min(aMax, k === GC.taglie.length - 1 ? Infinity : Math.sqrt(a * GC.taglie[k + 1])), parte = tutto > 0 ? peso(lo, Math.max(lo, hi)) / tutto : 0;
    const beta = st.Lw > 0 ? betaGrano(a, st.Lw, st.M) : 0, uscita = uscitaDi(a), massa = (PI4 / 3) * rhoG * a ** 3, perSecondo = (kgS * parte) / massa, punti = [];
    sezioneChioma += perSecondo * PI * a * a * (chiomaR / Math.max(uscita, 1e-9));
    if (allora && parte > 0 && s.inVapore > 1e-4) eta.forEach((tau, q) => { const dove = granoDopo(allora[q].prima, tau, mu, Math.min(beta, 0.999), Math.max(12, Math.min(240, Math.ceil(GC.giorni[q])))); punti.push({ giorni: GC.giorni[q], eta: tau, pos: dove, dalNucleo: Math.hypot(dove[0] - stato.pos[0], dove[1] - stato.pos[1], dove[2] - stato.pos[2]), attivita: allora[q].attivita, larghezza: uscita * tau }); });
    return { raggioGrano: a, beta, soffiato: beta > 0.5, uscita, kgS: kgS * parte, perSecondo, parte, punti }; });
  // la luce: quella che i grani della chioma rimandano (sezione × luce della stella × albedo: in tutte le direzioni, prima
  // della funzione di fase) e, in lumen, tutto ciò che si vede (righe pesate con la curva dell'occhio, più la polvere)
  const diffusa = sezioneChioma * F * SS.polvere.albedo, lumen = 683 * [...righeChioma, rigaIoni].reduce((x, q) => x + q.W * occhio(q.nm)[1], 0) + (st.T > 0 ? efficaciaLuminosa(st.T) : 0) * diffusa;
  const tinta = st.T > 0 ? coloreVero([], { T: st.T, W: 1 }).rgb : null;
  return { attiva: s.inVapore > 0.5, attivita: s.inVapore, T: s.T, distanza: r, acquaKgS: gas, molecoleS: molecole, velocitaGas: vGas, vitaAcqua: vita, nucleo,
    chioma: { raggio: chiomaR, righe: righeChioma, W: righeChioma.reduce((x, q) => x + q.W, 0), polvere: { sezione: sezioneChioma, W: diffusa, colore: tinta }, emette: { righe: righeChioma, colore: coloreVero(perAcqua.map((x) => ({ nm: x.nm, W: x.W })), st.T > 0 && molecole > 0 ? { T: st.T, W: diffusa / molecole } : null).rgb } },
    codaIoni, codaPolvere: { kgS, suGas, taglie: { esponente: p, aMin: GC.aMin, aMax, legge: 'dn/da ∝ a^−p' }, eta, grani, direzione: versoStella.map((x) => -x), albedo: SS.polvere.albedo, fase: { legge: 'tre Henyey–Greenstein', g: SS.polvere.g, pesi: SS.polvere.pesi }, densitaGrano: rhoG, colore: tinta, emette: 'la luce della stella diffusa dai grani' },
    lumen, magnitudineA1UA: magnitudineDa(lumen, UA) };
}

// ---------- IL VENTO DELLA STELLA a una distanza (risalita.js: la stessa legge che toglie l'aria ai pianeti)
export function ventoA(Sis, rM) {
  const st = stellaDi(Sis); if (!st.viva || !(st.Lw > 0)) return { protoni: 0, velocita: 0, flussoMassa: 0 };
  const v = ventoStellare({ stella: { Lw: st.Lw, aM: rM }, etaPianeta: st.eta }, { stella: { massa: st.massa, T: st.T, eta: st.eta } });
  return v ? { protoni: v.flussoMassa / RISALITA.VELOCITA_VENTO / K.mp, velocita: RISALITA.VELOCITA_VENTO, flussoMassa: v.flussoMassa, pressione: v.pressione, perditaStella: v.perditaStella } : { protoni: 0, velocita: 0, flussoMassa: 0 };
}

// =====================================================================================================
// corpiMinori: tutto ciò che gira attorno a una stella e non è un pianeta né una luna
// =====================================================================================================
// Sis: il sistema di cosmo.js (sistema(n, gid, sid): { stella, pianeti, disco }) o uno fatto con le stesse funzioni;
// t: secondi da oggi; opz: { caso (la sorgente del sistema: «cosmo 1/galassia 3/stella 53»), attorno (kg/m³: la materia
// della galassia lì; se manca, quella attorno al Sole, e lo dice), massimo (corpi elencati per fascia), diametroMin (m) }.
// → { fasce: [{ nome, origine, materiale, a1, a2 (m), inizioKg, oggiKg, taglie, risonanze, corpi(n) }], nube, comete,
//     polvere, vento(rM), flusso: [per pianeta], espulso, corpi: [i più grandi di ogni fascia, con orbita e stato a t] }
const fatti = new WeakMap();
export function corpiMinori(Sis, t = 0, { caso = sorgente('sistema'), attorno = null, massimo = 40, diametroMin = 1e3 } = {}) {
  const st = stellaDi(Sis), Mst = st.M, mu = G * Mst, c0 = caso.sotto('vuoto'), rho = attorno ?? SS.densitaSole;
  let F = fatti.get(Sis); if (F && F.rho !== rho) F = null;
  if (!F) { // ---- ciò che non dipende dal tempo: una volta per sistema
    const sk = (Sis.pianeti || []).map((p) => schedaPianeta(p, Mst)), imp = sk.map((s) => storiaDi(Sis, s.p, caso)), fasce = [];
    // (a) LE FASCE ORFANE: i sassi rimasti di un corpo scacciato (formazione.orfani); la massa di oggi è quella che impatti.js
    // ha seguito (bilancio.fasce: «fascia r.k»), se la fascia arriva a un pianeta; se no resta quella iniziale
    const diImpatti = new Map(); for (const b of imp) for (const f of b?.bilancio?.fasce || []) if (!diImpatti.has(f.da)) diImpatti.set(f.da, f);
    sk.forEach((s) => (s.p.formazione?.orfani || []).forEach((o, k) => {
      const nome = `fascia ${s.p.id}.${k}`, f = diImpatti.get(nome), a = o.aUA * UA, vK = Math.sqrt(mu / a), Ro = Math.cbrt((3 * o.massaKg) / (PI4 * MATERIALI[o.ghiaccio > 0.3 ? 'ghiaccio' : 'roccia'].densita)), vf = Math.sqrt((2 * G * o.massaKg) / Ro), fi = (vf * vf) / (2 * vK * vK);
      const inizio = f ? f.inizioKg : (o.ciboKg || 0) + (o.massaKg * fi * fi) / (1 + fi * fi), e = Math.min(DISCO.eMax, vf / vK); // (se impatti.js non l'ha vista: la sua stessa stima, riscritta)
      fasce.push({ nome, origine: `i sassi rimasti orfani di un corpo di ${(o.massaKg / MTERRA).toFixed(2)} Terre che il pianeta ${s.p.id} ha scacciato ${o.dentro ? 'verso la stella' : 'fuori'}`, materiale: o.ghiaccio > 0.3 ? 'ghiaccio' : 'roccia', a: a, a1: a * (1 - e), a2: a * (1 + e), e, inizioKg: inizio, oggiKg: f ? f.oggiKg : inizio, polvereKg: f?.polvereKg ?? 0, seguita: !!f, da: s.p.id });
    }));
    // (b) I RESTI ATTORNO AI PIANETI LENTI: il cibo che un embrione non ha finito (impatti.js: rimastaKg + daRilasciareKg). La
    // massa iniziale è tutto ciò che è entrato nella stessa nube, più ciò che deve ancora entrarvi: con il cibo anche i detriti
    // dell'ultimo urto gigante (impatti.js entrataKg). (Prima era il solo cibo, restiKg, e la fascia oggi pesava più di quanto
    // avesse mai avuto: fino a milioni di volte, dove i detriti sono quasi tutto)
    sk.forEach((s, i) => { const b = imp[i]?.bilancio; if (!b) return; const m = (b.rimastaKg || 0) + (b.daRilasciareKg || 0); if (!(m > 0)) return;
      const meta = DISCO.C * s.aM * Math.cbrt((s.p.formazione?.mIso ?? s.p.massaKg) / (3 * Mst)), ghiaccio = s.p.tipo !== 'roccioso';
      fasce.push({ nome: `resti del pianeta ${s.p.id}`, origine: `la striscia di disco che il pianeta ${s.p.id}, cresciuto piano, non ha finito di mangiare`, materiale: ghiaccio ? 'ghiaccio' : 'roccia', a: s.aM, a1: Math.max(0.5 * s.aM, s.aM - meta), a2: s.aM + meta, e: Math.min(DISCO.eMax, s.vf / s.vK), caldaKg: b.rimastaKg || 0 /* la parte che il pianeta ha già rimescolato; il resto (daRilasciareKg) gira ancora tondo, lontano da lui */, inizioKg: (b.entrataKg || 0) + (b.daRilasciareKg || 0) || m, oggiKg: m, polvereKg: b.polvereKg || 0, seguita: true, da: s.p.id, popolazione: imp[i].popolazione }); });
    // (c) LA FASCIA ESTERNA: i solidi del disco oltre la striscia dell'ultimo pianeta (disco.js: sigmaSolidi fino a rOut).
    // Lì gli embrioni sono rimasti sotto la soglia di pianeta: disco.js non li restituisce (che cosa manca a monte)
    const D = Sis.disco; if (D && sk.length) { const u = sk[sk.length - 1], r1 = (u.aM + DISCO.C * u.aM * Math.cbrt((u.p.formazione?.mIso ?? u.p.massaKg) / (3 * Mst))) / UA, r2 = D.rOut;
      if (r2 > r1) { let m = 0; const n = 60, h = Math.log(r2 / r1) / n; for (let i = 0; i < n; i++) { const r = r1 * Math.exp((i + 0.5) * h); m += PI2 * r * UA * D.sigmaSolidi(r) * r * UA * h; }
        fasce.push({ nome: 'fascia esterna', origine: 'i solidi del disco oltre l\'ultimo pianeta: corpi rimasti piccoli e ciò che non hanno mangiato', materiale: 'ghiaccio', a: 0.5 * (r1 + r2) * UA, a1: r1 * UA, a2: r2 * UA, e: (0.5 * IMPATTI.planetesimo * Math.sqrt((8 * PI * G * MATERIALI.ghiaccio.densita) / 3)) / Math.sqrt(mu / (0.5 * (r1 + r2) * UA)) /* nessun pianeta la rimescola: solo i suoi corpi più grandi, con la loro velocità di fuga (Safronov) */, inizioKg: m, oggiKg: m, polvereKg: 0, seguita: false, da: null }); } }
    for (const f of fasce) f.taglie = taglie(f.oggiKg, f.materiale);
    const esaurite = fasce.filter((f) => !(f.taglie.sopra(diametroMin) >= 1)).map((f) => ({ nome: f.nome, inizioKg: f.inizioKg, oggiKg: f.oggiKg })); // macinate o spazzate: meno di un corpo sopra la taglia minima
    for (let i = fasce.length - 1; i >= 0; i--) if (!(fasce[i].taglie.sopra(diametroMin) >= 1)) fasce.splice(i, 1);
    for (const f of fasce) { // le taglie, le risonanze, la zona caotica dei pianeti (Wisdom 1980: 1,3·μ^(2/7), lo stesso numero di anelli.js)
      f.risonanze = risonanzeIn(f.a1, f.a2, sk, Math.max(f.e, 0.01));
      f.vuoti = [...f.risonanze.filter((x) => x.larghezza > 0 && x.ordine <= 2).map((x) => [x.aM - x.larghezza, x.aM + x.larghezza, x.nome]), ...sk.filter((s) => f.da !== s.p.id || !f.nome.startsWith('resti')).map((s) => [s.aM * (1 - LEGGI_ANELLI.caotica * Math.pow(s.mu, 2 / 7)), s.aM * (1 + LEGGI_ANELLI.caotica * Math.pow(s.mu, 2 / 7)), `pianeta ${s.p.id}`])];
      f.eFredda = (0.5 * IMPATTI.planetesimo * Math.sqrt((8 * PI * G * MATERIALI[f.materiale].densita) / 3)) / Math.sqrt(mu / f.a); // chi non è rimescolato da un pianeta ha solo la velocità di fuga dei suoi corpi più grandi (Safronov)
      if (f.caldaKg != null) f.taglieCalde = taglie(Math.max(f.caldaKg, 1e-300), f.materiale);
      Object.assign(f, f.caldaKg != null ? macina(f, mu, Math.max(f.caldaKg, 1e-300), f.e) : macina(f, mu)); f.polvereFine = polvereDellaFascia(f, st);
      f.superficie = superficieDi(f.materiale, f.taglie.D0); f.sigma = Math.max(1e-4, (ORBITE.ripartizione * (f.caldaKg != null ? f.eFredda : f.e)) / ORBITE.rayleigh); /* la larghezza in latitudine dei CORPI (rad) */ f.sopra1km = f.taglie.sopra(1e3); f.distanzaTraCorpi = f.sopra1km > 0 ? Math.cbrt(f.volume / f.sopra1km) : Infinity;
    }
    // LA NUBE ESTERNA E CIÒ CHE ESCE: ogni pianeta scaglia (impatti.js: scagliataKg); una parte resta nella nube, il resto è perso tra le stelle
    // E PRIMA ANCORA, finito il gas: i planetesimi che il pianeta ha diffuso senza mangiarli (disco.js formazione.cibiDiffusi:
    // Ida e Lin 2004, urto o diffusione col numero di Safronov). Dove Θ = v_fuga²/(2v_K²) > 1 il pianeta li manda oltre la
    // velocità di fuga dalla stella: sono espulsi. Di quelli una parte resta nella nube con l'efficienza delle simulazioni
    // della sua formazione (SISTEMA.intrappolati); gli altri sono persi tra le stelle. (Prima la nube era la sola scagliataKg,
    // ~10²² kg per il Sole dal disco di Kimura: i diffusi non arrivavano da nessuna parte)
    let inNube = 0, fuori = 0, aIn = Infinity, diffusi = 0; const perPianeta = [];
    sk.forEach((s, i) => { const m = imp[i]?.bilancio?.scagliataKg || 0, d = s.fionda > 1 ? s.p.formazione?.cibiDiffusi || 0 : 0; if (!(m > 0) && !(d > 0)) return; const n = nubeDa(s, Mst, rho, st.eta);
      inNube += m * n.resta + d * SS.intrappolati; fuori += m * (1 - n.resta) + d * (1 - SS.intrappolati); diffusi += d; aIn = Math.min(aIn, n.aIn); perPianeta.push({ pianeta: s.p.id, scagliataKg: m, resta: n.resta, diffusiKg: d, aIn: n.aIn }); });
    const aOut = bordoNube(Mst, rho), nube = inNube > 0 && aIn < aOut ? { massaKg: inNube, aIn, aOut, taglie: taglie(inNube, 'ghiaccio'), profilo: SS.nube, perPianeta } : null;
    if (nube) nube.sopra1km = nube.taglie.sopra(1e3);
    // i corpi scacciati interi (pianeti vaganti): quelli che la fionda ha mandato fuori (formazione.orfani, non «dentro»)
    const vaganti = []; sk.forEach((s) => (s.p.formazione?.orfani || []).forEach((o) => { if (!o.dentro) vaganti.push({ massaKg: o.massaKg, daUA: o.aUA, quando: o.t, ghiaccio: o.ghiaccio }); }));
    const conPolvere = fasce.filter((f) => f.polvereFine).map((f) => ({ nome: f.nome, a1: f.a1, a2: f.a2, materiale: f.materiale, polvere: f.polvereFine })), bordi = bordiDellaPolvere(st);
    const polvere = { fasce: conPolvere, bordi, fattaInTuttoKg: imp.reduce((x, b) => x + (b?.bilancio?.polvereKg || 0), 0), ritmoKgS: fasce.reduce((x, f) => x + f.polvereKgS, 0), versoLaStellaKgS: conPolvere.reduce((x, f) => x + f.polvere.versoLaStellaKgS, 0), soffiati: st.Lw > 0 ? (3 * st.Lw * SS.pressioneLuce) / (16 * PI * G * Mst * K.c * MATERIALI.roccia.densita * 0.5) : 0 };
    // la polvere che le comete lasciano passando (kg/s, in media): per ogni passaggio ∫(polvere/gas)·Z(r)·π(D/2)² dt lungo
    // un'orbita quasi parabolica (r da q a `entro` e ritorno; dt = dr/v_r, v_r = √(2GM/r)·√(1 − q/r)), media sui perieli
    // (uniformi) e sulle taglie (⟨D²⟩ della distribuzione sopra diametroMin) [D]
    const polvereComete = (ritmo, entro, nTot) => { if (!(ritmo > 0) || !nube) return 0; const tgN = nube.taglie; let D2 = 0; { const n = 60, h = Math.log(tgN.D0 / diametroMin) / n; for (let i = 0; i < n; i++) { const D1 = diametroMin * Math.exp(i * h), D2b = D1 * Math.exp(h); D2 += (tgN.sopra(D1) - tgN.sopra(D2b)) * D1 * D2b; } D2 = (D2 + tgN.natiGrandi * tgN.D0 ** 2) / nTot; }
      let perPassaggio = 0; const nq = 12, nr = 48; for (let iq = 0; iq < nq; iq++) { const qq = (entro * (iq + 0.5)) / nq, h = Math.log(entro / qq) / nr; for (let ir = 0; ir < nr; ir++) { const r = qq * Math.exp((ir + 0.5) * h), vr = Math.sqrt((2 * mu) / r) * Math.sqrt(Math.max(1e-9, 1 - qq / r)); perPassaggio += (2 * sublimaA(r, st.Lw).flusso * r * h) / vr / nq; } }
      return ((1 - DISCO.ghiaccio) / DISCO.ghiaccio) * perPassaggio * PI * (D2 / 4) * (ritmo / ANNO); };
    let rElenco = 0; if (st.Lw > 0) { let lo = 0.01 * UA, hi = 1e3 * UA; for (let k = 0; k < 50; k++) { const m = Math.sqrt(lo * hi); if (sublimaA(m, st.Lw).inVapore > 0.01) lo = m; else hi = m; } rElenco = Math.sqrt(lo * hi); }
    F = { rho, sk, imp, fasce, esaurite, nube, polvere, polvereComete, rElenco, espulso: { planetesimiKg: fuori, nellaNubeKg: inNube, diffusiKg: diffusi, pianetiVaganti: vaganti, perPianeta, attornoDato: attorno != null }, rAttiva: st.Lw > 0 ? distanzaAttiva(st.Lw) : 0 };
    fatti.set(Sis, F);
  }
  // ---- I CORPI DI UNA FASCIA, dal più grande in giù (lo stesso corpo allo stesso indirizzo, quanti se ne chiedano)
  const corpiDi = (f, quanti = massimo, minimo = diametroMin) => {
    const s = c0.serie(`${f.nome}/quanti`), out = [], tot = f.taglie.sopra(minimo); let Gm = 0;
    for (let j = 0; j < quanti; j++) { Gm += -logEsatto(1 - s(j)); if (Gm >= tot) break; const o = c0.sotto(`${f.nome}/corpo ${j}`), D = f.taglie.diametro(Gm);
      // il semiasse: nella fascia, fuori dalle lacune (fino a 8 tentativi, sempre gli stessi); eccentricità e inclinazione
      // di Rayleigh con lo scarto della fascia (orbite.js: l'inclinazione metà dell'eccentricità)
      const sa = o.serie('semiasse'); let a = f.a1 + sa(0) * (f.a2 - f.a1); for (let q = 1; q < 8 && f.vuoti.some((v) => a > v[0] && a < v[1]); q++) a = f.a1 + sa(q) * (f.a2 - f.a1);
      const ef = f.caldaKg != null && o('rimescolato') >= f.caldaKg / f.oggiKg ? f.eFredda : f.e, e = Math.min(0.9, (ef / ORBITE.rayleigh) * Math.sqrt(-2 * Math.log(1 - o('eccentricità')))), i = Math.min(1.2, ((ORBITE.ripartizione * ef) / ORBITE.rayleigh) * Math.sqrt(-2 * Math.log(1 - o('inclinazione'))));
      const el = { a, e, i, nodo: PI2 * o('nodo'), peri: PI2 * o('pericentro'), M0: PI2 * o('fase'), mu, epoca: 0, motoMedio: Math.sqrt(mu / a ** 3) }; el.assi = assiOrbita(el); const stato = statoKeplero(el, t), sup = superficieDi(f.materiale, D);
      out.push({ tipo: f.materiale === 'ghiaccio' ? 'corpo ghiacciato' : 'asteroide', indirizzo: `${c0.radice}/${f.nome}/corpo ${j}`, fascia: f.nome, diametroM: D, massaKg: f.taglie.massaDi(D), ...sup, elementi: el,
        orbita: { attorno: 'stella', a, e, inclinazione: i, nodo: el.nodo, pericentro: el.peri, M0: el.M0, epoca: 0, motoMedio: el.motoMedio, assi: el.assi, periodo: periodo(el) }, pos: stato.pos, vel: stato.vel, nellaLacuna: f.vuoti.some((v) => a > v[0] && a < v[1]) }); }
    return out;
  };
  // ---- LE COMETE: dalla nube esterna, dove il cono di perdita è pieno, cadono con perielio a caso; quante all'anno con
  // perielio sotto q: ∫ dN/da·(2q/a)/P(a) da [D: orbite quasi paraboliche con direzioni a caso]. Si elencano quelle
  // dentro `entro` = la distanza a cui l'1% della luce assorbita va in vapore (F.rElenco): non è una soglia d'accensione
  // (la chioma cresce con continuità: chiomaECode), è solo fin dove vale la pena contarle
  let comete = null;
  if (F.nube && F.rElenco > 0) {
    const N = F.nube, q = F.rElenco, nTot = N.taglie.sopra(diametroMin), norma = nTot / (2 * (Math.pow(N.aIn, -0.5) - Math.pow(N.aOut, -0.5))); // dN/da ∝ a^−1,5 tra aIn e aOut; il ritmo ∝ a^−1,5·a^−1·a^−1,5 = a^−4
    const ritmoEntro = (qq) => { const aP = Math.max(N.aIn, conoPieno(Mst, F.rho, qq)); return aP < N.aOut ? ((norma * 2 * qq * Math.sqrt(mu) * (Math.pow(aP, -3) - Math.pow(N.aOut, -3))) / (3 * PI2)) * ANNO : 0; }; // per anno
    const aP = Math.max(N.aIn, conoPieno(Mst, F.rho, q)), ritmo = ritmoEntro(q);
    if (ritmo > 0) {
      const epoca = 10, tA = t / ANNO, attive = []; // epoche di dieci anni: chi passa al perielio in quell'epoca
      for (let ep = Math.floor(tA / epoca) - 1; ep <= Math.floor(tA / epoca) + 1; ep++) {
        const nome = `cometa/epoca ${ep}`, s = c0.serie(nome); let Gm = 0;
        for (let j = 0; j < 100000; j++) { Gm += -logEsatto(1 - s(j)); if (Gm >= ritmo * epoca) break; const o = c0.sotto(`${nome}/${j}`), tPeri = (ep + o('quando')) * epoca * ANNO;
          const a = Math.pow(Math.pow(aP, -3) - o('da dove') * (Math.pow(aP, -3) - Math.pow(N.aOut, -3)), -1 / 3), qq = q * o('perielio'), e = 1 - qq / a, el = { a, e, i: Math.acos(1 - 2 * o('inclinazione')), nodo: PI2 * o('nodo'), peri: PI2 * o('pericentro'), mu, epoca: 0, motoMedio: Math.sqrt(mu / a ** 3) };
          el.M0 = -el.motoMedio * tPeri; el.assi = assiOrbita(el); const stato = statoKeplero(el, t), r = Math.hypot(...stato.pos); if (r > q) continue;
          const D = Math.min(N.taglie.D0, N.taglie.diametro(nTot * Math.max(1e-12, o('taglia'))));
          attive.push({ tipo: 'cometa', indirizzo: `${c0.radice}/${nome}/${j}`, diametroM: D, elementi: el, orbita: { attorno: 'stella', a, e, perielio: qq, inclinazione: el.i, nodo: el.nodo, pericentro: el.peri, M0: el.M0, epoca: 0, motoMedio: el.motoMedio, tPerielio: tPeri, assi: el.assi, periodo: periodo(el) }, pos: stato.pos, vel: stato.vel, perielioTra: tPeri - t, ...chiomaECode(D, stato, st, el, t) }); }
      }
      comete = { nuoveAllAnno: ritmo, entro: q, nuoveEntroAccensione: ritmoEntro(F.rAttiva), accensione: F.rAttiva, daDove: [aP, N.aOut], attive, serbatoio: nTot, polvereKgS: F.polvereComete(ritmo, q, nTot) };
    }
  }
  // ---- LA POLVERE tra i pianeti: quella fine delle fasce (la coda della cascata) e quella che ne scende a spirale verso
  // la stella (luce zodiacale), fascia per fascia e taglia per taglia (polvereDellaFascia). In latitudine: i grani hanno
  // le inclinazioni dei corpi da cui vengono (Rayleigh di scala σ): orbite tonde con quelle inclinazioni riempiono una
  // campana e^(−λ²/2σ²) [D: ∫ f(i)·di/(π√(i² − λ²)) con f di Rayleigh è esattamente una campana di larghezza σ].
  // Dentro `bordoGhiaccio` i grani delle fasce di ghiaccio hanno perso il ghiaccio (resta la parte 1 − DISCO.ghiaccio
  // della massa); dentro `bordoInterno` non c'è più niente. SEMPLIFICAZIONE: nessun pianeta ferma o scaglia via i grani
  // che scendono (i giganti veri ne tolgono gran parte); la polvere lasciata dalle comete è data come ritmo, non nello spazio.
  const P = F.polvere, campana = (lat, sg) => Math.exp((-lat * lat) / (2 * sg * sg)) / (sg * Math.sqrt(PI2)), residuo = (f, rM) => (f.materiale === 'ghiaccio' && rM < P.bordi.ghiaccio ? 1 - DISCO.ghiaccio : 1);
  const somma = (rM, lat, cosa) => { if (!(rM > P.bordi.silicati)) return 0; let x = 0; for (const f of P.fasce) { if (rM > f.a2) continue; const q = f.polvere.profilo(rM), k = residuo(f, rM), cmp = (campana(lat, f.polvere.sigma) / rM);
      x += cosa === 'tau' ? q.tau * Math.pow(k, 2 / 3) : cosa === 'sezione' ? q.tau * Math.pow(k, 2 / 3) * cmp : cosa === 'massa' ? q.massa * k * cmp : cosa === 'numero' ? q.numero * cmp : q.tau * q.raggioGrano; } return x; };
  const beta = st.Lw > 0 ? betaGrano(SS.granoTipico, st.Lw, Mst) : 0;
  const polvere = { fattaInTuttoKg: P.fattaInTuttoKg /* impatti.js: in tutta la storia */, ritmoKgS: P.ritmoKgS /* ciò che la cascata delle fasce macina oggi: quasi tutto finisce in grani soffiati via */, versoLaStellaKgS: P.versoLaStellaKgS, senzaUrtiKgS: P.ritmoKgS,
    soffiati: P.soffiati /* (m) i grani più piccoli di così (β > ½) sono soffiati via */, bordoInterno: P.bordi.silicati, bordoGhiaccio: P.bordi.ghiaccio, temperaturaGrano: P.bordi.temperatura,
    albedo: SS.polvere.albedo, fase: { legge: 'tre Henyey–Greenstein', g: SS.polvere.g, pesi: SS.polvere.pesi, in: fasePolvere }, grano: { densita: MATERIALI.roccia.densita, indice: { n: MEZZO.grano.n, k: MEZZO.grano.k } },
    fasce: P.fasce.map((f) => ({ nome: f.nome, interno: f.a1, esterno: f.a2, materiale: f.materiale, sigma: f.polvere.sigma, tau: f.polvere.tau, massaKg: f.polvere.massaKg, raggioGrano: f.polvere.raggioGrano, versoLaStellaKgS: f.polvere.versoLaStellaKgS, tauBordo: f.polvere.tauBordo, taglie: f.polvere.taglie, profilo: f.polvere.profilo })),
    tauA: (rM) => somma(rM, 0, 'tau'), // la profondità ottica attraverso lo strato (sezione dei grani per unità di superficie)
    sezioneA: (rM, lat = 0) => somma(rM, lat, 'sezione'), // m² di grani per m³: ciò che diffonde la luce
    densitaA: (rM, lat = 0) => somma(rM, lat, 'massa'), graniA: (rM, lat = 0) => somma(rM, lat, 'numero'), raggioGranoA: (rM) => { const t = somma(rM, 0, 'tau'); return t > 0 ? somma(rM, 0, 'raggio') / t : 0; },
    grano100: SS.granoTipico, beta, tempoPR: (rM) => (beta > 0 ? tempoPR(rM, beta, Mst) / ANNO : Infinity) };
  polvere.luceZodiacale = (opz) => luceZodiacale(polvere, st, opz);
  // ---- IL FLUSSO DEI PROIETTILI su ogni pianeta, OGGI: l'ultima epoca della tabella di impatti.js (la stessa dei crateri)
  const flusso = F.sk.map((s, i) => { const b = F.imp[i]; if (!b?.attesi) return { pianeta: s.p.id, perAnno: () => 0, manca: true };
    const A = b.attesi, nE = A.epoche.length - 1, dt = A.epoche[nE] - A.epoche[nE - 1], perClasse = A.diametroM.map((_, k) => A.perEpoca[k * nE + nE - 1] / dt);
    return { pianeta: s.p.id, diametroM: A.diametroM, perClasse, epoca: [A.epoche[nE - 1], A.epoche[nE]], perAnno: (D) => { let n = 0; for (let k = 0; k < perClasse.length; k++) if (A.diametroM[k] >= D) n += perClasse[k]; return n; }, velocita: A.v }; });
  const corpi = []; for (const f of F.fasce) for (const c of corpiDi(f)) corpi.push(c);
  return { stella: st, fasce: F.fasce.map((f) => ({ ...f, corpi: (n, minimo) => corpiDi(f, n, minimo) })), nube: F.nube, esaurite: F.esaurite, comete, polvere, vento: (rM) => ventoA(Sis, rM), flusso, espulso: F.espulso, corpi, rAttiva: F.rAttiva, rElenco: F.rElenco, attorno: F.rho, attornoDato: attorno != null, t };
}

// =====================================================================================================
// TRA LE STELLE: ciò che i sistemi hanno perso (oggetti interstellari, pianeti vaganti), le stelle di passaggio
// =====================================================================================================
// un sistema fatto con le funzioni di sempre (disco.js) attorno a una stella { massa, Z, eta }: quello che serve a
// impatti.js (gli stessi campi che cosmo.js sistema() dà ai pianeti). caso: la sorgente della stella
export function sistemaDi(st, caso) {
  const cd = caso.sotto('disco'), nati = formaPianeti(st, cd), M = (st.massa || 1) * MSOLE;
  return { stella: { massa: st.massa, massaNascita: st.massa, Z: st.Z ?? 1, eta: st.eta ?? 4.5e9, stato: 'in vita' }, disco: discoDi(st, cd),
    pianeti: nati.map((q, k) => Object.assign({ id: k }, q, { formazione: q.formazione, aM: q.aUA * UA, Mstella: M })) };
}
// che cosa ha perso un sistema: → { planetesimiKg (scagliati fuori per sempre), nellaNubeKg, pianetiVaganti: [...] }
export const espulsoDa = (Sis, caso, attorno = null) => corpiMinori(Sis, 0, { caso, attorno, massimo: 0 }).espulso;
// LA POPOLAZIONE VAGANTE attorno a un punto di una galassia: si fanno `campione` sistemi attorno a stelle estratte con la
// distribuzione delle masse di leggi.js (eventi «vaganti/stella j»), coi metalli dell'anello e l'età media delle stelle
// lì (galassie.js), e si conta ciò che perdono. Costa ~0,1 s a sistema: si fa una volta per anello.
// → { stellePerM3, perStella: { planetesimiKg, pianetiVaganti }, oggetti: { perM3 (se macinati dalla cascata), perM3Minimo
//     (se usciti com'erano nati, tutti da 100 km), perUA3 }, pianetiVaganti: { perM3, perStella }, campione }
const vagantiFatti = new WeakMap();
export function vaganti(forma, r = 8, { campione = 24, caso = sorgente('galassia') } = {}) {
  let k = 0; while (k < ANELLI - 1 && forma.anelli.bordo[k + 1] < r) k++;
  let m = vagantiFatti.get(forma); if (!m) vagantiFatti.set(forma, (m = new Map())); const chiave = `${k}/${campione}/${caso.radice}`; if (m.has(chiave)) return m.get(chiave);
  const Q = quadro(forma), a = Q.anello(k), C = cinematica(forma), P = popolazione(), c0 = caso.sotto(`vuoto/vaganti/anello ${k}`), eta = Math.max(1e8, C.eta[k] * 1e9);
  // quante stelle per m³ a metà del disco: la densità di stelle di galassie.js per le stelle nate per ogni M☉ che resta
  const perMassa = forma.bilancio.nate / forma.massaStelle / P.massaMedia, stellePerM3 = ((a.sigmaStelle / (2 * a.z0)) / MSOLE) * perMassa, attorno = a.sigmaStelle / (2 * a.z0) + a.sigmaGas / (2 * Q.hGas);
  let fuori = 0, nube = 0, nVag = 0, mVag = 0, conPianeti = 0; const masse = [];
  for (let j = 0; j < campione; j++) { const cs = c0.sotto(`stella ${j}`), massa = massaNascita(cs('massa')); masse.push(massa); if (massa > ST.massaMassima({ Z: a.Z }) || ST.stella(massa, { Z: a.Z }).vita < eta) continue; // (le stelle già morte non hanno più il loro sistema: SEMPLIFICAZIONE, ciò che avevano scagliato resta fuori dal conto)
    const Sis = sistemaDi({ massa, Z: a.Z, eta }, cs), e = espulsoDa(Sis, cs, attorno); fuori += e.planetesimiKg; nube += e.nellaNubeKg; nVag += e.pianetiVaganti.length; mVag += e.pianetiVaganti.reduce((s, x) => s + x.massaKg, 0); if (Sis.pianeti.length) conPianeti++; }
  const perStella = { planetesimiKg: fuori / campione, nellaNubeKg: nube / campione, pianetiVaganti: nVag / campione, massaVagantiKg: mVag / campione }, tg = taglie(Math.max(perStella.planetesimiKg, 1e-300), 'ghiaccio');
  const macinati = stellePerM3 * tg.sopra(SS.oumuamua), nati = stellePerM3 * tg.natiGrandi * (1 + 5);
  const out = { anello: k, stellePerM3, stellePerPc3: stellePerM3 * PC ** 3, attorno, perStella, oggetti: { soglia: SS.oumuamua, perM3: macinati, perUA3: macinati * UA ** 3, perM3Minimo: nati, perUA3Minimo: nati * UA ** 3 }, pianetiVaganti: { perM3: stellePerM3 * perStella.pianetiVaganti, perStella: perStella.pianetiVaganti }, campione, conPianeti, masse, eta, Z: a.Z };
  m.set(chiave, out); return out;
}
// LE STELLE DI PASSAGGIO: quante volte, in un milione di anni, un'altra stella passa a meno di b (metri) da un sistema.
// ritmo = n★·⟨v⟩·π·b²·(1 + 2G(M₁+M₂)/(b·v²)) [D: sezione d'urto con fuoco gravitazionale]; ⟨v⟩ = √(16/π)·σ per due stelle
// prese dalla stessa distribuzione di velocità di scarto σ per direzione; σ da galassie.js (cinematica: σ_R, σ_z, e
// σ_φ = σ_R·κ/2Ω dall'epiciclo)
export function incontri(forma, r = 8, b = PC, massa = 1) {
  let k = 0; while (k < ANELLI - 1 && forma.anelli.bordo[k + 1] < r) k++;
  const Q = quadro(forma), a = Q.anello(k), C = cinematica(forma), P = popolazione(), perMassa = forma.bilancio.nate / forma.massaStelle / P.massaMedia, n = ((a.sigmaStelle / (2 * a.z0)) / MSOLE) * perMassa;
  const sR = C.sigR[k] * 1e3, sZ = C.sigZ[k] * 1e3, sF = (sR * C.kappa[k]) / (2 * C.omega[k]), sigma = Math.sqrt((sR * sR + sF * sF + sZ * sZ) / 3), v = Math.sqrt(16 / PI) * sigma;
  const fuoco = 1 + (2 * G * (massa + P.massaMedia) * MSOLE) / (b * v * v), ritmo = n * v * PI * b * b * fuoco * ANNO; // all'anno
  return { stellePerM3: n, velocita: v, sigma, perMilioneDiAnni: ritmo * 1e6, fuoco, ogniAnni: 1 / ritmo, // e la più vicina mai passata in un'età: N(<b) = 1
    piuVicinaIn: (anni) => { let lo = 1e9, hi = 1e18; for (let i = 0; i < 60; i++) { const m = Math.sqrt(lo * hi); if (n * v * PI * m * m * (1 + (2 * G * (massa + P.massaMedia) * MSOLE) / (m * v * v)) * ANNO * anni < 1) lo = m; else hi = m; } return Math.sqrt(lo * hi); } };
}
export const dentroSistema = { macina, planckA, uvDi, stellaDi, nubeDa, bordoNube, conoPieno, granoDopo, schedaPianeta, storiaDi };
