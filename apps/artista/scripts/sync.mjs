// Copia dal codice di Creative OS i pezzi che servono all'app autonoma.
// Uso: node scripts/sync.mjs (dalla cartella apps/artista). Non tocca transport.ts locale.
import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const app = join(here, '..')
const root = join(app, '..', '..', 'src')
const copy = (from, to, filter) => { mkdirSync(dirname(join(app, to)), { recursive: true }); cpSync(join(root, from), join(app, to), { recursive: true, filter }) }

const agentDst = join(app, 'src/lib/studio-agent')
for (const d of ['core', 'eyes', 'hands', 'mind', 'reader', 'voice']) { rmSync(join(agentDst, d), { recursive: true, force: true }); copy(`lib/studio-agent/${d}`, `src/lib/studio-agent/${d}`) }
copy('lib/studio-agent/day.ts', 'src/lib/studio-agent/day.ts')
copy('lib/studio-agent/server/web.ts', 'src/lib/studio-agent/server/web.ts')
copy('components/studio-agent/StudioAgent.tsx', 'src/components/studio-agent/StudioAgent.tsx')
copy('components/studio/genera', 'src/components/studio/genera')
for (const f of ['catalog.ts', 'gl.ts', 'render.ts', 'shaders.ts']) copy(`components/studio/fx/${f}`, `src/components/studio/fx/${f}`)
if (!existsSync(join(app, 'src/lib/studio-agent/transport.ts'))) console.warn('manca src/lib/studio-agent/transport.ts (versione browser)')
console.log('sincronizzato')
