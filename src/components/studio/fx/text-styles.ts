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
  group: 'Metallo' | 'Vetro e 3D' | 'Luce' | 'Carta e materia' | 'Stampa' | 'Retrò e pop' | 'Font a colori' | 'Digitale'
}

export const TEXT_STYLES: TextStyle[] = [
  // Metallo
  { id: 'cromo-liquido', label: 'Cromo liquido', group: 'Metallo', family: 'Unbounded', weight: 800, fill: '#cfd6e6', swatch: '#0b1020', tracking: 30, fx: [['material3d', 'cromo', { shape: 1, depth: 40, bevel: 12 }]] },
  { id: 'cromo-studio', label: 'Cromo studio', group: 'Metallo', family: 'Archivo Black', fill: '#d9dde8', swatch: '#111111', tracking: 40, fx: [['material3d', 'studio']] },
  { id: 'oro', label: 'Oro massiccio', group: 'Metallo', family: 'Playfair Display', weight: 800, fill: '#d4af37', swatch: '#14100a', fx: [['material3d', 'oro', { depth: 26, bevel: 10 }]] },
  { id: 'olografico', label: 'Olografico', group: 'Metallo', family: 'Syne', weight: 800, fill: '#e8e0ff', swatch: '#0d0a1a', tracking: 50, fx: [['material3d', 'olografico']] },
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
  { id: 'gonfiabile', label: 'Gonfiabile', group: 'Retrò e pop', family: 'Bagel Fat One', fill: '#ff7eb3', swatch: '#ffd6e7', tracking: 40, fx: [['material3d', 'gonfio', { useColor: 1, color: '#ff7eb3' }]] },
  { id: 'adesivo', label: 'Adesivo', group: 'Retrò e pop', family: 'Rubik Mono One', fill: '#ff3b1f', swatch: '#f4ff3a', upper: true, fx: [['stroke', 'adesivo'], ['dropShadow', 'morbida']] },
  { id: 'fumetto', label: 'Fumetto', group: 'Retrò e pop', family: 'Tilt Warp', fill: '#ffd400', swatch: '#3fa9f5', fx: [['stroke', 'spesso', { color: '#111111', size: 8 }], ['longShadow', 'flat', { opacity: 100, length: 30 }], ['halftone', 'fumetto']] },
  { id: 'riso', label: 'Risograph', group: 'Retrò e pop', family: 'Bricolage Grotesque', weight: 800, fill: '#0078bf', swatch: '#f3eee3', fx: [['riso', 'rosablu']] },
  // Digitale
  { id: 'glitch', label: 'Glitch', group: 'Digitale', family: 'Space Grotesk', weight: 700, fill: '#ffffff', swatch: '#0a0a0a', fx: [['glitch', 'leggero', { power: 35, split: 22 }], ['chroma', 'leggero']] },
  { id: 'vhs', label: 'Nastro VHS', group: 'Digitale', family: 'VT323', fill: '#fff2c8', swatch: '#120c08', upper: true, fx: [['vhs', 'nastro'], ['outerGlow', 'caldo']] },
  { id: 'eco', label: 'Eco', group: 'Digitale', family: 'Archivo Black', fill: '#ffffff', swatch: '#0b0b0b', upper: true, fx: [['echo', 'pop', { useColor: 0, count: 5, distance: 14, angle: 90, fade: 80 }]] },
  { id: 'terminale', label: 'Terminale', group: 'Digitale', family: 'VT323', fill: '#7dff9a', swatch: '#020a04', fx: [['crt', 'terminale', { curve: 0, mask: 10 }], ['outerGlow', 'alone', { color: '#7dff9a' }]] },
  // Metallo (altri)
  { id: 'cromo-tramonto', label: 'Cromo tramonto', group: 'Metallo', family: 'Bungee', fill: '#ffd0a0', swatch: '#1a0d22', tracking: 20, fx: [['material3d', 'tramonto', { depth: 30, bevel: 8 }], ['outerGlow', 'caldo', { size: 30, opacity: 35 }]] },
  { id: 'lamina-oro', label: 'Lamina d’oro', group: 'Metallo', family: 'Bodoni Moda', weight: 700, fill: '#d4af37', swatch: '#0f1a14', fx: [['foil', 'oro'], ['dropShadow', 'contatto']] },
  { id: 'lamina-olografica', label: 'Lamina olografica', group: 'Metallo', family: 'Syne', weight: 800, fill: '#e8e0ff', swatch: '#101018', tracking: 30, fx: [['foil', 'olografico', { crinkle: 25 }], ['outerGlow', 'aura', { color: '#b9a8ff', size: 26, opacity: 25 }]] },
  { id: 'oro-rosa', label: 'Oro rosa', group: 'Metallo', family: 'Italiana', fill: '#e8b4a0', swatch: '#2a1a1c', tracking: 60, upper: true, fx: [['foil', 'rosa'], ['outerGlow', 'caldo', { size: 18, opacity: 25 }]] },
  { id: 'acciaio', label: 'Acciaio scolpito', group: 'Metallo', family: 'Big Shoulders Display', weight: 900, fill: '#9aa3ad', swatch: '#15181c', upper: true, tracking: 30, fx: [['bevel', 'metallo', { hiColor: '#ffffff', shColor: '#0b0d10' }], ['gradientOverlay', 'cromo', { opacity: 55 }], ['dropShadow', 'sollevata']] },
  // Vetro e 3D
  { id: 'vetro-3d', label: 'Vetro', group: 'Vetro e 3D', family: 'Unbounded', weight: 800, fill: '#bfe6ff', swatch: '#ff9a62', tracking: 20, fx: [['material3d', 'vetro', { depth: 30, bevel: 10 }]] },
  { id: 'ceramica', label: 'Ceramica lucida', group: 'Vetro e 3D', family: 'Bagel Fat One', fill: '#2f6bff', swatch: '#f4efe6', tracking: 30, fx: [['material3d', 'ceramica', { useColor: 1, color: '#2f6bff' }], ['dropShadow', 'morbida', { opacity: 25 }]] },
  { id: 'plastica', label: 'Plastica giocattolo', group: 'Vetro e 3D', family: 'Rubik', weight: 900, fill: '#ff4f3a', swatch: '#ffe36e', tracking: 20, fx: [['material3d', 'gonfio', { material: 0, useColor: 1, color: '#ff4f3a', depth: 40 }]] },
  { id: 'metallo-neon', label: 'Metallo neon', group: 'Vetro e 3D', family: 'Chakra Petch', weight: 700, fill: '#d0e8ff', swatch: '#07050f', upper: true, tracking: 30, fx: [['material3d', 'neon'], ['outerGlow', 'aura', { color: '#ff3cac', size: 40, opacity: 40 }]] },
  { id: 'cannettato', label: 'Vetro cannettato', group: 'Vetro e 3D', family: 'Anton', fill: '#ff6a3d', swatch: '#f2e9dc', upper: true, fx: [['gradientOverlay', 'tramonto'], ['vetro', 'fine', { width: 6, strength: 80, dispersion: 60 }], ['dropShadow', 'morbida', { opacity: 18 }]] },
  // Luce (altri)
  { id: 'neon-ciano', label: 'Neon ghiaccio', group: 'Luce', family: 'Tilt Neon', fill: '#e8fdff', swatch: '#020b14', fx: [['neon', 'ciano']] },
  { id: 'sognante', label: 'Bagliore sognante', group: 'Luce', family: 'Cormorant Garamond', weight: 600, fill: '#fff4e6', swatch: '#2b1d3a', fx: [['bloom', 'sognante'], ['outerGlow', 'aura', { color: '#ffb3d9', size: 50, opacity: 45 }]] },
  { id: 'velocita', label: 'Scia di velocità', group: 'Luce', family: 'Big Shoulders Display', weight: 900, fill: '#ffffff', swatch: '#0a0f1f', upper: true, fx: [['colata', 'lato', { glow: 60 }], ['chroma', 'leggera']] },
  { id: 'aurora', label: 'Aurora', group: 'Luce', family: 'Fraunces', weight: 900, fill: '#ffffff', swatch: '#050814', fx: [['gradientOverlay', 'aurora'], ['outerGlow', 'aura', { color: '#5cffc8', size: 46, opacity: 40 }]] },
  // Carta e materia (altri)
  { id: 'gesso', label: 'Rilievo su gesso', group: 'Carta e materia', family: 'DM Serif Display', fill: '#ece8e1', swatch: '#ece8e1', fx: [['impressione', 'rilievo']] },
  { id: 'denim', label: 'Ricamo su denim', group: 'Carta e materia', family: 'Pinyon Script', fill: '#f2c14e', swatch: '#24324a', fx: [['stitch', 'fine'], ['dropShadow', 'contatto']] },
  { id: 'carta-tagliata', label: 'Carta ritagliata', group: 'Carta e materia', family: 'Abril Fatface', fill: '#f6f1e7', swatch: '#e94f37', fx: [['dropShadow', 'sollevata', { opacity: 45 }], ['innerShadow', 'luce'], ['textureOverlay', 'carta']] },
  // Stampa
  { id: 'banconota', label: 'Banconota', group: 'Stampa', family: 'Yeseva One', fill: '#8a8a8a', swatch: '#eef0e4', fx: [['gradientOverlay', 'cromo'], ['linocut', 'banconota', { lines: 2.2, mass: 40, threshold: 72 }]] },
  { id: 'mezzetinte', label: 'Mezzetinte pop', group: 'Stampa', family: 'Bungee', fill: '#ff3d7f', swatch: '#ffe9a8', upper: true, fx: [['halftone', 'pop'], ['stroke', 'sottile', { color: '#1a1a1a', size: 3 }], ['longShadow', 'flat', { opacity: 100, length: 18, color: '#1a1a1a', fade: 0 }]] },
  { id: 'serigrafia', label: 'Serigrafia', group: 'Stampa', family: 'Gloock', fill: '#ff5a1f', swatch: '#f4ecdc', fx: [['gradientOverlay', 'tramonto', { opacity: 60 }], ['screenprint', 'poster'], ['grunge', 'timbro']] },
  { id: 'riso-duo', label: 'Riso fuori registro', group: 'Stampa', family: 'Space Grotesk', weight: 700, fill: '#d81b7a', swatch: '#f6f0e2', tracking: -20, fx: [['riso', 'arancioacqua']] },
  // Retrò e pop (altri)
  { id: 'anni80', label: 'Retrò anni 80', group: 'Retrò e pop', family: 'Monoton', fill: '#ff6ec7', swatch: '#120428', fx: [['gradientOverlay', 'tramonto'], ['extrude', 'retro'], ['outerGlow', 'aura', { color: '#ff6ec7', size: 30, opacity: 35 }]] },
  { id: 'pastello', label: 'Pastello', group: 'Retrò e pop', family: 'Bungee Shade', fill: '#ffb3c7', swatch: '#fff6e9', fx: [['extrude', 'pastello']] },
  { id: 'doppio', label: 'Contorno sfalsato', group: 'Retrò e pop', family: 'Archivo Black', fill: '#111111', swatch: '#f3efe6', upper: true, fx: [['splice', 'rosa']] },
  { id: 'ombra-lunga', label: 'Ombra lunga', group: 'Retrò e pop', family: 'Tilt Warp', fill: '#ffffff', swatch: '#2ec4b6', fx: [['longShadow', 'colorata']] },
  // Font a colori (caratteri COLR: il colore è nel font)
  { id: 'nabla', label: 'Isometrico a colori', group: 'Font a colori', family: 'Nabla', fill: '#000000', swatch: '#14102a', fx: [['dropShadow', 'morbida', { opacity: 35 }]] },
  { id: 'honk', label: 'Gonfio a colori', group: 'Font a colori', family: 'Honk', fill: '#000000', swatch: '#1b2236', fx: [['outerGlow', 'aura', { color: '#ff9ad5', size: 30, opacity: 30 }]] },
  // Digitale (altri)
  { id: 'gameboy', label: 'Game Boy', group: 'Digitale', family: 'Press Start 2P', fill: '#9bbc0f', swatch: '#0f380f', fx: [['dither', 'gameboy'], ['dropShadow', 'netta', { color: '#306230', distance: 6, opacity: 100 }]] },
  { id: 'rgb', label: 'Separazione RGB', group: 'Digitale', family: 'Major Mono Display', fill: '#ffffff', swatch: '#0b0b0f', fx: [['chroma', 'forte'], ['glitch', 'rgb']] },
  { id: 'schermo', label: 'Schermo CRT', group: 'Digitale', family: 'Orbitron', weight: 800, fill: '#ffffff', swatch: '#06070c', upper: true, tracking: 40, fx: [['gradientOverlay', 'olografico'], ['crt', 'piatto', { scan: 70, mask: 60 }], ['outerGlow', 'aura', { color: '#7af7ff', size: 30, opacity: 35 }]] },
]
