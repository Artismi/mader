# Creative OS — Contesto per Claude Code

## Cos'è questo progetto
Creative OS è un overlay intelligente per freelance creativi.
Non sostituisce i tool esistenti — li connette, portando il contesto
dove l'utente lavora. Due componenti: Portale Next.js + Estensione Chrome.

## Documento di riferimento principale
L'ARD completo è disponibile come `creative-os-ard-v2.1.txt` o `creative-os-ard-v2.1.docx`.
Contiene tutte le decisioni architetturali, i flussi UX e le regole
di comportamento del sistema.

## Stack attivo
- Frontend: Next.js (App Router) + TypeScript + Tailwind
- Auth: Supabase Auth + Google OAuth (Drive, Gmail, Calendar)
- Database: Supabase (Postgres + RLS)
- Connettori MCP: Notion, Canva, Figma/FigJam, n8n, Vercel
- Estensione: Chrome Manifest V3 in React

## Regole invarianti — non si cambiano senza discussione esplicita

1. Claude non esegue mai azioni autonome senza conferma utente
2. Claude legge solo file esplicitamente selezionati dall'utente
3. Tre livelli di soglia per operazioni sul sistema:
   - Verde (non distruttive): eseguite liberamente
   - Giallo (potenzialmente distruttive): mostra preview + attende sì
   - Rosso (irreversibili): richiede formula esatta "conferma eliminazione [nome]"
4. Il contesto AI è sempre visibile e modificabile dall'utente
5. Nessuna confusione tra contesti di clienti diversi

## Architettura API bridge
Il frontend chiama API route Next.js → le route chiamano Claude con MCP.
Non esporre mai chiavi MCP lato client.
Pattern: `src/app/api/ai/[action]/route.ts`

## F7 — Finestra di Progettazione
FigJam e blocco testi NON sono split view separati.
Sono due modalità della stessa superficie con passaggio istantaneo (tab).
Scambio bidirezionale: outline FigJam → struttura testo, testo → note canvas.
(Nota tecnica: FigJam NON viene embeddato via IFrame in modo bidirezionale in tempo reale. Le modifiche visuali vengono da MCP su richiesta utente esplicita "Importa".)

## Riferimenti tecnici
- Scelte tecniche F1: vedi `ARCHITECTURE.md` (già presente, contiene logiche su user_tokens, SSE proxy).
- Struttura Drive: `/_CLIENTI/[Nome]/{_vault.md, progetti/, asset/, documenti/}`
- Struttura Supabase: vedi ARCHITECTURE.md → sezione 3.1 Tabelle Supabase & RLS
- Endpoint Auth Extension: `src/app/api/auth/extension-token/route.ts`
