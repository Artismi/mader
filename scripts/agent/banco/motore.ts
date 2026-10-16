/**
 * Motore del banco G6 (L1): esegue i compiti con ritmo dosato, riprova dopo
 * 503 e 429 con attese crescenti, salva lo stato dopo ogni compito (si riparte
 * da quelli già fatti) e conta i token per compito riuscito, per profilo.
 * Funzioni pure o con `dormi` iniettabile: i test non aspettano davvero.
 */
import fs from 'node:fs'

export interface Token { input: number; cached: number; output: number }
export interface Riga {
  id: string; area: string; ok: boolean; eseguito?: boolean; motivo: string; passi: number; ms: number
  token?: Token; errori: number; respinte?: string[]; modelloUsato?: string; testo?: string
  /** L1: profilo di guida e token spesi da tutti i modelli provati */
  livello?: string; spesa?: Token; tentativi?: number
}

/** Cosa fare dopo un compito non eseguito: riprovare più tardi, o fermarsi (quota del giorno finita). */
export function transitorio(log: string[]): 'ritenta' | 'giorno' | undefined {
  const infra = log.filter(l => /: (quota|salta) ·/.test(l))
  if (!infra.length || infra.length !== log.length) return undefined
  const t = infra.join(' ')
  if (/per.?day|daily|PerDay/i.test(t)) return 'giorno'
  return /\b(503|429)\b|overload|unavailable|high demand|RESOURCE_EXHAUSTED|rate.?limit|quota|try again/i.test(t) ? 'ritenta' : undefined
}

/** Attese crescenti tra i tentativi: base, ×3, ×9… con un tetto. */
export function attesaDopo(tentativo: number, o: { base?: number; max?: number } = {}): number {
  return Math.min(o.max ?? 300_000, (o.base ?? 10_000) * 3 ** tentativo)
}

/**
 * Ritmo dosato tra un compito e l'altro: parte da `pausa`, raddoppia dopo un
 * errore transitorio, torna giù piano (×0,75) dopo ogni compito riuscito.
 */
export function creaRitmo(o: { pausa?: number; max?: number } = {}) {
  const base = o.pausa ?? 4000
  let attuale = base
  return {
    get pausa() { return attuale },
    dopo(esito: 'ok' | 'transitorio') { attuale = esito === 'ok' ? Math.max(base, Math.round(attuale * 0.75)) : Math.min(o.max ?? 120_000, attuale * 2) },
  }
}

/* ── stato su file ─────────────────────────────────────────────────────── */

export function caricaStato(file: string): Riga[] {
  try { return (JSON.parse(fs.readFileSync(file, 'utf8')) as { righe?: Riga[] }).righe ?? [] } catch { return [] }
}
export function salvaStato(file: string, modello: string, righe: Riga[]) {
  fs.writeFileSync(file, JSON.stringify({ modello, aggiornato: new Date().toISOString(), righe }, null, 1))
}

/* ── esecuzione ────────────────────────────────────────────────────────── */

export interface EsitoCompito { riga: Riga; log: string[] }

export interface BancoOptions<C extends { id: string }> {
  modello: string
  compiti: C[]
  esegui: (c: C) => Promise<EsitoCompito>
  /** file di stato: i compiti già eseguiti non si rifanno */
  stato?: string
  pausa?: number
  tentativi?: number
  attesaBase?: number
  dormi?: (ms: number) => Promise<void>
  scrivi?: (s: string) => void
}

export async function eseguiBanco<C extends { id: string }>(o: BancoOptions<C>): Promise<{ righe: Riga[]; fermo?: string }> {
  const dormi = o.dormi ?? (ms => new Promise<void>(r => setTimeout(r, ms)))
  const scrivi = o.scrivi ?? (s => process.stdout.write(s))
  const prima = o.stato ? caricaStato(o.stato) : []
  const fatte = new Map(prima.filter(r => r.eseguito !== false).map(r => [r.id, r]))
  const righe: Riga[] = o.compiti.filter(c => fatte.has(c.id)).map(c => fatte.get(c.id)!)
  if (righe.length) scrivi(`ripresa: ${righe.length} compiti già fatti\n`)
  const ritmo = creaRitmo({ pausa: o.pausa })
  let primo = true
  for (const c of o.compiti.filter(x => !fatte.has(x.id))) {
    if (!primo && ritmo.pausa) await dormi(ritmo.pausa)
    primo = false
    let e: EsitoCompito | undefined
    let tipo: ReturnType<typeof transitorio>
    let tentativo = 0
    for (; tentativo <= (o.tentativi ?? 3); tentativo++) {
      e = await o.esegui(c)
      tipo = e.riga.eseguito === false ? transitorio(e.log) : undefined
      if (tipo !== 'ritenta' || tentativo === (o.tentativi ?? 3)) break
      ritmo.dopo('transitorio')
      const ms = attesaDopo(tentativo, { base: o.attesaBase })
      scrivi(`… ${c.id}: servizio occupato, riprovo tra ${Math.round(ms / 1000)} s\n`)
      await dormi(ms)
    }
    const riga = { ...e!.riga, tentativi: tentativo + 1 }
    righe.push(riga)
    if (riga.eseguito !== false) ritmo.dopo('ok')
    if (o.stato) salvaStato(o.stato, o.modello, [...prima.filter(r => r.eseguito !== false && !righe.some(x => x.id === r.id)), ...righe])
    scrivi(`${riga.eseguito === false ? '·' : riga.ok ? '✔' : '✖'} ${c.id} ${riga.motivo}\n`)
    if (tipo === 'giorno') return { righe, fermo: 'quota del giorno finita: rilancia domani, il banco riparte da qui' }
  }
  return { righe }
}

/* ── token per compito riuscito, per profilo ───────────────────────────── */

export interface CostoProfilo { livello: string; eseguiti: number; riusciti: number; token: number; perRiuscito?: number; medioRiusciti?: number }

const ORDINE = ['forte', 'medio', 'base', '—']
const tot = (t?: Token) => (t ? t.input + t.output : 0)

/**
 * Per profilo: token spesi su tutti i compiti eseguiti (anche quelli falliti:
 * li paga chi usa il sistema) diviso i compiti riusciti; più la media sui soli riusciti.
 */
export function tokenPerRiuscito(righe: Riga[]): CostoProfilo[] {
  const per = new Map<string, Riga[]>()
  for (const r of righe.filter(x => x.eseguito !== false)) per.set(r.livello ?? '—', [...(per.get(r.livello ?? '—') ?? []), r])
  return [...per.entries()].map(([livello, rs]) => {
    const ok = rs.filter(r => r.ok)
    const token = rs.reduce((a, r) => a + tot(r.spesa ?? r.token), 0)
    return {
      livello, eseguiti: rs.length, riusciti: ok.length, token,
      perRiuscito: ok.length ? Math.round(token / ok.length) : undefined,
      medioRiusciti: ok.length ? Math.round(ok.reduce((a, r) => a + tot(r.spesa ?? r.token), 0) / ok.length) : undefined,
    }
  }).sort((a, b) => ORDINE.indexOf(a.livello) - ORDINE.indexOf(b.livello))
}

export function tabellaCosti(costi: CostoProfilo[]): string[] {
  return ['| Profilo | Riusciti | Token spesi | Token per compito riuscito | Media sui riusciti |', '|---|---|---|---|---|',
    ...costi.map(c => `| ${c.livello} | ${c.riusciti}/${c.eseguiti} | ${c.token} | ${c.perRiuscito ?? '—'} | ${c.medioRiusciti ?? '—'} |`)]
}
