import { google } from 'googleapis'
import { tokens } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { title, date, startHour, endHour } = body as {
            title: string
            date: string      // YYYY-MM-DD
            startHour: number
            endHour: number
        }

        if (!title || !date) {
            return Response.json({ error: 'Titolo e data obbligatori' }, { status: 400 })
        }

        let accessToken = tokens.get('google')?.provider_token
        if (!accessToken) {
            const supabase = await createClient()
            const { data: { session } } = await supabase.auth.getSession()
            accessToken = session?.provider_token ?? undefined
        }

        if (!accessToken) {
            return Response.json({ error: 'Google Calendar non collegato' }, { status: 403 })
        }

        const oauth2Client = new google.auth.OAuth2()
        oauth2Client.setCredentials({ access_token: accessToken })
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

        const startDateTime = new Date(`${date}T${String(startHour).padStart(2, '0')}:00:00`)
        const endDateTime = new Date(`${date}T${String(endHour ?? startHour + 1).padStart(2, '0')}:00:00`)

        const event = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: {
                summary: title,
                start: { dateTime: startDateTime.toISOString(), timeZone: 'Europe/Rome' },
                end: { dateTime: endDateTime.toISOString(), timeZone: 'Europe/Rome' },
            },
        })

        return Response.json({ success: true, eventId: event.data.id })

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return Response.json({ error: msg }, { status: 500 })
    }
}
