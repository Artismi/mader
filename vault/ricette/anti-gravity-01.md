---
type: design_recipe
mood: anti-gravity-minimal
client_type: premium_product_wellness_design_studio
score: 96
tags: [zero-rumore, bianco, levità, autorità-calma, prodotto, floating, gradiente-sottile, breathing]
---

# Anti-Gravity — Il Design che Non Pesa Nulla e Comanda Tutto

## L'Anima del Design (Il Guizzo)
C'è un paradosso nel design a gravità zero: più si alleggerisce, più acquista autorità. Questo non è minimalismo svizzero (che è rigore matematico) né lusso dark (che è potere nel buio) — è qualcosa di più sottile: la **calma assoluta come dichiarazione di superiorità**. Il soggetto galleggia perché non ha bisogno di appoggiarsi a niente. Il testo respira perché sa che ti avvicinerai tu. L'accento cromatico è un gradiente così tenue che quasi non lo vedi — e proprio per questo non lo dimentichi. È il design di prodotti che costano abbastanza da non doverlo dire. Di studi di design che non devono spiegarsi. Di brand che esistono come concetto prima che come oggetto.

## Touchstone
- Braun product photography (Dieter Rams era) — bianco, prodotto, nient'altro
- Muji catalog — spazio vuoto come valore, prodotto come meditazione
- Bang & Olufsen advertising — levità, precisione, silenzio visivo

## Registro Sensoriale
- **Suono:** silenzio assoluto, poi un singolo suono puro (nota musicale, click preciso)
- **Tatto:** superficie ceramica levigata, carta cotton 300g non patinata, vetro satinato opaco
- **Temperatura:** neutra, leggermente fresca — come l'aria di uno spazio bianco vuoto
- **Odore:** niente — l'assenza di odore è un odore in questo universo

## Cosa Funziona
- Background bianco o quasi-bianco (L 97-100%) con gradiente radiale estremamente tenue (opacity 0.06-0.12)
- Prodotto o soggetto scontornato che "galleggia" con ombra lunga e morbidissima (blur 40-60px, opacity 0.08)
- Zero elementi decorativi — ogni elemento deve essere il soggetto, la sua ombra, o il testo che lo descrive
- Accento cromatico quasi invisibile (un punto, una linea 0.5px) in un colore morbido

## Trappole Comuni (Cosa NON fare)
- **NON** aggiungere elementi "per completare" la composizione — il vuoto è il prodotto principale
- **NON** usare ombre dure o visibili — l'ombra qui è la prova della levità, non del peso
- **NON** usare colori saturi o contrastanti — anche il singolo accento deve mormorare, non gridare

## Palette OKLCH (Logica e Range)
```
bg:      L 97-100%, C 0-0.01, H qualsiasi
         → Bianco quasi puro. Può avere una lievissima tinta (C < 0.01) per warmth.

subject: il prodotto o soggetto porta i suoi colori naturali — non si alterano
         → Il prodotto è la verità, il BG è lo spazio che lo accoglie.

accent:  L 60-80%, C 0.04-0.10, H variabile (brand color molto desaturato)
         → L'accento è quasi impercettibile. Esiste come whisper, non come voce.

shadow:  L 80-90%, C 0-0.02, H 220-240
         → Ombra grigio-azzurra leggerissima (opacity 0.06-0.10, blur 40-60px)

text:    L 20-35%, C 0.01-0.02, H 240-260
         → Grigio scuro ma non nero. Il testo è presenza discreta, non dichiarazione.
```

## Tipografia (Linee Guida)
- **Display:** Font light o thin, non serif necessariamente ma possibile. La leggerezza nel peso è letterale.
- **Body:** Corpo piccolo (13-14px), interlinea generosa (1.7-2.0x), off-black non nero
- **Tracking:** leggermente dilatato sui display (0.04-0.08em) — il testo respira
- **Nessuna urgenza tipografica** — nessun uppercase aggressivo, nessun fontWeight 900

## Implementazione Fabric.js
```json
BG:       { "type": "rect", "fill": "oklch(0.99 0.005 210)", "effects": ["radial_gradient_breath"] }
Subject:  { "type": "image", "removeBackground": true, "effects": ["ultra_soft_shadow"], "opacity": 1 }
Shadow:   { "type": "ellipse", "fill": "oklch(0.85 0.01 230)", "opacity": 0.07, "blur": 50, "scaleX": 1.8, "scaleY": 0.3 }
Headline: { "fontFamily": "Selected_Light_Sans", "fontWeight": "300", "fill": "oklch(0.28 0.015 250)", "letterSpacing": 0.05 }
AccentLine: { "type": "line", "stroke": "oklch(0.70 0.06 250)", "strokeWidth": 0.5, "opacity": 0.6 }
```
**Effetti ammessi:** `radial_gradient_breath` (ultra tenue), `ultra_soft_shadow`, `grain` (opacity < 0.02)
**Effetti vietati:** `hard_shadow`, `glow`, `texture_visible`, `gradient_colorful`, `any_decoration`

## Layout + Baricentro
- **Negative space:** 65–85% — il vuoto è il 70% del messaggio
- **Baricentro:** il soggetto, posizionato con precisione — mai al centro geometrico, mai casuale

## Rubrica Score
- **70:** Sfondo bianco ma ombra dura, elementi decorativi, font non light
- **80:** Soggetto galleggiante, ombra morbida, composizione pulita
- **90:** Accento quasi invisibile ma percepito, vuoto architettonico, levità totale
- **95+:** Chi guarda rallenta — l'autorità calma del design si trasmette fisicamente come pace visiva

## Layout Variazioni (scegli 1 in base al contenuto)

### LV-A: PRODUCT FLOAT — luxury product, wellness brand, design studio
**Struttura:** bianco totale; prodotto scontornato al centro leggermente in alto con ombra ellittica sotto (opacity 0.07, blur 50px); tagline thin sotto; brand name micro in basso; nient'altro
**Elementi chiave:** prodotto senza sfondo, ombra ellittica ghostlike, tagline font light 18px, brand in corpo 10px, zero altri elementi
**Baricentro:** il prodotto — nel campo vuoto è assoluto
Minimo 5 elementi

### LV-B: BREATH SPLIT — brand statement, service presentation
**Struttura:** bianco; headline thin e spaziosa a sinistra (tracciato dilatato +0.08em); immagine o prodotto a destra senza sfondo; campo vuoto abbondante tra i due; accento linea sottilissima come divisore (opacity 0.3)
**Elementi chiave:** headline thin left-aligned, immagine right-aligned, linea divisoria 0.5px tenue, body text sotto headline in corpo 13px
**Baricentro:** il vuoto tra headline e immagine — la tensione è nell'assenza
Minimo 7 elementi

### LV-C: RITUAL GRID — wellness, mindfulness, process in step
**Struttura:** griglia 3 colonne molto ariosa (gap enorme tra le colonne); ogni colonna con 1 piccola icona lineare + titolo thin + micro descrizione; tutta la composizione respira
**Elementi chiave:** 3 colonne con gap ≥ 60px, icone lineari thin stroke (1-1.5px), titoli font light, micro descriptions corpo 12px, zero bordi o sfondi nelle celle
**Baricentro:** il gap tra le colonne — la struttura è l'aria, non le celle
Minimo 10 elementi

### LV-D: SINGLE TRUTH — brand manifesto, tagline hero, opening page
**Struttura:** bianco assoluto; 1 frase in font light centrata o posizionata con precisione asimmetrica; nient'altro. Zero prodotti, zero immagini, zero decorazioni. Solo le parole.
**Elementi chiave:** 1-2 righe di testo font light tracking 0.06em, 1 singolo accento (linea 0.5px o punto 6px) come firma discreta
**Baricentro:** il testo — nel vuoto assoluto è tutto
Minimo 2 elementi

## Divieti Assoluti (specifici di questo movimento)
❌ Mai ombre visibili o dure — l'ombra deve essere così morbida da sembrare aria
❌ Mai elementi decorativi di qualsiasi tipo — ogni aggiunta riduce il valore percepito
❌ Mai colori saturi — anche il singolo accento è desaturato e discreto
❌ Mai font bold o heavy — la leggerezza tipografica è letterale, non metaforica
❌ Mai densità compositiva — se ci sono più di 8 elementi visibili, il design non è ancora pronto
