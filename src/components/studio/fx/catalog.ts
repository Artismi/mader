/**
 * Catalogo del motore effetti: cosa si può regolare, quali effetti esistono e i
 * filtri pronti. È solo descrizione (niente WebGL): lo usano sia il pannello sia
 * il motore. I valori salvati sugli oggetti sono semplici numeri e colori.
 */

/* ───────── Regolazioni (−100…100, oppure 0…100) ───────── */
export type AdjustKey =
  | 'brightness' | 'contrast' | 'highlights' | 'shadows'
  | 'temperature' | 'tint' | 'saturation' | 'vibrance'
  | 'sharpen' | 'blur' | 'fade' | 'vignette' | 'grain'

export type Adjust = Partial<Record<AdjustKey, number>>

export const ADJUST_GROUPS: { label: string; items: { key: AdjustKey; label: string; min: number }[] }[] = [
  { label: 'Luce', items: [
    { key: 'brightness', label: 'Luminosità', min: -100 },
    { key: 'contrast', label: 'Contrasto', min: -100 },
    { key: 'highlights', label: 'Luci', min: -100 },
    { key: 'shadows', label: 'Ombre', min: -100 },
  ] },
  { label: 'Colore', items: [
    { key: 'temperature', label: 'Temperatura', min: -100 },
    { key: 'tint', label: 'Tinta', min: -100 },
    { key: 'saturation', label: 'Saturazione', min: -100 },
    { key: 'vibrance', label: 'Vividezza', min: -100 },
  ] },
  { label: 'Texture', items: [
    { key: 'sharpen', label: 'Nitidezza', min: 0 },
    { key: 'blur', label: 'Sfocatura', min: 0 },
    { key: 'fade', label: 'Dissolvenza', min: 0 },
    { key: 'vignette', label: 'Vignettatura', min: -100 },
    { key: 'grain', label: 'Grana', min: 0 },
  ] },
]

/* ───────── Filtri pronti ("look"), con intensità ───────── */
export interface Look { id: string; amount: number }
export const LOOKS: { id: string; label: string; adjust: Adjust }[] = [
  { id: 'luminoso', label: 'Luminoso', adjust: { brightness: 15, contrast: 10, vibrance: 25, highlights: -10 } },
  { id: 'caldo', label: 'Caldo', adjust: { temperature: 35, vibrance: 10, fade: 8 } },
  { id: 'freddo', label: 'Freddo', adjust: { temperature: -30, tint: -5, contrast: 8 } },
  { id: 'estate', label: 'Estate', adjust: { temperature: 20, brightness: 8, vibrance: 30, tint: 5 } },
  { id: 'pop', label: 'Pop', adjust: { saturation: 35, contrast: 25, vibrance: 20 } },
  { id: 'pastello', label: 'Pastello', adjust: { brightness: 15, contrast: -25, saturation: -20, fade: 25 } },
  { id: 'pellicola', label: 'Pellicola', adjust: { contrast: -8, fade: 30, temperature: 10, saturation: -10, grain: 35, vignette: 20 } },
  { id: 'vintage', label: 'Vintage', adjust: { fade: 40, temperature: 25, saturation: -25, tint: 8, grain: 30, vignette: 30 } },
  { id: 'cross', label: 'Cross', adjust: { contrast: 20, tint: 15, temperature: -10, highlights: 10, saturation: 15 } },
  { id: 'dramma', label: 'Dramma', adjust: { contrast: 40, highlights: -30, shadows: -20, saturation: -15, vignette: 40 } },
  { id: 'notte', label: 'Notte', adjust: { temperature: -40, brightness: -15, contrast: 15, saturation: -20, vignette: 25 } },
  { id: 'seppia', label: 'Seppia', adjust: { saturation: -100, temperature: 45, tint: 10, contrast: 5, fade: 15 } },
  { id: 'bn', label: 'Bianco e nero', adjust: { saturation: -100, contrast: 10 } },
  { id: 'noir', label: 'Noir', adjust: { saturation: -100, contrast: 35, shadows: -10, grain: 25, vignette: 35 } },
]

/* ───────── Effetti impilabili ───────── */
export type FxId =
  | 'shadow' | 'glow' | 'neon' | 'outline'
  | 'duotone' | 'halftone' | 'riso' | 'posterize' | 'pixel'
  | 'chroma' | 'glitch' | 'wave' | 'vhs'

export interface FxEntry { id: FxId; on: boolean; amount: number; p: Record<string, number | string> }

export type Param =
  | { key: string; label: string; type: 'range'; min: number; max: number; def: number }
  | { key: string; label: string; type: 'color'; def: string }
  | { key: string; label: string; type: 'toggle'; def: number }

export interface FxDef {
  id: FxId
  label: string
  group: 'Stile' | 'Colore' | 'Grafica' | 'Movimento'
  hint: string
  params: Param[]
  /** si anima quando "Velocità" è sopra zero */
  animated?: boolean
  /** l'intensità è già un parametro (es. opacità dell'ombra) */
  noAmount?: boolean
  /** margine in pixel di design per non tagliare l'effetto */
  pad?: (p: Record<string, number | string>) => number
}

const n = (v: number | string | undefined, d = 0) => (typeof v === 'number' ? v : Number(v ?? d) || d)

export const FX_DEFS: FxDef[] = [
  { id: 'shadow', label: 'Ombra', group: 'Stile', hint: 'ombra morbida sotto l’oggetto', noAmount: true, params: [
    { key: 'distance', label: 'Distanza', type: 'range', min: 0, max: 100, def: 12 },
    { key: 'angle', label: 'Direzione', type: 'range', min: 0, max: 360, def: 90 },
    { key: 'blur', label: 'Morbidezza', type: 'range', min: 0, max: 100, def: 24 },
    { key: 'opacity', label: 'Opacità', type: 'range', min: 0, max: 100, def: 35 },
    { key: 'color', label: 'Colore', type: 'color', def: '#000000' },
  ] },
  { id: 'glow', label: 'Bagliore', group: 'Stile', hint: 'alone di luce attorno alla forma', pad: p => n(p.size, 18) * 1.1, params: [
    { key: 'size', label: 'Ampiezza', type: 'range', min: 2, max: 80, def: 18 },
    { key: 'strength', label: 'Forza', type: 'range', min: 0, max: 100, def: 70 },
    { key: 'color', label: 'Colore', type: 'color', def: '#ffd166' },
  ] },
  { id: 'neon', label: 'Neon', group: 'Stile', hint: 'tubo di luce colorata', pad: p => n(p.size, 14) * 1.1, params: [
    { key: 'size', label: 'Ampiezza', type: 'range', min: 2, max: 60, def: 14 },
    { key: 'strength', label: 'Forza', type: 'range', min: 0, max: 100, def: 85 },
    { key: 'color', label: 'Colore', type: 'color', def: '#3df5ff' },
  ] },
  { id: 'outline', label: 'Contorno', group: 'Stile', hint: 'bordo pieno attorno alla forma, anche sul testo', pad: p => n(p.width, 6) + 2, params: [
    { key: 'width', label: 'Spessore', type: 'range', min: 1, max: 40, def: 6 },
    { key: 'color', label: 'Colore', type: 'color', def: '#ffffff' },
  ] },
  { id: 'duotone', label: 'Duotone', group: 'Colore', hint: 'due colori: uno per le ombre, uno per le luci', params: [
    { key: 'c1', label: 'Ombre', type: 'color', def: '#1d1a6e' },
    { key: 'c2', label: 'Luci', type: 'color', def: '#ff7aa8' },
  ] },
  { id: 'posterize', label: 'Poster', group: 'Colore', hint: 'pochi livelli di colore, effetto serigrafia', params: [
    { key: 'levels', label: 'Livelli', type: 'range', min: 2, max: 12, def: 4 },
  ] },
  { id: 'halftone', label: 'Retino', group: 'Grafica', hint: 'puntini da stampa, come i fumetti', params: [
    { key: 'size', label: 'Puntini', type: 'range', min: 3, max: 40, def: 9 },
    { key: 'angle', label: 'Angolo', type: 'range', min: 0, max: 90, def: 45 },
    { key: 'colored', label: 'Colori originali', type: 'toggle', def: 1 },
    { key: 'ink', label: 'Inchiostro', type: 'color', def: '#111111' },
    { key: 'paperOn', label: 'Carta', type: 'toggle', def: 0 },
    { key: 'paper', label: 'Colore carta', type: 'color', def: '#f4efe6' },
  ] },
  { id: 'riso', label: 'Risograph', group: 'Grafica', hint: 'due inchiostri fuori registro su carta', pad: p => n(p.offset, 4) + 2, params: [
    { key: 'ink1', label: 'Inchiostro 1', type: 'color', def: '#ff48b0' },
    { key: 'ink2', label: 'Inchiostro 2', type: 'color', def: '#0078bf' },
    { key: 'paper', label: 'Carta', type: 'color', def: '#f2ede4' },
    { key: 'size', label: 'Grana', type: 'range', min: 3, max: 30, def: 6 },
    { key: 'offset', label: 'Fuori registro', type: 'range', min: 0, max: 20, def: 4 },
  ] },
  { id: 'pixel', label: 'Pixel', group: 'Grafica', hint: 'blocchi di colore', params: [
    { key: 'size', label: 'Blocchi', type: 'range', min: 2, max: 60, def: 10 },
  ] },
  { id: 'chroma', label: 'Aberrazione', group: 'Movimento', hint: 'canali di colore leggermente sfasati', pad: p => n(p.px, 6) * 1.6 + 2, params: [
    { key: 'px', label: 'Sfasamento', type: 'range', min: 0, max: 40, def: 6 },
  ] },
  { id: 'glitch', label: 'Glitch', group: 'Movimento', hint: 'strisce spostate e colori separati', animated: true, pad: () => 24, params: [
    { key: 'power', label: 'Danno', type: 'range', min: 0, max: 100, def: 40 },
    { key: 'speed', label: 'Velocità', type: 'range', min: 0, max: 100, def: 0 },
  ] },
  { id: 'wave', label: 'Onda', group: 'Movimento', hint: 'deformazione ondulata', animated: true, pad: p => n(p.amp, 8) + 2, params: [
    { key: 'amp', label: 'Ampiezza', type: 'range', min: 0, max: 40, def: 8 },
    { key: 'freq', label: 'Frequenza', type: 'range', min: 1, max: 30, def: 6 },
    { key: 'speed', label: 'Velocità', type: 'range', min: 0, max: 100, def: 0 },
  ] },
  { id: 'vhs', label: 'VHS', group: 'Movimento', hint: 'videocassetta: righe e colori che sbavano', animated: true, pad: () => 6, params: [
    { key: 'power', label: 'Forza', type: 'range', min: 0, max: 100, def: 60 },
    { key: 'speed', label: 'Velocità', type: 'range', min: 0, max: 100, def: 40 },
  ] },
]

export const fxDef = (id: string) => FX_DEFS.find(d => d.id === id)

export function newFx(id: FxId): FxEntry {
  const d = fxDef(id)!
  return { id, on: true, amount: 100, p: Object.fromEntries(d.params.map(p => [p.key, p.def])) }
}
