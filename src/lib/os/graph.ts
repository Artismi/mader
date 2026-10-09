/**
 * Grafo dello spazio di lavoro: trasforma le tabelle SQLite in "nodi" che il guscio
 * circolare sa mostrare. Ogni suggerimento porta il suo perché (intelligenza visibile).
 * Solo lato server.
 */
import { clients, designProjects, messages, quotes, tasks, type Client, type Message } from '@/lib/db'

export type Kind = 'list' | 'mail' | 'client' | 'task' | 'design' | 'quote'

export interface Sat { kind: 'client' | 'calendar' | 'quote' | 'task'; ref?: string; tip: string; smart?: boolean }
export interface Petal { label: string; icon: string; kind: 'quote' | 'calendar' | 'task'; why?: string }

export interface NodeSummary {
  ref: string            // 'mail:abc'
  kind: Kind
  title: string
  sub: string
  ini?: string
  when?: string
  urgent?: boolean
  why?: string
  score?: number
}

export interface NodeDetail extends NodeSummary {
  who?: string
  email?: string
  clientRef?: string
  clientName?: string
  html?: string[]        // paragrafi con <mark> sulle richieste
  plain?: string
  subject?: string
  lead?: string
  groups?: [string, NodeSummary[]][]
  sats: Sat[]
  petals: Petal[]
  href?: string          // per i nodi che si aprono in una vista legacy (es. canvas)
}

// ───────── utilità ─────────
const cleanSender = (s?: string) => (s ?? '').replace(/^\[[^\]]+\]\s*/, '').trim()
const initials = (s?: string) => (s ?? '?').replace(/[^\p{L}\s]/gu, ' ').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?'

export function relTime(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso), now = new Date()
  const days = Math.floor((now.setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000)
  const hm = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  if (days <= 0) return `oggi ${hm}`
  if (days === 1) return `ieri ${hm}`
  if (days < 7) return d.toLocaleDateString('it-IT', { weekday: 'long' })
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

const stripHtml = (s: string) => s.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// ───────── lettura delle mail: cosa chiede? ─────────
const SIGNALS = {
  quote: /\bpreventiv\w*|\bquotazion\w*|\bcosto\b|\bprezz\w*|\bbudget\b/i,
  meet: /\bsentirci\b|\bincontr\w*|\bappuntament\w*|\bcall\b|\bchiamat\w*|\bvideochiamat\w*|\bmeet\b|\bdisponibil\w*/i,
  deadline: /\bentro\b|\bscadenz\w*|\burgent\w*|\bil prima possibile\b|\bdomani\b/i,
  question: /\?/,
}
const BULK = /no-?reply|newsletter|notifica|notification|mailer|marketing|unsubscribe|disiscriv|promo/i
// Mittenti tipicamente automatici: aziende, team, servizi (non persone che aspettano te)
const SERVICE = /\b(news|team|il team|workspace|google|zapier|notion|canva|figma|linkedin|facebook|meta|instagram|amazon|paypal|stripe|github|vercel|supabase|anthropic|openai|apple|microsoft|adobe|support|info@|hello@|ciao@)\b/i

function readMail(m: Message, client?: Client) {
  const text = stripHtml(m.content || m.html_content || '')
  const from = `${m.sender_name ?? ''} ${m.sender_id ?? ''}`
  const bulk = BULK.test(from) || BULK.test(text.slice(-400)) || (!client && SERVICE.test(from))
  const has = {
    quote: SIGNALS.quote.test(text),
    meet: SIGNALS.meet.test(text),
    deadline: SIGNALS.deadline.test(text),
    question: SIGNALS.question.test(text),
  }
  const ageDays = (Date.now() - new Date(m.timestamp).getTime()) / 86400000
  let score = 0
  const reasons: string[] = []
  if (client) { score += 4; reasons.push(`è di ${client.name}`) }
  if (has.quote) { score += 3; reasons.push('chiede un preventivo') }
  if (has.meet) { score += 3; reasons.push('vuole sentirvi') }
  if (has.deadline) { score += 2; reasons.push('c’è una scadenza') }
  if (has.question && !has.quote && !has.meet) { score += 1; reasons.push('ti fa una domanda') }
  if (bulk) { score -= 6 }
  if (m.replied) score -= 10
  const signal = score                     // quanto chiede davvero: decide se è "da rispondere"
  score -= Math.min(ageDays, 30) * 0.05    // l'età serve solo a ordinare
  const why = bulk ? 'sembra una newsletter: può aspettare' : reasons.length ? reasons.join(' e ') : undefined
  return { text, has, bulk, score, signal, why }
}

/** Paragrafi con le frasi-richiesta evidenziate */
function highlight(text: string): string[] {
  const paras = text.split(/(?<=[.!?])\s{2,}|\n{2,}/).filter(Boolean)
  const src = paras.length > 1 ? paras : text.match(/[^.!?]+[.!?]*/g) ?? [text]
  const sentences = src.slice(0, 40).map(s => {
    const t = esc(s.trim())
    const ask = SIGNALS.quote.test(s) || SIGNALS.meet.test(s) || (SIGNALS.question.test(s) && s.length < 220)
    return ask ? `<mark>${t}</mark>` : t
  })
  // Riaccorpa in paragrafi da ~3 frasi per la lettura
  const out: string[] = []
  for (let i = 0; i < sentences.length; i += 3) out.push(sentences.slice(i, i + 3).join(' '))
  return out
}

// ───────── riassunti ─────────
const clientMap = () => new Map(clients.getAll().map(c => [c.id, c]))

function mailSummary(m: Message, cm: Map<string, Client>): NodeSummary {
  const c = m.client_id ? cm.get(m.client_id) : undefined
  const r = readMail(m, c)
  return {
    ref: `mail:${m.id}`, kind: 'mail', title: m.subject || '(senza oggetto)',
    sub: `${cleanSender(m.sender_name || m.sender_id) || 'Sconosciuto'} · ${relTime(m.timestamp)}`,
    ini: initials(cleanSender(m.sender_name || m.sender_id)), when: relTime(m.timestamp),
    // senza cliente serve un segnale forte (richiesta o appuntamento) per finire tra i 'da rispondere'
    urgent: !m.replied && !r.bulk && (c ? r.signal > 0 : r.signal >= 2), why: r.why, score: r.score,
  }
}
function clientSummary(c: Client, waiting: number): NodeSummary {
  return { ref: `client:${c.id}`, kind: 'client', title: c.name, sub: [c.sector, waiting ? `${waiting} da rispondere` : null].filter(Boolean).join(' · ') || 'cliente', ini: initials(c.name), urgent: waiting > 0, score: waiting }
}
function taskSummary(t: ReturnType<typeof tasks.getAll>[number]): NodeSummary {
  const due = t.deadline ? new Date(t.deadline) : undefined
  const late = due && due.getTime() < Date.now()
  return { ref: `task:${t.id}`, kind: 'task', title: t.title, sub: [t.client_name, t.deadline ? `scade ${relTime(t.deadline).replace(/ \d\d:\d\d$/, '')}` : null].filter(Boolean).join(' · ') || 'task', urgent: !!late, why: late ? 'è in ritardo' : undefined, when: t.deadline ? relTime(t.deadline).replace(/ \d\d:\d\d$/, '') : '' }
}
function designSummary(d: ReturnType<typeof designProjects.getAll>[number], cm: Map<string, Client>): NodeSummary {
  return { ref: `design:${d.id}`, kind: 'design', title: d.name, sub: [cm.get(d.client_id ?? '')?.name, `modificato ${relTime(d.updated_at)}`].filter(Boolean).join(' · '), when: relTime(d.updated_at) }
}

const openTasks = () => tasks.getAll().filter(t => !/^(done|completat|fatt|chius)/i.test(t.status))
const rankedMails = (cm: Map<string, Client>) => messages.getAll({ limit: 200 }).map(m => mailSummary(m, cm)).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

// ───────── elenchi (le sezioni della ghiera) ─────────
export function getList(id: string): NodeDetail {
  const cm = clientMap()
  const base = { ref: `list:${id}`, kind: 'list' as const, sats: [], petals: [] }
  switch (id) {
    case 'oggi': {
      const mails = rankedMails(cm)
      const pending = mails.filter(m => m.urgent)
      const late = openTasks().map(taskSummary).filter(t => t.urgent)
      const hero = pending[0] ?? late[0]
      const rest = [...pending.slice(1, 4), ...late.slice(hero?.kind === 'task' ? 1 : 0, 3)]
      return { ...base, title: pending.length || late.length ? 'Buongiorno' : 'Tutto in ordine', sub: '',
        lead: pending.length ? `${pending.length === 1 ? 'Una persona aspetta' : `${pending.length} persone aspettano`} una tua risposta.` : 'Nessuno aspetta risposte: puoi concentrarti sul lavoro creativo.',
        groups: [['__hero', hero ? [hero] : []], ['Poi', rest], ['Ripresi di recente', designProjects.getAll().slice(0, 2).map(d => designSummary(d, cm))]] }
    }
    case 'messaggi': {
      const mails = rankedMails(cm)
      return { ...base, title: 'Messaggi', sub: '', lead: 'Ordinati per quanto contano, non per data.',
        groups: [['Da rispondere', mails.filter(m => m.urgent).slice(0, 30)], ['Il resto', mails.filter(m => !m.urgent).slice(0, 40)]] }
    }
    case 'clienti': {
      const all = messages.getAll({ limit: 500 }).filter(m => !m.replied)
      const list = [...cm.values()].map(c => clientSummary(c, all.filter(m => m.client_id === c.id).length)).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      return { ...base, title: 'Clienti', sub: '', lead: 'Prima chi aspetta una tua risposta.', groups: [['Attivi', list]] }
    }
    case 'lavori': {
      const ts = openTasks().map(taskSummary)
      return { ...base, title: 'Lavori', sub: '', lead: ts.length ? 'In ordine di scadenza.' : 'Nessun task aperto.', groups: [['In corso', ts]] }
    }
    case 'studio':
      return { ...base, title: 'Studio', sub: '', lead: 'Riprendi da dove avevi lasciato.', groups: [['Design', designProjects.getAll().map(d => designSummary(d, cm))]] }
    default:
      return { ...base, title: 'Archivio', sub: '', lead: 'Note, idee e file del vault.', groups: [['Recenti', []]] }
  }
}

// ───────── dettaglio di un nodo ─────────
export function getNode(ref: string): NodeDetail | null {
  const [kind, id] = ref.split(':') as [Kind, string]
  const cm = clientMap()
  if (kind === 'list') return getList(id)

  if (kind === 'mail') {
    const m = messages.getAll({ limit: 1000 }).find(x => x.id === id)
    if (!m) return null
    const c = m.client_id ? cm.get(m.client_id) : undefined
    const r = readMail(m, c)
    const sats: Sat[] = []
    if (c) sats.push({ kind: 'client', ref: `client:${c.id}`, tip: c.name })
    if (r.has.meet) sats.push({ kind: 'calendar', tip: 'Vuole sentirvi → proponi un orario', smart: true })
    if (r.has.quote) sats.push({ kind: 'quote', tip: 'Chiede un preventivo → preparalo', smart: !r.has.meet })
    const petals: Petal[] = [
      { label: 'Preventivo', icon: 'euro', kind: 'quote', why: r.has.quote ? 'lo chiede' : undefined },
      { label: 'Evento', icon: 'cal', kind: 'calendar', why: r.has.meet && !r.has.quote ? 'vuole sentirvi' : undefined },
      { label: 'Task', icon: 'check', kind: 'task' },
    ]
    return { ...mailSummary(m, cm), who: cleanSender(m.sender_name || m.sender_id) || 'Sconosciuto', email: cleanSender(m.sender_id), subject: m.subject,
      clientRef: c ? `client:${c.id}` : undefined, clientName: c?.name, plain: r.text, html: highlight(r.text), sats, petals }
  }

  if (kind === 'client') {
    const c = cm.get(id)
    if (!c) return null
    const pending = messages.getAll({ clientId: id, limit: 100 }).filter(m => !m.replied).map(m => mailSummary(m, cm))
    const ts = openTasks().filter(t => t.client_id === id).map(taskSummary)
    const ds = designProjects.getByClient(id).map(d => designSummary(d, cm))
    return { ...clientSummary(c, pending.length), lead: [c.email, c.sector].filter(Boolean).join(' · '),
      groups: [['Prossima cosa', pending.slice(0, 3)], ['Lavori', ts], ['Design', ds]],
      sats: [{ kind: 'quote', tip: 'Preventivi del cliente' }], petals: [{ label: 'Task', icon: 'check', kind: 'task' }, { label: 'Preventivo', icon: 'euro', kind: 'quote' }] }
  }

  if (kind === 'task') {
    const t = tasks.getById(id)
    if (!t) return null
    return { ...taskSummary(t), lead: t.deadline ? `Scadenza: ${new Date(t.deadline).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}` : 'Senza scadenza',
      clientRef: t.client_id ? `client:${t.client_id}` : undefined, clientName: t.client_name,
      sats: t.client_id ? [{ kind: 'client', ref: `client:${t.client_id}`, tip: t.client_name ?? 'Cliente' }] : [], petals: [] }
  }

  if (kind === 'design') {
    const d = designProjects.getById(id)
    if (!d) return null
    const c = d.client_id ? cm.get(d.client_id) : undefined
    return { ...designSummary(d, cm), lead: c ? `Per ${c.name}` : undefined, clientRef: c ? `client:${c.id}` : undefined, clientName: c?.name,
      href: `/progettazione?project=${d.id}`, sats: c ? [{ kind: 'client', ref: `client:${c.id}`, tip: c.name }] : [], petals: [] }
  }
  return null
}

// ───────── ricerca per Ctrl+K ─────────
export function search(q: string): NodeSummary[] {
  const s = q.trim().toLowerCase()
  if (!s) return []
  const cm = clientMap()
  const hit = (...v: (string | undefined)[]) => v.some(x => x?.toLowerCase().includes(s))
  return [
    ...[...cm.values()].filter(c => hit(c.name, c.email)).map(c => clientSummary(c, 0)),
    ...messages.getAll({ limit: 500 }).filter(m => hit(m.subject, m.sender_name, m.sender_id)).slice(0, 8).map(m => mailSummary(m, cm)),
    ...openTasks().filter(t => hit(t.title, t.client_name)).slice(0, 5).map(taskSummary),
    ...designProjects.getAll().filter(d => hit(d.name)).slice(0, 5).map(d => designSummary(d, cm)),
  ].slice(0, 12)
}

/** Ultimo preventivo del cliente (per l'accessorio) */
export function quoteFor(clientId?: string) {
  const all = quotes.getAll()
  return (clientId ? all.filter((q: any) => q.client_id === clientId) : all)[0] ?? null
}
