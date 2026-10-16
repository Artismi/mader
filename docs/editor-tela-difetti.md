# Editor della tela: difetti trovati

Verifica del 16 ottobre 2026 sulla tela Fabric.js di Progettazione e Studio (`src/components/studio/creative-studio.tsx` e i moduli che usa). I test usano mouse e tastiera veri in Chrome, contro il server di sviluppo con un database di prova, e leggono lo stato dagli oggetti Fabric.

```bash
npm run tela:server   # in un altro terminale: porta 3100, database in .tela-test/
npm run test:tela     # scripts/tela/base.test.mjs e strumenti.test.mjs
```

Prima delle correzioni passavano 7 prove su 30 in `base` e 10 su 20 in `strumenti`. Alcune prove fallite all'inizio erano errori del banco, non della tela: per esempio in Fabric 7 `left`/`top` indicano il centro dell'oggetto, e `mouse.click` non tiene premuti i tasti modificatori. Le ho corrette e non le conto tra i difetti.

Gravità:
- **Alta**: fa perdere lavoro o corrompe la scena;
- **Media**: una funzione di base sbagliata o mancante, che un professionista nota subito;
- **Bassa**: rifinitura o scorciatoia standard mancante.

## Alta (6)

| # | Difetto | Causa | Prova |
|---|---|---|---|
| A1 | Il primo gesto dopo l'apertura non si annulla | La cronologia iniziale si registrava dentro `restoring()`, quindi veniva scartata | `Ctrl+Maiusc+Z e Ctrl+Y ripetono` |
| A2 | Un annulla dato entro mezzo secondo dalla modifica salta l'ultima modifica, che poi ricompare | Il passo in attesa (ritardo di 500 ms più `requestIdleCallback`) non veniva registrato prima di annullare | `annulla subito dopo una modifica` |
| A3 | Copiando e incollando, o duplicando, più oggetti si aggiungeva alla scena una `ActiveSelection` come oggetto | Veniva clonata la selezione intera invece dei singoli oggetti | `copia e incolla di più oggetti`, `duplica (Ctrl+D)` |
| A4 | Trascinando sul vuoto di una tavola si spostava la tavola invece di fare il riquadro di selezione | Le tavole erano oggetti selezionabili come gli altri | `trascinare sul vuoto della tavola` |
| A5 | La gomma cancellava la tavola con tutto il fondo | `eraseAt` non escludeva le tavole | `gomma: cancella l'oggetto toccato` |
| A6 | Spazio+trascina spostava la vista e anche l'oggetto sotto il cursore | Fabric avviava comunque il trascinamento dell'oggetto | `Spazio+trascina sposta la vista` |

## Media (9)

| # | Difetto | Prova |
|---|---|---|
| M1 | Ctrl+Maiusc+Z non ripeteva: con Maiusc `e.key` vale `'Z'` | `Ctrl+Maiusc+Z e Ctrl+Y` |
| M2 | Ctrl+A selezionava anche la tavola | `Ctrl+A seleziona gli oggetti` |
| M3 | Rettangoli, ellissi, poligoni e testi nascevano centrati sul clic (in Fabric 7 l'origine è al centro), e non c'era modo di disegnarli trascinando | `rettangolo: trascinare`, `ellisse: trascinare` |
| M4 | La maniglia d'angolo manteneva le proporzioni da sola, e Maiusc le scioglieva: il contrario di Illustrator e Figma | `maniglia d'angolo con Maiusc` |
| M5 | Valori numerici: L e A scalavano dal centro e spostavano X e Y; ogni tasto premuto registrava un passo di cronologia; un "-" mandava a 0 | `valori numerici` |
| M6 | I tracciati della penna, e i pezzi tagliati dalle forbici, non si potevano scalare | `penna: tre clic e Invio` |
| M7 | Esc non annullava il tracciato in corso della penna; cambiando strumento restavano l'anteprima e i punti, che finivano nel tracciato successivo | `penna: Esc annulla` |
| M8 | Mancava Ctrl+X (taglia) | `taglia (Ctrl+X)` |
| M9 | Guide e griglia: le guide si vedevano ma non agganciavano, non funzionavano con più oggetti selezionati, e la griglia agganciava il centro dell'oggetto invece del bordo | `aggancio alla griglia`, `le guide agganciano` |

## Bassa (11)

| # | Difetto | Prova |
|---|---|---|
| B1 | Tab e Maiusc+Tab non passavano da un oggetto all'altro | `Tab passa all'oggetto successivo` |
| B2 | Ctrl+clic non selezionava un oggetto dentro un gruppo | `Ctrl+clic seleziona` |
| B3 | Il pannello delle misure non si aggiornava dopo frecce, allinea e annulla | `il pannello delle misure segue le frecce` |
| B4 | La rotazione con Maiusc non andava a scatti di 15° | `rotazione con la maniglia` |
| B5 | Mancava il capovolgimento orizzontale e verticale | `Maiusc+H e Maiusc+V` |
| B6 | Ctrl+più e Ctrl+meno non zoomavano | `rotella zooma…` |
| B7 | La linea con Maiusc non si bloccava a multipli di 45° | `linea: … Maiusc` |
| B8 | Le forbici non tagliavano le linee | `forbici: tagliano anche una linea` |
| B9 | Mancavano Ctrl+B e Ctrl+I sul testo | `testo: Ctrl+B e Ctrl+I` |
| B10 | Un gruppo vero mostrava la scheda "Forma" invece di "Gruppo" | `le schede del pannello` |
| B11 | Le etichette in basso promettevano scorciatoie inesistenti: S per Snap; R, che in realtà fa un rettangolo, per Ruler; E, che in realtà fa la gomma, per Editorial | (a vista) |

## Funzioni di base aggiunte

Le prove sono in `strumenti.test.mjs` e `base.test.mjs`:
- blocca e nascondi (Ctrl+Maiusc+L, Ctrl+Maiusc+H);
- capovolgi (Maiusc+H, Maiusc+V);
- taglia;
- Tab tra gli oggetti;
- zoom da tastiera (Ctrl+più, Ctrl+meno, Ctrl+1 al 100%);
- forme disegnate trascinando, con Maiusc per le proporzioni e Alt dal centro;
- aggancio a guide e oggetti;
- valori numerici applicati con Invio o all'uscita dal campo.

## Stato

Le correzioni sono elencate in `docs/STATO-LAVORI.md` con i commit. Cosa resta è in fondo a questo file, nella sezione "Resta".
