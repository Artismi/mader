import { NextResponse } from 'next/server'
import { socialPosts } from '@/lib/db'

export async function POST(req: Request) {
    try {
        const { channel, content, subject, clientId } = await req.json()
        if (!channel || !content) {
            return NextResponse.json({ error: 'channel e content sono obbligatori' }, { status: 400 })
        }

        // Salva il post social nel database
        let postId: string | undefined
        try {
            postId = socialPosts.create({
                client_id: clientId || null,
                content,
                subject: subject || null,
                platforms: [channel],
                status: 'publishing',
            }).id
        } catch (dbErr) {
            console.error('[Social Publish DB Error]', dbErr)
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
                        postId,
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
        if (postId) {
            socialPosts.updateStatus(postId, 'published', { published_at: new Date().toISOString() })
        }

        return NextResponse.json({ ok: true, postId })
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
