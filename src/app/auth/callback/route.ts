import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')

    // se c'è l'errore o manca code
    if (!code) {
        return NextResponse.redirect(`${origin}/login?error=auth_code_missing`)
    }

    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
        return NextResponse.redirect(`${origin}/login?error=${error.message}`)
    }

    // Persistenza token OAuth in tabella user_tokens come completamento F1
    if (data.session && data.session.provider_token) {
        await supabase
            .from('user_tokens')
            .upsert(
                {
                    user_id: data.session.user.id,
                    provider: 'google',
                    provider_token: data.session.provider_token,
                    provider_refresh_token: data.session.provider_refresh_token,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'user_id, provider' }
            )
    }

    return NextResponse.redirect(`${origin}/`)
}
