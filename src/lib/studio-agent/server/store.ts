/**
 * Archivio dell'artista-osservatore, server-side: stato in una riga JSON,
 * opere in una tabella, immagini PNG su disco accanto al database.
 */
import path from 'path'
import fs from 'fs'
import { getDb } from '@/lib/db/client'
import type { AgentState, Visit, Work } from '../core/types'

const DATA_DIR = path.dirname(process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'creative-os.db'))
export const AGENT_DIR = path.join(DATA_DIR, 'studio-agent')
export const WORKS_DIR = path.join(AGENT_DIR, 'opere')
export const LIBRARY_DIR = path.join(AGENT_DIR, 'biblioteca')

let ready = false
function db() {
  const d = getDb()
  if (!ready) {
    d.exec(`
      CREATE TABLE IF NOT EXISTS agent_state (
        key        TEXT PRIMARY KEY,
        value      TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE TABLE IF NOT EXISTS agent_works (
        id         TEXT PRIMARY KEY,
        day        INTEGER NOT NULL,
        title      TEXT NOT NULL DEFAULT '',
        kept       INTEGER NOT NULL DEFAULT 1,
        data       TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      );
      CREATE INDEX IF NOT EXISTS idx_agent_works_day ON agent_works(day);
    `)
    for (const dir of [AGENT_DIR, WORKS_DIR, LIBRARY_DIR]) if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    ready = true
  }
  return d
}

export function loadState(): AgentState | null {
  const row = db().prepare('SELECT value FROM agent_state WHERE key = ?').get('main') as { value: string } | undefined
  return row ? (JSON.parse(row.value) as AgentState) : null
}

export function saveState(st: AgentState) {
  db().prepare(`INSERT INTO agent_state (key, value, updated_at) VALUES ('main', ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`).run(JSON.stringify(st))
}

export function resetState() {
  db().prepare('DELETE FROM agent_state WHERE key = ?').run('main')
}

export function addVisit(v: Visit) {
  const st = loadState()
  if (!st) return false
  st.visits.push(v)
  saveState(st)
  return true
}

export function saveWork(w: Work, pngDataUrl: string) {
  const b64 = pngDataUrl.replace(/^data:image\/png;base64,/, '')
  const file = path.join(WORKS_DIR, `${w.id}.png`)
  fs.writeFileSync(file, Buffer.from(b64, 'base64'))
  const work = { ...w, image: `/api/studio-agent/image/${w.id}` }
  db().prepare('INSERT OR REPLACE INTO agent_works (id, day, title, kept, data) VALUES (?, ?, ?, ?, ?)')
    .run(w.id, w.day, w.title, w.kept ? 1 : 0, JSON.stringify(work))
  return work
}

export function listWorks(limit = 200): Work[] {
  const rows = db().prepare('SELECT data FROM agent_works ORDER BY day DESC, created_at DESC LIMIT ?').all(limit) as { data: string }[]
  return rows.map(r => JSON.parse(r.data) as Work)
}

export function getWork(id: string): Work | null {
  const row = db().prepare('SELECT data FROM agent_works WHERE id = ?').get(id) as { data: string } | undefined
  return row ? (JSON.parse(row.data) as Work) : null
}

export function imagePath(id: string) {
  if (!/^[\w-]+$/.test(id)) return null
  const p = path.join(WORKS_DIR, `${id}.png`)
  return fs.existsSync(p) ? p : null
}

export function libraryFiles(): { name: string; text: string }[] {
  db()
  return fs.readdirSync(LIBRARY_DIR)
    .filter(f => /\.(md|txt)$/i.test(f))
    .map(f => ({ name: f, text: fs.readFileSync(path.join(LIBRARY_DIR, f), 'utf8') }))
}

let POS: Map<string, string> | null = null
/** lessico Morph-it! opzionale: data/studio-agent/morph-it.txt (forma, lemma, tratti separati da TAB) */
export function posTags(words: string[]): Record<string, string> {
  db()
  if (!POS) {
    POS = new Map()
    const f = path.join(AGENT_DIR, 'morph-it.txt')
    if (fs.existsSync(f)) {
      const txt = fs.readFileSync(f, 'latin1')
      for (const line of txt.split('\n')) {
        const [form, , tag] = line.split('\t')
        if (form && tag && !POS.has(form)) POS.set(form, tag.trim())
      }
    }
  }
  const out: Record<string, string> = {}
  for (const w of words.slice(0, 3000)) { const t = POS.get(w); if (t) out[w] = t }
  return out
}
