/**
 * Universo: i pattern infiniti della biblioteca degli universi (la camera di stateyour), non come oggetto ma come superficie.
 * Un indirizzo della biblioteca, visto in ornamento (la sezione ripetuta dagli specchi: carta da parati, fregio) o in
 * tracce, steso su tutta la pagina (o dove il quaderno decide), con la sua densità, il suo colore, la sua rotazione.
 * Vive nel tempo: la crescita è il tempo dell'evento (le tracce si allungano), così nella tavola animata il pattern nasce.
 */
import { newCanvas, fullLayer, type Sheet } from './sheet'
import type { Tool } from './tools'
import { crescitaCamera, cercaCamere, indirizzoCosmico, type Caleido } from './camera'
import { indirizziCosmici } from '../mind/sospese'

const CALEIDI: (Caleido | '')[] = ['', '', 'sei', 'quattro', 'specchio', 'giro', 'affiancata']
const cache = new Map<string, (f: number) => HTMLCanvasElement>()

export function stendiUniverso(W: number, H: number, p: { indirizzo: string; colore: string; caleido: string; fino: number; zoom: number; rot: number; alpha: number }) {
  const S = Math.round(Math.max(W, H) * p.zoom * 0.75)
  const k = `${p.indirizzo}|${p.caleido}|${S}|${p.colore}`
  let f = cache.get(k)
  if (!f) { f = crescitaCamera(p.indirizzo, { S, colore: p.colore, fondo: null, ...(p.caleido ? { caleido: p.caleido as Caleido } : {}) }); cache.set(k, f); if (cache.size > 12) cache.delete(cache.keys().next().value as string) }
  const tela = f(Math.max(0.02, Math.min(1, p.fino)))
  const out = newCanvas(W, H), g = out.getContext('2d')!
  g.globalAlpha = p.alpha
  g.translate(W / 2, H / 2); g.rotate(p.rot)
  // la tela si ripete fino a coprire la pagina anche ruotata (il pattern è infinito: la biblioteca non ha bordi)
  const R = Math.hypot(W, H) / 2, n = Math.ceil(R / S) + 1
  for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) g.drawImage(tela, i * S - S / 2, j * S - S / 2)
  return out
}

export const universoTool: Tool = {
  id: 'universo', label: 'Universo: un pattern infinito dalla biblioteca', nature: 'ripetizione',
  pushes: { ripetizione: 0.35, linee: 0.2, complessita: 0.2 },
  available: () => true,
  propose: (s, c) => {
    const r = c.r, cand = cercaCamere(String(Math.floor(r() * 1e9)), 4, 500)
    // un luogo vero trovato dall'osservatorio, quando c'è (la biblioteca madre), oppure uno della biblioteca leggera
    const cosmici = indirizziCosmici()
    const scelto = cosmici.length && r() < 0.45 ? indirizzoCosmico(cosmici[Math.floor(r() * cosmici.length)].n, ['una', 'esagoni', 'quadrati', 'specchio'][Math.floor(r() * 4)], Math.round(r() * 60))
      : cand.length ? cand[Math.floor(r() * Math.min(3, cand.length))].indirizzo : String(Math.floor(r() * 1e8))
    return { indirizzo: scelto, colore: r() < 0.6 ? c.tone.ink : c.tone.acc, caleido: CALEIDI[Math.floor(r() * CALEIDI.length)], fino: 0.5 + r() * 0.5, zoom: 0.25 + r() * 1.1, rot: r() < 0.6 ? 0 : (r() - 0.5) * 1.2, alpha: 0.35 + r() * 0.65 }
  },
  apply: async (s: Sheet, p, c) => {
    const q = p as { indirizzo: string; colore: string; caleido: string; fino: number; zoom: number; rot: number; alpha: number }
    const fino = c.tempo ? q.fino * c.tempo.crescita : q.fino
    const cv = stendiUniverso(Math.round(s.W), Math.round(s.H), { ...q, fino })
    // sotto le parole e sopra il fondo: è una superficie
    const TXT = /testo|tipografia|etichette|firma|piastra/
    const i = s.layers.findIndex(l => TXT.test(l.kind)), lay = { ...fullLayer(s, `u${Date.now().toString(36)}`, 'universo', cv, 'source-over'), genera: { tool: 'universo', p: q } }
    const layers = i < 0 ? [...s.layers, lay] : [...s.layers.slice(0, i), lay, ...s.layers.slice(i)]
    return { ...s, layers }
  },
}
