import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'
import { savePendingPkce } from '@/lib/ai/model-provider'

// Avvia il collegamento OpenRouter (OAuth PKCE).
// ?ext=1 → aperto nel browser di sistema dall'app Electron: il login di
// OpenRouter non si carica nelle finestre Electron. Il code_verifier resta nel
// DB locale, così il callback funziona in qualunque browser arrivi.

export async function GET(req: NextRequest) {
  const host = req.headers.get('host') ?? 'localhost:3000'
  const callbackUrl = `http://${host}/api/auth/openrouter/callback`

  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  savePendingPkce(verifier, req.nextUrl.searchParams.get('ext') === '1')

  const authUrl = new URL('https://openrouter.ai/auth')
  authUrl.searchParams.set('callback_url', callbackUrl)
  authUrl.searchParams.set('code_challenge', challenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')

  return NextResponse.redirect(authUrl)
}
