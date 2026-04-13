/**
 * Query helpers — Creative OS DB
 *
 * Pattern: funzioni tipizzate per ogni operazione comune.
 * JSON columns (array, oggetti) vengono parse/stringify automaticamente.
 */

import { randomUUID } from 'crypto'
import { db } from './client'
export { db } from './client'

// node:sqlite non accetta undefined — solo null
import type { SQLInputValue } from 'node:sqlite'
const n = (v: string | number | bigint | null | undefined): SQLInputValue => v ?? null

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface Client {
  id: string
  name: string
  email?: string
  sector?: string
  category: 'cliente' | 'bando'
  vault_path?: string
  vault_md_content?: string
  drive_folder_id?: string
  drive_progetti_id?: string
  drive_asset_id?: string
  drive_documenti_id?: string
  canva_brand_kit_id?: string
  figjam_board_id?: string
  umami_website_id?: string
  meta_page_id?: string
  meta_ig_account_id?: string
  created_at: string
}

export interface Task {
  id: string
  client_id?: string
  client_name?: string  // JOIN
  title: string
  type: string
  category: string
  deadline?: string
  status: string
  duration_minutes?: number
  created_at: string
}

export interface Idea {
  id: string
  client_id?: string
  text: string
  title?: string
  description?: string
  platforms: string[]
  idea_status: string
  assigned: boolean
  task_id?: string
  output_links: string[]
  created_at: string
}

export interface Subtask {
  id: string
  task_id: string
  title: string
  done: boolean
  sort_order: number
  fase?: string
  created_at: string
}

export interface Skill {
  id: string
  name: string
  slug: string
  description?: string
  content?: string
  triggers: string[]
  active: boolean
  sort_order: number
}

export interface Message {
  id: string
  channel: string
  sender_id?: string
  sender_name?: string
  client_id?: string
  subject?: string
  content: string
  html_content?: string
  timestamp: string
  read: boolean
  replied: boolean
  metadata: Record<string, unknown>
}

export interface UserToken {
  provider: string
  provider_token?: string
  provider_refresh_token?: string
  expires_at?: string
}

export interface Memory {
  id: string
  content: string
  context_type: 'vault' | 'general' | 'cliente' | 'progetto' | 'preferenza'
  context_id?: string
  tier: 'semantic' | 'episodic' | 'vault'
  importance: number
  last_accessed_at?: string
  expires_at?: string
  created_at: string
}

// ─── CLIENTS ─────────────────────────────────────────────────────────────────

export const clients = {
  getAll: (category?: 'cliente' | 'bando'): Client[] => {
    if (category) {
      return (db.prepare('SELECT * FROM clients WHERE category = ? ORDER BY name').all(category) as any[]).map(c => ({...c}));
    }
    return (db.prepare('SELECT * FROM clients ORDER BY name').all() as any[]).map(c => ({...c}));
  },

  getById: (id: string): Client | undefined => {
    const c = db.prepare('SELECT * FROM clients WHERE id = ?').get(id) as any;
    return c ? { ...c } : undefined;
  },

  create: (data: Omit<Client, 'id' | 'created_at'>): Client => {
    const id = randomUUID()
    db.prepare(`
      INSERT INTO clients (id, name, email, sector, category, vault_path, vault_md_content,
        drive_folder_id, drive_progetti_id, drive_asset_id, drive_documenti_id,
        canva_brand_kit_id, figjam_board_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.name, n(data.email), n(data.sector), data.category || 'cliente', n(data.vault_path),
      n(data.vault_md_content), n(data.drive_folder_id), n(data.drive_progetti_id),
      n(data.drive_asset_id), n(data.drive_documenti_id),
      n(data.canva_brand_kit_id), n(data.figjam_board_id))
    return clients.getById(id)!
  },

  update: (id: string, data: Partial<Client>): void => {
    const fields = Object.keys(data).filter(k => k !== 'id' && k !== 'created_at')
    if (fields.length === 0) return
    const sql = `UPDATE clients SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`
    db.prepare(sql).run(...(fields.map(f => (data as Record<string, SQLInputValue>)[f]) as SQLInputValue[]), id as SQLInputValue)
  },

  delete: (id: string): void => {
    db.prepare('DELETE FROM clients WHERE id = ?').run(id)
  },
}

// ─── TASKS ───────────────────────────────────────────────────────────────────

export const tasks = {
  getAll: (filters?: { status?: string; category?: string; clientId?: string; limit?: number; deadlineBefore?: string; deadlineAfter?: string }): Task[] => {
    let sql = `
      SELECT t.*, c.name as client_name
      FROM tasks t
      LEFT JOIN clients c ON c.id = t.client_id
      WHERE 1=1
    `
    const params: SQLInputValue[] = []
    if (filters?.status && filters.status !== 'all') {
      sql += ' AND t.status = ?'
      params.push(filters.status)
    }
    if (filters?.category) {
      sql += ' AND t.category = ?'
      params.push(filters.category)
    }
    if (filters?.clientId) {
      sql += ' AND t.client_id = ?'
      params.push(filters.clientId)
    }
    if (filters?.deadlineBefore) {
      sql += ' AND t.deadline < ?'
      params.push(filters.deadlineBefore)
    }
    if (filters?.deadlineAfter) {
      sql += ' AND t.deadline >= ?'
      params.push(filters.deadlineAfter)
    }
    sql += ' ORDER BY t.deadline ASC'
    if (filters?.limit) {
      sql += ' LIMIT ?'
      params.push(filters.limit)
    }
    return (db.prepare(sql).all(...params) as any[]).map(t => ({...t}));
  },

  getById: (id: string): Task | undefined => {
    const t = db.prepare(`
      SELECT t.*, c.name as client_name
      FROM tasks t LEFT JOIN clients c ON c.id = t.client_id
      WHERE t.id = ?
    `).get(id) as any;
    return t ? { ...t } : undefined;
  },

  getOverdue: (limit = 5): Task[] =>
    (db.prepare(`
      SELECT t.*, c.name as client_name FROM tasks t
      LEFT JOIN clients c ON c.id = t.client_id
      WHERE t.status = 'todo' AND t.category = 'task'
      AND t.deadline < strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      ORDER BY t.deadline ASC LIMIT ?
    `).all(limit) as any[]).map(t => ({...t})),

  getUpcoming: (limit = 5): Task[] =>
    (db.prepare(`
      SELECT t.*, c.name as client_name FROM tasks t
      LEFT JOIN clients c ON c.id = t.client_id
      WHERE t.status = 'todo' AND t.category = 'task'
      AND t.deadline >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      ORDER BY t.deadline ASC LIMIT ?
    `).all(limit) as any[]).map(t => ({...t})),

  create: (data: Omit<Task, 'id' | 'created_at' | 'client_name'>): Task => {
    const id = randomUUID()
    db.prepare(`
      INSERT INTO tasks (id, client_id, title, type, category, deadline, status, duration_minutes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, n(data.client_id), data.title, data.type, data.category,
      n(data.deadline), data.status, n(data.duration_minutes))
    return tasks.getById(id)!
  },

  update: (id: string, data: Partial<Task>): void => {
    const fields = Object.keys(data).filter(k => !['id', 'created_at', 'client_name'].includes(k))
    if (fields.length === 0) return
    const sql = `UPDATE tasks SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`
    db.prepare(sql).run(...(fields.map(f => (data as Record<string, SQLInputValue>)[f]) as SQLInputValue[]), id as SQLInputValue)
  },

  delete: (id: string): void => {
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
  },
}

// ─── IDEAS ───────────────────────────────────────────────────────────────────

export const ideas = {
  getAll: (): Idea[] =>
    (db.prepare('SELECT * FROM ideas ORDER BY created_at DESC').all() as Record<string, unknown>[])
      .map(parseIdea),

  getByStatus: (status: string): Idea[] =>
    (db.prepare('SELECT * FROM ideas WHERE idea_status = ? ORDER BY created_at DESC').all(status) as Record<string, unknown>[])
      .map(parseIdea),

  create: (data: Omit<Idea, 'id' | 'created_at'>): Idea => {
    const id = randomUUID()
    db.prepare(`
      INSERT INTO ideas (id, client_id, text, title, description, platforms, idea_status, assigned, task_id, output_links)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, n(data.client_id), data.text, n(data.title), n(data.description),
      JSON.stringify(data.platforms), data.idea_status, data.assigned ? 1 : 0,
      n(data.task_id), JSON.stringify(data.output_links))
    return parseIdea(db.prepare('SELECT * FROM ideas WHERE id = ?').get(id) as Record<string, unknown>)
  },

  update: (id: string, data: Partial<Idea>): void => {
    const row: Record<string, unknown> = { ...data }
    if (row.platforms) row.platforms = JSON.stringify(row.platforms)
    if (row.output_links) row.output_links = JSON.stringify(row.output_links)
    if (typeof row.assigned === 'boolean') row.assigned = row.assigned ? 1 : 0
    const fields = Object.keys(row).filter(k => !['id', 'created_at'].includes(k))
    if (fields.length === 0) return
    const sql = `UPDATE ideas SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`
    db.prepare(sql).run(...(fields.map(f => row[f]) as SQLInputValue[]), id as SQLInputValue)
  },

  delete: (id: string): void => {
    db.prepare('DELETE FROM ideas WHERE id = ?').run(id)
  },
}

function parseIdea(row: Record<string, unknown>): Idea {
  return {
    ...row,
    platforms: parseJSON(row.platforms as string, []),
    output_links: parseJSON(row.output_links as string, []),
    assigned: Boolean(row.assigned),
  } as unknown as Idea
}

// ─── SUBTASKS ────────────────────────────────────────────────────────────────

export const subtasks = {
  getByTask: (taskId: string): Subtask[] =>
    (db.prepare('SELECT * FROM subtasks WHERE task_id = ? ORDER BY sort_order').all(taskId) as Record<string, unknown>[])
      .map(r => ({ ...r, done: Boolean(r.done) }) as unknown as Subtask),

  create: (data: Omit<Subtask, 'id' | 'created_at'>): Subtask => {
    const id = randomUUID()
    db.prepare(`
      INSERT INTO subtasks (id, task_id, title, done, sort_order, fase)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, data.task_id, data.title, data.done ? 1 : 0, data.sort_order, n(data.fase))
    return db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id) as unknown as Subtask
  },

  update: (id: string, data: Partial<Subtask>): void => {
    const row: Record<string, unknown> = { ...data }
    if (typeof row.done === 'boolean') row.done = row.done ? 1 : 0
    const fields = Object.keys(row).filter(k => !['id', 'task_id', 'created_at'].includes(k))
    if (fields.length === 0) return
    db.prepare(`UPDATE subtasks SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`)
      .run(...(fields.map(f => row[f]) as SQLInputValue[]), id as SQLInputValue)
  },

  delete: (id: string): void => {
    db.prepare('DELETE FROM subtasks WHERE id = ?').run(id)
  },
}

// ─── SKILLS ──────────────────────────────────────────────────────────────────

export const skills = {
  getAll: (): Skill[] =>
    (db.prepare('SELECT * FROM skills ORDER BY sort_order').all() as Record<string, unknown>[])
      .map(r => ({ ...r, triggers: parseJSON(r.triggers as string, []), active: Boolean(r.active) }) as unknown as Skill),

  getActive: (): Skill[] =>
    (db.prepare('SELECT * FROM skills WHERE active = 1 ORDER BY sort_order').all() as Record<string, unknown>[])
      .map(r => ({ ...r, triggers: parseJSON(r.triggers as string, []), active: true }) as unknown as Skill),

  update: (id: string, data: Partial<Skill>): void => {
    const row: Record<string, unknown> = { ...data }
    if (row.triggers) row.triggers = JSON.stringify(row.triggers)
    if (typeof row.active === 'boolean') row.active = row.active ? 1 : 0
    const fields = Object.keys(row).filter(k => k !== 'id')
    if (fields.length === 0) return
    db.prepare(`UPDATE skills SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`)
      .run(...(fields.map(f => row[f]) as SQLInputValue[]), id as SQLInputValue)
  },

  upsert: (data: { slug: string; name: string; description?: string; content?: string; triggers: string[]; active: boolean; sort_order: number }): void => {
    db.prepare(`
      INSERT INTO skills (id, name, slug, description, content, triggers, active, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(slug) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        content = excluded.content,
        triggers = excluded.triggers,
        active = excluded.active,
        sort_order = excluded.sort_order
    `).run(randomUUID(), data.name, data.slug, n(data.description), n(data.content),
      JSON.stringify(data.triggers), data.active ? 1 : 0, data.sort_order)
  },
}

// ─── DOMAINS ─────────────────────────────────────────────────────────────────

export interface Domain {
  id: string
  name: string
  url?: string
  status: 'live' | 'dev' | 'sospeso'
  domain_expires?: string
  hosting_expires?: string
  panel_url?: string
  notes?: string
  created_at: string
}

export const domains = {
  getAll: (): Domain[] =>
    (db.prepare('SELECT * FROM domains ORDER BY name').all() as any[]).map(d => ({...d})),

  getById: (id: string): Domain | undefined => {
    const r = db.prepare('SELECT * FROM domains WHERE id = ?').get(id) as any;
    return r ? { ...r } : undefined;
  },

  create: (data: Omit<Domain, 'id' | 'created_at'>): Domain => {
    const id = randomUUID()
    db.prepare(`
      INSERT INTO domains (id, name, url, status, domain_expires, hosting_expires, panel_url, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.name, n(data.url), data.status || 'live',
      n(data.domain_expires), n(data.hosting_expires), n(data.panel_url), n(data.notes))
    return domains.getById(id)!
  },

  update: (id: string, data: Partial<Domain>): void => {
    const fields = Object.keys(data).filter(k => !['id', 'created_at'].includes(k))
    if (!fields.length) return
    db.prepare(`UPDATE domains SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`)
      .run(...(fields.map(f => (data as Record<string, SQLInputValue>)[f]) as SQLInputValue[]), id as SQLInputValue)
  },

  delete: (id: string): void => {
    db.prepare('DELETE FROM domains WHERE id = ?').run(id)
  },
}

// ─── DESIGN PROJECTS ─────────────────────────────────────────────────────────

export interface DesignProject {
  id: string
  client_id: string | null
  brief_id: string | null
  name: string
  type: 'board' | 'document' | 'presentation'
  canvas_state: string | null
  thumbnail: string | null
  metadata: Record<string, any>
  updated_at: string
  created_at: string
}

export const designProjects = {
  getAll: (): DesignProject[] =>
    (db.prepare('SELECT * FROM design_projects ORDER BY updated_at DESC').all() as any[]).map(r => ({
      ...r,
      client_id: r.client_id ?? null,
      brief_id: r.brief_id ?? null,
      canvas_state: r.canvas_state ?? null,
      thumbnail: r.thumbnail ?? null,
      metadata: parseJSON(r.metadata as string, {})
    })),

  getByClient: (clientId: string): DesignProject[] =>
    (db.prepare('SELECT * FROM design_projects WHERE client_id = ? ORDER BY updated_at DESC').all(clientId) as any[]).map(r => ({
      ...r,
      client_id: r.client_id ?? null,
      brief_id: r.brief_id ?? null,
      canvas_state: r.canvas_state ?? null,
      thumbnail: r.thumbnail ?? null,
      metadata: parseJSON(r.metadata as string, {})
    })),

  getById: (id: string): DesignProject | undefined => {
    const r = db.prepare('SELECT * FROM design_projects WHERE id = ?').get(id) as any
    if (!r) return undefined
    return {
      ...r,
      client_id: r.client_id ?? null,
      brief_id: r.brief_id ?? null,
      canvas_state: r.canvas_state ?? null,
      thumbnail: r.thumbnail ?? null,
      metadata: parseJSON(r.metadata as string, {})
    }
  },

  upsert: (data: {
    id?: string;
    client_id?: string | null;
    brief_id?: string | null;
    name: string;
    type?: 'board' | 'document' | 'presentation';
    canvas_state: string;
    thumbnail?: string | null;
    metadata?: Record<string, any>;
  }): DesignProject => {
    const id = data.id || randomUUID()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO design_projects (id, client_id, brief_id, name, type, canvas_state, thumbnail, metadata, updated_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        client_id    = excluded.client_id,
        brief_id     = excluded.brief_id,
        name         = excluded.name,
        type         = excluded.type,
        canvas_state = excluded.canvas_state,
        thumbnail    = excluded.thumbnail,
        metadata     = excluded.metadata,
        updated_at   = excluded.updated_at
    `).run(
      id,
      n(data.client_id),
      n(data.brief_id),
      data.name,
      data.type || 'board',
      data.canvas_state,
      n(data.thumbnail ?? null),
      JSON.stringify(data.metadata || {}),
      now,
      now
    )
    return designProjects.getById(id)!
  },

  delete: (id: string): void => {
    db.prepare('DELETE FROM design_projects WHERE id = ?').run(id)
  },
}

// ─── TOKENS (Google OAuth) ────────────────────────────────────────────────────

export const tokens = {
  get: (provider = 'google'): UserToken | undefined =>
    db.prepare('SELECT * FROM user_tokens WHERE provider = ?').get(provider) as unknown as UserToken | undefined,

  upsert: (data: UserToken): void => {
    db.prepare(`
      INSERT INTO user_tokens (id, provider, provider_token, provider_refresh_token, expires_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(provider) DO UPDATE SET
        provider_token = excluded.provider_token,
        provider_refresh_token = excluded.provider_refresh_token,
        expires_at = excluded.expires_at
    `).run(randomUUID(), data.provider, n(data.provider_token),
      n(data.provider_refresh_token), n(data.expires_at))
  },
}

// ─── CLIENT CHANNELS ─────────────────────────────────────────────────────────

export interface ClientChannel {
  id: string
  client_id: string
  channel: string
  handle: string
}

export const clientChannels = {
  getAll: (): ClientChannel[] =>
    (db.prepare('SELECT * FROM client_channels').all() as any[]).map(c => ({...c})),

  getByHandle: (channel: string, handle: string): ClientChannel | undefined => {
    const r = db.prepare('SELECT * FROM client_channels WHERE channel = ? AND LOWER(handle) = LOWER(?)').get(channel, handle) as any;
    return r ? { ...r } : undefined;
  },

  upsert: (data: Omit<ClientChannel, 'id'>): void => {
    db.prepare(`
      INSERT INTO client_channels (id, client_id, channel, handle)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(client_id, channel) DO UPDATE SET handle = excluded.handle
    `).run(randomUUID(), data.client_id, data.channel, data.handle)
  },
}

// ─── MESSAGES (Inbox) ─────────────────────────────────────────────────────────

export const messages = {
  getAll: (filters?: { channels?: string[]; clientId?: string; limit?: number; unreadOnly?: boolean }): Message[] => {
    let sql = 'SELECT * FROM messages WHERE 1=1'
    const params: SQLInputValue[] = []
    if (filters?.channels?.length) {
      sql += ` AND channel IN (${filters.channels.map(() => '?').join(',')})`
      params.push(...filters.channels)
    }
    if (filters?.clientId) {
      sql += ' AND client_id = ?'
      params.push(filters.clientId)
    }
    if (filters?.unreadOnly) {
      sql += ' AND read = 0'
    }
    sql += ' ORDER BY timestamp DESC'
    if (filters?.limit) { sql += ' LIMIT ?'; params.push(filters.limit) }
    return (db.prepare(sql).all(...params) as Record<string, unknown>[])
      .map(parseMessage)
  },

  // Upsert by Gmail message ID (dedup)
  upsertFromGmail: (data: Omit<Message, 'id'> & { gmail_id: string }): void => {
    const existing = db.prepare(
      `SELECT id FROM messages WHERE channel = 'gmail' AND json_extract(metadata, '$.gmail_id') = ?`
    ).get(data.gmail_id) as { id: string } | undefined

    if (existing) {
      // Aggiorna solo client_id se nel frattempo abbiamo matchato un cliente
      if (data.client_id) {
        db.prepare('UPDATE messages SET client_id = ? WHERE id = ?').run(data.client_id, existing.id)
      }
      return
    }

    const id = randomUUID()
    const meta = JSON.stringify({ ...data.metadata, gmail_id: data.gmail_id })
    db.prepare(`
      INSERT INTO messages (id, channel, sender_id, sender_name, client_id, subject, content, html_content, timestamp, read, replied, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, 'gmail', n(data.sender_id), n(data.sender_name), n(data.client_id),
      n(data.subject), data.content, n(data.html_content), data.timestamp,
      data.read ? 1 : 0, data.replied ? 1 : 0, meta)
  },

  create: (data: Omit<Message, 'id'>): Message => {
    const id = randomUUID()
    db.prepare(`
      INSERT INTO messages (id, channel, sender_id, sender_name, client_id, subject, content, html_content, timestamp, read, replied, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.channel, n(data.sender_id), n(data.sender_name), n(data.client_id),
      n(data.subject), data.content, n(data.html_content), data.timestamp,
      data.read ? 1 : 0, data.replied ? 1 : 0, JSON.stringify(data.metadata))
    return messages.getAll({ limit: 1 }).find(m => m.id === id)!
  },

  markRead: (id: string): void => {
    db.prepare('UPDATE messages SET read = 1 WHERE id = ?').run(id)
  },

  markReplied: (id: string): void => {
    db.prepare('UPDATE messages SET replied = 1, read = 1 WHERE id = ?').run(id)
  },
}

function parseMessage(r: Record<string, unknown>): Message {
  return {
    ...r,
    read: Boolean(r.read),
    replied: Boolean(r.replied),
    metadata: parseJSON(r.metadata as string, {}),
  } as unknown as Message
}

// ─── AVAILABILITY SLOTS ───────────────────────────────────────────────────────

export interface AvailabilitySlot {
  id: string
  day_of_week: number  // 0=lun … 6=dom
  start_time: string   // 'HH:MM'
  end_time: string
  active: boolean
}

export const availabilitySlots = {
  getAll: (): AvailabilitySlot[] =>
    (db.prepare('SELECT * FROM availability_slots ORDER BY day_of_week, start_time').all() as Record<string, unknown>[])
      .map(r => ({ ...r, active: Boolean(r.active) }) as unknown as AvailabilitySlot),

  upsert: (data: Omit<AvailabilitySlot, 'id'>): void => {
    db.prepare(`
      INSERT INTO availability_slots (id, day_of_week, start_time, end_time, active)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET active = excluded.active
    `).run(randomUUID(), data.day_of_week, data.start_time, data.end_time, data.active ? 1 : 0)
  },

  setActive: (id: string, active: boolean): void => {
    db.prepare('UPDATE availability_slots SET active = ? WHERE id = ?').run(active ? 1 : 0, id)
  },

  replace: (slots: Omit<AvailabilitySlot, 'id'>[]): void => {
    db.exec('DELETE FROM availability_slots')
    for (const s of slots) {
      db.prepare(`INSERT INTO availability_slots (id, day_of_week, start_time, end_time, active) VALUES (?, ?, ?, ?, ?)`)
        .run(randomUUID(), s.day_of_week, s.start_time, s.end_time, s.active ? 1 : 0)
    }
  },
}

// ─── BOOKINGS (Calendly) ──────────────────────────────────────────────────────

export interface Booking {
  id: string
  calendly_event_id?: string
  attendee_name: string
  attendee_email: string
  title?: string
  start_time: string
  end_time: string
  status: string
  notes?: string
  created_at: string
}

export const bookings = {
  getAll: (): Booking[] =>
    (db.prepare('SELECT * FROM bookings ORDER BY start_time DESC').all() as any[]).map(b => ({...b})),

  getUpcoming: (): Booking[] =>
    (db.prepare(`SELECT * FROM bookings WHERE start_time >= strftime('%Y-%m-%dT%H:%M:%fZ','now') AND status = 'confirmed' ORDER BY start_time ASC`).all() as any[]).map(b => ({...b})),

  upsert: (data: Omit<Booking, 'id' | 'created_at'>): Booking => {
    const existing = data.calendly_event_id
      ? db.prepare('SELECT id FROM bookings WHERE calendly_event_id = ?').get(data.calendly_event_id) as { id: string } | undefined
      : undefined

    if (existing) {
      db.prepare(`UPDATE bookings SET status = ?, attendee_name = ?, attendee_email = ?, title = ?, start_time = ?, end_time = ?, notes = ? WHERE id = ?`)
        .run(data.status, data.attendee_name, data.attendee_email, n(data.title), data.start_time, data.end_time, n(data.notes), existing.id)
      const u = db.prepare('SELECT * FROM bookings WHERE id = ?').get(existing.id) as any;
      return { ...u };
    }

    const id = randomUUID()
    db.prepare(`INSERT INTO bookings (id, calendly_event_id, attendee_name, attendee_email, title, start_time, end_time, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, n(data.calendly_event_id), data.attendee_name, data.attendee_email, n(data.title), data.start_time, data.end_time, data.status, n(data.notes))
    const i = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id) as any;
    return { ...i };
  },
}

// ─── CONTEXT INSTRUCTIONS ────────────────────────────────────────────────────

export interface ContextInstruction {
  id: string
  file_path: string
  instructions: string
  created_at: string
  updated_at: string
}

export const contextInstructions = {
  getAll: (): ContextInstruction[] =>
    (db.prepare('SELECT * FROM context_instructions ORDER BY updated_at DESC').all() as any[]).map(r => ({ ...r })),

  getByPath: (file_path: string): ContextInstruction | undefined =>
    db.prepare('SELECT * FROM context_instructions WHERE file_path = ?').get(file_path) as unknown as ContextInstruction | undefined,

  upsert: (data: { file_path: string; instructions: string }): void => {
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO context_instructions (id, file_path, instructions, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(file_path) DO UPDATE SET
        instructions = excluded.instructions,
        updated_at = excluded.updated_at
    `).run(randomUUID(), data.file_path, data.instructions, now, now)
  },

  delete: (id: string): void => {
    db.prepare('DELETE FROM context_instructions WHERE id = ?').run(id)
  },

  deleteByPath: (file_path: string): void => {
    db.prepare('DELETE FROM context_instructions WHERE file_path = ?').run(file_path)
  },
}

// ─── EDITORIAL PLANS + POSTS ─────────────────────────────────────────────────

export interface EditorialPost {
  id: string
  plan_id?: string
  client_id: string
  client_name?: string
  idea_id?: string
  title?: string
  content?: string
  channels: string[]
  editorial_status: 'idea' | 'bozza' | 'approvato' | 'programmato' | 'pubblicato'
  scheduled_at?: string
  published_at?: string
  created_at: string
}

export const editorialPosts = {
  getByClient: (clientId: string): EditorialPost[] =>
    (db.prepare(`
      SELECT ep.*, c.name as client_name
      FROM editorial_posts ep
      LEFT JOIN clients c ON c.id = ep.client_id
      WHERE ep.client_id = ?
      ORDER BY ep.created_at DESC
    `).all(clientId) as Record<string, unknown>[]).map(parseEditorialPost),

  getAll: (): EditorialPost[] =>
    (db.prepare(`
      SELECT ep.*, c.name as client_name
      FROM editorial_posts ep
      LEFT JOIN clients c ON c.id = ep.client_id
      ORDER BY ep.created_at DESC
    `).all() as Record<string, unknown>[]).map(parseEditorialPost),

  create: (data: Omit<EditorialPost, 'id' | 'created_at' | 'client_name'>): EditorialPost => {
    const id = randomUUID()
    db.prepare(`
      INSERT INTO editorial_posts (id, plan_id, client_id, idea_id, title, content, channels, editorial_status, scheduled_at, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, n(data.plan_id), data.client_id, n(data.idea_id), n(data.title), n(data.content),
      JSON.stringify(data.channels), data.editorial_status, n(data.scheduled_at), n(data.published_at))
    return editorialPosts.getByClient(data.client_id).find(p => p.id === id)!
  },

  updateStatus: (id: string, status: EditorialPost['editorial_status'], extra?: { scheduled_at?: string; published_at?: string }): void => {
    db.prepare(`UPDATE editorial_posts SET editorial_status = ?, scheduled_at = COALESCE(?, scheduled_at), published_at = COALESCE(?, published_at) WHERE id = ?`)
      .run(status, n(extra?.scheduled_at), n(extra?.published_at), id)
  },

  update: (id: string, data: Partial<EditorialPost>): void => {
    const row: Record<string, unknown> = { ...data }
    if (row.channels) row.channels = JSON.stringify(row.channels)
    const fields = Object.keys(row).filter(k => !['id', 'created_at', 'client_name'].includes(k))
    if (!fields.length) return
    db.prepare(`UPDATE editorial_posts SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`)
      .run(...(fields.map(f => row[f]) as SQLInputValue[]), id as SQLInputValue)
  },

  delete: (id: string): void => { db.prepare('DELETE FROM editorial_posts WHERE id = ?').run(id) },
}

function parseEditorialPost(r: Record<string, unknown>): EditorialPost {
  return { ...r, channels: parseJSON(r.channels as string, []) } as unknown as EditorialPost
}

// ─── POST ANALYTICS ───────────────────────────────────────────────────────────

export interface SocialAnalytics {
  id: string
  client_id: string
  platform: string          // 'instagram' | 'facebook' | 'linkedin' | 'tiktok'
  followers: number
  engagement_rate: number   // percentuale es. 3.5
  reach: number
  recorded_at: string
}

export const socialAnalytics = {
  getLatestByClient: (clientId: string): SocialAnalytics[] =>
    (db.prepare(`
      SELECT pa.* FROM post_analytics pa
      WHERE pa.post_id IN (SELECT id FROM social_posts WHERE client_id = ?)
      ORDER BY pa.recorded_at DESC
    `).all(clientId) as any[]).map(a => ({...a})),

  // Salva metriche manuali del cliente per piattaforma
  upsertClientMetrics: (clientId: string, platform: string, metrics: { followers: number; engagement_rate: number; reach: number }): void => {
    // Usa system_config per semplicità: key = `analytics_{clientId}_{platform}`
    const key = `analytics_${clientId}_${platform}`
    const value = JSON.stringify({ ...metrics, recorded_at: new Date().toISOString() })
    db.prepare('INSERT INTO system_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run(key, value)
  },

  getClientMetrics: (clientId: string): Record<string, { followers: number; engagement_rate: number; reach: number; recorded_at: string }> => {
    const prefix = `analytics_${clientId}_`
    const rows = db.prepare("SELECT key, value FROM system_config WHERE key LIKE ?").all(`${prefix}%`) as { key: string; value: string }[]
    const result: Record<string, { followers: number; engagement_rate: number; reach: number; recorded_at: string }> = {}
    for (const row of rows) {
      const platform = row.key.replace(prefix, '')
      result[platform] = parseJSON(row.value, { followers: 0, engagement_rate: 0, reach: 0, recorded_at: '' })
    }
    return result
  },
}

// ─── QUOTES (PREVENTIVI) ──────────────────────────────────────────────────────

export interface QuoteItem {
  desc: string
  qty: number
  unit_price: number
}

export interface Quote {
  id: string
  client_id?: string
  client_name: string
  title: string
  number: string
  type: 'preventivo' | 'fattura'
  status: 'bozza' | 'inviato' | 'accettato' | 'rifiutato'
  items: QuoteItem[]
  total: number
  notes?: string
  canva_doc_url?: string
  drive_pdf_url?: string
  gmail_thread_id?: string
  issued_at?: string
  expires_at?: string
  created_at: string
}

export const quotes = {
  getAll: (): Quote[] =>
    db.prepare('SELECT * FROM quotes ORDER BY created_at DESC').all()
      .map(r => parseQuote(r as Record<string, unknown>)),

  getById: (id: string): Quote | undefined => {
    const r = db.prepare('SELECT * FROM quotes WHERE id = ?').get(id) as Record<string, unknown> | undefined
    return r ? parseQuote(r) : undefined
  },

  create: (data: Omit<Quote, 'id' | 'created_at'>): Quote => {
    const id = randomUUID()
    db.prepare(`
      INSERT INTO quotes (id, client_id, client_name, title, number, type, status, items, total, notes,
        canva_doc_url, drive_pdf_url, gmail_thread_id, issued_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, n(data.client_id), data.client_name, data.title, data.number, data.type || 'preventivo',
      data.status, JSON.stringify(data.items), data.total, n(data.notes),
      n(data.canva_doc_url), n(data.drive_pdf_url), n(data.gmail_thread_id),
      n(data.issued_at), n(data.expires_at))
    return quotes.getById(id)!
  },

  convertToInvoice: (id: string): Quote | undefined => {
    const q = quotes.getById(id)
    if (!q || q.type !== 'preventivo') return undefined
    
    return quotes.create({
      client_id: q.client_id,
      client_name: q.client_name,
      title: `Fattura per: ${q.title}`,
      number: quotes.nextNumber('fattura'),
      type: 'fattura',
      status: 'bozza',
      items: q.items,
      total: q.total,
      notes: q.notes,
      issued_at: new Date().toISOString()
    })
  },

  update: (id: string, data: Partial<Quote>): void => {
    const row: Record<string, unknown> = { ...data }
    if (row.items) row.items = JSON.stringify(row.items)
    const fields = Object.keys(row).filter(k => !['id', 'created_at'].includes(k))
    if (!fields.length) return
    db.prepare(`UPDATE quotes SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`)
      .run(...(fields.map(f => row[f]) as SQLInputValue[]), id as SQLInputValue)
  },

  delete: (id: string): void => { db.prepare('DELETE FROM quotes WHERE id = ?').run(id) },

  nextNumber: (type: 'preventivo' | 'fattura' = 'preventivo'): string => {
    const year = new Date().getFullYear()
    const prefix = type === 'fattura' ? 'F-' : ''
    const pattern = `${prefix}${year}-%`
    const row = db.prepare(`SELECT COUNT(*) as cnt FROM quotes WHERE type = ? AND number LIKE ?`).get(type, pattern) as { cnt: number }
    const seq = String((row?.cnt || 0) + 1).padStart(3, '0')
    return `${prefix}${year}-${seq}`
  },
}

function parseQuote(r: Record<string, unknown>): Quote {
  return { ...r, items: parseJSON(r.items as string, []) } as unknown as Quote
}

// ─── CLIENT TOKENS (Meta/Future) ───────────────────────────────────────────

export interface ClientToken {
  id: string
  client_id: string
  provider: string
  access_token: string
  token_expires_at?: string
  scopes?: string
  created_at: string
}

export const clientTokens = {
  get: (clientId: string, provider: string): ClientToken | undefined => {
    const r = db.prepare('SELECT * FROM client_tokens WHERE client_id = ? AND provider = ?').get(clientId, provider) as any
    return r ? { ...r } : undefined
  },

  upsert: (data: Omit<ClientToken, 'id' | 'created_at'>): void => {
    db.prepare(`
      INSERT INTO client_tokens (id, client_id, provider, access_token, token_expires_at, scopes)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(client_id, provider) DO UPDATE SET
        access_token = excluded.access_token,
        token_expires_at = excluded.token_expires_at,
        scopes = excluded.scopes
    `).run(randomUUID(), data.client_id, data.provider, data.access_token, n(data.token_expires_at), n(data.scopes))
  },

  delete: (clientId: string, provider: string): void => {
    db.prepare('DELETE FROM client_tokens WHERE client_id = ? AND provider = ?').run(clientId, provider)
  },
}

// ─── SYSTEM CONFIG ─────────────────────────────────────────────────────────────

export const config = {
  get: (key: string): string | undefined =>
    (db.prepare('SELECT value FROM system_config WHERE key = ?').get(key) as { value: string } | undefined)?.value,

  set: (key: string, value: string): void => {
    db.prepare('INSERT INTO system_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run(key, value)
  },
}


// ─── SITE ANALYTICS (Umami cache) ─────────────────────────────────────────────

export interface SiteAnalytics {
  id: string
  client_id: string
  date: string
  pageviews: number
  sessions: number
  bounce_rate: number
  recorded_at: string
}

export const siteAnalytics = {
  getByClient: (clientId: string, days = 30): SiteAnalytics[] => {
    const since = new Date()
    since.setDate(since.getDate() - days)
    return db.prepare(
      'SELECT * FROM site_analytics WHERE client_id = ? AND date >= ? ORDER BY date DESC'
    ).all(clientId, since.toISOString().split('T')[0]) as unknown as SiteAnalytics[]
  },

  upsert: (clientId: string, date: string, data: { pageviews: number; sessions: number; bounce_rate: number }): void => {
    db.prepare(`
      INSERT INTO site_analytics (id, client_id, date, pageviews, sessions, bounce_rate)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(client_id, date) DO UPDATE SET
        pageviews = excluded.pageviews,
        sessions = excluded.sessions,
        bounce_rate = excluded.bounce_rate,
        recorded_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    `).run(randomUUID(), clientId, date, data.pageviews, data.sessions, data.bounce_rate)
  },
}



export const memories = {
  getAll: (filters?: { excludeVault?: boolean }): Memory[] => {
    let sql = 'SELECT * FROM memories'
    if (filters?.excludeVault) {
      sql += " WHERE context_type != 'vault'"
    }
    sql += ' ORDER BY created_at DESC'
    return db.prepare(sql).all() as unknown as Memory[]
  },

  delete: (id: string): void => {
    db.prepare('DELETE FROM memories WHERE id = ?').run(id)
  },

  update: (id: string, data: Partial<Omit<Memory, 'id' | 'created_at'>>): void => {
    const fields = Object.keys(data).filter(k => k !== 'id' && k !== 'created_at')
    if (fields.length === 0) return
    const sql = `UPDATE memories SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`
    db.prepare(sql).run(...(fields.map(f => {
      const val = (data as any)[f]
      // Handle special types or formatting if needed
      return val === undefined ? null : val
    }) as any[]), id)
  },
}

export const memoryLinks = {
  getAll: (): any[] => db.prepare('SELECT * FROM memory_links ORDER BY created_at DESC').all(),
  
  getByMemory: (memoryId: string): any[] => db.prepare(`
    SELECT * FROM memory_links 
    WHERE source_id = ? OR (target_id = ? AND target_type = 'memory')
  `).all(memoryId, memoryId),

  create: (data: { source_id: string; source_type: string; target_id: string; target_type: string; relation?: string }): string => {
    const id = randomUUID()
    db.prepare(`
      INSERT INTO memory_links (id, source_id, source_type, target_id, target_type, relation)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, data.source_id, data.source_type, data.target_id, data.target_type, data.relation || 'relates_to')
    return id
  },

  delete: (id: string): void => {
    db.prepare('DELETE FROM memory_links WHERE id = ?').run(id)
  },

  deleteByMemory: (memoryId: string): void => {
    db.prepare('DELETE FROM memory_links WHERE source_id = ? OR target_id = ?').run(memoryId, memoryId)
  }
}

export const creativeAssets = {
  getById: (id: string) => db.prepare('SELECT * FROM creative_assets WHERE id = ?').get(id) as any,
  getByClient: (clientId: string) => db.prepare('SELECT * FROM creative_assets WHERE client_id = ?').all(clientId) as any[],
  getAll: (type?: string) => {
    if (type) return db.prepare('SELECT * FROM creative_assets WHERE type = ?').all(type) as any[]
    return db.prepare('SELECT * FROM creative_assets').all() as any[]
  },
  create: (item: any) => {
    const id = crypto.randomUUID()
    db.prepare(`
      INSERT INTO creative_assets (id, client_id, type, name, url, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, item.client_id, item.type, item.name, item.url, JSON.stringify(item.metadata || {}))
    return id
  },
  delete: (id: string) => db.prepare('DELETE FROM creative_assets WHERE id = ?').run(id),
}

// ─── BRIEFS ───────────────────────────────────────────────────────────────────

export type BriefStatus = 'draft' | 'approved' | 'in_progress' | 'delivered' | 'closed'
export type MilestoneStatus = 'pending' | 'in_progress' | 'completed'
export type DeliverableStatus = 'pending' | 'in_progress' | 'ready' | 'approved' | 'delivered'
export type DeliverableType = 'design_file' | 'copy' | 'asset' | 'document' | 'video'

export interface Brief {
  id: string
  client_id: string
  client_name?: string  // JOIN
  title: string
  description?: string
  scope?: string
  budget_min?: number
  budget_max?: number
  deadline?: string
  status: BriefStatus
  created_at: string
  updated_at: string
}

export interface Milestone {
  id: string
  brief_id: string
  title: string
  due_date: string
  status: MilestoneStatus
  order_index: number
  created_at: string
}

export interface Deliverable {
  id: string
  brief_id: string
  type: DeliverableType
  title: string
  status: DeliverableStatus
  link?: string
  due_date?: string
  created_at: string
}

export interface BriefWithDetails extends Brief {
  milestones: Milestone[]
  deliverables: Deliverable[]
}

export const briefs = {
  getByClient: (clientId: string): Brief[] =>
    (db.prepare(`
      SELECT b.*, c.name as client_name
      FROM briefs b JOIN clients c ON c.id = b.client_id
      WHERE b.client_id = ?
      ORDER BY b.updated_at DESC
    `).all(clientId) as any[]).map(r => ({ ...r })),

  getActive: (): Brief[] =>
    (db.prepare(`
      SELECT b.*, c.name as client_name
      FROM briefs b JOIN clients c ON c.id = b.client_id
      WHERE b.status IN ('approved', 'in_progress')
      ORDER BY b.deadline ASC
    `).all() as any[]).map(r => ({ ...r })),

  getWithDetails: (briefId: string): BriefWithDetails | undefined => {
    const brief = db.prepare(`
      SELECT b.*, c.name as client_name
      FROM briefs b JOIN clients c ON c.id = b.client_id
      WHERE b.id = ?
    `).get(briefId) as any
    if (!brief) return undefined
    const ms = db.prepare('SELECT * FROM milestones WHERE brief_id = ? ORDER BY order_index ASC').all(briefId) as any[]
    const dl = db.prepare('SELECT * FROM deliverables WHERE brief_id = ? ORDER BY created_at ASC').all(briefId) as any[]
    return { ...brief, milestones: ms, deliverables: dl }
  },

  create: (data: Omit<Brief, 'id' | 'client_name' | 'created_at' | 'updated_at'>): Brief => {
    const id = randomUUID()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO briefs (id, client_id, title, description, scope, budget_min, budget_max, deadline, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.client_id, data.title, n(data.description), n(data.scope),
      n(data.budget_min), n(data.budget_max), n(data.deadline), data.status || 'draft', now, now)
    return briefs.getByClient(data.client_id).find(b => b.id === id)!
  },

  update: (id: string, data: Partial<Omit<Brief, 'id' | 'client_name' | 'created_at'>>): void => {
    const now = new Date().toISOString()
    const updateData = { ...data, updated_at: now }
    const fields = Object.keys(updateData).filter(k => !['id', 'client_name', 'created_at'].includes(k))
    if (fields.length === 0) return
    const sql = `UPDATE briefs SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`
    db.prepare(sql).run(...(fields.map(f => (updateData as Record<string, SQLInputValue>)[f]) as SQLInputValue[]), id as SQLInputValue)
  },

  delete: (id: string): void => {
    db.prepare('DELETE FROM briefs WHERE id = ?').run(id)
  },
}

export const milestones = {
  getByBrief: (briefId: string): Milestone[] =>
    (db.prepare('SELECT * FROM milestones WHERE brief_id = ? ORDER BY order_index ASC').all(briefId) as any[]).map(r => ({ ...r })),

  create: (data: Omit<Milestone, 'id' | 'created_at'>): Milestone => {
    const id = randomUUID()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO milestones (id, brief_id, title, due_date, status, order_index, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.brief_id, data.title, data.due_date, data.status || 'pending', data.order_index ?? 0, now)
    return milestones.getByBrief(data.brief_id).find(m => m.id === id)!
  },

  updateStatus: (id: string, status: MilestoneStatus): void => {
    db.prepare('UPDATE milestones SET status = ? WHERE id = ?').run(status, id)
  },

  delete: (id: string): void => {
    db.prepare('DELETE FROM milestones WHERE id = ?').run(id)
  },
}

export const deliverables = {
  getByBrief: (briefId: string): Deliverable[] =>
    (db.prepare('SELECT * FROM deliverables WHERE brief_id = ? ORDER BY created_at ASC').all(briefId) as any[]).map(r => ({ ...r })),

  getUpcoming: (days = 7): Deliverable[] => {
    const limit = new Date()
    limit.setDate(limit.getDate() + days)
    return (db.prepare(`
      SELECT d.*, b.title as brief_title, c.name as client_name
      FROM deliverables d
      JOIN briefs b ON b.id = d.brief_id
      JOIN clients c ON c.id = b.client_id
      WHERE d.due_date IS NOT NULL AND d.due_date <= ?
        AND d.status NOT IN ('approved', 'delivered')
      ORDER BY d.due_date ASC
    `).all(limit.toISOString()) as any[]).map(r => ({ ...r }))
  },

  create: (data: Omit<Deliverable, 'id' | 'created_at'>): Deliverable => {
    const id = randomUUID()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO deliverables (id, brief_id, type, title, status, link, due_date, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.brief_id, data.type, data.title, data.status || 'pending', n(data.link), n(data.due_date), now)
    return deliverables.getByBrief(data.brief_id).find(d => d.id === id)!
  },

  updateStatus: (id: string, status: DeliverableStatus, link?: string): void => {
    if (link !== undefined) {
      db.prepare('UPDATE deliverables SET status = ?, link = ? WHERE id = ?').run(status, link, id)
    } else {
      db.prepare('UPDATE deliverables SET status = ? WHERE id = ?').run(status, id)
    }
  },

  delete: (id: string): void => {
    db.prepare('DELETE FROM deliverables WHERE id = ?').run(id)
  },
}

// ─── UTILITY ──────────────────────────────────────────────────────────────────

function parseJSON<T>(value: string, fallback: T): T {
  if (!value) return fallback
  try { return JSON.parse(value) as T } catch { return fallback }
}
