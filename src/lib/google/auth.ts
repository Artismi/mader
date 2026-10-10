/**
 * Un solo punto per l'accesso a Google.
 * - usa access token + refresh token salvati in SQLite
 * - googleapis rinnova da solo il token scaduto (serve il refresh token)
 * - ogni token nuovo viene salvato, così non si torna a "scaduto" dopo un'ora
 * Solo lato server.
 */
import { google } from 'googleapis'
import { tokens } from '@/lib/db'

export function googleAuth(fallbackAccessToken?: string) {
  const t = tokens.get('google')
  const access = t?.provider_token ?? fallbackAccessToken
  if (!access && !t?.provider_refresh_token) return null

  const client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
  client.setCredentials({
    access_token: access,
    refresh_token: t?.provider_refresh_token,
    expiry_date: t?.expires_at ? Date.parse(t.expires_at) : undefined,
  })
  client.on('tokens', fresh => {
    if (!fresh.access_token) return
    tokens.upsert({
      provider: 'google',
      provider_token: fresh.access_token,
      provider_refresh_token: fresh.refresh_token ?? t?.provider_refresh_token,
      expires_at: fresh.expiry_date ? new Date(fresh.expiry_date).toISOString() : undefined,
    })
  })
  return client
}

/** Stato del collegamento, per dire all'utente cosa fare */
export function googleStatus(): { connected: boolean; renewable: boolean; expiresAt?: string } {
  const t = tokens.get('google')
  const renewable = !!t?.provider_refresh_token
  const valid = !!t?.expires_at && Date.parse(t.expires_at) > Date.now()
  return { connected: renewable || valid, renewable, expiresAt: t?.expires_at }
}
