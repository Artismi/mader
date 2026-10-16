# Varietà e affinamento del motore designer

Piano del 16 ottobre 2026, scritto dopo aver guardato i campioni della vetrina (caffè, mostra, menu, palestra) con il critico più severo. Si legge insieme a `motore-designer-progetto.md` (la grammatica, sezione 6) e a `STATO-LAVORI.md`.

## Diagnosi

- **Gli archetipi sono blocchi unici.** Ognuno dei circa 50 archetipi (`gen/archetipi/gruppo-*.ts`, circa 6.000 righe) è una funzione che fa tutto insieme: ossatura, titolo, foto, decorazioni, finiture. La varietà viene solo dal seme e da 6 regolatori (`gen/knobs.ts`: scala, energia, densità, sovrastampa, grana, trattamento). Ne segue che:
  - dentro un archetipo le tavole si somigliano;
  - per correggere un difetto comune bisogna toccare 50 funzioni.
- **Nessuno controlla gli spazi dopo il rendering.** Ogni archetipo piazza gli elementi con coordinate calcolate a priori. Le misure vere del testo composto (righe, a capo, larghezze del font) non tornano indietro, e da qui nascono le piccole sovrapposizioni, gli elementi che si toccano, il capolettera staccato.
- **Gli archetipi non sono provati in tutti i formati.** La vetrina li genera, ma nessuno conta i difetti archetipo per archetipo, quindi non si sa quali siano i peggiori.
- **Le finiture sono sempre le stesse:** grana, carta, nastri e timbri tornano su quasi tutte le tavole. La varietà è di superficie: cambiano gli ornamenti, non la struttura.

## Parte 1: il passaggio di perfezionamento (prima si misura, poi si corregge)

**P1. Controllo degli spazi sulle misure vere.** Dopo il rendering in Fabric si leggono i riquadri reali di ogni elemento, testo compreso, riga per riga. Un controllo unico, valido per tutti gli archetipi, verifica:
- sovrapposizioni non volute, distinguendo da quelle volute (marcate dall'archetipo come `sovrapponibile`);
- aria minima tra gli elementi in proporzione al corpo;
- margini, e allineamento alla griglia e alle linee di base.

Poi corregge in modo automatico: sposta, riduce il corpo entro limiti, accorcia il testo secondario, e se non basta scarta la tavola. Così un'unica correzione sistema tutti e 50 gli archetipi.

**P2. Tipografia fine, valida per tutti:**
- spaziatura tra le lettere in base al corpo (stretta sui titoli grandi, larga sul maiuscolo piccolo);
- interlinea in base al corpo;
- niente righe vedove o orfane, niente parola sola sull'ultima riga del titolo;
- a capo bilanciati nei titoli e sillabazione italiana nel testo;
- allineamento ottico dei margini e punteggiatura appesa;
- capolettera costruito da una sola funzione comune, agganciato alla prima riga.

**P3. Scheda difetti per archetipo.** La vetrina completa (27 contenuti × 4 formati × più semi, tutta in locale e gratuita) produce una classifica degli archetipi, ciascuno con la frequenza di ogni difetto: sovrapposizioni, testo piccolo, vuoti, tagli, contrasto, fuori tema. Si correggono prima i peggiori. È il registro del lavoro di perfezionamento.

**P4. Immagini di riferimento.** Per ogni archetipo si salvano 4 tavole di riferimento (una per formato). A ogni modifica si confrontano le immagini nuove con quelle salvate: se un archetipo che nessuno ha toccato cambia, è una regressione. Le correzioni non devono rompere il resto.

**P5. Il giro per gruppi.** Una sessione breve per gruppo di archetipi (a, b, c, d, e), una alla volta, a partire dal gruppo peggiore nella scheda P3. Ogni sessione rilegge la scheda, corregge, rilancia vetrina e confronto e committa. Tutto in locale, senza chiamate a pagamento. Si rifà dopo ogni grande aggiunta di varietà.

## Parte 2: molta più varietà procedurale

**V1. Archetipi scomposti in mattoni combinabili.** È la grammatica già scritta in `motore-designer-progetto.md` §6, finalmente applicata. Un archetipo diventa una **ricetta** che combina mattoni indipendenti:

| Mattone | Esempi | Quanti, all'inizio |
|---|---|---|
| Ossatura | colonne, terzi, sezione aurea, asse centrale, diagonale, modulare, a blocchi, a cornice, a fasce | 15 |
| Titolo | pieno, contorno, eco, a scalini, verticale, su percorso, spezzato, a blocchi, lettere grandi con foto dentro, corsivo misto | 15 |
| Foto | piena, tonda, a strisce, nelle lettere, retinata, duotone, ritaglio irregolare, mosaico | 12 |
| Dispositivi | cornici, nastri, timbri, etichette, filetti, numeri grandi, frecce, segni a mano, codici | 20 |
| Finiture | grana, sovrastampa, carta, serigrafia, nessuna | 8 |
| Palette e caratteri | per stile e marchio | già presenti, da ampliare |

Le regole di compatibilità (cosa sta con cosa) e i ruoli (che cosa deve esserci sempre: titolo, invito, brand) le tiene il compositore. Bastano 15 × 15 × 12 × 20 × 8 combinazioni a vincoli per avere decine di migliaia di impaginazioni diverse, invece di 50. Gli archetipi di oggi diventano **ricette nominate**: punti di partenza noti, come i preset di un designer.

Prima un **pilota su 3 archetipi**, poi la migrazione gruppo per gruppo, sempre con le immagini di riferimento di P4.

**V2. Nuovi regolatori.** Oltre a scala, energia e densità:
- contrasto di scala tra il primo e il secondo livello;
- asimmetria;
- ritmo (ripetizione o eccezione);
- rapporto tra pieno e vuoto;
- angolo dominante;
- temperatura della materia (digitale, stampa, carta);
- riferimento storico;
- realismo (già presente per gli oggetti).

**V3. Nuovi generatori procedurali:**
- trame: truchet, voronoi, flussi, mezzetinte, moiré, Chladni (già nel lab);
- forme: superellissi, blob, forme da font di simboli;
- tipografia generativa: assi dei font variabili, testo su percorso, griglie di lettere, distorsioni controllate;
- trattamenti foto: posterizzazione, mosaico, glitch misurato;
- icone vettoriali da un set coerente.

Ognuno ha una leggibilità garantita: opacità e zona libera dal testo calcolate.

**V4. Caratteri.** Una biblioteca curata di Google Fonts per genere (grotteschi, didoni, slab, script, monospaziati, display), con coppie verificate e font variabili. Oggi le coppie sono poche e si ripetono.

**V5. Palette generative.** In spazio OKLCH, dalla foto o dal marchio (B1 di `cosa-manca.md`), con armonie (analoghe, complementari, tinte divise) e contrasto garantito per costruzione.

**V6. Movimenti storici come famiglie.** Ogni famiglia ha le sue regole (griglia, caratteri, colori, dispositivi):
- svizzero, Bauhaus, costruttivismo russo;
- Push Pin, manifesto polacco, grafica giapponese anni '60;
- Memphis, New Wave (Weingart, Greiman), Grapus;
- olandese (Crouwel), brutalismo web;
- editoriale anni '50, psichedelico, Art Déco, liberty.

Sono 15–20 famiglie, ciascuna con 3–5 ricette. È l'archivio dei maestri delle fasi D, in forma eseguibile.

**V7. Diversità garantita (MAP-Elites).** È un algoritmo di qualità con diversità: lo spazio dei regolatori si divide in nicchie (per esempio energia × densità × famiglia), e per ogni nicchia si tiene la tavola migliore. Le proposte si pescano da nicchie diverse. Così le 12 proposte sono per costruzione 12 idee diverse, ognuna la migliore del suo tipo, e non 12 varianti della stessa.

## Parte 3: affinamento con i modelli, a basso costo

- **Correzione localizzata.** Sui casi dubbi, l'occhio economico di V1 non dà solo un voto: indica il difetto e il punto ("il timbro copre la data"). Il codice applica la correzione (sposta, riduci) e ridisegna, senza rigenerare la tavola.
- **Gusto locale (V2 della valutazione).** Le tue scelte e i tuoi scarti addestrano un classificatore su CLIP, che ordina le proposte senza chiamate.

## Ordine di lavoro

1. **P1 + P3**: controllo degli spazi sulle misure vere e scheda dei difetti. Prima si misura.
2. **P4**, poi **P2**: immagini di riferimento, poi tipografia fine.
3. **P5**: perfezionamento per gruppi, dal peggiore, una sessione alla volta.
4. **V1, pilota su 3 archetipi**, poi la migrazione.
5. **V3 + V4 + V5**: generatori, caratteri, palette.
6. **V7**: diversità garantita.
7. **V6**: famiglie storiche e nuove ricette, poi un nuovo giro di P5.

Tutto in locale e senza chiamate a pagamento, tranne i casi dubbi della parte 3.
