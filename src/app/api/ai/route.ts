import { anthropic } from '@ai-sdk/anthropic';
import { streamText, convertToModelMessages } from 'ai';
import { tool } from '@ai-sdk/provider-utils';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createNotionTask } from '@/lib/notion/client';
import { UsageService } from '@/lib/api/usage';
import { DEFAULT_ARCHITECTURE, DEFAULT_SKILLS } from '@/lib/ai/defaults';

// Permettiamo streaming fino a 30s
export const maxDuration = 30;

const taskSchema = z.object({
    title: z.string().describe("Il nome dell'incarico, es 'Preparare slide beta'"),
    clientId: z.string().optional().describe('Se menzionato un cliente specifico, mappa l\'id, altrimenti ometti.'),
    category: z.enum(['design', 'dev', 'bando', 'social', 'finanze', 'general']).describe('La tipologia generica del task.'),
    deadlinePattern: z.string().describe('Data in formato YYYY-MM-DD, es. "2026-03-10"')
});

const DAY_MAP: Record<string, number> = {
    lunedi: 1, lun: 1, monday: 1,
    martedi: 2, mar: 2, tuesday: 2,
    mercoledi: 3, mer: 3, wednesday: 3,
    giovedi: 4, gio: 4, thursday: 4,
    venerdi: 5, ven: 5, friday: 5,
    sabato: 6, sab: 6, saturday: 6,
    domenica: 0, dom: 0, sunday: 0,
};

const recurringEngagementSchema = z.object({
    title: z.string().describe("Nome dell'impegno, es. 'Servizio Civile'"),
    days: z.array(z.string()).describe("Giorni della settimana in italiano o inglese, es. ['lunedi','martedi','mercoledi','giovedi','venerdi']"),
    startHour: z.number().int().min(0).max(23).describe("Ora di inizio (0-23), es. 14"),
    endHour: z.number().int().min(1).max(24).describe("Ora di fine (1-24), es. 19"),
    startDate: z.string().describe("Data inizio in formato YYYY-MM-DD"),
    endDate: z.string().describe("Data fine in formato YYYY-MM-DD"),
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

        const [{ data: archData }, { data: skillsData }] = await Promise.all([
            supabase.from('system_config').select('value').eq('user_id', user.id).eq('key', 'architecture').maybeSingle(),
            supabase.from('skills').select('name,content,triggers').eq('user_id', user.id).eq('active', true).order('sort_order'),
        ]);

        // Seed se non esistono
        if (!archData) {
            supabase.from('system_config').insert({ user_id: user.id, key: 'architecture', value: DEFAULT_ARCHITECTURE }).then(() => {});
        }
        if (!skillsData || skillsData.length === 0) {
            supabase.from('skills').insert(DEFAULT_SKILLS.map(s => ({ ...s, user_id: user.id }))).then(() => {});
        }

        const architecture = archData?.value ?? DEFAULT_ARCHITECTURE;
        const skills = (skillsData && skillsData.length > 0) ? skillsData : DEFAULT_SKILLS;
        const skillsBlock = skills.map((s: any) => s.content).join('\n\n---\n\n');

        const SYSTEM_PROMPT = `${architecture}\n\n---\n\n${skillsBlock}`;

        const modelMessages = await convertToModelMessages(messages);

        const result = streamText({
            model: anthropic('claude-opus-4-6'),
            system: SYSTEM_PROMPT,
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
                }),

                createRecurringEngagement: tool({
                    description: 'Crea slot ricorrenti per impegni fissi settimanali (es. servizio civile, palestra, lavoro part-time). NON usare per progetti o task con deliverable.',
                    inputSchema: recurringEngagementSchema,
                    execute: async ({ title, days, startHour, endHour, startDate, endDate }: z.infer<typeof recurringEngagementSchema>) => {
                        const supabase = await createClient();
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user) return { success: false, message: 'Non autenticato' };

                        const targetDays = days
                            .map(d => DAY_MAP[d.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')])
                            .filter(d => d !== undefined);

                        if (targetDays.length === 0) {
                            return { success: false, message: 'Giorni non riconosciuti' };
                        }

                        const durationMinutes = (endHour - startHour) * 60;
                        const start = new Date(startDate);
                        const end = new Date(endDate);
                        const slots: object[] = [];

                        for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                            if (targetDays.includes(d.getDay())) {
                                const deadline = new Date(d);
                                deadline.setHours(startHour, 0, 0, 0);
                                slots.push({
                                    user_id: user.id,
                                    title,
                                    type: 'general',
                                    category: 'engagement',
                                    status: 'todo',
                                    deadline: deadline.toISOString(),
                                    duration_minutes: durationMinutes,
                                });
                            }
                        }

                        if (slots.length === 0) {
                            return { success: false, message: 'Nessun slot generato nel periodo specificato' };
                        }

                        const { error } = await supabase.from('tasks').insert(slots);
                        if (error) return { success: false, message: error.message };

                        return {
                            success: true,
                            slotsCreated: slots.length,
                            message: `Creati ${slots.length} slot "${title}" (${startHour}:00–${endHour}:00) dal ${startDate} al ${endDate}. Visibili nel calendario come impegni, senza creare pressione sui progetti.`
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
