import { NextResponse } from 'next/server'
import { getDriveClient, listFolderFiles } from '@/lib/google/drive'

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const folderId = searchParams.get('folderId')
        if (!folderId) {
            return NextResponse.json({ error: 'folderId obbligatorio' }, { status: 400 })
        }

        const drive = await getDriveClient()
        const files = await listFolderFiles(drive, folderId)

        return NextResponse.json({ files })
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
