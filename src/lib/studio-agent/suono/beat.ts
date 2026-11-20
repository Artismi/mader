/**
 * Il beat: la musica dei reel. Breve, con l'aggancio subito, un cambio a metà e una fine che rientra nell'inizio.
 *
 * Niente generi scritti a mano: uno STILE è un vettore di parametri (tempo, metà tempo, swing e microtiming per strumento,
 * densità, sincope cercata, glide del basso, taglio del campione, polvere del nastro, armonia, timbri). Gli stili vivono
 * nella sua memoria come una popolazione che si evolve: quelli che hanno dato reel interessanti si riproducono, i nuovi
 * nascono per mutazione e incrocio. Il nome dello stile viene dopo, descrivendo quello che è venuto fuori.
 *
 * Il RITMO non è scritto: i pattern di batteria si evolvono per ogni brano. La misura è la sincope
 * (Longuet-Higgins & Lee): il groove piace di più a sincope media (curva a U rovesciata, Witek et al. 2014),
 * quindi lo stile chiede una sincope e i pattern ci si avvicinano; poi densità, ancora del rullante, niente collisioni,
 * e novità rispetto ai pattern che ha già usato.
 *
 * Il TEMPO è a più velocità insieme ("Dilla time"): cassa dritta, rullante in ritardo, charleston swingati;
 * gli scostamenti sono costanti per tutto il brano, come nei beat fatti sull'MPC.
 *
 * Il CAMPIONE: suona i suoi accordi su un piano elettrico, li registra, poi li taglia in sedici pezzi e li rimonta
 * con un pattern suo, con salti di tono: un campionamento senza campioni d'altri.
 */

export interface Stile {
  id: string
  bpm: number; meta: boolean // metà tempo: il rullante cade sul 3
  swing: number // 0..0.4 sui sedicesimi dispari
  ritardoRullante: number // secondi, 0..0.035
  anticipoHat: number // secondi, -0.015..0.01
  densita: number // 0..1: quanti colpi
  sincope: number // 0..1: quanta sincope cerca
  rulli: number // 0..1: probabilità di rullate di charleston (terzine, trentaduesimi)
  glide: number // 0..1: il basso scivola tra le note (808)
  sub: number // 0..1: quanto il basso è un 808 lungo invece di un basso corto
  taglio: number // 0..1: quanto il campione è tagliato e rimontato (0 = accordi suonati)
  polvere: number // 0..1: vinile, nastro, filtro
  colore: number // 0..1: armonia da triadi (0) a none e undicesime (1)
  scuro: number // 0..1: modo minore/frigio vs maggiore/dorico
  durezza: number // 0..1: saturazione, attacchi
  campanaccio: number // 0..1: il motivo suonato da una campana metallica invece che da una tastiera
  voci: number // 0..1: quante voci oltre a cassa e rullante (pochi elementi = pulito)
  sottrai: number // 0..1: nella seconda metà toglie (1) invece di aggiungere (0)
  punteggio?: number; usi?: number; nato?: number
}

const lim = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x))
function rng(seed: number) { let a = seed >>> 0 || 1; return () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296) }
const gauss = (r: () => number) => { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()) }

/** uno stile nuovo, a caso ma plausibile */
export function stileACaso(r: () => number, giorno = 0): Stile {
  const meta = r() < 0.45
  return {
    id: Math.floor(r() * 1e9).toString(36), meta,
    bpm: Math.round(meta ? 130 + r() * 30 : 82 + r() * 26),
    swing: r() * 0.22, ritardoRullante: r() * 0.014, anticipoHat: -r() * 0.004,
    densita: 0.1 + r() * 0.4, sincope: 0.2 + r() * 0.45, rulli: r() * 0.4,
    glide: meta ? 0.3 + r() * 0.6 : r() * 0.3, sub: meta ? 0.6 + r() * 0.4 : r(), taglio: r(), polvere: r(), colore: r(), scuro: r(),
    durezza: r(), campanaccio: r() < 0.2 ? 0.6 + r() * 0.4 : r() * 0.2, voci: r() * 0.7, sottrai: r(), punteggio: 0, usi: 0, nato: giorno,
  }
}
const CHIAVI = ['swing', 'ritardoRullante', 'anticipoHat', 'densita', 'sincope', 'rulli', 'glide', 'sub', 'taglio', 'polvere', 'colore', 'scuro', 'durezza', 'campanaccio', 'voci', 'sottrai'] as const
const SCALA: Record<string, [number, number]> = { swing: [0, 0.25], ritardoRullante: [0, 0.015], anticipoHat: [-0.005, 0] }
/** figlio di due stili: incrocio dei parametri e una mutazione gaussiana */
export function figlio(a: Stile, b: Stile, r: () => number, giorno = 0): Stile {
  const c: Stile = { ...a, id: Math.floor(r() * 1e9).toString(36), punteggio: 0, usi: 0, nato: giorno }
  for (const k of CHIAVI) {
    const [lo, hi] = SCALA[k] ?? [0, 1]
    const v = (r() < 0.5 ? a[k] : b[k]) + gauss(r) * (hi - lo) * 0.12
    ;(c as unknown as Record<string, number>)[k] = lim(v, lo, hi)
  }
  c.meta = r() < 0.15 ? !c.meta : r() < 0.5 ? a.meta : b.meta
  const base = r() < 0.5 ? a.bpm : b.bpm
  c.bpm = Math.round(lim(base * (c.meta !== (r() < 0.5 ? a.meta : b.meta) ? (c.meta ? 1.5 : 0.67) : 1) + gauss(r) * 5, 70, 165))
  return c
}

/** la descrizione viene dopo, da quello che è uscito: niente nomi di genere */
export function descrivi(s: Stile): string {
  const p: string[] = [`${s.bpm} bpm${s.meta ? ' a metà tempo' : ''}`]
  const n = 2 + Math.round(s.voci * 4)
  p.push(n <= 3 ? 'solo cassa, rullante e poco altro' : `${n} voci`)
  if (s.ritardoRullante > 0.018) p.push('rullante in ritardo')
  if (s.swing > 0.22) p.push('swing largo')
  if (s.taglio > 0.6) p.push('accordi tagliati e rimontati')
  if (s.glide > 0.6) p.push('basso che scivola')
  if (s.sub > 0.7) p.push('basso lungo')
  if (s.colore > 0.7) p.push('accordi larghi')
  if (s.polvere > 0.6) p.push('suono impolverato')
  if (s.durezza > 0.7) p.push('saturo')
  if (s.sottrai > 0.5) p.push('a metà si svuota')
  return p.join(', ')
}

// ── il pattern ──
// pesi metrici dei 16 sedicesimi (Longuet-Higgins & Lee): 0 sul battere, -4 sui sedicesimi deboli
const PESO = [0, -4, -3, -4, -2, -4, -3, -4, -1, -4, -3, -4, -2, -4, -3, -4]
/** sincope di una linea su 16 passi: somma delle differenze di peso dove un colpo precede un silenzio più forte */
export function sincopeDi(l: number[]): number {
  let s = 0
  for (let i = 0; i < 16; i++) if (l[i]) { const j = (i + 1) % 16; if (!l[j] && PESO[j] > PESO[i]) s += PESO[j] - PESO[i] }
  return s
}
export interface Pattern { cassa: number[]; rullante: number[]; hat: number[]; perc: number[] }
/** evolve un pattern di batteria per lo stile; la memoria contiene i pattern già usati (per non ripetersi) */
export function evolviPattern(st: Stile, r: () => number, memoria: Pattern[] = []): Pattern {
  const anc = st.meta ? [8] : [4, 12]
  const nuovo = (): Pattern => ({
    cassa: Array.from({ length: 16 }, (_, i) => (i === 0 || r() < st.densita * 0.35) && !anc.includes(i) ? 1 : 0),
    rullante: Array.from({ length: 16 }, (_, i) => anc.includes(i) ? 1 : r() < 0.06 ? 0.4 : 0),
    hat: Array.from({ length: 16 }, (_, i) => r() < st.densita * 0.6 || (i % 4 === 0 && r() < 0.5) ? (i % 2 ? 0.55 : 0.9) : 0),
    perc: Array.from({ length: 16 }, () => r() < 0.05 * st.densita ? 0.6 : 0),
  })
  const muta = (p: Pattern): Pattern => {
    const q = { cassa: [...p.cassa], rullante: [...p.rullante], hat: [...p.hat], perc: [...p.perc] }
    const linea = (['cassa', 'cassa', 'hat', 'perc', 'rullante'] as const)[Math.floor(r() * 5)]
    const i = Math.floor(r() * 16)
    if (linea === 'rullante' && anc.includes(i)) return q
    q[linea][i] = q[linea][i] ? 0 : linea === 'rullante' ? 0.4 : linea === 'hat' ? (i % 2 ? 0.55 : 0.9) : 1
    q.cassa[0] = 1
    return q
  }
  const sincMax = 22
  const fit = (p: Pattern) => {
    const sc = sincopeDi(p.cassa) / sincMax, sh = sincopeDi(p.hat.map(x => x ? 1 : 0)) / sincMax
    const dens = (p.cassa.filter(Boolean).length / 16 + p.hat.filter(Boolean).length / 16) / 2
    let f = -Math.abs(sc - st.sincope) * 2 - Math.abs(sh - st.sincope * 0.6) - Math.abs(dens - (0.12 + st.densita * 0.35)) * 2
    f -= Math.max(0, p.cassa.filter(Boolean).length - 5) * 0.4 // pulito: pochi colpi, ognuno pesa
    for (const i of anc) if (p.cassa[i]) f -= 1 // cassa e rullante non si pestano
    if (p.cassa.filter(Boolean).length < 2) f -= 1
    for (const m of memoria.slice(-12)) { const ug = m.cassa.filter((x, i) => !!x === !!p.cassa[i]).length / 16; if (ug > 0.9) f -= 0.8 } // novità
    return f
  }
  let pop = Array.from({ length: 40 }, nuovo)
  for (let gen = 0; gen < 60; gen++) {
    pop.sort((a, b) => fit(b) - fit(a))
    const elite = pop.slice(0, 10)
    pop = [...elite]
    while (pop.length < 40) {
      const a = elite[Math.floor(r() * elite.length)], b = elite[Math.floor(r() * elite.length)], cut = Math.floor(r() * 16)
      const x: Pattern = { cassa: [...a.cassa.slice(0, cut), ...b.cassa.slice(cut)], rullante: [...a.rullante], hat: [...b.hat.slice(0, cut), ...a.hat.slice(cut)], perc: r() < 0.5 ? [...a.perc] : [...b.perc] }
      pop.push(r() < 0.8 ? muta(x) : x)
    }
  }
  pop.sort((a, b) => fit(b) - fit(a))
  return pop[0]
}

// ── il brano ──
export interface Brano {
  stile: Stile; descr: string; bpm: number; beat: number; battute: number; durata: number
  /** in secondi: i colpi veri, per il montaggio */
  cassa: number[]; rullante: number[]; hat: number[]; battere: number[]; cambio: number
  energia: (t: number) => number
  pattern: Pattern
}
const SCALE: Record<string, number[]> = { minore: [0, 2, 3, 5, 7, 8, 10], dorico: [0, 2, 3, 5, 7, 9, 10], frigio: [0, 1, 3, 5, 7, 8, 10], maggiore: [0, 2, 4, 5, 7, 9, 11], misolidio: [0, 2, 4, 5, 7, 9, 10] }
const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12)

/**
 * Scrive e suona un beat per un reel: `parola` dà il motivo (sempre lo stesso per la stessa parola),
 * `secondi` la lunghezza cercata (si arrotonda a battute intere, per poterlo ripetere senza cuciture).
 */
export async function suonaBeat(st: Stile, o: { seme: number; parola: string; secondi: number; memoria?: Pattern[]; sampleRate?: number }): Promise<{ audio: AudioBuffer; brano: Brano }> {
  const r = rng(o.seme)
  const SR = o.sampleRate ?? 44100
  const beat = 60 / st.bpm, bar = beat * 4, s16 = beat / 4
  // battute: multiple di 4, almeno 8; il cambio cade a metà
  const battute = Math.max(8, Math.round(o.secondi / bar / 4) * 4)
  const durata = battute * bar
  const cambio = Math.floor(battute / 2) * bar
  const pA = evolviPattern(st, r, o.memoria)
  const stB: Stile = { ...st, densita: lim(st.densita + (st.sottrai > 0.5 ? -0.15 : 0.08)), sincope: lim(st.sincope + (r() < 0.5 ? 0.15 : -0.15)) }
  const pB = evolviPattern(stB, r, [...(o.memoria ?? []), pA])
  // armonia: modo dal "scuro", quattro accordi, voci vicine
  const modo = st.scuro > 0.75 ? 'frigio' : st.scuro > 0.45 ? 'minore' : st.scuro > 0.2 ? 'dorico' : r() < 0.5 ? 'maggiore' : 'misolidio'
  const sc = SCALA_DI(modo)
  const radice = 33 + Math.floor(r() * 10) // la del basso
  const PROG = [[0, 5, 3, 4], [0, 3, 5, 4], [0, 6, 5, 3], [0, 0, 5, 4], [0, 2, 5, 6], [0, 4, 5, 3]]
  const prog = PROG[Math.floor(r() * PROG.length)]
  const ext = st.colore > 0.66 ? [0, 2, 4, 6, 8] : st.colore > 0.33 ? [0, 2, 4, 6] : [0, 2, 4]
  const nota = (g: number, ott = 0) => { const n = sc.length, o_ = Math.floor(g / n); return radice + 12 * (ott + o_) + sc[((g % n) + n) % n] }
  // motivo: dalla parola, 2 battute, si ripete (gli agganci vivono di ripetizione)
  let h = 17; for (const c of o.parola) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const motivo = Array.from({ length: 8 }, (_, i) => ({ step: [0, 3, 6, 8, 10, 14, 19, 22][i] + ((h >> i) & 1), grado: ((h >> (i * 3)) & 7) % 7, on: ((h >> (i + 11)) & 3) !== 0 }))

  const ctx = new OfflineAudioContext(2, Math.ceil((durata + 0.05) * SR), SR)
  // catena: bus → nastro (saturazione) → lowpass "polvere" → compressore → limitatore
  const bus = ctx.createGain(); bus.gain.value = 0.32
  const sat = ctx.createWaveShaper(); sat.curve = curva(0.5 + st.durezza * 2.5); sat.oversample = '2x'
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 16000 - st.polvere * 9000; lp.Q.value = 0.5
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.15
  const limit = ctx.createDynamicsCompressor(); limit.threshold.value = -2; limit.ratio.value = 20; limit.attack.value = 0.002; limit.release.value = 0.05
  bus.connect(sat).connect(lp).connect(comp).connect(limit).connect(ctx.destination)
  const rev = ctx.createConvolver(); rev.buffer = stanza(ctx, 1.4 + st.polvere, r)
  const revG = ctx.createGain(); revG.gain.value = 0.08 + st.polvere * 0.06; rev.connect(revG).connect(bus)
  // sidechain: gli accordi e il campione scendono sotto la cassa
  const duck = ctx.createGain(); duck.connect(bus); duck.connect(rev)
  const NB = rumore(ctx, r)

  const cassaT: number[] = [], rullT: number[] = [], hatT: number[] = [], battT: number[] = []
  const tempo = (b: number, i: number, quale: 'c' | 'r' | 'h' | 'x') => {
    let t = b * bar + i * s16 + (i % 2 ? st.swing * s16 : 0)
    if (quale === 'r') t += st.ritardoRullante
    if (quale === 'h') t += st.anticipoHat
    return Math.max(0, t)
  }

  // ── strumenti ──
  const kick = (t: number, v: number) => {
    const o1 = ctx.createOscillator(), g1 = ctx.createGain()
    o1.frequency.setValueAtTime(150 + st.durezza * 60, t); o1.frequency.exponentialRampToValueAtTime(48, t + 0.08)
    g1.gain.setValueAtTime(v, t); g1.gain.exponentialRampToValueAtTime(0.001, t + 0.35 + (1 - st.sub) * 0.1)
    o1.connect(g1).connect(bus); o1.start(t); o1.stop(t + 0.5)
    const cl = ctx.createBufferSource(); cl.buffer = NB; const cf = ctx.createBiquadFilter(); cf.type = 'highpass'; cf.frequency.value = 3000; const cg = ctx.createGain()
    cg.gain.setValueAtTime(0.25 * v * (0.5 + st.durezza), t); cg.gain.exponentialRampToValueAtTime(0.001, t + 0.012)
    cl.connect(cf).connect(cg).connect(bus); cl.start(t, r() * 0.5); cl.stop(t + 0.02)
    duck.gain.setValueAtTime(1, t); duck.gain.linearRampToValueAtTime(0.35, t + 0.01); duck.gain.linearRampToValueAtTime(1, t + beat * 0.6)
  }
  const snare = (t: number, v: number) => {
    const o1 = ctx.createOscillator(); o1.type = 'triangle'; const g1 = ctx.createGain()
    o1.frequency.setValueAtTime(220, t); o1.frequency.exponentialRampToValueAtTime(170, t + 0.05)
    g1.gain.setValueAtTime(0.75 * v, t); g1.gain.exponentialRampToValueAtTime(0.001, t + 0.14)
    o1.connect(g1).connect(bus); o1.start(t); o1.stop(t + 0.15)
    const n = ctx.createBufferSource(); n.buffer = NB; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2200 + st.durezza * 2500; bp.Q.value = 0.7
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0.7 * v, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.16 + st.polvere * 0.08)
    n.connect(bp).connect(ng); ng.connect(bus); ng.connect(rev); n.start(t, r() * 0.5); n.stop(t + 0.3)
    // clap a strati: tre colpi ravvicinati
    if (st.meta || st.durezza > 0.5) for (let k = 0; k < 3; k++) {
      const c = ctx.createBufferSource(); c.buffer = NB; const cb = ctx.createBiquadFilter(); cb.type = 'bandpass'; cb.frequency.value = 1400; cb.Q.value = 1.2
      const cg = ctx.createGain(), tt = t + k * 0.011; cg.gain.setValueAtTime(0.45 * v, tt); cg.gain.exponentialRampToValueAtTime(0.001, tt + (k === 2 ? 0.14 : 0.02))
      c.connect(cb).connect(cg); cg.connect(bus); cg.connect(rev); c.start(tt, r() * 0.5); c.stop(tt + 0.2)
    }
  }
  // charleston alla TR-808: sei onde quadre a rapporti non armonici, filtrate
  const RAP = [2, 3, 4.16, 5.43, 6.79, 8.21]
  const hat = (t: number, v: number, aperto = false) => {
    const g1 = ctx.createGain(), hp = ctx.createBiquadFilter(), bp = ctx.createBiquadFilter()
    hp.type = 'highpass'; hp.frequency.value = 7000; bp.type = 'bandpass'; bp.frequency.value = 10000 - st.polvere * 2500; bp.Q.value = 0.6
    const d = aperto ? 0.28 : 0.035 + st.polvere * 0.02
    g1.gain.setValueAtTime(0.0001, t); g1.gain.linearRampToValueAtTime(0.09 * v, t + 0.001); g1.gain.exponentialRampToValueAtTime(0.0001, t + d)
    g1.connect(bp).connect(hp).connect(bus)
    for (const k of RAP) { const o1 = ctx.createOscillator(); o1.type = 'square'; o1.frequency.value = 40 * k; o1.connect(g1); o1.start(t); o1.stop(t + d + 0.02) }
  }
  const perc = (t: number, v: number) => { // rim o campanaccio
    if (st.campanaccio > 0.5) return
    const o1 = ctx.createOscillator(); o1.type = 'square'; o1.frequency.value = 1700; const g1 = ctx.createGain(); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 4
    g1.gain.setValueAtTime(0.12 * v, t); g1.gain.exponentialRampToValueAtTime(0.001, t + 0.03); o1.connect(bp).connect(g1).connect(bus); o1.start(t); o1.stop(t + 0.05)
  }
  // il basso: 808 lungo che scivola, o basso corto che segue la cassa
  let ultimaBasso: OscillatorNode | null = null
  const basso = (t: number, m: number, dur: number, v: number) => {
    const o1 = ctx.createOscillator(); o1.type = 'sine'; const g1 = ctx.createGain(); const ds = ctx.createWaveShaper(); ds.curve = curva(0.8 + st.durezza * 3)
    if (ultimaBasso && st.glide > 0.5 && r() < st.glide) { ultimaBasso.frequency.setTargetAtTime(hz(m), t, 0.03) }
    o1.frequency.setValueAtTime(hz(m), t)
    const lungo = dur * (0.4 + st.sub * 0.6)
    g1.gain.setValueAtTime(0.0001, t); g1.gain.linearRampToValueAtTime(0.55 * v, t + 0.005); g1.gain.setTargetAtTime(0.0001, t + lungo * 0.7, lungo * 0.25)
    o1.connect(ds).connect(g1).connect(bus); o1.start(t); o1.stop(t + lungo + 0.3)
    ultimaBasso = o1
  }
  // piano elettrico FM (portante e modulante 1:1, indice che decade): per gli accordi e il campione
  const ep = (dest: AudioNode, t: number, m: number, dur: number, v: number) => {
    const c = ctx.createOscillator(), mo = ctx.createOscillator(), mg = ctx.createGain(), g1 = ctx.createGain()
    c.frequency.value = hz(m); mo.frequency.value = hz(m) * (st.colore > 0.5 ? 1 : 2)
    mg.gain.setValueAtTime(hz(m) * 2.2, t); mg.gain.exponentialRampToValueAtTime(hz(m) * 0.2, t + 0.4)
    g1.gain.setValueAtTime(0.0001, t); g1.gain.linearRampToValueAtTime(0.09 * v, t + 0.006); g1.gain.setTargetAtTime(0.0001, t + dur * 0.6, dur * 0.3)
    mo.connect(mg).connect(c.frequency); c.connect(g1).connect(dest)
    c.start(t); mo.start(t); c.stop(t + dur + 0.5); mo.stop(t + dur + 0.5)
  }
  const campanaccio = (t: number, m: number, v: number) => {
    for (const k of [1, 1.48]) { const o1 = ctx.createOscillator(); o1.type = 'square'; o1.frequency.value = hz(m + 24) * k; const g1 = ctx.createGain(); const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = hz(m + 24) * 1.2; bp.Q.value = 3; g1.gain.setValueAtTime(0.12 * v, t); g1.gain.exponentialRampToValueAtTime(0.001, t + 0.18); o1.connect(bp).connect(g1); g1.connect(bus); g1.connect(rev); o1.start(t); o1.stop(t + 0.2) }
  }

  // ── il campione: gli accordi suonati e registrati, poi tagliati e rimontati ──
  const campione = await (async () => {
    const c2 = new OfflineAudioContext(2, Math.ceil((beat * 16 + 1) * SR), SR)
    const out = c2.createGain(); out.gain.value = 1
    const wob = c2.createDelay(0.05); wob.delayTime.value = 0.01
    const lfo = c2.createOscillator(); lfo.frequency.value = 0.4 + st.polvere; const lg = c2.createGain(); lg.gain.value = 0.002 * st.polvere; lfo.connect(lg).connect(wob.delayTime); lfo.start()
    out.connect(wob).connect(c2.destination)
    const epc = (t: number, m: number, d: number, v: number) => {
      const c = c2.createOscillator(), mo = c2.createOscillator(), mg = c2.createGain(), g1 = c2.createGain()
      c.frequency.value = hz(m); mo.frequency.value = hz(m) * (st.colore > 0.5 ? 1 : 2)
      mg.gain.setValueAtTime(hz(m) * 2.4, t); mg.gain.exponentialRampToValueAtTime(hz(m) * 0.25, t + 0.5)
      g1.gain.setValueAtTime(0.0001, t); g1.gain.linearRampToValueAtTime(0.08 * v, t + 0.008); g1.gain.setTargetAtTime(0.0001, t + d * 0.7, d * 0.3)
      mo.connect(mg).connect(c.frequency); c.connect(g1).connect(out); c.start(t); mo.start(t); c.stop(t + d + 0.5); mo.stop(t + d + 0.5)
    }
    // sedici fette lunghe un battito: ognuna parte con il suo attacco (l'accordo della battuta, in un rivolto diverso)
    for (let k = 0; k < 16; k++) { const t = k * beat, g = prog[Math.floor(k / 4) % 4], inv = k % 4; ext.forEach((e, j) => epc(t, nota(g + e + (j < inv ? 7 : 0), 2), beat * 0.98, k % 4 ? 0.8 : 1)) }
    return c2.startRendering()
  })()
  const fette = 16, lungFetta = beat
  const ordineFette = Array.from({ length: 16 }, (_, i) => r() < st.taglio ? Math.floor(r() * fette) : i)
  const tonoFette = Array.from({ length: 16 }, () => r() < st.taglio * 0.3 ? (r() < 0.5 ? -5 : 7) : 0)
  const fetta = (t: number, i: number, dur0: number, v: number) => {
    const dur = Math.min(dur0, lungFetta)
    const s = ctx.createBufferSource(); s.buffer = campione; s.playbackRate.value = Math.pow(2, tonoFette[i % 16] / 12)
    const g1 = ctx.createGain(); v *= 0.6; g1.gain.setValueAtTime(0.0001, t); g1.gain.linearRampToValueAtTime(v, t + 0.004); g1.gain.setValueAtTime(v, t + dur - 0.01); g1.gain.linearRampToValueAtTime(0.0001, t + dur)
    s.connect(g1).connect(duck); s.start(t, ordineFette[i % 16] * lungFetta, dur + 0.02)
  }

  // ── le voci: cassa e rullante sempre; le altre poche, scelte a caso fra quelle possibili (pulito = poche cose che pesano)
  const opz = ['basso', 'armonia', 'hat', 'motivo', 'perc'].sort(() => r() - 0.5)
  const nVoci = Math.max(1, Math.round(st.voci * 4))
  const voci = new Set(opz.slice(0, nVoci))
  if (!voci.has('basso') && st.sub > 0.6) voci.add('basso')
  // nella seconda metà si toglie una voce (si svuota) o se ne aggiunge una (si apre)
  const vociB = new Set(voci)
  if (st.sottrai > 0.5) { const via = [...voci].filter(v => v !== 'basso')[0]; if (via) vociB.delete(via) } else { const add = opz.find(v => !voci.has(v)); if (add) vociB.add(add) }
  // le fette del campione: pochi colpi per battuta, lunghi fino al colpo dopo
  const colpiFetta = [...new Set([0, ...Array.from({ length: 1 + Math.floor(r() * 3) }, () => Math.floor(r() * 8) * 2)])].sort((a, b) => a - b)
  // ── il montaggio del brano: aggancio subito, cambio a metà, l'ultima battuta prepara il ritorno all'inizio ──
  for (let b = 0; b < battute; b++) {
    const t0 = b * bar, seconda = t0 >= cambio
    const P = seconda ? pB : pA
    const V = seconda ? vociB : voci
    battT.push(t0)
    const fill = b % 4 === 3
    const ultima = b === battute - 1
    for (let i = 0; i < 16; i++) {
      if (P.cassa[i] && !(ultima && i >= 12)) { const t = tempo(b, i, 'c'); kick(t, 1); cassaT.push(t) }
      if (P.rullante[i]) { const t = tempo(b, i, 'r'); snare(t, P.rullante[i]); if (P.rullante[i] > 0.5) rullT.push(t) }
      if (P.hat[i] && V.has('hat')) {
        const t = tempo(b, i, 'h')
        if (fill && i >= 12 && r() < st.rulli) { for (let k = 0; k < 2; k++) hat(t + (k * s16) / 2, 0.5 + k * 0.2) } // rullata
        else hat(t, P.hat[i], seconda && i === 14 && r() < 0.3)
        hatT.push(t)
      }
      if (P.perc[i] && V.has('perc')) perc(tempo(b, i, 'x'), P.perc[i])
    }
    if (fill && !st.meta && r() < st.rulli) { const t = tempo(b, 15, 'r'); snare(t, 0.3) }
    // basso sui colpi di cassa, sul grado dell'accordo
    const g = prog[b % 4]
    const colpiC = P.cassa.map((x, i) => x ? i : -1).filter(i => i >= 0)
    if (V.has('basso')) colpiC.forEach((i, k) => { const fine = colpiC[k + 1] ?? 16; basso(tempo(b, i, 'c'), nota(g, 0) + (st.glide > 0.5 && k === colpiC.length - 1 && r() < 0.5 ? 12 : 0), (fine - i) * s16, 1) })
    // armonia: campione tagliato o accordi suonati (nella seconda metà si apre)
    if (!V.has('armonia')) { /* niente armonia: restano batteria e basso */ }
    else if (st.taglio > 0.25) colpiFetta.forEach((i, k) => fetta(t0 + i * s16, ((b % 4) * 4 + k + (seconda ? 2 : 0)) % 16, ((colpiFetta[k + 1] ?? 16) - i) * s16, 0.9))
    else { ext.forEach((e, j) => ep(duck, t0, nota(g + e, 2), bar * 0.9, 1)); if (seconda) ep(duck, t0 + beat * 2.5, nota(g + 4, 3), beat, 0.7) }
    // il motivo: entra subito (aggancio) e torna ogni due battute
    if (V.has('motivo') && b % 2 === 0) for (const m of motivo) if (m.on) {
      const t = tempo(b + (m.step >= 16 ? 1 : 0), m.step % 16, 'x')
      if (t >= durata) continue
      if (st.campanaccio > 0.5) campanaccio(t, nota(g + m.grado, 1), 1)
      else ep(duck, t, nota(m.grado, 3), s16 * 3, 0.9)
    }
  }
  // nastro: un fruscio leggero
  if (st.polvere > 0.3) {
    const len = Math.ceil(durata * SR), vb = ctx.createBuffer(1, len, SR), d = vb.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (r() - 0.5) * 0.004 * st.polvere // solo fruscio: i crepitii a caso si sentono come colpi fuori tempo
    const s = ctx.createBufferSource(); s.buffer = vb; s.connect(bus); s.start(0)
  }
  const audio = await ctx.startRendering()
  // volume uguale per tutti i brani: si porta l'energia media a un livello fisso e si arrotondano i picchi
  {
    let e = 0, n = 0
    for (let c = 0; c < audio.numberOfChannels; c++) { const d = audio.getChannelData(c); for (let i = 0; i < d.length; i += 4) { e += d[i] * d[i]; n++ } }
    const k = 0.22 / Math.max(1e-4, Math.sqrt(e / n))
    for (let c = 0; c < audio.numberOfChannels; c++) { const d = audio.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = Math.tanh(d[i] * k * 1.1) / Math.tanh(1.1) * 0.95 }
  }
  const descr = descrivi(st)
  const energia = (t: number) => (t < cambio ? 0.65 : 1) * (t > durata - bar ? 0.85 : 1)
  return { audio, brano: { stile: st, descr, bpm: st.bpm, beat, battute, durata, cassa: cassaT, rullante: rullT, hat: hatT, battere: battT, cambio, energia, pattern: pA } }
}

function SCALA_DI(m: string) { return SCALE[m] ?? SCALE.minore }
function curva(k: number) { const n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i / n) * 2 - 1; c[i] = ((1 + k) * x) / (1 + k * Math.abs(x)) } return c }
function rumore(ctx: BaseAudioContext, r: () => number) { const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1; return b }
function stanza(ctx: BaseAudioContext, sec: number, r: () => number) { const len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, len, ctx.sampleRate); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / len, 4) } return b }

/** la popolazione degli stili: sceglie con cui suonare oggi (bandito UCB) e ogni tanto ne fa nascere uno nuovo */
export interface Gusto { stili: Stile[]; pattern: Pattern[] }
export function scegliStile(g: Gusto, r: () => number, giorno: number): Stile {
  if (g.stili.length < 6) { const s = g.stili.length >= 2 && r() < 0.5 ? figlio(g.stili[Math.floor(r() * g.stili.length)], g.stili[Math.floor(r() * g.stili.length)], r, giorno) : stileACaso(r, giorno); g.stili.push(s); return s }
  const N = g.stili.reduce((a, s) => a + (s.usi ?? 0), 0) + 1
  const ucb = (s: Stile) => (s.usi ? (s.punteggio ?? 0) / s.usi : 0.5) + Math.sqrt((2 * Math.log(N)) / ((s.usi ?? 0) + 1))
  // ogni tanto un figlio dei due migliori: lo stile si evolve
  if (r() < 0.3) {
    const best = [...g.stili].sort((a, b) => ucb(b) - ucb(a))
    const s = figlio(best[0], best[1], r, giorno)
    g.stili.push(s)
    if (g.stili.length > 16) g.stili.splice(g.stili.indexOf([...g.stili].sort((a, b) => ((a.punteggio ?? 0) / Math.max(1, a.usi ?? 0)) - ((b.punteggio ?? 0) / Math.max(1, b.usi ?? 0)))[0]), 1)
    return s
  }
  return [...g.stili].sort((a, b) => ucb(b) - ucb(a))[0]
}
export function premiaStile(g: Gusto, id: string, esito: number) { const s = g.stili.find(x => x.id === id); if (s) { s.usi = (s.usi ?? 0) + 1; s.punteggio = (s.punteggio ?? 0) + esito } }
