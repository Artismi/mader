/**
 * Trasporto: dove l'artista legge e salva. In Creative OS passa dalle API
 * server (SQLite + PNG su disco). La versione autonoma (apps/artista) ha un
 * suo transport.ts con l'archivio nel browser: il resto del codice è identico.
 */
import type { AgentState, Visit, Work } from './core/types'

const API = '/api/studio-agent'

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API + path, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } })
  if (!res.ok) throw new Error(`${res.status} ${path}`)
  return res.json() as Promise<T>
}

export type Raw = { url: string; source: string; title: string; text: string; kind: 'wiki' | 'rss' | 'pagina' | 'biblioteca' | 'rilettura'; links?: string[] }

export const getState = () => call<AgentState | null>('/state')
export const putState = (st: AgentState) => call('/state', { method: 'PUT', body: JSON.stringify(st) })
export const deleteState = () => call('/state', { method: 'DELETE' })
export const listWorks = () => call<Work[]>('/works').catch(() => [] as Work[])
export const saveWork = (work: Work, png: string) => call<Work>('/works', { method: 'POST', body: JSON.stringify({ work, png }) })
export const addVisit = (v: Omit<Visit, 'id' | 'date'>) => call('/visit', { method: 'POST', body: JSON.stringify(v) })
export const library = () => call<{ name: string; text: string }[]>('/library').catch(() => [])
export const posTags = (words: string[]) => call<Record<string, string>>('/pos', { method: 'POST', body: JSON.stringify({ words }) }).catch(() => ({}))
export const read = (query: string) => call<Raw[]>(`/read?${query}`).catch(() => [] as Raw[])
export const define = (w: string) => call<{ definition: string | null }>(`/define?w=${(() => { try { return encodeURIComponent(w) } catch { return encodeURIComponent(w.replace(/[\uD800-\uDFFF]/g, "")) } })()}`).catch(() => ({ definition: null }))
export const esplora = (url: string, word: string, skip: string[]) => call<Raw[]>('/esplora', { method: 'POST', body: JSON.stringify({ url, word, skip }) }).catch(() => [] as Raw[])
export const shader = (url: string) => call<{ code: string | null }>('/shader', { method: 'POST', body: JSON.stringify({ url }) }).catch(() => ({ code: null }))

// Instagram: in Creative OS non è ancora collegato (c'è nell'app autonoma)
export interface IgStato { collegato: boolean; username?: string; userId?: string; tunnel?: string | null; usati24h?: number; limite24h?: number; error?: string }
const noIg = { error: 'Instagram è disponibile nell\'app autonoma' }
export const igStato = async (): Promise<IgStato> => ({ collegato: false, ...noIg })
export const igToken = async (_t: string): Promise<IgStato> => ({ collegato: false, ...noIg })
export const igTunnel = async (): Promise<{ tunnel?: string; error?: string }> => noIg
export const igMedia = async (_n: string, _b: Blob): Promise<{ nome?: string; error?: string }> => noIg
export const igPubblica = async (_f: string[], _d: string): Promise<{ id?: string; permalink?: string; error?: string }> => noIg
