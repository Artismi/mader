// anelli.js — gli anelli dei pianeti come CONSEGUENZA: della materia che è arrivata, di quando è arrivata,
// e di ciò che da allora la consuma. Nessun anello è messo a mano, e nessuno è eterno.
//
// 1. DA DOVE VIENE LA MATERIA (storia): ogni sorgente dice che cosa, quanta e quando.
//    · attorno a un gigante le lune nascono nel disco di gas a generazioni, e le più interne cadono una dopo
//      l'altra nel pianeta finché il gas c'è (lune.js lo dice: «le lune già fatte cadono sul pianeta»).
//      L'ULTIMA LUNA PERDUTA somigliava alla più interna rimasta (stessa fascia del disco: stessa massa, stesso
//      ghiaccio). Scendendo passa il limite di Roche: la marea le strappa il mantello di ghiaccio, che resta
//      in orbita; il nucleo di roccia, più denso, si sbriciola più in basso (Canup 2010);
//    · attorno a un roccioso: i detriti del GRANDE URTO; e la luna nata dall'urto, se il pianeta gira più
//      piano di lei, ricade (lune.js la scarta: qui diventa un anello);
//    · una luna di oggi che gira più in fretta del pianeta (dentro l'orbita sincrona) o contromano scende,
//      con la stessa legge di marea con cui la Luna sale: è un anello FUTURO (Phobos, Tritone).
// 2. DOVE STA: sopra l'alta atmosfera (più giù il gas frena i grani e li fa cadere) e sotto il limite di
//    Roche del materiale (più su i grani si riaggregano in lunette): il ghiaccio arriva più lontano della roccia.
// 3. CHE COSA LO CONSUMA:
//    · la VISCOSITÀ: gli urti tra i grani e le scie di gravità allargano l'anello; ciò che esce dal bordo
//      interno piove sul pianeta, ciò che esce da quello esterno si riaggrega in lunette. Con la viscosità delle
//      scie (ν ∝ Σ²) l'equazione di diffusione ha una soluzione che conserva la forma e cala come 1/√t: dopo
//      abbastanza tempo la massa NON dipende più da quella di partenza, solo dall'età e dalla larghezza
//      (per Saturno, se non piovesse: 1,2·10¹⁹ kg dopo 4,5 miliardi di anni; quella vera è 1,5·10¹⁹);
//    · la PIOGGIA: la polvere finissima e carica che la luce e i micrometeoriti staccano dai grani resta
//      agganciata al campo magnetico del pianeta e gira con lui. Lungo una linea di campo la gravità la tira
//      verso il pianeta e la forza centrifuga la riporta all'equatore: sviluppando il potenziale lungo la linea
//      di un dipolo, vince la gravità dentro (2/3)^⅓ = 0,874 volte l'orbita sincrona (Northrop e Hill 1982). Lì
//      l'anello piove sul pianeta, fuori no. Limite di Roche e orbita sincrona dipendono allo stesso modo dalla
//      densità del pianeta, quindi «resta un pezzo di anello oltre la zona di pioggia» dipende SOLO dal giorno:
//      per il ghiaccio serve un giorno più corto di 16,0 ore, per la roccia di 8,5 (giornoMassimo). Saturno
//      (10,7 h) sì; Urano (17,2 h) e Nettuno (16,1 h) no; Giove (9,9 h) sì per il ghiaccio, ma le sue lune
//      interne sono di roccia. Un pianeta senza campo magnetico non ha pioggia;
//    · la luce: fa cadere i grani piccoli (Poynting-Robertson) e, vicino alla stella, fa SUBLIMARE il ghiaccio
//      (pressione di vapore, Clausius-Clapeyron): un anello di ghiaccio regge miliardi di anni solo sotto ~105 K
//      (attorno al Sole: da 5 UA in fuori; è più lontano della linea della neve);
//    · I GRANI: i più grossi sono grandi quanto lo strato che le scie tengono agitato, e lo strato è tanto più
//      sottile quanto più l'anello è tenue. Quando ciò che consuma i grani (luce, sublimazione, pioggia) arriva
//      alla taglia dei più grossi, la fascia è finita: per questo un anello tenue dura poco e uno massiccio molto.
// 4. LA STRUTTURA viene dalle lune vere di quel pianeta: ogni risonanza di Lindblad (la particella fa p giri
//    mentre la luna ne fa q) toglie momento angolare all'anello. Se la sua coppia supera quella viscosa tiene
//    un BORDO netto e svuota una divisione appena fuori (la 2:1 con Mimas: il bordo dell'anello B, dove comincia
//    la divisione di Cassini); se è più debole lancia un'ONDA di densità. Una luna dentro l'anello o a ridosso
//    («pastore») svuota la sua zona caotica. Tra un bordo e l'altro ogni fascia evolve per conto suo: la sua
//    densità va come la sua larghezza (così l'anello A viene più tenue del B).
//
// LEGGI EMPIRICHE (misurate o tarate altrove, non derivate qui):
//   · la viscosità di un anello denso con scie di gravità: ν = 26·r_h*⁵·G²Σ²/Ω³ (simulazioni a N corpi: Daisaka,
//     Tanaka e Ida 2001), con r_h* = raggio di Hill di due grani a contatto / somma dei loro raggi;
//   · la pioggia: 10⁻¹³ kg/m²/s sulla parte di anello dentro la zona instabile, MISURATA su Saturno (circa
//     2 t/s in tutto: O'Donoghue e altri 2019 danno 0,4–2,8 t/s);
//   · la coppia di una risonanza, 8,6·m²·μ²·Σ·Ω²·a⁴, e lo smorzamento viscoso di un'onda di densità (Goldreich e
//     Tremaine 1978-80); la zona caotica attorno a una luna, 1,3·μ^(2/7) (Wisdom 1980);
//   · i grani: n(s) ∝ s⁻³ tra il più piccolo e il più grosso (occultazioni radio di Saturno); albedo e colore di
//     ghiaccio e roccia; il potenziale elettrico di un grano alla luce (circa 5 V);
//   · calore di sublimazione e punto triplo del ghiaccio; i materiali e le leggi di marea sono quelli di
//     lune.js; quanto spesso c'è il grande urto e quanto pesa la luna: i numeri di lune.js.
// PARAMETRI LIBERI (scelti, non misurati): sotto quale spessore ottico non lo chiamo più anello (soglia); il
//   grano più piccolo che il campo deve saper trattenere perché ci sia pioggia (un nanometro); nel disco di
//   detriti di un urto resta dentro Roche quanto è andato nella luna (restoUrto); l'esosfera tre volte più
//   calda della superficie (lo stesso numero di leggi.js).
// SEMPLIFICAZIONI: · la pioggia è la stessa per ogni pianeta con un campo (non si sa come scali con la stella e
//   con il campo: si usa la misura di Saturno); · le fasce sono trattate come strette (diffusione in piano) e i
//   bordi tenuti dalle risonanze sono quelli di oggi per tutta la storia; · la taglia dei grani più grossi
//   (lo spessore dello strato a Q di Toomre = 2) è un'ipotesi: dà i metri misurati nell'anello A e i centimetri
//   dell'anello C, ma nel B dà grani troppo grossi; · la luce è quella di oggi (per il ghiaccio attorno a una
//   stella morta: quella di quand'era viva); il calore del pianeta giovane è ignorato (il vapore resta legato al
//   pianeta e ricondensa); · solo le risonanze interne di primo e second'ordine.
// CHE COSA NON C'È: il ciclo anello → lunette → anello dei pianeti lenti (Urano, Nettuno, Marte: Hesselbrock e
//   Minton 2017), le comete catturate e spezzate (oggi troppo rare per un anello massiccio), la polvere
//   staccata dalle lune piccole (gli anelli tenui di Giove), la migrazione passata delle lune (la larghezza
//   vera della divisione di Cassini: qui viene stretta, come la divisione di Huygens).

import { COSTANTI, LSOLE, MSOLE, ANNO, clima, ORA } from './leggi.js';
import { stella as stellaVera } from './stelle.js';
import { MATERIALI, limiteRoche, raggioHill, periodoOrbita, raggioRotondo, densitaCorpo, orbitaDopoLeMaree } from './lune.js';
import { sorgente } from './eventi.js';

const { G, c: LUCE, sigma: SIGMA, kB, mp } = COSTANTI, EPS0 = COSTANTI.eps0;
export const LEGGI_ANELLI = {
  viscosita: 26, // Daisaka 2001
  pioggia: 1e-13, // kg/m²/s: O'Donoghue 2019, su Saturno
  coppia: 8.6, smorza: 7 / 3, caotica: 1.3, // Goldreich e Tremaine; Wisdom
  albedo: { ghiaccio: 0.6, roccia: 0.1 }, colore: { ghiaccio: [233, 224, 204], roccia: [112, 102, 94] }, // come le lune di lune.js; gli anelli di Saturno e di Urano
  potenziale: 5, granoCarico: 1e-9, // volt; il grano più piccolo che il campo deve saper trattenere (m)
  calore: 2.83e6, triplo: [273.16, 611.7], // sublimazione del ghiaccio (J/kg); punto triplo (K, Pa)
  esosfera: 3, soglia: 1e-8, restoUrto: 1, // PARAMETRI LIBERI
  ghiaccioMinimo: 0.005, hill: 0.4, urto: { capita: 0.45, massa: [-3, -1.6] }, // i numeri di lune.js (mantello di ghiaccio; orbita stabile; grande urto)
};
const L = LEGGI_ANELLI, GIORNO_GIOVANE = 10 * ORA, PIOVE = Math.cbrt(2 / 3);

// ---------- la forma che si conserva. Con ν = K·Σ², ∂Σ/∂t = 3·∂²(νΣ)/∂r² ha la soluzione Σ = f(x)/√(SIM·K·t)·Δ,
// con (f³)'' ∝ −f e f = 0 ai due bordi (lì la materia se ne va). Con f² = sen θ la forma si integra da sola:
// x(θ) = ∫√(sen θ) / ∫₀^π √(sen θ). Viene una gobba: f in tabella, la sua media (0,835) e SIM (51,7) calcolati qui.
const NF = 256, FORMA = new Float64Array(NF + 1);
let MEDIA = 0, SIM = 0;
{
  const n = 4096, X = new Float64Array(n + 1), h = Math.PI / n;
  for (let i = 1; i <= n; i++) X[i] = X[i - 1] + (h / 2) * (Math.sqrt(Math.sin((i - 1) * h)) + Math.sqrt(Math.max(0, Math.sin(i * h))));
  for (let j = 0, i = 1; j <= NF; j++) {
    const x = (j / NF) * X[n]; while (i < n && X[i] < x) i++;
    FORMA[j] = Math.sqrt(Math.max(0, Math.sin((i - 1 + (x - X[i - 1]) / (X[i] - X[i - 1])) * h)));
  }
  for (let j = 0; j < NF; j++) MEDIA += (FORMA[j] + FORMA[j + 1]) / (2 * NF);
  SIM = 9 * X[n] ** 2;
}
const forma = (x) => { const u = Math.min(1, Math.max(0, x)) * NF, i = Math.min(NF - 1, Math.floor(u)); return FORMA[i] + (FORMA[i + 1] - FORMA[i]) * (u - i); };

// ---------- le distanze che contano
// l'orbita sincrona: lì una luna (o un grano) gira insieme al pianeta
export const orbitaSincrona = (P) => Math.cbrt((G * P.massaKg * (P.giorno || GIORNO_GIOVANE) ** 2) / (4 * Math.PI ** 2)); // senza un giorno: 10 ore, come in lune.js
// il giorno più lungo con cui resta un pezzo di anello fuori dalla zona di pioggia: Roche > 0,874·sincrona
// ⇔ giorno² < (3/2)·2,44³·3π/(G·ρ_grano); la densità del pianeta si semplifica (16,0 ore per il ghiaccio, 8,5 per la roccia)
export const giornoMassimo = (materiale = 'ghiaccio') => Math.sqrt((1.5 * 2.44 ** 3 * 3 * Math.PI) / (G * MATERIALI[materiale].densita));
// dove si spezza una luna che scende: un corpo tondo (tenuto insieme dalla gravità) al limite di Roche dei
// fluidi (2,44, come in lune.js); uno piccolo, tenuto dalla roccia, regge finché i sassi sulla sua superficie
// non pesano più niente: 2^⅓ = 1,26 volte R·(ρ_pianeta/ρ)^⅓ (Phobos: 1,6 raggi di Marte)
export function doveSiSpezza(P, luna) {
  const rho = luna.densita ?? luna.massaKg / ((4 / 3) * Math.PI * luna.raggioM ** 3);
  const tonda = luna.forma?.rotonda ?? Math.cbrt(luna.massaKg / ((4 / 3) * Math.PI * rho)) > raggioRotondo(rho);
  return limiteRoche(P, rho) * (tonda ? 1 : Math.cbrt(2) / 2.44);
}
// fin dove arriva l'alta atmosfera: dove il gas, in tutto il tempo che l'anello ha avuto, ha fatto in tempo a
// fermare un grano (cioè il grano ha spazzato tanto gas quanto pesa). Atmosfera a temperatura costante, quella
// dell'esosfera (tre volte la superficie, come in leggi.js), con la gravità che cala salendo
export function bordoAtmosfera(P, densitaGrano, grano, anni, cl = P.clima) {
  const R = P.raggioM, g = (G * P.massaKg) / (R * R), gas = !(cl.pressione < Infinity), p0 = gas ? 1e5 : cl.pressione;
  if (!(p0 > 0) || !(anni > 0)) return R;
  const mu = (gas ? 2.3 : cl.tenuti?.includes('azoto') ? 28 : 44) * mp, H = (kB * L.esosfera * cl.T) / (mu * g);
  const limite = ((4 / 3) * densitaGrano * grano) / (Math.sqrt((G * P.massaKg) / R) * anni * ANNO), y = (Math.log((p0 * mu) / (kB * cl.T) / limite) * H) / R;
  return y <= 0 ? R : y < 0.75 ? R / (1 - y) : 4 * R;
}
// la pressione di vapore del ghiaccio (Clausius-Clapeyron dal punto triplo) e quanto in fretta un grano si
// consuma nel vuoto (m/s: Hertz-Knudsen)
const vapore = (T) => L.triplo[1] * Math.exp(((L.calore * 18 * mp) / kB) * (1 / L.triplo[0] - 1 / T));
export const sublimazione = (T) => (vapore(T) * Math.sqrt((18 * mp) / (2 * Math.PI * kB * T))) / MATERIALI.ghiaccio.densita;

// quanta parte di una luna è ghiaccio (dalla composizione; se manca, dalla densità, come fa lune.js)
function ghiaccioDi(luna) {
  if (luna.composizione) return luna.composizione.ghiaccio ?? 0;
  const { roccia: r, ghiaccio: g } = MATERIALI, rho = luna.densita ?? luna.massaKg / ((4 / 3) * Math.PI * luna.raggioM ** 3);
  return (Math.min(1, Math.max(0, (r.densita - rho) / (r.densita - g.densita))) * g.densita) / rho;
}
const luceDi = (P) => P.Lw ?? stellaVera(P.Mstella / MSOLE).L * LSOLE;
const etaDi = (stella) => (stella?.eta ?? 4.5e9) + (stella?.morta ?? 0);
const fmtAnni = (a) => (a >= 1e9 ? `${(a / 1e9).toLocaleString('it-IT', { maximumFractionDigits: 1 })} miliardi di anni` : a >= 1e6 ? `${Math.round(a / 1e6).toLocaleString('it-IT')} milioni di anni` : `${Math.round(Math.max(1, a)).toLocaleString('it-IT')} anni`);

// ---------- 1. la storia: che cosa è arrivato (o arriverà) dentro il limite di Roche, e quando
// In uscita: [{ cosa, quando (anni: negativo = già successo, positivo = succederà), massaKg, ghiaccio (frazione) }].
// lune.js non dice quali lune ha scartato: qui si ricostruiscono con le sue stesse leggi (funzioni esportate) e,
// dove serve un esito, con la sorgente degli eventi; la storia ricostruita è sempre coerente con le lune che ci sono.
export function storia(P, lune = [], stella = {}, caso = sorgente(`anelli/pianeta ${P.id ?? 0}`)) {
  const eta = etaDi(stella), RH = raggioHill(P), M = P.massaKg, eventi = [];
  // le lune nate dal disco (se l'origine non è detta: nel verso giusto, vicine, e fuori dal proprio limite di Roche:
  // una lunetta più dentro è un pezzo dell'anello, non una luna del disco)
  const regolare = (l) => (l.origine ? l.origine === 'disco' : !l.retrograda && l.aM < 0.1 * RH && l.aM > limiteRoche(P, l.densita ?? l.massaKg / ((4 / 3) * Math.PI * l.raggioM ** 3)));
  if (P.tipo !== 'roccioso') {
    // l'ultima luna perduta: come la più interna delle regolari, con la stessa dispersione che lune.js dà alle fasce
    const interna = lune.filter(regolare).sort((x, y) => x.aM - y.aM)[0];
    if (interna) eventi.push({ cosa: "l'ultima luna caduta nel pianeta quando il disco di gas si è disperso", quando: -eta, massaKg: interna.massaKg * caso.tra('ultima luna perduta/fascia', 0.85, 1.15) ** 1.5, ghiaccio: ghiaccioDi(interna) });
  } else {
    const rimasta = lune.find((l) => (l.origine ? l.origine === 'urto' : !l.retrograda && l.massaKg > 10 ** L.urto.massa[0] * M));
    if (rimasta) eventi.push({ cosa: 'i detriti del grande urto che ha fatto la luna', quando: -eta, massaKg: L.restoUrto * rimasta.massaKg, ghiaccio: 0 });
    // nessuna luna da urto: o l'urto non c'è stato, o la luna si è persa. Si ripete il conto di lune.js su storie
    // possibili (eventi «grande urto/storia k») e si tiene la prima coerente con ciò che si vede: nessuna luna rimasta
    else for (let k = 0; k < 8; k++) {
      const s = caso.sotto(`grande urto/storia ${k}`);
      if (s('capita') >= L.urto.capita) break;
      const m = 10 ** s.tra('massa', ...L.urto.massa) * M, a0 = 1.2 * limiteRoche(P, densitaCorpo(m, 0)), giorno = P.giorno || 24 * ORA;
      let a = orbitaDopoLeMaree(P, m, a0, eta);
      const I = 0.33 * M * P.raggioM ** 2, w = (2 * Math.PI) / giorno, wMax = Math.sqrt((G * M) / P.raggioM ** 3), mom = (x) => m * Math.sqrt(G * M * x);
      if (w + (mom(a) - mom(a0)) / I > wMax) a = Math.max(a0, ((mom(a0) + I * (wMax - w)) / m) ** 2 / (G * M));
      const ricade = P.bloccato || periodoOrbita(P, a, m) < giorno;
      if (!ricade && a <= L.hill * RH) continue; // sarebbe rimasta: non è la storia di questo pianeta
      // ricade (il pianeta gira più piano di lei): in pochi anni ripassa il limite di Roche e si sbriciola; oppure la stella la porta via
      if (ricade) eventi.push({ cosa: 'la luna nata da un grande urto e ricaduta (il pianeta gira più piano di lei)', quando: -eta, massaKg: m, ghiaccio: 0 });
      break;
    }
  }
  // le lune di oggi che scendono: da/dt ∝ m·a^(-11/2), la legge di orbitaDopoLeMaree con il segno opposto
  // (a^(13/2) cala in modo lineare: orbitaDopoLeMaree(P, m, 0, 1)^(13/2) è quanto cala in un anno)
  const giorno = P.giorno || GIORNO_GIOVANE;
  lune.forEach((l, i) => {
    if (!(l.retrograda || (l.periodo ?? periodoOrbita(P, l.aM, l.massaKg)) < giorno)) return;
    const rotta = doveSiSpezza(P, l), perAnno = orbitaDopoLeMaree(P, l.massaKg, 0, 1) ** 6.5;
    eventi.push({ cosa: `la luna ${l.id ?? i}, che ${l.retrograda ? 'gira contromano' : 'gira più in fretta del pianeta'}: le maree la fanno scendere fino a spezzarla`, luna: l.id ?? i, quando: Math.max(0, l.aM ** 6.5 - rotta ** 6.5) / perAnno, massaKg: l.massaKg, ghiaccio: ghiaccioDi(l) });
  });
  return eventi.sort((x, y) => x.quando - y.quando);
}

// ---------- 2-3. una fascia di anello che invecchia
// i grani: i più piccoli sono quelli che la luce (o la sublimazione) non ha ancora consumato; i più grossi sono
// grandi quanto lo strato agitato dalle scie di gravità (spessore 2πGΣ/Ω² a Q = 2). Con n(s) ∝ s⁻³ il raggio che
// lega massa e ombra è (s_max − s_min)/ln(s_max/s_min); lo spessore ottico è τ = 3Σ/(4ρ·s)
const strato = (sigma, omega) => (Math.PI * G * sigma) / (omega * omega);
function grani(sigma, omega, rho, minimo) {
  const massimo = Math.max(minimo, strato(sigma, omega)), s = massimo > 1.001 * minimo ? (massimo - minimo) / Math.log(massimo / minimo) : minimo;
  return { minimo, massimo, taglia: s, tau: (3 * sigma) / (4 * rho * s) };
}
// la massa di una fascia dopo `anni`: la viscosità (soluzione esatta, passo per passo), poi ciò che la luce
// e la pioggia portano via. Passi in progressione geometrica: all'inizio tutto corre, poi rallenta
function invecchia(z, massa0, anni, amb) {
  let Mz = massa0, t = 0, dentro = 0, fuori = 0;
  const T = anni * ANNO, t0 = Math.min(1e3 * ANNO, T / 64), N = 48;
  for (let i = 0; i <= N && Mz > 0; i++) {
    const t1 = t0 * (T / t0) ** (i / N), dt = t1 - t, dopo = z.C2 === Infinity ? Mz : Mz / Math.sqrt(1 + (Mz * Mz * dt) / z.C2);
    dentro += (Mz - dopo) * z.versoDentro; fuori += (Mz - dopo) * (1 - z.versoDentro); Mz = dopo; t = t1;
    for (let k = 0, resta = dt; k < 6 && resta > 0 && Mz > 0; k++) {
      const tm = MEDIA * grani(Mz / (MEDIA * z.A), z.omega, amb.rho, z.consumo * t).tau;
      // la luce della stella (che arriva di sbieco: conta l'inclinazione), quella del pianeta, e la pioggia
      const luce = (2 / LUCE ** 2) * (amb.assorbe * amb.sbieco * (1 - Math.exp(-tm / amb.sbieco)) * z.A + z.lucePianeta * (1 - Math.exp(-tm / z.sbiecoPianeta)));
      const E = luce + (z.piove ? amb.pioggia * z.A * (1 - Math.exp(-tm)) : 0);
      if (!(E > 0)) break;
      const h = Math.min(resta, (0.3 * Mz) / E);
      if (k === 5) Mz *= Math.exp((-E * resta) / Mz); else Mz -= E * h;
      dentro += E * h; resta -= h;
    }
    // la fascia finisce quando anche i suoi grani più grossi sono consumati: più è tenue, più sono piccoli, prima succede
    if (z.consumo * t >= strato(Mz / (MEDIA * z.A), z.omega)) { dentro += Mz; Mz = 0; }
  }
  return { massa: Mz > 0 ? Mz : 0, dentro, fuori };
}
// una fascia tra a1 e a2 (m). I bordi: 'esce' (la materia che ci arriva se ne va) o 'tenuto' (non passa)
function fascia(P, a1, a2, bordo1, bordo2, piove, amb) {
  const am = (a1 + a2) / 2, omega = Math.sqrt((G * P.massaKg) / am ** 3), A = Math.PI * (a2 * a2 - a1 * a1), aperti = (bordo1 === 'esce') + (bordo2 === 'esce');
  // r_h*: il raggio di Hill di due grani a contatto diviso la somma dei loro raggi (vale circa 1 al limite di Roche)
  const rh = (am / (2 * P.raggioM)) * Math.cbrt((2 * amb.rho) / (3 * amb.rhoPianeta)), K = (L.viscosita * rh ** 5 * G * G) / omega ** 3;
  // con un bordo tenuto la gobba è mezza (come una fascia larga il doppio); con due non si allarga più
  const largo = (a2 - a1) * (aperti === 2 ? 1 : 2), x0 = bordo1 === 'esce' ? 0 : 0.5, dx = aperti === 2 ? 1 : aperti === 1 ? 0.5 : 0;
  // quanto in fretta si consumano i grani (m/s): la luce fa cadere i più piccoli; il ghiaccio sublima; dove piove, la
  // pioggia porta via la superficie di ogni grano (un quarto del flusso, perché un grano ha quattro volte la sua ombra)
  const consumo = Math.max(amb.cade, amb.evapora + (piove ? amb.pioggia / (4 * amb.rho) : 0));
  return { a1, a2, am, omega, A, K, piove, consumo, x0, dx, C2: aperti ? (MEDIA * A * largo) ** 2 / (SIM * K) : Infinity, versoDentro: aperti === 2 ? 0.5 : bordo1 === 'esce' ? 1 : 0,
    lucePianeta: (8 / 3) * SIGMA * amb.Tpianeta ** 4 * P.raggioM ** 3 * (1 / a1 - 1 / a2), sbiecoPianeta: (4 / (3 * Math.PI)) * (P.raggioM / am) };
}

// ---------- l'anello che resta oggi da una certa materia arrivata `anni` fa
// materia: { massaKg, ghiaccio (frazione), anni (da quanto), cosa (testo) }. Rende null se oggi non c'è più niente.
export function anelloDa(P, lune = [], stella = {}, materia) {
  const anni = materia.anni ?? etaDi(stella);
  if (!(anni > 0) || !(materia.massaKg > 0)) return null;
  // prima il ghiaccio (il mantello: va in orbita per primo), se c'è e se regge; altrimenti la roccia
  const prove = materia.ghiaccio > L.ghiaccioMinimo ? [['ghiaccio', materia.ghiaccio], ['roccia', 1 - materia.ghiaccio]] : [['roccia', 1 - (materia.ghiaccio || 0)]];
  for (const [materiale, parte] of prove) { const a = anelloDi(P, lune, stella, materiale, parte * materia.massaKg, anni, materia.cosa); if (a) return a; }
  return null;
}

function anelloDi(P, lune, stella, materiale, massa0, anni, cosa) {
  const R = P.raggioM, M = P.massaKg, rho = MATERIALI[materiale].densita, alb = L.albedo[materiale], Lw = luceDi(P);
  const cl = P.clima ?? clima({ Lw, aM: P.aM, massaKg: M, raggioM: R, tipo: P.tipo }), flusso = Lw / (4 * Math.PI * P.aM ** 2);
  const roche = limiteRoche(P, rho), aOut = Math.min(roche, L.hill * raggioHill(P)), aMezzo = 0.7 * aOut;
  // la luce che un grano assorbe (stella e pianeta), e quanto in fretta consuma i grani piccoli: Poynting-Robertson
  // fa cadere in un tempo t i grani più piccoli di 3·F·t/(2ρc²) (su Saturno, in 4,5 miliardi di anni: 1,5 cm)
  const assorbe = flusso * (1 - alb), calore = SIGMA * cl.T ** 4 * (R / aMezzo) ** 2;
  const cade = (3 * (assorbe + calore)) / (2 * rho * LUCE ** 2);
  // il ghiaccio sublima: conta la luce più forte che ha visto (una stella morta, da viva, era più luminosa e più vicina)
  let Tgrano = Math.pow((assorbe + calore) / (4 * SIGMA), 0.25), evapora = 0;
  if (materiale === 'ghiaccio') {
    const Mn = stella?.massaNascita || P.Mstella / MSOLE, viva = stellaVera(Mn).L * LSOLE, aViva = stella?.morta ? (P.aM * P.Mstella) / (Mn * MSOLE) : P.aM; // (P.Mstella è la massa di oggi; da viva la stella pesava massaNascita e l'orbita era più stretta)
    Tgrano = Math.pow((Math.max(flusso, viva / (4 * Math.PI * aViva ** 2)) * (1 - alb) + calore) / (4 * SIGMA), 0.25);
    evapora = sublimazione(Tgrano);
  } else if (Tgrano > MATERIALI.roccia.fusione) return null; // anche la roccia fonde ed evapora
  const amb = { rho, rhoPianeta: M / ((4 / 3) * Math.PI * R ** 3), cade, evapora, assorbe, Tpianeta: cl.T, pioggia: L.pioggia,
    sbieco: Math.max(1e-4, (2 / Math.PI) * Math.sin(((P.obliquita ?? 0) * Math.PI) / 180)) };
  const aIn = bordoAtmosfera(P, rho, Math.max(1e-6, Math.max(cade, evapora) * anni * ANNO), anni, cl);
  if (!(aOut > 1.02 * aIn)) return null;
  // la pioggia: serve un campo che trattenga almeno un grano di un nanometro (carica 4πε₀·s·V: gira attorno
  // alla linea di campo più in fretta di quanto orbita); allora dentro 0,874 volte l'orbita sincrona piove
  const sincrona = orbitaSincrona(P), campo = (P.B0 ?? 0) * (R / aMezzo) ** 3, omegaM = Math.sqrt((G * M) / aMezzo ** 3);
  const piove = Math.sqrt((3 * EPS0 * L.potenziale * campo) / (rho * omegaM)) > L.granoCarico, aPioggia = piove ? PIOVE * sincrona : 0;
  const tutto = aPioggia >= aOut, a0 = tutto ? aIn : Math.max(aIn, aPioggia); // dove comincia la parte che dura
  // primo conto, senza lune: una fascia sola; serve a sapere quanto è densa lì dove cadono le risonanze
  const intera = fascia(P, a0, aOut, 'esce', 'esce', tutto, amb), sola = invecchia(intera, massa0, anni, amb);
  const sigma0 = sola.massa / (MEDIA * intera.A), densitaLi = (a) => sigma0 * forma((a - a0) / (aOut - a0));
  // le lune: bordi, divisioni, onde
  const barriere = [], onde = [];
  if (sigma0 > 0) for (const [i, l] of lune.entries()) {
    if (l.retrograda || !(l.massaKg > 0) || !(l.aM > a0)) continue;
    const mu = l.massaKg / M, nome = `la luna ${l.id ?? i}`, caos = L.caotica * Math.pow(mu, 2 / 7) * l.aM;
    // dentro l'anello, o a ridosso: nella sua zona caotica le orbite non reggono (la luna «pastore» tiene i bordi)
    if (l.aM - caos < aOut) barriere.push({ da: l.aM - caos, a: l.aM + caos, dentro: 'tenuto', fuori: 'tenuto', causa: `${nome} ${l.aM < aOut ? "dentro l'anello" : 'a ridosso del bordo'}: svuota la sua zona caotica e ne tiene netti i bordi` });
    // le risonanze interne p:q (la particella fa p giri mentre la luna ne fa q), di primo e second'ordine
    for (let ordine = 1; ordine <= 2; ordine++) for (let q = 1; q <= 40; q++) {
      const p = q + ordine, ar = l.aM * Math.pow(q / p, 2 / 3);
      if (ar >= Math.min(aOut, l.aM - caos)) break;
      if (ar <= a0 || (ordine === 2 && q % 2 === 0)) continue;
      const sg = densitaLi(ar), om = Math.sqrt((G * M) / ar ** 3), K = (L.viscosita * ((ar / (2 * R)) * Math.cbrt((2 * rho) / (3 * amb.rhoPianeta))) ** 5 * G * G) / om ** 3;
      if (!(sg > 0)) continue;
      // la coppia della risonanza divisa per quella viscosa (3π·ν·Σ·Ω·a²); al second'ordine conta l'eccentricità della luna
      const forza = (L.coppia * (q + 1) ** 2 * mu * mu * (ordine === 2 ? (l.eccentricita ?? 0) ** 2 : 1) * om * ar * ar) / (3 * Math.PI * K * sg * sg);
      // fin dove arriva l'onda prima di smorzarsi (in frazione di a): lì lascia il momento angolare che porta
      const xd = Math.cbrt((4 * Math.PI ** 3 * G ** 3 * sg) / (3 * L.smorza * K * q * q * om ** 5 * ar));
      if (forza > 1) barriere.push({ da: ar, a: ar * (1 + xd * Math.cbrt(Math.log(forza) / 2)), dentro: 'tenuto', fuori: 'esce', causa: `la risonanza ${p}:${q} con ${nome}: tiene il bordo e svuota la fascia appena fuori`, forza });
      else if (forza > 1e-4) onde.push({ a: ar, xd, fase: (3 * q * om * om * ar) / (4 * Math.PI * G * sg), ampiezza: Math.sqrt(forza), causa: `onda di densità lanciata dalla risonanza ${p}:${q} con ${nome}` });
    }
  }
  barriere.sort((x, y) => x.da - y.da);
  // le fasce tra un bordo e l'altro
  const fasce = [], divisioni = [];
  let pos = a0, bordo = 'esce', perche = tutto || a0 === aIn ? "l'alta atmosfera del pianeta" : 'la pioggia: più dentro la polvere carica scivola lungo il campo fin nel pianeta', fine = roche <= aOut ? `il limite di Roche ${materiale === 'ghiaccio' ? 'del ghiaccio' : 'della roccia'}: più fuori i grani si riaggregano` : 'la stella: più fuori le orbite non reggono';
  for (const b of barriere) {
    if (pos >= aOut) break;
    if (b.da <= pos) { if (b.a > pos) { pos = b.a; bordo = b.fuori; if (!fasce.length) perche = b.causa; } continue; }
    fasce.push(fascia(P, pos, b.da, bordo, b.dentro, tutto, amb));
    if (b.a < aOut) divisioni.push({ r: (b.da + b.a) / (2 * R), larghezza: (b.a - b.da) / R, causa: b.causa }); else fine = b.causa;
    pos = b.a; bordo = b.fuori;
  }
  if (pos < aOut) fasce.push(fascia(P, pos, aOut, bordo, 'esce', tutto, amb));
  // ogni fascia invecchia per conto suo, con la sua parte della materia
  const area = fasce.reduce((s, z) => s + z.A, 0);
  let massa = 0, piovuta = 0, lunette = 0, densa = null;
  for (const z of fasce) {
    const v = invecchia(z, (massa0 * z.A) / area, anni, amb);
    z.massa = v.massa; z.sigma = v.massa / ((z.dx ? MEDIA : 1) * z.A); z.grani = grani(z.sigma, z.omega, rho, z.consumo * anni * ANNO); z.tau = z.grani.tau;
    massa += v.massa; piovuta += v.dentro; if (z === fasce.at(-1)) lunette = v.fuori;
    if (!densa || z.tau > densa.tau) densa = z;
  }
  if (!densa || !(densa.tau > L.soglia)) return null;
  // la zona di pioggia sotto la parte che dura: un velo di materia di passaggio (l'anello C), tanto denso
  // quanto serve perché la pioggia porti via ciò che la viscosità gli versa dentro
  const prima = fasce[0], versa = prima.C2 === Infinity ? 0 : (prima.massa ** 3 / (2 * prima.C2)) * prima.versoDentro;
  const velo = !tutto && a0 > aIn && prima.a1 === a0 ? Math.min(prima.tau, versa / (amb.pioggia * Math.PI * (a0 * a0 - aIn * aIn))) : 0, conVelo = velo > L.soglia;
  const vive = fasce.filter((z) => z.tau > L.soglia), interno = (conVelo ? aIn : vive[0].a1) / R, esterno = vive.at(-1).a2 / R;
  const spessoreOttico = (r) => {
    if (!(r > interno && r < esterno)) return 0;
    const a = r * R; let t = a < a0 ? velo : 0;
    if (a >= a0) for (const z of fasce) if (a >= z.a1 && a <= z.a2) { t = z.tau * (z.dx ? forma(z.x0 + (z.dx * (a - z.a1)) / (z.a2 - z.a1)) : 1); break; }
    // le onde: fitte, sempre più strette allontanandosi dalla risonanza, finché si smorzano
    if (t > 0) for (const o of onde) { const x = a / o.a - 1; if (x > 0 && x < 2.5 * o.xd) t *= 1 + Math.min(0.9, o.ampiezza) * Math.cos(o.fase * x * x) * Math.exp(-((x / o.xd) ** 3)); }
    return t;
  };
  const eVive = (d) => d.r > interno && d.r < esterno, fuoriSincrona = esterno * R > sincrona;
  return {
    interno, esterno, massaKg: massa, etaAnni: anni, materiale, composizione: { [materiale]: 1 }, colore: L.colore[materiale].slice(), albedo: alb, temperatura: Tgrano,
    origine: `${materiale} da: ${cosa} (${fmtAnni(anni)} fa)`,
    spessoreMassimo: densa.tau, densita: (r) => Math.min(2, spessoreOttico(r)), spessoreOttico,
    grani: { taglia: densa.grani.taglia, minima: densa.grani.minimo, massima: densa.grani.massimo },
    divisioni: divisioni.filter(eVive), onde: onde.map((o) => ({ r: o.a / R, larghezza: (o.a * o.xd) / R, ampiezza: Math.min(0.9, o.ampiezza), causa: o.causa })).filter(eVive),
    bordi: { interno: conVelo ? "l'alta atmosfera del pianeta" : perche, esterno: fine },
    fasce: vive.map((z) => ({ da: z.a1 / R, a: z.a2 / R, massaKg: z.massa, spessore: z.tau })),
    denso: [vive[0].a1 / R, esterno], // la parte che si vede bene (senza il velo interno)
    // dove piove e quanto (kg/s, oggi); quanta materia è uscita dal bordo esterno a fare lunette, dove sarebbe oggi
    // una lunetta nata all'inizio, e che cosa ne è
    pioggia: { finoA: tutto ? esterno : conVelo ? a0 / R : 0, velo, kgAlSecondo: fasce.reduce((s, z) => s + (z.C2 === Infinity ? 0 : (z.massa ** 3 / (2 * z.C2)) * z.versoDentro) + (z.piove ? amb.pioggia * z.A * (1 - Math.exp(-MEDIA * z.tau)) : 0), 0) },
    lunette: { massaKg: lunette, aM: fuoriSincrona && lunette > 0 ? orbitaDopoLeMaree(P, lunette, aOut, anni) : aOut, destino: fuoriSincrona ? 'oltre il limite di Roche si riaggregano in lune che le maree allontanano' : "si riaggregano, ma girano più in fretta del pianeta: le maree le riportano dentro (l'anello si rifà)" },
    sincrona: sincrona / R, roche: roche / R, piovuta,
  };
}

// ---------- gli anelli di un pianeta, oggi
// P: un pianeta di sistema() (tipo, massaKg, raggioM, aM, Mstella; se ci sono: giorno, bloccato, obliquita, B0,
// clima, Lw, id). lune: la lista di lune(). stella: { massa, eta (anni), Z, morta }. caso: la sorgente degli
// eventi di questo pianeta (eventi.js). Rende null se oggi non c'è anello, oppure
// { interno, esterno (raggi del pianeta), massaKg, origine, etaAnni, materiale, composizione, colore, albedo,
//   densita(r) (spessore ottico, da 0 a 2: 0 = vuoto), spessoreOttico(r) (senza tetto), spessoreMassimo,
//   divisioni: [{ r, larghezza, causa }], onde: [{ r, larghezza, ampiezza, causa }], bordi, fasce,
//   denso: [da, a], grani: { taglia, minima, massima } (m), pioggia: { finoA, velo, kgAlSecondo }, lunette: { massaKg, aM,
//   destino }, sincrona, roche (raggi del pianeta), temperatura (K), futuro: [eventi di storia() che devono ancora venire] }.
export function anelli(P, lune = [], stella = {}, caso = sorgente(`anelli/pianeta ${P.id ?? 0}`)) {
  const eventi = storia(P, lune, stella, caso);
  let meglio = null;
  for (const e of eventi) {
    if (e.quando > 0) continue;
    const a = anelloDa(P, lune, stella, { massaKg: e.massaKg, ghiaccio: e.ghiaccio, anni: -e.quando, cosa: e.cosa });
    if (a && (!meglio || a.massaKg > meglio.massaKg)) meglio = a;
  }
  if (meglio) meglio.futuro = eventi.filter((e) => e.quando > 0);
  return meglio;
}
