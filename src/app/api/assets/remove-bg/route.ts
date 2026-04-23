import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

export async function POST(req: Request) {
  try {
    const { source } = await req.json() as { source: string }
    if (!source) {
      return NextResponse.json({ error: 'source mancante' }, { status: 400 })
    }

    // Se rembg.js non è installato o token mancante → restituisci sorgente originale
    // (degradazione elegante: il canvas funziona comunque, solo senza scontornamento)
    const token = process.env.REMBG_TOKEN
    if (!token) {
      return NextResponse.json({
        outputUrl: source,
        outputPath: source,
        skipped: true,
        reason: 'REMBG_TOKEN non configurato — immagine usata senza scontornamento',
      })
    }

    // Verifica che rembg.js sia installato
    let Rembg: any
    try {
      const mod = await import('@remove-background-ai/rembg.js' as any)
      Rembg = mod.default || mod
    } catch {
      return NextResponse.json({
        outputUrl: source,
        outputPath: source,
        skipped: true,
        reason: 'rembg.js non installato — esegui: npm install @remove-background-ai/rembg.js',
      })
    }

    const rembg = new Rembg({ token })

    // Se è un URL remoto → lavora con URL direttamente
    if (source.startsWith('http')) {
      const result = await rembg.removeFromUrl(source)
      return NextResponse.json({ outputUrl: result, outputPath: result, skipped: false })
    }

    // Se è un path locale → produci output nella stessa directory con suffisso _nobg
    const ext = path.extname(source)
    const outputPath = source.replace(ext, `_nobg.png`)
    await rembg.remove(source, outputPath)

    if (fs.existsSync(outputPath)) {
      return NextResponse.json({ outputUrl: outputPath, outputPath, skipped: false })
    }

    return NextResponse.json({ outputUrl: source, outputPath: source, skipped: true, reason: 'Output non generato' })

  } catch (err: any) {
    return NextResponse.json({ error: err.message, outputUrl: '', skipped: true }, { status: 500 })
  }
}
