import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { google } from 'googleapis';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });

        const { data: tokenData } = await supabase
            .from('user_tokens')
            .select('provider_token')
            .eq('user_id', user.id)
            .eq('provider', 'google')
            .single();

        if (!tokenData?.provider_token) {
            return NextResponse.json({ emails: [], error: 'Token Google non trovato' });
        }

        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: tokenData.provider_token });
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // Ultime 10 email non lette
        const listRes = await gmail.users.messages.list({
            userId: 'me',
            q: 'is:unread in:inbox',
            maxResults: 10,
        });

        const messages = listRes.data.messages || [];
        if (messages.length === 0) return NextResponse.json({ emails: [] });

        const emails = await Promise.all(
            messages.map(async (msg) => {
                const detail = await gmail.users.messages.get({
                    userId: 'me',
                    id: msg.id!,
                    format: 'metadata',
                    metadataHeaders: ['From', 'Subject', 'Date'],
                });

                const headers = detail.data.payload?.headers || [];
                const get = (name: string) => headers.find(h => h.name === name)?.value || '';

                const from = get('From');
                const emailMatch = from.match(/<(.+?)>/) || from.match(/(\S+@\S+)/);
                const senderEmail = emailMatch?.[1] || from;
                const senderName = from.replace(/<.+>/, '').replace(/"/g, '').trim() || senderEmail;

                return {
                    id: msg.id,
                    subject: get('Subject') || '(nessun oggetto)',
                    from: senderName,
                    fromEmail: senderEmail,
                    date: get('Date'),
                    snippet: detail.data.snippet || '',
                };
            })
        );

        return NextResponse.json({ emails });

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('Gmail API error:', msg);
        return NextResponse.json({ emails: [], error: msg });
    }
}
