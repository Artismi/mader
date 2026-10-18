# Riprendere il lavoro

Guida per chi riparte da zero: una chat nuova, un altro account Claude, un altro profilo o un'altra persona. Si legge in 5 minuti e permette di ricominciare senza rileggere conversazioni lunghe. Aggiornata al 18 ottobre 2026.

## Cambio di account: cosa fare per primo

Il lavoro non sta nell'account Claude: sta nei file sul computer e su GitHub. Cambiare account non perde nulla di ciò che è in un commit. Si perdono solo le conversazioni, e questo documento serve a sostituirle.

1. **Stesso computer, nuovo account.** Apri in Claude Code la cartella `C:\Users\Acer\Downloads\Mader\creative-os\.claude\worktrees\designer-unito` (è il ramo `claude/designer-unito`, già pronto, con dati e chiavi collegati). Come primo messaggio scrivi: *"Leggi docs/RIPRENDERE.md e docs/STATO-LAVORI.md, poi dimmi a che punto siamo."*
2. **Altro computer.** Prima, dal computer originale, va fatto il push di `claude/designer-unito` (al 18 ottobre è **22 commit avanti** rispetto a `origin`). Poi si segue "Avvio su una macchina nuova".
3. **Le chiavi API non sono in git** (`.env.local` è escluso). Sul computer originale restano dove sono. Altrove vanno ricreate partendo da `creative-os/.env.example` (nel checkout principale; nel ramo `designer-unito` non è ancora tracciato). Le chiavi non vanno mai incollate in chat, nei commit o nei documenti.
4. **Le sessioni aperte nell'app Claude** (guscio, Q0, D1, editor-tela, chat-dal-vivo, fase 0, estetica e le altre) sono tutte ferme e unite nel ramo. Non serve riaprirle: si parte con sessioni nuove.

## In una riga

Stiamo trasformando Creative OS (app desktop Next.js + Electron per freelance creativi) in una **mente progettuale integrata**, da portare sul mercato. Due parti:
- un **assistente** (il guscio agente) che usa tutto il sistema (incarichi, clienti, piano editoriale, Studio) con qualunque modello, anche gratuito;
- un **motore designer** che genera grafiche e presentazioni da designer esperto, non da bot, con testo sempre vivo e modificabile.

## Dove sta il codice

- **Repository**: `creative-os` (remoto `origin` = github.com/Artismi/mader.git). In locale sta in `C:\Users\Acer\Downloads\Mader\creative-os`.
- **Ramo principale di lavoro: `claude/designer-unito`**, nel worktree `creative-os/.claude/worktrees/designer-unito`. Contiene tutto il lavoro:
  - guscio agente e nucleo;
  - motore designer, confronto Q0, decompilatore D1;
  - caratteri, risorse dello Studio, vie gratuite;
  - archivio G1 e generatore G2;
  - chat dal vivo, editor della tela;
  - sistema di design "Carta" e pacchetto (fase 0).
- **Tutti gli altri rami `claude/*` sono già riuniti** e servono solo come storia: brave-bohr, confronto-q0, decompila-d1, specializza-tavola, varieta-designer, asset-caratteri, risorse-studio, vie-gratuite, chat-dal-vivo, editor-tela, impacchettabile.
- Fuori restano solo due rami vecchi: `infallible-darwin` (filtri texture di aprile, mai valutati) e `vibrant-bell` (contiene solo il package-lock).
- **`main` è indietro di circa 300 commit.** Prima di una release va consolidato tutto su `main`, con il permesso dell'utente. Il checkout principale (`creative-os`) è sul vecchio ramo `claude/ecstatic-mendel-t4tibq`: non va usato per provare il lavoro nuovo.

### Collegamenti locali del worktree (solo sul computer originale, mai in un commit)

- `data` → giunzione verso `creative-os/data`, il database vero. Il vecchio database di prova è in `data-prova/`, escluso con `.git/info/exclude`. Su `data/.gitignore` è impostato skip-worktree.
- `.env.local` → hardlink al file del checkout principale.
- Giunzioni per:
  - `node_modules` e `scripts/designer/node_modules`;
  - `public/asset-cache` (dal worktree asset-caratteri);
  - `scripts/designer/fixtures/foto` (dal worktree risorse-studio).

Un worktree nuovo creato da `designer-unito` ha bisogno degli stessi collegamenti.

## Avvio su una macchina nuova

```bash
git fetch origin && git switch claude/designer-unito
npm install
cd scripts/designer && npm install && cd ../..   # dipendenze della vetrina (esbuild, playwright-core)
npm run asset:caratteri                          # scarica i ~300 caratteri liberi in public/asset-cache (fuori da git)
npm run designer:foto && npm run designer:texture  # foto e texture di prova (fuori da git)
npm run dev:electron                             # l'app in sviluppo (attenzione: dev:electron, con i due punti)
npm run build:electron                           # installer Windows in dist/ (con verifica del contenuto)
```

**Controlli rapidi, tutti locali e gratuiti:**
- `npx tsc --noEmit`: deve dare zero errori;
- `npm run test:agente` (136 test), `npm run designer:test` (33), `npm run confronto:test` (8);
- `npm run tela:server` + `npm run test:tela`: 53 prove dell'editor della tela, con Chrome vero;
- `npm run designer:vetrina -- --contenuti caffe,mostra,t_menu,palestra --formati quadrato --occhio --a-secco`: il campione standard. I fogli vanno in `scripts/designer/out/`.

Altre opzioni della vetrina: `--schede` (difetti per archetipo), `--sforzo` (testi estremi), `--sequenza` (presentazioni), `--ibridi`, `--campi`, `--senza-idee`. I formati validi sono `quadrato`, `verticale`, `storia` e `orizzontale`.

## Da leggere, in quest'ordine

1. **`docs/STATO-LAVORI.md`**: cosa è fatto, con i commit e i numeri, e cosa è in coda. È il registro vivo: ogni sessione aggiunge una riga alla fine del suo lavoro.
2. **`docs/lancio-sul-mercato.md`**: cosa manca per vendere l'app (build, sicurezza, legale, distribuzione, perimetro) e le decisioni che spettano all'utente. È la direzione attuale.
3. **`docs/competitor-e-gradini.md`**: come lavorano Canva, Adobe, CreatiPoster, COLE, LaDeCo e PosterO, e i gradini G1–G6 del motore.
4. **`docs/ux/sistema-carta.md`**: il linguaggio visivo unico dell'app (token, componenti `cos-*`).
5. Approfondimenti, solo per la parte su cui si lavora:
   - **Motore designer**:
     - `motore-designer-progetto.md`;
     - `varieta-e-affinamento.md` (P1–P5, V1–V7);
     - `librerie-di-asset.md` (licenze comprese);
     - `occhio-del-designer.md`;
     - `salto-di-qualita.md`.
   - **Assistente e nucleo**:
     - `guscio-agente.md`;
     - `sistema-centrale.md` (K0–K8);
     - `cosa-manca.md` (A1–A7, B1–B9).
   - **Editor della tela**: `editor-tela-difetti.md`.

## Dove siamo (sintesi)

**Assistente.**
- Fatto fino a K3, A1–A3 e L1:
  - prompt in cache;
  - chiamate riparate;
  - regia per passo;
  - chiusura del compito solo con le prove;
  - profili forte, medio e base.
- **Vie gratuite:** Gemini nel livello gratuito e OpenRouter `:free`, con limiti di frequenza, tentativi ripetuti e cache.
- **Chat dal vivo:**
  - se un modello finisce la quota si passa al successivo;
  - "vai" vale come via libera e obbliga ad agire;
  - le grafiche passano dal motore.
- La chat è stata **corretta, ma non provata a lungo dal vivo**.
- L'indirizzo di Anthropic è fisso: un `ANTHROPIC_BASE_URL` ereditato dall'ambiente rompeva le chiamate.

**Motore designer.**
- Circa 50 archetipi, con critico severo, spazi, corpo minimo, carattere autoriale e intrecci.
- 338 caratteri, effetti, generatori, 3D e palette OKLCH.
- Blocco A di robustezza: 47 tavole sane su 48.
- **G1:** archivio di 146 design veri con licenza libera.
- **G2:** generatore guidato da esempi. **È debole**: entra in 1 tavola su 48 e non è mai stato provato con un modello vero.

**Editor della tela.** 26 difetti corretti, 53 prove automatiche.

**Interfaccia.** Il sistema "Carta", ricavato dalla home `/os`, è applicato alle pagine della prima versione.

**Pacchetto (fase 0).**
- Electron 44 con server interno su 127.0.0.1 e porta libera.
- L'installer NSIS da 150 MB si installa e parte senza Node né Python.
- Lo script di verifica controlla che nel pacchetto non entrino chiavi, dati o asset con licenza non verificata.

**Giudizio dell'utente sul motore.** Gli archetipi si riconoscono ancora e manca il carattere d'autore. Restano alcune sovrapposizioni, problemi di leggibilità e vuoti.

## Prossimi passi

1. **Fase 1, sicurezza** (si può fare subito, vedi `lancio-sul-mercato.md` §2):
   - token di sessione sulle API locali;
   - controllo di `Origin` sulle route che scrivono;
   - chiavi dell'utente cifrate con `safeStorage` e una schermata Modelli;
   - telemetria (LangSmith e Phoenix) spenta di base;
   - `api/seed` tolto;
   - controllo dei percorsi del vault con `path.sep`.
2. **Aperti dalla fase 0:**
   - Supabase e Meta OAuth senza chiavi nel pacchetto (errori 500);
   - tabella `design_recipes` mancante su un database nuovo;
   - icona dell'app;
   - firma del codice.
3. **Decisioni dell'utente** (`lancio-sul-mercato.md` §6):
   - pubblico;
   - chi paga i modelli (chiavi proprie o crediti inclusi);
   - prezzo e licenza;
   - solo locale o conto online;
   - piattaforme;
   - perimetro dell'MVP.

   Fasi 2–4 dopo queste scelte.
4. **Motore:**
   - G2 con un modello vero, quando la quota gratuita lo permette;
   - poi G3–G6 e il blocco B (mattoni, diversità garantita).

   **La memoria anti-ripetizione tra sessioni è stata scartata dall'utente.**
5. **Pulizia:**
   - errori silenziosi nella chat;
   - porta 8765 di crew in sviluppo;
   - rumore 403 di LangSmith;
   - consolidamento su `main`;
   - chiusura dei worktree inutili.

## Regole di lavoro (chieste dall'utente)

- **Risparmio:** si paga per consumo. Una sessione alla volta, oppure due in worktree separati che non toccano gli stessi file. Letture a pezzi, output brevi, vetrine in background, niente ricerche web inutili. Fermarsi al limite di spesa senza ritentare.
- **Gratis prima di tutto:** l'utente vuole che funzioni con modelli gratuiti, e che il lavoro vada avanti senza il suo intervento quando non servono decisioni.
- **Un commit per punto**, con una riga in `STATO-LAVORI.md` a fine lavoro. **Niente push senza chiedere, ogni volta.**
- **Mai** stampare o scrivere chiavi. **Mai** committare `.env.local`, `data/` o `data-prova/`. Non aprire `.credentials.json` e non usare le credenziali Claude dell'utente. Chiedere conferma prima di qualunque cancellazione.
- **Misurare sempre** prima e dopo, con la vetrina in locale, e **mostrare le tavole** all'utente, non solo i numeri.
- **Qualità prima del risparmio**, nella "giusta via di mezzo". Nelle tavole entrano solo asset con licenza commerciale e senza share-alike.
- **Lingua:** l'utente scrive in italiano. Risposte chiare e dirette, giudizio onesto sulle tavole.

## Come assegnare un compito a una nuova sessione

Nel messaggio di partenza:
- la cartella: il worktree di `claude/designer-unito`, oppure un worktree nuovo creato da quel ramo, con i collegamenti elencati sopra;
- i documenti da leggere: `STATO-LAVORI.md` più quello della fase;
- i punti da fare e la misura prima e dopo;
- le regole qui sopra.

La sessione risponde alla fine con i commit, i numeri e, per il motore, il percorso dei fogli.
