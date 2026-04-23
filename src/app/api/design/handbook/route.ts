import { loadClientHandbook, handbookToAgentContext } from '@/lib/design/handbook'

export async function GET(req: Request) {
  const client = new URL(req.url).searchParams.get('client') ?? ''
  if (!client) {
    return new Response('Parametro client mancante', { status: 400 })
  }

  const handbook = loadClientHandbook(client)
  if (!handbook) {
    return new Response(
      `Handbook non trovato per '${client}'. ` +
      `Crea il file vault/clienti/${client.toLowerCase().replace(/\s+/g, '-')}-handbook.md dal template.`,
      { status: 404 }
    )
  }

  return new Response(handbookToAgentContext(handbook), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
