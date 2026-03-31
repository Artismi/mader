import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { google } from 'googleapis';

export async function POST() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
        }

        const { data: tokenData } = await supabase
            .from('user_tokens')
            .select('provider_token, provider_refresh_token, expires_at')
            .eq('user_id', user.id)
            .eq('provider', 'google')
            .single();

        if (!tokenData) {
            return NextResponse.json({ error: 'Nessun token Google trovato' }, { status: 404 });
        }

        // If token is still valid (with 5 min buffer), return early
        if (tokenData.expires_at) {
            const expiresAt = new Date(tokenData.expires_at).getTime();
            const now = Date.now();
            if (expiresAt - now > 5 * 60 * 1000) {
                return NextResponse.json({ token: tokenData.provider_token, refreshed: false });
            }
        }

        if (!tokenData.provider_refresh_token) {
            return NextResponse.json({ error: 'Nessun refresh token disponibile. Esegui nuovamente il login.' }, { status: 400 });
        }

        // Refresh via Google OAuth2
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
        );
        oauth2Client.setCredentials({ refresh_token: tokenData.provider_refresh_token });

        const { credentials } = await oauth2Client.refreshAccessToken();

        if (!credentials.access_token) {
            return NextResponse.json({ error: 'Refresh fallito' }, { status: 500 });
        }

        // Persist new token
        await supabase
            .from('user_tokens')
            .update({
                provider_token: credentials.access_token,
                expires_at: credentials.expiry_date
                    ? new Date(credentials.expiry_date).toISOString()
                    : null,
            })
            .eq('user_id', user.id)
            .eq('provider', 'google');

        return NextResponse.json({ token: credentials.access_token, refreshed: true });

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
