/**
 * Lettura del testo per il banco: la stessa funzione della route
 * /api/design/decompila, chiamata da Node con la chiave Gemini di .env.local
 * (la pagina del banco non vede mai la chiave).
 */
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { leggiConRipiego, MODELLI_GEMINI } from '@/components/studio/designer/decompila/visione'

export function lettore(apiKey: string) {
  const google = createGoogleGenerativeAI({ apiKey })
  const modelli = MODELLI_GEMINI.map(id => ({ model: google(id), label: id }))
  return (png: string) => leggiConRipiego(modelli, png)
}
