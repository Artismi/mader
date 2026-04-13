import { NextResponse } from 'next/server'
import { quotes } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const { quoteId } = await req.json()
    if (!quoteId) return NextResponse.json({ error: 'quoteId mancante' }, { status: 400 })

    const invoice = quotes.convertToInvoice(quoteId)
    if (!invoice) {
      return NextResponse.json({ error: 'Conversione fallita o preventivo non trovato' }, { status: 400 })
    }

    // Optional: Mark the original quote as 'accettato' or something similar
    // Actually convertToInvoice handles the duplication.

    return NextResponse.json({ invoice })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
