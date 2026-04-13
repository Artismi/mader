/**
 * Pro Assets Library for Creative OS
 * Includes high-quality SVG paths for various professional design tools.
 */

export interface ProAsset {
  id: string;
  name: string;
  category: 'spray' | 'roller' | 'marker' | 'ink' | 'stains' | 'halftone' | 'stipple';
  path: string;
  defaultScale?: number;
}

export const PRO_ASSET_CATEGORIES = [
  { id: 'spray',    label: 'Spray & Splatters' },
  { id: 'roller',   label: 'Rollers & Paint' },
  { id: 'marker',   label: 'Pens & Markers' },
  { id: 'ink',      label: 'Ink & Chrome' },
  { id: 'stains',   label: 'Stains & Cups' },
  { id: 'halftone', label: 'Halftone Dots' },
  { id: 'stipple',  label: 'Grain Shading' },
];

export const PRO_ASSETS: ProAsset[] = [
  // --- SPRAY & SPLATTERS ---
  {
    id: 'spray_01',
    name: 'Fine Mist Splatter',
    category: 'spray',
    path: 'M 50 50 m -2 -2 a 2 2 0 1 0 4 0 a 2 2 0 1 0 -4 0 M 60 40 m -1 -1 a 1 1 0 1 0 2 0 a 1 1 0 1 0 -2 0 M 40 60 m -1 -1 a 1 1 0 1 0 2 0 a 1 1 0 1 0 -2 0 M 55 55 m -0.5 -0.5 a 0.5 0.5 0 1 0 1 0 a 0.5 0.5 0 1 0 -1 0 M 45 45 m -0.5 -0.5 a 0.5 0.5 0 1 0 1 0 a 0.5 0.5 0 1 0 -1 0',
    defaultScale: 1.5
  },
  {
    id: 'spray_02',
    name: 'Urban Drip',
    category: 'spray',
    path: 'M 50 10 Q 55 10 55 20 L 55 60 Q 55 70 50 70 Q 45 70 45 60 L 45 20 Q 45 10 50 10 M 60 15 Q 63 15 63 20 L 63 45 Q 63 50 60 50 Q 57 50 57 45 L 57 20 Q 57 15 60 15',
    defaultScale: 1.2
  },
  {
    id: 'spray_03',
    name: 'Heavy Splat',
    category: 'spray',
    path: 'M 50 20 Q 70 10 80 30 Q 90 50 70 70 Q 50 90 30 70 Q 10 50 20 30 Q 30 10 50 20 Z M 55 55 m -5 -5 a 5 5 0 1 0 10 0 a 5 5 0 1 0 -10 0',
    defaultScale: 2
  },

  // --- ROLLERS ---
  {
    id: 'roller_01',
    name: 'Wet Roller Track',
    category: 'roller',
    path: 'M 10 20 L 90 20 L 90 50 L 10 50 Z M 10 20 Q 5 20 5 25 L 5 45 Q 5 50 10 50 M 90 20 Q 95 20 95 25 L 95 45 Q 95 50 90 50',
    defaultScale: 3
  },
  {
    id: 'roller_02',
    name: 'Rough Texture',
    category: 'roller',
    path: 'M 10 10 L 90 10 L 90 80 L 10 80 Z M 12 15 L 88 15 L 88 78 L 12 78 Z',
    defaultScale: 1.5
  },

  // --- MARKERS ---
  {
    id: 'marker_01',
    name: 'Chisel Tip Stroke',
    category: 'marker',
    path: 'M 10 40 L 90 10 L 95 20 L 15 50 Z',
    defaultScale: 1.2
  },
  {
    id: 'marker_02',
    name: 'Soft Highlighter',
    category: 'marker',
    path: 'M 5 20 L 95 20 L 95 45 L 5 45 Z',
    defaultScale: 2
  },

  // --- INK ---
  {
    id: 'ink_01',
    name: 'Ink Bleed Spot',
    category: 'ink',
    path: 'M 50 50 m -20 0 a 20 20 0 1 0 40 0 a 20 20 0 1 0 -40 0 M 35 35 m -5 0 a 5 5 0 1 0 10 0 a 5 5 0 1 0 -10 0 M 65 65 m -5 0 a 5 5 0 1 0 10 0 a 5 5 0 1 0 -10 0',
    defaultScale: 1.5
  },
  {
    id: 'ink_02',
    name: 'Liquid Flow',
    category: 'ink',
    path: 'M 20 50 Q 35 20 50 50 T 80 50 Q 85 60 75 70 Q 65 80 50 80 Q 35 80 25 70 Q 15 60 20 50',
    defaultScale: 1.3
  },

  // --- STAINS ---
  {
    id: 'stain_01',
    name: 'Coffee Ring',
    category: 'stains',
    path: 'M 50 10 A 40 40 0 1 0 50 90 A 40 40 0 1 0 50 10 M 50 15 A 35 35 0 1 1 50 85 A 35 35 0 1 1 50 15',
    defaultScale: 1.5
  },
  {
    id: 'stain_02',
    name: 'Broken Spill',
    category: 'stains',
    path: 'M 30 30 Q 50 20 70 30 Q 80 50 70 70 Q 50 80 30 70 Q 20 50 30 30 Z M 40 40 m -2 0 a 2 2 0 1 0 4 0 a 2 2 0 1 0 -4 0',
    defaultScale: 1.2
  },

  // --- HALFTONE ---
  {
    id: 'ht_01',
    name: 'Dense Halftone',
    category: 'halftone',
    path: 'M 10 10 m -2 0 a 2 2 0 1 0 4 0 a 2 2 0 1 0 -4 0 M 30 10 m -2 0 a 2 2 0 1 0 4 0 a 2 2 0 1 0 -4 0 M 50 10 m -2 0 a 2 2 0 1 0 4 0 a 2 2 0 1 0 -4 0 M 10 30 m -2 0 a 2 2 0 1 0 4 0 a 2 2 0 1 0 -4 0 M 30 30 m -2 0 a 2 2 0 1 0 4 0 a 2 2 0 1 0 -4 0 M 50 30 m -2 0 a 2 2 0 1 0 4 0 a 2 2 0 1 0 -4 0',
    defaultScale: 1.0
  },
  {
    id: 'ht_02',
    name: 'Gradient Dots',
    category: 'halftone',
    path: 'M 10 10 m -4 0 a 4 4 0 1 0 8 0 a 4 4 0 1 0 -8 0 M 30 10 m -3 0 a 3 3 0 1 0 6 0 a 3 3 0 1 0 -6 0 M 50 10 m -2 0 a 2 2 0 1 0 4 0 a 2 2 0 1 0 -4 0 M 70 10 m -1 0 a 1 1 0 1 0 2 0 a 1 1 0 1 0 -2 0',
    defaultScale: 1.0
  },
];
