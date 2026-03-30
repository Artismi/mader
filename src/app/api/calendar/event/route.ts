import { createClient } from '@/lib/supabase/server'
import { google } from 'googleapis'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return Response.json({ error: 'Non autenticato' }, { status: 401 })
        }

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

        const { data: tokenData } = await supabase
            .from('user_tokens')
            .select('provider_token')
            .eq('user_id', user.id)
            .eq('provider', 'google')
            .single()

        if (!tokenData?.provider_token) {
            return Response.json({ error: 'Google Calendar non collegato' }, { status: 403 })
        }

        const oauth2Client = new google.auth.OAuth2()
        oauth2Client.setCredentials({ access_token: tokenData.provider_token })
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
