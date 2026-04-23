---
type: design_recipe
mood: tech-mono
client_type: developer_tools_or_ai_startup
score: 93
tags: [monospace, terminal, cli, dark-mode, neon-verde, credibilità-algoritmica, flush-left, ascii]
---

# Tech Mono — Credibilità Algoritmica e l'Estetica del Terminale

## L'Anima del Design (Il Guizzo)
Nel 2026, il terminale è diventato estetica di lusso tech. L'interfaccia CLI non è più una limitazione — è una dichiarazione di appartenenza. Il "guizzo" è la credibilità per sottrazione: ogni elemento decorativo rimosso aggiunge autenticità. La gerarchia non nasce da emozioni tipografiche ma da struttura: indentazione, peso, colore su massimo il 10% della superficie. Il design deve sembrare generato da un sistema, non da un designer. Paradossalmente, questo richiede una precisione assoluta.

## Touchstone
- GitHub CLI — struttura funzionale come estetica
- Linear.app — dark mode, monospace, credibilità tecnica come design decision
- Vercel dashboard — spazio negativo, verde fosforo come accento unico

## Registro Sensoriale
- **Suono:** keystroke meccanico, cursor blink a 1Hz, ventola CPU a regime costante
- **Tatto:** tastiera meccanica con switch Cherry MX Blue, trackpad freddo e preciso
- **Temperatura:** fredda, artificiale, climatizzata — come un server room a 18°C
- **Odore:** plastica riscaldata da CPU, filtro aria nuovo, caffè freddo dimenticato sulla scrivania

## Cosa Funziona
- Monospace assoluto: ogni singolo font nella composizione è a spaziatura fissa, senza eccezioni
- Divisori 1px per sezioni, o caratteri ASCII (`---`, `>>>`, `[STATUS]`) come ornamento funzionale
- Accento verde fosforo (o ciano elettrico) usato su massimo 10% della superficie

## Trappole Comuni (Cosa NON fare)
- **NON** mescolare font proporzionale e monospace — rompe l'illusione del terminale e l'unità visiva
- **NON** usare più di un colore accento — la credibilità tecnica viene dalla disciplina cromatica
- **NON** aggiungere curve, border-radius, o decorazioni — la geometria è ortogonale, sempre

## Palette OKLCH (Logica e Range)
```
bg:      L 15-20%, C 0.01-0.02, H 245-260
         → Dark mode: grigio-lavagna con freddezza blu. Non nero puro — il terminale ha profondità.

primary: L 80-88%, C 0.15-0.20, H 135-145
         → Verde fosforo da terminale. Il colore della fiducia algoritmica.

accent:  L 68-75%, C 0.18-0.23, H 195-205
         → Ciano elettrico per highlights critici. Alternativa al verde o accento secondario.

text:    L 85-92%, C 0.01-0.02, H 245-260
         → Grigio cenere chiaro. Non bianco puro — basso affaticamento visivo su dark bg.

dim:     L 45-55%, C 0.01, H 245-260
         → Grigio medio per testo secondario, commenti, metadati.
```

## Tipografia (Linee Guida)
- **Monopolio totale del monospace:** JetBrains Mono, Geist Mono, Roboto Mono, Fira Code
- **Header:** 28–36pt weight 700 — la gerarchia viene dal peso, non dalla famiglia
- **Body:** 13–14pt weight 400, leading 1.5x — densità informativa da IDE
- **Labels/data:** 10–11pt uppercase con letterSpacing 0.05em — tag di sistema

## Implementazione Fabric.js
```json
BG:       { "type": "rect", "fill": "oklch(0.17 0.015 252)" }
Headline: { "fontFamily": "JetBrains Mono", "fontWeight": "700", "fill": "oklch(0.88 0.17 140)" }
Body:     { "fontFamily": "JetBrains Mono", "fontWeight": "400", "fill": "oklch(0.88 0.015 252)", "lineHeight": 1.5 }
Divider:  { "type": "line", "stroke": "oklch(0.30 0.01 252)", "strokeWidth": 1 }
```
**Effetti vietati:** `gradient`, `blur`, `glow_soft`, `border_radius`, `serif_font` — ogni deviazione rompe la grammatica del terminale

## Layout + Baricentro
- **Negative space:** 45–55% — densità informativa da console, non da editorial magazine
- **Baricentro:** flush-left assoluto. Il testo parte sempre dal margine sinistro come in un terminale.

## Rubrica Score
- **70:** Dark mode presente, qualche font monospace, ma elementi decorativi o font misti
- **80:** Monospace completo, verde fosforo come unico accento, divisori 1px
- **90:** ASCII ornaments integrati naturalmente, indentazione come gerarchia, disciplina cromatica assoluta
- **95+:** Trasmette credibilità tecnica istantanea — chi guarda pensa "questi sanno quello che fanno"

## Layout Variazioni (scegli 1 in base al contenuto)

### LV-A: TERMINAL OUTPUT — tool announcement, developer tool, API docs
**Struttura:** sfondo dark; simulazione schermata terminale con "$ comando --flag" come prima riga, output in 4-6 righe sotto con indent progressivo; barra di stato in fondo; accento verde su termini chiave o output di successo
**Elementi chiave:** testo flush-left con indent simulato, "cursor blink" rettangolo verde opacity 0.8 h:14px, divider `---` tra sezioni, linea di status bar in fondo con [OK] verde, testi in 3 livelli: command (verde), output (bianco), comment (dim)
**Baricentro:** flush-left assoluto — il terminale inizia sempre dal margine sinistro
Minimo 10 elementi

### LV-B: DASHBOARD GRID — SaaS product, analytics, startup tech
**Struttura:** griglia di metriche/widget (3-4 card rect con border 1px dim) con numeri grandi in verde fosforo come valori; label uppercase 10px sopra ogni valore; divider verticali 1px tra sezioni; header con title monospace + badge status
**Elementi chiave:** card rect con border oklch(0.30 0.01 252), numeri grandi fontWeight 700 verde (36-48px), label uppercase fontSize 10 letterSpacing 0.05, badge status "LIVE" con background verde scuro
**Baricentro:** griglia distribuita — come un dashboard reale
Minimo 13 elementi

### LV-C: CODE SNIPPET HERO — developer marketing, tutorial, corso tecnico
**Struttura:** blocco codice come elemento visivo principale (non decorativo — codice reale formattato con syntax highlighting monocromatico verde/ciano/bianco su dark); titolo sopra il blocco; piccolo testo descrittivo sotto
**Elementi chiave:** code block rect con padding 16px, font JetBrains Mono, syntax highlighting con colori del movimento (verde per keywords, ciano per strings, bianco per variables, dim per comments), numero di riga sx come decorazione
**Baricentro:** il blocco di codice è il soggetto — tutto il resto è supporto
Minimo 9 elementi

### LV-D: STATUS REPORT — post aggiornamento, release notes, prodotto tech
**Struttura:** layout a lista di sistema con icone ASCII ([✓], [!], [→]) prefisso ad ogni riga; colori semantici (verde OK, giallo warning, rosso error) su status specifici; timestamp nell'header; numerazione riga simulata a sinistra
**Elementi chiave:** righe di testo con prefisso ASCII semantico, colori funzionali (verde/giallo/rosso) solo per status, timestamp header, linee divisorie `────────` come separatori sezione
**Baricentro:** lista verticale flush-left — la gerarchia è nell'indentazione, non nella posizione
Minimo 11 elementi

## Divieti Assoluti (specifici di questo movimento)
❌ Mai font proporzionale (Inter, Helvetica, Georgia) — anche 1 solo font non-monospace rompe l'illusione
❌ Mai più di 1 colore accento (verde fosforo o ciano) — la disciplina cromatica è credibilità
❌ Mai border-radius > 0 — la geometria del terminale è ortogonale e spietata
❌ Mai gradienti, glow soft, o decorazioni visive — ogni pixel non-funzionale è rumore
❌ Mai sfondo chiaro — il dark mode è la condizione esistenziale di questo movimento, non un'opzione
