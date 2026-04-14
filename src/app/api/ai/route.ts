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
  x: z.number().optional().describe("Coordinata X (0..1080). 0 = sinistra."),
  y: z.number().optional().describe("Coordinata Y (0..1080/1920). 0 = top."),
  w: z.number().optional().describe("Larghezza dell'elemento."),
  h: z.number().optional().describe("Altezza dell'elemento."),
  // Griglia 12 colonne
  column: z.number().int().min(0).max(11).optional().describe("Colonna (0-11). Usa per allineare a griglia 12-col."),
  span: z.number().int().min(1).max(12).optional().describe("Num colonne occupate (1-12)."),
  // Allineamento
  alignX: z.enum(['left', 'center', 'right']).optional().describe("Allineamento orizzontale semantico."),
  alignY: z.enum(['top', 'center', 'bottom']).optional().describe("Allineamento verticale."),
  originX: z.enum(['left', 'center', 'right']).optional().describe("Pivot point X per la trasformazione geometrica."),
  originY: z.enum(['top', 'center', 'bottom']).optional().describe("Pivot point Y per la trasformazione geometrica."),
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

export async function POST(req: Request) {
  try {
    const { messages, modelId, canvasSnapshot } = await req.json()

    // 1. ASSEMBLE CONTEXT (Cervello Logic)
    const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === 'user')
    const userQuery = typeof lastUserMsg?.content === 'string'
      ? lastUserMsg.content
      : (lastUserMsg?.content as { text?: string }[])?.[0]?.text || ''

    const ctx = await buildContext(userQuery)

    // 2. SYSTEM PROMPT (CO-STAR Framework)
    const architecture = config.get('architecture') || DEFAULT_ARCHITECTURE
    const allActiveSkills = skills.getActive()
    
    // Trigger-Based Injection: filtriamo gli Handbook di design per evitare Instruction Fatigue.
    // Le skill core (progettista, segretario, etc.) sono sempre incluse se attive.
    // Gli Handbook 'design-*' vengono iniettati solo se la query dell'utente contiene i loro trigger.
    const filteredSkills = allActiveSkills.filter(s => {
      // Se non è un handbook di design specifico, includila sempre
      if (!s.slug.startsWith('design-')) return true;
      
      // Se è un handbook, controlla se i suoi triggers sono nella query
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
        ? `\n\n---\n## Ricordo (Fatti persistenti)\n${ctx.memories.join('\n')}\n---`
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
      stopWhen: stepCountIs(10),
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
          description: 'Crea nuove tavole di design e posiziona elementi (testo, immagini, forme).',
          inputSchema: z.object({
            boards: z.array(designBoardSchema).describe(
              'Array di board. ATTENZIONE: Genera SEMPRE E SOLO 1 SINGOLA BOARD a meno che non ti venga esplicitamente chiesta una presentazione a slide o carosello. NON generare alternative/varianti.'
            ),
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
          description: 'Legge lo stato attuale del canvas. Lo snapshot degli elementi è già disponibile nella sezione "Canvas attuale" del system prompt — usa questo tool solo se hai bisogno di un refresh esplicito.',
          inputSchema: z.object({}),
          execute: async () => ({ success: true }),
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