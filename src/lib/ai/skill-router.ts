// ─── Router delle skill ──────────────────────────────────────────────────────
// Decide quali skill entrano intere nel prompt e quali restano nel catalogo,
// da cui il modello le carica da solo con il tool `loadSkill` quando servono
// (progressive disclosure: il modello sa che esistono, paga i token solo se le usa).
//
// Per ora governa le famiglie a richiesta (ig-*). Le altre famiglie mantengono
// la logica storica in /api/ai/route.ts.

import type { Skill } from '@/lib/db'

type AnyMessage = {
  role?: string
  content?: unknown
  parts?: { type?: string; text?: string }[]
}

/** Testo di un messaggio: UIMessage v6 (parts), oppure content stringa/array. */
export function messageText(m: AnyMessage | undefined): string {
  if (!m) return ''
  if (Array.isArray(m.parts)) {
    return m.parts.filter(p => p?.type === 'text' && typeof p.text === 'string').map(p => p.text).join('\n')
  }
  if (typeof m.content === 'string') return m.content
  if (Array.isArray(m.content)) {
    return (m.content as { text?: string }[]).map(c => c?.text ?? '').join('\n')
  }
  return ''
}

/** Nomi dei tool già chiamati nella conversazione (parti `tool-<nome>` in v6). */
function usedTools(messages: AnyMessage[]): Set<string> {
  const out = new Set<string>()
  for (const m of messages) {
    for (const p of m.parts ?? []) {
      if (typeof p?.type === 'string' && p.type.startsWith('tool-')) out.add(p.type.slice(5))
    }
  }
  return out
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Trigger a parola intera: "dm" non scatta su "admin", "bio" non su "biologico". */
export function hitsTrigger(text: string, trigger: string): boolean {
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escape(trigger.toLowerCase())}($|[^\\p{L}\\p{N}])`, 'u').test(text)
}

// Skill attivate dalla pagina in cui si trova l'utente.
const PAGE_SKILLS: { match: RegExp; slugs: string[] }[] = [
  { match: /^\/pubblica/, slugs: ['ig-caption'] },
  { match: /^\/(editoriale|studio)/, slugs: ['ig-plan'] },
]

// Tool che appartengono al circuito Instagram: se il modello li ha già usati,
// la conversazione è "dentro" il circuito e l'umanizzatore resta attivo.
const IG_TOOLS = new Set(['instagramLab', 'saveInstagramDraft'])

export interface SkillRoute {
  /** Skill da iniettare intere nel prompt. */
  inject: Skill[]
  /** Skill a richiesta non iniettate: vanno nel catalogo per `loadSkill`. */
  catalog: Skill[]
}

export function routeOnDemandSkills(opts: {
  skills: Skill[]
  messages: AnyMessage[]
  pathname?: string
  /** Quanti messaggi utente recenti contano per i trigger (memoria di conversazione). */
  window?: number
}): SkillRoute {
  const { skills, messages, pathname } = opts
  const onDemand = skills.filter(s => s.slug.startsWith('ig-'))
  if (onDemand.length === 0) return { inject: [], catalog: [] }

  const userTexts = messages.filter(m => m.role === 'user').map(messageText)
  const last = (userTexts.at(-1) ?? '').toLowerCase()
  const recent = userTexts.slice(-(opts.window ?? 3)).join('\n').toLowerCase()

  const active = new Set<string>()
  for (const s of onDemand) {
    const triggers = s.triggers || []
    // Ultimo messaggio: attivazione piena. Messaggi precedenti: la skill resta
    // attiva per i seguiti ("accorcialo", "rifallo più diretto").
    if (triggers.some(t => hitsTrigger(last, t) || hitsTrigger(recent, t))) active.add(s.slug)
  }
  for (const p of PAGE_SKILLS) {
    if (pathname && p.match.test(pathname)) p.slugs.forEach(sl => active.add(sl))
  }
  const tools = usedTools(messages)
  const inCircuit = active.size > 0 || [...IG_TOOLS].some(t => tools.has(t))
  if (inCircuit) active.add('ig-human')

  return {
    inject: onDemand.filter(s => active.has(s.slug)),
    catalog: onDemand.filter(s => !active.has(s.slug)),
  }
}

/** Blocco di catalogo per il system prompt: una riga per skill. */
export function formatSkillCatalog(catalog: Skill[]): string {
  if (catalog.length === 0) return ''
  return [
    '## Skill a richiesta (catalogo)',
    'Queste competenze NON sono nel prompt. Se la richiesta ne tocca una, anche senza nominarla, chiama `loadSkill` con lo slug PRIMA di rispondere e poi seguine le istruzioni. Puoi caricarne più d\'una.',
    ...catalog.map(s => `- \`${s.slug}\` — ${s.description ?? s.name}`),
  ].join('\n')
}
