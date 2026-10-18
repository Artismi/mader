import { NextRequest, NextResponse } from 'next/server'
import { takePendingPkce } from '@/lib/ai/model-provider'
import { salvaChiaveOpenRouterOAuth } from '@/lib/ai/chiavi'

// Ritorno da OpenRouter: scambia il codice con la chiave API dell'utente
// e la salva cifrata nella cassaforte (in sviluppo in user_tokens). Non arriva mai al client.

function externalPage(ok: boolean): Response {
  const title = ok ? 'OpenRouter collegato' : 'Collegamento non riuscito'
  const text = ok
    ? 'Puoi chiudere questa scheda e tornare a Creative OS: le Impostazioni si aggiornano da sole.'
    : 'Torna a Creative OS e riprova da Impostazioni → Modelli AI.'
  const html = `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:system-ui,sans-serif;background:#0f0f10;color:#fafafa;display:grid;place-items:center;height:100vh;margin:0}
main{max-width:420px;text-align:center}h1{font-size:20px}p{color:#a1a1aa;line-height:1.5}</style></head>
<body><main><h1>${ok ? '✓' : '✕'} ${title}</h1><p>${text}</p></main></body></html>`
  return new Response(html, { status: ok ? 200 : 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

export async function GET(req: NextRequest) {
  const host = req.headers.get('host') ?? 'localhost:3000'
  const code = req.nextUrl.searchParams.get('code')
  const pending = takePendingPkce()

  const done = (ok: boolean) => pending?.external
    ? externalPage(ok)
    : NextResponse.redirect(`http://${host}/settings?openrouter=${ok ? 'connected' : 'error'}`)

  if (!code || !pending) return done(false)

  try {
    const exchange = await fetch('https://openrouter.ai/api/v1/auth/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, code_verifier: pending.verifier, code_challenge_method: 'S256' }),
    })
    if (!exchange.ok) {
      console.error('[openrouter] scambio codice fallito:', exchange.status, await exchange.text())
      return done(false)
    }
    const { key } = await exchange.json() as { key?: string }
    if (!key) return done(false)

    salvaChiaveOpenRouterOAuth(key)
    return done(true)
  } catch (err) {
    console.error('[openrouter] errore callback:', err)
    return done(false)
  }
}
