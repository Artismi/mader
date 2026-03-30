import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// MOCK DATA SEEDER
// Richiama GET /api/seed dopo aver fatto il login manuale
export async function GET() {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
        return NextResponse.json({ error: 'Devi fare prima il login' }, { status: 401 })
    }

    try {
        // 1. Inserisci Clienti
        const { data: clients, error: clientsErr } = await supabase
            .from('clients')
            .insert([
                { user_id: user.id, name: 'Fondazione Alfa', vault_path: '/_CLIENTI/Fondazione Alfa/' },
                { user_id: user.id, name: 'Beta Srl', vault_path: '/_CLIENTI/Beta Srl/' }
            ])
            .select()

        if (clientsErr) throw clientsErr;

        const clientAlfaId = clients[0].id;
        const clientBetaId = clients[1].id;

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const today = new Date();
        today.setHours(18, 0, 0, 0);

        // 2. Inserisci Task
        const { error: tasksErr } = await supabase
            .from('tasks')
            .insert([
                { user_id: user.id, client_id: clientAlfaId, title: 'Bando Cultura 2026', type: 'bando', deadline: yesterday.toISOString(), status: 'todo' },
                { user_id: user.id, client_id: clientBetaId, title: 'Post Carosello Instagram', type: 'social', deadline: today.toISOString(), status: 'todo' },
                { user_id: user.id, client_id: clientAlfaId, title: 'Revisione Budget', type: 'finanze', deadline: new Date(Date.now() + 86400000 * 2).toISOString(), status: 'todo' }
            ])

        if (tasksErr) throw tasksErr;

        return NextResponse.json({ success: true, message: 'Dati di test inseriti con successo!' })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
