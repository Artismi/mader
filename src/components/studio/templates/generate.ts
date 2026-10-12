/**
 * Generatore procedurale di template. Dai contenuti nascono proposte che
 * combinano le ricette pulite (impaginazione × stile), le palette dello stile,
 * un visual (glifo/parola/generatore/PNG dei pack × trattamento × disposizione)
 * e una finitura con i pack. Tutto deterministico per seme: "Rimescola" cambia
 * solo il seme.
 *
 * Gli esempi salvati dall'utente guidano il generatore: metà delle proposte
 * nascono da un esempio (stessa ricetta) variando palette, visual e finitura.
 */
import type { ComposeBoard, ComposeContent } from '@/lib/design/compose-spec'
import { STYLES } from '@/lib/design/compose-spec'
import { familyFor, pickRecipes, recipeOf, recipeSpec, RECIPES, STYLE_FINISH, type RecipeFamily } from '@/lib/design/compose-recipes'
import { GLYPH_NAMES, TREATMENTS } from '../ai/visual'

export interface TemplateOpts {
  format: string
  family?: RecipeFamily
  count?: number
  seed: number
  /** visual dietro ai testi (glifi, generatori, PNG dei pack) */
  visual?: boolean
  /** finiture con i pack (carta, grana, luci…) */
  finish?: boolean
  /** stile del brand: le proposte restano in quello stile */
  style?: string
  examples?: ComposeBoard[]
}

export interface Proposal { id: string; board: ComposeBoard; label: string }

function rng(seed: number) {
  let a = seed >>> 0
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
const pick = <T,>(R: () => number, list: T[]) => list[Math.floor(R() * list.length)]

/** Trattamenti che stanno bene con ciascuno stile. */
const STYLE_TREATMENTS: Record<string, string[]> = {
  lusso: ['oro', 'foil', 'vetro'], cinema: ['cromo', 'vetro', 'oro'], tech: ['vetro', 'olografico', 'prisma', 'cromo'],
  minimal: ['vetro', 'ceramica', 'piatto'], svizzero: ['piatto', 'estruso', 'retino'], bauhaus: ['piatto', 'estruso', 'retino'],
  retro: ['estruso', 'tramonto', 'gonfio'], neon: ['neon', 'olografico', 'glitch'], brutalista: ['glitch', 'retino', 'cromo'],
  organico: ['ceramica', 'gonfio', 'linocut'], morbido: ['gonfio', 'vetro', 'olografico'], editoriale: ['linocut', 'piatto', 'oro'],
  galleria: ['piatto', 'linocut', 'ceramica'], riso: ['riso', 'retino'], poster: ['retino', 'piatto', 'estruso'], cromo: ['cromo', 'liquido', 'olografico'],
}
const ARRANGEMENTS = ['solo', 'solo', 'raggiera', 'pioggia', 'specchio', 'eco'] as const
/** Glifi pieni che reggono bene il 3D (i "linea" e "mezzatinta" sono più delicati). */
const HERO_GLYPHS = GLYPH_NAMES.filter(n => !/line|dot|hatch|inlay|echo/i.test(n))
const GENERATORS = ['membrana', 'corona', 'cromo', 'colata', 'vortice', 'costellazione', 'falce', 'goccia']

/** Colore del visual dalla palette: l'accento, o l'inchiostro se l'accento è troppo vicino allo sfondo. */
function visualColor(style: string, palette: number) {
  const s = STYLES.find(x => x.id === style)
  const p = s?.palettes[palette % (s?.palettes.length || 1)]
  return p?.accent ?? '#d9d9d9'
}

function makeVisual(R: () => number, style: string, palette: number, family: RecipeFamily): ComposeBoard['visual'] {
  if (family === 'foto' || family === 'dati' || family === 'elenco') return undefined
  const treatment = pick(R, STYLE_TREATMENTS[style] ?? Object.keys(TREATMENTS))
  const roll = R()
  const source = roll < 0.62 ? `glifo:${pick(R, HERO_GLYPHS)}` : roll < 0.85 ? `genera:${pick(R, GENERATORS)}` : 'pack:y2k'
  const arrangement = pick(R, [...ARRANGEMENTS])
  return { source, treatment, arrangement, color: visualColor(style, palette), opacity: treatment === 'piatto' ? 0.9 : 1 }
}

function describe(b: ComposeBoard) {
  const r = recipeOf(b.recipe)
  const v = b.visual ? ` · ${b.visual.source.replace(/^[a-z]+:/, '')} ${b.visual.treatment ?? ''}${b.visual.arrangement && b.visual.arrangement !== 'solo' ? ' ' + b.visual.arrangement : ''}` : ''
  return `${r?.layout ?? b.layout} · ${b.style}${v}`
}

export function generateTemplates(content: ComposeContent, opts: TemplateOpts): Proposal[] {
  const n = opts.count ?? 6
  const R = rng(opts.seed)
  const base: Partial<ComposeBoard> = { content, format: opts.format }
  const family = opts.family ?? familyFor(base)
  const out: Proposal[] = []
  const used = new Set<string>()

  const make = (recipeId: string, palette: number, visual: ComposeBoard['visual'] | undefined, finish: string[] | undefined): ComposeBoard => {
    const r = recipeOf(recipeId) ?? RECIPES[0]
    return {
      content, format: opts.format, ...recipeSpec(r), style: r.style, layout: r.layout, palette,
      ...(opts.visual !== false && visual ? { visual } : {}),
      finish: opts.finish === false ? [] : finish ?? STYLE_FINISH[r.style] ?? [],
    }
  }
  const push = (b: ComposeBoard) => {
    const key = `${b.recipe}|${b.palette}|${b.visual?.source}|${b.visual?.treatment}`
    if (used.has(key)) return
    used.add(key)
    out.push({ id: `p${out.length}-${opts.seed}`, board: b, label: describe(b) })
  }

  // 1. dagli esempi salvati: stessa ricetta, altra palette / visual / finitura
  const examples = (opts.examples ?? []).filter(e => recipeOf(e.recipe))
  for (let i = 0; i < Math.min(examples.length * 2, Math.ceil(n / 2)) && out.length < n; i++) {
    const ex = examples[Math.floor(R() * examples.length)]
    const style = STYLES.find(s => s.id === ex.style)
    const palette = Math.floor(R() * (style?.palettes.length ?? 1))
    const visual = ex.visual && R() < 0.6 ? { ...ex.visual, treatment: pick(R, STYLE_TREATMENTS[ex.style] ?? ['cromo']), color: visualColor(ex.style, palette) } : makeVisual(R, ex.style, palette, family)
    push(make(ex.recipe!, palette, visual, R() < 0.5 ? ex.finish : undefined))
  }

  // 2. dalla libreria: ricette della famiglia giusta, una per stile
  const recipes = pickRecipes({ ...base, style: opts.style }, n * 2, family)
  for (const r of recipes) {
    if (out.length >= n) break
    const style = STYLES.find(s => s.id === r.style)
    const palette = Math.floor(R() * (style?.palettes.length ?? 1))
    push(make(r.id, palette, R() < 0.75 ? makeVisual(R, r.style, palette, family) : undefined, undefined))
  }
  return out
}

// ── esempi salvati (per questo computer) ────────────────────────────────────
const KEY = 'studio.template-examples'
export function loadExamples(): ComposeBoard[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(v) ? v : [] } catch { return [] }
}
export function saveExample(b: ComposeBoard) {
  // si ricorda la forma, non i testi: l'esempio vale per contenuti nuovi
  const { content: _content, name: _name, ...form } = b
  void _content; void _name
  const list = [form as ComposeBoard, ...loadExamples().filter(e => !(e.recipe === b.recipe && e.palette === b.palette && e.visual?.source === b.visual?.source))].slice(0, 40)
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* archiviazione non disponibile */ }
  return list
}
export function removeExample(i: number) {
  const list = loadExamples(); list.splice(i, 1)
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* */ }
  return list
}
