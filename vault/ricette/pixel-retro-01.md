---
type: design_recipe
mood: pixel-retro-dev
client_type: developer_tools_gaming_retro_tech
score: 87
tags: [pixel-art, 8-bit, grid-paper, modular-blocks, thick-border, retro-computing, nostalgia-tech, chiptune]
---

# Neo-Retro Dev — Il Pixel come Unità Fondamentale e la Griglia come Verità

## L'Anima del Design (Il Guizzo)
C'è una differenza tra nostalgico e neo-retro. Il nostalgico guarda indietro con malinconia. Il neo-retro guarda avanti con il linguaggio di ciò che è venuto prima — non perché non ci sono alternative, ma perché la pixel art ha qualcosa che il vettoriale non può replicare: la **visibilità della costruzione**. Ogni pixel è una scelta consapevole, un bit di informazione, un mattone. Il "guizzo" è l'onestà strutturale: la griglia non si nasconde, i bordi sono spessi e neri, i blocchi sono modulari e autonomi. Questo design dice "so come funziona il sistema — e lo mostro". È la grammatica visiva degli indie game developers, degli hackathon, dei developer tools che non hanno paura della loro essenza tecnica.

## Touchstone
- Shovel Knight game aesthetic — pixel art moderna con vincoli 8-bit deliberati
- Celeste game UI — griglia, colori limitati, pixel perfetto
- Notion early design — blocchi modulari, grid-paper aesthetic

## Registro Sensoriale
- **Suono:** chiptune 8-bit, beep di computer anni '80, click di tastiera membrane vecchia
- **Tatto:** tasti di GameBoy, cartuccia NES, carta millimetrata
- **Temperatura:** fredda di laboratorio con il calore nostalgico del CRT
- **Odore:** plastica vintage di elettronica, carta millimetrata, pennarello a punta sottile

## Cosa Funziona
- Background carta millimetrata (grid paper) con linee sottili a intervalli regolari — la griglia come texture
- Icone pixel art a 16×16 o 32×32 pixel come elementi visivi primari
- Blocchi modulari con thick border nero (4-8px) impilati e affiancati — la costruzione è visibile
- Alta saturazione su palette limitata (max 4-6 colori fissi, palette NES o Game Boy Color)

## Trappole Comuni (Cosa NON fare)
- **NON** usare anti-aliasing o bordi morbidi — il pixel deve essere il pixel, netto e quadrato
- **NON** usare font proporzionale per gli elementi "di sistema" — solo monospace o font bitmap
- **NON** aggiungere effetti di profondità realistici — tutto è 2D e lo sa

## Palette OKLCH (Logica e Range)
```
bg:      L 94-98%, C 0.01-0.02, H 200-220
         → Bianco carta millimetrata con leggerissima tinta cerulea — la griglia paper

grid:    L 80-88%, C 0.03-0.06, H 200-220
         → Azzurro-grigio per le linee millimetriche (opacity 0.35-0.5)

primary: L 45-60%, C 0.28-0.38, H 240-260
         → Blu elettrico da palette NES. Il colore signature del movimento.

secondary: L 55-70%, C 0.28-0.35, H 120-135
           → Verde lime da sprite pixel. Il colore di "energia" e "OK".

accent:  L 50-65%, C 0.25-0.35, H 25-40
         → Rosso pixel da vita persa e urgenza. Terzo colore della palette base.

block:   L < 12%, C 0
         → Nero assoluto per tutti i bordi spessi e i contorni dei blocchi.
```

## Tipografia (Linee Guida)
- **Pixel font:** Press Start 2P, VCR OSD Mono, o simili — font bitmap con pixel visibili
- **Sistema:** per testi "di sistema" (labels, status) usare monospace a corpo piccolo
- **Scale pixel-perfect:** dimensioni font in multipli di 8 (8px, 16px, 24px, 32px) — mai 15px o 13px
- **Nessun italic** — i font bitmap non hanno italic nativo, non simularlo

## Implementazione Fabric.js
```json
BG:       { "type": "rect", "fill": "oklch(0.96 0.015 210)", "effects": ["grid_paper"] }
Block:    { "type": "rect", "rx": 0, "ry": 0, "stroke": "#000000", "strokeWidth": 5, "fill": "var(--primary)" }
PixelIcon: { "type": "image", "imageRendering": "pixelated", "width": 32, "height": 32 }
Headline: { "fontFamily": "Press Start 2P", "fontSize": 24, "fill": "#000000" }
Grid:     { "type": "procedural", "proceduralType": "dot_grid", "size": 8, "color": "#B0C4D0", "opacity": 0.4 }
```
**Effetti ammessi:** `grid_paper`, `dot_grid` (pixel size), `pixelate` sui rendering
**Effetti vietati:** `anti_aliasing`, `blur`, `gradient_smooth`, `soft_shadow`, `border_radius`

## Layout + Baricentro
- **Negative space:** 25–35% — la griglia di sfondo occupa tutto ma è quasi trasparente
- **Baricentro:** il blocco principale — la composizione è modulare, il baricentro è strutturale

## Rubrica Score
- **70:** Grid paper e pixel font usati, ma bordi sottili, gradienti, anti-aliasing
- **80:** Blocchi con thick border, palette limitata corretta, pixel icon presente
- **90:** Tutto pixel-perfect, griglia sempre visibile, modularità coerente
- **95+:** Sembra un gioco indie sviluppato con amore per il mezzo — l'estetica è totale e coerente

## Layout Variazioni (scegli 1 in base al contenuto)

### LV-A: MODULAR STACK — feature list, product overview, developer docs
**Struttura:** 4-6 blocchi rettangolari con thick border nero impilati verticalmente; ogni blocco con icona pixel 32px + titolo + micro-descrizione; colore del blocco alterna tra primario e neutro
**Elementi chiave:** 4-6 rect con stroke 5px, icone pixel 32x32, titolo in pixel font, micro-testo in monospace, alternanza cromatica tra blocchi
**Baricentro:** la colonna di blocchi — struttura modulare visibile
Minimo 14 elementi

### LV-B: GAME UI INSPIRED — landing page, event gaming, hackathon
**Struttura:** interfaccia game-like con "health bar" orizzontale in alto (rect con fill verde/rosso), livello/score nell'angolo, grandi blocchi di contenuto al centro come "menu" di gioco, navigazione come "select" old-style
**Elementi chiave:** health/progress bar, score label in pixel font, 2-3 blocchi menu con hover-state colore, frame bordo spesso sull'intera composizione
**Baricentro:** il centro dei blocchi menu — la scelta è lì
Minimo 15 elementi

### LV-C: CHIPTUNE POSTER — evento gaming, festival tech, concert
**Struttura:** sfondo quasi bianco con grid paper; composizione di blocchi colorati asimmetrica come un livello di Tetris; titolo evento in pixel font grande; icone pixel sparse; colori nella palette NES
**Elementi chiave:** 6-8 blocchi in posizioni libere (non griglia), titolo pixel font grande, 3-4 icone pixel sparse, palette max 4 colori NES
**Baricentro:** il titolo — i blocchi sono l'ambiente
Minimo 16 elementi

### LV-D: BLUEPRINT TERMINAL — tool announcement, tech documentation
**Struttura:** sfondo carta millimetrata scura (invertita); testo in verde lime come output terminale; blocchi rettangolari con border verde lime (non nero — la variante dark-mode del movimento); coordinate numeriche agli angoli
**Elementi chiave:** sfondo dark con grid, testo monospace lime, blocchi con border lime, numeri coordinate, indicatori di sistema (arrows, brackets)
**Baricentro:** flush-left — è un documento tecnico che ha scelto di essere bello
Minimo 12 elementi

## Divieti Assoluti (specifici di questo movimento)
❌ Mai anti-aliasing sui bordi — il pixel quadrato è sacro
❌ Mai font proporzionale per elementi sistema (icone, label, numeri) — solo pixel font o monospace
❌ Mai gradienti smooth o transizioni di colore — la palette è limitata e i cambi sono bruschi
❌ Mai bordi sottili (< 3px) sui blocchi — il thick border è il principio strutturale
❌ Mai composizione organica o fluida — tutto è modulare, ortogonale, costruito mattone per mattone
