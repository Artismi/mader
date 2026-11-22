// leggi.js — le regole e i parametri. Tutto il resto deve discendere da qui.
//
// Le COSTANTI della natura e i PARAMETRI del cosmo; da questi si calcola il
// resto: quanto è vecchio l'universo, quanto vive una stella, che cosa diventa
// quando muore, quanto è forte il campo magnetico di ciò che resta. Cambiando
// una costante cambia tutto, in modo coerente (un multiverso anche di leggi).
// Dove la scienza non sa ancora far emergere una cosa dai principi (la
// distribuzione delle masse delle stelle che nascono, il legame tra una stella
// e il Sole come unità), si usa la legge misurata, e qui lo si dice.

// ---------- LE COSTANTI E LE UNITÀ: UN POSTO SOLO. Chi ne ha bisogno le prende da qui (o da unita.js, che le riesporta per
// le unità del motore), invece di riscriverle. Le costanti della natura sono quelle del CODATA 2018 (Tiesinga et al. 2021,
// Rev. Mod. Phys. 93, 025010), A PRECISIONE PIENA: c, h, e, kB e NA sono esatti dal SI rivisto del 2019; ħ è h/2π; G, σ,
// le masse, ε₀ e u sono i valori raccomandati, con tutte le loro cifre. (Prima erano arrotondati a quattro o cinque cifre:
// mp/me veniva 1836,206 invece di 1836,153, e chi scriveva a mano 1836,15 o 938,27 MeV non tornava col registro.)
const H_PLANCK = 6.62607015e-34;
export const COSTANTI = {
  c: 299792458, G: 6.6743e-11, hbar: H_PLANCK / (2 * Math.PI), h: H_PLANCK, kB: 1.380649e-23, sigma: 5.670374419e-8,
  me: 9.1093837015e-31, mp: 1.67262192369e-27, mn: 1.67492749804e-27, e: 1.602176634e-19,
  NA: 6.02214076e23, eps0: 8.8541878128e-12, u: 1.6605390666e-27, // (1/mol, F/m, kg: l'unità di massa atomica)
};
// LE UNITÀ. L'unità astronomica alle cifre di sempre, 1,496·10¹¹ m (esatta: 149 597 870 700 m, IAU 2012, risoluzione B2; il
// passaggio al valore esatto sposta di 1,4·10⁻⁵ ogni orbita, e rimescola i sistemi: resta per un giro a parte); il parsec è
// la sua definizione, 648 000/π UA esatte (IAU 2015, risoluzione B2): 3,0857·10¹⁶ m. L'anno luce è c per l'anno giuliano
export const UA = 1.496e11, PC = (648000 / Math.PI) * 149597870700, KPC = 1e3 * PC, MPC = 1e6 * PC;
export const GIORNO = 86400, ORA = 3600, ANNO_LUCE = COSTANTI.c * 365.25 * GIORNO; // (s, s, m)
export const ZERO_CELSIUS = 273.15, ATMOSFERA = 101325, GRADO = Math.PI / 180; // (K; Pa; rad: un grado)
// I PESI ATOMICI (g/mol), i valori convenzionali della IUPAC (Prohaska et al. 2022, Pure Appl. Chem. 94, 573), per gli
// elementi che il progetto pesa in più di un posto; le molecole si sommano da qui (l'acqua: 2·1,008 + 15,999 = 18,015)
export const PESI_ATOMICI = Object.freeze({ H: 1.008, He: 4.0026, C: 12.011, N: 14.007, O: 15.999, Na: 22.99, Mg: 24.305, Al: 26.982, Si: 28.085, S: 32.06, Cl: 35.45, K: 39.098, Ca: 40.078, Fe: 55.845 });
export const MOLARE_ACQUA = (2 * PESI_ATOMICI.H + PESI_ATOMICI.O) / 1000; // (kg/mol)
// I CORPI DI RIFERIMENTO del sistema solare (IAU 2015, risoluzione B3, valori nominali; la Terra col raggio medio)
export const MTERRA = 5.972e24, RTERRA = 6.371e6, MGIOVE = 1.898e27, RGIOVE = 7.149e7;
// (Tcmb: la temperatura del fondo cosmico oggi, 2,7255 K — Fixsen 2009, ApJ 707, 916 —; Neff: il numero efficace di specie di
// neutrini, 3,046 — Mangano et al. 2005. Da questi due e dalle costanti viene la densità di radiazione Ω_r (fotoni più
// neutrini): stanno qui perché Ω_r abbia una fonte sola. etaUniverso() qui sotto non la conta: oggi pesa 10⁻⁴)
export const COSMO = { H0: 67.7, Om: 0.31, OL: 0.69, Ob: 0.049, sigma8: 0.81, ns: 0.965, Tcmb: 2.7255, Neff: 3.046 };
export const ANNO = 3.156e7, MSOLE = 1.989e30, RSOLE = 6.957e8, LSOLE = 3.828e26, TSOLE = 5772; // (s; kg, m, W, K: il Sole, IAU 2015 B3)

// LA SOGLIA DEL COLLASSO SFERICO in sovradensità lineare, per un cosmo di sola materia: δc = (3/20)·(12π)^(2/3) = 1,68647
// (Gunn e Gott 1972; Peebles 1980, §19). Con Ω_Λ cala di meno dell'1% (Kitayama e Suto 1996): non contato, dichiarato
export const DELTA_C = (3 / 20) * Math.pow(12 * Math.PI, 2 / 3);
// L'INVERSA DELLA DISTRIBUZIONE A CAMPANA (normale ridotta), esatta: Φ(x) = ½·[1 + erf(x/√2)], con erf dalla sua serie a
// termini tutti positivi erf(y) = (2/√π)·e^(−y²)·Σ 2ⁿ·y^(2n+1)/(1·3·…·(2n+1)) (Abramowitz e Stegun 1964, 7.1.6), e tre passi
// di Newton dalla partenza di Winitzki 2008 (errore < 0,005; il suo a = 8(π − 3)/(3π(4 − π)), esatto). p tra 10⁻⁹ e 1 − 10⁻⁹
export const ripartizioneNormale = (x) => { const y = Math.abs(x) / Math.SQRT2, y2 = y * y; let t = y, s = y; for (let n = 1; t > 1e-17 * s; n++) { t *= (2 * y2) / (2 * n + 1); s += t; } const erf = (2 / Math.sqrt(Math.PI)) * Math.exp(-y2) * s; return x >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf); };
const WINITZKI = (8 * (Math.PI - 3)) / (3 * Math.PI * (4 - Math.PI));
export const inversaNormale = (p) => { const q = Math.max(1e-9, Math.min(1 - 1e-9, p)), x0 = 2 * q - 1, l = Math.log(1 - x0 * x0), b = 2 / (Math.PI * WINITZKI) + l / 2;
  let x = Math.sign(x0) * Math.SQRT2 * Math.sqrt(Math.sqrt(b * b - l / WINITZKI) - b);
  for (let k = 0; k < 3; k++) x -= (ripartizioneNormale(x) - q) / (Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI));
  return x; };

// l'età dell'universo, esatta per un cosmo piatto con materia e energia oscura
export function etaUniverso(p = COSMO) {
  const H = (p.H0 * 1000) / MPC;
  return (2 / (3 * H * Math.sqrt(p.OL))) * Math.asinh(Math.sqrt(p.OL / p.Om));
}

// la massa massima di una nana bianca (Chandrasekhar): dalla meccanica quantistica e dalla gravità
export function massaChandrasekhar(k = COSTANTI, mu = 2) {
  return (3.098 * Math.pow((k.hbar * k.c) / k.G, 1.5)) / (mu * k.mp) ** 2; // ≈ 1,43 masse solari (3,098 = ω₃·√(3π)/2, del polìtropo)
}
// la massa massima di una stella di neutroni: la stessa scala con i neutroni, ridotta dalla
// relatività e dalle forze nucleari (calcolo di Tolman-Oppenheimer-Volkoff: circa 1,5 volte Chandrasekhar)
export const massaMassimaNeutroni = (k = COSTANTI) => 1.55 * massaChandrasekhar(k);

// il raggio di una nana bianca (gas di elettroni degenere) e di una stella di neutroni
export function raggioNanaBianca(M, k = COSTANTI) {
  const Mc = massaChandrasekhar(k), x = Math.min(0.999, M / Mc);
  // R ∝ ħ² / (G·mₑ·(2mₚ)^(5/3)·M^(1/3)); 4,55 viene dal polìtropo di indice 3/2; vicino al limite si stringe
  const R0 = (4.55 * k.hbar * k.hbar) / (k.G * k.me * Math.pow(2 * k.mp, 5 / 3) * Math.pow(M, 1 / 3));
  return R0 * Math.sqrt(1 - x ** (4 / 3));
}
export function raggioNeutroni(M, k = COSTANTI) {
  // la stessa legge con i neutroni al posto degli elettroni; il coefficiente tiene conto delle forze nucleari
  return (4.0 * k.hbar * k.hbar) / (k.G * Math.pow(k.mn, 8 / 3) * Math.pow(M, 1 / 3));
}

// una stella in sequenza principale, con il Sole come unità (le relazioni di scala vengono dalla
// struttura stellare; i loro coefficienti si misurano sul Sole)
// (LE STELLE VERE stanno in stelle.js, dalla loro struttura: nessun modulo usa più questa. Resta come termine di
// confronto di test/test_stelle.mjs. La vecchia fine() — che cosa resta di una stella — è stata tolta: c'è stelle.fine)
export function stella(Msol) {
  const L = Msol < 0.43 ? 0.23 * Msol ** 2.3 : Msol < 2 ? Msol ** 4 : Msol < 55 ? 1.4 * Msol ** 3.5 : 32000 * Msol;
  const R = Msol < 1 ? Msol ** 0.8 : Msol ** 0.57;
  const T = TSOLE * Math.pow(L / (R * R), 0.25);
  // quanto vive: brucia circa il 10% del suo idrogeno, con un'efficienza di 0,7% (E = mc²)
  const vita = (0.1 * 0.007 * Msol * MSOLE * COSTANTI.c ** 2) / (L * LSOLE) / ANNO;
  return { L, R, T, vita };
}

// LA DISTRIBUZIONE DELLE MASSE DELLE STELLE CHE NASCONO (misurata): Kroupa 2001 (MNRAS 322, 231), eq. 2, ξ(m) ∝ m^(−α_i),
// continua ai bordi dei tratti: α₁ = 1,3 tra 0,08 e 0,5 M☉, α₂ = 2,3 sopra. Sotto 0,08 M☉ Kroupa passa alle nane brune
// (α₀ = 0,3), che qui non nascono come stelle; il taglio in alto a 100 M☉ è dichiarato (Kroupa 2001 non lo fissa). UN OGGETTO
// SOLO: chi vuole i limiti o le pendenze li legge qui (lingua.js, le classi di massa), e gli esponenti sono 1 − α
export const KROUPA_2001 = Object.freeze({ fonte: 'Kroupa 2001, MNRAS 322, 231, eq. 2', masse: Object.freeze([0.08, 0.5, 100]), alfa: Object.freeze([1.3, 2.3]) });
// la massa (M☉) che nasce con la ripartizione u (tra 0 e 1), contando le stelle (non la loro massa)
export function massaNascita(u, imf = KROUPA_2001) {
  const [a, b, c] = imf.masse, [a1, a2] = imf.alfa, e1 = 1 - a1, e2 = 1 - a2, k1 = b ** (a1 - a2); // (k1: la continuità in b)
  const w1 = (k1 * (b ** e1 - a ** e1)) / e1, w2 = (c ** e2 - b ** e2) / e2, f = w1 / (w1 + w2);
  if (u < f) return (a ** e1 + (u / f) * (b ** e1 - a ** e1)) ** (1 / e1);
  return (b ** e2 + ((u - f) / (1 - f)) * (c ** e2 - b ** e2)) ** (1 / e2);
}

// ---------- LA RADIOATTIVITÀ DELLA ROCCIA: una legge sola per i pianeti (geologia.js, interno) e per le lune (lune.js).
// Il calore che un chilo di roccia produce (W/kg), dalle quantità misurate nelle condriti di uranio 238 e 235, torio e
// potassio 40: ognuno si dimezza con il suo tempo (in miliardi di anni). Con l'età cala: a un miliardo di anni era
// quasi cinque volte quello di oggi (4,5 miliardi), a dieci sarà meno di un terzo.
// (I numeri: uranio 8,0 ppb, torio 29 ppb, potassio 550 ppm nelle condriti (Lodders 2003), per il calore che ogni chilo di
// nuclide libera, neutrini esclusi: U-238 95,13 µW · U-235 568,47 µW · Th-232 26,28 µW · K-40 28,47 µW (Dye 2012), con le
// abbondanze isotopiche 99,274% · 0,7204% · 100% · 0,0117%. Gli stessi nuclidi, contati uno per uno, sono in materia.js.)
export const ISOTOPI = [[0.7555e-12, 4.468], [0.0328e-12, 0.704], [0.7621e-12, 14.05], [1.832e-12, 1.248]];
export const caloreDellaRoccia = (etaAnni = 4.5e9) => { let s = 0; for (let i = 0; i < ISOTOPI.length; i++) { const q = ISOTOPI[i]; s = s + q[0] * Math.pow(2, (4.5 - etaAnni / 1e9) / q[1]); } return s; }; // (la stessa somma, nello stesso ordine, senza funzioni dentro)

// ---------- i pianeti: calore, atmosfera, acqua. Ogni numero discende dalla stella e dal pianeta.
export const R_GAS = 8.314; // (UA: in testa, con le unità)
// IL LIVELLO DI RIFERIMENTO DI UN GIGANTE DI GAS (Pa). Un gigante non ha un suolo: la sua «pressione al suolo» è
// infinita (clima.pressione = ∞ vuol dire «nessun suolo»), e tutto ciò che di un'aria si calcola a una pressione (la
// miscela dei gas, la chimica, i raggi cosmici, il vento) si calcola a questo livello, 1 bar. UNA CONVENZIONE SOLA: il
// clima di un gigante la porta in clima.livello, l'aria che ne esce ha atmosfera.pressione = clima.livello, e chi
// vuole «la pressione di un gigante» legge quella
export const LIVELLO_GIGANTI = 1e5;
// LA GRAVITÀ ALLA SUPERFICIE (m/s²): G·M/R². Una funzione sola: chi ne ha bisogno la chiama (o legge clima.g, che viene
// da qui), invece di riscrivere la formula
export const gravitaDiSuperficie = (massaKg, raggioM) => (COSTANTI.G * massaKg) / (raggioM * raggioM);
// la temperatura di equilibrio: la luce che arriva, meno quella riflessa, uguale a quella irradiata
export const temperaturaEquilibrio = (Lw, aM, albedo) => Math.pow((Lw * (1 - albedo)) / (16 * Math.PI * COSTANTI.sigma * aM * aM), 0.25);
// un gas resta se la gravità trattiene le sue molecole più veloci (parametro di Jeans: per restare
// miliardi di anni serve circa 25: così la Terra perde l'idrogeno e tiene l'azoto, la Luna perde tutto); l'esosfera è più calda della superficie
export const trattiene = (M, R, T, massaMolecola) => (COSTANTI.G * M * massaMolecola) / (COSTANTI.kB * 3 * T * R) > 25;
export const MOLECOLE = { idrogeno: 2, elio: 4, acqua: 18, azoto: 28, 'anidride carbonica': 44, metano: 16 };
// il punto di ebollizione dell'acqua a una pressione (dove la pressione del vapore la uguaglia); il ghiaccio fonde a 273 K;
// sotto 611 Pa (il punto triplo) l'acqua liquida non può esistere
// L'ACQUA NEI SUOI TRE STATI: UNA TABELLA SOLA (misurata: calore di formazione in kJ/mol ed entropia in J/mol/K a 298 K, le
// tabelle termochimiche standard). Da qui vengono le righe dell'acqua nella tabella di chimica.js (che le legge, non le
// riscrive), la pressione del vapore sopra il liquido e sopra il ghiaccio (vaporeSaturo, più sotto: la usano il clima a
// fasce, meteo.js, il mare e l'aria di chimica.js, che la chiama pressioneVapore) e il punto di ebollizione: così il
// mare bolle esattamente dove l'aria è satura a quella pressione. «evaporazione» (44,00 kJ/mol) ed «entropia»
// (118,89 J/mol/K) sono le differenze tra vapore e liquido della tabella, non numeri a parte
const ACQUA_STATI = Object.freeze({ vapore: Object.freeze([-241.83, 188.84]), liquida: Object.freeze([-285.83, 69.95]), ghiaccio: Object.freeze([-291.84, 47.95]) });
export const ACQUA = Object.freeze({ stati: ACQUA_STATI, evaporazione: 1000 * (ACQUA_STATI.vapore[0] - ACQUA_STATI.liquida[0]), entropia: ACQUA_STATI.vapore[1] - ACQUA_STATI.liquida[1], critica: 647, tripla: 611 });
export const ebollizione = (P) => ACQUA.evaporazione / (ACQUA.entropia - R_GAS * Math.log(Math.max(P, 1e-300) / 1e5));
// LA PRESSIONE DEL VAPORE D'ACQUA (Pa) sopra il liquido o sopra il ghiaccio: la costante di equilibrio tra lo stato
// condensato e il vapore, exp(−ΔG/RT) con ΔG = ΔH − T·ΔS dalla tabella qui sopra (ΔH e S costanti con la temperatura:
// l'approssimazione dichiarata di chimica.js); tra liquido e ghiaccio comanda quello che ne lascia in aria di meno (il più
// stabile). A 288 K dà 1,70 kPa (misurati 1,71), a 373,15 K 1,12 bar (misurato 1,013: il calore di evaporazione cala
// col caldo, e qui è costante). È LA SOLA FORMULA: chimica.js (pressioneVapore), meteo.js e mare.js la prendono da qui
const [H_VAPORE, S_VAPORE] = ACQUA_STATI.vapore, [H_LIQUIDA, S_LIQUIDA] = ACQUA_STATI.liquida, [H_GHIACCIO, S_GHIACCIO] = ACQUA_STATI.ghiaccio;
// (lontano dal punto dove i due si scambiano — 273,18 K con questa tabella — si sa già chi comanda, e si calcola solo quello:
// è lo stesso numero, con un esponenziale invece di due; il clima a fasce lo chiede milioni di volte)
const T_SCAMBIO = (1000 * (H_LIQUIDA - H_GHIACCIO)) / (S_LIQUIDA - S_GHIACCIO);
export const vaporeSaturo = (T) => { const g = 1000 * H_VAPORE - T * S_VAPORE, rt = R_GAS * T;
  if (T > T_SCAMBIO + 1) return 1e5 * Math.exp(-(g - (1000 * H_LIQUIDA - T * S_LIQUIDA)) / rt);
  if (T < T_SCAMBIO - 1) return 1e5 * Math.exp(-(g - (1000 * H_GHIACCIO - T * S_GHIACCIO)) / rt);
  return 1e5 * Math.min(Math.exp(-(g - (1000 * H_LIQUIDA - T * S_LIQUIDA)) / rt), Math.exp(-(g - (1000 * H_GHIACCIO - T * S_GHIACCIO)) / rt)); };
export function statoAcqua(T, P) {
  if (T >= ACQUA.critica) return 'vapore'; // (sopra il punto critico, 647 K, liquido e vapore non si distinguono più: non c'è un mare)
  if (P < ACQUA.tripla) return T < 200 ? 'ghiaccio' : 'vapore (il ghiaccio sublima: troppo poca pressione per il liquido)';
  return T < ZERO_CELSIUS ? 'ghiaccio' : T < ebollizione(P) ? 'liquida' : 'vapore';
}
// L'ACQUA ALLA SUPERFICIE: una fonte sola per il clima, per il mare e per l'interno. «frazione» è la parte della
// massa del pianeta che è acqua (i rocciosi la chiamano «acqua», i ghiacciati «ghiaccio»: è la stessa cosa), «kg»
// quanta ne sta in superficie. In un pianeta roccioso quasi tutta resta sciolta nella roccia del mantello, e fuori
// ne esce qualche centesimo (sulla Terra: gli oceani). In un mondo ghiacciato (più di un quinto di ghiaccio) non
// c'è roccia che la tenga: sta tutta sopra, in un guscio d'acqua o di ghiaccio profondo quanto una parte del raggio.
export const PARTE_FUORI = 0.04; // la parte dell'acqua (e dei gas arrivati con lei) che un pianeta di roccia ha liberato in superficie
export function acquaInSuperficie({ tipo, massaKg = 0, composizione = {} } = {}) {
  if (tipo === 'gassoso') return { frazione: 0, kg: 0 };
  // (la catena degli elementi: dei ghiacci di un pianeta di sistema() è acqua solo la parte quotaAcqua — il resto è CO e NH3
  // gelati con lei, elementi.js —; un pianeta fatto a mano, senza elementi, conta come acqua tutta la sua frazione, come prima)
  const frazione = composizione.acqua ?? composizione.ghiaccio ?? 0, quota = composizione.elementi?.quotaAcqua ?? 1;
  return { frazione, kg: massaKg * frazione * quota * (tipo === 'ghiacciato' ? 1 : PARTE_FUORI) };
}
// ---------- IL CLIMA: UNA LEGGE SOLA, A DUE RISOLUZIONI. Il bilancio di energia di un pianeta (modello di
// Budyko-Sellers): in ogni punto  C·∂T/∂t = luce assorbita − luce irradiata + calore portato dai vicini.
// Qui sotto ci sono i pezzi della legge (quanta luce arriva, quanta ne torna indietro, quanta ne trattiene l'aria,
// quanto calore porta) e la sua soluzione PER FASCE DI LATITUDINE (bilancioPerFasce: una colonna per parallelo, in
// un millisecondo): è il clima che ogni pianeta ha appena esiste (clima()). geologia.js (climaSuperficie) risolve
// LA STESSA legge, con gli stessi pezzi, sulla mappa vera del pianeta (64 × 32, terre e mari dove sono): le due
// temperature medie coincidono entro pochi gradi, e dove non coincidono è per ciò che la mappa ha in più (dove sono
// i continenti; e, quando il pianeta gira, i venti e le nuvole veri di meteo.js al posto dei valori attesi).
// IL CALORE PORTATO DAI VICINI non è più un coefficiente tarato sulla Terra (era 0,6·√p W/m²/K): è una legge, scritta più
// sotto (L'ARIA CHE PORTA IL CALORE), che dipende da rotazione, raggio, gravità, pressione, gradiente di temperatura,
// stratificazione e attrito di quel pianeta. clima() ne riporta l'equivalente come un numero solo (D, W/m²/K), con la
// stessa definizione con cui meteo.js misura il suo (diffusivita), perché la mappa e le prove li confrontino.
export const CLIMA = Object.freeze({
  capacitaTerra: 1e7, capacitaMare: 1e8, // (J/m²/K) quanto calore serve per scaldare di un grado il suolo, e lo strato di mare rimescolato
  albedoTerra: 0.25, albedoMare: 0.08, albedoGhiaccio: 0.62, // la parte di luce rimandata indietro (misurate)
  geloTerra: 268, geloMare: 266, // (K) sotto, la neve e il ghiaccio coprono (e sopra di 4 K non ce n'è più)
  // il rilievo che l'acqua deve coprire: la parte sommersa attesa è 1 − exp(−profondità media / rilievo). TARATO sulle
  // superfici che escono da superficiePianeta: 2 km con le placche (continenti e oceani), mezzo senza
  rilievoPlacche: 2000, rilievoFermo: 500,
});
// la luce media di un giorno (W/m²) a una latitudine, con il sole a una declinazione (radianti): la geometria esatta
export function luceDelGiorno(S0, lat, declinazione) {
  const x = -Math.tan(lat) * Math.tan(declinazione), h0 = x >= 1 ? 0 : x <= -1 ? Math.PI : Math.acos(x);
  return (S0 / Math.PI) * (h0 * Math.sin(lat) * Math.sin(declinazione) + Math.cos(lat) * Math.cos(declinazione) * Math.sin(h0));
}
// il ghiaccio ha bisogno di acqua: su un pianeta senza mari al freddo resta solo un po' di brina
export const acquaPerIlGhiaccio = (mare) => (mare > 0 ? Math.min(1, 0.15 + 2.5 * mare) : 0);
// LE NUVOLE: UNA LEGGE SOLA, per il clima a fasce (qui) e per la mappa con i venti (meteo.js, che prende da qui costanti e
// formule). Ciò che una nuvola rimanda dipende dall'acqua che tiene:
//   · l'acqua di una nube (kg/m²) è quella che la condensazione le dà nel tempo che la pioggia impiega a formarsi, 1/k₁
//     con k₁ = 10⁻³ s⁻¹ (Kessler, letto nel sorgente WRF); per le nubi basse che non piovono è l'evaporazione di sotto;
//   · lo spessore ottico è 3·acqua/(2·ρ·r), con gocce di raggio r = 10 µm (MISURATO sulle nubi d'acqua terrestri: è
//     l'incognita dichiarata delle nuvole); la luce rimandata è (1 − g)τ/(2 + (1 − g)τ), g = 0,85 (due flussi);
//   · l'infrarosso trattenuto è 1 − exp(−130·acqua) (Stephens 1978, non riletto);
//   · la copertura non ha una legge (lo dice la letteratura): Sundqvist 1989 dall'umidità, 1 − √((1 − U)/(1 − 0,6)), e per
//     le nubi basse Klein e Hartmann 1993 dalla stabilità, 5,7·LTS − 55,73 per cento (empiriche e terrestri).
// Dove non c'è una circolazione calcolata (il clima a fasce) servono i valori ATTESI di ciò che meteo.js calcola:
//   · la pioggia attesa è l'evaporazione di massa alla soglia della pioggia, ce·V·e_s(T)·(1 − 0,8)/(R_v·T). IL VENTO V non
//     è più un numero (erano 5 m/s): viene dalla STESSA LEGGE DEL TRASPORTO (ventoDellAria, più sotto): il vento che serve
//     alla cella per portare quel calore, quello che la rotazione gli aggiunge, quello dei vortici, più le raffiche.
//     Un'aria densa porta lo stesso calore andando piano: evapora di meno e le sue nuvole tengono meno acqua. «ventoAtteso»
//     (5 m/s) resta solo come RISERVA DICHIARATA per chi chiama senza un pianeta: su una griglia di pianeti d'acqua
//     (rotazione ×¼…×4, 0,1…10 bar, raggio ×½…×2) meteo.js dà 2–13 m/s (dal 10° al 90° percentile; mediana 5,6);
//   · «coperturaAttesa» 0,5 (le colonne sopra un mare stanno in media al 90% della soglia) e «stratiAttesi» 0,35 (le nubi
//     basse del resto) NON SONO UNA LEGGE: sono il RIASSUNTO DICHIARATO di ciò che esce da meteo.js su un mondo d'acqua
//     temperato; insieme danno il cielo coperto a 0,675. Sulla stessa griglia meteo.js copre da 0,40 a 0,85 del cielo (dal
//     10° al 90° percentile; mediana 0,70; estremi 0,23 e 1,00). La copertura non ha una legge nemmeno in letteratura
//     (Sundqvist e Klein-Hartmann sono empiriche): finché non c'è, questi due numeri restano liberi e misurati così
export const NUVOLE = Object.freeze({ kessler: 1e-3, raggioGocce: 1e-5, asimmetria: 0.85, densitaAcqua: 1000, assorbeInfrarosso: 130,
  sogliaPioggia: 0.8, sereno: 0.6, strati: Object.freeze([0.057, -0.5573]), ce: 1.3e-3, ventoAtteso: 5, coperturaAttesa: 0.5, stratiAttesi: 0.35 });
// quanta luce rimanda una nube che tiene «acqua» kg/m² (due flussi, senza assorbimento)
export const luceDellaNube = (acqua) => { const x = ((1 - NUVOLE.asimmetria) * 1.5 * acqua) / (NUVOLE.densitaAcqua * NUVOLE.raggioGocce); return x / (2 + x); };
// la luce che le nuvole ATTESE rimandano sopra un mare a temperatura T (già per la loro copertura). «luce» è la luce
// che arriva lì (W/m²): l'acqua non può evaporare, e poi piovere, più in fretta di quanto quella luce la faccia evaporare
// (2,5 MJ per chilo: il calore di evaporazione). «vento» (m/s) è quello al suolo, raffiche comprese: dalla legge del
// trasporto, se chi chiama ha un pianeta; se manca, la riserva dichiarata
export function riflessoNuvoleAtteso(T, luce = Infinity, vento = NUVOLE.ventoAtteso) {
  const N = NUVOLE, pioggia = Math.min((N.ce * vento * vaporeSaturo(T) * (1 - N.sogliaPioggia)) / ((R_GAS / MOLARE_ACQUA) * T), luce / 2.5e6);
  return N.coperturaAttesa * luceDellaNube(pioggia / (N.coperturaAttesa * N.kessler)) + (1 - N.coperturaAttesa) * N.stratiAttesi * luceDellaNube(pioggia / N.kessler);
}
// quanto le nuvole attese ci sono (0…1), dove non c'è una circolazione calcolata: servono mare che evapora e un'aria di
// almeno 0,1 bar che tenga il vapore. La copertura attesa del cielo è questo per coperturaDelCielo
export const nuvoleAttese = (mare, pressione) => (mare > 0.02 && isFinite(pressione) && pressione > 1e4 ? Math.min(1, mare * 2 + 0.3) : 0);
export const coperturaDelCielo = NUVOLE.coperturaAttesa + (1 - NUVOLE.coperturaAttesa) * NUVOLE.stratiAttesi;
// quanta luce rimanda un punto a temperatura t: il suolo (terra o mare: «mare» vale 0 o 1), il ghiaccio che lo copre
// se fa freddo e c'è acqua, e sopra le nuvole («riflesso»: la luce che rimandano quelle vere di meteo.js, già per la
// loro copertura; se manca, quella attesa dalla stessa legge, per quanto ce ne sono: «nuvole» = nuvoleAttese())
// («sotto»: quanto rimanda la superficie, se chi chiama lo sa già — il mare di mare.js, con il suo ghiaccio —; allora
// qui si aggiungono solo le nuvole)
// («vento»: quello al suolo atteso per quel pianeta, clima().vento, per le nuvole attese; se manca, la riserva)
export function riflette(t, mare, acquaGhiaccio, nuvole, riflesso = null, sotto = null, luce = Infinity, vento = undefined) {
  const ghiaccio = acquaGhiaccio * 0.5 * (1 - Math.tanh((t - (mare ? CLIMA.geloMare : CLIMA.geloTerra)) / 4)), suolo = sotto ?? ghiaccio * CLIMA.albedoGhiaccio + (1 - ghiaccio) * (mare ? CLIMA.albedoMare : CLIMA.albedoTerra);
  const cielo = riflesso ?? (nuvole > 0 ? nuvole * riflessoNuvoleAtteso(t, luce, vento) : 0);
  return suolo + cielo * (1 - suolo);
}
// ---------- L'ARIA CHE PORTA IL CALORE: UNA LEGGE SOLA per il clima a fasce (qui) e per i venti della mappa (meteo.js, che
// prende da qui la colonna d'aria a due strati, l'adiabatica, l'attrito e lo scambio con la superficie).
// Nel clima a fasce il calore non passa più da una fascia all'altra con un coefficiente tarato: sopra ogni fascia c'è
// la sua ARIA (una temperatura «A», senza inerzia), legata alla superficie dallo SCAMBIO e alle fasce vicine da ciò che
// l'aria sa portare:   scambio·(T − A) + div(portata·grad A) = 0,   e la superficie riceve scambio·(A − T).
//   1. LA COLONNA è quella di meteo.js: due strati di uguale massa, a tre quarti e a un quarto della pressione; lo strato
//      alto è più «caldo» del basso di quanto dice l'adiabatica (satura, se c'è un mare) che parte dalla superficie:
//      è la stratificazione Δθ; le onde interne corrono a c = √(R·½^κ/3 · Δθ); lo spessore è hs = R·T/g.
//   2. I VORTICI (dove il pianeta gira in fretta): la diffusività è quella del «gas di vortici» con la curvatura del
//      pianeta dentro (Gallet e Ferrari 2020, PNAS 117, 4491, arXiv:2010.10983, per il piano f; 2021, AGU Advances,
//      arXiv:2109.04091, per il piano β; modello quasi-geostrofico a due strati, attrito quadratico sullo strato basso):
//          𝒟 = D*·U·λ,   D* = c₃ / [√μ* + √(c₃/c_γ)·β*^(γ/2)]²,   β* = β·λ²/U,   μ* = μ·λ
//      con U = ⅔·R·|∂T/∂y|/f la metà della differenza di vento tra i due strati (il vento termico del gradiente CORRENTE,
//      scritto come lo scrive il modello a due strati di meteo.js), λ = c/f il raggio di deformazione, β = 2Ω·cos φ/a,
//      μ = 2·c_d/hs l'attrito dello strato basso (lo stesso c_d di meteo.js: mare 1,3·10⁻³, terra 3·10⁻³).
//      COSTANTI: c₃ = 2,0, c_γ = 0,113, γ = 3,64 (letti nel 2021: eq. 19 e limite senza attrito; √(c₃/c_γ) = 4,2), e
//      c₁ = 2,5 per la lunghezza di mescolamento ℓ = c₁·λ/√μ* (eq. 8; nel 2020 era 2,62): vengono da simulazioni
//      numeriche di turbolenza baroclina, NON dalla Terra. (Quelle del 2021 sono state lette due volte, nel 2026-11,
//      dalla copia ar5iv dell'articolo, e tornano tra loro — √(2,0/0,113) = 4,2; γ = 2/0,55 —, ma non sono ancora nelle
//      note di verifica di research_notes, dove c'è solo l'articolo del 2020.) Dove la curvatura comanda, D* = c_γ·ξ^γ con ξ = 1/β* la
//      criticità: β* = 3/2·c²/(R·|∂T/∂φ|·tan φ) non dipende né dalla rotazione né dal raggio (dipende dalla pendenza
//      delle isentropiche), e 𝒟 cresce con la 4,6ª potenza del gradiente: è quasi un «aggiustamento baroclino».
//      Il vortice non mescola più lontano di quanto è grande il pianeta: D* ≤ (c₃/c₁²)·(a/λ)² (dalla chiusura D* ∝ ℓ*²).
//      Con i vortici viaggia il vapore della colonna (quello di meteo.js: saturo alla soglia della pioggia, alto
//      quanto il vapore si dirada): alla capacità dell'aria c_p·p/g si aggiunge L·d(vapore)/dT.
//   3. LA CELLA (Hadley; e, su un pianeta bloccato, la circolazione dal giorno alla notte): l'aria in quota conserva il
//      momento angolare (Held e Hou 1980; il vento esatto sulla sfera u = Ω·a·sin²φ/cos φ da Kaspi e Showman 2015), e il
//      vento termico che ne segue fissa il gradiente massimo che la cella lascia:
//          |∂T/∂φ| ≤ G_M = ¾·Ω²a²/R · (2·sin³φ/cos φ + sin⁵φ/cos³φ)
//      (¾/R al posto di θ₀/(g·H): è la stessa relazione scritta per i due strati; equivale a H = 4/3·hs, vicino
//      all'altezza di scala che Rees e Garrett 2019 trovano giusta per i pianeti di roccia). Oltre G_M l'aria pareggia le
//      differenze alla velocità delle onde interne (𝒟 = c·a·(1 − G_M/|G|): di fatto subito). Dove G_M è piccolo (vicino
//      all'equatore; ovunque, su un pianeta lento) la cella tiene l'aria quasi uniforme: è il regime «a gradiente
//      debole» dei rotatori lenti (Showman e altri 2013; Haqq-Misra e altri 2018). Il bordo della cella non è scritto:
//      è dove il gradiente che resta scende sotto G_M, e più in là portano i vortici (il bordo baroclino di Held 2000).
//   4. LO SCAMBIO con la superficie (W/m²/K), quello di meteo.js: lo strato basso irraggia verso l'equilibrio con il
//      suolo, 4σT³·w₂/(w₁ + w₂), e gli scambia calore con il vento, c_p·(p/2g)·w₂·2·c_e·V/hs. Quando la cella tiene
//      l'aria uniforme è LUI il limite: su un mondo lento o bloccato il calore portato vale scambio/n(n+1) (n = 1 tra
//      giorno e notte, 2 tra equatore e poli), ed è ciò che meteo.js misura lì (Wordsworth 2015: sui pianeti bloccati
//      comanda lo strato limite).
//   5. IL VENTO al suolo viene dalla stessa legge: il vento della cella è il flusso di calore diviso per ciò che un
//      chilo d'aria porta scendendo e risalendo, v = flusso/(c_p·(p/2g)·Δθ); dove il pianeta gira, la rotazione lo piega
//      finché l'attrito lo ferma, u = √(f·v/μ) (gli alisei; non su un pianeta bloccato, dove il vento va dal giorno alla
//      notte; mai più del vento a momento angolare conservato, e la cella mai più veloce delle onde interne); i vortici
//      aggiungono V = (√c₃/c₁)·U·√D* (dalla chiusura: ⟨u²⟩ ~ (𝒟/ℓ)², senza il logaritmo); più le
//      raffiche. Serve allo scambio e alle nuvole attese (al posto dei 5 m/s di prima). Sulla Terra dà 3,6 m/s (misurati
//      6–7); contro i venti di meteo.js: ×1,6 sui pianeti asciutti, ×0,45 su quelli d'acqua, ×1,0 sui bloccati lenti;
//      su Marte dà 17 m/s (misurati 2–10): in un'aria sottile la cella deve correre per portare quel calore, ed è troppo.
// CHE COSA NON C'È (dichiarato): il mare non porta calore (lo fa mare.js sulla mappa: sulla Terra vera un terzo del
// trasporto ai tropici è del mare); il vapore viaggia solo con i vortici (la cella lo riporta verso l'equatore, e qui
// non si conta); su un pianeta bloccato le fasce girano attorno all'asse che punta alla stella ma il vento sente la
// rotazione attorno all'asse vero: f, β e G_M sono presi a 45° (un numero solo per tutte le fasce); il gradiente
// dell'aria in quota è preso uguale a quello dell'aria bassa; l'aria non ha inerzia (un'aria di decine di bar ne ha più
// del mare). Se il giorno non è dato vale quello della Terra (riserva dichiarata).
// CHE COSA TORNA E CHE COSA NO (i numeri li stampano le prove; «entro un fattore 2» è il metro):
//   · CON I VENTI DI METEO.JS, sulla stessa superficie tenuta ferma (test_meteo: rotazione ×¼…×4, pressione 0,1…10 bar,
//     raggio ×½…×2): pianeti lenti e bloccati ×1,16 (4 casi su 4 entro ×2: è lo scambio con la superficie a comandare,
//     per i due); pianeti asciutti che girano ×2,1 (5 su 11 entro ×2, tutti tra ×1,1 e ×5,6: la legge porta di più, e
//     di più dove 64×32 non risolve i vortici: rotazione ×4, aria sottile); pianeti d'acqua che girano ×0,29 (4 su 11):
//     lì i venti portano 10–13 PW quasi senza sentire né la rotazione né la pressione (è la cella di Hadley umida di
//     meteo.js, una volta e mezza più forte del vero, che porta il doppio della Terra), la legge 0,2–33 PW;
//   · CON LA TERRA VERA: sul profilo misurato (North 1975) la legge porta 3,6 PW a 45° (misurati 5–6 PW a 35–40° con il
//     mare; la sola aria ≈ 5 PW a 43°); i venti di meteo.js 10,8 PW a 28°. Nel clima a fasce la Terra sta a 291 K con
//     33 K tra equatore e poli e 2,1 PW (veri: 288, 40–45, 5–6): con la serra fissa la luce irradiata cresce di 3,4 W/m²
//     per grado (veri ~2), e a tenere 40 K di contrasto bastano 2 PW: contrasto e trasporto veri insieme non possono
//     tornare (test_fili lo stampa, con la riprova); la mappa con i venti sta entro un grado dalle fasce (prima 2,7);
//   · SULLA POPOLAZIONE (test_coerenza): clima() e la mappa con i venti coincidono entro 3 K su tutti i mondi tranne
//     dove decidono le nuvole (un mare caldo sotto un sole fisso, +36 K: i venti concentrano la pioggia sotto il sole e
//     lasciano sgombro il resto del giorno, anche a regime); prima, con 0,6·√p, gli scarti arrivavano a 64 K. Il ghiaccio
//     del lato notte dei mondi bloccati non coincide (la mappa spiana ancora la superficie con il coefficiente
//     equivalente, non con quest'aria). Con il vento vero delle arie dense e lente (≈ 1 m/s) le nuvole attese sono più
//     sottili di prima: nel campione di test_coerenza 50 mari su 373 non reggono più e bollono (43 su 319 sui mondi
//     bloccati, 7 su 54 sugli altri: erano tenuti dalle nuvole a 5 m/s), 6 mondi di vapore ritrovano il mare.
export const ARIA = Object.freeze({
  cdMare: 1.3e-3, cdTerra: 3e-3, ce: NUVOLE.ce, // l'attrito sul mare e sulla terra, lo scambio di calore e di vapore (formule di massa: misurati sulla Terra)
  raffica: 1, // (m/s) il vento minimo, quello delle raffiche della convezione, quando l'aria è ferma
  stabilitaSecca: 0.8, // un'aria senza vapore: il suo gradiente termico come frazione dell'adiabatico secco (Marte 0,55, Venere 0,8-0,9)
  vaporeMassimo: 0.1, // il vapore non supera questa frazione della pressione dell'aria (oltre, il modello non vale)
  molareAcqua: MOLARE_ACQUA, massaMolare: 0.029, // (kg/mol) l'acqua; e l'aria di riserva (azoto e ossigeno), se i gas non sono dati
  vortici: Object.freeze({ c3: 2.0, cGamma: 0.113, gamma: 3.64, c1: 2.5 }), // Gallet e Ferrari 2020, 2021 (da simulazioni, non dalla Terra)
  giornoDiRiserva: 86164, // (s) il giorno, se chi chiama non lo dà: quello della Terra
});
const R_VAPORE = R_GAS / ARIA.molareAcqua;
// il vapore che l'aria tiene a saturazione (resta un ospite dell'aria che lo porta), e d ln e_s / dT (per un grado)
export const vaporeNellAria = (T, p) => Math.min(vaporeSaturo(T), ARIA.vaporeMassimo * p);
export const pendenzaVapore = (T) => Math.log(vaporeSaturo(T + 0.5)) - Math.log(vaporeSaturo(T - 0.5));
// LA COLONNA D'ARIA A DUE STRATI (Lorenz 1960, Held e Suarez 1978): la costante dei gas e il calore specifico (dai gas),
// i pesi che legano la temperatura di ogni strato alla sua temperatura potenziale, la stabilità minima di un'aria secca
export function colonnaAria({ pressione, gravita, massaMolare = ARIA.massaMolare, cp = null }) {
  const R = R_GAS / massaMolare, cpA = cp ?? 3.5 * R, kappa = R / cpA, eps = ARIA.molareAcqua / massaMolare;
  const wm = Math.pow(0.5, kappa), w1 = wm / (1 + kappa), w2 = wm / (1 - kappa / 3), es = 1 - ARIA.stabilitaSecca, minimo = Math.pow(0.25, -kappa * es) - Math.pow(0.75, -kappa * es);
  const capStrato = (cpA * 0.5 * pressione) / gravita;
  return { pressione, gravita, R, cp: cpA, kappa, eps, wm, w1, w2, minimo, c2: (R * wm) / 3, capStrato, irraggia: (4 * COSTANTI.sigma * w2) / (w1 + w2), striscia: (capStrato * w2 * 2 * ARIA.ce * gravita) / R };
}
// l'adiabatica (satura se «umida») dalla superficie a T0 fino alla pressione fp·p: la temperatura lassù
// («n»: in quanti passi si sale; 24 per i venti di meteo.js, meno per le tabelle del clima a fasce, che la chiede molte volte)
// (PRESTAZIONI, senza cambiare un bit: i livelli di pressione a cui si passa salendo dipendono solo da «fp» e da «n», non
// dalla temperatura né dall'aria: exp(ln p) a ogni passo e a ogni mezzo passo si calcola una volta per coppia (fp, n) —
// gli stessi argomenti dati a Math.exp, quindi gli stessi numeri — e si tiene in tabella; la derivata è scritta sul posto)
const LIVELLI = [];
function livelliDi(fp, n) {
  for (let i = 0; i < LIVELLI.length; i++) if (LIVELLI[i].fp === fp && LIVELLI[i].n === n) return LIVELLI[i].E;
  const dl = Math.log(fp) / n, E = new Float64Array(2 * n); let lp = 0;
  for (let i = 0; i < n; i++) { E[2 * i] = Math.exp(lp); E[2 * i + 1] = Math.exp(lp + 0.5 * dl); lp += dl; }
  if (LIVELLI.length < 64) LIVELLI.push({ fp, n, E });
  return E;
}
const derUmida = (col, T, e) => { const p = col.pressione * e, es = vaporeNellAria(T, p), r = (col.eps * es) / (p - es), L = R_VAPORE * T * T * pendenzaVapore(T); return (col.R * T + L * r) / (col.cp + (L * L * r * col.eps) / (col.R * T * T)); };
export function adiabatica(col, T0, fp, umida, n = 24) {
  const kappa = col.kappa, dl = Math.log(fp) / n; let T = T0;
  if (!umida) { for (let i = 0; i < n; i++) { const m = T + 0.5 * dl * (kappa * T); T += dl * (kappa * m); } return T; }
  const E = livelliDi(fp, n);
  for (let i = 0; i < n; i++) { const m = T + 0.5 * dl * derUmida(col, T, E[2 * i]); T += dl * derUmida(col, m, E[2 * i + 1]); } return T;
}
// L'EQUILIBRIO sopra una superficie a temperatura T: le temperature potenziali dei due strati lungo l'adiabatica che
// parte da lì ([alto, basso]); un'aria secca resta comunque stabile del minimo misurato. La differenza è la stratificazione
export function equilibrioAria(col, T, umida, n = 24) { const t2 = adiabatica(col, T, 0.75, umida, n) / col.w2; return [Math.max(adiabatica(col, T, 0.25, umida, n) / col.w1, t2 + col.minimo * T), t2]; }
// il gradiente termico verticale (K/m) sopra una superficie a T: quello dell'adiabatica tra la superficie e metà pressione
export function gradienteTermico(col, T, umida, n = 24) { const Tm = adiabatica(col, T, 0.5, umida, n); return Math.min((T - Tm) / (((col.R * 0.5 * (T + Tm)) / col.gravita) * Math.LN2), (ARIA.stabilitaSecca * col.gravita) / col.cp); }
// LO SCAMBIO tra la superficie e l'aria bassa (W/m² per K): l'irraggiamento dello strato basso e il calore scambiato con
// un vento «vento» (m/s, raffiche comprese)
// (cioè capacità dello strato basso × (1/tempo di irraggiamento della colonna + 2·c_e·V/hs), con il tempo di irraggiamento
// capacità/4σT³ e hs = R·T/g: qui con le costanti raccolte, perché il clima a fasce lo chiede a ogni passo)
export const scambioConLAria = (col, T, vento) => col.irraggia * T * T * T + (col.striscia * vento) / T;
// CIÒ CHE L'ARIA SA PORTARE tra due fasce (la legge qui sopra, punti 2, 3 e 5). «aria»: ariaDelPianeta(); «par»: il
// parallelo, aria.parallelo(sinLat, cosLat) (ciò che lì dipende solo dalla latitudine: si calcola una volta); T la
// temperatura dell'aria lì (K), G il suo gradiente (K per radiante di latitudine). Riempie «out»:
//   k   la conduttanza (W/m²/K per il laplaciano sulla sfera unitaria: il flusso verso il freddo è k·G)
//   kd  d(k·G)/dG (per risolvere: il flusso cresce molto più in fretta del gradiente)
//   v2, u2, e2  i quadrati dei venti al suolo che ne seguono (m²/s²): della cella, piegato dalla rotazione, dei vortici
export function portataDellAria(aria, par, T, G, out) {
  const { col, a, umido, bloccato, onde, radice, vapore } = aria, Ga = Math.abs(G), x = Math.max(1, Math.min(127.999, T / 8)), k = Math.floor(x), fr = x - k;
  if (!(onde[k] >= 0)) aria.prepara(k); if (!(onde[k + 1] >= 0)) aria.prepara(k + 1);
  // (c: la velocità delle onde interne, √(c2·Δθ); dTheta: la stratificazione; mu: l'attrito dello strato basso, 2·c_d/hs)
  const c = onde[k] * (1 - fr) + onde[k + 1] * fr, c2T = c * c, dTheta = c2T / col.c2, mu = aria.attrito / T, cap = 2 * col.capStrato;
  let kv = 0, kdv = 0, e2 = 0;
  if (Ga > 1e-9) { // i vortici
    const lam = c / par.f, U = par.cU * Ga, M = par.cM * (radice[k] * (1 - fr) + radice[k + 1] * fr), X = Q_VORTICI * Math.pow((par.cB * c2T) / Ga, 0.5 * V_GAMMA), tetto = T_VORTICI * (a / lam) * (a / lam);
    let Ds = V_C3 / ((M + X) * (M + X)), m = (V_GAMMA * X) / (M + X); if (Ds > tetto) { Ds = tetto; m = 0; }
    kv = ((cap + umido * (vapore[k] * (1 - fr) + vapore[k + 1] * fr) * T) * Ds * U * lam) / (a * a); kdv = kv * (2 + m); e2 = T_VORTICI * U * U * Ds; }
  // la cella: oltre il gradiente del momento angolare conservato
  // (i venti: la cella non corre più delle onde interne, e la rotazione non le dà più del vento a momento angolare conservato)
  const kc = (cap * c) / a, kh = Ga > par.GM ? kc * (1 - par.GM / Ga) : 0, v = Math.min((kh * Ga * a) / (col.capStrato * dTheta), c);
  out.k = kv + kh; out.kd = Math.max(out.k, kdv + (Ga > par.GM ? kc : 0)); out.v2 = v * v; out.u2 = bloccato ? 0 : Math.min((par.f * v) / mu, par.uM2); out.e2 = e2;
  return out;
}
const V_C3 = ARIA.vortici.c3, V_GAMMA = ARIA.vortici.gamma, Q_VORTICI = Math.sqrt(ARIA.vortici.c3 / ARIA.vortici.cGamma), T_VORTICI = ARIA.vortici.c3 / (ARIA.vortici.c1 * ARIA.vortici.c1);
// l'aria di un pianeta, pronta per la legge: la colonna, la rotazione, l'attrito (dal mare e dalla terra che ha), il vapore
// (umido: 0…1, quanto ce n'è rispetto a un mondo d'acqua), e le tabelle per temperatura (si riempiono solo dove servono):
// la velocità delle onde interne c = √(R·½^κ/3·Δθ) (onde), √(c/T) (radice: entra nell'attrito), e la capacità del
// vapore L·d(vapore)/dT diviso T. parallelo(sinLat, cosLat): Coriolis f, il vento termico per unità di gradiente (cU),
// β·λ²/U senza la parte che dipende dalla temperatura (cB), √(μ·λ) senza la parte che dipende dalla temperatura (cM), e
// il gradiente massimo che la cella lascia (GM), il quadrato del vento a momento angolare conservato, Ω·a·sin²φ/cos φ (uM2:
// il tetto degli alisei). Su un pianeta bloccato vale per tutte le fasce il parallelo a 45°
export function ariaDelPianeta({ pressione, gravita, raggioM, giorno, mare = 0, bloccato = false, massaMolare = ARIA.massaMolare, cp = null }) {
  const col = colonnaAria({ pressione, gravita, massaMolare, cp }), umida = mare > 0, onde = new Float64Array(130).fill(NaN), radice = new Float64Array(130), vapore = new Float64Array(130), omega = (2 * Math.PI) / giorno, a = raggioM;
  const cd = mare * ARIA.cdMare + (1 - mare) * ARIA.cdTerra, attrito = (2 * cd * gravita) / col.R; // (μ = attrito/T)
  // (le tabelle: un valore ogni 8 K, fino a 1030 K, e in mezzo si interpola; l'adiabatica qui sale in 8 passi. Al gelo
  // profondo il vapore è così poco che il suo logaritmo non si calcola più: lì l'aria è secca)
  const prepara = (k) => { const T = 8 * k, bagnata = umida && vaporeSaturo(T - 0.5) > 1e-200, [e1, e2] = equilibrioAria(col, T, bagnata, 8), d = e1 - e2, dTheta = d > 0 && isFinite(d) ? d : col.minimo * T; onde[k] = Math.sqrt(col.c2 * dTheta); radice[k] = Math.sqrt(onde[k] / T); vapore[k] = 0;
    if (bagnata) { const dl = pendenzaVapore(T), hq = Math.min((col.R * T) / gravita, 1 / (Math.max(gradienteTermico(col, T, true, 8), 1e-12) * dl)), x = NUVOLE.sogliaPioggia * vaporeNellAria(T, pressione) * hq * dl * dl; if (isFinite(x) && x > 0) vapore[k] = x; } };
  const parallelo = (sinLat, cosLat) => { const s = bloccato ? Math.SQRT1_2 : Math.max(Math.abs(sinLat), 1e-3), co = bloccato ? Math.SQRT1_2 : Math.max(cosLat, 1e-3), f = 2 * omega * s, cU = (2 * col.R) / (3 * a * f);
    return { f, cU, cB: (2 * omega * co) / (a * f * f * cU), cM: Math.sqrt(attrito / f), uM2: ((omega * a * s * s) / co) ** 2, GM: ((3 * omega * omega * a * a) / (4 * col.R)) * ((2 * s * s * s) / co + (s * s * s * s * s) / (co * co * co)) }; };
  return { col, a, omega, cd, attrito, umido: nuvoleAttese(mare, pressione), bloccato, onde, radice, vapore, prepara, parallelo };
}
// L'EFFETTO SERRA: lo spessore ottico dell'aria per la luce infrarossa. La superficie irradia σT⁴/(1 + ¾τ).
// LEGGE EMPIRICA di riserva, quando dell'aria si conosce solo la pressione: τ = 0,8·(p / 1 bar)^0,6 (la Terra: 0,8)
export const serraDaPressione = (pressione) => (isFinite(pressione) ? 0.8 * Math.pow(Math.max(0, pressione) / 1e5, 0.6) : 2);
// IL LIMITE DEL VAPORE (Simpson 1927, Nakajima 1992; il valore è quello dei modelli di Kasting 1993 per la Terra): un'aria
// satura di vapore d'acqua non irradia verso lo spazio più di circa 282 W/m², per quanto calda sia la superficie. Un
// pianeta che ne assorbe di più non trova equilibrio finché ha un mare: l'acqua evapora tutta (è la storia di Venere)
export const LIMITE_VAPORE = 282;
// la parte sommersa attesa di un pianeta con «acquaKg» d'acqua in superficie (prima che la sua mappa esista)
export function mareAtteso({ acquaKg = 0, raggioM, placche = false }) {
  const profondita = acquaKg / 1000 / (4 * Math.PI * raggioM * raggioM);
  return profondita > 0 ? 1 - Math.exp(-profondita / (placche ? CLIMA.rilievoPlacche : CLIMA.rilievoFermo)) : 0;
}
// (una sicurezza del passo nel tempo, uguale alle due risoluzioni: in un passo la temperatura non raddoppia e non si
// dimezza, e sotto i 50 K di salto non si tocca niente; a regime non scatta mai)
export const frenaPasso = (t, dT) => Math.max(-Math.max(50, t / 2), Math.min(Math.max(50, t), dT));
// L'ARIA SOPRA LE FASCE (una per parallelo, da nord a sud; «lat» in radianti): il passo che la legge chiede. Dato ciò che
// la superficie è («Ts», K) e quanto in fretta può cedere («cdt» = capacità/passo di tempo, W/m²/K; Infinity se la
// superficie è tenuta ferma): lo scambio di ogni fascia con la sua aria (dal vento del passo prima; ridotto di quanto la
// superficie cede nel passo: è il passo implicito), ciò che l'aria porta tra le fasce (linearizzato attorno all'aria di
// prima: un passo di Newton), la temperatura dell'aria «A» (un sistema a tre diagonali) e il calore che dà a ogni fascia
// («dato», W/m²: ciò che una riceve un'altra lo ha dato, esattamente), e il vento al suolo che ne segue («vento», m/s,
// raffiche comprese; a metà strada con quello di prima: non rimbalza)
function ariaSulleFasce(aria, lat) {
  const H = lat.length, dphi = Math.PI / H, raffica2 = ARIA.raffica * ARIA.raffica, cosLat = new Float64Array(H), peso = new Float64Array(H), paralleli = [];
  for (let j = 0; j < H; j++) { cosLat[j] = Math.cos(lat[j]); if (j < H - 1) { peso[j] = Math.max(0, Math.cos(lat[j] - dphi / 2)) / (dphi * dphi); paralleli.push(aria.parallelo(Math.sin(lat[j] - dphi / 2), Math.cos(lat[j] - dphi / 2))); } }
  const A = new Float64Array(H), vento = new Float64Array(H).fill(ARIA.raffica), scambio = new Float64Array(H), ridotto = new Float64Array(H), kd = new Float64Array(H), sorg = new Float64Array(H), v2 = new Float64Array(H), dato = new Float64Array(H);
  const sotto = new Float64Array(H), diag = new Float64Array(H), sopra = new Float64Array(H), cp = new Float64Array(H), porta = { k: 0, kd: 0, v2: 0, u2: 0, e2: 0 }, dA0 = new Float64Array(H); let vecchio = Infinity;
  const passo = (Ts, cdt) => {
    for (let j = 0; j < H; j++) { const sj = scambioConLAria(aria.col, Ts[j], vento[j]); scambio[j] = sj; ridotto[j] = cdt === Infinity ? sj : (sj * cdt) / (cdt + sj); }
    // (ciò che l'aria porta — e il vento — si ricalcolano quando il gradiente dell'aria è cambiato di più del 3% da quando
    // sono stati calcolati, e comunque ogni quattro passi: vicino al regime la linearizzazione di prima vale ancora)
    let fresco = ++vecchio >= 4; for (let i = 0; i < H - 1 && !fresco; i++) { const dA = A[i] - A[i + 1]; if (Math.abs(dA - dA0[i]) > 0.03 * Math.abs(dA0[i]) + 1e-4) fresco = true; }
    if (fresco) { vecchio = 0; for (let i = 0; i < H - 1; i++) { const dA = A[i] - A[i + 1]; dA0[i] = dA; portataDellAria(aria, paralleli[i], 0.5 * (A[i] + A[i + 1]), dA / dphi, porta); kd[i] = porta.kd * peso[i]; sorg[i] = (porta.kd - porta.k) * peso[i] * dA; v2[i] = porta.v2 + porta.u2 + porta.e2; } }
    for (let j = 0; j < H; j++) { const sj = ridotto[j] * cosLat[j], kn = j > 0 ? kd[j - 1] : 0, ks = j < H - 1 ? kd[j] : 0; sotto[j] = -kn; sopra[j] = -ks; diag[j] = sj + kn + ks; A[j] = sj * Ts[j] + (j < H - 1 ? sorg[j] : 0) - (j > 0 ? sorg[j - 1] : 0); }
    cp[0] = sopra[0] / diag[0]; A[0] /= diag[0];
    for (let j = 1; j < H; j++) { const d = diag[j] - sotto[j] * cp[j - 1]; cp[j] = sopra[j] / d; A[j] = (A[j] - sotto[j] * A[j - 1]) / d; }
    for (let j = H - 2; j >= 0; j--) A[j] -= cp[j] * A[j + 1];
    for (let j = 0; j < H; j++) dato[j] = ridotto[j] * (A[j] - Ts[j]);
    if (fresco) for (let j = 0; j < H; j++) { const q = j === 0 ? v2[0] : j === H - 1 ? v2[H - 2] : 0.5 * (v2[j - 1] + v2[j]); vento[j] = 0.5 * vento[j] + 0.5 * Math.sqrt(q + raffica2); }
    return dato;
  };
  return { A, vento, scambio, dato, passo };
}
// il calore portato, misurato come lo misura meteo.js (diffusivita): il coefficiente che spianerebbe le differenze di
// temperatura della superficie con la stessa forza, D = −∫F·T/∫|∇T|² (W/m²/K), e il flusso verso il polo attraverso ogni
// parallelo (W; «raggioM» per averlo in watt). T e calore per fascia, da nord a sud. (Nel bilancio per fasce D si misura
// istante per istante lungo l'ultimo anno — sommaDelTrasporto —: con le stagioni, e ancora di più con un asse molto
// inclinato, le medie dell'anno sono quasi uniformi mentre il calore passa da un emisfero all'altro)
// («cosLat» e «cosS»: cos(lat) e max(0, cos(lat − dphi/2)) di ogni fascia, che chi chiama ha già: gli stessi numeri)
function sommaDelTrasporto(lat, T, calore, somma, cosLat, cosS) {
  const H = lat.length, dphi = Math.PI / H; let Tm = 0, Fm = 0, w = 0; for (let j = 0; j < H; j++) { const c = cosLat[j]; Tm += c * T[j]; Fm += c * calore[j]; w += c; } Tm /= w; Fm /= w;
  for (let j = 0; j < H; j++) { somma.FT += (calore[j] - Fm) * (T[j] - Tm) * cosLat[j]; if (j < H - 1) { const g = (T[j] - T[j + 1]) / dphi; somma.GG += g * g * cosS[j]; } }
}
function misuraDelTrasporto(lat, T, calore, raggioM) {
  const H = lat.length, dphi = Math.PI / H, area = raggioM > 0 ? 2 * Math.PI * raggioM * raggioM * dphi : 0, flusso = [], latFlusso = [];
  let Tm = 0, Fm = 0, w = 0; for (let j = 0; j < H; j++) { const c = Math.cos(lat[j]); Tm += c * T[j]; Fm += c * calore[j]; w += c; } Tm /= w; Fm /= w;
  let sFT = 0, sGG = 0, q = 0, massimo = 0, latitudine = 0;
  for (let j = 0; j < H; j++) { const c = Math.cos(lat[j]); sFT += (calore[j] - Fm) * (T[j] - Tm) * c; if (j < H - 1) { const g = (T[j] - T[j + 1]) / dphi; sGG += g * g * Math.max(0, Math.cos(lat[j] - dphi / 2)); q += (calore[j] - Fm) * c * area; flusso.push(q); const l = ((lat[j] - dphi / 2) * 180) / Math.PI; latFlusso.push(l); if (l > 0 && q > massimo) { massimo = q; latitudine = l; } } }
  return { D: sGG > 1e-12 ? Math.max(0, -sFT / sGG) : 0, lat: latFlusso, flusso, massimo, latitudine };
}
// LA LEGGE SU UNA SUPERFICIE DATA: quanto calore porta l'aria di un pianeta sopra una superficie che ha le temperature
// «T» (K, una per fascia, da nord a sud; per un pianeta bloccato dal punto sotto il sole a quello opposto), tenute ferme.
// È ciò che meteo.js calcola con i venti sulla stessa superficie: serve a confrontarli (test_meteo, la griglia di pianeti).
// → { D (W/m²/K), vento (m/s, medio), scambio (W/m²/K, medio), aria (K), calore (W/m² dato a ogni fascia), lat, flusso (W),
//     massimo (W), latitudine (gradi) }
export function trasportoSuSuperficie({ T, pressione, gravita, raggioM, giorno, mare = 0, bloccato = false, massaMolare = ARIA.massaMolare, cp = null, giri = 80 }) {
  const H = T.length, lat = Float64Array.from({ length: H }, (_, j) => Math.PI / 2 - ((j + 0.5) * Math.PI) / H), su = ariaSulleFasce(ariaDelPianeta({ pressione, gravita, raggioM, giorno, mare, bloccato, massaMolare, cp }), lat);
  su.A.set(T); for (let n = 0; n < giri; n++) su.passo(T, Infinity);
  let v = 0, sc = 0, w = 0; for (let j = 0; j < H; j++) { const c = Math.cos(lat[j]); v += c * su.vento[j]; sc += c * su.scambio[j]; w += c; }
  return { ...misuraDelTrasporto(lat, T, su.dato, raggioM), vento: v / w, scambio: sc / w, aria: Array.from(su.A), calore: Array.from(su.dato) };
}
// LA LEGGE RISOLTA PER FASCE. Una colonna per parallelo (per un pianeta bloccato le fasce girano attorno all'asse che
// punta alla stella: il «polo» è il punto sotto il sole). In ogni fascia terra e mare stanno nella proporzione «mare»
// e hanno la stessa temperatura. Il passo nel tempo è quello di climaSuperficie: la luce irradiata linearizzata, il
// calore dei vicini implicito (l'energia si conserva con qualunque passo), i primi anni al rallentatore se il mare ha
// la memoria lunga.
// IL CALORE DEI VICINI è quello che l'aria porta (la legge qui sopra): servono «giorno» (s), «raggioM» e «gravita», e se
// si conoscono i gas «massaMolare» e «cp». A ogni passo: lo scambio di ogni fascia con la sua aria (dal vento del passo
// prima), ciò che l'aria sa portare tra le fasce (dal gradiente dell'aria del passo prima, con la sua derivata: un passo
// di Newton), la temperatura dell'aria (un sistema a tre diagonali) e il calore che dà alla superficie (implicito: ciò
// che una fascia riceve un'altra lo ha dato, esattamente). Senz'aria (o senza raggio e gravità) nessun calore passa.
// «D» (W/m²/K), se è dato, sostituisce la legge con una diffusione uniforme della temperatura della superficie: serve
// alle prove (dare alle fasce il trasporto misurato da meteo.js) e a chi vuole il vecchio modello di Budyko-Sellers.
// → { T (media sul pianeta, K), ghiaccio (0…1), assorbita, irradiata, arriva (W/m²), lat, fasce } e, del calore portato:
//   D (W/m²/K: il coefficiente di diffusione equivalente, −∫F·T/∫|∇T|², la stessa definizione di meteo.diffusivita),
//   vento (m/s: quello al suolo, medio sul pianeta e sull'anno, raffiche comprese), scambio (W/m²/K, medio),
//   trasporto { lat (gradi: i paralleli tra le fasce), flusso (W verso il «polo nord» attraverso ognuno), massimo (W) e
//   latitudine (gradi) del più grande flusso verso il polo nell'emisfero nord, calore (W/m² dato a ogni fascia), aria (K) }
const LUCI = { S0: NaN, eps: NaN, H: 0, passiAnno: 0, luci: null };
export function bilancioPerFasce({ S0, anno, obliquita = 0, bloccato = false, mare = 0, pressione = 0, tau = 0, D = null, giorno = null, raggioM = null, gravita = null, massaMolare = ARIA.massaMolare, cp = null, Tavvio = 288, fasce = 16, anni = 8, passiAnno = 16 }) {
  const H = fasce, sigma = COSTANTI.sigma, serra = 1 + 0.75 * tau, dphi = Math.PI / H, eps = obliquita * GRADO;
  const lat = new Float64Array(H), cosLat = new Float64Array(H), cosN = new Float64Array(H), cosS = new Float64Array(H);
  for (let j = 0; j < H; j++) { lat[j] = Math.PI / 2 - (j + 0.5) * dphi; cosLat[j] = Math.cos(lat[j]); cosN[j] = Math.max(0, Math.cos(lat[j] + dphi / 2)); cosS[j] = Math.max(0, Math.cos(lat[j] - dphi / 2)); }
  const C = mare * CLIMA.capacitaMare + (1 - mare) * CLIMA.capacitaTerra, ghiaccioAcqua = acquaPerIlGhiaccio(mare), nuvole = nuvoleAttese(mare, pressione);
  // l'aria che porta il calore (se c'è, e se il pianeta è dato): la legge; se no, D dato o niente
  const fisso = D != null, conAria = !fisso && isFinite(pressione) && pressione > 0 && raggioM > 0 && gravita > 0;
  const aria = conAria ? ariaDelPianeta({ pressione, gravita, raggioM, giorno: giorno > 0 ? giorno : bloccato ? anno : ARIA.giornoDiRiserva, mare, bloccato, massaMolare, cp }) : null, raffica = ARIA.raffica;
  const su = aria ? ariaSulleFasce(aria, lat) : null, A = su ? su.A : new Float64Array(H), vento = su ? su.vento : new Float64Array(H).fill(raffica), scambio = su ? su.scambio : new Float64Array(H), dato = su ? su.dato : new Float64Array(H);
  // la luce rimandata da una fascia: la media di riflette() sulla sua terra e sul suo mare (scritta qui per esteso, con
  // gli stessi numeri: è il conto che si ripete di più; lontano dal gelo la tangente iperbolica vale già −1 o 1)
  const { albedoTerra: aT, albedoMare: aM, albedoGhiaccio: aG, geloTerra: gT, geloMare: gM } = CLIMA;
  // (PRESTAZIONI, stessi bit: senz'acqua per il ghiaccio la curva vale 0 esatto a ogni temperatura — 0 per qualunque
  // numero finito —: non serve la tangente iperbolica; t === t lascia a un NaN la strada di prima)
  const senzaGhiaccio = ghiaccioAcqua === 0;
  const gelo = (t, soglia) => (senzaGhiaccio && t === t ? 0 : t > soglia + 80 ? 0 : t < soglia - 80 ? ghiaccioAcqua : ghiaccioAcqua * 0.5 * (1 - Math.tanh((t - soglia) / 4)));
  const albedo = (t, luce, v) => {
    const cielo = nuvole > 0 ? nuvole * riflessoNuvoleAtteso(t, luce, v) : 0; let a = 0;
    if (mare < 1) { const g = gelo(t, gT), suolo = g * aG + (1 - g) * aT; a += (1 - mare) * (suolo + cielo * (1 - suolo)); }
    if (mare > 0) { const g = gelo(t, gM), suolo = g * aG + (1 - g) * aM; a += mare * (suolo + cielo * (1 - suolo)); }
    return a;
  };
  const T = new Float64Array(H).fill(Tavvio), nuovo = new Float64Array(H), media = new Float64Array(H), sole = new Float64Array(H), calore = new Float64Array(H), ariaMedia = new Float64Array(H);
  const memoria = (C * serra) / (4 * sigma * Math.max(3, Tavvio / 1.25) ** 3), veri = Math.min(4, anni - 1), totale = anni * passiAnno, lenti = bloccato ? totale : (anni - veri) * passiAnno, dtVero = anno / passiAnno;
  const dtLento = dtVero * Math.max(1, bloccato ? (12 * memoria) / (anni * anno) : (8 * memoria - veri * anno) / ((anni - veri) * anno));
  const sotto = new Float64Array(H), diag = new Float64Array(H), sopra = new Float64Array(H), cp_ = new Float64Array(H);
  // la luce di ogni fascia in ogni momento dell'anno (si calcola una volta)
  // (PRESTAZIONI, stessi bit: chi cerca il clima di un pianeta chiede molti bilanci di fila con la stessa luce e lo stesso
  // asse: la tabella dell'ultimo — stessa S0, stessa inclinazione, stesse fasce e stessi passi, confronto esatto — vale ancora;
  // qui la si legge soltanto)
  let luci = null;
  if (bloccato) for (let j = 0; j < H; j++) sole[j] = S0 * Math.max(0, Math.sin(lat[j]));
  else if (LUCI.luci && LUCI.S0 === S0 && LUCI.eps === eps && LUCI.H === H && LUCI.passiAnno === passiAnno) luci = LUCI.luci;
  else { luci = new Float64Array(passiAnno * H); for (let f = 0; f < passiAnno; f++) { const del = eps * Math.sin((2 * Math.PI * f) / passiAnno); for (let j = 0; j < H; j++) luci[f * H + j] = luceDelGiorno(S0, lat[j], del); }
    LUCI.S0 = S0; LUCI.eps = eps; LUCI.H = H; LUCI.passiAnno = passiAnno; LUCI.luci = luci; }
  A.set(T);
  // se alla fine il pianeta irradia ancora più (o meno) di quanto assorbe, non è a regime (il ghiaccio che avanza è
  // lento): si va avanti per altri anni, finché il bilancio torna. (Il passo lento non si allunga oltre: un passo
  // molto più lungo della memoria di una fascia la porterebbe da sola al suo equilibrio, prima che i vicini contino.)
  let assorbita = 0, irradiata = 0, pesi = 0, ghiaccio = 0, ventoMedio = 0, scambioMedio = 0, giri = 0; const dtAdesso = dtLento, somma = { FT: 0, GG: 0 };
  // UN PIANETA BLOCCATO SENZA NIENTE CHE PORTI IL CALORE (senz'aria, e senza una diffusione data): non ci sono stagioni né
  // vicini, e il pianeta è lì da miliardi di anni: ogni fascia è al suo bilancio fermo, luce assorbita = luce irradiata (con
  // il minimo di 3 K). Integrarlo nel tempo a partire da caldo dava, sulla faccia buia, la temperatura a cui era arrivata
  // raffreddandosi quando l'integrazione finiva (128 K su un sasso dove il bilancio dice 3): un resto della partenza, non
  // fisica (con 0,02 W/m² arrivano lì cent'anni per grado). Qui lo stesso passo della legge con il tempo lungo quanto si vuole
  // (C/dt → 0: è il metodo di Newton sul bilancio), da caldo, fascia per fascia, finché non si muove più
  if (bloccato && !su && !(fisso && D > 0)) {
    let ass = 0, irr = 0, w = 0, gh = 0;
    for (let j = 0; j < H; j++) {
      let t = T[j];
      for (let k = 0; k < 200; k++) { const entra = sole[j] * (1 - albedo(t, sole[j], vento[j])), esce = (sigma * t * t * t * t) / serra, dT = frenaPasso(t, ((entra - esce) * t) / (4 * esce)), nt = Math.max(3, t + dT); if (Math.abs(nt - t) < 1e-9 * t) { t = nt; break; } t = nt; }
      const entra = sole[j] * (1 - albedo(t, sole[j], vento[j])), esce = Math.max(entra, (sigma * t * t * t * t) / serra); // (al minimo di 3 K il buio irradia quanto riceve: niente)
      media[j] = t; ass += cosLat[j] * entra; irr += cosLat[j] * (t > 3 ? (sigma * t * t * t * t) / serra : entra); w += cosLat[j]; gh += cosLat[j] * (mare * gelo(t, gM) + (1 - mare) * gelo(t, gT));
      void esce;
    }
    let Tm = 0; for (let j = 0; j < H; j++) Tm += media[j] * cosLat[j]; Tm /= w;
    return { T: Tm, ghiaccio: gh / w, assorbita: ass / w, irradiata: irr / w, arriva: S0 / 4, lat: Array.from(lat, (x) => x / GRADO), fasce: Array.from(media),
      giri: 1, D: fisso ? D : 0, vento: ARIA.raffica, scambio: 0, trasporto: { lat: misuraDelTrasporto(lat, media, calore, raggioM).lat, flusso: new Array(H - 1).fill(0), massimo: 0, latitudine: 0, calore: Array.from(calore), aria: Array.from(media) } };
  }
  for (let giro = 0; giro < 8; giro++) {
  giri++; somma.FT = 0; somma.GG = 0; assorbita = 0; irradiata = 0; pesi = 0; ghiaccio = 0; ventoMedio = 0; scambioMedio = 0; media.fill(0); calore.fill(0); ariaMedia.fill(0);
  for (let n = 0; n < totale; n++) {
    const ultimo = n >= totale - passiAnno, dt = n < lenti && (giro === 0 || bloccato) ? dtAdesso : dtVero; // (gli anni lenti solo al primo giro: poi anni veri)
    if (!bloccato) { const o = (n % passiAnno) * H; for (let j = 0; j < H; j++) sole[j] = luci[o + j]; }
    for (let j = 0; j < H; j++) {
      // (PRESTAZIONI, stessi bit: al buio — la notte polare, la faccia lontana di un pianeta bloccato — la luce che entra è
      // zero qualunque sia l'albedo, che per temperature e venti finiti sta tra 0 e 0,9: zero per un numero positivo è
      // zero, con il suo segno. Fuori da quei limiti (mai, a regime) si fa il conto intero, come prima.)
      const t = T[j], sj = sole[j], vj = vento[j], entra = sj === 0 && t >= 3 && t <= 1e9 && vj >= 0 && vj <= 1e9 ? sj : sj * (1 - albedo(t, sj, vj)), esce = (sigma * t * t * t * t) / serra, molla = (4 * esce) / t, dT = frenaPasso(t, (dt * (entra - esce)) / (C + dt * molla));
      nuovo[j] = Math.max(3, t + dT);
      if (ultimo) { assorbita += cosLat[j] * entra; irradiata += cosLat[j] * (esce + molla * dT); pesi += cosLat[j]; }
    }
    if (su) { // L'ARIA: la sua temperatura, il calore che dà alla superficie (implicito), il vento
      const cdt = C / dt; su.passo(nuovo, cdt); for (let j = 0; j < H; j++) nuovo[j] = Math.max(3, nuovo[j] + dato[j] / cdt);
    } else if (fisso && D > 0) {
      // il calore portato dai vicini con un coefficiente dato, da un polo all'altro (tre diagonali)
      const q = (dt * D) / (C * dphi * dphi);
      for (let j = 0; j < H; j++) { dato[j] = nuovo[j]; sotto[j] = j > 0 ? (-q * cosN[j]) / cosLat[j] : 0; sopra[j] = j < H - 1 ? (-q * cosS[j]) / cosLat[j] : 0; diag[j] = 1 - sotto[j] - sopra[j]; }
      cp_[0] = sopra[0] / diag[0]; nuovo[0] /= diag[0];
      for (let j = 1; j < H; j++) { const d = diag[j] - sotto[j] * cp_[j - 1]; cp_[j] = sopra[j] / d; nuovo[j] = (nuovo[j] - sotto[j] * nuovo[j - 1]) / d; }
      for (let j = H - 2; j >= 0; j--) nuovo[j] -= cp_[j] * nuovo[j + 1];
      for (let j = 0; j < H; j++) { dato[j] = ((nuovo[j] - dato[j]) * C) / dt; A[j] = nuovo[j]; }
    } else { dato.fill(0); A.set(nuovo); }
    if (ultimo && su) sommaDelTrasporto(lat, nuovo, dato, somma, cosLat, cosS);
    for (let j = 0; j < H; j++) { T[j] = nuovo[j]; if (ultimo) { media[j] += nuovo[j] / passiAnno; calore[j] += dato[j] / passiAnno; ariaMedia[j] += A[j] / passiAnno; ventoMedio += (cosLat[j] * vento[j]) / passiAnno; scambioMedio += (cosLat[j] * scambio[j]) / passiAnno;
      // (il ghiaccio che si conta è QUELLO CHE L'ALBEDO VEDE: la stessa curva morbida gelo() attorno alle stesse soglie
      // (geloMare, geloTerra), fascia per fascia e momento per momento. Prima si contava a parte, con un taglio netto a
      // 271 K per il mare e a geloTerra per la terra: avanzava a gradini di una fascia intera, e chi cercava il ghiaccio
      // che «torna uguale a sé stesso» — il ciclo del carbonio in chimica.js — non trovava un punto fermo)
      // (PRESTAZIONI, stessi bit: tutto mare o tutta terra, e una temperatura che è un numero: la curva dell'altro è
      // moltiplicata per zero — un numero tra 0 e 1 per zero fa zero, e sommarlo non cambia niente — e non si calcola)
      const tn = nuovo[j];
      ghiaccio += (cosLat[j] * (tn === tn && mare === 1 ? mare * gelo(tn, gM) + 0 : tn === tn && mare === 0 ? 0 + (1 - mare) * gelo(tn, gT) : mare * gelo(tn, gM) + (1 - mare) * gelo(tn, gT))) / passiAnno; } }
  }
  if (Math.abs(irradiata - assorbita) < 0.01 * assorbita) break;
  }
  let Tm = 0, w = 0; for (let j = 0; j < H; j++) { Tm += media[j] * cosLat[j]; w += cosLat[j]; } Tm /= w;
  const mis = misuraDelTrasporto(lat, media, calore, raggioM);
  return { T: Tm, ghiaccio: ghiaccio / w, assorbita: assorbita / pesi, irradiata: irradiata / pesi, arriva: S0 / 4, lat: Array.from(lat, (x) => x / GRADO), fasce: Array.from(media),
    giri, D: fisso ? D : somma.GG > 1e-12 ? Math.max(0, -somma.FT / somma.GG) : 0, vento: ventoMedio / w, scambio: scambioMedio / w, trasporto: { lat: mis.lat, flusso: mis.flusso, massimo: mis.massimo, latitudine: mis.latitudine, calore: Array.from(calore), aria: Array.from(ariaMedia) } };
}
// IL CLIMA DI UN PIANETA: dalla luce della stella, dalla distanza, dalla massa, dall'acqua che ha in superficie,
// da come gira (anno, inclinazione dell'asse, bloccato o no). È il bilancio per fasce qui sopra: la temperatura «T»
// è la media sul pianeta e sull'anno, «albedo» la parte di luce che in tutto rimanda indietro (ghiaccio e nuvole
// compresi), «Teq» la temperatura che avrebbe con quell'albedo e senz'aria. Lo stato dell'acqua viene da T e dalla
// pressione; se è vapore il mare non c'è (l'acqua è nell'aria, o è fuggita) e il bilancio è quello di un mondo asciutto.
//   acqua     la parte della massa che è acqua; acquaKg quanta ne sta in superficie (se manca: acquaInSuperficie)
//   placche   se la crosta è a placche (il rilievo è più alto: a parità d'acqua emerge più terra)
//   aria      { pressione, tau }: la pressione vera dell'aria e la sua serra, quando i gas sono noti (chimica.js,
//             climaEAria); se manca, valgono le leggi di riserva: gas liberati per un milionesimo della massa, e la
//             serra dalla sola pressione
//   giorno    la durata del giorno (s): entra nel calore che l'aria porta (la rotazione); se manca: l'anno per un
//             pianeta bloccato, il giorno della Terra per gli altri (riserva dichiarata)
// → { Teq, T, g, pressione, tenuti, acqua, albedo } come sempre, e in più ciò che climaSuperficie deve condividere:
//   tau (la serra), D (il calore portato: il coefficiente equivalente alla legge dell'aria, W/m²/K), vento (m/s, al
//   suolo, dalla stessa legge), scambio, trasporto (il flusso verso i poli), Tavvio (da dove parte), mare e ghiaccio
//   attesi, nuvole, bilancio, fasce
export function clima({ Lw, aM, massaKg, raggioM, tipo, acqua = 0, acquaKg = null, anno = null, giorno = null, obliquita = 0, bloccato = false, placche = false, aria = null }) {
  const g = gravitaDiSuperficie(massaKg, raggioM), mu = COSTANTI.mp;
  if (tipo === 'gassoso') {
    const albedo = 0.35, Teq = temperaturaEquilibrio(Lw, aM, albedo), tenuti = Object.entries(MOLECOLE).filter(([, m]) => trattiene(massaKg, raggioM, Teq, m * mu)).map(([n]) => n);
    return { Teq, T: Teq * 1.2, g, pressione: Infinity, livello: LIVELLO_GIGANTI, tenuti, acqua: 'nelle nuvole', albedo };
  }
  // che cosa la gravità trattiene: decide la temperatura dell'aria alta, che non sa del ghiaccio in basso (albedo 0,3)
  const Tnuda = temperaturaEquilibrio(Lw, aM, 0.3), tenuti = Object.entries(MOLECOLE).filter(([, m]) => trattiene(massaKg, raggioM, Tnuda, m * mu)).map(([n]) => n);
  // LEGGE DI RISERVA, quando l'aria vera non è data: i gas liberati dall'interno sono un milionesimo della massa (la
  // Terra: 0,86 milionesimi, cioè 1 bar), un po' di più se c'è molta acqua; se la gravità li trattiene
  const gas = tenuti.includes('azoto') || tenuti.includes('anidride carbonica') ? 1e-6 * massaKg * (0.85 + 3 * acqua) : 0;
  // (oltre τ = 10⁴ l'aria è così spessa che il calore sale per convezione, non per irraggiamento: la serra non cresce più)
  const pressione = aria ? aria.pressione : (gas * g) / (4 * Math.PI * raggioM * raggioM), tau = Math.min(1e4, aria ? aria.tau : serraDaPressione(pressione));
  const S0 = Lw / (4 * Math.PI * aM * aM), periodo = anno ?? ANNO * Math.pow(aM / UA, 1.5), kg = acquaKg ?? acquaInSuperficie({ tipo, massaKg, composizione: { acqua } }).kg;
  // si parte caldo (un pianeta nasce caldo e si raffredda), ma non più di un quarto sopra dove lo porterebbe la sola luce
  // (e sotto un'aria spessa, da dove la porta la serra)
  const Tserra = Math.max(3, Tnuda * Math.pow(1 + 0.75 * tau, 0.25)), Tavvio = Lw > 0 ? Math.max(Tnuda, Math.min(310, 1.25 * Tserra), Tserra) : 3;
  // (il calore portato: la legge dell'aria, con il giorno del pianeta — se manca, quello dell'anno per un pianeta bloccato e
  // quello della Terra per gli altri — e con i suoi gas, se chi chiama li dà in «aria»: massaMolare, cp)
  const risolvi = (mare) => (S0 > 0 ? bilancioPerFasce({ S0, anno: periodo, obliquita, bloccato, mare, pressione, tau, giorno, raggioM, gravita: g, massaMolare: aria?.massaMolare || ARIA.massaMolare, cp: aria?.cp ?? null, Tavvio }) : { T: 3, ghiaccio: mare > 0 ? 1 : 0, assorbita: 0, irradiata: 0, arriva: 0, lat: [], fasce: [], D: 0, vento: ARIA.raffica, scambio: 0, trasporto: null });
  let mare = acqua > 0 ? mareAtteso({ acquaKg: kg, raggioM, placche }) : 0, b = risolvi(mare);
  // lo stato dell'acqua: dalla temperatura e dalla pressione; e in ogni caso vapore se il pianeta assorbe più luce di quanta
  // un'aria satura di vapore riesca a irradiare (LIMITE_VAPORE): allora il mare evapora tutto, qualunque sia la serra
  const stato = acqua > 0 ? (b.assorbita > LIMITE_VAPORE ? 'vapore' : statoAcqua(b.T, pressione)) : 'assente';
  if (mare > 0 && stato.startsWith('vapore')) { mare = 0; b = risolvi(0); }
  const albedo = b.arriva > 0 ? 1 - b.assorbita / b.arriva : 0.3, Teq = temperaturaEquilibrio(Lw, aM, albedo);
  return { Teq, T: b.T, g, pressione, tenuti, acqua: stato, albedo, tau, D: b.D, vento: b.vento, scambio: b.scambio, trasporto: b.trasporto, Tavvio, mare, ghiaccio: b.ghiaccio, nuvole: nuvoleAttese(mare, pressione) * coperturaDelCielo, bilancio: { assorbita: b.assorbita, irradiata: b.irradiata, arriva: b.arriva }, fasce: { lat: b.lat, T: b.fasce } };
}
