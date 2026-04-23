---
type: design_recipe
mood: surveillance-cctv
client_type: dark_documentary_or_critical_design
score: 86
tags: [sorveglianza, cctv, timestamp, panopticon, distorsione, geopolitico, paranoia-visiva, distopia]
---

# Surveillance CCTV — L'Estetica della Sorveglianza e la Paranoia Visiva

## L'Anima del Design (Il Guizzo)
La telecamera di sorveglianza non mente. Non interpreta. Non ha estetica. Registra. Questa neutralità meccanica assoluta è paradossalmente l'estetica più carica di potere — perché implica un osservatore invisibile con accesso totale. Il "guizzo" è trasformare questa sorveglianza in linguaggio di design: il timestamp nell'angolo non è decorazione, è il segno del controllo; la distorsione fish-eye non è un effetto, è la prospettiva del potere; il verde notte non è un colore, è la firma tecnologica della visibilità asimmetrica.

## Touchstone
- Trevor Paglen, fotografie di sorveglianza governativa — l'arte come denuncia del visibile
- Adam Harvey, CV Dazzle — anti-surveillance come estetica e resistenza
- Film: "1984" (1984), "Enemy of the State" — la grammatica visiva della sorveglianza nell'immaginario

## Registro Sensoriale
- **Suono:** hiss di nastro magnetico, bip di sensore di movimento, silenzio disturbante con frequenza elettrica
- **Tatto:** monitor CRT con pixel visibili, plastica grigia di housing da telecamera, metallo freddo
- **Temperatura:** fredda e asettica — non ostile, semplicemente indifferente
- **Odore:** plastica vecchia di elettronica degli anni '90, aria stantia di sala controllo

## Cosa Funziona
- Timestamp nell'angolo inferiore: `[CAM_04] 2026-04-16 03:47:22` in monospace verde su nero
- Fish-eye distortion: leggera deformazione barrel che ricorda la prospettiva delle telecamere a circuito chiuso
- Green phosphor overlay: tutto visto attraverso la pellicola verdastra dello schermo notturno

## Trappole Comuni (Cosa NON fare)
- **NON** usare colori saturi e vibranti — la sorveglianza esiste in un mondo desaturato, quasi monocromatico
- **NON** creare composizioni "belle" o equilibrate — la telecamera di sorveglianza non cura la composizione
- **NON** usare font decorativi — solo monospace, come output di sistema

## Palette OKLCH (Logica e Range)
```
bg:      L 8-15%, C 0.02-0.04, H 135-145
         → Verde notte quasi nero. Il colore del visore notturno e dello schermo CRT.

primary: L 55-70%, C 0.18-0.25, H 135-145
         → Verde fosforo CCTV. Il colore della sorveglianza notturna.

secondary: L 40-55%, C 0.05-0.08, H 135-145
         → Verde scuro per elementi secondari. Tutto nello stesso range tonale.

text:    L 75-85%, C 0.12-0.16, H 135-145
         → Verde brillante per testo e timestamp. Il monocromatismo del terminale.

alert:   L 50-60%, C > 0.25, H 25-35
         → Rosso allarme. L'unico colore "off-brand" — usato solo per segnalazioni critiche.
```

## Tipografia (Linee Guida)
- **Monopolio del monospace:** Courier, OCR-A, terminale font anni '80–'90
- **Uppercase always:** i sistemi di sorveglianza non usano minuscole
- **Timestamp format:** `[CAMERA_ID] YYYY-MM-DD HH:MM:SS` come elemento invariante
- **Nessun font display o serif — solo output di macchina**

## Implementazione Fabric.js
```json
BG:       { "type": "rect", "fill": "oklch(0.10 0.03 140)", "effects": ["scanlines", "noise_light", "vignette"] }
Overlay:  { "type": "rect", "fill": "oklch(0.62 0.20 140)", "opacity": 0.08, "blendMode": "screen" }
Timestamp: { "fontFamily": "Courier New", "fontWeight": "400", "fill": "oklch(0.78 0.14 140)", "fontSize": 11, "position": "bottom-left" }
Headline: { "fontFamily": "Courier New", "fontWeight": "700", "textTransform": "uppercase", "fill": "oklch(0.80 0.20 140)" }
```
**Effetti ammessi:** `scanlines`, `noise_light`, `vignette`, `barrel_distortion_light`
**Effetti vietati:** `gradient_colorful`, `glow_neon`, `rounded_shapes`, `decorative_elements`

## Layout + Baricentro
- **Negative space:** 40–55% — il buio come parte della sorveglianza: quello che non si vede è altrettanto importante
- **Baricentro:** leggermente decentrato, come una telecamera mal posizionata — la composizione "accidentale" è parte del codice

## Rubrica Score
- **70:** Green phosphor usato, monospace, ma composizione troppo intenzionale e pulita
- **80:** Timestamp presente, scanlines, distorsione lieve
- **90:** L'intera composizione sembra output autentico di un sistema di sorveglianza
- **95+:** Chi guarda si sente osservato — la paranoia visiva è trasmessa con precisione concettuale

## Layout Variazioni (scegli 1 in base al contenuto)

### LV-A: CONTROL ROOM — poster denuncia, art critica, editorial dark
**Struttura:** sfondo verde notte; 4 "finestre di sorveglianza" come pannelli (rect con border verde fosforo 1px) con immagini o contenuti diversi; timestamp in ogni angolo superiore; grande testo CAMERA ID in monospace in alto al centro
**Elementi chiave:** 4 rect "schermo" con proportions TV 4:3, timestamp overlay su ogni pannello, vignette su tutta la composizione, scanlines sottili, testo in monospace uppercase solo verde fosforo
**Baricentro:** griglia 2×2 regolare — la sorveglianza non ha preferenze artistiche
Minimo 15 elementi

### LV-B: MOTION ALERT — warning system, azione urgente, poster distopico
**Struttura:** immagine soggetto principale al centro con bounding box rettangolare rosso allarme intorno (strokeWidth 3, no fill); testo "MOTION DETECTED" in monospace rosso sopra; timestamp verde nell'angolo; sfondo verde notte con noise
**Elementi chiave:** rect bounding box rosso (strokeWidth 3, fill transparent), testo alert rosso uppercase, cross-hair minimo sull'immagine, timestamp verde, scanlines sull'intera composizione
**Baricentro:** il soggetto tracciato — la scatola rossa concentra tutta l'attenzione
Minimo 10 elementi

### LV-C: NIGHT VISION — copertina libro, album art, visual essay
**Struttura:** tutta la composizione in palette verde monocromatica (4-5 toni da quasi-nero a quasi-bianco verde); noise e scanlines heavy; immagine come se fosse ripresa in low-light; titolo come identificativo di sistema
**Elementi chiave:** monocromatismo verde totale (tutto in H 135-145), noise pesante (opacity 0.3+), vignette forte ai bordi, barrel_distortion leggera, font Courier New uppercase
**Baricentro:** decentrato e "accidentale" — la telecamera non compone
Minimo 9 elementi

### LV-D: EVIDENCE FILE — design critico, documentazione fittizia, editorial
**Struttura:** simulazione documento classificato su sfondo quasi-nero; rettangoli di redazione neri su parti del testo; timbro rosso "CLASSIFIED" o "REDACTED" ruotato -12°; timestamp, numero pratica, codici di classificazione
**Elementi chiave:** rect neri "redazione" su porzioni di testo (fill nero, no border), timbro-text rosso ruotato, sfondo grigio carta invecchiata con noise, font monospace per tutto il testo "di sistema"
**Baricentro:** distribuito come un documento, non come un poster
Minimo 13 elementi

## Divieti Assoluti (specifici di questo movimento)
❌ Mai colori saturi o palette multicolore — il monocromatismo verde è la condizione necessaria
❌ Mai composizione "bella" o intenzionalmente estetizzata — la macchina non ha intenzioni artistiche
❌ Mai font decorativi, serif eleganti, o sans-serif neutri — solo monospace, solo output di sistema
❌ Mai bordi arrotondati — le schermate CCTV hanno angoli vivi e interfacce primitive
❌ Mai luce o ottimismo visivo — il verde fosforo esiste nell'oscurità, non nell'apertura
