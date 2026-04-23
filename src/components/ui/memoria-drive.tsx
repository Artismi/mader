'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Folder, FolderOpen, FileText, FileImage, FileType2, File,
  Plus, Upload, Trash2, Edit3, ChevronRight, Home, RefreshCw,
  Network, HardDrive, Loader2, AlertCircle, X, Check, FolderPlus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { BrainGraph } from '@/components/ui/brain-graph'

// ─── Types ────────────────────────────────────────────────────────────────────

interface VaultFile {
  name: string
  isDir: boolean
  size: number
  mtime: string
  ext: string
  relativePath: string
  indexStatus: 'pending' | 'indexing' | 'indexed' | 'error' | null
  errorMsg: string | null
  chunkCount: number
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function fileIcon(ext: string, isDir: boolean) {
  if (isDir) return Folder
  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return FileImage
  if (ext === 'pdf') return FileType2
  if (ext === 'docx') return FileText
  if (ext === 'md' || ext === 'txt') return FileText
  return File
}

function fileTypeLabel(ext: string) {
  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return 'Immagine'
  if (ext === 'pdf') return 'PDF'
  if (ext === 'docx') return 'Word'
  if (ext === 'md') return 'Nota'
  if (ext === 'txt') return 'Testo'
  return ext.toUpperCase()
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, errorMsg }: { status: VaultFile['indexStatus']; errorMsg: string | null }) {
  if (!status) return null
  if (status === 'indexed') return (
    <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold" title="Indicizzato">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
    </span>
  )
  if (status === 'indexing' || status === 'pending') return (
    <span className="flex items-center gap-1 text-white/30 text-[10px]" title="Elaborazione in corso...">
      <Loader2 className="w-3 h-3 animate-spin" />
    </span>
  )
  if (status === 'error') return (
    <span className="flex items-center gap-1 text-red-400 text-[10px]" title={errorMsg ?? 'Errore'}>
      <AlertCircle className="w-3 h-3" />
    </span>
  )
  return null
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MemoriaDrive() {
  const [view, setView] = useState<'drive' | 'graph'>('drive')
  const [currentPath, setCurrentPath] = useState('')
  const [files, setFiles] = useState<VaultFile[]>([])
  const [loading, setLoading] = useState(true)
  const [vaultNotConfigured, setVaultNotConfigured] = useState(false)
  const [newVaultPath, setNewVaultPath] = useState('')
  const [savingPath, setSavingPath] = useState(false)
  const [selectedFile, setSelectedFile] = useState<VaultFile | null>(null)
  const [previewContent, setPreviewContent] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [newFolderMode, setNewFolderMode] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [hasIndexing, setHasIndexing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const newFolderRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ─── Fetch files ───────────────────────────────────────────────────────────

  const fetchFiles = useCallback(async (p = currentPath) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/vault/files?path=${encodeURIComponent(p)}`)
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'Vault path non configurato') setVaultNotConfigured(true)
        return
      }
      setVaultNotConfigured(false)
      const list: VaultFile[] = data.files ?? []
      setFiles(list)
      setHasIndexing(list.some(f => f.indexStatus === 'indexing' || f.indexStatus === 'pending'))
    } catch {
      setVaultNotConfigured(true)
    } finally {
      setLoading(false)
    }
  }, [currentPath])

  useEffect(() => {
    // Avvia watcher
    fetch('/api/vault', { method: 'POST', body: JSON.stringify({}) }).catch(() => {})
    fetchFiles(currentPath)
  }, []) // eslint-disable-line

  // Polling quando ci sono file in elaborazione
  useEffect(() => {
    if (hasIndexing) {
      pollRef.current = setInterval(() => fetchFiles(currentPath), 2500)
    } else {
      if (pollRef.current) clearInterval(pollRef.current)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [hasIndexing, currentPath, fetchFiles])

  // ─── Navigation ────────────────────────────────────────────────────────────

  const navigate = (relPath: string) => {
    setSelectedFile(null)
    setPreviewContent(null)
    setCurrentPath(relPath)
    fetchFiles(relPath)
  }

  const breadcrumbs = currentPath ? currentPath.split('/').filter(Boolean) : []

  // ─── Preview ───────────────────────────────────────────────────────────────

  const openPreview = async (file: VaultFile) => {
    setSelectedFile(file)
    setPreviewContent(null)
    if (['md', 'txt'].includes(file.ext)) {
      setPreviewLoading(true)
      try {
        const res = await fetch(`/api/vault/files/content?path=${encodeURIComponent(file.relativePath)}`)
        const data = await res.json()
        setPreviewContent(data.content ?? '')
      } catch { setPreviewContent('') }
      finally { setPreviewLoading(false) }
    }
  }

  // ─── Upload ────────────────────────────────────────────────────────────────

  const uploadFiles = async (fileList: FileList) => {
    setUploading(true)
    const form = new FormData()
    form.append('dir', currentPath)
    Array.from(fileList).forEach(f => form.append('files', f))
    try {
      await fetch('/api/vault/upload', { method: 'POST', body: form })
      fetchFiles(currentPath)
    } finally {
      setUploading(false)
    }
  }

  // ─── Drag & Drop ──────────────────────────────────────────────────────────

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files)
  }

  // ─── Folder ops ────────────────────────────────────────────────────────────

  const createFolder = async () => {
    if (!newFolderName.trim()) return
    const dir = currentPath ? `${currentPath}/${newFolderName.trim()}` : newFolderName.trim()
    await fetch('/api/vault/folder', { method: 'POST', body: JSON.stringify({ dir }), headers: { 'Content-Type': 'application/json' } })
    setNewFolderMode(false); setNewFolderName('')
    fetchFiles(currentPath)
  }

  const deleteItem = async (file: VaultFile) => {
    if (!confirm(`Eliminare "${file.name}"?`)) return
    await fetch('/api/vault/folder', { method: 'DELETE', body: JSON.stringify({ target: file.relativePath }), headers: { 'Content-Type': 'application/json' } })
    if (selectedFile?.relativePath === file.relativePath) { setSelectedFile(null); setPreviewContent(null) }
    fetchFiles(currentPath)
  }

  const startRename = (file: VaultFile) => {
    setRenaming(file.relativePath)
    setRenameValue(file.name)
  }

  const confirmRename = async (file: VaultFile) => {
    if (!renameValue.trim() || renameValue === file.name) { setRenaming(null); return }
    const parts = file.relativePath.split('/')
    const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : ''
    const toPath = dir ? `${dir}/${renameValue.trim()}` : renameValue.trim()
    await fetch('/api/vault/folder', { method: 'PATCH', body: JSON.stringify({ from: file.relativePath, to: toPath }), headers: { 'Content-Type': 'application/json' } })
    setRenaming(null)
    fetchFiles(currentPath)
  }

  // ─── Vault setup ──────────────────────────────────────────────────────────

  const saveVaultPath = async () => {
    setSavingPath(true)
    try {
      await fetch('/api/vault', { method: 'POST', body: JSON.stringify({ vaultPath: newVaultPath }), headers: { 'Content-Type': 'application/json' } })
      fetchFiles('')
    } finally { setSavingPath(false) }
  }

  // ─── Vault not configured ─────────────────────────────────────────────────

  if (vaultNotConfigured) return (
    <div className="flex items-center justify-center h-full w-full">
      <div className="w-full max-w-sm p-8 bg-white/5 rounded-3xl border border-white/10 space-y-4">
        <h2 className="text-white font-bold text-base">Configura cartella Memoria</h2>
        <p className="text-white/40 text-xs">Scegli una cartella locale. Tutto quello che ci metti sarà disponibile all&apos;AI.</p>
        <input
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white/80 text-xs focus:outline-none focus:border-white/30"
          placeholder="es. C:/Users/Acer/Documents/memoria"
          value={newVaultPath}
          onChange={e => setNewVaultPath(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && saveVaultPath()}
        />
        <button onClick={saveVaultPath} disabled={savingPath || !newVaultPath.trim()}
          className="w-full py-2 bg-white text-black text-xs font-bold rounded-xl disabled:opacity-40">
          {savingPath ? 'Configurando...' : 'Usa questa cartella'}
        </button>
      </div>
    </div>
  )

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full w-full min-h-0 bg-[#08080a]">

      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-white/[0.06] shrink-0">
        {/* Toggle Drive / Grafo */}
        <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
          <button onClick={() => setView('drive')} className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all',
            view === 'drive' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
          )}>
            <HardDrive className="w-3.5 h-3.5" /> Drive
          </button>
          <button onClick={() => setView('graph')} className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all',
            view === 'graph' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
          )}>
            <Network className="w-3.5 h-3.5" /> Grafo
          </button>
        </div>

        {view === 'drive' && (
          <>
            {/* Breadcrumb */}
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <button onClick={() => navigate('')} className="text-white/40 hover:text-white transition-colors">
                <Home className="w-3.5 h-3.5" />
              </button>
              {breadcrumbs.map((crumb, i) => (
                <div key={i} className="flex items-center gap-1">
                  <ChevronRight className="w-3 h-3 text-white/20" />
                  <button
                    onClick={() => navigate(breadcrumbs.slice(0, i + 1).join('/'))}
                    className="text-white/60 hover:text-white text-xs transition-colors truncate max-w-[120px]"
                  >{crumb}</button>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => fetchFiles(currentPath)} className="p-1.5 text-white/30 hover:text-white/70 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => { setNewFolderMode(true); setTimeout(() => newFolderRef.current?.focus(), 50) }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-white/50 hover:text-white border border-white/10 hover:border-white/20 rounded-xl text-[11px] font-bold transition-all">
                <FolderPlus className="w-3.5 h-3.5" /> Cartella
              </button>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black rounded-xl text-[11px] font-bold hover:bg-white/90 transition-all disabled:opacity-50">
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                Carica
              </button>
              <input ref={fileInputRef} type="file" multiple className="hidden"
                accept=".md,.txt,.pdf,.docx,.png,.jpg,.jpeg,.webp"
                onChange={e => e.target.files && uploadFiles(e.target.files)} />
            </div>
          </>
        )}
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      {view === 'graph' ? (
        <div className="flex-1 min-h-0 p-4">
          <BrainGraph />
        </div>
      ) : (
        <div className="flex flex-1 min-h-0">

          {/* ── File area (drag & drop) ──────────────────────────────────────── */}
          <div
            className={cn('flex-1 min-w-0 overflow-y-auto relative', dragging && 'ring-2 ring-inset ring-white/20')}
            onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
          >
            {/* Drag overlay */}
            {dragging && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none">
                <div className="text-center space-y-2">
                  <Upload className="w-8 h-8 text-white/60 mx-auto" />
                  <p className="text-white/60 text-sm font-bold">Rilascia per caricare</p>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-6 h-6 animate-spin text-white/20" />
              </div>
            ) : (
              <div className="p-4 space-y-1">

                {/* New folder input */}
                {newFolderMode && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl mb-2">
                    <Folder className="w-4 h-4 text-white/40 shrink-0" />
                    <input
                      ref={newFolderRef}
                      className="flex-1 bg-transparent text-white/80 text-sm focus:outline-none"
                      placeholder="Nome cartella"
                      value={newFolderName}
                      onChange={e => setNewFolderName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') { setNewFolderMode(false); setNewFolderName('') } }}
                    />
                    <button onClick={createFolder} className="p-1 text-emerald-400 hover:text-emerald-300"><Check className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { setNewFolderMode(false); setNewFolderName('') }} className="p-1 text-white/30 hover:text-white/60"><X className="w-3.5 h-3.5" /></button>
                  </div>
                )}

                {files.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-white/20 space-y-2">
                    <FolderOpen className="w-10 h-10" />
                    <p className="text-sm">Cartella vuota — trascina file qui per caricarli</p>
                  </div>
                )}

                {files.map(file => {
                  const Icon = fileIcon(file.ext, file.isDir)
                  const isSelected = selectedFile?.relativePath === file.relativePath
                  const isRenaming = renaming === file.relativePath

                  return (
                    <div
                      key={file.relativePath}
                      onClick={() => file.isDir ? navigate(file.relativePath) : openPreview(file)}
                      className={cn(
                        'group flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all select-none',
                        isSelected ? 'bg-white/10' : 'hover:bg-white/[0.04]'
                      )}
                    >
                      <Icon className={cn('w-4 h-4 shrink-0',
                        file.isDir ? 'text-amber-400/70' :
                        ['png','jpg','jpeg','webp'].includes(file.ext) ? 'text-purple-400/70' :
                        file.ext === 'pdf' ? 'text-red-400/70' :
                        file.ext === 'docx' ? 'text-blue-400/70' : 'text-white/30'
                      )} />

                      {isRenaming ? (
                        <input
                          className="flex-1 bg-white/10 rounded px-2 py-0.5 text-sm text-white focus:outline-none"
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') confirmRename(file); if (e.key === 'Escape') setRenaming(null) }}
                          onClick={e => e.stopPropagation()}
                          autoFocus
                        />
                      ) : (
                        <span className="flex-1 min-w-0 text-sm text-white/80 truncate">{file.name}</span>
                      )}

                      {!file.isDir && !isRenaming && (
                        <span className="text-[10px] text-white/20 shrink-0 hidden group-hover:hidden">
                          {fileTypeLabel(file.ext)}
                        </span>
                      )}

                      {!file.isDir && !isRenaming && (
                        <span className="text-[10px] text-white/20 shrink-0">
                          {file.size ? formatSize(file.size) : ''}
                        </span>
                      )}

                      {!isRenaming && (
                        <div className="shrink-0 w-4 flex items-center justify-center">
                          <StatusBadge status={file.indexStatus} errorMsg={file.errorMsg} />
                        </div>
                      )}

                      {/* Context actions */}
                      {!isRenaming && (
                        <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={e => { e.stopPropagation(); startRename(file) }}
                            className="p-1 text-white/30 hover:text-white/70 rounded transition-colors">
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); deleteItem(file) }}
                            className="p-1 text-white/30 hover:text-red-400 rounded transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── Preview panel ────────────────────────────────────────────────── */}
          {selectedFile && (
            <div className="w-80 shrink-0 border-l border-white/[0.06] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
                <span className="text-xs text-white/60 font-bold truncate max-w-[200px]">{selectedFile.name}</span>
                <button onClick={() => { setSelectedFile(null); setPreviewContent(null) }} className="p-1 text-white/30 hover:text-white/70">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                {/* Metadata */}
                <div className="space-y-1.5">
                  <MetaRow label="Tipo" value={fileTypeLabel(selectedFile.ext)} />
                  <MetaRow label="Dimensione" value={formatSize(selectedFile.size)} />
                  <MetaRow label="Chunk indicizzati" value={String(selectedFile.chunkCount ?? 0)} />
                  {selectedFile.indexStatus && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Stato AI</span>
                      <div className="flex items-center gap-1">
                        <StatusBadge status={selectedFile.indexStatus} errorMsg={selectedFile.errorMsg} />
                        <span className="text-[10px] text-white/50">
                          {selectedFile.indexStatus === 'indexed' ? 'Indicizzato' :
                           selectedFile.indexStatus === 'indexing' ? 'Elaborazione...' :
                           selectedFile.indexStatus === 'pending' ? 'In attesa...' : 'Errore'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Preview contenuto */}
                {['png', 'jpg', 'jpeg', 'webp'].includes(selectedFile.ext) && (
                  <img src={`/api/vault/file?path=${encodeURIComponent(selectedFile.relativePath)}`}
                    className="w-full rounded-xl object-contain max-h-64 bg-white/5" alt={selectedFile.name} />
                )}

                {selectedFile.ext === 'pdf' && (
                  <div className="flex flex-col items-center gap-2">
                    <FileType2 className="w-10 h-10 text-red-400/50" />
                    <a href={`/api/vault/file?path=${encodeURIComponent(selectedFile.relativePath)}`}
                      target="_blank" rel="noreferrer"
                      className="text-[11px] text-white/50 hover:text-white/80 underline">
                      Apri PDF
                    </a>
                  </div>
                )}

                {(selectedFile.ext === 'md' || selectedFile.ext === 'txt') && (
                  previewLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-white/20" /></div>
                  ) : (
                    <pre className="text-[11px] text-white/50 whitespace-pre-wrap break-words leading-relaxed font-mono max-h-64 overflow-y-auto">
                      {previewContent?.slice(0, 2000) ?? ''}
                      {(previewContent?.length ?? 0) > 2000 && '\n\n[...]'}
                    </pre>
                  )
                )}

                {selectedFile.errorMsg && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-[10px] text-red-400 break-words">{selectedFile.errorMsg}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">{label}</span>
      <span className="text-[11px] text-white/60">{value}</span>
    </div>
  )
}
