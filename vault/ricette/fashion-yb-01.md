---
type: design_recipe
mood: fashion-yellow-black
client_type: fashion_brand_or_lifestyle_editorial
score: 94
tags: [giallo-nero, editoriale-moda, handwriting, contrasto-estremo, magazine, kawai, energy]
---

# Fashion Yellow × Black — Il Contrasto che Urla Stile

## L'Anima del Design (Il Guizzo)
Il giallo e il nero non sono una palette — sono un manifesto. Questa combinazione è presa direttamente dai segnali stradali e dall'industria, poi trasfigurata in estetica fashion ad alto impatto: il pericolo diventa eleganza, il segnale diventa status. Il "guizzo" è il contrasto brutale tra la razionalità del nero (potere, struttura, architettura tipografica) e l'irrazionalità del giallo (energia, urgenza, luce artificiale). Le annotazioni a mano alzata in pennarello bianco o inchiostro su fondo giallo creano il ponte tra la costruzione grafica e il gesto umano. Questo design parla giovane, parla forte, parla adesso.

## Touchstone
- i-D Magazine, numeri storici — layout spezzato, contrasto estremo, energia cruda
- PLEASURES brand — streetwear che usa giallo/nero come identità assoluta
- Alexander McQueen inviti anni '90 — tipografia aggressiva su nero profondo

## Registro Sensoriale
- **Suono:** chitarra distorta su beat hip-hop, flash fotografico in studio
- **Tatto:** carta lucida patinata di rivista, pennarello a punta grossa che scorre su superficie liscia
- **Temperatura:** calda e urgente — come un semaforo lampeggiante di notte
- **Odore:** vernice spray fresca, inchiostro serigrafia, carta patinata nuova appena aperta

## Cosa Funziona
- Headline in Condensed Black o Extended Bold su sfondo giallo: il testo è un muro
- Annotazioni manoscritte in pennarello bianco che "correggono" o commentano il testo stampato
- Split verticale netto: metà canvas nera con testo bianco, metà gialla con testo nero — nessuna transizione

## Trappole Comuni (Cosa NON fare)
- **NON** aggiungere un terzo colore — la forza nasce dall'esclusività del binomio giallo/nero
- **NON** usare font serif classici — il movimento è youth-oriented, la tipografia deve essere attuale e aggressiva
- **NON** smorzare il giallo verso il gold o ambra — deve rimanere giallo acido da segnale stradale, non oro fashion

## Palette OKLCH (Logica e Range)
```
bg:      alternare tra L < 10%, C 0 (nero profondo)
         e L 88-95%, C > 0.28, H 95-105 (giallo acido)
         → I due backgrounds si alternano nelle sezioni come sistole/diastole

primary: il colore opposto al bg corrente
         → Su nero: giallo acido L 90%+. Su giallo: nero assoluto L < 10%

accent:  L 97-100%, C 0
         → Bianco per annotazioni manuali e highlights su entrambi i fondi

text:    specchio del bg — nero su giallo, bianco su nero
```

## Tipografia (Linee Guida)
- **Display:** Condensed Black o Ultra-Extended, fontWeight 900. Occupa tutto lo spazio disponibile.
- **Annotation:** Font handwriting (Caveat, Permanent Marker) come secondo livello — gesto sopra struttura
- **Body:** Sans-serif medio (400-500), mai serif. Il corpo segue l'aggressività del display.
- **Scale:** estrema — display 120-200px, body 14-16px, nessun livello intermedio

## Implementazione Fabric.js
```json
BG_YELLOW: { "type": "rect", "fill": "oklch(0.92 0.29 99)" }
BG_BLACK:  { "type": "rect", "fill": "oklch(0.08 0 0)" }
Headline:  { "fontFamily": "Selected_Condensed_Black", "fontWeight": "900", "textTransform": "uppercase", "letterSpacing": -0.02 }
Annotation: { "fontFamily": "Permanent Marker", "fontWeight": "400", "fill": "#FFFFFF", "angle": -3, "opacity": 0.9 }
Split:     { "type": "line", "stroke": "#000000", "strokeWidth": 6 }
```
**Effetti vietati:** `gradient`, `blur`, `soft_shadow`, `glow` — il contrasto è assoluto, non sfumato

## Layout + Baricentro
- **Negative space:** 20–35% — composizioni dense ma non claustrofobiche
- **Baricentro:** la linea di divisione giallo/nero — è lì che il movimento si concentra

## Rubrica Score
- **70:** Giallo e nero presenti ma palette diluita con altri colori, font non aggressivo
- **80:** Split netto, font condensed, contrasto estremo
- **90:** Annotazione manuale presente, tensione tra struttura e gesto
- **95+:** Il canvas sembra strappato direttamente da un editorial shoot di moda — energia cruda, nessun compromesso

## Layout Variazioni (scegli 1 in base al contenuto)

### LV-A: VERTICAL SPLIT — copertina, post evento, brand hero
**Struttura:** divisione verticale esatta 50/50 — sx nera con headline bianca (o gialla), dx gialla con headline nera; annotazione manoscritta attraversa il confine su entrambi i lati
**Elementi chiave:** 2 rect di campo (nero + giallo), headline in 2 colori diversi per ogni campo, annotazione manoscritta che sfonda il divisore, brand name piccolo in angolo
**Baricentro:** la linea verticale centrale — il confine è il soggetto
Minimo 10 elementi

### LV-B: YELLOW FIELD TAKEOVER — social post, announcement, magazine page
**Struttura:** sfondo giallo totale; grande blocco rettangolare nero come "titolo-blocco" che occupa 60% dell'area con headline bianca inside; annotazioni in pennarello bianco sparse sullo sfondo giallo
**Elementi chiave:** rect nero flush-left o centrato, headline bianca weight 900 inside, 3-5 annotazioni handwriting distribuite sul giallo, piccola immagine b&w scontornata nell'angolo
**Baricentro:** il blocco nero — il giallo è l'energia intorno
Minimo 11 elementi

### LV-C: DIAGONAL CUT FASHION — editorial spread, lookbook page
**Struttura:** taglio diagonale 15° che divide il canvas in triangolo nero (alto-sx) e giallo (basso-dx); immagine moda scontornata che sfonda il taglio; headline sulla parte nera; body sulla parte gialla
**Elementi chiave:** 2 rect a forma di triangolo (con clip o rotation trick), immagine overflow dalla diagonale, headline nera su giallo o bianca su nero secondo posizione
**Baricentro:** la diagonale — la tensione tra i due campi
Minimo 12 elementi

### LV-D: HANDWRITING TAKES OVER — campagna, post provocatorio
**Struttura:** sfondo nero; testo principale in tipografia condensed black; sopra: annotazioni manoscritte gialle che "riscrivono" il messaggio o aggiungono commenti, frecce, sottolineature
**Elementi chiave:** headline stampata in bianco/giallo, overlay di 5-8 annotazioni in Permanent Marker giallo con angoli diversi, 1-2 frecce manuali, asterischi e underline
**Baricentro:** il dialogo tra stampa e gesto — nessuno vince
Minimo 13 elementi

## Divieti Assoluti (specifici di questo movimento)
❌ Mai terzi colori — nemmeno il bianco come colore di campo (solo come testo/accento)
❌ Mai giallo smorzato, ambra o ocra — deve essere il giallo neon dei segnali stradali
❌ Mai font serif classici o "eleganti" — questo è fashion aggressivo, non Vogue anni '60
❌ Mai gradienti tra giallo e nero — il confine è netto come un coltello
❌ Mai troppo spazio vuoto — la densità è parte dell'energia del movimento
