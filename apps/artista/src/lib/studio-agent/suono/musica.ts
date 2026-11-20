/**
 * La musica: un brano per ogni sequenza, composto e suonato da lui, senza campioni né IA.
 *
 * COMPOSIZIONE (dati puri): il genere viene dal linguaggio visivo (risografia → lo-fi,
 * costruttivismo → techno industriale, acido → acid house, glitch → glitch/IDM, organico →
 * downtempo, svizzero → minimal house, poesia dei dati → synthwave, collage → breakbeat,
 * minimalismo/concettuale → ambient minimale, altri → pop). La tonalità e il modo vengono dal
 * tono (scuro → minore/frigio, chiaro → maggiore/lidio). L'arrangiamento segue la FORMA della
 * sequenza (crescendo: gli strumenti entrano uno alla volta; a ritroso: si parte dal pieno;
 * frammenti: sezioni rimescolate e balbettii; contrappunto: pieno/vuoto alternati; dialogo:
 * domanda e risposta tra due voci). Ogni concetto ha un suo MOTIVO (un leitmotiv: quattro note
 * ricavate dalla parola) che suona quando il suo segno è in scena. Quanto crede alla conclusione
 * decide la cadenza finale: risolta se ci crede, sospesa se dubita. Le follie hanno il loro
 * equivalente (scala → caduta di tono e filtro, ossessione → balbettio, assenza → silenzio
 * con coda di riverbero, inversione → nastro al contrario).
 *
 * SINTESI: Web Audio offline. Cassa, rullante, clap e charleston sintetizzati; basso con filtro
 * risonante; accordi di seghe stonate; arpeggi e melodie; riverbero a convoluzione, eco,
 * saturazione, compressione e "pompaggio" sulla cassa.
 */
export type Genere = 'lofi' | 'techno' | 'acid' | 'glitch' | 'downtempo' | 'minimalhouse' | 'synthwave' | 'breakbeat' | 'ambient' | 'pop' | 'rock' | 'hiphop' | 'jazz' | 'funk' | 'hardtechno' | 'dnb'
export interface Sezione { rel?: string; strumenti: string[]; motivo?: string; follia?: string; ultimo?: boolean; energia?: number; battute?: number }
export interface Partitura {
  genere: Genere; bpm: number; swing: number; radice: number; scala: number[]; accordi: number[][]
  battute: number; sezioni: Sezione[]; motivi: Record<string, number[]>; risolve: boolean; seme: number
  /** il groove che si è scritto: dove cade la cassa nei 16 passi (se manca, quello del genere) */
  groove?: number[]; grooveCodice?: string
}

const SCALE: Record<string, number[]> = {
  minore: [0, 2, 3, 5, 7, 8, 10], dorico: [0, 2, 3, 5, 7, 9, 10], frigio: [0, 1, 3, 5, 7, 8, 10],
  maggiore: [0, 2, 4, 5, 7, 9, 11], lidio: [0, 2, 4, 6, 7, 9, 11], misolidio: [0, 2, 4, 5, 7, 9, 10],
}
// per ogni linguaggio, i generi possibili dal più calmo al più duro: sceglie l'energia della sequenza
const GENERI_LING: Record<string, Genere[]> = {
  riso: ['lofi', 'jazz', 'hiphop'], costruttivista: ['techno', 'rock', 'hardtechno'], acido: ['acid', 'hardtechno'], glitch: ['glitch', 'dnb'],
  organico: ['downtempo', 'jazz', 'funk'], svizzero: ['minimalhouse', 'funk'], datapoesia: ['synthwave', 'funk', 'techno'], collage: ['hiphop', 'breakbeat', 'funk'],
  minimo: ['ambient', 'jazz'], concettuale: ['ambient', 'jazz', 'hiphop'], brutalista: ['rock', 'hardtechno'], ornamento: ['ambient', 'jazz', 'downtempo'],
}
const BPM: Record<Genere, [number, number]> = {
  lofi: [76, 90], techno: [128, 136], acid: [122, 128], glitch: [100, 140], downtempo: [88, 100], minimalhouse: [120, 124],
  synthwave: [96, 108], breakbeat: [168, 174], ambient: [70, 84], pop: [96, 112],
  rock: [118, 150], hiphop: [84, 96], jazz: [118, 168], funk: [98, 112], hardtechno: [145, 156], dnb: [172, 176],
}
// gli strumenti che entrano, in ordine, per ogni genere
const ORDINE: Record<Genere, string[]> = {
  lofi: ['pad', 'cassa', 'rullante', 'hat', 'basso', 'melodia', 'vinile'], techno: ['cassa', 'hat', 'basso', 'clap', 'stab', 'rumore'],
  acid: ['cassa', 'hat', 'acid', 'clap', 'pad'], glitch: ['glitch', 'cassa', 'basso', 'melodia', 'hat'], downtempo: ['pad', 'arpeggio', 'cassa', 'basso', 'rullante', 'melodia'],
  minimalhouse: ['cassa', 'hat', 'basso', 'stab', 'clap', 'arpeggio'], synthwave: ['pad', 'arpeggio', 'cassa', 'rullante', 'basso', 'melodia'],
  breakbeat: ['break', 'basso', 'pad', 'melodia', 'hat'], ambient: ['pad', 'melodia', 'arpeggio', 'rumore'], pop: ['pad', 'cassa', 'clap', 'basso', 'hat', 'melodia', 'arpeggio'],
  rock: ['chitarra', 'cassa', 'rullante', 'hat', 'basso', 'crash', 'melodia'],
  hiphop: ['keys', 'cassa', 'rullante', 'hat', '808', 'vinile', 'melodia'],
  jazz: ['ride', 'walking', 'piano', 'spazzole', 'melodia'],
  funk: ['cassa', 'rullante', 'hat', 'slap', 'clav', 'fiati', 'ghost'],
  hardtechno: ['cassa', 'rombo', 'hat', 'clap', 'acid', 'rumore'],
  dnb: ['break', 'reese', 'hat', 'pad', 'melodia'],
}
const SWING: Partial<Record<Genere, number>> = { lofi: 0.18, downtempo: 0.1, hiphop: 0.22, jazz: 0.33, funk: 0.08 }
const QUATTRO = new Set<Genere>(['techno', 'acid', 'minimalhouse', 'synthwave', 'pop', 'downtempo', 'hardtechno'])

/**
 * I colpi della batteria a ogni sedicesimo: un'unica fonte, usata dal brano (per suonare)
 * e dal montaggio del reel (per tagliare e far pulsare a tempo). Solo parti fisse, niente caso.
 */
/** ritmo euclideo: k colpi distribuiti il più possibile uniformi su n passi, ruotati di rot (Toussaint) */
export function euclide(k: number, n = 16, rot = 0): number[] {
  const out: number[] = []
  for (let i = 0; i < n; i++) if (Math.floor(((i + rot) * k) / n) !== Math.floor(((i + rot - 1) * k) / n)) out.push(i)
  return out
}
export function colpi(p: Partitura, S: Sezione, st: number) {
  const g = p.genere, s16 = st % 16, bar = Math.floor(st / 16)
  const has = (x: string) => S.strumenti.includes(x)
  const four = QUATTRO.has(g)
  const c = { cassa: 0, rullante: 0, ghost: 0, hat: 0, aperto: false, crash: false, ride: 0 }
  const kick: Partial<Record<Genere, number[]>> = { rock: [0, 8, 10], hiphop: [0, 7, 10], funk: [0, 3, 10, 14], lofi: [0, 7, 10], glitch: [0, 10], ambient: [0, 10], breakbeat: [0, 10], dnb: [0, 10] }
  if (has('cassa')) { if (four ? s16 % 4 === 0 : (p.groove ?? kick[g] ?? [0, 10]).includes(s16)) c.cassa = 1 }
  if (has('break') && (s16 === 0 || s16 === 10)) c.cassa = 0.9
  if ((has('rullante') || has('clap') || has('break')) && (s16 === 4 || s16 === 12)) c.rullante = 1
  if (has('spazzole') && (s16 === 4 || s16 === 12)) c.rullante = 0.35
  if ((has('ghost') || (has('break') && g === 'dnb')) && (s16 === 7 || s16 === 9 || s16 === 15)) c.ghost = 0.25
  if (has('hat')) {
    if (four && s16 % 4 === 2) { c.hat = 1; c.aperto = true }
    else if (g === 'funk' || g === 'hardtechno' || g === 'dnb') c.hat = s16 % 2 ? 0.6 : 1
    else if (s16 % 2 === 0) c.hat = 1
  }
  if (has('break') && s16 % 2 === 0) c.hat = Math.max(c.hat, 0.8)
  if (has('crash') && s16 === 0 && bar % 2 === 0) c.crash = true
  if (has('ride') && [0, 4, 6, 8, 12, 14].includes(s16)) c.ride = s16 % 4 === 0 ? 1 : 0.6
  return c
}

function rng(seed: number) { let a = seed >>> 0 || 1; return () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296) }
const hash = (w: string) => [...w].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 17)

export interface SpecMusica { linguaggio: string; forma: string; scuro: boolean; conf: number; mood: string; schede: { concetto?: string; follia?: string; parole?: number; rel?: string }[]; seme: number }

/** compone il brano: tutto deciso da linguaggio, forma, tono, fiducia, concetti e follie */
export function componi(s: SpecMusica): Partitura {
  const r = rng(s.seme)
  // l'energia della sequenza: dall'umore, dalla forma e da quanto è sicuro di sé
  const energia = Math.max(0, Math.min(1, 0.35 + ({ inquieto: 0.3, giocoso: 0.2, curioso: 0.1, annoiato: 0, calmo: -0.2, cupo: -0.1 }[s.mood] ?? 0) + (s.forma === 'manifesto' || s.forma === 'crescendo' ? 0.2 : s.forma === 'frammenti' ? 0.1 : 0) + (s.scuro ? 0.1 : 0) + (r() - 0.5) * 0.3))
  const cand = [...new Set(s.linguaggio.split('×').flatMap(x => GENERI_LING[x] ?? []))]
  const genere: Genere = cand.length ? cand[Math.min(cand.length - 1, Math.floor(energia * cand.length))] : 'pop'
  const [b0, b1] = BPM[genere]
  const bpm = Math.round(b0 + (b1 - b0) * (s.mood === 'inquieto' || s.mood === 'giocoso' ? 0.9 : s.mood === 'cupo' || s.mood === 'calmo' ? 0.15 : r()))
  const modo = genere === 'jazz' || genere === 'funk' ? 'dorico' : genere === 'rock' ? (s.scuro ? 'minore' : 'misolidio') : s.scuro ? (genere === 'techno' || genere === 'acid' || genere === 'hardtechno' ? 'frigio' : r() < 0.6 ? 'minore' : 'dorico') : (genere === 'synthwave' || genere === 'ambient' ? 'lidio' : r() < 0.7 ? 'maggiore' : 'misolidio')
  const radice = 36 + Math.floor(r() * 12) // nota MIDI del basso
  const scala = SCALE[modo]
  // progressioni (gradi della scala, 0-based)
  const PROG: number[][][] = s.scuro ? [[[0], [5], [2], [6]], [[0], [3], [4], [0]], [[0], [6], [5], [6]], [[0], [0], [5], [4]]] : [[[0], [4], [5], [3]], [[0], [5], [3], [4]], [[3], [4], [0], [0]], [[0], [3], [0], [4]]]
  const prog = genere === 'techno' || genere === 'acid' || genere === 'ambient' || genere === 'hardtechno' ? [[0], [0], [0], [genere === 'ambient' ? 5 : 0]] : PROG[Math.floor(r() * PROG.length)]
  const accordi = prog.map(([g]) => [g, g + 2, g + 4, ...(genere === 'lofi' || genere === 'downtempo' || genere === 'jazz' || genere === 'hiphop' || genere === 'funk' ? [g + 6] : [])])
  // leitmotiv: quattro note e un ritmo per ogni concetto, sempre uguali per quella parola
  const motivi: Record<string, number[]> = {}
  for (const sc of s.schede) if (sc.concetto && !motivi[sc.concetto]) { const h = hash(sc.concetto); motivi[sc.concetto] = [0, 1, 2, 3].map(i => ((h >> (i * 4)) & 15) % 9) }
  // arrangiamento secondo la forma
  const ord = ORDINE[genere]
  const N = s.schede.length
  const pieno = (k: number) => new Set(ord.slice(0, Math.max(1, k)))
  let sezioni: Sezione[] = s.schede.map((sc, i) => {
    let k: number
    switch (s.forma) {
      case 'crescendo': k = 1 + Math.round((i / Math.max(1, N - 1)) * (ord.length - 1)); break
      case 'a ritroso': k = ord.length - Math.round((i / Math.max(1, N - 1)) * (ord.length - 2)); break
      case 'contrappunto': k = i % 2 ? ord.length : 2; break
      case 'manifesto': k = ord.length; break
      case 'catalogo': k = 2 + (i % (ord.length - 1)); break
      default: k = i === 0 ? 2 : i < 2 ? Math.ceil(ord.length / 2) : i === N - 1 ? 3 : ord.length
    }
    const set = pieno(k)
    if (s.forma === 'dialogo') { if (i % 2) set.delete('melodia'); else set.add('melodia') }
    if (sc.concetto) set.add('motivo')
    const secBattuta = (4 * 60) / bpm, serve = 2.5 + (sc.parole ?? 0) / 2.6
    const bt = Math.min(12, Math.max(4, Math.ceil(serve / secBattuta / 2) * 2))
    return { rel: sc.rel, battute: bt, strumenti: [...set], motivo: sc.concetto, follia: sc.follia, energia: Math.min(1, (k / ord.length) * (0.6 + energia * 0.6)) }
  })
  // la stessa relazione che la tavola dice con le parole e con l'impaginazione, la musica la dice così:
  // contrasto → si toglie la batteria per una battuta e l'armonia scarta; identità/dentro → riprende gli strumenti della sezione prima
  sezioni = sezioni.map((x, i) => x.rel === 'identita' || x.rel === 'dentro' ? { ...x, strumenti: [...new Set([...(sezioni[i - 1]?.strumenti ?? x.strumenti), 'motivo'])] } : x)
  if (s.forma === 'frammenti') sezioni = sezioni.map(x => ({ ...x, follia: x.follia ?? (r() < 0.35 ? 'ossessione' : undefined) }))
  if (sezioni.length) sezioni[sezioni.length - 1].ultimo = true
  // il groove: per i generi spezzati se lo scrive da sé, come un piccolo programma: euclide(k, 16, rotazione),
  // con k e rotazione presi dalla parola della sequenza; tiene sempre il primo battere
  let groove: number[] | undefined, grooveCodice: string | undefined
  if (!QUATTRO.has(genere)) {
    const w = s.schede.find(x => x.concetto)?.concetto ?? s.forma
    const h = hash(w), k = 3 + (h % 3) + (energia > 0.6 ? 1 : 0), rot = (h >>> 4) % 16
    groove = [...new Set([0, ...euclide(k, 16, rot)])].sort((a, b) => a - b).filter(x => x !== 4 && x !== 12)
    grooveCodice = `euclide(${k}, 16, ${rot}) ∪ {0}`
  }
  return { groove, grooveCodice, genere, bpm, swing: SWING[genere] ?? 0, radice, scala, accordi, battute: 4, sezioni, motivi, risolve: s.conf >= 0.4, seme: s.seme }
}

/** quanto dura una sezione (una tavola) in secondi */
export const durata = (p: Partitura, i?: number) => (((i !== undefined ? p.sezioni[i]?.battute : undefined) ?? p.battute) * 4 * 60) / p.bpm

// ─── sintesi ────────────────────────────────────────────────────────────────
const f = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12)

function impulso(ctx: BaseAudioContext, sec: number, decad: number) {
  const len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decad) }
  return b
}
function curvaSaturazione(k: number) { const n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i / n) * 2 - 1; c[i] = ((1 + k) * x) / (1 + k * Math.abs(x)) } return c }
function rumoreBuffer(ctx: BaseAudioContext) { const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b }

/** suona una sezione (una tavola) della partitura; restituisce l'audio stereo */
export async function suona(p: Partitura, i: number, sampleRate = 48000): Promise<AudioBuffer> {
  const sec = durata(p, i) + (p.sezioni[i]?.ultimo ? 1.5 : 0)
  const ctx = new OfflineAudioContext(2, Math.ceil(sec * sampleRate), sampleRate)
  const S = p.sezioni[i]
  const r = rng(p.seme + i * 977)
  const beat = 60 / p.bpm, sedic = beat / 4
  const T = (step: number) => step * sedic + (step % 2 ? p.swing * sedic : 0)
  const steps = (S?.battute ?? p.battute) * 16
  // catena master: bus → saturazione → compressore → uscita; riverbero e eco in mandata
  const master = ctx.createGain(); master.gain.value = 0.8
  const sat = ctx.createWaveShaper(); sat.curve = curvaSaturazione(p.genere === 'hardtechno' ? 14 : p.genere === 'techno' || p.genere === 'rock' ? 6 : p.genere === 'hiphop' ? 4 : 2)
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4
  const morbido = ctx.createBiquadFilter(); morbido.type = 'lowpass'; morbido.frequency.value = p.genere === 'hardtechno' || p.genere === 'rock' ? 11000 : 8500
  master.connect(sat).connect(comp).connect(morbido).connect(ctx.destination)
  const rev = ctx.createConvolver(); rev.buffer = impulso(ctx, p.genere === 'ambient' ? 5 : 2.4, 3)
  const revG = ctx.createGain(); revG.gain.value = p.genere === 'ambient' || p.genere === 'downtempo' ? 0.45 : 0.22
  rev.connect(revG).connect(master)
  const eco = ctx.createDelay(2); eco.delayTime.value = beat * 0.75
  const ecoFb = ctx.createGain(); ecoFb.gain.value = 0.35
  const ecoG = ctx.createGain(); ecoG.gain.value = 0.25
  eco.connect(ecoFb).connect(eco); eco.connect(ecoG).connect(master)
  // "pompaggio": tutto ciò che non è batteria scende sotto la cassa
  const pompa = ctx.createGain(); pompa.connect(master); pompa.connect(rev)
  const NB = rumoreBuffer(ctx)
  const has = (x: string) => S.strumenti.includes(x)
  const four = QUATTRO.has(p.genere)
  const nota = (grado: number, ott = 0) => { const n = p.scala.length; const o = Math.floor(grado / n); return p.radice + 12 * (ott + o) + p.scala[((grado % n) + n) % n] }
  const scarto = S?.rel === 'contro' ? 2 : S?.rel === 'diventa' ? 1 : 0
  const accordo = (b: number) => p.accordi[b % p.accordi.length].map(g => g + (b % 2 ? scarto : 0))

  const cassa = (t: number, vol = 1) => {
    const o = ctx.createOscillator(), g = ctx.createGain()
    o.frequency.setValueAtTime(p.genere === 'techno' || p.genere === 'hardtechno' ? 190 : p.genere === 'rock' ? 130 : 150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12)
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + (p.genere === 'techno' || p.genere === 'hardtechno' ? 0.5 : p.genere === 'rock' ? 0.22 : 0.35))
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.6)
    pompa.gain.setValueAtTime(0.35, t); pompa.gain.linearRampToValueAtTime(1, t + beat * 0.6)
  }
  const rum = (t: number, dur: number, hp: number, vol: number, bp = false, dest: AudioNode = master) => {
    const s = ctx.createBufferSource(); s.buffer = NB
    const fl = ctx.createBiquadFilter(); fl.type = bp ? 'bandpass' : 'highpass'; fl.frequency.value = hp
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    s.connect(fl).connect(g).connect(dest); s.start(t, r() * 0.5); s.stop(t + dur + 0.05)
  }
  const rullante = (t: number, v = 0.5) => { rum(t, 0.18, 1800, v, true); rum(t, 0.25, 300, v * 0.6, true, rev); const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 190; g.gain.setValueAtTime(v * 0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.1); o.connect(g).connect(master); o.start(t); o.stop(t + 0.12) }
  const clap = (t: number) => { for (let k = 0; k < 3; k++) rum(t + k * 0.012, 0.12, 1200, 0.35, true); rum(t + 0.03, 0.3, 1500, 0.2, true, rev) }
  const hat = (t: number, aperto = false, v = 1) => rum(t, aperto ? 0.22 : 0.04, 9000, (aperto ? 0.1 : 0.06) * v)
  // chitarra distorta: quinta di potenza (fondamentale, quinta, ottava) dentro un distorsore
  const dist = ctx.createWaveShaper(); dist.curve = curvaSaturazione(60); const cabina = ctx.createBiquadFilter(); cabina.type = 'lowpass'; cabina.frequency.value = 3200
  const chitG = ctx.createGain(); chitG.gain.value = 0.55; dist.connect(cabina).connect(chitG).connect(pompa)
  const chitarra = (t: number, dur: number, midi: number, vol: number) => { for (const [iv, d] of [[0, -7], [7, 6], [12, -3]] as const) { const o = ctx.createOscillator(), gg = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = f(midi + iv); o.detune.value = d; gg.gain.setValueAtTime(vol, t); gg.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05); o.connect(gg).connect(dist); o.start(t); o.stop(t + dur + 0.1) } }
  // 808: sub sinusoidale con una piccola caduta di intonazione
  const sub808 = (t: number, dur: number, midi: number) => { const o = ctx.createOscillator(), gg = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f(midi) * 1.6, t); o.frequency.exponentialRampToValueAtTime(f(midi), t + 0.06); gg.gain.setValueAtTime(0.55, t); gg.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(gg).connect(master); o.start(t); o.stop(t + dur + 0.05) }
  const voce = (t: number, dur: number, midi: number, tipo: OscillatorType, vol: number, cutoff: number, dest: AudioNode, opts: { att?: number; detune?: number; res?: number; env?: number } = {}) => {
    const g = ctx.createGain(), fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = opts.res ?? 1
    fl.frequency.setValueAtTime(cutoff * (opts.env ? 1 + opts.env : 1), t); fl.frequency.exponentialRampToValueAtTime(Math.max(80, cutoff), t + Math.min(dur, 0.3))
    const att = opts.att ?? 0.005
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + att); g.gain.setValueAtTime(vol, t + Math.max(att, dur - 0.05)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.15)
    fl.connect(g).connect(dest)
    for (const d of opts.detune ? [-opts.detune, opts.detune] : [0]) { const o = ctx.createOscillator(); o.type = tipo; o.frequency.value = f(midi); o.detune.value = d; o.connect(fl); o.start(t); o.stop(t + dur + 0.2) }
  }

  for (let st = 0; st < steps; st++) {
    const t = T(st), bar = Math.floor(st / 16), s16 = st % 16
    // batteria: la stessa fonte dei colpi che usa il montaggio
    const C = colpi(p, S, st)
    if (S.rel === 'contro' && bar === 0) { C.cassa = 0; C.rullante = 0; C.hat = 0 } // il contrasto comincia con un vuoto
    if (C.cassa) cassa(t, C.cassa)
    if (C.rullante) { if (has('clap') && !has('rullante')) clap(t); else rullante(t, p.genere === 'lofi' ? 0.35 : p.genere === 'rock' || p.genere === 'hiphop' ? 0.7 : C.rullante * 0.5) }
    if (C.ghost) rullante(t, C.ghost * 0.4)
    if (C.hat) hat(t, C.aperto, C.hat)
    if (has('hat') && p.genere === 'techno' && !C.hat && r() < 0.6) hat(t)
    if (has('break') && s16 === 15 && r() < 0.5) rullante(t, 0.45)
    if (C.crash) rum(t, 1.2, 5000, 0.22, false, rev)
    if (C.ride) { rum(t, 0.35, 6500, 0.09 * C.ride, true); rum(t, 0.6, 9000, 0.04 * C.ride) }
    // generi nuovi: strumenti
    const chN = accordo(bar)
    if (has('chitarra')) { const pm = bar % 2 === 0; if (pm ? s16 % 2 === 0 : s16 === 0 || s16 === 6 || s16 === 10) chitarra(t, pm ? sedic * 1.6 : sedic * (s16 === 0 ? 6 : 4), nota(chN[0], 1), pm ? 0.13 : 0.16) }
    if (has('808') && C.cassa) sub808(t, beat * 1.6, nota(chN[0], -1))
    if (has('keys') && (s16 === 0 || s16 === 7 || s16 === 10)) for (const gg of chN) voce(t, sedic * (s16 === 0 ? 5 : 2.5), nota(gg, 2), 'triangle', 0.06, 1700, pompa, { att: 0.01, detune: 6 })
    if (has('walking') && s16 % 4 === 0) { const q = s16 / 4, nx = accordo(bar + 1)[0]; const gr = q === 0 ? chN[0] : q === 1 ? chN[1] : q === 2 ? chN[2] : nx - 1; voce(t, beat * 0.9, nota(gr, 0), 'triangle', 0.34, 900, master, { env: 1 }) }
    if (has('piano') && (s16 === 6 || s16 === 14 || (s16 === 3 && bar % 2))) for (const gg of chN) voce(t, sedic * 1.4, nota(gg, 2), 'sine', 0.07, 3000, rev, { att: 0.004 })
    if (has('slap') && [0, 3, 6, 8, 10, 11, 14].includes(s16)) voce(t, sedic * 0.8, nota(chN[0], s16 === 6 || s16 === 14 ? 1 : 0), 'sawtooth', 0.26, 600, pompa, { res: 3, env: 3 })
    if (has('clav') && [2, 5, 7, 10, 13, 15].includes(s16)) for (const gg of chN.slice(0, 3)) voce(t, sedic * 0.5, nota(gg, 2), 'triangle', 0.035, 2200, pompa, { res: 1, env: 1 })
    if (has('fiati') && bar % 2 === 1 && (s16 === 4 || s16 === 10)) for (const gg of chN.slice(0, 3)) voce(t, sedic * 2.5, nota(gg, 2), 'sawtooth', 0.06, 1400, rev, { att: 0.02, detune: 10, env: 2 })
    if (has('rombo') && C.cassa) { voce(t + sedic, sedic * 2.6, nota(chN[0], -1), 'sawtooth', 0.18, 160, rev, { res: 2 }) }
    if (has('reese') && s16 === 0) voce(t, beat * 3.9, nota(chN[0], 0), 'sawtooth', 0.22, 380, pompa, { detune: 22, res: 3 })
    if (has('glitch') && r() < 0.35) rum(t, 0.03 + r() * 0.06, 2000 + r() * 8000, 0.25, true)
    // basso
    const ch = accordo(bar)
    if (has('basso') && (four ? s16 % 4 === 2 : s16 === 0 || s16 === 8 || s16 === 11)) voce(t, sedic * (four ? 1.8 : 3), nota(ch[0], 0), p.genere === 'synthwave' || p.genere === 'techno' ? 'sawtooth' : 'triangle', 0.38, 320, pompa, { res: 2, env: 1.5 })
    if (has('acid') && r() < 0.75) voce(t, sedic * 0.9, nota(ch[0] + (r() < 0.3 ? 7 : r() < 0.5 ? 2 : 0), r() < 0.25 ? 1 : 0), 'sawtooth', 0.32, 300 + 1400 * (0.5 + 0.5 * Math.sin(st / 9)), pompa, { res: 18, env: 6 })
    // accordi
    if (s16 === 0 && has('pad')) for (const g of ch) voce(t, beat * 4 - 0.05, nota(g, 2), 'sawtooth', 0.06, p.genere === 'lofi' ? 1400 : 2400, pompa, { att: beat * 0.8, detune: 12 })
    if (has('stab') && (s16 === 3 || s16 === 10)) for (const g of ch) voce(t, sedic * 1.5, nota(g, 2), 'sawtooth', 0.045, 1500, eco, { res: 1, env: 1 })
    // arpeggio e melodia
    if (has('arpeggio') && s16 % 2 === 0 && bar % 2 === 0) voce(t, sedic * 1.6, nota(ch[(st / 2) % ch.length | 0] + (st % 16 >= 8 ? 7 : 0), 3), 'triangle', 0.05, 2000, eco, { env: 0.5 })
    if (has('melodia') && bar % 4 < 2 && (s16 === 0 || s16 === 6 || (s16 === 10 && bar % 2 === 0))) voce(t, sedic * (s16 === 0 ? 6 : 3), nota(ch[(bar + s16) % ch.length], 3), p.genere === 'rock' ? 'sawtooth' : 'triangle', 0.06, 1600, rev, { att: 0.03 })
    // il leitmotiv del concetto in scena, sulle prime due battute
    if (has('motivo') && S.motivo && bar < 2 && s16 % 4 === 0) { const m = p.motivi[S.motivo]; voce(t, sedic * 3, nota(m[(s16 / 4) | 0] + ch[0], 3), 'triangle', 0.13, 3500, eco, { att: 0.01 }) }
    if (has('vinile') && st % 3 === 0) rum(t, 0.01, 3000, 0.04)
    if (has('rumore') && s16 === 0) rum(t, beat * 4, 400, 0.05, false, rev)
  }
  // cadenza: l'ultima tavola risolve o resta sospesa
  if (S.ultimo) {
    const tf = durata(p, i)
    const finale = p.risolve ? [0, 2, 4] : [0, 3, 4]
    for (const g of finale) voce(tf - beat, 1.8, nota(g, 2), 'sawtooth', 0.08, 2000, rev, { att: 0.05, detune: 8 })
  }
  let buf = await ctx.startRendering()
  // follie sonore
  if (S.follia === 'inversione') for (let c = 0; c < buf.numberOfChannels; c++) buf.getChannelData(c).reverse()
  if (S.follia === 'ossessione') { const L = Math.floor(sedic * 2 * sampleRate); for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let k = L; k < d.length; k++) d[k] = d[k % L + Math.floor(d.length / 2) - Math.floor(d.length / 2) % L] } }
  if (S.follia === 'assenza') for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let k = Math.floor(d.length * 0.25); k < d.length; k++) d[k] *= Math.max(0, 1 - (k - d.length * 0.25) / (d.length * 0.2)) }
  if (S.follia === 'scala') for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c), out = new Float32Array(d.length); for (let k = 0; k < d.length; k++) out[k] = d[Math.floor(k * (1 - (k / d.length) * 0.5))] ?? 0; d.set(out) }
  // normalizza
  let peak = 0
  for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let k = 0; k < d.length; k++) peak = Math.max(peak, Math.abs(d[k])) }
  if (peak > 0) for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let k = 0; k < d.length; k++) d[k] = (d[k] / peak) * 0.89 }
  return buf
}

/** WAV stereo 16 bit, per ascoltare o scaricare */
export function wav(b: AudioBuffer): Blob {
  const n = b.length, ch = b.numberOfChannels, sr = b.sampleRate
  const out = new DataView(new ArrayBuffer(44 + n * ch * 2))
  const w = (o: number, s: string) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)))
  w(0, 'RIFF'); out.setUint32(4, 36 + n * ch * 2, true); w(8, 'WAVE'); w(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true)
  out.setUint32(24, sr, true); out.setUint32(28, sr * ch * 2, true); out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true); w(36, 'data'); out.setUint32(40, n * ch * 2, true)
  const cs = [...Array(ch)].map((_, c) => b.getChannelData(c))
  let o = 44
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const v = Math.max(-1, Math.min(1, cs[c][i])); out.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2 }
  return new Blob([out], { type: 'audio/wav' })
}

export const GENERE_NOME: Record<Genere, string> = { lofi: 'lo-fi', techno: 'techno industriale', acid: 'acid house', glitch: 'glitch', downtempo: 'downtempo', minimalhouse: 'minimal house', synthwave: 'synthwave', breakbeat: 'breakbeat', ambient: 'ambient', pop: 'base pop', rock: 'rock', hiphop: 'hip hop', jazz: 'jazz', funk: 'funk', hardtechno: 'hard techno', dnb: 'drum and bass' }

/**
 * I colpi di una sezione, in secondi dall'inizio della sezione: gli stessi che `suona` mette nel brano
 * (solo le parti fisse, non quelle a caso), così l'animazione può cadere esattamente sul ritmo.
 */
export interface Eventi { beat: number; battute: number; cassa: number[]; rullante: number[]; basso: number[]; accordi: number[]; stab: number[]; durata: number; energia: number; crash: number[] }
export function eventi(p: Partitura, i: number): Eventi {
  const S = p.sezioni[i] ?? { strumenti: [] }
  const beat = 60 / p.bpm, sedic = beat / 4
  const T = (step: number) => step * sedic + (step % 2 ? p.swing * sedic : 0)
  const has = (x: string) => S.strumenti.includes(x)
  const e: Eventi = { beat, battute: p.battute, cassa: [], rullante: [], basso: [], accordi: [], stab: [], durata: durata(p, i) + (S.ultimo ? 1.5 : 0), energia: S.energia ?? 0.5, crash: [] }
  for (let st = 0; st < (S.battute ?? p.battute) * 16; st++) {
    const t = T(st), s16 = st % 16, C = colpi(p, S, st)
    if (S.rel === 'contro' && st < 16) { C.cassa = 0; C.rullante = 0 }
    if (C.cassa) e.cassa.push(t)
    if (C.rullante) e.rullante.push(t)
    if (C.crash) e.crash.push(t)
    if ((has('basso') || has('slap') || has('walking') || has('808')) && (s16 % 4 === 0 || has('slap') && [3, 6, 10, 11, 14].includes(s16))) e.basso.push(t)
    if (s16 === 0) e.accordi.push(t)
    if ((has('stab') || has('clav') || has('fiati') || has('chitarra')) && (s16 === 3 || s16 === 10)) e.stab.push(t)
  }
  // senza batteria: i battiti diventano i quarti, così c'è sempre un ritmo a cui appoggiarsi
  if (!e.cassa.length) for (let b = 0; b < (S.battute ?? p.battute) * 4; b++) e.cassa.push(b * beat)
  return e
}
