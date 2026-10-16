/**
 * Eventi e provenienza (docs/sistema-centrale.md §3.3, fase K2).
 *
 * Ogni azione che cambia qualcosa registra un evento: chi (utente, agente,
 * regola, connettore), cosa, su quale nodo, a nome di quale cliente e da dove
 * è nata. La provenienza finisce anche in memory_links (relazione 'origin'),
 * la tabella dei collegamenti già usata dal grafo: nessuna tabella nuova per i link.
 * Da qui nascono la linea del tempo di ogni nodo e "cosa è cambiato da ieri".
 */
import { randomUUID } from 'node:crypto'
import { db } from '@/lib/db/client'
import { memoryLinks } from '@/lib/db'
import { getAction, onActionDone, type ActionContext } from './actions'

let ready = false
function ensureTable() {
  if (ready) return
  db.exec(`CREATE TABLE IF NOT EXISTS events (
    id          TEXT PRIMARY KEY,
    at          TEXT NOT NULL,
    type        TEXT NOT NULL,
    actor       TEXT NOT NULL,
    ref         TEXT,
    scope       TEXT,
    data        TEXT,
    origin_ref  TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_events_ref ON events(ref);
  CREATE INDEX IF NOT EXISTS idx_events_scope ON events(scope);
  CREATE INDEX IF NOT EXISTS idx_events_at ON events(at);`)
  ready = true
}

export interface EventRow { id: string; at: string; type: string; actor: string; ref: string | null; scope: string | null; data: Record<string, unknown> | null; origin_ref: string | null }

/** Registra un evento (azioni, connettori, regole). `scope` è il cliente a cui appartiene, es. 'client:<id>'. */
export function emit(e: { type: string; actor: string; ref?: string; scope?: string; data?: Record<string, unknown>; origin?: string; at?: string }): string {
  ensureTable()
  const id = randomUUID()
  db.prepare('INSERT INTO events (id, at, type, actor, ref, scope, data, origin_ref) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, e.at ?? new Date().toISOString(), e.type, e.actor, e.ref ?? null, e.scope ?? null, e.data ? JSON.stringify(e.data) : null, e.origin ?? null)
  return id
}

function parse(r: Record<string, unknown>): EventRow {
  return { ...(r as unknown as EventRow), data: r.data ? JSON.parse(String(r.data)) : null }
}

/**
 * Linea del tempo di un nodo: i suoi eventi, quelli dei nodi nati da lui e,
 * per un cliente, tutto ciò che è stato fatto a suo nome. Dal più recente.
 */
export function timeline(ref: string, o: { limit?: number; since?: string } = {}): EventRow[] {
  ensureTable()
  const rows = db.prepare(`SELECT * FROM events WHERE (ref = ? OR scope = ? OR origin_ref = ?) ${o.since ? 'AND at >= ?' : ''} ORDER BY at DESC LIMIT ?`)
    .all(...([ref, ref, ref, ...(o.since ? [o.since] : []), o.limit ?? 50] as (string | number)[])) as Record<string, unknown>[]
  return rows.map(parse)
}

/** Cosa è cambiato da un certo momento (per "Oggi"). */
export function changesSince(since: string, o: { limit?: number; actor?: string } = {}): EventRow[] {
  ensureTable()
  const rows = db.prepare(`SELECT * FROM events WHERE at >= ? ${o.actor ? 'AND actor LIKE ?' : ''} ORDER BY at DESC LIMIT ?`)
    .all(...([since, ...(o.actor ? [`${o.actor}%`] : []), o.limit ?? 100] as (string | number)[])) as Record<string, unknown>[]
  return rows.map(parse)
}

/* ── lettura per le persone ─────────────────────────────────────────── */

const ACTOR: Record<string, string> = { user: 'tu', agent: 'IA', rule: 'regola', connector: 'connettore' }

/** Chi ha agito, in parole: 'agent:editoriale' → 'IA · editoriale'. */
export function actorLabel(actor: string): string {
  const [k, sub] = actor.split(':')
  return `${ACTOR[k] ?? k}${sub ? ` · ${sub}` : ''}`
}

/** Una riga leggibile: titolo dell'azione e il nome della cosa toccata. */
export function describe(e: EventRow): string {
  const d = e.data ?? {}
  const name = [d.title, d.name, d.newStatus, d.status, d.text].find(v => typeof v === 'string' && v) as string | undefined
  return `${getAction(e.type)?.title ?? e.type}${name ? ` · ${name.length > 60 ? `${name.slice(0, 60)}…` : name}` : ''}`
}

/* ── collegamento con le azioni ────────────────────────────────────────── */

const KIND: Record<string, string> = { task: 'task', idea: 'idea', post: 'post', client: 'client', quote: 'quote', memory: 'memory', design: 'design' }

/** Riferimento del nodo toccato: dall'output (id, postId) o dall'input. */
function refOf(domain: string, input: Record<string, unknown>, output: Record<string, unknown>): string | undefined {
  const id = output.id ?? output.postId ?? input.id ?? input.taskId
  return typeof id === 'string' && id ? `${KIND[domain] ?? domain}:${id}` : undefined
}

/** Cliente a cui appartiene il nodo: dal database, dopo l'azione. */
function scopeOf(ref?: string): string | undefined {
  if (!ref) return undefined
  const [kind, id] = ref.split(':')
  if (kind === 'client') return ref
  const table = kind === 'task' ? 'tasks' : kind === 'idea' ? 'ideas' : kind === 'post' ? 'editorial_posts' : kind === 'quote' ? 'quotes' : undefined
  if (!table) return undefined
  try {
    const row = db.prepare(`SELECT client_id FROM ${table} WHERE id = ?`).get(id) as { client_id?: string } | undefined
    return row?.client_id ? `client:${row.client_id}` : undefined
  } catch { return undefined }
}

/** Solo i campi brevi dell'input: l'evento deve dire cosa è successo, non copiare i contenuti. */
function compact(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined || v === null) continue
    if (typeof v === 'string') out[k] = v.length > 120 ? `${v.slice(0, 120)}…` : v
    else if (typeof v === 'number' || typeof v === 'boolean') out[k] = v
    else if (Array.isArray(v) && v.length <= 10 && v.every(x => typeof x === 'string')) out[k] = v
  }
  return out
}

let wired = false
/** Collega gli eventi alle azioni del nucleo (idempotente). */
export function wireEvents() {
  if (wired) return
  wired = true
  onActionDone((def, input, output, ctx: ActionContext) => {
    if (def.risk === 'read') return
    const i = (input ?? {}) as Record<string, unknown>, o = (output ?? {}) as Record<string, unknown>
    const ref = refOf(def.domain, i, o)
    emit({ type: def.emits ?? def.id, actor: ctx.actor, ref, scope: scopeOf(ref), data: compact(i), origin: ctx.origin })
    // provenienza: il nodo nuovo "nasce da" quello in cui si trovava l'utente (o l'agente)
    if (ctx.origin && ref && ctx.origin !== ref) {
      const [st, sid] = ctx.origin.split(':'), [tt, tid] = ref.split(':')
      if (sid && tid && st !== 'list') memoryLinks.create({ source_id: sid, source_type: st, target_id: tid, target_type: tt, relation: 'origin' })
    }
  })
}
