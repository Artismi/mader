/**
 * Schema SQLite completo — Creative OS 2.0
 * Migrazione da Supabase + nuove tabelle per inbox, cervello, editoriale, ecc.
 *
 * Convenzioni:
 * - ID: TEXT (UUID via crypto.randomUUID())
 * - Array PostgreSQL → TEXT (JSON.stringify)
 * - JSONB → TEXT (JSON.stringify)
 * - timestamp → TEXT (ISO 8601)
 * - boolean → INTEGER (0/1)
 */

export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ─────────────────────────────────────────────
-- TABELLE MIGRATE DA SUPABASE
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clients (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  email               TEXT,
  sector              TEXT,
  category            TEXT NOT NULL DEFAULT 'cliente', -- 'cliente' | 'bando'
  vault_path          TEXT,
  vault_md_content    TEXT,
  drive_folder_id     TEXT,
  drive_progetti_id   TEXT,
  drive_asset_id      TEXT,
  drive_documenti_id  TEXT,
  canva_brand_kit_id  TEXT,
  figjam_board_id     TEXT,
  canvas_state        TEXT, -- JSON snapshot del Fabric.js Studio
  created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id                TEXT PRIMARY KEY,
  client_id         TEXT REFERENCES clients(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  type              TEXT NOT NULL DEFAULT 'general',
  category          TEXT NOT NULL DEFAULT 'task',
  deadline          TEXT,
  status            TEXT NOT NULL DEFAULT 'todo',
  duration_minutes  INTEGER,
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS ideas (
  id            TEXT PRIMARY KEY,
  client_id     TEXT REFERENCES clients(id) ON DELETE CASCADE,
  text          TEXT NOT NULL,
  title         TEXT,
  description   TEXT,
  platforms     TEXT NOT NULL DEFAULT '[]',
  idea_status   TEXT NOT NULL DEFAULT 'idea',
  assigned      INTEGER NOT NULL DEFAULT 0,
  task_id       TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  output_links  TEXT NOT NULL DEFAULT '[]',
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS subtasks (
  id          TEXT PRIMARY KEY,
  task_id     TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  done        INTEGER NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  fase        TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS skills (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  content     TEXT,
  triggers    TEXT NOT NULL DEFAULT '[]',
  active      INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS system_config (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS api_usage_stats (
  id             TEXT PRIMARY KEY,
  service        TEXT NOT NULL,
  month_year     TEXT NOT NULL,
  request_count  INTEGER NOT NULL DEFAULT 0,
  max_limit      INTEGER NOT NULL DEFAULT 1000,
  UNIQUE(service, month_year)
);

CREATE TABLE IF NOT EXISTS social_posts (
  id            TEXT PRIMARY KEY,
  client_id     TEXT REFERENCES clients(id) ON DELETE SET NULL,
  content       TEXT NOT NULL,
  subject       TEXT,
  platforms     TEXT NOT NULL DEFAULT '[]',
  status        TEXT NOT NULL DEFAULT 'draft',
  external_ids  TEXT NOT NULL DEFAULT '{}',
  scheduled_at  TEXT,
  published_at  TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS post_analytics (
  id           TEXT PRIMARY KEY,
  post_id      TEXT NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  platform     TEXT NOT NULL,
  metrics      TEXT NOT NULL DEFAULT '{}',
  recorded_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Token OAuth Google (sostituisce user_tokens Supabase)
CREATE TABLE IF NOT EXISTS user_tokens (
  id                      TEXT PRIMARY KEY,
  provider                TEXT NOT NULL DEFAULT 'google',
  provider_token          TEXT,
  provider_refresh_token  TEXT,
  expires_at              TEXT,
  created_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(provider)
);

CREATE TABLE IF NOT EXISTS context_instructions (
  id          TEXT PRIMARY KEY,
  file_path   TEXT NOT NULL UNIQUE,
  instructions TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- ─────────────────────────────────────────────
-- NUOVE TABELLE — Creative OS 2.0
-- ─────────────────────────────────────────────

-- Canali comunicazione collegati al cliente
CREATE TABLE IF NOT EXISTS client_channels (
  id         TEXT PRIMARY KEY,
  client_id  TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  channel    TEXT NOT NULL,  -- 'whatsapp' | 'instagram' | 'gmail' | 'linkedin' | 'telegram'
  handle     TEXT NOT NULL,  -- numero, @handle, email, ecc.
  UNIQUE(client_id, channel)
);

-- Messaggi inbox unificata
CREATE TABLE IF NOT EXISTS messages (
  id           TEXT PRIMARY KEY,
  channel      TEXT NOT NULL,  -- 'gmail' | 'whatsapp' | 'instagram' | 'linkedin'
  sender_id    TEXT,           -- ID/numero mittente nel canale
  sender_name  TEXT,
  client_id    TEXT REFERENCES clients(id) ON DELETE SET NULL,
  subject      TEXT,           -- per email
  content      TEXT NOT NULL,
  html_content TEXT,           -- per email HTML
  timestamp    TEXT NOT NULL,
  read         INTEGER NOT NULL DEFAULT 0,
  replied      INTEGER NOT NULL DEFAULT 0,
  metadata     TEXT NOT NULL DEFAULT '{}'  -- dati extra per canale
);

CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel);
CREATE INDEX IF NOT EXISTS idx_messages_client ON messages(client_id);

-- FTS5 per ricerca full-text nei messaggi
CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
  content, sender_name, subject,
  content=messages,
  content_rowid=rowid
);

-- Fasce orarie dichiarate (per Calendly)
CREATE TABLE IF NOT EXISTS availability_slots (
  id          TEXT PRIMARY KEY,
  day_of_week INTEGER NOT NULL,  -- 0=lun, 1=mar, ... 6=dom
  start_time  TEXT NOT NULL,     -- 'HH:MM'
  end_time    TEXT NOT NULL,     -- 'HH:MM'
  active      INTEGER NOT NULL DEFAULT 1
);

-- Prenotazioni in arrivo da Calendly
CREATE TABLE IF NOT EXISTS bookings (
  id                TEXT PRIMARY KEY,
  calendly_event_id TEXT UNIQUE,
  attendee_name     TEXT NOT NULL,
  attendee_email    TEXT NOT NULL,
  title             TEXT,
  start_time        TEXT NOT NULL,
  end_time          TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'confirmed',  -- confirmed | cancelled
  notes             TEXT,
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Memoria AI (RAG + fatti ricordati)
CREATE TABLE IF NOT EXISTS memories (
  id            TEXT PRIMARY KEY,
  content       TEXT NOT NULL,
  context_type  TEXT NOT NULL DEFAULT 'general',  -- 'general' | 'cliente' | 'progetto' | 'task'
  context_id    TEXT,   -- id dell'entità collegata (es. client_id)
  tier          TEXT NOT NULL DEFAULT 'episodic',  -- 'semantic' | 'episodic' | 'vault'
  importance    REAL DEFAULT 0.5,                  -- 0.0 to 1.0
  last_accessed_at TEXT,                           -- ISO timestamp
  expires_at    TEXT,                              -- ISO timestamp for TTL
  embedding     BLOB,   -- vettore OpenAI (Float32Array serializzato)
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Siti web e domini
CREATE TABLE IF NOT EXISTS domains (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  url             TEXT,
  status          TEXT NOT NULL DEFAULT 'live',  -- 'live' | 'dev' | 'sospeso'
  domain_expires  TEXT,   -- data scadenza dominio
  hosting_expires TEXT,   -- data scadenza hosting
  panel_url       TEXT,   -- link pannello gestione
  notes           TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Piano editoriale
CREATE TABLE IF NOT EXISTS editorial_plans (
  id           TEXT PRIMARY KEY,
  client_id    TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  month        TEXT NOT NULL,          -- 'YYYY-MM'
  channels     TEXT NOT NULL DEFAULT '[]',
  frequency    TEXT,                   -- es. '3/settimana'
  notes        TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(client_id, month)
);

-- Preventivi
CREATE TABLE IF NOT EXISTS quotes (
  id              TEXT PRIMARY KEY,
  client_id       TEXT REFERENCES clients(id) ON DELETE SET NULL,
  client_name     TEXT NOT NULL,
  title           TEXT NOT NULL,
  number          TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'preventivo', -- 'preventivo' | 'fattura'
  status          TEXT NOT NULL DEFAULT 'bozza',  -- 'bozza'|'inviato'|'accettato'|'rifiutato'
  items           TEXT NOT NULL DEFAULT '[]',     -- JSON array di {desc, qty, unit_price}
  total           REAL NOT NULL DEFAULT 0,
  notes           TEXT,
  canva_doc_url   TEXT,
  drive_pdf_url   TEXT,
  gmail_thread_id TEXT,
  issued_at       TEXT,
  expires_at      TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Contenuti editoriali (post pianificati)
CREATE TABLE IF NOT EXISTS editorial_posts (
  id               TEXT PRIMARY KEY,
  plan_id          TEXT REFERENCES editorial_plans(id) ON DELETE CASCADE,
  client_id        TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  idea_id          TEXT REFERENCES ideas(id) ON DELETE SET NULL,
  title            TEXT,
  content          TEXT,
  channels         TEXT NOT NULL DEFAULT '[]',
  editorial_status TEXT NOT NULL DEFAULT 'idea',  -- 'idea'|'bozza'|'approvato'|'programmato'|'pubblicato'
  scheduled_at     TEXT,
  published_at     TEXT,
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Cache analytics siti web (Umami)
CREATE TABLE IF NOT EXISTS site_analytics (
  id           TEXT PRIMARY KEY,
  client_id    TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  date         TEXT NOT NULL,
  pageviews    INTEGER DEFAULT 0,
  sessions     INTEGER DEFAULT 0,
  bounce_rate  REAL DEFAULT 0,
  recorded_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(client_id, date)
);

-- Token OAuth per-cliente (Meta, futuro)
CREATE TABLE IF NOT EXISTS client_tokens (
  id               TEXT PRIMARY KEY,
  client_id        TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  provider         TEXT NOT NULL,
  access_token     TEXT NOT NULL,
  token_expires_at TEXT,
  scopes           TEXT,
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE(client_id, provider)
);

CREATE TABLE IF NOT EXISTS creative_assets (
  id           TEXT PRIMARY KEY,
  client_id    TEXT REFERENCES clients(id) ON DELETE SET NULL,
  type         TEXT NOT NULL, -- 'font' | 'brush' | 'image' | 'preset'
  name         TEXT NOT NULL,
  url          TEXT NOT NULL,
  metadata     TEXT NOT NULL DEFAULT '{}', -- JSON per parametri pennello o famiglia font
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Progetti di progettazione (canvas Fabric.js nominati, multi per cliente)
CREATE TABLE IF NOT EXISTS design_projects (
  id           TEXT PRIMARY KEY,
  client_id    TEXT REFERENCES clients(id) ON DELETE SET NULL,
  brief_id     TEXT REFERENCES briefs(id) ON DELETE SET NULL,
  name         TEXT NOT NULL DEFAULT 'Senza titolo',
  type         TEXT NOT NULL DEFAULT 'board', -- 'board' | 'document' | 'presentation'
  canvas_state TEXT,   -- JSON snapshot completo di Fabric.js
  thumbnail    TEXT,   -- data-URL PNG miniatura (opzionale)
  metadata     TEXT NOT NULL DEFAULT '{}', -- config layout striscia, ordine tavole, ecc.
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_design_projects_client ON design_projects(client_id);
CREATE INDEX IF NOT EXISTS idx_design_projects_updated ON design_projects(updated_at DESC);

-- ─────────────────────────────────────────────
-- BRIEF SYSTEM — hub centrale del flusso progetto
-- ─────────────────────────────────────────────

-- Brief: entità unificante (north star del progetto)
CREATE TABLE IF NOT EXISTS briefs (
  id          TEXT PRIMARY KEY,
  client_id   TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  scope       TEXT,
  budget_min  REAL,
  budget_max  REAL,
  deadline    TEXT,
  status      TEXT NOT NULL DEFAULT 'draft',
  -- draft | approved | in_progress | delivered | closed
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_briefs_client ON briefs(client_id);
CREATE INDEX IF NOT EXISTS idx_briefs_status ON briefs(status);

-- Milestones: sotto-scadenze del brief
CREATE TABLE IF NOT EXISTS milestones (
  id          TEXT PRIMARY KEY,
  brief_id    TEXT NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  due_date    TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  -- pending | in_progress | completed
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Deliverables: output attesi tipizzati
CREATE TABLE IF NOT EXISTS deliverables (
  id          TEXT PRIMARY KEY,
  brief_id    TEXT NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
  type        TEXT NOT NULL DEFAULT 'design_file',
  -- design_file | copy | asset | document | video
  title       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  -- pending | in_progress | ready | approved | delivered
  link        TEXT,
  due_date    TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_deliverables_brief ON deliverables(brief_id);

-- Collegamenti tra memorie e altre entità (GraphRAG)
CREATE TABLE IF NOT EXISTS memory_links (
  id           TEXT PRIMARY KEY,
  source_id    TEXT NOT NULL,
  source_type  TEXT NOT NULL, -- 'memory' | 'client' | 'task' | 'idea' | 'project'
  target_id    TEXT NOT NULL,
  target_type  TEXT NOT NULL,
  relation     TEXT NOT NULL DEFAULT 'relates_to',
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_memory_links_source ON memory_links(source_id);
CREATE INDEX IF NOT EXISTS idx_memory_links_target ON memory_links(target_id);
`
