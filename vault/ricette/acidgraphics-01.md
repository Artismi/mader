---
type: design_recipe
mood: acid-graphics
client_type: rave_culture_or_psychedelic_brand
score: 87
tags: [acido, psichedelico, vibrazione-cromatica, mutazione, fluido, rave, smiley, neon-acido]
---

# Acid Graphics — La Mutazione Psichedelica e la Vibrazione Cromatica

## L'Anima del Design (Il Guizzo)
L'estetica acid non imita la droga — imita il punto in cui la mente comincia a mettere in dubbio le regole della percezione. Il "guizzo" è la destabilizzazione controllata: colori che vibrano l'uno contro l'altro per incapacità fisiologica dell'occhio di metterli a fuoco simultaneamente, testo che "muta" e si trasforma, forme organiche che sembrano in movimento. Non è caos — è un ordine alternativo. Come un vinile di Detroit Techno: ossessivo, meccanico, ma che ti trasporta altrove.

## Touchstone
- Flyer rave Detroit/Chicago 1988–1992 — la grafica acida originale, fotocopie di fotocopie
- Warp Records sleeves (Aphex Twin era) — psichedelia digitale controllata
- Vaughan Oliver per 4AD Records — organico, oscuro, mutante

## Registro Sensoriale
- **Suono:** kick 909 ossessivo, synth acido Roland TB-303, feedback analogico
- **Tatto:** carta photocopiata fino alla saturazione, flyer piegato mille volte in tasca
- **Temperatura:** fredda di notte, febbre allucinatoria — simultaneamente
- **Odore:** fumo secco di macchina, inchiostro fotocopiatrice surriscaldato, plastica stressata

## Cosa Funziona
- Vibrazione cromatica: accostare colori complementari ad alta saturazione che l'occhio non riesce a "fermare"
- Testo liquefatto: lettere che si fondono, si stirano, si trasformano morfologicamente
- Icone mutanti: lo smiley acido, spirali, occhi che diventano altro, forme biologiche che perdono il contorno

## Trappole Comuni (Cosa NON fare)
- **NON** usare colori desaturati o "raffinati" — l'acid vive nell'ipersaturazione, nel colore che fa male
- **NON** creare layout puliti e leggibili — la leggibilità è negoziabile, la sensazione non lo è
- **NON** usare font "professionali" standard — le lettere devono sembrare in transizione verso altro

## Palette OKLCH (Logica e Range)
```
bg:      L 15-25%, C 0.05-0.10, H 270-290
         → Viola notte profondo. L'oscurità da cui emergono le frequenze.

primary: L 75-85%, C > 0.35, H 95-115
         → Verde acido neon. Il colore che non esiste in natura ma esiste nei rave.

secondary: L 70-80%, C > 0.30, H 310-330
         → Magenta psichedelico. Vibra contro il verde in modo fisiologicamente disturbante.

accent:  L 80-90%, C > 0.30, H 55-70
         → Giallo acido. Un terzo colore per completare la triade della mutazione.

text:    L 90-98%, C 0.02-0.05, H 270-290
         → Quasi bianco con sfumatura viola. Il testo fluttua sul dark background.
```

## Tipografia (Linee Guida)
- **Display:** Font liquefatti, bio-organici, o deformati. Il testo è materia che muta.
- **Effetti ammessi:** Deformazione path (warp), outline multipli sfasati, glitch di colore
- **Leggibilità:** Deliberatamente ridotta — la difficoltà di lettura fa parte dell'esperienza

## Implementazione Fabric.js
```json
BG:       { "type": "rect", "fill": "var(--bg-color)", "effects": ["noise", "scanlines"] }
Headline: { "fontFamily": "Selected_Mutant_Display", "effects": ["warp_wave", "chromatic_aberration"] }
Icon:     { "type": "svg_path", "fill": "var(--primary)", "effects": ["morph_path", "glow_neon"] }
```
**Effetti ammessi (unica ricetta):** `glow_neon`, `chromatic_aberration`, `warp_wave`, `noise`
**Effetti vietati:** `clean_shadow`, `serif_decorative`, `geometric_perfect`

## Layout + Baricentro
- **Negative space:** 20–35% — il dark background è parte dell'oscurità necessaria
- **Baricentro:** fluido e instabile, in continua tensione tra centro e bordi

## Rubrica Score
- **70:** Palette neon usata ma layout convenzionale, font standard
- **80:** Vibrazione cromatica presente, iconografia acid riconoscibile
- **90:** Testo che muta morfologicamente, vibrazione visiva controllata, dark background opprimente
- **95+:** Produce vera dissonanza percettiva; l'osservatore sente fisicamente il movimento e la mutazione

## Layout Variazioni (scegli 1 in base al contenuto)

### LV-A: RAVE FLYER — evento notturno, festa, release musicale
**Struttura:** sfondo viola notte quasi nero; titolo evento in verde acido o magenta psichedelico con effetto warp_wave; smiley o icona mutante al centro scalata ≥ 200px; data/orario in monospace piccolo nell'angolo come testo di sistema; pattern noise su tutto
**Elementi chiave:** sfondo dark L 15-25%, titolo con effects warp_wave, icona acid (smiley deformato, occhio, spirale) scalata grande, data in lowercase monospace, rumore visivo su almeno 2 elementi
**Baricentro:** deliberatamente instabile, come una fotocopia di fotocopia
Minimo 11 elementi

### LV-B: VIBRATION DUEL — editorial provocatorio, copertina magazine underground
**Struttura:** superficie divisa in 2 campi con colori complementari ipersaturi (verde acido sx, magenta dx); testo bianco che sfonda il confine tra i due campi; sfondo dark centrale come "zona di collisione"
**Elementi chiave:** 2 rect di colori complementari L > 70%, C > 0.30, headline bianca che scavalca la divisione, effetto chromatic_aberration sul titolo, piccolo testo body in monospace nell'angolo
**Baricentro:** la linea di frattura al centro — è lì che si crea la tensione fisiologica
Minimo 9 elementi

### LV-C: MUTANT TYPE — poster tipografico, album art, visual identity acid
**Struttura:** testo principale come unico elemento, ma deformato in forme organiche; sfondo dark; lettere che si fondono tra loro, escono dai bordi, si moltiplicano con effetto eco cromatico
**Elementi chiave:** testo con effects warp_wave + chromatic_aberration, 2-3 copie dello stesso testo con offset di 2-4px e colori diversi (eco cromatico), sfondo con noise texture, zero immagini fotografiche
**Baricentro:** il testo è la composizione — non c'è supporto, solo mutazione
Minimo 8 elementi (la semplicità acida è la più destabilizzante)

### LV-D: SPIRAL DESCENT — poster concettuale, lancio, visual essay
**Struttura:** testo disposto in spirale centrifuga che parte dal centro e si espande verso i bordi; colori cambiano progressivamente da giallo acido (centro) a magenta (metà) a viola buio (bordo); sfondo nero assoluto
**Elementi chiave:** testi multipli con angle progressivamente incrementale (0°, 22°, 45°, 67°, 90°...), colori OKLCH con H progressivo 95°→310°→270°, icona o forma organica al centro della spirale
**Baricentro:** il centro della spirale — da lì tutto si irradia e si perde
Minimo 13 elementi (la spirale ne richiede molti per funzionare)

## Divieti Assoluti (specifici di questo movimento)
❌ Mai colori pastello o desaturati — l'acid vive nell'ipersaturazione C > 0.25 sempre
❌ Mai sfondo bianco — il dark background è la condizione necessaria per la vibrazione
❌ Mai font "professionali" neutri — le lettere devono essere in metamorfosi
❌ Mai layout pulito e leggibile — la destabilizzazione percettiva è il prodotto
❌ Mai una sola copia dello stesso elemento — l'eco cromatico, la ripetizione sfasata, la mutazione richiedono strati
