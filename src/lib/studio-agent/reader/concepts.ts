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

// ── l'inglese: per ogni significato, la parola inglese di Princeton WordNet (stesso ordine dei synset) ──
let en: string[] | null = null
export function loadInglese(url = '/lessico/inglese.json'): Promise<boolean> {
  if (en) return Promise.resolve(true)
  return fetch(url).then(r => (r.ok ? r.json() : null)).then((d: string[] | null) => { en = d; return !!d }).catch(() => false)
}
/** la parola inglese per una parola italiana, nel senso che ha in questo contesto */
export function inglese(word: string, ctx?: Set<string>): string | null {
  if (!data || !en) return null
  const s = senso(word, ctx)
  return s ? en[s.i]?.replace(/\(.*?\)/g, '').trim() || null : null
}

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
/** le categorie grammaticali possibili di una parola (n nome, v verbo, a aggettivo, r avverbio), anche dalle forme flesse */
const posCache = new Map<string, Set<string>>()
export function posDi(word: string): Set<string> {
  const w = word.toLowerCase(), hit = posCache.get(w)
  if (hit) return hit
  const out = new Set<string>()
  if (data) for (const f of forms(w)) for (const i of data.lex[f] ?? []) out.add(data.syn[i][2] === 's' ? 'a' : data.syn[i][2])
  if (posCache.size > 20000) posCache.clear()
  posCache.set(w, out); return out
}

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
/**
 * Il significato giusto: tra i sensi di un nome sceglie quello che sta meglio nel contesto
 * (parole lette intorno), preferendo i sensi in cui la parola è il lemma principale.
 * Restituisce anche quanto è sicuro, per non dire cose a caso quando non lo è.
 */
export function senso(word: string, ctx?: Set<string>): { i: number; sicuro: boolean } | null {
  if (!data) return null
  const all = senses(word).length ? (() => { for (const f of [word.toLowerCase()]) { const s = data!.lex[f]; if (s?.length) return s } return senses(word) })() : []
  const nomi = all.filter(i => data!.syn[i][2] === 'n')
  if (!nomi.length) return all.length ? { i: all[0], sicuro: false } : null
  const lem = (i: number) => (data!.syn[i][0] as string[]).flatMap(x => x.split(' '))
  const score = nomi.map(i => {
    const syn = data!.syn[i]
    const bag = new Set([...lem(i), ...KEYS.flatMap(k => rels(i, k)).flatMap(j => lem(j))])
    for (const h of rels(i, 'h')) for (const hh of rels(h, 'h')) lem(hh).forEach(x => bag.add(x))
    let sc = 0
    if (ctx) for (const w of ctx) if (w !== word && bag.has(w)) sc += 3
    if ((syn[0] as string[])[0] === word) sc += 1.5
    sc += Math.min(1, KEYS.reduce((a, k) => a + rels(i, k).length, 0) * 0.15)
    if (['luogo', 'oggetto fatto', 'evento', 'tempo', 'cosa naturale', 'gruppo', 'stato'].includes(syn[1] as string)) sc += 0.4
    if (rels(i, 'h').some(h => lemma(h).startsWith('('))) sc -= 1
    return { i, sc }
  }).sort((a, b) => b.sc - a.sc)
  const sicuro = score.length === 1 || score[0].sc - score[1].sc >= 1 || score[0].sc >= 3
  return { i: score[0].i, sicuro }
}

export function describe(word: string, ctx?: Set<string>): { text: string; words: string[]; category: string; sicuro?: boolean } | null {
  if (!data) return null
  const ss = senso(word, ctx)
  const s = ss?.i
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
  return { text: `${word}: ${bits.join('; ')} (${syn[1]})`, words: words.flatMap(w => w.split(' ')).filter(w => w.length > 2), category: syn[1], sicuro: ss?.sicuro }
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

// ─── verbi: forme flesse → infinito (dal lessico), per leggere e riscrivere frasi ──
export interface Verbo { inf: string; con: 'are' | 'ere' | 'ire' | 'rre'; stem: string; irr?: { s: string; p: string; part?: string } }
let VERBI: Map<string, Verbo> | null = null
export function verbi(): Map<string, Verbo> {
  if (VERBI || !data) return VERBI ?? new Map()
  const m = new Map<string, Verbo>()
  for (const s of data.syn) {
    if (s[2] !== 'v') continue
    for (const l of s[0] as string[]) {
      if (l.includes(' ')) continue
      const con = /rre$/.test(l) ? 'rre' : (l.slice(-3) as Verbo['con'])
      if (!['are', 'ere', 'ire', 'rre'].includes(con)) continue
      const stem = l.slice(0, -3)
      const v: Verbo = { inf: l, con, stem }
      const fs = con === 'are' ? ['a', 'ano', 'ato', 'ava', 'avano', 'ò', 'arono', 'erà', 'eranno', 'erebbe', 'ata', 'ati', 'ate']
        : con === 'ere' ? ['e', 'ono', 'uto', 'eva', 'evano', 'é', 'ette', 'erono', 'ettero', 'erà', 'eranno', 'erebbe', 'uta']
        : con === 'ire' ? ['e', 'ono', 'isce', 'iscono', 'ito', 'iva', 'ivano', 'ì', 'irono', 'irà', 'iranno', 'irebbe', 'ita']
        : ['ce', 'cono', 'ceva', 'cevano', 'sse', 'ssero', 'rrà']
      m.set(l, v)
      for (const f of fs) if (!m.has(stem + f)) m.set(stem + f, v)
    }
  }
  // irregolari frequenti: forme → infinito, con il presente giusto
  const IRR: [string, string, string, string | undefined, string[]][] = [
    ['essere', 'è', 'sono', undefined, ['è', 'era', 'erano', 'fu', 'furono', 'sarà', 'sia']],
    ['avere', 'ha', 'hanno', 'avuto', ['ha', 'hanno', 'aveva', 'avevano', 'ebbe', 'ebbero']],
    ['fare', 'fa', 'fanno', 'fatto', ['fa', 'fanno', 'faceva', 'facevano', 'fece', 'fecero', 'farà']],
    ['diventare', 'diventa', 'diventano', 'diventato', ['divenne', 'divennero', 'diviene', 'divengono']],
    ['nascere', 'nasce', 'nascono', 'nato', ['nacque', 'nacquero', 'nato', 'nata', 'nati', 'nate']],
    ['dire', 'dice', 'dicono', 'detto', ['dice', 'dicono', 'diceva', 'disse', 'dissero']],
    ['mettere', 'mette', 'mettono', 'messo', ['mise', 'misero']],
    ['prendere', 'prende', 'prendono', 'preso', ['prese', 'presero']],
    ['vedere', 'vede', 'vedono', 'visto', ['vide', 'videro']],
    ['venire', 'viene', 'vengono', undefined, ['viene', 'vengono', 'venne', 'vennero', 'veniva']],
    ['rimanere', 'rimane', 'rimangono', undefined, ['rimane', 'rimangono', 'rimase', 'rimasero']],
    ['scegliere', 'sceglie', 'scelgono', 'scelto', ['sceglie', 'scelgono', 'scelse', 'scelsero']],
    ['perdere', 'perde', 'perdono', 'perso', ['perse', 'persero']],
    ['vincere', 'vince', 'vincono', 'vinto', ['vinse', 'vinsero']],
    ['scrivere', 'scrive', 'scrivono', 'scritto', ['scrisse', 'scrissero']],
    ['porre', 'pone', 'pongono', 'posto', ['pone', 'pongono', 'pose', 'posero']],
    ['tenere', 'tiene', 'tengono', 'tenuto', ['tiene', 'tengono', 'tenne', 'tennero']],
    ['volere', 'vuole', 'vogliono', 'voluto', ['vuole', 'vogliono', 'volle']],
    ['potere', 'può', 'possono', undefined, ['può', 'possono', 'poteva']],
    ['dovere', 'deve', 'devono', undefined, ['deve', 'devono', 'doveva']],
    ['produrre', 'produce', 'producono', 'prodotto', ['produce', 'producono', 'produsse', 'produssero']],
    ['condurre', 'conduce', 'conducono', 'condotto', ['condusse', 'condussero']],
    ['muovere', 'muove', 'muovono', 'mosso', ['mosse', 'mossero']],
    ['chiudere', 'chiude', 'chiudono', 'chiuso', ['chiuse', 'chiusero']],
    ['aprire', 'apre', 'aprono', 'aperto', ['aprì', 'aprirono']],
    ['distruggere', 'distrugge', 'distruggono', 'distrutto', ['distrusse', 'distrussero']],
  ]
  for (const [inf, s3, p3, part, fs] of IRR) {
    const v: Verbo = { inf, con: (inf.endsWith('rre') ? 'rre' : inf.slice(-3)) as Verbo['con'], stem: inf.slice(0, -3), irr: { s: s3, p: p3, part } }
    m.set(inf, v)
    for (const f of [s3, p3, ...fs]) m.set(f, v)
  }
  VERBI = m
  return m
}
/** sinonimi nominali e iperonimo di una parola (per variare il lessico quando riscrive) */
export function sinonimi(w: string, ctx?: Set<string>): string[] {
  if (!data) return []
  const ss = senso(w, ctx)
  if (!ss?.sicuro) return []
  const s = ss.i
  return s === undefined ? [] : (data.syn[s][0] as string[]).filter(x => x !== w && !x.includes(' ')).slice(0, 4)
}
export function iperonimo(w: string, ctx?: Set<string>): string | null {
  if (!data) return null
  const ss = senso(w, ctx)
  if (!ss) return null
  const s = ss.i
  const h = rels(s, 'h')[0]
  return h === undefined ? null : lemma(h)
}

/** le categorie grammaticali che il dizionario conosce per una parola (n, v, a, r = avverbio); vuoto se non la conosce */
export function categorie(word: string): string[] {
  if (!data) return []
  const ids = data.lex[word.toLowerCase()] ?? []
  return [...new Set(ids.map(i => data!.syn[i][2] as string))]
}
