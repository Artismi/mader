import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('clientId')

  if (!clientId) return Response.json({ error: 'clientId mancante' }, { status: 400 })

  const appId = process.env.META_APP_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  if (!appId) return Response.json({ error: 'META_APP_ID non configurato' }, { status: 500 })

  const redirectUri = `${appUrl}/api/analytics/meta/callback`
  const scope = 'pages_read_engagement,instagram_basic,instagram_manage_insights,pages_show_list'

  const oauthUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth')
  oauthUrl.searchParams.set('client_id', appId)
  oauthUrl.searchParams.set('redirect_uri', redirectUri)
  oauthUrl.searchParams.set('scope', scope)
  oauthUrl.searchParams.set('state', clientId)

  return Response.redirect(oauthUrl.toString())
}
