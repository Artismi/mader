---
type: design_recipe
mood: sports-athletic-energy
client_type: sports_brand_fitness_event_activewear
score: 90
tags: [sportivo, diagonale, motion-blur, italic-bold, lime, arancio-neon, adrenalina, kinetic, atletico]
---

# Sports Athletic Energy — La Velocità come Estetica e il Movimento come Struttura

## L'Anima del Design (Il Guizzo)
Il design sportivo non rappresenta il movimento — lo è. Ogni elemento compositivo deve sembrare in accelerazione: le diagonali non sono angoli decorativi ma traiettorie balistiche, il motion blur non è un effetto ma la firma della velocità, il testo in italic non è uno stile ma l'inclinazione di un corpo che corre. Nike, Adidas, Under Armour hanno costruito empire comunicative su questo principio: la grafica deve trasmettere la sensazione fisica dell'atleta nel momento di massima performance. Il "guizzo" è che questo sistema funziona anche per brand non sportivi che vogliono comunicare energia, ambizione, e velocità di esecuzione — startup, eventi, prodotti tech.

## Touchstone
- Nike "Just Do It" campaigns — diagonal crop, athlete in motion, pure energy
- Adidas Originals graphic tees — bold italic, stripes, three colors max
- Red Bull visual identity — giallo e rosso, impatto immediato, adrenalina grafica

## Registro Sensoriale
- **Suono:** crowd di stadio, colpo di starter gun, beat EDM da allenamento, respiro accelerato
- **Tatto:** tessuto dry-fit che scivola, suola di running shoe su asfalto, muscoli contratti
- **Temperatura:** caldissima — adrenalina, sforzo fisico, calore del sole su campo da gioco
- **Odore:** erba sintetica, linimento sportivo, plastica di scarpa nuova, sudore di prestazione

## Cosa Funziona
- Tutti gli elementi inclinati di 7-15° (testo, immagini, rettangoli) — lo skew è il DNA del movimento
- Motion blur sull'immagine atletica nella direzione del movimento (blurX o blurY)
- Palette di 2-3 colori: nero/bianco come base + bolt lime (#C8FF00 o simile) o arancio neon come accento
- Headline in Extended Bold Italic — i caratteri larghi e inclinati massimizzano l'impatto

## Trappole Comuni (Cosa NON fare)
- **NON** usare elementi orizzontali o verticali come struttura principale — la diagonale è la legge
- **NON** usare palette pastello o toni smorzati — lo sport richiede saturazione al massimo
- **NON** usare font serif o rounded — solo sans-serif extended bold italic, la geometria angolare

## Palette OKLCH (Logica e Range)
```
bg:      L < 12%, C 0 (nero assoluto)
         oppure L 95-100%, C 0 (bianco per varianti chiare)
         → La base neutrale estrema da cui l'accento esplode.

primary: L 80-92%, C 0.32-0.42, H 100-110
         → Bolt lime / Electric lime. Il colore dell'adrenalina digitale.

secondary: L 60-72%, C 0.28-0.38, H 38-52
           → Arancio fuoco. Alternativa al lime per brand più "caldi".

text:    opposto al bg (bianco su nero, nero su bianco)
         → Massimo contrasto — nel design sportivo non c'è compromesso
```

## Tipografia (Linee Guida)
- **Display:** Extended Bold Italic o Condensed Black Italic, fontWeight 900. Inclinato di default.
- **Carattere:** le lettere devono sembrare "tirate" dalla velocità — lettere larghe + italic = effetto massimo
- **Scala:** spietata — headline 100-180px, supporting text 12-14px, niente in mezzo
- **Tracking:** stretto o negativo sui display (-0.02 a -0.04) — le lettere si comprimono come un muscolo in tensione

## Implementazione Fabric.js
```json
BG:       { "type": "rect", "fill": "#000000" }
Headline: { "fontFamily": "Selected_Extended_Black", "fontWeight": "900", "fontStyle": "italic", "skewX": -8, "letterSpacing": -0.03, "textTransform": "uppercase" }
AccentRect: { "type": "rect", "fill": "oklch(0.86 0.38 105)", "angle": -8 }
AthleteImg: { "type": "image", "effects": ["motion_blur_h", "contrast_boost"], "angle": -5 }
SpeedStripe: { "type": "line", "stroke": "oklch(0.86 0.38 105)", "strokeWidth": 3, "angle": -8 }
```
**Effetti ammessi:** `motion_blur`, `contrast_boost`, `sharpen`
**Effetti vietati:** `soft_shadow`, `gradient_soft`, `glow_neon`, `bloom`

## Layout + Baricentro
- **Negative space:** 15–25% — composizioni dense, energia compressa
- **Baricentro:** punto di massima velocità — in genere verso l'angolo inferiore-destro (direzione di corsa)

## Rubrica Score
- **70:** Colori corretti ma elementi dritti, nessun motion blur, font non italic
- **80:** Diagonali presenti, palette corretta, atleta o soggetto in movimento
- **90:** Tutto inclinato, motion blur, stripes di velocità, impatto immediato
- **95+:** Chi guarda sente l'adrenalina prima di leggere — la velocità è trasmessa graficamente con precisione fisica

## Layout Variazioni (scegli 1 in base al contenuto)

### LV-A: ATHLETE DIAGONAL — brand sportivo, event poster, campagna
**Struttura:** atleta (o soggetto in movimento) con motion blur inclinato 10°; headline ultra-bold italic in primo piano; banda diagonale lime come separatore tra atleta e BG; brand name in angolo in lime piccolo
**Elementi chiave:** immagine con motion_blur e angolazione, banda diagonale lime, headline Condensed Black Italic, brand logo in angolo
**Baricentro:** l'atleta — la banda e il testo sono la firma grafica
Minimo 9 elementi

### LV-B: STRIPE SYSTEM — streetwear, product shot, e-commerce
**Struttura:** sfondo nero; 3-4 stripes diagonali di spessore variabile in lime (2px, 6px, 2px, 10px) che tagliano il canvas; prodotto scontornato che sfonda le stripes; headline verticale laterale
**Elementi chiave:** 3-4 line diagonali lime, prodotto centrale senza sfondo, headline rotated 90° laterale, pattern di stripes come firma stilistica
**Baricentro:** il prodotto — le stripes lo inquadrano in diagonale
Minimo 11 elementi

### LV-C: IMPACT NUMBER — countdown, achievement, statistical claim
**Struttura:** grande numero (record, statistica, countdown) in Extended Bold Italic lime fontSize 250-350px; sfondo nero; sotto il numero: contesto in bianco 20px; striscia orizzontale lime h: 4px sotto il numero
**Elementi chiave:** numero gigante lime italic, striscia separatrice, contesto testo bianco, possibile motion blur sul numero stesso
**Baricentro:** il numero — è la dichiarazione e il design insieme
Minimo 6 elementi

### LV-D: DUAL RACE — comparazione, sfida, evento competitivo
**Struttura:** canvas diviso diagonalmente (non verticalmente) in nero (sx) e bianco (dx); soggetto/atleta 1 sulla sx in lime, soggetto/atleta 2 sulla dx in arancio; headline che sfonda la diagonale
**Elementi chiave:** divisore diagonale (rect ruotato), 2 soggetti con colori accento diversi, headline che attraversa, VS o numero gara al centro
**Baricentro:** la linea diagonale — la tensione della competizione
Minimo 12 elementi

## Divieti Assoluti (specifici di questo movimento)
❌ Mai elementi orizzontali o verticali puri come struttura — la diagonale è non negoziabile
❌ Mai font serif, rounded, o "morbido" — solo extended bold italic, sempre
❌ Mai palette pastello o toni smorzati — la saturazione è al massimo, il contrasto è assoluto
❌ Mai composizione "bilanciata" — l'equilibrio è statico, questo design è cinetico
❌ Mai assenza di motion nel soggetto — che sia blur, angolazione, o skew, il soggetto è sempre in movimento
