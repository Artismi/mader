import path from 'path'
import fs from 'fs/promises'
import os from 'os'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const file = url.searchParams.get('file')

  if (!file || file.includes('..') || file.includes('/') || file.includes('\\')) {
    return new Response('File non valido', { status: 400 })
  }

  const filepath = path.join(os.tmpdir(), 'creative-os-office', file)

  try {
    const buffer = await fs.readFile(filepath)
    const ext = path.extname(file).slice(1).toLowerCase()

    const mimeTypes: Record<string, string> = {
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    }

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeTypes[ext] ?? 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${file}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    return new Response('File non trovato', { status: 404 })
  }
}
