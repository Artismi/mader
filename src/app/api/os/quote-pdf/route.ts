import { NextResponse } from 'next/server'
import { quotes } from '@/lib/db'
import { pdfName, quotePdf } from '@/lib/finance/quote-pdf'

/** GET ?id=… → PDF del preventivo (aperto nel browser; ?download per salvarlo) */
export async function GET(req: Request) {
  const u = new URL(req.url)
  const q = quotes.getById(u.searchParams.get('id') ?? '')
  if (!q) return NextResponse.json({ error: 'Preventivo non trovato' }, { status: 404 })
  const bytes = await quotePdf(q)
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${u.searchParams.has('download') ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(pdfName(q))}`,
      'Cache-Control': 'no-store',
    },
  })
}
