/**
 * Pagina dell'archivio (G1): decompila le immagini dei musei con D1, verifica
 * la fedeltà e ne ricava la scheda; prende le tavole migliori del motore così
 * come sono (la scena è già nota). La guida decompila.mjs (Playwright).
 */
import * as fabric from 'fabric'
import { proponi } from '@/components/studio/designer/gen'
import { renderScene } from '@/components/studio/designer/render'
import { loadFonts } from '@/components/studio/designer/fonts'
import type { DesignContent, Format, Scene } from '@/components/studio/designer/types'
import { decompila } from '@/components/studio/designer/decompila'
import type { Lettura } from '@/components/studio/designer/decompila/tipi'
import { scheda } from '@/components/studio/designer/archivio/scheda'
import type { Licenza } from '@/components/studio/designer/archivio/tipi'

declare global { interface Window { __leggi?: (png: string) => Promise<string> } }

async function draw(sc: Scene, multiplier = 1) {
  const el = document.createElement('canvas')
  const cv = new fabric.Canvas(el, { width: sc.w, height: sc.h, renderOnAddRemove: false, enableRetinaScaling: false })
  const ab = new fabric.Rect({ left: sc.w / 2, top: sc.h / 2, width: sc.w, height: sc.h, fill: '#fff', strokeWidth: 0 })
  ab.set('name', 'tavola'); (ab as fabric.Rect & { isArtboard?: boolean }).isArtboard = true
  cv.add(ab)
  await loadFonts(sc.els.flatMap(e => ('font' in e && e.font ? [e.font] : [])))
  await renderScene(cv, ab, sc, 'prova')
  cv.renderAll()
  const url = cv.toDataURL({ format: 'jpeg', quality: 0.85, multiplier })
  cv.dispose()
  return url
}

/** L'immagine del museo come PNG col lato lungo a 800 px (D1 lavora sui pixel veri). */
async function png(url: string) {
  const im = new Image(); im.src = url; await im.decode()
  const k = Math.min(1, 800 / Math.max(im.naturalWidth, im.naturalHeight))
  const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k)
  c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height)
  return c.toDataURL('image/png')
}

interface Meta { id: string; titolo?: string; autore?: string; anno?: number; testo?: string; licenza: Licenza }

/** Decompila un pezzo del museo e ne fa la scheda (la verifica di fedeltà la decide Node). */
async function pezzo(o: { url: string; meta: Meta }) {
  const src = await png(o.url)
  const leggi = async (p: string) => JSON.parse(await window.__leggi!(p)) as Lettura
  const r = await decompila(src, { leggi, scontorno: false, giri: 2 })
  const testi = r.testi.map(t => ({ ruolo: t.ruolo, righe: t.righe.length, errore: t.errore }))
  const sc = scheda(r.scena, { ...o.meta, origine: 'museo', fedelta: r.fedelta })
  return { tempi: r.tempi, fedelta: r.fedelta, giri: r.giri, testi, avvisi: r.avvisi, scheda: sc, scena: r.scena, originale: src, ricostruita: await draw(r.scena) }
}

/** La scheda rifatta da una scena già decompilata (senza rifare D1). */
function rischeda(o: { scena: Scene; meta: Meta; fedelta: number }) { return scheda(o.scena, { ...o.meta, origine: 'museo', fedelta: o.fedelta }) }

/** Le tavole migliori del motore per un contenuto: voto più carattere, una per sistema. */
async function motore(o: { content: DesignContent; format: Format; photo?: string; nome: string; settore: string[]; quante: number }) {
  const p = await proponi(o.content, o.format, { photo: o.photo, n: 12, esempi: false })
  const migliori = p.scene.filter(s => s.esame?.promossa)
    .sort((a, b) => (b.esame!.voto + (b.esame!.carattere?.carattere ?? 50) * 0.3) - (a.esame!.voto + (a.esame!.carattere?.carattere ?? 50) * 0.3))
    .slice(0, o.quante)
  const out = []
  for (const [i, sc] of migliori.entries()) {
    const id = `motore-${o.nome}-${i + 1}`
    out.push({
      scheda: scheda(sc, { id, origine: 'motore', titolo: `${o.content.title} (${sc.label})`, testo: o.content.body, settore: o.settore, fedelta: 1, licenza: { fonte: 'Creative OS (motore designer)', licenza: 'propria', verifica: `vetrina a secco, voto ${sc.esame?.voto}` } }),
      immagine: await draw(sc, 0.4),
    })
  }
  return out
}

/** Originale e ricostruita affiancate. */
async function affianca(o: { a: string; b: string; titolo: string }) {
  const [a, b] = await Promise.all([o.a, o.b].map(async u => { const im = new Image(); im.src = u; await im.decode(); return im }))
  const k = 420 / Math.max(a.width, a.height), w = Math.round(a.width * k), h = Math.round(a.height * k), pad = 12
  const cv = document.createElement('canvas'); cv.width = w * 2 + pad * 3; cv.height = h + 44 + pad
  const c = cv.getContext('2d')!
  c.fillStyle = '#2b2b2b'; c.fillRect(0, 0, cv.width, cv.height)
  c.fillStyle = '#fff'; c.font = '600 15px sans-serif'; c.fillText(o.titolo, pad, 26)
  c.drawImage(a, pad, 36, w, h); c.drawImage(b, w + pad * 2, 36, w, h)
  return cv.toDataURL('image/jpeg', 0.8)
}

;(window as unknown as { archivio: unknown }).archivio = { pezzo, motore, affianca, rischeda }
