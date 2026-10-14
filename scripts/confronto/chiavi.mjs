/**
 * Chiavi per la regia e la giuria, lette solo da Node (mai nella pagina):
 *   GEMINI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY  da ambiente o .env.local
 *   OPENROUTER_API_KEY  da ambiente, altrimenti il collegamento di OpenRouter salvato dall'app (data/creative-os.db)
 *   OPENAI_API_KEY      da ambiente o .env.local (solo per GPT Image se OpenRouter non c'è)
 * Se si lavora in un worktree, .env.local e il database si cercano anche nella cartella principale del repo.
 */
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { REPO } from './lib.mjs'

/** La radice del repo e, se diversa, quella del checkout principale (i worktree non hanno .env.local né data/). */
function radici() {
  const out = [REPO]
  try {
    const comune = execSync('git rev-parse --git-common-dir', { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
    const principale = path.resolve(REPO, comune, '..')
    if (principale !== REPO) out.push(principale)
  } catch { /* non è un repo git: basta REPO */ }
  return out
}

function envLocale() {
  const env = {}
  for (const r of radici().reverse()) {
    const f = path.join(r, '.env.local')
    if (!fs.existsSync(f)) continue
    for (const riga of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
      const m = riga.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
  return env
}

async function openRouterDalDb() {
  for (const r of radici()) {
    const f = process.env.DATABASE_PATH ?? path.join(r, 'data', 'creative-os.db')
    if (!fs.existsSync(f)) continue
    try {
      const { DatabaseSync } = await import('node:sqlite')
      const db = new DatabaseSync(f, { readOnly: true })
      const t = db.prepare("SELECT provider_token FROM user_tokens WHERE provider = 'openrouter'").get()
      db.close()
      if (t?.provider_token) return t.provider_token
    } catch { /* database occupato o senza tabella: si va avanti */ }
  }
  return null
}

export async function chiavi() {
  const env = { ...envLocale(), ...process.env }
  return {
    gemini: env.GEMINI_API_KEY || env.GOOGLE_GENERATIVE_AI_API_KEY || null,
    openrouter: env.OPENROUTER_API_KEY || (await openRouterDalDb()),
    openai: env.OPENAI_API_KEY || null,
  }
}
