import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Route pubbliche che non richiedono autenticazione
const PUBLIC_PATHS = ['/login', '/auth']
// API route che devono restare aperte (OAuth callback, webhook Calendly)
const PUBLIC_API_PATHS = ['/api/auth', '/api/webhooks']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Percorsi sempre pubblici
  const isPublicPage = PUBLIC_PATHS.some(p => pathname.startsWith(p))
  const isPublicApi = PUBLIC_API_PATHS.some(p => pathname.startsWith(p))
  const isOverlay = pathname === '/overlay'

  if (isPublicPage || isPublicApi || isOverlay) {
    return NextResponse.next({ request })
  }

  // Costruisce il client Supabase per verificare la sessione
  let supabaseResponse = NextResponse.next({
    request,
  })
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // API route → 401 JSON (non fare redirect)
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
    }
    // Pagine → redirect al login
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
