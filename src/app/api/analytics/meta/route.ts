import { NextResponse } from 'next/server'
import { socialAnalytics, clientTokens, clients } from '@/lib/db'

const GRAPH = 'https://graph.facebook.com/v21.0'

async function fetchIG(igUserId: string, token: string) {
  // Follower + nome
  const profileRes = await fetch(
    `${GRAPH}/${igUserId}?fields=followers_count,username,media_count&access_token=${token}`
  )
  if (!profileRes.ok) throw new Error(`IG profile error: ${profileRes.status}`)
  const profile = await profileRes.json()
  if (profile.error) throw new Error(profile.error.message)

  // Insights: reach e impressioni degli ultimi 28 giorni
  const since = Math.floor(Date.now() / 1000) - 28 * 86400
  const until = Math.floor(Date.now() / 1000)
  const insightsRes = await fetch(
    `${GRAPH}/${igUserId}/insights?metric=reach,impressions,profile_views&period=days_28&since=${since}&until=${until}&access_token=${token}`
  )
  const insights = await insightsRes.json()

  let reach = 0
  if (insights.data) {
    const reachData = insights.data.find((d: any) => d.name === 'reach')
    reach = reachData?.values?.reduce((s: number, v: any) => s + v.value, 0) || 0
  }

  // Media level insights (ultimi 5 post)
  const mediaRes = await fetch(
    `${GRAPH}/${igUserId}/media?fields=id,caption,media_type,media_url,timestamp,like_count,comments_count&limit=5&access_token=${token}`
  )
  const mediaData = await mediaRes.json()
  const detailedMedia = []
  
  if (mediaData.data) {
    for (const m of mediaData.data) {
      const mInsightsRes = await fetch(`${GRAPH}/${m.id}/insights?metric=reach,engagement,saved&access_token=${token}`)
      const mInsights = await mInsightsRes.json()
      const reachVal = mInsights.data?.find((d: any) => d.name === 'reach')?.values?.[0]?.value || 0
      const savedVal = mInsights.data?.find((d: any) => d.name === 'saved')?.values?.[0]?.value || 0
      
      detailedMedia.push({
        ...m,
        reach: reachVal,
        saved: savedVal
      })
    }
  }

  // Engagement rate stimato
  const totalEng = mediaData.data?.reduce((s: number, m: any) => s + (m.like_count || 0) + (m.comments_count || 0), 0) || 0
  const avgEng = mediaData.data?.length ? (totalEng / mediaData.data.length) : 0
  const engagementRate = profile.followers_count > 0 ? Math.round((avgEng / profile.followers_count) * 1000) / 10 : 0

  return {
    followers: profile.followers_count || 0,
    engagement_rate: engagementRate,
    reach,
    top_media: detailedMedia
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get('clientId')
  if (!clientId) return NextResponse.json({ error: 'clientId mancante' }, { status: 400 })

  // Recupera token dal DB
  const tokenRecord = clientTokens.get(clientId, 'instagram')
  const clientRecord = clients.getById(clientId)
  
  if (!tokenRecord?.access_token || !clientRecord?.meta_ig_account_id) {
    return NextResponse.json({ error: 'Account Meta non collegato per questo cliente' }, { status: 400 })
  }

  try {
    const results = await fetchIG(clientRecord.meta_ig_account_id, tokenRecord.access_token)
    
    // Salvataggio cache
    socialAnalytics.upsertClientMetrics(clientId, 'instagram', {
        followers: results.followers,
        engagement_rate: results.engagement_rate,
        reach: results.reach
    })

    return NextResponse.json({ ok: true, results })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST per compatibilità (vecchio metodo manuale, ora sconsigliato)
export async function POST(req: Request) {
  try {
    const { clientId, access_token, ig_user_id } = await req.json()
    if (!clientId || !access_token) return NextResponse.json({ error: 'Mancano dati' }, { status: 400 })
    
    clientTokens.upsert({
        client_id: clientId,
        provider: 'instagram',
        access_token,
        scopes: 'manual_input'
    })
    
    if (ig_user_id) {
        clients.update(clientId, { meta_ig_account_id: ig_user_id })
    }
    
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
