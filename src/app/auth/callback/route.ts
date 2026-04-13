import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { tokens } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_code_missing`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${error.message}`)
  }

  // Salva token Google in SQLite (fonte di verità per tutte le API route)
  if (data.session?.provider_token) {
    tokens.upsert({
      provider: 'google',
      provider_token: data.session.provider_token,
      provider_refresh_token: data.session.provider_refresh_token ?? undefined,
      expires_at: data.session.expires_at
        ? new Date(data.session.expires_at * 1000).toISOString()
        : undefined,
    })
  }

  return NextResponse.redirect(`${origin}/`)
}
