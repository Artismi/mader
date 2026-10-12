import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'

// Avvia il collegamento OpenRouter (OAuth PKCE).
// Il code_verifier resta in un cookie httpOnly e serve al callback per
// scambiare il codice con la chiave API dell'utente.

const VERIFIER_COOKIE = 'or_pkce_verifier'

export async function GET(req: NextRequest) {
  const host = req.headers.get('host') ?? 'localhost:3000'
  const callbackUrl = `http://${host}/api/auth/openrouter/callback`

  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')

  const authUrl = new URL('https://openrouter.ai/auth')
  authUrl.searchParams.set('callback_url', callbackUrl)
  authUrl.searchParams.set('code_challenge', challenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')

  const res = NextResponse.redirect(authUrl)
  res.cookies.set(VERIFIER_COOKIE, verifier, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/api/auth/openrouter',
    maxAge: 10 * 60,
  })
  return res
}
