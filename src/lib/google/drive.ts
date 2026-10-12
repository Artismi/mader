import { google, drive_v3 } from 'googleapis'
import { Readable } from 'node:stream'
import { googleAuth } from './auth'

/**
 * Client Drive autenticato con i token Google salvati in SQLite
 * (stesso accesso di Gmail e Calendar, con rinnovo automatico).
 */
export async function getDriveClient(): Promise<drive_v3.Drive> {
    const auth = googleAuth()
    if (!auth) throw new Error('Google non collegato: accedi di nuovo con Google')
    return google.drive({ version: 'v3', auth })
}

// gli apici nei nomi (es. "L'Officina") romperebbero la query di Drive
const q = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

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
        ? `name='${q(name)}' and mimeType='application/vnd.google-apps.folder' and '${q(parentId)}' in parents and trashed=false`
        : `name='${q(name)}' and mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false`

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
        q: `'${q(folderId)}' in parents and trashed=false`,
        fields: 'files(id, name, mimeType, modifiedTime, webViewLink, iconLink)',
        orderBy: 'modifiedTime desc',
        pageSize: 20,
        spaces: 'drive',
    })
    return res.data.files || []
}

/**
 * Carica (o sostituisce, se c'è già un file con lo stesso nome) un file binario in una cartella.
 */
export async function uploadFile(
    drive: drive_v3.Drive,
    name: string,
    folderId: string,
    mimeType: string,
    data: Uint8Array,
): Promise<{ id: string; webViewLink: string }> {
    const media = { mimeType, body: Readable.from(Buffer.from(data)) }
    const existing = await drive.files.list({
        q: `name='${q(name)}' and '${q(folderId)}' in parents and trashed=false`,
        fields: 'files(id)',
        spaces: 'drive',
    })
    const id = existing.data.files?.[0]?.id
    const file = id
        ? await drive.files.update({ fileId: id, media, fields: 'id, webViewLink' })
        : await drive.files.create({ requestBody: { name, parents: [folderId] }, media, fields: 'id, webViewLink' })
    return { id: file.data.id!, webViewLink: file.data.webViewLink! }
}
