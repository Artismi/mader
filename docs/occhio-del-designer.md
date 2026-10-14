# Da bot a designer: decompilare il mestiere

Richiesta dell'utente: risultati come quelli di **un designer con decenni di esperienza**, non di un bot. E andare oltre i sistemi di Canva, Google e Adobe.

`docs/salto-di-qualita.md` ha individuato tre gradini: materia, giudizio, apprendimento. Questo documento scende sotto la superficie: **cosa ha in testa un designer esperto** e come lo si costruisce, pezzo per pezzo, in un sistema.

---

## 1. Cosa distingue un designer esperto da un bot

| Il designer esperto | Il bot (e oggi anche noi) |
|---|---|
| Parte da un'**idea** che lega contenuto e forma ("progettare il vuoto" → tavola quasi vuota, testo minuscolo in un angolo) | Parte dalla forma: sceglie uno stile e lo riempie |
| Ha in memoria **migliaia di lavori riusciti**: sa perché funzionano e li ricombina senza copiarli | Ha una manciata di schemi scritti a mano, o un modello d'immagine che fa la media di tutto |
| Lavora su **pochi elementi decisi** e su rapporti precisi (scala, vuoto, tensione ai bordi) | Riempie: più elementi, più effetti |
| **Fa trenta schizzi e ne butta ventisette**, poi rifinisce i tre migliori per giorni | Genera, controlla che non ci siano errori, consegna |
| Ha un **occhio critico** allenato: vede subito il titolo un po' troppo grande, la riga vedova, l'asse che non torna | Al massimo controlla contrasti e sovrapposizioni |
| Conosce il **cliente**: marchio, storia, cosa ha funzionato, cosa odia | Riparte da zero ogni volta |

Il sistema deve avere tutte e sei le cose. Per quattro abbiamo già una base (motore, maestra, vivaio, critico). Mancano davvero due capacità: **la memoria dei maestri** e **l'idea**. Il pezzo tecnico che le sblocca è il decompilatore.

---

## 2. Il decompilatore: oltre i livelli

### 2.1 Cosa fanno gli altri

- **Canva Magic Layers** (marzo 2026): da un'immagine piatta ricava i livelli. Il testo torna testo vivo, oggetti e persone diventano livelli separati, i buchi vengono ricostruiti. Il risultato è un documento modificabile.
- **LayerD** (CyberAgent, ICCV 2025, codice pubblico): estrae uno alla volta i livelli in primo piano non coperti da altri e li rifinisce sfruttando il fatto che nella grafica i livelli hanno spesso colore uniforme. Limiti dichiarati: il testo piccolo e la granularità ambigua dei livelli.
- **Qwen-Image-Layered** (Alibaba, dicembre 2025, codice pubblico): un modello di diffusione che scompone in un solo passaggio un'immagine in un numero variabile di livelli RGBA, addestrato su file PSD reali.

Tutti e tre restituiscono **livelli morti**: pezzi separati, ma senza sapere *perché* stanno lì. Se allarghi il formato, i pezzi non sanno come ridisporsi. Se cambi il titolo, niente ricalcola la scala.

### 2.2 Cosa facciamo noi: dall'immagine al progetto

Il nostro decompilatore non si ferma ai livelli: ricostruisce **l'intenzione progettuale**, nella grammatica del motore designer (`docs/motore-designer-progetto.md`). Da un'immagine ricava:

| Livello di lettura | Cosa ricava | Come |
|---|---|---|
| 1. Strati | sfondo, soggetto, forme, testi come livelli separati | scontorno U²-Net già presente (`compose/cutout.ts`); regioni di colore uniforme (l'idea di LayerD); per i casi difficili LayerD o Qwen-Image-Layered su GPU a noleggio o via API |
| 2. Testo vivo | parole, carattere, corpo, interlinea, spaziatura, colore | posizione e testo con un modello con visione (domande chiuse e riquadri), poi **render-and-compare**: si rende ogni carattere candidato (i font dell'utente, i caratteri del motore, Google Fonts) e si sceglie quello con la differenza minima di pixel; corpo, interlinea e spaziatura si ottimizzano allo stesso modo |
| 3. Ruoli | titolo, occhiello, testo, dettagli, invito, marchio, numero | geometria (il più grande è il protagonista), posizione e una domanda chiusa al modello con visione |
| 4. Misure | griglia di colonne, griglia di base, margini, rapporto della scala dei corpi, scala delle distanze | raggruppamento dei bordi allineati (colonne e assi), divisori comuni delle posizioni verticali (base), rapporti tra i corpi (1,25 / 1,333 / 1,5 / φ / 2) |
| 5. Grammatica | scheletro (tra i 17), trattamento del titolo, trattamento della foto, dispositivi, finiture, modalità colore, palette con i ruoli 60/30/10 | classificazione sulle voci del motore: codice dove si può misurare, modello con visione con menu chiuso per il resto |
| 6. Verifica | quanto la ricostruzione è fedele | si rende la scena ricostruita, si confronta con l'originale (differenza di pixel, testo identico) e si correggono i parametri finché la differenza scende sotto una soglia. La fedeltà è il voto della maestra |

Il risultato non è un PSD: è **una scena del motore con le sue regole**. I regolatori funzionano, il cambio di formato rispetta griglia e scala, il marchio si sostituisce, le varianti nascono dalla stessa grammatica. Canva ti restituisce i pezzi; noi ti restituiamo il progetto.

### 2.3 Quattro usi, uno più importante degli altri

1. **La memoria dei maestri** (il più importante, §3).
2. **"Fammi qualcosa così"**: l'utente incolla un riferimento e ottiene un modello d'autore con la stessa *struttura*, non la stessa grafica.
3. **Il DNA del cliente**: i materiali vecchi del cliente (post, volantini, sito) decompilati danno palette, caratteri, scale e scheletri ricorrenti. È l'oggetto `brand` del sistema centrale, ricavato dai fatti e non dalle dichiarazioni.
4. **Immagini generate e output dei concorrenti** resi modificabili, compresi quelli del banco Q0.

Per le grafiche che facciamo noi la scomposizione non serve: nascono già a livelli dal motore. È il vantaggio del metodo ibrido.

---

## 3. La memoria dei maestri

Un designer con trent'anni di mestiere ha visto e studiato migliaia di lavori. È lì che sta "l'esperienza": nella **statistica interiorizzata** di ciò che funziona. La costruiamo in modo esplicito e spiegabile.

### 3.1 L'archivio

- **Raccolta**: un archivio curato di lavori eccellenti per genere (manifesti, editoriale, social di marchi forti, identità) e per scuola (svizzera, scuola polacca del manifesto, costruttivismo, Bauhaus, editoriale contemporaneo, zine, lusso, tipografia sperimentale). Le fonti devono essere lecite: opere in pubblico dominio, collezioni museali con licenze aperte, lavori dell'utente e materiali su cui l'utente ha diritti, o riferimenti consultati e trasformati in sola struttura senza conservarne l'immagine.
- **Decompilazione**: ogni lavoro diventa una scheda di grammatica (scheletro, rapporti, scala, griglia, trattamenti, palette con i ruoli, densità, tensioni ai bordi, numero di elementi). L'immagine non serve più: resta la struttura.
- **Statistiche per famiglia**: non "copia questo manifesto", ma "nei manifesti svizzeri riusciti il titolo occupa dal 30 al 45% dell'area, la scala è 1,5–2, gli assi sono al massimo due, il vuoto è il 40%…". Queste distribuzioni sostituiscono i numeri scritti a mano nel motore e le probabilità delle famiglie (§6.6 e §6.7 del progetto del motore).

### 3.2 Perché è meglio di quello che fanno gli altri

- Un modello d'immagine ha visto tutto, ma **fa la media**: per questo i risultati sembrano tutti "da IA". Le nostre distribuzioni sono **per scuola e per genere** e il direttore creativo sceglie consapevolmente da quale tradizione partire.
- I template di Canva sono belli ma **fissi**. Le nostre schede sono **regole generative**: lo stesso equilibrio di un maestro, applicato a contenuti nuovi, in formati nuovi.
- Tutto resta **spiegabile**: "ho usato un asse costruttivista con titolo a 45°, scala 2, come nei manifesti degli anni '20". È il modo in cui parla un designer, e l'utente può correggerlo.

### 3.3 Proprietà intellettuale

Si impara la struttura (griglie, proporzioni, rapporti, scelte di trattamento), che non è proteggibile in quanto tale. Non si riproducono opere, loghi, illustrazioni o fotografie di altri. Ogni uscita è originale: contenuti, caratteri e immagini sono quelli dell'utente o generati. L'archivio conserva le schede di grammatica, non le immagini di terzi.

---

## 4. L'idea prima della forma

### 4.1 Il concetto

Prima di ogni composizione, un ruolo nuovo, il **concettista**, propone 5 idee che legano il messaggio a una scelta visiva. Ogni idea è fatta di:
- una **frase di concetto** ("il caffè come notte: tutto scuro, una sola luce calda sul titolo");
- una **figura retorica visiva** da un elenco chiuso: metafora, contrasto, ripetizione e rottura, scala esagerata, vuoto, taglio, gioco di parole visivo, sineddoche (la parte per il tutto), sequenza, inversione;
- le **conseguenze sulla grammatica**: scheletro, regolatori, trattamenti, palette;
- **perché funziona per questo pubblico**.

La maestra scarta le idee generiche ("immagine del prodotto con titolo"), quelle che non usano il contenuto vero e quelle che sono variazioni l'una dell'altra. Il direttore creativo sceglie poi le direzioni **dentro** le idee, non dal menu nudo.

### 4.2 Perché è il salto più grande

Dalla revisione del motore (§16 di motore-designer-progetto.md): "Un grafico parte da un'idea che lega contenuto e forma. Il motore ha solo forma: anche curato, sembra generico." Nessuno dei concorrenti oggi espone un passo di ideazione con figure retoriche esplicite e conseguenze sulla composizione. È qui che si passa da "ben fatto" a "da designer".

---

## 5. L'occhio: la critica da direttore artistico

Il giudizio a tre livelli di salto-di-qualita.md (codice, giuria a coppie, gusto) si completa con **la griglia del direttore artistico**. Le domande sono chiuse e una per volta, perché i modelli con visione giudicano male le domande aperte (AesEval, ICLR 2026):
1. Cosa si vede per primo? È la cosa giusta?
2. Si capisce l'idea senza leggere il testo piccolo?
3. C'è un solo protagonista?
4. Togliendo un elemento, la tavola migliorerebbe? Quale?
5. I bordi sono intenzionali (al vivo o rispettati)?
6. La scala del titolo è decisa o timida?
7. Il vuoto lavora o è avanzato?
8. Sembra fatta da un designer di questa scuola, o è generica?

La domanda 4 è la regola del designer esperto, **togliere**, e diventa una correzione: il motore toglie l'elemento indicato e la giuria rivota. La domanda 8 si fa con le schede della scuola scelta come riferimento.

**Trenta schizzi, tre tavole.** Il vivaio sale a 60–120 candidate (sono solo calcoli: la scena si rende solo per le finaliste). Il filtro del codice ne scarta la maggior parte, il torneo ne porta tre in finale e la correzione mirata le rifinisce. All'utente arrivano **tre proposte con la loro idea spiegata**, non otto varianti.

---

## 6. Piano

| Fase | Contenuto | Fatto quando |
|---|---|---|
| **D1 Decompilatore: strati e testo** | Strati (scontorno, regioni uniformi), testo con riquadri, render-and-compare dei caratteri, verifica di fedeltà | Un manifesto tipografico semplice torna scena modificabile con differenza di pixel sotto la soglia |
| **D2 Decompilatore: intenzione** | Ruoli, griglia, base, scala, scheletro, trattamenti, palette con i ruoli | Il cambio di formato di una scena decompilata rispetta griglia e scala (verifica sul banco) |
| **D3 Archivio dei maestri** | Raccolta lecita di 300–500 lavori per 8–10 scuole e generi, schede di grammatica, distribuzioni per famiglia nel motore | Le famiglie del motore usano distribuzioni misurate invece di numeri scritti a mano |
| **D4 Concettista** | Ruolo, figure retoriche, maestra delle idee, direttore dentro le idee | Ogni proposta arriva con un'idea esplicita; la giuria preferisce le tavole "con idea" a quelle "senza" a parità di contenuto |
| **D5 Occhio** | Griglia del direttore artistico, correzione "togli", vivaio da 60–120, tre finaliste | Percentuale di vittorie nel banco Q0 sopra il 60% contro il migliore concorrente |
| **D6 Riferimenti e DNA** | "Fammi qualcosa così" e decompilazione dei materiali del cliente nell'oggetto `brand` | Da 5 post vecchi del cliente si ottiene un marchio usabile senza scrivere nulla |

D1–D2 e D4 possono procedere in parallelo. D3 richiede D2. Ogni fase si misura con il banco di confronto (Q0).

**Dove si lavora**: tutto questo vive nel motore designer (`src/components/studio/designer`), che è in lavorazione sul branch `claude/ecstatic-mendel-t4tibq`. Il decompilatore può nascere come modulo nuovo (`designer/decompila/`) per non toccare i file in lavorazione.

**Hardware**: D1–D2 con scontorno locale e modelli con visione via API girano sul PC dell'utente. LayerD e Qwen-Image-Layered richiedono una GPU (a noleggio, a ore) e servono solo per i casi difficili e per costruire l'archivio una volta.

---

## Fonti

- Canva Magic Layers: [PetaPixel](https://petapixel.com/2026/03/11/canvas-new-ai-tool-turns-flat-images-into-editable-layers), [Digital Camera World](https://digitalcameraworld.com/tech/software/its-a-kind-of-magic-canva-launches-magic-layers-which-turns-a-flat-image-into-a-fully-editable-multi-layer-document).
- [LayerD, ICCV 2025](https://openaccess.thecvf.com/content/ICCV2025/html/Suzuki_LayerD_Decomposing_Raster_Graphic_Designs_into_Layers_ICCV_2025_paper.html) e [codice](https://github.com/CyberAgentAILab/LayerD).
- [Qwen-Image-Layered](https://arxiv.org/abs/2512.15603).
- Riconoscimento dei caratteri: [DeepFont](https://arxiv.org/abs/1507.03196), [Character-independent font identification](https://arxiv.org/abs/2001.08893), [GoogleFontsBench con DINOv2](https://arxiv.org/pdf/2602.13889).
- Giudizio dei modelli con visione: [AesEval, ICLR 2026](https://iclr.cc/virtual/2026/poster/10009602).
- Poster agentici e cicli di critica: vedi salto-di-qualita.md.
