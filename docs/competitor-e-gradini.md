# Competitor e algoritmi: i gradini che ci mancano

Ricerca del 17 ottobre 2026. La domanda: come generano le grafiche gli altri, cosa fanno meglio con le loro architetture, e cosa ci manca. La memoria anti-ripetizione tra sessioni è scartata, su indicazione dell'utente.

## Come funzionano

| Sistema | Architettura | Da dove viene la varietà |
|---|---|---|
| **Canva Design Model** (ottobre 2025) e Magic Layers (marzo 2026) | modello proprietario che genera direttamente design modificabili (presentazioni, documenti, post); Magic Layers fa il contrario, da immagine piatta a strati modificabili riconoscendo i componenti. Lo usano anche ChatGPT, Claude e Copilot | **dati**: è addestrato sull'enorme archivio di template fatti da designer veri; i dettagli tecnici non sono pubblici |
| **Adobe Firefly Design Model** (Text to Template in Express) | modello addestrato su **centinaia di migliaia di template di Adobe Express**, genera template modificabili in tutti i formati | dati di designer professionisti |
| **CreatiPoster** (ByteDance, giugno 2025) | 1) un modello multimodale (InternLM2.5) scrive un **programma di design in JSON**: ogni strato con geometria, ritaglio, rotazione, curvatura, maschere, font, colore, spaziatura e ordine; 2) un renderer lo trasforma in strati modificabili; 3) un modello di diffusione (MM-DiT su FLUX, con LoRA) **genera solo lo sfondo, condizionato sugli strati già resi** | dati interni di poster fatti da designer; a giudizio umano batte Canva Magic Design (2,80 contro 2,33), ma Canva resta più forte sull'impaginazione |
| **COLE / OpenCOLE** (Microsoft / CyberAgent) | un LLM trasforma il brief in JSON; la diffusione genera sfondo e oggetti; un modello tipografico decide stile e posizione del testo; **un modello con visione rilegge il risultato e propone correzioni** (riflessione) | OpenCOLE è addestrato su Crello (circa 24.000 design), e per questo generalizza poco |
| **LaDeCo** (dicembre 2024) | prima pianifica gli strati (fondo, immagini, decorazioni, testo), poi genera **strato per strato**, e a ogni passo **guarda l'immagine di ciò che ha già fatto** | il modello impara le relazioni tra strati |
| **PosterO** (CVPR 2025) | l'impaginazione diventa un **albero in SVG**; un LLM genera alberi nuovi **imparando dagli esempi nel prompt**, scelti tra quelli più simili all'intento | **esempi recuperati da un archivio**, senza addestramento |
| **Lovart** | ragionamento prima (pubblico, obiettivo, piano), poi agenti specializzati e scelta del modello; testo composto a parte | modelli di immagine forti, più l'orchestrazione |
| **Sivi** | "Large Design Model" che compone componenti (testo vivo, immagini, vettori) | non dichiarato |
| **Recraft** | stile del marchio imparato da 5 immagini; vettori; palette esatte | modello di immagine con controllo dello stile |

## Cosa fanno meglio di noi

1. **Imparano da design veri, noi da regole scritte a mano.** È il gradino principale. Canva e Adobe partono da milioni o centinaia di migliaia di design fatti da professionisti; noi da circa 50 archetipi scritti in codice. Per questo i nostri archetipi si riconoscono: la varietà non viene dal mondo, viene dalle nostre regole. Il "carattere autoriale" che manca è proprio quello che sta nei dati dei designer.
2. **Il design come programma che un modello scrive.** CreatiPoster e COLE fanno generare a un modello un JSON con tutti gli strati e i loro parametri fini (rotazione, curvatura, maschere, ritagli). Il motore diventa il renderer e il verificatore. Noi abbiamo già la scena in JSON e un renderer: manca il modello che la scrive con libertà, guidato da esempi veri.
3. **Lo strato successivo si decide guardando quelli già fatti.** LaDeCo rende l'immagine parziale e la rimette nel contesto a ogni strato; COLE rilegge la tavola finita e corregge. Noi componiamo tutto alla cieca, con le coordinate, e controlliamo solo alla fine con le misure.
4. **Lo sfondo nasce per il primo piano.** In CreatiPoster lo sfondo viene generato condizionato sugli strati di testo e oggetti: si adatta allo spazio libero, quindi niente sovrapposizioni illeggibili e niente vuoti morti. Noi mettiamo foto e texture e poi cerchiamo di salvare la leggibilità.
5. **Esempi recuperati al posto delle regole (PosterO).** Senza addestrare nulla, un LLM con 5–10 esempi simili presi da un archivio genera impaginazioni nuove e verosimili. È la via più economica per avere varietà "da designer".

Dove siamo già alla pari o avanti: testo sempre vivo e modificabile, misure tipografiche e critico in codice, conformità ai formati, controllo dei costi, funzionamento in locale, decompilatore D1 (che corrisponde a Magic Layers e a CreatiParser).

## I gradini, nell'ordine

**G1. L'archivio di design veri.** Senza dati non si sale. Si costruisce un corpus di impaginazioni reali in forma di scena (strati e parametri):
- design di pubblico dominio e con licenze libere (manifesti storici dei musei, archivi grafici), decompilati con **D1**;
- dataset aperti (Crello/OpenCOLE: la licenza va verificata prima di usarlo);
- i design dell'utente e dei suoi clienti, decompilati;
- le tavole migliori del nostro motore, scelte dall'utente.

Per ogni design: albero degli strati, ruoli, griglia, tipografia, palette, impronta CLIP e tag (settore, tono, epoca, autore).

**G2. Generatore guidato da esempi (alla PosterO / CreatiPoster).** Un nuovo generatore, accanto agli archetipi (non al posto):
- dato il brief, recupera i 5–10 design più vicini dall'archivio;
- un LLM economico scrive una scena nuova nel nostro JSON (strati, geometria, rotazioni, maschere, ordine, font, colori), imitando i principi degli esempi senza copiarli;
- il nostro motore la rende, la corregge (spazi, leggibilità, corpo minimo) e la giudica.

La varietà ora viene da design veri, non dalle nostre regole; il motore resta garante della qualità. Costo: una chiamata testuale per proposta, oppure poche chiamate per un vivaio.

**G3. Composizione strato per strato con lo sguardo (alla LaDeCo).** Per le proposte finaliste: il modello aggiunge uno strato alla volta guardando una miniatura di quanto già fatto. Si usano miniature e il profilo medio, per tenere bassi i costi (V1 della valutazione).

**G4. Riflessione (alla COLE).** Sulle finaliste, una sola chiamata con visione indica i difetti e le correzioni in forma di modifiche al JSON (sposta, ingrandisci, togli), e il motore le applica. Abbiamo già quasi tutto (occhio e correzione localizzata): manca solo la restituzione come modifiche alla scena.

**G5. Sfondo generato per il primo piano (alla CreatiPoster).** Facoltativo e a pagamento: quando serve un'immagine e non c'è una foto adatta, si genera lo sfondo condizionato sulla maschera degli strati (spazio libero, colori, umore). Leggibilità e vuoti si risolvono per costruzione.

**G6. Gusto dai dati.** Le preferenze dell'utente (scelte e scarti) e l'archivio G1 addestrano un modello di gusto locale (CLIP + classificatore, V2), che ordina le proposte.

## Cosa cambia nel piano

- Il **blocco B** perde la memoria anti-ripetizione. Restano la migrazione ai mattoni (che diventano anche il vocabolario del JSON di G2) e la diversità garantita.
- **G1 + G2 sono il salto principale**, e vanno prima del blocco B: senza esempi veri, sciogliere gli archetipi in mattoni produce ancora combinazioni di regole nostre.
- G2 richiede chiamate testuali: in vetrina, una versione simulata con esempi registrati; dal vivo, quando ci sarà credito.

## Fonti
- Canva Design Model e Magic Layers: businesswire.com/news/home/20260311951174
- Adobe Firefly Design Model: news.adobe.com (rilascio dei modelli Firefly, ottobre 2023)
- CreatiPoster: arxiv.org/abs/2506.10890
- CreatiParser: arxiv.org/html/2604.19632
- LaDeCo: arxiv.org/abs/2412.19712
- PosterO: arxiv.org/abs/2505.07843
- COLE e OpenCOLE, Sivi: sivi.ai/blog/text-to-design-models-for-layered-editable-graphic-designs
- Recraft: recraft.ai/docs/intro/what-is-recraft
