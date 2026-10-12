## Fase 0 — Stabilizzazione di Creative OS

Primo passo del piano di ricostruzione (`PIANO_RICOSTRUZIONE.md`). Rende di nuovo utilizzabili le sezioni che andavano in crash, senza toccare la grafica.

### Bug corretti
- **Crash SSR su Lancio, Progettazione e Memoria.** `react-force-graph-2d` usa `window` al caricamento. Ora `BrainGraph` si carica con `next/dynamic` e `ssr: false`.
- **Crash della pagina Clienti.** `VaultEditor` riceveva props che non esistono. Ora apre `clienti/<slug>-handbook.md` e, se il file manca (404), parte vuoto e lo crea al salvataggio.
- **Pipeline crew AI.** `agent`/`emoji` erano usati senza essere definiti, con un ReferenceError a ogni step.
- **Modelli Claude ritirati.** `claude-3-5-sonnet-*` → `claude-sonnet-5-5` in chat e planner.
- **AI SDK v6.** `maxSteps` → `stopWhen: stepCountIs(10)`. La chat usa `messages`, `regenerate`, `sendMessage({ text })` e legge il testo dai `parts`.
- **Fabric v7.** Riordino dei layer con `bringObjectForward` / `sendObjectBackwards` / `bringObjectToFront` / `sendObjectToBack`.
- **Editoriale.** Mancava l'import di `Film`.

### Pulizia
- I file `*.db-wal` / `*.db-shm` di SQLite escono da git (restano su disco) e vanno in `.gitignore`.
- La cache di graphify passa da `src/graphify-out` a `graphify-out/src-cache`.
- Rimossi gli output `tsc_output.txt`.

### Docs
- `PIANO_RICOSTRUZIONE.md`: le fasi, i principi di ergonomia cognitiva, la direzione visiva artismi e lo stato della Fase 0.
- `STRUTTURA_WORKSPACE.md`: la specifica dello spazio di lavoro modulare ad albero (nodi, moduli, rami, tracce).

### Note per la review
- Il branch include anche **`eba3554 18/09 form`**, un commit esistente e mai pushato con il lavoro sul laboratorio shader.
- `src/types/three-webgpu.d.ts` tipizza `three/webgpu` e `three/tsl` come `any`. È un debito voluto, da sostituire con `@types/three` in Fase 5.
- Errori TypeScript da 114 a circa 45; i restanti sono quasi tutti in `creative-studio.tsx` (Fase 5).
- **Verificato:** tutte e 17 le rotte rispondono 200 lato server e non ci sono eccezioni JS in console su home, inbox, clienti, incarichi, idee, editoriale, lancio e memoria.
- **Non verificato:** avvio Electron e una chiamata AI reale con il nuovo modello.
- **Ancora aperti:** `/calendario` restituisce 404 lato client e il token Google è scaduto (serve un nuovo login).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
