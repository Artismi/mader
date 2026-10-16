/**
 * Risorse dello Studio nel motore: un passaggio comune a tutti gli archetipi
 * (in `finish`, prima dei controlli di lettura e degli spazi) che collega
 * effetti e filtri del catalogo completo, generatori procedurali, oggetti 3D
 * e toglie le forme senza motivo. Deterministico dal seme della tavola.
 */
import type { SceneEl, FxSpec } from '../../types'
import { textBox, lum, mix, pathBox, type G } from '../tools'
import { rng, hashText, type Rng } from '../knobs'
import { scegliFx, looksPer } from './effetti'
import type { Palette, Oggetto3D } from '../../types'

/** La palette della tavola nella forma degli ornamenti. */
const pal = (g: G): Palette => ({ bg: g.P.bg, ink: g.P.fg, accent: g.P.acc, muted: g.P.sec, surface: g.P.srf })

type Box = { x: number; y: number; w: number; h: number }
type Testo = Extract<SceneEl, { kind: 'text' }>
const area = (b: Box) => b.w * b.h
const inter = (a: Box, b: Box) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))
const boxOf = (e: SceneEl): Box | null => (e.kind === 'rect' || e.kind === 'image' || e.kind === 'ornament') ? { x: e.x, y: e.y, w: e.w, h: e.h } : e.kind === 'circle' ? { x: e.cx - e.r, y: e.cy - e.r, w: 2 * e.r, h: 2 * e.r } : null

export const testi = (g: G) => g.els.filter(e => e.kind === 'text' && !e.deco) as Testo[]
export const rngRisorse = (g: G, chiave: string): Rng => rng(hashText(`${g.c.title}|${g.k.sistema}|${g.k.seme}|${chiave}`))

/** Colori della tavola per tingere gli effetti (accento, secondo, inchiostro, superficie). */
const colori = (g: G) => [g.P.acc, g.P.acc2, g.P.fg, g.P.srf]

/** Quota del riquadro coperta da testi veri. */
export function coperturaTesti(g: G, b: Box) {
  return testi(g).reduce((a, t) => a + inter(b, textBox(t)), 0) / Math.max(1, area(b))
}

/* ── 1. effetti e filtri dal catalogo completo ──────────────────────────── */
function effetti(g: G) {
  const r = rngRisorse(g, 'fx'), reg = g.s.registro, pick = <X,>(l: readonly X[]) => r.pick(l as X[])
  const usati: string[] = []
  const aggiungi = (e: { fx?: FxSpec[] }, f: FxSpec | null) => { if (f) { e.fx = [...(e.fx ?? []), f]; usati.push(f.id) } }

  // foto: un filtro pronto e un effetto; le copie della stessa foto (strisce, celle) prendono lo stesso trattamento
  const foto = g.els.filter(e => e.kind === 'image' && e.url) as Extract<SceneEl, { kind: 'image' }>[]
  if (foto.length) {
    const main = foto.reduce((a, b) => (area(b) > area(a) ? b : a))
    const sotto = coperturaTesti(g, main) > 0.02
    const look = !main.look && r.chance(0.55) ? pick(looksPer(reg)) : undefined
    const ha = (main.fx ?? []).length > 0
    const f = !ha && r.chance(0.65) ? scegliFx(pick, 'foto', reg, colori(g), sotto ? 0.2 : 0.45) : null
    for (const e of foto.filter(x => x.url === main.url)) {
      if (look) e.look = look
      if (f) aggiungi(e, { ...f })
    }
  }

  // fondi e forme grandi senza effetti: trama o riempimento se nessun testo ci passa sopra, solo trama leggera se sì
  const grandi = g.els.filter(e => (e.kind === 'rect' && typeof e.fill === 'string') || e.kind === 'circle')
    .filter(e => !(e as { fx?: FxSpec[] }).fx?.length && area(boxOf(e)!) > g.W * g.H * 0.08)
  for (const e of grandi.slice(0, 2)) {
    if (!r.chance(0.35)) continue
    const libera = coperturaTesti(g, boxOf(e)!) < 0.02
    const b = libera ? (r.chance(0.5) ? 'fondo' : 'forma') : 'fondo'
    aggiungi(e as { fx?: FxSpec[] }, scegliFx(pick, b, reg, colori(g), libera ? 0.3 : 0.05, libera ? usati : [...usati, 'genFill', 'caleido', 'raggi', 'gradientOverlay', 'luceProiettata']))
  }

  // titolo: solo il testo più grande, solo se è davvero grande, solo effetti che non ne coprono la lettura
  const ts = testi(g).filter(t => !t.hollow && !t.fx?.length && !t.chars?.length)
  const titolo = ts.reduce<Testo | null>((a, t) => (!a || t.size > a.size ? t : a), null)
  if (titolo && titolo.size >= g.H * 0.07 && r.chance(0.3)) {
    const scuro = lum(g.P.bg) < 0.2
    const max = titolo.size >= g.H * 0.14 ? 0.3 : 0.15
    const escludi = [...usati, ...(scuro ? [] : ['neon', 'outerGlow'])]
    aggiungi(titolo, scegliFx(pick, 'titolo', reg, colori(g), max, escludi))
  }
}

/* ── 2. generatori procedurali: mattoni "campo" e "trama" ──────────────── */
/** Il generatore viene dal contenuto (cosa racconta) e, in mancanza, dal registro. */
const DAL_CONTENUTO: [RegExp, string[]][] = [
  [/music|suon|concert|club|dj|vinil|radio|festival|disco/i, ['campo:moire', 'campo:chladni']],
  [/caff|t[eè]|vapor|cucin|forno|pane|menu|ristor|cena|pranzo/i, ['campo:flusso', 'campo:nebbia', 'campo:isoipse']],
  [/montagn|lago|mare|viagg|mappa|sentier|trek|natura|parco/i, ['campo:isoipse', 'campo:liquido']],
  [/mostra|arte|museo|galleri|design|architett|ceramic/i, ['campo:voronoi', 'campo:truchet', 'campo:mezzatinta']],
  [/palestr|sport|corsa|allenament|fitness|gara|bici|yoga/i, ['campo:flusso', 'proc:zigzag_fill', 'proc:wave_lines']],
  [/tech|app|software|digital|codice|dati|ai|startup/i, ['proc:circuit_board', 'proc:dot_grid', 'campo:mezzatinta']],
]
const DAL_REGISTRO: Record<string, string[]> = {
  infantile: ['proc:dot_grid', 'proc:wave_lines', 'campo:truchet'], pop: ['campo:mezzatinta', 'proc:halftone', 'campo:truchet'],
  editoriale: ['campo:isoipse', 'proc:crosshatch', 'campo:voronoi'], svizzero: ['proc:dot_grid', 'campo:moire', 'proc:perspective_grid'],
  avanguardia: ['campo:moire', 'campo:voronoi', 'campo:chladni'], lusso: ['campo:liquido', 'proc:crosshatch', 'campo:isoipse'],
  artigianale: ['proc:crosshatch', 'campo:flusso', 'proc:organic_noise'], notte: ['campo:chladni', 'campo:moire', 'campo:nebbia'],
  tech: ['proc:circuit_board', 'campo:mezzatinta', 'proc:perspective_grid'], retro: ['proc:halftone', 'proc:star_scatter', 'campo:truchet'],
  sportivo: ['proc:zigzag_fill', 'campo:flusso', 'proc:wave_lines'],
}
export function generatorePer(g: G, r: Rng): string {
  const testo = [g.c.title, g.c.kicker, g.c.body, g.c.brand, g.c.imageQuery, ...(g.c.details ?? [])].filter(Boolean).join(' ')
  const dal = DAL_CONTENUTO.find(([re]) => re.test(testo))?.[1]
  return r.pick(dal && r.chance(0.75) ? dal : DAL_REGISTRO[g.s.registro] ?? ['campo:flusso'])
}

function generatori(g: G) {
  const r = rngRisorse(g, 'gen')
  if (g.els.some(e => e.kind === 'ornament')) return
  const id = generatorePer(g, r)
  const scuro = lum(g.P.bg) < 0.2
  // trama: dentro una superficie piena (pannello, fascia) che non è il fondo; inchiostro vicino al pieno
  const sup = g.els.filter(e => e.kind === 'rect' && typeof e.fill === 'string' && e.fill !== g.P.bg && !e.fx?.length && area(boxOf(e)!) > g.W * g.H * 0.06) as Extract<SceneEl, { kind: 'rect' }>[]
  if (sup.length && r.chance(0.45)) {
    const p = sup.reduce((a, b) => (area(b) > area(a) ? b : a))
    const sotto = coperturaTesti(g, p) > 0.02
    const ink = mix(p.fill as string, lum(p.fill as string) < 0.25 ? '#ffffff' : '#000000', 0.35)
    const at = g.els.indexOf(p) + 1
    g.els.splice(at, 0, { kind: 'ornament', name: 'trama', id: id.replace(/^campo:/, 'trama:'), x: p.x, y: p.y, w: p.w, h: p.h, r: p.r, seed: g.k.seme, opacity: sotto ? 0.22 : 0.5, under: sotto, pal: { ...pal(g), ink } })
    return
  }
  if (!r.chance(0.45)) return
  // campo: nella zona più libera della tavola; sotto i testi solo velato (la lettura conta più del campo)
  const zone: Box[] = [{ x: 0, y: g.H * 0.55, w: g.W, h: g.H * 0.45 }, { x: 0, y: 0, w: g.W, h: g.H * 0.45 }, { x: g.W * 0.5, y: 0, w: g.W * 0.5, h: g.H }, { x: 0, y: 0, w: g.W * 0.5, h: g.H }, { x: 0, y: 0, w: g.W, h: g.H }]
  const occupata = (b: Box) => g.els.filter(e => e.kind === 'image' || (e.kind === 'rect' && area(boxOf(e)!) > g.W * g.H * 0.04)).reduce((a, e) => a + inter(b, boxOf(e)!), 0) / area(b)
  const c = zone.map(b => ({ b, t: coperturaTesti(g, b), o: occupata(b) })).filter(z => z.o < 0.3).sort((a, b) => a.t - b.t)[0]
  if (!c) return
  const libera = c.t < 0.01
  const ink = libera ? g.P.acc : mix(g.P.fg, g.P.bg, 0.55)
  const at = Math.max(0, g.els.findIndex(e => e.kind === 'text' && !e.deco))
  g.els.splice(at, 0, { kind: 'ornament', name: 'campo', id, x: c.b.x, y: c.b.y, w: c.b.w, h: c.b.h, seed: g.k.seme, opacity: libera ? (scuro ? 0.7 : 0.55) : 0.2, under: !libera, pal: { ...pal(g), ink } })
}

/* ── 3. oggetto 3D: forma dal contenuto, o il segno del marchio estruso ─── */
const FORMA_DAL_CONTENUTO: [RegExp, Oggetto3D['forma']][] = [
  [/vinil|disco|dj|radio|musica/i, 'disco'], [/caff|tazz|t[eè]|ciambell|anell/i, 'toro'], [/palestr|fitness|allenament|pesi|integrator|capsul/i, 'capsula'],
  [/arte|mostra|museo|scultur|design/i, 'nodo'], [/tech|app|software|dati|cubo|box|scatol/i, 'cubo'], [/sfera|pianet|luna|palla|bolla/i, 'sfera'], [/lattin|barattol|bottigli/i, 'cilindro'],
]
const MATERIALE_REGISTRO: Partial<Record<string, Oggetto3D['materiale'][]>> = {
  pop: ['plastica', 'olografico'], tech: ['cromo', 'vetro', 'olografico'], notte: ['cromo', 'vetro', 'olografico'], infantile: ['plastica', 'argilla'],
  sportivo: ['plastica', 'cromo'], avanguardia: ['cromo', 'argilla', 'vetro'], lusso: ['oro', 'vetro'], artigianale: ['argilla'], retro: ['plastica', 'cromo'],
}
function oggetto3d(g: G) {
  const r = rngRisorse(g, '3d')
  const mats = MATERIALE_REGISTRO[g.s.registro]
  const foto = g.els.some(e => e.kind === 'image')
  if (!mats || g.els.some(e => e.kind === 'ornament') || !r.chance(foto ? 0.12 : 0.3)) return
  const testo = [g.c.title, g.c.kicker, g.c.body, g.c.imageQuery].filter(Boolean).join(' ')
  // la forma viene dal contenuto; altrimenti il segno del marchio (iniziale) estruso nel carattere del titolo
  const forma = FORMA_DAL_CONTENUTO.find(([re]) => re.test(testo))?.[1] ?? (g.c.brand ? 'testo' : null)
  if (!forma) return
  // zona libera da testi e foto, ma vicina al contenuto (un oggetto isolato è un riempitivo)
  const lato = Math.min(g.W, g.H) * r.range(0.32, 0.42)
  const cand: Box[] = []
  for (const fx of [0.08, 0.5, 0.92]) for (const fy of [0.12, 0.5, 0.88]) cand.push({ x: Math.max(0, Math.min(g.W - lato, g.W * fx - lato / 2)), y: Math.max(0, Math.min(g.H - lato, g.H * fy - lato / 2)), w: lato, h: lato })
  const ts = testi(g).map(textBox)
  const ok = cand.filter(b => coperturaTesti(g, b) < 0.005 && !g.els.some(e => e.kind === 'image' && inter(b, boxOf(e)!) > 0)
    && ts.some(t => inter({ x: b.x - lato * 0.25, y: b.y - lato * 0.25, w: b.w + lato * 0.5, h: b.h + lato * 0.5 }, t) > 0))
  if (!ok.length) return
  const b = r.pick(ok)
  const o3d: Oggetto3D = { forma, materiale: r.pick(mats), colore: g.P.acc, colore2: g.P.bg, testo: forma === 'testo' ? g.c.brand!.trim().charAt(0).toUpperCase() : undefined, famiglia: g.s.display.family, inclina: r.range(-25, -8), gira: r.range(-35, 35), angolo: r.range(-12, 12) }
  const at = Math.max(0, g.els.findIndex(e => e.kind === 'text' && !e.deco))
  g.els.splice(at, 0, { kind: 'ornament', name: 'oggetto3d', id: `3d:${forma}`, x: b.x, y: b.y, w: b.w, h: b.h, seed: g.k.seme, opacity: 1, o3d })
}

/* ── 4. forme motivate: via i riempitivi senza ragione ──────────────────── */
/** Riempitivi sparsi a caso (coriandoli, stelline, ghirigori): non vengono né dall'idea né dalla griglia. */
const RIEMPITIVI = /^(coriandolo|stellina|ghirigoro)$/
/** Forme decorative che restano solo se hanno una ragione nella composizione. */
const DECORATIVE = /^(blob|macchia|alone|bolla|disco|triangolo|punto|forma|strato)$/
const boxEl = (e: SceneEl): Box | null => (e.kind === 'path' ? pathBox(e.d) : boxOf(e))

/**
 * Una forma decorativa è motivata se dialoga con il contenuto (tocca un testo o la foto: fondo,
 * cornice, appoggio), se è tagliata dal formato ed è grande (gesto di composizione), o se sta
 * sulla griglia (bordo sui margini, centro sull'asse). Altrimenti è un riempitivo e non entra.
 */
function motivata(g: G, b: Box) {
  const tol = 6 * g.u, big = area(b) > g.W * g.H * 0.03
  const conti = [...testi(g).map(textBox), ...g.els.filter(e => e.kind === 'image').map(e => boxOf(e)!)]
  if (conti.some(t => inter({ x: b.x - tol, y: b.y - tol, w: b.w + 2 * tol, h: b.h + 2 * tol }, t) > 0)) return true
  if (big && (b.x < 0 || b.y < 0 || b.x + b.w > g.W || b.y + b.h > g.H)) return true
  const vicino = (a: number, v: number) => Math.abs(a - v) < tol
  return [g.m, g.W - g.m].some(v => vicino(b.x, v) || vicino(b.x + b.w, v)) && [g.T, g.B].some(v => vicino(b.y, v) || vicino(b.y + b.h, v)) || vicino(b.x + b.w / 2, g.W / 2) && big
}

/** Conta delle forme tolte (diagnosi della vetrina). */
export const formeTolte: Record<string, number> = {}

export function forme(g: G): number {
  const via = g.els.filter(e => {
    const n = 'name' in e ? e.name : ''
    if (RIEMPITIVI.test(n)) return true
    // il triangolo a contorno sparso (Memphis) e la macchia generativa a caso dello strato
    if (e.kind === 'path' && n === 'triangolo' && e.stroke) return true
    if (e.kind === 'circle' && n === 'strato') return true
    if ((e.kind === 'circle' || e.kind === 'path') && DECORATIVE.test(n)) { const b = boxEl(e); return !!b && !motivata(g, b) }
    return false
  })
  if (via.length) g.els = g.els.filter(e => !via.includes(e))
  for (const e of via) { const n = 'name' in e ? e.name : e.kind; formeTolte[n] = (formeTolte[n] ?? 0) + 1 }
  return via.length
}

/** Il passaggio delle risorse dello Studio (chiamato da `finish`). */
export function arricchisci(g: G) {
  forme(g)
  oggetto3d(g)
  generatori(g)
  effetti(g)
}
