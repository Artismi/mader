import { NextResponse } from 'next/server'
import { socialPosts } from '@/lib/db'
import { lintCaption } from '@/lib/ai/instagram/caption'

export async function POST(req: Request) {
    try {
        const { channel, content, subject, clientId } = await req.json()
        if (!channel || !content) {
            return NextResponse.json({ error: 'channel e content sono obbligatori' }, { status: 400 })
        }

        // Gate Instagram: una caption con FAIL (es. oltre 5 hashtag, oltre 2200 caratteri)
        // non parte. I WARN restano una decisione dell'utente, già vista in anteprima.
        if (channel === 'instagram') {
            const lint = lintCaption(content)
            const fails = lint.checks.filter(c => c.status === 'FAIL')
            if (fails.length > 0) {
                return NextResponse.json({
                    error: 'La caption Instagram non passa il linter',
                    fails: fails.map(f => `${f.label}: ${f.detail}`),
                }, { status: 422 })
            }
        }

        // Salva il post social nel database locale
        let postId: string | undefined
        try {
            postId = socialPosts.create({
                client_id: clientId || undefined,
                content,
                subject: subject || undefined,
                platforms: [channel],
                status: 'publishing',
            })
        } catch (dbErr) {
            console.error('[Social Publish DB Error]', dbErr)
            // Continua comunque — il salvataggio DB non blocca la pubblicazione
        }

        // ─── Bridge verso n8n ─────────────────────────────────────────────────
        let ok = true
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
                    ok = false
                    console.error('[n8n webhook error]', await res.text())
                }
            } catch (n8nErr) {
                ok = false
                console.error('[n8n fetch error]', n8nErr)
            }
        }

        if (postId) socialPosts.updateStatus(postId, ok ? 'published' : 'failed')
        if (!ok) return NextResponse.json({ error: 'Invio a n8n fallito', postId }, { status: 502 })

        return NextResponse.json({ ok: true, postId })
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
