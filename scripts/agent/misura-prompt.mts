/**
 * Misura il prompt della chat (token stimati ≈ caratteri/4): parte stabile,
 * schemi degli strumenti di sistema e promemoria di alcune domande tipo.
 *   DATABASE_PATH=copia.db node --import ./scripts/agent/register.mjs scripts/agent/misura-prompt.mts
 * Usare una COPIA del database: lo script legge configurazione e skill attive.
 */
import { zodSchema } from 'ai'
import { config, skills } from '../../src/lib/db/index'
import { DEFAULT_ARCHITECTURE } from '../../src/lib/ai/defaults'
import { graphicLibraryPrompt } from '../../src/lib/ai/graphic-library'
import { selectActiveSkills, stableSystemText, MODO_DI_LAVORARE, GUIDA_GRAFICHE } from '../../src/lib/agent/prompt'
import { toolGuide } from '../../src/lib/agent/tools'
import { serverToolDefs } from '../../src/lib/agent/run'

const tok = (s: string) => Math.round(s.length / 4)
const architecture = config.get('architecture') || DEFAULT_ARCHITECTURE
const all = skills.getActive()
const defs = serverToolDefs()
const guide = toolGuide(defs)
const stabile = stableSystemText({ architecture, toolGuide: guide, skills: all })
const conLibreria = stableSystemText({ architecture, toolGuide: guide, skills: all, graphicLibrary: graphicLibraryPrompt() })
const schemi = defs.reduce((n, d) => n + tok(d.description) + tok(JSON.stringify(zodSchema(d.inputSchema).jsonSchema)), 0)

console.log('== parte stabile ==')
for (const [k, v] of [
  ['architettura', tok(architecture)], ['modo di lavorare', tok(MODO_DI_LAVORARE)], ['guida strumenti', tok(guide)],
  ['guida grafiche', tok(GUIDA_GRAFICHE)], [`indice skill (${all.length})`, tok(stabile) - tok([architecture, MODO_DI_LAVORARE, guide, GUIDA_GRAFICHE].join(''))],
] as [string, number][]) console.log(`${String(v).padStart(7)}  ${k}`)
console.log(`${String(tok(stabile)).padStart(7)}  TOTALE stabile (modelli che usano composeDesign)`)
console.log(`${String(tok(conLibreria)).padStart(7)}  TOTALE stabile con la libreria grafica (modelli forti)`)
console.log(`${String(schemi).padStart(7)}  schemi degli strumenti di sistema (senza quelli del canvas)`)

console.log('\n== skill nel promemoria per domande tipo ==')
for (const q of ['Che post ho nel piano editoriale questa settimana?', 'Fammi un poster per il concerto di sabato', 'Scrivi la caption del reel sul nuovo blend', 'Quali incarichi scadono domani?']) {
  const { active, altre } = selectActiveSkills({ skills: all, query: q })
  console.log(`${String(tok(active.map(s => s.content ?? '').join(''))).padStart(7)}  "${q}" → ${active.map(s => s.slug).join(', ') || 'nessuna'}${altre.length ? ` (+${altre.length} da caricare)` : ''}`)
}
