import { NextRequest, NextResponse } from 'next/server'
import { tokens } from '@/lib/db'
import { OPENROUTER_PROVIDER } from '@/lib/ai/model-provider'

const VERIFIER_COOKIE = 'or_pkce_verifier'

// Ritorno da OpenRouter: scambia il codice con la chiave API dell'utente
// e la salva in user_tokens. Non arriva mai al client.

export async function GET(req: NextRequest) {
  const host = req.headers.get('host') ?? 'localhost:3000'
  const back = (status: string) => {
    const res = NextResponse.redirect(`http://${host}/settings?openrouter=${status}`)
    res.cookies.delete({ name: VERIFIER_COOKIE, path: '/api/auth/openrouter' })
    return res
  }

  const code = req.nextUrl.searchParams.get('code')
  const verifier = req.cookies.get(VERIFIER_COOKIE)?.value
  if (!code || !verifier) return back('error')

  try {
    const exchange = await fetch('https://openrouter.ai/api/v1/auth/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, code_verifier: verifier, code_challenge_method: 'S256' }),
    })
    if (!exchange.ok) {
      console.error('[openrouter] scambio codice fallito:', exchange.status, await exchange.text())
      return back('error')
    }
    const { key } = await exchange.json() as { key?: string }
    if (!key) return back('error')

    tokens.upsert({ provider: OPENROUTER_PROVIDER, provider_token: key })
    return back('connected')
  } catch (err) {
    console.error('[openrouter] errore callback:', err)
    return back('error')
  }
}
