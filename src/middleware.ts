import { NextResponse, type NextRequest } from 'next/server'

// Middleware leggero — nessun auth check bloccante.
// L'app è locale (Electron + SQLite): i token Google sono in SQLite,
// non serve proteggere ogni pagina con una chiamata di rete a Supabase.
export async function middleware(request: NextRequest) {
  return NextResponse.next({ request })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
