# Piano di ricostruzione — Creative OS

> Obiettivo: un'app **bella, leggibile e completamente funzionante**.
> Strategia: **rifare l'interfaccia mantenendo la logica che c'è già**. Non riscriviamo tutto da zero.
> Ci sono circa 30k righe di componenti e 23 gruppi di API già scritti: la logica (DB, Gmail, RAG, canvas) va recuperata, il problema è soprattutto la superficie.

---

## Fotografia di partenza (ottobre 2026)

| Area | Stato |
|---|---|
| Stack | Electron 32 + Next 16 + SQLite (`node:sqlite`) + Python crew (opzionale) |
| Errori TypeScript | **114** (35 in `creative-studio.tsx`, il resto nel laboratorio shader, nella chat AI e nei filtri) |
| Sezioni | ~20 rotte, con doppioni (`cervello`/`memoria`, `studio`/`progettazione`, `idee`/`memoria`) |
| Design | Token minimi in `globals.css` (viola `#7C3AED` su `#0F0F1A`), effetto glass, **4 librerie di icone diverse** (lucide, tabler, hugeicons, remixicon), Inter caricato da Google Fonts nonostante il vincolo offline |
| Dipendenze esterne | Supabase usato solo per il login Google, Gemini, Anthropic, OpenAI, Notion, Meta, n8n |
| Igiene repo | Database `.db-wal` committato, file `tsc_*.txt` e `lint-output*.txt` sparsi |

---

## Principi guida — ergonomia cognitiva
> **Togliere superficie, non funzioni.** Ogni feature resta, ma si vede solo quando serve.

1. **Un'azione principale per schermata.** Una sola cosa evidente; le secondarie si attenuano, le rare stanno nel menu `⋯` o in `Ctrl+K`.
2. **Mostrare per gradi.** Prima l'essenziale, poi i dettagli su richiesta: pannello che si espande, sezione "Avanzate", passaggio del mouse.
3. **Strumenti legati al contesto.** Una barra appare solo quando c'è un oggetto selezionato o un compito in corso; mai tutte insieme.
4. **Riconoscere invece di ricordare.** Etichette leggibili accanto alle icone, scorciatoie mostrate nei tooltip, stessi pattern in ogni sezione.
5. **Massimo circa 7 elementi per gruppo** visibile: navigazione, toolbar, menu.
6. **`Ctrl+K` come porta universale.** Ogni funzione, anche nascosta, si trova scrivendo il suo nome.
7. **Stato sempre leggibile.** Dove sono, cosa sta succedendo (AI, salvataggio, sync), cosa posso annullare.
8. **Inclusività.** Contrasto WCAG AA, tutto usabile da tastiera, focus visibile, nessuna informazione affidata solo al colore, `prefers-reduced-motion` rispettato, testo minimo 14px, font molto leggibile per i testi lunghi.
9. **Stile ribelle nei punti giusti.** Il carattere sta in titoli, marchio, transizioni e stati vuoti. Le aree di lavoro (liste, form, canvas) restano calme e pulite: è il contrasto tra le due cose a creare personalità.

### Esempio: il canvas di Progettazione
Oggi ha sidebar, 5 barre contestuali, bottom bar da 10 controlli, laboratorio, effetti, crew AI, tutti visibili insieme.
Diventa **3 modalità** (`1` Disegna · `2` Componi · `3` Effetti/Lab). Ogni modalità mostra solo i suoi strumenti, con un unico pannello proprietà a destra che cambia in base alla selezione. Restano le regole già decise: pan con il tasto centrale del mouse e linea agganciata alle forme.
Il resto (griglie, righelli, snap, export) va in un solo menu Vista e in `Ctrl+K`.

---

## Fase 0 — Stabilizzazione (prima di toccare la grafica)
**Scopo:** sapere cosa funziona davvero.

1. Avviare `npm run dev:electron` e annotare per ogni rotta uno stato tra ✅ funziona / ⚠️ parziale / ❌ rotta.
2. Correggere i 114 errori TypeScript, partendo dai file fuori dal canvas.
3. Togliere da git `data/*.db*`, i file di output dei log e `__MACOSX`.
4. Fare un controllo di `.env.local`: per ogni chiave decidere se è **necessaria**, **opzionale** o **da eliminare** (Notion? n8n? LangSmith/Phoenix?).
5. Aggiungere una pagina `/settings/stato` che mostri in verde o rosso DB, chiavi AI, token Google e servizio crew.

**Fatto quando:** `npx tsc --noEmit` restituisce 0 errori e c'è una tabella di stato per ogni sezione.

### Stato al 2026-10-09
**Corretti (bug che si vedevano a runtime):**
- Lancio, Progettazione e Memoria andavano in crash lato server (`react-force-graph-2d` usa `window`). Ora `BrainGraph` si carica con `next/dynamic` `ssr:false`.
- La pagina Clienti andava in crash perché `VaultEditor` riceveva props inesistenti. Ora apre `clienti/<slug>-handbook.md`.
- Le pipeline crew AI avevano le variabili `agent`/`emoji` non definite (ReferenceError su ogni step).
- I modelli Claude ritirati (`claude-3-5-sonnet-*`) sono stati sostituiti con `claude-sonnet-5-5` in chat e planner.
- AI SDK v6: `maxSteps` → `stopWhen`; chat aggiornata (`messages`, `regenerate`, `sendMessage({text})`, testo letto dai `parts`).
- Fabric v7: riordino dei layer (`bringObjectForward` ecc.).
- Editoriale: mancava l'import di `Film`.
- Rimossi da git i file `*.db-wal`/`*.db-shm` (restano su disco).

**Errori TS: 114 → ~45.** Quelli rimasti sono quasi tutti nel canvas (35 in `creative-studio.tsx`) e vengono rimandati alla Fase 5, perché quel file va diviso.

**Rotte:** tutte e 17 rispondono 200 lato server. `/calendario` non è mai esistita (il calendario sta nella dashboard), quindi ora reindirizza a `/`.

**Da fare in Fase 0:**
- [x] Controllo lato client: nessuna eccezione JS in 17 sezioni. Restano solo dei 404 sugli handbook dei clienti non ancora creati, che sono attesi
- [x] Avvio con Electron: finestra OK e servizio crew Python attivo (`/health` 200). Il binario di Electron mancava ed è stato reinstallato con `node node_modules/electron/install.js`
- [ ] Token Google scaduto: va rifatto il login (azione dell'utente)
- [ ] Chiamata AI reale per verificare il nuovo modello
- [ ] Controllo di `.env.local` (necessarie / opzionali / da eliminare)

**Debiti tecnici consapevoli:**
- `src/types/three-webgpu.d.ts` tipizza three/webgpu e three/tsl come `any`. Toglie il rumore, ma nasconde anche errori veri nel laboratorio. In Fase 5 va sostituito con `@types/three`.
- Lo slug dell'handbook cliente (`nome → kebab-handbook.md`) è duplicato tra `clienti/page.tsx` e `api/design/handbook`. Va estratto in un helper quando si costruisce il nodo cliente.

---

## Fase 1 — Design system
**Scopo:** una sola lingua visiva per tutta l'app.

### Direzione visiva, dal sito artismi
| Elemento sul sito | Nell'app |
|---|---|
| Logo graffiti 3D cromato che ruota | Logo in alto, ruota lentamente (stessa resa cromata/argento) |
| Rosa cipria `≈#F0D6E2` / `≈#E8B4C8` | Superficie del tema chiaro / colore d'accento |
| Prugna scura `≈#3D2B40` | Superficie del tema scuro, testo forte sul chiaro |
| Crema `≈#F5EFE6` | Testo sul tema scuro |
| Bottone ocra `≈#C8860A` con bordo nero doppio | **Azione principale** (una per schermata): riconoscibile al primo sguardo |
| Etichetta verde con bordo "● disponibile" | Badge di stato (sync, AI, online) |
| Titoli grotesk maiuscoli larghi, nav spaziata | Titoli dei moduli e nodi dell'albero; il testo corrente resta in minuscolo e leggibile |
| Riflessi di luce liquida (caustiche) | Sfondo vivo solo nello stato "Oggi" e negli stati vuoti; mai dietro liste e form |
| ✦ stella | Marcatore per "fissato/preferito" e tracce dell'AI |
| Interruttore "SILENZIO" | Interruttore globale "silenzio" che spegne animazioni, shader e suoni (si collega a reduced-motion) |

**Formula:** luce morbida pastello + tipografia gridata + bordi neri netti. Ribelle nei dettagli, calmo nelle aree di lavoro.

### Token (`src/styles/tokens.css`)
- **Colore:** neutri a 9 gradini, un solo accento, i colori di stato (successo, avviso, errore, info) e i colori per categoria (cliente, canale). Sia tema scuro sia tema chiaro.
- **Tipografia:** scala a 6 livelli (12 / 13 / 15 / 18 / 24 / 32) e due font **locali** (Syne o Space Mono sono già installati, più un sans leggibile installato con `@fontsource`). Va tolto l'`@import` di Google Fonts.
- **Spaziatura:** griglia a 4px. **Raggi:** 3 valori. **Ombre:** 3 livelli. **Movimento:** 2 durate, 1 curva di easing.
- **Leggibilità:** contrasto AA minimo, testo base a 14–15px e niente testo grigio su glass.

### Componenti base (`src/components/ds/`)
Button, IconButton, Input, Textarea, Select, Checkbox/Toggle, Badge, Avatar, Card, Panel, Tabs, Table, Modal, Drawer, Popover/Menu, Toast, Tooltip, EmptyState, Skeleton, Kbd.

- **Una sola libreria di icone** (lucide). Le altre tre vanno disinstallate.
- **Pagina vetrina `/design`** con tutti i componenti, per controllarli a colpo d'occhio.

**Fatto quando:** la pagina `/design` è completa e non restano colori o pixel scritti a mano nei componenti nuovi.

---

## Fase 2 — Una sola schermata modulare, tracciata ad albero
**Scopo:** non più tante schermate separate. Un unico spazio di lavoro in cui compare quello che serve, e ogni passaggio resta tracciato come un ramo.

> 📐 **Specifica completa in [STRUTTURA_WORKSPACE.md](STRUTTURA_WORKSPACE.md)** (concetti, regole, anatomia del modulo, mappatura delle sezioni, dati). Quello che segue è il riassunto.

### Il modello
- **Ogni cosa è un nodo:** cliente, progetto, task, messaggio, file, idea, preventivo, design, evento.
- **Ogni nodo si apre come modulo** nello spazio di lavoro (non come pagina). Le vecchie sezioni diventano *tipi di modulo*.
- **Aprire da un modulo genera un ramo.** Dal cliente apro un messaggio, da lì la risposta, poi un task, poi il design, poi il preventivo. Il percorso è un albero visibile e navigabile.
- **Il lavoro resta tracciato.** Ogni azione si aggancia al nodo da cui nasce, così la provenienza si ricostruisce sempre ("questo preventivo nasce da quella mail").

### Layout
```
┌───────────────────────────────────────────────────────┐
│ ◉artismi (ruota)      [ Ctrl+K: cerca / fai… ]    ●AI │
├──────────┬──────────────────────────────┬─────────────┤
│ ALBERO   │  MODULO IN FOCUS             │ MODULI      │
│ (ramo    │  (uno solo, grande)          │ CONTESTO    │
│ attivo,  │                              │ (max 2–3,   │
│ comprim.)│                              │ correlati)  │
└──────────┴──────────────────────────────┴─────────────┘
```
- **Albero (sinistra):** il ramo di lavoro corrente. Cliccando un nodo torni lì; si possono chiudere o fissare i rami.
- **Focus (centro):** un solo modulo grande. Il canvas a schermo intero è solo un modulo in focus con i pannelli laterali chiusi.
- **Contesto (destra):** compaiono da soli i moduli correlati al focus (cliente → ultimi messaggi, task aperti, scadenze). Si possono fissare o scartare.
- **Partenza "Oggi":** il tronco dell'albero. Mostra cosa richiede attenzione e ogni elemento è l'inizio di un ramo.
- **L'AI è un modulo** che legge il ramo attivo come contesto, senza bisogno di copiare e incollare.

### Tecnica
- Si passa da rotte Next separate a un **workspace store** (zustand, già installato). L'URL codifica l'albero aperto, così ricaricando o riaprendo l'app torni dov'eri.
- Due nuove tabelle: `links(from_type, from_id, to_type, to_id, rel, created_at)` per le relazioni tracciate e `trails` per i rami di lavoro salvati.
- Il grafo nexus della Memoria diventa la **vista d'insieme** dell'intero albero.

### Ex sezioni → tipi di modulo
Le circa 20 voci di menu spariscono come navigazione e restano come **6 famiglie di moduli**:

| Area | Contiene |
|---|---|
| **Oggi** | Dashboard: agenda, task urgenti, messaggi non letti, scadenze |
| **Comunicazione** | Inbox · Lancio · Calendario |
| **Lavoro** | Clienti · Incarichi · Editoriale/Pubblica |
| **Studio** | Progettazione (canvas + laboratorio) · Assets |
| **Memoria** | Vault, grafo, idee (riunisce cervello + memoria + idee) |
| **Amministrazione** | Finanze · Domini · Impostazioni |

- Header, DeskDock e Sidebar spariscono: al loro posto ci sono l'albero e `Ctrl+K`.
- **`Ctrl+K`** apre qualsiasi nodo o modulo, o esegue un'azione, e lo innesta nel ramo attivo.
- Barra titolo Electron personalizzata e coerente (la finestra è `frame: false`).
- L'overlay (`Ctrl+Shift+Space`) va rifatto con gli stessi componenti.

---

## Fase 3 — Rifacimento sezione per sezione
Ordine consigliato, dal valore quotidiano più alto:
**Oggi → Inbox → Clienti → Incarichi → Calendario → Lancio → Memoria → Editoriale → Finanze → Domini → Impostazioni**

Ogni sezione ha la stessa **definizione di fatto**:
- [ ] Usa solo i componenti di `ds/`
- [ ] Mostra dati reali da SQLite o API, niente mock
- [ ] Gestisce gli stati vuoto, caricamento ed errore
- [ ] Ogni azione (crea, modifica, elimina) funziona e lascia traccia
- [ ] Si usa da tastiera per le azioni principali
- [ ] Ha un controllo veloce finale (aprire, creare, modificare, ricaricare)

---

## Fase 4 — Completare le funzioni mancanti
1. **Login Google senza Supabase:** OAuth nativo in Electron con loopback su localhost e token salvati in SQLite. Supabase sparisce del tutto.
2. **Finanze:** preventivo → PDF (con `pdf-lib`, già installato) → Drive → invio con Gmail.
3. **Domini:** avvisi a 30 e a 7 giorni come notifiche native di Electron.
4. **Sync e backup su Google Drive** del DB e del vault.
5. *(Opzionale, dopo)* pubblicazione social, WhatsApp, Instagram.

---

## Fase 5 — Studio: canvas e laboratorio
È la parte più grande e fragile (17k righe, `creative-studio.tsx` oltre 2500 righe).
1. Dividere `creative-studio.tsx` in moduli: tools, bars, history, io e AI-bridge.
2. Correggere gli errori di tipo nei nodi WebGPU e nei filtri.
3. Rifare le barre strumenti con il design system, mantenendo le regole già decise: pan con il tasto centrale del mouse, 8 tool nella sidebar, flyout al passaggio del mouse.
4. Il servizio Python crew diventa **opzionale**: se manca, l'app funziona lo stesso e lo segnala nella pagina di stato.

---

## Fase 6 — Pacchetto finale
- `npm run build:electron` produce un installer Windows funzionante.
- Il DB va nella cartella `userData` invece che dentro il progetto.
- Prima esecuzione guidata: scelta del percorso del vault, inserimento delle chiavi AI e login Google.

---

## Decisioni da prendere insieme prima della Fase 1
1. **Tema:** solo scuro, solo chiaro o entrambi?
2. **Identità visiva:** ✅ **brand artismi**, con il logo che ruota in alto nella shell (titlebar o sidebar). Rotazione lenta e continua, che accelera durante il lavoro dell'AI e si ferma con `prefers-reduced-motion`. *Manca il file del logo (SVG preferito).*
3. **Priorità:** quali 3 sezioni usi davvero ogni giorno?
4. **Integrazioni da tagliare:** Notion, n8n, LangSmith/Phoenix, Meta servono ancora?
