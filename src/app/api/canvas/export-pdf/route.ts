import { PDFDocument } from 'pdf-lib'
import { NextResponse } from 'next/server'

// POST body: { artboards: { name: string, dataUrl: string, width: number, height: number }[] }
export async function POST(req: Request) {
  try {
    const { artboards } = await req.json()
    if (!Array.isArray(artboards) || artboards.length === 0) {
      return NextResponse.json({ error: 'No artboards provided' }, { status: 400 })
    }

    const pdf = await PDFDocument.create()

    for (const ab of artboards) {
      const { dataUrl, width, height } = ab
      if (!dataUrl || !width || !height) continue

      // Strip the data URL prefix to get raw base64
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, '').replace(/^data:image\/jpeg;base64,/, '')
      const bytes = Buffer.from(base64, 'base64')

      let pdfImage
      if (dataUrl.startsWith('data:image/jpeg')) {
        pdfImage = await pdf.embedJpg(bytes)
      } else {
        pdfImage = await pdf.embedPng(bytes)
      }

      // PDF points: 1px ≈ 0.75pt (72dpi). Use 1:1 for screen export.
      const page = pdf.addPage([width, height])
      page.drawImage(pdfImage, { x: 0, y: 0, width, height })
    }

    const pdfBytes = await pdf.save()

    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="progetto.pdf"',
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
