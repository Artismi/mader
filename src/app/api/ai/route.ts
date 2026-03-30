import { anthropic } from '@ai-sdk/anthropic';
import { streamText, convertToModelMessages } from 'ai';
import { tool } from '@ai-sdk/provider-utils';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createNotionTask } from '@/lib/notion/client';
import { UsageService } from '@/lib/api/usage';

// Permettiamo streaming fino a 30s
export const maxDuration = 30;

const taskSchema = z.object({
    title: z.string().describe("Il nome dell'incarico, es 'Preparare slide beta'"),
    clientId: z.string().optional().describe('Se menzionato un cliente specifico, mappa l\'id, altrimenti ometti.'),
    category: z.enum(['design', 'dev', 'bando', 'social', 'finanze', 'general']).describe('La tipologia generica del task.'),
    deadlinePattern: z.string().describe('Data in formato YYYY-MM-DD, es. "2026-03-10"')
});

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        // 1. Verifica autenticazione
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new Response(JSON.stringify({ error: 'Utente non autenticato' }), { 
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 2. Controllo Budget API AI (ANTHROPIC)
        const budgetResult = await UsageService.checkAndIncrement('anthropic', user.id);
        if (!budgetResult.allowed) {
            return new Response(JSON.stringify({ 
                error: `Budget AI Esaurito: Hai raggiunto il limite di ${budgetResult.limit} chiamate mensili impostato per proteggere i tuoi fondi (5€).`,
                code: 'BUDGET_EXCEEDED'
            }), { 
                status: 403, 
                headers: { 'Content-Type': 'application/json' } 
            });
        }

        const modelMessages = await convertToModelMessages(messages);

        const result = streamText({
            model: anthropic('claude-opus-4-6'),
            system: `Sei Creative OS. Il tuo obiettivo è interfacciarti con l'utente come se fossi il suo fidato Chief Operating Officer.
Rispondi in modo conciso, professionale e rassicurante in lingua italiana. Puoi eseguire azioni per conto suo.
Non usare mai le parole "sono un'intelligenza artificiale". Quando crei un task, passa la data estraendola in formato YYYY-MM-DD.`,
            messages: modelMessages,
            tools: {
                createTask: tool({
                    description: 'Crea un nuovo incarico (Task) nel sistema e su Notion/Database utente.',
                    inputSchema: taskSchema,
                    execute: async ({ title, category, deadlinePattern, clientId }: z.infer<typeof taskSchema>) => {
                        const supabase = await createClient();
                        const { data: { user } } = await supabase.auth.getUser();

                        if (!user) {
                            return { success: false, message: 'Utente non autenticato. Impossibile creare il task.' };
                        }

                        // Parse della data (default domani se invalida)
                        let parsedDate = new Date();
                        parsedDate.setDate(parsedDate.getDate() + 1);
                        try {
                            const dateToParse = new Date(deadlinePattern);
                            if (!isNaN(dateToParse.getTime())) {
                                parsedDate = dateToParse;
                            }
                        } catch { /* usa default */ }

                        const isoDate = parsedDate.toISOString();
                        const shortDate = parsedDate.toISOString().split('T')[0];

                        // 1. Supabase Insert
                        const { error: sbError } = await supabase.from('tasks').insert({
                            user_id: user.id,
                            client_id: clientId ?? null,
                            title,
                            type: category,
                            status: 'todo',
                            deadline: isoDate
                        });

                        if (sbError) {
                            console.error("Supabase Error:", sbError);
                        }

                        // 2. Notion Insert (fire and forget)
                        let notionSuccess = false;
                        try {
                            await createNotionTask(title, shortDate, category);
                            notionSuccess = true;
                        } catch (e: unknown) {
                            const msg = e instanceof Error ? e.message : String(e);
                            console.log("Notion write skipped/failed:", msg);
                        }

                        return {
                            success: true,
                            taskCreated: { title, type: category, deadline: shortDate },
                            message: `Incarico "${title}" creato nel database${notionSuccess ? ' e sincronizzato su Notion' : ''}.`
                        };
                    },
                })
            }
        });

        return result.toUIMessageStreamResponse();

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
