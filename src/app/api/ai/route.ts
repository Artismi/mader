import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import * as aiSdk from 'ai'
import { convertToModelMessages, stepCountIs } from 'ai'
import { tool } from '@ai-sdk/provider-utils'
import { z } from 'zod'
import { wrapAISDK } from 'langsmith/experimental/vercel'
import { skills, config, tasks, clients, ideas, quotes } from '@/lib/db'
import { searchVault, initVaultWatcher, saveMemory } from '@/lib/vault'
import { DEFAULT_ARCHITECTURE } from '@/lib/ai/defaults'
import { buildContext } from '@/lib/ai/context'
import fs from 'fs'
import path from 'path'

export const maxDuration = 30

// Inizializza vault watcher se non già attivo
initVaultWatcher()

const taskSchema = z.object({
  title: z.string().describe("Il nome dell'incarico"),
  clientId: z.string().optional().describe('ID cliente se menzionato'),
  category: z.enum(['design', 'dev', 'bando', 'social', 'finanze', 'general']),
  deadlinePattern: z.string().describe('Data YYYY-MM-DD'),
})

const DAY_MAP: Record<string, number> = {
  lunedi: 1, lun: 1, monday: 1, martedi: 2, mar: 2, tuesday: 2,
  mercoledi: 3, mer: 3, wednesday: 3, giovedi: 4, gio: 4, thursday: 4,
  venerdi: 5, ven: 5, friday: 5, sabato: 6, sab: 6, saturday: 6,
  domenica: 0, dom: 0, sunday: 0,
}

const recurringSchema = z.object({
  title: z.string(),
  days: z.array(z.string()),
  startHour: z.number().int().min(0).max(23),
  endHour: z.number().int().min(1).max(24),
  startDate: z.string(),
  endDate: z.string(),
})

// ── Schema ausiliari canvas tools ──────────────────────────────────────────
// z.array(z.any()) non genera il campo "items" richiesto da Gemini — usiamo
// schema tipizzati con .optional() su quasi tutto per non vincolare l'AI.

const gradientStopSchema = z.object({
  offset: z.number().min(0).max(1),
  color: z.string(),
})

const canvasElementSchema = z.object({
  id: z.string().optional().describe("ID descrittivo unico (es. 'bg_photo', 'headline_main')."),
  type: z.enum(['text', 'rect', 'circle', 'image', 'path', 'line', 'procedural']),
  // Posizione e dimensione
  x: z.number().optional().describe("Coordinata RELATIVA alla tavola (0..width). Per centrare: x = width/2."),
  y: z.number().optional().describe("Coordinata RELATIVA alla tavola (0..height). Per centrare: y = height/2."),
  w: z.number().optional().describe("Larghezza dell'elemento."),
  h: z.number().optional().describe("Altezza dell'elemento."),
  // Griglia 12 colonne
  column: z.number().int().min(0).max(11).optional().describe("Colonna (0-11)."),
  span: z.number().int().min(1).max(12).optional().describe("Num colonne (1-12)."),
  // Allineamento
  alignX: z.enum(['left', 'center', 'right']).optional(),
  alignY: z.enum(['top', 'center', 'bottom']).optional(),
  originX: z.enum(['left', 'center', 'right']).optional().describe("Pivot point X. Usa 'center' per centratura matematica."),
  originY: z.enum(['top', 'center', 'bottom']).optional().describe("Pivot point Y. Usa 'center' per centratura matematica."),
  marginRight: z.number().optional(),
  marginBottom: z.number().optional(),
  // Stile comune
  color: z.string().optional().describe("Colore (hex o 'brand-*' o 'surface-*')."),
  opacity: z.number().min(0).max(1).optional().describe("Opacità (0..1)."),
  zIndex: z.number().int().optional().describe("Hierarchy: 0-2 (BG), 3-6 (Image), 7-10 (Text)."),
  stroke: z.string().optional(),
  strokeWidth: z.number().optional(),
  borderRadius: z.union([z.number(), z.string()]).optional().describe("Raggio (px o 'radius-*')."),
  gradient: z.object({
    type: z.enum(['linear', 'radial']).optional(),
    angle: z.number().optional(),
    stops: z.array(gradientStopSchema),
  }).optional(),
  // Testo
  text: z.string().optional(),
  fontFamily: z.string().optional().describe("Montserrat, Cormorant Garamond, Archivo Black, Playfair Display..."),
  fontSize: z.union([z.number(), z.string()]).optional().describe("Size (px o 'fs-*'). Headings: 80-120. Labels: 12-14."),
  fontWeight: z.union([z.string(), z.number()]).optional(),
  fontStyle: z.enum(['normal', 'italic', 'oblique']).optional(),
  textAlign: z.enum(['left', 'center', 'right', 'justify']).optional(),
  letterSpacing: z.number().optional().describe("Espansione caratteri (em). Headings: -0.02. Luxury: 0.1."),
  lineHeight: z.number().optional().describe("Ritmo verticale (es. 1.2 o 1.6)."),
  textTransform: z.enum(['none', 'uppercase', 'lowercase']).optional(),
  // Immagine
  url: z.string().optional().describe("URL generato da generateAIImage o da vault."),
  filter: z.string().optional(),
  filterIntensity: z.number().optional(),
  effects: z.array(z.string()).optional().describe("['3d', 'glass', 'clay', 'neon', 'glitch', 'riso', 'bloom', 'grain']"),
  effectProps: z.record(z.string(), z.unknown()).optional(),
  // Path / Shape
  shapeId: z.string().optional().describe("ID da SHAPE_MAP (es. 'Swiss Cross', 'Fluid Wave', 'Dense Halftone')."),
  pathData: z.string().optional(),
  scaleX: z.number().optional(),
  scaleY: z.number().optional(),
  // Procedural Generator
  proceduralType: z.enum(['halftone', 'dot_grid', 'wave_lines']).optional(),
  density: z.number().min(0).max(1).optional(),
  procRadius: z.number().optional(),
  // Line
  x1: z.number().optional(),
  y1: z.number().optional(),
  x2: z.number().optional(),
  y2: z.number().optional(),
})

const designBoardSchema = z.object({
  name: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  overwrite: z.boolean().optional(),
  elements: z.array(canvasElementSchema).optional(),
})

const canvasUpdateSchema = z.object({
  id: z.string().describe("Il name/id dell'elemento nel canvas"),
  changes: z.object({
    x: z.number().optional(),
    y: z.number().optional(),
    w: z.number().optional(),
    h: z.number().optional(),
    color: z.string().optional(),
    opacity: z.number().min(0).max(1).optional(),
    stroke: z.string().optional(),
    strokeWidth: z.number().optional(),
    borderRadius: z.number().optional(),
    text: z.string().optional(),
    fontFamily: z.string().optional(),
    fontSize: z.union([z.number(), z.string()]).optional(),
    fontWeight: z.union([z.string(), z.number()]).optional(),
    fontStyle: z.enum(['normal', 'italic', 'oblique']).optional(),
    textAlign: z.enum(['left', 'center', 'right', 'justify']).optional(),
    letterSpacing: z.number().optional(),
    lineHeight: z.number().optional(),
    textTransform: z.enum(['none', 'uppercase', 'lowercase']).optional(),
    scaleX: z.number().optional(),
    scaleY: z.number().optional(),
    effects: z.array(z.string()).optional(),
    effectProps: z.record(z.string(), z.unknown()).optional(),
  }),
})

// ── Crew pipeline helpers ──────────────────────────────────────────────────

// Trigger espliciti (frasi complete) — attivano sempre la crew
const CREW_CANVAS_EXPLICIT = [
  'crea canvas', 'genera canvas', 'crea layout', 'genera layout',
  'crea una composizione', 'genera una composizione',
  'crea post', 'genera post', 'crea grafica', 'genera grafica',
  'fai una grafica', 'fammi una grafica', 'fammi un post',
  'fai un post', 'fai un banner', 'fai un flyer', 'fai una locandina',
  'fai una copertina', 'fai un visual', 'fai del materiale',
  'mi serve una grafica', 'mi serve un post', 'mi serve un banner',
  'mi serve del materiale visivo', 'mi serve un visual',
  'prepara una grafica', 'prepara un post', 'prepara del materiale',
  'disegna layout', 'disegna un banner', 'design canvas', 'crea visual',
  'genera visual', 'crea social', 'genera social', 'crea copertina',
  'genera copertina', 'crea banner', 'genera banner', 'crea flyer',
  'genera flyer', 'crea locandina', 'crea brochure', 'genera brochure',
  'progetta un post', 'progetta una grafica', 'progetta un banner',
  'progetta qualcosa per', 'progetta un layout',
  'create canvas', 'generate canvas', 'create layout', 'generate layout',
  'create a post', 'generate a post', 'create a banner', 'create a flyer',
]

// Parole chiave visive — attivano la crew solo se abbinate a verbi d'azione
const CREW_CANVAS_VISUAL_NOUNS = [
  'instagram', 'linkedin', 'locandina', 'flyer', 'banner', 'copertina',
  'brochure', 'poster', 'volantino', 'slide', 'presentazione visiva',
]
const CREW_CANVAS_ACTION_VERBS = [
  'crea', 'genera', 'fai', 'fammi', 'prepara', 'progetta', 'disegna',
  'costruisci', 'realizza', 'sviluppa', 'make', 'create', 'generate', 'design',
]

function needsCrewPipeline(query: string): boolean {
  const q = query.toLowerCase()
  if (CREW_CANVAS_EXPLICIT.some(t => q.includes(t))) return true
  const hasVerb = CREW_CANVAS_ACTION_VERBS.some(v => q.includes(v))
  const hasNoun = CREW_CANVAS_VISUAL_NOUNS.some(n => q.includes(n))
  return hasVerb && hasNoun
}

// ── Schema pipeline detection ──────────────────────────────────────────────

const SCHEMA_TRIGGERS = [
  'schema', 'mappa concettuale', 'mappa mentale', 'mind map', 'diagramma',
  'flusso', 'flow', 'grafo', 'grafico concettuale', 'architettura visiva',
  'schema concettuale', 'mappa visiva', 'concept map', 'knowledge graph',
  'visualizza il processo', 'visualizza il sistema', 'visualizza il flusso',
  'mostrami come funziona', 'disegna il processo', 'disegna il sistema',
  'disegna la struttura', 'disegna le relazioni', 'mappa le relazioni',
  'schema del', 'schema di', 'diagramma del', 'diagramma di',
  'flusso del', 'flusso di',
]

function needsSchemaPipeline(query: string): boolean {
  const q = query.toLowerCase()
  return SCHEMA_TRIGGERS.some(t => q.includes(t))
}

// ── Office pipeline detection ──────────────────────────────────────────────
// REGOLA CRITICA: Le keyword generiche di presentazione/slide/deck NON devono
// mai triggerare il pipeline Office. Quelle vanno al canvas (createDesignBoards).
// Il pipeline Office si attiva SOLO su richieste esplicite di FILE scaricabile:
// l'utente dice esplicitamente 'file pptx', 'esporta powerpoint', 'scarica come ppt',
// 'voglio un .xlsx', 'genera file excel' — oppure usa Excel/Word/Doc senza canvas intent.

const OFFICE_PPT_TRIGGERS = [
  // Solo keyword che implicano ESPLICITAMENTE un file da scaricare, non design canvas
  'file pptx', 'file .pptx', 'esporta powerpoint', 'scarica pptx',
  'salva come powerpoint', 'esporta come ppt', 'genera file ppt',
  'powerpoint scaricabile', 'presentazione powerpoint da scaricare',
]
const OFFICE_EXCEL_TRIGGERS = [
  'excel', 'file xlsx', 'file .xlsx', 'esporta excel', 'scarica excel',
  'spreadsheet', 'foglio di calcolo', 'tabella excel',
  'genera excel', 'crea excel', 'file excel',
]
const OFFICE_WORD_TRIGGERS = [
  'documento word', 'file word', 'file .docx', 'esporta word',
  'scarica docx', 'genera word', 'crea word',
  'contratto word', 'lettera formale', 'documento formale scaricabile',
]
const ALL_OFFICE_TRIGGERS = [...OFFICE_PPT_TRIGGERS, ...OFFICE_EXCEL_TRIGGERS, ...OFFICE_WORD_TRIGGERS]

function needsOfficePipeline(query: string): boolean {
  const q = query.toLowerCase()
  return ALL_OFFICE_TRIGGERS.some(t => q.includes(t)) && !needsCrewPipeline(query)
}

function buildOfficeStreamResponse(data: {
  doc_type: string
  title: string
  download_url: string
  preview_text: string
}): Response {
  const enc = new TextEncoder()
  const tcId = `office_${Date.now()}`
  const emojiMap: Record<string, string> = { excel: '📊', word: '📄', powerpoint: '📽️' }
  const emoji = emojiMap[data.doc_type] ?? '📎'

  const chunks: Uint8Array[] = [
    enc.encode(`0:${JSON.stringify(`\n${emoji} **${data.title}** (${data.doc_type})\n${data.preview_text}\n`)}\n`),
    enc.encode(`b:${JSON.stringify({ toolCallId: tcId, toolName: 'generateOfficeDocument' })}\n`),
    enc.encode(`c:${JSON.stringify({ toolCallId: tcId, argsTextDelta: JSON.stringify({ doc_type: data.doc_type }) })}\n`),
    enc.encode(`a:${JSON.stringify({ toolCallId: tcId, result: { success: true, ...data } })}\n`),
    enc.encode(`e:${JSON.stringify({ finishReason: 'tool-calls', usage: { promptTokens: 0, completionTokens: 0 }, isContinued: false })}\n`),
    enc.encode(`d:${JSON.stringify({ finishReason: 'tool-calls', usage: { promptTokens: 0, completionTokens: 0 } })}\n`),
  ]

  return new Response(
    new ReadableStream<Uint8Array>({ start(c) { chunks.forEach(ch => c.enqueue(ch)); c.close() } }),
    { headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'X-Vercel-AI-Data-Stream': 'v1', 'Cache-Control': 'no-cache' } },
  )
}

function extractClientName(query: string, ctx: { clientVaults?: string[] }): string {
  // Try to pull client name from vault context filenames
  if (ctx.clientVaults && ctx.clientVaults.length > 0) {
    const match = ctx.clientVaults[0].match(/## Cliente:\s*(.+)/i)
    if (match) return match[1].trim()
  }
  // Fallback: look for "per [Nome]" pattern in query
  const m = query.match(/\bper\s+([A-Z][a-zA-ZÀ-ÿ\s]{1,30}?)(?:\s+(?:un|una|il|la|un'|dei|del|della|un\s)|\.|,|$)/u)
  if (m) return m[1].trim()
  return ''
}

// ── Schema → AI SDK stream response ──────────────────────────────────────────
/**
 * Costruisce una risposta AI SDK UI v1 per uno schema SVG già generato.
 * Emette un messaggio testuale di conferma + il tool call generateConceptualSchema
 * con l'SVG nel result, che il client usa per caricare lo schema nel canvas.
 */
function buildSchemaStreamResponse(data: {
  svg: string
  title: string
  layout_type: string
  node_count: number
  edge_count: number
}): Response {
  const enc = new TextEncoder()
  const tcId = `schema_${Date.now()}`

  const chunks: Uint8Array[] = [
    // Testo introduttivo
    enc.encode(`0:${JSON.stringify(`\n🗺️ **Schema generato**: ${data.title}\n${data.node_count} nodi · ${data.edge_count} connessioni · layout ${data.layout_type}\n`)}\n`),
    // Tool call begin
    enc.encode(`b:${JSON.stringify({ toolCallId: tcId, toolName: 'generateConceptualSchema' })}\n`),
    // Tool call args
    enc.encode(`c:${JSON.stringify({ toolCallId: tcId, argsTextDelta: JSON.stringify({ prompt: data.title }) })}\n`),
    // Tool result con SVG
    enc.encode(`a:${JSON.stringify({ toolCallId: tcId, result: { success: true, svg: data.svg, title: data.title, layout_type: data.layout_type, node_count: data.node_count, edge_count: data.edge_count } })}\n`),
    // Finish
    enc.encode(`e:${JSON.stringify({ finishReason: 'tool-calls', usage: { promptTokens: 0, completionTokens: 0 }, isContinued: false })}\n`),
    enc.encode(`d:${JSON.stringify({ finishReason: 'tool-calls', usage: { promptTokens: 0, completionTokens: 0 } })}\n`),
  ]

  const readable = new ReadableStream<Uint8Array>({
    start(controller) {
      chunks.forEach(c => controller.enqueue(c))
      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'X-Vercel-AI-Data-Stream': 'v1',
      'Cache-Control': 'no-cache',
    },
  })
}

// ── Crew SSE → AI SDK stream converter ───────────────────────────────────────
/**
 * Legge lo stream SSE dalla crew Python e lo converte nel formato
 * AI SDK UI v1 (data stream protocol), mostrando ogni pensiero degli agenti
 * come testo in chat. Alla fine, se ci sono boards pronti, emette il tool call
 * createDesignBoards per aggiornare il canvas senza un secondo LLM call.
 */
function buildCrewStreamResponse(
  crewSseBody: ReadableStream<Uint8Array>,
): Response {
  const enc = new TextEncoder()

  // Emette un testo nel protocollo AI SDK UI v1: `0:"<escaped>"\n`
  const textDelta = (text: string): Uint8Array =>
    enc.encode(`0:${JSON.stringify(text)}\n`)

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = crewSseBody.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finalBoards: unknown[] | null = null
      let finalScore = 0
      let finalSuggestions: string[] = []
      let hasClarification = false
      let finalSchema: { svg: string; title: string; layout_type: string; node_count: number; edge_count: number } | null = null
      let finalOffice: { doc_type: string; title: string; download_url: string; preview_text: string } | null = null

      try {
        // Legge il body SSE dalla crew Python
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          // Processa righe complete
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ') || line === 'data: ') continue
            if (line.startsWith(': ')) continue  // keepalive comment

            let event: Record<string, unknown>
            try { event = JSON.parse(line.slice(6)) } catch { continue }

            switch (event.type) {

              case 'crew_start': {
                const attempt = event.attempt as number ?? 1
                const header = attempt === 1
                  ? `\n🧠 **Pipeline Multi-Agente avviato** — 5 agenti in sequenza\n\n`
                  : `\n🔄 **Retry ${attempt}** — il Critic ha richiesto revisioni\n\n`
                controller.enqueue(textDelta(header))
                break
              }

              case 'step': {
                const thought = event.thought as string | undefined
                const log = event.log as string | undefined
                const toolName = event.tool as string | undefined
                const toolInput = event.tool_input as string | undefined

                // Nuovo formato strutturato per UI Accordion
                let stepContent = `<agent_step agent="${agent}" emoji="${emoji}">\n`
                if (thought) stepContent += `[THOUGHT]\n${thought}\n[/THOUGHT]\n`
                if (log) stepContent += `[LOG]\n${log}\n[/LOG]\n`
                if (toolName) stepContent += `[TOOL name="${toolName}"]${toolInput || ''}[/TOOL]\n`
                stepContent += `</agent_step>\n`
                
                controller.enqueue(textDelta(stepContent))
                break
              }

              case 'task_done': {
                const agent = event.agent as string
                const step = event.step as number
                const total = event.total as number
                controller.enqueue(textDelta(`✓ **${agent}** completato (${step}/${total})\n\n`))
                break
              }

              case 'retry': {
                const score = event.score as number ?? 0
                const issues = (event.issues as string[] ?? []).slice(0, 3)
                controller.enqueue(textDelta(`\n⚠️ Score: **${score}/100** — sotto soglia. Issues:\n`))
                issues.forEach(issue => controller.enqueue(textDelta(`- ${issue}\n`)))
                controller.enqueue(textDelta('\n'))
                break
              }

              case 'clarification_needed': {
                hasClarification = true
                const questions = event.questions as string[] ?? []
                controller.enqueue(textDelta(`\n❓ Ho bisogno di qualche informazione prima di procedere:\n\n`))
                questions.forEach((q, i) => controller.enqueue(textDelta(`**${i + 1}.** ${q}\n`)))
                break
              }

              case 'done': {
                const boards = event.boards as unknown[] ?? []
                finalBoards = boards.length > 0 ? boards : null
                finalScore = event.score as number ?? 0
                finalSuggestions = event.suggestions as string[] ?? []
                const approved = event.approved as boolean ?? false
                const scoreEmoji = finalScore >= 75 ? '✅' : '⚠️'
                const warning = event.warning as string | undefined

                controller.enqueue(textDelta(
                  `\n${scoreEmoji} **Pipeline completato** — qualità: ${finalScore}/100\n`
                ))
                if (finalSuggestions.length > 0) {
                  controller.enqueue(textDelta(`💡 ${finalSuggestions[0]}\n`))
                }
                if (warning) {
                  controller.enqueue(textDelta(`⚠️ ${warning}\n`))
                }
                if (!approved && finalBoards) {
                  controller.enqueue(textDelta(`\nCanvas consegnato nonostante lo score basso — puoi modificarlo manualmente.\n`))
                }
                break
              }

              case 'schema_ready': {
                finalSchema = {
                  svg: event.svg as string,
                  title: event.title as string,
                  layout_type: event.layout_type as string,
                  node_count: event.node_count as number,
                  edge_count: event.edge_count as number,
                }
                controller.enqueue(textDelta(
                  `\n🗺️ **Schema generato**: ${finalSchema.title}\n${finalSchema.node_count} nodi · ${finalSchema.edge_count} connessioni · layout ${finalSchema.layout_type}\n`
                ))
                break
              }

              case 'office_ready': {
                const emojiMap: Record<string, string> = { excel: '📊', word: '📄', powerpoint: '📽️' }
                finalOffice = {
                  doc_type: event.doc_type as string,
                  title: event.title as string,
                  download_url: event.download_url as string,
                  preview_text: event.preview_text as string,
                }
                const officeEmoji = emojiMap[finalOffice.doc_type] ?? '📎'
                controller.enqueue(textDelta(
                  `\n${officeEmoji} **${finalOffice.title}** (${finalOffice.doc_type}) pronto — ${finalOffice.preview_text}\n`
                ))
                break
              }

              case 'checkpoint': {
                const cpId = event.checkpoint_id as string
                const msg = event.message as string
                const cpBoards = event.boards as unknown[] ?? []
                
                controller.enqueue(textDelta(`\n⏸️ **Checkpoint raggiunto**: ${cpId}\n${msg}\n`))
                controller.enqueue(textDelta(`Il sistema è in attesa del tuo feedback o di un eventuale spostamento manuale degli elementi.\n`))
                
                // Opzionalmente inviamo i board correnti per aggiornare la UI se necessario
                if (cpBoards.length > 0) {
                    const tcId = `checkpoint_${Date.now()}`
                    controller.enqueue(enc.encode(`b:${JSON.stringify({ toolCallId: tcId, toolName: 'createDesignBoards' })}\n`))
                    controller.enqueue(enc.encode(`c:${JSON.stringify({ toolCallId: tcId, argsTextDelta: JSON.stringify({ boards: cpBoards }) })}\n`))
                    controller.enqueue(enc.encode(`a:${JSON.stringify({ toolCallId: tcId, result: { success: true, checkpoint_id: cpId } })}\n`))
                }
                break
              }

              case 'warning':
                controller.enqueue(textDelta(`\n⚠️ ${event.message as string}\n`))
                break

              case 'error':
                controller.enqueue(textDelta(`\n❌ Errore crew: ${event.message as string}\n`))
                break
            }
          }
        }
      } finally {
        reader.releaseLock()
      }

      // ── Fine stream: emette tool call o chiusura ─────────────────────────
      if (finalBoards && finalBoards.length > 0 && !hasClarification) {
        // Bypass LLM bridge: costruiamo il tool call direttamente nel stream
        // senza una seconda chiamata a Gemini. I boards sono già pronti.
        const tcId = `crew_${Date.now()}`
        const argsStr = JSON.stringify({ boards: finalBoards })

        // Tool call begin
        controller.enqueue(enc.encode(`b:${JSON.stringify({ toolCallId: tcId, toolName: 'createDesignBoards' })}\n`))
        // Tool call args delta (tutto in un chunk)
        controller.enqueue(enc.encode(`c:${JSON.stringify({ toolCallId: tcId, argsTextDelta: argsStr })}\n`))
        // Tool result
        controller.enqueue(enc.encode(`a:${JSON.stringify({
          toolCallId: tcId,
          result: { success: true, rendered: finalBoards.length, score: finalScore },
        })}\n`))

        // Finish step con tool-calls
        controller.enqueue(enc.encode(
          `e:${JSON.stringify({ finishReason: 'tool-calls', usage: { promptTokens: 0, completionTokens: 0 }, isContinued: false })}\n`
        ))
        controller.enqueue(enc.encode(
          `d:${JSON.stringify({ finishReason: 'tool-calls', usage: { promptTokens: 0, completionTokens: 0 } })}\n`
        ))
      } else if (finalOffice && !hasClarification) {
        const tcId = `office_${Date.now()}`
        controller.enqueue(enc.encode(`b:${JSON.stringify({ toolCallId: tcId, toolName: 'generateOfficeDocument' })}\n`))
        controller.enqueue(enc.encode(`c:${JSON.stringify({ toolCallId: tcId, argsTextDelta: JSON.stringify({ doc_type: finalOffice.doc_type }) })}\n`))
        controller.enqueue(enc.encode(`a:${JSON.stringify({ toolCallId: tcId, result: { success: true, ...finalOffice } })}\n`))
        controller.enqueue(enc.encode(
          `e:${JSON.stringify({ finishReason: 'tool-calls', usage: { promptTokens: 0, completionTokens: 0 }, isContinued: false })}\n`
        ))
        controller.enqueue(enc.encode(
          `d:${JSON.stringify({ finishReason: 'tool-calls', usage: { promptTokens: 0, completionTokens: 0 } })}\n`
        ))
      } else if (finalSchema && !hasClarification) {
        // Schema branch: emette tool call direttamente senza secondo LLM call
        const tcId = `schema_${Date.now()}`
        controller.enqueue(enc.encode(`b:${JSON.stringify({ toolCallId: tcId, toolName: 'generateConceptualSchema' })}\n`))
        controller.enqueue(enc.encode(`c:${JSON.stringify({ toolCallId: tcId, argsTextDelta: JSON.stringify({ prompt: finalSchema.title }) })}\n`))
        controller.enqueue(enc.encode(`a:${JSON.stringify({
          toolCallId: tcId,
          result: {
            success: true,
            svg: finalSchema.svg,
            title: finalSchema.title,
            layout_type: finalSchema.layout_type,
            node_count: finalSchema.node_count,
            edge_count: finalSchema.edge_count,
          },
        })}\n`))
        controller.enqueue(enc.encode(
          `e:${JSON.stringify({ finishReason: 'tool-calls', usage: { promptTokens: 0, completionTokens: 0 }, isContinued: false })}\n`
        ))
        controller.enqueue(enc.encode(
          `d:${JSON.stringify({ finishReason: 'tool-calls', usage: { promptTokens: 0, completionTokens: 0 } })}\n`
        ))
      } else {
        // Solo testo (clarification o errore senza boards)
        controller.enqueue(enc.encode(
          `e:${JSON.stringify({ finishReason: 'stop', usage: { promptTokens: 0, completionTokens: 0 }, isContinued: false })}\n`
        ))
        controller.enqueue(enc.encode(
          `d:${JSON.stringify({ finishReason: 'stop', usage: { promptTokens: 0, completionTokens: 0 } })}\n`
        ))
      }

      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'X-Vercel-AI-Data-Stream': 'v1',
      'Cache-Control': 'no-cache',
    },
  })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { messages, modelId, canvasSnapshot, clientOverride, extraVaultFiles, action } = body

    // ── RESUME ACTION ────────────────────────────────────────────────────────
    if (action === 'resume') {
        const lockPath = path.join(process.cwd(), 'crew', 'checkpoint.lock')
        const snapshotPath = path.join(process.cwd(), 'crew', 'checkpoint.snapshot.json')
        
        if (body.canvasSnapshot) {
            fs.writeFileSync(snapshotPath, JSON.stringify({
                snapshot: body.canvasSnapshot,
                screenshot: body.screenshot || null,
                timestamp: Date.now()
            }))
        }

        if (fs.existsSync(lockPath)) {
            fs.unlinkSync(lockPath)
            return Response.json({ success: true, message: 'Ripresa esecuzione inviata.' })
        }
        return Response.json({ success: false, message: 'Nessun checkpoint attivo trovato.' }, { status: 404 })
    }
    // ── END RESUME ACTION ────────────────────────────────────────────────────

    // 1. ASSEMBLE CONTEXT (Cervello Logic)
    const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === 'user')
    const userQuery = typeof lastUserMsg?.content === 'string'
      ? lastUserMsg.content
      : (lastUserMsg?.content as { text?: string }[])?.[0]?.text || ''

    const ctx = await buildContext(userQuery, {
      clientOverride: clientOverride ?? undefined,
      extraFiles: Array.isArray(extraVaultFiles) ? extraVaultFiles : undefined,
    })

    // ── SCHEMA DISPATCHER ────────────────────────────────────────────────────
    // Richieste di schema/mappa concettuale → crew /schema (via Next.js API).
    // Priorità: viene valutato PRIMA del canvas crew, perché non richiede crew completa.
    if (needsSchemaPipeline(userQuery) && !needsCrewPipeline(userQuery)) {
      try {
        const schemaRes = await fetch('http://127.0.0.1:8765/schema', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: userQuery, context: ctx }),
          signal: AbortSignal.timeout(90_000),
        })
        if (schemaRes.ok) {
          const data = await schemaRes.json()
          if (data.schema_ready && data.svg) {
            return buildSchemaStreamResponse(data)
          }
        }
      } catch {
        // Crew unavailable → fall through to single agent (che ha il tool generateConceptualSchema)
      }
    }
    // ── END SCHEMA DISPATCHER ────────────────────────────────────────────────

    // ── OFFICE DISPATCHER ────────────────────────────────────────────────────
    // Richieste Excel/Word/PowerPoint → Next.js /api/ai/office (genera il file).
    if (needsOfficePipeline(userQuery)) {
      try {
        const officeRes = await fetch('http://127.0.0.1:3000/api/ai/office', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: userQuery, doc_type: 'auto' }),
          signal: AbortSignal.timeout(120_000),
        })
        if (officeRes.ok) {
          const data = await officeRes.json()
          if (data.download_url) {
            return buildOfficeStreamResponse(data)
          }
        }
      } catch {
        // Office unavailable → fall through to single agent
      }
    }
    // ── END OFFICE DISPATCHER ─────────────────────────────────────────────────

    // ── CREW DISPATCHER (streaming) ──────────────────────────────────────────
    if (needsCrewPipeline(userQuery)) {
      try {
        const clientName = extractClientName(userQuery, ctx)
        const crewRes = await fetch('http://127.0.0.1:8765/canvas/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ brief: userQuery, context: ctx, client_name: clientName }),
          signal: AbortSignal.timeout(240_000),
        })
        if (crewRes.ok && crewRes.body) {
          return buildCrewStreamResponse(crewRes.body)
        }
      } catch {
        // Crew unavailable → fall through to single agent
      }
    }
    // ── END CREW DISPATCHER ──────────────────────────────────────────────────

    // 2. SYSTEM PROMPT (CO-STAR Framework)
    const architecture = config.get('architecture') || DEFAULT_ARCHITECTURE
    const allActiveSkills = skills.getActive()
    
    // Trigger-Based Injection: filtriamo gli Handbook di design per evitare Instruction Fatigue.
    // Ma se la query è creativa, forziamo l'inclusione degli Handbook DIC per garantire la qualità.
    const creativeKeywords = ['post', 'design', 'canvas', 'poster', 'slide', 'immagine', 'grafica', 'logo', 'layout', 'brand'];
    const isCreativeQuery = creativeKeywords.some(k => userQuery.toLowerCase().includes(k));

    const filteredSkills = allActiveSkills.filter(s => {
      // Le skill core (non handbook, non DIC operativi) sono sempre incluse
      if (!s.slug.startsWith('design-') && !s.slug.startsWith('dic-skill-') && s.slug !== 'dic-tribunale') return true;
      
      // Se è una query creativa, gli Handbook DIC sono fondamentali
      if (isCreativeQuery) return true;

      // Altrimenti seguiamo i trigger specifici
      const triggers = s.triggers || [];
      const hasTrigger = triggers.some(t => userQuery.toLowerCase().includes(t.toLowerCase()));
      return hasTrigger;
    })

    const skillsBlock = filteredSkills.map(s => s.content).filter(Boolean).join('\n\n---\n\n')

    const SYSTEM_PROMPT = [
      architecture,
      ctx.snapshot,
      canvasSnapshot
        ? `\n\n---\n${canvasSnapshot}\n\nUsa gli ID sopra esatti in updateCanvasElements. Per modifiche chirurgiche NON usare clearBoard.\n---`
        : '',
      '## Skill disponibili — istruzioni operative',
      skillsBlock,
      ctx.clientVaults.length > 0
        ? `\n\n---\n${ctx.clientVaults.join('\n\n---\n')}\n---`
        : '',
      ctx.activatedFiles.length > 0
        ? `\n\n---\n${ctx.activatedFiles.join('\n\n---\n')}\n---`
        : '',
      ctx.ragChunks.length > 0
        ? `\n\n---\n## Dal vault (Riferimenti rilevanti)\n${ctx.ragChunks.join('\n\n---\n')}\n---`
        : '',
      ctx.memories.length > 0
        ? `\n\n---\n## Ricordo (Fatti persistenti)\n${ctx.memories.map(m => m.content).join('\n')}\n---`
        : '',
    ].filter(Boolean).join('\n\n')
    const modelMessages = await convertToModelMessages(messages)

    const model = modelId === 'gemini'
      ? google('gemini-2.5-flash')
      : anthropic('claude-3-5-sonnet-latest')

    // LangSmith: wrappa streamText dentro il handler così le env vars sono già caricate
    const { streamText: tracedStreamText } = wrapAISDK(aiSdk)

    const result = tracedStreamText({
      model,
      system: SYSTEM_PROMPT,
      messages: modelMessages,
      maxSteps: 10, // Permette loop multipli Thought -> Tool -> Thought
      // Phoenix: genera OpenTelemetry spans catturati da instrumentation.ts
      experimental_telemetry: {
        isEnabled: true,
        functionId: 'canvas-ai-agent',
        metadata: {
          modelId: modelId ?? 'anthropic',
          hasCanvas: !!canvasSnapshot,
        },
      },
      tools: {
        createTask: tool({
          description: 'Crea un nuovo incarico nel sistema.',
          inputSchema: taskSchema,
          execute: async ({ title, category, deadlinePattern, clientId }: z.infer<typeof taskSchema>) => {
            let parsedDate = new Date()
            parsedDate.setDate(parsedDate.getDate() + 1)
            try {
              const d = new Date(deadlinePattern)
              if (!isNaN(d.getTime())) parsedDate = d
            } catch { /* usa default */ }

            tasks.create({
              client_id: clientId,
              title,
              type: category,
              category: 'task',
              status: 'todo',
              deadline: parsedDate.toISOString(),
            })

            return {
              success: true,
              message: `Incarico "${title}" creato per il ${parsedDate.toLocaleDateString('it-IT')}.`,
            }
          },
        }),

        createRecurringEngagement: tool({
          description: 'Crea slot ricorrenti per impegni fissi settimanali.',
          inputSchema: recurringSchema,
          execute: async ({ title, days, startHour, endHour, startDate, endDate }: z.infer<typeof recurringSchema>) => {
            const targetDays = days
              .map(d => DAY_MAP[d.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')])
              .filter((d): d is number => d !== undefined)

            if (targetDays.length === 0) return { success: false, message: 'Giorni non riconosciuti' }

            const durationMinutes = (endHour - startHour) * 60
            const start = new Date(startDate)
            const end = new Date(endDate)
            let count = 0

            for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
              if (targetDays.includes(d.getDay())) {
                const deadline = new Date(d)
                deadline.setHours(startHour, 0, 0, 0)
                tasks.create({
                  title,
                  type: 'general',
                  category: 'engagement',
                  status: 'todo',
                  deadline: deadline.toISOString(),
                  duration_minutes: durationMinutes,
                })
                count++
              }
            }

            return {
              success: true,
              message: `Creati ${count} slot "${title}" (${startHour}:00–${endHour}:00) dal ${startDate} al ${endDate}.`,
            }
          },
        }),

        readTasks: tool({
          description: 'Legge gli incarichi dal sistema con filtri opzionali.',
          inputSchema: z.object({
            status: z.enum(['todo', 'in_progress', 'done', 'all']).optional(),
            category: z.string().optional(),
            clientId: z.string().optional(),
            limit: z.number().int().min(1).max(20).optional(),
          }),
          execute: async ({ status, category, clientId, limit }) => {
            const allTasks = tasks.getAll({
              status: status === 'all' ? undefined : status,
              category,
              limit: limit || 10,
            })
            if (allTasks.length === 0) return { success: true, message: 'Nessun task trovato.' }
            const formatted = allTasks.map(t => {
              const d = t.deadline ? new Date(t.deadline).toLocaleDateString('it-IT') : 'senza scadenza'
              return `[${t.id.slice(0, 8)}] ${t.title} — ${t.client_name || '—'} → ${d} [${t.status}]`
            }).join('\n')
            return { success: true, tasks: formatted }
          },
        }),

        updateTaskStatus: tool({
          description: 'Aggiorna lo stato di un incarico esistente.',
          inputSchema: z.object({
            taskId: z.string().describe('ID parziale del task (almeno 8 caratteri)'),
            newStatus: z.enum(['todo', 'in_progress', 'done']),
          }),
          execute: async ({ taskId, newStatus }) => {
            const allTasks = tasks.getAll({ limit: 100 })
            const match = allTasks.find(t => t.id.startsWith(taskId))
            if (!match) return { success: false, message: `Task ${taskId} non trovato.` }
            tasks.update(match.id, { status: newStatus })
            return { success: true, message: `Task "${match.title}" aggiornato a ${newStatus}.` }
          },
        }),

        createIdea: tool({
          description: 'Cattura una nuova idea creativa nel sistema.',
          inputSchema: z.object({
            text: z.string().describe("Il contenuto dell'idea"),
            title: z.string().optional(),
            clientId: z.string().optional(),
            platforms: z.array(z.string()).optional(),
          }),
          execute: async ({ text, title, clientId, platforms }) => {
            const idea = ideas.create({
              client_id: clientId,
              text,
              title,
              platforms: platforms || [],
              idea_status: 'nuova',
              assigned: false,
              output_links: []
            })
            return { success: true, message: `Idea "${title || text.slice(0, 20)}" salvata con successo.`, id: idea.id }
          }
        }),

        searchClient: tool({
          description: 'Cerca un cliente nel vault per recuperare dettagli brand o progetto.',
          inputSchema: z.object({ name: z.string() }),
          execute: async ({ name }) => {
            const allClients = clients.getAll()
            const matches = allClients.filter(c => c.name.toLowerCase().includes(name.toLowerCase()))
            if (matches.length === 0) return { success: false, message: `Nessun cliente trovato per "${name}"` }
            return {
              success: true,
              clients: matches.map(c => `[${c.id.slice(0, 8)}] ${c.name} (${c.sector || 'settore non specificato'})`).join('\n')
            }
          }
        }),

        remember: tool({
          description: 'Memorizza un fatto persistente o una preferenza del cliente nel sistema (Memory).',
          inputSchema: z.object({
            content: z.string().describe('Il fatto da ricordare'),
            contextType: z.enum(['client', 'global']).default('global'),
            contextId: z.string().optional(),
          }),
          execute: async ({ content, contextType, contextId }) => {
            await saveMemory(content, contextType, contextId)
            return { success: true, message: `Ricordato: "${content}"` }
          },
        }),

        createFinancialDocument: tool({
          description: 'Crea un preventivo o una fattura nel sistema basandosi sui dettagli forniti dal cliente o discussi.',
          inputSchema: z.object({
            type: z.enum(['preventivo', 'fattura']),
            clientId: z.string().describe('ID del cliente'),
            title: z.string().describe('Oggetto del documento (es. "Sviluppo sito web")'),
            items: z.array(z.object({
              desc: z.string(),
              qty: z.number().min(1).default(1),
              unitPrice: z.number().min(0)
            })).describe('Elenco delle voci di spesa dettagliate'),
            notes: z.string().optional().describe('Note aggiuntive, scadenze o termini di pagamento'),
          }),
          execute: async ({ type, clientId, title, items, notes }) => {
            const client = clients.getById(clientId)
            if (!client) return { success: false, message: 'Cliente non trovato. Usa searchClient per trovare l\'ID corretto.' }
            
            const doc = quotes.create({
              client_id: clientId,
              client_name: client.name,
              title,
              number: quotes.nextNumber(type),
              type,
              status: 'bozza',
              items: items.map(i => ({ desc: i.desc, qty: i.qty, unit_price: i.unitPrice })),
              total: items.reduce((s, i) => s + i.qty * i.unitPrice, 0),
              notes,
              issued_at: new Date().toISOString().split('T')[0],
            })
            
            return {
              success: true,
              message: `${type === 'preventivo' ? 'Preventivo' : 'Fattura'} #${doc.number} per "${title}" creato e salvato in Bozza.`,
              id: doc.id
            }
          }
        }),

        generateAIImage: tool({
          description: 'Genera un\'immagine tramite prompt testuale fotografico o illustrazione. Restituisce un URL da usare nel tool createDesignBoards o updateCanvasElements.',
          inputSchema: z.object({
            prompt: z.string().describe('Il prompt in inglese dettagliato per l\'immagine (soggetto + stile + illuminazione + mood).')
          }),
          execute: async ({ prompt }) => {
            const seed = Math.floor(Math.random() * 999999999);
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?seed=${seed}&width=1080&height=1080&nologo=true`;
            return {
              success: true,
              imageUrl: url,
            };
          }
        }),

        // Canvas tools: hanno execute stub per permettere il chaining multi-step
        // (stopWhen: stepCountIs). L'esecuzione reale avviene client-side via handleAICommand;
        // il server ritorna solo una conferma immediata.
        createDesignBoards: tool({
          description: `Crea tavole di design canvas con elementi visivi posizionati. Ogni board deve essere visivamente completa e ricca.

DIMENSIONI STANDARD — scegli in base al contenuto:
- Social Square: width:1080, height:1080
- Story/Reel/Portrait: width:1080, height:1920
- Slide Presentazione (landscape): width:1920, height:1080
- Banner orizzontale: width:1200, height:628
- A4 Verticale: width:794, height:1123

REGOLA FONDAMENTALE — ogni board DEVE avere OBBLIGATORIAMENTE:
1) Background rect: { type:"rect", x:0, y:0, w:<boardWidth>, h:<boardHeight>, color:"<hex>", zIndex:0 }
2) Almeno 4-8 elementi visibili (titolo, sottotitolo, forme decorative, etc.)
3) Colori testo sempre contrastanti col background (testo chiaro su sfondo scuro, scuro su chiaro)

TIPI ELEMENTO — usa ESATTAMENTE questi valori stringa:
"rect" | "text" | "circle" | "image" | "path" | "line" | "procedural"
NON usare: "rectangle", "textbox", "shape", "background", "square" — verrebbero ignorati.

FONT SIZE — valori numerici puri (NO "px", NO stringhe con unità):
- Titolo hero su 1080px: fontSize:80-120
- Titolo slide 1920px: fontSize:60-80
- Sottotitolo: fontSize:36-48
- Body text: fontSize:24-32
- Caption/label: fontSize:16-20
- MINIMO ASSOLUTO: fontSize:16

COORDINATE — pixel assoluti, NO frazioni, NO percentuali:
- x e y partono da 0 (bordo superiore sinistro)
- Su board 1080x1080: x valido 0..1080, y valido 0..1080
- Su board 1920x1080: x valido 0..1920, y valido 0..1080
- Elementi full-width: x:0, w:<boardWidth>

QUANTITÀ BOARD:
1) Default: 1 sola board per richieste singole (social, poster, logo, banner)
2) Multiple board SOLO se richiesto esplicitamente: presentazioni, deck, caroselli, slide
3) Per "presentazione N slide" → genera esattamente N board in sequenza narrativa
4) NON generare varianti/alternative — una sola versione per richiesta`,
          inputSchema: z.object({
            boards: z.array(designBoardSchema),
          }),
          execute: async ({ boards }) => ({
            success: true,
            rendered: boards?.length ?? 0,
          }),
        }),

        updateCanvasElements: tool({
          description: 'Modifica coordinate, testi, font, colori ecc. in elementi esistenti del canvas.',
          inputSchema: z.object({
            updates: z.array(canvasUpdateSchema).describe(
              'Array di update. Ogni entry ha "id" (il name dell\'elemento nel canvas) e "changes" con le proprietà da modificare.'
            ),
          }),
          execute: async ({ updates }) => ({
            success: true,
            updated: updates?.length ?? 0,
          }),
        }),

        clearBoard: tool({
          description: 'Elimina tutti gli elementi e svuota le tavole (o l\'intera area visiva).',
          inputSchema: z.object({
            boardName: z.string().optional()
          }),
          execute: async () => ({ success: true }),
        }),

        deleteElements: tool({
          description: 'Elimina solo gli elementi specificati dal canvas (usando i loro ID).',
          inputSchema: z.object({
            ids: z.array(z.string())
          }),
          execute: async ({ ids }) => ({ success: true, deleted: ids?.length ?? 0 }),
        }),

        getCanvasState: tool({
          description: 'Legge lo stato attuale del canvas con tutti gli elementi (ID, tipo, posizione, testo, colore). Usa questo tool per vedere cosa c\'è sul canvas prima di fare modifiche.',
          inputSchema: z.object({}),
          execute: async () => ({
            success: true,
            snapshot: canvasSnapshot || 'Canvas vuoto — nessun elemento presente.',
          }),
        }),

        generateConceptualSchema: tool({
          description: 'Genera uno schema concettuale visivo strutturato (nodi, connessioni, gruppi, etichette) a partire da una descrizione testuale, e lo carica nel canvas come SVG editabile con layer nominati.',
          inputSchema: z.object({
            prompt: z.string().describe('Descrizione dello schema da generare. Può essere un concetto, un sistema, un processo, una mappa mentale, un flusso.'),
          }),
          execute: async ({ prompt }) => {
            try {
              const res = await fetch('http://127.0.0.1:3000/api/ai/schema', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
              })
              if (!res.ok) throw new Error(`Schema API error: ${res.status}`)
              const data = await res.json()
              return {
                success: true,
                svg: data.svg,
                title: data.title,
                layout_type: data.layout_type,
                node_count: data.node_count,
                edge_count: data.edge_count,
              }
            } catch (err) {
              return { success: false, error: String(err) }
            }
          },
        }),

        generateOfficeDocument: tool({
          description: [
            'Genera un file Office SCARICABILE (Excel .xlsx, Word .docx o PowerPoint .pptx).',
            'USA QUESTO TOOL SOLO quando l\'utente chiede ESPLICITAMENTE un file da scaricare:',
            '  - "file excel", "esporta xlsx", "foglio di calcolo excel", "tabella excel"',
            '  - "file word", "documento word scaricabile", "contratto in word"',
            '  - "file pptx", "esporta powerpoint", "scarica come ppt"',
            'NON USARE per: "presentazione", "slide", "deck", "pitch", "carosello", "poster", "grafica".',
            'Queste richieste vanno OBBLIGATORIAMENTE al tool createDesignBoards (canvas visuale).',
            'REGOLA D\'ORO: se l\'utente non ha detto esplicitamente il formato file (.xlsx/.docx/.pptx),',
            'usa SEMPRE createDesignBoards per creare la presentazione nel canvas.',
          ].join(' '),
          inputSchema: z.object({
            prompt: z.string().describe('Descrizione del contenuto del documento.'),
            doc_type: z.enum(['excel', 'word', 'powerpoint', 'auto']).default('auto').describe('Tipo di documento: excel=foglio calcolo, word=documento testo, powerpoint=file .pptx SCARICABILE.'),
          }),
          execute: async ({ prompt, doc_type }) => {
            try {
              const res = await fetch('http://127.0.0.1:3000/api/ai/office', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, doc_type }),
              })
              if (!res.ok) throw new Error(`Office API error: ${res.status}`)
              const data = await res.json()
              return { success: true, ...data }
            } catch (err) {
              return { success: false, error: String(err) }
            }
          },
        }),
      },
    })

    return result.toUIMessageStreamResponse()

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}