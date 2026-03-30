import { google, drive_v3 } from 'googleapis'
import { createClient } from '@/lib/supabase/server'

/**
 * Restituisce un client Drive autenticato usando il token Google
 * salvato nella tabella user_tokens dopo il login OAuth.
 */
export async function getDriveClient(): Promise<drive_v3.Drive> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non autenticato')

    const { data: tokenData, error } = await supabase
        .from('user_tokens')
        .select('provider_token, provider_refresh_token')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .single()

    if (error || !tokenData?.provider_token) {
        throw new Error('Token Google non trovato. Esci e rifai il login con Google.')
    }

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
    )
    oauth2Client.setCredentials({
        access_token: tokenData.provider_token,
        refresh_token: tokenData.provider_refresh_token ?? undefined,
    })

    // Salva il nuovo access token se viene refreshato automaticamente
    oauth2Client.on('tokens', async (tokens) => {
        if (tokens.access_token) {
            await supabase
                .from('user_tokens')
                .update({ provider_token: tokens.access_token, updated_at: new Date().toISOString() })
                .eq('user_id', user.id)
                .eq('provider', 'google')
        }
    })

    return google.drive({ version: 'v3', auth: oauth2Client })
}

/**
 * Trova o crea una cartella in Drive per path.
 * Restituisce l'ID della cartella.
 */
export async function findOrCreateFolder(
    drive: drive_v3.Drive,
    name: string,
    parentId?: string
): Promise<string> {
    // Cerca se esiste già
    const query = parentId
        ? `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`
        : `name='${name}' and mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false`

    const existing = await drive.files.list({
        q: query,
        fields: 'files(id, name)',
        spaces: 'drive',
    })

    if (existing.data.files && existing.data.files.length > 0) {
        return existing.data.files[0].id!
    }

    // Crea la cartella
    const folder = await drive.files.create({
        requestBody: {
            name,
            mimeType: 'application/vnd.google-apps.folder',
            ...(parentId ? { parents: [parentId] } : {}),
        },
        fields: 'id',
    })

    return folder.data.id!
}

/**
 * Crea la struttura completa del vault per un cliente:
 * /_CLIENTI/[Nome]/{progetti/, asset/, documenti/, _vault.md}
 * Restituisce gli ID della cartella principale e delle sottocartelle.
 */
export async function createClientVault(drive: drive_v3.Drive, clientName: string): Promise<{
    folderId: string
    progettiId: string
    assetId: string
    documentiId: string
}> {
    // 1. Root _CLIENTI
    const rootId = await findOrCreateFolder(drive, '_CLIENTI')

    // 2. Cartella cliente
    const folderId = await findOrCreateFolder(drive, clientName, rootId)

    // 3. Sottocartelle standard (in parallelo)
    const [progettiId, assetId, documentiId] = await Promise.all([
        findOrCreateFolder(drive, 'progetti', folderId),
        findOrCreateFolder(drive, 'asset', folderId),
        findOrCreateFolder(drive, 'documenti', folderId),
    ])

    // 4. File _vault.md con istruzioni iniziali
    await drive.files.create({
        requestBody: {
            name: '_vault.md',
            mimeType: 'application/vnd.google-apps.document',
            parents: [folderId],
        },
    }).catch(() => { /* ignora se già esiste */ })

    return { folderId, progettiId, assetId, documentiId }
}

/**
 * Crea un nuovo documento Google (Doc o Spreadsheet) in una cartella.
 */
export async function createDocument(
    drive: drive_v3.Drive,
    name: string,
    folderId: string,
    type: 'doc' | 'sheet' = 'doc'
): Promise<{ id: string; webViewLink: string }> {
    const mimeType = type === 'sheet'
        ? 'application/vnd.google-apps.spreadsheet'
        : 'application/vnd.google-apps.document'

    const file = await drive.files.create({
        requestBody: { name, mimeType, parents: [folderId] },
        fields: 'id, webViewLink',
    })

    return {
        id: file.data.id!,
        webViewLink: file.data.webViewLink!,
    }
}

/**
 * Lista i file recenti in una cartella Drive.
 */
export async function listFolderFiles(drive: drive_v3.Drive, folderId: string) {
    const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id, name, mimeType, modifiedTime, webViewLink, iconLink)',
        orderBy: 'modifiedTime desc',
        pageSize: 20,
        spaces: 'drive',
    })
    return res.data.files || []
}
