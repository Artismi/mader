---
type: design_recipe
mood: manga-style
client_type: gaming_anime_youth_entertainment
score: 89
tags: [manga, anime, japanese, screen-tone, speed-lines, panel, narrative, kinetic, black-white]
---

# Manga Style — L'Informazione come Narrazione Sequenziale

## L'Anima del Design (Il Guizzo)
Il manga non racconta — trascina. Non descrive — fa sentire. Il "guizzo" del manga come sistema di design è la **narratività strutturale**: ogni elemento ha una direzione, una forza, un'intenzionalità cinematica. La tavola manga non mostra un momento — mostra il momento prima, quello durante, e l'eco di quello dopo, tutto nello stesso frame. Screen-tone (i pattern di punti e linee che sostituivano i toni grigi nella stampa tradizionale) non è texture decorativa — è la firma materica del genere. L'uso di speed-lines, espressioni esagerate, bordi di pannello dinamici crea una grammatica visiva potentissima per qualsiasi contenuto che voglia comunicare urgenza, emozione, e movimento.

## Touchstone
- Katsuhiro Otomo, Akira — speed-lines cosmiche, prospettiva estrema
- Naoki Urasawa, Monster — tensione psicologica nel layout dei pannelli
- Hirohiko Araki, JoJo's Bizarre Adventure — pose dinamiche, uso del colore sporadic e potente

## Registro Sensoriale
- **Suono:** WHOOSH! di speed-lines, SFX di kanji onomatopeici, silenzio teso prima di un dialogo
- **Tatto:** carta newsprint leggera del volume tankōbon, copertina plastificata lucida
- **Temperatura:** adrenalinica e immediata — come la prima pagina di un capitolo nuovo
- **Odore:** carta leggera di stampa economica, inchiostro nero denso, resina plastica del volume spillato

## Cosa Funziona
- Screen-tone (dot-pattern regolare o lineare) su aree di ombra e mezzitoni — sostituisce il colore con struttura
- Pannelli asimmetrici con dimensioni variabili che enfatizzano la gerarchia narrativa
- Kanji onomatopeici grandi (effetti sonori come caratteri grafici autonomi) integrati nello sfondo
- Speed-lines direzionali che "tirano" lo sguardo verso il punto di azione

## Trappole Comuni (Cosa NON fare)
- **NON** usare tutti i pannelli della stessa dimensione — il ritmo narrativo richiede variazione drammatica
- **NON** aggiungere colori vivaci su tutto — il manga è B&W con accenti cromatici rarissimi e chirurgici
- **NON** usare font standard per le onomatopee — devono sembrare lettere dipinte, non stampate

## Palette OKLCH (Logica e Range)
```
bg:      L 97-100%, C 0
         → Bianco carta manga. La pagina è la tela neutra.

ink:     L < 8%, C 0
         → Nero inchiostro sumi-e. Contorni, pannelli, capelli, dettagli.

tone:    L 50-70%, C 0
         → Grigio screen-tone. Simulato con dot pattern o hatching per ombreggiature.

accent:  L 45-65%, C 0.25-0.35, H 15-35
         → Rosso sangue. L'unico colore ammesso — usato per sangue, energia, momento critico.

sfx:     L 80-90%, C 0.20-0.28, H 95-105
         → Giallo per SFX/onomatopee di luce/impatto. Secondo colore ammesso raramente.
```

## Tipografia (Linee Guida)
- **Balloon text:** Font comic bold leggibile, mai serif classico. Variazione di spessore per dialogo vs. urlo.
- **SFX Onomatopee:** Font custom o brush-script con stroke, scalate come elementi grafici
- **Caption box:** Monospace o font neutro per narrazione in terza persona — piccolo corpo
- **Scala:** nessun compromesso — i balloon devono essere abbastanza grandi da essere letti chiaramente

## Implementazione Fabric.js
```json
Panel:     { "type": "rect", "fill": "#FFFFFF", "stroke": "#000", "strokeWidth": 3, "rx": 0 }
SpeedLine: { "type": "radial_lines", "count": 50, "stroke": "#000000", "opacity": 0.7 }
Tone:      { "type": "procedural", "proceduralType": "dot_grid", "color": "#888888", "size": 2, "opacity": 0.4 }
SFX:       { "fontFamily": "Selected_Comic_Bold", "fontSize": 120, "stroke": "#000", "strokeWidth": 4, "fill": "#FFE000" }
Balloon:   { "type": "ellipse", "fill": "#FFFFFF", "stroke": "#000", "strokeWidth": 2 }
```
**Effetti ammessi:** `dot_grid` come screen-tone, `radial_lines` per speed-lines
**Effetti vietati:** `gradient_smooth`, `glow_neon`, `soft_shadow`, `color_rich`

## Layout + Baricentro
- **Negative space:** 10–20% — la pagina manga è densa, ma il bianco dei balloon crea respiro
- **Baricentro:** sempre in movimento — segue la direttiva narrativa del pannello principale

## Rubrica Score
- **70:** Pannelli presenti ma uguali, nessun screen-tone, onomatopee come testo normale
- **80:** Pannelli di dimensioni diverse, screen-tone su almeno una zona, 1 SFX grafico
- **90:** Speed-lines direzionali, variazione drammatica dei pannelli, screen-tone integrato
- **95+:** La pagina comunica narratività istantanea — chi guarda capisce il ritmo prima di leggere

## Layout Variazioni (scegli 1 in base al contenuto)

### LV-A: ACTION SPREAD — gaming, entertainment, event announcement
**Struttura:** pannello centrale grande (60-65% del canvas) con azione principale + speed-lines; 2-3 pannelli piccoli intorno come reazione/contesto; SFX onomatopea sovrapposta che sfonda i confini; screen-tone nelle ombre
**Elementi chiave:** pannello principale con speed-lines radiali, 2-3 pannelli border 3px, SFX fontSize 120px con stroke, screen-tone dot_grid nelle aree scure, balloon con dialogo essenziale
**Baricentro:** il pannello principale — le speed-lines lì convergono
Minimo 15 elementi

### LV-B: NARRATIVE GRID — tutorial, processo, storytelling step-by-step
**Struttura:** 6 pannelli in griglia asimmetrica 3+2+1 — 3 piccoli in alto, 2 medi al centro, 1 grande in basso; ogni pannello con contenuto diverso; caption box narrativo in ognuno; bordi neri 3px
**Elementi chiave:** 6 pannelli con proporzioni variabili, caption rect nero testo bianco in ogni pannello, screen-tone diverso per diversi momenti emotivi, balloon dove necessario
**Baricentro:** il pannello grande in basso — la risoluzione narrativa
Minimo 18 elementi

### LV-C: REACTION FACE — social content, meme-adjacent, emotional content
**Struttura:** grande pannello con espressione esagerata del soggetto; linee di espressione irradiate dal viso (esplosione emotiva); SFX verticale laterale; balloon con testo reazione; screen-tone nel BG
**Elementi chiave:** immagine soggetto con crop estremo sul viso, linee radiali dall'espressione, balloon speech nella zona laterale, SFX verticale come colonna laterale
**Baricentro:** il viso — tutto si irradia da esso
Minimo 10 elementi

### LV-D: SPLASH PAGE — poster, copertina, hero image
**Struttura:** immagine o soggetto principale occupa quasi tutto il canvas (80%+); titolo/nome in alto come logo manga; piccola didascalia narrativa in basso; screen-tone nell'area scura dell'immagine
**Elementi chiave:** immagine dominante con outline/ink style, titolo in font manga stilizzato, screen-tone sulle ombre, effetto sketch/ink lines sottili sull'immagine
**Baricentro:** il soggetto — tutto il canvas è la sua scena
Minimo 8 elementi

## Divieti Assoluti (specifici di questo movimento)
❌ Mai pannelli tutti uguali in dimensione — la variazione è il ritmo narrativo
❌ Mai palette colorata piena — il manga è B&W con accenti rarissimi (rosso o giallo, mai entrambi insieme su tutto)
❌ Mai font "neutro" per le onomatopee — sono elementi grafici pittorici, non testo
❌ Mai assenza di screen-tone nelle ombre — senza di esso sembra un coloring book, non manga
❌ Mai composizione "bilanciata" senza direzione narrativa — ogni frame deve avere una freccia compositiva
