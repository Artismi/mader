---
type: design_recipe
mood: magazine-cutout
client_type: fashion_editorial_or_youth_culture
score: 92
tags: [ritaglio, collage, cutout, asimmetrico, crop-marks, editorial, magazine, fisico, materiale]
---

# Magazine Cutout — Il Collage Editoriale e la Fisicità del Ritaglio

## L'Anima del Design (Il Guizzo)
Il cutout magazine è la grammatica del collage editoriale elevata a sistema. Non si tratta di fotografie ben inquadrate — si tratta di soggetti "strappati" dalla realtà e riposizionati su nuovi fondi, con cropping aggressivo, angolazioni non convenzionali, e il segno fisico della mano che taglia. Le crop mark (i segni di taglio tipografici a "L" negli angoli) non sono ornamento — sono la firma del processo materiale che permane nel digitale. L'asimmetria non è casualità ma scelta: il soggetto centrato non è mai al centro geometrico, ma al centro dell'interesse narrativo. La tensione tra il soggetto scontornato (vivo, tridimensionale) e il fondo piatto (morto, grafico) è il motore estetico.

## Touchstone
- British Vogue, editori anni '90 — scontorno aggressivo, collage, energy cruda
- i-D Magazine face covers — composizione istantanea con wink, soggetto dominante
- Terry Richardson editorials — taglio diretto, nessun mediazione estetica

## Registro Sensoriale
- **Suono:** forbici che tagliano carta lucida, pagine di rivista sfogliate velocemente
- **Tatto:** bordi irregolari di carta strappata, superficie patinata della foto ritagliata, sfondo di cartoncino
- **Temperatura:** a temperatura ambiente da studio fotografico — neutrale, professionale, diretto
- **Odore:** colla stick, carta patinata, pennarello permanente per le crop marks

## Cosa Funziona
- Soggetto scontornato scalato grandi (occupa 50-70% del canvas) senza sfondo
- Crop marks (segni "L" in nero, spessore 1px, lunghezza 12-20px) negli angoli della composizione
- Testo in box asimmetrici con angolazioni diverse (-5° a +8°) che si sovrappongono parzialmente al soggetto
- Sfondo con colore piatto o pattern semplice — mai fotografia come sfondo

## Trappole Comuni (Cosa NON fare)
- **NON** usare immagini con sfondo visibile — il soggetto deve essere scontornato, fisicamente "estratto"
- **NON** centrare il soggetto geometricamente — va posizionato asimmetricamente seguendo il momentum visivo
- **NON** usare font troppo pesante o aggressivo — il cutout style è editoriale, non streetwear brutalista

## Palette OKLCH (Logica e Range)
```
bg:      L 92-100%, C 0-0.05, H qualsiasi
         → Sfondo neutro o leggermente colorato — la "pagina" su cui i ritagli esistono.
           Può essere bianco, crema, o un colore piatto tenue.

primary: L 40-70%, C 0.20-0.35, H variabile per mood del brand
         → Il colore del testo-box o dell'elemento grafico che "inquadra" il soggetto

accent:  L 50-65%, C 0.25-0.35, H 20-40 (o brand color)
         → Un singolo accento saturo per la crop mark o 1 elemento

text:    L < 15%, C 0
         → Nero per tutti i testi e le crop marks
```

## Tipografia (Linee Guida)
- **Display:** Sans-serif medium-bold, non aggressivo. È editoriale, non streetwear.
- **Caption/body:** Sans-serif leggero o serif classico in corpo piccolo 12-14px
- **Angolazione:** i testi possono essere ruotati leggermente (-5° to +8°) per sembrare "appoggiati" sul layout
- **Box di testo:** visibili come elementi fisici (con fill o border), non testo floating invisibile

## Implementazione Fabric.js
```json
BG:         { "type": "rect", "fill": "var(--bg-color)" }
Subject:    { "type": "image", "removeBackground": true, "effects": ["none"], "scaleX": "large" }
TextBox:    { "type": "rect", "fill": "var(--primary)", "angle": -3, "rx": 0 }
TextInBox:  { "fontFamily": "Selected_Editorial_Sans", "fontWeight": "600", "fill": "#FFFFFF" }
CropMark_TL: { "type": "path", "stroke": "#000", "strokeWidth": 1, "data": "M 0 15 L 0 0 L 15 0" }
CropMark_TR: { "type": "path", "stroke": "#000", "strokeWidth": 1, "data": "M -15 0 L 0 0 L 0 15" }
```
**Effetti ammessi:** `remove_background` sul soggetto, leggero `drop_shadow` per staccare il soggetto dal fondo
**Effetti vietati:** `full_bleed_photo_bg`, `gradient_complex`, `heavy_texture`

## Layout + Baricentro
- **Negative space:** 30–45% — il soggetto domina ma non soffoca
- **Baricentro:** il soggetto scontornato — posizionato asimmetricamente verso il punto di "spinta" del soggetto

## Rubrica Score
- **70:** Soggetto presente ma non scontornato, crop marks assenti, layout centrato
- **80:** Soggetto scontornato, almeno 2 crop marks, text box angolato
- **90:** Asimmetria reale, soggetto che sfonda il confine con il text box, proporzioni editoriali
- **95+:** Sembra una pagina strappata da una rivista di moda top — il digitale scompare, rimane il fisico

## Layout Variazioni (scegli 1 in base al contenuto)

### LV-A: PORTRAIT TAKEOVER — editorial ritratto, brand ambassador, copertina
**Struttura:** soggetto (persona) scontornato centrato-alto, scala 70% del canvas; fondo colore piatto; text box angolato in basso con titolo/nome; crop marks ai 4 angoli del canvas
**Elementi chiave:** immagine scontornata grande, 4 crop marks posizionate ai margini, text box ruotato -4° con fill brand color, testo bianco nel box, piccola caption micro in basso
**Baricentro:** il soggetto — il text box è il piedistallo
Minimo 10 elementi

### LV-B: COLLAGE EDITORIAL — spread magazine, moodboard, brand world
**Struttura:** 3-4 soggetti scontornati di dimensioni diverse sovrapposti e distribuiti asimmetricamente; sfondo neutro o lievemente colorato; testi come "etichette" su ognuno; overlap strategico tra i soggetti
**Elementi chiave:** 3-4 immagini scontornate con posizioni e scale diverse, sovrapposizioni parziali, text label su ognuno, 1 elemento grafico (linea o rect piccolo) come connettore
**Baricentro:** distribuito tra i soggetti — l'occhio si muove seguendo i soggetti
Minimo 14 elementi

### LV-C: PRODUCT CUTOUT — e-commerce editoriale, product announcement
**Struttura:** prodotto scontornato scalato grande in diagonale leggera; fondo monocromo; titolo prodotto in font editoriale; prezzo o CTA in text box angolato; crop marks come firma editoriale
**Elementi chiave:** prodotto senza sfondo con drop_shadow leggero, titolo flush-left, text box angolato per prezzo/CTA, crop marks decorative
**Baricentro:** il prodotto — posizionato nel terzo destro per spazio testo a sinistra
Minimo 9 elementi

### LV-D: L-CROP COMPOSITION — teaser, intro section, copertina minimale
**Struttura:** soggetto scontornato nel quadrante destra-alto; grande spazio bianco sx; headline in basso-sx in caratteri editorial; crop marks L negli angoli vicini al soggetto; nessun altro elemento
**Elementi chiave:** soggetto nel quadrante destro, headline editoriale in basso-sx, 2-3 crop marks negli angoli prossimi al soggetto, bilanciamento tra massa soggetto e vuoto architettonico
**Baricentro:** il soggetto — il vuoto è il contrappeso
Minimo 7 elementi

## Divieti Assoluti (specifici di questo movimento)
❌ Mai immagini con sfondo visibile — il soggetto è sempre estratto, mai in una "scena"
❌ Mai font aggressivo o streetwear — il cutout è editoriale, il tono è fashion magazine non gaming
❌ Mai simmetria geometrica del soggetto — l'asimmetria è il codice genetico del movimento
❌ Mai sfondo fotografico come campo — solo colori piatti o texture minimali come carta
❌ Mai assenza di crop marks — sono la firma del processo, il "questa è una pagina costruita" manifesto
