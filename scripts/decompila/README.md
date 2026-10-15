# Decompilatore D1: banco di prova

Il decompilatore (`src/components/studio/designer/decompila/`, fase D1 di `docs/occhio-del-designer.md`) trasforma l'immagine di una grafica in una **scena del motore designer**: livelli con nomi leggibili, testo vivo con il carattere del motore, forme vere, foto e soggetto separati. La scena si rende con `renderScene` come qualunque altra proposta e si modifica nello Studio.

Il banco genera 10 grafiche con il motore stesso (la verità è nota), le passa al decompilatore e misura cosa torna.

## Uso

```bash
cd scripts/designer && npm install     # la prima volta (esbuild, fabric, playwright-core)
cd ../.. && npm run decompila:banco
npm run decompila:banco -- --casi caffe-q,dati-v
npm run decompila:banco -- --cache     # riusa le letture del modello già salvate in out/
npm run decompila:banco -- --esplora   # solo le grafiche di prova, con l'elenco dei loro elementi
```

Serve `GEMINI_API_KEY` in `.env.local` (anche quello della cartella principale, se si lavora in un worktree). La chiave resta in Node: la pagina del banco chiede la lettura tramite una funzione esposta, come lo Studio la chiede a `POST /api/design/decompila`. Modelli provati in fila: `DECOMPILA_MODELLO` (separati da virgole) oppure Gemini 3.8 → 3.7 → 3.6 → 3.5 Flash → `gemini-flash-latest` → 3.1 Flash Lite; sulle quote finite si passa subito al successivo.

In `out/`: `<caso>-vero.png` e `.json` (la verità), `<caso>-ricostruita.png` e `.json`, `<caso>-confronto.jpg` (affiancate), `lettura-<caso>.json` (la risposta del modello), `rapporto.md` e `rapporto.json`.

## Come funziona

1. **Lettura del testo** (`visione.ts`, route `/api/design/decompila`): il modello con visione restituisce i blocchi di testo orizzontale con le righe, i riquadri e cinque risposte chiuse (famiglia, peso, corsivo, allineamento, ruolo). L'uscita è validata da zod (`tipi.ts`); se il modello non regge l'uscita strutturata si ripiega su JSON nel testo, validato allo stesso modo. Con OpenRouter collegato si usa il suo modello "design", altrimenti la chiave Gemini del portale.
2. **Righe sui pixel** (`testo.ts`): ogni riquadro del modello si stringe sull'inchiostro vero. La maschera è la proiezione di ogni pixel sul segmento fondo → inchiostro, così la grana trasversale si annulla.
3. **Render-and-compare del carattere**: ogni famiglia del motore (`core/caratteri.ts`, caricata con `fonts.ts`) si rende nel riquadro di ogni riga: il corpo viene dall'altezza dell'inchiostro, la spaziatura dalla larghezza, e si misura la differenza tra le maschere. Le cinque migliori si riprovano con tutti i pesi vicini e con il corsivo riga per riga. I blocchi che il modello ha diviso (un titolo con una riga in corsivo) si riuniscono se sono allineati e a un'interlinea di distanza. **Parsimonia**: se una famiglia scelta per un altro blocco spiega quasi altrettanto bene un blocco di testo piccolo, si usa quella, come farebbe un designer.
4. **Strati** (`strati.ts`): su una versione ridotta (lato 216 px, la grana si spiana) e senza i riquadri del testo: fondo pieno o sfumato dai bordi; regioni di colore uniforme → rettangoli (bordi rifiniti sui pixel veri), cerchi o tracciati semplificati (Douglas-Peucker); zone mosse → immagini ritagliate con il testo tolto; sulla foto più grande lo scontorno U²-Net (`compose/cutout.ts`) aggiunge il livello **Soggetto** se trova un soggetto netto. Profondità: le regioni più grandi stanno sotto.
5. **Grana** (`trama.ts`): il rumore fine delle zone piene si misura e si ricostruisce con lo stesso livello del motore (grigio in sovrapposizione con `textureOverlay` "grana"), con l'intensità scelta per render-and-compare su un campione dello stesso colore.
6. **Scena e verifica** (`index.ts`, `verifica.ts`): Fondo, forme, immagini, Grana, poi i testi (Titolo, Occhiello, Testo, Dettagli, Invito, Marchio, Numero). Ogni testo si rende da solo e si posa sull'inchiostro dell'originale; i testi con il bordo quasi uguale tornano sulla stessa colonna. Poi la scena intera si rende e si confronta con l'originale; al massimo **3 giri** correggono corpo, spaziatura, interlinea e posizione dalle righe rese, finché la fedeltà sale.

## Misure

- **Fedeltà** = 1 − differenza media per pixel (RGB, 0..255) tra originale e scena resa, entrambe ridotte a 200 px sul lato lungo.
- **Testo identico**: ogni testo orizzontale della scena vera ha un testo ricostruito con la stessa stringa.
- **Carattere giusto**: stessa famiglia e peso entro 100. **Equivalente**: la riga più lunga resa allo stesso corpo con il carattere vero e con quello trovato differisce meno di 0,2 (differenza tra maschere, 0 = uguali, 1 = nulla in comune).
- **Corpo**: errore relativo. **Posizione**: distanza tra gli angoli dell'inchiostro del testo vero e di quello ricostruito, resi da soli.
- **Caso riuscito**: testo identico, tutti i caratteri giusti o equivalenti, fedeltà ≥ soglia.

RISULTATI

## Limiti noti

LIMITI
