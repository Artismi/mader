/**
 * Strumenti di sistema eseguiti sul server, condivisi tra la chat
 * (src/app/api/ai/route.ts) e runAgent (il guscio come servizio).
 * Incarichi, idee, clienti e post sono le azioni del nucleo (src/lib/kernel,
 * K1): la stessa implementazione dei pulsanti e di Ctrl+K. Qui restano gli
 * strumenti non ancora migrati: memoria, Instagram, preventivi e fatture, immagini.
 * Gli strumenti del canvas restano nella route: li esegue il widget per nome.
 */
import { z } from 'zod'
import { quotes } from '@/lib/db'
import { labInputSchema, runLab } from '@/lib/ai/instagram'
import { saveMemory } from '@/lib/vault'
import type { AgentToolDef } from './tools'
import { budget, clienteEsiste, tutti } from './checks'
import { actionTool, clientCreate, clientSearch, clientUpdate, findClient, ideaCreate, ideaDelete, ideaUpdate, postSaveInstagram, taskCreate, taskCreateRecurring, taskDelete, taskList, taskSetStatus, taskUpdate } from '@/lib/kernel'

const d = <S extends z.ZodTypeAny>(def: AgentToolDef<S>) => def as unknown as AgentToolDef<z.ZodTypeAny>

/** Azioni del nucleo come strumenti dell'agente (stessi nomi di prima: createTask, readTasks…). */
export const KERNEL_TOOLS: AgentToolDef<z.ZodTypeAny>[] = [
  taskCreate, taskCreateRecurring, taskList, taskSetStatus, taskUpdate, taskDelete,
  ideaCreate, ideaUpdate, ideaDelete,
  clientSearch, clientCreate, clientUpdate,
  postSaveInstagram,
].map(a => d(actionTool(a as never)))

export const CORE_TOOLS: AgentToolDef<z.ZodTypeAny>[] = [
  ...KERNEL_TOOLS,

        d({ name: 'instagramLab', group: 'social', risk: 'read',
          description: 'Strumenti del circuito Instagram (skill ig-*), calcolati davvero e in locale: scoreHooks (classifica hook, 5 controlli), beatSheet (copione → beat temporizzati), lintCaption (finestra feed 125 car., hashtag, CTA, termini di ricerca), humanize (pulizia impronte AI + flag strutturali), detect (human score 5 controlli, con compareTo mostra il delta), swipe (multiplo outlier sulla mediana per account), scoreProfile (rubrica /100), polish (humanize → detect → lintCaption in un colpo). Usalo invece di stimare a occhio.',
          inputSchema: labInputSchema,
          execute: async (input: z.infer<typeof labInputSchema>) => {
            const out = runLab(input)
            return out.ok ? { success: true, report: out.report } : { success: false, message: out.error }
          },
        }),

        d({ name: 'remember', group: 'memoria', risk: 'write',
          verify: ({ content, contextType, contextId }) => tutti(
            budget('content', content, 500, 5),
            contextType === 'client' ? clienteEsiste('contextId', contextId, { obbligatorio: true }) : [],
          ),
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
          verify: ({ clientId, title, items }) => tutti(
            clienteEsiste('clientId', clientId, { obbligatorio: true }),
            budget('title', title, 120, 3),
            items.length ? [] : ['items: serve almeno una voce.'],
            items.some(i => i.unitPrice <= 0) ? ["items: ogni voce deve avere un prezzo maggiore di zero (chiedi all'utente se non lo sai)."] : [],
            items.some(i => !i.desc?.trim()) ? ['items: ogni voce deve avere una descrizione.'] : [],
          ),
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
            // nome, ID corto o completo: nel documento va l'ID completo
            const client = findClient(clientId)
            if ('error' in client) return { success: false, message: client.error }

            const doc = quotes.create({
              client_id: client.id,
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
