/**
 * Il pensiero: mosse che legano letture DIVERSE, non parole vicine nella stessa frase.
 *  - ANALOGIA: due fonti, lo stesso gesto (lo stesso verbo) su cose diverse → «A sta a X come B sta a Y»
 *  - PONTE: lo stesso concetto in due fonti che non si parlano, con due ruoli diversi
 *  - GENERE: due soggetti diversi che fanno la stessa cosa e hanno lo stesso genere → una regola (da verificare)
 *  - TENSIONE: lo stesso soggetto con due cose opposte (contrari nel lessico)
 * Ogni mossa parte da proposizioni lette davvero (riconosciute dall'analizzatore, ridette con le parole della fonte)
 * e passa da un critico: niente concetti vuoti («cosa», «parte», «tipo»…), niente fonti finte, e più è raro
 * quello che lega, più vale (una rima tra cose rare è un pensiero; tra cose comuni è un luogo comune).
 */
import type { AgentState } from '../core/types'
import type { Rnd } from '../core/rng'
import { sentences } from '../reader/tokenize'
import { proposizioni, ridici, type Proposizione, type Gruppo } from '../reader/frasi'
import { iperonimo, relationsOf, senso, posDi, verbi } from '../reader/concepts'
import { concludi } from '../voice/conclusioni'
import type { Deduzione } from '../voice/scrittura'
import { singolare } from '../voice/lingua'

export interface Letta { p: Proposizione; fonte: string; frase: string }

const VERBI_VUOTI = new Set(['essere', 'avere', 'fare', 'venire', 'dare', 'andare', 'potere', 'dovere', 'volere', 'stare', 'chiamare', 'definire', 'considerare', 'dire', 'trovare', 'riguardare', 'risultare', 'sembrare', 'diventare', 'rimanere', 'indicare', 'comprendere', 'includere', 'utilizzare', 'usare', 'contenere', 'presentare', 'ricevere', 'ottenere'])
export const GENERICI = new Set(['cosa', 'parte', 'tipo', 'modo', 'termine', 'nome', 'uno', 'una', 'seconda', 'primo', 'prima', 'volta', 'anno', 'numero', 'caso', 'forma', 'fatto', 'uso', 'insieme', 'stato', 'essere', 'periodo', 'serie', 'gruppo', 'livello', 'base', 'ambito', 'oggetto', 'elemento', 'aspetto', 'genere', 'sorta', 'categoria', 'sede', 'posto', 'luogo', 'mondo', 'tempo', 'giorno', 'secolo', 'anni', 'via', 'punto', 'lato', 'fine', 'inizio', 'metà', 'resto', 'maggior', 'presenza', 'possibilità'])

const CACHE = new Map<string, Letta[]>()
/** tutte le proposizioni delle letture recenti (le fonti finte, i campioni, restano fuori) */
export function lette(st: AgentState, quante = 30): Letta[] {
  const rs = st.readings.filter(r => !/campione/i.test(r.title)).slice(-quante)
  const k = `${rs.length}|${rs[rs.length - 1]?.title ?? ''}`
  const hit = CACHE.get(k); if (hit) return hit
  const out: Letta[] = []
  for (const rd of rs) {
    const arg = rd.title.replace(/\s*\(.*\)\s*$/, '').replace(/^.*\/\s*/, '')
    for (const s of sentences(rd.text).slice(0, 90)) { if (s.length > 320) continue; for (const p of proposizioni(s, arg)) out.push({ p, fonte: rd.title, frase: s }) }
  }
  if (CACHE.size > 20) CACHE.clear()
  CACHE.set(k, out); return out
}

const testa = (g?: Gruppo) => (g ? (g.proprio ? g.testa.toLowerCase() : singolare(g.testa.toLowerCase())) : '')
const plurale = (g: Gruppo) => !g.proprio && (/^(i|gli|le|dei|degli|delle|due|tre|quattro|cinque|dieci|cento|mille|molti|molte|alcuni|alcune|tutti|tutte)\s/i.test(g.sup) || (singolare(testa(g)) !== testa(g)))
const accordi = (k: string, g: Gruppo) => ({ [`s${k}`]: plurale(g) ? 'stanno' : 'sta', [`e${k}`]: plurale(g) ? 'sono' : 'è' })
/** il gruppo detto corto (testa e aggettivi, senza la catena dei «di»), per stare dentro una conclusione */
const corto = (g: Gruppo) => {
  const x = g.sup.split(/\s(?:di|del|dello|della|dei|degli|delle)\s|\s(?:dell'|d')/)[0].replace(/^(un|uno|una)\s|^un'/i, '')
  return /^[A-ZÀ-Ý]/.test(g.testa) && g.proprio ? x.replace(/^(il|lo|la|i|gli|le|l')\s?/i, '') : x.charAt(0).toLowerCase() + x.slice(1)
}
const MESI = /^(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre|lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica|rispetto|seguito|base|riguardo)$/
const buono = (w: string) => w.length >= 3 && !GENERICI.has(w) && !/^\d/.test(w) && !MESI.test(w) && !/^[ivxlcdm]+$/.test(w)
/** un nome vero: nome nel lessico e non anche un verbo coniugato («lascia», «porta»), o un nome proprio */
const nomeVero = (g: Gruppo) => g.proprio || (posDi(testa(g)).has('n') && !verbi().has(testa(g)))
/** lo stesso concetto nelle due fonti ha lo stesso senso? (con il contesto delle due frasi) */
const parole = (t: string) => new Set(t.toLowerCase().split(/[^a-zàèéìòù]+/).filter(w => w.length > 3))
const stessoSenso = (w: string, f1: string, f2: string) => { const a = senso(w, parole(f1)), b = senso(w, parole(f2)); return !a || !b || a.i === b.i }
const cosa = (p: Proposizione) => p.ogg ?? p.compl[0]?.g

/** quanto è rara una parola tra le letture (le rarità valgono di più: è lì che un legame sorprende) */
function rarita(L: Letta[]) {
  const df = new Map<string, Set<string>>()
  for (const x of L) for (const w of [testa(x.p.sogg), testa(cosa(x.p))]) if (w) df.set(w, (df.get(w) ?? new Set()).add(x.fonte))
  const N = new Set(L.map(x => x.fonte)).size || 1
  return (w: string) => Math.log(1 + N / (df.get(w)?.size ?? 1))
}

export function pensa(st: AgentState, r: Rnd, concetti: string[]): Deduzione[] {
  const L = lette(st).filter(x => !(x.p.verbo.copula && !x.p.ogg))
  if (L.length < 6) return []
  const raro = rarita(L)
  const vicino = new Set(concetti.map(c => c.toLowerCase()))
  const tocca = (...ws: string[]) => ws.some(w => vicino.has(w)) ? 1.6 : 1
  const out: (Deduzione & { voto: number })[] = []
  const metti = (tipo: Deduzione['tipo'], v: Record<string, string>, a: string, b: string, premesse: string[], conf: number, voto: number) => {
    const c = concludi(st, r, tipo, v)
    out.push({ tipo, a, b, premesse, testo: c.testo, segno: 1, conf, passi: 2, modello: c.modello, voto })
  }
  // ANALOGIA: stesso verbo (che dica qualcosa), fonti diverse, soggetti e cose diverse
  const perVerbo = new Map<string, Letta[]>()
  for (const x of L) { const v = x.p.verbo.lemma; if (VERBI_VUOTI.has(v) || x.p.verbo.neg || x.p.verbo.passivo || x.p.verbo.copula || x.p.sogg.proprio || !nomeVero(x.p.sogg) || (cosa(x.p) && !nomeVero(cosa(x.p)!)) || x.p.implicito && !x.p.sogg.proprio) continue; if (!buono(testa(x.p.sogg)) || !cosa(x.p) || !buono(testa(cosa(x.p)))) continue; perVerbo.set(v, [...(perVerbo.get(v) ?? []), x]) }
  for (const [v, xs] of perVerbo) {
    if (xs.length < 2) continue
    for (let i = 0; i < Math.min(xs.length, 12); i++) for (let j = i + 1; j < Math.min(xs.length, 12); j++) {
      const A = xs[i], B = xs[j]
      if (A.fonte === B.fonte) continue
      const sa = testa(A.p.sogg), sb = testa(B.p.sogg), xa = testa(cosa(A.p)), xb = testa(cosa(B.p))
      if (sa === sb || xa === xb || sa === xb || sb === xa) continue
      const voto = (raro(sa) + raro(sb) + raro(xa) + raro(xb)) / 4 * tocca(sa, sb, xa, xb)
      metti('analogia', { a: corto(A.p.sogg), x: corto(cosa(A.p)!), b: corto(B.p.sogg), y: corto(cosa(B.p)!), v, ...accordi('a', A.p.sogg), ...accordi('b', B.p.sogg) }, sa, sb, [ridici(A.p), ridici(B.p)], 0.4, voto * 1.15)
    }
  }
  // PONTE: lo stesso concetto in due fonti, legato a due cose diverse
  const perConcetto = new Map<string, { x: Letta; altro: Gruppo }[]>()
  for (const x of L) {
    const s = x.p.sogg, o = cosa(x.p)
    if (!o || x.p.verbo.lemma === 'essere') continue // «X è un comune»: dire a che categoria appartiene non è un ponte
    for (const [qui, la] of [[s, o], [o, s]] as [Gruppo, Gruppo][]) { const w = testa(qui); if (!buono(w) || !buono(testa(la)) || qui.proprio || !nomeVero(qui) || !nomeVero(la)) continue; perConcetto.set(w, [...(perConcetto.get(w) ?? []), { x, altro: la }]) }
  }
  const lessico = new Map<string, Set<string>>()
  for (const x of L) { const m = lessico.get(x.fonte) ?? new Set(); for (const g of [x.p.sogg, x.p.ogg, ...x.p.compl.map(k => k.g)]) if (g && !g.proprio) m.add(testa(g)); lessico.set(x.fonte, m) }
  const vicine = (f1: string, f2: string) => { const a = lessico.get(f1) ?? new Set(), b = lessico.get(f2) ?? new Set(); const inter = [...a].filter(w => b.has(w)).length; return inter / Math.max(1, Math.min(a.size, b.size)) }
  for (const [w, xs] of perConcetto) {
    const fonti = [...new Set(xs.map(e => e.x.fonte))]
    if (fonti.length < 2) continue
    const A = xs.find(e => e.x.fonte === fonti[0])!, B = xs.find(e => e.x.fonte !== A.x.fonte && testa(e.altro) !== testa(A.altro) && vicine(A.x.fonte, e.x.fonte) < 0.15 && stessoSenso(w, A.x.frase, e.x.frase))
    if (!B) continue
    const voto = (raro(testa(A.altro)) + raro(testa(B.altro))) / 2 * tocca(w) * Math.min(1.4, 0.8 + fonti.length * 0.2)
    const nome = /^[a-z]/.test(w) ? w : (A.x.p.sogg.testa.toLowerCase() === w ? corto(A.x.p.sogg) : w)
    metti('ponte', { a: nome, x: corto(A.altro), y: corto(B.altro), ...accordi('a', A.x.p.sogg.testa.toLowerCase() === w ? A.x.p.sogg : cosa(A.x.p)!) }, w, testa(B.altro), [ridici(A.x.p), ridici(B.x.p)], 0.45, voto)
  }
  // GENERE: stesso verbo, soggetti diversi con lo stesso genere (iperonimo) che dica qualcosa
  for (const [v, xs] of perVerbo) {
    for (let i = 0; i < Math.min(xs.length, 10); i++) for (let j = i + 1; j < Math.min(xs.length, 10); j++) {
      const A = xs[i], B = xs[j], sa = testa(A.p.sogg), sb = testa(B.p.sogg)
      if (sa === sb || A.p.sogg.proprio || B.p.sogg.proprio) continue
      const ha = iperonimo(sa), hb = iperonimo(sb)
      if (!ha || ha !== hb || !buono(ha) || ha === sa || ha === sb) continue
      metti('genere', { a: corto(A.p.sogg), b: corto(B.p.sogg), x: ha, v }, sa, sb, [ridici(A.p), ridici(B.p)], 0.35, (raro(sa) + raro(sb)) / 2 * tocca(sa, sb))
    }
  }
  // TENSIONE: lo stesso soggetto con due cose contrarie
  const perSogg = new Map<string, Letta[]>()
  for (const x of L) { const s = testa(x.p.sogg); if (buono(s) && cosa(x.p)) perSogg.set(s, [...(perSogg.get(s) ?? []), x]) }
  for (const [s, xs] of perSogg) {
    for (let i = 0; i < Math.min(xs.length, 15); i++) {
      const xa = testa(cosa(xs[i].p)), contrari = new Set(relationsOf(xa).filter(t => t.rel === 'a').map(t => t.b))
      const B = xs.find(y => contrari.has(testa(cosa(y.p))))
      if (B) metti('tensione', { a: corto(xs[i].p.sogg), x: corto(cosa(xs[i].p)!), y: corto(cosa(B.p)!) }, s, xa, [ridici(xs[i].p), ridici(B.p)], 0.5, 2 * tocca(s, xa))
    }
  }
  // il critico: niente premesse troppo corte o troppo lunghe; e per ogni coppia di concetti una mossa sola
  const visti = new Set<string>()
  return out
    .filter(d => d.premesse.every(p => p.split(' ').length >= 4 && p.split(' ').length <= 26) && buono(d.a) && buono(d.b) && d.a !== d.b)
    .sort((x, y) => y.voto - x.voto + (r() - 0.5) * 0.3)
    .filter(d => { const k = [d.a, d.b].sort().join('|'); if (visti.has(k)) return false; visti.add(k); return true })
    .slice(0, 12)
    .map(d => ({ ...d, conf: Math.min(0.8, d.conf * (0.7 + d.voto / 4)) }))
}
