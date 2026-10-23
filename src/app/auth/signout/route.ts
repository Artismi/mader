import { NextResponse } from 'next/server'
import { tokens } from '@/lib/db'
import { appOrigin } from '@/lib/app-origin'

// Logout locale: rimuove il token Google da SQLite e torna al login
export async function POST() {
    tokens.remove('google')
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL || appOrigin()))
}
