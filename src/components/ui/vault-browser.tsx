'use client'

import { useState, useEffect } from 'react'
import { Folder, FileText, ChevronRight, ArrowLeft, Loader2, Search, Brain, FolderSearch } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VaultFile {
  name: string
  isDir: boolean
  size: number
  mtime: string
  ext: string
  relativePath: string
}

export function VaultBrowser({ onFileClick }: { onFileClick?: (path: string) => void } = {}) {
  const [currentPath, setCurrentPath] = useState('')
  const [files, setFiles] = useState<VaultFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<{ name: string; content: string } | null>(null)
  const [readingFile, setReadingFile] = useState(false)
  const [vaultNotConfigured, setVaultNotConfigured] = useState(false)
  const [newVaultPath, setNewVaultPath] = useState('')
  const [savingPath, setSavingPath] = useState(false)

  const fetchFiles = async (path: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/vault/files?path=${encodeURIComponent(path)}`)
      
      let data: any = {}
      try {
        data = await res.json()
      } catch (e) {
        throw new Error('Risposta del server non valida. (Controlla il vault path o il login)')
      }

      if (!res.ok) {
        if (res.status === 400 && data.error === 'Vault path non configurato') {
          setVaultNotConfigured(true)
        }
        throw new Error(data.error || 'Errore durante il caricamento dei file')
      }
      setFiles(Array.isArray(data.files) ? data.files : [])
      setCurrentPath(data.currentPath || '')
      setVaultNotConfigured(false)
    } catch (err: any) {
      if (err.message !== 'Vault path non configurato') {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const saveVaultPath = async () => {
    if (!newVaultPath.trim()) return
    setSavingPath(true)
    try {
      const res = await fetch('/api/vault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vaultPath: newVaultPath.trim().replace(/\//g, '\\') }),
      })
      if (!res.ok) throw new Error('Errore durante il salvataggio')
      setVaultNotConfigured(false)
      fetchFiles('')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSavingPath(false)
    }
  }

  const readFile = async (file: VaultFile) => {
    if (file.isDir) return
    // Se è in modalità navigate, delega al parent invece di preview inline
    if (onFileClick) {
      onFileClick(file.relativePath)
      return
    }
    setReadingFile(true)
    try {
      const res = await fetch(`/api/vault/files/content?path=${encodeURIComponent(file.relativePath)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Errore durante la lettura del file')
      setSelectedFile({ name: file.name, content: data.content })
    } catch (err: any) {
      alert(err.message)
    } finally {
      setReadingFile(false)
    }
  }

  useEffect(() => {
    fetchFiles('')
  }, [])

  const navigateTo = (path: string) => {
    setSelectedFile(null)
    fetchFiles(path)
  }

  const goBack = () => {
    if (!currentPath) return
    const parts = currentPath.split('/')
    parts.pop()
    navigateTo(parts.join('/'))
  }

  return (
    <div className="flex flex-col h-full bg-black/20 rounded-2xl border border-white/[0.06] overflow-hidden">
      {/* Header / Breadcrumbs */}
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-2 overflow-hidden">
          <button 
            onClick={() => navigateTo('')}
            className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-white/40 hover:text-white"
          >
            <Brain className="w-4 h-4" />
          </button>
          <ChevronRight className="w-3 h-3 text-white/10 shrink-0" />
          
          {currentPath ? (
            <div className="flex items-center gap-1 overflow-hidden">
              <button 
                onClick={goBack}
                className="flex items-center gap-1 text-[11px] font-bold text-accent/80 hover:text-accent transition-colors"
              >
                <ArrowLeft className="w-3 h-3" /> Su
              </button>
              <ChevronRight className="w-3 h-3 text-white/10 shrink-0" />
              <span className="text-[11px] text-white/60 truncate font-mono">
                {currentPath}
              </span>
            </div>
          ) : (
            <span className="text-[11px] font-black uppercase tracking-widest text-white/30">Root del Vault</span>
          )}
        </div>

        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* File List */}
        <div className={cn(
          "flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide",
          selectedFile ? "hidden lg:block w-1/3 border-r border-white/[0.06]" : "w-full"
        )}>
          {error && (
            <div className="p-4 text-center">
              <p className="text-xs text-red-400/80 bg-red-400/5 border border-red-400/10 rounded-xl py-3 px-4">
                {error}
              </p>
            </div>
          )}

          {!loading && files.length === 0 && !error && (
            <div className="p-12 text-center flex flex-col items-center gap-3">
              <Folder className="w-10 h-10 text-white/5" />
              <p className="text-xs text-white/20 italic font-medium">Cartella vuota</p>
            </div>
          )}

          {files.map((file) => (
            <button
              key={file.relativePath}
              onClick={() => file.isDir ? navigateTo(file.relativePath) : readFile(file)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
                selectedFile?.name === file.name 
                  ? "bg-accent/10 border border-accent/20 text-accent" 
                  : "hover:bg-white/[0.04] text-white/50 border border-transparent hover:border-white/[0.06]"
              )}
            >
              {file.isDir ? (
                <Folder className={cn("w-4 h-4 shrink-0", selectedFile?.name === file.name ? "text-accent" : "text-violet-400/40 group-hover:text-violet-400/60")} />
              ) : (
                <FileText className={cn("w-4 h-4 shrink-0", selectedFile?.name === file.name ? "text-accent" : "text-white/20 group-hover:text-white/40")} />
              )}
              <span className="text-xs font-medium truncate flex-1 text-left">{file.name}</span>
              {!file.isDir && (
                <span className="text-[9px] text-white/10 group-hover:text-white/20 font-mono">
                  {(file.size / 1024).toFixed(1)} KB
                </span>
              )}
              {file.isDir && <ChevronRight className="w-3 h-3 text-white/10 group-hover:text-white/30" />}
            </button>
          ))}
        </div>

        {/* File Preview */}
        {selectedFile && (
          <div className="flex-1 flex flex-col bg-black/40 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.02]">
              <h2 className="text-xs font-bold text-violet-100 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-accent" />
                {selectedFile.name}
              </h2>
              <button 
                onClick={() => setSelectedFile(null)}
                className="text-[10px] uppercase tracking-widest text-white/20 hover:text-white/50 transition-colors font-black"
              >
                Chiudi
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
              {readingFile ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-accent/50" />
                </div>
              ) : (
                <div className="prose prose-invert prose-sm max-w-none">
                  <pre className="text-[13px] leading-relaxed text-slate-300 font-sans whitespace-pre-wrap bg-transparent border-none p-0 selection:bg-accent/30">
                    {selectedFile.content}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Vault Setup Overlay */}
      {vaultNotConfigured && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#090909]/90 backdrop-blur-md p-6">
          <div className="max-w-md w-full glass-card p-8 border-accent/20 bg-accent/5 flex flex-col items-center text-center gap-6">
            <div className="w-16 h-16 rounded-3xl bg-accent/10 flex items-center justify-center">
              <FolderSearch className="w-8 h-8 text-accent" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-white px-2">Configura il tuo Vault</h3>
              <p className="text-xs text-white/40 leading-relaxed max-w-[280px]">
                Inserisci il percorso locale della cartella del tuo vault di Obsidian per iniziare la sincronizzazione.
              </p>
            </div>
            
            <div className="w-full space-y-3">
              <input 
                type="text"
                value={newVaultPath}
                onChange={e => setNewVaultPath(e.target.value)}
                placeholder="Es. C:/Users/Nome/Documents/Vault"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/10 focus:outline-none focus:border-accent/50 transition-all font-mono"
              />
              <button
                onClick={saveVaultPath}
                disabled={savingPath || !newVaultPath.trim()}
                className="w-full py-3 bg-accent/20 hover:bg-accent/30 text-accent rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all disabled:opacity-30 border border-accent/30"
              >
                {savingPath ? 'Salvataggio...' : 'Attiva Cervello'}
              </button>
            </div>
            
            <p className="text-[10px] text-white/20 italic">
              Il percorso deve contenere i tuoi file .md
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
