// L'officina della città: un abitante scrive un generatore (una catena di strumenti), lo prova su un foglio vuoto
// e su qualche tavola del cassetto, e lo tiene o lo butta. Si può partire da zero, fare un ramo di un programma
// che c'è (cambiare una regolazione, scambiare, aggiungere o togliere un passo, spostarlo) o innestarne due.
// Ogni passo ha un tempo massimo: chi si blocca o si rompe è respinto, come una modifica che git non accetta,
// e la causa resta scritta. Gira nel browser del giro.
import type { AgentState } from '../core/types'
import type { Rnd } from '../core/rng'
import { TOOLS, type ToolCtx } from '../hands/tools'
import { emptySheet, type Sheet } from '../hands/sheet'
import { look } from './studio'
import { scegli, applicaDove, visibile } from './quaderno'
import { officinaDi, testoProgramma, aggiornaRicette, type Programma, type Passo } from './ricette'

const LENTO = 9000 // ms per passo
const conTempo = <T>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<never>((_, no) => setTimeout(() => no(new Error(`troppo lento (oltre ${ms / 1000}s)`)), ms))])

export type Richiesta = { autore: string; scopo: string; strumenti: string[]; modo: 'zero' | 'ramo' | 'innesto'; base?: string; giorno: number }
export type Esito = { richiesta: Richiesta; programma: Programma; testo: string; tenuto: boolean; perche: string }

async function esegui(passi: Passo[], s: Sheet, ctx: ToolCtx) {
  let cur = s, ms = 0
  for (const ps of passi) {
    const t = TOOLS.find(x => x.id === ps.tool); if (!t) throw new Error(`lo strumento ${ps.tool} non esiste`)
    const t0 = performance.now()
    cur = await conTempo(applicaDove(t, cur, ps.p as never, ctx, ps.dove), LENTO)
    ms += performance.now() - t0
  }
  return { sheet: cur, ms }
}

function passoNuovo(st: AgentState, r: Rnd, id: string, s: Sheet, ctx: ToolCtx): Passo | null {
  const t = TOOLS.find(x => x.id === id); if (!t) return null
  try { if (!t.available(s, ctx)) return null } catch { return null }
  const f = look(st, s, ctx.intention).f
  const sc = scegli(st, t, s, ctx, f, r, 8)
  return { tool: id, p: sc.p as Record<string, unknown>, dove: sc.dove }
}

/** un ramo: una sola modifica, come un commit piccolo */
function muta(st: AgentState, r: Rnd, p: Passo[], strumenti: string[], s: Sheet, ctx: ToolCtx): { passi: Passo[]; cosa: string } {
  const q = p.map(x => ({ ...x, p: { ...x.p } }))
  const k = Math.floor(r() * q.length), x = r()
  if (x < 0.4) { // una regolazione
    const nums = Object.entries(q[k].p).filter(([kk, v]) => typeof v === 'number' && !kk.startsWith('__') && !/^(seed|seme|layer)$/i.test(kk))
    if (nums.length) { const [kk, v] = nums[Math.floor(r() * nums.length)]; const nv = (v as number) * (0.6 + r() * 0.8); q[k].p[kk] = Number.isInteger(v) ? Math.max(1, Math.round(nv)) : nv; return { passi: q, cosa: `${q[k].tool}: ${kk} da ${(v as number).toFixed?.(2) ?? v} a ${nv.toFixed(2)}` } }
  }
  if (x < 0.6 && q.length > 1) { const via = q.splice(k, 1)[0]; return { passi: q, cosa: `tolto ${via.tool}` } }
  if (x < 0.8 && q.length < 5) { const n = passoNuovo(st, r, strumenti[Math.floor(r() * strumenti.length)], s, ctx); if (n) { q.splice(Math.floor(r() * (q.length + 1)), 0, n); return { passi: q, cosa: `aggiunto ${n.tool}` } } }
  if (x < 0.9 && q.length > 1) { const j = (k + 1) % q.length;[q[k], q[j]] = [q[j], q[k]]; return { passi: q, cosa: `scambiato l'ordine di ${q[j].tool} e ${q[k].tool}` } }
  const n = passoNuovo(st, r, q[k].tool, s, ctx); if (n) { q[k] = n; return { passi: q, cosa: `nuove regolazioni per ${n.tool}` } }
  return { passi: q, cosa: 'niente' }
}

/** quanto vale un programma: si vede, regge, cambia qualcosa, e non è uguale a quelli che ci sono già */
async function valuta(st: AgentState, passi: Passo[], fogli: { sheet: Sheet; parola: string }[], ctxDi: (w: string) => ToolCtx) {
  let tot = 0, ms = 0, n = 0
  for (const f of fogli) {
    const ctx = ctxDi(f.parola)
    const prima = look(st, f.sheet, ctx.intention)
    const { sheet, ms: t } = await esegui(passi, f.sheet, ctx)
    const dopo = look(st, sheet, ctx.intention), vis = visibile(f.sheet, sheet)
    // vale se si vede (ma non cancella tutto) e se la tavola migliora o resta in piedi
    tot += (dopo.score - prima.score) * 2 + Math.min(vis, 0.25) * 2 - Math.max(0, vis - 0.5) * 2
    ms += t; n++
  }
  return { punteggio: tot / Math.max(1, n), ms: ms / Math.max(1, n) }
}

export async function officinaGiro(st: AgentState, r: Rnd, richieste: Richiesta[], fogli: { sheet: Sheet; parola: string }[], ctxDi: (w: string) => ToolCtx, log?: (m: string) => void): Promise<Esito[]> {
  const O = officinaDi(st), out: Esito[] = []
  const vuoto = (w: string) => ({ sheet: emptySheet(800, 1000, ctxDi(w).tone.bg), parola: w })
  for (const q of richieste.slice(0, 3)) {
    const prova = [vuoto(q.scopo), ...fogli.sort(() => r() - 0.5).slice(0, 2)]
    const ctx = ctxDi(q.scopo), base = O.programmi.find(p => p.id === q.base && p.stato === 'tenuto')
    const altro = O.programmi.filter(p => p.stato === 'tenuto' && p.id !== base?.id)[Math.floor(r() * 10)]
    let passi: Passo[] = [], cosa = '', modo = q.modo
    if (modo === 'ramo' && base) { const m = muta(st, r, base.passi, q.strumenti, prova[0].sheet, ctx); passi = m.passi; cosa = `ramo di «${base.nome}»: ${m.cosa}` }
    else if (modo === 'innesto' && base && altro) { passi = [...base.passi.slice(0, Math.ceil(base.passi.length / 2)), ...altro.passi.slice(Math.floor(altro.passi.length / 2))].slice(0, 5); cosa = `innesto di «${base.nome}» e «${altro.nome}»` }
    else {
      // da zero: un generatore deve poter partire dal foglio vuoto, quindi il primo passo è uno che crea (se le sue mani
      // sanno solo trasformare, prende in prestito un gesto che fa nascere qualcosa); poi i suoi strumenti, provati sul risultato
      modo = 'zero'
      const CREANO = ['semina', 'pattern', 'geometria', 'traccia', 'universo', 'muffa', 'cristallo', 'acqua', 'flusso', 'scrivi', 'ripeti', 'sciame', 'particelle', 'colata', 'ondine']
      const n = 2 + Math.floor(r() * 3)
      let s0 = prova[0].sheet
      const primi = [...q.strumenti.filter(t => CREANO.includes(t)), ...CREANO.sort(() => r() - 0.5)]
      for (const t of primi) { const ps = passoNuovo(st, r, t, s0, ctx); if (ps) { passi.push(ps); try { s0 = (await esegui([ps], s0, ctx)).sheet } catch { passi.pop(); continue } break } }
      for (let i = 1, tent = 0; i < n && tent < 12; tent++) { const ps = passoNuovo(st, r, q.strumenti[Math.floor(r() * q.strumenti.length)], s0, ctx); if (ps) { passi.push(ps); i++; try { s0 = (await esegui([ps], s0, ctx)).sheet } catch { passi.pop() } } }
      cosa = 'da zero'
    }
    if (!passi.length) { log?.(`Officina: ${q.autore} non è riuscito a mettere insieme niente per «${q.scopo}» (nessuno strumento disponibile).`); continue }
    const prog: Programma = { id: `p${Date.now().toString(36)}${Math.floor(r() * 1e4)}`, nome: `${q.scopo}${modo === 'zero' ? '' : modo === 'ramo' ? ' (ramo)' : ' (innesto)'} ${O.programmi.filter(p => p.scopo === q.scopo).length + 1}`, autore: q.autore, padre: base?.id, madre: modo === 'innesto' ? altro?.id : undefined, modo, passi, scopo: q.scopo, nato: q.giorno, versione: (base?.versione ?? 0) + 1, stato: 'in prova' }
    let tenuto = false, perche = ''
    try {
      const v = await valuta(st, passi, prova, ctxDi)
      prog.punteggio = +v.punteggio.toFixed(3); prog.ms = Math.round(v.ms)
      const soglia = base?.punteggio ?? 0.05
      tenuto = v.punteggio > soglia && v.ms < LENTO * 1.5
      prog.stato = tenuto ? 'tenuto' : 'buttato'
      perche = tenuto ? (base ? `fa meglio del padre (${v.punteggio.toFixed(2)} contro ${soglia.toFixed(2)})` : `regge (${v.punteggio.toFixed(2)})`) : v.ms >= LENTO * 1.5 ? `troppo lento (${Math.round(v.ms)} ms)` : `non migliora (${v.punteggio.toFixed(2)} contro ${soglia.toFixed(2)})`
    } catch (e) { prog.stato = 'respinto'; perche = `respinto: ${e instanceof Error ? e.message : e}` }
    prog.nota = `${cosa}; ${perche}`
    O.programmi.push(prog)
    const testo = testoProgramma(prog)
    O.diario.push({ giorno: q.giorno, testo: `${q.autore}: ${prog.nome} — ${prog.nota} — ${testo}` })
    log?.(`Officina: ${q.autore} prova «${prog.nome}» (${cosa}): ${perche}. ${testo}`)
    out.push({ richiesta: q, programma: prog, testo, tenuto, perche })
  }
  // si tengono al massimo 16 programmi buoni (i peggiori vanno in archivio come buttati) e il diario resta corto
  const tenuti = O.programmi.filter(p => p.stato === 'tenuto').sort((a, b) => (b.punteggio ?? 0) - (a.punteggio ?? 0))
  for (const p of tenuti.slice(16)) { p.stato = 'buttato'; p.nota = (p.nota ?? '') + '; superato da altri' }
  O.programmi = [...O.programmi.filter(p => p.stato === 'tenuto'), ...O.programmi.filter(p => p.stato !== 'tenuto').slice(-60)]
  O.diario = O.diario.slice(-120)
  aggiornaRicette(st)
  return out
}
