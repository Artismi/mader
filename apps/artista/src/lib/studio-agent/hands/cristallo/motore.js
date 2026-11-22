// motore.js — dall'indirizzo al pattern: il cristallo, il passo scelto per convergenza, la pallina e la sua gemella, il
// viaggio, la tessera e la zona pulita (punto 4). Lo usano il worker dell'interfaccia e le prove.
//
// LA ZONA PULITA. Accanto alla pallina corre una gemella:
//   · a T = 0 (cristallo perfetto e freddo) è la stessa pallina spostata di δ₀ = 10⁻⁶ celle (un decimillesimo dello
//     spessore della linea), perpendicolarmente alla
//     velocità, in una direzione che viene dalla fonte del caso dell'indirizzo («gemella»). Una traiettoria regolare
//     se ne stacca lentamente (in modo lineare), una caotica come e^(λt);
//   · a T > 0 la pallina corre nel cristallo vero (gli atomi spostati dalle vibrazioni di ogni cella) e la gemella,
//     dallo stesso punto, nel cristallo perfetto.
// La zona pulita sono le celle attraversate prima che le due si stacchino più di d, lo spessore della linea a schermo:
// d = L/400 (con la finestra di L = 4 celle, un centesimo di cella: circa due punti su un'immagine di 800).
//
// IL PASSO si sceglie con la prova di convergenza (punto 3): si parte da dt = 0,2·w/v_max (e 0,2/Ω col magnete) e lo si
// dimezza finché, per tutto il tempo del pattern dentro la zona pulita, la linea col passo dt e quella col passo dt/2
// non distano più di d/2 (metà dello spessore: un margine sulla prova, che chiede d).
// LA LINEA tiene un punto ogni «ogni» passi, con ogni tale che i punti distino circa un centesimo di cella: la corda
// sbaglia di s²/8r, sotto 3·10⁻⁴ celle anche dove la curva ha raggio 0,05.

import { creaCristallo, punto, norma } from './reticolo.js';
import { creaPallina, avanza, creaViaggio, creaTessera, haMagnete } from './moto.js';
import { scriviFisica, direzioneUniforme } from './indirizzo.js';
import { sorgente } from './caso.js';
import { gruppoDelSito, orbita, descriviGruppo } from './simmetria.js';

export const DELTA0 = 1e-6;
export const sogliaDi = (finestra) => (finestra?.L ?? 4) / 400;

export function cristalliDi(p) {
  const radice = scriviFisica(p);
  const base = { ...p.reticolo, atomi: p.atomi, U0: p.U0, w: p.w, radice };
  const vero = creaCristallo({ ...base, T: p.T, difetti: p.difetti });
  const caldo = p.T > 0 || p.difetti > 0;
  return { vero, perfetto: caldo ? creaCristallo({ ...base, T: 0, difetti: 0 }) : vero, caldo, radice };
}

// la direzione dello spostamento della gemella: perpendicolare a v0 (nel piano, per i cristalli piani)
export function direzioneGemella(radice, v0, piano) {
  const v = norma(v0) > 0 ? v0.map((x) => x / norma(v0)) : [1, 0, 0];
  if (piano) return [-v[1], v[0], 0].map((x) => x / (Math.hypot(v[0], v[1]) || 1));
  const c = sorgente(radice);
  for (let k = 0; ; k++) {
    const u = direzioneUniforme(c(`gemella ${k} cos`), c(`gemella ${k} fi`)), s = punto(u, v);
    const q = [u[0] - s * v[0], u[1] - s * v[1], u[2] - s * v[2]], l = norma(q);
    if (l > 0.1) return q.map((x) => x / l);
  }
}

// la velocità massima possibile: v_max² = v0² + 2·(V(r0) − V_min), con V_min cercato su una griglia di 6³ punti
export function velocitaMassima(cr, r0, v0) {
  let Vmin = Infinity;
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) for (let k = 0; k < (cr.piano ? 1 : 6); k++) {
    const f = [i / 6, j / 6, k / 6], r = [0, 1, 2].map((q) => f[0] * cr.A[0][q] + f[1] * cr.A[1][q] + f[2] * cr.A[2][q]);
    Vmin = Math.min(Vmin, cr.campo(r[0], r[1], r[2], null));
  }
  if (cr.atomi.some((a) => a.s < 0)) Vmin = Math.min(Vmin, -cr.U0);
  const V0 = cr.campo(r0[0], r0[1], r0[2], null), v2 = punto(v0, v0) + 2 * Math.max(0, V0 - Vmin);
  return Math.sqrt(Math.max(v2, 1e-6));
}

// corre una pallina per n passi con passo dt e ne tiene la posizione ogni «ogni» passi
function corsa(cr, r0, v0, B, dt, n, ogni) {
  const s = creaPallina(cr, r0, v0), m = Math.floor(n / ogni), out = new Float64Array(3 * (m + 1));
  out.set(s.x, 0);
  for (let i = 1; i <= m; i++) { avanza(cr, s, dt, ogni, B, null); out.set(s.x, 3 * i); }
  return out;
}
// la pallina e la gemella insieme, fino a quando si staccano più di d (o per n passi): le posizioni della pallina e
// il numero di passi della zona pulita
function gemelle(cr, crG, r0, r1, v0, B, dt, n, d) {
  const s = creaPallina(cr, r0, v0), g = creaPallina(crG, r1, v0), d2 = d * d;
  let out = new Float64Array(3 * 1024), i = 0;
  out.set(s.x, 0);
  for (; i < n;) {
    avanza(cr, s, dt, 1, B, null); avanza(crG, g, dt, 1, B, null); i++;
    if (3 * i + 3 > out.length) { const q = new Float64Array(out.length * 2); q.set(out); out = q; }
    out.set(s.x, 3 * i);
    const x = s.x[0] - g.x[0], y = s.x[1] - g.x[1], z = s.x[2] - g.x[2];
    if (x * x + y * y + z * z > d2) break;
  }
  return { a: out, zona: i };
}

export function scegliPasso(p, cristalli = cristalliDi(p)) {
  const { vero, perfetto, caldo, radice } = cristalli, d = sogliaDi(p.finestra), B = p.B;
  const vmax = velocitaMassima(vero, p.r0, p.v0), Om = norma(B);
  let dt = 0.2 * vero.w / vmax; if (Om > 0) dt = Math.min(dt, 0.2 / Om);
  const g = direzioneGemella(radice, p.v0, vero.piano), r1 = caldo ? p.r0 : p.r0.map((x, i) => x + DELTA0 * g[i]);
  const prove = [];
  for (let giro = 0; giro < 12; giro++) {
    const n = Math.ceil(p.tempo / dt), { a, zona } = gemelle(vero, perfetto, p.r0, r1, p.v0, B, dt, n, d);
    const c = corsa(vero, p.r0, p.v0, B, dt / 2, 2 * zona, 2);
    let scarto = 0;
    for (let i = 0; i <= zona; i++) scarto = Math.max(scarto, Math.hypot(a[3 * i] - c[3 * i], a[3 * i + 1] - c[3 * i + 1], a[3 * i + 2] - c[3 * i + 2]));
    prove.push({ dt, zona, scarto });
    if (scarto < d / 2) return { dt, prove, vmax };
    dt /= 2;
  }
  return { dt, prove, vmax, nonConverge: true };
}

// ---------- la sessione: il pattern che cresce
export function creaSessione(p, opzioni = {}) {
  const cristalli = cristalliDi(p), { vero, perfetto, caldo, radice } = cristalli;
  const scelta = opzioni.dt ? { dt: opzioni.dt, prove: [], vmax: velocitaMassima(vero, p.r0, p.v0) } : scegliPasso(p, cristalli);
  const dt = scelta.dt, B = p.B, d = sogliaDi(p.finestra);
  const ogni = Math.max(1, Math.round(0.01 / (scelta.vmax * dt)));
  const passiTotali = Math.ceil(p.tempo / dt);
  const pallina = creaPallina(vero, p.r0, p.v0);
  const g = direzioneGemella(radice, p.v0, vero.piano);
  const gemella = creaPallina(perfetto, caldo ? p.r0 : p.r0.map((x, i) => x + DELTA0 * g[i]), p.v0);
  const viaggio = creaViaggio(), tessera = creaTessera(vero);
  // i tratti del viaggio (per la vista 🔍), sei numeri per tratto come quelli della tessera
  const tratti = { n: 0, s: new Float64Array(6 * 4096), vel: new Float32Array(4096) };
  const velocita = (v) => Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  viaggio.aggiungi(pallina.x, velocita(pallina.v));
  const S = {
    p, cristallo: vero, perfetto, dt, scelta, ogni, passiTotali, passi: 0, pallina, gemella, viaggio, tessera, tratti, d,
    zona: { celle: 0, finita: false, tempo: 0 }, finito: false, magnete: haMagnete(B),
  };
  const Ar = vero.Ar, cella = vero.frazionarie(pallina.x).map(Math.floor);
  // avanza di (circa) n passi; restituisce quanti tratti nuovi ci sono nella tessera e nel viaggio
  S.avanza = (n) => {
    const t0 = tessera.n, v0 = tratti.n;
    const blocchi = Math.max(1, Math.round(n / ogni));
    const prima = [0, 0, 0];
    for (let b = 0; b < blocchi && !S.finito; b++) {
      const m = Math.min(ogni, passiTotali - S.passi), x = pallina.x;
      prima[0] = x[0]; prima[1] = x[1]; prima[2] = x[2];
      avanza(vero, pallina, dt, m, B, null);
      if (!S.zona.finita) avanza(perfetto, gemella, dt, m, B, null);
      S.passi += m;
      const sp = velocita(pallina.v);
      viaggio.aggiungi(x, sp);
      tessera.aggiungi(prima, x, sp);
      if (tratti.n * 6 + 6 > tratti.s.length) {
        const s = new Float64Array(tratti.s.length * 2); s.set(tratti.s); tratti.s = s;
        const q = new Float32Array(tratti.vel.length * 2); q.set(tratti.vel); tratti.vel = q;
      }
      const o = 6 * tratti.n, ts = tratti.s;
      ts[o] = prima[0]; ts[o + 1] = prima[1]; ts[o + 2] = prima[2]; ts[o + 3] = x[0]; ts[o + 4] = x[1]; ts[o + 5] = x[2]; tratti.vel[tratti.n++] = sp;
      // le celle attraversate e la zona pulita
      if (!S.zona.finita) {
        const c0 = Math.floor(x[0] * Ar[0][0] + x[1] * Ar[0][1] + x[2] * Ar[0][2]), c1 = Math.floor(x[0] * Ar[1][0] + x[1] * Ar[1][1] + x[2] * Ar[1][2]), c2 = Math.floor(x[0] * Ar[2][0] + x[1] * Ar[2][1] + x[2] * Ar[2][2]);
        S.zona.celle += Math.abs(c0 - cella[0]) + Math.abs(c1 - cella[1]) + Math.abs(c2 - cella[2]);
        cella[0] = c0; cella[1] = c1; cella[2] = c2;
        const dx = x[0] - gemella.x[0], dy = x[1] - gemella.x[1], dz = x[2] - gemella.x[2];
        if (dx * dx + dy * dy + dz * dz > d * d) { S.zona.finita = true; S.zona.tempo = pallina.t; }
      }
      if (S.passi >= passiTotali) S.finito = true;
    }
    return { tessera: [t0, tessera.n], viaggio: [v0, tratti.n] };
  };
  S.frase = () => {
    const N = S.zona.celle;
    if (S.zona.finita) return N <= 1 ? 'si sfalda subito' : `si ripete bene per ${N} celle`;
    return S.finito ? `si ripete bene per tutto il viaggio: ${N} celle` : `si ripete bene da ${N} celle`;
  };
  return S;
}

// ---------- l'esponente di Lyapunov (Benettin): una gemella nello spazio delle fasi rinormalizzata ogni τ
export function lyapunov(cr, r0, v0, B, dt, tempo, tau = 0.5, delta = 1e-9, direzione = null) {
  const a = creaPallina(cr, r0, v0);
  let dir = direzione ?? [0, 1, 0, 0, 0, 0];
  const ln = Math.hypot(...dir); dir = dir.map((x) => x / ln);
  let b = creaPallina(cr, r0.map((x, i) => x + delta * dir[i]), v0.map((x, i) => x + delta * dir[3 + i]));
  const m = Math.max(1, Math.round(tau / dt)), giri = Math.floor(tempo / (m * dt));
  let somma = 0;
  for (let g = 0; g < giri; g++) {
    avanza(cr, a, dt, m, B, null); avanza(cr, b, dt, m, B, null);
    const dd = [0, 1, 2].map((i) => b.x[i] - a.x[i]).concat([0, 1, 2].map((i) => b.v[i] - a.v[i]));
    const l = Math.hypot(...dd); somma += Math.log(l / delta);
    b = { x: a.x.map((x, i) => x + (delta * dd[i]) / l), v: a.v.map((x, i) => x + (delta * dd[3 + i]) / l), t: a.t, F: [0, 0, 0] };
    cr.campo(b.x[0], b.x[1], b.x[2], b.F);
  }
  return somma / (giri * m * dt);
}


// ---------- la sorgente simmetrica: una sessione per ogni direzione dell'orbita, tutte con lo stesso passo
export function creaSorgente(p) {
  if (!p.sorgente) { const S = creaSessione(p); return { sessioni: [S], gruppo: null, direzioni: [p.v0] }; }
  const cristalli = cristalliDi(p), gruppo = gruppoDelSito(cristalli.vero, p.r0), direzioni = orbita(gruppo, p.v0, cristalli.vero.piano);
  const { dt } = scegliPasso(p, cristalli);
  return { sessioni: direzioni.map((v) => creaSessione({ ...p, v0: v }, { dt })), gruppo, direzioni, ...descriviGruppo(gruppo) };
}
