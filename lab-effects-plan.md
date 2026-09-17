# Creative OS Lab — Piano Effetti v2

## Stato attuale: cosa non funziona

### Chladni — da rifare
L'implementazione attuale è una dot matrix con formula diversa. Non assomiglia a pattern di Chladni reali.

**Problema tecnico:** disegna particelle sparse pesate dall'ampiezza della funzione, invece di renderizzare le linee nodali come SDF continuo.

**Come deve essere:**
- Fondo scuro, linee/zone luminose dove `|sin(mπx)sin(nπy) + sin(nπx)sin(mπy)|` è vicino a zero
- Linee continue e sottili, non dots
- Figure geometriche precise — quadrati, rombi, croci, stelle, a seconda di m/n
- Animazione: parametro `speed` cambia m/n nel tempo → morphing tra pattern
- Source color: sovrappone il colore del testo originale alla figura

**Shader target:**
```glsl
float chladni(vec2 uv, float m, float n) {
  float v = sin(m * PI * uv.x) * sin(n * PI * uv.y)
          + sin(n * PI * uv.x) * sin(m * PI * uv.y);
  return smoothstep(0.0, thickness, abs(v));
}
```
Risultato: linee nodali come silhouette luminose su sfondo trasparente/scuro.

---

### Dot Matrix — da rifondare
**Problema:** a bassa densità l'immagine sparisce. L'effetto attuale non scala il dot size sulla luminosità locale.

**Come deve essere (retinatura tipografica reale):**
- Ogni "cella" della griglia ha un punto la cui **dimensione è proporzionale alla luminosità locale**
- A luminosità bassa (zone scure) → punto grande → zona scura ✓
- A luminosità alta (zone chiare) → punto piccolo → zona chiara ✓
- L'immagine rimane sempre riconoscibile, a qualsiasi densità
- Rotazione angolo per effetto CMYK multi-layer

**Varianti da supportare:**
- Circle (classico)
- Square (pixel art)
- Diamond (litografia)
- Line screen (giornale)

---

## Effetti mancanti — priorità

### TIER 1 — Da implementare subito (fondamentali)

#### 1. Vignette
L'effetto più usato in assoluto. Completamente assente.
```glsl
float dist = length(uv - 0.5) * 2.0;
float vignette = 1.0 - smoothstep(inner, outer, dist);
color.rgb *= mix(vignetteColor, vec3(1.0), vignette);
```
Controlli: intensità, raggio interno, raggio esterno, colore (default nero, ma anche colorato).

#### 2. Blur (Gaussian)
Assente. Fondamentale per design.
- Gaussian separable (orizzontale + verticale, 2 pass)
- Parametri: radius (px), quality (3/5/9 tap)
- Usato come base per molti altri effetti (halation, bokeh)

#### 3. Sharpen / Unsharp Mask
Assente. Essenziale per stampa.
- Unsharp mask = originale - gaussian_blur → esagera i bordi
- Parametri: amount, radius, threshold

#### 4. Chromatic Aberration (standalone)
Esiste solo come side-effect di VHS/glitch. Merita un controllo dedicato.
- Split RGB channels con offset diverso
- Modalità: radiale (come lente vera) o assiale (orizzontale)
- Parametri: amount, angle, radial vs axial

#### 5. Pixelate / Mosaic
Assente. Classico del graphic design.
- Divide in celle NxN, ogni cella = colore medio
- Parametri: size (px), forma cella (square/hex)

---

### TIER 2 — Effetti colore avanzati

#### 6. Duotone
Staple del design tipografico. Mappa le toni su 2 colori.
```glsl
float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
vec3 result = mix(colorShadow, colorHighlight, lum);
```
Controlli: colore shadows, colore highlights, curva (contrasto del mapping).
Preset: Spotify Duo, Risograph, Cyan/Magenta, Gold/Black, etc.

#### 7. Gradient Map
Mappa i toni su un gradiente colore arbitrario.
- Input: luminosità [0-1]
- Output: sample su gradiente definito dall'utente (fino a 5 stop)
- Blend mode con originale

#### 8. Posterize
Riduce i livelli di colore → look serigrafato.
```glsl
float levels = floor(color * numLevels) / numLevels;
```
Parametri: livelli (2-16), canali (RGB / luminosità sola).

#### 9. Solarize
Effetto camera oscura. Inverte i toni sopra una soglia.
```glsl
color = lum > threshold ? 1.0 - color : color;
```

---

### TIER 3 — Film & Print look

#### 10. Film Grain (reale)
Quello che abbiamo è noise gaussiano piatto. Il grain cinematografico è diverso:
- Strutturato, variabile per canale (più grana nel blu)
- Intensità proporzionale alla luminosità locale (più grana nelle mezzetinte)
- Animated (cambia ogni frame per effetto pellicola)
- Basato su noise di Perlin o Simplex, non random puro

#### 11. Film Halation ← PRIORITÀ ALTA
Bleeding della luce attorno agli highlight. Look Kodak Portra/Ektar.
- Estrai solo i pixel sopra soglia (highlights)
- Blur gaussiano molto ampio (radius 40-100px) colorato (tendenza rossa/arancio)
- Additive blend sull'originale
- Controlli: soglia highlight, raggio, colore tint, intensità
- Risultato: quella magia "glowy" della fotografia analogica

#### 12. Risograph
Stampa a duplicatore Riso — look grafico molto richiesto.
- Simula 2-3 "passate" colore separate (come tinte piatte Pantone)
- Ogni passata: posterize → grain pesante → leggera misregistrazione (offset 1-3px)
- Colori tipici: Fluorescent Pink, Risoflex, Federal Blue, Sunflower
- Controlli: n. colori, grain, misregistrazione, trasparenza sovrapposizione

#### 13. Screen Print / Serigrafia
- Separazione colori semplificata
- Mezzetinte per ogni canale
- Leggera misregistrazione tra colori
- Look poster anni '60-'70

---

### TIER 4 — Ottica avanzata

#### 14. Lens Distortion
- Barrel (convesso) / Pincushion (concavo)
- Formula: `uv_distorted = uv + k * |uv - 0.5|^2 * (uv - 0.5)`
- Parametri: k (negativo=barrel, positivo=pincushion), scala compensazione

#### 15. Bokeh / Depth Blur
- Blur circolare con forma dell'apertura del diaframma
- Forma: cerchio / esagono / ottagonale
- Parametri: raggio, forma apertura, boost highlight

#### 16. Emboss / Relief
- Illuminazione direzionale basata sul gradiente dell'immagine
- Risultato: aspetto plastico/metallico in rilievo
- Controlli: direzione luce, profondità, blend con colore originale

#### 17. Edge Glow
- Edge detection (Sobel) → find edges → bloom sui bordi
- Look: contorni luminosi su fondo scuro
- Controlli: soglia, spessore, colore, intensità bloom

---

## Refactoring da fare: razionalizzare i "dot effects"

Attualmente ci sono 4 effetti che si sovrappongono concettualmente:
- Dot Matrix (broken)
- Halftone (ok ma limitato)
- Pattern (generico, non focalizzato sull'immagine)
- Chladni (broken, non è un dot effect ma ci finisce vicino)

**Proposta:**
- **Halftone** → diventa "Halftone Pro" con dot/line/cross screen, supporto CMYK simulato
- **Dot Matrix** → rifondato come retinatura tipografica vera (size proporzionale a luma)
- **Chladni** → separato nel tab "Resonance", standalone, con varianti (Chladni/Lissajous/interference)
- **Pattern** → rimane ma separato come "Geometric Overlay" (non interagisce con l'immagine, solo overlay)

---

## Note implementative

### Priority queue
1. Fix Chladni (SDF nodal lines) — alta visibilità, già presente, solo sbagliato
2. Fix Dot Matrix (luma-based sizing) — già presente, solo sbagliato  
3. Vignette — 1 giorno, massimo impatto
4. Film Halation — 2 giorni, differenziante
5. Duotone — 1 giorno, workflow designer
6. Gaussian Blur — 1 giorno, fondamentale
7. Risograph — 3 giorni, differenziante massimo

### Architettura shader (invariante)
- Tutti i nuovi effetti seguono il pattern TSL (Three.js Shader Language)
- File separato per effetto: `src/components/studio/lab/nodes/[effect]-node.ts`
- Signature: `effectNode(src: TextureNode, uv: Node, ...params: UniformNode[]) => Node`
- Integrazione in WebGPULabEngine.tsx e WebGPUObjectOverlay.tsx tramite `mix(fc, effectResult, effectEnabled)`

### Uniforms da aggiungere a entrambi i renderer
Per ogni nuovo effetto aggiungere gli uniform in:
- `WebGPULabEngine.tsx` (artboard mode)
- `WebGPUObjectOverlay.tsx` (object mode)
- `use-lab-store.ts` (state + defaults)
- `LabPanel.tsx` (UI controls)
