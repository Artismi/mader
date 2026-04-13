import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { tasks as dbTasks, clients as dbClients } from '@/lib/db';

export const maxDuration = 30;

export async function POST(req: Request) {
    const { prompt } = await req.json();

    // Fetch contesto reale dal database locale SQLite
    const now = new Date();
    
    // In questo progetto usiamo i metodi diretti di @/lib/db che interrogano il SQLite locale
    const tasks = dbTasks.getAll({ status: 'todo', limit: 20 });
    const clients = dbClients.getAll();

    const taskList = (tasks || []).map(t => {
        const clientName = t.client_name || 'Nessun cliente';
        const deadline = t.deadline
            ? new Date(t.deadline).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
            : 'Senza scadenza';
        return `- ${t.title} [${clientName}] → ${deadline} (${t.status})`;
    }).join('\n');

    const clientList = (clients || []).map(c => c.name).join(', ') || 'Nessun cliente registrato';

    const systemPrompt = `Sei il Co-Pilot di Creative OS, un assistente per freelance creativi.
Il tuo compito è analizzare il contesto lavorativo e fornire piani chiari, concreti e motivanti.
Rispondi sempre in italiano, in modo diretto e professionale.
Usa i dati forniti per prioritizzare i task che hanno scadenze imminenti.
Non aggiungere introduzioni generiche. Vai subito al punto.`;

    const contextPrompt = `Oggi è ${now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}.

CLIENTI ATTIVI: ${clientList}

TASK APERTI (dal database locale):
${taskList || 'Nessun task aperto.'}

RICHIESTA UTENTE: ${prompt || 'Analizza la mia settimana e dimmi su cosa concentrarmi oggi e nei prossimi giorni. Raggruppa per priorità e cliente.'}`;

    const google = createGoogleGenerativeAI({
        apiKey: process.env.GEMINI_API_KEY!,
    });

    const genArgs = {
        system: systemPrompt,
        prompt: contextPrompt,
    };

    let text: string;
    try {
        const result = await generateText({ model: google('gemini-2.5-flash'), ...genArgs });
        text = result.text;
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        const isQuota = msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429') || msg.includes('exceeded')
        if (process.env.ANTHROPIC_API_KEY) {
            console.warn('[Planner] Gemini fallito, uso Claude:', msg)
            const { anthropic } = await import('@ai-sdk/anthropic')
            const result = await generateText({ model: anthropic('claude-3-5-sonnet-20241022'), ...genArgs });
            text = result.text;
        } else {
            console.error("AI Planner Error:", err);
            return new Response(JSON.stringify({
                error: isQuota
                    ? 'Quota Gemini esaurita. Configura ANTHROPIC_API_KEY come fallback.'
                    : "Errore durante l'analisi. Riprova tra poco."
            }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
    }

    return new Response(text!, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
