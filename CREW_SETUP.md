# CrewAI Setup — Cosa devi fare tu

Questo file descrive i passi manuali necessari per attivare il pipeline multi-agente CrewAI.

---

## 1. Python — Installa l'interprete

Il crew service gira in Python 3.10+.

**Windows:**
1. Vai su https://python.org → Download → Python 3.11 (o superiore)
2. Durante l'installazione: spunta **"Add Python to PATH"**
3. Verifica: apri terminale e scrivi `python --version`

---

## 2. Installa le dipendenze Python

```bash
cd crew
pip install -r requirements.txt
```

Se usi un virtualenv (consigliato):
```bash
cd crew
python -m venv .venv
.venv/Scripts/activate      # Windows
pip install -r requirements.txt
```

---

## 3. Configura le variabili d'ambiente

```bash
cp crew/.env.example crew/.env
```

Apri `crew/.env` e compila:

| Variabile | Dove trovarla | Obbligatoria |
|-----------|---------------|--------------|
| `GEMINI_API_KEY` | https://aistudio.google.com/app/apikey (gratis) | ✅ Sì |
| `NEXTJS_BASE_URL` | Lascia `http://localhost:3000` | ✅ Sì |
| `CREW_PORT` | Lascia `8765` | ✅ Sì |
| `REMBG_TOKEN` | https://remove.bg → Account → API | ❌ Opzionale |

### Ottenere GEMINI_API_KEY (gratis)
1. Vai su https://aistudio.google.com/app/apikey
2. Clicca "Create API key"
3. Copia la chiave e incollala in `crew/.env`

Il piano gratuito include: **250 richieste/giorno** con Gemini 2.5 Flash.
Una generazione canvas completa usa ~5 richieste. → 50 canvas/giorno gratuiti.

---

## 4. (Opzionale) Installa rembg.js per scontornamento immagini

```bash
npm install @remove-background-ai/rembg.js
```

Richiede `REMBG_TOKEN` in `crew/.env`. Senza questo, le immagini vengono usate senza scontornamento.

---

## 5. Crea gli handbook per i tuoi clienti

Gli handbook sono file Markdown nel vault che il Brief Enricher legge per capire il brand del cliente.

Posizione: `vault/clienti/[Nome Cliente]/_handbook.md`

Template disponibile in: `vault/clienti/_template-handbook.md`

**Esempio minimo per un cliente:**
```markdown
# Handbook: Studio Rossi

## Identità Brand
**Settore:** Architettura
**Tagline:** "Spazio che respira"
**Tono di voce:** Professionale, essenziale, mai chiassoso

## Identità Visiva
**Palette:** #1a1a1a (nero), #f5f5f0 (crema), #c8a97e (dorato)
**Mood tipografico:** minimal
**Font heading:** Cormorant Garamond
**Font body:** Inter

## Formati Attivi
- Instagram square (1080x1080): post portfolio progetti
- LinkedIn: aggiornamenti studio
```

Più dettagliato è l'handbook, più precisi saranno i canvas generati.

---

## 6. Avvia l'app

```bash
npm run dev:electron
```

Electron avvia automaticamente il crew service Python. Verifica nel log del terminale:
```
[crew] avviato con python su porta 8765
```

---

## 7. Test del pipeline

Nella chat AI, scrivi:
```
Crea un canvas Instagram per [nome cliente]
```

Il sistema:
1. Riconosce il trigger canvas → attiva il crew pipeline
2. Brief Enricher legge handbook + memorie del cliente
3. Layout Architect progetta la struttura visiva
4. Asset Curator trova/genera le immagini
5. Canvas Board Generator produce il JSON Fabric.js
6. Quality Critic valuta (retry automatico se score < 75)
7. Il canvas appare nel tab Progettazione

Se il crew non è disponibile, il sistema fa fallback al singolo agente AI.

---

## Trigger riconosciuti per attivare il crew

Il dispatcher riconosce automaticamente le seguenti frasi:

- "crea canvas", "genera canvas"
- "crea layout", "genera layout"
- "crea post", "genera post"
- "crea grafica", "genera grafica"
- "crea visual", "genera visual"
- "crea social", "genera social"
- "crea copertina", "crea banner", "crea flyer"
- "crea locandina", "crea brochure"
- E varianti in inglese

Puoi aggiungere altri trigger in `src/app/api/ai/route.ts` → `CREW_CANVAS_TRIGGERS`.

---

## Struttura file creati

```
crew/
  main.py                    # FastAPI server (porta 8765)
  requirements.txt           # Dipendenze Python
  .env.example               # Template variabili d'ambiente
  .env                       # [TU CREI] Chiavi API
  knowledge/
    progettista_bible.txt    # VADAR rules + Anti-Lazy Policy
    font_pairs.json          # 10 mood tipografici con palette
    design_skills.json       # Regole per mood specifici
  tools/
    db_tools.py              # Tool per accedere a DB, vault, immagini
    rate_limiter.py          # Token bucket per Gemini free tier
  crews/
    canvas_crew.py           # 5 agenti + runner principale
```

---

## Troubleshooting

**"[crew] Python non trovato"** → Installa Python e assicurati che sia nel PATH

**"Crew unavailable" in chat** → Il service Python non è partito. Controlla:
```bash
cd crew && python main.py
```
Guarda l'errore nel terminale.

**"GEMINI_API_KEY not set"** → Manca o è sbagliata la chiave in `crew/.env`

**Canvas vuoto dopo generazione** → Il Critic ha score < 75 dopo 3 retry. Prova con un brief più dettagliato o controlla i log Python.

**Rate limit 429** → Hai superato 250 req/giorno Gemini gratuito. Aspetta la mezzanotte UTC.
