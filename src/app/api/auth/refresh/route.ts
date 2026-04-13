import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { tokens } from '@/lib/db'

export async function POST() {
  try {
    const tokenData = tokens.get('google')

    if (!tokenData?.provider_token) {
      return NextResponse.json({ error: 'Nessun token Google. Esegui il login.' }, { status: 401 })
    }

    // Se il token è ancora valido (con 5 min di buffer), restituisci quello corrente
    if (tokenData.expires_at) {
      const expiresAt = new Date(tokenData.expires_at).getTime()
      if (expiresAt - Date.now() > 5 * 60 * 1000) {
        return NextResponse.json({ token: tokenData.provider_token, refreshed: false })
      }
    }

    if (!tokenData.provider_refresh_token) {
      return NextResponse.json({ error: 'Nessun refresh token. Esegui nuovamente il login.' }, { status: 400 })
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    )
    oauth2Client.setCredentials({ refresh_token: tokenData.provider_refresh_token })

    const { credentials } = await oauth2Client.refreshAccessToken()

    if (!credentials.access_token) {
      return NextResponse.json({ error: 'Refresh fallito' }, { status: 500 })
    }

    // Aggiorna token in SQLite
    tokens.upsert({
      provider: 'google',
      provider_token: credentials.access_token,
      provider_refresh_token: tokenData.provider_refresh_token,
      expires_at: credentials.expiry_date
        ? new Date(credentials.expiry_date).toISOString()
        : undefined,
    })

    return NextResponse.json({ token: credentials.access_token, refreshed: true })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
