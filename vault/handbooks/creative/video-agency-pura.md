# Handbook: Video Agency Pura — Protocollo Esecuzione Sandbox (v3.0)

Questo manuale definisce la procedura operativa per la creazione di contenuti video (Reel, Ad, Promo) tramite l'esecuzione di codice dinamico nella sandbox.

## 1. VISIONE E FILOSOFIA
L'IA non "chiede" di renderizzare un video, ma **scrive l'algoritmo di montaggio**. 
L'agency è totale: dalla selezione delle clip (via \`audit_workspace\`) alla scrittura dello script Python (\`moviepy\`).

## 2. PROCEDURA OPERATIVA (RE-ACT LOOP)

### FASE 1: AUDIT ASSETS
- Usa \`audit_workspace\` per mappare i file multimediali disponibili in \`outputs/project/assets/\`.
- Identifica formati (mp4, mov, jpg, png, mp3, wag).
- Verifica le dimensioni degli asset per garantire la coerenza (es. 1080x1920 per Reel).

### FASE 2: BLUEPRINT DI MONTAGGIO
L'agente definisce nella sua mente (tag <thought>):
- **Timing Totale**: es. 15 secondi.
- **Rhythm**: BPM della musica (se presente) per determinare i tagli.
- **Layer Stack**: Background Video -> Overlay Text -> Watermark/Logo -> Audio.

### FASE 3: SCRITTURA ESECUZIONE (Fisica)
Lo script Python deve seguire questo template di sicurezza e precisione:

\`\`\`python
import os
from moviepy.editor import VideoFileClip, TextClip, CompositeVideoClip

# 1. Configurazione Path Sandbox
PROJECT_DIR = "outputs/project_alpha"
OUTPUT_PATH = os.path.join(PROJECT_DIR, "reel_final.mp4")

# 2. Caricamento Asset (Audit-driven)
clip1 = VideoFileClip(os.path.join(PROJECT_DIR, "assets/video1.mp4")).subclip(0, 5)

# 3. Composizione (Ingegnere)
txt_clip = TextClip("Creative OS v3.0", fontsize=70, color='white')
txt_clip = txt_clip.set_pos('center').set_duration(5)

video = CompositeVideoClip([clip1, txt_clip])

# 4. Scrittura (Physical Execution)
video.write_videofile(OUTPUT_PATH, codec='libx264', audio_codec='aac')
\`\`\`

## 3. FAILSAFE & AUTO-CORREZIONE
- Se \`python_executor\` restituisce un \`ImportError\` (es. ImageMagick mancante per TextClip), l'agente deve ripiegare su soluzioni alternative (es. usare rettangoli colorati Fabric-style convertiti in clip o informare l'Ingegnere di Sistema).
- Se il file non viene creato, l'agente analizza i log di \`python_executor\` e corregge il path.

## 4. VALIDAZIONE (TRIBUNALE)
Il Tribunale esegue \`audit_workspace\` sul file finale:
- Il peso è ragionevole (<50MB per un reel)?
- La durata è quella richiesta?
- Se OK, emette il SITREP di completamento.
