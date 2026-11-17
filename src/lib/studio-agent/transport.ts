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
export const define = (w: string) => call<{ definition: string | null }>(`/define?w=${encodeURIComponent(w)}`).catch(() => ({ definition: null }))
export const shader = (url: string) => call<{ code: string | null }>('/shader', { method: 'POST', body: JSON.stringify({ url }) }).catch(() => ({ code: null }))
