import { NextResponse } from 'next/server'
import { config } from '@/lib/db'
import { DEFAULT_ARCHITECTURE } from '@/lib/ai/defaults'

export async function GET() {
  try {
    const architecture = config.get('architecture') || DEFAULT_ARCHITECTURE
    return NextResponse.json({ architecture })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { architecture } = await req.json()
    if (typeof architecture !== 'string') {
      return NextResponse.json({ error: 'Body non valido' }, { status: 400 })
    }
    
    config.set('architecture', architecture)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
