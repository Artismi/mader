# Riprendere il lavoro

Guida per chi riparte da zero: una chat nuova, un altro profilo, un'altra persona. Si legge in 5 minuti e permette di ricominciare senza rileggere conversazioni lunghe. Aggiornata al 17 ottobre 2026.

## In una riga

Stiamo trasformando Creative OS (app desktop Next.js + Electron per freelance creativi) in una **mente progettuale integrata**. Due parti:
- un **assistente** (il guscio agente) che usa tutto il sistema (incarichi, clienti, piano editoriale, Studio) con qualunque modello, anche economico;
- un **motore designer** che genera grafiche e presentazioni da designer esperto, non da bot, con testo sempre vivo e modificabile.

## Dove sta il codice

- **Repository**: `creative-os` (remoto `origin` = github.com/Artismi/mader.git). In locale sta in `C:\Users\Acer\Downloads\Mader\creative-os`.
- **Ramo principale di lavoro: `claude/designer-unito`.** Contiene tutto: guscio agente, nucleo, motore designer, confronto Q0, decompilatore D1, caratteri, risorse dello Studio. Nella copia locale sta nel worktree `creative-os/.claude/worktrees/designer-unito`.
- **Attenzione: nessun ramo è stato ancora mandato con push.** Per riprendere da un altro computer o profilo bisogna prima fare il push di `claude/designer-unito` dalla macchina originale, e serve il permesso dell'utente.
- Gli altri rami `claude/*` (brave-bohr, confronto-q0, decompila-d1, specializza-tavola, varieta-designer, asset-caratteri, risorse-studio) sono **già riuniti** in `designer-unito`: servono solo come storia.
- Il checkout principale (`creative-os`) è sul vecchio ramo `claude/ecstatic-mendel-t4tibq`: per provare il lavoro nuovo non va usato.

## Avvio su una macchina nuova

```bash
git fetch origin && git switch claude/designer-unito
npm install
cd scripts/designer && npm install && cd ../..   # dipendenze della vetrina (esbuild, playwright-core)
npm run asset:caratteri                          # scarica i ~300 caratteri liberi in public/asset-cache (fuori da git)
npm run designer:foto && npm run designer:texture  # foto e texture di prova (fuori da git)
npm run dev:electron                             # l'app (attenzione: dev:electron, con i due punti)
```

**Controlli rapidi, tutti locali e gratuiti:**
- `npm run test:agente`: 112 test del guscio agente;
- `npm run designer:test` e `npm run confronto:test`;
- `npm run designer:vetrina -- --contenuti caffe,mostra,t_menu,palestra --formati quadrato --occhio --a-secco`: il campione standard. I fogli vanno in `scripts/designer/out/`.

Altre opzioni della vetrina: `--schede` (difetti per archetipo), `--sforzo` (testi estremi), `--sequenza` (presentazioni), `--ibridi`, `--campi`, `--senza-idee`. I formati validi sono `quadrato`, `verticale`, `storia` e `orizzontale`.

## Da leggere, in quest'ordine

1. **`docs/STATO-LAVORI.md`**: cosa è fatto, con i commit e i numeri, e cosa è in coda. È il registro vivo: ogni sessione aggiunge una riga alla fine del suo lavoro.
2. **`docs/competitor-e-gradini.md`**: come lavorano Canva, Adobe, CreatiPoster, COLE, LaDeCo e PosterO, e i gradini G1–G6 che ci mancano. È la direzione attuale.
3. Approfondimenti, solo per la parte su cui si lavora:
   - **Motore designer**:
     - `motore-designer-progetto.md` (principi, misure, grammatica);
     - `varieta-e-affinamento.md` (perfezionamento P1–P5, varietà V1–V7);
     - `librerie-di-asset.md` (catalogo, caratteri, icone, texture);
     - `occhio-del-designer.md` (decompilatore, maestri, concettista);
     - `salto-di-qualita.md` (confronto Q0–Q6).
   - **Assistente e nucleo**:
     - `guscio-agente.md` (G1–G8);
     - `sistema-centrale.md` (nucleo K0–K8);
     - `cosa-manca.md` (modelli deboli A1–A7, funzioni dei concorrenti B1–B9).

## Dove siamo (sintesi)

**Assistente.** È fatto fino a K3 e ad A1–A3:
- prompt stabile in cache;
- chiamate riparate invece di cambiare modello;
- regia per passo;
- chiusura del compito solo con le prove;
- profili forte, medio e base per i modelli;
- azioni uniche, eventi e grafo del nucleo.

Il banco di prova vero aspetta credito sulle API.

**Motore designer.** Circa 50 archetipi, ai quali si sono aggiunti:
- critico severo e controllo degli spazi;
- corpo minimo dei testi per il telefono;
- scheda dei difetti;
- carattere autoriale (idee, gesto dominante, regolatori agli estremi) e intrecci;
- 338 caratteri con abbinamenti a regole;
- effetti, generatori, 3D e palette generative;
- più foto e texture.

Le misure, prima e dopo, sono in `STATO-LAVORI.md`.

**Giudizio dell'utente.** Le tavole sono migliorate, ma **gli archetipi si riconoscono ancora** e manca il carattere d'autore. Restano anche sovrapposizioni, leggibilità e vuoti da sistemare.

## In corso e prossimi passi

1. **Blocco A, robustezza** (in corso): testi estremi, presentazioni da 8–15 slide, leggibilità misurata sui pixel veri, vuoti e sovrapposizioni.
2. **G1 + G2** (subito dopo, già assegnati): un archivio di design veri con licenza libera, decompilati con D1, e un generatore che parte da esempi simili al brief e fa scrivere la scena a un modello economico, alla maniera di PosterO e CreatiPoster. È il salto principale.
3. Poi G3–G6, quindi il blocco B: archetipi sciolti in mattoni e diversità garantita. **La memoria anti-ripetizione tra sessioni è stata scartata dall'utente.**
4. **Bloccati dal credito API** (OpenRouter o Google):
   - le idee vere del concetto (`npm run designer:idee`);
   - il banco dell'assistente su più modelli;
   - i concorrenti e la giuria di Q0.

## Regole di lavoro (chieste dall'utente)

- **Risparmio**: crediti a consumo. Una sessione alla volta, oppure due in worktree separati che non toccano gli stessi file. Letture a pezzi, output brevi, vetrine in background, niente ricerche web inutili. Fermarsi al 60% del contesto o al limite di spesa, senza ritentare.
- **Un commit per punto**, con una riga in `STATO-LAVORI.md` a fine lavoro. **Niente push senza chiedere.**
- **Misurare sempre** prima e dopo, con la vetrina in locale, e **mostrare le tavole** all'utente, non solo i numeri.
- **Qualità prima del risparmio**: è la "giusta via di mezzo". Nelle tavole entrano solo asset con licenza commerciale e senza share-alike.
- **Lingua**: l'utente scrive in italiano. Risposte chiare e dirette, giudizio onesto sulle tavole.

## Come assegnare un compito a una nuova sessione

Nel messaggio di partenza:
- la cartella: il worktree di `claude/designer-unito`, oppure un worktree nuovo creato da quel ramo, con i collegamenti a `node_modules`, `scripts/designer/node_modules`, `public/asset-cache` e `scripts/designer/fixtures/foto`;
- i documenti da leggere: `STATO-LAVORI.md` più quello della fase;
- i punti da fare e la misura prima e dopo;
- le regole di risparmio qui sopra.

La sessione risponde alla fine con i commit, i numeri e il percorso dei fogli.
