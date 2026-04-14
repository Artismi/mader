/**
 * Next.js Instrumentation Hook
 * Caricato automaticamente all'avvio del server (app router).
 *
 * Configura due pipeline di osservabilità:
 * - Phoenix (Arize) → OTLP/HTTP su localhost:6006 (locale, gratuito)
 * - LangSmith        → wrapping del modello in route.ts (vedi wrapAISDKModel)
 *
 * Variabili d'ambiente richieste (in .env.local):
 *   LANGCHAIN_TRACING_V2=true
 *   LANGCHAIN_API_KEY=lsv2_...
 *   LANGCHAIN_PROJECT=Canvas-AI-Monitor
 *   PHOENIX_COLLECTOR_ENDPOINT=http://localhost:6006   (opzionale, è il default)
 */

export async function register() {
  // Esegui solo nel runtime Node.js (non in Edge runtime)
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  const { NodeSDK } = await import('@opentelemetry/sdk-node')
  const { OTLPTraceExporter } = await import('@opentelemetry/exporter-trace-otlp-http')
  const { resourceFromAttributes } = await import('@opentelemetry/resources')

  const phoenixEndpoint =
    (process.env.PHOENIX_COLLECTOR_ENDPOINT ?? 'http://localhost:6006') + '/v1/traces'

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      'service.name': 'creative-os-canvas-agent',
      'service.version': '2.0',
    }),
    traceExporter: new OTLPTraceExporter({
      url: phoenixEndpoint,
      headers: {}, // Phoenix locale non richiede auth
    }),
  })

  sdk.start()

  // Graceful shutdown
  process.on('SIGTERM', () => { sdk.shutdown() })
  process.on('SIGINT',  () => { sdk.shutdown() })
}
