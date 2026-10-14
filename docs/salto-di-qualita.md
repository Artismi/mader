# Il salto di qualità: i tre gradini che ci separano dai migliori

`docs/sistema-centrale.md` descrive l'**impianto**: azioni, eventi, grafo, agenti. È necessario, ma non basta. L'utente non vede l'impianto: vede **la grafica, il testo, il piano**. Oggi su questi risultati siamo tre gradini sotto Canva, Google Pomelli, ChatGPT con le immagini e Adobe GenStudio.

Questo documento dice quali sono i tre gradini, cosa fanno gli altri su ciascuno e come superarli. Ogni affermazione sugli altri ha la sua fonte in fondo.

---

## 0. Come sapremo di averli superati: il confronto cieco

Senza una misura non c'è salto. Prima di tutto si costruisce il **banco di confronto**.

- **20 brief veri** dell'utente (caffè, evento, saldi, lancio, citazione, carosello di consigli…), con formato e cliente.
- **Concorrenti**: Canva (Magic Design / Canva AI), ChatGPT con generazione di immagini, Google Pomelli dove disponibile, e Creative OS. Gli output dei concorrenti si raccolgono a mano una volta, perché non tutti hanno un'API.
- **Giudizio cieco a coppie**: le tavole vengono mostrate a due a due senza dire chi le ha fatte. Giudicano l'utente (sempre) e una giuria di 3 modelli con visione (vedi §2), con posizioni scambiate per annullare il bias di posizione.
- **Misura**: *percentuale di vittorie* di Creative OS contro ciascun concorrente, per famiglia di brief.
- **Obiettivo**: più del 60% di vittorie contro il migliore concorrente, sui giudizi dell'utente.

Il banco va rifatto a ogni fase. È l'unico numero che dice se stiamo salendo.

---

## Gradino 1 · La materia prima

**Cosa fanno gli altri.**
- **Modelli d'immagine che compongono tutto.** Nel 2026 i migliori modelli d'immagine scrivono testo leggibile e impaginano poster interi. Nei confronti pratici GPT Image 2 ha fatto giusto ogni blocco di testo di una confezione e ha seguito meglio di tutti un poster in stile svizzero; Nano Banana Pro è il più forte sul fotorealismo. Il testo esatto è considerato quasi risolto: le differenze restano nell'impaginazione e nel rispetto delle istruzioni.
- **Il lavoro di designer veri come base.** Canva parte da milioni di modelli disegnati da persone e il suo Design Model ha prodotto oltre 12 milioni di grafiche dentro ChatGPT, Claude e Copilot.
- **Immagine piatta → livelli modificabili.** Canva Magic Layers (marzo 2026) scompone un'immagine generata in livelli: il testo torna testo vivo, oggetti e persone diventano livelli separati, i buchi lasciati sotto vengono ricostruiti.
- **Il marchio estratto da solo.** Google Pomelli legge il sito del cliente e ne ricava la "Business DNA" (tono, palette, caratteri, stile visivo). Da lì propone campagne e crea materiali modificabili.

**Dove siamo noi.** Un motore procedurale ottimo per testo, misure e controlli, ma con materia povera: foto di stock o Pollinations, nessuna illustrazione, nessun modello d'autore ancora in uso. E il marchio è testo libero nel vault.

**Come superarli: il metodo ibrido.** È la nostra carta migliore. Gli altri hanno o l'immagine bella ma piatta (modelli d'immagine) o il modello modificabile ma generico (template). Noi possiamo avere entrambi:
1. **Immagine generata solo dove serve**: soggetto, sfondo, illustrazione, materiale. Si usa il miglior modello d'immagine disponibile con le chiavi dell'utente (GPT Image, Gemini/Nano Banana, Ideogram via OpenRouter) e il prompt lo scrive la Regia dal concetto, non dal brief grezzo. **Nessun testo dentro l'immagine**: il testo lo fa il motore, sempre vero, sempre modificabile, sempre misurato.
2. **Scomposizione** di qualunque immagine (generata, del cliente o di riferimento) in livelli: scontorno U²-Net già presente, più rilevamento del testo per i riferimenti. Ne nasce il gemello di Magic Layers, ma dentro il nostro motore e con la maestra.
3. **Modelli d'autore** (già nel progetto del motore designer): le tavole disegnate dall'utente diventano modelli con slot e regole. Sono il gusto umano che il procedurale non ha.
4. **DNA del cliente**: dal sito, dal profilo Instagram e dai file del cliente si estrae il marchio (palette, caratteri, tono, soggetti, ritmi). Diventa l'oggetto `brand` del sistema centrale (K6) e il vincolo di ogni grafica e testo.

---

## Gradino 2 · Il giudizio e la scelta

**Cosa fanno gli altri e cosa dice la ricerca.**
- I sistemi di poster più avanzati lavorano a **cicli disegna → guarda → correggi**. PosterCraft rifinisce con un feedback multimodale strutturato. PosterAgent (ICML 2026) addestra con il rinforzo proprio le due fasi, bozza e rifinitura. PosterGen valuta con una griglia che misura equilibrio, leggibilità e coerenza.
- **I modelli con visione non giudicano ancora come un designer.** Il benchmark AesEval (ICLR 2026) trova un divario netto rispetto al giudizio umano. AesthetiQ (Adobe, CVPR 2025) arriva al 78,8% di accordo con le preferenze umane, ma su un pannello di soli 22 volontari.
- **Il confronto a coppie è più stabile del voto assoluto**, ma più facile da ingannare: con elementi di disturbo le preferenze a coppie si ribaltano nel 35% dei casi, i voti assoluti nel 9%. La pratica consigliata: voti assoluti per scartare, coppie per la scelta finale, posizioni scambiate.
- Adobe GenStudio assegna a ogni contenuto un **punteggio di conformità al marchio** prima della pubblicazione (tono, stile, caratteri non ammessi).

**Dove siamo noi.** Un vivaio di candidate, un critico e la maestra (contrasti, bordi, sovrapposizioni). Il critico però è un solo modello che dà voti assoluti, e non c'è un ciclo di correzione mirata sulla tavola scelta.

**Come superarli: giudizio a tre livelli più correzione.**
1. **Codice (la maestra)**: tutto ciò che si misura si misura, cioè leggibilità sui pixel veri, griglia, gerarchia, margini, contrasti, conformità al marchio (palette, caratteri). È il filtro duro e non sbaglia.
2. **Giuria con visione, a coppie**: le candidate sopravvissute si confrontano a coppie, in torneo, con 3 modelli diversi e posizioni scambiate. Le domande sono chiuse ("quale ha un protagonista più chiaro?", "quale si legge prima a un metro?"), non "quale è più bella".
3. **Il gusto dell'utente** (gradino 3) pesa la scelta finale.
4. **Correzione mirata**: sulla vincitrice il critico indica difetti da un vocabolario chiuso (il `regolatore()`, `scheletro()`, `enfasi()` del motore). Il motore applica e ricontrolla per al massimo due giri. Lo stesso ciclo vale per i testi: copywriter → maestra → giuria a coppie sui titoli.
5. **Accordo misurato**: la giuria si tiene solo se concorda con le scelte dell'utente nel banco di confronto. Altrimenti si cambiano modelli e domande.

---

## Gradino 3 · L'apprendimento

**Cosa fanno gli altri e cosa dice la ricerca.**
- **Il gusto si impara da poche scelte.** PseudoClient impara lo stile grafico di una persona con il 79,4% di accuratezza da soli 5 esempi positivi e 5 negativi. DesignPref (12.000 confronti di 20 designer professionisti) mostra che le persone guardano **le stesse dimensioni** (tema, complessità dell'impaginazione…) ma con **valori e pesi diversi**. Il seguito del 2026 personalizza le interfacce generate dopo un'introduzione di 2–3 minuti.
- **I dati dei post tornano nel piano.** Later suggerisce gli orari dalla storia del singolo account, per piattaforma e tipo di contenuto. L'API di Instagram fornisce per ogni post copertura, visualizzazioni, salvataggi, condivisioni e interazioni totali (serve la revisione dell'app da parte di Meta).
- HubSpot misura quanto è **completo il contesto** di ogni cliente e mostra i buchi.

**Dove siamo noi.** Ogni generazione parte da zero. Le scelte dell'utente (tavola tenuta, scartata, modificata) non vengono registrate. Le metriche social esistono in `post_analytics`, ma non tornano né nel piano né nello Studio.

**Come superarli: tre cicli che imparano.**
1. **Modello del gusto** per utente e per cliente. Ogni tavola ha una firma: scheletro, trattamento del titolo, trattamento foto, modalità colore, famiglia e regolatori. Ogni scelta (tenuta, scartata, modificata, e cosa è stato modificato) aggiorna dei pesi su quelle dimensioni, con un modello a coppie di tipo Bradley-Terry: semplice, spiegabile, robusto con pochi dati. Il vivaio genera più vicino ai gusti appresi e la scelta finale li usa. All'inizio basta un'introduzione di 2 minuti: 10 coppie di tavole, "quale preferisci?".
2. **Ciclo della resa**: le metriche di ogni post pubblicato (salvataggi e condivisioni pesano più dei like) tornano sul post del piano e sulla sua firma (formato, hook, famiglia grafica, orario). Il profilo Editoriale propone formati, orari e tipi di hook che **per quel cliente** hanno reso meglio, e dice perché ("i caroselli con numero in copertina hanno avuto 2,3 volte i salvataggi").
3. **Ciclo dei modelli**: le tracce `ai_calls` (rapporto sui modelli piccoli) ordinano le cascate con i dati. Col tempo diventano il dataset per addestrare un modello piccolo sul copywriter.

Nessuno dei concorrenti chiude tutti e tre i cicli **per il singolo freelance e per ciascuno dei suoi clienti, in locale**. È lì che si va sopra.

---

## Come cambia il piano

Le fasi K del sistema centrale restano l'impianto. Le fasi Q portano la qualità. Si alternano, e ogni Q si misura con il banco di confronto.

| Fase | Contenuto | Dipende da | Fatto quando |
|---|---|---|---|
| **Q0 Banco di confronto** | 20 brief, raccolta output dei concorrenti, interfaccia di giudizio cieco a coppie, giuria di modelli, rapporto delle vittorie | — | Abbiamo la percentuale di vittorie attuale contro Canva e ChatGPT |
| K0–K3 | impianto (in corso nella sessione del guscio) | — | vedi sistema-centrale.md |
| **Q1 Materia** | Immagini generate per soggetto, sfondo e materiale dentro il motore (senza testo nell'immagine); scomposizione in livelli; registro dei modelli d'immagine con le chiavi dell'utente | registro modelli (K0) | Le tavole con immagine generata vincono più spesso di quelle con foto di stock |
| **Q2 Giudizio** | Giuria a coppie in torneo, domande chiuse, correzione mirata a due giri, accordo misurato con l'utente | Q0 | La giuria concorda con l'utente in almeno 7 casi su 10 |
| **Q3 DNA e marchio** | Estrazione del marchio da sito, Instagram e file; oggetto `brand`; vincoli nel motore e nel copywriter; punteggio di conformità | K6 | Una grafica per X è riconoscibile come di X senza indicazioni nel prompt |
| **Q4 Gusto** | Firma delle tavole, registro delle scelte, modello a coppie per utente e cliente, introduzione di 10 coppie | Q2, K2 (eventi) | Dopo 30 scelte la prima proposta è quella tenuta più spesso (misurato) |
| **Q5 Resa** | Metriche Instagram per post → firma → raccomandazioni del profilo Editoriale con il perché | K4, connettore Meta | Il piano del mese cita dati del cliente per ogni scelta di formato e orario |
| **Q6 Modelli d'autore** | "Salva come modello" dallo Studio e adattatore (testo, foto, palette, specchiature) | motore designer | Il 30% delle proposte nasce da modelli d'autore e vince più spesso |

**Ordine consigliato**: Q0 subito (senza misura si lavora alla cieca), poi Q2 e Q1 in parallelo al lavoro sull'impianto. Q3–Q5 vengono dopo K2–K4.

**Attenzione a chi tocca cosa**: il motore designer (`src/components/studio/designer`) è in lavorazione sul branch `claude/ecstatic-mendel-t4tibq` (archetipi, critico, vivaio). Q1, Q2 e Q6 vanno fatte lì o coordinate con quel lavoro, non sul branch del guscio.

---

## Fonti

- Immagini e testo: confronti pratici 2026 riassunti in [aireiter.com](https://aireiter.com/blog/best-ai-image-model-text-rendering-2026) e [krumzi.com](https://www.krumzi.com/blog/ai-image-generation-models). Sono fonti non indipendenti: da verificare con prove nostre.
- Canva: [Magic Layers](https://petapixel.com/2026/03/11/canvas-new-ai-tool-turns-flat-images-into-editable-layers), [Brand Kit in ChatGPT e Claude](https://itbrief.com.au/story/canva-brings-brand-safe-design-generation-into-chatgpt), [comunicato](https://www.businesswire.com/news/home/20260205384226/en).
- Google: [Pomelli](https://blog.google/innovation-and-ai/models-and-research/google-labs/pomelli/).
- Adobe: [GenStudio, conformità al marchio](https://business.adobe.com/products/genstudio/performance-marketing/brand-compliance.html).
- Poster agentici: [PosterCraft](https://arxiv.org/abs/2506.10741), [PosterGen](https://arxiv.org/abs/2508.17188), [PosterAgent ICML 2026](https://icml.cc/virtual/2026/poster/62650), [COLE](https://arxiv.org/abs/2311.16974), [OpenCOLE](https://arxiv.org/html/2406.08232v1).
- Giudizio: [AesEval, ICLR 2026](https://iclr.cc/virtual/2026/poster/10009602), [AesthetiQ, CVPR 2025](https://openaccess.thecvf.com/content/CVPR2025/supplemental/Patnaik_AesthetiQ_Enhancing_Graphic_CVPR_2025_supplemental.pdf), [coppie o punti](https://arxiv.org/pdf/2504.14716v2).
- Gusto: [PseudoClient](https://arxiv.org/abs/2105.14457), [personalizzazione delle interfacce generate](https://arxiv.org/pdf/2604.09876).
- Social: [Later, AI e orari](https://later.com/blog/ai-social-media-management/), metriche Instagram ([Phyllo](https://www.getphyllo.com/post/how-to-use-the-instagram-graph-api-for-influencer-analytics-a-walkthrough); da verificare sulla documentazione di Meta).
- Sistemi centrali: Microsoft 365 Copilot, HubSpot Breeze, Notion 3.0 (vedi sistema-centrale.md).
