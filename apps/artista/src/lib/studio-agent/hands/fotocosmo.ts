/**
 * Il fotografo del cosmo: fotografa i pianeti veri del simulatore di stateyour con la stessa catena del suo viewer
 * (superficie, clima, erosione, mare: superficie.worker.js) e la stessa resa dei colori (immagineSuperficie: i colori
 * dei materiali, il mare, il ghiaccio, l'ombra dei rilievi). Le foto restano in un rullino per la giornata: lo strumento
 * ne prende un dettaglio (mare, coste, rocce, ghiacci) e lo mette come livello nella tavola, oppure il pianeta intero
 * come disco illuminato dalla sua stella. Niente è inventato: ogni immagine è un luogo di un universo possibile.
 */
import { fullLayer, newCanvas, withLayer, type Sheet } from './sheet'
import type { Tool } from './tools'

export type Foto = { n: number; nome: string; mappa: HTMLCanvasElement; disco: HTMLCanvasElement; mare: boolean; T: number }
const rullino: Foto[] = []
export const fotoDelGiorno = () => rullino

const BASE = '/stateyour/camera/'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const importa = (f: string): Promise<any> => import(/* webpackIgnore: true */ /* turbopackIgnore: true */ BASE + f)

/** fotografa il pianeta all'indirizzo n (se è solido): la mappa intera e il disco visto dallo spazio */
export async function fotografa(n: number, attesa = 90000): Promise<Foto | null> {
  try {
    const C = await importa('cosmo.js'), G = await importa('geologia.js')
    const a = C.indirizzoDi(n), v = { cosmo: a.cosmo, galassia: a.galassia, stella: a.stella, pianeta: a.pianeta }
    const P = C.sistema(v.cosmo, v.galassia, v.stella).pianeti[v.pianeta]
    if (!P || P.tipo === 'gassoso' || !P.interno) return null
    const w = new Worker(BASE + 'superficie.worker.js', { type: 'module' })
    const r = await new Promise<{ se?: { W: number; H: number }; cl?: unknown; mare?: { esiste?: boolean }; errore?: string } | null>(ok => {
      const t = setTimeout(() => ok(null), attesa)
      w.onmessage = e => { clearTimeout(t); ok(e.data) }; w.onerror = () => { clearTimeout(t); ok(null) }
      w.postMessage({ k: JSON.stringify(v), v })
    })
    w.terminate()
    if (!r?.se || r.errore) return null
    const px: Uint8ClampedArray = G.immagineSuperficie(r.se, P.clima.T, r.cl), { W, H } = r.se
    const mappa = newCanvas(W, H); mappa.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(px), W, H), 0, 0)
    // il disco: proiezione ortografica, la luce dalla direzione della stella (come discoPianeta del viewer)
    const N = 512, disco = newCanvas(N, N), g = disco.getContext('2d')!, im = g.createImageData(N, N), luce = Math.atan2(-(P.pos?.[1] ?? 0), -(P.pos?.[0] ?? 1)), lx = Math.cos(luce), ly = Math.sin(luce)
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = (x + 0.5) / N * 2 - 1, q = (y + 0.5) / N * 2 - 1, r2 = u * u + q * q; if (r2 > 1) continue
      const zz = Math.sqrt(1 - r2), lat = Math.asin(-q), lon = Math.atan2(u, zz)
      const i = Math.floor(((lon + Math.PI) / (2 * Math.PI)) * W) % W, j = Math.min(H - 1, Math.floor(((Math.PI / 2 - lat) / Math.PI) * H)), s = (j * W + i) * 4
      const ill = Math.max(0.08, 0.2 + 0.8 * (u * lx + q * ly + 0.3 * zz)), o = (y * N + x) * 4
      im.data[o] = px[s] * ill; im.data[o + 1] = px[s + 1] * ill; im.data[o + 2] = px[s + 2] * ill; im.data[o + 3] = 255
    }
    g.putImageData(im, 0, 0)
    const foto: Foto = { n, nome: C.descriviIndirizzo ? String(C.descriviIndirizzo(a)).slice(0, 80) : `mondo ${n}`, mappa, disco, mare: !!r.mare?.esiste, T: P.clima?.T ?? 0 }
    rullino.push(foto); if (rullino.length > 6) rullino.shift()
    return foto
  } catch { return null }
}

/** lo strumento: un dettaglio di un pianeta vero (il mare se c'è, le coste, i rilievi) o il pianeta intero */
export const fotoCosmo: Tool = {
  id: 'fotocosmo', label: 'Fotografia del cosmo', nature: 'materia',
  pushes: { superfici: 0.3, complessita: 0.15, rumore: 0.1 },
  available: () => rullino.length > 0,
  propose: (_s, c) => {
    const f = rullino[Math.floor(c.r() * rullino.length)], intero = c.r() < 0.3
    // il dettaglio: una finestra dove c'è più varietà (si prova qualche posto e si tiene quello col contrasto maggiore)
    const W = f.mappa.width, H = f.mappa.height, g = f.mappa.getContext('2d')!, lato = Math.round(Math.min(W, H) * (0.25 + c.r() * 0.35))
    let meglio = [0, 0], vmax = -1
    for (let k = 0; k < 12; k++) {
      const x = Math.floor(c.r() * (W - lato)), y = Math.floor(H * 0.15 + c.r() * (H * 0.7 - lato)), d = g.getImageData(x, Math.max(0, y), lato, lato).data
      let m = 0, m2 = 0, n = 0; for (let i = 0; i < d.length; i += 16) { const l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; m += l; m2 += l * l; n++ }
      const v = m2 / n - (m / n) ** 2; if (v > vmax) { vmax = v; meglio = [x, Math.max(0, y)] }
    }
    return { foto: f.n, intero, x: meglio[0], y: meglio[1], lato, alpha: 0.7 + c.r() * 0.3 }
  },
  apply: async (s: Sheet, p) => {
    const f = rullino.find(x => x.n === p.foto); if (!f) return s
    const cv = newCanvas(s.W, s.H), g = cv.getContext('2d')!
    if (p.intero) { const d = Math.min(s.W, s.H) * 0.62; g.drawImage(f.disco, (s.W - d) / 2, (s.H - d) / 2, d, d) }
    else { g.imageSmoothingQuality = 'high'; const L = p.lato as number; g.drawImage(f.mappa, p.x as number, p.y as number, L, L, 0, 0, s.W, s.H) }
    return withLayer(s, fullLayer(s, `cosmo${f.n}`, 'cosmo', cv, 'source-over', p.alpha as number))
  },
}
