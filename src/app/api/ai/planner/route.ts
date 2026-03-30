import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UsageService } from '@/lib/api/usage';

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        // 2) auth userifica autenticazione (RLS)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Controllo Budget API AI (ANTHROPIC)
        const budgetResult = await UsageService.checkAndIncrement('anthropic', user.id);
        if (!budgetResult.allowed) {
            return NextResponse.json({ 
                error: `Budget AI Esaurito: Hai raggiunto il limite di ${budgetResult.limit} chiamate mensili.`,
                code: 'BUDGET_EXCEEDED'
            }, { status: 403 });
        }

        // 2. Parsa il body inviato dal frontend
        const body = await req.json();
        const { textInput } = body;

        if (!textInput) {
            return NextResponse.json({ error: 'Missing textInput' }, { status: 400 });
        }

        // 3. Qui avverrà l'integrazione con Claude via SDK (Track 2)
        // Claude dovrà generare le Fasi, i Subtask, le Date e il Buffer.

        // Per ora restituiamo un mock JSON che simula l'output di Claude:
        const mockClaudeResponse = {
            action: 'PLAN_CREATED',
            estimatedHours: '2-12',
            bufferDays: 2,
            phases: [
                { name: 'Analisi Richiesta', subtasks: ['Lettura Vault', 'Definizione stile'], date: 'Oggi' },
                { name: 'Produzione', subtasks: ['Creazione Grafica', 'Stesura Copy'], date: 'Domani' }
            ]
        };

        return NextResponse.json(mockClaudeResponse, { status: 200 });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error', details: error.message },
            { status: 500 }
        );
    }
}
