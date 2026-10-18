'use client'

/**
 * Pannello Template. Dal brief la catena di ruoli dell'IA (analista,
 * copywriter, direttore creativo, con i controlli della maestra) scrive i
 * testi e sceglie sei direzioni visive; il motore compone un vivaio quattro
 * volte più ampio delle proposte e il critico tiene le 12 migliori diverse. Sulla proposta scelta i regolatori la ricompongono
 * dal vivo, senza altre chiamate all'IA. Senza IA: esempi e campi a mano.
 */
import React, { useRef, useState } from 'react'
import { Plus, RefreshCw, Send, Sparkles, WandSparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DesignContent, Format, Scene } from './types'
import { STYLES, inferStyle } from './styles'
import { findPhoto } from './generate'
import { renderPreview, sfondoPixel } from './preview'
import { grigliaNumerata, ordineOcchio } from './occhio-studio'
import { generateSystem, proposeKnobs, proponi, SISTEMI, TRATTAMENTI, RANGE_KNOBS, rng, type Knobs } from './gen'
import type { Idea } from './gen/concetto'

const N_PROPOSTE = 12

const FORMATS: [Format, string][] = [['quadrato', '1:1'], ['verticale', '4:5'], ['storia', '9:16'], ['orizzontale', '16:9']]

/** Esempi pronti: mostrano cosa sa fare il motore senza IA, e si modificano. */
const EXAMPLES: { label: string; c: DesignContent }[] = [
  { label: 'Caffè', c: { brand: 'Tostatura Nera', kicker: 'Nuovo blend', title: 'Notte Etiope', numero: '250 g', body: 'Note di cacao, spezie e frutti rossi. Tostato a Bologna in piccoli lotti.', details: ['250 g', 'Etiopia Guji', 'Tostatura media'], cta: 'Assaggia il blend', imageQuery: 'chicchi di caffè tostati' } },
  { label: 'Evento', c: { brand: 'Cassero Club', kicker: 'Sabato 14 novembre', title: 'Notte Industriale', numero: '14.11', body: 'Sei ore di techno con tre live set e le luci di Studio Lumen.', details: ['Dalle 23', 'Bologna', 'Ingresso 15 €'], cta: 'Biglietti online', imageQuery: 'concerto luci club' } },
  { label: 'Ceramica', c: { brand: 'Terra Mossa', kicker: 'Collezione autunno', title: 'Tazze in gres smaltate a mano', body: 'Argilla toscana e smalti naturali. Ogni pezzo è diverso dall’altro.', details: ['Pezzi unici', 'Lavastoviglie'], cta: 'Vedi la collezione', imageQuery: 'tazze in ceramica artigianale' } },
  { label: 'App', c: { brand: 'Salvadana', kicker: 'Nuova app', title: 'Metti da parte senza pensarci', body: 'Arrotonda ogni spesa e risparmia la differenza, in automatico.', details: ['Gratis', 'iOS e Android'], cta: 'Scarica l’app' } },
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

interface Form { brand: string; kicker: string; title: string; body: string; details: string; cta: string; numero: string; imageQuery: string }
const EMPTY: Form = { brand: '', kicker: '', title: '', body: '', details: '', cta: '', numero: '', imageQuery: '' }
const toForm = (c: Partial<DesignContent>): Form => ({ ...EMPTY, ...c, details: (c.details ?? []).join(', ') } as Form)
const toContent = (f: Form): DesignContent => ({
  brand: f.brand.trim() || undefined, kicker: f.kicker.trim() || undefined, title: f.title.trim(),
  body: f.body.trim() || undefined, cta: f.cta.trim() || undefined, numero: f.numero.trim() || undefined, imageQuery: f.imageQuery.trim() || undefined,
  details: f.details.split(/[,;\n]/).map(d => d.trim()).filter(Boolean),
})

/** Direzione del direttore creativo (dalla regia). */
interface Direzione { sistema: Knobs['sistema']; stile: string; trattamento: Knobs['trattamento']; inverti: boolean; regolatori: Record<'scala' | 'energia' | 'densita' | 'sovrastampa' | 'grana', [number, number]>; perche: string }
interface Regia {
  analisi: { brand: string; foto: string }
  testi: { titoli: { testo: string; enfasi: string }[]; occhiello: string; testo: string; dettagli: string[]; invito: string; numero: string }
  direzioni: Direzione[]
  modelli: Record<string, string>
}

/** Regolatori dentro gli intervalli scelti dal direttore (più varianti per direzione, semi diversi). */
function knobsFrom(d: Direzione, seed: number, enfasi?: string): Knobs {
  const r = rng(seed)
  const pick = ([lo, hi]: [number, number]) => lo + (hi - lo) * r.next()
  return {
    sistema: d.sistema, stile: d.stile, trattamento: d.trattamento, inverti: d.inverti,
    scala: pick(d.regolatori.scala), energia: pick(d.regolatori.energia), densita: pick(d.regolatori.densita),
    sovrastampa: pick(d.regolatori.sovrastampa), grana: pick(d.regolatori.grana), seme: r.int(1, 99999), enfasi,
  }
}

const sistemaNome = (id: string) => SISTEMI.find(s => s.id === id)?.nome ?? id
const stileNome = (id: string) => STYLES.find(s => s.id === id)?.name ?? id

export function DesignPanel({ onApply, onClose }: { onApply: (sc: Scene) => void; onClose: () => void }) {
  const [brief, setBrief] = useState('')
  const [cliente, setCliente] = useState('')
  const [istruzione, setIstruzione] = useState('')
  const [esito, setEsito] = useState<string | null>(null)
  const [f, setF] = useState<Form>(EMPTY)
  const [format, setFormat] = useState<Format>('quadrato')
  const [titoli, setTitoli] = useState<{ testo: string; enfasi: string }[]>([])
  const [enfasi, setEnfasi] = useState<string | undefined>()
  const [direzioni, setDirezioni] = useState<Direzione[]>([])
  const [modelli, setModelli] = useState<Record<string, string> | null>(null)
  const [items, setItems] = useState<{ k: Knobs; sc: Scene | null; thumb?: string; segnalata?: boolean }[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const photoCache = useRef(new Map<string, string | undefined>())
  const gen = useRef(0)

  const set = (k: keyof Form, v: string) => setF(p => ({ ...p, [k]: v }))

  async function photoFor(c: DesignContent, fmt: Format) {
    if (!c.imageQuery) return undefined
    const key = `${c.imageQuery}|${fmt}`
    if (!photoCache.current.has(key)) photoCache.current.set(key, await findPhoto(c.imageQuery, fmt))
    return photoCache.current.get(key)
  }

  /** Le idee del brief (C1): una chiamata breve al modello dal portale; senza chiave o credito, le regole. */
  const ideeCache = useRef(new Map<string, { idee: Idea[]; fonte: string; modello?: string }>())
  async function ideeDelBrief(c: DesignContent) {
    const key = [c.title, c.kicker, c.body].join('|')
    if (!ideeCache.current.has(key)) {
      try {
        const r = await fetch('/api/design/idee', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: c }) })
        if (r.ok) ideeCache.current.set(key, await r.json())
      } catch { /* senza rete: proponi usa le regole */ }
    }
    return ideeCache.current.get(key)
  }

  /** Compone e mostra le proposte: dalle direzioni dell'IA, oppure una per sistema. */
  async function compose(o: { form?: Form; format?: Format; dirs?: Direzione[]; enfasi?: string } = {}) {
    const fmt = o.format ?? format, c = toContent(o.form ?? f), dirs = o.dirs ?? direzioni, enf = o.enfasi ?? enfasi
    if (!c.title) { setMsg('Scrivi almeno il titolo, oppure parti dal brief con l’IA.'); return }
    setMsg(null); setBusy('compongo'); setSelected(null)
    const my = ++gen.current
    try {
      const photo = await photoFor(c, fmt)
      if (c.imageQuery && !photo) setMsg('Non ho trovato una foto per quel soggetto: le proposte usano fondi generativi.')
      // quattro varianti per direzione dell'IA; il motore completa il vivaio (quattro volte le proposte),
      // il critico esamina tutto e restano le 12 migliori diverse tra loro
      const ks: Knobs[] = dirs.flatMap((d, i) => [0, 1, 2, 3].map(j => knobsFrom(d, 1000 + i * 97 + j * 7919, enf)))
      setItems(Array.from({ length: N_PROPOSTE }, () => ({ k: ks[0] ?? proposeKnobs(c, { hasPhoto: !!photo })[0], sc: null })))
      setBusy('cerco le idee')
      const concetto = await ideeDelBrief(c)
      const p = await proponi(c, fmt, { pixel: sc => sfondoPixel(sc), photo, n: N_PROPOSTE, knobs: ks, idee: concetto?.idee, onProgress: (a, b) => gen.current === my && setBusy(`compongo ${a}/${b}`) })
      if (gen.current !== my) return
      setBusy('compongo')
      setMsg(`${p.promosse} promosse dal critico su ${p.candidate} candidate · idee ${concetto?.fonte === 'modello' ? `dal modello ${concetto.modello ?? ''}` : 'dalle regole'}.`)
      const scene = p.scene.map(sc => ({ ...sc, knobs: { ...sc.knobs, enfasi: enf } }))
      setItems(scene.map(sc => ({ k: sc.knobs as Knobs, sc })))
      const thumbs: string[] = []
      for (let i = 0; i < scene.length; i++) {
        const thumb = await renderPreview(scene[i])
        if (gen.current !== my) return
        thumbs[i] = thumb
        setItems(list => { const n = list.slice(); n[i] = { ...n[i], thumb }; return n })
      }
      // l'occhio: un modello con visione guarda le proposte in una griglia e le mette in ordine (una chiamata)
      if (thumbs.length >= 2 && thumbs.every(Boolean)) {
        setBusy('l’occhio guarda le proposte')
        try {
          const griglia = await grigliaNumerata(thumbs)
          const r = await fetch('/api/design/occhio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ griglia, n: thumbs.length }) })
          const cl = r.ok ? await r.json() as { ordine: number[]; scarta: number[]; fonte: string; modello?: string } : null
          if (gen.current !== my) return
          if (cl?.fonte === 'modello') {
            const { pos, segnalate } = ordineOcchio(thumbs.length, cl.ordine, cl.scarta)
            setItems(list => pos.map(i => ({ ...list[i], segnalata: segnalate.has(i) || undefined })))
            setSelected(s => (s === null ? null : pos.indexOf(s)))
            setMsg(m => `${(m ?? '').replace(/.$/, '')} · ordinate dall’occhio (${cl.modello ?? 'modello con visione'})${segnalate.size ? `, ${segnalate.size} da rivedere in fondo` : ''}.`)
          }
        } catch { /* senza occhio resta l'ordine del critico */ }
      }
    } catch (e) {
      setMsg((e as Error).message)
    } finally {
      if (gen.current === my) setBusy(null)
    }
  }

  /** Ricompone solo la proposta scelta con regolatori nuovi (dal vivo, senza IA). */
  async function retune(i: number, patch: Partial<Knobs>) {
    const it = items[i]; if (!it) return
    const k = { ...it.k, ...patch }
    const c = toContent(f)
    const my = ++gen.current
    setItems(list => { const n = list.slice(); n[i] = { ...n[i], k }; return n })
    const sc = await generateSystem(c, format, k, await photoFor(c, format))
    if (gen.current !== my) return
    const thumb = sc ? await renderPreview(sc) : undefined
    if (gen.current !== my) return
    setItems(list => { const n = list.slice(); n[i] = { k, sc, thumb }; return n })
    if (!sc) setMsg('Con questi regolatori la composizione non regge (testi che non stanno o non si leggono): prova altri valori.')
    else setMsg(null)
  }

  /** Regia dell'IA: testi, titoli alternativi e sei direzioni. */
  async function fromBrief() {
    setBusy('regia'); setMsg(null)
    try {
      const r = await fetch('/api/ai/design-direct', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brief, slides: 1, cliente: cliente.trim() || undefined }) })
      const j = await r.json() as Regia & { error?: string }
      if (!r.ok || j.error) throw new Error(j.error ?? `errore ${r.status}`)
      const t = j.testi
      const form = toForm({ brand: j.analisi.brand, kicker: t.occhiello, title: t.titoli[0]?.testo ?? '', body: t.testo, details: t.dettagli, cta: t.invito, numero: t.numero, imageQuery: j.analisi.foto })
      setF(form); setTitoli(t.titoli); setEnfasi(t.titoli[0]?.enfasi); setDirezioni(j.direzioni); setModelli(j.modelli)
      await compose({ form, dirs: j.direzioni, enfasi: t.titoli[0]?.enfasi })
    } catch (e) {
      setMsg((e as Error).message)
    } finally {
      setBusy(b => (b === 'regia' ? null : b))
    }
  }

  /** "Fallo nel sistema": il guscio agente (/api/ai/agent) salva nel piano, crea incarichi, ecc. con i testi di questa grafica. */
  async function nelSistema() {
    setBusy('sistema'); setEsito(null)
    try {
      const contesto = JSON.stringify({ cliente: cliente.trim() || undefined, brief: brief.trim() || undefined, formato: format, ...toContent(f) }, null, 1)
      const r = await fetch('/api/ai/agent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compito: istruzione, contesto, gruppi: ['social', 'lavoro', 'clienti', 'idee', 'memoria'], maxPassi: 10 }),
      })
      const j = await r.json() as { ok?: boolean; testo?: string; error?: string; proposte?: { strumento: string }[]; modello?: string }
      if (j.error) throw new Error(j.error)
      const prop = j.proposte?.length ? ` Da confermare: ${j.proposte.map(p => p.strumento).join(', ')}.` : ''
      setEsito(`${j.testo ?? ''}${prop}${j.modello ? ` (${j.modello})` : ''}`.trim())
      if (j.ok) setIstruzione('')
    } catch (e) {
      setEsito((e as Error).message)
    } finally {
      setBusy(b => (b === 'sistema' ? null : b))
    }
  }

  const sel = selected !== null ? items[selected] : null
  const aspect = format === 'storia' ? 'aspect-[9/16]' : format === 'verticale' ? 'aspect-[4/5]' : format === 'orizzontale' ? 'aspect-video' : 'aspect-square'
  const autoStyle = f.title ? inferStyle([f.brand, f.title, f.body, f.imageQuery].join(' '), 'lancio').name : null

  return (
    <div className="bg-[#141414]/97 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl p-3 flex flex-col gap-3 w-[440px] max-h-[82vh] overflow-y-auto">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/70">Template</p>
        <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 text-white/40"><X className="w-3.5 h-3.5" /></button>
      </div>

      {/* 1. brief → regia dell'IA */}
      <Field label="Cliente (facoltativo: la regia legge brand, piano e memoria)" value={cliente} onChange={setCliente} placeholder="Nome del cliente in Creative OS" />
      <Field label="Brief" value={brief} onChange={setBrief} area placeholder="Es. Tostatura Nera di Bologna lancia il blend Notte Etiope: 250 g, Etiopia Guji, note di cacao e frutti rossi. Post per Instagram." />
      <div className="flex items-center gap-1">
        <Btn primary onClick={fromBrief} disabled={brief.trim().length < 10 || !!busy} title="L'IA scrive i testi e sceglie sei direzioni; lo Studio compone un vivaio e il critico sceglie le 12 migliori">
          <Sparkles className="w-3 h-3" />{busy === 'regia' ? 'L’IA sta lavorando…' : 'Genera con l’IA'}
        </Btn>
        {modelli && <span className="text-[8px] text-white/30 truncate" title={Object.entries(modelli).map(([r, m]) => `${r}: ${m}`).join('\n')}>con {[...new Set(Object.values(modelli))].join(', ')}</span>}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-[8px] text-white/35 uppercase tracking-widest mr-1">Senza IA</span>
        {EXAMPLES.map(e => <Chip key={e.label} on={false} onClick={() => { const form = toForm(e.c); setF(form); setTitoli([]); setDirezioni([]); setModelli(null); setEnfasi(undefined); compose({ form, dirs: [] }) }}>{e.label}</Chip>)}
      </div>

      {/* 2. testi (modificabili) e titoli alternativi */}
      {titoli.length > 1 && (
        <div className="flex flex-col gap-1">
          <span className="text-[8px] text-white/40 uppercase tracking-widest">Titoli proposti</span>
          {titoli.map(t => (
            <button key={t.testo} onClick={() => { const form = { ...f, title: t.testo }; setF(form); setEnfasi(t.enfasi); compose({ form, enfasi: t.enfasi }) }}
              className={cn('text-left px-2 py-1 rounded-md text-[11px]', f.title === t.testo ? 'bg-white/15 text-white' : 'bg-white/5 text-white/60 hover:text-white')}>
              {t.testo} <span className="text-[8px] text-accent/80 uppercase ml-1">{t.enfasi}</span>
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Brand" value={f.brand} onChange={v => set('brand', v)} />
        <Field label="Occhiello" value={f.kicker} onChange={v => set('kicker', v)} />
        <div className="col-span-2"><Field label="Titolo" value={f.title} onChange={v => set('title', v)} /></div>
        <div className="col-span-2"><Field label="Testo" value={f.body} onChange={v => set('body', v)} area /></div>
        <div className="col-span-2"><Field label="Dettagli (separati da virgola)" value={f.details} onChange={v => set('details', v)} /></div>
        <Field label="Invito" value={f.cta} onChange={v => set('cta', v)} />
        <Field label="Numero protagonista" value={f.numero} onChange={v => set('numero', v)} placeholder="14.11, -30%, 250 g" />
        <div className="col-span-2"><Field label="Foto: cosa mostra" value={f.imageQuery} onChange={v => set('imageQuery', v)} placeholder="vuoto = fondi generativi" /></div>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {FORMATS.map(([id, l]) => <Chip key={id} on={format === id} onClick={() => { setFormat(id); if (items.length) compose({ format: id }) }}>{l}</Chip>)}
        <span className="flex-1" />
        <Btn onClick={() => compose()} disabled={!!busy}><WandSparkles className="w-3 h-3" />{busy?.startsWith('compongo') ? `Compongo${busy.length > 8 ? busy.slice(8) : '…'}` : 'Componi'}</Btn>
      </div>
      {!direzioni.length && autoStyle && <p className="text-[8px] text-white/30">Senza IA: il motore genera il vivaio dallo stile del contenuto ({autoStyle}) e il critico sceglie.</p>}

      {/* 3. proposte */}
      {items.length > 0 && (
        <div className={cn('grid gap-2', format === 'orizzontale' ? 'grid-cols-2' : 'grid-cols-3')}>
          {items.map((it, i) => (
            <button key={i} onClick={() => it.sc && setSelected(i)} title={it.sc?.esame ? `Critico: ${it.sc.esame.voto}/100 · ${[...it.sc.esame.gesti, ...it.sc.esame.difetti].join(' · ')}` : ''}
              className={cn('relative rounded-lg overflow-hidden border-2 text-left', selected === i ? 'border-accent' : 'border-transparent', !it.sc && it.thumb === undefined && !busy?.startsWith('compongo') && 'opacity-40')}>
              {/* eslint-disable-next-line @next/next/no-img-element -- miniature generate al volo (data URL) */}
              {it.thumb ? <img src={it.thumb} alt={it.k.sistema} className={cn('w-full object-cover bg-black/40', aspect)} />
                : <div className={cn('w-full bg-white/5 flex items-center justify-center text-[8px] text-white/30', aspect, busy?.startsWith('compongo') && 'animate-pulse')}>{busy?.startsWith('compongo') ? '' : 'non regge'}</div>}
              <span className="absolute bottom-0 inset-x-0 px-1.5 py-1 text-[8px] text-white/80 bg-black/55 truncate">{sistemaNome(it.k.sistema)} · {stileNome(it.k.stile)}{it.sc?.esame ? ` · ${it.sc.esame.voto}` : ''}</span>
              {it.segnalata && <span className="absolute top-1 right-1 rounded px-1 py-0.5 text-[7px] uppercase tracking-widest bg-black/70 text-amber-300" title="L’occhio la sconsiglia: guardala prima di usarla">da rivedere</span>}
            </button>
          ))}
        </div>
      )}

      {/* 4. regolatori dal vivo sulla proposta scelta */}
      {sel && selected !== null && (
        <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
          <div className="flex gap-1">
            <Btn primary onClick={() => sel.sc && onApply(sel.sc)} disabled={!sel.sc}><Plus className="w-3 h-3" />Metti sul canvas</Btn>
            <Btn onClick={() => retune(selected, { seme: Math.floor(Math.random() * 99999) })} title="Stessi regolatori, variante nuova"><RefreshCw className="w-3 h-3" />Variante</Btn>
          </div>
          {RANGE_KNOBS.map(r => (
            <label key={r.key} className="flex items-center gap-2" title={r.hint}>
              <span className="w-20 text-[8px] text-white/45 uppercase tracking-widest">{r.nome}</span>
              <input type="range" min={0} max={1} step={0.05} value={sel.k[r.key] ?? 0.35} className="flex-1 accent-[var(--accent,#c6f432)]"
                onChange={e => setItems(list => { const n = list.slice(); n[selected] = { ...n[selected], k: { ...n[selected].k, [r.key]: Number(e.target.value) } }; return n })}
                onPointerUp={e => retune(selected, { [r.key]: Number((e.target as HTMLInputElement).value) })}
                onKeyUp={e => retune(selected, { [r.key]: Number((e.target as HTMLInputElement).value) })} />
            </label>
          ))}
          <div className="flex flex-wrap gap-1">{TRATTAMENTI.map(t => <Chip key={t.id} on={sel.k.trattamento === t.id} onClick={() => retune(selected, { trattamento: t.id })}>{t.nome}</Chip>)}</div>
          <div className="flex flex-wrap gap-1">{SISTEMI.map(s => <Chip key={s.id} on={sel.k.sistema === s.id} onClick={() => retune(selected, { sistema: s.id })} title={s.idea}>{s.nome}</Chip>)}</div>
          <div className="flex flex-wrap gap-1">
            {STYLES.map(s => (
              <Chip key={s.id} on={sel.k.stile === s.id} onClick={() => retune(selected, { stile: s.id })}>
                <span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ background: s.accent, boxShadow: `0 0 0 2px ${s.bg}` }} />{s.name}
              </Chip>
            ))}
            <Chip on={sel.k.inverti} onClick={() => retune(selected, { inverti: !sel.k.inverti })} title="Fondo nel colore d'accento">Inverti</Chip>
          </div>
        </div>
      )}
      {msg && <p className="text-[10px] text-amber-300/90">{msg}</p>}

      {/* 5. nel sistema: il guscio agente usa i testi di questa grafica */}
      {f.title && (
        <div className="flex flex-col gap-1 pt-2 border-t border-white/5">
          <Field label="Nel sistema" value={istruzione} onChange={setIstruzione} placeholder="Es. salvala come bozza nel piano di Tostatura Nera per venerdì alle 18" />
          <div className="flex items-center gap-1">
            <Btn onClick={nelSistema} disabled={istruzione.trim().length < 5 || !!busy} title="L'assistente salva nel piano editoriale, crea incarichi o idee usando i testi di questa grafica; le azioni delicate restano da confermare">
              <Send className="w-3 h-3" />{busy === 'sistema' ? 'Lavoro nel sistema…' : 'Fallo nel sistema'}
            </Btn>
          </div>
          {esito && <p className="text-[10px] text-white/70 whitespace-pre-wrap">{esito}</p>}
        </div>
      )}
    </div>
  )
}
