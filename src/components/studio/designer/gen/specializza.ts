/**
 * La specifica di progetto dentro il motore. Due momenti:
 *  - all'inizio (makeG): i decori dello stile diventano quelli del brief
 *    (ornamenti, glifi e icone, look della foto, colore d'accento), così ogni
 *    archetipo che disegna un sigillo, una stella o un ornamento parla del
 *    contenuto; trattamento della foto ed enfasi seguono la specifica;
 *  - alla fine (finish, prima dei controlli): via i segni da evitare, effetto
 *    del titolo, segni (sigillo, cornice, crocini) e icone ancorate ai testi:
 *    un emblema accanto al titolo e un fregio di pittogrammi accanto a una
 *    didascalia. Mai icone sparse a caso: un segno dialoga con il contenuto.
 * Tutto passa poi dalla leggibilità e dal controllo dei bordi del motore.
 */
import type { DesignContent, FxSpec, SceneEl } from '../types'
import type { Style } from '../styles'
import { type Knobs, hashText } from './knobs'
import { type G, U, alpha, contrast, readable, mix, lum, textBox, printMarks, sotto } from './tools'
import { espandi, type SpecificaEsplicita } from '../progetto/specifica'
import { EFFETTI_TESTO, EVITABILI, type EffettoTesto } from '../progetto/vocabolario'

const cache = new WeakMap<object, SpecificaEsplicita>()
/** La specifica sciolta del contenuto (una volta per contenuto). */
export function specificaDi(c: DesignContent): SpecificaEsplicita | null {
  if (!c.progetto) return null
  if (!cache.has(c.progetto)) cache.set(c.progetto, espandi(c.progetto))
  return cache.get(c.progetto)!
}

/** L'accento del brief, schiarito o scurito finché si stacca dal fondo; null se non ci riesce. */
function accentoLeggibile(acc: string, bg: string): string | null {
  const verso = lum(bg) < 0.3 ? '#ffffff' : '#000000'
  for (const t of [0, 0.15, 0.3, 0.45]) { const c = mix(acc, verso, t); if (contrast(c, bg) >= 2.6) return c }
  return null
}

/** Stile e regolatori orientati dalla specifica. */
export function conSpecifica(s: Style, k: Knobs, c: DesignContent): { s: Style; k: Knobs } {
  const sp = specificaDi(c)
  if (!sp) return { s, k }
  const icone = sp.icone.map(i => i.d).filter((d): d is string => !!d)
  const glyphs = [...icone, ...sp.glifi]
  const accent = sp.accento ? accentoLeggibile(sp.accento, s.bg) : null
  const s2: Style = {
    ...s,
    ...(accent ? { accent, onAccent: readable(accent, [s.bg, s.ink, '#ffffff', '#111111']) } : {}),
    decor: {
      ...s.decor,
      ornaments: sp.ornamenti.length ? sp.ornamenti : s.decor.ornaments,
      glyphs: glyphs.length ? glyphs : s.decor.glyphs,
      look: sp.look ?? s.decor.look,
    },
  }
  const titolo = c.title.toLowerCase()
  const k2: Knobs = {
    ...k,
    // il trattamento della specifica in sei tavole su dieci: resta varietà nel vivaio
    trattamento: sp.trattamento && hashText(`${k.seme}|tratt`) % 10 < 6 ? sp.trattamento : k.trattamento,
    enfasi: k.enfasi ?? (sp.enfasi && titolo.includes(sp.enfasi.toLowerCase()) ? sp.enfasi : undefined),
  }
  return { s: s2, k: k2 }
}

type Box = { x: number; y: number; w: number; h: number }
type Text = Extract<SceneEl, { kind: 'text' }>
const overlap = (a: Box, b: Box, gap = 0) => a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap
const unione = (l: Box[]): Box => { const x = Math.min(...l.map(b => b.x)), y = Math.min(...l.map(b => b.y)); return { x, y, w: Math.max(...l.map(b => b.x + b.w)) - x, h: Math.max(...l.map(b => b.y + b.h)) - y } }

/** Riquadri da non coprire: testi, foto, segni già piazzati. */
function occupati(g: G): Box[] {
  return g.els.flatMap(e => {
    if (e.kind === 'text' && !e.deco) return [textBox(e)]
    if (e.kind === 'image') return [{ x: e.x, y: e.y, w: e.w, h: e.h }]
    if (e.kind === 'glyph') return [{ x: e.cx - e.size / 2, y: e.cy - e.size / 2, w: e.size, h: e.size }]
    if (e.kind === 'seal') return [{ x: e.cx - e.r, y: e.cy - e.r, w: 2 * e.r, h: 2 * e.r }]
    return []
  })
}

/** Il riquadro è dentro i margini, libero e su un fondo calmo e uniforme? Restituisce il colore sotto. */
function calmo(g: G, b: Box, busy: Box[], gap: number): string | null {
  const lim = g.m * 0.6
  if (b.x < lim || b.y < Math.max(lim, g.T) || b.x + b.w > g.W - lim || b.y + b.h > Math.min(g.H - lim, g.B)) return null
  if (busy.some(o => overlap(b, o, gap))) return null
  const pts = [[b.x + b.w / 2, b.y + b.h / 2], [b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]].map(([x, y]) => sotto(g, x, y))
  return pts.some(p => p.busy || p.color !== pts[0].color) ? null : pts[0].color
}

/** Un posto libero qualunque (per il sigillo, che sta da sé come un timbro). */
function postoLibero(g: G, size: number, busy: Box[], gap: number): { cx: number; cy: number; under: string } | null {
  for (let t = 0; t < 80; t++) {
    const cx = g.r.range(size / 2, g.W - size / 2), cy = g.r.range(size / 2, g.H - size / 2)
    const under = calmo(g, { x: cx - size / 2, y: cy - size / 2, w: size, h: size }, busy, gap)
    if (under) return { cx, cy, under }
  }
  return null
}

/** Colore di un segno su un fondo: accento se si stacca, altrimenti l'inchiostro. */
const inchiostro = (g: G, under: string) => readable(under, [g.P.acc, g.P.acc2, g.P.fg, g.P.sec], 2.2)

/** Effetto del titolo nei colori della tavola; null se l'effetto non si addice al fondo. */
function effettoTitolo(g: G, id: EffettoTesto, t: Text): FxSpec[] | null {
  const { P } = g
  const scuro = lum(P.bg) < 0.2
  const fondo = (EFFETTI_TESTO[id] as { fondo?: 'scuro' | 'chiaro' }).fondo
  if ((fondo === 'scuro' && !scuro) || (fondo === 'chiaro' && scuro)) return null
  const altro = [P.acc, P.acc2, P.fg].find(c => c !== t.color && contrast(c, t.color) > 1.6) ?? mix(t.color, scuro ? '#ffffff' : '#000000', 0.5)
  const ombra = mix(P.bg, '#000000', scuro ? 0.6 : 0.3)
  const d = Math.max(4, Math.round(t.size * 0.06))
  switch (id) {
    case 'ombra-netta': return [{ id: 'dropShadow', variant: 'netta', p: { color: altro, distance: d, angle: 45, opacity: 100, size: 0 } }]
    case 'ombra-lunga': return [{ id: 'longShadow', variant: 'flat', p: { color: ombra, length: Math.round(t.size * 0.9), opacity: 100, fade: 30 } }]
    case 'estruso': return [{ id: 'extrude', variant: 'retro', p: { color: altro, depth: Math.round(t.size * 0.12), angle: 45, outline: 0 } }]
    case 'eco': return [{ id: 'echo', variant: 'pop', p: { useColor: 1, color: altro, count: 3, distance: Math.round(d * 1.4), fade: 30 } }]
    case 'bagliore': return [{ id: 'outerGlow', variant: 'caldo', p: { color: altro, size: Math.round(t.size * 0.35), opacity: 55 } }]
    case 'neon': return [{ id: 'neon', p: { color: altro, size: Math.round(t.size * 0.25), intensity: 70, tube: 60 } }]
    case 'timbro': return [{ id: 'grunge', variant: 'timbro', p: { wear: 40, speck: 38, scale: 110 } }]
    case 'lamina-oro': return scuro ? [{ id: 'foil', variant: 'oro', p: { crinkle: 45 } }] : null
    case 'contorno': return [{ id: 'stroke', variant: 'adesivo', p: { size: Math.max(4, Math.round(t.size * 0.07)), color: contrast(P.bg, t.color) > 3 ? P.bg : '#ffffff' } }]
  }
}

/** Inserisce elementi sotto i testi veri (sopra fondo, foto e forme). */
function sottoITesti(g: G, els: SceneEl[]) {
  const i = g.els.findIndex(e => e.kind === 'text' && !e.deco)
  g.els.splice(i < 0 ? g.els.length : i, 0, ...els)
}

/** Emblema: un'icona grande accanto al titolo (a destra, sopra, sotto), come un segno che lo accompagna. */
function emblema(g: G, titolo: Box, path: string, busy: Box[], gap: number): SceneEl | null {
  const riga = Math.min(titolo.h, U(g, 240))
  for (const f of [0.95, 0.7, 0.5]) {
    const s = Math.max(U(g, 64), riga * f)
    const posti: [number, number][] = [
      [titolo.x + titolo.w + gap, titolo.y], [titolo.x + titolo.w + gap, titolo.y + titolo.h - s],
      [titolo.x, titolo.y - gap - s], [titolo.x + titolo.w - s, titolo.y - gap - s],
      [titolo.x, titolo.y + titolo.h + gap], [titolo.x - gap - s, titolo.y],
    ]
    for (const [x, y] of posti) {
      const b = { x, y, w: s, h: s }
      const under = calmo(g, b, busy, gap * 0.6)
      if (under) return { kind: 'glyph', name: 'icona', path, cx: x + s / 2, cy: y + s / 2, size: s, color: inchiostro(g, under), angle: g.r.range(-6, 6) }
    }
  }
  return null
}

/** Fregio: tre pittogrammi in fila accanto a una didascalia (brand, occhiello, dettagli, invito). */
function fregio(g: G, paths: string[], busy: Box[], gap: number): SceneEl[] {
  const piccoli = g.els.filter((e): e is Text => e.kind === 'text' && !e.deco && !/^titolo/.test(e.name) && e.size < 34 * g.u && !e.angle)
  for (const t of [...piccoli].sort(() => g.r.next() - 0.5)) {
    const b = textBox(t)
    const s = Math.max(U(g, 26), Math.min(U(g, 44), b.h * 1.25)), passo = s * 1.5, n = Math.min(3, paths.length + 1)
    const w = s + passo * (n - 1)
    for (const [x, y] of [[b.x, b.y - gap - s], [b.x + b.w + gap * 1.4, b.y + (b.h - s) / 2], [b.x, b.y + b.h + gap]] as [number, number][]) {
      const under = calmo(g, { x, y, w, h: s }, busy, gap * 0.6)
      if (!under) continue
      const color = inchiostro(g, under)
      return Array.from({ length: n }, (_, i) => ({ kind: 'glyph', name: 'fregio', path: paths[i % paths.length], cx: x + s / 2 + i * passo, cy: y + s / 2, size: s, color }) as SceneEl)
    }
  }
  return []
}

/** La specifica applicata alla tavola composta. */
export function specializza(g: G) {
  const sp = specificaDi(g.c)
  if (!sp) return
  const { P, k } = g

  // 1. via i segni da evitare
  const via = sp.evita.map(e => EVITABILI[e]).filter((r): r is RegExp => !!r)
  if (via.length) g.els = g.els.filter(e => !via.some(r => r.test(e.name)))

  // 2. effetto del titolo: il primo della specifica che si addice al fondo, solo sui titoli grandi e pieni
  const titoli = g.els.filter((e): e is Text => e.kind === 'text' && !e.deco && /^titolo(#|$)/.test(e.name) && e.size >= 44 * g.u && !e.hollow && !e.fx?.length)
  for (const t of titoli) for (const id of sp.effetti) { const fx = effettoTitolo(g, id, t); if (fx) { t.fx = fx; break } }

  // 3. segni
  const busy = occupati(g)
  const gap = U(g, 22)
  if (sp.segni.includes('cornice') && !g.els.some(e => e.name === 'cornice')) {
    const i = g.m * 0.28
    sottoITesti(g, [{ kind: 'rect', name: 'cornice', x: i, y: i, w: g.W - 2 * i, h: g.H - 2 * i, fill: 'transparent', stroke: alpha(readable(P.bg, [P.acc, P.fg]), 0.8), sw: Math.max(2, U(g, 3)) }])
  }
  if (sp.segni.includes('crocini') && !g.els.some(e => e.name === 'crocino')) printMarks(g, alpha(P.fg, 0.6))
  const icone = sp.icone.map(i => i.d).filter((d): d is string => !!d)
  // emblema e sigillo dalle icone del motivo principale (le prime), il fregio dalle altre
  const salt = hashText(`${g.c.title}|${k.seme}|icone`) % Math.min(4, Math.max(1, icone.length))
  if (sp.segni.includes('sigillo') && !g.els.some(e => e.kind === 'seal')) {
    const r = U(g, 78 + 30 * k.densita)
    const posto = postoLibero(g, 2 * r, busy, gap)
    const parole = [g.c.brand, g.c.kicker].filter(Boolean).join(' · ')
    if (posto && parole) {
      const color = readable(posto.under, [P.acc, P.fg, P.sec], 3)
      sottoITesti(g, [{ kind: 'seal', name: 'sigillo', cx: posto.cx, cy: posto.cy, r, text: `${parole.toUpperCase()} · `, color, font: g.s.label, glyph: icone[salt % Math.max(1, icone.length)] ?? sp.glifi[0] ?? g.s.decor.glyphs[0], bg: posto.under, angle: g.r.range(-14, 14) }])
      busy.push({ x: posto.cx - r, y: posto.cy - r, w: 2 * r, h: 2 * r })
    }
  }

  // 4. icone ancorate ai testi: emblema accanto al titolo, fregio accanto a una didascalia
  if (!icone.length) return
  const nuove: SceneEl[] = []
  const tb = titoli.length ? unione(titoli.map(textBox)) : null
  if (tb) {
    const e = emblema(g, tb, icone[salt % icone.length], busy, gap)
    if (e && e.kind === 'glyph') { nuove.push(e); busy.push({ x: e.cx - e.size / 2, y: e.cy - e.size / 2, w: e.size, h: e.size }) }
  }
  if (k.densita > 0.35) {
    const altre = icone.filter((_, i) => i !== salt % icone.length)
    nuove.push(...fregio(g, altre.length ? altre : icone, busy, U(g, 16)))
  }
  sottoITesti(g, nuove)
}
