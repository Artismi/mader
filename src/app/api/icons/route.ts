/**
 * Icone e illustrazioni vettoriali per lo Studio (set Iconify installati in locale).
 * GET /api/icons?q=coffee&set=ph&limit=40      → elenco { id, svg }
 * GET /api/icons?id=ph:coffee-duotone          → un solo SVG (image/svg+xml)
 * I file JSON dei set sono grandi: si leggono solo qui, lato server, e restano in memoria.
 *
 * Licenze: Phosphor, Tabler, Fluent Emoji → MIT; Game Icons → CC BY 3.0 (game-icons.net);
 * Streamline Emojis → CC BY 4.0 (streamlinehq.com). Le ultime due chiedono l'attribuzione.
 */
import { NextResponse } from 'next/server'
import { getIconData, iconToSVG, iconToHTML, replaceIDs } from '@iconify/utils'
import type { IconifyJSON } from '@iconify/types'
import fs from 'fs'
import path from 'path'

const SETS: Record<string, { label: string; color: boolean; license: string }> = {
  ph: { label: 'Phosphor', color: false, license: 'MIT' },
  tabler: { label: 'Tabler', color: false, license: 'MIT' },
  'game-icons': { label: 'Game Icons', color: false, license: 'CC BY 3.0 — game-icons.net' },
  'fluent-emoji-flat': { label: 'Fluent Emoji', color: true, license: 'MIT' },
  'streamline-emojis': { label: 'Streamline Emojis', color: true, license: 'CC BY 4.0 — streamlinehq.com' },
}

const cache = new Map<string, IconifyJSON>()
function load(set: string): IconifyJSON | null {
  if (!SETS[set]) return null
  if (!cache.has(set)) {
    const file = path.join(process.cwd(), 'node_modules', '@iconify-json', set, 'icons.json')
    cache.set(set, JSON.parse(fs.readFileSync(file, 'utf8')))
  }
  return cache.get(set)!
}

function svgOf(set: string, name: string): string | null {
  const data = load(set); if (!data) return null
  const icon = getIconData(data, name); if (!icon) return null
  const r = iconToSVG(icon, { height: 'auto' })
  return iconToHTML(replaceIDs(r.body), r.attributes)
}

/** nomi che contengono tutte le parole cercate; prima le corrispondenze esatte e i nomi brevi */
function search(set: string, q: string, limit: number) {
  const data = load(set); if (!data) return []
  const words = q.toLowerCase().split(/[\s,]+/).filter(Boolean)
  const names = [...Object.keys(data.icons), ...Object.keys(data.aliases ?? {})]
  const variant = /-(thin|light|bold|fill|duotone)$/
  return names
    .filter(n => words.every(w => n.includes(w)))
    // per Phosphor si tiene una voce per icona (le varianti si chiedono a parte)
    .filter(n => set !== 'ph' || !variant.test(n))
    .sort((a, b) => (Number(b === words.join('-')) - Number(a === words.join('-'))) || a.length - b.length)
    .slice(0, limit)
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (id) {
    const [set, name] = id.split(':')
    const svg = svgOf(set, name)
    if (!svg) return NextResponse.json({ error: 'icona non trovata' }, { status: 404 })
    return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=31536000, immutable' } })
  }
  const q = (url.searchParams.get('q') ?? '').trim()
  const limit = Math.min(200, Number(url.searchParams.get('limit') ?? 40))
  const sets = (url.searchParams.get('set') ?? Object.keys(SETS).join(',')).split(',').filter(s => SETS[s])
  const weight = url.searchParams.get('weight') // solo Phosphor: thin | light | bold | fill | duotone
  if (!q) return NextResponse.json({ sets: Object.entries(SETS).map(([id, s]) => ({ id, ...s, count: Object.keys(load(id)?.icons ?? {}).length })) })
  const out: { id: string; set: string; svg: string }[] = []
  for (const set of sets) {
    for (const n of search(set, q, limit)) {
      const name = set === 'ph' && weight ? `${n}-${weight}` : n
      const svg = svgOf(set, name) ?? svgOf(set, n)
      if (svg) out.push({ id: `${set}:${name}`, set, svg })
      if (out.length >= limit) break
    }
    if (out.length >= limit) break
  }
  return NextResponse.json({ results: out })
}
