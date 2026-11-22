/**
 * Gli strumenti dei mondi fisici di Andrea: il Cristallo (palline che corrono in un reticolo) e la camera dei pattern
 * (le tracce di una camera a bolle, e gli ornamenti che il caleidoscopio ne fa). Ogni pattern ha un indirizzo: lo stesso
 * indirizzo dà sempre la stessa cosa, e indirizzi vicini cose simili. Le linee nascono nel tempo, quindi crescono davvero.
 *
 * L'artista non li sfoglia a caso: ogni giornata cerca tra migliaia di indirizzi quelli belli (con la misura dichiarata
 * dei due mondi) e ne tiene una riserva; a volte ne prova uno nuovo, per esplorare.
 */
import { pick, range, type Rnd } from '../core/rng'
import { tempoDi } from './tempo'
import { withLayer, type Sheet, type Layer, type Blend } from './sheet'
import type { Tool, ToolCtx } from './tools'
import * as C from './cristallo'
import * as K from './camera'
const { disegnaCristallo, cercaCristalli } = C
const { disegnaCamera, cercaCamere } = K

let nid = 0
const lid = () => `m${Date.now().toString(36)}${(nid++).toString(36)}`

/**
 * La collezione: per ogni mondo, i migliori indirizzi per nicchia (famiglia × carattere: denso o rado, simmetrico o libero…).
 * Ogni giornata cerca più a lungo e aggiunge chi batte il migliore della sua nicchia; le tavole riuscite alzano il voto
 * degli indirizzi che contenevano, quelle mancate lo abbassano. Così la raccolta migliora nel tempo e resta varia.
 */
export interface Pezzo { indirizzo: string; voto: number; nicchia: string; usi: number }
export type Collezione = Record<'cristallo' | 'camera', Record<string, Pezzo>>
let COLLEZIONE: Collezione = { cristallo: {}, camera: {} }
type ConCollezione = { collezione?: Collezione & { giorno?: number } }

const nicchiaDi = (tipo: 'cristallo' | 'camera', indirizzo: string, famiglia?: string) => {
  const M = (tipo === 'cristallo' ? C : K) as unknown as Record<string, (a: string) => unknown>
  const desc = (M[tipo === 'cristallo' ? 'descrittoreCristallo' : 'descrittoreCamera']?.(indirizzo) as number[] | undefined) ?? []
  const fam = famiglia ?? String(M[tipo === 'cristallo' ? 'famigliaCristallo' : 'famigliaCamera']?.(indirizzo) ?? '')
  // due assi del carattere, in tre fasce ciascuno
  return [fam, ...desc.slice(0, 2).map(x => Math.max(0, Math.min(2, Math.floor((x ?? 0) * 3))))].join('|')
}

/** una volta per giornata: la ricerca lunga, e la collezione che si aggiorna (nella memoria dell'artista) */
export function aggiornaCollezione(st: object, giorno: number, budgetMs = 9000) {
  const S = st as ConCollezione
  COLLEZIONE = S.collezione ? { cristallo: S.collezione.cristallo ?? {}, camera: S.collezione.camera ?? {} } : { cristallo: {}, camera: {} }
  if (S.collezione?.giorno === giorno) return
  for (const tipo of ['cristallo', 'camera'] as const) {
    let trovati: { indirizzo: string; voto: number; famiglia?: string }[] = []
    try { trovati = tipo === 'cristallo' ? cercaCristalli(`g${giorno}`, 16, budgetMs / 2) : cercaCamere(`g${giorno}`, 16, budgetMs / 2) } catch { /* niente */ }
    const Col = COLLEZIONE[tipo]
    for (const t of trovati) {
      const n = nicchiaDi(tipo, t.indirizzo, t.famiglia)
      if (!Col[n] || Col[n].voto < t.voto) Col[n] = { indirizzo: t.indirizzo, voto: t.voto, nicchia: n, usi: Col[n]?.usi ?? 0 }
    }
    // al massimo 80 nicchie: si tengono le migliori
    const tutte = Object.values(Col).sort((a, b) => b.voto - a.voto).slice(0, 80)
    COLLEZIONE[tipo] = Object.fromEntries(tutte.map(p => [p.nicchia, p]))
  }
  S.collezione = { ...COLLEZIONE, giorno }
}

/** come è andata una tavola: gli indirizzi che conteneva salgono o scendono */
export function imparaCollezione(st: object, sheet: { layers: { genera?: { tool: string; p: Record<string, unknown> } }[] }, voto: number) {
  const S = st as ConCollezione
  if (!S.collezione) return
  for (const l of sheet.layers) {
    const t = l.genera?.tool
    if (t !== 'cristallo' && t !== 'camera') continue
    const ind = String(l.genera!.p.indirizzo ?? '')
    const p = Object.values(S.collezione[t] ?? {}).find(x => x.indirizzo === ind)
    if (p) { p.voto = Math.max(0, Math.min(2, p.voto + 0.15 * (voto - 0.5))); p.usi++ }
    else if (voto > 0.6) { const n = nicchiaDi(t, ind); const c0 = (S.collezione[t] ??= {}); if (!c0[n] || c0[n].voto < voto) c0[n] = { indirizzo: ind, voto, nicchia: n, usi: 1 } }
  }
  COLLEZIONE = { cristallo: S.collezione.cristallo ?? {}, camera: S.collezione.camera ?? {} }
}

/** la riserva (se la collezione è ancora vuota): una ricerca breve, una volta per giornata */
const RISERVA: Record<'cristallo' | 'camera', { giorno: string; indirizzi: string[] }> = { cristallo: { giorno: '', indirizzi: [] }, camera: { giorno: '', indirizzi: [] } }
export function riserva(tipo: 'cristallo' | 'camera', giorno: string): string[] {
  const col = Object.values(COLLEZIONE[tipo])
  if (col.length >= 6) return col.map(p => p.indirizzo)
  const R = RISERVA[tipo]
  if (R.giorno !== giorno || !R.indirizzi.length) {
    try { R.indirizzi = (tipo === 'cristallo' ? cercaCristalli(`g${giorno}`, 10, 2500) : cercaCamere(`g${giorno}`, 12, 2500)).map(x => x.indirizzo) } catch { R.indirizzi = [] }
    R.giorno = giorno
  }
  return R.indirizzi
}

/** un indirizzo: dalla collezione, scegliendo tra nicchie diverse con un occhio al voto e a quelle poco usate; a volte nuovo */
export function indirizzoPer(tipo: 'cristallo' | 'camera', r: Rnd, giorno: string): string {
  const col = Object.values(COLLEZIONE[tipo])
  if (col.length >= 6 && r() < 0.82) {
    const pesi = col.map(p => Math.max(0.05, p.voto) / Math.sqrt(1 + p.usi))
    let x = r() * pesi.reduce((a, b) => a + b, 0)
    for (let i = 0; i < col.length; i++) { x -= pesi[i]; if (x <= 0) return col[i].indirizzo }
    return col[col.length - 1].indirizzo
  }
  const R = riserva(tipo, giorno)
  if (R.length && r() < 0.7) return pick(r, R)
  return String(Math.floor(r() * 1e8))
}

const colori = (c: ToolCtx) => [c.tone.ink, c.tone.ink, c.tone.acc].filter(Boolean) as string[]

function mondo(tipo: 'cristallo' | 'camera'): Tool {
  return {
    id: tipo,
    label: tipo === 'cristallo' ? 'Cristallo: una pallina che corre nel reticolo' : 'Camera: le tracce delle particelle',
    nature: 'segno',
    pushes: tipo === 'cristallo' ? { linee: 0.35, ripetizione: 0.3, complessita: 0.2 } : { linee: 0.4, complessita: 0.3, curve: 0.2 },
    available: () => true,
    propose: (_s, c) => {
      const pieno = c.r() < 0.45
      return {
        indirizzo: indirizzoPer(tipo, c.r, String((c as ToolCtx & { giorno?: number }).giorno ?? new Date().toISOString().slice(0, 10))),
        colore: pick(c.r, colori(c)),
        // a tutta tavola (una materia, una trama) o come figura (un segno con il suo posto)
        pieno,
        scala: pieno ? range(c.r, 1.25, 1.5) : range(c.r, 0.35, 0.85),
        x: pieno ? 0.5 : range(c.r, 0.3, 0.7), y: pieno ? 0.5 : range(c.r, 0.3, 0.7),
        rot: pieno ? 0 : (c.r() - 0.5) * 0.6,
        alpha: range(c.r, 0.7, 1),
        spessore: range(c.r, 1.4, 4),
        blend: pick(c.r, ['source-over', 'source-over', 'multiply', 'screen', 'overlay'] as Blend[]),
      }
    },
    apply: async (s: Sheet, p, c) => {
      const T = tempoDi(c)
      const S = 900
      const cv = tipo === 'cristallo'
        ? disegnaCristallo(p.indirizzo as string, { S, colore: p.colore as string, fondo: null, fino: T.crescita, spessore: p.spessore as number })
        : disegnaCamera(p.indirizzo as string, { S, colore: p.colore as string, fondo: null, fino: T.crescita })
      const l: Layer = { id: lid(), kind: tipo, canvas: cv, x: p.x as number, y: p.y as number, scale: p.scala as number, rot: p.rot as number, alpha: p.alpha as number, blend: p.blend as Blend }
      return withLayer(s, l)
    },
  }
}

export const cristallo = mondo('cristallo')
export const camera = mondo('camera')
export const MONDI: Tool[] = [cristallo, camera]
