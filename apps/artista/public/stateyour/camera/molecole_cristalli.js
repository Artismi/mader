// molecole_cristalli.js — I CRISTALLI MOLECOLARI: quando una specie precipita, e come un conglomerato chirale amplifica
// uno sbilancio tra le due mani (vedi molecole.js per l'intestazione generale).
//
// (1) PRECIPITARE. Una specie sciolta precipita quando la sua concentrazione supera la solubilità S (sovrasaturazione
//     σ = c/S > 1). S viene da un ciclo: solido → gas → acqua. ΔG(sublimazione) = E_ret − T·ΔS_sub, e
//       S = c_gas(saturo) · exp(−ΔG_idr/RT),   c_gas = (1 bar/RT)·exp(−ΔG_sub/RT)
//     con ΔG_idr la differenza tra l'energia in acqua (con gli stati di carica al pH dato) e in gas, da molecole_energia.js.
//     L'ENERGIA DEL RETICOLO È UNA STIMA: E_ret = Z/2 · |E della coppia migliore di due molecole nel vuoto| (campo di
//     forze di molecole_forze.js, incontro di molecole_incontri.js), con Z = 6 vicini [PARAMETRO LIBERO]; l'entropia
//     persa nel cristallo è metà di quella del gas [PARAMETRO LIBERO: regola del pollice tra Trouton e Walden].
//     Con ±10 kJ/mol su E_ret la solubilità sbaglia di 50 volte: è un ORDINE DI GRANDEZZA, e le prove lo dicono caso per
//     caso. Si può dare la solubilità misurata («solubilita») e usare solo la seconda parte.
// (2) UN CONGLOMERATO CHE AMPLIFICA (Viedma 2005, Phys. Rev. Lett. 94, 065504; il modello è quello di Uwaha 2004, J. Phys.
//     Soc. Jpn. 73, 2601, ridotto al minimo). Una specie chirale che cristallizza come conglomerato (cristalli tutti
//     destri o tutti sinistri) e che in soluzione racemizza. Per ogni mano i: cristalli y_i, frammenti x_i (grumi
//     chirali staccati dalla macinazione), e il soluto z che racemizzando è comune alle due mani:
//       dy_i/dt = g·(z − S)·y_i + a·x_i·y_i − m·y_i        (crescita dal soluto; i frammenti si riattaccano ai cristalli
//       dx_i/dt = m·y_i − a·x_i·y_i − d·x_i                 DELLA STESSA MANO; la macinazione stacca frammenti, che si sciolgono)
//       z = totale − Σ (x_i + y_i)
//     Il termine a·x_i·y_i è autocatalitico e le due mani si contendono lo stesso soluto: lo sbilancio cresce come
//     d(ee)/dt ∝ ee·(1 − ee²) fino a una mano sola. Senza macinazione (m = 0) non ci sono frammenti e lo sbilancio resta
//     (maturazione di Ostwald a parte, che qui non c'è). Senza racemizzazione le due mani hanno ciascuna il suo soluto e
//     non si contendono niente: lo sbilancio resta. CRISTALLIZZAZIONE PREFERENZIALE: da una soluzione sovrasatura che
//     racemizza, seminata con una mano sola, precipita solo quella (non c'è nucleazione spontanea in questo modello).
//     I quattro ritmi (g, a, m, d) sono PARAMETRI LIBERI (1/s e L/mol/s): la legge dà la forma, non i tempi.
// CHE COSA MANCA (il progetto): (a) sapere dal grafo se una specie cristallizza come conglomerato o come racemato (il
// 5-10% delle sostanze chirali è conglomerato: serve l'energia dei due reticoli, cioè un impacchettamento vero, non una
// coppia); (b) il punto di fusione e l'energia del reticolo da una ricerca dell'impacchettamento nel gruppo spaziale
// (qui: una coppia × Z/2); (c) la velocità di racemizzazione in soluzione dalle regole delle reazioni (per gli
// amminoacidi passa per il carbanione in α: la famiglia c'è, il collegamento no); (d) nucleazione primaria (teoria
// classica: serve l'energia di superficie), distribuzione delle taglie e Gibbs-Thomson per la maturazione di Ostwald.

import { molecola, chiave, chiralita } from './molecole_grafo.js';
import { energia, R } from './molecole_energia.js';
import { interazione } from './molecole_incontri.js';

const VICINI = 6, PARTE_DI_ENTROPIA = 0.5;
// cristallo(x, { T, pH, concentrazione, solubilita (misurata, se c'è) }) →
//   { reticolo (kJ/mol, stima), dGsub (kJ/mol), pressioneVapore (bar), solubilita (mol/L), stimata, sovrasaturazione, precipita, chirale }
export function cristallo(x, { T = 298.15, pH = 7, concentrazione = null, solubilita = null } = {}) {
  const m = molecola(x), k = chiave(m), chirale = chiralita(m).length > 0; let S = solubilita, reticolo = null, dGsub = null, pVap = null;
  if (S == null) { const coppia = interazione(k, k, { solvente: null, T }), gas = energia(k, { T }), acqua = energia(k, { T, solvente: 'acqua', pH });
    reticolo = (VICINI / 2) * Math.max(0, -coppia.dE); dGsub = reticolo - T * PARTE_DI_ENTROPIA * (gas.S / 1000); pVap = Math.exp(-dGsub / (R * T));
    // (energia() dà il gas a 1 bar e il soluto a 1 mol/L: da 1 bar a 1 mol/L di gas c'è RT·ln(RT/1 bar·L/mol) = RT·ln 24,8)
    const dGidr = acqua.G - gas.G - R * T * Math.log(0.0831446 * T); S = (pVap / (0.0831446 * T)) * Math.exp(-dGidr / (R * T)); }
  const sigma = concentrazione != null ? concentrazione / S : null;
  return { chiave: k, reticolo, dGsub, pressioneVapore: pVap, solubilita: S, stimata: solubilita == null, sovrasaturazione: sigma, precipita: sigma != null ? sigma > 1 : null, chirale };
}

// conglomerato({ totale (mol/L, soluto + solido), solubilita (mol/L), L, D (mol/L di cristalli all'inizio), tempo (s),
//   crescita g (L/mol/s), riattacco a (L/mol/s), macinazione m (1/s), scioglimento d (1/s), racemizza (vero/falso) }) →
//   { L, D (cristalli + frammenti alla fine), soluto, ee (sbilancio del solido, da −1 a 1), eeIniziale, storia: [{ t, ee }] }
export function conglomerato({ totale = 1, solubilita = 0.1, L = 0.0101, D = 0.0099, tempo = 1e6, crescita = 1e-2, riattacco = 1, macinazione = 1e-3, scioglimento = 1e-2, racemizza = true, passi = 4000 } = {}) {
  let y = [L, D], x = [0, 0], zs = [(totale - L - D) / 2, (totale - L - D) / 2]; const dt = tempo / passi, storia = [], ee = () => { const a = y[0] + x[0], b = y[1] + x[1]; return a + b > 0 ? (a - b) / (a + b) : 0; }, ee0 = ee();
  for (let n = 0; n < passi; n++) { if (racemizza) zs = [(zs[0] + zs[1]) / 2, (zs[0] + zs[1]) / 2];
    for (const i of [0, 1]) { // (semi-implicito: ogni termine di perdita divide, così niente va sotto zero)
      const z = zs[i], sopra = z - solubilita, cresce = crescita * Math.max(sopra, 0) * y[i], cala = crescita * Math.max(-sopra, 0), attacco = riattacco * x[i] * y[i];
      const yN = (y[i] + dt * Math.min(cresce, Math.max(z, 0) / dt) + dt * attacco) / (1 + dt * (macinazione + cala)), xN = (x[i] + dt * macinazione * y[i]) / (1 + dt * (riattacco * y[i] + scioglimento));
      zs[i] += (y[i] + x[i]) - (yN + xN); y[i] = yN; x[i] = xN; }
    if (n % Math.ceil(passi / 40) === 0) storia.push({ t: n * dt, ee: ee() }); }
  return { L: y[0] + x[0], D: y[1] + x[1], soluto: zs[0] + zs[1], ee: ee(), eeIniziale: ee0, storia };
}
