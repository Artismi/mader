---
type: design_recipe
mood: digital-brutalism
client_type: avantgarde_gallery_or_tech_startup
score: 91
tags: [beton-brut, struttura-esposta, overflow, bordi-netti, anti-ornamento, raw, web-default]
---

# Digital Brutalism — La Ribellione Funzionale

## L'Anima del Design (Il Guizzo)
Il Brutalismo digitale eredita dal béton brut di Le Corbusier l'etica della struttura esposta: non nascondere le impalcature, mostrale come architettura. Ma nel design grafico, questo diventa qualcosa di più radicale — un rifiuto deliberato di tutto ciò che è "ottimizzato", "user-friendly", "levigato". Il "guizzo" è nell'alienazione produttiva: il design deve far sentire all'utente il peso della struttura, la freddezza del materiale. I font non-ottimizzati, gli overflow intenzionali, i blocchi monolitici di colore piatto — tutto è sbagliato nel modo giusto.

## Touchstone
- Architettura Barbican, Londra — béton brut come estetica e filosofia
- Early-web brutalism (Craigslist, Bloomberg Terminal) — funzionalità esposta come stile
- Zaha Hadid Architects — la struttura che diventa ornamento per se stessa

## Registro Sensoriale
- **Suono:** silenzio di server farm, click secco di tastiera meccanica, avviso di sistema
- **Tatto:** calcestruzzo non levigato, superfici ruvide e fredde, monitor CRT con lo sfarfallio
- **Temperatura:** fredda, industriale, ospedaliera — antiseptica come un laboratorio
- **Odore:** plastica riscaldata di circuiti, polvere di cemento, inchiostro laser

## Cosa Funziona
- Overflow tipografico intenzionale: titoli 150–220pt che escono dai margini senza pudore
- Bordi netti 2–4px ovunque, zero border-radius, zero morbidezza
- Font "non-ottimizzati" come scelta artistica: Arial, Times New Roman, Courier, Impact
- Blocchi monolitici di colore solido che si scontrano senza transizioni

## Trappole Comuni (Cosa NON fare)
- **NON** aggiungere border-radius o transizioni CSS — la morbidezza è il nemico del brutalismo
- **NON** cercare l'armonia cromatica — i colori si scontrano volutamente, è la feature, non il bug
- **NON** ottimizzare la leggibilità — un certo grado di tensione visiva è necessario e cercato

## Palette OKLCH (Logica e Range)
```
bg:      L 88-92%, C 0
         → Grigio cemento grezzo, béton brut digitale.

primary: L 38-45%, C > 0.30, H 245-258
         → Blu hyperlink non stilizzato, colore del web primitivo.

accent:  L 85-92%, C > 0.18, H 92-100
         → Giallo allarme acido. Rottura violenta del grigio neutro.

text:    L < 10%, C 0
         → Nero assoluto, non stilizzato. Come testo di default del browser.
```

## Tipografia (Linee Guida)
- **Headline:** Font non ottimizzato, impatto visivo brutale. Helvetica Black, Impact, Arial Black. 150–220pt.
- **Body:** Times New Roman o Courier 14–16pt — estetica volutamente "non-designata"
- **Tracking:** 0 o negativo schiacciato. L'aria è un lusso che il brutalismo non si concede.

## Implementazione Fabric.js
```json
BG:       { "type": "rect", "fill": "var(--bg-color)" }
Headline: { "fontFamily": "Arial Black", "fontWeight": "900", "fontSize": 180, "overflow": "visible", "clipPath": "none" }
Block:    { "type": "rect", "fill": "var(--primary)", "rx": 0, "ry": 0, "strokeWidth": 3, "stroke": "#000" }
Border:   { "type": "rect", "fill": "transparent", "strokeWidth": 4, "stroke": "#000000" }
```
**Effetti vietati:** `blur`, `soft_shadow`, `glow`, `gradient`, `border_radius` — la morbidezza è un tradimento

## Layout + Baricentro
- **Negative space:** 20–30% — riempito da forme a blocchi monolitici, non aria designata
- **Baricentro:** spostato orizzontalmente, composizione che sembra su punto di collasso

## Rubrica Score
- **70:** Font non-ottimizzato usato, ma layout convenzionale e bilanciato
- **80:** Overflow presente, blocchi monolitici, palette corretta
- **90:** Struttura deliberatamente esposta, testo che sfonda i margini, alienazione visiva
- **95+:** Genera disagio produttivo: l'osservatore è costretto a fare i conti con la struttura nuda del design

## Layout Variazioni (scegli 1 in base al contenuto)

### LV-A: RAW BLOCK COLLISION — homepage hero, manifesto brand, identità avanguardia
**Struttura:** tre o quattro rect monolitici di colore diverso si scontrano senza margini — blocco grigio cemento (bg), blocco blu hyperlink (60% dx), blocco giallo allarme (striscia orizzontale in mezzo); headline nera che sfonda tutti i confini
**Elementi chiave:** rect senza rx/ry, headline overflow visible fontWeight 900 fontSize 180-220px, 1 rettangolo bounding box con stroke nero 4px, nessun elemento arrotondato
**Baricentro:** decentrato e instabile — il punto di scontro tra i blocchi è il fulcro
Minimo 11 elementi

### LV-B: TEXT OVERFLOW — poster evento, titolo sezione, social post aggressivo
**Struttura:** titolo scavalca completamente i bordi del canvas (overflow visible); il testo è l'immagine; sfondo grigio cemento; singola parola chiave o numero gigante (fontSize 320-400px) come elemento dominante assoluto
**Elementi chiave:** headline tagliata dal bordo del canvas in almeno 1 direzione, corpo testo Times New Roman 14px sotto come contrasto, 1 solo rettangolo di colore (non più di 30% superficie)
**Baricentro:** la massa tipografica trabocca — il baricentro è fuori canvas
Minimo 5 elementi (brutalismo = underdesign intenzionale)

### LV-C: WEB DEFAULT — landing page retro, parody, design critico
**Struttura:** Times New Roman nero su bianco; blue hyperlinks non stilizzati; bordi grigi standard; struttura a 2 colonne come un documento HTML del 1997 senza CSS
**Elementi chiave:** testo Times New Roman 16px su sfondo bianco puro, "link" in blu #0000EE underlined, sottile border grigio 1px intorno ai blocchi, un singolo blocco di colore come rottura
**Baricentro:** flush-left assoluto, come un documento web primitivo
Minimo 8 elementi

### LV-D: STRUCTURE EXPOSED — brand identity system, architettura visiva
**Struttura:** griglia strutturale visibile come elemento di design (border 1px nero su ogni cella della griglia); contenuto dentro le celle senza padding; coordinate numerate in corpo 8px su ogni intersezione
**Elementi chiave:** grid lines sempre visibili e parte del design, numeri di coordinate tipografici, 1-2 celle riempite con colore piatto, testo che supera le celle di 10-20px intenzionalmente
**Baricentro:** distribuito sulla griglia — la struttura è l'estetica
Minimo 12 elementi

## Divieti Assoluti (specifici di questo movimento)
❌ Mai border-radius > 0 su qualsiasi elemento — la curva è una bugia, il rettangolo è la verità
❌ Mai gradienti o transizioni — i colori si incontrano nello scontro diretto, non nella sfumatura
❌ Mai font "bello" o premium — Impact, Arial Black, Courier, Times New Roman sono le uniche scelte accettabili
❌ Mai drop-shadow morbido — se c'è ombra, è netta e offset geometrico (4px 4px 0px black)
❌ Mai layout centrato o "bilanciato" — l'equilibrio è il crimine estetico del brutalismo digitale
