import { google } from 'googleapis'
import { tokens, bookings } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const events: any[] = []

  // Bookings Calendly (locale, sempre disponibili)
  const upcomingBookings = bookings.getUpcoming()
  for (const b of upcomingBookings) {
    events.push({
      id: `booking-${b.id}`,
      summary: `📅 ${b.title || 'App.'} — ${b.attendee_name}`,
      start: { dateTime: b.start_time },
      end: { dateTime: b.end_time },
      _isBooking: true,
    })
  }

  // Google Calendar (opzionale, può fallire)
  const tokenData = tokens.get('google')
  if (tokenData?.provider_token) {
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
      )
      oauth2Client.setCredentials({
        access_token: tokenData.provider_token,
        refresh_token: tokenData.provider_refresh_token,
      })

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
      const timeMax = new Date()
      timeMax.setDate(timeMax.getDate() + 28)

      const res = await calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        timeMax: timeMax.toISOString(),
        maxResults: 150,
        singleEvents: true,
        orderBy: 'startTime',
      })
      events.push(...(res.data.items || []))
    } catch (e: any) {
      console.warn('[Calendar] Sync error (non-blocking):', e.message)
    }
  }

  return Response.json({ events })
}
