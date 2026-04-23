---
type: design_recipe
mood: minimal-swiss
client_type: architecture_firm_or_museum
score: 99
tags: [griglia, razionale, swiss, helvetica, flush-left, vuoto-architettonico, istituzionale]
---

# Swiss Style — Il Trionfo della Razionalità e del Vuoto Architettonico

## L'Anima del Design (Il Guizzo)
L'ossessione per l'ordine cosmico. Il design è uno strumento chirurgico, un atto di umiltà del designer di fronte al contenuto. Il "guizzo" creativo non sta nell'aggiungere, ma nel togliere fino a far vibrare lo spazio vuoto. L'aria bianca non è sfondo, è una scultura solida di antimateria che preme contro la tipografia. "Il font non deve abbaiare", deve trasmettere la verità matematica.

## Touchstone
- Josef Müller-Brockmann, "Beethoven" poster (1955) — contrasto di scala estremo e griglie
- Massimo Vignelli, New York Subway Map — chiarezza informativa chirurgica
- Armin Hofmann, manifesto per Giselle (1959) — tensione tra fotografia e rigore tipografico

## Registro Sensoriale
- **Suono:** silenzio assoluto di un laboratorio di ricerca, click preciso di una macchina da scrivere Olivetti
- **Tatto:** carta patinata premium 250g, liscissima e fredda
- **Temperatura:** fredda, distaccata, asettica
- **Odore:** disinfettante leggero, aria filtrata, inchiostro nero fresco

## Cosa Funziona
- Griglia matematica inviolabile (es. 5×7). Tutto scatta sulle linee strutturali in modo implacabile
- Allineamento rigorosamente a bandiera sinistra (ragged right), punto di caduta meccanico infallibile
- Contrasto di scala brutale: titoli immensi contro testi di supporto microscopici negli angoli opposti

## Trappole Comuni (Cosa NON fare)
- **NON** centrare mai il titolo — il centro matematico è la morte del minimalismo svizzero
- **NON** aggiungere decorazioni per "riempire" il vuoto — il bianco è struttura portante, non errore
- **NON** usare più di una famiglia di font — ogni variazione è un tradimento dell'obiettività

## Palette OKLCH (Logica e Range)
```
bg:      L 98-100%, C 0
         → Bianco ottico da laboratorio, purissimo e acromatico.

primary: L 50-60%, C 0.20-0.25, H 20-30
         → Rosso elvetico saturo, o un singolo colore primario chirurgico.

text:    L < 15%, C 0
         → Inchiostro nero assoluto, massima leggibilità.
```

## Tipografia (Linee Guida)
- Monopolio totale dei font Neo-Grotesque (sans-serif neutri)
- Contrasto di scala spietato: titoli enormi (120–150pt) contro testo microscopico (9–11pt)
- Tracking neutro o lievemente stretto sui titoli grandi

## Implementazione Fabric.js
```json
BG:       { "type": "rect", "fill": "var(--bg-color)" }
Headline: { "fontFamily": "Selected_Neo_Grotesque", "fontWeight": "700", "textAlign": "left", "letterSpacing": -0.02 }
Grid:     { "type": "layout_grid", "columns": 5, "rows": 7, "snapToGrid": true, "visible": false }
```
**Effetti vietati:** `texture`, `gradient`, `stroke_outline`, `drop_shadow`, `glow` — l'impurità è bandita

## Layout + Baricentro
- **Negative space:** 60–80% — un'enorme prateria vuota al centro o in uno dei quadranti
- **Baricentro:** assolutamente asimmetrico, pesantemente sbilanciato in alto a sinistra

## Rubrica Score
- **70:** Font sans-serif usato ma elementi centrati o spazio ridotto
- **80:** Griglia matematica applicata ma contrasto di scala insufficiente
- **90:** Contrasto estremo; il bianco spinge contro le lettere, allineamento a sinistra perfetto
- **95+:** L'ordine gerarchico è comprensibile prima ancora di leggere; emana verità matematica incontestabile

## Layout Variazioni (scegli 1 in base al contenuto)

### LV-A: MONSTER TITLE — poster istituzionale, museo, architettura
**Struttura:** titolo in un singolo word gigantesco (fontSize 180-250px) occupa 60-70% dello spazio verticale; supporting text in corpo 10-11px negli angoli inferiori; singola fotografia rigorosa in un quadrante
**Elementi chiave:** headline flush-left fontWeight 700, nessun ornamento, 1 singolo colore accento usato 1 volta sola, spazio vuoto ≥ 60% della superficie
**Baricentro:** angolo superiore-sinistro — tutto il peso tipografico comprime lo spazio in quel quadrante
Minimo 6 elementi (la purezza richiede sottrazione)

### LV-B: PHOTO HALF — catalogo, portfolio, editorial B2B
**Struttura:** foto B&W o a colori desaturati nella metà sinistra (esatta divisione 50/50 o 40/60); colonna destra con headline + body in 2-3 righe; nessun overlap
**Elementi chiave:** immagine rigorosa senza effetti, headline flush-left, testo flush-left, 1 singolo elemento accento (linea orizzontale 1px o numero di sezione), nessuna decorazione
**Baricentro:** bilanciamento preciso tra massa fotografica (sx) e struttura tipografica (dx)
Minimo 7 elementi

### LV-C: GRIGLIA MANIFESTO — annual report, identity system
**Struttura:** griglia matematica 5 colonne visibile come elemento di design (linee grigio chiarissimo opacity 0.12); titolo occupa 3 colonne; immagine occupa 2 colonne; testo body nelle colonne rimanenti con interlinea perfetta
**Elementi chiave:** grid visibile (opacity 0.08-0.12), ogni elemento allineato alla griglia senza eccezioni, numero di pagina/sezione nell'angolo inferiore-destro in corpo 9px
**Baricentro:** distribuito secondo la griglia matematica — non c'è baricentro, c'è sistema
Minimo 9 elementi

### LV-D: TYPOGRAPHY ONLY — poster culturale, apertura sezione, manifesto concettuale
**Struttura:** zero immagini. Solo tipografia in 3-4 livelli di scala estrema: hero (180px), section (48px), body (13px), caption (9px). Allineamento flush-left assoluto.
**Elementi chiave:** contrasto di scala spietato tra livelli, 1 singolo punto rosso o linea rossa come unico elemento non-tipografico, spaziatura tra sezioni matematicamente precisa (multipli di 8px)
**Baricentro:** flush-left assoluto — il margine sinistro è l'unica legge
Minimo 5 elementi (la purezza ha pochi elementi ma ogni singolo è calcolato)

## Divieti Assoluti (specifici di questo movimento)
❌ Mai centrare il testo — il centro geometrico è la morte del rigore Swiss
❌ Mai più di un font family (e massimo 2 pesi: regular + bold) — ogni font aggiunto è un fallimento concettuale
❌ Mai decorazioni, ornamenti, pattern di qualsiasi tipo — anche un sottile pattern è troppo
❌ Mai immagini a colori saturi — il colore è il singolo accento, non la fotografia
❌ Mai border-radius, drop-shadow, o qualsiasi effetto di profondità — il piano è la verità
