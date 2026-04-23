---
type: design_recipe
mood: mincho-handwritten
client_type: japanese_aesthetic_artisanal_premium_quiet
score: 90
tags: [mincho, serif-giapponese, handwriting, annotation, wabi-sabi, silenzio, inchiostro, carta, architettura-bianca]
---

# Mincho × Handwritten — La Struttura del Serif e il Gesto dell'Inchiostro

## L'Anima del Design (Il Guizzo)
La Mincho è il serif giapponese — nasce dalla calligrafia a pennello ma è stata formalizzata in un sistema tipografico di precisione architettonica. Le sue grazie sottili come capelli, i contrasti spietati tra aste orizzontali fini e verticali pesanti, evocano l'inchiostro che si asciuga sulla carta di riso. Il "guizzo" di questo movimento è la **coesistenza di due tempi**: il tempo lento e deliberato del carattere Mincho (fissato, istituzionale) e il tempo improvviso del handwriting (gesto, momento, impermanenza). Un titolo in Mincho su sfondo bianco è architettura. Un'annotazione a mano libera accanto ad esso è umanità. Insieme sono il wabi-sabi del design — la perfezione che contiene visibilmente le sue imperfezioni.

## Touchstone
- Muji brand identity — silenzio visivo, carta, minimalismo poetico
- Japanese literary magazine covers — Mincho display, handwritten subtitle
- Noritake illustration — linee sottili, spazio bianco enorme, gesto

## Registro Sensoriale
- **Suono:** pennello che scivola su carta di riso, tè che viene versato, silenzio di stanza vuota
- **Tatto:** carta washi leggermente ruvida, pennino di penna stilografica, copertina di libro rilegato a mano
- **Temperatura:** fresca e quieta — come un mattino in uno studio di calligrafia
- **Odore:** inchiostro sumi-e, carta di riso, legno di paulonia

## Cosa Funziona
- Carattere Mincho o serif editoriale alto contrasto come display (aste orizzontali sottili, verticali pesanti)
- Annotazioni handwriting in corsivo o brush font che "dialogano" con il testo strutturato
- Spazio bianco abbondante — la composizione respira come una pagina di haiku
- Elementi calligrafici (tratti di pennello, punti di inchiostro) come texture o divisori

## Trappole Comuni (Cosa NON fare)
- **NON** usare font sans-serif come display — la Mincho è l'anima tipografica, non si sostituisce
- **NON** riempire lo spazio — il wabi-sabi richiede aria; la densità distrugge la poesia
- **NON** usare colori vivaci — la palette è quasi monocromatica, la ricchezza è nella qualità del bianco e del nero

## Palette OKLCH (Logica e Range)
```
bg:      L 95-99%, C 0.01-0.03, H 55-75
         → Bianco-crema caldo della carta washi. Non bianco ottico.

ink:     L 8-20%, C 0.02-0.04, H 240-260
         → Nero-blu sumi-e. Non nero assoluto — l'inchiostro ha profondità.

primary: L 35-50%, C 0.15-0.22, H 240-255
         → Indaco scuro — il colore dell'inchiostro giapponese denso.

accent:  L 45-60%, C 0.18-0.26, H 15-30
         → Rosso vermiglio timbro (hanko). L'unico accento caldo, usato con parsimonia.

mid:     L 55-70%, C 0.01-0.03, H 60-80
         → Grigio carta — per elementi secondari e annotazioni meno urgenti.
```

## Tipografia (Linee Guida)
- **Display Mincho:** Noto Serif JP, Shippori Mincho, o qualsiasi serif alto contrasto. Corpo ≥ 72px per display.
- **Handwriting layer:** Caveat, Klee, o Zen Kurenaido per le annotazioni. Corpo 14-20px.
- **Il dialogo tra i due:** headline Mincho strutturata + annotazione handwriting quasi-sussurrata = la tensione
- **Tracking display:** leggermente dilatato (+0.04-0.08em) — la Mincho ha bisogno di aria

## Implementazione Fabric.js
```json
BG:       { "type": "rect", "fill": "oklch(0.97 0.02 65)", "effects": ["paper_texture_subtle"] }
Headline: { "fontFamily": "Shippori Mincho", "fontWeight": "700", "fill": "oklch(0.14 0.03 250)", "letterSpacing": 0.06 }
Annotation: { "fontFamily": "Caveat", "fontWeight": "400", "fill": "oklch(0.14 0.03 250)", "opacity": 0.75, "angle": -2 }
InkStroke: { "type": "path", "stroke": "oklch(0.14 0.03 250)", "strokeWidth": 1.5, "opacity": 0.5, "fill": "transparent" }
HankoAccent: { "type": "rect", "fill": "oklch(0.50 0.22 22)", "opacity": 0.9, "angle": -8 }
```
**Effetti ammessi:** `paper_texture_subtle`, `grain` (opacity < 0.04)
**Effetti vietati:** `glow`, `hard_shadow`, `geometric_pattern`, `digital_effects`

## Layout + Baricentro
- **Negative space:** 55–70% — il bianco è il protagonista silenzioso
- **Baricentro:** il punto dove Mincho e handwriting si incontrano o si sfiorano

## Rubrica Score
- **70:** Font serif presente, handwriting assente, spazio vuoto insufficiente
- **80:** Mincho + handwriting, palette corretta, texture carta leggera
- **90:** Il dialogo tra i due layer è palpabile — architettura e gesto in equilibrio
- **95+:** Chi guarda sente la presenza umana nell'atto tipografico — è silenzio che parla

## Layout Variazioni (scegli 1 in base al contenuto)

### LV-A: POETIC HEADER — editorial giapponese, brand artisanal, copertina
**Struttura:** grande area bianca; headline Mincho in alto-sx (80-100px, flush-left); sotto: annotazione handwriting piccola come "commento" o "traduzione"; hanko rosso come firma nell'angolo opposto; nient'altro
**Elementi chiave:** headline Mincho, annotation Caveat sotto di essa, hanko rect rosso ruotato -8° nell'angolo opposto, sfondo carta
**Baricentro:** la headline — il hanko è il contrappeso nell'angolo opposto
Minimo 6 elementi

### LV-B: DUAL VOICE — brand statement, editorial bilingual
**Struttura:** testo principale in Mincho sx; stessa frase (o frase correlata) in handwriting dx; sottile linea verticale 0.5px tra le due; hanko in basso al centro
**Elementi chiave:** headline Mincho left, annotation handwriting right, divisore verticale sottilissimo, hanko, sfondo washi
**Baricentro:** il divisore verticale — le due voci si fronteggiano
Minimo 7 elementi

### LV-C: ANNOTATED COMPOSITION — lookbook, portfolio, process page
**Struttura:** immagine o elemento principale; sopra: tratti di inchiostro come se "marcassero" l'immagine; annotazioni handwriting distribuite come post-it calligrafici; titolo Mincho in un angolo
**Elementi chiave:** immagine, 3-5 annotazioni handwriting con angolazioni diverse, ink strokes come highlights, titolo Mincho angolo, micro testo di contesto
**Baricentro:** l'immagine — le annotazioni la circondano come pensieri
Minimo 13 elementi

### LV-D: WABI-SABI MINIMAL — brand philosophy, manifesto, opening page
**Struttura:** bianco quasi totale; 1 tratto di pennello irregolare come elemento principale (largo, imperfetto, opacity 0.4); headline Mincho piccola sotto al tratto; 1 hanko nell'angolo; nient'altro
**Elementi chiave:** ink stroke come elemento grafico dominante (opacity 0.35-0.45), headline Mincho 36px sotto, hanko accento, sfondo washi
**Baricentro:** il tratto di pennello — è il soggetto, il testo è la firma
Minimo 5 elementi

## Divieti Assoluti (specifici di questo movimento)
❌ Mai font sans-serif come display — la Mincho è l'identità tipografica invariante
❌ Mai colori vivaci o saturi — la palette è monocromatica con l'unica eccezione del hanko vermiglio
❌ Mai layout denso — lo spazio bianco è il materiale principale
❌ Mai effetti digitali evidenti — la texture deve sembrare fisica, non computazionale
❌ Mai handwriting assente — senza di esso è solo design editoriale pulito, non questo movimento
