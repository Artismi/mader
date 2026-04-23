---
type: design_recipe
mood: art-nouveau
client_type: luxury_botanical_perfume
score: 95
tags: [organico, botanico, ornamentale, whiplash-curve, asimmetrico, lusso]
---

# Art Nouveau — L'Estetica Organica e la Ribellione Botanica

## L'Anima del Design (Il Guizzo)
L'Art Nouveau non decora la pagina, la coltiva. La tipografia non è stampata, ma "cresce" in forme organiche scultoree. L'intento è sedurre, avvolgere lo spettatore in un'eleganza languida e naturale. Devi creare un'asimmetria fluida che guidi l'occhio come un rampicante. La tensione si crea contrastando la linea a "colpo di frusta" (whiplash curve) iper-dettagliata con campiture piatte e silenziose.

## Touchstone
- Alphonse Mucha, "Job" poster (1896) — composizione tipo e figure neoclassiche
- Koloman Moser, illustrazioni Ver Sacrum — palette e legature tipografiche
- Aubrey Beardsley, illustrazioni per Salomé — logica ornamentale e dinamismo

## Registro Sensoriale
- **Suono:** fruscio di foglie d'edera mosse dal vento, musica da camera classica
- **Tatto:** carta pergamena goffrata pesante, superfici organiche morbide al tocco
- **Temperatura:** tiepida, un mattino primaverile
- **Odore:** gigli freschi, incenso leggero, inchiostro litografico

## Cosa Funziona
- Iniziale Drop Cap iper-decorata fusa con illustrazioni botaniche vettoriali che invadono il margine superiore
- Le "whiplash curves" tagliano la composizione partendo dall'alto in una spirale languida
- Body copy allineato seguendo le curve dell'illustrazione, non in un blocco rettangolare matematico

## Trappole Comuni (Cosa NON fare)
- **NON** usare la simmetria assoluta — l'asimmetria è essenziale per infondere dinamismo ed energia
- **NON** riempire ogni centimetro disponibile — lo spazio negativo fa respirare ogni ornamento
- **NON** usare font troppo spigolosi e industriali — distruggono il senso di crescita biologica

## Palette OKLCH (Logica e Range)
```
bg:      L 85-95%, C 0.02-0.05, H 70-90
         → Pergamena tattile, toni caldi terrosi. Mai bianco ottico.

primary: L 40-60%, C 0.10-0.15, H 120-160
         → Toni organici profondi (verde edera), smorzati e misteriosi.

accent:  L 70-80%, C 0.15-0.20, H 40-60
         → Toni metallici caldi come oro antico o senape opaco.

text:    L 20-30%, C 0.05-0.10, H 40-50
         → Marrone terra bruciata. Evitare il nero puro per mantenere morbidezza.
```

## Tipografia (Linee Guida)
- **Display:** Font serif iper-decorati o script con influenze botaniche e legature estreme. Dimensioni ipertrofiche per i capolettera.
- **Body:** Serif classici altamente leggibili. Proporzioni rilassate per senso di ariosità.

## Implementazione Fabric.js
```json
BG:       { "type": "rect", "effects": ["paper_texture", "grain"], "opacity": 1 }
Headline: { "fontFamily": "Selected_Display_Serif", "fontStyle": "italic", "charSpacing": 40 }
Path:     { "type": "curved_path", "strokeWidth": 3, "tension": 0.8 }
```
**Effetti vietati:** `glitch`, `neon`, `pixelate` — incompatibili con la matrice organica e storica

## Layout + Baricentro
- **Negative space:** 40% — non è "vuoto" clinico, ma "aria" vitale che fa respirare l'illustrazione
- **Baricentro:** fluido e organicamente asimmetrico, il peso scivola dall'alto-sinistra verso il basso-destra

## Rubrica Score
- **70:** Palette corretta, ma forme rigide, blocchi di testo rettangolari e asse simmetrico
- **80:** Linee curve fluide, legature tipografiche di base, palette organica
- **90:** Tensione asimmetrica eccellente, perfetta fusione capolettera-ornamenti botanici
- **95+:** L'osservatore viene sedotto; tipografia e illustrazione formano un unico organismo vivente

## Layout Variazioni (scegli 1 in base al contenuto)

### LV-A: BOTANICAL POSTER — poster evento, profumeria, brand botanico
**Struttura:** figura o soggetto centrale circondato da cornici di rampicanti e fiori; titolo in drop-cap calligrafico nella metà superiore
**Elementi chiave:** border ornamentale continuo ai quattro lati (strokeWidth 2-3px, curvo), figura scontornata al centro, drop-cap iper-decorata h ≥ 180px, campo di colore tenue a campiture piatte come sfondo sezione
**Baricentro:** verticalmente centrato con leggera trazione verso l'alto (la "crescita")
Minimo 14 elementi

### LV-B: WHIPLASH SPLIT — copertina editoriale, campagna profumo
**Struttura:** curva whiplash a S divide la superficie in due campi cromatici (pergamena sx, verde edera dx); titolo in serif italic segue la curva; immagine confinata nel campo destro
**Elementi chiave:** path curvo come elemento strutturale divisore (strokeWidth 4-6px), due rect di campo, testo che "abbraccia" la curva, piccola illustrazione botanica nell'angolo opposto come bilanciamento
**Baricentro:** fluido, scivola dall'alto-sinistra al basso-destra lungo la curva
Minimo 12 elementi

### LV-C: DROP CAP EDITORIALE — testo lungo, manifesto, pagina interna rivista
**Struttura:** capolettera occupante 4 righe testo sx; illustrazione botanica fusa con la lettera stessa; body allineato a destra della lettera decorata; piccolo ornamento floreale in fondo come chiusura
**Elementi chiave:** lettera scalata ≥ 300px con fill illustrativo, body text serif 16-18px, ornamento di chiusura linea, nessun rettangolo rigido visibile
**Baricentro:** pesante in alto-sinistra (il capolettera), si alleggerisce scendendo
Minimo 10 elementi

### LV-D: CORNICE & CAMPO — inviti, certificati, packaging premium
**Struttura:** border ornamentale a tutta la pagina (margine 30px), campo vuoto al centro con pochissimi elementi, titolo centrato in basso del campo con tracking dilatato (+0.15em)
**Elementi chiave:** cornice svg-path curvilinea, inner frame rettangolare sottile come secondo livello, 2-3 elementi botanici agli angoli (non simmetrici), testo centrato in posizione bassa
**Baricentro:** distribuzione perimetrale — il centro è aria architettonica
Minimo 11 elementi

## Divieti Assoluti (specifici di questo movimento)
❌ Mai font sans-serif o geometric — anche Futura leggera distrugge l'organicità botanica
❌ Mai angoli retti visibili come elemento estetico — tutto deve curvare, tendere, crescere
❌ Mai più di 4 colori nella stessa palette (bg + primary + accent + text) — la ricchezza viene dalla qualità tonale, non dalla quantità
❌ Mai simmetria assiale perfetta — la natura è bilaterale, non speculare
❌ Mai effetti digitali moderni (glow, neon, glitch) — incompatibili con l'origine litografica del movimento
