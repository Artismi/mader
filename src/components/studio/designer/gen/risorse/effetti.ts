/**
 * Effetti dal catalogo completo dello Studio (fx/catalog: ~50 effetti, ~150
 * varianti, 30 filtri pronti), scelti per umore del registro e per
 * compatibilità con il bersaglio (foto, fondo, titolo, forma). Il titolo
 * riceve solo effetti a basso rischio di lettura e mai sotto un corpo minimo;
 * i testi correnti non ne ricevono mai. I colori degli effetti vengono dalla
 * palette della tavola, non dalle varianti del catalogo.
 */
import { FX_DEFS, LOOKS, type FxDef } from '../../../fx/catalog'
import type { FxSpec } from '../../types'
import type { RegistroId } from '../../styles'

export type Bersaglio = 'foto' | 'fondo' | 'titolo' | 'forma'
type Umore = RegistroId | '*'
/** su: bersagli ammessi; umori: registri a cui si addice; rischio: 0 (innocuo) … 1 (copre la lettura) */
interface Tag { su: Bersaglio[]; umori: Umore[]; rischio: number }

const T = (su: Bersaglio[], umori: Umore[], rischio: number): Tag => ({ su, umori, rischio })
const TUTTI: Umore[] = ['*']

/** Tag di compatibilità per ogni effetto del catalogo (gli effetti non elencati non entrano). */
export const TAG_FX: Record<string, Tag> = {
  material3d: T(['forma', 'titolo'], ['pop', 'tech', 'notte', 'infantile', 'sportivo'], 0.35),
  genFill: T(['fondo', 'forma'], TUTTI, 0),
  dropShadow: T(['titolo', 'forma', 'foto'], ['pop', 'infantile', 'retro', 'sportivo', 'artigianale', 'editoriale'], 0.05),
  innerShadow: T(['forma'], ['artigianale', 'retro', 'lusso'], 0.05),
  outerGlow: T(['titolo', 'forma'], ['notte', 'tech'], 0.15),
  innerGlow: T(['forma'], ['notte', 'tech'], 0.1),
  bevel: T(['forma'], ['retro', 'lusso'], 0.15),
  stroke: T(['titolo', 'forma'], ['pop', 'infantile', 'sportivo', 'avanguardia'], 0.1),
  satin: T(['forma'], ['lusso'], 0.1),
  colorOverlay: T(['forma'], TUTTI, 0),
  gradientOverlay: T(['forma', 'fondo'], ['pop', 'tech', 'notte'], 0.05),
  textureOverlay: T(['fondo', 'forma', 'foto'], TUTTI, 0.05),
  neon: T(['titolo'], ['notte', 'tech', 'retro'], 0.2),
  echo: T(['titolo', 'forma'], ['pop', 'avanguardia', 'retro', 'sportivo'], 0.3),
  impressione: T(['titolo', 'forma'], ['artigianale', 'lusso', 'editoriale'], 0.1),
  foil: T(['titolo', 'forma'], ['lusso', 'notte'], 0.15),
  stitch: T(['forma'], ['artigianale', 'infantile'], 0.2),
  vetro: T(['foto'], ['tech', 'avanguardia', 'notte'], 0.3),
  specchi: T(['foto'], ['avanguardia', 'pop'], 0.4),
  caleido: T(['foto', 'fondo'], ['avanguardia', 'pop', 'notte'], 0.5),
  luceProiettata: T(['foto', 'fondo'], ['editoriale', 'lusso', 'notte'], 0.2),
  colata: T(['forma'], ['avanguardia', 'notte'], 0.4),
  raggi: T(['foto', 'fondo'], ['notte', 'sportivo', 'pop'], 0.25),
  glitter: T(['forma'], ['infantile', 'pop', 'notte'], 0.3),
  ascii: T(['foto'], ['tech', 'avanguardia'], 0.4),
  linocut: T(['foto'], ['artigianale', 'retro', 'editoriale'], 0.3),
  lowPoly: T(['foto'], ['tech', 'pop'], 0.35),
  pixelSort: T(['foto'], ['avanguardia', 'tech', 'notte'], 0.4),
  grunge: T(['titolo', 'forma', 'foto'], ['artigianale', 'retro', 'sportivo', 'avanguardia'], 0.15),
  hollow: T([], [], 1),
  splice: T(['titolo'], ['avanguardia', 'sportivo'], 0.35),
  longShadow: T(['titolo', 'forma'], ['retro', 'pop', 'sportivo'], 0.1),
  extrude: T(['titolo'], ['pop', 'retro', 'sportivo', 'infantile'], 0.15),
  glitch: T(['titolo', 'foto'], ['tech', 'notte', 'avanguardia'], 0.35),
  bloom: T(['foto'], ['notte', 'lusso', 'tech'], 0.2),
  lightLeak: T(['foto'], ['retro', 'editoriale', 'notte'], 0.2),
  halftone: T(['foto', 'forma'], ['pop', 'retro', 'editoriale', 'sportivo', 'avanguardia'], 0.3),
  riso: T(['foto', 'forma'], ['artigianale', 'pop', 'avanguardia', 'editoriale'], 0.25),
  dither: T(['foto'], ['tech', 'avanguardia', 'retro'], 0.35),
  screenprint: T(['foto'], ['pop', 'avanguardia', 'sportivo', 'notte'], 0.3),
  gradientMap: T(['foto'], TUTTI, 0.15),
  posterize: T(['foto'], ['pop', 'avanguardia', 'sportivo'], 0.25),
  tiltShift: T(['foto'], ['editoriale', 'lusso'], 0.1),
  motionBlur: T(['foto'], ['sportivo', 'notte'], 0.3),
  zoomBlur: T(['foto'], ['sportivo', 'notte', 'pop'], 0.35),
  wave: T(['foto'], ['avanguardia', 'infantile'], 0.4),
  ripple: T(['foto'], ['avanguardia'], 0.4),
  twirl: T(['foto'], ['avanguardia', 'infantile'], 0.5),
  bulge: T(['foto'], ['pop', 'infantile'], 0.35),
  mosaic: T(['foto'], ['tech', 'pop'], 0.4),
  chroma: T(['foto', 'titolo'], ['tech', 'notte', 'avanguardia', 'pop'], 0.2),
  vhs: T(['foto'], ['retro', 'notte', 'tech'], 0.35),
  crt: T(['foto'], ['tech', 'retro'], 0.35),
}

/** Filtri pronti (LOOKS) per famiglia → registri. */
const LOOK_UMORI: Record<string, Umore[]> = {
  Naturali: ['editoriale', 'lusso', 'artigianale', 'svizzero', 'infantile'],
  Pellicola: ['retro', 'editoriale', 'artigianale', 'notte'],
  Cinema: ['notte', 'lusso', 'editoriale', 'sportivo'],
  'Bianco e nero': ['svizzero', 'avanguardia', 'editoriale', 'lusso', 'sportivo'],
  Creativi: ['pop', 'tech', 'avanguardia', 'infantile', 'notte'],
}

const addice = (u: Umore[], reg: RegistroId) => u.includes('*') || u.includes(reg)

/** Effetti ammessi per bersaglio, registro e soglia di rischio. */
export function candidati(b: Bersaglio, reg: RegistroId, rischioMax: number): FxDef[] {
  return FX_DEFS.filter(d => { const t = TAG_FX[d.id]; return t && t.su.includes(b) && addice(t.umori, reg) && t.rischio <= rischioMax })
}

export function looksPer(reg: RegistroId): string[] {
  return LOOKS.filter(l => addice(LOOK_UMORI[l.family] ?? [], reg)).map(l => l.id)
}

/** I colori dei parametri dell'effetto presi dalla palette (in ordine). */
function coloriDaPalette(d: FxDef, colori: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  let i = 0
  for (const p of d.params) if (p.type === 'color') out[p.key] = colori[i++ % colori.length]
  return out
}

/** Un effetto del catalogo per il bersaglio: variante scelta dal seme, colori dalla palette. */
export function scegliFx(pick: <X>(l: readonly X[]) => X, b: Bersaglio, reg: RegistroId, colori: string[], rischioMax: number, escludi: string[] = []): FxSpec | null {
  const cs = candidati(b, reg, rischioMax).filter(d => !escludi.includes(d.id))
  if (!cs.length) return null
  const d = pick(cs)
  const v = d.variants.length ? pick(d.variants) : undefined
  // le mappe di colore e i riempimenti seguono la palette; gli effetti di luce tengono i loro colori
  const tinge = ['genFill', 'gradientMap', 'riso', 'screenprint', 'halftone', 'colorOverlay', 'gradientOverlay', 'neon', 'outerGlow', 'stroke', 'longShadow', 'extrude', 'echo', 'foil', 'dither', 'posterize', 'linocut']
  return { id: d.id, variant: v?.id, p: tinge.includes(d.id) ? coloriDaPalette(d, colori) : undefined }
}
