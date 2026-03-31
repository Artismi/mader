import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })

        const { channel, content, subject, clientId } = await req.json()
        if (!channel || !content) {
            return NextResponse.json({ error: 'channel e content sono obbligatori' }, { status: 400 })
        }

        // Salva il post social nel database
        const { data: post, error: sbError } = await supabase
            .from('social_posts')
            .insert({
                user_id: user.id,
                client_id: clientId || null,
                content,
                subject: subject || null,
                platforms: [channel],
                status: 'publishing',
            })
            .select()
            .single()

        if (sbError) {
            console.error('[Social Publish DB Error]', sbError)
            // Continua comunque — il salvataggio DB non blocca la pubblicazione
        }

        // ─── Bridge verso n8n ─────────────────────────────────────────────────
        const n8nWebhook = process.env.N8N_SOCIAL_WEBHOOK_URL
        if (n8nWebhook) {
            try {
                const res = await fetch(n8nWebhook, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-N8N-API-KEY': process.env.N8N_WEBHOOK_SECRET || '',
                    },
                    body: JSON.stringify({
                        channel,
                        content,
                        subject,
                        clientId,
                        postId: post?.id,
                    }),
                })

                if (!res.ok) {
                    console.error('[n8n webhook error]', await res.text())
                }
            } catch (n8nErr) {
                console.error('[n8n fetch error]', n8nErr)
            }
        }

        // Aggiorna status post a published
        if (post?.id) {
            await supabase
                .from('social_posts')
                .update({ status: 'published', published_at: new Date().toISOString() })
                .eq('id', post.id)
        }

        return NextResponse.json({ ok: true, postId: post?.id })
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
