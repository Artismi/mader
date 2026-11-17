/**
 * Le tre analisi della grammatica italiana, a regole.
 *  - grammaticale: che cos'è ogni parola
 *  - logica: chi fa cosa nella frase
 *  - del periodo: come si legano le frasi
 * Il lessico Morph-it! (se presente in data/studio-agent/morph-it.txt) dà
 * la categoria esatta; altrimenti valgono le desinenze.
 */
import { words } from './tokenize'

export type POS = 'articolo' | 'preposizione' | 'pronome' | 'congiunzione' | 'avverbio' | 'verbo' | 'aggettivo' | 'nome' | 'numero' | 'altro'

const ART = new Set('il lo la i gli le l un uno una'.split(' '))
const PREP = new Set('di a da in con su per tra fra del dello della dei degli delle al allo alla ai agli alle dal dallo dalla dai dagli dalle nel nello nella nei negli nelle sul sullo sulla sui sugli sulle col coi'.split(' '))
const PRON = new Set('io tu lui lei noi voi loro esso essa essi esse mi ti si ci vi ne lo la li le gli me te sé chi cui che quale questo questa questi queste quello quella quelli quelle ciò niente nulla qualcuno nessuno'.split(' '))
const COORD = new Set('e ed o od oppure ma però anzi quindi dunque né neanche infatti cioè'.split(' '))
const SUBORD = new Set('che perché poiché siccome quando mentre se benché sebbene affinché finché dove come qualora purché anche'.split(' '))
const AUX = new Set('è sono era erano sia siano fu furono sarà saranno essere ha hanno aveva avevano abbia abbiano ebbe avrà avere ho hai abbiamo avete può possono deve devono vuole vogliono sta stanno'.split(' '))

let LEX: Map<string, string> | null = null
/** carica un lessico "forma<TAB>lemma<TAB>tratti" (formato Morph-it!) */
export function setLexicon(text: string) {
  LEX = new Map()
  for (const line of text.split('\n')) {
    const [form, , tag] = line.split('\t')
    if (form && tag && !LEX.has(form)) LEX.set(form, tag)
  }
}

/** aggiunge categorie note (per esempio dal lessico lato server) */
export function addTags(tags: Record<string, string>) {
  if (!LEX) LEX = new Map()
  for (const [w, t] of Object.entries(tags)) LEX.set(w, t)
}

function fromTag(tag: string): POS {
  if (tag.startsWith('VER') || tag.startsWith('AUX') || tag.startsWith('MOD')) return 'verbo'
  if (tag.startsWith('NOUN')) return 'nome'
  if (tag.startsWith('ADJ')) return 'aggettivo'
  if (tag.startsWith('ADV')) return 'avverbio'
  if (tag.startsWith('ART')) return 'articolo'
  if (tag.startsWith('PRE')) return 'preposizione'
  if (tag.startsWith('PRO') || tag.startsWith('DET')) return 'pronome'
  if (tag.startsWith('CON')) return 'congiunzione'
  return 'altro'
}

export function pos(w: string, prev?: POS): POS {
  if (/^\d+$/.test(w)) return 'numero'
  if (LEX?.has(w)) return fromTag(LEX.get(w)!)
  if (ART.has(w) && prev !== 'preposizione') return 'articolo'
  if (PREP.has(w)) return 'preposizione'
  if (COORD.has(w) || SUBORD.has(w)) return w === 'che' && prev === 'nome' ? 'pronome' : 'congiunzione'
  if (PRON.has(w)) return 'pronome'
  if (AUX.has(w)) return 'verbo'
  if (/mente$/.test(w) && w.length > 6) return 'avverbio'
  if (/(are|ere|ire|ato|ata|ati|ate|uto|uta|ito|ita|ando|endo|ava|avano|eva|evano|iva|ivano|ò|erà|irà|ano|ono|isce|iscono)$/.test(w)) return prev === 'articolo' ? 'nome' : 'verbo'
  if (/(oso|osa|osi|ose|ale|ali|ile|ili|ivo|iva|ivi|ive|ico|ica|ici|iche|ante|enti|ente|bile|bili|esco|esca)$/.test(w)) return prev === 'articolo' ? 'nome' : 'aggettivo'
  return 'nome'
}

export interface Token { w: string; pos: POS }
export const grammaticale = (sentence: string): Token[] => {
  const out: Token[] = []
  for (const w of words(sentence)) out.push({ w, pos: pos(w, out[out.length - 1]?.pos) })
  return out
}

export interface Complemento { tipo: string; testo: string }
export interface Logica { soggetto: string; predicato: string; oggetto: string; complementi: Complemento[]; negata: boolean }

const COMPL: [RegExp, string][] = [
  [/^(di|del|dello|della|dei|degli|delle)$/, 'specificazione'],
  [/^(a|al|allo|alla|ai|agli|alle)$/, 'termine'],
  [/^(da|dal|dallo|dalla|dai|dagli|dalle)$/, 'agente o provenienza'],
  [/^(in|nel|nello|nella|nei|negli|nelle)$/, 'luogo'],
  [/^(con|col|coi)$/, 'compagnia o mezzo'],
  [/^(su|sul|sullo|sulla|sui|sugli|sulle)$/, 'argomento o luogo'],
  [/^(per)$/, 'fine o causa'],
  [/^(tra|fra)$/, 'luogo o tempo'],
]

export function logica(sentence: string): Logica {
  const t = grammaticale(sentence)
  const vi = t.findIndex(x => x.pos === 'verbo')
  const negata = t.some((x, i) => x.w === 'non' && (vi < 0 || i <= vi + 1))
  const np = (xs: Token[]) => xs.filter(x => x.pos === 'nome' || x.pos === 'aggettivo' || x.pos === 'pronome' || x.pos === 'numero').map(x => x.w).join(' ')
  if (vi < 0) return { soggetto: np(t), predicato: '', oggetto: '', complementi: [], negata }
  let ve = vi
  while (t[ve + 1] && (t[ve + 1].pos === 'verbo' || t[ve + 1].pos === 'avverbio')) ve++
  const predicato = t.slice(vi, ve + 1).map(x => x.w).join(' ')
  const soggetto = np(t.slice(0, vi).filter(x => !PREP.has(x.w)))
  const after = t.slice(ve + 1)
  const complementi: Complemento[] = []
  let oggetto = ''
  let i = 0
  while (i < after.length) {
    const x = after[i]
    const m = COMPL.find(([re]) => re.test(x.w))
    let j = i + 1
    while (j < after.length && !COMPL.some(([re]) => re.test(after[j].w)) && after[j].pos !== 'congiunzione' && after[j].pos !== 'verbo') j++
    const testo = np(after.slice(m ? i + 1 : i, j))
    if (testo) {
      if (m) complementi.push({ tipo: m[1], testo })
      else if (!oggetto) oggetto = testo
    }
    i = j
  }
  return { soggetto, predicato, oggetto, complementi, negata }
}

export interface Proposizione { testo: string; tipo: 'principale' | 'coordinata' | 'subordinata'; legame?: string }

export function periodo(sentence: string): Proposizione[] {
  const parts = sentence.split(/,|\s(?=(?:e|ma|però|quindi|oppure|perché|poiché|quando|mentre|se|benché|sebbene|affinché|finché|dove|che)\s)/i)
  const out: Proposizione[] = []
  for (const raw of parts) {
    const p = raw.trim()
    if (!p) continue
    const first = p.split(/\s+/)[0].toLowerCase()
    if (!out.length) out.push({ testo: p, tipo: 'principale' })
    else if (SUBORD.has(first)) out.push({ testo: p, tipo: 'subordinata', legame: first })
    else if (COORD.has(first)) out.push({ testo: p, tipo: 'coordinata', legame: first })
    else if (out.length) out[out.length - 1].testo += ', ' + p
  }
  return out
}
