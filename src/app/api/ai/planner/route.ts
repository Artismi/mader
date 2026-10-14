import { generateTextWith } from '@/lib/ai/model-registry';
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

    let text: string;
    try {
        // il registro sceglie il modello (scelta dell'utente, poi gli altri fornitori, saltando chi ha finito la quota)
        ({ text } = await generateTextWith({ task: 'general' }, { system: systemPrompt, prompt: contextPrompt }));
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error("AI Planner Error:", err);
        return new Response(JSON.stringify({
            error: /quota|RESOURCE_EXHAUSTED|429|exceeded/i.test(msg)
                ? 'Quota esaurita su tutti i modelli disponibili. Aggiungi una chiave o collega OpenRouter nelle Impostazioni.'
                : "Errore durante l'analisi. Riprova tra poco."
        }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(text!, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
