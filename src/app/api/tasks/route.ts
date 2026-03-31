import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status') || 'todo';
        const limit = parseInt(searchParams.get('limit') || '20');

        const query = supabase
            .from('tasks')
            .select('id, title, type, category, status, deadline, clients(name)')
            .eq('user_id', user.id)
            .order('deadline', { ascending: true })
            .limit(limit);

        if (status !== 'all') {
            query.eq('status', status);
        }

        const { data: tasks, error } = await query;

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        return NextResponse.json({ tasks: tasks || [] });

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
