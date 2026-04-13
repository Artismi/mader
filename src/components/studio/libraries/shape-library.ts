export const SHAPE_LIBRARY = {
  'STILE BRUTALIST (Acid Thorns)': [
    { name:'Thorn A',     path:'M 50 0 L 53 47 L 100 50 L 53 53 L 50 100 L 47 53 L 0 50 L 47 47 Z' },
    { name:'Thorn B',     path:'M 50 5 L 55 45 L 95 50 L 55 55 L 50 95 L 45 55 L 5 50 L 45 45 Z' },
    { name:'Acid Sun',    path:'M 50 0 L 55 35 L 85 15 L 65 45 L 100 50 L 65 55 L 85 85 L 55 65 L 50 100 L 45 65 L 15 85 L 35 55 L 0 50 L 35 45 L 15 15 L 45 35 Z' },
    { name:'Jagged Star', path:'M 50 10 L 60 40 L 90 20 L 70 50 L 100 80 L 60 70 L 50 100 L 40 70 L 0 80 L 30 50 L 10 20 L 40 40 Z' },
    { name:'Sharp Spike', path:'M 50 0 L 52 48 H 100 V 52 H 52 V 100 H 48 V 52 H 0 V 48 H 48 Z' },
    { name:'Circuit Star',path:'M 50 0 L 55 45 L 100 45 V 55 H 55 L 50 100 L 45 55 H 0 V 45 H 45 Z' },
    { name:'Razor Edge',  path:'M 0 50 L 45 48 L 50 0 L 55 48 L 100 50 L 55 52 L 50 100 L 45 52 Z' }
  ],
  'STILE ORGANIC (Blobs/Opple)': [
    { name:'Opple Liquid',   path:'M 50 10 C 80 10 95 35 95 60 C 95 85 75 95 50 95 C 25 95 5 80 5 50 C 5 20 20 10 50 10 Z' },
    { name:'Amoeba',        path:'M 45 15 C 70 5 95 25 90 55 C 85 85 65 95 40 90 C 15 85 5 65 10 35 C 15 5 20 25 45 15 Z' },
    { name:'Fluid Wave',    path:'M 0 50 C 20 20 40 80 60 50 C 80 20 100 80 100 50 L 100 100 L 0 100 Z' },
    { name:'Melting Disc',  path:'M 50 5 C 90 5 100 40 100 50 C 100 90 60 100 50 100 C 10 100 0 70 0 50 C 0 30 10 5 50 5 Z' },
    { name:'Organic Mesh',  path:'M 30 10 C 50 0 80 20 90 50 C 100 80 70 100 40 90 C 10 80 0 50 30 10' },
    { name:'Soft Portal',   path:'M 50 20 C 70 20 80 40 80 60 C 80 80 60 90 50 90 C 40 90 20 80 20 60 C 20 40 30 20 50 20 Z M 50 35 C 40 35 35 45 35 55 C 35 65 40 75 50 75 C 60 75 65 65 65 55 C 65 45 60 35 50 35 Z' }
  ],
  'STILE GEOMETRIC (Spheres/3D)': [
    { name:'Sphere Wire',   path:'M 50 5 A 45 45 0 1 1 49.9 5 Z M 50 5 V 95 M 5 50 H 95 M 15 15 L 85 85 M 85 15 L 15 85' },
    { name:'Iso Cube',      path:'M 50 0 L 95 25 L 95 75 L 50 100 L 5 75 L 5 25 Z M 50 0 V 50 M 50 50 L 5 25 M 50 50 L 95 25' },
    { name:'Planet Ring',   path:'M 50 20 A 30 30 0 1 1 50 80 A 30 30 0 1 1 50 20 Z M 10 50 Q 50 90 90 50 Q 50 10 10 50' },
    { name:'Prism 3D',      path:'M 50 10 L 90 80 L 10 80 Z M 50 10 V 80 M 50 80 L 90 80 M 50 80 L 10 80' },
    { name:'Atom Core',     path:'M 50 40 A 10 10 0 1 1 50 60 A 10 10 0 1 1 50 40 Z M 10 50 Q 50 10 90 50 Q 50 90 10 50 M 30 20 Q 50 50 70 80 M 70 20 Q 50 50 30 80' },
    { name:'Diamond Geo',   path:'M 50 5 L 85 35 L 50 95 L 15 35 Z M 15 35 H 85 M 50 5 V 95 M 50 35 L 15 35 M 50 35 L 85 35' }
  ],
  'STILE EDITORIAL (High-End)': [
    { name:'Swiss Cross',   path:'M 40 10 H 60 V 40 H 90 V 60 H 60 V 90 H 40 V 60 H 10 V 40 H 40 Z' },
    { name:'Brackets duo',  path:'M 20 10 H 10 V 90 H 20 M 80 10 H 90 V 90 H 80' },
    { name:'Focus Mark',    path:'M 10 30 V 10 H 30 M 70 10 H 90 V 30 M 90 70 V 90 H 70 M 30 90 H 10 V 70' },
    { name:'Rule Bold',     path:'M 0 45 H 100 V 55 H 0 Z' },
    { name:'L - Corner',    path:'M 10 50 V 10 H 50' },
    { name:'Crosshair',     path:'M 50 0 V 100 M 0 50 H 100 M 50 50 m -10 0 a 10 10 0 1 0 20 0 a 10 10 0 1 0 -20 0' }
  ],
  'BASIC (Original)': [
    { name:'Rect',      path:'M 0 0 L 100 0 L 100 100 L 0 100 Z' },
    { name:'Circle',    path:'M 50 0 A 50 50 0 1 1 50 100 A 50 50 0 1 1 50 0 Z' },
    { name:'Triangle',  path:'M 50 5 L 95 90 L 5 90 Z' },
    { name:'Hexagon',   path:'M 50 0 L 93 25 L 93 75 L 50 100 L 7 75 L 7 25 Z' },
    { name:'Star',      path:'M 50 5 L 61 35 L 95 35 L 70 55 L 80 90 L 50 70 L 20 90 L 30 55 L 5 35 L 39 35 Z' },
    { name:'Heart',     path:'M 50 80 C 35 68 10 58 10 38 C 10 20 28 15 50 35 C 72 15 90 20 90 38 C 90 58 65 68 50 80 Z' }
  ],
  'EXPERIMENTAL (Original)': [
    { name:'Blob 1',    path:'M 50 5 C 70 5 90 20 90 50 C 90 80 70 95 50 95 C 20 95 5 70 5 50 C 5 20 20 5 50 5 Z' },
    { name:'Blob 2',    path:'M 45 10 C 65 8 85 25 92 48 C 98 75 70 92 48 95 C 25 98 8 72 10 45 C 12 18 20 12 45 10 Z' },
    { name:'Squiggle',  path:'M 5 50 C 20 30 40 70 60 40 C 80 10 95 60 95 60' },
    { name:'Ink Splat', path:'M 50 40 C 60 30 70 50 80 40 C 90 50 70 60 75 70 C 65 80 60 60 50 70 C 40 80 35 60 25 70 C 30 60 10 50 20 40 C 30 30 40 50 50 40 Z' }
  ],
  'EDITORIAL (Original)': [
    { name:'Rule L',    path:'M 5 50 L 95 50' },
    { name:'Corner',    path:'M 5 20 L 5 5 L 20 5' },
    { name:'Bracket L', path:'M 10 10 L 5 10 L 5 90 L 10 90' },
    { name:'Bracket R', path:'M 90 10 L 95 10 L 95 90 L 90 90' },
    { name:'Swiss Cross', path:'M 45 5 L 55 5 L 55 45 L 95 45 L 95 55 L 55 55 L 55 95 L 45 95 L 45 55 L 5 55 L 5 45 L 45 45 Z' }
  ],
  'BRUTALIST (Original)': [
    { name:'X Mark',    path:'M 10 10 L 90 90 M 90 10 L 10 90' },
    { name:'Arrow Bold',path:'M 10 40 L 60 40 L 60 20 L 90 50 L 60 80 L 60 60 L 10 60 Z' },
    { name:'Bold Bar',  path:'M 0 40 L 100 40 L 100 60 L 0 60 Z' }
  ],
  'TECH-DISTOPIAN (God-Mode)': [
    { name: 'Mirino Precisione', path: 'M 50 0 L 50 100 M 0 50 L 100 50 M 50 50 m -10 0 a 10 10 0 1 0 20 0 a 10 10 0 1 0 -20 0 M 50 50 m -30 0 a 30 30 0 1 0 60 0 a 30 30 0 1 0 -60 0' },
    { name: 'Circuito L', path: 'M 20 20 L 80 20 L 80 80 M 80 20 L 95 20 M 80 80 L 80 95' },
    { name: 'Glifo X', path: 'M 20 20 L 80 80 M 80 20 L 20 80 M 50 50 m -5 0 a 5 5 0 1 0 10 0 a 5 5 0 1 0 -10 0' },
    { name: 'Grid Mini', path: 'M 10 10 L 90 10 M 10 30 L 90 30 M 10 50 L 90 50 M 10 70 L 90 70 M 10 90 L 90 90 M 10 10 L 10 90 M 30 10 L 30 90 M 50 10 L 50 90 M 70 10 L 70 90 M 90 10 L 90 90' },
    { name: 'Blueprint Box', path: 'M 10 10 L 90 10 L 90 90 L 10 90 Z M 10 10 L 30 30 M 90 10 L 70 30 M 10 90 L 30 70 M 90 90 L 70 70' },
    { name: 'Sfera Tecnica', path: 'M 50 50 m -40 0 a 40 40 0 1 0 80 0 a 40 40 0 1 0 -80 0 M 10 50 Q 50 10 90 50 Q 50 90 10 50 M 50 10 Q 10 50 50 90 Q 90 50 50 10' }
  ],
  'BRUTALIST GLIPHS': [
    { name: 'Spike', path: 'M 50 0 L 60 40 L 100 50 L 60 60 L 50 100 L 40 60 L 0 50 L 40 40 Z' },
    { name: 'Orbit', path: 'M 50 50 m -45 0 a 45 45 0 1 0 90 0 a 45 45 0 1 0 -90 0 M 50 50 m -25 0 a 25 25 0 1 0 50 0 a 25 25 0 1 0 -50 0' },
    { name: 'Scanner', path: 'M 0 20 L 100 20 M 0 80 L 100 80 M 20 0 L 20 100 M 80 0 L 80 100' }
  ],
  'Y2K & ACID GRAPHICS': [
    { name: 'Y2K Starburst', path: 'M 50 0 L 55 35 L 85 15 L 65 45 L 100 50 L 65 55 L 85 85 L 55 65 L 50 100 L 45 65 L 15 85 L 35 55 L 0 50 L 35 45 L 15 15 L 45 35 Z M 50 20 L 52 40 L 70 30 L 58 48 L 80 50 L 58 52 L 70 70 L 52 60 L 50 80 L 48 60 L 30 70 L 42 52 L 20 50 L 42 48 L 30 30 L 48 40 Z' },
    { name: 'Acid Smiley', path: 'M 50 5 C 75 5 95 25 95 50 C 95 75 75 95 50 95 C 25 95 5 75 5 50 C 5 25 25 5 50 5 Z M 35 35 A 5 5 0 1 1 35 45 A 5 5 0 1 1 35 35 Z M 65 35 A 5 5 0 1 1 65 45 A 5 5 0 1 1 65 35 Z M 30 65 Q 50 85 70 65 Q 50 75 30 65 Z' },
    { name: 'Chrome Tribal', path: 'M 0 50 Q 20 20 50 0 Q 80 20 100 50 Q 80 80 50 100 Q 20 80 0 50 Z M 20 50 Q 35 35 50 20 Q 65 35 80 50 Q 65 65 50 80 Q 35 65 20 50 Z' },
    { name: 'Y2K Sparkle', path: 'M 50 10 Q 50 50 90 50 Q 50 50 50 90 Q 50 50 10 50 Q 50 50 50 10 Z' },
    { name: 'Shattered Glass', path: 'M 50 50 L 10 10 M 50 50 L 90 20 M 50 50 L 80 90 M 50 50 L 20 80 M 50 50 L 40 10 M 50 50 L 90 60 M 10 10 L 40 10 L 90 20 L 90 60 L 80 90 L 20 80 Z' }
  ],
  'HUD & BLUEPRINT (Pro)': [
    { name: 'Radar Sweep', path: 'M 50 5 A 45 45 0 1 1 5 50 M 50 50 L 95 50 M 50 50 L 50 5' },
    { name: 'Targeting Box', path: 'M 10 30 V 10 H 30 M 70 10 H 90 V 30 M 90 70 V 90 H 70 M 30 90 H 10 V 70 M 50 40 V 60 M 40 50 H 60 M 50 50 m -15 0 a 15 15 0 1 0 30 0 a 15 15 0 1 0 -30 0' },
    { name: 'Tech Data Chart', path: 'M 10 90 L 30 60 L 50 70 L 70 30 L 90 40 M 10 90 H 90 V 10 M 10 10 H 20 M 10 30 H 20 M 10 50 H 20 M 10 70 H 20' },
    { name: 'Data Grid', path: 'M 20 20 H 80 V 80 H 20 Z M 20 40 H 80 M 20 60 H 80 M 40 20 V 80 M 60 20 V 80' },
    { name: 'Cypher Wheel', path: 'M 50 10 A 40 40 0 1 1 10 50 A 40 40 0 0 1 50 10 Z M 50 20 A 30 30 0 0 1 80 50 M 50 80 A 30 30 0 0 1 20 50 M 50 20 V 80 M 20 50 H 80' }
  ],
  'SWISS & BAUHAUS': [
    { name: 'Bauhaus Arc', path: 'M 90 90 V 10 A 80 80 0 0 0 10 90 Z' },
    { name: 'Bauhaus Semicircle', path: 'M 10 50 A 40 40 0 0 1 90 50 Z' },
    { name: 'Swiss Heavy Cross', path: 'M 35 15 H 65 V 35 H 85 V 65 H 65 V 85 H 35 V 65 H 15 V 35 H 35 Z' },
    { name: 'Strict Grid 3x3', path: 'M 10 10 H 90 V 90 H 10 Z M 36 10 V 90 M 63 10 V 90 M 10 36 H 90 M 10 63 H 90' },
    { name: 'Diagonal Split', path: 'M 10 10 H 90 V 90 H 10 Z M 10 90 L 90 10' }
  ],
  'ORGANIC & HAIKEI BLOBS': [
    { name: 'Smooth Blob A', path: 'M 45 10 C 70 5 95 30 90 60 C 85 90 60 95 35 85 C 10 75 5 45 15 25 C 25 5 20 15 45 10 Z' },
    { name: 'Smooth Blob B', path: 'M 50 95 C 20 95 5 70 10 40 C 15 10 40 5 70 15 C 100 25 95 60 85 85 C 75 110 80 95 50 95 Z' },
    { name: 'Wobbly Oval', path: 'M 50 15 C 80 10 95 40 90 70 C 85 100 50 95 25 80 C 0 65 5 30 20 15 C 35 0 20 20 50 15 Z' },
    { name: 'Liquid Drop', path: 'M 50 5 C 65 35 90 60 90 75 C 90 95 70 95 50 95 C 30 95 10 95 10 75 C 10 60 35 35 50 5 Z' }
  ],
  'ELEMENTI': [
    { name:'User',    path:'M 20 21 V 19 A 4 4 0 0 0 16 15 H 8 A 4 4 0 0 0 4 19 V 21 M 12 11 A 4 4 0 1 0 12 3 A 4 4 0 1 0 12 11 Z' },
    { name:'Mail',    path:'M 4 4 H 20 C 21.1 4 22 4.9 22 6 V 18 C 22 19.1 21.1 20 20 20 H 4 C 2.9 20 2 19.1 2 18 V 6 C 2 4.9 2.9 4 4 4 Z M 22 6 L 12 13 L 2 6' },
    { name:'Search',  path:'M 11 19 A 8 8 0 1 0 11 3 A 8 8 0 1 0 11 19 Z M 21 21 L 16.65 16.65' },
    { name:'Grid',    path:'M 3 3 H 10 V 10 H 3 Z M 14 3 H 21 V 10 H 14 Z M 3 14 H 10 V 21 H 3 Z M 14 14 H 21 V 21 H 14 Z' }
  ]
};

export const ICONS_LIBRARY = [
  { name:'User',    path:'M 20 21 V 19 A 4 4 0 0 0 16 15 H 8 A 4 4 0 0 0 4 19 V 21 M 12 11 A 4 4 0 1 0 12 3 A 4 4 0 1 0 12 11 Z' },
  { name:'Mail',    path:'M 4 4 H 20 C 21.1 4 22 4.9 22 6 V 18 C 22 19.1 21.1 20 20 20 H 4 C 2.9 20 2 19.1 2 18 V 6 C 2 4.9 2.9 4 4 4 Z M 22 6 L 12 13 L 2 6' },
  { name:'Search',  path:'M 11 19 A 8 8 0 1 0 11 3 A 8 8 0 1 0 11 19 Z M 21 21 L 16.65 16.65' },
  { name:'Grid',    path:'M 3 3 H 10 V 10 H 3 Z M 14 3 H 21 V 10 H 14 Z M 3 14 H 10 V 21 H 3 Z M 14 14 H 21 V 21 H 14 Z' }
];
