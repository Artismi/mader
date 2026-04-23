---
type: design_recipe
mood: memphis-80s
client_type: lifestyle_brand_or_retro_product
score: 88
tags: [memphis, post-modern, geometrico-playful, pattern-clash, anti-funzionale, anni-80, zigzag, pastello-acido]
---

# Memphis Design — Il Post-Modernismo Gioioso e il Pattern Clash

## L'Anima del Design (Il Guizzo)
Memphis è il manifesto del design come gioco. Nel 1981 Ettore Sottsass e il Gruppo Memphis dichiararono guerra al "buon gusto" funzionalista, allo "stile internazionale", alla coerenza. Il "guizzo" è la libertà bambina: prendere un triangolo rosa, un zigzag nero su bianco, un cerchio turchese, un motivo a onde — e metterli insieme senza chiedere il permesso. Non cercare armonia. La bellezza Memphis nasce dal clash, dalla collisione allegra tra pattern che non dovrebbero coesistere ma che insieme diventano festosi e vivaci.

## Touchstone
- Ettore Sottsass, libreria "Carlton" (1981) — la scultura di laminato plastico che cambiò tutto
- Barbara Radice, catalogo Memphis (1981–1988) — il manifesto visivo del movimento
- Keith Haring (influenzato) — linee energetiche, pattern ripetuti, colore come emozione

## Registro Sensoriale
- **Suono:** synth-pop anni '80, Talking Heads, Giorgio Moroder — energico e geometrico
- **Tatto:** laminato plastico brillante, superfici lucide e colorate, formica stampata
- **Temperatura:** tiepida e festiva — come un aperitivo in uno spazio di design milanese
- **Odore:** plastica colorata nuova, vernice lucida fresca, rivista patinata di design

## Cosa Funziona
- Pattern clash: mescolare almeno 3 pattern diversi (zigzag, dots, stripes, squiggles) senza mediazione
- Forme geometriche primarie (cerchio, triangolo, rettangolo) come elementi decorativi autonomi, non funzionali
- Palette che unisce pastello acido (rosa bubble gum, azzurro cielo) con neutri (nero, bianco) e accenti saturi

## Trappole Comuni (Cosa NON fare)
- **NON** cercare coerenza tra i pattern — il clash è il punto, la coerenza sarebbe una resa
- **NON** usare colori "seri" o toni terrosi — Memphis vive nella leggerezza cromatica e nella frivolezza deliberata
- **NON** lasciare troppo spazio vuoto — il minimalismo è l'opposto del DNA Memphis

## Palette OKLCH (Logica e Range)
```
bg:      L 96-100%, C 0
         → Bianco puro. La tela neutra su cui i pattern esplodono.

primary: L 70-80%, C 0.18-0.25, H 320-340
         → Rosa bubble gum acido. Il colore signature degli anni '80.

secondary: L 75-85%, C 0.18-0.22, H 185-200
         → Turchese Memphis. Fresco, plastificato, festivo.

accent1: L 60-70%, C > 0.25, H 25-40
         → Arancio energetico. Il terzo colore che scalda la palette fredda.

accent2: L 10-15%, C 0
         → Nero netto per zigzag, contorni e pattern grafici.
```

## Tipografia (Linee Guida)
- **Display:** Font geometrici bold o condensati. Possono essere colorati o avere pattern interni.
- **Orientamento:** Libertà totale — testo ruotato, inclinato, disposto verticalmente
- **Integrazione:** Il testo è un elemento grafico tra gli altri, non gerarchia separata

## Implementazione Fabric.js
```json
BG:       { "type": "rect", "fill": "#FFFFFF", "effects": ["pattern_zigzag_overlay"] }
Shape:    { "type": "circle", "fill": "var(--primary)", "rx": 0 }
Pattern:  { "type": "pattern_fill", "pattern": "squiggles|dots|stripes|zigzag", "color": "var(--secondary)" }
Headline: { "fontFamily": "Selected_Geometric_Bold", "fontWeight": "700", "angle": -5 }
```
**Effetti vietati:** `blur`, `soft_shadow`, `organic_texture` — tutto è geometrico, tutto è artificiale

## Layout + Baricentro
- **Negative space:** 15–25% — composizioni dense, ma non claustrofobiche come l'anti-design
- **Baricentro:** multiplo e festivo, distribuito tra le forme decorative

## Rubrica Score
- **70:** Palette corretta ma pattern usati singolarmente, senza clash
- **80:** Almeno 2 pattern in clash, forme geometriche decorative
- **90:** Tre o più pattern in collisione armoniosa, testo integrato come elemento grafico
- **95+:** L'osservatore sorride — la gioiosità anti-funzionale di Memphis è palpabile e contagiosa

## Layout Variazioni (scegli 1 in base al contenuto)

### LV-A: PATTERN EXPLOSION — packaging, identità visiva gioiosa, evento festivo
**Struttura:** sfondo bianco; 3 pattern diversi in conflitto (zigzag nero su bianco sotto, dots rosa in alto-dx, stripes turchese verticali sul bordo sx); forme geometriche primarie (cerchio arancio, triangolo nero) come elementi decorativi galleggianti; titolo in font geometrico bold ruotato -5°
**Elementi chiave:** almeno 3 proceduralType diversi (dot_grid, wave_lines, zigzag_fill) in zone diverse, 4-5 forme geometriche autonome con fill primari puri, headline ruotata, nessun elemento centrato
**Baricentro:** multiplo e festivo — l'occhio non sa dove guardare prima, come vuole Memphis
Minimo 16 elementi

### LV-B: SHAPE PARTY — social post, brand lifestyle, art direction 80s
**Struttura:** sfondo bianco; sequenza di forme geometriche di diverse dimensioni sparse in modo pseudo-casuale ma bilanciato; testo integrato tra le forme come se fosse un'altra forma; 1 striscia di pattern orizzontale come ancora compositiva
**Elementi chiave:** circle, rect, triangle in 4+ colori diversi, testo inline tra le forme (non sopra), striscia pattern width 100% come band orizzontale al 40-60% dell'altezza
**Baricentro:** distribuito ovunque — è la composizione festiva
Minimo 14 elementi

### LV-C: MEMPHIS FRAME — copertina libro, box set, packaging premium
**Struttura:** cornice multipla di colori diversi (3-4 nested rect con fill diversi e spessori diversi); campo interno bianco con pochi elementi; titolo centrato nel campo interno (unico momento di centralità ammesso)
**Elementi chiave:** 3 rect annidati con fill diversi (rosa, turchese, arancio, nero alternati), campo interno bianco ≥ 40% del canvas, piccoli elementi geometrici nei "corridoi" tra le cornici, titolo centrato in campo interno
**Baricentro:** il centro del campo interno — la cornice guida l'occhio verso esso
Minimo 12 elementi

### LV-D: GRID CLASH — editorial layout, infographic, manifesto brand
**Struttura:** griglia modulare 3×3 con ogni cella di colore o pattern diverso; titolo occupa 2 celle in alto; immagine in 1 cella; le celle rimanenti con pattern o testo o forme geometriche
**Elementi chiave:** 9 celle distinte senza margini (full-bleed ognuna), almeno 3 celle con pattern, alternanza cromatica non-opposta (vicine si scontrano), numeri nelle celle come labels
**Baricentro:** distribuito sulla griglia con equilibrio caotico
Minimo 15 elementi

## Divieti Assoluti (specifici di questo movimento)
❌ Mai un solo pattern — il clash richiede almeno 3 pattern in coesistenza
❌ Mai palette monocromatica o analogica — Memphis vive nel contrasto tra colori che "non dovrebbero stare insieme"
❌ Mai minimalismo o spazio vuoto abbondante — il minimalismo è il nemico ideologico di Memphis
❌ Mai toni terrosi, muted, o "raffinati" — tutto è brillante, artificiale, plastico
❌ Mai forme organiche o curve libere — la geometria è primaria: cerchio, triangolo, rettangolo, zig-zag
