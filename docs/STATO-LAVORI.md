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

## In coda, una cosa alla volta
1. **Guscio e nucleo** (worktree brave-bohr): fatti fino a K3 (vedi sopra). Prossimo: decidere K4–K8 con l'utente; seconda misura del banco con un altro modello.
2. **Q0** (worktree proprio, da `claude/ecstatic-mendel-t4tibq`): confronto cieco automatico. I concorrenti si generano via API (Gemini immagini, GPT Image via OpenRouter, Canva solo se automatizzabile); giudica una giuria di 3 modelli; il giudizio dell'utente è facoltativo.
3. **D1** (worktree proprio, da `claude/ecstatic-mendel-t4tibq`): decompilatore (strati, testo vivo con render-and-compare, verifica di fedeltà) in `designer/decompila/`.

## Regole per contenere i consumi
- Una sessione alla volta, non tre in parallelo.
- Sessioni corte: a fine fase commit, una riga in questo file, poi nuova sessione.
- Leggere i file a pezzi; niente output enormi nei comandi.
- La sessione di dimagrimento del prompt nel repo esterno `Mader` (awesome-lamarr) è un doppione: non usarla.
