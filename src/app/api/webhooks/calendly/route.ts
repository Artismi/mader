import { NextResponse } from 'next/server'
import { bookings, messages } from '@/lib/db'

interface CalendlyWebhook {
  event: 'invitee.created' | 'invitee.canceled'
  payload: {
    event_type?: { name?: string }
    event?: { start_time?: string; end_time?: string; uri?: string }
    invitee?: { name?: string; email?: string; uri?: string }
    questions_and_answers?: { question: string; answer: string }[]
  }
}

export async function POST(req: Request) {
  try {
    const body: CalendlyWebhook = await req.json()
    const { event, payload } = body

    if (!payload?.invitee || !payload?.event) {
      return NextResponse.json({ ok: true }) // ignora eventi non rilevanti
    }

    const attendeeName  = payload.invitee.name  || 'Ospite'
    const attendeeEmail = payload.invitee.email || ''
    const title         = payload.event_type?.name || 'Appuntamento'
    const startTime     = payload.event.start_time || new Date().toISOString()
    const endTime       = payload.event.end_time   || new Date().toISOString()
    const calendlyId    = payload.invitee.uri?.split('/').pop() || ''
    const notes         = payload.questions_and_answers
      ?.map(q => `${q.question}: ${q.answer}`).join('\n') || undefined

    const status = event === 'invitee.canceled' ? 'cancelled' : 'confirmed'

    // Salva/aggiorna prenotazione in SQLite
    const booking = bookings.upsert({
      calendly_event_id: calendlyId,
      attendee_name: attendeeName,
      attendee_email: attendeeEmail,
      title,
      start_time: startTime,
      end_time: endTime,
      status,
      notes,
    })

    // Crea notifica in inbox
    const dateLabel = new Date(startTime).toLocaleString('it-IT', {
      weekday: 'long', day: 'numeric', month: 'long',
      hour: '2-digit', minute: '2-digit',
    })

    const notifContent = status === 'confirmed'
      ? `Nuova prenotazione da ${attendeeName} (${attendeeEmail}) — ${title} il ${dateLabel}`
      : `Prenotazione annullata da ${attendeeName} — ${title} il ${dateLabel}`

    messages.create({
      channel: 'gmail',
      sender_id: attendeeEmail,
      sender_name: attendeeName,
      subject: status === 'confirmed' ? `📅 Nuovo appuntamento: ${title}` : `❌ Appuntamento annullato: ${title}`,
      content: notifContent,
      timestamp: new Date().toISOString(),
      read: false,
      replied: false,
      metadata: { type: 'calendly_booking', booking_id: booking.id },
    })

    return NextResponse.json({ ok: true, bookingId: booking.id })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Calendly webhook error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
