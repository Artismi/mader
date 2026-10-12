/**
 * Pilota automatico per composeDesign: rende buona una richiesta anche quando
 * arriva da un modello piccolo o gratuito.
 *
 * - nomi di stile, layout, formato e decorazioni riconosciuti anche se scritti
 *   male ("minimal", "Luxury", "instagram story", "Swiss")
 * - se manca la foto, si cerca una foto vera libera da diritti (poi il generatore);
 *   un layout neutro scelto "di default" diventa una copertina fotografica
 * - densità ricca, effetti e materia dello stile restano attivi
 *
 * Nessuna dipendenza dal canvas: lo usano sia lo Studio sia i test.
 */
import { DECOR_IDS, FORMATS, LAYOUTS, STYLES, type ComposeBoard, type DecorId } from './compose-spec'

const norm = (s: unknown) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

/** Sinonimi frequenti (inglese, varianti) → id del catalogo. */
const STYLE_ALIASES: Record<string, string> = {
  swiss: 'svizzero', international: 'svizzero', grid: 'svizzero', editorial: 'editoriale', magazine: 'editoriale',
  luxury: 'lusso', elegant: 'lusso', elegante: 'lusso', premium: 'lusso', brutalist: 'brutalista', brutalism: 'brutalista',
  technology: 'tech', futuristic: 'tech', futuristico: 'tech', organic: 'organico', natural: 'organico', naturale: 'organico',
  chrome: 'cromo', y2k: 'cromo', typographic: 'poster', tipografico: 'poster', minimale: 'minimal', minimalist: 'minimal',
  minimalista: 'minimal', clean: 'minimal', risograph: 'riso', soft: 'morbido', gradient: 'morbido', gradiente: 'morbido',
  night: 'neon', notte: 'neon', cyberpunk: 'neon', cinematic: 'cinema', film: 'cinema', cinematografico: 'cinema',
  retro: 'retro', vintage: 'retro', seventies: 'retro', gallery: 'galleria', museum: 'galleria', museo: 'galleria', arte: 'galleria',
}
const LAYOUT_ALIASES: Record<string, string> = {
  hero: 'eroe', poster: 'gigante', big: 'gigante', split: 'diviso', half: 'diviso', cover: 'copertina', fullbleed: 'copertina',
  full: 'copertina', magazine: 'rivista', quote: 'citazione', stats: 'numeri', numbers: 'numeri', list: 'elenco', card: 'scheda',
  gallery: 'galleria', art: 'arte', grid: 'bento', typographic: 'tipografico', manual: 'manuale', technical: 'manuale',
  streetwear: 'drop', manifesto: 'manifesto', foto: 'copertina', photo: 'copertina',
}

function match<T extends { id: string; label: string }>(list: T[], value: unknown, aliases: Record<string, string>): T | undefined {
  const v = norm(value)
  if (!v) return undefined
  const byId = list.find(x => x.id === v) ?? list.find(x => norm(x.label) === v)
  if (byId) return byId
  for (const w of v.split(' ')) {
    const a = aliases[w]
    if (a) { const hit = list.find(x => x.id === a); if (hit) return hit }
  }
  return list.find(x => v.includes(x.id) || v.includes(norm(x.label)) || norm(x.label).includes(v))
}

const FORMAT_ALIASES: [RegExp, string][] = [
  [/stor|reel|tiktok|9 16|1080 1920|verticale lung/, 'storia'],
  [/4 5|1080 1350|verticale|portrait|ritratto/, 'verticale'],
  [/16 9|1920 1080|slide|orizzontale|landscape|banner|youtube|presentaz/, 'orizzontale'],
  [/quadr|square|post|instagram|1 1|1080 1080/, 'quadrato'],
]

function formatOf(b: Partial<ComposeBoard>): string | undefined {
  const v = norm(b.format)
  if (v && FORMATS[v]) return v
  if (v) for (const [re, id] of FORMAT_ALIASES) if (re.test(v) && FORMATS[id]) return id
  if (b.width && b.height) {
    const r = b.width / b.height
    return r < 0.65 ? 'storia' : r < 0.9 ? 'verticale' : r > 1.3 ? 'orizzontale' : 'quadrato'
  }
  return undefined
}

/** Layout senza foto che un modello sceglie quando non sa cosa scegliere. */
const PLAIN = new Set(['eroe', 'scheda'])
/** Layout che una foto arricchisce anche se non la richiedono. */
const PHOTO_FRIENDLY = new Set(['bento', 'tipografico', 'manifesto', 'rivista', 'eroe'])
/** Layout che vivono di sola tipografia o di arte generativa: la foto non va forzata. */
const NO_PHOTO = new Set(['gigante', 'citazione', 'numeri', 'elenco', 'arte', 'manuale'])

/** Cosa cercare negli archivi: la sostanza (sottotitolo, testo), non il titolo poetico. */
function photoQuery(b: Partial<ComposeBoard>) {
  const c = b.content ?? ({} as ComposeBoard['content'])
  return String(c.subtitle || c.body || c.eyebrow || c.title || '').split(/[.!?]/)[0].slice(0, 90)
}

function photoPrompt(b: Partial<ComposeBoard>, styleLabel: string) {
  const c = b.content ?? ({} as ComposeBoard['content'])
  // prima la sostanza (chi è, cosa offre), poi il titolo: i titoli sono spesso poetici ("Notte Etiope" ≠ cielo stellato)
  const subject = [c.brand, c.subtitle, c.body, c.eyebrow, c.title].filter(Boolean).join('. ').slice(0, 240)
  return `Product and lifestyle photograph for: ${subject}. Editorial ${styleLabel.toLowerCase()} mood, real objects and materials from the subject, natural light, clean composition with negative space, high detail, photorealistic, no text, no letters, no logo`
}

export interface NormalizeOpts { /** l'utente ha chiesto niente foto */ noPhoto?: boolean; /** aggiungere una foto se manca (spento: dava risultati casuali) */ autoPhoto?: boolean }

export function normalizeBoard(input: Partial<ComposeBoard>, opts: NormalizeOpts = {}): ComposeBoard {
  const b: Partial<ComposeBoard> = { ...input, content: { ...(input.content ?? { title: '' }) } }
  const content = b.content!
  if (!content.title) content.title = content.subtitle || content.brand || b.name || 'Senza titolo'

  const style = match(STYLES, b.style, STYLE_ALIASES) ?? STYLES.find(s => s.id === 'editoriale') ?? STYLES[0]
  b.style = style.id
  const fmt = formatOf(b)
  if (fmt) b.format = fmt
  let layout = match(LAYOUTS, b.layout, LAYOUT_ALIASES)

  const hasImage = !!(content.image?.url || content.image?.prompt || content.image?.query)
  // niente foto aggiunte d'ufficio: scelte per parole chiave risultano casuali. Solo se le chiede chi scrive.
  const wantsPhoto = !!opts.autoPhoto && !opts.noPhoto && !NO_PHOTO.has(layout?.id ?? '')
  if (!hasImage && wantsPhoto) {
    // un layout neutro (o sconosciuto) diventa fotografico: copertina per i formati alti, diviso per gli altri
    if (!layout || PLAIN.has(layout.id)) {
      // foto a tutto campo e titolo grande: la soluzione più pulita in ogni formato
      layout = LAYOUTS.find(l => l.id === 'copertina')
    }
    if (layout && (layout.needsImage || PHOTO_FRIENDLY.has(layout.id)))
      content.image = { ...(content.image ?? {}), query: photoQuery(b), prompt: photoPrompt(b, style.label) }
  }
  b.layout = (layout ?? LAYOUTS[0]).id
  // un layout fotografico senza foto e senza possibilità di generarla: si torna a uno tipografico
  if (LAYOUTS.find(l => l.id === b.layout)?.needsImage && !content.image?.url && !content.image?.prompt && !content.image?.query) b.layout = 'eroe'

  if (Array.isArray(b.decor)) b.decor = b.decor.map(d => norm(d)).filter((d): d is DecorId => (DECOR_IDS as string[]).includes(d))
  if (!b.density || !['essenziale', 'ricco', 'massimo'].includes(b.density)) b.density = 'ricco'
  if (b.align && b.align !== 'left' && b.align !== 'center') delete b.align
  return b as ComposeBoard
}

/** Accetta anche risposte mal formate: una tavola sola, o tavole dentro "board"/"design". */
export function normalizeBoards(payload: unknown, opts: NormalizeOpts = {}): ComposeBoard[] {
  const p = payload as Record<string, unknown> | undefined
  const raw = Array.isArray(p?.boards) ? p!.boards : Array.isArray(p) ? p : p?.board ? [p.board] : p?.design ? [p.design] : p?.content ? [p] : []
  return (raw as Partial<ComposeBoard>[]).filter(x => x && typeof x === 'object').map(x => normalizeBoard(x, opts))
}
