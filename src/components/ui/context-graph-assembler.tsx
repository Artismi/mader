'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { FolderOpen, FileText, Sparkles, X, Plus, ChevronDown, ChevronRight, Upload, Image, Loader2, Zap, BookOpen, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── ROLES ──────────────────────────────────────────────────────────────────────

type RoleKey = 'brand' | 'layout' | 'tone' | 'image' | 'data' | 'document' | 'inspiration'

const ROLES: Record<RoleKey, {
  label: string
  icon: string
  hint: string
  strokeColor: string   // SVG line color
  dotBg: string         // Tailwind bg
  dotText: string       // Tailwind text
  dotGlow: string       // box-shadow
}> = {
  brand:       { label: 'Brand DNA',     icon: '◈', hint: 'Identità visiva e brand guidelines',    strokeColor: 'rgba(251,191,36,0.7)',  dotBg: 'bg-amber-500',   dotText: 'text-white', dotGlow: '0 0 12px rgba(251,191,36,0.6)'  },
  layout:      { label: 'Layout ref',    icon: '⊞', hint: 'Ispirazione per composizione e layout', strokeColor: 'rgba(139,92,246,0.7)',   dotBg: 'bg-violet-500',  dotText: 'text-white', dotGlow: '0 0 12px rgba(139,92,246,0.6)'  },
  tone:        { label: 'Tono voce',     icon: '◎', hint: 'Stile di scrittura e copy da replicare',strokeColor: 'rgba(59,130,246,0.7)',   dotBg: 'bg-blue-500',    dotText: 'text-white', dotGlow: '0 0 12px rgba(59,130,246,0.6)'   },
  image:       { label: 'Asset visivo',  icon: '⬚', hint: 'Immagine da includere nel post/layout',  strokeColor: 'rgba(16,185,129,0.7)',  dotBg: 'bg-emerald-500', dotText: 'text-white', dotGlow: '0 0 12px rgba(16,185,129,0.6)'  },
  data:        { label: 'Dati',          icon: '≡', hint: 'Dati numerici o statistiche da usare',  strokeColor: 'rgba(14,165,233,0.7)',  dotBg: 'bg-sky-500',     dotText: 'text-white', dotGlow: '0 0 12px rgba(14,165,233,0.6)'  },
  document:    { label: 'Documento',     icon: '☰', hint: 'Analisi o brief da cui estrarre info',  strokeColor: 'rgba(217,70,239,0.7)', dotBg: 'bg-fuchsia-500', dotText: 'text-white', dotGlow: '0 0 12px rgba(217,70,239,0.6)'  },
  inspiration: { label: 'Ispirazione',   icon: '✦', hint: 'Riferimento creativo, non letterale',    strokeColor: 'rgba(236,72,153,0.7)', dotBg: 'bg-pink-500',    dotText: 'text-white', dotGlow: '0 0 12px rgba(236,72,153,0.6)'  },
}

// ─── TYPES ───────────────────────────────────────────────────────────────────────

interface ActiveNode {
  id: string
  label: string
  type: 'client' | 'vault-file' | 'drive-file' | 'upload'
  role: RoleKey
  auto: boolean
  customInstruction?: string
  thumbnail?: string
  ref: React.RefObject<HTMLButtonElement | null>
}

interface DriveFile { id: string; name: string; mimeType: string; webViewLink: string }
interface VaultFile { name: string; isDir: boolean; ext: string; relativePath: string }
interface ClientData { id: string; name: string; drive_asset_id: string | null; drive_documenti_id: string | null; drive_progetti_id: string | null }

type SourceTab = 'clienti' | 'vault' | 'carica'

const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'])
const DOC_EXTS   = new Set(['pdf', 'docx', 'doc', 'txt', 'md', 'csv'])

function guessRole(name: string, ext: string): RoleKey {
  const n = name.toLowerCase()
  if (IMAGE_EXTS.has(ext)) return 'image'
  if (n.includes('brand') || n.includes('identit') || n.includes('logo')) return 'brand'
  if (n.includes('layout') || n.includes('template') || n.includes('ispiraz')) return 'layout'
  if (n.includes('brief') || n.includes('requis')) return 'document'
  if (n.includes('tone') || n.includes('voice') || n.includes('copy')) return 'tone'
  if (DOC_EXTS.has(ext)) return 'document'
  return 'inspiration'
}

// ─── SVG PIPELINE ────────────────────────────────────────────────────────────────

function SvgPipeline({
  activeNodes, receiverRef, onDotClick,
}: {
  activeNodes: ActiveNode[]
  receiverRef: React.RefObject<HTMLDivElement | null>
  onDotClick: (nodeId: string) => void
}) {
  const [paths, setPaths] = useState<{
    id: string; path: string; midX: number; midY: number
    role: RoleKey; auto: boolean
  }[]>([])
  const lastDigestRef = useRef('')

  const updatePaths = useCallback(() => {
    if (!receiverRef.current) return
    const rx = receiverRef.current.getBoundingClientRect()
    const targetX = rx.right
    const targetY = rx.top + rx.height / 2

    const newPaths = activeNodes.map(node => {
      if (!node.ref.current) return null
      const ex = node.ref.current.getBoundingClientRect()
      const startX = ex.left - 8
      const startY = ex.top + ex.height / 2
      const dx = (targetX - startX) * 0.45
      const pathStr = `M ${startX} ${startY} C ${startX - dx} ${startY}, ${targetX + dx} ${targetY}, ${targetX} ${targetY}`
      return {
        id: node.id,
        path: pathStr,
        midX: (startX + targetX) / 2,
        midY: (startY + targetY) / 2,
        role: node.role,
        auto: node.auto,
      }
    }).filter(Boolean) as typeof paths

    const digest = JSON.stringify(newPaths.map(p => p.path + p.role))
    if (digest !== lastDigestRef.current) {
      lastDigestRef.current = digest
      setPaths(newPaths)
    }
  }, [activeNodes, receiverRef])

  useEffect(() => {
    updatePaths()
    window.addEventListener('resize', updatePaths)
    const t = setInterval(() => requestAnimationFrame(updatePaths), 250)
    return () => { window.removeEventListener('resize', updatePaths); clearInterval(t) }
  }, [updatePaths])

  return (
    <div className="absolute inset-0 pointer-events-none z-0">
      <svg className="w-full h-full overflow-visible">
        <defs>
          {(Object.entries(ROLES) as [RoleKey, typeof ROLES[RoleKey]][]).map(([key, r]) => (
            <linearGradient key={key} id={`grad-${key}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={r.strokeColor.replace('0.7', '0.2')} />
              <stop offset="100%" stopColor={r.strokeColor} />
            </linearGradient>
          ))}
        </defs>

        {paths.map(p => (
          <path
            key={p.id}
            d={p.path}
            fill="none"
            stroke={`url(#grad-${p.role})`}
            strokeWidth={p.auto ? 1.5 : 2}
            strokeDasharray={p.auto ? "6 4" : "none"}
            style={{ animation: p.auto ? 'dash 8s linear infinite' : undefined }}
          />
        ))}
        <style dangerouslySetInnerHTML={{__html: '@keyframes dash { to { stroke-dashoffset: -80; } }'}} />
      </svg>

      {paths.map(p => {
        const role = ROLES[p.role]
        return (
          <button
            key={p.id}
            className={cn(
              "absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto",
              "w-6 h-6 rounded-full flex items-center justify-center transition-all group",
              role.dotBg, role.dotText,
            )}
            style={{ left: p.midX, top: p.midY, boxShadow: role.dotGlow }}
            onClick={() => onDotClick(p.id)}
          >
            <span className="text-[10px] font-bold leading-none">{role.icon}</span>
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap bg-black/90 border border-white/10 rounded-lg px-2.5 py-1.5 text-center z-50">
              <p className="text-[9px] font-black uppercase tracking-widest text-white">{role.label}</p>
              <p className="text-[8px] text-white/40 mt-0.5">{role.hint}</p>
              {p.auto && <p className="text-[8px] text-amber-400/80 mt-0.5">⚡ auto</p>}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ─── ROLE PICKER POPUP ───────────────────────────────────────────────────────────

function RolePickerPopup({
  node, onUpdate, onClose,
}: {
  node: ActiveNode
  onUpdate: (id: string, role: RoleKey, auto: boolean, custom?: string) => void
  onClose: () => void
}) {
  const [role, setRole] = useState<RoleKey>(node.role)
  const [auto, setAuto] = useState(node.auto)
  const [custom, setCustom] = useState(node.customInstruction ?? '')

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto">
      <div className="bg-[#0d0d10] border border-white/10 rounded-2xl w-[380px] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-white/80">{node.label}</p>
            <p className="text-[9px] text-white/30 mt-0.5">Definisci come l&apos;AI deve usare questo input</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg text-white/30 hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Role grid */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-3">Ruolo nel contesto</p>
            <div className="grid grid-cols-4 gap-2">
              {(Object.entries(ROLES) as [RoleKey, typeof ROLES[RoleKey]][]).map(([key, r]) => (
                <button
                  key={key}
                  onClick={() => setRole(key)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl border transition-all",
                    role === key
                      ? cn("border-white/20 bg-white/10 shadow-lg")
                      : "border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.05]"
                  )}
                  style={role === key ? { boxShadow: r.dotGlow } : undefined}
                >
                  <span className={cn(
                    "text-base leading-none",
                    role === key ? r.dotText.replace('text-white', `text-${r.dotBg.replace('bg-', '')}`) : "text-white/30"
                  )}
                    style={role === key ? { color: r.strokeColor } : undefined}
                  >
                    {r.icon}
                  </span>
                  <span className="text-[8px] font-bold text-center leading-tight text-white/40">{r.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Auto toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/60">⚡ Auto mode</p>
              <p className="text-[9px] text-white/25 mt-0.5">L&apos;AI decide autonomamente se usare questo input</p>
            </div>
            <button
              onClick={() => setAuto(!auto)}
              className={cn("w-10 h-5 rounded-full relative transition-all border", auto ? "bg-amber-500/30 border-amber-500/50" : "bg-white/10 border-white/10")}
            >
              <div className={cn("absolute top-0.5 w-4 h-4 rounded-full transition-all", auto ? "right-0.5 bg-amber-400" : "left-0.5 bg-white/20")} />
            </button>
          </div>

          {/* Custom instruction */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">Istruzione custom (opzionale)</p>
            <textarea
              value={custom}
              onChange={e => setCustom(e.target.value)}
              placeholder={`es. "${ROLES[role].hint} — ignora la sezione prezzi"`}
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-[11px] text-white/60 placeholder:text-white/15 focus:outline-none focus:border-white/20 transition-all resize-none font-mono"
              rows={2}
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-white/[0.06] flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-white/30 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all">
            Annulla
          </button>
          <button
            onClick={() => { onUpdate(node.id, role, auto, custom || undefined); onClose() }}
            className="px-5 py-2 rounded-xl bg-white/10 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/15 transition-all"
            style={{ boxShadow: ROLES[role].dotGlow }}
          >
            Applica — {ROLES[role].icon} {ROLES[role].label}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── SOURCE NODE BUTTON ──────────────────────────────────────────────────────────

function SourceNode({
  id, label, sublabel, ext, thumbnail,
  active, role, onToggle,
}: {
  id: string; label: string; sublabel?: string; ext?: string; thumbnail?: string
  active: boolean; role?: RoleKey
  onToggle: (id: string, label: string, el: HTMLButtonElement | null, ext?: string) => void
}) {
  const r = role ? ROLES[role] : null
  return (
    <button
      onClick={e => onToggle(id, label, e.currentTarget, ext)}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all group",
        active ? "bg-white/[0.07] border border-white/10" : "hover:bg-white/[0.04] border border-transparent"
      )}
      style={active && r ? { boxShadow: `inset 0 0 0 1px ${r.strokeColor}` } : undefined}
    >
      {thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbnail} alt="" className="w-7 h-7 rounded-lg object-cover flex-shrink-0 border border-white/10" />
      ) : ext && IMAGE_EXTS.has(ext) ? (
        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
          <Image className="w-3.5 h-3.5 text-emerald-400" />
        </div>
      ) : (
        <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
          <FileText className="w-3.5 h-3.5 text-white/20" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className={cn("text-[11px] font-semibold truncate", active ? "text-white/80" : "text-white/40 group-hover:text-white/60")}>{label}</p>
        {sublabel && <p className="text-[8px] text-white/20 font-mono truncate">{sublabel}</p>}
      </div>
      {active && r && (
        <span
          className={cn("text-[10px] flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center", r.dotBg, r.dotText)}
          style={{ boxShadow: r.dotGlow }}
        >
          {r.icon}
        </span>
      )}
      {!active && (
        <Plus className="w-3 h-3 text-white/10 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      )}
    </button>
  )
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────────

export function ContextGraphAssembler({ isActive, onExecute }: { isActive: boolean; onExecute: () => void }) {
  const receptorRef = useRef<HTMLDivElement>(null)

  // State
  const [activeNodes, setActiveNodes] = useState<ActiveNode[]>([])
  const [openDotId, setOpenDotId] = useState<string | null>(null)
  const [sourceTab, setSourceTab] = useState<SourceTab>('clienti')
  const [prompt, setPrompt] = useState('')

  // Clienti data
  const [clients, setClients] = useState<ClientData[]>([])
  const [expandedClient, setExpandedClient] = useState<string | null>(null)
  const [driveFiles, setDriveFiles] = useState<Record<string, DriveFile[]>>({})
  const [driveLoading, setDriveLoading] = useState<string | null>(null)
  const [driveFolderType, setDriveFolderType] = useState<Record<string, 'asset' | 'documenti' | 'progetti'>>({})

  // Vault data
  const [vaultFiles, setVaultFiles] = useState<VaultFile[]>([])
  const [vaultLoading, setVaultLoading] = useState(false)
  const [vaultPath, setVaultPath] = useState('')
  const [vaultDir, setVaultDir] = useState('')

  // Upload
  const [uploadedFiles, setUploadedFiles] = useState<{ id: string; name: string; ext: string; url: string }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load clients
  useEffect(() => {
    if (!isActive) return
    fetch('/api/clients')
      .then(r => r.json())
      .then(d => setClients(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [isActive])

  // Load vault files
  const loadVaultFiles = useCallback(async (dir = '') => {
    setVaultLoading(true)
    setVaultDir(dir)
    try {
      const res = await fetch(`/api/vault/files?path=${encodeURIComponent(dir)}`)
      const d = await res.json()
      if (res.ok) setVaultFiles(d.files || [])
    } catch { /* ignore */ } finally { setVaultLoading(false) }
  }, [])

  useEffect(() => {
    if (isActive && sourceTab === 'vault') loadVaultFiles('')
  }, [isActive, sourceTab, loadVaultFiles])

  // Load Drive files for a client folder
  const loadDriveFiles = useCallback(async (clientId: string, folderId: string, folderType: 'asset' | 'documenti' | 'progetti') => {
    const key = `${clientId}-${folderType}`
    if (driveFiles[key]) return
    setDriveLoading(key)
    setDriveFolderType(p => ({ ...p, [clientId]: folderType }))
    try {
      const res = await fetch(`/api/drive/files?folderId=${folderId}`)
      const d = await res.json()
      if (res.ok) setDriveFiles(p => ({ ...p, [key]: d.files || [] }))
    } catch { /* ignore */ } finally { setDriveLoading(null) }
  }, [driveFiles])

  // Toggle node
  const toggleNode = (
    id: string, label: string,
    el: HTMLButtonElement | null,
    type: ActiveNode['type'],
    ext?: string,
    thumbnail?: string,
  ) => {
    if (!el) return
    setActiveNodes(prev => {
      if (prev.find(n => n.id === id)) return prev.filter(n => n.id !== id)
      return [...prev, {
        id, label, type,
        role: guessRole(label, ext ?? ''),
        auto: false,
        thumbnail,
        ref: { current: el },
      }]
    })
  }

  const updateNode = (id: string, role: RoleKey, auto: boolean, custom?: string) => {
    setActiveNodes(prev => prev.map(n => n.id === id ? { ...n, role, auto, customInstruction: custom } : n))
  }

  const removeNode = (id: string) => setActiveNodes(prev => prev.filter(n => n.id !== id))

  // Local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.forEach(file => {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
      const url = URL.createObjectURL(file)
      const isImg = IMAGE_EXTS.has(ext)
      setUploadedFiles(prev => [...prev, {
        id: `upload-${Date.now()}-${file.name}`,
        name: file.name,
        ext,
        url: isImg ? url : '',
      }])
    })
    e.target.value = ''
  }

  // Export to Brain as context instructions
  const exportToBrain = async () => {
    if (activeNodes.length === 0) return
    for (const node of activeNodes) {
      const role = ROLES[node.role]
      const instruction = node.customInstruction
        ? `${role.label} — ${node.label}: ${node.customInstruction}`
        : `${node.auto ? '[Auto] ' : ''}${role.label}: usa "${node.label}" come ${role.hint.toLowerCase()}.`
      await fetch('/api/ai/brain', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'context_instruction', file_path: `context:${node.id}`, instructions: instruction }),
      })
    }
  }

  const openNode = openDotId ? activeNodes.find(n => n.id === openDotId) : null

  // ── Render ──

  const SOURCE_TABS: { key: SourceTab; icon: React.ReactNode; label: string }[] = [
    { key: 'clienti', icon: <Users className="w-3.5 h-3.5" />, label: 'Clienti' },
    { key: 'vault',   icon: <BookOpen className="w-3.5 h-3.5" />, label: 'Vault' },
    { key: 'carica',  icon: <Upload className="w-3.5 h-3.5" />, label: 'Carica' },
  ]

  return (
    <div className="w-full h-full flex flex-row relative text-white font-sans overflow-hidden">
      {/* BG */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_40%_50%,_rgba(139,92,246,0.06)_0%,_#050505_70%)] -z-10" />

      {/* SVG wires */}
      <SvgPipeline activeNodes={activeNodes} receiverRef={receptorRef} onDotClick={setOpenDotId} />

      {/* Role picker popup */}
      {openNode && (
        <RolePickerPopup
          node={openNode}
          onUpdate={updateNode}
          onClose={() => setOpenDotId(null)}
        />
      )}

      {/* ── LEFT: RECEPTOR ── */}
      <div className="w-[44%] h-full flex flex-col justify-center items-center p-10 z-10 gap-8">

        {/* Title */}
        <div className="text-center">
          <h2 className="text-xl font-black tracking-tight text-white/80">Context Assembler</h2>
          <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] mt-1">
            {activeNodes.length === 0 ? 'Nessuna sorgente collegata' : `${activeNodes.length} sorgente${activeNodes.length > 1 ? 'i' : ''} collegata${activeNodes.length > 1 ? 'e' : ''}`}
          </p>
        </div>

        {/* Brain orb */}
        <div
          ref={receptorRef}
          className="relative w-28 h-28 rounded-full border border-white/10 bg-black/60 flex items-center justify-center"
        >
          {activeNodes.length > 0 && (
            <div className="absolute inset-0 rounded-full bg-violet-500/5 animate-pulse" />
          )}
          <Sparkles className={cn("w-8 h-8 transition-all", activeNodes.length > 0 ? "text-violet-400" : "text-white/15")} />
          {/* Ring of role dots */}
          {activeNodes.slice(0, 6).map((n, i) => {
            const angle = (i / Math.max(activeNodes.length, 1)) * Math.PI * 2 - Math.PI / 2
            const r = 52
            const x = 50 + Math.cos(angle) * r
            const y = 50 + Math.sin(angle) * r
            const role = ROLES[n.role]
            return (
              <div
                key={n.id}
                className={cn("absolute w-4 h-4 rounded-full flex items-center justify-center text-[8px]", role.dotBg)}
                style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)', boxShadow: role.dotGlow }}
              >
                {role.icon}
              </div>
            )
          })}
        </div>

        {/* Connected nodes summary */}
        {activeNodes.length > 0 && (
          <div className="w-full max-w-xs space-y-1.5">
            {activeNodes.map(n => {
              const role = ROLES[n.role]
              return (
                <div key={n.id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.05] group">
                  <span
                    className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[9px] flex-shrink-0", role.dotBg)}
                    style={{ boxShadow: role.dotGlow }}
                  >
                    {role.icon}
                  </span>
                  <span className="text-[10px] text-white/60 flex-1 truncate">{n.label}</span>
                  {n.auto && <Zap className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />}
                  <button
                    onClick={() => removeNode(n.id)}
                    className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Prompt + execute */}
        <div className="w-full max-w-xs space-y-2">
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            rows={3}
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-[12px] text-white/70 placeholder:text-white/20 focus:outline-none focus:border-violet-500/30 transition-all resize-none"
            placeholder="Descrivi l'obiettivo. Il contesto assemblato fluirà nell'AI..."
          />
          <div className="flex gap-2">
            {activeNodes.length > 0 && (
              <button
                onClick={exportToBrain}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/40 text-[9px] font-black uppercase tracking-widest hover:bg-white/[0.08] transition-all"
              >
                <BookOpen className="w-3 h-3" />
                Salva in Brain
              </button>
            )}
            <button
              onClick={onExecute}
              className="flex-1 flex items-center justify-center gap-2 bg-white/90 text-black py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Innesca Chat
            </button>
          </div>
        </div>
      </div>

      {/* ── RIGHT: SOURCES ── */}
      <div className="flex-1 h-full border-l border-white/[0.05] bg-black/40 backdrop-blur-xl flex flex-col z-10 overflow-hidden">

        {/* Tab bar */}
        <div className="flex border-b border-white/[0.05] px-4 pt-4 gap-1 flex-shrink-0">
          {SOURCE_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setSourceTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-t-xl text-[10px] font-black uppercase tracking-widest transition-all border-b-2",
                sourceTab === tab.key
                  ? "text-white/80 border-violet-400 bg-white/[0.04]"
                  : "text-white/25 border-transparent hover:text-white/50"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
          <div className="flex-1" />
          <p className="text-[9px] text-white/15 uppercase tracking-widest self-center pb-2">
            Click = collega · Dot = ruolo
          </p>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-4">

          {/* ── CLIENTI ── */}
          {sourceTab === 'clienti' && (
            <div className="space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/20 px-1 mb-3">
                Seleziona vault cliente o file Drive
              </p>
              {clients.length === 0 && (
                <p className="text-[10px] text-white/20 italic px-1">Nessun cliente nel database.</p>
              )}
              {clients.map(client => {
                const isExpanded = expandedClient === client.id
                const clientActive = activeNodes.some(n => n.id === `client-${client.id}`)
                const folderType = driveFolderType[client.id] ?? 'asset'
                const driveKey = `${client.id}-${folderType}`
                const files = driveFiles[driveKey] ?? []

                return (
                  <div key={client.id} className="bg-white/[0.02] border border-white/[0.05] rounded-2xl overflow-hidden">
                    {/* Client header */}
                    <div className="flex items-center gap-1 px-2 py-1.5">
                      <button
                        onClick={() => setExpandedClient(isExpanded ? null : client.id)}
                        className="p-1.5 text-white/20 hover:text-white/60 transition-all"
                      >
                        {isExpanded
                          ? <ChevronDown className="w-3.5 h-3.5" />
                          : <ChevronRight className="w-3.5 h-3.5" />
                        }
                      </button>
                      <SourceNode
                        id={`client-${client.id}`}
                        label={client.name}
                        sublabel="vault DNA"
                        active={clientActive}
                        role={activeNodes.find(n => n.id === `client-${client.id}`)?.role}
                        onToggle={(id, label, el) => toggleNode(id, label, el, 'client', 'md')}
                      />
                    </div>

                    {/* Expanded: Drive folders */}
                    {isExpanded && (
                      <div className="border-t border-white/[0.04] px-3 pb-3 pt-2 space-y-2">
                        {/* Folder tabs */}
                        {(client.drive_asset_id || client.drive_documenti_id || client.drive_progetti_id) && (
                          <div className="flex gap-1 mb-2">
                            {(['asset', 'documenti', 'progetti'] as const).map(ft => {
                              const fid = ft === 'asset' ? client.drive_asset_id : ft === 'documenti' ? client.drive_documenti_id : client.drive_progetti_id
                              if (!fid) return null
                              return (
                                <button
                                  key={ft}
                                  onClick={() => {
                                    setDriveFolderType(p => ({ ...p, [client.id]: ft }))
                                    loadDriveFiles(client.id, fid, ft)
                                  }}
                                  className={cn(
                                    "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                    folderType === ft ? "bg-violet-500/20 text-violet-400" : "text-white/20 hover:text-white/40 hover:bg-white/[0.03]"
                                  )}
                                >
                                  {ft}
                                </button>
                              )
                            })}
                          </div>
                        )}

                        {driveLoading === driveKey ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="w-4 h-4 animate-spin text-white/20" />
                          </div>
                        ) : files.length === 0 ? (
                          <p className="text-[9px] text-white/15 italic px-1">
                            {client.drive_asset_id || client.drive_documenti_id ? 'Nessun file in questa cartella' : 'Drive non configurato'}
                          </p>
                        ) : files.map(f => {
                          const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
                          const nodeId = `drive-${f.id}`
                          return (
                            <SourceNode
                              key={f.id}
                              id={nodeId}
                              label={f.name}
                              sublabel={new Date(f.modifiedTime ?? '').toLocaleDateString('it-IT')}
                              ext={ext}
                              active={activeNodes.some(n => n.id === nodeId)}
                              role={activeNodes.find(n => n.id === nodeId)?.role}
                              onToggle={(id, label, el) => toggleNode(id, label, el, 'drive-file', ext)}
                            />
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── VAULT ── */}
          {sourceTab === 'vault' && (
            <div className="space-y-1">
              {/* Breadcrumb */}
              {vaultDir && (
                <button
                  onClick={() => {
                    const parent = vaultDir.split('/').slice(0, -1).join('/')
                    loadVaultFiles(parent)
                  }}
                  className="flex items-center gap-1.5 text-[9px] text-white/30 hover:text-white/60 transition-all mb-3 px-1"
                >
                  <ChevronRight className="w-3 h-3 rotate-180" />
                  <span className="font-mono">{vaultDir}</span>
                </button>
              )}
              {vaultLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-white/20" />
                </div>
              ) : vaultFiles.length === 0 ? (
                <p className="text-[10px] text-white/20 italic px-1 py-4 text-center">
                  Vault non configurato o cartella vuota
                </p>
              ) : vaultFiles.map(f => {
                if (f.isDir) {
                  return (
                    <button
                      key={f.relativePath}
                      onClick={() => loadVaultFiles(f.relativePath)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/[0.04] text-left group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                        <FolderOpen className="w-3.5 h-3.5 text-sky-400/50" />
                      </div>
                      <span className="text-[11px] text-white/40 group-hover:text-white/60 flex-1 truncate">{f.name}</span>
                      <ChevronRight className="w-3 h-3 text-white/15 group-hover:text-white/40 transition-all" />
                    </button>
                  )
                }
                const nodeId = `vault-${f.relativePath}`
                const active = activeNodes.some(n => n.id === nodeId)
                return (
                  <SourceNode
                    key={f.relativePath}
                    id={nodeId}
                    label={f.name}
                    sublabel={f.relativePath}
                    ext={f.ext}
                    active={active}
                    role={activeNodes.find(n => n.id === nodeId)?.role}
                    onToggle={(id, label, el) => toggleNode(id, label, el, 'vault-file', f.ext)}
                  />
                )
              })}
            </div>
          )}

          {/* ── CARICA ── */}
          {sourceTab === 'carica' && (
            <div className="space-y-3">
              {/* Drop zone */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-white/10 rounded-2xl py-8 flex flex-col items-center gap-3 hover:border-violet-500/30 hover:bg-violet-500/[0.02] transition-all group"
              >
                <Upload className="w-6 h-6 text-white/20 group-hover:text-violet-400 transition-all" />
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30 group-hover:text-white/50">Carica file</p>
                  <p className="text-[9px] text-white/15 mt-1">immagini, PDF, documenti</p>
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.docx,.doc,.txt,.md"
                className="hidden"
                onChange={handleFileUpload}
              />

              {/* Uploaded files */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/20 px-1">File caricati</p>
                  {uploadedFiles.map(f => {
                    const nodeId = `upload-${f.id}`
                    const active = activeNodes.some(n => n.id === nodeId)
                    return (
                      <SourceNode
                        key={f.id}
                        id={nodeId}
                        label={f.name}
                        ext={f.ext}
                        thumbnail={f.url || undefined}
                        active={active}
                        role={activeNodes.find(n => n.id === nodeId)?.role}
                        onToggle={(id, label, el) => toggleNode(id, label, el, 'upload', f.ext, f.url || undefined)}
                      />
                    )
                  })}
                </div>
              )}

              {/* Role legend */}
              <div className="pt-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/15 px-1 mb-2">Ruoli disponibili</p>
                <div className="space-y-1">
                  {(Object.entries(ROLES) as [RoleKey, typeof ROLES[RoleKey]][]).map(([, r]) => (
                    <div key={r.label} className="flex items-center gap-2.5 px-2 py-1">
                      <span className="text-[11px] w-4 text-center" style={{ color: r.strokeColor }}>{r.icon}</span>
                      <span className="text-[10px] font-bold text-white/50 w-24">{r.label}</span>
                      <span className="text-[9px] text-white/20">{r.hint}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
