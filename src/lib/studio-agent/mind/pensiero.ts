/**
 * Il pensiero: mosse che legano letture DIVERSE.
 * Lavora sugli scheletri di quello che ha letto (chi, che gesto, su che cosa: parole sue, infiniti, categorie),
 * mai sulle frasi degli autori. Legge molto, tiene poco: di ogni lettura solo i pochi gesti che capisce.
 *  - ANALOGIA: lo stesso gesto su cose diverse, in due fonti → «A sta a X come B sta a Y»
 *  - PONTE: lo stesso concetto (con lo stesso senso) in due letture che non hanno lessico in comune
 *  - GENERE: due soggetti dello stesso genere che fanno la stessa cosa → una regola da verificare
 *  - TENSIONE: lo stesso soggetto legato a due contrari
 * Le premesse le dice con la sua grammatica; la conclusione con i suoi modelli (che impara e incrocia).
 */
import type { AgentState } from '../core/types'
import type { Rnd } from '../core/rng'
import { sentences } from '../reader/tokenize'
import { iperonimo, relationsOf, senso, posDi } from '../reader/concepts'
import { concludi } from '../voice/conclusioni'
import { dici } from './retorica'
import { fattiDi, fraseDi, imparaCategorie, type Deduzione, type Fatto } from '../voice/scrittura'

export interface Letta { f: Fatto; fonte: string; frase: string }

const VERBI_VUOTI = new Set(['essere', 'avere', 'fare', 'venire', 'dare', 'andare', 'potere', 'dovere', 'volere', 'stare', 'chiamare', 'definire', 'considerare', 'dire', 'trovare', 'riguardare', 'risultare', 'sembrare', 'diventare', 'rimanere', 'indicare', 'comprendere', 'includere', 'utilizzare', 'usare', 'contenere', 'presentare', 'ricevere', 'ottenere'])
export const GENERICI = new Set(['cosa', 'parte', 'tipo', 'modo', 'termine', 'nome', 'uno', 'una', 'seconda', 'primo', 'prima', 'volta', 'anno', 'numero', 'caso', 'forma', 'fatto', 'uso', 'insieme', 'stato', 'essere', 'periodo', 'serie', 'gruppo', 'livello', 'base', 'ambito', 'oggetto', 'elemento', 'aspetto', 'genere', 'sorta', 'categoria', 'sede', 'posto', 'luogo', 'mondo', 'tempo', 'giorno', 'secolo', 'anni', 'via', 'punto', 'lato', 'fine', 'inizio', 'metà', 'resto', 'maggior', 'presenza', 'possibilità', 'persona', 'entità', 'unità', 'organizzazione', 'atto', 'evento', 'attività', 'proprietà', 'relazione', 'astrazione', 'materia', 'sostanza'])
const MESI = /^(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre|lunedì|martedì|mercoledì|giovedì|venerdì|sabato|domenica|rispetto|seguito|riguardo)$/
const buono = (w?: string) => !!w && w.length >= 3 && !GENERICI.has(w) && !/^\d/.test(w) && !MESI.test(w) && !/^[ivxlcdm]+$/.test(w) && posDi(w).has('n')
const cosa = (f: Fatto) => f.o ?? f.compl[0]?.n
const parole = (t: string) => new Set(t.toLowerCase().split(/[^a-zàèéìòù]+/).filter(w => w.length > 3))
const stessoSenso = (w: string, f1: string, f2: string) => { const a = senso(w, parole(f1)), b = senso(w, parole(f2)); return !a || !b || a.i === b.i }

const CACHE = new Map<string, Letta[]>()
/** di ogni lettura recente tiene pochi gesti: quelli che capisce (verbo noto, cose che sa nominare) */
export function lette(st: AgentState, quante = 60, perLettura = 10): Letta[] {
  imparaCategorie(st)
  const rs = st.readings.filter(r => !/campione/i.test(r.title)).slice(-quante)
  const k = `${rs.length}|${rs[rs.length - 1]?.title ?? ''}`
  const hit = CACHE.get(k); if (hit) return hit
  const out: Letta[] = []
  for (const rd of rs) {
    const qui: Letta[] = []
    for (const s of sentences(rd.text).slice(0, 90)) { if (s.length > 320) continue; for (const f of fattiDi(s, rd.title)) if (buono(f.s) && buono(cosa(f))) qui.push({ f, fonte: rd.title, frase: s }) }
    out.push(...qui.slice(0, perLettura))
  }
  if (CACHE.size > 20) CACHE.clear()
  CACHE.set(k, out); return out
}

/** quanto è rara una parola tra le letture (è tra cose rare che un legame sorprende) */
function rarita(L: Letta[]) {
  const df = new Map<string, Set<string>>()
  for (const x of L) for (const w of [x.f.s, cosa(x.f)]) if (w) df.set(w, (df.get(w) ?? new Set()).add(x.fonte))
  const N = new Set(L.map(x => x.fonte)).size || 1
  return (w: string) => Math.log(1 + N / (df.get(w)?.size ?? 1))
}

export function pensa(st: AgentState, r: Rnd, concetti: string[]): Deduzione[] {
  const L = lette(st)
  if (L.length < 6) return []
  const raro = rarita(L)
  const vicino = new Set(concetti.map(c => c.toLowerCase()))
  const tocca = (...ws: string[]) => (ws.some(w => vicino.has(w)) ? 1.6 : 1)
  const out: (Deduzione & { voto: number })[] = []
  const metti = (tipo: Deduzione['tipo'], v: Record<string, string>, a: string, b: string, premesse: Fatto[], conf: number, voto: number) => {
    let c = concludi(st, r, tipo, { sa: 'sta', sb: 'sta', ea: 'è', eb: 'è', ...v })
    const ps = premesse.map(fraseDi)
    // la sua retorica: a volte dice la conclusione con una mossa sua (profezia, parabola, risalita verso il tutto)
    if (r() < 0.6) { const mia = dici(st, r, { a, b, premesse: ps, conclusione: c.testo, nuda: c.testo, conf, segno: 1, tipo }); if (mia && /[FP]/.test(mia.mossa)) c = { testo: mia.testo, modello: `mossa:${mia.mossa}` } } // solo se ne esce una profezia o una parabola: lì il guizzo è suo
    // un connettivo imparato che apre a vuoto («Bensì,», «Né,») si toglie
    const testo = c.testo.replace(/^(bensì|né|perciò|anzi)(,\s*quindi)?,?\s*/i, '')
    out.push({ tipo, a, b, premesse: ps, testo: testo.charAt(0).toUpperCase() + testo.slice(1), segno: 1, conf, passi: 2, modello: c.modello, voto })
  }
  // ANALOGIA
  const perVerbo = new Map<string, Letta[]>()
  for (const x of L) { const v = x.f.v.inf; if (VERBI_VUOTI.has(v) || x.f.neg) continue; perVerbo.set(v, [...(perVerbo.get(v) ?? []), x]) }
  for (const [v, xs] of perVerbo) {
    for (let i = 0; i < Math.min(xs.length, 12); i++) for (let j = i + 1; j < Math.min(xs.length, 12); j++) {
      const A = xs[i], B = xs[j]
      if (A.fonte === B.fonte) continue
      const sa = A.f.s, sb = B.f.s, xa = cosa(A.f)!, xb = cosa(B.f)!
      if (sa === sb || xa === xb || sa === xb || sb === xa) continue
      metti('analogia', { a: sa, x: xa, b: sb, y: xb, v }, sa, sb, [A.f, B.f], 0.4, (raro(sa) + raro(sb) + raro(xa) + raro(xb)) / 4 * tocca(sa, sb, xa, xb) * 1.15)
    }
  }
  // PONTE (niente «essere»: dire a che categoria appartiene una cosa non la collega a niente)
  const lessico = new Map<string, Set<string>>()
  for (const x of L) { const m = lessico.get(x.fonte) ?? new Set(); for (const w of [x.f.s, x.f.o, ...x.f.compl.map(k => k.n)]) if (w) m.add(w); lessico.set(x.fonte, m) }
  const vicine = (f1: string, f2: string) => { const a = lessico.get(f1) ?? new Set(), b = lessico.get(f2) ?? new Set(); return [...a].filter(w => b.has(w)).length / Math.max(1, Math.min(a.size, b.size)) }
  const perConcetto = new Map<string, { x: Letta; altro: string }[]>()
  for (const x of L) {
    if (x.f.v.inf === 'essere') continue
    const o = cosa(x.f)!
    for (const [qui, la] of [[x.f.s, o], [o, x.f.s]]) perConcetto.set(qui, [...(perConcetto.get(qui) ?? []), { x, altro: la }])
  }
  for (const [w, xs] of perConcetto) {
    const A = xs[0], B = xs.find(e => e.x.fonte !== A.x.fonte && e.altro !== A.altro && vicine(A.x.fonte, e.x.fonte) < 0.15 && stessoSenso(w, A.x.frase, e.x.frase))
    if (!B) continue
    const fonti = new Set(xs.map(e => e.x.fonte)).size
    metti('ponte', { a: w, x: A.altro, y: B.altro }, w, B.altro, [A.x.f, B.x.f], 0.45, (raro(A.altro) + raro(B.altro)) / 2 * tocca(w) * Math.min(1.4, 0.8 + fonti * 0.2))
  }
  // GENERE
  for (const [v, xs] of perVerbo) {
    for (let i = 0; i < Math.min(xs.length, 10); i++) for (let j = i + 1; j < Math.min(xs.length, 10); j++) {
      const A = xs[i], B = xs[j], sa = A.f.s, sb = B.f.s
      if (sa === sb) continue
      const ha = iperonimo(sa), hb = iperonimo(sb)
      if (!ha || ha !== hb || !buono(ha) || ha === sa || ha === sb) continue
      metti('genere', { a: sa, b: sb, x: ha, v }, sa, sb, [A.f, B.f], 0.35, (raro(sa) + raro(sb)) / 2 * tocca(sa, sb))
    }
  }
  // TENSIONE
  const perSogg = new Map<string, Letta[]>()
  for (const x of L) perSogg.set(x.f.s, [...(perSogg.get(x.f.s) ?? []), x])
  for (const [s, xs] of perSogg) for (let i = 0; i < Math.min(xs.length, 15); i++) {
    const xa = cosa(xs[i].f)!, contrari = new Set(relationsOf(xa).filter(t => t.rel === 'a').map(t => t.b))
    const B = xs.find(y => contrari.has(cosa(y.f)!))
    if (B) metti('tensione', { a: s, x: xa, y: cosa(B.f)! }, s, xa, [xs[i].f, B.f], 0.5, 2 * tocca(s, xa))
  }
  const visti = new Set<string>()
  return out
    .filter(d => d.a !== d.b)
    .sort((x, y) => y.voto - x.voto + (r() - 0.5) * 0.3)
    .filter(d => { const k = [d.a, d.b].sort().join('|'); if (visti.has(k)) return false; visti.add(k); return true })
    .slice(0, 12)
    .map(d => ({ ...d, conf: Math.min(0.8, d.conf * (0.7 + d.voto / 4)) }))
}
