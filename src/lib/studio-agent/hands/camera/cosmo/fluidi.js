// fluidi.js — uno strato di fluido scaldato dal basso: la convezione.
//
// Il calore che esce dall'interno del pianeta attraversa uno strato basso
// d'acqua (una pozza, una laguna). Se lo strato è sottile il calore passa per
// conduzione e non succede niente; oltre una soglia il fluido si mette in moto
// e si organizza da solo in celle. Due spinte competono:
//   · la GRAVITÀ (Rayleigh): l'acqua calda, più leggera, sale; fa rulli e strisce
//     (Ra = g·α·ΔT·d³/(ν·κ), soglia 1100 con il fondo fermo e la superficie libera);
//   · la TENSIONE SUPERFICIALE (Marangoni): la superficie calda tira meno e il
//     fluido scivola verso il freddo; negli strati sottili vince lei e fa ESAGONI
//     (Ma = σ_T·ΔT·d/(ρ·ν·κ), soglia 80): sono le celle viste da Bénard nel 1900.
// Vicino alla soglia il moto obbedisce a un'equazione che si ricava da quelle dei
// fluidi (Swift-Hohenberg): ∂u/∂t = εu − (1+∇²)²u + g·u² − u³, con ε = quanto si è
// oltre la soglia e g = quanto conta la superficie (g > 0 fa esagoni).

import { comeSorgente } from './eventi.js';
import { RTERRA } from './leggi.js'; // le costanti e le unità: un posto solo

const ACQUA = { nome: 'acqua', alfa: 2.1e-4, nu: 1.0e-6, kappa: 1.4e-7, k: 0.6, rho: 1000, sigmaT: 1.5e-4 };

// il calore che esce dall'interno: il decadimento radioattivo nelle rocce, in proporzione alla massa
// (la Terra: 0,09 W/m²)
export const flussoInterno = (massaKg, raggioM) => (0.09 * (massaKg / 5.97e24)) / (raggioM / RTERRA) ** 2;

export function convezione({ g, q, d, fluido = ACQUA }) {
  const dT = (q * d) / fluido.k;
  const Ra = (g * fluido.alfa * dT * d ** 3) / (fluido.nu * fluido.kappa), Ma = (fluido.sigmaT * dT * d) / (fluido.rho * fluido.nu * fluido.kappa);
  const r = Ra / 1100, m = Ma / 80, epsilon = Math.max(r, m) - 1;
  return { dT, Ra, Ma, epsilon, esagoni: m > r, regime: epsilon < 0 ? 'fermo: il calore passa senza muovere il fluido' : epsilon > 2 ? 'turbolento' : m > r ? 'celle esagonali (vince la superficie)' : 'rulli e labirinti (vince la gravità)' };
}

// ---------- la Swift-Hohenberg su una griglia periodica, con la trasformata di Fourier
function fft(re, im, inv) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const a = ((inv ? 2 : -2) * Math.PI) / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const ur = re[i + k], ui = im[i + k], vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr; re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } }
  }
  if (inv) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}
function fft2(re, im, N, inv) {
  const r = new Float64Array(N), i_ = new Float64Array(N);
  for (let y = 0; y < N; y++) { for (let x = 0; x < N; x++) { r[x] = re[y * N + x]; i_[x] = im[y * N + x]; } fft(r, i_, inv); for (let x = 0; x < N; x++) { re[y * N + x] = r[x]; im[y * N + x] = i_[x]; } }
  for (let x = 0; x < N; x++) { for (let y = 0; y < N; y++) { r[y] = re[y * N + x]; i_[y] = im[y * N + x]; } fft(r, i_, inv); for (let y = 0; y < N; y++) { re[y * N + x] = r[y]; im[y * N + x] = i_[y]; } }
}
// il disegno delle celle: N×N, «onde» lunghezze d'onda di lato; il caso iniziale è un rumore minuscolo
export function celle({ epsilon, esagoni }, { N = 128, onde = 14, passi = 600, seme = 1 } = {}) {
  const caso = comeSorgente(seme, 'pozza').serie('rumore iniziale'); // (un evento solo: l'estrazione k è quella della cella k; seme: un numero o la sorgente del luogo)
  const eps = Math.min(1.2, Math.max(0.05, epsilon)), gq = esagoni ? 1.2 : 0, L = onde * 2 * Math.PI, dk = (2 * Math.PI) / L, dt = 0.5;
  const u = new Float64Array(N * N).map((_, k) => 0.05 * (caso(k) - 0.5)), lin = new Float64Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const kx = (x < N / 2 ? x : x - N) * dk, ky = (y < N / 2 ? y : y - N) * dk, k2 = kx * kx + ky * ky; lin[y * N + x] = 1 / (1 - dt * (eps - (1 - k2) ** 2)); }
  const re = new Float64Array(N * N), im = new Float64Array(N * N);
  for (let t = 0; t < passi; t++) {
    for (let i = 0; i < N * N; i++) { const v = u[i]; re[i] = v + dt * (gq * v * v - v * v * v); im[i] = 0; }
    fft2(re, im, N, false);
    for (let i = 0; i < N * N; i++) { re[i] *= lin[i]; im[i] *= lin[i]; }
    re[0] = 0; im[0] = 0; // la media non cambia: il moto sposta il calore, non lo crea
    fft2(re, im, N, true);
    for (let i = 0; i < N * N; i++) u[i] = re[i];
  }
  return { u, N, eps };
}
