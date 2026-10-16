/**
 * Caratteri del motore, presi dal catalogo degli asset (asset/caratteri.json):
 * ognuno con personalità, ruoli, genere e misure lette dal file. Il registro
 * indica una direzione (giocoso, elegante, tecnico, caldo, sperimentale,
 * forte, morbido), il seme sceglie tra i candidati più vicini; ogni tanto si
 * pesca apposta fuori direzione, per sorprendere.
 *
 * Gli abbinamenti non sono coppie fisse: nascono da regole sulle misure
 * (stessa struttura con ruoli diversi, oppure contrasto netto di genere con
 * altezze della x compatibili). Il regolatore `sperimentazione` (0–1) apre ai
 * display, agli stencil e ai caratteri d'autore: a 0 testi sobri e classici.
 */
import type { FontSpec } from '../types'
import type { Rng } from '../gen/knobs'
import { CATALOGO_CARATTERI, type Genere, type MisureCarattere } from '../asset/catalogo'

export type Tratto = 'giocoso' | 'elegante' | 'tecnico' | 'caldo' | 'sperimentale' | 'forte' | 'morbido'
export type Personalita = Partial<Record<Tratto, number>>

export interface Carattere {
  family: string
  pesi: number[]
  corsivo?: boolean
  ruoli: ('titolo' | 'testo' | 'etichetta')[]
  sans: boolean
  mono?: boolean
  /** regge il tutto maiuscolo */
  maiuscolo?: boolean
  p: Personalita
  /** quanto osa: 0 classico → 1 display d'autore (si apre con la sperimentazione) */
  osa: number
  genere?: Genere
  misure?: MisureCarattere
  fonte: string
}

/** Sperimentazione di partenza: sobria ma non chiusa. */
export const SPERIMENTAZIONE = 0.35

export const CARATTERI: Carattere[] = CATALOGO_CARATTERI
  .filter(a => a.carattere!.misure?.italiano !== false && (a.carattere!.pesi ?? a.carattere!.misure?.pesi)?.length)
  .map(a => {
    const c = a.carattere!
    return {
      family: a.nome, pesi: (c.pesi ?? c.misure!.pesi), corsivo: c.corsivo ?? c.misure?.corsivo, ruoli: c.ruoli,
      sans: c.sans ?? !c.misure?.grazie, mono: c.mono ?? c.misure?.mono, maiuscolo: c.maiuscolo, p: c.p, osa: c.osa,
      genere: a.tag.genere?.[0] as Genere | undefined, misure: c.misure, fonte: a.fonte,
    }
  })

const TRATTI: Tratto[] = ['giocoso', 'elegante', 'tecnico', 'caldo', 'sperimentale', 'forte', 'morbido']
const affinita = (a: Personalita, b: Personalita) => TRATTI.reduce((n, t) => n + (a[t] ?? 0) * (b[t] ?? 0), 0) / (Math.hypot(...TRATTI.map(t => a[t] ?? 0)) * Math.hypot(...TRATTI.map(t => b[t] ?? 0)) || 1)

/** Sceglie per affinità con un po' di caso; `peso` aggiunge le regole (abbinamento, sperimentazione). */
function scegli(r: Rng, list: Carattere[], dir: Personalita, temperatura = 0.12, fuori = 0.12, peso: (c: Carattere) => number = () => 1): Carattere {
  if (r.chance(fuori)) return r.pick(list)
  const scored = list.map(c => ({ c, w: Math.exp(affinita(c.p, dir) / temperatura) * peso(c) }))
  const tot = scored.reduce((a, s) => a + s.w, 0)
  let x = r.next() * tot
  for (const s of scored) { if ((x -= s.w) <= 0) return s.c }
  return scored[0].c
}

const pesoVicino = (c: Carattere, voluto: number) => c.pesi.reduce((best, p) => (Math.abs(p - voluto) < Math.abs(best - voluto) ? p : best), c.pesi[0])
const maxPeso = (c: Carattere) => c.pesi[c.pesi.length - 1]

/** Il carattere è aperto a questa sperimentazione? A 0 solo i classici, da ~0.7 tutto. */
const aperto = (c: Carattere, s: number) => c.osa <= s + 0.3
/** Con la sperimentazione alta pesano di più quelli che osano; con quella bassa i sobri. */
const spinta = (c: Carattere, s: number) => Math.max(0.05, 1 + 3 * s * c.osa - 1.5 * (1 - s) * c.osa)
/** Altezze della x compatibili (se non sono misurate, si fida). */
const xCompatibile = (a: Carattere, b: Carattere) => !a.misure || !b.misure || Math.abs(a.misure.altezzaX - b.misure.altezzaX) <= 0.08

/** Regole d'abbinamento del testo al titolo: stessa struttura, oppure contrasto netto di genere. */
export function compatibilita(d: Carattere, t: Carattere, regola: 'struttura' | 'contrasto'): number {
  if (t.family === d.family) return d.ruoli.includes('testo') ? (regola === 'struttura' ? 1.2 : 0.3) : 0
  if (regola === 'struttura') return t.sans === d.sans && (t.genere === d.genere || xCompatibile(d, t)) ? 1 : 0.12
  return t.sans !== d.sans ? (xCompatibile(d, t) ? 1 : 0.45) : 0.1
}

export interface Abbinamento { display: FontSpec; text: FontSpec; label: FontSpec; impact: FontSpec; impactSans: boolean; displayUpper: boolean; displaySerif: boolean; corsivo: boolean; nome: string; regola: 'struttura' | 'contrasto' }

/** Abbinamento di caratteri per una direzione di personalità e una dose di sperimentazione. */
export function abbina(r: Rng, dir: Personalita, opts: { maiuscolo?: number; sperimentazione?: number } = {}): Abbinamento {
  const s = Math.max(0, Math.min(1, opts.sperimentazione ?? SPERIMENTAZIONE))
  const titoli = CARATTERI.filter(c => c.ruoli.includes('titolo') && aperto(c, s))
  const d = scegli(r, titoli, dir, 0.12, 0.12, c => spinta(c, s))
  const forte = dir.forte ?? 0, elegante = dir.elegante ?? 0, giocoso = dir.giocoso ?? 0
  const display: FontSpec = { family: d.family, weight: pesoVicino(d, forte > 0.6 ? 800 : giocoso > 0.6 ? 700 : elegante > 0.6 ? 400 : 600) }
  // testo: stessa struttura (una su tre circa) o contrasto di genere con la x compatibile
  const testi = CARATTERI.filter(c => c.ruoli.includes('testo') && !(c.mono && (dir.tecnico ?? 0) < 0.5 && (dir.sperimentale ?? 0) < 0.5))
  const regola = r.chance(d.sans ? 0.3 : 0.15) ? 'struttura' : 'contrasto'
  const t = scegli(r, testi, { ...dir, sperimentale: (dir.sperimentale ?? 0) * 0.5 }, 0.2, 0.05, c => compatibilita(d, c, regola))
  const text: FontSpec = { family: t.family, weight: pesoVicino(t, elegante > 0.7 ? 300 : 400) }
  // etichette: il carattere del testo in neretto, oppure un mono (tecnico, sperimentale), oppure un condensato (forte)
  const etichette = CARATTERI.filter(c => c.ruoli.includes('etichetta'))
  const mono = etichette.filter(c => c.mono), stretti = etichette.filter(c => c.sans && !c.mono && maxPeso(c) >= 600 && (c.misure?.larghezza ?? 1) < 0.47)
  const lab = (dir.tecnico ?? 0) + (dir.sperimentale ?? 0) + s * 0.5 > 1 && mono.length && r.chance(0.6) ? scegli(r, mono, dir, 0.2)
    : forte > 0.8 && stretti.length && r.chance(0.4) ? scegli(r, stretti, dir, 0.2)
      : t.ruoli.includes('etichetta') ? t
        : scegli(r, etichette.filter(c => c.sans && !c.mono && xCompatibile(c, t)), dir, 0.2, 0.05)
  const label: FontSpec = { family: lab.family, weight: pesoVicino(lab, lab.mono ? 500 : 700) }
  // carattere da manifesto: il titolo al massimo peso se è un bastone pesante, altrimenti un bastone pesante affine
  const pesanti = titoli.filter(c => c.sans && !c.mono && c.genere !== 'script' && (maxPeso(c) >= 800 || (c.misure?.spessore ?? 0) >= 0.16 || ['Anton', 'Archivo Black', 'Bebas Neue', 'Bowlby One', 'Rammetto One'].includes(c.family)))
  const imp = d.sans && maxPeso(d) >= 800 ? d : scegli(r, pesanti, { ...dir, forte: 1 }, 0.15, 0.1, c => spinta(c, s))
  const impact: FontSpec = { family: imp.family, weight: maxPeso(imp) }
  const displayUpper = !!d.maiuscolo && r.chance(opts.maiuscolo ?? 0.25)
  return {
    display, text, label, impact, impactSans: imp.sans, displayUpper, displaySerif: !d.sans, corsivo: !!d.corsivo, regola,
    nome: `${d.family}${t.family !== d.family ? ' + ' + t.family : ''}`,
  }
}
