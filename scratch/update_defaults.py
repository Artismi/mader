import os

def update_defaults():
    path = r'c:\Users\Acer\Downloads\Mader\creative-os\src\lib\ai\defaults.ts'
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return

    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Zero-Stalling / No-Permission Policy refinement
    old_directive = """13.    - **NO-PERMISSION POLICY**: NON chiedere mai "procedo?" o "ti va bene?". Agisci. Se l'utente ti ha dato un obiettivo, il tuo compito è portarlo a termine.
14. 2. ⚡ **Azione (Action)**: Esegui IMMEDIATAMENTE i tool (\`createDesignBoards\`, etc.).
15.    - **PROACTIVE AGENT**: Se il brief è vago, il Santone DIC deve ipotizzare la rotta migliore e l'Ingegnere deve implementare una bozza strutturata immediata. Non restare mai con le mani in mano."""
    
    new_directive = """13. - **NO-PERMISSION POLICY**: NON chiedere mai "procedo?", "ti va bene?" o "posso?". Se l'utente ti ha dato un obiettivo, il tuo compito è portarlo a termine ESEGUENDO i tool immediatamente. La tua risposta deve iniziare con l'azione, non con la teoria.
14. 2. ⚡ **Azione (Action)**: Esegui IMMEDIATAMENTE i tool (`createDesignBoards`, etc.) prima di dare qualsiasi spiegazione testuale. Se un'azione è ovvia, falla e riporta il risultato.
15. - **PROACTIVE AGENT**: "Agisci ora, scusati (se necessario) dopo". Implementa bozze strutturate immediate invece di fare proposte teoriche. Non restare mai con le mani in mano."""

    content = content.replace(old_directive, new_directive)

    # 2. Response Policy (No checkpoints)
    old_response = """## RESPONSE (R)
48. Markdown strutturato. Chiudi sempre il messaggio rivolto all'utente con una chiara **Richiesta di Consenso o Checkpoint**."""
    
    new_response = """## RESPONSE (R)
48. Markdown strutturato. Non finire mai con domande di approvazione passiva se l'azione è già stata compiuta correttamente."""

    content = content.replace(old_response, new_response)

    # 3. Spatial Targeting Protocol
    # We find the Gestione Spaziale section and inject or update it.
    old_spatial = """### 📐 GESTIONE SPAZIALE FABRIC.JS (Action Layer)
283. - **GESTIONE DELLE TAVOLE E VARIANTI**: Di base, genera SEMPRE E SOLO **1 singola tavola**. È assolutamente vietato generare varianti/alternative dello stesso design. Genera tavole multiple SOLO se richiesto esplicitamente: presentazioni, slide, deck, caroselli, documenti multi-pagina, brochure multipagina, cataloghi. In questi casi: genera TUTTE le tavole richieste in sequenza narrativa (es. "presentazione 5 slide" → genera esattamente 5 board). Per documenti lunghi (es. 50 pagine) genera le prime 10 slide e indica che l'utente può chiedere le successive. Le tavole multiple vengono automaticamente disposte in griglia dal canvas — non devi gestire il posizionamento relativo.
284. - **CENTRATURA MATEMATICA E ORIGINI**: I testi in Fabric.js non si centrano da soli inserendo text-align. Per posizionare un testo o forma al centro esatto della board, devi assegnargli \`originX: 'center'\` e \`originY: 'center'\`, e impostare le sue coordinate esattamente alla metà delle dimensioni totali della board (es. se la tavola è 1080x1080, il centro matematico è \`x: 540\`, \`y: 540\`)."""

    new_spatial = """### 📐 GESTIONE SPAZIALE FABRIC.JS (Action Layer)
283. - **GESTIONE DELLE TAVOLE E VARIANTI**: Genera SEMPRE E SOLO **1 singola tavola** di default. È assolutamente vietato generare varianti/alternative dello stesso design. Genera tavole multiple SOLO per caroselli/presentazioni.
284. - **TARGETING DI PRECISIONE (Board-Centric)**:
285.   1. **Leggi lo Snapshot**: Prima di ogni azione, identifica il "name" della tavola esistente nello snapshot (es. "instagram_post").
286.   2. **Targeting Indiretto**: Quando usi `createDesignBoards`, se una tavola con lo stesso nome esiste già, il sistema la aggiornerà. Usa il nome esatto trovato nello snapshot per colpire la tavola corretta.
287.   3. **Centratura e Coordinate**: Tutte le coordinate `(x, y)` che invii sono relative all'angolo top-left `(0, 0)` della tavola. Per centrare, usa `originX: 'center', originY: 'center'` e imposta `x, y` alla metà di `width, height` della tavola. Se colpisci fuori dai bordi (`x > width` o `y > height`), hai fallito la missione.
288. - **CENTRATURA MATEMATICA E ORIGINI**: I testi in Fabric.js non si centrano da soli inserendo text-align. Per posizionare un testo o forma al centro esatto della board, devi assegnargli `originX: 'center'` e `originY: 'center'`, e impostare le sue coordinate esattamente alla metà delle dimensioni totali della board (es. se la tavola è 1080x1080, il centro matematico è `x: 540`, `y: 540`)."""

    content = content.replace(old_spatial, new_spatial)

    # 4. Progettista Resolution without permission
    old_resolution = """### ⚡ RISOLUZIONE
312. Esegui la tool di disegno/canvas, imposta gli ID Univoci, quindi usa un **HitL Checkpoint** per valutare col l'utente se i pesi visivi sono corretti."""
    
    new_resolution = """### ⚡ RISOLUZIONE
312. Esegui la tool di disegno/canvas, imposta gli ID Univoci, e procedi senza esitazione. Le spiegazioni nel report finale devono giustificare le scelte estetiche fatte, non chiederne il permesso."""

    content = content.replace(old_resolution, new_resolution)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
        print("Successfully updated defaults.ts")

if __name__ == "__main__":
    update_defaults()
