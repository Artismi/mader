# Specializzare ogni tavola: l'IA prima e dopo il motore

Oggi il motore compone le tavole a partire dagli archetipi e l'IA lavora solo ai margini: prima scrive i testi e sceglie sei direzioni, dopo non guarda nulla. Per questo due brief diversi nello stesso archetipo producono tavole quasi uguali: cambiano testi, colori e foto, ma i segni restano gli stessi.

Questo piano aggiunge due strati, sempre con un vocabolario chiuso che il motore sa eseguire:
- **prima**: una *specifica di progetto* per quel brief, che orienta il generatore;
- **dopo**: una *revisione con la vista*, che specializza con ritocchi la tavola scelta.

Il testo resta sempre del motore e non finisce mai dentro un'immagine generata.

---

## 1. Cosa c'è già

| Pezzo | Dove | Cosa sa fare |
|---|---|---|
| Regia a ruoli | `src/lib/ai/designer-roles.ts`, `/api/ai/design-direct` | Analista, copywriter e direttore (sei direzioni: sistema, stile, trattamento foto, regolatori), con i controlli della maestra. |
| Ruoli con immagini | `src/lib/ai/roles.ts` | `eseguiRuolo` accetta già le immagini e sceglie modelli con la visione. |
| Elementi della scena | `designer/types.ts` | Testi (contorno, corsivo per lettera, colore per parola, `fx`), foto (`look` pellicola, `adjust`, maschere, foto dentro le lettere), ornamenti generativi (`compose/ornaments`), glifi Celestial, sigilli, forme e tracciati. |
| Decori dello stile | `styles.ts` / `identita.ts` (`decor`) | Ogni identità ha ornamenti, glifi, look e finiture propri, ma li sceglie lo stile, non il brief. |
| Effetti | `fx/catalog.ts`, `fx/text-styles.ts` | Circa 40 effetti (neon, lamina, impressione, timbro, ricamo, eco, retino, riso…), circa 30 stili di testo pronti e circa 30 look fotografici. Il render li applica già agli elementi (`withFx`). |
| Forme | `gen/forme.ts` | Blob, tratti a mano, cerchio a pennarello, stelle, coriandoli, adesivi; lo sparpagliamento evita i testi. |
| Icone | `/api/icons` | Set Iconify in locale (Phosphor, Tabler, Game Icons, Fluent Emoji, Streamline), con ricerca per parola. Il motore designer però non le usa. |
| Controlli | `gen/tools.ts` `check()`, `gen/critico.ts` | Leggibilità sui contrasti, bordi, sovrapposizioni, voto e firma. |
| Ritocchi in chat | `ai/design-ops.ts` | Operazioni sul canvas Fabric dopo il posizionamento (allinea, maschera, ricolora, testo curvo, visual…). Usano coordinate libere e nessuno le ricontrolla. |
| Misura | `npm run designer:vetrina`, `scripts/confronto` | Fogli contatti e banco cieco; `confronto:genera --regia` tiene la regia in cache. |

## 2. Cosa manca

1. **Nessun canale porta dal brief ai segni.** Il direttore sceglie lo *stile*, non i *motivi*. Un barbiere e un caffè notturno nello stesso archetipo ricevono gli stessi ornamenti dello stile.
2. **Nel motore mancano le icone**: la scena non ha un elemento "icona".
3. **Effetti di testo e filtri esistono, ma nessuno li sceglie in base al contenuto.** Gli archetipi ne usano pochi, sempre gli stessi.
4. **La Chiamata 2 del progetto (§12, revisione con la vista) non esiste.** Il critico è solo codice e manca un ciclo "guarda → correggi" sulla tavola scelta.
5. **I ritocchi di oggi lavorano sul canvas**, con coordinate libere. Manca un vocabolario di ritocchi *sulla scena* che ripassi dalla maestra.

## 3. Strato "prima": la specifica di progetto

Nella regia entra un ruolo nuovo, piccolo e chiuso: il **progettista**. Lavora dopo l'analista e costa una chiamata in più. Dal brief e dall'analisi ricava una `Specifica` fatta solo di voci di menu:

```json
{
  "motivi":   ["baffi", "strisce-barbiere", "forbici"],
  "icone":    [{ "cerca": "scissors", "set": "ph", "ruolo": "segno" }, { "cerca": "razor", "ruolo": "ripetuto" }],
  "ornamenti":["strisce", "archi"],
  "glifi":    ["Starburst"],
  "testo":    { "titolo": "impressione-pelle", "parolaChiave": "corsivo-graziato", "invito": "timbro" },
  "foto":     { "look": "trix", "trattamento": "retino", "cerca": "rasoio e pennello da barba su legno" },
  "materia":  ["carta", "grana"],
  "segni":    ["sigillo", "nastro", "filetti"],
  "enfasi":   "Baffo",
  "evita":    ["neon", "glitter", "coriandoli"],
  "illustrazione": null
}
```

- **Vocabolario.** Il file `designer/progetto/vocabolario.ts` raccoglie i menu dai cataloghi che esistono già: ornamenti, glifi Celestial, stili di testo *sicuri* per la leggibilità, look, trattamenti e segni del §6.4. Aggiunge un piccolo dizionario di **motivi per settore**: ogni motivo diventa icone, ornamenti o forme che il motore sa disegnare (barbiere → strisce, baffi, forbici, sigillo; caffè → chicchi, vapore, tazza, isoipse). L'IA sceglie per nome e il motore sa eseguire ogni voce.
- **Maestra.** Ammette solo voci del menu e al massimo 3 icone. Controlla che `motivi` ed `evita` non si contraddicano e che lo stile del testo sia compatibile con lo stile scelto: per esempio niente lamina in un registro infantile. Gli errori tornano al ruolo, per al massimo 3 giri; poi si usa una specifica di ripiego presa dal dizionario dei settori, senza IA.
- **Nel motore.** La specifica viaggia dentro il contenuto (`DesignContent.progetto`), così arriva a tutti gli archetipi senza modificarli uno per uno. Agisce in tre punti:
  1. **Decoratore** (`gen/specializza.ts`, chiamato da `finish()` prima dei controlli). Sostituisce i decori generici dello stile con quelli della specifica: ornamenti e glifi, icone negli spazi liberi (con lo sparpagliamento di `forme.ts`, che evita i testi), segni come sigillo, nastro e timbro. Quanti ne aggiunge dipende dalla densità.
  2. **Testi e foto.** Il titolo e la parola chiave ricevono l'effetto scelto (`fx`), ma solo se il contrasto regge. La foto riceve look e trattamento.
  3. **Selezione.** `scegli()` dà un piccolo premio alle tavole che usano bene i motivi della specifica. Questo tocca `gen/index.ts`, quindi va concordato con l'altra sessione (vedi §7).
- **Icone nella scena.** Serve un elemento nuovo: `{ kind: 'icon', svg, x, y, size, color }`. Lo SVG si risolve una volta in regia (lato server, da `/api/icons`) e viaggia nella specifica, così il motore non ha bisogno della rete. Il nuovo elemento va gestito nel render, nella specchiatura e nel critico (`boxOf`).
- **Immagini o illustrazioni generate.** La specifica ha il campo (soggetto, materia, *nessun testo*), ma la generazione dipende da chiavi che oggi non hanno credito (GPT Image risponde 402, Gemini 429). Per questo è l'**ultimo** passo del piano. Senza chiavi resta la ricerca d'archivio, con il campo `cerca` della specifica.

## 4. Strato "dopo": la revisione che specializza

Serve una rotta nuova: `/api/ai/design-review`.

- **Ingresso**: la tavola scelta in PNG (resa nello Studio, oppure in Chromium per vetrina e banco), un riassunto della scena (elementi con nome, ruolo, riquadro e testo) e la specifica.
- **Prima le domande chiuse, poi i ritocchi.** Il modello risponde a poche domande sì/no: il titolo si legge? C'è un protagonista? La tavola dice "barbiere" a colpo d'occhio? Poi propone **al massimo 6 operazioni** da un vocabolario chiuso:

```
sposta(elemento, verso, moduli)          ridimensiona(elemento, fattore 0.7–1.4)
allinea(elemento, a: margine|asse|elemento)   togli(elemento decorativo)
decora(motivo, zona)                     icona(voce della specifica, zona, misura: piccola|media|grande)
effettoTesto(elemento, stile)            filtroFoto(foto, look | trattamento)
immagine(cerca | illustrazione, zona)    enfasi(parola)
+ quelle del §12: regolatore, contrasto, dispositivo(+/−), fuocoFoto, specchia
```

- **Niente coordinate.** Le zone sono una griglia 3×3 ("alto-destra", "centro"…), gli spostamenti si contano in moduli della griglia del motore e gli elementi si indicano con il loro nome, che è stabile.
- **Applicatore** (`designer/progetto/ritocchi.ts`, codice puro e testabile). Applica ogni operazione sulla scena e poi riesegue `check()` ed `esamina()`. Se un'operazione rompe la leggibilità, i bordi o le sovrapposizioni, **si annulla da sola** e il motivo finisce nel registro. I giri sono al massimo due: dopo il primo si rende una nuova immagine e si chiede una nuova revisione. Senza un modello con la vista lo strato si salta.
- **I testi non si toccano** nel contenuto: cambiano solo `enfasi` e lo stile. Il testo resta del motore.

## 5. Ordine di lavoro

| # | Passo | IA | Prova |
|---|---|---|---|
| 1 | Tipo `Specifica`, vocabolario e dizionario dei motivi per settore | no | test sui menu |
| 2 | Elemento `icon` (render, specchio, critico) e decoratore in `finish()` | no | vetrina con due specifiche scritte a mano, **Bottega Baffo** e **Notte Etiope**, sullo stesso archetipo e affiancate |
| 3 | Effetti di testo e filtri della foto presi dalla specifica, con il controllo del contrasto | no | vetrina senza testi illeggibili |
| 4 | Ruolo progettista nella regia: maestra, risoluzione delle icone, passaggio nel pannello e nella cache del confronto | 1 chiamata in più | `confronto:genera --regia` |
| 5 | Applicatore dei ritocchi, con annullamento e ricontrollo | no | test con operazioni scritte a mano |
| 6 | Revisione con la vista (rotta, PNG, due giri) e pulsante "Specializza" nello Studio: la UI te la mostro prima di farla | 1–2 chiamate per tavola | banco Q0 con la tavola prima e dopo |
| 7 | Illustrazioni generate, senza testo | a pagamento | quando ci sono le chiavi |

I passi 1–3 e il 5 non costano crediti. Il risultato si vede già al passo 2, con specifiche scritte a mano.

**Fatto quando**: con lo stesso archetipo, Bottega Baffo e Notte Etiope danno tavole visibilmente diverse per segni, icone ed effetti; la vetrina resta senza testi illeggibili; il banco misura le tavole prima e dopo la revisione.

## 6. Rischi

- **Troppa decorazione.** Il decoratore rispetta la densità e il vuoto obiettivo, il critico penalizza l'affollamento ed `evita` toglie i decori generici.
- **Icone fuori registro.** Gli SVG prendono l'inchiostro della palette e si usano i set monocromi (Phosphor e Tabler). Le icone a colori restano ai registri pop e infantile.
- **Modelli gratuiti deboli nella vista.** Le domande sono chiuse, le operazioni al massimo 6 e il codice ricontrolla ognuna: un consiglio sbagliato si annulla da solo.

## 7. Coordinamento con la sessione "Più varianti nel motore designer"

Quella sessione lavora su `gen/index.ts` e sugli archetipi; questo piano li evita.

- **File nuovi**: `designer/progetto/*` e `gen/specializza.ts`.
- **File con modifiche piccole**: `types.ts` (elemento `icon`, `DesignContent.progetto`), `render.ts`, `gen/tools.ts` (una chiamata in `finish()` e l'icona nella specchiatura), `gen/critico.ts` (`boxOf`).
- **`gen/index.ts`**: l'unica modifica è il premio nella selezione (§3, punto 3), e la faccio per ultima, dopo che l'altra sessione ha consegnato.
