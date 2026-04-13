# Handoff Tecnico: Creative OS - "Cervello" AI Logic

Questo documento è destinato a un'altra istanza di IA o a uno sviluppatore senior per riprendere il lavoro sull'integrazione AI/RAG e sulla stabilità del sistema di progettazione.

## 🧠 Flusso Dati AI (Cervello)
Il sistema utilizza un'architettura **"Zero-Fluff"** per minimizzare la latenza e massimizzare la rilevanza nel prompt system.

1.  **Frontend**: `DesignWindow.tsx` e `AIChatWidget.tsx` usano `@ai-sdk/react`.
2.  **API**: `/api/ai/route.ts` è l'entry point unico.
3.  **Context Construction**: La funzione `buildContext` (in `src/lib/ai/context.ts`) assembla:
    - **Snapshot**: Stato attuale di task, appuntamenti e messaggi (Query SQL).
    - **RAG (Vault)**: Ricerca semantica negli archivi `.md` del cliente.
    - **Memories**: Fatti persistenti salvati durante le conversazioni.

## 🔍 Analisi Critica del RAG (`src/lib/vault/index.ts`)
La logica attuale è funzionale ma presenta "debiti tecnici" noti:
- **Embedding**: Utilizza `google.textEmbeddingModel('text-embedding-004')`. Richiede `GEMINI_API_KEY`.
- **Similarity**: Implementata in puro JavaScript (`cosine` similarity) iterando su tutti i chunk nel database.
- **Performance**: Con < 10.000 chunk è veloce (< 1s), ma diventerà un collo di bottiglia con database più grandi. Non usa search vettoriale nativa (sqlite-vec) per problemi di compatibilità con Node 24 in certi ambienti Windows.
- **Threshold**: Impostata a `0.45`. Chunk con punteggio inferiore vengono scartati per evitare "rumore" nel prompt.

## 🛠️ Sistema di Progettazione (Canvas)
L'IA agisce sul canvas di Fabric.js tramite tool call:
- **Tool**: `createDesignBoards`.
- **Payload**: Un array di `boards` con elementi (rect, circle, text, image, path).
- **Integrazione**: Il frontend cattura la `toolInvocation`, la salva nello stato `aiCommand` e il componente `CreativeStudio` la esegue tramite `useEffect`.

## ⚠️ Problemi Noti e Incompiutezze
1.  **Race Conditions**: `AIChatWidget` usa un `setTimeout` per iniettare il contesto nell'input prima del submitt. Sarebbe meglio passare il contesto direttamente nel `body` della chiamata all'AI.
2.  **Stabilità Streaming**: Se la `buildContext` fallisce o è troppo lenta, lo stream non parte.
3.  **Gerarchia Design**: L'IA ha ricevuto istruzioni "Elite" (gerarchia visiva, padding), ma la resa finale dipende dalla precisione delle coordinate generate nel tool `createDesignBoards`.

## 🚀 Come Proseguire
- I file core per l'AI sono in `src/lib/ai` e `src/app/api/ai`.
- Se la chat non risponde, controllare i log del server per errori di embedding o timeout del modello Anthropic/Google.
