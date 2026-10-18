/**
 * Origine HTTP del server Next in esecuzione (solo lato server).
 * Nel pacchetto Electron la porta è scelta all'avvio: electron/main.js passa
 * CREATIVE_OS_ORIGIN (es. http://127.0.0.1:51234). In sviluppo resta
 * NEXT_PUBLIC_APP_URL o localhost sulla porta di next dev.
 */
export function appOrigin(): string {
  return process.env.CREATIVE_OS_ORIGIN
    || process.env.NEXT_PUBLIC_APP_URL
    || `http://localhost:${process.env.PORT || 3000}`
}

/** Origine per le chiamate interne server → server (sempre su 127.0.0.1). */
export function internalOrigin(): string {
  return process.env.CREATIVE_OS_ORIGIN || `http://127.0.0.1:${process.env.PORT || 3000}`
}

/** Intestazioni per le chiamate interne: il token di sessione del pacchetto (vedi src/proxy.ts). */
export function internalHeaders(): Record<string, string> {
  const token = process.env.CREATIVE_OS_TOKEN
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'x-creative-os-token': token } : {}),
  }
}
