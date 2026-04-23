import os

def update_defaults_by_line():
    path = r'c:\Users\Acer\Downloads\Mader\creative-os\src\lib\ai\defaults.ts'
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return

    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Note: lines are 0-indexed in Python, but 1-indexed in view_file.
    # line 13 is index 12

    # 1. Directives (13, 14, 15)
    lines[12] = '    - **NO-PERMISSION POLICY**: NON chiedere mai "procedo?", "ti va bene?" o "posso?". Se l\'utente ti ha dato un obiettivo, il tuo compito è portarlo a termine ESEGUENDO i tool immediatamente.\n'
    lines[13] = '2. ⚡ **Azione (Action)**: Esegui IMMEDIATAMENTE i tool (`createDesignBoards`, etc.) prima di dare qualsiasi spiegazione testuale. Se un\'azione è ovvia, falla e riporta il risultato.\n'
    lines[14] = '    - **PROACTIVE AGENT**: "Agisci ora, scusati (se necessario) dopo". Implementa bozze strutturate immediate invece di fare proposte teoriche. Non restare mai con le mani in mano.\n'

    # 2. Response (48)
    lines[47] = '48. Markdown strutturato. Non finire mai con domande di approvazione passiva se l\'azione è già stata compiuta correttamente.\n'

    # 3. Spatial Targeting (283, 284)
    # We replace 2 lines with a larger block.
    spatial_block = [
        '- **GESTIONE DELLE TAVOLE E VARIANTI**: Genera SEMPRE E SOLO **1 singola tavola** di default. È assolutamente vietato generare varianti/alternative dello stesso design.\n',
        '- **TARGETING DI PRECISIONE (Board-Centric)**:\n',
        '  1. **Leggi lo Snapshot**: Prima di ogni azione, identifica il "name" della tavola esistente nello snapshot (es. "instagram_post").\n',
        '  2. **Targeting Indiretto**: Quando usi `createDesignBoards`, se una tavola con lo stesso nome esiste già, il sistema la aggiornerà. Usa il nome esatto trovato nello snapshot per colpire la tavola corretta.\n',
        '  3. **Centratura e Coordinate**: Tutte le coordinate `(x, y)` sono relative all\'angolo top-left `(0, 0)` della tavola. Per centrare, usa `originX: "center", originY: "center"` e imposta `x, y` alla metà di `width, height`.\n',
        '- **CENTRATURA MATEMATICA E ORIGINI**: I testi in Fabric.js non si centrano da soli. Per posizionare un testo o forma al centro esatto, usa `originX: "center", originY: "center"` e coordinate (boardW/2, boardH/2).\n'
    ]
    # Splicing: replace index 282 and 283 (which are lines 283 and 284)
    lines[282:284] = spatial_block

    # 4. Risoluzione (311 text, which moves after spatial_block insertion)
    # We need to find the new index of the Risoluzione line.
    # It was at line 312 (index 311). We added (6 - 2) = 4 lines.
    # So new index is 311 + 4 = 315.
    
    # Actually, it's safer to find the line by content.
    for i, line in enumerate(lines):
        if "HitL Checkpoint" in line:
            lines[i] = '312. Esegui la tool di disegno/canvas, imposta gli ID Univoci, e procedi senza esitazione. Le spiegazioni nel report finale devono giustificare le scelte fatte, non chiederne il permesso.`\n'
            break

    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
        print("Successfully updated defaults.ts by line indexing")

if __name__ == "__main__":
    update_defaults_by_line()
