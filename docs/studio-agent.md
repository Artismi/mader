# Artista-osservatore

Un artista procedurale dentro Creative OS. Ogni giornata legge il mondo, sceglie un'intenzione, lavora con gli strumenti del Lab, si giudica con un dibattito interno e aggiorna la propria poetica. Nessun modello esterno, nessun costo.

Concept completo: documento "Artista-osservatore — concept".

## Come si usa

- Pagina: `/studio-agent` (voce **Artista** nel dock).
- **Avvia giornata**: una giornata completa, con anteprima e log in tempo reale.
- **Una giornata al giorno**: finché la pagina è aperta, lancia una giornata se oggi non ne ha ancora fatte.
- Nella galleria ogni opera mostra testo, intenzione, letture, dibattito, scheda visiva e gesti. Da lì si lascia una nota: la legge la giornata dopo come voce "visitatore".

## Dove stanno le cose

```
src/lib/studio-agent/
  core/      tipi e caso con seme
  hands/     foglio a livelli, strumenti (ricette, fx, look, geometrie, pattern, pennello,
             testo, grana, taglio, ripetizione, disposizione, fondo, shader raccolti)
  eyes/      misure sulle immagini (Kandinsky, Arnheim, Gestalt) e parole visive
  reader/    tokenizzazione, spazio delle parole (PPMI + SVD), tre analisi grammaticali,
             mappa del sapere (ancorata / definita / a vuoto / ignota), logica
  mind/      gusto (compressione + Wundt), criteri ricorsivi, voci, argomentazione di Dung,
             umore e intenzione, studio (codelet + ricottura), poetica
  voice/     titoli e testi: modelli per registro, cut-up, Markov
  server/    archivio SQLite + PNG, letture dal web
  day.ts     la giornata intera
src/app/api/studio-agent/[...op]/route.ts
src/components/studio-agent/StudioAgent.tsx
```

Dati, accanto al database (`data/` in sviluppo):

```
data/studio-agent/opere/        PNG delle opere
data/studio-agent/biblioteca/   .md e .txt che l'artista rilegge (es. note di ricerca di stateyour)
data/studio-agent/morph-it.txt  lessico Morph-it! opzionale per l'analisi grammaticale
```

## Fonti

Nelle impostazioni, una per riga: `wiki:casuale`, `wiki:vetrina`, un feed RSS, oppure `pagina:https://…`. Le definizioni arrivano dal Wikizionario.

## Shader raccolti

Nelle impostazioni: `https://…/shader.frag | licenza`. Testo GLSL grezzo, convenzioni `u_time`/`u_resolution` o `mainImage` di Shadertoy. Girano in un contesto WebGL chiuso. Usare solo sorgenti con licenza libera.

## Limiti dichiarati

Non ragiona come una persona: le voci lavorano su misure e matrici, i testi nascono da ricombinazione. In cambio è tutto leggibile.
