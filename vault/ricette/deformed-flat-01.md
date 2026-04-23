---
type: design_recipe
mood: deformed-flat-persona
client_type: indie_brand_app_illustration_youth_culture
score: 86
tags: [deformed, flat-design, personaggio, thick-outline, proportions-off, mellow, indie, 2-colori, naif]
---

# Deformed Flat Persona — La Deformazione come Empatia e il Naif come Sofisticazione

## L'Anima del Design (Il Guizzo)
C'è una distinzione cruciale tra "disegno sbagliato" e "deformed flat persona". Il primo è incompetenza. Il secondo è una scelta sofisticata: proporzioni deliberatamente distorte (testa troppo grande, arti troppo corti, espressione leggermente fuori centro) creano personaggi che sembrano usciti da un sogno morbido — riconoscibili come umani ma privi dell'ansia di essere realistici. Il "guizzo" è che questa deformazione comunica **accessibilità e calore** che il design "corretto" non può raggiungere. Le figure con outline spessa in 2-3 colori teneri parlano alla parte infantile dell'osservatore — quella che non difende confini, non analizza, sente solo. Questo stile è usato da app, brand youth, illustratori indie che vogliono abbattere la distanza psicologica.

## Touchstone
- Tove Jansson, Moomins — forme morbide, palette limitata, caratteri emotivamente ricchi
- Jean Jullien illustrations — deformazione consapevole, humor tranquillo
- Yoakis brand illustration — personaggi indie moderni, 2-3 colori, thick outline

## Registro Sensoriale
- **Suono:** musica indie folk morbida, ambient chill, silenzi confortanti
- **Tatto:** pastello su carta, pupazzo di lana riempito, libro illustrato per bambini con pagine spesse
- **Temperatura:** tiepida e neutra — come una domenica pomeriggio senza programmi
- **Odore:** carta non patinata, pastello ceroso, lana lavata

## Cosa Funziona
- Personaggi con testa occupante 35-45% dell'altezza totale (proporzioni chibi-mellow)
- Outline uniforme spessa 3-6px — non varia lo spessore come nei fumetti, è piatta e regolare
- 2-3 colori teneri + nero per l'outline: non pastello luminoso (è troppo kawaii) ma tonalità smorzate-mellow
- Espressioni minimali — 2 punti per occhi, una curva per bocca. Meno c'è, più funziona

## Trappole Comuni (Cosa NON fare)
- **NON** aggiungere ombreggiature o shading — tutto è flat, la luce non esiste in questo universo
- **NON** usare più di 3 colori di fill (+ nero) — la palette limitata è ciò che li rende coerenti
- **NON** cercare le proporzioni "corrette" — la deformazione è intenzionale, la correzione sarebbe il tradimento

## Palette OKLCH (Logica e Range)
```
bg:      L 90-96%, C 0.03-0.06, H variabile (caldo: 60-80, neutro: 180-220)
         → Tono base mellow e tenero. Né bianco puro né pastello sgargiante.

primary: L 60-75%, C 0.08-0.14, H variabile per brand
         → Fill principale del personaggio. Saturo abbastanza da essere presente ma non aggressivo.

secondary: L 70-82%, C 0.06-0.10, H complementare al primary
           → Secondo fill per abbigliamento, capelli, accessori.

accent:  L 55-70%, C 0.12-0.18, H terziario
         → Terzo colore opzionale per dettagli piccoli.

outline: L < 12%, C 0
         → Nero per tutti i contorni. Uniforme, senza variazione di spessore.
```

## Tipografia (Linee Guida)
- **Display:** Font arrotondato e naif — deve "assomigliare" al personaggio in termini di carattere
- **Corpo:** Sans-serif leggero o rounded per micro-testi
- **Nessuna aggressività tipografica** — il font non compete con il personaggio, lo accompagna

## Implementazione Fabric.js
```json
BG:       { "type": "rect", "fill": "oklch(0.93 0.05 70)" }
Body:     { "type": "ellipse", "fill": "oklch(0.68 0.12 30)", "stroke": "#0A0A0A", "strokeWidth": 5 }
Head:     { "type": "circle", "fill": "oklch(0.82 0.06 55)", "stroke": "#0A0A0A", "strokeWidth": 5, "scaleX": 1.1 }
Eye_L:    { "type": "circle", "fill": "#0A0A0A", "r": 4 }
Mouth:    { "type": "path", "stroke": "#0A0A0A", "strokeWidth": 2.5, "fill": "transparent" }
```
**Effetti vietati:** `gradient`, `shadow_realistic`, `highlight`, `texture`, `glow` — la flat-ness è assoluta

## Layout + Baricentro
- **Negative space:** 35–50% — il personaggio ha bisogno di spazio per respirare
- **Baricentro:** il personaggio — il testo o gli altri elementi sono il contesto

## Rubrica Score
- **70:** Personaggio presente ma proporzioni standard, shading, più di 4 colori
- **80:** Deformazione leggera, outline uniforme, palette limitata
- **90:** Deformazione consapevole, espressione minimale ma empatica, palette coesa
- **95+:** Il personaggio sembra "vivere" — chi guarda vuole sapere come si chiama

## Layout Variazioni (scegli 1 in base al contenuto)

### LV-A: CHARACTER SOLO — brand mascot, app onboarding, social avatar
**Struttura:** sfondo colore tenue; personaggio centrato-alto occupante 50-60% del canvas; testo in basso con headline rounded; nessun altro elemento tranne 1-2 elementi di "ambiente" minimalissimi (pianticella, nuvola, punto)
**Elementi chiave:** personaggio deformed con 2-3 colori, testo rounded bold sotto, 1-2 props ambientali minimali, sfondo colore mellow
**Baricentro:** il personaggio — tutto il resto è contorno
Minimo 9 elementi

### LV-B: SCENE COMPOSITION — illustrazione narrativa, brand storytelling
**Struttura:** 2-3 personaggi di dimensioni diverse che interagiscono; ambiente stilizzato (terreno piatto, cielo minimalista); testo come "etichetta" descrittiva o nuvoletta dialogo
**Elementi chiave:** 2-3 personaggi deformed, ambiente flat (rect semplice per terreno, cerchio per sole), balloon dialogo se necessario, micro testo descrittivo
**Baricentro:** il gruppo di personaggi — la scena è lo spazio intorno
Minimo 14 elementi

### LV-C: PATTERN CHARACTER — packaging, surface design, textile print
**Struttura:** personaggio o elemento deformed ripetuto in pattern su sfondo; orientazioni diverse; spaziatura regolare; 2 colori per le varianti del personaggio
**Elementi chiave:** personaggio o elemento base, ripetuto 6-9 volte con rotazioni diverse, colori alternati (variante A e variante B), sfondo tenue
**Baricentro:** il pattern distribuito — nessun baricentro, è superficie
Minimo 12 elementi

### LV-D: EMOTION SPECTRUM — app UI, emotional journey, rating system
**Struttura:** fila di 4-5 personaggi in scala di espressioni (da triste a felice); ognuno con colore leggermente diverso seguendo l'emozione (grigio-blu per triste, giallo-verde per felice); label mini sotto ognuno
**Elementi chiave:** 4-5 personaggi deformed con espressioni diverse, colori che "camminano" dallo smorzato all'acceso, label testo micro sotto ognuno, connecting line sottile tra di loro
**Baricentro:** il centro della fila — il personaggio neutro è il punto di equilibrio
Minimo 14 elementi

## Divieti Assoluti (specifici di questo movimento)
❌ Mai shading, highlight, o ombreggiature — flat means flat, nessuna dimensione
❌ Mai proporzioni anatomicamente corrette — la deformazione è la scelta, la correzione è il tradimento
❌ Mai più di 3 colori di fill (+ nero outline) — la palette limitata è la coerenza visiva
❌ Mai font aggressivo o geometricamente freddo — il font deve avere la stessa "dolcezza" del personaggio
❌ Mai outline di spessore variabile — l'outline è uniforme e meccanica, non calligrafica
