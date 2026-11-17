/**
 * Rete dei concetti: il lessico italiano (MultiWordNet, ItalWordNet,
 * Wikizionario via Open Multilingual Wordnet; relazioni di Princeton
 * WordNet 3.0) caricato una volta nel browser. È la parte "data", non
 * appresa: dice che il confine è un limite, che il muro ha porte, che la
 * luce è il contrario del buio. Da qui l'artista ricava definizioni,
 * ancoraggi, campi semantici e frasi che dicono qualcosa.
 */

export type Rel = 'h' | 'p' | 'w' | 'a' | 's' | 'c' | 'e' | 'd' | 't'
const KEYS: Rel[] = ['h', 'p', 'w', 'a', 's', 'c', 'e', 'd', 't']
/** [lemmi, categoria, pos, h, p, w, a, s, c, e, d, t] */
type Syn = [string[], string, string, ...number[][]]
interface Data { syn: Syn[]; lex: Record<string, number[]> }

export const REL_LABEL: Record<Rel, string> = {
  h: 'è un tipo di', p: 'ha come parte', w: 'è parte di', a: 'è il contrario di', s: 'somiglia a',
  c: 'porta a', e: 'comporta', d: 'appartiene a', t: 'può essere',
}

let data: Data | null = null
let hypo: Map<number, number[]> | null = null
let loading: Promise<boolean> | null = null

export function loadConcepts(url = '/lessico/lessico.json'): Promise<boolean> {
  if (data) return Promise.resolve(true)
  if (loading) return loading
  loading = fetch(url).then(r => (r.ok ? r.json() : null)).then((d: Data | null) => {
    if (!d) return false
    data = d
    hypo = new Map()
    d.syn.forEach((s, i) => { for (const h of (s[3] as number[]) ?? []) hypo!.set(h, [...(hypo!.get(h) ?? []), i]) })
    return true
  }).catch(() => false)
  return loading
}
export const conceptsReady = () => !!data

const lemma = (i: number) => data!.syn[i][0][0]
const rels = (i: number, k: Rel) => (data!.syn[i][3 + KEYS.indexOf(k)] as number[]) ?? []

/** forme flesse → lemma: prova la parola e qualche desinenza comune */
function forms(w: string): string[] {
  const out = [w]
  const rules: [RegExp, string][] = [
    [/chi$/, 'co'], [/ghi$/, 'go'], [/che$/, 'ca'], [/ghe$/, 'ga'], [/ci$/, 'co'], [/gi$/, 'go'],
    [/i$/, 'o'], [/i$/, 'e'], [/e$/, 'a'], [/i$/, 'a'], [/ie$/, 'ia'],
    [/ano$/, 'are'], [/ono$/, 'ere'], [/ono$/, 'ire'], [/ato$/, 'are'], [/ata$/, 'are'], [/uto$/, 'ere'], [/ito$/, 'ire'],
    [/ando$/, 'are'], [/endo$/, 'ere'], [/ava$/, 'are'], [/eva$/, 'ere'], [/iva$/, 'ire'], [/a$/, 'o'],
  ]
  for (const [re, rep] of rules) if (re.test(w)) out.push(w.replace(re, rep))
  return out
}

/** significati di una parola, i più comuni per primi (nomi prima di tutto) */
export function senses(word: string): number[] {
  if (!data) return []
  for (const f of forms(word.toLowerCase())) {
    const s = data.lex[f]
    if (s?.length) return s.slice().sort((a, b) => (data!.syn[a][2] === 'n' ? 0 : 1) - (data!.syn[b][2] === 'n' ? 0 : 1)).slice(0, 4)
  }
  return []
}
export const known = (w: string) => senses(w).length > 0

export interface Triple { a: string; rel: Rel; b: string }

const relCache = new Map<string, Triple[]>()
const fieldCache = new Map<string, { word: string; via: Triple[] }[]>()

/** relazioni dirette di una parola (primo o primi due significati) */
export function relationsOf(word: string, maxSenses = 2): Triple[] {
  if (!data) return []
  const key = word + '|' + maxSenses
  const hit = relCache.get(key)
  if (hit) return hit
  const res = relationsRaw(word, maxSenses)
  if (relCache.size > 20000) relCache.clear()
  relCache.set(key, res)
  return res
}
function relationsRaw(word: string, maxSenses: number): Triple[] {
  if (!data) return []
  const out: Triple[] = []
  for (const i of senses(word).slice(0, maxSenses)) {
    for (const k of KEYS) for (const j of rels(i, k)) {
      const b = lemma(j)
      if (!b.startsWith('(') && b !== word) out.push({ a: word, rel: k, b })
    }
    for (const j of (hypo!.get(i) ?? []).slice(0, 6)) { const b = lemma(j); if (!b.startsWith('(')) out.push({ a: b, rel: 'h', b: word }) }
    for (const s of data.syn[i][0].slice(1, 4)) if (s !== word) out.push({ a: word, rel: 's', b: s })
  }
  return out
}

/** definizione per genere prossimo: "è un tipo di X (categoria); ha come parte …; contrario di …" */
export function describe(word: string): { text: string; words: string[]; category: string } | null {
  if (!data) return null
  const s = senses(word)[0]
  if (s === undefined) return null
  const syn = data.syn[s]
  const words: string[] = []
  const bits: string[] = []
  const name = (j: number) => { const l = lemma(j); return l.startsWith('(') ? '' : l }
  const h = rels(s, 'h').map(name).filter(Boolean)
  if (h.length) { bits.push(`un tipo di ${h.join(', ')}`); words.push(...h) }
  const syns = syn[0].filter(x => x !== word).slice(0, 3)
  if (syns.length) { bits.push(`anche detto ${syns.join(', ')}`); words.push(...syns) }
  for (const [k, lab] of [['p', 'ha'], ['w', 'fa parte di'], ['a', 'contrario di'], ['t', 'può essere'], ['c', 'porta a']] as [Rel, string][]) {
    const xs = rels(s, k).map(name).filter(Boolean).slice(0, 3)
    if (xs.length) { bits.push(`${lab} ${xs.join(', ')}`); words.push(...xs) }
  }
  if (!bits.length) return null
  return { text: `${word}: ${bits.join('; ')} (${syn[1]})`, words: words.flatMap(w => w.split(' ')).filter(w => w.length > 2), category: syn[1] }
}

/** campo semantico: parole raggiungibili in pochi passi, con la strada fatta */
export function field(word: string, depth = 2, max = 40): { word: string; via: Triple[] }[] {
  if (!data) return []
  const key = `${word}|${depth}|${max}`
  const hit = fieldCache.get(key)
  if (hit) return hit
  const res = fieldRaw(word, depth, max)
  if (fieldCache.size > 5000) fieldCache.clear()
  fieldCache.set(key, res)
  return res
}
function fieldRaw(word: string, depth: number, max: number): { word: string; via: Triple[] }[] {
  if (!data) return []
  const seen = new Map<string, Triple[]>([[word, []]])
  let frontier = [word]
  for (let d = 0; d < depth; d++) {
    const next: string[] = []
    for (const w of frontier) for (const t of relationsOf(w, 1)) {
      const other = t.a === w ? t.b : t.a
      if (seen.has(other) || other.includes(' ')) continue
      seen.set(other, [...(seen.get(w) ?? []), t])
      next.push(other)
      if (seen.size > max) break
    }
    frontier = next
  }
  seen.delete(word)
  return [...seen.entries()].map(([w, via]) => ({ word: w, via }))
}

/** come si collegano due concetti (per sintesi e blending): la strada più corta nella rete */
export function connect(a: string, b: string, depth = 4): Triple[] | null {
  if (!data) return null
  const prev = new Map<string, { from: string; t: Triple }>()
  const seen = new Set([a])
  let frontier = [a]
  for (let d = 0; d < depth && frontier.length; d++) {
    const next: string[] = []
    for (const w of frontier) for (const t of relationsOf(w, 1)) {
      const o = t.a === w ? t.b : t.a
      if (seen.has(o)) continue
      seen.add(o); prev.set(o, { from: w, t }); next.push(o)
      if (o === b) {
        const path: Triple[] = []
        let cur = b
        while (cur !== a) { const p = prev.get(cur)!; path.unshift(p.t); cur = p.from }
        return path
      }
    }
    frontier = next.slice(0, 400)
  }
  return null
}

export const category = (w: string) => { const s = senses(w)[0]; return s === undefined || !data ? '' : data.syn[s][1] }
