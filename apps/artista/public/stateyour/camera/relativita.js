// relativita.js — LA RELATIVITÀ NEL MODELLO: il ritmo del tempo, la sezione e il cono di chi guarda, i buchi neri,
// le geodetiche della luce e delle particelle, le lenti (più immagini, più tempi). Funzioni pure; unità SI; costanti da leggi.js.
//
// IL PUNTO, detto esattamente (è ciò che l'utente ha chiesto):
//   · L'EVENTO È UNO SOLO, identico per tutti gli osservatori; ogni osservatore gli assegna un tempo e un luogo diversi
//     (trasformazione di Lorentz): quello che cambia sono le coordinate, non l'evento.
//   · IL «PRESENTE» di ciascuno è una SEZIONE diversa dello stesso spaziotempo (l'iperpiano t′ = costante); due sezioni
//     diverse si incrociano su un piano (in 3+1 dimensioni: una superficie a due dimensioni di eventi che sono «adesso»
//     per entrambi). Un terzo evento è simultaneo per tutti e due solo se sta su quell'incrocio.
//   · INVARIANTI sono l'intervallo s² = c²Δt² − Δx² e l'ordine causale (prima / dopo / altrove). NON sono due universi
//     sovrapposti: è un solo spaziotempo tagliato in due modi. (I rami della regola 3 sono un'altra cosa: lì cambiano
//     gli eventi; qui gli eventi sono gli stessi e cambia soltanto la fetta.)
//
// IL TEMPO PRIVILEGIATO DEL MODELLO (dichiarato). `bolla.t`, `N.tempo.t`, il `t` di spazio3d.js sono il TEMPO COSMICO:
// quello degli orologi fermi rispetto al fondo a microonde (il riferimento in cui il fondo è isotropo: l'unico che
// l'omogeneità del cosmo distingue), lontano da ogni massa. È una coordinata, non il tempo di qualcuno: ogni bolla
// ha un tempo proprio τ che scorre più piano, dτ/dt = `ritmo(...)` < 1, per il potenziale delle masse che la
// contengono e per la sua velocità. La velocità di una bolla rispetto al fondo (pianeta attorno alla stella + stella
// nella galassia + galassia nel cosmo: `spazio3d.motiRegione`, più il suo `moto.velocita`) dà il dipolo del fondo
// (`dipolo`) e inclina la sua sezione (`sezioneDi`).
//
// LE LEGGI (marca della fonte: [V] letta sulla fonte durante la stesura, [R] ricordata, [D] derivata qui; lo STATO
// sperimentale di ognuna è nella tabella `STATO` in fondo: misurata / derivata e mai osservata / aperta):
//   1. ritmo del tempo — campo debole: dτ/dt = √(1 + 2Φ/c² − v²/c²) (Einstein 1911/1916 [R]); fuori da una massa
//      a simmetria sferica, esatto: dτ/dt = √((1 − r_s/r)(1 − v²/c²)), r_s = 2GM/c², v misurata da chi sta fermo lì
//      (Schwarzschild 1916 [R]); per un'orbita circolare ne viene √(1 − 3GM/rc²) [D]; dentro una sfera omogenea la
//      soluzione interna di Schwarzschild, (3/2)√(1 − r_s/R) − ½√(1 − r_s r²/R³) [R]; dentro un corpo qualsiasi il
//      potenziale newtoniano del suo profilo di densità [D]. Più masse: si sommano i potenziali (campo debole) e la
//      massa più vicina entra esatta: A = (1 − r_s/r)·(1 + 2Φ_altre/c²) [D: vale finché Φ_altre è quasi costante
//      attraverso la regione, cioè quando la marea delle altre è trascurabile].
//   2. sezione e cono — trasformazione di Lorentz (la stessa di sezione.js `osservatore`) [R]; cono di luce in
//      spazio piatto: t_e = t − d/c; a distanze cosmiche la luce segue ds = 0 nella metrica di Friedmann–Lemaître–
//      Robertson–Walker piatta di leggi.js (Ω_m + Ω_Λ = 1): χ = c∫dt/a, 1 + z = a_o/a_e [R]; il dipolo:
//      T(θ) = T₀/(γ(1 − β cos θ)) (Peebles & Wilkinson 1968 [R]).
//   3. buchi neri — Schwarzschild (1916) e Kerr (1963): orizzonte r₊ = r_g(1 + √(1 − a²)); ergosfera
//      r_E = r_g(1 + √(1 − a² cos²θ)); orbite circolari dei fotoni, ultima orbita stabile ed energia di legame da
//      Bardeen, Press & Teukolsky 1972 (ApJ 178, 347) [R]; il bordo dell'ombra di Kerr da Bardeen 1973 [R];
//      trascinamento dei riferimenti (Lense & Thirring 1918) e precessione geodetica (de Sitter 1916) [R]; marea
//      2GM·d/r³ e raggio di marea R(M/m)^(1/3) (Hills 1975; Rees 1988) [R]; temperatura di Hawking
//      T = ħκ/(2πck_B) (Hawking 1974) e tempo di evaporazione 5120πG²M³/(ħc⁴) [D: corpo nero di soli fotoni sull'area
//      dell'orizzonte]; entropia di Bekenstein–Hawking k_B c³A/(4Għ) [R]; limite di Eddington 4πGMm_pc/σ_T
//      (Eddington 1926) [R]; disco sottile di Novikov & Thorne 1973 con il flusso di Page & Thorne 1974 (ApJ 191, 499,
//      eq. 15n) [R, e CONTROLLATA qui: il suo integrale dà Ṁc²(1 − E_isco), vedi test]; spirale per onde
//      gravitazionali di Peters 1964 (Phys. Rev. 136, B1224) [R].
//   4. geodetiche — luce in Schwarzschild: u″ + u = 3(GM/c²)u², u = 1/r (Binet relativistico) [R]; particelle:
//      u″ + u = GM/L² + 3(GM/c²)u² [R]; deflessione 4GM/(c²b) al primo ordine (Einstein 1915), esatta per integrazione
//      [D]; ritardo di Shapiro 1964 [R]; cattura della luce sotto b_c = √27·GM/c² [D]; lenti: raggio di Einstein
//      θ_E = √(4GM·D_ls/(c²D_l D_s)) (Einstein 1936) e 4π(σ/c)²·D_ls/D_s per la sfera isoterma [R].
//
//   5. lenti — principio di Fermat: le immagini sono i punti stazionari del tempo d'arrivo
//      t(θ) = (1 + z_l)/c·D_lD_s/D_ls·[½|θ − β|² − ψ(θ)], ∇²ψ = 2Σ/Σ_cr (Schneider 1985; Blandford & Narayan 1986
//      [R]); ritardo tra le immagini (Refsdal 1964 [R]); profili proiettati: NFW (Bartelmann 1996 [R]), Hernquist
//      1990 [R], disco esponenziale; deflessione dei profili ellittici (Schramm 1990; Keeton 2001 [R], CONTROLLATA nel
//      test: ∇·α = 2κ); microlente (Paczyński 1986 [R]).
//   6. casi limite — intervallo nullo lungo la luce [R]; caduta oltre l'orizzonte nelle coordinate di Painlevé (1921)
//      e Gullstrand [R, con il bordo dell'ombra per chi cade D e controllato contro l'aberrazione]; assenza di capelli
//      (Israel 1967; Carter 1971) ed entropia dell'orizzonte [R].
//
// I DATI MISURATI usati qui (non scelti guardando il risultato): T₀ = 2,72548 K del fondo a microonde (Fixsen 2009,
// ApJ 707, 916 [V]); σ_T di Thomson viene da stelle.js (dalle costanti). Tutto il resto è c, G, ħ, k_B, m_p di leggi.js.
//
// PARAMETRI LIBERI: nessuno. (Il raggio esterno del disco, che qui non è calcolato, è dichiarato dove serve: buconero.js.)
//
// CHE COSA NON C'È / NON TORNA (dichiarato):
//   · il potenziale delle grandi strutture del cosmo (Φ/c² ~ 10⁻⁵: lo stesso ordine delle anisotropie del fondo)
//     non entra nel ritmo: il potenziale della galassia è quello del suo alone (NFW) portato all'infinito;
//   · lontano dalle masse compatte i potenziali si SOMMANO (campo debole): gli errori sono dell'ordine (Φ/c²)²;
//   · la sezione t′ = costante è un piano solo dove lo spaziotempo è quasi piatto (distanze ≪ c/H₀): oltre, lo scarto
//     v·x/c² è la formula locale estesa, e `sezioneDi` lo dice (`curvatura`: x·H/c);
//   · il cono cosmico usa la cosmologia di leggi.js (materia + Λ, niente radiazione): l'orizzonte delle particelle
//     viene 14,4 Gpc contro i 14,2 veri;
//   · DUE FONTI per la stessa grandezza: l'orizzonte e il tempo conforme sono anche in ragnatela.js, con la radiazione
//     (14,17 Gpc: giusto). Qui non la si importa (ragnatela.js importa bolle.js, e bolle.js dovrà importare questo
//     modulo: sarebbe un giro): `orizzonteParticelle(t, tabella)` la prende da chi chiama; `conoPassato` e le distanze
//     delle lenti usano ancora la cosmologia di qui (differenza: 2% sull'orizzonte, < 0,1% sotto z = 10);
//   · le lenti: l'alone è sferico e proiettato fino all'infinito, la lente è sottile e sola sulla linea di vista (niente
//     taglio esterno delle strutture vicine, che nelle croci vere conta quanto lo schiacciamento); un ammasso fatto
//     col solo alone del modello (10¹⁵ M☉, concentrazione 3) ha un raggio di Einstein di 6″ contro i 10–50″ veri:
//     mancano la galassia centrale, le sottostrutture e l'allungamento lungo la linea di vista degli ammassi-lente;
//   · la rotazione (a*) dei buchi neri non viene dal modello: `stelle.fine` non dà il momento angolare del resto e
//     `galassie.js` non segue quello accresciuto dal buco centrale: qui a* è un ingresso (0 se non si sa);
//   · Kerr: orizzonte, ergosfera, orbite e ombra sono esatti; le geodetiche integrate sono quelle di Schwarzschild
//     (a* = 0) più, per Kerr, la forma di Kerr–Schild (`raggioKerr`), provata contro l'ombra di Bardeen;
//   · l'evaporazione conta solo i fotoni e l'ottica geometrica (niente fattori di corpo grigio né altre specie);
//   · il disco sottile vale tra ~1% e ~30% di Eddington; sotto (flussi caldi e gonfi, M87*, Sgr A*) e sopra non è lui;
//   · l'interno dell'orizzonte: le formule ci sono (tempo proprio di caduta), ma nessuna misura può arrivarci, e la
//     singolarità segna il punto dove la teoria smette di valere (STATO: «aperta»).

import { COSTANTI, COSMO, ANNO, MSOLE, etaUniverso, KPC, MPC } from './leggi.js';
import { dentro as STELLE } from './stelle.js'; // σ_T (Thomson), ricavata lì dalle costanti: una grandezza, una fonte

const K = COSTANTI, C = K.c, C2 = C * C, G = K.G, PI = Math.PI;
export const T_FONDO = 2.72548; // K — il fondo a microonde oggi (misurato: Fixsen 2009 [V])
export const T_OGGI = etaUniverso(); // s — l'età del cosmo: t = 0 delle bolle (la stessa epoca di spazio3d.js)

// ---------- attrezzi
const somma3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], meno3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scal = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], lungo = (a) => Math.hypot(a[0], a[1], a[2]), per = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const vett = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
// la regola di Simpson su n intervalli (n pari)
function simpson(f, a, b, n = 200) { if (n % 2) n++; const h = (b - a) / n; let s = f(a) + f(b); for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2); return (s * h) / 3; }
// √(1 − x) − 1 senza perdere cifre quando x è piccolissimo
const radMeno1 = (x) => Math.expm1(0.5 * Math.log1p(-x));

// =====================================================================================================
// 1. IL RITMO DEL TEMPO
// =====================================================================================================
export const raggioGravitazionale = (M) => (G * M) / C2; // r_g = GM/c² (m)
export const raggioSchwarzschild = (M) => (2 * G * M) / C2; // r_s = 2GM/c²

// IL POTENZIALE DENTRO UN CORPO dal suo profilo di densità ρ(r) (kg/m³, r in m, fino al raggio R): newtoniano,
// Φ(r) = −G·[M(<r)/r + ∫_r^R 4πρr′dr′] [D]. → { massa, potenziale(r) } (J/kg; fuori: −GM/r)
export function potenzialeDaDensita(rho, R, n = 4000) {
  const dr = R / n, M = new Float64Array(n + 1), I = new Float64Array(n + 1); // M(<r_i); I_i = ∫_{r_i}^R 4πρr dr
  for (let i = 0; i < n; i++) { const a = i * dr, b = a + dr, m = 0.5 * (a + b); M[i + 1] = M[i] + ((4 * PI * dr) / 6) * (rho(a + 1e-9 * dr) * a * a + 4 * rho(m) * m * m + rho(b - 1e-9 * dr) * b * b); }
  for (let i = n - 1; i >= 0; i--) { const a = i * dr, b = a + dr, m = 0.5 * (a + b); I[i] = I[i + 1] + ((4 * PI * dr) / 6) * (rho(a + 1e-9 * dr) * a + 4 * rho(m) * m + rho(b - 1e-9 * dr) * b); }
  const potenziale = (r) => { if (r >= R) return (-G * M[n]) / r; const x = r / dr, i = Math.min(n - 1, Math.floor(x)), f = x - i, m = M[i] + f * (M[i + 1] - M[i]), q = I[i] + f * (I[i + 1] - I[i]); return -G * ((r > 0 ? m / r : 0) + q); };
  return { massa: M[n], raggio: R, potenziale };
}
// IL POTENZIALE DI UNA GALASSIA nel suo piano, dalla curva di rotazione (la fonte unica: galassie.js `curvaRotazione`):
// dΦ/dr = v²/r, Φ(∞) = 0 → Φ(r) = −∫_r^∞ v²(r′)/r′ dr′ [D]. v: funzione r (nelle unità di chi chiama) → velocità
// (m/s); l'integrale è in ln r fino a `fino` volte r (l'alone di NFW ha potenziale finito; la coda oltre è ~1/r).
export function potenzialeDaCurva(v, r, { fino = 1e5, passi = 600 } = {}) {
  const L = Math.log(fino); const s = simpson((x) => v(r * Math.exp(x)) ** 2, 0, L, passi), vf = v(r * fino);
  return -(s + vf * vf); // (oltre l'ultimo raggio: come una massa puntiforme, ∫v²/r dr = v²(r_fine))
}

// IL RITMO dτ/dt in un punto dell'albero dei riferimenti.
// catena: le masse che contengono il punto, in qualunque ordine. Ogni voce è una di:
//   { nome, massa (kg), distanza (m) }                      il punto è FUORI dalla massa, a quella distanza dal centro
//   { nome, massa, distanza, raggio [, profilo] }           se distanza < raggio il punto è DENTRO: `profilo` (da
//                                                           potenzialeDaDensita) o, senza, la sfera omogenea
//   { nome, potenziale (J/kg, < 0) }                        un potenziale già calcolato (l'alone di una galassia)
//   e in ognuna, facoltativa, `velocita` ([vx, vy, vz] o un numero, m/s): il moto del punto (o del riferimento sotto)
//   rispetto a quella massa. I vettori si sommano prima di fare il quadrato (i termini misti v₁·v₂ sono veri: sono
//   la relatività della simultaneità vista dall'orologio); dei numeri si sommano i quadrati (i misti, periodici,
//   fanno zero in media: lo si dichiara in `misti`).
// opz.velocita: una velocità in più (quella propria della bolla). opz.esatto: false per il solo campo debole.
// → { ritmo (dτ/dt), scarto (1 − dτ/dt, senza perdita di cifre), gravita, moto (le due parti dello scarto, al primo
//     ordine), parti: [{ nome, gravita, moto }], regime: 'campo debole' | 'Schwarzschild', dentroOrizzonte }
export function ritmo(catena = [], { velocita = null, esatto = true } = {}) {
  let phi = 0, vv = [0, 0, 0], v2numeri = 0, vicina = null, xVicina = 0; const parti = []; let misti = false;
  for (const m of catena) {
    let f; // il potenziale di questa massa nel punto (J/kg)
    if (m.potenziale != null) f = m.potenziale;
    else if (m.raggio != null && m.distanza < m.raggio) f = m.profilo ? m.profilo.potenziale(m.distanza) : (-G * m.massa * (3 * m.raggio * m.raggio - m.distanza * m.distanza)) / (2 * m.raggio ** 3);
    else { f = (-G * m.massa) / m.distanza; const x = (2 * G * m.massa) / (C2 * m.distanza); if (x > xVicina) { xVicina = x; vicina = m; } }
    phi += f; const p = { nome: m.nome || '', gravita: -f / C2, moto: 0 };
    if (m.velocita != null) { if (typeof m.velocita === 'number') { v2numeri += m.velocita ** 2; p.moto = m.velocita ** 2 / (2 * C2); misti = true; } else { vv = somma3(vv, m.velocita); p.moto = scal(m.velocita, m.velocita) / (2 * C2); } }
    parti.push(p);
  }
  if (velocita != null) { if (typeof velocita === 'number') { v2numeri += velocita ** 2; misti = true; } else vv = somma3(vv, velocita); }
  const v2 = scal(vv, vv) + v2numeri, beta2 = v2 / C2;
  // la massa più vicina (quella con r_s/r più grande) entra esatta; le altre come potenziale debole
  const phiAltre = vicina && esatto ? phi + (G * vicina.massa) / vicina.distanza : phi, A = (vicina && esatto ? 1 - xVicina : 1) * (1 + (2 * phiAltre) / C2);
  if (A <= 0 || beta2 >= 1) return { ritmo: 0, scarto: 1, gravita: -phi / C2, moto: beta2 / 2, parti, regime: 'Schwarzschild', dentroOrizzonte: A <= 0, misti };
  // 1 − √(A(1 − β²)) = −radMeno1(1 − A(1 − β²)); 1 − A(1−β²) = x + … calcolato senza sottrarre numeri vicini a 1
  const unoMenoA = (vicina && esatto ? xVicina : 0) - (2 * phiAltre) / C2 * (vicina && esatto ? 1 - xVicina : 1), k = unoMenoA + beta2 - unoMenoA * beta2, scarto = -radMeno1(k);
  return { ritmo: 1 - scarto, scarto, gravita: -phi / C2, moto: beta2 / 2, parti, regime: xVicina > 1e-3 ? 'Schwarzschild' : 'campo debole', dentroOrizzonte: false, misti };
}
// i casi esatti di Schwarzschild, uno per uno (per i riscontri e per chi sta vicino a un oggetto compatto)
export const ritmoFermo = (M, r) => Math.sqrt(Math.max(0, 1 - (2 * G * M) / (C2 * r))); // fermo a r (r > r_s)
export const ritmoInOrbita = (M, r) => Math.sqrt(Math.max(0, 1 - (3 * G * M) / (C2 * r))); // orbita circolare (r > 3r_g)
// dentro una sfera omogenea di massa M e raggio R (soluzione interna di Schwarzschild; esiste solo se R > 9/8·r_s)
export const ritmoDentroOmogenea = (M, R, r) => { const rs = (2 * G * M) / C2; return 1.5 * Math.sqrt(1 - rs / R) - 0.5 * Math.sqrt(1 - (rs * r * r) / R ** 3); };
// il redshift gravitazionale della luce che sale da un punto all'altro: 1 + z = ritmo(arrivo)/ritmo(partenza)
export const redshiftGravitazionale = (ritmoPartenza, ritmoArrivo = 1) => ritmoArrivo / ritmoPartenza - 1;

// LO SCARTO ACCUMULATO LUNGO UNA STORIA. tratti: [{ durata (s di tempo cosmico), catena, velocita? }] oppure una
// funzione t → dτ/dt con { da, a } (integrata con Simpson). → { coordinato (s), proprio (s), scarto (s: quanto
// l'orologio resta indietro rispetto al tempo cosmico) }
export function scartoLungo(storia, { da = 0, a = 0, passi = 2000 } = {}) {
  if (typeof storia === 'function') { const scarto = simpson((t) => 1 - storia(t), da, a, passi); return { coordinato: a - da, proprio: a - da - scarto, scarto }; }
  let T = 0, S = 0; for (const tr of storia) { const r = ritmo(tr.catena, { velocita: tr.velocita ?? null }); T += tr.durata; S += tr.durata * r.scarto; }
  return { coordinato: T, proprio: T - S, scarto: S };
}

// =====================================================================================================
// 2. LA SEZIONE E IL CONO
// =====================================================================================================
// ---------- la cosmologia di leggi.js (piatta: materia + Λ), quanto serve al cono
const H0 = (COSMO.H0 * 1000) / MPC, OM = COSMO.Om, OL = COSMO.OL; // s⁻¹ (lo stesso megaparsec di leggi.etaUniverso)
export const cosmo = {
  H0, H: (a) => H0 * Math.sqrt(OM / a ** 3 + OL),
  tempo: (a) => (2 / (3 * H0 * Math.sqrt(OL))) * Math.asinh(Math.sqrt(OL / OM) * a ** 1.5), // s dall'inizio
  scala: (t) => Math.cbrt(OM / OL) * Math.sinh(1.5 * H0 * Math.sqrt(OL) * t) ** (2 / 3), // a(t), 1 oggi
  // la distanza comovente (m, cioè la distanza di oggi) che la luce copre tra i fattori di scala a1 < a2:
  // χ = c∫da/(a²H); con s = √a l'integrando è liscio fin da a = 0: 2c·ds/(H₀√(Ω_m + Ω_Λ s⁶))
  comovente: (a1, a2) => simpson((s) => (2 * C) / (H0 * Math.sqrt(OM + OL * s ** 6)), Math.sqrt(a1), Math.sqrt(a2), 256),
};
cosmo.orizzonte = (a = 1) => cosmo.comovente(0, a); // l'orizzonte delle particelle (m comoventi) al fattore di scala a
// il fattore di scala a cui è partita la luce che arriva ad a_o dopo aver coperto la distanza comovente chi
function scalaDiPartenza(chi, ao) { if (chi >= cosmo.orizzonte(ao)) return 0; let lo = 0, hi = Math.sqrt(ao); for (let k = 0; k < 60; k++) { const m = 0.5 * (lo + hi); if (cosmo.comovente(m * m, ao) > chi) lo = m; else hi = m; } const s = 0.5 * (lo + hi); return s * s; }

// LA VELOCITÀ DI UNA BOLLA rispetto al fondo cosmico (m/s): il suo moto nel riferimento del suo luogo più il moto di
// quel riferimento (la somma dei moti lungo l'albero: `spazio3d.motiRegione`, in m/s e negli stessi assi).
export const velocitaBolla = (bolla, riferimento = [0, 0, 0]) => somma3((bolla && bolla.moto && bolla.moto.velocita) || [0, 0, 0], riferimento);

// LA SEZIONE DI UNA BOLLA: il suo «adesso». Per chi va a velocità v rispetto al fondo, l'evento lontano x (m, dal
// punto dove sta la bolla, negli assi fermi) che è simultaneo al suo qui-e-ora sta al tempo cosmico
//   t(x) = t_bolla + v·x/c²          (esatto in spazio piatto: è t′ = γ(t − v·x/c²) = costante)
// → { t, velocita, beta, gamma,
//     adesso(x) → t dell'evento in x che per la bolla è «adesso» (secondi da oggi, come bolla.t),
//     scarto(x) → v·x/c² (s), curvatura(x) → |x|·H/c (quanto la formula piatta è fuori dal suo dominio: ≪ 1 va bene),
//     vede(evento) → { x′, t′ }: le coordinate che la bolla assegna a un evento { t, x } (Lorentz; la stessa forma di
//       sezione.js `osservatore`: r′ = r + (γ − 1)(r·n)n − γβct, t′ = γ(t − β·r/c), con l'origine nel qui-e-ora),
//     quando(evento) → t′: > 0 se per la bolla l'evento deve ancora accadere, < 0 se è già accaduto, 0 se è «adesso» }
export function sezioneDi(bolla, { riferimento = [0, 0, 0], velocita = null } = {}) {
  const v = velocita || velocitaBolla(bolla, riferimento), t0 = (bolla && bolla.t) || 0, b = lungo(v) / C; if (b >= 1) throw new Error('relativita: una bolla non può andare alla velocità della luce');
  const g = 1 / Math.sqrt(1 - b * b), n = b > 0 ? per(v, 1 / (b * C)) : [1, 0, 0], a = cosmo.scala(T_OGGI + t0), Hqui = cosmo.H(a);
  const scarto = (x) => scal(v, x) / C2;
  const vede = (e) => { const r = e.x || e.posizione || [0, 0, 0], T = (e.t || 0) - t0, par = scal(r, n), k = (g - 1) * par - g * b * C * T; return { x: [r[0] + k * n[0], r[1] + k * n[1], r[2] + k * n[2]], t: g * (T - (b * par) / C) }; };
  return { t: t0, velocita: v, beta: b, gamma: g, direzione: n, scarto, adesso: (x) => t0 + scarto(x), curvatura: (x) => (lungo(x) * Hqui) / C, vede, quando: (e) => vede(e).t };
}
// DOVE SI INCROCIANO DUE SEZIONI (due bolle nello stesso punto, o a distanza `x2` l'una dall'altra, con moti diversi):
// i due «adesso» sono due iperpiani dello stesso spaziotempo; coincidono solo sul piano di spazio
//   (v₁ − v₂)·x = c²·(t₂ − t₁) + v₂·x₂ ... cioè  n·x = d,  n = (v₁ − v₂)/|v₁ − v₂|
// e, per ogni x di quel piano, l'evento comune sta al tempo t₁ + v₁·x/c². → { normale, distanza (m: n·x = distanza),
// tempo(x) } o null se le sezioni sono parallele (stessa velocità: o coincidono o non si incontrano mai).
export function incrocio(s1, s2, x2 = [0, 0, 0]) {
  const dv = meno3(s1.velocita, s2.velocita), l = lungo(dv); if (!(l > 0)) return null;
  // sezione 1: t = t1 + v1·x/c²; sezione 2 (bolla in x2): t = t2 + v2·(x − x2)/c²
  return { normale: per(dv, 1 / l), distanza: (C2 * (s2.t - s1.t) - scal(s2.velocita, x2)) / l, tempo: (x) => s1.t + scal(s1.velocita, x) / C2 };
}

// IL CONO PASSATO: a che tempo è partita la luce che la bolla VEDE da un luogo.
// luogo: { distanza (m) }             dentro un sistema legato (una galassia, un sistema): spazio piatto, t_e = t − d/c
//        { comovente (m) }            a distanze cosmiche: la distanza di oggi (comovente); il tempo dalla cosmologia
//        { posizione: [x, y, z] }     come `distanza` (il vettore dalla bolla, in metri); con `cosmico: true` come comovente
// → { t (s da oggi: l'istante dell'evento visto), ritardo (s), z (lo spostamento verso il rosso dell'espansione),
//     a (il fattore di scala alla partenza), modo: 'piatto' | 'cosmico', visibile (false oltre l'orizzonte) }
export function conoPassato(bolla, luogo) {
  const t0 = (bolla && bolla.t) || 0, cosmico = luogo.comovente != null || (luogo.cosmico && luogo.posizione);
  if (!cosmico) { const d = luogo.distanza ?? lungo(luogo.posizione); return { t: t0 - d / C, ritardo: d / C, z: 0, a: cosmo.scala(T_OGGI + t0), modo: 'piatto', visibile: true }; }
  const chi = luogo.comovente ?? lungo(luogo.posizione), ao = cosmo.scala(T_OGGI + t0), Ho = cosmo.H(ao), x = (Ho * ao * chi) / C;
  // vicino (x = H·d/c < 10⁻⁴) la differenza tra due tempi enormi perderebbe le cifre: lo sviluppo al secondo ordine,
  // Δt = (a·χ/c)(1 − x/2), z = HΔt + (1 + q/2)(HΔt)², q il parametro di decelerazione (le due vie coincidono a 10⁻¹² sulla soglia)
  if (x < 1e-4) { const dt = ((ao * chi) / C) * (1 - x / 2), E2 = OM / ao ** 3 + OL, q = OM / (2 * ao ** 3 * E2) - OL / E2, hd = Ho * dt, z = hd + (1 + q / 2) * hd * hd; return { t: t0 - dt, ritardo: dt, z, a: ao / (1 + z), modo: 'cosmico', visibile: true }; }
  const ae = scalaDiPartenza(chi, ao);
  if (!(ae > 0)) return { t: -T_OGGI, ritardo: T_OGGI + t0, z: Infinity, a: 0, modo: 'cosmico', visibile: false };
  const te = cosmo.tempo(ae); return { t: te - T_OGGI, ritardo: T_OGGI + t0 - te, z: ao / ae - 1, a: ae, modo: 'cosmico', visibile: true };
}
// lo spostamento totale di una riga: l'espansione, il moto (v: velocità della sorgente rispetto a chi guarda, n: il
// versore da chi guarda alla sorgente), la gravità (i due ritmi) — i tre fattori si moltiplicano
export function redshift({ cosmico = 0, velocita = null, verso = null, ritmoSorgente = 1, ritmoOsservatore = 1 } = {}) {
  let d = 1; if (velocita) { const b2 = scal(velocita, velocita) / C2, vr = verso ? scal(velocita, verso) / C : 0; d = (1 + vr) / Math.sqrt(1 - b2); } // 1 + z = γ(1 + v_r/c)
  return (1 + cosmico) * d * (ritmoOsservatore / ritmoSorgente) - 1;
}

// L'INTERVALLO tra due eventi { t (s), x | posizione (m) } nello spazio piatto: s² = c²Δt² − Δx² (m²): lo stesso per
// tutti gli osservatori. > 0: separati nel tempo; < 0: nello spazio; 0: sulla luce.
export function intervallo(e1, e2) { const dt = (e2.t || 0) - (e1.t || 0), dx = meno3(e2.x || e2.posizione || [0, 0, 0], e1.x || e1.posizione || [0, 0, 0]); return C2 * dt * dt - scal(dx, dx); }
// LA RELAZIONE CAUSALE tra due eventi: e1 sta 'prima' di e2 (dentro o sul suo cono passato: può averlo causato),
// 'dopo', o 'altrove' (nessuno dei due può aver influito sull'altro; quale venga «prima» dipende da chi guarda).
// È invariante: tutti gli osservatori danno la stessa risposta. ('stesso' se sono lo stesso evento.)
// opz.cosmico: le posizioni sono comoventi (m di oggi) e la luce segue l'espansione (χ ≤ c∫dt/a).
export function relazione(e1, e2, { cosmico = false } = {}) {
  const t1 = e1.t || 0, t2 = e2.t || 0, dx = lungo(meno3(e2.x || e2.posizione || [0, 0, 0], e1.x || e1.posizione || [0, 0, 0]));
  if (t1 === t2 && dx === 0) return 'stesso';
  const raggiunge = cosmico ? cosmo.comovente(cosmo.scala(T_OGGI + Math.min(t1, t2)), cosmo.scala(T_OGGI + Math.max(t1, t2))) : C * Math.abs(t2 - t1);
  if (dx > raggiunge) return 'altrove'; return t1 < t2 ? 'prima' : 'dopo';
}

// IL DIPOLO DEL FONDO per chi va a velocità v rispetto a lui: T(θ) = T₀/(γ(1 − β cos θ)), θ dall'apice del moto.
// → { beta, ampiezza (K: T₀·β al primo ordine), temperatura(θ), verso }
export function dipolo(velocita, T0 = T_FONDO) {
  const b = lungo(velocita) / C, g = 1 / Math.sqrt(1 - b * b);
  return { beta: b, ampiezza: T0 * b, verso: b > 0 ? per(velocita, 1 / (b * C)) : [0, 0, 0], temperatura: (theta) => T0 / (g * (1 - b * Math.cos(theta))), quadrupolo: T0 * b * b };
}

// ---------- REGOLA 12: l'antenato comune deve stare nell'intersezione dei coni passati.
// bolle: [{ t (s da oggi), posizione | x (m, tutte nello stesso riferimento; comoventi se opz.cosmico) }].
// → la funzione t(x): l'istante più tardo in cui un evento in x può ancora aver influito su TUTTE le bolle
const ultimoIn = (B, x, cosmico) => {
  let m = Infinity;
  for (const b of B) { const d = lungo(meno3(b.x || b.posizione || [0, 0, 0], x)); let t;
    if (!cosmico) t = (b.t || 0) - d / C; else { const ae = scalaDiPartenza(d, cosmo.scala(T_OGGI + (b.t || 0))); t = ae > 0 ? cosmo.tempo(ae) - T_OGGI : -Infinity; }
    if (t < m) m = t; }
  return m;
};
// l'antenato proposto { t, posizione } sta nel cono passato di ogni bolla? → { dentro, fuori: [indici delle bolle che
// non può aver raggiunto], margine (s: di quanto precede il limite, nel punto dove sta) }
export function antenatoNeiConi(bolle, antenato, { cosmico = false } = {}) {
  const fuori = []; bolle.forEach((b, i) => { const r = relazione(antenato, b, { cosmico }); if (r !== 'prima' && r !== 'stesso') fuori.push(i); });
  return { dentro: fuori.length === 0, fuori, margine: ultimoIn(bolle, antenato.x || antenato.posizione || [0, 0, 0], cosmico) - (antenato.t || 0) };
}
// L'ULTIMO ANTENATO POSSIBILE: l'evento più tardo che sta nel cono passato di tutte (la punta dell'intersezione).
// Due bolle a distanza d: se |t₁ − t₂| ≥ d/c è la più vecchia delle due; altrimenti sta sul segmento che le unisce,
// a t* = (t₁ + t₂)/2 − d/2c. Per più bolle: il massimo della funzione concava min_i(t_i − |x − x_i|/c), cercato
// salendo lungo il gradiente del vincolo più stretto. → { t, posizione, esiste (false: prima dell'inizio del cosmo) }
export function ultimoAntenato(bolle, { cosmico = false, giri = 400 } = {}) {
  const P = bolle.map((b) => b.x || b.posizione || [0, 0, 0]); let x = P.reduce((s, p) => somma3(s, p), [0, 0, 0]).map((q) => q / P.length);
  if (bolle.length === 2 && !cosmico) { const d = lungo(meno3(P[1], P[0])), t1 = bolle[0].t || 0, t2 = bolle[1].t || 0;
    if (Math.abs(t1 - t2) >= d / C) { const i = t1 <= t2 ? 0 : 1; return { t: bolle[i].t || 0, posizione: P[i].slice(), esiste: true }; }
    const f = d > 0 ? 0.5 + (C * (t1 - t2)) / (2 * d) : 0; return { t: 0.5 * (t1 + t2) - d / (2 * C), posizione: somma3(P[0], per(meno3(P[1], P[0]), f)), esiste: true }; }
  let passo = Math.max(...P.map((p) => lungo(meno3(p, x))), 1), meglio = { t: ultimoIn(bolle, x, cosmico), x };
  for (let k = 0; k < giri; k++) { // ci si muove verso la bolla che stringe di più (quella che dà il minimo)
    let m = Infinity, chi = 0; bolle.forEach((b, i) => { const t = (b.t || 0) - lungo(meno3(P[i], x)) / C; if (t < m) { m = t; chi = i; } });
    const dir = meno3(P[chi], x), l = lungo(dir); if (!(l > 0)) break; const y = somma3(x, per(dir, Math.min(1, passo / l))), ty = ultimoIn(bolle, y, cosmico);
    if (ty > meglio.t) { meglio = { t: ty, x: y }; x = y; } else passo *= 0.7; if (passo < 1e-12 * (1 + l)) break; }
  return { t: meglio.t, posizione: meglio.x, esiste: isFinite(meglio.t) && meglio.t > -T_OGGI };
}

// =====================================================================================================
// 3. I BUCHI NERI
// =====================================================================================================
// a = a* = cJ/(GM²), tra 0 e 1 (senza dimensioni); verso: +1 orbita nel senso della rotazione, −1 contro.
export const spinDa = (J, M) => (C * J) / (G * M * M); // a* di un corpo qualsiasi (un buco nero: ≤ 1; il Sole 0,2; la Terra ~900)
export const orizzonte = (M, a = 0) => raggioGravitazionale(M) * (1 + Math.sqrt(Math.max(0, 1 - a * a)));
export const ergosfera = (M, a = 0, colatitudine = PI / 2) => raggioGravitazionale(M) * (1 + Math.sqrt(1 - (a * Math.cos(colatitudine)) ** 2));
// l'orbita circolare dei fotoni nel piano dell'equatore (Bardeen, Press & Teukolsky 1972, eq. 2.18) [R]
export const sferaFotoni = (M, a = 0, verso = 1) => 2 * raggioGravitazionale(M) * (1 + Math.cos((2 / 3) * Math.acos(-verso * a)));
// l'ultima orbita circolare stabile (ivi, eq. 2.21) [R]
export function ultimaOrbitaStabile(M, a = 0, verso = 1) {
  const z1 = 1 + Math.cbrt(1 - a * a) * (Math.cbrt(1 + a) + Math.cbrt(1 - a)), z2 = Math.sqrt(3 * a * a + z1 * z1);
  return raggioGravitazionale(M) * (3 + z2 - verso * Math.sqrt((3 - z1) * (3 + z1 + 2 * z2)));
}
// l'energia (per unità di mc²) di un'orbita circolare equatoriale di raggio r (ivi, eq. 2.12) [R]; x = r/r_g
const energiaOrbita = (x, a, verso = 1) => (1 - 2 / x + (verso * a) / x ** 1.5) / Math.sqrt(1 - 3 / x + (2 * verso * a) / x ** 1.5);
// la resa dell'accrescimento: l'energia di legame all'ultima orbita stabile (5,72% per a = 0; 42,3% per a = 1)
export const efficienza = (a = 0, verso = 1) => (a >= 1 && verso > 0 ? 1 - 1 / Math.sqrt(3) : 1 - energiaOrbita(ultimaOrbitaStabile(1, a, verso) / raggioGravitazionale(1), a, verso));
// la velocità angolare dell'orizzonte (rad/s) e quella del trascinamento lontano (Lense–Thirring: 2GJ/c²r³)
export const giroOrizzonte = (M, a = 0) => { const rg = raggioGravitazionale(M), rp = orizzonte(M, a); return (a * rg * C) / (rp * rp + a * a * rg * rg); };
export const trascinamento = (J, r) => (2 * G * J) / (C2 * r ** 3); // rad/s all'equatore, lontano
// la precessione di un giroscopio in orbita circolare (rad/s): geodetica (de Sitter) e, per un'orbita polare, il
// trascinamento medio (Schiff 1960: ⟨(G/c²r³)(3(J·r̂)r̂ − J)⟩ = GJ/(2c²r³))
export const precessioneGeodetica = (M, r) => (1.5 * Math.pow(G * M, 1.5)) / (C2 * Math.pow(r, 2.5));
export const precessioneTrascinamentoPolare = (J, r) => (G * J) / (2 * C2 * r ** 3);

// L'OMBRA: i raggi con parametro d'urto sotto b_c = √27·GM/c² cadono dentro (Schwarzschild). → raggio (m), e visto
// da lontano (distanza D) il diametro angolare 2b_c/D (rad)
export const ombra = (M, D = Infinity) => { const b = Math.sqrt(27) * raggioGravitazionale(M); return { raggio: b, diametro: isFinite(D) ? (2 * b) / D : 0 }; };
// il raggio angolare dell'ombra per chi sta FERMO a distanza r (non all'infinito): sin ψ = b_c·√(1 − r_s/r)/r,
// e sotto la sfera dei fotoni l'ombra copre più di mezzo cielo (Synge 1966) [R]
export const ombraDaVicino = (M, r) => { const rg = raggioGravitazionale(M), s = (Math.sqrt(27) * rg * Math.sqrt(1 - (2 * rg) / r)) / r, psi = Math.asin(Math.min(1, s)); return r >= 3 * rg ? psi : PI - psi; };
// IL BORDO DELL'OMBRA DI KERR visto da lontano con inclinazione i (dall'asse di rotazione): le orbite sferiche dei
// fotoni di raggio r hanno ξ = L_z/E e η = Q/E² (Bardeen 1973) [R], e sul cielo α = −ξ/sin i, β = ±√(η + a²cos²i −
// ξ²cot²i). → { punti: [[α, β]…] in unità di r_g, largo, alto, centro (lo spostamento lungo α) }
export function ombraKerr(a, inclinazione = PI / 2, n = 400) {
  if (!(Math.abs(a) > 1e-9)) { const b = Math.sqrt(27); return { punti: Array.from({ length: 2 * n }, (_, k) => [b * Math.cos((PI * k) / n), b * Math.sin((PI * k) / n)]), largo: 2 * b, alto: 2 * b, centro: 0 }; }
  const si = Math.sin(inclinazione), ci = Math.cos(inclinazione), r1 = sferaFotoni(1 / (G / C2), a, 1), r2 = sferaFotoni(1 / (G / C2), a, -1), su = [], giu = [];
  for (let k = 0; k <= n; k++) { const r = r1 + ((r2 - r1) * k) / n, xi = -(r * r * r - 3 * r * r + a * a * r + a * a) / (a * (r - 1)), eta = (r ** 3 * (4 * a * a - r * (r - 3) ** 2)) / (a * a * (r - 1) ** 2), b2 = eta + a * a * ci * ci - (xi * xi * ci * ci) / (si * si);
    if (b2 < 0) continue; const al = -xi / si, be = Math.sqrt(b2); su.push([al, be]); giu.push([al, -be]); }
  const punti = su.concat(giu.reverse()), xs = punti.map((p) => p[0]), ys = punti.map((p) => p[1]);
  return { punti, largo: Math.max(...xs) - Math.min(...xs), alto: Math.max(...ys) - Math.min(...ys), centro: 0.5 * (Math.max(...xs) + Math.min(...xs)) };
}

// LA MAREA su un corpo lungo d a distanza r: la differenza di accelerazione tra i suoi estremi lungo il raggio,
// 2GM·d/r³ (in Schwarzschild è esatta per chi cade liberamente) [R], e di traverso −GM·d/r³
export const marea = (M, r, d) => (2 * G * M * d) / r ** 3;
// dove si spezza un corpo tenuto insieme dalla sua gravità (massa m, raggio R): r_t = R·(M/m)^(1/3) (Hills 1975) [R]
// (il coefficiente è 1 per ordine di grandezza: dipende da come la massa è concentrata nel corpo)
export const raggioDiMarea = (M, m, R) => R * Math.cbrt(M / m);
// la massa oltre la quale il corpo attraversa l'orizzonte intero, senza spezzarsi fuori (r_t = r_s; Hills 1975)
export const massaDiHills = (m, R) => Math.pow((R * C2) / (2 * G), 1.5) / Math.sqrt(m);

// HAWKING (derivata, mai osservata): la temperatura T = ħκ/(2πck_B), κ la gravità di superficie dell'orizzonte
export function hawking(M, a = 0) {
  const q = Math.sqrt(Math.max(0, 1 - a * a)), kappa = (C2 * C2 * q) / (2 * G * M * (1 + q)), T = (K.hbar * kappa) / (2 * PI * C * K.kB), rp = orizzonte(M, a), rg = raggioGravitazionale(M), area = 4 * PI * (rp * rp + a * a * rg * rg);
  // la potenza: corpo nero di soli fotoni sull'area dell'orizzonte (a = 0: ħc⁶/(15360πG²M²)); da dM/dt = −P/c² il
  // tempo che resta: 5120πG²M³/(ħc⁴) [D] (i fattori di corpo grigio e le altre specie lo cambiano di un fattore dell'ordine di 1)
  const potenza = K.sigma * area * T ** 4, evaporazione = (5120 * PI * G * G * M ** 3) / (K.hbar * C ** 4);
  return { temperatura: T, potenza, evaporazione, area, entropia: (K.kB * C ** 3 * area) / (4 * G * K.hbar), gravitaSuperficie: kappa };
}
// la massa di un buco nero che finisce di evaporare in un tempo t (s) (a = 0)
export const massaCheEvapora = (t) => Math.cbrt((t * K.hbar * C ** 4) / (5120 * PI * G * G));

// EDDINGTON: la luce che regge il peso di un gas di idrogeno ionizzato: L = 4πGMm_pc/σ_T (W)
export const SIGMA_T = STELLE.SIGMA_T;
export const eddington = (M) => (4 * PI * G * M * K.mp * C) / SIGMA_T;
// il tempo in cui la massa cresce di e volte accrescendo al limite con resa η (Salpeter 1964): η/(1 − η)·σ_Tc/(4πGm_p)
export const tempoSalpeter = (eta = 0.1) => ((eta / (1 - eta)) * SIGMA_T * C) / (4 * PI * G * K.mp);

// IL DISCO SOTTILE (Novikov & Thorne 1973; Page & Thorne 1974): gas in orbite circolari che scende piano,
// otticamente spesso, che irraggia come un corpo nero ciò che la viscosità dissipa. Il flusso da ciascuna faccia:
//   F(r) = 3GMṀ/(8πr³) · x²·Q(x)/(x³ − 3x + 2a),  x = √(r/r_g),  Q la parentesi di Page & Thorne (eq. 15n: Q → x lontano)
// (lontano: 3GMṀ/(8πr³), il disco newtoniano di Shakura & Sunyaev 1973). T(r) = (F/σ)^(1/4).
// M (kg), mdot (kg/s), a (spin, con il disco che gira nel verso del buco). → { interno, efficienza, luminosita,
// flusso(r), temperatura(r), Tmax, rTmax, energia(r) (dell'orbita, per mc²), omega(r) (rad/s, tempo di lontano) }
export function discoSottile(M, mdot, a = 0) {
  const rg = raggioGravitazionale(M), rin = ultimaOrbitaStabile(M, a, 1), x0 = Math.sqrt(rin / rg), ac = Math.acos(Math.max(-1, Math.min(1, a)));
  const x1 = 2 * Math.cos((ac - PI) / 3), x2 = 2 * Math.cos((ac + PI) / 3), x3 = -2 * Math.cos(ac / 3);
  const pezzo = (xi, xj, xk) => (Math.abs(xi) < 1e-12 ? () => 0 : (x) => ((3 * (xi - a) ** 2) / (xi * (xi - xj) * (xi - xk))) * Math.log((x - xi) / (x0 - xi)));
  const p1 = pezzo(x1, x2, x3), p2 = pezzo(x2, x1, x3), p3 = pezzo(x3, x1, x2);
  const flusso = (r) => { if (!(r > rin)) return 0; const x = Math.sqrt(r / rg), Q = x - x0 - 1.5 * a * Math.log(x / x0) - p1(x) - p2(x) - p3(x); return Math.max(0, ((3 * G * M * mdot) / (8 * PI * r ** 3)) * ((x * x * Q) / (x ** 3 - 3 * x + 2 * a))); };
  const temperatura = (r) => Math.pow(flusso(r) / K.sigma, 0.25);
  // il massimo della temperatura (cercato: sta poco fuori dal bordo interno)
  let rT = rin, Tm = 0; for (let k = 1; k <= 400; k++) { const r = rin * Math.exp((k / 400) * Math.log(8)), T = temperatura(r); if (T > Tm) { Tm = T; rT = r; } }
  const eta = efficienza(a, 1);
  return { interno: rin, efficienza: eta, luminosita: eta * mdot * C2, flusso, temperatura, Tmax: Tm, rTmax: rT, energia: (r) => energiaOrbita(r / rg, a, 1), omega: (r) => (C / rg) / (Math.pow(r / rg, 1.5) + a) };
}

// LA SPIRALE DI UNA COPPIA per onde gravitazionali (Peters 1964). m1, m2 (kg), a (semiasse, m), e (eccentricità).
// → { tempo (s fino alla fusione), potenza (W irraggiati oggi), periodo (s), dPeriodo (dP/dt, senza dimensioni) }
export function spirale(m1, m2, a, e = 0) {
  const M = m1 + m2, beta = (64 / 5) * ((G ** 3 * m1 * m2 * M) / C ** 5), fe = (1 + (73 / 24) * e * e + (37 / 96) * e ** 4) / Math.pow(1 - e * e, 3.5), P = 2 * PI * Math.sqrt(a ** 3 / (G * M));
  let tempo; if (!(e > 0)) tempo = a ** 4 / (4 * beta); // (5/256)·c⁵a⁴/(G³m₁m₂M)
  else { const c0 = (a * (1 - e * e)) / (Math.pow(e, 12 / 19) * Math.pow(1 + (121 / 304) * e * e, 870 / 2299)); // Peters eq. 5.11, 5.14
    // (l'integrando va come x^(29/19) in zero: con x = y^19 diventa liscio)
    tempo = ((12 / 19) * c0 ** 4) / beta * simpson((y) => { const x = y ** 19; return (19 * y ** 18 * Math.pow(x, 29 / 19) * Math.pow(1 + (121 / 304) * x * x, 1181 / 2299)) / Math.pow(1 - x * x, 1.5); }, 0, Math.pow(e, 1 / 19), 4000); }
  return { tempo, potenza: ((32 / 5) * G ** 4 * m1 * m1 * m2 * m2 * M * fe) / (C ** 5 * a ** 5), periodo: P, dPeriodo: (-(192 * PI) / 5) * Math.pow((2 * PI * G) / P, 5 / 3) * ((m1 * m2) / Math.cbrt(M)) * (fe / C ** 5) };
}
// il tempo che resta alla fusione quando l'onda ha frequenza f (Hz; l'onda ha due volte la frequenza dell'orbita):
// τ = (5/256)·(πf)^(−8/3)·(G·M_c/c³)^(−5/3), M_c = (m₁m₂)^(3/5)/(m₁+m₂)^(1/5) la massa di «chirp»
export const tempoDaFrequenza = (m1, m2, f) => { const Mc = Math.pow(m1 * m2, 0.6) / Math.pow(m1 + m2, 0.2); return (5 / 256) * Math.pow(PI * f, -8 / 3) * Math.pow((G * Mc) / C ** 3, -5 / 3); };

// UN BUCO NERO, tutto insieme. massaKg; spin a* (0 se il modello non lo sa: vedi l'intestazione); accrescimento (kg/s).
export function bucoNero({ massaKg, spin = 0, accrescimento = 0, origine = '' } = {}) {
  const M = massaKg, Le = eddington(M), eta = efficienza(spin, 1), mEdd = Le / (eta * C2);
  return { massaKg: M, spin, origine, raggioGravitazionale: raggioGravitazionale(M), orizzonte: orizzonte(M, spin), ergosfera: ergosfera(M, spin), sferaFotoni: sferaFotoni(M, spin, 1), sferaFotoniContro: sferaFotoni(M, spin, -1),
    ultimaOrbita: ultimaOrbitaStabile(M, spin, 1), ultimaOrbitaContro: ultimaOrbitaStabile(M, spin, -1), ombra: ombra(M).raggio, efficienza: eta, giroOrizzonte: giroOrizzonte(M, spin),
    eddington: Le, accrescimentoEddington: mEdd, frazioneEddington: accrescimento > 0 ? accrescimento / mEdd : 0, hawking: hawking(M, spin), disco: accrescimento > 0 ? discoSottile(M, accrescimento, spin) : null };
}
// DOVE SONO. (1) I resti delle stelle: ciò che `stelle.fine(M)` chiama 'buco nero' ({ massa in M☉ }). (2) Quello al
// centro di ogni galassia: `galassie.js` lo ha già (`forma.buco`: M in M☉, accrescimento in M☉/anno, frazione di
// Eddington), dalla relazione EMPIRICA di Kormendy & Ho 2013 con la massa dello sferoide (scarto 0,28 dex) e un germe
// LIBERO di 10⁵ M☉: non una legge. (Come farlo nascere da una legge: vedi il rapporto.)
// UNA LEGGE DA CUI FARLO NASCERE (proposta, non ancora usata da galassie.js): il buco cresce finché la spinta della sua
// luce, al limite di Eddington, non spazza via il gas dello sferoide; l'equilibrio tra quella spinta (L_Edd/c) e il peso
// del guscio di gas in una sfera isoterma di dispersione σ dà M = f_g·κ·σ⁴/(πG²), con κ = σ_T/m_p e f_g la frazione
// di gas (qui quella cosmica dei barioni, Ω_b/Ω_m di leggi.js) (King 2003, ApJ 596, L27 [R]). Niente germe e niente
// coefficiente misurato: restano il germe iniziale (che non conta, se il gas basta) e il tempo per arrivarci (Salpeter).
export const massaAutoregolata = (sigma, fg = COSMO.Ob / COSMO.Om) => (fg * (SIGMA_T / K.mp) * sigma ** 4) / (PI * G * G);
export const bucoDaResto = (resto, opz = {}) => (resto && resto.tipo === 'buco nero' ? bucoNero({ massaKg: resto.massa * MSOLE, origine: 'resto di una stella (stelle.fine)', ...opz }) : null);
export const bucoCentrale = (forma, opz = {}) => (forma && forma.buco ? bucoNero({ massaKg: forma.buco.M * MSOLE, accrescimento: ((forma.buco.accrescimento || 0) * MSOLE) / ANNO, origine: 'centro della galassia (galassie.js: Kormendy & Ho, empirica)', ...opz }) : null);

// =====================================================================================================
// 4. LE GEODETICHE
// =====================================================================================================
// ---------- LA LUCE in Schwarzschild
// la deflessione al primo ordine (Einstein 1915) e quella ESATTA: α = 2∫₀^{u₀} du/√(1/b² − u² + 2r_g u³) − π, con
// u₀ il punto più vicino; la sostituzione u = u₀(1 − s²) toglie la singolarità [D]. b in metri; sotto b_c: Infinity.
export const deflessioneDebole = (M, b) => (4 * G * M) / (C2 * b);
export function deflessione(M, b, n = 4000) {
  const rg = raggioGravitazionale(M); if (!(b > Math.sqrt(27) * rg)) return Infinity;
  let u0 = 1 / b; for (let k = 0; k < 60; k++) { const F = 1 / (b * b) - u0 * u0 + 2 * rg * u0 ** 3, dF = -2 * u0 + 6 * rg * u0 * u0, du = F / dF; u0 -= du; if (Math.abs(du) < 1e-16 * u0) break; }
  // F(u) = (u₀ − u)·[(u + u₀) − 2r_g(u² + u·u₀ + u₀²)]  →  l'integrando liscio 2√u₀/√(…)
  const I = simpson((s) => { const u = u0 * (1 - s * s); return (2 * Math.sqrt(u0)) / Math.sqrt(u + u0 - 2 * rg * (u * u + u * u0 + u0 * u0)); }, 0, 1, n);
  return 2 * I - PI;
}
export const parametroCritico = (M) => Math.sqrt(27) * raggioGravitazionale(M); // b_c
export const sezioneDiCattura = (M) => 27 * PI * raggioGravitazionale(M) ** 2; // della luce: π·b_c²
// UN RAGGIO DI LUCE integrato con l'equazione di Binet (RK4 in φ): parte da r0 con angolo psi dalla direzione radiale
// uscente, misurato da chi sta fermo lì (psi = π/2: di traverso; psi > π/2: verso dentro).
// → { esito: 'fugge' | 'cade', angolo (φ percorso fino all'uscita o all'orizzonte), b (parametro d'urto), punti }
export function raggioDiLuce({ M, r0, psi, passo = 1e-3, tieni = false, massimo = 60 }) {
  const rg = raggioGravitazionale(M), rs = 2 * rg, k = Math.sqrt(1 - rs / r0); let u = 1 / r0, w = (-u * k * Math.cos(psi)) / Math.max(1e-300, Math.sin(psi)), fi = 0; // du/dφ = −u·√(1 − r_s u)·cot ψ
  const b = (r0 * Math.sin(psi)) / k, f = (uu) => -uu + 3 * rg * uu * uu, punti = tieni ? [[r0, 0]] : null;
  while (fi < massimo) {
    const k1u = w, k1w = f(u), k2u = w + 0.5 * passo * k1w, k2w = f(u + 0.5 * passo * k1u), k3u = w + 0.5 * passo * k2w, k3w = f(u + 0.5 * passo * k2u), k4u = w + passo * k3w, k4w = f(u + passo * k3u);
    const un = u + (passo / 6) * (k1u + 2 * k2u + 2 * k3u + k4u), wn = w + (passo / 6) * (k1w + 2 * k2w + 2 * k3w + k4w);
    if (un <= 0) return { esito: 'fugge', angolo: fi + (passo * u) / (u - un), b, punti }; // (u = 0: l'infinito, interpolato)
    if (un >= 1 / rs) return { esito: 'cade', angolo: fi + passo, b, punti };
    u = un; w = wn; fi += passo; if (tieni) punti.push([1 / u, fi]);
  }
  return { esito: 'cade', angolo: fi, b, punti }; // (gira attorno alla sfera dei fotoni senza decidersi: è sul bordo)
}
// LO STESSO RAGGIO NELLA FORMA CHE USA LO SHADER (buconero.js), in unità di r_g: nel piano dell'orbita la forma di
// Binet equivale a d²x/dλ² = −3h²·x/r⁵, h = |x × v| (costante) [D: derivando u(φ) con r²φ̇ = h]. x, v: vettori (v non
// normalizzato: chi sta fermo a r e guarda lungo d parte con v = d_⊥ + √(1 − 2/r)·d_∥). Stesso passo dello shader.
// → { esito: 'fugge' | 'cade', x, v (alla fine), passi, colpi: [{ r, x }] gli attraversamenti del piano y = 0 }
export const PASSO_RAGGIO = { k: 0.05, minimo: 0.01, lontano: 1.6, passi: 600 }; // (le stesse costanti dello shader: buconero.js le legge da qui)
export function tracciaRaggio(x0, v0, { k = PASSO_RAGGIO.k, minimo = PASSO_RAGGIO.minimo, fuori = null, passi = PASSO_RAGGIO.passi, piano = false } = {}) {
  let x = x0.slice(), v = v0.slice(); const hv = vett(x, v), h2 = scal(hv, hv), rFuori = fuori ?? Math.max(60, PASSO_RAGGIO.lontano * lungo(x0)), colpi = [];
  const acc = (p) => { const r2 = scal(p, p), q = (-3 * h2) / (r2 * r2 * Math.sqrt(r2)); return [p[0] * q, p[1] * q, p[2] * q]; };
  for (let i = 0; i < passi; i++) {
    const r = lungo(x); if (r < 2.02) return { esito: 'cade', x, v, passi: i, colpi }; if (r > rFuori && scal(x, v) > 0) return { esito: 'fugge', x, v, passi: i, colpi };
    const dl = Math.max(minimo, k * r) / lungo(v);
    const a1 = acc(x), x2 = somma3(x, per(v, 0.5 * dl)), v2 = somma3(v, per(a1, 0.5 * dl)), a2 = acc(x2), x3 = somma3(x, per(v2, 0.5 * dl)), v3 = somma3(v, per(a2, 0.5 * dl)), a3 = acc(x3), x4 = somma3(x, per(v3, dl)), v4 = somma3(v, per(a3, dl)), a4 = acc(x4);
    const xn = [0, 1, 2].map((j) => x[j] + (dl / 6) * (v[j] + 2 * v2[j] + 2 * v3[j] + v4[j])), vn = [0, 1, 2].map((j) => v[j] + (dl / 6) * (a1[j] + 2 * a2[j] + 2 * a3[j] + a4[j]));
    if (piano && x[1] * xn[1] < 0) { const f = x[1] / (x[1] - xn[1]), p = somma3(x, per(meno3(xn, x), f)); colpi.push({ r: lungo(p), x: p }); }
    x = xn; v = vn;
  }
  return { esito: 'cade', x, v, passi, colpi };
}
// il fattore g = ν_osservata/ν_emessa per la luce di un punto del disco (orbita circolare a r, in unità di r_g, a = 0)
// vista da chi sta fermo a r_o: g = √(1 − 3/r) / (√(1 − 2/r_o)·(1 − Ω·b_z)), Ω = r^(−3/2), b_z = L_z/E del fotone [D]
export const fattoreDisco = (r, ro, bz) => Math.sqrt(1 - 3 / r) / (Math.sqrt(1 - 2 / ro) * (1 - bz / Math.pow(r, 1.5)));

// IL RITARDO DI SHAPIRO (un passaggio solo): la luce che va da r1 a r2 passando a distanza b dalla massa impiega in più
// Δt = (2GM/c³)·ln((r1 + r2 + R)/(r1 + r2 − R)), R la distanza tra i due punti (PPN con γ = 1) [R]
export function ritardoShapiro(M, r1, r2, b) {
  const R = Math.sqrt(Math.max(0, r1 * r1 - b * b)) + Math.sqrt(Math.max(0, r2 * r2 - b * b)); // (i due punti da parti opposte della massa)
  return ((2 * G * M) / C ** 3) * Math.log((r1 + r2 + R) / (r1 + r2 - R));
}
// il tempo ESATTO (coordinata di Schwarzschild) che la luce impiega dal punto più vicino r0 fino a r:
// t = (1/c)∫ dr / (A·√(1 − (r0/r)²·A/A₀)), A = 1 − r_s/r [D]. Con r = r0·cosh w il radicando diventa
// tanh²w·(1 − ε/(cosh w·(cosh w + 1))), ε = r_s/(r0·A₀), e l'integrando r0·cosh w/(A·√(…)) è liscio. `ritardoLuce` dà
// direttamente l'eccesso sulla retta √(r² − r0²)/c (senza sottrarre due numeri quasi uguali).
export function ritardoLuce(M, r0, r, n = 4000) {
  const rs = raggioSchwarzschild(M), eps = rs / (r0 * (1 - rs / r0));
  return simpson((w) => { const ch = Math.cosh(w), A = 1 - rs / (r0 * ch), k = 1 / (A * Math.sqrt(1 - eps / (ch * (ch + 1)))); return r0 * ch * (k - 1); }, 0, Math.acosh(r / r0), n) / C;
}
export const tempoLuce = (M, r0, r, n = 4000) => Math.sqrt(r * r - r0 * r0) / C + ritardoLuce(M, r0, r, n);

// ---------- LE PARTICELLE CON MASSA in Schwarzschild
// LA PRECESSIONE del pericentro per orbita (rad), ESATTA: l'orbita con i punti di svolta r_p = a(1 − e), r_a = a(1 + e)
// obbedisce a (du/dφ)² = 2r_g(u − u₁)(u₂ − u)(u₃ − u), u₃ = 1/(2r_g) − u₁ − u₂; con u = ū − Δ·cos θ:
// Δφ = 2∫₀^π dθ/√(1 − 2r_g(u₁ + u₂ + u(θ))) − 2π [D]. Al primo ordine: 6πGM/(c²a(1 − e²)) (Einstein 1915).
export const precessioneDebole = (M, a, e) => (6 * PI * G * M) / (C2 * a * (1 - e * e));
export function precessione(M, a, e, n = 2000) {
  const rg = raggioGravitazionale(M), u1 = 1 / (a * (1 + e)), u2 = 1 / (a * (1 - e)), um = 0.5 * (u1 + u2), d = 0.5 * (u2 - u1);
  if (2 * rg * (u1 + 2 * u2) >= 1) return Infinity; // u₃ ≤ u₂: non c'è un'orbita legata con quel pericentro (cade)
  let s = 0; for (let k = 0; k < n; k++) { const th = (PI * (k + 0.5)) / n, x = 2 * rg * (u1 + u2 + um - d * Math.cos(th)); s += Math.expm1(-0.5 * Math.log1p(-x)); } // 1/√(1 − x) − 1
  return (2 * PI * s) / n;
}
// IL POTENZIALE EFFICACE: (E/mc²)² = (dr/cdτ)² + V²(r), V² = (1 − r_s/r)(1 + L²/(c²r²)). L: momento angolare per unità
// di massa (m²/s). → { cade (true se, venendo da fuori con quell'energia, supera la barriera), barriera (V massimo),
// rMassimo, rStabile } — sotto L = √12·GM/c non c'è barriera: cade sempre.
export function cattura(M, E, L) {
  const rs = raggioSchwarzschild(M), l2 = (L * L) / C2, D = 1 - (3 * rs * rs) / l2; if (!(D > 0)) return { cade: true, barriera: 0, rMassimo: null, rStabile: null };
  const rMax = (l2 / rs) * (1 - Math.sqrt(D)), rMin = (l2 / rs) * (1 + Math.sqrt(D)), V = Math.sqrt((1 - rs / rMax) * (1 + l2 / (rMax * rMax)));
  return { cade: E > V, barriera: V, rMassimo: rMax, rStabile: rMin };
}
// la sezione di cattura di una particella lenta che arriva da lontano a velocità v ≪ c: b < 4GM/(c·v) → 16π(GM)²/(c²v²)
export const sezioneDiCatturaLenta = (M, v) => (16 * PI * (G * M) ** 2) / (C2 * v * v);
// UN'ORBITA integrata (RK4 nel tempo proprio): d²r/dτ² = −GM/r² + L²/r³ − 3GM·L²/(c²r⁴), dφ/dτ = L/r²,
// dt/dτ = E/(1 − r_s/r). Parte da r0 con velocità radiale vr e trasversa vt MISURATE DA CHI STA FERMO LÌ (m/s).
// → { esito: 'cade' | 'fugge' | 'legata', E, L, tau (tempo proprio), t (tempo di lontano), giri, punti: [[r, φ, τ, t]],
//     pericentri: [φ…] (per misurare la precessione) }
export function orbita({ M, r0, vr = 0, vt = 0, durata = Infinity, passo = 2e-3, fuori = null, tieni = false, passiMassimi = 2e6 }) {
  const rs = raggioSchwarzschild(M), GM = G * M, A0 = 1 - rs / r0, v2 = vr * vr + vt * vt, gam = 1 / Math.sqrt(1 - v2 / C2), E = Math.sqrt(A0) * gam, L = r0 * gam * vt; // E per mc²; L = r·γ·v_t
  // (chi sta fermo misura dℓ = dr/√A e dT = √A·dt; la particella ha dτ = dT/γ: dr/dτ = √A·γ·v_r, L = r·γ·v_t, E = √A·γ;
  // controllo: E² = (dr/cdτ)² + A(1 + L²/c²r²) ⇔ γ² = γ²v²/c² + 1)
  let r = r0, pr = gam * vr * Math.sqrt(A0), fi = 0, tau = 0, t = 0;
  const acc = (rr) => -GM / (rr * rr) + (L * L) / rr ** 3 - (3 * GM * L * L) / (C2 * rr ** 4), rFuori = fuori ?? 1e3 * r0, punti = tieni ? [[r, 0, 0, 0]] : null, pericentri = []; let prPrima = pr, n = 0;
  while (tau < durata && n++ < passiMassimi) {
    const dt = passo * Math.min(r / Math.max(Math.abs(pr), 1e-300), Math.sqrt(r ** 3 / GM)); // una frazione del tempo dinamico locale
    const k1r = pr, k1p = acc(r), k2r = pr + 0.5 * dt * k1p, k2p = acc(r + 0.5 * dt * k1r), k3r = pr + 0.5 * dt * k2p, k3p = acc(r + 0.5 * dt * k2r), k4r = pr + dt * k3p, k4p = acc(r + dt * k3r);
    const rn = r + (dt / 6) * (k1r + 2 * k2r + 2 * k3r + k4r), pn = pr + (dt / 6) * (k1p + 2 * k2p + 2 * k3p + k4p), rm = 0.5 * (r + rn);
    if (rn <= rs) { const f = (r - rs) / (r - rn); return { esito: 'cade', E, L, tau: tau + f * dt, t: Infinity, giri: fi / (2 * PI), punti, pericentri }; }
    fi += (dt * L) / (rm * rm); t += (dt * E) / (1 - rs / rm); tau += dt;
    if (prPrima < 0 && pn >= 0) pericentri.push(fi - ((dt * L) / (rm * rm)) * (pn / (pn - prPrima))); // dr/dτ cambia segno: un pericentro
    prPrima = pn; r = rn; pr = pn; if (tieni) punti.push([r, fi, tau, t]);
    if (r > rFuori && pr > 0) return { esito: 'fugge', E, L, tau, t, giri: fi / (2 * PI), punti, pericentri };
  }
  return { esito: 'legata', E, L, tau, t, giri: fi / (2 * PI), punti, pericentri };
}
// la caduta radiale da fermo a r0: il tempo PROPRIO fino a r (cicloide: r = r0(1 + cos η)/2, τ = √(r0³/8GM)(η + sin η)),
// esatto in Schwarzschild anche sotto l'orizzonte; fino al centro: (π/2)·√(r0³/2GM). (Da fuori non la si vede mai
// arrivare: il tempo di lontano diverge all'orizzonte.)
export const tempoDiCaduta = (M, r0, r = 0) => { const eta = Math.acos(Math.max(-1, Math.min(1, (2 * r) / r0 - 1))); return Math.sqrt(r0 ** 3 / (8 * G * M)) * (eta + Math.sin(eta)); };

// ---------- KERR: un raggio di luce nella forma di Kerr–Schild (coordinate cartesiane che non hanno singolarità
// all'orizzonte; unità r_g = 1, asse di rotazione z). g^{μν} = η^{μν} − f·l^μ l^ν, f = 2r³/(r⁴ + a²z²),
// l = (1, (rx + ay)/(r² + a²), (ry − ax)/(r² + a²), z/r); il raggio obbedisce alle equazioni di Hamilton di
// H = ½g^{μν}p_μp_ν = ½[−p_t² + |p|² − f·(l·p)²] (Kerr 1963; Kerr & Schild 1965) [R]; le derivate di H sono prese per
// differenze (le quantità conservate E, L_z e la condizione H = 0 fanno da controllo: vedi test).
// x: [x, y, z], p: [p_x, p_y, p_z] del fotone che ARRIVA all'occhio seguito all'indietro (si integra verso il passato).
// → { esito: 'fugge' | 'cade', x, p, passi, H (quanto si è allontanato da zero) }
export function raggioKerr(a, x0, p0, { k = 0.02, passi = 20000, fuori = null } = {}) {
  const raggio = (X) => { const R2 = X[0] * X[0] + X[1] * X[1] + X[2] * X[2] - a * a; return Math.sqrt(0.5 * (R2 + Math.sqrt(R2 * R2 + 4 * a * a * X[2] * X[2]))); };
  const Hdi = (X, P, pt) => { const r = raggio(X), r2 = r * r, f = (2 * r * r2) / (r2 * r2 + a * a * X[2] * X[2]), lp = -pt + ((r * X[0] + a * X[1]) * P[0] + (r * X[1] - a * X[0]) * P[1]) / (r2 + a * a) + (X[2] * P[2]) / r; return 0.5 * (-pt * pt + P[0] * P[0] + P[1] * P[1] + P[2] * P[2] - f * lp * lp); };
  // p_t dalla condizione H = 0 (la radice del fotone che viaggia verso il futuro; lo si segue all'indietro con dλ < 0)
  const ptDi = (X, P) => { const r = raggio(X), r2 = r * r, f = (2 * r * r2) / (r2 * r2 + a * a * X[2] * X[2]), s = ((r * X[0] + a * X[1]) * P[0] + (r * X[1] - a * X[0]) * P[1]) / (r2 + a * a) + (X[2] * P[2]) / r, pp = scal(P, P);
    // −p_t²(1 + f) + 2f·s·p_t + pp − f s² = 0
    const A = -(1 + f), B = 2 * f * s, Cc = pp - f * s * s; return (-B + Math.sqrt(B * B - 4 * A * Cc)) / (2 * A); };
  let X = x0.slice(), P = p0.slice(); const pt = ptDi(X, P), rp = 1 + Math.sqrt(Math.max(0, 1 - a * a)), rFuori = fuori ?? Math.max(60, 1.6 * lungo(x0)), eps = 1e-5;
  const der = (X, P) => { const dX = [0, 0, 0], dP = [0, 0, 0]; for (let j = 0; j < 3; j++) { const e = eps * Math.max(1, Math.abs(X[j])), Xa = X.slice(), Xb = X.slice(); Xa[j] += e; Xb[j] -= e; dP[j] = -(Hdi(Xa, P, pt) - Hdi(Xb, P, pt)) / (2 * e); const q = eps * Math.max(1, Math.abs(P[j])), Pa = P.slice(), Pb = P.slice(); Pa[j] += q; Pb[j] -= q; dX[j] = (Hdi(X, Pa, pt) - Hdi(X, Pb, pt)) / (2 * q); } return [dX, dP]; };
  for (let i = 0; i < passi; i++) {
    const r = raggio(X); if (r < rp * 1.01) return { esito: 'cade', x: X, p: P, passi: i, H: Hdi(X, P, pt), pt };
    if (lungo(X) > rFuori && i > 4) return { esito: 'fugge', x: X, p: P, passi: i, H: Hdi(X, P, pt), pt };
    const dl = -(k * Math.max(0.05, r - rp * 0.98)) / Math.max(1e-12, lungo(P)); // all'indietro
    const [a1, b1] = der(X, P), X2 = somma3(X, per(a1, 0.5 * dl)), P2 = somma3(P, per(b1, 0.5 * dl)), [a2, b2] = der(X2, P2), X3 = somma3(X, per(a2, 0.5 * dl)), P3 = somma3(P, per(b2, 0.5 * dl)), [a3, b3] = der(X3, P3), X4 = somma3(X, per(a3, dl)), P4 = somma3(P, per(b3, dl)), [a4, b4] = der(X4, P4);
    X = [0, 1, 2].map((j) => X[j] + (dl / 6) * (a1[j] + 2 * a2[j] + 2 * a3[j] + a4[j])); P = [0, 1, 2].map((j) => P[j] + (dl / 6) * (b1[j] + 2 * b2[j] + 2 * b3[j] + b4[j]));
  }
  return { esito: 'cade', x: X, p: P, passi, H: Hdi(X, P, pt), pt };
}

// ---------- LE LENTI di masse ordinarie
// le distanze di diametro angolare nella cosmologia piatta di leggi.js: D = χ/(1 + z); tra due redshift (χ_s − χ_l)/(1 + z_s)
const chiDiZ = (z) => cosmo.comovente(1 / (1 + z), 1);
export const distanzaAngolare = (z, zDa = 0) => (chiDiZ(z) - chiDiZ(zDa)) / (1 + z);
// il raggio di Einstein (rad) di una massa M (kg) tutta dentro l'anello, lente a z_l e sorgente a z_s; oppure, vicino,
// con le distanze date in metri: { Dl, Ds } (Dls = Ds − Dl)
export function raggioEinstein(M, { zl = null, zs = null, Dl = null, Ds = null } = {}) {
  const dl = Dl ?? distanzaAngolare(zl), ds = Ds ?? distanzaAngolare(zs), dls = Dl != null ? Ds - Dl : distanzaAngolare(zs, zl);
  return Math.sqrt(((4 * G * M) / C2) * (dls / (dl * ds)));
}
// la sfera isoterma (la lente che corrisponde a una curva di rotazione piatta, σ = V/√2): θ_E = 4π(σ/c)²·D_ls/D_s
export const raggioEinsteinIsoterma = (sigma, zl, zs) => 4 * PI * (sigma / C) ** 2 * (distanzaAngolare(zs, zl) / distanzaAngolare(zs));

// =====================================================================================================
// 5. LE LENTI: più immagini della stessa sorgente, a tempi diversi (principio di Fermat)
// =====================================================================================================
// La luce arriva lungo i cammini per cui il tempo d'arrivo è STAZIONARIO. Per una lente sottile, con θ la direzione in
// cui si guarda e β quella in cui la sorgente starebbe senza lente (radianti, dal centro della lente):
//   t(θ) = (1 + z_l)/c · D_l·D_s/D_ls · [ ½|θ − β|² − ψ(θ) ]        (ritardo geometrico + ritardo di Shapiro)
//   ∇²ψ = 2κ,  κ = Σ/Σ_cr,  Σ_cr = c²D_s/(4πG·D_l·D_ls)              (Schneider 1985; Blandford & Narayan 1986 [R])
// Le immagini sono i punti dove ∇t = 0, cioè θ − α(θ) = β con α = ∇ψ; l'ingrandimento è 1/det(∂β/∂θ); la parità
// dice che punto stazionario è (minimo, sella, massimo). Le distanze sono quelle della cosmologia già presente.
// Per un profilo ellittico κ(ξ), ξ² = x² + y²/q², la deflessione è un integrale a una dimensione (Schramm 1990;
// Keeton 2001, astro-ph/0102341, eq. 9–12 [R, e CONTROLLATA nel test: ∇·α = 2κ]):
//   α_x = q·x·J₀, α_y = q·y·J₁,  J_n = ∫₀¹ κ(ξ(u)) du/(1 − (1 − q²)u)^(n+½),  ξ(u)² = u·(x² + y²/(1 − (1 − q²)u))
// ---------- i profili proiettati (kg/m² in funzione del raggio proiettato R in metri)
const acosh1 = (x) => Math.log(x + Math.sqrt(x * x - 1));
// alone di Navarro, Frenk & White proiettato fino all'infinito (Bartelmann 1996 [R]); M: la massa entro R_v, c la concentrazione
export function sigmaNFW(M, Rv, c) {
  const rs = Rv / c, rhoS = M / (4 * PI * rs ** 3 * (Math.log(1 + c) - c / (1 + c)));
  // (attorno a x = 1 la formula è 0/0: lì la serie, con X(e) = atanh(√e)/√e = 1 + e/3 + e²/5 + …, e = 1 − x²: f = (X − 1)/e)
  return (R) => { const x = Math.max(R / rs, 1e-9), d = x * x - 1; let f; if (Math.abs(d) < 0.05) { f = 0; for (let k = 12; k >= 1; k--) f = f * -d + 1 / (2 * k + 1); } else if (x < 1) f = (1 - acosh1(1 / x) / Math.sqrt(-d)) / d; else f = (1 - Math.acos(1 / x) / Math.sqrt(d)) / d; return 2 * rhoS * rs * f; };
}
// sferoide di Hernquist 1990 proiettato [R]; M la massa, a la scala
export function sigmaHernquist(M, a) {
  // (attorno a s = 1, con la stessa serie di X: [(2 + s²)X − 3]/d² = Σ_{k≥2} d^(k−2)·4(k − 1)/((2k + 1)(2k − 1)), d = 1 − s²)
  return (R) => { const s = Math.max(R / a, 1e-9), d = 1 - s * s; if (Math.abs(d) < 0.05) { let f = 0; for (let k = 13; k >= 2; k--) f = f * d + (4 * (k - 1)) / ((2 * k + 1) * (2 * k - 1)); return (M / (2 * PI * a * a)) * f; }
    const X = s < 1 ? acosh1(1 / s) / Math.sqrt(d) : Math.acos(1 / s) / Math.sqrt(-d); return (M / (2 * PI * a * a * d * d)) * ((2 + s * s) * X - 3); };
}
// disco esponenziale visto di faccia (Freeman 1970): Σ₀e^(−R/R_d), Σ₀ = M/(2πR_d²)
export const sigmaDisco = (M, Rd) => (R) => (M / (2 * PI * Rd * Rd)) * Math.exp(-R / Rd);
// LA MASSA DAVANTI dal modello di una galassia (galassie.js `forma.modello`: { Mh, c, Rv, Md, Rd, Ms, as } in M☉ e kpc):
// l'alone (sferico), il disco visto inclinato di `inclinazione` (0: di faccia; il disco inclinato è ellittico con
// rapporto d'assi cos i: è questo, con lo schiacciamento dello sferoide, a dare quattro immagini invece dell'anello) e lo
// sferoide con il suo `schiacciata` (rapporto d'assi sul cielo). `angolo`: dove punta l'asse maggiore.
// (Semplificazioni dichiarate: l'alone è sferico e va all'infinito; il disco è sottile, e non lo si inclina oltre q = 0,15.)
const KPC_M = KPC;
export function massaDaModello(m, { z = null, distanza = null, inclinazione = 0, angolo = 0, schiacciata = 1 } = {}) {
  const componenti = [{ nome: 'alone', sigma: sigmaNFW(m.Mh * MSOLE, m.Rv * KPC_M, m.c), q: 1, angolo: 0 }];
  if (m.Md > 0 && m.Rd > 0) componenti.push({ nome: 'disco', sigma: sigmaDisco(m.Md * MSOLE, m.Rd * KPC_M), q: Math.max(0.15, Math.cos(inclinazione)), angolo });
  if (m.Ms > 0 && m.as > 0) componenti.push({ nome: 'sferoide', sigma: sigmaHernquist(m.Ms * MSOLE, m.as * KPC_M), q: Math.max(0.15, schiacciata), angolo });
  return { z, distanza, componenti };
}
// i nodi di Gauss–Legendre su [0, 1]
const nodiGL = (() => { const memo = new Map(); return (n) => { if (memo.has(n)) return memo.get(n); const x = new Float64Array(n), w = new Float64Array(n);
  for (let i = 0; i < n; i++) { let z = Math.cos((PI * (i + 0.75)) / (n + 0.5)), pp = 1; for (let it = 0; it < 60; it++) { let p1 = 1, p2 = 0; for (let j = 1; j <= n; j++) { const p3 = p2; p2 = p1; p1 = ((2 * j - 1) * z * p2 - (j - 1) * p3) / j; } pp = (n * (z * p1 - p2)) / (z * z - 1); const dz = p1 / pp; z -= dz; if (Math.abs(dz) < 1e-15) break; } x[i] = 0.5 * (1 + z); w[i] = 1 / ((1 - z * z) * pp * pp); }
  const r = { x, w }; memo.set(n, r); return r; }; })();

// LA LENTE. massaDavanti: { z | distanza (m), componenti: [{ sigma(R) kg/m², q, angolo } | { massa (kg): un punto }] }
//   (da `massaDaModello`, o { z, massa } per una massa puntiforme); sorgente: { z | distanza, beta: [βx, βy] rad };
//   osservatore: { bolla (per i tempi d'emissione: vedi sotto), griglia (96), campo (2,5 raggi di Einstein), curve (false) }.
// → { raggioEinstein (rad: dove la deflessione media vale θ), anello (true se sorgente e lente sono allineate e la
//     lente è rotonda: l'immagine è un anello), immagini: [{ theta: [x, y], ingrandimento (con il segno: negativo =
//     immagine rovesciata), parita: 'minimo' | 'sella' | 'massimo', ritardo (s dopo la prima che arriva),
//     tEmissione (s da oggi: l'istante della sorgente che quella immagine mostra) }] in ordine d'arrivo,
//     ingrandimentoTotale, scalaRitardo (s per rad²), sigmaCritica (kg/m²), deflessione(x, y), kappa(x, y),
//     critiche, caustiche (liste di punti, solo con curve: true), segui(theta, beta) → la stessa immagine per una
//     sorgente spostata in beta (o null se lì non c'è più: ha passato una caustica) }
// IL LEGAME CON IL CONO: la bolla che guarda riceve, dello STESSO oggetto, tante epoche quante sono le immagini: quella
// che arriva più tardi di Δt mostra la sorgente com'era Δt/(1 + z_s) PRIMA (tutte nel passato, mai nel futuro). La
// prima immagine è presa al tempo del cono senza lente (`conoPassato`): la costante del ritardo di Shapiro non è
// definita (il potenziale di una massa estesa non ha uno zero), le differenze sì.
export function lente(massaDavanti, sorgente, osservatore = {}) {
  const O = { griglia: 96, campo: 2.5, curve: false, nodi: 64, bolla: null, ...osservatore }, cosmico = massaDavanti.distanza == null;
  const Dl = cosmico ? distanzaAngolare(massaDavanti.z) : massaDavanti.distanza, Ds = cosmico ? distanzaAngolare(sorgente.z) : sorgente.distanza, Dls = cosmico ? distanzaAngolare(sorgente.z, massaDavanti.z) : Ds - Dl;
  if (!(Dls > 0)) throw new Error('relativita.lente: la sorgente deve stare dietro la massa');
  const sigmaCr = (C2 * Ds) / (4 * PI * G * Dl * Dls), scalaT = ((cosmico ? 1 + massaDavanti.z : 1) * Dl * Ds) / (C * Dls), beta = sorgente.beta || [0, 0];
  const lista = massaDavanti.componenti || [{ massa: massaDavanti.massa }], estese = [], punti = [];
  for (const c of lista) { if (c.massa != null && !c.sigma) punti.push({ t2: ((4 * G * c.massa) / C2) * (Dls / (Dl * Ds)), x: (c.pos && c.pos[0]) || 0, y: (c.pos && c.pos[1]) || 0 }); else { const q = c.q ?? 1; estese.push({ k: (xi) => c.sigma(xi * Dl) / (sigmaCr * q), q, ca: Math.cos(c.angolo || 0), sa: Math.sin(c.angolo || 0) }); } }
  const { x: gx, w: gw } = nodiGL(O.nodi);
  const deflessione = (x, y) => { let ax = 0, ay = 0;
    for (const c of estese) { const X = c.ca * x + c.sa * y, Y = -c.sa * x + c.ca * y, e = 1 - c.q * c.q; let j0 = 0, j1 = 0;
      for (let i = 0; i < gx.length; i++) { const u = gx[i] * gx[i], du = 2 * gx[i] * gw[i], d = 1 - e * u, k = c.k(Math.sqrt(u * (X * X + (Y * Y) / d))) * du, r = 1 / Math.sqrt(d); j0 += k * r; j1 += k * r * r * r; } // (u = w²: l'integrando resta liscio anche dove κ ha la punta)
      const bx = c.q * X * j0, by = c.q * Y * j1; ax += c.ca * bx - c.sa * by; ay += c.sa * bx + c.ca * by; }
    for (const p of punti) { const dx = x - p.x, dy = y - p.y, r2 = dx * dx + dy * dy || 1e-300; ax += (p.t2 * dx) / r2; ay += (p.t2 * dy) / r2; }
    return [ax, ay]; };
  const kappa = (x, y) => { let k = 0; for (const c of estese) { const X = c.ca * x + c.sa * y, Y = -c.sa * x + c.ca * y; k += c.k(Math.sqrt(X * X + (Y * Y) / (c.q * c.q))); } return k; };
  // il potenziale: ψ(θ) = ∫₀¹ α(sθ)·θ ds per le parti estese (ψ(0) = 0), θ_E²·ln|θ| per i punti
  const potenziale = (x, y) => { let s = 0; if (estese.length) { const soloEstese = (X, Y) => { let ax = 0, ay = 0; const a = deflessione(X, Y); ax = a[0]; ay = a[1]; for (const p of punti) { const dx = X - p.x, dy = Y - p.y, r2 = dx * dx + dy * dy || 1e-300; ax -= (p.t2 * dx) / r2; ay -= (p.t2 * dy) / r2; } return [ax, ay]; };
      for (let i = 0; i < gx.length; i++) { const a = soloEstese(gx[i] * x, gx[i] * y); s += gw[i] * (a[0] * x + a[1] * y); } }
    for (const p of punti) s += 0.5 * p.t2 * Math.log((x - p.x) ** 2 + (y - p.y) ** 2 || 1e-300); return s; };
  // il raggio di Einstein: dove la deflessione radiale, mediata su 16 direzioni, vale θ (il più esterno)
  const media = (t) => { let s = 0; for (let k = 0; k < 16; k++) { const f = (2 * PI * (k + 0.5)) / 16, a = deflessione(t * Math.cos(f), t * Math.sin(f)); s += a[0] * Math.cos(f) + a[1] * Math.sin(f); } return s / 16 - t; };
  let tE = 0; { let t = 1e-1, prima = media(t); for (let k = 0; k < 80 && t > 1e-13; k++) { const t2 = t / 1.4, f2 = media(t2); if (prima < 0 && f2 >= 0) { let lo = t2, hi = t; for (let i = 0; i < 50; i++) { const m = 0.5 * (lo + hi); if (media(m) >= 0) lo = m; else hi = m; } tE = 0.5 * (lo + hi); break; } t = t2; prima = f2; } }
  const bN = Math.hypot(beta[0], beta[1]), rotonda = estese.every((c) => c.q === 1) && punti.every((p) => p.x === 0 && p.y === 0), anello = tE > 0 && rotonda && bN < 1e-9 * tE;
  // le immagini: la mappa θ → β su una griglia di triangoli; dove un triangolo copre la sorgente c'è un'immagine, rifinita con Newton
  const L = tE > 0 ? O.campo * tE + 1.5 * bN : Math.max(4 * bN, 1e-9), n = O.griglia, h = (2 * L) / n, sposta = 0.3713 * h, h1 = 1e-4 * (tE || L);
  const jac = (x, y) => { const a = deflessione(x + h1, y), b = deflessione(x - h1, y), c = deflessione(x, y + h1), d = deflessione(x, y - h1); return [1 - (a[0] - b[0]) / (2 * h1), -(c[0] - d[0]) / (2 * h1), -(a[1] - b[1]) / (2 * h1), 1 - (c[1] - d[1]) / (2 * h1)]; };
  const immagini = [], vicino2 = (1e-4 * (tE || L)) ** 2;
  const rifinisci = (x, y) => { for (let it = 0; it < 40; it++) { const a = deflessione(x, y), fx = x - a[0] - beta[0], fy = y - a[1] - beta[1], J = jac(x, y), det = J[0] * J[3] - J[1] * J[2]; if (!(Math.abs(det) > 1e-14)) break; const dx = (J[3] * fx - J[1] * fy) / det, dy = (-J[2] * fx + J[0] * fy) / det, passo = Math.hypot(dx, dy), k = passo > 0.5 * h ? (0.5 * h) / passo : 1; x -= k * dx; y -= k * dy; if (passo < 1e-13 * (tE || L)) return [x, y]; } const a = deflessione(x, y); return Math.hypot(x - a[0] - beta[0], y - a[1] - beta[1]) < 1e-9 * (tE || L) ? [x, y] : null; };
  if (!anello) {
    const bxG = new Float64Array((n + 1) * (n + 1)), byG = new Float64Array((n + 1) * (n + 1)), px = (i) => -L + sposta + i * h;
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) { const a = deflessione(px(i), px(j)); bxG[j * (n + 1) + i] = px(i) - a[0]; byG[j * (n + 1) + i] = px(j) - a[1]; }
    const prova = (i0, j0, i1, j1, i2, j2) => { const k0 = j0 * (n + 1) + i0, k1 = j1 * (n + 1) + i1, k2 = j2 * (n + 1) + i2, x0 = bxG[k0], y0 = byG[k0], x1 = bxG[k1] - x0, y1 = byG[k1] - y0, x2 = bxG[k2] - x0, y2 = byG[k2] - y0, d = x1 * y2 - x2 * y1; if (d === 0) return;
      const u = ((beta[0] - x0) * y2 - (beta[1] - y0) * x2) / d, v = (x1 * (beta[1] - y0) - y1 * (beta[0] - x0)) / d; if (u < -1e-9 || v < -1e-9 || u + v > 1 + 1e-9) return;
      const r = rifinisci(px(i0) + u * (px(i1) - px(i0)) + v * (px(i2) - px(i0)), px(j0) + u * (px(j1) - px(j0)) + v * (px(j2) - px(j0))); if (!r) return; if (immagini.some((m) => (m.theta[0] - r[0]) ** 2 + (m.theta[1] - r[1]) ** 2 < vicino2)) return; immagini.push({ theta: r }); };
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { prova(i, j, i + 1, j, i, j + 1); prova(i + 1, j + 1, i, j + 1, i + 1, j); }
    if (!immagini.length) { const r = rifinisci(beta[0], beta[1]); if (r) immagini.push({ theta: r }); }
    for (const m of immagini) { const [x, y] = m.theta, J = jac(x, y), det = J[0] * J[3] - J[1] * J[2], tr = J[0] + J[3]; m.ingrandimento = 1 / det; m.parita = det < 0 ? 'sella' : tr > 0 ? 'minimo' : 'massimo'; m.tau = 0.5 * ((x - beta[0]) ** 2 + (y - beta[1]) ** 2) - potenziale(x, y); }
    immagini.sort((a, b) => a.tau - b.tau); const t0 = immagini.length ? immagini[0].tau : 0;
    const cono = O.bolla && cosmico ? conoPassato(O.bolla, { comovente: cosmo.comovente(1 / (1 + sorgente.z), 1) }) : O.bolla ? conoPassato(O.bolla, { distanza: Ds }) : null;
    for (const m of immagini) { m.ritardo = scalaT * (m.tau - t0); if (cono) m.tEmissione = cono.t - m.ritardo / (1 + (cosmico ? sorgente.z : 0)); }
  }
  // seguire un'immagine mentre la sorgente si sposta (per una sorgente che si muove, o per avvicinarla a una caustica)
  const segui = (theta, b) => { const b0 = beta[0], b1 = beta[1]; beta[0] = b[0]; beta[1] = b[1]; const r = rifinisci(theta[0], theta[1]); beta[0] = b0; beta[1] = b1; if (!r) return null; const J = jac(r[0], r[1]), det = J[0] * J[3] - J[1] * J[2]; return { theta: r, ingrandimento: 1 / det, parita: det < 0 ? 'sella' : J[0] + J[3] > 0 ? 'minimo' : 'massimo' }; };
  const out = { raggioEinstein: tE, anello, immagini, segui, ingrandimentoTotale: anello ? Infinity : immagini.reduce((q, m) => q + Math.abs(m.ingrandimento), 0), scalaRitardo: scalaT, sigmaCritica: sigmaCr, distanze: { Dl, Ds, Dls }, deflessione, kappa, potenziale, jacobiano: jac };
  if (O.curve && tE > 0) { // le curve critiche (det = 0) e le caustiche (dove le critiche vanno a finire nel piano della sorgente)
    const m = Math.max(n, 160), hh = (2 * L) / m, D = new Float64Array((m + 1) * (m + 1)), q = (i) => -L + 0.3713 * hh + i * hh; out.critiche = []; out.caustiche = [];
    for (let j = 0; j <= m; j++) for (let i = 0; i <= m; i++) { const J = jac(q(i), q(j)); D[j * (m + 1) + i] = J[0] * J[3] - J[1] * J[2]; }
    const taglio = (xa, ya, da, xb, yb, db) => { const f = da / (da - db), x = xa + f * (xb - xa), y = ya + f * (yb - ya), a = deflessione(x, y); out.critiche.push([x, y]); out.caustiche.push([x - a[0], y - a[1]]); };
    for (let j = 0; j < m; j++) for (let i = 0; i < m; i++) { const d0 = D[j * (m + 1) + i], dx = D[j * (m + 1) + i + 1], dy = D[(j + 1) * (m + 1) + i]; if (d0 * dx < 0) taglio(q(i), q(j), d0, q(i + 1), q(j), dx); if (d0 * dy < 0) taglio(q(i), q(j), d0, q(i), q(j + 1), dy); }
  }
  return out;
}
// LA MICROLENTE di una stella singola che passa davanti a un'altra: le due immagini non si separano (millesimi di secondo
// d'arco) e si vede solo la luce che cresce e cala, A(u) = (u² + 2)/(u√(u² + 4)), u = distanza in raggi di Einstein
// (Einstein 1936; Paczyński 1986, ApJ 304, 1 [R]). M (kg), Dl, Ds (m), u0 (il passaggio più vicino), v (m/s di traverso).
// → { raggioEinstein (rad), tempoEinstein (s), ingrandimento(u), curva(t) (t dal massimo), picco }
export function microlente({ M, Dl, Ds, u0 = 0.1, v = 2e5 }) {
  const tE = raggioEinstein(M, { Dl, Ds }), durata = (tE * Dl) / v, A = (u) => (u * u + 2) / (u * Math.sqrt(u * u + 4));
  return { raggioEinstein: tE, tempoEinstein: durata, ingrandimento: A, curva: (t) => A(Math.hypot(u0, t / durata)), picco: A(u0) };
}

// =====================================================================================================
// 6. I CASI LIMITE: la luce, la caduta oltre l'orizzonte, ciò che un buco nero dimentica
// =====================================================================================================
// IL TEMPO PROPRIO tra due eventi lungo il moto uniforme che li unisce: τ = √(s²)/c. Se sono separati nel tempo esiste
// un riferimento in cui accadono nello stesso luogo (quello di chi li vive entrambi), e τ è il suo tempo. Sulla luce
// τ = 0: tra emissione e assorbimento l'intervallo è nullo. È il LIMITE v → c di τ = Δt·√(1 − v²/c²), NON il «punto di
// vista del fotone»: a v = c la trasformazione di Lorentz non esiste (γ = ∞), quindi non c'è un riferimento in cui il
// fotone sta fermo, né un suo «adesso» (`sezioneDi` lo rifiuta). → { tau (s; NaN se separati nello spazio), tipo:
// 'tempo' | 'luce' | 'spazio', riferimento (true solo per 'tempo': esiste chi li vive entrambi), velocita (m/s) }
export function tempoProprio(e1, e2) {
  const s2 = intervallo(e1, e2), dt = Math.abs((e2.t || 0) - (e1.t || 0)), dx = lungo(meno3(e2.x || e2.posizione || [0, 0, 0], e1.x || e1.posizione || [0, 0, 0])), v = dt > 0 ? dx / dt : Infinity;
  // (sul cono: confronto fatto sulle velocità, non su s², che è una differenza di numeri grandi)
  const tipo = Math.abs(dx - C * dt) <= 1e-12 * Math.max(dx, C * dt) ? 'luce' : s2 > 0 ? 'tempo' : 'spazio';
  return { tau: tipo === 'luce' ? 0 : tipo === 'tempo' ? dt * Math.sqrt(1 - (v / C) ** 2) : NaN, tipo, riferimento: tipo === 'tempo', velocita: v };
}

// LA BOLLA CHE CADE in un buco nero (Schwarzschild). Dentro l'orizzonte r non è più un luogo dove si può restare: è
// una coordinata di TEMPO, e r = 0 è un istante nel futuro di chiunque sia entrato, non un posto. Il tempo proprio
// che resta, da r < r_s, è AL PIÙ r_s·[asin√x − √(x(1 − x))]/c, x = r/r_s (la geodetica di energia nulla): dall'orizzonte
// π·GM/c³, e ogni spinta dei motori lo accorcia [R: Misner, Thorne & Wheeler 1973, §31]. Chi cade da fermo da lontano
// ne ha (4/3)·GM/c³. Che cosa vede (coordinate di Painlevé–Gullstrand [R], valide attraverso l'orizzonte): per chi
// cade da fermo dall'infinito, v = c√(r_s/r) misurata da chi sta fermo; un fotone con parametro d'urto b ha per lui
// energia ε = 1 + β·p_r e momento radiale p_r = [β ∓ √(1 − A·b²/r²)]/A (A = 1 − r_s/r, β = √(r_s/r)) [D]: il bordo
// dell'ombra (b = √27 r_g) sta a cos ψ = p_r/ε dalla direzione del centro — 42° all'orizzonte, non tutto il cielo; 90°
// alla fine — e la luce che arriva da sopra è spostata di 1/(1 + β): al rosso, di un fattore 2 all'orizzonte.
// M (kg); corpo: { lungo (m), massa (kg), raggio (m) } facoltativo (dove la marea lo spezza).
// → { orizzonte, tempoMassimo (s, dall'orizzonte), tempoDaLontano (s, dall'orizzonte, cadendo da fermo dall'infinito),
//     tempoRimasto(r) (il massimo, per r ≤ r_s), marea(r) (m/s² tra i capi del corpo), siSpezza: { r, dentro (true:
//     sotto l'orizzonte) } | null, vede(r) → { ombra (rad: raggio del disco nero), sopra (ν/ν_lontano della luce che
//     arriva dallo zenit), velocita (in c, misurata da chi sta fermo; > 1 dentro: lì nessuno sta fermo) },
//     singolarita: { aperta: true, perche } — a r = 0 le funzioni si fermano e lo dicono }
export function cadutaNelBuco(M, corpo = null) {
  const rs = raggioSchwarzschild(M), rg = rs / 2, aperta = { aperta: true, perche: 'a r = 0 la curvatura diverge e la relatività generale non dice più niente: serve una teoria che non c\'è (STATO: aperta)' };
  const tempoRimasto = (r) => { if (!(r > 0)) return 0; const x = Math.min(1, r / rs); return (rs / C) * (Math.asin(Math.sqrt(x)) - Math.sqrt(x * (1 - x))); };
  const vede = (r) => { if (!(r > 0)) return aperta; const A = 1 - rs / r, b = Math.sqrt(rs / r), rad = Math.sqrt(Math.max(0, 1 - (A * 27 * rg * rg) / (r * r)));
    // (all'orizzonte A = 0: il limite, senza dividere per zero)
    const pr = Math.abs(A) < 1e-9 ? -1 / (1 + b) + (27 * rg * rg) / (2 * r * r) : (b + (r >= 3 * rg ? rad : -rad)) / A, eps = 1 + b * pr;
    return { ombra: Math.acos(Math.max(-1, Math.min(1, pr / eps))), sopra: 1 / (1 + b), velocita: b }; };
  const d = corpo ? corpo.lungo ?? 2 * corpo.raggio : 0, rt = corpo && corpo.massa && corpo.raggio ? raggioDiMarea(M, corpo.massa, corpo.raggio) : null;
  return { orizzonte: rs, tempoMassimo: (PI * G * M) / C ** 3, tempoDaLontano: (4 * G * M) / (3 * C ** 3), tempoRimasto, marea: (r) => (r > 0 ? marea(M, r, d) : Infinity), siSpezza: rt != null ? { r: rt, dentro: rt < rs } : null, vede, singolarita: aperta };
}

// CIÒ CHE RESTA RICOSTRUIBILE DA FUORI. Un buco nero fermo è descritto per intero da tre numeri: massa, momento
// angolare, carica (teorema «dell'assenza di capelli»: Israel 1967; Carter 1971; Robinson 1975 [R]): tutto il resto di
// ciò che è caduto non lascia traccia fuori. La sua entropia, S = k_B·A·c³/(4Għ) (Bekenstein 1973; Hawking 1975), conta
// quanti stati hanno lo stesso aspetto: e^(S/k_B). È il caso estremo delle regole 5 e 11 dell'intreccio: dove il
// segnale è cancellato, TUTTI i passati compatibili pesano uguale, e sono e^(S/k_B).
// bucoNero: ciò che dà `bucoNero(...)`, o { massaKg, spin }. → { parametri, lnPassati (= S/k_B), log10Passati, entropia (J/K), area }
export function passatiCompatibili(buco) {
  const h = (buco.hawking && buco.hawking.area ? buco.hawking : hawking(buco.massaKg, buco.spin || 0)), ln = h.entropia / K.kB;
  return { parametri: ['massa', 'momento angolare', 'carica'], lnPassati: ln, log10Passati: ln / Math.LN10, entropia: h.entropia, area: h.area };
}

// L'ORIZZONTE DELLE PARTICELLE al tempo cosmico t (s da oggi): quanto era grande la regione in contatto causale.
// `tabella`: quella di ragnatela.js (`dentro.TAB`: tempo conforme in Mpc con la radiazione) se chi chiama la ha — è la
// fonte migliore e non la si duplica qui; senza, la cosmologia di qui (materia + Λ: 2% in più oggi, molto di più
// all'inizio, dove comanda la radiazione). → { a, comovente (m di oggi), proprio (m di allora), fonte }
export function orizzonteParticelle(t = 0, tabella = null) {
  const a = cosmo.scala(T_OGGI + t), chi = tabella ? tabella.eta(a) * MPC : cosmo.orizzonte(a);
  return { a, comovente: chi, proprio: a * chi, fonte: tabella ? 'ragnatela.js (con la radiazione)' : 'relativita.js (materia + Λ)' };
}

// =====================================================================================================
// LO STATO SPERIMENTALE di ogni legge usata qui: 'misurata' (con la misura), 'derivata e mai osservata', 'aperta'.
// (Le misure marcate [V] sono state lette sulla fonte durante la stesura; [R] ricordate.)
// =====================================================================================================
export const STATO = Object.freeze([
  { legge: 'dilatazione dei tempi per la velocità (relatività ristretta)', funzioni: 'ritmo, sezioneDi', stato: 'misurata', misura: 'orologi ottici a 10 m/s (Chou et al. 2010, Science 329, 1630 [R]); vita dei muoni in volo; GPS ogni giorno (−7 µs/giorno)', fonte: 'Einstein 1905' },
  { legge: 'relatività della simultaneità (v·x/c²) e invarianza dell\'intervallo', funzioni: 'sezioneDi, incrocio, intervallo, relazione', stato: 'misurata', misura: 'non si misura da sola: è la stessa trasformazione di Lorentz, provata in ogni acceleratore e nella sincronizzazione degli orologi in orbita (il termine v·x/c² è la correzione di Sagnac del GPS, ~100 ns)', fonte: 'Einstein 1905; Minkowski 1908' },
  { legge: 'rallentamento degli orologi nel potenziale (redshift gravitazionale)', funzioni: 'ritmo, redshiftGravitazionale', stato: 'misurata', misura: 'satelliti Galileo: scarto dalla teoria (0,19 ± 2,48)·10⁻⁵ (Delva et al. 2018, arXiv:1812.03711 [V]); dentro un millimetro di atomi di stronzio (Bothwell et al. 2022, arXiv:2109.12238 [V]); Sirio B 80,65 ± 0,77 km/s (Joyce et al. 2018, arXiv:1809.01240 [V]); la stella S2 attorno a Sgr A*: f = 0,90 ± 0,09 ± 0,15 (GRAVITY 2018, arXiv:1807.09409 [V])', fonte: 'Einstein 1911; Pound & Rebka 1960' },
  { legge: 'il centro di un pianeta è più giovane della superficie', funzioni: 'potenzialeDaDensita, scartoLungo', stato: 'derivata e mai osservata', misura: 'conseguenza diretta del redshift misurato; calcolata: 2,5 anni per la Terra (Uggerhøj, Mikkelsen & Faye 2016, arXiv:1604.05507 [V])', fonte: 'Feynman (lezioni); Uggerhøj et al. 2016' },
  { legge: 'tempo cosmico, espansione, redshift cosmologico, tempo di ritorno', funzioni: 'cosmo, conoPassato', stato: 'misurata', misura: 'legge di Hubble; dilatazione delle curve di luce delle supernove lontane di un fattore (1 + z) (Goldhaber et al. 2001 [R]); T del fondo ∝ (1 + z)', fonte: 'Friedmann 1922; Lemaître 1927' },
  { legge: 'il riferimento del fondo a microonde e il dipolo', funzioni: 'dipolo, velocitaBolla', stato: 'misurata', misura: 'dipolo 3,362 mK → il Sole va a 369,8 km/s rispetto al fondo (Planck 2018 [R]); T₀ = 2,72548 ± 0,00057 K (Fixsen 2009, arXiv:0911.1955 [V])', fonte: 'Peebles & Wilkinson 1968' },
  { legge: 'deflessione della luce', funzioni: 'deflessione, raggioDiLuce, tracciaRaggio', stato: 'misurata', misura: '1,75″ al bordo del Sole: eclisse del 1919 (Dyson, Eddington & Davidson); VLBI: γ = 1 entro 2·10⁻⁴ (Lambert & Le Poncin-Lafitte 2009, arXiv:0903.1615 [V])', fonte: 'Einstein 1915' },
  { legge: 'ritardo di Shapiro', funzioni: 'ritardoShapiro, tempoLuce', stato: 'misurata', misura: 'sonda Cassini: γ − 1 = (2,1 ± 2,3)·10⁻⁵ (Bertotti, Iess & Tortora 2003, Nature 425, 374 [R]); Viking: ~250 µs andata e ritorno Terra–Marte', fonte: 'Shapiro 1964' },
  { legge: 'precessione del pericentro', funzioni: 'precessione, orbita', stato: 'misurata', misura: 'Mercurio 42,98″ per secolo (radar e sonde: entro 10⁻⁴ [R]); S2 attorno a Sgr A*: 12′ per orbita (GRAVITY 2020, arXiv:2004.07187 [V])', fonte: 'Einstein 1915' },
  { legge: 'precessione geodetica e trascinamento dei riferimenti', funzioni: 'precessioneGeodetica, trascinamento, precessioneTrascinamentoPolare', stato: 'misurata', misura: 'Gravity Probe B: −6601,8 ± 18,3 e −37,2 ± 7,2 mas/anno contro −6606,1 e −39,2 previsti (Everitt et al. 2011, arXiv:1105.3456 [V])', fonte: 'de Sitter 1916; Lense & Thirring 1918; Schiff 1960' },
  { legge: 'lenti gravitazionali di galassie e ammassi', funzioni: 'raggioEinstein, raggioEinsteinIsoterma', stato: 'misurata', misura: 'anelli di Einstein di ~1″ attorno a galassie, archi a decine di secondi d\'arco negli ammassi [R]', fonte: 'Einstein 1936; Zwicky 1937' },
  { legge: 'onde gravitazionali e spirale di una coppia', funzioni: 'spirale, tempoDaFrequenza', stato: 'misurata', misura: 'PSR B1913+16: calo del periodo osservato/previsto = 0,9983 ± 0,0016 (Weisberg & Huang 2016, arXiv:1606.02744 [V]); GW150914: 36 + 29 M☉, da 35 a 250 Hz (LIGO 2016, arXiv:1602.03837 [V]); la gravità va alla velocità della luce entro 10⁻¹⁵ (GW170817, arXiv:1710.05834 [V])', fonte: 'Einstein 1916/1918; Peters 1964' },
  { legge: 'buchi neri: esistenza, orizzonte, ombra, sfera dei fotoni', funzioni: 'orizzonte, sferaFotoni, ombra, ombraDaVicino', stato: 'misurata', misura: 'anello di M87*: 42 ± 3 µas, M = (6,5 ± 0,7)·10⁹ M☉ (EHT 2019, arXiv:1906.11238 [V]); Sgr A*: 51,8 ± 2,3 µas (EHT 2022, arXiv:2311.08680 [V]). (Che dietro l\'ombra ci sia un orizzonte e non una superficie è dedotto: niente luce di superficie)', fonte: 'Schwarzschild 1916; Synge 1966; Bardeen 1973' },
  { legge: 'ultima orbita stabile ed efficienza dell\'accrescimento; disco sottile', funzioni: 'ultimaOrbitaStabile, efficienza, discoSottile', stato: 'misurata', misura: 'indiretta: i bordi interni dei dischi nelle binarie X (spettro termico e riga del ferro) e la resa media dei quasar ~0,1 (argomento di Sołtan 1982) [R]; il profilo T ∝ r^(−3/4) è confermato solo in parte (le microlenti danno dischi più larghi del previsto [R])', fonte: 'Bardeen, Press & Teukolsky 1972; Novikov & Thorne 1973; Page & Thorne 1974' },
  { legge: 'Kerr: rotazione, ergosfera, ombra schiacciata', funzioni: 'ergosfera, giroOrizzonte, ombraKerr, raggioKerr', stato: 'derivata e mai osservata', misura: 'la metrica di Kerr è compatibile con tutte le misure (EHT, onde gravitazionali: il buco finale di GW150914 gira con a* ≈ 0,7 [R]); ergosfera, estrazione di energia e forma dell\'ombra non sono state misurate', fonte: 'Kerr 1963; Penrose 1969; Bardeen 1973' },
  { legge: 'rottura per marea di una stella', funzioni: 'marea, raggioDiMarea, massaDiHills', stato: 'misurata', misura: 'decine di brillamenti da stelle spezzate osservati dal 1990 in poi; nessuno attorno a buchi sopra ~10⁸ M☉, come vuole il limite di Hills [R]', fonte: 'Hills 1975; Rees 1988' },
  { legge: 'limite di Eddington', funzioni: 'eddington, tempoSalpeter', stato: 'misurata', misura: 'le esplosioni di tipo I delle stelle di neutroni si fermano a quella luminosità; i quasar stanno quasi tutti sotto [R]', fonte: 'Eddington 1926; Salpeter 1964' },
  { legge: 'radiazione di Hawking, evaporazione, entropia dell\'orizzonte', funzioni: 'hawking, massaCheEvapora', stato: 'derivata e mai osservata', misura: 'nessuna: 6·10⁻⁸ K per una massa solare, contro i 2,7 K del fondo; solo analoghi di laboratorio (onde sonore nei condensati)', fonte: 'Bekenstein 1973; Hawking 1974' },
  { legge: 'l\'interno dell\'orizzonte e la singolarità', funzioni: 'tempoDiCaduta (sotto r_s)', stato: 'aperta', misura: 'nessuna misura possibile da fuori; la relatività generale predice la propria fine (teoremi di Penrose 1965): lì serve una teoria che non c\'è', fonte: 'Oppenheimer & Snyder 1939; Penrose 1965' },
  { legge: 'che cosa succede all\'informazione di ciò che cade (e la fine dell\'evaporazione)', funzioni: '—', stato: 'aperta', misura: 'nessuna', fonte: 'Hawking 1976' },
  { legge: 'immagini multiple, ingrandimento e ritardi tra le immagini (principio di Fermat)', funzioni: 'lente, massaDaModello, microlente', stato: 'misurata', misura: 'croci e anelli di Einstein attorno alle galassie; ritardi di giorni–mesi tra le immagini dei quasar (da Q0957+561 in poi) usati per misurare H₀; la supernova Refsdal riapparsa dietro l\'ammasso MACS J1149 circa un anno dopo, come previsto (Kelly et al. 2016 [R]); la stella Earendel ingrandita migliaia di volte vicino a una caustica (Welch et al. 2022 [R]); migliaia di microlenti verso il centro galattico (curva di Paczyński)', fonte: 'Einstein 1936; Refsdal 1964; Paczyński 1986; Blandford & Narayan 1986' },
  { legge: 'il tempo proprio lungo la luce è zero (intervallo nullo); non esiste un riferimento del fotone', funzioni: 'tempoProprio, intervallo', stato: 'misurata', misura: 'è la stessa legge della dilatazione dei tempi, misurata fin dove si arriva (muoni e protoni a γ ~ 10³–10¹¹); il «punto di vista del fotone» non è una misura mancante: non esiste nella teoria (γ = ∞)', fonte: 'Einstein 1905; Minkowski 1908' },
  { legge: 'la caduta oltre l\'orizzonte: tempo proprio finito, marea, ciò che si vede', funzioni: 'cadutaNelBuco, tempoDiCaduta', stato: 'derivata e mai osservata', misura: 'fuori dall\'orizzonte la stessa relatività generale è misurata (vedi sopra); dentro nessun segnale può uscire a dirlo: è la teoria portata dove non si può controllare', fonte: 'Oppenheimer & Snyder 1939; Painlevé 1921; Misner, Thorne & Wheeler 1973' },
  { legge: 'assenza di capelli ed entropia di Bekenstein–Hawking (il numero di passati compatibili)', funzioni: 'passatiCompatibili, hawking', stato: 'derivata e mai osservata', misura: 'l\'entropia non è mai stata misurata; l\'assenza di capelli è compatibile con le onde della fusione (le frequenze del buco finale di GW150914 [R]) ma non provata; se l\'informazione riesca con la radiazione di Hawking è APERTO', fonte: 'Israel 1967; Bekenstein 1973; Hawking 1975' },
  { legge: 'la massa del buco nero centrale dalla galassia', funzioni: 'bucoCentrale (galassie.js), massaAutoregolata', stato: 'misurata', misura: 'relazione EMPIRICA M_bn–sferoide, scarto 0,28 dex (Kormendy & Ho 2013 [R]): è una correlazione osservata, non una legge; `massaAutoregolata` (King 2003) è una spiegazione proposta, in accordo con la M–σ misurata ma non provata; l\'origine dei germi è aperta', fonte: 'Kormendy & Ho 2013; King 2003' },
]);
