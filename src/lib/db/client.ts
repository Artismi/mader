/**
 * SQLite client — usa node:sqlite (built-in Node.js v22.5+, stabile in v24)
 * Zero dipendenze native, nessuna compilazione.
 */

import { DatabaseSync } from 'node:sqlite'
import path from 'path'
import fs from 'fs'
import { SCHEMA_SQL } from './schema'
import { DEFAULT_SKILLS, DEFAULT_ARCHITECTURE } from '@/lib/ai/defaults'
import { randomUUID } from 'crypto'

const DB_PATH = process.env.DATABASE_PATH ||
  path.join(process.cwd(), 'data', 'creative-os.db')

// Singleton — safe per Next.js hot reload in dev
declare global {
  // eslint-disable-next-line no-var
  var __creativeos_db: DatabaseSync | undefined
}

function initDb(): DatabaseSync {
  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  const db = new DatabaseSync(DB_PATH)

  // WAL mode + foreign keys
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA foreign_keys = ON')

  // Crea tutte le tabelle
  db.exec(SCHEMA_SQL)

  // Adhoc migrations for existing DBs
  try {
    db.exec("ALTER TABLE clients ADD COLUMN category TEXT NOT NULL DEFAULT 'cliente'")
  } catch (e) { /* Already exists */ }

  try {
    db.exec("ALTER TABLE quotes ADD COLUMN type TEXT NOT NULL DEFAULT 'preventivo'")
  } catch (e) { /* Already exists */ }

  try {
    db.exec("ALTER TABLE clients ADD COLUMN umami_website_id TEXT")
  } catch (e) { /* Already exists */ }

  try {
    db.exec("ALTER TABLE clients ADD COLUMN meta_page_id TEXT")
  } catch (e) { /* Already exists */ }

  try {
    db.exec("ALTER TABLE clients ADD COLUMN meta_ig_account_id TEXT")
  } catch (e) { /* Already exists */ }

    db.exec(`CREATE TABLE IF NOT EXISTS design_projects (
      id           TEXT PRIMARY KEY,
      client_id    TEXT REFERENCES clients(id) ON DELETE SET NULL,
      brief_id     TEXT REFERENCES briefs(id) ON DELETE SET NULL,
      name         TEXT NOT NULL DEFAULT 'Senza titolo',
      type         TEXT NOT NULL DEFAULT 'board',
      canvas_state TEXT,
      thumbnail    TEXT,
      metadata     TEXT NOT NULL DEFAULT '{}',
      updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_design_projects_client ON design_projects(client_id)`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_design_projects_updated ON design_projects(updated_at DESC)`)

  // Dati di default al primo avvio
  seedDefaults(db)

  return db
}

function seedDefaults(db: DatabaseSync) {
  const row = db.prepare('SELECT COUNT(*) as c FROM skills').get() as { c: number }
  if (row.c === 0) {
    const insert = db.prepare(`
      INSERT INTO skills (id, name, slug, description, content, triggers, active, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const skill of DEFAULT_SKILLS) {
      insert.run(
        randomUUID(),
        skill.name,
        skill.slug,
        skill.description,
        skill.content,
        JSON.stringify(skill.triggers),
        skill.active ? 1 : 0,
        skill.sort_order
      )
    }
  }

  // Sincronizza sempre architecture dai defaults (routing Progettista, regole prompt)
  const arch = db.prepare("SELECT value FROM system_config WHERE key = 'architecture'").get()
  if (arch) {
    db.prepare("UPDATE system_config SET value = ? WHERE key = 'architecture'").run(DEFAULT_ARCHITECTURE)
  } else {
    db.prepare("INSERT INTO system_config (key, value) VALUES ('architecture', ?)").run(DEFAULT_ARCHITECTURE)
  }

  // Aggiorna contenuto, descrizione e triggers delle skill esistenti se il codice è cambiato
  const update = db.prepare('UPDATE skills SET content = ?, description = ?, triggers = ? WHERE slug = ?')
  for (const skill of DEFAULT_SKILLS) {
    update.run(skill.content, skill.description, JSON.stringify(skill.triggers), skill.slug)
  }
}

// Migrations that must run even on a cached dev singleton (all idempotent).
function runLiveMigrations(db: DatabaseSync) {
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS design_projects (
      id           TEXT PRIMARY KEY,
      client_id    TEXT REFERENCES clients(id) ON DELETE SET NULL,
      brief_id     TEXT REFERENCES briefs(id) ON DELETE SET NULL,
      name         TEXT NOT NULL DEFAULT 'Senza titolo',
      type         TEXT NOT NULL DEFAULT 'board',
      canvas_state TEXT,
      thumbnail    TEXT,
      metadata     TEXT NOT NULL DEFAULT '{}',
      updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_design_projects_client ON design_projects(client_id)`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_design_projects_updated ON design_projects(updated_at DESC)`)
  } catch { /* already exists */ }

  // Brief system — hub centrale del flusso progetto
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS briefs (
      id          TEXT PRIMARY KEY,
      client_id   TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      title       TEXT NOT NULL,
      description TEXT,
      scope       TEXT,
      budget_min  REAL,
      budget_max  REAL,
      deadline    TEXT,
      status      TEXT NOT NULL DEFAULT 'draft',
      created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_briefs_client ON briefs(client_id)`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_briefs_status ON briefs(status)`)
  } catch { /* already exists */ }

  try {
    db.exec(`CREATE TABLE IF NOT EXISTS milestones (
      id          TEXT PRIMARY KEY,
      brief_id    TEXT NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
      title       TEXT NOT NULL,
      due_date    TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'pending',
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )`)
  } catch { /* already exists */ }

  try {
    db.exec(`CREATE TABLE IF NOT EXISTS deliverables (
      id          TEXT PRIMARY KEY,
      brief_id    TEXT NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
      type        TEXT NOT NULL DEFAULT 'design_file',
      title       TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'pending',
      link        TEXT,
      due_date    TEXT,
      created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_deliverables_brief ON deliverables(brief_id)`)
  } catch { /* already exists */ }

  // FK migrations on existing tables (nullable, backward compat)
  try { db.exec('ALTER TABLE design_projects ADD COLUMN brief_id TEXT REFERENCES briefs(id) ON DELETE SET NULL') } catch { /* already exists */ }
  try { db.exec("ALTER TABLE design_projects ADD COLUMN type TEXT NOT NULL DEFAULT 'board'") } catch { /* already exists */ }
  try { db.exec("ALTER TABLE design_projects ADD COLUMN metadata TEXT NOT NULL DEFAULT '{}'") } catch { /* already exists */ }
  try { db.exec('ALTER TABLE tasks ADD COLUMN brief_id TEXT REFERENCES briefs(id) ON DELETE SET NULL') } catch { /* already exists */ }
  try { db.exec('ALTER TABLE quotes ADD COLUMN brief_id TEXT REFERENCES briefs(id) ON DELETE SET NULL') } catch { /* already exists */ }

  // Tiered Memory migration
  try { db.exec("ALTER TABLE memories ADD COLUMN tier TEXT NOT NULL DEFAULT 'episodic'") } catch { /* already exists */ }
  try { db.exec("ALTER TABLE memories ADD COLUMN importance REAL DEFAULT 0.5") } catch { /* already exists */ }
  try { db.exec("ALTER TABLE memories ADD COLUMN last_accessed_at TEXT") } catch { /* already exists */ }
  try { db.exec("ALTER TABLE memories ADD COLUMN expires_at TEXT") } catch { /* already exists */ }

  // Parent-Document RAG
  try { db.exec("ALTER TABLE memories ADD COLUMN parent_id TEXT") } catch { /* already exists */ }
  try { db.exec("CREATE INDEX IF NOT EXISTS idx_memories_parent ON memories(parent_id)") } catch { /* already exists */ }

  // Memory files — traccia lo stato di indicizzazione per file
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS memory_files (
      id           TEXT PRIMARY KEY,
      source_path  TEXT NOT NULL UNIQUE,
      file_name    TEXT NOT NULL,
      file_type    TEXT NOT NULL,
      index_status TEXT NOT NULL DEFAULT 'pending',
      error_msg    TEXT,
      chunk_count  INTEGER DEFAULT 0,
      size_bytes   INTEGER,
      indexed_at   TEXT,
      created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_memory_files_path ON memory_files(source_path)`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_memory_files_status ON memory_files(index_status)`)
  } catch { /* already exists */ }

  // Design Recipes — layout di successo riutilizzabili come few-shot
  try {
    db.exec(`CREATE TABLE IF NOT EXISTS design_recipes (
      id           TEXT PRIMARY KEY,
      client_id    TEXT REFERENCES clients(id) ON DELETE SET NULL,
      name         TEXT NOT NULL,
      mood         TEXT NOT NULL DEFAULT 'minimal',
      format       TEXT NOT NULL DEFAULT 'instagram_square',
      description  TEXT,
      canvas_state TEXT NOT NULL,
      thumbnail    TEXT,
      score        REAL DEFAULT 0,
      tags         TEXT NOT NULL DEFAULT '[]',
      created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_recipes_mood ON design_recipes(mood)`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_recipes_format ON design_recipes(format)`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_recipes_score ON design_recipes(score DESC)`)
  } catch { /* already exists */ }
}

export function getDb(): DatabaseSync {
  if (process.env.NODE_ENV === 'development') {
    if (!global.__creativeos_db) {
      global.__creativeos_db = initDb()
    }
    // Always run live migrations so a hot-reload picks up new tables
    runLiveMigrations(global.__creativeos_db)
    return global.__creativeos_db
  }
  return initDb()
}

export const db = getDb()
