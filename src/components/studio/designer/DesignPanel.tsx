'use client'

/**
 * Pannello Template: scrivi i contenuti (o falli compilare all'IA dal brief),
 * lo Studio impagina come un designer: stile scelto dal contenuto, foto vera
 * del soggetto, 5–6 impaginazioni diverse, tutte controllate (niente testi
 * sovrapposti o fuori bordo). Scegli e metti sul canvas.
 */
import React, { useRef, useState } from 'react'
import { Plus, Sparkles, WandSparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DesignContent, Format, Scene } from './types'
import { STYLES } from './styles'
import { findPhoto, generateDesigns, styleFor } from './generate'
import { renderPreview } from './preview'

const FORMATS: [Format, string][] = [['quadrato', '1:1'], ['verticale', '4:5'], ['storia', '9:16'], ['orizzontale', '16:9']]

/** Esempi pronti: mostrano cosa sa fare il motore e si modificano. */
const EXAMPLES: { label: string; c: DesignContent }[] = [
  { label: 'Caffè', c: { brand: 'Tostatura Nera', kicker: 'Nuovo blend', title: 'Notte Etiope', body: 'Note di cacao, spezie e frutti rossi. Tostato a Bologna in piccoli lotti.', details: ['250 g', 'Etiopia Guji', 'Tostatura media'], cta: 'Scopri il blend', imageQuery: 'chicchi di caffè tostati' } },
  { label: 'Ceramica', c: { brand: 'Terra Mossa', kicker: 'Collezione autunno', title: 'Tazze in gres smaltate a mano', body: 'Argilla toscana e smalti naturali. Ogni pezzo è diverso dall\'altro.', details: ['Pezzi unici', 'Lavabili in lavastoviglie'], cta: 'Vedi la collezione', imageQuery: 'tazze in ceramica artigianale' } },
  { label: 'App', c: { brand: 'Salvadana', kicker: 'Nuova app', title: 'Metti da parte senza pensarci', body: 'Arrotonda ogni spesa e risparmia la differenza, in automatico.', details: ['Gratis', 'iOS e Android'], cta: 'Scarica l\'app' } },
  { label: 'Beauty', c: { brand: 'Maison Lune', kicker: 'Nuovo siero', title: 'La pelle, di notte', body: 'Niacinamide e peptidi per una pelle più uniforme al risveglio.', details: ['30 ml', 'Vegano', 'Senza profumo'], cta: 'Provalo ora', imageQuery: 'flacone siero skincare' } },
]

function Field({ label, value, onChange, area, placeholder }: { label: string; value: string; onChange: (v: string) => void; area?: boolean; placeholder?: string }) {
  const cls = 'w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white/85 placeholder:text-white/25 focus:outline-none focus:border-accent/50'
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[8px] text-white/40 uppercase tracking-widest">{label}</span>
      {area
        ? <textarea rows={2} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} className={cls + ' resize-none'} />
        : <input value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} className={cls} />}
    </label>
  )
}

function Chip({ on, onClick, children, title }: { on: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return <button title={title} onClick={onClick} className={cn('px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider', on ? 'bg-white/15 text-white' : 'bg-white/5 text-white/40 hover:text-white/70')}>{children}</button>
}

function Btn({ onClick, children, title, disabled, primary }: { onClick: () => void; children: React.ReactNode; title?: string; disabled?: boolean; primary?: boolean }) {
  return (
    <button onClick={onClick} title={title} disabled={disabled}
      className={cn('h-7 px-2.5 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:opacity-30',
        primary ? 'bg-accent text-black hover:brightness-110' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white')}>{children}</button>
  )
}

interface Form { brand: string; kicker: string; title: string; body: string; details: string; cta: string; imageQuery: string }
const EMPTY: Form = { brand: '', kicker: '', title: '', body: '', details: '', cta: '', imageQuery: '' }
const toForm = (c: Partial<DesignContent>): Form => ({ ...EMPTY, ...c, details: (c.details ?? []).join(', ') } as Form)
const toContent = (f: Form): DesignContent => ({
  brand: f.brand.trim() || undefined, kicker: f.kicker.trim() || undefined, title: f.title.trim(),
  body: f.body.trim() || undefined, cta: f.cta.trim() || undefined, imageQuery: f.imageQuery.trim() || undefined,
  details: f.details.split(/[,;\n]/).map(d => d.trim()).filter(Boolean),
})

export function DesignPanel({ onApply, onClose }: { onApply: (sc: Scene) => void; onClose: () => void }) {
  const [brief, setBrief] = useState('')
  const [f, setF] = useState<Form>(EMPTY)
  const [format, setFormat] = useState<Format>('quadrato')
  const [styleId, setStyleId] = useState<string>('auto')
  const [scenes, setScenes] = useState<Scene[]>([])
  const [thumbs, setThumbs] = useState<string[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const photoCache = useRef(new Map<string, string | undefined>())
  const gen = useRef(0)

  const set = (k: keyof Form, v: string) => setF(p => ({ ...p, [k]: v }))
  const content = toContent(f)
  const autoStyle = content.title ? styleFor(content, { format }).name : null

  const generate = async (o: { format?: Format; styleId?: string; form?: Form } = {}) => {
    const fmt = o.format ?? format, sid = o.styleId ?? styleId
    const c = toContent(o.form ?? f)
    if (!c.title) { setMsg('Scrivi almeno il titolo, oppure fallo compilare all\'IA dal brief.'); return }
    setMsg(null); setBusy('genera'); setSelected(null)
    const my = ++gen.current
    try {
      // la foto del soggetto: cercata una volta per soggetto e formato
      let photo: string | undefined
      if (c.imageQuery) {
        const key = `${c.imageQuery}|${fmt}`
        if (!photoCache.current.has(key)) photoCache.current.set(key, await findPhoto(c.imageQuery, fmt))
        photo = photoCache.current.get(key)
        if (!photo) setMsg('Non ho trovato una foto per quel soggetto: ti mostro le versioni tipografiche.')
      }
      const list = await generateDesigns(c, { format: fmt, styleId: sid === 'auto' ? undefined : sid }, photo)
      if (gen.current !== my) return
      setScenes(list); setThumbs([])
      if (!list.length) setMsg('Con questi testi non sta niente di pulito: accorcia il titolo o il testo.')
      for (let i = 0; i < list.length; i++) {
        const url = await renderPreview(list[i])
        if (gen.current !== my) return
        setThumbs(t => { const n = t.slice(); n[i] = url; return n })
      }
    } catch (e) {
      setMsg((e as Error).message)
    } finally {
      if (gen.current === my) setBusy(null)
    }
  }

  const fillFromBrief = async () => {
    setBusy('brief'); setMsg(null)
    try {
      const r = await fetch('/api/ai/template-assist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'contenuti', brief, content }) })
      const j = await r.json()
      if (!r.ok || j.error) throw new Error(j.error ?? `errore ${r.status}`)
      const form = toForm(j.content ?? {})
      setF(form)
      await generate({ form })
    } catch (e) { setMsg((e as Error).message) } finally { setBusy(b => (b === 'brief' ? null : b)) }
  }

  const aspect = format === 'storia' ? 'aspect-[9/16]' : format === 'verticale' ? 'aspect-[4/5]' : format === 'orizzontale' ? 'aspect-video' : 'aspect-square'

  return (
    <div className="bg-[#141414]/97 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-3 flex flex-col gap-3 w-[420px] max-h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/70">Template</p>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 text-white/40"><X className="w-3.5 h-3.5" /></button>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <span className="text-[8px] text-white/35 uppercase tracking-widest mr-1">Esempi</span>
        {EXAMPLES.map(e => <Chip key={e.label} on={false} onClick={() => { const form = toForm(e.c); setF(form); generate({ form }) }}>{e.label}</Chip>)}
      </div>

      <Field label="Brief per l'IA (facoltativo)" value={brief} onChange={setBrief} area placeholder="Es. lancio del nuovo blend di caffè etiope di Tostatura Nera, 250 g, note di cacao" />
      <div className="flex gap-1">
        <Btn onClick={fillFromBrief} disabled={!brief.trim() || busy === 'brief'} title="L'IA compila i campi qui sotto dal brief; l'impaginazione la fa lo Studio">
          <Sparkles className="w-3 h-3" />{busy === 'brief' ? 'Compilo…' : 'Compila dal brief'}
        </Btn>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Brand" value={f.brand} onChange={v => set('brand', v)} />
        <Field label="Occhiello" value={f.kicker} onChange={v => set('kicker', v)} placeholder="Nuovo blend" />
        <div className="col-span-2"><Field label="Titolo" value={f.title} onChange={v => set('title', v)} /></div>
        <div className="col-span-2"><Field label="Testo" value={f.body} onChange={v => set('body', v)} area /></div>
        <div className="col-span-2"><Field label="Dettagli (separati da virgola)" value={f.details} onChange={v => set('details', v)} placeholder="250 g, Etiopia Guji, Tostatura media" /></div>
        <Field label="Invito" value={f.cta} onChange={v => set('cta', v)} placeholder="Scopri il blend" />
        <Field label="Foto: cosa mostra" value={f.imageQuery} onChange={v => set('imageQuery', v)} placeholder="vuoto = solo tipografia" />
      </div>

      <div className="flex flex-wrap gap-1">{FORMATS.map(([id, l]) => <Chip key={id} on={format === id} onClick={() => { setFormat(id); if (scenes.length) generate({ format: id }) }}>{l}</Chip>)}</div>
      <div className="flex flex-wrap gap-1">
        <Chip on={styleId === 'auto'} onClick={() => { setStyleId('auto'); if (scenes.length) generate({ styleId: 'auto' }) }} title="Scelto dal contenuto">
          Auto{autoStyle ? ` · ${autoStyle}` : ''}
        </Chip>
        {STYLES.map(s => (
          <Chip key={s.id} on={styleId === s.id} onClick={() => { setStyleId(s.id); if (scenes.length) generate({ styleId: s.id }) }}>
            <span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ background: s.accent, boxShadow: `0 0 0 2px ${s.bg}` }} />{s.name}
          </Chip>
        ))}
      </div>

      <div className="flex gap-1">
        <Btn primary onClick={() => generate()} disabled={busy === 'genera'}><WandSparkles className="w-3 h-3" />{busy === 'genera' ? 'Impagino…' : 'Genera proposte'}</Btn>
      </div>

      {scenes.length > 0 && (
        <div className={cn('grid gap-2', format === 'orizzontale' ? 'grid-cols-2' : 'grid-cols-3')}>
          {scenes.map((sc, i) => (
            <button key={`${sc.layout}-${i}`} onClick={() => setSelected(i)} title={sc.label}
              className={cn('relative rounded-lg overflow-hidden border-2 text-left', selected === i ? 'border-accent' : 'border-transparent')}>
              {/* eslint-disable-next-line @next/next/no-img-element -- miniature generate al volo (data URL) */}
              {thumbs[i] ? <img src={thumbs[i]} alt={sc.label} className={cn('w-full object-cover bg-black/40', aspect)} /> : <div className={cn('w-full bg-white/5 animate-pulse', aspect)} />}
              <span className="absolute bottom-0 inset-x-0 px-1.5 py-1 text-[8px] text-white/80 bg-black/55 truncate">{sc.label}</span>
            </button>
          ))}
        </div>
      )}

      {selected !== null && scenes[selected] && (
        <div className="flex gap-1 pt-2 border-t border-white/5">
          <Btn primary onClick={() => onApply(scenes[selected])}><Plus className="w-3 h-3" />Metti sul canvas</Btn>
        </div>
      )}
      {msg && <p className="text-[10px] text-amber-300/90">{msg}</p>}
    </div>
  )
}
