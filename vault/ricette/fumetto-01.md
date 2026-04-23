---
type: design_recipe
mood: comic-action
client_type: gaming_brand_or_kids_entertainment
score: 90
tags: [manga, speed-lines, onomatopea, vignette, balloon, kinetic, action, esplosivo]
---

# Comic Action — L'Energia Cinetica e la Grammatica del Fumetto

## L'Anima del Design (Il Guizzo)
Il fumetto non è una forma d'arte statica — è energia congelata nel tempo. Ogni vignetta è un fotogramma estratto dal momento di massima tensione cinematica. Il "guizzo" sta nel tradurre il movimento in grafica: le speed-lines non decorano, trascinano l'occhio; le onomatopee non descrivono, esplodono. Il layout deve generare la stessa adrenalina di una sequenza d'azione — angolazioni dinamiche, sfondamento dei bordi della vignetta, testo che aggredisce lo spazio.

## Touchstone
- Jack Kirby, Fantastic Four — "Kirby Krackle", dinamismo e composizione esplosiva
- Katsuhiro Otomo, Akira — speed lines e prospettiva estrema
- Frank Miller, Sin City — contrasto massimo bianco/nero, tagli cinematici

## Registro Sensoriale
- **Suono:** CRASH! BOOM! POW! — l'onomatopea come suono fisico nell'aria
- **Tatto:** carta newsprint leggermente ruvida, copertina cartonata brillante
- **Temperatura:** calda e adrenalinica, come una sala giochi alle tre del pomeriggio
- **Odore:** inchiostro di stampa fresco su carta economica, cellofan di copertina appena aperto

## Cosa Funziona
- Speed lines convergenti verso un punto focale (prospettiva radicale a 1 punto di fuga)
- Onomatopee come elementi grafici primari: "BOOM", "CRASH", "ZAP" con dimensioni ipertrofiche e prospettiva 3D
- Vignette con bordi che si sfondano: personaggi o elementi che escono dalla cornice nera

## Trappole Comuni (Cosa NON fare)
- **NON** usare layout statici a griglia regolare — ogni pannello deve avere una diversa angolazione e dimensione
- **NON** usare palette pastello o toni smorzati — l'energia richiede saturazione alta e contrasto netto
- **NON** centrare le composizioni — il dinamismo nasce dallo squilibrio e dall'instabilità compositiva

## Palette OKLCH (Logica e Range)
```
bg:      L 90-100%, C 0
         → Bianco carta da stampa. Base per i contrasti estremi.

primary: L 45-60%, C > 0.28, H 20-35
         → Rosso azione puro. Il colore dell'urgenza e dell'impatto.

secondary: L 60-75%, C > 0.25, H 85-100
         → Giallo energia. Accento esplosivo per onomatopee e highlights.

accent:  L 40-55%, C > 0.22, H 240-260
         → Blu notte. Per ombre nette e profondità piatta.

text:    L < 8%, C 0
         → Nero inchiostro assoluto. Contorni, bordi vignette, balloon text.
```

## Tipografia (Linee Guida)
- **Onomatopee:** Font cartoon ultra-bold con deformazione prospettica (skew + scale). Massima espressività.
- **Balloon text:** Font leggibile ma informale, mai serif classico. Possibilmente con variazione di spessore.
- **Caption boxes:** Font condensed, uppercase, nei riquadri narrativi in alto nei pannelli.

## Implementazione Fabric.js
```json
BG:       { "type": "rect", "fill": "var(--bg-color)" }
SpeedLine: { "type": "radial_lines", "count": 40, "origin": "focal_point", "stroke": "#000", "opacity": 0.8 }
Headline: { "fontFamily": "Selected_Comic_Bold", "fontWeight": "900", "skewX": -10, "textTransform": "uppercase", "stroke": "#000", "strokeWidth": 5 }
Balloon:  { "type": "speech_bubble", "tailDirection": "bottom-left", "stroke": "#000", "strokeWidth": 3 }
```
**Effetti vietati:** `gradient_smooth`, `blur`, `soft_shadow` — tutto deve essere netto, veloce, esplosivo

## Layout + Baricentro
- **Negative space:** 10–20% — composizioni dense con molti elementi in conflitto
- **Baricentro:** instabile e multiplo, in movimento verso il basso-destra (direzione di lettura naturale)

## Rubrica Score
- **70:** Colori giusti, font informale, ma composizione statica e priva di energia
- **80:** Speed lines presenti, onomatopee integrate, vignette con variazione
- **90:** Sfondamento delle vignette, prospettiva dinamica, testo che aggredisce lo spazio
- **95+:** Chi guarda sente fisicamente il movimento — la grafica esplode letteralmente fuori dal formato

## Layout Variazioni (scegli 1 in base al contenuto)

### LV-A: ACTION SPREAD — gaming brand, event announcement, social post energico
**Struttura:** sfondo bianco; radial speed-lines convergenti verso il punto di impatto (40-60 linee da bordo verso centro); onomatopea principale (BOOM/CRASH/POW) fontSize 200px in prospettiva 3D al centro; immagine piccola confinata in un pannello nell'angolo; caption box in alto-sx
**Elementi chiave:** radial_lines procedurale come sfondo, headline onomatopea skewX -10° fontWeight 900 stroke nero 5px, pannello nell'angolo con border nero 3px, caption rect nero con testo bianco uppercase
**Baricentro:** il punto di impatto delle speed-lines — tutto converge lì
Minimo 12 elementi

### LV-B: PANEL GRID — storytelling sequenziale, tutorial, processo in step
**Struttura:** 4-6 pannelli di dimensioni diverse (no griglia uguale) con bordi neri 3px; il pannello principale occupa 50% del canvas; gli altri 3-5 distribuiti come in una pagina di fumetto autentica; angoli non-rettangolari (leggermente inclinati)
**Elementi chiave:** pannelli con dimensioni variabili e angoli asimmetrici, bordo nero 3px su ogni pannello, numero di pannello nell'angolo superiore in corpo 10px, 1 elemento che sfonda il bordo di un pannello
**Baricentro:** il pannello principale — gli altri li circondano come satelliti
Minimo 14 elementi

### LV-C: IMPACT POSTER — lancio prodotto, event hero, copertina
**Struttura:** personaggio o soggetto principale in diagonale dinamica (ruotato 5-15°); background di speed-lines dietro il soggetto; titolo in corner nell'angolo opposto al soggetto; colori primari (rosso, giallo, blu) come unica palette; bordo esterno dell'intera composizione
**Elementi chiave:** immagine inclinata su asse diagonale, speed-lines dirette dall'immagine verso l'angolo opposto, title rect nell'angolo opposto, border esterno canvas 3px nero
**Baricentro:** il soggetto in diagonale — il polo magnetico della composizione
Minimo 10 elementi

### LV-D: BALLOON CONVERSATION — social media, brand storytelling, UX comic
**Struttura:** 2-3 speech balloon di forma diversa (round, angular, thought-cloud) con testo al loro interno; frecce di indicazione verso "personaggi" (anche solo astrazioni visive); sfondo neutro con qualche pattern lineare
**Elementi chiave:** balloon shapes (rect arrotondato o ellipse con "coda"), testo leggibile inside, colori diversi per ogni interlocutore, linee di indicazione a V, caption box informativo in fondo
**Baricentro:** distribuito tra i balloon — la conversazione è il layout
Minimo 11 elementi

## Divieti Assoluti (specifici di questo movimento)
❌ Mai layout statico con composizione centrata e ferma — ogni pannello deve avere tensione direzionale
❌ Mai palette pastello o toni smorzati — il fumetto d'azione vive nel contrasto primario pieno
❌ Mai font serif elegante o sans-serif neutro per le onomatopee — solo font comics bold con stroke
❌ Mai immagini senza bordo/contorno — il pannello è definito dai suoi bordi neri
❌ Mai speed-lines assenti in composizioni action — sono il segnale grammaticale del genere
