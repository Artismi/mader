# Motore designer procedurale: analisi e progetto

Obiettivo: lo Studio produce grafiche (singole e caroselli) che sembrano fatte da un grafico esperto con carattere. Sperimentazione nella parte espressiva, comunicazione sempre chiara. L'IA scrive il discorso e regola i parametri; il sistema compone; l'IA guarda il risultato e lo corregge.

---

## 1. Dove siamo (analisi)

### Cosa funziona
- **Testo vero, misurato**: i testi sono oggetti Fabric modificabili, spezzati e dimensionati con i caratteri reali (`text.ts`).
- **Motore effetti**: duotone, retino, riso, serigrafia, pellicole, riempimenti generativi, grana. Si applicano a qualunque elemento.
- **Sistemi generativi** (`gen/systems.ts`): otto ricette a passaggi con regolatori. Eco, Strisce, Griglia modulare, Orbita e Costruttivista danno già risultati incoraggianti.
- **Controlli**: bordi, sovrapposizioni, contrasto. Il controllo che legge i pixel della foto è in corso.

### Cosa non funziona, e perché (cause alla radice)

| Sintomo | Causa |
|---|---|
| Ripetitività | Ogni sistema è *una* composizione scritta a mano. Il seme cambia dettagli, non la struttura. |
| Rapporti deboli, "composto ma non progettato" | Non c'è un sistema di misure: margini, distanze e corpi sono numeri sparsi (`U(g, 40)`, `0.58`…). Niente griglia di base, niente scala tipografica, nessun allineamento ottico. |
| Alcune tavole brutte (Tipo gigante, Foto nelle lettere) | Trattamenti applicati senza le loro condizioni: il contorno vuoto con un graziato sottile, la foto chiara nelle lettere su fondo chiaro. Ogni trattamento ha prerequisiti che il motore non conosce. |
| Leggibilità a rischio | Messaggio ed espressione non sono separati in modo formale. |
| Foto trattata come un rettangolo | Il motore non sa dov'è il soggetto, dove sono le zone calme, quali colori ha. |
| Nessuna scelta tra varianti | Il motore genera e scarta (passa o non passa), non valuta *quanto* una tavola è buona. |
| Nessuna sequenza | Una slide alla volta: niente discorso, ritmo, continuità. |
| Testi del sigillo illeggibili | Corpi minimi non garantiti; la grana sopra il testo. Corretto, ma deve diventare una regola generale. |

**Conclusione.** Il salto di qualità non viene da altri sistemi scritti a mano, ma da tre cose:
1. Una **grammatica**: scheletri, trattamenti e dispositivi intercambiabili, ognuno con i suoi prerequisiti.
2. Un **sistema di misure** comune.
3. Una **valutazione** che sceglie le migliori tra molte candidate.

---

## 2. Principi (le regole del grafico, scritte nel motore)

1. **Due strati.**
   - Il *messaggio* (titolo, informazioni, invito) è sempre leggibile.
   - L'*espressione* (forme, ripetizioni, rotture, sovrastampe) è libera.
   - Un elemento espressivo non può mai togliere leggibilità al messaggio.
2. **Un solo protagonista**: in ogni tavola un elemento domina, con un'area almeno doppia del secondo.
3. **Tutto sta su una misura**: griglia di colonne, griglia di base, scala dei corpi, scala delle distanze.
4. **Vicinanza = relazione**: le cose legate stanno più vicine di quelle separate (occhiello e titolo più vicini di titolo e testo).
5. **Pochi elementi, decisi**: al massimo 4 corpi, 2 famiglie più il carattere da manifesto, 3 assi di allineamento.
6. **I bordi sono intenzionali**: un elemento è al vivo (esce dalla tavola) oppure rispetta il margine. Mai a metà.
7. **Ogni trattamento ha le sue condizioni**: si usa solo dove funziona.
8. **Il contenuto comanda**: la parola chiave, il numero, la data decidono cosa si vede per primo.

---

## 3. Architettura

```
 PROMPT ──► [IA 1: Regia] ──► Discorso (slide con ruoli e testi) + Direzione (famiglia, stile, regolatori)
                                   │
                                   ▼
            ┌──────────────── MOTORE ─────────────────┐
            │ Misure  →  Grammatica  →  Candidate (×N) │
            │ (griglia,   (scheletro,     valutazione   │
            │  scala,      trattamenti,   e scelta      │
            │  metriche)   dispositivi)   diversificata │
            │       Foto intelligente · Colore          │
            └──────────────────────────────────────────┘
                                   │  6–8 tavole renderizzate (foglio contatti)
                                   ▼
                     [IA 2: Revisione] ──► modifiche da un vocabolario chiuso
                                   │
                                   ▼
                       Tavole finali → Studio (tavole modificabili)
```

Moduli (in `src/components/studio/designer/`):

```
core/      misure.ts (griglia, base, margini, zone sicure)   scala.ts (corpi, distanze, ottica)
           metriche.ts (altezza maiuscole, x, side bearing)    testo.ts (a capo, vedove, sillabe it)
           colore.ts (palette, armonie, proporzioni)          foto.ts (pixel, soggetto, zone calme, palette)
           leggibilita.ts                                     valuta.ts (punteggio estetico)
grammatica/ scheletri/*.ts   titolo.ts   foto.ts   dispositivi.ts   finiture.ts   famiglie.ts
sequenza/  discorso.ts (archi e ruoli)   ritmo.ts   panorama.ts
render.ts  preview.ts  DesignPanel.tsx
```

API: `/api/ai/design-direct` (regia) e `/api/ai/design-review` (revisione).

---

## 4. Le Misure (i rapporti)

Tutte le misure sono in unità `u` = lato corto / 1080.

### Margini
- **Social** (1:1, 4:5): M = 6,7% del lato corto (72u). **Orizzontale**: 5%.
- **Storia 9:16**: zone sicure per l'interfaccia di Instagram. Il messaggio sta fuori dal 14% in alto e dal 18% in basso; l'espressione può usarle.
- **Canone classico** (regolatore "classico", per editoriale e cultura): margini interno : alto : esterno : basso = 2 : 3 : 4 : 6.

### Griglia
- **Griglia di base**: b = 8u. Ogni posizione verticale del messaggio si aggancia a multipli di b.
- **Colonne**: 6 nei formati 1:1 e 4:5, 4 nella storia, 12 nell'orizzontale. Canale = 3b.
- **Moduli**: righe = round(altezza utile / (colonna + canale)), così i moduli sono quasi quadrati.

### Scala dei corpi
Il testo base è 24u; il rapporto *r* dipende dall'intenzione:

| Intenzione | r |
|---|---|
| sobria | 1,25 |
| editoriale | 1,333 |
| decisa | 1,5 |
| aurea | 1,618 |
| manifesto | 2 |

- Livelli: note = 24/r (minimo 13u), testo 24, attacco 24·r, sottotitolo 24·r², titolo 24·r³ … 24·r⁵.
- Il "titolo a tutta larghezza" esce dalla scala per scelta (solo con il carattere da manifesto).

### Distanze
Scala {1, 2, 3, 5, 8, 13} × b:
- dentro un gruppo (occhiello → titolo): 1–2b;
- titolo → testo: 3b;
- tra gruppi: 5b;
- tra sezioni: 8b.

### Ottica
- **Spaziatura delle lettere**:
  - etichette maiuscole: da +0,12 a +0,18 em;
  - testo: 0;
  - titoli a bastoni: da −0,01 em a 60u fino a −0,04 em a 200u;
  - graziati: da −0,01 a −0,02 em.
- **Interlinea**: titoli 0,86–0,95 (tutto maiuscolo 0,82); testo 1,35–1,45; note 1,5.
- **Allineamento sulle maiuscole**: la sommità delle maiuscole del titolo tocca la riga del margine, non il bordo del box. L'ultima linea di base cade sulla griglia. Le misure vengono da `measureText` (`actualBoundingBoxAscent` di "H").
- **Margine ottico**: i titoli grandi rientrano dello spazio laterale della prima lettera (side bearing), così il bordo visivo è allineato.
- **Lunghezza di riga**: testo 30–55 caratteri nei social, 45–70 in stampa.
- **A capo all'italiana**:
  - niente vedove (una parola corta sola in ultima riga);
  - niente articoli o preposizioni monosillabiche a fine riga (il, la, di, a, e, per…);
  - titoli bilanciati.
- **Numeri**: cifre tabellari nei dati. Nei numeri giganti "%" e "€" a metà corpo, allineati in alto.

### Rapporti tra elementi
- Titolo : testo da 3:1 (sobria) a 10:1 (manifesto).
- Immagine : testo 62:38 oppure 38:62. Il 50:50 solo se lo scheletro è un "taglio" con un elemento di tensione.
- Accento: al massimo il 12% dell'area in tono. In modalità inversa l'accento è il campo e i testi usano al massimo due colori.
- Al massimo 3 assi verticali. Gli elementi entro 4u da un asse si agganciano.
- Distanza dal bordo: 0 (al vivo) oppure almeno M. Vietato tra 0 e M/2.

---

## 5. Il messaggio: ruoli e misure dei testi

| Ruolo | Budget (caratteri) | Note |
|---|---|---|
| titolo | 12–32 copertina, ≤ 48 interne | con una **parola chiave** (enfasi) |
| occhiello | ≤ 24 | data, categoria, "Nuovo…" |
| testo | ≤ 140 | massimo 3 righe nei social |
| dettagli | 3 × ≤ 18 | formato, luogo, orario, prezzo |
| numero | ≤ 6 | "14.11", "−30%", "250 g" |
| invito | ≤ 20 | verbo all'imperativo |
| brand | — | sempre presente, piccolo |

- La Regia rispetta questi budget.
- Se un testo non sta, il motore chiede una versione più corta alla Revisione invece di ridurre il corpo sotto il minimo.

---

## 6. La Grammatica

Una tavola nasce da:

> **scheletro × trattamento del titolo × trattamento della foto × dispositivi × finiture**,

dentro un **colore**. Ogni pezzo dichiara i suoi **prerequisiti**: formati, carattere a bastoni o graziato, foto chiara o scura, fondo, densità. Le combinazioni che non li rispettano non vengono generate.

### 6.1 Scheletri (zone sulla griglia, dichiarativi)
Ogni scheletro descrive zone con un ruolo (immagine, titolo, informazioni, dispositivo) e un rapporto (φ, terzi, √2). Tutti si possono **specchiare** in orizzontale e in verticale: è dichiarativo, quindi costa zero e raddoppia le varianti.

1. **Campo e colonna**: immagine sul lato φ e colonna di testo.
2. **Tre registri**: testata, campo, piede.
3. **Al vivo con riquadro**: foto piena; il messaggio sta in un blocco pieno ancorato a un angolo.
4. **Al vivo con velo**: foto piena, velo sfumato, messaggio sul velo (sulla zona calma della foto).
5. **Taglio diagonale**: due campi separati da una diagonale.
6. **Centro**: simmetrico, tanto vuoto.
7. **Angoli**: quattro elementi agli angoli, centro libero o con l'immagine.
8. **Fascia**: una banda di colore attraversa la tavola.
9. **Griglia modulare**: celle con foto, colore, numero e testi.
10. **Pila**: il titolo riempie, l'immagine è secondaria.
11. **Finestra**: l'immagine in una forma (arco, cerchio, quarto) dentro un campo di colore.
12. **Orbita**: radiale.
13. **Asse costruttivista**: tutto si allinea a un asse inclinato.
14. **Colonne di rivista**: 2–3 colonne, numeri, didascalie, filetti.
15. **Passe-partout**: cornice spessa di colore, immagine dentro.
16. **Collage**: frammenti leggermente ruotati, nastro adesivo, sovrapposizioni.
17. **Panorama** (carosello): composizione unica tagliata in slide.

### 6.2 Trattamenti del titolo (con prerequisiti)
- **Pieno** (sempre).
- **Pila giustificata**: righe a tutta larghezza; solo bastoni da manifesto.
- **Riga gigante al vivo**: una copia decorativa tagliata dal bordo, più il titolo intero leggibile.
- **Parola chiave in corsivo graziato** dentro un titolo a bastoni: il contrasto di famiglia da grafico.
- **Colore per parola**: solo la parola chiave nell'accento.
- **Fuori registro**: copia sfalsata in sovrastampa, dietro.
- **Contorno**: corpo almeno 90u, tratto almeno il 2,5% del corpo, fondo piatto.
- **Eco cinetica**: copie decorative, una sola piena.
- **Ruotato di 90°** lungo il bordo.
- **Su cerchio**.
- **Foto nelle lettere**: bastoni pesanti, fondo scuro, foto al naturale, filo chiaro sul bordo.
- **Soggetto davanti al titolo**: lo scontorno della foto copre in parte le lettere, mai più del 25% di una lettera.
- **Materiale** (cromo, vetro, oro dal motore effetti): solo su una parola o un numero isolato.
- **Spaziato largo** in maiuscoletto.
- **Stretto** (scaleX 0,8): solo bastoni.

### 6.3 Trattamenti della foto
- Taglio sul soggetto (sempre).
- Pellicola (look dello stile).
- Duotone, retino, riso, serigrafia, tinte piatte.
- Strisce sfalsate.
- Finestre in griglia.
- Maschera a forma.
- Scontorno con alone o ombra piena.
- Soggetto fuori cornice: esce dal riquadro.
- Doppia esposizione con texture dei pack.
- Specchiata.
- Mosso o zoom.
- Vetro scanalato.

### 6.4 Dispositivi
- Filetti e numeri indice.
- Nastri scorrevoli.
- Sigilli (corpo minimo 14u, testo che riempie il giro senza stirarsi).
- Crocini e segni di registro.
- Barre di codice e microtesto tecnico (dati veri del contenuto, mai riempitivo).
- Numero gigante.
- Disco, barra, arco.
- Campi di puntini.
- Ornamenti del laboratorio e glifi Celestial.
- Nastro adesivo.
- Segni a mano: cerchio attorno alla parola chiave, freccia, sottolineatura a pennarello.
- Bollino con l'invito.
- Freccia di scorrimento (copertina del carosello).
- Paginazione "02/06".

### 6.5 Finiture
- Grana.
- Carta dai pack dell'utente.
- Polvere e luce dai pack.
- Fuori registro globale.
- Vignettatura.

**I testi del messaggio stanno sempre sopra le finiture.**

### 6.6 Famiglie (al posto dei "sistemi")
Una famiglia è una **tabella di pesi** sulla grammatica: quali scheletri, trattamenti e dispositivi preferisce, con quali probabilità.

| Famiglia | Scheletri preferiti | Titolo | Foto | Dispositivi |
|---|---|---|---|---|
| Svizzera | pila, griglia, tre registri | pila giustificata, riga gigante | duotone, tinte piatte | filetti, numeri, crocini |
| Editoriale | colonne, campo e colonna, passe-partout | corsivo graziato, pieno | pellicola, b/n | filetti, didascalie, paginazione |
| Costruttivista | asse, taglio diagonale | ruotato, pieno | retino | disco, barra, numero gigante |
| Zine/Riso | collage, finestra | fuori registro, colore per parola | riso, serigrafia | nastro, segni a mano, puntini |
| Club/Notte | pila, eco, al vivo con velo | eco, contorno | strisce, cinestill | nastri scorrevoli, registro |
| Lusso | centro, passe-partout | spaziato largo, corsivo | morbido | sigillo, filetti sottili |
| Artigiano/Botanico | finestra, campo e colonna | corsivo graziato | pellicola calda | ornamenti, glifi |
| Tech chiaro | griglia, fascia | pieno, colore per parola | duotone freddo | numeri indice, codice |
| Pop | angoli, fascia, orbita | contorno, materiale | retino pop | bollino, stelle |

Gli otto sistemi attuali diventano ricette di queste famiglie (Eco, Strisce, Orbita… restano come scheletri e trattamenti).

### 6.7 Regolatori
Ogni regolatore sposta **le probabilità**, non un valore fisso. Così due generazioni con gli stessi regolatori non sono uguali, ma sono della stessa famiglia.

| Regolatore | Cosa sposta |
|---|---|
| **Scala** | il rapporto *r*, quanta area prende il titolo, quanto spesso esce al vivo |
| **Energia** | diagonali, rotazioni, sfalsamenti, asimmetria |
| **Densità** | numero di dispositivi e strati, vuoto obiettivo (dal 60% al 25%) |
| **Sovrastampa** | copie fuori registro, foto stampata sull'accento, scostamento di registro |
| **Rottura** | collage, nastro, segni a mano, microtesto, lettere tagliate (solo strato espressivo) |
| **Contrasto** | tono su tono, accento pieno, bianco e nero più un accento, due inchiostri |
| Categoriali | famiglia, stile, trattamento foto, seme, parola chiave |

---

## 7. Leggibilità: le regole (strato messaggio)

1. **Campionamento**: ogni riga di testo viene campionata su una griglia di punti (circa 24). Sotto può esserci il fondo, una forma, un velo o la foto, letta nei suoi pixel veri. Un punto è buono se il contrasto è almeno 2,4 (titoli) o 3,2 (testo piccolo) e il fondo non è mosso.
2. **Soglia**: la riga passa se è buona nel 75% dei punti (titoli) o nel 90% (testi piccoli). Un titolo bianco può bucare una foto scura e uscire di poco sul bianco; non può stare su una foto movimentata.
3. **Contorni vuoti**: solo grandi e con un tratto deciso.
4. **Corpi minimi**: 13u per le note, 14u nei sigilli e nei testi su cerchio. Nella storia +10%.
5. **Ordine**: i testi del messaggio stanno sopra grana e finiture. Le copie decorative (eco, ombre, registro) sono marcate `deco` e non contano.
6. **Gerarchia**: il titolo è l'elemento di testo più grande. L'invito è riconoscibile per colore o forma (bollino, freccia, filetto).

---

## 8. Foto intelligente

Si usa lo **scontorno locale già presente** (`compose/cutout.ts`, U²-Net, nessun servizio esterno).

- **Pixel**: la foto ridotta (circa 160 px) resta in memoria durante la generazione, per misurare colore e movimento.
- **Soggetto**: la maschera dello scontorno dà il riquadro del soggetto e il suo baricentro.
- **Taglio sul soggetto**: il riempimento non centra più la foto ma il soggetto (regola dei terzi verso l'interno della tavola).
- **Zone calme**: una mappa del movimento (deviazione della luminanza) dice dove si può scrivere direttamente sulla foto. Gli scheletri "al vivo" mettono il messaggio lì; se non ce ne sono, usano il velo.
- **Palette dalla foto**: 5 colori dominanti (k-means sui pixel). L'accento dello stile si avvicina al colore della foto più compatibile, così foto e grafica parlano la stessa lingua.
- **Soggetto fuori cornice / davanti al titolo**: lo scontorno diventa un livello sopra il titolo o oltre il bordo del riquadro.

---

## 9. Colore

- **Palette di partenza**: quella dello stile (fondo, superficie, inchiostro, secondario, accento, secondo inchiostro), modulata dalla palette della foto.
- **Modalità** (regolatore Contrasto):
  - tono su tono;
  - accento pieno (inverso);
  - bianco e nero più un accento;
  - due inchiostri (riso);
  - monocromo con varianti di tinta.
- **Proporzioni**: 60 fondo, 30 secondario, 10 accento. Fanno eccezione le modalità dichiarate, come l'accento pieno.
- **Contrasti garantiti**: ogni coppia testo/fondo usata dal messaggio passa la soglia; il colore viene scelto (`readable`), non assunto.

---

## 10. Valutazione e scelta

Il motore genera **24–48 candidate** come scene, senza renderizzarle: è solo calcolo, pochi millisecondi l'una. Le valuta e renderizza le 6–8 migliori **e diverse tra loro**.

### Punteggio (0–100)

| Criterio | Peso |
|---|---|
| Gerarchia chiara (rapporto titolo/testo, un solo protagonista) | 20 |
| Equilibrio (baricentro del peso visivo coerente con l'intenzione, simmetrico o asimmetrico voluto) | 15 |
| Vuoto vicino all'obiettivo della densità | 10 |
| Allineamenti (pochi assi, agganci alla griglia) | 10 |
| Tensione ai bordi (nessun elemento "quasi" sul bordo) | 10 |
| Foto (soggetto intero, non coperto dal messaggio) | 10 |
| Colore (proporzioni, armonia con la foto) | 10 |
| Qualità del testo (righe bilanciate, niente vedove, lunghezza giusta) | 10 |
| Varietà rispetto alle sorelle | 5 |

- La leggibilità è un **vincolo**, non un punteggio: chi non passa è scartato.
- **Diversità**: la firma di una tavola è scheletro + trattamento del titolo + trattamento della foto + modalità colore. Tra le scelte non si ripetono due firme e al massimo due tavole hanno lo stesso scheletro.

---

## 11. Sequenze (caroselli e presentazioni)

### Archi del discorso (li sceglie la Regia)
- Problema → soluzione → prova → invito
- Lista (N consigli o punti)
- Prima / dopo
- Storia (apertura, sviluppo, svolta, chiusura)
- Annuncio (evento, prodotto)
- Manifesto (tesi, argomenti, frase finale)

### Ruoli delle slide
| Ruolo | Scheletri adatti |
|---|---|
| copertina | i più forti: pila, al vivo, asse, foto nelle lettere |
| apertura / tesi | centro, fascia |
| punto (n/N) | campo e colonna, griglia, colonne |
| dato | numero gigante, orbita |
| citazione | centro, passe-partout, corsivo grande |
| confronto | taglio diagonale, due colonne |
| elenco | colonne, griglia numerata |
| immagine piena | al vivo con velo, strisce |
| chiusura / invito | bollino, fascia, brand grande |

### Ritmo
- Mai lo stesso scheletro due volte di fila; al massimo due volte per sequenza.
- Alternanza forte/quieta.
- Un'inversione (accento pieno) ogni 2–3 slide.
- La copertina ha l'energia più alta della sequenza.

### Continuità
Le slide sembrano un unico progetto:
- stessa griglia, scala, palette, grana;
- testatina e piede ricorrenti (brand e paginazione "02/06");
- un **dispositivo filo**: una linea, un disco o un nastro che passa da una slide all'altra.

### Panorama
La sequenza si compone su una tela larga N × W e poi si taglia in N tavole. Le forme che attraversano il taglio continuano nella slide successiva: è l'effetto "swipe" dei caroselli migliori.

---

## 12. L'IA: due chiamate

### Chiamata 1: Regia (modello testuale, quello "design" scelto in OpenRouter)
**Ingresso**: prompt, formato, numero di slide (o "decidi tu"), eventuale brand.
**Uscita** (JSON validato con zod e ripiego testuale):

```json
{
  "discorso": { "arco": "lista", "slides": [
    { "ruolo": "copertina", "titolo": "…", "enfasi": "…", "occhiello": "…", "testo": "…",
      "dettagli": ["…"], "numero": "…", "invito": "…", "foto": "cosa mostra (3-6 parole)" }
  ]},
  "direzione": { "famiglia": "zine", "stile": "notte-calda", "mood": ["caldo", "notturno"],
    "regolatori": { "scala": [0.6, 0.9], "energia": [0.3, 0.6], "rottura": [0.2, 0.5] },
    "trattamentoFoto": "riso", "note": "…" }
}
```

- I budget di caratteri sono nello schema.
- I regolatori sono **intervalli**: il motore estrae le candidate dentro gli intervalli.

### Chiamata 2: Revisione (modello con visione)
**Ingresso**: un **foglio contatti** (una sola immagine con le tavole numerate: costa poco) più un riassunto JSON di ogni tavola (famiglia, scheletro, trattamenti, regolatori, testi).
**Uscita**: per ogni slide la tavola scelta e le **modifiche da un vocabolario chiuso**:

```
regolatore(nome, valore)      scheletro(id)          trattamentoTitolo(id)    trattamentoFoto(id)
enfasi(parola)                testo(ruolo, nuovo)    contrasto(modalità)      dispositivo(+/−, id)
fuocoFoto(x, y)               specchia(asse)
```

- Il motore applica le modifiche, rigenera e ricontrolla. Niente terza chiamata.
- Senza un modello con visione, la revisione si salta e decide il punteggio.
- Dopo il posizionamento sul canvas resta il vocabolario esistente di `ai/design-ops.ts` per i ritocchi in chat.

### Modelli
- Regia: quello "design" scelto nelle Impostazioni.
- Revisione: un modello con `input_modalities` che include l'immagine (verificato dall'elenco di OpenRouter). Se quello scelto non vede le immagini, si avvisa e si usa il punteggio.
- Costo indicativo: un foglio contatti è circa 1,5k token in ingresso, più il JSON.

---

## 13. Nello Studio

- **Pannello**: modalità *Singola* o *Carosello (N)*, un campo prompt, **Genera**.
- **Avanzamento a passi**: Regia → Composizione → Revisione.
- **Risultati**: griglia di tavole; per il carosello, una fila per alternativa di sequenza.
- **Regolatori dal vivo**: selezionata una tavola, cursori e scelte (famiglia, trattamenti, parola chiave). Si rigenera solo nel motore, in meno di un secondo, senza IA. **Rifinisci** rilancia la Revisione su richiesta.
- **Metti sul canvas**: una tavola o tutta la sequenza, come tavole affiancate e nominate ("Slide 01 — copertina").
- **Livelli**: gruppi per ruolo (Fondo, Immagine, Titolo, Informazioni, Dispositivi, Finiture), fondo bloccato, testi modificabili.
- **Metadati sulla tavola** (contenuti, regolatori, famiglia, versione del motore): riselezionando una tavola sul canvas si riaprono i regolatori. Se l'utente l'ha modificata a mano, si chiede conferma prima di rigenerare.
- **Risorse dell'utente**: font locali (Kilo, Roadam, Vanosky…) come caratteri da manifesto; pack di texture ed elementi nelle finiture e nel collage.

---

## 14. Banco di prova (qualità)

- **Nel repo** `scripts/designer/`: esbuild + Playwright con il Chromium del sistema. Le foto di prova stanno in `scripts/designer/fixtures/`.
- **Contenuti di prova** (10): caffè, ceramica, evento techno, app, beauty, conferenza, ristorante, mostra, saldi, citazione. Formati: 4. Famiglie: tutte.
- **`npm run designer:vetrina`** produce:
  - fogli contatti per famiglia e formato;
  - un rapporto con tasso di scarto, punteggio medio e tempi.
- **Criteri di accettazione**:
  - zero testi illeggibili;
  - scarto per famiglia e formato sotto il 10%;
  - nessuna firma ripetuta tra le 6 proposte;
  - meno di 1 s per regolare dal vivo;
  - meno di 8 s per renderizzare 6 tavole.

---

## 15. Piano di lavoro

| Fase | Contenuto | Fatto quando |
|---|---|---|
| **F0 Banco di prova** | harness nel repo, contenuti di prova, fogli contatti, rapporto | `designer:vetrina` gira e produce i fogli |
| **F1 Misure e testo** | griglia di base, colonne, margini e zone sicure, scala dei corpi e delle distanze, metriche ottiche, allineamento sulle maiuscole, a capo all'italiana | ogni testo è agganciato; fogli contatti con i rapporti corretti |
| **F2 Grammatica** | scheletri dichiarativi (≥ 16) specchiabili, trattamenti del titolo (≥ 12) e della foto (≥ 12) con prerequisiti, dispositivi, finiture, famiglie, regolatori come probabilità; gli 8 sistemi convertiti | 6 proposte diverse su ogni contenuto di prova |
| **F3 Foto intelligente** | pixel, soggetto, taglio sul soggetto, zone calme, palette dalla foto, soggetto davanti al titolo | testi sulle foto solo nelle zone calme o sul velo |
| **F4 Valutazione** | punteggio, candidate ×N, scelta diversificata | le proposte migliorano a parità di contenuto (confronto sui fogli) |
| **F5 IA** | Regia e Revisione con schema, budget, foglio contatti, vocabolario di modifiche | prompt → tavole rifinite con due chiamate |
| **F6 Sequenze** | archi, ruoli, ritmo, continuità, panorama | carosello di 6 slide da un prompt, coerente e non ripetitivo |
| **F7 Studio** | pannello nuovo, regolatori dal vivo, metadati, livelli, sequenza sul canvas | tutto provato nell'app vera |

Le fasi 0–2 sono le fondamenta: senza misure e grammatica, qualsiasi IA lavora su una base povera. La 5 può partire in parallelo dopo la 2.

### Cosa si tiene e cosa si butta
- **Si tiene**: render con le nuove estensioni (rotazioni, sovrastampa, testo su cerchio, foto nelle lettere e in porzioni, ritaglio al bordo), motore effetti, controllo di leggibilità con i pixel, `treat()`, nastri, puntini, segni di stampa, sigilli corretti.
- **Si rifà sulla grammatica**: gli 8 sistemi.
- **Si butta**: le vecchie impaginazioni (`layouts-lancio.ts`, `layouts-testo.ts`, `generate.ts`) e l'azione `contenuti` di `template-assist`, quando la Regia è pronta.
