/**
 * Lingua: il realizzatore italiano (adattato da Porto Vecchio, unico_lingua.js).
 * Genere e numero dal lessico dei generi (Morph-it! via italian-words-dict,
 * CC BY-SA) o dalle desinenze; articoli determinativi, indeterminativi e
 * preposizioni articolate; plurali; un correttore a valle che tocca solo
 * quando è sicuro: «un classe» → «una classe», «il assorbono» → l'elisione,
 * la maiuscola dopo il punto.
 */

type G = 'm' | 'f'
interface Voce { g: G; n: 's' | 'p' | 'i'; sg: string; pl: string }

let LEX: Map<string, Voce> | null = null
let loading: Promise<boolean> | null = null

export function loadGeneri(url = '/lessico/generi.json'): Promise<boolean> {
  if (LEX) return Promise.resolve(true)
  if (loading) return loading
  loading = fetch(url).then(r => (r.ok ? r.json() : null)).then((d: Record<string, string> | null) => {
    if (!d) return false
    LEX = new Map()
    for (const [w, code] of Object.entries(d)) {
      const [g, pl0] = code.split('|') as [G, string | undefined]
      const pl = pl0 ?? plW(w, g)
      const n = pl === w ? 'i' : 's'
      if (!LEX.has(w)) LEX.set(w, { g, n, sg: w, pl })
      if (pl !== w && !LEX.has(pl)) LEX.set(pl, { g, n: 'p', sg: w, pl })
    }
    return true
  }).catch(() => false)
  return loading
}

function plW(w: string, g: G) {
  if (!w || /[àèéìòù]$/.test(w) || /[^aeiou]$/.test(w)) return w
  if (/[cg]a$/.test(w)) return w.slice(0, -1) + 'he'
  if (/[cg]ia$/.test(w)) return /[aeiou][cg]ia$/.test(w) ? w.slice(0, -1) + 'e' : w.slice(0, -2) + 'e'
  if (/[cg]o$/.test(w)) return w.slice(0, -1) + 'hi'
  if (/io$/.test(w)) return w.slice(0, -1)
  if (/a$/.test(w)) return g === 'm' ? w.slice(0, -1) + 'i' : w.slice(0, -1) + 'e'
  if (/[oe]$/.test(w)) return w.slice(0, -1) + 'i'
  return w
}

function indovina(h: string): { g: G; n: 's' | 'p' | 'i' } {
  if (/(tà|tù)$/.test(h)) return { g: 'f', n: 'i' }
  if (/[^aeiouàèéìòù]$/.test(h) || /[àèéìòù]$/.test(h)) return { g: 'm', n: 'i' }
  if (/(ione|udine|ice)$/.test(h)) return { g: 'f', n: 's' }
  if (/(one|ore|ale|ile|ente|ante)$/.test(h)) return { g: 'm', n: 's' }
  if (/(che|ghe)$/.test(h)) return { g: 'f', n: 'p' }
  if (/e$/.test(h)) { const v = LEX?.get(h.slice(0, -1) + 'a'); return v?.g === 'f' ? { g: 'f', n: 'p' } : { g: 'm', n: 's' } }
  if (/i$/.test(h)) { const v = LEX?.get(h.slice(0, -1) + 'o') ?? LEX?.get(h.slice(0, -1) + 'e'); return { g: v ? v.g : 'm', n: 'p' } }
  if (/a$/.test(h)) return { g: 'f', n: 's' }
  return { g: 'm', n: 's' }
}

const head = (s: string) => s.trim().toLowerCase().split(/[\s']/)[0] ?? ''
export function genere(s: string) {
  const h = head(s)
  const v = LEX?.get(h)
  const x = v ?? indovina(h)
  return { g: x.g, n: x.n, noto: !!v }
}

const VOC = (h: string) => /^[aeiouàèéìòùh]/i.test(h) && !/^i[aeiouàèéìòù]/i.test(h)
const SPEC = (h: string) => /^(s[^aeiouàèéìòù]|z|gn|ps|pn|x|y|i[aeiouàèéìòù])/i.test(h)
function det(g: G, pl: boolean, h: string) { if (pl) return g === 'f' ? 'le' : VOC(h) || SPEC(h) ? 'gli' : 'i'; return VOC(h) ? "l'" : g === 'f' ? 'la' : SPEC(h) ? 'lo' : 'il' }
const PREP: Record<string, Record<string, string>> = {
  di: { il: 'del', lo: 'dello', "l'": "dell'", la: 'della', i: 'dei', gli: 'degli', le: 'delle' },
  a: { il: 'al', lo: 'allo', "l'": "all'", la: 'alla', i: 'ai', gli: 'agli', le: 'alle' },
  da: { il: 'dal', lo: 'dallo', "l'": "dall'", la: 'dalla', i: 'dai', gli: 'dagli', le: 'dalle' },
  in: { il: 'nel', lo: 'nello', "l'": "nell'", la: 'nella', i: 'nei', gli: 'negli', le: 'nelle' },
  su: { il: 'sul', lo: 'sullo', "l'": "sull'", la: 'sulla', i: 'sui', gli: 'sugli', le: 'sulle' },
}
export type Tipo = 'det' | 'ind' | 'di' | 'a' | 'da' | 'in' | 'su'
function forma(tipo: Tipo, g: G, pl: boolean, h: string) {
  if (tipo === 'ind') { if (pl) return PREP.di[det(g, true, h)]; return g === 'f' ? (VOC(h) ? "un'" : 'una') : SPEC(h) ? 'uno' : 'un' }
  const d = det(g, pl, h)
  return tipo === 'det' ? d : PREP[tipo][d]
}
const unisci = (a: string, s: string) => (/'$/.test(a) ? a + s : a + ' ' + s)

/** l'articolo giusto davanti a una parola o a un gruppo nominale */
export function art(s: string, tipo: Tipo = 'det'): string {
  if (!s) return s
  const g = genere(s)
  return unisci(forma(tipo, g.g, g.n === 'p', head(s)), s)
}

/** un aggettivo accordato al nome: «ruvido» per «pelle» → «ruvida» */
export function accorda(agg: string, nome: string): string {
  const g = genere(nome), pl = g.n === 'p'
  if (/o$/.test(agg)) return agg.slice(0, -1) + (pl ? (g.g === 'f' ? 'e' : 'i') : g.g === 'f' ? 'a' : 'o')
  if (/e$/.test(agg) && pl) return agg.slice(0, -1) + 'i'
  return agg
}

/** modelli con articoli: {det:x} {ind:x} {di:x} {a:x} {da:x} {in:x} {su:x} */
export function realizza(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{(det|ind|di|a|da|in|su):(\w+)\}/g, (_m, t: Tipo, k: string) => art(vars[k] ?? '', t))
    .replace(/\{(\w+)\}/g, (_m, k: string) => vars[k] ?? '')
}

const SG_ART: Record<string, Tipo> = { il: 'det', lo: 'det', la: 'det', "l'": 'det', un: 'ind', uno: 'ind', una: 'ind', "un'": 'ind', del: 'di', dello: 'di', della: 'di', "dell'": 'di', al: 'a', allo: 'a', alla: 'a', "all'": 'a', dal: 'da', dallo: 'da', dalla: 'da', "dall'": 'da', nel: 'in', nello: 'in', nella: 'in', "nell'": 'in', sul: 'su', sullo: 'su', sulla: 'su', "sull'": 'su' }
const PL_ART: Record<string, Tipo> = { i: 'det', gli: 'det', le: 'det', dei: 'ind', degli: 'ind', delle: 'ind', ai: 'a', agli: 'a', alle: 'a', dai: 'da', dagli: 'da', dalle: 'da', nei: 'in', negli: 'in', nelle: 'in', sui: 'su', sugli: 'su', sulle: 'su' }

/** il correttore a valle: articoli davanti a nomi del lessico, elisioni, maiuscole. Tocca solo se è sicuro. */
export function concorda(text: string): string {
  if (!text) return text
  let out = text.replace(/\b(il|lo|la|un|uno|una|del|dello|della|al|allo|alla|dal|dallo|dalla|nel|nello|nella|sul|sullo|sulla|i|gli|le|dei|degli|delle|ai|agli|alle|dai|dagli|dalle|nei|negli|nelle|sui|sugli|sulle)\s+([a-zàèéìòù]+)/gi, (m, a: string, w: string) => {
    const low = a.toLowerCase()
    const v = LEX?.get(w.toLowerCase())
    if (!v) {
      // elisione anche per le parole ignote: «la arancia» → «l'arancia», «lo uomo» → «l'uomo»
      if (VOC(w) && /^(lo|la|il)$/.test(low)) return (a[0] === a[0].toUpperCase() ? "L'" : "l'") + w
      return m
    }
    const tipo = SG_ART[low] ?? PL_ART[low]
    if (!tipo) return m
    const pl = v.n === 'p'
    const f = forma(tipo, v.g, pl, w.toLowerCase())
    const nuovo = a[0] === a[0].toUpperCase() ? f.charAt(0).toUpperCase() + f.slice(1) : f
    return unisci(nuovo, w)
  })
  out = out.replace(/\b(un|Un)\s+(ora|altra|idea|isola|ombra|onda|ala|arte|anima)\b/g, (_m, a, w) => (a === 'Un' ? "Un'" : "un'") + w)
  out = out.replace(/([.!?]\s+)([a-zàèéìòù])/g, (_m, p, c) => p + c.toUpperCase())
  return out.replace(/\s+([,.;:!?])/g, '$1').replace(/\s{2,}/g, ' ').trim()
}
