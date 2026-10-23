import { NextResponse } from 'next/server'
import { clients } from '@/lib/db'
import { getDriveClient, createClientVault } from '@/lib/google/drive'

export async function POST(req: Request) {
    try {
        const { clientId, clientName } = await req.json()
        if (!clientId || !clientName) {
            return NextResponse.json({ error: 'clientId e clientName obbligatori' }, { status: 400 })
        }

        const drive = await getDriveClient()
        const { folderId, progettiId, assetId, documentiId } = await createClientVault(drive, clientName)

        clients.update(clientId, {
            drive_folder_id: folderId,
            drive_progetti_id: progettiId,
            drive_asset_id: assetId,
            drive_documenti_id: documentiId,
            vault_path: `/_CLIENTI/${clientName}/`,
        })

        return NextResponse.json({ success: true, folderId, progettiId, assetId, documentiId })
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[Drive setup-client]', msg)
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
