---
type: design_recipe
mood: studio-premium-mockup
client_type: tech_product_saas_premium_brand
score: 95
tags: [mockup, apple-aesthetic, electric-purple, acid-yellow, ultra-bold, product-shot, premium-tech, studio]
---

# Studio Premium Mockup — La Presentazione del Prodotto come Opera d'Arte

## L'Anima del Design (Il Guizzo)
Apple ha insegnato al mondo che presentare un prodotto è un atto artistico. Questo stile non imita Apple — lo evolve verso qualcosa di più audace: la palette non è il grigio siderale ma il viola elettrico (#8D59E9) e il giallo acido (#EBE021), combinazione che grida "premium ma non corporate". Il "guizzo" è la **gravità del mockup**: il dispositivo (iPhone, MacBook, tablet) non è appoggiato su uno sfondo — **fluttua**, **cade**, **si inclina** come se la gravità fosse un'opzione di design. La tipografia è ultra-bold non come aggressività ma come **confidenza assoluta** — il prodotto non ha bisogno di spiegarsi, il titolo affermativo è la fine della conversazione. Zero decorazioni, zero flourishes, solo il prodotto e la dichiarazione.

## Touchstone
- Apple Product Launch pages — profondità di sfondo, prodotto in 3D, tipografia hero
- Stripe homepage — viola + testo bold + gradiente pulito
- Linear.app marketing — dark mode purple, premium tech

## Registro Sensoriale
- **Suono:** startup sound di Mac, click preciso di TrackPad, silenzio di sala riunioni premium
- **Tatto:** alluminio anodizzato freddo di MacBook, vetro Ceramic Shield, packaging unboxing premium
- **Temperatura:** fredda e controllata — come uno showroom Apple a temperatura costante
- **Odore:** plastica premium nuova, aria filtrata da sistema HVAC professionale, packaging interno bianco

## Cosa Funziona
- Mockup dispositivo in 3D o con angolazione non-frontale (isometrica o -15°/+15° di tilt)
- Background scuro con gradiente radiale viola-su-nero come "luce di studio"
- Headline ultra-bold (weight 900) in bianco o giallo acido — breve, assertiva, senza punto
- Pallini o accenti in giallo acido usati come highlights o bullet points — mai su più del 10%

## Trappole Comuni (Cosa NON fare)
- **NON** usare mockup frontale piatto — il prodotto deve avere profondità e tridimensionalità
- **NON** aggiungere decorazioni, pattern, o elementi non-funzionali — il minimalismo premium è la firma
- **NON** usare font leggero o thin — l'ultra-bold è la voce del prodotto, non il whisper

## Palette OKLCH (Logica e Range)
```
bg:      L 8-15%, C 0.06-0.12, H 285-300
         → Nero-viola profondo. Il "buio di studio" da cui emerge il prodotto.

primary: L 52-62%, C 0.28-0.38, H 290-305
         → Viola elettrico. L'identità cromatica del movimento.

accent:  L 85-92%, C 0.28-0.36, H 96-106
         → Giallo acido. L'unico colore "caldo" — usato chirurgicamente.

text:    L 95-99%, C 0
         → Bianco puro su background scuro.

gradient: radiale da primary (viola) verso bg (nero) — luce di studio sul prodotto
```

## Tipografia (Linee Guida)
- **Display:** Ultra-bold, weight 900, senza grazie. Brevissimo — 1-5 parole massimo per headline.
- **Tagline:** weight 400-500 in off-white, corpo 16-20px — la dichiarazione secondaria sotto l'headline
- **Feature labels:** uppercase, letterSpacing 0.08-0.12, corpo 11px, colore giallo acido
- **Nessun testo corpo lungo** — le presentazioni premium dicono poco ma bene

## Implementazione Fabric.js
```json
BG:       { "type": "rect", "fill": "oklch(0.10 0.09 293)", "effects": ["radial_gradient_studio"] }
Mockup:   { "type": "image", "angle": -8, "effects": ["3d_tilt", "soft_shadow_deep"], "scaleY": 1.05 }
Headline: { "fontFamily": "Selected_Ultra_Bold_Sans", "fontWeight": "900", "fill": "#F8F8F8", "fontSize": 72 }
AccentDot: { "type": "circle", "fill": "oklch(0.88 0.32 100)", "r": 6 }
Tagline:  { "fontFamily": "Selected_Regular_Sans", "fontWeight": "400", "fill": "oklch(0.75 0.02 290)" }
```
**Effetti ammessi:** `3d_tilt`, `soft_shadow_deep`, `radial_gradient_studio`, `grain` (opacity < 0.03)
**Effetti vietati:** `glow_neon`, `glitch`, `hard_texture`, `complex_pattern`

## Layout + Baricentro
- **Negative space:** 45–60% — il premium si misura nel vuoto intorno al prodotto
- **Baricentro:** il mockup del dispositivo — fluttua nel centro-alto con testo sotto

## Rubrica Score
- **70:** Mockup presente ma frontale piatto, palette non corretta, font non ultra-bold
- **80:** Mockup angolato, background scuro con gradiente, headline bold
- **90:** Profondità 3D credibile, viola+giallo corretti, gerarchia tipografica pulita
- **95+:** Sembra una slide di un Apple Keynote ma più audace — il prodotto non chiede attenzione, la comanda

## Layout Variazioni (scegli 1 in base al contenuto)

### LV-A: FLOATING DEVICE — product hero, app launch, SaaS marketing
**Struttura:** mockup device angolato (-8° a +12°) al centro-basso; gradiente radiale viola come "aura" intorno al device; headline ultra-bold in alto; tagline sotto; accento giallo come "badge" o bullet
**Elementi chiave:** device con 3d_tilt, radial_gradient dietro device, headline 900 bianca, tagline 400 grigio-chiaro, 1-2 accenti gialli piccoli
**Baricentro:** il device — la headline è il peso sopra, la tagline è il commento sotto
Minimo 8 elementi

### LV-B: FEATURE GRID — SaaS features, product page section
**Struttura:** griglia 3 colonne su sfondo viola scuro; ogni cella con icona (o mockup piccolo) + titolo feature bold + micro description; accento giallo sul dot o highlight della feature principale
**Elementi chiave:** 3 card rect con border viola chiaro 1px, icona o mini-mockup, feature title bold, micro description off-white, 1 card "hero" con accento giallo
**Baricentro:** la card "hero" — guida lo sguardo nella griglia
Minimo 12 elementi

### LV-C: BEFORE/AFTER SPLIT — comparazione, upgrade announcement
**Struttura:** canvas diviso verticalmente; sx "prima" con design grezzo/vecchio (semplificato, palette neutra); dx "dopo" con tutto il linguaggio Studio Premium (viola, device 3D, headline bold); titolo che sfonda il divisore
**Elementi chiave:** divisore verticale, 2 ambienti visivi nettamente diversi, headline che attraversa, badge "NEW" in giallo acido
**Baricentro:** il divisore — la tensione tra prima e dopo
Minimo 13 elementi

### LV-D: LAUNCH COUNTDOWN — teaser, pre-launch, event
**Struttura:** sfondo viola profondo; grandi numeri countdown (data) come elemento tipografico dominante in giallo acido; mockup in trasparenza ghost (opacity 0.15-0.25) dietro i numeri; piccolo testo "Coming [date]" in basso
**Elementi chiave:** numeri data in giallo ultra-bold 200px+, mockup ghost opacity 0.2 come texture, testo "Coming Soon" piccolo, accento violetto per il border esterno
**Baricentro:** i numeri della data — il prodotto fantasma è il sottofondo
Minimo 7 elementi

## Divieti Assoluti (specifici di questo movimento)
❌ Mai mockup frontale perfettamente piatto — il 3D o l'angolazione sono obbligatori
❌ Mai palette neutra o "corporate" — viola elettrico e giallo acido sono le coordinate cromatiche invarianti
❌ Mai font leggero o thin per le headline — l'ultra-bold weight 900 è la voce del movimento
❌ Mai elementi decorativi non-funzionali — ogni elemento deve essere o il prodotto o la sua dichiarazione
❌ Mai sfondo chiaro — il "buio di studio" è la condizione necessaria per la luce del prodotto
