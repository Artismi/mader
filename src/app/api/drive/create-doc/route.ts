import { NextResponse } from 'next/server'
import { getDriveClient, createDocument } from '@/lib/google/drive'

export async function POST(req: Request) {
    try {
        const { name, folderId, type } = await req.json()
        if (!name || !folderId) {
            return NextResponse.json({ error: 'name e folderId obbligatori' }, { status: 400 })
        }

        const drive = await getDriveClient()
        const doc = await createDocument(drive, name, folderId, type || 'doc')

        return NextResponse.json({ success: true, ...doc })
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
