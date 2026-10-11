/**
 * Catalogo del motore effetti: cosa si può regolare, quali effetti esistono, le
 * loro varianti già curate e i filtri pronti. Solo descrizione, niente WebGL.
 * Sugli oggetti si salvano numeri e colori: `adjust` (regolazioni), `look`
 * (filtro pronto + intensità), `fx` (pila di effetti).
 */

/* ════════════════════════ REGOLAZIONI ════════════════════════ */
export type Adjust = Record<string, number>
export interface AdjustDef { key: string; label: string; min: number; max: number; def?: number }

export const ADJUST_GROUPS: { id: string; label: string; items: AdjustDef[] }[] = [
  { id: 'wb', label: 'Bilanciamento', items: [
    { key: 'temperature', label: 'Temperatura', min: -100, max: 100 },
    { key: 'tint', label: 'Tinta', min: -100, max: 100 },
  ] },
  { id: 'tone', label: 'Tono', items: [
    { key: 'exposure', label: 'Esposizione', min: -100, max: 100 },
    { key: 'contrast', label: 'Contrasto', min: -100, max: 100 },
    { key: 'highlights', label: 'Luci', min: -100, max: 100 },
    { key: 'shadows', label: 'Ombre', min: -100, max: 100 },
    { key: 'whites', label: 'Bianchi', min: -100, max: 100 },
    { key: 'blacks', label: 'Neri', min: -100, max: 100 },
  ] },
  { id: 'presence', label: 'Presenza', items: [
    { key: 'clarity', label: 'Chiarezza', min: -100, max: 100 },
    { key: 'vibrance', label: 'Vividezza', min: -100, max: 100 },
    { key: 'saturation', label: 'Saturazione', min: -100, max: 100 },
  ] },
  { id: 'detail', label: 'Dettaglio', items: [
    { key: 'sharpen', label: 'Nitidezza', min: 0, max: 100 },
    { key: 'blur', label: 'Sfocatura', min: 0, max: 100 },
  ] },
  { id: 'film', label: 'Pellicola', items: [
    { key: 'fade', label: 'Dissolvenza', min: 0, max: 100 },
    { key: 'halation', label: 'Halation', min: 0, max: 100 },
    { key: 'grain', label: 'Grana', min: 0, max: 100 },
    { key: 'grainSize', label: 'Dimensione grana', min: 0, max: 100, def: 25 },
    { key: 'vignette', label: 'Vignettatura', min: -100, max: 100 },
    { key: 'vigFeather', label: 'Sfumatura vignetta', min: 0, max: 100, def: 50 },
  ] },
]

export const CURVES = ['Lineare', 'S morbida', 'S forte', 'Neri sollevati', 'Cinema', 'Alte luci morbide'] as const

/** color grading a tre ruote, come Lightroom: tinta (0–360) e forza (0–100) per zona */
export const GRADE_ZONES = [
  { key: 'gSh', label: 'Ombre' },
  { key: 'gMid', label: 'Mezzitoni' },
  { key: 'gHi', label: 'Luci' },
] as const

/** mixer colore: 8 tonalità, ognuna con tinta, saturazione e luminanza */
export const HSL_BANDS = [
  { key: 'red', label: 'Rossi', hue: 0, swatch: '#ff4b4b' },
  { key: 'orange', label: 'Arancioni', hue: 30, swatch: '#ff9a3c' },
  { key: 'yellow', label: 'Gialli', hue: 58, swatch: '#ffe14b' },
  { key: 'green', label: 'Verdi', hue: 115, swatch: '#4bd463' },
  { key: 'aqua', label: 'Acqua', hue: 180, swatch: '#3cd9d9' },
  { key: 'blue', label: 'Blu', hue: 225, swatch: '#3c6bff' },
  { key: 'purple', label: 'Viola', hue: 275, swatch: '#9b5cff' },
  { key: 'magenta', label: 'Magenta', hue: 320, swatch: '#ff4bd2' },
] as const

/* ════════════════════════ FILTRI PRONTI ════════════════════════
   Costruiti come fa un fotografo: curva, viraggio diverso tra ombre e luci,
   colori spostati per tonalità, grana e halation dove servono. */
export interface Look { id: string; amount: number }
export interface LookDef { id: string; label: string; family: string; adjust: Adjust }

export const LOOKS: LookDef[] = [
  // Naturali
  { id: 'luminoso', label: 'Luminoso', family: 'Naturali', adjust: { exposure: 12, contrast: 8, highlights: -18, shadows: 15, vibrance: 22 } },
  { id: 'morbido', label: 'Morbido', family: 'Naturali', adjust: { contrast: -18, highlights: -20, shadows: 18, clarity: -15, vibrance: 8, curve: 5 } },
  { id: 'nitido', label: 'Nitido', family: 'Naturali', adjust: { contrast: 12, clarity: 35, sharpen: 30, vibrance: 12, blacks: -8 } },
  { id: 'vivace', label: 'Vivace', family: 'Naturali', adjust: { contrast: 15, vibrance: 40, saturation: 10, curve: 1, whites: 8 } },
  { id: 'caldo', label: 'Caldo', family: 'Naturali', adjust: { temperature: 28, tint: 4, vibrance: 10, gHi_h: 40, gHi_s: 18 } },
  { id: 'freddo', label: 'Freddo', family: 'Naturali', adjust: { temperature: -25, tint: -4, contrast: 6, gSh_h: 215, gSh_s: 20 } },
  // Pellicola
  { id: 'portra', label: 'Portra', family: 'Pellicola', adjust: { temperature: 10, contrast: -10, curve: 3, fade: 12, saturation: -8, hsl_orange_s: 8, hsl_orange_l: 6, hsl_green_h: 18, hsl_green_s: -25, gSh_h: 190, gSh_s: 10, gHi_h: 35, gHi_s: 14, grain: 22, grainSize: 30, halation: 10 } },
  { id: 'ektar', label: 'Ektar', family: 'Pellicola', adjust: { contrast: 22, saturation: 18, vibrance: 15, curve: 1, hsl_red_s: 15, hsl_blue_s: 20, hsl_blue_l: -10, blacks: -10, grain: 15, grainSize: 20 } },
  { id: 'fuji', label: 'Fuji 400', family: 'Pellicola', adjust: { temperature: -6, tint: 6, curve: 3, fade: 10, hsl_green_h: -12, hsl_green_s: 10, hsl_blue_h: -8, gSh_h: 165, gSh_s: 16, gHi_h: 330, gHi_s: 8, grain: 25, grainSize: 30 } },
  { id: 'cinestill', label: 'Cinestill 800T', family: 'Pellicola', adjust: { temperature: -30, tint: 8, contrast: 10, curve: 4, halation: 70, gSh_h: 200, gSh_s: 22, gHi_h: 20, gHi_s: 12, grain: 35, grainSize: 40, vignette: 15 } },
  { id: 'kodachrome', label: 'Kodachrome', family: 'Pellicola', adjust: { contrast: 25, saturation: 12, curve: 2, hsl_red_s: 22, hsl_red_l: -8, hsl_yellow_h: -6, hsl_blue_l: -15, temperature: 6, blacks: -12, grain: 12 } },
  { id: 'polaroid', label: 'Polaroid', family: 'Pellicola', adjust: { fade: 35, contrast: -12, saturation: -15, temperature: 8, gSh_h: 185, gSh_s: 28, gHi_h: 45, gHi_s: 22, vignette: 28, vigFeather: 70, grain: 18, curve: 3 } },
  { id: 'scaduta', label: 'Scaduta', family: 'Pellicola', adjust: { fade: 40, tint: 22, temperature: 12, saturation: -20, gSh_h: 290, gSh_s: 25, gHi_h: 60, gHi_s: 20, grain: 55, grainSize: 55, vignette: 30, halation: 25 } },
  // Cinema
  { id: 'tealorange', label: 'Teal & Orange', family: 'Cinema', adjust: { contrast: 18, gSh_h: 190, gSh_s: 38, gHi_h: 32, gHi_s: 30, hsl_orange_s: 12, hsl_aqua_h: -10, hsl_blue_h: -25, saturation: -5, curve: 4 } },
  { id: 'notturno', label: 'Notturno', family: 'Cinema', adjust: { exposure: -12, temperature: -35, contrast: 15, saturation: -25, gSh_h: 225, gSh_s: 30, halation: 30, vignette: 30 } },
  { id: 'deserto', label: 'Deserto', family: 'Cinema', adjust: { temperature: 30, contrast: 10, hsl_green_s: -50, hsl_blue_s: -30, hsl_orange_s: 10, gHi_h: 38, gHi_s: 25, fade: 10, curve: 4 } },
  { id: 'bleach', label: 'Bleach bypass', family: 'Cinema', adjust: { saturation: -55, contrast: 40, clarity: 25, blacks: -15, highlights: -15, curve: 2, grain: 18 } },
  { id: 'matrix', label: 'Codice', family: 'Cinema', adjust: { tint: -25, temperature: -10, contrast: 20, gSh_h: 140, gSh_s: 30, gHi_h: 100, gHi_s: 15, saturation: -20, curve: 4 } },
  // Bianco e nero
  { id: 'bn', label: 'Bianco e nero', family: 'Bianco e nero', adjust: { saturation: -100, contrast: 12, clarity: 10 } },
  { id: 'trix', label: 'Tri-X', family: 'Bianco e nero', adjust: { saturation: -100, contrast: 35, curve: 2, blacks: -15, grain: 55, grainSize: 45, clarity: 15 } },
  { id: 'argento', label: 'Argento', family: 'Bianco e nero', adjust: { saturation: -100, exposure: 15, contrast: -15, highlights: 20, fade: 15, curve: 5 } },
  { id: 'noir', label: 'Noir', family: 'Bianco e nero', adjust: { saturation: -100, contrast: 45, shadows: -25, curve: 2, vignette: 45, grain: 30 } },
  { id: 'seppia', label: 'Seppia', family: 'Bianco e nero', adjust: { saturation: -100, gSh_h: 30, gSh_s: 35, gMid_h: 35, gMid_s: 30, gHi_h: 45, gHi_s: 20, fade: 15, contrast: 5 } },
  { id: 'cianotipia', label: 'Cianotipia', family: 'Bianco e nero', adjust: { saturation: -100, gSh_h: 215, gSh_s: 70, gMid_h: 205, gMid_s: 55, gHi_h: 195, gHi_s: 25, contrast: 10, fade: 10 } },
  // Creativi
  { id: 'sogno', label: 'Sogno', family: 'Creativi', adjust: { exposure: 10, contrast: -25, fade: 25, clarity: -40, halation: 40, gHi_h: 330, gHi_s: 18, gSh_h: 260, gSh_s: 15 } },
  { id: 'vapor', label: 'Vaporwave', family: 'Creativi', adjust: { gSh_h: 270, gSh_s: 45, gHi_h: 180, gHi_s: 40, saturation: 15, contrast: 10, hsl_blue_h: 30, hsl_red_h: -20 } },
  { id: 'lomo', label: 'Lomo', family: 'Creativi', adjust: { contrast: 35, saturation: 30, vignette: 60, vigFeather: 40, curve: 2, gSh_h: 210, gSh_s: 18 } },
  { id: 'pastello', label: 'Pastello', family: 'Creativi', adjust: { exposure: 15, contrast: -30, saturation: -15, fade: 30, gHi_h: 340, gHi_s: 12, gSh_h: 200, gSh_s: 12 } },
  { id: 'acido', label: 'Acido', family: 'Creativi', adjust: { saturation: 40, contrast: 25, hsl_green_h: -30, hsl_blue_h: 40, hsl_red_h: 25, tint: -15, clarity: 20 } },
  { id: 'tramonto', label: 'Tramonto', family: 'Creativi', adjust: { temperature: 45, tint: 15, gSh_h: 280, gSh_s: 25, gHi_h: 30, gHi_s: 35, contrast: 10, halation: 20 } },
]

/* ════════════════════════ EFFETTI ════════════════════════ */
export type FxId =
  | 'dropShadow' | 'innerShadow' | 'outerGlow' | 'innerGlow' | 'bevel' | 'stroke' | 'satin'
  | 'colorOverlay' | 'gradientOverlay' | 'textureOverlay'
  | 'neon' | 'echo' | 'hollow' | 'splice' | 'longShadow' | 'extrude' | 'glitch'
  | 'bloom' | 'lightLeak'
  | 'halftone' | 'riso' | 'dither' | 'screenprint'
  | 'gradientMap' | 'posterize'
  | 'tiltShift' | 'motionBlur' | 'zoomBlur'
  | 'wave' | 'ripple' | 'twirl' | 'bulge' | 'mosaic' | 'chroma'
  | 'vhs' | 'crt'

export type PVal = number | string
export interface FxEntry { id: FxId; on: boolean; amount: number; p: Record<string, PVal>; variant?: string }

export type Param =
  | { key: string; label: string; type: 'range'; min: number; max: number; def: number }
  | { key: string; label: string; type: 'color'; def: string }
  | { key: string; label: string; type: 'toggle'; def: number }
  | { key: string; label: string; type: 'select'; options: string[]; def: number }

export interface FxDef {
  id: FxId
  label: string
  cat: FxCat
  hint: string
  params: Param[]
  variants: { id: string; label: string; p: Record<string, PVal> }[]
  animated?: boolean
  noAmount?: boolean
  /** margine attorno all'oggetto, in pixel di design */
  pad?: (p: Record<string, PVal>) => number
}

export const FX_CATS = ['Stile', 'Testo', 'Luce', 'Stampa', 'Colore', 'Foto', 'Distorsione', 'Schermo'] as const
export type FxCat = typeof FX_CATS[number]

export const BLENDS = ['Normale', 'Moltiplica', 'Schermo', 'Sovrapponi', 'Luce soffusa', 'Aggiungi', 'Colore scherma', 'Colore']

const n = (v: PVal | undefined, d = 0) => (typeof v === 'number' ? v : Number(v ?? d) || d)
const r = (key: string, label: string, min: number, max: number, def: number): Param => ({ key, label, type: 'range', min, max, def })
const c = (key: string, label: string, def: string): Param => ({ key, label, type: 'color', def })
const t = (key: string, label: string, def = 0): Param => ({ key, label, type: 'toggle', def })
const s = (key: string, label: string, options: string[], def = 0): Param => ({ key, label, type: 'select', options, def })

export const FX_DEFS: FxDef[] = [
  /* ─── Stile (come gli stili livello di Photoshop) ─── */
  { id: 'dropShadow', label: 'Ombra', cat: 'Stile', hint: 'ombra proiettata con distanza, espansione e morbidezza', noAmount: true,
    pad: p => n(p.distance, 12) + n(p.spread) + n(p.size, 20) * 1.3,
    params: [c('color', 'Colore', '#000000'), r('opacity', 'Opacità', 0, 100, 35), r('angle', 'Direzione', 0, 360, 90), r('distance', 'Distanza', 0, 200, 12), r('spread', 'Espansione', 0, 60, 0), r('size', 'Morbidezza', 0, 120, 20)],
    variants: [
      { id: 'morbida', label: 'Morbida', p: { opacity: 30, distance: 10, size: 24, spread: 0, color: '#000000' } },
      { id: 'contatto', label: 'Contatto', p: { opacity: 45, distance: 3, size: 8, spread: 0, color: '#000000' } },
      { id: 'sollevata', label: 'Sollevata', p: { opacity: 28, distance: 30, size: 55, spread: 0, color: '#1b1530' } },
      { id: 'netta', label: 'Netta', p: { opacity: 100, distance: 8, size: 0, spread: 0, color: '#111111', angle: 45 } },
      { id: 'retro', label: 'Retrò', p: { opacity: 100, distance: 10, size: 0, spread: 0, color: '#1d1a6e', angle: 45 } },
      { id: 'colorata', label: 'Colorata', p: { opacity: 60, distance: 14, size: 28, spread: 0, color: '#7c3aed' } },
    ] },
  { id: 'innerShadow', label: 'Ombra interna', cat: 'Stile', hint: 'incavo: l’oggetto sembra scavato', noAmount: true,
    params: [c('color', 'Colore', '#000000'), r('opacity', 'Opacità', 0, 100, 45), r('angle', 'Direzione', 0, 360, 120), r('distance', 'Distanza', 0, 60, 6), r('choke', 'Riduzione', 0, 40, 0), r('size', 'Morbidezza', 0, 60, 10)],
    variants: [
      { id: 'incavo', label: 'Incavo', p: { opacity: 45, distance: 6, size: 10 } },
      { id: 'stampato', label: 'Stampato', p: { opacity: 70, distance: 2, size: 3 } },
      { id: 'profondo', label: 'Profondo', p: { opacity: 60, distance: 14, size: 24 } },
      { id: 'luce', label: 'Luce interna', p: { opacity: 55, distance: 4, size: 6, color: '#ffffff', angle: 300 } },
    ] },
  { id: 'outerGlow', label: 'Bagliore', cat: 'Stile', hint: 'alone di luce attorno alla forma, anche a due colori', noAmount: true,
    pad: p => n(p.spread) + n(p.size, 24) * 1.4,
    params: [c('color', 'Colore', '#ffd166'), c('color2', 'Colore esterno', '#ff6b6b'), t('two', 'Due colori', 0), r('opacity', 'Opacità', 0, 100, 80), r('spread', 'Espansione', 0, 40, 0), r('size', 'Ampiezza', 2, 150, 24)],
    variants: [
      { id: 'caldo', label: 'Caldo', p: { color: '#ffd166', two: 0, size: 24, opacity: 80 } },
      { id: 'aura', label: 'Aura', p: { color: '#ffffff', color2: '#a78bfa', two: 1, size: 70, opacity: 70 } },
      { id: 'fuoco', label: 'Fuoco', p: { color: '#fff3b0', color2: '#ff3d00', two: 1, size: 40, opacity: 90 } },
      { id: 'ghiaccio', label: 'Ghiaccio', p: { color: '#e0fbff', color2: '#00b4ff', two: 1, size: 34, opacity: 85 } },
      { id: 'alone', label: 'Alone stretto', p: { color: '#ffffff', two: 0, size: 8, spread: 3, opacity: 90 } },
    ] },
  { id: 'innerGlow', label: 'Bagliore interno', cat: 'Stile', hint: 'luce che parte dai bordi o dal centro', noAmount: true,
    params: [c('color', 'Colore', '#fff3c4'), r('opacity', 'Opacità', 0, 100, 55), s('source', 'Origine', ['Bordi', 'Centro'], 0), r('choke', 'Riduzione', 0, 40, 0), r('size', 'Ampiezza', 1, 80, 5)],
    variants: [
      { id: 'bordi', label: 'Bordi', p: { source: 0, size: 5, opacity: 55 } },
      { id: 'centro', label: 'Centro', p: { source: 1, size: 12, opacity: 45 } },
      { id: 'vetro', label: 'Vetro', p: { source: 0, size: 3, color: '#ffffff', opacity: 80 } },
    ] },
  { id: 'bevel', label: 'Rilievo', cat: 'Stile', hint: 'smusso con luce e ombra: plastica, metallo, cuscino', noAmount: true,
    pad: p => (n(p.style) === 1 || n(p.style) === 2 ? n(p.size, 10) + 2 : 0),
    params: [s('style', 'Stile', ['Smusso interno', 'Smusso esterno', 'Rilievo', 'Cuscino'], 0), s('technique', 'Tecnica', ['Morbida', 'Scolpita'], 0), r('depth', 'Profondità', 1, 300, 100), r('size', 'Dimensione', 1, 60, 10), r('soften', 'Ammorbidisci', 0, 20, 2), r('angle', 'Luce · direzione', 0, 360, 120), r('altitude', 'Luce · altezza', 5, 85, 32), r('gloss', 'Lucido', 0, 100, 0), c('hiColor', 'Colore luce', '#ffffff'), r('hiOpacity', 'Opacità luce', 0, 100, 75), c('shColor', 'Colore ombra', '#000000'), r('shOpacity', 'Opacità ombra', 0, 100, 60)],
    variants: [
      { id: 'morbido', label: 'Morbido', p: { style: 0, technique: 0, size: 10, depth: 100, gloss: 0 } },
      { id: 'scolpito', label: 'Scolpito', p: { style: 0, technique: 1, size: 8, depth: 160 } },
      { id: 'cuscino', label: 'Cuscino', p: { style: 3, technique: 0, size: 10, depth: 120 } },
      { id: 'rilievo', label: 'Rilievo', p: { style: 2, technique: 0, size: 6, depth: 140 } },
      { id: 'metallo', label: 'Metallo', p: { style: 0, technique: 1, size: 12, depth: 220, gloss: 70, hiColor: '#fff8e1', shColor: '#3b2a12', hiOpacity: 90, shOpacity: 70 } },
      { id: 'gonfio', label: 'Gonfio', p: { style: 0, technique: 0, size: 30, depth: 80, soften: 6, altitude: 45 } },
    ] },
  { id: 'stroke', label: 'Contorno', cat: 'Stile', hint: 'bordo nitido fuori, dentro o al centro, anche sfumato', noAmount: true,
    pad: p => (n(p.position) === 2 ? 0 : n(p.size, 6) + 2),
    params: [s('position', 'Posizione', ['Esterno', 'Centrato', 'Interno'], 0), r('size', 'Spessore', 1, 80, 6), c('color', 'Colore', '#ffffff'), t('gradient', 'Sfumato', 0), c('color2', 'Colore 2', '#7c3aed'), r('gangle', 'Angolo sfumatura', 0, 360, 90), r('opacity', 'Opacità', 0, 100, 100)],
    variants: [
      { id: 'sottile', label: 'Sottile', p: { position: 0, size: 2, color: '#111111', gradient: 0 } },
      { id: 'adesivo', label: 'Adesivo', p: { position: 0, size: 16, color: '#ffffff', gradient: 0 } },
      { id: 'spesso', label: 'Spesso', p: { position: 0, size: 10, color: '#111111', gradient: 0 } },
      { id: 'sfumato', label: 'Sfumato', p: { position: 0, size: 8, color: '#ff5f6d', color2: '#ffc371', gradient: 1 } },
      { id: 'interno', label: 'Interno', p: { position: 2, size: 4, color: '#ffffff', gradient: 0 } },
    ] },
  { id: 'satin', label: 'Raso', cat: 'Stile', hint: 'riflessi morbidi all’interno, come tessuto lucido', noAmount: true,
    params: [c('color', 'Colore', '#000000'), r('opacity', 'Opacità', 0, 100, 40), r('angle', 'Angolo', 0, 360, 19), r('distance', 'Distanza', 1, 100, 14), r('size', 'Morbidezza', 1, 80, 16), t('invert', 'Inverti', 0)],
    variants: [
      { id: 'scuro', label: 'Scuro', p: { color: '#000000', opacity: 40 } },
      { id: 'chiaro', label: 'Chiaro', p: { color: '#ffffff', opacity: 45, invert: 1 } },
      { id: 'seta', label: 'Seta', p: { color: '#3a1a5e', opacity: 50, distance: 24, size: 30 } },
    ] },
  { id: 'colorOverlay', label: 'Colore', cat: 'Stile', hint: 'ricolora l’oggetto con un modo di fusione', noAmount: true,
    params: [c('color', 'Colore', '#ff5a5f'), s('blend', 'Fusione', BLENDS, 0), r('opacity', 'Opacità', 0, 100, 100)],
    variants: [
      { id: 'pieno', label: 'Pieno', p: { blend: 0, opacity: 100 } },
      { id: 'tinta', label: 'Tinta', p: { blend: 7, opacity: 100 } },
      { id: 'velo', label: 'Velo', p: { blend: 4, opacity: 70 } },
    ] },
  { id: 'gradientOverlay', label: 'Sfumatura', cat: 'Stile', hint: 'sfumatura lineare, radiale o riflessa sopra l’oggetto', noAmount: true,
    params: [c('c1', 'Colore 1', '#ff5f6d'), c('c2', 'Colore 2', '#ffc371'), t('three', 'Tre colori', 0), c('c3', 'Colore 3', '#ffffff'), s('type', 'Tipo', ['Lineare', 'Radiale', 'Riflessa', 'Conica'], 0), r('angle', 'Angolo', 0, 360, 90), r('scale', 'Scala', 20, 200, 100), s('blend', 'Fusione', BLENDS, 0), r('opacity', 'Opacità', 0, 100, 100)],
    variants: [
      { id: 'tramonto', label: 'Tramonto', p: { c1: '#ff5f6d', c2: '#ffc371', three: 0, type: 0 } },
      { id: 'oceano', label: 'Oceano', p: { c1: '#1a2a6c', c2: '#2bc0e4', three: 0, type: 0 } },
      { id: 'aurora', label: 'Aurora', p: { c1: '#7f00ff', c2: '#00ffd5', c3: '#e1ff00', three: 1, type: 0, angle: 120 } },
      { id: 'oro', label: 'Oro', p: { c1: '#7a5310', c2: '#fff1b8', c3: '#b8860b', three: 1, type: 2, angle: 90 } },
      { id: 'cromo', label: 'Cromo', p: { c1: '#4a4a4a', c2: '#ffffff', c3: '#8a8a8a', three: 1, type: 2, angle: 100 } },
      { id: 'olografico', label: 'Olografico', p: { c1: '#ff9a9e', c2: '#a1c4fd', c3: '#c2ffd8', three: 1, type: 3 } },
    ] },
  { id: 'textureOverlay', label: 'Texture', cat: 'Stile', hint: 'carta, tela, grana o cemento sopra l’oggetto', noAmount: true,
    params: [s('kind', 'Materiale', ['Grana', 'Carta', 'Tela', 'Cemento', 'Graffi'], 1), r('scale', 'Scala', 10, 300, 100), s('blend', 'Fusione', BLENDS, 3), r('opacity', 'Opacità', 0, 100, 60)],
    variants: [
      { id: 'carta', label: 'Carta', p: { kind: 1, blend: 1, opacity: 55 } },
      { id: 'tela', label: 'Tela', p: { kind: 2, blend: 3, opacity: 50 } },
      { id: 'grana', label: 'Grana', p: { kind: 0, blend: 3, opacity: 45 } },
      { id: 'cemento', label: 'Cemento', p: { kind: 3, blend: 1, opacity: 60 } },
      { id: 'graffi', label: 'Usurato', p: { kind: 4, blend: 2, opacity: 55 } },
    ] },

  /* ─── Testo (come gli effetti di testo di Canva, ma per qualsiasi oggetto) ─── */
  { id: 'neon', label: 'Neon', cat: 'Testo', hint: 'tubo di luce: nucleo chiaro e alone a più strati', animated: true,
    pad: p => n(p.size, 18) * 2.6,
    params: [c('color', 'Colore', '#ff3cac'), r('size', 'Alone', 2, 80, 18), r('intensity', 'Intensità', 0, 100, 75), r('tube', 'Nucleo chiaro', 0, 100, 65), r('flicker', 'Sfarfallio', 0, 100, 0)],
    variants: [
      { id: 'rosa', label: 'Rosa', p: { color: '#ff3cac' } },
      { id: 'ciano', label: 'Ciano', p: { color: '#22f1ff' } },
      { id: 'viola', label: 'Viola', p: { color: '#9b5cff' } },
      { id: 'acido', label: 'Acido', p: { color: '#7dff3c' } },
      { id: 'ambra', label: 'Ambra', p: { color: '#ffb000' } },
      { id: 'insegna', label: 'Insegna', p: { color: '#ff2d55', flicker: 35, intensity: 85 } },
    ] },
  { id: 'echo', label: 'Eco', cat: 'Testo', hint: 'copie ripetute che sfumano dietro l’oggetto',
    pad: p => n(p.count, 4) * n(p.distance, 8),
    params: [r('count', 'Copie', 1, 10, 4), r('distance', 'Distanza', 1, 60, 8), r('angle', 'Direzione', 0, 360, 315), t('useColor', 'Colore proprio', 0), c('color', 'Colore', '#7c3aed'), r('fade', 'Dissolvenza', 0, 100, 70)],
    variants: [
      { id: 'scia', label: 'Scia', p: { count: 5, distance: 6, useColor: 0, fade: 75 } },
      { id: 'colore', label: 'Colorata', p: { count: 3, distance: 10, useColor: 1, color: '#ff5a5f', fade: 40 } },
      { id: 'pop', label: 'Pop', p: { count: 2, distance: 14, useColor: 1, color: '#00c2ff', fade: 0, angle: 45 } },
    ] },
  { id: 'hollow', label: 'Vuoto', cat: 'Testo', hint: 'solo il contorno, interno trasparente',
    params: [r('thickness', 'Spessore', 1, 30, 3)],
    variants: [{ id: 'fine', label: 'Fine', p: { thickness: 2 } }, { id: 'medio', label: 'Medio', p: { thickness: 4 } }, { id: 'spesso', label: 'Spesso', p: { thickness: 8 } }] },
  { id: 'splice', label: 'Spaccato', cat: 'Testo', hint: 'contorno vuoto con un riempimento sfalsato dietro',
    pad: p => n(p.distance, 8) + 2,
    params: [r('thickness', 'Spessore', 1, 20, 3), r('distance', 'Distanza', 0, 40, 8), r('angle', 'Direzione', 0, 360, 315), c('color', 'Colore', '#ffd166')],
    variants: [{ id: 'giallo', label: 'Giallo', p: { color: '#ffd166' } }, { id: 'rosa', label: 'Rosa', p: { color: '#ff8fab' } }, { id: 'acqua', label: 'Acqua', p: { color: '#72efdd' } }] },
  { id: 'longShadow', label: 'Ombra lunga', cat: 'Testo', hint: 'ombra piatta infinita, stile flat',
    pad: p => n(p.length, 120),
    params: [r('length', 'Lunghezza', 10, 500, 120), r('angle', 'Direzione', 0, 360, 45), c('color', 'Colore', '#000000'), r('opacity', 'Opacità', 0, 100, 35), r('fade', 'Dissolvenza', 0, 100, 60)],
    variants: [
      { id: 'flat', label: 'Flat', p: { opacity: 30, fade: 0, length: 200 } },
      { id: 'sfumata', label: 'Sfumata', p: { opacity: 45, fade: 90, length: 160 } },
      { id: 'colorata', label: 'Colorata', p: { opacity: 100, fade: 0, length: 60, color: '#ff8c42' } },
    ] },
  { id: 'extrude', label: 'Estrusione 3D', cat: 'Testo', hint: 'volume solido dietro l’oggetto, stile retrò',
    pad: p => n(p.depth, 24) + 2,
    params: [r('depth', 'Profondità', 2, 120, 24), r('angle', 'Direzione', 0, 360, 45), c('color', 'Colore', '#2d1b69'), r('shade', 'Ombreggiatura', 0, 100, 60), t('outline', 'Bordo scuro', 1)],
    variants: [
      { id: 'retro', label: 'Retrò', p: { color: '#2d1b69', depth: 24, angle: 45 } },
      { id: 'arancio', label: 'Arancio', p: { color: '#ff7a00', depth: 18, angle: 135 } },
      { id: 'profondo', label: 'Profondo', p: { color: '#111111', depth: 60, angle: 60, shade: 80 } },
      { id: 'pastello', label: 'Pastello', p: { color: '#9ad1ff', depth: 14, angle: 45, outline: 0, shade: 30 } },
    ] },
  { id: 'glitch', label: 'Glitch', cat: 'Testo', hint: 'strisce spostate, canali separati, rumore digitale', animated: true,
    pad: p => 6 + n(p.split, 30) * 0.4 + n(p.power, 50) * 0.3,
    params: [r('power', 'Danno', 0, 100, 50), r('split', 'Separazione RGB', 0, 100, 30), r('slices', 'Strisce', 4, 60, 18), r('noise', 'Rumore', 0, 100, 20), r('speed', 'Velocità', 0, 100, 0)],
    variants: [
      { id: 'leggero', label: 'Leggero', p: { power: 25, split: 18, slices: 14, noise: 8 } },
      { id: 'forte', label: 'Forte', p: { power: 80, split: 55, slices: 26, noise: 30 } },
      { id: 'digitale', label: 'Digitale', p: { power: 60, split: 30, slices: 50, noise: 45, speed: 40 } },
      { id: 'rgb', label: 'Solo RGB', p: { power: 0, split: 60, slices: 18, noise: 0 } },
    ] },

  /* ─── Luce ─── */
  { id: 'bloom', label: 'Bloom', cat: 'Luce', hint: 'le parti chiare irradiano luce morbida',
    pad: p => n(p.size, 30) * 1.5,
    params: [r('threshold', 'Soglia', 0, 100, 60), r('intensity', 'Intensità', 0, 100, 55), r('size', 'Ampiezza', 2, 120, 30), r('warmth', 'Calore', -100, 100, 10)],
    variants: [{ id: 'sognante', label: 'Sognante', p: { threshold: 45, intensity: 60, size: 50 } }, { id: 'scintille', label: 'Scintille', p: { threshold: 75, intensity: 80, size: 14 } }, { id: 'calda', label: 'Calda', p: { warmth: 60 } }] },
  { id: 'lightLeak', label: 'Luce filtrata', cat: 'Luce', hint: 'macchie di luce calda come una pellicola esposta', animated: true,
    params: [c('c1', 'Colore 1', '#ff6a00'), c('c2', 'Colore 2', '#ff2d95'), r('position', 'Posizione', 0, 100, 20), r('size', 'Ampiezza', 10, 100, 55), r('speed', 'Movimento', 0, 100, 0)],
    variants: [{ id: 'ambra', label: 'Ambra', p: { c1: '#ff8a00', c2: '#ffcf33' } }, { id: 'rosa', label: 'Rosa', p: { c1: '#ff2d95', c2: '#ff9a3c' } }, { id: 'freddo', label: 'Freddo', p: { c1: '#3cc8ff', c2: '#a35cff' } }] },

  /* ─── Stampa ─── */
  { id: 'halftone', label: 'Retino', cat: 'Stampa', hint: 'puntini di stampa: mono, a colori o quadricromia',
    params: [s('mode', 'Modo', ['Inchiostro', 'Colori originali', 'Quadricromia CMYK'], 1), s('shape', 'Forma', ['Punti', 'Quadrati', 'Linee'], 0), r('size', 'Retino', 3, 40, 8), r('angle', 'Angolo', 0, 90, 45), c('ink', 'Inchiostro', '#111111'), t('paperOn', 'Carta', 1), c('paper', 'Colore carta', '#f5f0e6')],
    variants: [
      { id: 'fumetto', label: 'Fumetto', p: { mode: 2, shape: 0, size: 7, paperOn: 1 } },
      { id: 'giornale', label: 'Giornale', p: { mode: 0, shape: 0, size: 6, ink: '#1a1a1a', paperOn: 1, paper: '#efe9dc' } },
      { id: 'pop', label: 'Pop', p: { mode: 1, shape: 0, size: 12, paperOn: 0 } },
      { id: 'linee', label: 'Linee', p: { mode: 0, shape: 2, size: 7, ink: '#1f3fbf', paperOn: 1 } },
    ] },
  { id: 'riso', label: 'Risograph', cat: 'Stampa', hint: 'due inchiostri fuori registro, grana e sovrastampa',
    pad: p => Math.max(n(p.reg1, 3), n(p.reg2, 6)) + 2,
    params: [c('ink1', 'Inchiostro 1', '#ff48b0'), c('ink2', 'Inchiostro 2', '#0078bf'), c('paper', 'Carta', '#f3eee4'), s('screen', 'Trama', ['Grana', 'Retino'], 0), r('size', 'Grana', 1, 20, 3), r('reg1', 'Registro 1', 0, 20, 2), r('reg2', 'Registro 2', 0, 20, 6), r('ink', 'Carico inchiostro', 0, 100, 70), r('texture', 'Usura', 0, 100, 45)],
    variants: [
      { id: 'rosablu', label: 'Rosa + Blu', p: { ink1: '#ff48b0', ink2: '#0078bf' } },
      { id: 'arancioacqua', label: 'Arancio + Acqua', p: { ink1: '#ff6c2f', ink2: '#00838a' } },
      { id: 'rossonero', label: 'Rosso + Nero', p: { ink1: '#ff665e', ink2: '#1a1a1a' } },
      { id: 'giallo', label: 'Giallo + Viola', p: { ink1: '#ffe800', ink2: '#765ba7' } },
      { id: 'blu', label: 'Solo blu', p: { ink1: '#3255a4', ink2: '#3255a4', reg2: 1 } },
    ] },
  { id: 'dither', label: 'Dithering', cat: 'Stampa', hint: 'pochi colori e trama a pixel, stile 1-bit',
    params: [c('dark', 'Scuro', '#0f380f'), c('light', 'Chiaro', '#9bbc0f'), s('pattern', 'Trama', ['Bayer 4×4', 'Bayer 8×8', 'Rumore'], 1), r('size', 'Pixel', 1, 12, 2), r('contrast', 'Contrasto', -50, 100, 20), t('levels4', 'Quattro toni', 1)],
    variants: [
      { id: 'gameboy', label: 'Game Boy', p: { dark: '#0f380f', light: '#9bbc0f', levels4: 1 } },
      { id: 'mac', label: '1-bit', p: { dark: '#000000', light: '#ffffff', levels4: 0, pattern: 1 } },
      { id: 'notte', label: 'Notte', p: { dark: '#14112b', light: '#5ce1e6', levels4: 1 } },
      { id: 'rosa', label: 'Rosa', p: { dark: '#3b0a45', light: '#ffb3c6', levels4: 1, pattern: 2 } },
    ] },
  { id: 'screenprint', label: 'Serigrafia', cat: 'Stampa', hint: 'tre colori piatti con bordi d’inchiostro e carta',
    pad: () => 3,
    params: [c('c1', 'Scuro', '#1d1d3b'), c('c2', 'Medio', '#e94f37'), c('c3', 'Chiaro', '#f6d8ae'), r('threshold', 'Soglia', 0, 100, 50), r('rough', 'Bordi irregolari', 0, 100, 40), r('offset', 'Fuori registro', 0, 10, 2)],
    variants: [
      { id: 'poster', label: 'Poster', p: { c1: '#1d1d3b', c2: '#e94f37', c3: '#f6d8ae' } },
      { id: 'warhol', label: 'Pop art', p: { c1: '#1b1b1b', c2: '#ff3d7f', c3: '#ffe66d' } },
      { id: 'verde', label: 'Bosco', p: { c1: '#14281d', c2: '#5b8c5a', c3: '#e8e3c8' } },
    ] },

  /* ─── Colore ─── */
  { id: 'gradientMap', label: 'Mappa sfumatura', cat: 'Colore', hint: 'le luci e le ombre diventano una sfumatura (duotone e oltre)',
    params: [c('c1', 'Ombre', '#1d1a6e'), c('c2', 'Mezzitoni', '#e0457b'), c('c3', 'Luci', '#ffd29a'), t('three', 'Tre colori', 1), r('contrast', 'Contrasto', -50, 100, 10)],
    variants: [
      { id: 'pesca', label: 'Pesca', p: { c1: '#3a0f4e', c2: '#e86a5c', c3: '#ffe0b5', three: 1 } },
      { id: 'notte', label: 'Notte', p: { c1: '#0b0f2e', c2: '#3a6ea5', c3: '#c9f1ff', three: 1 } },
      { id: 'cyber', label: 'Cyber', p: { c1: '#120458', c2: '#ff00a0', c3: '#00fff0', three: 1 } },
      { id: 'duotone', label: 'Duotone', p: { c1: '#1d1a6e', c2: '#ff7aa8', three: 0 } },
      { id: 'oro', label: 'Oro', p: { c1: '#1b1305', c2: '#9c6b16', c3: '#ffe9a8', three: 1 } },
      { id: 'menta', label: 'Menta', p: { c1: '#0d2b2b', c2: '#2fb39a', c3: '#f2ffe9', three: 1 } },
    ] },
  { id: 'posterize', label: 'Poster', cat: 'Colore', hint: 'pochi livelli di colore, a tinte piatte',
    params: [r('levels', 'Livelli', 2, 12, 4), t('dither', 'Retinatura', 0), r('saturation', 'Saturazione', -50, 100, 15)],
    variants: [{ id: 'quattro', label: '4 livelli', p: { levels: 4 } }, { id: 'tre', label: '3 livelli', p: { levels: 3, saturation: 30 } }, { id: 'retinato', label: 'Retinato', p: { levels: 4, dither: 1 } }] },

  /* ─── Foto ─── */
  { id: 'tiltShift', label: 'Tilt-shift', cat: 'Foto', hint: 'a fuoco solo una fascia: effetto plastico',
    params: [r('position', 'Fascia', 0, 100, 50), r('width', 'Larghezza', 0, 60, 18), r('feather', 'Passaggio', 1, 60, 22), r('size', 'Sfocatura', 1, 60, 16), r('angle', 'Angolo', -90, 90, 0)],
    variants: [{ id: 'classico', label: 'Classico', p: { width: 18, size: 16 } }, { id: 'stretto', label: 'Stretto', p: { width: 8, size: 24 } }, { id: 'verticale', label: 'Verticale', p: { angle: 90 } }] },
  { id: 'motionBlur', label: 'Mosso', cat: 'Foto', hint: 'sfocatura di movimento in una direzione',
    pad: p => n(p.length, 30),
    params: [r('length', 'Lunghezza', 1, 200, 30), r('angle', 'Direzione', 0, 180, 0)],
    variants: [{ id: 'orizzontale', label: 'Orizzontale', p: { angle: 0 } }, { id: 'verticale', label: 'Verticale', p: { angle: 90 } }, { id: 'diagonale', label: 'Diagonale', p: { angle: 35, length: 50 } }] },
  { id: 'zoomBlur', label: 'Zoom', cat: 'Foto', hint: 'scia radiale verso il centro, velocità',
    params: [r('amount', 'Forza', 1, 100, 25), r('cx', 'Centro X', 0, 100, 50), r('cy', 'Centro Y', 0, 100, 50)],
    variants: [{ id: 'leggero', label: 'Leggero', p: { amount: 12 } }, { id: 'forte', label: 'Forte', p: { amount: 45 } }] },

  /* ─── Distorsione ─── */
  { id: 'wave', label: 'Onda', cat: 'Distorsione', hint: 'ondulazione regolare', animated: true,
    pad: p => n(p.amp, 10) + 2,
    params: [r('amp', 'Ampiezza', 0, 60, 10), r('length', 'Lunghezza d’onda', 10, 400, 120), r('angle', 'Direzione', 0, 180, 0), r('speed', 'Velocità', 0, 100, 0)],
    variants: [{ id: 'dolce', label: 'Dolce', p: { amp: 8, length: 160 } }, { id: 'bandiera', label: 'Bandiera', p: { amp: 16, length: 90, speed: 30 } }, { id: 'nervosa', label: 'Nervosa', p: { amp: 4, length: 25 } }] },
  { id: 'ripple', label: 'Increspatura', cat: 'Distorsione', hint: 'cerchi concentrici come acqua', animated: true,
    params: [r('amp', 'Ampiezza', 0, 40, 6), r('length', 'Distanza anelli', 5, 200, 40), r('speed', 'Velocità', 0, 100, 0)],
    variants: [{ id: 'goccia', label: 'Goccia', p: { amp: 6, length: 40 } }, { id: 'lago', label: 'Lago', p: { amp: 3, length: 18, speed: 30 } }] },
  { id: 'twirl', label: 'Vortice', cat: 'Distorsione', hint: 'rotazione che cresce verso il centro',
    params: [r('angle', 'Rotazione', -720, 720, 180), r('radius', 'Raggio', 10, 100, 60)],
    variants: [{ id: 'orario', label: 'Orario', p: { angle: 180 } }, { id: 'antiorario', label: 'Antiorario', p: { angle: -180 } }, { id: 'forte', label: 'Forte', p: { angle: 540, radius: 80 } }] },
  { id: 'bulge', label: 'Lente', cat: 'Distorsione', hint: 'gonfia o pizzica il centro',
    params: [r('amount', 'Gonfia ↔ pizzica', -100, 100, 50), r('radius', 'Raggio', 10, 100, 70)],
    variants: [{ id: 'gonfia', label: 'Gonfia', p: { amount: 60 } }, { id: 'pizzica', label: 'Pizzica', p: { amount: -60 } }] },
  { id: 'mosaic', label: 'Mosaico', cat: 'Distorsione', hint: 'tessere quadrate o esagonali con fughe',
    params: [s('shape', 'Tessere', ['Quadrate', 'Esagonali'], 0), r('size', 'Dimensione', 2, 80, 12), r('gap', 'Fughe', 0, 50, 0)],
    variants: [{ id: 'pixel', label: 'Pixel', p: { shape: 0, size: 10, gap: 0 } }, { id: 'piastrelle', label: 'Piastrelle', p: { shape: 0, size: 18, gap: 18 } }, { id: 'alveare', label: 'Alveare', p: { shape: 1, size: 14, gap: 12 } }] },
  { id: 'chroma', label: 'Aberrazione', cat: 'Distorsione', hint: 'canali di colore sfasati, come una lente economica',
    pad: p => n(p.amount, 6) * 1.6 + 2,
    params: [r('amount', 'Sfasamento', 0, 40, 6), r('distortion', 'Distorsione lente', -50, 50, 0), t('radial', 'Radiale', 1)],
    variants: [{ id: 'leggera', label: 'Leggera', p: { amount: 4 } }, { id: 'forte', label: 'Forte', p: { amount: 14 } }, { id: 'lineare', label: 'Lineare', p: { amount: 8, radial: 0 } }] },

  /* ─── Schermo ─── */
  { id: 'vhs', label: 'VHS', cat: 'Schermo', hint: 'videocassetta: colore che sbava, righe e tracking', animated: true,
    pad: () => 6,
    params: [r('power', 'Usura', 0, 100, 55), r('bleed', 'Sbavatura colore', 0, 100, 50), r('lines', 'Righe', 0, 100, 40), r('speed', 'Velocità', 0, 100, 35)],
    variants: [{ id: 'nastro', label: 'Nastro', p: { power: 55 } }, { id: 'rovinato', label: 'Rovinato', p: { power: 90, bleed: 80, lines: 70 } }, { id: 'fermo', label: 'Fermo immagine', p: { speed: 0, power: 60 } }] },
  { id: 'crt', label: 'CRT', cat: 'Schermo', hint: 'vecchio monitor: righe, fosfori e curvatura', animated: true,
    params: [r('scan', 'Righe', 0, 100, 55), r('mask', 'Fosfori RGB', 0, 100, 45), r('curve', 'Curvatura', 0, 100, 25), r('glow', 'Bagliore', 0, 100, 35), r('speed', 'Sfarfallio', 0, 100, 0)],
    variants: [{ id: 'arcade', label: 'Arcade', p: { scan: 60, mask: 55, curve: 30 } }, { id: 'terminale', label: 'Terminale', p: { scan: 70, mask: 20, curve: 15, glow: 60 } }, { id: 'piatto', label: 'Piatto', p: { curve: 0 } }] },
]

export const fxDef = (id: string) => FX_DEFS.find(d => d.id === id)

export function newFx(id: FxId, variant?: string): FxEntry {
  const d = fxDef(id)!
  const v = variant ? d.variants.find(x => x.id === variant) : d.variants[0]
  return { id, on: true, amount: 100, variant: v?.id, p: { ...Object.fromEntries(d.params.map(p => [p.key, p.def])), ...(v?.p ?? {}) } }
}

/* ───────── compatibilità con i progetti salvati dalla prima versione ───────── */
const OLD: Record<string, (p: Record<string, PVal>) => FxEntry> = {
  shadow: p => ({ ...newFx('dropShadow'), p: { ...newFx('dropShadow').p, ...p, size: p.blur ?? 24 } }),
  glow: p => ({ ...newFx('outerGlow'), p: { ...newFx('outerGlow').p, color: p.color ?? '#ffd166', size: p.size ?? 18 } }),
  outline: p => ({ ...newFx('stroke'), p: { ...newFx('stroke').p, size: p.width ?? 6, color: p.color ?? '#ffffff' } }),
  duotone: p => ({ ...newFx('gradientMap', 'duotone'), p: { ...newFx('gradientMap', 'duotone').p, c1: p.c1 ?? '#1d1a6e', c2: p.c2 ?? '#ff7aa8', three: 0 } }),
  pixel: p => ({ ...newFx('mosaic', 'pixel'), p: { ...newFx('mosaic', 'pixel').p, size: p.size ?? 10 } }),
}
export function migrateFx(list: FxEntry[] | undefined): FxEntry[] | undefined {
  if (!list) return list
  return list.map(e => (OLD[e.id as string] ? { ...OLD[e.id as string](e.p), on: e.on, amount: e.amount } : e)).filter(e => fxDef(e.id))
}
