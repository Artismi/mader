/**
 * Stili testo pronti, sul modello delle librerie di effetti tipografici
 * (cromo, colature, raggi, impressioni, glitter, strisce anni 70…):
 * ognuno sceglie carattere, colore e pila di effetti già calibrati.
 * Restano effetti veri e modificabili: dopo l'applicazione si ritoccano dal pannello.
 */
import type { PVal } from './catalog'

export interface TextStyle {
  id: string
  label: string
  family: string
  weight?: number
  fill: string
  /** [id effetto, variante, parametri in più] */
  fx: [string, string?, Record<string, PVal>?][]
  /** fondo dell'anteprima (lo stile rende meglio su questo) */
  swatch: string
  upper?: boolean
  tracking?: number
  group: 'Metallo' | 'Luce' | 'Carta e materia' | 'Retrò e pop' | 'Digitale'
}

export const TEXT_STYLES: TextStyle[] = [
  // Metallo
  { id: 'cromo-liquido', label: 'Cromo liquido', group: 'Metallo', family: 'Unbounded', weight: 800, fill: '#cfd6e6', swatch: '#0b1020', fx: [['material3d', 'cromo', { shape: 1, depth: 40, bevel: 12 }]] },
  { id: 'cromo-studio', label: 'Cromo studio', group: 'Metallo', family: 'Climate Crisis', fill: '#d9dde8', swatch: '#111111', fx: [['material3d', 'studio']] },
  { id: 'oro', label: 'Oro massiccio', group: 'Metallo', family: 'Playfair Display', weight: 800, fill: '#d4af37', swatch: '#14100a', fx: [['material3d', 'oro', { depth: 26, bevel: 10 }]] },
  { id: 'olografico', label: 'Olografico', group: 'Metallo', family: 'Syne', weight: 800, fill: '#e8e0ff', swatch: '#0d0a1a', fx: [['material3d', 'olografico']] },
  { id: 'glitter', label: 'Glitter', group: 'Metallo', family: 'UnifrakturMaguntia', fill: '#c9ccd6', swatch: '#0a0a0a', fx: [['glitter', 'argento']] },
  { id: 'glitter-oro', label: 'Glitter oro', group: 'Metallo', family: 'Pinyon Script', fill: '#d9b45a', swatch: '#0d0b08', fx: [['glitter', 'oro', { size: 3 }]] },
  // Luce
  { id: 'spettro', label: 'Spettro che cola', group: 'Luce', family: 'Bebas Neue', fill: '#ffffff', swatch: '#050505', fx: [['colata', 'spettro']] },
  { id: 'colata-neon', label: 'Neon che cola', group: 'Luce', family: 'Anton', fill: '#ff3cac', swatch: '#07030c', fx: [['colata', 'lunga', { glow: 80 }], ['neon', 'rosa']] },
  { id: 'luce', label: 'Raggi di luce', group: 'Luce', family: 'Playfair Display', weight: 700, fill: '#e9f1ff', swatch: '#04081c', fx: [['raggi', 'blu']] },
  { id: 'esplosione', label: 'Esplosione acida', group: 'Luce', family: 'Anton', fill: '#f0ffd8', swatch: '#050505', upper: true, fx: [['raggi', 'acido']] },
  { id: 'fuoco', label: 'Fuoco', group: 'Luce', family: 'Bebas Neue', fill: '#fff1c2', swatch: '#0a0503', fx: [['colata', 'su', { glow: 90 }], ['raggi', 'fuoco', { intensity: 60 }]] },
  { id: 'neon', label: 'Insegna neon', group: 'Luce', family: 'Monoton', fill: '#ffffff', swatch: '#0a0614', fx: [['neon', 'insegna']] },
  // Carta e materia
  { id: 'secco', label: 'A secco su carta', group: 'Carta e materia', family: 'Instrument Serif', fill: '#e8e6e1', swatch: '#e8e6e1', fx: [['impressione', 'secco']] },
  { id: 'oro-carta', label: 'Oro su kraft', group: 'Carta e materia', family: 'Playfair Display', weight: 700, fill: '#c69a5c', swatch: '#c69a5c', fx: [['impressione', 'oro']] },
  { id: 'argento-marmo', label: 'Argento su marmo', group: 'Carta e materia', family: 'Cinzel', weight: 700, fill: '#111111', swatch: '#111111', fx: [['impressione', 'argento']] },
  { id: 'pietra', label: 'Inciso nella pietra', group: 'Carta e materia', family: 'Cinzel', weight: 600, fill: '#b9b9b9', swatch: '#b9b9b9', fx: [['impressione', 'pietra']] },
  { id: 'pelle', label: 'Marchio su pelle', group: 'Carta e materia', family: 'Playfair Display', weight: 700, fill: '#5a2d1d', swatch: '#5a2d1d', fx: [['impressione', 'pelle']] },
  { id: 'timbro', label: 'Timbro', group: 'Carta e materia', family: 'Archivo Black', fill: '#c0392b', swatch: '#efe6d2', upper: true, fx: [['grunge', 'timbro']] },
  { id: 'ricamo', label: 'Toppa ricamata', group: 'Carta e materia', family: 'Rubik', weight: 900, fill: '#e94f37', swatch: '#2b3a55', fx: [['stitch', 'toppa'], ['dropShadow', 'contatto']] },
  // Retrò e pop
  { id: 'anni70', label: 'Strisce anni 70', group: 'Retrò e pop', family: 'Shrikhand', fill: '#fff3b0', swatch: '#1a8fd6', fx: [['stroke', 'sottile', { size: 4, color: '#3b1f0e' }], ['extrude', 'arcobaleno']] },
  { id: 'party', label: 'Party', group: 'Retrò e pop', family: 'Archivo Black', fill: '#ffffff', swatch: '#080808', upper: true, fx: [['extrude', 'party']] },
  { id: 'gonfiabile', label: 'Gonfiabile', group: 'Retrò e pop', family: 'Bagel Fat One', fill: '#ff7eb3', swatch: '#ffd6e7', fx: [['material3d', 'gonfio', { useColor: 1, color: '#ff7eb3' }]] },
  { id: 'adesivo', label: 'Adesivo', group: 'Retrò e pop', family: 'Rubik Mono One', fill: '#ff3b1f', swatch: '#f4ff3a', upper: true, fx: [['stroke', 'adesivo'], ['dropShadow', 'morbida']] },
  { id: 'fumetto', label: 'Fumetto', group: 'Retrò e pop', family: 'Tilt Warp', fill: '#ffd400', swatch: '#3fa9f5', fx: [['stroke', 'spesso', { color: '#111111', size: 8 }], ['longShadow', 'flat', { opacity: 100, length: 30 }], ['halftone', 'fumetto']] },
  { id: 'riso', label: 'Risograph', group: 'Retrò e pop', family: 'Bricolage Grotesque', weight: 800, fill: '#0078bf', swatch: '#f3eee3', fx: [['riso', 'rosablu']] },
  // Digitale
  { id: 'glitch', label: 'Glitch', group: 'Digitale', family: 'Space Grotesk', weight: 700, fill: '#ffffff', swatch: '#0a0a0a', fx: [['glitch', 'forte'], ['chroma', 'forte']] },
  { id: 'vhs', label: 'Nastro VHS', group: 'Digitale', family: 'VT323', fill: '#fff2c8', swatch: '#120c08', upper: true, fx: [['vhs', 'nastro'], ['outerGlow', 'caldo']] },
  { id: 'eco', label: 'Eco', group: 'Digitale', family: 'Archivo Black', fill: '#ffffff', swatch: '#0b0b0b', upper: true, fx: [['echo', 'pop', { useColor: 0, count: 5, distance: 14, angle: 90, fade: 80 }]] },
  { id: 'terminale', label: 'Terminale', group: 'Digitale', family: 'VT323', fill: '#7dff9a', swatch: '#020a04', fx: [['crt', 'terminale'], ['outerGlow', 'alone', { color: '#7dff9a' }]] },
]
