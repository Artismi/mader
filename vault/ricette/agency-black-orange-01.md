---
type: design_recipe
mood: agency-black-orange
client_type: creative_agency_or_bold_startup
score: 91
tags: [nero-arancio, agenzia-creativa, blood-orange, bold, strutturato, confidence, premium-edge]
---

# Agency Black × Orange — Il Potere della Creatività che Non Si Scusa

## L'Anima del Design (Il Guizzo)
Questo è il colore delle agenzie creative che non chiedono permesso. Il nero profondo struttura il mondo, l'arancio sangue lo incendia. Non è l'arancio pop dell'energia drink — è l'arancio bruciato delle città di notte, del metallo incandescente, della creatività nell'atto stesso della creazione. Il "guizzo" è la tensione tra la disciplina architettonica del nero (griglia, struttura, precisione) e l'irruzione dell'arancio come singolo elemento di fuoco. Una sola fiammata rende il nero molto più potente. Usato da agenzie come Wieden+Kennedy, Droga5 — il design che sa ciò che vale senza dirlo.

## Touchstone
- Wieden+Kennedy brand presence — nero strutturato, accento arancio usato con chirurgia
- Pentagram identity work — rigore e impatto cromatico singolo
- Sagmeister & Walsh — gestualità su struttura, colore come evento

## Registro Sensoriale
- **Suono:** jazz urbano sofisticato, beat sincopato in cuffia, silenzio di studio creativo alle 2 di notte
- **Tatto:** carta nera goffrata pesante, acciaio caldo, monitor calibrato anti-riflesso
- **Temperatura:** fredda-strutturata con una singola fonte di calore — il fuoco nell'oscurità
- **Odore:** inchiostro nero premium, caffè nero, aria condizionata di open space creativo

## Cosa Funziona
- Sfondo nero come architettura; arancio sangue come singolo intervento chirurgico su massimo 15% della superficie
- Tipografia bold weight 700-900 in bianco su nero con tracking neutro o leggermente stretto
- Split o band orizzontale arancio che "taglia" una sezione del canvas come accento strutturale

## Trappole Comuni (Cosa NON fare)
- **NON** usare arancio brillante o fluorescente — deve essere blood orange/arancio bruciato (H 25-40, non 55-70)
- **NON** distribuire l'arancio su più del 20% della superficie — la rarità dell'accento è la sua forza
- **NON** usare sfondi chiari — il nero è la condizione necessaria, non un'opzione di contrasto

## Palette OKLCH (Logica e Range)
```
bg:      L 8-14%, C 0.01-0.02, H 250-270
         → Nero quasi puro con lievissima fredda — non è il nero assoluto del lusso,
           è il nero lavorativo dell'agenzia.

primary: L 55-68%, C 0.22-0.32, H 25-42
         → Arancio sangue. Non giallo-arancio, non rosso-arancio: l'incandescente preciso.

text:    L 92-97%, C 0.01, H 60-80
         → Off-white caldo. Non bianco ottico — bianco con sfumatura di carta.

mid:     L 35-45%, C 0.02-0.04, H 260-270
         → Grigio scuro per elementi secondari. Terzo livello senza competere.
```

## Tipografia (Linee Guida)
- **Display:** Sans-serif bold o extended, fontWeight 700-900. Bianco su nero.
- **Accent:** Il testo in arancio usato solo per 1-2 parole chiave — non frasi intere
- **Body:** Sans-serif regular 14-16px, off-white. Leggibilità da premium agency.
- **Tracking:** neutro o leggermente stretto (-0.01 a 0.02) — non il lusso dilatato, non il brutalismo compresso

## Implementazione Fabric.js
```json
BG:      { "type": "rect", "fill": "oklch(0.11 0.015 260)" }
Headline: { "fontFamily": "Selected_Bold_Sans", "fontWeight": "800", "fill": "#EFEFEF", "letterSpacing": -0.01 }
AccentBand: { "type": "rect", "fill": "oklch(0.61 0.27 32)", "height": 6 }
AccentWord: { "fontFamily": "Selected_Bold_Sans", "fill": "oklch(0.61 0.27 32)" }
```
**Effetti vietati:** `gradient_colorful`, `glow_neon`, `texture_rough` — la solidità non ha bisogno di effetti

## Layout + Baricentro
- **Negative space:** 50–60% — le agenzie sanno che il vuoto è professionale
- **Baricentro:** pesante a sinistra o in basso — non centrato, mai casuale

## Rubrica Score
- **70:** Nero e arancio presenti ma arancio usato su troppa superficie, diluite la tensione
- **80:** Arancio come accento chirurgico, tipografia bold, struttura pulita
- **90:** La singola fiammata arancio fa esplodere tutto il nero intorno — effetto multiplicatore
- **95+:** Guarda come una campagna da Grand Prix Cannes — ogni pixel giustifica la sua esistenza

## Layout Variazioni (scegli 1 in base al contenuto)

### LV-A: ACCENT BAND — presentazione agenzia, portfolio hero, brand statement
**Struttura:** sfondo nero; headline grande bianca (fontSize 80-120px fontWeight 800) in alto; banda orizzontale arancio h: 6-12px come separatore chirurgico; body text off-white sotto; nient'altro
**Elementi chiave:** banda orizzontale arancio width 100%, headline flush-left white, body sotto la banda, zero decorazioni
**Baricentro:** la banda arancio — è l'unico calore in un mondo freddo
Minimo 6 elementi

### LV-B: FIRE CORNER — case study header, project presentation
**Struttura:** sfondo nero; angolo inferiore-sinistro con blocco triangolare arancio (come angolo di pagina); headline in bianco in alto; immagine o contenuto principale sopra il triangolo arancio
**Elementi chiave:** rect arancio ruotato che appare come corner, immagine o contenuto principale, headline white weight 800, indicatore (numero progetto o data) in arancio piccolo
**Baricentro:** il corner arancio funge da ancora — tutto "punta" lì
Minimo 9 elementi

### LV-C: ONE WORD STATEMENT — teaser, manifesto agenzia, social statement
**Struttura:** sfondo nero puro; 1-2 parole in bianco fontSize 140-200px fontWeight 900; singola parola chiave in arancio all'interno della frase (stessa riga o riga dedicata); baseline text micro in bianco opacity 0.4
**Elementi chiave:** main word white 900, accent word orange 900 (stesso size), micro text 10px in basso, zero elementi grafici
**Baricentro:** la parola arancio — attira tutto lo sguardo
Minimo 4 elementi

### LV-D: STRUCTURED GRID — capabilities deck, agency website section
**Struttura:** griglia 3 colonne su sfondo nero; ogni card con border arancio 1px; headline card in bianco; body in off-white opacity 0.7; 1 card "selected" con fill arancio e testo nero
**Elementi chiave:** 3+ card con border arancio sottile (1px), 1 card con fill arancio (la featured), body text nei card, label categoria in arancio piccolo uppercase
**Baricentro:** la card arancio piena — guida l'occhio nella griglia
Minimo 12 elementi

## Divieti Assoluti (specifici di questo movimento)
❌ Mai arancio fluorescente o troppo luminoso — deve essere blood orange maturo, non energy-drink
❌ Mai sfondo non-nero — grigio, navy, bianco cambiano completamente il DNA del movimento
❌ Mai arancio su più del 20% del canvas — la rarità dell'accento è la sua potenza
❌ Mai font "creativo" decorativo — la solidità del bold sans è l'identità del movimento
❌ Mai più di 2 colori attivi (bianco + arancio su nero) — ogni colore aggiunto diluisce il messaggio
