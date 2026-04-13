import path from 'path'
import fs from 'fs'
import { config } from '@/lib/db'

const MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', svg: 'image/svg+xml', avif: 'image/avif',
  mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
  pdf: 'application/pdf',
  mp3: 'audio/mpeg', wav: 'audio/wav',
}

const VIDEO_EXTS = new Set(['mp4', 'mov', 'webm', 'avi', 'mkv', 'm4v', '3gp', 'flv', 'wmv', 'mpeg', 'mpg'])
const AUDIO_EXTS = new Set(['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'])

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const relativePath = searchParams.get('path')
    const vaultPath    = config.get('vault_path') as string | undefined

    if (!vaultPath)     return new Response('Vault non configurato', { status: 400 })
    if (!relativePath)  return new Response('Percorso mancante',     { status: 400 })

    const absolute = path.resolve(vaultPath, relativePath)
    if (!absolute.startsWith(path.resolve(vaultPath)))
      return new Response('Accesso negato', { status: 403 })
    if (!fs.existsSync(absolute) || fs.statSync(absolute).isDirectory())
      return new Response('File non trovato', { status: 404 })

    const ext  = path.extname(absolute).slice(1).toLowerCase()
    const mime = MIME[ext] || 'application/octet-stream'
    const stat = fs.statSync(absolute)
    const fileSize = stat.size
    const filename = path.basename(absolute)

    if (VIDEO_EXTS.has(ext) || AUDIO_EXTS.has(ext)) {
      const rangeHeader = (req.headers as Headers).get('range')
      if (rangeHeader) {
        const [startStr, endStr] = rangeHeader.replace(/bytes=/, '').split('-')
        const start = parseInt(startStr, 10)
        const end   = endStr ? parseInt(endStr, 10) : fileSize - 1
        const chunkSize = end - start + 1
        const buf = Buffer.alloc(chunkSize)
        const fd  = fs.openSync(absolute, 'r')
        fs.readSync(fd, buf, 0, chunkSize, start)
        fs.closeSync(fd)
        return new Response(buf, {
          status: 206,
          headers: {
            'Content-Type': mime,
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': String(chunkSize),
            'Cache-Control': 'public, max-age=3600',
            'Content-Disposition': `inline; filename="${filename}"`,
          },
        })
      }
      const buf = fs.readFileSync(absolute)
      return new Response(buf, {
        status: 200,
        headers: {
          'Content-Type': mime,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(fileSize),
          'Cache-Control': 'public, max-age=3600',
          'Content-Disposition': `inline; filename="${filename}"`,
        },
      })
    }

    const buf = fs.readFileSync(absolute)
    return new Response(buf, {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=3600',
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    })
  } catch (err) {
    return new Response(String(err), { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const relativePath = searchParams.get('path')
    const vaultPath    = config.get('vault_path') as string | undefined

    if (!vaultPath)     return new Response('Vault non configurato', { status: 400 })
    if (!relativePath)  return new Response('Percorso mancante',     { status: 400 })

    const absolute = path.resolve(vaultPath, relativePath)
    if (!absolute.startsWith(path.resolve(vaultPath)))
      return new Response('Accesso negato', { status: 403 })

    const { content } = await req.json()
    if (content === undefined) return new Response('Contenuto mancante', { status: 400 })

    fs.writeFileSync(absolute, content, 'utf8')

    if (absolute.endsWith('.md')) {
      const { indexFile } = await import('@/lib/vault')
      indexFile(absolute).catch(e => console.error('[vault] Auto-index failed:', e))
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(String(err), { status: 500 })
  }
}
