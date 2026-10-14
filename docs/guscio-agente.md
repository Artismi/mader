# Il guscio agente di Creative OS

Obiettivo: l'assistente di Creative OS deve saper usare **tutto il sistema**: Studio, piano editoriale e social, incarichi, clienti, idee, finanze, memoria. Deve farlo bene anche con modelli economici o gratuiti.

Per arrivarci si applica al nostro sistema quello che abbiamo imparato dal guscio di Claude Code, un pezzo alla volta e senza rompere ciò che funziona.

---

## 1. Il principio

Un agente è fatto di tre cose:

1. **un modello addestrato a scrivere richieste in un formato** (le chiamate a strumento);
2. **un programma che le esegue** e gli rimette davanti il risultato (il guscio);
3. **una disciplina per decidere quali token stanno davanti al modello** a ogni giro (l'ingegneria del contesto).

I pesi del modello non li controlliamo; il guscio e il contesto sì. Gli esperimenti di SWE-agent mostrano che, a parità di modello, un'interfaccia degli strumenti progettata bene quasi raddoppia i risultati (18,0% contro 10,3%).

---

## 2. Dove siamo (diagnosi di `src/app/api/ai/route.ts`)

| Aspetto | Oggi | Problema | Nel guscio di Claude |
|---|---|---|---|
| Prompt di sistema | Ricostruito a ogni richiesta. In seconda posizione ci sono data e **ora al minuto**, poi canvas, RAG e memorie. | La cache del prefisso si rompe a ogni minuto e a ogni domanda. Paghiamo ogni volta il prezzo pieno di architettura, skill e strumenti. | Prefisso stabile (istruzioni, strumenti, catalogo). Le parti che cambiano viaggiano in un promemoria attaccato all'ultimo messaggio. |
| Scelta di strumenti e istruzioni | Parole chiave (`isCreativeQuery`: "post", "design"…) decidono quali skill entrano e con quale guida. | Fragile: "fammi un volantino" non è "creativo" per il filtro. Istruzioni diverse a ogni domanda: altra rottura della cache. | Tutti gli strumenti sono sempre presenti. Le competenze arrivano dal catalogo, che il modello carica da solo (`loadSkill`). Si maschera, non si rimuove. |
| Copertura del sistema | 20 strumenti: incarichi, idee, cliente (solo ricerca), canvas, Instagram, preventivi, schema, Office. | Il modello **non vede** il piano editoriale, le idee salvate, i dettagli del cliente e le sue metriche, e non può usare la regia dello Studio. Non può pianificare un mese di social. | Strumenti di lettura per ogni area. Strumenti di scrittura stretti e verificati. |
| Risultati | Restituiti grezzi. | Un risultato lungo (snapshot del canvas, liste) riempie la finestra. | Tetto sui risultati, con una nota "restringi la ricerca". |
| Errori | Alcuni strumenti lanciano eccezioni, altri restituiscono `success: false`. | Un'eccezione interrompe il giro e il modello non vede cosa è andato storto. | Ogni errore torna al modello come risultato e il modello si corregge. |
| Permessi | Nessuno. `clearBoard`, `deleteElements` e la fattura partono senza chiedere. | Azioni distruttive o con valore legale eseguite su un'interpretazione del modello. | Rischio dichiarato per strumento. Per le azioni distruttive serve la conferma dell'utente. |
| Lunghezza del lavoro | Al massimo 10 passi. | Un piano editoriale di un mese non ci sta. | Molti passi, più una lista di attività che il modello riscrive ("recitazione"). |
| Conversazioni lunghe | Ogni messaggio rispedisce tutta la storia, compresi i JSON enormi delle tavole. | Costo e degrado (context rot) crescono con la conversazione. | Svuotamento dei vecchi risultati e riassunto quando si supera una soglia. |
| Osservabilità | Telemetria Phoenix/LangSmith attiva. | Nessuna misura semplice di token, cache e strumenti per richiesta. | Il campo `usage` di ogni chiamata viene registrato. |

Quello che **funziona già** e si tiene:
- la **maestra** (`maestra.ts`): controlli in codice con errori precisi rimandati al modello;
- la **catena di ruoli** con ripiego tra modelli (`roles.ts`);
- i **menu chiusi** del direttore;
- il **catalogo di skill** con `loadSkill` (`skill-router.ts`);
- i **calcoli locali** di `instagramLab`, al posto delle stime a occhio.

Sono già gli stessi principi del guscio di Claude: vanno estesi a tutto il sistema.

---

## 3. L'architettura

```
src/lib/agent/
  tools.ts     definisci uno strumento una volta: gruppo, rischio, schema, esecuzione,
               tetto sul risultato, controllo della maestra. Il guscio lo avvolge:
               errori → risultato, taglio, tempi, conferma se distruttivo.
  prompt.ts    prompt a strati: STABILE (identità, regole, guida agli strumenti, catalogo)
               → PROMEMORIA (data, situazione, canvas, cliente, RAG, memorie, skill attivate)
               attaccato all'ultimo messaggio dell'utente.
  compact.ts   storia lunga: svuota i vecchi risultati degli strumenti, poi riassume
               i turni vecchi sopra una soglia.
  system-tools.ts  strumenti di lettura e scrittura sul sistema: piano editoriale,
               idee, cliente, memoria, regia dello Studio, piano di lavoro.
  trace.ts     una riga per richiesta: modello, passi, strumenti, token, quota in cache.
```

### 3.1 Contratto di uno strumento

```ts
defineTool({
  name: 'readEditorialPlan',
  group: 'social',              // per la guida e i nomi
  risk: 'read',                 // read | write | destructive
  description: '…',             // scritta per il modello: quando usarlo e quando no
  inputSchema: z.object({ … }),
  maxChars: 6000,               // tetto sul risultato
  execute: async (input) => …,  // eccezioni → { success: false, error } restituito al modello
})
```

Regole di scrittura degli strumenti (da Anthropic, "Writing tools for agents"):
- **Cercare, non elencare tutto**: filtri per cliente, stato e periodo.
- **Restituire nomi**, non soli identificativi. Gli ID corti di 8 caratteri restano, perché servono alle scritture.
- **Errori azionabili**: "Cliente 'Rossi' non trovato: usa searchClient" invece di un codice.
- **Poka-yoke**: le date si accettano solo in ISO, gli stati da un elenco chiuso.

### 3.2 Permessi

| Rischio | Esempi | Comportamento |
|---|---|---|
| `read` | readTasks, readEditorialPlan, getClient | Parte subito. |
| `write` | createTask, saveInstagramDraft, updateEditorialPost | Parte subito; il risultato dice cosa è cambiato. |
| `destructive` | clearBoard, deleteElements, fattura | **Conferma dell'utente** in chat: pulsanti Consenti e Rifiuta, gestiti con l'approvazione dell'AI SDK v6. |

### 3.3 Prompt a strati e cache

Ordine fisso: `tools` → `system` (stabile) → `messages`. La parte stabile cambia solo quando cambiano architettura o skill nelle impostazioni. Tutto ciò che varia per richiesta va in un blocco `<promemoria>` dentro l'ultimo messaggio dell'utente:

```
<promemoria>
Data: martedì 14 ottobre 2026 (mattina)
Pagina: /editoriale
## Situazione …          (incarichi in ritardo, oggi, prossimi giorni)
## Cliente: …            (vault)
## Dal vault …           (RAG)
## Ricordo …             (memorie)
## Skill attive …        (quelle scelte dal router)
## Canvas …              (snapshot)
</promemoria>
```

L'orario è arrotondato alla fascia (mattina, pomeriggio, sera): basta per ragionare sulle scadenze e non rende diverso ogni minuto.

### 3.4 Lavori lunghi

- **Passi**: da 10 a 24.
- **`updatePlan`**: per lavori in più fasi (un mese di social, un carosello con testi e grafiche) il modello scrive e aggiorna una lista di attività. La lista finisce in fondo al contesto, dove l'attenzione è più forte. Manus lo fa con `todo.md` su compiti di circa 50 chiamate.
- **Compattazione**: sopra circa 60k token stimati si svuotano i risultati degli strumenti più vecchi degli ultimi 6 messaggi (a parte il nome dello strumento e l'esito). Se non basta, i turni vecchi vengono riassunti da un modello economico.

---

## 4. Copertura: che cosa deve saper fare

| Area | Lettura | Scrittura | Note |
|---|---|---|---|
| Incarichi | readTasks | createTask, updateTaskStatus, createRecurringEngagement | esistenti |
| Clienti | searchClient, **getClient** | — | getClient: settore, contatti, metriche social, estratto del vault |
| Idee | **listIdeas** | createIdea | |
| Piano editoriale e social | **readEditorialPlan** | saveInstagramDraft, **updateEditorialPost** | pianificare = leggere il piano, trovare i buchi, proporre, salvare in bozza dopo il sì |
| Studio | getCanvasState, **directDesign** | composeDesign, editDesign, updateCanvasElements | directDesign: la regia (analista → copywriter → direttore) con i controlli della maestra, poi composeDesign |
| Memoria | **searchMemory** | remember | |
| Finanze | — | createFinancialDocument | la fattura chiede conferma |
| Lavoro | **updatePlan** | | |

In grassetto gli strumenti nuovi di questa fase.

---

## 5. Fasi

| Fase | Contenuto | Fatto quando |
|---|---|---|
| **G1 Nucleo** | `tools.ts`, rischio e conferme, errori come risultati, tetto sui risultati, 24 passi, traccia | gli strumenti esistenti girano dentro il guscio; clearBoard chiede conferma |
| **G2 Contesto** | prompt a strati, promemoria, guida agli strumenti stabile, fine dell'instradamento a parole chiave per le istruzioni | la parte stabile è identica tra due richieste diverse (misurato) |
| **G3 Copertura** | strumenti nuovi della tabella sopra | "pianifica i post di ottobre per X" legge il piano, propone e salva in bozza |
| **G4 Lavori lunghi** | updatePlan, compattazione | una conversazione di 30 messaggi resta sotto la soglia |
| **G5 Maestra ovunque** | controlli di uscita per strumento (testi social con instagramScores, date nel futuro, cliente esistente) | gli errori tipici tornano al modello prima di arrivare all'utente |
| **G6 Valutazione** | 20 compiti reali con verifica (incarichi, piano, grafiche), lettura delle tracce | tasso di riuscita misurato per modello |

### Stato (14 ottobre 2026)

- **G1–G4 fatte** e collegate in `src/app/api/ai/route.ts`:
  - i 21 strumenti della chat sono definizioni del guscio (stessi nomi, quindi il widget li esegue come prima);
  - prompt stabile + promemoria;
  - strumenti nuovi;
  - conferme in chat per `clearBoard`, `deleteElements` e fattura;
  - 24 passi, compattazione, traccia `[agente]` nel log del server;
  - nel widget, la card di conferma e il piano come checklist.
- **Corretto per strada**: `readTasks` ignorava il filtro per cliente.
- **Test**: `npm run test:agente` (Node puro, database temporaneo) copre:
  - taglio dei risultati, errori come risultati, maestra in ingresso, conferme;
  - svuotamento e riassunto;
  - prompt stabile deterministico e promemoria;
  - piano editoriale (giorni liberi nel fuso locale), aggiornamento dei post, scheda cliente, piano di lavoro.
- **Prova nell'app** (server di sviluppo, database vuoto di prova, `gemini-flash-latest`):
  - la domanda "che post ho dal 20 al 26 ottobre?" ha prodotto una chiamata a `readEditorialPlan` con le date giuste e una risposta corretta, in 2 passi;
  - traccia: 180.855 token in ingresso (cache 49%), 898 in uscita, 15 s;
  - la prova della conferma su `clearBoard` si è fermata per la quota esaurita di Gemini e resta da fare nell'app.
- **Misura da affrontare**: ogni chiamata manda circa 90k token di prompt stabile, soprattutto per l'architettura di `defaults.ts` e le skill fisse. Con la cache costa poco, ma rallenta e diluisce l'attenzione. Il prossimo passo di contesto è portare le skill fisse nel catalogo (`loadSkill`) e accorciare l'architettura.
- **Da fare**:
  - **G6**, cioè i compiti reali con verifica, da scegliere con l'utente;
  - misurare la quota in cache con un modello vero, leggendo la riga `[agente]`.

G6 richiede compiti reali scelti con l'utente.

---

## 5a. G5: la maestra sulle scritture (fatta, 14 ottobre 2026)

I controlli sono riusabili e stanno in `src/lib/agent/checks.ts`. Ogni strumento che scrive li mette in `verify`, prima di scrivere, e in `after`, che rilegge quello che è stato scritto.

| Strumento | Prima di scrivere | Dopo (rilettura) |
|---|---|---|
| `createTask` | titolo 3–120 caratteri, data ISO non nel passato, cliente esistente | l'incarico esiste con quel titolo |
| `createRecurringEngagement` | date ISO future, fine dopo l'inizio, ore coerenti, al massimo un anno di slot | — |
| `updateTaskStatus` | l'incarico esiste (almeno 8 caratteri dell'ID) | lo stato è davvero cambiato |
| `createIdea` | testo, titolo, cliente esistente | l'idea esiste |
| `saveInstagramDraft` | cliente obbligatorio ed esistente, budget di titolo, contenuto e caption, data futura, caption (o post singolo) senza difetti gravi del lint e non segnalata come testo generato | il post è nel piano; gli avvisi del lint arrivano come "da rivedere" |
| `updateEditorialPost` | data programmata non nel passato; testo per Instagram passato dal lint | — |
| `remember` | 5–500 caratteri; un ricordo per cliente vuole un cliente esistente | — |
| `createFinancialDocument` | cliente esistente, almeno una voce, prezzi maggiori di zero, descrizioni | — |

- **Cliente in chiaro**: `createTask` e `createFinancialDocument` accettano nome, ID corto o ID completo, e nel database salvano sempre l'ID completo. Prima un nome finiva com'era nel campo `client_id`.
- **Il modello vede l'esito**: gli errori tornano al modello come frasi da correggere. I problemi trovati dopo la scrittura arrivano in `controlli` nel risultato.
- **Test**: `maestra.test.mts`, 8 test.

## 5c. Dieta del prompt (fatta, 14 ottobre 2026)

**Diagnosi.** I circa 90k token per passo misurati nella prima prova non venivano dalla parte stabile, che pesava circa 12,6k (architettura delle Impostazioni circa 2k, 21 skill fisse circa 8k, libreria grafica circa 0,7k). Venivano dal promemoria: bastava la parola "post" perché la domanda risultasse "creativa", e il router aggiungeva **tutti** gli handbook design/dic.

**Cosa cambia:**
- **Parte stabile**: architettura, modo di lavorare, guida agli strumenti, guida grafiche e **indice** di tutte le skill (una riga ciascuna). Le skill intere si caricano con `loadSkill`; `pinned` resta disponibile ma è vuoto.
- **Libreria grafica**: solo per i modelli forti, che impaginano a coordinate.
- **Promemoria** (`selectActiveSkills`): entrano le skill scelte dal router (ig-*) e quelle con un trigger a parola intera nella domanda, fino a circa 14k caratteri. Le altre pertinenti vengono solo nominate ("Pertinenti ma non caricate…").
- **Parole chiave creative**: decidono solo il modello.

**Misure:**

| | Prima | Dopo |
|---|---|---|
| Parte stabile (dati veri, `scripts/agent/misura-prompt.mts`) | ~12,6k token | **~4,4k** (5,1k con la libreria) |
| Skill nel promemoria, domanda "post" | tutti gli handbook | ~1,1k (segretario, caption, ig-plan) |
| Dal vivo, "Che post ho dal 20 al 26 ottobre?" (Gemini, database vuoto) | ~90k per passo (180.855 in 2 passi, cache 49%) | **~20,6k per passo** (82.384 in 4 passi, cache 67%) |
| Dal vivo, "Quali incarichi scadono entro il 30?" | ~28k per passo (cache 46%) | ~19k per passo (cache 89%) |

**Cosa resta:** gli **schemi degli strumenti**, circa 12k per passo: canvas e composeDesign (la sola descrizione circa 3,7k), più circa 2,9k degli strumenti di sistema. Il prossimo taglio è caricare gli schemi del canvas solo con il canvas aperto o dopo `loadSkill`, oppure accorciare la descrizione di `composeDesign`.

## 5b. Tutti i modelli, tutti gli strumenti (fasi G7–G8, 14 ottobre 2026)

Richiesta dell'utente: Claude, Gemini, OpenRouter e qualunque modello con una chiave devono poter usare il guscio, e anche i singoli strumenti dello Studio devono poter fare tutto nel sistema.

### G7: registro unico dei modelli (`src/lib/ai/model-registry.ts`)

- **Fornitori**: si usano quelli che hanno la chiave. OpenRouter con OAuth, Claude con `ANTHROPIC_API_KEY`, Gemini con `GEMINI_API_KEY` o `GOOGLE_GENERATIVE_AI_API_KEY`.
- **Ordine**: prima la scelta fatta in chat (`modelId`), poi quella delle Impostazioni (`config ai.fornitore`), poi gli altri fornitori.
- **Profilo di ogni modello**, dedotto dal nome:
  - strumenti nativi (Gemma via API Gemini non li ha);
  - visione;
  - output strutturato;
  - forza (`forte`, `medio`, `debole`);
  - contesto.
- **Scelta per bisogno**: `pickModel` e `candidatesFor` ricevono `{ task, tools?, vision?, structured?, preferisci? }`.
  - `riservato` esclude Google gratuito (vale per i file del vault e per i lavori riservati).
- **Quota e ripieghi**:
  - `noteFailure` mette da parte un modello: 65 s se la quota è al minuto, 3 h se è giornaliera, 24 h se il modello non esiste, 10 min se il servizio non risponde;
  - `withModels`, `generateTextWith` e `generateObjectWith` provano i candidati in ordine.
- **Chi passa ora dal registro**:
  - la chat;
  - la catena dei ruoli dello Studio, che non ha più ID scritti nel codice ma preferenze per ruolo;
  - planner, OS (bozze delle mail), Office, schemi, template-assist;
  - le descrizioni delle immagini del vault.
- **Bug corretti per strada**:
  - `gemini-2.5-flash` era stato ritirato da Google e faceva fallire la scelta "gemini";
  - le descrizioni del vault usavano `claude-haiku-4-5`;
  - "gemini" contiene "mini" e veniva preso per un modello piccolo.

### Adattamento ai modelli deboli

- **Strumenti per pagina**: in chat un modello debole vede solo gli strumenti della pagina aperta (`toolsForContext` con `activeTools`).
- **Il più forte del fornitore**: in chat e in `runAgent` si sceglie il modello più forte del fornitore scelto. Prova dal vivo: Gemini Flash-Lite aveva scritto la chiamata `readTasks` come testo invece di eseguirla.
- **Catena dei ruoli**:
  - output strutturato (`Output.object`) dove il modello lo regge, con ripiego sul JSON nel testo se lo schema non gli va bene;
  - due giri per modello, poi il successivo;
  - se la maestra ripete gli stessi errori si passa subito al successivo.
- **Rilevatore di ripetizioni** (`createRepeatGuard`): alla seconda chiamata identica fallita suggerisce un altro approccio. Alla terza, in `runAgent` il modello viene sostituito.
- **Chiamate scritte come testo** (`<default_api:…>`, `<tool_call>`): `runAgent` passa al modello successivo.

### Modelli ritirati (`src/lib/ai/model-catalog.ts`)

- **Niente ID scritti a mano fuori dal registro.** Un test (`catalogo.test.mts`) cerca nel codice le chiamate `google('…')`, `anthropic('…')` e `openai('…')` e fallisce se ne trova.
- **Alias prima delle versioni.** Per Gemini si mettono prima gli alias `-latest`, che il fornitore aggiorna e non ritira. Gli ID con versione restano solo come ripiego.
- **Catalogo dei fornitori.** Gli elenchi dei modelli (Gemini, Anthropic, OpenRouter) si scaricano in sottofondo al massimo una volta al giorno e si salvano nel database.
  - Il registro salta gli ID che non compaiono nell'elenco.
  - Un ID senza data conta come disponibile se nell'elenco c'è la sua versione datata.
  - Senza elenco (offline o chiave assente) l'ID risulta "sconosciuto" e si prova lo stesso.
- **Errori da ID ritirato.** Un errore "no longer available" o 404 segna l'ID come ritirato. `GET /api/ai/models` lo elenca in `ritirati`; con `?aggiorna=1` riscarica subito gli elenchi.

### G8: il guscio come servizio (`src/lib/agent/run.ts`, `POST /api/ai/agent`)

- `runAgent({ compito, contesto?, gruppi?, strumenti?, modello?, maxPassi? })`, senza streaming:
  - stessi strumenti della chat (`core-tools.ts` + `system-tools.ts`), stessa maestra e stessa traccia;
  - prompt snello: circa 9k token invece di circa 90k.
- **Senza interfaccia nessuno conferma**: le azioni distruttive e la fattura non vengono eseguite. Tornano come `proposte`, che il chiamante mostra all'utente.
- **Collegati allo Studio**:
  - la **regia** (`/api/ai/design-direct` e lo strumento `directDesign`) accetta `cliente`: prima di scrivere legge scheda e vault, piano editoriale delle prossime quattro settimane e memoria (`contestoSistema` in `designer-roles.ts`);
  - il **pannello Template** ha il campo Cliente e l'azione **"Fallo nel sistema"**. Per esempio "salvala come bozza nel piano di X per venerdì" passa da `/api/ai/agent` con i testi della grafica come contesto.

### Prove

- `npm run test:agente`: 41 test. Comprendono scelta del modello con chiavi simulate, ordine, riservato, visione, profili, quota e cascata, rilevatore di ripetizioni, e `runAgent` con un modello finto (strumento eseguito, fattura come proposta, sostituzione di un modello che gira a vuoto o scrive le chiamate come testo, gruppi).
- **Dal vivo** (server di sviluppo, database di prova vuoto, sola chiave Gemini):
  - `/api/ai/agent` con "salva come idea e crea un incarico entro il 24 ottobre": 3 strumenti, idea e incarico creati, 8,7k token;
  - la chat ha letto l'incarico con `readTasks` (`gemini-flash-latest`, cache 46%).
- **Non provati dal vivo**: Claude e OpenRouter (non c'erano chiavi nella prova), la regia con il cliente, il pannello Template nell'app e le card di conferma.

## 6. Fonti

- Anthropic: *Effective context engineering for AI agents*, *Writing effective tools for agents*, *Building effective agents*, documentazione su prompt caching e tool use.
- Manus: *Context Engineering for AI Agents* (cache KV, mascherare invece di rimuovere, file come memoria, recitazione, lasciare gli errori nel contesto).
- SWE-agent (Agent-Computer Interface), MemGPT (memoria a livelli), Chroma (*Context Rot*), Cognition (*Don't build multi-agents*).
- Rapporto "Sotto la buccia" (sessione del 14 ottobre 2026): analisi del guscio di Claude Code.
