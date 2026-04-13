'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { Loader2, Maximize2, Minimize2, RefreshCw, ZoomIn, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Node {
  id: string
  name: string
  type: 'client' | 'memory' | 'project' | 'skill'
  importance: number
  full_content?: string
}

interface Link {
  source: string
  target: string
  relation: string
}

export function BrainGraph() {
  const [data, setData] = useState<{ nodes: Node[]; links: Link[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [hoverNode, setHoverNode] = useState<Node | null>(null)
  const graphRef = useRef<any>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/brain/nexus')
      const d = await res.json()
      setData(d)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const paintNode = useMemo(() => (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.name
    const fontSize = 12 / globalScale
    ctx.font = `${fontSize}px Inter, system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Color based on type
    let color = '#a1a1aa' // Default zinc
    if (node.type === 'client') color = '#3b82f6' // Blue
    if (node.type === 'skill') color = '#10b981' // Emerald
    if (node.type === 'memory') color = '#d946ef' // Fuchsia
    if (node.type === 'project') color = '#f59e0b' // Amber

    const radius = 4 + (node.importance || 0.5) * 8

    // Shadow
    ctx.shadowColor = color + '44'
    ctx.shadowBlur = 10 / globalScale

    // Circle
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false)
    ctx.fill()

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'
    ctx.lineWidth = 1 / globalScale
    ctx.stroke()

    // Label if zoomed in enough or if hub
    if (globalScale > 3 || node.type === 'client' || node.importance > 0.8) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.fillText(label, node.x, node.y + radius + fontSize + 2)
    }
  }, [])

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full gap-4 bg-black/40 rounded-3xl border border-white/5 backdrop-blur-3xl">
      <Loader2 className="w-8 h-8 animate-spin text-fuchsia-500" />
      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Mapping Neural Connections...</span>
    </div>
  )

  return (
    <div className="relative w-full h-full bg-black/40 rounded-3xl border border-white/5 overflow-hidden group">
      
      {/* Floating Info Card */}
      {hoverNode && (
        <div className="absolute top-6 left-6 z-20 p-4 bg-black/80 border border-white/10 rounded-2xl backdrop-blur-xl w-64 animate-in fade-in zoom-in duration-200 pointer-events-none">
            <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                    "w-2 h-2 rounded-full",
                    hoverNode.type === 'client' && "bg-blue-500",
                    hoverNode.type === 'skill' && "bg-emerald-500",
                    hoverNode.type === 'memory' && "bg-fuchsia-500",
                    hoverNode.type === 'project' && "bg-amber-500"
                )} />
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{hoverNode.type}</span>
            </div>
            <h4 className="text-xs font-bold text-white leading-relaxed">{hoverNode.name}</h4>
            <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3">
                <span className="text-[9px] font-bold text-white/20 uppercase">Peso: {Math.round(hoverNode.importance * 100)}%</span>
                <span className="text-[9px] font-bold text-white/20 uppercase">Links: {data?.links.filter(l => l.source === hoverNode.id || (typeof l.source === 'object' && (l.source as any).id === hoverNode.id)).length}</span>
            </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="absolute top-6 right-6 z-20 flex flex-col gap-2">
        <GraphToolBtn onClick={() => graphRef.current?.zoomToFit(400)} icon={<RefreshCw className="w-3.5 h-3.5" />} label="Reset View" />
        <GraphToolBtn onClick={() => graphRef.current?.zoom(graphRef.current.zoom() * 1.5, 400)} icon={<ZoomIn className="w-3.5 h-3.5" />} label="Zoom In" />
      </div>

      <div className="absolute bottom-6 left-6 z-20 flex items-center gap-4 bg-black/60 px-4 py-2 rounded-xl border border-white/5 backdrop-blur-md">
         <Legend color="bg-blue-500" label="Client" />
         <Legend color="bg-fuchsia-500" label="Memoria" />
         <Legend color="bg-emerald-500" label="Skill" />
         <Legend color="bg-amber-500" label="Project" />
      </div>

      <div className="absolute bottom-6 right-6 z-20 flex items-center gap-2 text-white/20 text-[9px] font-bold uppercase tracking-widest">
         <Info className="w-3 h-3" />
         Trascina per navigare • Scroll per lo zoom
      </div>

      {data && (
        <ForceGraph2D
          ref={graphRef}
          graphData={data}
          nodeCanvasObject={paintNode}
          nodePointerAreaPaint={(node: any, color, ctx) => {
            const radius = 6 + (node.importance || 0.5) * 8
            ctx.fillStyle = color
            ctx.beginPath()
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false)
            ctx.fill()
          }}
          linkColor={() => 'rgba(255, 255, 255, 0.05)'}
          linkWidth={1}
          backgroundColor="rgba(0,0,0,0)"
          enableNodeDrag={true}
          onNodeHover={setHoverNode as any}
          cooldownTicks={100}
        />
      )}
    </div>
  )
}

function GraphToolBtn({ onClick, icon, label }: { onClick: () => void; icon: any; label: string }) {
    return (
        <button 
            onClick={onClick}
            className="p-2.5 bg-black/40 hover:bg-white/10 rounded-xl border border-white/5 text-white/40 hover:text-white transition-all group relative"
        >
            {icon}
            <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2 py-1 bg-black text-[9px] font-bold text-white uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap rounded border border-white/10 pointer-events-none">
                {label}
            </span>
        </button>
    )
}

function Legend({ color, label }: { color: string; label: string }) {
    return (
        <div className="flex items-center gap-1.5">
            <div className={cn("w-1.5 h-1.5 rounded-full", color)} />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">{label}</span>
        </div>
    )
}
