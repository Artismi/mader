/**
 * Pro Assets Library for Creative OS
 * Includes high-quality SVG paths for various professional design tools.
 */

export interface ProAsset {
  id: string;
  name: string;
  category: 'spray' | 'roller' | 'marker' | 'ink' | 'stains' | 'halftone' | 'stipple' | 'tribal' | 'assembly';
  path?: string;
  url?: string;
  type: 'svg' | 'image';
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
  { id: 'tribal',   label: 'DS Tribals' },
  { id: 'assembly', label: 'DS Assembly' },
];

export const PRO_ASSETS: ProAsset[] = [
  // --- SPRAY & SPLATTERS ---
  {
    id: 'spray_01',
    name: 'Fine Mist Splatter',
    category: 'spray',
    type: 'svg',
    path: 'M 50 50 m -2 -2 a 2 2 0 1 0 4 0 a 2 2 0 1 0 -4 0 M 60 40 m -1 -1 a 1 1 0 1 0 2 0 a 1 1 0 1 0 -2 0 M 40 60 m -1 -1 a 1 1 0 1 0 2 0 a 1 1 0 1 0 -2 0 M 55 55 m -0.5 -0.5 a 0.5 0.5 0 1 0 1 0 a 0.5 0.5 0 1 0 -1 0 M 45 45 m -0.5 -0.5 a 0.5 0.5 0 1 0 1 0 a 0.5 0.5 0 1 0 -1 0',
    defaultScale: 1.5
  },
  {
    id: 'spray_02',
    name: 'Urban Drip',
    type: 'svg',
    category: 'spray',
    path: 'M 50 10 Q 55 10 55 20 L 55 60 Q 55 70 50 70 Q 45 70 45 60 L 45 20 Q 45 10 50 10 M 60 15 Q 63 15 63 20 L 63 45 Q 63 50 60 50 Q 57 50 57 45 L 57 20 Q 57 15 60 15',
    defaultScale: 1.2
  },
  {
    id: 'spray_03',
    name: 'Heavy Splat',
    type: 'svg',
    category: 'spray',
    path: 'M 50 20 Q 70 10 80 30 Q 90 50 70 70 Q 50 90 30 70 Q 10 50 20 30 Q 30 10 50 20 Z M 55 55 m -5 -5 a 5 5 0 1 0 10 0 a 5 5 0 1 0 -10 0',
    defaultScale: 2
  },

  // --- ROLLERS ---
  {
    id: 'roller_01',
    name: 'Wet Roller Track',
    type: 'svg',
    category: 'roller',
    path: 'M 10 20 L 90 20 L 90 50 L 10 50 Z M 10 20 Q 5 20 5 25 L 5 45 Q 5 50 10 50 M 90 20 Q 95 20 95 25 L 95 45 Q 95 50 90 50',
    defaultScale: 3
  },
  {
    id: 'roller_02',
    name: 'Rough Texture',
    type: 'svg',
    category: 'roller',
    path: 'M 10 10 L 90 10 L 90 80 L 10 80 Z M 12 15 L 88 15 L 88 78 L 12 78 Z',
    defaultScale: 1.5
  },

  // --- MARKERS ---
  {
    id: 'marker_01',
    name: 'Chisel Tip Stroke',
    type: 'svg',
    category: 'marker',
    path: 'M 10 40 L 90 10 L 95 20 L 15 50 Z',
    defaultScale: 1.2
  },
  {
    id: 'marker_02',
    name: 'Soft Highlighter',
    type: 'svg',
    category: 'marker',
    path: 'M 5 20 L 95 20 L 95 45 L 5 45 Z',
    defaultScale: 2
  },

  // --- INK ---
  {
    id: 'ink_01',
    name: 'Ink Bleed Spot',
    type: 'svg',
    category: 'ink',
    path: 'M 50 50 m -20 0 a 20 20 0 1 0 40 0 a 20 20 0 1 0 -40 0 M 35 35 m -5 0 a 5 5 0 1 0 10 0 a 5 5 0 1 0 -10 0 M 65 65 m -5 0 a 5 5 0 1 0 10 0 a 5 5 0 1 0 -10 0',
    defaultScale: 1.5
  },
  {
    id: 'ink_02',
    name: 'Liquid Flow',
    type: 'svg',
    category: 'ink',
    path: 'M 20 50 Q 35 20 50 50 T 80 50 Q 85 60 75 70 Q 65 80 50 80 Q 35 80 25 70 Q 15 60 20 50',
    defaultScale: 1.3
  },

  // --- STAINS ---
  {
    id: 'stain_01',
    name: 'Coffee Ring',
    type: 'svg',
    category: 'stains',
    path: 'M 50 10 A 40 40 0 1 0 50 90 A 40 40 0 1 0 50 10 M 50 15 A 35 35 0 1 1 50 85 A 35 35 0 1 1 50 15',
    defaultScale: 1.5
  },
  {
    id: 'stain_02',
    name: 'Broken Spill',
    type: 'svg',
    category: 'stains',
    path: 'M 30 30 Q 50 20 70 30 Q 80 50 70 70 Q 50 80 30 70 Q 20 50 30 30 Z M 40 40 m -2 0 a 2 2 0 1 0 4 0 a 2 2 0 1 0 -4 0',
    defaultScale: 1.2
  },

  // --- HALFTONE ---
  {
    id: 'ht_01',
    name: 'Dense Halftone',
    type: 'svg',
    category: 'halftone',
    path: 'M 10 10 m -2 0 a 2 2 0 1 0 4 0 a 2 2 0 1 0 -4 0 M 30 10 m -2 0 a 2 2 0 1 0 4 0 a 2 2 0 1 0 -4 0 M 50 10 m -2 0 a 2 2 0 1 0 4 0 a 2 2 0 1 0 -4 0 M 10 30 m -2 0 a 2 2 0 1 0 4 0 a 2 2 0 1 0 -4 0 M 30 30 m -2 0 a 2 2 0 1 0 4 0 a 2 2 0 1 0 -4 0 M 50 30 m -2 0 a 2 2 0 1 0 4 0 a 2 2 0 1 0 -4 0',
    defaultScale: 1.0
  },
  {
    id: 'ht_02',
    name: 'Gradient Dots',
    type: 'svg',
    category: 'halftone',
    path: 'M 10 10 m -4 0 a 4 4 0 1 0 8 0 a 4 4 0 1 0 -8 0 M 30 10 m -3 0 a 3 3 0 1 0 6 0 a 3 3 0 1 0 -6 0 M 50 10 m -2 0 a 2 2 0 1 0 4 0 a 2 2 0 1 0 -4 0 M 70 10 m -1 0 a 1 1 0 1 0 2 0 a 1 1 0 1 0 -2 0',
    defaultScale: 1.0
  },

  // --- DESIGN SYNDROME TRIBALS ---
  { id: 'ds_tribal_01', name: 'DS Tribal Heart', category: 'tribal', type: 'image', url: '/assets/elements/ds-tribals/design_syndrome_vektor graphs BArtboard 3.png', defaultScale: 0.8 },
  { id: 'ds_tribal_02', name: 'DS Tribal Cross', category: 'tribal', type: 'image', url: '/assets/elements/ds-tribals/design_syndrome_vektor graphs BArtboard 4.png', defaultScale: 0.8 },
  { id: 'ds_tribal_03', name: 'DS Tribal Star', category: 'tribal', type: 'image', url: '/assets/elements/ds-tribals/design_syndrome_vektor graphs BArtboard 5.png', defaultScale: 0.8 },
  { id: 'ds_tribal_04', name: 'DS Tribal Shield', category: 'tribal', type: 'image', url: '/assets/elements/ds-tribals/design_syndrome_vektor graphs BArtboard 6.png', defaultScale: 0.8 },
  { id: 'ds_tribal_05', name: 'DS Tribal Gothic', category: 'tribal', type: 'image', url: '/assets/elements/ds-tribals/design_syndrome_vektor graphs BArtboard 7.png', defaultScale: 0.8 },
  { id: 'ds_tribal_06', name: 'DS Tribal Blade', category: 'tribal', type: 'image', url: '/assets/elements/ds-tribals/design_syndrome_vektor graphs BArtboard 10.png', defaultScale: 0.8 },
  { id: 'ds_tribal_07', name: 'DS Tribal Spike', category: 'tribal', type: 'image', url: '/assets/elements/ds-tribals/design_syndrome_vektor graphs BArtboard 12.png', defaultScale: 0.8 },
  { id: 'ds_tribal_08', name: 'DS Tribal Crest', category: 'tribal', type: 'image', url: '/assets/elements/ds-tribals/design_syndrome_vektor graphs BArtboard 15.png', defaultScale: 0.8 },
  { id: 'ds_tribal_09', name: 'DS Tribal Vector 20', category: 'tribal', type: 'image', url: '/assets/elements/ds-tribals/design_syndrome_vektor graphs BArtboard 20.png', defaultScale: 0.8 },
  { id: 'ds_tribal_10', name: 'DS Tribal Vector 25', category: 'tribal', type: 'image', url: '/assets/elements/ds-tribals/design_syndrome_vektor graphs BArtboard 25.png', defaultScale: 0.8 },
  
  // --- DESIGN SYNDROME ASSEMBLY ---
  { id: 'ds_assembly_01', name: 'DS Tech Circle', category: 'assembly', type: 'image', url: '/assets/elements/ds-assembly/Asset 1 Design syndrome Assembly .png', defaultScale: 0.5 },
  { id: 'ds_assembly_02', name: 'DS Grid Module', category: 'assembly', type: 'image', url: '/assets/elements/ds-assembly/Asset 6 Design syndrome Assembly .png', defaultScale: 0.5 },
  { id: 'ds_assembly_03', name: 'DS Data Node', category: 'assembly', type: 'image', url: '/assets/elements/ds-assembly/Asset 19 Design syndrome Assembly .png', defaultScale: 0.5 },
  { id: 'ds_assembly_04', name: 'DS Signal Wave', category: 'assembly', type: 'image', url: '/assets/elements/ds-assembly/Asset 25 Design syndrome Assembly .png', defaultScale: 0.5 },
  { id: 'ds_assembly_05', name: 'DS Tech Gear', category: 'assembly', type: 'image', url: '/assets/elements/ds-assembly/Asset 10 Design syndrome Assembly .png', defaultScale: 0.5 },
  { id: 'ds_assembly_06', name: 'DS Hud Target', category: 'assembly', type: 'image', url: '/assets/elements/ds-assembly/Asset 15 Design syndrome Assembly .png', defaultScale: 0.5 },
  { id: 'ds_assembly_07', name: 'DS Binary Ring', category: 'assembly', type: 'image', url: '/assets/elements/ds-assembly/Asset 22 Design syndrome Assembly .png', defaultScale: 0.5 },
  { id: 'ds_assembly_08', name: 'DS Master Sheet', category: 'assembly', type: 'svg', url: '/assets/elements/ds-assembly/MASTER SHEET DESIGN SYNDROME ASSEMBLY.svg', defaultScale: 1.0 },
];
