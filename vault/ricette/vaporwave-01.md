---
type: design_recipe
mood: vaporwave-sculpture
client_type: art_direction_retro_digital_surreal_brand
score: 93
tags: [vaporwave, scultura, marmo, busto, surreal, retrowave, teal-magenta, collage-digitale, nostalgia-futuristica]
---

# Vaporwave × Scultura — La Nostalgia Surreale e il Marmo nell'Ultravioletto

## L'Anima del Design (Il Guizzo)
Vaporwave è la nostalgia per un futuro che non è mai esistito — un capitalismo degli anni '80 filtrato attraverso la malinconia digitale, le mall deserte, le musiche d'attesa di banche e hotel. Quando si unisce alla scultura classica (busti di marmo, torsi greci, Venere di Milo), accade qualcosa di perturbante: l'eterno incontra l'obsoleto, il classico diventa kitsch e il kitsch diventa profondo. Il "guizzo" è il **collage ontologico**: prendere una statua che esiste da 2000 anni, metterle occhiali da sole, illuminarla di teal e magenta, e riposizionarla su sfondo a scacchi digitale. La statua diventa ironica e seria allo stesso tempo. La nostalgia diventa un'estetica totale.

## Touchstone
- Macintosh Plus, "Floral Shoppe" album cover (2011) — il manifesto del vaporwave
- Blank Banshee, "MEGA" artwork — scultura classica + digital degradato
- Seapunk aesthetic — teal oceano, marmo, pixelato, flora marina digitale

## Registro Sensoriale
- **Suono:** chopped & screwed R&B degli anni '80, muzak di aeroporto rallentato, dial-up modem
- **Tatto:** superficie di marmo lucida e fredda, touch screen di un vecchio iPad, glitter sintetico
- **Temperatura:** fredda e malinconica — come una stanza condizionata vuota di notte
- **Odore:** plastica di vecchi elettrodomestici, aria raffreddata di centro commerciale anni '90, carta fotografica vecchia

## Cosa Funziona
- Busti di marmo greco/romano come soggetti principali, illuminati in teal e magenta
- Background a scacchi prospettici (grid 3D) o gradiente orizzontale teal→magenta
- Glitch e VHS artifacts come firma temporale del deterioramento digitale
- Palmtrees stilizzate, neon, sole al tramonto come elementi iconografici del movimento

## Trappole Comuni (Cosa NON fare)
- **NON** usare colori "realistici" o naturali — tutta la palette deve essere innaturale e satura
- **NON** usare font moderni minimali — solo font retrofuturisti, pixel art, o simulazioni dei computer anni '80
- **NON** creare composizioni "ordinate" — il collage vaporwave ha sempre una certa casualità digitale

## Palette OKLCH (Logica e Range)
```
bg:      L 20-35%, C 0.12-0.20, H 295-310
         → Viola scuro saturo — il cielo notturno del vaporwave.

primary: L 55-70%, C 0.25-0.35, H 195-215
         → Teal elettrico. Il colore del mare digitale degli anni '80.

secondary: L 55-70%, C 0.30-0.40, H 310-330
           → Magenta neon. Il colore delle luci fluorescenti da shopping mall.

accent:  L 65-80%, C 0.20-0.30, H 55-70
         → Giallo dorato retrò. Per le statue illuminate, come spot teatrale.

grid:    L 30-50%, C 0.15-0.22, H 280-300
         → Viola-teal per le grid lines prospettiche.
```

## Tipografia (Linee Guida)
- **Display:** Font pixel-art, retrofuturistico, o simulazione computer anni '80 (VCR OSD Mono, Press Start 2P, Russo One)
- **Carattere:** può essere in stile olografico — stroke teal o magenta, fill trasparente o semi-trasparente
- **Supporto:** piccolo testo in font pixel o monospace per caption e metadati "di sistema"
- **Effetti testo:** chromatic aberration leggera sull'headline (offset RGB di 2-3px) è appropriata

## Implementazione Fabric.js
```json
BG:       { "type": "rect", "fill": "oklch(0.26 0.16 302)", "effects": ["vhs_grain"] }
Grid:     { "type": "procedural", "proceduralType": "perspective_grid", "color": "oklch(0.45 0.20 290)", "opacity": 0.6 }
Bust:     { "type": "image", "effects": ["colorize_teal_magenta", "chrome"], "blend_mode": "screen" }
Gradient: { "type": "rect", "fill": { "type": "linear", "stops": [{"offset": 0, "color": "oklch(0.62 0.30 205)"}, {"offset": 1, "color": "oklch(0.62 0.35 320)"}] }, "opacity": 0.4 }
Headline: { "fontFamily": "Selected_Retro_Display", "fill": "oklch(0.68 0.28 210)", "effects": ["chromatic_aberration"] }
```
**Effetti ammessi:** `vhs_grain`, `chromatic_aberration`, `chrome`, `scanlines`, `glow_neon`
**Effetti vietati:** `clean_minimal`, `sharp_modern`, `natural_colors`

## Layout + Baricentro
- **Negative space:** 25–40% — abbastanza aria per far respirare il collage
- **Baricentro:** il busto o soggetto classico — è l'anomalia temporale intorno a cui tutto si organizza

## Rubrica Score
- **70:** Colori teal/magenta presenti ma palette poco satura, font moderno, no scultura
- **80:** Palette vaporwave corretta, elemento classico/scultura presente, grid prospettica
- **90:** Collage ontologico riuscito — il classico e il digitale coesistono in modo perturbante
- **95+:** Genera la malinconia-nostalgia specifica del vaporwave: tristezza bella, ironia seria, passato futuro

## Layout Variazioni (scegli 1 in base al contenuto)

### LV-A: BUST IN THE MACHINE — poster, album art, brand statement
**Struttura:** busto classico (marmo) centrato-alto su sfondo viola scuro; grid prospettica 3D in basso come "pavimento"; gradiente teal→magenta come "alone" intorno al busto; titolo in font retro in basso con chromatic aberration
**Elementi chiave:** immagine busto classico con color grading teal-magenta, perspective_grid, gradiente luce intorno al busto, headline retro font con offset cromatico
**Baricentro:** il busto — la grid si estende da esso
Minimo 11 elementi

### LV-B: INFINITE CORRIDOR — visual essay, ambient visual, motion poster
**Struttura:** prospettiva centrale con grid che porta l'occhio in profondità; busto o soggetto classico in fondo al corridoio; bordi laterali con degradazione colore verso il centro
**Elementi chiave:** grid prospettica forte verso punto di fuga centrale, immagine in fondo al corridoio scalata piccola, vignette ai bordi, glow teal-magenta sull'elemento centrale
**Baricentro:** il punto di fuga — tutto converge là
Minimo 9 elementi

### LV-C: SHOPPING MALL SUNSET — nostalgia brand, Y2K revival, lifestyle
**Struttura:** sfondo gradiente orizzontale viola→rosa; sole stilizzato (cerchio pieno) al centro-alto; palme silhouette ai lati; busto o prodotto in foreground; testo in font pixel come insegna di negozio
**Elementi chiave:** gradiente BG viola→rosa, cerchio-sole giallo/oro, 2 palme silhouette laterali (forme svg semplici), soggetto in foreground, testo pixel-font come "insegna"
**Baricentro:** il sole — tutto si irradia da esso
Minimo 12 elementi

### LV-D: GLITCH PORTRAIT — visual identity, poster perturbante, art direction
**Struttura:** soggetto classico (busto o torso) con effetti glitch/VHS che lo frammentano; teal e magenta come canali separati dell'immagine (chromatic aberration estrema); sfondo scuro con scanlines
**Elementi chiave:** immagine con chromatic_aberration forte (offset 8-15px), scanlines sull'intera composizione, vhs_grain, titolo con stesso trattamento cromatico
**Baricentro:** il soggetto frammentato — l'instabilità è il messaggio
Minimo 8 elementi

## Divieti Assoluti (specifici di questo movimento)
❌ Mai palette naturale o realistica — tutto deve essere innaturalmente saturo e cromaticamente artificiale
❌ Mai font minimali moderni — il retrofuturismo richiede typefaces con storia o pixel
❌ Mai composizioni "ordinate" — il collage vaporwave ha sempre stratificazione e casualità
❌ Mai assenza di elemento temporale (scultura classica, VHS, grid anni '80) — senza esso è solo synthwave colorato
❌ Mai sfondo bianco — il vaporwave esiste nell'oscurità viola illuminata artificialmente
