---
type: design_recipe
mood: street-pink
client_type: streetwear_youth_kawaii_lifestyle
score: 88
tags: [rosa, kawaii, deformed, thick-outline, squishy, streetwear, youth, bubbly, SNS-friendly]
---

# Street Pink — Il Kawaii Deformato e la Morbidezza Aggressiva

## L'Anima del Design (Il Guizzo)
Questa estetica nasce dall'intersezione tra lo streetwear occidentale e il kawaii giapponese — il risultato è qualcosa di paradossale: morbido ma assertivo, infantile ma consapevole, tenero ma irriverente. Il "guizzo" è la **deformazione intenzionale**: le illustrazioni non devono sembrare "corrette" anatomicamente — le proporzioni sono distorte come un peluche che cerca di essere un personaggio di fumetto. I contorni spessi 4-8px in nero danno solidità a forme che altrimenti sembrerebbero dissolversi nella loro morbidezza. Le foto "squishy" (immagini con mask organica dalle curve morbide) eliminano l'angolo retto dall'universo visivo. Questo design è nato per vivere sui telefoni, nei feed social, nelle vetrine di pop-up store.

## Touchstone
- Molly (toy artist) — figure deformed con espressioni fishe, colori pastello saturi
- BAPE × Sanrio — streetwear e kawaii in fusione totale
- Creamy Mami, Cardcaptor Sakura aesthetic — il seme originale dell'estetica

## Registro Sensoriale
- **Suono:** J-Pop bubbly, effetti sonori dei giochi mobile, notifiche morbide di app
- **Tatto:** silicone morbido di phone case, peluche oversize, bubble wrap sottile
- **Temperatura:** tiepida e confortante — come un abbraccio di tessuto morbido
- **Odore:** bubble gum alla fragola, sapone rosa, sticker profumato di cancelleria giapponese

## Cosa Funziona
- Illustrazioni di personaggi con proporzioni chibi (testa grande, corpo piccolo, arti corti)
- Contorni spessi 4-8px in nero su tutto — senza outline il disegno "galleggia" senza peso
- Forme organiche "squishy" come mask per foto: niente angoli, solo curve estreme (borderRadius 40-60%)
- Pattern di stelle, cuori, bollicine, fiori stilizzati come texture di background

## Trappole Comuni (Cosa NON fare)
- **NON** usare font aggressivo o condensed black — il testo deve essere rotondo e morbido
- **NON** lasciare contorni sottili — il thick-outline è l'elemento strutturale, non decorativo
- **NON** usare palette fredda, scura, o neutrale — il rosa deve dominare, i toni devono essere caldi e saturi-pastello

## Palette OKLCH (Logica e Range)
```
bg:      L 92-97%, C 0.06-0.10, H 345-360
         → Rosa bubblegum chiaro. La tela del kawaii.

primary: L 70-80%, C 0.18-0.26, H 340-355
         → Rosa saturo. Il colore dominante del movimento.

secondary: L 85-92%, C 0.08-0.14, H 290-310
           → Lilla pastello. Complemento morbido del rosa.

accent:  L 80-90%, C 0.15-0.22, H 60-75
         → Giallo limone pastello. Terzo colore per stelle e dettagli energia.

text/outline: L < 10%, C 0
         → Nero per tutti i contorni thick e per il testo. Ancora strutturale.
```

## Tipografia (Linee Guida)
- **Display:** Font rounded, bubbly, o con caratteri "grassi" arrotondati. Mai condensed.
- **Carattere emotivo:** possibile uso di Nunito Extra-Bold, Comfortaa, o font Y2K arrotondati
- **Decorazioni tipografiche:** stelle, cuori, punti esclamativi multipli nel testo sono accettati
- **Dimensioni:** moderate — il testo non deve competere con le illustrazioni per dominanza

## Implementazione Fabric.js
```json
BG:       { "type": "rect", "fill": "oklch(0.94 0.08 350)", "effects": ["dot_grid_light"] }
Character: { "type": "svg_deformed", "stroke": "#000", "strokeWidth": 6, "fill": "var(--primary)" }
PhotoMask: { "type": "image", "clipPath": "organic_blob", "borderRadius": 50 }
Pattern:  { "type": "procedural", "proceduralType": "star_scatter", "color": "var(--accent)", "opacity": 0.4 }
Headline: { "fontFamily": "Selected_Rounded_Bold", "fontWeight": "800", "stroke": "#000", "strokeWidth": 3, "fill": "#FFFFFF" }
```
**Effetti ammessi:** dot_grid come pattern BG, organic blob shapes
**Effetti vietati:** `grain_rough`, `hard_edges`, `dark_mode`, `geometric_sharp`

## Layout + Baricentro
- **Negative space:** 20–35% — sufficientemente denso per l'energia kawaii
- **Baricentro:** centrato-alto dove vive il personaggio — il testo è in basso, il personaggio è la stella

## Rubrica Score
- **70:** Rosa usato, ma contorni sottili, forme angolari, font non appropriato
- **80:** Thick outline presenti, palette pastello, forme morbide
- **90:** Deformazione proporzionale kawaii, pattern di stelle/cuori, foto con mask organica
- **95+:** Chi guarda sorride — l'estetica è completamente coerente e irresistibilmente morbida

## Layout Variazioni (scegli 1 in base al contenuto)

### LV-A: CHARACTER HERO — product launch, brand mascot, social post
**Struttura:** personaggio illustrato deformed centrato-alto con thick outline; fondo rosa con pattern stelle; titolo in font rounded sotto il personaggio con stroke nero; cuori o stelle come elementi decorativi sparsi
**Elementi chiave:** character svg con stroke 6px, fondo con star_scatter pattern, titolo rounded bold con outline, 4-6 decorazioni stellate distribuite, photo blob opzionale in angolo
**Baricentro:** il personaggio — tutto il resto è l'ambiente intorno
Minimo 12 elementi

### LV-B: SQUISHY PHOTO — SNS product, lifestyle content, beauty brand
**Struttura:** 1-2 foto con mask organica "blob" (nessun angolo retto); sfondo rosa; titolo bubbly; piccole decorazioni (stelle, cuori) sparsi intorno alle foto
**Elementi chiave:** immagini con clip mask organica borderRadius 45-55%, sfondo pastello, testo rounded, elementi decorativi kawaii small (10-20px) distribuiti come confetti
**Baricentro:** le foto blob — distribuite asimmetricamente
Minimo 11 elementi

### LV-C: STICKER SPREAD — packaging, sticker sheet, pop-up design
**Struttura:** multipli "sticker" (illustrazioni con thick outline) di forme diverse distribuiti su sfondo pastello; ognuno con fill diverso nella palette del movimento; testo piccolo sotto ognuno come "etichetta sticker"
**Elementi chiave:** 5-8 character/icons con stroke spesso, fill diversi nella palette, micro-testo sotto ognuno, fondo pastello con pattern leggero
**Baricentro:** distribuito — è una griglia di sticker, non una composizione
Minimo 14 elementi

### LV-D: PASTEL SPLIT — dual brand, collab announcement, duo content
**Struttura:** canvas diviso in 2 campi pastello complementari (rosa + lilla o giallo pastello); 1 elemento in ogni campo; testo che sfonda il confine tra i due campi; contorno tra i campi come linea spessa bianca o nera
**Elementi chiave:** 2 rect con fill pastello diversi, 1 elemento per campo, headline che attraversa la divisione, divisore spesso (3-5px)
**Baricentro:** la linea divisoria — è il punto di dialogo tra i due mondi
Minimo 10 elementi

## Divieti Assoluti (specifici di questo movimento)
❌ Mai contorni sottili (< 3px) — il thick outline è il principio strutturale fondante
❌ Mai palette fredda, desaturata, o dark — il kawaii vive nei pastello caldi
❌ Mai font aggressivo, condensed, o sharp — ogni font deve avere proporzioni morbide e arrotondate
❌ Mai angoli retti sulle photo mask — le immagini esistono in forme organiche, non rettangoli
❌ Mai composizione seria o "professionale" — la gioiosità è obbligatoria, non opzionale
