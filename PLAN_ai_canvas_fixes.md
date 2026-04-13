# Piano — AI Canvas Fixes & Quality Upgrade

**Obiettivo:** Eliminare i crash Gemini sullo schema, completare il canvas engine, e allineare system prompt con l'implementazione reale.

---

## File da modificare

| File | Sezione |
|------|---------|
| `src/app/api/ai/route.ts` | Schema Zod tool P0 |
| `src/components/studio/creative-studio.tsx` | `handleAICommand` righe 2045–2224 |
| `src/lib/ai/defaults.ts` | Skill `progettista` — schema reference |

---

## Step 1 — P0: Schema Zod per `createDesignBoards` e `updateCanvasElements`

**File:** `src/app/api/ai/route.ts`  
**Dove:** Aggiungere subito dopo `recurringSchema` (~riga 37), prima di `export async function POST`

### 1A — Aggiungere schema ausiliari

```typescript
// ── Schema ausiliari canvas tools ──────────────────────────────────────────

const gradientStopSchema = z.object({
  offset: z.number().min(0).max(1),
  color: z.string(),
})

const canvasElementSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['text', 'rect', 'circle', 'image', 'path', 'line']),
  // Posizione / dimensione
  x: z.number().optional(),
  y: z.number().optional(),
  w: z.number().optional(),
  h: z.number().optional(),
  // Griglia 12 colonne
  column: z.number().int().min(0).max(11).optional(),
  span: z.number().int().min(1).max(12).optional(),
  // Allineamento
  alignX: z.enum(['left', 'center', 'right']).optional(),
  alignY: z.enum(['top', 'center', 'bottom']).optional(),
  marginRight: z.number().optional(),
  marginBottom: z.number().optional(),
  // Stile comune
  color: z.string().optional(),
  opacity: z.number().min(0).max(1).optional(),
  zIndex: z.number().int().optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().optional(),
  borderRadius: z.union([z.number(), z.string()]).optional(),
  gradient: z.object({
    type: z.enum(['linear', 'radial']).optional(),
    angle: z.number().optional(),
    stops: z.array(gradientStopSchema),
  }).optional(),
  // Testo
  text: z.string().optional(),
  fontFamily: z.string().optional(),
  fontSize: z.union([z.number(), z.string()]).optional(),
  fontWeight: z.union([z.string(), z.number()]).optional(),
  fontStyle: z.enum(['normal', 'italic', 'oblique']).optional(),
  textAlign: z.enum(['left', 'center', 'right', 'justify']).optional(),
  letterSpacing: z.number().optional(),   // em — convertito in charSpacing*1000 da Fabric
  lineHeight: z.number().optional(),
  textTransform: z.enum(['none', 'uppercase', 'lowercase']).optional(),
  // Immagine
  url: z.string().optional(),
  filter: z.string().optional(),
  filterIntensity: z.number().optional(),
  effects: z.array(z.string()).optional(),
  effectProps: z.record(z.string(), z.unknown()).optional(),
  // Path / Shape
  shapeId: z.string().optional(),
  pathData: z.string().optional(),
  scaleX: z.number().optional(),
  scaleY: z.number().optional(),
  // Line
  x1: z.number().optional(),
  y1: z.number().optional(),
  x2: z.number().optional(),
  y2: z.number().optional(),
})

const designBoardSchema = z.object({
  name: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  overwrite: z.boolean().optional(),
  elements: z.array(canvasElementSchema).optional(),
})

const canvasUpdateSchema = z.object({
  id: z.string().describe('Il name/id dell\'elemento nel canvas'),
  changes: z.object({
    x: z.number().optional(),
    y: z.number().optional(),
    w: z.number().optional(),
    h: z.number().optional(),
    color: z.string().optional(),
    opacity: z.number().min(0).max(1).optional(),
    stroke: z.string().optional(),
    strokeWidth: z.number().optional(),
    borderRadius: z.number().optional(),
    text: z.string().optional(),
    fontFamily: z.string().optional(),
    fontSize: z.union([z.number(), z.string()]).optional(),
    fontWeight: z.union([z.string(), z.number()]).optional(),
    fontStyle: z.enum(['normal', 'italic', 'oblique']).optional(),
    textAlign: z.enum(['left', 'center', 'right', 'justify']).optional(),
    letterSpacing: z.number().optional(),
    lineHeight: z.number().optional(),
    textTransform: z.enum(['none', 'uppercase', 'lowercase']).optional(),
    scaleX: z.number().optional(),
    scaleY: z.number().optional(),
    effects: z.array(z.string()).optional(),
    effectProps: z.record(z.string(), z.unknown()).optional(),
  }),
})
```

### 1B — Sostituire `inputSchema` nei tool

**`createDesignBoards` (~riga 292):** sostituire
```typescript
// PRIMA
inputSchema: z.object({
  boards: z.array(z.any()).describe('Array di configurazioni...')
})
// DOPO
inputSchema: z.object({
  boards: z.array(designBoardSchema).describe(
    'Array di board. Ogni board ha name, width, height, elements (array di canvasElement).'
  ),
})
```

**`updateCanvasElements` (~riga 299):** sostituire
```typescript
// PRIMA
inputSchema: z.object({
  updates: z.array(z.any()).describe('...')
})
// DOPO
inputSchema: z.object({
  updates: z.array(canvasUpdateSchema).describe(
    'Array di update. Ogni entry ha "id" (name elemento nel canvas) e "changes".'
  ),
})
```

---

## Step 2 — P1: Fix blocco `text` in `createDesignBoards`

**File:** `src/components/studio/creative-studio.tsx`  
**Righe da sostituire:** 2045–2050

```typescript
// PRIMA
if (el.type === 'text') {
  injectGoogleFont(el.fontFamily || 'Inter')
  obj = new fabric.Textbox(el.text || '', {
    ...common, fontSize: resolveFontSize(el.fontSize || 32), fontFamily: el.fontFamily || 'Inter',
    fontWeight: el.fontWeight || '400', textAlign: el.textAlign || 'left', width: elW
  })
}

// DOPO
if (el.type === 'text') {
  injectGoogleFont(el.fontFamily || 'Inter')
  const rawText = el.text || ''
  const displayText = el.textTransform === 'uppercase' ? rawText.toUpperCase()
    : el.textTransform === 'lowercase' ? rawText.toLowerCase()
    : rawText
  obj = new fabric.Textbox(displayText, {
    ...common,
    fontSize: resolveFontSize(el.fontSize || 32),
    fontFamily: el.fontFamily || 'Inter',
    fontWeight: el.fontWeight || '400',
    fontStyle: el.fontStyle || 'normal',
    textAlign: el.textAlign || 'left',
    width: elW,
    ...(el.letterSpacing !== undefined && { charSpacing: el.letterSpacing * 1000 }),
    ...(el.lineHeight !== undefined && { lineHeight: el.lineHeight }),
  })
  if (el.textTransform) (obj as any)._textTransform = el.textTransform
}
```

---

## Step 3 — P1: Aggiungere type `line` in `handleAICommand`

**File:** `src/components/studio/creative-studio.tsx`  
**Riga 2060:** subito dopo la chiusura del branch `path` (`}`)

```typescript
// Aggiungere DOPO la chiusura del blocco path (riga 2060)
} else if (el.type === 'line') {
  const x1 = el.x1 ?? 0
  const y1 = el.y1 ?? 0
  const x2 = el.x2 ?? elW
  const y2 = el.y2 ?? 0
  obj = new fabric.Line([x1, y1, x2, y2], {
    ...common,
    stroke: resolveColor(el.stroke || el.color || '#ffffff'),
    strokeWidth: el.strokeWidth ?? 2,
    fill: '',
  })
}
```

---

## Step 4 — P1: Aggiungere branch `clearBoard`, `deleteElements`, `getCanvasState`

**File:** `src/components/studio/creative-studio.tsx`  
**Dove:** Riga 2223, dopo la chiusura `}` di `updateCanvasElements` e PRIMA della chiusura `}` di `handleAICommand` (riga 2224).

```typescript
    // ─── 3. clearBoard ────────────────────────────────────────────────────
    if (command.toolName === 'clearBoard') {
      const payload = command.result ?? command.args ?? {}
      const boardName = payload.boardName as string | undefined
      const objectsToRemove = canvas.getObjects().filter(o => {
        if ((o as any).isArtboard) return false
        if (boardName) return (o as any).parentBoard === boardName
        return true
      })
      objectsToRemove.forEach(o => canvas.remove(o))
      canvas.discardActiveObject()
      canvas.requestRenderAll()
      pushHistory()
    }

    // ─── 4. deleteElements ────────────────────────────────────────────────
    if (command.toolName === 'deleteElements') {
      const payload = command.result ?? command.args ?? {}
      const ids = (payload.ids as string[]) || []
      ids.forEach(id => {
        const obj = canvas.getObjects().find(o => o.get('name') === id)
        if (obj) canvas.remove(obj)
      })
      canvas.discardActiveObject()
      canvas.requestRenderAll()
      pushHistory()
    }

    // ─── 5. getCanvasState (read-only, log diagnostico) ───────────────────
    if (command.toolName === 'getCanvasState') {
      const snapshot = canvas.getObjects()
        .filter(o => !(o as any).isArtboard)
        .map(o => ({
          name: o.get('name'),
          type: o.type,
          parentBoard: (o as any).parentBoard,
          left: Math.round(o.left ?? 0),
          top: Math.round(o.top ?? 0),
        }))
      console.info('[getCanvasState]', snapshot)
    }
```

---

## Step 5 — P2: Timeout immagini

**File:** `src/components/studio/creative-studio.tsx`  
**Dove:** Riga 2069, prima di `if (deferredImages.length > 0)`

Aggiungere helper:
```typescript
      const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
        Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`img timeout ${ms}ms`)), ms))])
```

Poi a riga 2077, avvolgere `FabricImage.fromURL`:
```typescript
// PRIMA
return fabric.FabricImage.fromURL(loadUrl, { crossOrigin: 'anonymous' }).then(img => {

// DOPO
return withTimeout(fabric.FabricImage.fromURL(loadUrl, { crossOrigin: 'anonymous' }), 8000).then(img => {
```

Il `.catch` esistente gestisce già il timeout rejection come fallback placeholder — nessuna altra modifica necessaria.

---

## Step 6 — P2: Aggiornare system prompt in `defaults.ts`

**File:** `src/lib/ai/defaults.ts`  
**Dove:** Nella skill con slug `'progettista'`, nel campo `content`, aggiungere una sezione **prima** del backtick di chiusura della template string.

Aggiungere il blocco:

```markdown
---

### 📐 SCHEMA ELEMENTI — Proprietà complete per createDesignBoards

Ogni elemento in `elements` supporta queste proprietà. Usa SEMPRE `id` univoco.

**Comuni a tutti i tipi:** `id` · `type` (text|rect|circle|image|path|line) · `x` `y` `w` `h` · `column` (0–11) · `span` (1–12) · `alignX` (left|center|right) · `alignY` (top|center|bottom) · `marginRight` · `marginBottom` · `color` (hex o token) · `opacity` (0–1) · `zIndex` · `stroke` · `strokeWidth` · `borderRadius` (number o token radius-*) · `gradient` { type, angle, stops:[{offset,color}] }

**Solo `text`:** `text` · `fontFamily` · `fontSize` (number o fs-*) · `fontWeight` · `fontStyle` · `textAlign` · `letterSpacing` (em, es: 0.05) · `lineHeight` (es: 1.2) · `textTransform` (none|uppercase|lowercase)

**Solo `image`:** `url` (output di generateAIImage) · `filter` · `filterIntensity` · `effects` (string[]) · `effectProps`

**Solo `path`:** `shapeId` · `pathData` · `scaleX` `scaleY`

**Solo `line`:** `x1` `y1` `x2` `y2` (coordinate relative alla posizione x,y) · `stroke` obbligatorio · `strokeWidth`

**In `updateCanvasElements`:** usa `letterSpacing` (non charSpacing) nel campo `changes`.
```

---

## Ordine di esecuzione

| # | File | Riga | Azione |
|---|------|------|--------|
| 1 | `route.ts` | ~37 | Aggiungere `gradientStopSchema`, `canvasElementSchema`, `designBoardSchema`, `canvasUpdateSchema` |
| 2 | `route.ts` | ~293 | Sostituire `z.array(z.any())` di `createDesignBoards` con `z.array(designBoardSchema)` |
| 3 | `route.ts` | ~300 | Sostituire `z.array(z.any())` di `updateCanvasElements` con `z.array(canvasUpdateSchema)` |
| 4 | `creative-studio.tsx` | 2045 | Fix blocco `text` (aggiungere letterSpacing, lineHeight, textTransform, fontStyle) |
| 5 | `creative-studio.tsx` | 2060 | Aggiungere branch `line` dopo chiusura branch `path` |
| 6 | `creative-studio.tsx` | 2223 | Aggiungere branch `clearBoard`, `deleteElements`, `getCanvasState` |
| 7 | `creative-studio.tsx` | 2069 | Aggiungere helper `withTimeout` + avvolgere `FabricImage.fromURL` |
| 8 | `defaults.ts` | fine skill progettista | Aggiungere sezione "SCHEMA ELEMENTI" |

---

## Verifica

**P0 (Gemini crash):**
- Chiedere a Gemini "genera una tavola social per Bicicleria" → non deve crashare con `items: missing field`

**P1 (feature):**
- "Crea poster con titolo in maiuscolo spaziato" → verificare `textTransform=uppercase` e `letterSpacing` applicati al testo alla creazione (non solo in update)
- "Aggiungi una linea orizzontale sottile" → verificare che appaia un elemento `fabric.Line` (non più ignorato silenziosamente)
- "Svuota la tavola" → artboard rimane, tutti gli elementi interni vengono rimossi
- "Elimina l'elemento con id hero_title" → solo quell'elemento sparisce

**P2 (robustezza):**
- Passare un URL di immagine invalido → dopo 8s appare il placeholder "Immagine Non Disponibile" invece di bloccarsi

---

## Note importanti

- `letterSpacing` in tutto lo schema (coerente con `updateCanvasElements` riga 2189) → Fabric.js riceve `charSpacing = letterSpacing * 1000`
- Il branch `line` usa `fabric.Line([x1,y1,x2,y2])` con coordinate relative: `x1=0,y1=0,x2=el.w,y2=0` è una linea orizzontale lunga `w` px
- `clearBoard` non rimuove gli artboard (`isArtboard = true`), solo i layer contenuti — comportamento atteso
- `getCanvasState` per ora è solo diagnostico (log) perché il canvas è client-side; il vero feed-back all'AI richiederebbe iniettare lo snapshot nel prossimo messaggio utente (futura feature)
