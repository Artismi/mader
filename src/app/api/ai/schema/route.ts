import { generateConceptualSchema } from '@/lib/ai/schema-engine'

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json()

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
      return new Response(JSON.stringify({ error: 'Prompt mancante o troppo corto' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { svg, sceneGraph } = await generateConceptualSchema(prompt.trim())

    return new Response(
      JSON.stringify({
        svg,
        title: sceneGraph.title,
        layout_type: sceneGraph.layout_type,
        node_count: sceneGraph.nodes.length,
        edge_count: sceneGraph.edges.length,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[schema-engine]', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
