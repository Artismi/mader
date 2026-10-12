/**
 * Foto per le grafiche dell'IA: se la tavola non ha già un'immagine, si cerca
 * una foto vera libera da diritti (/api/photos/search). Se non si trova nulla
 * resta la descrizione per il generatore, che lo Studio usa come ripiego.
 */
import type { ComposeBoard } from '@/lib/design/compose-spec'

const orientOf = (b: ComposeBoard): 'square' | 'portrait' | 'landscape' => {
  const f = b.format ?? ''
  if (f === 'storia' || f === 'verticale') return 'portrait'
  if (f === 'orizzontale') return 'landscape'
  if (b.width && b.height) return b.width / b.height > 1.2 ? 'landscape' : b.width / b.height < 0.85 ? 'portrait' : 'square'
  return 'square'
}

export async function resolvePhoto(b: ComposeBoard) {
  const img = b.content?.image
  if (!img || img.url) return
  const q = img.query || img.prompt
  if (!q) return
  try {
    const r = await fetch(`/api/photos/search?q=${encodeURIComponent(q)}&orient=${orientOf(b)}`)
    const j = await r.json() as { url?: string | null; credit?: string; source?: string }
    if (j.url) b.content.image = { ...img, url: j.url, alt: img.alt ?? [j.credit, j.source].filter(Boolean).join(' · ') }
  } catch { /* resta il generatore */ }
}
