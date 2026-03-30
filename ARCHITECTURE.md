# Creative OS - Struttura e Architettura (Iniziale)

Questo documento traccia l'architettura tecnica iniziale per la **Fase 1** (Fondamenta).

---

## 1. Stack Tecnologico Baseline
- **Frontend**: Next.js App Router, React, TypeScript, Tailwind CSS.
- **Backend/API**: Next.js API Routes (`src/app/api/*`).
- **Database e Auth**: Supabase (PostgreSQL, Row Level Security, Supabase Auth via SSR).
- **Google Integration**: OAuth (Drive, Calendar, Gmail).

---

## 2. Setup Effettuato
- **Next.js**: Progetto base inizializzato nella cartella `c:\Users\Acer\Downloads\Mader\creative-os`.
- **Supabase SSR**: Creati i client helper in `src/lib/supabase/client.ts`, `server.ts` e `middleware.ts` per propagare la sessione in tutti gli strati dell'applicazione Next.js.
- **Login e OAuth**: Creato `src/app/login/page.tsx` con bottone "Accedi con Google".
  La route di callback si trova in `src/app/auth/callback/route.ts` e converte il code in sessione tramite supabase server client.
  - **Scopes richieste**: `https://www.googleapis.com/auth/drive`, `https://www.googleapis.com/auth/calendar`, `https://www.googleapis.com/auth/gmail.readonly`.

---

## 3. Da Implementare (Fase 2+)

### 3.1 Tabelle Supabase & RLS
- Servirà definire le tabelle in Supabase (`clients`, `tasks`, `ideas`, `context_instructions`) e attivare Row Level Security.
- L'unica migrazione già eseguita è `user_tokens`, per memorizzare `provider_token` e `provider_refresh_token` di Google generati al login.
- Regola fissa: Tutte le nuove tabelle Supabase devono disporre di regole RLS basate su `id = auth.uid()`.

### 3.2 Endpoint API AI (Next.js Routes) e Timeout/SSE
- Tutte le interazioni in sync con l'AI da UI (Claude API nel portale) dovranno usare Server-Sent Events (SSE) (Streaming Output) per aggirare i limit di timeout Vercel. Usa le queue n8n asincrone solo per task silenti.
- Creare API in `src/app/api/ai/planner/route.ts` (o simili) per invocare le Anthropic API internamente.

### 3.3 Estensione Chrome (Manifest V3)
- Scaffold di base creato in `extension/`.
- L'Auth bridge avviene tramite l'endpoint GET `src/app/api/auth/extension-token/route.ts`. L'estensione estrae il sign token per via postMessage o navigazione aperta e persiste il tutto localmente `chrome.storage.local`.
- Le chiamate Chrome Extension -> Portale dovranno essere sempre validate contro l'Authorization Header.
