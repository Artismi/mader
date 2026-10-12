'use client'

/**
 * Pannello Template: lo Studio genera proposte procedurali dai testi (ricette
 * pulite × palette × visual × finiture, guidate dagli esempi salvati); l'IA aiuta
 * solo quando glielo chiedi e propone, non applica:
 * - Suggerisci testi: 3 versioni tra cui scegliere
 * - Consigliami: le 3 proposte più adatte, con il motivo
 * - Aggiusta: descrivi la modifica, vedi l'anteprima, poi confermi
 */
import React, { useRef, useState } from 'react'
import { Heart, Shuffle, Sparkles, WandSparkles, X, Check, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ComposeBoard, ComposeContent } from '@/lib/design/compose-spec'
import type { RecipeFamily } from '@/lib/design/compose-recipes'
import { generateTemplates, loadExamples, saveExample, removeExample, type Proposal } from './generate'
import { renderPreview } from './preview'

const FORMATS: [string, string][] = [['quadrato', '1:1'], ['verticale', '4:5'], ['storia', '9:16'], ['orizzontale', '16:9']]
const FAMILIES: [RecipeFamily | 'auto', string][] = [['auto', 'Auto'], ['poster', 'Poster'], ['annuncio', 'Annuncio'], ['citazione', 'Citazione'], ['dati', 'Dati'], ['elenco', 'Elenco'], ['foto', 'Foto']]

function Field({ label, value, onChange, area }: { label: string; value: string; onChange: (v: string) => void; area?: boolean }) {
  const cls = 'w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white/80 focus:outline-none focus:border-accent/50'
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[8px] text-white/35 uppercase tracking-widest">{label}</span>
      {area ? <textarea rows={2} value={value} onChange={e => onChange(e.target.value)} className={cls + ' resize-none'} /> : <input value={value} onChange={e => onChange(e.target.value)} className={cls} />}
    </label>
  )
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={cn('px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider', on ? 'bg-white/15 text-white' : 'bg-white/5 text-white/40 hover:text-white/70')}>{children}</button>
}

function Btn({ onClick, children, title, disabled, primary }: { onClick: () => void; children: React.ReactNode; title?: string; disabled?: boolean; primary?: boolean }) {
  return (
    <button onClick={onClick} title={title} disabled={disabled}
      className={cn('h-7 px-2.5 rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:opacity-30',
        primary ? 'bg-accent text-black hover:brightness-110' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white')}>{children}</button>
  )
}

async function assist(body: Record<string, unknown>) {
  const r = await fetch('/api/ai/template-assist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const j = await r.json()
  if (!r.ok || j.error) throw new Error(j.error ?? `errore ${r.status}`)
  return j
}

export function TemplatePanel({ onApply, onClose }: { onApply: (b: ComposeBoard) => void; onClose: () => void }) {
  const [brief, setBrief] = useState('')
  const [c, setC] = useState<ComposeContent>({ title: '', subtitle: '', eyebrow: '', cta: '', brand: '' })
  const [format, setFormat] = useState('quadrato')
  const [family, setFamily] = useState<RecipeFamily | 'auto'>('auto')
  const [visual, setVisual] = useState(true)
  const [finish, setFinish] = useState(true)
  const [seed, setSeed] = useState(1)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [examples, setExamples] = useState<ComposeBoard[]>(() => loadExamples())
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [textOptions, setTextOptions] = useState<ComposeContent[]>([])
  const [ranking, setRanking] = useState<{ id: string; motivo: string }[]>([])
  const [instruction, setInstruction] = useState('')
  const [pending, setPending] = useState<{ board: ComposeBoard; thumb?: string; spiegazione: string } | null>(null)
  const gen = useRef(0)

  const set = (k: keyof ComposeContent, v: string) => setC(prev => ({ ...prev, [k]: v }))
  const clean = (x: ComposeContent): ComposeContent => Object.fromEntries(Object.entries(x).filter(([, v]) => v !== '' && v !== undefined)) as ComposeContent

  type Opt = { format: string; family: RecipeFamily | 'auto'; visual: boolean; finish: boolean }
  const generate = async (nextSeed = seed, o: Opt = { format, family, visual, finish }) => {
    if (!c.title?.trim() && !c.quote?.trim()) { setMsg('Scrivi almeno il titolo (o chiedi i testi all\'IA).'); return }
    setMsg(null); setRanking([]); setPending(null)
    const list = generateTemplates(clean(c), { format: o.format, family: o.family === 'auto' ? undefined : o.family, seed: nextSeed, visual: o.visual, finish: o.finish, examples, count: 6 })
    setProposals(list); setThumbs({}); setSelected(null)
    const my = ++gen.current
    for (const p of list) {
      try {
        const url = await renderPreview(p.board)
        if (gen.current !== my) return
        setThumbs(t => ({ ...t, [p.id]: url }))
      } catch (e) { console.warn('[template]', e) }
    }
  }
  // un cambio di formato o di opzioni rigenera, se ci sono già proposte
  const change = (patch: Partial<Opt>) => {
    const o = { format, family, visual, finish, ...patch }
    setFormat(o.format); setFamily(o.family); setVisual(o.visual); setFinish(o.finish)
    if (proposals.length) generate(seed, o)
  }

  const sel = proposals.find(p => p.id === selected)

  const askTexts = async () => {
    setBusy('testi'); setMsg(null)
    try { const j = await assist({ action: 'testi', brief, content: clean(c) }); setTextOptions(j.options ?? []) } catch (e) { setMsg((e as Error).message) } finally { setBusy(null) }
  }
  const askRanking = async () => {
    setBusy('consiglia'); setMsg(null)
    try { const j = await assist({ action: 'consiglia', brief, content: clean(c), proposals: proposals.map(p => ({ id: p.id, label: p.label })) }); setRanking(j.ranking ?? []) } catch (e) { setMsg((e as Error).message) } finally { setBusy(null) }
  }
  const askAdjust = async () => {
    if (!sel || !instruction.trim()) return
    setBusy('aggiusta'); setMsg(null)
    try {
      const j = await assist({ action: 'aggiusta', instruction, board: { ...sel.board, content: sel.board.content } })
      const patch = j.patch ?? {}
      const board: ComposeBoard = {
        ...sel.board,
        ...(patch.recipe ? { recipe: patch.recipe, style: patch.recipe.split('-')[1], layout: patch.recipe.split('-')[0] } : {}),
        ...(patch.palette !== undefined ? { palette: patch.palette } : {}),
        ...(patch.colors ? { colors: { ...(sel.board.colors ?? {}), ...patch.colors } } : {}),
        ...(patch.finish ? { finish: patch.finish } : {}),
        ...(patch.visual ? { visual: { ...(sel.board.visual ?? { source: 'glifo:Sparkle' }), ...patch.visual } } : {}),
        content: { ...sel.board.content, ...(patch.content ?? {}) },
      }
      setPending({ board, spiegazione: j.spiegazione ?? '' })
      const thumb = await renderPreview(board)
      setPending(p => (p ? { ...p, thumb } : p))
    } catch (e) { setMsg((e as Error).message) } finally { setBusy(null) }
  }
  const acceptAdjust = () => {
    if (!pending || !sel) return
    setProposals(ps => ps.map(p => (p.id === sel.id ? { ...p, board: pending.board, label: p.label + ' · aggiustato' } : p)))
    if (pending.thumb) setThumbs(t => ({ ...t, [sel.id]: pending.thumb! }))
    setPending(null); setInstruction('')
  }

  const rankOf = (id: string) => ranking.findIndex(r => r.id === id)

  return (
    <div className="bg-[#141414]/97 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-3 flex flex-col gap-3 w-[400px] max-h-[78vh] overflow-y-auto">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/70">Template</p>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 text-white/40"><X className="w-3.5 h-3.5" /></button>
      </div>

      <Field label="Brief (per l'IA, facoltativo)" value={brief} onChange={setBrief} area />
      <div className="flex gap-1"><Btn onClick={askTexts} disabled={!brief.trim() && !c.title || busy === 'testi'} title="L'IA propone 3 versioni dei testi: scegli tu"><Sparkles className="w-3 h-3" />{busy === 'testi' ? 'Scrivo…' : 'Suggerisci testi'}</Btn></div>
      {textOptions.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {textOptions.map((o, i) => (
            <button key={i} onClick={() => { setC(prev => ({ ...prev, ...o })); setTextOptions([]) }}
              className="text-left p-2 rounded-lg bg-white/[0.04] hover:bg-white/10 border border-white/5">
              <p className="text-[11px] font-bold text-white/85">{o.title}</p>
              {o.subtitle && <p className="text-[10px] text-white/50">{o.subtitle}</p>}
              <p className="text-[9px] text-white/30">{[o.eyebrow, o.cta].filter(Boolean).join(' · ')}</p>
            </button>
          ))}
          <p className="text-[8px] text-white/30">Clic su una versione per usarla.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Field label="Titolo" value={c.title ?? ''} onChange={v => set('title', v)} />
        <Field label="Occhiello" value={c.eyebrow ?? ''} onChange={v => set('eyebrow', v)} />
        <div className="col-span-2"><Field label="Sottotitolo" value={c.subtitle ?? ''} onChange={v => set('subtitle', v)} area /></div>
        <Field label="Invito (CTA)" value={c.cta ?? ''} onChange={v => set('cta', v)} />
        <Field label="Brand" value={c.brand ?? ''} onChange={v => set('brand', v)} />
      </div>

      <div className="flex flex-wrap gap-1">{FORMATS.map(([id, l]) => <Chip key={id} on={format === id} onClick={() => change({ format: id })}>{l}</Chip>)}</div>
      <div className="flex flex-wrap gap-1">{FAMILIES.map(([id, l]) => <Chip key={id} on={family === id} onClick={() => change({ family: id })}>{l}</Chip>)}</div>
      <div className="flex flex-wrap gap-1">
        <Chip on={visual} onClick={() => change({ visual: !visual })}>Visual 3D</Chip>
        <Chip on={finish} onClick={() => change({ finish: !finish })}>Finiture pack</Chip>
        {examples.length > 0 && <span className="text-[9px] text-white/35 self-center ml-1">{examples.length} esempi salvati guidano le proposte</span>}
      </div>

      <div className="flex gap-1">
        <Btn primary onClick={() => generate()}><WandSparkles className="w-3 h-3" />Genera proposte</Btn>
        {proposals.length > 0 && <Btn onClick={() => { const s = seed + 1; setSeed(s); generate(s) }} title="Altre combinazioni"><Shuffle className="w-3 h-3" />Rimescola</Btn>}
        {proposals.length > 0 && <Btn onClick={askRanking} disabled={busy === 'consiglia'} title="L'IA indica le più adatte al brief, senza applicare nulla"><Sparkles className="w-3 h-3" />{busy === 'consiglia' ? '…' : 'Consigliami'}</Btn>}
      </div>

      {proposals.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {proposals.map(p => {
            const rank = rankOf(p.id)
            return (
              <div key={p.id} className={cn('relative rounded-lg overflow-hidden border-2 cursor-pointer group', selected === p.id ? 'border-accent' : 'border-transparent')}
                onClick={() => setSelected(p.id)} title={p.label}>
                {/* eslint-disable-next-line @next/next/no-img-element -- miniature generate al volo (data URL) */}
                {thumbs[p.id] ? <img src={thumbs[p.id]} alt={p.label} className="w-full aspect-square object-cover bg-black/40" /> : <div className="w-full aspect-square bg-white/5 animate-pulse" />}
                {rank >= 0 && <span className="absolute top-1 left-1 w-4 h-4 rounded-full bg-accent text-black text-[9px] font-black flex items-center justify-center">{rank + 1}</span>}
                <button onClick={e => { e.stopPropagation(); setExamples(saveExample(p.board)); setMsg('Salvato come esempio: guiderà le prossime proposte.') }}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white/70 opacity-0 group-hover:opacity-100" title="Salva come esempio"><Heart className="w-3 h-3" /></button>
              </div>
            )
          })}
        </div>
      )}
      {ranking.length > 0 && (
        <div className="flex flex-col gap-1">
          {ranking.map((r, i) => <p key={r.id} className="text-[10px] text-white/55"><b className="text-accent">{i + 1}.</b> {r.motivo}</p>)}
        </div>
      )}

      {sel && (
        <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
          <p className="text-[9px] text-white/40">{sel.label}</p>
          <div className="flex gap-1">
            <Btn primary onClick={() => onApply(sel.board)}><Plus className="w-3 h-3" />Metti sul canvas</Btn>
            <Btn onClick={() => { setExamples(saveExample(sel.board)); setMsg('Salvato come esempio.') }}><Heart className="w-3 h-3" />Esempio</Btn>
          </div>
          <Field label="Aggiusta con l'IA (es. più minimale, titolo più corto, oro invece di cromo)" value={instruction} onChange={setInstruction} />
          <div className="flex gap-1"><Btn onClick={askAdjust} disabled={!instruction.trim() || busy === 'aggiusta'}><Sparkles className="w-3 h-3" />{busy === 'aggiusta' ? 'Preparo…' : 'Proponi modifica'}</Btn></div>
          {pending && (
            <div className="flex gap-2 items-start p-2 rounded-lg bg-white/[0.04]">
              {/* eslint-disable-next-line @next/next/no-img-element -- miniatura generata al volo */}
              {pending.thumb ? <img src={pending.thumb} alt="modifica proposta" className="w-24 aspect-square object-cover rounded" /> : <div className="w-24 aspect-square bg-white/5 animate-pulse rounded" />}
              <div className="flex-1 flex flex-col gap-1.5">
                <p className="text-[10px] text-white/60">{pending.spiegazione}</p>
                <div className="flex gap-1">
                  <Btn primary onClick={acceptAdjust}><Check className="w-3 h-3" />Usa</Btn>
                  <Btn onClick={() => setPending(null)}><X className="w-3 h-3" />Scarta</Btn>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {examples.length > 0 && (
        <details className="text-[9px] text-white/40">
          <summary className="cursor-pointer">Esempi salvati ({examples.length})</summary>
          <div className="flex flex-col gap-1 mt-1">
            {examples.map((e, i) => (
              <div key={i} className="flex items-center justify-between">
                <span>{e.recipe}{e.visual ? ` · ${e.visual.source} ${e.visual.treatment ?? ''}` : ''}</span>
                <button onClick={() => setExamples(removeExample(i))} className="text-white/30 hover:text-white"><X className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        </details>
      )}
      {msg && <p className="text-[10px] text-amber-300/90">{msg}</p>}
    </div>
  )
}
