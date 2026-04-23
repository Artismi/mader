'use client'

import React from 'react'
import { useLabStore } from '../hooks/use-lab-store'
import { 
  FlaskConical, Sparkles, Zap, Monitor, Layers, 
  Waves, Radio, Activity, Wind, Music, Gauge, 
  Repeat, ChevronRight, Settings2, Boxes
} from 'lucide-react'
import { cn } from '@/lib/utils'

function SR({ label, value, min, max, step = 1, onChange }: { 
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void 
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest px-0.5">
        <span className="text-white/20">{label}</span>
        <span className="text-accent/60 font-mono">{value.toFixed(step >= 1 ? 0 : 2)}</span>
      </div>
      <input 
        type="range" min={min} max={max} step={step} value={value} 
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full rounded-lg h-1 bg-white/5 appearance-none cursor-pointer accent-accent hover:accent-accent/80 transition-all" 
      />
    </div>
  )
}

function Container({ label, icon, children, badge }: { 
  label: string; icon: React.ReactNode; children: React.ReactNode; badge?: string 
}) {
  return (
    <div className="rounded-[24px] border border-white/5 bg-white/[0.02] p-4 space-y-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/40">
            {icon}
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">{label}</h3>
            {badge && <span className="text-[7px] font-bold text-accent/40 uppercase tracking-widest">{badge}</span>}
          </div>
        </div>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
}

function SubSection({ label, icon, children, active = true, onToggle }: {
  label: string; icon: React.ReactNode; children: React.ReactNode; active?: boolean; onToggle?: (v: boolean) => void
}) {
  return (
    <div className={cn("space-y-3 p-3.5 rounded-2xl border transition-all duration-300", 
      active ? "bg-white/[0.04] border-white/10" : "bg-transparent border-white/5 opacity-40")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={cn("w-5 h-5 flex items-center justify-center rounded-lg bg-white/5", active && "text-accent")}>
            {React.cloneElement(icon as React.ReactElement, { className: 'w-3.5 h-3.5' })}
          </div>
          <span className="text-[9px] font-black uppercase tracking-[0.15em]">{label}</span>
        </div>
        {onToggle && (
          <button 
            onClick={() => onToggle(!active)}
            className={cn("w-7 h-4 rounded-full relative transition-all duration-300 p-0.5", active ? "bg-accent" : "bg-white/10")}
          >
            <div className={cn("w-3 h-3 rounded-full bg-white transition-all transform duration-300 shadow-sm", active ? "translate-x-3" : "translate-x-0")} />
          </button>
        )}
      </div>
      {active && <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-500 px-0.5">{children}</div>}
    </div>
  )
}

export function LabPanel() {
  const labActive = useLabStore(s => s.labActive)
  const set = useLabStore(s => s.set)
  const s = useLabStore()

  if (!labActive) {
    return (
      <div 
        onClick={() => set({ labActive: true })}
        className="p-5 rounded-[24px] border-2 cursor-pointer transition-all duration-500 bg-white/5 border-white/5 hover:border-white/15 group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FlaskConical className="w-5 h-5 text-white/20 group-hover:text-accent transition-colors" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40 group-hover:text-white">Professional Lab</p>
              <p className="text-[8px] text-white/20 font-bold uppercase tracking-widest">Connect Engine</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-white/10 group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── STAGE 0: MASTER CONTROL ─────────────────────────────────────────── */}
      <div 
        onClick={() => set({ labActive: false })}
        className="p-5 rounded-[24px] border-2 cursor-pointer transition-all duration-500 bg-accent/5 border-accent/20 hover:border-accent/40 shadow-[0_0_40px_rgba(255,244,115,0.05)] group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center animate-pulse">
              <Zap className="w-5 h-5 text-accent fill-accent" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-accent">Vanguard V7.0 Active</p>
              <p className="text-[8px] text-accent/40 font-bold uppercase tracking-widest">Precision Projection</p>
            </div>
          </div>
          <FlaskConical className="w-4 h-4 text-accent/20 group-hover:rotate-180 transition-transform duration-700" />
        </div>
      </div>

      <div className="space-y-6 pb-24">
        
        {/* ── CONTAINER 1: ENGINE (Global Context) ───────────────────────────── */}
        <Container label="Engine" icon={<Settings2 />} badge="Global Environment">
          <SubSection label="Scene Sync (BPM)" icon={<Music />}>
             <div className="flex gap-2">
                {[
                  { id: 'auto' as const, icon: <Activity />, label: 'Auto' },
                  { id: 'manual' as const, icon: <Gauge />, label: 'Manual' }
                ].map(mode => (
                  <button 
                    key={mode.id}
                    onClick={() => set({ bpmSource: mode.id })}
                    className={cn("flex-1 py-2 rounded-xl text-[8px] font-black uppercase border transition-all flex items-center justify-center gap-2", 
                      s.bpmSource === mode.id ? "bg-accent/10 border-accent/40 text-accent font-black" : "border-white/5 text-white/20 hover:bg-white/5")}
                  >
                    {React.cloneElement(mode.icon, { className: 'w-3 h-3' })} {mode.label}
                  </button>
                ))}
             </div>
             {s.bpmSource === 'manual' && (
               <SR label="Fixed Tempo" value={s.bpmValue} min={40} max={220} step={1} onChange={v => set({ bpmValue: v })} />
             )}
          </SubSection>

          <SubSection label="Cinema Dither" icon={<Sparkles />} active={s.ditherEnabled} onToggle={v => set({ ditherEnabled: v })}>
            <SR label="Color Depth" value={s.ditherColorDepth} min={1} max={16} step={1} onChange={v => set({ ditherColorDepth: v })} />
          </SubSection>
        </Container>

        {/* ── CONTAINER 2: SIMULATION (Kinetic Interaction) ──────────────────── */}
        <Container label="Simulation" icon={<Boxes />} badge="Interactive Physics">
           <SubSection label="Vanguard Dynamics" icon={<Wind />} active={s.springEnabled} onToggle={v => set({ springEnabled: v })}>
              <SR label="Stiffness" value={s.springStiffness} min={10} max={500} step={1} onChange={v => set({ springStiffness: v })} />
              <SR label="Damping" value={s.springDamping} min={1} max={50} step={0.1} onChange={v => set({ springDamping: v })} />
              <SR label="Mass" value={s.springMass} min={0.1} max={5.0} step={0.1} onChange={v => set({ springMass: v })} />
           </SubSection>

           <SubSection label="Kinetic Optic" icon={<Activity />}>
              <div className="flex items-center justify-between p-1">
                <span className="text-[8px] font-black uppercase tracking-widest text-white/20 flex items-center gap-2">
                  <Repeat className="w-3.5 h-3.5" /> Reactive Weight
                </span>
                <button 
                  onClick={() => set({ reactiveTypography: !s.reactiveTypography })}
                  className={cn("w-7 h-4 rounded-full relative transition-all duration-300 p-0.5", s.reactiveTypography ? "bg-accent" : "bg-white/10")}
                >
                  <div className={cn("w-3 h-3 rounded-full bg-white shadow-sm transition-all transform", s.reactiveTypography ? "translate-x-3" : "translate-x-0")} />
                </button>
              </div>
              <SR label="Motion Blur" value={s.motionBlurIntensity} min={0} max={1.0} step={0.01} onChange={v => set({ motionBlurIntensity: v })} />
              <SR label="Trails" value={s.trailPersistence} min={0} max={0.99} step={0.01} onChange={v => set({ trailPersistence: v })} />
           </SubSection>
        </Container>

        {/* ── CONTAINER 3: OPTICS (Visual Stylization) ───────────────────────── */}
        <Container label="Optics" icon={<Layers />} badge="Vanguard Shader Suite">
          <SubSection label="Liquid Motion" icon={<Waves />} active={s.liquidEnabled} onToggle={v => set({ liquidEnabled: v })}>
            <SR label="Intensity" value={s.liquidIntensity} min={0} max={2.0} step={0.01} onChange={v => set({ liquidIntensity: v })} />
            <SR label="Complexity" value={s.liquidComplexity} min={1} max={10} step={0.1} onChange={v => set({ liquidComplexity: v })} />
            <SR label="Glow" value={s.liquidSurfaceGlow} min={0} max={2.0} step={0.05} onChange={v => set({ liquidSurfaceGlow: v })} />
          </SubSection>

          <SubSection label="Analog VHS" icon={<Radio />} active={s.vhsEnabled} onToggle={v => set({ vhsEnabled: v })}>
            <SR label="Intensity" value={s.vhsIntensity} min={0} max={2.0} step={0.01} onChange={v => set({ vhsIntensity: v })} />
            <SR label="Tracking" value={s.vhsTracking} min={0} max={2.0} step={0.1} onChange={v => set({ vhsTracking: v })} />
          </SubSection>

          <SubSection label="Cathode Ray (CRT)" icon={<Monitor />} active={s.crtEnabled} onToggle={v => set({ crtEnabled: v })}>
            <SR label="Scanlines" value={s.crtScanlineIntensity} min={0} max={1} step={0.05} onChange={v => set({ crtScanlineIntensity: v })} />
            <SR label="Mask Scale" value={s.crtMaskScale} min={1} max={20} step={0.5} onChange={v => set({ crtMaskScale: v })} />
            <SR label="Curvature" value={s.crtDistortion} min={0} max={0.5} step={0.01} onChange={v => set({ crtDistortion: v })} />
          </SubSection>

          <SubSection label="Digital Glitch" icon={<Activity />} active={s.glitchEnabled} onToggle={v => set({ glitchEnabled: v })}>
            <SR label="Amount" value={s.glitchAmount} min={0} max={1.0} step={0.01} onChange={v => set({ glitchAmount: v })} />
          </SubSection>

          <SubSection label="Procedural Base" icon={<Layers />}>
            <div className="flex gap-2">
              {['Grid', 'Dots'].map((type, i) => (
                <button 
                  key={type}
                  onClick={() => set({ patternType: i })}
                  className={cn("flex-1 py-2 rounded-xl text-[8px] font-black uppercase border transition-all", 
                    s.patternType === i ? "bg-white/10 border-white/20 text-white" : "border-white/5 text-white/20 hover:bg-white/5")}
                >
                  {type}
                </button>
              ))}
            </div>
            <SR label="Pattern Scale" value={s.patternScale} min={10} max={200} step={1} onChange={v => set({ patternScale: v })} />
          </SubSection>
        </Container>
      </div>
    </div>
  )
}
