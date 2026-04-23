---
type: design_recipe
mood: constructivist
client_type: avantgarde_theatre_or_political
score: 96
tags: [diagonale, propaganda, industriale, geometrico, urto-visivo, rosso]
---

# Costruttivismo — L'Efficienza Industriale e l'Urto Visivo

## L'Anima del Design (Il Guizzo)
Questo design deve urlare. È propaganda, è azione, è ingegneria visiva pura. Niente leziosità, niente decorazioni. L'anima è il conflitto e il progresso. Immagina il testo come travi di acciaio e blocchi di cemento lanciati contro lo spettatore. L'energia nasce dal rifiuto totale della pacifica orizzontalità: tutto deve spingere in diagonale, creando una sensazione di avanzamento inarrestabile.

## Touchstone
- Alexander Rodchenko, poster "Lengiz" (1924) — fotomontaggio e urlo tipografico
- El Lissitzky, "Beat the Whites with the Red Wedge" — dinamismo vettoriale puro
- Vladimir e Georgii Stenberg — layout e montaggio cinematografico

## Registro Sensoriale
- **Suono:** macchinari industriali pesanti, presse d'acciaio, megafoni distorti
- **Tatto:** inchiostro denso quasi in rilievo, carta non rifinita, acciaio freddo
- **Temperatura:** fredda e inospitale
- **Odore:** olio per ingranaggi, fumo di ciminiera, polvere da sparo

## Cosa Funziona
- Diagonale aggressiva a 45 gradi che spezza l'asse strutturale a metà
- Le vocali dei titoli principali possono essere sostituite da forme geometriche pure (cerchi o triangoli solidi)
- Fotomontaggio grezzo: volti o mani in bianco e nero, ritagliati bruscamente e scalati in modo sproporzionato

## Trappole Comuni (Cosa NON fare)
- **NON** usare griglie perfettamente orizzontali e verticali — il rifiuto della composizione statica è alla base del movimento
- **NON** applicare font decorativi, script o grazie leggere — la tipografia deve avere spessore mastodontico
- **NON** usare ombreggiature morbide o gradienti — le forme devono essere taglienti, piatte e meccaniche

## Palette OKLCH (Logica e Range)
```
bg:      L > 90%, C < 0.02, H neutrale
         → Carta industriale grezza, non sbiancata.

primary: L 45-55%, C > 0.20, H 20-30
         → Rosso denso, aggressivo e rivoluzionario. Altissimo impatto.

text:    L < 15%, C ~ 0
         → Nero fuliggine, inchiostro pesante da rotativa.
```

## Tipografia (Linee Guida)
- **Display:** Font Sans-Serif ultra-bold geometrici. Devono dominare lo spazio.
- **Dimensioni:** Ciclopiche (200pt+), ruotate, giustificate a blocco, incastrate senza aria (leading negativo/zero)

## Implementazione Fabric.js
```json
BG:       { "type": "rect", "effects": ["halftone_print", "grain"] }
Headline: { "fontFamily": "Selected_Heavy_Sans", "fontWeight": "900", "angle": -45, "textTransform": "uppercase", "lineHeight": 0.8 }
Image:    { "type": "image", "blendMode": "multiply", "filters": ["grayscale", "contrast_boost"] }
```
**Effetti vietati:** `blur`, `soft_shadow`, `glow`, `gradients`

## Layout + Baricentro
- **Tensione estrema:** elementi ancorati ai bordi che sembrano voler esplodere fuori dal formato
- **Baricentro:** instabile, in perenne lotta — rosso e nero combattono per il dominio lungo la diagonale di spinta

## Rubrica Score
- **70:** Colori corretti ma composizione orizzontale priva di urgenza o forza
- **80:** Diagonale implementata, contrasto di scala netto
- **90:** Incastro millimetrico tra fotomontaggio B&N e vettori geometrici, grande impatto
- **95+:** Genera sensazione fisica di movimento in avanti; la tipografia urla con potenza bruta inequivocabile

## Layout Variazioni (scegli 1 in base al contenuto)

### LV-A: DIAGONALE STRUMENTALE — manifesto politico, evento avanguardia, poster teatrale
**Struttura:** linea diagonale 45° spessa (h 8-16px) taglia la superficie da angolo superiore-sinistro ad angolo inferiore-destro dividendo due campi; campo superiore bianco con titolo in nero; campo inferiore nero o rosso con titolo in bianco invertito
**Elementi chiave:** rect diagonale come wedge (non solo linea), headline ruotata -45° che segue la diagonale, fotomontaggio B&W nel triangolo superiore, forma geometrica (cerchio o triangolo solido) come accento rosso
**Baricentro:** in perpetuo movimento verso l'angolo inferiore-destro — la "direzione del progresso"
Minimo 13 elementi

### LV-B: TORRE TIPOGRAFICA — copertina rivista, poster concerto industriale
**Struttura:** titolo principale disposto verticalmente (angle: -90°) occupa colonna sinistra intera (w: 180-220px); resto della superficie è griglia di blocchi orizzontali con foto, testo, forme geometriche
**Elementi chiave:** headline verticale ≥ 140px fontWeight 900, blocchi rect orizzontali sovrapposti come strati, numero decorativo (01/02/03) scalato 300px opacity 0.08, linee divisorie orizzontali 1-2px
**Baricentro:** pesante e ancorato a sinistra — la torre verticale è il pilastro strutturale
Minimo 14 elementi

### LV-C: FOTOMONTAGGIO URLO — campagna sociale, manifesto denuncia
**Struttura:** grande fotografia B&W sfondo (non full-bleed — ritagliata bruscamente con margini); forme geometriche rosse (cerchi, triangoli) sovrapposti; testo bianco a contrasto sulle forme
**Elementi chiave:** immagine con filter grayscale + contrast_boost, almeno 2 forme geometriche solide rosse L > 45%, testo bianco fontWeight 900 uppercase sulle forme, piccolo testo descrittivo in basso flush-left
**Baricentro:** instabile e frammentato — l'urto visivo è la comunicazione
Minimo 11 elementi

### LV-D: CUNEO LISSITZKY — visual art, direzione artistica pura
**Struttura:** grande triangolo rosso (rect ruotato 45°) punta verso un cerchio bianco nell'angolo opposto; testo minimo come didascalia geometrica; sfondo bianco freddo
**Elementi chiave:** triangolo-wedge con fill rosso saturo, cerchio bianco con stroke nero, titolo in blocco tipografico pesante tangente al cuneo, diagonale sottile che connette i due elementi
**Baricentro:** asse diagonale puro — la tensione tra arma (triangolo) e bersaglio (cerchio)
Minimo 8 elementi (la semplicità è la forza)

## Divieti Assoluti (specifici di questo movimento)
❌ Mai composizione orizzontale/verticale pura — l'angolo retto statico è il nemico ideologico del costruttivismo
❌ Mai palette pastello o colori terziati — solo primari puri, nero assoluto, bianco grezzo
❌ Mai testo in lowercase — la tipografia è potere, il maiuscolo è la voce della massa
❌ Mai immagini a colori — il fotomontaggio costruttivista è sempre B&W + forme colorate separate
❌ Mai più di 2 colori attivi (rosso + nero su bianco) — la forza nasce dalla limitazione cromatica assoluta
