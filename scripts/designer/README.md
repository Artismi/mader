# Banco di prova del motore designer

Genera le tavole del motore (`src/components/studio/designer/gen`) per i contenuti di prova in ogni formato, con il render vero dello Studio (Fabric + motore effetti, in Chromium), e scrive in `out/`:

- un foglio contatti per contenuto e formato (`caffe-storia.jpg`…), con le tavole scartate e il motivo;
- `rapporto.md` e `rapporto.json`: tavole riuscite, scarti per sistema, tempi.

## Uso

```bash
cd scripts/designer && npm install     # la prima volta
cd ../.. && npm run designer:vetrina   # tutto (12 contenuti × 4 formati)
npm run designer:vetrina -- --contenuti caffe,mostra --formati storia
npm run designer:vetrina -- --sistemi eco,orbita --knobs '{"energia":0.9,"inverti":true}'
```

Il browser è Chrome installato sul computer; per usarne un altro: `DESIGNER_CHROME=/percorso/chrome`.

## Contenuti e foto

`fixtures/contenuti.json`: dodici casi (caffè, ceramica, evento techno, dischi, ristorante, mercato, viaggio, beauty, mostra, app, conferenza, citazione), tre senza foto.

Le foto mettono alla prova la leggibilità: fragole (fondo molto mosso), medusa (scuro e calmo), lago (zone calme), vinile (chiaro). Provengono da Unsplash (licenza Unsplash, anche tramite picsum.photos) e servono solo per le prove.
