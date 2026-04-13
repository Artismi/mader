'use client'

import { useState } from 'react'
import { Plus, Check, X, Edit2 } from 'lucide-react'
import { updateClient } from '@/app/actions'
import { cn } from '@/lib/utils'

export function EditFigjamBtn({ clientId, initialId }: { clientId: string, initialId?: string | null }) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(initialId || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    let extractedId = value.trim()
    // Extract ID from full URL if pasted
    if (extractedId.includes('figma.com/board/')) {
        const parts = extractedId.split('figma.com/board/')
        if (parts.length > 1) {
            extractedId = parts[1].split(/[/?]/)[0]
        }
    }
    await updateClient(clientId, { figjam_board_id: extractedId || undefined })
    setSaving(false)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 mt-2 w-full max-w-sm">
        <label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Collega FigJam Board URL / ID</label>
        <div className="flex items-center gap-2">
            <input 
            type="text" 
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="Incolla l'URL del board Figma/Figjam..."
            className="flex-1 bg-black/40 text-xs text-white placeholder:text-white/20 border border-white/10 rounded-lg px-3 py-1.5 focus:outline-none focus:border-accent"
            autoFocus
            />
            <button 
            onClick={handleSave} disabled={saving}
            className="p-1.5 bg-accent/20 text-accent rounded-lg hover:bg-accent/40 disabled:opacity-50"
            >
                <Check className="w-3.5 h-3.5" />
            </button>
            <button 
            onClick={() => { setIsEditing(false); setValue(initialId || ''); }} disabled={saving}
            className="p-1.5 bg-white/5 text-white/40 rounded-lg hover:bg-white/10 disabled:opacity-50"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
      </div>
    )
  }

  return (
    <button 
      onClick={() => setIsEditing(true)}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
        initialId 
          ? "bg-white/[0.03] border border-white/[0.06] text-white/40 hover:bg-white/[0.08] hover:text-white/80" 
          : "bg-dashed border border-dashed border-white/20 text-white/30 hover:border-white/40 hover:text-white/60"
      )}
    >
      {initialId ? <><Edit2 className="w-2.5 h-2.5" /> FigJam</> : <><Plus className="w-3 h-3" /> Aggiungi FigJam</>}
    </button>
  )
}
