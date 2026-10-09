'use client'

import { create } from 'zustand'
import type { NodeDetail } from '@/lib/os/graph'

/*
  REGOLE DEL BLOCCO (docs/ux/PROGETTAZIONE.md §2b)
  - stessa famiglia → il blocco principale si trasforma e la catena si allunga
  - famiglia diversa → si apre un accessorio (satellite → pannello), il principale resta
  - indietro → si risale la catena; ogni passo ricorda scroll e provenienza
*/
export type Mode = 'view' | 'reply'
export interface Step { ref: string; mode: Mode; mem: { scroll?: number; from?: string } }
export type AccKind = 'client' | 'calendar' | 'quote' | 'task'
export interface Acc { key: string; kind: AccKind; ref?: string; forRef: string }
export type Anim = 'fwd' | 'bwd' | 'fade' | 'morph'

const HUB = new Set(['list', 'client'])
const FAMILY: Record<string, string> = { mail: 'comm', task: 'work', client: 'people', design: 'studio', quote: 'tools' }
export const kindOf = (ref: string) => ref.split(':')[0]

const DRAFTS_KEY = 'os-drafts'
const loadDrafts = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(DRAFTS_KEY) ?? '{}') } catch { return {} } }
const saveDrafts = (d: Record<string, string>) => { try { localStorage.setItem(DRAFTS_KEY, JSON.stringify(d)) } catch { /* storage non disponibile */ } }

interface OsState {
  chain: Step[]
  accs: Acc[]
  petals: boolean
  anim: Anim
  origin: { x: number; y: number } | null
  drafts: Record<string, string>
  nodes: Record<string, NodeDetail>       // cache dei nodi caricati
  toast: { text: string; err?: boolean; id: number } | null

  setNode: (n: NodeDetail) => void
  invalidate: () => void
  remember: (scroll: number) => void
  go: (ref: string, mode?: Mode) => void
  back: (to?: number) => void
  root: (section: string) => void
  toggleAcc: (kind: AccKind, ref?: string) => void
  closeAcc: (key: string) => void
  promote: (key: string) => void
  setPetals: (on: boolean) => void
  setDraft: (ref: string, text: string) => void
  clearDraft: (ref: string) => void
  setOrigin: (p: { x: number; y: number }) => void
  say: (text: string, err?: boolean) => void
  hydrate: () => void
}

export const useOs = create<OsState>((set, get) => ({
  chain: [{ ref: 'list:oggi', mode: 'view', mem: {} }],
  accs: [],
  petals: false,
  anim: 'fade',
  origin: null,
  drafts: {},
  nodes: {},
  toast: null,

  setNode: n => set(s => ({ nodes: { ...s.nodes, [n.ref]: n } })),
  invalidate: () => set({ nodes: {} }),
  remember: scroll => set(s => {
    const chain = [...s.chain]
    chain[chain.length - 1] = { ...chain[chain.length - 1], mem: { ...chain[chain.length - 1].mem, scroll } }
    return { chain }
  }),

  go: (ref, mode = 'view') => {
    const { chain } = get()
    const here = chain[chain.length - 1]
    const hk = kindOf(here.ref), tk = kindOf(ref)
    const sameNode = here.ref === ref
    if (!sameNode && !(HUB.has(hk) || FAMILY[hk] === FAMILY[tk])) {
      // famiglia diversa: non si cambia il blocco, si apre un accessorio accanto
      if (tk === 'client') return get().toggleAcc('client', ref)
      if (tk === 'design' || tk === 'task') return get().toggleAcc(tk === 'task' ? 'task' : 'client', ref)
    }
    const prev = { ...here, mem: { ...here.mem, from: ref } }
    set({ chain: [...chain.slice(0, -1), prev, { ref, mode, mem: {} }], petals: false, anim: sameNode ? 'morph' : 'fwd' })
  },
  back: to => {
    const { chain } = get()
    const target = to ?? chain.length - 2
    if (target < 0 || target >= chain.length - 1) return
    set({ chain: chain.slice(0, target + 1), petals: false, anim: 'bwd' })
  },
  root: section => set({ chain: [{ ref: `list:${section}`, mode: 'view', mem: {} }], accs: [], petals: false, anim: 'fade' }),

  toggleAcc: (kind, ref) => set(s => {
    const key = `${kind}:${ref ?? ''}`
    if (s.accs.some(a => a.key === key)) return { accs: s.accs.filter(a => a.key !== key) }
    const forRef = s.chain[s.chain.length - 1].ref
    return { accs: [{ key, kind, ref, forRef }, ...s.accs].slice(0, 2) }   // mai più di due accessori
  }),
  closeAcc: key => set(s => ({ accs: s.accs.filter(a => a.key !== key) })),
  promote: key => {
    const a = get().accs.find(x => x.key === key)
    if (!a?.ref) return
    set(s => {
      const here = s.chain[s.chain.length - 1]
      return { accs: s.accs.filter(x => x.key !== key), chain: [...s.chain.slice(0, -1), { ...here, mem: { ...here.mem, from: a.ref } }, { ref: a.ref!, mode: 'view', mem: {} }], anim: 'fwd', petals: false }
    })
  },
  setPetals: on => set({ petals: on }),
  setDraft: (ref, text) => set(s => { const drafts = { ...s.drafts, [ref]: text }; if (!text) delete drafts[ref]; saveDrafts(drafts); return { drafts } }),
  clearDraft: ref => set(s => { const drafts = { ...s.drafts }; delete drafts[ref]; saveDrafts(drafts); return { drafts } }),
  setOrigin: origin => set({ origin }),
  say: (text, err) => set({ toast: { text, err, id: Date.now() } }),
  hydrate: () => set({ drafts: loadDrafts() }),
}))

export const current = (s: OsState) => s.chain[s.chain.length - 1]
