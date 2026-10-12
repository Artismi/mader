# Guida al test: OpenRouter, stream della chat e schemi sul canvas

Questa guida verifica sul tuo computer le modifiche del branch `claude/ecstatic-mendel-t4tibq`:

1. collegamento dell'account OpenRouter dalle Impostazioni;
2. scelta del modello (uno per le grafiche, uno per il resto);
3. risposte di crew, schema e documenti Office che arrivano in chat;
4. schema concettuale caricato sul canvas.

Ogni passo dice **cosa fare**, **cosa devi vedere** e **cosa controllare se non va**.
Segnati l'esito di ogni passo (✅ / ❌): se qualcosa fallisce, mandami il numero del passo,
uno screenshot e le ultime righe del terminale.

---

## 0. Prerequisiti

- Node.js 22 o superiore (`node -v`)
- Un account su [openrouter.ai](https://openrouter.ai) con **qualche credito** (bastano 5 $ per
  i test: una grafica con Claude Sonnet costa pochi centesimi)
- Facoltativo: Python 3 se vuoi provare anche la crew (passo 7)
- Facoltativo: `sqlite3` da terminale, per controllare il database (passo 3.4)

---

## 1. Scaricare il branch

```bash
cd percorso/del/progetto/mader
git fetch origin claude/ecstatic-mendel-t4tibq
git checkout claude/ecstatic-mendel-t4tibq
git pull
```

**Devi vedere:** `git log --oneline -3` mostra in cima
`feat(ai): collegamento OpenRouter e stream compatibili con la chat`.

---

## 2. Installare e avviare

```bash
npm install
npm run dev:electron
```

**Devi vedere:**
- nel terminale due colonne colorate, `NEXT` e `ELECTRON`;
- dopo qualche secondo si apre la finestra di Creative OS.

**Se non va:**
- `Cannot find module '@openrouter/ai-sdk-provider'` → `npm install` non è andato a buon fine: rilancialo.
- La finestra resta bianca → aspetta che in `NEXT` compaia `Ready`, poi premi `Ctrl+R` nella finestra.

> Le chiavi `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` nel tuo `.env.local` non servono per questo test:
> con OpenRouter collegato la chat usa la tua chiave OpenRouter.

---

## 3. Collegare OpenRouter

### 3.1 Aprire le Impostazioni
Vai su **Impostazioni** (oppure apri `http://localhost:3000/settings`).

**Devi vedere:** una nuova scheda **Modelli AI** con il testo
"Collega il tuo account OpenRouter…" e il pulsante **Collega OpenRouter**.

**Se non va:** se la pagina Impostazioni dà errore già prima di questa modifica (dipende dal
login Supabase del profilo), segnalamelo: è un problema separato.

### 3.2 Avviare il collegamento
Premi **Collega OpenRouter**.

**Devi vedere:** si apre un **popup** separato con la pagina di OpenRouter che chiede di accedere
e di autorizzare l'app (il nome mostrato sarà qualcosa come `localhost:3000`, è normale).

**Se non va:**
- Non si apre nulla → apri gli strumenti sviluppatore della finestra (`Ctrl+Shift+I`) → scheda
  Console, e mandami gli errori.
- Si apre una pagina di errore di OpenRouter → copiami l'URL del popup (contiene `callback_url`
  e `code_challenge`).

### 3.3 Autorizzare
Accedi a OpenRouter e conferma l'autorizzazione.

**Devi vedere:**
- il popup **si chiude da solo**;
- la finestra principale torna su **Impostazioni** con l'indirizzo che termina in `?openrouter=connected`;
- la scheda Modelli AI mostra il badge verde **OpenRouter collegato**, la riga
  "Spesa con questa chiave: $0.00" e due campi modello.

**Se non va:**
- Torni alle Impostazioni con `?openrouter=error` e il messaggio rosso → guarda nel terminale la
  colonna `NEXT`: cerca una riga che inizia con `[openrouter]` e mandamela.
- Il popup resta aperto su una pagina `localhost:3000/api/auth/openrouter/callback…` → chiudilo,
  ricarica le Impostazioni e dimmi se il badge verde c'è (il collegamento potrebbe essere riuscito
  comunque, ma il popup non si è chiuso: è un problema di Electron che sistemo io).

### 3.4 (Facoltativo) Controllare il database
```bash
sqlite3 data/creative-os.db "SELECT provider, substr(provider_token,1,12) FROM user_tokens;"
```
**Devi vedere:** una riga `openrouter|sk-or-v1-…`. La chiave **non** deve comparire in nessuna
pagina dell'app né nella Console del browser.

### 3.5 Controllo nel browser normale (facoltativo)
Apri `http://localhost:3000/settings` anche da Chrome. Qui il collegamento non usa il popup ma
cambia pagina: alla fine devi tornare sulle Impostazioni con il badge verde.

---

## 4. Scegliere i modelli

Nella scheda **Modelli AI**:

| Campo | Valore di default | Quando si usa |
|---|---|---|
| Grafiche e canvas | `anthropic/claude-sonnet-5.5` | richieste con parole come post, poster, slide, logo… **o** fatte con il canvas aperto |
| Incarichi, idee, chat | `anthropic/claude-haiku-5.5` | tutto il resto |

1. Clicca nel primo campo: compare l'elenco dei modelli suggeriti.
2. Lascia i default per ora e premi **Salva modelli**.

**Devi vedere:** compare una spunta ✓ sul pulsante per un secondo.

**Prova di persistenza:** ricarica la pagina (`Ctrl+R`): i valori devono restare uguali.

---

## 5. La chat usa OpenRouter

1. Vai su **Progettazione** e apri la chat AI.
2. In alto a destra nella chat ci sono i pulsanti modello.

**Devi vedere:** tre pulsanti **OPENROUTER · GEMINI · CLAUDE**, con **OPENROUTER** già evidenziato.
(Se non hai collegato OpenRouter vedi solo GEMINI e CLAUDE, come prima.)

### 5.1 Prima richiesta semplice
Scrivi: `Ciao, che modelli stai usando?`

**Devi vedere:** una risposta in chat entro pochi secondi.

**Verifica che sia andata su OpenRouter:** su [openrouter.ai/activity](https://openrouter.ai/activity)
deve comparire la richiesta con il modello **Claude Haiku 5.5** (non è una richiesta grafica,
ma con il canvas aperto potrebbe risultare Sonnet: vedi 5.2).

### 5.2 Richiesta grafica
Incolla il **brief 1** da `docs/prompt-grafiche.md` (post "Notte Etiope").

**Devi vedere:**
- in chat il messaggio "Tavola creata nel canvas";
- sul canvas una tavola 1080×1080 con sfondo scuro, titolo, label, forma e foto;
- su openrouter.ai/activity la richiesta con **Claude Sonnet 5.5**.

**Se non va:**
- Risposta vuota o errore in chat → copia l'errore, e guarda in `NEXT` il messaggio d'errore.
  Un `402` vuol dire crediti finiti; un `404 model not found` vuol dire che l'ID modello non
  esiste più: cambialo nelle Impostazioni.
- La chat risponde ma il canvas resta vuoto → mandami lo screenshot della chat: probabilmente il
  modello ha descritto la grafica invece di chiamare il tool.

### 5.3 Ritocco
Scrivi: `Porta il titolo a 130px e spostalo 40px più in basso`

**Devi vedere:** solo il titolo cambia, il resto della tavola resta com'è.

### 5.4 Spesa
Torna nelle Impostazioni: la riga "Spesa con questa chiave" deve essere salita di qualche centesimo.

---

## 6. Schema concettuale sul canvas

In Progettazione, nella chat, incolla il **brief 9**:

```
Fammi uno schema del funnel di acquisizione clienti per uno studio creativo:
Contenuti social → Portfolio → Call conoscitiva → Preventivo → Progetto → Referral.
```

**Devi vedere:**
- in chat "🗺️ Schema generato: …" con numero di nodi e connessioni;
- sul canvas lo schema, **centrato nella vista** e selezionato;
- puoi spostarlo come un unico gruppo (per modificare i singoli pezzi, separa il gruppo con gli strumenti del canvas);
- `Ctrl+Z` lo toglie.

**Se non va:**
- Lo schema compare solo in chat → mandami lo screenshot e, dalla Console (`Ctrl+Shift+I`),
  eventuali errori che contengono `loadSVGFromString`.
- Messaggio "Schema API error" → il generatore di schemi (`/api/ai/schema`) ha fallito:
  mandami le righe di `NEXT`.

---

## 7. (Facoltativo) Crew Python

La crew parte da sola con Electron **solo se Python è installato** e le sue dipendenze ci sono.

```bash
cd crew
pip install -r requirements.txt
cd ..
npm run dev:electron
```

**Devi vedere** nella colonna `ELECTRON` righe che iniziano con `[crew]`.

Poi in Progettazione scrivi: `Crea un poster per il festival Versi Fuori Posto`

**Devi vedere:**
- in chat i passaggi degli agenti ("Pipeline Multi-Agente avviato", "✓ … completato (1/5)" ecc.);
- alla fine "Pipeline completato — qualità: NN/100";
- la tavola disegnata sul canvas.

Prima di questa modifica qui la chat restava **vuota**: se vedi i messaggi, la correzione funziona.

**Nota:** la crew usa i suoi modelli (Gemini, con la chiave del `.env`), non OpenRouter.

---

## 8. Documento Office (controllo rapido)

In chat scrivi: `Fammi un file Excel con le spese di ottobre: affitto 800, software 120, trasporti 60`

**Devi vedere:** in chat "📊 **…** (excel)" con un'anteprima. Anche questa risposta prima
arrivava vuota.

---

## 9. Scollegare

Impostazioni → **Scollega**.

**Devi vedere:**
- la scheda torna al pulsante "Collega OpenRouter";
- in Progettazione la chat mostra di nuovo solo GEMINI e CLAUDE (dopo aver ricaricato);
- (facoltativo) `sqlite3 data/creative-os.db "SELECT provider FROM user_tokens;"` non mostra più `openrouter`.

La chiave resta valida sul sito di OpenRouter: se vuoi revocarla del tutto, cancellala da
[openrouter.ai/settings/keys](https://openrouter.ai/settings/keys).

---

## Riepilogo da mandarmi

| Passo | Cosa | Esito |
|---|---|---|
| 2 | App si avvia | |
| 3.2 | Popup OpenRouter si apre | |
| 3.3 | Popup si chiude, badge verde | |
| 4 | Modelli salvati e persistenti | |
| 5.1 | Chat risponde via OpenRouter | |
| 5.2 | Brief 1 disegnato sul canvas | |
| 5.3 | Ritocco solo sul titolo | |
| 6 | Schema sul canvas | |
| 7 | Crew in chat (facoltativo) | |
| 8 | File Excel in chat | |
| 9 | Scollega | |
