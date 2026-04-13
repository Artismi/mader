import { NextResponse } from 'next/server'
import { clientTokens, clients } from '@/lib/db'

const FB_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID
const FB_APP_SECRET = process.env.META_APP_SECRET
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/meta/callback`
const GRAPH = 'https://graph.facebook.com/v21.0'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const clientId = searchParams.get('state') // we passed clientId in state

  if (!code || !clientId) {
    return NextResponse.json({ error: 'Code o ClientId mancanti' }, { status: 400 })
  }

  try {
    // 1. Scambio code con short-lived token (2 ore)
    const tokenRes = await fetch(
      `${GRAPH}/oauth/access_token?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_secret=${FB_APP_SECRET}&code=${code}`
    )
    const tokenData = await tokenRes.json()
    if (tokenData.error) throw new Error(tokenData.error.message)

    const shortToken = tokenData.access_token

    // 2. Scambio con Long-lived token (60 giorni)
    const longTokenRes = await fetch(
      `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${FB_APP_ID}&client_secret=${FB_APP_SECRET}&fb_exchange_token=${shortToken}`
    )
    const longTokenData = await longTokenRes.json()
    if (longTokenData.error) throw new Error(longTokenData.error.message)

    const longToken = longTokenData.access_token
    const expiresAt = longTokenData.expires_in 
      ? new Date(Date.now() + longTokenData.expires_in * 1000).toISOString()
      : undefined

    // 3. Trova l'ID Instagram Business associato alle pagine dell'utente
    // Cerchiamo la prima pagina che ha un account Instagram collegato
    const pagesRes = await fetch(`${GRAPH}/me/accounts?fields=instagram_business_account{id,username,name},name,id&access_token=${longToken}`)
    const pagesData = await pagesRes.json()
    
    if (!pagesData.data || pagesData.data.length === 0) {
      throw new Error('Nessuna pagina Facebook trovata per questo account.')
    }

    // Cerchiamo il primo account IG Business valido
    const igAccount = pagesData.data.find((p: any) => p.instagram_business_account)?.instagram_business_account

    if (!igAccount) {
      throw new Error('Nessun account Instagram Business collegato alle pagine Facebook trovate.')
    }

    // 4. Salvataggio nel DB
    clientTokens.upsert({
      client_id: clientId,
      provider: 'instagram',
      access_token: longToken,
      token_expires_at: expiresAt,
      scopes: 'instagram_basic,instagram_manage_insights,pages_show_list,pages_read_engagement'
    })

    // Aggiorniamo anche l'ID nel profilo del cliente per comodità
    clients.update(clientId, {
      meta_ig_account_id: igAccount.id
    })

    // Torna alla pagina editoriale del cliente
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/editoriale?clientId=${clientId}&auth=success`)

  } catch (err: any) {
    console.error('Meta Auth Error:', err)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/editoriale?clientId=${clientId}&auth=error&message=${encodeURIComponent(err.message)}`)
  }
}
