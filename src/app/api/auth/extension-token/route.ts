import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseConfigurato, SUPABASE_NON_CONFIGURATO } from '@/lib/supabase/config';

export async function GET() {
    if (!supabaseConfigurato()) {
        return NextResponse.json({ error: SUPABASE_NON_CONFIGURATO }, { status: 503 });
    }

    try {
        const supabase = await createClient();

        // Verifica che l'utente stia richiamando l'API con una auth session valida (Browser)
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
            return NextResponse.json({ error: 'Unauthorized. Require valid session.' }, { status: 401 });
        }

        // Genera un token short-lived per l'estensione (usando custom id auth o ri-passando l'access token di Supabase)
        // Claude Code si incaricherà di validarlo e definire la durata via NextAuth/JWT custom.
        const extensionToken = session.access_token;

        return NextResponse.json({
            token: extensionToken,
            expires_at: session.expires_at,
        }, { status: 200 });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
