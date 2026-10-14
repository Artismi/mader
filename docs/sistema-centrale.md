# Il sistema centrale di Creative OS

Obiettivo: Creative OS smette di essere un insieme di sezioni con un'IA attaccata e diventa **un sistema unico**. Al centro c'è un nucleo che conosce tutto il lavoro (clienti, messaggi, incarichi, idee, piano editoriale, grafiche, preventivi, memoria) e agisce su tutto. Ogni superficie (guscio circolare, Studio, chat, overlay, estensione, assistenti esterni) è un modo diverso di usare lo stesso nucleo.

Questo documento si appoggia a `PIANO_RICOSTRUZIONE.md`, `STRUTTURA_WORKSPACE.md` e `docs/ux/PROGETTAZIONE.md` (l'interfaccia) e a `docs/guscio-agente.md` (l'agente). Qui si descrive **cosa c'è sotto**.

---

## 1. Come sono fatti i sistemi con cui competiamo

| Sistema | Ossatura | Idea da prendere |
|---|---|---|
| **Microsoft 365 Copilot** | interfaccia → **orchestratore** → *grounding* su **Microsoft Graph** (posta, calendario, documenti, persone) con un **indice semantico** → modello | L'IA è forte quanto il grafo dei dati di lavoro che ha sotto. Il recupero rispetta i permessi dell'utente. |
| **HubSpot Breeze** | **Growth Context** (azienda, clienti, interazioni) → **Breeze Assistant** che orchestra agenti specializzati → **Smart CRM** che si aggiorna da solo; **Context Home** misura quanto è completo il contesto | Agenti specializzati su un contesto condiviso. Le modifiche proposte dall'IA passano dall'approvazione dell'utente. Si misurano i buchi nei dati. |
| **Notion 3.0** | agente che lavora per 20 minuti su pagine, database e connettori; la **memoria è fatta di pagine** | Memoria leggibile e modificabile dall'utente, non una scatola nera. Lavori lunghi e autonomi. |
| **Canva AI** | motore di design + **Brand Kit** (loghi, colori, caratteri) + Content Planner; **server MCP** che porta il motore dentro ChatGPT, Claude e Copilot | Il marchio come insieme di vincoli applicati a ogni grafica. Il motore esposto come strumento ad altri assistenti. Dalla grafica al post programmato senza uscire. |

Tutti hanno le stesse cinque parti:
1. un **grafo dei dati di lavoro**;
2. un **orchestratore** con agenti;
3. **azioni uniche** usate sia dalle persone sia dall'IA;
4. **memoria e marchio** come vincoli;
5. **apertura verso l'esterno** (connettori in entrata, MCP in uscita).

**Dove possiamo vincere:**
- *locale e privato*: SQLite sul computer dell'utente, modelli a scelta, anche gratuiti o locali;
- *verticale*: un freelance creativo ha tutto il ciclo in un posto solo (mail → preventivo → progetto → grafica → piano social → fattura), mentre gli altri ne coprono un pezzo;
- *motore di design proprio* con la maestra: grafiche controllate, non generate a caso;
- *provenienza*: ogni cosa sa da dove nasce (memory_links), che è ciò che serve all'IA per capire il lavoro.

---

## 2. Cosa c'è già (e dov'è sparso)

| Pezzo del nucleo | Esiste come | Limite |
|---|---|---|
| Grafo | `src/lib/os/graph.ts` (nodi per il guscio: getNode, search, linkOrigin), `memory_links` | Lo usa solo il guscio circolare. L'IA della chat non lo usa: ha il suo `buildContext`. |
| Indice semantico | `src/lib/vault` (embedding del vault e delle memorie, Gemini) | Indicizza solo i file del vault e i ricordi, non clienti, post, mail o grafiche. |
| Azioni | `src/app/actions.ts` (28 Server Actions), gli strumenti della chat in `src/lib/agent`, le route API | Tre implementazioni della stessa cosa. Per esempio "crea incarico" esiste in actions.ts, nella chat e nel guscio. |
| Agente | guscio agente (`src/lib/agent`, commit 59439cb); ruoli dello Studio (`roles.ts`, maestra) | Sta per diventare un servizio (`runAgent`, fase multi-modello in corso). |
| Modelli | `model-provider.ts`, catene in `roles.ts`, modelli scritti nel codice in planner, office e schema | Registro unico in corso. |
| Eventi | nessuno | Nessuno sa "cosa è successo oggi" se non rileggendo le tabelle. |
| Marchio | vault del cliente (testo libero), stili dello Studio | Il marchio non è un oggetto con regole che lo Studio e il copywriter applicano. |
| Esterno | estensione Chrome, overlay, connettori Google, Meta e Notion | Nessun server MCP: Claude Desktop o ChatGPT non possono usare Creative OS. |

---

## 3. L'architettura

```
                 ┌───────────────────── SUPERFICI ─────────────────────┐
                 │ guscio /os · Studio · chat · overlay · estensione ·  │
                 │ Ctrl+K · server MCP (Claude, ChatGPT, Copilot)        │
                 └──────────────┬───────────────────────┬──────────────┘
                                │ azioni                │ domande
                 ┌──────────────▼───────────────────────▼──────────────┐
                 │                    NUCLEO  (src/lib/kernel)          │
                 │                                                      │
                 │  AZIONI ──► una definizione per capacità: schema,    │
                 │             rischio, permesso, controllo, evento      │
                 │                                                      │
                 │  AGENTI ──► orchestratore + profili (Regia Studio,   │
                 │             Editoriale, Smistamento posta, Finanze,  │
                 │             Assistente) sullo stesso guscio           │
                 │                                                      │
                 │  GRAFO ───► entità + relazioni + indice semantico    │
                 │             + completezza del contesto                │
                 │                                                      │
                 │  EVENTI ──► registro di tutto ciò che succede        │
                 │             → linea del tempo, regole, memoria        │
                 │                                                      │
                 │  MEMORIA ─► ricordi · marchio per cliente · note     │
                 │             di lavoro · tracce                        │
                 │                                                      │
                 │  MODELLI ─► registro, profili, cascata, costi        │
                 └──────────────┬───────────────────────────────────────┘
                                │
                 ┌──────────────▼──────────────────────────────────────┐
                 │  DATI: SQLite (node:sqlite) · vault · file · Drive    │
                 │  CONNETTORI in entrata: Gmail, Calendar, Drive, Meta  │
                 └──────────────────────────────────────────────────────┘
```

### 3.1 Azioni: una definizione, tutte le superfici

È il cambiamento più importante. Ogni capacità del sistema si definisce **una volta sola**:

```ts
defineAction({
  id: 'post.schedule',                 // dominio.verbo
  title: 'Programma un post',          // per Ctrl+K e i pulsanti
  input: z.object({ postId, when }),   // lo stesso schema per UI, IA, API, MCP
  risk: 'write',                       // read | write | destructive | external (invia fuori)
  verify: (i) => […],                  // la maestra: data futura, post esistente…
  run: (i, ctx) => …,                  // la logica, una sola volta
  emits: 'post.scheduled',             // evento registrato
  links: (i, out) => [[out.id, i.postId, 'origin']],  // provenienza
})
```

Dalla stessa definizione nascono:
- la **Server Action** per i pulsanti;
- lo **strumento dell'agente** (AgentToolDef);
- la voce di **Ctrl+K**;
- l'**endpoint API**;
- lo **strumento MCP**.

Così ciò che l'utente può fare, l'IA lo può fare, e viceversa. I permessi sono uguali per tutti: `external` (inviare mail, pubblicare) e `destructive` chiedono sempre conferma.

I domini sono: `client`, `task`, `idea`, `post` (piano editoriale e social), `design` (Studio), `quote`/`invoice`, `mail`, `calendar`, `memory`, `asset`, `brand`.

### 3.2 Grafo e grounding

`src/lib/kernel/graph.ts` estende `src/lib/os/graph.ts` e diventa l'unico modo di leggere il lavoro:
- `get(ref)`, `search(query, filtri)`, `related(ref, profondità)`, `timeline(ref)`, `link(from, to, rel)`;
- **indice semantico** esteso a clienti, post, idee, mail, grafiche (titolo, testo, tag), oltre a vault e memorie: un solo `search` con parole e significato;
- **grounding dell'agente**: al posto di `buildContext` (testo fisso per richiesta), il promemoria contiene il nodo in focus e i suoi vicini, e l'agente chiede il resto con `graph.search` e `graph.related`. È il modello di Copilot: l'orchestratore va a prendere il contesto che serve;
- **completezza del contesto** (come Context Home di HubSpot): per ogni cliente, quali campi mancano (marchio, tono, account social, metriche). Il guscio mostra "completa il contesto" e l'agente sa cosa non sa.

La tabella `links` prevista da `STRUTTURA_WORKSPACE.md` è `memory_links` generalizzata: si estende `memory_links` (tipi liberi, relazioni `origin`, `about`, `uses`, `replies_to`) senza crearne un'altra.

### 3.3 Eventi

Una tabella `events(id, at, type, actor, ref, data, origin_ref)`. La scrive ogni azione con il suo `emits`, e la scrivono i connettori (`mail.received`, `calendar.changed`). L'`actor` vale `user`, `agent:<profilo>`, `rule:<id>` o `sync:<connettore>`. Serve a:
- la **linea del tempo** di ogni nodo e la giornata "Oggi" ("cosa è cambiato da ieri");
- le **regole** (§3.5);
- la **memoria episodica** dell'agente ("l'ultima volta per questo cliente hai…");
- la **misura**: cosa usa davvero l'utente, quanto lavoro fa l'IA, con quali esiti.

### 3.4 Agenti: un orchestratore, profili specializzati

Un solo guscio (`runAgent` più la chat in streaming) con **profili**. Un profilo è fatto di: istruzioni brevi, sottoinsieme di azioni, profilo di modello e skill del catalogo.

| Profilo | Fa | Azioni principali | Superficie |
|---|---|---|---|
| **Assistente** | qualsiasi richiesta, delega agli altri | tutte, con le conferme | chat, overlay, Ctrl+K |
| **Regia Studio** | brief → testi → direzioni → tavole | design.*, brand.read, client.read, post.read | Studio, pannello Template |
| **Editoriale** | piano mensile, buchi nel calendario, riuso di idee, testi social con il circuito IG | post.*, idea.*, design.compose, client.read | Editoriale, guscio Studio |
| **Smistamento** | posta in arrivo: importanza, richieste, bozze di risposta, preventivi da proporre | mail.read, mail.draft, quote.propose, task.create | guscio Messaggi |
| **Finanze** | preventivi da mail e brief, solleciti, fatture da preventivi accettati | quote.*, invoice.propose | guscio, Finanze |

L'Assistente delega con un'azione `agent.delegate(profilo, compito)`. Il profilo lavora con il suo contesto e restituisce un risultato breve: è il subagente di Claude Code, usato per domande delimitate e non per costruire pezzi in parallelo (lezione di Cognition).

### 3.5 Regole e proposte (autonomia con controllo)

- **Regole** su eventi e orari, scritte come dati (`rules`: quando, condizione, profilo, compito). Esempi:
  - ogni lunedì alle 9, il profilo Editoriale propone la settimana;
  - `mail.received` con una richiesta di preventivo → Smistamento prepara una bozza di preventivo;
  - post `programmato` a meno di 24 ore senza grafica → avviso.
- **Proposte**: ciò che un agente prepara senza che l'utente sia presente non viene eseguito. Diventa una **proposta** (`proposals`: azione, input, motivo, origine) che compare in "Oggi" con Approva, Modifica e Scarta. È il modello di HubSpot (le modifiche dell'IA passano dall'approvazione) e risolve il problema delle azioni distruttive in `runAgent` senza interfaccia.

### 3.6 Memoria e marchio

- **Ricordi** (`memories`): fatti e preferenze, leggibili e modificabili nel guscio (Archivio), come le pagine-memoria di Notion.
- **Marchio del cliente** (`brand` come oggetto, non testo libero): palette, caratteri, logo, tono di voce, parole sì/no, formati preferiti. Lo Studio lo applica come vincolo, come il Brand Kit di Canva: le direzioni del direttore vengono filtrate dal marchio e la maestra controlla colori e caratteri. Il copywriter lo usa per il tono e la maestra per le parole vietate.
- **Note di lavoro**: il piano (`updatePlan`) e le note di un lavoro lungo si salvano sul nodo, così il lavoro riprende dopo un riavvio.
- **Tracce** (`ai_calls`): ogni chiamata ai modelli, con esito della maestra, costo e latenza. Servono alla valutazione, all'ordine delle cascate e a un futuro fine-tuning (rapporto sui modelli piccoli).

### 3.7 Apertura verso l'esterno

- **Server MCP di Creative OS**, generato dal registro delle azioni con gli stessi permessi e le stesse conferme. Claude Desktop, ChatGPT o un'altra istanza possono così leggere il piano, creare un incarico o comporre una grafica con il motore dello Studio. È la mossa con cui Canva è entrato negli assistenti altrui.
- **Connettori in entrata** che scrivono nel grafo e negli eventi, non in tabelle isolate: Gmail, Calendar, Drive e Meta (metriche dei post pubblicati che tornano sul post del piano).
- **A2A** più avanti: un agente esterno (per esempio quello di un collaboratore) può affidare un compito con una scheda di competenze.

---

## 4. Fasi (incrementali: ogni fase lascia l'app funzionante)

| Fase | Contenuto | Fatto quando |
|---|---|---|
| **K0 Guscio pronto** | Le fasi in corso: registro dei modelli, `runAgent`, prompt sotto i 15k token, G5 controlli, G6 banco di prova | Valutazione su 20 compiti per almeno due modelli |
| **K1 Azioni uniche** | `src/lib/kernel/actions.ts` con `defineAction`. Si migrano prima i domini `task`, `idea`, `post`, `client`; la chat, `actions.ts` e il guscio /os chiamano le stesse azioni; Ctrl+K le elenca | "Crea incarico" ha una sola implementazione usata da pulsante, chat e Ctrl+K |
| **K2 Eventi e provenienza** | Tabella `events`; ogni azione emette eventi e scrive i link; "Oggi" mostra cosa è cambiato; la linea del tempo appare sul nodo | La linea del tempo di un cliente mostra azioni dell'utente e dell'IA in ordine |
| **K3 Grafo e grounding** | `kernel/graph.ts`; indice semantico esteso; strumenti `graph.search` e `graph.related`; il promemoria parte dal nodo in focus; completezza del contesto per cliente | Domanda "cosa manca per lanciare la campagna di X?" con risposta basata sul grafo |
| **K4 Profili e delega** | Profili Regia, Editoriale, Smistamento, Finanze; `agent.delegate`; il pannello Template e il guscio Messaggi usano i loro profili | "Pianifica novembre per X" passa all'Editoriale e torna con un piano in bozza |
| **K5 Proposte e regole** | Tabelle `proposals` e `rules`; coda delle proposte in "Oggi"; 3 regole predefinite (settimana editoriale, preventivo da mail, post senza grafica) | Il lunedì trovi la settimana proposta da approvare |
| **K6 Marchio** | Oggetto marchio per cliente, editor nel guscio Cliente, vincoli nello Studio e nel copywriter, controlli della maestra | Una grafica per X rispetta palette e caratteri di X senza dirlo nel prompt |
| **K7 Server MCP** | Generato dal registro delle azioni, con conferme; guida per collegarlo a Claude Desktop | Da Claude Desktop: "cosa ho in programma per X questa settimana?" risponde dal tuo Creative OS |
| **K8 Misura** | Pannello costi e qualità dalle tracce e dagli eventi: azioni dell'IA approvate o scartate, tasso della maestra per modello, costo per funzione | Si vede quali agenti funzionano e quanto costano |

Le fasi K1–K3 sono le fondamenta. K4–K7 possono procedere in parallelo una volta che K1 è fatta, purché sessioni diverse non tocchino gli stessi file.

### Stato delle fasi
- **K0**: registro, `runAgent`, dieta (prompt stabile ~4,4k token), G5 e G6 fatti; il banco gira su un solo modello (gemini-flash-lite-latest, 15/19 eseguiti). Manca il secondo modello: Claude è a pagamento e va chiesto all'utente.
- **K1 fatto**: `src/lib/kernel/actions.ts` (`defineAction`, `runAction`, `actionTool`, `listActions`, `onActionDone`) e i domini `task`, `idea`, `post`, `client` in `src/lib/kernel/domains/`. La chat (core-tools, system-tools), le Server Action di `src/app/actions.ts`, il guscio /os (`api/os`) e Ctrl+K (`Ask.tsx`, via `GET /api/kernel/actions`) chiamano le stesse azioni. Le regole dipendono da chi agisce: l'IA non scrive date passate, l'utente sì. Test: `scripts/agent/kernel.test.mts`.
  - Provato: test automatici su database temporaneo (stesse descrizioni, stessa scrittura da strumento e Server Action, conferma per `external`). Non provato nell'app: i pulsanti delle pagine e Ctrl+K a mano in Electron.

---

## 5. Regole del nucleo

1. **Una capacità, una definizione.** Niente logica duplicata tra pulsanti, chat e API.
2. **Ogni cambiamento è un evento con un autore.** L'utente sa sempre chi ha fatto cosa: lui, un agente o una regola.
3. **L'IA propone, l'utente dispone**, per tutto ciò che esce dal computer (mail, pubblicazioni) o che non si annulla.
4. **Il contesto si va a prendere** (grafo e ricerca), non si incolla tutto nel prompt.
5. **La memoria è visibile e modificabile.**
6. **Locale prima di tutto**: funziona senza internet per tutto ciò che non richiede un servizio esterno; i modelli locali sono una scelta reale per i compiti piccoli.
7. **Si misura**: ogni agente ha un tasso di successo e un costo noti.
