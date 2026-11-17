/**
 * Trasporto della versione autonoma: l'archivio (stato, opere, immagini)
 * vive nel browser, in IndexedDB. Il server serve solo a leggere il web
 * (Wikipedia, RSS, pagine, Wikizionario, shader), che dal browser è
 * bloccato dai CORS. Stessa interfaccia del transport.ts di Creative OS.
 */
import type { AgentState, Visit, Work } from './core/types'

export type Raw = { url: string; source: string; title: string; text: string; kind: 'wiki' | 'rss' | 'pagina' | 'biblioteca' }

const DB = 'artista-osservatore'
let dbp: Promise<IDBDatabase> | null = null
function db(): Promise<IDBDatabase> {
  if (dbp) return dbp
  dbp = new Promise((res, rej) => {
    const q = indexedDB.open(DB, 1)
    q.onupgradeneeded = () => {
      const d = q.result
      if (!d.objectStoreNames.contains('state')) d.createObjectStore('state')
      if (!d.objectStoreNames.contains('works')) d.createObjectStore('works', { keyPath: 'id' })
      if (!d.objectStoreNames.contains('images')) d.createObjectStore('images')
    }
    q.onsuccess = () => res(q.result)
    q.onerror = () => rej(q.error)
  })
  return dbp
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  return db().then(d => new Promise<T>((res, rej) => {
    const t = d.transaction(store, mode)
    const s = t.objectStore(store)
    const req = fn(s)
    t.oncomplete = () => res(req ? (req.result as T) : (undefined as T))
    t.onerror = () => rej(t.error)
  }))
}

const urls = new Map<string, string>()
async function imageUrl(id: string) {
  if (urls.has(id)) return urls.get(id)!
  const blob = await tx<Blob | undefined>('images', 'readonly', s => s.get(id))
  if (!blob) return ''
  const u = URL.createObjectURL(blob)
  urls.set(id, u)
  return u
}

export const getState = () => tx<AgentState | undefined>('state', 'readonly', s => s.get('main')).then(x => x ?? null)
export const putState = (st: AgentState) => tx('state', 'readwrite', s => s.put(st, 'main'))
export const deleteState = () => tx('state', 'readwrite', s => s.delete('main'))

export async function listWorks(): Promise<Work[]> {
  const all = await tx<Work[]>('works', 'readonly', s => s.getAll())
  all.sort((a, b) => b.day - a.day || b.createdAt.localeCompare(a.createdAt))
  return Promise.all(all.map(async w => ({ ...w, image: await imageUrl(w.id) })))
}

export async function saveWork(work: Work, png: string): Promise<Work> {
  const blob = await (await fetch(png)).blob()
  await tx('images', 'readwrite', s => s.put(blob, work.id))
  await tx('works', 'readwrite', s => s.put({ ...work, image: '' }))
  return { ...work, image: await imageUrl(work.id) }
}

export async function addVisit(v: Omit<Visit, 'id' | 'date'>) {
  const st = await getState()
  if (!st) return
  st.visits.push({ ...v, id: crypto.randomUUID(), date: new Date().toISOString() })
  await putState(st)
}

/** biblioteca: testi messi in public/biblioteca (indice generato da scripts/biblioteca.mjs) */
export const library = () => fetch('/biblioteca/index.json').then(r => (r.ok ? r.json() : [])).catch(() => []) as Promise<{ name: string; text: string }[]>

/** senza lessico Morph-it! sul server: l'analisi grammaticale va per desinenze */
export const posTags = async (_words: string[]): Promise<Record<string, string>> => ({})

const call = <T,>(path: string, init?: RequestInit) =>
  fetch('/api/studio-agent' + path, { ...init, headers: { 'Content-Type': 'application/json' } }).then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<T> })

export const read = (query: string) => call<Raw[]>(`/read?${query}`).catch(() => [] as Raw[])
export const define = (w: string) => call<{ definition: string | null }>(`/define?w=${encodeURIComponent(w)}`).catch(() => ({ definition: null }))
export const shader = (url: string) => call<{ code: string | null }>('/shader', { method: 'POST', body: JSON.stringify({ url }) }).catch(() => ({ code: null }))

/** esporta tutto l'archivio (stato + opere + immagini) in un file JSON */
export async function exportArchive(): Promise<Blob> {
  const st = await getState()
  const works = await tx<Work[]>('works', 'readonly', s => s.getAll())
  const images: Record<string, string> = {}
  for (const w of works) {
    const blob = await tx<Blob | undefined>('images', 'readonly', s => s.get(w.id))
    if (blob) images[w.id] = await new Promise<string>(res => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.readAsDataURL(blob) })
  }
  return new Blob([JSON.stringify({ state: st, works, images })], { type: 'application/json' })
}
