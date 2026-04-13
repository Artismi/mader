import { NextResponse } from 'next/server'

const FB_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/meta/callback`

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('clientId')

  if (!clientId) {
    return NextResponse.json({ error: 'clientId mancante' }, { status: 400 })
  }

  if (!FB_APP_ID) {
    return NextResponse.json({ error: 'META_APP_ID non configurato nel file .env' }, { status: 500 })
  }

  // Scopes necessari per Business Suite level analytics
  const scopes = [
    'instagram_basic',
    'instagram_manage_insights',
    'pages_show_list',
    'pages_read_engagement'
  ].join(',')

  const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${scopes}&state=${clientId}&response_type=code`

  return NextResponse.redirect(authUrl)
}
