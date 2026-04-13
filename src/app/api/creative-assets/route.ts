import { NextResponse } from 'next/server'
import { creativeAssets } from '@/lib/db'

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get('clientId')
    const type = searchParams.get('type')
    
    try {
        let assets
        if (clientId) assets = creativeAssets.getByClient(clientId)
        else assets = creativeAssets.getAll(type || undefined)
        
        return NextResponse.json(assets)
    } catch (e) {
        return NextResponse.json({ error: 'Errore fetch assets' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const id = creativeAssets.create(body)
        return NextResponse.json({ id })
    } catch (e) {
        return NextResponse.json({ error: 'Errore creazione asset' }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID mancante' }, { status: 400 })
    
    try {
        creativeAssets.delete(id)
        return NextResponse.json({ success: true })
    } catch (e) {
        return NextResponse.json({ error: 'Errore eliminazione asset' }, { status: 500 })
    }
}
