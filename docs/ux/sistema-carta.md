# Sistema "Carta"

Un solo linguaggio visivo per tutta Creative OS, ricavato dalla home: il guscio circolare su `/os`.
Il guscio è la prima schermata che Electron apre ed è quella approvata. Le altre pagine avevano un tema scuro viola e blu, e ora parlano la stessa lingua del guscio.

## Dove sta

| cosa | file |
|---|---|
| token, rampe, ponte dal tema scuro, primitive `.cos-*` | `src/app/globals.css` |
| guscio `/os` (usa gli stessi token tramite alias) | `src/components/os/os.css` |
| componenti React di base | `src/components/ui/{button,card,badge,input,page-header}.tsx` |
| cornice delle pagine (barra, foglio centrale, dock, pannelli) | `src/components/layout/{RootShell,Header}.tsx`, `src/components/ui/desk-dock.tsx` |

## Il linguaggio

- **Materiale.** Un tavolo di carta calda (`--cos-bg #eeebe4`) con i cerchi concentrici della ghiera. Sopra, un foglio più chiaro (`--cos-surface #fbfaf7`) con raggi grandi (30–40 px) e un filetto (`--cos-line`). Niente vetro e niente nero.
- **Inchiostro.** Tre livelli di testo, tutti AA:
  - `--cos-ink`: 16.9:1;
  - `--cos-t2`: 7.9:1;
  - `--cos-t3`: 4.7:1 sul tavolo.

  Il grigio terziario del guscio era `#888174`, al 3.4:1. Ora è `#6e675b`.
- **Un solo colore vivo.** L'arancio `--cos-hot #ff4f1f` serve per segni, bolli e riempimenti grandi. Per il testo piccolo si usa `--cos-hot-ink #c13a10` (5.2:1). Il verde `--cos-ok` e il rosso `--cos-err` restano agli stati.
- **Tipografia.** Due voci:
  - Segoe UI Variable, Display per i titoli e Text per il testo;
  - Space Mono per etichette, numeri e orari.

  Scala 1.25: 11 · 13 · 15 · 18 · 23 · 29 · 36 · 45. I titoli hanno tracking negativo e peso 700–800, mai 900.
- **Forma.** Pillole e cerchi:
  - le azioni sono pillole;
  - le icone stanno in cerchi;
  - lo stato attivo è un cerchio d'inchiostro, come la ghiera e il dock.
- **Ritmo.** Base 4. Passi 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64. Le pagine stanno in `.cos-page`: colonna di 1120 px, o 760 px con `is-narrow`, margini di 48 px che scendono a 18 px sotto i 640 px.
- **Movimento.** `--cos-ease` per entrate e uscite, `--cos-spring` per le pressioni (il bollo del primario ruota di 12°). Rispetta `prefers-reduced-motion`.

## Il dettaglio di bottega

- **Segni di taglio** (`.cos-crop`). Al passaggio o al focus su un foglio, ai quattro angoli compaiono i crocini arancio della tipografia, come su una tavola pronta per la stampa. Non sono un decoro fisso: segnano "questo è il foglio su cui stai lavorando".
- **Segno di registro** (`.cos-reg`). Il caricamento è il mirino di stampa che gira: cerchio e croce, con il tratto centrale arancio.
- **Cerchio di registro** (`.cos-ring` dentro `.cos-empty`). Lo stato vuoto: anelli concentrici ripresi dalla ghiera.

## Come si usa nel codice nuovo

```tsx
<div className="cos-page">
  <PageHeader kicker="3 incarichi" title="Incarichi" lead="…" actions={<Button><span className="cos-dot"><Plus/></span>Nuovo</Button>} />
  <section className="cos-card cos-crop p-6">…</section>
  <EmptyState icon={<Search/>} title="Ancora niente">Cosa fare per cominciare.</EmptyState>
</div>
```

Per le classi Tailwind ci sono i nomi semantici: `bg-paper`, `bg-desk`, `bg-sunk`, `border-line`, `text-ink`, `text-ink-2`, `text-ink-3`, `bg-hot`, `text-hot-ink`, `font-display`, `font-mono`.

Le primitive sono:
- `.cos-btn` con `-primary`, `-secondary`, `-ghost` e `-danger`, e le taglie `-sm`, `-lg` e `-icon`;
- `.cos-field`;
- `.cos-badge` con `is-hot`, `is-ok` e `is-err`;
- `.cos-kicker`, `.cos-title` e `.cos-lead`;
- `.cos-card`, `.cos-error` e `.cos-loading`.

Stanno in `@layer components`, quindi le utility passate in `className` vincono.

## Il ponte dal vecchio tema scuro

Il codice storico (~2.700 usi di `white/…`) è scritto come testo bianco su fondo nero. Riscriverlo file per file sarebbe costato troppo. Il ponte in `globals.css` lo traduce in tre modi.

1. **`white` = inchiostro, `black` = carta.** `text-white/60` diventa inchiostro al 60%, `bg-white/5` un velo d'inchiostro sulla carta, `bg-black/50` un velo di carta.
2. **Rampe "piegate".** Violet, purple, indigo, pink e orange diventano arancio. Sky, blue e cyan diventano petrolio. Emerald e green diventano verde. Amber e yellow diventano ocra. Red e rose diventano rosso. I grigi diventano neutri caldi. In ogni rampa:
   - 50–200 e 800–950 sono tinte chiare;
   - 300–700 sono leggibili su carta (≥ 4.5:1).

   Così cadono giusti sia `text-violet-400` e `bg-violet-950/40`, scritti per lo scuro, sia `text-violet-700` e `bg-violet-50`, scritti per il chiaro.
3. **Correzioni puntuali.**
   - Le trasparenze del testo si agganciano alla scala a tre inchiostri: da `/10` a `/60` diventano `t3`, da `/65` a `/90` diventano `t2`.
   - Le etichette in maiuscolo con spaziatura larga diventano monospazio.
   - Sotto i 10 px non si scende.
   - I fondi esadecimali scuri (`bg-[#0a0a0a]`, anche con alfa) diventano tavolo, foglio o incavo.
   - Le modali storiche prendono raggio e ombra del sistema.

Il ponte è una rete di sicurezza, non il traguardo. Quando si tocca un componente, lo si riscrive con i nomi semantici e le primitive, e la sua voce nel ponte smette di servire.

## Stato per pagina

Riscritte con le primitive:
- cornice: barra, foglio, dock, Co-Pilot;
- Clienti, Incarichi, Idee, Impostazioni (compresa la scheda Modelli AI);
- intestazione e schede di Studio;
- guscio `/os`, che ora ha anche la disposizione per finestra stretta.

Coperte dal ponte:
- la tela (barre e pannelli di `creative-studio.tsx`; nel file sono cambiate solo 2 righe di stile: il fondo del tavolo Fabric e l'angolo dei righelli);
- Inbox, Editoriale, Lancio, Memoria, Cervello, Finanze, Domini, Assets, Oggi legacy.

Assets, Finanze e Domini hanno già la colonna `.cos-page`.

Prima e dopo: `Mader/ux-prima-dopo/confronto.html`, a 1440×900 e a 390×844.
