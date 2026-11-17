'use client'

/**
 * Lo studio dell'artista-osservatore: avvio della giornata, galleria con il
 * ragionamento dietro ogni opera, la mente aperta (poetica, criteri, voci,
 * strumenti, mappa del sapere), il quaderno e le impostazioni.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AgentState, Work } from '@/lib/studio-agent/core/types'
import { loadOrCreate, runDay } from '@/lib/studio-agent/day'
import { mapCounts } from '@/lib/studio-agent/reader/lexicon'
import { contradictions } from '@/lib/studio-agent/reader/logic'
import { uid } from '@/lib/studio-agent/core/rng'

type Tab = 'galleria' | 'mente' | 'quaderno' | 'impostazioni'
const API = '/api/studio-agent'

const box = 'rounded-xl border border-white/10 bg-white/[0.03] p-4'
const btn = 'rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:bg-white/10 disabled:opacity-40'
const h = 'text-xs uppercase tracking-widest text-white/50 mb-2'

export function StudioAgent() {
  const [st, setSt] = useState<AgentState | null>(null)
  const [works, setWorks] = useState<Work[]>([])
  const [tab, setTab] = useState<Tab>('galleria')
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const [sel, setSel] = useState<Work | null>(null)
  const [auto, setAuto] = useState(false)
  const [fast, setFast] = useState(true)
  const [nDays, setNDays] = useState(10)
  const [progress, setProgress] = useState('')
  const stop = useRef(false)
  const preview = useRef<HTMLCanvasElement>(null)

  const refresh = useCallback(async () => {
    setSt(await loadOrCreate())
    setWorks(await fetch(`${API}/works`).then(r => r.json()).catch(() => []))
  }, [])
  useEffect(() => { refresh() }, [refresh])

  /** lancia una o più giornate di fila; la galleria si aggiorna a ogni tavola */
  const run = useCallback(async (days = 1) => {
    if (!st || running) return
    setRunning(true); setLog([]); setTab('galleria'); stop.current = false
    let cur = st
    const t0 = performance.now()
    try {
      for (let d = 0; d < days && !stop.current; d++) {
        setProgress(days > 1 ? `giornata ${d + 1} di ${days}` : '')
        const { state, works } = await runDay(cur, {
          fast,
          log: m => setLog(l => [...l, m].slice(-300)),
          preview: c => {
            const p = preview.current; if (!p) return
            p.width = c.width; p.height = c.height
            p.getContext('2d')!.drawImage(c, 0, 0)
          },
          onWork: w => { setWorks(ws => [w, ...ws]); setSel(w) },
          shouldStop: () => stop.current,
        })
        cur = state; setSt(state)
        const per = (performance.now() - t0) / (d + 1) / 1000
        setLog(l => [...l, `— Giorno ${state.day} chiuso: ${works.length} tavol${works.length > 1 ? 'e' : 'a'}. Media ${per.toFixed(1)} s a giornata${days > 1 ? `, stima per ${days}: ${((per * days) / 60).toFixed(0)} min` : ''}.`])
      }
    } catch (e) {
      setLog(l => [...l, `Errore: ${e instanceof Error ? e.message : String(e)}`])
    } finally { setRunning(false); setProgress('') }
  }, [st, running, fast])

  // giornata automatica: una al giorno, finché la pagina è aperta
  useEffect(() => {
    if (!auto) return
    const tick = () => {
      if (!st || running) return
      const last = st.lastRun ? new Date(st.lastRun).toDateString() : ''
      if (last !== new Date().toDateString()) run(1)
    }
    tick()
    const t = setInterval(tick, 10 * 60 * 1000)
    return () => clearInterval(t)
  }, [auto, st, running, run])

  if (!st) return <div className="p-8 text-white/60">Apro lo studio…</div>

  return (
    <div className="h-full w-full overflow-y-auto p-6 text-white/90">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-2xl font-semibold">{st.name || 'Artista senza nome'}</div>
          <div className="text-sm text-white/50">Giorno {st.day} · umore {st.mood} · {works.length} opere{st.lastRun ? ` · ultima giornata ${new Date(st.lastRun).toLocaleString('it-IT')}` : ''}</div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-white/60"><input type="checkbox" checked={fast} onChange={e => setFast(e.target.checked)} /> veloce</label>
          <label className="flex items-center gap-2 text-sm text-white/60"><input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} /> una giornata al giorno</label>
          <button className={btn} disabled={running} onClick={() => run(1)}>Avvia giornata</button>
          <input type="number" min={1} max={2000} value={nDays} onChange={e => setNDays(Math.max(1, Number(e.target.value) || 1))} className="w-20 rounded border border-white/15 bg-transparent px-2 py-1 text-sm" />
          <button className={btn} disabled={running} onClick={() => run(nDays)}>giornate di fila</button>
          {running && <button className={btn} onClick={() => { stop.current = true }}>Ferma dopo questa tavola</button>}
          {progress && <span className="text-sm text-white/50">{progress}</span>}
        </div>
      </div>

      {(running || log.length > 0) && (
        <div className="mb-6 grid gap-4 md:grid-cols-[320px_1fr]">
          <div className={box}><canvas ref={preview} className="w-full rounded bg-black/40" /></div>
          <div className={`${box} max-h-[420px] overflow-y-auto font-mono text-xs leading-relaxed`}>
            {log.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </div>
      )}

      <div className="mb-4 flex gap-1">
        {(['galleria', 'mente', 'quaderno', 'impostazioni'] as Tab[]).map(t => (
          <button key={t} className={`${btn} ${tab === t ? 'bg-white/10' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {tab === 'galleria' && <Gallery works={works} sel={sel} setSel={setSel} />}
      {tab === 'mente' && <Mind st={st} />}
      {tab === 'quaderno' && <Notebook st={st} works={works} open={w => { setSel(w); setTab('galleria') }} />}
      {tab === 'impostazioni' && <Settings st={st} onSaved={refresh} />}
    </div>
  )
}

function Gallery({ works, sel, setSel }: { works: Work[]; sel: Work | null; setSel: (w: Work | null) => void }) {
  if (!works.length) return <div className="text-white/50">Ancora nessuna opera. Avvia la prima giornata.</div>
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_520px]">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {works.map(w => (
          <button key={w.id} onClick={() => setSel(w)} className={`text-left ${sel?.id === w.id ? 'ring-2 ring-white/60' : ''} rounded-lg`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={w.image} alt={w.title} className={`aspect-[4/5] w-full rounded-lg object-cover ${w.kept ? '' : 'opacity-40 grayscale'}`} />
            <div className="mt-1 truncate text-sm">{w.title || 'Senza titolo'}</div>
            <div className="text-xs text-white/40">giorno {w.day}{w.tavola ? ` · tavola ${w.tavola}` : ''}{w.ragione && w.ragione !== 'prima' ? ` · ${w.ragione}` : ''}{w.kept ? '' : ' · buttata'}</div>
          </button>
        ))}
      </div>
      {sel && <WorkDetail w={sel} />}
    </div>
  )
}

function Bar({ k, v }: { k: string; v: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="w-28 shrink-0 text-white/50">{k}</div>
      <div className="h-1.5 flex-1 rounded bg-white/10"><div className="h-1.5 rounded bg-white/60" style={{ width: `${Math.round(Math.max(0, Math.min(1, v)) * 100)}%` }} /></div>
      <div className="w-10 text-right tabular-nums text-white/50">{v.toFixed(2)}</div>
    </div>
  )
}

function WorkDetail({ w }: { w: Work }) {
  const [note, setNote] = useState('')
  const [sent, setSent] = useState(false)
  const acc = new Set(w.debate.accepted)
  return (
    <div className="space-y-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={w.image} alt={w.title} className="w-full rounded-xl" />
      <div>
        <div className="text-xl font-semibold">{w.title || 'Senza titolo'}</div>
        <div className="text-xs text-white/40">giorno {w.day}{w.tavola ? ` · tavola ${w.tavola} (${w.ragione})` : ''} · {w.mood} · {w.intention.register} · {w.kept ? 'tenuta' : 'buttata'} · interesse {Math.round(w.interest * 100)} · novità {Math.round(w.novelty * 100)}</div>
      </div>
      <div className={`${box} whitespace-pre-wrap text-sm leading-relaxed`}>{w.text}</div>
      <div className={box}>
        <div className={h}>Intenzione</div>
        <div className="text-sm">«{w.intention.word}» — {w.intention.why}</div>
        <div className="mt-2 text-xs text-white/50">bersagli: {Object.entries(w.intention.targets).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(' · ')} · strumenti: {w.intention.tools.join(', ')}</div>
      </div>
      {w.readings.length > 0 && (
        <div className={box}>
          <div className={h}>Letture</div>
          {w.readings.map(r => <div key={r.url} className="text-sm"><a className="underline decoration-white/30 hover:decoration-white" href={r.url} target="_blank" rel="noreferrer">{r.title}</a> <span className="text-white/40">· {r.source}</span></div>)}
        </div>
      )}
      <div className={box}>
        <div className={h}>Dibattito interno</div>
        <div className="space-y-1.5">
          {w.debate.args.map(a => (
            <div key={a.id} className={`text-sm ${acc.has(a.id) ? '' : 'text-white/35 line-through decoration-white/20'}`}>
              <span className={a.polarity === 'pro' ? 'text-emerald-300/80' : 'text-rose-300/80'}>{a.voice}</span> <span className="text-white/40">({a.weight.toFixed(2)})</span> {a.claim}
            </div>
          ))}
        </div>
      </div>
      <div className={box}>
        <div className={h}>Scheda visiva</div>
        <div className="mb-3 flex gap-1">{w.visual.palette.map(c => <div key={c} className="h-6 flex-1 rounded" style={{ background: c }} title={c} />)}</div>
        <div className="space-y-1">{Object.entries(w.visual.features).map(([k, v]) => <Bar key={k} k={k} v={v} />)}</div>
      </div>
      <div className={box}>
        <div className={h}>Gesti</div>
        <div className="space-y-0.5 font-mono text-xs">
          {w.gestures.map((g, i) => <div key={i} className={g.kept ? '' : 'text-white/35'}>{g.kept ? '✓' : '✗'} {g.tool} {g.delta >= 0 ? '+' : ''}{g.delta} <span className="text-white/30">{JSON.stringify(g.params).slice(0, 120)}</span></div>)}
        </div>
      </div>
      <div className={`${box} flex flex-wrap items-center gap-2`}>
        <div className={`${h} mb-0 mr-2`}>Per te?</div>
        {([1, -1] as const).map(v => (
          <button key={v} className={btn} onClick={async () => {
            await fetch(`${API}/visit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: '', vote: v, workId: w.id }) })
            setSent(true)
          }}>{v > 0 ? 'tiene' : 'non tiene'}</button>
        ))}
        <span className="text-xs text-white/40">lo saprà alla prossima giornata</span>
      </div>
      <div className={box}>
        <div className={h}>Lascia una nota in studio</div>
        <textarea className="w-full rounded bg-black/30 p-2 text-sm" rows={3} value={note} onChange={e => { setNote(e.target.value); setSent(false) }} placeholder="La leggerà all'inizio della prossima giornata, come la reazione di chi passa." />
        <button className={`${btn} mt-2`} disabled={!note.trim()} onClick={async () => {
          await fetch(`${API}/visit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: note, workId: w.id }) })
          setNote(''); setSent(true)
        }}>Lascia la nota</button>
        {sent && <span className="ml-2 text-xs text-white/50">lasciata</span>}
      </div>
    </div>
  )
}

function Mind({ st }: { st: AgentState }) {
  const counts = mapCounts(st)
  const contr = useMemo(() => contradictions(st.beliefs), [st.beliefs])
  const byState = (s: string) => Object.values(st.lexicon).filter(e => e.state === s).slice(0, 60)
  const poetics = st.poetics.slice().reverse()
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={box}>
        <div className={h}>Poetica</div>
        {poetics.map((p, i) => (
          <div key={p.day + '-' + i} className={`mb-4 whitespace-pre-wrap text-sm ${i ? 'text-white/40' : ''}`}>
            <div className="mb-1 text-xs text-white/40">giorno {p.day}</div>{p.text}
          </div>
        ))}
      </div>
      <div className="space-y-4">
        <div className={box}>
          <div className={h}>Criteri (giudicati dalla storia)</div>
          {st.criteria.slice().sort((a, b) => b.weight - a.weight).map(c => (
            <div key={c.id} className="text-sm"><span className="inline-block w-32 text-white/60">{c.feature}</span> ≈ {c.target.toFixed(2)} ±{c.tolerance.toFixed(2)} · peso {c.weight.toFixed(2)} <span className="text-white/30">nato il giorno {c.born}</span></div>
          ))}
        </div>
        <div className={box}>
          <div className={h}>Voci</div>
          {Object.entries(st.voices).sort((a, b) => b[1] - a[1]).map(([k, v]) => <Bar key={k} k={k} v={v / 2.5} />)}
        </div>
        <div className={box}>
          <div className={h}>Strumenti (senso appreso)</div>
          {Object.entries(st.tools).sort((a, b) => b[1].gain - a[1].gain).map(([k, t]) => (
            <div key={k} className="text-sm"><span className="inline-block w-28 text-white/60">{k}</span> usi {t.uses} · resa {t.gain.toFixed(2)} <span className="text-xs text-white/30">{Object.entries(t.effect).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 3).map(([f, d]) => `${f} ${d > 0 ? '+' : ''}${d.toFixed(2)}`).join(' · ')}</span></div>
          ))}
        </div>
        <div className={box}>
          <div className={h}>Registri e gusto</div>
          {Object.entries(st.registers).map(([k, v]) => <Bar key={k} k={k} v={v / 3} />)}
          <div className="mt-2 text-sm text-white/60">picco di novità (Wundt): {st.wundtPeak.toFixed(2)} · temperatura {st.temperature}</div>
        </div>
      </div>
      <div className={`${box} lg:col-span-2`}>
        <div className={h}>Mappa del sapere · ancorate {counts.ancorata} · definite {counts.definita} · a vuoto {counts.a_vuoto} · ignote {counts.ignota}</div>
        <div className="grid gap-4 md:grid-cols-3">
          {(['ancorata', 'definita', 'a_vuoto'] as const).map(s => (
            <div key={s}>
              <div className="mb-1 text-xs text-white/50">{s.replace('_', ' ')}</div>
              <div className="flex flex-wrap gap-1">{byState(s).map(e => <span key={e.word} title={e.definition ?? e.anchor ?? ''} className="rounded bg-white/5 px-1.5 py-0.5 text-xs">{e.word}</span>)}</div>
            </div>
          ))}
        </div>
      </div>
      <div className={box}>
        <div className={h}>Domande aperte</div>
        {st.questions.filter(q => !q.closed).map(q => <div key={q.id} className="text-sm">{q.text} <span className="text-white/30">(dal giorno {q.openedDay}, {q.visits} visite)</span></div>)}
        {st.questions.some(q => q.closed) && <div className="mt-2 text-xs text-white/40">chiuse: {st.questions.filter(q => q.closed).map(q => q.word).join(', ')}</div>}
      </div>
      <div className={box}>
        <div className={h}>Contraddizioni ({st.beliefs.length} affermazioni lette)</div>
        {contr.length ? contr.map((c, i) => (
          <div key={i} className="mb-1 text-sm">{c.a.s} {c.a.neg ? 'non ' : ''}{c.a.p} {c.a.o} <span className="text-white/30">({c.a.source})</span> ↔ {c.b.s} {c.b.neg ? 'non ' : ''}{c.b.p} {c.b.o} <span className="text-white/30">({c.b.source})</span></div>
        )) : <div className="text-sm text-white/40">Nessuna, per ora.</div>}
      </div>
    </div>
  )
}

function Notebook({ st, works, open }: { st: AgentState; works: Work[]; open: (w: Work) => void }) {
  return (
    <div className="space-y-3">
      {st.notebook.slice().reverse().map(e => {
        const ws = (e.workIds ?? (e.workId ? [e.workId] : [])).map(id => works.find(x => x.id === id)).filter(Boolean) as Work[]
        return (
          <div key={e.day} className={box}>
            <div className="mb-1 flex items-baseline justify-between">
              <div className="font-semibold">Giorno {e.day}</div>
              <div className="flex gap-2">{ws.map(w => <button key={w.id} className="text-xs underline text-white/50" onClick={() => open(w)}>{w.title || 'tavola ' + (w.tavola ?? '')}</button>)}</div>
            </div>
            <div className="text-sm">{e.intention}</div>
            {e.wants.length > 0 && <div className="mt-1 text-sm text-emerald-200/70">vorrei: {e.wants.join(' · ')}</div>}
            {e.bored.length > 0 && <div className="text-sm text-rose-200/60">non voglio più: {e.bored.join(' · ')}</div>}
            <details className="mt-2 text-xs text-white/50"><summary>verbale</summary>{e.verbale.map((l, i) => <div key={i}>{l}</div>)}</details>
          </div>
        )
      })}
      {!st.notebook.length && <div className="text-white/50">Il quaderno è vuoto.</div>}
    </div>
  )
}

function Settings({ st, onSaved }: { st: AgentState; onSaved: () => void }) {
  const [feeds, setFeeds] = useState(st.feeds.join('\n'))
  const [shaders, setShaders] = useState(st.shaders.map(s => `${s.url} | ${s.license}`).join('\n'))
  const [msg, setMsg] = useState('')
  const save = async () => {
    const next: AgentState = {
      ...st,
      feeds: feeds.split('\n').map(s => s.trim()).filter(Boolean),
      shaders: shaders.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
        const [url, license = 'da verificare'] = l.split('|').map(x => x.trim())
        const old = st.shaders.find(s => s.url === url)
        return old ? { ...old, license } : { id: uid(), url, license, uses: 0, gain: 0.5 }
      }),
    }
    await fetch(`${API}/state`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) })
    setMsg('salvato'); onSaved()
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={box}>
        <div className={h}>Da dove legge</div>
        <p className="mb-2 text-xs text-white/50">Una fonte per riga: <code>wiki:casuale</code>, <code>wiki:vetrina</code>, l&apos;indirizzo di un feed RSS, oppure <code>pagina:https://…</code>. In più rilegge i file .md e .txt messi in <code>data/studio-agent/biblioteca/</code> (per esempio le note di ricerca di stateyour).</p>
        <textarea className="h-48 w-full rounded bg-black/30 p-2 font-mono text-xs" value={feeds} onChange={e => setFeeds(e.target.value)} />
      </div>
      <div className={box}>
        <div className={h}>Codice raccolto (shader GLSL)</div>
        <p className="mb-2 text-xs text-white/50">Un indirizzo https per riga, testo grezzo dello shader, seguito da <code>| licenza</code>. Usa solo sorgenti con licenza libera. Gli shader girano in un contesto WebGL chiuso: niente rete, niente file.</p>
        <textarea className="h-48 w-full rounded bg-black/30 p-2 font-mono text-xs" value={shaders} onChange={e => setShaders(e.target.value)} />
      </div>
      <div className="flex items-center gap-3 lg:col-span-2">
        <button className={btn} onClick={save}>Salva</button>
        <span className="text-sm text-white/50">{msg}</span>
        <button className={`${btn} ml-auto border-rose-400/30 text-rose-200/80`} onClick={async () => {
          if (!window.confirm("Ricominciare da zero? L'artista perde memoria, poetica e criteri. Le opere restano in archivio.")) return
          await fetch(`${API}/state`, { method: 'DELETE' }); onSaved()
        }}>Ricomincia da zero</button>
      </div>
    </div>
  )
}
