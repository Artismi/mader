# Stato dei lavori: la mente progettuale di Creative OS

File breve da leggere per primo in una sessione nuova, invece di rileggere conversazioni lunghe.

## Progetti (branch `claude/brave-bohr-3qnohe`)
- `docs/guscio-agente.md`: il guscio dell'assistente (fasi G1–G6).
- `docs/sistema-centrale.md`: il nucleo (azioni uniche, eventi, grafo, profili, proposte, marchio, MCP; fasi K0–K8).
- `docs/salto-di-qualita.md`: i tre gradini di distanza dai concorrenti (fasi Q0–Q6).
- `docs/occhio-del-designer.md`: da bot a designer (decompilatore, archivio dei maestri, concettista, occhio; fasi D1–D6).

## Fatto
- 59439cb: la chat gira nel guscio agente (prompt stabile, promemoria, 7 strumenti nuovi, conferme, compattazione, traccia, 20 test).
- 485baae: registro dei modelli (profili, ordine di scelta, quote) e `runAgent` headless.
- fa3f2bf: id dei modelli ritirati (catalogo dei fornitori, alias, `checkModelIds`).
- 74c85a5: dieta del prompt: stabile da ~12,6k a ~4,4k token, dal vivo da ~90k a ~20,6k per passo.
- 960eb08: G5, la maestra sulle scritture (controlli in `verify`/`after`).
- 13a764d: G6, banco di 20 compiti (gemini-flash-lite-latest 15/19 eseguiti).
- 65b62dc: K1: `src/lib/kernel`, domini task/idea/post/client usati da chat, Server Action, /os e Ctrl+K.
- 3333e02: K2: tabella `events`, storia sul nodo, "Cambiato da ieri" in Oggi, link `origin` unico.
- K3 (commit "feat(kernel): K3 grafo e grounding"): indice dei nodi, `graphSearch`/`graphRelated`/`clientContext`, focus nel contesto dell'agente. **Fermo dopo K3**: K4–K8 da decidere con l'utente; K0 attende il permesso per un secondo modello (Claude, a pagamento).
- A1–A3 di `docs/cosa-manca.md` (eb98aef, 6da0422, 34a64d5): riparazione delle chiamate (`repair.ts`; si cambia modello dopo 2 riparazioni fallite), regia per passo (`steer.ts`: `required` al primo passo delle azioni, fase nel promemoria), chiusura con prove (`evidence.ts`: contratto da `updatePlan`, promesse senza azione, successo per oggetto, 3 riprese). In chat A3 solo in traccia (lo streaming non riprende il giro). Banco flash-lite 15/10: 11/11 eseguiti (prima 9/11 sugli stessi; ora passano piano-liberi e cli-preventivo), 9 fermati dalla quota (misurato con la correzione di `graphRelated` poi committata in b14ec4d). Rilancio del 16/10 su b14ec4d: flash-lite 2/2 eseguiti (18 fermati), flash 0/20 eseguiti, tutti per sovraccarico di Google (503) o quota; nessuno schema rifiutato. Serve un rilancio con quota piena o un secondo fornitore (nessuna chiave OpenRouter in `.env.local`).
- L1 (5d45522, 77f452a, 819a217, 249a71d): profili forte/medio/base nel registro (`livelloOf`, forzabile con `setLivello` o `runAgent({ livello })`); medio guidato per fasi (≤12 strumenti, contesto ~8k); base un passo alla volta (`passo.ts`: ragiona in testo, seconda chiamata minima per il JSON, A1 ripara, A3 chiude); la cascata di `runAgent` parte leggera e sale solo se A3 non chiude; riassunti dei risultati (`summary.ts`, `toModelOutput`); banco con riprova 503/429, ritmo dosato, ripresa dallo stato e `--a-secco`. A secco, token per compito riuscito: base ~1,9k, medio ~8,6k, forte ~13,8k. Da notare: "Fatto!" senza scritture su piano-approva passa A3 (il rilevatore di promesse non lo prende). Banco vero da rilanciare a quota piena. Poi "via di mezzo" (indicazione dell'utente): predefinito medio, base solo per i minuscoli (≤9B, nano) o senza strumenti; riassunti con tetti larghi (vault fino a 2,5k caratteri, piano fino a 40 righe); a secco nessun compito peggiorato.

- V1 (934e959, b995926, 31b1675, bddb686, f3e10b4): valutazione delle tavole a basso costo. Imbuto in codice (`gen/imbuto.ts`: misure gratuite nel critico, scarta solo il chiaramente sbagliato, i dubbi vanno all'occhio), finaliste (≤6) in una griglia numerata e una sola chiamata con visione (`gen/occhio.ts`, `scripts/occhio`), miniature da 512 px (`OCCHIO_LATO`), verdetti ricordati per impronta, conta prima/dopo. A secco: vetrina (caffe e mostra, 2 formati) da ~4,4k a ~180 token per tavola consegnata (25×; 0 al secondo giro); Q0 da ~991k a ~28k token (35×) con giuria su 6 coppie (`--campione`). Mai provato con un modello vero (quote finite). Poi V2: gusto locale con CLIP.

- Critico più severo (1ea1b8d, bcf3cd7, 0a306de, 5d47f39): le note pesano sul voto per gravità (vuoto oltre 40% o invito mancante bloccano), affinità stile/soggetto (`gen/affinita.ts`: niente manga o pixel per il pregio, onomatopee solo con tono giocoso), corpo minimo per il telefono, vetrina con errore su valori ignoti. Vetrina a secco (caffe, mostra, t_menu, palestra, quadrato): medie da 97/96/94/92 a 83/82/82/84, promosse nel vivaio da 30/29/57/19 a 16/15/36/23. Da fare: in 46 tavole su 48 c'è ancora testo sotto il corpo minimo (penalizzato, non ingrandito).
- Corpo minimo alla fonte: `corpoMinimo` passa in `core/scala.ts` e fa da pavimento a `lab`, `para`, `riga1` (opzione `lettura` per voci e testi) e ai nomi delle voci; se il testo non entra il pezzo salta o l'ossatura cede. Tolta la copia locale di `riga1` in gruppo-e. Vetrina a secco (caffe, mostra, t_menu, palestra, quadrato): note «troppo piccolo per il telefono» da 46 a 0.
- AS1–AS2 di `docs/librerie-di-asset.md` (ramo claude/asset-caratteri): catalogo con licenze e crediti per tavola, 333 caratteri (293 misurati con opentype.js, cache locale `npm run asset:caratteri`), abbinamenti a regole, regolatore `sperimentazione`, vivaio a 3 composizioni per identità. Vetrina a secco: coppie nelle prime 12 da 6/7/8/7 a 10/11/11/9 (28 → 41), famiglie da 30 a 54.

## In coda, una cosa alla volta
1. **Guscio e nucleo** (worktree brave-bohr): fatti fino a K3 (vedi sopra). Prossimo: decidere K4–K8 con l'utente; seconda misura del banco con un altro modello.
2. **Q0** (worktree proprio, da `claude/ecstatic-mendel-t4tibq`): confronto cieco automatico. I concorrenti si generano via API (Gemini immagini, GPT Image via OpenRouter, Canva solo se automatizzabile); giudica una giuria di 3 modelli; il giudizio dell'utente è facoltativo.
3. **D1** (worktree proprio, da `claude/ecstatic-mendel-t4tibq`): decompilatore (strati, testo vivo con render-and-compare, verifica di fedeltà) in `designer/decompila/`.

## Regole per contenere i consumi
- Una sessione alla volta, non tre in parallelo.
- Sessioni corte: a fine fase commit, una riga in questo file, poi nuova sessione.
- Leggere i file a pezzi; niente output enormi nei comandi.
- La sessione di dimagrimento del prompt nel repo esterno `Mader` (awesome-lamarr) è un doppione: non usarla.
