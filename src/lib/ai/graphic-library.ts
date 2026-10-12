// Blocco di prompt per l'Art Director: elenca la libreria grafica Celestial (nomi esatti
// da usare come shapeId) e le regole d'uso. Generato dalla libreria vera, così resta
// allineato quando le forme cambiano. Solo lato server.
import { CELESTIAL_LIBRARY } from '@/components/studio/libraries/celestial-library'

const USO: Record<string, string> = {
  'GLIFI · PIENI': 'accenti decisi: un glifo eroe grande oppure 2-3 piccoli vicino ai testi',
  'GLIFI · LINEA': 'dettagli tecnici e raffinati, angoli e margini, eco/globo/griglia come elemento editoriale',
  'GLIFI · MEZZATINTA': 'texture a punti: grandi, dietro ai contenuti, anche tagliati dal bordo della tavola',
  'ORBITE': 'elemento narrativo attorno a un titolo o a un prodotto',
  'SPINE & INCHIOSTRO': 'tono dark/editoriale, diagonali che attraversano la tavola',
  'OP ART': 'blocchi ritmici, retro-moderno, bilanciati con molto vuoto',
}

export function graphicLibraryPrompt(): string {
  const cats = Object.entries(CELESTIAL_LIBRARY)
    .map(([cat, items]) => `- **${cat}** (${USO[cat] ?? 'accenti'}): ${items.map(i => `"${i.name}"`).join(', ')}`)
    .join('\n')
  return `## LIBRERIA GRAFICA (forme vettoriali curate — usale al posto di rettangoli e cerchi decorativi)
Per inserire una forma: \`type: "path"\`, \`shapeId\` con il NOME ESATTO qui sotto, \`w\` e \`h\` (il motore la adatta al box mantenendo le proporzioni), \`color\`, \`opacity\`, \`angle\` (rotazione in gradi).
${cats}

### Regole da art director
1. **Mai simulare una forma con \`rect\` o \`circle\`**: se ti serve una forma, usa \`path\` + \`shapeId\` della libreria.
2. **Gerarchia**: al massimo UN glifo eroe (40-80% del lato corto della tavola, può uscire dal bordo) + 2-3 accenti piccoli (3-8%). Mai tanti glifi della stessa misura.
3. **Colore**: un solo colore d'accento preso dalla palette, oppure lo stesso del testo. Glifo eroe di sfondo: opacità 0.08-0.25. Accenti piccoli: opacità 1.
4. **Mezzatinta** (forme "Dot …", "Halftone …", "Stella …"): sempre grande e dietro (zIndex 1-2), mai sopra il testo.
5. **Linea** (\`… Line\`, "Echo …", "Globe", "Lens Grid", "Squares"): allineale a margini e griglia, spessore percepito simile ai filetti tipografici.
6. **Respiro**: lascia vuoto attorno al titolo; i glifi accompagnano la tipografia, non la coprono. Una leggera rotazione (\`angle\` 8-20°) su un accento rende la composizione meno rigida.
7. **Coerenza**: in una tavola usa una sola famiglia di trattamento (pieno, linea o mezzatinta), più al massimo un accento di un'altra.`
}
