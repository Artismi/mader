# Mini contesti per lo Studio AI

Brief pronti da incollare nella chat AI di **Progettazione** (`npm run dev:electron`).
Ogni brief usa solo ciò che il canvas sa disegnare davvero:

- **Tipi elemento:** `text`, `rect`, `circle`, `image`, `path`, `line`, `procedural`
- **Forme (`shapeId`):** Swiss Cross, Acid Sun, Jagged Star, Fluid Wave, Amoeba, Melting Disc, Organic Mesh, Soft Portal, Sphere Wire, Iso Cube, Planet Ring, Prism 3D, Atom Core, Diamond Geo, Brackets duo, Focus Mark, Rule Bold, L - Corner, Crosshair, Blob 1, Blob 2, Squiggle, Ink Splat, Hexagon, Star
- **Pattern procedurali:** halftone, dot_grid, wave_lines
- **Effetti:** 3d, glass, clay, neon, glitch, riso, bloom, chrome, holo, vhs, outline, halftone
- **Immagini:** generate con `generateAIImage` (servizio esterno, serve la rete)

Consiglio: prima incolla un brief, poi prova le modifiche "chirurgiche" sotto ciascuno per
verificare che l'AI ritocchi gli elementi esistenti invece di rifare tutto.

---

## 1. Lancio caffè specialty — post Instagram

```
Tavola 1080x1080, post Instagram per "Tostatura Nera", torrefazione artigianale a Bologna.
Lancio del nuovo blend "Notte Etiope".
Mood: caldo, notturno, premium ma non lussuoso.
Palette: sfondo #1A1410, accento rame #C8763A, testo crema #F2E6D0.
Font: titolo "Playfair Display" 110px corsivo, label "Montserrat" 16px maiuscolo letterSpacing 0.2.
Elementi: foto generata di chicchi di caffè su pietra scura con luce radente (metà inferiore),
titolo "Notte Etiope" in alto, label "NUOVO BLEND · 250G", forma "Melting Disc" rame dietro il titolo
con opacità 0.25, pattern dot_grid leggero in alto a destra, effetto bloom sulla foto.
```
Ritocchi: *"Porta il titolo a 130px e spostalo 40px più in basso"* · *"Cambia il rame in #B5562B"*

## 2. Studio di architettura — slide di apertura

```
Slide 1920x1080 per la presentazione di "Atelier Linea", studio di architettura a Milano.
Titolo: "Abitare il vuoto". Sottotitolo: "Concorso Residenze Navigli · 2026".
Stile svizzero/brutalista: griglia 12 colonne visibile nei margini, molto spazio bianco.
Palette: sfondo #EDEBE6, testo #111111, un solo accento rosso #E2341D.
Font: "Archivo Black" 80px per il titolo, "Archivo Narrow" 28px per il resto.
Elementi: forma "Swiss Cross" rossa piccola in alto a sinistra, linea sottile orizzontale a 2/3,
"Rule Bold" sotto il titolo, numero pagina "01" in basso a destra, forma "Iso Cube" grande a destra
con opacità 0.15.
```
Ritocchi: *"Allinea il sottotitolo alla colonna 7"* · *"Elimina il cubo"*

## 3. Serata techno — story evento

```
Story 1080x1920 per "SUBSTRATO", serata techno al Link di Bologna, sabato 14 novembre, dalle 23:00.
Line-up: KAVINSKA, DORIAN VEX, MOTA B2B LIRA.
Mood: rave notturno, acido, rumore digitale.
Palette: sfondo #050505, verde acido #B6FF00, magenta #FF2BD6.
Font: titolo "Rubik Glitch" 140px, line-up "Space Mono" o "Nova Mono" 36px maiuscolo.
Elementi: titolo verticale centrato con effetto glitch, forma "Acid Sun" verde grande dietro
con effetto neon, pattern wave_lines magenta nella parte bassa, data e luogo in basso,
forma "Crosshair" piccola negli angoli.
```
Ritocchi: *"Scambia i colori: magenta per il sole, verde per le onde"*

## 4. Ceramista — carosello 3 slide

```
Carosello Instagram di 3 tavole 1080x1350 per "Terra Mossa", ceramista indipendente in Toscana.
Tema: "Come nasce una tazza" — 1) Argilla 2) Tornio 3) Cottura.
Mood: artigianale, morbido, tattile.
Palette: sfondo #E9DCC8, terracotta #B4552D, testo #3B2A20.
Font: "Cormorant Garamond" per i titoli (90px), "Montserrat" 24px per il testo.
Ogni slide: numero grande "01/02/03" in terracotta con opacità 0.2, titolo, una frase di
due righe, forma organica ("Blob 1", "Blob 2", "Amoeba") diversa per ogni slide con effetto clay,
foto generata a tema nella metà superiore.
```
Ritocchi: *"Nella slide 2 accorcia il testo a una riga"*

## 5. App fintech — banner pubblicitario

```
Banner 1200x628 per "Salvadana", app di risparmio per under 30.
Headline: "Metti da parte senza pensarci." CTA: "Scarica l'app".
Mood: fresco, ottimista, pulito, un tocco 3D.
Palette: gradiente lineare 135° da #5B3CFF a #00D1B2, testo bianco, CTA su rettangolo bianco
con testo #5B3CFF e borderRadius 40.
Font: "Bebas Neue" 72px headline, "Montserrat" 22px CTA.
Elementi: forma "Planet Ring" e "Sphere Wire" a destra con effetto glass e holo,
headline e CTA a sinistra allineati a colonna 1, piccolo logo testuale "salvadana" in alto a sinistra.
```
Ritocchi: *"Rendi la CTA più grande del 20%"*

## 6. Festival di poesia — poster A4

```
Poster A4 verticale 794x1123 per "Versi Fuori Posto", festival di poesia urbana, Napoli, 3–5 ottobre.
Mood: editoriale, risograph, carta stampata.
Palette: sfondo #F4EFE6, blu riso #1F4BFF, rosa riso #FF5C8A.
Font: titolo "Abril Fatface" 72px su 3 righe, info "Barlow Condensed" 18px.
Elementi: pattern halftone blu grande in diagonale, titolo rosa con effetto riso sovrapposto,
forma "Squiggle" e "Ink Splat", blocco info in basso con date, luogo e "ingresso libero".
```
Ritocchi: *"Sposta il blocco info in alto a destra"*

## 7. Personal brand — cover LinkedIn

```
Tavola 1584x396 (cover LinkedIn) per Andrea, graphic designer e art director freelance.
Testo: "Identità visive che si ricordano." + "artismidesignstudio.com".
Mood: sobrio, sicuro, editoriale.
Palette: sfondo #0F0F10, testo #FAFAFA, accento #FFB000.
Font: "Archivo Black" 56px, "Montserrat" 18px.
Elementi: lascia vuoto il quarto sinistro (lì va la foto profilo), testo allineato a destra,
"Brackets duo" ambra attorno alla parola "ricordano", linea sottile ambra sotto l'URL.
```

## 8. Ristorante — menu del giorno (story)

```
Story 1080x1920 per "Osteria Due Lune", menu del giorno.
Primo: Tagliatelle al ragù bianco · Secondo: Guancia brasata al Sangiovese · Dolce: Zuppa inglese.
Mood: tradizione rivisitata, caldo, tipografico.
Palette: sfondo #7A1E1E, testo #F7E9D7, dettagli #D9A441.
Font: "Playfair Display" per le portate (52px), "Montserrat" 18px maiuscolo per le etichette
PRIMO / SECONDO / DOLCE.
Elementi: due cerchi sovrapposti in alto (le due lune) in ocra con opacità diverse,
linee sottili tra le portate, "Oggi in cucina" in alto, orari in basso.
```

## 9. Schema concettuale (test del bug)

```
Fammi uno schema del funnel di acquisizione clienti per uno studio creativo:
Contenuti social → Portfolio → Call conoscitiva → Preventivo → Progetto → Referral.
```
Atteso oggi: lo schema compare in chat ma **non** sul canvas (vedi analisi: `generateConceptualSchema`
non è in `CANVAS_TOOLS`).

## 10. Stress test — modifica senza ricreare

Dopo uno qualsiasi dei brief sopra:

```
Leggi lo stato del canvas e senza cancellare nulla:
1) aumenta il contrasto del testo secondario,
2) allinea tutti i testi al margine sinistro di 80px,
3) elimina l'elemento decorativo più piccolo.
```
Verifica che usi `getCanvasState` → `updateCanvasElements` → `deleteElements` e non `clearBoard`.

---

### Note
- Le parole "crea" + "poster/post/slide…" possono deviare la richiesta alla crew Python
  (porta 8765). Se la crew è attiva, oggi la risposta potrebbe risultare vuota per il formato
  di stream non compatibile: in quel caso riprova con la crew spenta.
- Le dimensioni non standard (1080x1350, 1584x396) sono accettate: lo schema prende `width`/`height` liberi.
