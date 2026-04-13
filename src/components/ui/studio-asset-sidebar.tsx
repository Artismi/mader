'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Folder, File, FileText, ChevronLeft, Search,
  Loader2, FolderOpen, LayoutGrid, List, Plus, Download, Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface VaultFile {
  name: string
  isDir: boolean
  size: number
  mtime: string
  ext: string
  relativePath: string
}

interface Props {
  client?: { id: string; name: string; vault_path?: string }
  onSelectAsset?: (asset: VaultFile & { url?: string }) => void
}

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif']
const VIDEO_EXTS = ['mp4', 'mov', 'webm', 'avi', 'mkv', 'm4v', '3gp', 'flv', 'wmv', 'mpeg', 'mpg']
const DOC_EXTS   = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'md']

function fileUrl(relativePath: string) {
  return `/api/vault/file?path=${encodeURIComponent(relativePath)}`
}

export function StudioAssetSidebar({ client, onSelectAsset }: Props) {
  const [currentPath, setCurrentPath] = useState('')
  const [files, setFiles]             = useState<VaultFile[]>([])
  const [loading, setLoading]         = useState(false)
  const [view, setView]               = useState<'grid' | 'list'>('grid')
  const [search, setSearch]           = useState('')
  const [preview, setPreview]         = useState<VaultFile | null>(null)

  const fetchFiles = useCallback(async (path: string) => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/vault/files?path=${encodeURIComponent(path)}`)
      const data = await res.json()
      if (data.files) { setFiles(data.files); setCurrentPath(data.currentPath) }
    } catch (err) {
      console.error('Failed to fetch vault files:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (client?.name) {
      const p = `_CLIENTI/${client.name}`
      fetchFiles(p)
    } else {
      fetchFiles('')
    }
  }, [client, fetchFiles])

  const navigateUp = () => {
    const parent = currentPath.split('/').slice(0, -1).join('/')
    fetchFiles(parent)
  }

  const handleFileClick = (f: VaultFile) => {
    if (f.isDir) { fetchFiles(f.relativePath); return }
    const isImg = IMAGE_EXTS.includes(f.ext)
    const isVid = VIDEO_EXTS.includes(f.ext)
    onSelectAsset?.({ ...f, url: (isImg || isVid) ? fileUrl(f.relativePath) : undefined })
  }

  const filtered = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <aside className="w-52 flex-shrink-0 flex flex-col border-r border-white/[0.06] bg-[#090909] z-20 overflow-hidden">

      {/* Header */}
      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
            <FolderOpen className="w-3 h-3" /> Vault Assets
          </h2>
          <div className="flex bg-white/[0.02] border border-white/10 rounded-lg p-0.5">
            <button onClick={() => setView('grid')} className={cn('p-1 rounded-md transition-all', view==='grid'?'bg-white/10 text-accent':'text-white/20')}><LayoutGrid className="w-3 h-3"/></button>
            <button onClick={() => setView('list')} className={cn('p-1 rounded-md transition-all', view==='list'?'bg-white/10 text-accent':'text-white/20')}><List className="w-3 h-3"/></button>
          </div>
        </div>
        <div className="relative group">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/20 group-focus-within:text-accent transition-colors"/>
          <input
            type="text" placeholder="Cerca…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-8 pr-3 py-1.5 text-[10px] text-white/60 placeholder:text-white/20 outline-none focus:border-accent/40 transition-all"
          />
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="px-3 pb-2 flex items-center gap-2">
        {currentPath && (
          <button onClick={navigateUp} className="p-1 rounded-md bg-white/[0.03] border border-white/10 text-white/40 hover:text-white hover:bg-accent/20 transition-all">
            <ChevronLeft className="w-3 h-3"/>
          </button>
        )}
        <div className="flex-1 truncate text-[8px] font-bold text-white/20 uppercase tracking-widest bg-white/[0.01] px-2 py-1 rounded">
          {currentPath || 'ROOT'}
        </div>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-2 py-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center pt-20 text-white/10 gap-3">
            <Loader2 className="w-5 h-5 animate-spin"/>
            <span className="text-[9px] uppercase tracking-widest font-black">Syncing…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 text-white/10 gap-2">
            <Folder className="w-5 h-5"/>
            <span className="text-[9px] uppercase tracking-widest font-black">Vuoto</span>
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map(f => (
              <AssetCard key={f.relativePath} file={f}
                onClick={() => handleFileClick(f)}
                onPreview={() => setPreview(f)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-0.5">
            {filtered.map(f => (
              <AssetRow key={f.relativePath} file={f}
                onClick={() => handleFileClick(f)}
                onPreview={() => setPreview(f)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Stats footer */}
      <div className="px-4 py-2 border-t border-white/[0.06]">
        <p className="text-[8px] font-black uppercase tracking-widest text-white/10">
          {filtered.length} elemento{filtered.length !== 1 ? 'i' : ''}
        </p>
      </div>

      {/* Image preview overlay */}
      {preview && IMAGE_EXTS.includes(preview.ext) && (
        <div className="absolute inset-0 z-50 bg-black/90 flex flex-col" onClick={() => setPreview(null)}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10" onClick={e => e.stopPropagation()}>
            <span className="text-[9px] font-black uppercase tracking-widest text-white/50 truncate">{preview.name}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => { handleFileClick(preview); setPreview(null) }}
                className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-accent hover:text-white">
                <Plus className="w-3 h-3"/> Canvas
              </button>
              <a href={fileUrl(preview.relativePath)} download={preview.name}
                className="text-white/30 hover:text-white">
                <Download className="w-3 h-3"/>
              </a>
              <button onClick={() => setPreview(null)} className="text-white/30 hover:text-white text-lg leading-none">×</button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fileUrl(preview.relativePath)} alt={preview.name} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"/>
          </div>
        </div>
      )}
    </aside>
  )
}

// ─── Video thumbnail ──────────────────────────────────────────────────────────

function VideoThumb({ src }: { src: string }) {
  return (
    <video
      src={src}
      muted
      playsInline
      preload="metadata"
      className="w-full h-full object-cover"
      onLoadedMetadata={e => {
        const v = e.currentTarget
        v.currentTime = 0.5
      }}
      onError={e => {
        const v = e.currentTarget
        v.style.display = 'none'
        const icon = document.createElement('span')
        v.parentElement?.appendChild(icon)
      }}
    />
  )
}

// ─── Card (grid view) ─────────────────────────────────────────────────────────

function AssetCard({ file, onClick, onPreview }: { file: VaultFile; onClick: () => void; onPreview: () => void }) {
  const isImg = IMAGE_EXTS.includes(file.ext)
  const isVid = VIDEO_EXTS.includes(file.ext)
  const isDoc = DOC_EXTS.includes(file.ext)

  return (
    <button onClick={onClick}
      className="group relative flex flex-col rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-accent/30 hover:bg-accent/5 transition-all text-left overflow-hidden h-28">

      {/* Thumbnail / icon area */}
      <div className="flex-1 flex items-center justify-center overflow-hidden bg-black/20">
        {file.isDir ? (
          <Folder className="w-8 h-8 text-accent/40 group-hover:scale-110 transition-transform"/>
        ) : isImg ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={fileUrl(file.relativePath)} alt={file.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            onError={e => { (e.target as HTMLImageElement).style.display='none' }}
          />
        ) : isVid ? (
          <VideoThumb src={fileUrl(file.relativePath)} />
        ) : isDoc ? (
          <FileText className="w-8 h-8 text-emerald-400/40 group-hover:scale-110 transition-transform"/>
        ) : (
          <File className="w-8 h-8 text-white/10 group-hover:scale-110 transition-transform"/>
        )}
      </div>

      {/* Name */}
      <div className="px-2 py-1.5">
        <p className="text-[9px] font-bold text-white/50 truncate group-hover:text-white/80 transition-colors">{file.name}</p>
        <span className="text-[7px] font-black uppercase text-white/10 tracking-widest">
          {file.isDir ? 'Cartella' : file.ext || 'file'}
        </span>
      </div>

      {/* Action buttons on hover */}
      {!file.isDir && (
        <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isImg && (
            <button onClick={e => { e.stopPropagation(); onPreview() }}
              className="p-1 rounded-md bg-black/60 text-white/60 hover:text-white border border-white/10">
              <Eye className="w-2.5 h-2.5"/>
            </button>
          )}
          <button onClick={e => { e.stopPropagation(); onClick() }}
            className="p-1 rounded-md bg-accent/80 text-black border border-accent/50">
            <Plus className="w-2.5 h-2.5"/>
          </button>
        </div>
      )}
    </button>
  )
}

// ─── Row (list view) ──────────────────────────────────────────────────────────

function AssetRow({ file, onClick, onPreview }: { file: VaultFile; onClick: () => void; onPreview: () => void }) {
  const isImg = IMAGE_EXTS.includes(file.ext)
  const isVid = VIDEO_EXTS.includes(file.ext)
  const isDoc = DOC_EXTS.includes(file.ext)

  return (
    <button onClick={onClick}
      className="group flex items-center gap-2.5 w-full px-2 py-2 rounded-lg hover:bg-white/[0.04] transition-all text-left">
      <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center flex-shrink-0">
        {file.isDir ? (
          <Folder className="w-4 h-4 text-accent/40"/>
        ) : isImg ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={fileUrl(file.relativePath)} alt="" className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display='none' }}/>
        ) : isVid ? (
          <VideoThumb src={fileUrl(file.relativePath)} />
        ) : isDoc ? (
          <FileText className="w-4 h-4 text-emerald-400/40"/>
        ) : (
          <File className="w-4 h-4 text-white/20"/>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-white/50 truncate group-hover:text-white/80">{file.name}</p>
        <span className="text-[8px] text-white/10 uppercase tracking-wider">{file.ext || (file.isDir ? 'dir' : 'file')}</span>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {isImg && (
          <button onClick={e => { e.stopPropagation(); onPreview() }} className="text-white/30 hover:text-white">
            <Eye className="w-3 h-3"/>
          </button>
        )}
      </div>
    </button>
  )
}
