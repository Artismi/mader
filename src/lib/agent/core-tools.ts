/**
 * Strumenti di sistema eseguiti sul server, condivisi tra la chat
 * (src/app/api/ai/route.ts) e runAgent (il guscio come servizio): incarichi,
 * idee, clienti, memoria, Instagram, preventivi e fatture, immagini.
 * Gli strumenti del canvas restano nella route: li esegue il widget per nome.
 */
import { z } from 'zod'
import { clients, editorialPosts, ideas, quotes, tasks } from '@/lib/db'
import { instagramScores, labInputSchema, runLab } from '@/lib/ai/instagram'
import { saveMemory } from '@/lib/vault'
import type { AgentToolDef } from './tools'

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

const d = <S extends z.ZodTypeAny>(def: AgentToolDef<S>) => def as unknown as AgentToolDef<z.ZodTypeAny>

export const CORE_TOOLS: AgentToolDef<z.ZodTypeAny>[] = [
        d({ name: 'createTask', group: 'lavoro', risk: 'write',
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

        d({ name: 'createRecurringEngagement', group: 'lavoro', risk: 'write',
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

        d({ name: 'readTasks', group: 'lavoro', risk: 'read',
          description: 'Legge gli incarichi dal sistema con filtri opzionali.',
          inputSchema: z.object({
            status: z.enum(['todo', 'in_progress', 'done', 'all']).optional(),
            category: z.string().optional(),
            clientId: z.string().optional(),
            limit: z.number().int().min(1).max(20).optional(),
          }),
          execute: async ({ status, category, clientId, limit }) => {
            // il filtro per cliente prima veniva ignorato: si legge più largo e si filtra qui
            const allTasks = tasks.getAll({
              status: status === 'all' ? undefined : status,
              category,
              limit: clientId ? 200 : limit || 10,
            }).filter(t => !clientId || (t.client_id ?? '').startsWith(clientId)).slice(0, limit || 10)
            if (allTasks.length === 0) return { success: true, message: 'Nessun task trovato.' }
            const formatted = allTasks.map(t => {
              const d = t.deadline ? new Date(t.deadline).toLocaleDateString('it-IT') : 'senza scadenza'
              return `[${t.id.slice(0, 8)}] ${t.title} — ${t.client_name || '—'} → ${d} [${t.status}]`
            }).join('\n')
            return { success: true, tasks: formatted }
          },
        }),

        d({ name: 'updateTaskStatus', group: 'lavoro', risk: 'write',
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

        d({ name: 'createIdea', group: 'idee', risk: 'write',
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

        d({ name: 'searchClient', group: 'clienti', risk: 'read',
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

        d({ name: 'instagramLab', group: 'social', risk: 'read',
          description: 'Strumenti del circuito Instagram (skill ig-*), calcolati davvero e in locale: scoreHooks (classifica hook, 5 controlli), beatSheet (copione → beat temporizzati), lintCaption (finestra feed 125 car., hashtag, CTA, termini di ricerca), humanize (pulizia impronte AI + flag strutturali), detect (human score 5 controlli, con compareTo mostra il delta), swipe (multiplo outlier sulla mediana per account), scoreProfile (rubrica /100), polish (humanize → detect → lintCaption in un colpo). Usalo invece di stimare a occhio.',
          inputSchema: labInputSchema,
          execute: async (input: z.infer<typeof labInputSchema>) => {
            const out = runLab(input)
            return out.ok ? { success: true, report: out.report } : { success: false, message: out.error }
          },
        }),

        d({ name: 'saveInstagramDraft', group: 'social', risk: 'write',
          description: 'Salva un contenuto Instagram approvato dall\'utente nel piano editoriale (board Editoriale) con formato, formula hook e punteggi. Usalo SOLO dopo il "sì" dell\'utente. Non pubblica nulla.',
          inputSchema: z.object({
            client: z.string().describe('ID cliente (anche i primi 8 caratteri) o nome'),
            title: z.string().describe('Titolo breve / prima riga'),
            content: z.string().describe('Copione, slide o caption finali, già umanizzati'),
            format: z.enum(['reel', 'carousel', 'story', 'post']),
            status: z.enum(['idea', 'bozza']).default('bozza'),
            scheduledAt: z.string().optional().describe('Data/ora prevista ISO, se pianificata'),
            hookFormula: z.string().optional().describe('Es. "#3 Nessuno ti dice"'),
            caption: z.string().optional().describe('Caption separata dal copione, se presente'),
          }),
          execute: async ({ client, title, content, format, status, scheduledAt, hookFormula, caption }) => {
            const key = client.toLowerCase()
            const all = clients.getAll()
            const match = all.find(c => c.id === client)
              ?? all.find(c => c.id.startsWith(client))
              ?? all.find(c => c.name.toLowerCase().includes(key))
            if (!match) return { success: false, message: `Cliente "${client}" non trovato: usa searchClient.` }

            const scores = instagramScores(caption ?? content)
            const post = editorialPosts.create({
              client_id: match.id,
              title,
              content: caption ? `${content}\n\n--- CAPTION ---\n${caption}` : content,
              channels: ['instagram'],
              editorial_status: status,
              scheduled_at: scheduledAt,
              metadata: { circuit: 'instagram', format, hookFormula, ...scores },
            })
            return {
              success: true,
              message: `Salvato nel piano editoriale di ${match.name} come "${status}" (${format}). Linter caption: ${scores.captionVerdict}, human score ${scores.humanScore} ${scores.humanVerdict}.`,
              postId: post?.id,
            }
          },
        }),

        d({ name: 'remember', group: 'memoria', risk: 'write',
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

        d({ name: 'createFinancialDocument', group: 'finanze', risk: 'write',
          // la fattura ha valore fiscale: conferma dell'utente; il preventivo resta una bozza libera
          needsApproval: (i: { type: string }) => i.type === 'fattura',
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

        d({ name: 'generateAIImage', group: 'studio', risk: 'read',
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

]
