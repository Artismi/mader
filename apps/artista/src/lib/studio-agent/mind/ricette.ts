// Le ricette: i generatori che la città scrive in officina. Un programma è una catena di strumenti con le loro
// regolazioni e il loro posto (dove), leggibile come testo. Qui solo i dati e il registro (nessuno strumento importato:
// li esegue l'officina, e lo strumento «ricetta» in hands/tools li usa come uno strumento qualsiasi).
import type { AgentState } from '../core/types'
import type { Dove } from './quaderno'

export type Passo = { tool: string; p: Record<string, unknown>; dove: Dove }
export type Programma = {
  id: string; nome: string; autore: string; padre?: string; madre?: string; modo: 'zero' | 'ramo' | 'innesto'
  passi: Passo[]; scopo: string; nato: number; versione: number
  stato: 'in prova' | 'tenuto' | 'buttato' | 'respinto'; punteggio?: number; ms?: number; nota?: string; usi?: number
}
export type Officina2 = { programmi: Programma[]; diario: { giorno: number; testo: string }[] }

type ConCitta = AgentState & { citta?: { laboratorio?: Officina2 } }
let TENUTI: Programma[] = []
export const officinaDi = (st: AgentState): Officina2 => {
  const c = ((st as ConCitta).citta ??= {} as never) as { laboratorio?: Officina2 }
  return (c.laboratorio ??= { programmi: [], diario: [] })
}
/** da chiamare al caricamento: i programmi tenuti diventano disponibili allo strumento «ricetta» */
export function aggiornaRicette(st: AgentState) { TENUTI = ((st as ConCitta).citta?.laboratorio?.programmi ?? []).filter(p => p.stato === 'tenuto'); return TENUTI }
export const ricetteTenute = () => TENUTI

const num = (v: unknown) => typeof v === 'number' ? (Math.abs(v) < 10 ? +v.toFixed(2) : Math.round(v)) : v
/** il programma come testo: strumento(regolazioni) › strumento(…) */
export function testoProgramma(p: Programma) {
  return p.passi.map(s => {
    const kv = Object.entries(s.p).filter(([k, v]) => !k.startsWith('__') && !/^(seed|seme|layer|recipe)$/i.test(k) && (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') && String(v).length < 18).slice(0, 4).map(([k, v]) => `${k}=${num(v)}`)
    const d = s.dove.modo === 'tutta' ? '' : s.dove.modo === 'livello' ? ` @livello${s.dove.i}` : ` @${s.dove.forma}`
    if (s.p.recipe) kv.unshift(String(s.p.recipe))
    return `${s.tool}(${kv.join(', ')})${d}`
  }).join(' › ')
}
