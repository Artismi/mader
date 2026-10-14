# Banco di confronto (fase Q0)

Misura quanto le grafiche di Creative OS reggono il confronto con quelle dei concorrenti, sugli stessi 20 brief, **senza sapere chi ha fatto cosa**. È la fase Q0 di `docs/salto-di-qualita.md`: senza questo numero non si sa se le fasi successive fanno salire la qualità. Va rifatto a ogni fase.

Tutto è automatico: le tavole di Creative OS, quelle dei concorrenti e il giudizio della giuria di modelli. Il tuo giudizio è facoltativo e breve (10 coppie) e serve a controllare che la giuria la pensi come te.

## In quattro comandi

```bash
cd scripts/designer && npm install && cd ../..   # la prima volta (esbuild, fabric, playwright-core)
npm run confronto:genera          # 20 tavole di Creative OS → out/creative-os/
npm run confronto:concorrenti     # le grafiche dei concorrenti → out/google/, out/chatgpt/…
npm run confronto:giuria          # 3 modelli con visione giudicano ogni coppia → giuria.jsonl
npm run confronto:rapporto        # percentuali di vittoria → rapporto.md
```

Facoltativo, dopo la giuria:

```bash
npm run confronto:giudica         # 10 coppie nel browser, http://127.0.0.1:4317
npm run confronto:rapporto        # ora con l'accordo tra te e la giuria
```

## I brief

`brief.json`: 20 brief da freelance (caffè, ceramica, techno, app, beauty, conferenza, ristorante, mostra, saldi, citazione, consigli, lancio di gioielli, dischi, viaggio, ludoteca, opening, palestra, menu, numeri di un festival, saldi di una boutique), in cinque famiglie (prodotto, evento, servizio, promozione, contenuto) e tre formati (1:1, 4:5, 9:16). Ogni brief ha cliente, testo del brief, fatti e, se serve, la foto di prova di `scripts/designer/fixtures/`. Il nome di ogni file di tavola è l'id del brief (`01-caffe.png`).

## Creative OS

`npm run confronto:genera` usa il motore designer così com'è (`src/components/studio/designer`, non lo modifica): vivaio di candidate, critico, e si tiene la prima per voto, come la prima proposta dello Studio. I PNG sono a piena risoluzione (1080 di base) e `out/creative-os/tavole.json` dice sistema, stile e voto di ciascuna.

- Di base usa i contenuti già compilati dei contenuti di prova.
- `-- --regia`: testi e direzioni li scrive la regia dell'IA (analista, copywriter, direttore). Serve l'app avviata (`npm run dev`) perché la regia gira lato server con le chiavi dell'app; le risposte restano in `out/creative-os/regia/` e non si richiedono. I brief di tipo consigli, menu e numeri restano compilati.
- `-- --solo 01-caffe,03-techno` per rifarne solo alcuni; `-- --finto` crea anche `out/prova-finta/`, un concorrente finto (titolo centrato su fondo pieno) per provare il banco.

## I concorrenti

`npm run confronto:concorrenti` dà a ciascuno **lo stesso prompt**: il brief completo, testi compresi, nel formato giusto, come lo scriveresti nella chat del servizio, con la foto del brief allegata. Ogni tavola ha accanto `<id>.json` con modello, prompt e data. Ogni generatore parte solo se c'è la chiave:

| cartella | concorrente | cosa serve | modello |
|---|---|---|---|
| `google` | Google / Nano Banana | `GEMINI_API_KEY` in `.env.local` **con fatturazione attiva**: i modelli d'immagine Gemini non hanno quota gratuita | il più recente nell'elenco dei modelli dell'API |
| `chatgpt` | ChatGPT / GPT Image | OpenRouter collegato nell'app **con credito**, oppure `OPENAI_API_KEY` | il GPT Image più recente su OpenRouter (o sull'API di OpenAI) |
| `canva` | Canva | — | non disponibile: Canva Connect API non genera grafiche da un brief e il server MCP di Canva vuole il collegamento interattivo dell'utente |

Se un generatore non riesce a fare nemmeno una tavola (chiave assente, quota o credito finiti), `out/<concorrente>/concorrente.json` lo segna "non disponibile" con il motivo e il rapporto lo dice, senza bloccare il resto. Per forzare un modello: `CONFRONTO_MODELLO_GOOGLE=…` o `CONFRONTO_MODELLO_CHATGPT=…`. Le tavole già fatte non si rifanno (`-- --rifai` per rigenerarle).

Un concorrente in più si aggiunge mettendo una cartella `out/<nome>/` con i PNG (o JPG/WebP) chiamati come l'id del brief: banco, giuria e rapporto la trovano da soli.

## La giuria (misura principale)

`npm run confronto:giuria` fa giudicare ogni coppia (Creative OS contro un concorrente, stesso brief) a 3 modelli con visione, **due volte a posizioni scambiate**, con tre domande chiuse:

1. quale si legge prima, guardata di sfuggita su un telefono;
2. quale ha un protagonista chiaro;
3. quale sembra fatta da un designer esperto.

Una domanda conta solo se il modello dà la stessa risposta nei due ordini (altrimenti ha deciso il posto, non la tavola, e vale pari). Il verdetto del modello è la maggioranza sulle tre domande, quello della giuria la maggioranza dei modelli.

I giurati si scelgono da soli, uno per famiglia se si può: il Gemini con visione più recente (`GEMINI_API_KEY`), poi Claude e GPT su OpenRouter, poi i modelli con visione gratuiti di OpenRouter (Gemma, Inkling) e altri Gemini. Ogni candidato si prova con una chiamata minima e si tiene solo se risponde. Per sceglierli a mano: `CONFRONTO_GIURIA=gemini:gemini-3.8-flash,openrouter:anthropic/claude-sonnet-5.5,openrouter:openai/gpt-6.1-sol`. Si riprende da dove si era rimasti; `-- --max 4` per una prova veloce.

Attenzione: un giurato di Google che giudica le tavole di Nano Banana, o uno di OpenAI con quelle di GPT Image, può essere di parte. Con giurati di tre famiglie diverse la maggioranza lo limita; l'accordo con te dice se ci si può fidare.

## Il tuo giudizio (facoltativo)

`npm run confronto:giudica` e apri http://127.0.0.1:4317. Vedi **10 coppie, quelle su cui la giuria è più incerta**, due tavole per volta, in ordine casuale, senza nomi. Sopra c'è il brief. Chiediti quale useresti per il cliente.

- **←** sinistra, **→** destra, **↓** o **spazio** pari (oppure i pulsanti).
- I giudizi vanno in `giudizi.jsonl`. Puoi chiudere e riprendere: le coppie già giudicate non tornano.
- `-- --n 20` per più coppie, `-- --tutte` per giudicarle tutte.

## Il rapporto

`npm run confronto:rapporto` scrive `rapporto.md` (e `rapporto.json`):

- quali concorrenti ci sono e quali no, e perché;
- **vittorie** di Creative OS contro ciascun concorrente, in tutto e per famiglia di brief, dalla giuria (le pari contano come non vinte; il **punteggio** le conta mezza vittoria);
- le stesse percentuali dai tuoi giudizi, se ci sono (sono sulle coppie più incerte, quindi non rappresentative: servono per l'accordo);
- l'**accordo** tra giuria e te. Obiettivo di Q2: almeno 7 su 10. Obiettivo del banco: più del 60% di vittorie contro il concorrente più forte.

Funziona anche senza i tuoi giudizi.

## File

| file | cosa |
|---|---|
| `brief.json` | i 20 brief |
| `genera.mjs`, `entry.ts` | tavole di Creative OS (Playwright + motore vero) |
| `concorrenti.mjs`, `ia.mjs` | generatori dei concorrenti e chiamate ai servizi |
| `giuria.mjs` | giuria di modelli |
| `giudica.mjs` | pagina di giudizio cieco (server locale minimo) |
| `rapporto.mjs` | rapporto |
| `lib.mjs`, `lib.test.mjs` | aggregazione e test (`npm run confronto:test`) |
| `chiavi.mjs` | chiavi lette solo in Node: `.env.local` e il collegamento OpenRouter dell'app |

Le tavole, i giudizi e i rapporti restano in locale (`.gitignore`). Per conservare la misura di una fase, copia `rapporto.md` in `docs/`. Prima di una misura vera cancella `out/prova-finta/` e le righe di prova da `giuria.jsonl` e `giudizi.jsonl`.
