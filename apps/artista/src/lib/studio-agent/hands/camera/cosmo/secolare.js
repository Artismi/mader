// secolare.js — come si scambiano l'eccentricità i corpi di un sistema, e quanto reggono le loro orbite prima di incrociarsi.
//
// Due leggi, usate da disco.js per la fase degli urti giganti (il modello a eventi di Kimura et al. 2025):
//   1. LA TEORIA SECOLARE di Laplace e Lagrange (Murray e Dermott 1999, cap. 7 [R]): al primo ordine nelle eccentricità e
//      mediata sulle orbite, z_j = e_j·e^(iϖ_j) obbedisce a dz/dt = i·A·z, con
//        A_jj =  n_j/4 · Σ_k (m_k/M*)·α_jk·ᾱ_jk·b⁽¹⁾_3/2(α_jk),   A_jk = −n_j/4 · (m_k/M*)·α_jk·ᾱ_jk·b⁽²⁾_3/2(α_jk)
//      (α il rapporto tra l'orbita più piccola e la più grande; ᾱ = α se il disturbatore sta fuori, 1 se sta dentro; b i
//      coefficienti di Laplace). Con il peso W_j = √(m_j·√a_j) la matrice W·A·W⁻¹ è simmetrica (la deficienza di momento
//      angolare Σ m√a·e² si conserva): i suoi autovettori sono i modi, i suoi autovalori le frequenze. L'eccentricità di un
//      corpo è la somma dei modi; la sua media nel tempo è ⟨e_j²⟩ = Σ_i e_ji² (Kimura et al. 2025, eq. 21 [V]).
//      (Si usa m_k/M* al posto di m_k/(M* + m_j): l'errore è la massa del pianeta su quella della stella, dichiarato.)
//      (Uno smorzamento per corpo, γ_j, si può dare: al primo ordine ogni modo i si smorza con Γ_i = Σ_j Q_ji²·γ_j [D]; vale
//      solo per γ più lenti dei giri secolari, e disco.js non lo usa.)
//   2. IL TEMPO DI INCROCIO di tre orbite vicine (Petit, Pichierri, Davies e Johansen 2020, A&A 641, A176, eq. 81 [V: letto
//      sul testo], con la distanza minima tra le orbite eccentriche e il fattore di densità K di Kimura et al. 2025, eq. 4, 5,
//      B1–B5 [V]): la diffusione caotica lungo le risonanze a tre corpi sovrapposte.
//        log₁₀(τ/P₁) = −log₁₀(32√19·ε_M·√(η(1−η))/(3√π)) + log₁₀((δ/δ_ov)⁶/(1 − (δ/δ_ov)⁴)) + √(−ln(1 − (δ/δ_ov)⁴))
//        δ_ij = ((1−e_j)a_j − (1+e_i)a_i)/a_j,  δ = δ₁₂δ₂₃/(δ₁₂ + δ₂₃),  η = ν₁₂(1−ν₂₃)/(1−ν₁₂ν₂₃) (ν i rapporti dei periodi),
//        ε_M = √(m₁m₃ + m₂m₃η²α₁₂⁻² + m₁m₂α₂₃²(1−η)²)/M*,  δ_ov = (6,55·K·ε_M)^¼·(η(1−η))^⅜,  K = min(0,5(N−3) + 1, 3)
//      (32√19/(3√π) è il 16√2·A/3 di Petit con A = √(38/π)). Oltre δ_ov le risonanze non si toccano più e il tempo è molto più
//      lungo (Petit: «probabilmente molto più grande», non dato): lì il tempo è quello misurato nelle simulazioni di molti
//      pianeti, la legge di Chambers, Wetherill e Boss 1996 (disco.js giriCheRegge, data da chi chiama), sulla coppia più stretta
//      della terna, con la sua distanza minima in raggi di Hill reciproci.

const limita = (x, a, b) => Math.max(a, Math.min(b, x));

// i coefficienti di Laplace b⁽ʲ⁾_s(α) = (1/π)∫₀^2π cos(jψ)/(1 − 2α cos ψ + α²)^s dψ, per s = 3/2 e j = 1, 2. Esatti, dagli
// integrali ellittici completi K ed E (la media aritmetico-geometrica): b⁽⁰⁾_½ = (4/π)K, b⁽¹⁾_½ = (4/(πα))(K − E), le altre
// con le ricorrenze in j e in s (Brouwer e Clemence 1961; Murray e Dermott 1999, eq. 6.69–6.70 [R]; controllate qui con
// l'integrale fatto coi trapezi):
//   b⁽ʲ⁺¹⁾_½ = (j(1+α²)·b⁽ʲ⁾_½ − (j − ½)α·b⁽ʲ⁻¹⁾_½)/((j + ½)α),   b⁽ʲ⁾_3/2 = (2j + 1)·((1+α²)·b⁽ʲ⁾_½ − 2α·b⁽ʲ⁺¹⁾_½)/(1 − α²)²
export function ellittici(k) {
  let a = 1, b = Math.sqrt(Math.max(0, 1 - k * k)), c = k, somma = 0.5 * c * c, p = 0.5;
  for (let n = 0; n < 40 && Math.abs(c) > 1e-16 * a; n++) { const an = 0.5 * (a + b); c = 0.5 * (a - b); b = Math.sqrt(a * b); a = an; p *= 2; somma += p * c * c; }
  const K = Math.PI / (2 * a); return [K, K * (1 - somma)];
}
export function laplace32(alfa) {
  const a = limita(alfa, 1e-6, 0.9999), [K, E] = ellittici(a), a2 = 1 + a * a, d = (1 - a * a) ** 2;
  const b0 = (4 / Math.PI) * K, b1 = (4 / (Math.PI * a)) * (K - E), b2 = (a2 * b1 - 0.5 * a * b0) / (1.5 * a), b3 = (2 * a2 * b2 - 1.5 * a * b1) / (2.5 * a);
  return [(3 * (a2 * b1 - 2 * a * b2)) / d, (5 * (a2 * b2 - 2 * a * b3)) / d];
}

// autovalori e autovettori di una matrice simmetrica N×N (riga per riga): S = Q·diag(g)·Qᵀ, con la riduzione a tridiagonale di
// Householder e il metodo QL implicito (tred2 e tql2 di EISPACK, nella forma della libreria JAMA, di pubblico dominio).
// Restituisce { g, Q } (Q[j*N + i] = componente j del modo i). La matrice di ingresso diventa Q.
export function autovalori(V, n) {
  const d = new Float64Array(n), e = new Float64Array(n);
  for (let j = 0; j < n; j++) d[j] = V[(n - 1) * n + j];
  for (let i = n - 1; i > 0; i--) {
    let scale = 0, h = 0; for (let k = 0; k < i; k++) scale += Math.abs(d[k]);
    if (scale === 0) { e[i] = d[i - 1]; for (let j = 0; j < i; j++) { d[j] = V[(i - 1) * n + j]; V[i * n + j] = 0; V[j * n + i] = 0; } }
    else {
      for (let k = 0; k < i; k++) { d[k] /= scale; h += d[k] * d[k]; }
      let f = d[i - 1], g = Math.sqrt(h); if (f > 0) g = -g;
      e[i] = scale * g; h -= f * g; d[i - 1] = f - g; for (let j = 0; j < i; j++) e[j] = 0;
      for (let j = 0; j < i; j++) { f = d[j]; V[j * n + i] = f; g = e[j] + V[j * n + j] * f; for (let k = j + 1; k <= i - 1; k++) { g += V[k * n + j] * d[k]; e[k] += V[k * n + j] * f; } e[j] = g; }
      f = 0; for (let j = 0; j < i; j++) { e[j] /= h; f += e[j] * d[j]; }
      const hh = f / (h + h); for (let j = 0; j < i; j++) e[j] -= hh * d[j];
      for (let j = 0; j < i; j++) { f = d[j]; g = e[j]; for (let k = j; k <= i - 1; k++) V[k * n + j] -= f * e[k] + g * d[k]; d[j] = V[(i - 1) * n + j]; V[i * n + j] = 0; }
    }
    d[i] = h;
  }
  for (let i = 0; i < n - 1; i++) {
    V[(n - 1) * n + i] = V[i * n + i]; V[i * n + i] = 1; const h = d[i + 1];
    if (h !== 0) { for (let k = 0; k <= i; k++) d[k] = V[k * n + i + 1] / h;
      for (let j = 0; j <= i; j++) { let g = 0; for (let k = 0; k <= i; k++) g += V[k * n + i + 1] * V[k * n + j]; for (let k = 0; k <= i; k++) V[k * n + j] -= g * d[k]; } }
    for (let k = 0; k <= i; k++) V[k * n + i + 1] = 0;
  }
  for (let j = 0; j < n; j++) { d[j] = V[(n - 1) * n + j]; V[(n - 1) * n + j] = 0; }
  V[(n - 1) * n + n - 1] = 1; e[0] = 0;
  for (let i = 1; i < n; i++) e[i - 1] = e[i]; e[n - 1] = 0;
  let f = 0, tst1 = 0; const eps = 2 ** -52;
  for (let l = 0; l < n; l++) {
    tst1 = Math.max(tst1, Math.abs(d[l]) + Math.abs(e[l])); let m = l; while (m < n - 1 && Math.abs(e[m]) > eps * tst1) m++;
    if (m > l) {
      for (let giro = 0; giro < 60; giro++) {
        let g = d[l], p = (d[l + 1] - g) / (2 * e[l]), r = Math.hypot(p, 1); if (p < 0) r = -r;
        d[l] = e[l] / (p + r); d[l + 1] = e[l] * (p + r); const dl1 = d[l + 1]; let h = g - d[l];
        for (let i = l + 2; i < n; i++) d[i] -= h; f += h;
        p = d[m]; let c = 1, c2 = c, c3 = c, s = 0, s2 = 0; const el1 = e[l + 1];
        for (let i = m - 1; i >= l; i--) {
          c3 = c2; c2 = c; s2 = s; g = c * e[i]; h = c * p; r = Math.hypot(p, e[i]); e[i + 1] = s * r; s = e[i] / r; c = p / r; p = c * d[i] - s * g; d[i + 1] = h + s * (c * g + s * d[i]);
          for (let k = 0; k < n; k++) { h = V[k * n + i + 1]; V[k * n + i + 1] = s * V[k * n + i] + c * h; V[k * n + i] = c * V[k * n + i] - s * h; }
        }
        p = (-s * s2 * c3 * el1 * e[l]) / dl1; e[l] = s * p; d[l] = c * p;
        if (!(Math.abs(e[l]) > eps * tst1)) break;
      }
    }
    d[l] += f; e[l] = 0;
  }
  return { g: d, Q: V };
}

// (i coefficienti di una coppia, in memoria per chiave e rapporto delle orbite)
function coefficienti(p, q, cache) {
  const al = p.a / q.a, chiave = cache && p.chiave != null ? p.chiave * 1e6 + q.chiave : null;
  let b = chiave ? cache.get(chiave) : null; if (!b || b[0] !== al) { b = [al, ...laplace32(al)]; if (chiave) cache.set(chiave, b); } return b;
}

// I BLOCCHI: dove spezzare una catena di corpi perché la teoria secolare si faccia a pezzi (costa come il cubo dei corpi). Due
// vicini si scambiano l'eccentricità tanto meno quanto più il loro accoppiamento |S_jk| è piccolo rispetto alla differenza dei
// loro giri secolari |S_jj − S_kk| (la parte scambiata va come il loro rapporto, al primo ordine [D]): la catena si taglia,
// finché ogni pezzo ha al più «quanti» corpi, dove questo legame è più debole. → gli indici di inizio dei pezzi
export function blocchiSecolari(corpi, Mst, quanti, cache = null) {
  const N = corpi.length; if (N <= quanti) return [0];
  const d = new Float64Array(N), off = new Float64Array(N), n = corpi.map((c) => (2 * Math.PI * Math.sqrt(Mst)) / Math.pow(c.a, 1.5)), W = corpi.map((c) => Math.sqrt(c.m * Math.sqrt(c.a)));
  // (per dove tagliare bastano i vicini: i giri secolari si sommano sulle coppie entro otto posti — l'accoppiamento cala in fretta
  // con la distanza —; la teoria secolare di ogni pezzo, poi, li conta tutti)
  for (let j = 0; j < N; j++) for (let k = j + 1; k < Math.min(N, j + 9); k++) { const p = corpi[j], q = corpi[k], b = coefficienti(p, q, cache), al = b[0];
    d[j] += 0.25 * n[j] * q.m * al * al * b[1]; d[k] += 0.25 * n[k] * p.m * al * b[1]; if (k === j + 1) off[j] = Math.abs((0.25 * n[j] * q.m * al * al * b[2] * W[j]) / W[k]); }
  const legame = (j) => off[j] / (off[j] + Math.abs(d[j] - d[j + 1])), inizi = [];
  const taglia = (lo, hi) => { if (hi - lo + 1 <= quanti) { inizi.push(lo); return; } let jm = lo; for (let j = lo; j < hi; j++) if (legame(j) < legame(jm)) jm = j; taglia(lo, jm); taglia(jm + 1, hi); };
  taglia(0, N - 1); return inizi;
}

// I MODI di un sistema. corpi: [{ a (UA), m (in masse della stella), zr, zi (le parti di z = e·e^(iϖ) al tempo di riferimento),
// gamma (1/anno: lo smorzamento del corpo) }], in ordine di distanza; Mst in masse solari. cache (facoltativa): una Map per i
// coefficienti di Laplace delle coppie (chiave: le due chiavi dei corpi, «chiave», interi sotto il milione).
// → { N, g (rad/anno), Q, cr, ci (le ampiezze dei modi, nelle variabili pesate W·z), W, G (lo smorzamento dei modi, 1/anno),
//     z(j, dt) → [zr, zi] dopo dt anni, e2(j, dt) → ⟨e_j²⟩ (la media sul ciclo secolare) dopo dt anni }
export function modiSecolari(corpi, Mst, cache = null) {
  const N = corpi.length, S = new Float64Array(N * N), W = new Float64Array(N), n = new Float64Array(N);
  for (let j = 0; j < N; j++) { const c = corpi[j]; W[j] = Math.sqrt(c.m * Math.sqrt(c.a)); n[j] = (2 * Math.PI * Math.sqrt(Mst)) / Math.pow(c.a, 1.5); }
  for (let j = 0; j < N; j++) for (let k = j + 1; k < N; k++) {
    const p = corpi[j], q = corpi[k], b = coefficienti(p, q, cache), al = b[0];
    // j disturbato da k (che sta fuori: ᾱ = α), k disturbato da j (che sta dentro: ᾱ = 1)
    S[j * N + j] += 0.25 * n[j] * q.m * al * al * b[1]; S[k * N + k] += 0.25 * n[k] * p.m * al * b[1];
    const ajk = -0.25 * n[j] * q.m * al * al * b[2], s = (ajk * W[j]) / W[k]; S[j * N + k] = s; S[k * N + j] = s;
  }
  const { g, Q } = autovalori(S, N), cr = new Float64Array(N), ci = new Float64Array(N), G = new Float64Array(N);
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const q = Q[j * N + i]; cr[i] += q * W[j] * corpi[j].zr; ci[i] += q * W[j] * corpi[j].zi; G[i] += q * q * (corpi[j].gamma || 0); }
  const z = (j, dt) => { let xr = 0, xi = 0; for (let i = 0; i < N; i++) { const q = Q[j * N + i], f = Math.exp(-G[i] * dt), ph = g[i] * dt, co = Math.cos(ph), si = Math.sin(ph); xr += q * f * (cr[i] * co - ci[i] * si); xi += q * f * (cr[i] * si + ci[i] * co); } return [xr / W[j], xi / W[j]]; };
  const e2 = (j, dt) => { let s = 0; for (let i = 0; i < N; i++) { const q = Q[j * N + i]; s += q * q * (cr[i] * cr[i] + ci[i] * ci[i]) * Math.exp(-2 * G[i] * dt); } return s / (W[j] * W[j]); };
  return { N, g, Q, cr, ci, W, G, z, e2 };
}

// IL TEMPO DI INCROCIO di tre orbite vicine (Petit et al. 2020, eq. 81, con Kimura et al. 2025: vedi in cima), in anni.
// a (UA), m (in masse della stella), e (⟨e²⟩^½), P1 il periodo del più interno (anni), K il fattore di densità.
// oltre (facoltativa): (Δ in raggi di Hill reciproci, μ = massa media sulla stella) → giri che la coppia regge, per le spaziature
// oltre la sovrapposizione (senza: infinito).
// → { tau (0: già incrociate; Infinity: oltre la sovrapposizione, se manca «oltre»), coppia (0: la coppia 1–2, 1: la 2–3: quella più stretta), d12, d23 }
export function tempoIncrocio(a1, a2, a3, m1, m2, m3, e1, e2, e3, P1, K, oltre = null) {
  const d12 = ((1 - e2) * a2 - (1 + e1) * a1) / a2, d23 = ((1 - e3) * a3 - (1 + e2) * a2) / a3, coppia = d12 <= d23 ? 0 : 1;
  if (!(d12 > 0) || !(d23 > 0)) return { tau: 0, coppia, d12, d23 };
  const d = (d12 * d23) / (d12 + d23), al12 = a1 / a2, al23 = a2 / a3, n12 = Math.pow(al12, 1.5), n23 = Math.pow(al23, 1.5);
  const eta = (n12 * (1 - n23)) / (1 - n12 * n23), ee = eta * (1 - eta);
  const eM = Math.sqrt(m1 * m3 + (m2 * m3 * eta * eta) / (al12 * al12) + m1 * m2 * al23 * al23 * (1 - eta) * (1 - eta));
  const dov = Math.pow(6.55 * K * eM, 0.25) * Math.pow(ee, 0.375), x = Math.pow(d / dov, 4);
  if (!(x < 1)) { if (!oltre) return { tau: Infinity, coppia, d12, d23 };
    // (oltre la sovrapposizione: la coppia più stretta, la sua distanza minima in raggi di Hill reciproci, i giri di Chambers)
    const [ai, aj, mi, mj, dd] = coppia === 0 ? [a1, a2, m1, m2, d12] : [a2, a3, m2, m3, d23], h = Math.cbrt((mi + mj) / 3) * 0.5 * (ai + aj);
    return { tau: P1 * oltre((dd * aj) / h, 0.5 * (mi + mj)), coppia, d12, d23 }; }
  const lg = -Math.log10((32 * Math.sqrt(19) * eM * Math.sqrt(ee)) / (3 * Math.sqrt(Math.PI))) + Math.log10(Math.pow(x, 1.5) / (1 - x)) + Math.sqrt(-Math.log(1 - x));
  return { tau: P1 * Math.pow(10, lg), coppia, d12, d23 };
}
