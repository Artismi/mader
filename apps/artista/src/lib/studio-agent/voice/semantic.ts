/**
 * Frasi che dicono qualcosa (alla PoeTryMe): ogni frase rende una relazione
 * vera tra concetti — dalla rete del lessico o dalle affermazioni lette —
 * con modelli diversi per registro. Il caso sceglie quale relazione e quale
 * modello; il senso viene dalla relazione.
 */
import type { Belief, Register } from '../core/types'
import { pick, type Rnd } from '../core/rng'
import { field, relationsOf, type Rel, type Triple } from '../reader/concepts'

const T: Record<Register, Partial<Record<Rel | 'b', string[]>>> = {
  filosofico: {
    h: ['{a} è soltanto un modo di essere {b}', 'Ogni {a} è già {b}', 'Che cosa resta di {b} in {a}?'],
    p: ['Dentro {a} c\'è {b}', 'Senza {b} non c\'è {a}'], w: ['{a} esiste solo dentro {b}', '{a} è un frammento di {b}'],
    a: ['{a} e {b} si tengono', 'Non c\'è {a} senza {b}', '{a}, cioè il rovescio di {b}'], c: ['{a} porta sempre {b}', 'Da {a} viene {b}'],
    e: ['Dire {a} è già dire {b}'], t: ['{a} può farsi {b}'], s: ['{a} somiglia a {b} più di quanto sembri'], d: ['{a} abita in {b}'],
    b: ['Ho letto che {s} {p} {o}', 'Si dice che {s} {p} {o}'],
  },
  poetico: {
    h: ['{a}, che è {b}', '{a} come {b}', '{b}: {a}'], p: ['{a}, e dentro {b}', 'il {b} di {a}'], w: ['{a} nel suo {b}', '{a}, pezzo di {b}'],
    a: ['{a} e il suo {b}', 'tra {a} e {b}', '{b}, poi {a}'], c: ['{a}, poi {b}'], e: ['{a} che diventa {b}'], t: ['{a} {b}'], s: ['{a}, quasi {b}'], d: ['{a} di {b}'],
    b: ['{s} {p} {o}'],
  },
  scherzoso: {
    h: ['{a}: {b} che si dà delle arie', 'Istruzioni: prendere {b}, chiamarlo {a}'], p: ['{a} senza {b} (versione economica)'],
    w: ['{a} cerca lavoro come parte di {b}'], a: ['{a} e {b} non si parlano più', '{a} contro {b}: finale di stagione'], c: ['Attenzione: {a} può causare {b}'],
    e: ['{a}, ma con {b} incluso'], t: ['{a}, ma {b}'], s: ['{a} o {b}? Nessuno lo sa'], d: ['{a}, reparto {b}'],
    b: ['Pare che {s} {p} {o}. Pare.'],
  },
  documentario: {
    h: ['{a}: tipo di {b}', '{a} ({b})'], p: ['{a}, parti: {b}'], w: ['{a}, parte di {b}'], a: ['{a} / {b}'], c: ['{a} → {b}'], e: ['{a} ⇒ {b}'],
    t: ['{a}: {b}'], s: ['{a} ≈ {b}'], d: ['{a}, ambito: {b}'], b: ['{s} {p} {o} (fonte: {src})'],
  },
  slogan: {
    h: ['OGNI {A} È {B}', '{A} È {B}'], p: ['NIENTE {A} SENZA {B}'], w: ['{A} È DI {B}'], a: ['{A} CONTRO {B}', 'NO {B}, SÌ {A}'], c: ['{A} = {B}'],
    e: ['{A} VUOL DIRE {B}'], t: ['{A} {B}'], s: ['{A} COME {B}'], d: ['{A} PER {B}'], b: ['{S} {P} {O}'],
  },
  silenzio: { h: ['{a}'], p: ['{a}'], w: ['{a}'], a: ['{a} / {b}'], c: ['{a}'], e: ['{a}'], t: ['{a}'], s: ['{a}'], d: ['{a}'], b: ['{s}'] },
}

const up = (s: string) => s.toUpperCase()
function render(r: Rnd, reg: Register, t: Triple): string {
  const opts = T[reg][t.rel] ?? T.poetico[t.rel] ?? ['{a} {b}']
  return pick(r, opts).replace(/\{a\}/g, t.a).replace(/\{b\}/g, t.b).replace(/\{A\}/g, up(t.a)).replace(/\{B\}/g, up(t.b))
}
function renderBelief(r: Rnd, reg: Register, b: Belief): string {
  const opts = T[reg].b ?? T.poetico.b!
  const p = (b.neg ? 'non ' : '') + b.p
  return pick(r, opts).replace(/\{s\}/g, b.s).replace(/\{p\}/g, p).replace(/\{o\}/g, b.o).replace(/\{src\}/g, b.source)
    .replace(/\{S\}/g, up(b.s)).replace(/\{P\}/g, up(p)).replace(/\{O\}/g, up(b.o))
}

/** relazioni intorno alla parola: dirette, poi un passo più in là; preferisce quelle che toccano le parole del giorno */
export function triplesAround(word: string, near: string[] = []): Triple[] {
  const direct = relationsOf(word, 2)
  const far = field(word, 2, 30).filter(x => x.via.length === 2).flatMap(x => x.via.slice(-1))
  const all = [...direct, ...far]
  const bonus = (t: Triple) => (near.includes(t.a) || near.includes(t.b) ? 2 : 0) + (t.rel === 'a' || t.rel === 'c' ? 1 : 0)
  return all.sort((x, y) => bonus(y) - bonus(x))
}

export interface SemCtx { r: Rnd; register: Register; word: string; near: string[]; beliefs: Belief[] }

/** una frase sola: titolo o scritta */
export function semanticLine(c: SemCtx): string | null {
  const ts = triplesAround(c.word, c.near)
  const bs = c.beliefs.filter(b => b.source !== 'io' && (b.s === c.word || b.o === c.word))
  if (bs.length && c.r() < 0.3) return renderBelief(c.r, c.register, pick(c.r, bs))
  if (!ts.length) return null
  return render(c.r, c.register, pick(c.r, ts.slice(0, 8)))
}

/** più frasi legate: partono dalla parola e seguono le relazioni, senza ripetere concetti */
export function semanticLines(c: SemCtx, n: number): string[] {
  const out: string[] = []
  const used = new Set<string>([c.word])
  let cur = c.word
  for (let i = 0; i < n; i++) {
    const ts = triplesAround(cur, c.near).filter(t => !(used.has(t.a) && used.has(t.b)))
    if (!ts.length) break
    const t = pick(c.r, ts.slice(0, 6))
    out.push(render(c.r, c.register, t))
    used.add(t.a); used.add(t.b)
    cur = t.a === cur ? t.b : t.a
  }
  const bs = c.beliefs.filter(b => b.source !== 'io' && (used.has(b.s) || used.has(b.o)))
  if (bs.length) out.push(renderBelief(c.r, c.register, pick(c.r, bs)))
  return out
}
