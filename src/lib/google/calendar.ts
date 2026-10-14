/**
 * Eventi dei prossimi giorni: prenotazioni locali (Calendly) + Google Calendar.
 * Google è opzionale: se non è collegato restano le prenotazioni, senza errori.
 * Solo lato server.
 */
import { google } from 'googleapis'
import { bookings } from '@/lib/db'
import { googleAuth } from './auth'

export interface CalEvent {
  id: string
  title: string
  start: string        // ISO
  end: string          // ISO
  allDay: boolean
  where?: string
  link?: string        // apri in Google Calendar / videochiamata
  source: 'google' | 'booking'
}

export async function upcomingEvents(days = 7): Promise<CalEvent[]> {
  const out: CalEvent[] = bookings.getUpcoming().map(b => ({
    id: `b-${b.id}`, title: `${b.title || 'Appuntamento'} — ${b.attendee_name}`, start: b.start_time, end: b.end_time,
    allDay: false, source: 'booking' as const,
  }))
  const auth = googleAuth()
  if (auth) {
    try {
      const from = new Date(); from.setHours(0, 0, 0, 0)
      const to = new Date(from); to.setDate(to.getDate() + days)
      const res = await google.calendar({ version: 'v3', auth }).events.list({
        calendarId: 'primary', timeMin: from.toISOString(), timeMax: to.toISOString(), singleEvents: true, orderBy: 'startTime', maxResults: 100,
      })
      for (const e of res.data.items ?? []) {
        const allDay = !e.start?.dateTime
        out.push({
          id: `g-${e.id}`, title: e.summary || '(senza titolo)', allDay, source: 'google',
          start: e.start?.dateTime ?? `${e.start?.date}T00:00:00`, end: e.end?.dateTime ?? `${e.end?.date}T00:00:00`,
          where: e.location ?? undefined, link: e.hangoutLink ?? e.htmlLink ?? undefined,
        })
      }
    } catch (err) {
      console.warn('[calendar] Google non disponibile:', (err as Error).message)
    }
  }
  return out.sort((a, b) => a.start.localeCompare(b.start))
}
