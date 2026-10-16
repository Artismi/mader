# Librerie di asset: caratteri, icone, texture, illustrazioni

Piano del 16 ottobre 2026. Completa `varieta-e-affinamento.md`: la varietà di struttura serve a poco se i materiali sono sempre gli stessi.

## Dove siamo

- **Caratteri: 57 famiglie** (`designer/core/caratteri.ts`), quasi tutte grotesche moderne di Google Fonts: Inter, DM Sans, Manrope, Sora, Outfit, Figtree e simili. Poche serif da testo, quasi niente di sperimentale, storico, stencil, monolinea, script vero o carattere a contrasto estremo. Gli abbinamenti sono fissi, nelle schede degli stili.
- **Asset**: `public/assets` (223 file), `public/fonts` (75), più i generatori in `studio/libraries/` (pennelli, forme, texture, generatori procedurali, Celestial). Manca un catalogo unico con tag, licenza e ricerca: il motore non può "andare a cercare" il materiale adatto.

## Il principio: un catalogo, non una cartella

Ogni asset, che sia un font, un'icona, una texture o un'illustrazione, entra in un **catalogo** (`asset-catalogo.json` più i file in cache locale) con queste informazioni:
- tipo, fonte, **licenza** e attribuzione;
- tag di genere, epoca, umore e soggetto;
- colori dominanti;
- per i font, anche le misure (vedi sotto);
- un'impronta CLIP per la ricerca a parole ("carta kraft stropicciata", "icona chicco di caffè", "incisione botanica").

La regia e i mattoni del motore scelgono dal catalogo per tag e per somiglianza, e non da elenchi scritti a mano.

**Regola sulle licenze:** nelle tavole consegnate ai clienti entrano solo asset con licenza commerciale senza obblighi di condivisione. L'attribuzione, quando è richiesta, si raccoglie in automatico per ogni tavola. Le licenze share-alike (CC BY-SA) e quelle "solo uso personale" restano fuori.

## Caratteri (la priorità)

**Fonti, tutte con licenze libere per l'uso commerciale:**

| Fonte | Licenza | Perché |
|---|---|---|
| Google Fonts, catalogo completo (~1.700 famiglie) | OFL | la base; oggi ne usiamo il 3% |
| Velvetyne | OFL | sperimentali e d'autore (per esempio Basteleur, Karrik, Ouroboros) |
| Collletttivo | OFL | fonderia collettiva italiana, display con carattere |
| The League of Moveable Type | OFL | classici libri (League Gothic, Ostrich…) |
| Badass Libre Fonts by Womxn | OFL | display contemporanei |
| Open Foundry, Font Library | OFL e simili | specimen curati |
| Fontshare (Indian Type Foundry) | licenza propria, gratuita anche per uso commerciale | Satoshi, Clash Display, Cabinet Grotesk, Gambetta… **Prima di includerli nell'app va verificato se la licenza ne permette la ridistribuzione.** |

**Classificazione automatica, gratis e in locale.** Uno script legge ogni file con opentype.js e misura:
- peso, larghezza, altezza della x e rapporto tra le maiuscole;
- contrasto dei tratti, presenza delle grazie, apertura e rotondità;
- assi variabili, set di glifi (accenti italiani obbligatori), legature.

Ne ricava genere ed epoca: grotesco, neo-grotesco, geometrico, umanista, didone, garalde, slab, script, monospaziato, stencil, display.

**Abbinamenti generati, non fissi.** Con le misure si abbinano i font per contrasto voluto: stessa struttura e ruoli diversi, oppure contrasto netto di genere con altezze della x compatibili. Così le coppie diventano migliaia, verificate da regole.

**Nuovo regolatore `sperimentazione` (0–1).** A 0 il motore usa testi sobri e classici; a 1 osa con display, stencil, variabili deformati, monolinea e font d'autore. È lo spazio per sperimentare che oggi manca.

**Peso sul disco.** Si scaricano subito circa 300 famiglie curate (circa 150–250 MB); le altre su richiesta, con una cache. Nella vetrina tutto resta locale.

## Icone e simboli

- **Lucide** (ISC), **Tabler** (MIT, oltre 5.000), **Phosphor** (MIT, 6 pesi, dal sottile al pieno, anche duotone), **Iconoir** (MIT), **Remix** (Apache), **Material Symbols** (Apache, con assi variabili).
- **Game-icons** (CC BY 3.0, oltre 4.000 illustrative): solo con attribuzione automatica.
- Lo **stile coerente** si ottiene con un set per tavola, spessore del tratto legato al peso del testo e colori della palette.

## Texture e materia

- **Prima le texture procedurali** (nessun problema di licenza, varietà infinita): carta con fibre, cartone, grana di stampa, retini, riso, serigrafia, pieghe, macchie d'inchiostro, nastri, timbri consumati. Parte esiste già in `materia.ts` e `texture-library.ts`; va ampliata e resa parametrica.
- **Fotografiche CC0**: **ambientCG** e **Poly Haven** (superfici, carte, muri, tessuti).

## Illustrazioni, immagini e archivi

- **Pubblico dominio di qualità museale (CC0):** Smithsonian Open Access, Metropolitan Museum Open Access, Rijksmuseum, NYPL Public Domain, Biodiversity Heritage Library (incisioni botaniche e zoologiche). Perfetti per collage, editoriale e vintage: materiale che i generatori di immagini non danno.
- **Illustrazioni vettoriali:** Open Peeps e Open Doodles (CC0). unDraw ha una licenza propria: va verificata.
- **Foto:** API di Unsplash e Pexels (licenze gratuite per uso commerciale, con le loro condizioni d'uso dell'API) e Openverse, filtrata sulle licenze commerciali.
- **Motivi:** generati (V3 di `varieta-e-affinamento.md`), più Hero Patterns (CC BY 4.0) con attribuzione.

## Fasi

- **AS1. Catalogo e licenze**: lo schema del catalogo, la cache locale e le regole di licenza e attribuzione. Si importano i 57 font attuali e gli asset di `public/` per non perdere niente.
- **AS2. Caratteri**: script di importazione (Google Fonts completo, più Velvetyne, Collletttivo, League e Womxn), classificazione con opentype.js, 300 famiglie curate in locale, abbinamenti generati, regolatore `sperimentazione`. Verifica nella vetrina: quante coppie diverse compaiono nelle prime 12 proposte.
- **AS3. Icone**: Lucide, Tabler, Phosphor e Iconoir nel catalogo, con ricerca per parola (anche in italiano, tramite sinonimi), e un mattone "icone" nel motore.
- **AS4. Texture procedurali parametriche** più ambientCG e Poly Haven, con i mattoni "materia" di V1 collegati al catalogo.
- **AS5. Archivi museali e illustrazioni**: importazione selettiva (per esempio 2.000 immagini per tema), impronte CLIP, mattone "illustrazione d'archivio" (collage, editoriale).
- **AS6. Ricerca semantica**: impronte CLIP di tutto il catalogo, così la regia chiede "texture calda e materica per un caffè" e ottiene i candidati.

Ordine: AS1 → AS2 subito, perché sono il collo di bottiglia che si vede di più; poi AS3 e AS4; AS5 e AS6 insieme a V2 (il gusto con CLIP), perché usano lo stesso modello.

Tutto si scarica una volta sola e poi gira in locale, senza costi per chiamata.
