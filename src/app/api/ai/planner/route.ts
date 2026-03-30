import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 30;

export async function POST(req: Request) {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return new Response('Unauthorized', { status: 401 });
    }

    const { prompt } = await req.json();

    // Fetch contesto reale da Supabase
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const [{ data: tasks }, { data: clients }] = await Promise.all([
        supabase
            .from('tasks')
            .select('title, deadline, status, clients(name)')
            .eq('status', 'todo')
            .order('deadline', { ascending: true })
            .limit(20),
        supabase
            .from('clients')
            .select('name')
            .limit(10),
    ]);

    const taskList = (tasks || []).map(t => {
        const clientName = (t.clients as any)?.name || 'Nessun cliente';
        const deadline = t.deadline
            ? new Date(t.deadline).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
            : 'Senza scadenza';
        return `- ${t.title} [${clientName}] → ${deadline}`;
    }).join('\n');

    const clientList = (clients || []).map(c => c.name).join(', ') || 'Nessun cliente registrato';

    const systemPrompt = `Sei il Co-Pilot di Creative OS, un assistente per freelance creativi.
Il tuo compito è analizzare il contesto lavorativo e fornire piani chiari, concreti e motivanti.
Rispondi sempre in italiano, in modo diretto e professionale.
Non aggiungere introduzioni generiche. Vai subito al punto.`;

    const contextPrompt = `Oggi è ${now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.

CLIENTI ATTIVI: ${clientList}

TASK APERTI (ordinati per scadenza):
${taskList || 'Nessun task aperto.'}

RICHIESTA: ${prompt || 'Analizza la mia settimana e dimmi su cosa concentrarmi oggi e nei prossimi giorni. Raggruppa per priorità e cliente.'}`;

    const google = createGoogleGenerativeAI({
        apiKey: process.env.GEMINI_API_KEY!,
    });

    const result = streamText({
        model: google('gemini-2.0-flash-exp'),
        system: systemPrompt,
        prompt: contextPrompt,
    });

    return result.toTextStreamResponse();
}
