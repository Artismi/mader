# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Cos'è questo progetto

Creative OS è un'app desktop Electron per freelance creativi. Non sostituisce i tool esistenti — li connette in un unico overlay. È composta da:
- **Portale Next.js** (app principale, gira su `localhost:3000`)
- **Electron wrapper** (due finestre: `mainWindow` + `overlayWindow` always-on-top)
- **Estensione Chrome** (`extension/`, Manifest V3)

---

## Comandi principali

```bash
# Dev locale (solo Next.js)
npm run dev

# Dev completo con Electron (usa questo per testare l'app)
npm run dev:electron

# Build per distribuzione
npm run build:electron

# Lint
npm run lint
```

`dev:electron` usa `concurrently` per avviare Next.js e poi Electron (via `wait-on`) in parallelo. Non usare `npm run dev electron` (argomento errato).

---

## Architettura

### Struttura delle finestre Electron (`electron/main.js`)

- `mainWindow` — finestra principale 1440×900, `frame: false`, carica `http://localhost:3000`
- `overlayWindow` — 380×600, `alwaysOnTop: true`, trasparente, accessibile via shortcut globale `Ctrl+Shift+Space`; carica `/overlay`
- Il path del database SQLite viene iniettato come `process.env.DATABASE_PATH` prima di avviare Next.js

### Database — SQLite locale (non Supabase)

Il progetto ha **migrato da Supabase a SQLite locale** tramite `node:sqlite` (Node.js built-in).

- Schema completo: `src/lib/db/schema.ts`
- Client singleton: `src/lib/db/client.ts`
- Repository (CRUD functions): `src/lib/db/index.ts`
- Tutte le operazioni DB sono **server-side only** (Server Components o Server Actions)
- Convenzioni schema: ID = TEXT (UUID), array → JSON stringificati, boolean → INTEGER 0/1

**Tabelle principali:**
`clients`, `tasks`, `subtasks`, `ideas`, `skills`, `social_posts`, `post_analytics`, `design_projects`, `inbox_items`, `memories`, `context_instructions`, `user_tokens`, `system_config`, `api_usage_stats`

### Routing Next.js (App Router)

```
src/app/
  layout.tsx                  # Root: RootShell wrapper
  (shell)/                    # Layout con padding standard + DeskDock
    layout.tsx
    page.tsx                  # Dashboard "Oggi"
    inbox/                    # Inbox
    clienti/                  # CRM clienti
    progettazione/            # Canvas Fabric.js (layout fisso, sfugge al padding shell)
    editoriale/               # Produzione contenuti
    lancio/                   # Editor lancio
    cervello/                 # Memoria AI
    finanze/                  # Fatture e preventivi
    studio/                   # Impostazioni skill
    idee/, incarichi/, domini/, pubblica/, assets/, settings/
  api/                        # API Routes Next.js
    ai/                       # Claude API endpoints (SSE streaming)
    auth/, clients/, tasks/   # CRUD REST
    analytics/, drive/, gmail/, calendar/, ...
  overlay/                    # Rotta dedicata alla finestra overlay Electron
  login/                      # Auth page
```

### Layout shell

`RootShell` (`src/components/layout/RootShell.tsx`) gestisce:
- `Header` fisso in cima
- `DeskDock` fisso in fondo (link navigazione principale)
- AI Assistant a 3 stati: 0=chiuso, 1=ContextGraphAssembler immersivo, 2=AIChatWidget side panel
- La rotta `/overlay` bypassa tutto il layout shell

### API Bridge AI

Pattern fisso: `src/app/api/ai/[action]/route.ts`
- Il frontend chiama queste route → le route chiamano Anthropic SDK
- Usare **SSE streaming** per tutte le risposte AI (evita timeout Vercel/Electron)
- Le chiavi MCP e Anthropic non vanno mai esposte lato client
- Directory: `src/app/api/ai/` contiene `route.ts` (chat), `context/`, `memories/`, `planner/`, `architecture/`

### Server Actions

`src/app/actions.ts` — tutte le mutazioni dati (addTask, addClient, upsertDesignProject, ecc.) come Server Actions Next.js. Le pagine le importano direttamente.

### Sezione Progettazione (`/progettazione`)

La sezione canvas è composta da:
- `src/app/(shell)/progettazione/page.tsx` — Server Component, carica dati da SQLite, monta `DesignWindow`
- `src/components/ui/design-window.tsx` — wrapper con sidebar asset clienti e gestione salvataggio progetti
- `src/components/studio/creative-studio.tsx` — componente principale (>2500 righe), tutto il canvas Fabric.js

**Architettura interna di `creative-studio.tsx`:**
- Canvas Fabric.js gestito via `fabricRef` + `canvasRef`
- Tool attivo: state `tool` (tipo `Tool`), cambia con `changeTool()`
- Selezione oggetto corrente: state `sel` (tipo `SelState`) con tutte le properties dell'oggetto selezionato
- History undo/redo: stack manuale via `pushHistory()`
- **Tool Sidebar** (sinistra): 5 slot con `ToolGroup` (hover-expandable) + `TB` per tool singoli
  - Selezione group: `select` + `lasso`
  - Forme group: `rect` + `circle` + `line`
  - Disegno group: `pen` + `pencil` + `eraser` + `scissors`
  - Standalone: `text`, `image`
- **Top Bar** (contestuale): `TextBar`, `ShapeBar`, `LineBar`, `ImageBar`, `PencilBar` — appaiono in base al tipo di oggetto selezionato
- **Bottom Bar**: undo/redo, zoom, grid, snap, rulers, editorial grid, organic mode, save, export
- `DropdownPortal` — tutti i dropdown vengono portati nel body per evitare clipping dentro container overflow-hidden
- Bezier editor: `bezier-utils.ts` + `BzEditorOverlay` component
- Librerie: `libraries/brush-library.ts`, `font-library.ts`, `shape-library.ts`, `texture-library.ts`

### `ToolGroup` (hover-expandable)

Componente custom in `creative-studio.tsx` che implementa il pattern: icona singola → hover → flyout a destra con le opzioni → si richiude dopo 180ms dall'uscita del cursore. La stessa logica è usata nel `TextBar` per i preset paragrafo (¶).

### Connettori esterni

Integrati tramite MCP in produzione, ma le chiamate avvengono via API route server-side:
- **Google Drive/Gmail/Calendar**: `src/lib/google/` + OAuth token in `user_tokens` SQLite
- **Notion**: `src/lib/notion/`
- **Canva, Figma/FigJam, n8n, Vercel**: via MCP tool calls nelle API route AI

### Estensione Chrome (`extension/`)

- Manifest V3, built in React
- Auth bridge: GET `src/app/api/auth/extension-token/route.ts` — restituisce signed token, l'estensione lo persiste in `chrome.storage.local`
- Tutte le chiamate dal content script al portale validano l'`Authorization` header

---

## Regole invarianti

1. Nessuna chiave API o token esposta lato client
2. Tutte le mutazioni dati passano per Server Actions o API Route server-side
3. Tutte le nuove tabelle SQLite seguono le convenzioni: ID TEXT, array come JSON, boolean come INTEGER
4. Il canvas state di Fabric.js viene salvato come JSON nella colonna `canvas_state` di `clients` o `design_projects`
5. FigJam non viene embeddato via iframe in tempo reale — le modifiche visual arrivano via MCP su richiesta esplicita "Importa"

---

## Riferimenti tecnici rapidi

- Schema DB completo → `src/lib/db/schema.ts`
- Tutte le Server Actions → `src/app/actions.ts`
- Canvas principale → `src/components/studio/creative-studio.tsx`
- Electron entry → `electron/main.js`
- Struttura Drive per cliente → `/_CLIENTI/[Nome]/{_vault.md, progetti/, asset/, documenti/}`
