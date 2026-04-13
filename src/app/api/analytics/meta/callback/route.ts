import { clients, clientTokens } from '@/lib/db'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const clientId = searchParams.get('state')

  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (!code || !clientId) return Response.json({ error: 'code o state mancante' }, { status: 400 })
  if (!appId || !appSecret) return Response.json({ error: 'META_APP_ID o META_APP_SECRET non configurati' }, { status: 500 })

  const client = clients.getById(clientId)
  if (!client) return Response.json({ error: 'Cliente non trovato' }, { status: 404 })

  const redirectUri = `${appUrl}/api/analytics/meta/callback`

  // 1. Short-lived token
  const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token')
  tokenUrl.searchParams.set('client_id', appId)
  tokenUrl.searchParams.set('client_secret', appSecret)
  tokenUrl.searchParams.set('redirect_uri', redirectUri)
  tokenUrl.searchParams.set('code', code)

  const tokenRes = await fetch(tokenUrl.toString())
  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    return Response.json({ error: `Token exchange failed: ${err}` }, { status: 502 })
  }
  const tokenData = await tokenRes.json() as { access_token: string; error?: { message: string } }
  if (tokenData.error) return Response.json({ error: tokenData.error.message }, { status: 502 })

  // 2. Long-lived token (~60 giorni)
  const llUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token')
  llUrl.searchParams.set('grant_type', 'fb_exchange_token')
  llUrl.searchParams.set('client_id', appId)
  llUrl.searchParams.set('client_secret', appSecret)
  llUrl.searchParams.set('fb_exchange_token', tokenData.access_token)

  const llRes = await fetch(llUrl.toString())
  const llData = await llRes.json() as { access_token: string; expires_in?: number; error?: { message: string } }
  if (llData.error) return Response.json({ error: llData.error.message }, { status: 502 })

  const longToken = llData.access_token
  const expiresAt = llData.expires_in
    ? new Date(Date.now() + llData.expires_in * 1000).toISOString()
    : undefined

  // 3. Fetch pagine FB
  const pagesRes = await fetch(
    `https://graph.facebook.com/v19.0/me/accounts?access_token=${longToken}`
  )
  const pagesData = await pagesRes.json() as {
    data?: { id: string; name: string; access_token: string }[]
    error?: { message: string }
  }

  let metaPageId: string | undefined
  let metaIgAccountId: string | undefined

  if (pagesData.data && pagesData.data.length > 0) {
    const page = pagesData.data[0]
    metaPageId = page.id

    // 4. Cerca IG business account collegato alla pagina
    const igRes = await fetch(
      `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
    )
    const igData = await igRes.json() as {
      instagram_business_account?: { id: string }
      error?: { message: string }
    }
    if (igData.instagram_business_account) {
      metaIgAccountId = igData.instagram_business_account.id
    }
  }

  // 5. Salva token e aggiorna cliente
  clientTokens.upsert({
    client_id: clientId,
    provider: 'meta',
    access_token: longToken,
    token_expires_at: expiresAt,
    scopes: JSON.stringify(['pages_read_engagement', 'instagram_basic', 'instagram_manage_insights'])
  })
  clients.update(clientId, {
    ...(metaPageId ? { meta_page_id: metaPageId } : {}),
    ...(metaIgAccountId ? { meta_ig_account_id: metaIgAccountId } : {}),
  })

  // 6. Redirect alla pagina cliente
  return Response.redirect(`${appUrl}/clienti/${clientId}?connected=meta`)
}
