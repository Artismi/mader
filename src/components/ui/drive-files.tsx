'use client'

import { useEffect, useState } from 'react'
import { FileText, Image, Film, File, ExternalLink, Loader2, FolderOpen } from 'lucide-react'

interface DriveFile {
    id: string
    name: string
    mimeType: string
    modifiedTime: string
    webViewLink: string
    iconLink?: string
}

function getFileIcon(mimeType: string) {
    if (mimeType.includes('image')) return <Image className="w-4 h-4 text-blue-500" />
    if (mimeType.includes('video')) return <Film className="w-4 h-4 text-purple-500" />
    if (mimeType.includes('document') || mimeType.includes('pdf')) return <FileText className="w-4 h-4 text-red-500" />
    if (mimeType.includes('spreadsheet')) return <FileText className="w-4 h-4 text-green-500" />
    return <File className="w-4 h-4 text-gray-400" />
}

export function DriveFiles({ folderId, folderName }: { folderId: string; folderName: string }) {
    const [files, setFiles] = useState<DriveFile[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        fetch(`/api/drive/files?folderId=${folderId}`)
            .then(r => r.json())
            .then(data => {
                if (data.error) setError(data.error)
                else setFiles(data.files || [])
            })
            .catch(() => setError('Errore nel caricamento dei file Drive'))
            .finally(() => setLoading(false))
    }, [folderId])

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-sm text-primary/40 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Caricamento Drive...
            </div>
        )
    }

    if (error) {
        return (
            <p className="text-xs text-orange-600 italic">{error}</p>
        )
    }

    if (files.length === 0) {
        return (
            <div className="flex items-center gap-2 text-xs text-primary/40 italic">
                <FolderOpen className="w-4 h-4" />
                Cartella vuota
            </div>
        )
    }

    return (
        <div className="space-y-1.5">
            <p className="text-xs font-semibold text-primary/40 uppercase tracking-wider mb-3">
                File in {folderName}
            </p>
            {files.map(file => (
                <a
                    key={file.id}
                    href={file.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                    {getFileIcon(file.mimeType)}
                    <span className="text-sm text-primary/80 truncate flex-1 group-hover:text-accent transition-colors">
                        {file.name}
                    </span>
                    <ExternalLink className="w-3 h-3 text-primary/20 group-hover:text-accent shrink-0 transition-colors" />
                </a>
            ))}
        </div>
    )
}
