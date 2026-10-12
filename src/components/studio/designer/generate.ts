/**
 * Proposte del motore designer: stesso progetto (stile scelto dal contenuto),
 * impaginazioni diverse. Le proposte che non superano il controllo (testi che
 * non stanno o si toccano) vengono scartate, non mostrate.
 */
import type { DesignContent, DesignKind, Format, Scene } from './types'
import { inferStyle, styleById, fontsOf, type Style } from './styles'
import { loadFonts } from './fonts'
import { makeCtx } from './kit'
import { LANCIO_LAYOUTS } from './layouts-lancio'
import { TEXT_LAYOUTS } from './layouts-testo'

export interface DesignOpts {
  format: Format
  kind?: DesignKind
  /** stile scelto a mano; altrimenti dal contenuto */
  styleId?: string
}

const LAYOUTS: Record<DesignKind, typeof LANCIO_LAYOUTS> = {
  lancio: LANCIO_LAYOUTS,
  evento: LANCIO_LAYOUTS,
  citazione: LANCIO_LAYOUTS,
  annuncio: LANCIO_LAYOUTS,
}

const orientOf = (f: Format) => (f === 'storia' || f === 'verticale' ? 'portrait' : f === 'orizzontale' ? 'landscape' : 'square')

/** Foto vera libera da diritti per il soggetto (stessa ricerca dello Studio). */
export async function findPhoto(query: string, format: Format): Promise<string | undefined> {
  if (!query.trim()) return undefined
  try {
    const r = await fetch(`/api/photos/search?q=${encodeURIComponent(query)}&orient=${orientOf(format)}`)
    const j = await r.json() as { url?: string | null }
    return j.url ?? undefined
  } catch {
    return undefined
  }
}

export const allText = (c: DesignContent) => [c.brand, c.kicker, c.title, c.body, c.imageQuery, ...(c.details ?? [])].filter(Boolean).join(' ')

export function styleFor(c: DesignContent, opts: DesignOpts): Style {
  return opts.styleId ? styleById(opts.styleId) : inferStyle(allText(c), opts.kind ?? 'lancio')
}

export async function generateDesigns(c: DesignContent, opts: DesignOpts, photo?: string): Promise<Scene[]> {
  const style = styleFor(c, opts)
  await loadFonts(fontsOf(style))
  const out: Scene[] = []
  // con la foto le impaginazioni del tipo; senza, quelle tipografiche
  const hasPhoto = !!(photo || c.imageUrl)
  const layouts = hasPhoto ? LAYOUTS[opts.kind ?? 'lancio'] : TEXT_LAYOUTS
  for (const layout of layouts) {
    const ctx = makeCtx(opts.format, style, c, photo)
    try {
      const sc = layout(ctx)
      if (sc) out.push(sc)
    } catch (e) {
      console.warn('[designer]', layout.name, e)
    }
  }
  return out
}
