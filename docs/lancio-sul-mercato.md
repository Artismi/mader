# Cosa manca per lanciare Creative OS sul mercato

Analisi del 18 ottobre 2026, fatta sul ramo `claude/designer-unito`, che contiene tutto il lavoro recente. Accanto ci sono: i documenti di progetto in `Mader/` (ARD v2.1–v2.4, DUX, OMG, piano agente, piano della tela), l'estensione Chrome in `extension/`, il servizio Python in `crew/` e 13 worktree.

## Il verdetto in breve

Oggi l'app **non si può impacchettare**: `npm run build:electron` fallisce, e se anche passasse l'installer non partirebbe sul computer di un cliente. Anche risolvendo questo, il pacchetto conterrebbe le chiavi API e il database personale.

Il motore designer e il guscio dell'agente sono la parte più avanzata. Mancano invece le fondamenta di un prodotto: installazione, chiavi dell'utente, sicurezza, aggiornamenti, licenze, conti e pagamento. Mancano anche alcune decisioni su cosa vendere e a chi.

In ordine: **una build che funziona** (fase 0), **la sicurezza** (fase 1), **un perimetro ridotto ma solido** (fase 2), poi la commercializzazione (fase 3).

## 1. Bloccanti tecnici della build (fase 0)

| # | Problema | Dove | Effetto |
|---|---|---|---|
| B1 | **60 errori di tipo**: 32 in `creative-studio.tsx`, 8 nel worker di trascrizione, 13 nei filtri, gli altri sparsi | `npx tsc --noEmit` | `next build` controlla i tipi e si ferma |
| B2 | Electron avvia `.next/standalone/server.js`, ma `next.config.ts` non ha `output: 'standalone'` | `electron/main.js:151`, `next.config.ts` | il file non esiste, l'app resta su una finestra vuota |
| B3 | Il server viene lanciato con `spawn('node', …)`, cioè con il Node installato sul computer | `electron/main.js:151` | chi non ha Node non avvia l'app |
| B4 | Il database usa `node:sqlite`, che richiede Node 22.5 o successivo; Electron 32 incorpora Node 20 | `src/lib/db/client.ts`, `package.json` | usare il Node di Electron non basta: serve Electron 35 o successivo (Node 22), oppure un altro motore SQLite |
| B5 | `build.files` è `**/*`: entrano `.env.local`, `data/`, `.claude/worktrees/`, `scratch/`, `vault/`, `graphify-out/` e gli zip | `package.json` → `build` | **l'installer conterrebbe le tue chiavi e i dati dei clienti**, e peserebbe gigabyte |
| B6 | Il servizio `crew` richiede Python e i pacchetti di `requirements.txt` (crewai, moviepy, pandas) installati sul computer | `crew/`, `electron/main.js:9` | per il cliente non parte, e il ciclo di riavvio ogni 5 secondi riempie il log |
| B7 | Porta 3000 fissa: se è già occupata, l'app non parte | `electron/main.js:61` | serve una porta libera scelta all'avvio |
| B8 | La CSP di produzione non include OpenRouter né Pexels/Unsplash | `electron/main.js` | le chiamate dal renderer verso quei servizi verrebbero bloccate |

Correzioni:
- `output: 'standalone'`, server avviato con `utilityProcess` di Electron (o con `ELECTRON_RUN_AS_NODE`), su Electron ≥ 35;
- elenco `files` scritto per inclusione (solo `.next/standalone`, `.next/static`, `public`, `electron`), con `asar`;
- `crew` reso facoltativo, spento di base nel pacchetto;
- porta scelta dinamicamente;
- type check e build verificati da uno script.

## 2. Sicurezza e privacy (fase 1)

- **Server raggiungibile dalla rete locale.** Il server standalone di Next ascolta su `0.0.0.0` se non si imposta `HOSTNAME`. Le 72 route API non hanno autenticazione (il middleware lascia passare tutto), quindi chiunque sulla stessa Wi-Fi potrebbe leggere clienti, mail e preventivi. Servono `HOSTNAME=127.0.0.1` e un token di sessione casuale, generato da Electron a ogni avvio e richiesto da ogni route.
- **Richieste da siti esterni.** Anche su 127.0.0.1, una pagina web aperta nel browser può mandare richieste al server locale. Servono il controllo di `Origin` e di `Sec-Fetch-Site` sulle route che scrivono, e lo stesso token.
- **Chiavi dell'utente.** Oggi Anthropic e Gemini si leggono solo da `.env.local`, quindi in un'app installata non ci sono. OpenRouter invece ha già l'OAuth PKCE (`model-provider.ts`), ed è il modello da seguire. Serve una schermata "Modelli" in cui ognuno inserisce le proprie chiavi, conservate cifrate con `safeStorage` di Electron e mai nel database in chiaro.
- **Credenziali dello sviluppatore nel prodotto.** Google OAuth (Gmail, Drive, Calendar), Meta/Instagram, Notion, Supabase e n8n usano le tue app e i tuoi progetti. Per il mercato:
  - **Google:** gli scope di Gmail sono "riservati". Per un'app distribuita al pubblico servono la verifica di Google e una valutazione di sicurezza annuale a pagamento (CASA). È il costo più alto della lista: conviene togliere Gmail dalla prima versione, oppure usare solo scope non riservati.
  - **Instagram:** pubblicare richiede la App Review di Meta e la verifica dell'azienda.
  - **Notion e n8n:** chiavi e webhook vanno chiesti all'utente, non incorporati.
- **Due archivi di dati.** Login, Gmail, Calendar, l'estensione e `seed` passano ancora da **Supabase** (19 file), mentre il resto è su SQLite. Va scelto: tutto locale (coerente con CLAUDE.md) oppure conto online. `api/seed` e i dati finti vanno tolti dalla build.
- **Vault.** Il controllo dei percorsi usa `startsWith` senza separatore: una cartella sorella con lo stesso prefisso (`vault2`) passerebbe. Va aggiunto `path.sep`.
- **Telemetria.** LangSmith e Phoenix sono attivi con le tue chiavi, e LangSmith dà 403. Nel prodotto vanno spenti di base. Tracciamento e crash report solo con consenso esplicito (GDPR).

## 3. Legale e licenze

- **Asset:** il catalogo AS1 è in buona forma (licenze, crediti per tavola, esclusione di CC BY-SA). Però l'installer include `public/` (127 MB) intero, comprese le cartelle con licenza non verificata (`public/fonts/pack`, i pack `ds-*`). Ridistribuirle nell'app è un rischio anche se il motore non le usa: vanno tolte dal pacchetto o verificate. Fontshare è caricato nell'interfaccia dalla CSP, e la sua licenza per la ridistribuzione non è confermata.
- **Attribuzioni:** Game-icons (CC BY 3.0) e Hero Patterns (CC BY 4.0) richiedono una pagina "Crediti" nell'app, oltre ai crediti per tavola.
- **Documenti obbligatori:** privacy policy, termini d'uso, licenza d'uso del software (EULA) e informativa su quali dati vanno ai fornitori di modelli (Anthropic, Google, OpenRouter). Sono dati dei clienti dell'utente: serve chiarezza su chi è titolare e chi è responsabile del trattamento.
- **Livelli gratuiti dei modelli:** il livello gratuito di Gemini e i modelli `:free` di OpenRouter possono usare i dati inviati per addestramento, e hanno limiti bassi (Gemini Flash: 250 richieste al giorno). Per un prodotto professionale va detto all'utente, e la modalità "solo gratis" non può essere l'unica. Le condizioni attuali di Google per l'uso gratuito dall'UE vanno ricontrollate prima del lancio.
- **AI Act:** dall'agosto 2026 valgono gli obblighi di trasparenza sui contenuti generati (art. 50). Va verificato se e come si applicano alle tavole e ai testi generati, ad esempio con un segno nei metadati dell'export.

## 4. Distribuzione

- **Firma del codice:** senza firma Windows mostra l'avviso di SmartScreen e molti antivirus bloccano l'installer. Le opzioni sono Azure Trusted Signing (pochi euro al mese) o un certificato EV. Per macOS servono un Apple Developer (99 $ l'anno) e la notarizzazione.
- **Aggiornamenti automatici:** non ci sono. Servono `electron-updater` e un canale di rilascio (GitHub Releases o un bucket).
- **Primo avvio:** non c'è un percorso di benvenuto. Oggi l'app si apre su `/os` con un database vuoto, senza modelli configurati e con errori silenziosi in chat. Servono: creazione del profilo, collegamento di almeno un modello (OpenRouter con un clic), un progetto di esempio e una prova del motore senza credito.
- **Dimensioni:** la cache dei caratteri (circa 150 MB) va scaricata al primo avvio, non inclusa nell'installer. Vanno anche tolte le dipendenze non usate (`next-auth`, `openai`, `@anthropic-ai/sdk` accanto ad AI SDK, `langsmith`), da verificare una per una.
- **Integrazione continua:** non c'è (nessuna `.github/`). I test esistono e passano (agente 136, designer 33, confronto 8, tela 53), ma nessuno li esegue a ogni push. Serve un workflow con type check, test e build Windows.

## 5. Prodotto: il perimetro

L'app ha 23 pagine e due interfacce: la vecchia su `/` e il guscio circolare su `/os`. Comprende portale, CRM, calendario, inbox Gmail, editoriale, finanze, cervello, idee, incarichi, domini, pubblicazione social, studio, tela, overlay, estensione Chrome e crew Python. L'ARD prevede anche Canva, FigJam, CapCut, bandi e n8n.

Per un lancio è troppo: molte parti sono a metà, e ciascuna porta con sé integrazioni, permessi e assistenza.

**Proposta di prima versione (MVP), da decidere insieme:**
- **Dentro:**
  - guscio `/os` con l'agente;
  - clienti e incarichi;
  - **Studio** (motore designer, tela e export PNG/PDF/PPTX), che è la parte che ti distingue;
  - idee;
  - collegamento ai modelli: OpenRouter con un clic, più le chiavi proprie.
- **Fuori, per una versione successiva:**
  - Gmail, Calendar e Drive (verifica Google);
  - pubblicazione Instagram (App Review);
  - crew Python;
  - estensione Chrome;
  - overlay;
  - finanze;
  - Notion e n8n;
  - la vecchia interfaccia su `/`.

**Qualità del motore prima del lancio** (dai documenti precedenti):
- G2 entra solo in 1 tavola su 48 e non è mai stato provato con un modello vero;
- gli archetipi si riconoscono ancora;
- i gradini G3–G6 e il blocco B sono aperti;
- la chat dal vivo è stata corretta, ma non provata con un modello reale.

Per vendere serve una misura onesta: il confronto cieco Q0 contro Canva e Adobe con persone vere, non solo con la giuria di modelli.

**Il repository:**
- `main` è indietro di 292 commit rispetto a `designer-unito`;
- ci sono 13 worktree e 2 rami con lavoro non unito (`infallible-darwin`: filtri texture di aprile; `vibrant-bell`: solo package-lock);
- prima della build di rilascio va consolidato tutto su `main`, e vanno chiusi i worktree.

## 6. Decisioni che spettano a te

1. **A chi si vende:** freelance creativi italiani, agenzie piccole, o anche internazionale (lingua dell'interfaccia, oggi solo italiano, senza i18n)?
2. **Modello di costo dei modelli:**
   - (a) ognuno porta le sue chiavi o il suo OpenRouter, e paghi solo l'app;
   - (b) crediti inclusi con un tuo server proxy;
   - (c) misto.

   La (a) costa zero a te ed è già quasi pronta; la (b) richiede un server, conti e fatturazione.
3. **Prezzo e licenza:** acquisto una tantum, abbonamento o gratuito con versione pro. Servono un sistema di licenze e un pagamento (Lemon Squeezy o Paddle gestiscono anche l'IVA UE come rivenditori).
4. **Solo locale o anche conto online:** decide se Supabase resta (sincronizzazione tra dispositivi) o si toglie.
5. **Piattaforme:** solo Windows all'inizio, o anche macOS (costo Apple e notarizzazione)?
6. **Perimetro dell'MVP** del punto 5.

## 7. Piano proposto

| Fase | Contenuto | Chi |
|---|---|---|
| **0. Build che parte** | B1–B8: tipi a zero, standalone, Electron ≥ 35 con server interno, file inclusi per elenco, crew facoltativo, porta dinamica, CSP; installer NSIS provato su un Windows pulito | sessioni Claude, senza decisioni tue |
| **1. Sicurezza** | server su 127.0.0.1 con token, controllo `Origin`, chiavi in `safeStorage` con schermata Modelli, telemetria spenta, `seed` tolto, fix del vault | sessioni Claude |
| **2. Perimetro e prima esperienza** | taglio dell'MVP, primo avvio guidato, errori visibili in chat, pagina Crediti, pulizia degli asset non verificati, consolidamento su `main`, CI | dopo le tue decisioni 1, 4 e 6 |
| **3. Qualità del motore** | G2 col modello vero, G3–G4, blocco B, confronto Q0 con persone | sessioni Claude più il tuo giudizio |
| **4. Commercializzazione** | prezzo, licenze, pagamento, firma del codice, aggiornamenti, privacy policy e termini, sito | tu (conti, certificati, testi legali), con il mio aiuto |

Le fasi 0 e 1 non dipendono da nessuna tua scelta e si possono fare subito. Il resto parte quando avrai deciso i punti della sezione 6.
