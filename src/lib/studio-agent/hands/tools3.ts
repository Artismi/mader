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
import { disegnaCristallo, cercaCristalli } from './cristallo'
import { disegnaCamera, cercaCamere } from './camera'

let nid = 0
const lid = () => `m${Date.now().toString(36)}${(nid++).toString(36)}`

/** la riserva di indirizzi belli, rifatta una volta per giornata (pochi secondi), più quelli scoperti */
const RISERVA: Record<'cristallo' | 'camera', { giorno: string; indirizzi: string[] }> = { cristallo: { giorno: '', indirizzi: [] }, camera: { giorno: '', indirizzi: [] } }
export function riserva(tipo: 'cristallo' | 'camera', giorno: string): string[] {
  const R = RISERVA[tipo]
  if (R.giorno !== giorno || !R.indirizzi.length) {
    try {
      const trovati = tipo === 'cristallo' ? cercaCristalli(`g${giorno}`, 10, 2500) : cercaCamere(`g${giorno}`, 12, 2500)
      R.indirizzi = trovati.map(x => x.indirizzo)
    } catch { R.indirizzi = [] }
    R.giorno = giorno
  }
  return R.indirizzi
}

/** un indirizzo: quasi sempre dalla riserva della giornata, a volte nuovo (esplorare) */
export function indirizzoPer(tipo: 'cristallo' | 'camera', r: Rnd, giorno: string): string {
  const R = riserva(tipo, giorno)
  if (R.length && r() < 0.78) return pick(r, R)
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
