# Artista-osservatore (versione autonoma)

La stessa mente di Creative OS, in un'app Next.js da pubblicare su Vercel.
Archivio (stato, tavole, immagini) nel browser, in IndexedDB. Il server legge solo il web.

## Vercel
1. Vercel → Add New → Project → importa `Artismi/mader`.
2. Root Directory: `apps/artista`. Framework: Next.js (rilevato).
3. Deploy. Se il branch di produzione non è `studio-agent`: Settings → Git → Production Branch → `studio-agent`, poi Redeploy.

## Locale
```
npm install
npm run dev
```

## Aggiornare dal codice di Creative OS
`npm run sync` ricopia mente, mani, occhi, voce e Lab da `../../src`. Il `transport.ts` locale (archivio nel browser) non viene toccato.

## Biblioteca
`npm run biblioteca -- <cartella>` mette .md e .txt in `public/biblioteca/index.json`. Ora contiene le research_notes di stateyour.
