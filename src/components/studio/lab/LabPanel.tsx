'use client'

import React, { useState } from 'react'
import { useLabStore } from '../hooks/use-lab-store'
import {
  FlaskConical, Zap, Settings2, Layers,
  Waves, Radio, Activity, Wind, Music, Gauge,
  Repeat, ChevronRight, Boxes,
  Sun, Palette, Circle, Grid3x3, Cpu, Focus,
  Clock, Monitor, Sparkles, RotateCcw,
  Sliders, Film, SlidersHorizontal
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ─── Primitives ──────────────────────────────────────────────────────────── */

function SR({ label, value, min, max, step = 1, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest px-0.5">
        <span className="text-white/20">{label}</span>
        <span className="text-accent/60 font-mono">{value.toFixed(step >= 1 ? 0 : 2)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full rounded-lg h-1 bg-white/5 appearance-none cursor-pointer accent-accent" />
    </div>
  )
}

function Tog({ label, icon, value, onChange }: { label: string; icon: React.ReactNode; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between p-1">
      <span className="text-[8px] font-black uppercase tracking-widest text-white/20 flex items-center gap-2">
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-3.5 h-3.5' })} {label}
      </span>
      <button onClick={() => onChange(!value)}
        className={cn("w-7 h-4 rounded-full relative transition-all duration-300 p-0.5", value ? "bg-accent" : "bg-white/10")}>
        <div className={cn("w-3 h-3 rounded-full bg-white shadow-sm transition-all transform", value ? "translate-x-3" : "translate-x-0")} />
      </button>
    </div>
  )
}

function Sect({ label, icon, active = true, onToggle, children }: {
  label: string; icon: React.ReactNode; active?: boolean; onToggle?: (v: boolean) => void; children: React.ReactNode
}) {
  return (
    <div className={cn("space-y-3 p-3.5 rounded-2xl border transition-all duration-300",
      active ? "bg-white/[0.04] border-white/10" : "bg-transparent border-white/5 opacity-40")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={cn("w-5 h-5 flex items-center justify-center rounded-lg bg-white/5", active && "text-accent")}>
            {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-3.5 h-3.5' })}
          </div>
          <span className="text-[9px] font-black uppercase tracking-[0.15em]">{label}</span>
        </div>
        {onToggle && (
          <button onClick={() => onToggle(!active)}
            className={cn("w-7 h-4 rounded-full relative transition-all duration-300 p-0.5", active ? "bg-accent" : "bg-white/10")}>
            <div className={cn("w-3 h-3 rounded-full bg-white transition-all transform duration-300 shadow-sm", active ? "translate-x-3" : "translate-x-0")} />
          </button>
        )}
      </div>
      {active && <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-300 px-0.5">{children}</div>}
    </div>
  )
}

function BtnRow({ options, value, onChange }: { options: string[]; value: number; onChange: (i: number) => void }) {
  return (
    <div className="flex gap-1.5">
      {options.map((label, i) => (
        <button key={i} onClick={() => onChange(i)}
          className={cn("flex-1 py-1.5 rounded-xl text-[8px] font-black uppercase border transition-all",
            value === i ? "bg-accent/10 border-accent/40 text-accent" : "border-white/5 text-white/20 hover:bg-white/5")}>
          {label}
        </button>
      ))}
    </div>
  )
}

/* ─── Tab content components ─────────────────────────────────────────────── */

function TabOpt({ s, set }: { s: any; set: any }) {
  return (
    <div className="space-y-4 p-1">
      <Sect label="Liquid Motion" icon={<Waves />} active={s.liquidEnabled} onToggle={v => set({ liquidEnabled: v })}>
        <SR label="Intensity"  value={s.liquidIntensity}  min={0} max={2.0} step={0.01} onChange={v => set({ liquidIntensity: v })} />
        <SR label="Viscosity"  value={s.liquidViscosity}  min={0} max={1.0} step={0.01} onChange={v => set({ liquidViscosity: v })} />
        <SR label="Complexity" value={s.liquidComplexity} min={1} max={10}  step={0.1}  onChange={v => set({ liquidComplexity: v })} />
      </Sect>

      <Sect label="Analog VHS" icon={<Radio />} active={s.vhsEnabled} onToggle={v => set({ vhsEnabled: v })}>
        <SR label="Intensity" value={s.vhsIntensity} min={0} max={2.0} step={0.01} onChange={v => set({ vhsIntensity: v })} />
        <SR label="Bleed"     value={s.vhsBleed}     min={0} max={2.0} step={0.05} onChange={v => set({ vhsBleed: v })} />
        <SR label="Tracking"  value={s.vhsTracking}  min={0} max={2.0} step={0.1}  onChange={v => set({ vhsTracking: v })} />
      </Sect>

      <Sect label="Cathode Ray (CRT)" icon={<Monitor />} active={s.crtEnabled} onToggle={v => set({ crtEnabled: v })}>
        <BtnRow options={['Slot', 'Shadow', 'Aperture']} value={s.crtMode - 1} onChange={i => set({ crtMode: i + 1 })} />
        <SR label="Scanlines"   value={s.crtScanlineIntensity} min={0}   max={1}   step={0.05} onChange={v => set({ crtScanlineIntensity: v })} />
        <SR label="Mask Scale"  value={s.crtMaskScale}         min={1}   max={20}  step={0.5}  onChange={v => set({ crtMaskScale: v })} />
        <SR label="Mask Intens" value={s.crtMaskIntensity}     min={0}   max={1}   step={0.05} onChange={v => set({ crtMaskIntensity: v })} />
        <SR label="Curvature"   value={s.crtDistortion}        min={0}   max={0.5} step={0.01} onChange={v => set({ crtDistortion: v })} />
        <SR label="Brightness"  value={s.crtBrightness}        min={0.5} max={2.0} step={0.05} onChange={v => set({ crtBrightness: v })} />
      </Sect>

      <Sect label="Bloom" icon={<Sun />} active={s.bloomEnabled} onToggle={v => set({ bloomEnabled: v })}>
        <SR label="Intensity" value={s.bloomIntensity} min={0}   max={3.0} step={0.05} onChange={v => set({ bloomIntensity: v })} />
        <SR label="Threshold" value={s.bloomThreshold} min={0}   max={1.0} step={0.01} onChange={v => set({ bloomThreshold: v })} />
        <SR label="Radius"    value={s.bloomRadius}    min={0.1} max={2.0} step={0.05} onChange={v => set({ bloomRadius: v })} />
      </Sect>

      <Sect label="Digital Glitch" icon={<Activity />} active={s.glitchEnabled} onToggle={v => set({ glitchEnabled: v })}>
        <SR label="Amount" value={s.glitchAmount} min={0} max={1.0} step={0.01} onChange={v => set({ glitchAmount: v })} />
        <SR label="Seed"   value={s.glitchSeed}   min={0} max={5.0} step={0.1}  onChange={v => set({ glitchSeed: v })} />
      </Sect>

      <Sect label="Gaussian Noise" icon={<Sparkles />} active={s.noiseEnabled} onToggle={v => set({ noiseEnabled: v })}>
        <Tog label="Monochrome" icon={<Circle />} value={s.noiseMonochrome} onChange={v => set({ noiseMonochrome: v })} />
        <SR label="Intensity" value={s.noiseIntensity} min={0} max={1.0} step={0.01} onChange={v => set({ noiseIntensity: v })} />
      </Sect>

      <Sect label="Procedural Base" icon={<Layers />} active={s.patternEnabled} onToggle={v => set({ patternEnabled: v })}>
        <BtnRow options={['Grid', 'Circles']} value={s.patternType} onChange={i => set({ patternType: i })} />
        <SR label="Scale"     value={s.patternScale}     min={10}   max={200} step={1}    onChange={v => set({ patternScale: v })} />
        <SR label="Thickness" value={s.patternThickness} min={0.01} max={0.5} step={0.01} onChange={v => set({ patternThickness: v })} />
        <p className="text-[8px] font-black uppercase tracking-widest text-white/20 px-0.5">Blend</p>
        <BtnRow options={['Mult', 'Screen', 'Overlay', 'Add']} value={s.patternBlendMode} onChange={i => set({ patternBlendMode: i })} />
        <div className="flex items-center gap-3 px-0.5">
          <span className="text-[8px] font-black uppercase tracking-widest text-white/20">Color</span>
          <input type="color" value={s.patternColor} onChange={e => set({ patternColor: e.target.value })}
            className="w-8 h-6 rounded-lg border border-white/10 bg-transparent cursor-pointer" />
        </div>
      </Sect>
    </div>
  )
}

function TabDot({ s, set }: { s: any; set: any }) {
  return (
    <div className="space-y-4 p-1">
      <Sect label="Halftone" icon={<Circle />} active={s.halftoneEnabled} onToggle={v => set({ halftoneEnabled: v })}>
        <BtnRow options={['Mono', 'CMYK']} value={s.halftoneMode} onChange={i => set({ halftoneMode: i })} />
        <SR label="Spacing"  value={s.halftoneSpacing}  min={0.005} max={0.1}  step={0.005} onChange={v => set({ halftoneSpacing: v })} />
        <SR label="Dot Size" value={s.halftoneDotSize}  min={0.1}   max={2.0}  step={0.05}  onChange={v => set({ halftoneDotSize: v })} />
        <SR label="Angle"    value={s.halftoneAngle}    min={0}     max={180}  step={1}      onChange={v => set({ halftoneAngle: v })} />
      </Sect>

      <Sect label="Dot Matrix" icon={<Grid3x3 />} active={s.dotMatrixEnabled} onToggle={v => set({ dotMatrixEnabled: v })}>
        <p className="text-[8px] font-black uppercase tracking-widest text-white/20 px-0.5">Shape</p>
        <BtnRow options={['Circle', 'Square']} value={s.dotMatrixShape} onChange={i => set({ dotMatrixShape: i })} />
        <p className="text-[8px] font-black uppercase tracking-widest text-white/20 px-0.5">Pattern</p>
        <BtnRow options={['Grid', 'Check', 'Vert', 'Horiz']} value={s.dotMatrixPattern} onChange={i => set({ dotMatrixPattern: i })} />
        <p className="text-[8px] font-black uppercase tracking-widest text-white/20 px-0.5">Motion</p>
        <div className="space-y-1.5">
          <BtnRow options={['None', 'Pulse', 'Wave']} value={Math.min(s.dotMatrixMotion, 2)} onChange={i => set({ dotMatrixMotion: i })} />
          <BtnRow options={['Rand', 'Swirl', 'Slide']} value={s.dotMatrixMotion >= 3 ? s.dotMatrixMotion - 3 : -1}
            onChange={i => set({ dotMatrixMotion: i + 3 })} />
        </div>
        <SR label="Spacing"   value={s.dotMatrixSpacing}   min={0.01} max={0.12} step={0.005} onChange={v => set({ dotMatrixSpacing: v })} />
        <SR label="Dot Size"  value={s.dotMatrixDotSize}   min={0.1}  max={0.9}  step={0.05}  onChange={v => set({ dotMatrixDotSize: v })} />
        <SR label="Threshold" value={s.dotMatrixThreshold} min={0}    max={0.5}  step={0.01}  onChange={v => set({ dotMatrixThreshold: v })} />
        {s.dotMatrixMotion > 0 && <>
          <SR label="Speed"    value={s.dotMatrixSpeed}    min={0.1} max={5.0} step={0.1}  onChange={v => set({ dotMatrixSpeed: v })} />
          <SR label="Strength" value={s.dotMatrixStrength} min={0}   max={1.0} step={0.01} onChange={v => set({ dotMatrixStrength: v })} />
        </>}
        <div className="grid grid-cols-2 gap-3">
          <SR label="W" value={s.dotMatrixDotW} min={0.2} max={3.0} step={0.1} onChange={v => set({ dotMatrixDotW: v })} />
          <SR label="H" value={s.dotMatrixDotH} min={0.2} max={3.0} step={0.1} onChange={v => set({ dotMatrixDotH: v })} />
        </div>
      </Sect>

      <Sect label="Chladni Field" icon={<Cpu />} active={s.chladniEnabled} onToggle={v => set({ chladniEnabled: v })}>
        <div className="grid grid-cols-2 gap-3">
          <SR label="M" value={s.chladniM} min={1} max={8} step={1} onChange={v => set({ chladniM: v })} />
          <SR label="N" value={s.chladniN} min={1} max={8} step={1} onChange={v => set({ chladniN: v })} />
        </div>
        <SR label="Density"   value={s.chladniDensity}      min={0.01} max={0.08} step={0.005} onChange={v => set({ chladniDensity: v })} />
        <SR label="Particle"  value={s.chladniParticleSize} min={0.05} max={0.5}  step={0.01}  onChange={v => set({ chladniParticleSize: v })} />
        <SR label="Settle"    value={s.chladniSettle}       min={0}    max={1.0}  step={0.01}  onChange={v => set({ chladniSettle: v })} />
        <SR label="Speed"     value={s.chladniSpeed}        min={0.1}  max={5.0}  step={0.1}   onChange={v => set({ chladniSpeed: v })} />
        <SR label="Intensity" value={s.chladniIntensity}    min={0}    max={1.0}  step={0.01}  onChange={v => set({ chladniIntensity: v })} />
        <Tog label="Source Color" icon={<Palette />} value={s.chladniUseSourceColor} onChange={v => set({ chladniUseSourceColor: v })} />
        {!s.chladniUseSourceColor && (
          <div className="flex items-center gap-3 px-0.5">
            <span className="text-[8px] font-black uppercase tracking-widest text-white/20">Color</span>
            <input type="color" value={s.chladniColor} onChange={e => set({ chladniColor: e.target.value })}
              className="w-8 h-6 rounded-lg border border-white/10 bg-transparent cursor-pointer" />
          </div>
        )}
      </Sect>

      <Sect label="Fog Pointcloud" icon={<Wind />} active={s.fogEnabled} onToggle={v => set({ fogEnabled: v })}>
        <SR label="Density"     value={s.fogDensity}     min={0.1} max={1.0} step={0.01} onChange={v => set({ fogDensity: v })} />
        <SR label="Oscillation" value={s.fogOscillation} min={0}   max={2.0} step={0.05} onChange={v => set({ fogOscillation: v })} />
        <SR label="Depth"       value={s.fogDepth}       min={0}   max={2.0} step={0.05} onChange={v => set({ fogDepth: v })} />
        <SR label="Point Size"  value={s.fogPointScale}  min={0.1} max={3.0} step={0.1}  onChange={v => set({ fogPointScale: v })} />
        <SR label="Luminescence" value={s.fogLuminescence} min={0} max={3.0} step={0.05} onChange={v => set({ fogLuminescence: v })} />
      </Sect>
    </div>
  )
}

function TabCol({ s, set }: { s: any; set: any }) {
  return (
    <div className="space-y-4 p-1">
      <Sect label="Color Grading" icon={<Palette />} active={s.colorGradeEnabled} onToggle={v => set({ colorGradeEnabled: v })}>
        <BtnRow options={['Linear', 'ACES']} value={s.gradeToneMap} onChange={i => set({ gradeToneMap: i })} />
        <SR label="Exposure"    value={s.gradeExposure}    min={-2}   max={2}   step={0.01} onChange={v => set({ gradeExposure: v })} />
        <SR label="Contrast"    value={s.gradeContrast}    min={0}    max={3.0} step={0.01} onChange={v => set({ gradeContrast: v })} />
        <SR label="Saturation"  value={s.gradeSaturation}  min={0}    max={3.0} step={0.01} onChange={v => set({ gradeSaturation: v })} />
        <SR label="Vibrance"    value={s.gradeVibrance}    min={-1}   max={1}   step={0.01} onChange={v => set({ gradeVibrance: v })} />
        <SR label="Temperature" value={s.gradeTemperature} min={-1}   max={1}   step={0.01} onChange={v => set({ gradeTemperature: v })} />
        <SR label="Hue Shift"   value={s.gradeHue}         min={-180} max={180} step={1}    onChange={v => set({ gradeHue: v })} />
      </Sect>

      <Sect label="Selective Zone" icon={<Focus />} active={s.selectionActive} onToggle={v => set({ selectionActive: v })}>
        <SR label="Feather" value={s.selectionFeather} min={0} max={0.2} step={0.005} onChange={v => set({ selectionFeather: v })} />
      </Sect>

      <Sect label="Adaptive Threshold" icon={<Sun />} active={s.thresholdEnabled} onToggle={v => set({ thresholdEnabled: v })}>
        <SR label="Threshold" value={s.thresholdValue} min={0} max={1.0} step={0.01} onChange={v => set({ thresholdValue: v })} />
        <SR label="Smoothing" value={s.thresholdSmoothing} min={0} max={1.0} step={0.01} onChange={v => set({ thresholdSmoothing: v })} />
      </Sect>
    </div>
  )
}

function TabSim({ s, set }: { s: any; set: any }) {
  return (
    <div className="space-y-4 p-1">
      {/* BPM — moved from TabSys */}
      <Sect label="Scene Sync (BPM)" icon={<Music />} active={s.bpmActive} onToggle={v => set({ bpmActive: v })}>
        <div className="flex gap-1.5 mb-1">
          {[{ id: 'auto', icon: <Activity />, label: 'Auto' }, { id: 'manual', icon: <Gauge />, label: 'Manual' }].map(m => (
            <button key={m.id} onClick={() => set({ bpmSource: m.id })}
              className={cn("flex-1 py-1.5 rounded-xl text-[8px] font-black uppercase border transition-all flex items-center justify-center gap-1.5",
                s.bpmSource === m.id ? "bg-accent/10 border-accent/40 text-accent" : "border-white/5 text-white/20 hover:bg-white/5")}>
              {React.cloneElement(m.icon as React.ReactElement<{ className?: string }>, { className: 'w-3 h-3' })} {m.label}
            </button>
          ))}
        </div>
        {s.bpmSource === 'manual' && <SR label="Tempo" value={s.bpmValue} min={40} max={220} step={1} onChange={v => set({ bpmValue: v })} />}
      </Sect>

      <Sect label="Vanguard Dynamics" icon={<Wind />} active={s.springEnabled} onToggle={v => set({ springEnabled: v })}>
        <SR label="Stiffness" value={s.springStiffness} min={10}  max={500}  step={1}   onChange={v => set({ springStiffness: v })} />
        <SR label="Damping"   value={s.springDamping}   min={1}   max={50}   step={0.1} onChange={v => set({ springDamping: v })} />
        <SR label="Mass"      value={s.springMass}      min={0.1} max={5.0}  step={0.1} onChange={v => set({ springMass: v })} />
      </Sect>

      <Sect label="Kinetic Optic" icon={<Activity />}>
        <Tog label="Reactive Weight" icon={<Repeat />}  value={s.reactiveTypography} onChange={v => set({ reactiveTypography: v })} />
        <Tog label="Motion Blur"     icon={<Wind />}    value={s.motionBlurEnabled}  onChange={v => set({ motionBlurEnabled: v })} />
        {s.motionBlurEnabled && <SR label="Blur" value={s.motionBlurIntensity} min={0} max={1.0} step={0.01} onChange={v => set({ motionBlurIntensity: v })} />}
        <Tog label="Trails" icon={<Layers />} value={s.trailEnabled} onChange={v => set({ trailEnabled: v })} />
        {s.trailEnabled && <>
          <SR label="Persistence" value={s.trailPersistence} min={0}   max={0.99} step={0.01} onChange={v => set({ trailPersistence: v })} />
          <SR label="Scale"       value={s.trailScale}       min={0.5} max={2.0}  step={0.05} onChange={v => set({ trailScale: v })} />
        </>}
      </Sect>
    </div>
  )
}

function TabGen({ s, set }: { s: any; set: any }) {
  const MATS = [
    { id: 'liquidmetal', label: 'Liquid'   },
    { id: 'holo',        label: 'Holo'     },
    { id: 'hyperglass',  label: 'Glass'    },
    { id: 'neon',        label: 'Neon'     },
    { id: 'silicone',    label: 'Silicone' },
    { id: 'matte',       label: 'Matte'    },
    { id: 'standard',    label: 'Metal'    },
    { id: 'wireframe',   label: 'Wire'     },
    { id: 'grid',        label: 'Grid'     },
  ]

  return (
    <div className="space-y-4 p-1">
      <div className="rounded-[20px] border border-accent/20 bg-accent/5 p-4 space-y-1">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Vanguard 3D Genesis</p>
        <p className="text-[8px] text-white/30 font-bold uppercase tracking-widest">SDF Displacement Engine</p>
      </div>

      <Tog label="3D Genesis Active" icon={<Boxes />} value={s.threeDEnabled} onChange={v => set({ threeDEnabled: v })} />

      {s.threeDEnabled && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <Tog label="Auto Rotation" icon={<Repeat />} value={s.threeDMotion} onChange={v => set({ threeDMotion: v })} />

          {/* Material picker */}
          <div className="space-y-2">
            <p className="text-[8px] font-black uppercase tracking-widest text-white/20 px-0.5">Material</p>
            <div className="grid grid-cols-4 gap-1.5">
              {MATS.map(m => (
                <button key={m.id} onClick={() => set({ threeDMaterial: m.id })}
                  className={cn("py-2 rounded-xl text-[8px] font-black uppercase border transition-all",
                    s.threeDMaterial === m.id ? "bg-accent/10 border-accent/40 text-accent" : "border-white/5 text-white/20 hover:bg-white/5")}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <SR label="Depth"     value={s.threeDDepth}     min={0.1} max={3.0} step={0.05} onChange={v => set({ threeDDepth: v })} />
          <SR label="Bevel"     value={s.threeDBevel}     min={0}   max={0.5} step={0.01} onChange={v => set({ threeDBevel: v })} />
          <SR label="Inflation" value={s.threeDInflation} min={0}   max={2.0} step={0.05} onChange={v => set({ threeDInflation: v })} />
          <SR label="Roundness" value={s.threeDRoundness} min={0}   max={1.0} step={0.01} onChange={v => set({ threeDRoundness: v })} />

          {s.threeDMaterial !== 'glass' && <>
            <SR label="Metalness" value={s.threeDMetalness} min={0} max={1.0} step={0.01} onChange={v => set({ threeDMetalness: v })} />
            <SR label="Roughness" value={s.threeDRoughness} min={0} max={1.0} step={0.01} onChange={v => set({ threeDRoughness: v })} />
          </>}
          {s.threeDMaterial === 'glass' && (
            <SR label="Refraction IOR" value={s.threeDRefraction} min={1.0} max={2.5} step={0.01} onChange={v => set({ threeDRefraction: v })} />
          )}

          {/* Precision Rotation Controls */}
          <div className="space-y-3 pt-2 border-t border-white/5">
            <div className="flex items-center justify-between px-0.5">
              <p className="text-[8px] font-black uppercase tracking-widest text-white/20">Precision Rotation</p>
              <button 
                onClick={() => set({ threeDRotX: 0, threeDRotY: 0, threeDRotZ: 0, threeDDepth: 0.5 })}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[7px] font-black uppercase tracking-widest text-accent transition-all"
              >
                <RotateCcw className="w-2.5 h-2.5" /> Reset View
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <SR label="Rotate X" value={s.threeDRotX} min={-180} max={180} step={1} onChange={v => set({ threeDRotX: v })} />
              <SR label="Rotate Y" value={s.threeDRotY} min={-180} max={180} step={1} onChange={v => set({ threeDRotY: v })} />
              <SR label="Rotate Z" value={s.threeDRotZ} min={-180} max={180} step={1} onChange={v => set({ threeDRotZ: v })} />
            </div>
          </div>

          {/* Physics & Aesthetics */}
          <div className="space-y-4 pt-3 border-t border-white/5">
            <p className="text-[8px] font-black uppercase tracking-widest text-white/20 px-0.5">Terminal Dynamics</p>
            <SR label="Inertia" value={s.threeDInertia} min={0} max={0.99} step={0.01} onChange={v => set({ threeDInertia: v })} />
            
            <div className="flex flex-col gap-2">
              <Tog label="Tactile Snap" icon={<Focus />} value={s.threeDSnap} onChange={v => set({ threeDSnap: v })} />
              {s.threeDSnap && (
                <div className="pl-1">
                  <BtnRow options={['15°', '45°', '90°']} value={[15, 45, 90].indexOf(s.threeDSnapAngle)} onChange={i => set({ threeDSnapAngle: [15, 45, 90][i] })} />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
              <p className="text-[8px] font-black uppercase tracking-widest text-white/20 px-0.5">Lighting</p>
              <SR label="Intensity" value={s.threeDLightIntensity} min={0} max={10} step={0.1} onChange={v => set({ threeDLightIntensity: v })} />
              <div className="flex items-center gap-3 px-0.5">
                <span className="text-[8px] font-black uppercase tracking-widest text-white/20">Color</span>
                <input type="color" value={s.threeDLightColor} onChange={e => set({ threeDLightColor: e.target.value })}
                  className="w-8 h-6 rounded-lg border border-white/10 bg-transparent cursor-pointer" />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Tog label="Analog Grid" icon={<Grid3x3 />} value={s.threeDGridEnabled} onChange={v => set({ threeDGridEnabled: v })} />
              {s.threeDGridEnabled && <SR label="Grid Opacity" value={s.threeDGridOpacity} min={0} max={1} step={0.01} onChange={v => set({ threeDGridOpacity: v })} />}
            </div>

            <div className="flex flex-col gap-2">
              <Tog label="CRT Scanlines" icon={<Monitor />} value={s.threeDScanlineEnabled} onChange={v => set({ threeDScanlineEnabled: v })} />
              {s.threeDScanlineEnabled && <SR label="Scanline Int." value={s.threeDScanlineIntensity} min={0} max={1} step={0.01} onChange={v => set({ threeDScanlineIntensity: v })} />}
            </div>
          </div>

          {/* Info note */}
          <div className="px-2 py-2 rounded-xl bg-white/[0.03] border border-white/5">
            <p className="text-[8px] text-white/25 font-bold uppercase tracking-widest text-center">
              Select an object in Object mode to preview 3D
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── TabBase — filtri essenziali (il "sogno del designer") ──────────────── */

function TabBase({ s, set }: { s: any; set: any }) {
  return (
    <div className="space-y-4 p-1">
      {/* Noise / Film grain */}
      <Sect label="Noise" icon={<Sparkles />} active={s.noiseEnabled} onToggle={v => set({ noiseEnabled: v })}>
        <Tog label="Monocromo" icon={<Circle />} value={s.noiseMonochrome} onChange={v => set({ noiseMonochrome: v })} />
        <SR label="Intensità" value={s.noiseIntensity} min={0} max={1.0} step={0.01} onChange={v => set({ noiseIntensity: v })} />
      </Sect>

      {/* Threshold — B/N adattivo */}
      <Sect label="Threshold" icon={<SlidersHorizontal />} active={s.thresholdEnabled} onToggle={v => set({ thresholdEnabled: v })}>
        <SR label="Soglia"       value={s.thresholdValue}     min={0} max={1.0} step={0.01} onChange={v => set({ thresholdValue: v })} />
        <SR label="Morbidezza"   value={s.thresholdSmoothing} min={0} max={0.5} step={0.01} onChange={v => set({ thresholdSmoothing: v })} />
      </Sect>

      {/* Vignette rapida — usa il bloom con threshold alto come workaround finché non c'è nodo dedicato */}
      <Sect label="Bloom / Alone" icon={<Sun />} active={s.bloomEnabled} onToggle={v => set({ bloomEnabled: v })}>
        <SR label="Intensità"  value={s.bloomIntensity} min={0}   max={3.0} step={0.05} onChange={v => set({ bloomIntensity: v })} />
        <SR label="Soglia"     value={s.bloomThreshold} min={0}   max={1.0} step={0.01} onChange={v => set({ bloomThreshold: v })} />
        <SR label="Raggio"     value={s.bloomRadius}    min={0.1} max={2.0} step={0.05} onChange={v => set({ bloomRadius: v })} />
      </Sect>

      {/* Halftone base */}
      <Sect label="Halftone" icon={<Grid3x3 />} active={s.halftoneEnabled} onToggle={v => set({ halftoneEnabled: v })}>
        <BtnRow options={['Punti', 'Linee', 'Croce', 'Diamante']} value={s.halftoneMode} onChange={i => set({ halftoneMode: i })} />
        <SR label="Passo"    value={s.halftoneSpacing}  min={0.005} max={0.1}  step={0.001} onChange={v => set({ halftoneSpacing: v })} />
        <SR label="Dim. Dot" value={s.halftoneDotSize}  min={0.1}   max={2.0}  step={0.05}  onChange={v => set({ halftoneDotSize: v })} />
        <SR label="Angolo"   value={s.halftoneAngle}    min={0}     max={360}  step={1}     onChange={v => set({ halftoneAngle: v })} />
      </Sect>

      {/* Dither */}
      <Sect label="Dither" icon={<Film />} active={s.ditherEnabled} onToggle={v => set({ ditherEnabled: v })}>
        <BtnRow options={['Bayer 4×4', 'Bayer 8×8']} value={s.ditherMode} onChange={i => set({ ditherMode: i })} />
        <SR label="Bit Depth" value={s.ditherColorDepth} min={1} max={16} step={1} onChange={v => set({ ditherColorDepth: v })} />
      </Sect>
    </div>
  )
}

/* ─── Tab bar ────────────────────────────────────────────────────────────── */

type Tab = 'base' | 'col' | 'opt' | 'dot' | 'sim' | '3d'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'base', label: 'Base',   icon: <Sliders />   },
  { id: 'col',  label: 'Colore', icon: <Palette />   },
  { id: 'opt',  label: 'Dist.',  icon: <Waves />     },
  { id: 'dot',  label: 'Pattern',icon: <Grid3x3 />   },
  { id: 'sim',  label: 'Sim.',   icon: <Wind />      },
  { id: '3d',   label: 'Genesis',icon: <Boxes />     },
]

/* ─── Main export ────────────────────────────────────────────────────────── */

export function LabPanel() {
  const [tab, setTab] = useState<Tab>('base')
  const labActive = useLabStore(s => s.labActive)
  const set = useLabStore(s => s.set)
  const s = useLabStore()

  if (!labActive) {
    return (
      <div onClick={() => set({ labActive: true })}
        className="p-5 rounded-[24px] border-2 cursor-pointer transition-all duration-500 bg-white/5 border-white/5 hover:border-white/15 group">
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
    <div className="flex flex-col gap-0" style={{ maxHeight: 'calc(100vh - 180px)' }}>
      {/* ── Header ── */}
      <div onClick={() => set({ labActive: false })}
        className="p-4 rounded-[20px] border-2 cursor-pointer transition-all duration-500 bg-accent/5 border-accent/20 hover:border-accent/40 group mb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center animate-pulse">
              <Zap className="w-4 h-4 text-accent fill-accent" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Vanguard V7 Active</p>
              <p className="text-[7px] text-accent/40 font-bold uppercase tracking-widest">Precision Projection</p>
            </div>
          </div>
          <FlaskConical className="w-4 h-4 text-accent/20 group-hover:rotate-180 transition-transform duration-700" />
        </div>
      </div>

      {/* ── Always-visible controls ── */}
      <div className="flex flex-col gap-2 mb-3 flex-shrink-0 px-0.5">
        {/* Target selector */}
        <div className="flex gap-1.5">
          {['Artboard', 'Object'].map((label, i) => {
            const isArtboard = i === 0;
            const isDisabled = isArtboard && tab === '3d';
            return (
            <button key={i}
              onClick={() => {
                if (!isDisabled) set({ filterTarget: isArtboard ? 'artboard' : 'object' })
              }}
              className={cn(
                "flex-1 py-1.5 rounded-xl text-[8px] font-black uppercase border transition-all",
                (s.filterTarget === 'object' ? 1 : 0) === i
                  ? "bg-accent/10 border-accent/40 text-accent"
                  : "border-white/5 text-white/20 hover:bg-white/5",
                isDisabled && "opacity-30 cursor-not-allowed hover:bg-transparent"
              )}>
              {label}
            </button>
          )})}
        </div>
        {/* Live animation toggle */}
        <div className={cn(
          "flex items-center justify-between px-3 py-1.5 rounded-xl border transition-all",
          s.animated ? "bg-accent/5 border-accent/20" : "border-white/5"
        )}>
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-white/30" />
            <span className="text-[8px] font-black uppercase tracking-widest text-white/30">Live</span>
          </div>
          <button onClick={() => set({ animated: !s.animated })}
            className={cn("w-7 h-4 rounded-full relative transition-all duration-300 p-0.5", s.animated ? "bg-accent" : "bg-white/10")}>
            <div className={cn("w-3 h-3 rounded-full bg-white shadow-sm transition-all transform", s.animated ? "translate-x-3" : "translate-x-0")} />
          </button>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 mb-3 flex-shrink-0">
        {TABS.map(t => (
          <button key={t.id} onClick={() => {
              setTab(t.id)
              if (t.id === '3d') set({ filterTarget: 'object' })
            }}
            className={cn(
              "flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl border transition-all duration-200",
              tab === t.id
                ? "bg-accent/10 border-accent/30 text-accent"
                : "border-white/5 text-white/20 hover:bg-white/5 hover:text-white/40"
            )}>
            {React.cloneElement(t.icon as React.ReactElement<{ className?: string }>, { className: 'w-3 h-3' })}
            <span className="text-[6px] font-black uppercase tracking-widest">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab content (scrollable) ── */}
      <div className="overflow-y-auto flex-1 pb-8 space-y-0" style={{ scrollbarWidth: 'none' }}>
        {tab === 'base' && <TabBase s={s} set={set} />}
        {tab === 'col'  && <TabCol  s={s} set={set} />}
        {tab === 'opt'  && <TabOpt  s={s} set={set} />}
        {tab === 'dot'  && <TabDot  s={s} set={set} />}
        {tab === 'sim'  && <TabSim  s={s} set={set} />}
        {tab === '3d'   && <TabGen  s={s} set={set} />}
      </div>
    </div>
  )
}
