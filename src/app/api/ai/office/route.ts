import { generateOfficeDocument } from '@/lib/ai/office-engine'

export const maxDuration = 120

export async function POST(req: Request) {
  try {
    const { prompt, doc_type } = await req.json()

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
      return new Response(JSON.stringify({ error: 'Prompt mancante o troppo corto' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const result = await generateOfficeDocument(prompt.trim(), doc_type ?? 'auto')

    return new Response(
      JSON.stringify({
        doc_type: result.doc_type,
        title: result.title,
        download_url: result.download_url,
        preview_text: result.preview_text,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[office-engine]', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
