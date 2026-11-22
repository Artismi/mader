/**
 * Trasporto della versione autonoma: l'archivio (stato, opere, immagini)
 * vive nel browser, in IndexedDB. Il server serve solo a leggere il web
 * (Wikipedia, RSS, pagine, Wikizionario, shader), che dal browser è
 * bloccato dai CORS. Stessa interfaccia del transport.ts di Creative OS.
 */
import type { AgentState, Visit, Work } from './core/types'

export type Raw = { url: string; source: string; title: string; text: string; kind: 'wiki' | 'rss' | 'pagina' | 'biblioteca' | 'rilettura'; links?: string[] }

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
export const define = (w: string) => call<{ definition: string | null }>(`/define?w=${(() => { try { return encodeURIComponent(w) } catch { return encodeURIComponent(w.replace(/[\uD800-\uDFFF]/g, "")) } })()}`).catch(() => ({ definition: null }))
export const esplora = (url: string, word: string, skip: string[]) => call<Raw[]>('/esplora', { method: 'POST', body: JSON.stringify({ url, word, skip }) }).catch(() => [] as Raw[])
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

// ─── Instagram (la parte che parla con Instagram sta sul server locale) ──────
export interface IgStato { collegato: boolean; username?: string; userId?: string; tunnel?: string | null; usati24h?: number; limite24h?: number; scade?: string; via?: string; error?: string }
const j = (r: Response) => r.json()
export const igStato = (): Promise<IgStato> => fetch('/api/studio-agent/ig-stato').then(j).catch(e => ({ collegato: false, error: String(e) }))
export const upChiave = (key: string, user: string): Promise<IgStato> => fetch('/api/studio-agent/up-chiave', { method: 'POST', body: JSON.stringify({ key, user }) }).then(j)
export const igToken = (token: string): Promise<IgStato> => fetch('/api/studio-agent/ig-token', { method: 'POST', body: JSON.stringify({ token }) }).then(j)
export const igTunnel = (): Promise<{ tunnel?: string; error?: string }> => fetch('/api/studio-agent/ig-tunnel', { method: 'POST', body: '{}' }).then(j)
export const igMedia = (nome: string, b: Blob): Promise<{ nome?: string; error?: string }> => fetch(`/api/studio-agent/ig-media?nome=${encodeURIComponent(nome)}`, { method: 'POST', body: b }).then(j)
export const igPubblica = (file: string[], didascalia: string): Promise<{ id?: string; permalink?: string; error?: string }> => fetch('/api/studio-agent/ig-pubblica', { method: 'POST', body: JSON.stringify({ file, didascalia }) }).then(j)

// ─── memoria portatile (per il giro senza schermo: la memoria vive in un file, non nel browser) ───
type Archivio = { state: AgentState | null; works: Work[]; images: Record<string, string>; fogli?: Record<string, string> }
/** svuota l'archivio del browser e ci rimette dentro la memoria salvata */
export async function importaMemoria(a: Archivio) {
  await tx('state', 'readwrite', s => s.clear()); await tx('works', 'readwrite', s => s.clear()); await tx('images', 'readwrite', s => s.clear())
  if (a.state) await putState(a.state)
  for (const w of a.works) await tx('works', 'readwrite', s => s.put({ ...w, image: '' }))
  for (const [id, url] of Object.entries(a.images ?? {})) { const b = await (await fetch(url)).blob(); await tx('images', 'readwrite', s => s.put(b, id)) }
  for (const [id, json] of Object.entries(a.fogli ?? {})) await riponiFoglio(id, json)
  urls.clear()
}
/** la memoria da salvare: stato e tutte le opere, ma le immagini solo delle più recenti (in JPEG) */
export async function esportaMemoria(maxImmagini = 160, maxFogli = 40): Promise<Archivio> {
  const st = await getState()
  const works = await tx<Work[]>('works', 'readonly', s => s.getAll())
  works.sort((a, b) => b.day - a.day || b.createdAt.localeCompare(a.createdAt))
  const images: Record<string, string> = {}
  for (const w of works.slice(0, maxImmagini)) {
    const blob = await tx<Blob | undefined>('images', 'readonly', s => s.get(w.id))
    if (!blob) continue
    const bmp = await createImageBitmap(blob)
    const cv = new OffscreenCanvas(bmp.width, bmp.height); cv.getContext('2d')!.drawImage(bmp, 0, 0)
    const j = await cv.convertToBlob({ type: 'image/jpeg', quality: 0.82 })
    images[w.id] = await new Promise<string>(res => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.readAsDataURL(j) })
  }
  // il cassetto: i livelli delle tavole più recenti che ci sono finite
  const fogli: Record<string, string> = {}
  const nel = new Set(await nelCassetto())
  for (const w of works.filter(x => nel.has(x.id)).slice(0, maxFogli)) { const j = await prendiFoglio(w.id); if (j) fogli[w.id] = j }
  return { state: st, works: works.map(w => ({ ...w, image: '' })), images, fogli }
}

// ─── il cassetto: le tavole con i loro livelli, per i discorsi tra più giornate ───
export async function riponiFoglio(id: string, json: string) { await tx('images', 'readwrite', s => s.put(new Blob([json], { type: 'application/json' }), `foglio:${id}`)) }
export async function prendiFoglio(id: string): Promise<string | null> { const b = await tx<Blob | undefined>('images', 'readonly', s => s.get(`foglio:${id}`)); return b ? await b.text() : null }
export async function nelCassetto(): Promise<string[]> { const ks = await tx<IDBValidKey[]>('images', 'readonly', s => s.getAllKeys()); return ks.map(String).filter(k => k.startsWith('foglio:')).map(k => k.slice(7)) }

// ─── il reel di una sequenza (video senza audio; l'audio lo aggiunge chi monta) ───
export async function salvaReel(epId: string, v: Blob) { await tx('images', 'readwrite', s => s.put(v, `reel:${epId}`)) }
export async function leggiReel(epId: string): Promise<Blob | null> { return (await tx<Blob | undefined>('images', 'readonly', s => s.get(`reel:${epId}`))) ?? null }

/** un'immagine alla volta (tutte insieme in un messaggio solo fanno cadere il browser) */
export async function riponiImmagine(id: string, url: string) { const b = await (await fetch(url)).blob(); await tx('images', 'readwrite', s => s.put(b, id)) }

/** le opere più recenti con un'immagine (gli id), e l'immagine di una in JPEG: il salvataggio va una alla volta */
export async function recentiConImmagine(max = 400): Promise<string[]> {
  const works = await tx<Work[]>('works', 'readonly', s => s.getAll())
  works.sort((a, b) => b.day - a.day || b.createdAt.localeCompare(a.createdAt))
  const out: string[] = []
  for (const w of works.slice(0, max)) { const b = await tx<Blob | undefined>('images', 'readonly', s => s.get(w.id)); if (b) out.push(w.id) }
  return out
}
export async function immagineJpeg(id: string): Promise<string | null> {
  const blob = await tx<Blob | undefined>('images', 'readonly', s => s.get(id))
  if (!blob) return null
  const bmp = await createImageBitmap(blob)
  const cv = new OffscreenCanvas(bmp.width, bmp.height); cv.getContext('2d')!.drawImage(bmp, 0, 0)
  const j = await cv.convertToBlob({ type: 'image/jpeg', quality: 0.82 })
  return await new Promise<string>(res => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.readAsDataURL(j) })
}
