/**
 * La foto vista dal motore: pixel ridotti (circa 160 px di lato) per sapere
 * cosa c'è davvero sotto un testo — colore e quanto è mossa. Stessa sorgente
 * del render (proxy per le immagini esterne), caricata una volta.
 */
import type { Pix } from '../gen/tools'

const cache = new Map<string, Promise<Pix | undefined>>()
const srcOf = (u: string) => (u.startsWith('http') ? `/api/proxy-image?url=${encodeURIComponent(u)}` : u)

export function loadPix(url: string | undefined, side = 160): Promise<Pix | undefined> {
  if (!url || typeof document === 'undefined') return Promise.resolve(undefined)
  if (!cache.has(url)) {
    cache.set(url, new Promise(resolve => {
      const im = new Image()
      im.crossOrigin = 'anonymous'
      im.onload = () => {
        try {
          const k = side / Math.max(im.naturalWidth, im.naturalHeight)
          const w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k))
          const cv = document.createElement('canvas'); cv.width = w; cv.height = h
          const c = cv.getContext('2d', { willReadFrequently: true })!
          c.drawImage(im, 0, 0, w, h)
          resolve({ w, h, data: c.getImageData(0, 0, w, h).data })
        } catch { resolve(undefined) }
      }
      im.onerror = () => resolve(undefined)
      im.src = srcOf(url)
    }))
  }
  return cache.get(url)!
}
