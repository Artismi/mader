// vortici.js — I VORTICI DEL MARE A MESOSCALA: un processo di punti nello spazio e nel tempo, per indirizzo.
//
// Fra la cella del mare (mare.js, ~150 km) e le onde (metri) il mare aperto non aveva niente. Qui ci sono i vortici che il
// satellite vede in tutti gli oceani: le statistiche sono quelle di Chelton, Schlax e Samelson 2011 («Global observations of
// nonlinear mesoscale eddies», Progr. Oceanogr. 91, 167–216: 16 anni di altimetria, 177 000 vortici seguiti per almeno 4
// settimane), portate sul pianeta con le grandezze che lo fanno diverso dalla Terra (rotazione, raggio, stratificazione):
//   · IL RAGGIO DI DEFORMAZIONE. c₁ = √(g′·H) è la velocità delle onde interne del primo modo (g′ e H, il termoclino, da mare.js:
//     raggioVortici = c₁/f(45°)); R_d = c₁/|f| lontano dall'equatore e √(c₁/2β) vicino (Chelton e altri 1998, JPO 28, 433,
//     eq. 2.3–2.4: il raggio equatoriale), il minore dei due; f = 2Ω·sin φ, β = 2Ω·cos φ/R.
//   · LA DERIVA. I vortici vanno verso ovest alla velocità delle onde di Rossby lunghe, c = β·R_d² (Chelton 2011, §5: «quasi
//     uguale alla velocità di fase delle onde di Rossby baroclinche lunghe»), e si scostano di poco dal parallelo: la mediana di
//     tutti è 1,5° verso l'equatore, quella degli anticicloni 4,3° verso l'equatore, i cicloni (simmetrici attorno a 1,5°)
//     1,3° verso il polo (§7.1, Fig. 20).
//   · LA VELOCITÀ DI ROTAZIONE U: in unità della deriva, U/c, la distribuzione dei vortici extratropicali (§6.1: il 48% ha
//     U/c > 5, il 21% U/c > 10). Le due frazioni fissano una lognormale (mediana e σ, calcolate qui sotto): U = c·X.
//   · IL RAGGIO L_s (dove la velocità è massima): il parametro di non linearità quasi geostrofico U/(β·L_s²) è attorno a 1
//     (§6.2: > 1 per il 54% dei vortici del nord e il 60% del sud): L_s = √(U/β) = R_d·√X, la scala di Rhines (Rhines 1975),
//     dove l'energia che risale dalle scale di R_d si ferma; mai sotto R_d. La forma: il livello del mare a campana
//     (§4.4, Fig. 15: gaussiana), η ∝ e^(−r²/2L_s²), quindi v(r) = U·(r/L_s)·e^((1 − r²/L_s²)/2): massima in r = L_s.
//   · LA VITA: la distribuzione dei vortici seguiti per almeno τ settimane (§3.1: 177 000, 35 891, 17 252, 4396, 1494, 620
//     per 4, 16, 26, 52, 78, 104 settimane), tra i punti esponenziale a tratti, oltre l'ultimo con la stessa pendenza. Da lì la
//     vita media (13,5 settimane dalle 4; quella di chi passa le 16 viene 33 settimane: l'articolo dice 32). Nella vita la
//     velocità cresce e cala come sin(π·età/vita), con la media della vita uguale a U (le statistiche sono medie sulla vita).
//   · QUANTI. Vivi insieme, in media: N(≥4)·vita media / durata del record (16,25 anni) ≈ 2800 vortici, ognuno con l'area
//     π·L_s² di L_s medio 91,5 km (§4.2: 96 km a nord, 87 a sud) su 3,61·10¹⁴ m² di oceano (Eakins e Sharman 2010, NOAA
//     NGDC: 361,9 milioni di km²): la parte del mare dentro un vortice, φ ≈ 0,2. È il numero senza dimensioni che passa da un
//     mare all'altro: sul pianeta la densità dei vivi è φ/(π·⟨L_s²⟩) alla latitudine, e quella delle nascite questa divisa per
//     la vita media. Le nascite sono un processo di Poisson in celle di latitudine e longitudine «che derivano» (le coordinate
//     della cella vanno verso ovest con la deriva della sua fascia), in finestre di 26 settimane: per ogni cella e finestra la
//     serie con nome «…/vortici», «cella f i n» (eredita.js), quindi gli stessi vortici da ogni scala e da ogni distanza.
//     Metà cicloni, metà anticicloni (§4.1: il 6% in più di cicloni; qui pari). Un vortice nato o arrivato sulla terra muore.
//   · CHE COSA PORTANO. La temperatura: il vortice gira l'acqua attorno a sé, e il gradiente medio della temperatura del mare
//     (∇T̄ di mare.js) si avvolge in spirali — i bracci e i filamenti — senza risolvere le equazioni: T′(x) = ∇T̄·(x_orig − x),
//     x_orig il punto da cui l'acqua è venuta, ruotata di θ(r) = ω(r)·t (ω = v/r). Il nucleo, che il vortice trascina, porta
//     l'acqua del luogo da cui viene (−∇T̄·Δ, Δ lo spostamento). L'una e l'altra si rilassano verso il clima del posto con il
//     tempo dello scambio col cielo, τ_T = ρ·c_p·h/λ (lo stesso di mare.js), quindi t si conta come τ_T·(1 − e^(−età/τ_T)).
//     I bracci più stretti della sottomesoscala L_m = N·H_m/|f| (Boccaletti, Ferrari e Fox-Kemper 2007, JPO 37, 2228: lo
//     strato rimescolato, instabile, rimescola sotto quella larghezza) si confondono: N = c₁/H dal termoclino, H_m lo strato
//     rimescolato (pianeta.js), mai più spesso del termoclino. Questo lo fa la resa (pianeta.js).
// NON TORNA (dichiarato): la sintesi riproduce le statistiche a un punto (raggio, velocità, vita, deriva, densità) ma non
// l'interazione fra vortici (fusioni, scissioni); la lognormale di U/c è quella dei vortici extratropicali anche ai tropici;
// c₁ è uno solo per il pianeta (il termoclino di mare.js); i vortici più brevi di 4 settimane e più piccoli di 0,4° non sono
// nel censimento (la densità è un limite inferiore); la forma di crescita e calo nella vita (sin) è una chiusura.
import { serie } from './eredita.js';
import { normaleCumulata } from './finestra.js';
import { DATI } from './mare.js';

export const CHELTON = Object.freeze({
  settimane: [4, 16, 26, 52, 78, 104], quanti: [177000, 35891, 17252, 4396, 1494, 620], anni: 16.25,
  Ls: (96e3 + 87e3) / 2, areaOceano: 3.619e14,
  sopra5: 0.48, sopra10: 0.21, // P(U/c > 5), P(U/c > 10)
  anticicloni: 4.3, media: 1.5, // gradi verso l'equatore
});
const SETTIMANA = 7 * 86400, FINESTRA = 26 * SETTIMANA, RAD = Math.PI / 180;

// la distribuzione della vita: S(τ) = N(≥τ)/N(≥4), esponenziale a tratti; τ in settimane
const VITA = (() => {
  const { settimane: t, quanti: n } = CHELTON, k = [];
  for (let i = 0; i + 1 < t.length; i++) k.push(Math.log(n[i] / n[i + 1]) / (t[i + 1] - t[i]));
  let media = t[0];
  for (let i = 0; i + 1 < t.length; i++) media += (n[i] - n[i + 1]) / n[0] / k[i];
  media += n[n.length - 1] / n[0] / k[k.length - 1];
  // l'inversa: u in (0, 1] → τ con S(τ) = u
  const inversa = (u) => { const s = Math.max(1e-12, u) * n[0]; for (let i = 0; i + 1 < t.length; i++) if (s >= n[i + 1]) return t[i] + Math.log(n[i] / s) / k[i]; return t[t.length - 1] + Math.log(n[n.length - 1] / s) / k[k.length - 1]; };
  return { media, inversa };
})();
// la lognormale di X = U/c dalle due frazioni
const probit = (p) => { let a = -8, b = 8; for (let i = 0; i < 80; i++) { const m = 0.5 * (a + b); if (normaleCumulata(m) < p) a = m; else b = m; } return 0.5 * (a + b); };
const LOGN = (() => { const z5 = probit(1 - CHELTON.sopra5), z10 = probit(1 - CHELTON.sopra10), sigma = Math.log(2) / (z10 - z5), mu = Math.log(5) - sigma * z5; return { mu, sigma }; })();
// la media di max(1, X): ⟨L_s²⟩ = R_d²·⟨max(1, X)⟩
const MAX1 = (() => { const { mu, sigma: s } = LOGN; return Math.exp(mu + (s * s) / 2) * normaleCumulata((mu + s * s) / s) + normaleCumulata(-mu / s); })();
// la parte del mare dentro un vortice (Terra)
const VIVI = (CHELTON.quanti[0] * VITA.media) / (CHELTON.anni * 365.25 / 7), COPERTURA = (VIVI * Math.PI * CHELTON.Ls ** 2) / CHELTON.areaOceano;
export const STATISTICHE_TERRA = Object.freeze({ vitaMediaSettimane: VITA.media, vivi: VIVI, copertura: COPERTURA, mediana: Math.exp(LOGN.mu), sigma: LOGN.sigma });

// stato: il mare di mare.js; giorno: il giorno siderale del pianeta (s)
export function creaVortici(stato, { giorno = 86400 } = {}) {
  if (!stato || !stato.esiste || !(stato.raggioVortici > 0)) return null;
  const R = stato.raggioM, Om = (2 * Math.PI) / Math.abs(giorno || 86400), c1 = stato.raggioVortici * Math.SQRT2 * Om, H = stato.termoclino || 100;
  const lambda = stato.scambioColCielo > 0 ? stato.scambioColCielo : 4 * 5.670374e-8 * (stato.Tmedia || 288) ** 3, tauT = (1025 * 4000 * DATI.strato) / lambda;
  const fisica = (lat) => { const f = 2 * Om * Math.sin(lat), beta = (2 * Om * Math.cos(lat)) / R, Rd = Math.min(c1 / Math.max(Math.abs(f), 1e-12), Math.sqrt(c1 / (2 * Math.max(beta, 1e-20)))); return { f, beta, Rd, c: beta * Rd * Rd }; };
  // le celle: fasce alte (e celle larghe) quattro L_s mediani a 45°
  const f45 = fisica(Math.PI / 4), lato = 4 * f45.Rd * Math.sqrt(Math.exp(LOGN.mu)), nF = Math.max(2, Math.round((Math.PI * R) / lato)), dF = Math.PI / nF;
  const F = stato.fine, mareA = (lon, lat) => { if (!F || !F.tipo) return true; const i = Math.min(F.W - 1, Math.max(0, Math.floor(((lon / RAD + 180) / 360) * F.W))), j = Math.min(F.H - 1, Math.max(0, Math.floor(((90 - lat / RAD) / 180) * F.H))); return F.tipo[j * F.W + (((i % F.W) + F.W) % F.W)] === 1; };
  const T = stato.temperatura, W = stato.W, Hh = stato.H;
  const Tq = (i, j) => T[Math.min(Hh - 1, Math.max(0, j)) * W + (((i % W) + W) % W)];
  const gradiente = (lon, lat) => { const x = ((lon / RAD + 180) / 360) * W - 0.5, y = ((90 - lat / RAD) / 180) * Hh - 0.5, i = Math.round(x), j = Math.round(y), dx = (2 * Math.PI * R * Math.max(0.05, Math.cos(lat))) / W, dy = (Math.PI * R) / Hh; return [(Tq(i + 1, j) - Tq(i - 1, j)) / (2 * dx), (Tq(i, j - 1) - Tq(i, j + 1)) / (2 * dy)]; };
  const fasce = new Map(), nascite = new Map();
  const fascia = (b) => { let x = fasce.get(b); if (x) return x; const lat = -Math.PI / 2 + (b + 0.5) * dF, fi = fisica(lat), giro = 2 * Math.PI * R * Math.cos(lat), n = Math.max(1, Math.round(giro / lato));
    // la densità delle nascite: φ/(π·⟨L_s²⟩)/vita media (per m² e per s)
    const nasc = COPERTURA / (Math.PI * fi.Rd * fi.Rd * MAX1) / (VITA.media * SETTIMANA);
    x = { lat, fi, giro, n, dx: giro / n, nasc }; fasce.set(b, x); return x; };
  // le nascite di una cella in una finestra: { x′ (m, nella fascia che deriva), lat, t0, vita, X, segno }
  function cella(b, i, k) {
    const ch = `${b} ${i} ${k}`; let v = nascite.get(ch); if (v) return v; const fa = fascia(b), u = serie(`${stato.radice}/vortici`, `cella ${b} ${i} ${k}`);
    const media = fa.nasc * fa.dx * R * dF * FINESTRA; let q = 0, n = 0, p = Math.exp(-media), s = p; const r0 = u(q++); while (r0 > s && n < 64) { n++; p *= media / n; s += p; } // (Poisson per inversione)
    v = []; for (let m = 0; m < n; m++) { const a = u(q++), bb = u(q++), cc = u(q++), dd = u(q++), ee = u(q++), gz = probit(Math.min(1 - 1e-9, Math.max(1e-9, u(q++))));
      v.push({ xp: (i + a) * fa.dx, lat: fa.lat + (bb - 0.5) * dF, t0: (k + cc) * FINESTRA, vita: VITA.inversa(1 - dd) * SETTIMANA, segno: ee < 0.5 ? 1 : -1, X: Math.exp(LOGN.mu + LOGN.sigma * gz) }); }
    nascite.set(ch, v); if (nascite.size > 20000) nascite.delete(nascite.keys().next().value); return v;
  }
  // i vortici vivi all'istante t entro «raggio» (m) dal punto (lon, lat in radianti), i più vicini per primi
  function vicini(lon, lat, raggio, t, massimo = 32) {
    const out = [], margine = raggio + 4 * lato, b0 = Math.max(0, Math.floor((lat - margine / R + Math.PI / 2) / dF)), b1 = Math.min(nF - 1, Math.floor((lat + margine / R + Math.PI / 2) / dF)), vitaMax = VITA.inversa(1e-4) * SETTIMANA;
    const k1 = Math.floor(t / FINESTRA), k0 = Math.floor((t - vitaMax) / FINESTRA);
    for (let b = b0; b <= b1; b++) {
      const fa = fascia(b), cl = Math.cos(fa.lat), w = Math.min(fa.n, Math.ceil(margine / fa.dx) + 1), xOcchio = R * cl * lon + fa.fi.c * t, i0 = Math.floor(xOcchio / fa.dx);
      for (let di = -w; di <= w; di++) { const i = (((i0 + di) % fa.n) + fa.n) % fa.n;
        for (let k = k0; k <= k1; k++) for (const e of cella(b, i, k)) {
          const eta = t - e.t0; if (eta < 0 || eta >= e.vita) continue;
          // la deriva: verso ovest a c, scostata dal parallelo (cicloni verso il polo, anticicloni verso l'equatore)
          const ang = (e.segno > 0 ? CHELTON.anticicloni - 2 * CHELTON.media : -CHELTON.anticicloni) * RAD, emi = e.lat >= 0 ? 1 : -1, sp = fa.fi.c * eta;
          const latE = e.lat + (emi * Math.sin(ang) * sp) / R, lonE = (e.xp - fa.fi.c * t) / (R * cl);
          let dl = lonE - lon; dl -= 2 * Math.PI * Math.round(dl / (2 * Math.PI)); const ex = R * Math.cos(latE) * dl, ny = R * (latE - lat), dist = Math.hypot(ex, ny);
          const fi = fisica(latE), Ls = fi.Rd * Math.max(1, Math.sqrt(e.X)); if (dist - 3 * Ls > raggio) continue;
          const lonN = ((lonE + 3 * Math.PI) % (2 * Math.PI)) - Math.PI; if (!mareA(lonN, latE)) continue;
          const U = e.X * fi.c, inviluppo = 0.5 * Math.PI * Math.sin((Math.PI * eta) / e.vita), tEff = tauT * (1 - Math.exp(-eta / tauT));
          // il verso: i cicloni girano come f (antiorario al nord), gli anticicloni al contrario; ω positivo = antiorario
          const verso = e.segno * Math.sign(fi.f || emi), G = gradiente(lonN, latE), De = -fi.c * tEff, Dn = emi * Math.sin(ang) * fi.c * tEff;
          out.push({ lon: lonN, lat: latE, dist, Ls, U: verso * U * inviluppo, theta: (verso * U * tEff) / Ls, Gx: G[0], Gy: G[1], De, Dn, Tc: -(G[0] * De + G[1] * Dn), eta, vita: e.vita, ciclone: e.segno > 0 });
        } }
    }
    out.sort((a, b) => a.dist - b.dist); return out.slice(0, massimo);
  }
  return { c1, tauT, lato, fisica, vicini, sottomesoscala: (lat, hMix) => fisica(lat).Rd * Math.min(1, hMix / H) };
}
