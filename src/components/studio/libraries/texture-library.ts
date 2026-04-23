export interface TextureItem {
  name: string;
  url: string;
  type: 'materic' | 'geometric' | 'overlay';
  filterType?: string; // Mappa ai filtri shader in creative-studio
  folder?: string;     // Percorso cartella opzionale
}

export const TEXTURE_LIBRARY: Record<string, TextureItem[]> = {
  'MATERIC (Organic/Fluid)': [
    { 
      name: 'Cinematic Grain', 
      type: 'materic',
      filterType: 'Grain',
      url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDI0IiBoZWlnaHQ9IjEwMjQiPjxmaWx0ZXIgaWQ9Im4iPjxmZVR1cmJ1bGVuY2UgdHlwZT0iZnJhY3RhbE5vaXNlIiBiYXNlRnJlcXVlbmN5PSIwLjY1IiBudW1PY3RhdmVzPSI1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIiBvcGFjaXR5PSIwLjIzIi8+PC9zdmc+' 
    },
    { 
      name: 'Analog Fiber', 
      type: 'materic',
      filterType: 'Fiber',
      url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDI0IiBoZWlnaHQ9IjEwMjQiPjxmaWx0ZXIgaWQ9Im4iPjxmZVR1cmJ1bGVuY2UgdHlwZT0iZnJhY3RhbE5vaXNlIiBiYXNlRnJlcXVlbmN5PSIwLjAxIDAuNSIgbnVtT2N0YXZlcz0iNCIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNuKSIgb3BhY2l0eT0iMC4yIi8+PC9zdmc+' 
    },
    { 
      name: 'Crushed Paper', 
      type: 'materic',
      filterType: 'Grain',
      url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDI0IiBoZWlnaHQ9IjEwMjQiPjxmaWx0ZXIgaWQ9Im4iPjxmZVR1cmJ1bGVuY2UgdHlwZT0iZnJhY3RhbE5vaXNlIiBiYXNlRnJlcXVlbmN5PSIwLjAyIDAuMDUiIG51bU9jdGF2ZXM9IjYiIHN0aXRjaFRpbGVzPSic3RpdGNoJy8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIiBvcGFjaXR5PSIwLjM1Ii8+PC9zdmc+' 
    }
  ],
  'GEOMETRIC (Large Patterns)': [
    { 
      name: 'Micro Dots 1024', 
      type: 'geometric',
      url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDI0IiBoZWlnaHQ9IjEwMjQiPjxwYXR0ZXJuIGlkPSJwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPjxjaXJjbGUgY3g9IjEiIGN5PSIxIiByPSIxIiBmaWxsPSJ3aGl0ZSIgb3BhY2l0eT0iMC4xNSIvPjwvcGF0dGVybj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI3ApIi8+PC9zdmc+' 
    },
    { 
      name: 'Blueprint Grid', 
      type: 'geometric',
      url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDI0IiBoZWlnaHQ9IjEwMjQiPjxwYXR0ZXJuIGlkPSJwIiB3aWR0aD0iODAiIGhlaWdodD0iODAiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiPjxwYXRoIGQ9Ik0gODAgMCBMIDAgMCBMIDAgODAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjE1Ii8+PC9wYXR0ZXJuPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw0PSJ1cmwoI3ApIi8+PC9zdmc+' 
    },
    { 
      name: 'CRT Scanlines', 
      type: 'geometric',
      url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDI0IiBoZWlnaHQ9IjEwMjQiPjxwYXR0ZXJuIGlkPSJwIiB3aWR0aD0iMTAyNCIgaGVpZ2h0PSI0IiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIyIiBmaWxsPSJ3aGl0ZSIgb3BhY2l0eT0iMC4wNSIvPjwvcGF0dGVybj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI3ApIi8+PC9zdmc+' 
    }
  ],
  'EDITORIAL (Overlays)': [
    { 
      name: 'Plastic Wrap', 
      type: 'overlay',
      url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDI0IiBoZWlnaHQ9IjEwMjQiPjxmaWx0ZXIgaWQ9InAiPjxmZVR1cmJ1bGVuY2UgdHlwZT0iZnJhY3RhbE5vaXNlIiBiYXNlRnJlcXVlbmN5PSIwLjAxIDAuMDMiIG51bU9jdGF2ZXM9IjUiIHN0aXRjaFRpbGVzPSic3RpdGNoIi8+PGZlU3BlY3VsYXJMaWdodGluZyBzcGVjdWxhckV4cG9uZW50PSI0NCIgc3VjZmFjZVNjYWxlPSI1IiBsaWdodGluZy1jb2xvcj0id2hpdGUiPjxmZURpc3RhbnRMaWdodCBhemltdXRoPSI0NSIgZWxldmF0aW9uPSIzMCIvPjwvZmVTcGVjdWxhckxpZ2h0aW5nPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNwKSIgb3BhY2l0eT0iMC40Ii8+PC9zdmc+' 
    },
    { 
      name: 'Distortion Layer', 
      type: 'overlay',
      url: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDI0IiBoZWlnaHQ9IjEwMjQiPjxmaWx0ZXIgaWQ9Im4iPjxmZVR1cmJ1bGVuY2UgdHlwZT0iZnJhY3RhbE5vaXNlIiBiYXNlRnJlcXVlbmN5PSIwLjkiIG51bU9jdGF2ZXM9IjQiIHN0aXRjaFRpbGVzPSic3RpdGNoJy8+PGZlQ29sb3JNYXRyaXggdHlwZT0ibWF0cml4IiB2YWx1ZXM9IjAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDEwMDAgLTUwMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNuKSIgb3BhY2l0eT0iMC4xNSIvPjwvc3ZnPg==' 
    }
  ],
  'DESIGN SYNDROME (Exclusive)': [
    // Papers
    { name: 'DS Fine Paper 01', url: '/assets/textures/ds-paper/design syndrome paper texture free1 .png', type: 'materic' },
    { name: 'DS Craft Paper 02', url: '/assets/textures/ds-paper/design syndrome paper texture free2 .png', type: 'materic' },
    { name: 'DS Fiber Paper 03', url: '/assets/textures/ds-paper/design syndrome paper texture free3 .png', type: 'materic' },
    
    // Noise & Glitch
    { name: 'DS Digital Noise', url: '/assets/textures/ds-noise/design syndrome noise texture 2 .png', type: 'materic' },
    { name: 'DS Deep Grain', url: '/assets/textures/ds-noise/design syndrome noise texture 3 .png', type: 'materic' },
    { name: 'DS Wave Glitch', url: '/assets/textures/ds-noise/design syndrome wave noise texture.png', type: 'materic' },
    { name: 'DS Kinetic Noise', url: '/assets/textures/ds-noise/design syndrome wave noise texture 5  .png', type: 'materic' },
    { name: 'DS Static Wash', url: '/assets/textures/ds-noise/design syndrome wave noise texture4 .png', type: 'materic' },

    // Overlays (Plastic)
    { name: 'DS Plastic Bag 01', url: '/assets/overlays/ds-plastic/Plastic-bags1.png', type: 'overlay' },
    { name: 'DS Plastic Bag 02', url: '/assets/overlays/ds-plastic/Plastic-bags2.png', type: 'overlay' },
    { name: 'DS Shrink Wrap 03', url: '/assets/overlays/ds-plastic/Plastic-bags3.png', type: 'overlay' },
    { name: 'DS Liquid Plastic 04', url: '/assets/overlays/ds-plastic/Plastic-bags4.png', type: 'overlay' },
    { name: 'DS Vacuum Seal 05', url: '/assets/overlays/ds-plastic/Plastic-bags5.png', type: 'overlay' },
  ]
};

export const BRICOLAGE_ASSETS = [
  {
    name: 'Industrial Tape',
    path: 'M 0 0 L 100 0 L 98 40 L 2 40 Z',
    color: 'rgba(255, 255, 180, 0.5)',
    stroke: 'rgba(100, 100, 0, 0.1)',
    opacity: 0.7
  },
  {
    name: 'Silver Staple',
    path: 'M 0 0 L 40 0 L 40 5 L 35 5 L 35 2 L 5 2 L 5 5 L 0 5 Z',
    color: '#ddd',
    stroke: '#999',
    opacity: 1
  },
  {
    name: 'Broken Glass',
    path: 'M 50 10 L 80 40 L 60 45 L 90 80 L 30 70 L 40 40 Z',
    color: 'rgba(200, 230, 255, 0.2)',
    stroke: 'rgba(255, 255, 255, 0.4)',
    opacity: 0.6
  },
  {
    name: 'Neon Wire',
    path: 'M 10 50 Q 30 10 50 50 T 90 50',
    color: 'transparent',
    stroke: '#ff00ff',
    strokeWidth: 3,
    opacity: 1
  },
  {
    name: 'Duct Tape',
    path: 'M 0 5 L 120 2 L 118 45 L 5 48 Z',
    color: 'rgba(100, 100, 100, 0.6)',
    stroke: 'rgba(255, 255, 255, 0.2)',
    opacity: 0.7
  },
  {
    name: 'Torn Cardboard',
    path: 'M 10 10 L 90 12 L 95 40 L 85 85 L 12 90 L 5 45 Z',
    color: '#8d6e63',
    stroke: '#5d4037',
    opacity: 1
  }
];

