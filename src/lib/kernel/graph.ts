/**
 * Grafo e grounding (docs/sistema-centrale.md §3.2, fase K3).
 *
 * Estende src/lib/os/graph.ts (che resta la vista per il guscio /os) con
 * quello che serve all'agente per andare a prendere il contesto invece di
 * riceverlo incollato:
 * - un indice dei nodi (clienti, incarichi, idee, post, grafiche, preventivi,
 *   mail) con parole e, se c'è un modello di embedding, significato;
 * - `related`: i vicini di un nodo (cliente, nodi dello stesso cliente,
 *   collegamenti in memory_links, eventi nati da lui);
 * - `completeness`: cosa manca nel contesto di un cliente;
 * - `focusText`: il nodo in focus e i suoi vicini, per il promemoria.
 */
import { createHash } from 'node:crypto'
import { db } from '@/lib/db/client'
import { memoryLinks } from '@/lib/db'

export type NodeKind = 'client' | 'task' | 'idea' | 'post' | 'design' | 'quote' | 'mail'
export interface GraphNode { ref: string; kind: NodeKind; title: string; clientId?: string; text?: string }
export interface Hit extends GraphNode { score: number; perché: string }
export interface Neighbor extends GraphNode { rel: string }
/** Funzione di embedding: testo → vettore. `null` = solo parole. */
export type Embedder = ((text: string) => Promise<Float32Array>) | null

/* ── lettura dei nodi dalle tabelle ───────────────────────────────────── */

const q = <T>(sql: string, ...p: (string | number)[]): T[] => { try { return db.prepare(sql).all(...p) as T[] } catch { return [] } }
const str = (...v: unknown[]) => v.filter(x => typeof x === 'string' && x.trim()).join(' · ')
const clip = (s: string, n = 600) => (s.length > n ? `${s.slice(0, n)}…` : s)

type Row = Record<string, string | null>
const READERS: Record<NodeKind, { sql: string; one: string; map: (r: Row) => GraphNode }> = {
  client: { sql: 'SELECT * FROM clients', one: 'SELECT * FROM clients WHERE id = ?', map: r => ({ ref: `client:${r.id}`, kind: 'client', title: r.name ?? '', clientId: r.id!, text: clip(str(r.sector, r.email, r.vault_md_content)) }) },
  task: { sql: 'SELECT * FROM tasks', one: 'SELECT * FROM tasks WHERE id = ?', map: r => ({ ref: `task:${r.id}`, kind: 'task', title: r.title ?? '', clientId: r.client_id ?? undefined, text: str(r.status, r.deadline ? `scadenza ${r.deadline}` : '', r.category) }) },
  idea: { sql: 'SELECT * FROM ideas', one: 'SELECT * FROM ideas WHERE id = ?', map: r => ({ ref: `idea:${r.id}`, kind: 'idea', title: r.title || clip(r.text ?? '', 60), clientId: r.client_id ?? undefined, text: clip(str(r.text, r.description, r.idea_status)) }) },
  post: { sql: 'SELECT * FROM editorial_posts', one: 'SELECT * FROM editorial_posts WHERE id = ?', map: r => ({ ref: `post:${r.id}`, kind: 'post', title: r.title || clip(r.content ?? '', 60), clientId: r.client_id ?? undefined, text: clip(str(r.content, r.editorial_status, r.scheduled_at ? `programmato ${r.scheduled_at}` : '')) }) },
  design: { sql: 'SELECT id, client_id, name, type, metadata FROM design_projects', one: 'SELECT id, client_id, name, type, metadata FROM design_projects WHERE id = ?', map: r => ({ ref: `design:${r.id}`, kind: 'design', title: r.name ?? '', clientId: r.client_id ?? undefined, text: clip(str(r.type, r.metadata), 300) }) },
  quote: { sql: 'SELECT * FROM quotes', one: 'SELECT * FROM quotes WHERE id = ?', map: r => ({ ref: `quote:${r.id}`, kind: 'quote', title: r.title ?? '', clientId: r.client_id ?? undefined, text: str(r.number, r.status, r.notes) }) },
  mail: { sql: 'SELECT id, client_id, subject, sender_name, content FROM messages ORDER BY timestamp DESC LIMIT 400', one: 'SELECT id, client_id, subject, sender_name, content FROM messages WHERE id = ?', map: r => ({ ref: `mail:${r.id}`, kind: 'mail', title: r.subject || '(senza oggetto)', clientId: r.client_id ?? undefined, text: clip(str(r.sender_name, r.content), 400) }) },
}
const KINDS = Object.keys(READERS) as NodeKind[]

/** Un nodo dal suo riferimento ('task:abc'). */
export function getGraphNode(ref: string): GraphNode | undefined {
  const [kind, id] = ref.split(':') as [NodeKind, string]
  const r = READERS[kind] && id ? q<Row>(READERS[kind].one, id)[0] : undefined
  return r ? READERS[kind].map(r) : undefined
}

function allNodes(kinds: NodeKind[] = KINDS): GraphNode[] {
  return kinds.flatMap(k => q<Row>(READERS[k].sql).map(READERS[k].map))
}

/* ── indice dei nodi (parole + significato) ───────────────────────────── */

let ready = false
function ensureIndex() {
  if (ready) return
  db.exec(`CREATE TABLE IF NOT EXISTS node_index (
    ref         TEXT PRIMARY KEY,
    kind        TEXT NOT NULL,
    client_id   TEXT,
    title       TEXT NOT NULL,
    body        TEXT,
    hash        TEXT NOT NULL,
    embedding   BLOB,
    updated_at  TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_node_index_client ON node_index(client_id);`)
  ready = true
}

const docOf = (n: GraphNode) => `${n.title}\n${n.text ?? ''}`.trim()
const hashOf = (s: string) => createHash('sha1').update(s).digest('hex').slice(0, 16)

/**
 * Allinea l'indice ai dati: aggiunge i nodi nuovi, aggiorna quelli cambiati
 * (perdono il vettore, che va ricalcolato), toglie quelli spariti.
 * Con un embedder calcola fino a `maxEmbed` vettori mancanti.
 */
export async function reindex(o: { embed?: Embedder; maxEmbed?: number } = {}): Promise<{ nodi: number; cambiati: number; vettori: number }> {
  ensureIndex()
  const nodes = allNodes()
  const old = new Map(q<{ ref: string; hash: string }>('SELECT ref, hash FROM node_index').map(r => [r.ref, r.hash]))
  const now = new Date().toISOString()
  const up = db.prepare(`INSERT INTO node_index (ref, kind, client_id, title, body, hash, embedding, updated_at) VALUES (?, ?, ?, ?, ?, ?, NULL, ?)
    ON CONFLICT(ref) DO UPDATE SET kind = excluded.kind, client_id = excluded.client_id, title = excluded.title, body = excluded.body, hash = excluded.hash, embedding = NULL, updated_at = excluded.updated_at`)
  let cambiati = 0
  for (const n of nodes) {
    const h = hashOf(docOf(n))
    if (old.get(n.ref) !== h) { up.run(n.ref, n.kind, n.clientId ?? null, n.title, n.text ?? '', h, now); cambiati++ }
    old.delete(n.ref)
  }
  const del = db.prepare('DELETE FROM node_index WHERE ref = ?')
  for (const ref of old.keys()) del.run(ref)

  let vettori = 0
  const embed = o.embed === undefined ? defaultEmbedder() : o.embed
  if (embed) {
    const set = db.prepare('UPDATE node_index SET embedding = ? WHERE ref = ?')
    for (const r of q<{ ref: string; title: string; body: string }>('SELECT ref, title, body FROM node_index WHERE embedding IS NULL LIMIT ?', o.maxEmbed ?? 200)) {
      try {
        const v = await embed(`${r.title}\n${r.body}`)
        set.run(Buffer.from(v.buffer, v.byteOffset, v.byteLength), r.ref)
        vettori++
      } catch { break } // quota o rete: si riprova al prossimo giro, le parole bastano intanto
    }
  }
  return { nodi: nodes.length, cambiati, vettori }
}

/** Embedder di Gemini se c'è la chiave; altrimenti solo parole. */
function defaultEmbedder(): Embedder {
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) return null
  return async (text: string) => {
    const [{ embed }, { google }] = await Promise.all([import('ai'), import('@/lib/ai/google')])
    const { embedding } = await embed({ model: google.textEmbeddingModel('gemini-embedding-001'), value: text.slice(0, 8000) })
    return new Float32Array(embedding)
  }
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const words = (s: string) => norm(s).split(/[^a-z0-9]+/).filter(w => w.length > 2)

function cosine(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0
  let d = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i] }
  return na && nb ? d / Math.sqrt(na * nb) : 0
}

/**
 * Una sola ricerca con parole e significato su tutti i nodi. Le parole
 * contano di più nel titolo; il significato entra quando l'indice ha i
 * vettori e c'è un embedder per la domanda.
 */
export async function searchGraph(query: string, o: { kinds?: NodeKind[]; clientId?: string; limit?: number; embed?: Embedder } = {}): Promise<Hit[]> {
  ensureIndex()
  if (!q<{ n: number }>('SELECT COUNT(*) AS n FROM node_index')[0]?.n) await reindex({ embed: null })
  const qw = words(query)
  if (!qw.length) return []
  const rows = q<{ ref: string; kind: NodeKind; client_id: string | null; title: string; body: string; embedding: Uint8Array | null }>(
    `SELECT * FROM node_index WHERE 1 = 1 ${o.clientId ? 'AND (client_id = ? OR ref = ?)' : ''}`, ...(o.clientId ? [o.clientId, `client:${o.clientId}`] : []))
    .filter(r => !o.kinds || o.kinds.includes(r.kind))
  const embed = o.embed === undefined ? defaultEmbedder() : o.embed
  let qv: Float32Array | undefined
  if (embed && rows.some(r => r.embedding)) { try { qv = await embed(query) } catch { qv = undefined } }

  const hits: Hit[] = []
  for (const r of rows) {
    const tw = new Set(words(r.title)), bw = new Set(words(r.body ?? ''))
    const inTitle = qw.filter(w => tw.has(w) || [...tw].some(t => t.startsWith(w))).length
    const inBody = qw.filter(w => bw.has(w)).length
    const kw = (inTitle * 2 + inBody) / qw.length
    const sem = qv && r.embedding ? cosine(qv, new Float32Array(r.embedding.buffer.slice(r.embedding.byteOffset, r.embedding.byteOffset + r.embedding.byteLength))) : 0
    const score = kw + (sem > 0.55 ? (sem - 0.55) * 6 : 0)
    if (score <= 0) continue
    hits.push({ ref: r.ref, kind: r.kind, title: r.title, clientId: r.client_id ?? undefined, text: clip(r.body ?? '', 160), score: Math.round(score * 100) / 100, perché: [inTitle || inBody ? 'parole' : '', sem > 0.55 ? 'significato' : ''].filter(Boolean).join(' + ') })
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, o.limit ?? 10)
}

/* ── vicini ───────────────────────────────────────────────────────────── */

/**
 * I vicini di un nodo: il suo cliente, i nodi dello stesso cliente (per un
 * cliente: tutto il suo lavoro), i collegamenti di memory_links nei due
 * versi e i nodi nati da lui. Con `depth` 2 si allarga ai vicini dei vicini
 * diretti (non ai nodi dello stesso cliente, per non esplodere).
 */
export function related(ref: string, o: { depth?: 1 | 2; limit?: number } = {}): Neighbor[] {
  const me = getGraphNode(ref)
  if (!me) return []
  const out = new Map<string, Neighbor>()
  const add = (n: GraphNode | undefined, rel: string) => { if (n && n.ref !== ref && !out.has(n.ref)) out.set(n.ref, { ...n, text: undefined, rel }) }

  const links = (r: string) => {
    const id = r.split(':')[1]
    for (const l of q<{ source_id: string; source_type: string; target_id: string; target_type: string; relation: string }>('SELECT * FROM memory_links WHERE source_id = ? OR target_id = ?', id, id)) {
      const out_ = l.source_id === id
      const other = out_ ? `${l.target_type}:${l.target_id}` : `${l.source_type}:${l.source_id}`
      add(getGraphNode(other), out_ ? (l.relation === 'origin' ? 'ha generato' : l.relation) : (l.relation === 'origin' ? 'nato da' : l.relation))
    }
  }
  links(ref)
  if (me.kind === 'client') {
    for (const k of KINDS.filter(k => k !== 'client' && k !== 'mail'))
      for (const r of q<Row>(`${READERS[k].sql.replace(/ ORDER BY.*$/, '')} WHERE client_id = ?`, me.clientId!)) add(READERS[k].map(r), 'del cliente')
    for (const r of q<Row>('SELECT id, client_id, subject, sender_name, content FROM messages WHERE client_id = ? ORDER BY timestamp DESC LIMIT 5', me.clientId!)) add(READERS.mail.map(r), 'mail del cliente')
  } else if (me.clientId) {
    add(getGraphNode(`client:${me.clientId}`), 'cliente')
  }
  if ((o.depth ?? 1) === 2) for (const n of [...out.values()].filter(n => n.rel !== 'del cliente')) links(n.ref)
  return [...out.values()].slice(0, o.limit ?? 40)
}

/** Collega due nodi (relazioni libere: origin, about, uses, replies_to…). */
export function link(from: string, to: string, rel = 'about'): string {
  const [st, sid] = from.split(':'), [tt, tid] = to.split(':')
  return memoryLinks.create({ source_id: sid, source_type: st, target_id: tid, target_type: tt, relation: rel })
}

/* ── completezza del contesto di un cliente ───────────────────────────── */

export interface Completeness { clientId: string; nome: string; percentuale: number; manca: string[]; presente: string[] }

/** Cosa sa e cosa non sa il sistema di un cliente: il guscio lo mostra, l'agente lo usa per chiedere. */
export function completeness(clientId: string): Completeness | undefined {
  const c = q<Row>('SELECT * FROM clients WHERE id = ?', clientId)[0]
  if (!c) return undefined
  const vault = c.vault_md_content ?? ''
  const posts = q<{ n: number }>('SELECT COUNT(*) AS n FROM editorial_posts WHERE client_id = ?', clientId)[0]?.n ?? 0
  const voci: [string, boolean][] = [
    ['email di contatto', !!c.email],
    ['settore', !!c.sector],
    ['scheda del cliente (vault)', vault.trim().length > 200],
    ['tono di voce', /\b(tono|voce|tone of voice|registro)\b/i.test(vault)],
    ['marchio (colori, caratteri o brand kit)', !!c.canva_brand_kit_id || /\b(palette|colori|caratteri|font|logo)\b/i.test(vault)],
    ['account Instagram collegato', !!c.meta_ig_account_id],
    ['metriche (sito o social)', !!c.umami_website_id || !!c.meta_page_id],
    ['cartella Drive', !!c.drive_folder_id],
    ['storico dei contenuti', posts > 0],
  ]
  const presente = voci.filter(v => v[1]).map(v => v[0]), manca = voci.filter(v => !v[1]).map(v => v[0])
  return { clientId, nome: c.name ?? '', percentuale: Math.round(presente.length / voci.length * 100), manca, presente }
}

/* ── grounding: il nodo in focus per il promemoria ────────────────────── */

const LABEL: Record<string, string> = { client: 'cliente', task: 'incarico', idea: 'idea', post: 'post', design: 'grafica', quote: 'preventivo', mail: 'mail' }

/**
 * Testo breve per il promemoria: il nodo in focus, i suoi vicini e, se c'è
 * un cliente, cosa manca nel suo contesto. Il resto l'agente lo chiede con
 * graphSearch e graphRelated.
 */
export function focusText(ref: string, o: { maxVicini?: number } = {}): string {
  const n = getGraphNode(ref)
  if (!n) return ''
  const vicini = related(ref, { limit: o.maxVicini ?? 12 })
  const comp = n.clientId ? completeness(n.clientId) : undefined
  return [
    `## In focus: ${LABEL[n.kind]} «${n.title}» (${n.ref})`,
    n.text ? clip(n.text, 400) : '',
    vicini.length ? `Vicini:\n${vicini.map(v => `- ${v.rel}: ${LABEL[v.kind]} «${v.title}» (${v.ref})`).join('\n')}` : '',
    comp?.manca.length ? `Contesto di ${comp.nome} completo al ${comp.percentuale}%. Manca: ${comp.manca.join(', ')}. Se ti serve, chiedilo all'utente invece di inventarlo.` : '',
    'Per altro contesto usa graphSearch (parole e significato) e graphRelated (vicini di un nodo).',
  ].filter(Boolean).join('\n')
}
