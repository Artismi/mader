/**
 * Copia del PDF di un preventivo su Drive, nella cartella documenti del cliente
 * (/_CLIENTI/[Nome]/documenti, creata se manca). Solo lato server.
 */
import { clients, quotes, type Quote } from '@/lib/db'
import { createClientVault, findOrCreateFolder, getDriveClient, uploadFile } from '@/lib/google/drive'
import { pdfName } from './quote-pdf'

export async function archiveQuotePdf(q: Quote, pdf: Uint8Array): Promise<string> {
  const drive = await getDriveClient()
  const c = q.client_id ? clients.getById(q.client_id) : undefined
  let folderId = c?.drive_documenti_id
  if (c && !folderId) {
    const v = await createClientVault(drive, c.name)
    clients.update(c.id, { drive_folder_id: v.folderId, drive_progetti_id: v.progettiId, drive_asset_id: v.assetId, drive_documenti_id: v.documentiId })
    folderId = v.documentiId
  }
  if (!folderId) folderId = await findOrCreateFolder(drive, 'Senza cliente', await findOrCreateFolder(drive, '_CLIENTI'))
  const f = await uploadFile(drive, pdfName(q), folderId, 'application/pdf', pdf)
  quotes.update(q.id, { drive_pdf_url: f.webViewLink })
  return f.webViewLink
}
