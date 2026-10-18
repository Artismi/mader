import { NextResponse, type NextRequest } from 'next/server'

// Guardia del server locale (fase 1, docs/lancio-sul-mercato.md §2).
// - Token di sessione: nel pacchetto Electron genera CREATIVE_OS_TOKEN a ogni avvio
//   e lo aggiunge come intestazione a ogni richiesta delle sue finestre; senza il
//   token il server risponde 401 (rete locale, altri programmi, browser).
//   In sviluppo il token non c'è e la guardia lascia passare.
// - Richieste da siti esterni: i metodi che scrivono si respingono se arrivano da
//   un'altra origine (Origin o Sec-Fetch-Site), anche in sviluppo.

const TOKEN_HEADER = 'x-creative-os-token'

const SCRIVE = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function stessoValore(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// "null" (iframe isolati, file://) o un'origine non valida non hanno host
function hostDi(origin: string): string | null {
  try { return new URL(origin).host } catch { return null }
}

export function proxy(request: NextRequest) {
  const token = process.env.CREATIVE_OS_TOKEN
  if (token && !stessoValore(request.headers.get(TOKEN_HEADER) ?? '', token)) {
    return new NextResponse('Non autorizzato', { status: 401 })
  }

  if (SCRIVE.has(request.method)) {
    const sito = request.headers.get('sec-fetch-site')
    const origin = request.headers.get('origin')
    // l'estensione Chrome di sviluppo (localhost:3000) resta ammessa solo senza token
    const estensione = !token && !!origin?.startsWith('chrome-extension://')
    const esterno =
      sito === 'cross-site' || sito === 'same-site' ||
      (!!origin && hostDi(origin) !== request.headers.get('host'))
    if (esterno && !estensione) {
      return new NextResponse('Origine non ammessa', { status: 403 })
    }
  }

  return NextResponse.next({ request })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
