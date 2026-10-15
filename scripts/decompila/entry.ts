/**
 * Pagina del banco del decompilatore: genera le grafiche di prova con il
 * motore vero (la verità è nota), le rende con Fabric come nello Studio e le
 * fa decompilare. La guida banco.mjs (Playwright).
 */
import * as fabric from 'fabric'
import { generateSystem, proposeKnobs, tintaFoto, type Knobs } from '@/components/studio/designer/gen'
import { renderScene } from '@/components/studio/designer/render'
import { loadFonts } from '@/components/studio/designer/fonts'
import type { DesignContent, FontSpec, Format, Scene } from '@/components/studio/designer/types'
import { decompila } from '@/components/studio/designer/decompila'
import { misuraRiga, provaRiga, rendiRiga } from '@/components/studio/designer/decompila/testo'
import { misuraTesto, rendi } from '@/components/studio/designer/decompila/verifica'
import type { Lettura } from '@/components/studio/designer/decompila/tipi'

declare global { interface Window { __leggi?: (png: string) => Promise<string> } }

async function draw(sc: Scene) {
  const el = document.createElement('canvas')
  const cv = new fabric.Canvas(el, { width: sc.w, height: sc.h, renderOnAddRemove: false, enableRetinaScaling: false })
  const ab = new fabric.Rect({ left: sc.w / 2, top: sc.h / 2, width: sc.w, height: sc.h, fill: '#fff', strokeWidth: 0 })
  ab.set('name', 'tavola'); (ab as fabric.Rect & { isArtboard?: boolean }).isArtboard = true
  cv.add(ab)
  const fonts = sc.els.flatMap(e => ('font' in e && e.font ? [e.font] : []))
  await loadFonts(fonts)
  await renderScene(cv, ab, sc, 'prova')
  cv.renderAll()
  const url = cv.toDataURL({ format: 'png', multiplier: 1 })
  cv.dispose()
  return url
}

export interface Caso { nome: string; content: DesignContent; format: Format; photo?: string; sistema?: Knobs['sistema']; seme?: number; over?: Partial<Knobs> }

/** Una grafica del motore: la scena (verità) e la sua immagine. */
async function genera(c: Caso): Promise<{ scena: Scene; png: string; sistema: string } | null> {
  ;(globalThis as { __designerSink?: string[] }).__designerSink = []
  const tinta = await tintaFoto(c.photo)
  const ks = proposeKnobs(c.content, { hasPhoto: !!c.photo, sistemi: c.sistema ? [c.sistema] : undefined, tinta, seme: c.seme ?? 0 })
  for (const k0 of ks) {
    const sc = await generateSystem(c.content, c.format, { ...k0, ...c.over }, c.photo)
    if (sc) return { scena: sc, png: await draw(sc), sistema: k0.sistema }
  }
  return null
}

/** Decompila un'immagine; la lettura del testo passa per Node (chiave solo lì, come la route nello Studio). */
async function prova(png: string) {
  const leggi = async (p: string) => JSON.parse(await window.__leggi!(p)) as Lettura
  const r = await decompila(png, { leggi })
  return { ...r, png: await draw(r.scena) }
}

/** Originale e ricostruita affiancate, per il rapporto. */
async function affianca(o: { a: string; b: string; titolo: string }) {
  const [a, b] = await Promise.all([o.a, o.b].map(async u => { const im = new Image(); im.src = u; await im.decode(); return im }))
  const k = 540 / Math.max(a.width, a.height), w = Math.round(a.width * k), h = Math.round(a.height * k), pad = 16
  const cv = document.createElement('canvas'); cv.width = w * 2 + pad * 3; cv.height = h + 56 + pad
  const c = cv.getContext('2d')!
  c.fillStyle = '#2b2b2b'; c.fillRect(0, 0, cv.width, cv.height)
  c.fillStyle = '#fff'; c.font = '600 20px sans-serif'; c.fillText(o.titolo, pad, 34)
  c.drawImage(a, pad, 48, w, h); c.drawImage(b, w + pad * 2, 48, w, h)
  return cv.toDataURL('image/jpeg', 0.85)
}

/**
 * Equivalenza di due caratteri: la riga resa con il carattere vero (al suo corpo e alla sua
 * spaziatura) e poi riprovata con quello trovato come fa il decompilatore, cioè corpo
 * dall'altezza e spaziatura dalla larghezza. 0 = indistinguibili, 1 = nulla in comune.
 */
function equivalenza(o: { testo: string; vero: FontSpec; trovato: FontSpec; size: number; tracking?: number }) {
  const v = rendiRiga(o.testo, o.vero, o.size, (o.tracking ?? 0) * o.size)
  if (!v) return 1
  const p = provaRiga({ testo: o.testo, box: { x: 0, y: 0, w: v.w, h: v.h }, alfa: v.a, fondo: [255, 255, 255], inchiostro: [0, 0, 0] }, o.trovato)
  return p ? p.errore : 1
}

async function caricaCaratteri(specs: FontSpec[]) { await loadFonts(specs) }

/** Riquadro dell'inchiostro di un testo reso da solo. */
async function misura(el: Extract<Scene['els'][number], { kind: 'text' }>) { return (await misuraTesto(el))?.box ?? null }

/**
 * Taratura: un testo noto reso dal motore senza grana, misurato e riprovato a tutti i pesi.
 * Se vince il peso vero la gara è onesta; se vince un peso più nero c'è uno scarto nella misura.
 */
async function taratura() {
  const prove: [string, number, number, string, string, string][] = [
    ['Manrope', 400, 28, 'Zucca, radicchio, funghi', '#1e2a14', '#ffffff'],
    ['Nunito', 400, 28, 'Note di cacao, spezie e frutti rossi.', '#ddd5d0', '#2b1a10'],
    ['DM Sans', 700, 18, 'MUSEO DEL MARE', '#ffffff', '#111111'],
    ['Manrope', 700, 18, 'OSTERIA FIUME', '#eeeeee', '#3c4f1c'],
  ]
  const out: string[] = []
  for (const [family, weight, size, testo, fondo, colore] of prove) {
    const t = { kind: 'text', name: 't', x: 40, y: 40, w: 700, h: size * 1.3, tw: 700, lines: [testo], font: { family, weight }, size, color: colore, align: 'left', lineHeight: 1.2, tracking: 0 } as Extract<Scene['els'][number], { kind: 'text' }>
    const sc = { w: 800, h: 120, bg: fondo, els: [{ kind: 'rect', name: 'f', x: 0, y: 0, w: 800, h: 120, fill: fondo }, t], layout: 'x', style: 'x', label: 'x' } as unknown as Scene
    await rendi(sc)
    const R = await rendi(sc)
    const b = (await misuraTesto(t))!.box
    const riga = misuraRiga(R, testo, [((b.y - 3) / R.h) * 1000, ((b.x - 3) / R.w) * 1000, ((b.y + b.h + 3) / R.h) * 1000, ((b.x + b.w + 3) / R.w) * 1000])
    if (!riga) { out.push(testo + ': riga non trovata'); continue }
    const pesi = [300, 400, 500, 600, 700, 800]
    await loadFonts(pesi.map(w => ({ family, weight: w })))
    const e = pesi.map(w => `${w}:${provaRiga(riga, { family, weight: w })?.errore.toFixed(3)}`)
    if (family !== 'Manrope') {
      const p = rendiRiga(testo, { family, weight }, riga.box.h / ((rendiRiga(testo, { family, weight }, 100, 0)!.h) / 100), 0, { fondo: riga.fondo, inchiostro: riga.inchiostro })!
      const img = (a: Float32Array, w: number, h: number) => { const c = document.createElement('canvas'); c.width = w * 3; c.height = h * 3; const x = c.getContext('2d')!; const d = x.createImageData(w, h); for (let i = 0; i < w * h; i++) { const v = 255 - Math.round(a[i] * 255); d.data.set([v, v, v, 255], i * 4) } const c2 = document.createElement('canvas'); c2.width = w; c2.height = h; c2.getContext('2d')!.putImageData(d, 0, 0); x.imageSmoothingEnabled = false; x.drawImage(c2, 0, 0, w * 3, h * 3); return c.toDataURL() }
      out.push('IMG ' + img(riga.alfa, riga.box.w, riga.box.h))
      out.push('IMG ' + img(p.a, p.w, p.h))
    }
    out.push(`${family} ${weight} ${size}px  vero h=${b.h} misurato h=${riga.box.h} w ${b.w}/${riga.box.w} raggio ${riga.raggio}  ${e.join(' ')}`)
  }
  return out
}

;(window as unknown as { banco: unknown }).banco = { genera, prova, draw, affianca, equivalenza, caricaCaratteri, misura, taratura }
