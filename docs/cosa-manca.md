# Cosa manca perché funzioni davvero

Analisi del 14 ottobre 2026, dopo G5, G6, la dieta del prompt, K1 e K2. Si legge insieme a `STATO-LAVORI.md`.

## Cosa c'è

Il guscio (`src/lib/agent/`) ha strumenti con rischio e verifica (la maestra), prompt stabile in cache, promemoria, compattazione, traccia, rilevatore di ripetizioni, catena dei modelli, `runAgent` come servizio e un banco di 20 compiti. Il nucleo (`src/lib/kernel/`) ha azioni uniche ed eventi con provenienza.

Il punto debole è uno solo: **quando il modello sbaglia, oggi il sistema lo sostituisce invece di guidarlo**. Con un modello debole questo vuol dire passare da un modello all'altro fino al più caro, oppure fallire. Nel codice non si usano `experimental_repairToolCall`, `prepareStep` e `toolChoice` dell'AI SDK, anche se ci sono già.

## A. Far lavorare bene i modelli deboli, senza pigrizia

**A1. Riparare, non sostituire.** Una chiamata scritta come testo (`<tool_call>`, `<default_api:…>`, JSON rotto) si analizza e si esegue lo stesso: tre analizzatori (formato Hermes, formato Gemini, JSON riparato) dentro `experimental_repairToolCall`. Solo dopo la seconda riparazione fallita si cambia modello. È quello che fanno i server di inferenza (gli analizzatori di vLLM) e che noi oggi trattiamo come un errore.

**A2. Regia per passo (`prepareStep`).** A ogni passo il codice decide, non il modello:
- se la richiesta è un'azione ("programma", "crea", "sposta"), al primo passo `toolChoice: 'required'`, così il modello non può rispondere solo a parole;
- gli strumenti attivi seguono la fase del compito (leggere → proporre → scrivere → verificare), come una macchina a stati;
- il modello per passo: quello forte pianifica una volta, quello debole esegue i passi semplici. È la cascata, ma dentro il singolo compito.

Attenzione alla cache: Manus maschera gli strumenti invece di toglierli, perché cambiare l'elenco rompe il prefisso. Per noi vale lo stesso. L'elenco completo resta in testa al prompt e la fase si dice nel promemoria (`<promemoria>fase: verifica; strumenti utili: …</promemoria>`); `activeTools` si usa solo dove la cache non conta.

**A3. Chiudere solo con le prove.** È il rimedio alla pigrizia, ed è anche il risultato più solido delle ricerche del 2026 (*Evidence-Carrying Termination*, HALT, RubricRefine): il modello non decide da solo quando ha finito.
- Ogni compito ha un **contratto**: le voci del piano (`updatePlan`), ciascuna con un controllo deterministico ("il post del 21 esiste in `editorialPosts` con stato programmato").
- La traccia diventa il **registro delle prove**: quali chiamate sono riuscite, su quali oggetti.
- Quando il modello vuole chiudere, il codice confronta contratto e prove. Se manca qualcosa, il ciclo riprende con il motivo ("hai detto di aver programmato 3 post, ne risulta 1"). Dopo tre riprese il compito passa al modello successivo, con il registro.
- **Rilevatore di promesse senza azione**: la risposta finale dice "ho fatto/programmato/salvato" ma nella traccia non c'è nessuna scrittura? Si rifiuta.
- Successo per oggetto, non per chiamata: una chiamata che va a buon fine su 2 elementi su 5 non è un successo.

**A4. Strumenti che si spiegano da soli.** Due o tre esempi d'uso per ogni strumento (come gli `input_examples` di Anthropic), messi nella descrizione dei soli strumenti che i deboli sbagliano nel banco. Nomi e parametri pensati per chi li usa (la lezione dell'ACI di SWE-agent): meno parametri facoltativi, valori predefiniti sensati, errori che dicono cosa fare.

**A5. Ricette per i compiti frequenti.** "Pianifica la settimana", "fai un carosello dal post X", "rispondi al brief" diventano flussi fissi in codice, dove il modello riempie solo le parti creative (testi, scelte). L'agente libero resta per i modelli forti e per le richieste insolite. Con un modello debole una ricetta batte sempre un agente (è il risultato di Agentless e dei *workflows* di Anthropic).

**A6. Il banco su tutti i modelli.** G6 oggi gira su un solo modello. Serve una matrice modello × compito, rifatta a ogni cambiamento, e i ruoli si assegnano dai numeri: "per il piano editoriale basta Flash; per la regia serve almeno X".

**A7. Il volano dei dati.** Ogni compito riuscito e verificato (A3) è un esempio di addestramento già pulito. Si raccolgono e, una volta arrivati a qualche centinaio, si addestra con LoRA un modello piccolo sul nostro sistema (il piano è in `modelli-deboli.html`). Senza A3 non si sa quali tracce siano buone, quindi A3 viene prima.

## B. Quello che i concorrenti hanno sotto il cofano

| # | Cosa | Chi lo fa | Come lo portiamo da noi |
|---|---|---|---|
| B1 | **DNA del marchio automatico** | Google Pomelli: dal sito (anche dai fogli di stile) ricava logo, colori, font, tono, immagini, poi l'utente corregge | Dato un URL, un profilo Instagram o una cartella Drive, si ricava il profilo del cliente. Risponde a "non posso raccogliere grafiche a mano". Avvertenza di Pomelli: siti vecchi e widget di terzi sporcano i colori, quindi la conferma dell'utente è obbligatoria |
| B2 | **Memoria del marchio applicata a ogni lavoro + controllo di conformità** | Lovart (Contextual Memory), Canva Brand Kit, Adobe GenStudio (punteggio di conformità) | Il profilo B1 entra in ogni regia; la maestra assegna un punteggio di conformità (colori, font, tono) prima della consegna |
| B3 | **Il perché prima del come** | Lovart MCoT: pubblico, obiettivo, vincoli, piano degli elementi, poi agenti specializzati (logo, impaginazione, resa) e scelta del modello per compito | La Regia ha già due chiamate: le si antepone una scheda strategica breve, e ogni elemento va all'agente e al modello giusti (registro G7) |
| B4 | **Testo sempre vivo** | Lovart: il fondo con la diffusione, il testo composto a parte con HarfBuzz (lo dicono loro, non verificato) | È già la nostra strada (motore designer + D1). Regola: mai testo dentro i pixel generati |
| B5 | **Ritocco locale** | Lovart Touch Edit, Canva Magic Layers | Si modifica un elemento senza rigenerare la tavola: serve la tavola a strati (D1) e uno strumento `editElement` |
| B6 | **Gusto che impara dai sì e dai no** | Cursor (Tab addestrato online su accettazioni e rifiuti), DesignPref, PseudoClient | Ogni scelta e ogni scarto nello Studio diventa un evento K2 di preferenza; dopo 5+5 esempi per cliente si ordina con il modello di gusto (fasi Q) |
| B7 | **Proattività** | ChatGPT Pulse, proposte di HubSpot | Un giro notturno legge piano editoriale, analytics e buchi, e al mattino prepara proposte da approvare (giorni scoperti, post che rendono poco, scadenze). Usa le proposte del nucleo |
| B8 | **Indice unico di tutto** | Microsoft Graph, indice semantico | `searchMemory` esiste; va alimentato dagli eventi K2, così trova anche post, tavole, clienti e decisioni, non solo le memorie |
| B9 | **Comporre con i pezzi del marchio** | Figma (First Draft usa il design system) | Gli elementi approvati di un cliente (titoli, bande, impaginazioni riuscite) diventano componenti riusabili dalla Regia, prima di inventare da zero |

## C. Perle da ipotizzare (nessuno le fa bene)

- **Il pubblico simulato.** Dalle analytics social di un cliente si costruisce un giudice che, prima della pubblicazione, stima quale di due varianti renderà di più. Si usa il confronto a coppie, più affidabile del voto assoluto, e si verifica sui post già usciti.
- **Le ragioni delle scelte.** Ogni scelta progettuale si salva con il suo perché ("rosso perché la campagna di primavera…"). Alla richiesta successiva la Regia rilegge le ragioni, non solo i risultati: è quello che un designer con decenni di mestiere ha e un generatore no.
- **Il brief rovesciato.** Si parte dall'obiettivo ("più prenotazioni il martedì") e si risale a contenuto, formato e calendario, invece di partire dalla grafica.

## Ordine proposto

1. Il guscio finisce K3 (in corso).
2. **A1 + A2 + A3 in una sessione** ("anti-pigrizia"). Senza questo, i modelli deboli non usano bene niente del resto.
3. A6, la matrice dei modelli, per misurare A1–A3.
4. B1 + B2 (DNA e memoria del marchio): il salto più visibile per l'utente.
5. B7, la proattività, poi B6, il gusto (a quel punto gli eventi K2 hanno già raccolto preferenze).
6. A5 (ricette), B8, B9 e la sezione C, man mano.

Q0 è bloccato dalla fatturazione: Gemini non ha quota per le immagini e OpenRouter non ha credito, quindi i concorrenti veri e i giudici a pagamento non sono partiti.

## Fonti
- Lovart MCoT e agente: lovart.ai/features/ai-design-agent; lovart.ai/blog/01-pillar-ai-design-technology; abduzeedo.com/lovart-ai-design-agent-automates-your-entire-creative-workflow
- Pomelli: computertech.co/google-pomelli-review; webiano.digital/google-pomelli-turns-brand-colors-into-ai-made-marketing
- Chiusura verificata: arxiv.org/pdf/2608.23623 (Evidence-Carrying Termination); arxiv.org/pdf/2608.02009 (HALT); arxiv.org/pdf/2605.09730 (RubricRefine)
