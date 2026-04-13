import React, { useState, useEffect, useMemo } from 'react'
import { X, Mail, Sparkles, Copy, Check, Instagram, MessageSquare, ArrowRight, Layout, ChevronUp, ChevronDown, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AnimTrack, AnimPreset } from './hooks/use-animation-engine'

interface ArtboardBundle {
  id: string
  name: string
  screenshot: string
  backgroundColor: string
  width: number
  height: number
  headline: string
  content: string
  rows: any[]
  palette: string[]
}

interface UniversalLaunchHubProps {
  data: {
    projectTitle: string
    artboards: ArtboardBundle[]
    globalPalette: string[]
    animationTracks?: AnimTrack[]
  }
  animationTracks?: AnimTrack[]
  onClose: () => void
}

// ── CSS animation helpers ─────────────────────────────────────────────────────

const PRESET_CSS: Record<AnimPreset, { keyframes: string; animation: string }> = {
  fadeIn:     { keyframes: '@keyframes lh-fadeIn{from{opacity:0}to{opacity:1}}',           animation: 'lh-fadeIn 0.8s ease-out both' },
  fadeOut:    { keyframes: '@keyframes lh-fadeOut{from{opacity:1}to{opacity:0}}',           animation: 'lh-fadeOut 0.8s ease-in both' },
  slideLeft:  { keyframes: '@keyframes lh-slideLeft{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}', animation: 'lh-slideLeft 0.7s ease-out both' },
  slideRight: { keyframes: '@keyframes lh-slideRight{from{transform:translateX(-40px);opacity:0}to{transform:translateX(0);opacity:1}}', animation: 'lh-slideRight 0.7s ease-out both' },
  slideUp:    { keyframes: '@keyframes lh-slideUp{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}', animation: 'lh-slideUp 0.7s ease-out both' },
  slideDown:  { keyframes: '@keyframes lh-slideDown{from{transform:translateY(-40px);opacity:0}to{transform:translateY(0);opacity:1}}', animation: 'lh-slideDown 0.7s ease-out both' },
  scaleIn:    { keyframes: '@keyframes lh-scaleIn{from{transform:scale(0.6);opacity:0}to{transform:scale(1);opacity:1}}', animation: 'lh-scaleIn 0.6s ease-out both' },
  scaleOut:   { keyframes: '@keyframes lh-scaleOut{from{transform:scale(1)}to{transform:scale(0);opacity:0}}', animation: 'lh-scaleOut 0.6s ease-in both' },
  pop:        { keyframes: '@keyframes lh-pop{0%{transform:scale(0)}70%{transform:scale(1.08)}100%{transform:scale(1)}}', animation: 'lh-pop 0.6s ease-out both' },
  bounceIn:   { keyframes: '@keyframes lh-bounceIn{0%{transform:scale(0)}60%{transform:scale(1.12)}80%{transform:scale(0.94)}100%{transform:scale(1)}}', animation: 'lh-bounceIn 0.8s both' },
  spin360:    { keyframes: '@keyframes lh-spin360{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}', animation: 'lh-spin360 1s ease-in-out both' },
  shake:      { keyframes: '@keyframes lh-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-8px)}80%{transform:translateX(8px)}}', animation: 'lh-shake 0.7s both' },
  pulse:      { keyframes: '@keyframes lh-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}', animation: 'lh-pulse 1s ease-in-out infinite' },
  typeOn:     { keyframes: '@keyframes lh-typeOn{from{opacity:0}to{opacity:1}}',             animation: 'lh-typeOn 0.3s ease-out both' },
}

function getArtboardPreset(ab: ArtboardBundle, tracks: AnimTrack[]): AnimPreset | null {
  // Find any track whose objectId matches a row in this artboard
  const rowIds = new Set(ab.rows.map((r: any) => r.objId || r.name || r.id).filter(Boolean))
  const match = tracks.find(t => rowIds.has(t.objectId))
  return match?.preset ?? null
}

export function UniversalLaunchHub({ data, animationTracks: animTracksProp, onClose }: UniversalLaunchHubProps) {
  const [activeTab, setActiveTab] = useState<'newsletter' | 'social' | 'dm'>('newsletter')
  const [copied, setCopied] = useState(false)
  const [newsletterView, setNewsletterView] = useState<'preview' | 'code'>('preview')
  const [customNewsletterHTML, setCustomNewsletterHTML] = useState<string | null>(null)
  
  // Animation tracks — prefer prop, fallback to data field
  const animationTracks: AnimTrack[] = animTracksProp ?? data.animationTracks ?? []

  // Local state for LIVE EDITING of all artboards
  const [editableArtboards, setEditableArtboards] = useState<ArtboardBundle[]>(data.artboards)
  
  // Subject/Captions state
  const [globalMetadata, setGlobalMetadata] = useState({
    subject: data.projectTitle || 'Nuovo Progetto Creativo',
    dmText: ''
  })

  // Per-artboard Instagram captions (editable independently)
  const [igCaptions, setIgCaptions] = useState<Record<string, { caption: string; hashtags: string }>>({})
  const [activeIgPost, setActiveIgPost] = useState<string | null>(null)

  // Init captions from artboard text
  useEffect(() => {
    const initial: Record<string, { caption: string; hashtags: string }> = {}
    data.artboards.forEach(ab => {
      initial[ab.id] = {
        caption: [ab.headline, ab.content].filter(Boolean).join('\n\n'),
        hashtags: '#design #creative #creativeos'
      }
    })
    setIgCaptions(initial)
    setActiveIgPost(data.artboards[0]?.id || null)

    const fullContent = data.artboards.map(a => `${a.headline}\n${a.content}`).join('\n\n')
    setGlobalMetadata(prev => ({ ...prev, dmText: fullContent }))
  }, [data.artboards])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {
      // Fallback: focus window then retry once
      window.focus()
      try { navigator.clipboard.writeText(text) } catch {}
    })
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const updateArtboardText = (id: string, field: 'headline' | 'content', value: string) => {
    setEditableArtboards(prev => prev.map(a => {
      if (a.id !== id) return a
      
      // Update the explicit headline/content fields
      const updated = { ...a, [field]: value }
      
      // Also update the matching row for the 100% reconstruction engine
      // Heuristic: if field is 'headline', find the first big text row
      if (field === 'headline') {
        const textRows = updated.rows.filter(r => r.type === 'textbox' || r.type === 'i-text' || r.type === 'text')
        const headRow = textRows.find(r => r.fontSize > 24) || textRows[0]
        if (headRow) headRow.text = value
      } else {
        // If field is content, we target the rest of the text rows? 
        // This is tricky if there are many rows. For now, we update the first non-headline row.
        const textRows = updated.rows.filter(r => r.type === 'textbox' || r.type === 'i-text' || r.type === 'text')
        const headRow = textRows.find(r => r.fontSize > 24) || textRows[0]
        const bodyRow = textRows.find(r => r.id !== headRow?.id)
        if (bodyRow) bodyRow.text = value
      }
      
      return updated
    }))
  }

  const reorderArtboard = (index: number, direction: 'up' | 'down') => {
    const newArr = [...editableArtboards]
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= newArr.length) return
    [newArr[index], newArr[targetIdx]] = [newArr[targetIdx], newArr[index]]
    setEditableArtboards(newArr)
  }

  // Extract all unique symbols across all artboards for the Asset Drawer
  const allSymbols = useMemo(() => {
    const seen = new Set()
    return editableArtboards.flatMap(a => a.symbols || []).filter(s => {
      if (!s.src && !s.text && s.type !== 'path') return false
      const key = s.src || s.text || s.id
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [editableArtboards])

  /**
   * Newsletter Engine — Screenshot-based fidelity rendering.
   * Each artboard is rendered as a pixel-perfect image (the canvas screenshot),
   * followed by editable text content in a styled block below.
   * This approach renders correctly regardless of canvas object complexity.
   */
  const newsletterHTML = useMemo(() => {
    const newsletterWidth = 600

    // Collect used fonts only from text rows for the footer/content sections
    const usedFonts = [...new Set(editableArtboards.flatMap(a =>
      a.rows.filter(r => r.type === 'textbox' || r.type === 'i-text' || r.type === 'text')
            .map(r => r.fontFamily)
    ))].filter(Boolean)
    const fontImport = usedFonts.map(f =>
      `@import url('https://fonts.googleapis.com/css2?family=${f.replace(/ /g, '+')}:wght@400;700;900&display=swap');`
    ).join('\n')

    // Pick accent color from palette (first saturated color, else white)
    const accentColor = data.globalPalette.find(c => c !== '#ffffff' && c !== '#000000') || '#ffffff'

    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    ${fontImport}
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #111111;
      font-family: 'Inter', -apple-system, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .email-wrapper { padding: 48px 0 80px; }
    .email-stack { width: ${newsletterWidth}px; margin: 0 auto; }

    /* Header strip */
    .email-header {
      padding: 24px 40px;
      text-align: center;
      letter-spacing: 0.3em;
      font-size: 9px;
      font-weight: 900;
      text-transform: uppercase;
      color: rgba(255,255,255,0.2);
    }

    /* Each artboard card */
    .artboard-card {
      margin-bottom: 32px;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 24px 64px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.3);
      background: #1a1a1a;
    }
    .artboard-card:nth-child(even) { transform: rotate(0.4deg); }
    .artboard-card:nth-child(odd)  { transform: rotate(-0.3deg); }

    /* Artboard visual — the actual canvas screenshot */
    .artboard-visual {
      width: 100%;
      display: block;
      line-height: 0;
    }
    .artboard-visual img {
      width: 100%;
      height: auto;
      display: block;
    }

    /* Label strip above image */
    .artboard-label {
      padding: 10px 20px 8px;
      background: rgba(0,0,0,0.6);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .artboard-label-name {
      font-size: 8px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.25em;
      color: ${accentColor};
    }
    .artboard-label-index {
      font-size: 8px;
      font-weight: 700;
      color: rgba(255,255,255,0.15);
    }

    /* Divider between artboards */
    .section-divider {
      width: 40px;
      height: 2px;
      background: ${accentColor};
      opacity: 0.4;
      margin: 0 auto 32px;
      border-radius: 999px;
    }

    /* Footer */
    .email-footer {
      padding: 48px 40px 24px;
      text-align: center;
      font-size: 9px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.3em;
      color: rgba(255,255,255,0.1);
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-stack">
      <div class="email-header">Creative OS &nbsp;·&nbsp; ${data.projectTitle || 'Progetto'}</div>
`

    // Collect CSS @keyframes for animation presets used across artboards
    const usedPresets = new Set<AnimPreset>()
    editableArtboards.forEach(ab => {
      const p = getArtboardPreset(ab, animationTracks)
      if (p && PRESET_CSS[p]) usedPresets.add(p)
    })
    const animKeyframesCSS = [...usedPresets].map(p => PRESET_CSS[p].keyframes).join('\n    ')

    if (animKeyframesCSS) {
      // Inject before </style>
      html = html.replace('</style>', `    ${animKeyframesCSS}\n  </style>`)
    }

    editableArtboards.forEach((ab, idx) => {
      if (idx > 0) {
        html += `      <div class="section-divider"></div>\n`
      }
      const preset = getArtboardPreset(ab, animationTracks)
      const animStyle = preset && PRESET_CSS[preset]
        ? ` style="animation: ${PRESET_CSS[preset].animation}; animation-delay: ${idx * 0.15}s;"`
        : ''
      html += `
      <div class="artboard-card"${animStyle}>
        <div class="artboard-label">
          <span class="artboard-label-name">${ab.name}${preset ? ' ⚡' : ''}</span>
          <span class="artboard-label-index">${String(idx + 1).padStart(2, '0')} / ${String(editableArtboards.length).padStart(2, '0')}</span>
        </div>
        <div class="artboard-visual">
          <img src="${ab.screenshot}" alt="${ab.name}" width="${newsletterWidth}" />
        </div>
      </div>`
    })

    html += `
      <div class="email-footer">Unified Creative Session &copy; ${new Date().getFullYear()}</div>
    </div>
  </div>
</body>
</html>`

    return html
  }, [editableArtboards, data.globalPalette, data.projectTitle])

  const finalNewsletterHTML = customNewsletterHTML || newsletterHTML

  const formatText = (marker: string) => {
    const textarea = document.getElementById('dm-textarea') as HTMLTextAreaElement
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = globalMetadata.dmText
    const before = text.substring(0, start)
    const selected = text.substring(start, end)
    const after = text.substring(end)
    const newText = `${before}${marker}${selected}${marker}${after}`
    setGlobalMetadata({ ...globalMetadata, dmText: newText })
    // Restore focus and selection
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + marker.length, end + marker.length)
    }, 10)
  }

  const renderWhatsAppPreview = (text: string) => {
    return text
      .replace(/\*(.*?)\*/g, '<strong class="font-black">$1</strong>')
      .replace(/_(.*?)_/g, '<em class="italic">$1</em>')
      .replace(/~(.*?)~/g, '<span class="line-through">$1</span>')
      .replace(/```(.*?)```/gs, '<code class="bg-black/5 px-1 rounded font-mono text-[11px]">$1</code>')
      .split('\n').map((line, i) => <div key={i} dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }} />)
  }

  // Collect all unique keyframe CSS needed for the React preview
  const previewKeyframesCSS = useMemo(() => {
    const used = new Set<AnimPreset>()
    editableArtboards.forEach(ab => {
      const p = getArtboardPreset(ab, animationTracks)
      if (p && PRESET_CSS[p]) used.add(p)
    })
    return [...used].map(p => PRESET_CSS[p].keyframes).join('\n')
  }, [editableArtboards, animationTracks])

  return (
    <>
      {previewKeyframesCSS && (
        <style dangerouslySetInnerHTML={{ __html: previewKeyframesCSS }} />
      )}
    <div className="fixed inset-0 z-[100] bg-[#070707] flex flex-col animate-in fade-in duration-300 font-inter">
      
      {/* Header */}
      <div className="flex items-center justify-between px-8 h-20 border-b border-white/5 bg-black/40 backdrop-blur-2xl">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 h-10 px-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/70 hover:text-white transition-all group"
          >
            <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
            Torna alla Progettazione
          </button>

          <div className="w-px h-6 bg-white/10" />

          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-2xl bg-accent/20 flex items-center justify-center text-accent shadow-lg shadow-accent/10">
               <Sparkles className="w-5 h-5 fill-accent/20" />
             </div>
             <div>
               <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Unified Launch Hub</h2>
               <p className="text-[9px] font-bold text-white/30 uppercase tracking-tight">Multi-Artboard Intelligence</p>
             </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/5 rounded-xl">
              <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Project:</span>
              <input 
                value={globalMetadata.subject}
                onChange={e => setGlobalMetadata({...globalMetadata, subject: e.target.value})}
                className="bg-transparent border-none text-[10px] font-bold text-white focus:outline-none min-w-[200px]"
              />
           </div>
           <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center text-white/30 hover:text-white hover:bg-white/5 transition-all">
             <X className="w-5 h-5" />
           </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* Destination Sidebar */}
        <div className="w-80 border-r border-white/5 flex flex-col bg-[#090909]">
          <div className="p-6 pb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-4">Canale di Lancio</p>
            <div className="space-y-2">
               {[
                 { id: 'newsletter', label: 'Newsletter', icon: Mail, color: 'text-accent', bg: 'bg-accent/10', sub: 'HTML Fidelity Stack' },
                 { id: 'social', label: 'Social Content', icon: Instagram, iconType: Instagram, color: 'text-pink-400', bg: 'bg-pink-500/10', sub: 'Captions & Images' },
                 { id: 'dm', label: 'Messaging', icon: MessageSquare, color: 'text-emerald-400', bg: 'bg-emerald-500/10', sub: 'Personal DM' }
               ].map(tab => (
                 <button 
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id as any)}
                   className={cn(
                     "w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all border group",
                     activeTab === tab.id ? `${tab.bg} border-white/10 ${tab.color}` : "text-white/30 hover:text-white/60 hover:bg-white/5 border-transparent"
                   )}
                 >
                   <tab.icon className={cn("w-5 h-5", activeTab === tab.id ? tab.color : "opacity-30")} />
                   <div className="text-left">
                     <p className="text-[11px] font-black uppercase tracking-widest leading-none">{tab.label}</p>
                     <p className="text-[9px] font-bold opacity-30 mt-1">{tab.sub}</p>
                   </div>
                 </button>
               ))}
            </div>
          </div>

          {/* ASSET DRAWER / EDITOR */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide border-t border-white/5 mt-4 space-y-8">
             <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-4">Simboli & Asset Estratti</p>
               <div className="flex flex-wrap gap-2">
                  {(allSymbols || []).length > 0 ? allSymbols.map((s: any, i: number) => (
                    <div key={i} className="w-12 h-12 bg-white/5 rounded-xl border border-white/5 flex items-center justify-center p-2 group relative hover:bg-white/10 transition-colors">
                       {s.type === 'image' ? (
                         <img src={s.src} className="max-w-full max-h-full object-contain" />
                       ) : (
                         <Sparkles className="w-4 h-4 text-white/40 group-hover:text-accent transition-colors" />
                       )}
                       <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full border-2 border-[#090909]" />
                    </div>
                  )) : (
                    <p className="text-[9px] font-bold text-white/10 uppercase italic">Nessun simbolo rilevato</p>
                  )}
               </div>
             </div>

             <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-4">Editore Dinamico Tavole</p>
               <div className="space-y-4">
                  {editableArtboards.map((ab, idx) => (
                    <div key={ab.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3 group/item">
                      <div className="flex items-center justify-between">
                         <span className="text-[9px] font-black text-accent uppercase tracking-widest truncate max-w-[120px]">{ab.name}</span>
                         <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                            <button onClick={() => reorderArtboard(idx, 'up')} className="p-1 hover:text-white"><ChevronUp className="w-3 h-3" /></button>
                            <button onClick={() => reorderArtboard(idx, 'down')} className="p-1 hover:text-white"><ChevronDown className="w-3 h-3" /></button>
                         </div>
                      </div>
                      <div>
                         <label className="text-[8px] font-black text-white/20 uppercase tracking-widest block mb-1">Titolo Sezione</label>
                         <input 
                           value={ab.headline}
                           onChange={e => updateArtboardText(ab.id, 'headline', e.target.value)}
                           className="w-full bg-white/5 rounded-lg border border-transparent focus:border-white/10 px-3 py-2 text-[11px] font-bold text-white focus:outline-none"
                         />
                      </div>
                      <div>
                         <label className="text-[8px] font-black text-white/20 uppercase tracking-widest block mb-1">Corpo Testo</label>
                         <textarea 
                           value={ab.content}
                           onChange={e => updateArtboardText(ab.id, 'content', e.target.value)}
                           className="w-full bg-white/5 rounded-lg border border-transparent focus:border-white/10 px-3 py-2 text-[10px] text-white/60 focus:outline-none min-h-[60px] resize-none"
                         />
                      </div>
                    </div>
                  ))}
               </div>
             </div>
          </div>

          <div className="p-6 border-t border-white/5 bg-black/20">
             <p className="text-[9px] font-black uppercase tracking-widest text-white/20 mb-3">Global Identity</p>
             <div className="flex gap-1.5 flex-wrap">
                {data.globalPalette.map((c,i) => (
                  <div key={i} className="w-5 h-5 rounded-lg border border-white/10 shadow-lg" style={{backgroundColor:c}} />
                ))}
             </div>
          </div>
        </div>

        {/* Main Interface Area */}
        <div className="flex-1 bg-[#050505] relative overflow-y-auto p-12 custom-scrollbar">
           
           <div className="max-w-4xl mx-auto space-y-12">
              
              {/* NEWSLETTER PREVIEW */}
              {activeTab === 'newsletter' && (
                <div className="space-y-8 animate-in zoom-in-95 duration-500">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <Layout className="w-5 h-5 text-accent" />
                       <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white/40 italic">Fidelity Engine: Stacked View</h3>
                    </div>
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                      <button 
                        onClick={() => setNewsletterView('preview')}
                        className={cn("px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all", 
                          newsletterView === 'preview' ? "bg-accent text-black" : "text-white/40 hover:text-white")}
                      >
                        Preview
                      </button>
                      <button 
                        onClick={() => {
                          if (!customNewsletterHTML) setCustomNewsletterHTML(newsletterHTML)
                          setNewsletterView('code')
                        }}
                        className={cn("px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all", 
                          newsletterView === 'code' ? "bg-accent text-black" : "text-white/40 hover:text-white")}
                      >
                        Source
                      </button>
                    </div>
                  </div>
                  
                  <div className="rounded-[20px] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8)] border border-white/[0.06]">
                    {/* Email client header strip */}
                    <div className="bg-[#1a1a1a] border-b border-white/[0.06] px-6 py-4 flex items-center gap-4">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                        <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                        <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                      </div>
                      <div className="flex gap-4 items-center ml-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Da:</span>
                        <span className="text-[10px] font-bold text-white/40">Creative OS Studio</span>
                        <span className="text-white/10">·</span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/20">Oggetto:</span>
                        <span className="text-[10px] font-bold text-white/70">{globalMetadata.subject}</span>
                      </div>
                      {newsletterView === 'code' && (
                        <div className="ml-auto flex items-center gap-3">
                           <button 
                             onClick={() => setCustomNewsletterHTML(null)}
                             className="text-[8px] font-black uppercase tracking-widest text-red-400/60 hover:text-red-400 transition-colors"
                           >
                             Ripristina Generato
                           </button>
                           <button 
                             onClick={() => copyToClipboard(finalNewsletterHTML)}
                             className="h-7 px-3 bg-white/5 hover:bg-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest text-white/60 flex items-center gap-2"
                           >
                             <Copy className="w-3 h-3" /> Copia Codice
                           </button>
                        </div>
                      )}
                    </div>
                    {newsletterView === 'preview' ? (
                      <iframe
                        srcDoc={finalNewsletterHTML}
                        className="w-full border-none block"
                        style={{ minHeight: '600px' }}
                        title="Newsletter High Fidelity"
                        onLoad={(e) => {
                          const iframe = e.currentTarget
                          try {
                            const doc = iframe.contentDocument || iframe.contentWindow?.document
                            if (doc) {
                              iframe.style.height = doc.documentElement.scrollHeight + 'px'
                            }
                          } catch {}
                        }}
                      />
                    ) : (
                      <textarea 
                        value={finalNewsletterHTML}
                        onChange={e => setCustomNewsletterHTML(e.target.value)}
                        className="w-full h-[600px] bg-[#0d0d0d] text-emerald-500/80 font-mono text-[11px] p-8 focus:outline-none resize-none spellcheck-false"
                        spellCheck={false}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* SOCIAL / CAPTION PREVIEW */}
              {activeTab === 'social' && (
                <div className="animate-in slide-in-from-right-10 duration-500 space-y-6">
                  {/* Info strip — no HTML on Instagram */}
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <Instagram className="w-4 h-4 text-pink-400 flex-shrink-0" />
                    <p className="text-[10px] text-white/30 leading-snug">
                      Instagram non supporta HTML — la caption è <strong className="text-white/50">testo semplice</strong>: newline, hashtag, @menzioni ed emoji. Scrivi la caption, aggiungi gli hashtag in fondo, poi copia e incolla nell'app.
                    </p>
                  </div>

                  {/* Post selector tabs */}
                  {editableArtboards.length > 1 && (
                    <div className="flex gap-2 flex-wrap">
                      {editableArtboards.map((ab, idx) => (
                        <button
                          key={ab.id}
                          onClick={() => setActiveIgPost(ab.id)}
                          className={cn(
                            'h-7 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all',
                            activeIgPost === ab.id
                              ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
                              : 'text-white/20 hover:text-white/50 border border-transparent hover:border-white/10'
                          )}
                        >
                          {String(idx + 1).padStart(2, '0')} · {ab.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {editableArtboards.map(ab => {
                    if (activeIgPost && ab.id !== activeIgPost) return null
                    const cap = igCaptions[ab.id] || { caption: '', hashtags: '' }
                    const fullText = [cap.caption, cap.hashtags].filter(Boolean).join('\n\n')
                    const charCount = fullText.length
                    const MAX_CHARS = 2200
                    const firstLine = cap.caption.split('\n')[0] || ''

                    const abPreset = getArtboardPreset(ab, animationTracks)
                    const abAnimStyle = abPreset && PRESET_CSS[abPreset]
                      ? { animation: PRESET_CSS[abPreset].animation }
                      : undefined

                    return (
                      <div key={ab.id} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left: Instagram mock */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/20">Anteprima Post</p>
                            {abPreset && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-500/30 text-[7px] font-black text-violet-300 uppercase tracking-widest">
                                <Zap className="w-2.5 h-2.5" />Animato · {abPreset}
                              </span>
                            )}
                          </div>
                          <div className="bg-white rounded-2xl overflow-hidden shadow-2xl max-w-[390px]">
                            {/* IG header */}
                            <div className="px-4 py-3 flex items-center justify-between border-b border-black/5">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
                                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-[9px] font-black text-black">
                                    {(data.projectTitle || 'CO').slice(0,2).toUpperCase()}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-[11px] font-black text-black leading-none">{(data.projectTitle || 'creative_os').toLowerCase().replace(/ /g,'_')}</p>
                                  <p className="text-[9px] text-black/30">Originale</p>
                                </div>
                              </div>
                              <div className="text-black/30 text-lg font-black tracking-widest">···</div>
                            </div>
                            {/* Image — 1:1 square crop — CSS animated if track present */}
                            <div className="aspect-square overflow-hidden bg-black">
                              <img src={ab.screenshot} className="w-full h-full object-cover" alt={ab.name} style={abAnimStyle} />
                            </div>
                            {/* Actions */}
                            <div className="px-4 pt-3 pb-1 flex gap-4">
                              <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                              <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                              <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                            </div>
                            {/* Caption preview */}
                            <div className="px-4 pb-5 pt-2">
                              <p className="text-[12px] text-black leading-snug">
                                <span className="font-black">{(data.projectTitle || 'creative_os').toLowerCase().replace(/ /g,'_')}</span>
                                {' '}
                                <span>{firstLine.slice(0, 100)}{firstLine.length > 100 ? '…' : ''}</span>
                              </p>
                              {cap.caption.split('\n').length > 1 && (
                                <p className="text-[11px] text-black/40 mt-1">altro...</p>
                              )}
                              {cap.hashtags && (
                                <p className="text-[11px] text-blue-500 mt-2 leading-snug">{cap.hashtags}</p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: editor */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/20">Editor Caption</p>
                            <span className={cn(
                              'text-[9px] font-black tabular-nums',
                              charCount > MAX_CHARS ? 'text-red-400' : charCount > MAX_CHARS * 0.8 ? 'text-yellow-400' : 'text-white/20'
                            )}>{charCount} / {MAX_CHARS}</span>
                          </div>

                          {/* Caption */}
                          <div className="space-y-1">
                            <label className="text-[8px] font-black uppercase tracking-widest text-white/20 block">Testo</label>
                            <textarea
                              value={cap.caption}
                              onChange={e => setIgCaptions(prev => ({ ...prev, [ab.id]: { ...prev[ab.id], caption: e.target.value } }))}
                              placeholder="Scrivi la caption..."
                              rows={6}
                              className="w-full bg-white/[0.04] border border-white/[0.06] focus:border-pink-500/30 rounded-xl px-4 py-3 text-[12px] text-white/80 leading-relaxed focus:outline-none resize-none scrollbar-hide placeholder:text-white/15"
                            />
                          </div>

                          {/* Hashtags — separate field, appended at the end */}
                          <div className="space-y-1">
                            <label className="text-[8px] font-black uppercase tracking-widest text-white/20 block">Hashtag</label>
                            <textarea
                              value={cap.hashtags}
                              onChange={e => setIgCaptions(prev => ({ ...prev, [ab.id]: { ...prev[ab.id], hashtags: e.target.value } }))}
                              placeholder="#design #creative..."
                              rows={3}
                              className="w-full bg-white/[0.04] border border-white/[0.06] focus:border-pink-500/30 rounded-xl px-4 py-3 text-[11px] text-blue-400/70 leading-relaxed focus:outline-none resize-none scrollbar-hide placeholder:text-white/15"
                            />
                          </div>

                          {/* Info note */}
                          <p className="text-[9px] text-white/15 leading-relaxed">
                            Testo e hashtag vengono uniti da due righe vuote al momento della copia — formato standard Instagram.
                          </p>

                          {/* Copy */}
                          <button
                            onClick={() => copyToClipboard(fullText)}
                            className="w-full h-11 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.15em] shadow-lg shadow-pink-500/20 hover:shadow-pink-500/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                          >
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {copied ? 'Copiato' : 'Copia Caption Completa'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* MESSAGING PREVIEW */}
              {activeTab === 'dm' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in slide-in-from-left-10 duration-500">
                  <div className="space-y-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">WhatsApp Feed</p>
                    <div className="space-y-6">
                      {editableArtboards.map(ab => (
                        <div key={ab.id} className="bg-white rounded-3xl p-2 max-w-[90%] shadow-lg">
                           <img src={ab.screenshot} className="w-full rounded-2xl mb-3 shadow-inner" alt="message" />
                           <div className="px-3 pb-2 space-y-1">
                              <p className="text-[12px] font-black text-black">*{ab.headline.toUpperCase()}*</p>
                              <div className="text-[12px] text-black/70 leading-snug whitespace-pre-wrap">
                                {renderWhatsAppPreview(ab.content.slice(0, 150) + (ab.content.length > 150 ? '...' : ''))}
                              </div>
                           </div>
                        </div>
                      ))}
                      <div className="bg-[#dcf8c6] rounded-3xl p-4 max-w-[90%] shadow-lg ml-auto relative">
                          <div className="text-[13px] text-black/80 leading-relaxed whitespace-pre-wrap">
                             {renderWhatsAppPreview(globalMetadata.dmText)}
                          </div>
                          <div className="text-[9px] text-black/30 text-right mt-1">
                             {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {/* Triangle tail */}
                          <div className="absolute top-0 -right-2 w-4 h-4 bg-[#dcf8c6]" style={{clipPath: 'polygon(0 0, 0 100%, 100% 0)'}} />
                       </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30 ml-2">Personal Message</p>
                    <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 space-y-6 relative overflow-hidden group/dm">
                        
                        {/* Formatting Toolbar */}
                        <div className="absolute top-4 right-8 flex items-center gap-1 opacity-0 group-hover/dm:opacity-100 transition-opacity">
                           {[
                             { label: 'B', marker: '*', title: 'Grassetto' },
                             { label: 'I', marker: '_', title: 'Corsivo' },
                             { label: 'S', marker: '~', title: 'Sbarrato' },
                             { label: '<>', marker: '```', title: 'Monospazio' },
                           ].map(fmt => (
                             <button 
                                key={fmt.marker}
                                onClick={() => formatText(fmt.marker)}
                                className="w-7 h-7 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-black text-white/60 hover:text-white transition-all"
                                title={fmt.title}
                             >
                               {fmt.label}
                             </button>
                           ))}
                        </div>

                        <textarea 
                          id="dm-textarea"
                          value={globalMetadata.dmText}
                          onChange={e => setGlobalMetadata({...globalMetadata, dmText: e.target.value})}
                          className="w-full bg-transparent border-none text-white/80 text-sm leading-relaxed focus:outline-none resize-none scrollbar-hide h-96"
                        />
                        <button 
                          onClick={() => copyToClipboard(globalMetadata.dmText)}
                          className="w-full h-12 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3"
                        >
                          {copied ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
                          {copied ? 'Testo Pronto' : 'Copia per Messaggio'}
                        </button>
                    </div>
                  </div>
                </div>
              )}

           </div>
        </div>
      </div>
    </div>
    </>
  )
}
